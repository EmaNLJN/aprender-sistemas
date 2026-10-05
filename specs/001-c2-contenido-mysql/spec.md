# Feature Specification: C2 · Contenido en MySQL

**Feature Branch**: `001-c2-contenido-mysql` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-04

**Status**: Clarificada (sesiones del 2026-10-04 y del 2026-10-05); lista para el plan

**Input**: Ítem **C2** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Contenido en MySQL». Fuente técnica: ADR 0006 (propuesta, enmendado el 2026-10-05) §5.1, D10 a D15, la parte de contenido de §7 con su protocolo de arranque, y la fila C2 de §10 ([ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)). Donde el ADR y las decisiones de la sección Clarifications difieren, mandan las decisiones.

## Intención y alcance

**Lo que entendemos.** El currículo deja de viajar dentro del paquete del front y pasa a vivir en la base, para que lo que viene después (cuentas, ejecuciones, progreso y estadísticas) lo referencie con claves que no cambian, y para que ninguna vista note la diferencia. Es para quien opera el taller y para el front que lee el contenido. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Cada porción que sirve la API es idéntica a su parte de `build/curriculum.json` en valores, tipos y orden de claves, y se sirve con los bytes exactos que fija el generador.
2. Un segundo import del mismo contenido no escribe nada, y uno que falla no deja rastro.
3. Nada de lo importado se borra: lo que desaparece de Git se retira.
4. Un alumno que ya tiene el contenido no lo vuelve a bajar, tampoco cuando se despliega una imagen nueva con el mismo contenido.

**Entra:** el import del contenido a la base (incremental, sin borrados), los 17 recursos de sólo lectura con validador por porción, el retiro de contenido sin romper referencias, las claves estables de las etapas de taller, los metadatos que entrega el generador (incluida la huella de cada porción), y un despliegue que no se cuelga esperando bloqueos.

**Queda fuera:** cuentas, sesión, `GET /api/session` y el `appBuild` opaco que el front pueda necesitar (C3); el chequeo de transacciones largas antes de migrar y los privilegios de la base (`db-grants`, C3); ejecuciones, `test_key` inmutable y plantilla del harness (B2); progreso y sincronización (D1); la compuerta de arranque y la lectura desde el front (A2 y A3); Esenciales (E1); TLS y CSP (C4); estadísticas (C5).

**Sin hacer a propósito (YAGNI):** búsqueda de texto; un panel para editar contenido (la autoría sigue en Git); endpoints de escritura de contenido; versionado público de la API; paginación del contenido; guardar el documento entero en la base; borrado automático del contenido retirado; limpieza programada de la caché de cuerpos vencida (C3); un hash por pregunta; los hitos del recorrido como contenido.

**Actores:** quien opera el taller (despliega y corre el import), el cliente del front (A3 y las vistas legacy, que leen el contenido), quien mantiene el currículo (edita `content/` en Git) y los equipos de B2 y D1, que referencian este contenido.

## Lo que pidió el usuario

Lo que sigue ya está decidido; lo que no figura acá es un supuesto y está en Assumptions o se resolvió en Clarifications.

| Pedido | Fuente |
| --- | --- |
| El contenido sale del HTML y vive en la base, para consultarlo y cruzarlo con el progreso | ADR 0004, Contexto (aceptado el 2026-10-04) |
| El navegador lee el contenido desde la API (el usuario lo eligió frente a archivos estáticos) | ADR 0004, Contexto y «Alternativas consideradas» |
| La autoría sigue en Git; no hay panel | ADR 0004, Contexto |
| Lo importado nunca se borra, y los IDs son inmutables | ADR 0004 §2 |
| El contenido exige sesión desde C3; hasta entonces responde sin sesión, con el puerto sólo en `127.0.0.1` | ADR 0004 §1 (líneas 60-61); Clarifications, Q1 |
| El contenido se sirve por recurso, con ETag, armado desde las tablas | ADR 0006 R7 |
| Columnas, tablas hijas y texto JSON en LONGTEXT, con prueba de contrato sensible al orden de claves | ADR 0006 R8 |
| La respuesta son los bytes exactos que fija el generador: un códec por tipo de registro, y ningún `JsonResource` los vuelve a codificar | ADR 0006 R8; Clarifications, R8 |
| El validador es sólo el hash del contenido servido; el build de la imagen no interviene | Clarifications, Q3 |
| La API la consume sólo este front, del mismo origen y sin versionado público | ADR 0006 R6 |
| Un usuario hoy y miles mañana, con infraestructura mínima | ADR 0006 R1 |
| Esenciales llega como catálogo nuevo, primero de una cadena (en E1) | ADR 0006 R10 |
| Quedan fuera de esta spec C3, B2, D1, A2 y A3, y E1 | Pedido de esta tarea |

## Clarifications

### Session 2026-10-04

