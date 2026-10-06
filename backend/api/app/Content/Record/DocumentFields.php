<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use stdClass;

final readonly class DocumentFields
{
    private const FILE = 'curriculum.json';

    private function __construct(private stdClass $record, private string $path) {}

    /**
     * @param  list<string>  $known  the published keys of the record, derived ones included
     */
    public static function of(stdClass $record, string $path, array $known): self
    {
        foreach (KeyOrder::of($record)->keys as $key) {
            if (! in_array($key, $known, true)) {
                throw InvalidContent::at(self::FILE, "{$path}.{$key}", 'clave desconocida');
            }
        }

        return new self($record, $path);
    }

    public function text(string $key): string
    {
        $value = $this->required($key);
        if (! is_string($value) || trim($value) === '') {
            throw InvalidContent::at(self::FILE, "{$this->path}.{$key}", 'se esperaba un texto no vacío');
        }

        return $value;
    }

    public function optionalText(string $key): ?string
    {
        return $this->has($key) ? $this->text($key) : null;
    }

    public function number(string $key): int
    {
        $value = $this->required($key);
        if (! is_int($value)) {
            throw InvalidContent::at(self::FILE, "{$this->path}.{$key}", 'se esperaba un entero');
        }

        return $value;
    }

    public function flag(string $key): bool
    {
        $value = $this->required($key);
        if (! is_bool($value)) {
            throw InvalidContent::at(self::FILE, "{$this->path}.{$key}", 'se esperaba true o false');
        }

        return $value;
    }

    public function json(string $key): JsonValue
    {
        return JsonValue::fromDocument($this->required($key));
    }

    public function optionalJson(string $key): ?JsonValue
    {
        return $this->has($key) ? $this->json($key) : null;
    }

    public function keyOrder(): KeyOrder
    {
        return KeyOrder::of($this->record);
    }

    private function has(string $key): bool
    {
        return property_exists($this->record, $key);
    }

    private function required(string $key): mixed
    {
        if (! $this->has($key)) {
            throw InvalidContent::at(self::FILE, $this->path, "falta la clave «{$key}»");
        }

        return $this->record->{$key};
    }
}
