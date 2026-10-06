# Feature Specification: C3c · Correo, recuperación por email y registro abierto

**Feature Branch**: `011-c3c-correo` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-06

**Status**: Clarificada el 2026-10-06 (Q1, Q2, Q3 y Q5 de la spec de C3b, y la partición); falta el plan, que espera el dominio que se elija para C4

**Input**: Ítem **C3c**, nuevo: el correo, que la partición de C3b ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md), Q4, opción B) separó de la administración y del ciclo de vida de la cuenta. Fuente técnica: ADR 0006 (propuesta) §4.1 (la entrega por correo), §4.3, §4.4, §4.8, §5.5 (`mail_jobs`), §7, §8, §12, D21 y D34, y sus preguntas 3, 9 y 20 de §13 ([ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)). Parte de C3a ([spec 004](../004-c3-identidad-acceso/spec.md)) y de C3b, que le deja los ganchos. Lo que dicen los borradores de B2, D1, C4 y del épico del front, que no pasaron por el clarify, entra como supuesto. Donde esta spec se aparta del ADR, lo dice en Assumptions.

## Intención y alcance

**Lo que entendemos.** C3a le dio identidad al taller, y C3b, la administración y el ciclo de vida de la cuenta, pero ninguna de las dos manda un correo: nadie puede avisarle a un alumno, quien olvida su contraseña depende de quien tiene la consola, y lo que la administración de C3b pediría por correo (invitar, recuperar la contraseña de un tercero) responde 503 `mail_unavailable`. C3c cierra eso. El correo sale de un único contenedor aislado, con su cola y sus reintentos, a través de un proveedor externo (Brevo por SMTP). Quien olvida su contraseña la recupera por email, los admins invitan por correo y los ocho mensajes del taller llegan en español. El registro abierto existe, apagado, con su verificación y su restricción por dominios, y el email se cambia por consola. Es para el alumno, para quien administra, para quien opera el taller y para lo que espera a C3c: el front (las pantallas de recuperación, de verificación y de registro de F11, y el «enviar por correo» de F12) y C4 (el contenedor del correo y su usuario de MySQL entran en su matriz de privilegios). No trae pantallas: el entregable es el contrato HTTP, los comandos, el servicio de correo y su comportamiento ante cada fallo. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con un proveedor configurado, cada uno de los ocho correos llega con su texto en español y un link que abre desde afuera. Si el proveedor falla, el taller sigue entero: se reintenta, se ve cuando se agota, y el admin puede reemplazar el correo por un link.
2. Quien olvida su contraseña la recupera por correo, y desde afuera una cuenta que existe y una que no son indistinguibles: la misma respuesta y el mismo trabajo en el pedido.
3. El contenedor del correo es el único de la aplicación con salida a Internet y con las credenciales del proveedor (el Nginx tiene su propia red, sin `APP_KEY` ni base), y su usuario de MySQL no puede leer cuentas ni tocar nada fuera de su cola. Una prueba lo demuestra.
4. Sin proveedor (el modo sólo link de C3a), nada se rompe: el front lo sabe por `GET /api/session` y los links siguen saliendo por consola o por la respuesta del admin.
5. Con el correo disponible, lo que C3b dejó en gancho funciona: la invitación por correo, la recuperación de la contraseña de un tercero y los avisos de rol de admin y de cuenta borrada.
6. Con el registro apagado, que es como se entrega, el taller se comporta como con C3a y C3b.

**Entra:**

- **El correo:** `worker-mail` aislado, con su red y su usuario de MySQL; la cola `mail` (`mail_jobs`); reintentos; ocho tipos de mensaje; el modo sólo link como respaldo; y Mailpit en el perfil `dev`.
- **Recuperación y verificación:** `POST /api/auth/forgot-password`, el aviso por correo al cambiar una contraseña y la verificación de email (`email/verification-notification` y `email/verify`).
- **Registro abierto:** `POST /api/auth/register` detrás de `REGISTRATION_OPEN=false`, con sus límites, su restricción por dominio y la poda de las cuentas nunca verificadas.
- **Cambio de email:** `taller:change-email`.
- **Lo que C3b dejó en gancho** (su FR-056): la invitación por correo con su tope diario, el reenvío por correo o por link, la recuperación de la contraseña de un tercero, el aviso de rol de admin y el aviso de cuenta borrada.
- **Operación:** el usuario de MySQL del correo con `db-grants`, los secretos nuevos y los checks contra el stack.

**Queda fuera, y no es de C3c:** lo que entregan C3a y C3b (la sesión, el ingreso, las invitaciones por link, la administración, exportar y suprimir la cuenta, y el `scheduler` con la cola `default`); 2FA, login social, passkeys, JWT y Sanctum; TLS, el dominio y la IP real del cliente (C4); las pantallas (F11 y F12, del épico del front); y el progreso, las ejecuciones y las estadísticas (D1, B2 y C5).

**Sin hacer a propósito (YAGNI):**

- Plantillas HTML, imágenes y un idioma por usuario: los correos son de texto plano y en español.
- Rebotes, quejas y webhooks del proveedor: `sent_at` dice «entregado al proveedor», no «llegó al buzón».
- Reintentar a mano un correo fallido: el admin reemite la invitación (o la pasa a link) y la persona vuelve a pedir su recuperación.
- Un worker propio para la cola `default`: entra con el disparador de §9 del ADR.
- El cambio de email por autoservicio y que un admin cambie el email o el nombre de otra cuenta (Clarifications, Q2).
- Avisos al operador por correo (el aviso de C4, Q4 opción B): si C4 lo elige, lo suma sobre este canal.

**Actores:** el alumno (rol `student`); quien administra (rol `admin`); quien opera el taller y trabaja por consola; el proveedor de correo (Brevo), un tercero que recibe el mensaje; y los ítems que se apoyan en C3c: el front (F11 y F12) y C4.

## Partición: lo que quedó en C3c

C3b se partió el 2026-10-06 (Q4, opción B, de su clarify) por las tres razones de su spec: una decisión externa fuera del camino crítico (el proveedor, un dominio con DNS que se pueda editar y un `APP_URL` público), lo que C4 necesita para abrir (administrar y suprimir cuentas, que no esperan el correo) y un foco de revisión por spec (acá, el único contenedor de la aplicación con salida a Internet). Los números salen de la spec original de C3b, de 55 requisitos, medida el 2026-10-05; las cuentas son un indicador de tamaño, no una medida de esfuerzo.

| Medida | C3c (esta spec) | C3b ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md)) |
| --- | --- | --- |
| Endpoints nuevos | 4: `forgot-password`, `register`, `email/verification-notification` y `email/verify` | 11: `POST /api/me/export`, `DELETE /api/me` y los nueve de `/api/admin` |
| Tablas que crea | 1: `mail_jobs` | 1: `account_deletions` |
| Servicios nuevos de Compose | 1: `worker-mail`, más Mailpit en el perfil `dev` | ninguno |
| Comandos y trabajos | 1 comando (`taller:change-email`) y 1 tarea programada (la poda de cuentas sin verificar) | 1 comando (`taller:reapply-deletions`), el trabajo `PurgeUserData` y 4 tareas programadas |
| Paquetes de Composer nuevos | ninguno: Brevo por SMTP | ninguno |
| Requisitos funcionales | 33 heredados (FR-001 a FR-030, FR-051, FR-052 y el FR-055 compartido) y uno nuevo (FR-057) | 23 heredados (FR-031 a FR-050, FR-053, FR-054 y el FR-055 compartido) y uno nuevo (FR-056) |
| Historias de usuario | 6 | 5 |
| Lo que esperan | F11 (recuperar, verificar, registrarse), F12 («enviar por correo») y C4 (la matriz de usuarios de MySQL) | C4 (administrar y suprimir cuentas), F11 (exportar y borrar la cuenta) y F12 |

**Los IDs se conservan.** Los requisitos y los criterios de éxito mantienen los IDs de la spec original de C3b, porque B2, D1 y C4 los citan: C3c lleva FR-001 a FR-030, FR-051, FR-052 y el FR-055 compartido, y SC-001 a SC-004, SC-010, SC-011 y el SC-012 compartido. Los demás (FR-031 a FR-050, FR-053, FR-054 y FR-056; SC-005 a SC-009, SC-013 y SC-014) son de C3b. Los IDs no se renumeran ni se reutilizan: los nuevos de esta spec son FR-057 y SC-015. La tabla de equivalencias entre la spec original y las dos nuevas está en la spec de C3b.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una decisión del clarify (Clarifications). Las filas que citan el ADR 0006 valen como base mientras ese ADR siga en estado «propuesta».

