.. _uri:

URI
===

The uri is a ``Node`` resource identifier, containing all necessary parts to lookup or persist given content.

::

    i18n://en-us@page/home/body.md#draft

    [scheme] :// [namespace] @ [path] . [extension] # [version]


Scheme
------

The scheme uri part sets the scope to look within for the given node path.

Possible schemes are:

- **i18n**
    *Internationalization scope; defining languages*

- **l10n**
    *Local scope; defining regions or flavors, not affected by language*

- **g11n**
    *Global scope; defining global non namespaced uris*


Namespace
---------

Each scheme contains at least one namespace, for example the ``i18n`` scheme uses the namespace as a locale, determine wich language to use.


Path
----

The path is a unique node identifier within the given namespace and scheme.


Extension
---------

The extension resolves wich plugin to use when editing and rendering a node.


Version
-------

Nodes supports versioning and the version part represents a version number or string.
