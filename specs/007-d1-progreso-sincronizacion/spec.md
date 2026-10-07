# Feature Specification: D1 · Progreso y sincronización

**Feature Branch**: `007-d1-progreso-sincronizacion` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Clarificada el 2026-10-06: el usuario respondió Q1 a Q4 con la opción recomendada y aceptó la partición en tres (D1a, D1b y D1c). D1a y D1b están planificadas, con su análisis hecho: D1a en [plan.md](./plan.md) y [tasks.md](./tasks.md), y D1b en [plan-d1b.md](./plan-d1b.md) y [tasks-d1b.md](./tasks-d1b.md). D1c todavía no tiene plan. Sin implementar

**Input**: Ítem **D1** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Progreso y sincronización». Fuente técnica: el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (**propuesta**: el usuario todavía no lo aprobó), en sus decisiones D08, D09, D14, D22 a D25, D28, D29, D36 y D39, §5.3, §7, §8, §10, §12 y la pregunta 17 de §13 (con las transversales 13 y 14); el [ADR 0004](../../docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md) §3 y §4 (aceptada), que el 0006 enmienda en la sincronización; y el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), cuyas reglas de integridad del progreso local siguen valiendo. Donde el 0006 difiere, manda, pero sólo como propuesta: lo que depende de él lleva la marca «(propuesta)» y cambia si el usuario lo enmienda. Las specs hermanas (B2, C3a y el épico del front) son borradores sin clarify: lo que esta spec toma de ahí está en «Relación con otras specs» y en Assumptions.

## Intención y alcance

**Lo que entendemos.** Hoy el progreso del alumno vive sólo en cuatro claves de `localStorage`: se pierde si limpia el navegador, no pasa de un dispositivo a otro y cada clave es global del navegador, así que dos alumnos que comparten una computadora se pisan. D1 lo lleva a la base sin quitarle al alumno lo que tiene hoy: sigue estudiando y editando en su navegador, también sin conexión (local primero), y el servidor guarda la copia durable y fusiona campo por campo lo que llega de cada dispositivo. D1 trae además el progreso de hoy a la cuenta: quien ya tiene progreso v1 lo importa sin perder nada y sin pisar lo que su cuenta ya tenga. Es para el alumno (en casa, con varios dispositivos y en aulas con computadoras compartidas), para quien opera el taller (una cuenta nueva no hereda lo de otra, y un «Borrar todo» no se deshace solo) y para quienes consumen el progreso: C5, E1, A4 y el front. D1 no trae pantallas: entrega el contrato de las cuatro rutas, el comportamiento del cliente (cola, espacios por cuenta, arranque y salida), el id de etapa en el contenido y las pruebas que lo fijan. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Qué vive dónde.** El navegador es la copia de trabajo y el servidor, la copia durable y la que decide las fusiones. Se fusiona por campo: dos dispositivos que tocan campos distintos conviven, y en el mismo campo gana la última escritura (los logros sólo crecen y lo que se puede desmarcar deja una lápida).

| Dónde | Qué guarda | Qué decide |
| --- | --- | --- |
| Navegador (un espacio por cuenta) | La copia local del progreso con el reloj de cada campo y sus lápidas; la cola de operaciones pendientes, cada una con su UUID; lo último que supo del servidor (época, revisión, versión del contenido y validador); las cuatro claves v1, sin tocar hasta una importación confirmada y después en un archivo por cuenta | La corrección de predicciones, checkpoints y quiz; las fechas de repaso; la XP y los sellos derivados; cuándo enviar |
| Servidor (MySQL) | Las 14 tablas de progreso (12 de D1 y 2 de B2), con la cabecera de la cuenta, y los intentos de B2 | Lo que sale de las ejecuciones (resuelto, prueba aprobada, último intento y conteo); la corrección del reloj de cada lote; el resultado de cada fusión; la época y la revisión |

Dos lecturas de esta spec: la primera conviene confirmarla, y la segunda la decidió el usuario (Q4):

1. **«Exportarlo sin pérdida».** El criterio de aceptación de la hoja de ruta dice que el progreso de master entra a las tablas y vuelve a salir. «Vuelve a salir» es una proyección de las tablas hacia el formato v1 que vive en las pruebas (ADR 0006, D24), no una ruta: D1 no agrega ningún endpoint que devuelva el formato v1. La exportación del titular es `POST /api/me/export` (C3b), y el archivo v1 de «Método» sigue saliendo del navegador (F8).
2. **«Resuelto» antes de A4.** Lo que el alumno resuelve mientras el laboratorio usa los Playgrounds no viaja por la sincronización, porque sólo el cierre de una ejecución del servidor escribe «resuelto» (ADR 0006 §5.3 y D39). El usuario lo decidió en Q4: el cliente de D1 espera a A4.

**Cómo sabremos que salió bien.**

1. **Sin pérdida.** El progreso real de master (las cuatro claves de `qa/fixtures/progress-master-2a278ad-storage.json` y los dos exports de `qa/fixtures`) entra a las tablas con una importación, y la proyección v1 conserva cada dato del original, también si se importa dos veces.
2. **Convergencia.** Dos dispositivos que editan sin conexión y después sincronizan terminan con el mismo estado. Lo que cada uno tocó en campos distintos sobrevive, y en el mismo campo gana la última escritura, con la misma respuesta en el servidor y en el cliente.
3. **Nada ajeno.** Una computadora compartida no mezcla cuentas: el segundo alumno no ve, no recibe ni se le ofrece importar lo del primero, y una pestaña que quedó con otra cuenta no modifica nada.
4. **Un borrado que se propaga.** «Borrar todo» deja la cuenta en cero, y ningún dispositivo que quedó atrás puede volver a escribir lo borrado.
5. **Reintentar es seguro.** Reenviar un lote o repetir una importación no duplica ni pierde nada.
6. **El contenido nombra cada etapa por su id,** en las cuatro porciones de talleres, sin cambiar nada más de lo publicado.

**Entra:**

- Las 12 tablas de progreso del ADR 0006 §5.3 que no crea B2, sin alterar las dos que sí crea (`progress_heads` y `exercise_progress`).
- Las rutas `POST /api/sync`, `GET /api/progress`, `POST /api/progress/import` y `POST /api/progress/reset`, con las reglas de fusión por campo, la época y la revisión.
- El cliente v2: copia local y cola con UUID, espacios por cuenta, arranque, salida, cuenta esperada, y la lógica de importar y de «Borrar todo» contra la API.
- El contenido publica el id de cada etapa de taller.
- El fixture compartido de fusión.
- Lo que eso pide en la operación: los límites de D1, las ubicaciones de Nginx y `post_max_size`, las podas de `sync_operations` y del crudo importado, y las tablas de D1 en la supresión y la exportación del titular de C3b.

**Queda fuera:**

- **C5:** las estadísticas del admin. El alumno calcula las suyas en el cliente, como hoy (D31).
- **El épico del front:** las pantallas. D1 fija el estado y el contrato de cada una, pero el aviso de estado de sincronización, el resumen y la pregunta de la importación, el aviso al salir con la cola sin enviar, la confirmación de contraseña de «Borrar todo» y la opción «computadora compartida» del ingreso son vistas, y hoy ningún ítem del front las tiene (ver «Relación con otras specs»).
- **B2:** las ejecuciones y el cierre que escribe lo resuelto, la prueba aprobada, el último intento y el conteo. **A4:** el cliente de `/api/runs` y el id del intento en el `result` v1. **A3:** la lectura del contenido por la API.
- **C3b:** `POST /api/me/export`, `DELETE /api/me` y la purga. D1 sólo aporta sus tablas y el lector de la foto.
- Un endpoint que devuelva el formato v1.

**Sin hacer a propósito (YAGNI):** fusionar texto (gana la última escritura entera, no un diff); conservar en el servidor la versión de un texto que perdió una fusión; tiempo real (SSE o WebSockets) para propagar entre dispositivos: el cliente sincroniza al arrancar, al volver a la pestaña y con cambios; Redis para el registro de UUID (el camino de escala del ADR 0006 §9 lo trae con su disparador); recuperar en los clientes lo que una restauración del servidor perdió; guardar la XP o los sellos derivados; un versionado público de la API (sólo la compatibilidad con el cliente anterior, R6).

**Actores:** el alumno (en un dispositivo, en varios o en una computadora de aula); quien opera el taller; el cliente del front, que consume la sincronización; y los ítems C5, E1, A3, A4, F2, F8 y F11, que apoyan o consumen lo que D1 deja.

## Partición de D1

**Esta spec cubre D1 entero, y eso la aparta de lo que hizo C3.** C3 escribió sólo su primera mitad, porque la hoja de ruta ya preveía el corte. Acá el pedido exige dejar claros, en una sola spec, el modelo local primero, los espacios por cuenta, la importación, el reset, el id de etapa y el fixture, y eso atraviesa el servidor y el cliente: una spec que cubriera sólo el servidor no lo cumpliría. Por eso la spec marca a qué parte va cada requisito: partirla es mover rangos, no reescribirlos. El usuario aceptó el corte en tres el 2026-10-06 (ver «Clarifications»): sigue siendo una sola spec, con un plan y sus tareas por parte, y el de D1a está hecho. La hoja de ruta de D1 no tiene partes todavía: sumarlas es del coordinador.

Los números salen del ADR 0006 y del repositorio, medidos el 2026-10-05. Son un indicador de tamaño, no una medida de esfuerzo.

| Medida | D1 entero | D1a: sincronización del servidor | D1b: importación y reset | D1c: cliente v2 |
| --- | --- | --- | --- | --- |
| Rutas nuevas | 4 | 2: `POST /api/sync` y `GET /api/progress` | 2: `POST /api/progress/import` y `POST /api/progress/reset` | 0 |
| Tablas que crea (columnas, FK) | 12 (108, 21) | 10 (91, 18): `sync_operations`, `drafts`, `campaign_checkpoints`, `workshop_progress`, `workshop_observations`, `workshop_step_marks`, `route_marks`, `route_quiz_answers`, `route_notes` y `preferences` | 2 (17, 3): `progress_imports` y `campaign_seals` | 0 |
| Tablas de B2 que usa sin alterar | 2 (35 columnas) | 2 | 2 | 0: las lee por la API |
| Viñetas de las decisiones (las dos primeras de D14, y D22 a D25, D36 y D39; anidadas incluidas) | 38 | 17 | 12 | 9 |
| Requisitos de esta spec | 88 | 42 (FR-001 a FR-023, FR-046 a FR-059, FR-080 a FR-084) | 22 (FR-024 a FR-045) | 22 (FR-060 a FR-079, FR-085 y FR-086) |
| Lenguaje y pruebas | PHP, SQL y el generador en TypeScript, y TypeScript del cliente | PHP y SQL (Pest) y el check del generador | PHP y SQL (Pest, con las tres fixtures) | TypeScript (checks de `qa/` y navegador real) |
| Depende de | C2, C3a, B2 y C6 | C2, C3a, B2 y C6 | D1a y C3a (`password.confirm`) | D1a, D1b, F2 (unidades 1 y 6), F11, A3 y A4 (Q4) |
| Lo esperan | C5, E1 y el front | C5 y E1 (lectura de esta spec) | F8 (la página «Método») | el front |

Referencia: C2 tuvo 48 requisitos (42 viñetas en D10 a D15, y 21 tablas con 153 columnas), B2 49 y C3a 52. FR-087 y FR-088 (el check de punta a punta y el cierre) los repite cada parte. Los criterios de éxito van así: SC-002, SC-003, SC-006 y SC-007 a D1a; SC-001 y SC-005 a D1b; SC-004 a D1c; y SC-008 a SC-011 se reparten.

**Decisión: partir en tres, con este corte.** El usuario aceptó la recomendación el 2026-10-06. Los motivos:

1. **Caminos críticos distintos.** Según esta spec, C5 y E1 sólo necesitan D1a (las tablas, las reglas y el id de etapa): es una lectura para confirmar, porque la hoja de ruta les pone a D1 entera como dependencia y no dice por qué. La importación y el reset los espera la página «Método» del front. El cliente espera además a F2, F11 y A4 (Q4). En una sola spec, el servidor esperaría a tres ítems del front que no usa.
2. **Un foco de revisión por parte.** D1a, que la fusión no pierda datos (el fixture). D1b, que importar y borrar no pierdan ni mezclen cuentas (el criterio de aceptación de la hoja de ruta, con las tres fixtures). D1c, que no se pierda lo del alumno en su navegador ni se mezclen las cuentas en una computadora compartida.
3. **Dueños y pruebas.** D1a y D1b son del backend y corren con Pest; D1c es del frontend, con checks de TypeScript y navegador real.
4. **Tamaño, con una salvedad.** Por las decisiones del ADR, D1 es del tamaño de C2 (38 viñetas contra 42). Lo que lo agranda es que cruza dos pilas, PHP y TypeScript, y que esta spec lo baja a 88 requisitos, contra 48, 49 y 52 en C2, B2 y C3a: ese conteo es de esta spec, no una medida independiente. Con el corte, cada parte queda entre 22 y 42 requisitos. Por sí solo, el tamaño no justificaría partir.

