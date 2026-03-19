from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class IsAdminOrEditor(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"admin", "editor"}
        )


class IsAdminEditorOrReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return True
        return request.user.role in {"admin", "editor"}
