<?php

use Illuminate\Support\Facades\Hash;

const PASSWORD_GATE = 'app/Auth/AccountPasswords.php';

const PASSWORD_GATE_CALLS = ['Hash::', 'Auth::attempt(', 'attemptWhen(', 'logoutOtherDevices('];

arch('only AccountPasswords uses the Hash facade')
    ->expect('App')
    ->not->toUse(Hash::class)
    ->ignoring('App\Auth\AccountPasswords');

/** @return list<string> */
function passwordGateCallsIn(string $source): array
{
    $found = [];
    foreach (PASSWORD_GATE_CALLS as $call) {
        if (str_contains($source, $call)) {
            $found[] = $call;
        }
    }

    return $found;
}

it('recognizes each call that has to go through the password gate', function (string $source, string $call) {
    expect(passwordGateCallsIn($source))->toBe([$call]);
})->with([
    ['Hash::make($x);', 'Hash::'],
    ['Auth::attempt($credentials);', 'Auth::attempt('],
    ['Auth::attemptWhen($credentials, $callback);', 'attemptWhen('],
    ['Auth::logoutOtherDevices($x);', 'logoutOtherDevices('],
]);

it('keeps Hash, attempt and logoutOtherDevices inside AccountPasswords', function () {
    $root = dirname(__DIR__, 2);
    $offenders = [];

    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/app'));
    foreach ($files as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }
        $relative = substr($file->getPathname(), strlen($root) + 1);
        $source = file_get_contents($file->getPathname());
        if ($relative !== PASSWORD_GATE && $source !== false && passwordGateCallsIn($source) !== []) {
            $offenders[] = $relative;
        }
    }

    expect($offenders)->toBe([]);
});

it('has the file that the scan exempts', function () {
    expect(file_exists(dirname(__DIR__, 2).'/'.PASSWORD_GATE))->toBeTrue();
});
