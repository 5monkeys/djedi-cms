import cio
import os
import simplejson as json
from django.core.files import File
from django.core.urlresolvers import reverse
from django.test import Client
from django.utils.http import urlquote
from cio.plugins import plugins
from cio.backends import storage
from cio.backends.exceptions import PersistenceError, NodeDoesNotExist
from cio.utils.uri import URI
from djedi.tests.base import DjediTest, UserMixin, ClientTest


def json_node(response, simple=True):
    node = json.loads(response.content)
    if simple and 'meta' in node:
        del node['meta']
    return node


class PermissionTest(DjediTest, UserMixin):

    def setUp(self):
        super(PermissionTest, self).setUp()
        self.master = self.create_djedi_master()
        self.apprentice = self.create_djedi_apprentice()

    def test_permissions(self):
        client = Client()
        url = reverse('admin:djedi_api', args=['i18n://sv-se@page/title'])

        response = client.get(url)
        assert response.status_code == 403

        logged_in = client.login(username=self.master.username, password='test')
        assert logged_in
        response = client.get(url)
        assert response.status_code == 404

        client.logout()
        logged_in = client.login(username=self.apprentice.username, password='test')
        assert logged_in
        response = client.get(url)
        assert response.status_code == 404


class RestTest(ClientTest):

    def get_api_url(self, url_name, uri):
        return reverse('admin:' + url_name, args=[urlquote(urlquote(uri, ''), '')])

    def get(self, url_name, uri):
        url = self.get_api_url(url_name, uri)
        return self.client.get(url)

    def post(self, url_name, uri, data):
        url = self.get_api_url(url_name, uri)
        return self.client.post(url, data)

    def put(self, url_name, uri, data=None):
        url = self.get_api_url(url_name, uri)
        return self.client.put(url, data=data or {})

    def delete(self, url_name, uri):
        url = self.get_api_url(url_name, uri)
        return self.client.delete(url)

    def test_get(self):
        response = self.get('djedi_api', 'i18n://sv-se@page/title')
        self.assertEqual(response.status_code, 404)

        cio.set('i18n://sv-se@page/title.md', u'# Djedi', publish=False)

        response = self.get('djedi_api', 'i18n://sv-se@page/title')
        self.assertEqual(response.status_code, 404)

        response = self.get('djedi_api', 'i18n://sv-se@page/title#draft')
        self.assertEqual(response.status_code, 200)
        node = json_node(response)
        self.assertKeys(node, 'uri', 'content')
        self.assertEqual(node['uri'], 'i18n://sv-se@page/title.md#draft')
        self.assertEqual(node['content'], u'<h1>Djedi</h1>')

    def test_load(self):
        response = self.get('djedi_api.load', 'i18n://sv-se@page/title')
        self.assertEqual(response.status_code, 200)
        json_content = json.loads(response.content)
        self.assertEqual(json_content['uri'], 'i18n://sv-se@page/title.txt')
        self.assertIsNone(json_content['data'])
        self.assertEqual(len(json_content['meta'].keys()), 0)

        # TODO: Should get 404
        # response = self.get('djedi_api.load', 'i18n://sv-se@page/title#1')
        # self.assertEqual(response.status_code, 404)

        cio.set('i18n://sv-se@page/title.md', u'# Djedi')

        response = self.get('djedi_api.load', 'sv-se@page/title')
        self.assertEqual(response.status_code, 200)
        node = json_node(response, simple=False)
        meta = node.pop('meta', {})
        self.assertDictEqual(node, {'uri': 'i18n://sv-se@page/title.md#1', 'data': u'# Djedi', 'content': u'<h1>Djedi</h1>'})
        self.assertKeys(meta, 'modified_at', 'published_at', 'is_published')

        response = self.get('djedi_api.load', 'i18n://sv-se@page/title#1')
        json_content = json.loads(response.content)
        self.assertEqual(json_content['uri'], 'i18n://sv-se@page/title.md#1')

        self.assertEqual(len(cio.revisions('i18n://sv-se@page/title')), 1)

    def test_set(self):
        response = self.post('djedi_api', 'i18n://page/title', {'data': u'# Djedi'})
        self.assertEqual(response.status_code, 400)

        response = self.post('djedi_api', 'i18n://sv-se@page/title.txt', {'data': u'# Djedi', 'data[extra]': u'foobar'})
        self.assertEqual(response.status_code, 400)

        uri = 'i18n://sv-se@page/title.md'
        response = self.post('djedi_api', uri, {'data': u'# Djedi', 'meta[message]': u'lundberg'})
        self.assertEqual(response.status_code, 200)
        node = json_node(response, simple=False)
        meta = node.pop('meta')
        self.assertDictEqual(node, {'uri': 'i18n://sv-se@page/title.md#draft', 'content': u'<h1>Djedi</h1>'})
        self.assertEqual(meta['author'], u'master')
        self.assertEqual(meta['message'], u'lundberg')

        node = cio.get(uri, lazy=False)
        self.assertIsNone(node.content)
        cio.publish(uri)
        node = cio.get(uri, lazy=False)
        self.assertEqual(node.uri, 'i18n://sv-se@page/title.md#1')
        self.assertEqual(node.content, u'<h1>Djedi</h1>')

        response = self.post('djedi_api', node.uri, {'data': u'# Djedi', 'meta[message]': u'Lundberg'})
        node = json_node(response, simple=False)
        self.assertEqual(node['meta']['message'], u'Lundberg')

        with self.assertRaises(PersistenceError):
            storage.backend._create(URI(node['uri']), None)

    def test_delete(self):
        response = self.delete('djedi_api', 'i18n://sv-se@page/title')
        self.assertEqual(response.status_code, 404)

        node = cio.set('i18n://sv-se@page/title.md', u'# Djedi')

        response = self.delete('djedi_api', node.uri)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, u'')

        with self.assertRaises(NodeDoesNotExist):
            storage.get('i18n://sv-se@page/title')

        node = cio.get('i18n://page/title', lazy=False)
        self.assertIsNone(node.content)

    def test_publish(self):
        node = cio.set('sv-se@page/title', u'Djedi', publish=False)

        response = self.get('djedi_api', 'i18n://sv-se@page/title')
        assert response.status_code == 404

        response = self.put('djedi_api.publish', node.uri)
        assert response.status_code == 200

        response = self.get('djedi_api', 'i18n://sv-se@page/title')
        assert response.status_code == 200
        assert json_node(response) == {'uri': 'i18n://sv-se@page/title.txt#1', 'content': u'Djedi'}

        response = self.put('djedi_api.publish', 'i18n://sv-se@foo/bar.txt#draft')

        assert response.status_code == 404

    def test_revisions(self):
        cio.set('sv-se@page/title', u'Djedi 1')
        cio.set('sv-se@page/title', u'Djedi 2')

        response = self.get('djedi_api.revisions', 'sv-se@page/title')
        assert response.status_code == 200

        content = json.loads(response.content)
        assert content == [['i18n://sv-se@page/title.txt#1', False], ['i18n://sv-se@page/title.txt#2', True]]

    def test_render(self):
        response = self.post('djedi_api.render', 'foo', {'data': u'# Djedi'})
        assert response.status_code == 404

        response = self.post('djedi_api.render', 'md', {'data': u'# Djedi'})
        assert response.status_code == 200
        assert response.content == u'<h1>Djedi</h1>'

        response = self.post('djedi_api.render', 'img', {'data': json.dumps({
            'url': '/foo/bar.png',
            'width': '64',
            'height': '64'
        })})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, u'<img height="64" src="/foo/bar.png" width="64" />')

    def test_editor(self):
        response = self.get('djedi_cms.editor', 'sv-se@page/title.foo')
        assert response.status_code == 404

        response = self.get('djedi_cms.editor', 'sv-se@page/title')
        assert response.status_code == 404

        for ext in plugins:
            response = self.get('djedi_cms.editor', 'sv-se@page/title.' + ext)
            assert response.status_code == 200
            assert set(response.context_data.keys()) == set(('THEME', 'VERSION', 'uri',))

        response = self.post('djedi_cms.editor', 'sv-se@page/title', {'data': u'Djedi'})
        assert response.status_code == 200

    def test_upload(self):
        # url = reverse('admin:djedi_api', args=['i18n://sv-se@header/logo.img'])

        tests_dir = os.path.dirname(os.path.abspath(__file__))
        image_path = os.path.join(tests_dir, 'assets', 'image.png')

        form = {
            'data[width]': u'64',
            'data[height]': u'64',
            'data[crop]': u'64,64,128,128',
            'data[id]': u'vw',
            'data[class]': u'year-53',
            'data[alt]': u'Zwitter',
            'meta[comment]': u'VW'
        }
        response = self.post('djedi_api', 'i18n://sv-se@header/logo.img', form)
        self.assertEqual(response.status_code, 200)

        with open(image_path) as image:
            file = File(image, name=image_path)
            form['data[file]'] = file
            response = self.post('djedi_api', 'i18n://sv-se@header/logo.img', form)
            self.assertEqual(response.status_code, 200)

            node = json_node(response, simple=False)
            meta = node.pop('meta')
            uri, content = node['uri'], node['content']
            self.assertEqual(uri, 'i18n://sv-se@header/logo.img#draft')
            self.assertEqual(meta['comment'], u'VW')
            html = u'<img ' \
                   u'alt="Zwitter" ' \
                   u'class="year-53" ' \
                   u'height="64" ' \
                   u'id="vw" ' \
                   u'src="/media/djedi/img/03/5e/5eba6fc2149822a8dbf76cd6978798f2ddc4ac34.png" ' \
                   u'width="64" />'
            self.assertEqual(content, html)

            # Post new resized version
            node = cio.load(uri)
            del form['data[file]']
            del form['data[crop]']
            form['data[width]'] = form['data[height]'] = u'32'
            form['data[filename]'] = node['data']['filename']

            response = self.post('djedi_api', 'i18n://sv-se@header/logo.img', form)
            self.assertEqual(response.status_code, 200)
