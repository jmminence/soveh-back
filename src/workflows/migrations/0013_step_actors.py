# Generated by Django 2.0.3 on 2018-05-15 21:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workflows', '0012_auto_20180515_1547'),
    ]

    operations = [
        migrations.AddField(
            model_name='step',
            name='actors',
            field=models.ManyToManyField(to='workflows.Actor'),
        ),
    ]
