# Generated by Django 3.2.7 on 2024-01-19 17:54

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0165_watersource_type_of_water'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnalysisOptionalResult',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('analysis', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.analysisform', verbose_name='analysis')),
                ('result', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.result', verbose_name='result')),
            ],
        ),
    ]
