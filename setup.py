#!/usr/bin/env python
from setuptools import setup, find_packages
from sys import version_info


install_requires = [
    'six',
    'content-io >= 1.2.5',
    'simplejson >= 3.2.0'
]

tests_require = [
    'coverage',
    'Markdown <= 2.4.1',
    'Pillow <= 3.4.2',
]

if version_info < (3,):
    tests_require += ['unittest2']

version = __import__('djedi').__version__

setup(
    name='djedi-cms',
    version=version,
    description='Django content management as it should be',
    long_description=(
        '.. image:: https://djedi-cms.org/_static/djedi-portrait.svg\n\n'
        '- Read the documentation_\n'
        '- Browse the source_\n\n'
        '.. image:: https://travis-ci.org/5monkeys/djedi-cms.svg?branch=master\n'
        '    :target: https://travis-ci.org/5monkeys/djedi-cms\n'
        '.. image:: https://coveralls.io/repos/5monkeys/djedi-cms/badge.svg?branch=master\n'
        '    :target: https://coveralls.io/r/5monkeys/djedi-cms?branch=master\n\n'
        '.. _documentation: https://djedi-cms.org/\n'
        '.. _source: https://github.com/5monkeys/djedi-cms\n\n'
    ),
    author='Jonas Lundberg',
    author_email='jonas@5monkeys.se',
    url='https://github.com/5monkeys/djedi-cms',
    download_url='https://github.com/5monkeys/djedi-cms/tarball/%s' % version,
    keywords=['cms', 'django', 'edit', 'gettext', 'content', 'management', 'template', 'plugins', 'markdown'],
    license='BSD',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    classifiers=[
        'Environment :: Web Environment',
        'Natural Language :: English',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ],
    install_requires=install_requires,
    extras_require={
        'tests': tests_require,
    },
    tests_require=tests_require,
    test_suite='runtests.main'
)
