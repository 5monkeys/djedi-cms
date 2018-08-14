from cio.conf import settings
from cio.plugins import plugins
from djedi.tests import DjediTest


class SettingsTest(DjediTest):

    def test_settings(self):
        self.assertEqual(settings.THEME, 'luke')

    def test_plugin_settings(self):
        plugin = plugins.get('img')
        self.assertIn('foo', plugin.settings.keys())

    def test_default_scheme(self):
        self.assertEqual(settings.URI_DEFAULT_SCHEME, 'i18n')
        with self.settings(DJEDI={'URI_DEFAULT_SCHEME': 'l10n'}):
            self.assertEqual(settings.URI_DEFAULT_SCHEME, 'l10n')
        self.assertEqual(settings.URI_DEFAULT_SCHEME, 'i18n')
