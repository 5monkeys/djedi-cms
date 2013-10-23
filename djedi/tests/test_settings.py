from cio.conf import settings
from cio.plugins import plugins
from djedi.tests import DjediTest


class SettingsTest(DjediTest):

    def test_settings(self):
        self.assertEqual(settings.THEME, 'luke')

    def test_plugin_settings(self):
        plugin = plugins.get('img')
        self.assertIn('foo', plugin.settings.keys())
