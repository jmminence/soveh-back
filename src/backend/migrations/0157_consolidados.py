# Generated by Django 3.2.7 on 2023-02-23 17:25

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0156_Analysis_exam_deadline'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnalysisSampleExmanResult',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(blank=True, null=True)),
                ('analysis', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.analysisform', verbose_name='analysis')),
            ],
        ),
        migrations.CreateModel(
            name='Result',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, max_length=250, null=True, verbose_name='name')),
            ],
        ),
        migrations.CreateModel(
            name='ResultOrgan',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('organ', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.organ', verbose_name='organ')),
                ('result', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.result', verbose_name='result')),
            ],
        ),
        migrations.CreateModel(
            name='TypeResult',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, max_length=250, null=True, verbose_name='name')),
            ],
        ),
        migrations.CreateModel(
            name='SampleExamResult',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.IntegerField(blank=True, null=True)),
                ('distribution', models.CharField(blank=True, max_length=250, null=True, verbose_name='distribution')),
                ('analysis', models.ManyToManyField(through='backend.AnalysisSampleExmanResult', to='backend.AnalysisForm')),
                ('result_organ', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.resultorgan')),
                ('sample_exam', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.sampleexams')),
            ],
        ),
        migrations.AddField(
            model_name='result',
            name='organ',
            field=models.ManyToManyField(through='backend.ResultOrgan', to='backend.Organ'),
        ),
        migrations.AddField(
            model_name='result',
            name='type_result',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.typeresult', verbose_name='type_result'),
        ),
        migrations.AddField(
            model_name='analysissampleexmanresult',
            name='sample_exam_result',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.sampleexamresult'),
        ),
    ]
