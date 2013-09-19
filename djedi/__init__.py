# coding=utf-8
VERSION = (1, 0, 0, 'alpha', 2)


def get_version(version=None):
    """Derives a PEP386-compliant version number from VERSION."""
    if version is None:
        version = VERSION
    assert len(version) == 5
    assert version[3] in ('alpha', 'beta', 'rc', 'final')

    # Now build the two parts of the version number:
    # main = X.Y[.Z]
    # sub = .devN - for pre-alpha releases
    #     | {a|b|c}N - for alpha, beta and rc releases

    parts = 2 if version[2] == 0 else 3
    main = '.'.join(str(x) for x in version[:parts])

    sub = ''
    if version[3] != 'final':
        mapping = {'alpha': 'a', 'beta': 'b', 'rc': 'c'}
        sub = mapping[version[3]] + str(version[4])

    return main + sub

__version__ = get_version()


def configure():
    from django.conf import settings as django_settings
    from cio.conf import settings

    # Configure content-io with django settings
    conf = dict(
        ENVIRONMENT={
            'default': {
                'i18n': django_settings.LANGUAGE_CODE,
                'l10n': getattr(django_settings, 'ROOT_URLCONF', 'local').split('.', 1)[0],
                'g11n': 'global'
            }
        },
        CACHE='djedi.backends.django.cache.Backend',
        STORAGE='djedi.backends.django.db.Backend',
        PLUGINS=[
            'cio.plugins.txt.TextPlugin',
            'cio.plugins.md.MarkdownPlugin',
            'djedi.plugins.img.ImagePlugin'
        ],
        THEME='darth'
    )
    conf.update(getattr(django_settings, 'DJEDI', {}))
    settings.configure(conf)
