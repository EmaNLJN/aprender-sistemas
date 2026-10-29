# Feature Specification: E1 · La sesión Esenciales

**Feature Branch**: `026-e1-esenciales` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Clarificada (sesión del 2026-10-28); con plan

**Input**: Ítem **E1** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Sesión Esenciales»: sumar Esenciales como catálogo nuevo, primero de la cadena. Depende de A1 y D1; A1, D1a y D1b están entregados, y según la [spec 007](../007-d1-progreso-sincronizacion/spec.md) E1 sólo necesita D1a. Tiene abierta la decisión 1 del ADR 0006 §13: el resto de la cadena de Esenciales, si va antes de Inicial o en su lugar, y su código. La [hoja de ruta del front](../front-react/roadmap.md), en «Ítems del backend que tocan el front», agrega que los conteos del menú (4, 25 y 274), «24 misiones» y «/180» salen del catálogo (F6 y F10) o se actualizan a mano con E1. Fuente técnica: el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (**propuesta**: esta spec lo usa como base y lo dice), en R10, S1, D13, D15, §5.1 (`catalogs` y `exercises`), §10 y §13.1; el [ADR 0004](../../docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md), en «Consecuencias» y su fase 9; y el objetivo 4 de [`docs/refactor-roadmap.md`](../../docs/refactor-roadmap.md). Encargo del coordinador del 2026-10-28.

## Intención y alcance

**Lo que entendemos.** Esenciales es una sesión nueva del Laboratorio, de Rust y de Go, que va antes de Inicial: los primeros pasos para quien todavía no lee la firma de una función ni un error del compilador. Hoy el primer ejercicio de Inicial ya los da por sabidos. `rust-01` («La energía del reactor») pide completar `fn energia(celdas: i32) -> i32` sabiendo qué es un `i32` y qué devuelve la última expresión, y `go-01` («La mochila de bytes») pide conservar la firma `Bytes(kib int) int`. Esenciales cubre ese escalón con ejercicios del mismo formato que los demás: consigna, código inicial, tres pruebas con clave estable, tres pistas, predicción, revisión y transferencia. Se resuelven con el mismo editor y el mismo revisor y se guardan por su ID como cualquier otro, sin tocar el progreso ni los IDs que ya existen. Para el sistema, es un catálogo más: una fila de `catalogs` con la posición 1, la única de la cadena; sus ejercicios en las tablas de hoy; dos porciones nuevas en la API; sus temas en el laboratorio; y la auditoría y el progreso como los del resto. Las decisiones de IDs y de numeración de etapas quedan en un ADR. Si esto no coincide con lo que buscás, es lo primero que hay que corregir (Q1): el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Un alumno que no resolvió nada abre el Laboratorio en Rust o en Go, ve «Esenciales» como el primer nivel y empieza por su primer ejercicio (Q3).
2. Un ejercicio de Esenciales se resuelve, se revisa, se guarda, se exporta y se importa como cualquier otro, y su progreso viaja por su ID.
3. Nada de lo que existe cambia un byte: las 17 porciones de hoy, los 274 ejercicios (ID, etapa y huellas), las fixtures de progreso congeladas y el contrato de IDs, que sólo crece.
4. La API sirve Esenciales con los mismos recursos, validadores y reglas que el resto, y la sesión lo publica primero en la cadena.
5. La auditoría de B3 lo cubre sin que nadie la toque: sus soluciones aprueban y sus iniciales fallan como corresponde.
6. Cada conteo visible que cambia sale del catálogo, o tiene dueño y momento para editarlo a mano.
7. Un ADR registra los IDs y la numeración de etapas.

**Entra:**

- El catálogo, su código y su posición en la cadena (Q2), y su lugar en `content/` y en el generador.
- Las porciones nuevas en la API, el import y la sesión, sin tablas nuevas.
- Un valor de nivel más para los ejercicios (Q2).
- El laboratorio con Esenciales: el nivel, el mapa, la sugerencia del día y los conteos (Q3).
- La fuente del contenido del front con las porciones nuevas, y el catálogo de ejercicios que las incluye.
- La auditoría de B3 sobre los ejercicios nuevos.
- Los conteos y los contratos que se editan a mano.
- El ADR de IDs y numeración de etapas.
- La primera etapa de contenido real por lenguaje, de cinco ejercicios, con su circuito de autoría y revisión (Q5).

**Queda fuera:**

- El resto del contenido de Esenciales, que va en E2, «Contenido de Esenciales» (Q5).
- Esenciales en la campaña, el Atlas, Sistemas, la Biblioteca o el Recorrido (Q3).
- Las estadísticas por catálogo (C5).
- El cliente v2 del progreso (D1c): Esenciales no le pide nada.
- Desbloqueos o prerrequisitos entre catálogos: el ADR 0006 D13 los deja para una derivación futura de la posición y del progreso.
- Los catálogos futuros de la «tercera lectura» del ADR 0006 S1, como intermedios o avanzados.
- Los candidatos que dejaron los ports (hallazgo E1-6): las pistas de los hitos siguen en la configuración de `entities/guide` (F4), y el contador de Sistemas sigue sin plural. Ninguno cuenta ejercicios de Esenciales.

**Sin hacer a propósito (YAGNI):**

- un explorador visual propio para Esenciales: usa los modelos de `visual` de hoy;
- una bandera para ocultar el catálogo mientras se escribe;
- tomar la lista de porciones de los catálogos de la sesión, que A3 ya descartó;
- una tabla de cadena o de prerrequisitos;
- un formato de ejercicio nuevo, como pruebas sobre lo que imprime un programa.

**Actores:**

- el alumno que empieza;
- el alumno que ya avanzó y no tiene que perder nada;
- quien escribe y revisa el contenido;
- quien opera el taller, que importa y despliega;
- el coordinador;
- los ítems que E1 toca: C2, C6, C3a, B2, D1, B3, A2, A3, F2, F6, F7, F10 y el Atlas.

## Qué es Esenciales para el alumno (Q1-A)

**A quién sirve.** A quien llega al taller sin haber programado, o sin haber leído nunca un programa de Rust o de Go. No sabe todavía qué es un tipo, qué devuelve una función, cómo se lee una prueba ni qué quiere decir el compilador cuando rechaza el código. Inicial empieza un paso más arriba, y Esenciales es ese paso (Q1).

**Qué temas trae.** Cuatro etapas por lenguaje, con cinco ejercicios cada una (20 por lenguaje y 40 en total): el mismo tamaño que las cuatro primeras etapas de Inicial. E1 trae la primera etapa de cada lenguaje (5 ejercicios), y E2 las otras tres (Q5). Los requisitos dicen *N* por lenguaje: con E1, *N* = 5; con E2 completo, 20. Los temas de cada etapa son la guía de quien redacta; el texto final lo aprueba el usuario (FR-044).

| Etapa | Rust | Go | Se superpone con |
| --- | --- | --- | --- |
| 1. Leer un ejercicio | La consigna, la firma y una prueba; devolver un valor con la última expresión | La consigna, la firma y una prueba; devolver un valor con `return` | La primera etapa de Inicial: `rust-basics` («Expresiones y mutabilidad») y `go-basics` («Tipos y primeros pasos») |
| 2. Valores y tipos | Enteros, decimales, booleanos y texto; `let` y `let mut`; conversiones explícitas | Enteros, decimales, booleanos y `string`; `var` y `:=`; conversiones explícitas | `rust-basics` y `go-basics` |
| 3. Decidir | Comparaciones, `if` y `else` como expresión, un `match` simple | Comparaciones, `if` y `else`, un `switch` simple | La segunda: `rust-control` y `go-flow` («Funciones y decisiones») |
| 4. Repetir | `for` sobre un rango, `while`, contar y acumular | `for` con rango, con condición y contador | Ninguna directa |

En cada etapa, uno o dos ejercicios `reparar` enseñan a leer un error del compilador. En Rust: tipos que no coinciden y una variable inmutable. En Go: una variable sin usar y tipos mezclados. Así se usa lo que B3-Q1 ya admite: un inicial `reparar` puede fallar al compilar.

**La superposición con Inicial** es real en las etapas 1 a 3. Esenciales se queda un escalón abajo con tres reglas: un concepto por ejercicio, la firma siempre dada y el porqué de cada línea en la consigna. Inicial no cambia.

**Lo que el formato no permite.** El revisor corrige con expresiones booleanas sobre funciones, porque la plantilla del harness agrega la función de entrada. Un ejercicio de Esenciales no puede corregir lo que un programa imprime: «imprimir» se enseña en la consigna o en la revisión, no en las pruebas.

**Cómo encaja en la cadena.** Con Q2-A, la cadena de niveles de los ejercicios pasa a ser Esenciales, Inicial, Intermedio, Avanzado y Experto, la lectura principal del ADR 0006 S1. Esenciales es además el único catálogo con posición en la cadena (`chain_position` 1). `lab`, `quests` y `cores` siguen sin posición, porque abarcan varios niveles (spec 001, Q8).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta del clarify (Q1 a Q5).

