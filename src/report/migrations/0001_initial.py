# Generated by Django 2.1.15 on 2021-09-22 10:11

from django.db import migrations


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('backend', '0128_auto_20210824_1330'),
    ]

    operations = [
        migrations.CreateModel(
            name='Analysis',
            fields=[
            ],
            options={
                'proxy': True,
                'indexes': [],
            },
            bases=('backend.analysisform',),
        ),
    ]
