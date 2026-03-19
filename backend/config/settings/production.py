import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ImproperlyConfigured(
            f"Missing required environment variable in production: {name}"
        )
    return value


def _required_list_env(name: str) -> list[str]:
    values = env_list(name)  # noqa: F405
    if not values:
        raise ImproperlyConfigured(
            f"Missing required list environment variable in production: {name}"
        )
    return values


DEBUG = False

SECRET_KEY = _required_env("SECRET_KEY")
ALLOWED_HOSTS = _required_list_env("ALLOWED_HOSTS")
CORS_ALLOWED_ORIGINS = _required_list_env("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = _required_list_env("CSRF_TRUSTED_ORIGINS")

if "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS cannot contain '*' in production")

POSTGRES_PASSWORD = _required_env("POSTGRES_PASSWORD")
DATABASES["default"]["PASSWORD"] = POSTGRES_PASSWORD

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405

USE_X_FORWARDED_PROTO = env_bool("USE_X_FORWARDED_PROTO", default=True)  # noqa: F405
SECURE_PROXY_SSL_HEADER = (
    ("HTTP_X_FORWARDED_PROTO", "https") if USE_X_FORWARDED_PROTO else None
)

ENABLE_HSTS = env_bool("ENABLE_HSTS", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = (
    int(os.getenv("SECURE_HSTS_SECONDS", "31536000")) if ENABLE_HSTS else 0
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = ENABLE_HSTS
SECURE_HSTS_PRELOAD = ENABLE_HSTS

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"

CORS_ALLOW_ALL_ORIGINS = False

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}
