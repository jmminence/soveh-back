# Generated by Django 3.2.7 on 2023-05-18 15:25

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0157_consolidados'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnalysisReport',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('report_date', models.DateField(blank=True, null=True)),
                ('anamnesis', models.CharField(blank=True, max_length=2000, null=True)),
                ('comment', models.TextField(blank=True, null=True)),
                ('analysis', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.analysisform', verbose_name='analysis')),
            ],
        ),
        migrations.CreateModel(
            name='ReportImages',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('imagen', models.ImageField(blank=True, null=True, upload_to='AnalysisReport')),
                ('index', models.IntegerField(blank=True, null=True)),
                ('size', models.CharField(blank=True, max_length=25, null=True)),
                ('comment', models.CharField(blank=True, max_length=500, null=True)),
                ('analysis_report', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.analysisreport')),
            ],
        ),
    ]
