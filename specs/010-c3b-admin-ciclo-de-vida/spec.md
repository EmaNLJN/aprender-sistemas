# Feature Specification: C3b · Administración y ciclo de vida de la cuenta

**Feature Branch**: `010-c3b-admin-ciclo-de-vida` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Clarificada el 2026-10-06 (Q1 a Q5; la partición deja el correo en C3c); planificada el 2026-10-06 (plan, tareas y análisis); falta implementarla

**Input**: Ítem **C3b** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Correo, invitaciones y administración», tras la partición del clarify del 2026-10-06: C3b queda con la administración y el ciclo de vida de la cuenta, y el correo pasa a C3c ([spec 011](../011-c3c-correo/spec.md)). Es lo que C3 deja para después de C3a ([spec 004](../004-c3-identidad-acceso/spec.md)). Fuente técnica: ADR 0006 (propuesta) §4.1 (crear, consultar, reenviar y revocar), §4.5, §4.10, §5.2 (`account_deletions`), §7, §8, D06, D08, D18 a D20, D30, D33, D34 y D37 ([ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)). Parte de lo que C3a dejó listo, verificado en el código de `feat/c3a-identidad` (PR #24; ver «Relación con C3a, B2, D1, C3c, C4 y el front»). Lo que dicen los borradores de D1, C4 y del épico del front, que no pasaron por el clarify, entra como supuesto. Donde esta spec se aparta del ADR, lo dice en Assumptions.

## Intención y alcance

**Lo que entendemos.** C3a le dio identidad al taller: cuentas, sesión, ingreso, alta con un link que imprime la consola y recuperación por consola. Alcanza para que A3, B2 y D1 avancen, pero no para operar el taller con gente real: deshabilitar o promover una cuenta exige `tinker`, las invitaciones sólo salen por consola, y una persona no puede llevarse sus datos ni pedir que se borren. C3b cierra eso. Un admin crea, renueva y revoca invitaciones por HTTP y gestiona usuarios sin poder dejar al taller sin admin. Una persona exporta sus datos y borra su cuenta, y esa supresión se lleva también los intentos, las ejecuciones y las importaciones, que el «Borrar todo» de D1 deja. El taller todavía no tiene correo: es de C3c, que el clarify separó. Hasta entonces la administración sale con ganchos que responden 503 `mail_unavailable`, y los links siguen saliendo por consola o por la respuesta del admin. Es para quien administra, para el alumno que pide sus datos o su baja, para quien opera el taller y para lo que espera a C3b: C4 (no se expone el taller sin poder administrar y suprimir cuentas), el front (las pantallas de exportar y borrar la cuenta de F11 y las de administración de F12) y B2 y D1, cuyas tablas entran en la exportación y la supresión. No trae pantallas: el entregable es el contrato HTTP, los comandos y su comportamiento ante cada fallo. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Un admin crea, renueva y revoca invitaciones, y deshabilita, promueve o suprime cuentas, por HTTP y con la contraseña reconfirmada. En ningún camino queda el taller sin un admin activo, tampoco con dos pedidos a la vez.
2. Una persona descarga sus datos y borra su cuenta. Después ninguna tabla guarda una fila suya, y una restauración del respaldo no la resucita.
3. La cola `default` se procesa sola: una supresión termina sin que nadie corra un comando, y las podas corren sin solaparse.
4. Sin correo, que es como se entrega hasta C3c, nada se rompe: lo que pediría un correo responde 503 `mail_unavailable`, `features.passwordReset` sigue en `false` y los links siguen saliendo por consola o por la respuesta del admin.
5. Con el registro apagado, que es como se entrega (C3c), el taller se comporta como con C3a, y los checks contra el stack siguen pasando.

**Entra:**

- **Administración:** `/api/admin` con sus nueve endpoints de usuarios e invitaciones, la guardia del último admin, `password.confirm` en cada acción sensible y las matrices de acceso y de «sin textos del alumno».
- **Ciclo de vida de la cuenta:** `POST /api/me/export`, `DELETE /api/me`, `UserData`, `PurgeUserData`, `account_deletions` y `taller:reapply-deletions`, sobre las tablas de C3a, B2 y D1.
- **El evento de cuenta restringida:** C3b lo dispara después de confirmar un cambio, y B2 ya entregó el que lo consume.
- **Los ganchos sin correo:** hasta C3c, las tres rutas de la administración que pedirían un correo responden 503 `mail_unavailable` y ningún aviso se envía.
- **Operación:** que el `scheduler` procese la cola `default` y agende las podas y el barrido de las supresiones trabadas.

**Queda fuera, y no es de C3b:** el correo (C3c: `worker-mail`, `mail_jobs`, los ocho mensajes, `forgot-password`, la verificación de email, el registro abierto y `taller:change-email`); lo que entrega C3a (sesión, ingreso, alta por invitación con link de consola, recuperación por consola, contenido tras la sesión y `GET /api/session`); 2FA, login social, passkeys, JWT y Sanctum; TLS, el dominio y la IP real del cliente (C4); las pantallas (F11 y F12, del épico del front); y el progreso, las ejecuciones y las estadísticas (D1, B2 y C5).

**Sin hacer a propósito (YAGNI):**

- Una tabla de auditoría: las acciones de admin van en los registros (R5).
- El borrado automático de cuentas inactivas (§13.13) y un plazo de gracia para la supresión.
- Exportaciones de admin y exportar en formato v1 (D33 y D1).
- Un worker propio para la cola `default`: entra con el disparador de §9 del ADR.
- Que un admin cambie el email o el nombre de otra cuenta.
- Un correo provisional dentro de C3b: reabriría la decisión del proveedor y del dominio, que la partición separó.

**Actores:** quien administra (rol `admin`); el alumno (rol `student`) que pide sus datos o su baja; quien opera el taller y trabaja por consola; y los ítems que se apoyan en C3b: C4, el front (F11 y F12), B2, D1 y C3c.

## Partición: lo que quedó en C3b y lo que pasó a C3c

C3b se partió el 2026-10-06 (Q4, opción B, de su clarify). Los números salen de la spec original de C3b, de 55 requisitos, y de la de C3a, medidos el 2026-10-05; las cuentas de requisitos y de endpoints son un indicador de tamaño, no una medida de esfuerzo.

| Medida | C3b (esta spec) | C3c ([spec 011](../011-c3c-correo/spec.md)) |
| --- | --- | --- |
| Endpoints nuevos | 11: `POST /api/me/export`, `DELETE /api/me` y los nueve de `/api/admin` | 4: `forgot-password`, `register`, `email/verification-notification` y `email/verify` |
| Tablas que crea | 1: `account_deletions` | 1: `mail_jobs` |
| Servicios nuevos de Compose | ninguno | 1: `worker-mail`, más Mailpit en el perfil `dev` |
| Comandos y trabajos | 1 comando (`taller:reapply-deletions`), el trabajo `PurgeUserData` y 4 tareas programadas | 1 comando (`taller:change-email`) y 1 tarea programada (la poda de cuentas sin verificar) |
| Paquetes de Composer nuevos | ninguno | ninguno: Brevo por SMTP |
| Requisitos funcionales | 23 heredados (FR-031 a FR-050, FR-053, FR-054 y el FR-055 compartido) y uno nuevo (FR-056) | 33 heredados (FR-001 a FR-030, FR-051, FR-052 y el FR-055 compartido) y uno nuevo (FR-057) |
| Historias de usuario | 5 | 6 |
| Lo que esperan | C4 (administrar y suprimir cuentas), F11 (exportar y borrar la cuenta) y F12 | F11 (recuperar, verificar, registrarse), F12 («enviar por correo») y C4 (la matriz de usuarios de MySQL) |

**Por qué se partió así.**

1. **Una decisión externa fuera del camino crítico.** El correo real espera al proveedor, un dominio con DNS que se pueda editar y un `APP_URL` público. Son acciones del usuario, y la del dominio es la de C4. La administración y el ciclo de vida no esperan nada de afuera y se prueban enteros con Pest y Compose.
2. **Lo que C4 necesita para abrir.** La hoja de ruta dice que no se expone el taller sin poder administrar y suprimir cuentas: eso es la mitad sin correo. Con el taller sin correo se puede operar.
3. **Un foco de revisión por spec.** Esta spec concentra la autoridad del admin y los datos del alumno (la guardia del último admin, la supresión y su cobertura); C3c, el único contenedor de la aplicación con salida a Internet.

**Lo que cuesta partir:**

- Un ID nuevo en la hoja de ruta, `C3c` (los IDs no se reutilizan), y otro ciclo de Spec Kit, cuyo plan espera el dominio de C4.
- C4 depende de las dos mitades: `account_deletions` y `taller:reapply-deletions` salen de C3b, y `worker-mail` y el usuario de MySQL del correo, de C3c. El corte no acorta el camino a C4: deja que lo que no espera una decisión externa llegue antes.
- La administración sale con ganchos: tres rutas responden 503 `mail_unavailable` y dos avisos no se envían hasta que llegue C3c, que los enciende como C3b enciende los `features` de C3a (FR-056).
- Archivos compartidos con C3c: `routes/api/`, `bootstrap/app.php`, `lang/es`, `ApiCode` y `backend/api/AGENTS.md`, que integra el coordinador. C3b ya no toca `docker/compose.yaml`, `docker/mysql/db-grants.sql` ni `init-env.sh`.

**Los IDs se conservan.** Los requisitos y los criterios mantienen los IDs de la spec original, porque B2, D1 y C4 los citan: por eso esta spec empieza en FR-031 y no se renumera. Los IDs no se reutilizan; los nuevos de esta spec son FR-056, SC-013 y SC-014.

| Spec original (55 requisitos) | Ahora |
| --- | --- |
| FR-001 a FR-030: el correo, la recuperación, el registro, el cambio de email y la operación del correo | C3c, con los mismos IDs (FR-004, FR-005, FR-008, FR-022, FR-024 y FR-055 con otra redacción) |
| FR-031 a FR-041: la administración | C3b. FR-035, FR-036, FR-038 y FR-039 pierden su parte de correo, que va a C3c (FR-057) |
| FR-042 a FR-049: el ciclo de vida | C3b. FR-045 pierde el aviso de cuenta borrada, que va a C3c (FR-057 (d)) |
| FR-050: el `scheduler` | C3b |
| FR-051 y FR-052: pruebas del correo | C3c |
| FR-053 y FR-054: pruebas de la administración y del ciclo de vida | C3b |
| FR-055: calidad y documentación | Compartido: cada spec cita la documentación de lo suyo |
| Historia 1 (invitar por correo o por link) | C3b, historia 1 (link); C3c, historia 1 (correo) |
| Historias 2, 6 y 8 (recuperar por correo, cambiar el email y registrarse) | C3c, historias 2, 5 y 6 |
| Historias 3, 4 y 5 (administrar, llevarse los datos y restaurar) | C3b, historias 2, 3 y 4 |
| Historia 7 (operar el correo) | C3c, historia 4; el escenario del `scheduler`, C3b, historia 5 |
| SC-001 a SC-004, SC-010 y SC-011 | C3c |
| SC-005 a SC-009 | C3b |
| SC-012 | Compartido |

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una decisión del clarify (Clarifications). Las filas que citan el ADR 0006 valen como base mientras ese ADR siga en estado «propuesta».

| Pedido | Fuente |
| --- | --- |
| Roles admin y estudiante, `password.confirm` en cada acción sensible y una guardia que impide quedarse sin admins | ADR 0006 R4, D19 y §4.5 |
| Alta por invitación, por email o por link | ADR 0006 R2 (decisiones del 2026-10-04) |
| Sin auditoría de logins; las acciones de admin van en los registros | ADR 0006 R5 y D20; usuario, 2026-10-04 |
| Supresión física de la cuenta, exportación del titular y libro de supresiones | ADR 0006 D06, D33 y D37 (Ley 25.326, arts. 14 y 16) |
| Sin Fortify ni Sanctum, y C3 partido en C3a y C3b | Usuario, clarify de C3a del 2026-10-05 |
| C3b se parte: el correo pasa a C3c y, hasta que llegue, la administración responde 503 `mail_unavailable` | Usuario, clarify del 2026-10-06 (Q4) |
| Un admin recupera su contraseña sólo por consola y el email se cambia sólo por consola | Usuario, clarify del 2026-10-06 (Q5 y Q2): son de C3c, pero dejan a la administración sin un camino HTTP para ninguna de las dos |
| C3b entra con la administración con sus nueve endpoints, el ciclo de vida de la cuenta y que el `scheduler` procese `default` | Hoja de ruta, «Alcance por ítem», C3b, con la partición del 2026-10-06 |
| C3b se entrega antes de C4: no se expone el taller sin poder administrar y suprimir cuentas | Hoja de ruta, C3b |
| Las dependencias de la API se agregan sólo con permiso del usuario | Constitución, principio VII; `backend/api/AGENTS.md` |
| TDD, código y pruebas en inglés, Pest contra MySQL 9.7 real | Constitución, principios II y VI |
| Las pantallas de cuenta son de F11 y las de administración, de F12 | Coordinador, 2026-10-05 (ver Assumptions: la rama del front que se pudo leer todavía no lo dice) |

## Clarifications

### Session 2026-10-06

- Q: **Q1**, ¿qué proveedor manda el correo, y a qué costo? → A: Brevo por SMTP (opción A): una empresa de París con servidores en la UE y sin paquetes nuevos de Composer, porque `symfony/mailer` ya está en `composer.lock`. El procesamiento en la UE entra en la lista de países adecuados de la AAIP, y Brevo queda como encargado del tratamiento y se nombra en el aviso de privacidad. Lo que sigue «a confirmar» (el plan gratuito de 300 por día para toda la cuenta y las regiones de sus servidores) se verifica en su fuente antes de contratar. Decidió el usuario. (FR-006, que pasa a C3c)
- Q: **Q2**, ¿cómo se cambia el email de una cuenta? → A: Sólo por consola, con `taller:change-email`, que avisa a las dos direcciones (opción A). Ningún camino HTTP: una sesión robada no debe poder tomar la cuenta (D19). Decidió el usuario. (FR-023 y FR-024, que pasan a C3c; FR-033 deja sin camino HTTP el email de otra cuenta)
- Q: **Q3**, cuando se abra el registro, ¿se restringe a ciertos dominios de email? → A: Sí (opción B): una lista de dominios en la configuración, y con la lista vacía no se restringe. Sólo rige cuando alguien prenda `REGISTRATION_OPEN`. Decidió el usuario. (FR-019, que pasa a C3c)
- Q: **Q4**, ¿se parte C3b? → A: Sí (opción B): C3b queda con la administración y el ciclo de vida (23 requisitos) y el correo pasa a C3c, una spec nueva (011, 33 requisitos). Mientras no llegue C3c, la administración sale con ganchos que responden 503 `mail_unavailable`. Decidió el usuario. (Partición; el correo es la [spec 011](../011-c3c-correo/spec.md))
- Q: **Q5**, ¿un admin puede recuperar su contraseña por correo? → A: No (opción A): `forgot-password` responde 202 igual, pero a una cuenta admin no le envía nada; su recuperación es por consola. Decidió el usuario. (FR-013, que pasa a C3c)

## Acciones del usuario

Los agentes no hacen estas acciones. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII); C3b no descarga nada.

