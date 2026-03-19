import os

from django.db import connections
from django.http import JsonResponse


def _is_redis_required() -> bool:
    return os.getenv("HEALTHCHECK_REDIS_REQUIRED", "0").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def health_view(_request):
    checks: dict[str, str] = {}
    status_code = 200

    try:
        connections["default"].cursor().execute("SELECT 1")
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
        status_code = 503

    if _is_redis_required():
        try:
            import redis

            client = redis.Redis(
                host=os.getenv("REDIS_HOST", "redis"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                db=0,
                socket_timeout=1,
            )
            if client.ping():
                checks["redis"] = "ok"
            else:
                checks["redis"] = "error"
                status_code = 503
        except Exception:
            checks["redis"] = "error"
            status_code = 503
    else:
        checks["redis"] = "skipped"

    overall = "ok" if status_code == 200 else "error"
    return JsonResponse({"status": overall, "checks": checks}, status=status_code)
