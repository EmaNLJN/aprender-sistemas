<?php

namespace App\Progress\Sync;

use RuntimeException;

final class ClientOutdated extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('El formato del pedido no es uno de los que acepta el servidor.');
    }
}
