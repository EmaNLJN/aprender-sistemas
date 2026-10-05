# Feature Specification: C2 · Contenido en MySQL

**Feature Branch**: `001-c2-contenido-mysql` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-04

**Status**: Draft (clarify pendiente)

**Input**: Ítem **C2** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Contenido en MySQL». Fuente técnica: ADR 0006 (propuesta) §5.1, D10 a D15, la parte de contenido de §7 con su protocolo de arranque, y la fila C2 de §10 ([ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)).

## Intención y alcance

**Lo que entendemos.** El currículo deja de viajar dentro del paquete del front y pasa a vivir en la base, para que lo que viene después (cuentas, ejecuciones, progreso y estadísticas) lo referencie con claves que no cambian, y para que ninguna vista note la diferencia. Es para quien opera el taller y para el front que lee el contenido. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Cada porción que sirve la API es idéntica a lo que hoy publica `build/curriculum.json`.
2. Un segundo import no escribe nada, y uno que falla no deja rastro.
3. Nada de lo importado se borra: lo que desaparece de Git se retira.
4. Un alumno que ya tiene el contenido no lo vuelve a bajar.

**Entra:** el import del contenido a la base (incremental, sin borrados), los 17 recursos de sólo lectura con validador por porción, el retiro de contenido sin romper referencias, las claves estables de las etapas de taller, los metadatos que entrega el generador, y un despliegue que no se cuelga esperando bloqueos.

**Queda fuera:** cuentas, sesión y `GET /api/session` (C3); ejecuciones, `test_key` inmutable y plantilla del harness (B2); progreso y sincronización (D1); la compuerta de arranque y la lectura desde el front (A2 y A3); Esenciales (E1); TLS y CSP (C4); estadísticas (C5).

**Sin hacer a propósito (YAGNI):** búsqueda de texto; un panel para editar contenido (la autoría sigue en Git); endpoints de escritura de contenido; versionado público de la API; paginación del contenido; guardar el documento entero en la base; borrado automático del contenido retirado.

**Actores:** quien opera el taller (despliega y corre el import), el cliente del front (A3 y las vistas legacy, que leen el contenido), quien mantiene el currículo (edita `content/` en Git) y los equipos de B2 y D1, que referencian este contenido.

## Lo que pidió el usuario

Lo que sigue ya está decidido; lo que no figura acá es un supuesto y está en Assumptions o en las preguntas abiertas.

| Pedido | Fuente |
| --- | --- |
| El contenido sale del HTML y vive en la base, para consultarlo y cruzarlo con el progreso | ADR 0004, Contexto (aceptado el 2026-10-04) |
| El navegador lee el contenido desde la API (el usuario lo eligió frente a archivos estáticos) | ADR 0004, Contexto y «Alternativas consideradas» |
| La autoría sigue en Git; no hay panel | ADR 0004, Contexto |
| Lo importado nunca se borra, y los IDs son inmutables | ADR 0004 §2 |
| El contenido exige sesión | ADR 0004 §1 (líneas 60-61); la pregunta 10 del ADR 0006 pregunta si puede ser público |
| El contenido se sirve por recurso, con ETag, armado desde las tablas | ADR 0006 R7 |
| Columnas, tablas hijas y texto JSON en LONGTEXT, con prueba de contrato sensible al orden de claves | ADR 0006 R8 |
| La API la consume sólo este front, del mismo origen y sin versionado público | ADR 0006 R6 |
| Un usuario hoy y miles mañana, con infraestructura mínima | ADR 0006 R1 |
| Esenciales llega como catálogo nuevo, primero de una cadena (en E1) | ADR 0006 R10 |
| Quedan fuera de esta spec C3, B2, D1, A2 y A3, y E1 | Pedido de esta tarea |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Importar el contenido vigente a la base (Priority: P1)

Quien opera el taller corre el import, o lo corre el despliegue, y el contenido que está en Git, ya validado y generado por `tools/content`, queda cargado en la base: completo, consultable y sin riesgo de dejarla a medias.

**Why this priority**: sin contenido en la base no hay qué servir ni a qué apunten el progreso, los intentos y las estadísticas (B2, D1 y C5 referencian estas filas).

**Independent Test**: con la base vacía, correr el import y comparar lo cargado con el documento generado; correrlo otra vez y comprobar que no escribe nada.

**Acceptance Scenarios**:

1. **Dado** una base sin contenido y el documento vigente con su meta, **cuando** se corre el import, **entonces** quedan cargados los idiomas, los catálogos, los temas, los ejercicios (con sus pruebas, pistas y versión de corrección), los talleres (con sus objetivos, etapas y ejercicios relacionados), los mundos, los conceptos del Atlas y la guía completa, y el import informa cuántos registros escribió por tipo.
2. **Dado** el contenido ya importado, **cuando** se corre otra vez con el mismo documento, **entonces** no se modifica ninguna tabla de contenido, no se agrega ningún registro de import y el comando termina con éxito.
3. **Dado** un documento que cambia el texto de un ejercicio, **cuando** se importa, **entonces** sólo se escriben las filas de ese ejercicio y el informe lo lista como cambio de texto; si cambia su corrección, lo lista como cambio de corrección y agrega la versión de corrección nueva.
4. **Dado** la opción de simulación (`--dry-run`), **cuando** se corre sobre un documento con cambios, **entonces** informa los ejercicios nuevos, los cambios de corrección, los cambios de texto, los retirados y los reactivados, y no escribe nada.
5. **Dado** un documento inválido (una referencia a un ejercicio que no existe, un meta que no corresponde al documento, o una porción que no coincide con su parte del documento al auto-chequear), **cuando** se importa, **entonces** el import falla antes de confirmar nada, la base queda como estaba y el mensaje nombra el problema.
6. **Dado** un import en curso, **cuando** se lanza otro, **entonces** el segundo no corre y lo informa.

*Cubre: FR-001 a FR-012, FR-039 y FR-041; SC-002, SC-003 y SC-005.*

---

### User Story 2 - Servir cada porción del contenido, idéntica al documento (Priority: P1)

