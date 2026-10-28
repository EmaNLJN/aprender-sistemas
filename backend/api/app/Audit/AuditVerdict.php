<?php

namespace App\Audit;

enum AuditVerdict: string
{
    case Passes = 'passes';
    case FailsAsExpected = 'fails_as_expected';
    case Finding = 'finding';
    case NoVerdict = 'no_verdict';
}
