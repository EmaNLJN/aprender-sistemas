<?php

namespace App\Content\Record;

use App\Content\PublishedJson;
use Illuminate\Support\Arr;
use LogicException;
use stdClass;

final readonly class KeyOrder
{
    /** @param list<string> $keys */
    private function __construct(public array $keys) {}

    public static function of(stdClass $record): self
    {
        $keys = [];
        foreach (get_object_vars($record) as $key => $value) {
            $keys[] = (string) $key;
        }

        return new self($keys);
    }

    /**
     * @param  list<string>  $known  the published keys of the record
     */
    public static function fromRow(string $json, array $known): self
    {
        $decoded = PublishedJson::decode($json);
        if (! is_array($decoded) || ! Arr::isList($decoded)) {
            throw new LogicException("key_order no es una lista de claves: {$json}");
        }
        $keys = [];
        foreach ($decoded as $key) {
            if (! is_string($key) || ! in_array($key, $known, true)) {
                throw new LogicException('La clave «'.(is_string($key) ? $key : PublishedJson::encode($key)).'» no tiene regla en su códec.');
            }
            $keys[] = $key;
        }

        return new self($keys);
    }

    public function has(string $key): bool
    {
        return in_array($key, $this->keys, true);
    }

    public function toRow(): string
    {
        return PublishedJson::encode($this->keys);
    }

    /**
     * @param  array<string, mixed>  $values  published key → value
     */
    public function publish(array $values): stdClass
    {
        $record = new stdClass;
        foreach ($this->keys as $key) {
            if (! array_key_exists($key, $values)) {
                throw new LogicException("La clave «{$key}» no tiene regla en su códec.");
            }
            $record->{$key} = $values[$key];
        }

        return $record;
    }
}
