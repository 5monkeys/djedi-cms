import django
from django import template

register = template.Library()

if django.VERSION > (1, 9):
    from django.templatetags.static import static as _static
    from django.templatetags.static import do_static as _do_static
else:
    from django.contrib.templatetags.staticfiles import static as _static
    from django.contrib.templatetags.staticfiles import do_static as _do_static


def static(path):
    return _static(path)


@register.tag('static')
def do_static(parser, token):
    return _do_static(parser, token)
