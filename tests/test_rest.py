import cio
import os
import pytest
import simplejson as json
import urllib
from django.core.files import File
from django.core.urlresolvers import reverse
from django.test import Client
from cio.plugins import plugins
from cio.backends import storage
from cio.backends.exceptions import NodeDoesNotExist, PersistenceError
from cio.utils.uri import URI


def json_node(response, simple=True):
    node = json.loads(response.content)
    if simple and 'meta' in node:
        del node['meta']
    return node


@pytest.mark.django_db(transaction=True)
def test_permissions(djedi_master, djedi_apprentice):
    client = Client()
    url = reverse('admin:djedi_api', args=['i18n://sv-se@page/title'])

    response = client.get(url)
    assert response.status_code == 403

    logged_in = client.login(username=djedi_master.username, password='test')
    assert logged_in
    response = client.get(url)
    assert response.status_code == 404

    client.logout()
    logged_in = client.login(username=djedi_apprentice.username, password='test')
    assert logged_in
    response = client.get(url)
    assert response.status_code == 404


@pytest.mark.django_db(transaction=True)
def test_get(client):
    url = reverse('admin:djedi_api', args=['i18n://sv-se@page/title'])

    response = client.get(url)
    assert response.status_code == 404

    cio.set('i18n://sv-se@page/title.md', u'# Djedi', publish=False)

    response = client.get(url)
    assert response.status_code == 404

    url = reverse('admin:djedi_api', args=[urllib.quote('i18n://sv-se@page/title#draft')])
    response = client.get(url)
    assert response.status_code == 200
    node = json_node(response)
    assert set(node.keys()) == set(('uri', 'content'))
    assert node['uri'] == 'i18n://sv-se@page/title.md#draft'
    assert node['content'] == u'<h1>Djedi</h1>'


@pytest.mark.django_db(transaction=True)
def test_load(client):
    url = reverse('admin:djedi_api.load', args=['i18n://sv-se@page/title'])

    response = client.get(url)
    assert response.status_code == 200
    json_content = json.loads(response.content)
    assert json_content['uri'] == 'i18n://sv-se@page/title.txt'
    assert json_content['data'] is None
    assert len(json_content['meta'].keys()) == 0

    url = reverse('admin:djedi_api.load', args=['i18n://sv-se@page/title#1'])
    response = client.get(url)
    assert response.status_code == 404

    cio.set('i18n://sv-se@page/title.md', u'# Djedi')

    url = reverse('admin:djedi_api.load', args=['sv-se@page/title'])
    response = client.get(url)
    assert response.status_code == 200
    node = json_node(response, simple=False)
    meta = node.pop('meta', {})
    assert node == {'uri': 'i18n://sv-se@page/title.md#1', 'data': u'# Djedi', 'content': u'<h1>Djedi</h1>'}
    assert set(meta.keys()) == set(('modified_at', 'published_at', 'is_published'))

    url = reverse('admin:djedi_api.load', args=['i18n://sv-se@page/title#1'])
    response = client.get(url)
    json_content = json.loads(response.content)
    assert json_content['uri'] == 'i18n://sv-se@page/title.md#1'

    assert len(cio.revisions('i18n://sv-se@page/title')) == 1


@pytest.mark.django_db(transaction=True)
def test_set(client, db_storage):
    url = reverse('admin:djedi_api', args=['i18n://page/title'])
    response = client.post(url, {'data': u'# Djedi'})
    assert response.status_code == 400

    url = reverse('admin:djedi_api', args=['i18n://sv-se@page/title.txt'])
    response = client.post(url, {'data': u'# Djedi', 'data[extra]': u'foobar'})
    assert response.status_code == 400

    uri = 'i18n://sv-se@page/title.md'
    url = reverse('admin:djedi_api', args=[uri])
    response = client.post(url, {'data': u'# Djedi', 'meta[message]': u'lundberg'})
    assert response.status_code == 200
    node = json_node(response, simple=False)
    meta = node.pop('meta')
    assert node == {'uri': 'i18n://sv-se@page/title.md#draft', 'content': u'<h1>Djedi</h1>'}
    assert meta['author'] == u'master'
    assert meta['message'] == u'lundberg'

    node = cio.get(uri, lazy=False)
    assert node.content is None
    cio.publish(uri)
    node = cio.get(uri, lazy=False)
    assert node.uri == 'i18n://sv-se@page/title.md#1'
    assert node.content == u'<h1>Djedi</h1>'

    url = reverse('admin:djedi_api', args=[urllib.quote(node.uri)])
    response = client.post(url, {'data': u'# Djedi', 'meta[message]': u'Lundberg'})
    node = json_node(response, simple=False)
    assert node['meta']['message'] == u'Lundberg'

    with pytest.raises(PersistenceError):
        db_storage.backend._create(URI(node['uri']), None)


