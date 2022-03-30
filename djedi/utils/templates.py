import json

from django.core.exceptions import ImproperlyConfigured
from django.shortcuts import render
from django.template.loader import render_to_string
from django.urls import NoReverseMatch, reverse


def render_embed(nodes=None, request=None):
    context = {}

    if nodes is None:
        try:
            prefix = request.build_absolute_uri("/").rstrip("/")
            context.update(
                {
                    "cms_url": prefix + reverse("admin:djedi:cms"),
                    "exclude_json_nodes": True,
                }
            )
            output = render(request, "djedi/cms/embed.html", context, using="django")
        except NoReverseMatch:
            raise ImproperlyConfigured(
                "Could not find djedi in your url conf, "
                "enable django admin or include "
                "djedi.urls within the admin namespace."
            )

    else:
        context.update(
            {
                "cms_url": reverse("admin:djedi:cms"),
                "exclude_json_nodes": False,
                "json_nodes": json.dumps(nodes).replace("</", "\\x3C/"),
            }
        )
        output = render_to_string("djedi/cms/embed.html", context, using="django")

    return output
