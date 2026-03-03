from types import SimpleNamespace

from djedi.auth import get_username
from djedi.tests.base import DjediTest


class AuthTest(DjediTest):
    def test_get_username_fallback_to_attribute(self):
        request = SimpleNamespace(user=SimpleNamespace(username="legacy"))
        assert get_username(request) == "legacy"
