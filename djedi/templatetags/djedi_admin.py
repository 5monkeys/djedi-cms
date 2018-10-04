import logging

from django import template
from django.utils.html import mark_safe

import cio.conf
from cio.pipeline import pipeline
from djedi.auth import has_permission
from djedi.utils.templates import render_embed


register = template.Library()
logger = logging.getLogger(__name__)


@register.simple_tag(takes_context=True)
def djedi_admin(context):
    output = u''

    if has_permission(context.get('request')):
        defaults = dict((node.uri.clone(version=None), node.initial) for node in pipeline.history.list('get'))
        output = render_embed(nodes=defaults)

    # Clear pipeline
    pipeline.clear()

    return output


@register.simple_tag
def djedi_xss_domain():
    domain = cio.conf.settings.get('XSS_DOMAIN')
    if domain:
        return mark_safe(u'<script>document.domain = "{domain}";</script>'.format(domain=domain))

    return u''
