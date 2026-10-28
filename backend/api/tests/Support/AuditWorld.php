<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;

final class AuditWorld
{
    public const ACTIVE = ['rust-01', 'rust-02', 'go-01', 'go-02'];

    /** @param  list<array{key: string, expression: string}>|null  $rustTests */
    public static function curriculum(?array $rustTests = null): void
    {
        RunWorld::exercise('rust-01', 'rust', $rustTests ?? [
            ['key' => 't1', 'expression' => 'true'],
            ['key' => 't2', 'expression' => '1 + 1 == 2'],
            ['key' => 't3', 'expression' => '2 * 2 == 4'],
        ]);
        RunWorld::exercise('rust-02', 'rust');
        RunWorld::exercise('rust-03', 'rust');
        RunWorld::exercise('go-01', 'go', imports: ['strings']);
        RunWorld::exercise('go-02', 'go');
        DB::table('catalogs')->insertOrIgnore(['code' => 'quests', 'slice_by' => 'language', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
        foreach ([...self::ACTIVE, 'rust-03'] as $id) {
            DB::table('exercises')->where('id', $id)->update(['starter' => self::code($id, 'starter'), 'solution' => self::code($id, 'solution')]);
        }
        DB::table('exercises')->whereIn('id', ['rust-02', 'go-02'])->update(['kind' => 'reparar']);
        DB::table('exercises')->where('id', 'go-02')->update(['catalog' => 'quests']);
        DB::table('exercises')->where('id', 'rust-03')->update(['status' => 'deprecated', 'retired_at' => now(), 'position' => null]);
        DB::table('content_imports')->update([
            'document_hash' => self::imageDocumentHash(),
            'portion_hashes' => json_encode(['harness' => self::imageHarnessHash()], JSON_THROW_ON_ERROR),
        ]);
    }

    public static function code(string $id, string $role): string
    {
        $name = str_replace('-', '_', "{$role}_{$id}");

        return str_starts_with($id, 'go-') ? "func {$name}() {}\n" : "fn {$name}() {}\n";
    }

    public static function imageDocumentHash(): string
    {
        return self::imageMeta()['documentHash'];
    }

    public static function imageHarnessHash(): string
    {
        return self::imageMeta()['portions']['harness'];
    }

    /** @return array{documentHash: string, portions: array{harness: string}} */
    private static function imageMeta(): array
    {
        return json_decode((string) file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true, 512, JSON_THROW_ON_ERROR);
    }
}
