# Hoja de ruta del backend (ADR 0004 y ADR 0005)

> **Para agentes:** cada subplan es un plan propio. Ejecutalo con
> superpowers:subagent-driven-development o superpowers:executing-plans. Los subplanes que
> todavía no tienen archivo se escriben con superpowers:writing-plans cuando se desbloquean,
> porque sus detalles dependen de lo que entreguen los anteriores.

**Objetivo:** llevar el taller del HTML autónomo con `localStorage` y Playgrounds públicos a
un backend propio:

- Laravel 13 + MySQL 9.7 en Docker, con contenido y progreso en tablas;
- sesión con segundo factor;
- certificado propio;
- un sandbox de ejecución en Go con gVisor;

todo sin perder progreso ni contenido.

**Specs:** [ADR 0004](../adr/0004-backend-laravel-mysql-contenido-y-progreso.md) y
[ADR 0005](../adr/0005-ejecucion-en-sandbox-propio.md). El reparto de modelos, el TDD y los
checks siguen [AGENTS.md](../../AGENTS.md): implementa Sonnet (`implementador`), revisa
Opus (`revisor`) e integra el agente principal.

## Subplanes

| ID | Subplan | Depende de | Entrega verificable | Plan |
|---|---|---|---|---|
| B1 | Ejecutor Go, imágenes de sandbox y prueba de humo de gVisor | — | `POST /v1/run` compila y ejecuta Rust y Go en contenedores endurecidos, con pruebas unitarias e integración | [2026-10-04-ejecutor-go.md](2026-10-04-ejecutor-go.md) |
| A1 | Contenido en YAML y código real, con oráculo idéntico | — | `content/` reemplaza los catálogos `.ts`; `curriculum.json` generado; bundle y oráculo `dump-globals-v2` idénticos | a escribir |
| C1 | Base Laravel en Docker | — | Proyecto API-only, servicios `php`, `mysql` y `migrate`, Nginx con `/api/`, healthchecks, Pest contra MySQL de test | [2026-10-04-laravel-base.md](2026-10-04-laravel-base.md) |
| A2 | Compuerta de arranque y contenido fuera del bundle | A1 | `main.tsx` espera el contenido antes de evaluar las vistas legacy (spike previo); el HTML deja de embeberlo | a escribir |
| C2 | Contenido en MySQL | A1, C1 | Migraciones, `content:import` idempotente, `GET /api/content` con ETag; la respuesta es idéntica al oráculo | a escribir |
| C3 | Autenticación | C1 | Sanctum SPA + Fortify sin vistas, TOTP, límites por IP y vista de login | a escribir |
| A3 | El front lee el contenido de la API | A2, C2, C3 | La compuerta pide `/api/content`, guarda la última copia y avisa si el backend no responde | a escribir |
| C4 | Exposición | A3, C3 | TLS propio con renovación, cabeceras, CSP estricta y retiro de `vite-plugin-singlefile` | a escribir |
| B2 | API de ejecuciones | B1, C2, C3 | `/api/runs` asincrónico (cola `database`, worker, estados, idempotencia, cancelación), composición con plantilla compartida y verificación de evidencia | a escribir |
| A4 | Laboratorio con el sandbox propio | B2, A3 | El laboratorio usa `/api/runs` y la vista previa sale de la misma plantilla; se retira el cliente de Playgrounds | a escribir |
| B3 | Auditoría local del currículo | B2 | Todas las soluciones aprueban y todos los códigos iniciales fallan en el ejecutor local | a escribir |
| D1 | Progreso en tablas y sincronización | C2, C3 | Tablas de progreso, cliente v2 (fecha por campo, lápidas, IDs de etapa, `proof`), `POST /api/sync`; el fixture de master entra y sale sin pérdida | a escribir |
| E1 | Sesión Esenciales | A1, D1 | Con su decisión de IDs (ADR propio) | a escribir |

## Estado

- **B1** (2026-10-04): en `master` (PR #3). Las 21 pruebas de integración pasan con runc y con
  runsc (gVisor instalado por apt), registrado con `--network=none`.
- **C1** (2026-10-04): en `master` (PR #4). Pest, prueba de humo y primer arranque con el
  volumen vacío verificados; la imagen del front con el `nginx.conf` nuevo se prueba en el
  primer `up --build`.

## Orden y paralelismo

- **Primera ola, en paralelo** (archivos disjuntos): B1, A1 y C1.
- **Segunda ola:** A2, C2 y C3.
- **Después:** A3, C4 y B2. Luego A4 y B3. Al final D1 y E1.

`src/app/main.tsx`, `package.json`, las configuraciones y la documentación los integra
siempre el agente principal, aunque dos subplanes corran en paralelo.

## Acciones del usuario (los agentes no las hacen)

| Cuándo | Acción |
|---|---|
| Antes de B1, tarea 8 (integración con gVisor) | Instalar gVisor (`runsc`), `sudo runsc install` y `sudo systemctl reload docker`. Como defensa en profundidad, agregar `"runtimeArgs": ["--network=none"]` al runtime `runsc` en `/etc/docker/daemon.json`. Después, correr `executor/scripts/smoke-gvisor.sh`. Si falla, se sigue con runc endurecido y se registra el riesgo (ADR 0005). |
| B1, A1 y C1 | Aprobar descargas: imágenes `golang:1.27-alpine`, `rust:1.99-slim`, `alpine:3.24`, `php:8.5-fpm-alpine`, `composer:2.10` y `mysql:9.7`; paquete npm `yaml`; paquetes Composer de Laravel 13, Pest 5, Sanctum y Fortify. Cada agente pide permiso con nombre, origen y tamaño antes de descargar. |
| C4 | Dominio, DNS (o DNS dinámico) y puertos 80/443 abiertos en el router. |

## Criterios de aceptación globales

Salen de los ADR:

- El oráculo `dump-globals-v2` es idéntico antes y después de mover el contenido (A1), y lo
  que devuelve `GET /api/content` también es idéntico a él (C2).
- El progreso real de master (`qa/fixtures/progress-master-2a278ad-storage.json`) entra a
  las tablas y vuelve a salir sin perder datos (D1).
- En el ejecutor local, todas las soluciones de referencia aprueban y todos los códigos
  iniciales fallan (B3).
- Cada subplan termina con `npm test`, `npm run lint`, `npm run format:check` y
  `git diff --check` en verde, y con las pruebas propias de su lenguaje (Go o Pest).
