import django
from django.contrib import admin
from django.shortcuts import render_to_response

from ..compat import include, patterns, url

admin.autodiscover()

if django.VERSION < (2, 0):
    admin_urls = include(admin.site.urls)
else:
    admin_urls = admin.site.urls

urlpatterns = patterns(
    url(r'^$', lambda r: render_to_response('index.html'), name='index'),
    url(r'^adm1n/', admin_urls),
    url(r'^djed1/', include('djedi.urls', namespace='admin'))
)
