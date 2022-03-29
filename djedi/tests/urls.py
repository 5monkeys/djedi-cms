from django.contrib import admin
from django.shortcuts import render

from django.conf.urls import include, url

admin.autodiscover()

urlpatterns = [
    url(r"^$", lambda r: render(r, "index.html"), name="index"),
    url(r"^adm1n/", admin.site.urls),
    url(r"^djed1/", include("djedi.urls", namespace="admin")),
]
