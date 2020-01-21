from cio.plugins.base import BasePlugin


class DjediPlugin(BasePlugin):
    def get_editor_context(self, **kwargs):
        """
        Returns custom context
        """
        return kwargs
