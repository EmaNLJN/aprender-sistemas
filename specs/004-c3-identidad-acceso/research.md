# Research: C3a · Identidad y acceso: autenticación

**Input**: [spec.md](./spec.md) con su clarify del 2026-10-05, ADR 0006 y el código de `backend/api/` en `master` más el de C6. Cada decisión dice qué se eligió, por qué y qué se descartó. Las que la spec no fija y el plan completó están en la primera tabla, para que el coordinador las vea juntas.

Las referencias «R1» a «R23» de este archivo son sus propias secciones. Los requisitos del ADR 0006 se citan como «R3 del ADR», y las decisiones, como D16 o D35.

## Cómo se verificó

- **Qué se leyó.** El código de `backend/api/` de esta rama (`bootstrap/app.php`, `config/`, migraciones, tests, scripts, `docker/`); el de C6, de la rama `feat/c6-registros-tipados` (`afd00ac`) con `git show`, porque esta rama sólo tiene `master` en `0df5b07` y no trae el PR #17; y el ADR 0006 completo en lo que toca a C3a.
- **Laravel 13.x**, de la documentación oficial (`laravel.com/docs/13.x`: autenticación y CSRF) y del código fuente de la rama `13.x` (`ApplicationBuilder`, `Middleware`, `PreventRequestForgery`, `Authenticate`, `Handler`, `SessionGuard`, `StartSession`, `AuthenticateSession`, `DatabaseStore`, `DatabaseLock`, `DatabaseTokenRepository` y `Timebox`), con `WebFetch` el 2026-10-05. Context7 no ofrecía sus herramientas en esta sesión. El `composer.lock` fija `laravel/framework` v13.34.0.
- **MySQL**, del manual (`events_transactions_current` y las tablas de transacciones). El manual consultado es el de la serie 9.0; la prueba del criterio J lo confirma contra `mysql:9.7`.
- **No se ejecutó nada.** El host no tiene PHP ni Composer, y la tarea excluía Docker y las descargas. Ningún código del plan corrió: lo que figura como firma, SQL o configuración es referencia. Lo que quedó sin verificar está en la sección «Lo que quedó sin verificar» del [plan](./plan.md).

## Decisiones del plan que la spec no fija

| # | Decisión | Dónde |
| --- | --- | --- |
| 1 | `GET /api/session` con una sesión inválida responde 200 con `user: null` (nunca 401 ni 403) y descarta la sesión | R3 |
| 2 | El 403 `account_disabled` de una sesión viva sale en las rutas del grupo `account` | R3 |
| 3 | El máximo de 8 horas no rige para un pedido que lleva la cookie de recuerdo | R4 |
| 4 | La lista de bloqueadas se compara sin distinguir mayúsculas; el nombre y el email se rechazan si la contraseña los contiene | R5 |
| 5 | Cambiar la contraseña y cerrar las otras sesiones prueban la contraseña igual que confirmarla: 5 por minuto por usuario y suman al bloqueo | R6 |
| 6 | Un fallo desde un dispositivo conocido suma al contador del dispositivo, no al de la cuenta | R6 |
| 7 | El contador de fallos vive 24 horas desde el último fallo (30 días si llegó a 100) | R6 |
| 8 | `taller:password-reset-link` y `reset-password` sólo valen para cuentas `active` | R9 |
| 9 | Los demás 4xx del framework salen como `bad_request` | R10 |
| 10 | Los valores de las zonas de Nginx (50 pedidos por segundo con ráfaga de 400, y 5 con ráfaga de 60 para la sesión) | R14 |
| 11 | La cookie de dispositivo guarda `{uid, did}` | R6 |
| 12 | Un `X-Request-Id` por pedido, el de Nginx si llegó | R15 |
| 13 | `AuthenticateSession` corre dentro de `DropInvalidSession`, no suelto en el grupo `api` como dice D16 | R3 |
| 14 | El nombre y los atributos de la cookie de dispositivo salen de la configuración, compatibles con el prefijo `__Host-`, para que C4 los endurezca sin tocar código | R6 |
| 15 | `docker/mysql/db-grants.sql` es el único archivo de usuarios y privilegios, con la forma que C4 extiende | R12 |
| 16 | `trustProxies` queda vacío, y una prueba lo exige y comprueba que `X-Forwarded-For` no evade los límites por red | R22 |
| 17 | `init-env.sh` tiene un solo dueño de su estructura: C3a | R23 |
| 18 | `features.passwordReset` y `features.registration` salen de la configuración, para que C3b los encienda sin tocar código | R23 |
| 19 | El email canónico también se normaliza a NFC, para que las claves de los límites y del bloqueo no se partan en variantes que MySQL compara como iguales | R6 |

## R1. Sin Fortify: qué reemplaza a qué

**Decisión (usuario, 2026-10-05).** Ningún paquete nuevo. Cada pieza que Fortify daba sale del núcleo de Laravel:

| Función | Pieza |
| --- | --- |
| Ingreso y salida | `Auth` (guard `web` de sesión): `login`, `logout`, `logoutCurrentDevice`, cookie de recuerdo |
| Contraseña | `Hash` (bcrypt, 12 rondas), sólo desde `AccountPasswords` (R5) |
| Restablecimiento | El broker de contraseñas (`Password::broker()`): `createToken`, `reset` y el repositorio de tokens |
| Confirmación de contraseña | Un `RequirePassword` propio (el de Laravel responde sin `code`, R10) |
| Límites y bloqueo | `RateLimiter` y el middleware `throttle`, sobre el store `database` |
| Igualdad de tiempos | `Illuminate\Support\Timebox` |
| Cambio de contraseña y cerrar otras sesiones | `Auth` y `AuthenticateSession` (R3) |

