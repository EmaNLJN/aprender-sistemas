# Hoja de ruta: Backend multiusuario

Épico que lleva el taller del HTML autónomo con `localStorage` y Playgrounds públicos a un backend propio: contenido y progreso en tablas, cuentas para muchos usuarios y un sandbox de ejecución propio, sin perder progreso ni contenido.

- **Fuente técnica:** [ADR 0004](../../docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md), [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md) y [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md). El ADR 0006 está en estado «propuesta»: su §10 fija los subplanes, las dependencias y el orden, y enmienda partes de los otros dos. Hasta que se apruebe, cada spec lo usa como base y lo dice.
- **Reemplaza a** [`docs/plans/2026-10-04-backend-hoja-de-ruta.md`](../../docs/plans/2026-10-04-backend-hoja-de-ruta.md), que queda como historia de B1, A1 y C1.
- **Flujo:** Spec Kit, con la [constitución](../../.specify/memory/constitution.md) como compuerta de cada plan.

## Convenciones

- **IDs estables:** B1…E1 y C5 no se renumeran ni se reutilizan. Un ítem nuevo recibe un ID nuevo.
- **Una spec por ítem,** en `specs/NNN-<id>-<nombre>/` (`NNN` es el orden de creación de Spec Kit). La línea `Input` de cada spec nombra el ID de su ítem; esta tabla enlaza la spec de vuelta.
- **Estados:** `Pendiente` (sin spec), `En especificación` (spec redactada, con preguntas abiertas o sin plan), `Planificado` (plan, tareas y análisis hechos), `En curso`, `Entregado`.
- **Entregado** exige la implementación integrada y la evidencia de QA: PR, commit y qué se ejecutó. Si algo quedó sin verificar, se escribe.
- **Persistencia flow-forward** (constitución, principio VIII): al entregar, el directorio de la feature queda inmutable. Un cambio sustancial o un requisito nuevo es una spec nueva, enlazada a la original («extiende» o «reemplaza a»), y la fila del ítem apunta a las dos. Los bugs van a `.specify/bugs/<slug>/` (extensión `bug`) y no tocan el `tasks.md` de la feature.
- **Integración:** `src/app/main.tsx`, `package.json`, las configuraciones y la documentación las integra el agente principal, aunque dos ítems corran en paralelo ([AGENTS.md](../../AGENTS.md)).

## Subplanes

| ID | Subplan | Intención | Depende de | Estado | Spec |
| --- | --- | --- | --- | --- | --- |
| B1 | Ejecutor Go con sandbox gVisor | Compilar y ejecutar Rust y Go en contenedores endurecidos, detrás de un servicio interno | — | Entregado | [plan histórico](../../docs/plans/2026-10-04-ejecutor-go.md) |
| A1 | Contenido en YAML y código real | Sacar el currículo de los `.ts` a `content/`, con un generador y un oráculo que prueban que nada cambió | — | Entregado | [plan histórico](../../docs/plans/2026-10-04-contenido-yaml.md) |
| C1 | Base Laravel en Docker | Proyecto API-only con PHP-FPM, MySQL 9.7 y Pest contra MySQL real | — | Entregado | [plan histórico](../../docs/plans/2026-10-04-laravel-base.md) |
| C2 | Contenido en MySQL | Pasar el currículo de un documento embebido a tablas y servirlo por recurso, idéntico al oráculo, para que el progreso apunte a filas estables | A1, C1 | Entregado | [001-c2-contenido-mysql](../001-c2-contenido-mysql/spec.md) |
| C3 | Identidad y acceso | Cuentas para muchos usuarios: alta por invitación, sesión, recuperación por email, roles y límites por cuenta | C1 | Pendiente | — |
| B2 | API de ejecuciones | Ejecutar el código del alumno en el sandbox propio, de forma asincrónica y con cuotas por usuario, y dejar un intento liviano por ejecución | B1, C2, C3 | Pendiente | — |
| D1 | Progreso y sincronización | Guardar el progreso en tablas, con sincronización local-first, importación combinable del progreso v1 y fusión por campo | C2, C3, B2 | Pendiente | — |
| C5 | Estadísticas del admin | Dar al admin métricas de uso sin exponer nunca el código ni los textos del alumno | D1, B2 | Pendiente | — |
| E1 | Sesión Esenciales | Sumar Esenciales como catálogo nuevo, primero de la cadena | A1, D1 | Pendiente | — |
| A2 | Compuerta de arranque | Que el front espere el contenido antes de evaluar las vistas legacy y que el HTML deje de embeberlo | A1 | Pendiente | — |
| A3 | El front lee el contenido de la API | Que el front lea las 17 porciones con el protocolo de arranque, guarde la última copia y avise si el backend no responde | A2, C2, C3 | Pendiente | — |
| C4 | Exposición | Exponer el taller en Internet con certificado propio, cabeceras estrictas y mínimo privilegio | A3, C3 | Pendiente | — |
| A4 | Laboratorio con el sandbox propio | Que el laboratorio use `/api/runs` en lugar de los Playgrounds públicos | B2, A3 | Pendiente | — |
| B3 | Auditoría local del currículo | Probar en el ejecutor local que todas las soluciones aprueban y todos los códigos iniciales fallan | B2 | Pendiente | — |

