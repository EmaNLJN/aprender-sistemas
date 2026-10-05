<?php

namespace Tests\Support;

use App\Content\ContentRows;
use App\Content\PortionAssembler;

final class ContentPipeline
{
    public static function rows(): ContentRows
    {
        return new ContentRows;
    }

    public static function assembler(): PortionAssembler
    {
        return new PortionAssembler;
    }
}
