# Feature Specification: C6 · Registros tipados del contenido

**Feature Branch**: `002-c6-registros-tipados` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Clarificada (sesión del 2026-10-05); lista para el plan

**Input**: Ítem **C6** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Registros tipados del contenido». Extiende a [`specs/001-c2-contenido-mysql/`](../001-c2-contenido-mysql/spec.md), entregada e inmutable: cambia cómo el código de la API representa los registros del contenido, no lo que publica ni lo que guarda. Pedido del usuario del 2026-10-05 (ver «Lo que pidió el usuario»).

## Intención y alcance

**Lo que entendemos.** Hoy cada registro del contenido (un ejercicio, una prueba, un taller, un concepto del Atlas…) viaja por la API como un arreglo asociativo o como un objeto sin forma entre sus tres representaciones: el documento que genera `tools/content`, su fila en MySQL y la forma que se publica. Los códecs de C2 ya convierten entre las tres, pero sin tipos: una clave mal escrita o un valor del tipo equivocado pasa el análisis estático sin error, y con suerte lo descubre una prueba. Esta feature le da a cada registro una forma tipada e inmutable, con sus conversiones explícitas, para que esos errores aparezcan antes de correr el código, y sube el nivel del análisis estático para que no vuelvan. Es para quien mantiene la API. Para el front y para quien opera el taller no cambia nada, y ése es el criterio principal. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Las 17 porciones y cada ejercicio salen con los mismos bytes de hoy, y un despliegue sobre una base que importó el código de C2 no escribe ninguna fila ni cambia un validador.
2. El import acepta y rechaza los mismos documentos, con los mismos mensajes.
3. Si el código lee un dato con un nombre que el registro no tiene, o lo usa con otro tipo, el análisis estático lo detecta sin correr pruebas.
4. El análisis estático corre en el nivel 9, sin errores ni excepciones, y no se agrega ninguna dependencia.

**Entra:** una forma tipada para cada registro del contenido (los 12 con forma publicada, las 7 filas auxiliares y el meta del generador), construida desde el documento o desde la fila, que da su fila y su forma publicada. También las pruebas que fijan que nada cambió, incluido un oráculo de filas tomado del código de C2, y la subida del análisis estático al nivel 9, con la CI y la documentación que lo citan.

**Queda fuera:** el generador, `curriculum.json` y su meta, los bytes publicados, las tablas (no hay migraciones), el contrato HTTP y el comportamiento del import (resultado, informe y mensajes), que no cambian; y los registros de otros módulos de la API (cuentas en C3, ejecuciones en B2, progreso en D1), que adoptan el patrón en sus propias specs si les sirve.

**Sin hacer a propósito (YAGNI):** `spatie/laravel-data` u otra biblioteca de mapeo; modelos de Eloquent para el contenido (ADR 0006 D09 escribe con el query builder); registros que se serializan solos o recursos de Laravel (C2 FR-014); validaciones nuevas del contenido, como enumeraciones para valores que hoy son texto libre; formas tipadas para los valores JSON anidados; una meta de cobertura; `declare(strict_types=1)` (ver Assumptions).

**Actores:** quien mantiene la API (el usuario y los agentes que implementan), quien opera el taller (corre el despliegue y el import), el cliente del front (A3 y las vistas legacy, que no deben notar nada) y los equipos de C3, B2 y D1, que van a leer estos registros.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una decisión del clarify que tomó el coordinador (Clarifications).

| Pedido | Fuente |
| --- | --- |
| Los registros del contenido pasan de arreglos asociativos a objetos tipados con Data Mappers, en una spec aparte después de C2 | Usuario, 2026-10-05; [`docs/agent-skills.md`](../../docs/agent-skills.md), «PHP moderno: DTOs y value objects» |
| Objetos `readonly` de PHP 8.5, sin dependencias nuevas | Usuario, 2026-10-05 |
| Constructores con nombre (`fromDocument`, `fromRow`) y salidas explícitas (`toRow()`, `toPublished()`) | Usuario, 2026-10-05 |
| Sin `spatie/laravel-data`, para mantener bajo control los bytes publicados, que son contrato | Usuario, 2026-10-05; C2 FR-014 |
| En los bordes siguen entrando y saliendo arreglos: el query builder y el codificador | Usuario, 2026-10-05; [`backend/api/AGENTS.md`](../../backend/api/AGENTS.md), «Arreglos» |
| El análisis estático (PHPStan) sube del nivel 6 una vez que los registros estén tipados | Usuario, 2026-10-05 |
| La skill de apoyo es [`php-pro`](../../.agents/skills/php-pro/SKILL.md): se adoptan sus patrones, no su nivel 9 obligatorio ni su 80 % de cobertura | Usuario, 2026-10-05 |
| Los arreglos se transforman con Collections y `Arr::`; TDD; código y pruebas en inglés; los documentos de Spec Kit, en español | `backend/api/AGENTS.md`; [constitución](../../.specify/memory/constitution.md), principios II y VI |
| C2 queda inmutable y esta spec la extiende (flow-forward) | Constitución, principio VIII |
| Se tipa todo el contenido: los 12 registros con forma publicada, las 7 filas auxiliares y el meta del generador | Usuario, clarify del 2026-10-05 (Q1) |
| El análisis estático sube al nivel 9, sin baseline ni ignores, como decisión de C6 y no como regla general de `php-pro` | Usuario, clarify del 2026-10-05 (Q3) |
| C6 va en la ola 2, en paralelo con C3, y se entrega antes de B2, que pasa a depender de C6 | Usuario, clarify del 2026-10-05 (Q5) |

