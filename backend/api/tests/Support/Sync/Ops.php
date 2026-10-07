<?php

namespace Tests\Support\Sync;

use Tests\Support\MergeFixture;

final class Ops
{
    /** @return array<string, mixed> */
    public static function reflection(int $number, string $text, string $at, string $exerciseId = 'fx-rust-01'): array
    {
        return ['id' => SyncDevice::operationId($number), 'type' => 'exercise.reflection', 'at' => $at, 'exerciseId' => $exerciseId, 'text' => $text];
    }

    /** @return array<string, mixed> */
    public static function customTest(int $number, string $text, string $at): array
    {
        return ['id' => SyncDevice::operationId($number), 'type' => 'exercise.customTest', 'at' => $at, 'exerciseId' => 'fx-rust-01', 'text' => $text];
    }

    /** @return array<string, mixed> */
    public static function workshopNote(int $number, string $text, string $at): array
    {
        return ['id' => SyncDevice::operationId($number), 'type' => 'workshop.note', 'at' => $at, 'workshopId' => 'fx-workshop-1', 'language' => 'rust', 'text' => $text];
    }

    /** @return array<string, mixed> */
    public static function routeNote(int $number, string $body, string $at): array
    {
        return ['id' => SyncDevice::operationId($number), 'type' => 'route.note', 'at' => $at, 'language' => 'rust', 'field' => 'learned', 'body' => $body];
    }

    /** @return array<string, mixed> */
    public static function draft(int $number, ?string $code, string $at, string $exerciseId = 'fx-rust-01'): array
    {
        return [
            'id' => SyncDevice::operationId($number), 'type' => 'exercise.draft', 'at' => $at, 'exerciseId' => $exerciseId,
            'code' => $code, 'starterHash' => $code === null ? null : str_repeat('a', 64),
        ];
    }

    /** @return array<string, mixed> */
    public static function step(int $number, bool $marked, string $at, string $stepKey = 'e1'): array
    {
        return [
            'id' => SyncDevice::operationId($number), 'type' => 'workshop.step', 'at' => $at, 'workshopId' => 'fx-workshop-1',
            'language' => 'rust', 'stepKey' => $stepKey, 'marked' => $marked,
        ];
    }

    /** @return array<string, mixed> */
    public static function prediction(int $number, int $answer, bool $correct, string $at, ?string $contentVersion = null): array
    {
        return [
            'id' => SyncDevice::operationId($number), 'type' => 'exercise.prediction', 'at' => $at, 'exerciseId' => 'fx-rust-01',
            'answer' => $answer, 'correct' => $correct, 'contentVersion' => $contentVersion ?? MergeFixture::world()['contentVersion'],
        ];
    }

    /** @return array<string, mixed> */
    public static function assist(int $number, string $flag, string $at): array
    {
        return ['id' => SyncDevice::operationId($number), 'type' => 'exercise.assist', 'at' => $at, 'exerciseId' => 'fx-rust-01', $flag => true];
    }

    /** @return array<string, mixed> */
    public static function hints(int $number, int $revealed, string $at): array
    {
        return ['id' => SyncDevice::operationId($number), 'type' => 'exercise.hints', 'at' => $at, 'exerciseId' => 'fx-rust-01', 'revealed' => $revealed];
    }

    /** @return array<string, mixed> */
    public static function routeMark(int $number, bool $marked, string $at): array
    {
        return ['id' => SyncDevice::operationId($number), 'type' => 'route.mark', 'at' => $at, 'kind' => 'step', 'itemKey' => 'fx-step-1', 'marked' => $marked];
    }
}