| Pedido | Fuente |
| --- | --- |
| Esenciales como catálogo nuevo, primero de una cadena | ADR 0006 R10; hoja de ruta, fila E1 |
| «Tenemos intermedios, avanzados y otro más; esenciales sería el primero de toda esa cadena» | Frase del usuario citada en el ADR 0006 S1 |
| `lab`, `quests` y `cores` quedan sin posición en la cadena, y E1 suma `essentials` con posición 1 | Spec 001, Clarifications, Q8 (FR-032) |
| Sumar al Laboratorio una sesión «Esenciales» de Rust y Go | `docs/refactor-roadmap.md`, objetivo 4 |
| La sesión Esenciales lleva su propia decisión de IDs, porque `content-check` y el fixture de IDs asumen numeración correlativa | ADR 0004, «Fases», 9 |
| Entra una fila en `catalogs`, el contenido nuevo y un ADR de IDs y numeración de etapas, al final de la cadena para no cambiar los 274 `stage` actuales. Quedan fuera las tablas nuevas | Hoja de ruta, «Alcance por ítem», E1; ADR 0006 §10 y D13 («Trampa de E1») |
| Sin tablas nuevas; si hacen falta, una columna nula o valores de ENUM al final. Se vuelve atrás hacia adelante: el catálogo se retira con `deprecated` | ADR 0006 §10 |
| Los conteos del menú (4, 25 y 274), «24 misiones» y «/180» salen del catálogo (F6 y F10) o se actualizan a mano con E1 | Hoja de ruta del front, «Ítems del backend que tocan el front» |
| Las palabras que repiten un conteo de la campaña quedan como texto editorial, con una spec de coherencia que le avisa a E1 qué frases editar | Usuario, clarify de F6 (F6-Q1) |
| Los conteos del menú salen del catálogo y aparecen con el contenido, sin copias fijas | Usuario, clarify de F10 (F10-Q5; FR-032 de la spec 024) |
| La lista de porciones del front es fija: E1 suma su porción junto con el código del front que la usa | Spec 016 (A3), «Alternativas consideradas» y «Relación con otros ítems» |
| Un catálogo nuevo entra en la auditoría sin cambiarla, y la auditoría es obligatoria en los PR que tocan lo auditado | Spec 020 (B3), FR-001; usuario, clarify de B3 (B3-Q3) |
| Los IDs son inmutables y nunca se reutilizan; el contenido se edita en `content/`, nunca en `build/`; lo que se retira no se borra | Constitución, principio IV; `README.md`, «Contenido del currículo» |
| Un ejercicio nuevo actualiza en el mismo commit `curriculum-ids.json`, los asserts de `content-check` y de `systems-check` y las cantidades del README | `README.md`, «Contenido del currículo» |
| La spec deja claro qué es Esenciales para el alumno, dónde vive, qué cambia en cada capa, el código y la posición, la autoría del contenido, y trae como mucho 5 preguntas | Pedido de esta tarea |
| Q1 a Q5 con la opción recomendada; las dos E2E de F1 que esperan `rust-01` se editan; el resto del contenido va en E2 | Usuario, clarify del 2026-10-28 |

## Clarifications

### Session 2026-10-28

- Q: **Q1**, ¿a quién sirve Esenciales y qué trae? → A: A quien no programó o nunca leyó un programa de Rust o de Go: leer un ejercicio, valores y tipos, decidir y repetir, con ejercicios `reparar` que enseñan a leer el compilador. Opción A. Decidió el usuario. («Qué es Esenciales para el alumno»; FR-043 y FR-044)
- Q: **Q2**, ¿cómo entra Esenciales en la cadena, y con qué código? → A: Un quinto nivel antes de Inicial, con el código `essentials` para el catálogo y para el nivel. Opción A. Decidió el usuario. Al registrarla, FR-012 se acota a la columna `level` de los ejercicios: es la única con contenido de Esenciales, y el Atlas, la campaña y Sistemas no lo muestran (FR-033). El costo de Q2-A baja de cuatro columnas a una. (FR-001, FR-004, FR-012, FR-026 y FR-033)
- Q: **Q3**, ¿dónde ve el alumno a Esenciales, y por dónde empieza? → A: Sólo en el laboratorio, primero en el mapa y en el recorrido libre; «Un desafío para hoy» lo sugiere a quien no resolvió nada de ese lenguaje fuera de Esenciales; las tarjetas de sus temas se numeran 01, 02… Opción A. Decidió el usuario, y aprobó editar las dos E2E de F1 que esperan `rust-01` (`views.spec.ts` y `reload.spec.ts`), en un commit propio y con TDD. (FR-026 a FR-033, FR-037 y FR-040)
- Q: **Q4**, ¿qué forma tienen los IDs? → A: Correlativos por lenguaje: `rust-138`… y `go-138`… Opción A. Decidió el usuario. (FR-005, FR-021 y FR-029)
- Q: **Q5**, ¿quién escribe el contenido, y en qué ítem se entrega? → A: E1 trae la plataforma y una primera etapa real por lenguaje (5 ejercicios cada una), que redacta un agente y revisa el usuario. El resto va en un ítem nuevo, **E2, «Contenido de Esenciales»**, una etapa por PR. Opción A. Decidió el usuario. (FR-043 y FR-044)
- **Hallazgos del coordinador aplicados al registrar el clarify** (`.coordinador/hallazgos-para-planes.md`, sección E1):
  - E1-1: la auditoría de B3 ordena un catálogo que no nombra antes de `lab`. Esenciales va primero también en el informe, como en la cadena (FR-022).
  - E1-6: E1 no toma los dos candidatos que dejaron los ports, las pistas de los hitos y el plural del contador de Sistemas («Queda fuera»).
  - E1-7: E1 no suma globales de catálogo. El catálogo del front lee Esenciales del contenido publicado (FR-025).

## Preguntas del clarify

Quedan como registro de las alternativas. El usuario eligió la opción recomendada en las cinco el 2026-10-28 (ver «Clarifications»).

**Q1. ¿A quién sirve Esenciales y qué trae?** *(«Qué es Esenciales para el alumno»; FR-043 y FR-044)* De esto depende cuánto contenido hay que escribir y cuánto se superpone con Inicial.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Para quien no programó o nunca leyó un programa en ese lenguaje: leer un ejercicio, valores y tipos, decidir y repetir, con ejercicios `reparar` que enseñan a leer el compilador. Cuatro etapas de cinco por lenguaje | El contenido más largo de escribir: unos 40 ejercicios. Se superpone con las etapas 1 y 2 de Inicial, y la superposición se maneja con las reglas de arriba |
| B | Para quien ya programa en otro lenguaje y empieza con Rust o con Go: lo que cambia respecto de otros lenguajes (las herramientas, la sintaxis, los tipos, los errores como valores, la forma de cada lenguaje) | Menos ejercicios, pero se superpone más con Inicial, que ya apunta a ese público. No deja claro qué escalón agrega |
| C | Un repaso exprés de Inicial: lo esencial de cada tema de Inicial, en menos ejercicios | No suma un escalón: duplica Inicial por diseño, y la cadena queda con dos niveles de la misma altura |

**Recomendada: A.** Es la lectura literal de «el primero de toda esa cadena», y el primer ejercicio de Inicial ya pide leer una firma. **Costo:** el contenido es el trabajo mayor de E1, y la superposición con Inicial pide una revisión pedagógica de cada ejercicio (Q5).

**Q2. ¿Cómo entra Esenciales en la cadena, y con qué código?** *(Decisión 1 del ADR 0006 §13, en lo que C2 no cerró; FR-001, FR-004, FR-012, FR-026 y FR-033)* C2 ya decidió que Esenciales es un catálogo con posición 1. Falta decidir si además es un nivel, si va antes de Inicial o en su lugar, y su código.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Un quinto nivel antes de Inicial: Esenciales, Inicial, Intermedio, Avanzado y Experto. El código `essentials` vale para el catálogo y para el nivel. Inicial no cambia | La lista de niveles del front pasa de cuatro a cinco, y la comparten el laboratorio, el Atlas, la campaña, Sistemas y el generador. Las cuatro columnas `level` de la base (ejercicios, talleres, mundos y conceptos del Atlas) suman el valor al final: un COPY de milisegundos con la espera acotada (D35). El Atlas no tiene que ofrecer un nivel sin conceptos (FR-033) |
| B | Una sección dentro de Inicial, con su filtro propio, como «Clásicos y sistemas». Sus ejercicios llevan el nivel `beginner`, y el código del catálogo es `essentials` | Sin nivel nuevo, sin migración y sin tocar el Atlas. Pero las tarjetas de Esenciales dicen «Inicial», el conteo de la pestaña Inicial cambia y la cadena sólo existe en la API: el alumno no ve nada «antes» de Inicial |
| C | En lugar de Inicial: el nivel `beginner` pasa a llamarse «Esenciales» en todo el taller, y el contenido nuevo se suma a ese nivel | Ningún ID ni valor cambia, pero el nombre cambia en el Atlas (8 conceptos), en el primer mundo de cada campaña, en Sistemas, en el laboratorio y en el README. Las E2E que nombran «Inicial» se editan. Esenciales deja de ser un escalón nuevo y pasa a ser Inicial con otro nombre y más ejercicios |

