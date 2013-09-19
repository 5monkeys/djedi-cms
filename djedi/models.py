# Setup content-io configuration
import djedi
djedi.configure()

# Setup node django model based on backend
from cio.backends import storage
if storage.backend.scheme == 'db':
    from .backends.django.db.models import Node
    Node
