Settings
========

Djedi is configured in your django project's ``settings.py``.


Environment
-----------

.. code-block:: python

    DJEDI_ENVIRONMENT = {
        'default': {
            'i18n': 'en-us',  # May be tuple representing fallback chain
            'l10n': 'local',
            'g11n': 'global'
        }
    }


Backends
--------

.. code-block:: python

    DJEDI_CACHE = 'djedi.backends.django.cache.Backend' # 'locmem://'
    DJEDI_STORAGE = 'djedi.backends.django.db.Backend'  # 'sqlite://:memory:'

Backends may also be configured dict wise to allow additional backend specific config:

.. code-block:: python

    DJEDI_CACHE = {
        'BACKEND': 'djedi.backends.django.cache.Backend',
        'NAME': 'djedi',
        'FOO': 'bar',
    }


Pipeline
--------

.. code-block:: python

    DJEDI_PIPELINE = (
        'cio.pipeline.pipes.cache.CachePipe',
        'cio.pipeline.pipes.meta.MetaPipe',
        'cio.pipeline.pipes.plugin.PluginPipe',
        'cio.pipeline.pipes.storage.StoragePipe',
        'cio.pipeline.pipes.storage.NamespaceFallbackPipe',
    )


Themes
------

The Djedi CMS admin supports theming to blend in and match your projects design.
Built-in themes is enabled through their names and external themes needs their full static path.

.. code-block:: python

    # Built-in themes (darth|luke)
    DJEDI_THEME = 'darth'

    # External themes
    DJEDI_THEME = '/static/path/to/theme.css'

