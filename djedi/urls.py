from django.urls import path

from .compat import include, patterns

app_name = "djedi"


urlpatterns = patterns(
    path("", include("djedi.admin.urls", namespace="djedi")),
)
