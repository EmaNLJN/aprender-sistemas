# Feature Specification: C3a · Identidad y acceso: autenticación

**Feature Branch**: `004-c3-identidad-acceso` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Planificada el 2026-10-05, sobre su clarify (Q1 a Q5, la partición de C3 y la decisión de no usar Fortify): [plan.md](./plan.md), [tasks.md](./tasks.md) y su análisis están hechos; sin implementar

**Input**: Ítem **C3** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Identidad y acceso», en su primera parte: **C3a**, la autenticación y el acceso. La segunda parte, **C3b** (correo, administración y ciclo de vida de la cuenta), queda en la hoja de ruta sin spec (ver «Partición de C3»). Fuente técnica: ADR 0006 (propuesta) §4, §5.2, D16 a D20, D35 (el chequeo previo), D36, la parte de identidad de §7 y §8, y la fila C3 de §10 ([ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)). Recibe de [C2](../001-c2-contenido-mysql/spec.md) lo que esa spec le dejó a C3 (ver «Relación con C2, C6 y C3b»). Donde esta spec se aparta del ADR, lo dice en Assumptions.

## Intención y alcance

**Lo que entendemos.** Hoy el taller no sabe quién lo usa: el contenido que publica C2 responde a cualquiera que alcance el puerto (que escucha sólo en `127.0.0.1`) y no hay cuentas. C3a le da identidad: personas con cuenta que ingresan con email y contraseña, mantienen una sesión segura y salen, de modo que lo que viene después (las ejecuciones de B2, el progreso de D1, las estadísticas de C5) pertenezca a alguien y nadie más lo vea. Es para el alumno que entra, para quien opera el taller y da de alta a la gente, y para los ítems que necesitan saber quién es el usuario: A3 (el front lee el contenido y arranca con `GET /api/session`), B2 y D1. No trae pantallas: el entregable es el contrato HTTP, con su comportamiento ante cada error. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Sin sesión, nada del contenido sale: las rutas de C2 responden 401. Con sesión, salen los mismos bytes, validadores y cabeceras de hoy.
2. Quien opera el taller crea el primer admin y a cada alumno con un comando que imprime un link de un solo uso; quien lo abre elige su contraseña y entra, y el link no sirve dos veces.
3. Un email que no existe y una contraseña equivocada son indistinguibles desde afuera (mismo estado, mismo cuerpo, mismo piso de tiempo), y adivinar contraseñas tiene un tope por cuenta y por red que no deja afuera al titular.
4. Cuando una cuenta deja de estar activa o cambia su contraseña, sus sesiones viejas dejan de servir en el siguiente pedido, sin depender del driver de sesiones.
5. Una pestaña que quedó abierta con otra cuenta no puede modificar nada: recibe 409.
6. Todo error de la API sale en español y con `code`, y un despliegue con una transacción larga abierta se detiene antes de migrar.

**Entra:**

- **Cuentas y sesión:** la tabla de cuentas con rol y estado; la sesión de Laravel con CSRF; el ingreso y la salida, con sus límites, el bloqueo por cuenta y la cookie de dispositivo; la contraseña (reglas, cambio y restablecimiento); la versión aceptada del aviso de privacidad.
- **Alta y recuperación sin correo:** las invitaciones (tabla, consulta y aceptación), `taller:invite` y `taller:password-reset-link`.
- **Lo que le deja C2:** `GET /api/session`; el contenido detrás de la sesión; la limpieza programada de las sesiones y de la caché de cuerpos vencidas, en el `scheduler`; el chequeo de transacciones largas con `db-grants` y su prueba con un usuario restringido (criterio J); los errores del framework bajo `/api` en español y con `code` (C2 FR-024); `lang/es`.
- **Operación:** el cierre del reenvío DNS de los contenedores sin salida; los límites de Nginx por IP; registros sin secretos; y que `api:smoke`, `api:content:check` y `deploy-check.sh` sigan pasando con el contenido protegido.

**Queda fuera, y es de C3b:** el correo (`worker-mail`, `mail_jobs`, las notificaciones y `POST /api/auth/forgot-password`), la administración de usuarios e invitaciones (`/api/admin` y la guardia del último admin), el ciclo de vida de la cuenta (exportar y suprimir: `UserData`, `PurgeUserData` y `account_deletions`), el registro abierto apagado con su verificación de email, `taller:change-email` y `taller:reapply-deletions`.

**Queda fuera de todo el épico:** 2FA, login social, passkeys, JWT y los tokens de Sanctum (R3 y R11); TLS, las cookies `__Host-` y la IP real del cliente (C4); las pantallas, que son del front (F11 las de cuenta y F12 las de administración); el progreso, las ejecuciones y las estadísticas (D1, B2 y C5).

**Sin hacer a propósito (YAGNI):** un camino soportado para cambiar el rol o el estado de una cuenta (lo trae C3b; hasta entonces el operador usa `tinker`); un panel de usuarios; la auditoría de logins (R5); un `appBuild` (no tiene consumidor: A3 lo pide si lo necesita); que el `scheduler` procese la cola `default` (todavía no hay trabajos que encolar); ajustar PHP-FPM y el buffer pool de MySQL sin una medición que lo pida (§9); `declare(strict_types=1)` (C6).

**Actores:** el alumno (rol `student`); quien opera el taller, que también es el primer admin y trabaja por consola; el cliente del front (A3, las pantallas de cuenta de F11 y las vistas); quien despliega; y los ítems B2, D1, C4 y C3b, que se apoyan en la sesión.

## Partición de C3: por qué esta spec es C3a

La hoja de ruta prevé partir C3 «si queda grande». Queda grande, y conviene partirla. Los números salen del ADR 0006 y del repositorio, medidos el 2026-10-05; las cuentas de viñetas y de endpoints son un indicador de tamaño, no una medida de esfuerzo.