El cliente del front lee el currículo por porciones y recibe exactamente lo que hoy recibe del paquete, de modo que ninguna vista note el cambio.

**Why this priority**: es el criterio de aceptación del épico para el contenido (idéntico al oráculo) y lo único que consume A3.

**Independent Test**: pedir las 17 porciones y todos los ejercicios, y compararlos con `build/curriculum.json`.

**Acceptance Scenarios**:

1. **Dado** el contenido importado, **cuando** el cliente pide cada una de las 17 porciones, **entonces** recibe 200 con la parte correspondiente de `curriculum.json`, sin envoltura, idéntica en valores, tipos y orden de claves.
2. **Dado** el contenido importado, **cuando** se pide cada ejercicio por su ID, **entonces** recibe el mismo objeto que figura en su porción.
3. **Dado** un pedido de ejercicios al que le falta el parámetro que exige su catálogo, al que le sobra el otro, o con un catálogo desconocido, **cuando** se envía, **entonces** responde 422 `validation_failed`.
4. **Dado** un ID de ejercicio que no existe, **cuando** se pide, **entonces** responde 404 `not_found`.
5. **Dado** que todavía no hubo ningún import, **cuando** se pide cualquier porción, **entonces** responde 503 `content_not_imported` con `Retry-After`.
6. **Dado** un cliente sin sesión, mientras C3 no exista (Q1, opción A), **cuando** pide una porción, **entonces** la recibe.

*Cubre: FR-013 a FR-016, FR-022, FR-024, FR-025, FR-038 y FR-040; SC-001.*

---

### User Story 3 - Entrega condicional y arranque consistente (Priority: P2)

Un alumno que ya tiene el contenido en el navegador no lo vuelve a bajar; si cambió, baja sólo lo que cambió; y si ocurre un import en medio de su arranque, el cliente lo detecta.

**Why this priority**: sin esto cada arranque costaría el currículo completo (unos 1,36 MB por alumno, según el ADR) y las vistas legacy podrían mezclar porciones de dos versiones.

**Independent Test**: pedir las 17 porciones con sus validadores, importar un cambio y repetir los pedidos.

**Acceptance Scenarios**:

1. **Dado** una respuesta con `ETag` y `Content-Version`, **cuando** el cliente repite el pedido con `If-None-Match` igual (también si llega débil, `W/"…"`, como lo deja Nginx al comprimir), **entonces** recibe 304 sin cuerpo, con `ETag` y `Content-Version`, y el servidor no consulta las tablas de contenido: sólo lee el registro del último import.
2. **Dado** un import que cambió un ejercicio de `lab` en Rust, **cuando** el cliente repite los 17 pedidos con sus validadores anteriores, **entonces** sólo esa porción responde 200 y las otras 16, 304 (con el mismo build de la API).
3. **Dado** que el contenido cambió entre dos pedidos de un mismo arranque, **cuando** el cliente compara las respuestas, **entonces** `Content-Version` difiere entre las anteriores y las posteriores, y el cliente puede detectar el import y repetir el arranque.
4. **Dado** el primer pedido de una porción después de un import, **cuando** se responde, **entonces** el cuerpo sale ya preparado: no se arma al vuelo.
5. **Dado** cualquier respuesta de contenido, **cuando** se inspeccionan sus cabeceras, **entonces** lleva `Cache-Control: private, no-cache` y no lleva `Vary: Cookie`.
6. **Dado** una versión de build distinta de la API con el mismo contenido, **cuando** el cliente repite los pedidos con sus validadores anteriores, **entonces** recibe 200 en las 17 porciones: el cambio del serializador invalida lo cacheado.
7. **Dado** el contenido importado, **cuando** C3 necesite publicar la versión y los catálogos, **entonces** puede leer `contentVersion` y los catálogos activos con su posición en la cadena a partir del último import.

*Cubre: FR-017 a FR-021, FR-023, FR-026 y FR-040; SC-003 y SC-004.*

---

### User Story 4 - Retirar contenido sin romper el progreso (Priority: P2)

Cuando quien mantiene el currículo quita o reemplaza contenido en Git, el import lo retira en lugar de borrarlo: el progreso y la evidencia que ya apuntan a ese contenido siguen apuntando a algo que existe, y quien lo pide ve un aviso claro.

**Why this priority**: B2 y D1 van a guardar referencias a ejercicios y pruebas; si un import pudiera borrarlos, se perdería progreso de alumnos.

**Independent Test**: importar un documento sin un ejercicio, comprobar que la fila sigue y que su pedido da 410; volver a incluirlo y comprobar que se reactiva.

**Acceptance Scenarios**:

1. **Dado** un ejercicio que ya no está en el documento, **cuando** se importa, **entonces** sigue en la base marcado como retirado, con su fecha de retiro, y desaparece de las porciones.
2. **Dado** un ejercicio retirado, **cuando** se pide por su ID, **entonces** responde 410 `content_retired` con `{message, code, id, title, retiredAt}`, y `retiredAt` en ISO 8601 UTC con `Z`.
3. **Dado** un ejercicio retirado que vuelve al documento con el mismo ID, **cuando** se importa, **entonces** se reactiva y vuelve a figurar en su porción.
4. **Dado** un documento donde reaparece, en un ejercicio, una prueba cuyo `test_key` se había retirado, **cuando** se importa, **entonces** el import lo rechaza y no escribe nada.
5. **Dado** un ejercicio cuya corrección cambió y volvió a un valor anterior (A, B, A), **cuando** se importa cada versión, **entonces** la base conserva todas las versiones que rigieron alguna vez, con el import que trajo cada una.
6. **Dado** cualquier import, **cuando** termina, **entonces** no borró ninguna fila ni tocó tablas de usuarios.

*Cubre: FR-003, FR-006, FR-010, FR-015, FR-027 y FR-039; SC-008.*

---

### User Story 5 - Claves estables y metadatos del generador (Priority: P2)

Quien mantiene el currículo y los equipos de B2 y D1 necesitan que lo que el progreso va a referenciar tenga una clave que no cambie, y que el generador entregue junto al documento lo que el import necesita.

