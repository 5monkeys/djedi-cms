import json
import logging

from django import template

from cio.pipeline import pipeline
from djedi.auth import has_permission
from djedi.compat import render_to_string


register = template.Library()
logger = logging.getLogger(__name__)


@register.simple_tag(takes_context=True)
def djedi_admin(context):
    output = u''

    if has_permission(context.get('user')):
        defaults = dict((node.uri.clone(version=None), node.initial) for node in pipeline.history.list('get'))
        output = render_to_string('djedi/cms/embed.html', {
            'json_nodes': json.dumps(defaults).replace('</', '\\x3C/'),
        })

    # Clear pipeline
    pipeline.clear()

    return output
