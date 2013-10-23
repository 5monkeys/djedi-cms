from cio.conf import settings
from djedi.tests import DjediTest


class SettingsTest(DjediTest):

    def test_settings(self):
        self.assertEqual(settings.THEME, 'luke')
