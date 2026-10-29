SHELL := bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
.SUFFIXES:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules
.DEFAULT_GOAL := help

COMPOSE ?= docker compose
PREVIEW := $(COMPOSE) -f docker/compose.preview.yaml
SERVICE ?=
ARGS ?=

.PHONY: help
help: ## Lista los comandos
	@awk 'BEGIN { FS = ":.*## " } /^[a-z0-9-]+:.*## / { printf "  %-16s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: install
install: ## Instala las dependencias de Node (npm ci)
	npm ci

.PHONY: env
env: ## Crea o completa el .env con los secretos de la API
	sh backend/api/scripts/init-env.sh

.PHONY: sandbox-images
sandbox-images: env-exists ## Construye las imágenes del sandbox (la primera vez y cada semana)
	$(COMPOSE) --profile sandbox-images build

.PHONY: setup
setup: install env sandbox-images ## Prepara todo la primera vez

.PHONY: env-exists
env-exists:
	@test -f .env || { echo 'Falta el .env: corré make env.' >&2; exit 1; }

.PHONY: up
up: env-exists ## Levanta el stack en http://localhost:8080
	$(COMPOSE) up --build -d --wait

.PHONY: down
down: env-exists ## Detiene el stack y conserva la base
	$(COMPOSE) down

.PHONY: ps
ps: env-exists ## Muestra los servicios del stack
	$(COMPOSE) ps

.PHONY: logs
logs: env-exists ## Sigue los logs (SERVICE=php para uno solo)
	$(COMPOSE) logs -f $(SERVICE)

.PHONY: restart
restart: env-exists ## Reinicia el stack o un servicio (SERVICE=…)
	$(COMPOSE) restart $(SERVICE)

.PHONY: dev
dev: ## Servidor de desarrollo de Vite
	npm run dev

.PHONY: build
build: ## Construye dist/
	npm run build

.PHONY: preview-up
preview-up: build ## Sirve dist/ en http://localhost:8765
	$(PREVIEW) up --build -d --wait

.PHONY: preview-down
preview-down: ## Detiene la vista previa
	$(PREVIEW) down

.PHONY: test
test: ## Checks de qa/ y Vitest (npm test)
	npm test

.PHONY: unit
unit: ## Sólo Vitest (ARGS=ruta para filtrar)
	npm run test:unit -- $(ARGS)

.PHONY: e2e
e2e: build ## Playwright contra dist/ (E2E_PORT y ARGS opcionales)
	npm run test:e2e -- $(ARGS)

.PHONY: e2e-install
e2e-install: ## Baja el navegador de Playwright
	npm run test:e2e:install

.PHONY: lint
lint: ## ESLint
	npm run lint

.PHONY: lint-infra
lint-infra: ## actionlint, zizmor, hadolint y shellcheck (Docker)
	npm run lint:infra

.PHONY: format
format: ## Aplica Prettier
	npm run format

.PHONY: check
check: ## Los checks del front que corre la CI, sin los E2E, y git diff --check
	npm run build
	npm test
	npm run lint
	npm run format:check
	git diff --check

.PHONY: api-test
api-test: env-exists ## Pest contra mysql-test
	npm run api:test

.PHONY: api-check
api-check: env-exists ## composer validate, Pint, PHPStan y Pest
	npm run api:composer:validate
	npm run api:format:check
	npm run api:analyse
	npm run api:test

.PHONY: api-down
api-down: ## Baja los servicios de prueba de la API
	npm run api:test:down

.PHONY: executor-test
executor-test: ## Pruebas del ejecutor Go
	npm run test:executor

.PHONY: executor-lint
executor-lint: ## golangci-lint del ejecutor (Docker, sin red)
	npm run lint:executor

GITLEAKS := tools/quality/bin/gitleaks
DESLOPPIFY := tools/quality/.venv/bin/desloppify

.PHONY: secrets-install
secrets-install: ## Instala gitleaks, fijado y con su sha256, en tools/quality/bin
	sh tools/quality/install-gitleaks.sh

.PHONY: secrets
secrets: secrets-install ## Busca secretos en toda la historia de Git
	$(GITLEAKS) git --redact --no-banner .

.PHONY: secrets-staged
secrets-staged: secrets-install ## Busca secretos en lo que está en stage
	$(GITLEAKS) git --pre-commit --staged --redact --no-banner .

.PHONY: hooks
hooks: secrets-install ## Instala el hook de pre-commit que corre secrets-staged
	hook="$$(git rev-parse --git-path hooks)/pre-commit"
	if [ -e "$$hook" ]; then echo "Ya hay un pre-commit en $$hook; no lo piso." >&2; exit 1; fi
	printf '#!/bin/sh\nexec make --no-print-directory secrets-staged\n' > "$$hook"
	chmod +x "$$hook"
	echo "Hook instalado en $$hook"

.PHONY: desloppify-config
desloppify-config: ## Aplica las exclusiones de tools/quality/desloppify-excludes.txt
	while IFS= read -r pattern; do
	  if [ -n "$$pattern" ]; then $(DESLOPPIFY) exclude "$$pattern" > /dev/null 2>&1; fi
	done < tools/quality/desloppify-excludes.txt
	$(DESLOPPIFY) config show | grep -E '^ +exclude '

.PHONY: desloppify
desloppify: desloppify-config ## Escanea el repo con Desloppify (estado local en .desloppify/)
	$(DESLOPPIFY) scan --path .