- Q: **Q1**, ¿el contenido exige sesión, y qué pasa con los recursos entre C2 y C3? → A: Exige sesión desde C3. Hasta entonces responde sin sesión, con el puerto del taller sólo en `127.0.0.1`; la aceptación de C3 incluye «sin sesión, 401». (FR-025)
- Q: **Q2**, ¿qué subplan entrega `GET /api/session`? → A: C3. C2 deja disponibles `contentVersion` y los catálogos activos con su posición. (FR-026)
- Q: **Q3**, ¿`APP_BUILD` es el commit de la imagen o una versión del serializador? → A: Ninguno de los dos: el validador lleva sólo el hash del contenido servido. `APP_BUILD` no entra en ningún validador ni en la clave de la caché de cuerpos, y C3 lo suma como `appBuild` opaco si lo necesita. Se aprobaron las cinco reglas del arquitecto: (1) el import se auto-chequea en cada corrida, aunque no haya cambios, y eso reemplaza a `APP_BUILD`; (2) se registra un import si cambian las tablas, la huella del documento o la de alguna porción, y un commit de origen distinto no cuenta; (3) un cuerpo armado desde las tablas se verifica contra el hash del último import antes de servirlo o guardarlo, y si no coincide responde 503 `maintenance`; (4) una imagen nueva con el mismo contenido deja las 17 porciones en 304 y `Content-Version` igual; (5) una prueba de despliegue comprueba que, si `migrate` falla, `php` no se recrea. (FR-002, FR-005, FR-009, FR-023, FR-037, FR-044, FR-046)
- Q: **Q4**, ¿cómo se compone `grading_hash`? → A: Como hoy: el id y la expresión de cada prueba, más las opciones y la respuesta de la predicción. La plantilla del harness y los `imports` los decide B2 antes de que D1 importe progreso. (FR-011)
- Q: **Q5**, ¿un import fallido impide que arranque el servicio web? → A: Sí: el despliegue con contenido roto no sale. (FR-034)
- Q: **Q6**, ¿la imagen trae siempre el commit de origen del contenido? → A: Opcional: si falta, queda nulo y el import lo avisa; un valor mal formado hace fallar la construcción. (FR-037)
- Q: **Q7**, ¿se aprueba el codemod de etapas `e1..eN` con el índice v1 congelado? → A: Sí, y las claves no se publican hasta D1. (FR-029)
- Q: **Q8**, ¿`lab`, `quests` y `cores` quedan sin posición en la cadena hasta que E1 sume Esenciales? → A: Sí; E1 suma `essentials` con posición 1. (FR-032)
- Q: **Q9**, ¿se suma un hash por pregunta? → A: No: alcanza con `contentVersion` (D23); D1 lo reevalúa.
- Q: **Q10**, ¿los hitos del recorrido (`app.js:29-68`) pasan a `content/`? → A: No: siguen en el código (S4).
- Q: **R8**, ¿quién fija los bytes de cada porción? → A: El generador. Hay un códec por tipo de registro; su lado de lectura puede llamarse `*Resource`, pero la respuesta es el texto exacto, sin volver a codificarlo con `JsonResource`. (FR-005, FR-014, FR-031)

### Session 2026-10-05

- Q: ¿Cómo se evita que corran dos imports a la vez? → A: Con un candado de la base de datos por nombre de base (`GET_LOCK`), en lugar del `Isolatable` de D12: un `Isolatable` ocupado sale con éxito y su candado dura una hora. Si está ocupado, el import sale con código distinto de cero, y antes de abrir la transacción verifica que el candado sigue siendo suyo. (FR-008)
- Q: ¿Dónde va el chequeo de transacciones largas de D35? → A: En C3, junto con `db-grants`: necesita un privilegio que el usuario de la aplicación no tiene y, mientras no haya tablas de usuarios con tráfico, no protege nada. Se mueven FR-036 y el segundo escenario de US6. (FR-036)
- Q: ¿Cómo se combinan los reintentos con la espera acotada? → A: La transacción del import intenta una sola vez; hay un único reintento externo, alrededor del paso de migraciones: 3 intentos con pausas de 5 y de 15 segundos, sólo ante un bloqueo. Se desvía del `attempts: 3` de §8, y FR-035 queda «cada intento, 5 segundos o menos».
- Q: ¿Los idiomas tienen ciclo de vida? → A: No. Es una corrección de redacción de esta spec; no se agregan columnas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Importar el contenido vigente a la base (Priority: P1)

Quien opera el taller corre el import, o lo corre el despliegue, y el contenido que está en Git, ya validado y generado por `tools/content`, queda cargado en la base: completo, consultable y sin riesgo de dejarla a medias.

**Why this priority**: sin contenido en la base no hay qué servir ni a qué apunten el progreso, los intentos y las estadísticas (B2, D1 y C5 referencian estas filas).

**Independent Test**: con la base vacía, correr el import y comparar lo cargado con el documento generado; correrlo otra vez y comprobar que no escribe nada.

**Acceptance Scenarios**:

1. **Dado** una base sin contenido y el documento vigente con su meta, **cuando** se corre el import, **entonces** quedan cargados los idiomas, los catálogos, los temas, los ejercicios (con sus pruebas, pistas y versión de corrección), los talleres (con sus objetivos, etapas y ejercicios relacionados), los mundos, los conceptos del Atlas y la guía completa, y el import informa cuántos registros escribió por tipo.
2. **Dado** el contenido ya importado, **cuando** se corre otra vez con el mismo documento y las mismas huellas de porción (aunque cambie el commit de origen), **entonces** no se modifica ninguna tabla de contenido, no se agrega ningún registro de import y el comando termina con éxito.
3. **Dado** un documento que cambia el texto de un ejercicio, **cuando** se importa, **entonces** sólo se escriben las filas de ese ejercicio, además del registro del import, y el informe lo lista como cambio de texto; si cambia su corrección, lo lista como cambio de corrección y agrega la versión de corrección nueva.
4. **Dado** la opción de simulación (`--dry-run`), **cuando** se corre sobre un documento con cambios, **entonces** informa los ejercicios nuevos, los cambios de corrección, los cambios de texto, los retirados y los reactivados, y no escribe nada.
5. **Dado** un documento inválido (una referencia a un ejercicio que no existe, un meta que no corresponde al documento, o una porción armada desde las tablas cuyo hash no es el del meta), **cuando** se importa, **entonces** el import falla antes de confirmar nada, la base queda como estaba y el mensaje nombra el problema; en el último caso, la porción y la primera ruta JSON que difiere.
6. **Dado** un import en curso, **cuando** se lanza otro, **entonces** el segundo no corre, lo informa y sale con error.
7. **Dado** un cambio deliberado del formato de las porciones, hecho a la vez en el generador y en el código que las arma, sobre el mismo contenido, **cuando** se importa, **entonces** el auto-chequeo pasa, no se escribe ninguna tabla de contenido, se registra un import nuevo (cambiaron las huellas de porción) y cambian los validadores.

