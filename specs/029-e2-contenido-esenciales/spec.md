# Feature Specification: E2 · El contenido de Esenciales

**Feature Branch**: `029-e2-contenido-esenciales` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Draft (el clarify espera Q1 a Q5)

**Input**: Ítem **E2**, «Contenido de Esenciales», del épico backend. Lo creó el clarify de E1 el 2026-10-28 (Q5-A), y la [hoja de ruta](../backend-multiusuario/roadmap.md) todavía no tiene su fila: la cablea el coordinador, con la propuesta de `.coordinador/spec-e1-report.md` («Propuesta de alcance para la fila E2»). **Extiende a** [`specs/026-e1-esenciales/`](../026-e1-esenciales/spec.md), que todavía no está en `master` (PR #81): los enlaces a esa carpeta resuelven cuando se integre. De E1 toma «Qué es Esenciales para el alumno», la tabla de etapas, Q1, Q4 y Q5, FR-036, FR-039, FR-043 y FR-044, y las reglas de la etapa piloto de su plan (T004 y T005). Usa como compuerta la auditoría de B3 ([spec 020](../020-b3-auditoria-curriculo/spec.md): FR-029, FR-032 y FR-038, y su [contrato del resumen](../020-b3-auditoria-curriculo/contracts/audit-summary.md)). También se apoya en la [constitución](../../.specify/memory/constitution.md) (principio IV y «Disciplina de contenido») y en «Contenido del currículo» del [README](../../README.md). El [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) sigue en **propuesta**: E1 lo usa como base, y E2 no toca nada de lo que decide. Encargo del coordinador del 2026-10-28.

## Intención y alcance

**Lo que entendemos.** E1 deja Esenciales funcionando con una sola etapa por lenguaje: la piloto, «Leer un ejercicio» (la etapa 50, con `rust-138` a `rust-142` y `go-138` a `go-142`). E2 trae las otras tres etapas de la tabla de E1, con cinco ejercicios cada una por lenguaje: «Valores y tipos», «Decidir» y «Repetir». Al cerrar, Esenciales tiene 20 ejercicios por lenguaje y 40 en total. E2 no trae código, porque la plataforma ya existe: el generador, la API, el laboratorio y la auditoría. Si una etapa necesita código, eso es un bug o un ítem nuevo. E2 define cómo se produce y se aprueba cada etapa:
- qué trae cada una y dónde termina, para no repetir a la anterior ni a Inicial;
- el recorrido de una etapa, desde el borrador del agente hasta el merge;
- las compuertas automáticas y la humana;
- qué no cambia nunca;
- los criterios con los que revisa el usuario.

La spec no trae el texto de ningún ejercicio. Si esto no coincide con lo que buscás, es lo primero que hay que corregir: el resto sale de acá.

**Cómo sabremos que salió bien.**

1. Esenciales tiene cuatro etapas por lenguaje, en el orden de la tabla (Q1), con cinco ejercicios cada una. Quien nunca programó las recorre antes de llegar a `rust-01` o a `go-01`, y en ningún ejercicio encuentra un concepto que no se haya presentado antes.
2. Cada etapa entró en su propio PR (Q2), con las compuertas automáticas en verde, el resumen de una corrida de B3 en verde y la aprobación explícita del usuario para cada ejercicio.
3. Ningún ID publicado, ninguna clave de prueba ni ningún progreso guardado cambió. Los 274 ejercicios de antes de E1 siguen como en la línea base, y los de Esenciales ya publicados conservan su etapa y sus huellas.
4. Ningún ejercicio de Esenciales repite la situación, la función ni las pruebas de uno de Inicial, y cada error del compilador que enseña un `reparar` aparece en una sola etapa.
5. Ningún PR de E2 tocó el generador, la API, el front, el ejecutor, la auditoría ni la plantilla del harness.

**Entra:**

- Las etapas 2, 3 y 4 de Esenciales en Rust y en Go: 15 ejercicios por lenguaje, 30 en total.
- Las reglas de cada etapa: qué introduce, qué supone, qué deja para Inicial y qué errores enseñan sus `reparar`.
- El recorrido de una etapa, con sus compuertas.
- Los criterios de la revisión pedagógica.
- En cada PR, los contratos de conteo que E1 dejó a mano (FR-036 de E1).

**Queda fuera:**

- El código: el generador (`tools/content`), la plantilla de `content/harness/`, la API, el front, el ejecutor y la auditoría. Si una etapa los necesita, se para y se abre un bug (extensión `bug`) o un ítem nuevo.
- Esenciales en la campaña, el Atlas, Sistemas, la Biblioteca o el Recorrido (Q3 de E1).
- Una quinta etapa, o cambiar la cantidad por etapa (Q1 de E1): sería un ítem nuevo.
- Editar Inicial para que encadene con Esenciales: sus ejercicios no cambian.
- Corregir ejercicios ya publicados dentro de un PR de etapa (Q5).
- Un explorador visual propio (FR-034 de E1).

**Sin hacer a propósito (YAGNI):**

- una herramienta nueva para comparar el contenido generado: alcanza con el meta que ya escribe `tools/content` (FR-010);
- una plantilla o un generador de ejercicios;
- un formulario o una herramienta para la revisión: el registro es una lista en la descripción del PR (FR-011);
- un registro aparte de IDs reservados: los IDs salen de la posición (Q4 de E1).

**Actores:**

- el alumno que empieza;
- el alumno que ya avanzó, en Esenciales o fuera;
- el agente redactor, que escribe el borrador y corre los checks;
- el usuario, que revisa la pedagogía y mergea;
- el coordinador, que integra, corre la auditoría y abre el PR;
- la CI, que comprueba el resumen de B3.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta del clarify (Q1 a Q5).

| Pedido | Fuente |
| --- | --- |
| «El resto va en un ítem nuevo, **E2, “Contenido de Esenciales”**, una etapa por PR», con `npm run curriculum`, `npm test`, la auditoría de B3 y la revisión del usuario | Usuario, clarify de E1 (Q5-A) |
| Esenciales es para quien no programó o nunca leyó un programa de Rust o de Go: leer un ejercicio, valores y tipos, decidir y repetir, con `reparar` que enseñan a leer el compilador. Cuatro etapas de cinco por lenguaje | Usuario, clarify de E1 (Q1-A) |
| Los IDs son correlativos por lenguaje (`rust-138`…, `go-138`…) | Usuario, clarify de E1 (Q4-A) |
| Esenciales se ve sólo en el laboratorio, primero en el mapa y en el recorrido libre | Usuario, clarify de E1 (Q3-A) |
| Cada ejercicio pasa por un borrador desde fuentes oficiales, `npm run curriculum` y `npm test`, B3 y la revisión pedagógica del usuario, que es la compuerta antes del PR | Spec de E1, FR-044 |
| Las reglas de redacción de la piloto: un concepto por ejercicio, la firma dada, el porqué de cada línea, pruebas sobre funciones, uno o dos `reparar` por etapa | Spec de E1, «Qué es Esenciales para el alumno»; plan de E1, T004 |
| La auditoría es obligatoria en los PR que tocan lo auditado, con el resumen de una corrida sobre el último commit y el árbol limpio, y la CI comprueba ese resumen | Usuario, clarify de B3 (Q2 y Q3); spec 020, FR-032 y FR-038 |
| Los IDs son inmutables y nunca se reutilizan; el contenido se edita en `content/`, nunca en `build/`; lo que se retira no se borra | Constitución, principio IV; `README.md`, «Contenido del currículo» |
| Un ejercicio nuevo actualiza en el mismo commit `curriculum-ids.json`, los asserts de `content-check` y de `systems-check` y las cantidades del README | `README.md`, «Contenido del currículo»; spec de E1, FR-036 |
| La spec deja claro el contenido de cada etapa y cómo encadena, el flujo de una etapa, qué nunca cambia y los criterios de calidad, y trae como mucho 5 preguntas | Encargo del coordinador |

## Clarifications

Pendiente: el usuario todavía no respondió Q1 a Q5. Los requisitos que dependen de una pregunta llevan «(Q*n*)» y están escritos con la opción recomendada.

## Preguntas del clarify

**Q1. ¿Se mantienen el orden y el reparto de temas de la tabla de E1?** *(«El contenido de cada etapa»; FR-001 y FR-002)* La tabla de E1 es la guía de quien redacta, y el usuario aprueba el texto. Al bajarla a cinco ejercicios aparecen dos cosas. La etapa 2 tiene seis conceptos para cinco ejercicios (enteros, decimales, booleanos, texto, `let mut` y conversiones), contra la regla de un concepto por ejercicio. Y un booleano sin comparaciones todavía no tiene nada que decidir.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | La tabla de E1 tal cual: 2. Valores y tipos, con los booleanos; 3. Decidir; 4. Repetir | Algún ejercicio de la etapa 2 junta dos conceptos, o uno queda sin ejercicio propio |
| B | La tabla de E1 con `bool` en la etapa 3: aparece con las comparaciones, que son las que lo producen. La etapa 2 queda con cinco conceptos, uno por ejercicio | Un cambio chico a la guía de E1, que se registra en esta spec. Ningún ID ni etapa cambia |
| C | Cambiar «Repetir» por «Funciones que llaman a funciones» y dejar los bucles para Inicial, que ya los enseña en `rust-08`, `rust-09` y `go-07` | Menos superposición con Inicial, pero los bucles llegan a Inicial sin el escalón previo. Cambia uno de los cuatro temas que el usuario aprobó en Q1 de E1 |

**Recomendada: B.** Cumple la regla de un concepto por ejercicio sin cambiar los temas que el usuario aprobó, y presenta `bool` donde tiene sentido. **Costo:** una diferencia con la tabla de E1, que esta spec deja escrita.

**Q2. ¿Rust y Go van juntos o separados?** *(«El recorrido de una etapa»; FR-013)* Los IDs y las etapas son independientes por lenguaje: la etapa 2 de Rust puede entrar antes que la de Go sin romper nada.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Un PR por etapa, con los dos lenguajes: 3 PRs con 10 ejercicios cada uno, como la piloto de E1 | Una revisión de 10 ejercicios por PR. Un lenguaje trabado frena al otro |
| B | Un PR por etapa y lenguaje: 6 PRs con 5 ejercicios cada uno | Revisiones más cortas y cada lenguaje a su ritmo. Pero son 6 corridas de B3 y 6 rondas de contratos de conteo, y los dos lenguajes pueden quedar con distinta cantidad de etapas durante semanas |
| C | Un PR por lenguaje con las tres etapas | 2 PRs, pero contradice «una etapa por PR» (Q5-A de E1) y pide revisar 15 ejercicios de una vez |

**Recomendada: A.** La etapa es la misma unidad pedagógica en los dos lenguajes. Revisarlas juntas ayuda a que los dos recorridos sean parejos, y cada PR cuesta una sola corrida de B3 y una sola ronda de conteos. **Costo:** si un lenguaje necesita más rondas de revisión, el otro espera.

**Q3. ¿Qué pasa si una etapa no aprueba la revisión?** *(FR-011 y FR-014)* Las etapas se integran en orden (FR-006), así que una etapa trabada frena el merge de las siguientes.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Se corrige en la misma rama hasta que el usuario apruebe los ejercicios de la etapa. No hay merges parciales. Si un ejercicio sigue sin aprobarse después de dos rondas, el agente propone reemplazarlo por otro con el mismo ID (todavía no se publicó). Si lo que falla es el tema de la etapa, la etapa se para y el cambio de tema vuelve al usuario como decisión | La etapa espera entera, y las siguientes se pueden redactar (Q4) pero no integrar |
| B | Se integran los ejercicios aprobados y el resto queda para después | No funciona con lo que E1 deja: `content-check` exige etapas de cinco con los IDs atados a la posición (plan de E1, T009). Habría que cambiar ese check, que es código, fuera de E2 |
| C | Se integra la etapa con los pendientes anotados, y se corrigen después con un bug | Saca la compuerta humana. Al publicarse, los IDs y las claves de prueba quedan fijos, el progreso de los alumnos se ancla a un texto flojo, y cada arreglo pide otra corrida de B3 |

**Recomendada: A.** Mantiene la revisión como compuerta, y antes del merge un ejercicio se puede reescribir sin costo. **Costo:** una etapa difícil demora el resto.

**Q4. ¿Las etapas se redactan en serie o solapadas?** *(FR-006 y FR-008)* El merge es en serie a la fuerza, porque la etapa se numera por su posición. La pregunta es cuándo empieza el borrador de cada etapa.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | En cadena: el agente redacta la etapa N+1 mientras el usuario revisa la N. La N+1 se integra después de la N, rebasada sobre ella, y antes de la revisión se comprueba contra el texto final de la N | Retrabajo si la revisión de la N mueve un concepto. Los contratos de conteo chocan al rebasar, pero se resuelven a mano |
| B | En serie: la N+1 empieza cuando la N ya se integró | Lo más simple, y la N+1 lee el texto final. Son tres ciclos completos, y el usuario espera entre uno y otro |
| C | Las tres a la vez, con revisión en orden | El borrador más rápido, pero el usuario recibe 30 ejercicios juntos, y el retrabajo es mayor si la revisión de la etapa 2 cambia un límite |

**Recomendada: A.** El usuario siempre tiene una etapa para revisar, y el agente no espera. **Costo:** el riesgo de retrabajo en la etapa siguiente, acotado porque cada etapa supone sólo lo que la tabla asigna a las anteriores.

**Q5. ¿Un PR de etapa puede corregir un ejercicio ya publicado de la piloto o de una etapa anterior?** *(FR-015 y FR-017)* La revisión de una etapa puede descubrir algo en una anterior: un concepto que se adelantó, una palabra que no se explicó o una pista que no ayuda.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | No. Un PR de etapa sólo agrega. Un arreglo va en su propio PR `fix(content): …`: con la extensión `bug` si es un error, con B3 y con la revisión del usuario, y sin cambiar el ID ni las claves | Un PR más por arreglo. A cambio, la comprobación de que nada publicado cambió (FR-010) queda mecánica: en un PR de etapa, cero huellas publicadas distintas |
| B | Sí, en el mismo PR, declarado en la descripción | Menos PRs, pero la comprobación necesita excepciones, y la revisión mezcla lo nuevo con lo publicado |
| C | Nunca se corrige un texto publicado | Demasiado rígido. E1 (FR-039) ya prevé que corregir un texto o una pista cambie huellas a propósito |

**Recomendada: A.** Cada PR hace una sola cosa y se comprueba sin excepciones. **Costo:** un arreglo de la piloto descubierto en la etapa 3 va en un PR aparte.

**Partición.** La spec tiene 18 requisitos, muy por debajo de los 52 de C3a. No se propone partir: Q2 y Q4 sólo deciden cómo se reparten los PRs.

## El contenido de cada etapa

La tabla de E1 es la guía. Estas tablas la bajan a límites que se pueden revisar: qué introduce cada etapa, qué supone, qué deja para Inicial y qué errores enseñan sus `reparar`. Están escritas con Q1-B: `bool` va en la etapa 3. Con Q1-A, `bool` vuelve a la etapa 2. Son la guía de quien redacta, y el texto final lo aprueba el usuario (FR-011).

**Para todas las etapas:**
- **Lo que ninguna usa:** colecciones (arrays, slices, vectores o maps), structs, métodos propios, `Option` o `Result`, errores como valores, punteros, préstamos, closures, genéricos ni concurrencia.
- **La biblioteca estándar:** una función sólo llama a lo que la consigna presenta, como `len`.
- **Imprimir:** se nombra en la consigna o en la revisión, nunca en las pruebas (E1).
- **Sin `imports`:** si un ejercicio de Go necesitara uno, tiene que estar en el caché del sandbox (FR-027 de B3).

**Rust**

| Etapa | Introduce | Supone | Deja para Inicial (dónde lo enseña) | Errores para sus `reparar` (uno o dos) |
| --- | --- | --- | --- | --- |
| 1. Leer un ejercicio (E1; etapa 50; `rust-138` a `rust-142`) | La consigna, la firma y una prueba; devolver un valor con la última expresión | Nada | — | Lo decide E1: tipos que no coinciden o una variable inmutable (T004) |
| 2. Valores y tipos (etapa 51; `rust-143` a `rust-147`) | Enteros (`i32`, `u32`) y su aritmética; decimales (`f64`); `let` y `let mut`; la conversión explícita con `as`; texto literal (`&str` dado en la firma) | La etapa 1 | El shadowing (`rust-04`); las tuplas y el resto `%` (`rust-05`); `String`, el `&` y los slices (`rust-ownership` y `rust-text`, `rust-11` a `rust-20`). El `&` de `&str` se nombra sin explicarse | El de la piloto que no se haya usado (E0308, tipos que no coinciden, o E0384, asignar dos veces una variable inmutable); E0277, sumar un entero y un decimal sin convertir |
| 3. Decidir (etapa 52; `rust-148` a `rust-152`) | `bool`; las comparaciones; `&&`, `\|\|` y `!`; `if` y `else` como expresión; `else if`; un `match` simple sobre enteros, con `_` | Las etapas 1 y 2 | Las guardas con `return` temprano (`rust-10`). `rust-06` (elegir entre dos textos con `if`) y `rust-07` (un `match` de códigos) usan las mismas construcciones: Esenciales no repite sus situaciones | E0317, un `if` sin `else` usado como valor; E0004, un `match` que no cubre todos los casos |
| 4. Repetir (etapa 53; `rust-153` a `rust-157`) | `for` sobre un rango `a..b`; `while`; contar y acumular en una variable `mut` | Las etapas 1 a 3 | El rango que incluye su final y su reparación (`rust-08`); `loop` con `break` y un valor (`rust-09`); los iteradores (`rust-iterators`) | E0425, usar fuera del bucle una variable declarada adentro |

**Go**

| Etapa | Introduce | Supone | Deja para Inicial (dónde lo enseña) | Errores para sus `reparar` (uno o dos) |
| --- | --- | --- | --- | --- |
| 1. Leer un ejercicio (E1; etapa 50; `go-138` a `go-142`) | La consigna, la firma y una prueba; devolver un valor con `return` | Nada | — | Lo decide E1: una variable sin usar o tipos mezclados (T004) |
| 2. Valores y tipos (etapa 51; `go-143` a `go-147`) | `int` y su aritmética; `float64`; `string` y `len`; `var` y `:=`; la conversión explícita (`float64(n)`, `int(x)`) | La etapa 1 | La división entera que pierde decimales (`go-02`); los valores cero de varios tipos (`go-03`; `var` los nombra sin ser el ejercicio); la asignación múltiple (`go-04`); los bits (`go-05`); las runas y los bytes (`go-collections`) | El de la piloto que no se haya usado («declared and not used» o «mismatched types int and float64»); «(truncated)», guardar un decimal en un `int` |
| 3. Decidir (etapa 52; `go-148` a `go-152`) | `bool`; las comparaciones; `&&`, `\|\|` y `!`; `if`, `else if` y `else`; un `switch` con valores exactos y `default` | Las etapas 1 y 2 | Las guardas con retorno temprano (`go-06`); el `switch` sin condición, con rangos (`go-08`); devolver un resultado y un estado (`go-09`) | «missing return», una función que no devuelve en todos los caminos; «non-boolean condition in if statement» |
| 4. Repetir (etapa 53; `go-153` a `go-157`) | `for` de tres partes; `for` sólo con condición (el `while` de Go); `for i := range n` sobre un entero; contar y acumular | Las etapas 1 a 3 | `range` sobre un slice (`go-07` y `go-slices`); las funciones con memoria (`go-10`) | «undefined», usar la variable del `for` fuera del bucle |

**Cómo encadena.**
- **Con la piloto.** La etapa 2 empieza donde termina la 1. La piloto todavía no está escrita, así que el borrador de la etapa 2 lee los cinco ejercicios publicados de cada lenguaje. Si la piloto ya usó un concepto o un error de la tabla, la etapa 2 no lo repite, y toma el siguiente candidato.
- **Entre etapas.** Cada etapa supone sólo lo que las anteriores presentaron, tal como se publicó. Un concepto se presenta en una sola etapa, y las siguientes lo usan sin volver a explicarlo.
- **Con Inicial.** En el recorrido libre, después de `rust-157` viene `rust-01`, y después de `go-157`, `go-01` (FR-028 de E1). Que un concepto se presente en Esenciales y se aplique en Inicial no es superposición: es el escalón que E1 pidió. Sí lo es repetir la situación, la función o las pruebas de un ejercicio de Inicial (FR-003).
- **Una corrección a E1.** Su tabla dice que la etapa 4 no se superpone con Inicial, pero `rust-08` (`for` sobre `1..=n` con un acumulador), `rust-09` (`loop` con `break` y un valor) y `go-07` (`range` con un acumulador) ya están en la segunda etapa de Inicial. La columna «Deja para Inicial» lo resuelve.

**Los conteos por etapa.** Son los valores que se esperan con el plan de hoy (Q2-A). Las pruebas los toman de la base y de los deltas: +5 ejercicios, +1 tema, +15 pruebas y +15 pistas por lenguaje y por etapa. Nunca se copia un número de esta tabla (TR-15 del plan de E1).

| Conteo | Con E1 | Etapa 2 | Etapa 3 | Etapa 4 |
| --- | --- | --- | --- | --- |
| Ejercicios de Esenciales por lenguaje (la pestaña Esenciales) | 5 | 10 | 15 | 20 |
| Ejercicios por lenguaje (el sello, «x/N resueltos» y los visibles) | 142 | 147 | 152 | 157 |
| Temas por lenguaje | 50 | 51 | 52 | 53 |
| Menú, Laboratorio (los dos lenguajes) | 284 | 294 | 304 | 314 |
| Último ID de Esenciales | `rust-142` y `go-142` | `…-147` | `…-152` | `…-157` |
| Filas de `exercises`, `exercise_tests` y `exercise_hints` | 284, 852 y 852 | 294, 882 y 882 | 304, 912 y 912 | 314, 942 y 942 |
| Programas de una corrida de B3 (soluciones, iniciales y los 4 de la muestra) | 572 | 592 | 612 | 632 |

## El recorrido de una etapa

Cada etapa sigue los mismos pasos. Si algo cambia después del paso 4, se vuelve al paso 2.

1. **El borrador (el agente).** La etapa 2 parte de E1 entregado. Con Q4-A, cada etapa siguiente se redacta sobre la rama de la anterior mientras el usuario revisa esa anterior. Antes de su propia revisión, se rebasa sobre la anterior ya integrada y se comprueba contra su texto final: la columna «Supone» se contrasta con lo publicado en ese momento. Antes de escribir, el agente lee:
   - la fila de la etapa en las tablas de arriba;
   - los ejercicios de Esenciales ya publicados y, si la etapa anterior sigue en revisión, su borrador;
   - los ejercicios de Inicial de la columna «Deja para Inicial»;
   - «Contenido del currículo» del README.

   Escribe la etapa al final de la sección `essentials` de cada manifiesto, después de la última publicada, y crea las cinco carpetas de ejercicio por lenguaje, desde fuentes oficiales (FR-044 de E1). Si el host tiene `rustc` y `go`, arma cada programa con la plantilla y comprueba que las soluciones aprueban y los iniciales fallan. Para cada `reparar`, copia en su informe el mensaje del compilador, porque B3 no distingue por qué no compila un inicial.
2. **Las compuertas automáticas (el agente, y el coordinador al integrar).**
   - `npm run curriculum`, que valida `content/` y nombra el archivo y el campo de cada error.
   - `npm test`. Incluye el `content-check` de E1 (etapas de cinco, con IDs y etapas atados a la posición), `curriculum-ids-check`, la parte permanente de la línea base de E1 (FR-039) y el check estático del caché de Go de B3 (FR-027).
   - `npm run lint`, `npm run format:check` y `git diff --check`.
   - `npm run build` y después `npm run test:e2e`, y las pruebas de Pest de la API, porque ahí también viven contratos de conteo.
   - La comparación con la base del PR (FR-010).
   - Los contratos de conteo actualizados (FR-018).
3. **La revisión pedagógica (el usuario).** El usuario lee cada ejercicio con los criterios de abajo, y aprueba o pide cambios, ejercicio por ejercicio. Un pedido de cambio vuelve al paso 1: el agente corrige, vuelve a correr el paso 2 y presenta sólo lo que cambió. La revisión termina cuando el usuario aprobó todos los ejercicios de la etapa (Q3-A).
4. **La auditoría de B3 (el coordinador).** Va después de la revisión, porque cualquier cambio de contenido posterior, aunque sea de texto, cambia la huella del documento e invalida el resumen (FR-038 de B3). La corrida es completa y de registro, con runsc, sobre el último commit y con el árbol limpio, sin hallazgos ni programas sin veredicto. Un hallazgo se corrige en la rama y se vuelve al paso 2. Si el cambio toca algo que el usuario aprobó, vuelve también al paso 3.
5. **El PR (el coordinador).** Uno por etapa (Q2). Título y descripción en inglés, con la notación de Angular (por ejemplo, `feat(content): add the Essentials stage 2 for Rust and Go`). La descripción lleva:
   - el problema completo;
   - el bloque del resumen de B3, pegado entero y con el texto exacto que imprime el comando (formato `taller-audit-summary-1`);
   - la aprobación del usuario, con la fecha y los IDs;
   - los conteos que cambiaron;
   - lo que no se verificó.

   La CI comprueba el bloque: que es de registro y está en verde, y que la huella del documento y la de la plantilla (`harnessHash`) son las de la cabeza del PR. Como E2 no toca `content/harness/`, la huella de la plantilla es la de `master`. El merge lo hace el usuario.

## Qué nunca cambia

- **Los IDs publicados:** los 274 de antes de E1, los diez de la piloto y los de cada etapa ya integrada. No se renumeran, no se reutilizan y no se mueven de etapa. Tampoco cambian las claves de prueba (`t1`, `t2` y `t3`) ni los `topicId` publicados.
- **El progreso:** el formato v1 del navegador, las tablas de progreso del servidor y las tres fixtures congeladas, que siguen arrancando sin escribir, sin respaldar y sin avisar (ADR 0003).
- **La línea base de los 274:** `qa/fixtures/content-baseline-e1.json` no se regenera ni se edita, y su parte permanente sigue en verde en cada PR (FR-039 de E1). En un PR de E2, además, las 17 porciones de antes de E1 y las tres huellas de los 274 no cambian (FR-010).
- **Los ejercicios de Esenciales ya publicados:** en un PR de etapa conservan su etapa, sus tres huellas y su entrada en `curriculum-ids.json`, que sólo crece (Q5).
- **El orden de las etapas:** cada etapa se suma al final de la sección, así que ninguna etapa publicada cambia de número.
- **El código y las redes de pruebas congeladas:** la plantilla del harness, el generador, la red de F1, las 17 E2E de A2 y las specs del Atlas, la campaña (incluida la de coherencia de F6), Sistemas y la Biblioteca.

## Criterios de la revisión pedagógica

**La intención de la revisión.** Que alguien que nunca programó pueda resolver cada ejercicio sólo con lo que leyó en Esenciales hasta ahí, y que al terminar sepa una cosa nueva que pueda nombrar.

**El criterio de éxito.** El usuario aprueba cada ejercicio de la etapa, y cada criterio se cumple o el usuario lo exceptúa de forma explícita en su aprobación. La lista es para que la corrijas: lo que saques o cambies en el clarify es lo que se revisa.

**De la etapa:**

- **R1.** Introduce sólo lo de su fila y supone sólo lo de las etapas anteriores.
- **R2.** Tiene cinco ejercicios por lenguaje, con uno o dos `reparar`. Cada `reparar` enseña un error que ninguna etapa anterior enseñó.
- **R3.** Va de lo más simple a lo más compuesto, y el último ejercicio deja listo el tema de la etapa siguiente (o de Inicial, en la etapa 4).
- **R4.** No repite la situación, el nombre de la función ni las expresiones de prueba de un ejercicio de Inicial ni de otra etapa de Esenciales.
- **R5.** Rust y Go cuentan lo mismo con la forma de cada lenguaje, sin traducir uno al otro línea por línea.

**De cada ejercicio:**

- **R6. Un concepto.** Se puede nombrar en una frase, y es el de su lugar en la tabla.
- **R7. La firma dada.** El inicial trae la firma, y la consigna dice qué recibe la función y qué devuelve.
- **R8. El porqué de cada línea.** La consigna explica cada línea que el alumno escribe o cambia, y no usa un término sin presentarlo.
- **R9. Una situación cercana.** Un problema cotidiano, sin jerga de sistemas: Inicial usa reactores, servidores y bytes, y Esenciales es el escalón de abajo.
- **R10. Las tres pruebas.** Cada una comprueba algo distinto: el caso típico, un borde y un valor que impide devolver una constante. Su `why` dice qué se comprueba, y su `failure`, qué revisar. Con decimales, la prueba compara con una tolerancia o con valores exactos en binario.
- **R11. Las tres pistas.** Van de la idea al paso concreto. La primera no da la solución, y la tercera puede dejarla casi resuelta.
- **R12. La predicción.** Pregunta por el concepto del ejercicio, con una sola opción correcta. La explicación dice por qué las otras no.
- **R13. La revisión y la transferencia.** `success` nombra lo aprendido, y `pitfall`, el error típico. La transferencia propone una variación con lo ya presentado.
- **R14. Un `reparar`.** El inicial no compila por el error que enseña, y sólo por ese. La consigna enseña a leer el mensaje: dónde está, qué esperaba el compilador y qué encontró. No depende del texto literal del mensaje, que puede cambiar con la versión de las imágenes.
- **R15. Un `completar`.** El inicial compila y falla por sus pruebas (B3-Q1). En Rust, con `todo!()`. En Go, sin variables ni imports sin usar.
- **R16. Las fuentes.** Enlazan documentación oficial (The Rust Book, Rust by Example o la referencia de `std`; A Tour of Go, Effective Go, la especificación o la documentación del paquete), válida para la versión del sandbox.
- **R17. El idioma.** Castellano rioplatense con voseo, frases cortas y sin anglicismos innecesarios. Los identificadores siguen la costumbre de cada lenguaje en el taller: en Rust, en castellano y en `snake_case` (`energia`); en Go, exportados y en inglés (`Bytes`, `Clamp`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recorrer Esenciales completo (Priority: P1)

Una alumna que nunca programó abre el Laboratorio en Rust después de la última etapa de E2. Ve «Esenciales» con 20 desafíos y cuatro temas numerados del 01 al 04. Empieza por «Leer un ejercicio» y termina «Repetir». En ningún ejercicio necesita algo que no se haya presentado antes. El botón «siguiente» del último ejercicio de Esenciales la lleva a `rust-01`.

**Why this priority**: es lo que E1 prometió y E2 completa: el escalón entero, no sólo el primero.

**Independent Test**: con el progreso vacío y el compilador simulado de la red de F1, abrir la pestaña Esenciales, contar los temas y los ejercicios, recorrer «siguiente» desde `rust-138` hasta `rust-01`, y comprobar en la revisión de cada etapa que se cumplen R1 y R4.

**Acceptance Scenarios**:

1. **Given** las cuatro etapas integradas, **When** abre la pestaña Esenciales en Rust, **Then** ve 20 desafíos visibles y cuatro temas, numerados 01, 02, 03 y 04 (FR-029 de E1).
2. **Given** el último ejercicio de Esenciales de Rust abierto, **When** pulsa «siguiente», **Then** se abre `rust-01`. Desde `rust-01`, «anterior» lleva al último de Esenciales.
3. **Given** cualquier ejercicio de la etapa 3, **When** el usuario lo revisa con R1 y R8, **Then** sólo usa lo que presentan las etapas 1 y 2 y su propio concepto.
4. **Given** Go en lugar de Rust, **When** repite el recorrido, **Then** pasa lo mismo, y el último de Esenciales de Go lleva a `go-01`.

---

### User Story 2 - Lo publicado no cambia (Priority: P1)

Un alumno resolvió los cinco ejercicios de la piloto y nada fuera de Esenciales. Se integra la etapa 2. Su progreso sigue igual, sus cinco ✓ siguen ahí, y «Un desafío para hoy» le sugiere el primer ejercicio de la etapa 2. Otro alumno, que ya avanzó en Inicial, no nota más que un tema nuevo en el mapa.

**Why this priority**: E2 suma contenido varias veces sobre progreso que ya existe. Mover un ID o una etapa sería peor que no tener la etapa.

**Independent Test**: arrancar con las fixtures de progreso congeladas, comparar el contenido generado contra la base del PR y abrir el laboratorio con progreso sembrado en la piloto.

**Acceptance Scenarios**:

1. **Given** un alumno con `rust-138` a `rust-142` resueltos y nada más, **When** se integra la etapa 2 y pulsa «Un desafío para hoy» con «Todos los niveles», **Then** se abre el primer ejercicio de la etapa 2 (FR-028 de E1).
2. **Given** un alumno con progreso fuera de Esenciales, **When** se integra una etapa, **Then** «Un desafío para hoy» le sugiere lo mismo que antes.
3. **Given** el contenido generado en la base del PR y en su cabeza, **When** se comparan, **Then** sólo cambian las dos porciones de Esenciales, el meta de los ejercicios nuevos, la huella del documento (y con ella `Content-Version`) y el commit de origen.
4. **Given** las tres fixtures de progreso congeladas, **When** arranca el taller con la etapa nueva, **Then** no escribe, no respalda y no avisa.

---

### User Story 3 - Una etapa pasa sus compuertas automáticas (Priority: P1)

El agente escribe la etapa 3. `npm run curriculum` le marca una pista que falta y una clave de prueba repetida. `npm test` le pide los conteos nuevos hasta que los actualiza. La comparación con la base confirma que no tocó nada publicado. Después de la revisión, la corrida de B3 da todas las soluciones aprobadas y todos los iniciales fallando como corresponde, y el PR lleva el bloque, que la CI acepta.

**Why this priority**: es el circuito por el que entra cada etapa. Sin él no hay contenido que revisar ni que integrar.

**Independent Test**: en una copia, sumar una etapa con un error de forma, sin conteos actualizados y con un cambio a un ejercicio publicado, y ver qué compuerta frena cada caso.

**Acceptance Scenarios**:

1. **Given** un `exercise.yaml` con dos pistas, sin clave de prueba o con `level`, **When** corre `npm run curriculum`, **Then** falla nombrando el archivo y el campo.
2. **Given** una etapa válida sin los conteos actualizados, **When** corre `npm test`, **Then** fallan los checks de conteo hasta que el autor los actualiza en el mismo commit.
3. **Given** una etapa insertada antes de una ya publicada, o un ejercicio publicado editado, **When** se compara con la base del PR, **Then** la comparación nombra la etapa o la huella publicada que cambió, y el PR no sigue.
4. **Given** un PR de etapa sin el bloque de B3, con un bloque viejo o con uno en rojo, **When** corre la CI, **Then** el job falla y dice qué falta o qué sello no coincide (FR-038 de B3).

---

### User Story 4 - El usuario revisa una etapa (Priority: P2)

El usuario recibe los diez ejercicios de la etapa 2 con los mensajes del compilador de sus `reparar`. Aprueba ocho y pide cambios en dos: una consigna usa «tipo» sin explicarlo, y una prueba deja pasar una constante. El agente corrige, vuelve a correr las compuertas y le presenta sólo los dos cambios. El usuario los aprueba, y recién entonces corre B3.

**Why this priority**: es la compuerta que E1 puso en manos del usuario (FR-044). No es lo que ve el alumno, pero decide lo que verá.

**Independent Test**: seguir una revisión con un pedido de cambio y comprobar el orden: compuertas, revisión, corrección, compuertas, aprobación, B3 y PR.

**Acceptance Scenarios**:

1. **Given** una etapa con las compuertas automáticas en verde, **When** el usuario la revisa, **Then** tiene, por ejercicio, el texto, las pruebas, las pistas, el inicial, la solución y, si es `reparar`, el mensaje del compilador.
2. **Given** un pedido de cambio, **When** el agente corrige, **Then** vuelve a correr las compuertas y presenta sólo lo que cambió.
3. **Given** un ejercicio sin aprobar después de dos rondas, **When** el agente propone reemplazarlo, **Then** el nuevo conserva el ID y la posición (Q3-A).
4. **Given** la etapa aprobada y la corrida de B3 hecha, **When** el usuario pide otro cambio de texto, **Then** hace falta otra corrida antes del PR.

---

### Edge Cases

- **Una etapa trabada en la revisión.** Frena el merge de las siguientes, que se pueden seguir redactando (Q4-A) pero no integrar (FR-006).
- **`master` cambia entre el borrador y el merge,** por ejemplo con el arreglo de `rust-63`. El PR se rebasa, la comparación se hace contra su nueva base y B3 vuelve a correr sobre el último commit.
- **Una etapa nueva en `lab`, `quests` o `systems`,** hecha por otro ítem. Correría el número de todas las etapas de Esenciales, porque se numeran después de la última de `systems`: cambiarían la `stage` y la huella de ejercicios publicados. E2 no lo hace. Lo detecta el `content-check` de E1, que espera la etapa 50 + *k* (hallazgo para el ADR de E1).
- **Un ejercicio rechazado entero antes del merge.** Se reemplaza conservando su ID y su posición, porque nunca se publicó.
- **Un `reparar` que no compila por otro motivo.** B3 lo da como «falla como corresponde», porque acepta cualquier error de compilación en un inicial `reparar`. Lo atajan el mensaje del compilador del informe del agente y la revisión del usuario (R14).
- **Una prueba con decimales que compara con `==`.** Puede fallar por redondeo según el valor. R10 pide una tolerancia o valores exactos.
- **Un ejercicio de Go que necesita un paquete.** Si el paquete no está en el caché del sandbox, falla el check estático de B3, y la etapa lo evita o el cambio va como bug del ejecutor, fuera de E2.
- **La copia del contenido de A3.** Cada etapa cambia `Content-Version`, y la copia se renueva como con cualquier cambio de contenido. La lista de porciones no cambia, así que `COPY_FORMAT` tampoco.
- **Una pestaña abierta con el front de antes de la etapa.** Si otra pestaña guarda progreso de un ejercicio nuevo, la vieja respalda y avisa por el ID desconocido (ADR 0003), como describe E1.

## Requirements *(mandatory)*

### Functional Requirements

**El contenido**

- **FR-001**: E2 DEBE entregar las etapas 2, 3 y 4 de Esenciales en Rust y en Go, con cinco ejercicios cada una, en el orden de la tabla. Al cerrar, Esenciales tiene cuatro etapas y 20 ejercicios por lenguaje. *(Q1 y Q5 de E1; Q1)*
- **FR-002**: Cada etapa DEBE introducir sólo lo de su fila de «El contenido de cada etapa», suponer sólo lo que presentaron las anteriores (la piloto incluida, tal como se publicó) y dejar para Inicial lo de su columna «Deja para Inicial». *(Q1)*
- **FR-003**: Ningún ejercicio de Esenciales DEBE repetir la situación, el nombre de la función ni las expresiones de prueba de un ejercicio de Inicial o de otro de Esenciales. Cada error del compilador que enseña un `reparar` DEBE aparecer en una sola etapa de Esenciales. Un concepto que Esenciales presenta y Inicial aplica no cuenta como superposición. *(«La superposición con Inicial» de E1)*
- **FR-004**: Cada etapa DEBE traer, por lenguaje, uno o dos ejercicios `reparar` con un error de su fila, y el resto de `completar`. El inicial de un `reparar` no compila por ese error; el de un `completar` compila y falla por sus pruebas. *(E1; B3-Q1)*
- **FR-005**: Cada ejercicio DEBE tener la forma de los de la piloto:
  - la firma dada;
  - pruebas que son expresiones booleanas sobre funciones, nunca sobre lo que se imprime;
  - las claves `t1`, `t2` y `t3`;
  - tres pistas, revisión, transferencia, predicción y fuentes oficiales;
  - ni `level` ni `challengeType`, que fija la sección;
  - los `.go` empiezan con `package main` y una línea en blanco, con finales de línea LF.

  *(FR-044 de E1; plan de E1, T004)*

**Las etapas y los IDs**

- **FR-006**: Cada etapa DEBE sumarse al final de la sección `essentials` de su lenguaje, después de la última publicada, nunca entre dos publicadas. Las etapas DEBEN integrarse en orden: la 3 después de la 2, y la 4 después de la 3. El generador numera la etapa por su posición, así que con el contenido de hoy son la 51, la 52 y la 53. *(FR-003 de E1; ADR 0006 D13)*
- **FR-007**: Los IDs de cada etapa DEBEN seguir sin huecos al último publicado del lenguaje: con el plan de hoy, 143 a 147, 148 a 152 y 153 a 157. Antes del merge, un ejercicio se puede reescribir o reemplazar con el mismo ID. Después del merge, el ID, las claves de prueba y el `topicId` quedan fijos para siempre. *(Q4 de E1; constitución, principio IV)*

**El recorrido y las compuertas**

- **FR-008**: El borrador DEBE escribirlo un agente desde fuentes oficiales, después de leer la fila de su etapa, los ejercicios de Esenciales publicados (y el borrador de la etapa anterior, si sigue en revisión: Q4), los de Inicial que nombra su fila y «Contenido del currículo» del README. Antes de su revisión, la etapa DEBE estar rebasada sobre la anterior ya integrada y comprobada contra el texto final de esa anterior. Su informe DEBE traer el mensaje del compilador de cada `reparar` y el resultado de la prueba previa en el host, o decir que no se pudo correr. *(FR-044 de E1; plan de E1, T004)*
- **FR-009**: Antes de la revisión, cada etapa DEBE pasar en verde `npm run curriculum`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run build` seguido de `npm run test:e2e`, y las pruebas de Pest de la API. *(FR-044 de E1; `qa/AGENTS.md`)*
- **FR-010**: Cada PR DEBE mostrar que, entre el contenido generado en su base y en su cabeza, sólo cambian las dos porciones de Esenciales, el meta de los ejercicios nuevos, la huella del documento (y con ella `Content-Version`) y el commit de origen del meta. Las 17 porciones de antes de E1, la plantilla, y la etapa y las tres huellas de cada ejercicio ya publicado (los 274 y los de Esenciales) DEBEN ser idénticas. La comparación usa el meta que ya escribe `tools/content`, sin herramienta nueva, y el plan fija el procedimiento. *(FR-009 y FR-039 de E1; Q5)*
- **FR-011**: La revisión pedagógica del usuario DEBE ser una compuerta. El usuario aprueba de forma explícita cada ejercicio con los criterios de «Criterios de la revisión pedagógica», antes de la corrida de B3 y antes del PR. Un pedido de cambio vuelve al borrador, y el agente corrige, vuelve a correr FR-009 y FR-010 y presenta sólo lo que cambió. Sin la aprobación de todos los ejercicios de la etapa no hay merge, ni parcial. *(FR-044 de E1; Q3)*
- **FR-012**: La auditoría de B3 DEBE correr después de la aprobación, sobre el último commit y con el árbol limpio, en una corrida de registro: completa, con runsc, sin hallazgos ni programas sin veredicto. Cualquier cambio posterior, aunque sea de texto, invalida el resumen y pide otra corrida. *(Spec 020, FR-032 y FR-038)*
- **FR-013**: Cada etapa DEBE entrar en un PR propio, con los dos lenguajes (Q2). El título y la descripción van en inglés, con la notación de Angular. La descripción lleva el problema completo, el bloque del resumen de B3 pegado entero con el texto exacto que imprime el comando (formato `taller-audit-summary-1`), la aprobación del usuario con la fecha y los IDs, los conteos que cambiaron y lo que no se verificó. La CI comprueba el bloque, y el merge lo hace el usuario. *(`AGENTS.md`; spec 020, FR-038; Q2)*
- **FR-014**: Un hallazgo de B3 en una etapa sin integrar DEBE corregirse en `content/`, en la misma rama, sin cambiar IDs ni claves, y repetir las compuertas desde FR-009. Si el arreglo toca algo que el usuario aprobó, también se repite la revisión. Un hallazgo de un ejercicio ya publicado, o de la plantilla o el sandbox, es un bug con la extensión `bug`, fuera del PR de etapa. *(Spec 020, FR-029; Q3 y Q5)*

**Lo que no cambia**

- **FR-015**: Ningún PR de E2 DEBE cambiar IDs, claves de prueba ni `topicId` publicados. Tampoco el formato del progreso, sus tablas ni las fixtures congeladas, que siguen arrancando sin escribir, sin respaldar y sin avisar. `qa/fixtures/content-baseline-e1.json` no se regenera ni se edita. `qa/fixtures/curriculum-ids.json` sólo crece, al final, y ninguna entrada existente cambia en un PR de etapa (Q5). *(Constitución, principio IV; ADR 0003; FR-009, FR-020 y FR-039 de E1)*
- **FR-016**: Las E2E de la red de F1, las 17 de A2 y las specs y E2E del Atlas, la campaña (incluida la de coherencia de F6), Sistemas y la Biblioteca DEBEN pasar sin editarse en cada PR de E2. *(FR-033, FR-037 y SC-006 de E1)*
- **FR-017**: Un PR de E2 DEBE tocar sólo la sección `essentials` de los dos manifiestos, las carpetas de sus ejercicios nuevos y los contratos de conteo de FR-018. No toca código (`tools/content`, `content/harness/`, la API, el front, el ejecutor ni la auditoría), otras secciones del manifiesto ni ejercicios ya publicados (Q5). Si una etapa necesita algo de eso, se para y se abre un bug o un ítem nuevo.

**Los conteos**

- **FR-018**: Cada PR DEBE actualizar, en el mismo commit que suma los ejercicios, los conteos que E1 dejó a mano:
  - el README (el encabezado, la fila de Esenciales de «Cobertura» y «Desarrollo»);
  - los totales que fijan cantidades en `qa/`;
  - `curriculum-ids.json`;
  - los conteos de Pest;
  - las E2E del laboratorio que fijan conteos o el último ID de Esenciales;
  - el conteo del menú en `frontend/src/index.html`, si F10 todavía no entró.

  Cada uno cambia por su delta, nunca por un número copiado. Si E1, F7b o F10 derivan un conteo del catálogo, ese no se edita. *(FR-036 de E1; `README.md`, «Contenido del currículo»)*

### Key Entities *(include if feature involves data)*

| Entidad | Qué representa | Cantidad |
| --- | --- | --- |
| Etapa de Esenciales | Un tema de la sección `essentials`, con cinco ejercicios por lenguaje, numerado por su posición | 3 nuevas por lenguaje (la 51, la 52 y la 53) |
| Ejercicio de Esenciales | Como uno de la piloto, con su ID correlativo, `level: essentials` fijado por la sección y sus tres huellas | 15 nuevos por lenguaje, 30 en total |
| Borrador de etapa | La rama con la etapa escrita, sus checks y el informe del agente (mensajes del compilador y prueba previa) | Uno por PR |
| Aprobación del usuario | El registro, en la descripción del PR, de qué ejercicios aprobó, cuándo y con qué excepciones a los criterios | Una por PR |
| Resumen de B3 | El bloque `taller-audit-summary-1` de una corrida de registro sobre el último commit | Uno por PR |
| Contratos de conteo | Las cantidades que E1 dejó a mano (FR-018) | Se actualizan en cada PR |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al cerrar E2, cada lenguaje tiene 20 ejercicios de Esenciales en cuatro etapas consecutivas (50 a 53), con IDs sin huecos (`rust-138` a `rust-157` y `go-138` a `go-157`). Cada etapa nueva entró en su propio PR: 3 PRs con Q2-A.
- **SC-002**: En cada PR de E2, la comparación de FR-010 da 0 diferencias en las 17 porciones de antes de E1, en la plantilla, y en la etapa y las tres huellas de cada ejercicio publicado antes del PR. `git diff` sobre `qa/fixtures/content-baseline-e1.json` está vacío, y las entradas existentes de `curriculum-ids.json` no cambian.
- **SC-003**: El resumen de B3 de cada PR es de registro y está en verde. Las soluciones que aprueban y los iniciales que fallan como corresponde son tantos como los ejercicios del currículo (294, 304 y 314 con el plan de hoy), con 0 hallazgos y 0 programas sin veredicto, y su `harnessHash` es el de `master`.
- **SC-004**: Cada PR tiene la aprobación explícita del usuario para el 100 % de sus ejercicios, fechada antes de la corrida de B3 del resumen.
- **SC-005**: 0 archivos cambiados fuera de los que permite FR-017, en cada PR.
- **SC-006**: 0 ejercicios de Esenciales comparten la situación, el nombre de la función o las expresiones de prueba con uno de Inicial o con otro de Esenciales. 0 errores del compilador se enseñan en más de una etapa.
- **SC-007**: La red de F1, las 17 E2E de A2 y las specs del Atlas, la campaña, Sistemas y la Biblioteca pasan sin editarse en cada PR. Las E2E del laboratorio sólo cambian en los conteos de FR-018.
- **SC-008**: Las tres fixtures de progreso congeladas arrancan sin escribir, sin respaldar y sin avisar después de cada PR. Una copia exportada con progreso de Esenciales antes de una etapa se importa igual después.

## Riesgos

1. **La revisión del usuario es el cuello de botella** (riesgo 6 de E1). *Mitigación:* diez ejercicios por PR (Q2-A) y redacción en cadena (Q4-A), para que el usuario siempre tenga una etapa lista.
2. **Una etapa trabada frena las siguientes,** porque el merge va en orden. *Mitigación:* Q3-A acota las rondas, y Q4-A deja avanzar el borrador siguiente.
3. **La superposición con Inicial.** *Mitigación:* la columna «Deja para Inicial», FR-003 y R4. La tabla de E1 decía que la etapa 4 no se superponía, y sí se superpone (`rust-08`, `rust-09` y `go-07`): esta spec lo corrige.
4. **B3 por PR, y otra vez después de cada cambio.** Cada corrida tarda unos minutos. *Mitigación:* B3 va al final, después de la revisión (FR-012), así que normalmente corre una vez.
5. **Las etapas de Esenciales se numeran después de la última de `systems`.** Una etapa nueva en otra sección correría todas las de Esenciales y cambiaría sus huellas. *Mitigación:* lo detecta el `content-check` de E1. Es un hallazgo para el ADR de E1, fuera de E2.
6. **Los conteos repetidos en muchos lugares.** Cada PR edita unos diez archivos. *Mitigación:* FR-018. Además se propone a E1 que sus E2E nuevas lean el catálogo (hallazgo).
7. **El resumen de B3 lo pega una persona** (riesgo 4 de B3). *Mitigación:* la CI comprueba sus sellos de contenido y de plantilla, y una persona, el commit, el árbol limpio y las imágenes.
8. **Los mensajes del compilador cambian con las imágenes del sandbox.** Un `reparar` que cita el texto literal puede quedar viejo. *Mitigación:* R14 pide enseñar a leer el mensaje sin depender de su texto exacto.
9. **La piloto todavía no existe.** La tabla supone que la etapa 1 cubre lo de la fila de E1. *Mitigación:* el borrador de la etapa 2 lee la piloto publicada y ajusta los candidatos (FR-002 y FR-008).
10. **Nada de esto se ejecutó.** La spec sale de leer `master` (bb480677), la spec y el plan de E1 (`spec-e1`, cabfdb67) y la spec de B3. Los números finales los fija el contenido publicado.

## Relación con otras specs

- **E1 (026):** E2 la extiende. Usa su tabla de etapas, su sección `essentials`, sus IDs, su `content-check` y sus E2E, y las reglas y compuertas de la piloto. E2 no edita la spec ni el plan de E1: corrige en esta spec la superposición de la etapa 4 y deja dos hallazgos para su plan.
- **B3 (020):** es la compuerta de cada PR (FR-032 y FR-038). Cubre los ejercicios nuevos sin cambiarse (FR-001), y su check estático del caché de Go cubre sus `imports` (FR-027).
- **F7 (021):** la página del laboratorio muestra las etapas nuevas sin cambios: los conteos se derivan (FR-022 de F7b), y el número de las tarjetas sale de la posición (FR-029 de E1).
- **F10 (024):** si entró, el conteo del menú se deriva; si no, cada PR lo edita (FR-018).
- **A3 (016):** la lista de porciones no cambia, así que `COPY_FORMAT` tampoco. La copia se renueva con `Content-Version`.
- **D1 (007):** el progreso es por ID, así que los ejercicios nuevos no piden nada.
- **C2 (001):** el import suma las filas nuevas en su transacción, de forma idempotente, y la API no cambia.
- **F6 (019):** la campaña no cambia, y su spec de coherencia sigue en verde sin editarse.

## Acciones del usuario

| Cuándo | Acción |
| --- | --- |
| Ahora | Responder Q1 a Q5 y corregir los criterios de la revisión (R1 a R17) y las tablas de etapas, si hace falta. |
| En cada etapa | Revisar los ejercicios con los criterios, aprobar o pedir cambios por ejercicio, y mergear el PR. |
| Siempre | Ninguna descarga ni dependencia nueva: la auditoría usa las imágenes del sandbox que ya construyó B2. |

## Assumptions

- E1 está entregado en `master` antes del primer PR de E2, con la piloto aprobada por el usuario, y B3 también, con su check del resumen en la CI. E1 lo exige (sus Assumptions).
- El plan de E1 es el del worktree `spec-e1` (cabfdb67): su `content-check` exige etapas de cinco con IDs desde el 138 y etapas desde la 50, y sus E2E nuevas fijan «5 desafíos visibles.» y `rust-142` como el último de Esenciales (T009 y T015). Si E1 cambia eso, cambian los contratos de FR-018, no las reglas.
- Los IDs (143 a 157) y las etapas (51 a 53) son los que salen hoy de la posición. Si otra cosa los corriera, mandan FR-006 y FR-007.
- Las tablas de etapas son la guía de quien redacta, como la de E1. El texto final lo aprueba el usuario.
- Las imágenes del sandbox en `master` (bb480677) son Rust 1.99 y Go 1.27. `for i := range n` existe desde Go 1.22.
- El laboratorio sigue sin bloqueos: Esenciales se recomienda, no se exige.

## Alternativas consideradas

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| El orden de B3 y la revisión | B3 antes de la revisión, como la lista de FR-044 de E1; B3 después | Después. Un cambio de texto pedido en la revisión cambia la huella del documento e invalida el resumen (FR-038 de B3) |
| Integrar etapas en paralelo | Cada etapa cuando esté lista; en orden | En orden. La etapa se numera por su posición, y una etapa metida antes de otra publicada le cambia la etapa y la huella |
| Merges parciales de una etapa | Integrar los ejercicios aprobados; la etapa entera | La etapa entera. El `content-check` de E1 exige etapas de cinco con IDs atados a la posición |
| Cómo se comprueba que nada publicado cambió | Una herramienta nueva; la línea base de E1; el meta de la base contra el de la cabeza | El meta. La línea base de E1 sólo cubre los 274, y una herramienta nueva es código, fuera de E2 |
| Encadenar con Inicial | Editar los primeros ejercicios de Inicial; dejarlos como están | Dejarlos. Inicial no cambia (E1), y la columna «Deja para Inicial» marca el límite |
| El tamaño del ítem | Todo en un PR; una etapa por PR | Una etapa por PR (Q5-A de E1) |
