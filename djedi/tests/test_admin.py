from unittest import skip

from django.urls import reverse
from django.utils.encoding import smart_str

import cio.conf
from djedi.tests.base import ClientTest


class PanelTest(ClientTest):
    def test_embed(self):
        url = reverse("index")
        response = self.client.get(url)
        self.assertIn("Djedi Test", smart_str(response.content))
        self.assertIn("window.DJEDI_NODES", smart_str(response.content))
        self.assertIn("i18n://sv-se@foo/bar.txt", smart_str(response.content))
        self.assertIn("</body>", smart_str(response.content).lower())

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
            self.assertNotIn("window.DJEDI_NODES", smart_str(response.content))

    def test_cms(self):
        url = reverse("admin:djedi:cms")
        response = self.client.get(url)
        self.assertIn("<title>djedi cms</title>", smart_str(response.content))
        self.assertNotIn("document.domain", smart_str(response.content))
        self.assertNotIn("None", smart_str(response.content))

        with cio.conf.settings(XSS_DOMAIN="foobar.se"):
            response = self.client.get(url)
            self.assertIn(b'document.domain = "foobar.se"', response.content)

    @skip("Unfinished admin view is hidden")
    def test_django_admin(self):  # pragma: no cover
        # Patch django admin index
        from django.contrib.admin.templatetags.log import AdminLogNode

        _render = AdminLogNode.render
        AdminLogNode.render = lambda x, y: None

        url = reverse("admin:index")
        response = self.client.get(url)
        cms_url = reverse("admin:djedi:cms")
        self.assertIn('<a href="%s">CMS</a>' % cms_url, smart_str(response.content))

        # Rollback patch
        AdminLogNode.render = _render
