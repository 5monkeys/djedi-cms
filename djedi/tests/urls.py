from django.shortcuts import render_to_response

try:
    from django.conf.urls import patterns, include, url
except ImportError:
    from django.conf.urls.defaults import patterns, include, url

from django.contrib import admin

admin.autodiscover()

urlpatterns = patterns('',
                       url(r'^$', lambda r: render_to_response('index.html'), name='index'),
                       url(r'^adm1n/', include(admin.site.urls)))
