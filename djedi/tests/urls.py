import django
from django.shortcuts import render_to_response
from django.contrib import admin
from ..compat import patterns, url, include

admin.autodiscover()

if django.VERSION < (2, 0):
    admin_urls = include(admin.site.urls)
else:
    admin_urls = admin.site.urls

urlpatterns = patterns(
    url(r'^$', lambda r: render_to_response('index.html'), name='index'),
    url(r'^adm1n/', admin_urls)
)
