<?php

use App\Content\ContentSource;
use Tests\Support\ContentFixture;
use Tests\Support\ContentPipeline;
use Tests\Support\RowOracle;

it('builds the rows the C2 code built for the same document', function () {
    $oracle = RowOracle::read();
    $meta = json_decode(file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true, 512, JSON_THROW_ON_ERROR);

    expect($oracle['documentHash'])->toBe($meta['documentHash'], 'El oráculo de filas es de otro documento: regeneralo en la base de la rama (quickstart.md, escenario 1).');

    $rows = ContentPipeline::rows()->fromSource(ContentSource::fromDirectory(ContentFixture::imagePath()));

    expect(RowOracle::digest($rows->toArray()))->toBe($oracle['tables']);
});
