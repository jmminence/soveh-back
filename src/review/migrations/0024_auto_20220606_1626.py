# Generated by Django 3.2.7 on 2022-06-06 16:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('review', '0023_blindcarboncopy'),
    ]

    operations = [
        migrations.AddField(
            model_name='grouper',
            name='subclass',
            field=models.CharField(blank=True, max_length=30, null=True, verbose_name='subclase'),
        ),
        migrations.AddField(
            model_name='grouper',
            name='subclass_abbreviation',
            field=models.CharField(blank=True, max_length=5, null=True),
        ),
    ]