**Enmienda pendiente del ADR 0006** (se registra en la hoja de ruta): D17 («Fortify sin vistas»), §4.2 (el pipeline con `Fortify::authenticateThrough`), §4.3 (`NewPasswordController`), la fila «Fortify» de la tabla de §4.9 y la fila C3 de §10 (`laravel/fortify` con permiso). §4.9 deja de decir que Fortify es nativo de la sesión: la sesión de Laravel no lo necesita.

**Descartado.** Fortify 1.40.0 (15 paquetes: 2FA y passkeys, que el R3 del ADR excluye) y 1.36.2 (5 paquetes: sigue trayendo 2FA y queda fuera de las versiones que se publican). D17 descartó «controladores propios para todo»; el usuario reabrió esa decisión, y la contrapartida está en el riesgo 5 de la spec y en el «Review Focus» del plan.

## R2. Sin Sanctum: el montaje de la sesión

**Decisión (usuario, Q1).** El grupo `api` suma, en este orden: `AssignRequestId`, `EncryptCookies`, `AddQueuedCookiesToResponse`, `StartSession`, `PreventRequestForgery` y `DropInvalidSession`, antes del `SubstituteBindings` que ya trae. Las rutas usan el guard `web`.

- **El health check queda afuera sin hacer nada.** `ApplicationBuilder` registra `health: '/api/up'` con un `Route::get` sin grupo de middleware, así que no pasa por la sesión (se leyó en el código de 13.x). La prueba lo comprueba igual: sin cookie y sin fila nueva en `sessions`.
- **El 401 de un invitado no puede redirigir.** `withMiddleware` arranca con `redirectGuestsTo(fn () => route('login'))`, y `Authenticate` evalúa esa función para todo pedido que no declara `Accept: application/json` (`$request->expectsJson() ? null : $this->redirectTo($request)`). Esta API no tiene una ruta `login`: ese pedido terminaría en un 500 (`Route [login] not defined`), y `curl` sin cabecera o `$this->get()` de Pest lo provocarían. `bootstrap/app.php` fija `$middleware->redirectGuestsTo(fn () => null)`, y una prueba exige 401 `unauthenticated` en JSON sin `Accept`.
- **El comentario de `bootstrap/app.php`** («Never run `php artisan install:api`: it installs Sanctum, which arrives in C3 with composer require») se reescribe: C3a no instala Sanctum ni ningún paquete (FR-052).
- **Descartado.** `statefulApi()` con `Sanctum::currentRequestHost()` y `referrerPolicy: 'same-origin'` en cada `fetch` (Q1, opción B).

## R3. El descarte de una sesión inválida, en dos capas

**Problema.** D16 pone `AuthenticateSession` en el grupo `api`. Ese middleware, ante un hash de contraseña distinto, cierra la sesión y lanza `AuthenticationException`: un 401 incluso en `GET /api/session`, que es pública y es el pedido con que el front arranca. El front tendría que tratar un 401 del arranque como «no hay sesión» y volver a pedir la sesión para recuperar el token CSRF.

**Decisión.** Dos capas, que juntas cumplen D16 y §4.5:

1. **`DropInvalidSession`, en el grupo `api` (suave).** Si el pedido trae un usuario (por la sesión o por la cookie de recuerdo), comprueba cuatro cosas. Si alguna falla, descarta la sesión y el pedido sigue como invitado, con la razón en `$request->attributes['session.dropped']`:

   | Situación | Resultado |
   | --- | --- |
   | Sin usuario | Sigue como invitado |
   | La contraseña cambió (el hash de la sesión no es el de la cuenta, lo decide `AuthenticateSession` usado como sonda) | Descarta: `PasswordChanged` |
   | La cuenta está `deleting` | Descarta: `Deleting` |
   | La cuenta está `disabled` | Descarta: `Disabled` |
   | Pasaron más de 8 horas desde el ingreso y el pedido no lleva la cookie de recuerdo (R4) | Descarta: `Expired` |
   | Todo en regla | Sigue autenticado; si falta, marca `taller.authenticated_at` |

   «Descartar» es `Auth::logoutCurrentDevice()`, `session()->invalidate()` y `session()->regenerateToken()`.

   `AuthenticateSession` se usa como sonda: se lo llama con un `$next` que no hace nada y se atrapa su `AuthenticationException`, de modo que la lógica de la comparación (también la de la cookie de recuerdo) es la del framework y no una copia.

2. **El grupo `account`, en las rutas que piden sesión (estricto):** `account.active` (si la sesión se descartó por una cuenta `disabled`, 403 `account_disabled`), `auth:web` (401 `unauthenticated`) y `account.expected` (409 en los pedidos que modifican). `account.active` va antes de `auth:web` porque la sesión ya está descartada cuando `auth:web` corre.

**Consecuencias.** `GET /api/session` nunca falla por una sesión inválida: responde `user: null`. «El siguiente pedido de esa sesión recibe 403 y deja de servir» (US4.1) vale para las rutas con sesión: el primer pedido recibe 403 y los siguientes, 401. La revocación no depende del driver: se prueba con la fila de `sessions` intacta.

**Descartado.** Dejar `AuthenticateSession` suelto en el grupo (el arranque recibe 401); reimplementar su comparación (una copia de una pieza de seguridad); o hacer el modo suave sólo en el controlador de `GET /api/session` (la misma lógica en dos lugares).

