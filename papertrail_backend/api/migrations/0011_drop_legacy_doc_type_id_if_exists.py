from django.db import migrations, connection
from django.apps import apps as django_apps


def drop_legacy_doc_type_id(apps, schema_editor):
    # This is a no-op migration since the column should already be handled in the initial migration
    pass


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_ensure_thesisdocument_columns'),
    ]

    operations = [
        migrations.RunPython(drop_legacy_doc_type_id, noop),
    ]
