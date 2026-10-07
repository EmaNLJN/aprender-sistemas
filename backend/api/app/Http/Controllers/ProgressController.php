<?php

namespace App\Http\Controllers;

use App\Content\ConditionalRequest;
use App\Content\ContentImports;
use App\Http\CurrentAccount;
use App\Progress\ContentNotImported;
use App\Progress\Snapshot\NotModified;
use App\Progress\Snapshot\ProgressEtag;
use App\Progress\Snapshot\ProgressSnapshotReader;
use App\Runs\Record\Instant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class ProgressController
{
    public function __construct(private ProgressSnapshotReader $reader, private ContentImports $imports) {}

    public function show(Request $request): JsonResponse|Response
    {
        $contentVersion = $this->imports->latestVersion() ?? throw new ContentNotImported;
        $result = $this->reader->read(
            CurrentAccount::of($request)->id,
            $contentVersion,
            fn (string $etag) => ConditionalRequest::matches($request, ProgressEtag::withoutWeakPrefix($etag)),
        );
        if ($result instanceof NotModified) {
            return response('', 304)->header('ETag', $result->etag);
        }

        return response()->json([
            'userId' => $result->userId,
            'epoch' => $result->epoch,
            'revision' => $result->revision,
            'resetAt' => $result->resetAt === null ? null : Instant::iso($result->resetAt),
            'contentVersion' => $result->contentVersion,
            'serverTime' => Instant::iso(Instant::now()),
            ...$result->areas->toArray(true),
        ])->header('ETag', ProgressEtag::of($result->userId, $result->epoch, $result->revision, $result->contentVersion));
    }
}
