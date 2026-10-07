<?php

namespace App\Runs\Evidence;

use App\Runs\TestOutcome;

final class EvidenceReader
{
    public function read(string $stdout, ExpectedEvidence $expected): Evidence
    {
        $wanted = $expected->hasCustomTest ? [...$expected->testKeys, 'custom'] : $expected->testKeys;
        $seen = $this->markers($stdout, $expected->nonce);
        $complete = $this->sentinels($stdout, $expected->nonce) === [count($wanted)];
        foreach (array_keys($seen) as $prefixed) {
            $complete = $complete && in_array(substr($prefixed, 2), $wanted, true);
        }
        $verdicts = [];
        foreach ($wanted as $key) {
            $outcomes = $seen['k:'.$key] ?? [];
            $complete = $complete && count($outcomes) === 1;
            $verdicts['k:'.$key] = count($outcomes) !== 1 ? TestOutcome::Missing : ($outcomes[0] === 'PASS' ? TestOutcome::Pass : TestOutcome::Fail);
        }
        $tests = [];
        foreach ($expected->testKeys as $key) {
            $tests[] = new TestVerdict($key, $verdicts['k:'.$key]);
        }

        return new Evidence($complete, $tests, $expected->hasCustomTest ? $verdicts['k:custom'] : null);
    }

    /** @return array<string, list<string>> keyed with a `k:` prefix because PHP turns a key such as '123' into an integer */
    private function markers(string $stdout, string $nonce): array
    {
        preg_match_all('/__TALLER_TEST__'.preg_quote($nonce, '/').':([A-Za-z0-9_]{1,64}):(PASS|FAIL)(?![A-Za-z0-9_])/', $stdout, $matches, PREG_SET_ORDER);
        $seen = [];
        foreach ($matches as $match) {
            $seen['k:'.$match[1]][] = $match[2];
        }

        return $seen;
    }

    /** @return list<int> */
    private function sentinels(string $stdout, string $nonce): array
    {
        preg_match_all('/__TALLER_END__'.preg_quote($nonce, '/').':([0-9]+)(?![0-9])/', $stdout, $matches);
        $counts = [];
        foreach ($matches[1] as $count) {
            $counts[] = (int) $count;
        }

        return $counts;
    }
}
