# Research: C3b · Administración y ciclo de vida de la cuenta

**Input**: [spec.md](./spec.md) con su clarify del 2026-10-06, ADR 0006 y el código de `backend/api/` de C3a (`feat/c3a-identidad`, `656b14e`) y de B2 (`feat/b2-ejecuciones`, `1d263c3`). Cada decisión dice qué se eligió, por qué y qué se descartó. Las que la spec no fija y el plan completó están en la primera tabla, para que el coordinador las vea juntas.

Las referencias «R1» a «R14» de este archivo son sus propias secciones. Los requisitos del ADR 0006 se citan como «R3 del ADR», y las decisiones, como D06 o D35.

## Cómo se verificó

- **Qué se leyó.** El código de C3a que C3b usa (`app/Auth/`, `app/Http/`, `routes/`, `bootstrap/app.php`, `config/`, las migraciones de identidad, `ScheduleTest`, `RouteAccessTest`, `ExpectedAccountMatrixTest`, `UserIdForeignKeyTest` y `Tests\Support\Browser`); el de B2 (`AccountRestricted`, `AccountRestriction`, `CancelRunsOfRestrictedAccount`, `ActiveRuns`, `AccountLock`, `RunWorld`, `Parallel` y la suite `Concurrency`); `docker/compose.yaml`, `docker/nginx/nginx.conf` y `docker/mysql/db-grants.sql` de C3a; y los `data-model.md` de B2 (sección 8) y de D1a (sección 7, en `spec/d1-progreso`) para las tablas que la exportación y la supresión tienen que cubrir.
- **Laravel 13.x**, de la documentación oficial (colas, programación de tareas, respuestas, rutas, Eloquent) y del código fuente de la rama `13.x` (`Kernel::$middlewarePriority`, `Configuration\Middleware`, los atributos de `Illuminate\Queue\Attributes`), con `WebFetch` el 2026-10-06. Context7 no ofrecía sus herramientas en esta sesión. `composer.lock` fija `laravel/framework` v13.34.0.
- **El grafo de código** (`codebase-memory-mcp`) no tenía ningún proyecto indexado: se usó la lectura directa de archivos.
- **No se ejecutó nada.** El host no tiene PHP ni Composer, y la tarea excluía Docker y las descargas. Ningún código del plan corrió: lo que figura como firma, SQL o configuración es referencia. Lo que quedó sin verificar está en la sección «Lo que quedó sin verificar» del [plan](./plan.md).

## Decisiones del plan que la spec no fija

| # | Decisión | Dónde |
| --- | --- | --- |
| 1 | Las tres rutas sin correo lanzan `MailUnavailable` sin consultar la configuración, sin una interfaz ni una bandera nueva | R1 |
| 2 | La guardia del rol es un middleware propio (`account.admin`) en un grupo `admin`, sin `Gate` ni policies, y las rutas no usan el binding implícito: 403 antes que 404 | R2 |
| 3 | `AccountChanges` es el único que cambia rol y estado; `LastAdminGuard::lock` devuelve el destino y cuántos admins activos hay además de él | R3 |
| 4 | Un `PATCH` sobre una cuenta en `deleting` es 422; uno que no cambia nada es 200 sin efectos; deshabilitar no borra las sesiones y suprimir sí | R3 |
| 5 | La administración de invitaciones tiene su propia entrada (`AdminInvitations`): una invitación vigente es `invitation_pending`, no se renueva | R4 |
| 6 | Un email repetido en el lote es 422; `resend` acepta `delivery` y, sin él, usa el de la invitación | R4 |
| 7 | `UserData` es el registro declarativo de tablas; la purga por lotes y la exportación son dos clases con un dueño cada una | R5 |
| 8 | La exportación usa `response()->streamJson` con generadores, fragmentos en transacciones cortas, `X-Accel-Buffering: no` y el formato `taller-export-1`; hasta D1a el progreso sale como filas | R6 |
| 9 | `PurgeUserData` lleva sólo el id (sin email ni cifrado), usa los atributos de colas de Laravel 13 y cierra con `AccountLock::within` | R7 |
| 10 | La cancelación de ejecuciones al purgar es de mejor esfuerzo y se registra | R7 |
| 11 | El barrido mide «trabada» por `users.updated_at` | R7 |
| 12 | El libro entra a `taller:reapply-deletions` por la entrada estándar, en TSV, y el comando completa el libro de la base restaurada | R8 |
| 13 | `queue:work` sólo de `default`, con un bloqueo que vence a los 10 minutos; `queue:prune-failed --hours=168`, la poda del libro y el barrido cada 5 minutos | R9 |
| 14 | La forma de `AdminUser`, de `AdminInvitation` y de la página; los códigos `last_admin` y `mail_unavailable` con sus mensajes | R10 |
| 15 | La prueba de esquema de C3a suma una lista de excepciones de `user_id` sin clave foránea directa | R11 |
| 16 | `PopulatedAccount` puebla toda tabla declarada que exista, y una prueba exige que no falte ninguna | R5 |

