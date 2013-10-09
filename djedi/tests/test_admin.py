from django.core.urlresolvers import reverse
from django.utils.encoding import smart_unicode
from djedi.tests.base import ClientTest


class PanelTest(ClientTest):

    def test_embed(self):
        url = reverse('index')
        response = self.client.get(url)
        self.assertIn(u'Djedi Test', response.content)
        self.assertIn(u'window.DJEDI_NODES', response.content)

    def test_cms(self):
        url = reverse('admin:djedi:cms')
        response = self.client.get(url)
        self.assertIn(u'<title>djedi cms</title>', response.content)

    def test_django_admin(self):
        # Patch django admin index
        from django.contrib.admin.templatetags.log import AdminLogNode
        _render = AdminLogNode.render
        AdminLogNode.render = lambda x, y: None

        url = reverse('admin:index')
        response = self.client.get(url)
        cms_url = reverse('admin:djedi:cms')
        self.assertIn(u'<a href="%s">CMS</a>' % cms_url, smart_unicode(response.content))

        # Rollback patch
        AdminLogNode.render = _render
