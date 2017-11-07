import logging

_log = logging.getLogger(__name__)


def has_permission(request):
    user = getattr(request, 'user', None)
    if user:
        if user.is_superuser:
            return True

        if user.is_staff and user.groups.filter(name__iexact='djedi').exists():
            return True
    else:
        _log.warning("Request does not have `user` attribute. Make sure that "
                     "Djedi middleware is used after AuthenticationMiddleware")

    return False


def get_username(request):
    user = request.user
    if hasattr(user, 'get_username'):
        return user.get_username()
    else:
        return user.username
