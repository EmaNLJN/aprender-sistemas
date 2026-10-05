<?php

it('does not enable CORS for another origin', function () {
    $this->withHeaders(['Origin' => 'https://otro.example'])
        ->get('/api/up')
        ->assertOk()
        ->assertHeaderMissing('Access-Control-Allow-Origin');
});

it('does not answer a CORS preflight', function () {
    $this->call('OPTIONS', '/api/up', [], [], [], [
        'HTTP_ORIGIN' => 'https://otro.example',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ])->assertHeaderMissing('Access-Control-Allow-Origin');
});
