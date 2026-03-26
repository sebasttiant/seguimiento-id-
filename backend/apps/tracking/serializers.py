import base64
import hashlib
from copy import deepcopy

from django.conf import settings
from rest_framework import serializers

from .models import Project, ProjectAdvancedData, Task


MAX_REFERENCE_IMAGE_SIZE_BYTES = int(getattr(settings, "REFERENCE_IMAGE_MAX_SIZE_BYTES", 5 * 1024 * 1024))
MAX_REFERENCE_IMAGES_COUNT = int(getattr(settings, "REFERENCE_IMAGES_MAX_COUNT", 5))


REFERENCE_IMAGE_METADATA_FIELDS = ["id", "name", "mimeType", "size", "uploadedAt"]


def _normalized_reference_image_text(value):
    return str(value or "").strip()


def _has_reference_image_payload(image_data):
    if not isinstance(image_data, dict):
        return False

    if _normalized_reference_image_text(image_data.get("contentBase64")):
        return True

    for field in ["name", "mimeType", "uploadedAt"]:
        if _normalized_reference_image_text(image_data.get(field)):
            return True

    try:
        return int(image_data.get("size") or 0) > 0
    except (TypeError, ValueError):
        return False


def _build_reference_image_id(image_data):
    payload = {
        "name": _normalized_reference_image_text(image_data.get("name")),
        "mimeType": _normalized_reference_image_text(image_data.get("mimeType")),
        "size": _normalized_reference_image_text(image_data.get("size")),
        "uploadedAt": _normalized_reference_image_text(image_data.get("uploadedAt")),
        "contentBase64": _normalized_reference_image_text(image_data.get("contentBase64")),
    }
    fingerprint = "|".join(payload.values())
    digest = hashlib.sha1(fingerprint.encode("utf-8")).hexdigest()[:16]
    return f"img-{digest}"


def ensure_reference_image_id(image_data, fallback_id=""):
    if not isinstance(image_data, dict):
        return image_data

    current_id = _normalized_reference_image_text(image_data.get("id"))
    if current_id:
        return {**image_data, "id": current_id}

    fallback = _normalized_reference_image_text(fallback_id)
    if fallback:
        return {**image_data, "id": fallback}

    if not _has_reference_image_payload(image_data):
        return image_data

    return {**image_data, "id": _build_reference_image_id(image_data)}


def reference_image_metadata(image_data):
    if not isinstance(image_data, dict):
        return image_data
    normalized = ensure_reference_image_id(image_data)
    return {key: normalized[key] for key in REFERENCE_IMAGE_METADATA_FIELDS if key in normalized}


def extract_reference_images(module_payload):
    if not isinstance(module_payload, dict):
        return []

    source = module_payload.get("referenceImages")
    if isinstance(source, list):
        normalized = [ensure_reference_image_id(item) for item in source if isinstance(item, dict)]
        if normalized:
            return normalized

    single_image = module_payload.get("referenceImage")
    if isinstance(single_image, dict):
        return [ensure_reference_image_id(single_image)]

    return []


def with_reference_images(module_payload, images):
    normalized = [ensure_reference_image_id(item) for item in (images or []) if isinstance(item, dict)]
    result = {**(module_payload or {})}
    result["referenceImages"] = normalized
    result["referenceImage"] = normalized[0] if normalized else None
    return result


def validate_reference_images_count(images):
    total = len(images or [])
    if total > MAX_REFERENCE_IMAGES_COUNT:
        raise serializers.ValidationError(
            {
                "referenceImages": [
                    f"Solo puedes cargar hasta {MAX_REFERENCE_IMAGES_COUNT} imágenes de referencia."
                ]
            }
        )


def without_reference_image_content(modules_payload):
    payload = deepcopy(modules_payload or {})

    pre_brief = payload.get("preBrief")
    if isinstance(pre_brief, dict):
        pre_brief_images = [reference_image_metadata(image) for image in extract_reference_images(pre_brief)]
        pre_brief["referenceImages"] = pre_brief_images
        pre_brief["referenceImage"] = pre_brief_images[0] if pre_brief_images else None

    client_brief = payload.get("clientBrief")
    if isinstance(client_brief, dict):
        client_brief_images = [reference_image_metadata(image) for image in extract_reference_images(client_brief)]
        client_brief["referenceImages"] = client_brief_images
        client_brief["referenceImage"] = client_brief_images[0] if client_brief_images else None

    return payload


class ReferenceImageSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    name = serializers.CharField(max_length=255)
    mimeType = serializers.CharField(max_length=120)
    size = serializers.IntegerField(min_value=1)
    contentBase64 = serializers.CharField()
    uploadedAt = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        attrs = ensure_reference_image_id(attrs)
        uploaded_at = attrs.get("uploadedAt")
        if uploaded_at is not None:
            attrs["uploadedAt"] = uploaded_at.isoformat().replace("+00:00", "Z")
        return attrs

    def to_representation(self, instance):
        """Render legacy/incomplete image payloads without raising KeyError."""
        if not isinstance(instance, dict):
            return super().to_representation(instance)

        size_value = instance.get("size")
        try:
            normalized_size = int(size_value)
        except (TypeError, ValueError):
            normalized_size = 0

        uploaded_at = instance.get("uploadedAt")
        if hasattr(uploaded_at, "isoformat"):
            uploaded_at = uploaded_at.isoformat().replace("+00:00", "Z")

        normalized_instance = ensure_reference_image_id(instance)

        data = {
            "id": str(normalized_instance.get("id") or ""),
            "name": str(instance.get("name") or ""),
            "mimeType": str(instance.get("mimeType") or ""),
            "size": normalized_size,
        }

        if uploaded_at:
            data["uploadedAt"] = uploaded_at

        content_base64 = instance.get("contentBase64")
        if content_base64:
            data["contentBase64"] = str(content_base64)

        return data

    def validate_mimeType(self, value):
        if not str(value).startswith("image/"):
            raise serializers.ValidationError("Solo se permiten imagenes.")
        return value

    def validate_size(self, value):
        if value > MAX_REFERENCE_IMAGE_SIZE_BYTES:
            max_mb = MAX_REFERENCE_IMAGE_SIZE_BYTES / (1024 * 1024)
            raise serializers.ValidationError(f"La imagen no puede superar {max_mb:.1f} MB.")
        return value

    def validate_contentBase64(self, value):
        try:
            decoded = base64.b64decode(value, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise serializers.ValidationError("El contenido base64 es invalido.") from exc

        if len(decoded) > MAX_REFERENCE_IMAGE_SIZE_BYTES:
            max_mb = MAX_REFERENCE_IMAGE_SIZE_BYTES / (1024 * 1024)
            raise serializers.ValidationError(f"La imagen no puede superar {max_mb:.1f} MB.")
        return value


class RequirementSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PreBriefSerializer(serializers.Serializer):
    validated = serializers.BooleanField(required=False, default=False)
    targetDate = serializers.CharField(required=False, allow_blank=True, default="")
    clientName = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    nit = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    productName = serializers.CharField(required=False, allow_blank=True, max_length=200, default="")
    brand = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    contactName = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    contactEmail = serializers.EmailField(required=False, allow_blank=True, default="")
    contactPhone = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    category = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    referenceImage = ReferenceImageSerializer(required=False, allow_null=True, default=None)
    referenceImages = ReferenceImageSerializer(many=True, required=False, default=list)

    def validate(self, attrs):
        has_reference_fields = "referenceImage" in attrs or "referenceImages" in attrs
        if not has_reference_fields:
            return attrs

        images = extract_reference_images(attrs)
        validate_reference_images_count(images)
        return with_reference_images(attrs, images)


class ClientBriefSerializer(serializers.Serializer):
    clientName = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    nit = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    productName = serializers.CharField(required=False, allow_blank=True, max_length=200, default="")
    brand = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    contactName = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    contactEmail = serializers.EmailField(required=False, allow_blank=True, default="")
    contactPhone = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    category = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    referenceImage = ReferenceImageSerializer(required=False, allow_null=True, default=None)
    referenceImages = ReferenceImageSerializer(many=True, required=False, default=list)
    leadStatus = serializers.ChoiceField(
        choices=["PENDIENTE", "CALIFICADO", "DESCARTADO"],
        required=False,
        default="PENDIENTE",
    )
    leadBudgetRange = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    leadTargetDate = serializers.CharField(required=False, allow_blank=True, default="")
    leadNotes = serializers.CharField(required=False, allow_blank=True, default="")
    requirements = RequirementSerializer(many=True, required=False, default=list)

    def validate(self, attrs):
        has_reference_fields = "referenceImage" in attrs or "referenceImages" in attrs
        if not has_reference_fields:
            return attrs

        images = extract_reference_images(attrs)
        validate_reference_images_count(images)
        return with_reference_images(attrs, images)


class TechSpecsSerializer(serializers.Serializer):
    phMin = serializers.FloatField(required=False, allow_null=True, default=None)
    phMax = serializers.FloatField(required=False, allow_null=True, default=None)
    phCurrent = serializers.FloatField(required=False, allow_null=True, default=None)
    sensoryColor = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    sensoryOdor = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    sensoryTexture = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    requestedIngredients = serializers.ListField(
        child=serializers.CharField(max_length=160),
        required=False,
        default=list,
    )
    viscosity = serializers.FloatField(required=False, allow_null=True, default=None)
    viscosityUnit = serializers.ChoiceField(choices=["cP", "mPa·s", "Pa·s"], required=False, default="cP")
    density = serializers.FloatField(required=False, allow_null=True, default=None)
    densityUnit = serializers.ChoiceField(choices=["g/mL", "kg/m³"], required=False, default="g/mL")
    torque = serializers.FloatField(required=False, allow_null=True, default=None)
    rpm = serializers.FloatField(required=False, allow_null=True, default=None)
    needleType = serializers.CharField(required=False, allow_blank=True, max_length=120, default="Spindle #1")

    def validate(self, attrs):
        ph_min = attrs.get("phMin")
        ph_max = attrs.get("phMax")
        if ph_min is not None and ph_max is not None and ph_min > ph_max:
            raise serializers.ValidationError({"phMin": "Debe ser menor o igual que phMax."})
        return attrs


class SampleItemSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=80)
    kind = serializers.ChoiceField(choices=["dev", "extra", "approved", "pilot"], required=False, default="extra")
    title = serializers.CharField(max_length=200)
    batchCode = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    madeAt = serializers.CharField(required=False, allow_blank=True, default="")
    approvedAt = serializers.CharField(required=False, allow_blank=True, default="")
    deliveryAt = serializers.CharField(required=False, allow_blank=True, default="")
    changeLog = serializers.ListField(child=serializers.JSONField(), required=False, default=list)
    photos = serializers.ListField(child=serializers.JSONField(), required=False, default=list)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    parentId = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    parentCode = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    changeSummary = serializers.CharField(required=False, allow_blank=True, default="")
    approvedFromId = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    approvedFromCode = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    approvedFromTitle = serializers.CharField(required=False, allow_blank=True, max_length=200, default="")