## Alcance por ítem

Cada línea nombra lo que entra y lo que queda fuera. Los detalles están en el ADR 0006 (§10 por subplan) y se bajan a la spec de cada ítem.

- **C2:**
  - Entra: las 21 tablas de contenido (§5.1), `content:import` incremental y sin borrados, con auto-chequeo en cada corrida, los 17 recursos de sólo lectura con los bytes exactos del generador, validador por porción (sin build) y `Content-Version`, `curriculum.meta.json` (con la huella de cada porción), las claves estables de las etapas de taller, la etapa `curriculum` de la imagen de la API y migraciones que no se cuelgan esperando bloqueos. Hasta C3 el contenido responde sin sesión, con el puerto sólo en `127.0.0.1`.
  - Fuera: sesión y `GET /api/session` (C3), el chequeo de transacciones largas con `db-grants` (C3), `test_key` inmutable y plantilla del harness (B2), vista del front (A2 y A3) y Esenciales (E1).
- **C3:**
  - Entra: `users` con rol y estado, invitaciones, recuperación por email, sesión de Laravel sin el paquete Sanctum, Fortify sin vistas, límites por cuenta y por red, cuenta esperada en todo pedido que muta, rutas `/api/auth`, `/api/me` y `/api/admin` (usuarios e invitaciones), `worker-mail` aislado, `db-grants`, `scheduler` y `lang/es`. Cierra el reenvío DNS de los contenedores sin egreso (estacionado de C1). Por las decisiones del clarify de C2 (2026-10-04 y 2026-10-05), C3 también entrega: `GET /api/session` (usuario o null, `contentVersion` y catálogos a partir del último import, y un `appBuild` opaco si el front lo necesita); el contenido de C2 detrás de la sesión, con «sin sesión, 401» en su aceptación y sin que el middleware de sesión agregue `Vary: Cookie` ni toque `Cache-Control` en el contenido; el chequeo de transacciones largas antes de migrar (D35), dentro de `db-grants`, con su prueba de privilegios con un usuario restringido (criterio J del DBA); y la limpieza programada de la caché de cuerpos vencida, en el `scheduler`.
  - Fuera: 2FA, login social, passkeys, registro abierto activo (queda detrás de `REGISTRATION_OPEN=false`) y TLS (C4). Si queda grande, se parte en C3a (autenticación) y C3b (invitaciones y admin).
- **B2:**
  - Entra: `progress_heads` y `exercise_progress` completas, `attempts`, `attempt_tests`, `attempt_payloads` y `runs`; `/api/runs` con cola propia, cuotas por usuario y tope global; `executor` y `worker-runs`; la plantilla del harness como recurso. Precondición: `test_key` único e inmutable (el generador deja de exigir `t{índice+1}`).
  - Fuera: sincronización del progreso (D1) y la vista del laboratorio (A4).
- **D1:**
  - Entra: las 12 tablas de progreso sin alterar las de B2; `POST /api/sync`, `GET /api/progress`, `POST /api/progress/import` y `POST /api/progress/reset`; cliente v2 con espacios por cuenta; el contenido publica el id de cada etapa; fixture compartido de fusión.
  - Fuera: estadísticas (C5).
- **C5:**
  - Entra: `/api/admin/stats/*`, `GET /api/admin/runs` y `GET /api/admin/queue`, resumen en la ficha de usuario y caché de 10 minutos. Los índices llegan después de medir con 5.000 alumnos sintéticos.
  - Fuera: rollups diarios (camino de escala, §9) y cualquier exportación de admin.