*Cubre: FR-001 a FR-012, FR-039, FR-041 y FR-048; SC-002, SC-003 y SC-005.*

---

### User Story 2 - Servir cada porción del contenido, idéntica al documento (Priority: P1)

El cliente del front lee el currículo por porciones y recibe exactamente lo que hoy recibe del paquete, de modo que ninguna vista note el cambio.

**Why this priority**: es el criterio de aceptación del épico para el contenido (idéntico al oráculo) y lo único que consume A3.

**Independent Test**: pedir las 17 porciones y todos los ejercicios, y compararlos con `build/curriculum.json` y con las huellas de su meta.

**Acceptance Scenarios**:

1. **Dado** el contenido importado, **cuando** el cliente pide cada una de las 17 porciones, **entonces** recibe 200 con la parte correspondiente de `curriculum.json`, sin envoltura, idéntica en valores, tipos y orden de claves, y el sha256 del cuerpo es el de esa porción en el meta del generador.
2. **Dado** el contenido importado, **cuando** se pide cada ejercicio por su ID, **entonces** recibe el mismo objeto que figura en su porción, y el sha256 del cuerpo es su `contentHash` del meta.
3. **Dado** un pedido de ejercicios al que le falta el parámetro que exige su catálogo, al que le sobra el otro, o con un catálogo desconocido, **cuando** se envía, **entonces** responde 422 `validation_failed`.
4. **Dado** un ID de ejercicio que no existe o que no tiene la forma de un ID, **cuando** se pide, **entonces** responde 404 `not_found`, y el segundo caso sin consultar la base.
5. **Dado** que todavía no hubo ningún import, **cuando** se pide cualquier porción, **entonces** responde 503 `content_not_imported` con `Retry-After`.
6. **Dado** un cliente sin sesión, mientras C3 no exista (Clarifications, Q1), **cuando** pide una porción, **entonces** la recibe.

*Cubre: FR-013 a FR-016, FR-022, FR-024, FR-025, FR-038 y FR-040; SC-001.*

---

### User Story 3 - Entrega condicional y arranque consistente (Priority: P2)

Un alumno que ya tiene el contenido en el navegador no lo vuelve a bajar; si cambió, baja sólo lo que cambió; y si ocurre un import en medio de su arranque, el cliente lo detecta.

**Why this priority**: sin esto cada arranque costaría el currículo completo (unos 1,07 MB por alumno, la suma de las 17 porciones) y las vistas legacy podrían mezclar porciones de dos versiones.

**Independent Test**: pedir las 17 porciones con sus validadores, importar un cambio y repetir los pedidos.

**Acceptance Scenarios**:

1. **Dado** una respuesta con `ETag` y `Content-Version`, **cuando** el cliente repite el pedido con `If-None-Match` igual (también si llega débil, `W/"…"`, como lo deja Nginx al comprimir), **entonces** recibe 304 sin cuerpo, con `ETag` y `Content-Version`, y el servidor no arma el contenido: sólo consulta cuál fue el último import.
2. **Dado** un import que cambió un ejercicio de `lab` en Rust, **cuando** el cliente repite los 17 pedidos con sus validadores anteriores, **entonces** sólo esa porción responde 200 y las otras 16, 304.
3. **Dado** que el contenido cambió entre dos pedidos de un mismo arranque, **cuando** el cliente compara las respuestas, **entonces** `Content-Version` difiere entre las anteriores y las posteriores, y el cliente puede detectar el import y repetir el arranque.
4. **Dado** el primer pedido de una porción después de un import, **cuando** se responde, **entonces** el cuerpo sale ya preparado, sin consultar tablas de contenido: no se arma al vuelo.
5. **Dado** cualquier respuesta de contenido, **cuando** se inspeccionan sus cabeceras, **entonces** lleva `Cache-Control: private, no-cache` y no lleva `Vary: Cookie`.
6. **Dado** una imagen nueva de la API con el mismo contenido (Clarifications, Q3), **cuando** el cliente repite los pedidos con sus validadores anteriores, **entonces** las 17 porciones responden 304 y `Content-Version` no cambia.
7. **Dado** el contenido importado, **cuando** C3 necesite publicar la versión y los catálogos, **entonces** puede leer `contentVersion` y los catálogos activos con su posición en la cadena a partir del último import.
8. **Dado** un cuerpo armado desde las tablas cuyo sha256 no es el del último import (por ejemplo, un `php` anterior que sigue atendiendo después de que un import nuevo confirmó), **cuando** se pide, **entonces** no se sirve ni se guarda: la API responde 503 `maintenance` con `Retry-After` y deja el motivo en el registro.

*Cubre: FR-017 a FR-021, FR-023, FR-026, FR-040, FR-044 y FR-047; SC-003, SC-004 y SC-011.*

---

### User Story 4 - Retirar contenido sin romper el progreso (Priority: P2)

Cuando quien mantiene el currículo quita o reemplaza contenido en Git, el import lo retira en lugar de borrarlo: el progreso y la evidencia que ya apuntan a ese contenido siguen apuntando a algo que existe, y quien lo pide ve un aviso claro.

**Why this priority**: B2 y D1 van a guardar referencias a ejercicios y pruebas; si un import pudiera borrarlos, se perdería progreso de alumnos.

**Independent Test**: importar un documento sin un ejercicio, comprobar que la fila sigue y que su pedido da 410; volver a incluirlo y comprobar que se reactiva.

**Acceptance Scenarios**:

1. **Dado** un ejercicio que ya no está en el documento, **cuando** se importa, **entonces** sigue en la base marcado como retirado, con su fecha de retiro, y desaparece de las porciones.
2. **Dado** un ejercicio retirado, **cuando** se pide por su ID, **entonces** responde 410 `content_retired` con `{message, code, id, title, retiredAt}`, y `retiredAt` en ISO 8601 UTC con `Z`; también si el pedido trae un `If-None-Match` que antes coincidía.
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

