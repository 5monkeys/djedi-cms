from functools import partial
from inspect import getargspec
from django import template
from django.template import Context
from django.template.base import Node, TemplateSyntaxError

from ..compat import generic_tag_compiler

register = template.Library()


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

                resolved_args, resolved_kwargs = self.get_resolved_arguments(Context({}))

                self.resolved_args = resolved_args
                self.resolved_kwargs = resolved_kwargs
                self.render_func = func(*resolved_args, **resolved_kwargs)

            def get_resolved_arguments(self, context):
                resolved_args = [var.resolve(context) for var in self.args]
                if self.takes_context:
                    resolved_args = [context] + resolved_args
                resolved_kwargs = dict((k, v.resolve(context)) for k, v in self.kwargs.items())
                return resolved_args, resolved_kwargs

            def render(self, context):
                return self.render_func(context)

        function_name = (name or
                         getattr(func, '_decorated_function', func).__name__)
        compile_func = partial(generic_tag_compiler,
                               params=params, varargs=varargs, varkw=varkw,
                               defaults=defaults, name=function_name,
                               takes_context=takes_context, node_class=node_class or SimpleNode)
        compile_func.__doc__ = func.__doc__
        self.tag(function_name, compile_func)

        return func

    if func is None:
        return dec        # @register.lazy_tag(...)
    elif callable(func):
        return dec(func)  # @register.lazy_tag
    else:
        raise TemplateSyntaxError("Invalid arguments provided to lazy_tag")


template.Library.lazy_tag = lazy_tag
