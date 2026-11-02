<?php

namespace App\Mail;

enum MailKind: string
{
    case Invitation = 'invitation';
    case PasswordReset = 'password_reset';
    case PasswordChanged = 'password_changed';
    case AdminRole = 'admin_role';
    case AccountDeleted = 'account_deleted';
    case EmailVerification = 'email_verification';
    case EmailChanged = 'email_changed';
    case RegistrationAttempt = 'registration_attempt';

    public function carriesLink(): bool
    {
        return in_array($this, [self::Invitation, self::PasswordReset, self::EmailVerification], true);
    }
}
