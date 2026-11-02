<?php

return [
    'nothing_to_change' => 'Indicá el rol o el estado.',
    'invalid_role' => 'El rol tiene que ser admin o estudiante.',
    'invalid_status' => 'El estado tiene que ser activo o deshabilitado.',
    'restricts_itself' => [
        'status' => 'No podés deshabilitar tu propia cuenta.',
        'role' => 'No podés quitarte el rol de admin.',
    ],
    'being_deleted' => 'La cuenta se está borrando: ya no se puede cambiar.',
    'password_reset' => [
        'admin' => 'La recuperación de un admin sale sólo por la consola del taller.',
        'not_active' => 'Sólo se puede recuperar el acceso de una cuenta activa.',
    ],
    'users' => [
        'page' => 'La página tiene que ser un número desde 1.',
        'per_page' => 'La cantidad por página tiene que ser un número de 1 a 100.',
        'q' => 'La búsqueda puede tener hasta 80 caracteres.',
        'role' => 'El rol tiene que ser admin o estudiante.',
        'status' => 'El estado tiene que ser activo, deshabilitado o en borrado.',
        'sort' => 'El orden tiene que ser nombre, email, rol, estado o fecha de alta, con un guion adelante para invertirlo.',
    ],
    'stats' => [
        'from' => 'La fecha de inicio tiene que ser una fecha AAAA-MM-DD, y va junto con la de fin.',
        'to' => 'La fecha de fin tiene que ser una fecha AAAA-MM-DD, no anterior a la de inicio, y va junto con la de inicio.',
        'too_long' => 'El período puede tener hasta 366 días.',
        'granularity' => 'El intervalo tiene que ser day, week o month.',
        'catalog' => 'El catálogo no existe.',
        'language' => 'El lenguaje tiene que ser rust o go.',
        'level' => 'El nivel tiene que ser beginner, medium, advanced o expert.',
    ],
];
