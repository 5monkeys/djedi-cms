![Django CMS](https://raw.github.com/5monkeys/djedi-cms/master/docs/_static/djedi-landscape.png)

Django content management as it should be.

[![Build Status](https://travis-ci.org/5monkeys/djedi-cms.png?branch=master)](https://travis-ci.org/5monkeys/djedi-cms)
[![Coverage Status](https://coveralls.io/repos/5monkeys/djedi-cms/badge.png?branch=master)](https://coveralls.io/r/5monkeys/djedi-cms?branch=master)
[![Downloads](https://pypip.in/v/djedi-cms/badge.png)](https://crate.io/package/djedi-cms)


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
