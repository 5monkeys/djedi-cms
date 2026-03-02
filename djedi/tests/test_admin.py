from types import SimpleNamespace
from unittest import skip
from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.contrib.admin.templatetags.log import AdminLogNode
from django.contrib.auth.models import AnonymousUser, User
from django.core.exceptions import ImproperlyConfigured, PermissionDenied
from django.http import HttpResponse
from django.test import RequestFactory
from django.urls import NoReverseMatch, reverse
from django.utils.encoding import smart_str

import cio.conf
from djedi.admin.api import APIView
from djedi.admin.cms import Admin, DjediCMS
from djedi.admin.mixins import DjediContextMixin
from djedi.middleware.mixins import AdminPanelMixin
from djedi.tests.base import ClientTest


class RecordingPanel(AdminPanelMixin):
    def __init__(self):
        self.appended = False

    def render_cms(self):
        return "<script>cms</script>"

    def body_append(self, response, html):
        self.appended = True
        super().body_append(response, html)


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

    def test_admin_permissions_and_cms_denied(self):
        request = RequestFactory().get("/")
        request.user = AnonymousUser()
        admin = Admin(User, AdminSite())

        assert admin.has_change_permission(request) is False
        assert admin.has_add_permission(request) is False
        assert admin.has_delete_permission(request) is False
        assert admin.has_module_permission(request) is False

        with self.assertRaises(PermissionDenied):
            DjediCMS.as_view()(request)

    def test_inject_admin_panel_skips_gzip_and_updates_content_length(self):
        request = RequestFactory().get("/")
        request.user = SimpleNamespace(is_superuser=True)

        gzip_response = HttpResponse(
            "<html><body>gzip</body></html>", content_type="text/html"
        )
        gzip_response["Content-Encoding"] = "gzip"
        panel = RecordingPanel()
        panel.inject_admin_panel(request, gzip_response)
        assert panel.appended is False

        html_response = HttpResponse(
            "<html><body>ok</body></html>", content_type="text/html"
        )
        html_response["Content-Length"] = len(html_response.content)
        panel.inject_admin_panel(request, html_response)
        assert panel.appended is True
        assert b"<script>cms</script>" in html_response.content
        assert int(html_response["Content-Length"]) == len(html_response.content)

    def test_inject_admin_panel_skips_djedi_url_when_admin_reverse_is_missing(self):
        request = RequestFactory().get("/adm1n/djedi/cms/preview")
        request.user = SimpleNamespace(is_superuser=True)
        response = HttpResponse(
            "<html><body>ok</body></html>", content_type="text/html"
        )
        panel = RecordingPanel()

        def reverse_side_effect(name):
            if name == "admin:index":
                raise NoReverseMatch
            if name == "admin:djedi:cms":
                return "/adm1n/djedi/cms/"
            raise NotImplementedError(f"Unexpected reverse call: {name}")

        with patch("djedi.middleware.mixins.reverse", side_effect=reverse_side_effect):
            panel.inject_admin_panel(request, response)

        assert panel.appended is False

    def test_inject_admin_panel_raises_when_djedi_reverse_is_missing(self):
        request = RequestFactory().get("/")
        request.user = SimpleNamespace(is_superuser=True)
        response = HttpResponse(
            "<html><body>ok</body></html>", content_type="text/html"
        )
        panel = RecordingPanel()

        def reverse_side_effect(name):
            if name == "admin:index":
                return "/adm1n/"
            if name == "admin:djedi:cms":
                raise NoReverseMatch
            raise NotImplementedError(f"Unexpected reverse call: {name}")

        with (
            patch("djedi.middleware.mixins.reverse", side_effect=reverse_side_effect),
            self.assertRaises(ImproperlyConfigured),
        ):
            panel.inject_admin_panel(request, response)

    def test_api_view_post_data_keeps_multi_values(self):
        request = SimpleNamespace(POST={"data[items]": ["a", "b"]}, FILES={})
        data, meta = APIView().get_post_data(request)
        assert data["items"] == ["a", "b"]
        assert meta == {}

    def test_context_theme_keeps_absolute_path(self):
        with cio.conf.settings(THEME="https://cdn.example.com/theme.css"):
            context = DjediContextMixin().get_context_data()
            assert context["THEME"] == "https://cdn.example.com/theme.css"

    @skip("Unfinished admin view is hidden")
    def test_django_admin(self):  # pragma: no cover
        _render = AdminLogNode.render
        AdminLogNode.render = lambda x, y: None

        url = reverse("admin:index")
        response = self.client.get(url)
        cms_url = reverse("admin:djedi:cms")
        self.assertIn(f'<a href="{cms_url}">CMS</a>', smart_str(response.content))

        # Rollback patch
        AdminLogNode.render = _render
