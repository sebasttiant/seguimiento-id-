import re

from django.db import migrations, models


CONSECUTIVE_PATTERN = re.compile(r"^(\d{4})-(\d{4})$")


def backfill_project_consecutives(apps, schema_editor):
    Project = apps.get_model("tracking", "Project")
    ProjectConsecutiveCounter = apps.get_model("tracking", "ProjectConsecutiveCounter")

    projects = list(Project.objects.all().order_by("created_at", "id"))
    counters_by_year = {}
    used_by_year = {}
    retained_project_ids = set()
    to_update = []

    for project in projects:
        raw_value = str(project.consecutive or "").strip()
        match = CONSECUTIVE_PATTERN.match(raw_value)
        if not match:
            continue

        sequence = int(match.group(1))
        year = int(match.group(2))
        used_year = used_by_year.setdefault(year, set())
        if raw_value in used_year:
            continue
        used_year.add(raw_value)
        retained_project_ids.add(project.id)
        counters_by_year[year] = max(counters_by_year.get(year, 0), sequence)

    for project in projects:
        if project.id in retained_project_ids:
            continue

        year = project.created_at.year if project.created_at else 0
        next_sequence = counters_by_year.get(year, 0) + 1
        counters_by_year[year] = next_sequence
        new_value = f"{next_sequence:04d}-{year}"
        used_by_year.setdefault(year, set()).add(new_value)

        project.consecutive = new_value
        to_update.append(project)

    if to_update:
        Project.objects.bulk_update(to_update, ["consecutive"])

    for year, last_value in counters_by_year.items():
        ProjectConsecutiveCounter.objects.update_or_create(
            year=year,
            defaults={"last_value": last_value},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("tracking", "0003_project_consecutive"),
    ]

    operations = [
        migrations.RunPython(backfill_project_consecutives, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="project",
            name="consecutive",
            field=models.CharField(max_length=16, unique=True),
        ),
    ]
