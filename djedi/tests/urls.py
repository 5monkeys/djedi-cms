from django.shortcuts import render_to_response

try:
    from django.conf.urls import include, url
except ImportError:
    from django.conf.urls.defaults import include, url

from django.contrib import admin
from ..compat import urlpatterns

admin.autodiscover()

urlpatterns = urlpatterns(
    url(r'^$', lambda r: render_to_response('index.html'), name='index'),
    url(r'^adm1n/', include(admin.site.urls))
)
