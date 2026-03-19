from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from config.health import health_view
from apps.users.views import LoginView, LogoutView, MeView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health_view, name="health"),
    path("api/auth/login", LoginView.as_view(), name="auth-login"),
    path("api/auth/refresh", TokenRefreshView.as_view(), name="auth-refresh"),
    path("api/auth/me", MeView.as_view(), name="auth-me"),
    path("api/auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("api/", include("apps.tracking.urls")),
]

handler400 = "config.error_handlers.bad_request"
