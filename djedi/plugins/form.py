import json
import cio
from cio.plugins.base import BasePlugin
from django import forms


class BaseEditorForm(forms.Form):
    def __init__(self, *a, **kw):
        super(BaseEditorForm, self).__init__(*a, **kw)

        # TODO: Change render method on widget
        # to set custom name attr instead of
        # changing fields dict keys.
        for field in list(self.fields.keys()):
            new_field = "data[%s]" % field
            self.fields[new_field] = self.fields.pop(field)


class FormsBasePlugin(BasePlugin):
    ext = None

    @property
    def forms(self):
        return {}

    def get_context(self, **context):
        uri = context.get('uri')

        loaded = cio.load(uri)
        data = {}

        if loaded:
            data = loaded.get('data') or {}

        context.update(
            {"forms": {
                tab: form(initial={
                    "data[%s]" % field: data.get(field)
                    for field in form.base_fields.keys()
                })
                for tab, form in self.forms.items()
            }}
        )

        return context

    def save(self, data, dumps=True):
        data = self.collect_forms_data(data)
        return json.dumps(data) if dumps else data

    def collect_forms_data(self, data):
        return {
            field: data.get(field)
            for tab, form in self.forms.items()
            for field in form.base_fields.keys()
        }
