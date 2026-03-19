from rest_framework import serializers

from .models import Project, ProjectAdvancedData, Task


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
    referenceImage = serializers.JSONField(required=False, allow_null=True, default=None)


class ClientBriefSerializer(serializers.Serializer):
    clientName = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    nit = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    productName = serializers.CharField(required=False, allow_blank=True, max_length=200, default="")
    brand = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    contactName = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    contactEmail = serializers.EmailField(required=False, allow_blank=True, default="")
    contactPhone = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    category = serializers.CharField(required=False, allow_blank=True, max_length=80, default="")
    referenceImage = serializers.JSONField(required=False, allow_null=True, default=None)
    leadStatus = serializers.ChoiceField(
        choices=["PENDIENTE", "CALIFICADO", "DESCARTADO"],
        required=False,
        default="PENDIENTE",
    )
    leadBudgetRange = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    leadTargetDate = serializers.CharField(required=False, allow_blank=True, default="")
    leadNotes = serializers.CharField(required=False, allow_blank=True, default="")
    requirements = RequirementSerializer(many=True, required=False, default=list)


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
                setattr(instance, model_key, validated_data[model_key])
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
            return AdvancedModulesSerializer(advanced_data).data

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
