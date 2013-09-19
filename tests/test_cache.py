import pytest
from cio.backends import cache


@pytest.mark.django_db(transaction=True)
def test_set():
    uri = 'i18n://sv-se@page/title.txt#1'
    content = u'Title'

    assert cache.get(uri) is None
    cache.set(uri, content)

    node = cache.get(uri)
    assert node['uri'] == uri
    assert node['content'] == content

    cache.delete(uri)
    assert cache.get(uri) is None