- **E1:**
  - Entra: una fila en `catalogs`, el contenido nuevo y un ADR de IDs y numeración de etapas (al final de la cadena, para no cambiar los 274 `stage` actuales).
  - Fuera: tablas nuevas.
- **A2:**
  - Entra: la compuerta con su spike previo; el diseño admite el protocolo por porciones (§7).
  - Fuera: la lectura real de la API (A3).
- **A3:**
  - Entra: el protocolo de arranque completo (`GET /api/session`, validador por porción, comparación de `Content-Version`, reintento con tope), la última copia en caché y el aviso sin backend.
- **C4:**
  - Entra: TLS propio con renovación, HSTS, cookies `__Host-` y `Secure`, CSP sin `'unsafe-inline'`, retiro de `vite-plugin-singlefile`, IP real del cliente para los límites, usuarios de MySQL con mínimo privilegio y respaldos fuera del host.
- **A4:**
  - Entra: el laboratorio sobre `/api/runs`, la vista previa con la misma plantilla y el retiro del cliente de Playgrounds. Además, guarda el id del intento del servidor en el `result` v1 y deja de sumar `attempts` por las ejecuciones del servidor.
- **B3:**
  - Entra: la auditoría fuera de hora o con su propia instancia del ejecutor, sin escribir `runs` ni `attempts`.

## Orden y paralelismo

- **Tronco del ADR 0006 §10:** C2 → C3 → B2 → D1 → C5 → E1. C3 va después de C2 porque protege las rutas de contenido que C2 publica.
- **El resto:** A2 sólo depende de A1 y toca el front, así que puede correr en paralelo con C2 y C3. A3 espera a C2 y C3, C4 a A3 y C3, A4 a B2 y A3, y B3 a B2.
- **Olas** (un paso puede arrancar cuando terminó el anterior; los de una misma ola corren en paralelo sólo con archivos disjuntos):
  1. C2 y A2.
  2. C3.
  3. B2 y A3.
  4. D1, C4, A4 y B3.
  5. C5 y E1.

## Estado y evidencia

- **B1** (2026-10-04): entregado en `master`, PR #3 → `15063e3`. Las 21 pruebas de integración pasan con runc y con runsc (gVisor instalado por apt), registrado con `--network=none`.
- **A1** (2026-10-04): entregado en `master`, PR #5 → `f924109`. `content/` (YAML y código real) y `tools/content/` generan `build/curriculum.json`. El oráculo `dump-globals` da el mismo volcado que la línea base (`cd1f9e62…`), los catálogos del `dist` coinciden con los del oráculo y la auditoría pasa 137/137 programas de referencia por lenguaje (411 aserciones cada uno). El `dist/index.html` cambió de tamaño (2 044 640 → 2 202 074 bytes), como se esperaba: lo que se verificó es que los catálogos que publica son iguales.
- **C1** (2026-10-04): entregado en `master`, PR #4 → `0f4bad8`. Pest, la prueba de humo y el primer arranque con el volumen vacío están verificados. Límite que declaró su hoja de ruta: la imagen del front con el `nginx.conf` nuevo se prueba en el primer `up --build`.
- **C2** (2026-10-05): entregado con el PR #8, que hace squash a `master` al mergearse. Pasan la suite de la API (328 pruebas y 969 aserciones, también en orden aleatorio), los 30 checks de `npm test` con los mismos sha256 del documento y del oráculo, la prueba de humo, `npm run api:content:check` (las 17 porciones idénticas al generador a través de Nginx) y `api/scripts/deploy-check.sh` (FR-046), sobre un stack desplegado desde una base vacía. Hubo además una revisión adversarial y un QA independiente; sus hallazgos se corrigieron o quedaron documentados en el PR. Sin verificar bajo carga real: el desborde del tmpfs de Nginx casi no se ejercitó en loopback. Quedan pendientes los errores del framework bajo `/api` (FR-024), el chequeo de transacciones largas y el criterio J, que pasan a C3, y la traducción al inglés del código anterior.
- **C2** (2026-10-05): spec clarificada (sesiones del 2026-10-04 y 2026-10-05), modelo de datos, plan y 28 tareas. El plan reparte la implementación entre la base del coordinador, tres agentes a la vez y después otros dos, con archivos disjuntos. El análisis cruzado por script (los 48 requisitos y los 11 criterios en el plan y las tareas, dueño único de cada archivo, enlaces) no dejó hallazgos. Sin implementar. El código PHP, SQL y de Docker del plan es referencia sin ejecutar; el TypeScript del generador y de los checks se ejecutó.

