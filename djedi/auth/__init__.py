def has_permission(user):
    if user:
        if user.is_superuser:
            return True

        if user.is_staff and user.groups.filter(name__iexact='djedi').exists():
            return True

        if user.has_module_perms('djedi'):
            return True
    return False


def get_username(user):
    if hasattr(user, 'get_username'):
        return user.get_username()
    else:
        return user.username
