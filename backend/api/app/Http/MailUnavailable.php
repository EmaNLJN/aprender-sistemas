<?php

namespace App\Http;

use Illuminate\Http\Exceptions\HttpResponseException;

final class MailUnavailable extends HttpResponseException
{
    public function __construct()
    {
        parent::__construct(ApiError::of(ApiCode::MailUnavailable, headers: ['Retry-After' => '3600']));
    }
}
