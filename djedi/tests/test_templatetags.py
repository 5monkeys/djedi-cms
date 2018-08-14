import cio
from django.contrib.auth.models import User
from django.template import TemplateSyntaxError
from cio.backends import cache
from cio.pipeline import pipeline
from djedi.templatetags.template import register
from djedi.tests.base import DjediTest, AssertionMixin
from .compat import cmpt_context, get_template_from_string


class TagTest(DjediTest, AssertionMixin):

    def render(self, source, context=None):
        source = u'{% load djedi_tags %}' + source.strip()
        context = cmpt_context(context or {})
        return get_template_from_string(source).render(context).strip()

    def test_node_tag(self):
        html = self.render(u"{% node 'page/title' edit=False %}")
        assert html == u''

        cio.set('i18n://sv-se@page/title.txt', u'Djedi')
        cio.set('i18n://sv-se@page/body.txt', u'Lightning fast!')

        with self.assertCache(calls=1, misses=0):
            with self.assertDB(calls=0):
                html = self.render(u"<h1>{% node 'page/title' edit=False %}</h1><p>{% node 'page/body' edit=False %}</p>")
                assert html == u'<h1>Djedi</h1><p>Lightning fast!</p>'

        cache.clear()

        with self.assertCache(calls=1, misses=2):
            with self.assertDB(calls=1):
                html = self.render(u"<h1>{% node 'page/title' edit=False %}</h1><p>{% node 'page/body' %}</p>")
                assert html == u'<h1>Djedi</h1><p><span data-i18n="sv-se@page/body">Lightning fast!</span></p>'

        html = self.render(u"{% node 'foo/bar' default='bogus' %}")
        assert html == u'<span data-i18n="sv-se@foo/bar">bogus</span>'
        html = self.render(u"{% node 'l10n://foo/bar' default='bogus' %}")
        self.assertEqual(html, u'<span data-i18n="djedi@foo/bar">bogus</span>')

    def test_node_tag_with_default_scheme(self):
        cio.set('i18n://sv-se@page/title.txt', u'Swedish Djedi')
        html = self.render(u"{% node 'page/title' edit=False %}")
        assert html == u'Swedish Djedi'

        with self.settings(DJEDI={'URI_DEFAULT_SCHEME': 'l10n'}):
            html = self.render(u"{% node 'page/title' edit=False %}")
            assert html == u''

            cio.set('l10n://djedi@page/title.txt', u'Local Djedi')
            html = self.render(u"{% node 'page/title' edit=False %}")
            assert html == u'Local Djedi'

    def test_blocknode_tag(self):
        with self.assertRaises(TemplateSyntaxError):
            self.render("{% blocknode 'page/body' arg %}{% endblocknode %}")

        html = self.render(u"""
            {% blocknode 'page/body.md' edit=False %}
                # Djedi
                Lightning *fast*!
            {% endblocknode %}
        """)
        self.assertRenderedMarkdown(html, u'# Djedi\nLightning *fast*!')

        cio.set('i18n://sv-se@page/body.txt', u'Lightning fast!')
        html = self.render(u"""
            {% blocknode "page/body" %}
                Lorem ipsum
            {% endblocknode %}
        """)
        assert html == u'<span data-i18n="sv-se@page/body">Lightning fast!</span>'

        cio.set('i18n://sv-se@page/body.txt', u'')
        html = self.render(u"{% blocknode 'page/body' edit=False %}Lorem ipsum{% endblocknode %}")
        assert html == u''

    def test_blocknode_with_context(self):
        cio.set('i18n://sv-se@page/title.txt', u'Hej {name}!')

        source = u"""
            {% blocknode 'page/title' edit=False name=user.get_full_name %}
                Hello {name}!
            {% endblocknode %}
        """

        context = {'user': User(first_name=u'Jonas', last_name=u'Lundberg')}
        html = self.render(source, context)
        assert html == u'Hej Jonas Lundberg!'

        with cio.env(i18n='en-us'):
            html = self.render(source, context)
            assert html == u'Hello Jonas Lundberg!'

        html = self.render(u"""
            {% blocknode 'page/title' edit=False %}
                Hello {name}!
            {% endblocknode %}
        """)
        assert html == u'Hej {name}!'

    def test_collected_nodes(self):
        source = u"""
            {% node 'page/title' edit=False %}
            {% node 'page/title' default='fallback' edit=False %}
            {% node 'page/body' edit=False %}
        """
        pipeline.history.clear()
        self.render(source)
        assert len(pipeline.history) == 2

    def test_invalid_lazy_tag(self):
        with self.assertRaises(TemplateSyntaxError):
            register.lazy_tag('')

    def test_lazy_tag(self):
        @register.lazy_tag
        def foo():
            return lambda _: u'bar'
        html = self.render("{% foo %}")
        assert html == u'bar'

        @register.lazy_tag()
        def bar():
            return lambda _: u'foo'
        html = self.render("{% bar %}")
        assert html == u'foo'

    def test_djedi_admin_tag(self):
        source = u"""
            {% load djedi_admin %}
            {% djedi_admin %}
        """

        user = User(first_name=u'Jonas', last_name=u'Lundberg')

        class RequestMock(object):
            def __init__(self, user):
                self.user = user

        context = {'request': RequestMock(user=user)}
        html = self.render(source, context)
        assert html == u''

        user.is_superuser = True
        html = self.render(source, context)
        assert u'<script>window.DJEDI_NODES = {};</script>' in html
