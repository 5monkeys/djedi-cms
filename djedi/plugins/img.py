import json
import six
from django.utils.html import escape
from cio.plugins.base import BasePlugin
from django.core.files.uploadedfile import InMemoryUploadedFile
from hashlib import sha1
from os import path


class ImagePluginBase(BasePlugin):

    ext = 'img'

    def _open(self, filename):
        raise NotImplementedError

    def _save(self, filename, bytes):
        raise NotImplementedError

    def _url(self, filename):
        raise NotImplementedError

    def _create_filename(self, filename, **kwargs):
        name, ext = path.splitext(filename)
        dir, name = name.rsplit(path.sep, 1)
        name += ''.join(sorted(key + str(value) for key, value in six.iteritems(kwargs)))

        if six.PY3:
            name = name.encode('utf-8')

        name = sha1(name).hexdigest()
        subdir = name[:2]
        return path.sep.join((dir, subdir, name + ext))

    def load(self, content):
        if content:
            data = json.loads(content)

            # Add image url to loaded data
            filename = data.get('filename', None)
            if filename:
                data['url'] = self._url(filename)

            return data
        else:
            return {'filename': None, 'url': None}

    def save(self, data):
        from PIL import Image
        width = int(data.get('width') or 0)
        height = int(data.get('height') or 0)

        file = None
        upload = data.get('file')
        filename = data.get('filename')

        if upload:
            image = Image.open(upload)
            filename = path.sep.join(('djedi', 'img', upload.name))
            filename = self._create_filename(filename, w=width, h=height)
        elif filename:
            file = self._open(filename)
            image = Image.open(file)
        else:
            image = None

        if image:
            # Remember original image format before processing
            format = image.format

            # Crop
            crop = data.get('crop')
            if crop:
                try:
                    box = tuple(int(x) for x in crop.split(','))
                    image = image.crop(box)
                except Exception:
                    pass  # TODO: Handle image crop error
                else:
                    filename = self._create_filename(filename, crop=crop)

            # Resize
            i_width, i_height = image.size
            if (width and width != i_width) or (height and height != i_height):
                try:
                    image = image.resize((width, height), Image.ANTIALIAS)
                except Exception:
                    pass
                else:
                    filename = self._create_filename(filename, w=width, h=height)
            else:
                width = i_width
                height = i_height

            # Write file
            if filename != data.get('filename'):
                new_file = six.BytesIO()
                image.save(new_file, format)
                filename = self._save(filename, new_file)

        if file:
            file.close()

        content = {
            'filename': filename,
            'width': width,
            'height': height,
            'id': data.get('id') or None,
            'class': data.get('class') or None,
            'alt': data.get('alt') or None
        }

        return json.dumps(content)

    def delete(self, data):
        raise NotImplementedError

    def render(self, data):
        attrs = {
            # Use a data URI so that the image works without hassle even if the
            # Djedi backend and frontend run on different domains. The base64
            # part was made by running:
            # $ svgo djedi/static/djedi/placeholder.svg -o - | openssl base64 | tr -d '\n'
            # 'src': '/static/djedi/placeholder.svg',
            'src': 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTYwIDkwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIG9wYWNpdHk9Ii4yNSIgZmlsbD0iIzIwYjJhYSIgZD0iTTAgMGgxNjB2OTBIMHoiLz48L3N2Zz4K',  # noqa: E501
            'width': 160,
            'height': 90
        }
        if data:
            url = data.get('url')
            width = data.get('width') or 0
            height = data.get('height') or 0
            alt = data.get('alt') or ''
            tag_id = data.get('id')
            tag_class = data.get('class')
            if url:
                attrs['src'] = url
            attrs['alt'] = alt
            if width and height:
                attrs['width'] = width
                attrs['height'] = height
            if tag_id:
                attrs['id'] = tag_id
            if tag_class:
                attrs['class'] = tag_class

        html_attrs = (u'{0}="{1}"'.format(attr, escape(attrs[attr])) for attr in sorted(attrs.keys()))
        return u'<img {0} />'.format(u' '.join(html_attrs))


class ImagePlugin(ImagePluginBase):
    """
    Image plugin extending abstract content-io image plugin to use django file storage.
    """
    @property
    def _file_storage(self):
        # Get configured file storage from settings
        file_storage = self.settings.get('FILE_STORAGE')

        # Fallback on default file storage
        if not file_storage:
            from django.core.files.storage import default_storage as file_storage

        return file_storage

    def _open(self, filename):
        return self._file_storage.open(filename)

    def _save(self, filename, bytes):
        content = InMemoryUploadedFile(bytes, None, filename, None, None, None)
        return self._file_storage.save(filename, content)

    def _url(self, filename):
        return self._file_storage.url(filename)
