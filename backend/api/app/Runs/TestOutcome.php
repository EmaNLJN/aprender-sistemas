<?php

namespace App\Runs;

enum TestOutcome: string
{
    case Pass = 'pass';
    case Fail = 'fail';
    case Missing = 'missing';
}
