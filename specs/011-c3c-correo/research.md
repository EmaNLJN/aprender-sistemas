# Research: C3c · Correo, recuperación por email y registro abierto

**Input**: [spec.md](./spec.md) con su clarify del 2026-10-06, el código de `master` (`dd870a9c`) en `backend/api/` y `docker/`, las specs de C3a ([004](../004-c3-identidad-acceso/spec.md)), C3b ([010](../010-c3b-admin-ciclo-de-vida/spec.md)) y C4 ([008](../008-c4-exposicion/spec.md), con su plan), y lo que F11 ([015](../015-f11-acceso-cuenta/spec.md)) y F12 ([023](../023-f12-administracion/spec.md)) toman de C3c.

**Fecha**: 2026-10-28. Nada de lo que sigue se implementó: las decisiones son la base del [plan](./plan.md).

## Fuentes y mediciones

### Context7 y lo que se leyó además

- **Context7.** El primer servidor (`mcp__context7__*`) agotó su cupo mensual en la primera consulta. Por indicación del coordinador, las consultas se hicieron con el segundo servidor de Context7. Antes de que llegara esa indicación se había consultado la documentación oficial con `WebFetch`, que coincide.
- **El código de las dependencias.** Algunos temas no están en la documentación: qué hace `MailFake::raw`, si `Queue::fake()` mira las transacciones, cómo arma el SMTP `MailManager` y qué escucha el framework por su cuenta. Para esos se leyó el código exacto que fija `backend/api/composer.lock`.
  - **De dónde.** De una imagen que ya estaba en la máquina, `taller-d1b-test:latest`, con `laravel/framework` v13.34.0, `symfony/mailer` v8.1.7 y `pestphp/pest` v5.3.0, las mismas versiones del lockfile.
  - **Cómo.** Con `docker run --rm --network none --entrypoint sh taller-d1b-test:latest -c 'grep …'`: sin red, sin descargas y sin tocar ningún stack.

