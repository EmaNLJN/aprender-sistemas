<?php

namespace App\Console\Commands;

use App\Operations\CheckUnavailable;
use App\Operations\LongTransactionCheck;
use App\Operations\LongTransactionsOpen;
use Illuminate\Console\Command;

final class CheckLongTransactions extends Command
{
    protected $signature = 'taller:check-transactions {--seconds= : Umbral en segundos (por omisión taller.long_transaction_seconds)}';

    protected $description = 'Aborta el despliegue si hay transacciones abiertas hace demasiado (ADR 0006 D35)';

    public function handle(LongTransactionCheck $check): int
    {
        $option = $this->option('seconds');
        $seconds = is_numeric($option) ? (int) $option : config()->integer('taller.long_transaction_seconds', 30);

        try {
            $check->run($seconds);
        } catch (LongTransactionsOpen $open) {
            $count = count($open->secondsOpen);
            $noun = $count === 1 ? 'transacción abierta' : 'transacciones abiertas';
            $this->error("Hay {$count} {$noun} hace más de {$seconds} segundos (la más larga, {$open->secondsOpen[0]} s).");
            $this->line('Esperá a que terminen o cortá la sesión de MySQL que las mantiene, y volvé a desplegar.');

            return 1;
        } catch (CheckUnavailable $unavailable) {
            $this->error('No se pudo comprobar si hay transacciones abiertas: '.$unavailable->getMessage());

            return 2;
        }
        $this->info("No hay transacciones abiertas hace más de {$seconds} segundos.");

        return self::SUCCESS;
    }
}
