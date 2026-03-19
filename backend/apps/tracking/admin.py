from django.contrib import admin

from .models import Project, ProjectAdvancedData, Task


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "created_by", "created_at")
    search_fields = ("name",)
    list_filter = ("status",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "priority", "assignee", "due_date")
    search_fields = ("title", "description")
    list_filter = ("status", "priority", "project")


@admin.register(ProjectAdvancedData)
class ProjectAdvancedDataAdmin(admin.ModelAdmin):
    list_display = ("project", "updated_by", "updated_at")
    search_fields = ("project__name",)
