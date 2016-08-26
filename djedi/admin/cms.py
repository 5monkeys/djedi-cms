import django
try:
    from django.conf.urls import include, url
    if django.VERSION < (1, 9):
        from django.conf.urls import patterns
except ImportError:
    from django.conf.urls.defaults import patterns, include, url


from django.contrib.admin import ModelAdmin
from django.core.exceptions import PermissionDenied
from django.views.generic import View

from .mixins import DjediContextMixin
from ..auth import has_permission
from ..compat import render


class Admin(ModelAdmin):

    verbose_name = 'CMS'
    verbose_name_plural = verbose_name

    def get_urls(self):
        urls = [
            url(r'^', include('djedi.admin.urls', namespace='djedi')),
            url(r'', lambda: None, name='djedi_cms_changelist')  # Placeholder to show change link to CMS in admin
        ]

        if django.VERSION < (1, 9):
            return patterns('', *urls)
        else:
            return urls

    def has_change_permission(self, request, obj=None):
        return has_permission(request.user)

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class DjediCMS(DjediContextMixin, View):

    def get(self, request):
        if has_permission(request.user):
            return render(request, 'djedi/cms/cms.html', self.get_context_data())
        else:
            raise PermissionDenied
