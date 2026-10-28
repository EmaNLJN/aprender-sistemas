# Contrato de los correos de C3c

**Input**: [spec.md](../spec.md) (FR-009, FR-010 y SC-001), ADR 0006 §4.8 y D21, y [research.md](../research.md), R2 y R18.

Hay ocho correos, y ninguno más. Este archivo es la fuente de sus textos: `lang/es/mail.php` los copia y las pruebas toman de acá lo que esperan.

## Reglas comunes

- **El formato.** Texto plano en UTF-8, con una sola parte `text/plain`. Sin HTML, imágenes ni adjuntos, y sin rastreo de aperturas ni de clics.
- **El remitente.** Es `MAIL_FROM_NAME <MAIL_FROM_ADDRESS>`, una dirección del dominio autenticado con SPF y DKIM (acción del usuario).
- **El destinatario.** Va sólo con la dirección, sin nombre a la vista. Cada correo tiene un solo destinatario.
- **El asunto.** Es fijo para cada tipo y no lleva datos de la persona.
- **El link** se arma desde `APP_URL` y nunca desde el `Host` del pedido. Va solo en su renglón y lleva el token en el fragmento, nunca en la ruta ni en la query.
- **El vencimiento** se escribe en `America/Argentina/Buenos_Aires`, con la forma `d/m/Y a las H:i`, por ejemplo «12/10/2026 a las 15:30».
- **Ningún correo** lleva una contraseña ni un dato del progreso del alumno.

**La forma del cuerpo** es siempre esta. Las líneas entre corchetes faltan cuando el tipo no tiene link:

```text
<saludo>

<texto>
[
<link>

<vencimiento>]

<cierre>

—
Taller Rust y Go
Este correo se mandó solo: no respondas a esta dirección.
```

- **El saludo** es `Hola, <nombre>:` si se conoce el nombre, y `Hola:` si no. La invitación siempre usa `Hola:`.
- **Entre bloques** va una línea en blanco, y el texto termina con un salto de línea.

## Los ocho correos

| Tipo | Asunto | Texto | Link | Vencimiento | Cierre |
| --- | --- | --- | --- | --- | --- |
| `invitation` | Te invitaron al Taller Rust y Go | Te invitaron a crear tu cuenta en el Taller Rust y Go. Para aceptar, abrí este enlace y elegí tu nombre y tu contraseña: | `<APP_URL>/#invitacion=<token>` | El enlace vence el :expires (hora de Argentina) y sirve una sola vez. | Si no esperabas esta invitación, ignorá este correo: sin el enlace no se crea ninguna cuenta. |
| `password_reset` | Elegí otra contraseña para el Taller Rust y Go | Alguien pidió elegir otra contraseña para tu cuenta del Taller Rust y Go. Si fuiste vos, abrí este enlace: | `<APP_URL>/#restablecer=<token>&email=<email codificado>` | El enlace vence el :expires (hora de Argentina) y sirve una sola vez. | Si no lo pediste, ignorá este correo: tu contraseña sigue siendo la misma. |
| `password_changed` | Cambió la contraseña de tu cuenta del taller | La contraseña de tu cuenta del Taller Rust y Go acaba de cambiar, y las demás sesiones se cerraron. | — | — | Si fuiste vos, no tenés que hacer nada. Si no lo hiciste, avisale enseguida a quien administra el taller. |
| `admin_role` | Ahora administrás el Taller Rust y Go | Tu cuenta del Taller Rust y Go ahora tiene el rol de admin: podés invitar personas y administrar las cuentas. | — | — | Si no esperabas este cambio, avisale a quien administra el taller. |
| `account_deleted` | Borramos tu cuenta del Taller Rust y Go | Tu cuenta del Taller Rust y Go y sus datos se borraron. | — | — | Si no lo pediste, avisale a quien administra el taller. |
| `email_verification` | Confirmá tu email para el Taller Rust y Go | Para terminar de crear tu cuenta en el Taller Rust y Go, confirmá que este email es tuyo: abrí este enlace con la sesión iniciada. | `<APP_URL>/#verificar=<id>.<vence>.<firma>` | El enlace vence el :expires (hora de Argentina). | Si no creaste una cuenta, ignorá este correo: una cuenta sin confirmar se borra sola a los 7 días. |
| `email_changed` | Cambió el email de tu cuenta del taller | El email de tu cuenta del Taller Rust y Go cambió. Desde ahora ingresás con la dirección nueva, y las sesiones abiertas se cerraron. | — | — | Si no lo pediste, avisale enseguida a quien administra el taller. |
| `registration_attempt` | Alguien intentó crear una cuenta con tu email | Alguien intentó crear una cuenta nueva en el Taller Rust y Go con este email, que ya tiene una. No se creó nada. | — | — | Si fuiste vos, ingresá con tu cuenta; si olvidaste la contraseña, pedí otra desde la pantalla de ingreso. Si no fuiste vos, no tenés que hacer nada. |

## `lang/es/mail.php`