**Lo que cuesta partir:** tres ciclos de Spec Kit; el contrato HTTP y el fixture los congela D1a y los citan D1b y D1c, sin repetirlos; la prueba de punta a punta entre cliente y servidor sólo existe cuando se entrega D1c; y las tres comparten archivos (`backend/api/routes/api.php`, `backend/api/lang/es`, la configuración de Nginx y `backend/api/AGENTS.md`), que integra el coordinador.

**Alternativas descartadas por el usuario:** *dos partes* (el servidor entero y el cliente): D1a quedaría en 64 requisitos, más que cualquier otra spec del épico (52 la mayor); y *no partir*: 88 requisitos en un plan, con el servidor esperando al front.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o lo decidió el clarify (Clarifications).

| Pedido | Fuente |
| --- | --- |
| Progreso local primero: cola con UUID, `/api/sync`, `/api/progress` e importación v1 la primera vez | ADR 0006 R9 (decisiones del usuario del 2026-10-04) |
| Fusión por campo: los logros sólo crecen, los campos editables ganan por la última escritura con una fecha por campo, y lo que el alumno puede desmarcar deja una lápida | ADR 0004 §3 (aceptada) |
| El progreso real de master entra a las tablas y vuelve a salir sin perder datos, y las reglas de fusión tienen un fixture compartido que corren TypeScript y Pest | ADR 0004 §4; hoja de ruta, criterios globales |
| El servidor decide sólo lo que sale de las ejecuciones; la corrección de predicciones, las fechas de repaso, la XP y los sellos derivados los decide el cliente, como hoy | ADR 0006 D39 |
| El cliente guarda su copia y su cola en un espacio por cuenta, envía la cola al salir y declara la cuenta esperada en todo pedido que modifica | ADR 0006 D25 y D36 |
| El contenido publica el id de cada etapa desde D1 | ADR 0006 D14; C2, Clarifications, Q7 |
| B2 crea completas `progress_heads` y `exercise_progress`, y D1 las usa sin alterarlas | ADR 0006 D28 |
| La API la consume sólo este front, del mismo origen y sin versionado público; Pest corre contra MySQL real | ADR 0006 R6; constitución, principio II |
| D1 no incluye las estadísticas (C5) ni las vistas del front | Hoja de ruta, alcance de D1; pedido de esta tarea |
| Esta spec deja claro: el modelo local primero y la fusión por campo, los espacios por cuenta, la importación combinable, el reset, el id de etapa y el fixture compartido | Pedido de esta tarea |
| D1 se parte en tres: D1a (sincronización del servidor), D1b (importación y reset) y D1c (cliente v2), con el corte de esta spec | Usuario, 2026-10-06 (partición, opción recomendada) |
| La importación del v1 es por navegador: varias por cuenta, combinables y con confirmación | Usuario, 2026-10-06 (Q1, opción A) |
| «Borrar todo» borra sólo el estado: los intentos, sus payloads y las importaciones quedan hasta su retención, y la supresión real es borrar la cuenta (C3b) | Usuario, 2026-10-06 (Q2, opción A) |
| En una computadora compartida, al salir se envía la cola y se limpia el espacio; el ingreso ofrece «computadora compartida»; los espacios vencen a los 30 días | Usuario, 2026-10-06 (Q3, opción A) |
| El cliente de D1 (D1c) entra en servicio después de A4; D1a y D1b, no | Usuario, 2026-10-06 (Q4, opción A) |

**Base del ADR 0006 (propuesta).** D22 a D25, D36 y D39, y las enmiendas al ADR 0004 que el 0006 registra (`/api/sync` con delta, `POST /api/progress/reset` y la importación combinable), todavía no las aprobó el usuario. La spec las usa como base y cada una está marcada «(propuesta)» donde pesa. Q1 y Q2 (2026-10-06) decidieron la importación combinable por navegador y el alcance de «Borrar todo»; el ADR en sí sigue en propuesta. Si el ADR se enmienda, esta spec cambia.

## Clarifications

### Session 2026-10-06

El usuario respondió las cuatro preguntas con la opción recomendada y aceptó la partición en tres. Q1 a Q3 son las tres partes de la pregunta 17 del ADR 0006 §13, la única de D1 en la hoja de ruta; Q4 salió de esta spec. Las opciones que no se eligieron, con su costo, están en cada respuesta.

- Q: Después de medir el tamaño de D1 (88 requisitos), ¿se parte? → A: Sí, en tres, con el corte de esta spec: D1a (la sincronización del servidor: `POST /api/sync` y `GET /api/progress`, diez de las doce tablas, el fixture de fusión y el id de etapa), D1b (la importación y el reset: `POST /api/progress/import` y `POST /api/progress/reset`, con `progress_imports` y `campaign_seals`) y D1c (el cliente v2). Sigue siendo una sola spec, con un plan y tareas por parte. Descartadas: dos partes, el servidor entero y el cliente, que dejaba a D1a en 64 requisitos, más que cualquier otra spec del épico; y no partir, con 88 requisitos en un plan y el servidor esperando al front. Decidió el usuario. (Partición de D1)
- Q: **Q1**, ¿la importación del v1 es por navegador, combinable y con confirmación, o una sola por cuenta? → A: Opción A: por navegador, con varias importaciones por cuenta, combinables con las reglas legadas y con confirmación. Una cuenta puede traer el v1 de casa, el de la escuela o un archivo exportado de otra computadora. Nunca es automática: pide confirmación cuando la cuenta ya importó, hizo «Borrar todo» o cuando otra cuenta importó el mismo crudo. `progress_imports` guarda una fila por importación, con un índice por la huella del crudo, y cada una deja su informe. Descartadas: una sola por cuenta (B), que pierde el v1 de un segundo navegador y exigiría una excepción para restaurar con el archivo exportado antes de «Borrar todo»; y automática en el primer ingreso de cada navegador (C), que en una computadora compartida pasa el v1 de A a la cuenta de B, el riesgo que la crítica del ADR marcó como crítico. Decidió el usuario. (FR-027, FR-029)
- Q: **Q2**, ¿qué borra «Borrar todo»? → A: Opción A: sólo el estado de las seis áreas. Los intentos, sus payloads y las importaciones quedan hasta su retención (el crudo de cada importación, 90 días), y la supresión real es borrar la cuenta (C3b): la pantalla tiene que decirlo, y el aviso de privacidad (pregunta 14 del ADR 0006) tiene que nombrar que el código y el crudo del alumno sobreviven al reset hasta entonces. Queda abierto entre B2 y D1, no con el usuario: si la poda de payloads reconoce la última prueba aprobada y el último intento por los punteros de `exercise_progress`, que el reset borra, después de un reset esos payloads pasan a podarse a los 90 días, y los dos ítems tienen que acordar cuál de las dos cosas se quiere (ver «Relación con otras specs», B2). Descartadas: borrar también los intentos, los payloads y las importaciones (B), que rompe «permanente e inmutable» de los intentos (D26), le quita historia a las estadísticas del admin y obliga a decidir qué pasa con una ejecución que cierra después, aunque es la opción más fuerte para quien pide borrar sus datos (Ley 25.326, art. 16); y un gesto aparte para borrar también el historial de ejecuciones (C), que suma una ruta y una pantalla fuera de D1. Decidió el usuario. (FR-041, FR-042)
- Q: **Q3**, en una computadora compartida, ¿qué se hace con el espacio de la cuenta al salir? → A: Opción A: al salir se envía la cola y, si salió, se limpia el espacio; si no pudo enviarse, se le pregunta al alumno si lo conserva o lo descarta, y se le dice que lo no enviado vence a los 30 días. El ingreso ofrece «computadora compartida», que no guarda nada de progreso en el navegador. Al arrancar se borran los espacios ya sincronizados de otras cuentas, y los demás vencen a los 30 días. Riesgo residual: quien no sale de su sesión deja sus borradores en el navegador hasta que otro arranque la aplicación o venza el espacio (ADR 0006 §12). Descartadas: tratar siempre el navegador como compartido (B), sin trabajo sin conexión entre visitas ni caché, y con la pérdida de lo no enviado si se cierra la pestaña antes de sincronizar; y no limpiar nunca al salir (C), que deja el texto del alumno (borradores, reflexiones, notas) legible en el navegador hasta 30 días. Decidió el usuario. (FR-068 a FR-071)
- Q: **Q4**, ¿qué pasa con lo que el alumno resuelve antes de que A4 mueva las ejecuciones al servidor? → A: Opción A: el cliente de D1 (D1c) entra en servicio después de A4; el servidor de D1 (D1a y D1b), no. Desde el primer día de sincronización, lo resuelto sale del servidor, como manda la frontera de autoridad del ADR 0006 (§5.3, D39). Costo: el cliente depende también de A4 (que depende de B2 y A3) y, hasta entonces, el progreso de los alumnos sigue sólo local. Descartadas: sacar el cliente antes que A4 y dejar lo resuelto sólo local hasta entonces (B), una promesa a medias: el progreso «se sincroniza» menos lo más importante; y enmendar la frontera de D39 para que `/api/sync` acepte la resolución y el último resultado que declara el cliente mientras dure el período (C), un camino de escritura más que contradice el ADR y se tira cuando llega A4. Decidió el usuario. (FR-009, FR-079)
- Siguen como propuestas, porque esta ronda no las trató: las demás marcas «(propuesta)» de esta spec, la tabla «Ajustes al ADR 0006 que propone esta spec» y lo que el plan de D1a decide por su cuenta (research.md: la fusión en TypeScript, R1; el sobre de `/api/sync`, con `format: 2` y hasta 200 operaciones por lote, R5; `NULL` como «desconocida» en las fechas que sólo crecen, R6; el piso de reloj del 2020-01-01, R7; entre otras). Siguen así hasta que el usuario las vea o apruebe el ADR 0006.

### Las transversales que tocan a D1

No se cierran por ítem, sino para todo el épico; D1 usa los valores del ADR como supuestos y la pregunta que los cierra.

| Pregunta | Lo que D1 supone | Dónde |
| --- | --- | --- |
| §13.13, retenciones | `sync_operations` 14 días y crudo importado 90 días; siguen abiertos los días de logs y de respaldos y las cuentas inactivas | FR-037 y FR-055 |
| §13.14, Ley 25.326 | Los borradores, las reflexiones, las notas y los crudos importados son texto libre del alumno y pueden contener datos personales: el aviso de privacidad tiene que nombrarlos. Siguen abiertos el responsable de la base, la inscripción ante la AAIP y los menores de edad | Riesgos; FR-037, FR-057 |
| §13.15, carga | 1.000 cuentas activas en el pico (ADR 0006 S2) dimensionan los lotes y la medición SC-010 | FR-063 y SC-010 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mi progreso de hoy llega a mi cuenta sin perder nada (Priority: P1)

Una alumna que usó el taller hasta hoy tiene su progreso en las claves del navegador. Cuando ingresa con su cuenta, el taller le muestra un resumen de lo que encontró y le pregunta si es suyo. Al confirmar, ese progreso entra a su cuenta y puede verlo desde otro dispositivo. Si su cuenta ya tenía algo, se combina sin pisarlo.

**Why this priority**: es lo que hace que adoptar las cuentas no cueste el progreso (R9) y es el criterio de aceptación del ítem en la hoja de ruta.

**Independent Test**: con el stack levantado y las tres fixtures congeladas, importar cada una en una cuenta nueva, comparar la proyección v1 con el original, repetir la importación e importar sobre una cuenta que ya tiene datos de la versión 2.

**Acceptance Scenarios**:

1. **Dada** una cuenta nueva y las cuatro claves de master, **cuando** las importa con `source: storage`, **entonces** responde 201 con un informe y la proyección v1 conserva todos los datos de las cuatro secciones.
2. **Dados** los dos exports, **cuando** se importan en cuentas nuevas, **entonces** pasa lo mismo y el informe no omite nada.
3. **Dada** una importación ya aplicada, **cuando** se repite con la misma `importId` o con el mismo crudo en la misma época, **entonces** responde 200 con el informe guardado y no cambia nada.
4. **Dada** una cuenta con datos de la versión 2 (una reflexión con reloj real, un ejercicio resuelto por una ejecución del servidor), **cuando** importa un v1 que dice otra cosa, **entonces** el dato de la versión 2 se conserva, los logros se suman y lo que no tenía reloj cede.
5. **Dada** una cuenta que ya importó otro crudo, que alguna vez hizo «Borrar todo» o cuyo crudo ya importó otra cuenta, **cuando** importa, **entonces** responde 409 `import_needs_confirmation` sin decir cuál de los tres, y sólo se aplica al reenviar con `confirm`.
6. **Dado** un v1 con una fecha fuera del rango de la columna, con un sustituto suelto o con una posición de etapa que no existe, **cuando** se importa, **entonces** se aplica el resto y el informe nombra la ruta de lo que se omitió o se reemplazó.
7. **Dado** un navegador con progreso v1, **cuando** el cliente arranca, **entonces** no escribe, no respalda ni avisa hasta que el alumno responde «¿Este progreso es tuyo?», y recién con un sí envía.

*Cubre: FR-024 a FR-039, FR-072 y FR-073; SC-001.*

---

### User Story 2 - Trabajo en dos dispositivos y todo converge (Priority: P1)

Un alumno estudia en la computadora de casa y en el celular, a veces sin conexión. Cada dispositivo guarda lo suyo en el momento y lo envía cuando puede. El servidor combina campo por campo, y los dos terminan viendo lo mismo.

**Why this priority**: es el motivo de sacar el progreso del navegador, y la regla de fusión es donde un error pierde datos del alumno sin que nadie lo note.

**Independent Test**: el fixture de fusión (en Pest y en TypeScript) y dos clientes de prueba contra el stack, que editan sin conexión y sincronizan en los dos órdenes.

**Acceptance Scenarios**:

1. **Dados** dos dispositivos que editan campos distintos del mismo ejercicio sin conexión, **cuando** sincronizan, en cualquier orden, **entonces** los dos terminan con las dos ediciones.
2. **Dados** dos dispositivos que editan el mismo campo, **cuando** sincronizan, **entonces** gana el reloj más nuevo en los dos órdenes de llegada, y con relojes iguales gana la operación que llega después.
3. **Dado** un dispositivo con el reloj una hora adelantado, **cuando** envía un lote, **entonces** sus escrituras se fechan con la corrección del servidor y su hora como tope, y no ganan «para siempre».
4. **Dado** un paso marcado en un dispositivo y desmarcado después en otro, **cuando** los dos sincronizan, **entonces** queda desmarcado en los dos, y una marca más vieja no lo resucita.
5. **Dada** una predicción correcta o una ayuda declarada, **cuando** llega una escritura más nueva de otro dispositivo, **entonces** el logro no se pierde (sólo crece).
6. **Dada** una respuesta contestada con una versión de contenido anterior a la vigente, **cuando** llega, **entonces** se guarda pero no otorga la bandera (`stale_content`) y el cliente la vuelve a evaluar.
7. **Dado** un lote que el servidor aplicó y cuya respuesta se perdió, **cuando** el cliente lo reenvía, **entonces** todas las operaciones salen `duplicate` y no cambia nada.
8. **Dada** una operación que el cliente envió, **cuando** perdió la fusión, **entonces** la respuesta trae el valor ganador y el cliente actualiza su copia.

*Cubre: FR-001 a FR-023, FR-060 a FR-064 y FR-080 a FR-083; SC-002, SC-003 y SC-006.*

---

### User Story 3 - En una computadora compartida no se mezclan las cuentas (Priority: P1)

En un aula, los alumnos comparten navegador. Lo que uno guarda, importa o deja pendiente no lo ve, no lo recibe ni lo recoge el siguiente. Una pestaña que quedó abierta con otra cuenta no puede modificar nada.

**Why this priority**: es el riesgo que la crítica del ADR 0006 marcó como crítico en la importación (las claves v1 son globales del navegador), y equivocarse significa que el progreso de una persona termina en la cuenta de otra.

**Independent Test**: en un navegador real, A trabaja y sale, B ingresa; repetir con A sin conexión, con la pestaña de A abierta mientras B ingresa y con la opción «computadora compartida».

**Acceptance Scenarios**:

1. **Dado** A que sale con la cola enviada, **cuando** B ingresa en el mismo navegador, **entonces** el espacio de A está limpio y B no ve nada de A.
2. **Dado** A que sale sin conexión y elige conservar lo pendiente, **cuando** B ingresa, **entonces** B no ve ni recibe lo de A, que queda en su espacio hasta que A vuelva o pasen 30 días.
3. **Dada** una pestaña de A abierta, **cuando** B inicia sesión en otra pestaña y la de A intenta modificar algo, **entonces** recibe 409 `account_mismatch`, no reintenta y carga el espacio de B; y una foto que diga ser de B no se aplica en el espacio de A.
4. **Dado** el v1 que A importó, **cuando** B ingresa en el mismo navegador, **entonces** no se le ofrece (quedó archivado a nombre de A), y un v1 que nadie importó sí se le ofrece, con el resumen y la pregunta.
5. **Dada** la opción «computadora compartida», **cuando** el alumno estudia y cierra la pestaña, **entonces** no queda progreso en el almacenamiento, y el alumno estaba avisado de lo que perdía si no sincronizaba.
6. **Dado** el arranque con espacios de otras cuentas, **cuando** la aplicación arranca, **entonces** borra los ya sincronizados y deja los demás hasta que venzan a los 30 días.

*Cubre: FR-065 a FR-072 y FR-086; SC-004.*

---

### User Story 4 - Trabajo sin conexión y no pierdo nada (Priority: P2)

El alumno estudia aunque no tenga red. Todo queda en su navegador y sale solo cuando vuelve la conexión, sin duplicar nada y sin que él tenga que acordarse.

**Why this priority**: es la mitad «local primero» del pedido, y de ella depende que el taller no se vuelva más frágil que hoy.

**Independent Test**: cliente de prueba con red simulada que corta, devuelve 401, 419, 429 y 409 `client_outdated` en el medio de una cola larga.

**Acceptance Scenarios**:

1. **Dado** un alumno sin conexión, **cuando** estudia y edita, **entonces** todo queda en su copia local y en la cola, y escribir no espera a la red.
2. **Dada** una cola más grande que el límite del cuerpo, **cuando** vuelve la red, **entonces** sale en varios lotes, sin pasar de 60 pedidos por minuto, y el estado queda al día.
3. **Dada** una sesión vencida (401), **cuando** el cliente intenta enviar, **entonces** conserva la cola y pide el ingreso; si entra la misma cuenta sigue, y si entra otra carga el espacio de esa.
4. **Dado** un 419, **cuando** el cliente pide `GET /api/session` y la cuenta es la misma, **entonces** reintenta una vez; si cambió, no reintenta.
5. **Dado** un 429, **cuando** llega con `Retry-After`, **entonces** el cliente espera ese tiempo.
6. **Dada** una pestaña vieja después de un despliegue, **cuando** recibe 409 `client_outdated`, **entonces** conserva la cola y pide recargar.
7. **Dado** el laboratorio todavía sobre los Playgrounds (antes de A4), **cuando** el alumno resuelve un ejercicio, **entonces** su resolución queda en el espacio local y sigue ahí después de recargar, y el cliente no la envía, porque la sincronización no la escribe (Q4).

*Cubre: FR-009, FR-060 a FR-064, FR-076 a FR-079 y FR-085; SC-003 y SC-008.*

---

### User Story 5 - «Borrar todo» deja la cuenta en cero y se propaga (Priority: P2)

Una alumna que quiere empezar de nuevo confirma su contraseña y borra todo. Su cuenta queda sin progreso en todos sus dispositivos, y ninguno que haya quedado atrás puede volver a escribir lo borrado.

**Why this priority**: es la única operación destructiva del alumno sobre su progreso, y el motivo de la época: sin ella, una pestaña vieja resucitaría lo borrado.

**Independent Test**: reset con dos clientes de prueba, uno de los cuales quedó con una cola pendiente; después, restaurar con el archivo exportado antes.

**Acceptance Scenarios**:

1. **Dado** un alumno con progreso, **cuando** confirma su contraseña y borra todo, **entonces** responde 200 `{epoch, revision}`, las tablas de estado de su cuenta quedan vacías y los intentos siguen donde estaban.
2. **Dado** un alumno sin la contraseña confirmada, **cuando** pide el borrado, **entonces** responde 423 `password_confirmation_required` y no cambia nada.
3. **Dado** otro dispositivo con una cola pendiente, **cuando** sincroniza después del borrado, **entonces** recibe 409 `epoch_mismatch` con `{epoch, revision}` y no escribe nada; el cliente guarda una copia descargable de lo pendiente, carga el estado vacío y se lo avisa al alumno.
4. **Dado** un archivo exportado antes del borrado, **cuando** el alumno lo importa después, **entonces** se aplica (con confirmación) y el progreso queda como estaba, y no se responde un 200 vacío.
5. **Dado** un cuarto borrado en el mismo día, **cuando** lo pide, **entonces** recibe 429 con `Retry-After`.
6. **Dada** una ejecución admitida antes del borrado que cierra después, **cuando** cierra, **entonces** deja su intento como historia y no toca el estado de la época nueva.

*Cubre: FR-040 a FR-045, FR-074 y FR-075; SC-005.*

---

### User Story 6 - El contenido cambia y mi progreso sigue valiendo (Priority: P2)

El currículo se actualiza: se corrige una prueba, se retira un ejercicio, las etapas de un taller se identifican por su id. Lo que el alumno ya hizo no se pierde ni se mezcla.

**Why this priority**: el progreso referencia el contenido, y v1 marcaba las etapas por posición, que se rompe si el contenido se reordena (ADR 0006 D14).

**Independent Test**: publicar el contenido con los ids de etapa; importar un v1 con etapas por posición; cambiar la versión del contenido entre dos sincronizaciones; retirar un ejercicio con progreso.

**Acceptance Scenarios**:

1. **Dado** el contenido publicado, **cuando** se pide cada porción de talleres, **entonces** cada etapa trae su id, y las otras 13 porciones y los 274 `content_hash` no cambian un byte.
2. **Dado** un v1 con etapas marcadas por posición, **cuando** se importa, **entonces** cada posición se guarda con el id de su etapa y la lista vuelve en su orden de v1.
3. **Dada** una versión de contenido distinta de la que el cliente conocía, **cuando** sincroniza, **entonces** recibe la foto completa, y una prueba aprobada cuya corrección cambió figura como «cambió, volvé a verificarlo» sin que se borre nada.
4. **Dado** un ejercicio retirado con progreso, **cuando** el alumno sincroniza, **entonces** su progreso se conserva y se lee, y una operación sobre ese ejercicio se aplica igual.

*Cubre: FR-005, FR-007, FR-017, FR-020 a FR-022 y FR-046 a FR-050; SC-007.*

---

### User Story 7 - Quien opera y quien mantiene el taller (Priority: P3)

Quien opera el taller sabe cuánto pueden pedir los clientes, qué se poda y cuándo, y que la supresión de una cuenta se lleva todo. Quien mantiene el sistema tiene un solo fixture que fija cada regla de fusión para los dos lenguajes.

**Why this priority**: es lo que mantiene a D1 operable con infraestructura mínima y evita que las dos implementaciones de la regla se separen sin que nadie lo vea.

**Independent Test**: la prueba de esquema, la de límites, la poda con el reloj adelantado y el cambio de una regla en un solo lenguaje.

**Acceptance Scenarios**:

1. **Dado** un cambio de una regla de fusión en un solo lenguaje, **cuando** corren las pruebas, **entonces** falla el fixture.
2. **Dados** los límites de ritmo y de tamaño, **cuando** se superan, **entonces** responden 429 con `Retry-After` o 413, sin escribir nada.
3. **Dadas** operaciones de más de 14 días y crudos de más de 90, **cuando** corre la poda, **entonces** se borran por lotes sólo ellos, y una importación repetida se sigue detectando por el sha256.
4. **Dada** una cuenta con todas las tablas pobladas, **cuando** se la borra, **entonces** `DELETE FROM users` no falla y no deja filas.
5. **Dada** una corrida completa de sincronización e importación, **cuando** se revisa el log, **entonces** ninguna línea lleva borradores, reflexiones, notas ni crudos.

