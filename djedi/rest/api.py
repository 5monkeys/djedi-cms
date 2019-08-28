import simplejson as json
import six
from django.http import HttpResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import View

import cio
import cio.conf

from ..admin.mixins import JSONResponseMixin
from ..auth import has_permission
from ..utils.templates import render_embed


class APIView(JSONResponseMixin, View):

    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        return super(APIView, self).dispatch(request, *args, **kwargs)


class EmbedApi(View):

    def get(self, request):
        if has_permission(request):
            return render_embed(request=request)
        else:
            # We used to `raise PermissionDenied` here (which might seem more
            # appropriate), but that has the annoying side effect of being
            # logged as an error in the browser dev tools, making people think
            # something is wrong.
            return HttpResponse(status=204)


class NodesApi(APIView):
    """
    JSON Response:
        {uri: content, uri: content, ...}
    """
    @never_cache
    def post(self, request):
        try:
            json_body = json.loads(request.body)
        except json.errors.JSONDecodeError:
            return self.render_to_json(
                {'error': 'Not a valid JSON body.'},
                status=400,
            )
        if (
            not all(isinstance(k, six.string_types) for k in json_body.keys())
            or not all(isinstance(v, six.string_types) for v in json_body.values())
        ):
            return self.render_to_json(
                {'error': 'Invalid request body structure.'},
                status=400,
            )
        # Disable caching gets in CachePipe, defaults through this api is not trusted
        cio.conf.settings.configure(
            local=True,
            CACHE={
                'PIPE': {
                    'CACHE_ON_GET': False
                }
            }
        )

        nodes = []
        for uri, default in six.iteritems(json_body):
            node = cio.get(uri, default=default)
            nodes.append(node)

        data = dict((node.uri, node.content) for node in nodes)

        return self.render_to_json(data)
