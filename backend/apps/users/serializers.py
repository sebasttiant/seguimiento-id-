from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "role"]


class LoginSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False
        self.fields["identifier"] = serializers.CharField(required=False, write_only=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def _resolve_identifier(self, value: str) -> str:
        identifier = str(value or "").strip().lower()
        if not identifier:
            return ""

        if "@" in identifier:
            return identifier

        user_by_username = User.objects.filter(username__iexact=identifier).only("email").first()
        if user_by_username:
            return user_by_username.email

        return identifier

    def validate(self, attrs):
        identifier = attrs.pop("identifier", None) or attrs.get(self.username_field)
        password = attrs.get("password")

        if not identifier or not password:
            raise serializers.ValidationError("identifier and password are required")

        attrs[self.username_field] = self._resolve_identifier(identifier)
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