*Cubre: FR-051 a FR-059 y FR-080 a FR-088; SC-008 a SC-011.*

---

### Edge Cases

- **Dos pestañas de la misma cuenta y del mismo navegador** comparten el espacio y los almacenes. Las dos pueden enviar la misma operación: la segunda recibe `duplicate`.
- **Sin conexión durante días y con la sesión vencida:** la cola espera en el espacio de la cuenta. Si ingresa la misma cuenta, sigue; si ingresa otra, la cola queda hasta que su dueña vuelva o venza a los 30 días.
- **Una cola enorme** (el alumno editó cientos de borradores sin conexión): el cliente la parte en lotes; un lote con más operaciones que el máximo se rechaza entero con 422, sin aplicar nada.
- **El reloj del dispositivo** está adelantado o atrasado: el servidor corrige por lote y pone su hora como tope; con más de 2 minutos de desfase, el cliente avisa. Un reloj muy atrasado pierde las fusiones, y lo único que puede hacer el sistema es avisarlo.
- **El contenido cambió mientras el alumno editaba sin conexión:** la foto completa reemplaza lo que el cliente conocía y las respuestas viejas salen `stale_content`.
- **Un ejercicio, un mundo o un taller retirado:** el progreso se conserva y se lee, y las operaciones sobre él se aplican igual, porque rechazarlas descartaría lo último que el alumno escribió sobre algo que ya no ve (propuesta).
- **El primer ingreso de una cuenta,** sin v1 y sin cabecera: la foto está vacía (época 1, revisión 0) y leerla no crea nada.
- **Una restauración del respaldo del servidor** lo deja atrás de algunos clientes: si el cliente conoce una revisión mayor que la del servidor, recibe la foto completa. Recuperar lo que los clientes tienen de más queda fuera (propuesta).
- **La cuenta se deshabilita o entra en supresión durante una sincronización:** el servidor responde 403 `account_disabled` o 401 (C3a) y la cola queda en el espacio.
- **Importar con una cuenta que ya tiene datos de la versión 2:** se combinan con la semántica legada y nunca pisan un reloj real.
- **El mismo crudo en otra cuenta:** responde 409 `import_needs_confirmation` sin decir de quién.
- **Un crudo ilegible o con datos que los parsers v1 no reconocen:** el cliente lo trata como hoy (copia de respaldo y aviso, ADR 0003) y no envía lo que los parsers descartan sin avisar.
- **Restaurar con el archivo que se exportó antes de «Borrar todo»** es un caso principal: el README manda exportar una copia al terminar una etapa. Por eso la idempotencia se mide dentro de la época.
- **«Borrar todo» sin conexión** no está disponible: la contraseña se confirma en el servidor. Dos «Borrar todo» seguidos desde dos dispositivos: el segundo recibe `epoch_mismatch`.
- **Un navegador con almacenamiento bloqueado o lleno** funciona como el modo compartido: la cola vive en memoria y el cliente avisa (ADR 0003, estado `unavailable`).
- **Una operación sobre un campo que sólo escribe el cierre de B2 o la importación** se rechaza con `invalid`.
- **Un lote con una operación inválida y otras válidas** aplica las válidas; el lote sólo falla entero ante un error del servidor, y entonces se reenvía igual.
- **La cuenta de un admin** es una cuenta más: tiene su progreso y las mismas reglas (ADR 0006 S5).

## Requirements *(mandatory)*

### Functional Requirements

Cada campo del progreso sigue una de estas familias. La tabla no repite los tipos de columna ni las restricciones, que están en el ADR 0006 §5.3.

| Familia | Regla | Campos | Quién escribe |
| --- | --- | --- | --- |
| Sólo crece | OR de banderas, máximo o unión | Predicción correcta (de ejercicio y de taller) con su fecha; ayuda y solución vista; checkpoint aprobado con su fecha; pistas vistas (con tope en las del ejercicio); objetivos observados de un taller | La sincronización; la importación |
| Sale de las ejecuciones del servidor | Fecha de resolución más temprana; última prueba aprobada y último intento por `(attempted_at, id)`; conteo de la época | Resuelto, resuelto en el servidor, prueba aprobada, último intento, conteo e intentos | El cierre de B2; la importación, sólo la fecha de resolución y los punteros que están vacíos |
| Gana la última escritura | Un reloj por campo, o uno solo por grupo | Respuesta de predicción; reflexión; prueba propia; grupo de repaso (confianza, repasado y próximo repaso); última respuesta de un checkpoint; respuesta y nota de un taller; respuestas del quiz del recorrido; notas del recorrido; preferencias (idioma, minutos de foco, ejercicio abierto por lenguaje) | La sincronización; la importación, con reloj vacío |
| Lápida con fecha | Igual que la anterior; desmarcar escribe una lápida con su fecha | Etapas marcadas de un taller; pasos, hitos y favoritos del recorrido; el borrador («restaurar inicio») | La sincronización; la importación, con reloj vacío |
| Sólo la importación | Se guarda como lo dejó v1 | Sellos de campaña; sello de código de un taller; contador de intentos v1 | La importación |

**Fusión y reglas por campo** *(servidor)*

- **FR-001**: Cada campo del progreso DEBE seguir exactamente una de las familias de la tabla anterior, y sólo el servidor decide el resultado de una fusión. *(ADR 0004 §3; ADR 0006 D22 y D39)*
- **FR-002**: El servidor DEBE fijar el reloj de cada operación como `min(at + (ahora − sentAt), ahora)`, con su propia hora, y guardar el desfase que aplicó a cada lote. Así un dispositivo con el reloj adelantado no gana «para siempre». *(D22, D23)*
- **FR-003**: Con relojes iguales DEBE ganar la operación que llega después; frente a un reloj vacío (legado) gana el valor con reloj; en lo importado, vacío significa «anterior a todo». *(D09, D22)*
- **FR-004**: DEBE aplicar en un orden único, bajo el candado de la cuenta, todo lo que escribe progreso (sincronización, importación, reset y el cierre de B2), de modo que dos dispositivos o dos pestañas no se pisen y cuentas distintas no esperen entre sí. *(D08)*
- **FR-005**: Las operaciones DEBEN referir el contenido por su clave estable (ejercicio, mundo, taller, objetivo, etapa, paso o recurso del recorrido), nunca por posición. Una referencia desconocida rechaza esa operación con el motivo `unknown_reference` y no frena el resto del lote. *(D14, D23)*
- **FR-006**: DEBE validar de cada operación la forma, los tipos, los rangos y los tamaños, medidos en bytes contra la columna. Por ejemplo: las pistas vistas hasta las que tiene el ejercicio, una respuesta dentro de las opciones del contenido y los minutos de foco en 15, 25 o 45. Lo inválido se rechaza con el motivo `invalid` o `out_of_range`. Los topes de texto son los de v1 (borrador 30.000 caracteres, reflexión 10.000, prueba propia 3.000, notas del recorrido 20.000, y los demás de v1). *(§8)*
- **FR-007**: Cada respuesta a una pregunta (predicción, checkpoint, quiz del recorrido, predicción de taller) DEBE llevar la versión del contenido con que se contestó. Si no es la vigente, el servidor guarda la respuesta por la regla de reloj pero no otorga la bandera que sólo crece (resultado `stale_content`), y el cliente la vuelve a evaluar con el contenido nuevo. *(D23)*
- **FR-008**: La corrección de predicciones, checkpoints y quiz, las fechas de repaso, la XP y los sellos derivados DEBE decidirlas el cliente, como hoy. El servidor valida forma y rango y aplica la regla de fusión; la XP y los sellos derivados no se guardan. *(D39)*
- **FR-009**: La sincronización NO DEBE escribir lo que sale de las ejecuciones del servidor (resuelto, prueba aprobada, último intento, conteo) ni lo que sólo trae la importación (sellos de campaña, sello de código de un taller, contador v1): una operación que lo intente se rechaza con `invalid`. *(D39, §5.3)*
- **FR-010**: La revisión de la cuenta DEBE subir una vez por transacción que cambia algo, y cada fila que esa transacción cambió DEBE llevar la revisión nueva. Vale también para el cierre de B2. Una transacción que no cambia nada (todo duplicado, rechazado o sin efecto) no sube la revisión. Sin esto, el delta omitiría filas. *(§5.3, D25)*
- **FR-011**: Ninguna operación ni importación DEBE borrar filas de estado: lo que el alumno puede desmarcar queda como lápida. Sólo «Borrar todo» borra filas, y lo hace subiendo la época, de modo que un delta nunca tiene que informar un borrado. *(D23, D26)*

**Sincronización** *(servidor)*

- **FR-012**: `POST /api/sync` DEBE recibir `{epoch, sentAt, knownRevision, knownContentVersion, format, operations[]}` y responder `{epoch, revision, serverTime, contentVersion, results[], changes}`. Exige sesión activa, email verificado, CSRF y la cuenta esperada. *(D23, §7)*
- **FR-013**: El lote DEBE aplicarse en una sola transacción: se confirma entero, con un resultado por operación, o no queda nada y reenviarlo es seguro. *(D23, §8)*
- **FR-014**: Cada operación DEBE llevar un UUID v4 que genera el cliente. El servidor lo recuerda por cuenta, con un hash del contenido de la operación y también si la rechazó: el mismo UUID con el mismo hash es `duplicate` y no cambia nada; con otro contenido es `uuid_reused`. Lo recuerda 14 días. *(D23, §5.3)*
- **FR-015**: Los resultados por operación DEBEN ser `applied`, `rejected` (con su motivo: `unknown_reference`, `invalid` u `out_of_range`), `duplicate`, `uuid_reused` y `stale_content` (aplicada, sin su bandera). Van en el cuerpo de un 200, no como estado HTTP. *(§8)*
- **FR-016**: DEBE exigir la época vigente: si no coincide responde 409 `epoch_mismatch` con `{epoch, revision}`, antes de aplicar nada y sin recordar los UUID del lote. *(D23, §8)*
- **FR-017**: `changes` DEBE traer todo lo que cambió desde `knownRevision`, incluido lo que cambiaron las operaciones de este mismo lote (así el cliente se entera de lo que perdió una fusión). Trae la foto completa si `knownRevision` es 0 o falta, o si `knownContentVersion` no es la vigente, porque un import de contenido puede cambiar un `grading_hash` o retirar contenido sin mover la revisión de la cuenta. También la trae, como propuesta de esta spec, si `knownRevision` es mayor que la del servidor (una restauración del respaldo). *(D23)*
- **FR-018**: DEBE responder 409 `account_mismatch` (C3a), 409 `client_outdated` si ya no acepta el `format`, 422 `validation_failed` si el sobre es inválido o trae más operaciones que el máximo que fije el plan, 413 si el cuerpo supera 2 MiB, 401 sin sesión y 429 con `Retry-After` al pasar de 60 por minuto y cuenta. *(§7, §8)*
- **FR-019**: La primera sincronización de una cuenta sin cabecera de progreso DEBE crearla (época 1, revisión 0), y todo cambio DEBE actualizar la última actividad que ve el admin. Una lectura nunca escribe. *(D08, §5.3)*

**Lectura** *(servidor)*

- **FR-020**: `GET /api/progress` DEBE responder sólo lo propio (la cuenta sale de la sesión) con una foto consistente, leída en un único snapshot: la cuenta (`userId`, propuesta de esta spec: el ADR no lo lista), la época, la revisión, `resetAt`, `contentVersion`, todas las áreas con sus relojes y lápidas, el estado de cada prueba aprobada (`vigente`, `cambió` o `legado`) y los resúmenes de los intentos, sin código ni salidas completas. Incluye lo retirado. *(§7, D15)*
- **FR-021**: La respuesta DEBE traer el validador `W/"u<cuenta>.e<época>.r<revisión>.c<contentVersion>"` con `Cache-Control: private, no-store`; el cliente manda `If-None-Match` a mano y recibe 304 si nada cambió. No lleva el límite de ritmo de Laravel; rige el de Nginx por IP. *(D25, §3.1)*
- **FR-022**: «Cambió, volvé a verificarlo» DEBE calcularse al leer, comparando el `grading_hash` con que se verificó el intento aprobado con el vigente. No se borra ni se reinicia nada. *(D15)*
- **FR-023**: La foto DEBE armarla un único lector que comparten `GET /api/progress`, la respuesta completa de la sincronización y la exportación del titular (C3b).

