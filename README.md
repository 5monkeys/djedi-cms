# Djedi CMS
Django content management as it should be

## Install
```
$ pip install djedi-cms
```

## Configure
* Add `djedi` to `INSTALLED_APPS`
* Enable django admin or include `djedi.urls` in your root urls with namespace `admin`
* Manage syncdb *(if using default django model djedi backend)*

## Enable djedi cms admin panel
Load `djedi_admin` in your base template and add admin tag at the bottom of your page
```
{% load djedi_admin %}
<body>
    ...
    {% djedi_admin %}
</body>
```

## Usage
Load `djedi_tags` in a template and use `node` or `blocknode` tag
```
{% load djedi_tags %}
<body>
    {% node 'page/title.txt' %}

    {% blocknode 'page/body.md %}
        ## I'm a djedi apprentice
        This is fun!
    {% endblocknode %}
</body>
```
