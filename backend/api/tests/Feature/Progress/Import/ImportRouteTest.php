<?php

use App\Http\ProgressLimiters;
use App\Models\User;
use App\Progress\ChangesReader;
use App\Progress\Import\LegacyWriter;
use App\Runs\Record\Instant;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;
use Tests\Support\Import\FakeLegacyWriter;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\FakeChangesReader;

const IMPORT_HTTP_ID = '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f';
const IMPORT_HTTP_OTHER_ID = '7a2d3c0f-5b8e-4d2f-8c3a-1b2c3d4e5f60';
const IMPORT_HTTP_RAW_LIMIT = 10485760;

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-06 12:00:00.123'));
    ProgressLimiters::register();
    Route::prefix('api')->middleware('api')->group(base_path('routes/api/progress-import.php'));
    $this->writer = new FakeLegacyWriter;
    $this->reader = new FakeChangesReader;
    app()->instance(LegacyWriter::class, $this->writer);
    app()->instance(ChangesReader::class, $this->reader);
    ProgressWorld::seed([
        'contentVersion' => '0123456789abcdef0123456789abcdef',
        'exercises' => [['id' => 'fx-rust-01', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3]],
        'worlds' => [], 'workshops' => [], 'guide' => ['steps' => [], 'resources' => []],
    ]);
    $this->user = ProgressWorld::user();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

/** @return array<string, mixed> */
function importHttpBody(array $overrides = []): array
{
    return [
        'format' => 2, 'importId' => IMPORT_HTTP_ID, 'epoch' => 1, 'source' => 'storage', 'raw' => '{"taller-laboratorio-v1":"{}"}',
        'normalized' => ['lab' => ['version' => 1, 'selected' => ['rust' => null, 'go' => null], 'records' => [
            'fx-rust-01' => ['predictionCorrect' => false, 'assisted' => false, 'solutionSeen' => false],
        ]]],
        ...$overrides,
    ];
}

function importHttpIsPrivateNoStore(TestResponse $response): void
{
    expect($response->headers->getCacheControlDirective('no-store'))->toBeTrue()
        ->and($response->headers->getCacheControlDirective('private'))->toBeTrue();
}

describe('access', function () {
    it('answers 401 without a session', function () {
        Browser::for($this)->useDatabaseDrivers()->post('/api/progress/import', importHttpBody())->assertStatus(401);
    });

    it('answers 409 account_mismatch without the account header', function () {
        $this->browser->withoutAccountHeader()->post('/api/progress/import', importHttpBody())->assertStatus(409)->assertJsonPath('code', 'account_mismatch');

        expect($this->writer->calls)->toBe([]);
    });

    it('answers 403 email_unverified to an account with an unverified email', function () {
        $unverified = User::factory()->unverified()->create();
        $browser = Browser::for($this)->useDatabaseDrivers()->signIn($unverified);

        $browser->post('/api/progress/import', importHttpBody())->assertStatus(403)->assertJsonPath('code', 'email_unverified');
    });
});

