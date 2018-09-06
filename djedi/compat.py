import django

from functools import partial

from django.shortcuts import render
from django.template.loader import render_to_string
from django.template.response import TemplateResponse as BaseTemplateResponse


if django.VERSION < (1, 6):
    from django.conf.urls.defaults import include, url
else:
    from django.conf.urls import include, url


if django.VERSION < (2, 0):
    from django.core.urlresolvers import reverse, NoReverseMatch
else:
    from django.urls import reverse, NoReverseMatch


def patterns(*urls):
    if django.VERSION < (1, 6):
        from django.conf.urls.defaults import patterns
        return patterns('', *urls)
    elif django.VERSION < (1, 10):
        from django.conf.urls import patterns
        return patterns('', *urls)
    return list(urls)


if django.VERSION >= (1, 9):
    if django.VERSION < (2, 0):
        from django.template.library import parse_bits
    else:
        def parse_bits(parser, bits, params, varargs, varkw, defaults,
                       takes_context, name):
            from django.template import library
            return library.parse_bits(
                parser=parser, bits=bits, params=params, varargs=varargs,
                varkw=varkw, defaults=defaults, kwonly=(), kwonly_defaults=(),
                takes_context=takes_context, name=name)

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


if django.VERSION < (1, 9):
    from django.core.cache import get_cache
else:
    from django.core.cache import caches

    def get_cache(name):
        return caches[name]


__all__ = ['render_to_string',
           'render',
           'patterns',
           'include',
           'url',
           'reverse',
           'NoReverseMatch',
           'generic_tag_compiler',
           'parse_bits',
           'get_cache']
