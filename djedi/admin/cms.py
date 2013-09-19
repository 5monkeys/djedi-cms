
try:
    from django.conf.urls import patterns, include, url
except ImportError:
    from django.conf.urls.defaults import patterns, include, url
from django.contrib.admin import ModelAdmin
from django.shortcuts import render
from django.views.generic import View
from .mixins import DjediContextMixin


class Admin(ModelAdmin):

    verbose_name = 'CMS'
    verbose_name_plural = verbose_name

    def get_urls(self):
        return patterns('', url(r'^', include('djedi.urls')))

    def has_change_permission(self, request, obj=None):
        return True


class DjediCMS(DjediContextMixin, View):

    def get(self, request):
        return render(request, 'djedi/cms/cms.html', self.get_context_data())
