# Generated by Django 2.1.15 on 2021-07-02 11:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lab', '0016_auto_20210629_1056'),
    ]

    operations = [
        migrations.AddField(
            model_name='caseprocess',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