**El código, en las tres opciones:** se propone `essentials`. Va en inglés, como `lab`, `quests`, `cores` y los niveles `beginner`, `medium`, `advanced` y `expert`, porque es un identificador y no un texto; ya lo anticipan el ADR 0006 §5.1 y `tools/content/catalogs.ts`. El código no cambia nunca después de publicarse: es la clave de `catalogs`, el valor de `?catalog=`, el nombre de las porciones y la clave de la copia de A3. Las alternativas son `esenciales`, que repite el texto visible en un código, y `basics`, que no dice lo mismo.

**Recomendada: A, con `essentials`.** Es la lectura principal del ADR 0006 S1, que ya nombra a Esenciales como la primera etiqueta de nivel, y es la única de las tres en la que el alumno ve la cadena. **Costo:** la lista compartida de niveles crece, y cada vista que la usa tiene que seguir viéndose igual cuando no tiene contenido de Esenciales.

**Q3. ¿Dónde ve el alumno a Esenciales, y por dónde empieza?** *(FR-026 a FR-033, FR-037 y FR-040)* Hoy «Un desafío para hoy» sugiere el primer ejercicio sin resolver de la lista, y la lista sigue el orden de los catálogos. Dos pruebas de la red de F1 (`views.spec.ts` y `reload.spec.ts`) esperan que el botón abra `rust-01`.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Sólo en el laboratorio, primero en el mapa y en el recorrido libre («anterior», «siguiente» y la posición «X / Y»). Con «Todos los niveles», «Un desafío para hoy» sugiere el primer Esenciales sin resolver a quien no resolvió nada de ese lenguaje fuera de Esenciales; a los demás, lo de hoy. Las tarjetas de sus temas se numeran 01, 02… | Las dos pruebas de F1 cambian, en un commit propio, con TDD y tu aprobación. En el recorrido libre, cada ejercicio de hoy se corre *N* lugares (con *N* = 20, `rust-01` pasa de «1 / 137» a «21 / 157»), y `rust-01` y `go-01` pasan a tener un anterior. Ninguna E2E de F1 ni de F7a fija eso, y `rust-137` sigue siendo el último. Hacen falta dos reglas nuevas: la sugerencia y el número de la tarjeta |
| B | Sólo en el laboratorio, al final del mapa y del recorrido libre, como un catálogo más. El alumno nuevo sigue empezando por `rust-01` y llega a Esenciales por su nivel | Ninguna prueba de F1 cambia, pero sí una de F7a: «the last exercise of the language goes back to the map» (`lab-exercise.spec.ts`), porque `rust-137` deja de ser el último. Las tarjetas muestran su etapa real (50, 51…), como hoy los núcleos muestran 25 a 49. Pero quien recién empieza aterriza en Inicial, que es lo que Esenciales viene a anteceder |
| C | Lo de A más un mundo de campaña por lenguaje, antes del primero | Se activa el riesgo 8 de F6: la lista de rangos y la de símbolos, «MUNDO 0N» y `WORLD_MAX_SCORE`. Además, cada mundo se abre al completar el anterior: un mundo nuevo delante del primero cierra el mundo 1 a quien ya lo tenía, salvo una regla de compatibilidad con el progreso guardado. Cambian el «4» del menú, «24 misiones», los sellos y el texto editorial de F6. Suma 6 misiones por lenguaje, 3 de ellas desafíos nuevos |

**Recomendada: A.** Hace visible lo que la cadena dice, sin empujar a quien ya avanzó hacia un ejercicio básico. Además deja fuera de E1 la campaña, el Atlas, Sistemas, la Biblioteca y el Recorrido, así que el «4», el «25», «24 misiones» y «/180» no cambian, y el riesgo 8 de F6 deja de aplicar. **Costo:** las dos ediciones de F1, que piden tu aprobación; las dos reglas; y la posición de cada ejercicio de hoy en el recorrido libre, que se corre *N* lugares.

**Q4. ¿Qué forma tienen los IDs de Esenciales?** *(FR-005, FR-021 y FR-029)* Los IDs indexan el progreso para siempre. Todo el catálogo del laboratorio pasa por el validador de la campaña, que exige `^(rust|go)-\d+$` y rechaza la configuración entera si un ID no cumple: hoy la campaña dejaría de funcionar. `qa/content-check.ts` ata cada ID a su posición, y el fixture de IDs sólo crece.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | Correlativos por lenguaje: `rust-138`… y `go-138`…, como se sumaron los desafíos de campaña (101 a 112) y los núcleos (113 a 137) | Ningún cambio en el validador de la campaña, en la forma de ID de la API ni en el prefijo de lenguaje que esperan `atlas-check` y `guide-content-check`. `content-check` sigue contando por secciones. El número no dice «primero»: el nodo del mapa muestra «138», como hoy los desafíos muestran «101» |
| B | Con el código: `rust-essentials-01`… y `go-essentials-01`… | Se lee qué es, y el nodo del mapa muestra «01». El validador de la campaña y `content-check` aceptan la forma nueva, con su prueba. Las URL son más largas (`?ejercicio=rust-essentials-01`) |
| C | Cortos, con una letra: `rust-e01`… | El nodo muestra «e01». El costo es el de B |

**Recomendada: A.** Sigue el precedente del proyecto y es la única forma que no toca ningún validador. **Costo:** el ID no dice a qué catálogo pertenece, como ya pasa con los desafíos y los núcleos, y un ejercicio que se sume después a otro catálogo recibe un número mayor que los de Esenciales. El ADR de E1 lo registra.

**Q5. ¿Quién escribe el contenido, y en qué ítem se entrega?** *(FR-043 y FR-044)* El front no admite una porción vacía (`findPortionProblem` exige al menos un ejercicio), y el generador exige al menos una etapa por sección. E1 no puede salir con el catálogo vacío.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| A | E1 trae la plataforma y una primera etapa real por lenguaje (5 ejercicios cada una). La redacta un agente desde fuentes oficiales y la revisás vos. El resto va en un ítem nuevo de contenido (propuesta: **E2, «Contenido de Esenciales»**), una etapa por PR, cada una con `npm run curriculum`, `npm test`, la auditoría de B3 y tu revisión | Un ítem más en la hoja de ruta, que cablea el coordinador. Esenciales sale corto y crece por etapas, y cada PR de etapa actualiza a mano los contratos de conteo (FR-036) |
| B | Todo el contenido entra con E1, como tareas de contenido de su plan (una por etapa), y E1 se entrega completo | Un solo cambio visible. Pero el plan mezcla código y pedagogía, tu revisión de unos 40 ejercicios frena la plataforma, y el PR es grande para la auditoría de B3 |
| C | Escribís vos el contenido, o una persona docente, y los agentes sólo arman la plataforma | La pedagogía es tuya de punta a punta. Pero E1 igual necesita una etapa por lenguaje para salir, así que la plataforma espera a ese contenido |

**Recomendada: A.** Separa lo que revisa un código de lo que revisa un docente, deja que la plataforma avance en paralelo y aprovecha la compuerta de B3 por PR. **Costo:** un ítem nuevo, y una sesión que al principio tiene sólo una etapa.

**Partición.** La spec tiene 44 requisitos, por debajo de los 52 de C3a, así que no se propone partir. Q5 separa sólo el contenido.

## Dónde vive y cómo se arma

