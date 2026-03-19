import uuid
from copy import deepcopy

from django.conf import settings
from django.db import models


class Project(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_projects",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "Todo"
        IN_PROGRESS = "in_progress", "In progress"
        DONE = "done", "Done"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=16, choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(null=True, blank=True)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


DEFAULT_PRE_BRIEF = {
    "validated": False,
    "targetDate": "",
    "clientName": "",
    "nit": "",
    "productName": "",
    "brand": "",
    "contactName": "",
    "contactEmail": "",
    "contactPhone": "",
    "category": "",
    "referenceImage": None,
}

DEFAULT_CLIENT_BRIEF = {
    "clientName": "",
    "nit": "",
    "productName": "",
    "brand": "",
    "contactName": "",
    "contactEmail": "",
    "contactPhone": "",
    "category": "",
    "referenceImage": None,
    "requirements": [],
    "leadStatus": "PENDIENTE",
    "leadBudgetRange": "",
    "leadTargetDate": "",
    "leadNotes": "",
}

DEFAULT_TECH_SPECS = {
    "phMin": None,
    "phMax": None,
    "phCurrent": None,
    "sensoryColor": "",
    "sensoryOdor": "",
    "sensoryTexture": "",
    "requestedIngredients": [],
    "viscosity": None,
    "viscosityUnit": "cP",
    "density": None,
    "densityUnit": "g/mL",
    "torque": None,
    "rpm": None,
    "needleType": "Spindle #1",
}

DEFAULT_SAMPLES = {
    "items": [
        {
            "id": "dev",
            "kind": "dev",
            "title": "Muestra de Desarrollo",
            "batchCode": "",
            "madeAt": "",
            "approvedAt": "",
            "deliveryAt": "",
            "changeLog": [],
            "photos": [],
            "notes": "",
        },
        {
            "id": "approved",
            "kind": "approved",
            "title": "Muestra Aprobada",
            "batchCode": "",
            "madeAt": "",
            "approvedAt": "",
            "deliveryAt": "",
            "changeLog": [],
            "photos": [],
            "notes": "",
        },
    ]
}

DEFAULT_QUALITY_REG = {
    "chamberOfCommerceFiles": [],
    "rutFiles": [],
    "labelProjectFiles": [],
    "technicalSheetsFiles": [],
    "transportTests": "",
    "packagingCharacteristics": "",
}

DEFAULT_CHANGES = {"items": []}


def _copy_default(value):
    return deepcopy(value)


def default_pre_brief():
    return _copy_default(DEFAULT_PRE_BRIEF)


def default_client_brief():
    return _copy_default(DEFAULT_CLIENT_BRIEF)


def default_tech_specs():
    return _copy_default(DEFAULT_TECH_SPECS)


def default_samples():
    return _copy_default(DEFAULT_SAMPLES)


def default_quality_reg():
    return _copy_default(DEFAULT_QUALITY_REG)


def default_changes():
    return _copy_default(DEFAULT_CHANGES)


class ProjectAdvancedData(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="advanced_data")
    pre_brief = models.JSONField(default=default_pre_brief)
    client_brief = models.JSONField(default=default_client_brief)
    tech_specs = models.JSONField(default=default_tech_specs)
    samples = models.JSONField(default=default_samples)
    quality_reg = models.JSONField(default=default_quality_reg)
    changes = models.JSONField(default=default_changes)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_project_advanced_data",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "project advanced data"
        verbose_name_plural = "project advanced data"

    @classmethod
    def default_payload(cls):
        return {
            "pre_brief": _copy_default(DEFAULT_PRE_BRIEF),
            "client_brief": _copy_default(DEFAULT_CLIENT_BRIEF),
            "tech_specs": _copy_default(DEFAULT_TECH_SPECS),
            "samples": _copy_default(DEFAULT_SAMPLES),
            "quality_reg": _copy_default(DEFAULT_QUALITY_REG),
            "changes": _copy_default(DEFAULT_CHANGES),
        }

    def __str__(self) -> str:
        return f"Advanced data for {self.project_id}"
