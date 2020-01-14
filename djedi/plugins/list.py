from cio.plugins.base import BasePlugin
from cio.plugins import plugins
from cio.node import Node
import cio
import json


class ListPlugin(BasePlugin):
    ext = 'list'

    def load_node(self, node):
        uri = node.uri.clone()
        child_key, child_uri = self._get_child_uri(uri)
        if child_key:
            content = node.content
            try:
                data = json.loads(content)
            except ValueError:
                if uri.query['plugin']:
                    plugin = plugins.resolve(uri.clone(ext=uri.query['plugin'][0], version=None, query=None))
                    data = plugin.load_node(node)
                    return data
                else:
                    return ""

            for child in data['children']:
                if child['key'] == child_key:
                    child_meta = child
                    plugin = plugins.resolve(uri.clone(ext=child_meta['plugin'], version=None, query=None))
                    child_node = Node(child_uri.clone(), child_meta['data'])
                    data = plugin.load_node(child_node)
                    return data
            else:
                return ""
        return super(ListPlugin, self).load(node.content)

    def _handle_child_save(self, uri, node):
        key_tree = uri.query['key'][0].split('_')
        parent_layers = list()
        parent = cio.load(uri.clone(query=None))
        try:
            parent_data = json.loads(parent['data'])
        except ValueError:
            return ""
        parent_layers = self._unwrap_layers(key_tree, uri, node, parent_data)
        # Rewrap layers
        parent_layers.reverse()
        for count, (key, nd) in enumerate(parent_layers):
            if key is None:
                node.content = self.save(json.dumps(nd))
            else:
                (_, parent_layer) = parent_layers[count+1]
                for child in parent_layer['children']:
                    if child['key'] == key:
                        child['data'] = json.dumps(nd)

    def _unwrap_layers(self, key_tree, uri, node, parent_data):
        parent_layers = [(None, parent_data)]
        if uri.query['plugin']:
            requested_plugin = uri.query['plugin'][0]
        else:
            requested_plugin = uri.ext
        for no, key in enumerate(key_tree):
            last = no == len(key_tree) - 1
            # Unwrap layers
            (_, parent_layer) = parent_layers[len(parent_layers)-1]
            for child in parent_layer['children']:
                if child['key'] == key and last:
                    plugin = plugins.resolve(uri.clone(ext=child['plugin']))
                    query = uri.query
                    query.pop('key')
                    child_node = Node(uri.clone(query=query), node.content, **node.meta)
                    saved_node = plugin.save_node(child_node)
                    node.uri = node.uri.clone(version=saved_node.uri.version)
                    child['data'] = saved_node.content
                    break
                elif child['key'] == key:
                    parent_layers.append((key, json.loads(child['data'])))
                    break
            else:
                if last:
                    plugin = plugins.resolve(uri.clone(ext=requested_plugin))
                    query = uri.query
                    query.pop('key')
                    child_node = Node(uri.clone(query=query), node.content, **node.meta)
                    saved_node = plugin.save_node(child_node)
                    child = {
                        'key': key,
                        'plugin': requested_plugin,
                        'data': saved_node.content
                    }
                    node.uri = node.uri.clone(version=saved_node.uri.version)
                    parent_layer['children'].append(child)
        return parent_layers

    def save_node(self, node):
        uri = node.uri.clone()
        child_key, child_uri = self._get_child_uri(uri)
        if child_key:
            self._handle_child_save(uri, node)
        return super(ListPlugin, self).save_node(node)

    def render_node(self, node, data):
        uri = node.uri.clone()
        child_key, child_uri = self._get_child_uri(uri)
        if child_key:
            try:
                decoded_data = json.loads(node.content)
            except ValueError:
                if uri.query['plugin']:
                    plugin = plugins.resolve(uri.clone(ext=uri.query['plugin'][0], version=None, query=None))
                    return plugin.render_node(node, data)
                else:
                    return ""
            for child in decoded_data['children']:
                if child['key'] == child_key:
                    return self._render_child(child, child_uri)
            else:
                return ""
        else:
            try:
                decoded_data = json.loads(data)
            except ValueError:
                return self.render({'direction': 'col', 'children': ""})
            render_data = ""
            for child in decoded_data['children']:
                render_data += '<li class=djedi-plugin--{} id={}>{}</li>'.format(
                    child['plugin'],
                    child['key'],
                    self._render_child(child, uri)
                )
            return self.render({'direction': decoded_data['direction'], 'children': render_data})

    def _render_child(self, child_data, uri):
        child_meta = child_data
        plugin = plugins.resolve(uri.clone(ext=child_meta['plugin'], version=None, query=None))
        child_node = Node(uri.clone(), child_meta['data'])
        data = plugin.load_node(child_node)
        content = plugin.render_node(child_node, data)
        return content

    def render(self, data):
        return '<ul class="djedi-list djedi-list--{}">{}</ul>'.format(
            data['direction'],
            data['children']
        )

    def _check_child_integrity(self, child):
        return 'key' in child and 'data' in child and 'plugin' in child

    def _check_data_integrity(self, data):
        return 'children' in data and 'direction' in data

    def _get_child_uri(self, uri):
        cloned_uri = uri.clone()
        if cloned_uri.query and 'key' in cloned_uri.query and cloned_uri.query['key']:
            key, _, rest = cloned_uri.query['key'][0].partition('_')
            query = cloned_uri.query
            if rest == '' or None:
                query.pop('key')
            else:
                query['key'] = [rest]
            cloned_uri = cloned_uri.clone(query=query)
            return key, cloned_uri
        else:
            return None, cloned_uri