class SamplesSerializer(serializers.Serializer):
    items = SampleItemSerializer(many=True, required=False, default=list)


class QualityRegSerializer(serializers.Serializer):
    chamberOfCommerceFiles = serializers.ListField(child=serializers.JSONField(), required=False, default=list)
    rutFiles = serializers.ListField(child=serializers.JSONField(), required=False, default=list)
    labelProjectFiles = serializers.ListField(child=serializers.JSONField(), required=False, default=list)
    technicalSheetsFiles = serializers.ListField(child=serializers.JSONField(), required=False, default=list)
    transportTests = serializers.CharField(required=False, allow_blank=True, default="")
    packagingCharacteristics = serializers.CharField(required=False, allow_blank=True, default="")


class ChangeItemSerializer(serializers.Serializer):
    no = serializers.IntegerField(required=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    date = serializers.CharField(required=False, allow_blank=True, default="")
    owner = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")


class ChangesSerializer(serializers.Serializer):
    items = ChangeItemSerializer(many=True, required=False, default=list)


class AdvancedModulesSerializer(serializers.ModelSerializer):
    preBrief = PreBriefSerializer(source="pre_brief")
    clientBrief = ClientBriefSerializer(source="client_brief")
    techSpecs = TechSpecsSerializer(source="tech_specs")
    samples = SamplesSerializer()
    qualityReg = QualityRegSerializer(source="quality_reg")
    changes = ChangesSerializer()

    class Meta:
        model = ProjectAdvancedData
        fields = [
            "preBrief",
            "clientBrief",
            "techSpecs",
            "samples",
            "qualityReg",
            "changes",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def update(self, instance, validated_data):
        for model_key in ["pre_brief", "client_brief", "tech_specs", "samples", "quality_reg", "changes"]:
            if model_key in validated_data:
                incoming = validated_data[model_key]
                current = getattr(instance, model_key)
                if isinstance(current, dict) and isinstance(incoming, dict):
                    setattr(instance, model_key, {**current, **incoming})
                else:
                    setattr(instance, model_key, incoming)
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            instance.updated_by = request.user
        instance.save()
        return instance


class ProjectSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    advanced_modules = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "consecutive",
            "name",
            "description",
            "status",
            "created_by",
            "advanced_modules",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "consecutive", "created_by", "created_at", "updated_at"]

    def get_advanced_modules(self, obj):
        advanced_data = getattr(obj, "advanced_data", None)
        if advanced_data:
            return without_reference_image_content(AdvancedModulesSerializer(advanced_data).data)

        defaults = ProjectAdvancedData.default_payload()
        return {
            "preBrief": defaults["pre_brief"],
            "clientBrief": defaults["client_brief"],
            "techSpecs": defaults["tech_specs"],
            "samples": defaults["samples"],
            "qualityReg": defaults["quality_reg"],
            "changes": defaults["changes"],
        }


class TaskSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "assignee",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]
