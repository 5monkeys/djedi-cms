from django.template.loaders.cached import Loader
from .templatetags.djedi_tags import DjediNode


class DjediRefresherMixin(object):
    """
    This mixin automatically refreshes each Djedi node for every
    loaded template. Comes very handy in combination with caching template
    loaders (ie `django.template.loaders.cached.Loader`).
    """
    def load_template(self, template_name, template_dirs=None):
        template, origin = super(DjediRefresherMixin, self).load_template(
            template_name, template_dirs)
        djedi_nodes = template.nodelist.get_nodes_by_type(DjediNode)
        map(lambda n: n.reload_node(), djedi_nodes)
        return template, origin


class DjediCachedLoader(DjediRefresherMixin, Loader):
    """
    Standard Django cached template loader with support for Djedi nodes.
    """
    pass
