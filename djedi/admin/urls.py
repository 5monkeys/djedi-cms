try:
    from django.conf.urls import patterns, url
except ImportError:
    from django.conf.urls.defaults import patterns, url

from .api import NodeApi, LoadApi, PublishApi, RevisionsApi, RenderApi, NodeEditor
from .cms import DjediCMS

urlpatterns = patterns(
    '',
    url(r'^$', DjediCMS.as_view(), name='cms'),
    url(r'^node/(?P<uri>.+)/editor$', NodeEditor.as_view(), name='cms.editor'),
    url(r'^node/(?P<uri>.+)/load$', LoadApi.as_view(), name='api.load'),
    url(r'^node/(?P<uri>.+)/publish$', PublishApi.as_view(), name='api.publish'),
    url(r'^node/(?P<uri>.+)/revisions$', RevisionsApi.as_view(), name='api.revisions'),
    url(r'^node/(?P<uri>.+)$', NodeApi.as_view(), name='api'),
    url(r'^plugin/(?P<ext>\w+)$', RenderApi.as_view(), name='api.render'),
)