## R1. Sin correo hasta C3c: tres sitios con 503

**Decisión.** `POST /api/admin/invitations` y `POST /api/admin/invitations/{invitation}/resend` con `delivery=email`, y `POST /api/admin/users/{user}/password-reset`, lanzan `MailUnavailable` (un `HttpResponseException` que responde `ApiError::of(ApiCode::MailUnavailable)` con `Retry-After: 3600`) **después** de las demás comprobaciones de la ruta y **antes** de escribir nada. No leen `taller.features.password_reset`, no hay una interfaz de correo ni un objeto vacío. Los dos avisos (rol de admin asignado y cuenta borrada) simplemente no existen: C3c los agrega donde corresponden.

**Por qué.**

- La partición (Q4) pide ganchos que respondan 503 hasta que llegue C3c, y la spec lo fija en FR-056. Eso es el comportamiento; una abstracción para enchufar el correo sería una capa «por anticipado» (constitución, principio V; `AGENTS.md`).
- Con la bandera pasa lo mismo: si C3b la leyera y alguien la encendiera sin C3c, la invitación quedaría creada con `delivery=email` y nunca saldría. Incondicional, el estado de C3b es uno solo.
- C3c entra por la puerta de siempre, una spec nueva que **extiende** a esta (constitución, principio VIII): cambia esos tres sitios y suma los dos avisos, y su plan los nombra. Este plan los deja con nombre y firma (contracts/http.md, «Para los ítems que se apoyan en C3b»).

**Descartado.** Un puerto `AccountMail` con una implementación que dice «no disponible» (y un doble en las pruebas): escribiría en C3b la forma del correo de C3c y probaría ramas que C3b no construye. Un correo provisional en C3b: reabre el proveedor y el dominio que la partición separó.

**El orden de las respuestas** en cada ruta (la prueba lo fija): en `password-reset`, 423, 404, 422 (destino admin o no activo) y 503; en las invitaciones, 422 de validación, 423 si el rol es admin y 503. Si el 503 fuera primero, el 422 por un destino admin no se podría probar en C3b.

## R2. El rol de admin, las rutas y el 403 antes que el 404

**Decisión.**

- `account.admin` es un middleware propio (`EnsureUserIsAdmin`) que responde `ApiError::of(ApiCode::Forbidden)` si `role` no es `admin`. El grupo de middleware `admin` lo arma `bootstrap/app.php` con los de C3a y los de esta spec, en este orden: `account.active`, `auth:web`, `account.expected`, `verified`, `account.admin`, `throttle:admin`.
- **Sin `Gate` ni policies.** El ADR §4.5 nombra un `Gate admin` y `UserPolicy` e `InvitationPolicy`, pero la spec (FR-031) sólo pide el rol, y todas las rutas de `/api/admin` exigen lo mismo. Las reglas que dependen del estado (el último admin, la contraseña reconfirmada) no caben en una policy.
- **Sin binding implícito.** `{user}` y `{invitation}` son enteros (`whereNumber`) que el servicio busca después de las guardias.

