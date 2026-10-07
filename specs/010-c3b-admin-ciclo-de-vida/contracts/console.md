# Contrato de consola y operación de C3b

**Input**: [spec.md](../spec.md) (FR-040, FR-046 a FR-048 y FR-050), ADR 0006 §7, D06, D30, D34 y D37 ([ADR 0006](../../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)), el contrato de consola de C3a (`specs/004-c3-identidad-acceso/contracts/console.md`, rama `feat/c3a-identidad`) y [research.md](../research.md). Lo usa quien opera y despliega el taller. Los mensajes al operador van en español; el código y las pruebas, en inglés.

C3b no suma servicios de Compose, variables de entorno, secretos ni privilegios de MySQL: el `scheduler` de C3a ya corre `schedule:work`, y el usuario `taller` ya puede lo que la purga necesita. Suma dos comandos, tareas programadas y registros.

## Comandos de Artisan

Se corren con `docker compose exec php php artisan <comando>`.

### `taller:reapply-deletions {archivo}`

Reaplica el libro de supresiones sobre una base restaurada, para que las cuentas borradas desde ese volcado no reaparezcan (D37). Se corre **después de restaurar el volcado y el binlog y antes de abrir el tráfico**.

`archivo` es una ruta que el contenedor lea o `-`, la entrada estándar. `php` corre con el disco de sólo lectura, así que lo normal es no montar nada:

```sh
docker compose exec -T php php artisan taller:reapply-deletions - < libro.tsv
```

**El formato del archivo** es el contrato con el respaldo de C4: texto UTF-8, **una fila por línea y tres columnas separadas por tabulador** (`user_id`, `user_created_at` y `deleted_at`), con los instantes en UTC como `AAAA-MM-DD HH:MM:SS` y, opcionalmente, de uno a seis decimales. Se admite una primera línea de encabezado (la que empieza con `user_id`) y se ignoran las líneas vacías. Lo produce el cliente de MySQL:

```sh
mysql --batch --raw --skip-column-names taller \
  -e 'SELECT user_id, user_created_at, deleted_at FROM account_deletions ORDER BY user_id'
```

Lo que hace, fila por fila y en el orden de `user_id`:

| Caso | Resultado |
| --- | --- |
| Hay una cuenta con ese `user_id` y su `created_at` es el `user_created_at` de la fila | La suprime por el mismo camino que `DELETE /api/me` (sin la guardia del último admin: la supresión ya había pasado esa regla) y corre la purga **en el momento**, no por la cola |
| Hay una cuenta con ese `user_id` pero otro `created_at` | Es una cuenta nueva que recibió un id reutilizado: **no la toca** y lo dice |
| No hay cuenta con ese `user_id` | Nada que borrar |
| Siempre | Si la fila no está en `account_deletions`, la agrega con sus valores originales (`insertOrIgnore`, antes de purgar), para que el libro de la base restaurada quede completo |
| Una purga que terminó sin borrar la cuenta | No la cuenta como borrada y lo dice («la purga terminó sin borrarla») |
| Al terminar el archivo | Sube el `AUTO_INCREMENT` de `users` por encima del mayor id de `users` y del mayor `user_id` del libro, ya completo (nunca lo baja; también con un archivo vacío), y dice «El próximo id de cuenta será N.». MySQL 8 conserva el contador al reiniciar, así que una restauración es la única forma de reusar un id: sin esto, una cuenta nueva podía recibir el id de una suprimida, su supresión no entraba al libro (que tiene una fila por id) y una restauración posterior la traía de vuelta. Decisión del usuario del 2026-10-06 |

| Resultado | Código de salida |
| --- | --- |
| Terminó. Dice cuántas cuentas borró, cuántos ids reutilizados salteó y cuántas filas agregó al libro | 0 |
| No pudo leer el archivo, o purgó todas menos alguna: dice cuáles | 1 |
| El archivo tiene una línea mal formada: dice el número de cada una y **no procesa nada** | 2 |

- **Es idempotente:** una segunda corrida con el mismo archivo no encuentra cuentas que coincidan, no agrega filas y deja el contador donde estaba.
- Si al terminar no queda ningún admin activo, lo avisa con el comando que lo arregla (`taller:invite {email} --role=admin`); no falla.
- La salida no lleva emails: sólo ids.

### `taller:resume-purges`

El barrido de las supresiones trabadas (FR-046): vuelve a pedir `PurgeUserData` de cada cuenta que lleva **más de 15 minutos** en `deleting` (el corte es `users.updated_at`: nada más escribe una cuenta en ese estado) y deja una línea `purge.resumed` por cada purga que despachó. Lo agenda el `scheduler` cada 5 minutos; también se puede correr a mano. Si el trabajo de esa cuenta sigue en la cola o corriendo, el pedido no hace nada (la purga es única por cuenta) y no se cuenta como retomada. Siempre sale con 0 y dice las dos cosas: «N purgas retomadas, M ya en la cola».

## Tareas programadas

Las registra `routes/console.php` y las corre el servicio `scheduler` (`php artisan schedule:work`). C3b suma estas cuatro a las cuatro de C3a:

| Qué | Cada cuánto | Comando | Sin solaparse |
| --- | --- | --- | --- |
| Procesar la cola `default` | Cada minuto | `queue:work database --queue=default --stop-when-empty --max-time=50` | Sí, con un bloqueo que vence a los 10 minutos |
| Fallos de la cola vencidos (7 días) | Una vez al día | `queue:prune-failed --hours=168` | Sí |
| Libro de supresiones vencido (35 días) | Una vez al día | `model:prune --model=App\Models\DeletedAccount` | Sí |
| Supresiones trabadas | Cada 5 minutos | `taller:resume-purges` | Sí |

