from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tracking", "0002_projectadvanceddata"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectConsecutiveCounter",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.PositiveSmallIntegerField(unique=True)),
                ("last_value", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "project consecutive counter",
                "verbose_name_plural": "project consecutive counters",
            },
        ),
        migrations.AddField(
            model_name="project",
            name="consecutive",
            field=models.CharField(blank=True, max_length=16, null=True, unique=True),
        ),
    ]
