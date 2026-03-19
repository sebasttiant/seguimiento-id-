from django.db import migrations, models


def populate_usernames(apps, schema_editor):
    User = apps.get_model("users", "User")

    used = set()
    for user in User.objects.all().order_by("date_joined", "id"):
        base = (user.email or "user").split("@", 1)[0].strip().lower() or "user"
        candidate = base
        suffix = 1
        while candidate in used:
            suffix += 1
            candidate = f"{base}{suffix}"

        user.username = candidate
        user.save(update_fields=["username"])
        used.add(candidate)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="username",
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.RunPython(populate_usernames, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="username",
            field=models.CharField(max_length=150, unique=True),
        ),
    ]
