from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import apps.tracking.models


class Migration(migrations.Migration):
    dependencies = [
        ("tracking", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectAdvancedData",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("pre_brief", models.JSONField(default=apps.tracking.models.default_pre_brief)),
                ("client_brief", models.JSONField(default=apps.tracking.models.default_client_brief)),
                ("tech_specs", models.JSONField(default=apps.tracking.models.default_tech_specs)),
                ("samples", models.JSONField(default=apps.tracking.models.default_samples)),
                ("quality_reg", models.JSONField(default=apps.tracking.models.default_quality_reg)),
                ("changes", models.JSONField(default=apps.tracking.models.default_changes)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "project",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="advanced_data", to="tracking.project"),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_project_advanced_data",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "project advanced data",
                "verbose_name_plural": "project advanced data",
            },
        ),
    ]
