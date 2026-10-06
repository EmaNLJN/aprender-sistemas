<?php

namespace App\Runs\Record;

use App\Content\Record\RowFields;
use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Carbon\CarbonImmutable;
use LogicException;

final readonly class RunRow
{
    /** @param list<string> $expectedTests */
    public function __construct(
        public string $id,
        public int $userId,
        public string $clientRunId,
        public string $exerciseId,
        public RunLanguage $language,
        public int $epoch,
        public string $gradingHash,
        public array $expectedTests,
        public string $nonce,
        public string $code,
        public ?string $customTest,
        public ?string $program,
        public RunStatus $status,
        public ?RunReason $reason,
        public ?ExecutorPhase $phase,
        public ?int $exitCode,
        public ?bool $truncated,
        public ?int $compileMs,
        public ?int $runMs,
        public ?string $stdout,
        public ?string $stderr,
        public ?int $attemptId,
        public ?CarbonImmutable $cancelRequestedAt,
        public CarbonImmutable $createdAt,
        public ?CarbonImmutable $startedAt,
        public ?CarbonImmutable $finishedAt,
        public ?CarbonImmutable $expiresAt,
    ) {}

    /** @param array<string, mixed> $row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'runs');
        $reason = $fields->nullableString('reason');
        $phase = $fields->nullableString('executor_phase');

        return new self(
            id: $fields->string('id'),
            userId: $fields->int('user_id'),
            clientRunId: $fields->string('client_run_id'),
            exerciseId: $fields->string('exercise_id'),
            language: RunLanguage::from($fields->string('language')),
            epoch: $fields->int('epoch'),
            gradingHash: $fields->string('grading_hash'),
            expectedTests: self::testKeys($fields->string('expected_tests')),
            nonce: $fields->string('nonce'),
            code: $fields->string('code'),
            customTest: $fields->nullableString('custom_test'),
            program: $fields->nullableString('program'),
            status: RunStatus::from($fields->string('status')),
            reason: $reason === null ? null : RunReason::from($reason),
            phase: $phase === null ? null : ExecutorPhase::from($phase),
            exitCode: $fields->nullableInt('exit_code'),
            truncated: $fields->nullableInt('truncated') === null ? null : $fields->flag('truncated'),
            compileMs: $fields->nullableInt('compile_ms'),
            runMs: $fields->nullableInt('run_ms'),
            stdout: $fields->nullableString('stdout'),
            stderr: $fields->nullableString('stderr'),
            attemptId: $fields->nullableInt('attempt_id'),
            cancelRequestedAt: Instant::parseOrNull($fields->nullableString('cancel_requested_at')),
            createdAt: Instant::parse($fields->string('created_at')),
            startedAt: Instant::parseOrNull($fields->nullableString('started_at')),
            finishedAt: Instant::parseOrNull($fields->nullableString('finished_at')),
            expiresAt: Instant::parseOrNull($fields->nullableString('expires_at')),
        );
    }

    /** @return list<string> */
    private static function testKeys(string $json): array
    {
        $decoded = json_decode($json, true);
        if (! is_array($decoded) || ! array_is_list($decoded)) {
            throw self::notAListOfKeys();
        }
        $keys = [];
        foreach ($decoded as $key) {
            if (! is_string($key)) {
                throw self::notAListOfKeys();
            }
            $keys[] = $key;
        }

        return $keys;
    }

    private static function notAListOfKeys(): LogicException
    {
        return new LogicException('runs.expected_tests: se esperaba una lista JSON de textos');
    }
}
