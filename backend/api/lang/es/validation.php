<?php

return [
    'required' => 'El campo :attribute es obligatorio.',
    'string' => 'El campo :attribute debe ser texto.',
    'email' => 'El campo :attribute debe ser un email válido.',
    'boolean' => 'El campo :attribute debe ser verdadero o falso.',
    'confirmed' => 'La confirmación de :attribute no coincide.',
    'min' => [
        'string' => 'El campo :attribute debe tener al menos :min caracteres.',
    ],
    'max' => [
        'string' => 'El campo :attribute no puede tener más de :max caracteres.',
    ],
    'custom' => [
        'name' => [
            'regex' => 'El nombre no puede tener caracteres de control.',
            'not_regex' => 'El nombre no puede tener caracteres de control.',
        ],
        'password_confirmation' => [
            'same' => 'La confirmación de la contraseña no coincide.',
        ],
        'privacyVersion' => [
            'in' => 'Esa no es la versión vigente del aviso de privacidad.',
        ],
    ],
    'attributes' => [
        'email' => 'email',
        'password' => 'contraseña',
        'current_password' => 'contraseña actual',
        'password_confirmation' => 'confirmación de la contraseña',
        'privacyVersion' => 'versión del aviso de privacidad',
        'name' => 'nombre',
        'token' => 'token',
    ],
];