**Why this priority**: el progreso v1 marca las etapas de taller por posición y puede llegar meses después; sin claves estables, agregar o reordenar una etapa corrompería lo importado. El import tampoco puede arrancar sin su meta.

**Independent Test**: correr el generador y comprobar que escribe el meta, que `curriculum.json` y el oráculo no cambiaron y que cada etapa tiene clave.

**Acceptance Scenarios**:

1. **Dado** el contenido vigente, **cuando** se corre el generador, **entonces** escribe `build/curriculum.meta.json` junto a `build/curriculum.json`, con la huella del documento, el commit de origen (nulo si no se pasa), las tres huellas de cada ejercicio, las etapas de taller con su clave y su índice v1, y los catálogos; y el import guarda esas huellas tal cual, sin recalcularlas.
2. **Dado** el codemod de etapas aplicado, **cuando** se genera el documento, **entonces** `curriculum.json` y el volcado del oráculo son idénticos a los de antes, y las 100 etapas tienen clave estable e índice v1.
3. **Dado** un documento que cambia o repite el índice v1 de una etapa existente, **cuando** se importa, **entonces** el import lo rechaza.
4. **Dado** un documento y un meta que no corresponden entre sí (se regeneró uno sin el otro), **cuando** se importa, **entonces** el import lo rechaza con un mensaje que pide regenerar.
5. **Dado** el contenido vigente, **cuando** se importa, **entonces** `lab`, `quests` y `cores` quedan activos y sin posición en la cadena de catálogos.

*Cubre: FR-006, FR-028 a FR-032 y FR-039; SC-006 y SC-009.*

---

### User Story 6 - Despliegues que no se cuelgan (Priority: P3)

Quien opera el taller necesita que aplicar migraciones e importar contenido nunca congele el tráfico esperando un bloqueo detrás de una transacción larga, y que un contenido inválido no llegue a producción.

**Why this priority**: hoy no hay tablas de usuarios con tráfico, así que el riesgo es chico; crece con C3 y B2, y el mecanismo tiene que estar antes que ellos. No bloquea al primer alumno.

**Independent Test**: abrir una transacción en paralelo y correr una migración; correr el despliegue con un import inválido.

**Acceptance Scenarios**:

1. **Dado** una transacción abierta en paralelo que retiene un bloqueo que la migración necesita, **cuando** corre la migración, **entonces** cada intento falla en 5 segundos o menos con un mensaje claro, en vez de esperar sin límite; el servicio reintenta con espera creciente y, si no lo consigue, aborta.
2. **Dado** transacciones abiertas hace más de 30 segundos, **cuando** arranca el despliegue, **entonces** se aborta antes de migrar, con un mensaje claro.
3. **Dado** el servicio de migraciones, **cuando** terminan las migraciones, **entonces** corre el import; y si el import falla, el servicio web no arranca.
4. **Dado** una imagen construida sin commit de origen, **cuando** se importa, **entonces** el registro del import guarda el commit como nulo y el import lo avisa.

*Cubre: FR-033 a FR-037 y FR-042; SC-007.*

---

### Edge Cases

- **Documento y meta de builds distintos:** se regeneró uno sin el otro. El import lo rechaza pidiendo regenerar y no escribe.
- **El despliegue repite el import en cada arranque:** con el mismo documento no escribe contenido, no suma un registro y sale con éxito.
- **Volver a un documento anterior (A, B, A):** es válido. El import retira lo que sólo estaba en B y reactiva lo que sólo estaba en A; la huella del documento no es única.
- **Retirar un ejercicio que un mundo, el Atlas o un taller todavía referencia:** el import lo rechaza nombrando la referencia y no escribe. El generador no valida esas referencias (las cubren los checks de `qa/`), así que el import no puede darlas por buenas.
- **Fidelidad de los valores:** un objeto vacío no pasa a ser un arreglo vacío; una clave ausente (por ejemplo, las fuentes adicionales de un concepto del Atlas, que faltan en 2 de 32) no pasa a `null`; los booleanos siguen siendo booleanos; el Unicode y los saltos de línea se conservan; los 7 órdenes de claves de ejercicio y los 4 de taller que distingue el oráculo se respetan.
- **IDs con otra capitalización:** los IDs se comparan byte a byte. `RUST-01` no es `rust-01` y responde 404.
- **Un pedido llega durante un import:** ve una sola versión de su porción, nunca una mezcla. Que entre dos pedidos hubo un import lo detecta el cliente por `Content-Version`.
- **Caché de cuerpos vacía o precalentamiento que falló:** el pedido arma el cuerpo en una lectura consistente y responde igual.
- **Compresión:** Nginx debilita el `ETag` al comprimir; el 304 tiene que seguir funcionando con `W/"…"`.
- **Commit de origen mal formado:** si no es un hash completo (40 o 64 hexadecimales), se rechaza.

## Requirements *(mandatory)*

### Functional Requirements

**Import**

