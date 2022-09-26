from django.contrib import admin
from django.shortcuts import render
from django.urls import include, re_path

admin.autodiscover()

urlpatterns = [
    re_path(r"^$", lambda r: render(r, "index.html"), name="index"),
    re_path(r"^adm1n/", admin.site.urls),
    re_path(r"^djed1/", include("djedi.urls", namespace="admin")),
]