## Clarifications

### Session 2026-10-05

- Q: **Q1**, ¿qué registros se tipan en esta feature? → A: Todo el contenido: los 12 registros con forma publicada, las 7 filas auxiliares y el meta del generador. Decidió el usuario. (FR-001)
- Q: **Q2**, ¿los registros tipados reemplazan también a las filas dentro de la diferencia del import? → A: No. La comparación, el plan y la escritura del import siguen sobre filas; los registros terminan en su fila, y sólo se comprueba el tipo de las columnas que la diferencia lee por su nombre. Decidió el coordinador: la comparación genérica ya tiene pruebas, y reescribirla no corrige ningún error concreto. (FR-010)
- Q: **Q3**, ¿a qué nivel sube el análisis estático? → A: Al 9, sin baseline ni ignores. Es una decisión de C6 por lo que prueba, no la vuelta del nivel 9 obligatorio de `php-pro` como regla general. Decidió el usuario. (FR-012, SC-004)
- Q: **Q4**, ¿cómo se representan los valores JSON anidados de un registro y su orden de claves? → A: Los valores anidados quedan opacos, tal como los escribe el generador, y `key_order` pasa a ser una lista tipada de las claves que el registro conoce. Decidió el coordinador: es lo que menos arriesga los bytes, y ningún consumidor necesita tipar los anidados. (FR-004)
- Q: **Q5**, ¿dónde va C6 respecto de C3? → A: En la ola 2, en paralelo con C3, y se entrega antes de B2, que pasa a depender de C6. Decidió el usuario. (hoja de ruta)
- `declare(strict_types=1)` sigue fuera, como supuesto que cita la exclusión de `docs/agent-skills.md`; el coordinador no lo volvió a preguntar. (Assumptions)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nada cambia para quien consume el contenido (Priority: P1)

El front lee las mismas 17 porciones y los mismos ejercicios, con los mismos bytes, cabeceras y validadores. Un alumno que ya tiene el contenido no lo vuelve a bajar después del despliegue.

**Why this priority**: es la condición para que el cambio pueda salir. Los bytes publicados son contrato (C2 FR-014), y la caché del navegador depende de los validadores.

**Independent Test**: con el contenido importado, comparar el sha256 de las 17 porciones y de cada ejercicio con el meta del generador. Después, desplegar la imagen nueva sobre un stack que importó el código de C2 y repetir los pedidos con sus validadores.

**Acceptance Scenarios**:

1. **Dado** el contenido importado con el código nuevo, **cuando** se piden las 17 porciones y cada ejercicio, **entonces** el sha256 de cada cuerpo es el que fija el generador (`portions` y `contentHash` del meta), también a través de Nginx.
2. **Dado** un stack con el contenido importado por el código de C2, **cuando** se despliega la imagen con los registros tipados, **entonces** el import informa que no escribió nada y no registra un import, y las 17 porciones responden 304 a sus validadores anteriores, con el mismo `Content-Version`.
3. **Dado** cada respuesta de error del contenido que fija C2 (404, 410, 422 y 503), **cuando** se repite el pedido, **entonces** el estado, las cabeceras y el cuerpo son los mismos.

*Cubre: FR-005, FR-006, FR-011, FR-015, FR-016 y FR-019; SC-001, SC-002 y SC-007.*

---

### User Story 2 - El import se comporta igual (Priority: P1)

Quien opera el taller corre el import, o lo corre el despliegue, y obtiene el mismo resultado: las mismas filas, el mismo informe y, ante un documento inválido, el mismo mensaje.

**Why this priority**: el import decide qué filas existen. Si escribe distinto, el primer despliegue reescribe la base sin que cambie un byte publicado, y nadie lo nota hasta que algo falla.

**Independent Test**: importar el documento vigente sobre una base vacía y comparar las filas, tabla por tabla, con el oráculo tomado del código de C2. Después, repetir cada caso de rechazo de la suite.

**Acceptance Scenarios**:

1. **Dado** el documento vigente y una base vacía, **cuando** se importa con el código nuevo, **entonces** las filas de cada tabla de contenido son las mismas que escribía el código de C2: coinciden, tabla por tabla, con el oráculo de filas.
2. **Dado** un documento inválido de cualquiera de los casos que la suite rechaza hoy, **cuando** se importa, **entonces** el import lo rechaza con el mismo mensaje (archivo, ruta JSON y problema) y no escribe nada.
3. **Dado** un documento que hoy se acepta, incluidas las variantes que fijan las pruebas (órdenes de claves distintos, claves opcionales ausentes, objetos vacíos), **cuando** se importa, **entonces** se acepta: tipar no agrega rechazos.
4. **Dado** un documento con cambios, **cuando** se corre con `--dry-run` y después en serio, **entonces** el informe, los conteos y el registro del import son los mismos que da el código de C2.

*Cubre: FR-006 a FR-010, FR-015 y FR-018; SC-002, SC-003 y SC-007.*

---

### User Story 3 - Un dato mal escrito no pasa (Priority: P1)

Quien mantiene la API cambia un registro: suma un dato, renombra una columna o mueve una conversión. Si el código lee un dato que el registro no tiene, o lo usa con otro tipo, el análisis estático le avisa antes de correr nada.

**Why this priority**: es el motivo del pedido. Hoy una clave mal escrita pasa sin error.

**Independent Test**: en una rama descartable, escribir mal el nombre de un dato en una lectura de cada familia de registros (ejercicio, taller, mundo, Atlas y guía) y correr `npm run api:analyse`.

**Acceptance Scenarios**:

1. **Dado** un registro tipado, **cuando** el código lee un dato con un nombre que el registro no tiene, **entonces** el análisis estático falla y nombra el archivo y la línea, sin correr pruebas.
2. **Dado** un dato de registro de un tipo, por ejemplo un entero, **cuando** el código lo pasa donde se espera otro incompatible, **entonces** el análisis estático falla.
3. **Dado** el nivel 9 del análisis, **cuando** el código usa sin comprobarlo un valor sin tipo leído de una fila o del JSON, **entonces** el análisis estático falla.

*Cubre: FR-001 a FR-004, FR-012 y FR-017; SC-004 y SC-005.*

---

### User Story 4 - El análisis estático sube de nivel y se queda ahí (Priority: P2)

Con los registros tipados, el análisis estático corre en el nivel 9, en la máquina de quien desarrolla y en la CI, sin errores ni excepciones. Así el código que llegue después, también el de C3, B2 y D1, no vuelve a los arreglos sin tipo.

**Why this priority**: sin el nivel nuevo, el tipado se degrada con el primer cambio apurado. Pero el nivel sólo sube después de tipar los registros, como decidió el usuario.

**Independent Test**: correr `npm run api:analyse` y revisar la CI de un PR.

**Acceptance Scenarios**:

1. **Dado** el código con los registros tipados, **cuando** corre el análisis estático, **entonces** termina sin errores en el nivel 9, sobre las mismas rutas de hoy, sin baseline ni errores ignorados.
2. **Dado** un PR, **cuando** corre la CI, **entonces** analiza en el nivel nuevo.
3. **Dado** la documentación del proyecto, **cuando** se busca el nivel del análisis, **entonces** dice el nuevo, en `backend/api/AGENTS.md` y en `docs/agent-skills.md`.

*Cubre: FR-012 a FR-014; SC-004 y SC-006.*

---

### Edge Cases

- **Claves opcionales:** una clave ausente sigue ausente y no pasa a `null`. Pasa con el nivel y el tipo de desafío de algunos ejercicios; con las fuentes adicionales (`furtherSources`), que sólo tienen 2 de los 32 conceptos del Atlas; y con `workshopId`, que publican 16 núcleos aunque todos tienen taller.
- **Órdenes de claves:** hay 7 órdenes de claves de ejercicio y 4 de taller. Cada registro publica sus claves en el orden guardado con su fila, nunca en el de las propiedades del objeto.
- **Claves derivadas:** las que vienen de otra tabla se ubican entre las propias según ese mismo orden: el tema, `workshopId`, las pruebas y las pistas de un ejercicio; los objetivos, las etapas, `code` y `related` de un taller; los IDs de un mundo; los módulos, los pasos y los recursos de un paso de la guía.
- **Datos que no se publican:** algunos viajan en la fila y no en la forma publicada, como la clave y el índice v1 de una etapa, la posición de cada registro y, de un ejercicio, sus tres huellas, su catálogo y su dominio.
- **Valores que devuelve el driver:** enteros como texto y banderas como 0 o 1. La forma publicada es la misma que con enteros y booleanos; C2 ya lo prueba.
- **Objetos vacíos:** `{}` sigue siendo `{}` y no pasa a `[]`.
- **La raíz de la guía** no tiene fila: sus claves son siempre `resources`, `tracks` y `sources`, en ese orden, como en C2.
- **Una fila que el import no pudo escribir**, por una edición a mano: una clave de `key_order` desconocida o un tema retirado con su ejercicio activo. La lectura falla en lugar de publicar un registro incompleto, y la entrega responde 500. Con una clave desconocida, C2 también respondía 500. Con el tema retirado, C2 respondía 503 `maintenance`, porque los bytes no daban la huella. Si ese caso tiene que seguir en 503 lo decide el usuario (research.md, R10).
- **Un documento con varios errores:** el import lo rechaza igual, pero el primero que informa puede cambiar si cambia el orden de las comprobaciones (ver Assumptions).
- **El primer despliegue después del cambio:** la base tiene filas escritas por el código de C2. Si una fila nueva difiriera en un solo carácter del texto de una columna JSON o de `key_order`, el import la reescribiría y registraría un import sin que cambie un byte publicado. Eso lo detecta el oráculo de filas (FR-006).

