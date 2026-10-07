<?php

namespace App\Logging;

use Illuminate\Support\Facades\Auth;
use Monolog\LogRecord;
use Monolog\Processor\ProcessorInterface;

final class RequestContext implements ProcessorInterface
{
    public function __invoke(LogRecord $record): LogRecord
    {
        $request = request();
        $requestId = $request->attributes->get('request_id');
        if (! is_string($requestId)) {
            return $record;
        }

        $record->extra['request_id'] = $requestId;
        $record->extra['ip'] = $request->ip();
        $record->extra['user_id'] = Auth::guard('web')->id();

        return $record;
    }
}
