from unittest import skip
import cio.conf
from django.utils.encoding import smart_text
from djedi.tests.base import ClientTest
from ..compat import reverse


class PanelTest(ClientTest):
    def test_embed(self):
        url = reverse("index")
        response = self.client.get(url)
        self.assertIn(u"Djedi Test", smart_text(response.content))
        self.assertIn(u"window.DJEDI_NODES", smart_text(response.content))
        self.assertIn(u"i18n://sv-se@foo/bar.txt", smart_text(response.content))
        self.assertIn(u"</body>", smart_text(response.content).lower())

    def test_middleware(self):
        with self.settings(
            MIDDLEWARE_CLASSES=[
                "djedi.middleware.translation.DjediTranslationMiddleware",
            ],
            MIDDLEWARE=[
                "djedi.middleware.translation.DjediTranslationMiddleware",
            ],
        ):
            url = reverse("index")
            response = self.client.get(url)
            self.assertNotIn(u"window.DJEDI_NODES", smart_text(response.content))

    def test_cms(self):
        url = reverse("admin:djedi:cms")
        response = self.client.get(url)
        self.assertIn(u"<title>djedi cms</title>", smart_text(response.content))
        self.assertNotIn(u"document.domain", smart_text(response.content))
        self.assertNotIn(u"None", smart_text(response.content))

        with cio.conf.settings(XSS_DOMAIN="foobar.se"):
            response = self.client.get(url)
            self.assertIn(b'document.domain = "foobar.se"', response.content)

    @skip("Unfinished admin view is hidden")
    def test_django_admin(self):
        # Patch django admin index
        from django.contrib.admin.templatetags.log import AdminLogNode

        _render = AdminLogNode.render
        AdminLogNode.render = lambda x, y: None

        url = reverse("admin:index")
        response = self.client.get(url)
        cms_url = reverse("admin:djedi:cms")
        self.assertIn(u'<a href="%s">CMS</a>' % cms_url, smart_text(response.content))

        # Rollback patch
        AdminLogNode.render = _render