## R4. Ocho horas y «recordarme»

**Decisión.** `taller.authenticated_at` guarda el instante del ingreso (lo marcan el ingreso y la aceptación de una invitación, y `DropInvalidSession` lo completa si falta). `DropInvalidSession` descarta con `Expired` una sesión de más de 8 horas **salvo que el pedido lleve la cookie de recuerdo** (`$request->hasCookie(Auth::guard('web')->getRecallerName())`).

- **Un administrador** no recibe nunca la cookie de recuerdo (FR-015), así que el máximo le rige siempre.
- **Un estudiante sin «recordarme»** tampoco la tiene: 8 horas.
- **Un estudiante con «recordarme»** conserva su sesión mientras haya actividad, y cuando vence por inactividad (30 minutos) la cookie de recuerdo lo vuelve a ingresar (el guard marca el ingreso por la cookie y `DropInvalidSession` completa `taller.authenticated_at`). El máximo de 8 horas no tiene sentido ahí: la cookie de 30 días vale más que la sesión. Una cookie de sesión robada sin la de recuerdo sí queda acotada.
- **Una consecuencia aceptada de usar el token de Laravel.** Hay un solo `remember_token` por cuenta: salir en una computadora lo rota y todo otro dispositivo recordado tiene que ingresar de nuevo cuando venza su sesión de 30 minutos. D16 eligió esta pieza en lugar de una tabla de dispositivos.

## R5. Contraseñas

- **Un solo punto de entrada para todo texto de contraseña.** Toda contraseña en claro entra a la aplicación como un `PlainPassword` (normalizado a NFC, con sus conteos en caracteres y en bytes), y sólo `AccountPasswords` llama a `Hash` y a `Auth::logoutOtherDevices`. El motivo: `logoutOtherDevices` vuelve a hashear lo que se le pase, y una cadena sin normalizar dejaría a la persona afuera en su próximo ingreso. Las rutas que lo ejercitan (ingreso, aceptación, restablecimiento, cambio, confirmación y cerrar las otras sesiones) tienen cada una una prueba con la `á` descompuesta al fijar y compuesta al verificar. El ingreso no usa `Auth::attempt`: su rehash automático hashearía la cadena sin normalizar; hace `Auth::login`. Una prueba de arquitectura de Pest (`arch()`) exige que ninguna otra clase de `app/` use `Hash`.
- **Política (FR-023).** De 15 a 64 caracteres y a lo sumo 72 bytes después de normalizar; sin reglas de composición. Se rechaza una contraseña que, sin distinguir mayúsculas, esté en la lista o contenga el email completo, la parte local del email (si tiene 4 caracteres o más) o el nombre completo (si tiene 4 caracteres o más). Los 4 caracteres evitan rechazar a quien se llama «Ana». Los motivos salen en español por campo.
- **La lista (Q2).** `100k-most-used-passwords-NCSC.txt` de SecLists, filtrada a las entradas de 15 caracteres o más y guardada en minúsculas en `backend/api/resources/passwords/blocked-15plus.txt`, con un `SOURCE.md` que dice el origen, la fecha, el tamaño, la licencia (SecLists es MIT; la de los datos del NCSC está sin confirmar) y el comando del filtro. La descarga la hace el coordinador con permiso (T003). Las pruebas no dependen de ella: usan una lista de muestra propia. Qué fracción de la lista alcanza los 15 caracteres es una hipótesis que sólo se mide al bajarla; si resulta casi vacía, la política sigue valiendo (el mínimo de 15 es la defensa real) y se decide si se conserva.
- **`Normalizer`.** La imagen sólo instala `pdo_mysql`. `Normalizer::normalize` existe por `symfony/polyfill-intl-normalizer` v1.43.0, que `composer.lock` ya trae como dependencia de `symfony/string`. El ADR 0006 §4.7 pide declararlo si se usa directo: T002 lo agrega a `composer.json` con `composer require --no-install --no-scripts 'symfony/polyfill-intl-normalizer:^1.43'`. No suma un paquete al lock, pero la resolución consulta Packagist: necesita el permiso del usuario.
- **Bcrypt de 12 rondas.** Es el valor por omisión de `BcryptHasher`, pero el repositorio no tiene `config/hashing.php`, así que `BCRYPT_ROUNDS=4` de `phpunit.xml` no se lee y las pruebas pagarían 12 rondas por hash. T009 agrega `config/hashing.php` con `'bcrypt' => ['rounds' => env('BCRYPT_ROUNDS', 12)]`.
- **Sin `Password::uncompromised()`** (consulta Internet y `php` no tiene salida), sin reglas de composición ni `Gate::before` (R19).

## R6. El ingreso

`LoginPipeline` hace, en orden (ADR 0006 §4.2):

