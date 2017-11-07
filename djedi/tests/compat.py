import django


def cmpt_context(context):
    if django.VERSION >= (1, 8):
        return context

    from django.template import Context
    return Context(context)


__all__ = ['cmpt_context']
