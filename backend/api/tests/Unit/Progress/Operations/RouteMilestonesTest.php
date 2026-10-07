<?php

use App\Progress\Operations\RouteMilestones;

it('lists the ten milestones of the route, Rust first', function () {
    expect(RouteMilestones::KEYS)->toBe([
        'rust-memory', 'rust-commands', 'rust-files', 'rust-measure', 'rust-network',
        'go-memory', 'go-commands', 'go-files', 'go-measure', 'go-network',
    ]);
});
