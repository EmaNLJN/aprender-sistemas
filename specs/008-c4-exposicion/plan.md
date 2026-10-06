# Implementation Plan: C4 · Exposición

**Branch**: `008-c4-exposicion` (nombre de la feature; el proyecto no crea una rama por feature) | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-c4-exposicion/spec.md`. Decisiones: [research.md](./research.md). Datos y configuración: [data-model.md](./data-model.md). Contratos: [contracts/http.md](./contracts/http.md) y [contracts/console.md](./contracts/console.md). Validación: [quickstart.md](./quickstart.md).

> **Para quien lo implementa.** El trabajo se reparte entre dueños con archivos disjuntos (sección «Reparto en paralelo»). Leé completa la sección de tu dueño y las «Reglas para todos los agentes». `tasks.md` tiene una línea por tarea (T001…) y remite acá. **Las verificaciones previas V1 a V5 van primero**: cada una decide algo que las tareas siguientes dan por hecho (sección 1).
>
> **Código sin ejecutar.** Se planificó sin Docker, sin el build, sin un navegador y sin descargas. Nada de lo que sigue corrió: las configuraciones de Nginx y de Compose, los scripts y el SQL son referencia, y los checks son el contrato. La sección «Lo que quedó sin verificar» lista lo que hay que medir al implementar.
>
> **Línea de base.** El plan parte de `master` más C3a (rama `feat/c3a-identidad`, PR #24, leída en su worktree), y de lo que integren A3, C3b y C3c antes de C4: T001 vuelve a leer `docker/nginx/nginx.conf`, `docker/compose.yaml`, `docker/mysql/db-grants.sql`, `backend/api/scripts/init-env.sh` y la lista de tablas, y corrige este plan donde cambien. B2 (PR #22) y A2 (PR #19) están planificadas: lo que se toma de ellas está en la sección «Puntos de integración con otros frentes».

## Summary

C4 expone el taller en Internet sin tocar la API ni el contenido: un nombre propio por HTTPS con un certificado que Nginx obtiene y renueva solo, una política estricta en el navegador, los límites por red con la IP real, un usuario de MySQL por rol y una copia cifrada fuera del host que se probó restaurar. El enfoque:

- **Un archivo de Compose que se suma, y un script.** `docker/compose.public.yaml` y `public.sh` (proyecto `taller-publico`) agregan lo público sin cambiar el modo local. La base se parametriza con valores locales por omisión, así los servicios que sumen B2 y C3c toman las cookies y el `APP_URL` públicos sin una línea más.
- **Un solo `nginx.conf` para los dos modos,** con tres archivos incluidos que cambian por modo, y las seis cabeceras en un archivo que incluye cada ubicación. En público, un entrypoint propio renderiza las plantillas del dominio a un tmpfs.
- **El módulo ACME de Nginx** (extraído del paquete de nginx.org en una etapa de build), con HTTP-01 en el 8080 interno y TLS-ALPN-01 como alternativa, probado primero con Pebble. V1 decide si sigue la opción A de Q1 o pasa a la B.
- **CSP con nonce.** El build deja de ser un solo documento; Nginx inyecta `$request_id` como nonce con `sub_filter`, y el editor lo toma de `<meta property="csp-nonce">`.
- **El cierre de sesión por CSRF**, que encontró la prueba en navegador de C3a, lo cierra Nginx con `Sec-Fetch-Site`, antes de PHP.
- **Usuarios de MySQL por rol,** en los dos modos, con los permisos por tabla en una segunda fase después de `migrate`, y una prueba de la matriz contra MySQL real.
- **El respaldo:** un objeto por noche, cifrado con `age`, subido con una credencial que sólo agrega, con 35 días de expiración en el destino; el despliegue toma su propio volcado antes de migrar; la restauración se prueba en dos partes (completa fuera del host; simulacro de punto en el tiempo en el host).
- **La compuerta en dos tramos** (G1 y G2), porque la autoridad sólo valida el dominio con el router abierto.

## Technical Context

**Language/Version**: sh POSIX (`public.sh`, los scripts de respaldo y de despliegue), configuración de Nginx 1.30.5, YAML de Compose, SQL de MySQL 9.7 y TypeScript como ES modules (los checks de `qa/`, Node 24). Sin PHP nuevo: C3a ya trae todo el servidor de aplicación.

**Primary Dependencies**: ninguna de npm ni de Composer (FR-047); sólo se retira `vite-plugin-singlefile`. Piezas del sistema, con permiso y fijadas por digest o sha256: el módulo `nginx-module-acme` 0.4.1 (2,8 MiB), Pebble 2.10.1 (3,2 MiB), `age` 1.3.2 (18,5 MiB) y `rclone` 1.75.1 (32,4 MiB).

**Storage**: tres volúmenes de Docker nuevos en el proyecto público (`acme-state`, `backup-spool`, `backup-state`) y el destino de objetos del usuario. MySQL 9.7 sin tablas nuevas.

**Testing**: checks de `qa/` que corren en `npm test` (cabeceras, política de contenido, build, plantillas de Nginx, `apply-grants.sh` y `public.sh` con dobles); checks contra el stack con Docker (`api:grants:check`, `public:check`, `public:acme-check`, `public:backup-check`) que corren en el job `public` de la CI; y el recorrido en Chromium con Playwright (el de F1). Pest no cambia.

**Target Platform**: el modo público, en un host Linux doméstico con Docker 29.8 y Compose (ADR 0005, «Host»); el modo local, en Linux o macOS.

**Project Type**: infraestructura y configuración de un servicio web existente (Nginx, Compose, MySQL, un contenedor de respaldo) más un cambio de build del front.

**Performance Goals**: una renovación forzada sin un solo pedido fallido; 40 alumnos tras una misma IP sin un 429 ni un 503 de conexiones; una restauración de una hora o menos con el volumen de hoy; un volcado nocturno de segundos a minutos a esta escala.

**Constraints**:
- el modo local no cambia lo que ve quien desarrolla y los checks de hoy pasan sin editarlos (FR-002);
- ningún secreto en Git, en una imagen ni en el contexto de Docker;
- el disco de los contenedores de Nginx y del respaldo es de sólo lectura, y corren sin capacidades;
- la clave privada de los respaldos no entra en el host y el binlog no sale de él;
- cada descarga con permiso, nombre, origen y tamaño.

**Scale/Scope**: unos 40 archivos nuevos (de Compose, de Nginx, scripts de sh, un Dockerfile, checks de `qa/` y documentos), unos 20 cambiados (entre ellos `docker/compose.yaml`, `docker/nginx/nginx.conf`, `frontend/Dockerfile`, `db-grants.sql` y la CI) y 27 tareas en cinco ondas (de la 0 a la 4).

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.3.1). Resultado antes y después del diseño: sin violaciones.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | El plan sigue `AGENTS.md` y `backend/api/AGENTS.md`. T024 actualiza `AGENTS.md`, `README.md`, `docs/architecture.md`, `qa/AGENTS.md` y `backend/api/AGENTS.md` en el mismo cambio (FR-045) |
| II. TDD y pruebas útiles | Sí | Cada tarea abre con el check que falla por la razón que dice el paso. Los esperados salen de afuera del código probado: las cabeceras, de FR-013 escritas a mano en el check; las suites TLS, de la guía de Mozilla; la matriz de privilegios, de un JSON escrito desde la tabla del modelo de datos y no desde el SQL; los conteos de la restauración, del manifiesto medido por separado |
| III. Código entendible | Sí | Scripts de sh chicos con subcomandos con nombre, sin lógica ingeniosa. `backup.sh` es el más largo: se revisa por pasos, uno por etapa de R15, y no se fragmenta por una cuota |
| IV. Contenido en Git, IDs estables, nada se borra | Sí | No cambia ningún ID, fila ni byte del currículo. El contenido sigue saliendo sólo por `/api/` con sesión |
| V. Capas y contratos explícitos | Sí | Transporte (`docker/nginx/`), operación (`docker/`, `backend/api/scripts/`), datos (`docker/mysql/`, `docker/backup/`) y contratos (`contracts/`). Ningún framework ni dependencia nueva. La enmienda del ADR 0004 §1 se registra en un ADR (T024) |
| VI. Español, accesibilidad y portabilidad | Sí | Mensajes y guía en español; código y pruebas, en inglés. Los scripts son de POSIX `sh`; lo que sólo vale en Linux (`ss`, el modo público) está dicho. La interfaz no cambia: las vistas se ven y se comportan igual (FR-023) |
| VII. Secretos y salidas generadas fuera de Git | Sí | Las contraseñas de rol, las credenciales del destino y las claves ACME viven en `.env` y en volúmenes; los archivos `*.pem` y `*.key` de prueba se generan en un directorio temporal. Las descargas piden permiso con nombre, origen y tamaño |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su evidencia. Lo que falte lo agrega `/speckit-converge`; al entregar, el directorio queda inmutable |

## Project Structure

### Documentation (this feature)

```text
specs/008-c4-exposicion/
├── spec.md              # qué y por qué, con el clarify del 2026-10-06
├── research.md          # decisiones R1 a R24 y las verificaciones V1 a V5
├── data-model.md        # configuración, servicios, matriz de MySQL, conjunto de respaldo y estados
├── contracts/
│   ├── http.md          # cabeceras, clases de respuesta, cookies, redirecciones y TLS
│   └── console.md       # public.sh, deploy.sh, grants, backup, restore-check y los checks
├── quickstart.md        # escenarios de validación, hasta G1 y G2
├── plan.md              # este archivo: cómo, repartido en dueños
├── tasks.md             # una línea por tarea
└── checklists/requirements.md
```

### Source Code (repository root)

```text
docker/
├── compose.yaml                     (cambia: roles por servicio, `grants`, mysql, parámetros de modo)
├── compose.public.yaml              (nuevo: lo público)
├── compose.public-test.yaml         (nuevo: certificado estático y puertos altos, sólo para los checks)
├── compose.acme-test.yaml           (nuevo: Pebble, sólo para el check)
├── compose.backup-test.yaml         (nuevo: S3 local, sólo para el check)
├── nginx/
│   ├── nginx.conf                   (cambia: tres includes, cabeceras, nonce, caché, 419, límites)
│   ├── headers.conf                 (nuevo: las seis cabeceras)
│   ├── taller.d/{main,http,server}.conf        (nuevo: las variantes locales)
│   └── public/                      (nuevo: plantillas, validate.sh y entrypoint.sh)
├── mysql/
│   ├── db-grants.sql                (cambia: usuarios por rol, en dos fases)
│   ├── apply-grants.sh              (nuevo)
│   └── 10-db-grants.sh              (nuevo: el inicio de un volumen nuevo)
└── backup/                          (nuevo: Dockerfile, backup.sh, verified-tables.txt)
frontend/
├── Dockerfile                       (cambia: el módulo ACME, los includes, el entrypoint)
├── vite.config.ts                   (cambia: sin singlefile, con `html.cspNonce`)
└── src/shared/{lib/csp-nonce.ts,ui/code-editor/mount-code-editor.ts}   (cambian)
backend/api/
├── scripts/{public,init-env,deploy}.sh   (public.sh nuevo; los otros cambian)
├── scripts/{public-check,acme-check,backup-check,restore-check,compose-check}.sh   (nuevos)
├── docker/migrate.sh                (cambia: el aviso de un usuario que falta)
└── .env.example                     (cambia: las variables de referencia)
qa/
├── nginx-headers-check.ts, nginx-public-check.ts, csp-guard-check.ts, apply-grants-check.ts, public-script-check.ts   (nuevos, en `npm test`)
├── api-grants-check.ts              (nuevo, contra el stack)
├── fixtures/mysql-roles.json        (nuevo: la matriz)
├── build-check.ts, lib/built-page.ts   (cambian: el contrato de varios archivos)
├── e2e/specs/csp-walk.spec.ts       (nuevo: el recorrido en Chromium)
└── run-checks.ts                    (cambia: la lista)
.github/workflows/ci.yml             (cambia: el job `public`)
docs/operacion-publica.md            (nuevo: la guía de operación)
package.json, package-lock.json      (cambian: sin vite-plugin-singlefile; los scripts nuevos)
AGENTS.md  README.md  docs/architecture.md  qa/AGENTS.md  backend/api/AGENTS.md   (T024)
```

**Structure Decision:** lo público vive al lado de lo local sin duplicarlo: un archivo de Compose que se suma, un solo `nginx.conf` con tres puntos de inclusión y las mismas ubicaciones para los dos modos. La operación del modo público tiene un solo punto de entrada, `public.sh`. Cada pieza nueva con estado (el respaldo, el certificado) tiene su volumen y su directorio, y ninguna toca `backend/api/app/`: C4 no escribe PHP.

## Review Focus

Lo que el revisor mira primero, porque es lo que más cuesta equivocar o lo que un check no cubre del todo.

- **Los secretos.** Ninguna contraseña en un archivo versionado, en la línea de comandos ni en un log: `apply-grants.sh` entrega el SQL por la entrada estándar y apaga el binlog de esa sesión; el respaldo arma un archivo de opciones en un tmpfs; la configuración de `rclone` sale del entorno. Las claves ACME viven sólo en el volumen. La clave privada de `age` no aparece en ningún lado del repositorio ni del host.
- **La política y las cabeceras.** Cada ubicación con una `add_header` propia incluye `headers.conf` (el check estático lo exige, y hoy `@too_many_requests` ya no lo cumple). El `$hsts_value` está definido en los dos modos. El nonce de la respuesta de `/` es nuevo en cada pedido y esa respuesta no lleva validadores. Los valores de las cabeceras del check están escritos a mano, no leídos de `headers.conf`.
- **Falla cerrado.** Sin `TALLER_DOMAIN`, sin `ACME_ACCEPT_TOS=yes` o sin la clave pública el stack no arranca; con el volumen de estado vacío no se entrega un certificado autofirmado; con otro nombre o por la IP no se entrega el certificado ni la aplicación; un volcado que no se puede cifrar no sale; una copia que no cabe en el spool aborta en lugar de borrar.
- **Mínimo privilegio.** `taller_backup` sin `TRIGGER`, `EVENT` ni `PROCESS`; `taller_migrate` sin `GRANT OPTION`; `app` sin DDL ni escritura de contenido; la credencial del host del destino sólo agrega. La prueba de la matriz se escribe desde la tabla del modelo de datos, no desde el SQL, y falla ante una tabla que la matriz no nombra.
- **El orden de los permisos.** Los permisos por tabla sólo pueden concederse después de `migrate`, así que el primer arranque y cada despliegue pasan por `grants`. Un servicio de Laravel nuevo depende de `grants`, no de `migrate`.
- **No romper a los vecinos.** El check de B2 sobre los bloques `/api/` y `/api/runs` sigue valiendo (siguen en `nginx.conf`, con la misma línea de inclusión); `smoke.sh` de C3a sigue pasando en el modo local (por eso `db-grants` conserva su perfil y su nombre); `api:content:check` y `deploy-check.sh` pasan sin editarse.
- **El respaldo.** Nunca queda un volcado sin cifrar en el spool (sólo el simulacro de la parte b, que lo borra); el latido sólo se manda después de subir; el éxito sólo se anota si subió. El manifiesto mide antes y después, y la restauración compara con la regla de intervalo, no con un solo conteo.
- **Los dos modos.** Lo que se prueba en local (cabeceras, política, roles, límites) es lo que se sirve en público: las ubicaciones y las cabeceras son las mismas, y sólo cambian el origen del certificado, los puertos y HSTS.
- **Complejidad.** `backup.sh` puede pasar de 10 caminos: se revisa por etapas con nombre y por su check, no se fragmenta por una cuota.

## Reparto en paralelo

Los dueños tienen archivos disjuntos. Cada uno trabaja en su worktree, parte de lo que integró el coordinador y entrega una rama que se integra sin conflictos. Un mismo agente puede llevar varias colas si no corren a la vez. Todas las tareas de Docker usan su propio `COMPOSE_PROJECT_NAME` y su propio puerto, y los checks públicos, un nombre de proyecto único por corrida.

**Ondas:**

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | Coordinador | T001 y T002: la línea de base y el lote 1 de descargas (el módulo ACME y Pebble) |
| 1 | N, F, K, D, a la vez | **N**: T003 (V1, el módulo ACME). **F**: T004 (V2, la CSP y el editor). **K**: T005 (V3a, la publicación). **D**: T006 (V4, los privilegios de respaldo y el tiempo). El coordinador: T008, cuando los cuatro entregaron |
| 2 | N, F, D, B, K, a la vez (desde S1) | **N**: T009 y T010. **F**: T011 a T013. **D**: T014 y T015. **B**: T016 y T017, después del lote 2 de descargas. **K**: T018 y T019. V5 (T007) corre en cuanto el usuario tenga la cuenta del destino |
| 3 | Q (desde S2) | T020 a T023: los checks de punta a punta, el recorrido en el navegador, la CI y los registros |
| 4 | Coordinador y el usuario (desde S3) | T024 a T027: la documentación, G1, G2 y la evidencia de cierre |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| Coordinador (C) | `package.json`, `package-lock.json`, `qa/run-checks.ts`, `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/operacion-publica.md`, `docs/adr/` (el ADR nuevo), `qa/AGENTS.md`, `backend/api/AGENTS.md`, `.gitignore`, `.dockerignore`, `specs/008-c4-exposicion/` | todo | la línea de base, las descargas, la integración, la documentación, G1 y G2, y la evidencia |
| N · Nginx y TLS | `docker/nginx/` (todo), `frontend/Dockerfile`, `docker/compose.acme-test.yaml`, `backend/api/scripts/acme-check.sh`, `qa/nginx-headers-check.ts`, `qa/nginx-public-check.ts` | de K: nada (los nombres están en el contrato) | las cabeceras, la CSP con nonce, la caché, el 419 por CSRF, los límites, la configuración pública, la imagen con el módulo ACME y el check con Pebble |
| F · Front y build | `frontend/vite.config.ts`, `frontend/src/shared/lib/csp-nonce.ts` y su spec, `frontend/src/shared/ui/code-editor/mount-code-editor.ts`, `qa/build-check.ts`, `qa/lib/built-page.ts`, `qa/csp-guard-check.ts` | de N (V2): la configuración con la CSP | el build en varios archivos, el nonce en el editor y la guardia de regresión |
| D · MySQL y roles | `docker/mysql/` (todo), `qa/api-grants-check.ts`, `qa/apply-grants-check.ts`, `qa/fixtures/mysql-roles.json`, `backend/api/docker/migrate.sh`, `backend/api/tests/Unit/MigrateScriptTest.php` | — | el SQL de roles, el script que lo aplica, el inicio de un volumen nuevo y la prueba de la matriz |
| B · Respaldos | `docker/backup/` (todo), `docker/compose.backup-test.yaml`, `backend/api/scripts/{backup-check,restore-check}.sh` | de D: las cuentas y la matriz | la imagen y el script de respaldo, la prueba de punta a punta y la restauración |
| K · Compose y operación | `docker/compose.yaml`, `docker/compose.public.yaml`, `backend/api/scripts/{public,init-env,deploy,compose-check}.sh`, `backend/api/.env.example`, `qa/public-script-check.ts` | de N, D y B: los nombres de archivos, servicios y variables de los contratos | la base de Compose con los roles, el archivo público y el script `public.sh` |
| Q · Verificación | `backend/api/scripts/public-check.sh`, `docker/compose.public-test.yaml`, `qa/e2e/specs/csp-walk.spec.ts`, `qa/e2e/playwright.config.ts`, `.github/workflows/ci.yml` | todo lo anterior | los checks contra el stack público, el recorrido en el navegador y el job de CI |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 y T002 integrados. Todos parten de ahí.
- **S1:** T003 a T006 integrados y sus resultados anotados en `research.md` (T008): Q1 y Q3 confirmadas o devueltas al usuario, la lista de privilegios de `taller_backup`, el desafío por omisión y el mapeo de puertos. Las tareas de la onda 2 parten de ahí.
- **S2:** T009 a T019 integrados, con las líneas de integración de abajo. Q parte de ahí.
- **S3:** T020 a T023 integrados. El coordinador y el usuario cierran.

**Líneas de integración** (las pone el coordinador al integrar; ningún dueño toca esos archivos):

| Cuándo | Archivo | Línea |
| --- | --- | --- |
| S2 | `package.json` y `package-lock.json` | Se quita `vite-plugin-singlefile` con `npm uninstall`, en el mismo commit que el `vite.config.ts` de F; se agregan `"api:grants:check": "node qa/api-grants-check.ts"`, `"public:check": "sh backend/api/scripts/public-check.sh"`, `"public:acme-check": "sh backend/api/scripts/acme-check.sh"` y `"public:backup-check": "sh backend/api/scripts/backup-check.sh"` |
| S2 | `qa/run-checks.ts` | Se agregan `nginx-headers-check.ts`, `nginx-public-check.ts`, `csp-guard-check.ts`, `apply-grants-check.ts` y `public-script-check.ts` a la lista |

**Puntos de integración con otros frentes** (los resuelve el coordinador):

- **C3a.** Se apoya en lo que C3a ya dejó: las zonas `limit_req`, el 429 en JSON, `X-Request-Id`, `taller.device_cookie`, `trustProxies` vacío, el `init-env.sh` con su patrón y `db-grants`. Tres hallazgos para su PR o su seguimiento: `@too_many_requests` pierde la CSP y `Referrer-Policy` (C4 lo corrige con `headers.conf`); el DNS cerrado de `taller` no sirve para la exposición (el archivo público lo reabre) y `smoke.sh` vale sólo en el modo local; y el cierre de sesión por CSRF, que cierra C4 en Nginx.
- **B2 (PR #22).** Su check `qa/nginx-api-blocks-check.ts` extrae los bloques `/api/` y `/api/runs` de `docker/nginx/nginx.conf`: siguen ahí, con la línea `include …/headers.conf;` idéntica en los dos. `worker-runs` lee `RUNS_DB_USERNAME` y `RUNS_DB_PASSWORD`: T018 le pone `taller_runs` y la contraseña de su rol. Los 413 y 429 de `/api/runs` llevan las seis cabeceras.
- **A2 (PR #19) y A3.** `qa/lib/built-page.ts` y `assertSinglefileDocument` son de A2 y los cambia T011. `curriculumMarkers()` y `contentVersion()` (T020) vienen de A2. A3 tiene que haber retirado el puente estático antes de C4 (FR-022); si no, T001 lo informa y C4 no se despliega.
- **C3b y C3c.** `taller_mail` y sus permisos se agregan a `docker/mysql/db-grants.sql` con el mecanismo de T014; el libro de supresiones viaja como TSV (T016); `taller:reapply-deletions` es lo que T017 corre; `worker-mail` depende de `grants` (T018). Si C3c llegó antes de T014 con otro mecanismo, T014 lo adopta y registra la diferencia.
- **D1 y C5.** Cada tabla nueva se suma a la matriz (`qa/fixtures/mysql-roles.json`) y a `docker/mysql/db-grants.sql` en su mismo cambio; una ubicación nueva de Nginx incluye `headers.conf`.
- **A4.** Quita los Playgrounds de la línea `connect-src` de `docker/nginx/headers.conf`.
- **Épico del front.** C4 ya no espera a F5, F7 ni F8 (Q3 en B). F1 aporta Playwright con Chromium, que T021 usa.
- **La hoja de ruta y el ADR.** La integra quien mergea: C4 depende de A3, C3a, C3b y C3c. El ADR que enmienda el 0004 §1 lleva el número que asigne quien integra (el 0008 lo usa el épico del front).

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `backend/api/AGENTS.md`, `qa/AGENTS.md` y la constitución;
  - la spec, [research.md](./research.md), [data-model.md](./data-model.md), los dos contratos y tu sección;
  - las skills `tdd` y `clean-code` y, quien toque el navegador, `playwright-best-practices`. No hay skill de Nginx ni de Compose: mandan las fuentes oficiales citadas en research.md.
- **TDD, siempre.**
  - Escribí el check de tu paso y comprobá que falla por la razón que dice el plan. Recién entonces implementá.
  - Un esperado sale del contrato, de la consigna o de un ejemplo resuelto aparte; nunca del código que probás.
- **Archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo al coordinador.
- **Comandos.**
  - En cada comando de Docker: `COMPOSE_PROJECT_NAME=taller-c4-<dueño>` en la misma línea (el shell no persiste entre llamadas) y, si publicás un puerto, `TALLER_PORT=<uno propio>`. Un `.env` propio con `sh backend/api/scripts/init-env.sh`.
  - Los checks públicos arman su propio proyecto con un nombre único; el stack real del usuario (`taller-rust-go` y `taller-publico`) no se toca.
  - `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` y `git diff --check`, y los checks de tu tarea.
  - Si un comando intenta descargar algo (una imagen, un paquete), pará y pedí permiso. Las descargas están en «Descargas y permisos».
- **Estilo.**
  - Código y pruebas en inglés, mensajes para quien opera en español. Comentarios sólo en lo complejo o para una referencia (un ADR, un bug, una RFC).
  - Scripts de POSIX `sh`, con `set -eu`, portables a Linux y macOS salvo lo que diga «Linux». Nada de `bash`.
  - Sin secretos en la línea de comandos, en un log ni en un archivo versionado.
  - Formato con Prettier (`npm run format`) en lo que sea TypeScript.
- **Commits.** Chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`. Cada commit lleva su check con lo que verifica. La evidencia de una tarea es su commit, y lo que midas va en el mensaje.
- **Al terminar**, informá las tareas cerradas, los comandos que corriste con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Base (coordinador, onda 0)