- **En `content/<lenguaje>/`.** Una sección nueva al final de `content/<lenguaje>/manifest.yaml`, después de `systems`, con la clave del código del catálogo y sus etapas en orden. Cada ejercicio va en `content/<lenguaje>/exercises/<id>/`, con `exercise.yaml`, `starter.<rs|go>` y `solution.<rs|go>`, como cualquier otro. No se agrega una carpeta de primer nivel: `content/` admite sólo `atlas/`, `campaign/`, `guide/`, `harness/`, `workshops/`, `rust/` y `go/`, y `qa/content-tools-check.ts` comprueba que `content/esenciales/` se rechace.
- **La etapa.** El generador cuenta las etapas de cada lenguaje por las secciones, en orden: `lab` (1 a 20), `quests` (21 a 24) y `systems` (25 a 49). Una sección al final empieza en la 50 y deja como están los 274 `stage` y sus `content_hash`. Es la numeración «al final» que piden la hoja de ruta y el ADR 0006 D13.
- **El nivel.** El laboratorio clasifica por etapa a un ejercicio sin nivel: hasta 4 es Inicial, hasta 8 Intermedio, hasta 12 Avanzado y desde 13 Experto. Lo hacen `levelFor` de `lab.js` y `levelOf` de F7a. Por eso un ejercicio de Esenciales siempre publica su nivel (FR-004). Si no lo publicara, se vería como Experto.
- **La forma publicada.** Cada ejercicio de Esenciales tiene la forma y el orden de claves de uno del laboratorio, con el nivel siempre presente. `curriculum.json` suma una clave al final, con un arreglo por lenguaje, y el meta suma el catálogo, las dos huellas de porción y las tres de cada ejercicio.
- **La validación.** El generador aplica las reglas de hoy (los tres archivos, las claves de prueba, tres pistas, la revisión, la predicción, `kind`, `visual`, las fuentes y el encabezado de Go) y nombra el archivo y el campo de cada error. `npm run curriculum` y `npm test` siguen siendo la puerta de entrada.
- **Lo descartado:** una carpeta propia en `content/`, poner las etapas dentro de `lab` y numerarlas aparte. Ver «Alternativas consideradas».

## Qué cambia en cada capa

| Capa | Qué cambia | Qué no cambia | Requisitos |
| --- | --- | --- | --- |
| Contenido y generador | Una sección por lenguaje en el manifiesto, sus carpetas de ejercicio, una clave nueva en `curriculum.json`, el catálogo y las huellas nuevas en el meta. El nivel nuevo en la lista de niveles de los ejercicios (Q2) | Las 17 porciones, los 274 ejercicios con su etapa y sus huellas, las etapas de taller y su fixture | FR-001 a FR-010 |
| Base (MySQL) | Una fila en `catalogs` (`essentials`, por lenguaje, posición 1) y las filas de sus ejercicios, temas, pruebas, pistas y versiones de corrección en las tablas de hoy. El valor de nivel al final de la columna `level` de los ejercicios (Q2) | Ninguna tabla nueva. La validación de la cadena, que ya exige posiciones únicas y contiguas desde 1 | FR-011, FR-012 y FR-018 |
| API | Dos porciones nuevas por el recurso de ejercicios (`catalog` y `language`), el auto-chequeo y la caché de cuerpos de 19 porciones, la sesión con Esenciales primero | Las reglas de entrega de C2 (bytes, `ETag`, 304, `Content-Version`, `Cache-Control`, 422, 503, sesión), `/api/runs` y `/api/sync` | FR-013 a FR-017 |
| Progreso | Nada en el formato. Los ejercicios nuevos se guardan por su ID en el navegador y en el servidor | El formato v1, las operaciones de D1, las tablas de progreso, las fixtures congeladas | FR-019 a FR-021 |
| Auditoría (B3) | Cubre Esenciales sin cambiarse y lo informa como una sección más. Cada PR de contenido de Esenciales lleva su resumen | El comando, la clasificación y los límites | FR-022 y FR-023 |
| Front | Las dos porciones en la fuente del contenido, el catálogo de ejercicios, el nivel, el mapa, la sugerencia, el número de las tarjetas y el conteo del menú (si F10 no entró) | El Atlas, la campaña, Sistemas, la Biblioteca y el Recorrido | FR-024 a FR-035 |
| Conteos y documentación | El README, los totales de `qa/`, el fixture de IDs, Pest y las E2E del laboratorio que fijan conteos | Las palabras editoriales de la campaña (F6-Q1) | FR-036 y FR-037 |

## Los conteos visibles

Con Q3-A, sólo cambian los conteos del laboratorio. *N* es la cantidad de ejercicios de Esenciales por lenguaje: 5 con E1, así que el menú pasa de 274 a 284 y cada lenguaje de 137 a 142.

| Conteo | Hoy | Con E1 | Lo deriva del catálogo | Si no, quién lo edita a mano |
| --- | --- | --- | --- | --- |
| Menú, Laboratorio (`.lab-nav-count`, los dos lenguajes) | 274 | 274 + 2*N* | F10 (su FR-032) | E1, en `frontend/src/index.html`, si F10 todavía no entró |
| Menú, Campaña, Sistemas y Biblioteca | 4, 25 y 15 | Igual | F10 | — |
| Laboratorio: el sello, «x/N resueltos», los temas, las pestañas de nivel, «N desafíos visibles.» y la nota «274 desafíos originales: 137 de Rust y 137 de Go» | 137 por lenguaje | 137 + *N* | Hoy `lab.js`, y F7b (su FR-022) | — |
| Laboratorio, la pestaña Esenciales | No existe | *N* | El mismo cálculo que las otras pestañas | — |
| Laboratorio, «Clásicos y sistemas · 25» | 25 | 25 (FR-030) | Hoy `lab.js` y F7b | — |
| Laboratorio, la posición «X / Y» del recorrido libre | «1 / 137» en `rust-01` | «*N* + 1 / 137 + *N*» en `rust-01` (FR-028) | Hoy `lab.js` y F7b | — |
| Campaña: «4 mundos», «24 misiones», «12 desafíos nuevos», «/180» y «de 4 insignias» | Esos | Igual | F6 | — |
| Campaña, las palabras «seis misiones» y «los cuatro mundos» | Esas | Igual: la spec de coherencia de F6 sigue en verde (FR-037) | Texto editorial (F6-Q1) | — |
| Sistemas, «N talleres» y «2N núcleos» | 25 y 50 | Igual | F5 | — |
| README: el encabezado (274, 137 y 137), «Aprender en el taller» (la lista de niveles), «Cobertura» (una fila para Esenciales), «Campaña» («forman parte de los 274») y «Desarrollo» («137 ejercicios por lenguaje») | Esos | Con Esenciales | — | E1, en el mismo commit que el contenido; después, cada PR de etapa (Q5) |
| `qa/`: la estructura por lenguaje de `content-check`, los totales de `systems-check`, `campaign-content-check`, `project-kit-check`, `api-sync-check` y `api-import-check`, las 17 porciones de `dist-content-check` y `curriculum-ids.json` | 274, 137 y 17 | Con Esenciales; el fixture sólo crece | — | Ídem |
| Pest: los 274 ejercicios, los 3 catálogos, las 17 o 18 porciones y las pruebas y pistas sembradas | Esos | Con Esenciales | — | Ídem |
| Las E2E del laboratorio que dejó F7a (`lab-map.spec.ts`: «137», «8/137 resueltos», «49 temas», «137 desafíos visibles.») | 137 y 49 | 137 + *N* y 49 más los temas de Esenciales | — | Ídem, salvo que F7b las haga leer el catálogo (hallazgo). Con Q2-A, «29 desafíos visibles» de Inicial no cambia, y con Q3-A tampoco «Un desafío para hoy» de esa prueba, que siembra progreso fuera de Esenciales |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Empezar por Esenciales (Priority: P1)

Una alumna abre el taller por primera vez, elige Rust y entra al Laboratorio. Ve «Esenciales» como el primer nivel, con su subtítulo y su conteo. Los temas de Esenciales encabezan el mapa, y «Un desafío para hoy» le sugiere el primero. Lo abre, lee la consigna, predice, completa el código, ejecuta las pruebas y, al aprobar, ve el ✓ en su nodo. Recarga la página, y el logro sigue ahí.

**Why this priority**: es la razón de ser de E1: que quien recién empieza tenga un primer escalón.

**Independent Test**: con el progreso vacío y el compilador simulado de la red de F1, abrir `#laboratorio`, elegir Esenciales, abrir el primer ejercicio y aprobarlo.

**Acceptance Scenarios**:

1. **Given** el progreso vacío, **When** abre el Laboratorio en Rust, **Then** la primera pestaña de nivel después de «Todos los niveles» es «Esenciales», con *N* desafíos, y el mapa empieza por los temas de Esenciales, numerados 01, 02… (Q3).
2. **Given** el progreso vacío, **When** pulsa «Entrar al laboratorio ↗», **Then** se abre el primer ejercicio de Esenciales de ese lenguaje, con la URL `?ejercicio=<su ID>&paso=learn#laboratorio`.
3. **Given** un ejercicio de Esenciales abierto, **When** resuelve las tres pruebas, **Then** queda resuelto con sus 20 puntos de práctica, como cualquier otro, y el conteo de la pestaña Esenciales y «x/N resueltos» cuentan el logro.
4. **Given** el mismo ejercicio, **When** pide pistas, predice, explica, agenda un repaso o descarga el kit, **Then** todo se comporta como en un ejercicio de Inicial.
5. **Given** Go en lugar de Rust, **When** repite el recorrido, **Then** pasa lo mismo, con los ejercicios de Esenciales de Go.

---

### User Story 2 - Nada de lo que ya tenía cambia (Priority: P1)

