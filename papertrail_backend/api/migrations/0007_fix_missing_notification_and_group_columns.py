from django.db import migrations, connection
from django.apps import apps as django_apps


def ensure_notification_columns(apps, schema_editor):
    # This is a no-op migration since the columns should already exist in the initial migration
    pass


def ensure_thesistopic_group_column(apps, schema_editor):
    # This is a no-op migration since the column should already exist in the initial migration
    pass


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_add_submitted_and_approved_dates_if_missing'),
    ]

    operations = [
        migrations.RunPython(ensure_notification_columns, noop),
        migrations.RunPython(ensure_thesistopic_group_column, noop),
    ]
