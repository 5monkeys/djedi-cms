from django.http import HttpResponse
from django.test import RequestFactory

from djedi.middleware import DjediMiddleware
from djedi.middleware.mixins import AdminPanelMixin
from djedi.tests.base import DjediTest


class MiddlewareTest(DjediTest):
    def test_djedi_middleware_calls_process_exception(self):
        request = RequestFactory().get("/")

        class TestMiddleware(DjediMiddleware):
            def __init__(self):
                super().__init__(
                    get_response=lambda _: (_ for _ in ()).throw(RuntimeError("boom"))
                )
                self.seen_exception = None

            def process_exception(self, request, exception):
                self.seen_exception = exception
                super().process_exception(request, exception)

        middleware = TestMiddleware()
        with self.assertRaises(RuntimeError):
            middleware(request)
        assert str(middleware.seen_exception) == "boom"

    def test_djedi_middleware_uses_process_request_response(self):
        class TestMiddleware(DjediMiddleware):
            def process_request(self, request):
                return HttpResponse("from-process-request")

        request = RequestFactory().get("/")
        response = TestMiddleware(get_response=lambda _: HttpResponse("unused"))(
            request
        )
        assert response.content == b"from-process-request"

    def test_body_append_without_body_tag_keeps_content(self):
        response = HttpResponse("<html><div>no body tag</div></html>")
        AdminPanelMixin().body_append(response, "<script>cms</script>")
        assert b"cms" not in response.content