Un alumno que lleva meses en el taller entra después del despliegue de E1. Su progreso, sus borradores, sus sellos de campaña y sus logros de Sistemas están igual. «Seguir aprendiendo» lo lleva adonde lo llevaba, y el Atlas, la campaña y Sistemas se ven como antes. Sólo nota un nivel nuevo en el laboratorio.

**Why this priority**: E1 suma contenido sobre un progreso que ya existe. Perderlo o moverlo sería peor que no tener Esenciales.

**Independent Test**: arrancar el build con las tres fixtures de progreso congeladas y comparar las porciones y las huellas con la línea de base.

**Acceptance Scenarios**:

1. **Given** las fixtures `progress-master-2a278ad-storage.json`, `progress-master-2a278ad-export.json` y `progress-d0e1b49-export.json`, **When** arranca el taller con E1, **Then** no escribe, no respalda y no avisa (ADR 0003).
2. **Given** un alumno que resolvió ejercicios de Inicial y ninguno de Esenciales, **When** abre el Laboratorio con «Todos los niveles», **Then** «Un desafío para hoy» le sugiere lo mismo que le sugería antes de E1 (Q3).
3. **Given** el contenido generado antes y después de E1, **When** se comparan, **Then** las 17 porciones de hoy son idénticas byte a byte y los 274 ejercicios conservan su `stage` y sus tres huellas.
4. **Given** el Atlas, la campaña, Sistemas y la Biblioteca, **When** se abren, **Then** muestran los mismos conteos, filtros, medidores de nivel y textos que antes (Q3).

---

### User Story 3 - La API sirve Esenciales (Priority: P1)

Quien opera el taller despliega la imagen nueva. El import suma el catálogo y sus ejercicios en una sola transacción, el auto-chequeo arma las 19 porciones y las compara con el meta, y la sesión publica los catálogos con Esenciales primero. El front, o cualquier cliente con sesión, pide los ejercicios de Esenciales de un lenguaje y recibe los bytes del generador, con `ETag` y `Content-Version`.

**Why this priority**: sin el servidor no hay contenido para el front (A3) ni ejecución (B2).

**Independent Test**: importar sobre una base que ya tiene el contenido de hoy, pedir `GET /api/session`, las dos porciones nuevas, un ejercicio por ID y repetir con `If-None-Match`.

**Acceptance Scenarios**:

1. **Given** una base con el contenido anterior a E1, **When** corre el import, **Then** escribe la fila de `essentials` con su posición 1, sus ejercicios y sus hijos, y no toca ninguna fila de los 274 ni de las tablas de usuarios.
2. **Given** el import hecho, **When** se repite con el mismo documento, **Then** no escribe ni registra nada (idempotencia de C2).
3. **Given** una sesión, **When** pide `GET /api/exercises?catalog=essentials&language=rust`, **Then** recibe 200 con los bytes de la porción, su `ETag`, `Content-Version` y `Cache-Control: private, no-cache`. Con el `ETag` en `If-None-Match` recibe 304, y sin `language`, 422.
4. **Given** una sesión, **When** pide `GET /api/session`, **Then** la lista de catálogos empieza por `{code: essentials, sliceBy: language, chainPosition: 1}`, y los otros tres siguen sin posición.
5. **Given** un ejercicio de Esenciales, **When** se lo ejecuta por `POST /api/runs`, **Then** se arma con la plantilla, corre en el sandbox y se clasifica como cualquier otro.

---

### User Story 4 - Escribir y revisar un ejercicio de Esenciales (Priority: P2)

Quien escribe contenido agrega un ejercicio a una etapa de Esenciales en `content/rust/`. `npm run curriculum` lo valida y nombra lo que falta. `npm test` le pide actualizar los contratos de conteo, y la auditoría de B3 confirma que la solución aprueba y el inicial falla. El usuario revisa la pedagogía, y el PR lleva el resumen de la auditoría.

**Why this priority**: es el circuito por el que entra todo el contenido (Q5). No es lo que ve el alumno, pero sin él no hay nada que ver.

**Independent Test**: agregar un ejercicio de prueba en una copia, correr el generador y los checks, y ver cada error nombrado y cada contrato que cambia.

**Acceptance Scenarios**:

1. **Given** un `exercise.yaml` de Esenciales sin nivel, con dos pistas o con una clave de prueba repetida, **When** corre `npm run curriculum`, **Then** falla nombrando el archivo y el campo.
2. **Given** un ejercicio válido, **When** corre `npm test`, **Then** los checks de conteo fallan hasta que el autor actualiza, en el mismo commit, el fixture de IDs, los totales y el README.
3. **Given** el contenido importado en la instancia de auditoría, **When** corre B3, **Then** el informe lista Esenciales como una sección, con su solución aprobada y su inicial fallando como corresponde.
4. **Given** un inicial de Esenciales que no compila y es de `completar`, **When** corre B3, **Then** es un hallazgo; si es de `reparar`, falla como corresponde (B3-Q1).

---

### User Story 5 - Los conteos dicen la verdad (Priority: P2)

Después de E1, cada número que cuenta ejercicios coincide con el catálogo: el menú, el sello del laboratorio, las pestañas, la nota de respaldo y el README. Los números que no cuentan Esenciales, como los de la campaña o Sistemas, siguen iguales.

**Why this priority**: un conteo viejo es un error visible, y la hoja de ruta del front dejó a E1 como dueño de los que no se derivan.

**Independent Test**: comparar cada conteo de la tabla «Los conteos visibles» con el catálogo generado.

**Acceptance Scenarios**:

1. **Given** el build con E1 y F10 entregado, **When** se abre el menú, **Then** el conteo del laboratorio es 274 + 2*N*, sin un literal en el código.
2. **Given** el build con E1 y sin F10, **When** se abre el menú, **Then** `.lab-nav-count` muestra 274 + 2*N*, editado en `index.html` en el mismo cambio.
3. **Given** el build con E1, **When** se abre la campaña, **Then** sigue mostrando «4 mundos», «24 misiones», «12 desafíos nuevos» y «/180», y su spec de coherencia pasa sin editarse.

---

### Edge Cases

- **Una pestaña abierta con el front anterior a E1, después del despliegue.** Si otra pestaña con el front nuevo guarda progreso de Esenciales, la vieja encuentra IDs que no conoce: los respalda en una ranura y avisa, sin perder nada (ADR 0003). Es la compatibilidad N-1 que ya existe.
- **Retirar Esenciales más adelante.** El catálogo y sus ejercicios quedan `deprecated` y salen de las porciones. El progreso del servidor se conserva y se lee (D1). En el navegador, esos IDs pasan a ser desconocidos y se respaldan con aviso, como cualquier ejercicio retirado.
- **Un ejercicio de Esenciales retirado y vuelto a publicar con el mismo ID:** se reactiva (spec 001, FR-027). Un ID retirado no se reutiliza para otro ejercicio.
- **Una operación de sincronización sobre un ejercicio de Esenciales antes del import** (un cliente nuevo contra un servidor viejo): se rechaza esa operación con `unknown_reference`, sin frenar el lote (spec 007, FR-005).
- **Importar una copia v1 con progreso de Esenciales en una versión sin Esenciales:** los IDs desconocidos se omiten y el aviso lo dice (ADR 0003).
- **La copia de A3 de antes de E1:** tiene 17 porciones y otra versión de formato. Se descarta sin aviso, y el arranque necesita el servidor una vez (spec 016, FR-017 y FR-018).
- **El generador sin etapas de Esenciales en un lenguaje:** falla, porque la sección exige al menos una etapa. El front no admite una porción vacía.
- **Un nivel sin contenido en una vista:** el Atlas no tiene conceptos de Esenciales, así que no ofrece ese filtro ni cambia su medidor. La campaña y Sistemas no lo muestran (FR-033).
- **«Clásicos y sistemas»** cuenta las etapas 16 a 20. Esenciales empieza en la 50 y no entra en el filtro (FR-030).
- **Un ejercicio de Esenciales con `imports` de Go que el caché precalentado no trae:** lo detecta el check estático de B3 (FR-027 de la spec 020) y se corrige antes del merge.
- **Un alumno con la pestaña Esenciales elegida que pulsa «Un desafío para hoy»:** se le sugiere el primero sin resolver de Esenciales, como en cualquier nivel elegido.

## Requirements *(mandatory)*

### Functional Requirements

**Contenido y generador**

