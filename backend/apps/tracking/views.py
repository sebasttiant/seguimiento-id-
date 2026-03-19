from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdminEditorOrReadOnly

from .models import Project, ProjectAdvancedData, Task
from .serializers import (
    AdvancedModulesSerializer,
    ChangesSerializer,
    ClientBriefSerializer,
    PreBriefSerializer,
    ProjectSerializer,
    QualityRegSerializer,
    reference_image_metadata,
    SamplesSerializer,
    TaskSerializer,
    TechSpecsSerializer,
    without_reference_image_content,
)


ADVANCED_MODULE_CONFIG = {
    "prebrief": ("pre_brief", "preBrief", PreBriefSerializer),
    "clientbrief": ("client_brief", "clientBrief", ClientBriefSerializer),
    "techspecs": ("tech_specs", "techSpecs", TechSpecsSerializer),
    "samples": ("samples", "samples", SamplesSerializer),
    "qualityreg": ("quality_reg", "qualityReg", QualityRegSerializer),
    "changes": ("changes", "changes", ChangesSerializer),
}


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related("created_by", "advanced_data").all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAdminEditorOrReadOnly]
    filterset_fields = ["status"]
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "name"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _get_advanced_data(self, project):
        advanced_data, _ = ProjectAdvancedData.objects.get_or_create(
            project=project,
            defaults=ProjectAdvancedData.default_payload(),
        )
        return advanced_data

    @action(detail=True, methods=["get", "patch"], url_path="advanced-modules")
    def advanced_modules(self, request, pk=None):
        project = self.get_object()
        advanced_data = self._get_advanced_data(project)

        if request.method == "GET":
            serializer = AdvancedModulesSerializer(advanced_data)
            return Response(without_reference_image_content(serializer.data))

        serializer = AdvancedModulesSerializer(
            advanced_data,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get", "patch", "put"], url_path=r"advanced-modules/(?P<module_name>[^/.]+)")
    def advanced_module(self, request, pk=None, module_name=None):
        module_key = str(module_name or "").lower()
        config = ADVANCED_MODULE_CONFIG.get(module_key)
        if not config:
            return Response(
                {"detail": f"Unsupported module '{module_name}'."},
                status=status.HTTP_404_NOT_FOUND,
            )

        field_name, response_key, serializer_class = config
        project = self.get_object()
        advanced_data = self._get_advanced_data(project)

        if request.method == "GET":
            return Response({response_key: getattr(advanced_data, field_name)})

        serializer = serializer_class(data=request.data, partial=request.method == "PATCH")
        serializer.is_valid(raise_exception=True)
        setattr(advanced_data, field_name, serializer.validated_data)
        advanced_data.updated_by = request.user
        advanced_data.save(update_fields=[field_name, "updated_by", "updated_at"])
        return Response({response_key: getattr(advanced_data, field_name)})

    @action(
        detail=True,
        methods=["get"],
        url_path=r"advanced-modules/image/(?P<module_name>[^/.]+)",
    )
    def advanced_module_image(self, request, pk=None, module_name=None):
        module_key = str(module_name or "").lower()
        config = ADVANCED_MODULE_CONFIG.get(module_key)
        if not config:
            return Response(
                {"detail": f"Unsupported module '{module_name}'."},
                status=status.HTTP_404_NOT_FOUND,
            )

        field_name, _, _ = config
        if field_name not in {"pre_brief", "client_brief"}:
            return Response(
                {"detail": f"Module '{module_name}' does not support reference image."},
                status=status.HTTP_404_NOT_FOUND,
            )

        project = self.get_object()
        advanced_data = self._get_advanced_data(project)
        module_payload = getattr(advanced_data, field_name) or {}
        image_payload = module_payload.get("referenceImage") if isinstance(module_payload, dict) else None

        if not isinstance(image_payload, dict) or not image_payload.get("contentBase64"):
            return Response({"detail": "Reference image not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "module": module_key,
                "referenceImage": {
                    **reference_image_metadata(image_payload),
                    "contentBase64": image_payload["contentBase64"],
                },
            }
        )


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related("project", "assignee", "created_by").all()
    serializer_class = TaskSerializer
    permission_classes = [IsAdminEditorOrReadOnly]
    filterset_fields = ["status", "priority", "project", "assignee"]
    search_fields = ["title", "description", "project__name"]
    ordering_fields = ["created_at", "updated_at", "due_date", "priority"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
