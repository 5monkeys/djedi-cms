from django.urls import include, path

app_name = "djedi"


urlpatterns = [path("", include("djedi.admin.urls", namespace="djedi"))]
