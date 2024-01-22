# Generated by Django 2.0.3 on 2020-09-04 13:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0089_analysisform_report_code'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailCcTo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.CharField(blank=True, max_length=250, null=True, verbose_name='Correo Electrónico')),
            ],
        ),
        migrations.AddField(
            model_name='emailtemplate',
            name='cc',
            field=models.ManyToManyField(to='backend.EmailCcTo', verbose_name='copias'),
        ),
    ]
