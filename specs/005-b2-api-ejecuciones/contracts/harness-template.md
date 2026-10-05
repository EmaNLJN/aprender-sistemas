# Contrato: la plantilla del harness y la evidencia

**Fecha**: 2026-10-05 | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Investigación**: [research.md](../research.md), R2 y R3

Es la interfaz más cargada de B2: la implementan dos renderizadores (PHP en el servidor y, desde A4, TypeScript en el navegador) y la lee el servidor para decidir qué pasó. Este archivo la fija completa. Cubre FR-004, FR-021 a FR-023, FR-035, FR-036 y FR-038.

## Qué es y dónde vive

Un texto por lenguaje, que envuelve el código del alumno y corre las pruebas:

- `content/harness/rust.tpl` y `content/harness/go.tpl` (los edita quien mantiene el currículo; texto UTF-8 con saltos de línea LF).
- El generador los valida y escribe `build/harness.json`, que tiene **exactamente** los bytes que la API publica en el recurso `GET /api/harness`: `{"rust":"<texto>","go":"<texto>"}`, compacto y en ese orden. El sha256 de esos bytes es `portions.harness` de `curriculum.meta.json`, la 18.ª porción (R1 de la investigación).
- `content:import` guarda cada texto en `harness_templates` y la API sirve el recurso con el contrato de las 17 porciones de C2: `ETag` (los primeros 32 hexadecimales del sha256), `Content-Version`, `Cache-Control: private, no-cache` y 304.

## Gramática

La plantilla se recorre línea por línea. Hay tres elementos:

1. **Marcadores** `{{nombre}}`. Los válidos fuera de las secciones son `{{code}}`, `{{nonce}}` y `{{count}}`; dentro de `tests`, `{{nonce}}`, `{{id}}` y `{{expression}}`; dentro de `imports`, `{{name}}`.
2. **Secciones** `tests` e `imports`. Una etiqueta de sección (`{{#tests}}` abre, `{{/tests}}` cierra) ocupa **sola su línea**, sin espacios, y no produce salida. Las líneas entre las dos etiquetas se repiten una vez por elemento. Las secciones no se anidan y cada una aparece a lo sumo una vez.
3. **Texto**: todo lo demás se copia tal cual.

Reglas de sustitución, iguales en los dos renderizadores:

- **Una sola pasada sobre la plantilla.** Cada marcador se reemplaza por su valor y el valor **no se vuelve a recorrer**: un `{{id}}` o un `{{code}}` dentro del código del alumno o de una expresión sale tal cual. Hoy 44 de las 822 expresiones tienen `{{` (cadenas de formato de Rust), así que la regla no es teórica.
- `{{code}}` lleva el código del alumno **sin recortar ni normalizar**: los números de línea del compilador dependen de eso.
- `{{nonce}}` son 32 hexadecimales en minúscula. Ocupa siempre el mismo largo, así que la vista previa del navegador (con un nonce fijo cualquiera de 32 caracteres) tiene los mismos números de línea que el programa real.
- `{{count}}` es la cantidad de elementos de `tests`, en decimal.
- `tests` son las pruebas activas del ejercicio en el orden de `position`, y después, si la hay, la prueba propia con `id` `custom`. La prueba propia cuenta sólo si no está vacía después de recortarla, y entra recortada. Se recortan sólo los espacios, los tabuladores y los saltos de línea (` `, `\t`, `\n` y `\r`) y nada más: `trim` recorta conjuntos distintos en PHP y en JavaScript (JavaScript también quita el espacio de no separación), y los dos renderizadores tienen que dar el mismo texto.
- `imports` (sólo Go) son los `imports` del ejercicio sin `fmt` y sin repetidos, en el orden de la primera aparición. `fmt` lo importa la plantilla.
- El programa termina con un solo salto de línea (el de la plantilla).

El generador rechaza una plantilla con un mensaje en español que dice archivo, línea y problema (`content/harness/rust.tpl: línea 6: {{name}}: marcador desconocido dentro de la sección tests; …`): saltos de línea CRLF, ausencia del salto final o un salto de más, un marcador desconocido o en la sección equivocada, una etiqueta que no está sola, secciones anidadas, repetidas, vacías o sin cerrar, `{{code}}` ausente o repetido, falta `{{nonce}}` o `{{count}}`, falta la sección `tests`, falta `imports` en Go o sobra en Rust.

## Las plantillas

`content/harness/rust.tpl`:

```text
{{code}}

fn main() {
    std::panic::set_hook(Box::new(|_| {}));
{{#tests}}
    let passed = std::panic::catch_unwind(|| { {{expression}} }).unwrap_or(false);
    println!("__TALLER_TEST__{{nonce}}:{{id}}:{}", if passed { "PASS" } else { "FAIL" });
{{/tests}}
    println!("__TALLER_END__{{nonce}}:{{count}}");
}
```

`content/harness/go.tpl`:

```text
package main

import (
    "fmt"
{{#imports}}
    "{{name}}"
{{/imports}}
)

{{code}}

func __tallerCheck(id string, test func() bool) {
    passed := false
    func() {
        defer func() { _ = recover() }()
        passed = test()
    }()
    if passed {
        fmt.Println("__TALLER_TEST__{{nonce}}:" + id + ":PASS")
    } else {
        fmt.Println("__TALLER_TEST__{{nonce}}:" + id + ":FAIL")
    }
}

func main() {
{{#tests}}
    __tallerCheck("{{id}}", func() bool { return {{expression}} })
{{/tests}}
    fmt.Println("__TALLER_END__{{nonce}}:{{count}}")
}
```

Notas para quien las edite:

- Rust conserva el diseño de `buildProgram` (un `catch_unwind` por prueba, con el hook de pánico silenciado), con el nonce y el centinela agregados. Una prueba que entra en pánico da `FAIL`.
- Go conserva `__tallerCheck` (con `recover`). Los `imports` del ejercicio van antes del código del alumno, como hoy.
- Un `{{x}}` literal en una cadena de formato de Rust (`println!("{{x}}")`) choca con la gramática: el generador lo rechaza como marcador desconocido. Hoy ninguna plantilla lo necesita.

## El fixture compartido

`qa/fixtures/shared/harness-cases.json` es el contrato de cómo se renderiza. Lo produce B2 y lo consume A4. Tiene el nonce fijo `0123456789abcdef0123456789abcdef` y once casos con sus entradas y el texto esperado, escrito a mano y línea por línea, **independiente de los dos renderizadores** (la regla del proyecto contra las pruebas tautológicas):

| Caso | Qué fija |
| --- | --- |
| `rust: two tests` | La forma base y el centinela con la cuenta 2 |
| `rust: a custom test is trimmed of spaces, tabs and line breaks, comes last and counts in the sentinel` | La prueba propia recortada (con espacio, tabulador, CR y LF), al final, con `custom` y cuenta 2 |
| `rust: a custom test of only whitespace is ignored` | Una prueba propia en blanco no existe |
| `rust: only ASCII whitespace is trimmed from the custom test` | Un espacio de no separación (U+00A0) no se recorta |
| `rust: placeholders inside the student's values are not expanded` | La pasada única |
| `rust: code that ends with a newline and an expression of two lines` | El código sin recortar y los números de línea |
| `rust: test keys that are not t1 to t3 go through as they are` | Claves libres |
| `go: without imports only fmt is imported` | La base de Go |
| `go: the imports of the exercise follow fmt, in order` | El orden de los `imports` |
| `go: fmt and repeated imports are dropped and the first appearance decides the order` | Sin `fmt` y sin repetidos |
| `go: three tests, a custom test and an import` | Todo junto, con cuenta 4 |

Formato de cada caso: `name`, `language`, `code`, `tests` (`[{id, expression}]`), `customTest` (opcional), `imports` (opcional) y `program`, la lista de líneas del programa esperado (el texto es las líneas unidas con `\n` y un `\n` final). Vive en `qa/fixtures/shared/` porque la imagen de pruebas de la API sólo ve lo que su Dockerfile copia: el stage `dev` de `backend/api/Dockerfile` copia ese directorio a `tests/Fixtures/shared/`, y Pest lo lee de ahí. El front lo lee del repositorio. Las plantillas con las que Pest lo contrasta son las reales: salen de `resources/content/harness.json`, que la etapa `curriculum` de la imagen genera desde `content/harness/`.

Verificado al planificar (R2): los once casos coinciden línea por línea con un renderizador independiente escrito en JavaScript, y cubren cada rama de la gramática.

## El protocolo de evidencia

El programa imprime, por la salida estándar:

- un marcador por prueba, en el orden de las pruebas: `__TALLER_TEST__<nonce>:<id>:PASS` o `…:FAIL`;
- al final, el centinela `__TALLER_END__<nonce>:<count>`.

`<id>` es la clave de la prueba (`[A-Za-z0-9_]{1,64}`, nunca `custom` salvo la prueba propia). El servidor lee la salida completa con dos expresiones regulares que llevan **el nonce de esa ejecución**:

```text
__TALLER_TEST__<nonce>:([A-Za-z0-9_]{1,64}):(PASS|FAIL)(?![A-Za-z0-9_])
__TALLER_END__<nonce>:([0-9]+)(?![0-9])
```

