from django.core.management.base import BaseCommand

from apps.accounts.models import Role


class Command(BaseCommand):
    help = "Bootstraps the five default roles."

    def handle(self, *args, **options):
        created = 0
        for name, description in Role.DEFAULT_ROLES:
            _, was_created = Role.objects.get_or_create(
                name=name, defaults={"description": description}
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Roles ready: {created} new, {Role.objects.count()} total."))
