# Generated by Django 2.1.15 on 2021-06-10 14:30

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0009_area_userarea'),
    ]

    operations = [
        migrations.AddField(
            model_name='area',
            name='users',
            field=models.ManyToManyField(related_name='areas', through='accounts.UserArea', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='area',
            name='is_deleted',
            field=models.BooleanField(default=False, verbose_name='desactivado'),
        ),
        migrations.AlterField(
            model_name='userarea',
            name='area',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.Area'),
        ),
        migrations.AlterField(
            model_name='userarea',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
    ]