| Medida | C3 entero | C3a (esta spec) | C3b |
| --- | --- | --- | --- |
| Endpoints nuevos (26 filas de la tabla de §7) | 27 | 12 | 15 |
| Tablas que crea, recrea o altera | 9 | 7: `users`, `invitations`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks` y `failed_jobs` | 2: `account_deletions` y `mail_jobs` |
| Servicios nuevos de Compose | 3, más Mailpit en `dev` | 2: `scheduler` y `db-grants` | 1: `worker-mail`, más Mailpit |
| Paquetes de Composer nuevos | ninguno (sin Fortify, decidido en el clarify) | ninguno: la sesión, el ingreso y la recuperación salen del núcleo de Laravel | ninguno propio: SMTP usa lo que ya está; un proveedor con API suma uno o dos |
| Preguntas de §13 que la definen | 8 | 5 en esta ronda (2, 4, 5, 7 y 8) | 3 (3, 9 y 20) |
| Lo que usan A3, B2 y D1 | — | casi todo: sesión, estado, cuenta esperada, `GET /api/session`, `password.confirm` | nada |

Referencia, C2: 6 rutas de contenido, 48 requisitos, 28 tareas y un plan de 375 783 bytes. El esquema de C3 es chico (33 columnas en 5 tablas, contra 153 en 21 de C2); lo grande es el comportamiento: las decisiones D16 a D21 y D36 y la sección 4 del ADR suman 159 viñetas (40 y 119, anidadas incluidas), contra 42 de D10 a D15, que le dieron a C2 sus 48 requisitos.

**Recomendación: partir, con este corte.**

- **C3a:** los 12 endpoints son `GET /api/session`; `POST /api/auth/login`, `logout`, `invitations/lookup`, `invitations/accept`, `reset-password` y `confirm-password`; `GET /api/auth/confirmed-password-status`; y `PATCH /api/me`, `PUT /api/me/password`, `POST /api/me/privacy` y `POST /api/me/sessions/logout-others`. Más las seis rutas de contenido, que pasan detrás de la sesión.
- **C3b:** los 15 restantes son `forgot-password`, `register`, `email/verification-notification`, `email/verify`, `POST /api/me/export`, `DELETE /api/me` y los nueve de `/api/admin`.
- **Por qué este corte y no otro:**
  1. **El camino crítico.** A3, B2 y D1 esperan a C3. Con este corte esperan 12 endpoints y 7 tablas, y ninguno de los 15 de C3b los usa. Una sola spec les haría esperar también el correo, la administración y la supresión.
  2. **Sin cuenta no hay nada que probar.** Nadie puede tener una cuenta sin `taller:invite` y la aceptación (§4.1, paso 5), y la recuperación por consola cubre a quien olvida su contraseña (modo sólo link, S7). Por eso las invitaciones se parten por quién las usa: aceptar va en C3a, y crear, renovar y revocar por HTTP va en C3b.
  3. **Una decisión externa fuera del camino crítico.** El correo real necesita proveedor, remitente y dominio con SPF, DKIM y DMARC (§13.3), y el dominio es una acción de C4 que todavía no existe. Con el correo en C3b, C3a no espera esa respuesta.
  4. **Un foco de revisión por spec.** C3a concentra la sesión, el ingreso y el CSRF. C3b concentra el único contenedor con salida a Internet y la autoridad del admin.
- **Lo que cuesta partir:** dos ciclos de Spec Kit, y archivos compartidos que tocan las dos mitades (`routes/api.php`, `bootstrap/app.php`, `docker/compose.yaml`, `lang/es`, `backend/api/AGENTS.md`). Se mitiga entregando C3b después de C3a, no a la vez.
- **En qué se aparta de la hoja de ruta:** su corte pone la recuperación por correo en C3a («autenticación»). Acá va en C3b porque arrastra `worker-mail`, `mail_jobs`, las notificaciones y la decisión del proveedor, que son la parte más ajena al resto. Si se prefiere el corte original, pasan a C3a el correo y `forgot-password`: suma 1 endpoint, 1 servicio y 1 tabla, y C3a pasa a depender de la pregunta 3 y del permiso de Mailpit para probar el envío de punta a punta (ver «Alternativas consideradas»).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una decisión del clarify (Clarifications).

| Pedido | Fuente |
| --- | --- |
| Cuentas para muchos usuarios: alta por invitación, sesión, recuperación por email, roles y límites por cuenta | Hoja de ruta, C3; ADR 0006 R2 a R4 (decisiones del 2026-10-04) |
| Sesión de Laravel con cookie HttpOnly y CSRF, sin 2FA, login social ni passkeys; JWT y tokens evaluados y descartados | ADR 0006 R3, R11 y §4.9 (propuesta); montada sin Sanctum: usuario, clarify del 2026-10-05 (Q1) |
| Roles admin y estudiante; cada estudiante ve y modifica sólo lo suyo | ADR 0006 R4 |
| Sin auditoría de logins | ADR 0006 R5; usuario, 2026-10-04 |
| La API la consume sólo este front, del mismo origen y sin versionado público | ADR 0006 R6 |
| El contenido exige sesión, y la aceptación de C3 incluye «sin sesión, 401» | Clarify de C2, Q1 (2026-10-04) |
| `GET /api/session` con `contentVersion` y los catálogos, y un `appBuild` opaco si el front lo necesita | Clarify de C2, Q2 y Q3 |
| El chequeo de transacciones largas pasa a C3, con `db-grants` y su prueba con un usuario restringido | Clarify de C2 (2026-10-05); plan de C2, decisión 5 |
| La limpieza programada de la caché de cuerpos vencida, en el `scheduler` | Spec de C2 («Sin hacer a propósito»); hoja de ruta |
| Los errores del framework bajo `/api` en español y con `code` | C2 FR-024; ADR 0006, «Resultados de la implementación de C2» |
| Cerrar el reenvío DNS de los contenedores sin salida | Hoja de ruta; estacionado de C1 |
| El código de C3 pasa el nivel 9 de PHPStan desde el principio | Hoja de ruta («Orden y paralelismo»); C6 FR-012 |
| Partir C3 en C3a y C3b; la spec es la de C3a, y C3b (correo, recuperación por email y administración) queda para después | Hoja de ruta; usuario, clarify del 2026-10-05 |
| Sin Fortify: el ingreso, la salida, la confirmación y el cambio y el restablecimiento de contraseña salen del guard de sesión de Laravel, `Hash`, el broker de contraseñas y `RateLimiter`, sin paquetes nuevos | Usuario, clarify del 2026-10-05; enmienda pendiente del ADR 0006 (D17) |
| Contraseñas de 15 a 64 caracteres, sin reglas de composición, contra una lista local de bloqueadas (SecLists NCSC, unos 816 KiB; la descarga se pide con permiso) | Usuario, clarify del 2026-10-05 (Q2) |
| La cuenta de admin separada de la de estudio se recomienda, no se exige | Usuario, clarify del 2026-10-05 (Q3) |
| Invitaciones de un solo uso, una por email | Usuario, clarify del 2026-10-05 (Q4) |
| Sesión de 30 minutos de inactividad y 8 horas como máximo; «recordarme» de 30 días sólo para estudiantes; cookie de dispositivo de 180 días | Usuario, clarify del 2026-10-05 (Q5) |
| Las dependencias de la API se agregan sólo con permiso del usuario | Constitución, principio VII; `backend/api/AGENTS.md` |
| TDD, código y pruebas en inglés, Pest contra MySQL 9.7 real | Constitución, principios II y VI |

## Clarifications

### Session 2026-10-05

- Q: Después de medir el tamaño de C3, ¿se parte y esta spec es la parte de autenticación? → A: Sí. C3a es esta spec; C3b (el correo, la recuperación por email y la administración) queda para después, sin spec. Decidió el usuario. (Partición de C3)
- Q: ¿El ingreso y el resto de la autenticación se arman con Fortify? → A: No. El ingreso, la salida, la confirmación de contraseña, el cambio de contraseña y el `reset-password` de C3a se arman con el guard de sesión de Laravel, `Hash`, el broker de contraseñas y `RateLimiter`, sin paquetes nuevos. La última Fortify (1.40.0) suma 15 paquetes por 2FA y passkeys, que el ADR excluye (R3), y la 1.36.2, la última sin passkeys, suma 5 y queda fuera de las versiones que se siguen publicando. El ADR 0006 nombraba «Fortify sin vistas» (D17, §4.2, §4.3, la tabla de §4.9 y la fila C3 de §10): queda como enmienda pendiente, registrada en la hoja de ruta. Ya no hay que pedir permiso para `laravel/fortify`. Decidió el usuario. (FR-005, FR-010, FR-025, FR-026, FR-028, FR-030)
- Q: **Q1**, ¿cómo se monta la sesión? → A: La sesión de Laravel con cookie HttpOnly y CSRF, sin el paquete Sanctum (opción A). Sin clientes con token (R6), Sanctum no agrega seguridad y deja una condición en cada `fetch`: mandar `Referer` u `Origin`. Decidió el usuario. (FR-005)
- Q: **Q2**, ¿qué reglas tienen las contraseñas? → A: De 15 a 64 caracteres, sin reglas de composición, contra una lista local de contraseñas bloqueadas más el nombre y el email de la cuenta (opción A). La lista es `100k-most-used-passwords-NCSC.txt` de SecLists (835 538 bytes, unos 816 KiB), filtrada a las entradas que alcanzan el mínimo. La descarga se pide con permiso al implementar, con nombre, origen, tamaño y licencia: SecLists es MIT, pero el origen y la licencia de los datos del NCSC no se pudieron confirmar y hay que confirmarlos. Decidió el usuario. (FR-023, FR-024)
- Q: **Q3**, ¿la cuenta de admin tiene que ser distinta de la que se usa para estudiar? → A: Se recomienda, no se exige (opción A): una cuenta admin usa el contenido como una de alumno, y las estadísticas excluyen a los admins por rol. Decidió el usuario. (FR-033)
- Q: **Q4**, ¿cómo son las invitaciones? → A: Siempre ligadas a un email y de un solo uso, una por email (opción A), sin links de curso multiuso. Decidió el usuario. (FR-017)
- Q: **Q5**, ¿cuánto dura la sesión, y entran «recordarme» y la cookie de dispositivo? → A: 30 minutos de inactividad y 8 horas como máximo; «recordarme» de 30 días, sólo para estudiantes; cookie de dispositivo de 180 días (opción A). Decidió el usuario. (FR-006, FR-014, FR-015)
- Las demás propuestas de esta spec no entraron en esta ronda: renovar por consola una invitación vigente, `contentVersion: null` sin import, los códigos `method_not_allowed` y `server_error`, el 404 `invitation_not_found`, el 409 sin `X-Taller-User`, el 401 de una sesión viva de una cuenta en `deleting`, los cinco campos del usuario y el texto del criterio J. Siguen en Assumptions como propuestas, el plan las toma como base y se confirman al aprobar el ADR 0006. (Assumptions)

### Para la segunda ronda

Cada una con el ítem que la implementa. Ninguna cambia lo que C3a construye.

| Pregunta | Ítem | Por qué espera |
| --- | --- | --- |
| §13.3, correo: proveedor, remitente y dominio (SPF, DKIM y DMARC); si `worker-mail` sale directo o por un relay propio (imagen nueva); la transferencia internacional (Ley 25.326, art. 12); permiso para Mailpit | C3b | Es la de mayor impacto de C3 entero, pero no cambia nada de C3a. Tiene plazo largo: el correo real necesita un dominio, y el dominio y el DNS son una acción de C4. Conviene pensarla ya. |
| §13.9, cambio de email: sólo por consola o con autoservicio | C3b | `taller:change-email` avisa a las dos direcciones, así que necesita el correo |
| §13.20, registro abierto: restringirlo a dominios de email | C3b | El registro queda detrás de `REGISTRATION_OPEN=false` y es de C3b |
| §13.13, retenciones | transversal | C3a aplica las del ADR (sesiones vencidas, tokens de 60 minutos, invitaciones vencidas a los 30 días). Siguen abiertos los días de logs y de respaldos, y si se borran las cuentas inactivas |
| §13.14, Ley 25.326: texto del aviso, responsable de la base, inscripción ante la AAIP, menores de edad | transversal | C3a guarda sólo la versión aceptada; el texto lo escribe el usuario |
| §13.15, carga: usuarios simultáneos y tamaño de las aulas | transversal | Dimensiona la ráfaga de Nginx; mientras, el supuesto de trabajo es un aula de 40 |
| Si `password.confirm` entra en C3a sin consumidor propio; cómo se cambia el rol o el estado antes de C3b; si el front necesita `appBuild`; los códigos de 405 y 500; el texto del criterio J | C3a | Salieron de esta spec y no son del ADR; quedan como propuestas en Assumptions. El plan las toma como base y las confirma la aprobación del ADR 0006 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alta con un link de un solo uso (Priority: P1)

Quien opera el taller crea el primer admin y a cada alumno con un comando que imprime un link. Quien lo recibe lo abre, ve a qué email se invitó, elige su nombre y su contraseña, acepta el aviso de privacidad y queda con la sesión abierta. El link no sirve dos veces.

**Why this priority**: sin cuentas no hay nada que probar de lo demás, y no hay otro camino para crearlas: ninguna contraseña pasa por la consola (§4.1, paso 5).

**Independent Test**: crear una invitación por consola, consultarla y aceptarla por HTTP, y repetir la aceptación con el mismo token.

**Acceptance Scenarios**:

1. **Dado** un email sin cuenta, **cuando** el operador corre `taller:invite <email>`, **entonces** imprime un link con el token en el fragmento, y la base guarda sólo el sha256 del token.
2. **Dado** una base sin ninguna cuenta, **cuando** el operador corre `taller:invite <email> --role=admin`, **entonces** el link sirve para crear la primera cuenta con rol admin, y esa invitación vence a las 48 horas (la de un alumno, a los 7 días).
3. **Dado** un link vigente, **cuando** se consulta, **entonces** devuelve el email, el rol y el vencimiento; si venció, responde 410 `invitation_expired`, y si fue usado o nunca existió, 404 `invitation_not_found`, sin distinguirlos.
4. **Dado** un link vigente, **cuando** quien lo recibe manda su nombre, una contraseña válida y la versión vigente del aviso, **entonces** se crea la cuenta (activa y con el email verificado), se borra la invitación, se abre la sesión con un ID nuevo y responde 201; el mismo link vuelve a dar 404.
5. **Dado** el mismo link aceptado a la vez desde dos navegadores, **cuando** llegan los dos pedidos, **entonces** se crea una sola cuenta y el otro recibe 404.
6. **Dado** un email que ya tiene cuenta, **cuando** el operador corre `taller:invite`, **entonces** el comando falla diciendo que la cuenta existe; con una invitación vigente o vencida, la renueva, y el link anterior deja de valer.
7. **Dado** una contraseña corta, que repite el email o el nombre, o que está en la lista de comunes, **cuando** se acepta la invitación, **entonces** responde 422 `validation_failed` con el motivo en español, y la invitación sigue vigente.

*Cubre: FR-001 a FR-004 y FR-017 a FR-024; SC-002.*

---

### User Story 2 - Ingresar, mantener la sesión y salir (Priority: P1)

Un alumno ingresa con su email y su contraseña, usa el taller con una sesión que vence sola y sale. Quien intenta adivinar contraseñas no aprende qué emails existen, y no puede dejar afuera al titular.

**Why this priority**: es la puerta de todo lo que protege el taller, y el primer lugar donde un error de diseño se vuelve un ataque.

**Independent Test**: ingresar con credenciales buenas y malas, agotar los límites, dejar vencer la sesión y salir.

**Acceptance Scenarios**:

1. **Dado** credenciales válidas, **cuando** ingresa, **entonces** recibe 200 con su usuario, una cookie de sesión HttpOnly, la cookie de dispositivo y un ID de sesión nuevo.
2. **Dado** un email que no existe y la contraseña equivocada de uno que sí, **cuando** ingresan, **entonces** los dos reciben el mismo 422 `auth_failed`, con el mismo cuerpo y un tiempo de respuesta que no revela cuál es cuál.
3. **Dado** una cuenta `disabled`, **cuando** ingresan con la contraseña correcta, **entonces** responde 403 `account_disabled` sin abrir sesión; con la incorrecta, 422 `auth_failed`.
4. **Dado** seis intentos fallidos en un minuto con el mismo email desde la misma red, **cuando** llega el sexto, **entonces** recibe 429 con `Retry-After`.
5. **Dado** diez fallos consecutivos contra una cuenta desde dispositivos sin cookie, **cuando** otro dispositivo desconocido prueba, **entonces** recibe 429 (1 minuto, que se duplica hasta 15), y el titular, con su cookie de dispositivo, entra igual.
6. **Dado** un alumno que pidió «recordarme», **cuando** vence la sesión de 30 minutos, **entonces** sigue dentro hasta los 30 días; a un admin nunca se le emite esa cookie.
7. **Dado** una sesión sin actividad por 30 minutos, o iniciada hace más de 8 horas, **cuando** hace un pedido, **entonces** recibe 401 `unauthenticated`.
8. **Dado** un alumno con sesión, **cuando** sale, **entonces** recibe 204, y su cookie ya no sirve ni siquiera con la cookie de recuerdo vieja.

*Cubre: FR-005 a FR-016; SC-003 y SC-004.*

---

### User Story 3 - El contenido sólo para quien tiene sesión (Priority: P1)

El front pregunta quién es el usuario con `GET /api/session` y, con sesión, lee el contenido de C2 igual que antes. Sin sesión, el contenido no sale.

**Why this priority**: es lo que C2 le dejó a C3 y lo que hace esperar a A3. Cumple la aceptación de C2 («sin sesión, 401»).

**Independent Test**: pedir las seis rutas de contenido sin sesión y con sesión, y comparar los bytes con el meta del generador.

**Acceptance Scenarios**:

1. **Dado** un cliente sin sesión, **cuando** pide cualquiera de las seis rutas de contenido, **entonces** recibe 401 `unauthenticated`, en JSON y en español.
2. **Dado** una sesión activa, **cuando** pide las 17 porciones y cada ejercicio, **entonces** el sha256 de cada cuerpo es el de su huella del generador, con el mismo `ETag` y `Content-Version`, y el 304 sigue funcionando con `If-None-Match` fuerte y débil.
3. **Dado** cualquier respuesta de contenido con sesión, **cuando** se inspeccionan sus cabeceras, **entonces** lleva `Cache-Control: private, no-cache` y no lleva `Vary: Cookie`.
4. **Dado** un cliente sin sesión, **cuando** pide `GET /api/session`, **entonces** recibe 200 con `user: null`, `contentVersion`, los catálogos con su `chainPosition` y `features`, con `Cache-Control: no-store` y la cookie `XSRF-TOKEN`; con sesión, el mismo pedido trae el usuario.
5. **Dado** una cuenta con el email sin verificar, **cuando** pide contenido, **entonces** recibe 403 `email_unverified`.
6. **Dado** una cuenta admin, **cuando** pide contenido, **entonces** lo recibe igual que un alumno (el rol no cambia el acceso al contenido; Clarifications, Q3).
7. **Dado** el health check `GET /api/up`, **cuando** se pide sin sesión, **entonces** responde 200 y no crea ninguna fila en `sessions`.

*Cubre: FR-031 a FR-035; SC-001.*

---

### User Story 4 - Una cuenta que cambia pierde acceso, y el titular puede protegerse (Priority: P2)

Cuando una cuenta se deshabilita o cambia su contraseña, las sesiones viejas dejan de servir en el siguiente pedido. El titular puede cambiar su contraseña, cerrar sus otras sesiones y reconfirmar su contraseña antes de una acción sensible.

**Why this priority**: sin revocación inmediata, una sesión robada sigue valiendo. Pero no hace falta para que el alumno entre por primera vez.

**Independent Test**: abrir dos sesiones de una cuenta, cambiar su estado o su contraseña desde una y hacer un pedido desde la otra.

**Acceptance Scenarios**:

1. **Dado** una cuenta con una sesión abierta, **cuando** su estado pasa a `disabled`, **entonces** el siguiente pedido de esa sesión a una ruta que pide sesión recibe 403 `account_disabled` y deja de servir, aunque la fila de `sessions` siga ahí (`GET /api/session`, que es pública, responde `user: null`: ver FR-034).
2. **Dado** un alumno con dos sesiones abiertas, **cuando** cambia su contraseña en una (con la actual), **entonces** esa sigue con un ID nuevo y la otra recibe 401 en su siguiente pedido.
3. **Dado** un alumno con varias sesiones, **cuando** usa «cerrar las otras sesiones» con su contraseña, **entonces** las demás dejan de servir y la actual sigue.
4. **Dado** un alumno que confirma su contraseña, **cuando** consulta el estado, **entonces** `confirmed` es verdadero durante 900 segundos; sin confirmar, una ruta que exige confirmación responde 423 `password_confirmation_required`, y cada fallo de la confirmación suma al bloqueo.
5. **Dado** un alumno con sesión, **cuando** cambia su nombre, **entonces** recibe 200, y ningún campo le permite cambiar su email, su rol ni su estado.

*Cubre: FR-007, FR-008 y FR-027 a FR-030; SC-005.*

---

### User Story 5 - Recuperar el acceso sin correo (Priority: P2)

Un alumno olvidó su contraseña. El operador genera un link de recuperación por consola, se lo entrega, y el alumno fija una contraseña nueva. Para un admin, es el único camino.

**Why this priority**: sin esto, quien olvida su contraseña pierde la cuenta hasta que llegue C3b. Es chico porque reutiliza el broker de contraseñas de Laravel.

**Independent Test**: generar el link, usarlo y comprobar que se cerraron todas las sesiones.

**Acceptance Scenarios**:

1. **Dado** una cuenta existente, **cuando** el operador corre `taller:password-reset-link <email>`, **entonces** imprime un link de 60 minutos con el token y el email en el fragmento, y no envía nada.
2. **Dado** ese link, **cuando** se usa con una contraseña válida, **entonces** la contraseña cambia, se borran todas las sesiones de la cuenta, se limpia el bloqueo y no se abre sesión.
3. **Dado** un token inválido o vencido, o un email sin cuenta, **cuando** se intenta restablecer, **entonces** recibe el mismo 422 en los tres casos.
4. **Dado** un link recién emitido, **cuando** el operador pide otro antes de 60 segundos, **entonces** el comando se niega y dice cuánto falta.

*Cubre: FR-025 y FR-026; SC-005.*

---

### User Story 6 - Una pestaña de otra cuenta no puede actuar (Priority: P2)

Dos cuentas comparten un navegador. La pestaña que quedó abierta con la cuenta A, después de que B ingresó, no puede modificar nada con la sesión de B.

**Why this priority**: la cookie de sesión es del navegador, no de la pestaña. Sin este control, reintentar tras un 419 o un 401 reejecutaría como B lo que empezó A (D36), y en B2 y D1 eso es un run o un «Borrar todo».

**Independent Test**: ingresar como A, ingresar como B en otro lado con el mismo navegador y mandar una modificación con la cuenta de A.

**Acceptance Scenarios**:

1. **Dado** una sesión de B, **cuando** llega una modificación con `X-Taller-User` de A, **entonces** responde 409 `account_mismatch` y no toca nada.
2. **Dado** una modificación autenticada sin el encabezado, **cuando** llega, **entonces** responde 409 `account_mismatch`.
3. **Dado** un token CSRF vencido, **cuando** llega una modificación, **entonces** responde 419 `csrf_token_mismatch`, y el cliente pide `GET /api/session` para comparar la cuenta antes de reintentar.
4. **Dado** un pedido sin sesión (ingreso, invitaciones, restablecimiento), **cuando** llega, **entonces** no exige el encabezado.

*Cubre: FR-036; SC-006.*

---

### User Story 7 - Operar C3a sin sorpresas (Priority: P3)

Quien despliega necesita que un error de la API siempre se entienda, que un despliegue no se cuelgue detrás de una transacción larga, que los contenedores sin salida no hablen con Internet ni por DNS, que lo vencido se limpie solo y que los checks contra el stack sigan sirviendo.

**Why this priority**: sin esto C3a funciona, pero se vuelve difícil de operar y de desplegar con seguridad. No bloquea que el primer alumno entre.

**Independent Test**: provocar cada situación contra el stack levantado y contra una base de pruebas.

**Acceptance Scenarios**:

1. **Dado** una ruta inexistente, un método no permitido o una falla interna provocada, **cuando** se piden bajo `/api`, **entonces** la respuesta es `{message, code}` en español, sin traza.
2. **Dado** un despliegue con una transacción abierta hace más de 30 segundos, **cuando** corre el chequeo, **entonces** se aborta antes de migrar; si falta el privilegio mínimo, falla cerrado y el mensaje dice cómo aplicarlo.
3. **Dado** un usuario de MySQL restringido, **cuando** corre el chequeo, **entonces** el privilegio mínimo alcanza para detectar la transacción, y sin él falla cerrado.
4. **Dado** un contenedor de una red `internal`, **cuando** intenta resolver un nombre de Internet, **entonces** no lo consigue, y resuelve `mysql` y `php`.
5. **Dado** el `scheduler` corriendo, **cuando** pasan 15 minutos, **entonces** las sesiones vencidas se podan por lotes y la caché vencida se purga, y ningún pedido corre esa limpieza.
6. **Dado** el stack levantado, **cuando** corren `api:smoke`, `api:content:check` y `deploy-check.sh`, **entonces** pasan con el contenido protegido.
7. **Dado** un ingreso fallido y uno correcto, **cuando** se leen los registros, **entonces** no figuran la contraseña, el token ni el ID de sesión, y el email aparece como HMAC.

*Cubre: FR-037 a FR-046; SC-007 a SC-010. Las pruebas de FR-047 a FR-052 y los criterios SC-011 y SC-012 valen para todas las historias.*

---

### Edge Cases

- **Sin ningún import:** `GET /api/session` responde igual, con `contentVersion: null` y `catalogs: []` (propuesta): el ingreso no depende del contenido. Las rutas de contenido, con sesión, siguen respondiendo 503 `content_not_imported`.
- **Dos pestañas, dos cuentas:** comparten la cookie. Las modificaciones de la pestaña vieja reciben 409, pero sus lecturas ven los datos de la cuenta nueva; por eso el cliente compara `GET /api/session` con la cuenta que tiene en memoria antes de reintentar.
- **Email con mayúsculas o espacios:** se guarda sin espacios y en minúsculas, y se compara sin distinguir mayúsculas pero sí acentos: `Ana@x.com` y `ana@x.com` son el mismo, `papá.com.ar` y `papa.com.ar` no.
- **Contraseña con tildes o eñes:** se normaliza a NFC antes de contar los 72 bytes, así que una `á` compuesta y una descompuesta son la misma contraseña, y el máximo efectivo baja de 64 caracteres.
- **Una invitación para un email que ya tiene cuenta:** el comando falla. Si la cuenta se creó entre la consulta y la aceptación, la aceptación recibe 409 `email_taken`.
- **Link vencido, usado o inventado:** el vencido da 410; usado, revocado e inventado dan el mismo 404, para no revelar qué existió.
- **El admin bajo ataque:** un atacante puede bloquear su cuenta para dispositivos desconocidos, pero no para el dispositivo con su cookie (hasta 10 fallos seguidos), y el operador siempre puede restablecer la contraseña por consola.
- **Cuenta `disabled` o `deleting`:** `disabled` con la contraseña correcta recibe 403, que revela que la cuenta existe sólo a quien la conoce; `deleting` (que crea C3b) falla como credencial inválida, y con una sesión viva recibe 401 (propuesta).
- **Una cookie de sesión robada:** sirve hasta 30 minutos de inactividad o 8 horas, y no después de que la cuenta se deshabilita o cambia su contraseña.
- **Rutas inexistentes sin sesión:** un 404 de ruta responde 404 `not_found` aunque no haya sesión: no revela nada.
- **Hasta C4, puede ser una sola IP:** los límites «por red» dependen de la IP real del cliente, que fija C4 (§4.6). Mientras no la fija, PHP puede ver la misma IP para todos los clientes y los límites los tratan como uno. Están calibrados para eso (ráfaga holgada) y C4 los afina.
- **El primer pedido de un cliente nuevo:** es `GET /api/session`, que le da la cookie `XSRF-TOKEN`; un POST de ingreso sin ella recibe 419 `csrf_token_mismatch`.
- **Primer despliegue de C3a sobre un volumen existente:** el chequeo de transacciones largas falla cerrado hasta que el operador aplica el comando único de `db-grants`; el mensaje dice cuál es.
- **`GET /api/session` por cada cliente nuevo:** crea una fila de sesión de invitado. Nginx la limita por IP, y el `scheduler` poda las vencidas.
- **Sin CORS:** la API sigue siendo de un solo origen; un pedido de otro origen no recibe cabeceras de CORS.

## Requirements *(mandatory)*

### Functional Requirements

**Cuentas y esquema**

- **FR-001**: El sistema DEBE guardar de cada cuenta: el nombre (de 1 a 80 caracteres, siempre mostrado escapado), el email (único, guardado sin espacios y en minúsculas, y comparado sin distinguir mayúsculas pero sí acentos), la contraseña con hash, el rol (`admin` o `student`), el estado (`active`, `disabled` o `deleting`; sólo `active` entra), la fecha de verificación del email, la versión del aviso de privacidad aceptada con su fecha, y las fechas de creación y de modificación. *(§5.2, §3.1, D19)*
- **FR-002**: `role` y `status` NO DEBEN poder asignarse en masa, y ningún pedido DEBE aceptar `user_id`, `role` ni `status` del cliente: la cuenta sale siempre de la sesión. *(§4.5, §8)*
- **FR-003**: Las tablas de C1 que C3a toca DEBEN cambiar mientras están vacías: los instantes pasan de `TIMESTAMP` a `DATETIME(3)` en UTC (por el límite de 2038), la colación del email pasa a una que distingue acentos, y las claves de `cache` y `cache_locks` pasan a comparación binaria. Cada tabla nueva o recreada DEBE nacer con un solo `CREATE TABLE` atómico y sus restricciones nombradas. *(§10, D03, D04, D07, D35)*
- **FR-004**: Toda tabla con una columna `user_id` DEBE tener una clave foránea a `users(id)` con borrado en cascada, y una prueba de esquema DEBE exigirlo para las tablas de hoy (`sessions`) y para las que lleguen con B2 y D1, con una lista aparte de excepciones: las tablas por email (`invitations` y `password_reset_tokens`), las hijas sin `user_id` y el libro de supresiones de C3b. *(§8 «UserData», D06)*

**Sesión**

- **FR-005**: La autenticación DEBE usar la sesión de Laravel, con una cookie HttpOnly y `SameSite=Lax` y protección contra CSRF (`XSRF-TOKEN` → `X-XSRF-TOKEN`), montada sin el paquete Sanctum. NO DEBE usar tokens de acceso ni JWT. *(D16, §4.9; R11; Clarifications, Q1)*
- **FR-006**: La sesión DEBE vencer a los 30 minutos de inactividad y, como máximo, a las 8 horas de iniciada, y su contenido DEBE guardarse cifrado. El máximo de 8 horas no rige para un pedido que lleva la cookie de «recordarme» (FR-015): al vencer la sesión, esa cookie vuelve a ingresar al estudiante. *(§4.2; Clarifications, Q5)*
- **FR-007**: La revocación NO DEBE depender del driver de sesiones. En cada pedido con sesión, el estado de la cuenta DEBE ser `active` (si es `disabled`, responde 403 `account_disabled`; si es `deleting`, 401 `unauthenticated`); el hash de la contraseña guardado en la sesión DEBE coincidir con el de la cuenta; y el token de «recordarme» se rota al salir y al cambiar o restablecer la contraseña. Borrar la fila de `sessions` es limpieza, no una garantía. *(D16, §4.5)*
- **FR-008**: El ID de la sesión DEBE regenerarse al ingresar, al aceptar una invitación, al cambiar la contraseña y al reconfirmarla; al salir, la sesión DEBE invalidarse. *(§4.2)*
- **FR-009**: Las rutas que no usan sesión, como el health check `GET /api/up`, DEBEN quedar fuera del middleware de sesión. `GET /api/session`, que es pública, DEBE crear una sesión de invitado por cada cliente nuevo y dejar la cookie `XSRF-TOKEN`. *(D16, §4.2, §7)*

**Ingreso**

- **FR-010**: `POST /api/auth/login` DEBE canonicalizar el email (sin espacios y en minúsculas, como se guarda); aplicar los límites y el bloqueo por cuenta; verificar la contraseña; comprobar el estado; y recién entonces iniciar la sesión, con `remember` sólo si la cuenta es de un estudiante y lo pidió. La verificación DEBE tardar lo mismo exista o no la cuenta (un hash ficticio del mismo costo y un piso de tiempo de 200 ms). *(§4.2)*
- **FR-011**: El ingreso DEBE responder 200 con `{data: usuario}`; ante cualquier fallo de credenciales, 422 `auth_failed` con el mismo cuerpo exista o no la cuenta; con la contraseña correcta y la cuenta `disabled`, 403 `account_disabled` sin iniciar la sesión; `deleting` falla como una credencial inválida; y al pasarse de un límite, 429 con `Retry-After`. *(§4.2, §3.1, §8)*
- **FR-012**: El ingreso DEBE limitarse a 5 intentos por minuto por email canónico y red, y a 60 por minuto por red. «Red» es la IPv4 o el /64 de IPv6. *(§4.6)*
- **FR-013**: El bloqueo por cuenta DEBE ser progresivo y valer sólo para dispositivos sin una cookie de dispositivo válida para esa cuenta: desde el 10.º fallo consecutivo la cuenta queda bloqueada 1 minuto para ellos, el plazo se duplica con cada fallo nuevo hasta 15 minutos, y después de 100 fallos consecutivos los dispositivos desconocidos no entran hasta que se restablezca la contraseña. Su clave es el email canónico, exista o no la cuenta, para que el 429 no revele qué emails existen. Un ingreso correcto o un restablecimiento limpia el contador. *(§4.6, §3.1)*
- **FR-014**: La cookie de dispositivo DEBE estar cifrada y firmada, ligada a la cuenta, ser HttpOnly y durar 180 días. Sólo exime del bloqueo por cuenta, con un límite propio de 5 fallos por minuto, y después de 10 fallos seguidos deja de eximir. Es estado del cliente, sin tabla: no es auditoría de logins (R5). *(§4.2; Clarifications, Q5)*
- **FR-015**: «Recordarme» DEBE ser opcional, de 30 días y sólo para estudiantes. A un admin NO DEBE emitírsele nunca. *(§4.2; Clarifications, Q5)*
- **FR-016**: `POST /api/auth/logout` DEBE invalidar la sesión, rotar el token de «recordarme» y responder 204. *(§7)*

**Invitaciones y alta**

- **FR-017**: Una invitación DEBE estar ligada a un email, ser de un solo uso y llevar el rol inicial; hay a lo sumo una pendiente por email. Su token DEBE tener 256 bits y guardarse sólo como sha256. Vence a los 7 días, y a las 48 horas si es de admin. *(D18, §5.2; Clarifications, Q4)*
- **FR-018**: `taller:invite <email> [--role=admin]` DEBE crear la invitación e imprimir su link, `https://<APP_URL>/#invitacion=<token>`, armado desde la configuración y nunca desde `Host`. Sirve para el primer admin y para dar de alta alumnos mientras no exista la administración de C3b. Ninguna contraseña pasa por la consola. Sobre un email que ya tiene cuenta falla con ese motivo; sobre uno con una invitación vigente o vencida la renueva: rota el token y el vencimiento, y el link anterior deja de valer. *(§4.1, paso 5; D18; la renovación por consola es propuesta)*
- **FR-019**: `POST /api/auth/invitations/lookup {token}` DEBE devolver `{email, role, expiresAt}`; si la invitación venció, 410 `invitation_expired`; en cualquier otro caso (usada, revocada o desconocida), 404 `invitation_not_found`. *(§4.1, paso 2; §3.1)*
- **FR-020**: `POST /api/auth/invitations/accept {token, name, password, password_confirmation, privacyVersion}` DEBE hashear la contraseña antes de abrir la transacción; crear en ella la cuenta con el rol de la invitación, `active` y con el email verificado; borrar la invitación; iniciar la sesión, regenerar su ID y responder 201 con `{data: usuario}`. Dos aceptaciones simultáneas del mismo token crean una sola cuenta y la segunda recibe 404; el UNIQUE del email es la última guarda (409 `email_taken`). DEBE rechazar con 422 una `privacyVersion` que no sea la vigente. *(§4.1, paso 3)*
- **FR-021**: El token de una invitación y el de una recuperación DEBEN viajar sólo en el fragmento del link y en el cuerpo de un POST, nunca en la ruta ni en la query, porque Nginx registra la línea del pedido. Cada aceptación DEBE quedar en los registros con el id de quien invitó (nulo si fue la consola), porque la fila desaparece. *(D18, D20)*
- **FR-022**: La API DEBE guardar la versión del aviso de privacidad que aceptó cada cuenta y cuándo; la versión vigente sale de la configuración. `POST /api/me/privacy {privacyVersion}` DEBE registrar la aceptación de la versión vigente y responder 204. El texto del aviso no es de C3a: lo escribe el usuario (§13.14) y lo muestra el front. *(§5.2; Ley 25.326, arts. 5 y 6)*

