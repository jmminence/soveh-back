# Generated by Django 3.2.7 on 2023-06-29 15:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0158_automatic_report'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisreport',
            name='correlative',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
