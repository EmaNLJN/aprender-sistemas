<?php

use App\Runs\Evidence\ExecutorResult;
use App\Runs\Execution\ExecutorReply;
use App\Runs\Execution\ReplyKind;
use App\Runs\ExecutorPhase;

it('carries the result only in a Result reply', function () {
    $result = new ExecutorResult(ExecutorPhase::Run, 0, 'out', 'err', false, false, false, 12, 34);

    $reply = ExecutorReply::result($result);

    expect($reply->kind)->toBe(ReplyKind::Result)
        ->and($reply->result)->toBe($result)
        ->and($reply->retryAfterSeconds)->toBe(0)
        ->and($reply->cause)->toBe('')
        ->and($reply->httpStatus)->toBeNull();
});

it('carries what the executor asked to wait in a Busy reply', function () {
    $reply = ExecutorReply::busy(7);

    expect($reply->kind)->toBe(ReplyKind::Busy)
        ->and($reply->retryAfterSeconds)->toBe(7)
        ->and($reply->result)->toBeNull()
        ->and($reply->cause)->toBe('')
        ->and($reply->httpStatus)->toBeNull();
});

it('has no fields in a NotReached reply', function () {
    $reply = ExecutorReply::notReached();

    expect($reply->kind)->toBe(ReplyKind::NotReached)
        ->and($reply->result)->toBeNull()
        ->and($reply->retryAfterSeconds)->toBe(0)
        ->and($reply->cause)->toBe('')
        ->and($reply->httpStatus)->toBeNull();
});

it('carries the cause and the status in a Failed reply', function () {
    $withStatus = ExecutorReply::failed('status', 500);
    $withoutStatus = ExecutorReply::failed('connection', null);

    expect($withStatus->kind)->toBe(ReplyKind::Failed)
        ->and($withStatus->cause)->toBe('status')
        ->and($withStatus->httpStatus)->toBe(500)
        ->and($withStatus->result)->toBeNull()
        ->and($withStatus->retryAfterSeconds)->toBe(0)
        ->and($withoutStatus->cause)->toBe('connection')
        ->and($withoutStatus->httpStatus)->toBeNull();
});