## Requirements *(mandatory)*

### Functional Requirements

**Registros tipados**

- **FR-001**: Cada tipo de registro del contenido DEBE tener una forma tipada e inmutable: un dato por propiedad, con su tipo, que no cambia después de construirse. Entran los 12 registros con forma publicada, las 7 filas auxiliares y el meta del generador (Key Entities). Los hijos de un registro (las pruebas y pistas de un ejercicio, los objetivos, etapas y ejercicios relacionados de un taller, los ejercicios de un mundo, los módulos, pasos y recursos de la guía) son registros tipados como él. *(Usuario, 2026-10-05; clarify, Q1)*
- **FR-002**: Cada registro DEBE construirse desde el documento y desde su fila con constructores con nombre (`fromDocument` y `fromRow`), y DEBE dar su fila y su forma publicada con salidas explícitas (`toRow()` y `toPublished()`). Las conversiones que no corresponden a un tipo no se agregan. Una fila auxiliar no tiene forma publicada propia, y la construye su registro padre desde el documento. El meta y la raíz de la guía no tienen fila. Una conversión que nadie usa todavía, como leer un catálogo desde su fila (C3), espera a su primer uso. *(Usuario, 2026-10-05)*
- **FR-003**: En los bordes DEBEN seguir entrando y saliendo arreglos. El query builder recibe y devuelve filas como arreglos, y el único codificador (`PublishedJson`) recibe la forma publicada como los valores que recibe hoy. Ningún registro tipado DEBE llegar al query builder ni al codificador, ni serializarse a sí mismo. *(Usuario, 2026-10-05; `backend/api/AGENTS.md`, «Arreglos»)*
- **FR-004**: La forma publicada de cada registro DEBE llevar sus claves en el orden guardado con su fila (`key_order`), y sólo las claves de ese orden: una clave opcional ausente sigue ausente, no `null`. El orden NO DEBE salir del orden de las propiedades ni de constantes en el código (ADR 0006 D10); sólo la raíz de la guía, que no tiene fila, conserva su orden fijo de C2. El orden de claves es una lista tipada de las claves que el registro conoce, y los valores JSON anidados quedan opacos, sin forma tipada propia: se guardan y se publican tal como los escribe el generador. *(Clarify, Q4)*

**Sin cambios observables**

