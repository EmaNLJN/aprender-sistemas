<?php

namespace App\Progress\Import;

enum ImportSource: string
{
    case Storage = 'storage';
    case Export = 'export';
}
