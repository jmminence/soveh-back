# Generated by Django 2.0.3 on 2018-04-13 14:31

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0004_auto_20180413_1035'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='entryform',
            name='flow',
        ),
    ]