1. Canonicaliza el email (`Email::canonical`: recorte, NFC y `mb_strtolower`) y calcula la clave `sha256(email)` y la red (`NetworkKey`: la IPv4, o el /64 de una IPv6).
2. `LoginThrottle`: más de 5 intentos por minuto por email y red, o 60 por red, es 429. Cuenta todo intento que llega. Un ingreso correcto limpia el contador de email y red.
3. Busca la cuenta por email (una consulta, exista o no).
4. **Dispositivo.** `DeviceCookie` lee la cookie de dispositivo (`taller.device_cookie.name`, por omisión `taller-device`): es válida si descifra, trae `{uid, did}`, `uid` es la cuenta de este email y el dispositivo no sumó 10 fallos seguidos. Un dispositivo válido se limita a 5 fallos por minuto (429) y se salta el bloqueo por cuenta. Cualquier otro pasa por `AccountLockout`.
5. **Bloqueo por cuenta** (`AccountLockout`, clave por email canónico exista o no la cuenta): desde el 10.º fallo seguido de dispositivos desconocidos, bloqueado `min(900, 60 × 2^(fallos − 10))` segundos; con 100 o más, hasta restablecer. Un intento bloqueado responde 429 sin evaluar la contraseña y no suma un fallo.
6. **Verifica dentro de un `Timebox` de 200 ms**: `AccountPasswords::verifyOrDummy`, con un hash ficticio del mismo costo (se genera una vez por proceso con `Hash::make`, así que usa las rondas configuradas) cuando la cuenta no existe.
7. Un fallo (cuenta inexistente, contraseña equivocada o cuenta `deleting`) suma al contador del dispositivo si lo había, o al de la cuenta si no, y responde 422 `auth_failed`. Una cuenta `disabled` con la contraseña correcta responde 403 sin tocar los contadores.
8. Éxito: limpia los contadores, hace `Auth::login($user, $remember)` (que ya regenera el ID de la sesión), con `remember` sólo para estudiantes, marca `taller.authenticated_at` y emite o renueva la cookie de dispositivo.

**El email en NFC.** MySQL compara `papá` compuesta y descompuesta como iguales (el UCA les da los mismos pesos), pero las claves de la caché se arman con los bytes. Sin normalizar, quien prueba contraseñas contra una cuenta con tilde podría partir su intento en dos claves y duplicar el tope. `Email::canonical` aplica NFC antes de pasar a minúsculas, con el mismo `Normalizer` de las contraseñas; para un email sin caracteres fuera de ASCII no cambia nada.

**Decisiones.** El contador de fallos tiene un TTL para que un atacante no llene la tabla `cache` con emails inventados: 24 horas desde el último fallo, y 30 días si llegó a 100 fallos. Los fallos de un dispositivo conocido suman al contador del dispositivo y no al de la cuenta (la spec dice que el bloqueo de la cuenta cuenta los de dispositivos desconocidos). Confirmar la contraseña, cambiarla y cerrar las otras sesiones usan `PasswordProof`: 5 por minuto por usuario, y un fallo suma al bloqueo por cuenta como uno de ingreso. La spec lo exige sólo para confirmar; las otras dos prueban la contraseña actual igual y son la misma superficie de fuerza bruta para quien tiene una sesión robada.

**Cookie de dispositivo.** El contenido es `{uid, did}`: `did` son 128 bits aleatorios que identifican el dispositivo para sus contadores, porque «5 fallos por minuto» y «10 seguidos» hacen falta por dispositivo y la cookie no tiene tabla. Va cifrada y firmada por `EncryptCookies`.

**Su nombre y sus atributos salen de la configuración** (`taller.device_cookie`: `name`, `secure`, `same_site` y `days`), no de `APP_ENV`. El diseño cumple de antemano las reglas del prefijo `__Host-`: ruta `/`, sin `Domain` y, cuando el nombre lo lleva, `Secure`. Con C4 (TLS) alcanza con `DEVICE_COOKIE_NAME=__Host-taller-device` y `DEVICE_COOKIE_SECURE=true`. Un nombre con ese prefijo sin `Secure` es una configuración que el navegador descartaría sin avisar, y sin la cookie el titular pierde su exención del bloqueo: `DeviceCookie` lanza una `LogicException` al crearse en ese caso, para que falle en voz alta. La cookie de sesión ya es configurable por `SESSION_COOKIE` y `SESSION_SECURE_COOKIE`, y la de recuerdo la nombra Laravel.

**Descartado.** Contar todos los fallos contra la cuenta (deja afuera al titular); una tabla de dispositivos (el R5 del ADR, sin auditoría de logins, la excluye).

## R7. Cuenta esperada, CSRF y cómo se prueban

- **`EnsureExpectedAccount`** compara `X-Taller-User` con `Auth::id()` en los pedidos que no son `GET`, `HEAD` ni `OPTIONS`. Una cabecera ausente, vacía o que no sea un entero positivo es 409 `account_mismatch`, antes de tocar datos. Va en el grupo `account` y no en el `api`: el ingreso, las invitaciones y el restablecimiento no tienen cuenta.
- **El CSRF no corre en las pruebas.** `PreventRequestForgery` se salta cuando la aplicación corre pruebas (`runningInConsole() && runningUnitTests()`, y la documentación lo confirma: «the CSRF middleware is automatically disabled for all routes when running tests»). Las pruebas de 419 cambian el entorno de la aplicación a uno distinto de `testing` (`$this->app['env'] = 'local'`) para ese test. Si el 419 no aparece, el paso rojo falla por la razón equivocada y no se sigue.
- **El orden importa.** El CSRF (419) corre antes que la sesión descartada, el 401, el 403 y el 409: US6.3 pide que un token vencido responda 419 y que el cliente compare la cuenta antes de reintentar.
- **Pest no tiene cookie jar.** `tests/Support/Browser.php` guarda los `Set-Cookie` de cada respuesta y los reenvía (`withUnencryptedCookies`), copia `XSRF-TOKEN` a `X-XSRF-TOKEN` y agrega `X-Taller-User`. Lo comparten las pruebas de A, I y, después, B2 y D1.

## R8. Invitaciones

