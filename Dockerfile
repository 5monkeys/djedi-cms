FROM python:3.6

# Install system dependencies
RUN apt-get update && apt-get install -y gettext && \
    pip install \
        'Django>=2.2,<2.3' \
        'django-cors-headers<=2.3.0'

# Install Djedi-CMS
COPY . /djedi-cms
RUN pip install \
    'Markdown<=2.4.1' \
    'Pillow<=3.4.2' \
    -e /djedi-cms

WORKDIR /djedi-cms/example

ENTRYPOINT ["python3", "manage.py"]
