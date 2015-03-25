#!/usr/bin/env python
import os
import sys
import unittest2


def main():
    # Configure python path
    parent = os.path.dirname(os.path.abspath(__file__))
    if not parent in sys.path:
        sys.path.insert(0, parent)

    # Discover tests
    os.environ['DJANGO_SETTINGS_MODULE'] = 'djedi.tests.settings'
    unittest2.defaultTestLoader.discover('djedi')

    # Run tests
    import django
    if hasattr(django, 'setup'):
        django.setup()

    from django.test.simple import DjangoTestSuiteRunner
    runner = DjangoTestSuiteRunner(verbosity=1, interactive=True, failfast=False)
    exit_code = runner.run_tests(['djedi'])

    sys.exit(exit_code)


if __name__ == '__main__':
    main()