| Cuándo | Acción |
| --- | --- |
| Antes de implementar | El ADR 0006 sigue en «propuesta»: su aprobación (acción de la hoja de ruta) confirma lo que esta spec toma de él. |
| Antes del despliegue público | **El texto del aviso de privacidad** dice que la supresión borra todo (la cuenta, el progreso, los intentos, el código y las importaciones), que no se deshace y que persiste hasta 35 días en los respaldos (D37) y 7 días en el binlog (§12). También sigue abierto quién responde por la base y si hay que inscribirla ante la AAIP (§13.14). |
| Al desplegar | Nada nuevo: C3b no suma servicios, secretos ni privilegios de MySQL. El `scheduler` ya corre desde C3a. |
| Al operar | Guardá la copia más reciente del libro de supresiones junto a cada respaldo y corré `taller:reapply-deletions` al restaurar, antes de abrir el tráfico (el procedimiento lo orquesta C4). |

## Descargas previstas

Ninguna. C3b no agrega paquetes de Composer, imágenes ni archivos descargados: reutiliza `mysql:9.7`, la imagen de `php` y lo que ya está en `composer.lock`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un admin invita por link, desde la API (Priority: P1)

Un admin crea invitaciones para uno o varios emails y recibe, para cada una, un link que entrega él mismo. Puede renovarlas, revocarlas y ver cuáles siguen pendientes, y las de rol admin se destacan. Con esto quien opera deja de ser el único que da de alta. La entrega por correo es de C3c: hasta entonces, pedirla responde 503.