| Pedido | Fuente |
| --- | --- |
| El correo es configuración; Mailpit sólo con permiso y en el perfil `dev`; aceptar una invitación verifica el email | ADR 0006 R12 y D21; hoja de ruta, «Acciones del usuario» |
| `worker-mail` aislado: red propia compartida sólo con `mysql` más la de egreso, usuario de MySQL restringido y tabla `mail_jobs` | ADR 0006 §3.1 y D21 |
| Alta por invitación, por email o por link, y registro abierto implementable y apagado | ADR 0006 R2 (decisiones del 2026-10-04) |
| Recuperación por email, sin 2FA, login social ni passkeys | ADR 0006 R3 |
| Brevo por SMTP como proveedor, procesado en la UE y sin paquetes nuevos | Usuario, clarify del 2026-10-06 (Q1) |
| El email se cambia sólo por consola | Usuario, clarify del 2026-10-06 (Q2) |
| El registro abierto, cuando se prenda, se restringe a los dominios de una lista | Usuario, clarify del 2026-10-06 (Q3) |
| El correo se parte de C3b como C3c; hasta que llegue, la administración responde 503 `mail_unavailable` | Usuario, clarify del 2026-10-06 (Q4) |
| Un admin recupera su contraseña sólo por consola | Usuario, clarify del 2026-10-06 (Q5) |
| Sin Fortify ni Sanctum | Usuario, clarify de C3a del 2026-10-05 |
| Las dependencias de la API se agregan sólo con permiso del usuario | Constitución, principio VII; `backend/api/AGENTS.md` |
| TDD, código y pruebas en inglés, Pest contra MySQL 9.7 real | Constitución, principios II y VI |
| Las pantallas de cuenta son de F11 y las de administración, de F12 | Coordinador, 2026-10-05 (ver Assumptions: la rama del front que se pudo leer todavía no lo dice) |

## Clarifications

### Session 2026-10-06

Las respondió el usuario en el clarify de la spec de C3b ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md)), donde se plantearon. Acá van las que cambian lo que C3c construye, con los requisitos que las aplican.

- Q: **Q1**, ¿qué proveedor manda el correo, y a qué costo? → A: Brevo por SMTP (opción A): una empresa de París con servidores en la UE y sin paquetes nuevos de Composer, porque `symfony/mailer` ya está en `composer.lock`. El procesamiento en la UE entra en la lista de países adecuados de la AAIP, y Brevo queda como encargado del tratamiento y se nombra en el aviso de privacidad. Lo que sigue «a confirmar» (el plan gratuito de 300 por día para toda la cuenta y las regiones de sus servidores) se verifica en su fuente antes de contratar. Decidió el usuario. (FR-006)
- Q: **Q2**, ¿cómo se cambia el email de una cuenta? → A: Sólo por consola, con `taller:change-email`, que avisa a las dos direcciones (opción A). Ningún camino HTTP: una sesión robada no debe poder tomar la cuenta (D19). Decidió el usuario. (FR-023, FR-024)
- Q: **Q3**, cuando se abra el registro, ¿se restringe a ciertos dominios de email? → A: Sí (opción B): una lista de dominios en la configuración, y con la lista vacía no se restringe. Sólo rige cuando alguien prenda `REGISTRATION_OPEN`. Decidió el usuario. (FR-019)
- Q: **Q4**, ¿se parte C3b? → A: Sí (opción B): el correo pasa a esta spec (C3c, 011, 33 requisitos) y C3b queda con la administración y el ciclo de vida (23). Mientras no llegue C3c, la administración responde 503 `mail_unavailable` en sus ganchos. Decidió el usuario. (Partición)
- Q: **Q5**, ¿un admin puede recuperar su contraseña por correo? → A: No (opción A): `forgot-password` responde 202 igual, pero a una cuenta admin no le envía nada; su recuperación es por consola. Decidió el usuario. (FR-013)

## Acciones del usuario

Los agentes no hacen estas acciones. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII); los tamaños están en «Descargas previstas».

| Cuándo | Acción |
| --- | --- |
| Antes del plan | **Elegí el dominio con el que sale el correo y comprobá que podés editar su DNS** (registros TXT y CNAME en subnombres). Es el mismo dominio que C4 pide elegir (su acción 2), y un subdominio gratuito de DNS dinámico puede no dejar publicar esos registros (a confirmar con quien lo ofrece). Sin eso el plan de C3c no puede fijar el remitente ni la autenticación del dominio. |
| Antes del plan | **Confirmá con quien responde por la base la vía de transferencia internacional** de Brevo, el proveedor de Q1 (Ley 25.326, art. 12): país adecuado, cláusulas modelo o la que corresponda. |
| Antes de implementar | **Proveedor, remitente y credencial (Q1):** creá la cuenta de Brevo, autenticá el dominio (SPF y DKIM con los valores que da el proveedor; DMARC propio, empezando en monitoreo), elegí la dirección remitente (por ejemplo, una de no responder) y generá una credencial sólo de envío (clave SMTP). Va en `.env`; los agentes no la ven. |
| Antes de implementar | **Permiso para `axllent/mailpit`** (tabla de descargas), sólo para el perfil `dev`. Sin permiso, la prueba de punta a punta de FR-052 es una verificación manual declarada. |
| Antes de activar el correo real | **Un `APP_URL` público.** Hasta C4 vale `http://localhost:8080` y los links de los correos no abrirían fuera del equipo. Configurá el mailer del proveedor (`MAIL_MAILER` y sus credenciales) sólo cuando `APP_URL` sea el real: hasta entonces el taller queda en modo sólo link (FR-008). |
| Antes del despliegue público | **El texto del aviso de privacidad** nombra a Brevo como encargado y, si corresponde, la transferencia internacional. También sigue abierto quién responde por la base y si hay que inscribirla ante la AAIP (§13.14). Y, antes de prender `REGISTRATION_OPEN`, **la lista de dominios permitidos** (Q3). |
| Al desplegar | `sh backend/api/scripts/init-env.sh` (agrega la contraseña del usuario de MySQL del correo) y, con un volumen de MySQL existente, el comando único de `db-grants` (`docker compose --profile ops run --rm db-grants`), que crea ese usuario. Poné el mailer y las credenciales del proveedor en `.env`; `MAIL_REQUIRED` ya vale `true` por omisión. |
| Al verificar | **Un envío real de cada mensaje a tres buzones de distinto tipo** (uno de Google, uno de Microsoft y el de la escuela) y mirá en cuáles cae en spam. Mailpit no prueba la entregabilidad. |
| Siempre | Cada descarga (imágenes, paquetes de Composer) pide permiso con nombre, origen y tamaño antes de bajarse. Con Brevo por SMTP no hay paquetes de Composer que pedir. |

## Descargas previstas

Nada se descargó. El tamaño sale de la API de metadatos de Docker Hub del 2026-10-05: es el tamaño comprimido de amd64, no una medición de `pull`.

| Qué | Origen | Tamaño | Para qué | Licencia |
| --- | --- | --- | --- | --- |
| `axllent/mailpit` v1.31.4 (índice `sha256:b68349e3a014b90c5610bfb26b2ae36f3892d7b8cf25ee140c6c71c98d2fcf48`; amd64 `sha256:c8e498023104710cd71a7bb1856a51f2183ff0dc1ea07675067a38ecda08428f`) | Docker Hub | 16 836 010 bytes (16,1 MiB) | FR-011 y FR-052; sólo el perfil `dev` | MIT |

Sin descarga nueva: `mysql:9.7` (que ya fija `docker/compose.yaml` y usa `db-grants`), la imagen de `php` (que también usa `worker-mail`) y ningún paquete de Composer: por SMTP alcanza `symfony/mailer` v8.1.7, que ya está en `composer.lock`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un admin invita por correo, desde la API (Priority: P1)

Un admin crea invitaciones para uno o varios emails y elige, para cada lote, que lleguen por correo. Puede reenviarlas por correo o pasarlas a link, y ve cuáles no salieron. Con esto el alta por correo deja de depender de que el admin copie y entregue cada link a mano.

**Why this priority**: C3b dejó la invitación por correo en un gancho que responde 503, y la recuperación de un tercero y los avisos en silencio. Sin esto, el correo no llega a la administración.

**Independent Test**: crear un lote por correo, provocar un fallo del proveedor, reenviar una invitación por correo y pasarla a link, y alcanzar el tope diario.

**Acceptance Scenarios**:

1. **Dado** el correo disponible, **cuando** el admin crea una invitación con `delivery=email`, **entonces** la respuesta no trae el link, el correo sale después del COMMIT, y cuando el proveedor lo acepta la invitación queda con `sent_at`.
2. **Dados** un email con cuenta y uno con una invitación vigente, **cuando** se invitan por correo, **entonces** responden `user_exists` e `invitation_pending` y no sale ningún correo.
3. **Dado** un admin que ya mandó 300 correos en el día, **cuando** pide más con `delivery=email`, **entonces** cada email recibe `rate_limited`, y los links no cuentan.
4. **Dado** un proveedor que no responde, **cuando** se agotan los reintentos, **entonces** la invitación queda con `send_failed_at`, la lista la marca, y el admin puede reenviarla o pasarla a link.
5. **Dada** una invitación pendiente, **cuando** el admin la reenvía con `delivery=email`, **entonces** el token y el vencimiento rotan, el link anterior responde 404 `invitation_not_found` y el correo nuevo sale después del COMMIT; **cuando** la reenvía con `delivery=link`, la invitación pasa a link y la respuesta trae el link una sola vez.
6. **Dado** el modo sólo link, **cuando** el admin pide `delivery=email`, **entonces** recibe 503 `mail_unavailable` y no se crea ninguna invitación, como ya respondía C3b.

*Cubre: FR-007, FR-010 y FR-057 (a); SC-001, SC-003 y SC-015.*

---

### User Story 2 - Recuperar la contraseña por correo (Priority: P1)

Un alumno olvidó su contraseña, la pide desde la pantalla de ingreso y recibe un link por correo. Desde afuera nadie aprende qué emails tienen cuenta. Un admin también puede disparar la recuperación de un alumno.

**Why this priority**: es lo que el alumno más pide y lo que hoy depende de quien tiene la consola. Reutiliza el broker de contraseñas y el `reset-password` de C3a.

**Independent Test**: pedir la recuperación para una cuenta que existe y una que no, comparar las respuestas y el trabajo del pedido, recibir el correo, usar el link y mirar el aviso.

**Acceptance Scenarios**:

1. **Dado** el email de un alumno con cuenta activa, **cuando** pide la recuperación, **entonces** recibe 202 con el mensaje uniforme y, en menos de 3 minutos, un correo con un link válido por 60 minutos.
2. **Dados** un email sin cuenta, el de una cuenta `disabled` o `deleting` y el de un admin (Q5), **cuando** piden la recuperación, **entonces** la respuesta es idéntica a la del escenario 1 y no sale ningún correo.
3. **Dado** cualquier email, **cuando** llega el pedido, **entonces** el pedido no consulta la cuenta de ese email: hace el mismo trabajo exista o no.
4. **Dado** el modo sólo link, **cuando** se pide la recuperación de cualquier email, **entonces** responde 503 `mail_unavailable`, sin depender de la cuenta.
5. **Dado** el sexto pedido de un minuto desde la misma red, **cuando** llega, **entonces** recibe 429 con `Retry-After`; el cuarto pedido de una hora para el mismo email responde 202 igual, pero no encola nada.
6. **Dado** un correo de recuperación que no salió dentro de la hora de vida de su token, **cuando** el proveedor vuelve, **entonces** no se envía.
7. **Dado** un admin con la contraseña reconfirmada, **cuando** dispara la recuperación de un alumno, **entonces** recibe 202 sin el link y el alumno recibe el correo; para un admin como destino recibe 422, y en modo sólo link, 503 `mail_unavailable`.

*Cubre: FR-012 a FR-014 y FR-057 (b); SC-001 y SC-002.*

---

### User Story 3 - Los avisos de la cuenta llegan por correo (Priority: P2)

Cuando algo importante le pasa a una cuenta, su titular se entera por correo: cambió su contraseña, le dieron el rol de admin, borraron su cuenta, cambió su email o alguien intentó registrarse con su email.

**Why this priority**: son los avisos que C3a y C3b dejaron sin enviar. No hacen falta para que el taller funcione, pero son la defensa del titular ante un cambio que no hizo.

**Independent Test**: provocar cada hecho (restablecer y cambiar la contraseña, promover, suprimir, cambiar el email por consola y registrar un email existente) y mirar qué recibe cada titular, con el correo disponible y sin él.

**Acceptance Scenarios**:

1. **Dado** el link de recuperación, **cuando** se usa en `reset-password` de C3a, **entonces** la contraseña cambia y la persona recibe un aviso por correo; el mismo aviso sale tras `PUT /api/me/password`.
2. **Dada** una cuenta promovida a admin por la administración de C3b, **cuando** el cambio confirma, **entonces** recibe un aviso por correo.
3. **Dada** la purga de una cuenta terminada (C3b), **cuando** la transacción final confirma, **entonces** el titular recibe el aviso de cuenta borrada, con el email que el trabajo guardó cifrado; si la purga es la de `taller:reapply-deletions`, no lo recibe de nuevo.
4. **Dado** el modo sólo link, **cuando** ocurre cualquiera de los hechos anteriores, **entonces** no se envía nada y nada falla.

*Cubre: FR-010, FR-015 y FR-057 (c) y (d); SC-001 y SC-015.*

---

### User Story 4 - Operar el correo sin sorpresas (Priority: P2)

Quien despliega necesita que el correo sea el único contenedor de la aplicación con salida, que un fallo del proveedor no tire nada, que sin proveedor el taller siga operable, que el usuario de MySQL del correo no pueda más de lo que necesita y que los checks sigan sirviendo.

**Why this priority**: sin esto el correo funciona, pero es la salida más peligrosa del taller (ADR 0006 §12) y se vuelve difícil de operar.

**Independent Test**: provocar cada situación contra el stack levantado y contra una base de pruebas.

**Acceptance Scenarios**:

1. **Dado** el stack levantado, **cuando** se lee la configuración efectiva de Compose, **entonces** sólo `worker-mail` está en la red de egreso y comparte red con `mysql`, y `php`, `scheduler` y `migrate` no resuelven nombres de Internet.
2. **Dado** el usuario de MySQL del correo, **cuando** corren sus pruebas, **entonces** puede lo suyo (leer y escribir `mail_jobs` y `failed_jobs`, actualizar `sent_at` y `send_failed_at`) y no puede leer `users`, `sessions` ni `password_reset_tokens`, escribir otra tabla, hacer DDL ni `GRANT`; y aun así `worker-mail` envía.
3. **Dado** un proveedor caído, **cuando** llega un correo, **entonces** se reintenta con espera creciente, el pedido que lo originó ya respondió, y al agotarse queda un registro de la falla en `failed_jobs`, sin el contenido.
4. **Dado** `MAIL_REQUIRED=true` con el mailer `log` o `array`, **cuando** se pide `GET /api/session`, **entonces** `features.passwordReset` es `false`, ningún correo se encola y ningún token aparece en los registros.
5. **Dadas** las tablas `mail_jobs` y `jobs` (los trabajos de `default` que llevan un email), **cuando** se leen con root, **entonces** ninguna contiene en claro un email, un nombre ni un link.
6. **Dado** el perfil `dev`, **cuando** se levanta, **entonces** los correos se ven en Mailpit, publicado sólo en `127.0.0.1`; sin ese perfil, Mailpit no existe.
7. **Dado** el stack levantado, **cuando** corren `api:smoke`, `api:content:check` y `deploy-check.sh`, **entonces** pasan, también sin proveedor de correo.

*Cubre: FR-001 a FR-006, FR-008, FR-009, FR-011 y FR-025 a FR-030; SC-003, SC-004 y SC-010.*

---

### User Story 5 - Cambiar el email de una cuenta (Priority: P2)

Quien opera cambia por consola el email de una cuenta, y las dos direcciones se enteran.

**Why this priority**: es lo que C3c deja soportado para un caso raro. Con Q2 decidida (sólo por consola), no hay otro camino.

**Independent Test**: correr el comando con cuentas y emails de cada caso y mirar la base, las sesiones y los correos.

**Acceptance Scenarios**:

1. **Dada** una cuenta, **cuando** corre `taller:change-email actual nuevo`, **entonces** el email cambia, sus sesiones se cierran, su token de recuperación se borra y las dos direcciones reciben un aviso.
2. **Dado** un email nuevo que ya tiene cuenta o una invitación, **cuando** corre, **entonces** falla con ese motivo y no cambia nada; con un email inválido o un actual sin cuenta, también falla.
3. **Dado** cualquier pedido HTTP que traiga `email` en `PATCH /api/me` o en `PATCH /api/admin/users/{user}`, **cuando** llega, **entonces** el email no cambia.

*Cubre: FR-023 y FR-024.*

---

### User Story 6 - Registro abierto, apagado, con verificación de email (Priority: P3)

Un interruptor deja que cualquiera con un email permitido cree su cuenta y la verifique por correo. Está apagado, y todo lo de C3a y C3b funciona igual.

**Why this priority**: R2 pide que sea implementable y esté apagado, así que no tiene consumidor hasta que alguien lo prenda.

