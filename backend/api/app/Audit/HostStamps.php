<?php

namespace App\Audit;

final readonly class HostStamps
{
    private const COMMIT = '/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/';

    private const IMAGE = '/\Asha256:[0-9a-f]{64}\z/';

    public function __construct(public ?string $commit, public ?bool $cleanTree, public ?string $rustImage, public ?string $goImage) {}

    public static function fromOptions(mixed $commit, mixed $cleanTree, mixed $rustImage, mixed $goImage): self
    {
        return new self(
            self::matching($commit, self::COMMIT, '--commit tiene que ser el hash completo de un commit'),
            self::flag($cleanTree),
            self::matching($rustImage, self::IMAGE, '--rust-image tiene que ser «sha256:» y 64 hexadecimales'),
            self::matching($goImage, self::IMAGE, '--go-image tiene que ser «sha256:» y 64 hexadecimales'),
        );
    }

    private static function matching(mixed $value, string $pattern, string $problem): ?string
    {
        if ($value === null) {
            return null;
        }
        $text = is_string($value) ? $value : '';
        if (preg_match($pattern, $text) !== 1) {
            throw AuditRefused::invalidOption("{$problem} y llegó «{$text}».");
        }

        return $text;
    }

    private static function flag(mixed $value): ?bool
    {
        return match ($value) {
            null => null,
            'yes' => true,
            'no' => false,
            default => throw AuditRefused::invalidOption('--clean-tree admite yes o no y llegó «'.(is_string($value) ? $value : '').'».'),
        };
    }
}
