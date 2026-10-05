<?php

namespace App\Content\Codec;

enum FieldType
{
    case Text;
    case Number;
    case Flag;
    case Json;
}
