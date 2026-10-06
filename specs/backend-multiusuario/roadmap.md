# Hoja de ruta: Backend multiusuario

Épico que lleva el taller del HTML autónomo con `localStorage` y Playgrounds públicos a un backend propio: contenido y progreso en tablas, cuentas para muchos usuarios y un sandbox de ejecución propio, sin perder progreso ni contenido.

- **Fuente técnica:** [ADR 0004](../../docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md), [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md) y [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md). El ADR 0006 está en estado «propuesta»: su §10 fija los subplanes, las dependencias y el orden, y enmienda partes de los otros dos. Hasta que se apruebe, cada spec lo usa como base y lo dice.
- **Reemplaza a** [`docs/plans/2026-10-04-backend-hoja-de-ruta.md`](../../docs/plans/2026-10-04-backend-hoja-de-ruta.md), que queda como historia de B1, A1 y C1.
- **Flujo:** Spec Kit, con la [constitución](../../.specify/memory/constitution.md) como compuerta de cada plan.

## Convenciones

- **IDs estables:** B1…E1, C5 y C6 no se renumeran ni se reutilizan. Un ítem nuevo recibe un ID nuevo.
- **Una spec por ítem,** en `specs/NNN-<id>-<nombre>/` (`NNN` es el orden de creación de Spec Kit). La línea `Input` de cada spec nombra el ID de su ítem; esta tabla enlaza la spec de vuelta.
- **Estados:** `Pendiente` (sin spec), `En especificación` (spec redactada, con preguntas abiertas o sin plan), `Planificado` (plan, tareas y análisis hechos), `En curso`, `Entregado`.
- **Entregado** exige la implementación integrada y la evidencia de QA: PR, commit y qué se ejecutó. Si algo quedó sin verificar, se escribe.
- **Persistencia flow-forward** (constitución, principio VIII): al entregar, el directorio de la feature queda inmutable. Un cambio sustancial o un requisito nuevo es una spec nueva, enlazada a la original («extiende» o «reemplaza a»), y la fila del ítem apunta a las dos. Los bugs van a `.specify/bugs/<slug>/` (extensión `bug`) y no tocan el `tasks.md` de la feature.
- **Integración:** `frontend/src/app/main.tsx`, `package.json`, las configuraciones y la documentación las integra el agente principal, aunque dos ítems corran en paralelo ([AGENTS.md](../../AGENTS.md)).

## Subplanes

