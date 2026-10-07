<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    Route::prefix('api')->group(function () {
        Route::post('/probe/validate', fn (Request $request) => $request->validate(['email' => 'required|email', 'name' => 'required']));
        Route::get('/probe/throttled', fn () => 'ok')->middleware('throttle:1,1');
        Route::get('/probe/boom', fn () => throw new RuntimeException('secret detail in /var/www/app/Boom.php'));
        Route::get('/probe/teapot', fn () => throw new HttpException(418));
        Route::get('/probe/auth', fn () => 'ok')->middleware('auth');
        Route::get('/probe/csrf', fn () => throw new TokenMismatchException);
        Route::get('/probe/forbidden', fn () => throw new AuthorizationException);
    });
});

it('answers 404 not_found in Spanish to an unknown route', function () {
    $this->get('/api/no-existe')
        ->assertNotFound()
        ->assertExactJson(['message' => 'No existe lo que pedís.', 'code' => 'not_found']);
});

it('answers 405 with Allow and method_not_allowed', function () {
    $this->post('/api/up')
        ->assertStatus(405)
        ->assertHeader('Allow')
        ->assertExactJson(['message' => 'Ese método no está permitido en esta ruta.', 'code' => 'method_not_allowed']);
});

it('answers 422 validation_failed with the errors per field', function () {
    $this->postJson('/api/probe/validate', ['email' => 'no-email'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonPath('message', 'Hay datos que corregir.')
        ->assertJsonStructure(['errors' => ['email', 'name']]);
});

it('answers 429 too_many_requests with Retry-After', function () {
    $this->get('/api/probe/throttled')->assertOk();

    $this->get('/api/probe/throttled')
        ->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertJsonPath('code', 'too_many_requests')
        ->assertJsonPath('message', 'Demasiados intentos. Esperá un momento antes de volver a probar.');
});

it('answers 500 server_error with no trace even with APP_DEBUG on', function () {
    config(['app.debug' => true]);

    $response = $this->get('/api/probe/boom');

    $response->assertStatus(500)
        ->assertExactJson(['message' => 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.', 'code' => 'server_error']);
    expect($response->getContent())->not->toContain('secret detail');
});

it('keeps the original 4xx status of an unlisted HttpException as bad_request', function () {
    $this->get('/api/probe/teapot')
        ->assertStatus(418)
        ->assertExactJson(['message' => 'No se pudo entender el pedido.', 'code' => 'bad_request']);
});

it('answers 401 unauthenticated in JSON to a guest without Accept instead of failing on a missing login route', function () {
    $this->get('/api/probe/auth')
        ->assertUnauthorized()
        ->assertHeader('Content-Type', 'application/json')
        ->assertExactJson(['message' => 'Iniciá sesión para continuar.', 'code' => 'unauthenticated']);
});

it('answers 419 csrf_token_mismatch to a TokenMismatchException', function () {
    $this->get('/api/probe/csrf')
        ->assertStatus(419)
        ->assertExactJson(['message' => 'La página venció: recargala e intentá de nuevo.', 'code' => 'csrf_token_mismatch']);
});

it('answers 403 forbidden to an AuthorizationException', function () {
    $this->get('/api/probe/forbidden')
        ->assertForbidden()
        ->assertExactJson(['message' => 'No tenés permiso para hacer esto.', 'code' => 'forbidden']);
});