- **La salida de cada tarea** va al stderr del proceso principal del contenedor (`appendOutputTo('/proc/1/fd/2')`), así sus registros llegan a `docker compose logs scheduler`. Laravel la manda a `/dev/null` por omisión, y con ella los registros de la purga y del barrido; una prueba lo exige para cada tarea.
- **Sólo la cola `default`.** B2 comparte la tabla `jobs` con la cola `runs`, que atiende `worker-runs`: el `scheduler` no la toca, y una prueba exige `--queue=default` en el comando.
- El bloqueo de `queue:work` vence a los 10 minutos y no a las 24 horas por omisión: si el contenedor se reinicia a mitad de una corrida, la cola vuelve a procesarse al cabo de 10 minutos como mucho.
- Una purga larga ocupa la corrida de ese minuto; lo que se encole en `default` espera a la siguiente. Es el riesgo 6 de la spec: lotes de 500 filas y el disparador de §9 del ADR para un worker propio.

## El trabajo `PurgeUserData`

Corre en la cola `default`, único por cuenta. Cada intento: cancela las ejecuciones activas de la cuenta (B2), borra por lotes `runs`, `exercise_progress`, `attempts` y `sync_operations`, y en una transacción final toma `progress_heads`, borra la fila de `users` (la cascada se lleva el resto) e inserta la fila del libro. Reintenta con espera creciente: 1, 5, 15, 30 y 60 minutos, hasta 8 intentos, con un tiempo máximo de 300 segundos por intento (la conexión `database` de la cola tiene `retry_after` de 330). Si los agota, queda en `failed_jobs` y la cuenta sigue en `deleting`: el barrido la vuelve a pedir a los 15 minutos. El candado de unicidad dura 5 horas, lo que cubre los ocho intentos con su espera: mientras el trabajo está en la cola esperando su siguiente intento, el barrido no lo duplica. Se libera al terminar o al agotar los intentos; si el trabajo se pierde sin liberarlo (por ejemplo, alguien vacía la tabla `jobs`), el barrido espera a que el candado venza.

## Registros

Estructurados, a stderr, con el `user_id` del actor, el HMAC del email del actor, la IP y el id del pedido que C3a ya agrega (FR-045 de C3a). **Nunca** un email, un nombre, un token ni un link.

| Evento | Cuándo | Campos propios |
| --- | --- | --- |
| `admin.invitation` | Por cada email de `POST /api/admin/invitations` | `result`, `role`, `delivery`, `email_hmac` |
| `admin.invitation_resent` | Reenvío | `invitation_id`, `role` |
| `admin.invitation_revoked` | Revocación | `invitation_id` |
| `admin.account_changed` | `PATCH` que cambió algo | `target_id`, `from` y `to` del rol y del estado |
| `admin.password_reset_refused` | `password-reset` que terminó en 503 | `target_id`, `reason` |
| `account.deletion_requested` | `DELETE /api/me` y `DELETE /api/admin/users/{user}` | `target_id` |
| `account.exported` | `POST /api/me/export` que empezó a responder | |
| `purge.resumed` | El barrido despachó una purga (no las que ya estaban en la cola) | `user_id` |
| `purge.skipped` | La transacción final encontró la cuenta fuera de `deleting` y no la borró | `user_id`, `status` |
| `purge.cancel_failed` | La cancelación de ejecuciones falló (la purga sigue) | `user_id`, `exception` |
| `purge.done` | La transacción final confirmó | `user_id`, `rows` |
| `purge.failed` | El trabajo agotó sus intentos | `user_id`, `exception` |
| `ledger.reapplied` y `ledger.skipped` | `taller:reapply-deletions` | `user_id`, `reason` en `skipped` |

## Variables y configuración

Ninguna variable de entorno ni secreto nuevo. Las claves nuevas de `config/taller.php` tienen su valor fijo y las prueban los tests:

| Clave | Valor | Para qué |
| --- | --- | --- |
| `taller.ledger_days` | `35` | Cuánto vive una fila del libro |
| `taller.purge.batch_size` | `500` | Filas por sentencia de borrado en la purga |
| `taller.purge.stuck_minutes` | `15` | A partir de cuándo el barrido retoma una cuenta en `deleting` |
| `taller.export.chunk` | `100` | Intentos por fragmento de la exportación |

## Acciones que quedan para el operador

1. Nada al desplegar: `deploy.sh` ya levanta el `scheduler`, y C3b no agrega servicios.
2. Cambiar el rol o el estado de una cuenta, dar de alta y suprimir cuentas se hace por la API (las pantallas de F12) o, mientras no existan, con `curl` y la contraseña reconfirmada. `tinker` deja de hacer falta. El primer admin y el acceso de emergencia siguen siendo `taller:invite --role=admin` y `taller:password-reset-link`.
3. Guardar la copia del libro (`account_deletions`) junto a cada respaldo, en el formato de arriba.
4. Al restaurar: volcado, binlog, `taller:reapply-deletions` con la copia más reciente del libro y recién entonces abrir el tráfico.
5. Si una supresión no termina, mirar `purge.resumed`, `purge.skipped` y `purge.failed` en los registros (`docker compose logs scheduler`) y `failed_jobs`.
