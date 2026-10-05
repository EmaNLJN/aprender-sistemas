<?php

// Prints the row oracle of C6 (specs/002-c6-registros-tipados/research.md, R7). It builds C2's
// codecs by name, so it only runs on the C2 code at the base of the branch: the oracle is never
// regenerated with the code under test.
require __DIR__.'/../../vendor/autoload.php';

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use App\Content\ContentRows;
use App\Content\ContentSource;
use Tests\Support\ContentFixture;
use Tests\Support\RowOracle;

$directory = ContentFixture::imagePath();
$meta = json_decode((string) file_get_contents("{$directory}/curriculum.meta.json"), true, 512, JSON_THROW_ON_ERROR);
$rows = (new ContentRows(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new AtlasCodec, new GuideCodec))
    ->fromSource(ContentSource::fromDirectory($directory))
    ->toArray();

echo json_encode(
    ['documentHash' => $meta['documentHash'], 'tables' => RowOracle::digest($rows)],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
)."\n";
