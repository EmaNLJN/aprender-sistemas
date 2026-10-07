<?php

it('accepts request bodies up to 24 MiB so the progress import reaches Laravel', function () {
    expect(ini_get('post_max_size'))->toBe('24M');
});
