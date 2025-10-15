from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import ThesisDocument
import os
import shutil

class Command(BaseCommand):
    help = 'Delete all thesis documents and their associated files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion - required to actually delete files',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'This command will delete ALL thesis documents and their files. '
                    'Run with --confirm to actually delete.'
                )
            )
            return

        # Get all thesis documents
        documents = ThesisDocument.objects.all()
        count = documents.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No thesis documents found to delete.'))
            return

        # Delete files first
        deleted_files = 0
        failed_files = 0
        
        for document in documents:
            try:
                if document.file and os.path.isfile(document.file.path):
                    os.remove(document.file.path)
                    deleted_files += 1
                    self.stdout.write(f'Deleted file: {document.file.path}')
                else:
                    self.stdout.write(f'File not found or already deleted: {document.file}')
            except Exception as e:
                failed_files += 1
                self.stdout.write(
                    self.style.ERROR(f'Failed to delete file {document.file}: {str(e)}')
                )

        # Delete database records
        deleted_records = documents.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deleted {deleted_files} files and {count} database records.\n'
                f'Failed to delete {failed_files} files.\n'
                f'Deleted {deleted_records[0]} ThesisDocument objects from database.'
            )
        )