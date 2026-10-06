<?php

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use App\Content\Record\World;
use App\Content\Record\WorldExercise;
use App\Content\Record\WorldRole;
use Tests\Support\ContentFixture;

/** @return list<array{0: string, 1: int, 2: stdClass}> language, position and world of the document */
function documentWorlds(?stdClass $document = null): array
{
    $document ??= ContentFixture::fromImage()->document;
    $worlds = [];
    foreach ($document->campaign as $language => $list) {
        foreach ($list as $position => $world) {
            $worlds[] = [$language, $position, $world];
        }
    }

    return $worlds;
}

/** @return array<string, mixed> */
function asText(array $row): array
{
    return array_map(fn (mixed $value) => is_int($value) ? (string) $value : $value, $row);
}

function worldFromRows(World $world, bool $integersAsText): World
{
    $rows = $world->rowsByTable();
    $worldRow = $rows['worlds'][0];
    $members = [];
    foreach ($rows['world_exercises'] as $memberRow) {
        $members[] = WorldExercise::fromRow($integersAsText ? asText($memberRow) : $memberRow);
    }

    return World::fromRow($integersAsText ? asText($worldRow) : $worldRow, $members);
}

it('publishes each world of the document byte for byte after a trip through its rows', function (bool $integersAsText) {
    $worlds = documentWorlds();
    expect($worlds)->toHaveCount(8);

    foreach ($worlds as [$language, $position, $world]) {
        $record = World::fromDocument($world, $language, $position, "campaign.{$language}[{$position}]");

        expect(PublishedJson::encode(worldFromRows($record, $integersAsText)->toPublished()))->toBe(PublishedJson::encode($world));
    }
})->with([[false], [true]]);

it('writes the worlds row with the document values, its context and its key order', function () {
    [$language, $position, $world] = documentWorlds()[1];
    $row = World::fromDocument($world, $language, $position, 'p')->toRow();

    expect($row)->toBe([
        'id' => $world->id,
        'level' => $world->level,
        'title' => $world->title,
        'subtitle' => $world->subtitle,
        'story' => $world->story,
        'why' => $world->why,
        'badge' => $world->badge,
        'concepts_json' => PublishedJson::encode($world->concepts),
        'guide_json' => PublishedJson::encode($world->guide),
        'checkpoint_json' => PublishedJson::encode($world->checkpoint),
        'sources_json' => PublishedJson::encode($world->sources),
        'language' => $language,
        'position' => $position,
        'key_order' => PublishedJson::encode(array_keys(get_object_vars($world))),
    ]);
});

it('splits the ids of each world into training, challenge and boss members', function () {
    foreach (documentWorlds() as [$language, $position, $world]) {
        $members = World::fromDocument($world, $language, $position, 'p')->rowsByTable()['world_exercises'];
        $expected = [];
        foreach ($world->trainingIds as $index => $id) {
            $expected[] = ['world_id' => $world->id, 'exercise_id' => $id, 'role' => 'training', 'position' => $index];
        }
        $lastChallenge = count($world->challengeIds) - 1;
        foreach ($world->challengeIds as $index => $id) {
            $expected[] = ['world_id' => $world->id, 'exercise_id' => $id, 'role' => $index === $lastChallenge ? 'boss' : 'challenge', 'position' => $index];
        }

        expect($members)->toBe($expected);
        expect($world->bossId)->toBe($world->challengeIds[$lastChallenge]);
    }
});

it('returns the worlds row and the member rows by table', function () {
    [$language, $position, $world] = documentWorlds()[0];
    $rows = World::fromDocument($world, $language, $position, 'p')->rowsByTable();

    expect(array_keys($rows))->toBe(['worlds', 'world_exercises']);
    expect($rows['worlds'])->toHaveCount(1);
    expect($rows['world_exercises'])->toHaveCount(count($world->trainingIds) + count($world->challengeIds));
});

it('publishes the ids in the order of position whatever the order of the rows', function () {
    [$language, $position, $world] = documentWorlds()[0];
    $rows = World::fromDocument($world, $language, $position, 'p')->rowsByTable();
    $members = [];
    foreach (array_reverse($rows['world_exercises']) as $memberRow) {
        $members[] = WorldExercise::fromRow($memberRow);
    }

    $published = World::fromRow($rows['worlds'][0], $members)->toPublished();

    expect($published->trainingIds)->toBe($world->trainingIds);
    expect($published->challengeIds)->toBe($world->challengeIds);
    expect($published->bossId)->toBe($world->bossId);
});

it('publishes a null boss when the world has no boss member', function () {
    [$language, $position, $world] = documentWorlds()[0];
    $rows = World::fromDocument($world, $language, $position, 'p')->rowsByTable();
    $members = [];
    foreach ($rows['world_exercises'] as $memberRow) {
        if ($memberRow['role'] !== 'boss') {
            $members[] = WorldExercise::fromRow($memberRow);
        }
    }

    expect(World::fromRow($rows['worlds'][0], $members)->toPublished()->bossId)->toBeNull();
});

it('rejects a world exercise row with an unknown role', function () {
    $row = ['world_id' => 'w', 'exercise_id' => 'e', 'role' => 'mentor', 'position' => 0];

    expect(fn () => WorldExercise::fromRow($row))->toThrow(LogicException::class);
});

it('names the three roles with the values of the table', function () {
    expect(WorldRole::Training->value)->toBe('training');
    expect(WorldRole::Challenge->value)->toBe('challenge');
    expect(WorldRole::Boss->value)->toBe('boss');
});

it('rejects a world row whose key order has an unknown key', function () {
    [$language, $position, $world] = documentWorlds()[0];
    $row = World::fromDocument($world, $language, $position, 'p')->toRow();
    $row['key_order'] = PublishedJson::encode(['id', 'foo']);

    expect(fn () => World::fromRow($row, []))->toThrow(LogicException::class, 'La clave «foo» no tiene regla en su códec.');
});

it('reports the C2 messages of an invalid world', function (Closure $edit, string $language, string $message) {
    $document = ContentFixture::fromImage()->document;
    $edit($document->campaign->{$language}[0]);

    $failure = null;
    foreach (documentWorlds($document) as [$worldLanguage, $position, $world]) {
        try {
            World::fromDocument($world, $worldLanguage, $position, "campaign.{$worldLanguage}[{$position}]");
        } catch (InvalidContent $exception) {
            $failure = $exception->getMessage();
            break;
        }
    }

    expect($failure)->toBe($message);
})->with([
    'training id that is not text' => [fn (stdClass $world) => $world->trainingIds[0] = 7, 'rust', 'curriculum.json: campaign.rust[0].trainingIds: se esperaba una lista de IDs'],
    'no challenge ids' => [fn (stdClass $world) => $world->challengeIds = [], 'rust', 'curriculum.json: campaign.rust[0].challengeIds: se esperaba una lista de IDs'],
    'boss that is not the last challenge' => [fn (stdClass $world) => $world->bossId = $world->trainingIds[0], 'go', 'curriculum.json: campaign.go[0].bossId: el jefe tiene que ser el último de challengeIds'],
    'unknown key' => [fn (stdClass $world) => $world->extra = 'x', 'rust', 'curriculum.json: campaign.rust[0].extra: clave desconocida'],
    'empty title' => [fn (stdClass $world) => $world->title = '', 'rust', 'curriculum.json: campaign.rust[0].title: se esperaba un texto no vacío'],
    'missing badge' => [function (stdClass $world) {
        unset($world->badge);
    }, 'rust', 'curriculum.json: campaign.rust[0]: falta la clave «badge»'],
]);
