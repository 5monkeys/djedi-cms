#!/usr/bin/env python
import os
import sys
import six

if six.PY2:
    import unittest2 as unittest
else:
    import unittest


def main():
    # Configure python path
    parent = os.path.dirname(os.path.abspath(__file__))
    if not parent in sys.path:
        sys.path.insert(0, parent)

    # Discover tests
    os.environ['DJANGO_SETTINGS_MODULE'] = 'djedi.tests.settings'
    unittest.defaultTestLoader.discover('djedi')

    # Run tests
    import django

    if django.VERSION < (1, 7):
        from django.test.simple import DjangoTestSuiteRunner as TestRunner
    else:
        from django.test.runner import DiscoverRunner as TestRunner
        django.setup()

    runner = TestRunner(verbosity=1, interactive=True, failfast=False)

    exit_code = runner.run_tests(['djedi'])

    sys.exit(exit_code)


if __name__ == '__main__':
    main()
