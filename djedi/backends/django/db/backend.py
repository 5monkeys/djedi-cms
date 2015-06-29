import logging

from django.db import IntegrityError
from cio.backends.base import DatabaseBackend
from cio.backends.exceptions import NodeDoesNotExist, PersistenceError

# Use absolute import here or Django 1.7 complains about duplicate models.
from djedi.backends.django.db.models import Node

logger = logging.getLogger(__name__)


class DjangoModelStorageBackend(DatabaseBackend):

    scheme = 'db'

    def __init__(self, **config):
        super(DjangoModelStorageBackend, self).__init__(**config)

    def get_many(self, uris):
        storage_keys = dict((self._build_key(uri), uri) for uri in uris)
        stored_nodes = Node.objects.filter(key__in=storage_keys.keys())
        stored_nodes = stored_nodes.values_list('key', 'content', 'plugin', 'version', 'is_published', 'meta')

        # Filter matching nodes
        nodes = {}
        for key, content, plugin, version, is_published, meta in stored_nodes:
            uri = storage_keys[key]

            # Assert requested plugin matches
            if uri.ext in (None, plugin):

                # Assert version matches or node is published
                if (uri.version == version) or (is_published and not uri.version):
                    meta = self._decode_meta(meta, is_published=is_published)
                    nodes[uri] = {
                        'uri': uri.clone(ext=plugin, version=version),
                        'content': content,
                        'meta': meta
                    }

        return nodes

    def publish(self, uri, **meta):
        node = self._get(uri)

        if not node.is_published:
            # Assign version number
            if not node.version.isdigit():
                revisions = Node.objects.filter(key=node.key).values_list('version', flat=True)
                version = self._get_next_version(revisions)
                node.version = version

            # Un publish any other revision
            Node.objects.filter(key=node.key).update(is_published=False)

            # Publish this version
            self._update_meta(node, meta)
            node.is_published = True
            node.save()

        return self._serialize(uri, node)

    def get_revisions(self, uri):
        key = self._build_key(uri)
        nodes = Node.objects.filter(key=key).order_by('date_created')
        revisions = nodes.values_list('plugin', 'version', 'is_published')
        return [(key.clone(ext=plugin, version=version), is_published) for plugin, version, is_published in revisions]

    def _get(self, uri):
        key = self._build_key(uri)
        nodes = Node.objects.filter(key=key)

        if uri.ext:
            nodes = nodes.filter(plugin=uri.ext)
        if uri.version:
            nodes = nodes.filter(version=uri.version)
        else:
            nodes = nodes.filter(is_published=True)

        try:
            return nodes.get()
        except Node.DoesNotExist:
            raise NodeDoesNotExist('Node for uri "%s" does not exist' % uri)

    def _create(self, uri, content, **meta):
        try:
            meta = self._encode_meta(meta)
            return Node.objects.create(
                key=self._build_key(uri),
                content=content,
                plugin=uri.ext,
                version=uri.version,
                is_published=False,
                meta=meta
            )
        except IntegrityError as e:
            raise PersistenceError('Failed to create node for uri "%s"; %s' % (uri, e))

    def _update(self, uri, content, **meta):
        node = self._get(uri)

        self._update_meta(node, meta)

        node.content = content
        node.plugin = uri.ext
        node.version = uri.version
        node.save()

        return node

    def _delete(self, node):
        node.delete()

    def _serialize(self, uri, node):
        meta = self._decode_meta(node.meta, is_published=node.is_published)
        return {
            'uri': uri.clone(ext=node.plugin, version=node.version),
            'content': node.content,
            'meta': meta
        }

    def _update_meta(self, node, meta):
        node.meta = self._merge_meta(node.meta, meta)