- **Token.** 32 bytes de `random_bytes` en base64url sin relleno (43 caracteres). La base guarda `sha256(token)` en hexadecimal. Un token con otra forma responde 404 sin consultar la base.
- **Concurrencia.** `Invitations::accept` hashea la contraseña antes de abrir la transacción, y en ella hace `SELECT … WHERE token_hash = ? FOR UPDATE`, comprueba el vencimiento, inserta la cuenta y borra la invitación. Dos aceptaciones simultáneas del mismo token crean una cuenta: la segunda espera el candado y no encuentra la fila (404). El único de `users.email` es la última guarda (409 `email_taken`).
- **READ COMMITTED.** D08 pide que todo escritor use READ COMMITTED por transacción, para no tomar candados de hueco (un `SELECT … FOR UPDATE` de un token inexistente los toma en REPEATABLE READ). Laravel no lo ofrece por transacción: `App\Database\WriteTransaction::run()` ejecuta `SET TRANSACTION ISOLATION LEVEL READ COMMITTED` justo antes de `DB::transaction(…, attempts: 3)`, y lo reusan B2 y D1.
- **`taller:invite`** crea o renueva (propuesta de la spec): sobre una invitación vigente o vencida rota el token, el rol y el vencimiento. El UNIQUE de `invitations.email` serializa dos corridas.
- **Registro.** Cada aceptación deja una línea en los registros con el id de quien invitó (`NULL` si fue la consola) y el id de la cuenta nueva, porque la fila desaparece (FR-021).

## R9. Recuperación por consola

- `taller:password-reset-link` llama a `Password::broker()->createToken($user)` y arma el link con el token y el email en el fragmento. Antes consulta `password_reset_tokens.created_at` para saber si se emitió otro hace menos de 60 segundos y decir cuántos faltan (el repositorio sólo responde sí o no).
- `POST /api/auth/reset-password` usa `Password::broker()->reset(...)` con credenciales `['email' => …, 'status' => 'active', 'token' => …, 'password' => …]`: `retrieveByCredentials` filtra por todo lo que no sea `token` y `password`, así que una cuenta que no está `active` no se restablece. El broker responde `INVALID_USER` o `INVALID_TOKEN`; los dos, y el vencido, dan el mismo 422 con `errors.token`.
- **La contraseña se valida antes de tocar el token**, con el email del pedido y, si la cuenta existe, su nombre: así un 422 por política no revela si el token servía.
- En el `callback` del broker: fija la contraseña con `AccountPasswords::set`, rota el token de «recordarme», borra las filas de `sessions` de la cuenta (`AccountSessions::endAll`), limpia el bloqueo (`AccountLockout::clear`) y no inicia sesión. El broker borra el token al usarse.

## R10. Los errores del framework en español y con `code`

`ApiExceptions` se registra con `$exceptions->render()`. Por la forma en que `Handler::render` prepara la excepción antes de llamar a los callbacks, éstos ven `TokenMismatchException` como un `HttpException` 419, `ModelNotFoundException` como un `NotFoundHttpException` y `AuthorizationException` como un `AccessDeniedHttpException`, y ven `AuthenticationException` y `ValidationException` como son:

| Excepción | `ApiCode` |
| --- | --- |
| `AuthenticationException` | `unauthenticated` |
| `HttpException` 419 | `csrf_token_mismatch` |
| `HttpException` 403 | `forbidden` |
| `HttpException` 404 | `not_found` |
| `HttpException` 405 | `method_not_allowed` (conserva `Allow`) |
| `ValidationException` | `validation_failed`, con `errors` |
| `HttpException` 429 (`ThrottleRequestsException`) | `too_many_requests`, conserva `Retry-After` |
| Otro `HttpException` 4xx | `bad_request`, con su estado |
| Otro `HttpException` 5xx y todo lo demás | `server_error` (500) |

`HttpResponseException` y los `Responsable` pasan de largo (devuelve `null`). La respuesta no depende de `APP_DEBUG`: nunca lleva una traza. Los mensajes viven en `lang/es/api.php`, escritos a mano junto con `validation.php`, `auth.php` y `passwords.php`: un paquete de traducciones sería una dependencia nueva. El `ApiErrorsTest` de C1 y el 404 de `/fuera` siguen valiendo.

**Descartado.** Un `ApiError` con el mensaje literal en cada sitio (15 lugares); el enum `ApiCode` da exhaustividad al análisis y una prueba que recorre `cases()` exige un mensaje para cada código.

## R11. Poda y `scheduler`

- Laravel no trae una poda por lotes de `sessions` ni una de `cache`: `DatabaseStore` no tiene ningún método que borre lo vencido, sólo `forgetIfExpired` al leer. Se escriben `taller:prune-sessions` y `taller:prune-cache` (el segundo cubre `cache_locks`, cuyo `DatabaseLock` además tiene su propio sorteo de poda sin `LIMIT`, que sólo corre al tomar un candado y ningún pedido toma uno).
- `auth:clear-resets` es de Laravel y borra por `created_at`. Las invitaciones se podan con `model:prune` y el trait `Prunable` de `Invitation` (30 días después de vencer).
- El sorteo de sesiones de `config/session.php` queda en `[0, 100]`.
- `withoutOverlapping()` usa un candado de `cache_locks`, que ahora tiene la clave en `bin`.

## R12. `db-grants` y el chequeo de transacciones largas

