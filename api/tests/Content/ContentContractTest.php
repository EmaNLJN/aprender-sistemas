<?php

use App\Content\Portion;
use App\Content\PortionRenderer;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\Support\ContentFixture;

// FR-038. The expected hashes are the ones in curriculum.meta.json, which Node computed over
// JSON.stringify: an oracle independent of the PHP code under test.
afterEach(fn () => ContentFixture::cleanup());

it('assembles from the tables each of the 17 portions and the 274 exercises with the generator hashes', function () {
    Artisan::call('content:import');
    $meta = json_decode(file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true);
    $renderer = app(PortionRenderer::class);

    $wrongPortions = [];
    foreach (Portion::cases() as $portion) {
        if (hash('sha256', $renderer->render($portion)) !== $meta['portions'][$portion->value]) {
            $wrongPortions[] = $portion->value;
        }
    }
    $wrongExercises = [];
    foreach ($meta['exercises'] as $id => $hashes) {
        if (hash('sha256', (string) $renderer->renderExercise($id)) !== $hashes['contentHash']) {
            $wrongExercises[] = $id;
        }
    }

    expect($wrongPortions)->toBe([])->and($wrongExercises)->toBe([]);
});

it('what is retired leaves the portions and renderExercise does not assemble it', function () {
    Artisan::call('content:import');
    $fixture = ContentFixture::fromImage();
    $gone = $fixture->unreferencedLabExercise();
    config(['content.path' => $fixture->withoutExercise($gone)->write()]);
    Artisan::call('content:import');

    $lab = json_decode(app(PortionRenderer::class)->render(Portion::LabRust));

    expect(array_column($lab, 'id'))->not->toContain($gone)
        ->and(app(PortionRenderer::class)->renderExercise($gone))->toBeNull()
        ->and(DB::table('exercises')->where('id', $gone)->value('status'))->toBe('deprecated');
});
