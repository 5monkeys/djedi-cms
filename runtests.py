#!/usr/bin/env python

import os
import sys
import logging

from django.conf import settings
import django

ROOT = os.path.join(os.path.dirname(__file__), "djedi/tests")

logging.basicConfig(level=logging.ERROR)


DEFAULT_SETTINGS = dict(
    DEBUG=True,
    MIDDLEWARE_CLASSES=(
        "django.middleware.common.CommonMiddleware",
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.csrf.CsrfViewMiddleware",
        "django.contrib.messages.middleware.MessageMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
        "djedi.middleware.translation.DjediTranslationMiddleware",
    ),
    INSTALLED_APPS=[
        "django.contrib.staticfiles",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.admin",
        "djedi",
    ],
    MEDIA_ROOT=os.path.join(ROOT, "media"),
    STATIC_ROOT=os.path.join(ROOT, "static"),
    MEDIA_URL="/media/",
    STATIC_URL="/static/",
    ROOT_URLCONF="djedi.tests.urls",
    LANGUAGE_CODE="sv-se",
    SECRET_KEY="iufoj=mibkpdz*%bob9-DJEDI-52x(%49rqgv8gg45k36kjcg76&-y5=!",
    TEMPLATE_DEBUG=True,
    TEMPLATE_CONTEXT_PROCESSORS=[],
    TEMPLATE_DIRS=(os.path.join(ROOT, "templates"),),
    TEMPLATES=[
        {
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "APP_DIRS": True,
            "DIRS": (os.path.join(ROOT, "templates"),),
            "OPTIONS": {
                "debug": True,
                "context_processors": [
                    "django.contrib.auth.context_processors.auth",
                    "django.contrib.messages.context_processors.messages",
                ],
            },
        }
    ],
    PASSWORD_HASHERS=("django.contrib.auth.hashers.MD5PasswordHasher",),
    DATABASES={
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    },
    CACHES={
        "default": {"BACKEND": "djedi.backends.django.cache.backend.DebugLocMemCache"}
    },
    DJEDI_THEME="luke",
    DJEDI={"IMG": {"foo": "bar"}},
)
DEFAULT_SETTINGS["MIDDLEWARE"] = DEFAULT_SETTINGS["MIDDLEWARE_CLASSES"]


def main():
    if not settings.configured:
        settings.configure(**DEFAULT_SETTINGS)

    # Compatibility with Django 1.7's stricter initialization
    if hasattr(django, "setup"):
        django.setup()

    parent = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, parent)

    try:
        from django.test.runner import DiscoverRunner

        runner_class = DiscoverRunner
        test_args = ["djedi.tests"]
    except ImportError:
        from django.test.simple import DjangoTestSuiteRunner

        runner_class = DjangoTestSuiteRunner
        test_args = ["djedi"]

    failures = runner_class(verbosity=1, interactive=True, failfast=False).run_tests(
        test_args
    )
    sys.exit(failures)


if __name__ == "__main__":
    main()
