<?php

use App\Auth\EmailFingerprint;
use App\Logging\RequestContext;
use App\Logging\SecretScrubber;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\Processor\PsrLogMessageProcessor;
use Tests\TestCase;

uses(TestCase::class);

it('replaces the placeholders first and scrubs last on the stderr channel', function () {
    $logger = Log::channel('stderr')->getLogger();
    $executionOrder = array_values(array_filter(
        array_map(fn ($processor) => $processor::class, $logger->getProcessors()),
        fn (string $class) => in_array($class, [PsrLogMessageProcessor::class, RequestContext::class, SecretScrubber::class], true),
    ));
    $handler = new TestHandler;
    $logger->setHandlers([$handler]);

    $logger->error('Ingreso de {who}', ['who' => 'ana@x.com']);

    expect($executionOrder)->toBe([PsrLogMessageProcessor::class, RequestContext::class, SecretScrubber::class])
        ->and($handler->getRecords()[0]->message)->toBe('Ingreso de email:'.EmailFingerprint::of('ana@x.com'));
});
