from .compat import include, patterns

app_name = 'djedi'

urlpatterns = patterns(
    '',
    (r'^', include('djedi.admin.urls', namespace='djedi')),
)