**Importación del v1** *(servidor)*

- **FR-024**: `POST /api/progress/import` DEBE recibir `{importId, epoch, source, raw, normalized, confirm}` y exigir sesión activa, email verificado, CSRF y la cuenta esperada. `source` es `storage` (las cuatro claves del navegador) o `export` (un archivo de «Exportar mi progreso»); `normalized` es la salida de los parsers v1 congelados, que ya corren en el navegador; `raw` es el texto v1 tal cual, que el servidor guarda sin interpretarlo, hasta 10 MiB. *(D24)*
- **FR-025**: DEBE rechazar con 422 `validation_failed`, sin escribir nada, un `normalized` con campos desconocidos o con tipos, rangos, ids o tamaños inválidos. La normalización NO se reescribe en el servidor. *(D24)*
- **FR-026**: DEBE aplicar `normalized` con la semántica legada: lo importado sin reloj es anterior a todo, los punteros (última prueba, último intento) sólo se escriben si no tienen valor, y los logros se combinan con las reglas de «sólo crece». Una importación NUNCA pisa un dato de la versión 2 ni un reloj real. *(D24, §5.3)*
- **FR-027**: *(Q1)* Una cuenta DEBE poder importar varias copias v1 (la de casa, la de la escuela, un archivo de otra computadora). Cada una se combina con las reglas legadas y queda registrada con su informe. *(S9)*
- **FR-028**: La misma `importId`, o el mismo crudo (por su sha256) de la misma cuenta **en la época vigente**, DEBE devolver 200 con el informe guardado y no cambiar nada. Un crudo importado antes de un «Borrar todo» NO cuenta como repetido: se aplica de nuevo, con la confirmación de FR-029. *(D24, con la época como ajuste de esta spec: ver «Relación con otras specs»)*
- **FR-029**: *(Q1)* DEBE responder 409 `import_needs_confirmation`, sin decir cuál de los tres motivos, si la cuenta ya importó otro crudo, si alguna vez hizo «Borrar todo» o si otra cuenta importó el mismo crudo. El cliente pregunta y reenvía con `confirm`. *(D24)*
- **FR-030**: *(propuesta: el ADR no fija el orden)* DEBE resolver un pedido en este orden: tamaño (413, que responde Nginx antes de que el pedido llegue a la aplicación); sesión, CSRF y cuenta esperada (401, 419, 409 `account_mismatch`); época (409 `epoch_mismatch` con `{epoch, revision}`); forma (422); repetido en la época (200 con el informe guardado); confirmación necesaria y sin `confirm` (409 `import_needs_confirmation`); y si no, se aplica y responde 201.
- **FR-031**: Cada `result` v1 DEBE dejar un intento legado con la huella `code_sha256` de su código, el veredicto de cada prueba y su payload (código, prueba propia y salidas). Se omiten los que ya existen en el servidor (por el id de intento que A4 guarda en el `result`, o por coincidir en ejercicio y código con un intento del servidor dentro de ±10 minutos), y entre legados se deduplica por ejercicio, fecha y huella del código. No cuentan como intento del alumno ni suben el conteo de la época. *(D24, D26)*
- **FR-032**: DEBE traducir las posiciones de etapa de v1 a su id con el índice v1 congelado que ya guarda el contenido, y conservar la posición original para devolver cada lista en su orden de v1. Una posición sin etapa se omite y se informa con su ruta. *(D14)*
- **FR-033**: Lo que v1 acepta y el servidor no puede guardar DEBE tratarse así: las fechas fuera del rango de la columna se omiten y se informan con su ruta; los sustitutos sueltos (surrogates) pasan a U+FFFD con aviso; el crudo admite hasta 10 MiB. Nada se omite sin informe. *(D24)*
- **FR-034**: La importación DEBE confirmarse entera o no dejar nada, subir la revisión una vez y responder 201 con un informe: filas escritas por área, omisiones con su ruta y conflictos. El informe se guarda con la época y la revisión, y un reintento lo devuelve. *(§5.3)*
- **FR-035**: DEBE escribir los sellos de campaña tal como v1 los guarda (incluidos los que están todos en falso), el sello de código de los talleres y el contador de intentos v1. En v2 el cliente deriva los sellos desde el progreso del ejercicio. *(§5.3)*
- **FR-036**: DEBE limitar las importaciones a 3 por hora y cuenta (429 con `Retry-After`) y el cuerpo a 24 MiB (413). *(§4.6)*
- **FR-037**: *(propuesta, pregunta 13)* El crudo DEBE conservarse 90 días; después quedan su sha256 y el informe. *(D30)*
- **FR-038**: Criterio de aceptación, sin pérdida. Sobre las tres fixtures (las cuatro claves de master y los dos exports) y por sección (recorrido, laboratorio, campaña y Sistemas), `isLosslessNormalization(original, proyección)` DEBE dar verdadero, e importar dos veces DEBE dar el mismo resultado. En un export, el recorrido son los campos de primer nivel y las otras tres secciones son sus subobjetos. Quedan fuera, por nombre, `exportedAt` (metadato del archivo, que sólo vive dentro del crudo) y los marcadores `version` (valen 1 y los pone la proyección). *(D24; roadmap, criterios globales)*
- **FR-039**: La proyección de las tablas hacia v1 DEBE vivir en las pruebas, con tres reglas: una fila por registro v1 aunque esté vacío; los arreglos salen en el orden de la posición v1 y después de `created_at`; los sellos salen crudos. El normalizado que genera TypeScript, como oráculo independiente, DEBE coincidir con lo guardado. D1 NO agrega una ruta que devuelva el formato v1. *(D24)*

**«Borrar todo»** *(servidor)*

- **FR-040**: `POST /api/progress/reset` DEBE exigir sesión activa, CSRF, la cuenta esperada, la época vigente y la contraseña confirmada (423 `password_confirmation_required`), con un límite de 3 por día y cuenta. *(§7, D19, §4.6)*
- **FR-041**: DEBE, en una transacción y bajo el candado de la cuenta, subir la época, fijar `resetAt`, borrar todas las filas de estado de la cuenta (las seis áreas, las preferencias incluidas) y subir la revisión, y responder 200 `{epoch, revision}`. Después cancela las ejecuciones activas, cada una en su propio cierre. *(D08, D26)*
- **FR-042**: *(Q2)* DEBE dejar intactos los intentos, sus payloads y las importaciones registradas, hasta su retención: son historia de épocas anteriores. La supresión real de los datos del alumno es borrar la cuenta (C3b).
- **FR-043**: Desde el reset, toda sincronización o importación con la época anterior DEBE recibir 409 `epoch_mismatch` con `{epoch, revision}` y no escribir nada, y la foto de la época nueva está vacía. De dos «Borrar todo» seguidos desde dos dispositivos, el segundo recibe `epoch_mismatch`.
- **FR-044**: Una ejecución admitida antes del reset que cierra después DEBE dejar su intento como historia sin tocar el estado. D1 repite con el reset real el escenario que B2 prueba subiendo la época a mano. *(D26)*
- **FR-045**: El reset NO DEBE tocar la cuenta, la sesión ni nada que no sea progreso, y DEBE dejar a la cuenta con la confirmación obligatoria al importar (por `resetAt`). *(D24)*

**Contenido: el id de etapa** *(servidor y generador)*

- **FR-046**: Las cuatro porciones de talleres (`workshops.lowlevel`, `workshops.infra`, `workshops.play` y `workshops.pc`) DEBEN publicar el id de cada etapa (`e1` a `eN`; hoy son 100, en 25 talleres), con el orden de claves que fije el generador. *(D14)*
- **FR-047**: Nada más DEBE cambiar. Las otras 13 porciones conservan sus bytes y sus validadores, los 274 ejercicios su `content_hash` y su `grading_hash`, y `qa/fixtures/workshop-steps-v1.json` queda como está. `Content-Version` sí cambia, porque cambia el documento, y el primer import lo informa.
- **FR-048**: El índice v1 de cada etapa NO DEBE publicarse: el servidor traduce la posición a la clave al importar (FR-032). *(D14)*
- **FR-049**: El oráculo `dump-globals` DEBE cambiar a propósito, en el mismo commit TDD que la publicación y sólo en lo que sale de las etapas, y las vistas legacy de Sistemas DEBEN seguir funcionando con una etapa que ahora trae `id`. El id sigue siendo inmutable y no se reutiliza. *(C2 FR-029 y FR-030)*
- **FR-050**: La entrega de C2 DEBE servir las cuatro porciones con los bytes del generador, y el tipo de registro de la etapa que dejó C6 DEBE aceptar el id. `npm run api:content:check` y la prueba de contrato lo comprueban.

**Esquema y operación** *(servidor)*

- **FR-051**: D1 DEBE crear las 12 tablas del ADR 0006 §5.3 (`sync_operations`, `progress_imports`, `drafts`, `campaign_seals`, `campaign_checkpoints`, `workshop_progress`, `workshop_observations`, `workshop_step_marks`, `route_marks`, `route_quiz_answers`, `route_notes` y `preferences`), cada una en un único `CREATE TABLE` con sus claves, FK e índices, y NO DEBE alterar `progress_heads` ni `exercise_progress`: lo que le falte a B2 se le informa antes de que cierre su plan. *(D28, D35)*
- **FR-052**: Las reglas de fila que tocan columnas de fecha (por ejemplo, la lápida de `drafts` o `marked = 1 OR set_at IS NOT NULL`) DEBEN quedar en el escritor y en su prueba, y no declararse en la tabla, por el resultado de C2 sobre D07 (con un CHECK sobre DATETIME, ampliar un ENUM no es INSTANT en 9.7; propuesta, ver «Ajustes al ADR 0006»). Las demás llevan el nombre `<tabla>_<regla>_check`. La prueba de D32 decide, antes de crear las tres tablas de taller, si `language` es ENUM o VARCHAR con FK. *(D07, D32)*
- **FR-053**: Todo `user_id` DEBE tener su FK con CASCADE hacia `users`. Las tablas de D1 entran en la supresión de la cuenta (`sync_operations` por lotes) y en la exportación del titular (`UserData`, C3b), y la prueba de esquema las cubre. La importación escribe los punteros con una sentencia unida por la cuenta del intento, y una prueba de esquema busca punteros cruzados entre cuentas. *(D06, D29, §8)*
- **FR-054**: Un escritor de una cuenta (sincronización, importación o reset) NO DEBE esperar a los de otras cuentas, y la lectura de la foto DEBE ser consistente, de un único snapshot. El aislamiento, la forma de los upserts y el orden de sus asignaciones los fija el plan, con D08 y D09. *(D08, D09)*
- **FR-055**: `sync_operations` DEBE podarse a los 14 días y `raw_payload` a los 90, por lotes de 5.000, desde el `scheduler` de C3a. Después de la poda, reenviar un UUID viejo no pisa nada más nuevo: lo decide el reloj. *(D30)*
- **FR-056**: Los límites de ritmo de Laravel (sincronización 60 por minuto y cuenta, importación 3 por hora, reset 3 por día) son de D1, sobre el mecanismo de C3a. Las zonas `limit_req` de Nginx por IP son de C3 y deben responder 429. D1 agrega las ubicaciones de Nginx con tope de cuerpo (`/api/sync` 2 MiB y `/api/progress/import` 24 MiB) y sube `post_max_size` de PHP a 24 MiB. *(§4.6, §10)*
- **FR-057**: Ninguna ruta de D1 DEBE recibir `user_id`: la cuenta sale de la sesión y lo ajeno responde 404. Los logs llevan el id del pedido y la cuenta, y NO DEBEN llevar borradores, reflexiones, notas ni crudos. *(D19, §8)*
- **FR-058**: Los sobres DEBEN llevar `format`. El servidor acepta el vigente y el anterior (compatibilidad N-1) y responde 409 `client_outdated` ante otro, sin que el cliente descarte su cola. *(§8)*
- **FR-059**: Las migraciones DEBEN ir sólo hacia adelante (un `down()` destruiría progreso). El código DEBE pasar Pint y el análisis estático en el nivel que deja C6 (el 9, sin baseline), y D1 NO DEBE agregar paquetes de Composer ni de npm sin permiso del usuario. *(§10; constitución, principio VII)*

**Cliente v2** *(navegador; sin pantallas)*

