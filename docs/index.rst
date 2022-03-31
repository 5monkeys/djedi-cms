:orphan:

Welcome to Djedi CMS
====================

Djedi CMS is a lightweight but yet powerful Django content management system with plugins, inline editing and performance in mind.

It differs from other CMS's in a control manner. Your urls, views and templates stays intact and remains Django standard.
You will not loose control of your urls or get forced to hook your logic and views backward-*ish* behind the CMS.


Upgrading to 1.1
----------------

If you are using django <1.7 it might be best to upgrade South to 1.0 to make sure there is no conflict with the new migrations.
If you cannot upgrade South then you need to set SOUTH_MIGRATION_MODULES_.

.. code-block:: python

   SOUTH_MIGRATION_MODULES = {"djedi": "djedi.south_migrations"}


User Guide
----------

.. toctree::
   :maxdepth: 2

   installation
   usage
   plugins
   settings


.. _SOUTH_MIGRATION_MODULES: https://south.readthedocs.io/en/latest/settings.html#south-migration-modules