describe('the envelope', function () {
    it('answers 422 with the field in errors', function (array $overrides, string $field) {
        $response = $this->browser->post('/api/progress/import', importHttpBody($overrides));

        $response->assertStatus(422)->assertJsonPath('code', 'validation_failed')->assertJsonValidationErrorFor($field, 'errors');
        expect($this->writer->calls)->toBe([])
            ->and(DB::table('progress_imports')->count())->toBe(0);
        importHttpIsPrivateNoStore($response);
    })->with([
        'importId missing' => [['importId' => null], 'importId'],
        'importId is a UUID v3' => [['importId' => '6f1c2b9e-4a7d-3c1e-9b2f-0a1b2c3d4e5f'], 'importId'],
        'importId in capitals' => [['importId' => '6F1C2B9E-4A7D-4C1E-9B2F-0A1B2C3D4E5F'], 'importId'],
        'epoch zero' => [['epoch' => 0], 'epoch'],
        'epoch as text' => [['epoch' => '1'], 'epoch'],
        'format missing' => [['format' => null], 'format'],
        'source file' => [['source' => 'file'], 'source'],
        'raw over the limit in bytes' => [['raw' => str_repeat('a', IMPORT_HTTP_RAW_LIMIT + 1)], 'raw'],
        'raw over the limit in bytes with a multibyte character' => [['raw' => str_repeat('a', IMPORT_HTTP_RAW_LIMIT - 1).'ñ'], 'raw'],
        'raw is not text' => [['raw' => ['a']], 'raw'],
        'normalized is text' => [['normalized' => 'texto'], 'normalized'],
        'normalized is a list' => [['normalized' => [1, 2]], 'normalized'],
        'normalized missing' => [['normalized' => null], 'normalized'],
        'confirm is not a boolean' => [['confirm' => 'sí'], 'confirm'],
        'confirm is a number' => [['confirm' => 1], 'confirm'],
    ]);

    it('accepts a raw of exactly 10 MiB and ignores the fields of more', function () {
        $response = $this->browser->post('/api/progress/import', importHttpBody(['raw' => str_repeat('a', IMPORT_HTTP_RAW_LIMIT), 'extra' => 'x']));

        $response->assertStatus(201);
        expect(strlen(DB::table('progress_imports')->value('raw_payload')))->toBe(IMPORT_HTTP_RAW_LIMIT);
    });

    it('takes a missing confirm as false', function () {
        $this->browser->post('/api/progress/import', importHttpBody())->assertStatus(201);
        $this->browser->post('/api/progress/import', importHttpBody(['importId' => IMPORT_HTTP_OTHER_ID, 'raw' => '{"otro":1}']))->assertStatus(409);
    });
});

describe('the other errors', function () {
    it('answers 409 client_outdated for a format the server does not accept', function () {
        $response = $this->browser->post('/api/progress/import', importHttpBody(['format' => 1]));

        $response->assertStatus(409)->assertJsonPath('code', 'client_outdated');
        importHttpIsPrivateNoStore($response);
    });

    it('answers 503 content_not_imported when there is no content', function () {
        DB::table('exercise_grading_versions')->delete();
        DB::table('content_imports')->delete();

        $response = $this->browser->post('/api/progress/import', importHttpBody());

        $response->assertStatus(503)->assertJsonPath('code', 'content_not_imported');
        importHttpIsPrivateNoStore($response);
    });

    it('answers 409 epoch_mismatch with the epoch and the revision of the account', function () {
        ProgressWorld::head($this->user, epoch: 3, revision: 9);

        $response = $this->browser->post('/api/progress/import', importHttpBody(['epoch' => 2]));

        $response->assertStatus(409)->assertJsonPath('code', 'epoch_mismatch')->assertJsonPath('epoch', 3)->assertJsonPath('revision', 9);
        importHttpIsPrivateNoStore($response);
    });

    it('answers 422 with the path of the normalized, prefixed with normalized, that does not come from the parsers', function () {
        $normalized = importHttpBody()['normalized'];
        $normalized['lab']['records']['fx-rust-01']['colour'] = 'red';

        $response = $this->browser->post('/api/progress/import', importHttpBody(['normalized' => $normalized]));

        $response->assertStatus(422)->assertJsonValidationErrorFor('normalized.lab.records.fx-rust-01.colour', 'errors');
        importHttpIsPrivateNoStore($response);
    });

    it('answers 422 on importId for an id reused with another raw', function () {
        $this->browser->post('/api/progress/import', importHttpBody())->assertStatus(201);

        $this->browser->post('/api/progress/import', importHttpBody(['raw' => '{"otro":1}', 'confirm' => true]))->assertStatus(422)->assertJsonValidationErrorFor('importId', 'errors');
    });

    it('answers 409 import_needs_confirmation with exactly the message and the code', function () {
        $this->browser->post('/api/progress/import', importHttpBody())->assertStatus(201);

        $response = $this->browser->post('/api/progress/import', importHttpBody(['importId' => IMPORT_HTTP_OTHER_ID, 'raw' => '{"otro":1}']));

        $response->assertStatus(409)->assertExactJson([
            'message' => 'Confirmá que esta copia es tuya antes de combinarla con el progreso de tu cuenta.',
            'code' => 'import_needs_confirmation',
        ]);
        importHttpIsPrivateNoStore($response);
    });

    it('answers 500 server_error without the text of the student when the database rejects the write', function () {
        $driverError = new PDOException('Incorrect string value');
        $driverError->errorInfo = ['HY000', 1366, 'Incorrect string value'];
        $this->writer->failNextWriteWith(new QueryException('mysql', 'insert into `drafts` values (?)', ['zq7-centinela'], $driverError));

        $response = $this->browser->post('/api/progress/import', importHttpBody());

        $response->assertStatus(500)->assertJsonPath('code', 'server_error');
        expect($response->getContent())->not->toContain('zq7-centinela');
        importHttpIsPrivateNoStore($response);
    });
});