**Why this priority**: C3a dejó `taller:invite` como único camino para crear cuentas. Sin esto, cada alta pasa por la consola.

**Independent Test**: crear un lote por link, aceptar una invitación por el camino de C3a, renovar otra, revocar otra y pedir la entrega por correo.

**Acceptance Scenarios**:

1. **Dado** un admin con la contraseña reconfirmada, **cuando** crea un lote de 3 emails con `delivery=link`, **entonces** cada uno recibe `created` con su link en la respuesta, una sola vez, y `GET /api/admin/invitations` no trae ningún token.
2. **Dados** un email con cuenta y uno con una invitación vigente, **cuando** se invitan, **entonces** responden `user_exists` e `invitation_pending` y no se crea ni cambia nada; **dado** uno con una invitación vencida, responde `renewed`, con el rol del pedido y un link nuevo.
3. **Dado** un lote de 101 emails o uno vacío, **cuando** se envía, **entonces** responde 422 `validation_failed`.
4. **Dado** crear, renovar o reenviar una invitación de rol admin, **cuando** el admin no reconfirmó su contraseña, **entonces** recibe 423 `password_confirmation_required`; la de un alumno no lo exige.
5. **Dada** una invitación pendiente, **cuando** el admin la reenvía, **entonces** el token y el vencimiento rotan, la respuesta trae el link nuevo una sola vez y el link anterior responde 404 `invitation_not_found` en la consulta de C3a; **cuando** la revoca, recibe 204 y el link responde 404.
6. **Dado** un admin que pide `delivery=email`, **cuando** el correo todavía no existe (hasta C3c, siempre), **entonces** recibe 503 `mail_unavailable` y no se crea ni cambia ninguna invitación.

*Cubre: FR-031, FR-037 a FR-040 y FR-056; SC-006 y SC-013.*

---

### User Story 2 - Administrar cuentas sin quedarse sin admin (Priority: P1)

Un admin lista y consulta usuarios, deshabilita, rehabilita, promueve o degrada cuentas y pide la recuperación de un alumno, todo con la contraseña reconfirmada y sin poder dejar al taller sin un admin activo.

**Why this priority**: reemplaza `tinker` y es lo que C4 necesita antes de exponer el taller.

**Independent Test**: recorrer cada ruta de `/api/admin` como estudiante, como admin sin confirmar y como admin confirmado; provocar la guardia con un admin y con dos, y con pedidos simultáneos.

**Acceptance Scenarios**:

1. **Dado** un admin, **cuando** pide el listado con `role=student`, `status=active`, `q` y `sort`, **entonces** recibe una página de hasta 100 usuarios con `page`, `perPage`, `total` y `lastPage`, y la ficha de uno trae sus datos de cuenta y nunca el hash, el token de «recordarme» ni textos del alumno.
2. **Dado** un estudiante o un pedido sin sesión, **cuando** pide cualquier ruta de `/api/admin`, también con un destino inexistente, **entonces** recibe 403 `forbidden` o 401 `unauthenticated`, y si la ruta modifica y falta la cuenta esperada, 409 `account_mismatch`.
3. **Dado** un admin que no reconfirmó su contraseña, **cuando** cambia el rol o el estado de una cuenta, **entonces** recibe 423; reconfirmada, `PATCH` cambia sólo `role` y `status`, y un `email` en el cuerpo no cambia el email.
4. **Dada** una cuenta deshabilitada, **cuando** hace su siguiente pedido con la sesión viva, **entonces** recibe 403 `account_disabled`; su token de recuperación se borró; y, si era admin, sus invitaciones pendientes también.
5. **Dada** una cuenta promovida a admin, **cuando** el cambio confirma, **entonces** su `remember_token` rota y su siguiente pedido a `/api/admin` ya pasa. El aviso por correo es de C3c.
6. **Dado** el único admin activo, **cuando** alguien intenta deshabilitarlo, degradarlo o suprimirlo, **entonces** recibe 409 `last_admin`; **cuando** un admin intenta deshabilitarse o degradarse a sí mismo, recibe 422 `validation_failed`.
7. **Dados** dos admins que se deshabilitan entre sí a la vez, **cuando** llegan los dos pedidos, **entonces** al menos uno queda activo.
8. **Dado** un admin con la contraseña reconfirmada, **cuando** pide la recuperación de un alumno, **entonces** recibe 503 `mail_unavailable` (hasta C3c, siempre) y no se emite ningún token; para un admin como destino recibe 422, que se evalúa antes del 503; sin la contraseña reconfirmada, 423.
9. **Dado** cualquier respuesta con éxito de `/api/admin`, **cuando** se inspecciona, **entonces** no contiene `code`, `reflection`, `note`, `body`, `custom_test` ni `raw_payload`.

*Cubre: FR-032 a FR-036 y FR-041; SC-005, SC-006 y SC-013.*

---

### User Story 3 - Llevarse los datos y borrar la cuenta (Priority: P1)

Una persona descarga todo lo que el taller guarda de ella y, si quiere, borra su cuenta. La supresión es real: se lleva también lo que «Borrar todo» deja.