**Por qué.** `SubstituteBindings` está en el grupo `api` y en la lista de prioridad de Laravel (`Kernel::$middlewarePriority`) **antes** de `Authorize`, y un middleware propio que no está en esa lista queda donde se lo declara, es decir, después del binding. Con binding implícito, un estudiante que pide `/api/admin/users/999999` recibiría 404 y con un id real, 403: filtra qué ids existen. Sin él, el rol se comprueba primero y la matriz de FR-053 puede exigir 403 en los dos casos. Un `{user}` que no es un entero no coincide con la ruta y responde 404 `not_found`, lo mismo que cualquier ruta inexistente, para todos.

**Consecuencia para C3a.** `RouteAccessTest` pide cada ruta de lectura con el `{id}` del contenido reemplazado por `rust-01`; con `{user}` literal, `whereNumber` no coincidiría y respondería 404. El coordinador generaliza el reemplazo (T022).

**Descartado.** `can:admin` con `Gate::define`: correría después del binding. Reordenar la lista de prioridad con `appendToPriorityList`: funciona, pero es una regla de orden más que mantener, para algo que se evita no usando el binding. `Gate::before`: lo excluye el ADR (§4.5, «sin un `before()` que autorice todo») y la spec de C3a (R19).

## R3. Cambiar el rol o el estado de una cuenta, bajo la guardia

**Decisión.** `App\Admin\AccountChanges` es el único código que escribe `role` y `status` (después de C3a, que sólo los lee). Tiene dos operaciones, y las dos corren en una `WriteTransaction` (READ COMMITTED) corta y disparan sus eventos **después** de confirmar:

- `change(User $actor, int $targetId, ?Role $role, ?AccountStatus $status): User`: deshabilitar, rehabilitar, promover y degradar.
- `beginDeletion(int $targetId, bool $guardLastAdmin = true): User`: pasar a `deleting`. `taller:reapply-deletions` la llama sin la guardia, porque la supresión que reaplica ya había pasado esa regla.

**La guardia** (`App\Admin\LastAdminGuard`). `lock(int $targetId)` ejecuta `SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE` (por el índice `(role, status)`) y después la fila objetivo `FOR UPDATE`, y devuelve `LockedTarget`: el `User` y `otherActiveAdmins`, la cantidad de admins activos **sin contar al destino**. Si el cambio le quita el estado de admin activo (deshabilitarlo, degradarlo o suprimirlo) y `otherActiveAdmins` es 0, lanza `LastAdmin` (409). Bloquear primero el conjunto y después el destino da un orden único: dos pedidos concurrentes se serializan en el primer registro del conjunto, y el segundo lee, ya confirmado, lo que dejó el primero (READ COMMITTED).

**El orden de las reglas.** (1) Un admin que se deshabilita o se degrada a sí mismo: 422 `validation_failed`, **antes de tocar la base**. (2) Se toma el bloqueo y se lee el destino: 404 si no existe; 422 si está en `deleting` (la purga lo está borrando). (3) Si no cambia nada, 200 sin efectos. (4) La guardia: 409. (5) Los efectos de FR-035, en la misma transacción.

**Deshabilitar no borra las sesiones.** `AccountSessions::endAll` las borraría y la siguiente petición de esa persona sería un 401 sin explicación; C3a quiere un 403 `account_disabled` mientras la sesión viva exista (su FR-007: «borrar la fila de `sessions` es limpieza, no una garantía»). Suprimir sí las borra (FR-044) y la persona recibe 401.

**Por qué no hay un `users FOR UPDATE` antes de la cabecera.** D08: los cambios exclusivos sobre `users` van en transacciones propias que nunca toman `progress_heads`; las cancelaciones derivadas corren después del COMMIT. Por eso el evento se dispara fuera de la transacción.

**Descartado.** Un chequeo (`count`) antes de escribir: deja pasar a dos pedidos simultáneos. `Cache::lock`: D08 lo descartó. Mutar con `$user->update(['role' => …])`: `role` y `status` no son asignables en masa (FR-002 de C3a).

**La prueba de la carrera** corre en la suite `Concurrency` de B2 con `Parallel::run`: 20 veces, dos admins que se deshabilitan entre sí, y al final queda al menos uno activo (SC-005). Con el bloqueo, el segundo pedido recibe `LastAdmin`.

## R4. Invitaciones de admin