@pytest.mark.django_db(transaction=True)
def test_delete(client):
    url = reverse('admin:djedi_api', args=['i18n://sv-se@page/title'])

    response = client.delete(url)
    assert response.status_code == 404

    node = cio.set('i18n://sv-se@page/title.md', u'# Djedi')

    url = reverse('admin:djedi_api', args=[urllib.quote(node.uri, '')])
    response = client.delete(url)
    assert response.status_code == 200
    assert response.content == u''

    with pytest.raises(NodeDoesNotExist):
        storage.get('i18n://sv-se@page/title')

    node = cio.get('i18n://page/title', lazy=False)
    assert node.content is None


@pytest.mark.django_db(transaction=True)
def test_publish(client):
    url = reverse('admin:djedi_api', args=['i18n://sv-se@page/title'])

    node = cio.set('sv-se@page/title', u'Djedi', publish=False)

    response = client.get(url)
    assert response.status_code == 404

    url = reverse('admin:djedi_api.publish', args=[urllib.quote(node.uri, '')])
    response = client.put(url)
    assert response.status_code == 200

    url = reverse('admin:djedi_api', args=['i18n://sv-se@page/title'])
    response = client.get(url)
    assert response.status_code == 200
    assert json_node(response) == {'uri': 'i18n://sv-se@page/title.txt#1', 'content': u'Djedi'}

    url = reverse('admin:djedi_api.publish', args=[urllib.quote('i18n://sv-se@foo/bar.txt#draft', '')])
    response = client.put(url)
    assert response.status_code == 404


@pytest.mark.django_db(transaction=True)
def test_revisions(client):
    cio.set('sv-se@page/title', u'Djedi 1')
    cio.set('sv-se@page/title', u'Djedi 2')

    url = reverse('admin:djedi_api.revisions', args=['sv-se@page/title'])
    response = client.get(url)
    assert response.status_code == 200

    content = json.loads(response.content)
    assert content == [['i18n://sv-se@page/title.txt#1', False], ['i18n://sv-se@page/title.txt#2', True]]


@pytest.mark.django_db(transaction=True)
def test_render(client):
    url = reverse('admin:djedi_api.render', args=['foo'])
    response = client.post(url, {'data': u'# Djedi'})
    assert response.status_code == 404

    url = reverse('admin:djedi_api.render', args=['md'])
    response = client.post(url, {'data': u'# Djedi'})
    assert response.status_code == 200
    assert response.content == u'<h1>Djedi</h1>'


@pytest.mark.django_db(transaction=True)
def test_editor(client):
    url = reverse('admin:djedi_cms.editor', args=['sv-se@page/title.foo'])
    response = client.get(url)
    assert response.status_code == 404

    url = reverse('admin:djedi_cms.editor', args=['sv-se@page/title'])
    response = client.get(url)
    assert response.status_code == 404

    for ext in plugins:
        url = reverse('admin:djedi_cms.editor', args=['sv-se@page/title.' + ext])
        response = client.get(url)
        assert response.status_code == 200
        assert set(response.context_data.keys()) == set(('THEME', 'uri',))

    url = reverse('admin:djedi_cms.editor', args=['sv-se@page/title'])
    response = client.post(url, {'data': u'Djedi'})
    assert response.status_code == 200


@pytest.mark.django_db(transaction=True)
def test_upload(client):
    url = reverse('admin:djedi_api', args=['i18n://sv-se@header/logo.img'])

    tests_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(tests_dir, 'image.png')

    with open(image_path) as image:
        file = File(image, name=image_path)
        response = client.post(url, {'data[file]': file, 'data[alt]': u'Zwitter', 'meta[comment]': u'VW'})
        from pprint import pprint
        pprint(response.content)
        assert response.status_code == 200
        node = json_node(response, simple=False)
        meta = node.pop('meta')
        uri, content = node['uri'], node['content']
        assert uri == 'i18n://sv-se@header/logo.img#draft'
        assert content.startswith(u'<img src="/media/content-io/img/30/3045c6b466a1a816b180f679c024b7959e1d373c')
        assert meta['comment'] == u'VW'
