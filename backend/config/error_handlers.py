from django.http import HttpResponseBadRequest, JsonResponse


def bad_request(request, exception=None):
    if request.path.startswith("/api/"):
        return JsonResponse(
            {
                "detail": "Host no permitido por el servidor.",
                "code": "invalid_host",
            },
            status=400,
        )

    return HttpResponseBadRequest("Bad Request")
