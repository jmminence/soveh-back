# Generated by Django 2.1.15 on 2021-08-24 13:30

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0127_auto_20210810_1258'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sampleexams',
            name='unit_organ',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='backend.OrganUnit'),
        ),
    ]