**Contraseñas y recuperación sin correo**

- **FR-023**: Las contraseñas DEBEN tener de 15 a 64 caracteres y, como mucho, 72 bytes, sin reglas de composición. DEBEN normalizarse a NFC antes de fijarse y de verificarse (los 72 bytes se cuentan después de normalizar), contrastarse con una lista local de contraseñas bloqueadas (la del NCSC de SecLists, filtrada a las entradas de 15 caracteres o más) más el nombre y el email de la cuenta, y guardarse con bcrypt de 12 rondas. *(§4.7; Clarifications, Q2)*
- **FR-024**: El contraste con la lista DEBE ser local: NO DEBE consultar Internet, porque el contenedor `php` no tiene salida. *(§4.7)*
- **FR-025**: `taller:password-reset-link <email>` DEBE imprimir un link de recuperación, `https://<APP_URL>/#restablecer=<token>&email=<email>`, que vence a los 60 minutos y no se emite de nuevo antes de 60 segundos. Sirve para cualquier rol y es el único camino de recuperación de un admin. No envía nada. *(§4.3)*
- **FR-026**: `POST /api/auth/reset-password {token, email, password, password_confirmation}` DEBE fijar la contraseña nueva, rotar el token de «recordarme», borrar todas las sesiones de la cuenta y limpiar su bloqueo; NO DEBE iniciar sesión. El mismo 422 vale para un token inválido, uno vencido y una cuenta inexistente. Se limita a 10 por minuto por red y 5 por minuto por email. *(§4.3, §4.6)*

