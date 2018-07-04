import json

from django.core.exceptions import ImproperlyConfigured

from ..compat import NoReverseMatch, render, render_to_string, reverse


def render_embed(nodes=None, request=None):
    context = {}

    if nodes is None:
        try:
            prefix = request.build_absolute_uri("/").rstrip("/")
            context.update(
                {
                    "cms_url": prefix + reverse("djedi:cms:cms"),
                    "exclude_json_nodes": True,
                }
            )
            output = render(request, "djedi/cms/embed.html", context)
        except NoReverseMatch:
            raise ImproperlyConfigured(
                "Could not find djedi in your url conf, "
                "include djedi.rest.urls within the djedi namespace."
            )

    else:
        context.update(
            {
                "cms_url": reverse("admin:djedi:cms"),
                "exclude_json_nodes": False,
                "json_nodes": json.dumps(nodes).replace("</", "\\x3C/"),
            }
        )
        output = render_to_string("djedi/cms/embed.html", context)

    return output
