import django


def cmpt_context(context):
    if django.VERSION >= (1, 8):
        return context

    from django.template import Context
    return Context(context)


if django.VERSION < (1, 8):
    from django.template.loader import get_template_from_string
else:
    # Django 1.8+ has multiple template engines, we only test Django's for now.
    from django.template import engines

    def get_template_from_string(template_code):
        return engines['django'].from_string(template_code)


__all__ = ['cmpt_context', 'get_template_from_string']
