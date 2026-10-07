<?php

namespace App\Progress\Operations;

use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Support\Facades\Config;

final class FieldValidator
{
    private const EXERCISE_KEY = '/\A[a-z0-9][a-z0-9-]{0,63}\z/';

    private const KEY = '/\A[A-Za-z0-9][A-Za-z0-9._-]{0,63}\z/';

    private const INSTANT_FORMAT = 'Y-m-d\TH:i:s.v\Z';

    private const STUDY_DATE_FLOOR = '2020-01-01T00:00:00.000Z';

    private const STUDY_DATE_CEILING = '2100-01-01T00:00:00.000Z';

    private const FOCUS_MINUTES = [15, 25, 45];

    /** @param array<string, mixed> $raw */
    public static function check(FieldSpec $spec, mixed $value, array $raw): ?RejectionReason
    {
        return match ($spec->type) {
            FieldType::ExerciseKey => self::matches(self::EXERCISE_KEY, $value),
            FieldType::Key => self::matches(self::KEY, $value),
            FieldType::Language => self::oneOf(['rust', 'go'], $value),
            FieldType::Bool => is_bool($value) ? null : RejectionReason::Invalid,
            FieldType::TrueFlag => $value === true ? null : RejectionReason::Invalid,
            FieldType::Answer => self::integerBetween($value, 0, 255),
            FieldType::HintCount => self::integerBetween($value, 1, 255),
            FieldType::Text => self::text($spec, $value),
            FieldType::NullableText => $value === null ? null : self::text($spec, $value),
            FieldType::StarterHash => $value === null ? null : self::matches('/\A[0-9a-f]{64}\z/', $value),
            FieldType::ContentVersion => self::matches('/\A[0-9a-f]{32}\z/', $value),
            FieldType::Confidence => self::oneOf(['again', 'practice', 'confident'], $value),
            FieldType::StudyInstant => self::studyInstant($value),
            FieldType::MarkKind => self::oneOf(['step', 'milestone', 'favorite'], $value),
            FieldType::NoteField => self::oneOf(['learned', 'next'], $value),
            FieldType::PreferenceName => self::oneOf(['routeLanguage', 'focusMinutes', 'labSelectedRust', 'labSelectedGo'], $value),
            FieldType::PreferenceValue => self::preferenceValue($raw['name'] ?? null, $value),
        };
    }

    private static function matches(string $pattern, mixed $value): ?RejectionReason
    {
        return is_string($value) && preg_match($pattern, $value) === 1 ? null : RejectionReason::Invalid;
    }

    /** @param list<string> $allowed */
    private static function oneOf(array $allowed, mixed $value): ?RejectionReason
    {
        return is_string($value) && in_array($value, $allowed, true) ? null : RejectionReason::Invalid;
    }

    private static function integerBetween(mixed $value, int $min, int $max): ?RejectionReason
    {
        if (! is_int($value)) {
            return RejectionReason::Invalid;
        }

        return $value >= $min && $value <= $max ? null : RejectionReason::OutOfRange;
    }

    private static function text(FieldSpec $spec, mixed $value): ?RejectionReason
    {
        if (! is_string($value)) {
            return RejectionReason::Invalid;
        }
        $characterLimit = Config::integer("progress.limits.{$spec->limitKey}");

        return mb_strlen($value, 'UTF-8') <= $characterLimit && strlen($value) <= $spec->columnBytes ? null : RejectionReason::OutOfRange;
    }

    private static function studyInstant(mixed $value): ?RejectionReason
    {
        if (! is_string($value)) {
            return RejectionReason::Invalid;
        }
        try {
            $instant = CarbonImmutable::createFromFormat('!'.self::INSTANT_FORMAT, $value, 'UTC');
        } catch (InvalidFormatException) {
            return RejectionReason::Invalid;
        }
        if ($instant?->format(self::INSTANT_FORMAT) !== $value) {
            return RejectionReason::Invalid;
        }
        $inRange = $value >= self::STUDY_DATE_FLOOR && $value <= self::STUDY_DATE_CEILING;

        return $inRange ? null : RejectionReason::OutOfRange;
    }

    private static function preferenceValue(mixed $name, mixed $value): ?RejectionReason
    {
        return match ($name) {
            'routeLanguage' => self::oneOf(['rust', 'go'], $value),
            'focusMinutes' => is_int($value) ? (in_array($value, self::FOCUS_MINUTES, true) ? null : RejectionReason::OutOfRange) : RejectionReason::Invalid,
            'labSelectedRust', 'labSelectedGo' => self::matches(self::EXERCISE_KEY, $value),
            default => null,
        };
    }
}
