def has_permission(request):
    user = request.user
    if user:
        if user.is_superuser:
            return True

        if user.is_staff and user.groups.filter(name__iexact='djedi').exists():
            return True

    return False


def get_username(request):
    user = request.user
    if hasattr(user, 'get_username'):
        return user.get_username()
    else:
        return user.username