**Cuenta propia**

- **FR-027**: `PATCH /api/me {name}` DEBE cambiar el nombre. El email, el rol y el estado no se cambian por HTTP. *(§7, §5.2)*
- **FR-028**: `PUT /api/me/password {current_password, password, password_confirmation}` DEBE exigir la contraseña actual, regenerar el ID de la sesión actual (que sigue), cortar las demás sesiones y rotar el token de «recordarme». *(§7, D16)*
- **FR-029**: `POST /api/me/sessions/logout-others` DEBE exigir la contraseña en el cuerpo y cortar todas las demás sesiones de la cuenta, y responder 204. *(§7)*
- **FR-030**: `POST /api/auth/confirm-password {password}` (201) y `GET /api/auth/confirmed-password-status` (`{confirmed}`) DEBEN existir, con un `password.confirm` de 900 segundos que, sin confirmar, responde 423 `password_confirmation_required` con el cuerpo `{message, code}` (el de Laravel responde sin `code`, o redirige a una ruta que no existe). Los fallos DEBEN sumar al bloqueo por cuenta y limitarse a 5 por minuto por usuario. C3a lo entrega sin un consumidor propio: lo usan C3b (acciones de admin, exportar y suprimir) y D1 (borrar el progreso), y el orden entre los dos está abierto. *(D19, §4.6, §8)*

