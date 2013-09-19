from django.core.cache.backends.locmem import LocMemCache


class DebugLocMemCache(LocMemCache):

    def __init__(self, *args, **kwargs):
        self.calls = 0
        self.hits = 0
        self.misses = 0
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
