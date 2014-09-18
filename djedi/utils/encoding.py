import django

if django.VERSION < (1, 5):
    from django.utils.encoding import smart_str, smart_unicode
else:
    from django.utils.encoding import smart_bytes as smart_str, smart_text as smart_unicode

__all__ = ['smart_str', 'smart_unicode']
