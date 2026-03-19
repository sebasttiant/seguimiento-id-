import os
import time

import psycopg


def wait_for_postgres(max_attempts: int = 30, delay: int = 2) -> None:
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = int(os.getenv("POSTGRES_PORT", "5432"))
    user = os.getenv("POSTGRES_USER", "tasktracking")
    password = os.getenv("POSTGRES_PASSWORD", "tasktracking")
    dbname = os.getenv("POSTGRES_DB", "tasktracking")

    for attempt in range(1, max_attempts + 1):
        try:
            with psycopg.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                dbname=dbname,
            ):
                print("PostgreSQL is ready")
                return
        except Exception as exc:  # noqa: BLE001
            print(f"[{attempt}/{max_attempts}] PostgreSQL unavailable: {exc}")
            time.sleep(delay)

    raise RuntimeError("PostgreSQL did not become available in time")


if __name__ == "__main__":
    wait_for_postgres()
