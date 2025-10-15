from django.core.management.base import BaseCommand
from api.models import ThesisTopic

class Command(BaseCommand):
    help = 'Delete all thesis topics and their associated data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion - required to actually delete records',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'This command will delete ALL thesis topics and their associated data. '
                    'Run with --confirm to actually delete.'
                )
            )
            return

        # Get all thesis topics
        topics = ThesisTopic.objects.all()
        count = topics.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No thesis topics found to delete.'))
            return

        # Delete database records
        deleted_records = topics.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deleted {count} thesis topics.\n'
                f'Deleted {deleted_records[0]} ThesisTopic objects from database.\n'
                f'Also deleted {deleted_records[1].get("api.ThesisStatusHistory", 0)} status history records.\n'
                f'Also deleted {deleted_records[1].get("api.Comment", 0)} comments.\n'
                f'Also deleted {deleted_records[1].get("api.Notification", 0)} notifications.'
            )
        )