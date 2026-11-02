<?php

namespace App\Audit;

use App\Runs\RunReason;
use App\Runs\TestOutcome;
use LogicException;

final class AuditReportText
{
    public function __construct(private AuditReport $report, private AuditLimits $limits) {}

    /** @return list<string> */
    public function lines(): array
    {
        $lines = [];
        foreach ($this->report->programs() as $judged) {
            if ($judged->audit === AuditVerdict::Finding) {
                $lines = [...$lines, ...$this->findingLines($judged)];
            }
        }
        foreach ($this->report->programs() as $judged) {
            if ($judged->audit === AuditVerdict::NoVerdict) {
                $lines[] = 'SIN VEREDICTO · '.$this->subject($judged).' · el ejecutor no devolvió un resultado válido ('.$judged->noVerdictCause.'): es un problema del sandbox, no del contenido';
            }
        }
        foreach ($this->report->programs() as $judged) {
            if ($judged->warning) {
                $lines = [...$lines, ...$this->warningLines($judged)];
            }
        }
        if ($lines !== []) {
            $lines[] = '';
        }

        return [...$lines, ...$this->summaryLines()];
    }

    private function subject(JudgedProgram $judged): string
    {
        $exercise = $judged->program->exercise;

        return "{$exercise->id()} ({$exercise->snapshot->language->value}, {$exercise->section}, {$exercise->kind->value}) · {$judged->program->role->label()}";
    }

    /** @return list<string> */
    private function findingLines(JudgedProgram $judged): array
    {
        $finding = $judged->finding ?? throw new LogicException('A finding without its kind.');
        $lines = ['HALLAZGO · '.$this->subject($judged).' · '.$this->statusText($judged).' · '.$finding->message()];
        $failing = [];
        foreach ($judged->tests as $test) {
            if ($test->outcome !== TestOutcome::Pass) {
                $failing[] = "{$test->key} «{$judged->program->exercise->labelOf($test->key)}» {$test->outcome->value}";
            }
        }
        if ($failing !== []) {
            $lines[] = '    pruebas: '.implode('; ', $failing);
        }
        if ($finding === FindingKind::CustomTestMismatch && $judged->program->customTest !== null) {
            $lines[] = '    prueba propia: esperada '.$judged->program->customTest->expected->value.', informada '.($judged->custom->value ?? 'missing');
        }
        if ($judged->diagnostic !== null) {
            $lines[] = '    diagnóstico:';
            foreach (explode("\n", $judged->diagnostic) as $line) {
                $lines[] = '      '.$line;
            }
        }

        return $lines;
    }

    private function statusText(JudgedProgram $judged): string
    {
        $text = $judged->status->value ?? '';
        if ($judged->reason !== null) {
            $text .= ' · '.$judged->reason->value;
            if ($judged->reason === RunReason::Signal && $judged->exitCode !== null) {
                $text .= ' '.($judged->exitCode - 128);
            }
        }

        return $text;
    }

    /** @return list<string> */
    private function warningLines(JudgedProgram $judged): array
    {
        $lines = [];
        foreach (['compilar' => $judged->compile, 'ejecutar' => $judged->run] as $phase => $timing) {
            if ($timing !== null && $this->limits->isNear($timing)) {
                $percent = (int) round($timing->ratio() * 100);
                $lines[] = 'AVISO · '.$this->subject($judged)." · {$phase} ".self::seconds($timing->ms).' s de '.self::seconds($timing->limitMs)." s ({$percent} %)";
            }
        }

        return $lines;
    }

    /** @return list<string> */
    private function summaryLines(): array
    {
        $run = $this->report->run();
        $counts = $this->report->counts();
        $lines = [
            'Auditoría del currículo · '.($run->selection->isFull() ? 'completa' : 'parcial')." · runtime {$run->runtime} · instancia {$run->instance} · {$run->concurrency} programas simultáneos",
            'Inicio '.$run->startedAt->utc()->format('Y-m-d H:i:s').' UTC · fin '.$run->finishedAt->utc()->format('H:i:s').' UTC · '.self::duration($this->report->durationMs()),
            "Programas: {$counts['programs']} · soluciones que aprueban: {$counts['solutionsPass']} de {$counts['solutions']} · iniciales que fallan como corresponde: {$counts['startersFailAsExpected']} de {$counts['starters']} · muestra de la prueba propia: {$counts['customTestSamplePass']} de {$counts['customTestSample']}",
            "Hallazgos: {$counts['findings']} · avisos: {$counts['warnings']} · sin veredicto: {$counts['noVerdict']}",
            'Tiempos (incluyen el arranque del contenedor):',
        ];
        foreach ($this->report->timing() as $language => $phases) {
            foreach (['compile' => 'compilar', 'run' => 'ejecutar'] as $key => $label) {
                $stats = $phases[$key];
                if ($stats !== null) {
                    $lines[] = "  {$language} {$label}: mediana ".self::seconds($stats['medianMs']).' s · máximo '.self::seconds($stats['maxMs'])
                        .' s · margen mínimo '.self::seconds($stats['minMarginMs']).' s de '.self::seconds($stats['limitMs']).' s';
                }
            }
        }
        $languages = [];
        foreach ($this->report->byLanguage() as $language => $count) {
            $languages[] = "{$language} {$count['exercises']} ejercicios";
        }
        $sections = [];
        foreach ($this->report->bySection() as $section => $count) {
            $sections[] = "{$section} {$count['exercises']}";
        }
        $lines[] = 'Por lenguaje: '.implode(' · ', $languages).' · por sección: '.implode(' · ', $sections);
        $lines[] = 'De registro: '.$this->recordText().' · veredicto: '.($this->report->isGreen() ? 'verde' : 'rojo');

        return $lines;
    }

    private function recordText(): string
    {
        $run = $this->report->run();
        $reasons = [];
        if (! $run->selection->isFull()) {
            $reasons[] = 'corrida parcial';
        }
        if ($run->runtime !== 'runsc') {
            $reasons[] = "runtime {$run->runtime}: con runc un 137 es la señal 9 y el --pids-limit no se confirma";
        }
        if ($this->report->counts()['noVerdict'] > 0) {
            $reasons[] = 'hay programas sin veredicto';
        }

        return $reasons === [] ? 'sí' : 'no ('.implode('; ', $reasons).')';
    }

    private static function seconds(int $ms): string
    {
        return number_format($ms / 1000, 2, ',', '');
    }

    private static function duration(int $ms): string
    {
        $seconds = intdiv($ms, 1000);

        return $seconds < 60 ? "{$seconds} s" : intdiv($seconds, 60).' min '.($seconds % 60).' s';
    }
}
