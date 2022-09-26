from django.http import Http404
from django.urls import re_path

from .api import EmbedApi, NodesApi

app_name = "rest"


def not_found(*args, **kwargs):
    raise Http404


urlpatterns = [
    re_path(r"^$", not_found, name="api-base"),
    re_path(r"^embed/$", EmbedApi.as_view(), name="embed"),
    re_path(r"^nodes/$", NodesApi.as_view(), name="nodes"),
]
