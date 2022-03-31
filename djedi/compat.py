from collections import namedtuple
from functools import partial
from inspect import getfullargspec

from django.conf.urls import include, url
from django.shortcuts import render
from django.template.library import parse_bits
from django.template.loader import render_to_string
from django.template.response import TemplateResponse as BaseTemplateResponse
from django.urls import reverse


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
    return node_class(takes_context, args, kwargs)


render_to_string = partial(render_to_string, using="django")
render = partial(render, using="django")


class TemplateResponse(BaseTemplateResponse):
    def __init__(self, *args, **kwargs):
        kwargs["using"] = "django"
        super().__init__(*args, **kwargs)


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
    "generic_tag_compiler",
    "render_to_string",
    "render",
    "include",
    "url",
    "reverse",
]