| Librería | Versión | ID de Context7 y tema | Fuente complementaria | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- | --- |
| Laravel (colas) | 13.34.0 | `/laravel/docs/__branch__13.x`: «Time Based Attempts» («If both `retryUntil` and `tries` are defined, Laravel prioritizes the `retryUntil` method») | `Queue/Worker.php`, `markJobAsFailedIfAlreadyExceedsMaxAttempts` | Con `retryUntil()` se ignora la cantidad de intentos. Pasado el plazo, el worker falla el trabajo **antes** de llamar a `handle()`, con `MaxAttemptsExceededException`, y llama a `failed()` | Sí: el plazo es el único tope (R4) y `send_failed_at` se completa en `failed()` |
| Laravel (colas) | 13.34.0 | El mismo ID: «Configure Exponential Backoff» («the last value repeats for any remaining attempts») | `Worker::calculateBackoff` | 60, 300, 900, 3600 y después 3600 cada vez | Sí: los reintentos siguen cada hora hasta el plazo (R4) |
| Laravel (colas) | 13.34.0 | El mismo ID: «Define an Encrypted Job with ShouldBeEncrypted» | `Queue/Queue.php` (`jobShouldBeEncrypted`); `CallQueuedHandler::getCommand` | Cifra el `command` serializado con `APP_KEY`. Al leer, un `command` que empieza por `O:` se deserializa sin descifrar: un trabajo viejo sin cifrar sigue corriendo cuando la clase pasa a cifrarse | Sí: `PurgeUserData` pasa a cifrado sin romper lo ya encolado (R10) |
| Laravel (colas) | 13.34.0 | El mismo ID: «Jobs & Database Transactions» (con `after_commit`, lo despachado dentro de una transacción espera al COMMIT y se descarta si vuelve atrás); «Test queued jobs with Queue::fake» | `Queue::enqueueUsing`; `Support/Testing/Fakes/QueueFake::push`; `Foundation/Testing/DatabaseTransactionsManager` | La documentación no dice si `Queue::fake()` mira la transacción, y el código dice que no: `QueueFake::push` registra **en el momento**. Con `RefreshDatabase`, el administrador de transacciones de prueba ejecuta lo diferido al confirmar el nivel 1 | Sí: las pruebas de «después del COMMIT» usan la cola `database` real, no `Queue::fake()` (R3) |
| Laravel (colas) | 13.34.0 | El mismo ID: «Job Events» (`Queue::looping`) y «Cleaning Up After Failed Jobs» (`failed(?Throwable)`; «a new job instance is instantiated before invoking the `failed` method») | `Queue/Events/WorkerStarting.php` (`connectionName`, `queue` y `workerOptions`); `Worker::raiseWorkerStartingEvent` | `WorkerStarting` existe y se dispara una vez al arrancar. `failed()` corre sobre el trabajo deserializado otra vez, con sus datos | Sí: la advertencia de `APP_URL` es un listener (R15), y `failed()` marca la invitación con lo que trae el trabajo (R6) |
| Laravel (colas) | 13.34.0 | — (no está en la documentación) | `Queue/DatabaseQueue.php` (`getNextAvailableJob` con `lock`, `markJobAsReserved`, `deleteReserved`) | Sacar un trabajo es un `SELECT … FOR UPDATE SKIP LOCKED` y un `UPDATE`; terminarlo, un `DELETE` | No: confirma S, I, U y D sobre `mail_jobs` en la matriz de C4 |
| Laravel (mail) | 13.34.0 | El mismo ID: «Test Mailable Content» (`assertSeeInText`, `assertDontSeeInText`), «Asserting Sent Mailables» y «Asserting No Outgoing Mail» (`assertNothingOutgoing`) | `Mail/Mailable.php` (`buildView`, `send`, `renderForAssertions`); `Mail/Mailer.php` (`parseView`, `addContent`, `renderView`); `MailFake::raw` | `MailFake::raw()` no hace nada, así que `Mail::raw()` no se puede probar con `Mail::fake()`. Un `Mailable` cuyo `buildView()` devuelve `['text' => new HtmlString($cuerpo)]` sale sólo como texto, sin vista ni Blade, y `renderForAssertions` conserva ese texto para `assertSeeInText` | Sí: `PlainTextMessage` redefine `buildView()` (R2): sin tmpfs de vistas en `worker-mail`, y sin que Blade escape el `&email=` del link |
| Laravel (mail) | 13.34.0 | El mismo ID: «Mail and Local Development» (Mailpit con el driver `smtp`, `MAIL_HOST=mailpit`, `MAIL_PORT=1025`) | `Mail/MailManager::createSmtpTransport` y `configureSmtpTransport` | Sin `scheme`, el 465 usa `smtps` y el resto `smtp`. Las claves del mailer viajan como opciones del DSN, y `timeout` va al socket | Sí: `config/mail.php` fija `timeout` y `require_tls` (R3, R19) |
| Laravel (rate limiting) | 13.34.0 | El mismo ID: «Attempt rate-limited callback», «availableIn»; [laravel.com/docs/13.x/rate-limiting](https://laravel.com/docs/13.x/rate-limiting): con los stores `database`, `redis` y `memcached`, `increment` es atómico | `Cache/RateLimiter.php` (`increment`, `decrement`, `availableIn`, `attempt`) | `increment` devuelve la cuenta nueva de forma atómica, y `decrement` existe aunque la documentación no lo muestra | Sí: el tope diario se reserva con `increment` y se devuelve con `decrement` (R9) |
| Laravel (auth) | 13.34.0 | — (no está en la documentación) | `Foundation/Support/Providers/EventServiceProvider::configureEmailVerification` | El framework registra solo `SendEmailVerificationNotification` para `Registered`, y esa notificación relee el modelo y manda el correo desde quien la dispara | Sí: C3c nunca dispara `Registered`, y una prueba de arquitectura lo cuida (R11) |
| Symfony Mailer | 8.1.7 | `/symfony/symfony-docs/__branch__8.0`: «Ensure TLS» (`require_tls`: «a `TransportException` is thrown if a TLS connection cannot be established»; sólo con `smtp://`) y «Disabling Automatic TLS» (`auto_tls`) | `Transport/Smtp/EsmtpTransportFactory::create` | `smtps` abre TLS de entrada. Con `smtp`, `auto_tls` usa STARTTLS si se ofrece, y `require_tls` falla si no se ofrece | Sí: `require_tls` vale `true` por omisión y `false` sólo para Mailpit (R19) |
| MySQL | 9.7 | `/websites/dev_mysql_doc`: «Column Privileges» (`SELECT`, `INSERT`, `UPDATE` y `REFERENCES` por columna) y «Static Privilege Descriptions» («`SELECT` is needed … for columns named in the `WHERE` clause of `DELETE` or `UPDATE` statements») | — | Un `UPDATE … WHERE id = ? AND token_hash = ?` necesita `SELECT (id, token_hash)` además de `UPDATE (sent_at, send_failed_at)` | Sí: la matriz de `taller_mail` suma `token_hash` a lo que propone C4 (R6, R16) |
| Pest | 5.3.0 | `/pestphp/docs`: «toUse() with not modifier» y «Excluding namespaces with ignoring()» | `tests/Unit/ArchitectureTest.php`, que ya combina `not->toUse` con `ignoring` | `arch()->expect('App')->not->toUse([...])->ignoring(...)` funciona en el proyecto | No: se usa como ya se usa |
| PHPStan | 2.2.17 (Larastan 3.12.3) | `/phpstan/phpstan`: «Rule Levels» y «PHPDoc Types > Mixed» (en el nivel 9, a un `mixed` explícito sólo se lo puede pasar a otro `mixed`) | — | Una propiedad documentada como `string` no acepta otro tipo | Sí: el plan no asigna `$textView` (documentada `@var string`) y redefine `buildView()` con tipo de retorno (R2) |
| Mailpit | 1.31.4 | `/axllent/mailpit`: «readyzCmd — `mailpit readyz`», «Kubernetes probe routes» (`/livez`, `/readyz`), `GET /api/v1/search` y `GET /api/v1/message/{id}` (el tipo `Message`, con `To`, `Subject`, `Text` y `HTML`); [«Runtime options»](https://mailpit.axllent.org/docs/configuration/runtime-options/) (`MP_DISABLE_VERSION_CHECK`, `MP_SMTP_AUTH_ACCEPT_ANY`, `MP_SMTP_AUTH_ALLOW_INSECURE`, `MP_MAX_MESSAGES`; `MP_DATABASE` por omisión es un archivo temporal) | — | Sin `MP_DISABLE_VERSION_CHECK`, consulta GitHub por versiones nuevas. `mailpit readyz` sirve de chequeo de salud. La documentación no dice qué usuario usa la imagen ni dónde está su binario | Sí: el servicio apaga la consulta, usa `readyz` y el disco de sólo lectura; la ruta del binario y el usuario se verifican al recibir el permiso (T029) |
| Docker Compose | v5.6.1 (Context7: v5.5.1) | `/websites/docker_compose`: «Internal networks» («no default gateway for external connectivity»; un servicio en una red interna y en una común «can still reach the internet via the non-internal network») | Medición propia (abajo) | `worker-mail` sale por `egress` y llega a `mysql` por `mail`. `dns: []` limpia el `127.0.0.1` heredado; `dns: !reset []` lo conserva a través de un merge de YAML | Sí: `worker-mail` usa `dns: []` y Mailpit va a `egress` (R15) |
| Brevo | servicio, 2026-10-28 | — (Context7 no la tiene; `WebFetch` oficial) | [«SMTP relay integration»](https://developers.brevo.com/docs/smtp-integration) («Non-encrypted: Use ports 587 or 2525»; «Encrypted: Use port 465 with SSL or TLS encryption»; «Use an SMTP key, not an API key»); [«Postfix integration»](https://developers.brevo.com/docs/using-the-smtp-relay-with-postfix.md) (`smtp-relay.brevo.com:587`). La ayuda de Brevo respondió 403 | El servidor, el puerto y el usuario se copian de la página «SMTP & API» de la cuenta. La documentación pública no dice cómo se apaga el rastreo de clics de un correo de texto por SMTP | Sí: son valores que el usuario copia de su cuenta (T034), y un correo real confirma que el link no se reescribe (T037) |

### Mediciones de sólo lectura

- **Versiones dentro de la imagen.** `vendor/composer/installed.json` de `taller-d1b-test:latest` trae `laravel/framework` v13.34.0, `symfony/mailer` v8.1.7 y `pestphp/pest` v5.3.0, las de `composer.lock`.
- **`dns` heredado.** Un `compose.yaml` descartable en el scratchpad, con un ancla `x-runtime` (`dns: ['127.0.0.1']`) y tres servicios, leído con `COMPOSE_PROJECT_NAME=c3c-dnsprobe docker compose -f … config --format json`. El servicio sin cambios queda con `['127.0.0.1']`. Con `dns: []` no queda ninguno, y con `dns: !reset []` vuelve `['127.0.0.1']`. No se levantó nada.
- **Proyecto de Compose.** El `compose.yaml` de la raíz fija `name: taller-rust-go`, que es el stack del usuario. `COMPOSE_PROJECT_NAME` tiene precedencia sobre `name:`, así que cada comando del plan y de la guía lleva `COMPOSE_PROJECT_NAME=taller-c3c` en su misma línea.
- **La imagen de MySQL.** `docker run --rm --network none --entrypoint sh mysql:9.7@sha256:e2bde46d… -c 'command -v awk sed sh mysql'`, con la imagen que ya fija Compose: las cuatro están en `/usr/bin`. `apply-grants.sh` puede correr adentro sin instalar nada.
- **Mailpit.** El tamaño, la licencia y el digest son los de la spec («Descargas previstas», API de Docker Hub del 2026-10-05). No se volvió a consultar Docker Hub.

## Decisiones

### R1. Una sola salida: el trabajo `SendMail` en la conexión `mail`

**Decisión.** Todo correo del taller es un `App\Jobs\SendMail` (`ShouldQueue` y `ShouldBeEncrypted`) en la conexión `mail` y la cola `mail`, con un único valor `readonly`, `App\Mail\OutgoingMail`: el tipo, el destinatario, el nombre, el link y su vencimiento, una referencia a la invitación y el plazo. Lo pone en la cola sólo `App\Mail\Mailbox::queue()`, que en modo sólo link no encola nada. `worker-mail` es el único proceso que corre `SendMail`, y `SendMail` es la única clase que usa el `Mailer`.

**Por qué.** D21 pide datos primitivos y cifrados, sin releer `users`, para que el usuario de MySQL del correo no pueda leer cuentas. Un trabajo propio también deja en un solo lugar el plazo (`retryUntil`), la espera (`backoff`), qué queda de una falla (`failed()`) y la marca de la invitación.

**Alternativas.**
- Las notificaciones de Laravel, `User::notify()`: `SerializesModels` relee el modelo en el worker, y el usuario `taller_mail` no puede leer `users`.
- Un `Mailable` encolado (`Mail::to()->queue()`): corre dentro de `SendQueuedMailable`, sin `retryUntil` propio ni un `failed()` que complete `send_failed_at` sin releer la invitación.

### R2. El mensaje: un `Mailable` de texto, sin vistas

**Decisión.** `App\Mail\PlainTextMessage extends Mailable` arma el sobre (destinatario, remitente y asunto) y redefine `buildView(): array`, que devuelve `['text' => new HtmlString($cuerpo)]`. El texto sale de `App\Mail\MailText`, que lee `lang/es/mail.php` con `__()`.

**Por qué.**
- `Mail::raw()` no se puede probar con `Mail::fake()`: `MailFake::raw` está vacío.
- Una vista de Blade obliga a montar un tmpfs de vistas compiladas en `worker-mail`. Además, `{{ $link }}` escaparía el `&` del link de recuperación (`#restablecer=…&email=…`) como `&amp;`.
- Asignar `$this->textView = new HtmlString(…)` contradice el `@var string` de la propiedad y no pasa el nivel 9.
- Con `buildView()` redefinido, `Mailable::send()` y `renderForAssertions()` (que usa `assertSeeInText`) ven el texto. `Mail::fake()` registra el `Mailable`, y el transporte `array` de las pruebas guarda el mensaje de Symfony con una sola parte `text/plain`.

### R3. La conexión `mail` y la cadena de plazos

**Decisión.** En `config/queue.php`, la conexión `mail` es así:

```php
'mail' => [
    'driver' => 'database',
    'connection' => env('DB_QUEUE_CONNECTION'),
    'table' => 'mail_jobs',
    'queue' => 'mail',
    'retry_after' => 120,
    'after_commit' => true,
],
```

El tiempo de espera del SMTP es de 20 s (`config/mail.php`, `mailers.smtp.timeout`). El trabajo tiene un `#[Timeout(60)]`, la conexión, `retry_after` de 120 s, y el `stop_grace_period` de `worker-mail` es de 150 s. Cada eslabón es menor que el siguiente, como en B2, y `qa/compose-mail-check.ts` lo comprueba leyendo los cuatro valores.

**Por qué.** Si `retry_after` fuera menor que un envío colgado, otro proceso tomaría el mismo trabajo y el correo saldría dos veces. Si `stop_grace_period` fuera menor que el trabajo, un despliegue cortaría un envío a la mitad. `queue:work` necesita PCNTL para cortar a tiempo, y la imagen lo trae desde B2.

**Las pruebas del «después del COMMIT».** `Queue::fake()` registra en el momento aunque la transacción vuelva atrás (`QueueFake::push`). Las pruebas que dicen «después del COMMIT» o «una vuelta atrás no deja nada» fijan la conexión `mail` con el driver `database` y leen `mail_jobs`. Bajo `RefreshDatabase` eso funciona como en producción: el administrador de transacciones de prueba ejecuta lo diferido al confirmar el nivel 1 (FR-051).

### R4. Reintentos y plazo de un correo (decisión 1 del informe, aceptada)

**Decisión.**
- La espera entre intentos es de 60, 300, 900 y 3600 segundos, y después cada 3600 (`taller.mail.backoff`). El primer intento sale apenas `worker-mail` lo toma.
- El plazo (`retryUntil`) se calcula al encolar y viaja en el trabajo. Es **lo que llegue primero entre el vencimiento del link y 24 horas desde que se encoló** (`taller.mail.retry_seconds`, 86 400). Para la recuperación y la verificación (60 minutos) manda el link. Para las invitaciones (7 días o 48 horas) y los avisos sin link mandan las 24 horas.
- Vencido el plazo, el worker falla el trabajo sin llamar a `handle()` (`MaxAttemptsExceededException`): no se manda, queda en `failed_jobs` y, si era una invitación, `failed()` completa `send_failed_at`.

**Por qué.** La spec propone reintentar «hasta que venza su utilidad: la vida del link, o 24 horas si el correo no lleva uno». Leída al pie de la letra, una invitación de alumno se reintenta cada hora durante 7 días y `send_failed_at` (el «No salió» de F12b) aparece recién a la semana, cuando el link ya venció. Con el tope de 24 horas, quien administra se entera al día siguiente y puede reenviarla o pasarla a link. Ninguna de las dos manda un link vencido.

**Aceptada.** El usuario aceptó el tope de 24 horas el 2026-10-28, con el merge de este plan (#68): mergear un plan acepta sus decisiones recomendadas. `MailDeadline::for()` y `MailDeadlineTest` quedan como dice la Tarea 1.3, y F12b toma el plazo para el texto de su lista ([research-f12b.md](../023-f12-administracion/research-f12b.md), R9).

### R5. Qué queda de una falla

**Decisión.** `handle()` envuelve el envío entero. Un `Symfony\Component\Mailer\Exception\TransportExceptionInterface` se registra con `MailLog::attemptFailed()` y se relanza como `App\Mail\MailNotSent`, **sin** `previous`, con un mensaje que sólo nombra la clase corta del error y su código («El proveedor no aceptó el correo: UnexpectedResponseException 550.»).

**Por qué.** `failed_jobs.exception` guarda `(string) $exception`, que incluye el mensaje y el de cada `previous`, y no pasa por Monolog, así que el depurador de secretos de C3a no lo ve. El mensaje de un rechazo SMTP suele traer la dirección («550 5.1.1 <ana@x.com>: Recipient address rejected»). La traza no lleva argumentos, porque la imagen usa `php.ini-production`, con `zend.exception_ignore_args = On`. `failed_jobs.payload` guarda el trabajo cifrado.

### R6. Una invitación reemplazada o revocada no se manda ni se marca

**Decisión.**
- `OutgoingMail` de una invitación lleva `InvitationRef {id, tokenHash}`.
- Antes de enviar, `App\Mail\InvitationSendStatus::isCurrent()` hace `DB::table('invitations')->where('id', …)->where('token_hash', …)->value('id')`. Si la fila no existe o su token cambió (reenviada, revocada o aceptada), el trabajo termina sin enviar y sin marcar nada.
- `markSent()` y `markFailed()` son un `UPDATE` con el mismo `WHERE` que sólo escribe `sent_at` o `send_failed_at`.
- Ninguno de los tres usa Eloquent: `Invitation::find()` pide `SELECT *` y `save()` escribe `updated_at`, dos cosas que el usuario `taller_mail` no puede hacer.

**Por qué.** Si un reenvío deja corriendo el trabajo anterior, éste puede salir horas después con un link que ya responde 404, o marcar `sent_at` sobre la invitación nueva y dejarla con `sent_at` y `send_failed_at` a la vez.

**Lo que cuesta.** El usuario `taller_mail` necesita `SELECT (id, token_hash)` sobre `invitations`, y no sólo `SELECT (id)` como dice la matriz de C4 (`specs/008-c4-exposicion/data-model.md`, §3). Va como hallazgo para C4. `token_hash` es el SHA-256 de un token de 256 bits: leerlo no permite armar un link.

### R7. Modo sólo link: quién lo decide y dónde vive cada variable

**Decisión.**
- **`App\Mail\MailAvailability::isAvailable()`.** Vale `true` si `taller.mail.required` es falso o si el **transporte** del mailer por omisión (`mail.mailers.<default>.transport`) no es `log` ni `array`.
- **`App\Auth\Features`.** Reemplaza a `config('taller.features')`:
  - `passwordReset()` es la disponibilidad del correo;
  - `registration()` es `taller.registration.open` y además la disponibilidad.
- **El ancla `x-laravel-env`.** `MAIL_MAILER` y `MAIL_REQUIRED` van ahí, porque `php` y `scheduler` las necesitan para saber si hay correo. No son credenciales. Las credenciales y el servidor van sólo en `worker-mail`. No van en `x-laravel-base-env`, porque el servicio `test` lo hereda y `phpunit.xml` no pisa una variable del entorno sin `force`.
- **`phpunit.xml`.** Fija `MAIL_MAILER=array` y `MAIL_REQUIRED=true` con `force="true"`. Una prueba que necesita correo lo prende con `Tests\Support\MailWorld::available()`.
- **El worker vuelve a preguntar.** `SendMail::handle()` comprueba la disponibilidad antes de enviar. Si el taller pasó a modo sólo link con trabajos en `mail_jobs`, el trabajo falla sin enviar (`MailNotSent::unavailable()`). Así ningún cuerpo con un token llega al mailer `log` (FR-008).

### R8. `forgot-password`: el pedido no consulta la cuenta

**Decisión.**
- **El orden.** `throttle:forgot-password` (5 por minuto y 20 por hora por red, con 429) va primero. Le sigue `mail.available` (503 `mail_unavailable`, un middleware nuevo). Después vienen la validación de la forma del email (422) y el límite silencioso por email.
- **El límite por email.** Es de 3 por hora, con `RateLimiter::attempt()` sobre la clave `forgot-password:email:<sha256 del email canónico>`, que vive en la caché y no en `users`.
- **El encolado.** El controlador encola `App\Jobs\SendPasswordResetLink` (cifrado, en la cola `default`, que procesa el `scheduler`) y responde 202 con el mismo cuerpo.
- **El trabajo.** Lee la cuenta. Si no existe, no está `active` o es de un admin (Q5), no hace nada. Si no, pide el link a `PasswordResetLinks::issue()` (60 minutos; uno cada 60 s, y si ya hay uno, no hace nada) y encola el correo.

**Por qué.** El tiempo y las consultas del pedido no dependen de la cuenta (SC-002). La prueba cuenta las consultas con `DB::listen` en los dos casos y exige que ninguna nombre `users` ni `password_reset_tokens`.

**La recuperación de un tercero (FR-057 b).**
- **Dónde corre.** No pasa por ese trabajo. Quien la pide es un admin con la contraseña reconfirmada, y no hay nada que esconder. `UserController::passwordReset` llama a `PasswordResetLinks::issue()` en el pedido, encola el correo y responde 202.
- **El límite.** Si ya se emitió un link hace menos de 60 s, responde 429 `too_many_requests` con `Retry-After` en lugar de un 202 que no manda nada.
- **Lo que cambia para F12.** F12 dice «Le mandamos un enlace…», y un 202 silencioso lo haría mentir. El 429 es una corrección del supuesto de F12b.

### R9. Invitaciones por correo y el tope de 300 por día

**Decisión.**
- **`App\Auth\Delivery`.** Es un enum (`link`, `email`). `AdminInvitations::rotate()` deja de fijar `'link'`: guarda la entrega pedida y pone `sent_at` y `send_failed_at` en `null`.
- **El tope.** `App\Admin\AdminMailQuota` reserva un correo con `RateLimiter::increment('admin-mail:<id>', 86 400)`. La reserva no vale si la cuenta pasa de 300: se devuelve con `decrement` y el email recibe `rate_limited`. También se devuelve si el email resulta `user_exists` o `invitation_pending`, que no mandan nada.
- **El orden por email.** El tope se mira antes que la clasificación. Agotado el tope, cada email que sigue recibe `rate_limited`, aunque tuviera cuenta o una invitación vigente, y no se crea nada. Así lo pide el escenario 3 de la historia 1.
- **El reenvío por correo con el tope agotado.** Responde 429 `too_many_requests` con `Retry-After` (`availableIn`) **antes** de rotar el token: el link anterior sigue valiendo. Es otra corrección del supuesto de F12b, que para el reenvío sólo lista 503 y 404.

**Por qué.** Con el store `database` de la caché, `increment` es atómico. Dos pedidos simultáneos del mismo admin no pasan juntos del tope, cosa que sí podría pasar con `tooManyAttempts` seguido de `hit`.

### R10. Los avisos

| Aviso | Dónde se engancha | Cuándo sale |
| --- | --- | --- |
| Contraseña cambiada (FR-015) | `AccountPasswords::set()`, el único punto por el que pasa una contraseña nueva (`reset-password` y `PUT /api/me/password`) | Al confirmar la transacción que la guarda: los dos llamadores escriben dentro de `WriteTransaction` y la conexión `mail` tiene `after_commit`. Si la transacción vuelve atrás, no sale |
| Rol de admin (FR-057 c) | `AccountChanges::change()`, cuando la cuenta pasa de `student` a `admin` | Después de que `WriteTransaction::run` vuelve, con el cambio confirmado |
| Cuenta borrada (FR-057 d) | `PurgeUserData`, al final de la transacción que borra `users` | En el `DB::afterCommit` que ya registra `PurgeLog::done`, y sólo si la fila se borró |

**`PurgeUserData`.**
- **El cifrado.** Pasa a `ShouldBeEncrypted`.
- **El aviso.** Suma una propiedad `public ?DeletionNotice $notice = null`, que no es promovida y tiene valor por omisión. Un trabajo encolado antes de C3c se deserializa sin ella, queda con `null` y no avisa (R1 de la tabla de fuentes: un `command` sin cifrar sigue corriendo).
- **Quién lo lleva.** `AccountDeletion::request()` y `ResumePurges` lo arman con `DeletionNotice::for(User)`, que devuelve `null` si el email nunca se verificó: un aviso a una dirección que nadie confirmó podría llegarle a un tercero. `taller:reapply-deletions` llama a `PurgeUserData::dispatchSync($id)` sin aviso.

### R11. Registro abierto y verificación

**Decisión.**
- **El interruptor.** El middleware `registration.open` (`EnsureRegistrationOpen`) responde 404 `not_found` con el interruptor apagado. Va antes que cualquier otro en las tres rutas, así que apagado responde 404 aun sin sesión. Prendido y sin correo, `register` y `verification-notification` responden 503 `mail_unavailable`.
- **Los límites.** El limitador `register` tiene dos límites: 5 por hora por red, con IPv6 agrupado por /48 (`NetworkKey::wide()`, nuevo; `NetworkKey::of()` agrupa por /64), y 100 por hora en total.
- **El link de verificación.** Es `<APP_URL>/#verificar=<id>.<vence>.<firma>`. `<vence>` es un instante Unix en segundos, y `<firma>`, `hash_hmac('sha256', "<id>.<vence>.<sha256 del email canónico>", APP_KEY)`. El email entra en la firma y no en el link, así que un cambio de email invalida el link. `POST /api/auth/email/verify {token}` lo comprueba con la sesión: el id tiene que ser el de la cuenta, el instante tiene que ser futuro y la firma se compara con `hash_equals`. Vence a los 60 minutos.
- **Lo que no se usa.** Ningún GET firmado: Nginx registra la línea de cada pedido. Tampoco se usa `URL::temporarySignedRoute()`, que necesita una ruta GET.
- **El tope de 3 por hora.** `App\Auth\EmailVerifications::send()` lo aplica con `RateLimiter::attempt('verification-mail:<id>', 3, …, 3600)`. El correo que manda el registro cuenta como el primero, y el cuarto pedido de una hora recibe 429 con `Retry-After`.
- **`Registered` no se dispara nunca.** El framework le cuelga `SendEmailVerificationNotification`, que releería `users` y mandaría desde `php`. `MailArchTest` prohíbe usar `Registered`, la fachada `Notification` y la fachada `Mail` fuera de `SendMail`.

### R12. Aceptar por correo reemplaza una cuenta sin verificar (FR-021)

**Decisión.** Dentro de la transacción de `Invitations::accept()`:

1. Se bloquea la cuenta con ese email (`FOR UPDATE`).
2. Si existe y la invitación es `delivery = email` y la cuenta tiene `email_verified_at` en `null`, se la reemplaza en este orden:
   1. una fila en `account_deletions` (el libro de C3b);
   2. `DELETE FROM password_reset_tokens WHERE email = ?`;
   3. `DELETE FROM users WHERE id = ?`, que se lleva las sesiones y el resto por las claves foráneas en cascada (FR-054 de C3b).
3. Recién entonces se crea la cuenta nueva.
4. En cualquier otro caso, si la cuenta existe, 409 `email_taken` como en C3a.

**Por qué.** Borrar y crear da una identidad nueva a quien prueba que el email es suyo. El token de recuperación se borra explícitamente porque `password_reset_tokens` va por email y no por id: sin borrarlo, un token emitido para la cuenta de quien registró el email ajeno serviría para la cuenta nueva.

### R13. La poda de las cuentas nunca verificadas (FR-022)

**Decisión.** `taller:prune-unverified` corre cada hora. Toma las cuentas con `email_verified_at IS NULL`, `created_at` de hace más de 7 días y `status` distinto de `deleting`, y pide la supresión de cada una con `AccountDeletion::request()`, el camino de C3b. `DeletionNotice::for()` devuelve `null` para ellas, así que no reciben el aviso de cuenta borrada.

**Por qué alcanza con `email_verified_at`.** Las cuentas de una invitación nacen verificadas (C3a), la migración de C3a completó las anteriores y `taller:change-email` conserva la verificación. Una cuenta sin verificar sólo puede venir del registro.

### R14. Cambio de email por consola (FR-023)

**Decisión.** `taller:change-email {actual} {nuevo}`:

1. Canonicaliza los dos (`Email::canonical`) y valida el nuevo con el validador de Laravel (`email`, 254 caracteres como máximo).
2. Falla si el actual no tiene cuenta, o si el nuevo ya tiene una cuenta o una invitación. La comparación es la de la base, `utf8mb4_0900_as_ci`, que no distingue mayúsculas pero sí acentos, igual que en C3a.
3. En una `WriteTransaction`: bloquea la cuenta, cambia el email, borra el token de recuperación del email viejo y llama a `AccountSessions::endAll()` (borra las sesiones y rota el token de «recordarme»).
4. Después de confirmar, encola el aviso a las dos direcciones.

Un choque con la clave única de `users.email` entre la comprobación y el `UPDATE` falla con el mismo mensaje que «ya tiene una cuenta».

### R15. La red de `worker-mail`, su DNS y la advertencia de `APP_URL`

**Decisión.**
- **Las redes.** Hay dos nuevas: `mail` (`internal: true`, con `mysql` y `worker-mail`) y `egress` (sin `internal`, sólo con `worker-mail`). `mysql` suma la red `mail`.
- **El DNS.** `worker-mail` hereda el ancla `x-laravel-runtime` y redefine `networks: [mail, egress]` y `dns: []`, que según la medición limpia el `127.0.0.1`: así resuelve el nombre del proveedor.
- **Mailpit, en el perfil `dev`.** Entra sólo a `egress`, porque Docker no publica puertos de un contenedor que sólo está en redes internas. Publica su interfaz en `127.0.0.1:${MAILPIT_PORT:-8025}` y no comparte red con `mysql`.
- **La advertencia de `APP_URL`.** La da `App\Mail\WarnLocalAppUrl`, un listener de `WorkerStarting` que sólo mira la conexión `mail`. Si el host de `APP_URL` es `localhost`, `127.0.0.1`, `::1`, `0.0.0.0` o termina en `.localhost`, deja `mail.app_url_local` como advertencia en stderr.

**Alternativas.** `dns: !reset []` (no limpia el ancla, según la medición); un script previo al worker para advertir (suma un archivo y un `sh -c` en el comando).

### R16. El usuario de MySQL del correo: el mecanismo de C4, sólo para `taller_mail`

**Decisión.** C3c implementa ahora la parte de `taller_mail` del mecanismo que diseñó el plan de C4 (su R13 y su T014), con los mismos nombres de archivos, marcadores y fases, para que C4 lo extienda en lugar de reemplazarlo:

- **El SQL.** `docker/mysql/db-grants.sql` pasa a tener dos secciones, `-- @phase users` y `-- @phase tables`, y el marcador `@@MAIL_DB_PASSWORD@@`.
  - `users`: `CREATE USER IF NOT EXISTS 'taller_mail'@'%'`, `ALTER USER … IDENTIFIED BY`, y la línea de C3a para `taller` sobre `performance_schema.events_transactions_current`, sin cambios.
  - `tables`: los permisos de `taller_mail` por tabla y por columna.
- **El script.** `docker/mysql/apply-grants.sh [--phase users|tables|all] [--host <nombre>]` valida `MAIL_DB_PASSWORD` (`[A-Za-z0-9._~-]{24,128}`), reemplaza el marcador, antepone `SET SESSION sql_log_bin = 0;` y `SET SESSION lock_wait_timeout = 5;` y entrega el SQL a `mysql -uroot` por la entrada estándar. C4 suma sus cuatro contraseñas a la lista de validación.
- **Un volumen nuevo.** `docker/mysql/10-db-grants.sh` corre la fase `users` en el inicio y reemplaza al `10-db-grants.sql` que hoy se monta tal cual, que con un marcador crearía la cuenta con la contraseña literal `@@MAIL_DB_PASSWORD@@`.
- **El arranque.** `grants`, un servicio sin perfil y de una sola corrida, aplica **las dos fases** después de `migrate`, y `worker-mail` depende de él. MySQL no concede permisos sobre una tabla que no existe salvo con `CREATE`: por eso los permisos van después de `migrate`.
  - **Por qué las dos fases.** Con un volumen de antes de C3c, que no tiene `taller_mail`, una fase `tables` sola fallaría (un `GRANT` no crea la cuenta) y `worker-mail` no arrancaría con el `docker compose up --build -d --wait` que documenta `AGENTS.md`. El plan de C4 corre sólo `tables`, porque su arranque crea las cuentas antes. C4 puede volver a eso.
  - **La contraseña de root.** El script la pasa en un archivo de opciones temporal (`--defaults-extra-file`, `umask 077`) y no en `MYSQL_PWD`, desaconsejada desde MySQL 8.0, aunque el cliente 9.7.2 de la imagen todavía la nombra. Nunca va en `-p`.
  - **Sin `exec`.** `10-db-grants.sh` y las entradas de Compose llaman al script con `sh`, sin depender del bit de ejecución: el inicio de MySQL sourcea un `.sh` que no es ejecutable.
- **Un volumen existente.** `db-grants` (perfil `ops`) corre las dos fases. `deploy.sh` lo corre en cada despliegue, después de `migrate`. Es idempotente y además sincroniza la contraseña de `.env`.

**Los permisos** (FR-005, más R6):

| Objeto | Permisos de `taller_mail` |
| --- | --- |
| `taller.mail_jobs` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `taller.failed_jobs` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `taller.invitations` | `SELECT (id, token_hash)`, `UPDATE (sent_at, send_failed_at)` |
| Todo lo demás | nada: ni `users`, `sessions`, `password_reset_tokens`, DDL, `GRANT`, `FILE` ni `PROCESS` |

**Lo que no se hace.** Una contraseña en la línea de comandos, en el SQL versionado o en el binlog.

### R17. La prueba del usuario restringido (FR-005)

**Decisión.** La prueba `tests/Content/MailUserPrivilegesTest.php` va en la suite `Content`, con `DatabaseTruncation`, porque `CREATE USER` confirma y una segunda conexión no ve lo que `RefreshDatabase` no confirmó. Hace esto:

1. **Lee los permisos del archivo real.** La etapa `dev` del `Dockerfile` copia `docker/mysql/db-grants.sql` a `tests/Fixtures/db-grants.sql` (`COPY --from=repo`, como `qa/fixtures/shared`). `Tests\Support\MailGrants::clauses()` extrae las cláusulas de `taller_mail` de la fase `tables` y cambia `` `taller`. `` por la base de la prueba.
2. **Crea la cuenta.** Lo hace con `RestrictedMysqlUser::create()` de C3a, que suma un parámetro `?string $database`.
3. **Compara con la lista.** Los esperados salen de la lista de FR-005 escrita en la prueba, no del SQL.
4. **Corre el worker de verdad con ese usuario.** Usa `Artisan::call('queue:work', ['connection' => 'mail', '--once' => true, …])`, con la conexión de la cola y la de `failed_jobs` apuntando al usuario restringido: envía, marca `sent_at` y, ante un proveedor que falla, escribe `failed_jobs` y `send_failed_at`.

### R18. El texto de los correos

**Decisión.**
- **El formato.** Ocho tipos (`App\Mail\MailKind`), con asunto y cuerpo en `lang/es/mail.php` ([contracts/mail.md](./contracts/mail.md)). Texto plano, con el link solo en su renglón y el vencimiento como fecha y hora absolutas en `America/Argentina/Buenos_Aires` (`taller.mail.timezone`), con la leyenda «hora de Argentina».
- **El remitente.** Es `mail.from`.
- **Lo que no llevan.** Ningún correo lleva una contraseña, HTML ni imágenes.

**Por qué absoluta.** Un correo puede llegar tarde, después de varios reintentos. «Vence en 60 minutos» mentiría, y la hora UTC del servidor confunde.

**El rastreo de clics** reescribiría el link y le entregaría el token a un tercero más. El texto plano no lleva píxel. Que Brevo no reescriba los links de un correo de texto no figura en su documentación pública, así que lo confirma el envío real a tres buzones (T037): el link recibido tiene que empezar por `APP_URL`.

### R19. Brevo por SMTP

**Decisión.**
- **Las variables.** `MAIL_MAILER=smtp`. `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME` y `MAIL_PASSWORD` (la clave SMTP, no una clave de API) se copian de la página «SMTP & API» de la cuenta. El ejemplo de Postfix de Brevo usa `smtp-relay.brevo.com:587`.
- **TLS obligatorio.** `MAIL_REQUIRE_TLS` vale `true` por omisión, así que en el 587 STARTTLS es obligatorio y una credencial nunca viaja en claro. Sólo el perfil `dev` lo apaga, porque Mailpit no ofrece TLS.
- **Sin paquetes.** No se suma ningún paquete: `symfony/mailer` v8.1.7 ya está en `composer.lock`.

### R20. Pruebas contra el stack (FR-052)

**Decisión.** `backend/api/scripts/check-mail.sh` corre contra un stack levantado y elige su modo según si `mailpit` está corriendo:

- **Con Mailpit** (perfil `dev`, con el permiso de T002):
  1. un admin de prueba invita por correo a `check-mail-<azar>@taller.invalid`;
  2. el script busca el mensaje en `GET /api/v1/search?query=to:"…"`, lee su `Text` y extrae el link;
  3. comprueba que empieza por `APP_URL` y lleva `#invitacion=`;
  4. lo «abre» con `POST /api/auth/invitations/lookup`, que responde 200;
  5. lee `sent_at` de la fila;
  6. repite con `forgot-password` (que espera al `scheduler`, hasta 3 minutos) y `reset-password`.
- **Sin Mailpit** (`MAIL_REQUIRED=false` y el mailer `log`): `sent_at` se completa, los registros de `worker-mail` no tienen ningún `#invitacion=` con un token ni un email en claro, y el script avisa que «el link abre» queda como verificación manual, que es el límite que admite FR-052.

El escenario del proveedor caído (`MAIL_HOST` sin servidor, `MAIL_RETRY_SECONDS=20` y `MAIL_BACKOFF=5`) está en [quickstart.md](./quickstart.md), y deja `send_failed_at` en menos de un minuto.
