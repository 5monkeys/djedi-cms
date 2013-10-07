import cio
import json
from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse, NoReverseMatch
from django.template.loader import render_to_string
from django.utils import translation
from django.utils.encoding import smart_unicode
from cio.pipeline import pipeline
from djedi.auth import has_permission


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
                                       'enable django admin or include djedi.urls within the admin namespace.')
        else:
            admin_prefix = djedi_cms_url.strip('/').split('/')[0]
            if request.path.startswith('/' + admin_prefix):
                return

        # Do not inject admin panel on gzipped responses
        if 'gzip' in response.get('Content-Encoding', ''):
            return

        # Only inject admin panel in html pages
        if response.get('Content-Type', '').split(';')[0] not in ('text/html', 'application/xhtml+xml'):
            return

        embed = self.render_cms()
        self.body_append(response, embed)

    def render_cms(self):
        defaults = dict((node.uri.clone(version=None), node.initial) for node in pipeline.history.list('get'))
        return render_to_string('djedi/cms/embed.html', {
            'json_nodes': json.dumps(defaults).replace('</', '\\x3C/'),
        })

    def body_append(self, response, html):
        content = smart_unicode(response.content)
        end_body = u'</body>'
        end_body_index = content.lower().rfind(end_body)

        if end_body_index >= 0:
            response.content = content[:end_body_index] + html + end_body + content[end_body_index + 7:]

            if response.get('Content-Length', None):
                response['Content-Length'] = len(response.content)
