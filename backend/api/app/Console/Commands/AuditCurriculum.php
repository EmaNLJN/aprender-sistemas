<?php

namespace App\Console\Commands;

use App\Audit\AuditCatalogReader;
use App\Audit\AuditLimits;
use App\Audit\AuditLock;
use App\Audit\AuditPlan;
use App\Audit\AuditRefused;
use App\Audit\AuditReport;
use App\Audit\AuditReportText;
use App\Audit\AuditRun;
use App\Audit\AuditRunner;
use App\Audit\AuditSelection;
use App\Audit\ExecutorPreflight;
use App\Audit\HostStamps;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

final class AuditCurriculum extends Command
{
    protected $signature = 'curriculum:audit
        {--language= : rust o go; sin él, los dos}
        {--exercise=* : un ejercicio activo; se puede repetir}
        {--commit= : el commit del host}
        {--clean-tree= : yes o no}
        {--rust-image= : el identificador de taller-sandbox-rust:local}
        {--go-image= : el identificador de taller-sandbox-go:local}';

    protected $description = 'Audita el currículo en el sandbox propio: las soluciones aprueban y los iniciales fallan (B3)';

    public function handle(AuditLock $lock, AuditCatalogReader $reader, AuditPlan $plan, ExecutorPreflight $preflight, AuditRunner $runner): int
    {
        try {
            $selection = AuditSelection::fromOptions($this->languageOption(), $this->exerciseOption());
            $host = HostStamps::fromOptions($this->option('commit'), $this->option('clean-tree'), $this->option('rust-image'), $this->option('go-image'));
            $concurrency = $this->concurrency();
            $directory = $this->reportDirectory();
            $lock->acquire();
        } catch (AuditRefused $refused) {
            return $this->refuse($refused);
        }
        try {
            $catalog = $reader->read();
            $selection->requireKnown($catalog);
            $programs = $plan->programs($catalog, $selection);
            $preflight->check();
            $limits = AuditLimits::fromConfig();
            $startedAt = CarbonImmutable::now();
            $judged = $runner->run($programs, $concurrency, $limits, fn (int $done, int $total) => $this->line("Auditados {$done} de {$total} programas…"));
            $run = new AuditRun($startedAt, CarbonImmutable::now(), config()->string('runs.executor.runtime'), config()->string('audit.instance'), $concurrency, $selection, $host);

            return $this->publish(new AuditReport($run, $catalog, $limits, $judged), $limits, $directory);
        } catch (AuditRefused $refused) {
            return $this->refuse($refused);
        } finally {
            $lock->release();
        }
    }

    private function languageOption(): ?string
    {
        $language = $this->option('language');

        return is_string($language) ? $language : null;
    }

    /** @return list<string> */
    private function exerciseOption(): array
    {
        $ids = [];
        $values = $this->option('exercise');
        foreach ($values as $id) {
            if (is_string($id)) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    private function concurrency(): int
    {
        $concurrency = config()->integer('audit.concurrency');
        if ($concurrency < 1 || $concurrency > 8) {
            throw AuditRefused::concurrency($concurrency);
        }

        return $concurrency;
    }

    private function reportDirectory(): string
    {
        $directory = config()->string('audit.report_directory');
        if (! is_dir($directory) || ! is_writable($directory)) {
            throw AuditRefused::reportNotWritable($directory);
        }

        return $directory;
    }

    private function publish(AuditReport $report, AuditLimits $limits, string $directory): int
    {
        $lines = (new AuditReportText($report, $limits))->lines();
        file_put_contents("{$directory}/report.json", $report->json());
        file_put_contents("{$directory}/report.txt", implode("\n", $lines)."\n");
        foreach ($lines as $line) {
            $this->line($line);
        }

        return $report->exitCode();
    }

    private function refuse(AuditRefused $refused): int
    {
        $this->error($refused->getMessage());

        return self::INVALID;
    }
}
