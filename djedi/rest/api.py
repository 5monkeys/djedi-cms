import simplejson as json
import six
from django.core.exceptions import PermissionDenied
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import View

import cio
import cio.conf

from ..admin.mixins import JSONResponseMixin
from ..auth import has_permission
from ..compat import render


class APIView(JSONResponseMixin, View):

    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        return super(APIView, self).dispatch(request, *args, **kwargs)


class EmbedApi(View):

    def get(self, request):
        if has_permission(request):
            return render(request, 'djedi/cms/embed.html', {
                'exclude_json_nodes': True,
                'cms_url_prefix': request.build_absolute_uri('/').rstrip('/'),
            })
        else:
            raise PermissionDenied


class NodesApi(APIView):
    """
    JSON Response:
        {uri: content, uri: content, ...}
    """
    @never_cache
    def post(self, request):
        nodes = []
        for uri, default in six.iteritems(json.loads(request.body)):
            node = cio.get(uri, default=default)
            nodes.append(node)

        data = dict((node.uri, node.content) for node in nodes)

        return self.render_to_json(data)
