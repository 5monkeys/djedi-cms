import django

from functools import partial

from django.shortcuts import render
from django.template.loader import render_to_string
from django.template.response import TemplateResponse as BaseTemplateResponse


def urlpatterns(*urls):
    if django.VERSION < (1, 10):
        try:
            from django.conf.urls.defaults import patterns
        except ImportError:
            from django.conf.urls import patterns

        return patterns('', *urls)

    # else
    return list(urls)


if django.VERSION >= (1, 9):
    from django.template.library import parse_bits

    def generic_tag_compiler(parser, token, params, varargs, varkw, defaults,
                             name, takes_context, node_class):
        """
        Returns a template.Node subclass.

        This got inlined into django.template.library since Django since 1.9, this here
        is a copypasta replacement:
        https://github.com/django/django/blob/stable/1.8.x/django/template/base.py#L1089
        """
        bits = token.split_contents()[1:]
        args, kwargs = parse_bits(parser, bits, params, varargs, varkw,
                                  defaults, takes_context, name)
        return node_class(takes_context, args, kwargs)
else:
    from django.template.base import parse_bits
    from django.template.base import generic_tag_compiler  # noqa


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

__all__ = ['render_to_string',
           'render',
           'urlpatterns',
           'generic_tag_compiler',
           'parse_bits']
