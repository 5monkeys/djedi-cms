from cio.plugins.base import BasePlugin


class DjediPlugin(BasePlugin):
    def get_editor_context(self, request, **context):
        """
        Returns custom context
        """
        return context
