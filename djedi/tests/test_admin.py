from django.core.urlresolvers import reverse
from djedi.tests.base import ClientTest


class PanelTest(ClientTest):

    def test_admin_panel(self):
        url = reverse('index')
        response = self.client.get(url)
        self.assertIn(u'window.DJEDI_NODES', response.content)
