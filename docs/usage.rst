.. _usage:

Usage
=====

Djedi CMS is more or less a highly configurable key/value store, built on top of the content pipeline library `content-io <content-io_>`_.

The key is represented by a :ref:`uri` and the value is the content, together they combine a ``Node``.


Template tags
-------------

Load ``djedi_tags`` in a template and use the ``node`` or ``blocknode`` tags

.. code-block:: django

    {% load djedi_tags %}
    <body>
        <h1>{% node 'page/home/title.txt' default='Djedi' %}</h1>

        {% node 'page/home/logo.img' %}

        {% blocknode 'page/home/body.md' %}
            ## I'm a djedi apprentice
            This is fun!
        {% endblocknode %}
    </body>


.. _content-io: https://github.com/5monkeys/content-io/
