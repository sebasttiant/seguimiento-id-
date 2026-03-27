from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdminEditorOrReadOnly

from .models import Project, ProjectAdvancedData, Task
from .serializers import (
    AdvancedModulesSerializer,
    ChangesSerializer,
    ClientBriefSerializer,
    MAX_REFERENCE_IMAGES_COUNT,
    PreBriefSerializer,
    ProjectSerializer,
    QualityRegSerializer,
    ensure_reference_image_id,
    extract_reference_images,
    reference_image_metadata,
    SamplesSerializer,
    TaskSerializer,
    TechSpecsSerializer,
    with_reference_images,
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

    @staticmethod
    def _normalize_incoming_module_reference_images(module_data, existing_module, append_mode=False):
        if not isinstance(module_data, dict):
            return module_data

        has_reference_fields = "referenceImage" in module_data or "referenceImages" in module_data
        if not has_reference_fields:
            return module_data

        existing_images = extract_reference_images(existing_module)
        existing_by_id = {
            image.get("id"): image for image in existing_images if isinstance(image, dict) and image.get("id")
        }

        incoming_images = extract_reference_images(module_data)

        if append_mode:
            merged_images = [
                ensure_reference_image_id(image)
                for image in existing_images
                if isinstance(image, dict)
            ]
            merged_index_by_id = {
                image.get("id"): index
                for index, image in enumerate(merged_images)
                if isinstance(image, dict) and image.get("id")
            }

            for image_data in incoming_images:
                normalized_image = ensure_reference_image_id(image_data)
                if "contentBase64" not in normalized_image:
                    existing_image = existing_by_id.get(normalized_image.get("id"))
                    if isinstance(existing_image, dict) and existing_image.get("contentBase64"):
                        normalized_image = {
                            **normalized_image,
                            "contentBase64": existing_image["contentBase64"],
                        }

                image_id = normalized_image.get("id")
                existing_index = merged_index_by_id.get(image_id)
                if existing_index is not None:
                    merged_images[existing_index] = {
                        **merged_images[existing_index],
                        **normalized_image,
                    }
                    continue

                if len(merged_images) >= MAX_REFERENCE_IMAGES_COUNT:
                    continue

                merged_index_by_id[image_id] = len(merged_images)
                merged_images.append(normalized_image)

            return with_reference_images(module_data, merged_images)

        normalized_images = []
        for index, image_data in enumerate(incoming_images):
            fallback_id = ""
            if index < len(existing_images) and isinstance(existing_images[index], dict):
                fallback_id = existing_images[index].get("id") or ""

            normalized_image = ensure_reference_image_id(image_data, fallback_id=fallback_id)
            if "contentBase64" not in normalized_image:
                existing_image = existing_by_id.get(normalized_image.get("id"))
                if isinstance(existing_image, dict) and existing_image.get("contentBase64"):
                    normalized_image = {
                        **normalized_image,
                        "contentBase64": existing_image["contentBase64"],
                    }

            normalized_images.append(normalized_image)

        return with_reference_images(module_data, normalized_images)

    @classmethod
    def _inherit_client_brief_images_on_qualified_transition(cls, incoming_data, advanced_data):
        if not isinstance(incoming_data, dict):
            return incoming_data

        client_brief = incoming_data.get("clientBrief")
        if not isinstance(client_brief, dict):
            return incoming_data

        incoming_status = str(client_brief.get("leadStatus") or "").upper()
        current_client_brief = getattr(advanced_data, "client_brief", {}) or {}
        current_status = str(current_client_brief.get("leadStatus") or "PENDIENTE").upper()
        is_calificado_transition = incoming_status == "CALIFICADO" and current_status != "CALIFICADO"
        if not is_calificado_transition:
            return incoming_data

        incoming_client_images = extract_reference_images(client_brief)
        if incoming_client_images:
            return incoming_data

        pre_brief_source = incoming_data.get("preBrief")
        if not isinstance(pre_brief_source, dict):
            pre_brief_source = getattr(advanced_data, "pre_brief", {}) or {}

        inherited_images = extract_reference_images(pre_brief_source)
        if not inherited_images:
            return incoming_data

        next_client_brief = with_reference_images(client_brief, inherited_images)
        return {
            **incoming_data,
            "clientBrief": next_client_brief,
        }

    @classmethod
    def _inherit_client_module_images_on_qualified_transition(cls, incoming_data, advanced_data):
        if not isinstance(incoming_data, dict):
            return incoming_data

        incoming_status = str(incoming_data.get("leadStatus") or "").upper()
        current_client_brief = getattr(advanced_data, "client_brief", {}) or {}
        current_status = str(current_client_brief.get("leadStatus") or "PENDIENTE").upper()
        is_calificado_transition = incoming_status == "CALIFICADO" and current_status != "CALIFICADO"
        if not is_calificado_transition:
            return incoming_data

        incoming_client_images = extract_reference_images(incoming_data)
        if incoming_client_images:
            return incoming_data

        pre_brief_source = getattr(advanced_data, "pre_brief", {}) or {}
        inherited_images = extract_reference_images(pre_brief_source)
        if not inherited_images:
            return incoming_data

        return with_reference_images(incoming_data, inherited_images)

    @classmethod
    def _normalize_incoming_reference_images(cls, incoming_data, advanced_data):
        result = {**incoming_data}
        for camel_key, db_field in [("preBrief", "pre_brief"), ("clientBrief", "client_brief")]:
            if camel_key not in result:
                continue
            module_data = result.get(camel_key)
            existing_module = getattr(advanced_data, db_field) or {}
            result[camel_key] = cls._normalize_incoming_module_reference_images(
                module_data,
                existing_module,
                append_mode=db_field == "pre_brief",
            )

        return cls._inherit_client_brief_images_on_qualified_transition(result, advanced_data)

    @staticmethod
    def _normalize_quality_reg_aliases(module_data):
        if not isinstance(module_data, dict):
            return module_data

        normalized = {**module_data}
        legacy_map = {
            "docsChamber": "chamberOfCommerceFiles",
            "docsRUT": "rutFiles",
            "docsLabelArt": "labelProjectFiles",
            "docsTechSheet": "technicalSheetsFiles",
            "transportTests": "transportTests",
            "packaging": "packagingCharacteristics",
        }

        for legacy_key, canonical_key in legacy_map.items():
            if canonical_key in normalized:
                continue
            if legacy_key in normalized:
                normalized[canonical_key] = normalized.get(legacy_key)

        return normalized

    @action(detail=True, methods=["get", "patch"], url_path="advanced-modules")
    def advanced_modules(self, request, pk=None):
        project = self.get_object()
        advanced_data = self._get_advanced_data(project)

        if request.method == "GET":
            serializer = AdvancedModulesSerializer(advanced_data)
            return Response(without_reference_image_content(serializer.data))

        incoming_data = request.data
        if isinstance(incoming_data, dict):
            incoming_data = self._normalize_incoming_reference_images(incoming_data, advanced_data)
            if isinstance(incoming_data.get("qualityReg"), dict):
                incoming_data = {
                    **incoming_data,
                    "qualityReg": self._normalize_quality_reg_aliases(incoming_data.get("qualityReg")),
                }

        serializer = AdvancedModulesSerializer(
            advanced_data,
            data=incoming_data,
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

        incoming = request.data
        if isinstance(incoming, dict):
            existing_module = getattr(advanced_data, field_name) or {}
            if field_name == "quality_reg":
                incoming = self._normalize_quality_reg_aliases(incoming)
            incoming = self._normalize_incoming_module_reference_images(
                incoming,
                existing_module,
                append_mode=field_name == "pre_brief",
            )
            if field_name == "client_brief":
                incoming = self._inherit_client_module_images_on_qualified_transition(incoming, advanced_data)

        serializer = serializer_class(data=incoming, partial=request.method == "PATCH")
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
        images = extract_reference_images(module_payload)
        if not images:
            return Response({"detail": "Reference image not found."}, status=status.HTTP_404_NOT_FOUND)

        image_id = (request.query_params.get("imageId") or "").strip()
        image_payload = None
        if image_id:
            image_payload = next(
                (
                    image
                    for image in images
                    if isinstance(image, dict) and str(image.get("id") or "").strip() == image_id
                ),
                None,
            )
            if image_payload is None:
                return Response({"detail": "Reference image not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            image_payload = images[0]

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
