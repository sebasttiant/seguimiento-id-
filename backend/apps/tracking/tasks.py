from celery import shared_task


@shared_task
def ping_worker() -> str:
    return "pong"