**Decisión.** `App\Admin\AdminInvitations` (no `Invitations::issue`):

- `invite(string $email, Role $role, int $adminId): InviteResult`, en su propia `WriteTransaction` por email: si hay cuenta, `UserExists`; si hay una invitación vigente, `Pending`; si hay una vencida, la renueva con el rol del pedido (`Renewed`); si no hay nada, la crea (`Created`). El UNIQUE de `email` resuelve la carrera entre dos admins: ante `UniqueConstraintViolationException` se vuelve a clasificar **una vez** (ahora hay una invitación vigente o una cuenta) y se devuelve ese resultado.
- `resend(Invitation $invitation): IssuedInvitation` rota `token_hash` y `expires_at` (según el rol) y deja `delivery = 'link'` y `sent_at` y `send_failed_at` en `NULL`; no cambia `invited_by`.
- `revoke(Invitation $invitation): void`.

**Por qué no `Invitations::issue`.** Esa entrada (C3a) renueva también una invitación vigente, sin una transacción y sin capturar la violación del UNIQUE: es lo que `taller:invite` necesita (FR-018 de C3a) y no lo que pide FR-038. `taller:invite` no cambia.

**El lote.** Entre 1 y 100 emails, cada uno canonicalizado con `Email::canonical`. Un email repetido ya canonicalizado es un error de validación (422 `errors.emails.N`): un resultado por email necesita emails distintos, y silenciar un repetido escondería un error de tipeo. La respuesta conserva el orden del pedido.

**La exigencia de `password.confirm`** depende del rol del cuerpo (crear) o de la invitación (reenviar): `RequirePassword::isConfirmed($request)`, que C3a dejó estática para esto, se llama en el controlador y no en un middleware de ruta.

**`resend` con `delivery`.** El cuerpo acepta `delivery` (`link` o `email`); sin él, rige el de la invitación. Pasar una invitación enviada por correo a link (FR-057 (a) de C3c) es `resend` con `delivery=link`, sin un endpoint más. En C3b, `email` responde 503 (R1).

**Descartado.** Responder 409 a un email repetido en el lote: es un error del pedido, no un conflicto con el estado. Un endpoint para «pasar a link»: `resend` ya rota el token.

## R5. `UserData`: el registro, la purga por lotes y la cobertura

**Decisión.**

- **El registro** es `App\Accounts\UserTables` (la lista) con `UserTable` (cada fila: la tabla, cómo es de la cuenta, qué hace la exportación y qué hace la supresión) y `UserData`, que lo expone. Las excepciones llevan su motivo. Declara las tablas de B2 y de D1a por nombre, existan o no ([data-model.md](./data-model.md), sección 2).
- **La purga por lotes** (`UserPurge::inBatches(int $userId)`) recorre las tablas declaradas como lote en el orden de D06, salta las que no existen (`Schema::hasTable`) y borra `batch_size` filas por sentencia con `ORDER BY` de su clave, cada sentencia en su propia transacción corta.
- **La exportación** (`UserExport`) la escribe otro dueño, con sus secciones (R6). El ADR llama `UserData` a «un módulo profundo con `export()` y `purge()`»; acá el registro es `UserData` y las dos operaciones son clases aparte, porque las escriben dueños distintos y sólo comparten el registro.
- **La cobertura** (`UserDataCoverageTest`): lee `information_schema` y exige que toda tabla con una columna `user_id`, y toda tabla con una clave foránea hacia una tabla que ya es de la cuenta (las hijas), figure en el registro o en las excepciones con su motivo, y que cada una tenga su exportación y su supresión declaradas. `UserExportCoverageTest` agrega que la sección declarada exista.
- **`PopulatedAccount`** (`tests/Support`) puebla una cuenta con una fila en **cada tabla declarada que exista**, y una prueba exige que no falte ninguna. Con eso, `DELETE FROM users` de una cuenta poblada (FR-054) y la exportación de la misma cuenta prueban todas las tablas que existen: un ítem que cree una tabla y no la agregue a `PopulatedAccount` rompe esa prueba.

