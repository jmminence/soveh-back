# Generated by Django 2.1.15 on 2021-12-01 15:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0134_auto_20211119_1040'),
    ]

    operations = [
        migrations.AddField(
            model_name='exam',
            name='group',
            field=models.CharField(blank=True, max_length=250, null=True, verbose_name='grupo'),
        ),
        migrations.AddField(
            model_name='exam',
            name='group_en',
            field=models.CharField(blank=True, max_length=250, null=True, verbose_name='group'),
        ),
        migrations.AddField(
            model_name='exam',
            name='name_en',
            field=models.CharField(blank=True, max_length=250, null=True, verbose_name='name'),
        ),
    ]
