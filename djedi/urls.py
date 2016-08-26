import django

try:
    from django.conf.urls import include, url
    if django.VERSION < (1, 9):
        from django.conf.urls import patterns
except ImportError:
    from django.conf.urls.defaults import patterns, include, url


urls = [
    url(r'^', include('djedi.admin.urls', namespace='djedi', app_name='djedi'))
]

if django.VERSION < (1, 9):
    urlpatterns = patterns('', *urls)
else:
    urlpatterns = urls
