import cio
from cio.pipeline import pipeline


class DjediMiddleware(object):

    def __init__(self, get_response=None):
        self.get_response = get_response

    def __call__(self, request):
        response = self.process_request(request)
        if not response:
            try:
                response = self.get_response(request)
                response = self.process_response(request=request,
                                                 response=response)
            except Exception as e:
                self.process_exception(request=request, exception=e)
                raise
        return response

    def process_request(self, request):
        # Bootstrap content-io
        pipeline.clear()
        cio.env.reset()

    def process_response(self, request, response):
        pipeline.clear()
        return response

    def process_exception(self, request, exception):
        pipeline.clear()
