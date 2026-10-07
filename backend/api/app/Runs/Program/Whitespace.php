<?php

namespace App\Runs\Program;

/** Only space, tab, LF and CR: PHP and JavaScript `trim` disagree on the rest (contracts/harness-template.md). */
final class Whitespace
{
    public static function trim(string $text): string
    {
        return trim($text, " \t\n\r");
    }
}
