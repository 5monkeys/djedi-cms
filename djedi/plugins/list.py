from cio.plugins.base import BasePlugin
from cio.plugins import plugins
from cio.node import Node
from cio.utils.uri import URI
import cio
import json


class ListPlugin(BasePlugin):
    ext = 'list'

    def load(self, content):
        if content:
            try:
                return json.loads(content)
            except ValueError:
                pass
        return {
            'direction': 'col',
            'children': []
        }

    def load_node(self, node):
        data = self.load(node.content)

        # Root data
        plugin = self.resolve_child_plugin(node.uri)
        if not plugin:
            return data

        # Child data
        child_node = self.get_child_node(node, data)

        if self.is_leaf_list_node(child_node.uri):
            return self.load(child_node.content)

        #if child_node.uri == node.uri:
        #    return child_node.content

        return plugin.load_node(child_node)

    def render_node(self, node, data):
        child_plugin = self.resolve_child_plugin(node.uri)

        if child_plugin:
            parent_data = self.load(node.content)
            child_node = self.get_child_node(node, parent_data )

            if child_plugin.ext == self.ext:
                if self.is_leaf_list_node(child_node.uri):
                    return ''.join(self.stream_node(child_node, data))
                else:
                    return child_plugin.render_node(child_node, data)
            else:
                return child_plugin.render_node(child_node, data)
        return ''.join(self.stream_node(node, data))

    def stream_node(self, node, data):
        yield '<ul class="djedi-list djedi-list--{direction}">'.format(**data)
        for child in data['children']:
            # child_node = self.load_child_node(child, node.uri)
            child_node = Node(uri=node.uri, content=child['data'])
            plugin = plugins.get(child['plugin'])
            content = plugin.load_node(child_node)
            yield '<li class="djedi-plugin--{plugin}" id="{key}">'.format(**child)
            yield plugin.render_node(child_node, content)
            yield '</li>'
        yield '</ul>'

    def resolve_child_plugin(self, uri):
        plugin = None

        if '_' in self.get_query_param(uri, 'key'):
            ext = self.ext
        else:
            ext = self.get_query_param(uri, 'plugin')

        #if not ext:
            #import pdb; pdb.set_trace()
        if ext:
            plugin = plugins.get(ext)

        return plugin

    def find_child(self, data, key):
        if not key:
            return None

        for child in data['children']:
            if child['key'] == key:
                return child

        return None

    def get_child_node(self, node, list_data):
        child_uri, key = self.get_child_uri(node.uri)

        child = self.find_child(list_data, key)
        # TODO: modify uri or content instead of new Nodes?
        if child:
            # load_child_node()
            return Node(uri=child_uri, content=child['data'])
        else:
            return Node(uri=child_uri, content=node.content)

    def get_query_param(self, uri, param):
        value = (uri.query or {}).get(param)
        return value[0] if value else ''

    def get_child_key(self, uri):
        key = self.get_query_param(uri, 'key')
        if not key:
            return None, None

        key, _, rest = key.partition('_')
        return key, rest

    def get_child_uri(self, uri):
        key, rest = self.get_child_key(uri)

        if uri.query:
            query = dict(uri.query)
            if not rest:
                query.pop('key', None)
            else:
                query['key'] = [rest]
            uri = uri.clone(query=query)

        return uri, key

    #def load_child_node(self, child, uri, key=None):
        # if not self.get_query_param(uri, "plugin"):
        #     uri = uri.clone(query={
        #         'key': [key or self.get_query_param(uri, 'key')],
        #         'plugin': [child['plugin']],
        #     })
    #    return Node(uri=uri, content=child['data'])

    def is_leaf_list_node(self, uri):
        return not self.get_query_param(uri, 'key') and self.get_query_param(uri, 'plugin') == self.ext

    def save_node(self, node):
        """
        uri: apa.list?plugin=md&key=123_abc
        content: #hej
        """
        if self.get_query_param(node.uri, 'plugin'):
            root_node = cio.load(node.uri.clone(query=None))
            data = root_node['data']

            data = self.save_child(node, data)  # TODO: deep clone data?
        else:
            data = node.content

        node.content = self.save(data)
        return node

    def save_child(self, node, parent_data):
        child_node = self.get_child_node(node, parent_data)

        plugin = self.resolve_child_plugin(node.uri)
        if plugin.ext == self.ext:
            if self.is_leaf_list_node(child_node.uri):
                child_data = self.save(child_node.content)
            else:
                child_data = self.save_child(child_node, parent_data=child_node.content)
        else:
            child_node.content = node.content
            child_node = plugin.save_node(child_node)
            child_data = child_node.content

        key, _ = self.get_child_key(node.uri)
        child = self.find_child(parent_data, key)

        if child:
            child["data"] = child_data
        else:
            parent_data["children"].append({
                "key": key,
                "plugin": plugin.ext,
                "data": child_data,
            })

        return parent_data

    def save(self, content):
        return json.dumps(content)