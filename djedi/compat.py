import django

from functools import partial

from django.shortcuts import render
from django.template.loader import render_to_string
from django.template.response import TemplateResponse as BaseTemplateResponse

__all__ = ['render_to_string', 'render']

if django.VERSION >= (1, 8):
    # Always use the Django template engine on Django 1.8.
    render_to_string = partial(render_to_string, using='django')
    render = partial(render, using='django')

    class TemplateResponse(BaseTemplateResponse):
        def __init__(self, *args, **kwargs):
            kwargs['using'] = 'django'
            super(TemplateResponse, self).__init__(*args, **kwargs)
else:
    TemplateResponse = BaseTemplateResponse
