from cio.backends import cache
from djedi.tests.base import DjediTest


class CacheTest(DjediTest):

    def test_set(self):
        uri = 'i18n://sv-se@page/title.txt#1'
        content = u'Title'

        self.assertIsNone(cache.get(uri))
        cache.set(uri, content)

        node = cache.get(uri)
        self.assertEqual(node['uri'], uri)
        self.assertEqual(node['content'], content)

        cache.delete(uri)
        self.assertIsNone(cache.get(uri))