describe('the responses', function () {
    it('answers 201 with the body of the contract and private no-store', function () {
        $this->writer->counts = ['exercises' => 1, 'drafts' => 1];

        $response = $this->browser->post('/api/progress/import', importHttpBody());

        $response->assertStatus(201)->assertExactJson([
            'importId' => IMPORT_HTTP_ID, 'epoch' => 1, 'revision' => 1, 'importedAt' => '2026-10-06T12:00:00.123Z',
            'report' => [
                'written' => ['exercises' => 1, 'drafts' => 1, 'attempts' => 0, 'campaignSeals' => 0, 'campaignCheckpoints' => 0, 'workshops' => 0,
                    'workshopObjectives' => 0, 'workshopSteps' => 0, 'routeMarks' => 0, 'routeQuiz' => 0, 'routeNotes' => 0, 'preferences' => 0],
                'omitted' => [], 'replaced' => [], 'conflicts' => [],
            ],
        ]);
        importHttpIsPrivateNoStore($response);
    });

    it('answers 200 with the same body to a retry and writes nothing again', function () {
        $first = $this->browser->post('/api/progress/import', importHttpBody());

        $retry = $this->browser->post('/api/progress/import', importHttpBody());

        $retry->assertStatus(200);
        expect($retry->json())->toBe($first->json())
            ->and($this->writer->calls)->toHaveCount(1);
        importHttpIsPrivateNoStore($retry);
    });

    it('imports into the account of the session and ignores a user_id in the body', function () {
        $other = ProgressWorld::user();

        $this->browser->post('/api/progress/import', importHttpBody(['user_id' => $other->id, 'userId' => $other->id]))->assertStatus(201);

        expect(DB::table('progress_imports')->pluck('user_id')->all())->toBe([$this->user->id])
            ->and($this->writer->calls[0]['userId'])->toBe($this->user->id);
    });

    it('hands the service the raw and the confirm as they arrived', function () {
        $this->browser->post('/api/progress/import', importHttpBody(['raw' => '{"a":"Texto con ñ y 😀"}', 'source' => 'export', 'confirm' => true]))->assertStatus(201);

        $row = DB::table('progress_imports')->first();
        expect([$row->raw_payload, $row->source])->toBe(['{"a":"Texto con ñ y 😀"}', 'export']);
    });
});

describe('the limit', function () {
    it('answers 429 with Retry-After to the 4th import of the hour, even when the earlier ones were a 409 and a 200', function () {
        $first = $this->browser->post('/api/progress/import', importHttpBody());
        $first->assertStatus(201);
        $this->browser->post('/api/progress/import', importHttpBody())->assertStatus(200);
        $this->browser->post('/api/progress/import', importHttpBody(['importId' => IMPORT_HTTP_OTHER_ID, 'raw' => '{"otro":1}']))->assertStatus(409);

        $fourth = $this->browser->post('/api/progress/import', importHttpBody());

        $fourth->assertStatus(429)->assertJsonPath('code', 'too_many_requests');
        expect((int) $fourth->headers->get('Retry-After'))->toBeBetween(1, 3600);
    });
});
