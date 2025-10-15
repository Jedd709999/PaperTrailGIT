from django.db import migrations, connection
from django.apps import apps as django_apps


def create_status_history_table_if_missing(apps, schema_editor):
    # This is a no-op migration since the table should already exist in the initial migration
    pass


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_add_notification_thesis_fk_if_missing'),
    ]

    operations = [
        migrations.RunPython(create_status_history_table_if_missing, noop),
    ]
