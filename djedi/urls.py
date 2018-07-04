import django

from .compat import include, patterns

app_name = 'djedi'

if django.VERSION < (2, 0):
    urlpatterns = patterns(
        '',
        (r'^', include('djedi.admin.urls', namespace='djedi')),
    )
else:
    from django.urls import path
    urlpatterns = patterns(
        path('', include('djedi.admin.urls', namespace='djedi')),
    )
