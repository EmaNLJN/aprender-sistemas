<?php

namespace App\Audit;

use RuntimeException;

final class AuditRefused extends RuntimeException
{
    public static function invalidOption(string $message): self
    {
        return new self($message);
    }

    public static function concurrency(int $value): self
    {
        return new self("AUDIT_CONCURRENCY tiene que estar entre 1 y 8 y es {$value}.");
    }

    public static function alreadyRunning(): self
    {
        return new self('Ya hay otra corrida de auditoría en curso: esperá a que termine. Dos corridas a la vez se borrarían los contenedores.');
    }

    public static function reportNotWritable(string $directory): self
    {
        return new self("No puedo escribir el informe en {$directory}: corré la auditoría con npm run api:audit, que monta qa/curriculum-audit/.");
    }

    public static function noContent(): self
    {
        return new self('No hay contenido importado: levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.');
    }

    public static function staleContent(string $imported, string $image): self
    {
        $importedShort = substr($imported, 0, 12);
        $imageShort = substr($image, 0, 12);

        return new self("El contenido importado ({$importedShort}) no es el de esta imagen ({$imageShort}): levantá el stack con «docker compose up --build -d --wait» y volvé a auditar.");
    }

    public static function staleHarness(string $imported, string $image): self
    {
        $importedShort = substr($imported, 0, 12);
        $imageShort = substr($image, 0, 12);

        return new self("La plantilla importada ({$importedShort}) no es la de esta imagen ({$imageShort}): reimportá el contenido levantando el stack con «docker compose up --build -d --wait» y volvé a auditar.");
    }

    public static function unknownExercise(string $id, string $languages): self
    {
        return new self("{$id} no es un ejercicio activo de {$languages}.");
    }

    public static function sampleMissing(string $id): self
    {
        return new self("La muestra de la prueba propia necesita {$id}, que no es un ejercicio activo: actualizá audit.custom_test_sample.");
    }

    public static function unreachable(string $url, string $cause): self
    {
        return new self("No alcanzo al ejecutor de auditoría en {$url} ({$cause}). npm run api:audit lo levanta; si lo usaste, mirá «docker compose --profile audit logs executor-audit».");
    }

    public static function tokenRejected(): self
    {
        return new self('El ejecutor de auditoría rechazó el token (401): el EXECUTOR_TOKEN de audit no es el de executor-audit.');
    }

    public static function unexpectedProbe(int $status): self
    {
        return new self("El ejecutor de auditoría respondió {$status} a la sonda del token; se esperaba 400.");
    }
}
