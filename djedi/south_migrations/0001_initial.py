# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'Node'
        db.create_table('djedi_node', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('key', self.gf('django.db.models.fields.CharField')(max_length=255, db_index=True)),
            ('content', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('plugin', self.gf('django.db.models.fields.CharField')(max_length=8)),
            ('version', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('is_published', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('meta', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('date_created', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
        ))
        db.send_create_signal(u'djedi', ['Node'])


    def backwards(self, orm):
        # Deleting model 'Node'
        db.delete_table('djedi_node')


    models = {
        u'djedi.node': {
            'Meta': {'object_name': 'Node'},
            'content': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'date_created': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_published': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'key': ('django.db.models.fields.CharField', [], {'max_length': '255', 'db_index': 'True'}),
            'meta': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'plugin': ('django.db.models.fields.CharField', [], {'max_length': '8'}),
            'version': ('django.db.models.fields.CharField', [], {'max_length': '255'})
        }
    }

    complete_apps = ['djedi']