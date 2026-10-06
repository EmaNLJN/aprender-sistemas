<?php

namespace App\Runs\Program;

use App\Runs\RunLanguage;
use LogicException;

final class ProgramRenderer
{
    private const PLACEHOLDER = '/\{\{(code|nonce|count|id|expression|name)\}\}/';

    public function render(RunLanguage $language, string $template, ProgramInput $input): string
    {
        $entries = $this->entries($input);
        $imports = $this->imports($language, $input->imports);
        $common = ['code' => $input->code, 'nonce' => $input->nonce, 'count' => (string) count($entries)];
        $out = [];
        $section = null;
        $body = [];
        foreach (explode("\n", $template) as $line) {
            if (preg_match('/\A\{\{#(tests|imports)\}\}\z/', $line, $open) === 1) {
                $section = $open[1];
                $body = [];
            } elseif (preg_match('/\A\{\{\/(tests|imports)\}\}\z/', $line) === 1) {
                foreach ($section === 'tests' ? $entries : $imports as $row) {
                    foreach ($body as $bodyLine) {
                        $out[] = $this->fill($bodyLine, $common + $row);
                    }
                }
                $section = null;
            } elseif ($section === null) {
                $out[] = $this->fill($line, $common);
            } else {
                $body[] = $line;
            }
        }

        return implode("\n", $out);
    }

    /** @return list<array{id: string, expression: string}> */
    private function entries(ProgramInput $input): array
    {
        $entries = [];
        foreach ($input->tests as $test) {
            $entries[] = ['id' => $test->key, 'expression' => $test->expression];
        }
        $custom = Whitespace::trim($input->customTest ?? '');
        if ($custom !== '') {
            $entries[] = ['id' => 'custom', 'expression' => $custom];
        }

        return $entries;
    }

    /**
     * @param  list<string>  $declared
     * @return list<array{name: string}>
     */
    private function imports(RunLanguage $language, array $declared): array
    {
        $rows = [];
        $seen = ['fmt'];
        foreach ($language === RunLanguage::Go ? $declared : [] as $name) {
            if (! in_array($name, $seen, true)) {
                $seen[] = $name;
                $rows[] = ['name' => $name];
            }
        }

        return $rows;
    }

    /** @param array<string, string> $values */
    private function fill(string $text, array $values): string
    {
        return preg_replace_callback(self::PLACEHOLDER, static fn (array $match): string => $values[$match[1]] ?? $match[0], $text)
            ?? throw new LogicException('La sustitución de la plantilla falló.');
    }
}
