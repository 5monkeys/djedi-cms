from functools import partial

from django import template
from django.template import Context
from django.template.base import Node, TemplateSyntaxError
from django.template.library import parse_bits
from collections import namedtuple
from inspect import getfullargspec


register = template.Library()


ArgSpec = namedtuple("ArgSpec", ["args", "varargs", "keywords", "defaults"])


def getargspec(func):
    spec = getfullargspec(func)
    return ArgSpec(
        args=spec.args,
        varargs=spec.varargs,
        keywords=spec.varkw,
        defaults=spec.defaults,
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


def lazy_tag(self, func=None, takes_context=None, name=None, node_class=None):
    """
    A tag function decorator, injected on Django's template tag library, similar to simple_tag().
    The decorated function gets called when the template node tree is built and should return
    another function, responsible for the output, that later will be called within the rendering phase.

    Note: if decorated with takes_context=True, context will not be available in the init phase.

    @register.lazy_tag(takes_context=True)
    def x(context, a, b, c=True, d=False):
        # Init phase (no context)

        def render(context):
            # Render phase
            return u'Content of argument a: %s' % a

        return render
    """

    def dec(func):
        params, varargs, varkw, defaults = getargspec(func)

        class SimpleNode(Node):
            def __init__(self, takes_context, args, kwargs):
                self.takes_context = takes_context
                self.args = args
                self.kwargs = kwargs

                resolved_args, resolved_kwargs = self.get_resolved_arguments(
                    Context({})
                )

                self.resolved_args = resolved_args
                self.resolved_kwargs = resolved_kwargs
                self.render_func = func(*resolved_args, **resolved_kwargs)

            def get_resolved_arguments(self, context):
                resolved_args = [var.resolve(context) for var in self.args]
                if self.takes_context:
                    resolved_args = [context] + resolved_args
                resolved_kwargs = {
                    k: v.resolve(context) for k, v in self.kwargs.items()
                }
                return resolved_args, resolved_kwargs

            def render(self, context):
                return self.render_func(context)

        function_name = name or getattr(func, "_decorated_function", func).__name__
        compile_func = partial(
            generic_tag_compiler,
            params=params,
            varargs=varargs,
            varkw=varkw,
            defaults=defaults,
            name=function_name,
            takes_context=takes_context,
            node_class=node_class or SimpleNode,
        )
        compile_func.__doc__ = func.__doc__
        self.tag(function_name, compile_func)

        return func

    if func is None:
        return dec  # @register.lazy_tag(...)
    elif callable(func):
        return dec(func)  # @register.lazy_tag
    else:
        raise TemplateSyntaxError("Invalid arguments provided to lazy_tag")


template.Library.lazy_tag = lazy_tag