**Why this priority**: es el derecho de acceso y de supresión de la Ley 25.326 (arts. 14 y 16), y la hoja de ruta no deja exponer el taller sin poder suprimir cuentas.

**Independent Test**: poblar una cuenta con todas las tablas, exportarla, suprimirla y buscar filas con su `user_id` en todo el esquema.

**Acceptance Scenarios**:

1. **Dada** una sesión con la contraseña reconfirmada, **cuando** pide `POST /api/me/export`, **entonces** recibe un archivo JSON en streaming con su cuenta (sin hash ni token), su progreso, sus intentos con el payload conservado y los crudos importados que existan, y ninguna fila de otra cuenta; el cuarto pedido del día recibe 429.
2. **Dada** una exportación en curso, **cuando** se mira MySQL, **entonces** cada tabla se lee en una transacción corta y ninguna queda abierta mientras se envía la respuesta.
3. **Dada** una cuenta con la contraseña reconfirmada, **cuando** pide `DELETE /api/me`, **entonces** recibe 202 con un mensaje que dice que se borra todo y no se deshace, la cuenta pasa a `deleting`, sus sesiones desaparecen, su siguiente pedido recibe 401 y su ingreso falla como una credencial inválida.
4. **Dada** la purga terminada, **cuando** se buscan filas con su `user_id` en todas las tablas (también las de B2 y D1 que existan), **entonces** no hay ninguna y hay una fila en `account_deletions` sin datos personales.
5. **Dada** una purga que se cortó a la mitad, **cuando** pasan 20 minutos, **entonces** el barrido ya la volvió a despachar (lo hace cada 5 minutos con las que llevan más de 15), la retoma sin duplicar nada y deja una línea en los registros.
6. **Dado** el único admin activo, **cuando** pide `DELETE /api/me`, **entonces** recibe 409 `last_admin`; un admin con la contraseña reconfirmada puede suprimir a un alumno con `DELETE /api/admin/users/{user}`.
7. **Dado** «Borrar todo» de D1, **cuando** se ejecuta, **entonces** los intentos, los payloads y las importaciones siguen; **cuando** se suprime la cuenta, ya no existen.
8. **Dada** una tabla con `user_id` que no está registrada en `UserData`, **cuando** corre la prueba de cobertura, **entonces** falla y nombra la tabla.

*Cubre: FR-042 a FR-047 y FR-049; SC-007 y SC-008.*

---

### User Story 4 - Restaurar un respaldo sin resucitar cuentas (Priority: P2)

Tras restaurar un respaldo, quien opera reaplica el libro de supresiones para que las cuentas borradas desde ese volcado no reaparezcan, y recién entonces abre el tráfico.

**Why this priority**: la supresión persiste hasta 35 días en los respaldos (D37), y C4 exige esta operación para abrir. No hace falta para que el taller funcione.

**Independent Test**: suprimir una cuenta, restaurar un volcado anterior, correr el comando con la copia del libro y mirar qué queda.

**Acceptance Scenarios**:

1. **Dados** una base restaurada y la copia del libro, **cuando** corre `taller:reapply-deletions`, **entonces** borra las cuentas del libro cuyo `user_created_at` coincide con el de la cuenta existente.
2. **Dada** una cuenta nueva que recibió un id reutilizado, con otro `created_at`, **cuando** corre el comando, **entonces** no la borra.
3. **Dado** el mismo libro, **cuando** el comando corre dos veces, **entonces** la segunda no cambia nada.
4. **Dada** una fila del libro con más de 35 días, **cuando** corre la poda diaria, **entonces** desaparece.

*Cubre: FR-047 y FR-048; SC-009.*

---

### User Story 5 - Operar sin sorpresas: el scheduler procesa la cola y poda (Priority: P2)

Quien despliega necesita que la cola `default` se procese sola, que las podas corran sin solaparse y que, sin correo, el taller siga operable. Es lo que hace que una supresión termine sin que nadie corra un comando.

**Why this priority**: sin esto, `PurgeUserData` queda en la cola para siempre y la cuenta, en `deleting`. No agrega comportamiento visible para el alumno.

**Independent Test**: con el stack levantado, suprimir una cuenta de prueba por HTTP y mirar que desaparece sola; mirar las tareas del `scheduler` y las respuestas sin correo.

**Acceptance Scenarios**:

1. **Dado** el `scheduler` corriendo, **cuando** pasa un minuto, **entonces** procesa la cola `default` y sólo ella (la cola `runs` de B2 comparte tabla y no se toca), sin solaparse.
2. **Dado** un trabajo fallido de hace siete días, **cuando** corre la poda diaria, **entonces** desaparece de `failed_jobs`; y la poda de `account_deletions` corre a los 35 días (historia 4).
3. **Dada** una cuenta de prueba que pide su supresión por HTTP, **cuando** pasan 3 minutos, **entonces** la cuenta y todas sus filas desaparecieron y hay una fila en `account_deletions`.
4. **Dado** el taller sin correo, **cuando** se pide `GET /api/session`, **entonces** `features.passwordReset` es `false`, ningún correo se encola y los links por consola y por la respuesta del admin siguen funcionando.
5. **Dado** el stack levantado, **cuando** corren `api:smoke`, `api:content:check` y `deploy-check.sh`, **entonces** pasan.

*Cubre: FR-050 y FR-056; SC-012, SC-013 y SC-014.*

---

### Edge Cases

- **Sin correo hasta C3c:** una invitación por correo, la recuperación de la contraseña de un tercero, el aviso al promover y el aviso de cuenta borrada son de C3c. Hasta entonces, las dos primeras responden 503 `mail_unavailable` y los avisos no existen: quien pierde su contraseña la recupera por consola (C3a), y un admin entrega los links a mano.
- **Dos admins a la vez:** los pedidos que dejarían cero admins activos se serializan por la guardia (FR-034): el segundo recibe 409 `last_admin`.
- **Un admin degradado con la sesión viva:** el rol se lee en cada pedido, así que su siguiente pedido a `/api/admin` recibe 403 `forbidden`.
- **Un admin suprime a otro admin, o a sí mismo:** vale mientras quede otro admin activo; si no, 409 `last_admin`. Deshabilitarse o degradarse a sí mismo es 422.
- **Una cuenta en `deleting`:** ya no se puede modificar por la administración, porque la purga la está borrando.
- **Dos pedidos de supresión seguidos:** el segundo ya no tiene sesión (401), y el trabajo de purga es único por cuenta.
- **Una purga que falla a mitad:** la cuenta queda en `deleting` con parte de sus datos y sin poder entrar; el barrido la retoma (FR-046).
- **Una tabla nueva con `user_id`:** si B2, D1 o un ítem futuro no la registran en `UserData`, rompe la prueba de cobertura del ítem que la crea (FR-042): no llega a la supresión ni a la exportación sin que alguien lo note.
- **D1 llega después:** la exportación y la supresión cubren las tablas que existen, y la prueba de cobertura exige las que lleguen. Hasta que D1 entregue su lector de la foto, el progreso de B2 sale como filas de sus tablas.
- **Restaurar con un id reutilizado:** una cuenta nueva puede recibir el id de una suprimida. `user_created_at` distingue las dos y el comando no borra la nueva (FR-048).
- **Una exportación grande:** ocupa un proceso de PHP-FPM mientras dura (el ADR §9 cuenta 5 hijos) y no es una foto atómica entre tablas. Se limita a 3 por día y cuenta.
- **Un email que difiere en mayúsculas o acentos:** se canonicaliza y se compara igual que en C3a, en las invitaciones de admin.

