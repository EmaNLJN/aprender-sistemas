<?php

namespace App\Console\Commands;

use App\Content\ContentImporter;
use App\Content\ContentMismatch;
use App\Content\ContentPlan;
use App\Content\ContentSource;
use App\Content\ImportLock;
use App\Content\InvalidContent;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;

/**
 * Loads into MySQL the content tools/content/ generated (config/content.php). The migrate service
 * runs it on every `up`. A MySQL lock keeps two from running at once: if it is taken, the command
 * exits with an error instead of silently skipping the import (ADR 0006 D12).
 */
final class ImportContent extends Command
{
    protected $signature = 'content:import {--dry-run : Muestra qué cambiaría, sin escribir nada}';

    protected $description = 'Importa curriculum.json a las tablas de contenido (ADR 0006)';

    public function handle(ContentImporter $importer, ImportLock $lock): int
    {
        if (! $lock->acquire()) {
            $this->error('Ya hay otro content:import en curso (candado de MySQL «content-import»): este no corre.');

            return self::FAILURE;
        }
        try {
            return $this->runImport($importer, $lock);
        } catch (InvalidContent|ContentMismatch $error) {
            $this->error($error->getMessage());

            return self::FAILURE;
        } finally {
            $lock->release();
        }
    }

    private function runImport(ContentImporter $importer, ImportLock $lock): int
    {
        $source = ContentSource::fromDirectory(config()->string('content.path'));
        if ($source->sourceCommit() === null) {
            $this->warn('El contenido no trae commit de origen (CONTENT_SOURCE_COMMIT): content_imports lo registra como nulo.');
        }
        $plan = $importer->plan($source);
        $hash = $source->documentHash();

        if ($this->option('dry-run')) {
            $this->info("Simulación con el contenido sha256 {$hash}: no se escribió nada.");
            $this->summary($plan);

            return self::SUCCESS;
        }
        if (! $lock->stillHeld()) {
            return $this->lockLost();
        }
        // The importer checks it again as the first statement of its transaction.
        if (! $importer->import($source, $plan)) {
            return $this->lockLost();
        }

        if ($plan->isEmpty()) {
            $this->info("El contenido ya está importado (sha256 {$hash}): se verificaron y precalentaron las 18 porciones, sin escribir nada.");

            return self::SUCCESS;
        }
        $this->info("Importado el contenido sha256 {$hash}.");
        $this->summary($plan);

        return self::SUCCESS;
    }

    private function lockLost(): int
    {
        $this->error('Se perdió el candado de content:import (la conexión se reabrió): no se escribió nada.');

        return self::FAILURE;
    }

    private function summary(ContentPlan $plan): void
    {
        $report = $plan->report;
        $this->line('Filas escritas: '.$this->counts($report->written));
        $this->line('Filas retiradas: '.$this->counts($report->retiredRows));
        $this->ids('Ejercicios nuevos', $report->new);
        $this->ids('Cambios de corrección', $report->gradingChanged);
        $this->ids('Cambios de texto', $report->textChanged);
        $this->ids('Retirados', $report->retired);
        $this->ids('Reactivados', $report->reactivated);
        $this->line('Filas activas: '.$this->counts($report->counts));
    }

    /** @param array<string, int> $counts */
    private function counts(array $counts): string
    {
        return $counts === [] ? 'ninguna' : collect($counts)->map(fn (int $count, string $table) => "{$table} {$count}")->implode(', ');
    }

    /** @param list<string> $ids */
    private function ids(string $label, array $ids): void
    {
        $shown = Arr::take($ids, 10);
        $rest = count($ids) - count($shown);
        $detail = $ids === [] ? 'ninguno' : count($ids).' ('.implode(', ', $shown).($rest > 0 ? " y {$rest} más" : '').')';
        $this->line("{$label}: {$detail}");
    }
}
