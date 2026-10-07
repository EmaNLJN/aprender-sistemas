<?php

namespace App\Progress;

use App\Http\ApiError;
use Illuminate\Http\Exceptions\HttpResponseException;

final class ContentNotImported extends HttpResponseException
{
    public function __construct()
    {
        parent::__construct(ApiError::response(503, 'content_not_imported', 'Todavía no hay contenido importado.', headers: ['Retry-After' => '60']));
    }
}
