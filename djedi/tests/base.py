import shutil
from contextlib import contextmanager
from django.conf import settings
from django.contrib.auth.models import User, Group
from django.test import Client
from django.test import TransactionTestCase


class DjediTest(TransactionTestCase):

    def setUp(self):
        from cio.environment import env
        from cio.backends import cache
        from cio.pipeline import pipeline
        from cio.plugins import plugins

        env.reset()
        cache.clear()
        pipeline.clear()
        plugins.load()

    def tearDown(self):
        shutil.rmtree(settings.MEDIA_ROOT, ignore_errors=True)


class AssertionMixin(object):

    def assertKeys(self, dict, *keys):
        self.assertEqual(set(dict.keys()), set(keys))

    @contextmanager
    def assertCache(self, calls=-1, hits=-1, misses=-1):
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

    @contextmanager
    def assertDB(self, calls=-1, selects=-1, inserts=-1, updates=-1):
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


class UserMixin(object):

    def create_djedi_master(self):
        user = User.objects.create_superuser('master', 'master@djedi.io', 'test')
        return user

    def create_djedi_apprentice(self):
        user = User.objects.create_user('apprentice', email='apprentice@djedi.io', password='test')
        group, _ = Group.objects.get_or_create(name='Djedi')
        user.is_staff = True
        user.groups.add(group)
        user.save()
        return user


class ClientTest(DjediTest, UserMixin, AssertionMixin):

    def setUp(self):
        super(ClientTest, self).setUp()
        master = self.create_djedi_master()
        client = Client(enforce_csrf_checks=True)
        client.login(username=master.username, password='test')
        self.client = client