- **FR-060**: El navegador DEBE guardar, en el espacio de la cuenta, una copia local del progreso (con el reloj de cada campo y sus lápidas), la cola de operaciones pendientes y lo último que supo del servidor (época, revisión, versión del contenido y validador). El alumno DEBE poder estudiar y editar sin conexión, y escribir nunca espera a la red. *(D25; ADR 0004 §4)*
- **FR-061**: El cliente DEBE montarse sobre los almacenes singleton con suscripción que deja F2 (recorrido, laboratorio, campaña y Sistemas) y NO DEBE abrir otra instancia de almacén sobre una clave, porque dos instancias se comportan como dos pestañas (ADR 0003). Las vistas siguen leyendo lo mismo que hoy: D1 cambia dónde y cómo se persiste, no lo que las vistas ven.
- **FR-062**: Cada cambio del alumno DEBE entrar a la cola como operaciones con UUID v4 (por `crypto.getRandomValues`, que sirve también fuera de contexto seguro) y sellarse con `Date.now()` más el desfase que informa `serverTime`. Los cambios sucesivos de un mismo campo DEBEN juntarse en uno que conserva el último valor: el almacenamiento local sigue guardando cada tecla, como hoy, pero la red no recibe un pedido por tecla. *(D23)*
- **FR-063**: *(propuesta)* DEBE sincronizar al arrancar, al volver la conexión, al volver a la pestaña, poco después de un cambio y al salir, partiendo la cola en lotes que entren en el límite del cuerpo, sin pasar de 60 pedidos por minuto y sin consultar más de una vez por minuto cuando no hay cambios pendientes. Las esperas exactas las fija el plan con la medición de SC-010.
- **FR-064**: Un lote sin respuesta DEBE reenviarse igual (es idempotente). Una operación `applied`, `duplicate` o `rejected` sale de la cola (la rechazada se informa) y `stale_content` se vuelve a evaluar. El cliente aplica `changes` a su copia respetando lo que perdió una fusión.
- **FR-065**: Todo pedido que modifica DEBE llevar `X-Taller-User` con la cuenta del espacio. Ante 419 o 401, antes de reintentar, DEBE comparar `GET /api/session` con la cuenta que tiene en memoria: si cambió, descarta el estado en memoria, carga el espacio de la cuenta nueva y NO reintenta. Ante 409 `account_mismatch`, carga el espacio de la cuenta actual. *(D36)*
- **FR-066**: DEBE descartar, sin aplicarla, toda foto o delta que diga ser de otra cuenta que la de su espacio: una pestaña que quedó con la cuenta anterior lee con la sesión de la nueva. *(propuesta, ver FR-020)*
- **FR-067**: La copia local, la cola y lo último que supo del servidor DEBEN vivir en un espacio propio de cada cuenta (`taller-v2:<id de la cuenta>:…`), y el cliente NUNCA lee ni escribe el espacio de otra cuenta. *(D25)*
- **FR-068**: *(Q3)* Al salir, el cliente DEBE enviar la cola antes de cerrar la sesión. Si la envió, limpia el espacio de la cuenta; si no pudo, le pregunta al alumno si lo conserva o lo descarta, y le dice que lo no enviado vence a los 30 días. *(D25)*
- **FR-069**: *(Q3)* Al arrancar, DEBE borrar los espacios de otras cuentas que ya estén sincronizados y vencer a los 30 días los que no. *(D25)*
- **FR-070**: *(Q3)* El ingreso DEBE ofrecer una opción «computadora compartida» que no guarda nada de progreso en el navegador: la cola vive en memoria y el alumno sabe que, si cierra la pestaña antes de sincronizar, pierde lo no enviado. Si el navegador no deja escribir su almacenamiento, el cliente funciona igual en ese modo y lo avisa. *(D25; ADR 0003)*
- **FR-071**: Cada camino que descarta datos locales DEBE decir antes qué se pierde, o dejar antes una copia descargable: la cola de una época anterior (copia y aviso, FR-075), lo no enviado que vence a los 30 días (aviso al salir, FR-068), lo que el alumno elige descartar al salir (confirmación) y el modo compartido (aviso al ingresar). *(ADR 0003, decisión 3)*
- **FR-072**: El cliente NO DEBE escribir ni borrar las cuatro claves v1 ni sus respaldos mientras no haya una importación confirmada: arrancar con las fixtures congeladas no escribe, no respalda ni avisa (lo que `qa/boot-check.ts` ya afirma). El único cambio que sufren es éste: después de una importación 201 o 200, pasan con sus respaldos a un archivo de la cuenta (`taller-v1-importado:<id>`) y no se le ofrecen a otra cuenta del mismo navegador. *(D24)*
- **FR-073**: Si el navegador tiene progreso v1 sin importar, el cliente DEBE mostrar un resumen (cuántos ejercicios resueltos y la fecha del último resultado), preguntar «¿Este progreso es tuyo?» y enviar sólo con un sí. Ante 409 `import_needs_confirmation` DEBE volver a preguntar y reenviar con `confirm`. La normalización la hacen los parsers v1 congelados. *(D24)*
- **FR-074**: «Borrar todo» DEBE pedir la contraseña (ante 423 la reconfirma), llamar al reset, limpiar el espacio de la cuenta y cargar la foto de la época nueva. NO DEBE tocar las claves v1 que la cuenta no importó (pueden ser de otra persona del mismo navegador) ni el espacio de otra cuenta, y no está disponible sin conexión.
- **FR-075**: *(propuesta)* Ante 409 `epoch_mismatch`, el cliente NO DEBE reenviar su cola: guarda una copia descargable de lo pendiente, carga la foto de la época nueva y lo avisa. Reenviarla resucitaría lo que otro dispositivo borró.
- **FR-076**: Ante 401 DEBE conservar la cola en el espacio y pedir el ingreso (si entra la misma cuenta sigue, si entra otra carga la suya); ante 429 DEBE esperar `Retry-After`; ante 409 `client_outdated` DEBE conservar la cola y pedir recargar. *(§4.2, §8)*
- **FR-077**: DEBE exponer su estado (al día, pendiente, sin conexión, requiere ingreso, atrasado) y las acciones que el front necesita (importar, borrar todo, salir, elegir el modo compartido). No dibuja pantallas.
- **FR-078**: DEBE avisar si el desfase de su reloj con el servidor supera 2 minutos. *(D23)*
- **FR-079**: *(Q4)* Hasta que A4 mueva las ejecuciones al servidor, lo que el alumno resuelve en el navegador queda en su espacio local y no viaja por la sincronización, y el cliente de D1 (D1c) no entra en servicio antes que A4. D1a y D1b no esperan a A4.

**Fixture compartido de fusión** *(servidor y cliente)*

- **FR-080**: DEBE haber un único fixture de casos de fusión, que leen los checks de TypeScript y las pruebas Pest sin copias. Los resultados esperados se escriben a mano, a partir del contrato, nunca con el código de ninguno de los dos lenguajes. *(ADR 0004 §4; D39)*
- **FR-081**: DEBE cubrir, por cada familia con reloj (última escritura y lápida), las cinco situaciones de reloj (más nuevo, más viejo, igual, vacío del lado local y vacío del lado remoto), cada una en los dos órdenes de llegada; y por cada familia que sólo crece, el OR, el máximo, la unión y la fecha más temprana, también en los dos órdenes. *(§8)*
- **FR-082**: DEBE cubrir además la corrección de reloj por lote, `stale_content` y la lápida contra una marca más vieja. Una regla escrita en los dos lenguajes sin un caso en el fixture rompe la prueba. *(D39)*
- **FR-083**: La ubicación y el mecanismo que lo hacen alcanzable desde la imagen de pruebas de la API los fija el plan: hoy esa imagen sólo ve `backend/api`. El fixture de la plantilla del harness de B2 tiene el mismo problema, y conviene resolverlos juntos.

**Verificación** (las pruebas que el cambio DEBE traer antes de la implementación, según el principio II de la [constitución](../../.specify/memory/constitution.md))

- **FR-084**: Las pruebas de la API (Pest contra MySQL real, con valores que salen del contrato) DEBEN cubrir: las reglas con el fixture; la idempotencia; la época y el reset; la importación con las tres fixtures y la precedencia de FR-030; la concurrencia con conexiones paralelas (dos lotes de una cuenta, un lote contra un reset y un lote contra una importación); la matriz de acceso ajeno y de cuenta esperada; los límites; y el esquema (reglas de fila por nombre, FK en cascada, un `DELETE FROM users` con todas las tablas pobladas, punteros cruzados y D32).
- **FR-085**: Los checks de TypeScript (`qa/`, con el almacenamiento y la red simulados en sus interfaces) DEBEN cubrir la cola y la unión de cambios, los espacios, la salida, el modo compartido, la cuenta esperada, la época, la importación con los parsers v1 y la regla de `boot-check` sobre las claves v1.
- **FR-086**: La aceptación en navegador real (el cambio de cuenta en el mismo navegador, y la importación v1 en una computadora compartida: B entra después de A y no se le ofrece el v1 de A) DEBE correr con Playwright y el ingreso de F11. Si no existen cuando se implemente, se verifica a mano y el PR declara el límite. *(§8)*
- **FR-087**: Un check de punta a punta con el stack levantado y dos clientes de prueba (un script, no Playwright) DEBE correr la convergencia de SC-002 y la medición de SC-010. No forma parte de `npm test`, igual que `api:content:check`.
- **FR-088**: D1 DEBE cerrar con `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:test`, `npm run api:format:check` y `npm run api:analyse` en verde.

### Key Entities *(include if feature involves data)*

Los tipos de columna, los índices y las restricciones están en el ADR 0006 (§5.3 y D22 a D25). Acá van sólo los conceptos.