- **FR-005**: Los 17 cuerpos de porción y el de cada ejercicio DEBEN salir con los mismos bytes que con el código de C2: el sha256 de cada uno sigue siendo el que fija el generador. C2 FR-014, FR-031 y FR-038 siguen rigiendo sin cambios.
- **FR-006**: Para un mismo documento, el import DEBE armar las mismas filas que el código de C2. Sobre una base que importó C2 no encuentra nada que escribir ni registra un import, porque el texto de `key_order` y de cada columna JSON, los valores y los NULL coinciden. El valor esperado sale de un oráculo de filas: una huella por tabla de las filas que arma el código de C2 para el documento vigente. El oráculo se toma en la base de esta rama antes del primer cambio de código, para que no salga del código que se prueba (constitución II), y guarda la huella del documento para el que se calculó. Si el documento cambia mientras dura la feature, la prueba falla con un mensaje que lo dice, y el oráculo sólo se regenera con el código de C2 de la base de la rama, nunca con el código nuevo.
- **FR-007**: La conversión desde la fila DEBE aceptar los valores como los devuelve el driver de la base (enteros como texto, banderas como 0 o 1 y el texto de las columnas JSON), y DEBE dar la misma forma publicada que con enteros y booleanos, como hoy.
- **FR-008**: La conversión desde el documento DEBE aceptar y rechazar exactamente lo que hoy acepta y rechaza el import, con el mismo mensaje para cada error (archivo, ruta JSON y problema, en español). Eso incluye una clave sin regla, una clave obligatoria ausente, un texto vacío, un entero o un booleano que no lo es, una lista vacía o que no es lista, un objeto donde va otro valor y las referencias entre registros que valida C2. Tipar NO DEBE agregar rechazos, por ejemplo convirtiendo en enumeraciones valores que hoy son texto libre, ni quitar ninguno.
- **FR-009**: El import DEBE conservar el comportamiento que fija C2 (FR-001 a FR-012): la diferencia incremental e idempotente, el retiro y la reactivación, las versiones de corrección, el auto-chequeo de las 17 porciones, el informe de `--dry-run`, el registro del import con sus conteos y su informe, y la caché de cuerpos.
- **FR-010**: Los registros tipados DEBEN terminar en su fila. La diferencia del import, su plan y la escritura siguen comparando y escribiendo filas, que son el borde del query builder. Las columnas que la diferencia lee por su nombre (el índice v1 de una etapa, el `test_key`, las huellas y el estado de un ejercicio) DEBEN comprobar su tipo antes de usarse. *(Clarify, Q2)*
- **FR-011**: La entrega HTTP DEBE conservar el comportamiento que fija C2 (FR-013 a FR-026 y FR-044) para todas las filas que el import puede escribir: rutas, parámetros, estados, cabeceras, validadores, cuerpos de error y caché de cuerpos. Una fila que el import no pudo escribir, por una edición a mano, falla antes de armar el cuerpo (Edge Cases; research.md, R10).

**Análisis estático y dependencias**

- **FR-012**: Cuando los registros estén tipados, el análisis estático (`npm run api:analyse`) DEBE subir del nivel 6 al 9. Corre sobre las mismas rutas de hoy (`app`, `config`, `database`, `routes` y `bootstrap/app.php`), con 0 errores, sin baseline y sin ignorar errores ni en la configuración ni en el código. El mismo cambio corrige lo que ese nivel reporta fuera del contenido; hoy, `config/filesystems.php`. *(Usuario; clarify, Q3)*
- **FR-013**: La CI DEBE analizar en el nivel nuevo. En el mismo cambio, la documentación que cita el nivel DEBE pasar a decir el nuevo: `backend/api/AGENTS.md`, que hoy dice «nivel 6», y `docs/agent-skills.md`, que además dice que el proyecto no tiene PHPStan.
- **FR-014**: NO DEBE agregarse ninguna dependencia: `require` y `require-dev` de `composer.json` no suman paquetes. *(Usuario, 2026-10-05)*

**Verificación** (pruebas que el cambio DEBE traer antes de la implementación, según la constitución II)

- **FR-015**: Las pruebas que hoy fijan comportamiento observable DEBEN seguir pasando sin cambiar sus valores esperados: el contrato de bytes (las 17 porciones y cada ejercicio contra las huellas del meta), las del import por consola, las de HTTP y los rechazos con su mensaje. Las que llaman a una costura interna que cambia de forma pueden cambiar cómo arman su entrada, nunca su valor esperado.
- **FR-016**: Las pruebas DEBEN leer sus valores esperados del meta del generador como archivo, decodificado tal cual, y nunca a través de una forma tipada del meta, si esta feature la agrega: el oráculo no pasa por el código que se prueba. *(Constitución II)*
- **FR-017**: Las pruebas de ida y vuelta (documento → registro → fila → registro → forma publicada) DEBEN cubrir cada tipo de registro, directamente o a través de su padre, con valores esperados que salen del documento real o del meta del generador. Cubren los órdenes de claves distintos, las claves opcionales ausentes, los objetos vacíos, los valores como texto del driver y los datos que viajan en la fila pero no se publican.
- **FR-018**: Una prueba DEBE comparar, tabla por tabla, las filas que arma el código nuevo para el documento vigente con el oráculo de filas de FR-006. La prueba y el oráculo viven mientras dura C6. Se retiran después del despliegue sobre una base de C2 (FR-019), porque ya no queda código de C2 con el cual regenerarlos. Desde entonces, las filas las cuida la idempotencia del import que prueba C2.
- **FR-019**: Contra el stack levantado DEBEN pasar `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`. Además, el despliegue de la imagen nueva sobre un stack que importó el código de C2 DEBE dejar el import sin escrituras y las 17 porciones en 304 (User Story 1, escenario 2).

### Key Entities *(include if feature involves data)*

