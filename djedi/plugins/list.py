from cio.plugins.base import BasePlugin
from cio.plugins import plugins
from cio.utils.uri import URI
from cio.node import Node
import cio
import json
import logging

class ListPlugin(BasePlugin):
    ext = 'list'

    def _load(self, node):
        uri = node.uri.clone()
        child_key, child_uri = self._get_child_uri(uri)
        if child_key:
            content = node.content
            try:
                data = json.loads(content)
            except:
                if uri.query['plugin']:
                    plugin = plugins.resolve(uri.clone(ext=uri.query['plugin'], version=None, query=None))
                    data = plugin._load(node)
                    return data
                else:
                    return ""

            for child in data['children']:
                if child['key'] == child_key:
                    child_meta = child
                    plugin = plugins.resolve(uri.clone(ext=child_meta['plugin'], version=None, query=None))
                    child_node = Node(child_uri.clone(), child_meta['data'])
                    data = plugin._load(child_node)
                    return data
            else:
                return ""
        return super(ListPlugin, self).load(node.content)

    def _save(self, node):
        uri = node.uri.clone()
        child_key, child_uri = self._get_child_uri(uri)
        if child_key:
            key_tree = uri.query['key'].split('_')
            parent_layers = list()
            parent = cio.load(uri.clone(query=None))
            try:
                 parent_data = json.loads(parent['data'])
            except:
                return ""
            parent_layers.append((None, parent_data))
            for no, key in enumerate(key_tree):
                last = no == len(key_tree) - 1
                #Unwrap layers
                (_, parent_layer) = parent_layers[len(parent_layers)-1]
                for child in parent_layer['children']:
                    if child['key'] == key:
                        if last:
                            plugin = plugins.resolve(uri.clone(ext=child['plugin']))
                            query = uri.query
                            query.pop('key')
                            child_node = Node(uri.clone(query=query), node.content, **node.meta)
                            child['data'] = plugin._save(child_node).content
                            break
                        else:
                            parent_layers.append((key, json.loads(child['data'])))
                            break
                else:
                    if last:
                        plugin = plugins.resolve(uri.clone(ext=uri.query['plugin']))
                        query = uri.query
                        query.pop('key')
                        child_node = Node(uri.clone(query=query), node.content, **node.meta)
                        child = {
                            'key': key,
                            'plugin': uri.query['plugin'],
                            'data': plugin._save(child_node).content
                        }
                        parent_layer['children'].append(child)
            #Rewrap layers
            parent_layers.reverse()
            for count, (key, nd) in enumerate(parent_layers):
                if key is None:
                    node.content = self.save(json.dumps(nd))
                else:
                    (_, parent_layer) = parent_layers[count+1]
                    for child in parent_layer['children']:
                        if child['key'] == key:
                            child['data'] = json.dumps(nd)
        # child_key, child_uri = self._get_child_uri(uri)
        # if child_key:
        #     child_tree = uri.query['key'].split('_')
        #     parent_uri = uri.clone(query=None)
        #     parent = cio.load(parent_uri)
        #     try:
        #         parent_data = json.loads(parent['data'])
        #     except:
        #         return ""
        #     for no, key in enumerate(child_tree):
        #         for idx, child in enumerate(parent_data['children']):
        #             if child['key'] == key:
        #                 if no == len(child_tree) - 1:
        #                     parent_data = json.dumps(child['data'])
        #                 else:
        #                     parent_data['children'][idx] = target_child
        #                 break
        #         else:
        #             parent_data['children'].append(target_child)
        #
        #         plugin = plugins.resolve(uri.clone(ext=uri.query['plugin'], version=None, query=None))
        #         child_node = Node(child_uri.clone(), node.content, **node.meta)
        #         target_child = {
        #             'key': child_key,
        #             'plugin': uri.query['plugin'],
        #             'data': plugin._save(child_node).content
        #         }
        #         node.content = self.save(json.dumps(parent_data))
        return super(ListPlugin, self)._save(node)

    def _render(self, data, node):
        uri = node.uri.clone()
        child_key, child_uri = self._get_child_uri(uri)
        if child_key:
            try:
                decoded_data = json.loads(node.content)
            except:
                if uri.query['plugin']:
                    plugin = plugins.resolve(uri.clone(ext=uri.query['plugin'], version=None, query=None))
                    return plugin._render(data, node)
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
            except:
                return ""
            render_data = ""
            for child in decoded_data['children']:
                render_data += '<li id={}>{}</li>'.format(child['key'], self._render_child(child, uri))
            return self.render(render_data)

    def _render_child(self, child_data, uri):
        child_meta = child_data
        plugin = plugins.resolve(uri.clone(ext=child_meta['plugin'], version=None, query=None))
        child_node = Node(uri.clone(), child_meta['data'])
        data = plugin._load(child_node)
        content = plugin._render(data, child_node)
        return content

    def render(self, data):
        return '<ul class="djedi-list">{}</ul>'.format(data)

    def _check_child_integrity(self, child):
        return 'key' in child and 'data' in child and 'plugin' in child

    def _check_data_integrity(self, data):
        return 'children' in data and 'direction' in data

    def _get_child_uri(self, uri):
        cloned_uri = uri.clone()
        if cloned_uri.query and 'key' in cloned_uri.query:
            key, _, rest = cloned_uri.query['key'].partition('_')
            query = cloned_uri.query
            if rest is '' or None:
                query.pop('key')
            else:
                query['key'] = rest
            cloned_uri = cloned_uri.clone(query=query)
            return key, cloned_uri
        else:
            return None, cloned_uri

    # def publish(self, node):
    #     try:
    #         node_uris = json.loads(node.content)
    #     except:
    #         node_uris = []
    #     nodes_versions = [
    #         cio.publish(URI(uri)).uri for uri in node_uris
    #     ]
    #     logging.log(logging.CRITICAL, str(node_uris))
    #     logging.log(logging.CRITICAL, str(node.content))
    #     logging.log(logging.CRITICAL, str(nodes_versions))
    #     node.content = json.dumps(nodes_versions)
    #     return node
    #
    # def render(self, data):
    #     try:
    #         node_uris = json.loads(data)
    #     except:
    #         node_uris = []
    #     html = '<ul class="djedi-list">'
    #     nodes = [
    #         cio.get(URI(uri)) for uri in node_uris
    #     ]
    #     for node in nodes:
    #         content = node.content
    #         _, uuid = node.uri.path.rsplit('/', 1)
    #         html += '<li id="'+uuid+'">' + (content or '') + '</li>'
    #     html += '</ul>'
    #     return html


