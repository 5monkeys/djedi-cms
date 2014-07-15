import cio
import textwrap
from django import template
from django.template import TemplateSyntaxError
from django.template.base import parse_bits
from .template import register


def render_node(node, context=None, edit=True):
    """
    Render node as html for templates, with edit tagging.
    """
    output = node.render(**context or {}) or u''
    if edit:
        return u'<span data-i18n="{0}">{1}</span>'.format(node.uri.clone(scheme=None, ext=None, version=None), output)
    else:
        return output


class DjediNode(template.Node):
    def __init__(self, uri, default, kwargs):
        self.uri = uri
        self.default = default
        self.reload_node()
        self.kwargs = kwargs

    def reload_node(self):
        self.node = cio.get(self.uri, self.default or u'')

    def render(self, context):
        # Resolve tag kwargs against context
        resolved_kwargs = dict((key, value.resolve(context)) for key, value in self.kwargs.iteritems())
        edit = resolved_kwargs.pop('edit', True)

        return render_node(self.node, context=resolved_kwargs, edit=edit)


class SimpleNode(DjediNode):
    """
    Simple node tag:
    {% node 'page/title' default='Lorem ipsum' edit=True %}
    """
    @classmethod
    def tag(cls, parser, token):
        # Parse tag args and kwargs
        bits = token.split_contents()[1:]
        params = ('uri', 'edit', 'default')
        args, kwargs = parse_bits(parser, bits, params, None, True, ('', True,), None, 'node')

        # Assert uri is the only tag arg
        if len(args) > 1:
            raise TemplateSyntaxError('Malformed arguments to blocknode tag')

        # Resolve uri variable
        uri = args[0].resolve({})
        default = kwargs['default'].resolve({}) if 'default' in kwargs else u''

        return cls(uri, default, kwargs)


class BlockNode(DjediNode):
    """
    Block node tag using body content as default:
    {% blocknode 'page/title' edit=True %}
        Lorem ipsum
    {% endblocknode %}
    """
    @classmethod
    def tag(cls, parser, token):
        # Parse tag args and kwargs
        bits = token.split_contents()[1:]
        params = ('uri', 'edit')
        args, kwargs = parse_bits(parser, bits, params, None, True, (True,), None, 'blocknode')

        # Assert uri is the only tag arg
        if len(args) > 1:
            raise TemplateSyntaxError('Malformed arguments to blocknode tag')

        # Resolve uri variable
        uri = args[0].resolve({})

        # Parse tag body (default content)
        tokens = parser.parse(('endblocknode',))
        parser.delete_first_token()  # Remove endblocknode tag

        # Render default content tokens and dedent common leading whitespace
        default = u''.join((token.render({}) for token in tokens))
        default = default.strip('\n\r')
        default = textwrap.dedent(default)

        return cls(uri, default, kwargs)


register.tag('node', SimpleNode.tag)
register.tag('blocknode', BlockNode.tag)
