# Generated by Django 3.2.7 on 2024-01-11 16:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0163_preinvoice_pay_person'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='rut',
            field=models.CharField(blank=True, max_length=250, null=True, verbose_name='rut'),
        ),
    ]
