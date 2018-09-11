import six
from django.core.cache import InvalidCacheBackendError
from djedi.utils.encoding import smart_str, smart_unicode
from cio.backends.base import CacheBackend
from django.core.cache.backends.locmem import LocMemCache

from djedi.compat import get_cache


class DjangoCacheBackend(CacheBackend):

    def __init__(self, **config):
        """
        Get cache backend. Look for djedi specific cache first, then fallback on default
        """
        super(DjangoCacheBackend, self).__init__(**config)

        try:
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


class DebugLocMemCache(LocMemCache):

    def __init__(self, *args, **kwargs):
        self.calls = 0
        self.hits = 0
        self.misses = 0
        self.sets = 0
        super(DebugLocMemCache, self).__init__(*args, **kwargs)

    def get(self, key, default=None, version=None, **kwargs):
        result = super(DebugLocMemCache, self).get(key, default=default, version=version)
        if kwargs.get('count', True):
            self.calls += 1
            if result is None:
                self.misses += 1
            else:
                self.hits += 1
        return result

    def get_many(self, keys, version=None):
        d = {}
        for k in keys:
            val = self.get(k, version=version, count=False)
            if val is not None:
                d[k] = val
        hits = len(d)
        self.calls += 1
        self.hits += hits
        self.misses += (len(keys) - hits)
        return d

    def set(self, *args, **kwargs):
        super(DebugLocMemCache, self).set(*args, **kwargs)
        self.calls += 1
        self.sets += 1

    def set_many(self, data, *args, **kwargs):
        result = super(DebugLocMemCache, self).set_many(data, *args, **kwargs)
        self.calls -= len(data)  # Remove calls from set()
        self.calls += 1
        return result
