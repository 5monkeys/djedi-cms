#!/usr/bin/env python
from setuptools import setup, find_packages


install_requires = [
    'Django >= 1.4',
    'content-io >= 1.0b7',
    'simplejson >= 3.2.0'
]

tests_require = [
    'unittest2',
    'coverage',
    'Markdown',
    'Pillow'
]

version = __import__('djedi').__version__

setup(
    name='djedi-cms',
    version=version,
    description='Django content management as it should be',
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
        'Programming Language :: Python :: 2.6',
        'Programming Language :: Python :: 2.7',
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
