from ..compat import include, patterns, url
from .api import EmbedApi, NodesApi

app_name = 'djedi'

urlpatterns = patterns(
    url(r'^embed/$', EmbedApi.as_view(), name='rest.embed'),
    url(r'^nodes/$', NodesApi.as_view(), name='rest.nodes'),
    url(r'^cms/', include('djedi.admin.urls', namespace='cms')),
)
