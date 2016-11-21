import djedi
from cio.backends import storage


# Setup content-io configuration
djedi.configure()

# Setup node django model based on backend
if storage.backend.scheme == 'db':
    from .backends.django.db.models import Node
    Node
