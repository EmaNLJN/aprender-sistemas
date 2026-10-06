<?php

namespace App\Runs\Program;

final class ProgramComposer
{
    public function __construct(private ProgramRenderer $renderer) {}

    public function compose(ExerciseSnapshot $exercise, string $code, ?string $customTest, string $nonce): ComposedProgram
    {
        $input = new ProgramInput($code, $exercise->tests, $customTest, $exercise->imports, $nonce);
        $keys = [];
        foreach ($exercise->tests as $test) {
            $keys[] = $test->key;
        }

        return new ComposedProgram(
            $this->renderer->render($exercise->language, $exercise->template, $input),
            $keys,
            Whitespace::trim($customTest ?? '') !== '',
            $nonce,
        );
    }
}
