# Quickstart: C5 · Estadísticas del admin

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contrato**: [contracts/http.md](./contracts/http.md)

Los comandos que verifican la entrega. En un worktree, cada comando de Docker lleva su propio `COMPOSE_PROJECT_NAME=<nombre-del-worktree>` en la misma línea (`backend/api/AGENTS.md`).

## 1. La compuerta de siempre (SC-009)

```sh
COMPOSE_PROJECT_NAME=spec-c5 npm run api:test
COMPOSE_PROJECT_NAME=spec-c5 npm run api:test -- --filter='Stats|NoStudentTexts|AdminAccessMatrix|UserShow|OversizedId'
COMPOSE_PROJECT_NAME=spec-c5 npm run api:format:check
COMPOSE_PROJECT_NAME=spec-c5 npm run api:analyse
npm test
npm run lint
npm run format:check
git diff --check
```

**Qué se espera:**
- la suite completa en verde, también en orden aleatorio: `npm run api:test -- --order-by=random --random-order-seed=777`;
- PHPStan en el nivel 9, sin errores;
- en `tests/Feature/Stats/`, cada cifra contra la población de `StatsWorld` (SC-001);
- `NoStudentTextsTest` recorre 14 rutas de `/api/admin` (SC-002);
- `AdminAccessMatrixTest` cubre 15 rutas.

## 2. Contra el stack (opcional, a mano)

Con el stack levantado y un admin con sesión, desde la consola del navegador o con `curl` y las cookies de la sesión:

```sh
GET /api/admin/stats/overview?from=2026-10-01&to=2026-10-20&granularity=week
GET /api/admin/stats/exercises?catalog=lab&language=rust
GET /api/admin/stats/students?sort=-lastActivity&inactiveSince=2026-10-10
GET /api/admin/stats/students/1
GET /api/admin/users/1          # la ficha, con usage
GET /api/admin/runs?perPage=10
GET /api/admin/queue
```

**Qué se espera:**
- las formas del contrato;
- `docker compose logs php | grep admin.student_viewed` muestra una línea por cada detalle, ficha o lista de ejecuciones filtrada por cuenta, sin cifras (SC-005).

Hasta que entren A4 y D1c, las cifras casi no tienen datos (spec, «De dónde salen los datos», 3).

## 3. La medición (SC-008, T017)

Antes de cargar hace falta el permiso de disco y de tiempo del usuario, porque escribe un volumen grande. La escala completa del ADR son 5 000 alumnos, 730 días y 30 000 intentos por día: unos 22 millones de intentos y unos 46 millones de veredictos, varias decenas de GB y horas de carga. El usuario decidió el 2026-10-28 (D1): la completa si el disco lo permite y, si no, `--per-day=7500`, extrapolando.

```sh
df -h /var/lib/docker
COMPOSE_PROJECT_NAME=spec-c5 sh backend/api/scripts/stats-bench.sh --students=5000 --days=730 --per-day=30000
COMPOSE_PROJECT_NAME=spec-c5 sh backend/api/scripts/stats-bench.sh --students=5000 --days=730 --per-day=7500
COMPOSE_PROJECT_NAME=spec-c5 docker compose --profile stats-bench down -v
```

- La primera línea mira el espacio libre antes de empezar.
- La segunda es la escala completa; la tercera, una cuarta parte, que se extrapola.
- La última borra el volumen al terminar.

El informe sale por la salida estándar, en Markdown. Para cada lector trae:
- el tiempo en frío en milisegundos;
- cada consulta con su `EXPLAIN` (`table`, `type`, `key` y `rows`);
- si se pasa de 2 000 ms.

El criterio para sumar un índice está en [research.md](./research.md), R8.

`stats:synthesize` y `stats:measure` se niegan a correr si la conexión efectiva no es `mysql-bench/taller_stats_bench`.
