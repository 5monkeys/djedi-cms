from django.urls import path

from django.conf.urls import include

app_name = "djedi"


urlpatterns = [path("", include("djedi.admin.urls", namespace="djedi"))]