1. **Dado** el contenido vigente, **cuando** se corre el generador, **entonces** escribe `build/curriculum.meta.json` junto a `build/curriculum.json`, con la huella del documento, el commit de origen (nulo si no se pasa), la huella de cada una de las 17 porciones, las tres huellas de cada ejercicio, las etapas de taller con su clave y su índice v1, y los catálogos; y el import guarda esas huellas tal cual, sin recalcularlas.
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

1. **Dado** una transacción abierta en paralelo que retiene un bloqueo que la migración necesita, **cuando** corre la migración, **entonces** cada intento falla en 5 segundos o menos con un mensaje claro, en vez de esperar sin límite; el servicio reintenta hasta 3 veces con espera creciente y, si no lo consigue, aborta.
2. *(Movido a C3 con `db-grants`, junto con FR-036.)* El chequeo previo de transacciones abiertas hace más de 30 segundos no forma parte de C2.
3. **Dado** el servicio de migraciones, **cuando** terminan las migraciones, **entonces** corre el import; y si el import (o las migraciones) falla, el servicio web no arranca ni se recrea, y el que ya atendía sigue sirviendo.
4. **Dado** una imagen construida sin commit de origen, **cuando** se importa, **entonces** el registro del import guarda el commit como nulo y el import lo avisa.
5. **Dado** el árbol del repositorio, **cuando** se construye la imagen de la API con `docker compose up --build`, **entonces** la imagen trae `curriculum.json` y su meta, con la misma huella que el generador del host para ese árbol.

*Cubre: FR-033 a FR-037, FR-042, FR-045 y FR-046; SC-007.*

---

### Edge Cases

- **Documento y meta de generaciones distintas:** se regeneró uno sin el otro. El import lo rechaza pidiendo regenerar y no escribe.
- **El despliegue repite el import en cada arranque:** con el mismo documento y las mismas huellas no escribe contenido, no suma un registro y sale con éxito.
- **Mismo contenido, otro commit de origen:** no cuenta como cambio y no registra un import.
- **Volver a un documento anterior (A, B, A):** es válido. El import retira lo que sólo estaba en B y reactiva lo que sólo estaba en A; la huella del documento no es única.
- **Retirar un ejercicio que un mundo, el Atlas o un taller todavía referencia:** el import lo rechaza nombrando la referencia y no escribe. El generador no valida esas referencias (las cubren los checks de `qa/`), así que el import no puede darlas por buenas.
- **Fidelidad de los valores:** un objeto vacío no pasa a ser un arreglo vacío; una clave ausente (por ejemplo, las fuentes adicionales de un concepto del Atlas, que faltan en 2 de 32) no pasa a `null`; los booleanos siguen siendo booleanos; el Unicode y los saltos de línea se conservan; los 7 órdenes de claves de ejercicio y los 4 de taller que distingue el oráculo se respetan.
- **IDs con otra capitalización:** los IDs se comparan byte a byte. `RUST-01` no es `rust-01` y responde 404.
- **Un pedido llega durante un import:** ve una sola versión de su porción, nunca una mezcla. Que entre dos pedidos hubo un import lo detecta el cliente por `Content-Version`.
- **Caché de cuerpos vacía o precalentamiento que falló:** el pedido arma el cuerpo en una lectura consistente, lo verifica contra el último import y responde igual.
- **Imagen nueva con el mismo contenido:** los validadores y `Content-Version` no cambian y todo responde 304.
- **Ventana de despliegue:** entre el COMMIT de un import nuevo y el reemplazo de `php`, el servicio anterior puede responder 503 `maintenance` con `Retry-After`; es deliberado (FR-044) y breve.
- **Compresión:** Nginx debilita el `ETag` al comprimir; el 304 tiene que seguir funcionando con `W/"…"`.
- **Commit de origen mal formado:** si no es un hash completo (40 o 64 hexadecimales), se rechaza.

## Requirements *(mandatory)*

### Functional Requirements

**Import**

