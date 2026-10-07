<?php

namespace Tests\Support\Sync;

use Tests\Support\MergeFixture;

final class RandomOperations
{
    private const TYPES = [
        'exercise.prediction', 'exercise.assist', 'exercise.hints', 'exercise.reflection', 'exercise.customTest', 'exercise.review',
        'exercise.draft', 'checkpoint.answer', 'workshop.prediction', 'workshop.note', 'workshop.objective', 'workshop.step',
        'route.mark', 'route.quiz', 'route.note', 'preference.set',
    ];

    private const CLOCKS = [
        '2026-10-05T12:00:00.000Z', '2026-10-05T12:02:00.000Z', '2026-10-05T12:04:00.000Z', '2026-10-05T12:06:00.000Z',
        '2026-10-05T12:08:00.000Z', '2026-10-05T12:09:59.000Z',
    ];

    private const TEXTS = ['', 'uno', 'dos', "  con espacios\n", 'ñandú 😀'];

    private int $counter = 0;

    private function __construct() {}

    /**
     * @return list<array<string, mixed>> one operation of each type first, then random ones, all valid for the merge world
     */
    public static function sequence(int $seed, int $randomCount, int $firstId = 1000): array
    {
        mt_srand($seed);
        $generator = new self;
        $generator->counter = $firstId;
        $types = self::TYPES;
        shuffle($types);
        $sequence = [];
        foreach ($types as $type) {
            $sequence[] = $generator->operation($type);
        }
        for ($index = 0; $index < $randomCount; $index++) {
            $sequence[] = $generator->operation(self::TYPES[mt_rand(0, count(self::TYPES) - 1)]);
        }

        return $sequence;
    }

    /** @return array<string, mixed> */
    private function operation(string $type): array
    {
        $base = ['id' => SyncDevice::operationId(++$this->counter), 'type' => $type, 'at' => $this->pick(self::CLOCKS)];

        return $base + $this->fields($type);
    }

    /** @return array<string, mixed> */
    private function fields(string $type): array
    {
        $exercise = ['exerciseId' => $this->pick(['fx-rust-01', 'fx-rust-02', 'fx-go-01', 'fx-go-02'])];
        $workshop = ['workshopId' => 'fx-workshop-1', 'language' => $this->pick(['rust', 'go'])];

        return match ($type) {
            'exercise.prediction' => [...$exercise, 'answer' => mt_rand(0, 2), 'correct' => $this->flag(), 'contentVersion' => $this->version()],
            'exercise.assist' => [...$exercise, ...$this->pick([['assisted' => true], ['solutionSeen' => true], ['assisted' => true, 'solutionSeen' => true]])],
            'exercise.hints' => ['exerciseId' => $this->pick(['fx-rust-01', 'fx-go-01']), 'revealed' => mt_rand(1, 3)],
            'exercise.reflection', 'exercise.customTest' => [...$exercise, 'text' => $this->pick(self::TEXTS)],
            'exercise.review' => [
                ...$exercise, 'confidence' => $this->pick(['again', 'practice', 'confident']),
                'reviewedAt' => $this->pick(['2026-10-01T00:00:00.000Z', '2026-10-03T00:00:00.000Z']),
                'reviewDueAt' => $this->pick(['2026-10-08T00:00:00.000Z', '2026-10-20T00:00:00.000Z']),
            ],
            'exercise.draft' => $this->draftFields($exercise['exerciseId']),
            'checkpoint.answer' => ['worldId' => 'fx-world-1', 'answer' => mt_rand(0, 2), 'passed' => $this->flag(), 'contentVersion' => $this->version()],
            'workshop.prediction' => [...$workshop, 'answer' => mt_rand(0, 2), 'correct' => $this->flag(), 'contentVersion' => $this->version()],
            'workshop.note' => [...$workshop, 'text' => $this->pick(self::TEXTS)],
            'workshop.objective' => [...$workshop, 'objectiveKey' => $this->pick(['fx-obj-1', 'fx-obj-2'])],
            'workshop.step' => [...$workshop, 'stepKey' => $this->pick(['e1', 'e2', 'e3', 'e4']), 'marked' => $this->flag()],
            'route.mark' => $this->routeMarkFields(),
            'route.quiz' => ['stepId' => 'fx-step-1', 'answer' => mt_rand(0, 2), 'contentVersion' => $this->version()],
            'route.note' => ['language' => $this->pick(['rust', 'go']), 'field' => $this->pick(['learned', 'next']), 'body' => $this->pick(self::TEXTS)],
            default => $this->preferenceFields(),
        };
    }

    /** @return array<string, mixed> */
    private function draftFields(string $exerciseId): array
    {
        $code = $this->pick([null, 'fn main() {}', "package main\n", '']);

        return ['exerciseId' => $exerciseId, 'code' => $code, 'starterHash' => $code === null ? null : $this->pick([str_repeat('a', 64), str_repeat('b', 64), null])];
    }

    /** @return array<string, mixed> */
    private function routeMarkFields(): array
    {
        $kind = $this->pick(['step', 'milestone', 'favorite']);
        $itemKey = match ($kind) {
            'step' => 'fx-step-1',
            'milestone' => $this->pick(['rust-memory', 'go-memory']),
            default => 'fx-res-1',
        };

        return ['kind' => $kind, 'itemKey' => $itemKey, 'marked' => $this->flag()];
    }

    /** @return array<string, mixed> */
    private function preferenceFields(): array
    {
        return $this->pick([
            ['name' => 'routeLanguage', 'value' => $this->pick(['rust', 'go'])],
            ['name' => 'focusMinutes', 'value' => $this->pick([15, 25, 45])],
            ['name' => 'labSelectedRust', 'value' => $this->pick(['fx-rust-01', 'fx-rust-02'])],
            ['name' => 'labSelectedGo', 'value' => $this->pick(['fx-go-01', 'fx-go-02'])],
        ]);
    }

    private function version(): string
    {
        $world = MergeFixture::world();

        return mt_rand(1, 5) === 1 ? $world['staleContentVersion'] : $world['contentVersion'];
    }

    private function flag(): bool
    {
        return mt_rand(0, 1) === 1;
    }

    /**
     * @template T
     *
     * @param  list<T>  $items
     * @return T
     */
    private function pick(array $items): mixed
    {
        return $items[mt_rand(0, count($items) - 1)];
    }
}