**Contenido y sesión (lo que deja C2)**

- **FR-031**: Las seis rutas de contenido (los 17 recursos) DEBEN exigir una sesión activa y el email verificado: sin sesión, 401 `unauthenticated`; con la cuenta sin verificar, 403 `email_unverified`, que emite un `verified` propio porque el de Laravel responde 403 sin `code`. *(C2 FR-025; §7, §8)*
- **FR-032**: Con sesión, el contenido DEBE seguir saliendo como en C2: los mismos bytes (el sha256 del cuerpo es el de su huella del generador), el mismo `ETag` y `Content-Version`, el 304 ante un `If-None-Match` fuerte o débil, `Cache-Control: private, no-cache` sin tocar, sin `Vary: Cookie` y sin límite de tasa de Laravel. El middleware de sesión NO DEBE agregar `Vary: Cookie` ni modificar `Cache-Control` en esas respuestas. *(C2 FR-014, FR-017, FR-021; D11)*
- **FR-033**: Una cuenta con rol `admin` DEBE poder usar el contenido igual que una de alumno: la cuenta de admin separada se recomienda, no se exige. *(S5, §13.7; Clarifications, Q3)*
- **FR-034**: `GET /api/session` DEBE ser pública y responder `{user, features: {passwordReset, registration}, contentVersion, catalogs: [{code, sliceBy, chainPosition}]}`, con `Cache-Control: no-store` y la cookie `XSRF-TOKEN`. `user` es el usuario de la sesión o `null`. `contentVersion` y los catálogos activos salen del último import (C2 FR-026) con una lectura por clave primaria y la de los catálogos, sin armar contenido. En C3a, `features.passwordReset` y `features.registration` valen `false`, y salen de la configuración para que C3b los encienda sin tocar código. Un `appBuild` opaco entra sólo si A3 lo pide. Con una sesión que dejó de valer (cuenta deshabilitada o en `deleting`, contraseña cambiada o pasadas las 8 horas), responde 200 con `user: null` y descarta la sesión: el arranque del front nunca recibe un 401 ni un 403 de este pedido. *(§7, D13; C2 Q2 y Q3)*
- **FR-035**: El usuario que devuelve la API DEBE llevar sólo `id`, `name`, `email`, `role` y `privacyAccepted` (si la versión que aceptó es la vigente), con sus claves en camelCase; nunca el hash, el token de «recordarme» ni el estado. *(§8; propuesta, ver Assumptions)*

