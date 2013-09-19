#!/usr/bin/env python
import sys
from setuptools import setup, find_packages
from setuptools.command.test import test as TestCommand


class PyTest(TestCommand):

    def finalize_options(self):
        TestCommand.finalize_options(self)
        self.test_args = []
        self.test_suite = True

    def run_tests(self):
        import pytest
        errno = pytest.main(self.test_args)
        sys.exit(errno)


version = __import__('djedi').__version__

setup(
    name='djedi-cms',
    version=version,
    description='Django content management as i should be',
    long_description=(
        'Djedi CMS\n'
        '=========\n'
        'Read the documentation_ at github.\n\n'
        '.. _documentation: https://github.com/5monkeys/djedi-cms/\n'
    ),
    author='Jonas Lundberg',
    author_email='jonas@5monkeys.se',
    url='https://github.com/5monkeys/djedi-cms',
    download_url='https://github.com/5monkeys/djedi-cms/tarball/%s' % version,
    keywords=['cms', 'django', 'edit', 'gettext', 'content', 'management', 'template', 'plugins', 'markdown'],
    license='BSD',
    packages=find_packages(exclude='tests'),
    classifiers=[
        'Environment :: Web Environment',
        'Natural Language :: English',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.6',
        'Programming Language :: Python :: 2.7',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ],
    install_requires=[
        'Django >= 1.4',
        'content-io >= 1.0b3',
        'simplejson >= 3.2.0'
    ],
    tests_require=['pytest', 'pytest-django', 'markdown', 'Pillow'],
    test_suite='tests',
    cmdclass={'test': PyTest},
)
