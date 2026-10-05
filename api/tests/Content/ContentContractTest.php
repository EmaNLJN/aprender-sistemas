<?php

use App\Content\ContentSnapshot;
use App\Content\Portion;
use App\Content\PortionRenderer;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\Support\ContentFixture;

// FR-038. The expected hashes are the ones in curriculum.meta.json, which Node computed over
// JSON.stringify: an oracle independent of the PHP code under test.
afterEach(fn () => ContentFixture::cleanup());

it('assembles from the tables each of the 17 portions and every exercise with the generator hashes', function () {
    expect(Artisan::call('content:import'))->toBe(0);
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
    expect(Artisan::call('content:import'))->toBe(0);
    $fixture = ContentFixture::fromImage();
    $gone = $fixture->unreferencedLabExercise();
    config(['content.path' => $fixture->withoutExercise($gone)->write()]);
    expect(Artisan::call('content:import'))->toBe(0);

    $lab = json_decode(app(PortionRenderer::class)->render(Portion::LabRust));

    expect(array_column($lab, 'id'))->not->toContain($gone)
        ->and(app(PortionRenderer::class)->renderExercise($gone))->toBeNull()
        ->and(DB::table('exercises')->where('id', $gone)->value('status'))->toBe('deprecated');
});

it('a snapshot reads one import even if another commits in the middle, and accepts no writes', function () {
    expect(Artisan::call('content:import'))->toBe(0);
    $other = DB::connectUsing('other', config('database.connections.mysql'), true);

    [$before, $during] = ContentSnapshot::read(function () use ($other) {
        $before = DB::table('content_imports')->count();
        $other->table('content_imports')->insert(['document_hash' => str_repeat('a', 64), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => '2026-10-05 00:00:00.000']);

        return [$before, DB::table('content_imports')->count()];
    });

    expect([$before, $during])->toBe([1, 1])
        ->and(DB::table('content_imports')->count())->toBe(2)
        ->and(fn () => ContentSnapshot::read(fn () => DB::table('languages')->update(['position' => 9])))->toThrow(QueryException::class, 'READ ONLY');
});
