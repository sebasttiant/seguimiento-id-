# Backend Task Tracking (Django/DRF)

Backend base listo para una primera etapa productiva: autenticacion JWT con roles, CRUD de proyectos/tareas, PostgreSQL, Redis, Celery y Docker Compose.

## Stack y versiones

- Python: `3.12` (imagen `python:3.12-slim` para priorizar estabilidad en dependencias)
- Django: `5.1.6`
- Django REST Framework: `3.16.0`
- Auth JWT: `djangorestframework-simplejwt 5.5.0`
- PostgreSQL: `18-alpine` (si tu Docker no tiene la etiqueta, usa `17-alpine` en `docker-compose.yml`)
- Redis: `7-alpine`
- Celery: `5.5.0`

## Estructura

```text
backend/
  apps/
    users/            # Usuario custom, roles, auth endpoints, seed demo
    tracking/         # Modelos Project/Task, CRUD DRF, filtros
  config/
    settings/
      base.py
      local.py
      production.py
    celery.py
    urls.py
  requirements/
  scripts/
```

## Endpoints

Auth:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Tracking:

- `GET|POST /api/projects/`
- `GET|PUT|PATCH|DELETE /api/projects/{id}/`
- `GET|POST /api/tasks/`
- `GET|PUT|PATCH|DELETE /api/tasks/{id}/`

Permisos por rol:

- `admin`: acceso total
- `editor`: lectura + escritura
- `viewer`: solo lectura

## Levantar con Docker

Desde la raiz del proyecto:

```bash
make up ENV=dev
```

Servicios:

- `frontend` (Vite dev server en dev, build estatico en prod)
- `nginx` reverse proxy en `http://localhost:8080` (dev) o `http://localhost:8073` (prod local)
- `backend` en `http://localhost:8000`
- `postgres` en `localhost:5432`
- `redis` en `localhost:6379`
- `celery_worker`
- `celery_beat`

Flujo recomendado para validar UI + API:

- Abrir `http://localhost:8080`.
- El reverse proxy enruta frontend y backend por `/api/*`.
- Login real consume `POST /api/auth/login` y luego consulta `/api/auth/me`.

Migraciones y static:

- El contenedor `backend` ejecuta migraciones automaticamente al iniciar (`RUN_MIGRATIONS=1`).
- Worker y beat no corren migraciones para evitar carreras.

## Seed de usuarios demo

Con servicios arriba:

```bash
docker compose exec backend python manage.py seed_demo_users
```

Credenciales:

- `admin / Admin123!`
- `editor / Editor123!`
- `viewer / Viewer123!`

Privacidad demo:

- `POST /api/auth/login` y `GET /api/auth/me` devuelven `user` minimo (`id`, `username`, `role`)
- `email`, `first_name` y `last_name` se mantienen solo a nivel backend

## Backup y restore

Scripts en `ops/`:

```bash
./ops/backup_postgres.sh --env dev
./ops/restore_postgres.sh ops/backups/postgres_dev_YYYYMMDD_HHMMSS.dump --env dev
```

- Backups se guardan en `ops/backups/`.
- Formato por defecto: `.dump` (custom) con naming por fecha y entorno.
- Compose base monta este directorio en `/backups` del contenedor postgres.
- Politica y restore drill: ver `ops/OPERATIONS.md`.

## Checks minimos sugeridos

Sin Docker (entorno local con Python y dependencias):

```bash
python manage.py migrate
python manage.py test
```

Con Docker:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py test
```

## Smoke test rapido de login real

Con servicios arriba y usuarios seed cargados:

```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"Admin123!"}'
```

Debe responder `access`, `refresh` y `user` (solo `id`, `username`, `role`).
