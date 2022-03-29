import django

from .compat import include, patterns, url

app_name = "djedi"

from django.urls import path

urlpatterns = patterns(
    path("", include("djedi.admin.urls", namespace="djedi")),
)
