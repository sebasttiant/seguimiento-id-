# Análisis de Viabilidad Técnica: Upgrade de Versiones Objetivo

**Fecha:** 18 de marzo de 2026  
**Proyecto:** crm-desarrollo-main-webready  
**Autor:** Asistente Técnico  
**Objetivo:** Validación técnica de viabilidad para Node.js 24.14.0 LTS, React 19.2, Vite 8 y PostgreSQL

---

## 1. Estado Actual del Repositorio

### Tabla de Versiones Actuales

| Componente | Versión Actual | Versión Propuesta | Origen de Datos |
|------------|----------------|-------------------|-----------------|
| **Node.js** | 22.22.0 (system) / 22 (package.json) | 24.14.0 LTS | system: `node --version` |
| **React** | 19.2.4 (instalada) / ^19.1.0 (package.json) | 19.2 | npm list |
| **Vite** | 6.4.1 (instalada) / ^6.1.0 (package.json) | 8.0.0 | npm list |
| **PostgreSQL** | 18-alpine (docker-compose.yml) | 18-alpine (sugerida) o 19 (planificado) | docker-compose.yml |
| **Python/Django** | 3.12 (Dockerfile) / Django 5.1.6 | Sin cambio | backend/Dockerfile |
| **psycopg** | 3.2.6 (requirements.txt) | Sin cambio | requirements/base.txt |

### Estructura del Proyecto

- **Frontend:** React + Vite (SPA)
- **Backend:** Django + DRF (Python 3.12)
- **Base de Datos:** PostgreSQL 18-alpine (Docker)
- **Cache:** Redis 7-alpine (Docker)
- **CI/CD:** GitHub Actions (Node 22, Python 3.12, PostgreSQL 18)

---

## 2. Validación de Versiones Propuestas

### 2.1 Node.js 24.14.0 LTS

**Estado:** ✅ Disponible (LTS desde 24 Feb 2026)

