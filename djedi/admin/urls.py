from django.urls import include, re_path

from .api import LoadApi, NodeApi, NodeEditor, PublishApi, RenderApi, RevisionsApi
from .cms import DjediCMS

app_name = "djedi"

urlpatterns = [
    re_path(r"^$", DjediCMS.as_view(), name="cms"),
    re_path(r"^node/(?P<uri>.+)/editor$", NodeEditor.as_view(), name="cms.editor"),
    re_path(r"^node/(?P<uri>.+)/load$", LoadApi.as_view(), name="api.load"),
    re_path(r"^node/(?P<uri>.+)/publish$", PublishApi.as_view(), name="api.publish"),
    re_path(
        r"^node/(?P<uri>.+)/revisions$", RevisionsApi.as_view(), name="api.revisions"
    ),
    re_path(r"^node/(?P<uri>.+)$", NodeApi.as_view(), name="api"),
    re_path(r"^plugin/(?P<ext>\w+)$", RenderApi.as_view(), name="api.render"),
    re_path(r"^api/", include("djedi.rest.urls", namespace="rest")),
]
