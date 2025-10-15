from django.db import migrations, connection
from django.apps import apps as django_apps


def add_keywords_column(apps, schema_editor):
    # This is a no-op migration since the column should already exist in the initial migration
    pass


def remove_keywords_column(apps, schema_editor):
    # This is a no-op migration since we don't need to remove the column
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_fix_missing_notification_type_column'),
    ]

    operations = [
        migrations.RunPython(add_keywords_column, remove_keywords_column),
    ]