## Requirements *(mandatory)*

### Functional Requirements

**Administración de usuarios e invitaciones**

- **FR-031**: Toda ruta de `/api/admin` DEBE exigir una sesión activa con el email verificado y el rol `admin` (un estudiante recibe 403 `forbidden`; sin sesión, 401), llevar la cuenta esperada (C3a FR-036) y limitarse a 120 por minuto por usuario. Ningún cuerpo recibe `user_id`: el destino es el de la ruta, y uno inexistente responde 404 `not_found`. Un estudiante recibe 403 también ante un destino inexistente: la guardia del rol va antes que la búsqueda del destino. *(§4.5, §4.6)*
- **FR-032**: `GET /api/admin/users` DEBE listar con paginación por offset (hasta 100 por página, con `page`, `perPage`, `total` y `lastPage` en camelCase) y los filtros `q` (nombre o email), `role`, `status` y `sort`. `GET /api/admin/users/{user}` DEBE devolver la ficha: `id`, `name`, `email`, `role`, `status`, si el email está verificado, la versión del aviso aceptada y las fechas de alta y de cambio. Nunca el hash, el token de «recordarme» ni textos del alumno. *(§7, §8)*
- **FR-033**: `PATCH /api/admin/users/{user}` DEBE cambiar sólo `role` y `status` (ningún otro campo, tampoco `email`), con `status` limitado a `active` y `disabled` (`deleting` lo crea la supresión), y exigir `password.confirm` (423 sin confirmar). Es el camino soportado para deshabilitar, rehabilitar, promover y degradar una cuenta, y `tinker` deja de hacer falta. *(§7, D19; C3a, «Sin hacer a propósito»)*
- **FR-034**: Ninguna operación DEBE dejar al taller sin una cuenta admin `active`. Deshabilitar, degradar o suprimir al único responde 409 `last_admin` (con su mensaje en español), y un admin que se deshabilita o se degrada a sí mismo recibe 422 `validation_failed`, que se evalúa primero (propuesta). La guardia se decide bajo un bloqueo que evita la carrera: dos pedidos simultáneos que dejarían cero admins no pasan los dos. *(§4.5)*
- **FR-035**: Deshabilitar, degradar o suprimir a un admin DEBE borrar, en la misma transacción, las invitaciones pendientes que creó; deshabilitar cualquier cuenta, su token de recuperación; y promover a admin, rotar su `remember_token` (el aviso por correo es de C3c, FR-057). Toda cuenta que deja de estar `active` pierde sus sesiones en el siguiente pedido (C3a FR-007). Después de confirmar, C3b DEBE disparar un evento (cuenta deshabilitada, degradada o en supresión) al que B2 se engancha para cancelar las ejecuciones activas con su operación (B2 FR-050): C3b es el dueño del punto de extensión y B2 lo consume, así que el orden de entrega entre los dos no importa. *(§4.5, D08, D18, D19)*
- **FR-036**: `POST /api/admin/users/{user}/password-reset` DEBE exigir `password.confirm`, valer sólo para estudiantes (422 `validation_failed` si el destino es admin) y no devolver nunca el link. El correo de recuperación y su 202 son de C3c (FR-057 (b)): hasta entonces responde 503 `mail_unavailable` (FR-056), después de las demás comprobaciones y sin emitir ningún token. El link para un admin, o sin correo, sale sólo por `taller:password-reset-link`. *(§4.3, D19)*
- **FR-037**: `GET /api/admin/invitations` DEBE listar paginado, NUNCA devolver tokens y destacar las invitaciones de admin pendientes (la interfaz las muestra siempre, porque sin correo nadie recibe un aviso). Cada una lleva `email`, `role`, `delivery`, `expiresAt`, `sentAt`, `sendFailedAt` y quién la creó. *(§4.1 paso 6, §7)*
- **FR-038**: `POST /api/admin/invitations {emails[1..100], role, delivery}` DEBE procesar cada email en su propia transacción corta (el UNIQUE resuelve la carrera entre dos admins) y responder 200 con un resultado por email: `created`, `renewed` (una vencida, con el rol del pedido), `user_exists` o `invitation_pending`. Con `delivery=link` trae el link una sola vez. Crear o renovar una invitación de admin exige `password.confirm`. La entrega por correo, el tope de 300 correos por admin y por día y el resultado `rate_limited` son de C3c (FR-057 (a)): hasta entonces `delivery=email` responde 503 `mail_unavailable` (FR-056) y no crea nada. *(§4.1, §4.6)*
- **FR-039**: `POST /api/admin/invitations/{invitation}/resend` DEBE rotar el token y el vencimiento (el link anterior deja de valer), exigir `password.confirm` si es de admin y devolver `{url}` una sola vez. Con `delivery=email`, que es de C3c (FR-057 (a)), responde 503 `mail_unavailable` hasta entonces. `DELETE /api/admin/invitations/{invitation}` DEBE revocarla y responder 204. *(§4.1 paso 4)*
- **FR-040**: Las acciones de admin DEBEN quedar en los registros con actor, destino y acción (invitar, reenviar, revocar, cambiar rol o estado, suprimir y disparar recuperaciones), sin una tabla de auditoría: no son logins (R5). *(D20)*
- **FR-041**: Ninguna respuesta con éxito de `/api/admin/*` DEBE contener las claves `code`, `reflection`, `note`, `body`, `custom_test` ni `raw_payload`, es decir, ni código ni textos del alumno. Una prueba recorre todas las rutas de `/api/admin/` (también las que sume C5) y falla si aparece alguna. El `code` de un cuerpo de error es el código de error de la API, no el del alumno. *(§4.5, D31)*

**Ciclo de vida de la cuenta**

