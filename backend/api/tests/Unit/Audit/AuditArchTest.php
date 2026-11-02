<?php

use App\Audit\AuditCatalog;
use App\Audit\AuditPlan;
use App\Audit\AuditProgram;
use App\Audit\AuditReport;
use App\Audit\AuditReportText;
use App\Audit\AuditRun;
use App\Audit\AuditSelection;
use App\Audit\AuditedExercise;
use App\Audit\Diagnostic;
use App\Audit\HostStamps;
use App\Audit\JudgedProgram;
use App\Audit\PhaseTiming;
use App\Audit\ProgramJudge;
use App\Console\Commands\AuditCurriculum;
use App\Runs\Admission\RunAdmission;
use App\Runs\Execution\ProgressWriter;
use App\Runs\Execution\RunClaimer;
use App\Runs\Execution\RunCloser;
use App\Runs\Execution\RunStore;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;

arch('the audit does not admit, queue, claim, close or write progress (FR-012)')
    ->expect(['App\Audit', AuditCurriculum::class])
    ->not->toUse([Queue::class, Bus::class, 'App\Jobs', 'App\Progress', RunAdmission::class, RunStore::class, RunClaimer::class, RunCloser::class, ProgressWriter::class]);

arch('the plan, the rule and the report touch no database, HTTP client, queue, log or cache')
    ->expect([AuditCatalog::class, AuditedExercise::class, AuditProgram::class, AuditSelection::class, AuditPlan::class, PhaseTiming::class, Diagnostic::class, JudgedProgram::class, ProgramJudge::class, HostStamps::class, AuditRun::class, AuditReport::class, AuditReportText::class])
    ->not->toUse([DB::class, Http::class, Queue::class, Log::class, Cache::class, 'Illuminate\Database']);
