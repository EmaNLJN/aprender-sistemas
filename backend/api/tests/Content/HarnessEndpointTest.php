<?php

use App\Content\Portion;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Tests\Support\ContentFixture;

beforeEach(fn () => $this->actingAs(User::factory()->create()));

afterEach(fn () => ContentFixture::cleanup());

function importHarnessContent(): array
{
    Artisan::call('content:import');

    return ContentFixture::fromImage()->meta;
}

it('answers 503 while there is no import', function () {
    $this->get('/api/harness')->assertStatus(503)->assertJson(['code' => 'content_not_imported']);
});

it('serves the harness with the bytes of the generator file and the headers of the other portions', function () {
    $meta = importHarnessContent();

    $response = $this->get('/api/harness');

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/json')
        ->assertHeader('ETag', '"'.substr($meta['portions']['harness'], 0, 32).'"')
        ->assertHeader('Content-Version', substr($meta['documentHash'], 0, 32));
    expect($response->getContent())->toBe(file_get_contents(ContentFixture::imagePath().'/harness.json'))
        ->and($response->headers->get('Cache-Control'))->toContain('private')->toContain('no-cache')
        ->and(array_keys($response->json()))->toBe(['rust', 'go']);
});

it('answers 304 without a body when If-None-Match is the ETag', function () {
    $meta = importHarnessContent();

    $response = $this->withHeaders(['If-None-Match' => '"'.substr($meta['portions']['harness'], 0, 32).'"'])->get('/api/harness');

    $response->assertStatus(304);
    expect($response->getContent())->toBe('');
});

it('ignores the query parameters', function () {
    importHarnessContent();

    $plain = $this->get('/api/harness')->getContent();
    $withQuery = $this->get('/api/harness?language=rust&domain=pc&catalog=lab')->getContent();

    expect($withQuery)->toBe($plain);
});

it('changes the ETag but not Content-Version when only the template changes', function () {
    importHarnessContent();
    $before = $this->get('/api/harness');
    $fixture = ContentFixture::fromImage();
    $fixture->harness->go .= "// edited\n";
    config(['content.path' => $fixture->write()]);
    Artisan::call('content:import');

    $after = $this->get('/api/harness');

    expect($after->headers->get('ETag'))->not->toBe($before->headers->get('ETag'))
        ->and($after->headers->get('Content-Version'))->toBe($before->headers->get('Content-Version'))
        ->and($after->json('go'))->toEndWith("// edited\n")
        ->and(Portion::Harness->value)->toBe('harness');
});