- **Registro:** una unidad del contenido de un tipo dado, con tres representaciones. Están el documento (`curriculum.json` decodificado), su fila (las columnas de su tabla) y la forma publicada (el valor que recibe el codificador y se publica en una porción).
- **Registro tipado:** la forma inmutable de un registro en el código, con un dato por propiedad y sus conversiones (FR-001 y FR-002).
- **Fila auxiliar:** una fila sin forma publicada propia; su padre publica un valor derivado de ella, como una lista de IDs, el texto de un tema o un mapa por lenguaje.
- **Orden de claves** (`key_order`): la lista de claves publicadas de un registro, en su orden, guardada con su fila (ADR 0006 D10).
- **Valor JSON anidado:** un valor publicado que se guarda como texto JSON en una columna, como `quiz`, `sources` o `prediction`. Hay 18 en 6 tipos de registro.
- **Meta del generador:** `curriculum.meta.json`, con las huellas del documento, de cada porción y de cada ejercicio, las claves de etapa y los catálogos.
- **Oráculo de filas:** una huella por tabla de las filas que arma el código de C2 para el documento vigente, tomada antes del primer cambio de código, junto con la huella de ese documento (FR-006). Se retira al cerrar C6 (FR-018).
- **Bordes:** el query builder, donde las filas entran y salen como arreglos, y el codificador único (`PublishedJson`).

Los tipos de registro, con las cantidades del contenido vigente, que fijan las pruebas de C2:

| Registro | En el documento | Tabla | Qué publica | Cantidad |
| --- | --- | --- | --- | --- |
| Ejercicio | `lab.<lenguaje>`, `quests.<lenguaje>` y `cores.<dominio>` | `exercises` | su forma publicada, con 7 órdenes de claves | 274 |
| Prueba | `tests` del ejercicio | `exercise_tests` | su forma publicada | 822 |
| Pista *(auxiliar)* | `hints` del ejercicio, como texto | `exercise_hints` | el texto, en la lista del ejercicio | 822 |
| Tema *(auxiliar)* | `topicId` y `topic` del ejercicio | `topics` | el texto `topic` del ejercicio | 98 |
| Taller | `workshops.<dominio>` | `workshops` | su forma publicada, con 4 órdenes de claves | 25 |
| Objetivo de taller | `objectives` del taller | `workshop_objectives` | su forma publicada | 75 |
| Etapa de taller | `steps` del taller; su clave y su índice v1 vienen del meta | `workshop_steps` | su forma publicada, sin clave ni índice v1 | 100 |
| Ejercicio relacionado *(auxiliar)* | `related.<lenguaje>` del taller | `workshop_related_exercises` | la lista de IDs por lenguaje | 118 |
| Mundo | `campaign.<lenguaje>` | `worlds` | su forma publicada | 8 |
| Ejercicio de mundo *(auxiliar)* | `trainingIds`, `challengeIds` y `bossId` | `world_exercises` | las listas de IDs y el jefe | 48 |
| Concepto del Atlas | `atlas.<lenguaje>` | `atlas_concepts` | su forma publicada | 32 |
| Recurso de guía | `guide.resources` | `guide_resources` | su forma publicada | 15 |
| Fuente de guía | `guide.sources` | `guide_sources` | su forma publicada | 9 |
| Recorrido de guía | `guide.tracks.<lenguaje>` | `guide_tracks` | su forma publicada | 2 |
| Módulo de guía | `modules` del recorrido | `guide_modules` | su forma publicada | 8 |
| Paso de guía | `steps` del módulo | `guide_steps` | su forma publicada | 24 |
| Recurso de un paso *(auxiliar)* | `resourceIds` del paso | `guide_step_resources` | la lista de IDs | 56 |
| Idioma *(auxiliar)* | `languages` del meta | `languages` | el orden de los mapas por lenguaje | 2 |
| Catálogo *(auxiliar)* | `catalogs` del meta | `catalogs` | nada todavía; C3 lo publica en la sesión | 3 |
| Meta del generador | `curriculum.meta.json` | se reparte en `content_imports` y en columnas de otras tablas | nada | uno por import |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 17 porciones y los 274 ejercicios del contenido vigente salen con el sha256 que fija el generador, armados sin base, desde las tablas y a través de Nginx: 0 diferencias.
- **SC-002**: Al desplegar la imagen nueva sobre un stack que importó el código de C2, el import escribe 0 filas de contenido y registra 0 imports, y las 17 porciones responden 304 a sus validadores anteriores con el mismo `Content-Version`: 0 validadores distintos.
- **SC-003**: Cada rechazo del import que la suite cubre hoy da el mismo mensaje (0 mensajes cambiados), y ningún documento que hoy se acepta se rechaza.
- **SC-004**: `npm run api:analyse` termina con 0 errores en el nivel 9, sin baseline ni errores ignorados. La línea de base, medida el 2026-10-05 sobre esta rama, es de 0 errores en el nivel 6, 10 en el 7, 11 en el 8, 106 en el 9 (104 en `app/Content`) y 154 en el 10.
- **SC-005**: Escribir mal el nombre de un dato en una lectura de cada familia de registros (ejercicio, taller, mundo, Atlas y guía) hace fallar el análisis estático: 5 de 5 mutaciones detectadas, sin correr pruebas.
- **SC-006**: `composer.json` no suma ningún paquete.
- **SC-007**: Las pruebas observables de C2 pasan sin cambiar sus valores esperados, y pasan `npm run api:test` (Pest contra MySQL real), `npm run api:format:check`, `npm run api:analyse`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.

