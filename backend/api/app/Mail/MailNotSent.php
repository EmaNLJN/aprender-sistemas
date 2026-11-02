<?php

namespace App\Mail;

use ReflectionClass;
use RuntimeException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

final class MailNotSent extends RuntimeException
{
    private function __construct(string $message, private readonly string $reason)
    {
        parent::__construct($message);
    }

    public static function from(TransportExceptionInterface $error): self
    {
        $reason = (new ReflectionClass($error))->getShortName().' '.$error->getCode();

        return new self("El proveedor no aceptó el correo: {$reason}.", $reason);
    }

    public static function unavailable(): self
    {
        return new self('El taller está en modo sólo link: el correo no se mandó.', 'unavailable');
    }

    public function cause(): string
    {
        return $this->reason;
    }
}
