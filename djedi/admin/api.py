from collections import defaultdict

from django.core.exceptions import PermissionDenied
from django.http import Http404, HttpResponse, HttpResponseBadRequest
from django.template.response import TemplateResponse
from django.utils.http import urlunquote
from django.utils.safestring import mark_safe
from django.views.decorators.cache import never_cache
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import View

import cio
from cio.node import Node
from cio.plugins import plugins
from cio.plugins.exceptions import UnknownPlugin
from cio.utils.uri import URI

from .. import auth
from ..plugins.base import DjediPlugin
from .exceptions import InvalidNodeData
from .mixins import DjediContextMixin, JSONResponseMixin


class APIView(View):
    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        if not auth.has_permission(request):
            raise PermissionDenied

        try:
            return super().dispatch(request, *args, **kwargs)
        except Http404:
            raise
        except Exception as e:
            return HttpResponseBadRequest(e)

    def get_post_data(self, request):
        """
        Collect and merge post parameters with multipart files.
        """
        params = dict(request.POST)
        params.update(request.FILES)

        data = defaultdict(dict)

        # Split data and meta parameters
        for param in sorted(params.keys()):
            value = params[param]

            if isinstance(value, list) and len(value) <= 1:
                value = value[0] if value else None

            prefix, _, field = param.partition("[")
            if field:
                field = field[:-1]
                try:
                    data[prefix][field] = value
                except TypeError:
                    raise InvalidNodeData(
                        'Got both reserved parameter "data" and plugin specific parameters.'
                    )
            else:
                data[prefix] = value

        return data["data"], data["meta"]

    def decode_uri(self, uri):
        decoded = urlunquote(uri)

        # If uri got decoded then recursive try more times until nothing more can be decoded
        if decoded != uri:
            decoded = self.decode_uri(decoded)

        return decoded

    def render_to_response(self, content=""):
        return HttpResponse(content)


class NodeApi(JSONResponseMixin, APIView):
    @never_cache
    def get(self, request, uri):
        """
        Return published node or specified version.

        JSON Response:
            {uri: x, content: y}
        """
        uri = self.decode_uri(uri)
        node = cio.get(uri, lazy=False)

        if node.content is None:
            raise Http404

        return self.render_to_json({"uri": node.uri, "content": node.content})

    def post(self, request, uri):
        """
        Set node data for uri, return rendered content.

        JSON Response:
            {uri: x, content: y}
        """
        uri = self.decode_uri(uri)
        data, meta = self.get_post_data(request)
        meta["author"] = auth.get_username(request)
        node = cio.set(uri, data, publish=False, **meta)
        return self.render_to_json(node)

    def delete(self, request, uri):
        """
        Delete versioned uri and return empty text response on success.
        """
        uri = self.decode_uri(uri)
        uris = cio.delete(uri)

        if uri not in uris:
            raise Http404

        return self.render_to_response()


class PublishApi(JSONResponseMixin, APIView):
    def put(self, request, uri):
        """
        Publish versioned uri.

        JSON Response:
            {uri: x, content: y}
        """
        uri = self.decode_uri(uri)
        node = cio.publish(uri)

        if not node:
            raise Http404

        return self.render_to_json(node)


class RevisionsApi(JSONResponseMixin, APIView):
    def get(self, request, uri):
        """
        List uri revisions.

        JSON Response:
            [[uri, state], ...]
        """
        uri = self.decode_uri(uri)
        revisions = cio.revisions(uri)
        # Convert tuples to lists
        revisions = [list(revision) for revision in revisions]
        return self.render_to_json(revisions)


class LoadApi(JSONResponseMixin, APIView):
    @never_cache
    def get(self, request, uri):
        """
        Load raw node source from storage.

        JSON Response:
            {uri: x, data: y}
        """
        uri = self.decode_uri(uri)
        node = cio.load(uri)
        return self.render_to_json(node)


class RenderApi(APIView):
    def post(self, request, ext):
        """
        Render data for plugin and return text response.
        """
        try:
            plugin = plugins.get(ext)
            data, meta = self.get_post_data(request)
            uri = URI(ext=ext)
            node = Node(uri=uri, content=data)
            data = plugin.load_node(node)
            node.content = data
        except UnknownPlugin:
            raise Http404
        else:
            content = plugin.render_node(node, data)
            return self.render_to_response(content)


class NodeEditor(JSONResponseMixin, DjediContextMixin, APIView):
    @never_cache
    @xframe_options_exempt
    def get(self, request, uri):
        try:
            uri = self.decode_uri(uri)
            plugin_context = self.get_plugin_context(request, uri)

        except UnknownPlugin:
            raise Http404
        else:
            return self.render_plugin(request, plugin_context)

    @never_cache
    def post(self, request, uri):
        uri = self.decode_uri(uri)
        data, meta = self.get_post_data(request)
        meta["author"] = auth.get_username(request)
        node = cio.set(uri, data, publish=False, **meta)

        context = cio.load(node.uri)
        context["content"] = node.content
        context.update(self.get_plugin_context(request, context["uri"]))

        if request.is_ajax():
            return self.render_to_json(context)
        else:
            return self.render_plugin(request, context)

    def get_plugin_context(self, request, uri):
        uri = URI(uri)
        plugin = plugins.resolve(uri)

        context = {"uri": uri, "plugin": uri.ext}
        if isinstance(plugin, DjediPlugin):
            context = plugin.get_editor_context(request, **context)

        context["uri"] = mark_safe(context["uri"])
        return context

    def render_plugin(self, request, context):
        return TemplateResponse(
            request,
            [
                "djedi/plugins/%s/editor.html" % context["plugin"],
                "djedi/plugins/base/editor.html",
            ],
            self.get_context_data(**context),
            using="django",
        )