**Independent Test**: recorrer las rutas con el interruptor apagado y encendido, y el ciclo registrarse, verificar y pedir contenido.

**Acceptance Scenarios**:

1. **Dado** `REGISTRATION_OPEN=false`, **cuando** se piden `POST /api/auth/register` y las dos rutas de verificación, **entonces** responden 404 `not_found` y `features.registration` es `false`.
2. **Dado** el interruptor encendido, **cuando** una persona se registra, **entonces** recibe 201 con la sesión abierta, la cuenta nace `student`, `active` y sin verificar, y el contenido responde 403 `email_unverified`.
3. **Dado** el correo de verificación, **cuando** el front confirma los datos del fragmento `#verificar=` con un POST con sesión, **entonces** responde 204 y el contenido pasa a 200; no existe ningún GET firmado en la API.
4. **Dados** un email que ya tiene cuenta o un dominio fuera de la lista (Q3), **cuando** se registran, **entonces** reciben 422 `validation_failed` con el motivo, y el titular de la cuenta existente recibe un aviso por correo.
5. **Dado** el sexto registro de una hora desde la misma red, o el que pasa el tope global por hora, **cuando** llega, **entonces** recibe 429; el cuarto correo de verificación de una hora para una cuenta no sale.
6. **Dada** una invitación pendiente para un email, **cuando** alguien se registra con ese email, **entonces** la invitación sigue intacta; si llegó por correo, aceptarla reemplaza la cuenta sin verificar, y si llegó por link, recibe 409 `email_taken`.
7. **Dada** una cuenta de registro nunca verificada, **cuando** pasan 7 días, **entonces** se suprime por el camino de la supresión de C3b.
8. **Dado** el interruptor encendido y el modo sólo link, **cuando** una persona intenta registrarse, **entonces** recibe 503 `mail_unavailable`, no se crea ninguna cuenta y `features.registration` es `false`.

*Cubre: FR-016 a FR-022; SC-011. Las pruebas de FR-051 a FR-055 y el criterio SC-012 valen para todas las historias.*

---

### Edge Cases

- **Correo antes de C4:** hasta C4, `APP_URL` es `http://localhost:8080`, y un link armado desde ahí no abre fuera del equipo. El modo sólo link es el valor por omisión (FR-008) hasta que se configure un mailer real, y `worker-mail` advierte al arrancar si `APP_URL` apunta a `localhost`.
- **El proveedor acepta pero no entrega:** `sent_at` dice «entregado al proveedor». Un correo que cae en spam o rebota no se detecta (sin webhooks): la persona puede volver a pedir la recuperación (una por minuto) y el admin puede reemitir la invitación o pasarla a link.
- **Un escáner abre el link:** los clientes de correo y los filtros de seguridad abren los links que reciben. El token viaja en el fragmento y la API no tiene ningún GET con token, así que abrirlo no consume nada.
- **`worker-mail` caído:** los pedidos responden igual y los correos esperan en `mail_jobs`; al volver salen, salvo los que vencieron (FR-007). Es una caída del correo, no del taller.
- **Un correo duplicado:** si el proveedor acepta y la conexión se corta, el reintento puede mandar el mismo mensaje dos veces. Las invitaciones y las recuperaciones llevan el mismo link, así que no cambia nada, pero la persona recibe dos correos. Se acepta.
- **El tope del proveedor es menor que el del taller:** el límite de 300 correos por admin y por día no garantiza que el proveedor acepte tantos. El proveedor rechaza, se reintenta y la invitación queda con `send_failed_at`.
- **El registro se apaga con cuentas sin verificar:** las rutas de verificación pasan a responder 404, así que esas cuentas no pueden verificarse hasta que se suprimen a los 7 días; una invitación por correo las reemplaza.
- **Invitación por link y registro abierto:** alguien puede registrar primero el email de una persona invitada por link, y la aceptación recibe 409 `email_taken` (el ADR lo acepta, §12). El admin la reenvía por correo, que reemplaza la cuenta sin verificar.
- **Mailer `log` en local:** con `MAIL_REQUIRED=false` y el mailer `log` los flujos corren sin proveedor, pero los links no se ven en el registro (el depurador de secretos de C3a los quita, su FR-045). Mailpit es el camino para verlos.
- **Un email que difiere en mayúsculas o acentos:** se canonicaliza y se compara igual que en C3a, en `taller:change-email`, en el registro y en las invitaciones de admin.
- **Un admin sin correo propio:** la recuperación por correo no le alcanza (Q5) y su link sale sólo por consola, así que la cuenta de quien opera sigue dependiendo de la consola.
- **El aviso de una cuenta que ya no existe:** el aviso de cuenta borrada sale de los datos que el trabajo de purga guardó, no de `users`, que ya no tiene la fila.

## Requirements *(mandatory)*

### Functional Requirements

**Correo: el worker aislado y la cola**

- **FR-001**: Todo correo del taller DEBE salir de un único servicio, `worker-mail`, que corre con la imagen de `php`. `php`, `scheduler`, `migrate` y los demás servicios de la aplicación NO DEBEN tener salida a Internet ni abrir una conexión SMTP o de API hacia un proveedor. `taller`, el Nginx, conserva su red `edge` como hoy: no tiene `APP_KEY` ni acceso a la base. *(D21, §4.8)*
- **FR-002**: `worker-mail` DEBE estar en una red interna compartida sólo con `mysql` y en la red de egreso, y NO DEBE compartir red con `php`, con `scheduler` ni con otro worker. Una prueba lee la configuración efectiva de Compose del perfil por omisión y falla si otro servicio entra a esas dos redes o si `worker-mail` entra a otra; en el perfil `dev`, Mailpit (FR-011) es la única excepción: entra a una de ellas para que `worker-mail` lo alcance. *(D21)*
- **FR-003**: Toda notificación DEBE ir a una cola propia, `mail`, en la tabla `mail_jobs` (una migración con un solo `CREATE TABLE`, D35), que sólo lee `worker-mail`. DEBE encolarse después del COMMIT de la transacción que la origina, y NO DEBE enviarse dentro de un pedido ni de una transacción: el pedido responde sin esperar al proveedor. *(D21, §8)*
- **FR-004**: Cada correo encolado DEBE llevar todo lo que necesita para enviarse (destinatario, nombre, link, vencimiento y tipo) como valores simples, cifrados dentro del trabajo, y NO DEBE volver a leer `users` ni otra tabla de cuentas al enviarse. `mail_jobs` NO DEBE guardar en claro un email, un nombre ni un link, y los trabajos de la cola `default` que llevan un email van cifrados igual: `forgot-password` (FR-012) y `PurgeUserData` de C3b, al que FR-057 (d) le suma el email del aviso. *(D21, §4.3)*
- **FR-005**: `worker-mail` DEBE conectarse a MySQL con un usuario propio que sólo pueda leer y escribir `mail_jobs` y `failed_jobs` y actualizar `sent_at` y `send_failed_at` de `invitations`. C3c DEBE crearlo, sin esperar a C4, con su contraseña en `.env` y fuera de Git. Una prueba con ese usuario real contra MySQL 9.7 (como el criterio J de C3a, su FR-042) comprueba lo que puede y lo que no: no lee `users`, `sessions` ni `password_reset_tokens`, no escribe otra tabla ni otra columna de `invitations`, no hace DDL ni `GRANT`, y aun así envía. Sus valores esperados salen de esta lista y no de las sentencias que la aplican. *(D21, §12)*
- **FR-006**: Las credenciales del proveedor (usuario y contraseña SMTP o clave de API) DEBEN existir sólo en el entorno de `worker-mail`, nunca en el ancla común de Compose, y venir de `.env` sin entrar en Git, en la imagen ni en el contexto de Docker. `worker-mail` DEBE tener `APP_KEY` porque descifra sus trabajos (riesgo residual, §12) y usar un store de caché en memoria. El proveedor y el remitente salen de la configuración. El proveedor es Brevo por SMTP (Clarifications, Q1): no suma paquetes de Composer. *(D21, constitución VII)*
- **FR-007**: Un correo que el proveedor rechaza o no responde DEBE reintentarse con espera creciente (propuesta: 1, 5, 15 y 60 minutos) hasta que venza su utilidad: la vida del link, o 24 horas si el correo no lleva uno (propuesta). Después NO DEBE enviarse: un link vencido no se manda. Al agotar los reintentos, el trabajo queda en `failed_jobs` (7 días) y la falla en los registros con su causa, sin el contenido; si era una invitación, `send_failed_at` se completa. Cuando el proveedor acepta el mensaje, `sent_at` se completa. `sent_at` significa «entregado al proveedor», no «llegó al buzón»: el taller no atiende rebotes. *(D21, D30, §4.8)*
- **FR-008**: `MAIL_REQUIRED` DEBE valer `true` por omisión (en `docker/compose.yaml`), de modo que el taller sólo manda correo cuando alguien configura un mailer real a propósito. Con `MAIL_REQUIRED=true` y un mailer `log` o `array` (es decir, sin un mailer real), el taller DEBE estar en modo sólo link: `GET /api/session` informa `features.passwordReset=false`; `POST /api/auth/forgot-password`, `delivery=email` en las invitaciones de admin y la recuperación de un tercero responden 503 `mail_unavailable` (con `Retry-After`, y en español) sin depender de la cuenta y sin crear nada (las dos de la administración ya respondían así desde C3b, su FR-056); y ningún token termina en un registro. Las invitaciones por link y `taller:password-reset-link` siguen como en C3a. Con un mailer real, `true` no cambia nada: el correo sale. El desarrollo local que quiera probar los flujos con el mailer `log` lo apaga con `MAIL_REQUIRED=false`, y entonces `features.passwordReset` vale `true`. `features.passwordReset` también es lo que el admin consulta para ofrecer «enviar por correo» o sólo «copiar link». *(D21, S7, §4.8)*
- **FR-009**: El remitente y su nombre DEBEN salir de la configuración y pertenecer al dominio autenticado con SPF y DKIM (acción del usuario). Los correos DEBEN ser de texto plano, en español, sin imágenes remotas, sin rastreo de aperturas ni de clics (que reescribiría los links y entregaría el token a un tercero más) y sin contraseñas. Todo link DEBE armarse desde `APP_URL` y nunca desde `Host`, con el token en el fragmento (`#invitacion=`, `#restablecer=` o `#verificar=`) y no en la ruta ni en la query. Si `APP_URL` apunta a `localhost`, `worker-mail` DEBE advertirlo al arrancar. *(D18, D21; C3a FR-021)*
- **FR-010**: El taller DEBE mandar estos ocho correos, y ninguno más: la invitación (de un admin, con `delivery=email`; vence a los 7 días, y a las 48 horas si es de admin); la recuperación de la contraseña (al titular; vence a los 60 minutos); el aviso de contraseña cambiada (al titular, tras un `reset-password` o un `PUT /api/me/password`); el aviso de rol de admin asignado (a la cuenta promovida); el aviso de cuenta borrada (al email de la cuenta suprimida, cuando la purga termina); la verificación de email (con el registro abierto, a la cuenta sin verificar; lleva link); el aviso de cambio de email (a las dos direcciones); y el aviso de intento de registro con un email que ya tiene cuenta (con el registro abierto, al titular). Llevan link sólo tres: la invitación, la recuperación y la verificación. Sin correo disponible, los avisos no se envían ni fallan. *(§4.8, D21)*
- **FR-011**: En el perfil `dev` de Compose, y sólo con permiso del usuario para descargarlo, DEBE existir un servidor SMTP de pruebas (`axllent/mailpit`) al que `worker-mail` entrega, con su interfaz web publicada sólo en `127.0.0.1`. Sin ese perfil no existe ni publica nada. *(D21, §4.8; constitución VII)*