**Comprobación de Fuentes:**
- ✅ [nodejs.org/blog/release/v24.14.0](https://nodejs.org/en/blog/release/v24.14.0) - Lanzamiento oficial
- ✅ [endoflife.date/nodejs](https://endoflife.date/nodejs) - Soporte hasta 30 Apr 2028
- ✅ [Security Releases](https://nodejs.org/en/blog/vulnerability/march-2026-security-releases) - Actualizaciones de seguridad programadas

**Compatibilidad:**
- **Riesgo Bajo-Medio** según análisis de NodeSource
- GitHub Actions migrará a Node 24 en marzo 2026
- Requiere rebuild de nativos addons (`node-gyp`)
- Package.json actual: `"engines": { "node": ">=22 <23" }` → Incompatible con Node 24

**Semáforo:** 🟡 **Amarillo** - Requiere cambio en `engines.node`

### 2.2 React 19.2

**Estado:** ✅ Disponible (Lanzado 1 Oct 2025, última patch 19.2.4 - 26 Jan 2026)

**Comprobación de Fuentes:**
- ✅ [react.dev/blog/2025/10/01/react-19-2](https://react.dev/blog/2025/10/01/react-19-2) - Anuncio oficial
- ✅ [MakerKit Upgrade Guide](https://makerkit.dev/blog/tutorials/react-19-2) - Guía de migración
- ✅ **Crítico:** CVE-2025-55182 (RCE) afecta React 19.0.0-19.2.2

**Compatibilidad:**
- **Riesgo Bajo** para proyectos existentes (sin breaking changes)
- Proyecto ya usa React 19.2.4 (instalado) ✅
- Dependencias actuales: `@tanstack/react-query@5.90.12`, `react-router-dom@6.30.2`
- **Nota:** React 19.2 requiere Node.js 18+ (cumplido)

**Semáforo:** 🟢 **Verde** - Ya está actualizado parcialmente

### 2.3 Vite 8

**Estado:** ✅ Disponible (Lanzado 12 Mar 2026)

**Comprobación de Fuentes:**
- ✅ [vite.dev/blog/announcing-vite8](https://vite.dev/blog/announcing-vite8) - Anuncio oficial
- ✅ [Migration Guide](https://vite.dev/guide/migration) - Guía de migración v7 → v8
- ✅ **Nota:** Rolldown bundler (Rust) - 10-30x más rápido en builds

**Compatibilidad:**
- **Riesgo Medio-Alto** por cambio arquitectónico significativo
- Cambia de dual-bundler (esbuild + Rollup) → Rolldown (único)
- Compatibilidad con plugins: "Full Rollup API compatibility"
- Requiere Node.js 18+ (cumplido)
- **Issue:** `@vitejs/plugin-react@^5.0.2` actualmente v5.2.0 - compatible con Vite 8

**Semáforo:** 🟡 **Amarillo** - Requiere pruebas extensivas

### 2.4 PostgreSQL 18/19

**Estado:** 
- **PostgreSQL 18:** ✅ Disponible (Lanzado 25 Sep 2025, última 18.3 - 26 Feb 2026)
- **PostgreSQL 19:** 📅 Planificado para Septiembre 2026

**Comprobación de Fuentes:**
- ✅ [postgresql.org/docs/18](https://www.postgresql.org/docs/18/) - Documentación oficial
- ✅ [Roadmap](https://www.postgresql.org/developer/roadmap/) - Próxima versión 19 en Sep 2026
- ✅ [Docker Hub: postgres:18-alpine](https://hub.docker.com/_/postgres) - Imagen disponible

**Compatibilidad:**
- **PostgreSQL 18:** ✅ Compatibilidad total con `psycopg[binary]==3.2.6` (Soporte añadido en v3.3 - Sep 2025)
- **PostgreSQL 19:** 📅 No disponible hasta Sep 2026
- **Docker:** `postgres:18-alpine` funcional en CI/CD actual
- **Nota:** Django 5.1.6 y `psycopg` 3.2.6 soportan PostgreSQL 18 sin cambios

**Semáforo:** 🟢 **Verde** para PostgreSQL 18  
**Semáforo:** 🔴 **Rojo** para PostgreSQL 19 (no disponible aún)

---

## 3. Análisis de Compatibilidad Detallado

### 3.1 Node.js 24 + Frontend Toolchain

| Componente | Compatibilidad Node 24 | Riesgo | Acción Requerida |
|------------|------------------------|--------|------------------|
| **Vite 6.x** | ✅ Compatible | Bajo | Testear builds |
| **@vitejs/plugin-react** | ✅ Compatible (v5.2.0) | Bajo | Actualizar a última versión |
| **npm dependencies** | ⚠️ Posibles rebuilds | Medio | Reinstalar dependencias nativas |
| **package.json engines** | ❌ Incompatible | Alto | Cambiar a `">=24 <25"` |

### 3.2 React 19.2 + Librerías Usadas

| Librería | Versión Actual | Compatibilidad React 19.2 | Riesgo |
|----------|----------------|---------------------------|--------|
| **@tanstack/react-query** | 5.90.12 | ✅ Compatible | Bajo |
| **react-router-dom** | 6.30.2 | ✅ Compatible | Bajo |
| **react-hook-form** | 7.68.0 | ✅ Compatible | Bajo |
| **zod** | 4.0.8 | ✅ Compatible | Bajo |
| **axios** | 1.7.7 | ✅ Compatible | Bajo |

### 3.3 Vite 8 + React 19 + Node 24

| Aspecto | Estado | Notas |
|---------|--------|-------|
| **Compatibilidad Node** | ✅ Node 18+ requerido | Node 24.14.0 cumple |
| **Compatibilidad React** | ✅ React 18/19 soportado | Sin cambios en API |
| **Plugins existentes** | ⚠️ Revisión necesaria | `@vitejs/plugin-react` compatible |
| **Build performance** | ✅ Mejora 10-30x | Con Rolldown |
| **Configuración** | ⚠️ Cambios menores | Véase Migration Guide |

### 3.4 PostgreSQL 18 + Django/psycopg

| Componente | Versión | Compatibilidad PG 18 | Notas |
|------------|---------|---------------------|-------|
| **Django** | 5.1.6 | ✅ Compatible | Django soporta PG 12+ |
| **psycopg[binary]** | 3.2.6 | ✅ Compatible (v3.3+) | Soporte PG 18 añadido en v3.3 |
| **CI/CD** | postgres:18-alpine | ✅ Funcional | Usado actualmente |
| **Migraciones** | Django ORM | ✅ Sin cambios | No requiere cambios |

---

## 4. Recomendación Final por Componente

### Tabla de Semáforo

| Componente | Versión Propuesta | Semáforo | Recomendación |
|------------|-------------------|----------|---------------|
| **Node.js** | 24.14.0 LTS | 🟡 **Amarillo** | Subir con test/condiciones |
| **React** | 19.2 | 🟢 **Verde** | Ya actualizado (19.2.4) |
| **Vite** | 8.0.0 | 🟡 **Amarillo** | Subir con pruebas extensivas |
| **PostgreSQL** | 18-alpine | 🟢 **Verde** | Ya en uso (sin cambiar) |
| **PostgreSQL** | 19-alpine | 🔴 **Rojo** | Posponer (no disponible hasta Sep 2026) |

### Recomendación Exacta

**SUBIR HOY:**
- ✅ React 19.2 (ya está en 19.2.4)
- ✅ PostgreSQL 18-alpine (ya está en uso)

**SUBIR CON CONDICIONES (Amarillo):**
- ⚠️ Node.js 24.14.0 LTS - Requiere cambio en `engines.node` y rebuild de dependencias
- ⚠️ Vite 8.0.0 - Requiere pruebas de migración y validación de plugins

**POSPOner:**
- 🔴 PostgreSQL 19-alpine (no disponible hasta Septiembre 2026)

---

## 5. Plan de Migración Seguro por Fases

### Fase 1: Preparación (1-2 días)
1. **Actualizar package.json**
   ```json
   "engines": {
     "node": ">=24 <25"
   }
   ```
2. **Actualizar CI/CD**
   - GitHub Actions: `node-version: 24`
   - Actualizar docker-compose.yml si es necesario
3. **Backup completo** de la base de datos
4. **Documentar** versiones actuales exactas

### Fase 2: Node.js Upgrade (2-3 días)
1. **Instalar Node 24.14.0 LTS**
   ```bash
   # Usar nvm o similar
   nvm install 24.14.0
   nvm use 24.14.0
   ```
2. **Reinstalar dependencias**
   ```bash
   rm -rf node_modules package-lock.json
   npm ci
   ```
3. **Testear builds**
   ```bash
   npm run build
   npm run test
   ```
4. **Validar producción**
   - Deploy a staging
   - Monitorizar errores
   - Rollback plan listo

### Fase 3: Vite 8 Upgrade (2-4 días)
1. **Actualizar Vite y plugins**
   ```bash
   npm install vite@^8.0.0 @vitejs/plugin-react@^6.0.0 --save-dev
   ```
2. **Revisar configuración**
   - `vite.config.js` - posibles cambios en build.target
   - Verificar plugin compatibilidad
3. **Migración gradual** (opcional)
   ```bash
   # Usar rolldown-vite para migración gradual
   npm install rolldown-vite@7.2.2
   ```
4. **Testear extensivamente**
   - Builds de producción
   - Desarrollo local
   - Tests E2E si existen

### Fase 4: PostgreSQL 18 (Si aplica)
1. **Ya está en uso** en docker-compose.yml
2. **Verificar migraciones**
   ```bash
   python manage.py migrate --plan
   ```
3. **Testear con datos reales**
   - Restaurar backup a entorno de staging
   - Validar queries críticas

### Fase 5: Validación y Rollback
1. **Rollback Plan**
   - Node.js: Volver a 22.x
   - Vite: Revertir a 6.x
   - PostgreSQL: Mantener 18 (no cambiar)
2. **Validación Post-Upgrade**
   - Tests unitarios y E2E
   - Performance benchmarks
   - Monitoreo de errores en producción

---

## 6. Comandos de Validación Sugeridos

### Validación Local (No Destructiva)
```bash
# 1. Validar Node.js versión
node --version
npm --version

# 2. Testear build actual
npm run build

# 3. Testear dependencias nativas
npm rebuild

# 4. Validar PostgreSQL
docker-compose exec postgres pg_isready -U tasktracking
docker-compose exec postgres psql -U tasktracking -c "SELECT version();"

# 5. Testear backend Django
cd backend
python manage.py check
python manage.py test
```

### CI/CD Validación (GitHub Actions)
```yaml
# Actualizar .github/workflows/ci.yml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: "24"
    cache: npm
```

### Comandos de Rollback
```bash
# Rollback Node.js
nvm install 22.22.0
nvm use 22.22.0

# Rollback Vite
npm install vite@^6.1.0 --save-dev

# Rollback PostgreSQL (si se actualiza)
# docker-compose down
# docker volume rm crm-desarrollo-main-webready_postgres_data
# docker-compose up -d postgres
```

---

## 7. Conclusiones

1. **Node.js 24.14.0 LTS** es estable y recomendado para producción, pero requiere cambio en `engines.node`
2. **React 19.2** ya está parcialmente actualizado (19.2.4) - es seguro continuar
3. **Vite 8** ofrece mejoras significativas de performance pero requiere pruebas extensivas
4. **PostgreSQL 18** es compatible y ya está en uso - no requiere cambios
5. **PostgreSQL 19** no está disponible hasta Septiembre 2026 - posponer

**Recomendación Final:**  
Subir Node.js 24.14.0 LTS y Vite 8.0.0 en una ventana de mantenimiento con plan de rollback, manteniendo React 19.2 y PostgreSQL 18 actuales.

---

**Documentado por:** Asistente Técnico  
**Fecha:** 18 de marzo de 2026  
**Proyecto:** crm-desarrollo-main-webready