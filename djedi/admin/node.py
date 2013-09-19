from django.contrib.admin import ModelAdmin
from django.http import Http404


class Admin(ModelAdmin):

    verbose_name = 'Node'

    def changelist_view(self, request, extra_context=None):
        raise Http404

    def change_view(self, request, object_id, form_url='', extra_context=None):
        raise Http404

    def add_view(self, request, form_url='', extra_context=None):
        raise Http404

    def delete_view(self, request, object_id, extra_context=None):
        raise Http404