```php
<?php

return [
    'greeting' => 'Hola, :name:',
    'greeting_anonymous' => 'Hola:',
    'signature' => "—\nTaller Rust y Go\nEste correo se mandó solo: no respondas a esta dirección.",
    'expires_format' => 'd/m/Y \a \l\a\s H:i',
    'invitation' => [
        'subject' => 'Te invitaron al Taller Rust y Go',
        'body' => 'Te invitaron a crear tu cuenta en el Taller Rust y Go. Para aceptar, abrí este enlace y elegí tu nombre y tu contraseña:',
        'expires' => 'El enlace vence el :expires (hora de Argentina) y sirve una sola vez.',
        'closing' => 'Si no esperabas esta invitación, ignorá este correo: sin el enlace no se crea ninguna cuenta.',
    ],
    'password_reset' => [
        'subject' => 'Elegí otra contraseña para el Taller Rust y Go',
        'body' => 'Alguien pidió elegir otra contraseña para tu cuenta del Taller Rust y Go. Si fuiste vos, abrí este enlace:',
        'expires' => 'El enlace vence el :expires (hora de Argentina) y sirve una sola vez.',
        'closing' => 'Si no lo pediste, ignorá este correo: tu contraseña sigue siendo la misma.',
    ],
    'password_changed' => [
        'subject' => 'Cambió la contraseña de tu cuenta del taller',
        'body' => 'La contraseña de tu cuenta del Taller Rust y Go acaba de cambiar, y las demás sesiones se cerraron.',
        'closing' => 'Si fuiste vos, no tenés que hacer nada. Si no lo hiciste, avisale enseguida a quien administra el taller.',
    ],
    'admin_role' => [
        'subject' => 'Ahora administrás el Taller Rust y Go',
        'body' => 'Tu cuenta del Taller Rust y Go ahora tiene el rol de admin: podés invitar personas y administrar las cuentas.',
        'closing' => 'Si no esperabas este cambio, avisale a quien administra el taller.',
    ],
    'account_deleted' => [
        'subject' => 'Borramos tu cuenta del Taller Rust y Go',
        'body' => 'Tu cuenta del Taller Rust y Go y sus datos se borraron.',
        'closing' => 'Si no lo pediste, avisale a quien administra el taller.',
    ],
    'email_verification' => [
        'subject' => 'Confirmá tu email para el Taller Rust y Go',
        'body' => 'Para terminar de crear tu cuenta en el Taller Rust y Go, confirmá que este email es tuyo: abrí este enlace con la sesión iniciada.',
        'expires' => 'El enlace vence el :expires (hora de Argentina).',
        'closing' => 'Si no creaste una cuenta, ignorá este correo: una cuenta sin confirmar se borra sola a los 7 días.',
    ],
    'email_changed' => [
        'subject' => 'Cambió el email de tu cuenta del taller',
        'body' => 'El email de tu cuenta del Taller Rust y Go cambió. Desde ahora ingresás con la dirección nueva, y las sesiones abiertas se cerraron.',
        'closing' => 'Si no lo pediste, avisale enseguida a quien administra el taller.',
    ],
    'registration_attempt' => [
        'subject' => 'Alguien intentó crear una cuenta con tu email',
        'body' => 'Alguien intentó crear una cuenta nueva en el Taller Rust y Go con este email, que ya tiene una. No se creó nada.',
        'closing' => 'Si fuiste vos, ingresá con tu cuenta; si olvidaste la contraseña, pedí otra desde la pantalla de ingreso. Si no fuiste vos, no tenés que hacer nada.',
    ],
];
```

`expires_format` es un formato de `DateTimeInterface::format`: las barras invertidas escapan las letras de «a las». `MailText` reemplaza `:name` y `:expires` con `__()`. El reemplazo de Laravel se hace en una sola pasada (`strtr`), así que un nombre que contenga `:expires` no se vuelve a reemplazar.

## Un ejemplo resuelto

Es la recuperación de Ana Pérez (`ana@x.com`), con `APP_URL=https://taller.example`, un token `abc123` de ejemplo y el link emitido el 2026-10-12 a las 18:30 UTC. Vence a las 19:30 UTC, que son las 16:30 en Buenos Aires (UTC−3).

```text
Hola, Ana Pérez:

Alguien pidió elegir otra contraseña para tu cuenta del Taller Rust y Go. Si fuiste vos, abrí este enlace:

https://taller.example/#restablecer=abc123&email=ana%40x.com

El enlace vence el 12/10/2026 a las 16:30 (hora de Argentina) y sirve una sola vez.

Si no lo pediste, ignorá este correo: tu contraseña sigue siendo la misma.

—
Taller Rust y Go
Este correo se mandó solo: no respondas a esta dirección.
```

`MailTextTest` compara este texto completo, escrito a mano en la prueba, con lo que arma `MailText::body()`. Para los otros siete compara el asunto y que el cuerpo empiece con el saludo y contenga el texto, el link y el cierre de la tabla.
