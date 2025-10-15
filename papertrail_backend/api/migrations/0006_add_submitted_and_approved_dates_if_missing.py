from django.db import migrations, connection
from django.apps import apps as django_apps


def add_datetime_columns(apps, schema_editor):
    # This is a no-op migration since the columns should already exist in the initial migration
    pass


def remove_datetime_columns(apps, schema_editor):
    # This is a no-op migration since we don't need to remove the columns
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_add_keywords_to_thesistopic_if_missing'),
    ]

    operations = [
        migrations.RunPython(add_datetime_columns, remove_datetime_columns),
    ]