**Cuenta esperada**

- **FR-036**: Todo pedido autenticado que no es GET DEBE llevar `X-Taller-User: <id>`. Un middleware común DEBE compararlo con la cuenta de la sesión y responder 409 `account_mismatch` antes de tocar datos, también cuando el encabezado falta. Los pedidos sin sesión (ingreso, invitaciones y restablecimiento) quedan fuera. *(D36)*

**Errores y mensajes**

- **FR-037**: Todo error bajo `/api` DEBE tener el cuerpo `{message, code}` con el mensaje en español, también los que genera el framework: el 404 de una ruta, el 405 y el 500. Los códigos son los de §8 que C3a o el framework pueden producir: `unauthenticated` (401); `forbidden`, `account_disabled` y `email_unverified` (403); `not_found` e `invitation_not_found` (404); `email_taken` y `account_mismatch` (409); `invitation_expired` (410); `csrf_token_mismatch` (419); `validation_failed`, con `errors`, y `auth_failed` (422); `password_confirmation_required` (423); y `too_many_requests` (429, con `Retry-After`). El 405 y el 500 no tienen código en §8: se proponen `method_not_allowed` y `server_error`, y `bad_request` para los demás 4xx del framework que §8 no lista (un cuerpo ilegible, por ejemplo). Ningún error expone una traza. *(§8; C2 FR-024)*
- **FR-038**: `APP_LOCALE` DEBE valer `es`, y `lang/es` DEBE existir con la validación, la autenticación y las contraseñas traducidas (hoy `api/lang/` no existe y el idioma es `en`). *(§8)*

**Operación**

- **FR-039**: Un servicio `scheduler`, con la imagen existente y `schedule:work`, DEBE podar por lotes las sesiones vencidas cada 15 minutos (`DELETE … ORDER BY last_activity LIMIT 1000` en bucle), limpiar los tokens de recuperación vencidos cada 15 minutos, purgar la caché vencida (incluida la de cuerpos del contenido, que vive 30 días) y borrar las invitaciones 30 días después de que vencen, sin solaparse. El sorteo de limpieza de sesiones de Laravel DEBE quedar en 0, para que ningún pedido corra un `DELETE` sin `LIMIT`. NO procesa la cola `default`: todavía no hay trabajos. *(§4.2, D34, D30, §7; C2)*
- **FR-040**: Un servicio `db-grants`, con el perfil `ops`, DEBE aplicar con root un SQL idempotente con los privilegios que el chequeo necesita: un script de inicialización en los volúmenes nuevos y un comando único en los existentes. *(D34, D35)*
- **FR-041**: Antes de migrar, el despliegue DEBE abortar si hay transacciones abiertas hace más de 30 segundos, consultando `performance_schema.events_transactions_current` con el privilegio mínimo (`SELECT` sobre esa tabla, que `taller` no tiene hoy), y DEBE fallar cerrado: si falta el permiso, se detiene con un mensaje que dice cómo aplicarlo. *(D35; C2 FR-036)*
- **FR-042**: Una prueba con un usuario de MySQL restringido (no root y sin `PROCESS`) DEBE comprobar que el privilegio mínimo alcanza para detectar una transacción abierta hace más de 30 segundos y que, sin él, el chequeo falla cerrado. Es el criterio J del DBA. *(Plan de C2, decisión 5; ver Assumptions)*
- **FR-043**: Ningún contenedor de una red `internal` DEBE poder resolver nombres de Internet a través del DNS de Docker, y los nombres internos (`php`, `mysql`) DEBEN seguir resolviéndose. *(§10; estacionado de C1)*
- **FR-044**: Nginx DEBE limitar por IP los pedidos a `/api/`, con una ráfaga que admita un aula tras un mismo NAT, y `GET /api/session` con una zona propia, porque cada cliente nuevo crea una fila de sesión. Al pasarse responde 429 (no el 503 por omisión de Nginx, que se confundiría con `queue_full` de B2) con `Retry-After` y el cuerpo `{message, code}`. DEBE además registrar las rutas de `/api/` sin la query string. *(§4.6, §4.2, D20)*
- **FR-045**: Los registros de la aplicación DEBEN ser estructurados, ir a stderr y llevar el id del usuario, un HMAC del email con una clave propia, la IP y el id del pedido, y NO DEBEN contener nunca contraseñas, tokens, links ni IDs de sesión. *(D20, §8)*
- **FR-046**: `sh backend/api/scripts/deploy-check.sh` (que hoy pide `/api/guide`) y `npm run api:content:check` (que pide las 17 porciones) DEBEN seguir pasando con el contenido detrás de la sesión: sin cookie recibirían 401. DEBEN autenticarse con una cuenta de prueba propia, que crean y retiran ellos. `npm run api:smoke` DEBE seguir pasando y sumar que una porción sin sesión responde 401. *(C6 FR-019 y SC-007 dependen de los dos primeros)*

**Verificación** (pruebas que el cambio DEBE traer antes de la implementación, según la constitución II)

