from django.conf.urls import include
from django.urls import path

app_name = "djedi"


urlpatterns = [path("", include("djedi.admin.urls", namespace="djedi"))]
