# Generated by Django 3.2.7 on 2022-01-31 16:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0146_alter_analysisform_currency'),
    ]

    operations = [
        migrations.AddField(
            model_name='specie',
            name='category',
            field=models.CharField(blank=True, max_length=120, null=True, verbose_name='categoria'),
        ),
    ]
