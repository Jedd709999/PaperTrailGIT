from django.db import migrations, connection
from django.apps import apps as django_apps


def ensure_thesisdocument_columns(apps, schema_editor):
    # This is a no-op migration since the columns should already exist in the initial migration
    pass


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_create_thesis_status_history_if_missing'),
    ]

    operations = [
        migrations.RunPython(ensure_thesisdocument_columns, noop),
    ]