- **FR-042**: `UserData` DEBE ser el único registro de lo que el taller guarda de una cuenta, del que salen su exportación y su supresión: cada dueño de tablas del alumno (C3a, B2 y D1) declara las suyas. Una prueba de cobertura contra `information_schema` DEBE fallar si una tabla con `user_id` (o hija de una) no figura en la exportación o no figura en la supresión, o no está en una lista de excepciones con su motivo. La supresión DEBE funcionar también cuando las tablas de D1 todavía no existen, y cubrirlas cuando existan; las de B2, ya entregada, entran desde el principio. La clave foránea con cascada hacia `users` que C3a exige en toda tabla con `user_id` (su FR-004) es la red de seguridad de la supresión, no su mecanismo: la purga borra por lotes primero (D06). *(§8, D06, D33; C3a FR-004)*
- **FR-043**: `POST /api/me/export` DEBE exigir sesión y `password.confirm`, valer sólo para el titular, limitarse a 3 por día y entregar en streaming un archivo JSON con la cuenta (sin hash ni token), la foto de progreso v2 (la que arma el lector único de D1), los intentos con el payload conservado y los crudos importados. Mientras D1 no entregue su lector de la foto, el progreso de B2 sale como filas de sus tablas. Lee cada tabla en una transacción corta: no sostiene una transacción larga que frene un DDL, y por eso no es una foto atómica entre tablas. NO incluye sesiones, invitaciones ni tokens, y no existe una exportación de admin. *(D33, §7; Ley 25.326, art. 14)*
- **FR-044**: `DELETE /api/me` DEBE exigir sesión y `password.confirm` y responder 202, o 409 `last_admin` si la cuenta es el único admin activo. El pedido de supresión DEBE, en una transacción corta, pasar la cuenta a `deleting`, borrar sus sesiones, rotar su token de «recordarme», borrar las invitaciones pendientes que creó (si es admin) y las de su email, y su token de recuperación; después del COMMIT encola `PurgeUserData` y dispara el evento de FR-035. Desde entonces la cuenta no entra: el ingreso falla como una credencial inválida y una sesión viva recibe 401 (C3a). `DELETE /api/admin/users/{user}` hace lo mismo para otra cuenta, con la contraseña reconfirmada del admin. *(D06, §7)*
- **FR-045**: `PurgeUserData` (cola `default`) DEBE ser idempotente, único por cuenta y reintentarse con espera creciente. Cancela las ejecuciones que sigan activas con la operación de B2 y borra por lotes, en el orden de D06 y de B2 (`runs`, `exercise_progress`, `attempts` con sus hijas en cascada y `sync_operations`). En una transacción final toma la cabecera del usuario (`progress_heads`, si existe) antes de borrar la fila de `users`, cuya cascada se lleva el resto, e inserta la fila de `account_deletions`. Al terminar, ninguna tabla guarda una fila con ese `user_id`. El aviso de cuenta borrada es de C3c (FR-057 (d)). *(D06, D08)*
- **FR-046**: Una tarea del `scheduler`, cada 5 minutos, DEBE volver a despachar la purga de las cuentas que llevan más de 15 minutos en `deleting` y avisarlo en los registros. *(D06, §7; el ADR dice los dos plazos y se toman los dos)*
- **FR-047**: `account_deletions` DEBE tener `user_id` (clave primaria), `user_created_at` y `deleted_at`, sin datos personales ni clave foránea, con un índice por `deleted_at`. Nace en una migración con un solo `CREATE TABLE`, se poda a los 35 días y figura en la lista de excepciones de la prueba de esquema de C3a (su FR-004), que hoy exige una clave foránea en cascada para toda columna `user_id`. Se copia junto a cada respaldo (C4). *(§5.2, D37)*
- **FR-048**: `taller:reapply-deletions <archivo>` DEBE reaplicar el libro (la copia más reciente, tomada junto al respaldo) sobre una base restaurada: borra, por el camino de FR-045, las cuentas del libro cuyo `user_created_at` coincide con el de la cuenta existente, NO borra una cuenta nueva que recibió un id reutilizado y es idempotente. Corre después de restaurar el volcado y el binlog, y antes de abrir el tráfico. *(D37)*
- **FR-049**: «Borrar todo» (D1) NO DEBE confundirse con la supresión: borra el estado de estudio y deja los intentos, los payloads y las importaciones; suprimir la cuenta es lo único que los borra. La respuesta de `DELETE /api/me` y el contrato de C3b lo dicen, para que la pantalla lo diga. *(D1, Q2; Ley 25.326, art. 16)*

**Operación de la administración y del ciclo de vida**

- **FR-050**: El `scheduler` DEBE procesar la cola `default` cada minuto, sin solaparse, y agendar la poda de `failed_jobs` a los 7 días, la poda de `account_deletions` a los 35 y el barrido de FR-046, además de las tareas de C3a. *(D34, D30, §7)*

**Sin correo hasta C3c**

- **FR-056**: Hasta que C3c esté entregada, el taller NO tiene correo. Las tres rutas de la administración que pedirían uno (`POST /api/admin/invitations` y `POST /api/admin/invitations/{invitation}/resend` con `delivery=email`, y `POST /api/admin/users/{user}/password-reset`) DEBEN responder 503 `mail_unavailable` (con `Retry-After` y en español), después de que pasaron las comprobaciones previas de la ruta (la sesión, el rol, la contraseña reconfirmada, los datos y que el destino exista y sea un alumno) y sin crear, emitir ni cambiar nada. Ningún aviso por correo (rol de admin asignado, cuenta borrada) se envía ni falla, y `features.passwordReset` sigue en `false`. Las invitaciones por link y `taller:password-reset-link` siguen como en C3a. C3c completa estos ganchos (su FR-057). *(Clarifications, Q4; D21)*

**Verificación** (pruebas que el cambio DEBE traer antes de la implementación, según la constitución II)

- **FR-053**: Las pruebas de administración DEBEN cubrir: la matriz de IDOR y de acceso (estudiante, sin sesión y sin cuenta esperada, también ante un destino inexistente, en cada ruta de `/api/admin`, y la exportación y la supresión sólo del titular), la matriz de `password.confirm` (qué rutas lo exigen y cuáles no), la guardia del último admin incluida la carrera con conexiones paralelas, los efectos de FR-035, FR-041 y los 503 de FR-056. *(§4.5, §8)*
- **FR-054**: Las pruebas del ciclo de vida DEBEN cubrir: `DELETE FROM users` de una cuenta con todas las tablas pobladas (las de C3a, B2 y D1 que existan) sin error de clave foránea y sin filas restantes; la cobertura de `UserData` (FR-042); la idempotencia y el reintento de la purga; el barrido; el libro y `taller:reapply-deletions` con un id reutilizado; y la exportación, que sólo trae lo propio y no sostiene una transacción larga. *(§8, D06, D37)*
- **FR-055**: *(compartido con C3c)* El código nuevo DEBE pasar el análisis estático en el nivel 9 que fija `phpstan.neon` desde C6, sin baseline ni errores ignorados, y Pint, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`. La documentación que cita la administración, la supresión o el `scheduler` (`backend/api/AGENTS.md`, que hoy dice que el rol y el estado se cambian con `tinker` hasta C3b, `docs/architecture.md`, el README y los contratos) DEBE actualizarse en el mismo cambio. *(C6 FR-012; `AGENTS.md`)*

### Key Entities *(include if feature involves data)*

- **Invitación:** ligada a un email, de un solo uso y con rol inicial. En C3b siempre se entrega como link, que el admin recibe una sola vez en la respuesta; la entrega por correo es de C3c.
- **Deshabilitar y suprimir:** deshabilitar (`disabled`) es reversible y conserva la cuenta y sus datos; suprimir (`deleting` y después el borrado físico de todo lo de la cuenta) no se deshace.
- **«Borrar todo» frente a suprimir:** «Borrar todo» (D1) borra el estado de estudio de la cuenta y deja intentos, payloads e importaciones; suprimir los borra.
- **Último admin:** el único admin con estado `active`. Ninguna operación puede dejar al taller sin uno.
- **`UserData`:** el registro de todo lo que el taller guarda de una cuenta, del que salen la exportación y la supresión. Cada dueño de tablas del alumno declara las suyas.
- **Exportación del titular:** el archivo JSON, sólo del titular, con su cuenta, su progreso, sus intentos y sus crudos importados.
- **Libro de supresiones:** `account_deletions`. Cada fila dice qué id y de qué cuenta se suprimió y cuándo, sin datos personales, para reaplicar la supresión tras restaurar un respaldo.
- **Evento de cuenta que deja de estar activa:** lo que C3b dispara después de confirmar un cambio de cuenta, y a lo que B2 se engancha para cancelar ejecuciones.
- **Sin correo:** el estado del taller hasta C3c. Las invitaciones y las recuperaciones salen como links por consola o en la respuesta del admin, y `features.passwordReset` vale `false`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-005**: En una matriz de caminos (deshabilitar, degradar y suprimir, a otro admin y a sí mismo) con un solo admin y con dos, 0 resultados dejan al taller sin un admin activo; en 20 corridas de dos pedidos simultáneos entre dos admins, queda al menos uno activo en las 20.
- **SC-006**: El 100 % de las rutas de `/api/admin` responde 403 a un estudiante (también ante un destino inexistente) y 401 sin sesión, y las que modifican responden 409 sin la cuenta esperada; las que la matriz marca responden 423 sin confirmar; y 0 respuestas con éxito traen claves de textos del alumno.
- **SC-007**: Después de suprimir una cuenta con todas las tablas pobladas, hay 0 filas con su `user_id` en cualquier tabla del esquema, 1 fila en `account_deletions` sin datos personales, y la exportación hecha antes trae lo propio y 0 filas de otra cuenta.
- **SC-008**: Una purga cortada a la mitad se vuelve a despachar sola en 20 minutos o menos y, al terminar, deja el mismo resultado que una sin corte (0 filas, 1 fila en el libro).
- **SC-009**: `taller:reapply-deletions` sobre una base restaurada borra el 100 % de las cuentas del libro cuyo `user_created_at` coincide y 0 cuentas nuevas con un id reutilizado.
- **SC-012** *(compartido con C3c)*: Pasan `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` (nivel 9, 0 errores), `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.
- **SC-013**: Sin correo, 3 de 3 caminos de la administración que lo piden (`delivery=email` al invitar, al reenviar y la recuperación de un tercero) responden 503 `mail_unavailable` sin crear ni cambiar nada, 0 avisos se envían, `features.passwordReset` es `false`, y los links por consola y por la respuesta del admin siguen funcionando (3 de 3 caminos: `taller:invite`, `taller:password-reset-link` y la invitación por link).
- **SC-014**: Con el stack levantado, una cuenta de prueba que pide su supresión por HTTP desaparece sola en 3 minutos o menos, con 1 fila en `account_deletions` y 0 filas con su `user_id` en todo el esquema, y 0 tareas del `scheduler` se solapan.

