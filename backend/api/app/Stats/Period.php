<?php

namespace App\Stats;

use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Carbon\WeekDay;
use LogicException;

final readonly class Period
{
    private function __construct(
        public CarbonImmutable $from,
        public CarbonImmutable $to,
        public Granularity $granularity,
        public string $timezone,
    ) {}

    public static function of(?string $from, ?string $to, ?Granularity $granularity, CarbonImmutable $now, string $timezone, int $defaultDays): self
    {
        $last = $to === null ? $now->setTimezone($timezone)->startOfDay() : self::localDate($to, $timezone);
        $first = $from === null ? $last->subDays($defaultDays - 1) : self::localDate($from, $timezone);

        return new self($first, $last, $granularity ?? Granularity::Day, $timezone);
    }

    public function days(): int
    {
        $first = self::localDate($this->from->format('Y-m-d'), 'UTC');
        $last = self::localDate($this->to->format('Y-m-d'), 'UTC');

        return (int) round($first->diffInDays($last)) + 1;
    }

    public function startsUtc(): string
    {
        return Instant::format($this->from);
    }

    public function endsUtc(): string
    {
        return Instant::format($this->to->addDay());
    }

    /** @return list<array{start: string, startsUtc: string, endsUtc: string}> */
    public function buckets(): array
    {
        $end = $this->to->addDay();
        $buckets = [];
        $cursor = $this->from;
        while ($cursor < $end) {
            $next = $this->nextBoundary($cursor);
            if ($next > $end) {
                $next = $end;
            }
            $buckets[] = ['start' => $cursor->format('Y-m-d'), 'startsUtc' => Instant::format($cursor), 'endsUtc' => Instant::format($next)];
            $cursor = $next;
        }

        return $buckets;
    }

    public function bucketsJson(): string
    {
        $rows = [];
        foreach ($this->buckets() as $index => $bucket) {
            $rows[] = [$index, $bucket['startsUtc'], $bucket['endsUtc']];
        }

        return json_encode($rows, JSON_THROW_ON_ERROR);
    }

    public function wholeJson(): string
    {
        return json_encode([[0, $this->startsUtc(), $this->endsUtc()]], JSON_THROW_ON_ERROR);
    }

    /** @return array{from: string, to: string, granularity: string, timezone: string} */
    public function toMeta(): array
    {
        return ['from' => $this->from->format('Y-m-d'), 'to' => $this->to->format('Y-m-d'), 'granularity' => $this->granularity->value, 'timezone' => $this->timezone];
    }

    public function cacheKey(): string
    {
        return implode('|', $this->toMeta());
    }

    private function nextBoundary(CarbonImmutable $cursor): CarbonImmutable
    {
        return match ($this->granularity) {
            Granularity::Day => $cursor->addDay(),
            Granularity::Week => $cursor->startOfWeek(WeekDay::Monday->value)->addWeek(),
            Granularity::Month => $cursor->startOfMonth()->addMonth(),
        };
    }

    private static function localDate(string $date, string $timezone): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!Y-m-d', $date, $timezone)
            ?: throw new LogicException("Not a date: {$date}");
    }
}