**Recuperación y verificación por correo**

- **FR-012**: `POST /api/auth/forgot-password {email}` DEBE validar sólo la forma del email, encolar un trabajo cifrado en la cola `default` y responder siempre 202 con el mismo cuerpo, exista o no la cuenta y sea cual sea su estado: el pedido NO DEBE consultar la cuenta del email pedido, para que ni el tiempo ni el trabajo la revelen. La única excepción es 503 `mail_unavailable` en modo sólo link, que no depende de la cuenta. *(§4.3, §7)*
- **FR-013**: El trabajo DEBE pedir el token al broker de contraseñas de Laravel (60 minutos de vida, uno cada 60 segundos), armar el link con el token y el email en el fragmento y encolar el correo con valores simples. NO DEBE enviar nada si la cuenta no existe, no está `active` o es de un admin (Clarifications, Q5). *(§4.3; C3a FR-025)*
- **FR-014**: `forgot-password` DEBE limitarse a 5 por minuto y 20 por hora por red, con 429 y `Retry-After` al pasarse, y a 3 por hora por email, en silencio: el 202 es el mismo y no se encola nada. *(§4.6)*
- **FR-015**: Después de fijar o cambiar una contraseña (`reset-password` y `PUT /api/me/password` de C3a), el taller DEBE avisar al titular por correo. C3a deja un único punto por el que pasa toda contraseña, y ahí se engancha el aviso. Sin correo disponible, no envía nada y no falla. *(§4.3, D21)*
- **FR-016**: Con el registro abierto, `POST /api/auth/email/verification-notification` (sesión; 202; 3 correos por hora y cuenta) y `POST /api/auth/email/verify` (sesión; 204) DEBEN existir. El link del correo lleva sus datos firmados en el fragmento (`#verificar=`) y el front los confirma con un POST con sesión: NO DEBE existir ningún GET firmado en la API, porque Nginx registra la línea de cada pedido. Un enlace vencido, alterado o de otra cuenta responde 422 `validation_failed`. *(§4.4, §7)*

**Registro abierto**

- **FR-017**: `REGISTRATION_OPEN` (falso por omisión) DEBE gobernar el registro y su verificación. Apagado, `POST /api/auth/register` y las dos rutas de verificación DEBEN existir y responder 404 `not_found` (así siguen funcionando si las rutas se cachean) y `features.registration` vale `false`; encendido, vale `true`, salvo en modo sólo link (propuesta): sin correo no hay cómo verificar, así que el registro responde 503 `mail_unavailable` y `features.registration` vale `false`. Apagado, el taller se comporta como con C3a. *(§4.4, R2)*
- **FR-018**: `POST /api/auth/register {name, email, password, password_confirmation, privacyVersion}` DEBE crear una cuenta `student`, `active`, con el aviso de privacidad aceptado y el email sin verificar, iniciar la sesión (ID nuevo) y responder 201 con `{data: usuario}`. Aplica la canonicalización del email, la política de contraseñas y el nombre de C3a. Con el email sin verificar, el contenido responde 403 `email_unverified`. Un email que ya tiene cuenta recibe 422 `validation_failed` y su titular, un aviso por correo: el ADR acepta que el registro abierto revele qué emails existen y lo mitiga con los límites y con ese aviso (§12). La forma exacta de la respuesta es propuesta. *(§4.4, §7, §12)*
- **FR-019**: `REGISTRATION_ALLOWED_DOMAINS` (vacía: sin restricción) DEBE limitar el registro a esos dominios de email; otro dominio recibe 422 `validation_failed` con el motivo en español (Clarifications, Q3). *(§13.20)*
- **FR-020**: El registro DEBE limitarse a 5 por hora por red (/48 en IPv6) y a un tope global por hora (propuesta: 100). *(§4.4, §4.6)*
- **FR-021**: El registro NO DEBE tocar las invitaciones pendientes: un desconocido no puede anular la de otro. Aceptar una invitación enviada por correo a un email que tiene una cuenta sin verificar DEBE reemplazar esa cuenta (la entrega prueba que el email es de quien acepta); si llegó por link, 409 `email_taken`, como en C3a. *(§4.1 paso 3, §4.4)*
- **FR-022**: Las cuentas creadas por el registro y nunca verificadas DEBEN suprimirse a los 7 días, por lotes y por el camino de supresión de C3b (su FR-044 y su FR-045), con una tarea del `scheduler`. *(§4.4)*

**Cambio de email**

- **FR-023**: `taller:change-email <actual> <nuevo>` DEBE cambiar el email de una cuenta (canonicalizado y comparado como en C3a), cerrar todas sus sesiones y rotar su token de «recordarme» (propuesta: el email es el dato con el que se recupera la cuenta, así que el cambio se trata como un cambio de contraseña), borrar su token de recuperación y avisar por correo a las dos direcciones. DEBE fallar, sin cambiar nada, si el email actual no tiene cuenta, si el nuevo ya tiene una cuenta o una invitación, o si no es un email válido. Conserva la verificación del email: quien opera responde por la dirección nueva. Es el único camino (Clarifications, Q2). *(§7, D19, §13.9)*
- **FR-024**: El email de una cuenta NO DEBE poder cambiarse por HTTP: ni el titular (`PATCH /api/me` lo ignora, C3a) ni un admin (`PATCH /api/admin/users/{user}` no lo acepta, FR-033 de C3b). *(D19, §5.2)*

**Operación del correo**

