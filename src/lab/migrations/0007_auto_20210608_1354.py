# Generated by Django 2.1.15 on 2021-06-08 13:54

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0118_auto_20210506_1124'),
        ('lab', '0006_auto_20210608_1051'),
    ]

    operations = [
        migrations.AlterModelManagers(
            name='processitem',
            managers=[
            ],
        ),
        migrations.AddField(
            model_name='processitem',
            name='unit',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='backend.Unit'),
            preserve_default=False,
        ),
    ]
