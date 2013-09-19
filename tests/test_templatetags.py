import cio
import pytest
from django.contrib.auth.models import User
from django.template import Context, TemplateSyntaxError
from django.template.loader import get_template_from_string
from cio.backends import cache
from cio.pipeline import pipeline
from djedi.templatetags.template import register
from .asserts import assert_db, assert_cache


def render(source, context=None):
    source = u'{% load djedi_tags %}' + source.strip()
    return get_template_from_string(source).render(Context(context or {})).strip()


@pytest.mark.django_db(transaction=True)
def test_node_tag():
    html = render(u"{% node 'page/title' edit=False %}")
    assert html == u''

    cio.set('i18n://sv-se@page/title.txt', u'Djedi')
    cio.set('i18n://sv-se@page/body.txt', u'Lightning fast!')

    with assert_cache(calls=1, misses=0):
        with assert_db(calls=0):
            html = render(u"<h1>{% node 'page/title' edit=False %}</h1><p>{% node 'page/body' edit=False %}</p>")
            assert html == u'<h1>Djedi</h1><p>Lightning fast!</p>'

    cache.clear()

    with assert_cache(calls=1, misses=2):
        with assert_db(calls=1):
            html = render(u"<h1>{% node 'page/title' edit=False %}</h1><p>{% node 'page/body' %}</p>")
            assert html == u'<h1>Djedi</h1><p><span data-i18n="sv-se@page/body">Lightning fast!</span></p>'

    html = render(u"{% node 'foo/bar' default='bogus' %}")
    assert html == u'<span data-i18n="sv-se@foo/bar">bogus</span>'
    html = render(u"{% node 'l10n://foo/bar' default='bogus' %}")
    assert html == u'<span data-i18n="tests@foo/bar">bogus</span>'


@pytest.mark.django_db(transaction=True)
def test_blocknode_tag():
    with pytest.raises(TemplateSyntaxError):
        render("{% blocknode 'page/body' arg %}{% endblocknode %}")

    html = render(u"""
        {% blocknode 'page/body.md' edit=False %}
            # Djedi
            Lightning *fast*!
        {% endblocknode %}
    """)
    assert html == u'<h1>Djedi</h1>\n<p>Lightning <em>fast</em>!</p>'

    cio.set('i18n://sv-se@page/body.txt', u'Lightning fast!')
    html = render(u"""
        {% blocknode "page/body" %}
            Lorem ipsum
        {% endblocknode %}
    """)
    assert html == u'<span data-i18n="sv-se@page/body">Lightning fast!</span>'

    cio.set('i18n://sv-se@page/body.txt', u'')
    html = render(u"{% blocknode 'page/body' edit=False %}Lorem ipsum{% endblocknode %}")
    assert html == u''


@pytest.mark.django_db(transaction=True)
def test_blocknode_with_context():
    cio.set('i18n://sv-se@page/title.txt', u'Hej {name}!')

    source = u"""
        {% blocknode 'page/title' edit=False name=user.get_full_name %}
            Hello {name}!
        {% endblocknode %}
    """

    context = {'user': User(first_name=u'Jonas', last_name=u'Lundberg')}
    html = render(source, context)
    assert html == u'Hej Jonas Lundberg!'

    with cio.env(i18n='en-us'):
        html = render(source, context)
        assert html == u'Hello Jonas Lundberg!'

    html = render(u"""
        {% blocknode 'page/title' edit=False %}
            Hello {name}!
        {% endblocknode %}
    """)
    assert html == u'Hej {name}!'


@pytest.mark.django_db(transaction=True)
def test_collected_nodes():
    source = u"""
        {% node 'page/title' edit=False %}
        {% node 'page/title' default='fallback' edit=False %}
        {% node 'page/body' edit=False %}
    """
    pipeline.history.clear()
    render(source)
    assert len(pipeline.history) == 2


@pytest.mark.django_db(transaction=True)
def test_invalid_lazy_tag():
    with pytest.raises(TemplateSyntaxError):
        register.lazy_tag('')


@pytest.mark.django_db(transaction=True)
def test_lazy_tag():
    @register.lazy_tag
    def foo():
        return lambda _: u'bar'
    html = render("{% foo %}")
    assert html == u'bar'

    @register.lazy_tag()
    def bar():
        return lambda _: u'foo'
    html = render("{% bar %}")
    assert html == u'foo'
