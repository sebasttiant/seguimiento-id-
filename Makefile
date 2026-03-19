SHELL := /bin/sh

ENV ?= dev
BACKUP ?=
HOST_UID ?= $(shell id -u)
HOST_GID ?= $(shell id -g)

COMPOSE_BASE := docker compose -f docker-compose.yml
COMPOSE_DEV := $(COMPOSE_BASE) -f docker-compose.dev.yml
COMPOSE_PROD := $(COMPOSE_BASE) -f docker-compose.prod.yml
FRONTEND_DOCKER := docker run --rm -u $(HOST_UID):$(HOST_GID) -e NPM_CONFIG_CACHE=/tmp/.npm -v $(CURDIR):/workspace -w /workspace node:24.14.0-alpine

ifeq ($(ENV),prod)
COMPOSE := $(COMPOSE_PROD)
else
COMPOSE := $(COMPOSE_DEV)
endif

.PHONY: help \
	setup fix-permissions \
	dev-up dev-down dev-logs dev-ps deploy-local deploy-local-down \
	test-frontend test-backend test-all \
	build-frontend build-all \
	migrate seed \
	backup restore \
	health smoke \
	config-dev config-prod \
	up down logs ps test

help:
	@printf "Setup:\n"
	@printf "  make setup                          # Crea .env locales faltantes e instala frontend\n"
	@printf "  make fix-permissions                # Repara ownership frontend (EACCES)\n"
	@printf "\n"
	@printf "Dev:\n"
	@printf "  make dev-up                         # Levanta stack de desarrollo\n"
	@printf "  make dev-down                       # Baja stack de desarrollo\n"
	@printf "  make dev-logs                       # Logs del stack dev\n"
	@printf "  make dev-ps                         # Estado de contenedores dev\n"
	@printf "\n"
	@printf "Test:\n"
	@printf "  make test-frontend                  # Vitest\n"
	@printf "  make test-backend                   # Django tests en Docker\n"
	@printf "  make test-all                       # Frontend + backend\n"
	@printf "\n"
	@printf "Build/Deploy local:\n"
	@printf "  make build-frontend                 # Build Vite\n"
	@printf "  make build-all                      # Build frontend + imagenes prod\n"
	@printf "  make deploy-local                   # Sube stack prod local\n"
	@printf "  make deploy-local-down              # Baja stack prod local\n"
	@printf "\n"
	@printf "Data:\n"
	@printf "  make migrate ENV=dev|prod           # Django migrate\n"
	@printf "  make seed ENV=dev|prod              # Usuarios demo\n"
	@printf "  make backup ENV=dev|prod            # Backup Postgres\n"
	@printf "  make restore ENV=dev|prod BACKUP=...# Restore Postgres\n"
	@printf "\n"
	@printf "Checks:\n"
	@printf "  make health ENV=dev|prod            # Health endpoints\n"
	@printf "  make smoke ENV=dev|prod             # Health + checks basicos\n"
	@printf "  make config-dev                     # Render compose dev\n"
	@printf "  make config-prod                    # Render compose prod\n"

setup:
	./ops/bootstrap_env.sh
	@test -f .env.prod || cp .env.prod.example .env.prod
	@test -f backend/.env.prod || cp backend/.env.prod.example backend/.env.prod
	$(FRONTEND_DOCKER) sh -c "npm ci --no-audit --no-fund"

fix-permissions:
	HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) ./ops/fix_frontend_permissions.sh

dev-up: fix-permissions
	HOST_UID=$(HOST_UID) HOST_GID=$(HOST_GID) $(COMPOSE_DEV) up -d --build

dev-down:
	$(COMPOSE_DEV) down

dev-logs:
	$(COMPOSE_DEV) logs -f --tail=150

dev-ps:
	$(COMPOSE_DEV) ps

deploy-local: build-all
	$(COMPOSE_PROD) up -d

deploy-local-down:
	$(COMPOSE_PROD) down

test-frontend:
	$(FRONTEND_DOCKER) sh -c "npm run test"

test-backend:
	$(COMPOSE_DEV) run --rm backend python manage.py test

test-all: test-frontend test-backend

build-frontend:
	$(FRONTEND_DOCKER) sh -c "npm run build"

build-all: build-frontend
	$(COMPOSE_PROD) build

migrate:
	$(COMPOSE) exec backend python manage.py migrate

seed:
	$(COMPOSE) exec backend python manage.py seed_demo_users

backup:
	./ops/backup_postgres.sh --env $(ENV)

restore:
	@if [ -z "$(BACKUP)" ]; then \
		printf "BACKUP variable is required. Example: make restore ENV=dev BACKUP=ops/backups/postgres_dev_YYYYMMDD_HHMMSS.dump\n"; \
		exit 1; \
	fi
	./ops/restore_postgres.sh $(BACKUP) --env $(ENV)

health:
	./ops/health_check.sh --env $(ENV)

smoke: health
	@if [ "$(ENV)" = "prod" ]; then \
		$(COMPOSE_PROD) exec backend python manage.py check; \
	else \
		$(COMPOSE_DEV) exec backend python manage.py check; \
	fi

config-dev:
	$(COMPOSE_DEV) config > /tmp/compose.dev.rendered.yml
	@printf "Rendered in /tmp/compose.dev.rendered.yml\n"

config-prod:
	$(COMPOSE_PROD) config > /tmp/compose.prod.rendered.yml
	@printf "Rendered in /tmp/compose.prod.rendered.yml\n"

# Backward-compatible aliases
up: dev-up
down: dev-down
logs: dev-logs
ps: dev-ps
test: test-all
