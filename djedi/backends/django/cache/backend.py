import six
from django.core.cache import InvalidCacheBackendError
from djedi.utils.encoding import smart_str, smart_unicode
from cio.backends.base import CacheBackend


class DjangoCacheBackend(CacheBackend):

    def __init__(self, **config):
        """
        Get cache backend. Look for djedi specific cache first, then fallback on default
        """
        super(DjangoCacheBackend, self).__init__(**config)

        try:
            from django.core.cache import get_cache
            cache_name = self.config.get('NAME', 'djedi')
            cache = get_cache(cache_name)
        except (InvalidCacheBackendError, ValueError):
            from django.core.cache import cache

        self._cache = cache

    def clear(self):
        self._cache.clear()

    def _get(self, key):
        return self._cache.get(key)

    def _get_many(self, keys):
        return self._cache.get_many(keys)

    def _set(self, key, value):
        self._cache.set(key, value, timeout=None)  # TODO: Fix eternal timeout like viewlet

    def _set_many(self, data):
        self._cache.set_many(data, timeout=None)  # TODO: Fix eternal timeout like viewlet

    def _delete(self, key):
        self._cache.delete(key)

    def _delete_many(self, keys):
        self._cache.delete_many(keys)

    def _encode_content(self, uri, content):
        """
        Join node uri and content as string and convert to bytes to ensure no pickling in memcached.
        """
        if content is None:
            content = self.NONE
        return smart_str('|'.join([six.text_type(uri), content]))

    def _decode_content(self, content):
        """
        Split node string to uri and content and convert back to unicode.
        """
        content = smart_unicode(content)
        uri, _, content = content.partition(u'|')
        if content == self.NONE:
            content = None
        return uri or None, content