Las evidencias salen de los mensajes de los commits y de la hoja de ruta anterior.

## Acciones del usuario (los agentes no las hacen)

| Cuándo | Acción |
| --- | --- |
| Siempre | Cada descarga (imágenes, paquetes npm o Composer) pide permiso con nombre, origen y tamaño antes de bajarse. |
| Ahora | Aprobar o enmendar el ADR 0006, con las enmiendas del 2026-10-05 que dejó el clarify de C2 (también ratifica que la entrega sea un controlador con un servicio, y no un middleware). |
| C2 (implementación) | Permiso para la primera construcción de la etapa `curriculum` de `api/Dockerfile`: `npm ci` baja las 243 dependencias del `package-lock.json` (unos 150 MB instalados; la descarga ronda los 40 o 50 MB, estimación) sobre `node:24-alpine`, la imagen que ya usa el front. Hay que dárselo antes de la tarea T007. |
| C3 | `laravel/fortify` (sin Sanctum); proveedor, remitente y dominio del correo (§13.3); `axllent/mailpit` sólo con permiso, en el perfil `dev`; origen de la lista de contraseñas bloqueadas (§13.4). |
| C4 | Dominio, DNS (o DNS dinámico) y puertos 80 y 443 abiertos en el router. |

## Criterios de aceptación globales

- **C2:** cada porción de contenido que sirve la API es idéntica a su parte de `build/curriculum.json` (el sha256 del cuerpo es la huella que escribe el generador), y el oráculo `dump-globals` no cambia. Antes lo decía `GET /api/content`, que el ADR 0006 reemplaza.
- **D1:** el progreso real de master (`qa/fixtures/progress-master-2a278ad-storage.json` y los dos exports de `qa/fixtures`) entra a las tablas y vuelve a salir sin pérdida (`isLosslessNormalization`, ADR 0006 D24).
- **B3:** en el ejecutor local, todas las soluciones de referencia aprueban y todos los códigos iniciales fallan.
- **Todo subplan** cierra con `npm test`, `npm run lint`, `npm run format:check` y `git diff --check` en verde, y con las pruebas propias de su lenguaje (Pest o Go).

## Decisiones abiertas (ADR 0006 §13)

Se cierran en el paso clarify de la spec de cada ítem.

| Ítem | Preguntas |
| --- | --- |
| C2 | Cerradas en su clarify (2026-10-04 y 2026-10-05): 1 (sólo lo que siembra C2), 10, 11 y 12, más las nuevas de su spec. Las que pasan a C3 están en su alcance |
| C3 | 2 (sesión sin Sanctum), 3 (correo), 4 (contraseñas), 5 (tiempos de sesión), 7 (cuenta de admin), 8 (invitaciones), 9 (cambio de email), 20 (registro abierto) |
| B2 | 16 (cuotas de ejecución), 18 (fase en vivo del run) |
| D1 | 17 (progreso) |
| C5 | 6 (qué ve el admin) |
| E1 | 1 (resto: Esenciales antes de Inicial o en su lugar, y su código) |
| Transversales | 13 (retenciones), 14 (Ley 25.326), 15 (carga esperada), 19 (imágenes nuevas) |

## Enmiendas pendientes

Cuando el usuario apruebe el ADR 0006, hay que registrar en los ADR anteriores lo que enumera su §10 («Enmiendas a registrar»):

- **ADR 0004:** el montaje de la sesión, el alta, el TOTP y el bloqueo (§1); las rutas públicas; la partición de `workshop_exercises` y las tablas de guía y pistas; el ETag por porción; los cambios de `attempts`; los sellos v2; `/api/sync` con delta, `POST /api/progress/reset` y la importación combinable; y la corrección del reloj por lote.
- **ADR 0005:** sin fase en vivo (§3), un intento liviano y su payload aparte por ejecución, cuotas por usuario con tope global, y la evidencia autodeclarada como riesgo con muchos usuarios.
- **Hoja de ruta anterior:** hecho en este archivo (C2 con 17 recursos, C3 sin Sanctum ni TOTP, A3 sin `/api/content`, A4 con el id del intento, Sanctum fuera de los paquetes y C5 nuevo).
