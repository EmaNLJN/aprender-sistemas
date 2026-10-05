<?php

namespace App\Content\Codec;

/** De qué tipo es el valor publicado de una clave y cómo se guarda en su columna. */
enum FieldType
{
    /** Un texto, en una columna de texto. */
    case Text;

    /** Un entero, en una columna numérica. */
    case Number;

    /** Un booleano, en una columna TINYINT(1). */
    case Flag;

    /** Un valor JSON cualquiera, como texto con los bytes que se publican. */
    case Json;
}