## Riesgos

1. **Igualdad de bytes, el principal.** Un registro tipado puede cambiar un byte publicado de varias maneras: publicar las claves en el orden de sus propiedades y no en el de su fila; convertir una clave ausente en `null`; volver `{}` en `[]`; publicar `"1"` en lugar de `1`, o `1` en lugar de `true`; o volver a codificar un valor anidado con otro orden de claves. *Mitigación:* el oráculo independiente del generador (las huellas del meta), el auto-chequeo del import, que bloquea el despliegue si una porción no coincide (C2 FR-005), y las pruebas de ida y vuelta (FR-017).
2. **Igualdad de filas.** Las huellas de las porciones no ven las filas. La diferencia del import compara los escalares como texto, pero el texto de `key_order` y de las columnas JSON lo compara tal cual. Si `toRow()` vuelve a codificar distinto uno de esos textos, las 17 huellas quedan intactas, y en el primer despliegue se reescriben todas las filas y se registra un import que nadie pidió. *Mitigación:* el oráculo de filas, tomado antes del primer cambio de código (FR-006 y FR-018), y el despliegue sobre una base de C2 (SC-002).
3. **Mensajes del import.** Reescribir la validación del documento puede cambiar el texto, la ruta o el orden de las comprobaciones. *Mitigación:* FR-008 y las pruebas de rechazo existentes, que fijan el texto exacto.
4. **Nombres repetidos.** Con conversiones explícitas, el nombre de una columna aparece al leer la fila y al escribirla, y el de una clave publicada, al leer el documento y al publicar. Si dos lugares escriben distinto un mismo nombre, se rompe la ida y vuelta. *Mitigación:* las pruebas de ida y vuelta y el oráculo de filas.
5. **Lo que arrastra el nivel del análisis.** En el nivel 9, 31 de los 106 errores de hoy no vienen de los registros sino de bordes. Hay 20 en la entrega, porque la lectura en una foto de la base devuelve un valor sin tipo. Los otros 11 se reparten entre el candado del import, la configuración de la caché y del comando, un parámetro del pedido, las claves de las tablas y de la escritura, las huellas del último import, la lectura de los archivos y `config/filesystems.php`. Subir el nivel obliga a corregirlos también; son correcciones chicas y locales, y el plan las verificó.
6. **Trabajo en paralelo.** B2 cambia las pruebas de ejercicio y el generador. C3 pone el contenido detrás de la sesión y lee el último import y los catálogos para `GET /api/session`. Los dos tocan cerca de C6, y el nivel nuevo del análisis rige también para el código que llegue después. Por eso C6 corre en paralelo con C3, con los puntos de integración que marca el plan, y se entrega antes de B2 (clarify, Q5).
7. **Compose compartido.** `compose.yaml` fija el nombre de proyecto `taller-rust-go`, el mismo del stack que corre en el checkout principal. Por eso `npm run api:test`, `npm run api:analyse`, `npm run api:content:check` y `deploy-check.sh`, corridos desde otro worktree sin un `COMPOSE_PROJECT_NAME` propio, construyen y tocan ese stack.
8. **Costo de crear objetos.** El import y el armado de una porción crean unos pocos miles de objetos. *Supuesto:* no importa, porque la entrega sirve los cuerpos desde la caché y sólo arma uno cuando falta, y el import corre en el despliegue. No se mide.

## Relación con C2

- **Extiende a** [`specs/001-c2-contenido-mysql/`](../001-c2-contenido-mysql/spec.md), entregada con el PR #8 e inmutable (constitución VIII). No cambia ninguno de sus requisitos: sus FR y SC siguen rigiendo y son la vara de esta feature. Pesan en especial el import (FR-001 a FR-012), la entrega (FR-013 a FR-026 y FR-044), las huellas que sólo calcula el generador (FR-031) y las pruebas de contrato (FR-038 a FR-040).
- **Qué cambia:** la representación de los registros dentro de `backend/api/app/Content/`. Hoy el documento llega como objetos sin forma (`ContentSource`, que guarda el meta como arreglo), y las filas viajan como arreglos por `ContentRows`, `RowSet`, `ContentDiff`, `ContentWriter`, `ContentReader` y `PortionAssembler`. La regla de cada clave vive en un `FieldMap` genérico por tipo de registro (`Codec/`). Ya son objetos inmutables `LatestImport`, `ContentReport`, `Field` y `ContentPlan`, que lleva filas como arreglos.
- **ADR 0006 D10 se sigue cumpliendo.** «Un codec por tipo de registro mapea clave ↔ almacenamiento en las dos direcciones», y con esta feature ese códec es el registro tipado. El orden de claves sigue guardado por fila, como fija D10, que descartó las constantes de orden en el código.
- **Fe de erratas de C2, sin editarla:** su caso borde dice que las fuentes adicionales «faltan en 2 de 32» conceptos del Atlas. El contenido y sus pruebas muestran lo contrario: sólo 2 de los 32 las tienen.
- **La hoja de ruta apunta a las dos:** la fila de C2 enlaza esta spec como extensión, y la de C6 nombra a C2 como dependencia.

