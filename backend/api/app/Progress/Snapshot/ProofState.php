<?php

namespace App\Progress\Snapshot;

enum ProofState: string
{
    case Current = 'current';
    case Changed = 'changed';
    case Legacy = 'legacy';

    public static function of(bool $legacyAttempt, ?string $verifiedGradingHash, string $currentGradingHash): self
    {
        if ($legacyAttempt) {
            return self::Legacy;
        }

        return $verifiedGradingHash === $currentGradingHash ? self::Current : self::Changed;
    }
}
