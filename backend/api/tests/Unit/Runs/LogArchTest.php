<?php

/** @return list<string> */
function logCallsIn(string $source): array
{
    $found = [];
    $patterns = ['Facades\\Log;' => '/Facades\\\\Log;/', 'Log::' => '/(?<![A-Za-z])Log::/', 'logger(' => '/(?<![A-Za-z_>:])logger\(/'];
    foreach ($patterns as $call => $pattern) {
        if (preg_match($pattern, $source) === 1) {
            $found[] = $call;
        }
    }

    return $found;
}

it('recognizes each way of writing to the log', function (string $source, string $call) {
    expect(logCallsIn($source))->toBe([$call]);
})->with([
    ['use Illuminate\Support\Facades\Log;', 'Facades\Log;'],
    ['Log::info("x");', 'Log::'],
    ['logger("x");', 'logger('],
]);

it('does not mistake RunLog or a method named logger for the facade', function () {
    expect(logCallsIn('RunLog::closed($run); $this->logger(1); self::logger(2);'))->toBe([]);
});

it('keeps every log of the runs inside RunLog (FR-042)', function () {
    $root = dirname(__DIR__, 3);
    $offenders = [];

    foreach (['app/Runs', 'app/Jobs'] as $directory) {
        if (! is_dir("{$root}/{$directory}")) {
            continue;
        }
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator("{$root}/{$directory}", FilesystemIterator::SKIP_DOTS));
        foreach ($files as $file) {
            $path = substr($file->getPathname(), strlen($root) + 1);
            if ($file->getExtension() !== 'php' || $path === 'app/Runs/RunLog.php') {
                continue;
            }
            foreach (logCallsIn((string) file_get_contents($file->getPathname())) as $call) {
                $offenders[] = "{$path}: {$call}";
            }
        }
    }

    expect($offenders)->toBe([]);
});
