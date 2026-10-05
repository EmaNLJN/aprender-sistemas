<?php

namespace App\Operations;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\QueryException;

/** ADR 0006 D35: fails closed, so an invisible performance_schema never passes as "no transactions". */
final class LongTransactionCheck
{
    private const MISSING_PRIVILEGE = 1142;

    private const PICOSECONDS_PER_SECOND = 1_000_000_000_000;

    public function __construct(private ConnectionInterface $connection) {}

    /**
     * @throws LongTransactionsOpen when a transaction has been ACTIVE for more than $seconds
     * @throws CheckUnavailable when it cannot see transactions: no privilege (1142), instrumentation off, or it cannot see itself
     */
    public function run(int $seconds): void
    {
        $this->connection->beginTransaction();
        try {
            $this->requireToSeeItself();
            $secondsOpen = $this->secondsOpenOfOthers($seconds);
        } catch (QueryException $error) {
            throw $this->unavailable($error);
        } finally {
            $this->connection->rollBack();
        }

        if ($secondsOpen !== []) {
            throw new LongTransactionsOpen($secondsOpen);
        }
    }

    private function requireToSeeItself(): void
    {
        /** @var object{STATE: string}|null $own */
        $own = $this->connection->selectOne(
            'select STATE from performance_schema.events_transactions_current where THREAD_ID = PS_CURRENT_THREAD_ID()'
        );
        if ($own === null || $own->STATE !== 'ACTIVE') {
            throw new CheckUnavailable(
                'El chequeo no ve su propia transacción: performance_schema está apagado o el consumidor events_transactions_current no está activo.'
            );
        }
    }

    /** @return list<int> */
    private function secondsOpenOfOthers(int $seconds): array
    {
        $rows = $this->connection->select(
            "select TIMER_WAIT from performance_schema.events_transactions_current
             where STATE = 'ACTIVE' and THREAD_ID <> PS_CURRENT_THREAD_ID() and TIMER_WAIT > ?
             order by TIMER_WAIT desc",
            [$seconds * self::PICOSECONDS_PER_SECOND],
        );
        $secondsOpen = [];
        foreach ($rows as $row) {
            if (is_numeric($row->TIMER_WAIT)) {
                $secondsOpen[] = intdiv((int) $row->TIMER_WAIT, self::PICOSECONDS_PER_SECOND);
            }
        }

        return $secondsOpen;
    }

    private function unavailable(QueryException $error): CheckUnavailable
    {
        $code = $error->errorInfo[1] ?? null;
        if ($code === self::MISSING_PRIVILEGE) {
            return new CheckUnavailable(
                'Falta el privilegio SELECT sobre performance_schema.events_transactions_current. '
                .'Aplicalo con: docker compose --profile ops run --rm db-grants (db-grants)',
                previous: $error,
            );
        }

        return new CheckUnavailable('No se pudo consultar performance_schema: '.$error->getMessage(), previous: $error);
    }
}
