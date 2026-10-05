<?php

namespace App\Logging;

use App\Auth\EmailFingerprint;
use Monolog\LogRecord;
use Monolog\Processor\ProcessorInterface;
use Throwable;

/** FR-045: a QueryException message carries the SQL with its values, so exceptions are flattened before they are formatted. */
final class SecretScrubber implements ProcessorInterface
{
    private const REDACTED = '[redactado]';

    private const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie'];

    private const EMAIL_PATTERN = '/[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}.\-]+\.\p{L}{2,}/u';

    private const LINK_FRAGMENT_PATTERN = '/(invitacion|restablecer)=[^\s"\']*/';

    public function __invoke(LogRecord $record): LogRecord
    {
        $context = $this->scrubArray($record->context);
        $extra = $this->scrubArray($record->extra);

        return $record->with(message: $this->scrubString($record->message), context: $context, extra: $extra);
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @return array<array-key, mixed>
     */
    private function scrubArray(array $values): array
    {
        $scrubbed = [];
        foreach ($values as $key => $value) {
            $scrubbed[$key] = $this->isSensitive($key) ? self::REDACTED : $this->scrubValue($value);
        }

        return $scrubbed;
    }

    private function scrubValue(mixed $value): mixed
    {
        return match (true) {
            is_string($value) => $this->scrubString($value),
            is_array($value) => $this->scrubArray($value),
            $value instanceof Throwable => $this->scrubArray($this->describe($value)),
            default => $value,
        };
    }

    private function isSensitive(int|string $key): bool
    {
        $name = strtolower((string) $key);
        foreach (self::SENSITIVE_KEYS as $sensitive) {
            if (str_contains($name, $sensitive)) {
                return true;
            }
        }

        return false;
    }

    private function scrubString(string $text): string
    {
        $sessionId = $this->currentSessionId();
        if ($sessionId !== '') {
            $text = str_replace($sessionId, self::REDACTED, $text);
        }
        $text = (string) preg_replace(self::LINK_FRAGMENT_PATTERN, '$1='.self::REDACTED, $text);

        return (string) preg_replace_callback(
            self::EMAIL_PATTERN,
            fn (array $match) => 'email:'.EmailFingerprint::of($match[0]),
            $text,
        );
    }

    private function currentSessionId(): string
    {
        $request = request();

        return $request->hasSession() ? $request->session()->getId() : '';
    }

    /** @return array{class: class-string<Throwable>, message: string, code: int|string, file: string} */
    private function describe(Throwable $error): array
    {
        return [
            'class' => $error::class,
            'message' => $error->getMessage(),
            'code' => $error->getCode(),
            'file' => $error->getFile().':'.$error->getLine(),
        ];
    }
}