**Cubre:** la línea de base y el primer lote de descargas con permiso (FR-002, FR-046, FR-047).

**Entrega:** el árbol de C4 parte de `master` con C3a, A3, C3b y C3c integrados, con las suites en verde, la lista de tablas y de servicios anotada y los permisos del lote 1 pedidos.

### Tarea 0.1 · La línea de base (T001)

**Pasos:**

1. Traé a la rama de trabajo lo que esté integrado: C3a (PR #24 o `feat/c3a-identidad`), A3, C3b y C3c, y B2, A2 y D1 si ya llegaron. `git log --oneline` de cada uno. Si A3 no retiró el puente estático de A2 (`ls dist/content` después de un build, o `qa/lib/built-page.ts` con `readBuiltContent`), avisá: FR-022 impide desplegar C4.
2. Corré y anotá, como línea de base: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run api:format:check`, `npm run api:analyse`, `npm run api:test`; con `COMPOSE_PROJECT_NAME=taller-c4-base docker compose up --build -d --wait`: `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.
3. Releé lo que este plan da por sabido y corregí el plan y [data-model.md](./data-model.md) donde difiera: `docker/nginx/nginx.conf` (las ubicaciones, la CSP actual, `qa/nginx-api-blocks-check.ts` si B2 llegó), `docker/compose.yaml` (`DB_USERNAME` y `DB_PASSWORD`, los servicios, las redes), `docker/mysql/db-grants.sql`, `backend/api/scripts/{init-env,deploy,smoke,deploy-check}.sh`, `frontend/Dockerfile`, `backend/api/config/{taller,session}.php`, y la lista de tablas con `docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -Nse "select table_name from information_schema.tables where table_schema = \"taller\" order by 1"'`. La lista alimenta la matriz de T014.
4. `docker compose config --services` y `--volumes`, y `docker compose --profile ops config --services`: anotalos; T018 y T019 los comparan.
5. Avisá a los dueños de lo que cambió.

**Compuerta:** las suites y los tres checks contra el stack en verde sobre la base, y la lista de tablas, de servicios y de volúmenes anotada.

### Tarea 0.2 · El lote 1 de descargas (T002)

**Pide permiso al usuario**, con nombre, origen, tamaño y licencia (metadatos del 2026-10-06; se vuelven a leer al pedirlo):

| Qué | Origen | Tamaño | Licencia |
| --- | --- | --- | --- |
| `nginx-module-acme-1.30.5.0.4.1-r1.apk` y la clave de firma `nginx_signing.rsa.pub` | `https://nginx.org/packages/alpine/v3.24/main/x86_64/` y `https://nginx.org/keys/` | 2 899 805 bytes (2,8 MiB) y unos cientos de bytes | Apache-2.0 |
| Pebble 2.10.1, `ghcr.io/letsencrypt/pebble:2.10.1` | GHCR | 3 332 845 bytes en capas, amd64 (3,2 MiB) | MPL-2.0 |

**Pasos:**

1. Con el permiso: `docker pull ghcr.io/letsencrypt/pebble:2.10.1` y anotá su digest (`docker image inspect --format '{{index .RepoDigests 0}}'`). El `.apk` y la clave los baja la etapa de build de T003: ahí se calculan sus sha256 y se fijan con `ADD --checksum`.
2. Leé de la imagen de Pebble su entrypoint y la configuración de ejemplo (`docker run --rm --entrypoint sh <imagen> -c 'ls /test; cat /test/config/pebble-config.json'`) y pasale a N cómo se fija la validez corta de los certificados (V1).

**Compuerta:** el digest de Pebble anotado y el permiso del lote 1 registrado. No bloquea a los demás.

## 1. Verificaciones previas (onda 1; V5, en la onda 2)

**Cubre:** FR-001, FR-006 a FR-010, FR-016 a FR-019, FR-027, FR-031, FR-034, FR-036 y FR-042; SC-002, SC-004, SC-009 y SC-010.

Son spikes: cada uno responde una pregunta de la spec que no se pudo probar al escribirla, y **decide algo que las tareas siguientes dan por hecho**. Los de la onda 1 parten de S0 y corren a la vez, cada uno en su worktree. Lo que cada uno prueba con código que sirve después (los checks, las plantillas, la configuración de Vite) se conserva si pasa; lo demás es descartable y no se versiona. Cada uno deja su resultado (versiones, comandos y cifras) en la línea «Resultado» de su sección de research.md, que anota el coordinador en T008.

### Tarea 1.1 · V1: el módulo ACME en la imagen sin privilegios (T003, N)

- **Crea:** `docker/compose.acme-test.yaml`, `docker/nginx/acme-test/pebble.json`, `backend/api/scripts/acme-check.sh`, la etapa `acme` de `frontend/Dockerfile` y las primeras versiones de `docker/nginx/public/{entrypoint.sh,validate.sh}` y de las plantillas (T010 las completa).
- **Entrega:** el resultado de V1 y un `acme-check.sh` que lo repite.

**Pasos:**

1. Con el permiso del lote 1: `docker run --rm --entrypoint nginx <imagen base> -V 2>&1 | tr ' ' '\n' | grep -E 'nginx/|with-compat|http_sub|http_v2|http_ssl|OpenSSL'` y anotalo.
2. Escribí `acme-check.sh` con sus casos, que fallan mientras no haya módulo: (a) con HTTP-01, el certificado se emite sin intervención; (b) cambia al menos dos veces sin reiniciar, con 0 pedidos fallidos de una ráfaga continua; (c) reiniciar `taller` no pide una orden nueva; (d) con Pebble detenido, el fallo y su causa quedan en el registro de errores y el certificado vigente sigue sirviendo, y se recupera al volver; (e) con el volumen vacío, el 8443 rechaza el apretón de manos y no entrega uno autofirmado; (f) con TLS-ALPN-01, lo mismo que (a) y (b), pero el resultado se imprime y no hace fallar el check. La ráfaga, cada medio segundo diez `curl` nuevos con `--resolve taller.test:18443:127.0.0.1` y la raíz de Pebble (`curl -sk https://127.0.0.1:15000/roots/0`), contando los que fallan, y una vez por segundo `openssl s_client … | openssl x509 -noout -serial` para ver los números de serie distintos.
3. La etapa `acme` del Dockerfile (referencia):

```dockerfile
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:<la que ya fija el Dockerfile> AS acme
USER root
ARG NGINX_ACME_VERSION=1.30.5.0.4.1-r1
ADD --checksum=sha256:<de la clave> https://nginx.org/keys/nginx_signing.rsa.pub /etc/apk/keys/nginx_signing.rsa.pub
RUN apk fetch --no-cache --repository https://nginx.org/packages/alpine/v3.24/main -o /tmp nginx-module-acme=${NGINX_ACME_VERSION} \
 && mkdir /out && tar -xzf /tmp/nginx-module-acme-${NGINX_ACME_VERSION}.apk -C /out usr/lib/nginx/modules/ngx_http_acme_module.so
# La etapa final: COPY --from=acme /out/usr/lib/nginx/modules/ngx_http_acme_module.so /usr/lib/nginx/modules/
# y un RUN que carga el módulo con una configuración mínima, para que un desacople de versión falle al construir:
RUN printf 'load_module modules/ngx_http_acme_module.so;\nevents {}\nhttp {}\n' > /tmp/acme-load.conf && nginx -t -c /tmp/acme-load.conf
```

4. Las plantillas mínimas de `http.conf` y `server.conf` con `TLS_SOURCE=acme` (la forma completa, en T010) y el archivo de pruebas (referencia):

```yaml
# docker/compose.acme-test.yaml: se suma a compose.yaml y compose.public.yaml
services:
  pebble:
    image: ghcr.io/letsencrypt/pebble:2.10.1@sha256:<digest de T002>
    command: ['-config', '/test/config/taller-pebble.json']
    environment:
      PEBBLE_VA_NOSLEEP: '1'
    volumes:
      - ./nginx/acme-test/pebble.json:/test/config/taller-pebble.json:ro
    ports: ['127.0.0.1:15000:15000']
    networks: [edge]
  taller:
    environment:
      TALLER_DOMAIN: taller.test
      ACME_DIRECTORY_URL: https://pebble:14000/dir
      ACME_TRUSTED_CA: /run/pebble/pebble.minica.pem
      ACME_CHALLENGE: '${ACME_CHALLENGE:-http-01}'
    volumes:
      - '${PEBBLE_CA_DIR:?el check copia ahí la CA de prueba de Pebble}:/run/pebble:ro'
    ports: !override ['127.0.0.1:18080:8080', '127.0.0.1:18443:8443']
    networks:
      edge: { aliases: [taller.test] }
      web: {}
```

   La CA de prueba de Pebble (`/test/certs/pebble.minica.pem`, pública) vive en su imagen: el check levanta `pebble`, la copia con `docker compose cp pebble:/test/certs/pebble.minica.pem "$PEBBLE_CA_DIR"/` y recién entonces levanta `taller`.

   `pebble.json` fija `httpPort` en 8080, `tlsPort` en 8443 (los puertos internos de `taller`) y una validez corta, que se toma del ejemplo de la imagen (T002): con menos de diez días, el módulo renueva a la mitad de la vida, así que con 180 segundos hay una renovación cada 90.
5. Corré el check con `ACME_CHALLENGE=http-01` y con `tls-alpn-01`. Anotá los números de serie, los fallos de la ráfaga, el tiempo hasta la primera emisión, los mensajes del registro de errores y la versión del módulo.
6. Si HTTP-01 no llega al 8080, probá con `cap_add: [NET_BIND_SERVICE]` y `listen 80` y `listen 443` dentro del contenedor. Si el módulo no corre o no renueva, informá al coordinador: pasa a la opción B de Q1 (R5), que necesita permiso para bajar lego (30,5 MiB) o certbot (81,8 MiB).

**Compuerta:** V1 con su resultado anotado y `acme-check.sh` en verde con HTTP-01; lo que hizo TLS-ALPN-01 registrado. Decide la opción de Q1 y el desafío por omisión (research.md, V1).

### Tarea 1.2 · V2: la CSP con nonce y el editor (T004, F)

- **Modifica:** `frontend/vite.config.ts` (sin `viteSingleFile`, con `html: { cspNonce: '__CSP_NONCE__' }`), que se conserva si V2 pasa.
- **No se versiona:** el `nginx.conf` descartable y el guion de Playwright del spike (en un directorio temporal).

**Pasos:**

1. Sin `vite-plugin-singlefile` (el `import` y la entrada de `plugins`; el paquete lo quita el coordinador en S2), `npm run build`. Anotá: la lista de `dist/` con tamaños, que `dist/index.html` no tiene `<script>` ni `<style>` en línea, que lleva `nonce="__CSP_NONCE__"` en cada etiqueta de Vite y la `<meta property="csp-nonce">`, y si el CSS trae fuentes o imágenes en `data:` (`assetsInlineLimit`).
2. Armá un `nginx.conf` descartable (una copia del de C3a, en un directorio temporal) con la CSP de [contracts/http.md](./contracts/http.md), `sub_filter '__CSP_NONCE__' '$request_id'; sub_filter_once off;` en `location = /index.html`, `etag off;` y la raíz en `dist/`. Servilo con `docker run --rm -p 127.0.0.1:18090:8080 -v …:ro` sobre la imagen base de Nginx (ya está en el daemon). Comprobá con `nginx -V` que `http_sub_module` está.
3. Con Playwright (Chromium, el de F1) y un oyente `document.addEventListener('securitypolicyviolation', …)` registrado antes de cargar la página, recorré: las 8 vistas por hash, los 5 enlaces profundos (`?ejercicio`, `?campana`, `?sistema`, `?mundo` y `?lenguaje`), el editor del laboratorio (el tema con los colores computados de `.cm-editor` y de `.cm-gutters`, la numeración de líneas dibujada, el espaciador con `visibility: hidden`) y la celebración. Sin API: la fuente de contenido es la de A3 o su doble (T001 anota cuál). Contá violaciones y errores de consola.
4. Dos `curl -s -D- http://127.0.0.1:18090/` seguidos: los nonces de la CSP son distintos, el cuerpo lleva el mismo valor que su CSP y no hay `ETag` ni `Last-Modified`.
5. Con permiso del usuario, repetí el recorrido en Firefox (descarga opcional, R23); sin él, anotá que queda como una pasada manual.

**Compuerta:** V2 con su resultado anotado. Si pasa, Q3 queda como está y las tareas T009, T011 y T012 usan lo medido. Si el editor pierde el tema, **se detiene** y el coordinador lleva la decisión al usuario (Q3, opción C): no se degrada la política en silencio.

### Tarea 1.3 · V3a: la publicación en IPv4 explícito (T005, K)

**Pasos (Linux):**

1. Un archivo de Compose descartable, con la imagen `taller` ya construida, que publica `0.0.0.0:18443:8443` y `0.0.0.0:18080:8080`, con un nombre de proyecto propio.
2. `docker compose config --format json | jq '.services.taller.ports'`: los puertos con `host_ip: 0.0.0.0`.
3. `ss -ltn '( sport = :18443 or sport = :18080 )'`: sólo direcciones `0.0.0.0` y ningún `[::]`. Repetí sin la dirección explícita (`'18443:8443'`) para anotar la diferencia.
4. `docker info --format '{{json .}}' | jq '{ipv6: .IPv6, driver: .Driver}'` y, si existe, `/etc/docker/daemon.json`: anotá el proxy de usuario y el IPv6 del daemon.

**Compuerta:** V3a anotada. V3b (desde otra red) se corre en G2 (T026). Si `ss` muestra un `[::]`, K lo informa: se ajusta la publicación antes de T019.

### Tarea 1.4 · V4: los privilegios de `taller_backup` y el tiempo de restauración (T006, D)

**Pasos:**

1. Con el stack local del baseline (T001) y como root, creá una cuenta de prueba `taller_backup_probe` con `RELOAD`, `REPLICATION CLIENT`, y `SELECT`, `SHOW VIEW` sobre `taller.*`. Corré el volcado de R14 dentro de un contenedor de la imagen (`docker run --rm --network <red app del proyecto> -e MYSQL_PWD -v "$PWD/tmp:/out" --entrypoint sh mysql:9.7 -c 'mysqldump -h mysql -utaller_backup_probe --single-transaction --source-data=2 --no-tablespaces --skip-triggers --hex-blob taller | zstd -3 > /out/dump.sql.zst'`, con la contraseña en el entorno del cliente) y mirá el encabezado: `CHANGE REPLICATION SOURCE TO`.
2. Sacá los privilegios de a uno (cada intento en una cuenta nueva) y anotá cuál es el mínimo que funciona y cuál es el error de cada resta. Probá también el mismo volcado con `PROCESS` ausente y sin `--no-tablespaces`, y con `--routines --events`, para anotar qué piden.
3. En el contenedor de MySQL: `SHOW VARIABLES LIKE 'log_bin'` y `SHOW BINARY LOG STATUS`. En la imagen `mysql:9.7`: `command -v flock curl zstd gzip openssl bash microdnf`.
4. Restaurá el volcado en un MySQL descartable (`docker run --rm --tmpfs /var/lib/mysql:rw,size=2g -e MYSQL_ALLOW_EMPTY_PASSWORD=yes mysql:9.7`) y medí el tiempo (`time`).
5. Un volumen mayor: en otro MySQL descartable, un esquema `synthetic` con una tabla de texto largo que se llena duplicando filas (`INSERT INTO t SELECT … FROM t`) hasta unos 1 GiB y 5 GiB. Medí el tamaño crudo y comprimido, el tiempo de volcado y el de restauración, y extrapolá al techo de 20 GB del ADR 0006 §9.
6. Borrá las cuentas y los esquemas de prueba.

**Compuerta:** V4 anotada: los privilegios mínimos, el tamaño, el tiempo y la extrapolación. Decide la lista de `taller_backup` de [data-model.md](./data-model.md) y si `flock` está en la imagen.

### Tarea 1.5 · V5: el destino de los respaldos (T007, B con el usuario)

**Precondición:** el usuario creó la cuenta del destino (acción 3) y T016 entregó `backup.sh probe-destination`. Va en la onda 2, después de T016.

**Pasos:**

1. Con la credencial del host en `.env`: `docker compose run --rm backup probe-destination`. Tiene que dar `ok` en escribir y en sobrescribir, y rechazar leer, listar y borrar.
2. El usuario, con la credencial de lectura, comprueba en la consola o con `rclone lsl --s3-versions` que `probe/<nombre>` tiene dos versiones, que la regla de expiración está en 35 días para las versiones actuales y las anteriores, y en qué país está el almacenamiento (ADR 0006 §13.14).
3. Un envío real con las banderas de R16: `docker compose run --rm backup once --reason manual` termina en 0 con la credencial de sólo `PutObject` (sin listar ni `HEAD`).
4. El usuario borra el objeto de prueba con su credencial.

**Compuerta:** V5 anotada, y SC-009 comprobado. Si no, decide el usuario: otro proveedor, o Q2 en su opción B.

### Tarea 1.6 · S1: los resultados y las decisiones (T008, coordinador)

**Pasos:** anotá en la línea «Resultado» de cada V de research.md lo que informó su dueño (versiones, comandos y cifras); confirmá o devolvé al usuario Q1 y Q3; fijá el desafío por omisión y el mapeo de puertos; actualizá [data-model.md](./data-model.md) (la lista de privilegios de `taller_backup`, los nombres que cambien) y este plan donde un resultado lo corrija; pedí el lote 2 de descargas (T016) y avisá a los dueños de la onda 2.

**Compuerta:** research.md con sus cuatro resultados (V1 a V4), las decisiones de Q1 y Q3 confirmadas por el usuario o devueltas, y S1 avisado.

## 2. Nginx, cabeceras y TLS (dueño N, onda 2)

**Cubre:** FR-004, FR-005, FR-006 a FR-009 (lo que toca a la configuración), FR-012, FR-013, FR-015, FR-016, FR-021, FR-025 y FR-028.

**Entrega:** [contracts/http.md](./contracts/http.md) hecho en la parte de Nginx: las seis cabeceras en todas las clases de respuesta, el nonce, la caché, el cierre de sesión por CSRF, los límites, y la configuración pública con el módulo ACME.

### Tarea 2.1 · Cabeceras, nonce, caché, cierre por CSRF y límites (T009)

- **Modifica:** `docker/nginx/nginx.conf`.
- **Crea:** `docker/nginx/headers.conf`, `docker/nginx/taller.d/{main,http,server}.conf` (las variantes locales) y `qa/nginx-headers-check.ts`.
- **Entrega:** los cambios de [research.md](./research.md) R2, R7 a R10, y el check estático.

**Pasos:**

1. Escribí `qa/nginx-headers-check.ts`, que falla porque `headers.conf` no existe. Prueba, con los valores de FR-013 escritos a mano en el check y no leídos de `headers.conf`:
   - que `docker/nginx/headers.conf` tiene las seis cabeceras, cada una con `always`, y la CSP exacta de [contracts/http.md](./contracts/http.md);
   - que todo bloque `server`, `location` o ubicación con nombre de `docker/nginx/nginx.conf` que contiene una `add_header` incluye `/etc/nginx/taller/headers.conf` (un lector de llaves que respeta las comillas y los comentarios);
   - que `nginx.conf` incluye `/etc/nginx/taller.d/{main,http,server}.conf` en sus tres lugares, que `taller.d/http.conf` define `$hsts_value` y que `$cross_site_write`, `@csrf_rejected` y `error_page 419` existen;
   - que `location = /index.html` tiene `etag off;`, `sub_filter '__CSP_NONCE__' '$request_id';`, `sub_filter_once off;` y `Cache-Control: no-cache`, y `location ^~ /assets/`, `Cache-Control: public, max-age=31536000, immutable`;
   - que los bloques `location ^~ /api/` y `location ^~ /api/runs` (si B2 llegó) son iguales salvo `client_max_body_size`, con la línea de inclusión en el mismo lugar: es lo que exige el check de B2, y este lo comprueba otra vez para no depender de que corra.
2. Implementá con esta referencia (sin ejecutar; sólo lo que cambia respecto de C3a):

```nginx
# docker/nginx/nginx.conf
include /etc/nginx/taller.d/main.conf;
worker_processes auto;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 1024; }
http {
    # … lo de C3a (mime, registros, zonas limit_req, log_format api, resolver, gzip, temporales) …
    limit_conn_zone $binary_remote_addr zone=perip:10m;
    limit_conn_status 429;
    client_header_timeout 10s;
    client_body_timeout 20s;
    send_timeout 30s;
    keepalive_timeout 30s;
    reset_timedout_connection on;
    map "$request_method:$http_sec_fetch_site" $cross_site_write {
        default 0;
        ~^(POST|PUT|PATCH|DELETE):(cross-site|same-site)$ 1;
    }
    include /etc/nginx/taller.d/http.conf;       # define $hsts_value, y en público el emisor ACME y los otros servidores
    server {
        include /etc/nginx/taller.d/server.conf; # local: `listen 8080;`
        limit_conn perip 300;
        absolute_redirect off;
        root /usr/share/nginx/html;
        index index.html;
        charset utf-8;
        include /etc/nginx/taller/headers.conf;
        if ($cross_site_write) { return 419; }
        error_page 419 = @csrf_rejected;
        location = /healthz { access_log off; default_type text/plain; return 200 'ok\n'; }
        location = /favicon.ico { access_log off; log_not_found off; return 204; }
        location ^~ /api/ {
            # … las directivas de C3a, con la línea de inclusión en lugar de las tres `add_header` repetidas:
            include /etc/nginx/taller/headers.conf;
            add_header X-Request-Id $request_id always;
            # …
        }
        # location ^~ /api/runs { … } (B2: repite el bloque de arriba y suma client_max_body_size 192k)
        location @too_many_requests {
            default_type application/json;
            include /etc/nginx/taller/headers.conf;
            add_header Retry-After 1 always;
            return 429 '{"message":"Demasiados intentos. Esperá un momento antes de volver a probar.","code":"too_many_requests"}';
        }
        location @csrf_rejected {
            default_type application/json;
            include /etc/nginx/taller/headers.conf;
            return 419 '{"message":"La página venció: recargala e intentá de nuevo.","code":"csrf_token_mismatch"}';
        }
        location = /index.html {
            etag off;
            sub_filter '__CSP_NONCE__' '$request_id';
            sub_filter_once off;
            add_header Cache-Control "no-cache" always;
            include /etc/nginx/taller/headers.conf;
        }
        location ^~ /assets/ {
            add_header Cache-Control "public, max-age=31536000, immutable" always;
            include /etc/nginx/taller/headers.conf;
            try_files $uri =404;
        }
        location / { try_files $uri $uri/ =404; }
    }
}
```

   Los archivos locales de `taller.d/` son tres líneas en total: `main.conf` vacío (un comentario), `http.conf` con `map $scheme $hsts_value { default ""; }` y `server.conf` con `listen 8080;`.
3. `docker compose build taller` y `docker compose run --rm --no-deps --entrypoint nginx taller -t` dice `successful`. Con el stack local arriba, comprobá a mano una URL de cada clase de [contracts/http.md](./contracts/http.md) con `curl -sI`, y el cierre por CSRF: `curl -s -D- -X POST -H 'Sec-Fetch-Site: cross-site' http://127.0.0.1:$TALLER_PORT/api/auth/logout` da 419 con el cuerpo JSON y sin `Set-Cookie`, y el mismo pedido con `Sec-Fetch-Site: same-origin` llega a PHP.
4. `node qa/nginx-headers-check.ts`, `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`: verdes. El `api:smoke` de C3a cuenta una sola `Content-Security-Policy` en `/api/up`: el include no la duplica.

**Compuerta:** el check estático en verde, `nginx -t` correcto, los checks de C3a contra el stack local en verde y las clases 1 a 5, 7 y 9 a 12 con las seis cabeceras comprobadas a mano (T020 las automatiza).

### Tarea 2.2 · La configuración pública y la imagen (T010)

- **Crea:** `docker/nginx/public/{http.conf.template,http-acme.conf.template,server.conf.template,server-acme.conf.template,server-static.conf.template,validate.sh,entrypoint.sh}` y `qa/nginx-public-check.ts`.
- **Modifica:** `frontend/Dockerfile`.
- **Entrega:** la imagen que sirve los dos modos, con el módulo ACME, el entrypoint público y las plantillas de [research.md](./research.md) R3 a R6.

**Pasos:**

1. Escribí `qa/nginx-public-check.ts`, que falla porque las plantillas no existen. Es puro (Node, sin Docker ni `envsubst`: reemplaza `${NOMBRE}` él mismo):
   - todo `${X}` de las plantillas está en la lista de variables de `entrypoint.sh` y en la tabla de [contracts/console.md](./contracts/console.md);
   - con valores de ejemplo, el render no deja ningún `${` sin reemplazar y contiene `server_name taller.test;`, `listen 8443 ssl;`, `http2 on;`, `ssl_protocols TLSv1.2 TLSv1.3;`, las seis suites de la guía de Mozilla (escritas a mano en el check), `ssl_session_tickets off;` y `ssl_prefer_server_ciphers off;`;
   - el servidor por omisión del 8443 tiene `ssl_reject_handshake on;` y `return 421;`, y el del 8080, `return 444;`;
   - el 301 usa `https://taller.test$request_uri` y ninguna plantilla usa `$host` para armarlo;
   - `acme_certificate letsencrypt key=ecdsa:256;` y `$acme_certificate` sólo en la variante ACME, y `ssl_certificate /run/taller-tls/tls.crt;` sólo en la estática;
   - existe el servidor `127.0.0.1:8081` con `/healthz`;
   - `validate.sh` (se carga con `sh -c '. validate.sh; validate_env'`): acepta el juego de variables de ejemplo y rechaza, con el código 64 y un mensaje en español, un dominio con `;` o con mayúsculas, un contacto sin `@`, `ACME_ACCEPT_TOS=no`, un directorio que no es `https://`, `ACME_CHALLENGE=dns-01`, `HSTS_MAX_AGE=abc`, `TLS_SOURCE=otro` y `TLS_SOURCE=static` sin los archivos del certificado.
2. Implementá, con esta referencia (sin ejecutar):

```sh
#!/bin/sh
# docker/nginx/public/entrypoint.sh
set -eu
src=/usr/local/share/taller/nginx-public
out=/etc/nginx/taller.d
. "$src/validate.sh"
validate_env || exit 64
ACME_PROFILE_LINE=""; [ -n "${ACME_PROFILE:-}" ] && ACME_PROFILE_LINE="profile ${ACME_PROFILE};"
ACME_TRUSTED_CA_LINE=""; [ -n "${ACME_TRUSTED_CA:-}" ] && ACME_TRUSTED_CA_LINE="ssl_trusted_certificate ${ACME_TRUSTED_CA};"
export ACME_PROFILE_LINE ACME_TRUSTED_CA_LINE
vars='${TALLER_DOMAIN} ${ACME_CONTACT} ${ACME_DIRECTORY_URL} ${ACME_CHALLENGE} ${ACME_PROFILE_LINE} ${ACME_TRUSTED_CA_LINE} ${HSTS_MAX_AGE}'
render() { envsubst "$vars" < "$src/$1.conf.template"; }
if [ "$TLS_SOURCE" = acme ]; then
  echo 'load_module modules/ngx_http_acme_module.so;' > "$out/main.conf"
  { render http; render http-acme; } > "$out/http.conf"
  { render server; render server-acme; } > "$out/server.conf"
else
  : > "$out/main.conf"
  render http > "$out/http.conf"
  { render server; render server-static; } > "$out/server.conf"
fi
nginx -t
[ "${1:-}" = --check ] && exit 0
exec nginx -g 'daemon off;'
```

```nginx
# http.conf.template (el resto de las plantillas, en research.md R3 a R6)
map $scheme $hsts_value { https "max-age=${HSTS_MAX_AGE}"; default ""; }
server { listen 8443 ssl default_server; ssl_reject_handshake on; return 421; }
server { listen 8080 default_server; return 444; }
server {
    listen 8080;
    server_name ${TALLER_DOMAIN};
    access_log /dev/stdout api;
    include /etc/nginx/taller/headers.conf;
    location / { return 301 https://${TALLER_DOMAIN}$request_uri; }
}
server { listen 127.0.0.1:8081; access_log off; location = /healthz { default_type text/plain; return 200 'ok\n'; } }
```

3. `frontend/Dockerfile` (referencia): la etapa `acme` de T003; en la etapa final, `USER root`, el `COPY` del módulo, de `nginx.conf`, de `headers.conf` (a `/etc/nginx/taller/`), de `taller.d/` (a `/etc/nginx/taller.d/`) y de `docker/nginx/public/` (a `/usr/local/share/taller/nginx-public/`), el entrypoint con `--chmod=0755` a `/usr/local/bin/taller-public-entrypoint`, la creación de `/var/lib/taller/acme` con `chown 101:101` y modo 0700, un `RUN` que carga el módulo con una configuración mínima y otro con `nginx -t`, y `USER 101`. El `ENTRYPOINT ["nginx"]` y el `HEALTHCHECK` no cambian (son los del modo local).
4. `docker compose build taller`; con un certificado de prueba generado con `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -subj /CN=taller.test -days 2 -keyout $T/tls.key -out $T/tls.crt` en un directorio temporal: `docker run --rm -e TALLER_DOMAIN=taller.test -e TLS_SOURCE=static -e HSTS_MAX_AGE=300 … --tmpfs /etc/nginx/taller.d:rw,uid=101,gid=101 -v $T:/run/taller-tls:ro --entrypoint /bin/sh <imagen> /usr/local/bin/taller-public-entrypoint --check` termina en 0.
5. `acme-check.sh` de T003, ahora con la configuración definitiva: verde. `node qa/nginx-public-check.ts` y `node qa/nginx-headers-check.ts`: verdes. Los checks de C3a contra el stack local, otra vez.

**Compuerta:** los dos checks estáticos en verde, la imagen construye, la variante estática pasa `nginx -t` y `acme-check.sh` sigue en verde.

## 3. Front y build (dueño F, onda 2)

**Cubre:** FR-016 a FR-020 y FR-023; SC-004, SC-005 y SC-013.

**Entrega:** el build en varios archivos con huella, sin `<script>` ni `<style>` en línea, el nonce en el editor y la guardia de regresión.

### Tarea 3.1 · Sin `vite-plugin-singlefile`, y el contrato de varios archivos (T011)

- **Modifica:** `frontend/vite.config.ts`, `qa/build-check.ts` y `qa/lib/built-page.ts`.
- **Entrega:** `dist/index.html` y `dist/assets/` con la huella en el nombre. El paquete se quita en S2 (línea de integración).

**Pasos:**

1. Reescribí primero `qa/build-check.ts` para el contrato nuevo, que falla con el build de hoy: `dist/index.html` enlaza sus scripts (`<script type="module" src>`) y sus hojas (`<link rel="stylesheet" href>`), sin `<script>` ni `<style>` en línea; todo archivo que nombra existe en `dist/`; no nombra nada externo (`http://` ni `https://` en un `src` o `href`); cada etiqueta de Vite lleva `nonce="__CSP_NONCE__"` y hay una `<meta property="csp-nonce">`; los nombres de `dist/assets/` llevan huella; `EDITOR-LICENSES.txt` y `THIRD-PARTY-NOTICES.txt` están en `dist/`; los avisos del editor, de React y de fflate están en los archivos de JS; y los topes de tamaño por archivo y en total (`piso(medido × 1,10)` redondeado hacia abajo a la decena de miles, medidos en el primer build). `assertSinglefileDocument` de A2 se reemplaza por esta comprobación.
2. `qa/lib/built-page.ts`: `readBuiltPage()` devuelve en `scripts` los archivos que enlaza el HTML en el orden de carga, `bootText` es el HTML más esos archivos y `bootSize` es lo que mide el tope; `evaluateBuiltPage()` resuelve los `import` relativos entre los archivos de `dist/`. Los checks de A2 siguen leyendo la página sólo por este módulo.
3. `frontend/vite.config.ts`: sin `viteSingleFile` y con `html: { cspNonce: '__CSP_NONCE__' }`; se conservan el aviso de licencia de React y `build.target`. Según V2, ajustá `build.assetsInlineLimit` si hay fuentes o imágenes en `data:` que la política bloquee.
4. `npm run build && node qa/build-check.ts && npm test`: verdes (con el paquete todavía instalado; sólo no se importa). `git diff` de `package.json` vacío: lo toca el coordinador.

**Compuerta:** `npm test` y `npm run lint` en verde con el build en varios archivos, y el recorrido de V2 repetido con este build.

### Tarea 3.2 · El nonce en el editor (T012)

- **Crea:** `frontend/src/shared/lib/csp-nonce.ts` y `csp-nonce.spec.ts`.
- **Modifica:** `frontend/src/shared/ui/code-editor/mount-code-editor.ts`.

**Pasos:**

1. `csp-nonce.spec.ts` (Vitest, el de F1) primero: `readCspNonce(documento)` devuelve el `nonce` de `<meta property="csp-nonce">` cuando es un valor real (32 hexadecimales), y `undefined` cuando no hay meta, cuando el nonce está vacío o cuando todavía es el marcador `__CSP_NONCE__` (`npm run dev`, la vista previa sin Nginx). El valor se lee de la propiedad `nonce` del elemento, no de `getAttribute`: el navegador oculta el atributo. Un doble mínimo de documento alcanza.
2. Implementá `export function readCspNonce(doc: Pick<Document, 'querySelector'> = document): string | undefined`.
3. En `mount-code-editor.ts`, agregá `EditorView.cspNonce.of(nonce)` a las extensiones sólo cuando `readCspNonce()` devuelve un valor.
4. `npm test`, `npm run lint`, `npm run format:check` y `npm run typecheck`. El editor bajo la CSP real lo comprueba el recorrido de T021.

**Compuerta:** el spec en verde y las comprobaciones habituales; el editor se verá con su tema en T021 (y ya lo vio V2).

### Tarea 3.3 · La guardia de regresión de la política (T013)

- **Crea:** `qa/csp-guard-check.ts`.

**Pasos:**

1. Escribí el check con casos que fallan primero: fixtures con un `<script>` en línea, un `<style>` en línea, un manejador `onclick=` dentro de una plantilla de HTML, `eval(`, `new Function(` y una URL `javascript:`, cada uno con el archivo y la línea que el check tiene que citar. Los valores prohibidos salen de la política de [contracts/http.md](./contracts/http.md) y de la lista de MDN para `script-src` y `style-src`, no del algoritmo del check. Un fixture limpio pasa.
2. Que escanee `dist/index.html` y el código propio de las vistas (`frontend/*.js`, `frontend/src/**`, sin `node_modules` ni lo empaquetado de terceros). **No** considera una violación un atributo `style=` ni una asignación a `style.cssText`: `style-src-attr 'unsafe-inline'` los permite (FR-017).
3. Corrido sobre el repositorio con el build de T011, pasa. No ve el código de terceros que se empaqueta (CodeMirror, React): para eso manda el recorrido del navegador (V2 y T021).
4. El coordinador lo suma a `qa/run-checks.ts` en S2.

**Compuerta:** el check falla ante cada fixture, cita archivo y línea, y pasa sobre el repositorio.

## 4. Usuarios de MySQL (dueño D, onda 2)

**Cubre:** FR-030 a FR-033; SC-007.

**Entrega:** el SQL de roles en dos fases, el script que lo aplica con las contraseñas de `.env`, el inicio de un volumen nuevo, el aviso de un usuario que falta y la prueba de la matriz.

### Tarea 4.1 · `db-grants.sql` con los roles, `apply-grants.sh` y el inicio de MySQL (T014)

- **Modifica:** `docker/mysql/db-grants.sql`, `backend/api/docker/migrate.sh` y `backend/api/tests/Unit/MigrateScriptTest.php`.
- **Crea:** `docker/mysql/apply-grants.sh`, `docker/mysql/10-db-grants.sh` y `qa/apply-grants-check.ts`.
- **Entrega:** la interfaz de [contracts/console.md](./contracts/console.md), «`grants` y `db-grants`». K la ensambla en Compose (T018).

**Pasos:**

1. Escribí `qa/apply-grants-check.ts` (Node puro, con un `mysql` falso en el `PATH` que vuelca sus argumentos y su entrada estándar a archivos), que falla porque el script no existe. Con el juego de contraseñas de ejemplo comprueba, con `--phase users --host mysql`:
   - las dos primeras líneas de lo que recibe `mysql` son `SET SESSION sql_log_bin = 0;` y `SET SESSION lock_wait_timeout = 5;`;
   - no queda ningún `@@` sin sustituir, y las contraseñas están en la entrada y **no** en los argumentos;
   - sólo aparece la sección pedida: `users` contiene `CREATE USER IF NOT EXISTS 'taller_app'@'%'` y `ALTER USER 'taller_app'@'%'` y ningún `GRANT … ON \`taller\`.\`exercises\``; `tables`, al revés, y la sentencia de retiro de `taller`; `all`, las dos;
   - sin `--host`, el `mysql` falso no recibe `-h`;
   - una contraseña de 10 caracteres, con una comilla o ausente, y `--phase otra`, salen con 64 y un mensaje en español.
2. `docker/mysql/db-grants.sql`: conservá el comentario de cabecera de C3a (único archivo de usuarios y privilegios, idempotente) y escribilo con dos secciones. Referencia, sin ejecutar:

```sql
-- @phase users
CREATE USER IF NOT EXISTS 'taller_migrate'@'%' IDENTIFIED BY '@@MIGRATE_DB_PASSWORD@@';
ALTER USER 'taller_migrate'@'%' IDENTIFIED BY '@@MIGRATE_DB_PASSWORD@@';
-- … lo mismo para taller_app, taller_runs, taller_mail y taller_backup …
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON `taller`.* TO 'taller_migrate'@'%';
GRANT SELECT ON performance_schema.events_transactions_current TO 'taller_migrate'@'%';
GRANT RELOAD, REPLICATION CLIENT ON *.* TO 'taller_backup'@'%';
GRANT SELECT, SHOW VIEW ON `taller`.* TO 'taller_backup'@'%';

-- @phase tables
GRANT SELECT ON `taller`.`exercises` TO 'taller_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `taller`.`users` TO 'taller_app'@'%';
-- … una línea por tabla y por rol, desde la matriz de data-model.md §3, con sus permisos por columna para taller_mail …

-- El usuario `taller` de C1 a C3a se retira cuando ninguna sesión suya sigue conectada.
SET @taller_sessions = (SELECT COUNT(*) FROM performance_schema.threads WHERE PROCESSLIST_USER = 'taller');
SET @retire = IF(@taller_sessions = 0 AND EXISTS (SELECT 1 FROM mysql.user WHERE user = 'taller' AND host = '%'),
                 'DROP USER ''taller''@''%''', 'DO 0');
PREPARE retire FROM @retire; EXECUTE retire; DEALLOCATE PREPARE retire;
```

   `DROP USER` quita la cuenta y todos sus privilegios: es el retiro de FR-030. Un `taller` con sesiones queda como está, y `apply-grants.sh` lo dice.
3. `docker/mysql/apply-grants.sh` (referencia):

```sh
#!/bin/sh
set -eu
phase=all; host=""
while [ $# -gt 0 ]; do
  case "$1" in
    --phase) phase=$2; shift 2 ;;
    --host) host=$2; shift 2 ;;
    *) echo "uso: apply-grants.sh [--phase users|tables|all] [--host <nombre>]" >&2; exit 64 ;;
  esac
done
case "$phase" in users|tables|all) ;; *) echo "fase inválida: $phase" >&2; exit 64 ;; esac
sql=${DB_GRANTS_SQL:-/db-grants.sql}
for role in APP RUNS MAIL MIGRATE BACKUP; do
  eval "value=\${${role}_DB_PASSWORD:-}"
  case "$value" in ''|*[!A-Za-z0-9._~-]*) echo "${role}_DB_PASSWORD falta o tiene caracteres inválidos (sh backend/api/scripts/init-env.sh)" >&2; exit 64 ;; esac
  [ "${#value}" -ge 24 ] && [ "${#value}" -le 128 ] || { echo "${role}_DB_PASSWORD debe tener de 24 a 128 caracteres" >&2; exit 64; }
done
section() { awk -v want="$1" '/^-- @phase /{ on = (want == "all" || $3 == want); next } on { print }' "$sql"; }
render() {
  echo 'SET SESSION sql_log_bin = 0;'
  echo 'SET SESSION lock_wait_timeout = 5;'
  section "$phase" | sed -e "s/@@APP_DB_PASSWORD@@/$APP_DB_PASSWORD/g" -e "s/@@RUNS_DB_PASSWORD@@/$RUNS_DB_PASSWORD/g" \
    -e "s/@@MAIL_DB_PASSWORD@@/$MAIL_DB_PASSWORD/g" -e "s/@@MIGRATE_DB_PASSWORD@@/$MIGRATE_DB_PASSWORD/g" -e "s/@@BACKUP_DB_PASSWORD@@/$BACKUP_DB_PASSWORD/g"
}
MYSQL_PWD=$MYSQL_ROOT_PASSWORD
export MYSQL_PWD
render | mysql -uroot ${host:+-h "$host"} --batch
```

   El `lock_wait_timeout` de 5 segundos hace que un permiso que espera un bloqueo de metadatos falle en lugar de colgar un despliegue.
4. `docker/mysql/10-db-grants.sh`: `exec /usr/local/bin/apply-grants.sh --phase users`, ejecutable en Git (`git update-index --chmod=+x`).
5. **El aviso de un usuario que falta, en `backend/api/docker/migrate.sh`.** Primero, en `MigrateScriptTest` (con su `php` falso), dos escenarios que fallan: el chequeo previo imprime `SQLSTATE[HY000] [1045] Access denied for user 'taller_migrate'@'…'` y sale con 1 → el script sale con 1 sin llamar a `migrate` y su salida dice «El usuario de MySQL no existe en este volumen: corré `docker compose --profile ops run --rm db-grants` (o `sh backend/api/scripts/deploy.sh`)»; y los escenarios existentes no cambian. Después, en `migrate.sh`: la salida del chequeo se captura y se muestra; si trae `Access denied for user`, suma el aviso; sale con el estado del chequeo.
6. Contra un MySQL descartable (`docker run --rm --tmpfs /var/lib/mysql:rw,size=1g -e MYSQL_ROOT_PASSWORD=… mysql:9.7`): con tablas vacías de los nombres de la matriz creadas a mano, la fase `tables` corre sin error; sin las tablas, falla (la regla del `CREATE`), que es lo que justifica el orden. La fase `users` corre dos veces seguidas sin error; cambiar una contraseña y volver a correrla la actualiza.

**Compuerta:** `qa/apply-grants-check.ts` y los dos escenarios nuevos de `MigrateScriptTest` en verde, y el SQL probado contra un MySQL descartable. T015 prueba la matriz completa con el stack.

### Tarea 4.2 · La prueba de la matriz (T015)

- **Crea:** `qa/api-grants-check.ts` y `qa/fixtures/mysql-roles.json`.
- **Depende de** T018 (los roles en la base de Compose). Escribí el fixture y el check antes, y corrélo contra el stack cuando K lo entregue.

**Pasos:**

1. `qa/fixtures/mysql-roles.json`, a mano desde la tabla de [data-model.md](./data-model.md) §3 (la forma está ahí), y no desde `db-grants.sql`.
2. `qa/api-grants-check.ts`: con las contraseñas de `.env`, que se pasan al cliente con `docker compose exec -T -e MYSQL_PWD mysql mysql -u<rol> …` (la variable sin valor en la línea de comandos toma el del entorno: no aparece en `ps`), para cada rol, tabla y operación genera una sonda sin efectos (`SELECT … LIMIT 0`; `UPDATE … SET c = c WHERE 1 = 0`; `DELETE … WHERE 1 = 0`; `INSERT … SELECT … WHERE 1 = 0`) y exige que funcione sólo donde la matriz lo concede, y el error 1142, 1143 o 1044 donde no. Además, para cada rol: un DDL, un `GRANT`, `SELECT … INTO OUTFILE` y `SELECT * FROM mysql.user` fallan. Y para toda la base: `SHOW GRANTS` de cada cuenta coincide con el fixture; no hay triggers, rutinas ni eventos en `taller`; todas las tablas de `information_schema.tables` están en la matriz o en `tablesWithoutAccess`; el usuario `taller` no existe; y ninguna sesión de `performance_schema.threads` es de `root` o de `taller` fuera de las del propio check.
3. Con el stack local y los roles (T018), el check pasa. Mutaciones, que se revierten: un `GRANT DELETE ON taller.exercises TO 'taller_app'@'%'` a mano lo hace fallar; una tabla nueva sin fila en la matriz, también.
4. En un volumen que tenía a `taller` (un stack creado con el `docker/compose.yaml` de antes de C4, con `docker compose up` de la rama vieja): `sh backend/api/scripts/deploy.sh` deja a los servicios con sus usuarios, `curl -s http://127.0.0.1:$TALLER_PORT/api/up` en un bucle durante el despliegue no registra ningún fallo, y el check pasa.

**Compuerta:** `npm run api:grants:check` en verde con las dos mutaciones fallando, y el traspaso de un volumen viejo sin interrupción, anotado.

## 5. Respaldos (dueño B, onda 2)

**Cubre:** FR-034 a FR-042; SC-008 y SC-009.

**Entrega:** la imagen y el script de respaldo con su prueba de punta a punta contra un S3 local, y la restauración en sus dos partes.

### Tarea 5.1 · La imagen y el script de respaldo (T016)

- **Crea:** `docker/backup/{Dockerfile,backup.sh,verified-tables.txt}`, `docker/compose.backup-test.yaml` y `backend/api/scripts/backup-check.sh`.
- **Depende de** el lote 2 de descargas (`age`, `rclone` y, si falta, `curl`) y del servicio `backup` de T019 (K lo entrega primero; mientras, usá un archivo propio sin versionar).

**Pasos:**

1. Con el permiso del lote 2, anotá los digests y sha256. Primero `docker run --rm --entrypoint sh mysql:9.7 -c 'command -v flock curl zstd gzip openssl bash'` (V4 ya lo anotó): lo que falte se decide ahora.
2. Escribí `backup-check.sh` con sus casos, que fallan porque no hay imagen. Contra `docker/compose.backup-test.yaml` (un servicio `s3` con `rclone serve s3` de la misma imagen y un servidor HTTP de juguete que registra el latido), con una clave `age` de prueba generada con `age-keygen` de la propia imagen:
   - (a) `once` sube un objeto con el nombre de la forma de [data-model.md](./data-model.md) §4, y sin la identidad `age -d` no lo abre; con ella, el tar tiene los miembros esperados;
   - (b) `manifest.json` es válido (`format`, `binlog.file`, `binlog.position`, conteos antes y después de cada tabla); `dump.sql.zst` trae `CHANGE REPLICATION SOURCE TO`; con `account_deletions` ausente, `ledger.present` es `false` y no falla; con la tabla, `ledger.tsv` lleva el encabezado y las fechas en UTC;
   - (c) `sessions`, `cache`, `cache_locks`, `jobs`, `mail_jobs` y `failed_jobs` están sólo en `structure.sql`, y el volcado no tiene ningún `INSERT INTO` de ellas;
   - (d) con el S3 detenido, `once` sale con 2, deja el cifrado en `/spool/pending/`, escribe `last-failure.json` y no manda el latido; con el S3 de vuelta, el siguiente `once` sube lo pendiente primero;
   - (e) con `BACKUP_SPOOL_MAX_MIB` chico, sale con 4 y no borra lo que espera;
   - (f) el latido llega sólo después de subir, y `BACKUP_HEARTBEAT_FAIL_URL` después de un fallo;
   - (g) la exclusión de FR-040 en los dos órdenes: con un `once` largo (una pausa de prueba por variable de entorno), `deploy-begin` espera y después vuelve; y con la marca puesta, el bucle posterga y corre cuando se borra;
   - (h) el contenedor: sin puertos, disco de sólo lectura, `cap_drop: ALL`, usuario no root y sin el socket de Docker (`docker inspect`);
   - (i) `probe-destination` imprime una línea por capacidad y sale con 70 cuando la lectura funciona (el S3 local no tiene permisos finos: el caso fija el formato y el código).
3. `docker/backup/Dockerfile` (referencia): `FROM mysql:9.7@sha256:<el de compose.yaml>`; `ADD --checksum=sha256:cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10 https://github.com/FiloSottile/age/releases/download/v1.3.2/age-v1.3.2-linux-amd64.tar.gz /tmp/age.tar.gz` y su descompresión a `/usr/local/bin`; `COPY --from=rclone/rclone:1.75.1@sha256:<digest> /usr/local/bin/rclone /usr/local/bin/rclone`; `COPY --chmod=0755 backup.sh /usr/local/bin/backup.sh` y `verified-tables.txt`; `RUN mkdir -p /spool /state && chown 999:999 /spool /state`; `USER 999`; `ENTRYPOINT ["/usr/local/bin/backup.sh"]`.
4. `backup.sh` (referencia por etapas, sin ejecutar). Las etapas son funciones con nombre y `once` las encadena; cada una escribe a `last-failure.json` con su nombre si falla:

```sh
#!/bin/sh
set -eu
# subcomandos: loop | once [--reason …] [--drill] | status | deploy-begin | deploy-end | probe-destination
once() {
  acquire_lock            # flock -w 900 /spool/.lock, o mkdir; sale con 3 si no lo consigue
  check_spool_space       # sale con 4 si lo que espera + 2 × el último volcado supera BACKUP_SPOOL_MAX_MIB
  upload_pending          # lo que quedó de una corrida anterior
  measure before          # COUNT(*) de todas las tablas y CHECKSUM TABLE de verified-tables.txt
  dump_main               # mysqldump … | zstd -3 > work/dump.sql.zst
  dump_structure          # --no-data de las seis tablas efímeras > work/structure.sql
  copy_ledger             # SELECT … FROM account_deletions → work/ledger.tsv, si existe
  measure after
  write_manifest          # work/manifest.json, con la posición del binlog de dump.sql.zst
  seal                    # tar … | age -r … > spool/work/<nombre>.part && mv a spool/pending/
  upload                  # rclone copyto --no-check-dest --s3-no-check-bucket --s3-no-head
  record_success          # borra la copia local, escribe last-success.json y manda el latido
}
```

   La contraseña de MySQL va a un archivo de opciones en `/tmp` (modo 600) armado al empezar; `mysqldump` y `mysql` lo leen con `--defaults-extra-file`. El destino se configura con `RCLONE_CONFIG_DEST_*` armadas desde `BACKUP_S3_*`; los destinatarios de `age` salen de `BACKUP_AGE_RECIPIENTS` (uno `-r` por clave).
5. `docker/backup/verified-tables.txt`: las tablas de cuentas, progreso e intentos de la matriz (`users`, `invitations`, `progress_heads`, `exercise_progress`, `attempts`, `attempt_tests`, `account_deletions` y las de D1 cuando existan).
6. `docker compose -f compose.yaml -f docker/compose.public.yaml -f docker/compose.backup-test.yaml config` es válido; `sh backend/api/scripts/backup-check.sh`: verde.

**Compuerta:** `backup-check.sh` en verde con todos sus casos y, si ya hay un volcado real, su manifiesto leído a mano. SC-009 con el S3 real queda para V5.

### Tarea 5.2 · La restauración, en sus dos partes (T017)

- **Crea:** `backend/api/scripts/restore-check.sh`.
- **Amplía:** `backend/api/scripts/backup-check.sh` con los casos de restauración.

**Pasos:**

1. Los casos primero, que fallan porque el script no existe:
   - (a) la restauración completa del objeto que dejó el respaldo, con la clave de prueba y el S3 local: sale con 0, con 0 diferencias y una línea `AAAA-MM-DD completa <bytes> <segundos> ok`;
   - (b) mutaciones que tienen que fallar: un byte cambiado en el objeto (sale con 2); una fila borrada del volcado antes de sellarlo, con un gancho de prueba (sale con 1 y nombra la tabla); sin `--identity` (64);
   - (c) una tabla que cambió entre las dos medidas del manifiesto sale «no concluyente» y no hace fallar el check;
   - (d) el simulacro (`--pitr`): genera 20 sesiones con `GET /api/session`, copia el binlog, restaura el volcado sin cifrar y lo recupera hasta la posición actual; la tabla `sessions` restaurada tiene al menos 20 filas más que la del volcado y no más que la del origen; y sin aplicar el binlog el caso falla;
   - (e) el volcado sin cifrar del simulacro no queda en `/spool/drill/` al terminar, haya pasado o fallado.
2. Implementá según [research.md](./research.md) R18 y [contracts/console.md](./contracts/console.md): el proyecto `taller-restore-<fecha>` y su red propia, el MySQL 9.7 descartable con tmpfs, la comparación con la regla del manifiesto, `taller:reapply-deletions` con la imagen `php` (omitido si no existe el libro o el comando, y dicho), la medida del tiempo y la línea de salida.
3. Sin tocar nunca el proyecto `taller-publico` ni sus volúmenes: el script se niega a correr si `COMPOSE_PROJECT_NAME` es el del stack real.

**Compuerta:** los casos (a) a (e) en verde. La restauración con la clave y el destino reales la presencia el usuario en G1 (T025).

## 6. Compose y operación (dueño K, onda 2)

**Cubre:** FR-001 a FR-003, FR-011, FR-024, FR-029, FR-030, FR-032, FR-038 y FR-040.

**Entrega:** la base de Compose con los roles, el archivo público y `public.sh`.

### Tarea 6.1 · La base de Compose, `init-env.sh` y `deploy.sh` (T018)

- **Modifica:** `docker/compose.yaml`, `backend/api/scripts/init-env.sh`, `backend/api/scripts/deploy.sh` y `backend/api/.env.example`.
- **Crea:** `backend/api/scripts/compose-check.sh`.
- **Depende de** T014 para verificar el stack (los archivos de D). Escribí los cambios y el check antes; el coordinador integra T014 apenas se entrega.

**Pasos:**

1. Escribí primero `backend/api/scripts/compose-check.sh` (parte local), que falla con el Compose de hoy: con `docker compose config --format json` y `jq` (el script dice «instalá jq» si falta) comprueba:
   - el único servicio con `ports` es `taller`, con `127.0.0.1:8080→8080` (con `TALLER_PORT` por omisión);
   - `grants` está entre los servicios y no es de un perfil, `db-grants` no está sin el perfil `ops` y sí con él;
   - `php`, `scheduler` y `migrate` tienen cada uno el `DB_USERNAME` de su rol (`taller_app`, `taller_app`, `taller_migrate`), y `worker-runs` y `worker-mail`, si existen, los suyos; ningún servicio tiene `DB_USERNAME` igual a `root` o a `taller`;
   - `mysql` no tiene `MYSQL_USER` ni `MYSQL_PASSWORD`, tiene las cinco contraseñas y el comando suma las dos opciones del binlog;
   - `php`, `scheduler` y los workers dependen de `grants`;
   - las cookies y `APP_URL` de cada servicio de Laravel son las locales, y con `TALLER_APP_URL=https://x.test TALLER_SESSION_COOKIE=__Host-s … docker compose config` cambian en todos;
   - `docker compose config --services` y `--volumes` difieren del anotado en T001 sólo en `grants`.
2. Implementá en `docker/compose.yaml` con esta referencia (sólo lo que cambia respecto de C3a):

```yaml
x-laravel-env: &laravel-env
  APP_URL: '${TALLER_APP_URL:-http://localhost:${TALLER_PORT:-8080}}'
  SESSION_COOKIE: '${TALLER_SESSION_COOKIE:-taller-session}'
  SESSION_SECURE_COOKIE: '${TALLER_SESSION_SECURE:-false}'
  DEVICE_COOKIE_NAME: '${TALLER_DEVICE_COOKIE:-taller-device}'
  DEVICE_COOKIE_SECURE: '${TALLER_DEVICE_SECURE:-false}'
  # sin DB_USERNAME ni DB_PASSWORD: cada servicio fija los de su rol
  # … el resto, como está …
x-db-app: &db-app
  DB_USERNAME: taller_app
  DB_PASSWORD: '${APP_DB_PASSWORD:?falta APP_DB_PASSWORD en .env (sh backend/api/scripts/init-env.sh)}'
# x-db-migrate (taller_migrate), x-db-runs (taller_runs) y x-db-mail (taller_mail), igual
x-grants: &grants
  image: *mysql-image
  entrypoint: ['/usr/local/bin/apply-grants.sh']
  environment:
    MYSQL_ROOT_PASSWORD: '${MYSQL_ROOT_PASSWORD:?falta MYSQL_ROOT_PASSWORD en .env}'
    APP_DB_PASSWORD: '${APP_DB_PASSWORD:?…}'
    # … las otras cuatro contraseñas …
  volumes:
    - ./docker/mysql/db-grants.sql:/db-grants.sql:ro
    - ./docker/mysql/apply-grants.sh:/usr/local/bin/apply-grants.sh:ro
  networks: [app]
  dns: ['127.0.0.1']
  restart: 'no'
services:
  php:
    environment: { <<: [*laravel-env, *db-app] }
    depends_on:
      mysql: { condition: service_healthy }
      grants: { condition: service_completed_successfully }
  grants:
    <<: *grants
    command: ['--phase', 'tables', '--host', 'mysql']
    depends_on:
      mysql: { condition: service_healthy }
      migrate: { condition: service_completed_successfully }
  db-grants:
    <<: *grants
    profiles: [ops]
    command: ['--phase', 'all', '--host', 'mysql']
    depends_on:
      mysql: { condition: service_healthy }
  mysql:
    # sin MYSQL_USER ni MYSQL_PASSWORD; con las cinco contraseñas en `environment`
    command: [*mysql-command…, --binlog-expire-logs-seconds=604800, --binlog-row-image=MINIMAL]
    volumes:
      - mysql-data:/var/lib/mysql
      - ./docker/mysql/10-db-grants.sh:/docker-entrypoint-initdb.d/10-db-grants.sh:ro
      - ./docker/mysql/db-grants.sql:/db-grants.sql:ro
      - ./docker/mysql/apply-grants.sh:/usr/local/bin/apply-grants.sh:ro
```

   `x-laravel-test-env` y el servicio `test` no cambian (usan `mysql-test` con root, por `phpunit.xml`). Los servicios de B2 y C3c, si ya están, toman su ancla de rol y dependen de `grants`.
3. `init-env.sh`: se quita la línea de `MYSQL_PASSWORD` y se suman cinco `add_missing` (`APP_DB_PASSWORD`, `RUNS_DB_PASSWORD`, `MAIL_DB_PASSWORD`, `MIGRATE_DB_PASSWORD` y `BACKUP_DB_PASSWORD`, cada una con `openssl rand -hex 24`), siguiendo el patrón de su cabecera.
4. `deploy.sh`, el mismo en los dos modos (referencia). Los pasos de los usuarios son condicionales para que un despliegue normal no toque ninguna tabla de `taller` antes de migrar: el escenario 3 de `deploy-check.sh` espera que `migrate` sea el que se queda sin el bloqueo y que su mensaje, «sigue fallando por bloqueos después de 3 intentos», llegue al registro.

```sh
set -eu
docker compose build
docker compose up -d --wait mysql
users_missing=$(docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -Nse "SELECT COUNT(*) FROM mysql.user WHERE user = \"taller_migrate\""')
[ "$users_missing" != 0 ] || docker compose --profile ops run --rm db-grants      # volumen anterior a C4
docker compose run --rm migrate
docker compose run --rm --no-deps grants                                            # permisos de lo que migró
docker compose up -d --wait --no-deps mysql php taller scheduler                    # más lo que sumen B2 y C3c
legacy=$(docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -Nse "SELECT COUNT(*) FROM mysql.user WHERE user = \"taller\""')
[ "$legacy" = 0 ] || docker compose --profile ops run --rm db-grants                # retira a `taller` si ya no tiene sesiones
```

   En un volumen nuevo, `taller_migrate` ya existe (lo creó el inicio de MySQL) y `taller` no. El `up` de `mysql` antes del primer `exec` y el `up --no-deps` de `mysql` no recrean un contenedor que no cambió.
5. `.env.example`: las variables de [data-model.md](./data-model.md) §1, vacías o con su valor por omisión.
6. Con el stack (cuando D entregó T014): `docker compose config --services` y `--volumes` contra T001 (sólo suma `grants`); `docker compose up --build -d --wait` desde un volumen nuevo, sin pasos manuales; `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`: pasan sin editarlos (son los de C3a); `compose-check.sh` verde.

**Compuerta:** `compose-check.sh` (parte local) en verde, y con el stack, los tres checks de C3a y el arranque de un volumen nuevo.

### Tarea 6.2 · El archivo público y `public.sh` (T019)

- **Crea:** `docker/compose.public.yaml`, `backend/api/scripts/public.sh` y `qa/public-script-check.ts`.
- **Amplía:** `backend/api/scripts/compose-check.sh` con la parte pública.
- **Primero entrega** el servicio `backup` del archivo, para que B (T016) lo use.

**Pasos:**

1. Escribí `qa/public-script-check.ts` (Node puro, con un `docker` falso que registra sus argumentos y su entorno, y un `.env` temporal), que falla porque `public.sh` no existe. Comprueba:
   - sin cada una de las variables obligatorias, `ACME_ACCEPT_TOS=no`, `BACKUP_AGE_RECIPIENTS=nada` y un comando desconocido, sale con 64 y el mensaje nombra qué falta;
   - con todas, `config` corre `docker compose config` con `COMPOSE_PROJECT_NAME=taller-publico` aunque la terminal exporte otro, `COMPOSE_FILE=compose.yaml:docker/compose.public.yaml`, `TALLER_APP_URL=https://<dominio>`, `TALLER_SESSION_COOKIE=__Host-taller-session`, `TALLER_SESSION_SECURE=true`, `TALLER_DEVICE_COOKIE=__Host-taller-device` y `TALLER_DEVICE_SECURE=true`;
   - `down` nunca pasa `-v`;
   - `deploy` llama, en este orden, a `backup deploy-begin`, `backup once --reason pre-deploy`, `deploy.sh`, `up -d --wait --no-deps backup` y `backup deploy-end`; si el volcado previo falla, no llama a `deploy.sh`; y `deploy-end` se llama aunque `deploy.sh` falle;
   - `restore-record completa 123 41 ok` agrega una línea con la fecha de hoy; con un resultado inválido, sale con 64;
   - `status` sale con 0, 1 o 2 según lo que respondan los dobles (certificado con 51 días y respaldo de 5 horas: 0; con 10 días: 1; sin respuesta: 2).
2. `compose-check.sh`, parte pública, que falla: con variables de ejemplo, `docker compose -f compose.yaml -f docker/compose.public.yaml config --format json` tiene sólo a `taller` con `ports`, con `0.0.0.0:80→8080` y `0.0.0.0:443→8443` (con `PUBLIC_HTTP_BIND=127.0.0.1`, el 80 en `127.0.0.1`) y ninguno en `127.0.0.1:8080`; el nombre del proyecto es `taller-publico`; `taller` no tiene `dns` y su `healthcheck` usa el 8081; `backup` no tiene `ports`, es `read_only`, tiene `cap_drop: [ALL]`, usa `app` y `backup-out`, y no monta el socket de Docker; todo servicio de `config --services` tiene `logging.options.max-size`; sin las variables obligatorias, `config` falla con el mensaje de `:?`.
3. `docker/compose.public.yaml` (referencia, sin ejecutar):

```yaml
name: taller-publico

x-logging: &logging
  driver: json-file
  options:
    max-size: '${LOG_MAX_SIZE:-20m}'
    max-file: '${LOG_MAX_FILE:-10}'

services:
  taller:
    entrypoint: ['/bin/sh', '/usr/local/bin/taller-public-entrypoint']
    ports: !override
      - '${PUBLIC_HTTP_BIND:-0.0.0.0}:80:8080'
      - '0.0.0.0:443:8443'
    dns: !reset []
    environment:
      TALLER_DOMAIN: '${TALLER_DOMAIN:?falta TALLER_DOMAIN en .env}'
      ACME_CONTACT: '${ACME_CONTACT:?falta ACME_CONTACT en .env}'
      ACME_ACCEPT_TOS: '${ACME_ACCEPT_TOS:?falta ACME_ACCEPT_TOS=yes en .env}'
      ACME_DIRECTORY_URL: '${ACME_DIRECTORY_URL:-https://acme-v02.api.letsencrypt.org/directory}'
      ACME_CHALLENGE: '${ACME_CHALLENGE:-http-01}'
      ACME_PROFILE: '${ACME_PROFILE:-}'
      ACME_TRUSTED_CA: '${ACME_TRUSTED_CA:-}'
      HSTS_MAX_AGE: '${HSTS_MAX_AGE:-300}'
      TLS_SOURCE: '${TLS_SOURCE:-acme}'
    volumes:
      - acme-state:/var/lib/taller/acme
    tmpfs:
      - /etc/nginx/taller.d:rw,noexec,nosuid,size=1m,uid=101,gid=101,mode=0755
    healthcheck:
      test: ['CMD', 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1:8081/healthz']
      interval: 15s
      timeout: 3s
      retries: 3
      start_period: 10s
    logging: *logging

  backup:
    build: { context: ./docker/backup }
    image: taller-backup:local
    command: ['loop']
    user: '999:999'
    environment:
      DB_HOST: mysql
      DB_USER: taller_backup
      DB_PASSWORD: '${BACKUP_DB_PASSWORD:?falta BACKUP_DB_PASSWORD en .env (sh backend/api/scripts/init-env.sh)}'
      BACKUP_AGE_RECIPIENTS: '${BACKUP_AGE_RECIPIENTS:?falta BACKUP_AGE_RECIPIENTS en .env}'
      BACKUP_S3_ENDPOINT: '${BACKUP_S3_ENDPOINT:?falta BACKUP_S3_ENDPOINT en .env}'
      # … BACKUP_S3_REGION, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID y BACKUP_S3_SECRET_ACCESS_KEY, obligatorias; BACKUP_S3_PREFIX, BACKUP_TIME, BACKUP_SPOOL_MAX_MIB, BACKUP_HEARTBEAT_URL y BACKUP_HEARTBEAT_FAIL_URL con su valor por omisión …
    networks: [app, backup-out]
    volumes: [backup-spool:/spool, backup-state:/state]
    read_only: true
    tmpfs: ['/tmp:rw,noexec,nosuid,size=64m']
    security_opt: ['no-new-privileges:true']
    cap_drop: [ALL]
    mem_limit: 256m
    pids_limit: 64
    depends_on:
      mysql: { condition: service_healthy }
    restart: unless-stopped
    logging: *logging

  mysql: { logging: *logging }
  php: { logging: *logging }
  # … y lo mismo para migrate, scheduler, grants y los servicios que sumen B2 y C3c …

networks:
  backup-out: {}
volumes:
  acme-state: {}
  backup-spool: {}
  backup-state: {}
```

   El `tmpfs` de `/tmp` de `taller` ya viene de la base: la fusión de listas lo concatena, así que no se repite.
4. `public.sh` (POSIX sh, con un subcomando por función; referencia de su estructura): `cd` a la raíz; lee `.env` con `sed -n 's/^NOMBRE=//p' .env | tail -n 1` para cada variable que necesita (sin hacer `source` del archivo); `validate` (los 64); `export` de las variables de Compose y de `TALLER_*`; y `case "$1"` con `config`, `up`, `deploy`, `down`, `status`, `backup`, `grants`, `logs` y `restore-record`. `status` consulta el certificado con `openssl s_client -connect 127.0.0.1:443 -servername "$TALLER_DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -enddate`, la cabecera de HSTS con `curl -sk --resolve "$TALLER_DOMAIN:443:127.0.0.1" -I "https://$TALLER_DOMAIN/healthz"` y el respaldo con `docker compose exec -T backup backup.sh status`; los días se calculan con `date` portable (`date -d` en Linux y `date -j -f` en macOS, con el cálculo aislado en una función y probado con el doble).
5. `node qa/public-script-check.ts` y `sh backend/api/scripts/compose-check.sh`: verdes.

**Compuerta:** el check de `public.sh` y las dos partes de `compose-check.sh` en verde; el servicio `backup` ya entregado a B.

## 7. Verificación de punta a punta (dueño Q, onda 3)

**Cubre:** FR-001, FR-004, FR-005, FR-012, FR-015, FR-022, FR-024 a FR-029, FR-043 y FR-046; SC-001, SC-003, SC-006 y SC-011.

**Entrega:** los checks contra el stack público con un certificado de prueba, el recorrido en el navegador y el job de CI. Parte de S2.

### Tarea 7.1 · `public-check.sh` y el archivo de prueba (T020)

- **Crea:** `backend/api/scripts/public-check.sh` y `docker/compose.public-test.yaml`.
- **Entrega:** `npm run public:check` (FR-043) y su modo `--real <dominio>`, que usa T026.

**Pasos:**

1. Escribí `public-check.sh` con sus casos, que fallan mientras no haya stack. Usa el estilo de `smoke.sh` (una función `check` que cuenta fallos) y un proyecto con nombre único (`taller-publico-test-$$`) que baja con `down -v` al terminar: nunca toca `taller-publico`. Los pasos, cada uno una comprobación:
   - `compose-check.sh` (K): los puertos, los usuarios, el logging y el proyecto, sin levantar nada.
   - Arma un directorio temporal con un certificado ECDSA de prueba para `taller.test` (`openssl req -x509 …`) y levanta el stack con `-f compose.yaml -f docker/compose.public.yaml -f docker/compose.public-test.yaml`, con `TLS_SOURCE=static`, `TALLER_DOMAIN=taller.test`, valores de ejemplo para el contacto, la clave `age` y el destino, y `backup` fuera (`profiles: [disabled]` en el archivo de prueba). El archivo de prueba reemplaza los puertos por `127.0.0.1:18080` y `127.0.0.1:18443`, monta el certificado en `/run/taller-tls` y fija `TLS_SOURCE`.
   - **Las 12 clases** de [contracts/http.md](./contracts/http.md), con `curl -sk --resolve taller.test:18443:127.0.0.1 -D-`: en cada una, las seis cabeceras una sola vez con su valor exacto (escrito a mano en el check; el nonce con una expresión de 32 hexadecimales), y HSTS sólo en las del 8443. El 413 con un `POST` de 2 MiB a `/api/auth/login`; el 429 con una ráfaga de 150 pedidos paralelos a `/api/session`; el 502 con `php` detenido; el 419 de Laravel con un `POST` sin token y sin `Sec-Fetch-Site`; el 419 de Nginx con `Sec-Fetch-Site: cross-site` (sin `Set-Cookie`); y el mismo `POST` con `Sec-Fetch-Site: same-origin` llega a PHP.
   - **El nombre único:** `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H 'Host: taller.test' http://127.0.0.1:18080/ruta?x=1` da `301 https://taller.test/ruta?x=1`; con `-H 'Host: otro.test'` la conexión se cierra sin respuesta; `openssl s_client -connect 127.0.0.1:18443` sin nombre y con `-servername otro.test` terminan sin entregar certificado; un `Host` distinto por una conexión TLS válida da 421.
   - **Las cookies:** con la cuenta de prueba de C3a (`backend/api/scripts/check-account.sh`; si no admite `--resolve` ni `-k`, se le pasa un `.curlrc` temporal por `CURL_HOME`), el ingreso emite `__Host-taller-session` con `Secure; HttpOnly; SameSite=Lax; Path=/` y sin `Domain`, `__Host-taller-device` con los mismos atributos, y `XSRF-TOKEN` y la de recuerdo con `Secure`.
   - **La IP real:** dos clientes con IP distintas (el host por `127.0.0.1` y un contenedor de la imagen `taller` en la red `edge`, con `wget`): cada uno cuenta por separado en la zona de `/api/session` (el que la agota recibe 429 y el otro, 200); 20 pedidos con `X-Forwarded-For`, `Forwarded` y `X-Real-IP` falsos cuentan contra la IP del cliente, y el registro de Nginx no muestra la falsa.
   - **Las conexiones lentas:** desde el contenedor, 50 conexiones que mandan la cabecera a goteo (`nc`) no impiden que el host reciba 200; a los 10 segundos se cierran; 300 conexiones simultáneas desde el contenedor son aceptadas y la 301 recibe 429; un aula simulada (40 «alumnos» de 6 conexiones desde una IP) recibe 200 en todo.
   - **TLS:** `openssl s_client -tls1` y `-tls1_1` fallan; `-tls1_2` negocia una de las seis suites; `-tls1_3` negocia; `-no_ticket` no recibe ticket; `curl --http2 -I` informa HTTP/2.
   - **El currículo:** `/content/` y `/content/curriculum.<versión>.json` dan 404, y ninguno de los marcadores de `curriculumMarkers()` (`qa/lib/content-document.ts`) está en `/usr/share/nginx/html` de la imagen (`docker compose exec taller grep -rF`).
   - **Los registros:** cada servicio en ejecución tiene la rotación de FR-029 (`docker inspect --format '{{.HostConfig.LogConfig}}'`).
2. `docker/compose.public-test.yaml` (referencia): `taller` con `ports: !override`, el volumen del certificado y `TLS_SOURCE`, y `backup` con un perfil que no se levanta.
3. El modo `--real <dominio>` (T026): las clases 1 a 8, el nombre único, las cookies de `GET /api/session` y el cierre por CSRF, sin `-k` ni `--resolve`, contra el dominio de verdad.
4. Corré: verde. La imagen del front y la de `php` se reconstruyen en el primer `up --build`.

**Compuerta:** `npm run public:check` en verde, con cada comprobación citando lo que mide, y el modo `--real` probado contra el stack de prueba con `--resolve` en un archivo de curl.

### Tarea 7.2 · El recorrido en un navegador y el cierre por CSRF (T021)

- **Crea:** `qa/e2e/specs/csp-walk.spec.ts`.
- **Modifica:** `qa/e2e/playwright.config.ts` (un proyecto `csp-walk`, con `baseURL` de `CSP_WALK_BASE_URL` y sin `webServer`: usa un stack levantado).

**Pasos:**

1. Escribí el spec, que falla sin stack. Con una cuenta de prueba creada por `qa/lib/api-account.ts` (C3a, T024) y su cookie en el contexto, y un oyente de `securitypolicyviolation` y de errores de consola registrado con `addInitScript`:
   - recorre las 8 vistas por hash, los 5 enlaces profundos, el editor y la celebración, y exige 0 violaciones y 0 errores de consola;
   - **el editor:** el elemento `<style>` que arma CodeMirror tiene un `nonce` (su propiedad) igual al de la CSP de la respuesta del documento (`response.headers()`), la numeración de líneas está dibujada y el espaciador del gutter tiene `visibility: hidden` computado;
   - **la celebración:** se dispara por el camino de interfaz que ya cubre F1; si ninguno la dispara sin el sandbox, con el doble del ejecutor de F1, y se anota;
   - **dos `GET /` seguidos:** nonces distintos y sin `ETag` ni `Last-Modified`.
2. **El cierre de sesión por CSRF (FR-025).** Un servidor mínimo de Node, en `http://localhost:<puerto>`, sirve una página que envía un formulario `POST` a `http://127.0.0.1:<puerto del stack>/api/auth/logout`: es otro sitio (`localhost` y `127.0.0.1` lo son), como el escenario de C3a. El spec inicia sesión en el taller, abre esa página, y exige: 419 `csrf_token_mismatch` en la respuesta, ningún `Set-Cookie`, la cookie de sesión del contexto con el mismo valor antes y después, y `GET /api/session` con la misma cuenta. Un `POST` del mismo origen con `X-XSRF-TOKEN` sigue funcionando.
3. Corrélo con el stack local de T020 (`CSP_WALK_BASE_URL=http://127.0.0.1:$TALLER_PORT`). Firefox es otro proyecto, `csp-walk-firefox`, sólo con el permiso del usuario.

**Compuerta:** `npx playwright test --config qa/e2e/playwright.config.ts --project csp-walk` en verde con 0 violaciones, y el escenario de CSRF verde. Lo que no pudo correr (Firefox, la celebración) se informa como límite.

### Tarea 7.3 · El job `public` de la CI (T022)

- **Modifica:** `.github/workflows/ci.yml`.

**Pasos:** sumá el job `public` con las mismas acciones fijadas por SHA que los otros: `actions/checkout`, `actions/setup-node` con Node 24 y `npm ci`, `sh backend/api/scripts/init-env.sh`, y `npm run public:check`, `npm run api:grants:check`, `npm run public:acme-check` y `npm run public:backup-check`, cada uno su paso, con `timeout-minutes: 30`. Ante un fallo, un paso `if: failure()` que corre `docker compose logs --no-color` de los proyectos de prueba y los sube como artefacto. `jq` ya está en el runner. No agrega permisos (`contents: read`). `npm run format:check` pasa sobre el archivo.

**Compuerta:** el YAML es válido y está formateado; el primer run en el PR da verde, o sus límites quedan escritos (por ejemplo, el tiempo que tardó).

### Tarea 7.4 · Los registros con rotación (T023)

- **Amplía:** `public-check.sh` con lo dinámico de FR-029; el trabajo de medición es posterior.

**Pasos:**

1. En `public-check.sh`: con el stack de prueba arriba, cada servicio tiene `LogConfig` con `max-size` y `max-file` (el check estático de `compose-check.sh` ya lo exige para la configuración; acá se ve en los contenedores).
2. La medición, que sólo existe con tráfico real: una semana después de G2, `docker compose logs --since 24h taller | wc -c` y lo mismo para `php`, por día. El coordinador la anota en la guía y ajusta `LOG_MAX_SIZE` y `LOG_MAX_FILE` para que el tope cubra unos 14 días (FR-029; ADR 0006 §13.13 sigue abierta). Los registros de Nginx de los archivos estáticos conservan su formato por omisión.

**Compuerta:** el check dinámico en verde; la medición queda anotada como pendiente hasta una semana después de G2 (T027).

## 8. Documentación, compuerta y evidencia (coordinador, onda 4)

**Cubre:** FR-044, FR-045 y FR-046; SC-001, SC-010 a SC-013.

### Tarea 8.1 · La documentación (T024)

- **Modifica:** `AGENTS.md`, `README.md`, `docs/architecture.md`, `qa/AGENTS.md` y `backend/api/AGENTS.md`.
- **Crea:** `docs/operacion-publica.md` y el ADR que enmienda el 0004 §1 (cliente ACME, desafío, destino de los respaldos y CSP con nonce), con el número que asigne quien integra.

**Pasos:**

1. Los pasajes que hoy llaman «autónomo» al HTML (`AGENTS.md` líneas 7 y 66; `README.md` cerca de las 145, 185, 229 y 274; `docs/architecture.md` línea 73; `qa/AGENTS.md` línea 50) dicen que `dist/index.html` ya no es autónomo, que se sirve con Nginx junto a `dist/assets/` y que no funciona con `file://`.
2. `AGENTS.md`: la sección «Comandos» suma `sh backend/api/scripts/public.sh` y el job `public`; «Proyecto» nombra la exposición; «Verificación» suma `npm run api:grants:check`, `public:check`, `public:acme-check` y `public:backup-check`.
3. `docs/architecture.md`: el mapa de `docker/` (`compose.public.yaml`, `nginx/` con sus tres puntos de inclusión y `headers.conf`, `mysql/`, `backup/`), el contrato nuevo de la salida, los usuarios de MySQL por rol y la regla de que una tabla nueva entra a la matriz.
4. `qa/AGENTS.md`: las filas nuevas de la tabla «Elegir comprobaciones» (cabeceras, política de contenido, plantillas públicas, roles, `public.sh`, los cuatro checks con Docker y el recorrido).
5. `backend/api/AGENTS.md`: los roles de MySQL y `grants`/`db-grants`, `public.sh`, las variables `TALLER_*` y que `x-laravel-env` ya no fija usuario, y que el `.env` de quien ya tenía uno necesita `sh backend/api/scripts/init-env.sh` otra vez.
6. `docs/operacion-publica.md`, en español rioplatense: qué necesita (CGNAT, dominio, cuenta del destino, claves); la primera puesta en marcha (`.env`, `public.sh up`); actualizar (`public.sh deploy`); la rampa de HSTS con la condición de cada escalón; el comando de estado y el monitor; los respaldos y la restauración paso a paso (las dos partes); la rotación de secretos (contraseñas de rol con `db-grants`, credenciales del destino, la clave `age`, la URL del latido, `APP_KEY`); qué hacer si falla una renovación; qué hacer si se pierde la clave privada; los registros y su retención; el modo local y lo que cambió (cookies, build en varios archivos); y los límites declarados (macOS, navegadores sin Fetch Metadata).
7. Verificá rutas, comandos y enlaces locales con un script de enlaces; `git diff --check` y `npm run format:check`.

**Compuerta:** la documentación coincide con los comandos reales (cada comando citado se corrió o se probó con su doble), los enlaces locales existen y el ADR tiene número.

### Tarea 8.2 · La compuerta G1 (T025)

**Pasos:**

1. Corré todos los checks de «Los checks» de [contracts/console.md](./contracts/console.md) y los comandos de FR-046 en el modo local: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:test`, `npm run api:format:check`, `npm run api:analyse`, `npm run api:smoke`, `npm run api:content:check`, `sh backend/api/scripts/deploy-check.sh`, `npm run api:grants:check`, `npm run public:check`, `npm run public:acme-check` y `npm run public:backup-check`. Anotá el resultado real de cada uno.
2. El usuario presencia la restauración completa (`restore-check.sh --identity … --remote-env …`) y el simulacro (`--pitr`), y se anota la línea de cada una con `public.sh restore-record`.
3. V5 con las credenciales reales (T007), la expiración de 35 días comprobada y lo que dijo el proveedor sobre el país (§13.14).
4. C3a, C3b y C3c entregados, con una cuenta admin creada y el aviso de privacidad vigente; HSTS en 300.
5. Escribí el registro de G1 (en el PR y en la línea de evidencia de T025): qué pasó, con qué comando, y qué quedó sin verificar.

**Compuerta:** todo lo anterior en verde o con su límite escrito. Sin G1, el usuario no abre el router.

### Tarea 8.3 · G2: abrir (T026, el usuario con el coordinador)

**Pasos:** los del escenario 11 de [quickstart.md](./quickstart.md): el DNS y el monitor listos; con `ACME_DIRECTORY_URL` de staging, `public.sh up` y el reenvío de los puertos; el certificado de staging emitido y `public.sh status`; `public-check.sh --real <dominio>`; desde datos móviles, la invitación y el recorrido (SC-001) y la IP pública del teléfono en el registro de Nginx (V3b); el escaneo de puertos desde otra red (SC-011); el paso a producción y la rampa de HSTS con la condición de cada escalón.

**Compuerta:** cada paso anotado. Si V3b muestra la IP del puente, se detiene y se ajusta la publicación.

### Tarea 8.4 · El cierre y la evidencia (T027)

**Pasos:** el PR de implementación (título en inglés con la notación de Angular, y la descripción completa: el problema, qué cambia, cómo se verificó, qué queda pendiente); `docker compose config --services` y `--volumes` contra T001 (el modo local sólo suma `grants`); `package.json` y `package-lock.json` sin paquetes nuevos y sin `vite-plugin-singlefile` (SC-013); la medición de registros de T023 una semana después de G2; y **SC-010** (la expiración a 35 días y las 7 diarias y 4 semanales) anotado como **evidencia pendiente** hasta 35 días después de entregar. La hoja de ruta pasa a «Entregado» recién con esa evidencia.

**Compuerta:** lo anterior hecho, y lo que quedó sin verificar, escrito.

## Cobertura de requisitos

Cada requisito con las tareas que lo implementan o lo prueban. `tasks.md` cita los mismos requisitos en cada línea.

| Requisito | Tareas |
| --- | --- |
| FR-001 | T005, T019, T020 |
| FR-002 | T001, T018, T019 |
| FR-003 | T019 |
| FR-004, FR-005 | T010, T020 |
| FR-006 | T003, T008, T010 |
| FR-007 a FR-009 | T003, T010 |
| FR-010 | T003, T020 |
| FR-011 | T016, T019 |
| FR-012 | T010, T020 |
| FR-013 | T009 |
| FR-014 | T019, T026 |
| FR-015 | T009, T020 |
| FR-016 | T004, T008, T009 |
| FR-017 | T004, T013 |
| FR-018 | T004, T012, T021 |
| FR-019 | T004, T013 |
| FR-020 | T011 |
| FR-021 | T009 |
| FR-022 | T020 |
| FR-023 | T011, T021 |
| FR-024 | T018, T019, T020 |
| FR-025 | T009, T020, T021 |
| FR-026 | T020 |
| FR-027 | T005, T020 |
| FR-028 | T009, T020 |
| FR-029 | T019, T023 |
| FR-030 | T014, T018 |
| FR-031 | T006, T014 |
| FR-032 | T014, T018 |
| FR-033 | T015 |
| FR-034 | T006, T016 |
| FR-035 | T016 |
| FR-036 | T007, T016 |
| FR-037 | T016, T017 |
| FR-038 | T017, T018 |
| FR-039 | T016, T019 |
| FR-040 | T016, T018, T019 |
| FR-041 | T016, T019 |
| FR-042 | T006, T017, T025 |
| FR-043 | T020, T026 |
| FR-044 | T025, T026, T027 |
| FR-045 | T024 |
| FR-046 | T001, T022, T027 |
| FR-047 | T002, T016 |
| SC-001 | T020, T026 |
| SC-002 | T003 |
| SC-003 | T020 |
| SC-004 | T004, T021 |
| SC-005 | T013 |
| SC-006 | T020 |
| SC-007 | T015 |
| SC-008 | T017 |
| SC-009 | T007, T016 |
| SC-010 | T007, T027 |
| SC-011 | T020, T026 |
| SC-012 | T018, T027 |
| SC-013 | T011, T027 |

## Descargas y permisos

Ninguna se hace sin el permiso del usuario, con nombre, origen y tamaño (constitución, principio VII). Los tamaños son metadatos del 2026-10-06 (los de lego, certbot y `testssl.sh`, del 2026-10-05) de amd64 comprimido, no una medición de `pull`; se vuelven a leer al pedir cada permiso.

| Qué | Tarea | Cuándo se pide | Tamaño | Detalle |
| --- | --- | --- | --- | --- |
| `nginx-module-acme-1.30.5.0.4.1-r1.apk` y la clave `nginx_signing.rsa.pub` | T002 (la baja la etapa de build de T003) | Lote 1, antes de V1 | 2 899 805 bytes y unos cientos de bytes | `https://nginx.org/packages/alpine/v3.24/main/x86_64/`; Apache-2.0 |
| `ghcr.io/letsencrypt/pebble:2.10.1` | T002 | Lote 1, antes de V1 | 3 332 845 bytes en capas | GHCR; MPL-2.0 |
| `age` v1.3.2 (`age-v1.3.2-linux-amd64.tar.gz`) | T016 | Lote 2, después de S1 | 19 405 817 bytes | GitHub Releases, sha256 `cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10`; BSD-3-Clause |
| `rclone/rclone:1.75.1` | T016 | Lote 2, después de S1 | 33 921 688 bytes | Docker Hub; MIT; se fija el digest al pedirlo |
| `curl-minimal` de Oracle Linux 9 | T016 | Sólo si `mysql:9.7` no trae `curl` | sin medir | Repositorio de Oracle Linux; MIT |
| `goacme/lego` o `certbot/certbot` | T003 y T008 | Sólo si V1 falla (Q1, opción B) | 31 929 677 y 85 815 661 bytes | Docker Hub; MIT y sin declarar |
| Firefox para Playwright | T004 y T021 | Opcional, para correr V2 y el recorrido en Firefox | sin medir | CDN de Playwright; MPL-2.0 |
| `drwetter/testssl.sh` | T020 | Opcional: FR-012 se comprueba con `openssl` | 22 567 230 bytes | Docker Hub; GPL-2.0 |

Los lotes: el lote 1 suma 6 232 650 bytes (5,9 MiB) y el lote 2, 53 327 505 bytes (50,9 MiB), sin lo condicional ni lo opcional.

Sin descarga nueva: `mysql:9.7` y `nginxinc/nginx-unprivileged` (los digests que ya fija el repositorio), la imagen de `php`, `node:24-alpine` y `docker`. Sin npm ni Composer: `npm uninstall vite-plugin-singlefile` no baja nada (si pide red, se detiene y se pide permiso). Para las pruebas con Docker, las imágenes ya están en la máquina: si un comando intenta descargar algo, se pide permiso.

## Acciones del usuario

Los agentes no las hacen. «G1» y «G2» son los dos tramos de la compuerta (R22).

| Cuándo | Acción | Tarea que la espera |
| --- | --- | --- |
| Antes de T001 (ya) | **Comprobar que la conexión admite recibir por 80 y 443** (sin CGNAT, sin filtro del proveedor). Si sólo falla el 80, TLS-ALPN-01 sirve; si falla el 443, C4 vuelve al usuario con alternativas | T003 (decide el desafío), G2 |
| Antes de G1 | **Elegir y registrar el dominio** | T019 (valores de ejemplo hasta entonces), G1, G2 |
| Con el lote 1 de descargas | **El permiso** para el módulo ACME y Pebble | T002 |
| Con el lote 2 de descargas | **El permiso** para `age` y `rclone` (y `curl-minimal` si falta) | T016 |
| Antes de T016 y T007 | **La cuenta del destino de los respaldos**: la credencial que sólo agrega, la de lectura, las versiones, la expiración a 35 días, y el país del almacenamiento; el par de claves `age` (la privada fuera del host), preferentemente con una segunda de reserva; una copia de `.env` fuera del host | T016, T007 (V5), G1 |
| Al desplegar | `sh backend/api/scripts/init-env.sh`, completar en `.env` las variables de [data-model.md](./data-model.md) §1 (dominio, contacto, `ACME_ACCEPT_TOS=yes`, la clave pública, el destino, y la URL del latido si hay monitor) y, con un volumen que ya existía, `docker compose --profile ops run --rm db-grants` (lo hace `public.sh deploy`) | T018, T019, G2 |
| En G1 | **Presenciar la restauración** (completa y simulacro) y guardar el procedimiento; confirmar que C3a, C3b y C3c están entregados, con un admin y el aviso de privacidad vigente; resolver §13.14 (quién responde por la base y la transferencia internacional) | T025 |
| Antes de G2 | **DNS**: un registro A y ninguno AAAA, con DNS dinámico si la IP cambia, y un CAA opcional. **El monitor externo**: la URL `/healthz`, el vencimiento del certificado y el latido | T026 |
| En G2 | **El router**: reenviar el 80 y el 443 (sólo el 443 con TLS-ALPN-01) al host con IP reservada, sin UPnP, con NAT loopback si se prueba desde adentro; **la prueba desde datos móviles** (una invitación y el recorrido, V3b) | T026 |
| Una semana después de G2 | La medición de registros (con el coordinador) | T023, T027 |
| 35 días después de entregar | Comprobar la expiración y las copias (SC-010) | T027 |
| Siempre | Aprobar o enmendar el ADR 0006; decidir §13.13 (días de registros) y §13.14 | G1 |

## Lo que quedó sin verificar

Esta planificación no ejecutó nada. Lo que hay que medir o comprobar al implementar, y quién lo hace:

| Qué | Cómo se resuelve |
| --- | --- |
| Todo el código de referencia: las configuraciones de Nginx y de Compose, los scripts de sh y el SQL | Los checks de cada tarea; si algo no corre, se corrige la referencia, no el check |
| Que el módulo ACME 0.4.1 corra en `nginx-unprivileged` con disco de sólo lectura, que sirva el desafío en los puertos internos 8080 y 8443 y que su `.so` coincida con el Nginx de la imagen | V1 (T003) |
| Que `ngx_http_sub_module` esté en la imagen, que `sub_filter` no deje `ETag` y que el nonce llegue al `<style>` de CodeMirror | V2 (T004) y el recorrido de T021 |
| Que la curva `X25519MLKEM768` la acepte el OpenSSL de la imagen | V1 (`nginx -t` con la lista completa) |
| Que `error_page 419 = @csrf_rejected` a nivel servidor responda a un `return 419` del mismo nivel | T009 y el check de T020 |
| La IP que ve Nginx por IPv4 explícito, y que no haya `[::]` | V3a (T005) y V3b en G2 |
| El privilegio mínimo de `taller_backup`, y el tiempo de volcado y de restauración | V4 (T006) |
| Que el destino ofrezca credenciales sin lectura ni listado, versiones y expiración, y que `rclone copyto` funcione con una credencial de sólo `PutObject` | V5 (T007) |
| Que un `GRANT` por tabla no espere detrás de un bloqueo de metadatos en un despliegue normal, y que el escenario 3 de `deploy-check.sh` siga viendo a `migrate` rendirse | T018 con `deploy-check.sh` |
| Que `mysql:9.7` traiga `flock` y `curl`, y que los binarios estáticos de `age` y `rclone` corran sobre Oracle Linux | T006 y T016 |
| Que el módulo ACME y el `dns: !reset []` dejen resolver el nombre de la autoridad real | G2 (T026), con staging |
| Los valores de los límites de conexión con una carga real | G2 y la medición posterior (R10) |
| Que `check-account.sh` de C3a admita las opciones de curl del modo público | T020 (con el `.curlrc` temporal, si no) |
| Que la celebración se pueda disparar sin el sandbox | T021 |
| Que Docker Desktop muestre la IP del cliente | No se verifica: el modo público se opera en Linux (límite declarado) |
| Firefox | Opcional, con permiso (T004 y T021); sin él, una pasada manual declarada |
| La línea de base: se leyó C3a en su rama y B2, A2 y C3b/C3c en sus planes y specs, no integrados | T001 |

## Complexity Tracking

Sin violaciones de la constitución que justificar. Hay desvíos del ADR 0006, no de la constitución:

- **`grants` además de `db-grants`.** Dos servicios con el mismo script porque FR-002 pide que `smoke.sh` de C3a pase sin editarlo, y ese check exige que `db-grants` no se levante sin el perfil `ops`. Si el usuario prefiere uno solo, `db-grants` pierde su perfil y se edita esa comprobación.
- **`backup` con su propio bucle y en el archivo público**, y no en el perfil `ops` como dice D34: un respaldo que depende de un `cron` del host es el que falla en silencio, y el modo local no lo necesita.
- **La enmienda del ADR 0004 §1:** el cliente ACME es el módulo de Nginx, el desafío por omisión es HTTP-01, los respaldos van a un almacenamiento de objetos con una credencial que sólo agrega, y la CSP lleva un nonce y `style-src-attr 'unsafe-inline'`. Se registra en el ADR de T024.
