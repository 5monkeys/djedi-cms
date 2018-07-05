from django.http import Http404

from ..compat import patterns, url
from .api import EmbedApi, NodesApi

app_name = 'rest'


def not_found(*args, **kwargs):
    raise Http404


urlpatterns = patterns(
    url(r'^$', not_found, name='api-base'),
    url(r'^embed/$', EmbedApi.as_view(), name='embed'),
    url(r'^nodes/$', NodesApi.as_view(), name='nodes'),
)
