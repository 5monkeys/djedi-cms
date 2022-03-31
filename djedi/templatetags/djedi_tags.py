import textwrap

from django import template
from django.template import TemplateSyntaxError
from django.template.library import parse_bits

import cio

from .template import register


def render_node(node, context=None, edit=True):
    """
    Render node as html for templates, with edit tagging.
    """
    output = node.render(**context or {}) or ""
    if edit:
        return f'<span data-i18n="{node.uri.clone(scheme=None, ext=None, version=None)}">{output}</span>'
    else:
        return output


@register.lazy_tag
def node(key, default=None, edit=True):
    """
    Simple node tag:
    {% node 'page/title' default='Lorem ipsum' edit=True %}
    """
    node = cio.get(key, default=default or "")
    return lambda _: render_node(node, edit=edit)


class BlockNode(template.Node):
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
        params = ("uri", "edit")
        args, kwargs = parse_bits(
            parser=parser,
            bits=bits,
            params=params,
            varargs=None,
            varkw=True,
            defaults=(True,),
            kwonly=(),
            kwonly_defaults=(),
            takes_context=None,
            name="blocknode",
        )

        # Assert uri is the only tag arg
        if len(args) > 1:
            raise TemplateSyntaxError("Malformed arguments to blocknode tag")

        # Resolve uri variable
        uri = args[0].resolve({})

        # Parse tag body (default content)
        tokens = parser.parse(("endblocknode",))
        parser.delete_first_token()  # Remove endblocknode tag

        # Render default content tokens and dedent common leading whitespace
        default = "".join(token.render({}) for token in tokens)
        default = default.strip("\n\r")
        default = textwrap.dedent(default)

        # Get node for uri, lacks context variable lookup due to lazy loading.
        node = cio.get(uri, default)

        return cls(tokens, node, kwargs)

    def __init__(self, tokens, node, kwargs):
        self.tokens = tokens
        self.node = node
        self.kwargs = kwargs

    def render(self, context):
        # Resolve tag kwargs against context
        resolved_kwargs = {
            key: value.resolve(context) for key, value in self.kwargs.items()
        }
        edit = resolved_kwargs.pop("edit", True)

        return render_node(self.node, context=resolved_kwargs, edit=edit)


register.tag("blocknode", BlockNode.tag)
