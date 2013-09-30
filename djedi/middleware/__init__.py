import cio
from cio.pipeline import pipeline


class DjediMiddleware(object):

    def process_request(self, request):
        # Bootstrap content-io
        pipeline.clear()
        cio.env.reset()

    def process_response(self, request, response):
        pipeline.clear()
        return response

    def process_exception(self, request, exception):
        pipeline.clear()
