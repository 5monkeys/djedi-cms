from django.contrib import admin
from django.db.models import Model
from django.template.defaultfilters import pluralize
from djedi.admin import cms


def register(admin_class):
    name = admin_class.verbose_name
    name_plural = getattr(admin_class, 'verbose_name_plural', pluralize(name))

    model = type(name, (Model,), {
        '__module__': __name__,
        'Meta': type('Meta', (object,), dict(
            managed=False,
            abstract=True,
            app_label='djedi',
            verbose_name=name,
            verbose_name_plural=name_plural
        ))
    })

    admin.site._registry[model] = admin_class(model, admin.site)


register(cms.Admin)
