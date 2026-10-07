# Data Model: C3b · Administración y ciclo de vida de la cuenta

**Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Investigación**: [research.md](./research.md)

**Input**: ADR 0006 §5.2 (`account_deletions`), §8 («UserData»), D06, D08 y D37 ([ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)), y las declaraciones de B2 (`specs/005-b2-api-ejecuciones/data-model.md`, sección 8, rama `spec/b2-ejecuciones`) y de D1a (`specs/007-d1-progreso-sincronizacion/data-model.md`, sección 7, rama `spec/d1-progreso`). Esas dos specs no están en esta rama: se citan por ruta y rama, sin enlace.

> **El DDL es de referencia y no se ejecutó.** Esta planificación no tuvo MySQL: el SQL sale del ADR y del estilo de las migraciones de C3a y B2 (un `CREATE TABLE` con sus claves en línea). El juez es la prueba de esquema del paso 3.1 del plan, cuyas expectativas salen del ADR y no de la migración. Si el DDL de abajo y la prueba discrepan, se corrige el DDL.

C3b crea **una** tabla, `account_deletions`. Todo lo demás es estado que ya existe (`users`, `invitations`, `password_reset_tokens`, `sessions`, `jobs` y `failed_jobs`, de C3a y C1) o código. Como B2 y D1, nace completa: se migra sólo hacia adelante en producción.

## Entidades

| Entidad (spec) | Almacén | Quién la escribe | Cuánto vive |
| --- | --- | --- | --- |
| Libro de supresiones | `account_deletions` (tabla nueva) | La transacción final de `PurgeUserData`; `taller:reapply-deletions` la completa con las filas del archivo que le falten | 35 días desde `deleted_at`; la poda diaria la borra |
| Cuenta en supresión | `users.status = 'deleting'` (columna de C3a) | `AccountChanges::beginDeletion` | Hasta que la purga borra la fila de `users` |
| Invitación | `invitations` (C3a) | `AdminInvitations` (crea, renueva, rota y revoca) y, desde la consola, `taller:invite` | Hasta aceptarse o revocarse; vencida, 30 días más y se poda (C3a) |
| Trabajo de purga | `jobs`, cola `default` (C1) | `AccountDeletion::request` y el barrido de supresiones trabadas | Hasta que termina; si agota los reintentos, `failed_jobs` durante 7 días |
| Registro `UserData` | Código: `app/Accounts/UserTables.php` | Cada dueño de tablas del alumno agrega las suyas | Versionado en Git |
| Exportación del titular | Ninguno: se arma al pedirla, en streaming | `UserExport` | Un pedido |
| Evento de cuenta restringida | Ninguno (evento de Laravel) | `AccountChanges`, después de confirmar | Un pedido |

## Migraciones: nombres y orden

Una migración, en el bloque **`2026_10_05_400001` a `2026_10_05_400099`**: ordena después de las de C2 (`100NNN`), C3a (`200NNN`) y B2 (`300NNN`), y antes de las de D1 (`2026_10_06_100001` a `100099`, que D1a reserva). `account_deletions` no tiene claves foráneas, así que su orden entre las demás no importa, pero el bloque queda reservado. Para C3c se propone `2026_10_05_500001` a `500099` (`mail_jobs`).

| Archivo | Tabla | Qué hace |
| --- | --- | --- |
| `2026_10_05_400001_create_account_deletions_table.php` | `account_deletions` | `CREATE TABLE` nueva |

## 1. `account_deletions`

El libro de supresiones (ADR 0006 §5.2 y D37): qué id y de qué cuenta se suprimió y cuándo, sin datos personales, para reaplicar la supresión después de restaurar un respaldo. No tiene clave foránea a propósito, porque la cuenta ya no existe.

```sql
CREATE TABLE `account_deletions` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `user_created_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`),
  KEY `account_deletions_deleted_at_index` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_es_0900_ai_ci
```

| Columna | Tipo | Notas |
| --- | --- | --- |
| `user_id` | `BIGINT UNSIGNED` | El id que tenía la cuenta. Sin `AUTO_INCREMENT` y sin clave foránea. Clave primaria |
| `user_created_at` | `DATETIME(3)` | El `created_at` de la cuenta: distingue un id reutilizado después de restaurar (FR-048) |
| `deleted_at` | `DATETIME(3)` | El fin de la purga. Base de la poda a los 35 días; un índice la sirve |

