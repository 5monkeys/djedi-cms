from django.conf.urls import url
from django.http import Http404

from .api import EmbedApi, NodesApi

app_name = "rest"


def not_found(*args, **kwargs):
    raise Http404


urlpatterns = [
    url(r"^$", not_found, name="api-base"),
    url(r"^embed/$", EmbedApi.as_view(), name="embed"),
    url(r"^nodes/$", NodesApi.as_view(), name="nodes"),
]
