# Contrato de consola y operación de C3a

**Input**: [spec.md](../spec.md) (FR-018, FR-025, FR-039 a FR-046), ADR 0006 §4.1, §4.3, §7 y D34 a D36, y [research.md](../research.md). Lo usa quien opera y despliega el taller. Los mensajes al operador van en español; el código y las pruebas, en inglés.

## Comandos de Artisan

Se corren con `docker compose exec php php artisan <comando>`. Ninguna contraseña pasa por la consola, y los links salen sólo por la salida estándar: nunca a los registros.

### `taller:invite {email} {--role=student}`

Crea o renueva la invitación de un email y imprime su link. Es el único camino para dar de alta a la primera cuenta (con `--role=admin`) y a cada alumno hasta que C3b traiga la administración.

| Caso | Resultado | Código de salida |
| --- | --- | --- |
| Email sin cuenta ni invitación | Crea la invitación (`delivery = link`, `invited_by = NULL`) e imprime el link | 0 |
| Email con una invitación vigente o vencida | La renueva: rota el token, el rol y el vencimiento; el link anterior deja de valer. Imprime el link nuevo | 0 |
| Email que ya tiene una cuenta | No crea nada; dice que la cuenta ya existe | 1 |
| `--role` que no es `admin` ni `student`, o un email inválido | Dice cuál es el valor válido | 2 |

- El email se canonicaliza (sin espacios, en NFC y en minúsculas) y se compara sin distinguir mayúsculas pero sí acentos.
- El vencimiento es de 7 días para `student` y de 48 horas para `admin`, desde que se crea o se renueva.
- El link es `<APP_URL>/#invitacion=<token>`, armado desde `config('app.url')` y nunca desde `Host`. El token tiene 43 caracteres. La base guarda sólo su sha256.
- La salida dice a quién se invitó, con qué rol y cuándo vence (en UTC), seguida del link en su propia línea.

### `taller:password-reset-link {email}`

Imprime un link de recuperación para una cuenta existente. No envía nada. Es el único camino de recuperación de un admin y cubre a un alumno hasta C3b.

| Caso | Resultado | Código de salida |
| --- | --- | --- |
| Cuenta `active` | Imprime `<APP_URL>/#restablecer=<token>&email=<email>` (el email, codificado para URL), válido 60 minutos | 0 |
| Se emitió otro hace menos de 60 segundos | No emite; dice cuántos segundos faltan | 1 |
| Email sin cuenta | Dice que no hay una cuenta con ese email | 1 |
| Cuenta `disabled` o `deleting` | Se niega: una cuenta que no entra no recibe un token | 1 |

### `taller:check-transactions {--seconds=}`

El chequeo previo de D35: aborta el despliegue si hay transacciones abiertas hace más de `--seconds` (por omisión `config('taller.long_transaction_seconds')`, 30). Lo corre `docker/migrate.sh` una vez, antes de migrar y fuera de su ciclo de reintentos.

| Caso | Resultado | Código de salida |
| --- | --- | --- |
| Ninguna transacción abierta más de 30 s | Dice que no hay | 0 |
| Hay transacciones abiertas | Dice cuántas y desde hace cuánto; pide esperar o cortar la sesión | 1 |
| No puede comprobarlo (falta el privilegio, la instrumentación está apagada o no se ve a sí mismo) | Falla cerrado; si falta el privilegio, el mensaje trae el comando que lo aplica: `docker compose --profile ops run --rm db-grants` | 2 |

La consulta lee `performance_schema.events_transactions_current` con el privilegio mínimo (`SELECT` sobre esa tabla), toma las filas con `STATE = 'ACTIVE'` cuyo `TIMER_WAIT` (picosegundos) supera el umbral, y deja afuera a su propio hilo (`PS_CURRENT_THREAD_ID()`). Antes de consultar, abre su propia transacción y exige verse a sí misma como `ACTIVE`: si no se ve, no puede ver a nadie y falla cerrada.

### `taller:prune-sessions` y `taller:prune-cache`

Podan por lotes, fuera de los pedidos, y los agenda el `scheduler`.

| Comando | Qué borra |
| --- | --- |
| `taller:prune-sessions` | `DELETE FROM sessions WHERE last_activity <= ? ORDER BY last_activity LIMIT 1000`, en bucle hasta que no quede una fila vencida. El corte es `ahora − SESSION_LIFETIME` minutos |
| `taller:prune-cache` | Lo mismo con `cache` y con `cache_locks` por `expiration <= ahora`, de a 1000 |

## Tareas programadas

Las registra `routes/console.php` y las corre el servicio `scheduler` (`php artisan schedule:work`). Todas con `withoutOverlapping()`, que usa `cache_locks`.

| Qué | Cada cuánto | Comando |
| --- | --- | --- |
| Sesiones vencidas | 15 minutos | `taller:prune-sessions` |
| Tokens de recuperación vencidos | 15 minutos | `auth:clear-resets` |
| Caché y locks vencidos, incluida la de cuerpos del contenido | 15 minutos | `taller:prune-cache` |
| Invitaciones vencidas hace más de 30 días | Una vez al día | `model:prune --model="App\Models\Invitation"` |

El sorteo de limpieza de sesiones de Laravel queda en 0 (`'lottery' => [0, 100]`): ningún pedido corre un `DELETE` sin `LIMIT`. El `scheduler` no procesa la cola `default`: todavía no hay trabajos que encolar (lo suma C3b).

## Servicios de Compose

