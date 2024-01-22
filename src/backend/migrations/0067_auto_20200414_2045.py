# Generated by Django 2.0.3 on 2020-04-14 20:45

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0066_exam_service'),
    ]

    operations = [
        migrations.AddField(
            model_name='organ',
            name='organ_type',
            field=models.CharField(choices=[(1, 'Órgano por sí solo'), (2, 'Conjunto de órganos')], default=1, max_length=1),
        ),
        migrations.AlterField(
            model_name='exam',
            name='service',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.Service', verbose_name='Tipo de Servicio'),
        ),
    ]
