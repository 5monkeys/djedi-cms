import importlib
from unittest.mock import patch

from cio.backends import storage
from cio.conf import settings
from cio.plugins import plugins
from djedi import get_version
import djedi.models
from djedi.tests import DjediTest


class SettingsTest(DjediTest):
    def test_settings(self):
        self.assertEqual(settings.THEME, "luke")

    def test_plugin_settings(self):
        plugin = plugins.get("img")
        self.assertIn("foo", plugin.settings.keys())

    def test_default_scheme(self):
        self.assertEqual(settings.URI_DEFAULT_SCHEME, "i18n")
        with self.settings(DJEDI={"URI_DEFAULT_SCHEME": "l10n"}):
            self.assertEqual(settings.URI_DEFAULT_SCHEME, "l10n")
        self.assertEqual(settings.URI_DEFAULT_SCHEME, "i18n")

    def test_get_version_with_explicit_version(self):
        assert get_version((1, 2, 0, "final", 0)) == "1.2"

    def test_models_import_without_db_backend(self):
        with patch.object(type(storage.backend), "scheme", "memory"):
            importlib.reload(djedi.models)
