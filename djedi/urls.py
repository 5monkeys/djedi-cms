try:
    from django.conf.urls import patterns, url
except ImportError:
    from django.conf.urls.defaults import patterns, url

from .admin.api import NodeApi, LoadApi, PublishApi, RevisionsApi, RenderApi, NodeEditor
from .admin.cms import DjediCMS

urlpatterns = patterns(
    '',
    url(r'^$', DjediCMS.as_view(), name='djedi_cms'),
    url(r'^node/(?P<uri>.+)/editor$', NodeEditor.as_view(), name='djedi_cms.editor'),
    url(r'^node/(?P<uri>.+)/load$', LoadApi.as_view(), name='djedi_api.load'),
    url(r'^node/(?P<uri>.+)/publish$', PublishApi.as_view(), name='djedi_api.publish'),
    url(r'^node/(?P<uri>.+)/revisions$', RevisionsApi.as_view(), name='djedi_api.revisions'),
    url(r'^node/(?P<uri>.+)$', NodeApi.as_view(), name='djedi_api'),
    url(r'^plugin/(?P<ext>\w+)$', RenderApi.as_view(), name='djedi_api.render'),
)
