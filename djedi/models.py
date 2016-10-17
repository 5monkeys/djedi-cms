from cio.backends import storage

import djedi

# Setup node django model based on backend
if storage.backend.scheme == 'db':
    from djedi.backends.django.db.models import Node  # noqa

# Setup content-io configuration
djedi.configure()