## Assumptions

- **Fuente.** La fuente técnica es el ADR 0006, en estado «propuesta» y a la espera de su aprobación (acción del usuario de la hoja de ruta). Si lo enmienda, esta spec se ajusta. Las preguntas 3, 9 y 20 de §13, que eran de esta spec, se cerraron en el clarify del 2026-10-06 y pasaron a C3c.
- **Punto de partida.** C3b se implementa sobre C3a ([spec 004](../004-c3-identidad-acceso/spec.md)), entregada en el PR #24 (`feat/c3a-identidad`), y sobre B2, entregada en el PR #22 (`feat/b2-ejecuciones`). Lo que toma de ellas se verificó en su código (ver «Relación con C3a, B2, D1, C3c, C4 y el front»). Los borradores de D1, C4 y del épico del front no pasaron por el clarify: lo que se toma de ellos es un supuesto.
- **Orden respecto de B2 y D1.** B2 ya entregó el evento que C3b dispara, sus seis tablas y la operación de cancelar ejecuciones. D1a está planificado y todavía no existe: esta spec lo resuelve con el registro de `UserData` (FR-042), con una prueba de cobertura que exige que el que llega último sume sus tablas, y con una exportación que cubre las tablas que existen. D1b, que crea `progress_imports` y `campaign_seals`, suma las suyas.
- **Un solo servidor,** con la carga de referencia del ADR (S2: hasta unas 5.000 cuentas y unas 1.000 activas en el pico) y el supuesto de trabajo de un aula de 40.
- **Sin pantallas.** C3b entrega el contrato HTTP. Las pantallas de exportar y borrar la cuenta y las de administración son del épico del front. El coordinador indicó que F11 trae todas las de cuenta y F12 las de administración. La rama `spec/front-react` que se pudo leer (commit `813fe20`, `specs/front-react/roadmap.md`) ya lo dice: F11 incluye exportar y borrar la cuenta, que esperan a C3b, y F12 depende de C3b y de F11.
- **Sin correo hasta C3c, sin una bandera nueva.** `features.passwordReset` y `features.registration` siguen en `false` (C3a), y las tres rutas de FR-056 responden 503 sin consultar la configuración: C3c las completa y recién entonces el correo depende de ella.
- **Propuestas que no vienen del ADR:**
  - Que un admin que se deshabilita o se degrada a sí mismo reciba 422 `validation_failed`, y que `PATCH /api/admin/users/{user}` acepte sólo `role` y `status` (FR-033 y FR-034).
  - Que el barrido de `deleting` corra cada 5 minutos sobre las cuentas de más de 15 (FR-046: el ADR dice los dos plazos).
  - Que la poda de `failed_jobs` la agende el `scheduler` (FR-050): C3a no la agenda.
  - Que la exportación no sea una foto atómica entre tablas (FR-043).
  - Que las tres rutas sin correo respondan 503 y no una invitación sin enviar o un 202 sin correo (FR-056): lo pide la partición (Q4).
- **Las skills no mandan sobre el ADR.** Las skills de Laravel proponen paquetes, policies por modelo y coberturas que el proyecto no adopta. Donde difieren, mandan el ADR y las decisiones del usuario.
- **Dependencias.** C3a y B2 entregadas antes. Para cubrir las tablas de D1 en la supresión y la exportación, D1a y D1b, o su registro en `UserData` cuando lleguen. C3b habilita a C4, al front (F11 y F12) y a C3c. Esta spec no toca la hoja de ruta ni las specs de C3a y de C3c.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las cinco preguntas del clarify están en Clarifications.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se parte C3b (Q4) | No partir; partir el correo como C3c; partir el ciclo de vida como C3c; partir en tres | Se parte el correo (opción B): cortar sólo el ciclo de vida deja una mitad de 46 requisitos con la decisión externa adentro, y partir en tres suma dos IDs y tres ciclos de Spec Kit y deja una spec de administración de pocos requisitos |
| Qué hace la administración sin correo | Un correo provisional en C3b; ganchos que responden 503 hasta C3c | Ganchos que responden 503: un correo provisional reabre la decisión del proveedor y del dominio, que la partición separó, y tendría que desarmarse al llegar C3c |
| Dónde vive `UserData` | Una lista fija que escribe C3b; un registro al que cada dueño suma sus tablas, con una prueba de cobertura | El registro: el orden de entrega con B2 y D1 deja de importar y una tabla nueva no se escapa |
| Cuándo se suprime una cuenta | Inmediato (D06); con un plazo de gracia reversible | Inmediato: el art. 16 pide suprimir en 5 días hábiles tras el reclamo, y un estado intermedio sumaría casos (`deleting` ya cubre la purga). Cuesta que un borrado por error no se deshaga |
| Cómo se exporta | Una transacción larga (foto atómica); transacciones cortas por tabla | Transacciones cortas (D33 y D35): una transacción larga frena los DDL de los despliegues. Cuesta que no sea una foto atómica |
| Quién evita quedarse sin admin | Un chequeo antes de escribir; un bloqueo que serializa los cambios de admins | El bloqueo (§4.5): un chequeo sin él deja pasar a dos pedidos simultáneos |

## Riesgos

