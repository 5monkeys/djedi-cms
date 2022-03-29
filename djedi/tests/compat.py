# Django 1.8+ has multiple template engines, we only test Django's for now.
from django.template import engines


def cmpt_context(context):
    return context


def get_template_from_string(template_code):
    return engines["django"].from_string(template_code)


__all__ = ["cmpt_context", "get_template_from_string"]
