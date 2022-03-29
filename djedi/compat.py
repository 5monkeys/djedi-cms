from collections import namedtuple
from functools import partial
from inspect import getfullargspec
from collections import namedtuple

import django
from django.shortcuts import render
from django.template.loader import render_to_string
from django.template.response import TemplateResponse as BaseTemplateResponse
from django.core.cache import caches
from django.conf.urls import include, url
from django.urls import reverse, NoReverseMatch


def patterns(*urls):
    return list(urls)


def parse_bits(parser, bits, params, varargs, varkw, defaults, takes_context, name):
    from django.template import library

    return library.parse_bits(
        parser=parser,
        bits=bits,
        params=params,
        varargs=varargs,
        varkw=varkw,
        defaults=defaults,
        kwonly=(),
        kwonly_defaults=(),
        takes_context=takes_context,
        name=name,
    )


def generic_tag_compiler(
    parser, token, params, varargs, varkw, defaults, name, takes_context, node_class
):
    """
    Returns a template.Node subclass.

    This got inlined into django.template.library since Django since 1.9, this here
    is a copypasta replacement:
    https://github.com/django/django/blob/stable/1.8.x/django/template/base.py#L1089
    """
    bits = token.split_contents()[1:]
    args, kwargs = parse_bits(
        parser, bits, params, varargs, varkw, defaults, takes_context, name
    )
    return node_class(takes_context, args, kwargs)


render_to_string = partial(render_to_string, using="django")
render = partial(render, using="django")


class TemplateResponse(BaseTemplateResponse):
    def __init__(self, *args, **kwargs):
        kwargs["using"] = "django"
        super(TemplateResponse, self).__init__(*args, **kwargs)


def get_cache(name):
    return caches[name]


ArgSpec = namedtuple("ArgSpec", ["args", "varargs", "keywords", "defaults"])


def getargspec(func):
    spec = getfullargspec(func)
    return ArgSpec(
        args=spec.args,
        varargs=spec.varargs,
        keywords=spec.varkw,
        defaults=spec.defaults,
    )


__all__ = [
    "render_to_string",
    "render",
    "patterns",
    "include",
    "url",
    "reverse",
    "NoReverseMatch",
    "generic_tag_compiler",
    "parse_bits",
    "get_cache",
]
