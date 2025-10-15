from django.core.management.base import BaseCommand
from ...models import ThesisTopic

class Command(BaseCommand):
    help = 'Update thesis topics to set adviser field based on group adviser'

    def handle(self, *args, **options):
        # Get all theses that have a group but don't have an adviser set
        theses = ThesisTopic.objects.filter(group__isnull=False, adviser__isnull=True)
        
        updated_count = 0
        for thesis in theses:
            if thesis.group.adviser:
                thesis.adviser = thesis.group.adviser
                thesis.save()
                updated_count += 1
                self.stdout.write(f"Updated thesis '{thesis.title}' with adviser '{thesis.group.adviser.username}'")
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {updated_count} theses with adviser information'
            )
        )