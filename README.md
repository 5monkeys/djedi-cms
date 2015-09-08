![Djedi CMS](https://raw.github.com/5monkeys/djedi-cms/master/docs/_static/djedi-landscape.png)

Django content management as it should be.

[![Build Status](https://img.shields.io/travis/5monkeys/djedi-cms.svg)](https://travis-ci.org/5monkeys/djedi-cms)
[![Coverage Status](https://img.shields.io/coveralls/5monkeys/djedi-cms/master.svg)](https://coveralls.io/r/5monkeys/djedi-cms?branch=master)
[![Downloads](https://img.shields.io/pypi/dm/djedi-cms.svg)](https://img.shields.io/pypi/dm/djedi-cms.svg)


## Documentation

Read the full [documentation][docs] or get a quick brief below.


## Install

```sh
$ pip install djedi-cms
```

## Configure

```python
# settings.py

INSTALLED_APPS = (
    # ...
    'djedi',
)

MIDDLEWARE_CLASSES = (
    'djedi.middleware.translation.DjediTranslationMiddleware',
    # ...
)
```

### Bootstrap database

```sh
$ django-admin.py migrate djedi
```

### Enable admin

```python
# urls.py

urlpatterns = patterns('',
    (r'^admin/', include(admin.site.urls)),
)
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