- **FR-001**: El sistema DEBE ofrecer un comando de import que cargue en la base el contenido vigente, a partir del documento `curriculum.json` y de su `curriculum.meta.json`, de modo que cada tipo de registro (ver Key Entities) quede representado con sus referencias. *(§5.1, §10, D12)*
- **FR-002**: El import DEBE ser incremental e idempotente: calcula la diferencia con la base antes de abrir la transacción y escribe sólo lo nuevo, lo cambiado y lo reactivado. Si nada cambió, no escribe contenido ni registra un import nuevo, y termina con éxito. *(D12)*
- **FR-003**: El import DEBE retirar lo que ya no está en el documento en lugar de borrarlo: lo marca como retirado, con la fecha de retiro, y lo saca de las porciones publicadas. No DEBE borrar ni vaciar tablas, ni tocar tablas de usuarios. *(D12, D15)*
- **FR-004**: El import DEBE correr en una sola transacción: si falla cualquier paso, incluido el auto-chequeo de FR-005, no queda nada a medias. *(D12)*
- **FR-005**: Antes de confirmar, el import DEBE armar las 17 porciones con el mismo serializador que usa la API y exigir que coincidan con su parte del documento, según la definición de idéntico de FR-014. Si alguna difiere, aborta sin escribir. *(D10)*
- **FR-006**: El import DEBE validar la forma y las referencias del documento y de su meta, y rechazar nombrando el problema: un par documento y meta que no corresponde; una referencia a un registro inexistente; una cadena de catálogos no única o no contigua; un mundo sin exactamente un jefe, que además debe ser el último de sus desafíos; un índice v1 de etapa cambiado o repetido; un `test_key` retirado que reaparece en su ejercicio; y un commit de origen que no es un hash completo. *(D12, D14, §5.1)*
- **FR-007**: La simulación (`--dry-run`) DEBE informar los ejercicios nuevos, los cambios de corrección, los cambios de texto, los retirados y los reactivados, sin escribir nada. El informe de cada import real se guarda con su registro. *(D12, §5.1)*
- **FR-008**: Sólo DEBE correr un import a la vez; el segundo no corre y lo informa. *(D12)*
- **FR-009**: Cada import que cambia algo DEBE dejar un registro con la huella del documento, el commit de origen (si lo hay), la huella de cada porción, los conteos de filas activas y el informe de cambios; no guarda el documento. La huella del documento no DEBE ser única, porque volver a un documento anterior es válido. *(§5.1)*
- **FR-010**: Por cada ejercicio, el import DEBE agregar a su conjunto de versiones de corrección el `grading_hash` nuevo, sin borrar las anteriores y registrando el import que lo trajo. El conjunto sólo crece. *(D29, §5.1)*
- **FR-011**: La versión de corrección de un ejercicio (`grading_hash`) DEBE seguir la definición del generador: el id y la expresión de cada prueba, más las opciones y la respuesta de la predicción. [NEEDS CLARIFICATION: Q4, ¿se suman los `imports` del ejercicio y la versión de la plantilla del harness? Cambiar la definición con progreso ya guardado marca todos los ejercicios resueltos como «cambió, volvé a verificarlo».] *(ADR 0004 §2, §13.12)*
- **FR-012**: Al terminar, el import DEBE precalentar la caché de cuerpos del build, también cuando no cambió nada. *(D11, D12)*

**Entrega**

- **FR-013**: La API DEBE publicar el contenido en 17 recursos de sólo lectura, uno por porción y sin envoltura `data`: los ejercicios de `lab` y de `quests` por lenguaje (4), los de `cores` por dominio (4), los mundos por lenguaje (2), los talleres por dominio (4), el Atlas por lenguaje (2) y la guía (1). La tabla de las 17 porciones está en Key Entities. *(D11, §7)*
- **FR-014**: Cada porción DEBE ser idéntica a su parte de `curriculum.json`: al decodificarla, mismos valores, mismos tipos, mismas claves y el mismo orden de claves en todos los niveles. La serialización exacta (espacios, escapes) la fija el plan y es determinista, porque de ella salen los validadores. *(D10, §8)*
- **FR-015**: `GET /api/exercises/{id}` DEBE devolver el ejercicio idéntico al de su porción; 404 `not_found` si no existe y 410 `content_retired` con `{message, code, id, title, retiredAt}` si está retirado. Los IDs se comparan byte a byte. *(D15, §7)*
- **FR-016**: Los recursos que se cortan por parámetro DEBEN exigir el que les corresponde (`language` o `domain`; en los ejercicios, el que fija su catálogo); si falta, si sobra el otro o si el valor o el catálogo es desconocido, responden 422 `validation_failed`. *(§5.1, §7)*
- **FR-017**: Toda respuesta con contenido, también un 304, DEBE llevar `ETag` (el validador de la porción; el de un ejercicio, su `content_hash`) y `Content-Version`. *(D11)*
- **FR-018**: Con un `If-None-Match` que coincide, también débil, DEBE responder 304 sin cuerpo y sin consultar las tablas de contenido: sólo lee el registro del último import. *(D11)*
- **FR-019**: Con un validador distinto, el cuerpo DEBE salir de la caché de cuerpos precalentada por el import; si falta, se arma en una lectura consistente, y el validador y `Content-Version` salen de la misma fila de import que los datos. *(D11)*
- **FR-020**: Un import entre dos pedidos DEBE poder detectarse: `Content-Version` cambia cuando cambia el documento. *(D11, §7)*
- **FR-021**: Los recursos de contenido DEBEN responder `Cache-Control: private, no-cache`, sin `Vary: Cookie` y sin límite de tasa de la aplicación. *(D11, §3.1)*
- **FR-022**: Sin ningún import, los recursos DEBEN responder 503 `content_not_imported` con `Retry-After`. *(D11)*
- **FR-023**: La versión del build de la API DEBE formar parte de los validadores, de modo que un cambio del serializador invalide lo cacheado aunque el contenido no cambie. *(D11; ver Q3)*
- **FR-024**: Los errores DEBEN tener el cuerpo `{message, code}` de §8, con el mensaje en español, y los instantes que publica la API (`retiredAt`) DEBEN ir en ISO 8601 UTC con `Z`. *(§8, D04)*
- **FR-025**: Hasta que C3 los proteja, los recursos de contenido DEBEN responder sin sesión. [NEEDS CLARIFICATION: Q1, ¿el contenido exige sesión desde C2, desde C3 o es público? El ADR exige sesión (S8), pero C3 llega después.] *(S8, §7)*
- **FR-026**: El contenido y los catálogos activos, con su posición en la cadena, DEBEN quedar disponibles para que C3 publique `GET /api/session`; ese endpoint no es de C2. [NEEDS CLARIFICATION: Q2, el ADR define `GET /api/session` pero no lo asigna a C2 ni a C3.] *(D13, §7)*

**Retiro, claves estables y generador**