- **FR-025**: `worker-mail` DEBE correr sin puertos publicados, con el disco de sólo lectura salvo un tmpfs, sin capacidades, con los límites de memoria y de procesos de los demás servicios, con reinicio automático y esperando a `mysql` sano y a `migrate` terminado. `backend/api/scripts/deploy.sh` DEBE levantarlo con el resto. *(D34)*
- **FR-026**: La prueba de C3a que exige que ningún contenedor de una red `internal` resuelva nombres de Internet (su FR-043) DEBE tener a `worker-mail` como única excepción explícita, y DEBE seguir comprobando que `php`, `scheduler` y `migrate` no los resuelven. *(C3a FR-043)*
- **FR-027**: `MAIL_REQUIRED`, `MAIL_MAILER`, `MAIL_FROM_*`, las credenciales del proveedor y `REGISTRATION_OPEN` DEBEN salir de la configuración. `sh backend/api/scripts/init-env.sh` DEBE agregar la contraseña del usuario de MySQL del correo con el patrón `add_missing` de C3a, sin pisar nunca un valor existente. Las credenciales del proveedor las pone quien opera en `.env`: el script no las inventa. *(C3a, contrato de consola)*
- **FR-028**: `db-grants` y el inicio de un volumen nuevo DEBEN crear el usuario de MySQL del correo con los privilegios de FR-005, en el mismo archivo que usa C3a para los privilegios (`docker/mysql/db-grants.sql`), sin que su contraseña entre en Git. Un archivo SQL estático ejecutado tal cual no puede llevar una contraseña de `.env`, así que el mecanismo lo decide el plan junto con C4, que tiene el mismo problema con sus cinco usuarios. El nombre lo fija el plan (D21 usa `taller_mail`; C4 propone `mail`). *(D21, D34; C3a, contrato de consola)*
- **FR-029**: La aplicación DEBE registrar, estructurado y a stderr, el id del trabajo, el tipo de mensaje, el resultado y un HMAC del destinatario (con la clave de los registros de C3a), y NO DEBE registrar el link, el token, el cuerpo ni el email en claro. *(D20; C3a FR-045)*
- **FR-030**: `api:smoke` y `deploy-check.sh` DEBEN seguir pasando con `worker-mail` en el stack y con o sin proveedor. `api:smoke` DEBE sumar que `forgot-password` responde 202 con correo disponible o 503 `mail_unavailable` en modo sólo link, y que `features.passwordReset` lo refleja. *(C3a FR-046)*

**Lo que C3c completa en la administración y el ciclo de vida (los ganchos de C3b)**

- **FR-057**: Con el correo disponible, C3c DEBE completar lo que C3b dejó en gancho (su FR-056), y sin él todo sigue como en C3b: 503 `mail_unavailable` y ningún aviso. Los cuatro ganchos son:
  - **(a) La invitación por correo** (FR-038 y FR-039 de C3b). `POST /api/admin/invitations` con `delivery=email` crea la invitación, encola el correo después del COMMIT y no trae el link; cada admin envía como mucho 300 correos por día (los links no cuentan) y el resto de sus emails recibe `rate_limited`. Cuando el proveedor acepta el mensaje, la invitación queda con `sent_at`, y al agotarse los reintentos, con `send_failed_at` (FR-007). `POST /api/admin/invitations/{invitation}/resend` rota el token y el vencimiento, y con `delivery=email` manda el correo y con `delivery=link` pasa la invitación a link y devuelve el link una sola vez. *(§4.1, §4.6)*
  - **(b) La recuperación de la contraseña de un tercero** (FR-036 de C3b). `POST /api/admin/users/{user}/password-reset` encola el correo de recuperación al titular y responde 202 sin devolver nunca el link. *(§4.3, D19)*
  - **(c) El aviso de rol de admin asignado** (FR-035 de C3b), a la cuenta promovida, después de confirmar el cambio. *(§4.5, D21)*
  - **(d) El aviso de cuenta borrada** (FR-045 de C3b), al email de la cuenta suprimida cuando la purga termina. `PurgeUserData` guarda ese email y el nombre, cifrados dentro del trabajo, porque la fila de `users` ya no existe; la purga que corre `taller:reapply-deletions` no avisa de nuevo. *(D06, D21)*

**Verificación** (pruebas que el cambio DEBE traer antes de la implementación, según la constitución II)

- **FR-051**: Las pruebas DEBEN correr con Pest contra MySQL 9.7 real, con `MAIL_MAILER=array` y los drivers `database` de cola fijados por prueba cuando tratan de reintentos o de la cola `mail`, y cubrir: cada uno de los ocho mensajes (destinatario, vencimiento, texto en español, link desde `APP_URL`, sin contraseñas), el 202 uniforme de `forgot-password` con el mismo número de consultas para una cuenta que existe y una que no, el modo sólo link, los reintentos con relojes fijados (incluido el correo que no se envía vencido su link), el cifrado de `mail_jobs` y de los trabajos de `default` que llevan un email, y la prueba del usuario de MySQL real del correo (FR-005). *(§8; `backend/api/AGENTS.md`)*
- **FR-052**: DEBE existir una prueba de punta a punta contra el stack levantado y un servidor SMTP de pruebas: una invitación por correo creada por la API sale por `worker-mail`, con su usuario restringido, y llega a Mailpit con un link que abre. Si el usuario no autoriza Mailpit, es una verificación manual declarada como límite. *(D21)*
- **FR-055**: *(compartido con C3b)* El código nuevo DEBE pasar el análisis estático en el nivel 9 que fija `phpstan.neon` desde C6, sin baseline ni errores ignorados, y Pint, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`. La documentación que cita el correo (`backend/api/AGENTS.md`, `docs/architecture.md`, el README y los contratos) DEBE actualizarse en el mismo cambio, igual que `docker/compose.yaml`, `init-env.sh` y `db-grants.sql`. *(C6 FR-012; `AGENTS.md`)*

### Key Entities *(include if feature involves data)*

- **Correo:** un mensaje de texto plano, en español, que el taller manda a una persona. Hay ocho tipos (FR-010). No es una notificación en pantalla ni una auditoría.
- **Cola de correo:** `mail_jobs`. Guarda los correos pendientes como trabajos cifrados con todos sus datos. Sólo la lee `worker-mail`.
- **`worker-mail`:** el único servicio que habla con el proveedor. Tiene `APP_KEY`, las credenciales del proveedor y un usuario de MySQL que sólo toca su cola.
- **Proveedor de correo:** Brevo, por SMTP. Ve cada mensaje con su link y es encargado del tratamiento de datos personales.
- **Modo sólo link:** el estado del taller cuando no puede mandar correo. Las invitaciones y las recuperaciones salen como links por consola o en la respuesta del admin, y `features.passwordReset` vale `false`. Es el único estado de C3b.
- **Invitación por correo y por link:** la misma invitación (de un solo uso, ligada a un email y con rol inicial) según su `delivery`. Por correo, el link viaja en el mensaje; por link, el admin lo recibe una sola vez en la respuesta.
- **Cuenta sin verificar:** una cuenta creada por el registro abierto cuyo email todavía no se confirmó. No entra al contenido y se suprime a los 7 días.
- **Dominios permitidos:** la lista de dominios de email que el registro abierto acepta. Vacía, no restringe.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los ocho correos llegan a un servidor SMTP de pruebas con su texto en español, el link armado desde `APP_URL` y el token sólo en el fragmento (8 de 8), con 0 contraseñas en los mensajes y 0 links en los registros.
- **SC-002**: Para `forgot-password`, un email con cuenta y uno sin cuenta dan 0 diferencias de estado y de cuerpo, y el pedido (medido con una sesión de invitado) no consulta la cuenta del email pedido y hace el mismo número de consultas en los dos casos. Con correo disponible, el correo sale hacia el proveedor en 3 minutos o menos.
- **SC-003**: Con el proveedor caído, el 100 % de los correos se reintenta con espera creciente, ninguno se envía vencido su link y los que agotan los reintentos dejan su registro en `failed_jobs` (y `send_failed_at`, si eran invitaciones). 0 pedidos HTTP esperaron al proveedor.
- **SC-004**: En el stack, un solo servicio (`worker-mail`) está en la red de egreso, y `php`, `scheduler` y `migrate` resuelven 0 nombres de Internet. El usuario de MySQL del correo pasa el 100 % de sus pruebas positivas y negativas, y `worker-mail` envía sin poder leer `users`.
- **SC-010**: En modo sólo link, 0 correos se encolan, `features.passwordReset` es `false`, 3 de 3 caminos que piden correo (`forgot-password`, la invitación `delivery=email` y la recuperación de un tercero) responden 503 `mail_unavailable`, y los links por consola y por respuesta del admin siguen funcionando.
- **SC-011**: Con el registro apagado, 3 de 3 rutas responden 404; encendido, el recorrido registrarse, verificar y pedir contenido pasa de 403 a 200.
- **SC-012** *(compartido con C3b)*: Pasan `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` (nivel 9, 0 errores), `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.
- **SC-015**: Con el correo disponible, los cuatro ganchos de C3b (la invitación por correo, la recuperación de un tercero, el aviso de rol de admin y el aviso de cuenta borrada) dejan de responder 503 o de callar: 4 de 4 salen por `worker-mail` a un servidor SMTP de pruebas, y sin correo disponible los cuatro vuelven a ser 503 o silencio, con 0 correos encolados.

