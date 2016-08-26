#!/usr/bin/env python

import os
import sys
import logging

from django.conf import settings
import django

ROOT = os.path.join(os.path.dirname(__file__), 'djedi/tests')

logging.basicConfig(level=logging.ERROR)

TEMPLATE_DEBUG = True
TEMPLATE_CONTEXT_PROCESSORS = []
TEMPLATE_DIRS = [
    os.path.join(ROOT, 'templates'),
]

DEFAULT_SETTINGS = dict(
    DEBUG=True,

    MIDDLEWARE_CLASSES=(
        'django.middleware.common.CommonMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'djedi.middleware.translation.DjediTranslationMiddleware',
    ),

    INSTALLED_APPS=[
        'django.contrib.staticfiles',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.admin',
        'djedi',
    ],

    TEMPLATE_DEBUG=TEMPLATE_DEBUG,
    TEMPLATE_CONTEXT_PROCESSORS=TEMPLATE_CONTEXT_PROCESSORS,
    TEMPLATE_DIRS=TEMPLATE_DIRS,

    TEMPLATES=[
        {

            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'APP_DIRS': True,
            'DIRS': TEMPLATE_DIRS,
            'OPTIONS': {
                'debug': TEMPLATE_DEBUG,
                'context_processors': TEMPLATE_CONTEXT_PROCESSORS
            }
        }
    ],

    MEDIA_ROOT=os.path.join(ROOT, 'media'),
    STATIC_ROOT=os.path.join(ROOT, 'static'),
    MEDIA_URL='/media/',
    STATIC_URL='/static/',
    ROOT_URLCONF='djedi.tests.urls',

    LANGUAGE_CODE='sv-se',
    SECRET_KEY="iufoj=mibkpdz*%bob9-DJEDI-52x(%49rqgv8gg45k36kjcg76&-y5=!",

    PASSWORD_HASHERS=(
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ),

    DATABASES={
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    },
    CACHES={
        'default': {
            'BACKEND': 'djedi.backends.django.cache.backend.DebugLocMemCache'
        }
    },

    DJEDI_THEME='luke',

    DJEDI={
        'IMG': {
            'foo': 'bar'
        }
    },
)


def main():
    if not settings.configured:
        settings.configure(**DEFAULT_SETTINGS)

    # Compatibility with Django 1.7's stricter initialization
    if hasattr(django, 'setup'):
        django.setup()

    parent = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, parent)

    try:
        from django.test.runner import DiscoverRunner
        runner_class = DiscoverRunner
        test_args = ['djedi.tests']
    except ImportError:
        from django.test.simple import DjangoTestSuiteRunner
        runner_class = DjangoTestSuiteRunner
        test_args = ['djedi']

    failures = runner_class(verbosity=1,
                            interactive=True,
                            failfast=True).run_tests(test_args)
    sys.exit(failures)


if __name__ == '__main__':
    main()