- **FR-027**: Un ejercicio retirado que vuelve al documento con el mismo ID DEBE reactivarse. Una prueba retirada no se reactiva (FR-006). *(D12, D14)*
- **FR-028**: El generador DEBE escribir `build/curriculum.meta.json` junto a `build/curriculum.json`, con la huella del documento, el commit de origen (nulo si no se pasa), las tres huellas de cada ejercicio (contenido, corrección e inicio), las etapas de taller con su clave y su índice v1, y los catálogos con su posición en la cadena. *(§10)*
- **FR-029**: Cada etapa de taller vigente (100 hoy) DEBE tener una clave estable `e1..eN`, asignada por un codemod en el orden actual, que no cambia nunca; el índice v1 de cada etapa queda congelado. *(D14)*
- **FR-030**: C2 no DEBE cambiar `curriculum.json` ni el volcado del oráculo `dump-globals`: las claves de etapa no se publican hasta D1. *(D14)*
- **FR-031**: Las tres huellas de cada ejercicio DEBEN calcularse sólo en el generador; el import las guarda y no las recalcula. *(ADR 0004 §2, «Hashes»)*
- **FR-032**: Los catálogos de C2 (`lab`, `quests` y `cores`) DEBEN quedar sin posición en la cadena; Esenciales llega con E1. [Predeterminado del ADR; ver Q8.] *(D13, S1)*

**Despliegue**

- **FR-033**: El servicio de migraciones DEBE correr el import después de las migraciones. *(§7)*
- **FR-034**: Si el import falla, el servicio web NO DEBE arrancar. [Predeterminado: es lo que pasa hoy con las migraciones; ver Q5.] *(§13.11)*
- **FR-035**: Cada intento de migración o de import DEBE fallar en 5 segundos o menos, con un mensaje claro, cuando no consigue un bloqueo; el servicio reintenta con espera creciente y, si no lo consigue, aborta. *(D35)*
- **FR-036**: Antes de migrar, el despliegue DEBE abortar con un mensaje claro si hay transacciones abiertas hace más de 30 segundos. *(D35)*
- **FR-037**: La versión del build (`APP_BUILD`) y el commit de origen del contenido (`CONTENT_SOURCE_COMMIT`) DEBEN llegar a la aplicación como argumentos de construcción de la imagen; si falta el commit, queda nulo y el import lo avisa. [Predeterminado; ver Q6.] *(D11, §10, §13.11)*

**Verificación** (pruebas que el cambio DEBE traer, antes de la implementación, según la constitución II)

- **FR-038**: Una prueba de contrato DEBE comparar cada una de las 17 porciones y cada ejercicio con su parte del documento, sensible al orden de claves. *(D10, §8)*
- **FR-039**: Las pruebas del import DEBEN cubrir: idempotencia; retiro sin borrado; reactivación; rechazo de un `test_key` reutilizado, de un índice v1 cambiado o repetido y de un par documento y meta inconsistente; `--dry-run` sin escrituras; y atomicidad ante un auto-chequeo fallido. *(D12, D14)*
- **FR-040**: Las pruebas de HTTP DEBEN cubrir: 200; 304 con validador fuerte y débil, también detrás de la compresión de Nginx; `Content-Version` en 200 y 304; 404, 410, 422 y 503. *(D11, D15)*
- **FR-041**: Una prueba de esquema DEBE verificar las reglas de tabla que el ADR fija para el contenido (restricciones nombradas, sólo la clave primaria como índice único, colaciones y referencias que impiden borrar). *(§5.1, §8)*
- **FR-042**: Una prueba de migración DEBE comprobar que, con una transacción abierta en paralelo, una migración falla en 5 segundos o menos en lugar de colgarse. *(§8, D35)*
- **FR-043**: Las pruebas de la API DEBEN correr con Pest contra MySQL 9.7 real (`npm run api:test`), y los checks TypeScript de `npm test` DEBEN seguir en verde. *(constitución II, `api/AGENTS.md`)*

### Key Entities *(include if feature involves data)*

Cantidades según el ADR 0006 §5.1 al 2026-10-04. Las pruebas comparan contra el documento, no contra estos números.

| Entidad | Qué representa | Cantidad |
| --- | --- | --- |
| Idioma | Rust y Go; fija el orden de los mapas por lenguaje | 2 |
| Catálogo | `lab`, `quests` y `cores`; dice por qué parámetro se corta (`language` o `domain`) y su posición en la cadena, hoy ninguna | 3 |
| Import | Un registro por import que cambió algo: huellas del documento y de cada porción, commit de origen, conteos e informe | uno por import |
| Tema | Agrupa ejercicios por lenguaje | 98 |
| Ejercicio | Un ejercicio, con sus textos, código inicial y solución, y tres huellas (contenido, corrección e inicio) | 274 |
| Prueba y pista | Las pruebas de cada ejercicio (clave `test_key` estable) y sus pistas | 822 y 822 |
| Versión de corrección | Cada `grading_hash` que rigió para un ejercicio, con el import que lo trajo; sólo crece | 274 al inicio |
| Taller | Una ficha de Sistemas, con sus objetivos, etapas (clave estable e índice v1) y ejercicios relacionados | 25; 75, 100 y 118 |
| Mundo | Un mundo de campaña, con sus ejercicios y su rol (entrenamiento, desafío o jefe) | 8; 48 |
| Concepto del Atlas | Un concepto, con su ejercicio de laboratorio | 32 |
| Guía | Recursos, fuentes, recorridos, módulos, pasos y los recursos de cada paso | 15, 9, 2, 8, 24 y 56 |
| Porción | La unidad de entrega: una parte del documento, servida por su recurso | 17 |
| Validador | El `ETag` de una porción y el `Content-Version` del documento | uno por porción |

Las entidades de contenido (todas menos el import y las versiones de corrección) tienen un ciclo de vida: activas o retiradas, con la fecha de retiro.

**Las 17 porciones** (`GET /api/exercises/{id}` entrega un ejercicio suelto, que forma parte de una de ellas):