- **FR-001**: El sistema DEBE ofrecer un comando de import que cargue en la base el contenido vigente, a partir del documento `curriculum.json` y de su `curriculum.meta.json`, de modo que cada tipo de registro (ver Key Entities) quede representado con sus referencias. *(§5.1, §10, D12)*
- **FR-002**: El import DEBE ser incremental e idempotente: calcula la diferencia con la base antes de abrir la transacción, fila por fila y con el orden de claves incluido (las huellas sólo clasifican el informe), y escribe sólo lo nuevo, lo cambiado y lo reactivado. Si nada cambió (ni las tablas, ni la huella del documento, ni la de ninguna porción), no escribe contenido ni registra un import nuevo, y termina con éxito; un commit de origen distinto no cuenta como cambio. *(D12; Clarifications, Q3)*
- **FR-003**: El import DEBE retirar lo que ya no está en el documento en lugar de borrarlo: lo marca como retirado, con la fecha de retiro, y lo saca de las porciones publicadas. No DEBE borrar ni vaciar tablas, ni tocar tablas de usuarios. *(D12, D15)*
- **FR-004**: El import DEBE correr en una sola transacción: si falla cualquier paso, incluido el auto-chequeo de FR-005, no queda nada a medias. *(D12)*
- **FR-005**: En cada corrida, también cuando no hay cambios, y antes de confirmar, el import DEBE armar las 17 porciones desde las tablas con el mismo código que usa la API y exigir que el sha256 de cada una sea el que trae el meta. Si alguna difiere, aborta sin escribir y el mensaje nombra la porción y la primera ruta JSON distinta. Este auto-chequeo es la defensa ante un cambio de código que altere un byte, y reemplaza a `APP_BUILD` en los validadores. *(D10; Clarifications, Q3 y R8)*
- **FR-006**: El import DEBE validar la forma y las referencias del documento y de su meta, y rechazar nombrando el problema: un par documento y meta que no corresponde; una referencia a un registro inexistente; una cadena de catálogos no única o no contigua; un mundo sin exactamente un jefe, que además debe ser el último de sus desafíos; un índice v1 de etapa cambiado o repetido; un `test_key` retirado que reaparece en su ejercicio; un hijo activo bajo un padre retirado o una posición activa repetida; y un commit de origen que no es un hash completo. *(D12, D14, §5.1)*
- **FR-007**: La simulación (`--dry-run`) DEBE informar los ejercicios nuevos, los cambios de corrección, los cambios de texto, los retirados y los reactivados, sin escribir nada. El informe de cada import real se guarda con su registro. *(D12, §5.1)*
- **FR-008**: Sólo DEBE correr un import a la vez: el segundo no corre, lo informa y sale con error, y la exclusión se libera sola si el proceso muere. *(D12; Clarifications, sesión 2026-10-05)*
- **FR-009**: Cada import que cambia algo (alguna tabla, la huella del documento o la de alguna porción) DEBE dejar un registro con la huella del documento, el commit de origen (si lo hay), la huella de cada porción, los conteos de filas activas y el informe de cambios; no guarda el documento. La huella del documento no DEBE ser única, porque volver a un documento anterior es válido. *(§5.1; Clarifications, Q3)*
- **FR-010**: Por cada ejercicio, el import DEBE agregar a su conjunto de versiones de corrección el `grading_hash` nuevo, sin borrar las anteriores y registrando el import que lo trajo. El conjunto sólo crece. *(D29, §5.1)*
- **FR-011**: La versión de corrección de un ejercicio (`grading_hash`) DEBE seguir la definición del generador: el id y la expresión de cada prueba, más las opciones y la respuesta de la predicción. Los `imports` y la plantilla del harness quedan fuera: los decide B2 antes de que D1 importe progreso, porque cambiar la definición con progreso guardado marcaría todos los ejercicios resueltos como «cambió, volvé a verificarlo». *(ADR 0004 §2, §13.12; Clarifications, Q4)*
- **FR-012**: Después de confirmar, el import DEBE dejar en la caché de cuerpos los 17 cuerpos que armó para el auto-chequeo, también cuando no cambió nada, y quitar los de las huellas que reemplazó. *(D11, D12)*

**Entrega**

- **FR-013**: La API DEBE publicar el contenido en 17 recursos de sólo lectura, uno por porción y sin envoltura `data`: los ejercicios de `lab` y de `quests` por lenguaje (4), los de `cores` por dominio (4), los mundos por lenguaje (2), los talleres por dominio (4), el Atlas por lenguaje (2) y la guía (1). La tabla de las 17 porciones está en Key Entities. *(D11, §7)*
- **FR-014**: Cada porción DEBE servirse con los bytes exactos que fija el generador: el JSON compacto de su parte de `curriculum.json` (`JSON.stringify` sin espacios, con el Unicode y la barra sin escapar y el orden de claves publicado en todos los niveles). La huella de la porción, el sha256 de esos bytes (`portions` del meta), define su validador, y la API la sirve sin volver a codificarla con otro serializador. Al decodificarla, mismos valores, tipos, claves y orden de claves. *(D10, §8; Clarifications, R8)*
- **FR-015**: `GET /api/exercises/{id}` DEBE devolver el ejercicio idéntico al de su porción, con los bytes de su `contentHash`; 404 `not_found` si no existe o si el ID no tiene la forma de un ID (sin consultar la base), y 410 `content_retired` con `{message, code, id, title, retiredAt}` si está retirado. Los IDs se comparan byte a byte. *(D15, §7)*
- **FR-016**: Los recursos que se cortan por parámetro DEBEN exigir el que les corresponde (`language` o `domain`; en los ejercicios, el que fija su catálogo); si falta, si sobra el otro o si el valor o el catálogo es desconocido, responden 422 `validation_failed`. *(§5.1, §7)*
- **FR-017**: Toda respuesta con contenido, también un 304, DEBE llevar `ETag` (los primeros 32 hexadecimales de la huella de la porción, entre comillas; el de un ejercicio, los de su `content_hash`) y `Content-Version` (los primeros 32 de la huella del documento). *(D11)*
- **FR-018**: Con un `If-None-Match` que coincide, también débil, DEBE responder 304 sin cuerpo y sin armar el contenido: sólo consulta cuál fue el último import. El 304 de un ejercicio suma una lectura de su fila por clave primaria, porque su estado se evalúa antes que el validador: retirado, responde 410 aunque el validador coincida. *(D11, D15)*
- **FR-019**: Con un validador distinto, el cuerpo DEBE salir de la caché de cuerpos que dejó el import; si falta, se arma en una lectura consistente (una sola foto de la base que empieza leyendo el último import), y el validador y `Content-Version` salen de esa misma fila de import que los datos. *(D11)*
- **FR-020**: Un import entre dos pedidos DEBE poder detectarse: `Content-Version` cambia cuando cambia el documento. *(D11, §7)*
- **FR-021**: Los recursos de contenido DEBEN responder `Cache-Control: private, no-cache`, sin `Vary: Cookie` y sin límite de tasa de la aplicación. *(D11, §3.1)*
- **FR-022**: Sin ningún import, los recursos DEBEN responder 503 `content_not_imported` con `Retry-After`. *(D11)*
- **FR-023**: El validador DEBE ser el hash de los bytes servidos: la huella de la porción o la del ejercicio. Ni `APP_BUILD` ni ningún otro dato de la imagen entra en un validador ni en la clave de la caché de cuerpos, así que una imagen nueva con el mismo contenido deja los mismos validadores y el mismo `Content-Version`. *(D11; Clarifications, Q3)*
- **FR-024**: Los errores DEBEN tener el cuerpo `{message, code}` de §8, con el mensaje en español, y los instantes que publica la API (`retiredAt`) DEBEN ir en ISO 8601 UTC con `Z`. *(§8, D04)*
- **FR-025**: Hasta que C3 los proteja, los recursos de contenido DEBEN responder sin sesión, y el puerto del taller sólo escucha en `127.0.0.1`. Desde C3 exigen sesión, y la aceptación de C3 incluye «sin sesión, 401». *(S8, §7; Clarifications, Q1)*
- **FR-026**: El último import DEBE dejar disponibles `contentVersion` y los catálogos activos con su posición en la cadena, para que C3 publique `GET /api/session`; ese endpoint es de C3. *(D13, §7; Clarifications, Q2)*