- **Consulta.** `performance_schema.events_transactions_current` tiene una fila por hilo con su última transacción: `STATE` es `ACTIVE` mientras no termina, y para un evento sin terminar `TIMER_WAIT` es el tiempo transcurrido en picosegundos. El umbral de 30 segundos son 3 × 10¹³. Un `COMMITTED` conserva su duración final, así que hay que filtrar por `ACTIVE`.
- **Falla cerrado, de tres maneras.** El error 1142 (falta el privilegio) detiene con el mensaje que dice cómo aplicarlo. Cualquier otro error de la consulta detiene. Y el chequeo se **autoverifica**: abre una transacción propia y exige verse como `ACTIVE`; si el consumidor o el instrumento están apagados, o el usuario no ve la tabla, no se ve y falla (`performance_schema` vacío no pasa por «no hay transacciones»).
- **Privilegio mínimo.** `GRANT SELECT` sobre esa tabla y nada más. Con `information_schema.INNODB_TRX` haría falta `PROCESS`, un privilegio global; una prueba del criterio J muestra que un usuario sin `PROCESS` no ve la transacción ahí (error o cero filas) y sí la ve en `performance_schema`.
- **Dónde corre.** Dentro de `docker/migrate.sh`, una vez, antes del ciclo de reintentos (`php artisan taller:check-transactions || exit $?`). Así protege a `deploy.sh` y a un `docker compose up`, no se reintenta (es una decisión, no un bloqueo) y `MigrateScriptTest` lo prueba con el `php` falso. El costo es que todos los escenarios de esa prueba suman una llamada al principio.
- **El criterio J** (FR-042): su texto original no está en el repositorio. Se interpreta como la prueba de FR-042: un usuario de MySQL creado por la prueba, sin `PROCESS` y con sólo ese `SELECT`, detecta una transacción abierta de otra conexión (con el umbral reducido a 1 segundo), y sin el privilegio el chequeo falla cerrado. La prueba va en la suite `Content` (`DatabaseTruncation`), porque la transacción que envuelve a una prueba de `Feature` se vería a sí misma como una transacción larga.
- **`deploy-check.sh`.** El sostenedor de ese script (`LOCK TABLES … ; SELECT SLEEP(180)`) no abre una transacción de InnoDB, y el chequeo corre en los primeros segundos del despliegue; el plan verifica que el escenario siga dando «migrate reintentó 3 veces» y lo ajusta si no.
- **Volúmenes existentes.** El primer despliegue falla cerrado hasta que el operador corre `db-grants` una vez (el mensaje lo dice). Un volumen nuevo aplica el mismo SQL por `docker-entrypoint-initdb.d`.
- **Un solo archivo de usuarios y privilegios.** `docker/mysql/db-grants.sql` es versionado e idempotente, y es el único que corre con `root` (por `db-grants` o por el script de inicialización). C3a lo empieza con un `GRANT` para el usuario `taller`. C4 lo extiende con sus usuarios por rol (propone `app`, `runs`, `mail`, `migrate` y `backup`) sin cambiar los dos caminos que lo aplican: es un supuesto de forma, no de contenido, porque la spec de C4 todavía no tiene clarify. `worker-mail` de C3b también usará un usuario propio, que entra por el mismo archivo.

## R13. Cierre del reenvío DNS

- **Decisión.** `dns: ['127.0.0.1']` en todo servicio de una red `internal`. Con esa opción, el DNS embebido de Docker (127.0.0.11) sigue respondiendo los nombres de servicios, y lo que no conoce se reenvía al loopback del contenedor y falla de inmediato. En Docker 29.8.2 se midió, para el servicio `taller`: por omisión el `ExtServers` de `/etc/resolv.conf` es `[host(127.0.0.53)]`; con la opción, `[127.0.0.1]`.
- **Lo que no se midió** es el comportamiento de un contenedor que sólo está en redes `internal` (`php`, `migrate`, `scheduler`): Docker puede ya no reenviar ahí. La prueba va primero: resolver un nombre de Internet desde cada servicio y exigir que falle, resolver `mysql` y `php` y exigir que funcione. Si ya falla sin la opción, la opción queda igual como defensa que no depende de la versión del motor.
- **Prueba.** Con el stack levantado, desde cada servicio, un `nslookup` o un `getent hosts` según lo que traiga la imagen: `example.com` no resuelve y `mysql` o `php` sí.

## R14. Nginx

- **Zonas.** `limit_req_zone $binary_remote_addr zone=api:10m rate=50r/s` y una zona `session`, cuya clave es la IP sólo cuando la ruta es `/api/session` (un `map` que da una clave vacía en las demás: Nginx no cuenta las claves vacías), a `rate=5r/s`. En `location ^~ /api/`: `limit_req zone=api burst=400 nodelay` y `limit_req zone=session burst=60 nodelay`. Un aula de 40 que arranca a la vez hace unos 800 pedidos en segundos: 400 de ráfaga más 50 por segundo los admiten en 10 segundos. Son valores iniciales: C4 y §13.15 los afinan.
- **429 y no 503.** `limit_req_status 429` (B2 depende de eso: el 503 de Nginx se confundiría con `queue_full`). `error_page 429 = @too_many_requests` devuelve un cuerpo JSON `{message, code}` en español con `Retry-After: 1` y `Content-Type: application/json`. Un `add_header` en esa ubicación reemplaza las cabeceras del servidor, así que la CSP y las demás se repiten ahí o se mueven a una variable (`map`) que las dos ubicaciones usan.
- **Registro sin la query string.** Un `log_format` que usa `$request_method $uri $server_protocol` en lugar de `$request` para `/api/`, y `$request_id` para correlacionar con los registros de la aplicación; `fastcgi_param HTTP_X_REQUEST_ID $request_id`.
- **`nginx -t`** corre primero, en la imagen, antes de levantar el stack.
- Las ubicaciones nuevas de B2 (`/api/runs`, con 192 KiB) y D1 repiten las seis líneas de `fastcgi_param` o las extraen a un `include`; C3a no lo extrae por anticipado.