| Servicio | Perfil | Qué hace |
| --- | --- | --- |
| `scheduler` | (siempre) | La imagen de `php` con `php artisan schedule:work`. Espera a `mysql` sano y a `migrate` terminado, en la red `app`. `restart: unless-stopped` |
| `db-grants` | `ops` | La imagen `mysql:9.7` ya fijada, con la red `app`: aplica con `root` el SQL idempotente `docker/mysql/db-grants.sql`. Se corre una vez en un volumen que ya existe, con `docker compose --profile ops run --rm db-grants` |

`docker/mysql/db-grants.sql` es el **único archivo de usuarios y privilegios de MySQL**: versionado, idempotente (`CREATE USER IF NOT EXISTS` y `GRANT` se pueden repetir), y el único que corre con `root`, a través de `db-grants` y del script de inicialización de un volumen nuevo. C3a lo empieza con una sentencia, para el usuario `taller` que usan `php`, `migrate` y `scheduler`:

```sql
GRANT SELECT ON performance_schema.events_transactions_current TO 'taller'@'%';
```

El servicio `mysql` monta el mismo archivo en `/docker-entrypoint-initdb.d/10-db-grants.sql`, así que un volumen nuevo lo aplica solo. `deploy.sh` suma `scheduler` a los servicios que levanta.

**Forma que C4 extiende (supuesto de forma, no de contenido).** La spec de C4 todavía no tiene clarify: C4 suma al mismo archivo sus usuarios por rol (propone `app`, `runs`, `mail`, `migrate` y `backup`), cada uno con sus privilegios mínimos, y `root` queda sólo para `db-grants`. C3a no los crea ni los nombra: deja el archivo y los dos caminos que lo aplican (el servicio y el volumen nuevo) listos para recibirlos sin cambiarlos. Los secretos de esos usuarios se agregarán a `init-env.sh` con el patrón de abajo.

## Cierre del reenvío DNS

Todo servicio de una red `internal` (`php`, `migrate`, `scheduler`, `mysql`, `db-grants`, `taller`, `mysql-test` y `test`) lleva `dns: ['127.0.0.1']`: el DNS embebido de Docker sigue resolviendo los nombres de servicios (`mysql`, `php`), y un nombre que no conoce se reenvía al loopback del propio contenedor, donde nadie escucha, y falla al instante. Es la forma que ya se midió en Docker 29.8.2 para el servicio `taller`: con `dns: ['127.0.0.1']` el `ExtServers` de `/etc/resolv.conf` queda `[127.0.0.1]`; sin la opción, `[host(127.0.0.53)]`, el resolver del host.

## Variables y secretos nuevos

| Variable | Dónde | Valor |
| --- | --- | --- |
| `LOG_HMAC_KEY` | `.env` de la raíz, con `sh backend/api/scripts/init-env.sh`, y el ancla `x-laravel-env` | 32 bytes aleatorios en base64. Es la clave del HMAC del email en los registros. No se rota sin avisar: cambia todos los HMAC |
| `APP_LOCALE` | `x-laravel-env` | `es` |
| `SESSION_LIFETIME` | `x-laravel-env` y `config/session.php` | `30` |
| `SESSION_ENCRYPT` | `config/session.php` | Verdadero por omisión |
| `LOG_STDERR_FORMATTER` | `x-laravel-env` | `Monolog\Formatter\JsonFormatter` |
| `PRIVACY_VERSION` | `x-laravel-env` (opcional) | La versión vigente del aviso; por omisión un valor de desarrollo. El despliegue público exige el real |
| `LONG_TRANSACTION_SECONDS` | Opcional | `30` |
| `PASSWORD_BLOCKLIST_PATH`, `SESSION_MAX_HOURS` | Opcionales | Por omisión, la lista de `resources/passwords/` y `8` |
| `DEVICE_COOKIE_NAME` y `DEVICE_COOKIE_SECURE` | Opcionales | Por omisión `taller-device` y sin `Secure`. Con TLS (C4): `__Host-taller-device` y verdadero. Un nombre con ese prefijo sin `Secure` hace fallar a `DeviceCookie` al crearse: el navegador descartaría la cookie sin avisar |

El ancla `x-laravel-test-env` fija `LOG_HMAC_KEY` a un valor de prueba, como ya hace con `APP_KEY` y con la contraseña de la base.

**`init-env.sh`: un solo dueño de su estructura.** C3a es el dueño. El patrón es una función `add_missing NOMBRE VALOR` por variable, con el valor generado por `openssl` y sin pisar nunca uno que el `.env` ya tenga, porque MySQL toma sus contraseñas sólo al crear el volumen. C3a suma una línea, `LOG_HMAC_KEY`. C3b y C4 sólo suman líneas `add_missing` con el mismo patrón (los secretos del correo o los de los usuarios de MySQL por rol); no cambian la estructura del script.

## Acciones que quedan para el operador

1. En un volumen de MySQL que ya existe: `docker compose --profile ops run --rm db-grants`, una vez. Hasta entonces `migrate` falla cerrado con el mensaje de arriba.
2. `sh backend/api/scripts/init-env.sh`, para que agregue `LOG_HMAC_KEY` a un `.env` que ya existe.
3. Dar de alta: `docker compose exec php php artisan taller:invite ana@example.com`, y para el primer admin, con `--role=admin`.
4. Cambiar el rol o el estado de una cuenta, mientras C3b no traiga el camino soportado, con `docker compose exec php php artisan tinker`. Queda documentado en `backend/api/AGENTS.md`.
