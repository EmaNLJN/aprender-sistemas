<?php

use App\Auth\BlockedPasswords;
use App\Auth\PasswordPolicy;
use App\Auth\PasswordViolation;
use App\Auth\PlainPassword;
use Tests\TestCase;

uses(TestCase::class);

function passwordPolicyOver(?string $listPath = null): PasswordPolicy
{
    return new PasswordPolicy(new BlockedPasswords($listPath ?? __DIR__.'/../../Support/fixtures/blocked-sample.txt'));
}

/** @return list<PasswordViolation> */
function violationsOf(string $password, ?string $name = null, ?string $email = null): array
{
    return passwordPolicyOver()->violations(PlainPassword::of($password), $name, $email);
}

it('accepts a password of 15 characters', function () {
    expect(violationsOf('x7Kp2mQ9vL4tZ8w'))->toBe([]);
});

it('rejects a password of 14 characters as too short', function () {
    expect(violationsOf('x7Kp2mQ9vL4tZ8'))->toBe([PasswordViolation::TooShort]);
});

it('accepts a password of 64 characters and rejects one of 65 as too long', function () {
    expect(violationsOf(str_repeat('x7Kp', 16)))->toBe([])
        ->and(violationsOf(str_repeat('x7Kp2', 13)))->toBe([PasswordViolation::TooLong]);
});

it('accepts 36 accented letters and rejects 37 for their bytes', function () {
    expect(violationsOf(str_repeat('á', 36)))->toBe([])
        ->and(violationsOf(str_repeat('á', 37)))->toBe([PasswordViolation::TooManyBytes]);
});

it('rejects a listed password whatever its case', function () {
    expect(violationsOf('PasswordPassword1'))->toBe([PasswordViolation::Blocked]);
});

it('rejects a password that contains the whole email', function () {
    expect(violationsOf('zz-ana@x.com-zzzzzz', null, 'Ana@X.com'))->toBe([PasswordViolation::ContainsEmail]);
});

it('rejects a password that contains the local part of the email when it has 4 or more characters', function () {
    expect(violationsOf('my-ANALUZ-secret-phrase', null, 'analuz@x.com'))->toBe([PasswordViolation::ContainsEmail]);
});

it('rejects the local part of an email written with a decomposed accent', function () {
    expect(violationsOf("my-p\u{00E1}pa-secret-phrase", null, "pa\u{0301}pa@x.com"))->toBe([PasswordViolation::ContainsEmail]);
});

it('allows the local part of the email when it has fewer than 4 characters', function () {
    expect(violationsOf('banana-split-sundae', null, 'ana@x.com'))->toBe([]);
});

it('rejects a password that contains the full name whatever its case', function () {
    expect(violationsOf('my ANA luz is long enough', 'Ana Luz', 'other@x.com'))->toBe([PasswordViolation::ContainsName]);
});

it('allows a name of fewer than 4 characters', function () {
    expect(violationsOf('banana-split-sundae', 'Ana', null))->toBe([]);
});

it('reports every reason at once in the order of the enum', function () {
    $password = 'ana@x.com Ana Luz '.str_repeat('á', 60);
    $list = tempnam(sys_get_temp_dir(), 'blocked');
    file_put_contents($list, mb_strtolower($password)."\n");

    $violations = passwordPolicyOver($list)->violations(PlainPassword::of($password), 'Ana Luz', 'ana@x.com');

    unlink($list);
    expect($violations)->toBe([
        PasswordViolation::TooLong,
        PasswordViolation::TooManyBytes,
        PasswordViolation::Blocked,
        PasswordViolation::ContainsEmail,
        PasswordViolation::ContainsName,
    ]);
});

it('measures the length after normalizing', function () {
    expect(violationsOf(str_repeat("a\u{0301}", 15)))->toBe([]);
});

it('says each violation in Spanish', function (PasswordViolation $violation, string $message) {
    app()->setLocale('es');

    expect($violation->message())->toBe($message);
})->with([
    [PasswordViolation::TooShort, 'Tiene que tener al menos 15 caracteres.'],
    [PasswordViolation::TooLong, 'Puede tener hasta 64 caracteres.'],
    [PasswordViolation::TooManyBytes, 'Es demasiado larga para guardarse: con tildes o eñes entran menos de 64 caracteres.'],
    [PasswordViolation::Blocked, 'Es una contraseña muy usada: elegí otra.'],
    [PasswordViolation::ContainsEmail, 'No puede contener tu email.'],
    [PasswordViolation::ContainsName, 'No puede contener tu nombre.'],
]);