**Retiro, claves estables y generador**

- **FR-027**: Un ejercicio retirado que vuelve al documento con el mismo ID DEBE reactivarse. Una prueba retirada no se reactiva (FR-006). *(D12, D14)*
- **FR-028**: El generador DEBE escribir `build/curriculum.meta.json` junto a `build/curriculum.json`, con la huella del documento, el commit de origen (nulo si no se pasa), la huella de cada una de las 17 porciones (`portions`), las tres huellas de cada ejercicio (contenido, corrección e inicio), las etapas de taller con su clave y su índice v1, y los catálogos con su posición en la cadena. *(§10; Clarifications, Q3)*
- **FR-029**: Cada etapa de taller vigente (100 hoy) DEBE tener una clave estable `e1..eN`, asignada por un codemod en el orden actual, que no cambia nunca; el índice v1 de cada etapa queda congelado. *(D14; Clarifications, Q7)*
- **FR-030**: C2 no DEBE cambiar `curriculum.json` ni el volcado del oráculo `dump-globals`: las claves de etapa no se publican hasta D1. *(D14)*
- **FR-031**: Las huellas del meta (la del documento, las 17 de porción y las tres de cada ejercicio) DEBEN calcularse sólo en el generador, sobre los bytes publicados; el import las guarda y no las recalcula, y las usa como oráculo independiente de lo que arma. `content_hash` es el sha256 de los bytes publicados del ejercicio, no de una forma canónica. *(ADR 0004 §2, «Hashes»; Clarifications, R8)*
- **FR-032**: Los catálogos de C2 (`lab`, `quests` y `cores`) DEBEN quedar sin posición en la cadena; Esenciales llega con E1. *(D13, S1; Clarifications, Q8)*

**Despliegue**

- **FR-033**: El servicio de migraciones DEBE correr el import después de las migraciones. *(§7)*
- **FR-034**: Si las migraciones o el import fallan, el servicio web NO DEBE arrancar ni recrearse: el que ya atendía sigue sirviendo el último contenido. *(§13.11; Clarifications, Q5)*
- **FR-035**: Cada intento de migración o de import DEBE fallar en 5 segundos o menos, con un mensaje claro, cuando no consigue un bloqueo; el servicio de migraciones reintenta hasta 3 veces con espera creciente, sólo ante un bloqueo, y si no lo consigue, aborta. Esa espera acotada vale sólo para el servicio de migraciones, no para la API. *(D35; Clarifications, sesión 2026-10-05)*
- **FR-036** *(movido a C3)*: El chequeo previo de transacciones abiertas hace más de 30 segundos pasa a C3, junto con `db-grants` y su prueba de privilegios con un usuario restringido: necesita un privilegio de la base que el usuario de la aplicación no tiene y, mientras no haya tablas de usuarios con tráfico, no protege nada. *(D35; Clarifications, sesión 2026-10-05)*
- **FR-037**: El commit de origen del contenido (`CONTENT_SOURCE_COMMIT`) DEBE llegar al generador como argumento de construcción de la imagen; si falta, queda nulo y el import lo avisa, y un valor mal formado hace fallar la construcción. `APP_BUILD` queda fuera de C2: C3 lo suma como `appBuild` opaco si lo necesita. *(§10, §13.11; Clarifications, Q3 y Q6)*

**Verificación** (pruebas que el cambio DEBE traer, antes de la implementación, según la constitución II)

- **FR-038**: Una prueba de contrato DEBE comparar el sha256 del cuerpo de cada una de las 17 porciones y de cada ejercicio con su huella del meta del generador (`portions` y `contentHash`), y su contenido con su parte del documento, sensible al orden de claves. *(D10, §8)*
- **FR-039**: Las pruebas del import DEBEN cubrir: idempotencia; retiro sin borrado; reactivación; rechazo de un `test_key` reutilizado, de un índice v1 cambiado o repetido y de un par documento y meta inconsistente; `--dry-run` sin escrituras; atomicidad ante un auto-chequeo fallido (con un códec roto o un hash adulterado, la base queda igual); un cambio de código que altera bytes con el mismo documento hace fallar el import; un formato nuevo con el mismo contenido registra un import sin escribir tablas; y que la caché de cuerpos queda con los 17 cuerpos y sin las claves reemplazadas. *(D12, D14)*
- **FR-040**: Las pruebas de HTTP DEBEN cubrir: 200; 304 con validador fuerte y débil; `Content-Version` en 200 y 304; 404, 410, 422 y 503 (`content_not_imported` y `maintenance`); y la caché de cuerpos vacía o adulterada. La compresión de Nginx se cubre en FR-047. *(D11, D15)*
- **FR-041**: Una prueba de esquema DEBE verificar las reglas de tabla que el ADR fija para el contenido (motor y colación, restricciones nombradas y su comportamiento, sólo la clave primaria como índice único, y referencias que impiden borrar), y una prueba de conexión, que la base trabaja en UTC y que los upserts usan alias de fila. *(§5.1, §8)*
- **FR-042**: Una prueba de migración DEBE comprobar que, con una transacción abierta en paralelo, una migración falla en 5 segundos o menos en lugar de colgarse, que el servicio de migraciones reintenta sólo ante un bloqueo, y que `migrate`, `rollback` y `migrate` dejan el mismo esquema. *(§8, D35)*
- **FR-043**: Las pruebas de la API DEBEN correr con Pest contra MySQL 9.7 real (`npm run api:test`), y los checks TypeScript de `npm test` DEBEN seguir en verde. *(constitución II, `api/AGENTS.md`)*
- **FR-044**: Antes de servir o guardar un cuerpo armado desde las tablas, la API DEBE verificar que su sha256 sea el del último import; si no coincide, no lo sirve: lo deja en el registro y responde 503 `maintenance` con `Retry-After`. *(D11; Clarifications, Q3)*
- **FR-045**: La imagen de la API DEBE traer `curriculum.json` y su meta generados en su construcción con el mismo generador que el front, de modo que `docker compose up --build` siga siendo un solo paso y sólo TypeScript lea el YAML. *(§10; ADR 0004 §2)*
- **FR-046**: Una prueba de despliegue DEBE comprobar que, si las migraciones o el import fallan, el servicio web no se recrea y el anterior sigue sirviendo. *(§13.11; Clarifications, Q3)*
- **FR-047**: Un check contra el stack levantado (`npm run api:content:check`, fuera de `npm test`, como `api:smoke`) DEBE comprobar, a través de Nginx: las 17 porciones con y sin compresión, con su `ETag`, su `Content-Version` y su `Cache-Control`; el 304 con el validador fuerte y con el débil; y que clientes lentos reciben las porciones más grandes completas, sin `No space left on device` en el registro de Nginx. *(D11, §8)*
- **FR-048**: Una prueba de esquema DEBE medir, contra la imagen de MySQL fijada, los cuatro casos de D07 (ampliar un ENUM al final; agregar una columna a una tabla con un CHECK sobre DATETIME; agregar una columna con CHECK; agregar una clave foránea a una tabla con filas) y dejar fijado el resultado, para que B2 sepa en qué tablas que crecen puede ir un CHECK sobre DATETIME. *(D07, §8)*

