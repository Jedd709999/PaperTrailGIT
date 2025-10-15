from django.db import migrations, connection
from django.apps import apps as django_apps


def add_notification_thesis_fk(apps, schema_editor):
    # This is a no-op migration since the column should already exist in the initial migration
    pass


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_fix_missing_notification_and_group_columns'),
    ]

    operations = [
        migrations.RunPython(add_notification_thesis_fk, noop),
    ]