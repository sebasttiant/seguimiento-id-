from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create demo users for admin, editor and viewer roles"

    def handle(self, *args, **options):
        demo_users = [
            {
                "username": "admin",
                "email": "admin@crm.local",
                "password": "Admin123!",
                "first_name": "Ana",
                "last_name": "Admin",
                "role": "admin",
                "is_staff": True,
            },
            {
                "username": "editor",
                "email": "editor@crm.local",
                "password": "Editor123!",
                "first_name": "Ema",
                "last_name": "Editor",
                "role": "editor",
                "is_staff": False,
            },
            {
                "username": "viewer",
                "email": "viewer@crm.local",
                "password": "Viewer123!",
                "first_name": "Vero",
                "last_name": "Viewer",
                "role": "viewer",
                "is_staff": False,
            },
        ]

        for payload in demo_users:
            username = payload["username"]
            email = payload["email"]

            user = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()
            if user:
                user.username = username
                user.email = email
                user.first_name = payload["first_name"]
                user.last_name = payload["last_name"]
                user.role = payload["role"]
                user.is_staff = payload["is_staff"]
                user.is_active = True
                user.set_password(payload["password"])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Updated {username}"))
                continue

            User.objects.create_user(
                username=username,
                email=email,
                password=payload["password"],
                first_name=payload["first_name"],
                last_name=payload["last_name"],
                role=payload["role"],
                is_staff=payload["is_staff"],
            )
            self.stdout.write(self.style.SUCCESS(f"Created {username}"))