### Key Entities *(include if feature involves data)*

Cantidades según el ADR 0006 §5.1 al 2026-10-04. Las pruebas comparan contra el documento, no contra estos números.

| Entidad | Qué representa | Cantidad |
| --- | --- | --- |
| Idioma | Rust y Go; fija el orden de los mapas por lenguaje | 2 |
| Catálogo | `lab`, `quests` y `cores`; dice por qué parámetro se corta (`language` o `domain`) y su posición en la cadena, hoy ninguna | 3 |
| Import | Un registro por import que cambió algo (tablas, documento o porciones): huellas del documento y de cada porción, commit de origen, conteos e informe | uno por import |
| Tema | Agrupa ejercicios por lenguaje | 98 |
| Ejercicio | Un ejercicio, con sus textos, código inicial y solución, y tres huellas (contenido, corrección e inicio) | 274 |
| Prueba y pista | Las pruebas de cada ejercicio (clave `test_key` estable) y sus pistas | 822 y 822 |
| Versión de corrección | Cada `grading_hash` que rigió para un ejercicio, con el import que lo trajo; sólo crece | 274 al inicio |
| Taller | Una ficha de Sistemas, con sus objetivos, etapas (clave estable e índice v1) y ejercicios relacionados | 25; 75, 100 y 118 |
| Mundo | Un mundo de campaña, con sus ejercicios y su rol (entrenamiento, desafío o jefe) | 8; 48 |
| Concepto del Atlas | Un concepto, con su ejercicio de laboratorio | 32 |
| Guía | Recursos, fuentes, recorridos, módulos, pasos y los recursos de cada paso | 15, 9, 2, 8, 24 y 56 |
| Porción | La unidad de entrega: una parte del documento, servida por su recurso con los bytes que fija el generador | 17 |
| Validador | El `ETag` de una porción (los primeros 32 hexadecimales de su huella) y el `Content-Version` del documento (los primeros 32 de su huella) | uno por porción |

Las entidades de contenido tienen un ciclo de vida (activas o retiradas, con la fecha de retiro), salvo los idiomas, los registros de import y las versiones de corrección: los idiomas son dos valores fijos que fijan el orden de los mapas, y las versiones sólo crecen.

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

- **SC-001**: Las 17 porciones y todos los ejercicios del contenido vigente (274 hoy) son idénticos a su parte del documento: 0 diferencias de valor, de tipo y de orden de claves, y el sha256 de cada cuerpo servido es el del meta del generador.
- **SC-002**: Un segundo import del mismo documento, con las mismas huellas de porción, termina con éxito sin modificar ninguna tabla de contenido ni agregar registros de import: 0 escrituras de contenido (sólo renueva la caché de cuerpos).
- **SC-003**: Un import que cambia un solo ejercicio escribe sólo las filas de ese ejercicio, además del registro del import, y cambia sólo el validador de la porción que lo contiene.
- **SC-004**: Con el validador vigente, las 17 porciones responden 304 sin cuerpo y sin volver a armar el contenido: cada 304 consulta sólo cuál fue el último import.
- **SC-005**: Un import que falla (documento inválido, referencia rota o auto-chequeo) deja la base idéntica a como estaba: 0 filas cambiadas.
- **SC-006**: Antes y después de C2, `build/curriculum.json` y el volcado del oráculo `dump-globals` son idénticos (el mismo sha256).
- **SC-007**: Con una transacción abierta en paralelo, una migración falla en 5 segundos o menos en lugar de esperar sin límite.
- **SC-008**: Después de retirar un ejercicio, sus filas siguen en la base con su fecha de retiro y su pedido responde 410; ningún import borra filas.
- **SC-009**: Las 100 etapas de taller tienen una clave estable y su índice v1 coincide con el de hoy.
- **SC-010**: Las pruebas del cambio pasan (Pest contra MySQL real y los checks TypeScript) y `npm run lint`, `npm run format:check` y `git diff --check` quedan en verde.
- **SC-011**: Una imagen nueva de la API con el mismo contenido responde 304 en las 17 porciones y `Content-Version` no cambia: 0 validadores distintos.