- **Progreso de la cuenta:** el estado de estudio de una cuenta, en seis áreas: ejercicios del laboratorio (predicción, ayudas, pistas, reflexión, prueba propia, repaso y lo resuelto), borradores, campaña (sellos y checkpoints), talleres de Sistemas (por taller y lenguaje: sellos, respuesta, nota, objetivos observados y etapas marcadas), recorrido (pasos, hitos, favoritos, respuestas del quiz y notas) y preferencias (idioma, minutos de foco y ejercicio abierto por lenguaje).
- **Cabecera de progreso:** una fila por cuenta, que B2 crea en el primer uso, con la época, la revisión, `resetAt` y la última actividad. Es también el candado por cuenta.
- **Época:** el contador de la cuenta que sube con «Borrar todo» y separa lo vigente de lo anterior. Todo pedido que escribe la lleva y se rechaza si no es la vigente.
- **Revisión:** el contador de la cuenta que sube una vez por transacción que cambia algo. Cada fila cambiada lleva la revisión con que cambió, y el delta es el conjunto de filas con una revisión mayor que la que el cliente conoce.
- **Operación:** el cambio de un campo, o de un grupo de campos, de un registro. Lleva un UUID, el reloj del dispositivo y las claves estables del registro. Los tipos de operación los define el plan.
- **Lote:** las operaciones que el cliente envía de una vez, con la hora del dispositivo (`sentAt`) con la que el servidor corrige los relojes.
- **Reloj de campo y lápida:** la fecha con que se escribió un campo (o un grupo de campos). Vacío significa legado, anterior a todo. Una lápida es el registro, con fecha, de que algo se desmarcó.
- **Foto y delta:** la foto es el estado completo de la cuenta; el delta, lo que cambió desde una revisión.
- **Espacio de la cuenta:** la parte del almacenamiento del navegador que pertenece a una cuenta: su copia local, su cola y lo último que supo del servidor.
- **Cuenta esperada:** la cuenta para la que se armó un pedido (`X-Taller-User`). El servidor la compara con la de la sesión.
- **Importación, crudo, normalizado e informe:** la entrada de una copia v1 a la cuenta. El crudo es el texto v1 tal cual; el normalizado, la salida de los parsers v1; el informe, lo que se escribió, se omitió o quedó en conflicto.
- **Intento legado:** el intento que deja un `result` v1 importado. No cuenta como intento del alumno.
- **Etapa:** un paso de un taller de Sistemas. Tiene un id estable (`e1`…) y un índice v1 congelado que sólo sirve para traducir lo importado.
- **Resuelto y «ejecutado en el servidor»:** un ejercicio resuelto tiene fecha de resolución; sólo es «ejecutado en el servidor» si un intento no legado de la época lo aprobó. Ninguno de los dos significa «verificado» (ADR 0006 §12).
- **Fixture de fusión:** el archivo de casos que fija cada regla de fusión para TypeScript y para PHP.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con las tres fixtures y por cada una de las cuatro secciones (recorrido, laboratorio, campaña y Sistemas), `isLosslessNormalization(original, proyección)` da verdadero: 12 de 12 secciones, con 0 claves perdidas y sólo las dos exclusiones nombradas en FR-038. Importar la misma fixture por segunda vez da 200 y 0 filas cambiadas, y el normalizado que genera TypeScript coincide con lo guardado.
- **SC-002**: Cada caso del fixture de fusión (familias con reloj por cinco situaciones por dos órdenes de llegada, más los casos de las familias que sólo crecen) da el resultado escrito a mano, en Pest y en TypeScript: 0 diferencias entre los dos. Dos clientes de prueba que editan sin conexión y después sincronizan terminan con el mismo estado, y lo que cada uno tocó en campos distintos sobrevive.
- **SC-003**: Un lote reenviado tres veces aplica una vez y devuelve `duplicate` las otras dos; el mismo UUID con otro contenido devuelve `uuid_reused`; el mismo lote enviado a la vez desde dos pestañas aplica una vez y sube la revisión una vez.
- **SC-004**: Con B entrando después de A en un mismo navegador real, B ve 0 datos de A, se aplican 0 operaciones de A como si fueran de B (todas reciben 409 `account_mismatch`), y el v1 que A importó no se le ofrece a B. Con la opción «computadora compartida», quedan 0 claves de progreso en el almacenamiento al cerrar la pestaña.
- **SC-005**: Después de «Borrar todo»: 0 filas de estado de la cuenta, la época sube en 1 y los intentos siguen donde estaban. Un dispositivo que quedó atrás recibe 409 `epoch_mismatch` en el 100 % de sus lotes y no deja ninguna fila. Importar el mismo archivo que se exportó antes del borrado se aplica (con confirmación) y no responde un 200 vacío.
- **SC-006**: Después de cualquier secuencia de operaciones, la foto de una revisión más el delta hasta la siguiente reproducen la foto completa: 0 diferencias, también para una fila que cambió el cierre de B2. Fuera de «Borrar todo», 0 filas de estado se borran.
- **SC-007**: Las cuatro porciones de talleres publican los 100 ids de etapa. Las otras 13 porciones, los 274 `content_hash` y `qa/fixtures/workshop-steps-v1.json` no cambian un byte: 0 diferencias. La API sirve los bytes del generador y el oráculo cambia sólo en esos ids.
- **SC-008**: La 61.ª sincronización del minuto, la 4.ª importación de la hora y el 4.º reset del día reciben 429 con `Retry-After`; un cuerpo de más de 2 MiB en la sincronización o de más de 24 MiB en la importación recibe 413. Un lote con más operaciones que el máximo recibe 422 y no aplica nada.
- **SC-009**: Las 12 tablas tienen las columnas del ADR 0006 §5.3 y ningún cambio sobre las de B2. Un `DELETE FROM users` con todas las tablas pobladas no falla ni deja filas, y la búsqueda de punteros cruzados entre cuentas da 0.
- **SC-010** (una medición, no un criterio de aprobación): con el stack real se informan el tamaño de la foto completa de un alumno con los 274 ejercicios con intento, el del lote mayor admitido, y la mediana y el p95 de `POST /api/sync` con 30 cuentas sincronizando a la vez. Con 1.000 cuentas activas (ADR 0006 S2), un lote cada 10 segundos serían 100 pedidos por segundo contra PHP-FPM con 12 a 16 hijos (§9): eso es lo que se contrasta para fijar las esperas de FR-063. Todavía no hay un objetivo.
- **SC-011**: Pasan `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` (nivel 9, sin baseline), `npm run api:content:check` ampliado a las cuatro porciones y el check de punta a punta de FR-087.

## Riesgos

1. **Perder el progreso del alumno en su propio navegador.** D1c reemplaza la capa que el ADR 0003 protegió con respaldos y fixtures congeladas. *Mitigación:* las claves v1 no se tocan hasta una importación confirmada (FR-072), cada camino que descarta datos deja copia o aviso (FR-071), el cliente se monta sobre los almacenes de F2 y no abre otros (FR-061), y las fixtures de master siguen arrancando sin escribir.
2. **El texto de un dispositivo se pierde en una fusión.** Con «gana la última escritura», dos dispositivos que editan la misma reflexión o el mismo borrador pierden el texto del que escribió antes: no se fusiona texto ni se conserva la versión perdida. Hoy, entre pestañas, el local gana de forma parecida (ADR 0003). *Mitigación:* el campo es la unidad de fusión, así que campos distintos conviven; la respuesta de la sincronización le dice al cliente qué perdió; y si molesta, guardar el texto perdido en el respaldo local no toca al servidor.
3. **Lo resuelto antes de A4 no se sincroniza** (Q4). *Mitigación:* el cliente (D1c) espera a A4.
4. **Relojes desfasados.** La corrección por lote y el tope con la hora del servidor acotan el daño, pero un dispositivo con el reloj muy atrasado pierde las fusiones. *Mitigación:* el aviso a los 2 minutos (FR-078).
5. **Computadora compartida, riesgo residual.** Quien no sale de su sesión deja sus borradores en el navegador (`localStorage` no está cifrado) hasta que otro arranque la aplicación o venza el espacio (ADR 0006 §12). *Mitigación:* Q3 y el modo compartido.
6. **Carga de la sincronización sobre MySQL.** Con 1.000 cuentas activas, un lote cada 10 segundos son 100 pedidos por segundo contra PHP-FPM con 12 a 16 hijos (estimación del ADR), y cada pedido con sesión escribe la fila de `sessions` y toma el candado de la cuenta (ADR §12). *Mitigación:* el cliente junta los cambios y no consulta sin cambios más de una vez por minuto (FR-062 y FR-063), el límite de 60 por minuto, la medición SC-010 antes de fijar las esperas y el camino de escala del ADR §9, con sus disparadores.
7. **Una restauración del servidor deja atrás a algunos clientes.** La respuesta es la foto completa (FR-017), y lo que el cliente tenía de más no se recupera. *Mitigación:* el respaldo nocturno y el binlog de 7 días permiten recuperar a un punto en el tiempo (ADR §9 y D37); sin binlog, la pérdida es de hasta un día.
8. **Datos personales en el texto libre y en los crudos** (Ley 25.326). Los borradores, las reflexiones, las notas y el crudo importado pueden contenerlos. *Mitigación:* el crudo se conserva 90 días (FR-037), la supresión de la cuenta se lleva todo (FR-053), los logs no llevan texto (FR-057), y el aviso de privacidad (pregunta 14, que no es de D1) tiene que nombrarlos.
9. **Cambiar los bytes de cuatro porciones** invalida una vez el contenido guardado de todos los clientes, mueve `Content-Version`, cambia el oráculo y toca el tipo de etapa de C6. *Mitigación:* FR-047 a FR-050, y que la publicación sea un cambio propio, con su commit TDD.
10. **«Borrar todo» no se deshace,** salvo con un archivo exportado. *Mitigación:* la época protege a los otros dispositivos, la idempotencia dentro de la época deja restaurar con el archivo (FR-028), y la pantalla de «Método» debería ofrecer exportar antes (F8).
11. **Superficies sin dueño en el front.** D1 necesita cinco que ningún ítem tiene (ver «Relación con otras specs»). *Mitigación:* D1 fija su estado y su contrato (FR-077), y el coordinador las asigna.
12. **Las specs hermanas son borradores.** B2 y C3a no pasaron por clarify, y el épico del front no está integrado a `master`. *Mitigación:* sus aportes están en tablas de supuestos, cada uno con lo que se rompe si cambia.
13. **El ADR 0006 sigue en propuesta.** D22 a D25, D36 y D39 dependen de él. *Mitigación:* la marca «(propuesta)», y el plan no se cierra sin su aprobación.
14. **La aceptación en navegador real no tiene dónde correr todavía.** Depende de Playwright (F1) y del ingreso de F11. *Mitigación:* FR-086, con la verificación manual declarada como límite.

## Relación con otras specs

### B2 (borrador en la rama `spec/b2-ejecuciones`, `specs/005-b2-api-ejecuciones/spec.md`)

B2 pidió que D1 contraste las columnas de `progress_heads` y `exercise_progress` antes de que B2 cierre su plan (su Riesgo 7), porque agregarles después una columna con restricciones obliga a copiar una tabla con datos. La respuesta es la tabla siguiente: cada campo v1 y cada regla de D1 tiene su lugar, y **no falta ninguna columna**. B2 puede cerrar su plan sin esperar a D1.

| Origen v1 | Columna | Quién escribe | Regla |
| --- | --- | --- | --- |
| `solvedAt` | `exercise_progress.solved_at` | Cierre de B2; importación | La fecha más temprana |
| (no existe en v1) | `server_solved_at` | Cierre de B2 | Primera aprobación no legada de la época |
| `result` (el último) | `proof_attempt_id`, `proof_at`, `last_attempt_id`, `last_attempt_at` (más un intento legado en `attempts`) | Cierre de B2; importación, sólo si el puntero está vacío | Por `(attempted_at, id)`; la importación nunca reemplaza un puntero |
| `attempts` | `legacy_attempts` | Importación | Contador v1; no entra en `attempt_count` |
| (no existe en v1) | `attempt_count` | Cierre de B2 | Intentos que cuentan de la época vigente |
| `prediction` | `prediction_answer`, `prediction_answer_set_at` | Sincronización; importación (reloj vacío) | Gana la última escritura |
| `predictionCorrect` | `prediction_correct`, `prediction_correct_at` | Sincronización con la versión de contenido; importación (fecha vacía = legado) | Sólo crece |
| `assisted`, `solutionSeen` | `assisted`, `solution_seen` | Sincronización; importación | OR |
| `hints` | `hints_revealed` | Sincronización; importación | Máximo, con tope en las pistas del ejercicio |
| `reflection` | `reflection`, `reflection_set_at` | Sincronización; importación | Gana la última escritura; `''` es un valor |
| `customTest` (del registro) | `custom_test`, `custom_test_set_at` | Sincronización; importación | Gana la última escritura |
| `confidence`, `reviewedAt`, `reviewAt` | `confidence`, `reviewed_at`, `review_due_at`, `review_set_at` | Sincronización; importación | Gana la última escritura, con un solo reloj para el grupo |
| (no existe en v1) | `progress_heads.epoch` | Reset (la sube); la leen la sincronización, la importación y la admisión de B2 | Sube sólo con «Borrar todo» |
| (no existe en v1) | `progress_heads.revision` | Sincronización, importación, reset y cierre de B2 | Una vez por transacción que cambia algo (FR-010) |
| (no existe en v1) | `progress_heads.reset_at` | Reset | La importación pide confirmación si no es NULL |
| (no existe en v1) | `progress_heads.last_activity_at` | Sincronización, importación y cierre de B2 | La última actividad que ve el admin |

El resto de v1 va a tablas de D1 (borradores, preferencias, recorrido, campaña y Sistemas) o a las de intentos de B2: `result.success` y `result.transportError` se proyectan desde el resultado del intento legado, `result.tests` desde el veredicto de cada prueba por posición, y el código, la prueba propia y las salidas desde el payload, con los recortes que v1 ya aplica (30.000, 3.000, 12.000 y 18.000 caracteres).

**Lo que D1 supone de B2, y lo que hay que decirle:**

| D1 supone de B2 | Si B2 lo resuelve distinto |
| --- | --- |
| Las dos tablas, completas y con las columnas de arriba (FR-033 y SC-011 de B2) | D1 tendría que alterar tablas con datos: COPY (D07 y D28) |
| El cierre sube la revisión de la cuenta y la última actividad (FR-032 de B2) **y además escribe en cada fila de `exercise_progress` que cambia la revisión nueva** | Sin lo segundo, el delta no ve lo que cierra una ejecución. Hallazgo para B2: su FR-032 sólo nombra la cabecera (FR-010 de esta spec) |
| La misma manera de tomar y crear la cabecera (`INSERT … ON DUPLICATE KEY UPDATE` y después `SELECT … FOR UPDATE`, D08), con un solo código | Dos implementaciones del candado de la cuenta |
| «Cuenta como intento» con una sola definición y los intentos legados fuera de ella | El conteo de la época y las estadísticas se contradicen |
| La época: la admisión de B2 la copia, y un cierre con la época cambiada no toca el progreso (FR-031 de B2). D1 repite el escenario con el reset real | La prueba de B2 (época subida a mano) y la de D1 dejarían de ser la misma |
| La poda de payloads conserva el de la última prueba aprobada y el del último intento «mientras exista la cuenta» (FR-044 de B2) | Si la poda los reconoce por los punteros de `exercise_progress`, que el reset borra, después de un reset esos payloads pasan a podarse a los 90 días. Hallazgo para B2 y costo de Q2 |