## Assumptions

- C2 está entregada en `master` (PR #8, `4573457`). Al entregarla pasaban su suite de la API (328 pruebas), los 30 checks de `npm test`, `npm run api:content:check` y `deploy-check.sh`. Esta rama se apila sobre la reorganización del ADR 0007 (PR #13), y por eso las rutas son `backend/api/`.
- La imagen corre PHP 8.5 (`php:8.5-fpm-alpine`) y `composer.json` declara `php: ^8.3`. Si el plan usa una característica posterior a 8.3, sube esa restricción a la versión de la imagen en el mismo cambio. No es una dependencia nueva.
- Sin `declare(strict_types=1)` ni meta de cobertura. `docs/agent-skills.md` deja fuera de `php-pro` su nivel 9 obligatorio, `strict_types` y su 80 % de cobertura. El pedido del 2026-10-05 nombra sólo el nivel y la cobertura, y no cambia eso. Como las conversiones desde la fila son explícitas, el resultado no depende del modo de tipos. El coordinador lo confirmó en el clarify sin volver a preguntarlo.
- Rigen las reglas de `backend/api/AGENTS.md`: los arreglos con Collections y `Arr::`, Pest contra MySQL 9.7 real con sus tres suites, y Pint.
- Con un documento que tiene un solo error, el mensaje es el de hoy (FR-008). Con varios, el import sigue rechazándolo, pero el primero que informa puede cambiar: ninguna prueba ni operación depende de ese orden.
- La entrega puede partirse en unidades de trabajo por familia de registros, cada una con las pruebas de bytes y de filas en verde. El concepto del Atlas sirve de piloto: una tabla, sin hijos y con una clave opcional. Cómo se parte lo decide el plan; la entrega en Git, el coordinador.
- No hace falta un ADR: cambia la representación interna de un módulo, no la arquitectura, y ADR 0006 D10 se cumple igual. Si el plan encuentra lo contrario, registra la enmienda.
- Dependencias: C2, entregada. C6 permite que C3, B2 y D1 lean registros tipados en lugar de filas sueltas.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las que dicen «usuario» son decisiones del 2026-10-05.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se tipan los registros | `spatie/laravel-data`; objetos `readonly` propios; formas de arreglo documentadas sólo para el análisis estático | Objetos propios (usuario). `laravel-data` serializa por su cuenta, y los bytes publicados son contrato (C2 FR-014). Las formas documentadas no impiden armar un arreglo mal formado cuando el código corre |
| Dónde viven las conversiones | En clases mapper aparte; en el `FieldMap` genérico de hoy; en el propio registro, con constructores con nombre y salidas explícitas | En el registro (usuario): cada tipo es su propio códec, como pide ADR 0006 D10 |
| Qué cruza los bordes | Registros hasta el query builder y el codificador, que se serializan solos; arreglos en los bordes | Arreglos (usuario): el codificador y el query builder no cambian, y los bytes siguen bajo control |
| De dónde sale el orden publicado | Del orden de las propiedades; de constantes en el código; del `key_order` de cada fila | Del `key_order` (ADR 0006 D10): hay 7 órdenes de ejercicio y 4 de taller |
| Cómo se prueba que nada cambió | Sólo con las huellas de porción; también con un oráculo de filas tomado de C2 | También con el oráculo de filas, porque las huellas no ven las filas (Riesgos, 2) |
| Hasta dónde llegan los registros en el import | Hasta la diferencia y la escritura; hasta su fila | Hasta su fila (coordinador, Q2): la comparación genérica ya tiene pruebas |
| Valores JSON anidados | Con forma tipada propia; opacos; como texto, con el orden de claves | Opacos, con el orden de claves tipado (coordinador, Q4): es lo que menos arriesga los bytes |
| Nivel del análisis estático | 8, 9 o 10 | 9 (usuario, Q3): el 8 casi no depende de esta feature, y el 10 suma trabajo fuera del objetivo |
