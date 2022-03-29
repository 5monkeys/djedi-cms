from django.contrib import admin
from django.shortcuts import render

from ..compat import include, patterns, url

admin.autodiscover()

admin_urls = admin.site.urls

urlpatterns = patterns(
    url(r"^$", lambda r: render(r, "index.html"), name="index"),
    url(r"^adm1n/", admin_urls),
    url(r"^djed1/", include("djedi.urls", namespace="admin")),
)
