<?php

namespace App\Console\Commands;

use App\Auth\Email;
use App\Auth\EmailTaken;
use App\Auth\Invitations;
use App\Auth\Role;
use Illuminate\Console\Command;

final class InviteUser extends Command
{
    protected $signature = 'taller:invite {email} {--role=student}';

    protected $description = 'Crea o renueva la invitación de un email e imprime su link';

    public function handle(Invitations $invitations): int
    {
        $email = Email::canonical($this->argument('email'));
        $role = Role::tryFrom($this->roleOption());

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $this->error("«{$email}» no es un email válido.");

            return self::INVALID;
        }
        if ($role === null) {
            $this->error("El rol «{$this->roleOption()}» no es válido: usá admin o student.");

            return self::INVALID;
        }

        try {
            $issued = $invitations->issue($email, $role, null);
        } catch (EmailTaken) {
            $this->error("Ya existe una cuenta con el email {$email}.");

            return self::FAILURE;
        }

        $this->info(($issued->renewed ? 'Invitación renovada' : 'Invitación creada')." para {$email} como {$role->value}; vence el {$invitations->expiresAt($issued->invitation)->utc()->format('Y-m-d H:i:s')} UTC.");
        $this->line($issued->link());

        return self::SUCCESS;
    }

    private function roleOption(): string
    {
        $role = $this->option('role');

        return is_string($role) ? $role : '';
    }
}
