from django.urls import path

from .compat import include

app_name = "djedi"


urlpatterns = [path("", include("djedi.admin.urls", namespace="djedi"))]
