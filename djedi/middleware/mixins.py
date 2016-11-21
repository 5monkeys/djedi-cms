import json

import cio

from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse, NoReverseMatch
from django.utils import translation

from cio.conf import settings
from cio.pipeline import pipeline
from djedi.auth import has_permission
from djedi.compat import render_to_string


class TranslationMixin(object):

    def activate_language(self):
        # Activate current django translation
        language = translation.get_language()
        cio.env.push_state(i18n=language)


class AdminPanelMixin(object):

    def inject_admin_panel(self, request, response):
        user = getattr(request, 'user', None)

        # Validate user permissions
        if not has_permission(user):
            return

        # Do not inject admin panel in admin
        try:
            djedi_cms_url = reverse('admin:djedi:cms')
        except NoReverseMatch:
            raise ImproperlyConfigured('Could not find djedi in your url conf, '
                                       'enable django admin or include '
                                       'djedi.urls within the admin namespace.')
        else:
            admin_prefix = djedi_cms_url.strip('/').split('/')[0]
            if request.path.startswith('/' + admin_prefix):
                return

        # Do not inject admin panel on gzipped responses
        if 'gzip' in response.get('Content-Encoding', ''):
            return

        # Only inject admin panel in html pages
        content_type = response.get('Content-Type', '').split(';')[0]
        if content_type not in ('text/html', 'application/xhtml+xml'):
            return

        embed = self.render_cms()
        self.body_append(response, embed)

    def render_cms(self):
        def get_requested_uri(node):
            # Get first namespace URI, remove any version and ensures extension.
            # TODO: Default extension fallback should be handled in content-io
            uri = node.namespace_uri
            uri = uri.clone(
                ext=uri.ext or settings.URI_DEFAULT_EXT,
                version=None,
            )
            return uri

        defaults = dict(
            (get_requested_uri(node), node.initial)
            for node in pipeline.history.list('get')
        )

        return render_to_string('djedi/cms/embed.html', {
            'json_nodes': json.dumps(defaults).replace('</', '\\x3C/'),
        })

    def body_append(self, response, html):
        idx = response.content.lower().rfind(b'</body>')

        if idx >= 0:
            response.content = b''.join((response.content[:idx],
                                         html.encode('utf8'),
                                         response.content[idx:]))

            if response.get('Content-Length', None):
                response['Content-Length'] = len(response.content)