- **FR-001**: Esenciales DEBE ser un catálogo nuevo, con el código `essentials`, cortado por lenguaje y con posición 1 en la cadena, la única. `lab`, `quests` y `cores` siguen sin posición. *(ADR 0006 D13; spec 001, Q8; Q2)*
- **FR-002**: Su contenido DEBE vivir en `content/<lenguaje>/`: una sección al final del manifiesto de cada lenguaje, después de `systems`, y una carpeta por ejercicio en `content/<lenguaje>/exercises/<id>/`, con los tres archivos de siempre. No se agrega una carpeta de primer nivel en `content/`. *(«Dónde vive y cómo se arma»)*
- **FR-003**: Las etapas de Esenciales DEBEN numerarse al final de cada lenguaje (hoy, desde la 50), y los 274 `stage` actuales no cambian. *(ADR 0006 D13; hoja de ruta, E1)*
- **FR-004**: Cada ejercicio de Esenciales DEBE publicar su nivel, y el generador DEBE exigirlo en esa sección: sin nivel, el laboratorio lo clasifica por etapa como Experto. El nivel es `essentials`, con la etiqueta «Esenciales». *(Q2)*
- **FR-005**: Los IDs de Esenciales DEBEN ser correlativos por lenguaje, después del último de hoy: `rust-138`… y `go-138`… (los de E1 son `rust-138` a `rust-142` y `go-138` a `go-142`). Además DEBEN ser únicos entre lenguajes y catálogos, cumplir la forma de ID de la API (minúsculas, dígitos y guiones, de 1 a 64 caracteres) y no repetir un ID usado nunca. *(Constitución IV; spec 001, FR-015; Q4)*
- **FR-006**: El generador DEBE validar los ejercicios de Esenciales con las reglas de los del laboratorio: los tres archivos, las claves de prueba estables, tres pistas, la revisión, la predicción, las fuentes, `kind`, `visual` y el encabezado de Go. Cada error nombra el archivo y el campo. *(`README.md`, «Contenido del currículo»)*
- **FR-007**: `curriculum.json` DEBE sumar Esenciales como una clave nueva, después de las siete de hoy, con un arreglo por lenguaje. Cada ejercicio tiene la forma publicada y el orden de claves de uno del laboratorio, con el nivel siempre presente.
- **FR-008**: El meta DEBE sumar el catálogo con su `sliceBy` y su posición, la huella de las dos porciones nuevas y las tres huellas de cada ejercicio nuevo, calculadas sólo en el generador. *(spec 001, FR-028 y FR-031)*
- **FR-009**: Nada más DEBE cambiar en lo generado. Las 17 porciones de hoy conservan sus bytes y sus huellas. Los 274 ejercicios conservan su `stage`, su `content_hash`, su `grading_hash` y su `starter_hash`. `qa/fixtures/curriculum-ids.json` conserva cada entrada existente y sólo crece, y `qa/fixtures/workshop-steps-v1.json` no cambia. `Content-Version` sí cambia, porque cambia el documento. `build/curriculum.json` y el volcado de `dump-globals` (mientras F10 no lo retire) cambian sólo por lo nuevo de Esenciales; la diferencia no es una regresión, y su huella nueva reemplaza a la de la línea base. *(como la spec 007, FR-047)*
- **FR-010**: Las decisiones de IDs (Q4) y de numeración de etapas (FR-003) DEBEN quedar en un ADR nuevo, que E1 entrega con su implementación. El ADR también registra el código (Q2) y por qué la etapa no es el número que ve el alumno. *(Hoja de ruta, E1; ADR 0006 §10)*

**Base y API**

- **FR-011**: El import DEBE escribir Esenciales como una fila de `catalogs` y sus ejercicios, temas, pruebas, pistas y versiones de corrección en las tablas de hoy, sin tablas nuevas. DEBE hacerlo en su única transacción y con la validación de la cadena que ya existe: posiciones únicas y contiguas desde 1. *(ADR 0006 D12 y D13; spec 001, FR-004 y FR-006)*
- **FR-012**: La columna `level` de los ejercicios DEBE aceptar el valor nuevo al final de su lista, con una migración sólo hacia adelante y la espera de bloqueos acotada. Las de talleres, mundos y conceptos del Atlas no cambian, y el generador rechaza ese nivel en esos registros: así el generador y la base aceptan los mismos niveles en cada tipo de registro. *(ADR 0006 §10, D07 y D35; Q2)*
- **FR-013**: La API DEBE servir dos porciones nuevas, los ejercicios de Esenciales de Rust y de Go, por el recurso de ejercicios con `catalog` y `language`. Rigen las reglas de C2: los bytes del generador, `ETag`, 304 también con validador débil, `Content-Version`, `Cache-Control: private, no-cache`, 422 por parámetros, 503 sin import, y detrás de la sesión. *(spec 001, FR-013 a FR-025; spec 004)*
- **FR-014**: `GET /api/exercises/{id}` DEBE servir cada ejercicio de Esenciales con los bytes de su `contentHash`, y responder 410 si se retiró. *(spec 001, FR-015)*
- **FR-015**: El auto-chequeo del import y la caché de cuerpos DEBEN cubrir las 19 porciones del contenido (las 17 y las dos nuevas). La plantilla del harness sigue aparte. *(spec 001, FR-005 y FR-012)*
- **FR-016**: `GET /api/session` DEBE publicar Esenciales entre los catálogos activos, primero y con posición 1. *(ADR 0006 D13; spec 004)*
- **FR-017**: Una ejecución de un ejercicio de Esenciales por `POST /api/runs` DEBE armarse, correr y clasificarse como la de cualquier otro, sin cambiar B2: la admisión lee el ejercicio activo por su ID, sin mirar el catálogo. *(spec 005)*
- **FR-018**: Volver atrás DEBE ser hacia adelante. Retirar Esenciales deja el catálogo `deprecated` y sin posición, y sus ejercicios retirados; nunca los borra. El progreso del servidor se conserva y se lee. *(ADR 0006 §10, «Vuelta atrás», y D15; spec 007)*

**Progreso**

- **FR-019**: El progreso de un ejercicio de Esenciales DEBE guardarse por su ID, como el de cualquier otro: en el navegador (v1) y en el servidor (D1a y D1b), sin cambiar el formato v1, las operaciones de `/api/sync` ni las tablas de progreso. *(ADR 0003; spec 007, FR-005)*
- **FR-020**: Arrancar con las tres fixtures de progreso congeladas DEBE seguir sin escribir, sin respaldar y sin avisar. Exportar e importar una copia con progreso de Esenciales DEBE conservarlo, con las reglas de fusión de hoy. *(ADR 0003; `qa/AGENTS.md`)*
- **FR-021**: La campaña DEBE seguir funcionando con los ejercicios de Esenciales en la lista del laboratorio. Su motor recibe todos los ejercicios y rechaza la configuración entera si un ID no tiene la forma `<lenguaje>-<número>`: los IDs de Q4-A la cumplen, y el validador no cambia. Los sellos, los puntos y los desbloqueos de la campaña no cambian. *(Q4)*

**Auditoría**

- **FR-022**: La auditoría de B3 DEBE cubrir Esenciales sin una lista fija. Cada solución aprueba, y cada inicial falla por sus pruebas, o no compila si es `reparar`. El informe cuenta Esenciales como una sección más, y la primera de cada lenguaje, como en la cadena. *(spec 020, FR-001 y Q1; hallazgo E1-1)*
- **FR-023**: Todo PR que sume o cambie un ejercicio de Esenciales DEBE llevar el resumen de una corrida de B3 en verde. El check estático del caché de Go DEBE cubrir sus `imports`. *(spec 020, FR-027, FR-032 y FR-038; B3-Q3)*

**Front**

