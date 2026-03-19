# OPERATIONS RUNBOOK - seguimiento-id

Guia operativa para terceros: levantar, verificar, respaldar y desplegar `seguimiento-id` sin depender de conocimiento previo del equipo original.

## 1) Preparacion inicial

```bash
./ops/bootstrap_env.sh
```

Plantillas relevantes:

- raiz: `.env.example`, `.env.dev.example`, `.env.prod.example`
- backend: `backend/.env.example`, `backend/.env.dev.example`, `backend/.env.prod.example`

## 2) Operacion en desarrollo

Levantar stack dev reproducible:

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Parar stack dev:

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml down
```

Reiniciar servicios dev:

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml restart
```

Logs dev:

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml logs -f --tail=150
```

## 3) Operacion prod local / pre-servidor

Levantar stack prod local:

```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Parar stack prod local:

```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml down
```

Si el puerto 80 esta ocupado, usa `NGINX_PORT=8073` en `.env.prod`.

## 4) Checks operativos base

Health check script:

```bash
./ops/health_check.sh --env dev
./ops/health_check.sh --env prod
```

Health manual:

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/api/health
```

Prod local (si `NGINX_PORT=8073`):

```bash
curl -fsS http://localhost:8073/healthz
curl -fsS http://localhost:8073/api/health
```

## 5) Seed y smoke de autenticacion

Seed de usuarios demo:

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml exec backend python manage.py seed_demo_users
```

Credenciales demo:

- `admin / Admin123!`
- `editor / Editor123!`
- `viewer / Viewer123!`

Privacidad demo:

- respuestas de `POST /api/auth/login` y `GET /api/auth/me`: solo `id`, `username`, `role`
- `email`, `first_name`, `last_name` son internos y no deben mostrarse en UI ni respuestas al cliente

Smoke login JWT:

```bash
curl -fsS -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"Admin123!"}'
```

Smoke integrado (health + login + endpoint protegido):

```bash
./ops/smoke_e2e.sh --base-url http://localhost:8080
```

## 6) Verificar compose renderizado

```bash
docker compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml config > /tmp/compose.dev.rendered.yml
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml config > /tmp/compose.prod.rendered.yml
```

## 7) Backups y restore

Backup manual:

```bash
./ops/backup_postgres.sh --env prod --retention-days 30
```

Restore manual (destructivo):

```bash
./ops/restore_postgres.sh ./ops/backups/postgres_prod_YYYYMMDD_HHMMSS.dump --env prod --yes
```

Post-restore minimo:

```bash
./ops/health_check.sh --env prod
./ops/smoke_e2e.sh --base-url http://localhost:8073
```

Automatizacion sugerida (cron):

```cron
# Diario 02:30 - backup prod con retencion de 30 dias
30 2 * * * cd /opt/seguimiento-id && ./ops/backup_postgres.sh --env prod --retention-days 30 >> /var/log/seguimiento-id-backup.log 2>&1
```

## 8) Persistencia de datos

- la data de negocio de proyectos/modulos vive en PostgreSQL
- no usar `localStorage`/`sessionStorage` para negocio
- browser conserva solo sesion y preferencias UX
- migracion legacy local es best-effort al abrir proyecto

Endpoints de modulos avanzados:

- `GET/PATCH /api/projects/{id}/advanced-modules/`
- `GET/PATCH/PUT /api/projects/{id}/advanced-modules/{module}/`

Modulos soportados:

- `prebrief`
- `clientbrief`
- `techspecs`
- `samples`
- `qualityreg`
- `changes`

## 9) Checklist antes de subir a GitHub

- [ ] `.gitignore` cubre secretos, dumps y artefactos (`.env*`, `ops/backups/`, `dist/`, `node_modules/`)
- [ ] no hay archivos reales de entorno (`.env`, `backend/.env*`) en staging
- [ ] README actualizado con arquitectura real y pasos de despliegue
- [ ] `LICENSE`, `CONTRIBUTING.md` y `SECURITY.md` presentes
- [ ] branding publico alineado a `seguimiento-id` (sin presentar CRM como producto principal)
- [ ] `npm test` en verde
- [ ] `npm run build` en verde
- [ ] backend checks basicos en verde (`python manage.py test`)

## 10) Checklist antes de deploy en servidor

- [ ] host con Docker/Compose instalado y puertos definidos
- [ ] `.env.prod` y `backend/.env.prod` con secretos reales
- [ ] `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` configurados con dominio/IP real
- [ ] `SECRET_KEY` y `POSTGRES_PASSWORD` no usan placeholders
- [ ] compose prod renderiza sin errores (`docker compose ... config`)
- [ ] backup reciente disponible y restore probado al menos una vez
- [ ] health y smoke E2E exitosos en URL final
- [ ] monitoreo inicial de logs de `nginx`, `backend`, `celery_worker` por 5-10 min

## 11) Troubleshooting rapido

- `401` en login: validar seed demo y `VITE_AUTH_MODE=api`
- backend unhealthy: revisar `ALLOWED_HOSTS` y healthcheck host
- frontend sin cargar en prod: inspeccionar `frontend` + `nginx` logs y verificar build
- error de CORS/CSRF: revisar vars de backend para dominio/IP real
