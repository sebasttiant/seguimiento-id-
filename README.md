# seguimiento-id

Plataforma de seguimiento y validacion de proyectos de I+D. Esta version esta enfocada en flujo operativo interno con trazabilidad tecnica, estados, roles y evidencia para decisiones de avance.

## Que es

`seguimiento-id` ayuda a centralizar:

- pipeline de avance por proyecto (lead -> modulo tecnico -> cierre)
- control de acceso por rol (`admin`, `editor`, `viewer`)
- registro de datos tecnicos y regulatorios por modulo
- persistencia en PostgreSQL con API REST (Django/DRF)

## Alcance actual (si hace)

- autenticacion JWT con login real por API
- dashboard de proyectos con busqueda y filtros
- detalle de proyecto con modulos avanzados (`prebrief`, `clientbrief`, `techspecs`, `samples`, `qualityreg`, `changes`)
- persistencia de negocio en base de datos (PostgreSQL)
- tareas asinc con Celery + Redis
- ejecucion reproducible con Docker Compose (dev y prod local)

## Que no es aun

- no es un CRM comercial completo
- no incluye facturacion, ventas, ni marketing automation
- no incluye multi-tenant empresarial ni SSO corporativo
- no reemplaza un ERP

## Arquitectura real

- Frontend: React 19 + Vite
- Backend: Django 5 + Django REST Framework
- DB: PostgreSQL 18
- Broker/cache: Redis 7
- Workers: Celery (worker + beat)
- Orquestacion: Docker Compose (dev/prod)
- Entrada HTTP: Nginx reverse proxy

Servicios definidos en compose:

- `frontend`
- `nginx`
- `backend`
- `postgres`
- `redis`
- `celery_worker`
- `celery_beat`

## Requisitos

- Docker Engine + Docker Compose plugin
- GNU Make (recomendado)
- Node 24.14.x (solo si ejecutas frontend fuera de contenedor)
- Puerto libre para Nginx (`8080` en dev, `8073` o `80` en prod local)

## Quickstart local

### 1) Preparar entorno

```bash
cd crm-desarrollo-main-webready
./ops/bootstrap_env.sh
```

### 2) Desarrollo local (recomendado)

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Endpoints dev por defecto:

- App: `http://localhost:8080`
- Frontend Vite: `http://localhost:5173`
- API health: `http://localhost:8080/api/health`
- Nginx health: `http://localhost:8080/healthz`

### 3) Prod local (misma maquina)

Si no puedes usar puerto 80, deja `NGINX_PORT=8073` en `.env.prod`.

```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Endpoints prod local tipicos:

- App: `http://localhost:8073`
- API health: `http://localhost:8073/api/health`
- Nginx health: `http://localhost:8073/healthz`

## Despliegue en servidor (copy/paste)

```bash
# 1) Clonar repo
git clone <TU-REPO-GITHUB-URL> seguimiento-id
cd seguimiento-id

# 2) Inicializar env locales
./ops/bootstrap_env.sh
cp .env.prod.example .env.prod
cp backend/.env.prod.example backend/.env.prod

# 3) Editar secretos y dominios reales
# - .env.prod
# - backend/.env.prod

# 4) Desplegar (incluye migrate y health checks)
./ops/deploy.sh

# 5) Opcional: desplegar sin build o sin seed
./ops/deploy.sh --no-build
./ops/deploy.sh --skip-seed
./ops/deploy.sh --env-file .env.prod

# 6) Smoke end-to-end
./ops/smoke_e2e.sh --base-url http://localhost:${NGINX_PORT:-80}
```

Notas:

- agrega tu dominio/IP en `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS`
- usa `SECURE_SSL_REDIRECT=1` solo cuando tengas TLS real en proxy/LB
- `ops/deploy.sh` crea `.env.prod` y `backend/.env.prod` desde los `.example` si faltan, y te avisa para editar secretos

## Credenciales demo

Crear usuarios demo:

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml exec backend python manage.py seed_demo_users
```

Usuarios:

- `admin` / `Admin123!`
- `editor` / `Editor123!`
- `viewer` / `Viewer123!`

Privacidad demo:

- la API/UI de sesion devuelve solo `id`, `username`, `role`
- `email`, `first_name`, `last_name` quedan como datos internos del backend y no se exponen al cliente

## Persistencia de datos

- Datos de negocio: PostgreSQL (proyectos, tareas, modulos avanzados)
- En browser: solo sesion/auth y preferencias UX no criticas (ej. filtros de dashboard)
- Compatibilidad legacy: si existe data local antigua, frontend intenta migrarla al backend al abrir proyecto

## Backups y restore

Backup:

```bash
./ops/backup_postgres.sh --env prod --retention-days 30
```

Restore (destructivo):

```bash
./ops/restore_postgres.sh ./ops/backups/postgres_prod_YYYYMMDD_HHMMSS.dump --env prod --yes
```

Validaciones recomendadas tras restore:

```bash
./ops/health_check.sh --env prod
./ops/smoke_e2e.sh --base-url http://localhost:${NGINX_PORT:-80}
```

## Verificacion rapida

```bash
npm test
npm run build
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml config > /tmp/compose.prod.rendered.yml
```

Backend test basico:

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml run --rm backend python manage.py test
```

## Operacion

Runbook completo: `ops/OPERATIONS.md`

## Roadmap corto

1. Auditoria y reportes exportables (CSV/PDF) por estado y modulo.
2. Notificaciones operativas (recordatorios y vencimientos) con Celery.
3. Historico de cambios enriquecido (quien, que, cuando, por que).
4. Endurecimiento de seguridad para exposicion publica (headers, rate-limit, rotacion secretos).
