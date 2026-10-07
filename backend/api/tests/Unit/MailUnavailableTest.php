<?php

use App\Http\MailUnavailable;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

uses(TestCase::class);

it('renders 503 with the code, the Spanish message and a one hour Retry-After', function () {
    Route::middleware('api')->prefix('api')->get('/probe/mail', fn () => throw new MailUnavailable);

    $this->getJson('/api/probe/mail')
        ->assertStatus(503)
        ->assertExactJson(['message' => 'El taller no puede mandar correos por ahora.', 'code' => 'mail_unavailable'])
        ->assertHeader('Retry-After', '3600');
});