## Assumptions

- La fuente técnica es el ADR 0006, en estado «propuesta». Las decisiones de Clarifications prevalecen donde difieren, y el ADR se enmendó en línea el 2026-10-05 para que coincida.
- A1 y C1 están entregados: `content/`, el generador `tools/content/` y el oráculo `dump-globals` (línea base `cd1f9e62…`, commit `f924109`); la base Laravel, MySQL 9.7, el servicio `migrate` y Pest contra MySQL real (commit `0f4bad8`). El puerto del taller se publica sólo en `127.0.0.1`.
- Un solo servidor. La carga de referencia es la del ADR (S2: hasta unas 5.000 cuentas y unas 1.000 activas en el pico); confirmarla es la pregunta 15 del ADR y no bloquea C2.
- El import corre en el despliegue o por consola, nunca desde la aplicación.
- C2 no tiene interfaz: no hay requisitos de accesibilidad ni de diseño móvil. Los mensajes de error y los avisos del import están en español.
- El contenido no usa números de punto flotante, `-0` ni caracteres sueltos de un par surrogate: con eso, el JSON compacto de TypeScript y el de PHP coinciden byte a byte. Si algún día aparece uno, el auto-chequeo lo detecta y bloquea el despliegue.
- Los recursos de mundos, talleres y Atlas exigen su parámetro con el mismo 422 que los de ejercicios; el ADR lo fija sólo para los ejercicios.
- Reactivar un ejercicio retirado con el mismo ID está permitido (D12); reutilizar el `test_key` de una prueba retirada, no (D14).
- Dependencias: A1 y C1 (entregados). C2 habilita a B2 (claves de prueba y de ejercicio, versiones de corrección), D1 (referencias del progreso, claves de etapa y versión del contenido), A3 (lectura por porción), C3 (qué proteger y qué publicar) y E1 (una fila de catálogo).
- Fuera de C2 y asignado a otro ítem: que el generador deje de exigir `t{índice+1}` en las pruebas (precondición de B2); la plantilla del harness como recurso (B2); el reenvío DNS de los contenedores sin egreso (estacionado de C1, el ADR lo ubica en C3); y, en C3, la sesión, `GET /api/session`, el chequeo de transacciones largas con `db-grants`, el `appBuild` opaco, que el middleware de sesión no agregue `Vary: Cookie` ni toque `Cache-Control` en el contenido, y la limpieza programada de la caché de cuerpos vencida.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Salvo donde dice «usuario», la decisión es la propuesta del ADR o del arquitecto y el DBA.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se entrega el contenido | Un documento único (`GET /api/content`, el plan anterior); 17 recursos con validador por porción; archivos estáticos servidos por Nginx, con la base como índice (la opción que recomendó el ADR 0004) | 17 recursos (usuario, R7). Con un documento único, cualquier import invalida todo, unos 1,07 MB por alumno, aunque cambie un ejercicio. Los archivos estáticos son la alternativa que el usuario no eligió: el navegador lee de la API |
| Cómo se guarda cada registro | Un payload JSON por registro; columnas JSON nativas de MySQL (reordenan las claves); columnas para lo simple, tablas hijas para lo que el progreso referencia y texto JSON para lo anidado, con el orden de claves guardado | Columnas, tablas hijas y texto JSON (usuario, R8). El oráculo es sensible al orden de claves y el progreso referencia pruebas y pistas |
| Quién fija los bytes de cada porción | PHP con su propio codificador, comparado contra el documento; el generador TypeScript, con la huella de cada porción en el meta | El generador (usuario, R8, bytes exactos). Quedan dos implementaciones independientes, una por lado, y un error del codificador compartido no pasa el chequeo en los dos lados |
| Cómo se importa | Volcar todas las filas en cada despliegue; calcular la diferencia fuera de la transacción y escribir sólo lo cambiado | Incremental. Acorta los bloqueos exclusivos que chocan con las escrituras de progreso (D12) |
| Qué pasa con lo que desaparece | Borrarlo; retirarlo con una marca y una fecha | Retirarlo (ADR 0004, aceptado). El progreso y la evidencia ya registrados lo referencian |
| Validador de cada porción | `ETag` calculado sobre el cuerpo en cada pedido; un `ETag` único por versión; `ETag` por porción con el commit de la imagen; con una versión del serializador; sólo con el hash de los bytes que fija el generador | Sólo el hash de los bytes (usuario, Q3). Lo primero obliga a armar el cuerpo en cada 304; lo segundo invalida las 17 por cualquier cambio; con el commit, cada despliegue invalida todo; la versión del serializador es redundante cuando el formato lo fija el generador, y el auto-chequeo del import cubre un cambio de código |
| Dónde se calculan las huellas de ejercicio | En PHP al importar; sólo en el generador TypeScript | Sólo en el generador (ADR 0004): una sola implementación |
| Cómo se evitan dos imports a la vez | `Isolatable` de Laravel (candado en la caché, de una hora); candado de la base por nombre de base | Candado de la base (DBA): un `Isolatable` ocupado sale con éxito, y su candado sobrevive a un proceso muerto una hora |
| Reintentos del import | `attempts: 3` en la transacción; una transacción de un intento y un único reintento externo sobre las migraciones | Un intento y un reintento externo (DBA): cada intento queda en 5 segundos o menos y no hay dos capas de reintentos que multiplicar |
| Dónde va el chequeo de transacciones largas | En C2, con un privilegio nuevo para el usuario de la aplicación; en C3, con `db-grants` | En C3 (DBA): en C2 no protege ninguna tabla de usuarios |
| Dónde va la espera acotada de bloqueos | En C2, primer subplan con migraciones nuevas; en C3, cuando aparecen las tablas de usuarios | En C2 (§10): el mecanismo es chico y tiene que existir antes de C3 |
