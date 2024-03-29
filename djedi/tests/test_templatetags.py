from django.contrib.auth.models import User
from django.template import TemplateSyntaxError, engines

import cio
from cio.backends import cache
from cio.pipeline import pipeline
from djedi.templatetags.template import register
from djedi.tests.base import AssertionMixin, DjediTest


class TagTest(DjediTest, AssertionMixin):
    def render(self, source, context=None):
        source = "{% load djedi_tags %}" + source.strip()
        return engines["django"].from_string(source).render(context).strip()

    def test_node_tag(self):
        html = self.render("{% node 'page/title' edit=False %}")
        assert html == ""

        cio.set("i18n://sv-se@page/title.txt", "Djedi")
        cio.set("i18n://sv-se@page/body.txt", "Lightning fast!")

        with self.assertCache(calls=1, misses=0):
            with self.assertDB(calls=0):
                html = self.render(
                    "<h1>{% node 'page/title' edit=False %}</h1><p>{% node 'page/body' edit=False %}</p>"
                )
                assert html == "<h1>Djedi</h1><p>Lightning fast!</p>"

        cache.clear()

        with self.assertCache(calls=1, misses=2):
            with self.assertDB(calls=1):
                html = self.render(
                    "<h1>{% node 'page/title' edit=False %}</h1><p>{% node 'page/body' %}</p>"
                )
                assert (
                    html
                    == '<h1>Djedi</h1><p><span data-i18n="sv-se@page/body">Lightning fast!</span></p>'
                )

        html = self.render("{% node 'foo/bar' default='bogus' %}")
        assert html == '<span data-i18n="sv-se@foo/bar">bogus</span>'
        html = self.render("{% node 'l10n://foo/bar' default='bogus' %}")
        self.assertEqual(html, '<span data-i18n="djedi@foo/bar">bogus</span>')

    def test_node_tag_with_default_scheme(self):
        cio.set("i18n://sv-se@page/title.txt", "Swedish Djedi")
        html = self.render("{% node 'page/title' edit=False %}")
        assert html == "Swedish Djedi"

        with self.settings(DJEDI={"URI_DEFAULT_SCHEME": "l10n"}):
            html = self.render("{% node 'page/title' edit=False %}")
            assert html == ""

            cio.set("l10n://djedi@page/title.txt", "Local Djedi")
            html = self.render("{% node 'page/title' edit=False %}")
            assert html == "Local Djedi"

    def test_blocknode_tag(self):
        with self.assertRaises(TemplateSyntaxError):
            self.render("{% blocknode 'page/body' arg %}{% endblocknode %}")

        html = self.render(
            """
            {% blocknode 'page/body.md' edit=False %}
                # Djedi
                Lightning *fast*!
            {% endblocknode %}
        """
        )
        self.assertRenderedMarkdown(html, "# Djedi\nLightning *fast*!")

        cio.set("i18n://sv-se@page/body.txt", "Lightning fast!")
        html = self.render(
            """
            {% blocknode "page/body" %}
                Lorem ipsum
            {% endblocknode %}
        """
        )
        assert html == '<span data-i18n="sv-se@page/body">Lightning fast!</span>'

        cio.set("i18n://sv-se@page/body.txt", "")
        html = self.render(
            "{% blocknode 'page/body' edit=False %}Lorem ipsum{% endblocknode %}"
        )
        assert html == ""

    def test_blocknode_with_context(self):
        cio.set("i18n://sv-se@page/title.txt", "Hej {name}!")

        source = """
            {% blocknode 'page/title' edit=False name=user.get_full_name %}
                Hello {name}!
            {% endblocknode %}
        """

        context = {"user": User(first_name="Jonas", last_name="Lundberg")}
        html = self.render(source, context)
        assert html == "Hej Jonas Lundberg!"

        with cio.env(i18n="en-us"):
            html = self.render(source, context)
            assert html == "Hello Jonas Lundberg!"

        html = self.render(
            """
            {% blocknode 'page/title' edit=False %}
                Hello {name}!
            {% endblocknode %}
        """
        )
        assert html == "Hej {name}!"

    def test_collected_nodes(self):
        source = """
            {% node 'page/title' edit=False %}
            {% node 'page/title' default='fallback' edit=False %}
            {% node 'page/body' edit=False %}
        """
        pipeline.history.clear()
        self.render(source)
        assert len(pipeline.history) == 2

    def test_invalid_lazy_tag(self):
        with self.assertRaises(TemplateSyntaxError):
            register.lazy_tag("")

    def test_lazy_tag(self):
        @register.lazy_tag
        def foo():
            return lambda _: "bar"

        html = self.render("{% foo %}")
        assert html == "bar"

        @register.lazy_tag()
        def bar():
            return lambda _: "foo"

        html = self.render("{% bar %}")
        assert html == "foo"

    def test_djedi_admin_tag(self):
        source = """
            {% load djedi_admin %}
            {% djedi_admin %}
        """

        user = User(first_name="Jonas", last_name="Lundberg")

        class RequestMock:
            def __init__(self, user):
                self.user = user

        context = {"request": RequestMock(user=user)}
        html = self.render(source, context)
        assert html == ""

        user.is_superuser = True
        html = self.render(source, context)
        assert "<script>window.DJEDI_NODES = {};</script>" in html