No hace falta que el marcador esté al principio de una línea: el nonce es la guarda, y así una salida del alumno sin salto de línea no deja a una prueba sin leer. Cada marcador encontrado se cuenta; después:

- **Evidencia completa** si y sólo si cada prueba esperada tiene exactamente un marcador, no hay marcadores con una clave que no se esperaba (la prueba propia cuenta como esperada sólo si se envió), y hay exactamente un centinela cuya cuenta es la cantidad de pruebas esperadas más la propia si hubo.
- El veredicto de una prueba es `pass` (un marcador `PASS`), `fail` (un marcador `FAIL`) o `missing` (ninguno o más de uno).
- La prueba propia se informa aparte (`pass`, `fail`, `missing`, o nada si no se envió) y **nunca cuenta para aprobar**.

Lo que esto frena y lo que no: marcadores sin el nonce, repetidos, de una prueba inexistente, un centinela ausente o con otra cuenta, una salida con código 0 antes de las pruebas, y una salida tan grande que el ejecutor la recorta antes de los marcadores (el ejecutor conserva el principio y descarta el resto, así que se pierden los últimos marcadores y el centinela). No frena a un código que lee el nonce de su propio binario e imprime marcadores válidos: es la evidencia autodeclarada que acepta el ADR 0005 §5, y B2 la llama «ejecutado en el servidor», nunca «verificado».

## La clasificación

Entrada: la respuesta del ejecutor (`phase`, `exitCode`, `stdout`, `stderr`, `truncated`, `timedOut`, `oomKilled`, `compileMs`, `runMs`; ver [executor.md](./executor.md)) y lo esperado (nonce, claves de las pruebas y si hubo prueba propia). El estado sale de este orden fijo, y el primero que aplica gana:

| # | Situación | Estado | Motivo |
| --- | --- | --- | --- |
| 1 | `timedOut` | `timeout` | — |
| 2 | `oomKilled` | `runtime_error` si `phase` es `run`, `compile_error` si es `compile` | `oom` |
| 3 | `phase` `compile` y `exitCode` distinto de 0 | `compile_error` | — |
| 4 | `phase` `run`, `exitCode` 137 (sin `oomKilled` ni `timedOut`) y el sandbox es runsc | `runtime_error` | `pids_limit` |
| 5 | `phase` `run` y `exitCode` mayor que 128 | `runtime_error` | `signal` (la señal es `exitCode` menos 128) |
| 6 | `phase` `run` y `exitCode` distinto de 0 (1 a 128) | `runtime_error` | — |
| 7 | `exitCode` 0, evidencia completa y todas las pruebas esperadas en `pass` | `passed` | — |
| 8 | `exitCode` 0, evidencia completa y alguna prueba esperada en `fail` | `failed` | — |
| 9 | `exitCode` 0, evidencia incompleta y `truncated` | `failed` | `output_limit` |
| 10 | `exitCode` 0 y evidencia incompleta | `failed` | `evidence_invalid` |

Tres detalles de la tabla:

- La fila 4 sólo vale con runsc, porque sólo allí un 137 sin memoria ni tiempo es el `--pids-limit` (ADR 0005, enmienda de B1). Con runc, un 137 es la señal 9 y cae en la fila 5. El servidor sabe cuál usa por `EXECUTOR_RUNTIME`.
- `truncated` es el OR de los cuatro flujos del ejecutor. Con la evidencia completa, un `truncated` por un flujo que no importa (por ejemplo `stderr`) no cambia el estado: se guarda y listo.
- Con evidencia incompleta (filas 9 y 10) igual se guarda el veredicto de cada prueba tal como se leyó (`pass`, `fail` o `missing`), para que se vea cuál faltó. En las filas 1 a 6 no se leyó evidencia: no hay veredictos.

Los casos de `infra_error` y `canceled` no salen de esta tabla: salen de lo que le pasó a la ejecución (ver [data-model.md](../data-model.md), «Una ejecución, de la admisión al cierre»).

## Lo que se verificó al planificar

Con `rustc` 1.97.1 en el host y la plantilla de Rust de arriba, las 137 soluciones de referencia de Rust dan `passed` y los 137 códigos iniciales dan 125 `failed`, 11 `compile_error` y un aborto (el inicial de `rust-71` termina con SIGABRT, `runtime_error` con motivo `signal`): 0 códigos iniciales aprueban. La clasificación fue la de la tabla, escrita en JavaScript. La plantilla de Go no se compiló (el host no tiene Go): la cubre el check de punta a punta con el ejecutor real (T018) y, después, la auditoría de B3.
