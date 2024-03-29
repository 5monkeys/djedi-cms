.. _plugins:

Plugins
=======

Djedi CMS plugins handles content serialization and rendering.
Each plugin has its own extension which is referred to in the request URI.
Plugins are activated by adding the the full class path in the ``PLUGINS`` setting.

Default settings:

.. code-block:: python

    PLUGINS = (
        "cio.plugins.txt.TextPlugin",
        "cio.plugins.md.MarkdownPlugin",
        "djedi.plugins.img.ImagePlugin",
    )


Built-in plugins
----------------

Djedi CMS comes with three built-in plugins; text, markdown and image.


Text Plugin
~~~~~~~~~~~

:Plugin: cio.plugins.txt.TextPlugin
:Extension: txt
:Dependencies: *none*

The text plugin is a plugin in its simplest form, not modifying the content either when persisting or rendering.


Markdown Plugin
~~~~~~~~~~~~~~~

:Plugin: cio.plugins.md.MarkdownPlugin
:Extension: md
:Dependencies: Markdown

The markdown plugin depends on the `Markdown <https://pypi.python.org/pypi/Markdown/>`_ package.
It renders persisted markdown syntax as html.

.. code-block:: sh

    $ pip install Markdown


Image Plugin
~~~~~~~~~~~~

:Plugin: djedi.plugins.img.ImagePlugin
:Extension: img
:Dependencies: PIL

The image plugin handles drag and drop image uploads, and renders html image tags.
It depends on the python imaging library, and it's recommended that you use the more up-to-date
`Pillow <https://pypi.python.org/pypi/Pillow/>`_ fork.

.. code-block:: sh

    $ pip install Pillow

Uploaded images gets persisted using Django's file storage api. If you don't want to use the default storage,
you can configure the image plugin setting ``FILE_STORAGE``.

.. code-block:: python

    IMG = {"FILE_STORAGE": my_file_storage}
