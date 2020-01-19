import json
import cio
from cio.plugins.base import BasePlugin
from django import forms


def get_custom_render_widget(cls):
    class CustomRenderWidget(cls):
        def render(self, name, value, attrs=None, renderer=None):
            return super(CustomRenderWidget, self).render(
                name="data[%s]" % name,
                value=value,
                attrs=attrs,
                renderer=renderer
            )

    return CustomRenderWidget


class BaseEditorForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super(BaseEditorForm, self).__init__(*args, **kwargs)

        for field in list(self.fields.keys()):
            self.fields[field].widget.__class__ = get_custom_render_widget(
                self.fields[field].widget.__class__
            )


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