**Por qué.** El orden de entrega con B2 y D1 deja de importar (FR-042): el que llega último suma sus filas, y una prueba lo exige. D1a declaró sus diez tablas ([data-model.md](./data-model.md) de D1a, sección 7) y B2 sus seis (su sección 8); C3b las toma de ahí.

**Lo que D1b suma.** `progress_imports` y `campaign_seals` no están declaradas: son de una spec sin planificar. Si D1b llega antes que C3b, el coordinador las suma; si llega después, su propia prueba de cobertura la obliga.

**Descartado.** Una lista fija escrita por C3b sin prueba de cobertura (la tabla nueva se escapa). Una clase `UserData` con las dos operaciones adentro y un solo dueño: obliga a serializar la exportación y la supresión, que no se tocan entre sí. Exportar con `SELECT *` de todas las tablas declaradas sin secciones: no sirve para la foto de D1a, que tiene su forma.

## R6. La exportación

**Decisión.**

- **`response()->streamJson`** (Laravel 13) con un arreglo cuyos valores de lista son generadores: `attempts` produce un intento por vez. Cabeceras: `Content-Type: application/json`, `Content-Disposition: attachment`, `Cache-Control: no-store` y `X-Accel-Buffering: no`, para que Nginx no acumule la respuesta en `/tmp/fastcgi_temp`, un tmpfs de 32 MB.
- **Secciones:** una interfaz `ExportSection` (`key()` y `read(int $userId)`) con tres implementaciones en C3b: `AccountSection`, `ExerciseProgressSection` (filas de `exercise_progress`, hasta D1a) y `AttemptsSection` (intentos con sus pruebas y su payload). D1a suma `ProgressSection` con su lector de la foto y retira `ExerciseProgressSection`; D1b suma `ImportsSection`.
- **Transacciones cortas.** Cada fragmento de `attempts` (`taller.export.chunk` = 100, paginado por clave) se lee dentro de **una** `DB::transaction` de sólo lectura que devuelve los arreglos y termina **antes** de que el generador los entregue: nunca hay una transacción abierta mientras se escribe en la respuesta, y los intentos de un fragmento, sus pruebas y sus payloads son consistentes entre sí.
- **Las filas** salen con todas sus columnas menos `user_id` (y `attempt_id` en las hijas), en camelCase; las columnas `DATETIME` (según `information_schema`) en ISO 8601 UTC con `Z`; el resto como están en la base.
- **El límite** es `RateLimiter::for('export')`, `Limit::perDay(3)` por usuario, y el 429 lo arma `ApiExceptions`.

**Por qué.** Una exportación grande ocupa un proceso de PHP-FPM mientras dura (riesgo 5 de la spec), así que lo importante es que no sostenga una transacción que frene un DDL (D33 y D35) ni que Nginx acumule el cuerpo. El límite de memoria del contenedor `php` es 256 MB: con 100 intentos por fragmento, el peor caso (payloads grandes) queda muy por debajo.

**D1a.** Su `ProgressSnapshotReader::areas(userId, null)` «no abre una transacción: corre dentro de la de quien llama» (su `data-model.md`, sección 5). La sección de D1a abre **su** transacción corta de sólo lectura (REPEATABLE READ) alrededor de la llamada, la cierra y recién entonces entrega.

**Descartado.** Armar el JSON entero en memoria y devolverlo con `response()->json`: una cuenta con decenas de miles de intentos agota la memoria. Una transacción para todo el archivo (foto atómica): el costo de D35. `response()->stream` con `echo` a mano: duplicaría lo que `streamJson` ya hace (comas, corchetes, escapes).

## R7. La supresión

**Decisión.**