| Recurso | Parámetro | Porción de `curriculum.json` | Porciones |
| --- | --- | --- | --- |
| `GET /api/exercises`, catálogo `lab` | `language`: `rust` o `go` | `lab.<language>` | 2 |
| `GET /api/exercises`, catálogo `quests` | `language` | `quests.<language>` | 2 |
| `GET /api/exercises`, catálogo `cores` | `domain`: `lowlevel`, `infra`, `play` o `pc` | `cores.<domain>` | 4 |
| `GET /api/worlds` | `language` | `campaign.<language>` | 2 |
| `GET /api/workshops` | `domain` | `workshops.<domain>` | 4 |
| `GET /api/atlas` | `language` | `atlas.<language>` | 2 |
| `GET /api/guide` | — | `guide` | 1 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 17 porciones y todos los ejercicios del contenido vigente (274 hoy) son idénticos a su parte del documento: 0 diferencias de valor, de tipo y de orden de claves.
- **SC-002**: Un segundo import del mismo documento termina con éxito sin modificar ninguna tabla de contenido ni agregar registros de import: 0 escrituras de contenido (sólo precalienta la caché de cuerpos).
- **SC-003**: Un import que cambia un solo ejercicio escribe sólo las filas de ese ejercicio y cambia sólo el validador de la porción que lo contiene, con el mismo build de la API.
- **SC-004**: Con el validador vigente, las 17 porciones responden 304 sin cuerpo y sin volver a armar el contenido: cada 304 consulta sólo cuál fue el último import.
- **SC-005**: Un import que falla (documento inválido, referencia rota o auto-chequeo) deja la base idéntica a como estaba: 0 filas cambiadas.
- **SC-006**: Antes y después de C2, `build/curriculum.json` y el volcado del oráculo `dump-globals` son idénticos (el mismo sha256).
- **SC-007**: Con una transacción abierta en paralelo, una migración falla en 5 segundos o menos en lugar de esperar sin límite.
- **SC-008**: Después de retirar un ejercicio, sus filas siguen en la base con su fecha de retiro y su pedido responde 410; ningún import borra filas.
- **SC-009**: Las 100 etapas de taller tienen una clave estable y su índice v1 coincide con el de hoy.
- **SC-010**: Las pruebas del cambio pasan (Pest contra MySQL real y los checks TypeScript) y `npm run lint`, `npm run format:check` y `git diff --check` quedan en verde.

## Assumptions

- La fuente técnica es el ADR 0006, en estado «propuesta». Los valores que esta spec toma de él como predeterminados valen hasta que clarify los cambie.
- A1 y C1 están entregados: `content/`, el generador `tools/content/` y el oráculo `dump-globals` (línea base `cd1f9e62…`, commit `f924109`); la base Laravel, MySQL 9.7, el servicio `migrate` y Pest contra MySQL real (commit `0f4bad8`). El puerto del taller se publica sólo en `127.0.0.1`.
- Un solo servidor. La carga de referencia es la del ADR (S2: hasta unas 5.000 cuentas y unas 1.000 activas en el pico); confirmarla es la pregunta 15 del ADR y no bloquea C2.
- El import corre en el despliegue o por consola, nunca desde la aplicación.
- C2 no tiene interfaz: no hay requisitos de accesibilidad ni de diseño móvil. Los mensajes de error y los avisos del import están en español.
- Hasta C3 no hay cuentas ni sesión (Q1).
- Los recursos de mundos, talleres y Atlas exigen su parámetro con el mismo 422 que los de ejercicios; el ADR lo fija sólo para los ejercicios.
- Reactivar un ejercicio retirado con el mismo ID está permitido (D12); reutilizar el `test_key` de una prueba retirada, no (D14).
- Dependencias: A1 y C1 (entregados). C2 habilita a B2 (claves de prueba y de ejercicio, versiones de corrección), D1 (referencias del progreso, claves de etapa y versión del contenido), A3 (lectura por porción), C3 (qué proteger y qué publicar) y E1 (una fila de catálogo).
- Fuera de C2 y asignado a otro ítem: que el generador deje de exigir `t{índice+1}` en las pruebas (precondición de B2); la plantilla del harness como recurso (B2); y el reenvío DNS de los contenedores sin egreso (estacionado de C1, el ADR lo ubica en C3).

## Alternativas consideradas

Sólo las que cambian lo que se construye. Salvo donde dice «usuario», la decisión es la propuesta del ADR.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se entrega el contenido | Un documento único (`GET /api/content`, el plan anterior); 17 recursos con validador por porción; archivos estáticos servidos por Nginx, con la base como índice (la opción que recomendó el ADR 0004) | 17 recursos (usuario, R7). Con un documento único, cualquier import invalida todo, unos 1,36 MB por alumno, aunque cambie un ejercicio. Los archivos estáticos son la alternativa que el usuario no eligió: el navegador lee de la API |
| Cómo se guarda cada registro | Un payload JSON por registro; columnas JSON nativas de MySQL (reordenan las claves); columnas para lo simple, tablas hijas para lo que el progreso referencia y texto JSON para lo anidado, con el orden de claves guardado | Columnas, tablas hijas y texto JSON (usuario, R8). El oráculo es sensible al orden de claves y el progreso referencia pruebas y pistas |
| Cómo se importa | Volcar todas las filas en cada despliegue; calcular la diferencia fuera de la transacción y escribir sólo lo cambiado | Incremental. Acorta los bloqueos exclusivos que chocan con las escrituras de progreso (D12) |
| Qué pasa con lo que desaparece | Borrarlo; retirarlo con una marca y una fecha | Retirarlo (ADR 0004, aceptado). El progreso y la evidencia ya registrados lo referencian |
| Validador de cada porción | `ETag` calculado sobre el cuerpo en cada pedido; un `ETag` único por versión; `ETag` por porción con el hash que guarda el import | Por porción (D11). Lo primero obliga a armar el cuerpo en cada 304 y lo segundo invalida las 17 porciones por cualquier cambio. Ver Q3 |
| Dónde se calculan las huellas de ejercicio | En PHP al importar; sólo en el generador TypeScript | Sólo en el generador (ADR 0004): una sola implementación |
| Dónde va la espera acotada de bloqueos | En C2, primer subplan con migraciones nuevas; en C3, cuando aparecen las tablas de usuarios | En C2 (§10): el mecanismo es chico y tiene que existir antes de C3 |

