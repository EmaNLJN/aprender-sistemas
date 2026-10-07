<?php

return [
    'emails' => [
        'required' => 'Indicá al menos un email para invitar.',
        'array' => 'Los emails tienen que ser una lista.',
        'min' => 'Indicá al menos un email para invitar.',
        'max' => 'Se pueden invitar hasta :max emails por pedido.',
    ],
    'email' => [
        'required' => 'El email es obligatorio.',
        'string' => 'El email debe ser texto.',
        'email' => 'Este email no es válido.',
        'max' => 'Un email no puede tener más de :max caracteres.',
        'distinct' => 'Este email está repetido en el pedido.',
    ],
    'role' => [
        'required' => 'Elegí el rol de la invitación.',
        'enum' => 'El rol tiene que ser admin o student.',
    ],
    'delivery' => [
        'required' => 'Elegí cómo se entrega la invitación.',
        'in' => 'La entrega tiene que ser link o email.',
    ],
    'state' => [
        'in' => 'El estado tiene que ser pending o expired.',
    ],
    'page' => [
        'integer' => 'La página tiene que ser un número entero.',
        'min' => 'La página empieza en :min.',
    ],
    'per_page' => [
        'integer' => 'La cantidad por página tiene que ser un número entero.',
        'between' => 'La cantidad por página va de :min a :max.',
    ],
];
