#!/usr/bin/env python

from setuptools import find_packages, setup

install_requires = ["six", "content-io >= 1.2.5", "simplejson >= 3.2.0"]

tests_require = [
    "coverage",
    "Markdown <= 3.3.0",
    "Pillow",
]

version = __import__("djedi").__version__

setup(
    name="djedi-cms",
    version=version,
    description="Django content management as it should be",
    long_description=(
        ".. image:: https://djedi-cms.org/_static/djedi-portrait.svg\n\n"
        "- Read the documentation_\n"
        "- Browse the source_\n\n"
        ".. image:: https://github.com/5monkeys/djedi-cms/workflows/CI/badge.svg\n"
        "    :target: https://github.com/5monkeys/djedi-cms/actions\n\n"
        ".. image:: https://coveralls.io/repos/5monkeys/djedi-cms/badge.svg?branch=master\n"
        "    :target: https://coveralls.io/r/5monkeys/djedi-cms?branch=master\n\n"
        ".. _documentation: https://djedi-cms.org/\n"
        ".. _source: https://github.com/5monkeys/djedi-cms\n\n"
    ),
    author="Jonas Lundberg",
    author_email="jonas@5monkeys.se",
    url="https://github.com/5monkeys/djedi-cms",
    download_url="https://github.com/5monkeys/djedi-cms/tarball/%s" % version,
    keywords=[
        "cms",
        "django",
        "edit",
        "gettext",
        "content",
        "management",
        "template",
        "plugins",
        "markdown",
    ],
    license="BSD",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    classifiers=[
        "Environment :: Web Environment",
        "Natural Language :: English",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: BSD License",
        "Operating System :: OS Independent",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    install_requires=install_requires,
    extras_require={
        "tests": tests_require,
    },
    tests_require=tests_require,
    test_suite="runtests.main",
)
