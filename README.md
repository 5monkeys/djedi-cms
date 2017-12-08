<img alt="Django CMS" src="https://djedi-cms.org/_static/djedi-landscape.svg" width="500"/>

Django content management as it should be.

[![Build Status](https://travis-ci.org/5monkeys/djedi-cms.svg?branch=master)](https://travis-ci.org/5monkeys/djedi-cms)
[![Coverage Status](https://coveralls.io/repos/5monkeys/djedi-cms/badge.svg?branch=master&service=github)](https://coveralls.io/github/5monkeys/djedi-cms?branch=master)
[![Version](https://img.shields.io/pypi/v/djedi-cms.svg)](https://pypi.python.org/pypi/djedi-cms/)
[![Python Versions](https://img.shields.io/pypi/pyversions/djedi-cms.svg)](https://pypi.python.org/pypi/djedi-cms/)


## Documentation

Read the full [documentation][docs] or get a quick brief below.


## Install

```sh
$ pip install djedi-cms
```

## Configure

Example settings for Django 2.0:

```python
# settings.py

INSTALLED_APPS = (
    # ...
    'djedi',
)

MIDDLEWARE = [
    'djedi.middleware.translation.DjediTranslationMiddleware',
    # ...
]
```

### Bootstrap database

```sh
$ django-admin.py migrate djedi
```

### Enable admin

```python
# urls.py

urlpatterns = [
    path('admin/', admin.site.urls),
]
```

> For now, only the inline admin are in place, but we are working on the back office admin UI.


## Use

```django
{% load djedi_tags %}
<body>
    <h1>{% node 'page/title.txt' default='Djedi' %}</h1>

    {% blocknode 'page/body.md' %}
        ## I'm a djedi apprentice
        This is fun!
    {% endblocknode %}
</body>
```

[docs]: http://5monkeys.github.io/djedi-cms/
[content-io]: https://github.com/5monkeys/content-io/