## Notas para el plan

El plan decide el cómo con el arquitecto y el DBA. Lo que sigue es lo que el ADR ya fija y lo que hay que resolver antes de planificar.

**Tamaño.** C2 es el ítem más grande del épico hasta ahora. El plan debería ordenar las tareas por historia (US1 a US6), para poder entregar y revisar por incrementos.

**Lo que ya fija el ADR 0006** (el plan lo baja sin reabrirlo y esta spec no lo repite): el esquema de las 21 tablas (§5.1, D02 a D07, D09 y D35), la escritura del import (D08, D09 y D12), el códec por tipo de registro que comparten el import y la API (D10) y la entrega con su middleware y su caché de cuerpos (D11).

**Para el arquitecto:**

- `APP_BUILD` (Q3). Si el contenido viaja dentro de la imagen, cualquier cambio de contenido es un commit nuevo. Con `APP_BUILD` igual al commit, los 17 validadores cambian a la vez y `contentVersion` cambia en cada despliegue, lo que provocaría `stale_content` espurio en D1 (D23).
- La serialización exacta de las porciones (FR-014) y el costo de mantener dos caminos que deben coincidir: del documento a la porción (el import) y de las tablas a la porción (la API).
- Vida y limpieza de la caché de cuerpos: cada build y cada cambio dejan entradas viejas.
- Cómo llegan `curriculum.json` y su meta a la imagen de PHP. Antecedente: el borrador anterior de C2, sin versionar, usaba una etapa de construcción con Node y un contexto adicional de Docker.
- Con Nginx: las porciones grandes pasan por FastCGI con disco de sólo lectura (los buffers desbordan a un tmpfs de 32 MB) y Nginx debilita el `ETag` al comprimir (`nginx.conf:16-18`). Hay que probar las dos cosas a través de Nginx.

**Para el DBA:**

