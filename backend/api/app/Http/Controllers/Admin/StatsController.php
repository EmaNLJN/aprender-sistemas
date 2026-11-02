<?php

namespace App\Http\Controllers\Admin;

use App\Admin\PageMeta;
use App\Admin\PublishedAdminUser;
use App\Auth\AccountStatus;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\Requests\Admin\ContentStatsRequest;
use App\Http\Requests\Admin\ListStudentsRequest;
use App\Http\Requests\Admin\StatsPeriodRequest;
use App\Models\User;
use App\Runs\Record\Instant;
use App\Stats\Accounts\StudentAccessLog;
use App\Stats\Accounts\StudentDetailReader;
use App\Stats\Accounts\StudentDirectory;
use App\Stats\Content\ContentStatsReader;
use App\Stats\OverviewReader;
use App\Stats\StatsCache;
use Illuminate\Http\JsonResponse;

final class StatsController
{
    public function __construct(private StatsCache $cache) {}

    public function overview(StatsPeriodRequest $request, OverviewReader $reader): JsonResponse
    {
        $period = $request->period();
        $now = Instant::now();
        $entry = $this->cache->remember('overview', $period->cacheKey(), fn (): array => $reader->read($period, $now));

        return response()->json(['data' => $entry['data'], 'meta' => ['generatedAt' => $entry['generatedAt'], 'period' => $period->toMeta()]]);
    }

    public function exercises(ContentStatsRequest $request, ContentStatsReader $reader): JsonResponse
    {
        $period = $request->period();
        $filters = $request->filters();
        $entry = $this->cache->remember('exercises', $period->cacheKey().'|'.$filters->cacheKey(), fn (): array => $reader->read($filters, $period));

        return response()->json([
            'data' => $entry['data'],
            'meta' => ['generatedAt' => $entry['generatedAt'], 'period' => $period->toMeta(), 'filters' => $filters->toMeta()],
        ]);
    }

    public function students(ListStudentsRequest $request, StudentDirectory $directory): JsonResponse
    {
        $page = $directory->page($request->filters(), Instant::now());

        return response()->json(['data' => $page->items(), 'meta' => PageMeta::of($page)]);
    }

    public function student(StatsPeriodRequest $request, int $user, StudentDetailReader $reader, StudentAccessLog $log): JsonResponse
    {
        $found = User::query()->whereKey($user)->where('status', '<>', AccountStatus::Deleting->value)->first();
        if ($found === null) {
            return ApiError::of(ApiCode::NotFound);
        }
        $period = $request->period();
        $now = Instant::now();
        $data = $reader->read(PublishedAdminUser::from($found)->toPublished(), $user, $period, $now);
        $log->viewed($user, 'detail');

        return response()->json(['data' => $data, 'meta' => ['generatedAt' => Instant::iso($now), 'period' => $period->toMeta()]]);
    }
}
