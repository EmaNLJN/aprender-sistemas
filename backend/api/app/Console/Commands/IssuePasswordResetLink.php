<?php

namespace App\Console\Commands;

use App\Auth\AccountNotActive;
use App\Auth\Email;
use App\Auth\PasswordResetLinks;
use App\Auth\ResetLinkThrottled;
use App\Models\User;
use Illuminate\Console\Command;

final class IssuePasswordResetLink extends Command
{
    protected $signature = 'taller:password-reset-link {email}';

    protected $description = 'Imprime un link de recuperación de contraseña para una cuenta existente';

    public function handle(PasswordResetLinks $links): int
    {
        $email = Email::canonical($this->argument('email'));
        $user = User::where('email', $email)->first();

        if ($user === null) {
            $this->error("No hay una cuenta con el email {$email}.");

            return self::FAILURE;
        }

        try {
            $issued = $links->issue($user);
        } catch (AccountNotActive) {
            $this->error("La cuenta {$email} está deshabilitada o en baja: no recibe un link de recuperación.");

            return self::FAILURE;
        } catch (ResetLinkThrottled $throttled) {
            $this->error("Ya se emitió un link hace menos de un minuto: faltan {$throttled->secondsLeft} segundos.");

            return self::FAILURE;
        }

        $this->info("Link de recuperación para {$email}, válido 60 minutos (hasta el {$issued->expiresAt->utc()->format('Y-m-d H:i:s')} UTC):");
        $this->line($issued->url);

        return self::SUCCESS;
    }
}