### C3a y C3b (borradores en la rama `spec/c3-identidad`, `specs/004-c3-identidad-acceso/spec.md`)

| D1 supone de C3 | Si C3 lo resuelve distinto |
| --- | --- |
| `GET /api/session` con `user.id` y `contentVersion` (FR-034 de C3a): el cliente nombra el espacio con el id y compara la versión del contenido | D1c necesitaría otra fuente de la cuenta actual |
| `X-Taller-User` y 409 `account_mismatch` en todo pedido que modifica, también cuando el encabezado falta (FR-036 de C3a) | El escenario de cambio de cuenta de US3 no se sostiene |
| `password.confirm` con 423 (FR-030 de C3a, que lo entrega sin consumidor propio) | El reset no tiene cómo pedir la contraseña |
| Los mismos códigos de error de §8, en español, con `Retry-After` en 429 y 503 | D1 tendría que dar forma a sus errores por su cuenta |
| El mecanismo de límites de Laravel sobre el store `database` y las zonas de `limit_req` de Nginx (429), que son de C3 (FR-044 de C3a) | Un `limit_req` con el 503 por omisión se confundiría con un error del servidor, y uno ajustado a una sola IP cortaría a un aula |
| El `scheduler`, donde D1 agenda sus podas (FR-039 de C3a) | Sin él nadie poda `sync_operations` ni el crudo |
| `UserData` (C3b), extensible. Si C3b entrega `DELETE /api/me` o la exportación antes que D1, D1 suma sus tablas y el lector de la foto | Sin ese módulo, D1 tendría que crear uno propio |
| Una sesión de 30 minutos de inactividad y 8 horas como máximo (Q5 de C3a): el cliente tiene que vivir con un 401 en medio de una cola (FR-076) | Una sesión más larga sólo reduce los 401 |
| La cuenta de admin puede estudiar (Q3 de C3a, recomendada A) | Si el usuario elige B, D1 suma el chequeo de rol en sus rutas y decide qué pasa con el progreso de un alumno que se promueve |

C3a no necesita cambios para D1. Lo único que D1 le pide es que `GET /api/session` siga trayendo el id de la cuenta.

### El épico del front (borrador en la rama `spec/front-react`, `specs/front-react/roadmap.md`)

- **F2 (unidades 1 y 6).** El cliente de D1c se monta sobre los almacenes singleton con suscripción (unidad 1). La unidad 6, `features/progress-backup`, hoy resuelve de forma local exportar, importar en dos fases y «Borrar todo»: con D1, importar es `POST /api/progress/import` y «Borrar todo» es el reset con contraseña. F2 tiene que dejar esa feature con una interfaz que D1c pueda reemplazar sin reescribir las vistas.
- **F8 (Método).** La página usa esas funciones: exportar sigue saliendo del navegador (D1 no agrega una ruta que devuelva el formato v1, FR-039), y importar y borrar pasan por D1. **F8 depende de D1b.**
- **F11 (Acceso).** Es la pantalla de ingreso, donde iría la opción «computadora compartida», y su decisión abierta incluye si cubre las otras pantallas de cuenta, entre ellas confirmar la contraseña, que el reset necesita.
- **A3 y A4.** A3 trae el protocolo de arranque con `GET /api/session`, que D1c reutiliza para comparar la cuenta. D1c entra en servicio después de A4 (Q4).
- **F1.** Sus E2E «arranque con el progreso real de master» tendrán que pasar por el ingreso cuando el contenido esté detrás de la sesión.

**Superficies que D1 necesita y que ningún ítem del front tiene.** D1 fija su estado y su contrato (FR-077); las vistas las asigna el coordinador (F11, F8 o un ítem nuevo):

1. la opción «computadora compartida» en el ingreso;
2. el resumen y la pregunta «¿Este progreso es tuyo?» de la importación, con la confirmación;
3. el aviso al salir cuando la cola no se pudo enviar (conservar o descartar);
4. la confirmación de contraseña de «Borrar todo» (el 423);
5. el estado de sincronización y los avisos de cuenta distinta, de época cambiada y de reloj desfasado.

### C2 y C6

D1 **extiende** a [C2](../001-c2-contenido-mysql/spec.md), cuyos FR-029 y FR-030 dicen que las claves de etapa no se publican hasta D1: cuando D1 se entregue, la hoja de ruta tiene que apuntar a las dos. El tipo de registro de la etapa que deja [C6](../002-c6-registros-tipados/spec.md) (sus claves son `title`, `task`, `why` y `done`, y «la clave y el índice v1 no se publican») pasa a aceptar el `id`.

### Ajustes al ADR 0006 que propone esta spec

| El ADR dice | Esta spec | Por qué |
| --- | --- | --- |
| La importación es idempotente «por `importId` y por `raw_sha256` del mismo usuario» (D24), sin época | Idempotente dentro de la época vigente (FR-028) | Sin la época, exportar, «Borrar todo» e importar el mismo archivo sería un 200 que no restaura nada, y el README manda exportar una copia como respaldo |
| `GET /api/progress` no lista la cuenta (§7) | La foto trae `userId` y el cliente descarta la de otra cuenta (FR-020 y FR-066) | D36 sólo protege lo que modifica: una pestaña vieja lee con la sesión nueva y escribiría la foto de B en el espacio de A |
| El delta se define por revisión (D23, D25), sin decir quién la estampa ni qué pasa con los borrados | Cada escritor estampa la revisión en cada fila que cambia, y sólo «Borrar todo» borra (FR-010 y FR-011) | Una fila sin la revisión nueva, o borrada, no aparece en un delta |
| ADR 0004 §3 lista «resuelto» entre los campos que sólo crecen, y su sincronización lleva todo cambio del cliente; ADR 0006 §5.3 y D39 dicen que sólo lo escribe el cierre de B2 | Vale el ADR 0006 (FR-009), y lo de antes de A4 lo decidió el usuario en Q4 | Las dos decisiones se contradicen mientras el laboratorio use los Playgrounds |
| Los CHECK que tocan fechas están «sujetos a D07» (§5.3) | En el escritor y en su prueba (FR-052) | C2 midió que con un CHECK sobre DATETIME ampliar un ENUM no es INSTANT en 9.7 |
| `knownRevision` mayor que la del servidor no está contemplado | Foto completa (FR-017) | Una restauración del respaldo deja al servidor atrás del cliente |
| El tope de operaciones por lote no está fijado (§7 sólo fija 2 MiB de cuerpo) | Lo fija el plan (FR-018) | Una cola de cientos de borradores no entra en un lote de 2 MiB |

## Acciones del usuario

Los agentes no las hacen. Ninguna se ejecuta ahora; las de implementación llegan con el plan, que pide cada descarga con nombre, origen y tamaño.

| Cuándo | Acción |
| --- | --- |
| Ahora | Aprobar o enmendar el ADR 0006. D1 usa D08, D09, D14, D22 a D25, D28, D29, D36, D39, §5.3, §7 y §8 como base. |
| Ahora | Confirmar o ajustar lo que D1 supone de las transversales: 14 días para `sync_operations` y 90 para el crudo importado (pregunta 13), y que el aviso de privacidad (pregunta 14) nombre los textos libres y los crudos. |
| Antes de D1c | Decidir si se adopta Playwright (F1, ADR 0008 propuesto en la rama `spec/front-react`) o se acepta la verificación manual declarada para el cambio de cuenta y la computadora compartida. |
| D1, implementación | Ninguna descarga prevista: ni paquetes de Composer ni de npm. Si el plan descubre que necesita uno, lo pide antes de bajarlo. |
| Siempre | Cada descarga (imágenes, paquetes npm o Composer) pide permiso con nombre, origen y tamaño antes de bajarse. |

## Assumptions

- **ADR 0006 en propuesta.** Las decisiones de «Base del ADR 0006 (propuesta)» son la base de esta spec hasta que el usuario lo apruebe. Los ajustes de la tabla «Ajustes al ADR 0006» son propuestas de esta spec, no del ADR.
- **C2 y C6 entregados antes de D1** (C6 va en la ola 2 y D1 en la 4): el código parte de `master` con ellos. B2 y C3a también, aunque hoy son borradores sin clarify: lo que D1 toma de ahí está en las tablas de «Relación con otras specs».
- **Carga.** Hasta unas 5.000 cuentas y 1.000 activas en el pico (ADR 0006 S2). Sólo SC-010 la mide.
- **Sin dependencias nuevas.** El servidor usa Laravel y el cliente de MySQL que ya están; el cliente usa TypeScript sin paquetes nuevos (el UUID sale de `crypto.getRandomValues`, que no exige contexto seguro, como en el ADR 0004 §4). Ninguna operación depende de una API que exija contexto seguro.
- **El servidor traduce las posiciones de etapa al importar** (FR-032), así que el contenido publica el id y no el índice v1.
- **`code_sealed` de `workshop_progress` es portador v1,** como `campaign_seals`: sólo lo escribe la importación y el cliente deriva el sello. El ADR sólo dice «Portador v1» en esa columna y el plan lo confirma.
- **Una operación sobre contenido retirado se aplica** y el progreso retirado se lee: rechazarlas descartaría lo último que el alumno escribió sobre algo que ya no ve.
- **Los CHECK que tocan fechas van en el escritor** (FR-052), por el resultado de C2 sobre D07.
- **El máximo de operaciones por lote y las esperas del cliente** (FR-018 y FR-063) los fija el plan, con la medición SC-010.
- **Sin conexión no hay «Borrar todo»,** porque la contraseña se confirma en el servidor.
- **«Borrar todo» no toca las claves v1 que la cuenta no importó:** pueden ser de otra persona del mismo navegador.
- **La cuenta de admin es una cuenta más:** tiene progreso propio y las mismas reglas (ADR 0006 S5).
- **Varias pestañas.** Las pestañas de una cuenta en un navegador comparten el espacio y los almacenes de F2; no hay otra coordinación entre pestañas que la idempotencia de las operaciones.
- **Idioma.** Los mensajes para quien usa u opera el taller, en español (`lang/es` de C3a); el código y las pruebas, en inglés (constitución, principios III y VI).

## Alternativas consideradas

Sólo las que cambian lo que se construye. Q1 a Q4 y la partición llevan las suyas en «Clarifications».

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde se fusiona | En el servidor, con SQL por campo; en el cliente, con el documento completo (el plan previo del ADR 0004); con tipos de datos que convergen solos (CRDT) | En el servidor, por campo (ADR 0004 §3, ADR 0006 D22). El documento completo pisa lo que un cliente viejo no conoce, y un CRDT es más de lo que pide un alumno con dos dispositivos |
| Qué viaja en cada pedido | El estado completo; operaciones con delta | Operaciones con delta (D23): con autoguardado, devolver todo en cada lote multiplica el tráfico |
| Cómo se entera un dispositivo de un borrado | Filas borradas en el delta; la época y la foto completa | La época (FR-011): sólo «Borrar todo» borra, y sube la época, así que un delta nunca informa un borrado |
| Idempotencia de la importación | Por `importId`; por el crudo de la cuenta sin límite; por el crudo dentro de la época | Dentro de la época (FR-028): restaurar con el archivo exportado antes de «Borrar todo» tiene que funcionar |
| Quién traduce la posición de una etapa v1 | El cliente, con el índice v1 publicado; el servidor, con el que ya guarda | El servidor (FR-032): el índice v1 no se vuelve parte del contrato publicado |
| Qué hace un dispositivo atrasado con su cola después de un reset | La reenvía; la descarta; la guarda en una copia y carga el estado nuevo | Copia descargable y estado nuevo (FR-075): reenviarla resucitaría lo que otro dispositivo borró |
| Dónde viven las pantallas de D1 | En D1; en el épico del front | En el front: D1 fija el estado y el contrato (FR-077) y evita un segundo árbol de pantallas |
| Cómo llega el fixture de fusión a las pruebas de PHP | Copiarlo a la imagen de pruebas; montarlo; duplicarlo | Lo decide el plan (FR-083); duplicarlo anula el motivo del fixture |
| Exportar el progreso en formato v1 desde el servidor | Una ruta; sólo la proyección de las pruebas | Sólo la proyección (D24): la exportación del titular es `POST /api/me/export` (C3b) |
