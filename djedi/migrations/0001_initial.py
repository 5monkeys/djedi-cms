# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Node',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('key', models.CharField(max_length=255, db_index=True)),
                ('content', models.TextField(blank=True)),
                ('plugin', models.CharField(max_length=8)),
                ('version', models.CharField(max_length=255)),
                ('is_published', models.BooleanField(default=False)),
                ('meta', models.TextField(null=True, blank=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'djedi_node',
            },
            bases=(models.Model,),
        ),
    ]