- El chequeo previo de FR-036 lee `information_schema.INNODB_TRX`, que exige el privilegio `PROCESS` ([manual de MySQL 9.7](https://dev.mysql.com/doc/refman/9.7/en/information-schema-innodb-trx-table.html)). El usuario `taller` sólo tiene privilegios sobre su base (`compose.yaml`). Hay que definir con qué usuario corre el chequeo.
- `lock_wait_timeout` e `innodb_lock_wait_timeout` en 5 segundos sólo en el entorno de `migrate`, y cómo conviven con los reintentos de la transacción del import (D35).
- Ampliar un ENUM de contenido puede caer en COPY (bug #121124); con cientos de filas dura milisegundos y la espera de bloqueos queda acotada. Relevante para E1, no para C2.

## Preguntas abiertas

Todavía no hay respuestas: se cierran en el paso clarify y pasan a la sección `Clarifications` de esta spec. Cada pregunta lleva el requisito que afecta, las opciones y una recomendación; donde el ADR tiene una propuesta, es la recomendación. Las preguntas 2 a 9 y 13 a 20 del ADR §13 son de C3, B2, D1, C5 o transversales y no bloquean C2; de la pregunta 1 sólo importa a C2 lo que se siembra (Q8).

### Bloquean el plan

#### Q1 · ¿El contenido exige sesión, y qué pasa con los recursos entre C2 y C3? *(FR-025; ADR §13.10 y una pregunta nueva)*

**Por qué importa:** el ADR exige sesión para el contenido (S8), pero C3, que trae las sesiones, llega después de C2. Lo que se decida cambia FR-025, el alcance de C3 y la posibilidad de una caché pública.

**Recomendación:** Opción A. El ADR mantiene la sesión (S8). Para el hueco hasta C3 sirve el camino del borrador anterior de C2 (sin versionar): el puerto del taller sólo escucha en `127.0.0.1` (`compose.yaml`), así que no queda expuesto, y C3 no hereda código descartable.

| Opción | Descripción |
| --- | --- |
| A | Exige sesión desde C3. Hasta entonces responde sin sesión, con el puerto sólo en `127.0.0.1`; la aceptación de C3 incluye «sin sesión, 401». |
| B | Exige sesión desde el primer día: se invierte el orden y C3 va antes que C2. |
| C | Exige sesión desde el primer día con una compuerta provisoria en C2 (por ejemplo, un token fijo en `.env`) que C3 reemplaza. |
| D | Es público de forma permanente, con caché pública en Nginx o un CDN. Contradice el ADR 0004 (líneas 60-61) y S8. |

#### Q2 · ¿Qué subplan entrega `GET /api/session`? *(FR-026; pregunta nueva)*

**Por qué importa:** el protocolo de arranque lo usa para leer `contentVersion` y los catálogos (D13, §7), pero ni la fila de C2 ni la de C3 de §10 lo nombran. Sin dueño, nadie lo entrega.

**Recomendación:** Opción A. La respuesta mezcla identidad y contenido, y necesita el middleware de sesión (deja la cookie `XSRF-TOKEN`), que es de C3. C2 sólo garantiza que la versión y los catálogos activos estén disponibles. El ADR no lo asigna: es propuesta propia.

| Opción | Descripción |
| --- | --- |
| A | C3 lo entrega; C2 deja disponibles `contentVersion` y los catálogos activos. |
| B | C2 entrega una versión anónima mínima (`user: null`, `contentVersion`, `appBuild`, `catalogs`) y C3 la extiende con el usuario, las funciones y la cookie. |

#### Q3 · ¿`APP_BUILD` es el commit de la imagen o una versión del serializador? *(FR-023; D11 y una observación nueva, también para el arquitecto)*

**Por qué importa:** `APP_BUILD` entra en el `ETag` y en `Content-Version`. Si el contenido viaja dentro de la imagen, cualquier cambio de contenido es un commit nuevo y cambia los 17 validadores a la vez, así que el beneficio que invoca D11 (invalidar sólo las porciones que cambiaron) no se da. Además, `contentVersion` cambiaría en cada despliegue.

**Recomendación:** Opción A es la propuesta del ADR (D11: «el commit»). Mi observación es que A anula el validador por porción y que B o C lo conservan, así que conviene que el arquitecto opine antes de que el usuario decida.

| Opción | Descripción |
| --- | --- |
| A | El commit de la imagen (D11 literal). Es simple, pero cada despliegue invalida todo y cada alumno vuelve a bajar el contenido completo (unos 1,36 MB) la próxima vez que abre el taller. |
| B | Una versión del serializador, que sólo sube cuando cambia el código que arma las porciones (por ejemplo, el hash de sus archivos). Invalida sólo lo que cambió, a cambio de una regla más y su prueba. |
| C | Sin build en el validador: sólo el hash del cuerpo de la porción, que ya cambia cuando el serializador cambia el cuerpo. |

#### Q4 · ¿Cómo se compone `grading_hash`? *(FR-011; ADR §13.12, primera parte)*

**Por qué importa:** si la definición cambia cuando ya hay progreso guardado, todos los ejercicios resueltos pasan a «cambió, volvé a verificarlo». Cambiarla antes del primer progreso real no cuesta nada.

**Recomendación:** Opción A. Es la definición del ADR 0004 y S3 deja la plantilla del harness para B2. Mientras B2 no haya guardado intentos y D1 no haya importado progreso, B2 puede ampliarla sin marcar nada. El ADR deja la pregunta abierta: es propuesta propia.

| Opción | Descripción |
| --- | --- |
| A | Queda como hoy: el id y la expresión de cada prueba, más las opciones y la respuesta de la predicción. La plantilla del harness se decide en B2, antes de que D1 importe progreso. |
| B | Suma los `imports` del ejercicio ya en C2. |
| C | Suma los `imports` y la versión de la plantilla del harness. Obliga a diseñar la plantilla antes de C2. |

#### Q5 · ¿Un import fallido impide que arranque el servicio web? *(FR-034; ADR §13.11, primera parte)*

**Por qué importa:** define si un contenido inválido o incompleto puede llegar a producción y qué pasa durante un despliegue fallido.

**Recomendación:** Opción A. Es lo que pasa hoy con las migraciones (el servicio web depende de que `migrate` termine bien) y el ADR lo toma como punto de partida: un despliegue con contenido roto no sale.

| Opción | Descripción |
| --- | --- |
| A | Sí: el servicio web espera a que `migrate` y el import terminen bien. |
| B | No: arranca con el último contenido importado y el fallo se avisa. Riesgo: código nuevo con contenido viejo. |

### Con una propuesta segura (se pueden confirmar en bloque)

#### Q6 · ¿La imagen de producción trae siempre el commit de origen del contenido? *(FR-037; ADR §13.11, segunda parte)*

**Por qué importa:** el registro del import guarda ese commit para saber qué produjo el contenido de la base. El contexto de Docker no trae `.git`, así que alguien tiene que pasarlo.

**Recomendación:** Opción A. El esquema admite el commit nulo (§5.1) y exigirlo rompería `docker compose up --build` en desarrollo. El ADR no propone una opción: es propuesta propia.

| Opción | Descripción |
| --- | --- |
| A | Opcional: si falta, queda nulo y el import lo avisa. |
| B | Obligatorio en toda imagen: la construcción falla sin él. |
| C | Obligatorio sólo en el despliegue público, con una variable propia (no `APP_ENV`: `compose.yaml` la fija en `production` también en la máquina local). |

#### Q7 · ¿Se aprueba el codemod de etapas `e1..eN`, con el índice v1 congelado? *(FR-029; ADR §13.12, cuarta parte)*

**Por qué importa:** el progreso v1 marca las etapas por posición y puede llegar meses después. El codemod toca las 25 fichas de `content/workshops/`.

**Recomendación:** Opción A (ADR D14).

| Opción | Descripción |
| --- | --- |
| A | Sí: `e1..eN` por el orden actual, índice v1 congelado y claves sin publicar hasta D1. |
| B | Claves descriptivas escritas a mano para cada una de las 100 etapas. |
| C | Se pospone a D1: C2 identifica las etapas por posición y D1 migra. |

#### Q8 · ¿`lab`, `quests` y `cores` quedan sin posición en la cadena hasta que E1 sume Esenciales? *(FR-032; ADR §13.1, la parte de C2)*

**Por qué importa:** la posición se publica en `GET /api/session` y el import exige una cadena única y contigua; la respuesta decide qué valores guarda C2. El resto de la pregunta 1 (si Esenciales va antes de Inicial o lo reemplaza, y qué código lleva) es de E1.

**Recomendación:** Opción A (ADR S1, lectura principal). La tercera lectura del ADR (catálogos futuros) también deja a los tres sin posición, igual que A.

| Opción | Descripción |
| --- | --- |
| A | Sin posición: abarcan varios niveles. E1 suma `essentials` con posición 1. |
| B | Cadena por catálogos (Esenciales, lab, quests, cores): C2 siembra las posiciones 1 a 3 y E1 las corre. |

#### Q9 · ¿Se suma un hash por pregunta (quiz, checkpoint, predicción de taller)? *(sin FR en C2; ADR §13.12, segunda parte)*

**Por qué importa:** D23 detecta respuestas dadas con contenido viejo comparando `contentVersion`, que cubre todo el documento. Un hash por pregunta sería más fino, pero C2 tendría que guardarlo.

**Recomendación:** Opción A (D23 usa `contentVersion`; D1 lo reevalúa).

| Opción | Descripción |
| --- | --- |
| A | No: alcanza con `contentVersion`. |
| B | Sí, desde C2: un hash por pregunta en el meta y en la base. |

#### Q10 · ¿Los hitos del recorrido (`app.js:29-68`) pasan a `content/`? *(sin FR en C2; ADR §13.12, tercera parte)*

**Por qué importa:** sumaría una porción (18) y tablas a C2. Hoy el progreso los guarda por clave de texto, sin clave foránea (S4).

**Recomendación:** Opción A (ADR S4).

| Opción | Descripción |
| --- | --- |
| A | No: siguen en el código. |
| B | Sí: pasan a `content/` y C2 suma su porción y sus tablas. |
