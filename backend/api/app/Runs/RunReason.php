<?php

namespace App\Runs;

enum RunReason: string
{
    case Oom = 'oom';
    case Signal = 'signal';
    case PidsLimit = 'pids_limit';
    case OutputLimit = 'output_limit';
    case EvidenceInvalid = 'evidence_invalid';
    case ExecutorBusy = 'executor_busy';
    case ExecutorError = 'executor_error';
    case JobFailed = 'job_failed';
    case Expired = 'expired';
    case AccountDisabled = 'account_disabled';
}
