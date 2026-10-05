<?php

namespace Tests\Support;

use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
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
        return new PortionAssembler(new ExerciseCodec, new WorkshopCodec, new WorldCodec, new GuideCodec);
    }
}