1. **Una purga que queda a medias.** *Mitigación:* idempotente y única por cuenta, con barrido, y `deleting` sin ingreso (FR-044 a FR-046).
2. **Una tabla nueva que se escapa de la exportación o de la supresión.** *Mitigación:* el registro de `UserData` y la prueba de cobertura contra `information_schema` en cada ítem que cree tablas (FR-042).
3. **La carrera del último admin.** *Mitigación:* el bloqueo de FR-034 y pruebas con conexiones paralelas (FR-053).
4. **Una sesión de admin robada.** *Mitigación:* `password.confirm` en cada acción sensible, los links de recuperación de terceros y el cambio de email sólo por consola, las invitaciones de admin de 48 horas y una cuenta de admin separada (recomendada en C3a, Q3). Queda el riesgo del ADR: el admin sin segundo factor (§4.10). El aviso al promover llega con C3c.
5. **La exportación ocupa PHP-FPM.** Un archivo grande retiene un proceso (el ADR §9 cuenta 5 hijos). *Mitigación:* 3 por día y cuenta, transacciones cortas y medir antes de ajustar FPM.
6. **La cola `default` es compartida.** Una purga larga retrasa lo que se encole después en `default` hasta que el `scheduler` vuelve a correr (no se solapa). *Mitigación:* lotes chicos y el disparador de §9 para un worker propio.
7. **Trabajo en paralelo con C3c, D1 y C4.** Comparten `routes/api/`, `bootstrap/app.php`, `lang/es`, `ApiCode` y `backend/api/AGENTS.md`. *Mitigación:* los integra el coordinador, y cada ítem suma su archivo de rutas.
8. **Sin correo, quien olvida su contraseña depende de la consola.** Hasta C3c, un alumno no recupera su contraseña solo. *Mitigación:* `taller:password-reset-link` y las invitaciones por link siguen funcionando; es el modo sólo link de C3a, ya aceptado.
9. **Las dependencias son borradores.** El ADR 0006, D1, C4 y el épico del front no pasaron por el clarify. *Mitigación:* lo que se toma de ellos está marcado como supuesto.
10. **C4 espera dos ítems.** C4 depende de C3b y de C3c, y el correo espera el dominio. *Mitigación:* el corte deja que C3b llegue sin esperarlo, y C4 no abre sin C3b.

## Relación con C3a, B2, D1, C3c, C4 y el front

**Lo que C3b toma de C3a** (verificado en el código de `feat/c3a-identidad`, PR #24, commit `656b14e`):

- `invitations` nace completa, con `delivery`, `sent_at` y `send_failed_at`.
- `role`, `status` y los grupos de middleware `account` y `verified`; `AccountSessions::endAll`; `RequirePassword::isConfirmed` y `markConfirmed`.
- La prueba de esquema de FR-004 con su lista de excepciones. Su primera prueba exige una clave foránea en cascada para toda columna `user_id`, y `account_deletions` no la tiene a propósito: C3b agrega una lista aparte de excepciones.
- `config('taller.features')`, que alimenta `GET /api/session`.
- `Invitations::issue`, que crea o renueva una invitación por link sin importar si la vigente sigue vigente, y fuera de una transacción: la administración necesita otra semántica (FR-038), y `taller:invite` sigue como está.
- `PasswordResetLinks`, `ApiCode` y `ApiError::of`, los limitadores con nombre y un archivo de rutas propio por característica en `routes/api/`.
- El `scheduler`, que hoy no procesa colas, con su `ScheduleTest`.

**Lo que C3b cambia en lo de C3a** (lo integra el coordinador):

1. La prueba de esquema de FR-004 suma la lista de excepciones de `user_id` sin clave foránea (`account_deletions`).
2. `ScheduleTest`, que hoy exige exactamente cuatro tareas y ninguna que procese una cola, suma las de FR-050.
3. `ExpectedAccountMatrixTest`, que lista las rutas que modifican, suma las de C3b.
4. `ApiCode` suma `last_admin` y `mail_unavailable`, con su prueba de cuenta exacta, y los limitadores suman los de esta spec.
5. `backend/api/AGENTS.md` deja de decir que el rol y el estado se cambian con `tinker`.

**Con B2** (PR #22, `feat/b2-ejecuciones`):

- B2 ya entregó el evento `App\Auth\Events\AccountRestricted` con su `AccountRestriction` (`Disabled`, `Demoted` y `Deleting`) y el listener que cancela las ejecuciones activas. C3b los dispara y no los crea (FR-035); el contrato lo fija el código de B2.
- B2 declara para `UserData` sus seis tablas y el orden de borrado (`runs`, `exercise_progress` y `attempts` con sus hijas en cascada), y entrega `ActiveRuns::cancelAllOf` y `AccountLock`, que la purga usa (FR-045).
- B2 trae lo que las pruebas de concurrencia de C3b reutilizan: la suite `Concurrency` y `Tests\Support\Parallel`.

**Con D1** (`specs/007-d1-progreso-sincronizacion/`, rama `spec/d1-progreso`, D1a planificado):

- La supresión real de los datos del alumno es borrar la cuenta (esta spec): «Borrar todo» no borra intentos ni importaciones (FR-049). La pantalla de D1 tiene que decirlo.
- La exportación y la supresión cubren sus tablas (FR-042): las diez de D1a, con su declaración para `UserData`, y las dos de D1b. La exportación usa el lector único de la foto de D1a. `sync_operations` se borra por lotes (FR-045).
- D1a reserva las migraciones `2026_10_06_100001` a `100099`: C3b usa otro bloque.

**Con C3c** ([spec 011](../011-c3c-correo/spec.md)):

- C3c completa los ganchos de FR-056 (su FR-057) y suprime con el pedido de supresión de C3b las cuentas de registro nunca verificadas.
- El `scheduler` que procesa `default` y `ApiCode::MailUnavailable` son de C3b.

**Con C4** (`specs/008-c4-exposicion/`, rama `spec/c4-exposicion`):

- C4 usa `account_deletions` y `taller:reapply-deletions` para el respaldo y su restauración (su FR-034 y FR-042). La copia del libro es un contrato entre las dos: el formato lo fija C3b en el contrato de consola de su plan.
- C4 espera `worker-mail` y el usuario `mail` para su matriz de usuarios: son de C3c, y su borrador los atribuye a C3b.
- `php` corre con el disco de sólo lectura: el comando recibe el libro por la entrada estándar y no necesita un volumen montado.

**Con el front** (`specs/front-react/roadmap.md`, rama `spec/front-react`, commit `813fe20`):

- F11 y F12 tienen que manejar `password.confirm` (423) en cada acción sensible, `Retry-After`, 503 `mail_unavailable` y el link de una invitación que se muestra una sola vez.
- La descarga de la exportación es un POST con una respuesta en streaming: el front la baja con `fetch` y la guarda como archivo.
- La respuesta de `DELETE /api/me` dice qué se borra, para que la pantalla lo diga y no lo confunda con «Borrar todo» (FR-049).
- La recuperación de la contraseña, la verificación y el registro de F11 esperan a C3c, no a C3b.

## Fuentes consultadas el 2026-10-05

- ADR 0006, ADR 0004 y la hoja de ruta de este repositorio; la constitución y `AGENTS.md`.
- La spec de C3a y su plan, investigación, modelo de datos y contratos; el código de `feat/c3a-identidad` y de `feat/b2-ejecuciones`; los borradores de D1 y C4 y la hoja de ruta del épico del front, por ruta y rama.
- Ley 25.326, arts. 14 y 16 (acceso y supresión).
