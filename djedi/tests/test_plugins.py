import json
from io import BytesIO
from unittest.mock import patch

from django import forms
from PIL import Image

from djedi.plugins.base import DjediPlugin
from djedi.plugins.form import FormsBasePlugin, get_custom_render_widget
from djedi.plugins.img import ImagePlugin, ImagePluginBase
from djedi.tests.base import DjediTest


class DummyWidget(forms.TextInput):
    def render(self, name, value="", attrs=None, renderer=None):
        return name


class DummyImagePlugin(ImagePluginBase):
    def __init__(self):
        self._saved = {}

    def _open(self, filename):
        return BytesIO(self._saved[filename])

    def _save(self, filename, bytes_):
        self._saved[filename] = bytes_.getvalue()
        return filename

    def _url(self, filename):
        return f"/media/{filename}"


class PluginsTest(DjediTest):
    def test_djedi_plugin_editor_context(self):
        plugin = DjediPlugin()
        assert plugin.get_editor_context(foo="bar") == {"foo": "bar"}

    def test_form_plugin_fallback_widget_name_and_default_forms(self):
        custom_widget = get_custom_render_widget(DummyWidget)()
        assert custom_widget.render("data__title") == "data[title]"

        plugin = FormsBasePlugin()
        assert plugin.forms == {}

    def test_image_plugin_load_empty_and_render_without_dimensions(self):
        plugin = DummyImagePlugin()
        assert plugin.load(None) == {"filename": None, "url": None}
        assert 'src="data:image/svg+xml;base64' in plugin.render(None)

        html = plugin.render({"url": "/media/a.png", "width": 0, "height": 0})
        assert 'src="/media/a.png"' in html
        assert 'width="160"' in html
        assert 'height="90"' in html

    def test_image_plugin_save_crop_exception_and_resize_success(self):
        plugin = DummyImagePlugin()

        source = Image.new("RGB", (100, 100), "red")
        raw = BytesIO()
        source.save(raw, format="PNG")
        raw.seek(0)
        upload = BytesIO(raw.getvalue())
        upload.name = "test.png"

        with patch("PIL.Image.ANTIALIAS", Image.Resampling.LANCZOS, create=True):
            payload = {
                "file": upload,
                "width": "32",
                "height": "32",
                "crop": "broken-crop",
                "id": "",
                "alt": "",
                "class": "",
            }
            saved = json.loads(plugin.save(payload))

        assert saved["width"] == 32
        assert saved["height"] == 32
        assert saved["filename"] is not None
        assert plugin._url(saved["filename"]).startswith("/media/")
        assert plugin._open(saved["filename"]).read()

    def test_image_plugin_uses_configured_file_storage(self):
        storage = object()
        with patch.object(ImagePlugin, "settings", {"FILE_STORAGE": storage}):
            assert ImagePlugin()._file_storage is storage
