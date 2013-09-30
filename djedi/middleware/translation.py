from .admin import DjediAdminMiddleware
from .mixins import TranslationMixin


class DjediTranslationMiddleware(DjediAdminMiddleware, TranslationMixin):

    def process_request(self, request):
        super(DjediTranslationMiddleware, self).process_request(request)
        self.activate_language()