- **FR-047**: Las pruebas DEBEN correr con Pest contra MySQL 9.7 real, y las de sesión, límites, bloqueo y restablecimiento DEBEN fijar por prueba los drivers reales (`database`), porque `phpunit.xml` usa `array` y `sync`. *(§8; `backend/api/AGENTS.md`)*
- **FR-048**: Una prueba DEBE recorrer todas las rutas de `/api` y exigir sesión en todas salvo una lista explícita (`up`, `session`, `auth/login`, `auth/invitations/lookup`, `auth/invitations/accept` y `auth/reset-password`). Otras DEBEN cubrir la asignación en masa de `role` y `status`, `account_mismatch` en cada ruta que modifica con sesión, y `email_unverified` en el contenido. *(§4.5, §8)*
- **FR-049**: Las pruebas DEBEN cubrir una cuenta deshabilitada con una sesión viva (403 en el siguiente pedido) y un cambio de contraseña con otra sesión abierta (la otra deja de servir). *(D16)*
- **FR-050**: DEBE existir una prueba de aceptación en un navegador real de la cookie (HttpOnly y SameSite), del CSRF y del cambio de cuenta en el mismo navegador (una pestaña de A, después de que B ingresó, recibe 409), porque Pest no manda `Referer`, `Origin` ni `Sec-Fetch-Site`. Playwright no está adoptado: ver «Acciones del usuario». *(§4.9, §8)*
- **FR-051**: El código nuevo DEBE pasar el análisis estático en el nivel 9, que `phpstan.neon` fija desde C6, sin baseline ni errores ignorados; y DEBEN pasar Pint, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`. *(C6 FR-012; hoja de ruta)*
- **FR-052**: La documentación que cita a Sanctum o a la autenticación (`backend/api/AGENTS.md`, el comentario de `backend/api/bootstrap/app.php` y `docs/architecture.md`) DEBE actualizarse en el mismo cambio, igual que las variables y los secretos nuevos (`backend/api/scripts/init-env.sh` y el ancla `x-laravel-env` de `docker/compose.yaml`). *(`AGENTS.md`)*

### Key Entities *(include if feature involves data)*

- **Cuenta:** una persona que usa el taller. Tiene nombre, email, rol (`admin` o `student`), estado (`active`, `disabled` o `deleting`), verificación de email y versión aceptada del aviso de privacidad.
- **Invitación:** el permiso, de un solo uso, para crear una cuenta con un email y un rol. Tiene un token que sólo existe en el link, y un vencimiento.
- **Sesión:** lo que mantiene a una cuenta dentro. Vive en la base, vence por inactividad y por antigüedad, y se puede cortar desde la cuenta.
- **Cookie de dispositivo:** una marca firmada en el navegador del titular que lo exime del bloqueo por cuenta. No se guarda en la base.
- **Contador de fallos:** los fallos consecutivos contra un email canónico, exista o no la cuenta, que alimentan el bloqueo progresivo. Vive en la caché.
- **Token de recuperación:** el permiso, de 60 minutos, para fijar una contraseña nueva. Lo emite el operador por consola.
- **Aviso de privacidad:** el texto que acepta cada cuenta; C3a guarda sólo qué versión y cuándo.
- **Cuenta esperada:** el id que el cliente declara en cada modificación para que el servidor lo compare con la sesión.
- **Contenido y catálogos:** lo que C2 importó. `GET /api/session` publica su versión y los catálogos con su posición en la cadena.
- **Lista de contraseñas comunes:** un archivo local, con su licencia, contra el que se contrastan las contraseñas nuevas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las seis rutas de contenido responden 401 sin sesión (6 de 6, 0 datos entregados). Con sesión, las 17 porciones y los 274 ejercicios del contenido vigente salen con el sha256 que fija el generador: 0 diferencias, y 304 con su validador.
- **SC-002**: Un link de invitación se usa una sola vez: la segunda aceptación del mismo token da 404 en el 100 % de los casos, y dos aceptaciones simultáneas crean una sola cuenta.
- **SC-003**: Un email inexistente y una contraseña equivocada dan 0 diferencias de estado y de cuerpo, y las dos respuestas respetan el mismo piso de tiempo (200 ms).
- **SC-004**: El sexto intento fallido en un minuto contra el mismo email desde la misma red recibe 429. Mientras una cuenta está bloqueada para dispositivos desconocidos, el titular con su cookie de dispositivo entra en el 100 % de sus intentos correctos.
- **SC-005**: Después de deshabilitar una cuenta, de que cambie su contraseña o de restablecerla, 0 sesiones viejas siguen sirviendo luego de su siguiente pedido.
- **SC-006**: El 100 % de las rutas que modifican con sesión responden 409 `account_mismatch` sin el encabezado correcto, y no escriben nada.
- **SC-007**: El 100 % de los errores de `/api` (también el 404 de una ruta, el 405 y un 500 provocado) trae `{message, code}` en español, con 0 trazas.
- **SC-008**: Un despliegue con una transacción abierta hace más de 30 segundos se detiene antes de migrar (0 migraciones aplicadas). Sin el privilegio mínimo falla cerrado, y con un usuario restringido pasa el criterio J.
- **SC-009**: Desde `php` y `migrate`, 0 nombres de Internet se resuelven y los internos (`mysql` y `php`) sí.
- **SC-010**: 40 alumnos tras una misma IP ingresan en un minuto sin recibir un 429. Es un supuesto de trabajo hasta que §13.15 diga el tamaño real de las aulas.
- **SC-011**: El código nuevo da 0 errores de PHPStan en el nivel 9 y pasan `npm run api:test`, `npm run api:format:check`, `npm run api:analyse`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.
- **SC-012**: La prueba en un navegador real, o su verificación manual declarada, cubre los tres escenarios de FR-050 y pasa.

## Assumptions

- **Fuente.** La fuente técnica es el ADR 0006, en estado «propuesta» y a la espera de su aprobación (acción del usuario de la hoja de ruta). Si lo enmienda, esta spec se ajusta. Las cinco preguntas de §13 que cambian lo que C3a construye se cerraron en el clarify del 2026-10-05 (Clarifications).
- **Punto de partida.** C1, C2 y C6 están entregados (C2: PR #8, `4573457`; C6: PR #17, que sube PHPStan al nivel 9 y deja los registros tipados en `backend/api/app/Content/Record/`).
- **Un solo servidor,** con la carga de referencia del ADR (S2: hasta unas 5.000 cuentas y unas 1.000 activas en el pico).
- **Sin pantallas.** C3a entrega el contrato HTTP. Las pantallas de cuenta (ingreso, invitación, restablecimiento, cambio de contraseña, aviso de privacidad) son de F11, y las de administración de F12, del épico del front.
- **Hasta C4, puede ser una sola IP** para PHP: el puerto escucha sólo en `127.0.0.1` y la IP real del cliente la fija C4. No hay clientes externos antes de C4.
- **Sin correo en C3a.** No se envía nada: las invitaciones y las recuperaciones son links por consola (modo sólo link, S7), y `GET /api/session` informa `features.passwordReset` y `features.registration` en `false`. C3b trae el correo.
- **Hasta C3b no hay un camino soportado para cambiar el rol o el estado** de una cuenta. El operador usa `tinker` (instalado), y queda documentado. Es deliberado: C3b trae el camino con `password.confirm`, la guardia del último admin y sus efectos.
- **Sin Fortify.** Decidido por el usuario en el clarify: el ingreso, la salida, la confirmación de contraseña y el cambio y el restablecimiento de contraseña se arman con el guard de sesión de Laravel, `Hash`, el broker de contraseñas y `RateLimiter`, sin paquetes nuevos. El ADR 0006 nombraba «Fortify sin vistas» (D17, §4.2, §4.3, la tabla de §4.9 y la fila C3 de §10): queda como enmienda pendiente, registrada en la hoja de ruta.
- **Las skills no mandan sobre el ADR.** `laravel-specialist`, `laravel-security` y `laravel-tdd` proponen Sanctum, reglas de composición con `Password::uncompromised()` (que consulta Internet y `php` no tiene salida), un `Gate::before` para un super-admin (el ADR pide permisos sin un `before()` que autorice todo), `declare(strict_types=1)` (C6 lo deja fuera) y coberturas del 80 al 85 % (el proyecto no tiene meta de cobertura). Donde difieren, mandan el ADR y las decisiones del usuario.
- **El aviso de privacidad.** Mientras no exista el texto (§13.14), la versión vigente es un valor de configuración con un valor de desarrollo; el despliegue público exige el real. C3a no bloquea las rutas cuando la versión aceptada no es la vigente: informa `privacyAccepted` y el front pide la aceptación (propuesta); bloquear sería una regla más del grupo de rutas con sesión.
- **Propuestas que no vienen del ADR:**
  - `taller:invite` sobre un email con una invitación vigente la renueva (el ADR sólo define la renovación de una vencida, por HTTP). Sin eso, un link perdido no se podría reemitir antes de C3b.
  - Sin ningún import, `GET /api/session` responde `contentVersion: null` y `catalogs: []`.
  - Los códigos `method_not_allowed` (405) y `server_error` (500), que §8 no tiene.
  - El lookup de una invitación responde 404 `invitation_not_found`, como dicen §4.1 y §7; la tabla de §8 sólo lista `not_found` para los 404. Hay que sumarlo a §8 al aprobar el ADR.
  - Un pedido autenticado sin `X-Taller-User` recibe 409, igual que uno con la cuenta equivocada.
  - Una sesión viva de una cuenta `deleting` recibe 401.
  - El usuario sale con cinco campos (FR-035).
  - `GET /api/session` con una sesión inválida responde 200 con `user: null` y no 401 ni 403 (FR-034): el 403 `account_disabled` de FR-007 rige para las rutas que piden sesión.
  - El máximo de 8 horas no rige con la cookie de «recordarme» (FR-006).
  - El nombre y los atributos de la cookie de dispositivo salen de la configuración y cumplen las reglas de `__Host-`, para que C4 los endurezca sin tocar código; `trustProxies` queda vacío hasta C4.
  - Cambiar la contraseña y cerrar las otras sesiones prueban la contraseña actual con el mismo límite y el mismo bloqueo que confirmarla (FR-030).
  - `taller:password-reset-link` y `reset-password` sólo valen para cuentas `active`.
  - Los demás errores 4xx del framework salen como `bad_request`. El resto de lo que el plan completó está en `research.md`, «Decisiones del plan que la spec no fija».
- **El criterio J.** Su texto original no está en el repositorio, sólo su resumen en el plan de C2 («privilegios con un usuario restringido»). FR-042 lo interpreta así; hay que confirmarlo.
- **PHP-FPM y el buffer pool.** §12 dice «ajustarlos en C3 y B2». Esta spec los deja para B2, salvo que una medición de pedidos con sesión en C3a lo exija.
- **Dependencias.** C1 y C2 (entregados). C3a habilita a A3, B2 y D1, que necesitan la sesión, y a C3b. Esta spec no toca la hoja de ruta de A2, A3 y A4.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las que dicen «usuario» son decisiones ya tomadas; el resto son propuestas de esta spec o del ADR.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se parte C3 | No partirla; partirla en C3a (autenticación) y C3b (invitaciones y administración) con el correo en C3a, como la hoja de ruta; partirla con el correo en C3b (esta spec); partirla en tres (autenticación, correo y administración, ciclo de vida) | Dos mitades con el correo en C3b (confirmada en el clarify). Sin partir, A3, B2 y D1 esperan 15 endpoints que no usan. Con el correo en C3a, C3a suma `worker-mail`, el único contenedor con salida a Internet, y depende de la decisión del proveedor para probarse de punta a punta. En tres, el ciclo de vida es un corte natural si C3b queda grande, porque necesita las tablas de B2 y D1 |
| Dónde va la recuperación de contraseña | Por correo en C3a; por consola en C3a y por correo en C3b | Por consola en C3a (S7): es el camino que un admin necesita siempre, y cubre al alumno hasta que llegue el correo |
| Dónde van las invitaciones | Todas en C3b; la aceptación y `taller:invite` en C3a y la administración por HTTP en C3b | La aceptación en C3a: sin ella no puede existir ninguna cuenta (§4.1, paso 5) |
| Dónde van la exportación y la supresión de la cuenta | En C3a, sólo con las tablas de hoy; en C3b | En C3b, con la prueba de esquema que obliga a la FK en cascada en C3a (FR-004): B2 y D1 corren antes que C3b, y la supresión completa necesita sus tablas |
| `password.confirm` en C3a | Con su primer consumidor (C3b o D1); en C3a sin consumidor propio | En C3a: D1 lo necesita para borrar el progreso, el orden entre C3b y D1 está abierto, y sus fallos suman al bloqueo, que es de C3a |
| Montaje de la sesión | Sin Sanctum; con `statefulApi()` | Sin Sanctum (Clarifications, Q1): sin clientes con token no agrega seguridad, y deja una condición en cada `fetch` (mandar `Referer` u `Origin`) |
| Ingreso con o sin Fortify | Fortify sin vistas (D17); piezas del núcleo de Laravel, que D17 descartó («controladores propios para todo») | Piezas del núcleo de Laravel (usuario, clarify del 2026-10-05): la última Fortify (1.40.0) suma 15 paquetes por 2FA y passkeys, que el ADR excluye, y la 1.36.2, la última sin passkeys, suma 5 y queda fuera de las versiones que se siguen publicando |
| Prueba en navegador real | Playwright; una verificación manual documentada; un script con un jar de cookies | Playwright, si el usuario lo adopta. Si no, la manual, declarada como límite en el PR. El script no prueba `SameSite` ni `Sec-Fetch-Site`, que es lo que hay que ver |
| Con qué cuenta se autentican los checks del stack | Una cuenta fija en `.env`; una cuenta que el check crea y retira | Una cuenta propia del check: no deja un secreto fijo ni una cuenta olvidada |
| Con qué privilegios corre el chequeo de transacciones largas | Con root, sin privilegio nuevo; con el usuario `taller` y el mínimo privilegio que aplica `db-grants` | Con el mínimo privilegio que aplica `db-grants` (recomendación del DBA, D35), y falla cerrado. En qué servicio o script corre lo decide el plan |

## Riesgos

1. **El contenido protegido rompe lo que lo usa sin sesión.** `deploy-check.sh` (pide `/api/guide`) y `qa/api-content-check.ts` (pide las 17 porciones) piden contenido sin cookie, y C6 (FR-019 y SC-007) exige que pasen. *Mitigación:* FR-046. C6 ya está integrado, así que esos dos checks pasan hoy sin sesión y fallan en cuanto el contenido la exija: se adaptan en el mismo cambio.
2. **Posiblemente una sola IP hasta C4.** Los límites «por red» pueden tratar a todos los clientes como uno. *Mitigación:* ráfaga holgada, límites por email y red en el ingreso, y afinarlos en C4; antes de C4 no hay clientes externos.
3. **Cada pedido con sesión escribe `sessions`,** también el 304 de contenido: contención en MySQL en los picos de aula. *Mitigación:* el sorteo de limpieza en 0, la poda por lotes fuera de los pedidos y sin límite de Laravel en el contenido; el camino de escala está en §9 (escribir sólo si cambió, y después Redis). Se mide antes de ajustar FPM o el buffer pool.
4. **El bloqueo por cuenta puede dejar afuera al titular** si falla el diseño. *Mitigación:* la cookie de dispositivo, los topes de 15 minutos y de 100 fallos, el restablecimiento por consola, y pruebas con relojes fijados.
5. **El código de autenticación es propio.** Sin Fortify, el ingreso, el bloqueo, la recuperación y la revocación son código de la aplicación, y un error ahí es una vulnerabilidad. *Mitigación:* el ADR fija cada comportamiento; cada pieza entra con su prueba primero (límites con relojes fijados, un caso por regla) y el plan la marca en su «Review Focus». Ninguna regla de composición ni consulta externa.
6. **La prueba en navegador real no tiene dónde correr:** Playwright no está adoptado. *Mitigación:* FR-050 con su verificación manual declarada como límite.
7. **Un volumen existente falla cerrado en el primer despliegue** hasta que se aplica el comando único de `db-grants`. *Mitigación:* el mensaje dice cuál es, y queda documentado; es una acción del operador.
8. **Sin administración hasta C3b,** deshabilitar o promover una cuenta exige `tinker`. *Mitigación:* deliberado y documentado; C3b debería entregarse antes de exponer el taller (C4).
9. **El front tiene que mandar `X-Taller-User` y manejar 401, 409, 419, 423 y 429.** Si no lo hace, cada modificación recibe 409. *Mitigación:* el contrato está en esta spec, y el coordinador se lo pasa a las specs del front (el acceso y A3).
10. **Trabajo en paralelo con B2 y D1:** se planifican a la vez y dependen de C3a (`Auth::id()`, `users.status`, `X-Taller-User` y el cuerpo `{message, code}`). Comparten con C3a `bootstrap/app.php`, `routes/api.php`, `routes/console.php`, `config/`, `composer.json`, `phpstan.neon`, `docker/compose.yaml`, `docker/nginx/nginx.conf`, `lang/es` y `backend/api/AGENTS.md`. *Mitigación:* los integra el coordinador, y el código de C3a pasa el nivel 9 desde el principio.
11. **Cerrar el DNS puede romper algo que hoy resuelve afuera sin que nadie lo note.** *Mitigación:* la prueba de FR-043 corre contra todos los contenedores de redes internas.
12. **El ADR sigue sin aprobar.** Si el usuario lo enmienda, la spec cambia. *Mitigación:* las decisiones que dependen de él están marcadas como propuestas.

## Relación con C2, C6 y C3b

**Lo que C2 le dejó a C3, y dónde queda en C3a:**

| C2 le dejó a C3 | Fuente | Requisito de C3a |
| --- | --- | --- |
| `GET /api/session` con `contentVersion` y catálogos | C2 FR-026 y Q2 | FR-034 |
| El contenido detrás de la sesión, con «sin sesión, 401» | C2 FR-025 y Q1 | FR-031 |
| Sin `Vary: Cookie` y sin tocar `Cache-Control` en el contenido | C2 FR-021 | FR-032 |
| La limpieza programada de la caché de cuerpos vencida | C2, «Sin hacer a propósito» | FR-039 |
| El chequeo de transacciones largas con `db-grants`, y el criterio J | C2 FR-036 y plan, decisión 5 | FR-040 a FR-042 |
| Los errores del framework en español y con `code` | C2 FR-024; ADR, resultados de C2 | FR-037 y FR-038 |
| El reenvío DNS de los contenedores sin salida | Estacionado de C1; C2, Assumptions | FR-043 |
| Un `appBuild` opaco si el front lo necesita | C2 Q3 | No entra (YAGNI); ver FR-034 |

**Con C6** (entregado, PR #17):

- El nivel 9 de PHPStan rige para el código de C3a desde el principio (FR-051): `phpstan.neon` ya lo fija desde C6.
- C6 dejó sin escribir `Catalog::fromRow` (su FR-002: una conversión sin lector espera a su primer uso). `GET /api/session` es ese primer lector, así que C3a suma `Catalog::fromRow` en `app/Content/Record/Catalog.php`, con el patrón de `Language::fromRow`.
- C3a toca `bootstrap/app.php`, `routes/api.php`, `routes/console.php`, `config/` y `backend/api/AGENTS.md`, que integra el coordinador.
- El check de despliegue y el de contenido, de los que dependen FR-019 y SC-007 de C6, tienen que autenticarse (FR-046).

**Con C3b** (lo que C3a deja listo para que C3b sólo sume):

- `invitations` nace completa, con `delivery`, `sent_at` y `send_failed_at`; C3b suma el correo, la administración por HTTP y la renovación de las de admin con `password.confirm`.
- `role`, `status`, `EnsureUserIsActive` y `password.confirm` existen; C3b los usa en `/api/admin`.
- La prueba de esquema de FR-004 existe; C3b suma `account_deletions`, `UserData` y `PurgeUserData`.
- `features.passwordReset` y `features.registration` ya están en `GET /api/session`; C3b los enciende.

## Acciones del usuario

Los agentes no hacen estas acciones. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII).

| Cuándo | Acción |
| --- | --- |
| Antes de implementar | Aprobar o enmendar el ADR 0006, con la enmienda de D17 (sin Fortify) y las propuestas de «Propuestas que no vienen del ADR». Ya figura en la hoja de ruta. |
| Antes de implementar | **Permiso para declarar `symfony/polyfill-intl-normalizer` en `composer.json`** (FR-023: la normalización a NFC). El paquete ya está en `composer.lock`, así que no baja uno nuevo, pero `composer require` consulta Packagist. |
| Antes de implementar | **Origen de la lista de contraseñas bloqueadas** (Q2, opción A) y permiso para descargarla: `100k-most-used-passwords-NCSC.txt` de SecLists (github.com/danielmiessler/SecLists), 835 538 bytes. SecLists es MIT; el origen y la licencia de los datos del NCSC no se pudieron confirmar. |
| Antes de verificar | **La prueba en navegador real (FR-050).** Playwright no está adoptado (`docs/agent-skills.md`: hasta que un ADR lo adopte, las specs nuevas no tienen dónde correr). Adoptarlo exige un ADR y permiso para descargar `@playwright/test` 1.63.0 (npm; con `playwright` y `playwright-core`, unos 18,6 MB desempaquetados según `npm view`) y los navegadores, que se bajan aparte con `npx playwright install` (tamaño no medido). Si el épico del front adopta Playwright antes, C3a lo usa. Si no, se acepta la verificación manual declarada. |
| Antes del despliegue público | **El texto del aviso de privacidad** y su versión inicial (§13.14): quién es el responsable de la base, si hay que inscribirla ante la AAIP y si hay alumnos menores de edad. C3a guarda sólo la versión aceptada. |
| Al desplegar C3a | Con un volumen de MySQL existente, correr una vez el comando de `db-grants` (el chequeo falla cerrado hasta entonces) y `sh backend/api/scripts/init-env.sh`, para que agregue los secretos nuevos, como la clave del HMAC de los registros. |
| De C3b, con plazo largo | **Proveedor, remitente y dominio del correo** (§13.3) y **permiso para `axllent/mailpit`**, sólo en el perfil `dev` de Compose: `axllent/mailpit` v1.31.4 en Docker Hub, índice `sha256:b68349e3a014b90c5610bfb26b2ae36f3892d7b8cf25ee140c6c71c98d2fcf48`, unos 16,8 MB comprimidos para amd64 (metadatos de Docker Hub del 2026-10-05; no se descargó). Un proveedor por SMTP no suma paquetes; Mailgun, Postmark, Brevo, Resend o SES suman uno o dos (Laravel 13, «Driver Prerequisites»). |

**Fortify, descartado.** Ya no hay que pedir permiso para `laravel/fortify`. La medición del 2026-10-05, hecha sin instalar nada, quedó como motivo del descarte (Clarifications): la última versión suma 15 paquetes y la última sin passkeys, 5, y las dos traen 2FA, que el ADR excluye (R3).
