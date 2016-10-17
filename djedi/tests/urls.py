import django
from django.shortcuts import render_to_response

try:
    from django.conf.urls import include, url
    if django.VERSION < (1, 9):
        from django.conf.urls import patterns
except ImportError:
    from django.conf.urls.defaults import patterns, include, url

from django.contrib import admin

import djedi.urls

admin.autodiscover()

urls = [
    url(r'^$', lambda r: render_to_response('index.html'), name='index'),
    url(r'^adm1n/', include(admin.site.urls)),
    url(r'^djedi/', include(djedi.urls))
]

if django.VERSION < (1, 9):
    urlpatterns = patterns('', *urls)
else:
    urlpatterns = urls
