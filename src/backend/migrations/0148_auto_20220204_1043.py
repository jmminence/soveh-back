# Generated by Django 3.2.7 on 2022-02-04 10:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0147_specie_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisform',
            name='invoice_status',
            field=models.CharField(blank=True, default='NO EMITIDO', max_length=120, null=True),
        ),
        migrations.AddField(
            model_name='analysisform',
            name='process_status',
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
    ]