- **FR-024**: La fuente del contenido vigente cuando entra E1, la estática de A2 o la de la API de A3, DEBE traer las dos porciones nuevas como obligatorias, con la regla de todo o nada y la forma de una porción de ejercicios. Si A3 ya entró, sube la versión de formato de la copia, la copia anterior se descarta como dice A3, y el arranque pasa de 18 a 20 pedidos por ronda. *(spec 006; spec 016, FR-014, FR-017 y FR-018, y su plan, §5)*
- **FR-025**: El catálogo de ejercicios del front DEBE incluir los de Esenciales, leídos del contenido publicado por el lado de `app/` (`getContent()`), sin un global de catálogo nuevo. *(F10-Q3; hallazgo E1-7)*
- **FR-026**: El laboratorio DEBE ofrecer Esenciales como el primer nivel, antes de Inicial, con su nombre, su conteo y el subtítulo «Tus primeros pasos». Los otros cuatro niveles conservan su orden, sus textos y sus conteos. *(Q2)*
- **FR-027**: Un ejercicio de Esenciales DEBE abrirse, ejecutarse, revisarse, ofrecer pistas, predicción, explicación, variante y repaso, y descargarse como kit, igual que los demás y en las mismas fases. *(`README.md`, «Aprender en el taller»)*
- **FR-028**: Con «Todos los niveles», el mapa DEBE mostrar primero los temas de Esenciales. El recorrido libre («anterior», «siguiente», la posición «X / Y» y el botón del pie) DEBE seguir el mismo orden: Esenciales y después el de hoy, así que `rust-137` y `go-137` siguen siendo los últimos. «Un desafío para hoy» DEBE sugerir el primer ejercicio de Esenciales sin resolver sólo a quien no resolvió ningún ejercicio de ese lenguaje fuera de Esenciales; a los demás, lo que sugería antes de E1. Con un nivel elegido, rige la regla de hoy dentro de ese nivel. *(Q3)*
- **FR-029**: La tarjeta de un tema de Esenciales DEBE mostrar su número dentro de Esenciales, con dos cifras (01, 02…). Las de los 274 conservan su etapa. Los nodos siguen mostrando la última parte del ID. *(Q3 y Q4)*
- **FR-030**: «Clásicos y sistemas» NO DEBE incluir Esenciales: su conteo sigue en 25 por lenguaje. La búsqueda, «Sorprendeme ↗» y «Repasar pendientes» lo incluyen como a cualquier ejercicio.
- **FR-031**: Los conteos del laboratorio DEBEN incluir Esenciales, derivados del catálogo: el sello del lenguaje, los resueltos, los temas, las pestañas de nivel, los visibles y la nota de respaldo. *(spec 021, FR-022)*
- **FR-032**: El conteo del laboratorio en el menú DEBE incluir los ejercicios de Esenciales de los dos lenguajes. Si F10 ya entró, se deriva del catálogo; si no, E1 lo edita en `frontend/src/index.html` en el mismo cambio. *(spec 024, FR-032; hoja de ruta del front, E1)*
- **FR-033**: El Atlas, la campaña, Sistemas, la Biblioteca y el Recorrido NO DEBEN cambiar a la vista: ni conteos, ni filtros, ni medidores de nivel, ni textos. Una vista no ofrece un nivel del que no tiene contenido. *(Q2 y Q3)*
- **FR-034**: Los ejercicios de Esenciales NO DEBEN tener explorador propio: el mapa explícito por ID de F2 no los nombra. Usan los modelos de `visual` de hoy. *(spec 009, Q1)*
- **FR-035**: El cambio del laboratorio DEBE hacerse sobre la vista vigente cuando E1 entra. Si F7b ya entró, va en la página de React. Si no, va en `lab.js`, y F7b lo porta como comportamiento vigente, con sus E2E (el modelo del ruling C4). E1 espera a F7b: su plan lo exige como precondición. *(Assumptions)*

**Conteos, textos y contratos a mano**

- **FR-036**: Las cantidades que repiten un conteo y no salen del catálogo DEBEN actualizarse en el mismo commit que suma ejercicios. Son las filas «a mano» de «Los conteos visibles»: el README, los totales de `qa/`, el fixture de IDs, las pruebas de Pest y las E2E del laboratorio que fijan conteos. *(`README.md`, «Contenido del currículo»)*
- **FR-037**: La spec de coherencia del texto editorial de F6 DEBE seguir en verde sin editarse, porque la campaña no cambia (Q3). *(spec 019, FR-031)*

**Verificación** (las pruebas llegan antes que la implementación: constitución, principio II)

- **FR-038**: Las pruebas de Pest, contra MySQL real, DEBEN cubrir:
  - el contrato de las 19 porciones y de cada ejercicio nuevo contra el meta, sensible al orden de claves;
  - el import: la fila del catálogo, la cadena, la idempotencia y que las 274 filas no se escriben;
  - la sesión con Esenciales primero;
  - la migración del nivel (Q2), de ida y de vuelta en `mysql-test`;
  - el 422 de un catálogo desconocido.

  *(Constitución, principio II; spec 001, FR-038 a FR-042)*
- **FR-039**: Un check DEBE comparar el contenido con una línea de base tomada de `master` antes del cambio, en dos niveles. Siempre, dentro de `npm test`: cada uno de los 274 ejercicios sigue y conserva su etapa (ADR 0006 D13). Como compuerta de E1, con `--full` y fuera de `npm test`: los bytes y las huellas de las 17 porciones y las tres huellas de los 274, con la primera diferencia nombrada (SC-001). La comparación completa no corre siempre para no congelar el mantenimiento del contenido: corregir un texto o una pista, o los bugs de `rust-63` y `rust-71`, cambia huellas a propósito.
- **FR-040**: La red de F1 DEBE pasar sin editarse, salvo las dos pruebas que abren el primer ejercicio desde el mapa (`views.spec.ts` y `reload.spec.ts`, que hoy esperan `rust-01`). Esas cambian en un commit propio, con TDD: el usuario lo aprobó en el clarify (Q3). Las E2E nuevas cubren abrir, resolver y recargar un ejercicio de Esenciales con el compilador simulado, la pestaña Esenciales, la sugerencia para quien ya avanzó y el orden del recorrido libre (el anterior de `rust-01`).
- **FR-041**: `npm run api:content:check` DEBE cubrir las 19 porciones a través de Nginx, con y sin compresión. *(spec 001, FR-047)*
- **FR-042**: E1 DEBE cerrar con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `npm run test:e2e` en verde. También con Pest, Pint y PHPStan nivel 9, y con el resumen de una corrida de B3 en verde sobre el último commit. *(Hoja de ruta, «Criterios de aceptación globales»; B3-Q3)*

**Contenido**

- **FR-043**: E1 DEBE entregar la primera etapa real de Esenciales de cada lenguaje, de cinco ejercicios, porque el front no admite una porción vacía. Las otras tres etapas van en E2 (Q5). La sección de Esenciales DEBE ser obligatoria en los manifiestos de los dos lenguajes (hoy `quests` y `systems` son opcionales), y el generador exige al menos una etapa en ella. *(Q1 y Q5)*
- **FR-044**: Antes de integrarse, cada ejercicio de Esenciales DEBE pasar por estos pasos:
  1. un borrador escrito desde fuentes oficiales y enlazado en `sources`. En Rust: The Rust Book, Rust by Example y la referencia de la biblioteca estándar. En Go: A Tour of Go, Effective Go, la especificación y la documentación de los paquetes;
  2. `npm run curriculum` y `npm test`;
  3. la auditoría de B3;
  4. la revisión pedagógica del usuario, que aprueba el texto, las pruebas y las pistas.

  El borrador lo escribe un agente, y la revisión del usuario es la compuerta antes del PR. *(Q5; constitución, principio IV)*

### Key Entities *(include if feature involves data)*

| Entidad | Qué representa | Cantidad |
| --- | --- | --- |
| Catálogo Esenciales | Una fila de `catalogs`: el código (Q2), el corte por lenguaje y la posición 1, la única de la cadena | 1 (con `lab`, `quests` y `cores`, 4) |
| Nivel Esenciales | El primer valor de la cadena de niveles de los ejercicios, con la etiqueta «Esenciales». Lo publica cada ejercicio de Esenciales | 1 (los niveles de los ejercicios pasan de 4 a 5; los de talleres, mundos y Atlas siguen en 4) |
| Etapa de Esenciales | Un tema con sus ejercicios en la sección nueva del manifiesto. Su número sigue al de la última etapa de Sistemas | 4 por lenguaje (Q1): 1 en E1 (la 50) y 3 en E2 |
| Ejercicio de Esenciales | Como uno del laboratorio, con su ID (Q4), su nivel siempre presente y sus tres huellas | *N* = 5 por lenguaje con E1, y 20 con E2 (Q5) |
| Porción de Esenciales | Los ejercicios de Esenciales de un lenguaje, servidos con los bytes del generador | 2 (las porciones del contenido pasan de 17 a 19) |
| ADR de IDs y etapas | Registra la forma de los IDs, la numeración al final, el código y la diferencia entre la etapa y el número que ve el alumno | 1 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al cerrar E1, entre el contenido generado en `master` antes de E1 y después hay 0 diferencias en los bytes y las huellas de las 17 porciones de hoy, y en el `stage`, el `content_hash`, el `grading_hash` y el `starter_hash` de los 274 ejercicios (la comparación completa de FR-039). `curriculum-ids.json` conserva sus 274 entradas.
- **SC-002**: Las 19 porciones y cada ejercicio de Esenciales que sirve la API tienen la huella que escribe el generador, a través de Nginx, con y sin compresión.
- **SC-003**: Una corrida de B3 con runsc da 274 + 2*N* soluciones que aprueban y 274 + 2*N* iniciales que fallan como corresponde, con 0 programas sin veredicto.
- **SC-004**: Con el progreso vacío, una E2E abre el laboratorio, entra a Esenciales desde «Un desafío para hoy» y resuelve el ejercicio con el compilador simulado. Después de recargar, y después de exportar e importar, el logro sigue, en Rust y en Go.
- **SC-005**: Las tres fixtures de progreso congeladas arrancan con E1 sin escribir, sin respaldar y sin avisar.
- **SC-006**: La red de F1 pasa con sólo las dos ediciones aprobadas de FR-040. Las 17 E2E de A2 (`content-gate.spec.ts`) pasan sin editarse: alteran porciones del documento construido y no fijan cuántas hay. Las E2E y las specs del Atlas, la campaña (incluida la de coherencia de F6), Sistemas y la Biblioteca pasan sin editarse. De las E2E del laboratorio de F7a sólo cambian las que fijan conteos (FR-036).
- **SC-007**: `GET /api/session` lista cuatro catálogos activos: Esenciales primero, con posición 1, y los otros tres sin posición.
- **SC-008**: Cada conteo de la tabla «Los conteos visibles» coincide con el catálogo generado. Ningún número que cuente Esenciales queda con el valor de antes.
- **SC-009** (una medición, no un criterio de aprobación): se informan el tamaño de las dos porciones nuevas, el del documento antes y después, y el de la foto de progreso de una cuenta con todos los ejercicios con intento, contra la medición de SC-010 de la spec 007.

