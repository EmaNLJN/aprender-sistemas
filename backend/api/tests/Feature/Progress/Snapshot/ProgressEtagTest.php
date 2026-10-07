<?php

use App\Progress\Snapshot\ProgressEtag;

it('writes the validator as a weak tag of the account, the epoch, the revision and the content version', function () {
    expect(ProgressEtag::of(7, 1, 42, '0123456789abcdef0123456789abcdef'))->toBe('W/"u7.e1.r42.c0123456789abcdef0123456789abcdef"');
});

it('changes with every one of its four parts', function () {
    $version = '0123456789abcdef0123456789abcdef';
    $other = 'fedcba9876543210fedcba9876543210';

    $tags = [
        ProgressEtag::of(7, 1, 42, $version), ProgressEtag::of(8, 1, 42, $version), ProgressEtag::of(7, 2, 42, $version),
        ProgressEtag::of(7, 1, 43, $version), ProgressEtag::of(7, 1, 42, $other),
    ];

    expect(array_unique($tags))->toHaveCount(5);
});
