<?php

use Illuminate\Support\Facades\Artisan;
use Tests\Support\Browser;
use Tests\Support\ContentDatabase;
use Tests\Support\ContentFixture;

beforeEach(fn () => $this->browser = Browser::for($this)->useDatabaseDrivers());

afterEach(fn () => ContentFixture::cleanup());

it('publishes the version of the latest import and the catalogs of the generator meta, none of them with a position, by code', function () {
    Artisan::call('content:import');
    $meta = ContentFixture::fromImage()->meta;

    $response = $this->browser->get('/api/session');

    $metaCatalogs = collect($meta['catalogs'])->keyBy('code');
    $response->assertOk()
        ->assertJsonPath('contentVersion', substr($meta['documentHash'], 0, 32))
        ->assertJsonPath('catalogs', [$metaCatalogs['cores'], $metaCatalogs['lab'], $metaCatalogs['quests']]);
});

it('answers without touching the content tables that carry the body', function () {
    Artisan::call('content:import');
    $this->browser->get('/api/session');

    $queries = ContentDatabase::queriesDuring(fn () => $this->browser->get('/api/session')->assertOk());

    $touched = collect($queries)->filter(fn (string $sql) => preg_match('/`(exercises|topics|workshops)`/', $sql) === 1);
    expect($touched->all())->toBe([]);
});

it('reads only the hash of the latest import and never decodes the portion hashes', function () {
    Artisan::call('content:import');
    $this->browser->get('/api/session');

    $queries = ContentDatabase::queriesDuring(fn () => $this->browser->get('/api/session')->assertOk());

    $importReads = collect($queries)->filter(fn (string $sql) => str_contains($sql, 'content_imports'));
    expect($importReads->every(fn (string $sql) => ! str_contains($sql, 'portion_hashes')))->toBeTrue();
});
