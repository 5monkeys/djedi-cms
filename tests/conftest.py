import django
import os
import pytest
from django.conf import settings as django_settings


@pytest.fixture(scope='function', autouse=True)
@pytest.mark.django_db(transaction=False)
def setup():
    from cio.environment import env
    from cio.backends import cache
    from cio.pipeline import pipeline
    from cio.plugins import plugins
    from djedi.backends.django.db.models import Node

    env.reset()
    cache.clear()
    pipeline.clear()
    plugins.load()
    Node.objects.all().delete()


@pytest.fixture(scope='function')
def db_storage():
    from cio.backends import get_storage
    from djedi.backends.django.db import Backend
    return get_storage(Backend)


@pytest.fixture(scope='module')
def djedi_master():
    from django.contrib.auth.models import User
    user = User.objects.create_superuser('master', 'master@djedi.io', 'test')
    return user


@pytest.fixture(scope='module')
def djedi_apprentice():
    from django.contrib.auth.models import User, Group
    user = User.objects.create_user('apprentice', email='apprentice@djedi.io', password='test')
    group, _ = Group.objects.get_or_create(name='Djedi')
    user.is_staff = True
    user.groups.add(group)
    user.save()
    return user


@pytest.fixture(scope='function')
def client():
    from django.test import Client
    user = djedi_master()
    client = Client(enforce_csrf_checks=True)
    client.login(username=user.username, password='test')
    return client


def pytest_configure():
    dir = os.path.dirname(__file__)
    conf = {
        'DEBUG': True,
        'TEMPLATE_DEBUG': True,
        'MIDDLEWARE_CLASSES': (
            'django.middleware.common.CommonMiddleware',
            'django.contrib.sessions.middleware.SessionMiddleware',
            'django.middleware.csrf.CsrfViewMiddleware',
            'django.contrib.auth.middleware.AuthenticationMiddleware',
        ),
        'TEMPLATE_CONTEXT_PROCESSORS': [],
        'INSTALLED_APPS': [
            'django.contrib.auth',
            'django.contrib.contenttypes',
            'django.contrib.sessions',
            'django.contrib.admin',
            'djedi'
        ],
        'MEDIA_ROOT': os.path.join(dir, 'media'),
        'STATIC_ROOT': os.path.join(dir, 'static'),
        'MEDIA_URL': '/media/',
        'STATIC_URL': '/static/',
        'ROOT_URLCONF': 'tests.urls',
        'LANGUAGE_CODE': 'sv-se',
        'SECRET_KEY': "iufoj=mibkpdz*%bob952x(%49rqgv8gg45k36kjcg76&-y5=!",
        'TEMPLATE_DIRS': (
            os.path.join(dir, 'templates'),
        )
    }

    if django.VERSION[:2] >= (1, 3):
        conf.update(DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': ':memory:',
            }
        })

        conf.update(CACHES={
            'default': {
                'BACKEND': 'tests.cache_debug.DebugLocMemCache'
            }
        })
    else:
        conf.update(DATABASE_ENGINE='sqlite3')
        conf.update(CACHE_BACKEND='tests.cache_debug.DebugLocMemCache')

    django_settings.configure(**conf)

    import djedi
    djedi.configure()
