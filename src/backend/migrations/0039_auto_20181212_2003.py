# Generated by Django 2.0.3 on 2018-12-12 23:03

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0038_sample_entryform'),
    ]

    operations = [
        migrations.RenameField(
            model_name='sample',
            old_name='analysis',
            new_name='exams',
        ),
    ]
