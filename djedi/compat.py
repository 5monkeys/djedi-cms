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
