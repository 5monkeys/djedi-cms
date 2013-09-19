from contextlib import contextmanager


@contextmanager
def assert_db(calls=-1, selects=-1, inserts=-1, updates=-1):
    from django.db import connection

    pre_debug_cursor = connection.use_debug_cursor
    connection.use_debug_cursor = True
    pre_num_queries = len(connection.queries)

    yield

    queries = connection.queries[pre_num_queries:]
    num_queries = len(queries)
    connection.use_debug_cursor = pre_debug_cursor

    if calls >= 0:
        assert num_queries == calls
    if selects >= 0:
        num_selects = len([q for q in queries if q['sql'].startswith('SELECT')])
        assert num_selects == selects
    if inserts >= 0:
        num_inserts = len([q for q in queries if q['sql'].startswith('INSERT')])
        assert num_inserts == inserts
    if updates >= 0:
        num_updates = len([q for q in queries if q['sql'].startswith('UPDATE')])
        assert num_updates == updates


@contextmanager
def assert_cache(calls=-1, hits=-1, misses=-1):
    from cio.backends import cache

    _cache = cache.backend._cache

    _cache.calls = 0
    _cache.hits = 0
    _cache.misses = 0

    yield

    if calls >= 0:
        assert _cache.calls == calls
    if hits >= 0:
        assert _cache.hits == hits
    if misses >= 0:
        assert _cache.misses == misses
