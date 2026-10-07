<?php

namespace App\Console\Commands;

use App\Accounts\DeletionLedgerFile;
use App\Accounts\LedgerEntry;
use App\Accounts\MalformedLedger;
use App\Admin\AccountChanges;
use App\Auth\AccountStatus;
use App\Auth\Role;
use App\Jobs\PurgeUserData;
use App\Models\User;
use App\Runs\Record\Instant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

final class ReapplyDeletions extends Command
{
    protected $signature = 'taller:reapply-deletions {archivo : Ruta del libro en TSV, o - para la entrada estándar}';

    protected $description = 'Reaplica el libro de supresiones sobre una base restaurada';

    private int $deleted = 0;

    private int $reusedIds = 0;

    private int $ledgerRowsAdded = 0;

    /** @var list<int> */
    private array $failedIds = [];

    public function __construct(private DeletionLedgerFile $ledgerFile, private AccountChanges $changes)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->deleted = 0;
        $this->reusedIds = 0;
        $this->ledgerRowsAdded = 0;
        $this->failedIds = [];

        $contents = $this->readContents();
        if ($contents === null) {
            $this->error('No se pudo leer el archivo.');

            return self::FAILURE;
        }

        try {
            $entries = $this->ledgerFile->parse($contents);
        } catch (MalformedLedger $malformed) {
            $this->error('Hay líneas mal formadas: '.implode(', ', $malformed->lines).'. No se procesó nada.');

            return 2;
        }

        usort($entries, fn (LedgerEntry $first, LedgerEntry $second) => $first->userId <=> $second->userId);
        foreach ($entries as $entry) {
            $this->reapply($entry);
        }
        $this->raiseUserIdCounter();

        return $this->report();
    }

    private function readContents(): ?string
    {
        $path = $this->argument('archivo');
        if ($path === '-') {
            $contents = file_get_contents('php://stdin');
        } elseif (is_file($path) && is_readable($path)) {
            $contents = file_get_contents($path);
        } else {
            return null;
        }

        return $contents === false ? null : $contents;
    }

    private function reapply(LedgerEntry $entry): void
    {
        $this->ledgerRowsAdded += DB::table('account_deletions')->insertOrIgnore([
            'user_id' => $entry->userId,
            'user_created_at' => Instant::format($entry->userCreatedAt),
            'deleted_at' => Instant::format($entry->deletedAt),
        ]);

        $account = User::query()->find($entry->userId);
        if ($account === null) {
            $this->skip($entry->userId, 'no_account', 'no hay cuenta, nada que borrar');
        } elseif ($account->created_at?->format('Y-m-d H:i:s.v') !== Instant::format($entry->userCreatedAt)) {
            $this->reusedIds++;
            $this->skip($entry->userId, 'id_reused', 'id reutilizado por una cuenta nueva, no se toca');
        } else {
            $this->purge($entry->userId);
        }
    }

    private function skip(int $userId, string $reason, string $explanation): void
    {
        Log::info('ledger.skipped', ['user_id' => $userId, 'reason' => $reason]);
        $this->line("Cuenta {$userId}: {$explanation}.");
    }

    private function purge(int $userId): void
    {
        try {
            $this->changes->beginDeletion($userId, guardLastAdmin: false);
            PurgeUserData::dispatchSync($userId);
        } catch (Throwable $error) {
            $this->failedIds[] = $userId;
            $this->error("Cuenta {$userId}: falló la purga (".$error::class.').');

            return;
        }

        $this->deleted++;
        Log::info('ledger.reapplied', ['user_id' => $userId]);
        $this->line("Cuenta {$userId}: borrada.");
    }

    private function raiseUserIdCounter(): void
    {
        $highestUsedId = max((int) DB::table('users')->max('id'), (int) DB::table('account_deletions')->max('user_id'));
        DB::statement('SET SESSION information_schema_stats_expiry = 0');
        $currentCounter = (int) DB::scalar("select AUTO_INCREMENT from information_schema.TABLES where TABLE_SCHEMA = database() and TABLE_NAME = 'users'");
        $nextId = max($highestUsedId + 1, $currentCounter);
        if ($nextId > $currentCounter) {
            DB::statement("ALTER TABLE users AUTO_INCREMENT = {$nextId}");
        }
        $this->line("El próximo id de cuenta será {$nextId}.");
    }

    private function report(): int
    {
        $accounts = $this->deleted === 1 ? '1 cuenta borrada' : "{$this->deleted} cuentas borradas";
        $reused = $this->reusedIds === 1 ? '1 id reutilizado salteado' : "{$this->reusedIds} ids reutilizados salteados";
        $rows = $this->ledgerRowsAdded === 1 ? '1 fila agregada' : "{$this->ledgerRowsAdded} filas agregadas";
        $this->info("{$accounts}, {$reused} y {$rows} al libro.");

        if (! User::query()->where('role', Role::Admin->value)->where('status', AccountStatus::Active->value)->exists()) {
            $this->warn('No queda ningún admin activo. Creá uno con: taller:invite {email} --role=admin');
        }

        if ($this->failedIds === []) {
            return self::SUCCESS;
        }
        $this->error('No se pudo purgar: '.implode(', ', $this->failedIds).'.');

        return self::FAILURE;
    }
}
