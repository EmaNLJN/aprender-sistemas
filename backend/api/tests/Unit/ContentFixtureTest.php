<?php

use App\Content\ContentSource;
use App\Content\Portion;
use Illuminate\Support\Arr;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

// Ties PublishedJson and the copy's canonical JSON to the generator (tools/content/meta.ts): with
// the content untouched, the meta PHP recomputes must be the one Node wrote.
it('reproduces the generator meta when the content does not change', function () {
    $fixture = ContentFixture::fromImage();
    $original = $fixture->meta;

    $meta = $fixture->recomputedMeta($fixture->documentText());

    expect($meta['portions'])->toBe($original['portions'])
        ->and($meta['exercises'])->toBe($original['exercises'])
        ->and($meta['documentHash'])->toBe($original['documentHash']);
});

it('writes a pair that ContentSource accepts', function () {
    $fixture = ContentFixture::fromImage();
    $fixture->document->guide->sources[0]->note = 'New note';

    $source = ContentSource::fromDirectory($fixture->write());

    expect($source->part(Portion::Guide)->sources[0]->note)->toBe('New note');
});

it('recomputes the hashes of what is edited and only of that', function () {
    $fixture = ContentFixture::fromImage();
    $original = $fixture->meta;
    $fixture->exercise('rust-01')->title = 'Another title';

    $directory = $fixture->write();
    $meta = json_decode(file_get_contents("{$directory}/curriculum.meta.json"), true, 512, JSON_THROW_ON_ERROR);

    expect($meta['exercises']['rust-01']['contentHash'])->not->toBe($original['exercises']['rust-01']['contentHash'])
        ->and($meta['exercises']['rust-01']['gradingHash'])->toBe($original['exercises']['rust-01']['gradingHash'])
        ->and($meta['exercises']['rust-01']['starterHash'])->toBe($original['exercises']['rust-01']['starterHash'])
        ->and($meta['exercises']['rust-02'])->toBe($original['exercises']['rust-02'])
        ->and($meta['portions']['lab.rust'])->not->toBe($original['portions']['lab.rust'])
        ->and($meta['portions']['lab.go'])->toBe($original['portions']['lab.go'])
        ->and($meta['documentHash'])->not->toBe($original['documentHash']);
});

it('reports when the requested exercise is not in the content', function () {
    ContentFixture::fromImage()->exercise('no-such-exercise');
})->throws(LogicException::class, 'no-such-exercise is not in the content');

it('removes an exercise from the document and the meta, and the pair stays valid', function () {
    $fixture = ContentFixture::fromImage();
    $exercises = count($fixture->meta['exercises']);
    $labRust = count($fixture->document->lab->rust);
    $id = $fixture->unreferencedLabExercise();

    $source = ContentSource::fromDirectory($fixture->withoutExercise($id)->write());

    expect($source->meta->exerciseHashes)->toHaveCount($exercises - 1)->not->toHaveKey($id)
        ->and(Arr::pluck($source->part(Portion::LabRust), 'id'))->toHaveCount($labRust - 1)->not->toContain($id);
});

it('writes the document compact when asked for no indentation', function () {
    $directory = ContentFixture::fromImage()->write(indent: null);

    expect(substr_count(file_get_contents("{$directory}/curriculum.json"), "\n"))->toBe(1)
        ->and(ContentSource::fromDirectory($directory)->languages())->toBe(['rust', 'go']);
});