## R15. Registros

- **Formato.** Compose fija `LOG_STDERR_FORMATTER=Monolog\Formatter\JsonFormatter`: el canal `stderr` ya existe y ya lee esa variable.
- **Contexto.** `RequestContext` (un procesador de Monolog) agrega `request_id`, `ip` y `user_id`. No consulta la base: lee lo que el middleware dejó en el pedido.
- **Sin secretos.** `SecretScrubber` (otro procesador) reemplaza, en el mensaje y en el contexto: el ID de la sesión actual, todo email por su HMAC, el valor de las claves `password`, `token`, `secret`, `authorization` y `cookie`, y los fragmentos `invitacion=` y `restablecer=`. El motivo no es teórico: el mensaje de una `QueryException` incluye el SQL con los valores ya sustituidos, y una consulta de `sessions` lleva el ID de la sesión y una de `users`, el email.
- **HMAC.** `EmailFingerprint::of(email)` es `hash_hmac('sha256', canónico, LOG_HMAC_KEY)` recortado a 16 hexadecimales; sin clave configurada lanza una excepción (en producción, el arranque falla) y el ancla de pruebas la fija.
- **Qué se registra.** La aceptación de una invitación (id de quien invitó e id de la cuenta), el escalón del bloqueo por cuenta (HMAC, IP y fallos) y los errores no esperados. No hay registro de cada ingreso: el R5 del ADR descarta la auditoría de logins.

## R16. Los checks autenticados (FR-046)

- **La cuenta.** El check la crea por el camino real: `docker compose exec -T php php artisan taller:invite check-<aleatorio>@taller.invalid`, toma el token del link, pide `GET /api/session` para la cookie `XSRF-TOKEN` y llama a `POST /api/auth/invitations/accept` con una contraseña aleatoria de 32 caracteres y la versión vigente del aviso (la lee con `php artisan tinker --execute="echo config('taller.privacy_version');"`). La respuesta trae la sesión. Es un ejercicio más del contrato.
- **Retirarla.** C3a no tiene supresión de cuenta (es de C3b), así que el check la borra con SQL de `root` por `docker compose exec -T mysql`, como ya hace `deploy-check.sh`. La clave foránea en cascada se lleva sus sesiones. Una trampa (`trap … EXIT`) la retira aunque el check falle.
- **Dónde.** `backend/api/scripts/check-account.sh` (funciones `check_account_open` y `check_account_close`, para `smoke.sh` y `deploy-check.sh`) y `qa/lib/api-account.ts` (para `qa/api-content-check.ts`). Son GET: no necesitan `X-Taller-User`.
- **Descartado.** Una cuenta fija en `.env` (un secreto fijo y una cuenta olvidada); un comando `taller:` sólo para los checks (superficie nueva).

## R17. La prueba en el navegador real (FR-050)

La spec la pide con Playwright o, si no está adoptado, con una verificación manual declarada. En esta rama Playwright no está adoptado (`docs/agent-skills.md`). El épico del front prevé adoptarlo (F1), pero sus pruebas de punta a punta corren contra `vite preview`, que no pasa `/api/` a la API ni aplica la CSP de Nginx: para esta prueba haría falta un proyecto aparte contra el stack de Docker. El plan deja, por omisión, la verificación manual con un guion en [quickstart.md](./quickstart.md) (escenario 8), que se declara como límite en el PR. Si el usuario adopta Playwright antes, la misma verificación se escribe como prueba.

## R18. Nivel 9 de PHPStan, sin baseline

El código nuevo pasa el nivel 9 que fija `phpstan.neon` desde C6, sin `@phpstan-ignore` ni `ignoreErrors`. Los modismos que el plan pide:

- Los valores de configuración, con los accesores tipados (`config()->string('taller.privacy_version')`, `->integer()`, `->boolean()`, `->array()`), y nunca un `(string) config(...)`.
- Los datos de un pedido, con `$request->string()`, `->integer()` y `->boolean()`, o por un `FormRequest` cuyo método `validated()` se vuelve un registro `readonly` (el patrón de C6) antes de salir del controlador.
- Las matrices con forma, en un `@return array{...}`; las listas, con `list<…>`.
- Las consultas del query builder, con `->first()` tipado por un `@var` en el borde (como `ContentImports`), y el resultado a un registro.
- La clave de una `DB::table()` o un `Cache::get()` que es `mixed` se estrecha con `is_int`/`is_string` y no con un cast.

## R19. Lo que las skills proponen y el ADR no acepta

`laravel-specialist`, `laravel-security` y `laravel-tdd` mandan sólo donde el ADR calla. Quedan fuera: Sanctum y los tokens (R3 del ADR), `Password::uncompromised()` (consulta Internet), `Gate::before` para un super-admin, `declare(strict_types=1)` (C6 lo dejó fuera) y una meta de cobertura del 80 al 85 %. Se toman: pruebas primero, validación en `FormRequest`, sin `$request->all()`, el `Hash` de Laravel y las políticas por modelo (que C3a no necesita todavía: no hay datos ajenos).

## R20. Lo que C3a le suma al código de C2 y C6

