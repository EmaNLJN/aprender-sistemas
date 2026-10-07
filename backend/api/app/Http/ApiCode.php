<?php

namespace App\Http;

enum ApiCode: string
{
    case Unauthenticated = 'unauthenticated';
    case Forbidden = 'forbidden';
    case AccountDisabled = 'account_disabled';
    case EmailUnverified = 'email_unverified';
    case NotFound = 'not_found';
    case InvitationNotFound = 'invitation_not_found';
    case MethodNotAllowed = 'method_not_allowed';
    case EmailTaken = 'email_taken';
    case AccountMismatch = 'account_mismatch';
    case InvitationExpired = 'invitation_expired';
    case CsrfTokenMismatch = 'csrf_token_mismatch';
    case ValidationFailed = 'validation_failed';
    case AuthFailed = 'auth_failed';
    case PasswordConfirmationRequired = 'password_confirmation_required';
    case TooManyRequests = 'too_many_requests';
    case BadRequest = 'bad_request';
    case ServerError = 'server_error';
    case ClientRunIdReused = 'client_run_id_reused';
    case QuotaExceeded = 'quota_exceeded';
    case QueueFull = 'queue_full';
    case EpochMismatch = 'epoch_mismatch';
    case ClientOutdated = 'client_outdated';

    public function status(): int
    {
        return match ($this) {
            self::Unauthenticated => 401,
            self::Forbidden, self::AccountDisabled, self::EmailUnverified => 403,
            self::NotFound, self::InvitationNotFound => 404,
            self::MethodNotAllowed => 405,
            self::EmailTaken, self::AccountMismatch, self::EpochMismatch, self::ClientOutdated => 409,
            self::InvitationExpired => 410,
            self::CsrfTokenMismatch => 419,
            self::ValidationFailed, self::AuthFailed, self::ClientRunIdReused => 422,
            self::PasswordConfirmationRequired => 423,
            self::TooManyRequests, self::QuotaExceeded => 429,
            self::BadRequest => 400,
            self::ServerError => 500,
            self::QueueFull => 503,
        };
    }

    public function message(): string
    {
        return __('api.'.$this->value);
    }
}
