# Implementation Plan: C2 · Contenido en MySQL

**Branch**: `001-c2-contenido-mysql` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-c2-contenido-mysql/spec.md`. Modelo de datos y DDL: [data-model.md](./data-model.md).

> **Para quien lo implementa.** El plan se reparte entre agentes de backend que trabajan a la vez, cada uno en su worktree y con archivos que no comparte con nadie (sección «Reparto en paralelo»). Leé la sección de tu agente completa y las «Reglas para todos los agentes». `tasks.md` tiene una línea por tarea (T001…) y remite acá. El código PHP, SQL, de Docker y de Compose que sigue es **referencia sin ejecutar**: se revisó, no se corrió (la sesión que lo escribió no tenía PHP ni MySQL y no usó Docker, por encargo). El TypeScript está **verificado**: corrió en un clon del repositorio con `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` (30 checks) en verde. Las pruebas son el contrato; el código de referencia se adapta hasta que pasen.

## Summary

C2 pasa el currículo de un documento embebido en el paquete del front a 21 tablas de MySQL y lo sirve por 17 recursos de sólo lectura, idénticos al documento, para que el progreso, los intentos y las estadísticas lo referencien con claves estables (spec, Intención y alcance). El enfoque:

- **El generador fija los bytes.** `tools/content` escribe `build/curriculum.meta.json` junto a `build/curriculum.json`: el sha256 de cada una de las 17 porciones (`JSON.stringify` compacto, con el orden de claves publicado), las tres huellas de cada ejercicio y las claves de las etapas de taller. PHP no recalcula nada: guarda y compara (FR-014, FR-028, FR-031).
- **Un solo render, de tablas a bytes.** Un encoder único (`PublishedJson`) y un códec por tipo de registro, que el import y la API comparten. La respuesta HTTP es ese texto tal cual: nunca `response()->json()` ni `JsonResource` (FR-014).
- **El import es incremental y se auto-chequea.** `content:import` calcula la diferencia en PHP, escribe sólo lo cambiado en una transacción, comprueba las reglas entre filas y arma las 17 porciones desde las tablas, que deben tener el hash del meta; recién entonces confirma y deja los cuerpos en la caché (FR-002 a FR-012).
- **La entrega no arma nada si no hace falta.** El `ETag` de una porción es su hash, sin build; un 304 sólo lee el último import; el cuerpo sale de la caché y, si falta, se arma en una foto consistente y se verifica contra el hash del import antes de servirlo (FR-017 a FR-023, FR-044).
- **El despliegue no se cuelga.** La imagen de la API genera su propio documento con el mismo generador; el servicio `migrate` aplica las migraciones y el import con espera de bloqueos acotada y un único reintento externo; si falla, `php` no se recrea (FR-033 a FR-037, FR-045, FR-046).

## Technical Context

**Language/Version**: PHP 8.5 (FPM) y Laravel 13 en `api/`; TypeScript en Node 24 en `tools/content/` y `qa/`.

**Primary Dependencies**: ninguna nueva. El código de referencia usa sólo `laravel/framework`, Pest y `symfony/process` (transitiva de Laravel, ya en `api/composer.lock`); la etapa `curriculum` instala con `npm ci` las mismas 243 dependencias del `package-lock.json` que el front. Ninguna dependencia de Composer ni de npm cambia (`composer.json`, `composer.lock` y `package-lock.json` quedan intactos).

**Storage**: MySQL 9.7 con `utf8mb4_es_0900_ai_ci`, 21 tablas nuevas (ver [data-model.md](./data-model.md)); caché de cuerpos en el store `database` de Laravel.

**Testing**: Pest contra MySQL 9.7 real (`npm run api:test`), con tres suites: `Unit` (PHP puro, sin aplicación), `Feature` (`RefreshDatabase`) y `Content` (`DatabaseTruncation`: el import, HTTP y el DDL confirman sus transacciones); checks TypeScript de `npm test`; `npm run api:content:check` y `api/scripts/deploy-check.sh` contra el stack levantado, fuera de `npm test`.

**Target Platform**: Docker Compose en un solo servidor, Linux o macOS (scripts de `sh` portables, sin opciones sólo de GNU).

**Project Type**: servicio web (API Laravel) más herramienta de contenido (`tools/content`).

**Performance Goals**: un 304 cuesta una lectura por clave primaria; el primer pedido después de un import no consulta tablas de contenido; cada intento de migración o import espera un bloqueo 5 s como máximo.

**Constraints**: bytes idénticos entre `JSON.stringify` y PHP (el contenido no tiene flotantes, `-0` ni pares surrogate sueltos); sin PHP ni Composer en el host (todo corre en contenedores, así que Docker es imprescindible); sin dependencias nuevas; `curriculum.json` y el oráculo `dump-globals` no cambian (FR-030).

**Scale/Scope**: 274 ejercicios, 822 pruebas, 822 pistas, 25 talleres con 100 etapas, 8 mundos, 32 conceptos del Atlas, la guía, 17 porciones y unos 1,07 MB en total (la porción más grande, `lab.go`, 287.343 bytes).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.2.2). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `api/AGENTS.md` (Pest contra MySQL real, `env()` sólo en `config/`, colaciones por columna) y `qa/AGENTS.md`; no repite sus reglas. La documentación que cambian las tareas (README, `qa/AGENTS.md`, `docs/architecture.md`, `api/AGENTS.md`) se actualiza en el mismo cambio (T026). |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con la prueba, que falla por la razón esperada (se nombra en cada paso). Los esperados salen del generador (`portions`, `contentHash`), del oráculo y de ejemplos escritos a mano, no del algoritmo probado. Los fixtures de mutación calculan su meta con `PublishedJson`: no es tautológico porque `ContentRoundTripTest` y `ContentContractTest` atan ese encoder al generador. |
| III. Código entendible | Sí, con revisión | Se prefieren pasos visibles a trucos. Archivos para revisar por cohesión, no por tamaño: `ContentRows` (286 líneas), `GuideCodec` (210) y `ContentDiff` (192); la complejidad ciclomática por función se revisa con ESLint (TS) y con la lectura del revisor (PHP). |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | Lo que sale del documento se retira (`deprecated` y `retired_at`), nunca `DELETE`; las claves foráneas son `RESTRICT`; `test_key` retirado no se reutiliza; las claves de etapa son inmutables y el índice v1 está congelado. |
| V. Capas y contratos explícitos | Sí | `api/app/Content/` separa lectura de documento, códecs, diferencia, escritura, lectura de tablas y entrega; el controlador es delgado. No se agregan servidores, frameworks ni dependencias. La ADR 0006 sigue en «propuesta» y se enmendó en línea. |
| VI. Español, accesibilidad y portabilidad | Sí | Mensajes de error y avisos del import en español; C2 no tiene interfaz; scripts de `sh` portables entre Linux y macOS. |
| VII. Secretos y salidas generadas fuera de Git | Sí | `build/` sigue ignorado y `resources/content/` sólo existe dentro de las imágenes; ningún secreto entra al contexto (`.env` queda afuera); sin dependencias nuevas. La primera construcción de la etapa `curriculum` descarga paquetes de npm y necesita permiso del usuario (ver «Descargas»). |
| VIII. Flow-forward | Sí | `tasks.md` es una línea por tarea con, como mucho, su commit; si falta algo, `/speckit-converge` agrega tareas al final; al entregar, el directorio queda inmutable. |

## Project Structure

### Documentation (this feature)

```text
specs/001-c2-contenido-mysql/
├── spec.md              # qué y por qué, con las decisiones de clarify
├── plan.md              # este archivo: cómo, repartido en dueños de archivos disjuntos
├── data-model.md        # DDL de las 21 tablas, reglas entre filas, criterios de verificación
├── tasks.md             # una línea por tarea, por onda y por dueño
└── checklists/requirements.md
```

### Source Code (repository root)

```text
tools/content/           meta.ts (nuevo); catalogs.ts, workshops.ts, load-curriculum.ts, build-curriculum.ts
content/workshops/       las 25 fichas, con `id` y `v1Index` por etapa
qa/                      curriculum-meta-check.ts y api-content-check.ts (nuevos); run-checks.ts;
                         fixtures/workshop-steps-v1.json (nuevo)
api/
├── Dockerfile           etapa `curriculum` y copia de migrate.sh
├── docker/migrate.sh    el paso `migrate`: migraciones e import, con un único backoff
├── config/              content.php (nuevo); database.php (UTC, alias de upsert, init command)
├── database/migrations/ las 21 migraciones de contenido
├── app/Content/         PublishedJson, Portion, ContentSource, códecs (Codec/), ContentRows,
│                        PortionAssembler, ContentDiff, ContentWriter, ContentInvariants, ImportLock,
│                        ContentImporter, ContentReader, PortionRenderer, BodyCache, ContentImports,
│                        ContentSnapshot, ConditionalRequest, ContentDelivery
├── app/Console/Commands/ImportContent.php
├── app/Http/            ApiError.php; Controllers/ContentController.php
├── routes/api.php
├── scripts/deploy-check.sh
└── tests/               Unit/, Feature/ (ConnectionTest, ContentSchemaTest), Content/, Support/
compose.yaml  package.json  README.md  docs/architecture.md  qa/AGENTS.md  api/AGENTS.md
```

**Structure Decision:** se mantiene la estructura que dejó C1 (`api/` con `app/`, `database/`, `routes/` y `tests/`) y el generador de A1 (`tools/content/`); lo nuevo vive en `api/app/Content/`, una carpeta por responsabilidad y no por capa, sin barrels ni carpetas vacías.

## Decisiones que se apartan del ADR 0006

Cada una se registra acá y en el informe, para ratificarla junto con el ADR (que sigue en «propuesta»).

1. **La entrega es un controlador con un servicio (`ContentDelivery`), no un middleware (D11).** El 304, el 422 de parámetros, el 410 de un ejercicio retirado y la verificación del cuerpo comparten el último `content_imports` y el pedido resuelto; repartirlos entre un middleware y un controlador duplicaría esa resolución y dejaría el orden de evaluación escondido en el enrutamiento. Un servicio con un orden explícito se prueba entero por HTTP. El ADR ya lo dice en su encabezado.
2. **`READ COMMITTED` se fija en el código del import, con `SET TRANSACTION` antes de abrir la transacción, y no con `isolation_level` en la configuración de `migrate`.** Es el único escritor del servicio y así la prueba lo ejerce sin cambiar el entorno del proceso. El DBA lo recomendaba en la configuración de `migrate`; el efecto es el mismo.
3. **Un solo `attempts: 1` y un único reintento externo** (3 intentos, pausas de 5 y 15 s, sólo ante 1205 y 1213) en lugar del `attempts: 3` de §8: ya enmendado en el ADR y en FR-035.
4. **No se agrega el umbral de `EXPLAIN FORMAT=TREE` que el DBA proponía para las lecturas de porciones:** la más grande lee 274 filas y el esquema no suma índices.
5. **El criterio J del DBA (privilegios con un usuario restringido) pasa a C3** con `db-grants`, junto con el chequeo de transacciones largas (FR-036).

## Review Focus

Lo que el revisor mira primero, porque es lo que ninguna prueba cubre del todo o lo que más cuesta equivocar:

- **Igualdad de bytes.** `PublishedJson` frente a `JSON.stringify`: banderas del encoder, `{}` frente a `[]`, claves numéricas en un objeto, U+2028 y U+2029, la barra `/`. Si el contenido incorpora algún día un flotante, `-0` o un par surrogate suelto, el auto-chequeo bloquea el despliegue (riesgo aceptado, spec Assumptions).
- **El import.** Que una transacción sola cubra escritura, invariantes y auto-chequeo; que el candado `GET_LOCK` siga siendo de la conexión antes de abrirla; que la diferencia sea estricta (nunca `=` sobre `_ai_ci`) y fila por fila, con `key_order`; que A, B, A suba una sola versión de corrección; que un `source_commit` distinto no registre un import.
- **Las consultas de invariantes.** Cada una devuelve una fila si la regla se rompe: revisá que no den falsos positivos con el contenido real y que la prueba que las rompe a mano las ejerza una por una.
- **La entrega.** Que un 304 sólo lea `content_imports` (y la fila del ejercicio, en `GET /api/exercises/{id}`); que el 410 se evalúe antes que el 304; que un cuerpo armado se verifique contra el hash del import antes de servirse o guardarse; que nada pase por `JsonResource`.
- **El DDL.** Nombres de restricciones, las 22 claves foráneas con `RESTRICT` escrito, `REGEXP_LIKE(..., 'c')`, el orden de los ENUM, y que sólo la clave primaria sea única.
- **`migrate.sh` y Compose.** Que reintente sólo ante 1205 y 1213, que el estado de salida sea el del último intento, que `MYSQL_ATTR_INIT_COMMAND` esté sólo en `migrate`, y que `php` dependa de `migrate` sin recrearse si falla (lo comprueba `deploy-check.sh`, que no se pudo ejecutar acá).
- **La imagen.** Que la etapa `curriculum` copie sólo rutas explícitas, reutilice la capa de `npm ci` del front y deje el commit después de ella.
- **No tautología.** Que los fixtures de las pruebas del import y de la entrega calculen su meta con `PublishedJson` y su JSON canónico, y que `ContentFixtureTest` los ate al generador.

## Reparto en paralelo

Los dueños tienen archivos disjuntos; cada uno trabaja en su worktree, parte de la base que integra el coordinador y entrega una rama que el coordinador integra sin conflictos. Las dos últimas columnas de la segunda tabla dicen quién consume qué de quién.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | Coordinador | **Base**: generador y meta (T001 a T004), configuración, esquema de suites e imagen (T005 a T007). Es mecánica: los cambios de esta sección están verificados (TypeScript) o son parches chicos. Todo lo demás parte de acá. |
| 1 | Agentes A, B y C, a la vez | **A** Esquema (T008 a T010) · **B** Formato y códecs (T011 a T015) · **C** Despliegue (T016 a T018) |
| 2 | Agentes W y E, a la vez, con A y B integrados | **W** Lectura e import (T019 a T021) · **E** Entrega (T022 y T023), con un punto de sincronización con W |
| 3 | Coordinador | **Integración y cierre** (T024 a T028): `compose.yaml`, `package.json`, documentación, medición del tmpfs y la compuerta final |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee (nadie más los toca) | Consume de otro | Entrega a otro |
| --- | --- | --- | --- |
| Coordinador (base y cierre) | `tools/content/*`, `content/workshops/*.yaml`, `qa/curriculum-meta-check.ts`, `qa/fixtures/workshop-steps-v1.json`, `qa/run-checks.ts`; `api/Dockerfile`, `compose.yaml`, `package.json`, `api/phpunit.xml`, `api/tests/Pest.php`, `api/config/database.php`, `api/config/content.php`, `api/tests/Feature/ConnectionTest.php`; README, `qa/AGENTS.md`, `docs/architecture.md`, `api/AGENTS.md`, `api/scripts/smoke.sh` | `api/docker/migrate.sh` y `qa/api-content-check.ts` (de C) | `build/curriculum.json` y `build/curriculum.meta.json` (el meta de abajo); `resources/content/` dentro de la imagen `dev`; las suites `Unit` y `Content`; UTC y alias de upsert |
| A · Esquema | `api/database/migrations/2026_10_05_1000NN_*.php` (21), `api/tests/Feature/ContentSchemaTest.php`, `api/tests/Content/{SchemaBehaviorTest,MigrationsTest,OnlineDdlTest,LockWaitTest}.php`, `api/tests/Support/ContentDatabase.php` | `data-model.md` (DDL) | las 21 tablas; `Tests\Support\ContentDatabase` |
| B · Formato y códecs | `api/app/Content/{PublishedJson,Portion,InvalidPortionRequest,InvalidContent,ContentSource,ContentTables,RowSet,ContentRows,PortionAssembler}.php`, `api/app/Content/Codec/*`, `api/tests/Unit/{PublishedJson,Portion,ContentSource,ContentFixture,ContentRows,ContentRoundTrip}Test.php`, `api/tests/Support/ContentFixture.php` | el meta y `resources/content/` (base) | las clases de PHP puro que usan W y E |
| C · Despliegue | `api/docker/migrate.sh`, `api/tests/Unit/MigrateScriptTest.php`, `api/scripts/deploy-check.sh`, `qa/api-content-check.ts` | — (usa el comando `php artisan content:import` por su nombre) | el script y los dos checks, que el coordinador conecta en T024 y T025 |
| W · Lectura e import | `api/app/Content/{ContentPlan,ContentReport,LatestImport,ContentDiff,ContentStore,ContentWriter,ContentInvariants,ImportLock,ContentMismatch,JsonDiff,ContentReader,PortionRenderer,BodyCache,ContentImports,ContentSnapshot,ContentImporter}.php`, `api/app/Console/Commands/ImportContent.php`, `api/tests/Unit/ContentDiffTest.php`, `api/tests/Content/{ImportContentTest,ContentContractTest}.php` | de A: las tablas y `ContentDatabase`; de B: `PublishedJson`, `Portion`, `ContentSource`, `ContentTables`, `RowSet`, `ContentRows`, `PortionAssembler`, `InvalidContent`, `ContentFixture` | a E: `ContentImports`, `LatestImport`, `BodyCache`, `PortionRenderer`, `ContentSnapshot` y el comando `content:import` |
| E · Entrega | `api/app/Http/ApiError.php`, `api/app/Http/Controllers/ContentController.php`, `api/app/Content/{ConditionalRequest,ContentDelivery}.php`, `api/routes/api.php`, `api/tests/Content/ContentEndpointTest.php` | de A: `ContentDatabase`; de B: `Portion`, `InvalidPortionRequest`, `ContentFixture`; de W: las clases de lectura y el comando `content:import` | los 17 recursos y el 304 |

Los archivos compartidos los integra el coordinador, según AGENTS.md: `compose.yaml`, `api/Dockerfile`, `package.json`, `package-lock.json`, `api/phpunit.xml`, `api/tests/Pest.php`, `api/config/*`, la documentación y `.gitignore`/`.dockerignore`. Ningún agente los edita; si necesita un cambio, lo pide.

**El contrato del meta** (`build/curriculum.meta.json`, lo escribe el generador y lo consumen B, W y E; el esquema es el del archivo verificado de abajo):

- `documentHash`: sha256 de `curriculum.json`; `sourceCommit`: `null` o 40 o 64 hexadecimales; `languages`: `["rust", "go"]`.
- `catalogs`: `[{code, sliceBy, chainPosition}]` de `lab`, `quests` y `cores`, con `chainPosition: null`.
- `portions`: las 17 porciones por nombre (`lab.rust`, …, `guide`), cada una con el sha256 de `JSON.stringify(parte)`.
- `exercises`: por ID de ejercicio, `{contentHash, gradingHash, starterHash}`; `contentHash` es sobre los bytes publicados, los otros dos sobre JSON canónico (claves ordenadas).
- `workshopSteps`: por ID de taller, la lista de `{id, v1Index}` de sus etapas (`v1Index` es `null` para una etapa nueva).

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** la base está lista (T007 verde): todos parten de ella.
- **S1:** A y B integrados: W y E parten de la base más A y B.
- **S2:** W terminó T021 (el import verde): el coordinador lo integra en el worktree de E, que corre entonces las pruebas de entrega que necesitan datos.

## Reglas para todos los agentes

- **Leé primero** `AGENTS.md`, `api/AGENTS.md` (y `qa/AGENTS.md` si tocás TypeScript), la constitución y la spec. Skills: `tdd`, `laravel-tdd`, `laravel-specialist` y, para el diseño de clases, `codebase-design`.
- **TDD, siempre.** Copiá las pruebas de tu sección, corrélas y comprobá que fallan por la razón que dice el paso. Recién entonces implementá, con el código de referencia como punto de partida. Si una prueba falla por un defecto del código de referencia, corregí el código; si creés que la prueba está mal, avisá al coordinador antes de cambiarla.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedilo; no lo parchees.
- **Comandos.** `npm run api:test -- --filter=Nombre` (reconstruye la imagen de pruebas), `npm run api:test -- --testsuite=Unit` y `npm run api:format:check` (Pint; si falla, `docker compose --profile test run --rm --build --no-deps --entrypoint php test vendor/bin/pint --test -v` muestra el diff y lo corregís a mano). `npm run api:test:down` apaga la base de pruebas.
- **El `.env` de cada worktree.** Es de Git ignorado, así que un worktree nuevo no lo tiene, y sin él `compose.yaml` se niega a correr cualquier comando, `npm run api:test` incluido. Creálo antes de nada con `sh api/scripts/init-env.sh`: agrega `APP_KEY`, `MYSQL_PASSWORD` y `MYSQL_ROOT_PASSWORD` aleatorios, no descarga nada y queda fuera de Git y de las imágenes.
- **Trabajo en paralelo.** `compose.yaml` fija `name: taller-rust-go`, así que dos worktrees compartirían contenedores, redes y la base de pruebas. En cada terminal exportá un nombre propio antes de usar Compose: `export COMPOSE_PROJECT_NAME=taller-c2-<agente>` (por ejemplo `taller-c2-a`); la variable pesa más que `name:`. Nadie levanta el stack completo (`docker compose up`, puerto 8080) salvo el coordinador. Cada base de pruebas reserva hasta 1 GB de tmpfs.
- **Estilo.** Código y pruebas en inglés (identificadores, nombres de tests y comentarios); los mensajes que lee quien usa u opera el taller, en español. Comentarios sólo para una función, clase o método complejo, o para una referencia puntual (`AGENTS.md`, «Convenciones», enmendado el 2026-10-05). El código de referencia de este plan trae comentarios y nombres de tests en español: al transcribirlo, los nombres se traducen y los comentarios se quitan, salvo los que cumplan esa regla, que se traducen. PHP con Pint, TypeScript con Prettier y ESLint.
- **Commits.** Chicos, en español, uno por unidad que un revisor pueda juzgar y revertir (la prueba con la implementación que verifica), con el trailer `Co-Authored-By` de tu modelo y sin `git push`. La evidencia de una tarea cerrada es su commit: el coordinador lo anota como la sublínea de `tasks.md`, sin salidas de comandos ni bitácoras. Lo que midas va en el mensaje del commit y en tu informe.
- **Al terminar,** informá: tareas cerradas, comandos corridos con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 1. Base (coordinador, onda 0)

**Cubre:** US5 (FR-006 en lo que toca al meta, FR-028 a FR-032), FR-037, FR-045 y la parte de conexión de FR-041. **Responsable:** el coordinador; T001 a T004 son TypeScript verificado y se pueden delegar en un agente aparte, pero conviene que cierren antes de nada, porque el meta es lo que todos consumen. **Entrega:** una rama base `c2/base` con commits chicos, de la que parten A, B y C.

**Compuerta de la base (punto S0):**

- `npm run build`, `npm test`, `npm run lint` y `npm run format:check` en verde, con el sha256 de `build/curriculum.json` y el del volcado de `dump-globals` iguales a los de antes (SC-006, FR-030).
- `docker compose build php` termina bien y la imagen trae `resources/content/curriculum.json` y `curriculum.meta.json` con el mismo `documentHash` que el generador del host.
- `npm run api:test -- --filter=ConnectionTest` en verde.

**Vuelta atrás:** revertir los commits de la base; ningún otro dueño depende todavía de ellos.

### Tarea 1.1 · La prueba del meta, que falla (T001)

**Archivos:** crear `qa/curriculum-meta-check.ts`; modificar `qa/run-checks.ts`.

**Qué prueba:** `documentHash` es el sha256 del documento escrito; hay una huella por cada una de las 17 porciones y por cada ejercicio publicado, calculadas sobre los bytes que se publican (`JSON.stringify` de la parte); cada taller tiene una clave por etapa, sin repetir; y las 100 etapas de v1 conservan su clave y su índice congelado (`qa/fixtures/workshop-steps-v1.json`, que nunca se regenera).

1. Copiá el check y registralo en `qa/run-checks.ts`:

`qa/curriculum-meta-check.ts` (verificado)

```ts
// build/curriculum.meta.json corresponde al build/curriculum.json que generó el mismo
// `npm run curriculum` (pretypecheck) y respeta lo que content:import da por sentado (ADR 0006):
// - documentHash es el sha256 del documento;
// - hay una huella por cada una de las 17 porciones y por cada ejercicio publicado, ni una más
//   ni una menos, calculadas sobre los bytes que se publican (JSON.stringify de la parte);
// - cada etapa de taller tiene su clave estable, y las 100 etapas de v1 conservan la suya y su
//   índice congelado (qa/fixtures/workshop-steps-v1.json: contrato, nunca se regenera).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Hashes {
  contentHash: string;
  gradingHash: string;
  starterHash: string;
}
interface StepKey {
  id: string;
  v1Index: number | null;
}
interface Meta {
  documentHash: string;
  sourceCommit: string | null;
  languages: string[];
  catalogs: { code: string; sliceBy: string; chainPosition: number | null }[];
  portions: Record<string, string>;
  exercises: Record<string, Hashes>;
  workshopSteps: Record<string, StepKey[]>;
}
type Part = Record<string, unknown>[];
interface Curriculum {
  lab: Record<string, Part>;
  quests: Record<string, Part>;
  cores: Record<string, Part>;
  campaign: Record<string, Part>;
  workshops: Record<string, { id: string; steps: unknown[] }[]>;
  guide: unknown;
  atlas: Record<string, Part>;
}

const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
const SHA256 = /^[0-9a-f]{64}$/;

const build = join(import.meta.dirname, '..', 'build');
const document = readFileSync(join(build, 'curriculum.json'));
const meta = JSON.parse(readFileSync(join(build, 'curriculum.meta.json'), 'utf8')) as Meta;
const curriculum = JSON.parse(document.toString('utf8')) as Curriculum;

assert.equal(meta.documentHash, sha256(document), 'documentHash es el sha256 de curriculum.json');

// Las 17 porciones, derivadas del documento ya escrito y no del objeto en memoria del generador.
const languages = ['rust', 'go'];
const domains = ['lowlevel', 'infra', 'play', 'pc'];
const parts: [string, unknown][] = [
  ...languages.map((l): [string, unknown] => [`lab.${l}`, curriculum.lab[l]]),
  ...languages.map((l): [string, unknown] => [`quests.${l}`, curriculum.quests[l]]),
  ...domains.map((d): [string, unknown] => [`cores.${d}`, curriculum.cores[d]]),
  ...languages.map((l): [string, unknown] => [`campaign.${l}`, curriculum.campaign[l]]),
  ...domains.map((d): [string, unknown] => [`workshops.${d}`, curriculum.workshops[d]]),
  ...languages.map((l): [string, unknown] => [`atlas.${l}`, curriculum.atlas[l]]),
  ['guide', curriculum.guide],
];
assert.equal(parts.length, 17);
assert.deepEqual(
  Object.keys(meta.portions),
  parts.map(([name]) => name),
  'las 17 porciones, en orden',
);
for (const [name, part] of parts) {
  assert.equal(meta.portions[name], sha256(JSON.stringify(part)), `portions.${name}`);
}

const exercises = [
  ...languages.flatMap((l) => curriculum.lab[l]),
  ...languages.flatMap((l) => curriculum.quests[l]),
  ...domains.flatMap((d) => curriculum.cores[d]),
];
assert.deepEqual(
  Object.keys(meta.exercises).sort(),
  exercises.map((exercise) => exercise.id as string).sort(),
  'un juego de huellas por ejercicio',
);
for (const exercise of exercises) {
  const hashes = meta.exercises[exercise.id as string];
  assert.equal(hashes.contentHash, sha256(JSON.stringify(exercise)), `${exercise.id}.contentHash`);
  for (const key of ['contentHash', 'gradingHash', 'starterHash'] as const) {
    assert.match(hashes[key], SHA256, `${exercise.id}.${key}`);
  }
}

// Una clave por etapa publicada, en el mismo orden, y ninguna repetida dentro del taller.
const workshops = domains.flatMap((d) => curriculum.workshops[d]);
assert.deepEqual(
  Object.keys(meta.workshopSteps).sort(),
  workshops.map((workshop) => workshop.id).sort(),
  'claves de etapa para cada taller',
);
for (const workshop of workshops) {
  const keys = meta.workshopSteps[workshop.id];
  assert.equal(keys.length, workshop.steps.length, `${workshop.id}: una clave por etapa`);
  assert.equal(
    new Set(keys.map((key) => key.id)).size,
    keys.length,
    `${workshop.id}: claves únicas`,
  );
}

// Contrato v1: cada etapa que ya existía conserva su clave y su índice. Se pueden sumar etapas
// nuevas (v1Index null), nunca cambiar ni quitar estas.
const frozen = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures', 'workshop-steps-v1.json'), 'utf8'),
) as Record<string, StepKey[]>;
for (const [workshop, keys] of Object.entries(frozen)) {
  for (const frozenKey of keys) {
    assert.ok(
      meta.workshopSteps[workshop]?.some(
        (key) => key.id === frozenKey.id && key.v1Index === frozenKey.v1Index,
      ),
      `${workshop}: la etapa ${frozenKey.id} (v1Index ${frozenKey.v1Index}) cambió o desapareció`,
    );
  }
}
assert.equal(Object.values(frozen).flat().length, 100, 'el contrato v1 fija las 100 etapas');

console.log(
  `curriculum-meta-check: ${parts.length} porciones, ${exercises.length} ejercicios y ${Object.values(meta.workshopSteps).flat().length} etapas con su huella y su clave PASS.`,
);
```

Cambio en `qa/run-checks.ts` (verificado):

```diff
--- a/qa/run-checks.ts
+++ b/qa/run-checks.ts
@@ -12,6 +12,7 @@
   'content-records-check.ts',
   'content-guide-check.ts',
   'content-atlas-check.ts',
+  'curriculum-meta-check.ts',
   'curriculum-ids-check.ts',
   'atlas-check.ts',
   'guide-content-check.ts',
```

2. Corré `npm run curriculum && node qa/curriculum-meta-check.ts`. **Esperado:** falla con `ENOENT: no such file or directory, open '…/build/curriculum.meta.json'`, porque el generador todavía no escribe el meta (salida real en un clon del repositorio).

### Tarea 1.2 · Codemod de etapas y lectura de sus claves (T002)

**Archivos:** modificar los 25 `content/workshops/<id>.yaml` (por el codemod, que no se versiona); crear `qa/fixtures/workshop-steps-v1.json` (lo escribe el codemod); modificar `tools/content/workshops.ts` y `tools/content/load-curriculum.ts`.

1. Antes de tocar nada, anotá la línea base: `npm run curriculum && sha256sum build/curriculum.json && node tools/content/dump-globals.ts . | sha256sum`. Sobre `master` al 2026-10-05 el documento da `ef8f57154734653554d40a43934c97f34ed550aad54867e31b197365355803d4` y el volcado empieza con `cd1f9e62…` (la línea base de A1). Si el contenido cambió desde entonces, lo que vale es que antes y después den lo mismo.
2. Guardá el codemod fuera del repositorio (un directorio temporal) y corrélo una sola vez, desde la raíz: `node /ruta/codemod-etapas.ts .`. Agrega a cada etapa `id: e<N>` y `v1Index: <posición>` y escribe el fixture; correrlo dos veces duplicaría las claves.

`codemod-etapas.ts (se corre una vez, fuera del repositorio)` (verificado)

```ts
// Codemod de una sola vez (ADR 0006 D14, C2): agrega a cada etapa de content/workshops/*.yaml su
// clave estable `id: e<N>` y su índice v1 congelado `v1Index: <posición>`, sin tocar el resto del
// texto, y escribe qa/fixtures/workshop-steps-v1.json, el contrato de esas 100 etapas. No se
// versiona: queda el diff de los YAML. Correrlo dos veces duplicaría las claves.
// Uso: node codemod-etapas.ts [raíz]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const folder = join(root, 'content', 'workshops');
const frozen: Record<string, { id: string; v1Index: number }[]> = {};
let total = 0;
for (const name of readdirSync(folder).sort()) {
  if (!name.endsWith('.yaml') || name === 'manifest.yaml') continue;
  const lines = readFileSync(join(folder, name), 'utf8').split('\n');
  const out: string[] = [];
  const keys: { id: string; v1Index: number }[] = [];
  let inSteps = false;
  for (const line of lines) {
    // Un bloque de primer nivel empieza en la columna 0: `steps:` abre el que importa.
    if (/^\S/.test(line)) inSteps = line === 'steps:';
    if (inSteps && line.startsWith('  - title:')) {
      const index = keys.length;
      keys.push({ id: `e${index + 1}`, v1Index: index });
      out.push(`  - id: e${index + 1}`, `    v1Index: ${index}`, `    title:${line.slice('  - title:'.length)}`);
    } else {
      out.push(line);
    }
  }
  if (keys.length === 0) throw new Error(`${name}: no tiene etapas`);
  writeFileSync(join(folder, name), out.join('\n'));
  frozen[name.replace(/\.yaml$/, '')] = keys;
  total += keys.length;
}
mkdirSync(join(root, 'qa', 'fixtures'), { recursive: true });
writeFileSync(join(root, 'qa', 'fixtures', 'workshop-steps-v1.json'), JSON.stringify(frozen, null, 2) + '\n');
console.log(`${total} etapas con clave`);
```

   **Esperado:** `100 etapas con clave`; `git diff --stat content/workshops` muestra 25 archivos con 200 inserciones y ninguna eliminación; `git status` suma `qa/fixtures/workshop-steps-v1.json`.
3. Aplicá los cambios del cargador. Las claves de etapa viajan por separado y la etapa publicada conserva sus cuatro textos de siempre:

Cambio en `tools/content/workshops.ts` (verificado):

```diff
--- a/tools/content/workshops.ts
+++ b/tools/content/workshops.ts
@@ -1,8 +1,13 @@
 // Talleres de Sistemas: content/workshops/manifest.yaml ordena los IDs por dominio y cada
 // content/workshops/<id>.yaml es la ficha que publica SYSTEMS_<DOMINIO>.workshops. Cada dominio
 // conserva su orden de claves legacy porque el YAML es el objeto tal cual.
+//
+// Excepción: cada etapa (`steps`) lleva en el YAML una clave estable `id` y, si ya existía en el
+// formato v1, su `v1Index` (ADR 0006 D14). Ninguna de las dos se publica hasta D1: la etapa
+// publicada son sus cuatro textos de siempre y las claves viajan por separado, al meta.
 import { LEVEL_IDS } from '../../src/shared/config/levels.ts';
 import { LANGUAGES, SYSTEMS_DOMAINS, type SystemsDomain } from './catalogs.ts';
+import { child, fail, filePlace } from './content-error.ts';
 import { loadGroupedRecords } from './records.ts';
 import {
   checkQuestion,
@@ -17,9 +22,40 @@
   type JsonRecord,
 } from './shape.ts';

+export interface WorkshopStepKey {
+  id: string;
+  v1Index: number | null;
+}
+// Por ID de taller, las claves de sus etapas en el orden publicado.
+export type WorkshopStepKeys = Record<string, WorkshopStepKey[]>;
+
+export interface LoadedWorkshops {
+  workshops: Record<SystemsDomain, JsonRecord[]>;
+  stepKeys: WorkshopStepKeys;
+}
+
 const perLanguage = (check: Check): Check =>
   recordOf(Object.fromEntries(LANGUAGES.map((language) => [language, check])));

+const STEP_KEY = /^[a-z][a-z0-9-]{0,63}$/;
+
+const expectStepKey: Check = (value, place) => {
+  const key = expectText(value, place);
+  if (!STEP_KEY.test(key)) {
+    fail(place, 'se esperaba una clave en minúsculas, dígitos y guiones (hasta 64), como e1');
+  }
+  return key;
+};
+
+const STEP_SPEC: Record<string, Check> = {
+  id: expectStepKey,
+  v1Index: integer(0),
+  title: expectText,
+  task: expectText,
+  why: expectText,
+  done: expectText,
+};
+
 const WORKSHOP_SPEC: Record<string, Check> = {
   id: expectText,
   // Las categorías que conoce systems.js.
@@ -36,16 +72,52 @@
   limits: expectText,
   objectives: listOf(recordOf({ id: expectText, label: expectText, why: expectText }), 1),
   prediction: checkQuestion,
-  steps: listOf(
-    recordOf({ title: expectText, task: expectText, why: expectText, done: expectText }),
-    1,
-  ),
+  steps: listOf(recordOf(STEP_SPEC, ['v1Index']), 1),
   sources: listOf(checkSource, 1),
   code: perLanguage(expectText),
   related: perLanguage(textList(1)),
   bridge: perLanguage(expectText),
 };

-export function loadWorkshops(root: string): Record<SystemsDomain, JsonRecord[]> {
-  return loadGroupedRecords(root, 'content/workshops', SYSTEMS_DOMAINS, WORKSHOP_SPEC);
+// La etapa como se publica: sin `id` ni `v1Index`, y con los demás textos en su orden.
+function publishedStep(step: JsonRecord): JsonRecord {
+  const published: JsonRecord = {};
+  for (const [key, value] of Object.entries(step)) {
+    if (key !== 'id' && key !== 'v1Index') published[key] = value;
+  }
+  return published;
+}
+
+// Las claves de un taller, sin repetir ninguna: ni el `id` ni el `v1Index` de una etapa pueden
+// estar en dos etapas del mismo taller.
+function stepKeysOf(workshop: JsonRecord): WorkshopStepKey[] {
+  const file = filePlace(`content/workshops/${workshop.id as string}.yaml`);
+  const seenIds = new Set<string>();
+  const seenIndexes = new Set<number>();
+  return (workshop.steps as JsonRecord[]).map((step, index) => {
+    const at = child(child(file, 'steps'), index);
+    const id = step.id as string;
+    if (seenIds.has(id)) fail(child(at, 'id'), `«${id}» se repite en el taller`);
+    seenIds.add(id);
+    const v1Index = Object.hasOwn(step, 'v1Index') ? (step.v1Index as number) : null;
+    if (v1Index !== null) {
+      if (seenIndexes.has(v1Index)) fail(child(at, 'v1Index'), `${v1Index} se repite en el taller`);
+      seenIndexes.add(v1Index);
+    }
+    return { id, v1Index };
+  });
+}
+
+export function loadWorkshops(root: string): LoadedWorkshops {
+  const loaded = loadGroupedRecords(root, 'content/workshops', SYSTEMS_DOMAINS, WORKSHOP_SPEC);
+  const stepKeys: WorkshopStepKeys = {};
+  const workshops = {} as Record<SystemsDomain, JsonRecord[]>;
+  for (const domain of SYSTEMS_DOMAINS) {
+    workshops[domain] = loaded[domain].map((workshop) => {
+      stepKeys[workshop.id as string] = stepKeysOf(workshop);
+      const steps = (workshop.steps as JsonRecord[]).map(publishedStep);
+      return { ...workshop, steps };
+    });
+  }
+  return { workshops, stepKeys };
 }
```

Cambio en `tools/content/load-curriculum.ts` (verificado):

```diff
--- a/tools/content/load-curriculum.ts
+++ b/tools/content/load-curriculum.ts
@@ -8,7 +8,7 @@
 import { expectDistinctIds, interleaveCores, loadLanguage } from './exercises.ts';
 import { loadGuide } from './guide.ts';
 import type { JsonRecord } from './shape.ts';
-import { loadWorkshops } from './workshops.ts';
+import { loadWorkshops, type WorkshopStepKeys } from './workshops.ts';

 export interface Curriculum {
   lab: Record<Language, JsonRecord[]>;
@@ -20,7 +20,13 @@
   atlas: Record<Language, JsonRecord[]>;
 }

-export function loadCurriculum(root: string): Curriculum {
+// El documento publicado y lo que viaja aparte, al meta (curriculum.meta.json), sin publicarse.
+export interface CurriculumSource {
+  curriculum: Curriculum;
+  workshopSteps: WorkshopStepKeys;
+}
+
+export function loadCurriculumSource(root: string): CurriculumSource {
   // Nada queda en content/ sin que el generador lo lea (la política de catalog-files.ts).
   expectOnlyEntries(
     root,
@@ -31,13 +37,19 @@
   const rust = loadLanguage(root, 'rust');
   const go = loadLanguage(root, 'go');
   expectDistinctIds(rust, go);
-  return {
+  const { workshops, stepKeys } = loadWorkshops(root);
+  const curriculum: Curriculum = {
     lab: { rust: rust.lab, go: go.lab },
     quests: { rust: rust.quests, go: go.quests },
     cores: interleaveCores(rust, go),
     campaign: loadCampaign(root),
-    workshops: loadWorkshops(root),
+    workshops,
     guide: loadGuide(root),
     atlas: loadAtlas(root),
   };
+  return { curriculum, workshopSteps: stepKeys };
+}
+
+export function loadCurriculum(root: string): Curriculum {
+  return loadCurriculumSource(root).curriculum;
 }
```

4. Corré `npm run curriculum` y comprobá que el sha256 del documento y el del volcado de `dump-globals` son los de la línea base. **Esperado:** idénticos (verificado: `ef8f5715…` y `cd1f9e6240e291ec…` antes y después).
5. `npm run typecheck` y `npx prettier --check content/workshops qa/fixtures/workshop-steps-v1.json tools/content` en verde.

### Tarea 1.3 · El meta del generador (T003)

**Archivos:** crear `tools/content/meta.ts`; modificar `tools/content/catalogs.ts` y `tools/content/build-curriculum.ts`.

**Interfaz que entrega** (el contrato del meta está en «Reparto en paralelo»):

| Módulo | Exporta |
| --- | --- |
| `tools/content/meta.ts` | `interface ExerciseHashes`<br>`interface CurriculumMeta`<br>`export function canonicalJson(value: unknown): string`<br>`export function sha256Hex(text: string): string`<br>`export function exerciseHashes(exercise: JsonRecord): ExerciseHashes`<br>`export function portionsOf(curriculum: Curriculum): Record<string, unknown>`<br>`export function sourceCommitFrom(env: Record<string, string | undefined>): string | null`<br>`export function curriculumMeta( curriculum: Curriculum, document: string, sourceCommit: string | null, workshopSteps: WorkshopStepKeys, ): CurriculumMeta` |

1. Aplicá los cambios de `catalogs.ts` y `build-curriculum.ts` y creá `meta.ts`. `build-curriculum.ts` escribe el documento primero y su meta después, los dos de forma atómica: si el proceso muere en el medio queda un meta viejo, que el import rechaza por `documentHash`, nunca un par que parezca válido.

Cambio en `tools/content/catalogs.ts` (verificado):

```diff
--- a/tools/content/catalogs.ts
+++ b/tools/content/catalogs.ts
@@ -3,6 +3,16 @@
 export type Language = 'rust' | 'go';
 export const LANGUAGES: readonly Language[] = ['rust', 'go'];

+// Catálogos de ejercicios que registra content:import (ADR 0006 §5.1). `sliceBy` dice por qué
+// parámetro se corta el recurso de cada uno: lab y quests por lenguaje, cores por dominio.
+// `chainPosition` es el lugar en la cadena de catálogos; null = fuera de la cadena, porque abarcan
+// varios niveles. E1 suma `essentials` con la posición 1.
+export const CATALOGS = [
+  { code: 'lab', sliceBy: 'language', chainPosition: null },
+  { code: 'quests', sliceBy: 'language', chainPosition: null },
+  { code: 'cores', sliceBy: 'domain', chainPosition: null },
+] as const;
+
 export type SystemsDomain = 'lowlevel' | 'infra' | 'play' | 'pc';
 export const SYSTEMS_DOMAINS: readonly SystemsDomain[] = ['lowlevel', 'infra', 'play', 'pc'];

```

Cambio en `tools/content/build-curriculum.ts` (verificado):

```diff
--- a/tools/content/build-curriculum.ts
+++ b/tools/content/build-curriculum.ts
@@ -1,21 +1,35 @@
-// Valida content/ y escribe build/curriculum.json, que importan los adaptadores legacy.
+// Valida content/ y escribe build/curriculum.json, que importan los adaptadores legacy, y
+// build/curriculum.meta.json, con las huellas y las claves que necesita content:import (ADR 0006).
 // Lo corren `npm run typecheck` (y por eso build y test) y `npm run dev` antes de empezar.
 // Uso: node tools/content/build-curriculum.ts [raíz]; sin argumento, la raíz del repositorio.
 import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
 import { join, resolve } from 'node:path';
 import { ContentError } from './content-error.ts';
-import { loadCurriculum } from './load-curriculum.ts';
+import { loadCurriculumSource } from './load-curriculum.ts';
+import { curriculumMeta, sourceCommitFrom } from './meta.ts';
+
+// Se escribe a un temporal y se renombra: dos procesos a la vez (dos auditorías, o una con
+// `npm test`) nunca leen un archivo a medio escribir; rename reemplaza de forma atómica.
+function writeAtomically(output: string, text: string): void {
+  const temporary = `${output}.${process.pid}.tmp`;
+  writeFileSync(temporary, text);
+  renameSync(temporary, output);
+}

 const root = resolve(process.argv[2] ?? join(import.meta.dirname, '..', '..'));
 try {
-  const curriculum = loadCurriculum(root);
+  const { curriculum, workshopSteps } = loadCurriculumSource(root);
+  const sourceCommit = sourceCommitFrom(process.env);
+  const document = JSON.stringify(curriculum, null, 2) + '\n';
   mkdirSync(join(root, 'build'), { recursive: true });
-  // Se escribe a un temporal y se renombra: dos procesos a la vez (dos auditorías, o una con
-  // `npm test`) nunca leen un archivo a medio escribir; rename reemplaza de forma atómica.
-  const output = join(root, 'build', 'curriculum.json');
-  const temporary = `${output}.${process.pid}.tmp`;
-  writeFileSync(temporary, JSON.stringify(curriculum, null, 2) + '\n');
-  renameSync(temporary, output);
+  // El documento primero y su meta después: si el proceso muere en el medio, queda un meta viejo
+  // que content:import rechaza por documentHash, nunca un par que parezca válido.
+  writeAtomically(join(root, 'build', 'curriculum.json'), document);
+  const meta = curriculumMeta(curriculum, document, sourceCommit, workshopSteps);
+  writeAtomically(
+    join(root, 'build', 'curriculum.meta.json'),
+    JSON.stringify(meta, null, 2) + '\n',
+  );
 } catch (error) {
   if (!(error instanceof ContentError)) throw error;
   console.error(`content/ no es válido: ${error.message}`);
```

`tools/content/meta.ts` (verificado)

```ts
// Metadatos del contenido (ADR 0006 D10 a D14): build/curriculum.meta.json acompaña a
// curriculum.json y es lo único que content:import y la API toman como verdad de las huellas.
// Se calculan acá y en ningún otro lado; PHP las guarda y las compara, nunca las recalcula.
//
// Dos clases de huella, a propósito:
// - de bytes publicados (portions, contentHash): sha256 de JSON.stringify(valor), compacto y con
//   el orden de claves del documento. Es lo que sirve la API y de ahí salen los ETag.
// - de contenido canónico (gradingHash, starterHash): sobre JSON con las claves ordenadas, para
//   que reordenar claves no cuente como un cambio de corrección (ADR 0004 §2, «Hashes»).
import { createHash } from 'node:crypto';
import { CATALOGS, LANGUAGES, SYSTEMS_DOMAINS } from './catalogs.ts';
import { ContentError } from './content-error.ts';
import type { Curriculum } from './load-curriculum.ts';
import type { JsonRecord } from './shape.ts';
import type { WorkshopStepKeys } from './workshops.ts';

export interface ExerciseHashes {
  contentHash: string;
  gradingHash: string;
  starterHash: string;
}

export interface CurriculumMeta {
  documentHash: string;
  sourceCommit: string | null;
  languages: readonly string[];
  catalogs: typeof CATALOGS;
  portions: Record<string, string>;
  exercises: Record<string, ExerciseHashes>;
  workshopSteps: WorkshopStepKeys;
}

const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// contentHash: los bytes publicados del ejercicio (así un cambio de orden de claves mueve el
// ETag del ejercicio). gradingHash: el id y la expresión de cada prueba, más las opciones y la
// respuesta de la predicción; un cambio de texto no obliga a volver a verificar. starterHash:
// el código inicial, para que D1 detecte un borrador hecho sobre un inicio viejo.
export function exerciseHashes(exercise: JsonRecord): ExerciseHashes {
  const tests = exercise.tests as JsonRecord[];
  const prediction = exercise.prediction as JsonRecord;
  return {
    contentHash: sha256Hex(JSON.stringify(exercise)),
    gradingHash: sha256Hex(
      canonicalJson({
        tests: tests.map((test) => ({ id: test.id, expression: test.expression })),
        prediction: { options: prediction.options, answer: prediction.answer },
      }),
    ),
    starterHash: sha256Hex(canonicalJson(exercise.starter)),
  };
}

// Las 17 porciones que sirve la API, en el orden de `Portion` (PHP): su nombre es la ruta
// dentro de curriculum.json, y su valor, la parte que se publica.
export function portionsOf(curriculum: Curriculum): Record<string, unknown> {
  const portions: Record<string, unknown> = {};
  for (const language of LANGUAGES) portions[`lab.${language}`] = curriculum.lab[language];
  for (const language of LANGUAGES) portions[`quests.${language}`] = curriculum.quests[language];
  for (const domain of SYSTEMS_DOMAINS) portions[`cores.${domain}`] = curriculum.cores[domain];
  for (const language of LANGUAGES)
    portions[`campaign.${language}`] = curriculum.campaign[language];
  for (const domain of SYSTEMS_DOMAINS) {
    portions[`workshops.${domain}`] = curriculum.workshops[domain];
  }
  for (const language of LANGUAGES) portions[`atlas.${language}`] = curriculum.atlas[language];
  portions.guide = curriculum.guide;
  return portions;
}

// El commit de Git del contenido, si quien construye lo pasa: la imagen de PHP lo recibe como
// build arg, porque el contexto de Docker no trae .git. Vacío o ausente: null.
export function sourceCommitFrom(env: Record<string, string | undefined>): string | null {
  const commit = env.CONTENT_SOURCE_COMMIT ?? '';
  if (commit === '') return null;
  if (!COMMIT.test(commit)) {
    throw new ContentError(
      `CONTENT_SOURCE_COMMIT: se esperaba el hash completo de un commit (40 o 64 caracteres hexadecimales) y llegó «${commit}»`,
    );
  }
  return commit;
}

export function curriculumMeta(
  curriculum: Curriculum,
  document: string,
  sourceCommit: string | null,
  workshopSteps: WorkshopStepKeys,
): CurriculumMeta {
  const exercises: Record<string, ExerciseHashes> = {};
  const catalogs = [
    ...Object.values(curriculum.lab),
    ...Object.values(curriculum.quests),
    ...Object.values(curriculum.cores),
  ];
  for (const exercise of catalogs.flat())
    exercises[exercise.id as string] = exerciseHashes(exercise);
  const portions = Object.fromEntries(
    Object.entries(portionsOf(curriculum)).map(([name, part]) => [
      name,
      sha256Hex(JSON.stringify(part)),
    ]),
  );
  return {
    documentHash: sha256Hex(document),
    sourceCommit,
    languages: LANGUAGES,
    catalogs: CATALOGS,
    portions,
    exercises,
    workshopSteps,
  };
}
```

2. Corré `npm run curriculum && node qa/curriculum-meta-check.ts`. **Esperado:** `curriculum-meta-check: 17 porciones, 274 ejercicios y 100 etapas con su huella y su clave PASS.`
3. Comprobá el commit de origen: `CONTENT_SOURCE_COMMIT=0123456789abcdef0123456789abcdef01234567 node tools/content/build-curriculum.ts .` deja `"sourceCommit": "0123…4567"` en el meta; sin la variable queda `null`; con `CONTENT_SOURCE_COMMIT=zz` el generador falla con `content/ no es válido: CONTENT_SOURCE_COMMIT: se esperaba el hash completo de un commit (40 o 64 caracteres hexadecimales) y llegó «zz»` y no escribe nada (FR-037).
4. Commit sugerido para T001 a T003 juntos (la prueba va con lo que la hace pasar): `feat(content): el generador escribe el meta con las huellas y las claves de etapa`.

### Tarea 1.4 · Compuerta del generador (T004)

1. `npm run build`, `npm test`, `npm run lint` y `npm run format:check`. **Esperado:** en verde; `npm test` corre 30 checks (el nuevo incluido).
2. SC-006: sha256 de `build/curriculum.json` y de `node tools/content/dump-globals.ts .` iguales a los de la línea base del paso 1.2.1.
3. El commit de cierre es la evidencia de T004.

### Tarea 1.5 · La prueba de conexión, que falla (T005)

**Archivos:** crear `api/tests/Feature/ConnectionTest.php`.

**Antes de correr nada con Compose,** creá el `.env` del worktree con `sh api/scripts/init-env.sh`: sin él, `compose.yaml` se niega a correr, `npm run api:test` incluido. Agrega `APP_KEY`, `MYSQL_PASSWORD` y `MYSQL_ROOT_PASSWORD` aleatorios, no descarga nada y queda fuera de Git y de las imágenes.

**Qué prueba:** la conexión de `php` trabaja en UTC, los upserts se compilan con alias de fila (`INSERT … AS laravel_upsert_alias`, porque `VALUES()` está deprecado) y `php` conserva la espera de bloqueos por omisión: sólo `migrate` la acota (D35).

`api/tests/Feature/ConnectionTest.php` (referencia sin ejecutar)

```php
<?php

use Illuminate\Support\Facades\DB;

// ADR 0006 D04 y D09: la conexión trabaja en UTC y los upserts usan alias de fila, porque
// VALUES() dentro de ON DUPLICATE KEY UPDATE está deprecado.
it('trabaja en UTC', function () {
    expect(DB::scalar('select @@session.time_zone'))->toBe('+00:00');
});

it('compila los upserts con alias de fila y no con VALUES()', function () {
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        $statements[] = $query->sql;
    });

    DB::table('cache')->upsert([['key' => 'prueba', 'value' => 'x', 'expiration' => 1]], ['key'], ['value', 'expiration']);

    expect(implode("\n", $statements))->toContain('as laravel_upsert_alias')->not->toContain('values(`');
});

// El servicio migrate espera como mucho 5 s por un bloqueo (D35); php conserva los valores por
// omisión. phpunit.xml no define MYSQL_ATTR_INIT_COMMAND: ésta es la conexión de php.
it('no acota la espera de bloqueos de la conexión de php', function () {
    expect((int) DB::scalar('select @@session.lock_wait_timeout'))->toBeGreaterThan(5)
        ->and((int) DB::scalar('select @@session.innodb_lock_wait_timeout'))->toBe(50);
});
```

Corré `npm run api:test -- --filter=ConnectionTest`. **Esperado:** fallan «trabaja en UTC» (la sesión queda en `SYSTEM`) y «compila los upserts con alias» (sale `values(`); «no acota la espera de bloqueos» pasa desde el principio y protege que no se la acote en `php`. La primera corrida construye la imagen de pruebas, que todavía no tiene la etapa `curriculum`: no la necesita.

### Tarea 1.6 · Conexión, suites y configuración del contenido (T006)

**Archivos:** modificar `api/config/database.php`, `api/phpunit.xml` y `api/tests/Pest.php`; crear `api/config/content.php`.

1. Aplicá los cambios. `database.php` fija `timezone '+00:00'` y `use_upsert_alias`, y toma `MYSQL_ATTR_INIT_COMMAND` del entorno (sólo `migrate` lo define). `phpunit.xml` suma las suites `Unit` y `Content`, y `Pest.php` pone `DatabaseTruncation` en `tests/Content`: el import y el DDL confirman sus transacciones, así que no pueden correr bajo `RefreshDatabase`. Las suites apuntan a carpetas que todavía no existen: PHPUnit las ignora; si se queja, el coordinador las suma en la tarea que crea su primer test.

Cambio en `api/config/database.php` (referencia sin ejecutar):

```diff
--- a/api/config/database.php
+++ b/api/config/database.php
@@ -63,8 +63,15 @@
             'prefix_indexes' => true,
             'strict' => true,
             'engine' => null,
+            // Los instantes se guardan y se leen en UTC (ADR 0006 D04).
+            'timezone' => '+00:00',
+            // upsert() con alias de fila (INSERT … AS laravel_upsert_alias): VALUES() dentro de
+            // ON DUPLICATE KEY UPDATE está deprecado desde MySQL 8.0.20 (ADR 0006 D09).
+            'use_upsert_alias' => true,
             'options' => extension_loaded('pdo_mysql') ? array_filter([
                 Mysql::ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
+                // Sólo el servicio migrate lo define (compose.yaml): espera acotada de bloqueos, D35.
+                Mysql::ATTR_INIT_COMMAND => env('MYSQL_ATTR_INIT_COMMAND'),
             ]) : [],
         ],

```

Cambio en `api/phpunit.xml` (referencia sin ejecutar):

```diff
--- a/api/phpunit.xml
+++ b/api/phpunit.xml
@@ -5,9 +5,15 @@
          colors="true"
 >
     <testsuites>
+        <testsuite name="Unit">
+            <directory>tests/Unit</directory>
+        </testsuite>
         <testsuite name="Feature">
             <directory>tests/Feature</directory>
         </testsuite>
+        <testsuite name="Content">
+            <directory>tests/Content</directory>
+        </testsuite>
     </testsuites>
     <source>
         <include>
```

Cambio en `api/tests/Pest.php` (referencia sin ejecutar):

```diff
--- a/api/tests/Pest.php
+++ b/api/tests/Pest.php
@@ -1,12 +1,21 @@
 <?php

+use Illuminate\Foundation\Testing\DatabaseTruncation;
 use Illuminate\Foundation\Testing\RefreshDatabase;
 use Tests\TestCase;

 // Las pruebas de tests/Feature arrancan la aplicación (Tests\TestCase) y corren dentro de una
-// transacción que RefreshDatabase revierte. El código que hace TRUNCATE o abre sus propias
-// transacciones, como content:import en C2, usa DatabaseTruncation: bajo RefreshDatabase sus
-// commits implícitos filtrarían datos entre pruebas.
+// transacción que RefreshDatabase revierte.
 pest()->extend(TestCase::class)
     ->use(RefreshDatabase::class)
     ->in('Feature');
+
+// content:import abre y confirma su propia transacción, y las pruebas de DDL confirman las suyas:
+// estas pruebas vacían las tablas antes de cada una (DatabaseTruncation, ADR 0004) en lugar de
+// envolverse en una transacción, para que el import corra como en producción y el rollback de un
+// error se pueda verificar. Un DDL confirma la transacción: bajo RefreshDatabase filtraría datos.
+pest()->extend(TestCase::class)
+    ->use(DatabaseTruncation::class)
+    ->in('Content');
+
+// tests/Unit no arranca la aplicación: son clases de PHP puro (codificador, códecs, diferencia).
```

`api/config/content.php` (referencia sin ejecutar)

```php
<?php

// Contenido del taller (ADR 0006, C2).
return [

    // Dónde están curriculum.json y curriculum.meta.json, que genera tools/content/. La imagen los
    // copia a resources/content (etapa `curriculum` de api/Dockerfile).
    'path' => env('CONTENT_PATH', resource_path('content')),

    // Store de la caché de cuerpos (D11). Las pruebas usan el real: phpunit.xml pone
    // CACHE_STORE=array sólo para el store por omisión.
    'cache_store' => env('CONTENT_CACHE_STORE', 'database'),

    // Vida de cada cuerpo en la caché: sólo un respaldo, porque cada import renueva los 17 y borra
    // los de los hashes que reemplaza.
    'cache_days' => 30,

];
```

2. Corré `npm run api:test -- --filter=ConnectionTest`. **Esperado:** los tres tests pasan.
3. `npm run api:format:check` en verde.

### Tarea 1.7 · Imagen de la API con el documento y su meta (T007)

**Archivos:** modificar `api/Dockerfile` y `compose.yaml`.

**Qué hace:** una etapa `curriculum` genera `curriculum.json` y `curriculum.meta.json` con el mismo generador que el front y las dos imágenes (`runtime` y `dev`) los copian a `resources/content/`; Compose le da la raíz del repositorio como contexto adicional (`repo`) y pasa `CONTENT_SOURCE_COMMIT` como argumento de construcción. La etapa repite el `FROM`, el `COPY` de los `package*.json` y el `npm ci` del `Dockerfile` de la raíz para que BuildKit reutilice la capa, y copia sólo rutas explícitas (`content/`, `tools/content/`, `src/shared/config/`): el `.dockerignore` de la raíz no excluye ninguna de ellas. El `COPY` de `migrate.sh` llega en T024.

Cambio en `api/Dockerfile` (referencia sin ejecutar):

```diff
--- a/api/Dockerfile
+++ b/api/Dockerfile
@@ -1,5 +1,6 @@
 # Imagen de la API Laravel (ADR 0004). compose.yaml usa `runtime` para php y migrate, y `dev`
-# para las pruebas. Composer sólo existe en las etapas de construcción.
+# para las pruebas; `curriculum` genera el contenido que las dos copian. Composer y Node sólo
+# existen en las etapas de construcción.

 # Dependencias de producción. --no-scripts y --no-autoloader esperan al código: el autoload
 # optimizado y package:discover necesitan la aplicación completa. El runtime no lleva las pruebas
@@ -20,6 +21,23 @@
 COPY . .
 RUN composer dump-autoload --optimize --no-interaction

+# Contenido (ADR 0006, C2): build/curriculum.json y build/curriculum.meta.json, con el mismo
+# generador que el front (ADR 0004: sólo TypeScript lee los YAML). `repo` es la raíz del
+# repositorio, un contexto adicional de compose.yaml; sólo se copian rutas explícitas, sin
+# depender de qué filtre su .dockerignore. Las tres primeras instrucciones repiten las del
+# Dockerfile de la raíz (mismo digest, mismo lockfile y `npm ci`) para que BuildKit pueda reusar
+# la capa de dependencias: si cambian allá, cambialas acá.
+FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS curriculum
+WORKDIR /app
+COPY --from=repo package.json package-lock.json ./
+RUN npm ci --no-audit --no-fund
+COPY --from=repo content content
+COPY --from=repo tools/content tools/content
+COPY --from=repo src/shared/config src/shared/config
+# Después de npm ci: un commit distinto sólo repite el generador. El generador lo escribe en el meta.
+ARG CONTENT_SOURCE_COMMIT=""
+RUN node tools/content/build-curriculum.ts
+
 # PHP-FPM con pdo_mysql y php.ini de producción. fcgi trae cgi-fcgi para el healthcheck de
 # compose.yaml. docker-php-ext-install instala y borra solo las herramientas de compilación.
 # Los paquetes de apk no llevan versión fija: Alpine retira las viejas de sus repositorios; el
@@ -38,6 +56,8 @@
 # las vistas compiladas van a un tmpfs.
 FROM base AS runtime
 COPY --from=vendor /app /var/www/html
+# El contenido que lee content:import (config/content.php). Es de root: PHP sólo lo lee.
+COPY --from=curriculum /app/build/curriculum.json /app/build/curriculum.meta.json resources/content/
 # /var/www/html viene de la imagen base como www-data 1777: con eso, PHP podría renombrar o
 # borrar public/ o vendor/ aunque sean de root.
 RUN chown root:root /var/www/html && chmod 755 /var/www/html \
@@ -48,6 +68,7 @@
 # cachés dentro del proyecto.
 FROM base AS dev
 COPY --from=dev-vendor /app /var/www/html
+COPY --from=curriculum /app/build/curriculum.json /app/build/curriculum.meta.json resources/content/
 # Laravel lee .env al arrancar, antes de registrar su manejador de errores. Sin el archivo,
 # phpdotenv avisa y Pest registra el aviso en cada corrida. Va vacío: el entorno llega de Compose.
 RUN touch .env
```

Cambio en `compose.yaml` (referencia sin ejecutar):

```diff
--- a/compose.yaml
+++ b/compose.yaml
@@ -33,6 +33,14 @@
   build:
     context: ./api
     target: runtime
+    # `repo` es la raíz del repositorio, un contexto adicional: la etapa `curriculum` de
+    # api/Dockerfile corre ahí el generador de contenido (tools/content/).
+    additional_contexts:
+      repo: .
+    # Para registrar el commit del contenido en content_imports:
+    # CONTENT_SOURCE_COMMIT=$(git rev-parse HEAD) docker compose up --build -d --wait
+    args:
+      CONTENT_SOURCE_COMMIT: '${CONTENT_SOURCE_COMMIT:-}'
   environment: *laravel-env
   networks: [app]
   read_only: true
@@ -158,6 +166,8 @@
     build:
       context: ./api
       target: dev
+      additional_contexts:
+        repo: .
     entrypoint: ['php', 'vendor/bin/pest']
     environment: *laravel-test-env
     networks: [testing]
```

**Descarga: necesita permiso del usuario antes del primer paso.** `npm ci` baja las 243 dependencias del `package-lock.json` desde el registro de npm (unos 150 MB instalados; la descarga ronda los 40 o 50 MB, estimación), sobre `node:24-alpine@sha256:ebfe2f90…`, la imagen base que ya usa el front. Pedíselo al usuario con ese nombre, origen y tamaño.

1. Comprobá que el `.env` existe (se creó antes de T005).
2. `docker compose build php`. **Esperado:** termina bien; la etapa `curriculum` corre `npm ci` y el generador.
3. Comprobá lo que trae la imagen: `docker compose run --rm --no-deps --entrypoint sh php -c 'sha256sum resources/content/curriculum.json; grep -c documentHash resources/content/curriculum.meta.json'` y, en el host, `npm run curriculum && sha256sum build/curriculum.json`. **Esperado:** el mismo sha256 y un `documentHash` en el meta (el árbol es el mismo).
4. Reutilización de la capa: corré otra vez `docker compose build php`. **Esperado:** todos los pasos `CACHED`, `npm ci` incluido. Después editá un YAML de `content/`, reconstruí y comprobá que `npm ci` sigue `CACHED` y que sólo se repiten los pasos posteriores al `COPY` de `content/`.
5. Argumento de commit: `CONTENT_SOURCE_COMMIT=$(git rev-parse HEAD) docker compose build php` sólo repite el último `RUN`, y `grep sourceCommit resources/content/curriculum.meta.json` dentro de la imagen muestra ese commit. Con `CONTENT_SOURCE_COMMIT=zz` la construcción falla con el mensaje del generador (FR-037).
6. `npm run api:test -- --filter=ConnectionTest` sigue en verde: el servicio `test` construye `dev` con el contexto adicional.
7. Commit sugerido para T005 a T007: `feat(api): la imagen trae el contenido generado, y la conexión trabaja en UTC con upserts con alias`. Poné en el mensaje del commit lo que midió el paso 4 (qué capas se reutilizaron).

## 2. Agente A · Esquema (onda 1)

**Cubre:** US1 en lo que toca al esquema; FR-041, FR-042 (el bloqueo y `migrate`-`rollback`-`migrate`) y FR-048; criterios A, B, C, D, E, G, H e I del DBA ([data-model.md](./data-model.md)). **Parte de:** la base (S0). **Rama:** `c2/schema`. **Worktree y proyecto de Compose propios:** `export COMPOSE_PROJECT_NAME=taller-c2-a`.

**Archivos que posee:** `api/database/migrations/2026_10_05_1000NN_*.php` (21), `api/tests/Feature/ContentSchemaTest.php`, `api/tests/Content/{SchemaBehaviorTest,MigrationsTest,OnlineDdlTest,LockWaitTest}.php` y `api/tests/Support/ContentDatabase.php`. No toca nada más.

**Consume:** el DDL de `data-model.md` y las suites de la base. `ContentDatabase::url()` recibe una `Portion`, que llega con B: A no la llama, y PHP no resuelve el tipo hasta que se usa.

**Entrega:** las 21 tablas y `Tests\Support\ContentDatabase`, que usan W y E:

| Clase | Qué hace | API pública |
| --- | --- | --- |
| `ContentDatabase` (class) | — | `public static function counts(): array`<br>`public static function checksums(): array`<br>`public static function queriesDuring(Closure $run): array`<br>`public static function contentWritesDuring(Closure $run): array`<br>`public static function url(Portion $portion): string` |

**Compuerta del agente:** `npm run api:test` completo en su worktree (sólo hay pruebas de A y las de la base) y `npm run api:format:check`, en verde; `npm run api:test:down` al terminar.

### Tarea 2.1 · Las pruebas de esquema, que fallan (T008)

**Archivos:** crear `api/tests/Feature/ContentSchemaTest.php`, `api/tests/Content/SchemaBehaviorTest.php`, `api/tests/Content/MigrationsTest.php`, `api/tests/Content/LockWaitTest.php` y `api/tests/Support/ContentDatabase.php`.

**Qué prueban:**

- `ContentSchemaTest` (criterios A a E): las 21 tablas en InnoDB y con la colación española; las columnas con sus tipos y los ENUM en orden; la clave primaria como único índice único; las 22 claves foráneas por nombre, con `RESTRICT`; y los CHECK por nombre, `ENFORCED`.
- `SchemaBehaviorTest`: un CHECK roto da el error 3819, una clave foránea `RESTRICT` no deja borrar lo que otro referencia, y `Lab` y `lab` son catálogos distintos (comparación byte a byte).
- `MigrationsTest` (criterio H): `migrate`, `rollback` y `migrate` dejan el mismo `SHOW CREATE TABLE`, y el `down()` de una tabla referenciada falla con el error 3730 mientras sus hijas existan.
- `LockWaitTest` (FR-042, SC-007): con la espera acotada que le da Compose a `migrate`, una migración detrás de una transacción abierta falla en 5 segundos o menos con el error 1205.

1. Copiá los cinco archivos:

`api/tests/Support/ContentDatabase.php` (referencia sin ejecutar)

```php
<?php

namespace Tests\Support;

use App\Content\Portion;
use Closure;
use Illuminate\Support\Facades\DB;

/** Lo que las pruebas de contenido miran de la base: conteos, checksums y las sentencias que se ejecutan. */
final class ContentDatabase
{
    /** Las 21 tablas de contenido, en el orden de sus migraciones. */
    public const TABLES = [
        'languages', 'catalogs', 'content_imports', 'topics', 'workshops', 'exercises', 'exercise_grading_versions',
        'exercise_tests', 'exercise_hints', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises',
        'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks',
        'guide_modules', 'guide_steps', 'guide_step_resources',
    ];

    /** @return array<string, int> filas por tabla, activas o retiradas */
    public static function counts(): array
    {
        return array_combine(self::TABLES, array_map(fn (string $table) => DB::table($table)->count(), self::TABLES));
    }

    /**
     * El oráculo de «no cambió nada»: CHECKSUM TABLE de cada tabla (MySQL lo calcula sobre sus filas).
     *
     * @return array<string, int>
     */
    public static function checksums(): array
    {
        $rows = DB::select('checksum table '.implode(', ', array_map(fn (string $table) => "`{$table}`", self::TABLES)));

        return array_combine(self::TABLES, array_map(fn (object $row) => (int) $row->Checksum, $rows));
    }

    /**
     * Toda sentencia que ejecuta `$run`.
     *
     * @return list<string>
     */
    public static function queriesDuring(Closure $run): array
    {
        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = $query->sql;
        });
        $run();

        return $queries;
    }

    /**
     * Las sentencias que escriben una tabla de contenido mientras corre `$run`. La caché y las
     * sesiones quedan afuera: el import precalienta la primera aunque no cambie nada.
     *
     * @return list<string>
     */
    public static function contentWritesDuring(Closure $run): array
    {
        $tables = implode('|', self::TABLES);

        return array_values(array_filter(
            self::queriesDuring($run),
            fn (string $sql) => preg_match("/^\\s*(insert\\s+into|update|delete\\s+from|replace\\s+into|truncate(\\s+table)?)\\s+`?({$tables})`?[\\s(]/i", $sql) === 1,
        ));
    }

    /** La URL del recurso que sirve una porción. */
    public static function url(Portion $portion): string
    {
        return match ($portion->group()) {
            'lab', 'quests' => "/api/exercises?catalog={$portion->group()}&language={$portion->slice()}",
            'cores' => "/api/exercises?catalog=cores&domain={$portion->slice()}",
            'campaign' => "/api/worlds?language={$portion->slice()}",
            'workshops' => "/api/workshops?domain={$portion->slice()}",
            'atlas' => "/api/atlas?language={$portion->slice()}",
            'guide' => '/api/guide',
        };
    }
}
```

`api/tests/Feature/ContentSchemaTest.php` (referencia sin ejecutar)

```php
<?php

use Illuminate\Support\Facades\DB;

// El esquema de contenido del ADR 0006 §5.1, comprobado contra information_schema. Los esperados
// están escritos acá desde el ADR y no se derivan de las migraciones.
const CONTENT_TABLES = [
    'languages' => 2, 'catalogs' => 7, 'content_imports' => 7, 'topics' => 7, 'workshops' => 22, 'exercises' => 33,
    'exercise_grading_versions' => 4, 'exercise_tests' => 12, 'exercise_hints' => 7, 'workshop_objectives' => 10,
    'workshop_steps' => 13, 'workshop_related_exercises' => 7, 'worlds' => 18, 'world_exercises' => 8,
    'atlas_concepts' => 21, 'guide_resources' => 17, 'guide_sources' => 9, 'guide_tracks' => 8, 'guide_modules' => 10,
    'guide_steps' => 14, 'guide_step_resources' => 7,
];

function schemaRows(string $sql, array $bindings = []): Illuminate\Support\Collection
{
    return collect(DB::select($sql, $bindings));
}

it('A: crea las 21 tablas en InnoDB y con la colación española', function () {
    $tables = schemaRows(
        'select table_name as name, engine, table_collation as collation_name from information_schema.tables where table_schema = database() and table_name in ('.implode(',', array_fill(0, 21, '?')).')',
        array_keys(CONTENT_TABLES),
    );

    expect($tables->pluck('name')->sort()->values()->all())->toBe(collect(array_keys(CONTENT_TABLES))->sort()->values()->all())
        ->and($tables->pluck('engine')->unique()->all())->toBe(['InnoDB'])
        ->and($tables->pluck('collation_name')->unique()->all())->toBe(['utf8mb4_es_0900_ai_ci']);
});

it('B: cada tabla tiene sus columnas, con los tipos de ID, hash, JSON, fecha y texto del ADR', function () {
    $columns = schemaRows('select table_name as t, column_name as c, column_type as type, collation_name as collation_name from information_schema.columns where table_schema = database() and table_name in ('.implode(',', array_fill(0, 21, '?')).') order by table_name, ordinal_position', array_keys(CONTENT_TABLES));

    $counts = $columns->countBy('t')->all();
    ksort($counts);
    $expectedCounts = CONTENT_TABLES;
    ksort($expectedCounts);
    expect($counts)->toBe($expectedCounts);

    // Lo que no coincide queda en $wrong, con su nombre: así el fallo dice qué columna es.
    $wrong = [];
    foreach ($columns as $column) {
        $expected = match (true) {
            str_ends_with($column->c, '_hash') => ['char(64)', 'ascii_bin'],
            str_ends_with($column->c, '_json') => ['longtext', 'utf8mb4_0900_bin'],
            $column->c === 'key_order' => ['varchar(1024)', 'ascii_bin'],
            in_array($column->c, ['created_at', 'updated_at', 'retired_at'], true) => ['datetime(3)', null],
            in_array($column->c, ['starter', 'solution'], true) => ['mediumtext', 'utf8mb4_0900_bin'],
            $column->c === 'expression', $column->t === 'atlas_concepts' && $column->c === 'code' => ['text', 'utf8mb4_0900_bin'],
            // Los ID, las claves y los nombres de lenguaje comparan byte a byte.
            in_array("{$column->t}.{$column->c}", ['exercises.id', 'workshops.id', 'topics.topic_key', 'exercise_tests.test_key', 'workshop_steps.step_key', 'languages.code', 'catalogs.code'], true) => [null, 'ascii_bin'],
            "{$column->t}.{$column->c}" === 'exercises.title' => [null, 'utf8mb4_es_0900_ai_ci'],
            default => null,
        };
        if ($expected !== null) {
            $actual = [$expected[0] === null ? null : $column->type, $expected[1] === null ? null : $column->collation_name];
            if ($actual !== $expected) {
                $wrong["{$column->t}.{$column->c}"] = $actual;
            }
        }
    }
    expect($wrong)->toBe([]);
});

it('B: los ENUM tienen sus valores en el orden del ADR', function () {
    $enums = schemaRows("select concat(table_name, '.', column_name) as path, column_type as type from information_schema.columns where table_schema = database() and data_type = 'enum' and table_name in (".implode(',', array_fill(0, 21, '?')).')', array_keys(CONTENT_TABLES))
        ->pluck('type', 'path')->all();
    $levels = "enum('beginner','medium','advanced','expert')";
    $domains = "enum('lowlevel','infra','play','pc')";
    $lifecycle = "enum('active','deprecated')";
    $expected = [
        'workshops.domain' => $domains, 'workshops.category' => "enum('machine','infra','play')", 'workshops.level' => $levels,
        'exercises.domain' => $domains, 'exercises.level' => $levels, 'exercises.challenge_type' => "enum('repair','kata','boss')",
        'exercises.kind' => "enum('completar','reparar')",
        'exercises.visual' => "enum('flow','memory','ownership','collections','pointers','generics','concurrency')",
        'worlds.level' => $levels, 'atlas_concepts.level' => $levels, 'world_exercises.role' => "enum('training','challenge','boss')",
        'catalogs.slice_by' => "enum('language','domain')",
        'guide_resources.category' => "enum('ejercicios','lectura','proyectos','herramientas')", 'guide_resources.cost' => "enum('gratis','mixto')",
    ];
    foreach (['catalogs', 'topics', 'workshops', 'exercises', 'exercise_tests', 'exercise_hints', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'] as $table) {
        $expected["{$table}.status"] = $lifecycle;
    }

    ksort($expected);
    ksort($enums);
    expect($enums)->toBe($expected);
});

it('C: la clave primaria es el único índice único, y los índices son los del ADR', function () {
    $unique = schemaRows("select table_name as t, index_name as i from information_schema.statistics where table_schema = database() and non_unique = 0 and index_name <> 'PRIMARY' and table_name in (".implode(',', array_fill(0, 21, '?')).')', array_keys(CONTENT_TABLES));
    $indexes = schemaRows("select distinct index_name as i from information_schema.statistics where table_schema = database() and index_name <> 'PRIMARY' and table_name in (".implode(',', array_fill(0, 21, '?')).')', array_keys(CONTENT_TABLES))
        ->pluck('i')->sort()->values()->all();

    expect($unique)->toHaveCount(0)
        ->and($indexes)->toBe(collect([
            'workshops_domain_status_position_index', 'exercises_catalog_language_status_position_index',
            'exercises_catalog_domain_status_position_index', 'exercises_language_topic_key_index', 'exercises_workshop_id_language_index',
            'exercise_grading_versions_first_import_id_index', 'workshop_related_exercises_exercise_id_index',
            'worlds_language_status_position_index', 'world_exercises_exercise_id_index',
            'atlas_concepts_language_status_position_index', 'atlas_concepts_lab_exercise_id_index',
            'guide_resources_status_position_index', 'guide_modules_track_language_status_position_index',
            'guide_steps_module_id_status_position_index', 'guide_step_resources_resource_id_index',
        ])->sort()->values()->all());
});

it('D: las 22 claves foráneas apuntan a donde dice el ADR y no dejan borrar ni cambiar', function () {
    $foreign = schemaRows(
        "select k.constraint_name as name, concat(k.table_name, '(', group_concat(k.column_name order by k.ordinal_position), ') -> ', k.referenced_table_name, '(', group_concat(k.referenced_column_name order by k.ordinal_position), ')') as definition, any_value(r.delete_rule) as on_delete, any_value(r.update_rule) as on_update
         from information_schema.key_column_usage k join information_schema.referential_constraints r on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name
         where k.table_schema = database() and k.referenced_table_name is not null and k.table_name in (".implode(',', array_fill(0, 21, '?')).')
         group by k.constraint_name, k.table_name, k.referenced_table_name',
        array_keys(CONTENT_TABLES),
    );

    expect($foreign->pluck('definition', 'name')->sortKeys()->all())->toBe(collect([
        'topics_language_foreign' => 'topics(language) -> languages(code)',
        'exercises_catalog_foreign' => 'exercises(catalog) -> catalogs(code)',
        'exercises_language_topic_key_foreign' => 'exercises(language,topic_key) -> topics(language,topic_key)',
        'exercises_workshop_id_foreign' => 'exercises(workshop_id) -> workshops(id)',
        'exercise_grading_versions_exercise_id_foreign' => 'exercise_grading_versions(exercise_id) -> exercises(id)',
        'exercise_grading_versions_first_import_id_foreign' => 'exercise_grading_versions(first_import_id) -> content_imports(id)',
        'exercise_tests_exercise_id_foreign' => 'exercise_tests(exercise_id) -> exercises(id)',
        'exercise_hints_exercise_id_foreign' => 'exercise_hints(exercise_id) -> exercises(id)',
        'workshop_objectives_workshop_id_foreign' => 'workshop_objectives(workshop_id) -> workshops(id)',
        'workshop_steps_workshop_id_foreign' => 'workshop_steps(workshop_id) -> workshops(id)',
        'workshop_related_exercises_workshop_id_foreign' => 'workshop_related_exercises(workshop_id) -> workshops(id)',
        'workshop_related_exercises_exercise_id_foreign' => 'workshop_related_exercises(exercise_id) -> exercises(id)',
        'worlds_language_foreign' => 'worlds(language) -> languages(code)',
        'world_exercises_world_id_foreign' => 'world_exercises(world_id) -> worlds(id)',
        'world_exercises_exercise_id_foreign' => 'world_exercises(exercise_id) -> exercises(id)',
        'atlas_concepts_language_foreign' => 'atlas_concepts(language) -> languages(code)',
        'atlas_concepts_lab_exercise_id_foreign' => 'atlas_concepts(lab_exercise_id) -> exercises(id)',
        'guide_tracks_language_foreign' => 'guide_tracks(language) -> languages(code)',
        'guide_modules_track_language_foreign' => 'guide_modules(track_language) -> guide_tracks(language)',
        'guide_steps_module_id_foreign' => 'guide_steps(module_id) -> guide_modules(id)',
        'guide_step_resources_step_id_foreign' => 'guide_step_resources(step_id) -> guide_steps(id)',
        'guide_step_resources_resource_id_foreign' => 'guide_step_resources(resource_id) -> guide_resources(id)',
    ])->sortKeys()->all())
        ->and($foreign->pluck('on_delete')->unique()->all())->toBe(['RESTRICT'])
        ->and($foreign->pluck('on_update')->unique()->all())->toBe(['RESTRICT']);
});

it('E: los CHECK están por nombre y se hacen cumplir', function () {
    $lifecycle = ['catalogs', 'topics', 'workshops', 'exercises', 'exercise_tests', 'exercise_hints', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'];
    $position = ['workshops', 'exercises', 'exercise_tests', 'workshop_objectives', 'workshop_steps', 'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts', 'guide_resources', 'guide_modules', 'guide_steps', 'guide_step_resources'];
    $json = ['workshops', 'exercises', 'exercise_tests', 'workshop_objectives', 'workshop_steps', 'worlds', 'atlas_concepts', 'guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps'];
    $expected = [
        ...array_map(fn (string $table) => "{$table}_lifecycle_check", $lifecycle),
        ...array_map(fn (string $table) => "{$table}_position_check", $position),
        ...array_map(fn (string $table) => "{$table}_json_check", $json),
        'catalogs_chain_position_check', 'catalogs_chain_lifecycle_check', 'content_imports_document_hash_check',
        'content_imports_source_commit_check', 'workshops_minutes_check', 'exercises_numbers_check', 'exercises_hashes_check',
        'exercise_grading_versions_hash_check', 'guide_resources_featured_check', 'guide_steps_minutes_check',
    ];
    $found = schemaRows("select c.constraint_name as name, c.enforced as enforced from information_schema.table_constraints c where c.table_schema = database() and c.constraint_type = 'CHECK' and c.table_name in (".implode(',', array_fill(0, 21, '?')).')', array_keys(CONTENT_TABLES));

    expect($found->pluck('name')->sort()->values()->all())->toBe(collect($expected)->sort()->values()->all())
        ->and($found->pluck('enforced')->unique()->all())->toBe(['YES']);
});
```

`api/tests/Content/SchemaBehaviorTest.php` (referencia sin ejecutar)

```php
<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// Lo que el esquema hace, no sólo lo que declara: sus CHECK rechazan y sus claves foráneas no
// dejan borrar. Contra MySQL real, sin transacción de prueba (DatabaseTruncation).
function mysqlErrorCode(QueryException $error): int
{
    return (int) $error->errorInfo[1];
}

$now = '2026-10-05 00:00:00.000';

it('los CHECK rechazan una fila que rompe su regla (error 3819)', function (string $table, array $row) {
    try {
        DB::table($table)->insert($row);
        $this->fail('se esperaba que el CHECK rechazara la fila');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(3819);
    }
})->with(function () use ($now) {
    $lifecycle = ['created_at' => $now, 'updated_at' => $now];

    return [
        'activo con fecha de retiro' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'active', 'retired_at' => $now] + $lifecycle],
        'retirado sin fecha de retiro' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'deprecated'] + $lifecycle],
        'posición de la cadena en cero' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'chain_position' => 0] + $lifecycle],
        'un catálogo retirado en la cadena' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'deprecated', 'retired_at' => $now, 'chain_position' => 1] + $lifecycle],
        'hash de documento en mayúsculas' => ['content_imports', ['document_hash' => str_repeat('A', 64), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => $now]],
        'commit de 41 caracteres' => ['content_imports', ['document_hash' => str_repeat('a', 64), 'source_commit' => str_repeat('a', 41), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => $now]],
        'recurso destacado con 2' => ['guide_resources', [
            'id' => 'r', 'position' => 0, 'title' => 't', 'url' => 'u', 'languages_json' => '["rust"]', 'category' => 'lectura', 'cost' => 'gratis',
            'format' => 'f', 'description' => 'd', 'why' => 'w', 'caveat' => 'c', 'featured' => 2, 'key_order' => '[]',
        ] + $lifecycle],
        'fuente de la guía con key_order que no es JSON' => ['guide_sources', ['position' => 0, 'title' => 't', 'url' => 'u', 'note' => 'n', 'key_order' => 'no es json'] + $lifecycle],
    ];
});

it('las claves foráneas no dejan borrar lo que otro referencia (RESTRICT)', function () {
    $now = '2026-10-05 00:00:00.000';
    DB::table('languages')->insert(['code' => 'rust', 'position' => 1]);
    DB::table('topics')->insert(['language' => 'rust', 'topic_key' => 'basics', 'label' => 'Básicos', 'created_at' => $now, 'updated_at' => $now]);

    try {
        DB::table('languages')->where('code', 'rust')->delete();
        $this->fail('se esperaba que RESTRICT impidiera el borrado');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(1451);
    }
    try {
        DB::table('languages')->where('code', 'rust')->update(['code' => 'rs']);
        $this->fail('se esperaba que RESTRICT impidiera el cambio de clave');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(1451);
    }
});

it('los IDs comparan byte a byte: «Lab» y «lab» son catálogos distintos', function () {
    $now = '2026-10-05 00:00:00.000';
    foreach (['lab', 'Lab'] as $code) {
        DB::table('catalogs')->insert(['code' => $code, 'slice_by' => 'language', 'created_at' => $now, 'updated_at' => $now]);
    }

    expect(DB::table('catalogs')->count())->toBe(2);
});
```

`api/tests/Content/MigrationsTest.php` (referencia sin ejecutar)

```php
<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\ContentDatabase;

// Un DDL confirma la transacción: estas pruebas no pueden correr bajo RefreshDatabase.
/** @return array<string, string> el CREATE TABLE de cada tabla de contenido */
function createStatements(): array
{
    $statements = [];
    foreach (ContentDatabase::TABLES as $table) {
        $statements[$table] = DB::selectOne("show create table `{$table}`")->{'Create Table'};
    }

    return $statements;
}

it('migrate, rollback y migrate dejan el mismo esquema (H)', function () {
    $before = createStatements();

    try {
        // Las 21 migraciones de contenido son las últimas: se deshacen sin tocar las de C1.
        expect(Artisan::call('migrate:rollback', ['--step' => 21, '--force' => true]))->toBe(0);
        expect(Schema::hasTable('exercises'))->toBeFalse();
    } finally {
        expect(Artisan::call('migrate', ['--force' => true]))->toBe(0);
    }

    expect(createStatements())->toBe($before);
});

// El down() de cada migración es un DROP TABLE y nada más: con las hijas en pie, MySQL tiene que
// negarse. Un down() que desactivara las claves foráneas dejaría huérfanas a sus hijas.
it('el down() de una tabla referenciada falla mientras sus hijas existan (error 3730)', function () {
    $migration = require database_path('migrations/2026_10_05_100006_create_exercises_table.php');

    try {
        $migration->down();
        $this->fail('se esperaba que MySQL impidiera borrar la tabla referenciada');
    } catch (QueryException $error) {
        expect((int) $error->errorInfo[1])->toBe(3730);
    }
    expect(Schema::hasTable('exercises'))->toBeTrue();
});
```

`api/tests/Content/LockWaitTest.php` (referencia sin ejecutar)

```php
<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Pdo\Mysql;

// FR-042 y SC-007: con la espera acotada que le da compose.yaml al servicio migrate, una migración
// detrás de una transacción abierta falla en 5 segundos en lugar de esperar hasta un año (el
// valor por omisión de lock_wait_timeout). La conexión de esta prueba lleva la misma opción que
// el servicio: MYSQL_ATTR_INIT_COMMAND de config/database.php.
it('una migración detrás de una transacción abierta falla en 5 segundos o menos, con el error 1205', function () {
    $config = config('database.connections.mysql');
    config(['database.connections.mysql.options' => [
        Mysql::ATTR_INIT_COMMAND => 'SET SESSION lock_wait_timeout=5, innodb_lock_wait_timeout=5',
    ]]);
    DB::purge('mysql');
    $holder = DB::connectUsing('holder', $config, true);
    $holder->beginTransaction();
    // Una lectura toma el bloqueo de metadatos compartido de la tabla hasta el final de la transacción.
    $holder->select('select * from exercises limit 1');

    $started = microtime(true);
    try {
        DB::statement("alter table exercises comment = 'probe'");
        $this->fail('se esperaba que la migración no consiguiera el bloqueo');
    } catch (QueryException $error) {
        expect((int) $error->errorInfo[1])->toBe(1205);
    } finally {
        $holder->rollBack();
        config(['database.connections.mysql' => $config]);
        DB::purge('mysql');
    }

    expect(microtime(true) - $started)->toBeLessThan(8.0);
});
```

2. Corré `npm run api:test`. **Esperado:** fallan todos los de A, por la razón de que las tablas no existen (`ContentSchemaTest`: no encuentra `languages` y las demás; los de la suite `Content`: `SQLSTATE[42S02]: Base table or view not found`).

### Tarea 2.2 · Las 21 migraciones (T009)

**Archivos:** crear `api/database/migrations/2026_10_05_100001_create_languages_table.php` a `2026_10_05_100021_create_guide_step_resources_table.php`, una por tabla y en el orden de `data-model.md`.

Cada migración es un único `CREATE TABLE` por `DB::statement` (DDL atómico, bloqueos de metadatos una sola vez) con su `down()` en `Schema::dropIfExists`, y su DDL es el bloque `sql` de su sección de `data-model.md`. En vez de transcribir 21 sentencias, generalas con este script, que se corre una vez desde la raíz del repositorio y no se versiona; se verificó que reproduce byte a byte las migraciones del borrador:

`generate-migrations.ts` (verificado)

````ts
// Genera las 21 migraciones de C2 a partir del DDL de data-model.md: una sección
// «### Migración NN · `tabla`» con su bloque ```sql. Se corre una vez y no se versiona: queda el
// diff de api/database/migrations/. Uso, desde la raíz del repositorio:
//   node generate-migrations.ts specs/001-c2-contenido-mysql/data-model.md api/database/migrations
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [modelPath, outputDirectory] = process.argv.slice(2);
if (!modelPath || !outputDirectory) {
  throw new Error('uso: node generate-migrations.ts <data-model.md> <carpeta de migraciones>');
}

const SECTION = /^### Migración (\d{2}) · `(\w+)`\n\n```sql\n([\s\S]*?)\n```$/gm;
const model = readFileSync(modelPath, 'utf8');
mkdirSync(outputDirectory, { recursive: true });

let count = 0;
for (const [, number, table, statement] of model.matchAll(SECTION)) {
  // El heredoc de PHP termina en SQL); el `;` final del DDL de data-model.md sobra.
  const sql = statement
    .replace(/;$/, '')
    .split('\n')
    .map((line) => `            ${line}`)
    .join('\n');
  const file = `2026_10_05_1000${number}_create_${table}_table.php`;
  writeFileSync(
    join(outputDirectory, file),
    `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;

// ${table} (ADR 0006 §5.1, C2): un único CREATE TABLE con sus índices, claves foráneas y CHECK en
// línea (D35). Su DDL es el de specs/001-c2-contenido-mysql/data-model.md.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
${sql}
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('${table}');
    }
};
`,
  );
  count += 1;
}
if (count !== 21) throw new Error(`se esperaban 21 tablas y hay ${count}`);
console.log(`${count} migraciones escritas en ${outputDirectory}`);
````

1. Corré `node generate-migrations.ts specs/001-c2-contenido-mysql/data-model.md api/database/migrations`. **Esperado:** `21 migraciones escritas en api/database/migrations`, y `git status` muestra 21 archivos nuevos.
2. Corré `npm run api:test`. **Esperado:** pasan `ContentSchemaTest`, `SchemaBehaviorTest`, `MigrationsTest` y `LockWaitTest`.
3. Si el servidor rechaza una sentencia o una prueba de esquema encuentra una diferencia, corregí la migración y dejá el cambio exacto en tu informe: el contrato es `data-model.md` y lo actualiza el coordinador.
4. `npm run api:format:check` en verde. Commit sugerido: `feat(api): las 21 tablas de contenido, con su DDL y las pruebas de esquema`.

### Tarea 2.3 · La medición de D07 (T010)

**Archivos:** crear `api/tests/Content/OnlineDdlTest.php`.

**Qué hace:** mide, contra el `mysql:9.7` fijado en Compose y con una tabla de descarte, los cuatro casos de D07: ampliar un ENUM al final, agregar una columna a una tabla con un CHECK sobre `DATETIME`, agregar una columna con su propio CHECK y agregar una clave foránea a una tabla con filas. Cada caso fija `ALGORITHM` y `LOCK` para que MySQL falle en lugar de copiar. Es una medición y no una suposición: fija el resultado en `D07_MEASURED` para que, si la imagen cambia y el resultado también, la prueba falle y alguien revise D07 antes de actualizarlo.

1. Copiá la prueba, con `D07_MEASURED = null`:

`api/tests/Content/OnlineDdlTest.php` (referencia sin ejecutar)

```php
<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// Medición de ADR 0006 D07 contra el mysql:9.7 fijado en compose.yaml: si un CHECK sobre DATETIME
// impide que ampliar un ENUM o agregar una columna sea INSTANT (bugs #117450 y #121124), el
// invariante de las tablas que crecen (runs, attempts, exercise_progress…) queda en el escritor.
// Cada caso fija ALGORITHM y LOCK para que MySQL falle en lugar de copiar la tabla. Se prueba con
// una tabla de descarte, nunca con una de contenido. D07_MEASURED es lo que midió MySQL: «ok» si
// aceptó el DDL con ese algoritmo, o el código del error si lo rechazó. Si la imagen cambia y el
// resultado también, esta prueba falla: hay que revisar la decisión de D07 antes de actualizarlo.
const D07_MEASURED = null;

function ddlOutcome(string $statement): string
{
    try {
        DB::statement($statement);

        return 'ok';
    } catch (QueryException $error) {
        return (string) $error->errorInfo[1];
    }
}

beforeEach(function () {
    DB::statement('drop table if exists d07_child');
    DB::statement('drop table if exists d07_probe');
    DB::statement("create table d07_probe (id int unsigned not null primary key, state enum('a','b') not null, seen datetime(3) not null, constraint d07_probe_seen_check check (seen > '2000-01-01')) engine=InnoDB");
    DB::statement("insert into d07_probe values (1, 'a', now(3)), (2, 'b', now(3))");
    DB::statement('create table d07_child (id int unsigned not null primary key, probe_id int unsigned not null, key d07_child_probe_index (probe_id)) engine=InnoDB');
    DB::statement('insert into d07_child values (1, 1), (2, 2)');
});

afterEach(function () {
    DB::statement('drop table if exists d07_child');
    DB::statement('drop table if exists d07_probe');
});

it('mide los cuatro casos de D07 en mysql:9.7', function () {
    $measured = [
        'ampliar un ENUM al final, con un CHECK sobre DATETIME en la tabla' => ddlOutcome("alter table d07_probe modify state enum('a','b','c') not null, algorithm=instant, lock=none"),
        'ADD COLUMN en una tabla con un CHECK sobre DATETIME' => ddlOutcome('alter table d07_probe add column extra int null, algorithm=instant, lock=none'),
        'ADD COLUMN con su propio CHECK' => ddlOutcome('alter table d07_probe add column positive int null check (positive > 0), algorithm=instant, lock=none'),
        'ADD FOREIGN KEY sobre una tabla con filas, con las comprobaciones activas' => ddlOutcome('alter table d07_child add constraint d07_child_probe_foreign foreign key (probe_id) references d07_probe (id), algorithm=inplace, lock=none'),
    ];

    expect($measured)->toBe(D07_MEASURED ?? ['sin medir: copiá este resultado a D07_MEASURED' => $measured]);
});
```

2. Corré `npm run api:test -- --filter=OnlineDdlTest`. **Esperado:** falla a propósito, y el mensaje imprime el arreglo medido bajo la clave `sin medir: copiá este resultado a D07_MEASURED`, con un valor por caso: `ok` si MySQL aceptó el DDL con ese algoritmo, o el código del error si lo rechazó.
3. Copiá ese arreglo (las cuatro claves y sus valores) a `D07_MEASURED` y volvé a correr. **Esperado:** pasa.
4. Informá los cuatro resultados al coordinador y ponelos en el mensaje del commit; el coordinador los lleva al ADR (D07) en T028. Regla de D07: si los dos primeros casos fallan en 9.7, ningún CHECK que toque `DATETIME` va en las tablas que crecen (`runs`, `attempts`, `exercise_progress`…) y el invariante queda en el escritor, con su prueba; si pasan, B2 puede usarlos. La decisión no se toma acá: el coordinador actualiza D07 y el plan de B2.
5. Commit sugerido: `test(api): mide los cuatro casos de D07 en mysql:9.7 y fija el resultado`.

## 3. Agente B · Formato y códecs (onda 1)

**Cubre:** FR-005 (armar las 17 porciones, la mitad que no toca la base), FR-006 (validar la forma y las referencias del documento y del meta), FR-014 (bytes exactos), FR-016 (las reglas del 422), FR-031 y la parte sin base de FR-038. **Parte de:** la base (S0): necesita el meta del generador y `resources/content/` dentro de la imagen de pruebas. **Rama:** `c2/format`. **Proyecto de Compose propio:** `export COMPOSE_PROJECT_NAME=taller-c2-b`.

**Archivos que posee:** `api/app/Content/{PublishedJson,Portion,InvalidPortionRequest,InvalidContent,ContentSource,ContentTables,RowSet,ContentRows,PortionAssembler}.php`, `api/app/Content/Codec/{Field,FieldType,FieldMap,ExerciseCodec,WorkshopCodec,WorldCodec,AtlasCodec,GuideCodec}.php`, `api/tests/Unit/{PublishedJsonTest,PortionTest,ContentSourceTest,ContentFixtureTest,ContentRowsTest,ContentRoundTripTest}.php` y `api/tests/Support/ContentFixture.php`. No toca nada más.

**Todo es PHP puro, sin aplicación ni base:** las pruebas de `tests/Unit` no arrancan Laravel, así que ninguna clase de esta sección usa `config()`, `app()`, `DB` ni `Cache`. Si una necesita eso, está en el lugar equivocado.

**Entrega** (lo que consumen W y E; las firmas son las del código de referencia y no cambian sin avisar):

| Clase | Qué hace | API pública |
| --- | --- | --- |
| `PublishedJson` (class) | El único codificador de lo que publica la API (ADR 0006 D10): da, byte a byte, lo mismo que JSON.stringify de JavaScript sobre el mismo valor, que es lo que hashea el generador (tools/content/meta.ts). Compacto, sin escapar Unicode, `/` ni U+2028/U+2029. | `public static function encode(mixed $value): string`<br>`public static function decode(string $json): mixed` |
| `Portion` (enum) | Las 17 porciones de contenido que sirve la API (ADR 0006 D11). El valor es la ruta dentro de curriculum.json y la clave de `portions` en curriculum.meta.json, que fija el generador. | casos: `LabRust`, `LabGo`, `QuestsRust`, `QuestsGo`, `CoresLowlevel`, `CoresInfra`, `CoresPlay`, `CoresPc`, `CampaignRust`, `CampaignGo`, `WorkshopsLowlevel`, `WorkshopsInfra`, `WorkshopsPlay`, `WorkshopsPc`, `AtlasRust`, `AtlasGo`, `Guide`<br>`public function group(): string`<br>`public function slice(): ?string`<br>`public function isExercises(): bool`<br>`public static function sliceBy(string $group): ?string`<br>`public static function resolve(string $resource, array $query): self` |
| `InvalidPortionRequest` (class) | — | `public function __construct(public readonly array $errors)` |
| `InvalidContent` (class) | — | `public static function at(string $file, string $path, string $problem): self` |
| `ContentSource` (class) | Los dos archivos que genera tools/content/ (build-curriculum.ts), leídos y verificados: curriculum.json, con la forma que publica la API, y curriculum.meta.json, con las huellas y las claves que PHP guarda y compara pero nunca recalcula (ADR 0006 D10 a D14). Un meta de otro build se rechaza: sus huellas no describirían el contenido que se importa. | `public static function fromDirectory(string $path): self`<br>`public function documentHash(): string`<br>`public function sourceCommit(): ?string`<br>`public function languages(): array`<br>`public function part(Portion $portion): mixed` |
| `ContentTables` (class) | Las tablas de contenido que escribe `content:import` por filas, en orden de dependencias (cada clave foránea apunta a una anterior), con las columnas de su clave primaria. Faltan dos, que el importador escribe aparte: `content_imports` y `exercise_grading_versions`. | `public static function keyOf(string $table, array $row): string` |
| `RowSet` (class) | Las filas de contenido de todas las tablas de ContentTables, cada una por su clave primaria. Sólo las columnas de datos: el ciclo de vida (status, retired_at, created_at, updated_at) lo pone el escritor. | `public function __construct()`<br>`public function add(string $table, array $row): void`<br>`public function addAll(array $byTable): void`<br>`public function keyed(string $table): array`<br>`public function rows(string $table): array`<br>`public function toArray(): array` |
| `ContentRows` (class) | El documento → las filas de todas las tablas de contenido, con las referencias entre registros validadas (el generador valida la forma de cada archivo, no que un mundo o el Atlas nombren ejercicios que existen). Cada error nombra el campo del documento. | `public function __construct(private ExerciseCodec $exercises, private WorkshopCodec $workshops, private WorldCodec $worlds, private AtlasCodec $atlas, private GuideCodec $guide,)`<br>`public function fromSource(ContentSource $source): RowSet` |
| `PortionAssembler` (class) | Las filas → los bytes de una porción: el único camino de las tablas a lo que publica la API (ADR 0006 D10). Es puro: no lee la base, así que el mismo código arma una porción desde las filas que acaba de calcular el import (en las pruebas) y desde las que lee la base. Ordena por `position` y filtra por la porción: sobra cualquier fila que no sea suya. | `public function __construct(private ExerciseCodec $exercises, private WorkshopCodec $workshops, private WorldCodec $worlds, private AtlasCodec $atlas, private GuideCodec $guide,)`<br>`public function assemble(Portion $portion, array $rows, array $languages): string` |
| `ContentFixture` (class) | Una copia editable del contenido de la imagen (resources/content) para probar el import con cambios. Al escribirla, recalcula el meta del documento editado con PublishedJson y su propio JSON canónico. No es tautológico: ContentFixtureTest ata esas dos piezas al generador, porque la copia sin cambios tiene que reproducir el meta que escribió tools/content. | `public static function fromImage(): self`<br>`public static function imagePath(): string`<br>`public function exercise(string $id): stdClass`<br>`public function withoutExercise(string $id): self`<br>`public function unreferencedLabExercise(string $language = 'rust'): string`<br>`public function write(?int $indent = 2, ?Closure $editMeta = null): string`<br>`public static function cleanup(): void`<br>`public function recomputedMeta(string $document): array`<br>`public function documentText(?int $indent = 2): string`<br>`public static function canonical(mixed $value): string` |

**Compuerta del agente:** `npm run api:test -- --testsuite=Unit` y `npm run api:format:check` en verde; `npm run api:test:down` al terminar.

### Tarea 3.1 · El encoder único, `PublishedJson` (T011)

**Archivos:** crear `api/tests/Unit/PublishedJsonTest.php` y `api/app/Content/PublishedJson.php`.

**Qué hace:** es el único encoder de contenido de PHP (FR-014). Produce los bytes que produce `JSON.stringify` con el orden de claves publicado: `JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR`, los objetos son siempre `stdClass` (un arreglo asociativo con claves `"0"`, `"1"`… sale como lista y uno vacío sale `[]`), y decodifica con objetos para no convertir `{}` en `[]`. Los esperados de la prueba están escritos a mano: `ñ`, un carácter fuera del plano básico, U+2028 y U+2029, la barra, `\u001f`, `{}` frente a `[]`, objetos vacíos anidados y claves numéricas.

1. Copiá la prueba:

`api/tests/Unit/PublishedJsonTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\PublishedJson;

// Los esperados son lo que JSON.stringify de JavaScript da para el mismo valor (se comprobaron con
// node): es lo que hashea tools/content/meta.ts, así que PHP tiene que dar los mismos bytes.
it('codifica como JSON.stringify', function (mixed $value, string $expected) {
    expect(PublishedJson::encode($value))->toBe($expected);
})->with([
    'eñe' => ['ñ', '"ñ"'],
    'fuera del plano básico' => ['😀', '"😀"'],
    'separadores de línea y de párrafo, sin escapar' => ["a\u{2028}b\u{2029}c", "\"a\u{2028}b\u{2029}c\""],
    'barra sin escapar' => ['a/b', '"a/b"'],
    'control sin nombre, con hex en minúsculas' => ["x\u{1f}y", '"x\u001fy"'],
    'controles con nombre' => ["\x08\x0c\n\r\t", '"\b\f\n\r\t"'],
    'DEL sin escapar' => ["a\x7fb", "\"a\x7fb\""],
    'comillas y barra invertida' => ['he said "hi" \\ ok', '"he said \"hi\" \\\\ ok"'],
    '<, > y & sin escapar' => ['<a href="x">&\'</a>', '"<a href=\"x\">&\'</a>"'],
    'objeto vacío' => [new stdClass, '{}'],
    'lista vacía' => [[], '[]'],
    'objetos y listas vacíos anidados' => [(object) ['a' => new stdClass, 'b' => [], 'c' => [new stdClass]], '{"a":{},"b":[],"c":[{}]}'],
    'registro mixto' => [
        (object) ['id' => 'rust-01', 'tests' => [(object) ['id' => 't1']], 'n' => 3, 'ok' => true, 'no' => false],
        '{"id":"rust-01","tests":[{"id":"t1"}],"n":3,"ok":true,"no":false}',
    ],
]);

it('un array con claves "0", "1"… sale como lista', function () {
    expect(PublishedJson::encode(['0' => 'a', '1' => 'b']))->toBe('["a","b"]');
});

// JSON.stringify ordenaría 0 antes que 1; PHP conserva el orden de inserción. El documento no tiene
// claves así: si apareciera una, el auto-chequeo del import fallaría en lugar de publicar otros bytes.
it('conserva el orden de inserción de un objeto, también con claves numéricas', function () {
    expect(PublishedJson::encode((object) ['1' => 'a', '0' => 'b']))->toBe('{"1":"a","0":"b"}');
});

it('decodifica con objetos para no convertir {} en []', function () {
    expect(PublishedJson::encode(PublishedJson::decode('{"a":{},"b":[],"c":[{"d":{}}]}')))
        ->toBe('{"a":{},"b":[],"c":[{"d":{}}]}');
});

it('rechaza un texto que no es UTF-8 en lugar de publicar otra cosa', function () {
    PublishedJson::encode("\xff");
})->throws(JsonException::class);
```

2. Corré `npm run api:test -- --filter=PublishedJsonTest`. **Esperado:** falla con `Class "App\Content\PublishedJson" not found`.
3. Implementá:

`api/app/Content/PublishedJson.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

/**
 * El único codificador de lo que publica la API (ADR 0006 D10): da, byte a byte, lo mismo que
 * JSON.stringify de JavaScript sobre el mismo valor, que es lo que hashea el generador
 * (tools/content/meta.ts). Compacto, sin escapar Unicode, `/` ni U+2028/U+2029.
 *
 * Los objetos JSON son siempre stdClass: un array asociativo con claves «0», «1»… sale como lista
 * y uno vacío sale `[]`, así que `{}` sólo se conserva con un stdClass vacío.
 */
final class PublishedJson
{
    private const ENCODE = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR;

    public static function encode(mixed $value): string
    {
        return json_encode($value, self::ENCODE);
    }

    /** Decodifica con objetos (stdClass) para que `{}` siga siendo `{}` al volver a codificar. */
    public static function decode(string $json): mixed
    {
        return json_decode($json, false, 512, JSON_THROW_ON_ERROR);
    }
}
```

4. Corré de nuevo. **Esperado:** pasa.

### Tarea 3.2 · Las 17 porciones, `Portion` (T012)

**Archivos:** crear `api/tests/Unit/PortionTest.php`, `api/app/Content/Portion.php` y `api/app/Content/InvalidPortionRequest.php`.

**Qué hace:** `Portion` es el enum de las 17 porciones, en el orden en que las publica el generador; su valor es la ruta dentro de `curriculum.json` y la clave de `portions` en el meta. `Portion::resolve($resource, $query)` devuelve la porción que pide un recurso con sus parámetros o lanza `InvalidPortionRequest` con un mensaje por parámetro: falta el que exige el recurso, sobra el otro, o el valor o el catálogo no es válido (FR-016).

1. Copiá la prueba:

`api/tests/Unit/PortionTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\InvalidPortionRequest;
use App\Content\Portion;

it('son 17 porciones, en el orden en que las publica el generador', function () {
    expect(array_map(fn (Portion $portion) => $portion->value, Portion::cases()))->toBe([
        'lab.rust', 'lab.go', 'quests.rust', 'quests.go',
        'cores.lowlevel', 'cores.infra', 'cores.play', 'cores.pc',
        'campaign.rust', 'campaign.go',
        'workshops.lowlevel', 'workshops.infra', 'workshops.play', 'workshops.pc',
        'atlas.rust', 'atlas.go', 'guide',
    ]);
});

it('resuelve cada recurso por su parámetro', function (string $resource, array $query, Portion $expected) {
    expect(Portion::resolve($resource, $query))->toBe($expected);
})->with([
    'ejercicios del recorrido' => ['exercises', ['catalog' => 'lab', 'language' => 'rust'], Portion::LabRust],
    'ejercicios de desafíos' => ['exercises', ['catalog' => 'quests', 'language' => 'go'], Portion::QuestsGo],
    'núcleos por dominio' => ['exercises', ['catalog' => 'cores', 'domain' => 'infra'], Portion::CoresInfra],
    'mundos' => ['worlds', ['language' => 'go'], Portion::CampaignGo],
    'talleres' => ['workshops', ['domain' => 'pc'], Portion::WorkshopsPc],
    'atlas' => ['atlas', ['language' => 'rust'], Portion::AtlasRust],
    'guía' => ['guide', [], Portion::Guide],
    'la guía ignora lo que sobre' => ['guide', ['language' => 'rust'], Portion::Guide],
]);

it('responde con un mensaje por parámetro cuando el pedido no corresponde a una porción', function (string $resource, array $query, array $parameters) {
    try {
        Portion::resolve($resource, $query);
        $this->fail('se esperaba InvalidPortionRequest');
    } catch (InvalidPortionRequest $error) {
        expect(array_keys($error->errors))->toBe($parameters);
    }
})->with([
    'sin catálogo' => ['exercises', [], ['catalog']],
    'catálogo desconocido' => ['exercises', ['catalog' => 'esenciales', 'language' => 'rust'], ['catalog']],
    'lab sin lenguaje' => ['exercises', ['catalog' => 'lab'], ['language']],
    'lab con dominio en lugar de lenguaje' => ['exercises', ['catalog' => 'lab', 'domain' => 'pc'], ['language', 'domain']],
    'lab con los dos' => ['exercises', ['catalog' => 'lab', 'language' => 'rust', 'domain' => 'pc'], ['domain']],
    'cores con lenguaje' => ['exercises', ['catalog' => 'cores', 'language' => 'rust'], ['language', 'domain']],
    'lenguaje desconocido' => ['worlds', ['language' => 'cobol'], ['language']],
    'lenguaje vacío' => ['atlas', ['language' => ''], ['language']],
    'lenguaje como lista' => ['atlas', ['language' => ['rust']], ['language']],
    'dominio desconocido' => ['workshops', ['domain' => 'cloud'], ['domain']],
    'talleres con lenguaje' => ['workshops', ['domain' => 'pc', 'language' => 'rust'], ['language']],
]);
```

2. Corré `npm run api:test -- --filter=PortionTest`. **Esperado:** falla con `Class "App\Content\Portion" not found`.
3. Implementá:

`api/app/Content/Portion.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use InvalidArgumentException;

/**
 * Las 17 porciones de contenido que sirve la API (ADR 0006 D11). El valor es la ruta dentro de
 * curriculum.json y la clave de `portions` en curriculum.meta.json, que fija el generador.
 */
enum Portion: string
{
    case LabRust = 'lab.rust';
    case LabGo = 'lab.go';
    case QuestsRust = 'quests.rust';
    case QuestsGo = 'quests.go';
    case CoresLowlevel = 'cores.lowlevel';
    case CoresInfra = 'cores.infra';
    case CoresPlay = 'cores.play';
    case CoresPc = 'cores.pc';
    case CampaignRust = 'campaign.rust';
    case CampaignGo = 'campaign.go';
    case WorkshopsLowlevel = 'workshops.lowlevel';
    case WorkshopsInfra = 'workshops.infra';
    case WorkshopsPlay = 'workshops.play';
    case WorkshopsPc = 'workshops.pc';
    case AtlasRust = 'atlas.rust';
    case AtlasGo = 'atlas.go';
    case Guide = 'guide';

    public const LANGUAGES = ['rust', 'go'];

    public const DOMAINS = ['lowlevel', 'infra', 'play', 'pc'];

    public const CATALOGS = ['lab', 'quests', 'cores'];

    /** lab, quests, cores, campaign, workshops, atlas o guide. */
    public function group(): string
    {
        return explode('.', $this->value)[0];
    }

    /** El lenguaje o el dominio que corta la porción; null en la guía. */
    public function slice(): ?string
    {
        return explode('.', $this->value)[1] ?? null;
    }

    public function isExercises(): bool
    {
        return in_array($this->group(), self::CATALOGS, true);
    }

    /** El parámetro de consulta que corta el recurso: language, domain o null (la guía). */
    public static function sliceBy(string $group): ?string
    {
        return match ($group) {
            'lab', 'quests', 'campaign', 'atlas' => 'language',
            'cores', 'workshops' => 'domain',
            default => null,
        };
    }

    /**
     * La porción que pide un recurso con sus parámetros, o InvalidPortionRequest con un mensaje
     * por parámetro. $resource es exercises, worlds, workshops, atlas o guide.
     *
     * @param  array<string, mixed>  $query
     */
    public static function resolve(string $resource, array $query): self
    {
        $group = match ($resource) {
            'exercises' => self::catalogOf($query),
            'worlds' => 'campaign',
            'workshops', 'atlas', 'guide' => $resource,
            default => throw new InvalidArgumentException("Recurso de contenido desconocido: {$resource}"),
        };
        $sliceBy = self::sliceBy($group);
        if ($sliceBy === null) {
            return self::Guide;
        }

        $allowed = ['language' => self::LANGUAGES, 'domain' => self::DOMAINS];
        $errors = [];
        foreach ($allowed as $param => $values) {
            if ($param !== $sliceBy) {
                if (array_key_exists($param, $query)) {
                    $errors[$param] = ["Sobra el parámetro {$param}: este recurso se corta por {$sliceBy}."];
                }

                continue;
            }
            $value = $query[$param] ?? null;
            $options = implode(' o ', $values);
            if ($value === null) {
                $errors[$param] = ["Falta el parámetro {$param}: usá {$options}."];
            } elseif (! is_string($value) || ! in_array($value, $values, true)) {
                $errors[$param] = ["El valor de {$param} no es válido: usá {$options}."];
            }
        }
        if ($errors !== []) {
            throw new InvalidPortionRequest($errors);
        }

        return self::from("{$group}.{$query[$sliceBy]}");
    }

    /** @param array<string, mixed> $query */
    private static function catalogOf(array $query): string
    {
        $catalog = $query['catalog'] ?? null;
        if (! is_string($catalog) || ! in_array($catalog, self::CATALOGS, true)) {
            throw new InvalidPortionRequest(['catalog' => ['Falta el catálogo o no es válido: usá lab, quests o cores.']]);
        }

        return $catalog;
    }
}
```

`api/app/Content/InvalidPortionRequest.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use RuntimeException;

/** Los parámetros de un pedido de contenido no corresponden a ninguna porción (422). */
final class InvalidPortionRequest extends RuntimeException
{
    /** @param array<string, list<string>> $errors un mensaje por parámetro */
    public function __construct(public readonly array $errors)
    {
        parent::__construct('Los parámetros del pedido no son válidos.');
    }
}
```

4. Corré de nuevo. **Esperado:** pasa.

### Tarea 3.3 · El documento y su meta, `ContentSource`, y el fixture de pruebas (T013)

**Archivos:** crear `api/tests/Unit/ContentSourceTest.php`, `api/tests/Unit/ContentFixtureTest.php`, `api/tests/Support/ContentFixture.php`, `api/app/Content/ContentSource.php` y `api/app/Content/InvalidContent.php`.

**Qué hace:**

- `ContentSource::fromDirectory` lee `curriculum.json` y `curriculum.meta.json`, valida el meta nombrando el archivo y el campo que falla y rechaza un par que no corresponde (el `documentHash` del meta no es el sha256 del documento) pidiendo regenerar; `part(Portion)` devuelve la parte del documento y `sourceCommit()` es `null` o un hash completo (FR-006, FR-037).
- `Tests\Support\ContentFixture` es una copia editable del contenido de la imagen para probar el import con cambios. Al escribirla recalcula el meta con `PublishedJson` y su propio JSON canónico. No es tautológico: `ContentFixtureTest` exige que la copia sin cambios reproduzca el meta que escribió el generador, y así ata esas dos piezas al generador.

1. Copiá las pruebas y el fixture:

`api/tests/Unit/ContentSourceTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\ContentSource;
use App\Content\InvalidContent;
use Closure;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

it('lee el documento y su meta de la imagen', function () {
    $source = ContentSource::fromDirectory(ContentFixture::imagePath());

    expect($source->document)->toBe(file_get_contents(ContentFixture::imagePath().'/curriculum.json'))
        ->and($source->documentHash())->toBe(hash('sha256', $source->document))
        ->and($source->languages())->toBe(['rust', 'go'])
        ->and($source->meta['portions'])->toHaveCount(17)
        ->and($source->meta['exercises'])->toHaveCount(274)
        ->and($source->meta['workshopSteps'])->toHaveCount(25);
});

it('rechaza un meta de otro build', function () {
    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", file_get_contents("{$directory}/curriculum.json").' ');

    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json no corresponde a este curriculum.json');
});

it('nombra el archivo que falta o que no es JSON', function () {
    $directory = ContentFixture::fromImage()->write();
    unlink("{$directory}/curriculum.meta.json");
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, "curriculum.meta.json: no existe en {$directory}");

    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", '{"lab": ');
    expect(fn () => ContentSource::fromDirectory($directory))
        ->toThrow(InvalidContent::class, 'curriculum.json: no es JSON válido');
});

it('valida el meta y nombra el campo', function (Closure $break, string $message) {
    $directory = ContentFixture::fromImage()->write(editMeta: $break);

    expect(fn () => ContentSource::fromDirectory($directory))->toThrow(InvalidContent::class, $message);
})->with([
    'commit que no es un hash' => [
        fn (array $meta) => ['sourceCommit' => 'master'] + $meta,
        'curriculum.meta.json: sourceCommit: se esperaba null o el hash completo de un commit',
    ],
    'una porción menos' => [
        function (array $meta) {
            unset($meta['portions']['guide']);

            return $meta;
        },
        'curriculum.meta.json: portions: se esperaban las 17 porciones',
    ],
    'huella de porción inválida' => [
        function (array $meta) {
            $meta['portions']['lab.go'] = 'no-es-un-hash';

            return $meta;
        },
        'curriculum.meta.json: portions.lab.go: se esperaba un sha256 en hexadecimal',
    ],
    'huella de ejercicio inválida' => [
        function (array $meta) {
            $meta['exercises']['rust-01']['gradingHash'] = 'x';

            return $meta;
        },
        'curriculum.meta.json: exercises.rust-01.gradingHash: se esperaba un sha256 en hexadecimal',
    ],
    'etapa sin clave' => [
        function (array $meta) {
            $meta['workshopSteps']['cache'][0] = ['v1Index' => 0];

            return $meta;
        },
        'curriculum.meta.json: workshopSteps.cache[0]: se esperaba {id, v1Index}',
    ],
]);
```

`api/tests/Unit/ContentFixtureTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\ContentSource;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

// Ata PublishedJson y el JSON canónico de la copia al generador (tools/content/meta.ts): con el
// contenido sin tocar, el meta que recalcula PHP tiene que ser el que escribió Node.
it('reproduce el meta del generador cuando el contenido no cambia', function () {
    $fixture = ContentFixture::fromImage();
    $original = $fixture->meta;

    $meta = $fixture->recomputedMeta($fixture->documentText());

    expect($meta['portions'])->toBe($original['portions'])
        ->and($meta['exercises'])->toBe($original['exercises'])
        ->and($meta['documentHash'])->toBe($original['documentHash']);
});

it('escribe un par que ContentSource acepta', function () {
    $fixture = ContentFixture::fromImage();
    $fixture->document->guide->sources[0]->note = 'Nota nueva';

    $source = ContentSource::fromDirectory($fixture->write());

    expect($source->part(App\Content\Portion::Guide)->sources[0]->note)->toBe('Nota nueva');
});
```

`api/tests/Support/ContentFixture.php` (referencia sin ejecutar)

```php
<?php

namespace Tests\Support;

use App\Content\Portion;
use App\Content\PublishedJson;
use Closure;
use LogicException;
use stdClass;

/**
 * Una copia editable del contenido de la imagen (resources/content) para probar el import con
 * cambios. Al escribirla, recalcula el meta del documento editado con PublishedJson y su propio
 * JSON canónico. No es tautológico: ContentFixtureTest ata esas dos piezas al generador, porque
 * la copia sin cambios tiene que reproducir el meta que escribió tools/content.
 */
final class ContentFixture
{
    /** @var list<string> */
    private static array $directories = [];

    /** @param array<string, mixed> $meta */
    private function __construct(public stdClass $document, public array $meta) {}

    public static function fromImage(): self
    {
        $path = self::imagePath();

        return new self(
            json_decode(file_get_contents("{$path}/curriculum.json"), false, 512, JSON_THROW_ON_ERROR),
            json_decode(file_get_contents("{$path}/curriculum.meta.json"), true, 512, JSON_THROW_ON_ERROR),
        );
    }

    public static function imagePath(): string
    {
        return dirname(__DIR__, 2).'/resources/content';
    }

    /** El registro de un ejercicio, para editarlo en el lugar. */
    public function exercise(string $id): stdClass
    {
        foreach ($this->exerciseLists() as $list) {
            foreach ($list as $exercise) {
                if ($exercise->id === $id) {
                    return $exercise;
                }
            }
        }
        throw new LogicException("{$id} no está en el contenido");
    }

    /** Saca un ejercicio de su lista y del meta. */
    public function withoutExercise(string $id): self
    {
        foreach (['lab', 'quests', 'cores'] as $catalog) {
            foreach ($this->document->{$catalog} as $slice => $list) {
                $this->document->{$catalog}->{$slice} = array_values(array_filter($list, fn (stdClass $exercise) => $exercise->id !== $id));
            }
        }
        unset($this->meta['exercises'][$id]);

        return $this;
    }

    /** Un ejercicio del recorrido que nada referencia: se puede retirar sin romper referencias. */
    public function unreferencedLabExercise(string $language = 'rust'): string
    {
        $referenced = [];
        foreach ($this->document->campaign->{$language} as $world) {
            array_push($referenced, ...$world->trainingIds, ...$world->challengeIds);
        }
        foreach ($this->document->atlas->{$language} as $concept) {
            $referenced[] = $concept->labId;
        }
        foreach ($this->document->workshops as $workshops) {
            foreach ($workshops as $workshop) {
                array_push($referenced, ...$workshop->related->{$language});
            }
        }
        foreach ($this->document->lab->{$language} as $exercise) {
            if (! in_array($exercise->id, $referenced, true)) {
                return $exercise->id;
            }
        }
        throw new LogicException("todo el recorrido de {$language} está referenciado");
    }

    /**
     * Escribe el par en una carpeta nueva y devuelve su ruta. El documento sale con la sangría del
     * generador (null: compacto). `$editMeta` retoca el meta ya recalculado, para probar uno roto
     * con su documentHash al día.
     *
     * @param  ?Closure(array<string, mixed>): array<string, mixed>  $editMeta
     */
    public function write(?int $indent = 2, ?Closure $editMeta = null): string
    {
        $directory = sys_get_temp_dir().'/taller-content-'.bin2hex(random_bytes(6));
        mkdir($directory, 0700, true);
        self::$directories[] = $directory;
        $document = $this->documentText($indent);
        $meta = $this->recomputedMeta($document);
        file_put_contents("{$directory}/curriculum.json", $document);
        file_put_contents("{$directory}/curriculum.meta.json", json_encode($editMeta === null ? $meta : $editMeta($meta), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $directory;
    }

    public static function cleanup(): void
    {
        foreach (self::$directories as $directory) {
            array_map('unlink', glob("{$directory}/*") ?: []);
            @rmdir($directory);
        }
        self::$directories = [];
    }

    /** @return array<string, mixed> el meta con las huellas del documento actual; el resto, tal cual */
    public function recomputedMeta(string $document): array
    {
        $meta = $this->meta;
        $meta['documentHash'] = hash('sha256', $document);
        foreach (Portion::cases() as $portion) {
            $meta['portions'][$portion->value] = hash('sha256', PublishedJson::encode($this->part($portion)));
        }
        $meta['exercises'] = [];
        foreach ($this->exerciseLists() as $list) {
            foreach ($list as $exercise) {
                $meta['exercises'][$exercise->id] = [
                    'contentHash' => hash('sha256', PublishedJson::encode($exercise)),
                    'gradingHash' => hash('sha256', self::canonical([
                        'tests' => array_map(fn (stdClass $test) => ['id' => $test->id, 'expression' => $test->expression], $exercise->tests),
                        'prediction' => ['options' => $exercise->prediction->options, 'answer' => $exercise->prediction->answer],
                    ])),
                    'starterHash' => hash('sha256', self::canonical($exercise->starter)),
                ];
            }
        }

        return $meta;
    }

    public function documentText(?int $indent = 2): string
    {
        $text = PublishedJson::encode($this->document);
        // Sangría sin depender de JSON_PRETTY_PRINT (que usa 4 espacios): vuelve a codificar con la que se pida.
        return $indent === null ? $text."\n" : self::indented(json_decode($text), $indent)."\n";
    }

    private function part(Portion $portion): mixed
    {
        $group = $this->document->{$portion->group()};

        return $portion->slice() === null ? $group : $group->{$portion->slice()};
    }

    /** @return list<list<stdClass>> las 14 listas de ejercicios del documento */
    private function exerciseLists(): array
    {
        $lists = [];
        foreach (['lab', 'quests', 'cores'] as $catalog) {
            foreach ($this->document->{$catalog} as $list) {
                $lists[] = $list;
            }
        }

        return $lists;
    }

    /** JSON canónico del ADR 0004 §2: claves ordenadas en todos los niveles, sin espacios. */
    public static function canonical(mixed $value): string
    {
        return PublishedJson::encode(self::sorted($value));
    }

    private static function sorted(mixed $value): mixed
    {
        if ($value instanceof stdClass) {
            $value = (array) $value;
        }
        if (! is_array($value)) {
            return $value;
        }
        if (array_is_list($value)) {
            return array_map(self::sorted(...), $value);
        }
        ksort($value, SORT_STRING);

        return (object) array_map(self::sorted(...), $value);
    }

    private static function indented(mixed $value, int $indent, int $level = 0): string
    {
        $pad = str_repeat(' ', $indent * ($level + 1));
        $close = str_repeat(' ', $indent * $level);
        if ($value instanceof stdClass) {
            $value = get_object_vars($value);
            if ($value === []) {
                return '{}';
            }
            $items = [];
            foreach ($value as $key => $item) {
                $items[] = $pad.PublishedJson::encode((string) $key).': '.self::indented($item, $indent, $level + 1);
            }

            return "{\n".implode(",\n", $items)."\n{$close}}";
        }
        if (is_array($value)) {
            if ($value === []) {
                return '[]';
            }

            return "[\n".implode(",\n", array_map(fn ($item) => $pad.self::indented($item, $indent, $level + 1), $value))."\n{$close}]";
        }

        return PublishedJson::encode($value);
    }
}
```

2. Corré `npm run api:test -- --filter=ContentSourceTest` y `--filter=ContentFixtureTest`. **Esperado:** fallan con `Class "App\Content\ContentSource" not found`.
3. Implementá:

`api/app/Content/ContentSource.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use JsonException;
use stdClass;

/**
 * Los dos archivos que genera tools/content/ (build-curriculum.ts), leídos y verificados:
 * curriculum.json, con la forma que publica la API, y curriculum.meta.json, con las huellas y las
 * claves que PHP guarda y compara pero nunca recalcula (ADR 0006 D10 a D14). Un meta de otro build
 * se rechaza: sus huellas no describirían el contenido que se importa.
 */
final readonly class ContentSource
{
    private const SHA256 = '/\A[0-9a-f]{64}\z/';

    private const COMMIT = '/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/';

    /** @param array<string, mixed> $meta */
    private function __construct(public string $document, public stdClass $decoded, public array $meta) {}

    public static function fromDirectory(string $path): self
    {
        $document = self::read($path, 'curriculum.json');
        $metaText = self::read($path, 'curriculum.meta.json');
        $decoded = self::decode($document, 'curriculum.json', false);
        $meta = self::decode($metaText, 'curriculum.meta.json', true);
        if (! $decoded instanceof stdClass) {
            throw InvalidContent::at('curriculum.json', '(raíz)', 'se esperaba un objeto');
        }
        if (! is_array($meta)) {
            throw InvalidContent::at('curriculum.meta.json', '(raíz)', 'se esperaba un objeto');
        }
        if (($meta['documentHash'] ?? null) !== hash('sha256', $document)) {
            throw new InvalidContent('curriculum.meta.json no corresponde a este curriculum.json (son de builds distintos): regeneralos juntos con npm run curriculum o reconstruí la imagen.');
        }
        self::validateMeta($meta);

        return new self($document, $decoded, $meta);
    }

    public function documentHash(): string
    {
        return $this->meta['documentHash'];
    }

    public function sourceCommit(): ?string
    {
        return $this->meta['sourceCommit'];
    }

    /** @return list<string> en el orden de `languages.position` */
    public function languages(): array
    {
        return $this->meta['languages'];
    }

    /** La parte del documento que corresponde a una porción, para explicar una diferencia. */
    public function part(Portion $portion): mixed
    {
        $group = $this->decoded->{$portion->group()};

        return $portion->slice() === null ? $group : $group->{$portion->slice()};
    }

    private static function read(string $path, string $file): string
    {
        $full = rtrim($path, '/')."/{$file}";
        if (! is_file($full)) {
            throw new InvalidContent("{$file}: no existe en {$path}");
        }

        return file_get_contents($full);
    }

    private static function decode(string $text, string $file, bool $associative): mixed
    {
        try {
            return json_decode($text, $associative, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            throw new InvalidContent("{$file}: no es JSON válido: {$error->getMessage()}", previous: $error);
        }
    }

    /** @param array<string, mixed> $meta */
    private static function validateMeta(array $meta): void
    {
        $fail = fn (string $path, string $problem) => throw InvalidContent::at('curriculum.meta.json', $path, $problem);
        $isHash = fn (mixed $value): bool => is_string($value) && preg_match(self::SHA256, $value) === 1;

        $commit = $meta['sourceCommit'] ?? null;
        if ($commit !== null && (! is_string($commit) || preg_match(self::COMMIT, $commit) !== 1)) {
            $fail('sourceCommit', 'se esperaba null o el hash completo de un commit');
        }
        $languages = $meta['languages'] ?? null;
        if (! is_array($languages) || $languages === [] || ! array_is_list($languages) || array_filter($languages, 'is_string') !== $languages) {
            $fail('languages', 'se esperaba la lista de lenguajes');
        }
        $catalogs = $meta['catalogs'] ?? null;
        if (! is_array($catalogs) || $catalogs === [] || ! array_is_list($catalogs)) {
            $fail('catalogs', 'se esperaba la lista de catálogos');
        }
        foreach ($catalogs as $index => $catalog) {
            $position = is_array($catalog) ? ($catalog['chainPosition'] ?? null) : null;
            if (! is_array($catalog) || ! is_string($catalog['code'] ?? null)
                || ! in_array($catalog['sliceBy'] ?? null, ['language', 'domain'], true)
                || ($position !== null && (! is_int($position) || $position < 1))) {
                $fail("catalogs[{$index}]", 'se esperaba {code, sliceBy, chainPosition}');
            }
        }
        $portions = $meta['portions'] ?? null;
        $names = array_map(fn (Portion $portion) => $portion->value, Portion::cases());
        if (! is_array($portions) || array_keys($portions) !== $names) {
            $fail('portions', 'se esperaban las 17 porciones, en el orden de la API');
        }
        foreach ($portions as $name => $hash) {
            if (! $isHash($hash)) {
                $fail("portions.{$name}", 'se esperaba un sha256 en hexadecimal');
            }
        }
        $exercises = $meta['exercises'] ?? null;
        if (! is_array($exercises)) {
            $fail('exercises', 'se esperaba un objeto con las huellas de cada ejercicio');
        }
        foreach ($exercises as $id => $hashes) {
            foreach (['contentHash', 'gradingHash', 'starterHash'] as $key) {
                if (! is_array($hashes) || ! $isHash($hashes[$key] ?? null)) {
                    $fail("exercises.{$id}.{$key}", 'se esperaba un sha256 en hexadecimal');
                }
            }
        }
        $steps = $meta['workshopSteps'] ?? null;
        if (! is_array($steps)) {
            $fail('workshopSteps', 'se esperaba un objeto con las claves de etapa de cada taller');
        }
        foreach ($steps as $workshop => $keys) {
            if (! is_array($keys) || ! array_is_list($keys)) {
                $fail("workshopSteps.{$workshop}", 'se esperaba una lista de claves de etapa');
            }
            foreach ($keys as $index => $key) {
                $v1 = is_array($key) ? ($key['v1Index'] ?? null) : null;
                if (! is_array($key) || ! is_string($key['id'] ?? null) || ($v1 !== null && (! is_int($v1) || $v1 < 0))) {
                    $fail("workshopSteps.{$workshop}[{$index}]", 'se esperaba {id, v1Index}');
                }
            }
        }
    }
}
```

`api/app/Content/InvalidContent.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use RuntimeException;

/** Un curriculum.json o un curriculum.meta.json que content:import no puede cargar. */
final class InvalidContent extends RuntimeException
{
    /** El mensaje nombra el archivo y el campo, como los del generador (tools/content/). */
    public static function at(string $file, string $path, string $problem): self
    {
        return new self("{$file}: {$path}: {$problem}");
    }
}
```

4. Corré de nuevo. **Esperado:** pasan las dos. Si `ContentFixtureTest` falla por una diferencia de hashes, el defecto es del fixture o de `PublishedJson`, no del meta: el meta lo escribió Node.

### Tarea 3.4 · Los códecs y las filas de cada registro (T014)

**Archivos:** crear `api/tests/Unit/ContentRowsTest.php`, `api/tests/Unit/ContentRoundTripTest.php`, `api/app/Content/ContentTables.php`, `api/app/Content/RowSet.php`, `api/app/Content/ContentRows.php` y `api/app/Content/Codec/{Field,FieldType,FieldMap,ExerciseCodec,WorkshopCodec,WorldCodec,AtlasCodec,GuideCodec}.php`.

**Qué hace:**

- Un códec por tipo de registro (ejercicio, taller, mundo, concepto del Atlas y guía) con un mapa declarativo de cada clave a su almacenamiento: una columna (`Field`, de tipo `FieldType::Text`, `Number`, `Flag` o `Json`), una tabla hija o un valor derivado de otras tablas. Se interpreta en las dos direcciones, guiado por `key_order`: `toRows` para el import y `toRecord` para el render. La regla de cada clave se escribe una sola vez.
- `ContentRows::fromSource` convierte el documento en un `RowSet`: las filas de cada tabla, con sus claves y sus referencias validadas (un tema con dos etiquetas, un ID repetido, una clave sin regla, un jefe que no es el último desafío, una referencia a un ejercicio de otro catálogo o lenguaje, una cadena de catálogos no contigua, un meta y un documento con ejercicios o talleres distintos). Las huellas salen del meta, no se recalculan.
- `ContentTables` describe las tablas que escribe el import por filas, en orden de dependencias y con las columnas de su clave primaria; `RowSet` las indexa por esa clave.

1. Copiá las dos pruebas:

`api/tests/Unit/ContentRowsTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentRows;
use App\Content\ContentSource;
use App\Content\InvalidContent;
use App\Content\RowSet;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

function rowsOf(ContentFixture $fixture, ?Closure $editMeta = null): RowSet
{
    $rows = new ContentRows(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec);

    return $rows->fromSource(ContentSource::fromDirectory($fixture->write(editMeta: $editMeta)));
}

it('rechaza un tema con dos etiquetas en el mismo lenguaje', function () {
    $fixture = ContentFixture::fromImage();
    [$first, $second] = $fixture->document->lab->rust;
    $second->topicId = $first->topicId;
    $second->topic = 'Otra etiqueta';

    expect(fn () => rowsOf($fixture))->toThrow(
        InvalidContent::class,
        "curriculum.json: lab.rust[1].topic: el tema {$first->topicId} de rust ya se llama «{$first->topic}» y acá dice «Otra etiqueta»",
    );
});

it('rechaza un ID de ejercicio repetido', function () {
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->lab->rust[0]->id;
    $fixture->document->lab->go[0]->id = $id;

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, "curriculum.json: lab.go[0].id: «{$id}» se repite");
});

it('rechaza una clave sin regla y una clave obligatoria que falta', function () {
    $extra = ContentFixture::fromImage();
    $extra->document->lab->rust[0]->extra = 1;
    expect(fn () => rowsOf($extra))->toThrow(InvalidContent::class, 'curriculum.json: lab.rust[0].extra: clave desconocida');

    $missing = ContentFixture::fromImage();
    unset($missing->document->lab->rust[0]->minutes);
    expect(fn () => rowsOf($missing))->toThrow(InvalidContent::class, 'curriculum.json: lab.rust[0]: falta la clave «minutes»');
});

it('exige que el jefe sea el último desafío del mundo', function () {
    $fixture = ContentFixture::fromImage();
    $world = $fixture->document->campaign->go[0];
    $world->bossId = $world->trainingIds[0];

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, 'curriculum.json: campaign.go[0].bossId: el jefe tiene que ser el último de challengeIds');
});

it('ata cada mundo, taller y concepto a ejercicios que existen, del catálogo y del lenguaje que corresponden', function (Closure $break, string $message) {
    $fixture = ContentFixture::fromImage();
    $break($fixture->document, $fixture);

    expect(fn () => rowsOf($fixture))->toThrow(InvalidContent::class, $message);
})->with([
    'un mundo nombra un ejercicio inexistente' => [
        fn (stdClass $document) => $document->campaign->rust[0]->trainingIds[0] = 'no-existe',
        'curriculum.json: campaign.rust[0].trainingIds[0]: se esperaba un ejercicio de lab en rust',
    ],
    'un desafío de otro lenguaje' => [
        fn (stdClass $document, ContentFixture $fixture) => $document->campaign->rust[0]->challengeIds[0] = $document->quests->go[0]->id,
        'curriculum.json: campaign.rust[0].challengeIds[0]: se esperaba un ejercicio de quests en rust',
    ],
    'el Atlas apunta a un desafío en lugar de a un ejercicio del recorrido' => [
        fn (stdClass $document) => $document->atlas->rust[0]->labId = $document->quests->rust[0]->id,
        'curriculum.json: atlas.rust[0].labId: se esperaba un ejercicio de lab en rust',
    ],
    'un taller relaciona un ejercicio de otro lenguaje' => [
        fn (stdClass $document) => $document->workshops->infra[0]->related->rust[0] = $document->lab->go[0]->id,
        'curriculum.json: workshops.infra[0].related.rust[0]: se esperaba un ejercicio de rust',
    ],
    'el núcleo de un taller es del recorrido' => [
        fn (stdClass $document) => $document->workshops->lowlevel[0]->code->rust = $document->lab->rust[0]->id,
        'curriculum.json: workshops.lowlevel[0].code.rust: se esperaba un núcleo de lowlevel en rust',
    ],
    'el workshopId de un núcleo no es el taller que lo lista' => [
        function (stdClass $document) {
            // El primer núcleo de infra con workshopId es el de su primer taller.
            $core = $document->cores->infra[0];
            $core->workshopId = $document->workshops->lowlevel[0]->id;
        },
        'curriculum.json: cores.infra[0].workshopId: no es el taller que lista a rust-',
    ],
    'un paso de la guía pide un recurso inexistente' => [
        fn (stdClass $document) => $document->guide->tracks->go->modules[0]->steps[0]->resourceIds[] = 'no-existe',
        '«no-existe» no es un recurso de guide.resources',
    ],
    'un mapa por lenguaje en otro orden' => [
        function (stdClass $document) {
            $bridge = $document->workshops->lowlevel[0]->bridge;
            $document->workshops->lowlevel[0]->bridge = (object) ['go' => $bridge->go, 'rust' => $bridge->rust];
        },
        'curriculum.json: workshops.lowlevel[0].bridge: un valor por lenguaje, en el orden de languages: rust, go',
    ],
]);

it('exige una clave por etapa publicada y la cadena de catálogos contigua', function () {
    $fixture = ContentFixture::fromImage();
    expect(fn () => rowsOf($fixture, function (array $meta) {
        array_pop($meta['workshopSteps']['cache']);

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache: 3 claves para 4 etapas: regenerá los dos archivos juntos');

    expect(fn () => rowsOf($fixture, function (array $meta) {
        $meta['catalogs'][0]['chainPosition'] = 1;
        $meta['catalogs'][2]['chainPosition'] = 3;

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: catalogs: la cadena de catálogos tiene que ser única y contigua, desde 1');
});

it('exige que el meta y el documento tengan los mismos ejercicios y talleres', function () {
    $missing = ContentFixture::fromImage();
    expect(fn () => rowsOf($missing, function (array $meta) {
        $meta['exercises']['rust-999'] = $meta['exercises']['rust-01'];

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: exercises.rust-999: no está en curriculum.json: regenerá los dos archivos juntos');

    expect(fn () => rowsOf(ContentFixture::fromImage(), function (array $meta) {
        unset($meta['workshopSteps']['cache']);

        return $meta;
    }))->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache: falta: regenerá los dos archivos juntos');
});
```

`api/tests/Unit/ContentRoundTripTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentRows;
use App\Content\ContentSource;
use App\Content\Portion;
use App\Content\PortionAssembler;
use App\Content\PublishedJson;
use Tests\Support\ContentFixture;

// El contrato sin base: el documento real → filas → bytes. Los esperados son las huellas que
// calculó el generador sobre los bytes de JSON.stringify (curriculum.meta.json): un oráculo
// independiente del código PHP que se prueba.
function contentRowsFor(ContentSource $source): array
{
    $rows = (new ContentRows(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec))->fromSource($source);

    return $rows->toArray();
}

beforeEach(function () {
    $this->source = ContentSource::fromDirectory(ContentFixture::imagePath());
    $this->rows = contentRowsFor($this->source);
    $this->assembler = new PortionAssembler(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec);
});

it('arma cada una de las 17 porciones con los bytes que fijó el generador', function (Portion $portion) {
    $bytes = $this->assembler->assemble($portion, $this->rows, $this->source->languages());

    expect(hash('sha256', $bytes))->toBe($this->source->meta['portions'][$portion->value]);
})->with(Portion::cases());

it('arma cada ejercicio con su contentHash', function () {
    $codec = new ExerciseCodec;
    $tests = collect($this->rows['exercise_tests'])->groupBy('exercise_id');
    $hints = collect($this->rows['exercise_hints'])->groupBy('exercise_id');
    $topics = collect($this->rows['topics'])->mapWithKeys(fn (array $topic) => ["{$topic['language']}|{$topic['topic_key']}" => $topic['label']]);

    $wrong = [];
    foreach ($this->rows['exercises'] as $exercise) {
        $record = $codec->toRecord(
            $exercise,
            $tests->get($exercise['id'], collect())->sortBy('position')->values()->all(),
            $hints->get($exercise['id'], collect())->sortBy('position')->values()->all(),
            $topics["{$exercise['language']}|{$exercise['topic_key']}"],
        );
        if (hash('sha256', PublishedJson::encode($record)) !== $this->source->meta['exercises'][$exercise['id']]['contentHash']) {
            $wrong[] = $exercise['id'];
        }
    }

    expect($wrong)->toBe([]);
});

it('arma las filas que dice el ADR 0006 §5.1', function () {
    expect(array_map('count', $this->rows))->toBe([
        'languages' => 2, 'catalogs' => 3, 'topics' => 98, 'workshops' => 25, 'exercises' => 274,
        'exercise_tests' => 822, 'exercise_hints' => 822, 'workshop_objectives' => 75, 'workshop_steps' => 100,
        'workshop_related_exercises' => 118, 'worlds' => 8, 'world_exercises' => 48, 'atlas_concepts' => 32,
        'guide_resources' => 15, 'guide_sources' => 9, 'guide_tracks' => 2, 'guide_modules' => 8,
        'guide_steps' => 24, 'guide_step_resources' => 56,
    ]);
});

it('no publica la clave ni el índice v1 de las etapas, y los guarda por separado', function () {
    $first = collect($this->rows['workshop_steps'])->firstWhere('workshop_id', 'algebra');

    expect($first)->toMatchArray(['step_key' => 'e1', 'v1_position' => 0, 'position' => 0])
        ->and(json_decode($first['key_order']))->toBe(['title', 'task', 'why', 'done']);
});

it('deja NULL lo que no está en el documento: el nivel de un ejercicio del recorrido y las fuentes adicionales', function () {
    $withoutLevel = collect($this->rows['exercises'])->first(fn (array $row) => $row['catalog'] === 'lab' && $row['level'] === null);
    $furtherSources = collect($this->rows['atlas_concepts'])->whereNull('further_sources_json')->count();

    expect(json_decode($withoutLevel['key_order']))->not->toContain('level')
        ->and($furtherSources)->toBe(30);
});

it('guarda el taller dueño de cada núcleo, también de los que no publican workshopId', function () {
    $cores = collect($this->rows['exercises'])->where('catalog', 'cores');

    expect($cores->whereNull('workshop_id')->count())->toBe(0)
        ->and($cores->filter(fn (array $row) => str_contains($row['key_order'], '"workshopId"'))->count())->toBe(16);
});
```

2. Corré `npm run api:test -- --testsuite=Unit`. **Esperado:** fallan `ContentRowsTest` y `ContentRoundTripTest` con `Class "App\Content\ContentRows" not found`.
3. Implementá en este orden, corriendo `--filter=ContentRowsTest` entre un paso y otro: primero `ContentTables`, `RowSet`, `Field`, `FieldType` y `FieldMap`; después `ExerciseCodec` y la parte de ejercicios de `ContentRows`; y por último los códecs de taller, mundo, Atlas y guía con sus métodos de `ContentRows`.

`api/app/Content/ContentTables.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

/**
 * Las tablas de contenido que escribe `content:import` por filas, en orden de dependencias (cada
 * clave foránea apunta a una anterior), con las columnas de su clave primaria. Faltan dos, que el
 * importador escribe aparte: `content_imports` y `exercise_grading_versions`.
 */
final class ContentTables
{
    /** @var array<string, list<string>> */
    public const KEYS = [
        'languages' => ['code'],
        'catalogs' => ['code'],
        'topics' => ['language', 'topic_key'],
        'workshops' => ['id'],
        'exercises' => ['id'],
        'exercise_tests' => ['exercise_id', 'test_key'],
        'exercise_hints' => ['exercise_id', 'position'],
        'workshop_objectives' => ['workshop_id', 'objective_key'],
        'workshop_steps' => ['workshop_id', 'step_key'],
        'workshop_related_exercises' => ['workshop_id', 'exercise_id'],
        'worlds' => ['id'],
        'world_exercises' => ['world_id', 'exercise_id'],
        'atlas_concepts' => ['id'],
        'guide_resources' => ['id'],
        'guide_sources' => ['position'],
        'guide_tracks' => ['language'],
        'guide_modules' => ['id'],
        'guide_steps' => ['id'],
        'guide_step_resources' => ['step_id', 'resource_id'],
    ];

    /** Sin ciclo de vida: no se retiran (ADR 0006 §5.1). */
    public const WITHOUT_LIFECYCLE = ['languages'];

    /**
     * Las tablas cuya `position` no es parte de la clave: al retirarse una fila, queda en NULL
     * (`<tabla>_position_check`: sólo lo activo tiene posición).
     */
    public const NULL_POSITION_WHEN_RETIRED = [
        'workshops', 'exercises', 'exercise_tests', 'workshop_objectives', 'workshop_steps',
        'workshop_related_exercises', 'worlds', 'world_exercises', 'atlas_concepts',
        'guide_resources', 'guide_modules', 'guide_steps', 'guide_step_resources',
    ];

    /** @param array<string, mixed> $row */
    public static function keyOf(string $table, array $row): string
    {
        return implode("\x1f", array_map(fn (string $column) => (string) $row[$column], self::KEYS[$table]));
    }
}
```

`api/app/Content/RowSet.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

/**
 * Las filas de contenido de todas las tablas de ContentTables, cada una por su clave primaria.
 * Sólo las columnas de datos: el ciclo de vida (status, retired_at, created_at, updated_at) lo
 * pone el escritor.
 */
final class RowSet
{
    /** @var array<string, array<string, array<string, int|string|null>>> */
    private array $tables;

    public function __construct()
    {
        $this->tables = array_fill_keys(array_keys(ContentTables::KEYS), []);
    }

    /** @param array<string, int|string|null> $row */
    public function add(string $table, array $row): void
    {
        $key = ContentTables::keyOf($table, $row);
        if (isset($this->tables[$table][$key])) {
            throw InvalidContent::at('curriculum.json', $table, 'la clave «'.str_replace("\x1f", ' / ', $key).'» se repite');
        }
        $this->tables[$table][$key] = $row;
    }

    /** @param array<string, list<array<string, int|string|null>>> $byTable */
    public function addAll(array $byTable): void
    {
        foreach ($byTable as $table => $rows) {
            foreach ($rows as $row) {
                $this->add($table, $row);
            }
        }
    }

    /** @return array<string, array<string, int|string|null>> por clave primaria */
    public function keyed(string $table): array
    {
        return $this->tables[$table];
    }

    /** @return list<array<string, int|string|null>> */
    public function rows(string $table): array
    {
        return array_values($this->tables[$table]);
    }

    /** @return array<string, list<array<string, int|string|null>>> */
    public function toArray(): array
    {
        return array_map('array_values', $this->tables);
    }
}
```

`api/app/Content/Codec/FieldType.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content\Codec;

/** De qué tipo es el valor publicado de una clave y cómo se guarda en su columna. */
enum FieldType
{
    /** Un texto, en una columna de texto. */
    case Text;

    /** Un entero, en una columna numérica. */
    case Number;

    /** Un booleano, en una columna TINYINT(1). */
    case Flag;

    /** Un valor JSON cualquiera, como texto con los bytes que se publican. */
    case Json;
}
```

`api/app/Content/Codec/Field.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content\Codec;

/** Una clave publicada de un registro y la columna donde se guarda. */
final readonly class Field
{
    /** @param bool $optional la clave puede faltar en el documento: la columna queda NULL */
    public function __construct(
        public string $column,
        public FieldType $type,
        public bool $optional = false,
    ) {}
}
```

`api/app/Content/Codec/FieldMap.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use LogicException;
use stdClass;

/**
 * La regla de cada clave publicada de un tipo de registro: a qué columna va y de qué tipo. La
 * usan las dos direcciones, el import (`toColumns`) y la entrega (`fromColumns`), así que cada
 * regla se escribe una sola vez (ADR 0006 D10). Las claves «derivadas» no van en una columna del
 * registro: salen de una tabla hija o de otra tabla, y las resuelve cada códec.
 */
final class FieldMap
{
    /**
     * @param  array<string, Field>  $fields  clave publicada → campo
     * @param  list<string>  $derived  claves publicadas que salen de otra tabla
     */
    public function __construct(private readonly array $fields, private readonly array $derived = []) {}

    /** Las claves de un registro, en el orden en que se publican. */
    public static function keysOf(stdClass $record): array
    {
        return array_map('strval', array_keys(get_object_vars($record)));
    }

    /**
     * Las columnas de un registro del documento. Rechaza una clave sin regla y una clave obligatoria
     * que falta; las derivadas se ignoran.
     *
     * @return array<string, int|string|null>
     */
    public function toColumns(stdClass $record, string $path): array
    {
        foreach (self::keysOf($record) as $key) {
            if (! isset($this->fields[$key]) && ! in_array($key, $this->derived, true)) {
                throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'clave desconocida');
            }
        }
        $columns = [];
        foreach ($this->fields as $key => $field) {
            if (! property_exists($record, $key)) {
                if (! $field->optional) {
                    throw InvalidContent::at('curriculum.json', $path, "falta la clave «{$key}»");
                }
                $columns[$field->column] = null;

                continue;
            }
            $columns[$field->column] = $this->toColumn($record->{$key}, $field, "{$path}.{$key}");
        }

        return $columns;
    }

    /**
     * El registro tal como se publica, con las claves en el orden de `$keyOrder`.
     *
     * @param  array<string, mixed>  $row
     * @param  list<string>  $keyOrder
     * @param  array<string, mixed>  $derived  el valor de cada clave derivada
     */
    public function fromColumns(array $row, array $keyOrder, array $derived = []): stdClass
    {
        $record = new stdClass;
        foreach ($keyOrder as $key) {
            if (isset($this->fields[$key])) {
                $record->{$key} = $this->fromColumn($row[$this->fields[$key]->column], $this->fields[$key]);
            } elseif (array_key_exists($key, $derived)) {
                $record->{$key} = $derived[$key];
            } else {
                throw new LogicException("La clave «{$key}» no tiene regla en su códec.");
            }
        }

        return $record;
    }

    private function toColumn(mixed $value, Field $field, string $path): int|string
    {
        $problem = match ($field->type) {
            FieldType::Text => is_string($value) && trim($value) !== '' ? null : 'se esperaba un texto no vacío',
            FieldType::Number => is_int($value) ? null : 'se esperaba un entero',
            FieldType::Flag => is_bool($value) ? null : 'se esperaba true o false',
            FieldType::Json => null,
        };
        if ($problem !== null) {
            throw InvalidContent::at('curriculum.json', $path, $problem);
        }

        return match ($field->type) {
            FieldType::Text, FieldType::Number => $value,
            FieldType::Flag => (int) $value,
            FieldType::Json => PublishedJson::encode($value),
        };
    }

    private function fromColumn(mixed $value, Field $field): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($field->type) {
            FieldType::Text => (string) $value,
            FieldType::Number => (int) $value,
            FieldType::Flag => (bool) $value,
            FieldType::Json => PublishedJson::decode((string) $value),
        };
    }
}
```

`api/app/Content/Codec/ExerciseCodec.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use stdClass;

/**
 * Un ejercicio del documento ↔ sus filas: `exercises`, `exercise_tests`, `exercise_hints` y el
 * tema (`topics`), que comparten todos los ejercicios con el mismo `topicId`.
 */
final class ExerciseCodec
{
    private FieldMap $exercise;

    private FieldMap $test;

    public function __construct()
    {
        $this->exercise = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'language' => new Field('language', FieldType::Text),
            'topicId' => new Field('topic_key', FieldType::Text),
            'stage' => new Field('stage', FieldType::Number),
            'level' => new Field('level', FieldType::Text, optional: true),
            'challengeType' => new Field('challenge_type', FieldType::Text, optional: true),
            'kind' => new Field('kind', FieldType::Text),
            'minutes' => new Field('minutes', FieldType::Number),
            'visual' => new Field('visual', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'intro' => new Field('intro', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'objective' => new Field('objective', FieldType::Text),
            'transfer' => new Field('transfer', FieldType::Text),
            'starter' => new Field('starter', FieldType::Text),
            'solution' => new Field('solution', FieldType::Text),
            'imports' => new Field('imports_json', FieldType::Json),
            'sources' => new Field('sources_json', FieldType::Json),
            'instructions' => new Field('instructions_json', FieldType::Json),
            'review' => new Field('review_json', FieldType::Json),
            'prediction' => new Field('prediction_json', FieldType::Json),
        ], derived: ['topic', 'workshopId', 'tests', 'hints']);

        $this->test = new FieldMap([
            'id' => new Field('test_key', FieldType::Text),
            'label' => new Field('label', FieldType::Text),
            'expression' => new Field('expression', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'failure' => new Field('failure', FieldType::Text),
        ]);
    }

    /**
     * @param  array{contentHash: string, gradingHash: string, starterHash: string}  $hashes  del meta: PHP no las recalcula
     * @param  ?string  $workshopId  el taller dueño de un núcleo, que sale de `code` en el taller
     * @return array<string, list<array<string, int|string|null>>> filas por tabla
     */
    public function toRows(stdClass $exercise, string $catalog, ?string $domain, int $position, array $hashes, ?string $workshopId, string $path): array
    {
        $topic = $exercise->topic ?? null;
        if (! is_string($topic) || trim($topic) === '') {
            throw InvalidContent::at('curriculum.json', "{$path}.topic", 'se esperaba un texto no vacío');
        }
        $columns = $this->exercise->toColumns($exercise, $path);
        $id = $columns['id'];

        $rows = ['exercises' => [$columns + [
            'catalog' => $catalog,
            'domain' => $domain,
            'position' => $position,
            'workshop_id' => $workshopId,
            'key_order' => PublishedJson::encode(FieldMap::keysOf($exercise)),
            'content_hash' => $hashes['contentHash'],
            'grading_hash' => $hashes['gradingHash'],
            'starter_hash' => $hashes['starterHash'],
        ]]];
        $rows['topics'] = [['language' => $columns['language'], 'topic_key' => $columns['topic_key'], 'label' => $topic]];

        $rows['exercise_tests'] = [];
        foreach ($this->list($exercise, 'tests', $path) as $index => $test) {
            if (! $test instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', "{$path}.tests[{$index}]", 'se esperaba un objeto');
            }
            $testColumns = $this->test->toColumns($test, "{$path}.tests[{$index}]");
            $rows['exercise_tests'][] = ['exercise_id' => $id] + $testColumns + [
                'position' => $index,
                'key_order' => PublishedJson::encode(FieldMap::keysOf($test)),
            ];
        }

        $rows['exercise_hints'] = [];
        foreach ($this->list($exercise, 'hints', $path) as $index => $hint) {
            if (! is_string($hint) || trim($hint) === '') {
                throw InvalidContent::at('curriculum.json', "{$path}.hints[{$index}]", 'se esperaba un texto no vacío');
            }
            $rows['exercise_hints'][] = ['exercise_id' => $id, 'position' => $index, 'text' => $hint];
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $exercise  fila de `exercises`
     * @param  list<array<string, mixed>>  $tests  filas de `exercise_tests` del ejercicio
     * @param  list<array<string, mixed>>  $hints  filas de `exercise_hints` del ejercicio
     */
    public function toRecord(array $exercise, array $tests, array $hints, string $topicLabel): stdClass
    {
        return $this->exercise->fromColumns($exercise, PublishedJson::decode($exercise['key_order']), [
            'topic' => $topicLabel,
            'workshopId' => $exercise['workshop_id'],
            'tests' => array_values(array_map(
                fn (array $test) => $this->test->fromColumns($test, PublishedJson::decode($test['key_order'])),
                $tests,
            )),
            'hints' => array_values(array_map(fn (array $hint) => $hint['text'], $hints)),
        ]);
    }

    /** @return list<mixed> */
    private function list(stdClass $record, string $key, string $path): array
    {
        $value = $record->{$key} ?? null;
        if (! is_array($value) || ! array_is_list($value) || $value === []) {
            throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista no vacía');
        }

        return $value;
    }
}
```

`api/app/Content/Codec/WorkshopCodec.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use stdClass;

/**
 * Un taller de Sistemas del documento ↔ sus filas: `workshops`, `workshop_objectives`,
 * `workshop_steps` y `workshop_related_exercises`. El mapa `code` no tiene tabla: lo da
 * `exercises.workshop_id`. Las etapas no publican su clave ni su índice v1 hasta D1 (ADR 0006
 * D14): llegan del meta, en el mismo orden.
 */
final class WorkshopCodec
{
    private FieldMap $workshop;

    private FieldMap $objective;

    private FieldMap $step;

    public function __construct()
    {
        $this->workshop = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'category' => new Field('category', FieldType::Text),
            'model' => new Field('model', FieldType::Text),
            'level' => new Field('level', FieldType::Text),
            'minutes' => new Field('minutes', FieldType::Number),
            'title' => new Field('title', FieldType::Text),
            'subtitle' => new Field('subtitle', FieldType::Text),
            'story' => new Field('story', FieldType::Text),
            'what' => new Field('what', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'limits' => new Field('limits', FieldType::Text),
            'uses' => new Field('uses_json', FieldType::Json),
            'prediction' => new Field('prediction_json', FieldType::Json),
            'sources' => new Field('sources_json', FieldType::Json),
            'bridge' => new Field('bridge_json', FieldType::Json),
        ], derived: ['objectives', 'steps', 'code', 'related']);

        $this->objective = new FieldMap([
            'id' => new Field('objective_key', FieldType::Text),
            'label' => new Field('label', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
        ]);

        $this->step = new FieldMap([
            'title' => new Field('title', FieldType::Text),
            'task' => new Field('task', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'done' => new Field('done', FieldType::Text),
        ]);
    }

    /**
     * @param  list<array{id: string, v1Index: ?int}>  $stepKeys  del meta, una por etapa publicada
     * @param  list<string>  $languages  en el orden de `languages.position`
     * @return array<string, list<array<string, int|string|null>>> filas por tabla
     */
    public function toRows(stdClass $workshop, string $domain, int $position, array $stepKeys, array $languages, string $path): array
    {
        $columns = $this->workshop->toColumns($workshop, $path);
        $id = $columns['id'];
        $rows = ['workshops' => [$columns + [
            'domain' => $domain,
            'position' => $position,
            'key_order' => PublishedJson::encode(FieldMap::keysOf($workshop)),
        ]]];

        $rows['workshop_objectives'] = [];
        foreach ($this->objects($workshop, 'objectives', $path) as $index => $objective) {
            $rows['workshop_objectives'][] = ['workshop_id' => $id]
                + $this->objective->toColumns($objective, "{$path}.objectives[{$index}]")
                + ['position' => $index, 'key_order' => PublishedJson::encode(FieldMap::keysOf($objective))];
        }

        $steps = $this->objects($workshop, 'steps', $path);
        if (count($steps) !== count($stepKeys)) {
            throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$id}", count($stepKeys).' claves para '.count($steps).' etapas: regenerá los dos archivos juntos');
        }
        $rows['workshop_steps'] = [];
        foreach ($steps as $index => $step) {
            $rows['workshop_steps'][] = ['workshop_id' => $id, 'step_key' => $stepKeys[$index]['id']]
                + $this->step->toColumns($step, "{$path}.steps[{$index}]")
                + [
                    'position' => $index,
                    'v1_position' => $stepKeys[$index]['v1Index'],
                    'key_order' => PublishedJson::encode(FieldMap::keysOf($step)),
                ];
        }

        $rows['workshop_related_exercises'] = [];
        $related = $workshop->related ?? null;
        foreach ($languages as $language) {
            $ids = $related instanceof stdClass ? ($related->{$language} ?? null) : null;
            if (! is_array($ids) || ! array_is_list($ids) || $ids === []) {
                throw InvalidContent::at('curriculum.json', "{$path}.related.{$language}", 'se esperaba una lista de ejercicios');
            }
            foreach ($ids as $index => $exerciseId) {
                $rows['workshop_related_exercises'][] = [
                    'workshop_id' => $id,
                    'exercise_id' => $exerciseId,
                    'position' => $index,
                ];
            }
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $workshop  fila de `workshops`
     * @param  list<array<string, mixed>>  $objectives  del taller
     * @param  list<array<string, mixed>>  $steps  del taller
     * @param  array<string, list<string>>  $related  IDs por lenguaje, en el orden de `position`
     * @param  array<string, string>  $code  ID del núcleo por lenguaje
     * @param  list<string>  $languages  en el orden de `languages.position`
     */
    public function toRecord(array $workshop, array $objectives, array $steps, array $related, array $code, array $languages): stdClass
    {
        $byLanguage = function (array $values) use ($languages): stdClass {
            $map = new stdClass;
            foreach ($languages as $language) {
                $map->{$language} = $values[$language] ?? null;
            }

            return $map;
        };

        return $this->workshop->fromColumns($workshop, PublishedJson::decode($workshop['key_order']), [
            'objectives' => array_values(array_map(
                fn (array $row) => $this->objective->fromColumns($row, PublishedJson::decode($row['key_order'])),
                $objectives,
            )),
            'steps' => array_values(array_map(
                fn (array $row) => $this->step->fromColumns($row, PublishedJson::decode($row['key_order'])),
                $steps,
            )),
            'code' => $byLanguage($code),
            'related' => $byLanguage($related),
        ]);
    }

    /** @return list<stdClass> */
    private function objects(stdClass $record, string $key, string $path): array
    {
        $value = $record->{$key} ?? null;
        if (! is_array($value) || ! array_is_list($value) || $value === []) {
            throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista no vacía');
        }
        foreach ($value as $index => $item) {
            if (! $item instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', "{$path}.{$key}[{$index}]", 'se esperaba un objeto');
            }
        }

        return $value;
    }
}
```

`api/app/Content/Codec/WorldCodec.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use stdClass;

/**
 * Un mundo de campaña del documento ↔ sus filas: `worlds` y `world_exercises`. Los tres
 * campos de IDs se reparten por rol: `trainingIds` son los `training`, `challengeIds` los
 * `challenge` y el jefe (que es el último desafío) y `bossId` el `boss`.
 */
final class WorldCodec
{
    private FieldMap $world;

    public function __construct()
    {
        $this->world = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'level' => new Field('level', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'subtitle' => new Field('subtitle', FieldType::Text),
            'story' => new Field('story', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'badge' => new Field('badge', FieldType::Text),
            'concepts' => new Field('concepts_json', FieldType::Json),
            'guide' => new Field('guide_json', FieldType::Json),
            'checkpoint' => new Field('checkpoint_json', FieldType::Json),
            'sources' => new Field('sources_json', FieldType::Json),
        ], derived: ['trainingIds', 'challengeIds', 'bossId']);
    }

    /** @return array<string, list<array<string, int|string|null>>> filas por tabla */
    public function toRows(stdClass $world, string $language, int $position, string $path): array
    {
        $columns = $this->world->toColumns($world, $path);
        $id = $columns['id'];
        $training = $this->ids($world, 'trainingIds', $path);
        $challenges = $this->ids($world, 'challengeIds', $path);
        $boss = $world->bossId ?? null;
        if ($boss !== end($challenges)) {
            throw InvalidContent::at('curriculum.json', "{$path}.bossId", 'el jefe tiene que ser el último de challengeIds');
        }

        $members = [];
        foreach ($training as $index => $exerciseId) {
            $members[] = ['world_id' => $id, 'exercise_id' => $exerciseId, 'role' => 'training', 'position' => $index];
        }
        foreach ($challenges as $index => $exerciseId) {
            $role = $exerciseId === $boss ? 'boss' : 'challenge';
            $members[] = ['world_id' => $id, 'exercise_id' => $exerciseId, 'role' => $role, 'position' => $index];
        }

        return [
            'worlds' => [$columns + [
                'language' => $language,
                'position' => $position,
                'key_order' => PublishedJson::encode(FieldMap::keysOf($world)),
            ]],
            'world_exercises' => $members,
        ];
    }

    /**
     * @param  array<string, mixed>  $world  fila de `worlds`
     * @param  list<array<string, mixed>>  $members  filas de `world_exercises` del mundo
     */
    public function toRecord(array $world, array $members): stdClass
    {
        $ofRole = function (array $roles) use ($members): array {
            $selected = array_filter($members, fn (array $row) => in_array($row['role'], $roles, true));
            usort($selected, fn (array $a, array $b) => $a['position'] <=> $b['position']);

            return array_values(array_map(fn (array $row) => $row['exercise_id'], $selected));
        };

        return $this->world->fromColumns($world, PublishedJson::decode($world['key_order']), [
            'trainingIds' => $ofRole(['training']),
            'challengeIds' => $ofRole(['challenge', 'boss']),
            'bossId' => $ofRole(['boss'])[0] ?? null,
        ]);
    }

    /** @return list<string> */
    private function ids(stdClass $world, string $key, string $path): array
    {
        $value = $world->{$key} ?? null;
        if (! is_array($value) || ! array_is_list($value) || $value === [] || array_filter($value, fn ($id) => ! is_string($id)) !== []) {
            throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista de IDs');
        }

        return $value;
    }
}
```

`api/app/Content/Codec/AtlasCodec.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content\Codec;

use App\Content\PublishedJson;
use stdClass;

/** Un concepto del Atlas del documento ↔ su fila de `atlas_concepts`. */
final class AtlasCodec
{
    private FieldMap $concept;

    public function __construct()
    {
        $this->concept = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'level' => new Field('level', FieldType::Text),
            'category' => new Field('category', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'summary' => new Field('summary', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'code' => new Field('code', FieldType::Text),
            'explanation' => new Field('explanation', FieldType::Text),
            'comparison' => new Field('comparison', FieldType::Text),
            'pitfall' => new Field('pitfall', FieldType::Text),
            'quiz' => new Field('quiz_json', FieldType::Json),
            'labId' => new Field('lab_exercise_id', FieldType::Text),
            'source' => new Field('source_json', FieldType::Json),
            'furtherSources' => new Field('further_sources_json', FieldType::Json, optional: true),
        ]);
    }

    /** @return array<string, list<array<string, int|string|null>>> filas por tabla */
    public function toRows(stdClass $concept, string $language, int $position, string $path): array
    {
        return ['atlas_concepts' => [$this->concept->toColumns($concept, $path) + [
            'language' => $language,
            'position' => $position,
            'key_order' => PublishedJson::encode(FieldMap::keysOf($concept)),
        ]]];
    }

    /** @param array<string, mixed> $row fila de `atlas_concepts` */
    public function toRecord(array $row): stdClass
    {
        return $this->concept->fromColumns($row, PublishedJson::decode($row['key_order']));
    }
}
```

`api/app/Content/Codec/GuideCodec.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use stdClass;

/**
 * La guía del documento ↔ sus seis tablas: `guide_resources`, `guide_sources`, `guide_tracks`,
 * `guide_modules`, `guide_steps` y `guide_step_resources`. La raíz de la guía no tiene fila: sus
 * claves son siempre estas, en este orden.
 */
final class GuideCodec
{
    /** @var list<string> */
    private const ROOT = ['resources', 'tracks', 'sources'];

    private FieldMap $resource;

    private FieldMap $source;

    private FieldMap $track;

    private FieldMap $module;

    private FieldMap $step;

    public function __construct()
    {
        $this->resource = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'url' => new Field('url', FieldType::Text),
            'languages' => new Field('languages_json', FieldType::Json),
            'category' => new Field('category', FieldType::Text),
            'cost' => new Field('cost', FieldType::Text),
            'format' => new Field('format', FieldType::Text),
            'description' => new Field('description', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'caveat' => new Field('caveat', FieldType::Text),
            'featured' => new Field('featured', FieldType::Flag),
        ]);
        $this->source = new FieldMap([
            'title' => new Field('title', FieldType::Text),
            'url' => new Field('url', FieldType::Text),
            'note' => new Field('note', FieldType::Text),
        ]);
        $this->track = new FieldMap([
            'title' => new Field('title', FieldType::Text),
            'description' => new Field('description', FieldType::Text),
        ], derived: ['modules']);
        $this->module = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'subtitle' => new Field('subtitle', FieldType::Text),
        ], derived: ['steps']);
        $this->step = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'minutes' => new Field('minutes', FieldType::Number),
            'objective' => new Field('objective', FieldType::Text),
            'task' => new Field('task', FieldType::Text),
            'doneWhen' => new Field('done_when', FieldType::Text),
            'quiz' => new Field('quiz_json', FieldType::Json),
        ], derived: ['resourceIds']);
    }

    /**
     * @param  list<string>  $languages  en el orden de `languages.position`
     * @return array<string, list<array<string, int|string|null>>> filas por tabla
     */
    public function toRows(stdClass $guide, array $languages, string $path): array
    {
        if (FieldMap::keysOf($guide) !== self::ROOT) {
            throw InvalidContent::at('curriculum.json', $path, 'las claves de la guía tienen que ser resources, tracks y sources, en ese orden');
        }
        $rows = array_fill_keys(
            ['guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'],
            [],
        );

        foreach ($this->objects($guide->resources, "{$path}.resources") as $index => $resource) {
            $rows['guide_resources'][] = $this->resource->toColumns($resource, "{$path}.resources[{$index}]")
                + ['position' => $index, 'key_order' => PublishedJson::encode(FieldMap::keysOf($resource))];
        }
        foreach ($this->objects($guide->sources, "{$path}.sources") as $index => $source) {
            $rows['guide_sources'][] = $this->source->toColumns($source, "{$path}.sources[{$index}]")
                + ['position' => $index, 'key_order' => PublishedJson::encode(FieldMap::keysOf($source))];
        }

        $tracks = $guide->tracks;
        if (! $tracks instanceof stdClass || FieldMap::keysOf($tracks) !== $languages) {
            throw InvalidContent::at('curriculum.json', "{$path}.tracks", 'un recorrido por lenguaje, en el orden de languages: '.implode(', ', $languages));
        }
        foreach ($languages as $language) {
            $trackPath = "{$path}.tracks.{$language}";
            $track = $tracks->{$language};
            if (! $track instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', $trackPath, 'se esperaba un objeto');
            }
            $rows['guide_tracks'][] = ['language' => $language] + $this->track->toColumns($track, $trackPath)
                + ['key_order' => PublishedJson::encode(FieldMap::keysOf($track))];
            foreach ($this->objects($track->modules ?? null, "{$trackPath}.modules") as $moduleIndex => $module) {
                $modulePath = "{$trackPath}.modules[{$moduleIndex}]";
                $moduleColumns = $this->module->toColumns($module, $modulePath);
                $rows['guide_modules'][] = $moduleColumns + [
                    'track_language' => $language,
                    'position' => $moduleIndex,
                    'key_order' => PublishedJson::encode(FieldMap::keysOf($module)),
                ];
                foreach ($this->objects($module->steps ?? null, "{$modulePath}.steps") as $stepIndex => $step) {
                    $stepPath = "{$modulePath}.steps[{$stepIndex}]";
                    $stepColumns = $this->step->toColumns($step, $stepPath);
                    $rows['guide_steps'][] = $stepColumns + [
                        'module_id' => $moduleColumns['id'],
                        'position' => $stepIndex,
                        'key_order' => PublishedJson::encode(FieldMap::keysOf($step)),
                    ];
                    $resourceIds = $step->resourceIds ?? null;
                    if (! is_array($resourceIds) || ! array_is_list($resourceIds) || $resourceIds === []) {
                        throw InvalidContent::at('curriculum.json', "{$stepPath}.resourceIds", 'se esperaba una lista de recursos');
                    }
                    foreach ($resourceIds as $index => $resourceId) {
                        $rows['guide_step_resources'][] = [
                            'step_id' => $stepColumns['id'],
                            'resource_id' => $resourceId,
                            'position' => $index,
                        ];
                    }
                }
            }
        }

        return $rows;
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows  filas activas de las seis tablas
     * @param  list<string>  $languages  en el orden de `languages.position`
     */
    public function toRecord(array $rows, array $languages): stdClass
    {
        $byPosition = function (array $list): array {
            usort($list, fn (array $a, array $b) => $a['position'] <=> $b['position']);

            return $list;
        };
        $record = fn (FieldMap $map, array $row, array $derived = []) => $map->fromColumns($row, PublishedJson::decode($row['key_order']), $derived);

        $tracks = new stdClass;
        foreach ($languages as $language) {
            $trackRow = $this->only($rows['guide_tracks'], 'language', $language);
            $modules = [];
            foreach ($byPosition($this->all($rows['guide_modules'], 'track_language', $language)) as $moduleRow) {
                $steps = [];
                foreach ($byPosition($this->all($rows['guide_steps'], 'module_id', $moduleRow['id'])) as $stepRow) {
                    $resourceIds = array_map(
                        fn (array $link) => $link['resource_id'],
                        $byPosition($this->all($rows['guide_step_resources'], 'step_id', $stepRow['id'])),
                    );
                    $steps[] = $record($this->step, $stepRow, ['resourceIds' => $resourceIds]);
                }
                $modules[] = $record($this->module, $moduleRow, ['steps' => $steps]);
            }
            $tracks->{$language} = $record($this->track, $trackRow, ['modules' => $modules]);
        }

        $guide = new stdClass;
        $guide->resources = array_map(fn (array $row) => $record($this->resource, $row), $byPosition($rows['guide_resources']));
        $guide->tracks = $tracks;
        $guide->sources = array_map(fn (array $row) => $record($this->source, $row), $byPosition($rows['guide_sources']));

        return $guide;
    }

    /** @return list<stdClass> */
    private function objects(mixed $value, string $path): array
    {
        if (! is_array($value) || ! array_is_list($value) || $value === []) {
            throw InvalidContent::at('curriculum.json', $path, 'se esperaba una lista no vacía');
        }
        foreach ($value as $index => $item) {
            if (! $item instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', "{$path}[{$index}]", 'se esperaba un objeto');
            }
        }

        return $value;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function all(array $rows, string $column, string $value): array
    {
        return array_values(array_filter($rows, fn (array $row) => $row[$column] === $value));
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function only(array $rows, string $column, string $value): array
    {
        return $this->all($rows, $column, $value)[0]
            ?? throw new InvalidContent("guide_tracks: no hay una fila activa con {$column} = {$value}");
    }
}
```

`api/app/Content/ContentRows.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use stdClass;

/**
 * El documento → las filas de todas las tablas de contenido, con las referencias entre registros
 * validadas (el generador valida la forma de cada archivo, no que un mundo o el Atlas nombren
 * ejercicios que existen). Cada error nombra el campo del documento.
 */
final class ContentRows
{
    private const FILE = 'curriculum.json';

    public function __construct(
        private ExerciseCodec $exercises,
        private WorkshopCodec $workshops,
        private WorldCodec $worlds,
        private AtlasCodec $atlas,
        private GuideCodec $guide,
    ) {}

    public function fromSource(ContentSource $source): RowSet
    {
        $rows = new RowSet;
        $this->languagesAndCatalogs($source, $rows);
        $index = $this->indexExercises($source);
        $owners = $this->workshopOwners($source, $index);
        $this->addExercises($source, $owners, $rows);
        $this->addWorkshops($source, $index, $rows);
        $this->addWorlds($source, $index, $rows);
        $this->addAtlas($source, $index, $rows);
        $this->addGuide($source, $rows);

        return $rows;
    }

    private function languagesAndCatalogs(ContentSource $source, RowSet $rows): void
    {
        foreach ($source->languages() as $position => $code) {
            $rows->add('languages', ['code' => $code, 'position' => $position + 1]);
        }
        $chain = [];
        foreach ($source->meta['catalogs'] as $catalog) {
            $rows->add('catalogs', [
                'code' => $catalog['code'],
                'slice_by' => $catalog['sliceBy'],
                'chain_position' => $catalog['chainPosition'],
            ]);
            if ($catalog['chainPosition'] !== null) {
                $chain[] = $catalog['chainPosition'];
            }
        }
        sort($chain);
        if ($chain !== [] && $chain !== range(1, count($chain))) {
            throw InvalidContent::at('curriculum.meta.json', 'catalogs', 'la cadena de catálogos tiene que ser única y contigua, desde 1');
        }
    }

    /**
     * Cada ejercicio por ID, con su catálogo, su lenguaje y su dominio.
     *
     * @return array<string, array{catalog: string, language: string, domain: ?string}>
     */
    private function indexExercises(ContentSource $source): array
    {
        $index = [];
        foreach ($this->portions($source) as [$catalog, $slice, $list, $path]) {
            foreach ($list as $position => $exercise) {
                $id = $this->text($exercise, 'id', "{$path}[{$position}]");
                if (isset($index[$id])) {
                    throw InvalidContent::at(self::FILE, "{$path}[{$position}].id", "«{$id}» se repite");
                }
                $domain = $catalog === 'cores' ? $slice : null;
                $language = $this->text($exercise, 'language', "{$path}[{$position}]");
                if (! in_array($language, $source->languages(), true) || ($domain === null && $language !== $slice)) {
                    throw InvalidContent::at(self::FILE, "{$path}[{$position}].language", "«{$language}» no corresponde a {$path}");
                }
                $index[$id] = ['catalog' => $catalog, 'language' => $language, 'domain' => $domain];
            }
        }
        foreach (array_keys($source->meta['exercises']) as $id) {
            if (! isset($index[$id])) {
                throw InvalidContent::at('curriculum.meta.json', "exercises.{$id}", 'no está en curriculum.json: regenerá los dos archivos juntos');
            }
        }

        return $index;
    }

    /**
     * El taller dueño de cada núcleo, que sale del mapa `code` de los talleres.
     *
     * @param  array<string, array{catalog: string, language: string, domain: ?string}>  $index
     * @return array<string, string>
     */
    private function workshopOwners(ContentSource $source, array $index): array
    {
        $owners = [];
        foreach (Portion::DOMAINS as $domain) {
            foreach ($this->list($source->decoded->workshops->{$domain} ?? null, "workshops.{$domain}") as $position => $workshop) {
                $path = "workshops.{$domain}[{$position}]";
                $code = $this->languageMap($workshop->code ?? null, $source, "{$path}.code");
                foreach ($source->languages() as $language) {
                    $core = $code->{$language};
                    $known = is_string($core) ? ($index[$core] ?? null) : null;
                    if ($known === null || $known['catalog'] !== 'cores' || $known['language'] !== $language || $known['domain'] !== $domain) {
                        throw InvalidContent::at(self::FILE, "{$path}.code.{$language}", 'se esperaba un núcleo de '.$domain.' en '.$language);
                    }
                    if (isset($owners[$core])) {
                        throw InvalidContent::at(self::FILE, "{$path}.code.{$language}", "«{$core}» ya es el núcleo del taller {$owners[$core]}");
                    }
                    $owners[$core] = $this->text($workshop, 'id', $path);
                }
            }
        }

        return $owners;
    }

    /** @param array<string, string> $owners */
    private function addExercises(ContentSource $source, array $owners, RowSet $rows): void
    {
        $topics = [];
        foreach ($this->portions($source) as [$catalog, $slice, $list, $path]) {
            foreach ($list as $position => $exercise) {
                $at = "{$path}[{$position}]";
                $id = $exercise->id;
                $hashes = $source->meta['exercises'][$id]
                    ?? throw InvalidContent::at('curriculum.meta.json', "exercises.{$id}", 'falta: regenerá los dos archivos juntos');
                if (property_exists($exercise, 'workshopId') && ($owners[$id] ?? null) !== $exercise->workshopId) {
                    throw InvalidContent::at(self::FILE, "{$at}.workshopId", 'no es el taller que lista a '.$id.' en code');
                }
                $domain = $catalog === 'cores' ? $slice : null;
                $fragment = $this->exercises->toRows($exercise, $catalog, $domain, $position, $hashes, $owners[$id] ?? null, $at);
                foreach ($fragment['topics'] as $topic) {
                    $key = "{$topic['language']}|{$topic['topic_key']}";
                    if (! isset($topics[$key])) {
                        $topics[$key] = $topic['label'];
                        $rows->add('topics', $topic);
                    } elseif ($topics[$key] !== $topic['label']) {
                        throw InvalidContent::at(self::FILE, "{$at}.topic", "el tema {$topic['topic_key']} de {$topic['language']} ya se llama «{$topics[$key]}» y acá dice «{$topic['label']}»");
                    }
                }
                unset($fragment['topics']);
                $rows->addAll($fragment);
            }
        }
    }

    /** @param array<string, array{catalog: string, language: string, domain: ?string}> $index */
    private function addWorkshops(ContentSource $source, array $index, RowSet $rows): void
    {
        foreach (Portion::DOMAINS as $domain) {
            foreach ($this->list($source->decoded->workshops->{$domain}, "workshops.{$domain}") as $position => $workshop) {
                $path = "workshops.{$domain}[{$position}]";
                $id = $workshop->id;
                $this->languageMap($workshop->bridge ?? null, $source, "{$path}.bridge");
                $related = $this->languageMap($workshop->related ?? null, $source, "{$path}.related");
                foreach ($source->languages() as $language) {
                    foreach (is_array($related->{$language}) ? $related->{$language} : [] as $at => $exerciseId) {
                        $known = is_string($exerciseId) ? ($index[$exerciseId] ?? null) : null;
                        if ($known === null || $known['language'] !== $language) {
                            throw InvalidContent::at(self::FILE, "{$path}.related.{$language}[{$at}]", 'se esperaba un ejercicio de '.$language);
                        }
                    }
                }
                $stepKeys = $source->meta['workshopSteps'][$id]
                    ?? throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$id}", 'falta: regenerá los dos archivos juntos');
                $rows->addAll($this->workshops->toRows($workshop, $domain, $position, $stepKeys, $source->languages(), $path));
            }
        }
        foreach (array_keys($source->meta['workshopSteps']) as $id) {
            if (! isset($rows->keyed('workshops')[$id])) {
                throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$id}", 'no está en curriculum.json: regenerá los dos archivos juntos');
            }
        }
    }

    /** @param array<string, array{catalog: string, language: string, domain: ?string}> $index */
    private function addWorlds(ContentSource $source, array $index, RowSet $rows): void
    {
        foreach ($source->languages() as $language) {
            foreach ($this->list($source->decoded->campaign->{$language}, "campaign.{$language}") as $position => $world) {
                $path = "campaign.{$language}[{$position}]";
                foreach ([['trainingIds', 'lab'], ['challengeIds', 'quests']] as [$key, $catalog]) {
                    foreach (is_array($world->{$key} ?? null) ? $world->{$key} : [] as $at => $exerciseId) {
                        $known = is_string($exerciseId) ? ($index[$exerciseId] ?? null) : null;
                        if ($known === null || $known['catalog'] !== $catalog || $known['language'] !== $language) {
                            throw InvalidContent::at(self::FILE, "{$path}.{$key}[{$at}]", "se esperaba un ejercicio de {$catalog} en {$language}");
                        }
                    }
                }
                $rows->addAll($this->worlds->toRows($world, $language, $position, $path));
            }
        }
    }

    /** @param array<string, array{catalog: string, language: string, domain: ?string}> $index */
    private function addAtlas(ContentSource $source, array $index, RowSet $rows): void
    {
        foreach ($source->languages() as $language) {
            foreach ($this->list($source->decoded->atlas->{$language}, "atlas.{$language}") as $position => $concept) {
                $path = "atlas.{$language}[{$position}]";
                $lab = $concept->labId ?? null;
                $known = is_string($lab) ? ($index[$lab] ?? null) : null;
                if ($known === null || $known['catalog'] !== 'lab' || $known['language'] !== $language) {
                    throw InvalidContent::at(self::FILE, "{$path}.labId", "se esperaba un ejercicio de lab en {$language}");
                }
                $rows->addAll($this->atlas->toRows($concept, $language, $position, $path));
            }
        }
    }

    private function addGuide(ContentSource $source, RowSet $rows): void
    {
        $guide = $this->guide->toRows($source->decoded->guide, $source->languages(), 'guide');
        $resources = array_column($guide['guide_resources'], 'id');
        foreach ($guide['guide_step_resources'] as $link) {
            if (! in_array($link['resource_id'], $resources, true)) {
                throw InvalidContent::at(self::FILE, "guide.steps.{$link['step_id']}.resourceIds", "«{$link['resource_id']}» no es un recurso de guide.resources");
            }
        }
        $rows->addAll($guide);
    }

    /**
     * Las 17 porciones de ejercicios, en el orden del documento: [catálogo, corte, lista, ruta].
     *
     * @return list<array{0: string, 1: string, 2: list<stdClass>, 3: string}>
     */
    private function portions(ContentSource $source): array
    {
        $portions = [];
        foreach (Portion::CATALOGS as $catalog) {
            $slices = $catalog === 'cores' ? Portion::DOMAINS : $source->languages();
            foreach ($slices as $slice) {
                $path = "{$catalog}.{$slice}";
                $portions[] = [$catalog, $slice, $this->list($source->decoded->{$catalog}->{$slice} ?? null, $path), $path];
            }
        }

        return $portions;
    }

    /** @return list<stdClass> */
    private function list(mixed $value, string $path): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            throw InvalidContent::at(self::FILE, $path, 'se esperaba una lista');
        }
        foreach ($value as $index => $item) {
            if (! $item instanceof stdClass) {
                throw InvalidContent::at(self::FILE, "{$path}[{$index}]", 'se esperaba un objeto');
            }
        }

        return $value;
    }

    private function text(stdClass $record, string $key, string $path): string
    {
        $value = $record->{$key} ?? null;
        if (! is_string($value) || trim($value) === '') {
            throw InvalidContent::at(self::FILE, "{$path}.{$key}", 'se esperaba un texto no vacío');
        }

        return $value;
    }

    /** Un mapa por lenguaje, con las claves en el orden de `languages`. */
    private function languageMap(mixed $value, ContentSource $source, string $path): stdClass
    {
        if (! $value instanceof stdClass || array_map('strval', array_keys(get_object_vars($value))) !== $source->languages()) {
            throw InvalidContent::at(self::FILE, $path, 'un valor por lenguaje, en el orden de languages: '.implode(', ', $source->languages()));
        }

        return $value;
    }
}
```

4. Corré `npm run api:test -- --testsuite=Unit`. **Esperado:** `ContentRowsTest` pasa entero y, de `ContentRoundTripTest`, pasan las pruebas de filas («arma las filas que dice el ADR 0006 §5.1», «no publica la clave ni el índice v1 de las etapas», «deja NULL lo que no está en el documento», «guarda el taller dueño de cada núcleo»); las dos de bytes siguen fallando hasta la tarea 3.5 (`Class "App\Content\PortionAssembler" not found`).

### Tarea 3.5 · El ensamblador de porciones, `PortionAssembler` (T015)

**Archivos:** crear `api/app/Content/PortionAssembler.php`. La prueba, `ContentRoundTripTest`, ya está de la tarea anterior.

**Qué hace:** `PortionAssembler::assemble(Portion, array $rows, array $languages): string` arma los bytes de una porción a partir de las filas de sus tablas, sin base de datos: ordena por posición o por clave primaria binaria, deriva de otras tablas lo que el documento publica (el tema de cada ejercicio, las pruebas y pistas, los objetivos, etapas y ejercicios relacionados de un taller, los `trainingIds`, `challengeIds` y `bossId` de un mundo, los módulos, pasos y `resourceIds` de la guía) y codifica con `PublishedJson`. La prueba de ida y vuelta es el oráculo independiente de FR-038 sin base: el sha256 de cada una de las 17 porciones es el `portions` del meta que calculó Node, y el de cada uno de los 274 ejercicios, su `contentHash`.

1. Corré `npm run api:test -- --filter=ContentRoundTripTest`. **Esperado:** fallan «arma cada una de las 17 porciones» y «arma cada ejercicio», con `Class "App\Content\PortionAssembler" not found`.
2. Implementá:

`api/app/Content/PortionAssembler.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;

/**
 * Las filas → los bytes de una porción: el único camino de las tablas a lo que publica la API
 * (ADR 0006 D10). Es puro: no lee la base, así que el mismo código arma una porción desde las
 * filas que acaba de calcular el import (en las pruebas) y desde las que lee la base. Ordena por
 * `position` y filtra por la porción: sobra cualquier fila que no sea suya.
 */
final class PortionAssembler
{
    public function __construct(
        private ExerciseCodec $exercises,
        private WorkshopCodec $workshops,
        private WorldCodec $worlds,
        private AtlasCodec $atlas,
        private GuideCodec $guide,
    ) {}

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows  filas activas por tabla
     * @param  list<string>  $languages  en el orden de `languages.position`
     */
    public function assemble(Portion $portion, array $rows, array $languages): string
    {
        return PublishedJson::encode(match ($portion->group()) {
            'lab', 'quests', 'cores' => $this->exerciseList($portion, $rows),
            'workshops' => $this->workshopList($portion, $rows, $languages),
            'campaign' => $this->worldList($portion, $rows),
            'atlas' => array_map(
                fn (array $row) => $this->atlas->toRecord($row),
                $this->inPortion($rows['atlas_concepts'], 'language', $portion->slice()),
            ),
            'guide' => $this->guide->toRecord($rows, $languages),
        });
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @return list<\stdClass>
     */
    private function exerciseList(Portion $portion, array $rows): array
    {
        $column = $portion->group() === 'cores' ? 'domain' : 'language';
        $own = array_filter(
            $rows['exercises'],
            fn (array $row) => $row['catalog'] === $portion->group() && $row[$column] === $portion->slice(),
        );
        $tests = $this->groupBy($rows['exercise_tests'], 'exercise_id');
        $hints = $this->groupBy($rows['exercise_hints'], 'exercise_id');
        $topics = [];
        foreach ($rows['topics'] as $topic) {
            $topics["{$topic['language']}|{$topic['topic_key']}"] = $topic['label'];
        }

        return array_map(
            fn (array $row) => $this->exercises->toRecord(
                $row,
                $tests[$row['id']] ?? [],
                $hints[$row['id']] ?? [],
                $topics["{$row['language']}|{$row['topic_key']}"] ?? '',
            ),
            $this->sorted($own),
        );
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @param  list<string>  $languages
     */
    private function workshopList(Portion $portion, array $rows, array $languages): array
    {
        $objectives = $this->groupBy($rows['workshop_objectives'], 'workshop_id');
        $steps = $this->groupBy($rows['workshop_steps'], 'workshop_id');
        $related = $this->groupBy($rows['workshop_related_exercises'], 'workshop_id');
        $languageOf = [];
        $codeOf = [];
        foreach ($rows['exercises'] as $exercise) {
            $languageOf[$exercise['id']] = $exercise['language'];
            if ($exercise['workshop_id'] !== null) {
                $codeOf[$exercise['workshop_id']][$exercise['language']] = $exercise['id'];
            }
        }

        return array_map(function (array $workshop) use ($objectives, $steps, $related, $languageOf, $codeOf, $languages) {
            $id = $workshop['id'];
            $relatedIds = [];
            foreach ($related[$id] ?? [] as $link) {
                $relatedIds[$languageOf[$link['exercise_id']] ?? ''][] = $link['exercise_id'];
            }

            return $this->workshops->toRecord($workshop, $objectives[$id] ?? [], $steps[$id] ?? [], $relatedIds, $codeOf[$id] ?? [], $languages);
        }, $this->inPortion($rows['workshops'], 'domain', $portion->slice()));
    }

    /** @param array<string, list<array<string, mixed>>> $rows */
    private function worldList(Portion $portion, array $rows): array
    {
        $members = $this->groupBy($rows['world_exercises'], 'world_id');

        return array_map(
            fn (array $world) => $this->worlds->toRecord($world, $members[$world['id']] ?? []),
            $this->inPortion($rows['worlds'], 'language', $portion->slice()),
        );
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function inPortion(array $rows, string $column, ?string $value): array
    {
        return $this->sorted(array_filter($rows, fn (array $row) => $row[$column] === $value));
    }

    /**
     * @param  array<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function sorted(array $rows): array
    {
        $rows = array_values($rows);
        usort($rows, fn (array $a, array $b) => $a['position'] <=> $b['position']);

        return $rows;
    }

    /**
     * Las filas por valor de una columna, cada grupo ordenado por `position`.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, list<array<string, mixed>>>
     */
    private function groupBy(array $rows, string $column): array
    {
        $groups = [];
        foreach ($rows as $row) {
            $groups[$row[$column]][] = $row;
        }

        return array_map(fn (array $group) => $this->sorted($group), $groups);
    }
}
```

3. Corré `npm run api:test -- --testsuite=Unit` y `npm run api:format:check`. **Esperado:** todo en verde.
4. Si un hash de porción no coincide, la prueba lo dice por porción: arreglá el códec o el ensamblador y no la prueba. Para ver el primer byte que difiere, compará `PublishedJson::decode` de las dos partes (`JsonDiff`, de W, hace esto en el import). Commits sugeridos, uno por unidad que pueda revertirse sola: `feat(api): PublishedJson, el único encoder de contenido, con los bytes de JSON.stringify`, `feat(api): Portion, las 17 porciones y las reglas del 422`, `feat(api): ContentSource lee y verifica el documento y su meta, y el fixture queda atado al generador`, `feat(api): códecs y filas de cada tipo de registro, con sus referencias validadas` y `feat(api): PortionAssembler arma las 17 porciones y los 274 ejercicios con las huellas del generador`.

## 4. Agente C · Despliegue (onda 1)

**Cubre:** US6 (FR-033, FR-035 y la parte de FR-042 que dice que el servicio reintenta sólo ante un bloqueo), FR-046 y FR-047. **Parte de:** la base (S0). **Rama:** `c2/deploy`. **Proyecto de Compose propio:** `export COMPOSE_PROJECT_NAME=taller-c2-c`.

**Archivos que posee:** `api/docker/migrate.sh`, `api/tests/Unit/MigrateScriptTest.php`, `api/scripts/deploy-check.sh` y `qa/api-content-check.ts`. No toca `compose.yaml`, `api/Dockerfile` ni `package.json`: el coordinador los conecta en T024 y T025.

**Consume:** nada de A, B, W ni E. El script invoca por su nombre `php artisan migrate --force` y `php artisan content:import` (que escribe W), y las pruebas lo ejercen con un `php` de mentira.

**Entrega:**

- `api/docker/migrate.sh`: el paso `migrate` del despliegue. Aplica las migraciones y corre `content:import`; si falla por una espera de bloqueo vencida (1205) o un interbloqueo (1213) lo repite con pausas crecientes (3 intentos, pausas de 5 y 15 s: `MIGRATE_PAUSES="5 15"`), y cualquier otro error termina el paso sin reintentar. Es la única capa de reintentos: la transacción del import usa `attempts: 1` para que no se multipliquen (FR-035). Compose lo llama `migrate-and-import`.
- `api/scripts/deploy-check.sh`: la prueba de despliegue de FR-046.
- `qa/api-content-check.ts`: el check de FR-047 contra el stack levantado; el coordinador agrega `npm run api:content:check`.

**Compuerta del agente:** `npm run api:test -- --filter=MigrateScriptTest`, `sh -n api/docker/migrate.sh`, `sh -n api/scripts/deploy-check.sh`, `npm run typecheck`, `npx eslint qa/api-content-check.ts` y `npx prettier --check qa/api-content-check.ts`, todo en verde. Los scripts que necesitan Docker (`deploy-check.sh` y `api-content-check.ts` contra el stack real) no se pueden ejecutar en la tarea: los corre el coordinador en T028.

### Tarea 4.1 · El paso `migrate`, con su prueba (T016)

**Archivos:** crear `api/tests/Unit/MigrateScriptTest.php` y `api/docker/migrate.sh`.

**Qué prueba:** con un `php` de mentira que responde lo que dice un guion (una línea `código|texto` por llamada): sale con 0 y llama dos veces (migrar e importar) cuando todo anda, reintenta una espera de bloqueo vencida y sale bien si el segundo intento anda, reintenta un interbloqueo del import, se rinde después de 3 intentos y no reintenta ningún otro error (un contenido inválido corta el paso). La prueba pone `MIGRATE_PAUSES=0 0` para no esperar.

1. Copiá la prueba:

`api/tests/Unit/MigrateScriptTest.php` (referencia sin ejecutar)

```php
<?php

use Symfony\Component\Process\Process;

// docker/migrate.sh es el paso `migrate` del despliegue: reintenta sólo ante una espera de
// bloqueo (1205) o un interbloqueo (1213), 3 intentos como mucho. Se prueba con un `php` de
// mentira, que responde lo que dice un guion (una línea «código|texto» por llamada).
function runMigrateScript(array $script): array
{
    $directory = sys_get_temp_dir().'/migrate-script-'.bin2hex(random_bytes(6));
    mkdir($directory, 0700, true);
    file_put_contents("{$directory}/script", implode("\n", $script)."\n");
    file_put_contents("{$directory}/php", <<<'SH'
        #!/bin/sh
        n=$(cat "$FAKE_DIR/calls" 2>/dev/null || echo 0)
        n=$((n + 1))
        echo "$n" > "$FAKE_DIR/calls"
        line=$(sed -n "${n}p" "$FAKE_DIR/script")
        text=${line#*|}
        [ -n "$text" ] && echo "$text"
        exit "${line%%|*}"
        SH);
    chmod("{$directory}/php", 0700);

    $process = new Process(['sh', dirname(__DIR__, 2).'/docker/migrate.sh'], env: [
        'PATH' => "{$directory}:".getenv('PATH'),
        'FAKE_DIR' => $directory,
        'MIGRATE_PAUSES' => '0 0',
    ]);
    $process->run();
    $calls = (int) trim((string) @file_get_contents("{$directory}/calls"));
    array_map('unlink', glob("{$directory}/*"));
    rmdir($directory);

    return [$process->getExitCode(), $process->getOutput().$process->getErrorOutput(), $calls];
}

const MIGRATE_LOCK_TIMEOUT = '1|SQLSTATE[HY000]: General error: 1205 Lock wait timeout exceeded; try restarting transaction';
const MIGRATE_DEADLOCK = '1|SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying to get lock; try restarting transaction';

it('sale con 0 si las migraciones y el import andan, sin reintentar', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(2)->and($output)->toContain('migrated')->toContain('imported');
});

it('reintenta una espera de bloqueo vencida y sale bien si el segundo intento anda', function () {
    [$exit, $output, $calls] = runMigrateScript([MIGRATE_LOCK_TIMEOUT, '0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(3)->and($output)->toContain('reintento en 0 s');
});

it('reintenta un interbloqueo del import', function () {
    [$exit, , $calls] = runMigrateScript(['0|migrated', MIGRATE_DEADLOCK, '0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(4);
});

it('se rinde después de 3 intentos', function () {
    [$exit, $output, $calls] = runMigrateScript([MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT]);

    expect($exit)->toBe(1)->and($calls)->toBe(3)->and($output)->toContain('sigue fallando por bloqueos después de 3 intentos');
});

it('no reintenta otros errores: un contenido inválido corta el paso', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|migrated', '1|curriculum.json: lab.rust[0].extra: clave desconocida', '0|nunca']);

    expect($exit)->toBe(1)->and($calls)->toBe(2)->and($output)->toContain('clave desconocida');
});
```

2. Corré `npm run api:test -- --filter=MigrateScriptTest`. **Esperado:** fallan todas, porque `docker/migrate.sh` no existe (`sh: can't open …/docker/migrate.sh`).
3. Creá el script:

`api/docker/migrate.sh` (referencia sin ejecutar)

```sh
#!/bin/sh
# Paso `migrate` del despliegue (ADR 0006 D35, enmendado en C2): aplica las migraciones y corre
# content:import. Si falla por una espera de bloqueo vencida (1205) o un interbloqueo (1213), lo
# repite con pausas crecientes; cualquier otro error termina el paso sin reintentar. Es la única
# capa de reintentos: el import usa `attempts: 1` para que no se multipliquen. Cada intento espera
# como mucho 5 s por un bloqueo (MYSQL_ATTR_INIT_COMMAND de compose.yaml).
#
# MIGRATE_PAUSES son las pausas, en segundos, entre intentos: «5 15» son 3 intentos. Las pruebas
# la ponen en «0 0».
set -u

pauses=${MIGRATE_PAUSES:-"5 15"}
log=$(mktemp)
trap 'rm -f "$log"' EXIT
attempt=1

while :; do
  status=0
  { php artisan migrate --force && php artisan content:import; } >"$log" 2>&1 || status=$?
  cat "$log"
  [ "$status" -eq 0 ] && exit 0

  if ! grep -Eq 'General error: 1205|Serialization failure: 1213' "$log"; then
    exit "$status"
  fi

  pause=""
  position=0
  for candidate in $pauses; do
    position=$((position + 1))
    [ "$position" -eq "$attempt" ] && pause=$candidate
  done
  if [ -z "$pause" ]; then
    echo "migrate: sigue fallando por bloqueos después de ${attempt} intentos."
    exit "$status"
  fi
  echo "migrate: espera de bloqueo o interbloqueo (intento ${attempt}); reintento en ${pause} s."
  sleep "$pause"
  attempt=$((attempt + 1))
done
```

4. Corré de nuevo y `sh -n api/docker/migrate.sh`. **Esperado:** pasan las cinco pruebas. Commit sugerido: `feat(api): migrate reintenta sólo ante bloqueos, con un único backoff`.

### Tarea 4.2 · La prueba de despliegue, `deploy-check.sh` (T017)

**Archivos:** crear `api/scripts/deploy-check.sh`.

**Qué comprueba (FR-046):** con un despliegue sano, otro cliente retiene `LOCK TABLES exercises WRITE` y se despliega una imagen nueva (otro `CONTENT_SOURCE_COMMIT`, así que `php` tendría que recrearse): `migrate` agota sus 3 intentos y falla, el `up` falla, `php` sigue siendo el mismo contenedor (mismo `StartedAt`) y sigue sirviendo la guía con el mismo `ETag` y `Content-Version`. Después corta la sesión que retenía el bloqueo, repite el despliegue y comprueba que ahora `php` sí se recrea y que, con otra imagen y el mismo contenido, el `ETag` y el `Content-Version` no cambian (SC-011 y FR-023).

Este archivo es en sí la prueba, así que no tiene otra anterior: se verifica corriéndolo contra el stack, y la sesión que lo escribió no usó Docker. Escribilo, revisalo con `sh -n` y dejalo para que el coordinador lo corra en T028. Los filtros de `awk` y de `sed` que usa se probaron con entradas de ejemplo.

1. Creá el script:

`api/scripts/deploy-check.sh` (referencia sin ejecutar)

```sh
#!/bin/sh
# Prueba de despliegue de C2 (spec 001, FR-046), contra el stack real. Con una imagen nueva cuyo
# `migrate` falla porque otro cliente retiene un bloqueo, `php` no se recrea y el anterior sigue
# sirviendo; y, ya sin el bloqueo, esa imagen nueva con el mismo contenido deja el mismo ETag y el
# mismo `Content-Version`. Construye imágenes, deja el stack levantado y tarda unos minutos:
# `migrate` reintenta 3 veces, con pausas de 5 y 15 s, antes de rendirse. No forma parte de
# `npm test`, como api:smoke. Necesita el .env de la raíz (sh api/scripts/init-env.sh) y el puerto
# del taller libre. Uso, desde la raíz: sh api/scripts/deploy-check.sh
set -u

old_commit=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
new_commit=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
fail=0
holder_id=""
log=$(mktemp)

check() {
  if [ "$1" = "$2" ]; then
    echo "ok    $3"
  else
    echo "FALLO $3: esperaba «$2» y llegó «$1»"
    fail=1
  fi
}

abort() {
  echo "ABORTO: $1"
  exit 1
}

# MySQL como root, dentro del contenedor: la contraseña ya está en su entorno (compose.yaml).
sql() {
  docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" taller -N -B -e "$1" 2>/dev/null' sh "$1"
}

# Corta la sesión que retiene el bloqueo, si sigue viva, y borra el registro temporal.
cleanup() {
  if [ -n "$holder_id" ]; then
    sql "kill $holder_id" >/dev/null 2>&1
  fi
  rm -f "$log"
}
trap cleanup EXIT

# ETag y Content-Version de /api/guide, sin \r, en dos líneas: «etag …» y «version …».
guide() {
  curl -s -D - -o /dev/null "http://$addr/api/guide" | tr -d '\r' \
    | sed -n -e 's/^[Ee][Tt]ag: /etag /p' -e 's/^[Cc]ontent-[Vv]ersion: /version /p'
}

echo "== 1. Despliegue sano con el commit $old_commit"
CONTENT_SOURCE_COMMIT=$old_commit docker compose up --build -d --wait || abort "el despliegue inicial falló"
addr=$(docker compose port taller 8080 2>/dev/null) || abort "el servicio taller no está levantado"
php_before=$(docker compose ps -q php)
[ -n "$php_before" ] || abort "no hay contenedor php"
started_before=$(docker inspect -f '{{.State.StartedAt}}' "$php_before")
guide_before=$(guide)
check "$(printf '%s\n' "$guide_before" | wc -l | tr -d ' ')" 2 "la guía responde con ETag y Content-Version"

echo "== 2. Otro cliente retiene un bloqueo sobre exercises: el import de migrate no puede leerla"
# La sesión de MySQL vive mientras dure el SLEEP, o hasta que cleanup la corte.
sql 'LOCK TABLES exercises WRITE; SELECT SLEEP(180)' >/dev/null 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  holder_id=$(sql 'show processlist' | awk -F '\t' '$8 ~ /^SELECT SLEEP\(180\)/ { print $1 }')
  [ -n "$holder_id" ] && break
  sleep 1
done
[ -n "$holder_id" ] || abort "no se encontró la sesión que retiene el bloqueo"

echo "== 3. Despliegue con una imagen nueva (commit $new_commit): migrate falla y php no se recrea"
if CONTENT_SOURCE_COMMIT=$new_commit docker compose up --build -d --wait >"$log" 2>&1; then
  echo "FALLO el despliegue con migrate bloqueado terminó bien: no se dio el escenario"
  fail=1
else
  echo "ok    el despliegue con migrate bloqueado falló, como debía"
fi
check "$(docker compose logs --no-color migrate 2>&1 | grep -c 'sigue fallando por bloqueos después de 3 intentos')" 1 \
  "migrate reintentó 3 veces y se rindió"
check "$(docker compose ps -q php)" "$php_before" "php no se recreó: sigue el mismo contenedor"
check "$(docker inspect -f '{{.State.StartedAt}}' "$php_before")" "$started_before" "php no se reinició"
check "$(guide)" "$guide_before" "el php anterior sigue sirviendo la guía, con el mismo ETag y Content-Version"

echo "== 4. Se libera el bloqueo: el mismo despliegue sale bien y deja el mismo contenido"
sql "kill $holder_id" >/dev/null 2>&1
holder_id=""
CONTENT_SOURCE_COMMIT=$new_commit docker compose up --build -d --wait || abort "el despliegue sin el bloqueo falló"
php_after=$(docker compose ps -q php)
if [ "$php_after" != "$php_before" ]; then recreated=si; else recreated=no; fi
check "$recreated" si "con migrate sano, php se recrea con la imagen nueva"
check "$(guide)" "$guide_before" "con otra imagen y el mismo contenido, el ETag y el Content-Version no cambian"
exit "$fail"
```

2. `sh -n api/scripts/deploy-check.sh`. **Esperado:** sin salida. Si la corrida real de T028 muestra que Compose recrea `php` antes de que termine `migrate`, el escenario de FR-046 falló de verdad: avisá al coordinador, que decide si cambia `depends_on` o la estrategia de despliegue. Commit sugerido: `test(api): prueba de despliegue, php no se recrea si migrate falla`.

### Tarea 4.3 · El check de punta a punta, `qa/api-content-check.ts` (T018)

**Archivos:** crear `qa/api-content-check.ts`. No se registra en `qa/run-checks.ts`: como `api:smoke`, necesita el stack levantado y no forma parte de `npm test`.

**Qué comprueba (FR-047), a través de Nginx:** las 17 porciones sin compresión (200, `ETag` fuerte `"<32 hex>"` igual a los primeros 32 hexadecimales del sha256 del cuerpo, `Content-Version` igual en las 17, `Cache-Control: private, no-cache`, sin `Vary: Cookie`); con gzip (`Content-Encoding: gzip`, `ETag` débil con el mismo hexadecimal y el cuerpo descomprimido con el mismo hash); la revalidación con el `ETag` tal como llegó, fuerte y débil, con y sin gzip (304 sin cuerpo y con `ETag` y `Content-Version`); 40 clientes lentos a la vez sobre las dos porciones de `lab`, que reciben su cuerpo completo sin `No space left on device` en el log de Nginx; y un ejercicio suelto. El oráculo es el meta que genera el mismo árbol. Con `TALLER_URL=http://host:puerto` apunta a otro despliegue y omite el log de Nginx.

1. Creá el check (`node:http` no manda `Accept-Encoding` salvo que se lo pidan: sin gzip llega el cuerpo y el `ETag` tal cual, con gzip Nginx debilita el `ETag`, como lo ve un navegador):

`qa/api-content-check.ts` (verificado)

```ts
// Criterio de aceptación de C2 contra el stack vivo (ADR 0006 R7 y D11): las 17 porciones que sirve
// la API, a través de Nginx y de su compresión, son las que fijó el generador. Requiere el stack
// levantado con `docker compose up --build -d --wait`, construido desde este mismo árbol; no forma
// parte de `npm test`. Uso: npm run api:content:check. Con TALLER_URL=http://host:puerto apunta a
// otro despliegue (sin el log de Nginx, que sólo se lee del Compose de este directorio).
//
// node:http no manda Accept-Encoding salvo que se lo pidan: sin gzip, el cuerpo y el ETag llegan
// tal cual; con gzip, Nginx comprime y debilita el ETag (W/"…"), como lo ve un navegador.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { get, type IncomingHttpHeaders } from 'node:http';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

interface Meta {
  documentHash: string;
  portions: Record<string, string>;
  exercises: Record<string, { contentHash: string }>;
}

// Los clientes lentos simultáneos sobre las dos porciones de lab (unas 300 KB cada una): Nginx
// desborda a /tmp/fastcgi_temp, un tmpfs de 32 MB que cuenta contra el mem_limit de `taller`.
const SLOW_CLIENTS = 40;

const root = join(import.meta.dirname, '..');
const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex');

function request(url: string, headers: Record<string, string> = {}, pauseMs = 0): Promise<Reply> {
  return new Promise((resolve, reject) => {
    get(url, { headers, agent: false }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        if (pauseMs > 0) {
          response.pause();
          setTimeout(() => response.resume(), pauseMs);
        }
      });
      response.on('end', () =>
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks),
        }),
      );
    }).on('error', reject);
  });
}

// Un recurso por porción, con los parámetros que la cortan.
function urlOf(base: string, portion: string): string {
  const [group, slice] = portion.split('.');
  const query = (resource: string, parameters: string) => `${base}/api/${resource}?${parameters}`;
  if (group === 'lab' || group === 'quests') {
    return query('exercises', `catalog=${group}&language=${slice}`);
  }
  if (group === 'cores') return query('exercises', `catalog=cores&domain=${slice}`);
  if (group === 'campaign') return query('worlds', `language=${slice}`);
  if (group === 'workshops') return query('workshops', `domain=${slice}`);
  if (group === 'atlas') return query('atlas', `language=${slice}`);
  return `${base}/api/guide`;
}

function address(): string {
  if (process.env.TALLER_URL) return process.env.TALLER_URL.replace(/\/$/, '');
  // La dirección sale de Compose, como en api/scripts/smoke.sh: respeta TALLER_PORT y el proyecto.
  const published = execFileSync('docker', ['compose', 'port', 'taller', '8080'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  return `http://${published}`;
}

// El meta que genera este árbol: el oráculo de lo que tiene que servir la API.
execFileSync(process.execPath, [join(root, 'tools', 'content', 'build-curriculum.ts')], {
  stdio: 'inherit',
});
const meta = JSON.parse(readFileSync(join(root, 'build', 'curriculum.meta.json'), 'utf8')) as Meta;
const base = address();
const portions = Object.entries(meta.portions);
const version = meta.documentHash.slice(0, 32);

// 1. Sin compresión: 200, ETag fuerte con los primeros 32 hex del sha256 del cuerpo, versión
//    igual en las 17 y las cabeceras de caché.
const strong = new Map<string, string>();
for (const [portion, hash] of portions) {
  const url = urlOf(base, portion);
  const reply = await request(url);
  assert.equal(reply.status, 200, `${url} respondió ${reply.status}`);
  assert.equal(sha256(reply.body), hash, `${portion}: el cuerpo no es el que fijó el generador`);
  const etag = String(reply.headers.etag);
  assert.match(etag, /^"[0-9a-f]{32}"$/, `${portion}: ETag`);
  assert.equal(etag, `"${hash.slice(0, 32)}"`, `${portion}: el ETag no es el hash del cuerpo`);
  assert.equal(reply.headers['content-version'], version, `${portion}: Content-Version`);
  const cacheControl = String(reply.headers['cache-control']);
  assert.ok(cacheControl.includes('private') && cacheControl.includes('no-cache'), cacheControl);
  assert.equal(reply.headers.vary?.includes('Cookie') ?? false, false, `${portion}: Vary: Cookie`);
  strong.set(portion, etag);
}

// 2. Con gzip: Nginx comprime y debilita el ETag; el cuerpo descomprimido es el mismo.
for (const [portion, hash] of portions) {
  const reply = await request(urlOf(base, portion), { 'Accept-Encoding': 'gzip' });
  assert.equal(reply.headers['content-encoding'], 'gzip', `${portion}: Nginx no comprimió`);
  assert.equal(reply.headers.etag, `W/${strong.get(portion)}`, `${portion}: ETag con gzip`);
  assert.equal(sha256(gunzipSync(reply.body)), hash, `${portion}: el cuerpo descomprimido`);
}

// 3. Revalidar con el ETag tal como llegó, fuerte y débil, con y sin gzip: 304 sin cuerpo.
for (const [portion] of portions) {
  const etag = strong.get(portion) as string;
  for (const [validator, encoding] of [
    [etag, undefined],
    [`W/${etag}`, undefined],
    [etag, 'gzip'],
    [`W/${etag}`, 'gzip'],
  ] as const) {
    const headers: Record<string, string> = { 'If-None-Match': validator };
    if (encoding) headers['Accept-Encoding'] = encoding;
    const reply = await request(urlOf(base, portion), headers);
    assert.equal(reply.status, 304, `${portion} con ${validator}: ${reply.status}`);
    assert.equal(reply.body.length, 0, `${portion}: el 304 trae cuerpo`);
    assert.equal(reply.headers.etag, etag, `${portion}: el 304 sin ETag fuerte`);
    assert.equal(
      reply.headers['content-version'],
      version,
      `${portion}: el 304 sin Content-Version`,
    );
  }
}

// 4 y 5. Clientes lentos: reciben el cuerpo completo, aunque Nginx tenga que pasarlo por disco.
const since = new Date().toISOString();
const labs = ['lab.rust', 'lab.go'];
const slow = await Promise.all(
  Array.from({ length: SLOW_CLIENTS }, (_, index) => {
    const portion = labs[index % labs.length];
    return request(urlOf(base, portion), {}, 15).then((reply) => ({ portion, reply }));
  }),
);
for (const { portion, reply } of slow) {
  assert.equal(reply.status, 200, `${portion} lento: ${reply.status}`);
  assert.equal(sha256(reply.body), meta.portions[portion], `${portion} lento: cuerpo incompleto`);
}
if (process.env.TALLER_URL) {
  console.log(
    'api-content-check: con TALLER_URL no se lee el log de Nginx; ese chequeo se omitió.',
  );
} else {
  const log = execFileSync(
    'docker',
    ['compose', 'logs', '--no-log-prefix', '--since', since, 'taller'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  assert.equal(
    log.includes('No space left on device'),
    false,
    'Nginx se quedó sin espacio en su tmpfs',
  );
}

// 6. Un ejercicio suelto, a mano: su ETag son los primeros 32 hex de su contentHash.
const [exerciseId, { contentHash }] = Object.entries(meta.exercises)[0];
const exercise = await request(`${base}/api/exercises/${exerciseId}`);
assert.equal(exercise.status, 200);
assert.equal(sha256(exercise.body), contentHash);
assert.equal(exercise.headers.etag, `"${contentHash.slice(0, 32)}"`);

console.log(
  `api-content-check: ${portions.length} porciones idénticas a las del generador (con y sin gzip, con 304 fuerte y débil) y ${SLOW_CLIENTS} clientes lentos con su cuerpo completo. PASS.`,
);
```

2. Verificalo sin Docker contra un servidor de mentira que respeta el contrato (`ETag` fuerte, gzip con `W/` como Nginx, 304). Se corre desde la raíz del repositorio con `build/` generado (`npm run curriculum`) y no se versiona:

`mock-server.cjs` (verificado)

```js
// Servidor de mentira con el contrato de C2 (ETag fuerte; gzip y W/ como Nginx; 304) para probar qa/api-content-check.ts sin Docker. Se corre desde la raíz del repositorio, con build/ generado, y no se versiona: node mock-server.cjs imprime el puerto.
const http = require('http'), crypto = require('crypto'), zlib = require('zlib'), fs = require('fs');
const doc = JSON.parse(fs.readFileSync('build/curriculum.json', 'utf8'));
const meta = JSON.parse(fs.readFileSync('build/curriculum.meta.json', 'utf8'));
const L = ['rust', 'go'], D = ['lowlevel', 'infra', 'play', 'pc'];
const parts = {};
for (const c of ['lab', 'quests']) for (const l of L) parts[`${c}.${l}`] = doc[c][l];
for (const d of D) parts[`cores.${d}`] = doc.cores[d];
for (const l of L) parts[`campaign.${l}`] = doc.campaign[l];
for (const d of D) parts[`workshops.${d}`] = doc.workshops[d];
for (const l of L) parts[`atlas.${l}`] = doc.atlas[l];
parts.guide = doc.guide;
const bodies = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, JSON.stringify(v) + (process.env.BREAK && k === 'guide' ? ' ' : '')]));
const exercises = {};
for (const list of [...Object.values(doc.lab), ...Object.values(doc.quests), ...Object.values(doc.cores)]) for (const e of list) exercises[e.id] = JSON.stringify(e);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function portionOf(url) {
  const u = new URL(url, 'http://x'); const q = u.searchParams; const p = u.pathname;
  if (p === '/api/guide') return 'guide';
  if (p === '/api/exercises') return q.get('catalog') === 'cores' ? `cores.${q.get('domain')}` : `${q.get('catalog')}.${q.get('language')}`;
  if (p === '/api/worlds') return `campaign.${q.get('language')}`;
  if (p === '/api/workshops') return `workshops.${q.get('domain')}`;
  if (p === '/api/atlas') return `atlas.${q.get('language')}`;
  return null;
}
http.createServer((req, res) => {
  let body, etag;
  const m = /^\/api\/exercises\/([^?]+)/.exec(req.url);
  if (m) { body = exercises[m[1]]; if (!body) { res.writeHead(404); return res.end(); } etag = `"${sha(body).slice(0, 32)}"`; }
  else { const p = portionOf(req.url); body = bodies[p]; if (!body) { res.writeHead(404); return res.end(); } etag = `"${sha(body).slice(0, 32)}"`; }
  const common = { ETag: etag, 'Content-Version': meta.documentHash.slice(0, 32), 'Cache-Control': 'no-cache, private' };
  const inm = (req.headers['if-none-match'] || '').split(',').map((s) => s.trim().replace(/^W\//, ''));
  if (inm.includes(etag)) { res.writeHead(304, common); return res.end(); }
  if ((req.headers['accept-encoding'] || '').includes('gzip')) { const z = zlib.gzipSync(body); res.writeHead(200, { ...common, ETag: 'W/' + etag, 'Content-Encoding': 'gzip', 'Content-Type': 'application/json' }); return res.end(z); }
  res.writeHead(200, { ...common, 'Content-Type': 'application/json' }); res.end(body);
}).listen(0, '127.0.0.1', function () { console.log(this.address().port); });
```

   En una terminal: `node mock-server.cjs` imprime un puerto. En otra: `TALLER_URL=http://127.0.0.1:<puerto> node qa/api-content-check.ts`. **Esperado:** `api-content-check: 17 porciones idénticas a las del generador (con y sin gzip, con 304 fuerte y débil) y 40 clientes lentos con su cuerpo completo. PASS.` Después, con `BREAK=1 node mock-server.cjs`, que agrega un espacio al cuerpo de la guía, el check tiene que fallar con `AssertionError … guide: el cuerpo no es el que fijó el generador` (verificado así en un clon).
3. `npm run typecheck`, `npx eslint qa/api-content-check.ts` y `npx prettier --check qa/api-content-check.ts` en verde. Commit sugerido para el check: `test(api): check de punta a punta de las 17 porciones a través de Nginx`.
4. La medición del tmpfs de Nginx con estos 40 clientes y su umbral los hace el coordinador en T027, con el stack real.

## 5. Agente W · Lectura de tablas e import (onda 2)

**Cubre:** US1 (FR-001 a FR-012), US4 (FR-003, FR-010, FR-027), FR-006 en lo que toca a las referencias entre filas, FR-039 y FR-038 contra la base. **Parte de:** S1, la base más A y B integrados. **Rama:** `c2/import`. **Proyecto de Compose propio:** `export COMPOSE_PROJECT_NAME=taller-c2-w`.

**Archivos que posee:** `api/app/Content/{ContentPlan,ContentReport,LatestImport,ContentDiff,ContentStore,ContentWriter,ContentInvariants,ImportLock,ContentMismatch,JsonDiff,ContentReader,PortionRenderer,BodyCache,ContentImports,ContentSnapshot,ContentImporter}.php`, `api/app/Console/Commands/ImportContent.php`, `api/tests/Unit/ContentDiffTest.php` y `api/tests/Content/{ImportContentTest,ContentContractTest}.php`. No toca nada más.

**Consume:**

- De A: las 21 tablas y `Tests\Support\ContentDatabase` (conteos, `CHECKSUM TABLE` como oráculo de «no cambió nada», sentencias ejecutadas).
- De B: `PublishedJson`, `Portion`, `ContentSource`, `ContentTables`, `RowSet`, `ContentRows`, `PortionAssembler`, `InvalidContent`, los códecs y `Tests\Support\ContentFixture` (la tabla de la sección 3).

**Entrega a E** (las firmas no cambian sin avisar; E las usa desde el día uno):

| Clase | Qué hace | API pública |
| --- | --- | --- |
| `ContentImports` (class) | — | `public function latest(): ?LatestImport` |
| `LatestImport` (class) | — | `public function __construct(public int $id, public string $documentHash, public ?string $sourceCommit, public array $portionHashes,)`<br>`public function version(): string`<br>`public function etag(Portion $portion): string` |
| `BodyCache` (class) | La caché de cuerpos (ADR 0006 D11): los bytes exactos de cada porción, bajo una clave con su hash completo (`content-body:<porción>:<sha256>`) y sin ningún build. Nunca se sirve ni se guarda un cuerpo cuyo sha256 no sea el de su clave: una entrada adulterada cuenta como ausente. | `public function get(Portion $portion, string $hash): ?string`<br>`public function put(Portion $portion, string $hash, string $body): void`<br>`public function forget(Portion $portion, string $hash): void`<br>`public function has(Portion $portion, string $hash): bool` |
| `PortionRenderer` (class) | De las tablas a los bytes que publica la API, con la conexión y la transacción del llamador: el import (en su transacción, después de escribir) y la entrega (cuando falta el cuerpo en la caché). Es la mitad de las tablas al JSON del seam de ADR 0006 D10; la otra mitad, el documento, la define el hash del generador. | `public function __construct(private ContentReader $reader, private PortionAssembler $assembler, private ExerciseCodec $exercises,)`<br>`public function render(Portion $portion): string`<br>`public function renderExercise(string $id): ?string`<br>`public function renderAll(): array` |
| `ContentSnapshot` (class) | Una lectura consistente del contenido: una transacción REPEATABLE READ de sólo lectura, en la que la primera consulta fija el snapshot (el último import). Así todas las tablas que lee el llamador son las de un mismo import, aunque otro se confirme en el medio. Escribir en la caché va después de cerrarla: una transacción de sólo lectura no admite escrituras. | `public static function read(Closure $callback): mixed` |
| `ImportContent` (class) | Carga en MySQL el contenido que generó tools/content/ (config/content.php). Lo corre el servicio migrate en cada `up`. Un candado de MySQL impide dos a la vez: si está tomado, sale con error en lugar de saltear el import en silencio (ADR 0006 D12). | `public function handle(ContentImporter $importer, ImportLock $lock): int` |

**Compuerta del agente:** `npm run api:test` completo (las pruebas de A, B, la base y las de W) y `npm run api:format:check` en verde; `npm run api:test:down` al terminar. **Punto S2:** cuando `ImportContentTest` y `ContentContractTest` pasan enteros, avisá al coordinador: integra tu rama en el worktree de E.

### Tarea 5.1 · La diferencia entre el documento y la base, `ContentDiff` (T019)

**Archivos:** crear `api/tests/Unit/ContentDiffTest.php`, `api/app/Content/ContentPlan.php`, `api/app/Content/ContentReport.php`, `api/app/Content/LatestImport.php` y `api/app/Content/ContentDiff.php`.

**Qué hace:** `ContentDiff::between` compara el `RowSet` que sale del documento con lo que hay en las tablas, en PHP con igualdad estricta de cadenas, fila por fila y con `key_order` incluido, y devuelve un `ContentPlan` con lo que hay que escribir, retirar, reactivar y registrar. Los hashes sólo clasifican el informe: un cambio que sólo reordena claves igual se escribe (si no, el auto-chequeo del import fallaría y cada despliegue quedaría bloqueado). Rechaza un índice v1 de etapa cambiado y un `test_key` retirado que reaparece por su cuenta, y decide si el import deja registro: si cambian las tablas, la huella del documento o la de alguna porción; un `source_commit` distinto no cuenta. Es PHP puro: la prueba corre en la suite `Unit`.

1. Copiá la prueba:

`api/tests/Unit/ContentDiffTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentDiff;
use App\Content\ContentRows;
use App\Content\ContentSource;
use App\Content\ContentTables;
use App\Content\InvalidContent;
use App\Content\LatestImport;
use App\Content\RowSet;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

/** @return array{0: RowSet, 1: ContentSource} las filas del documento (editado) y su fuente */
function desired(?Closure $edit = null, ?Closure $editMeta = null): array
{
    $fixture = ContentFixture::fromImage();
    if ($edit !== null) {
        $edit($fixture);
    }
    $source = ContentSource::fromDirectory($fixture->write(editMeta: $editMeta));
    $rows = new ContentRows(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec);

    return [$rows->fromSource($source), $source];
}

/** Lo que hay en la base después de importar ese conjunto: todo activo. */
function storedAfterImporting(RowSet $rows): array
{
    $stored = [];
    foreach ($rows->toArray() as $table => $list) {
        foreach ($list as $row) {
            $stored[$table][ContentTables::keyOf($table, $row)] = in_array($table, ContentTables::WITHOUT_LIFECYCLE, true)
                ? $row
                : $row + ['status' => 'active', 'retired_at' => null, 'created_at' => '2026-10-05 00:00:00.000', 'updated_at' => '2026-10-05 00:00:00.000'];
        }
    }

    return $stored;
}

/** Marca como retiradas las filas de un ejercicio, con la fecha dada, como lo deja un import. */
function retire(array $stored, string $exerciseId, string $at): array
{
    foreach (['exercises' => 'id', 'exercise_tests' => 'exercise_id', 'exercise_hints' => 'exercise_id'] as $table => $column) {
        foreach ($stored[$table] as $key => $row) {
            if ($row[$column] === $exerciseId) {
                $stored[$table][$key]['status'] = 'deprecated';
                $stored[$table][$key]['retired_at'] = $at;
                $stored[$table][$key]['position'] = $table === 'exercise_hints' ? $row['position'] : null;
            }
        }
    }

    return $stored;
}

function versionsOf(RowSet $rows): array
{
    return collect($rows->rows('exercises'))->mapWithKeys(fn (array $row) => ["{$row['id']}\x1f{$row['grading_hash']}" => true])->all();
}

function latestFor(ContentSource $source, ?string $commit = null): LatestImport
{
    return new LatestImport(1, $source->documentHash(), $commit, $source->meta['portions']);
}

it('con el mismo documento no hay nada que escribir ni que registrar', function () {
    [$rows, $source] = desired();

    $plan = (new ContentDiff)->between($rows, storedAfterImporting($rows), versionsOf($rows), latestFor($source), $source->meta);

    expect($plan->isEmpty())->toBeTrue()
        ->and($plan->report->new)->toBe([])
        ->and($plan->report->counts['exercises'])->toBe(274);
});

it('con la base vacía todo es nuevo, y cada ejercicio estrena su versión de corrección', function () {
    [$rows, $source] = desired();

    $plan = (new ContentDiff)->between($rows, [], [], null, $source->meta);

    expect($plan->recordImport)->toBeTrue()
        ->and($plan->report->new)->toHaveCount(274)
        ->and($plan->gradingVersions)->toHaveCount(274)
        ->and(array_map('count', $plan->writes))->toBe(array_map('count', $rows->toArray()));
});

it('un cambio de texto escribe sólo las filas de ese ejercicio y no toca la corrección', function () {
    [$base] = desired();
    $id = $base->rows('exercises')[3]['id'];
    [$rows, $source] = desired(fn (ContentFixture $f) => $f->exercise($id)->intro .= ' (revisado)');

    $plan = (new ContentDiff)->between($rows, storedAfterImporting($base), versionsOf($base), latestFor(ContentSource::fromDirectory(ContentFixture::imagePath())), $source->meta);

    expect(array_map('count', array_filter($plan->writes)))->toBe(['exercises' => 1])
        ->and($plan->report->textChanged)->toBe([$id])
        ->and($plan->report->gradingChanged)->toBe([])
        ->and($plan->gradingVersions)->toBe([])
        ->and($plan->recordImport)->toBeTrue();
});

it('un cambio en una prueba cambia la corrección y suma su versión', function () {
    [$base] = desired();
    $id = $base->rows('exercises')[3]['id'];
    [$rows, $source] = desired(fn (ContentFixture $f) => $f->exercise($id)->tests[0]->expression .= ' && true');

    $plan = (new ContentDiff)->between($rows, storedAfterImporting($base), versionsOf($base), null, $source->meta);

    expect(array_map('count', array_filter($plan->writes)))->toBe(['exercises' => 1, 'exercise_tests' => 1])
        ->and($plan->report->gradingChanged)->toBe([$id])
        ->and($plan->gradingVersions)->toHaveCount(1)
        ->and($plan->gradingVersions[0]['exercise_id'])->toBe($id);
});

it('un cambio que sólo reordena claves también se escribe', function () {
    [$base] = desired();
    $id = $base->rows('exercises')[3]['id'];
    [$rows, $source] = desired(function (ContentFixture $f) use ($id) {
        $exercise = $f->exercise($id);
        $title = $exercise->title;
        unset($exercise->title);
        $exercise->title = $title;
    });

    $plan = (new ContentDiff)->between($rows, storedAfterImporting($base), versionsOf($base), null, $source->meta);

    expect(array_map('count', array_filter($plan->writes)))->toBe(['exercises' => 1])
        ->and($plan->report->textChanged)->toBe([$id]);
});

it('retira lo que sale del documento y reactiva lo que vuelve', function () {
    [$full] = desired();
    $id = ContentFixture::fromImage()->unreferencedLabExercise();
    [$without, $source] = desired(fn (ContentFixture $f) => $f->withoutExercise($id));

    $retiring = (new ContentDiff)->between($without, storedAfterImporting($full), versionsOf($full), null, $source->meta);

    expect($retiring->report->retired)->toBe([$id])
        ->and(array_keys(array_filter($retiring->retires)))->toContain('exercises', 'exercise_tests', 'exercise_hints')
        ->and(array_column($retiring->retires['exercises'], 'id'))->toBe([$id])
        // Las posiciones son el índice dentro de la porción: los que siguen al retirado se corren.
        ->and(array_column($retiring->writes['exercises'] ?? [], 'id'))->not->toContain($id);

    $stored = retire(storedAfterImporting($full), $id, '2026-10-05 01:00:00.000');
    $returning = (new ContentDiff)->between($full, $stored, versionsOf($full), null, ContentSource::fromDirectory(ContentFixture::imagePath())->meta);

    expect($returning->report->reactivated)->toBe([$id])
        ->and(array_column($returning->writes['exercises'], 'id'))->toBe([$id]);
});

it('un test_key retirado por su cuenta no se reutiliza, pero vuelve con su ejercicio', function () {
    [$full, $source] = desired();
    $test = $full->rows('exercise_tests')[0];
    $stored = storedAfterImporting($full);
    $key = ContentTables::keyOf('exercise_tests', $test);
    $reuse = fn (array $stored) => (new ContentDiff)->between($full, $stored, versionsOf($full), null, $source->meta);

    // Retirado solo, con el ejercicio activo.
    $alone = $stored;
    $alone['exercise_tests'][$key]['status'] = 'deprecated';
    $alone['exercise_tests'][$key]['retired_at'] = '2026-10-05 01:00:00.000';
    expect(fn () => $reuse($alone))->toThrow(InvalidContent::class, "exercise_tests.{$test['exercise_id']}.{$test['test_key']}: el test_key se retiró y no se reutiliza");

    // Retirado solo, y después el ejercicio entero: el ejercicio vuelve, la prueba no.
    $later = retire($alone, $test['exercise_id'], '2026-10-05 02:00:00.000');
    $later['exercise_tests'][$key]['retired_at'] = '2026-10-05 01:00:00.000';
    expect(fn () => $reuse($later))->toThrow(InvalidContent::class, 'el test_key se retiró y no se reutiliza');

    // Retirado junto con su ejercicio: vuelven los dos.
    $together = retire($stored, $test['exercise_id'], '2026-10-05 02:00:00.000');
    expect($reuse($together)->report->reactivated)->toBe([$test['exercise_id']]);
});

it('el índice v1 de una etapa está congelado', function () {
    [$base] = desired();
    [$rows, $source] = desired(editMeta: function (array $meta) {
        $meta['workshopSteps']['cache'][0]['v1Index'] = 3;
        $meta['workshopSteps']['cache'][3]['v1Index'] = 0;

        return $meta;
    });

    expect(fn () => (new ContentDiff)->between($rows, storedAfterImporting($base), versionsOf($base), null, $source->meta))
        ->toThrow(InvalidContent::class, 'curriculum.meta.json: workshopSteps.cache.e1: el v1Index está congelado: era 0 y llega 3');
});

it('registra un import cuando cambia el documento o una porción, aunque no cambie ninguna tabla', function () {
    [$rows, $source] = desired();
    $stored = storedAfterImporting($rows);
    $diff = fn (?LatestImport $latest) => (new ContentDiff)->between($rows, $stored, versionsOf($rows), $latest, $source->meta);

    $otherDocument = new LatestImport(1, str_repeat('a', 64), null, $source->meta['portions']);
    expect($diff($otherDocument)->recordImport)->toBeTrue()->and($diff($otherDocument)->changesTables())->toBeFalse();

    $otherPortion = new LatestImport(1, $source->documentHash(), null, ['guide' => str_repeat('b', 64)] + $source->meta['portions']);
    expect($diff($otherPortion)->recordImport)->toBeTrue();

    // Otro commit de origen con el mismo contenido no es un cambio.
    expect($diff(latestFor($source, str_repeat('c', 40)))->isEmpty())->toBeTrue();
});

it('las versiones de corrección sólo crecen: volver a una que ya rigió no suma otra', function () {
    [$base] = desired();
    $id = $base->rows('exercises')[3]['id'];
    // La base tiene la corrección B vigente, y A y B ya rigieron; el documento vuelve a A.
    $versions = versionsOf($base) + ["{$id}\x1f".str_repeat('b', 64) => true];
    $stored = storedAfterImporting($base);
    $stored['exercises'][$id]['grading_hash'] = str_repeat('b', 64);
    [$rows, $source] = desired();

    $plan = (new ContentDiff)->between($rows, $stored, $versions, null, $source->meta);

    expect($plan->gradingVersions)->toBe([])
        ->and($plan->report->gradingChanged)->toBe([$id])
        ->and(array_column($plan->writes['exercises'], 'id'))->toBe([$id]);
});
```

2. Corré `npm run api:test -- --filter=ContentDiffTest`. **Esperado:** falla con `Class "App\Content\ContentDiff" not found`.
3. Implementá:

`api/app/Content/ContentPlan.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

/** Lo que tiene que escribir un import: filas nuevas o cambiadas, claves a retirar y versiones de corrección. */
final readonly class ContentPlan
{
    /**
     * @param  array<string, list<array<string, int|string|null>>>  $writes  filas a escribir (nuevas, cambiadas o reactivadas)
     * @param  array<string, list<array<string, mixed>>>  $retires  filas activas que ya no están en el documento
     * @param  list<array{exercise_id: string, grading_hash: string}>  $gradingVersions
     * @param  bool  $recordImport  si hay que dejar un registro en `content_imports`
     */
    public function __construct(
        public array $writes,
        public array $retires,
        public array $gradingVersions,
        public bool $recordImport,
        public ContentReport $report,
    ) {}

    public function changesTables(): bool
    {
        return array_filter($this->writes) !== [] || array_filter($this->retires) !== [] || $this->gradingVersions !== [];
    }

    /** No hay nada que escribir ni que registrar: el contenido ya está importado. */
    public function isEmpty(): bool
    {
        return ! $this->changesTables() && ! $this->recordImport;
    }
}
```

`api/app/Content/ContentReport.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

/** Lo que cambia (o cambió) un import, en los términos del informe de `--dry-run`. */
final readonly class ContentReport
{
    /**
     * @param  list<string>  $new  ejercicios que no estaban
     * @param  list<string>  $gradingChanged  con la corrección cambiada
     * @param  list<string>  $textChanged  con sólo el texto (o el orden de claves) cambiado
     * @param  list<string>  $retired  ejercicios que salen del documento
     * @param  list<string>  $reactivated  ejercicios retirados que vuelven
     * @param  array<string, int>  $written  filas que se escriben, por tabla
     * @param  array<string, int>  $retiredRows  filas que se retiran, por tabla
     * @param  array<string, int>  $counts  filas activas por tabla después del import
     */
    public function __construct(
        public array $new,
        public array $gradingChanged,
        public array $textChanged,
        public array $retired,
        public array $reactivated,
        public array $written,
        public array $retiredRows,
        public array $counts,
    ) {}

    /** @return array<string, mixed> el informe que guarda `content_imports.changes` */
    public function toArray(): array
    {
        return [
            'new' => $this->new,
            'gradingChanged' => $this->gradingChanged,
            'textChanged' => $this->textChanged,
            'retired' => $this->retired,
            'reactivated' => $this->reactivated,
            'written' => (object) $this->written,
            'retiredRows' => (object) $this->retiredRows,
        ];
    }
}
```

`api/app/Content/LatestImport.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

/** El último registro de `content_imports`: de él salen los validadores y la versión del contenido. */
final readonly class LatestImport
{
    /** @param array<string, string> $portionHashes sha256 de cada porción, por nombre */
    public function __construct(
        public int $id,
        public string $documentHash,
        public ?string $sourceCommit,
        public array $portionHashes,
    ) {}

    /** `Content-Version`: los primeros 32 hex del hash del documento. */
    public function version(): string
    {
        return substr($this->documentHash, 0, 32);
    }

    /** `ETag` de una porción: los primeros 32 hex de su hash, entre comillas. */
    public function etag(Portion $portion): string
    {
        return '"'.substr($this->portionHashes[$portion->value], 0, 32).'"';
    }
}
```

`api/app/Content/ContentDiff.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

/**
 * La diferencia entre lo que dice el documento (RowSet) y lo que hay en las tablas, calculada en
 * PHP con igualdad estricta, nunca con `=` de MySQL sobre una colación `_ai_ci`. Los hashes sólo
 * clasifican el informe: qué filas se escriben lo decide la comparación fila por fila (con
 * `key_order` incluido), así un cambio que sólo reordena claves igual se escribe.
 */
final class ContentDiff
{
    /**
     * @param  array<string, array<string, array<string, mixed>>>  $stored  filas por tabla y clave (ContentStore::rows)
     * @param  array<string, true>  $knownVersions  ContentStore::gradingVersions
     * @param  array<string, mixed>  $meta  curriculum.meta.json
     */
    public function between(RowSet $desired, array $stored, array $knownVersions, ?LatestImport $latest, array $meta): ContentPlan
    {
        $writes = [];
        $retires = [];
        $touched = [];
        foreach (ContentTables::KEYS as $table => $keys) {
            $lifecycle = ! in_array($table, ContentTables::WITHOUT_LIFECYCLE, true);
            $have = $stored[$table] ?? [];
            $wanted = $desired->keyed($table);
            foreach ($wanted as $key => $row) {
                $current = $have[$key] ?? null;
                if ($current !== null) {
                    $this->assertFrozen($table, $row, $current);
                }
                if ($current === null) {
                    $writes[$table][] = $row;
                } elseif ($lifecycle && $current['status'] !== 'active') {
                    $this->assertMayReturn($table, $row, $current, $stored);
                    $writes[$table][] = $row;
                } elseif (! $this->same($row, $current)) {
                    $writes[$table][] = $row;
                } else {
                    continue;
                }
                $this->touch($touched, $table, $row);
            }
            if (! $lifecycle) {
                continue;
            }
            foreach ($have as $key => $current) {
                if ($current['status'] === 'active' && ! isset($wanted[$key])) {
                    $retires[$table][] = $current;
                    $this->touch($touched, $table, $current);
                }
            }
        }

        $versions = [];
        foreach ($desired->rows('exercises') as $exercise) {
            if (! isset($knownVersions["{$exercise['id']}\x1f{$exercise['grading_hash']}"])) {
                $versions[] = ['exercise_id' => $exercise['id'], 'grading_hash' => $exercise['grading_hash']];
            }
        }

        $changes = array_filter($writes) !== [] || array_filter($retires) !== [] || $versions !== [];
        $report = $this->report($desired, $stored['exercises'] ?? [], $touched, $writes, $retires);

        return new ContentPlan($writes, $retires, $versions, $this->mustRecord($changes, $latest, $meta), $report);
    }

    /**
     * Un import deja registro si cambian las tablas, el documento o la huella de alguna porción. Un
     * commit de origen distinto, con el mismo contenido, no cuenta.
     *
     * @param  array<string, mixed>  $meta
     */
    private function mustRecord(bool $changes, ?LatestImport $latest, array $meta): bool
    {
        if ($changes || $latest === null || $latest->documentHash !== $meta['documentHash']) {
            return true;
        }
        $before = $latest->portionHashes;
        $after = $meta['portions'];
        ksort($before);
        ksort($after);

        return $before !== $after;
    }

    /** @param array<string, array<string, true>> $touched */
    private function touch(array &$touched, string $table, array $row): void
    {
        if ($table === 'exercises') {
            $touched[$row['id']] = true;
        } elseif ($table === 'exercise_tests' || $table === 'exercise_hints') {
            $touched[$row['exercise_id']] = true;
        }
    }

    /**
     * Una fila retirada sólo vuelve si se retiró junto con su ejercicio. Un `test_key` retirado por
     * su cuenta no se reutiliza (ADR 0006 D14): sus resultados ya apuntan a la prueba vieja.
     *
     * @param  array<string, int|string|null>  $row
     * @param  array<string, mixed>  $current
     * @param  array<string, array<string, array<string, mixed>>>  $stored
     */
    private function assertMayReturn(string $table, array $row, array $current, array $stored): void
    {
        if ($table !== 'exercise_tests') {
            return;
        }
        $exercise = $stored['exercises'][$row['exercise_id']] ?? null;
        $together = $exercise !== null && $exercise['status'] !== 'active' && $exercise['retired_at'] === $current['retired_at'];
        if (! $together) {
            throw InvalidContent::at('curriculum.json', "exercise_tests.{$row['exercise_id']}.{$row['test_key']}", 'el test_key se retiró y no se reutiliza: usá uno nuevo');
        }
    }

    /**
     * El índice v1 de una etapa está congelado: ni cambia ni se reasigna (ADR 0006 D14).
     *
     * @param  array<string, int|string|null>  $row
     * @param  array<string, mixed>  $current
     */
    private function assertFrozen(string $table, array $row, array $current): void
    {
        if ($table === 'workshop_steps' && $this->normalized($row['v1_position']) !== $this->normalized($current['v1_position'])) {
            throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$row['workshop_id']}.{$row['step_key']}", 'el v1Index está congelado: era '.($this->normalized($current['v1_position']) ?? 'ninguno').' y llega '.($this->normalized($row['v1_position']) ?? 'ninguno'));
        }
    }

    /**
     * @param  array<string, int|string|null>  $row
     * @param  array<string, mixed>  $current
     */
    private function same(array $row, array $current): bool
    {
        foreach ($row as $column => $value) {
            if ($this->normalized($value) !== $this->normalized($current[$column] ?? null)) {
                return false;
            }
        }

        return true;
    }

    private function normalized(mixed $value): ?string
    {
        return $value === null ? null : (string) $value;
    }

    /**
     * @param  array<string, array<string, mixed>>  $storedExercises
     * @param  array<string, true>  $touched
     * @param  array<string, list<array<string, int|string|null>>>  $writes
     * @param  array<string, list<array<string, mixed>>>  $retires
     */
    private function report(RowSet $desired, array $storedExercises, array $touched, array $writes, array $retires): ContentReport
    {
        $new = $gradingChanged = $textChanged = $reactivated = [];
        $incoming = $desired->keyed('exercises');
        foreach ($incoming as $id => $exercise) {
            $current = $storedExercises[$id] ?? null;
            if ($current === null) {
                $new[] = $id;
            } elseif ($current['status'] !== 'active') {
                $reactivated[] = $id;
            } elseif (isset($touched[$id])) {
                if ($this->normalized($current['grading_hash']) !== $this->normalized($exercise['grading_hash'])) {
                    $gradingChanged[] = $id;
                } else {
                    $textChanged[] = $id;
                }
            }
        }
        $retired = [];
        foreach ($storedExercises as $id => $current) {
            if ($current['status'] === 'active' && ! isset($incoming[$id])) {
                $retired[] = $id;
            }
        }

        return new ContentReport(
            $new,
            $gradingChanged,
            $textChanged,
            $retired,
            $reactivated,
            array_map('count', array_filter($writes)),
            array_map('count', array_filter($retires)),
            array_map('count', $desired->toArray()),
        );
    }
}
```

4. Corré de nuevo. **Esperado:** pasan las diez pruebas: con el mismo documento no hay nada que escribir ni registrar; con la base vacía todo es nuevo y cada ejercicio estrena su versión de corrección; un cambio de texto escribe sólo las filas de ese ejercicio; un cambio en una prueba cambia la corrección; reordenar claves también se escribe; retira y reactiva; un `test_key` retirado no se reutiliza pero vuelve con su ejercicio; el índice v1 está congelado; registra un import cuando cambia el documento o una porción aunque no cambie ninguna tabla; y las versiones de corrección sólo crecen.

### Tarea 5.2 · Las pruebas del import y del contrato, que fallan (T020)

**Archivos:** crear `api/tests/Content/ImportContentTest.php` y `api/tests/Content/ContentContractTest.php`.

**Qué prueban** (suite `Content`, contra MySQL real y con `DatabaseTruncation`: el import abre y confirma su propia transacción):

- `ImportContentTest`: importa el contenido de la imagen (las 21 tablas, su registro y las 274 versiones de corrección); con el mismo contenido no escribe nada (`CHECKSUM TABLE` de las 21 tablas como oráculo y ninguna sentencia de escritura); deja los 17 cuerpos en la caché; retira lo que sale del documento sin borrar nada y lo reactiva si vuelve; `--dry-run` informa nuevos, correcciones, textos y retirados sin escribir; rechaza un meta de otra generación; un hash adulterado en el meta hace fallar el auto-chequeo y no deja nada; un error de la base a mitad del import no deja nada a medias y suelta el candado; sólo corre un import a la vez; registra un import sin tocar las tablas cuando sólo cambia el formato; un commit de origen distinto no registra un import; avisa si el contenido no trae commit; A, B y otra vez A suman una sola versión de corrección; un `test_key` retirado por su cuenta no se reutiliza; y cada consulta de invariantes se rompe a mano.
- `ContentContractTest` (FR-038): tras un import, el sha256 de cada una de las 17 porciones y de cada uno de los 274 ejercicios armados desde las tablas es el del meta que calculó Node, y lo retirado sale de las porciones.

1. Copiá las pruebas:

`api/tests/Content/ImportContentTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\BodyCache;
use App\Content\ContentImports;
use App\Content\ContentInvariants;
use App\Content\Portion;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\Support\ContentDatabase;
use Tests\Support\ContentFixture;

// content:import contra MySQL real, con transacciones de verdad (DatabaseTruncation): así el
// rollback de un error y la exclusión entre imports se pueden probar.
afterEach(fn () => ContentFixture::cleanup());

function useContent(string $directory): void
{
    config(['content.path' => $directory]);
}

function importImage(): void
{
    useContent(ContentFixture::imagePath());
    Artisan::call('content:import');
}

it('importa el contenido de la imagen: las 21 tablas, su registro y las 274 versiones de corrección', function () {
    $this->artisan('content:import')->expectsOutputToContain('Importado el contenido sha256')->assertExitCode(0);

    $meta = json_decode(file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true);
    expect(ContentDatabase::counts())->toBe([
        'languages' => 2, 'catalogs' => 3, 'content_imports' => 1, 'topics' => 98, 'workshops' => 25, 'exercises' => 274,
        'exercise_grading_versions' => 274, 'exercise_tests' => 822, 'exercise_hints' => 822, 'workshop_objectives' => 75,
        'workshop_steps' => 100, 'workshop_related_exercises' => 118, 'worlds' => 8, 'world_exercises' => 48,
        'atlas_concepts' => 32, 'guide_resources' => 15, 'guide_sources' => 9, 'guide_tracks' => 2, 'guide_modules' => 8,
        'guide_steps' => 24, 'guide_step_resources' => 56,
    ]);
    $import = DB::table('content_imports')->sole();
    expect($import->document_hash)->toBe($meta['documentHash'])
        ->and($import->source_commit)->toBeNull()
        ->and(json_decode($import->portion_hashes, true))->toEqualCanonicalizing($meta['portions'])
        ->and(DB::table('exercises')->where('status', 'active')->count())->toBe(274);
});

it('con el mismo contenido no escribe nada: migrate lo corre en cada up', function () {
    importImage();
    $checksums = ContentDatabase::checksums();

    $writes = ContentDatabase::contentWritesDuring(function () {
        $this->artisan('content:import')->expectsOutputToContain('ya está importado')->assertExitCode(0);
    });

    expect($writes)->toBe([])->and(ContentDatabase::checksums())->toBe($checksums);
});

it('precalienta la caché de cuerpos con las 17 porciones', function () {
    importImage();
    $hashes = json_decode(DB::table('content_imports')->value('portion_hashes'), true);

    foreach (Portion::cases() as $portion) {
        $missing = ! app(BodyCache::class)->has($portion, $hashes[$portion->value]) ? $portion->value : null;
        expect($missing)->toBeNull();
    }
});

it('retira lo que sale del documento sin borrar nada, y lo reactiva si vuelve (US4)', function () {
    importImage();
    $fixture = ContentFixture::fromImage();
    $gone = $fixture->unreferencedLabExercise();
    $before = ContentDatabase::counts();
    $oldHash = json_decode(DB::table('content_imports')->value('portion_hashes'), true)['lab.rust'];

    useContent($fixture->withoutExercise($gone)->write());
    $this->artisan('content:import')->expectsOutputToContain("Retirados: 1 ({$gone})")->assertExitCode(0);

    $row = DB::table('exercises')->where('id', $gone)->first();
    expect($row->status)->toBe('deprecated')
        ->and($row->retired_at)->not->toBeNull()
        ->and($row->position)->toBeNull()
        ->and(DB::table('exercise_tests')->where('exercise_id', $gone)->pluck('status')->unique()->all())->toBe(['deprecated'])
        ->and(DB::table('exercise_hints')->where('exercise_id', $gone)->pluck('status')->unique()->all())->toBe(['deprecated'])
        ->and(DB::table('content_imports')->count())->toBe(2)
        // Nada se borró: sólo se sumó el registro de este import.
        ->and(ContentDatabase::counts())->toBe(array_replace($before, ['content_imports' => 2]))
        // La porción cambió: la caché guarda el cuerpo nuevo y ya no el viejo.
        ->and(app(BodyCache::class)->has(Portion::LabRust, $oldHash))->toBeFalse();

    useContent(ContentFixture::imagePath());
    $this->artisan('content:import')->expectsOutputToContain("Reactivados: 1 ({$gone})")->assertExitCode(0);

    $back = DB::table('exercises')->where('id', $gone)->first();
    expect($back->status)->toBe('active')->and($back->retired_at)->toBeNull()->and($back->position)->not->toBeNull()
        ->and(DB::table('exercise_tests')->where('exercise_id', $gone)->pluck('status')->unique()->all())->toBe(['active']);
});

it('--dry-run informa nuevos, correcciones, textos y retirados, sin escribir', function () {
    $base = ContentFixture::fromImage();
    $added = $base->unreferencedLabExercise('rust');
    useContent($base->withoutExercise($added)->write());
    Artisan::call('content:import');

    $next = ContentFixture::fromImage();
    $graded = $next->document->quests->go[0]->id;
    $next->exercise($graded)->tests[0]->expression .= ' && true';
    $texted = $next->document->quests->go[1]->id;
    $next->exercise($texted)->intro .= ' (revisado)';
    $retired = $next->unreferencedLabExercise('go');
    useContent($next->withoutExercise($retired)->write());
    $checksums = ContentDatabase::checksums();

    $writes = ContentDatabase::contentWritesDuring(function () use ($added, $graded, $texted, $retired) {
        $this->artisan('content:import', ['--dry-run' => true])
            ->expectsOutputToContain('no se escribió nada')
            ->expectsOutputToContain("Ejercicios nuevos: 1 ({$added})")
            ->expectsOutputToContain("Cambios de corrección: 1 ({$graded})")
            ->expectsOutputToContain("Cambios de texto: 1 ({$texted})")
            ->expectsOutputToContain("Retirados: 1 ({$retired})")
            ->assertExitCode(0);
    });

    expect($writes)->toBe([])->and(ContentDatabase::checksums())->toBe($checksums);
});

it('rechaza un meta de otro build y no escribe nada', function () {
    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", file_get_contents("{$directory}/curriculum.json").' ');
    useContent($directory);

    $this->artisan('content:import')->expectsOutputToContain('no corresponde a este curriculum.json')->assertExitCode(1);

    expect(array_sum(ContentDatabase::counts()))->toBe(0);
});

it('un hash adulterado en el meta hace fallar el auto-chequeo y no deja nada', function () {
    useContent(ContentFixture::fromImage()->write(editMeta: function (array $meta) {
        $meta['portions']['lab.rust'] = str_repeat('a', 64);

        return $meta;
    }));

    $this->artisan('content:import')
        ->expectsOutputToContain('La porción lab.rust armada desde las tablas no coincide con el hash de curriculum.meta.json')
        ->assertExitCode(1);

    expect(array_sum(ContentDatabase::counts()))->toBe(0);
});

it('un error de la base a mitad del import no deja nada a medias y suelta el candado', function () {
    $fixture = ContentFixture::fromImage();
    // atlas_concepts.title es varchar(255): MySQL estricto lo rechaza después de escribir ejercicios y talleres.
    $fixture->document->atlas->go[count($fixture->document->atlas->go) - 1]->title = str_repeat('x', 300);
    useContent($fixture->write());

    expect(fn () => Artisan::call('content:import'))->toThrow(QueryException::class);

    expect(array_sum(ContentDatabase::counts()))->toBe(0);
    importImage();
    expect(DB::table('exercises')->count())->toBe(274);
});

it('sólo corre un import a la vez: el segundo sale con error en lugar de saltearse', function () {
    $holder = DB::connectUsing('holder', config('database.connections.mysql'), true);
    $name = DB::scalar("select concat(database(), ':content-import')");
    $holder->select('select get_lock(?, 0)', [$name]);

    $this->artisan('content:import')->expectsOutputToContain('Ya hay otro content:import en curso')->assertExitCode(1);
    expect(array_sum(ContentDatabase::counts()))->toBe(0);

    $holder->select('select release_lock(?)', [$name]);
    $this->artisan('content:import')->assertExitCode(0);
});

it('registra un import sin tocar las tablas cuando sólo cambia el formato del documento', function () {
    importImage();
    $checksums = ContentDatabase::checksums();
    unset($checksums['content_imports']);
    $first = app(ContentImports::class)->latest();

    useContent(ContentFixture::fromImage()->write(indent: 4));
    $this->artisan('content:import')->assertExitCode(0);

    $second = app(ContentImports::class)->latest();
    $after = ContentDatabase::checksums();
    unset($after['content_imports']);
    expect($after)->toBe($checksums)
        ->and(DB::table('content_imports')->count())->toBe(2)
        ->and($second->portionHashes)->toBe($first->portionHashes)
        ->and($second->version())->not->toBe($first->version());
});

it('un commit de origen distinto con el mismo contenido no registra un import; con commit, lo guarda', function () {
    $commit = str_repeat('c', 40);
    useContent(ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => $commit] + $meta));
    Artisan::call('content:import');
    expect(DB::table('content_imports')->value('source_commit'))->toBe($commit);

    useContent(ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => str_repeat('d', 40)] + $meta));
    $this->artisan('content:import')->assertExitCode(0);

    expect(DB::table('content_imports')->count())->toBe(1);
});

it('avisa cuando el contenido no trae commit de origen', function () {
    $this->artisan('content:import')->expectsOutputToContain('no trae commit de origen')->assertExitCode(0);
});

it('cada versión de corrección que rigió queda: A, B y otra vez A suman sólo una', function () {
    importImage();
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->quests->go[0]->id;
    $original = $fixture->exercise($id)->tests[0]->expression;
    $hashA = DB::table('exercises')->where('id', $id)->value('grading_hash');

    $fixture->exercise($id)->tests[0]->expression = $original.' && true';
    useContent($fixture->write());
    Artisan::call('content:import');
    $hashB = DB::table('exercises')->where('id', $id)->value('grading_hash');

    importImage();

    expect($hashB)->not->toBe($hashA)
        ->and(DB::table('exercises')->where('id', $id)->value('grading_hash'))->toBe($hashA)
        ->and(DB::table('exercise_grading_versions')->where('exercise_id', $id)->pluck('grading_hash')->sort()->values()->all())
        ->toBe(collect([$hashA, $hashB])->sort()->values()->all())
        ->and(DB::table('exercise_grading_versions')->count())->toBe(275);
});

it('un test_key retirado por su cuenta no se reutiliza, y el import no deja rastro', function () {
    importImage();
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->quests->go[0]->id;
    $exercise = $fixture->exercise($id);
    $removed = array_pop($exercise->tests);
    useContent($fixture->write());
    Artisan::call('content:import');
    expect(DB::table('exercise_tests')->where('exercise_id', $id)->where('test_key', $removed->id)->value('status'))->toBe('deprecated');
    $checksums = ContentDatabase::checksums();

    importImage();

    expect(Artisan::output())->toContain('el test_key se retiró y no se reutiliza')
        ->and(ContentDatabase::checksums())->toBe($checksums);
});

it('las reglas entre filas se comprueban con consultas, y cada una se rompe a mano', function (string $sql, string $violation) {
    importImage();
    $invariants = new ContentInvariants;
    expect($invariants->violations())->toBe([]);

    DB::statement($sql);

    expect($invariants->violations())->toContain($violation);
})->with([
    'dos jefes en un mundo' => [
        "update world_exercises set role = 'boss' where role = 'challenge' limit 1",
        'un mundo activo no tiene exactamente un jefe, último de sus desafíos',
    ],
    'un ejercicio activo bajo un tema retirado' => [
        "update topics set status = 'deprecated', retired_at = now(3), updated_at = now(3) limit 1",
        'hay filas activas de exercises que dependen de topics retirados',
    ],
    'la corrección vigente sin versión' => [
        "update exercises set grading_hash = repeat('f', 64) limit 1",
        'la corrección vigente de un ejercicio activo no está en exercise_grading_versions',
    ],
    'dos ejercicios con la misma posición' => [
        "update exercises set position = 0 where catalog = 'lab' and language = 'rust' and position = 1",
        'hay filas activas de exercises con la misma posición',
    ],
    'una cadena de catálogos que no empieza en 1' => [
        "update catalogs set chain_position = 2 where code = 'lab'",
        'la cadena de catálogos no es única y contigua desde 1',
    ],
]);
```

`api/tests/Content/ContentContractTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\Portion;
use App\Content\PortionRenderer;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\Support\ContentFixture;

// FR-038: el contrato del contenido, contra MySQL. Lo que sale de las tablas son los bytes que
// fijó el generador: el hash de cada porción y de cada ejercicio es el de curriculum.meta.json,
// que calculó Node sobre JSON.stringify. Un oráculo independiente del código PHP que se prueba.
afterEach(fn () => ContentFixture::cleanup());

it('arma desde las tablas cada una de las 17 porciones y los 274 ejercicios con los hashes del generador', function () {
    Artisan::call('content:import');
    $meta = json_decode(file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true);
    $renderer = app(PortionRenderer::class);

    $wrongPortions = [];
    foreach (Portion::cases() as $portion) {
        if (hash('sha256', $renderer->render($portion)) !== $meta['portions'][$portion->value]) {
            $wrongPortions[] = $portion->value;
        }
    }
    $wrongExercises = [];
    foreach ($meta['exercises'] as $id => $hashes) {
        if (hash('sha256', (string) $renderer->renderExercise($id)) !== $hashes['contentHash']) {
            $wrongExercises[] = $id;
        }
    }

    expect($wrongPortions)->toBe([])->and($wrongExercises)->toBe([]);
});

it('lo retirado sale de las porciones y renderExercise no lo arma', function () {
    Artisan::call('content:import');
    $fixture = ContentFixture::fromImage();
    $gone = $fixture->unreferencedLabExercise();
    config(['content.path' => $fixture->withoutExercise($gone)->write()]);
    Artisan::call('content:import');

    $lab = json_decode(app(PortionRenderer::class)->render(Portion::LabRust));

    expect(array_column($lab, 'id'))->not->toContain($gone)
        ->and(app(PortionRenderer::class)->renderExercise($gone))->toBeNull()
        ->and(DB::table('exercises')->where('id', $gone)->value('status'))->toBe('deprecated');
});
```

2. Corré `npm run api:test -- --testsuite=Content`. **Esperado:** fallan con `Command "content:import" is not defined`.

### Tarea 5.3 · La lectura de las tablas y el import (T021)

**Archivos:** crear `api/app/Content/{ContentStore,ContentWriter,ContentInvariants,ImportLock,ContentMismatch,JsonDiff,ContentReader,PortionRenderer,BodyCache,ContentImports,ContentSnapshot,ContentImporter}.php` y `api/app/Console/Commands/ImportContent.php`.

**Qué hace cada pieza:**

- Lectura: `ContentReader` lee las filas activas de las tablas por porción; `PortionRenderer::render` y `renderExercise` las pasan por `PortionAssembler` y devuelven los bytes; `ContentSnapshot::read` abre una foto consistente (`REPEATABLE READ`, sólo lectura) en la que la primera consulta fija el último import; `ContentImports::latest` y `LatestImport` entregan el último registro de `content_imports`, de donde salen los validadores y la versión; `BodyCache` guarda los cuerpos en el store `database` con la clave `content-body:<porción>:<sha256>`, nunca sirve ni guarda uno cuyo sha256 no sea el de su clave y trata una entrada adulterada como ausente.
- Escritura: `ContentStore` lee lo que hay en las tablas; `ContentWriter` escribe un `ContentPlan` con el query builder, nunca con Eloquent (upsert con alias de fila, lista de actualización explícita, horas con milisegundos), retira con `UPDATE` y nunca borra ni vacía; `ContentInvariants` comprueba con consultas las reglas entre filas de [data-model.md](./data-model.md) y se rompe a mano en la prueba; `ImportLock` toma `GET_LOCK(CONCAT(DATABASE(), ':content-import'), 0)`.
- `ContentImporter::import` calcula el plan fuera de la transacción y, en una sola (`READ COMMITTED` y `attempts: 1`), registra el import si corresponde, escribe, comprueba los invariantes y arma las 17 porciones desde las tablas exigiendo el hash del meta; recién después de confirmar deja los 17 cuerpos en la caché y borra los de los hashes reemplazados. `ImportContent` (`content:import {--dry-run}`) toma el candado, lee el documento de `config('content.path')`, avisa si no trae commit de origen, vuelve a verificar que el candado sea suyo antes de abrir la transacción y sale con error si otro import lo tiene o si el contenido no cierra. `JsonDiff` nombra la primera ruta JSON que difiere cuando el auto-chequeo falla.

1. Implementá en este orden, corriendo `npm run api:test -- --testsuite=Content` entre un paso y otro: primero la lectura, para que E pueda empezar (`ContentReader`, `PortionRenderer`, `BodyCache`, `ContentImports`, `ContentSnapshot`); después `ContentStore`, `ContentWriter`, `ImportLock`, `ContentMismatch`, `JsonDiff` y `ContentInvariants`; y por último `ContentImporter` y `ImportContent`.

`api/app/Content/ContentReader.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Las filas activas que necesita una porción (o un ejercicio), leídas de la base con la conexión
 * actual: el import las lee dentro de su transacción, y la entrega dentro de un snapshot de sólo
 * lectura (ContentSnapshot). No arma nada: eso es de PortionAssembler.
 */
final class ContentReader
{
    private const GUIDE_TABLES = ['guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'];

    /** @return list<string> los lenguajes, en el orden de `languages.position` */
    public function languages(): array
    {
        return DB::table('languages')->orderBy('position')->pluck('code')->all();
    }

    /** @return array<string, list<array<string, mixed>>> */
    public function rows(Portion $portion): array
    {
        return match ($portion->group()) {
            'lab', 'quests', 'cores' => $this->exerciseRows($portion),
            'workshops' => $this->workshopRows($portion),
            'campaign' => $this->worldRows($portion),
            'atlas' => ['atlas_concepts' => $this->get($this->active('atlas_concepts')->where('language', $portion->slice()))],
            'guide' => array_combine(self::GUIDE_TABLES, array_map(fn (string $table) => $this->get($this->active($table)), self::GUIDE_TABLES)),
        };
    }

    /**
     * Un ejercicio activo con sus pruebas, sus pistas y la etiqueta de su tema; null si no existe
     * o está retirado.
     *
     * @return ?array{exercise: array<string, mixed>, tests: list<array<string, mixed>>, hints: list<array<string, mixed>>, topic: string}
     */
    public function exercise(string $id): ?array
    {
        $exercise = $this->get($this->active('exercises')->where('id', $id))[0] ?? null;
        if ($exercise === null) {
            return null;
        }
        $topic = $this->active('topics')->where('language', $exercise['language'])->where('topic_key', $exercise['topic_key'])->value('label');

        return [
            'exercise' => $exercise,
            'tests' => $this->get($this->active('exercise_tests')->where('exercise_id', $id)->orderBy('position')),
            'hints' => $this->get($this->active('exercise_hints')->where('exercise_id', $id)->orderBy('position')),
            'topic' => (string) $topic,
        ];
    }

    /** @return array<string, list<array<string, mixed>>> */
    private function exerciseRows(Portion $portion): array
    {
        $column = $portion->group() === 'cores' ? 'domain' : 'language';
        $exercises = $this->get($this->active('exercises')->where('catalog', $portion->group())->where($column, $portion->slice()));
        $ids = array_column($exercises, 'id');

        return [
            'exercises' => $exercises,
            'exercise_tests' => $this->get($this->active('exercise_tests')->whereIn('exercise_id', $ids)),
            'exercise_hints' => $this->get($this->active('exercise_hints')->whereIn('exercise_id', $ids)),
            'topics' => $this->get($this->active('topics')->whereIn('language', array_unique(array_column($exercises, 'language')))),
        ];
    }

    /** @return array<string, list<array<string, mixed>>> */
    private function workshopRows(Portion $portion): array
    {
        $workshops = $this->get($this->active('workshops')->where('domain', $portion->slice()));
        $ids = array_column($workshops, 'id');
        $related = $this->get($this->active('workshop_related_exercises')->whereIn('workshop_id', $ids));
        // De los ejercicios sólo hace falta el lenguaje, y para los núcleos, su taller.
        $exercises = $this->get(
            $this->active('exercises')
                ->select(['id', 'language', 'workshop_id'])
                ->where(fn (Builder $query) => $query->whereIn('workshop_id', $ids)->orWhereIn('id', array_column($related, 'exercise_id'))),
        );

        return [
            'workshops' => $workshops,
            'workshop_objectives' => $this->get($this->active('workshop_objectives')->whereIn('workshop_id', $ids)),
            'workshop_steps' => $this->get($this->active('workshop_steps')->whereIn('workshop_id', $ids)),
            'workshop_related_exercises' => $related,
            'exercises' => $exercises,
        ];
    }

    /** @return array<string, list<array<string, mixed>>> */
    private function worldRows(Portion $portion): array
    {
        $worlds = $this->get($this->active('worlds')->where('language', $portion->slice()));

        return [
            'worlds' => $worlds,
            'world_exercises' => $this->get($this->active('world_exercises')->whereIn('world_id', array_column($worlds, 'id'))),
        ];
    }

    private function active(string $table): Builder
    {
        return DB::table($table)->where('status', 'active');
    }

    /** @return list<array<string, mixed>> */
    private function get(Builder $query): array
    {
        return $query->get()->map(fn (object $row) => (array) $row)->all();
    }
}
```

`api/app/Content/PortionRenderer.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use App\Content\Codec\ExerciseCodec;

/**
 * De las tablas a los bytes que publica la API, con la conexión y la transacción del llamador: el
 * import (en su transacción, después de escribir) y la entrega (cuando falta el cuerpo en la
 * caché). Es la mitad de las tablas al JSON del seam de ADR 0006 D10; la otra mitad, el
 * documento, la define el hash del generador.
 */
final class PortionRenderer
{
    public function __construct(
        private ContentReader $reader,
        private PortionAssembler $assembler,
        private ExerciseCodec $exercises,
    ) {}

    public function render(Portion $portion): string
    {
        return $this->assembler->assemble($portion, $this->reader->rows($portion), $this->reader->languages());
    }

    /** Los bytes de un ejercicio activo, o null si no existe o está retirado. */
    public function renderExercise(string $id): ?string
    {
        $rows = $this->reader->exercise($id);

        return $rows === null
            ? null
            : PublishedJson::encode($this->exercises->toRecord($rows['exercise'], $rows['tests'], $rows['hints'], $rows['topic']));
    }

    /** @return array<string, string> las 17 porciones, por nombre */
    public function renderAll(): array
    {
        $bodies = [];
        foreach (Portion::cases() as $portion) {
            $bodies[$portion->value] = $this->render($portion);
        }

        return $bodies;
    }
}
```

`api/app/Content/BodyCache.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Cache;
use LogicException;

/**
 * La caché de cuerpos (ADR 0006 D11): los bytes exactos de cada porción, bajo una clave con su
 * hash completo (`content-body:<porción>:<sha256>`) y sin ningún build. Nunca se sirve ni se
 * guarda un cuerpo cuyo sha256 no sea el de su clave: una entrada adulterada cuenta como ausente.
 */
final class BodyCache
{
    public function get(Portion $portion, string $hash): ?string
    {
        $body = $this->store()->get($this->key($portion, $hash));
        if (! is_string($body)) {
            return null;
        }
        if (hash('sha256', $body) !== $hash) {
            $this->forget($portion, $hash);

            return null;
        }

        return $body;
    }

    public function put(Portion $portion, string $hash, string $body): void
    {
        if (hash('sha256', $body) !== $hash) {
            throw new LogicException("El cuerpo de {$portion->value} no tiene el hash {$hash}: no se guarda.");
        }
        $this->store()->put($this->key($portion, $hash), $body, now()->addDays((int) config('content.cache_days')));
    }

    public function forget(Portion $portion, string $hash): void
    {
        $this->store()->forget($this->key($portion, $hash));
    }

    public function has(Portion $portion, string $hash): bool
    {
        return $this->store()->has($this->key($portion, $hash));
    }

    private function key(Portion $portion, string $hash): string
    {
        return "content-body:{$portion->value}:{$hash}";
    }

    private function store(): Repository
    {
        return Cache::store(config('content.cache_store'));
    }
}
```

`api/app/Content/ContentImports.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/** Lectura del último import: una fila por clave primaria. */
final class ContentImports
{
    public function latest(): ?LatestImport
    {
        $row = DB::table('content_imports')->orderByDesc('id')->first(['id', 'document_hash', 'source_commit', 'portion_hashes']);

        return $row === null
            ? null
            : new LatestImport((int) $row->id, $row->document_hash, $row->source_commit, json_decode($row->portion_hashes, true, 512, JSON_THROW_ON_ERROR));
    }
}
```

`api/app/Content/ContentSnapshot.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Closure;
use Illuminate\Support\Facades\DB;

/**
 * Una lectura consistente del contenido: una transacción REPEATABLE READ de sólo lectura, en la
 * que la primera consulta fija el snapshot (el último import). Así todas las tablas que lee el
 * llamador son las de un mismo import, aunque otro se confirme en el medio. Escribir en la caché
 * va después de cerrarla: una transacción de sólo lectura no admite escrituras.
 */
final class ContentSnapshot
{
    public static function read(Closure $callback): mixed
    {
        // Si ya hay una transacción (las pruebas bajo RefreshDatabase), se lee dentro de ella.
        if (DB::transactionLevel() > 0) {
            return $callback();
        }
        DB::statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
        DB::beginTransaction();
        try {
            return $callback();
        } finally {
            DB::rollBack();
        }
    }
}
```

`api/app/Content/ContentStore.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/** Lo que hay hoy en las tablas de contenido, activo o retirado, para calcular la diferencia. */
final class ContentStore
{
    /** @return array<string, array<string, array<string, mixed>>> filas por tabla y por clave primaria */
    public function rows(): array
    {
        $tables = [];
        foreach (array_keys(ContentTables::KEYS) as $table) {
            $tables[$table] = [];
            foreach (DB::table($table)->get() as $row) {
                $row = (array) $row;
                $tables[$table][ContentTables::keyOf($table, $row)] = $row;
            }
        }

        return $tables;
    }

    /** @return array<string, true> «ejercicio⇥hash» de cada versión de corrección que ya rigió */
    public function gradingVersions(): array
    {
        $known = [];
        foreach (DB::table('exercise_grading_versions')->get(['exercise_id', 'grading_hash']) as $row) {
            $known["{$row->exercise_id}\x1f{$row->grading_hash}"] = true;
        }

        return $known;
    }
}
```

`api/app/Content/ContentWriter.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/**
 * Escribe un ContentPlan con el query builder, nunca con Eloquent (ADR 0006 D09): upsert con alias
 * de fila (`use_upsert_alias`), una lista de actualización explícita y las horas del reloj del
 * servidor con milisegundos. Nunca DELETE ni TRUNCATE: lo que sale del documento se retira.
 */
final class ContentWriter
{
    /** Deja el registro de este import y devuelve su id. */
    public function recordImport(ContentSource $source, ContentPlan $plan): int
    {
        return (int) DB::table('content_imports')->insertGetId([
            'document_hash' => $source->documentHash(),
            'source_commit' => $source->sourceCommit(),
            'portion_hashes' => PublishedJson::encode($source->meta['portions']),
            'counts' => PublishedJson::encode($plan->report->counts),
            'changes' => PublishedJson::encode($plan->report->toArray()),
            'created_at' => $this->now(),
        ]);
    }

    public function write(ContentPlan $plan, ?int $importId): void
    {
        $now = $this->now();
        foreach (ContentTables::KEYS as $table => $keys) {
            $this->upsert($table, $keys, $plan->writes[$table] ?? [], $now);
            if ($table === 'exercises') {
                // Después de los ejercicios (clave foránea) y con el id del import que los trae.
                $this->addGradingVersions($plan->gradingVersions, $importId, $now);
            }
        }
        foreach ($plan->retires as $table => $rows) {
            $this->retire($table, $rows, $now);
        }
    }

    /**
     * @param  list<string>  $keys
     * @param  list<array<string, int|string|null>>  $rows
     */
    private function upsert(string $table, array $keys, array $rows, string $now): void
    {
        if ($rows === []) {
            return;
        }
        $lifecycle = ! in_array($table, ContentTables::WITHOUT_LIFECYCLE, true);
        $stamped = $lifecycle
            ? array_map(fn (array $row) => $row + ['status' => 'active', 'retired_at' => null, 'created_at' => $now, 'updated_at' => $now], $rows)
            : $rows;
        // Se actualiza todo menos la clave y created_at: una fila que vuelve recupera status,
        // retired_at y position.
        $update = array_values(array_diff(array_keys($stamped[0]), [...$keys, 'created_at']));
        foreach (array_chunk($stamped, 100) as $chunk) {
            DB::table($table)->upsert($chunk, $keys, $update);
        }
    }

    /** @param list<array<string, mixed>> $rows las filas activas que salen del documento */
    private function retire(string $table, array $rows, string $now): void
    {
        $keys = ContentTables::KEYS[$table];
        $set = ['status' => 'deprecated', 'retired_at' => $now, 'updated_at' => $now];
        if (in_array($table, ContentTables::NULL_POSITION_WHEN_RETIRED, true)) {
            $set['position'] = null;
        }
        if ($table === 'catalogs') {
            $set['chain_position'] = null;
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table($table)->where('status', 'active')->where(function ($query) use ($keys, $chunk) {
                foreach ($chunk as $row) {
                    $query->orWhere(function ($match) use ($keys, $row) {
                        foreach ($keys as $column) {
                            $match->where($column, $row[$column]);
                        }
                    });
                }
            })->update($set);
        }
    }

    /** @param list<array{exercise_id: string, grading_hash: string}> $versions */
    private function addGradingVersions(array $versions, ?int $importId, string $now): void
    {
        foreach (array_chunk($versions, 100) as $chunk) {
            // INSERT simple, nunca IGNORE: una repetida sería un error de quien calculó el plan.
            DB::table('exercise_grading_versions')->insert(array_map(
                fn (array $version) => $version + ['first_import_id' => $importId, 'created_at' => $now],
                $chunk,
            ));
        }
    }

    private function now(): string
    {
        return now()->utc()->format('Y-m-d H:i:s.v');
    }
}
```

`api/app/Content/ImportLock.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/**
 * El candado de MySQL que impide dos `content:import` a la vez (ADR 0006 D12). GET_LOCK con espera
 * 0 devuelve 0 si otra sesión lo tiene: el comando sale con error en lugar de saltear el import.
 * Vive en la sesión de la conexión, así que si la conexión se reabre se pierde: hay que volver a
 * comprobarlo antes de abrir la transacción.
 */
final class ImportLock
{
    /** `<base>:content-import`: dos bases en el mismo servidor no se bloquean entre sí. */
    private const NAME = "concat(database(), ':content-import')";

    public function acquire(): bool
    {
        return (int) DB::scalar('select get_lock('.self::NAME.', 0)') === 1;
    }

    /** Si el candado sigue siendo de esta conexión. */
    public function stillHeld(): bool
    {
        return (int) DB::scalar('select is_used_lock('.self::NAME.') = connection_id()') === 1;
    }

    public function release(): void
    {
        DB::scalar('select release_lock('.self::NAME.')');
    }
}
```

`api/app/Content/ContentMismatch.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use RuntimeException;

/** Las tablas no dan los bytes que fijó el generador para una porción: el import no confirma. */
final class ContentMismatch extends RuntimeException
{
    public static function of(Portion $portion, string $detail): self
    {
        return new self("La porción {$portion->value} armada desde las tablas no coincide con el hash de curriculum.meta.json: {$detail}");
    }
}
```

`api/app/Content/JsonDiff.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use App\Content\Codec\FieldMap;
use stdClass;

/** La primera ruta donde dos valores JSON decodificados difieren, para explicar un ContentMismatch. */
final class JsonDiff
{
    public static function first(mixed $expected, mixed $actual, string $path): ?string
    {
        if ($expected instanceof stdClass && $actual instanceof stdClass) {
            $want = FieldMap::keysOf($expected);
            $have = FieldMap::keysOf($actual);
            if ($want !== $have) {
                return "{$path}: claves distintas o en otro orden: se esperaba [".implode(', ', $want).'] y las tablas dan ['.implode(', ', $have).']';
            }
            foreach ($want as $key) {
                $difference = self::first($expected->{$key}, $actual->{$key}, "{$path}.{$key}");
                if ($difference !== null) {
                    return $difference;
                }
            }

            return null;
        }
        if (is_array($expected) && is_array($actual)) {
            if (count($expected) !== count($actual)) {
                return "{$path}: se esperaban ".count($expected).' elementos y las tablas dan '.count($actual);
            }
            foreach ($expected as $index => $item) {
                $difference = self::first($item, $actual[$index], "{$path}[{$index}]");
                if ($difference !== null) {
                    return $difference;
                }
            }

            return null;
        }

        return $expected === $actual ? null : "{$path}: se esperaba ".self::show($expected).' y las tablas dan '.self::show($actual);
    }

    private static function show(mixed $value): string
    {
        return '«'.mb_strimwidth(is_string($value) ? $value : PublishedJson::encode($value), 0, 80, '…').'»';
    }
}
```

`api/app/Content/ContentInvariants.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/**
 * Las reglas entre filas que ninguna restricción de una tabla puede expresar (ADR 0006 D07: sólo
 * hay CHECK de una fila y sólo la clave primaria es única), comprobadas con consultas dentro de la
 * transacción del import, antes de confirmar. Cada consulta devuelve una fila si la regla se rompe.
 */
final class ContentInvariants
{
    /**
     * Las tablas con `position` y lo que agrupa a sus filas: dentro de un grupo, las activas no
     * repiten posición.
     *
     * @var array<string, list<string>>
     */
    private const POSITION_GROUPS = [
        'exercises' => ['`catalog`', 'coalesce(`domain`, `language`)'],
        'exercise_tests' => ['`exercise_id`'],
        'workshops' => ['`domain`'],
        'workshop_objectives' => ['`workshop_id`'],
        'workshop_steps' => ['`workshop_id`'],
        'worlds' => ['`language`'],
        'atlas_concepts' => ['`language`'],
        'guide_resources' => [],
        'guide_modules' => ['`track_language`'],
        'guide_steps' => ['`module_id`'],
        'guide_step_resources' => ['`step_id`'],
    ];

    /**
     * Pares hijo → padre: una fila activa no puede depender de una retirada.
     *
     * @var list<array{0: string, 1: string, 2: string}>
     */
    private const DEPENDENCIES = [
        ['exercises', 'topics', 'p.`language` = c.`language` and p.`topic_key` = c.`topic_key`'],
        ['exercises', 'catalogs', 'p.`code` = c.`catalog`'],
        ['exercises', 'workshops', 'p.`id` = c.`workshop_id`'],
        ['exercise_tests', 'exercises', 'p.`id` = c.`exercise_id`'],
        ['exercise_hints', 'exercises', 'p.`id` = c.`exercise_id`'],
        ['workshop_objectives', 'workshops', 'p.`id` = c.`workshop_id`'],
        ['workshop_steps', 'workshops', 'p.`id` = c.`workshop_id`'],
        ['workshop_related_exercises', 'workshops', 'p.`id` = c.`workshop_id`'],
        ['workshop_related_exercises', 'exercises', 'p.`id` = c.`exercise_id`'],
        ['world_exercises', 'worlds', 'p.`id` = c.`world_id`'],
        ['world_exercises', 'exercises', 'p.`id` = c.`exercise_id`'],
        ['atlas_concepts', 'exercises', 'p.`id` = c.`lab_exercise_id`'],
        ['guide_modules', 'guide_tracks', 'p.`language` = c.`track_language`'],
        ['guide_steps', 'guide_modules', 'p.`id` = c.`module_id`'],
        ['guide_step_resources', 'guide_steps', 'p.`id` = c.`step_id`'],
        ['guide_step_resources', 'guide_resources', 'p.`id` = c.`resource_id`'],
    ];

    /** @return list<string> una descripción por regla rota */
    public function violations(): array
    {
        $broken = [];
        foreach ($this->checks() as $description => $sql) {
            if (DB::selectOne($sql) !== null) {
                $broken[] = $description;
            }
        }

        return $broken;
    }

    public function assert(): void
    {
        $broken = $this->violations();
        if ($broken !== []) {
            throw new InvalidContent('Las tablas de contenido quedarían inconsistentes, así que el import no confirma: '.implode('; ', $broken).'.');
        }
    }

    /** @return array<string, string> descripción → consulta */
    private function checks(): array
    {
        $checks = [];
        foreach (self::POSITION_GROUPS as $table => $scope) {
            $group = implode(', ', [...$scope, '`position`']);
            $checks["hay filas activas de {$table} con la misma posición"] =
                "select 1 from `{$table}` where `status` = 'active' group by {$group} having count(*) > 1 limit 1";
        }
        $checks['hay filas activas de workshop_related_exercises con la misma posición en un lenguaje'] =
            "select 1 from `workshop_related_exercises` r join `exercises` e on e.`id` = r.`exercise_id` where r.`status` = 'active' group by r.`workshop_id`, e.`language`, r.`position` having count(*) > 1 limit 1";
        $checks['hay filas activas de world_exercises con la misma posición en un grupo de roles'] =
            "select 1 from `world_exercises` where `status` = 'active' group by `world_id`, (`role` = 'training'), `position` having count(*) > 1 limit 1";
        foreach (self::DEPENDENCIES as [$child, $parent, $on]) {
            $checks["hay filas activas de {$child} que dependen de {$parent} retirados"] =
                "select 1 from `{$child}` c join `{$parent}` p on {$on} where c.`status` = 'active' and p.`status` = 'deprecated' limit 1";
        }
        $checks['un mundo activo no tiene exactamente un jefe, último de sus desafíos'] =
            "select 1 from (select `world_id`, sum(`role` = 'boss') as bosses, max(case when `role` = 'boss' then `position` end) as boss_position, max(case when `role` in ('challenge', 'boss') then `position` end) as last_challenge from `world_exercises` where `status` = 'active' group by `world_id`) w where w.bosses <> 1 or w.boss_position <> w.last_challenge limit 1";
        $checks['hay mundos activos sin jefe'] =
            "select 1 from `worlds` w where w.`status` = 'active' and not exists (select 1 from `world_exercises` x where x.`world_id` = w.`id` and x.`status` = 'active' and x.`role` = 'boss') limit 1";
        $checks['la corrección vigente de un ejercicio activo no está en exercise_grading_versions'] =
            "select 1 from `exercises` e left join `exercise_grading_versions` v on v.`exercise_id` = e.`id` and v.`grading_hash` = e.`grading_hash` where e.`status` = 'active' and v.`exercise_id` is null limit 1";
        $checks['la cadena de catálogos no es única y contigua desde 1'] =
            "select 1 from (select count(*) as n, count(distinct `chain_position`) as d, min(`chain_position`) as lowest, max(`chain_position`) as highest from `catalogs` where `status` = 'active' and `chain_position` is not null) c where c.n > 0 and (c.n <> c.d or c.lowest <> 1 or c.highest <> c.n) limit 1";

        return $checks;
    }
}
```

`api/app/Content/ContentImporter.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/**
 * `content:import` (ADR 0006 D12): el documento y su meta → las tablas de contenido. Calcula la
 * diferencia fuera de la transacción y, en una sola, escribe sólo lo que cambió, comprueba las
 * reglas entre filas y se auto-chequea: arma las 17 porciones desde las tablas con el mismo código
 * que usa la API y exige el hash que fijó el generador. Eso corre en cada import, también cuando
 * no hay nada que escribir. Después de confirmar, precalienta la caché de cuerpos.
 */
final class ContentImporter
{
    public function __construct(
        private ContentRows $rows,
        private ContentStore $store,
        private ContentDiff $diff,
        private ContentWriter $writer,
        private ContentInvariants $invariants,
        private PortionRenderer $renderer,
        private BodyCache $cache,
        private ContentImports $imports,
    ) {}

    /** Lo que haría el import, sin escribir nada (`--dry-run`). */
    public function plan(ContentSource $source): ContentPlan
    {
        return $this->diff->between(
            $this->rows->fromSource($source),
            $this->store->rows(),
            $this->store->gradingVersions(),
            $this->imports->latest(),
            $source->meta,
        );
    }

    /** @throws InvalidContent|ContentMismatch si algo no cierra: la transacción se revierte entera */
    public function import(ContentSource $source, ContentPlan $plan): void
    {
        $before = $this->imports->latest();
        // Los escritores van en READ COMMITTED, por transacción (D08), y sin reintentos propios:
        // el único backoff es el del paso `migrate`, para que no se multipliquen (ADR 0006 §8).
        DB::statement('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        $bodies = DB::transaction(function () use ($source, $plan) {
            $importId = $plan->recordImport ? $this->writer->recordImport($source, $plan) : null;
            $this->writer->write($plan, $importId);
            $this->invariants->assert();

            return $this->verified($source);
        }, attempts: 1);

        $this->warm($bodies, $source, $before);
    }

    /**
     * Las 17 porciones armadas desde las tablas, cada una con el hash que dice el meta.
     *
     * @return array<string, string> cuerpos por porción
     */
    private function verified(ContentSource $source): array
    {
        $bodies = [];
        foreach (Portion::cases() as $portion) {
            $body = $this->renderer->render($portion);
            if (hash('sha256', $body) !== $source->meta['portions'][$portion->value]) {
                throw ContentMismatch::of($portion, $this->difference($source, $portion, $body));
            }
            $bodies[$portion->value] = $body;
        }

        return $bodies;
    }

    private function difference(ContentSource $source, Portion $portion, string $body): string
    {
        $path = $portion->value;

        return JsonDiff::first($source->part($portion), PublishedJson::decode($body), $path)
            ?? 'los valores coinciden pero los bytes no: revisá los escapes o el formato del generador';
    }

    /**
     * Guarda los 17 cuerpos (renueva su vida aunque no hayan cambiado) y borra los de los hashes
     * que este import reemplaza.
     *
     * @param  array<string, string>  $bodies
     */
    private function warm(array $bodies, ContentSource $source, ?LatestImport $before): void
    {
        foreach (Portion::cases() as $portion) {
            $hash = $source->meta['portions'][$portion->value];
            $this->cache->put($portion, $hash, $bodies[$portion->value]);
            $replaced = $before?->portionHashes[$portion->value];
            if ($replaced !== null && $replaced !== $hash) {
                $this->cache->forget($portion, $replaced);
            }
        }
    }
}
```

`api/app/Console/Commands/ImportContent.php` (referencia sin ejecutar)

```php
<?php

namespace App\Console\Commands;

use App\Content\ContentImporter;
use App\Content\ContentMismatch;
use App\Content\ContentPlan;
use App\Content\ContentSource;
use App\Content\ImportLock;
use App\Content\InvalidContent;
use Illuminate\Console\Command;

/**
 * Carga en MySQL el contenido que generó tools/content/ (config/content.php). Lo corre el servicio
 * migrate en cada `up`. Un candado de MySQL impide dos a la vez: si está tomado, sale con error en
 * lugar de saltear el import en silencio (ADR 0006 D12).
 */
final class ImportContent extends Command
{
    protected $signature = 'content:import {--dry-run : Muestra qué cambiaría, sin escribir nada}';

    protected $description = 'Importa curriculum.json a las tablas de contenido (ADR 0006)';

    public function handle(ContentImporter $importer, ImportLock $lock): int
    {
        if (! $lock->acquire()) {
            $this->error('Ya hay otro content:import en curso (candado de MySQL «content-import»): este no corre.');

            return self::FAILURE;
        }
        try {
            $source = ContentSource::fromDirectory(config('content.path'));
            if ($source->sourceCommit() === null) {
                $this->warn('El contenido no trae commit de origen (CONTENT_SOURCE_COMMIT): content_imports lo registra como nulo.');
            }
            $plan = $importer->plan($source);
            $hash = $source->documentHash();
            if ($this->option('dry-run')) {
                $this->info("Simulación con el contenido sha256 {$hash}: no se escribió nada.");
                $this->summary($plan);

                return self::SUCCESS;
            }
            if (! $lock->stillHeld()) {
                $this->error('Se perdió el candado de content:import (la conexión se reabrió): no se escribió nada.');

                return self::FAILURE;
            }
            $importer->import($source, $plan);
        } catch (InvalidContent|ContentMismatch $error) {
            $this->error($error->getMessage());

            return self::FAILURE;
        } finally {
            $lock->release();
        }

        if ($plan->isEmpty()) {
            $this->info("El contenido ya está importado (sha256 {$hash}): se verificaron y precalentaron las 17 porciones, sin escribir nada.");

            return self::SUCCESS;
        }
        $this->info("Importado el contenido sha256 {$hash}.");
        $this->summary($plan);

        return self::SUCCESS;
    }

    private function summary(ContentPlan $plan): void
    {
        $report = $plan->report;
        $this->line('Filas escritas: '.$this->counts($report->written));
        $this->line('Filas retiradas: '.$this->counts($report->retiredRows));
        $this->ids('Ejercicios nuevos', $report->new);
        $this->ids('Cambios de corrección', $report->gradingChanged);
        $this->ids('Cambios de texto', $report->textChanged);
        $this->ids('Retirados', $report->retired);
        $this->ids('Reactivados', $report->reactivated);
        $this->line('Filas activas: '.$this->counts($report->counts));
    }

    /** @param array<string, int> $counts */
    private function counts(array $counts): string
    {
        return $counts === [] ? 'ninguna' : collect($counts)->map(fn (int $count, string $table) => "{$table} {$count}")->implode(', ');
    }

    /** @param list<string> $ids */
    private function ids(string $label, array $ids): void
    {
        $shown = array_slice($ids, 0, 10);
        $rest = count($ids) - count($shown);
        $detail = $ids === [] ? 'ninguno' : count($ids).' ('.implode(', ', $shown).($rest > 0 ? " y {$rest} más" : '').')';
        $this->line("{$label}: {$detail}");
    }
}
```

2. Corré `npm run api:test`. **Esperado:** pasan `ImportContentTest` y `ContentContractTest` enteros, con las pruebas de A, de B y de la base.
3. Si el auto-chequeo falla con el contenido real, el mensaje nombra la porción y la primera ruta JSON que difiere: es un defecto de un códec o del ensamblador (de B). Avisá al coordinador con ese mensaje en vez de tocar los archivos de B.
4. `npm run api:format:check` en verde. Commits sugeridos, uno por unidad: `feat(api): la diferencia del import, con retiro, reactivación y versiones de corrección`, `feat(api): lectura de las tablas, snapshot y caché de cuerpos` y `feat(api): content:import incremental, atómico y con auto-chequeo`.
5. Avisá S2 al coordinador.

## 6. Agente E · Entrega (onda 2)

**Cubre:** US2 (FR-013 a FR-016, FR-022, FR-024), US3 (FR-017 a FR-021, FR-023, FR-044), el 410 de US4 (FR-015), FR-025 y FR-040. **Parte de:** S1 (la base más A y B), y de las firmas de W. **Rama:** `c2/delivery`. **Proyecto de Compose propio:** `export COMPOSE_PROJECT_NAME=taller-c2-e`.

**Archivos que posee:** `api/app/Http/ApiError.php`, `api/app/Http/Controllers/ContentController.php`, `api/app/Content/{ConditionalRequest,ContentDelivery}.php`, `api/routes/api.php` y `api/tests/Content/ContentEndpointTest.php`. No toca nada más.

**Consume:**

- De A: `Tests\Support\ContentDatabase` (`url(Portion)`, `queriesDuring`).
- De B: `Portion` (`resolve`), `InvalidPortionRequest` y `Tests\Support\ContentFixture`.
- De W: `ContentImports::latest()`, `LatestImport` (`version()`, `etag(Portion)`), `BodyCache`, `PortionRenderer` (`render`, `renderExercise`), `ContentSnapshot::read` y el comando `content:import` (la tabla de la sección 5).

**Cómo se trabaja con W.** E escribe su prueba y su implementación contra esas firmas desde el principio, pero las pruebas de entrega necesitan las clases de lectura y el import de W: hasta S2, E sólo puede correr las que no necesitan datos (`--filter="responde 503"` y `--filter="responde 422"`, y ni siquiera ésas sin las clases de W integradas). Con S2 corre el archivo entero. Por eso E es la cola de la onda 2: si el coordinador prefiere, la despacha después de S2 o se la encarga al agente W, que ya conoce las clases de lectura.

**Compuerta del agente:** `npm run api:test` completo en su worktree con W integrado, y `npm run api:format:check`, en verde; `npm run api:test:down` al terminar.

**El contrato HTTP** (todo bajo `/api`, sólo `GET`, sin sesión hasta C3 y sin throttle de Laravel):

| Recurso | Parámetro | Porción |
| --- | --- | --- |
| `GET /api/exercises?catalog=lab` o `quests` | `language`: `rust` o `go` | `lab.<language>`, `quests.<language>` |
| `GET /api/exercises?catalog=cores` | `domain`: `lowlevel`, `infra`, `play` o `pc` | `cores.<domain>` |
| `GET /api/worlds`, `GET /api/atlas` | `language` | `campaign.<language>`, `atlas.<language>` |
| `GET /api/workshops` | `domain` | `workshops.<domain>` |
| `GET /api/guide` | — | `guide` |
| `GET /api/exercises/{id}` | — | un ejercicio de una de las anteriores |

- **Cuerpo del 200:** la parte de `curriculum.json` sin envoltura `data`, con los bytes exactos del generador; `Content-Type: application/json`.
- **Cabeceras de todo 200 y 304:** `ETag: "<32 hex>"` (los primeros 32 hexadecimales de la huella de la porción, o del `content_hash` del ejercicio), `Content-Version: <32 hex>` (los primeros 32 del `document_hash` del último import) y `Cache-Control: private, no-cache`; nunca `Vary`. El validador no depende de la versión de la imagen (FR-023).
- **`If-None-Match`** coincide si trae el `ETag` vigente como validador fuerte o débil (`W/"…"`, como llega después de que Nginx comprime), en una lista, o si es `*`.
- **Errores** (cuerpo `{message, code}` y campos propios, mensajes en español, instantes en ISO 8601 UTC con `Z`):

| Estado | `code` | Cuándo | Extra |
| --- | --- | --- | --- |
| 404 | `not_found` | el ejercicio no existe, o su ID no tiene la forma `[a-z0-9][a-z0-9-]{0,63}` (en ese caso sin consultar la base) | — |
| 410 | `content_retired` | el ejercicio está retirado; se evalúa antes que el 304 | `id`, `title`, `retiredAt` |
| 422 | `validation_failed` | falta el parámetro que exige el recurso, sobra el otro, o el valor o el catálogo no es válido | `errors`: `{<parámetro>: [mensaje]}` |
| 503 | `content_not_imported` | todavía no hubo ningún import | `Retry-After: 60` |
| 503 | `maintenance` | el cuerpo armado desde las tablas no tiene el hash del último import (un `php` anterior que sigue atendiendo después de un import nuevo, o una entrada adulterada de la caché) | `Retry-After: 5`; el motivo queda en el log |

**Orden de evaluación de una porción:** (1) resolver el recurso y sus parámetros, 422 si no corresponde a ninguna de las 17; (2) leer el último `content_imports`, 503 `content_not_imported` si no hay; (3) si `If-None-Match` coincide con el `ETag` de la porción, 304 sin armar nada; (4) leer el cuerpo de la caché, verificado contra su hash; (5) si falta, armarlo en una foto consistente que empieza releyendo el último import y verificarlo contra el hash de esa fila (503 `maintenance` si no coincide; si coincide, guardarlo en la caché después de cerrar la lectura y, si el import cambió respecto del paso 2, repetir la comparación con su `ETag`). **De un ejercicio:** (1) la forma del ID, 404 sin consultar la base; (2) el último import; (3) la fila del ejercicio por clave primaria: 404 si no existe, 410 si está retirado; (4) `If-None-Match` contra su `ETag`, 304; (5) armarlo en una foto y verificarlo contra su `content_hash`; el ejercicio suelto no se guarda en la caché.

**Interfaz que entrega:**

| Clase | Qué hace | API pública |
| --- | --- | --- |
| `ConditionalRequest` (class) | — | `public static function matches(Request $request, string $etag): bool` |
| `ContentDelivery` (class) | Entrega de una porción o de un ejercicio (ADR 0006 D11). La respuesta son los bytes tal cual, sin volver a codificarlos: nunca `response()->json()` ni un JsonResource, que usarían otras flags. Un 304 no arma nada: sólo lee cuál fue el último import (y, para un ejercicio, su fila por clave primaria, porque uno retirado responde 410 antes que 304). El cuerpo sale de la caché; si falta, se arma en un snapshot y se verifica contra el hash del import antes de servirlo. | `public function __construct(private ContentImports $imports, private BodyCache $bodies, private PortionRenderer $renderer,)`<br>`public function portion(Request $request, Portion $portion): SymfonyResponse`<br>`public function exercise(Request $request, string $id): SymfonyResponse` |
| `ApiError` (class) | El cuerpo de todo error de la API: `{message, code}` más los campos propios de cada código, con el mensaje en español (ADR 0006 §8). La tabla de códigos crece con cada subplan. | `public static function response(int $status, string $code, string $message, array $extra = [], array $headers = []): JsonResponse` |
| `ContentController` (class) | Los recursos de contenido (ADR 0006 §7): una porción por pedido, validada por sus parámetros, y un ejercicio suelto. Sin sesión hasta C3, que los pone detrás de ella; sin throttle de Laravel. | `public function __construct(private ContentDelivery $delivery)`<br>`public function exercises(Request $request): Response`<br>`public function exercise(Request $request, string $id): Response`<br>`public function worlds(Request $request): Response`<br>`public function workshops(Request $request): Response`<br>`public function atlas(Request $request): Response`<br>`public function guide(Request $request): Response` |

### Tarea 6.1 · La prueba de entrega, que falla (T022)

**Archivos:** crear `api/tests/Content/ContentEndpointTest.php`.

**Qué prueba** (suite `Content`, HTTP contra MySQL real y con la caché de cuerpos en su store `database`, porque `phpunit.xml` pone `CACHE_STORE=array` sólo para el store por omisión): 503 en JSON con `Retry-After` mientras no haya import; cada una de las 17 porciones con los bytes del generador y sus cabeceras; cada uno de los 274 ejercicios con los bytes de su `contentHash`; 304 al `ETag` fuerte, al débil y a `*` sin armar nada (una sola consulta, a `content_imports`); el primer pedido después de un import sale de la caché sin consultar las tablas de contenido; con la caché vacía arma el mismo cuerpo y la vuelve a llenar, y una entrada adulterada no se sirve; 422 con un mensaje por parámetro; 404 para un ejercicio inexistente y, sin consultar la base, para un ID mal formado; 410 con los datos del ejercicio retirado, antes que un 304; tras un import cambia sólo el validador de la porción que cambió y las otras 16 siguen en 304; una imagen nueva con el mismo contenido da 304 en las 17 y la misma versión; y un cuerpo sin el hash del import da 503 `maintenance`, deja el motivo en el log y no llena la caché.

1. Copiá la prueba:

`api/tests/Content/ContentEndpointTest.php` (referencia sin ejecutar)

```php
<?php

use App\Content\BodyCache;
use App\Content\Portion;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\ContentDatabase;
use Tests\Support\ContentFixture;

// Los recursos de contenido por HTTP, contra MySQL real y con la caché de cuerpos en su store
// `database` (phpunit.xml pone CACHE_STORE=array sólo para el store por omisión).
afterEach(fn () => ContentFixture::cleanup());

function importedMeta(): array
{
    Artisan::call('content:import');

    return json_decode(file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true);
}

function etagOf(string $hash): string
{
    return '"'.substr($hash, 0, 32).'"';
}

it('responde 503 en JSON, con Retry-After, mientras no haya un import', function (string $url) {
    $this->get($url)
        ->assertStatus(503)
        ->assertHeader('Retry-After', '60')
        ->assertJson(['code' => 'content_not_imported', 'message' => 'Todavía no hay contenido importado.']);
})->with(['/api/exercises?catalog=lab&language=rust', '/api/exercises/rust-01', '/api/worlds?language=go', '/api/workshops?domain=pc', '/api/atlas?language=rust', '/api/guide']);

it('sirve cada porción con los bytes del generador y sus cabeceras (US2)', function (Portion $portion) {
    $meta = importedMeta();

    $response = $this->get(ContentDatabase::url($portion));

    $response->assertOk()->assertHeader('Content-Type', 'application/json')
        ->assertHeader('ETag', etagOf($meta['portions'][$portion->value]))
        ->assertHeader('Content-Version', substr($meta['documentHash'], 0, 32))
        ->assertHeaderMissing('Vary');
    expect(hash('sha256', $response->getContent()))->toBe($meta['portions'][$portion->value])
        ->and($response->headers->get('Cache-Control'))->toContain('private')->toContain('no-cache');
})->with(Portion::cases());

it('sirve cada ejercicio con los bytes de su contentHash', function () {
    $meta = importedMeta();

    $wrong = [];
    foreach ($meta['exercises'] as $id => $hashes) {
        $response = $this->get("/api/exercises/{$id}");
        if ($response->status() !== 200 || hash('sha256', $response->getContent()) !== $hashes['contentHash'] || $response->headers->get('ETag') !== etagOf($hashes['contentHash'])) {
            $wrong[] = $id;
        }
    }

    expect($wrong)->toBe([]);
});

it('responde 304 al ETag fuerte, al débil que deja Nginx al comprimir y a *, sin armar nada (US3)', function () {
    $meta = importedMeta();
    $url = ContentDatabase::url(Portion::LabRust);
    $etag = etagOf($meta['portions']['lab.rust']);

    foreach ([$etag, "W/{$etag}", "\"otro\", {$etag}", '*'] as $header) {
        $response = null;
        $queries = ContentDatabase::queriesDuring(function () use (&$response, $url, $header) {
            $response = $this->withHeaders(['If-None-Match' => $header])->get($url);
        });
        $response->assertStatus(304)->assertHeader('ETag', $etag)->assertHeader('Content-Version', substr($meta['documentHash'], 0, 32));
        expect($response->getContent())->toBe('')
            // Un 304 sólo consulta cuál fue el último import.
            ->and($queries)->toHaveCount(1)->and($queries[0])->toContain('content_imports');
    }
    $this->withHeaders(['If-None-Match' => '"otro"'])->get($url)->assertOk();
});

it('el primer pedido después de un import sale de la caché: no consulta las tablas de contenido', function () {
    importedMeta();

    $queries = ContentDatabase::queriesDuring(fn () => $this->get(ContentDatabase::url(Portion::CoresInfra))->assertOk());

    expect(array_filter($queries, fn (string $sql) => preg_match('/from `(exercises|exercise_tests|exercise_hints|topics)`/', $sql) === 1))->toBe([]);
});

it('con la caché vacía arma el mismo cuerpo y la vuelve a llenar; una entrada adulterada no se sirve', function () {
    $meta = importedMeta();
    $portion = Portion::AtlasGo;
    $hash = $meta['portions']['atlas.go'];
    $url = ContentDatabase::url($portion);

    DB::table('cache')->delete();
    $cold = $this->get($url);
    expect(hash('sha256', $cold->getContent()))->toBe($hash)->and(app(BodyCache::class)->has($portion, $hash))->toBeTrue();

    DB::table('cache')->where('key', 'like', "%content-body:atlas.go:{$hash}")->update(['value' => serialize('{"adulterado":true}')]);
    $tampered = $this->get($url);

    expect(hash('sha256', $tampered->getContent()))->toBe($hash);
});

it('responde 422 con un mensaje por parámetro cuando falta o sobra uno (FR-016)', function (string $url, array $parameters) {
    $response = $this->get($url)->assertStatus(422)->assertJson(['code' => 'validation_failed']);

    expect(array_keys($response->json('errors')))->toBe($parameters);
})->with([
    'sin catálogo' => ['/api/exercises', ['catalog']],
    'lab sin lenguaje' => ['/api/exercises?catalog=lab', ['language']],
    'cores con lenguaje' => ['/api/exercises?catalog=cores&language=rust', ['language', 'domain']],
    'lenguaje desconocido' => ['/api/worlds?language=cobol', ['language']],
    'talleres con lenguaje' => ['/api/workshops?domain=pc&language=rust', ['language']],
]);

it('responde 404 a un ejercicio que no existe, y a un ID mal formado sin consultar la base', function () {
    importedMeta();

    $this->get('/api/exercises/rust-999')->assertNotFound()->assertJson(['code' => 'not_found']);
    $malformed = [];
    foreach (['RUST-01', 'rust 01', str_repeat('a', 65), '-rust', "rust-01\n"] as $id) {
        $queries = ContentDatabase::queriesDuring(fn () => $this->get('/api/exercises/'.rawurlencode($id))->assertNotFound());
        if ($queries !== []) {
            $malformed[] = $id;
        }
    }
    expect($malformed)->toBe([]);
});

it('responde 410 con los datos del ejercicio retirado, antes que un 304 (US4)', function () {
    $meta = importedMeta();
    $fixture = ContentFixture::fromImage();
    $gone = $fixture->unreferencedLabExercise();
    $title = $fixture->exercise($gone)->title;
    config(['content.path' => $fixture->withoutExercise($gone)->write()]);
    Artisan::call('content:import');

    $response = $this->withHeaders(['If-None-Match' => etagOf($meta['exercises'][$gone]['contentHash'])])->get("/api/exercises/{$gone}");

    $response->assertStatus(410)->assertJson(['code' => 'content_retired', 'id' => $gone, 'title' => $title]);
    expect(array_keys($response->json()))->toBe(['message', 'code', 'id', 'title', 'retiredAt'])
        ->and($response->json('retiredAt'))->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/');
});

it('después de un import cambia el validador de la porción que cambió y las otras 16 siguen en 304 (US3)', function () {
    $meta = importedMeta();
    $validators = [];
    foreach (Portion::cases() as $portion) {
        $validators[$portion->value] = $this->get(ContentDatabase::url($portion))->headers->get('ETag');
    }
    $fixture = ContentFixture::fromImage();
    $fixture->exercise($fixture->document->lab->rust[3]->id)->intro .= ' (revisado)';
    config(['content.path' => $fixture->write()]);
    Artisan::call('content:import');

    $statuses = [];
    foreach (Portion::cases() as $portion) {
        $statuses[$portion->value] = $this->withHeaders(['If-None-Match' => $validators[$portion->value]])->get(ContentDatabase::url($portion))->status();
    }

    expect(array_keys(array_filter($statuses, fn (int $status) => $status === 200)))->toBe(['lab.rust'])
        ->and(count(array_filter($statuses, fn (int $status) => $status === 304)))->toBe(16);
});

it('una imagen nueva con el mismo contenido da 304 en las 17 porciones y la misma versión (US3)', function () {
    importedMeta();
    $validators = [];
    $version = null;
    foreach (Portion::cases() as $portion) {
        $response = $this->get(ContentDatabase::url($portion));
        $validators[$portion->value] = $response->headers->get('ETag');
        $version = $response->headers->get('Content-Version');
    }
    // Otro build de la API trae el mismo contenido, con otro commit de origen.
    config(['content.path' => ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => str_repeat('e', 40)] + $meta)]);
    Artisan::call('content:import');

    $statuses = [];
    foreach (Portion::cases() as $portion) {
        $response = $this->withHeaders(['If-None-Match' => $validators[$portion->value]])->get(ContentDatabase::url($portion));
        $statuses[] = [$response->status(), $response->headers->get('Content-Version')];
    }

    expect(array_unique($statuses, SORT_REGULAR))->toBe([[304, $version]]);
});

it('si el cuerpo armado no tiene el hash del import, no lo sirve: 503 maintenance, y lo deja en el log', function () {
    importedMeta();
    DB::table('cache')->delete();
    // Un php viejo que sigue atendiendo después del COMMIT de un import nuevo: el registro dice otro hash.
    $hashes = json_decode(DB::table('content_imports')->value('portion_hashes'), true);
    $hashes['guide'] = str_repeat('a', 64);
    DB::table('content_imports')->update(['portion_hashes' => json_encode($hashes)]);
    Log::spy();

    $this->get('/api/guide')->assertStatus(503)->assertHeader('Retry-After', '5')->assertJson(['code' => 'maintenance']);

    Log::shouldHaveReceived('error')->once();
    expect(DB::table('cache')->where('key', 'like', '%content-body:guide:%')->count())->toBe(0);
});
```

2. Corré `npm run api:test -- --filter="responde 503"`. **Esperado:** fallan con `Expected response status code [503] but received 404`, porque las rutas todavía no existen.

### Tarea 6.2 · El controlador y el servicio de entrega (T023)

**Archivos:** crear `api/app/Http/ApiError.php`, `api/app/Http/Controllers/ContentController.php`, `api/app/Content/ConditionalRequest.php` y `api/app/Content/ContentDelivery.php`; modificar `api/routes/api.php`.

**Qué hace:** `ContentController` resuelve el recurso con `Portion::resolve` (422 con `errors` si no corresponde) y delega en `ContentDelivery`, que sigue el orden de evaluación de arriba. La respuesta son los bytes tal cual, en un `Response`, sin volver a codificarlos: nunca `response()->json()` ni un `JsonResource`, que usarían otras banderas. `ApiError` da el cuerpo `{message, code, …}` de todo error. Las rutas van sin sesión (C3 las protege) y sin throttle de Laravel.

1. Implementá (`api/routes/api.php` ya existe: conserva su comentario inicial y suma las rutas):

`api/app/Http/ApiError.php` (referencia sin ejecutar)

```php
<?php

namespace App\Http;

use Illuminate\Http\JsonResponse;

/**
 * El cuerpo de todo error de la API: `{message, code}` más los campos propios de cada código, con
 * el mensaje en español (ADR 0006 §8). La tabla de códigos crece con cada subplan.
 */
final class ApiError
{
    /**
     * @param  array<string, mixed>  $extra  campos que siguen a message y code
     * @param  array<string, string>  $headers
     */
    public static function response(int $status, string $code, string $message, array $extra = [], array $headers = []): JsonResponse
    {
        return response()->json(['message' => $message, 'code' => $code] + $extra, $status, $headers);
    }
}
```

`api/app/Content/ConditionalRequest.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use Illuminate\Http\Request;

/** `If-None-Match` contra el ETag actual, con comparación débil (RFC 9110 §13.1.2). */
final class ConditionalRequest
{
    /**
     * Nginx debilita el ETag al comprimir (`W/"…"`) y el navegador lo reenvía así: el prefijo `W/`
     * no cuenta. `*` coincide con cualquier representación que exista.
     */
    public static function matches(Request $request, string $etag): bool
    {
        $header = $request->headers->get('If-None-Match');
        if ($header === null) {
            return false;
        }
        if (trim($header) === '*') {
            return true;
        }
        foreach (explode(',', $header) as $candidate) {
            $candidate = trim($candidate);
            if (str_starts_with($candidate, 'W/')) {
                $candidate = substr($candidate, 2);
            }
            if ($candidate === $etag) {
                return true;
            }
        }

        return false;
    }
}
```

`api/app/Content/ContentDelivery.php` (referencia sin ejecutar)

```php
<?php

namespace App\Content;

use App\Http\ApiError;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Entrega de una porción o de un ejercicio (ADR 0006 D11). La respuesta son los bytes tal cual, sin
 * volver a codificarlos: nunca `response()->json()` ni un JsonResource, que usarían otras flags. Un
 * 304 no arma nada: sólo lee cuál fue el último import (y, para un ejercicio, su fila por clave
 * primaria, porque uno retirado responde 410 antes que 304). El cuerpo sale de la caché; si falta,
 * se arma en un snapshot y se verifica contra el hash del import antes de servirlo.
 */
final class ContentDelivery
{
    public function __construct(
        private ContentImports $imports,
        private BodyCache $bodies,
        private PortionRenderer $renderer,
    ) {}

    public function portion(Request $request, Portion $portion): SymfonyResponse
    {
        $latest = $this->imports->latest();
        if ($latest === null) {
            return $this->notImported();
        }
        if (ConditionalRequest::matches($request, $latest->etag($portion))) {
            return $this->notModified($latest, $latest->etag($portion));
        }

        $hash = $latest->portionHashes[$portion->value];
        $body = $this->bodies->get($portion, $hash);
        if ($body === null) {
            // El snapshot relee el último import: si hubo uno en el medio, todo sale de ése.
            [$latest, $body] = ContentSnapshot::read(function () use ($portion) {
                $latest = $this->imports->latest();

                return [$latest, $latest === null ? null : $this->renderer->render($portion)];
            });
            if ($latest === null) {
                return $this->notImported();
            }
            $hash = $latest->portionHashes[$portion->value];
            if ($body === null || hash('sha256', $body) !== $hash) {
                return $this->maintenance("la porción {$portion->value} armada desde las tablas no tiene el hash del import {$latest->id}");
            }
            $this->bodies->put($portion, $hash, $body);
            if (ConditionalRequest::matches($request, $latest->etag($portion))) {
                return $this->notModified($latest, $latest->etag($portion));
            }
        }

        return $this->ok($body, $latest, $latest->etag($portion));
    }

    public function exercise(Request $request, string $id): SymfonyResponse
    {
        // Un ID con otra forma no puede existir: 404 sin consultar la base.
        if (preg_match('/\A[a-z0-9][a-z0-9-]{0,63}\z/', $id) !== 1) {
            return $this->notFound();
        }
        $latest = $this->imports->latest();
        if ($latest === null) {
            return $this->notImported();
        }
        $row = DB::table('exercises')->where('id', $id)->first(['status', 'title', 'retired_at', 'content_hash']);
        if ($row === null) {
            return $this->notFound();
        }
        if ($row->status !== 'active') {
            return $this->retired($id, $row->title, $row->retired_at);
        }
        $etag = '"'.substr($row->content_hash, 0, 32).'"';
        if (ConditionalRequest::matches($request, $etag)) {
            return $this->notModified($latest, $etag);
        }

        // El ejercicio no se cachea: se arma en un snapshot y se verifica contra su content_hash.
        [$latest, $row, $body] = ContentSnapshot::read(function () use ($id) {
            $latest = $this->imports->latest();
            $row = DB::table('exercises')->where('id', $id)->first(['status', 'title', 'retired_at', 'content_hash']);

            return [$latest, $row, $row?->status === 'active' ? $this->renderer->renderExercise($id) : null];
        });
        if ($latest === null) {
            return $this->notImported();
        }
        if ($row === null) {
            return $this->notFound();
        }
        if ($row->status !== 'active') {
            return $this->retired($id, $row->title, $row->retired_at);
        }
        if ($body === null || hash('sha256', $body) !== $row->content_hash) {
            return $this->maintenance("el ejercicio {$id} armado desde las tablas no tiene su content_hash");
        }

        return $this->ok($body, $latest, '"'.substr($row->content_hash, 0, 32).'"');
    }

    private function ok(string $body, LatestImport $latest, string $etag): Response
    {
        return new Response($body, 200, $this->headers($latest, $etag) + ['Content-Type' => 'application/json']);
    }

    private function notModified(LatestImport $latest, string $etag): Response
    {
        return new Response('', 304, $this->headers($latest, $etag));
    }

    /** @return array<string, string> */
    private function headers(LatestImport $latest, string $etag): array
    {
        return ['ETag' => $etag, 'Content-Version' => $latest->version(), 'Cache-Control' => 'private, no-cache'];
    }

    private function notFound(): SymfonyResponse
    {
        return ApiError::response(404, 'not_found', 'No existe ese ejercicio.');
    }

    private function retired(string $id, string $title, string $retiredAt): SymfonyResponse
    {
        return ApiError::response(410, 'content_retired', 'Ese ejercicio se retiró del currículo.', [
            'id' => $id,
            'title' => $title,
            'retiredAt' => Carbon::parse($retiredAt, 'UTC')->format('Y-m-d\TH:i:s.v\Z'),
        ]);
    }

    private function notImported(): SymfonyResponse
    {
        return ApiError::response(503, 'content_not_imported', 'Todavía no hay contenido importado.', headers: ['Retry-After' => '60']);
    }

    /** Un pedido que cayó entre un deploy y su caché: se deja en el log y se pide reintentar. */
    private function maintenance(string $detail): SymfonyResponse
    {
        Log::error("Contenido no servido: {$detail}.");

        return ApiError::response(503, 'maintenance', 'El contenido se está actualizando: reintentá en unos segundos.', headers: ['Retry-After' => '5']);
    }
}
```

`api/app/Http/Controllers/ContentController.php` (referencia sin ejecutar)

```php
<?php

namespace App\Http\Controllers;

use App\Content\ContentDelivery;
use App\Content\InvalidPortionRequest;
use App\Content\Portion;
use App\Http\ApiError;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Los recursos de contenido (ADR 0006 §7): una porción por pedido, validada por sus parámetros, y
 * un ejercicio suelto. Sin sesión hasta C3, que los pone detrás de ella; sin throttle de Laravel.
 */
final class ContentController
{
    public function __construct(private ContentDelivery $delivery) {}

    public function exercises(Request $request): Response
    {
        return $this->portion($request, 'exercises');
    }

    public function exercise(Request $request, string $id): Response
    {
        return $this->delivery->exercise($request, $id);
    }

    public function worlds(Request $request): Response
    {
        return $this->portion($request, 'worlds');
    }

    public function workshops(Request $request): Response
    {
        return $this->portion($request, 'workshops');
    }

    public function atlas(Request $request): Response
    {
        return $this->portion($request, 'atlas');
    }

    public function guide(Request $request): Response
    {
        return $this->portion($request, 'guide');
    }

    private function portion(Request $request, string $resource): Response
    {
        try {
            $portion = Portion::resolve($resource, $request->query());
        } catch (InvalidPortionRequest $error) {
            return ApiError::response(422, 'validation_failed', $error->getMessage(), ['errors' => $error->errors]);
        }

        return $this->delivery->portion($request, $portion);
    }
}
```

`api/routes/api.php` (referencia sin ejecutar)

```php
<?php

use App\Http\Controllers\ContentController;
use Illuminate\Support\Facades\Route;

// Rutas de la API del taller. bootstrap/app.php les antepone /api y el grupo de middleware
// `api`. El health check /api/up lo registra el framework, no este archivo.

// Contenido (C2, ADR 0006 §7): una porción por recurso, con ETag y 304. Sin sesión hasta C3: el
// puerto sólo escucha en 127.0.0.1, y C3 pone estas rutas detrás de ella. Sin throttle de Laravel.
Route::get('/exercises', [ContentController::class, 'exercises']);
Route::get('/exercises/{id}', [ContentController::class, 'exercise']);
Route::get('/worlds', [ContentController::class, 'worlds']);
Route::get('/workshops', [ContentController::class, 'workshops']);
Route::get('/atlas', [ContentController::class, 'atlas']);
Route::get('/guide', [ContentController::class, 'guide']);
```

2. Corré `npm run api:test -- --filter="responde 503"` y `--filter="responde 422"`. **Esperado:** pasan. Con W integrado (S2), corré `npm run api:test -- --testsuite=Content`. **Esperado:** pasa `ContentEndpointTest` entero, con las pruebas de A y de W.
3. Revisá que ningún `if` de `ContentDelivery` quede sin una prueba que lo ejerza (el 410 antes del 304, el cuerpo de la caché verificado, el 503 `maintenance`) y `npm run api:format:check`. Commit sugerido: `feat(api): 17 recursos de contenido con ETag por porción, 304 y verificación del cuerpo`.

## 7. Integración y cierre (coordinador, onda 3)

**Cubre:** FR-033 (el servicio `migrate` corre el import), FR-034 y FR-035 (la configuración que acota la espera de `migrate`), FR-043, FR-046 y FR-047 al correrlos contra el stack real, y la documentación que cambian las tareas. **Responsable:** el coordinador, que integra los archivos compartidos (`compose.yaml`, `api/Dockerfile`, `package.json`, la documentación) según AGENTS.md.

**Cómo se integra.** Las ramas de A, B y C son de archivos disjuntos y se integran en cualquier orden sobre la base; después W (con A y B) y por último E (con W). Después de cada integración: `npm run api:test` completo, `npm run api:format:check` y `git diff --check`. Si algo falla, el defecto es del agente cuyos archivos aparecen en el mensaje; el coordinador no lo parchea en la integración. Los puntos S1 y S2 de «Reparto en paralelo» son los dos momentos en que se avisa a los agentes de la onda 2.

### Tarea 7.1 · El servicio `migrate` corre el import (T024)

**Archivos:** modificar `compose.yaml` y `api/Dockerfile`. Necesita `api/docker/migrate.sh` (de C) integrado.

**Qué hace:** el servicio `migrate` es el único con la espera de bloqueos acotada (`MYSQL_ATTR_INIT_COMMAND` fija `lock_wait_timeout=5` e `innodb_lock_wait_timeout=5` sólo en su entorno; `php` conserva los valores por omisión) y corre `migrate-and-import`, el script de C copiado a `/usr/local/bin`. `php` sigue dependiendo de `migrate` con `service_completed_successfully`: si falla, `php` no arranca ni se recrea (FR-034).

Cambio en `api/Dockerfile` (referencia sin ejecutar):

```diff
--- a/api/Dockerfile
+++ b/api/Dockerfile
@@ -49,6 +49,8 @@
 COPY docker/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
 COPY docker/fpm-pool.conf /usr/local/etc/php-fpm.d/zz-taller.conf
 COPY docker/php.ini /usr/local/etc/php/conf.d/zz-taller.ini
+# El paso `migrate` del despliegue: migraciones e import de contenido, con un solo backoff.
+COPY --chmod=0755 docker/migrate.sh /usr/local/bin/migrate-and-import
 WORKDIR /var/www/html

 # Producción: el código es de root y PHP sólo lo lee. storage/ y bootstrap/cache/ son de
```

Cambio en `compose.yaml` (referencia sin ejecutar):

```diff
--- a/compose.yaml
+++ b/compose.yaml
@@ -115,11 +115,18 @@
       start_interval: 1s
     restart: unless-stopped

-  # Aplica las migraciones pendientes y termina; corre en cada `up`. php espera a que termine
-  # bien (service_completed_successfully), y por esa dependencia `up --wait` acepta que salga.
+  # Aplica las migraciones pendientes, importa el contenido de la imagen y termina; corre en cada
+  # `up`. Es el único servicio con la espera de bloqueos acotada: cada intento espera 5 s como
+  # mucho (ADR 0006 D35) y migrate-and-import (api/docker/migrate.sh) reintenta sólo ante una espera
+  # vencida o un interbloqueo. Si falla, php no arranca (service_completed_successfully): un
+  # contenido inválido no sale, y el php anterior sigue atendiendo. Por esa dependencia
+  # `up --wait` acepta que este servicio salga.
   migrate:
     <<: *laravel-runtime
-    command: ['php', 'artisan', 'migrate', '--force']
+    environment:
+      <<: *laravel-env
+      MYSQL_ATTR_INIT_COMMAND: 'SET SESSION lock_wait_timeout=5, innodb_lock_wait_timeout=5'
+    command: ['migrate-and-import']
     depends_on:
       mysql:
         condition: service_healthy
```

1. Aplicá los dos cambios y corré `docker compose config --quiet`. **Esperado:** sin salida.
2. `docker compose up --build -d --wait`. **Esperado:** el stack queda sano. `docker compose logs migrate` muestra las migraciones aplicadas y `Importado el contenido sha256 …` con las filas escritas por tabla.
3. `docker compose up -d --wait` otra vez. **Esperado:** `docker compose logs migrate` termina con `El contenido ya está importado (sha256 …): se verificaron y precalentaron las 17 porciones, sin escribir nada` (FR-002, SC-002 en la práctica).
4. `npm run api:smoke`. **Esperado:** todo `ok`.
5. Commit sugerido: `feat(api): el servicio migrate importa el contenido, con espera de bloqueos acotada`.

### Tarea 7.2 · El script `api:content:check` (T025)

**Archivos:** modificar `package.json`. Necesita `qa/api-content-check.ts` (de C) y el stack de T024.

Cambio en `package.json` (texto revisado):

```diff
--- a/package.json
+++ b/package.json
@@ -25,7 +25,8 @@
     "api:test": "docker compose --profile test run --rm --build test",
     "api:test:down": "docker compose --profile test rm --stop --force mysql-test",
     "api:format:check": "docker compose --profile test run --rm --build --no-deps --entrypoint php test vendor/bin/pint --test",
-    "api:smoke": "sh api/scripts/smoke.sh"
+    "api:smoke": "sh api/scripts/smoke.sh",
+    "api:content:check": "node qa/api-content-check.ts"
   },
   "dependencies": {
     "@codemirror/autocomplete": "6.20.3",
```

1. Aplicá el cambio y corré `npm run api:content:check` con el stack levantado. **Esperado:** `api-content-check: 17 porciones idénticas a las del generador (con y sin gzip, con 304 fuerte y débil) y 40 clientes lentos con su cuerpo completo. PASS.` (FR-047).
2. Si falla una aserción, el mensaje nombra la porción y la causa: sin gzip, con gzip, 304 débil o el log de Nginx. Un 304 que no llega con `W/"…"` es un defecto de `ConditionalRequest` (de E).

### Tarea 7.3 · Documentación (T026)

**Archivos:** modificar `README.md`, `qa/AGENTS.md`, `docs/architecture.md`, `api/AGENTS.md` y `api/scripts/smoke.sh` (sólo su encabezado).

**Qué dicen:** el `README` explica que la imagen de la API genera su propio documento y que el servicio de migraciones lo importa, cómo registrar el commit del contenido, qué es el meta y qué son las claves de etapa, y suma `npm run api:content:check`; `qa/AGENTS.md` suma el check del meta y el de punta a punta a la tabla de checks; `docs/architecture.md` suma la fila del contenido en MySQL; `api/AGENTS.md` suma las reglas de `app/Content/` (bytes exactos, nunca `JsonResource`; el único backoff; DDL a mano) y las tres suites; `smoke.sh` remite a `api:content:check`.

Cambio en `README.md` (texto revisado):

````diff
--- a/README.md
+++ b/README.md
@@ -18,7 +18,7 @@
 docker compose up --build -d --wait
 ```

-Abrí **http://localhost:8080/#sistemas**. También podés entrar por `#campana`, `#laboratorio` o `#atlas`. Compose construye la web, el editor, las animaciones y el generador de kits ZIP con Node en una etapa de construcción, y los sirve con Nginx dentro del contenedor. También levanta la API Laravel (PHP-FPM), MySQL y un servicio que aplica las migraciones y termina. Nginx pasa `/api/` a la API en el mismo origen, y **http://localhost:8080/api/up** responde si arrancó. En la PC anfitriona sólo necesitás Docker y Compose: no hace falta instalar Python, Node, PHP ni un servidor web. La primera construcción descarga las imágenes y las dependencias. Las siguientes aprovechan la caché.
+Abrí **http://localhost:8080/#sistemas**. También podés entrar por `#campana`, `#laboratorio` o `#atlas`. Compose construye la web, el editor, las animaciones y el generador de kits ZIP con Node en una etapa de construcción, y los sirve con Nginx dentro del contenedor. También levanta la API Laravel (PHP-FPM), MySQL y un servicio que aplica las migraciones, importa el contenido del currículo a la base y termina; si falla, PHP no arranca y el que ya estaba sigue sirviendo. Nginx pasa `/api/` a la API en el mismo origen, y **http://localhost:8080/api/up** responde si arrancó. En la PC anfitriona sólo necesitás Docker y Compose: no hace falta instalar Python, Node, PHP ni un servidor web. La primera construcción descarga las imágenes y las dependencias, también las de Node de la etapa que genera el contenido de la API. Las siguientes aprovechan la caché.

 Para detenerlo:

@@ -30,6 +30,8 @@

 Para usar otro puerto, agregá `TALLER_PORT=8090` al `.env` y ejecutá el mismo comando. El puerto se publica solo en tu equipo (127.0.0.1); MySQL (3306) y PHP-FPM (9000) no se publican. Compose crea redes propias: `edge`, la única con salida, para Nginx; `web`, interna, entre Nginx y PHP; `app`, interna, entre PHP y MySQL (Nginx no llega a MySQL), y `testing`, interna, para `npm run api:test`. Las imágenes base están fijadas por digest para reproducir esta entrega.

+La imagen de la API genera su propio `curriculum.json` y `curriculum.meta.json` con el mismo generador que usa el front, y el servicio de migraciones los importa. Para que la base registre el commit del contenido, pasalo al construir: `CONTENT_SOURCE_COMMIT=$(git rev-parse HEAD) docker compose up --build -d --wait`; sin él queda nulo y el import lo avisa.
+
 ## Aprender en el taller

 1. Elegí Rust o Go. En **Campaña** seguís mundos con requisitos; en **Laboratorio** podés explorar Inicial, Intermedio, Avanzado y Experto libremente.
@@ -188,6 +190,10 @@

 El currículo se edita en `content/`; `build/curriculum.json` es una salida generada que no se versiona.

+El generador también escribe `build/curriculum.meta.json`, que acompaña al documento: la huella de cada una de las 17 porciones que sirve la API y de cada ejercicio, las claves de las etapas de taller y el commit de origen. Es lo único que `content:import` y la API toman como verdad de esas huellas; no se edita ni se versiona.
+
+Cada etapa de `content/workshops/<id>.yaml` lleva una clave estable `id: e<N>` y, si ya existía en la versión 1, su `v1Index`. Las claves no se renumeran ni se reutilizan, y todavía no se publican: `qa/fixtures/workshop-steps-v1.json` es el contrato de las 100 etapas actuales. Una etapa nueva lleva la clave siguiente y no lleva `v1Index`.
+
 ```
 content/<rust|go>/manifest.yaml      etapas en orden (recorrido, desafíos y núcleos) y sus valores por defecto
 content/<rust|go>/exercises/<id>/    exercise.yaml, starter.<rs|go> y solution.<rs|go>
@@ -249,6 +255,7 @@
 npm run api:test:down     # apaga esa base de prueba
 npm run api:format:check  # formato PHP con Pint
 npm run api:smoke         # con el stack levantado: Nginx, PHP-FPM y Laravel
+npm run api:content:check # con el stack levantado: las 17 porciones del contenido a través de Nginx
 ```

 ## Fuentes y atribución
````

Cambio en `qa/AGENTS.md` (texto revisado):

```diff
--- a/qa/AGENTS.md
+++ b/qa/AGENTS.md
@@ -59,8 +59,8 @@
 | Empaquetado, assets u orden de carga | `npm run build`; `node qa/build-check.ts`, `node qa/load-order-check.ts` |
 | Arranque, adaptadores `window.Taller*` o navegación por vistas | `node qa/boot-check.ts` |
 | IDs de ejercicios, mundos, talleres o conceptos | `node qa/curriculum-ids-check.ts` |
-| Contenido en `content/` | `npm run curriculum` y, entre los checks que leen el currículo real, `content-check`, `campaign-content-check`, `guide-content-check`, `atlas-check`, `curriculum-ids-check`, `systems-check` y el `systems-<dominio>-check` que corresponda (`node qa/<nombre>.ts`); `npm test` los corre todos; si ningún catálogo debe cambiar, `npm run curriculum && node tools/content/dump-globals.ts .` da los mismos bytes antes y después |
-| Generador en `tools/content/` | El `node qa/content-*-check.ts` del módulo tocado (usan fixtures temporales y no leen `content/`) y el oráculo de la fila anterior |
+| Contenido en `content/` | `npm run curriculum` y, entre los checks que leen el currículo real, `content-check`, `campaign-content-check`, `guide-content-check`, `atlas-check`, `curriculum-meta-check`, `curriculum-ids-check`, `systems-check` y el `systems-<dominio>-check` que corresponda (`node qa/<nombre>.ts`); `npm test` los corre todos; si ningún catálogo debe cambiar, `npm run curriculum && node tools/content/dump-globals.ts .` da los mismos bytes antes y después |
+| Generador en `tools/content/` | El `node qa/content-*-check.ts` del módulo tocado (usan fixtures temporales y no leen `content/`), `node qa/curriculum-meta-check.ts` si toca el meta (`build/curriculum.meta.json`) y el oráculo de la fila anterior |
 | Ejercicios o contratos de revisión | `node qa/content-check.ts`, `node qa/runner-check.ts` |
 | Recorrido, biblioteca o respaldo global | `node qa/guide-content-check.ts`, `node qa/app-shell-check.ts` |
 | Lectura, respaldo o avisos de carga del progreso | `node qa/versioned-storage-check.ts` y el check del almacén afectado |
@@ -74,7 +74,7 @@
 | Modelo lowlevel, infra, play o pc | El correspondiente `node qa/systems-<dominio>-check.ts` |
 | Generación de proyectos o ZIP | `node qa/project-kit-check.ts` |
 | Ejecutor Go (`executor/`) | `npm run test:executor`; con Docker real, `npm run test:executor:integration` (no forman parte de `npm test`) |
-| API Laravel (`api/`) | `npm run api:test` y `npm run api:format:check`; con el stack levantado, `npm run api:smoke` (no forman parte de `npm test`) |
+| API Laravel (`api/`) | `npm run api:test` y `npm run api:format:check`; con el stack levantado, `npm run api:smoke` y `npm run api:content:check` (las 17 porciones a través de Nginx; no forman parte de `npm test`) |
 | Sólo documentación | Verificar rutas, comandos y enlaces locales; `git diff --check` |

 Para una reorganización de archivos o un cambio transversal, regenerá la página
```

Cambio en `docs/architecture.md` (texto revisado):

```diff
--- a/docs/architecture.md
+++ b/docs/architecture.md
@@ -16,6 +16,7 @@
 | Navegación, recorrido y progreso general | `app.js`, `styles.css` |
 | Contenido del recorrido y biblioteca | `content/guide/`; tipos y progreso en `src/entities/guide/` |
 | Catálogos de contenido (publicados en `window.*`) | `content/` → `tools/content/` → `build/curriculum.json`; adaptador `src/app/legacy/register-catalogs.ts` |
+| Contenido en MySQL (ADR 0006, C2) | `tools/content/` también escribe `build/curriculum.meta.json` (huellas y claves de etapa) → etapa `curriculum` de `api/Dockerfile` → `content:import` y `api/app/Content/` → 17 recursos de sólo lectura (`GET /api/exercises`, `worlds`, `workshops`, `atlas` y `guide`); los bytes de cada porción los fija el generador, nunca `JsonResource` |
 | Ejercicios del recorrido y tipo `Exercise` | sección `lab` de `content/{rust,go}/manifest.yaml` y `content/{rust,go}/exercises/<id>/`; `src/entities/exercise/model/types.ts` |
 | Laboratorio, revisión y modelos educativos | `lab.js`, `lab-explorers.js`, `lab.css` |
 | Transporte a los Playgrounds oficiales | `src/shared/api/playground/`, adaptador `src/app/legacy/register-runner.ts` |
```

Cambio en `api/AGENTS.md` (texto revisado):

```diff
--- a/api/AGENTS.md
+++ b/api/AGENTS.md
@@ -26,6 +26,10 @@
   - Los textos usan la colación de la conexión, `utf8mb4_es_0900_ai_ci`.
   - Los IDs de contenido van en `ascii_bin`, por columna, en cada migración.
   - Sin SQLite, ni en pruebas.
+- **Contenido (C2):**
+  - `app/Content/` arma las 17 porciones desde las tablas con los bytes que fija el generador (`PublishedJson`): la respuesta es ese texto, nunca `response()->json()` ni un `JsonResource`. Las huellas las calcula sólo `tools/content`; PHP las guarda y las compara.
+  - `content:import` corre en el servicio `migrate` (`docker/migrate.sh`, el único backoff), toma el candado `GET_LOCK` y se auto-chequea en cada corrida.
+  - Las tablas se escriben a mano en un único `CREATE TABLE` por migración, con el DDL de `specs/001-c2-contenido-mysql/data-model.md`.
 - **Pruebas:**
   - `RefreshDatabase` es el default (`tests/Pest.php`). `DatabaseTruncation` queda para el
     código que hace `TRUNCATE` o abre sus propias transacciones.
@@ -34,5 +38,7 @@
   - `tests/TestCase.php` corta antes de tocar una base que no sea `mysql-test`/`taller_test*`,
     con la conexión efectiva (DB_URL, socket y hosts de lectura o escritura incluidos) y antes de las bases de cada proceso
     en paralelo.
+  - Tres suites: `tests/Unit` (PHP puro, sin aplicación), `tests/Feature` (`RefreshDatabase`) y `tests/Content`
+    (`DatabaseTruncation`: el import, HTTP y el DDL confirman sus propias transacciones).
 - **Contenedores:** `php` y `migrate` corren como `www-data` y con disco de sólo lectura. Lo
   que necesite escribir va a un tmpfs declarado en `compose.yaml`.
```

Cambio en `api/scripts/smoke.sh` (texto revisado):

```diff
--- a/api/scripts/smoke.sh
+++ b/api/scripts/smoke.sh
@@ -1,6 +1,7 @@
 #!/bin/sh
 # Prueba de humo del stack de compose.yaml, por Nginx como lo usa el navegador: Nginx, PHP-FPM y
-# Laravel, con el contenedor php de sólo lectura. MySQL no: ninguna ruta de C1 usa la base.
+# Laravel, con el contenedor php de sólo lectura. El contenido y la base los cubre
+# `npm run api:content:check`.
 # Requiere el stack levantado con `docker compose up --build -d --wait`. Uso, desde la raíz:
 # sh api/scripts/smoke.sh.
 set -u
```

1. Aplicá los cambios y revisá rutas, comandos y enlaces locales de lo que tocaste. `git diff --check`.
2. Commit sugerido: `docs(api): contenido en MySQL, meta del generador y checks de punta a punta`.

### Tarea 7.4 · La medición del tmpfs de Nginx (T027)

**Archivos:** modificar `compose.yaml` (un comentario y, sólo si la medición lo exige, `size` del tmpfs y `mem_limit` de `taller`). Necesita T018 (el check) y T024 (el stack).

**Qué se mide:** Nginx desborda las respuestas grandes de FastCGI a `/tmp/fastcgi_temp`, un tmpfs de 32 MB que cuenta contra el `mem_limit: 128m` de `taller`. Cada `lab.*` pesa unos 285 KB, así que 40 clientes lentos a la vez ocupan unos 11 MB.

1. Con el stack levantado, en una terminal corré `npm run api:content:check` (sus 40 clientes lentos leen las dos porciones de `lab` con pausas de 15 ms). En otra, mientras corre, muestreá cada segundo `docker compose exec -T taller df -k /tmp` y `docker stats --no-stream --format '{{.MemUsage}}' $(docker compose ps -q taller)`.
2. **Umbrales:** el pico de `/tmp` tiene que quedar en 24 MB o menos (el 75 % de los 32 MB) y la memoria de `taller`, en 100 MiB o menos (el 78 % de 128 MiB), con el log de Nginx sin `No space left on device` y los 40 cuerpos completos (lo comprueba el check).
3. Si un umbral no se cumple, agrandá el tmpfs de `taller` (48m y después 64m) y subí `mem_limit` lo mismo, porque el tmpfs cuenta contra él, y repetí hasta cumplirlos. No se apaga el buffering (`fastcgi_buffering off`): empujaría la lentitud de los clientes a PHP-FPM.
4. Dejá en `compose.yaml`, junto al tmpfs de `taller`, un comentario con el resultado: fecha, 40 clientes lentos, pico de `/tmp` y de memoria medidos, y el tamaño final. Ponelo también en el mensaje del commit.
5. Commit sugerido: `chore(compose): tmpfs de Nginx medido con 40 clientes lentos`.

### Tarea 7.5 · Compuerta final de C2 (T028)

1. En el árbol integrado, con el `.env` creado: `npm run build`, `npm test`, `npm run lint` y `npm run format:check`. **Esperado:** verde; `npm test` corre 30 checks; sha256 del documento y del volcado iguales a la línea base (SC-006).
2. `npm run api:test` y `npm run api:format:check`. **Esperado:** verde, con las tres suites (SC-010, FR-043).
3. `docker compose up --build -d --wait`, `npm run api:smoke`, `npm run api:content:check`. **Esperado:** verde.
4. `sh api/scripts/deploy-check.sh` (FR-046). **Esperado:** todo `ok`; tarda unos minutos porque `migrate` agota sus 3 intentos. Si `php` se recrea aunque `migrate` falle, el escenario falló de verdad: se trata como un defecto de despliegue, no del script.
5. `git diff --check`. Informá los comandos con su resultado real y lo que no se pudo verificar.
6. **Después de la compuerta, documentos de planificación** (el coordinador o el rol de roadmap): marcar C2 como entregado en `specs/backend-multiusuario/roadmap.md` con el PR, el commit y lo ejecutado; anotar en el ADR 0006 (D07) el resultado de la medición de T010; y, si la medición del tmpfs cambió `compose.yaml`, citarlo en la evidencia. El directorio de la feature queda inmutable al entregar (constitución, principio VIII); los cambios posteriores van a una spec nueva o a la extensión `bug`.

## Cobertura de requisitos

Cada requisito y criterio de la spec tiene al menos una tarea que lo construye y una prueba que lo ejerce. FR-036 se movió a C3 y no tiene tareas en C2.

| Requisito | Tareas | Qué lo comprueba |
| --- | --- | --- |
| FR-001, FR-004, SC-005 | T020, T021 | `ImportContentTest`: importa la imagen; un error a mitad o un hash adulterado no deja nada |
| FR-002, SC-002 | T019, T020, T021, T024 | `ContentDiffTest` y `ImportContentTest` (`CHECKSUM TABLE` igual); el segundo `up` no escribe |
| FR-003, FR-027, SC-008 | T019, T020, T021 | retiro sin borrado y reactivación en `ContentDiffTest` e `ImportContentTest`; 410 en `ContentEndpointTest` |
| FR-005 | T014, T015, T021 | `ContentRoundTripTest`; auto-chequeo del import (`ImportContentTest`, hash adulterado) |
| FR-006 | T013, T014, T019, T021 | `ContentSourceTest`, `ContentRowsTest`, `ContentDiffTest` y las consultas de invariantes rotas a mano |
| FR-007 | T020, T021 | `--dry-run` en `ImportContentTest` |
| FR-008 | T020, T021 | «sólo corre un import a la vez» |
| FR-009, FR-010 | T019, T020, T021 | registro del import y versiones de corrección A, B, A |
| FR-011, FR-028, FR-031, FR-037 | T001, T003, T007 | `curriculum-meta-check`; el commit de origen se valida en el generador |
| FR-012 | T020, T021 | caché con los 17 cuerpos |
| FR-013, FR-016 | T012, T022, T023 | `PortionTest` y el 422 de `ContentEndpointTest` |
| FR-014, FR-038, SC-001 | T011, T015, T020, T022, T023 | `PublishedJsonTest`, `ContentRoundTripTest`, `ContentContractTest`, 200 de `ContentEndpointTest` |
| FR-015, FR-017 a FR-022 | T022, T023 | `ContentEndpointTest`: 404, 410, 304 fuerte y débil, `Content-Version`, cabeceras, 503 |
| FR-023, FR-044, SC-003, SC-004, SC-011 | T017, T022, T023 | validadores sin build, 503 `maintenance`, imagen nueva con el mismo contenido |
| FR-024 | T005, T006, T022, T023 | UTC en `ConnectionTest`; `retiredAt` y cuerpo de error en `ContentEndpointTest` |
| FR-025 | T023 | rutas sin sesión; el 401 es de C3 |
| FR-026 | T021 | `ContentImports` y `LatestImport` leen la versión y los catálogos del último import |
| FR-029, FR-030, SC-006, SC-009 | T002, T004, T028 | codemod, fixture de las 100 etapas, mismos sha256 del documento y del oráculo |
| FR-032 | T003, T014, T020 | catálogos sin posición en el meta, las filas y el import |
| FR-033, FR-034, FR-046 | T016, T017, T024, T028 | `migrate.sh`, el servicio `migrate` y `deploy-check.sh` |
| FR-035, FR-042, SC-007 | T008, T016, T024 | `LockWaitTest`, `MigrationsTest` y `MigrateScriptTest` |
| FR-039 | T019, T020 | las pruebas del import |
| FR-040 | T022 | `ContentEndpointTest` |
| FR-041 | T005, T008 | `ConnectionTest` y las pruebas de esquema |
| FR-043, SC-010 | T028 | la compuerta final |
| FR-045 | T007 | la imagen trae el documento y el meta |
| FR-047 | T018, T025, T027 | `api-content-check.ts` y la medición del tmpfs |
| FR-048 | T010 | `OnlineDdlTest` |
| FR-036 | — (C3) | `db-grants` con el chequeo de transacciones largas |

## Descargas y permisos

- **Primera construcción de la etapa `curriculum` (T007): necesita permiso del usuario antes de correr.** `npm ci` baja las 243 dependencias del `package-lock.json` desde el registro de npm: unos 150 MB instalados y, por estimación, 40 a 50 MB de descarga. Corre sobre `node:24-alpine@sha256:ebfe2f90…`, la imagen que ya usa el front; si no está en el equipo, también se baja. Las construcciones siguientes reutilizan la capa.
- **`node_modules` en los worktrees que corren TypeScript** (la base, T001 a T004, y el agente C, T018): se enlaza al del checkout principal (`ln -s`), que no descarga nada, o se corre `npm ci` (la misma descarga de arriba, también con permiso).
- **Sin dependencias nuevas:** ni Composer (el código de referencia usa sólo `laravel/framework`, Pest y `symfony/process`, transitiva y ya en `api/composer.lock`) ni npm (el generador usa `node:crypto` y `yaml`, que ya están). No se agregan imágenes: `mysql:9.7` y `composer:2.10` ya están fijadas desde C1.

## Riesgos y lo que quedó sin verificar

- **El PHP, el SQL, el Dockerfile, Compose y los scripts de `sh` de este plan no se ejecutaron:** se escribieron y revisaron sin PHP ni MySQL en el equipo y sin usar Docker, por encargo. El TypeScript sí se ejecutó (30 checks, el generador, el check de punta a punta contra un servidor simulado). Las pruebas del plan son la red de seguridad, y los agentes pueden encontrar defectos en el código de referencia: se corrigen, no se esquivan.
- **Mediciones con umbral, que cierran en tareas y no se suponen:** los cuatro casos de D07 (T010, se fija el resultado), la reutilización de la capa de `npm ci` y el `.dockerignore` del contexto con nombre (T007, pasos 4 y 5), que `php` no se recree si `migrate` falla (T017 y T028) y la capacidad del tmpfs de Nginx con 40 clientes lentos (T027, 24 MB y 100 MiB como máximo).
- **Paralelismo:** los worktrees comparten Docker, así que cada agente usa su `COMPOSE_PROJECT_NAME`; cada base de pruebas reserva hasta 1 GB de tmpfs. E depende de los datos de W: es la cola de la onda 2 (ver «Reparto en paralelo»).
- **Igualdad de bytes:** vale mientras el contenido no tenga flotantes, `-0` ni pares surrogate sueltos; si algún día los tiene, el auto-chequeo del import bloquea el despliegue en vez de servir otra cosa.
- **Ventana de despliegue:** entre el `COMMIT` de un import nuevo y el reemplazo de `php`, el servicio anterior puede responder 503 `maintenance` con `Retry-After`: es deliberado y breve.
- **Para C3** (ya en la hoja de ruta): el contenido pasa detrás de la sesión con «sin sesión, 401»; el middleware de sesión no agrega `Vary: Cookie` ni toca `Cache-Control` en el contenido; el chequeo de transacciones largas con `db-grants` y su prueba de privilegios (criterio J); y la limpieza programada de la caché de cuerpos vencida.

## Complexity Tracking

Sin violaciones de la constitución que justificar. El tamaño del plan, con el código de referencia incluido, es el costo de repartirlo en agentes que trabajan a la vez: cada uno lee sólo su sección y las reglas comunes.