- **Sin `CHECK`:** no hay regla de fila, y D07 prohíbe un `CHECK` sobre `DATETIME` en una tabla que puede crecer.
- **Sin columnas de texto:** la colación es la de la conexión y no importa. Nada de lo que guarda identifica a una persona sin el respaldo.
- **Una fila por id:** la clave primaria hace idempotente la inserción (`insertOrIgnore`): la purga reintentada y `taller:reapply-deletions` no duplican.
- **Instantes en UTC con milisegundos**, como el resto: PHP manda `Y-m-d H:i:s.v` desde el reloj del servidor, nunca `NOW()` de MySQL.

## 2. `UserData`: lo que el taller guarda de una cuenta

`app/Accounts/UserTables.php` es el registro único. Cada fila dice cómo la tabla es de la cuenta, qué pasa con ella al exportar y qué pasa al suprimir. Las tablas de B2 y de D1a se declaran por su nombre, existan o no: la supresión y la exportación saltan las que todavía no existen, y la prueba de cobertura exige las que sí.

| Tabla | Dueño | Es de la cuenta por | Exportación | Supresión |
| --- | --- | --- | --- | --- |
| `sessions` | C3a | `user_id` (clave foránea en cascada) | No, con motivo: es operativa y no la escribió la persona | Se borran al pedir la baja (`AccountSessions::endAll`); la cascada se lleva el resto |
| `invitations` | C3a | Por email, y `invited_by` (`SET NULL`) | No (FR-043) | Al pedir la baja se borran las que creó, si es admin, y las de su email |
| `password_reset_tokens` | C3a | Por email | No (FR-043) | Se borra al pedir la baja |
| `account_deletions` | C3b | `user_id` sin clave foránea a propósito (FR-047) | No, con motivo: no tiene datos personales | No: es el libro; se poda a los 35 días |
| `progress_heads` | B2 | `user_id` (clave primaria) | No, con motivo: es el candado de la cuenta; la época y la revisión salen en la foto de progreso de D1 | La transacción final la toma `FOR UPDATE` y la cascada la borra |
| `runs` | B2 | `user_id` | No, con motivo: es operativa (dura 14 días) y su código y su salida viven en el payload del intento | Lote 1, después de cancelar las activas |
| `exercise_progress` | B2 | `user_id` | Sí, como filas (`exerciseProgress`) hasta que D1a entregue la foto v2 (`progress`), que las incluye | Lote 2 |
| `attempts` | B2 | `user_id` | Sí, con sus pruebas y el payload que se conserve (`attempts`) | Lote 3 |
| `attempt_tests` | B2 | Hija de `attempts` | Sí, con su intento | Cascada del lote 3 |
| `attempt_payloads` | B2 | Hija de `attempts` | Sí, con su intento, el que se conserve | Cascada del lote 3 |
| `sync_operations` | D1a | `user_id` | No, con motivo: es operativa y sólo guarda UUID y huellas | Lote 4 |
| `drafts`, `campaign_checkpoints`, `workshop_progress`, `route_marks`, `route_quiz_answers`, `route_notes`, `preferences` | D1a | `user_id` | Sí, por la foto de progreso v2 (`progress`) | Cascada de la transacción final |
| `workshop_observations`, `workshop_step_marks` | D1a | Hijas de `workshop_progress` (clave compuesta en cascada) | Sí, por la misma foto | Cascada, por `workshop_progress` |

- **Lo que D1b suma:** `progress_imports` (la exportación incluye sus crudos, como `imports`) y `campaign_seals`. No están declaradas: son de una spec que todavía no se planificó. La prueba de cobertura falla en el ítem que las cree sin declararlas.
- **Los lotes**, en el orden de D06 y de B2: `runs` (por `id`), `exercise_progress` (por `exercise_id`), `attempts` (por `id`) y `sync_operations` (por `operation_id`). Cada uno borra `batch_size` filas por sentencia, con `DELETE … WHERE user_id = ? ORDER BY <clave> LIMIT <n>`, hasta que una sentencia afecta menos filas que el lote. `runs.attempt_id` cae en cascada desde `attempts`: borrar `runs` primero deja la cascada sin trabajo.
- **Lo que no es un lote:** una tabla que llega a `users` por cascada tiene a lo sumo unas decenas de filas por cuenta (las de D1a, salvo `sync_operations`). La clave foránea con cascada de C3a (su FR-004) es la red de seguridad de la supresión, no su mecanismo.
- **Las excepciones** (`sessions`, `invitations`, `password_reset_tokens` y `account_deletions`) llevan su motivo en el registro: una excepción sin motivo rompe la prueba.

## 3. Estado de una cuenta

El estado vive en `users.status`; el rol, en `users.role`. Sólo cambian estas transiciones, y siempre por `AccountChanges` (nadie más escribe `role` ni `status`, FR-002 de C3a).

