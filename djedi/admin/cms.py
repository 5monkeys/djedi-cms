try:
    from django.conf.urls import include, url
except ImportError:
    from django.conf.urls.defaults import include, url

from django.contrib.admin import ModelAdmin
from django.core.exceptions import PermissionDenied
from django.views.generic import View

from .mixins import DjediContextMixin
from ..auth import has_permission
from ..compat import render
from ..compat import urlpatterns


class Admin(ModelAdmin):

    verbose_name = 'CMS'
    verbose_name_plural = verbose_name

    def get_urls(self):
        return urlpatterns(
            url(r'^', include('djedi.admin.urls', namespace='djedi')),
            url(r'', lambda: None, name='djedi_cms_changelist')  # Placeholder to show change link to CMS in admin
        )

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
