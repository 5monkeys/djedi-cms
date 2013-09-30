from django.utils import translation
import cio
import json
from django.core.urlresolvers import reverse
from django.template.loader import render_to_string
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
        if request.path.startswith(reverse('admin:index')):
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
        parts = content.lower().rsplit(end_body, 1)

        if len(parts) == 2:
            response.content = parts[0] + html + end_body + parts[1]

            if response.get('Content-Length', None):
                response['Content-Length'] = len(response.content)
