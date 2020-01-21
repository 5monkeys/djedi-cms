import json
from djedi.plugins.base import DjediPlugin
from django import forms


def deprefix(s):
    # Remove prefix (anything including and before __)
    return s.rpartition('__')[-1]


def get_custom_render_widget(cls):
    class CustomRenderWidget(cls):
        def render(self, *args, **kwargs):
            name = kwargs.pop("name", None)

            if not name:
                name = args[0]
                args = args[1:]

            name = deprefix(name)

            return super(CustomRenderWidget, self).render(
                "data[%s]" % name,
                *args,
                **kwargs
            )

    return CustomRenderWidget


class BaseEditorForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super(BaseEditorForm, self).__init__(*args, **kwargs)

        for field in list(self.fields.keys()):
            self.fields[field].widget.__class__ = get_custom_render_widget(
                self.fields[field].widget.__class__
            )


class FormsBasePlugin(DjediPlugin):
    ext = None

    @property
    def forms(self):
        return {}

    def get_editor_context(self, **context):
        context.update(
            {"forms": {
                tab: form()
                for tab, form in self.forms.items()
            }}
        )

        return context

    def save(self, data, dumps=True):
        data = self.collect_forms_data(data)
        return json.dumps(data) if dumps else data

    def collect_forms_data(self, data):
        return {
            deprefix(field): data.get(deprefix(field))
            for tab, form in self.forms.items()
            for field in form.base_fields.keys()
        }