- `Catalog::fromRow(array $row): self` y `Catalog::toPublished(): array` en `app/Content/Record/Catalog.php`, con el patrón de `Language::fromRow` y `RowFields`. C6 no la escribió (su FR-002: «una conversión que nadie usa todavía espera a su primer uso»); `GET /api/session` es ese uso.
- `ContentImports::latestVersion(): ?string`: lee sólo `document_hash` del último import (una lectura por clave primaria, sin decodificar `portion_hashes`) y devuelve sus 32 primeros hexadecimales. El arranque de cada cliente pasa por acá.
- `App\Content\ActiveCatalogs` (lectura de los catálogos activos, ordenados), sin armar contenido.
- Nada más cambia en `app/Content/`: las seis rutas siguen con `ContentController` y `ContentDelivery`; sólo cambia a qué grupo de middleware pertenecen.

## R21. Cómo se prueba

- **Drivers reales.** `phpunit.xml` fija `SESSION_DRIVER=array`, `CACHE_STORE=array` y `QUEUE_CONNECTION=sync`. Las pruebas de sesión, límites, bloqueo y restablecimiento llaman a `Browser::useDatabaseDrivers()`, que cambia `session.driver` y `cache.default` a `database` antes del primer pedido (FR-047). Las pruebas del contenido, que ya fijan `content.cache_store`, no lo necesitan.
- **Relojes.** Los límites, el bloqueo, los vencimientos y la sesión usan `Carbon::setTestNow()` y `travel()`; el piso de 200 ms usa `Sleep::fake()` (`Timebox` duerme con `Sleep::usleep`), con el tiempo registrado entre 150 y 200 ms para los dos caminos, no con el reloj de pared.
- **Suites.** Lo que necesita su propia transacción (la aceptación concurrente, el criterio J, el import con `GET /api/session`) va en `tests/Content/` (`DatabaseTruncation`); el resto, en `tests/Feature/` (`RefreshDatabase`) y `tests/Unit/` (sin aplicación).
- **El esperado sale de afuera.** Los códigos y los mensajes, de `contracts/http.md`; los números de los límites y del bloqueo, del ADR y de la spec; los catálogos, de `curriculum.meta.json`; el sha256 de cada porción, de las huellas del generador.
- **Los tests existentes que cambian.** `tests/Content/MigrationsTest.php` deshace `--step=21`, que supone que las migraciones de contenido son las últimas: pasa a deshacer todas las posteriores a las tres de C1. `tests/Unit/MigrateScriptTest.php` agrega la llamada del chequeo a cada escenario. `tests/Content/ContentEndpointTest.php` hace unos 33 pedidos sin sesión: se autentican con una cuenta de fábrica y no cambia ningún valor esperado.

## R22. La IP del cliente y `trustProxies`

Los límites «por red» (FR-012, el restablecimiento, las invitaciones) y las zonas `limit_req` de Nginx cuentan por la IP que ve cada capa. En PHP, esa IP es `$request->ip()`, es decir `REMOTE_ADDR`, mientras `trustProxies` no confíe en ningún proxy: sin proxies de confianza, Laravel ignora `X-Forwarded-For`. Nginx fija `REMOTE_ADDR` con `$remote_addr` (el `fastcgi_params` estándar) y deja pasar la cabecera del cliente como `HTTP_X_FORWARDED_FOR`, que PHP no usa.

**Decisión.** C3a no configura `trustProxies` y lo deja explícito: queda vacío hasta C4, que fija la IP real del cliente (FR-026 y FR-027 de su spec). Dos pruebas lo fijan: `Request::getTrustedProxies()` es `[]` después de arrancar la aplicación (`ConfigTest`), y seis intentos de ingreso con el mismo `REMOTE_ADDR` y seis valores distintos de `X-Forwarded-For` reciben 429 en el sexto (`LoginThrottle`). Si C4 llega a confiar en un proxy, esa segunda prueba es la que avisa que el límite por red dejó de valer sin él.

**Hasta C4 puede ser una sola IP** para todos (spec, Edge Cases): el puerto escucha sólo en `127.0.0.1`, y los límites están calibrados para eso (ráfaga holgada).

## R23. Archivos que C3a comparte con C3b y C4

- **`backend/api/scripts/init-env.sh`.** Lo tocan C3a, C3b y C4. El dueño de su estructura es C3a (la tarea T012 de O): el patrón es una función `add_missing NOMBRE VALOR` por variable, con el valor generado por `openssl` y sin pisar nunca uno existente. C3b y C4 sólo agregan líneas `add_missing`.
- **`docker/mysql/db-grants.sql`.** C3a lo crea; C4 y C3b agregan sus usuarios al mismo archivo (R12).
- **`config/taller.php`.** C3a define la estructura de sus claves. `taller.features` (`password_reset` y `registration`, ambos `false`) y `taller.device_cookie` son las que C3b y C4 cambian: `GET /api/session` lee las dos de la configuración y no las escribe en el código, así que encenderlas es un cambio de configuración.
- **`docker/compose.yaml` y `docker/nginx/nginx.conf`.** C3b suma `worker-mail` y su red; C4 el TLS, la CSP y los usuarios de MySQL. Cada uno agrega servicios y ubicaciones sin tocar los de C3a.
- **Lo que C3b toma de C3a** y que esta planificación no cambia: la tabla `invitations` completa (`delivery`, `sent_at`, `send_failed_at`), `Invitations::issue` (hoy sólo con `delivery = link`: C3b suma el parámetro), `role` y `status`, `AccountSessions::endAll` (al deshabilitar una cuenta), el alias `password.confirm` con `RequirePassword::isConfirmed()` y `markConfirmed()`, la prueba de esquema de FR-004 con su lista de excepciones (`account_deletions` ya está en ella) y `GET /api/session` con `features`.
