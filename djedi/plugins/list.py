import json

import cio
from cio.node import Node
from cio.plugins import plugins

from .base import DjediPlugin


class ListPlugin(DjediPlugin):
    ext = "list"

    def get_editor_context(self, request, **context):
        uri = context["uri"]
        plugin_ext = self.get_query_param(uri, "plugin")
        if plugin_ext:
            context["plugin"] = plugin_ext
            plugin = plugins.get(plugin_ext)
            if isinstance(plugin, DjediPlugin):
                context.update(plugin.get_editor_context(request, **context))

        return context

    def load(self, content):
        if content:
            try:
                return json.loads(content)
            except ValueError:
                pass
        return {"direction": "col", "children": []}

    def load_node(self, node):
        list_data = self.load(node.content)

        # Root data
        if self.is_leaf_list_node(node.uri):
            return list_data

        # Child data
        child_node, key = self.get_child_node(node.uri, list_data)
        plugin = self.resolve_child_plugin(child_node.uri)

        return plugin.load_node(child_node)

    def render_node(self, node, data):
        if not self.is_leaf_list_node(node.uri):
            child_plugin = self.resolve_child_plugin(node.uri)
            if child_plugin:
                child_uri, _ = self.get_child_uri(node.uri)
                return child_plugin.render_node(Node(uri=child_uri), data)

        return "".join(self.stream_node(node, data))

    def stream_node(self, node, data):
        yield '<ul class="djedi-list djedi-list--{direction}">'.format(**data)
        for child in data["children"]:
            ext = child["plugin"]
            child_uri = node.uri.clone(query={"plugin": [ext], "key": [child["key"]]})
            child_node = Node(uri=child_uri, content=child["data"])
            plugin = plugins.get(ext)
            content = plugin.load_node(child_node)
            yield '<li class="djedi-plugin--{plugin}" id="{key}">'.format(**child)
            yield plugin.render_node(child_node, content) or ""
            yield "</li>"
        yield "</ul>"

    def resolve_child_plugin(self, uri):
        if self.is_nested(uri):
            ext = self.ext
        else:
            ext = self.get_query_param(uri, "plugin")

        return plugins.get(ext or self.ext)

    def find_child(self, data, key):
        if not key:
            return None

        for child in data["children"]:
            if child["key"] == key:
                return child

        return None

    def get_child_node(self, uri, parent_data, default=None):
        # TODO: modify uri or content instead of new Nodes?
        child_uri, key = self.get_child_uri(uri)
        child = self.find_child(parent_data, key)
        content = child["data"] if child else default
        return Node(uri=child_uri, content=content), key

    def get_query_param(self, uri, param):
        value = (uri.query or {}).get(param)
        return value[0] if value else ""

    def is_nested(self, uri):
        return bool(self.get_query_param(uri, "key"))

    def get_child_key(self, uri):
        key = self.get_query_param(uri, "key")
        if not key:
            return None, None

        key, _, rest = key.partition("_")
        return key, rest

    def get_child_uri(self, uri):
        key, rest = self.get_child_key(uri)

        if uri.query:
            query = dict(uri.query)
            if not rest:
                query.pop("key", None)
            else:
                query["key"] = [rest]
            uri = uri.clone(query=query)

        return uri, key

    def is_leaf_list_node(self, uri):
        plugin = self.get_query_param(uri, "plugin")
        return not plugin or plugin == self.ext and not self.is_nested(uri)

    def save_node(self, node):
        if not self.get_query_param(node.uri, "plugin"):
            return node

        root_node = cio.load(node.uri.clone(query=None))
        root_data = root_node["data"] or self.load(None)

        node.content = self.save_child(
            node.content, parent_node=node, parent_data=root_data
        )  # TODO: deep clone data?

        return node

    def save_child(self, leaf_data, parent_node, parent_data):
        child_node, key = self.get_child_node(
            parent_node.uri, parent_data, default=parent_node.content
        )

        plugin = self.resolve_child_plugin(child_node.uri)
        if plugin.ext == self.ext:
            if not self.is_nested(child_node.uri):
                child_content = leaf_data
            else:
                child_data = self.load(child_node.content)
                child_content = self.save_child(
                    leaf_data, parent_node=child_node, parent_data=child_data
                )
        else:
            child_node.content = leaf_data
            child_node = plugin.save_node(child_node)
            child_content = child_node.content

        child = self.find_child(parent_data, key)

        if child:
            child["data"] = child_content
        else:
            parent_data["children"].append(
                {
                    "key": key,
                    "plugin": plugin.ext,
                    "data": child_content,
                }
            )

        return self.save(parent_data)

    def save(self, content):
        return json.dumps(content)
