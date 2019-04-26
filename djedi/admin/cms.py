from django.contrib.admin import ModelAdmin
from django.core.exceptions import PermissionDenied
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.generic import View

from ..auth import has_permission
from ..compat import include, patterns, render, url
from .mixins import DjediContextMixin


class Admin(ModelAdmin):

    verbose_name = 'CMS'
    verbose_name_plural = verbose_name

    def get_urls(self):
        return patterns(
            url(r'^', include('djedi.admin.urls', namespace='djedi')),
            url(r'', lambda: None, name='djedi_cms_changelist')  # Placeholder to show change link to CMS in admin
        )

    def has_change_permission(self, request, obj=None):
        return has_permission(request)

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    # Hide Djedi in the admin, since that view is not finished yet.
    # This only works in Django 1.8+, but shouldn't break older versions.
    def has_module_permission(self, request):
        return False


class DjediCMS(DjediContextMixin, View):

    @xframe_options_exempt
    def get(self, request):
        if has_permission(request):
            return render(request, 'djedi/cms/cms.html', self.get_context_data())
        else:
            raise PermissionDenied