## Riesgos

1. **Dos ejes con el mismo nombre.** Con Q2-A, `essentials` es a la vez un catálogo y un nivel. Alguien puede filtrar por uno creyendo filtrar por el otro. *Mitigación:* el ADR lo dice, y FR-004 ata el nivel a la sección.
2. **La lista de niveles es compartida.** Crecerla llegaría al Atlas, que dibuja tantas marcas como niveles y ofrece un filtro por cada uno, y a los validadores de la campaña, Sistemas y el generador. *Mitigación:* el nivel nuevo es sólo de los ejercicios (FR-012), y la lista compartida no cambia; FR-033 y las specs del Atlas sin editar (SC-006).
3. **Pestañas viejas después del despliegue.** Una pestaña con el front anterior respalda y avisa por los IDs de Esenciales que escribió otra. *Mitigación:* el comportamiento ya existe (ADR 0003) y no pierde nada. El aviso es visible, y se acepta.
4. **Los conteos repetidos en muchos lugares.** El README, seis checks de `qa/`, el fixture de IDs, Pest y las E2E de F7a. *Mitigación:* FR-036 y la tabla de conteos; F7b puede hacer que sus E2E lean el catálogo (hallazgo).
5. **La superposición con Inicial** (Q1). *Mitigación:* las reglas de «Qué es Esenciales» y la revisión pedagógica de cada ejercicio (FR-044).
6. **La revisión pedagógica es el cuello de botella** (Q5). *Mitigación:* una etapa por PR.
7. **Cada PR de contenido necesita la auditoría local de B3**, con runsc y la instancia propia. *Mitigación:* es la regla de B3-Q3 para todo el contenido, no una carga nueva de E1.
8. **El número de la tarjeta (01…) y el del nodo (138…) no coinciden** con Q4-A. *Mitigación:* ya pasa con los desafíos (tema 21, nodos 101 a 103). Q4-B lo resuelve, con su costo.
9. **El recorrido libre se corre para todos** con Q3-A: la posición «X / Y» de cada ejercicio de hoy suma *N*, y `rust-01` y `go-01` pasan a tener un anterior. *Mitigación:* es la consecuencia visible de poner Esenciales primero, y la prueba una E2E nueva (FR-040). Ninguna E2E de hoy la fija.
10. **El COPY de la columna `level` de los ejercicios.** *Mitigación:* es una tabla de cientos de filas, con la espera acotada (D35).
11. **Nada de esto se ejecutó.** La spec sale de leer el código de `master` (24ba9d3d) y de `impl-f7a` (fc88d450). Las cifras de conteo son de ese código, y los números finales los fija el contenido.

## Relación con otras specs

- **C2 (001) y C6 (002):** E1 usa su import, sus recursos, la validación de la cadena y los registros tipados (`Catalog` ya existe). C2 anticipó la fila (FR-032). Ninguna de las dos se edita: E1 actualiza las pruebas de conteo en su propio PR.
- **C3a (004):** `GET /api/session` ya publica los catálogos activos, ordenados por posición.
- **B2 (005):** la ejecución no cambia (FR-017).
- **D1 (007):** el progreso es por ID (FR-005). E1 sólo necesita D1a, que está entregada, y no le pide nada a D1c.
- **A2 (006):** «La lista de 17 porciones es la de hoy. E1 la va a ampliar». E1 suma las dos a `PORTION_NAMES` y a las reglas de forma.
- **A3 (016):** la lista de porciones es fija, y E1 suma la suya con su código. Toca `PORTION_NAMES`, `PORTION_RESOURCES` y la tabla de los dos dobles, y sube `COPY_FORMAT` (su plan, §5). El FR-014 de A3 pasa de 18 a 20 pedidos por ronda.
- **B3 (020):** cubre Esenciales sin cambiarse (FR-001), y cada PR de contenido lleva su resumen (FR-032 y FR-038).
- **F2 (009):** el mapa de exploradores es explícito por ID, así que Esenciales no tiene explorador (FR-034).
- **F6 (019):** con Q3-A, la campaña no cambia y su riesgo 8 no aplica. Su validador fija la forma de los IDs (FR-021).
- **F7 (021):** `levelOf` y la regla de «Clásicos y sistemas» viven en `entities/exercise` y `pages/lab/model` desde F7a. Los conteos se derivan (FR-022 de F7b). La etapa con dos cifras (FR-025 de F7b) cambia para Esenciales (FR-029).
- **F10 (024):** el conteo del menú se deriva (FR-032), los globales de catálogos se retiran (F10-Q3) y los conteos aparecen con el contenido (F10-Q5).
- **F3 (012), F5 (018) y F9 (014):** sus conteos no cambian con Q3-A.
- **C5:** si agrupa por catálogo o por nivel, Esenciales aparece solo. No es de E1.

## Acciones del usuario

| Cuándo | Acción |
| --- | --- |
| Hecho (2026-10-28) | Respondió Q1 a Q5, aprobó las dos ediciones de la red de F1 y aceptó el ítem E2. |
| Durante la implementación | Aprobar el ADR de IDs y etapas. Revisar la pedagogía de cada ejercicio de la etapa piloto: es la compuerta antes del PR. |
| Siempre | Aprobar o enmendar el ADR 0006, que sigue en «propuesta». E1 no pide descargas ni dependencias nuevas: la auditoría usa las imágenes del sandbox que ya construyó B2. |

## Assumptions

- El ADR 0006 sigue en «propuesta», y esta spec lo usa como base.
- A1, D1a y D1b están entregados. E1 no necesita D1c.
- B3 entra antes que E1 (ola 4 contra ola 5), así que su compuerta rige para el contenido de E1.
- E1 entra después de F7b (FR-035). F10 y A3 pueden haber entrado o no, y la spec cubre los dos casos (FR-024 y FR-032).
- Los temas y la cantidad salen de Q1 y Q5: 5 ejercicios por lenguaje en E1 y 20 con E2. El subtítulo «Tus primeros pasos» es el texto del nivel.
- Las cifras de hoy salen de `master` (24ba9d3d): 49 etapas y 137 ejercicios por lenguaje, 17 porciones de contenido más la plantilla, y 3 catálogos. Las E2E del laboratorio salen de `impl-f7a` (fc88d450), que todavía no está en `master`.
- La plantilla del harness corrige con expresiones booleanas sobre funciones, y Esenciales no cambia eso.
- El laboratorio sigue sin bloqueos: Esenciales se recomienda, no se exige («Podés explorar cualquier tema, sin bloqueos»).

## Alternativas consideradas

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde vive | Una sección al final del manifiesto de cada lenguaje; una carpeta `content/essentials/` de primer nivel; las primeras etapas de `lab` | La sección. La carpeta pide un cargador nuevo, y hoy `content/` y su check la rechazan. Dentro de `lab`, las etapas de los 274 se corren y cambian sus `content_hash` (la «Trampa de E1» de D13) |
| La numeración de etapas | Al final (desde la 50); aparte (1 a *N*, sólo para Esenciales); antes | Al final, como piden la hoja de ruta y D13. Aparte choca con «Clásicos y sistemas» (etapas 16 a 20) y con la clasificación por etapa. Antes cambia los 274 |
| Las porciones | Dos nuevas, por lenguaje; dentro de `lab.<lenguaje>`; una sola para los dos lenguajes | Dos nuevas. Dentro de `lab` cambian los bytes de dos porciones de hoy (contra SC-001). Una sola rompe el corte por lenguaje de los ejercicios |
| La lista de porciones del front | Tomarla de los catálogos de la sesión; fija | Fija, como decidió A3: el front no usa una porción para la que no tiene código |
| Un catálogo vacío mientras se escribe el contenido | Publicarlo vacío; ocultarlo con una bandera; salir con una etapa real | Una etapa real (FR-043). El front no admite una porción vacía, y la bandera es YAGNI |
| Desbloqueos | Exigir Esenciales antes de Inicial; recomendarlo | Recomendarlo. El laboratorio no bloquea, y D13 deja los desbloqueos para una derivación futura |
| El número de la tarjeta | La etapa real (50…); su número dentro de Esenciales (01…) | Su número dentro de Esenciales, con Q3-A: es lo que espera quien empieza por ahí. Con Q3-B queda la etapa real |