- **El pedido** es `AccountDeletion::request(int $targetId): User`: `AccountChanges::beginDeletion` (transacción corta: guardia, `status = 'deleting'`, `AccountSessions::endAll`, borrar las invitaciones que creó y las de su email, y su token de recuperación) y, **después** del COMMIT, el evento `AccountRestricted(…, Deleting)` y `PurgeUserData::dispatch($id)`. El controlador termina la sesión de este pedido (`invalidate`): el siguiente es 401.
- **`PurgeUserData`** implementa `ShouldQueue` y `ShouldBeUnique` (`uniqueId` es el id de la cuenta), con los atributos de colas de Laravel 13 `#[Tries(8)]`, `#[Timeout(300)]`, `#[Backoff(60, 300, 900, 1800, 3600)]` y `#[UniqueFor(900)]`. Lleva **sólo el id**: sin email ni cifrado (el aviso de cuenta borrada es de C3c, que suma esos datos y el cifrado).
- **El trabajo**, en cada intento: (1) si la fila de `users` ya no existe, termina; si no está en `deleting`, lo registra y termina; (2) cancela las ejecuciones activas con `ActiveRuns::cancelAllOf` de B2, **de mejor esfuerzo**: si falla, registra `purge.cancel_failed` y sigue, porque B2 tolera un cierre sobre una cuenta que ya no existe (`AccountGone`) y la purga borra `runs` igual; (3) `UserPurge::inBatches`; (4) la transacción final con `AccountLock::within`, que toma la cabecera `FOR UPDATE`, vuelve a leer la cuenta (`status = 'deleting'`, `FOR UPDATE`), inserta la fila del libro (`insertOrIgnore`, con el `created_at` de la cuenta) y la borra: la cascada se lleva el resto. Si la inserción de la cabecera falla por la clave foránea (`AccountGone`), la cuenta ya no existe y el trabajo termina bien.
- **El barrido** (`taller:resume-purges`) mide «trabada» por `users.updated_at`: ningún otro camino escribe una cuenta en `deleting` (el ingreso no escribe `users`, y `PATCH` la rechaza). Una prueba lo fija. Vuelve a pedir `PurgeUserData`; si el trabajo sigue en la cola o corriendo, la unicidad lo descarta.

**Por qué.**

- Idempotencia y reanudación: cada lote es una sentencia que se repite sin daño, y el final es una transacción que no hace nada si la cuenta ya no está.
- Atributos y no propiedades: el proyecto ya usa los atributos de Laravel 13 (`#[Fillable]` y `#[Hidden]` en `User`), y la documentación de 13.x los muestra como la forma actual.
- Sin email en el trabajo: cada dato personal que sale de `users` es una superficie más, y el aviso es de C3c.

**El tiempo de espera.** El `Timeout` de 300 s tiene que ser menor que `retry_after` de la conexión `database`, que vale 90 s por omisión: si no, el trabajo volvería a estar disponible mientras corre. T002 sube `retry_after` a 330 s (la conexión `runs` de B2 conserva sus 140 s). Una purga normal dura segundos; si una cuenta enorme tarda más, el `Timeout` corta el intento y el siguiente sigue donde quedó el anterior, porque cada lote es una sentencia que se repite sin daño.

**Descartado.** `ShouldBeUniqueUntilProcessing`: un reintento programado quedaría sin candado. Cancelar las ejecuciones **de forma estricta** (reintentar hasta lograrlo): una falla persistente del ejecutor bloquearía la supresión de una persona que pidió su baja (Ley 25.326, art. 16). Un `deleting_since` en `users`: una columna más sin consumidor propio.

## R8. El libro y su restauración

**Decisión.**

- `DeletedAccount` (modelo del libro) con `Prunable` y `taller.ledger_days` = 35.
- **`taller:reapply-deletions {archivo}`** acepta una ruta o `-` (la entrada estándar): `php` corre con el disco de sólo lectura y el libro vive junto a los respaldos, fuera del contenedor. El formato es TSV de tres columnas, que produce `mysql --batch --skip-column-names` ([contracts/console.md](./contracts/console.md)). **Valida el archivo entero antes de tocar nada** (código 2 con los números de línea).
- Por cada fila, **primero** inserta la fila del libro con sus valores originales (`insertOrIgnore`) y **después**, si hay una cuenta con ese id y ese `created_at`, la suprime y corre `PurgeUserData` en el momento (`dispatchSync`). Así el libro de la base restaurada queda completo: si sólo conservara las filas anteriores al volcado, la restauración siguiente no podría reaplicar las supresiones posteriores.
- **La comparación de `created_at`** es entre `DATETIME(3)`: el archivo trae milisegundos (o ninguno, y entonces `.000`).

