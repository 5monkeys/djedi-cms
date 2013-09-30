from . import DjediMiddleware
from .mixins import AdminPanelMixin


class DjediAdminMiddleware(DjediMiddleware, AdminPanelMixin):

    def process_response(self, request, response):
        self.inject_admin_panel(request, response)
        return super(DjediAdminMiddleware, self).process_response(request, response)
