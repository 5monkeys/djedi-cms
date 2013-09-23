from django.db import models


class Node(models.Model):

    key = models.CharField(max_length=255, db_index=True)
    content = models.TextField(blank=True)
    plugin = models.CharField(max_length=8)
    version = models.CharField(max_length=255)
    is_published = models.BooleanField(default=False, blank=True)
    meta = models.TextField(blank=True, null=True)
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = u'djedi'
        db_table = 'djedi_node'
