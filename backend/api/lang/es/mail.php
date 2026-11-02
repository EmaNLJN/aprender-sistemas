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
