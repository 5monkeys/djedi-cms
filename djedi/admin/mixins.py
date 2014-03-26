import simplejson as json
from django.conf import settings as django_settings
from django.http import HttpResponse
from cio.conf import settings
import djedi

# TODO: Switch simplejson to ujson or other?


class JSONResponseMixin(object):
    """
    A mixin that can be used to render a JSON response.
    """
    response_class = HttpResponse

    def render_to_json(self, context, **response_kwargs):
        """
        Returns a JSON response, transforming 'context' to make the payload.
        """
        response_kwargs['content_type'] = 'application/json'
        return self.response_class(
            self.convert_context_to_json(context),
            **response_kwargs
        )

    def convert_context_to_json(self, context):
        """Convert the context dictionary into a JSON object"""
        return json.dumps(context, indent=4, for_json=True)


class DjediContextMixin(object):

    def get_context_data(self, **context):
        theme = settings.THEME

        if '/' not in theme:
            theme = '{static}djedi/themes/{theme}/theme.css'.format(static=django_settings.STATIC_URL, theme=theme)

        context['THEME'] = theme
        context['VERSION'] = djedi.__version__

        return context
