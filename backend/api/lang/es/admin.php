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
    'users' => [
        'page' => 'La página tiene que ser un número desde 1.',
        'per_page' => 'La cantidad por página tiene que ser un número de 1 a 100.',
        'q' => 'La búsqueda puede tener hasta 80 caracteres.',
        'role' => 'El rol tiene que ser admin o estudiante.',
        'status' => 'El estado tiene que ser activo, deshabilitado o en borrado.',
        'sort' => 'El orden tiene que ser nombre, email, rol, estado o fecha de alta, con un guion adelante para invertirlo.',
    ],
];
