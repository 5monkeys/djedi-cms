.. _installation:

Installation
============

This part of the documentation will guide you through the steps of how you install and configure Djedi CMS in your Django project.


Install
-------

Djedi CMS is easiest installed from the `cheese shop <cheese-shop_>`_ using pip:

.. code-block:: sh

    $ pip install djedi-cms

Plugins may require additional eggs like ``Markdown`` and ``Pillow`` (PIL)
which is described in the :ref:`plugins` section.


Configure
---------

Add ``djedi`` to ``INSTALLED_APPS`` and suitable djedi middleware to ``MIDDLEWARE_CLASSES``:

.. code-block:: python

    # settings.py

    INSTALLED_APPS = (
        # ...
        'djedi',
    )

    MIDDLEWARE_CLASSES = (
        'djedi.middleware.translation.DjediTranslationMiddleware',
        # ...
    )


Bootstrap database
~~~~~~~~~~~~~~~~~~

If you're using the default djedi settings, the built-in django storage backend will be used and you need to synchronize your database.

.. code-block:: sh

    $ django-admin.py syncdb


**Note:**
It is recommended that you use ``South`` to migrate your database:

.. code-block:: sh

    $ django-admin.py migrate djedi


Enable admin
~~~~~~~~~~~~

If the Django ``AdminSite`` already is enabled, and `included <django-admin-site_>`_, in your root urls, then you're good to go.

.. code-block:: python

    # urls.py

    from django.conf.urls import patterns, include
    from django.contrib import admin

    admin.autodiscover()

    urlpatterns = ['',
        (r'^admin/', include(admin.site.urls)),
    )]


If you're not using, or don't want to use, Django admin you can always include ``djedi.urls`` within the `admin` namespace instead.

.. code-block:: python

    # urls.py

    urlpatterns = ['',
        (r'^djedi/', include('djedi.urls', namespace='admin')),
    ]


.. _django-admin-site: https://docs.djangoproject.com/en/dev/ref/contrib/admin/#hooking-adminsite-instances-into-your-urlconf
.. _cheese-shop: https://pypi.python.org/pypi/djedi-cms/
    :target