## Assumptions

- **Fuente.** La fuente técnica es el ADR 0006, en estado «propuesta» y a la espera de su aprobación (acción del usuario de la hoja de ruta). Si lo enmienda, esta spec se ajusta. Las preguntas 3, 9 y 20 de §13 se cerraron en el clarify del 2026-10-06 (Q1 a Q3).
- **Punto de partida.** C3c se implementa sobre C3a ([spec 004](../004-c3-identidad-acceso/spec.md), entregada en el PR #24) y sobre C3b ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md)), que le deja los ganchos de su FR-056. Esta spec supone el plan de C3b, que no está implementado: lo que toma de ahí va como supuesto y se ajusta si cambia.
- **Orden respecto de B2 y D1.** No depende de ellos: B2 y D1 no mandan correo.
- **Un solo servidor,** con la carga de referencia del ADR (S2: hasta unas 5.000 cuentas y unas 1.000 activas en el pico) y el supuesto de trabajo de un aula de 40.
- **Sin pantallas.** C3c entrega el contrato HTTP. Las pantallas de recuperación, de verificación y de registro, y el «enviar por correo» de la administración, son del épico del front. El coordinador indicó que F11 trae todas las de cuenta y F12 las de administración. La rama `spec/front-react` que se pudo leer (commit `cca5fdf`, `specs/front-react/roadmap.md`) todavía define F11 sólo como login e invitación y no tiene F12: se toma lo del coordinador como supuesto.
- **Modo sólo link por omisión.** `MAIL_REQUIRED` vale `true` por omisión y el mailer por omisión es `log` (FR-008), así que mientras nadie configure un proveedor a propósito, el taller sigue en el modo sólo link de C3a y C3b. `features.passwordReset` vale `true` cuando el correo puede salir (el mailer no es `log` ni `array`, o `MAIL_REQUIRED` es falso) y `features.registration` sigue a `REGISTRATION_OPEN`. Ambos salen de `config('taller.features')`, que C3a deja listo.
- **`features.passwordReset` también es la bandera de «hay correo».** Es lo que dice el ADR (§4.8: el admin sólo ve «copiar link» cuando vale `false`). No se agrega una bandera nueva.
- **Un solo proceso de `worker-mail`.** Alcanza para el volumen esperado (cientos de correos por día); el camino de escala está en el ADR (§9).
- **El proveedor es Brevo por SMTP (Clarifications, Q1).** Los requisitos sólo dependen de él en FR-006. Lo que se midió el 2026-10-05 y sigue «a confirmar» en la fuente antes de contratar: un plan gratuito de 300 correos por día para toda la cuenta, servidores en la UE (Francia, Alemania y Bélgica) y que publicar DKIM y SPF exige un dominio con DNS editable. Con varios admins, el proveedor frena antes que el tope de 300 por admin.
- **Datos personales y transferencia (Ley 25.326, art. 12).** El correo lleva el email y el nombre de cada persona. La página de transferencias internacionales de la AAIP (consultada el 2026-10-05) lista como adecuados a la Unión Europea y el EEE, el Reino Unido, Suiza, Guernsey, Jersey, la Isla de Man, las Islas Feroe, Canadá (sector privado), Andorra, Nueva Zelanda, Uruguay e Israel (datos automatizados); no figuran Estados Unidos ni Brasil. Con el procesamiento en la UE no harían falta cláusulas (a confirmar), pero Brevo queda como encargado y el aviso de privacidad lo nombra (§13.14). Esto no es asesoramiento legal: lo confirma quien responde por la base.
- **Lo que ve el proveedor.** Cada mensaje lleva su link con el token, así que el proveedor y su registro ven todos los links. Por eso los tokens son de un solo uso y vencen en 60 minutos (recuperación), 48 horas (invitación de admin) o 7 días (invitación de alumno).
- **Las skills no mandan sobre el ADR.** Las skills de Laravel proponen paquetes, notificaciones que releen el modelo y coberturas que el proyecto no adopta. Donde difieren, mandan el ADR y las decisiones del usuario.
- **Propuestas que no vienen del ADR:**
  - Los reintentos del correo a 1, 5, 15 y 60 minutos, con tope en la vida del link o en 24 horas (FR-007).
  - Que un correo no se envíe vencido su link (FR-007).
  - El tope global de registros por hora en 100 (FR-020).
  - Que cambiar el email cierre las sesiones y rote el token de «recordarme», y que conserve la verificación (FR-023).
  - El correo de aviso a quien alguien intentó registrar con su email (FR-010 y FR-018) y la forma de la respuesta del registro con un email existente.
  - Que las rutas de verificación de email sigan al interruptor del registro y respondan 404 apagado, y que el registro responda 503 `mail_unavailable` en modo sólo link (FR-017).
  - Que `sent_at` y `send_failed_at` de las invitaciones, que C3a ya crea, las complete esta spec y no C3b (FR-057).
- **Dependencias.** C3a y C3b entregadas antes. Para el correo real, la decisión del dominio de C4 (su acción 2): sin ella, esta spec no tiene plan. C3c habilita a C4 (su matriz de usuarios de MySQL) y al front (F11 y F12). Esta spec no toca la hoja de ruta ni las specs de C3a y de C3b.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las cinco preguntas del clarify están en Clarifications; acá quedan las alternativas que se descartaron al decidirlas.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Quién manda el correo (Q1) | Brevo por SMTP; Resend (región de Irlanda, SMTP o API); Amazon SES por SMTP en una región de la UE; el buzón que ya tenés (Google Workspace o un Gmail); un relay propio con entrega directa; ningún correo real | **Brevo por SMTP.** Junta SMTP sin paquetes nuevos, un plan gratuito que cubre el volumen esperado (300 por día; a confirmar) y el procesamiento dentro de la lista de la AAIP. Resend gratis da 100 por día y 3 000 por mes (su página de precios): un lote de 100 invitaciones lo agota. SES cuesta USD 0,10 por 1 000 correos, pero pide una cuenta de AWS con tarjeta y salir del sandbox (a confirmar). El buzón propio evita el DNS, pero deja los links en un buzón personal y pasa los datos por Google, que no deja elegir la región. Un relay propio suma una imagen (`boky/postfix`, 63,4 MiB) y desde una IP de hogar la entrega directa suele fallar. Ningún correo real es el modo sólo link de C3a, que ya funciona |
| SMTP o API del proveedor | SMTP; el driver de API del proveedor | SMTP: no suma paquetes ni un SDK al worker. Un driver de API sumaría entre 1 y 4 paquetes de Composer, que piden permiso |
| Quién habla con el proveedor | `worker-mail` aislado; `php` con salida a Internet; un relay propio delante del worker | `worker-mail` aislado (D21). Que `php` salga a Internet reabre lo que C1 cerró |
| Cómo se cambia el email (Q2) | Sólo por consola; autoservicio con confirmación en el email nuevo | Sólo por consola. El autoservicio suma dos endpoints, dos correos más y un token con vencimiento, y abre una vía de toma de cuenta: con la sesión y la contraseña robadas se cambia el email y se recupera por correo |
| Registro abierto (Q3) | Sin restricción; una lista de dominios en la configuración | La lista: el ejemplo del ADR (el dominio de una escuela) es el uso real. Cuesta una decisión de quien prenda el registro: con la lista vacía se abre a cualquiera |
| Recuperación de un admin (Q5) | Sólo por consola; por correo como un alumno | Sólo por consola: el buzón del admin no pasa a ser una llave de todo el taller, sin segundo factor (R3, ADR 0006 §4.10) |
| Dónde se arma la recuperación | En el pedido; en un trabajo de la cola `default` | En un trabajo (§4.3): el pedido no consulta la cuenta, así que el tiempo no la revela. Cuesta hasta un minuto más hasta que el `scheduler` lo procesa |
| Formato del correo | HTML con plantilla; texto plano | Texto plano: un link por mensaje, sin imágenes ni rastreo, y nada que mantener |
| La cola de correo | La tabla `jobs` general con el mismo usuario; `mail_jobs` con un usuario propio | `mail_jobs` y su usuario: sólo así el usuario de MySQL del worker se limita a la cola de correo (D21) |
| Qué lleva un trabajo de correo | Un modelo `User` que se relee al enviar; valores simples cifrados | Valores simples: el worker no puede leer `users` (FR-004). Cuesta que el trabajo lleve su propio texto |
| Respuesta del registro con un email existente | Uniforme, sin sesión; 201 con sesión y 422 si el email existe | 201 con sesión y 422 (§7): el ADR acepta que el registro abierto revele qué emails existen y lo mitiga con límites y con un aviso al titular (§12) |

## Riesgos

1. **El correo es la salida más peligrosa del taller.** `worker-mail` es el único contenedor de la aplicación con Internet y tiene `APP_KEY` y las credenciales del proveedor. Con `APP_KEY` podría falsificar links firmados y cookies de dispositivo, no leer otras tablas (ADR §12). *Mitigación:* red propia con `mysql`, usuario de MySQL mínimo con su prueba (FR-005), trabajos con valores simples, credenciales fuera del ancla común y la prueba de configuración de FR-002.
2. **Un tercero ve cada link.** Brevo procesa el mensaje con su token. *Mitigación:* un solo uso, vencimientos cortos, sin rastreo de clics, y un proveedor de confianza (Q1).
3. **Entregabilidad y dominio.** Sin SPF y DKIM el correo cae en spam o se rechaza, y un subdominio gratuito de DNS dinámico puede no dejar publicarlos. *Mitigación:* la acción del usuario sobre el dominio, un envío de prueba a tres buzones y el modo sólo link como respaldo.
4. **Fallas silenciosas.** `sent_at` no prueba la llegada y no hay rebotes. *Mitigación:* `sent_at` y `send_failed_at` visibles en la lista de invitaciones, la reemisión por link y la recuperación que se puede volver a pedir. Los webhooks quedan fuera.
5. **`APP_URL` hasta C4.** Un correo real con `http://localhost:8080` no sirve. *Mitigación:* el modo sólo link por omisión, la advertencia de `worker-mail` y la acción del usuario.
6. **El dominio de C4 frena el plan.** Sin el dominio no se fija el remitente ni la autenticación SPF y DKIM. *Mitigación:* esta spec queda sin plan hasta que el usuario lo elija; C3b y C4 no esperan a C3c.
7. **La cola `default` es compartida.** Los correos de recuperación y la purga de cuentas de C3b comparten cola: una purga larga retrasa un correo hasta que el `scheduler` vuelve a correr (no se solapa). *Mitigación:* lotes chicos en la purga y el disparador de §9 para un worker propio.
8. **Trabajo en paralelo con C3b y C4.** Con C3b comparte `routes/api/`, `bootstrap/app.php`, `lang/es` y `backend/api/AGENTS.md`; con C4, `docker/compose.yaml`, `docker/mysql/db-grants.sql` e `init-env.sh`. *Mitigación:* los integra el coordinador, y cada ítem suma su archivo de rutas.
9. **Datos personales y transferencia (Ley 25.326).** El proveedor procesa emails y nombres. *Mitigación:* Q1, el aviso de privacidad que nombra al proveedor y la confirmación de quien responde por la base.
10. **Registro abierto: abuso y enumeración.** *Mitigación:* apagado por omisión, topes por red y globales, restricción por dominio (Q3), `verified` en el contenido y el aviso al titular.
11. **Las dependencias son borradores.** El ADR 0006, el plan de C3b, C4 y el épico del front no pasaron por el clarify. *Mitigación:* lo que se toma de ellos está marcado como supuesto.

## Relación con C3a, C3b, C4 y el front

Lo que sigue sale de los borradores de las ramas hermanas y de la spec de C3b. Se lee como supuesto y se ajusta si cambian. Se citan por ruta y por rama, sin enlace, lo que todavía no está en esta rama.

**Lo que C3c toma de C3a** (verificado en el código de `feat/c3a-identidad`, PR #24):

- `invitations` nace completa, con `delivery`, `sent_at` y `send_failed_at`.
- `AccountSessions::endAll` y `PasswordProof`; el alias `password.confirm` con `RequirePassword::isConfirmed` y `markConfirmed`.
- `config('taller.features')`, que alimenta `GET /api/session`.
- `PasswordResetLinks` y el broker de contraseñas.
- `ApiCode` y `ApiError::of`, los limitadores con nombre y un archivo de rutas propio en `routes/api/`.
- El `scheduler`, `docker/mysql/db-grants.sql` como único archivo de usuarios y privilegios de MySQL, y `init-env.sh` con el patrón `add_missing`, cuya estructura es de C3a.

**Lo que C3c cambia en lo de C3a** (lo integra el coordinador):

1. `Invitations::accept` reemplaza una cuenta sin verificar cuando la invitación llegó por correo (FR-021).
2. El punto único de contraseñas dispara el aviso de FR-015.
3. `features.passwordReset` y `features.registration` dejan de ser `false` (FR-008 y FR-017).
4. La lista blanca de la prueba de recorrido de C3a (su FR-048) suma `forgot-password` y `register`; las dos rutas de verificación van con sesión, pero sin `verified`.
5. La prueba de DNS de C3a (su FR-043) exceptúa a `worker-mail` (FR-026).
6. `deploy.sh` suma `worker-mail`.

**Lo que C3c toma de C3b** ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md)):

