import django
import os
import logging

logging.basicConfig(level=logging.ERROR)

DEBUG = True
TEMPLATE_DEBUG = True

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'djedi.middleware.translation.DjediTranslationMiddleware',
)

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.admin',
    'djedi'
]

TEMPLATE_CONTEXT_PROCESSORS = []

ROOT = os.path.dirname(__file__)
MEDIA_ROOT = os.path.join(ROOT, 'media')
STATIC_ROOT = os.path.join(ROOT, 'static')
MEDIA_URL = '/media/'
STATIC_URL = '/static/'
ROOT_URLCONF = 'djedi.tests.urls'

LANGUAGE_CODE = 'sv-se'
SECRET_KEY = "iufoj=mibkpdz*%bob9-DJEDI-52x(%49rqgv8gg45k36kjcg76&-y5=!"

TEMPLATE_DIRS = (
    os.path.join(ROOT, 'templates'),
)

PASSWORD_HASHERS = (
    'django.contrib.auth.hashers.MD5PasswordHasher',
)

if django.VERSION[:2] >= (1, 3):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
    CACHES = {
        'default': {
            'BACKEND': 'djedi.tests.backends.DebugLocMemCache'
        }
    }
else:
    DATABASE_ENGINE = 'sqlite3'
    CACHE_BACKEND = 'djedi.tests.backends.DebugLocMemCache'

DJEDI_THEME = 'luke'