| De | A | Quién | Qué más pasa |
| --- | --- | --- | --- |
| `active` | `disabled` | `PATCH /api/admin/users/{user}` | Borra su token de recuperación y, si era admin activo, las invitaciones que creó; su sesión viva recibe 403 `account_disabled`; evento `Disabled` |
| `disabled` | `active` | `PATCH` | Nada más |
| Admin | Estudiante | `PATCH` | Borra las invitaciones que creó; evento `Demoted`; su siguiente pedido a `/api/admin` recibe 403 |
| Estudiante | Admin | `PATCH` | Rota su `remember_token` |
| `active` o `disabled` | `deleting` | `DELETE /api/me` y `DELETE /api/admin/users/{user}` | Borra sus sesiones, rota su `remember_token`, borra las invitaciones que creó y las de su email, y su token de recuperación; evento `Deleting`; encola `PurgeUserData` |
| `deleting` | (fila borrada) | `PurgeUserData` | La transacción final borra `users` (la cascada se lleva el resto) e inserta la fila del libro |
| `deleting` | `active` o `disabled` | Nadie | `PATCH` responde 422: la purga la está borrando |

**La guardia.** Toda transición que deja a un admin activo sin ese estado (deshabilitarlo, degradarlo o suprimirlo) corre bajo la guardia del último admin: dentro de la misma transacción, `SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE` (por el índice `(role, status)`) y después la fila objetivo `FOR UPDATE`. Si el objetivo es el único, la operación responde 409 `last_admin` y no cambia nada.

## 4. Bloqueo y aislamiento (D08)

- Los cambios de cuenta (`AccountChanges`) son transacciones cortas en `READ COMMITTED` (`WriteTransaction::run`) que sólo tocan `users`, `invitations`, `password_reset_tokens` y `sessions`. **Nunca toman `progress_heads`**: así nadie espera la cabecera con `users` bloqueado.
- La transacción final de la purga toma `progress_heads` (`AccountLock::within`) **antes** de borrar la fila de `users`. El orden único del backend sigue siendo `progress_heads → users → runs → attempts → …`.
- Las cancelaciones de ejecuciones derivadas de un cambio de cuenta corren **después** del COMMIT: las hace el listener de B2 al recibir el evento (una transacción de cierre por ejecución) y `PurgeUserData` al empezar.
- La exportación no abre una transacción larga: cada fragmento se lee en una transacción corta de sólo lectura, que termina antes de escribir en la respuesta.

## 5. El trabajo de purga

`PurgeUserData` guarda sólo el id de la cuenta: ni el email ni el nombre (el aviso de cuenta borrada es de C3c, y entonces el trabajo suma esos datos, cifrados). Su carga útil, en `jobs.payload`, no tiene datos personales. La cola es `default`, que el `scheduler` procesa cada minuto. El candado de unicidad (`ShouldBeUnique`, de 5 horas) usa el almacén de caché, que en producción es la tabla `cache_locks`.

## Qué prueba el esquema (paso 3.1 del plan)

Las expectativas salen del ADR §5.2 y de esta página, no de la migración.

| Prueba | Qué comprueba |
| --- | --- |
| A | `account_deletions` existe en InnoDB, tiene 3 columnas y ninguna es `TIMESTAMP` |
| B | Los tipos: `user_id` `bigint unsigned`, `user_created_at` y `deleted_at` `datetime(3)`, todas `NOT NULL` |
| C | La clave primaria es `(user_id)` y existe el índice `account_deletions_deleted_at_index` sobre `deleted_at` |
| D | No tiene ninguna clave foránea (ni desde ni hacia otra tabla) |
| E | `UserIdForeignKeyTest`: toda columna `user_id` es una clave foránea en cascada hacia `users(id)`, salvo las de una lista aparte con su motivo: `account_deletions` (el libro) y las hijas de taller de D1a, que llegan por la clave compuesta a `workshop_progress` |
| F | Migrar, deshacer y volver a migrar deja el mismo `SHOW CREATE TABLE` |

## Modelos de Eloquent

`App\Models\DeletedAccount` (la fila del libro): `$table = 'account_deletions'`, `$primaryKey = 'user_id'`, `$incrementing = false`, `$timestamps = false`, `$dateFormat = 'Y-m-d H:i:s.v'`, con `Prunable` (`prunable()` devuelve `deleted_at <= ahora − config('taller.ledger_days')`, 35). Sin atributos asignables en masa: nadie lo crea con un formulario. Larastan no lee las columnas de un DDL en bruto, así que el modelo las declara en un `@property`, como `User` e `Invitation`.