- Sus ganchos (FR-056): las tres rutas que responden 503 `mail_unavailable` y los dos avisos que no se envían. C3c los completa (FR-057).
- El camino de supresión: FR-022 suprime las cuentas de registro nunca verificadas con el pedido de supresión de C3b (sus FR-044 y FR-045).
- El `scheduler` que procesa la cola `default`, por donde pasa `forgot-password`, y `ApiCode::MailUnavailable`, que C3b agrega.

**Con C4** (`specs/008-c4-exposicion/`, rama `spec/c4-exposicion`):

- C4 espera el contenedor del correo y su usuario de MySQL para su matriz de usuarios; su borrador los atribuye a C3b y habrá que corregirlo a C3c. C3c crea ese usuario en `db-grants.sql` y C4 lo adopta (el nombre: D21 dice `taller_mail`, C4 propone `mail`).
- El archivo `db-grants.sql` es estático y se ejecuta tal cual: no puede llevar una contraseña tomada de `.env`. C3c y C4 necesitan el mismo mecanismo (FR-028).
- El aviso al operador por correo que C4 considera en su Q4 (opción B) usaría el canal de C3c, sin que C3c lo pida (YAGNI).
- La prueba de puertos de C4 (su FR-001) tiene que correr sin el perfil `dev`: Mailpit publica una interfaz en `127.0.0.1`.
- El dominio y el DNS son de C4 (su acción 2) y condicionan el plan de esta spec.
- El «único dueño» de `init-env.sh` es C3a, y C3c sólo suma líneas `add_missing`.

**Con el front** (`specs/front-react/roadmap.md`, rama `spec/front-react`, commit `cca5fdf`):

- F11 y F12 tienen que manejar `Retry-After`, el modo sólo link (ocultar «enviar por correo» y la recuperación según `features.passwordReset`) y el borrado del fragmento con `history.replaceState` para `#invitacion=`, `#restablecer=` y `#verificar=`.
- La recuperación de la contraseña, la verificación y el registro son de F11 y dependen de C3c; el «enviar por correo» de las invitaciones y de la recuperación de un tercero es de F12.
- La rama del front que se pudo leer no tiene F12 y define F11 sólo como login e invitación: el coordinador tiene que alinearla.

## Fuentes consultadas el 2026-10-05

- ADR 0006, ADR 0004 y la hoja de ruta de este repositorio; la constitución y `AGENTS.md`.
- La spec de C3a (esta rama) y la de C3b; los borradores de C4 y la hoja de ruta del épico del front, por ruta y rama.
- Laravel 13, [«Mail»](https://laravel.com/docs/13.x/mail), «Driver / Transport Prerequisites».
- Metadatos de imágenes: la API de Docker Hub (`axllent/mailpit` y `boky/postfix`). Licencias de la API de GitHub.
- Ley 25.326 y la AAIP: [transferencias internacionales](https://www.argentina.gob.ar/transferencias-internacionales) y un resumen de la [Resolución AAIP 198/2023](https://abogados.com.ar/nueva-regulacion-sobre-transferencias-internacionales-de-datos-personales/33745).
- Proveedores: [precios de Resend](https://resend.com/pricing) y [sus regiones](https://resend.com/docs/dashboard/domains/regions), [precios de Amazon SES](https://aws.amazon.com/ses/pricing/), [límites de envío de Google Workspace](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace). De terceros, a confirmar: lo de Brevo (plan gratuito y alojamiento en la UE), Mailgun, Postmark y el límite de un Gmail personal.
