from django.template import Library, defaulttags

register = Library()


@register.tag
def url(parser, token):
    return defaulttags.url(parser, token)
