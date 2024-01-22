# Generated by Django 2.1.15 on 2021-07-07 13:29

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0124_auto_20210702_1152'),
        ('lab', '0020_auto_20210705_1332'),
    ]

    operations = [
        migrations.CreateModel(
            name='TreeProcess',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('exam', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='backend.Exam')),
            ],
        ),
    ]
