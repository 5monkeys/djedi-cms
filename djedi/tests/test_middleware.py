from django.test import RequestFactory

from djedi.middleware import DjediMiddleware
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
