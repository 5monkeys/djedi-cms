def has_permission(user):
    if user:
        if user.is_superuser:
            return True

        if user.is_staff and user.groups.filter(name__iexact='djedi').exists():
            return True

    return False