| ID | Subplan | Intención | Depende de | Estado | Spec |
| --- | --- | --- | --- | --- | --- |
| B1 | Ejecutor Go con sandbox gVisor | Compilar y ejecutar Rust y Go en contenedores endurecidos, detrás de un servicio interno | — | Entregado | [plan histórico](../../docs/plans/2026-10-04-ejecutor-go.md) |
| A1 | Contenido en YAML y código real | Sacar el currículo de los `.ts` a `content/`, con un generador y un oráculo que prueban que nada cambió | — | Entregado | [plan histórico](../../docs/plans/2026-10-04-contenido-yaml.md) |
| C1 | Base Laravel en Docker | Proyecto API-only con PHP-FPM, MySQL 9.7 y Pest contra MySQL real | — | Entregado | [plan histórico](../../docs/plans/2026-10-04-laravel-base.md) |
| C2 | Contenido en MySQL | Pasar el currículo de un documento embebido a tablas y servirlo por recurso, idéntico al oráculo, para que el progreso apunte a filas estables | A1, C1 | Entregado | [001-c2-contenido-mysql](../001-c2-contenido-mysql/spec.md); la extiende [002-c6-registros-tipados](../002-c6-registros-tipados/spec.md) (C6) |
| C3 | Identidad y acceso | Cuentas para muchos usuarios: alta por invitación, sesión, recuperación por email, roles y límites por cuenta | C1 | Pendiente | — |
| B2 | API de ejecuciones | Ejecutar el código del alumno en el sandbox propio, de forma asincrónica y con cuotas por usuario, y dejar un intento liviano por ejecución | B1, C2, C3 (la parte C3a, spec 004), C6 | Planificado | [005-b2-api-ejecuciones](../005-b2-api-ejecuciones/spec.md) |
| D1 | Progreso y sincronización | Guardar el progreso en tablas, con sincronización local-first, importación combinable del progreso v1 y fusión por campo | C2, C3, B2 | Pendiente | — |
| C5 | Estadísticas del admin | Dar al admin métricas de uso sin exponer nunca el código ni los textos del alumno | D1, B2 | Pendiente | — |
| E1 | Sesión Esenciales | Sumar Esenciales como catálogo nuevo, primero de la cadena | A1, D1 | Pendiente | — |
| A2 | Compuerta de arranque | Que el front espere el contenido antes de evaluar las vistas legacy y que el HTML deje de embeberlo | A1, [F1 y F2 (unidades 1 a 4)](../front-react/roadmap.md) | Pendiente | — |
| A3 | El front lee el contenido de la API | Que el front lea las 17 porciones con el protocolo de arranque, guarde la última copia y avise si el backend no responde | A2, C2, C3, [F11](../front-react/roadmap.md#pantallas-de-acceso-a3-y-c3) | Pendiente | — |
| C4 | Exposición | Exponer el taller en Internet con certificado propio, cabeceras estrictas y mínimo privilegio | A3, C3 | Pendiente | — |
| A4 | Laboratorio con el sandbox propio | Que el laboratorio use `/api/runs` en lugar de los Playgrounds públicos | B2, A3, [F7](../front-react/roadmap.md) | Pendiente | — |
| B3 | Auditoría local del currículo | Probar en el ejecutor local que todas las soluciones aprueban y todos los códigos iniciales fallan | B2 | Pendiente | — |
| C6 | Registros tipados del contenido | Que los registros del contenido viajen por la API como objetos tipados e inmutables, sin cambiar un byte publicado ni una fila, y que el análisis estático suba de nivel | C2 | Planificado | [002-c6-registros-tipados](../002-c6-registros-tipados/spec.md), que extiende a la 001 |

## Alcance por ítem

Cada línea nombra lo que entra y lo que queda fuera. Los detalles están en el ADR 0006 (§10 por subplan) y se bajan a la spec de cada ítem.

- **C2:**
  - Entra: las 21 tablas de contenido (§5.1), `content:import` incremental y sin borrados, con auto-chequeo en cada corrida, los 17 recursos de sólo lectura con los bytes exactos del generador, validador por porción (sin build) y `Content-Version`, `curriculum.meta.json` (con la huella de cada porción), las claves estables de las etapas de taller, la etapa `curriculum` de la imagen de la API y migraciones que no se cuelgan esperando bloqueos. Hasta C3 el contenido responde sin sesión, con el puerto sólo en `127.0.0.1`.
  - Fuera: sesión y `GET /api/session` (C3), el chequeo de transacciones largas con `db-grants` (C3), `test_key` inmutable y plantilla del harness (B2), vista del front (A2 y A3) y Esenciales (E1).
- **C3:**
  - Entra: `users` con rol y estado, invitaciones, recuperación por email, sesión de Laravel sin el paquete Sanctum, Fortify sin vistas, límites por cuenta y por red, cuenta esperada en todo pedido que muta, rutas `/api/auth`, `/api/me` y `/api/admin` (usuarios e invitaciones), `worker-mail` aislado, `db-grants`, `scheduler` y `lang/es`. Cierra el reenvío DNS de los contenedores sin egreso (estacionado de C1). Por las decisiones del clarify de C2 (2026-10-04 y 2026-10-05), C3 también entrega: `GET /api/session` (usuario o null, `contentVersion` y catálogos a partir del último import, y un `appBuild` opaco si el front lo necesita); el contenido de C2 detrás de la sesión, con «sin sesión, 401» en su aceptación y sin que el middleware de sesión agregue `Vary: Cookie` ni toque `Cache-Control` en el contenido; el chequeo de transacciones largas antes de migrar (D35), dentro de `db-grants`, con su prueba de privilegios con un usuario restringido (criterio J del DBA); y la limpieza programada de la caché de cuerpos vencida, en el `scheduler`.
  - Fuera: 2FA, login social, passkeys, registro abierto activo (queda detrás de `REGISTRATION_OPEN=false`), TLS (C4) y las pantallas de cuenta (F11) y de administración (F12) de la [hoja de ruta del front](../front-react/roadmap.md#pantallas-de-acceso-a3-y-c3). Si queda grande, se parte en C3a (autenticación) y C3b (invitaciones y admin).
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
  - Entra: el laboratorio sobre `/api/runs`, la vista previa con la misma plantilla y el retiro del cliente de Playgrounds, como un cambio del adaptador de transporte de `features/run-exercise` que deja F7 (A4 espera a F7: decidido el 2026-10-05). Además, guarda el id del intento del servidor en el `result` v1 y deja de sumar `attempts` por las ejecuciones del servidor.
- **B3:**
  - Entra: la auditoría fuera de hora o con su propia instancia del ejecutor, sin escribir `runs` ni `attempts`.
- **C6:**
  - Entra: una forma tipada e inmutable para cada registro del contenido (los 19 tipos de fila y el meta del generador), con constructores con nombre desde el documento y desde la fila y salidas explícitas hacia la fila y hacia la forma publicada. Entran también un oráculo de filas tomado del código de C2 y la subida del análisis estático al nivel 9, sin baseline ni ignores, con la CI y la documentación que lo citan.
  - Fuera: cambios en el generador, en los bytes publicados, en las tablas, en el contrato HTTP y en el comportamiento del import; la diferencia del import sobre registros (sigue sobre filas); `spatie/laravel-data` y cualquier dependencia nueva; formas tipadas para los valores JSON anidados, que quedan opacos; y los registros de otros módulos (C3, B2 y D1).

## Orden y paralelismo

- **Tronco del ADR 0006 §10:** C2 → C3 → B2 → D1 → C5 → E1. C3 va después de C2 porque protege las rutas de contenido que C2 publica.
- **El resto:**
  - **A2** depende de A1 y de F1 y F2 del [épico del front](../front-react/roadmap.md): la red de pruebas y los seams que vuelven explícito el arranque. Corre después de ellos, en paralelo con C3 y C6.
  - **A3** espera a A2, C2, C3 y F11, las pantallas de cuenta (login, invitación, recuperar y cambiar la contraseña, exportar y borrar la cuenta y el aviso de privacidad). La ubicación de esas pantallas es una propuesta pendiente del usuario. Con ese alcance F11 espera también a C3b, y si A3 espera a todo F11 o sólo al acceso se decide en el clarify de F11 (hoja de ruta del front, «Decisiones abiertas»).
  - **C4** espera a A3 y C3.
  - **A4** espera a B2, A3 y F7, el port del laboratorio (decidido el 2026-10-05: F7 va antes).
  - **B3** espera a B2.
- **C6** (decidido en su clarify, Q5): depende sólo de C2, corre en paralelo con C3, en la ola 2, y se entrega antes de B2, que cambia las pruebas de ejercicio y el generador y por eso depende de C6. Con C3 comparte `phpstan.neon`, `config/` y la documentación, que integra el agente principal; los puntos de integración están en su plan. Desde que C6 sube el análisis al nivel 9, el código de C3 tiene que pasarlo.
- **Olas** (un paso puede arrancar cuando terminó el anterior; los de una misma ola corren en paralelo sólo con archivos disjuntos):
  1. C2.
  2. C3 y C6. A2 entra en cuanto el front entregue F1 y F2.
  3. B2 y A3.
  4. D1, C4, A4 y B3.
  5. C5 y E1.

## Estado y evidencia

- **B1** (2026-10-04): entregado en `master`, PR #3 → `15063e3`. Las 21 pruebas de integración pasan con runc y con runsc (gVisor instalado por apt), registrado con `--network=none`.
- **A1** (2026-10-04): entregado en `master`, PR #5 → `f924109`. `content/` (YAML y código real) y `tools/content/` generan `build/curriculum.json`. El oráculo `dump-globals` da el mismo volcado que la línea base (`cd1f9e62…`), los catálogos del `dist` coinciden con los del oráculo y la auditoría pasa 137/137 programas de referencia por lenguaje (411 aserciones cada uno). El `dist/index.html` cambió de tamaño (2 044 640 → 2 202 074 bytes), como se esperaba: lo que se verificó es que los catálogos que publica son iguales.
- **C1** (2026-10-04): entregado en `master`, PR #4 → `0f4bad8`. Pest, la prueba de humo y el primer arranque con el volumen vacío están verificados. Límite que declaró su hoja de ruta: la imagen del front con el `nginx.conf` nuevo se prueba en el primer `up --build`.
- **C2** (2026-10-05): entregado con el PR #8, que hace squash a `master` al mergearse. Pasan la suite de la API (328 pruebas y 969 aserciones, también en orden aleatorio), los 30 checks de `npm test` con los mismos sha256 del documento y del oráculo, la prueba de humo, `npm run api:content:check` (las 17 porciones idénticas al generador a través de Nginx) y `api/scripts/deploy-check.sh` (FR-046), sobre un stack desplegado desde una base vacía. Hubo además una revisión adversarial y un QA independiente; sus hallazgos se corrigieron o quedaron documentados en el PR. Sin verificar bajo carga real: el desborde del tmpfs de Nginx casi no se ejercitó en loopback. Quedan pendientes los errores del framework bajo `/api` (FR-024), el chequeo de transacciones largas y el criterio J, que pasan a C3, y la traducción al inglés del código anterior.
- **C2** (2026-10-05): spec clarificada (sesiones del 2026-10-04 y 2026-10-05), modelo de datos, plan y 28 tareas. El plan reparte la implementación entre la base del coordinador, tres agentes a la vez y después otros dos, con archivos disjuntos. El análisis cruzado por script (los 48 requisitos y los 11 criterios en el plan y las tareas, dueño único de cada archivo, enlaces) no dejó hallazgos. Sin implementar. El código PHP, SQL y de Docker del plan es referencia sin ejecutar; el TypeScript del generador y de los checks se ejecutó.
- **C6** (2026-10-05): spec redactada en `specs/002-c6-registros-tipados/` y clarificada el mismo día: se tipa todo el contenido, la diferencia del import sigue sobre filas, el análisis sube al nivel 9, los valores JSON anidados quedan opacos y C6 va en la ola 2, en paralelo con C3 y antes de B2. La línea de base de PHPStan se midió sobre la rama de la spec, con la configuración de hoy y sólo el nivel cambiado: 0 errores en el nivel 6, 10 en el 7, 11 en el 8, 106 en el 9 y 154 en el 10.
- **C6** (2026-10-05): plan, investigación, modelo de datos, validación y 16 tareas en siete fases, con cinco dueños de archivos disjuntos. El análisis cruzado no dejó hallazgos críticos ni altos: los 19 requisitos y los 7 criterios tienen tareas, y se corrigieron tres medianos y tres bajos. Parte del código de referencia corrió al planificar, sin tocar el repositorio: el oráculo de filas, los lectores, el meta, el piloto del Atlas, los bordes y la diferencia del import. Con eso aplicado, la suite de la API pasa (332 pruebas) y el nivel 9 baja de 106 a 65 errores. Sin implementar.
- **B2** (2026-10-05): spec clarificada, investigación, modelo de datos, tres contratos, plan y 22 tareas en cuatro ondas, con ocho dueños de archivos disjuntos y puntos de sincronización atados a C3a (B2 parte de su S2, no de su entrega) y a C3b (se engancha al evento que C3b dispara y declara sus tablas para `UserData`). El análisis cruzado por script (los 50 requisitos y los 13 criterios en el plan y las tareas, dueño único de cada archivo, enlaces) dejó hallazgos que se corrigieron, entre ellos un ciclo de dependencias entre dueños (resuelto con un puerto para el cuerpo del trabajo) y el cableado de producción que las pruebas de las ondas 1 y 2 hacen por su cuenta. Sin implementar. Se ejecutaron al planificar, sin tocar el repositorio de código ni usar Docker: el TypeScript del generador y de los checks, la plantilla de Rust contra `rustc` 1.97.1 (137 de 137 soluciones aprueban y ningún código inicial), el fixture de once casos contra un renderizador independiente, los 49 `gradingHash` que cambian y la fórmula del corte por UUIDv7. Todo el PHP, el SQL, el YAML de Compose y la configuración de Nginx del plan son referencia sin ejecutar, y la plantilla de Go no se compiló. La implementación espera la aprobación del ADR 0006 y el permiso de cada descarga.

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
- **C6:** las 17 porciones y cada ejercicio salen con las huellas del generador, y desplegar la imagen nueva sobre una base que importó el código de C2 no escribe filas ni cambia validadores.
- **Todo subplan** cierra con `npm test`, `npm run lint`, `npm run format:check` y `git diff --check` en verde, y con las pruebas propias de su lenguaje (Pest o Go).

## Decisiones abiertas (ADR 0006 §13)

Se cierran en el paso clarify de la spec de cada ítem.

| Ítem | Preguntas |
| --- | --- |
| C2 | Cerradas en su clarify (2026-10-04 y 2026-10-05): 1 (sólo lo que siembra C2), 10, 11 y 12, más las nuevas de su spec. Las que pasan a C3 están en su alcance |
| C3 | 2 (sesión sin Sanctum), 3 (correo), 4 (contraseñas), 5 (tiempos de sesión), 7 (cuenta de admin), 8 (invitaciones), 9 (cambio de email), 20 (registro abierto) |
| B2 | Cerradas en su clarify (2026-10-05): 16 (cuotas de ejecución: las del ADR, configurables), 18 (sin fase en vivo: `running` sin subfase) y, de la 12 y la 13, la parte de B2: el `grading_hash` suma los `imports` de Go y no la plantilla, y la retención es de 14 días para las ejecuciones y de 90 para los payloads, salvo el de la última aprobación y el del último intento. La 15 (carga esperada) sigue con los supuestos del ADR (S2). Sin dueño: los endpoints de historial de intentos (`GET /api/attempts*`), que su Q4 deja afuera |
| D1 | 17 (progreso) |
| C5 | 6 (qué ve el admin) |
| E1 | 1 (resto: Esenciales antes de Inicial o en su lugar, y su código) |
| C6 | Cerradas en su clarify (2026-10-05): Q1 a Q5 de su spec, que no vienen del ADR 0006. También la del plan, decidida por el usuario el 2026-10-05: una fila que el import no pudo escribir responde 500 (research.md, R10) |
| Transversales | 13 (retenciones), 14 (Ley 25.326), 15 (carga esperada), 19 (imágenes nuevas) |

## Enmiendas pendientes

Cuando el usuario apruebe el ADR 0006, hay que registrar en los ADR anteriores lo que enumera su §10 («Enmiendas a registrar»):

- **ADR 0004:** el montaje de la sesión, el alta, el TOTP y el bloqueo (§1); las rutas públicas; la partición de `workshop_exercises` y las tablas de guía y pistas; el ETag por porción; los cambios de `attempts`; los sellos v2; `/api/sync` con delta, `POST /api/progress/reset` y la importación combinable; y la corrección del reloj por lote.
- **ADR 0005:** sin fase en vivo (§3), un intento liviano y su payload aparte por ejecución, cuotas por usuario con tope global, y la evidencia autodeclarada como riesgo con muchos usuarios.
- **Hoja de ruta anterior:** hecho en este archivo (C2 con 17 recursos, C3 sin Sanctum ni TOTP, A3 sin `/api/content`, A4 con el id del intento, Sanctum fuera de los paquetes y C5 nuevo).