**Por qué.** El comando es el único consumidor del libro (D37), y C4 lo orquesta: el formato tiene que ser trivial de producir con las herramientas del contenedor de respaldo (`mysql:9.7`) y trivial de leer sin analizar SQL. JSON obligaría a armarlo con `JSON_OBJECT`; un volcado SQL, a interpretarlo.

**Descartado.** Leer el archivo de un volumen montado en `php`: abre una escritura o una lectura que el contenedor endurecido no tiene. Aplicar sólo las filas que coinciden y no completar el libro: el libro pierde las supresiones posteriores al volcado en cuanto se restaura.

## R9. El `scheduler`

**Decisión.** Cuatro tareas nuevas en `routes/console.php`, todas sin solaparse:

- `Schedule::command('queue:work database --queue=default --stop-when-empty --max-time=50')->everyMinute()->withoutOverlapping(10)`. La documentación de 13.x dice que el bloqueo vence a las 24 horas por omisión: si el contenedor se reinicia a mitad de una corrida, la cola quedaría detenida un día; con 10 minutos, se retoma sola. `--max-time=50` hace que la corrida de un minuto termine antes de la siguiente.
- `queue:prune-failed --hours=168`, diaria.
- `model:prune --model=App\Models\DeletedAccount`, diaria (C3a ya agenda la de `Invitation`).
- `taller:resume-purges`, cada 5 minutos.

**`--queue=default` explícito.** B2 comparte la tabla `jobs` con la cola `runs`, que atiende `worker-runs` con su propio tiempo de espera (140 s): si el `scheduler` también la procesara, reclamaría ejecuciones con otro `retry_after`. Una prueba exige `--queue=default` y ningún `runs`.

**Por qué tareas en el mismo `schedule:work`.** El ADR (D34) dice que el `scheduler` procesa `default`; un worker propio entra con el disparador de §9. `schedule:work` arranca un `schedule:run` por minuto sin esperar al anterior, así que una corrida larga de `queue:work` no frena a las demás tareas: sólo se salta a sí misma (`withoutOverlapping`).

**Descartado.** `runInBackground`: no hace falta, y duplica procesos en un contenedor con `pids_limit: 64`. Un servicio nuevo `worker-default`: el disparador de §9 no se cumplió.

## R10. Formas y mensajes

- **`AdminUser`** y **`AdminInvitation`** son los de [contracts/http.md](./contracts/http.md): `PublishedAdminUser::from(User)` y `PublishedInvitation::from(Invitation, ?User)` arman un arreglo de claves fijas (como `PublishedUser` de C3a), de modo que ningún campo nuevo de `users` salga sin que alguien lo agregue a mano.
- **La página:** `PageMeta` arma `{page, perPage, total, lastPage}` en camelCase desde un `LengthAwarePaginator`, porque `paginate()` emite snake_case (ADR §8). Es una pieza del coordinador (T002), porque la usan a la vez el listado de usuarios y el de invitaciones.
- **`q`:** `LIKE %q%` con `%` y `_` escapados, contra `name` (colación `utf8mb4_es_0900_ai_ci`, que no distingue acentos) y `email` (`utf8mb4_0900_as_ci`, que sí los distingue, como en C3a).
- **Los 422** de la administración salen con su clave en `errors` y su mensaje en `lang/es/admin.php` (usuarios) y `lang/es/invitations.php` (invitaciones).

## R11. La prueba de esquema de C3a y las hijas de taller

`UserIdForeignKeyTest` (C3a) exige en su primera prueba que **toda** columna `user_id` sea una clave foránea en cascada hacia `users(id)`. El comentario de su constante (`REFERENCE_USERS_WITHOUT_USER_ID`) y FR-004 dan a entender que `account_deletions` está exceptuada, pero la constante sólo alimenta la **segunda** prueba (tablas que referencian a `users` sin `user_id`): `account_deletions` tiene `user_id` y no tiene clave foránea, así que la primera prueba fallaría en cuanto exista.

**Decisión.** La prueba suma una lista aparte, `USER_ID_WITHOUT_USERS_FOREIGN_KEY`, con su motivo por tabla:

| Tabla | Motivo |
| --- | --- |
| `account_deletions` | El libro: la cuenta ya no existe y no tiene datos personales (FR-047) |
| `workshop_observations`, `workshop_step_marks` | Hijas de taller de D1a: su `user_id` forma parte de la clave compuesta en cascada hacia `workshop_progress` (D06: «las hijas de taller llegan por `workshop_progress`»), no de una clave directa a `users` |

Para esas dos, la prueba exige además que exista una clave foránea compuesta en cascada hacia su tabla padre. D1a afirma que su `K` deja la prueba en verde, pero su DDL no declara una clave directa de `workshop_observations` ni de `workshop_step_marks` hacia `users`: el hallazgo es para D1 (ver el informe de esta planificación).

## R12. Nivel 9 de PHPStan, sin baseline

Los modismos del nivel 9 son los de C3a (R18 de su investigación): accesores tipados de la configuración (`config()->integer(...)`) y del pedido (`$request->integer(...)`), sin `@phpstan-ignore` ni baseline, y las listas tipadas armadas con `foreach`. Dos puntos propios de C3b:

- `DB::select` devuelve `array<int, stdClass>` y `DB::scalar`, `mixed`: la guardia y el barrido leen con `->pluck()` sobre una `Collection` o con accesores tipados, y no con un cast de `mixed`.
- Los atributos de colas (`#[Tries]`, `#[Backoff]`…) son de `Illuminate\Queue\Attributes`. Sus firmas se leyeron en la rama `13.x` (`Backoff(array|int ...$backoff)`, `UniqueFor(int $uniqueFor)`); si el nivel 9 se queja de alguno, se corrige la referencia, no el nivel.

## R13. Cómo se prueba

- **Drivers reales.** Las pruebas que dependen de la sesión, de los límites o de la confirmación llaman a `Browser::useDatabaseDrivers()` (FR-047 de C3a).
- **Suites.** `Feature` (`RefreshDatabase`) para casi todo; `Content` (`DatabaseTruncation`) para lo que necesita su propia transacción: la prueba de que la exportación no deja una transacción abierta (`DB::transactionLevel()` es 0 en cada fragmento) y las de DDL; `Concurrency` (B2) para las carreras con procesos paralelos (`Tests\Support\Parallel`).
- **Colas y eventos.** `Queue::fake()` y `Event::fake()` para decir **qué** se encola y qué evento se dispara; la purga se prueba ejecutando `PurgeUserData` en el momento. La unicidad usa el almacén `array` de las pruebas.
- **Relojes.** `Carbon::setTestNow()` y `travel()` para el barrido (15 minutos), el libro (35 días) y las invitaciones vencidas.
- **El esperado sale de afuera.** Los códigos y los mensajes, de `contracts/http.md`; los límites, del ADR y de la spec; el orden de las respuestas, de este plan; el esquema, del ADR §5.2 y no de la migración.
- **Una trampa del plan:** `Event::fake()` sin argumentos apaga todos los eventos, también los de Eloquent; las pruebas fijan `Event::fake([AccountRestricted::class])`.

## R14. Archivos que C3b comparte con otros ítems

- **`bootstrap/app.php`:** C3b suma el grupo `admin`, el alias `account.admin` y sus cuatro archivos de rutas. B2 y D1a suman los suyos; los integra el coordinador.
- **`routes/console.php`, `config/queue.php`, `config/taller.php`, `ApiCode`, `lang/es/api.php` y `Limiters`:** los mismos archivos que tocan B2, D1a y C3c. C3b los integra de una vez al principio (T002 y T022), y cada ítem agrega sus líneas.
- **`docker/compose.yaml`, `docker/mysql/db-grants.sql` y `backend/api/scripts/init-env.sh`:** C3b **no** los toca (eso es de C3c).
- **`UserTables`, `PopulatedAccount` y `UserExport`:** los edita el que llegue último con tablas de alumno (D1a y D1b); la prueba de cobertura se lo exige.
- **Migraciones:** `2026_10_05_400001` a `400099`. D1a reserva `2026_10_06_100001` a `100099`. Se propone `2026_10_05_500001` a `500099` para C3c.
