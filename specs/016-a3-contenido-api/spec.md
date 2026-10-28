# Feature Specification: A3 · El front lee el contenido de la API

**Feature Branch**: `016-a3-contenido-api` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-07

**Status**: Clarificada el 2026-10-28: el usuario respondió Q1 a Q4, y con ellas valen la interfaz con F11 (R1), la sesión obligatoria desde F11a (F11-Q1) y el ruling C1 del coordinador. Sin plan

**Input**: Ítem **A3** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «El front lee el contenido de la API»: que el front lea las 17 porciones con el protocolo de arranque, guarde la última copia y avise si el backend no responde. Depende de A2 (la compuerta de arranque, PR #38 sobre `f2a/base`, que entra a `master` con el PR #40), de C2 y de C3a (entregadas) y de F11a, el acceso de la [hoja de ruta del front](../front-react/roadmap.md): la spec de F11 (015, en su rama) se partió en F11a a F11d, y A3 espera sólo a F11a (Q1 del clarify). Fuente técnica: el [ADR 0004](../../docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md) (aceptado: §1, §2 «Entrega», §5 y «Consecuencias») y el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (**propuesta**: §7, el protocolo de arranque, y §8), que esta spec usa como base y lo dice. El código de A2 y de F2a está en el PR #40 y no en `master`: sus rutas (`frontend/src/app/boot/`, `frontend/src/shared/api/content/`, `qa/e2e/specs/content-gate.spec.ts` y otras) se citan sin enlace. Lo que viene de F2b entra como supuesto, y lo que trae F11a, como lo decidió el clarify.

## Intención y alcance

**Lo que entendemos.** Desde A2, el arranque pide el contenido antes de evaluar las vistas legacy, pero lo pide a un archivo estático que Nginx sirve sin sesión (`dist/content/curriculum.<versión>.json`). Es un puente que A2 dejó para que A3 lo reemplace, y A3 hace ese reemplazo. Desde F11a, el arranque ya pregunta quién es el usuario (`GET /api/session`) y le pide el ingreso a quien no tiene sesión. A3 usa esa sesión para leer las 17 porciones de la API de C2, con los validadores que C2 ya publica. Si el navegador tiene una copia al día, no baja nada; si tiene una vieja, baja sólo lo que cambió; si un import cambia el contenido en medio del arranque, lo detecta y no mezcla versiones. El navegador guarda la última copia que publicó. Si el servidor no responde, el alumno sigue estudiando con ella y un aviso le dice de cuándo es. El archivo estático sale del build y de la imagen web: después de A3, el contenido sólo llega de la API, detrás de la sesión, y eso es lo que C4 necesita para exponer el taller. Con conexión, el alumno no nota ningún cambio en lo que ve, porque desde F11a ya entra con su cuenta. Lo nuevo es que una caída del servidor ya no lo deja frente a un error si ya había estudiado en ese navegador sin cerrar su sesión. Es para el alumno, para quien opera el taller y para quien mantiene el front (F11, A4, D1c y los ports). Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con sesión y con el servidor disponible, el alumno ve las mismas vistas con los mismos datos que con A2. Los globals que leen las vistas legacy son, byte a byte, los de `dump-globals`, y el progreso, los enlaces y el idioma funcionan igual.
2. Una recarga con la copia al día hace un solo pedido a la API, el de la sesión. Un cambio de contenido baja sólo las porciones que cambiaron.
3. Sin servidor, quien ya tenía una copia y no cerró su sesión sigue estudiando con un aviso que dice de cuándo es, y quien no la tenía ve el error con «Reintentar». En ningún caso se toca el progreso.
4. Sin sesión, el contenido no se pide ni se muestra: el alumno ve el ingreso de F11a, y un 401 en medio del arranque también lo lleva ahí.
5. Ningún arranque publica porciones de dos versiones, y la copia nunca es más vieja que lo último que publicó este navegador.
6. Ni `dist/` ni la imagen web tienen el contenido, y los checks y los E2E siguen probando lo mismo con una API simulada, sin Laravel.

**Entra:**

- la extensión de la etapa de sesión que introduce F11a (C1): la `contentVersion` para las porciones, la sesión que se vuelve a pedir en cada ronda, el 401 que llama a «pedir el ingreso» y el servidor que no responde;
- la fuente de contenido de la API, que reemplaza a la estática detrás de la misma compuerta de A2 (FR-012 de A2);
- el protocolo del ADR 0006 §7: el validador por porción (`If-None-Match` y 304), la comparación de `Content-Version` con la sesión, el reintento con tope y el respeto de `Retry-After`;
- la última copia del contenido en el navegador, con su invariante, y su uso cuando el servidor no responde;
- el aviso sin servidor y los textos nuevos de la vista de error;
- el retiro del archivo estático: el build, el middleware de `npm run dev`, la imagen web y los checks que lo exigían;
- los 17 recursos que se suman al doble de la API que trae F11a, la adaptación de `dist-content-check`, de `boot-check` y de los E2E de A2, y los E2E de A3 en la red de F1;
- la documentación que describe el archivo estático o cómo llega el contenido.

**Queda fuera:**

- las pantallas de acceso y de cuenta (ingreso, invitación, contraseña, exportar y borrar la cuenta, aviso de privacidad), la salida de la cuenta y el borrado de los fragmentos con token de la URL: son de F11;
- lo que trae F11a por el clarify (F11-Q1, R1 y C1): la etapa de sesión con `GET /api/session` en cada arranque, «pedir el ingreso», el doble de la API como fixture automático de los E2E, con una sesión simulada por omisión, y el proxy de `/api/` de `npm run dev` y de la vista previa;
- la API: los recursos, las huellas, el `ETag` y `Content-Version` son de C2, y la sesión, de C3a. A3 no cambia el backend;
- la plantilla del harness, la porción 18 de B2: A3 no la pide al arrancar (propuesta; ver «Relación con otros ítems», B2 y A4);
- el cliente v2 del progreso, los espacios por cuenta, la opción «computadora compartida» y los avisos de sincronización (D1c, F11 y F13);
- el laboratorio sobre `/api/runs` (A4), la CSP y el retiro de `vite-plugin-singlefile` (C4), Esenciales (E1) y portar vistas (el épico del front).

**Sin hacer a propósito (YAGNI):**

- un Service Worker o el uso sin conexión en una carga nueva: la copia sirve a un navegador que ya arrancó alguna vez con servidor;
- reintentos automáticos ante una caída: los únicos automáticos son los de una versión que cambió y los de un `Retry-After`; ante una caída, la copia o «Reintentar» (Q2 de A2);
- consultar en segundo plano si volvió el servidor y reemplazar el contenido en caliente;
- verificar en el navegador la huella de cada porción, que exige un contexto seguro y que el servidor ya garantiza;
- tomar la lista de porciones de los catálogos de la sesión, pedir un `appBuild` y guardar una copia por cuenta;
- un recurso que junte las 17 porciones, que cambiaría C2, ya entregada.

**Actores:** el alumno (con y sin servidor), quien opera el taller (despliega, importa contenido y usa la vista previa), quien mantiene el front (F11, A4, D1c y los ports) y los checks de `qa/` y la red E2E.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o lo decidió el clarify (Clarifications).

| Pedido | Fuente |
| --- | --- |
| El front lee las 17 porciones con el protocolo de arranque, guarda la última copia y avisa si el backend no responde | Hoja de ruta del backend, A3 |
| El protocolo completo: `GET /api/session`, validador por porción, comparación de `Content-Version` y reintento con tope, más la última copia en caché y el aviso sin backend | Hoja de ruta del backend, «Alcance por ítem», A3 |
| 1) La sesión da `contentVersion`. 2) Con la caché completa en esa versión, no se pide contenido. 3) Si no, se pide cada porción con su `If-None-Match`, y cada respuesta, 200 o 304, trae `Content-Version`. 4) Si una difiere de la sesión, se vuelve a pedir la sesión y se repite, con un tope de intentos | ADR 0006 §7, «Protocolo de arranque del contenido» (propuesta) |
| La última copia queda en caché en el navegador; si el backend no responde, se usa con un aviso | ADR 0004 §2, «Entrega» |
| Sin sesión sólo responde el ingreso: el contenido exige autenticación | ADR 0004 §1; C3a, User Story 3 («sin sesión, 401») |
| El front depende del backend para mostrar contenido, con la caché como mitigación, y `npm run dev` pasa `/api` a Laravel en Docker | ADR 0004, «Consecuencias» |
| Los checks de TypeScript no necesitan Laravel: simulan la API con el contenido generado | ADR 0004 §5 |
| El archivo estático es un puente que A3 retira | Usuario, 2026-10-05, Q1 de A2 (opción A) |
| La compuerta lee de una fuente intercambiable, y la sesión y el acceso entran como etapas previas, sin reescribir la compuerta (desde el clarify, la etapa de sesión la introduce F11a: C1) | [A2](../006-a2-compuerta-arranque/spec.md), FR-012 y FR-013 |
| Lo que A3 retira del puente: la fuente estática, la emisión del archivo, el middleware de `npm run dev` y `__CONTENT_VERSION__`; en `qa/`, la exigencia del artefacto y la parte de los bytes servidos; `build-check` pasa a exigir que `dist/content/` no exista | [Plan de A2](../006-a2-compuerta-arranque/plan.md), «Contrato de salida hacia A3 y C4» |
| Ningún documento del currículo se sirve sin sesión, y C4 no se despliega si A3 no retiró el puente | [C4](../008-c4-exposicion/spec.md), FR-022 |
| Los recursos de contenido: `ETag` por porción, 304 con validador fuerte o débil, `Content-Version`, `Cache-Control: private, no-cache` y 503 `content_not_imported` | [C2](../001-c2-contenido-mysql/spec.md), FR-017 a FR-022 |
| `GET /api/session` responde `{user, features, contentVersion, catalogs}` con `no-store` y nunca 401; un 401 lleva a la pantalla de ingreso, y un 429 se respeta con su `Retry-After` | [Contrato HTTP de C3a](../004-c3-identidad-acceso/contracts/http.md) |
| D1c reutiliza la lectura de `GET /api/session` del arranque para comparar la cuenta | [D1](../007-d1-progreso-sincronizacion/spec.md), «Relación con otras specs» |
| La plantilla del harness es un recurso aparte, y falta decidir si el cliente la pide al arrancar o al abrir el laboratorio | [B2](../005-b2-api-ejecuciones/spec.md), FR-035 y «Relación con otras specs» |
| La red E2E arma cada arranque en un solo lugar, para que el ingreso no toque cada escenario | Hoja de ruta del front, F1, «Evolución prevista» |
| A3 espera sólo a F11a, el acceso; F11 se parte en F11a a F11d | Usuario, 2026-10-28 (P1; Q1, opción A) |
| La sesión es obligatoria desde F11a, que introduce la etapa de sesión con «pedir el ingreso», el doble de la API de los E2E y el proxy de `/api/` de `npm run dev` y de la vista previa; A3 extiende la etapa | Usuario, 2026-10-28 (F11-Q1 y R1); coordinador (C1) |
| Sin servidor, la copia la usa sólo quien no cerró su sesión en ese navegador, con un aviso; salir la borra, y el modo «computadora compartida» no la guarda | Usuario, 2026-10-28 (Q2, opción B) |
| La copia vive en IndexedDB | Usuario, 2026-10-28 (Q4, opción A) |
| TDD; código y pruebas en inglés; Spec Kit en español; accesibilidad de teclado, diseño móvil y movimiento reducido; ninguna dependencia sin permiso | [`AGENTS.md`](../../AGENTS.md); [constitución](../../.specify/memory/constitution.md), principios II, VI y VII |

## Clarifications

### Session 2026-10-28

El usuario respondió las cuatro preguntas del borrador (Q1 a Q4) en la misma ronda que el clarify de F11 (spec 015). De esa ronda valen además dos decisiones que cambian esta spec: la interfaz entre A3 y F11 (R1) y la sesión obligatoria desde F11a (F11-Q1), con el ruling C1 del coordinador. Cada respuesta dice qué se descartó.

- Q: **Q1**, ¿A3 espera todo F11 o sólo las pantallas de acceso? → A: Sólo F11a. El usuario partió F11 en cuatro partes: F11a, el acceso; F11b, la cuenta; F11c, el correo, que espera el dominio; y F11d, lo de D1, que espera a D1c. A3 espera sólo a F11a, así que el ciclo A3 → F11 → D1c → A4 → A3 desaparece. Es la opción A del borrador, con una diferencia: el aviso de privacidad va en F11a, porque el alta no se puede enviar sin aceptarlo. Se descartaron esperar también la cuenta (B), que demoraba a A3, A4, C4 y D1c sin necesidad, y esperar todo F11 (C), que cerraba el ciclo. Decidió el usuario (P1). (Input; FR-002 y FR-003)
- Q: **Q2**, si el servidor no responde, ¿quién puede usar la última copia? → A: La opción B: sólo quien no cerró su sesión en ese navegador, con un aviso. Salir borra la copia, también la borra una sesión que responde `user: null`, y el modo «computadora compartida» no la guarda. Se descartaron que la use cualquiera en ese navegador (A), que abre el taller a quien ya salió, y que no la use nadie (C), que contradice al ADR 0004. Decidió el usuario (A3-Q2). (FR-021, FR-023 y FR-025)
- Q: **Q3**, ¿qué pasa con la vista previa, que no tiene API? → A: Pasa `/api/` al stack levantado, que es la opción A, pero ya no lo hace A3. Como la sesión es obligatoria desde F11a (F11-Q1), el proxy de `/api/` de la vista previa y el de `npm run dev` llegan con F11a (C1). Se descartaron retirar la vista previa (B) y dejarla sin API (C). Decidió el usuario (A3-Q3 y F11-Q1). (FR-032 y FR-033, que pasan a F11a)
- Q: **Q4**, ¿dónde guarda el navegador la última copia? → A: En IndexedDB, la opción A. Se descartaron la Cache API (B), que sólo existe en contextos seguros y no es transaccional, y `localStorage` (C), que comparte la cuota con el progreso, es sincrónica y la cuentan los E2E de F1 y de A2. Decidió el usuario (A3-Q4). (FR-015 a FR-020)
- Q: ¿Cómo sigue el arranque después de un ingreso, si `runBoot` corre cada etapa una sola vez? → A: No vuelve a ninguna etapa. F11 expone «pedir el ingreso», una operación que se espera y termina con la cuenta, y la etapa de sesión la llama cada vez que recibe `user: null`: al arrancar y después de un 401 en una porción. Esto corrige el borrador, que hacía «volver» el arranque a la etapa de sesión. F11a también arma el doble de la API para los E2E, y A3 lo reutiliza. Decidió el usuario (R1). (FR-002, FR-003, FR-012, FR-038 y la User Story 4)
- Q: ¿Quién introduce la etapa de sesión? → A: F11a. El usuario hizo obligatoria la sesión desde F11a (F11-Q1, que no era la opción recomendada en la spec de F11). F11a pide `GET /api/session` en cada arranque, muestra el ingreso a quien no tiene sesión y trae el doble de la API como fixture automático de los E2E, con una sesión simulada por omisión, para que no se edite ninguno de los 123 escenarios de F1 y de A2. Por eso la etapa de sesión y «pedir el ingreso» los introduce F11a, y A3 extiende esa etapa: usa su `contentVersion` para pedir las porciones con `If-None-Match` y, ante un 401 en una porción, llama a «pedir el ingreso». El proxy de `/api/` de la vista previa y de `npm run dev` también llega con F11a. Lo decidió el coordinador (C1) a partir de la respuesta del usuario a F11-Q1. (FR-001 a FR-003, FR-032, FR-033 y FR-038)
- Siguen como propuestas de la spec, sin pregunta propia, porque el usuario no las objetó: que A3 no pida la plantilla del harness al arrancar, que la deja para A4, y el tope de 3 rondas por intento, que el plan fija con una medición. (FR-008 y FR-015)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El taller abre con el contenido de la API, igual que hoy (Priority: P1)

El alumno con sesión abre el taller, o recarga un enlace profundo, y ve las mismas vistas con los mismos datos y el mismo progreso que con A2. Entre medio, el arranque preguntó por la sesión y leyó las 17 porciones de la API.

**Why this priority**: es la condición para retirar el archivo estático y para que C4 pueda exponer el taller. Para el alumno con conexión, el cambio no se nota.

**Independent Test**: contra el stack con una cuenta, o contra la API simulada de la red E2E, abrir el taller sin copia, recorrer las ocho vistas y los cinco enlaces profundos de A2, y comparar el volcado de los globals con `dump-globals`.

**Acceptance Scenarios**:

1. **Dado** un alumno con sesión y sin copia, **cuando** abre el taller, **entonces** el arranque pide la sesión y después las 17 porciones, y recién con las 17 válidas y de la versión de la sesión publica los globals y evalúa las vistas, en el orden de A2.
2. **Dado** el progreso de `qa/fixtures/progress-master-2a278ad-storage.json`, **cuando** arranca con el contenido de la API, **entonces** no escribe, no respalda ni avisa, como hoy.
3. **Dado** cada enlace profundo de A2 (`?ejercicio=…&paso=code#laboratorio`, `?campana=…&ejercicio=…#laboratorio`, `?sistema=…&ejercicio=…#laboratorio`, `?mundo=…#campana` y `?lenguaje=go&taller=…&parte=…#sistemas`), **cuando** se abre o se recarga, **entonces** muestra la misma vista y el mismo contexto.
4. **Dado** un pedido de contenido, **cuando** se inspecciona, **entonces** va al mismo origen, lleva la cookie de la sesión y no lleva `X-XSRF-TOKEN` ni `X-Taller-User`, que son de los pedidos que modifican.

*Cubre: FR-001, FR-005 a FR-007, FR-013, FR-014, FR-035 y FR-041; SC-001 y SC-002.*

---

### User Story 2 - Una recarga no vuelve a bajar el contenido (Priority: P1)

El alumno recarga, o vuelve otro día. Si el contenido no cambió, el navegador no baja nada y usa su copia. Si cambió, baja sólo lo que cambió.

**Why this priority**: los 11 enlaces que cambian la query, como el menú «Laboratorio», recargan el documento (F1 lo midió). Sin la copia, cada recarga costaría el currículo entero, y un aula entera, miles de pedidos.

**Independent Test**: abrir con la copia vacía, recargar y contar los pedidos; cambiar una porción en la API simulada (otra `contentVersion`) y volver a recargar.

**Acceptance Scenarios**:

1. **Dado** una copia completa en la `contentVersion` de la sesión, **cuando** el alumno recarga, **entonces** el arranque hace un solo pedido, el de la sesión, y publica la copia.
2. **Dado** una copia de otra versión, **cuando** arranca, **entonces** pide las 17 porciones con el `If-None-Match` de cada una. Las que no cambiaron responden 304 y se toman de la copia, y las que cambiaron llegan con su cuerpo.
3. **Dado** un arranque que publicó contenido del servidor, **cuando** avisa que guardó la copia, **entonces** la copia tiene esa versión, la fecha y las 17 porciones con su `ETag`, y el almacenamiento del progreso no se tocó.
4. **Dado** el almacén de la copia bloqueado o lleno, **cuando** arranca, **entonces** el taller abre igual desde el servidor, sin aviso de error.

*Cubre: FR-005 a FR-007, FR-015, FR-018 a FR-020 y FR-022; SC-002.*

---

### User Story 3 - Sin servidor, el alumno sigue con la última copia y lo sabe (Priority: P1)

El servidor no responde. Si el alumno ya había estudiado en ese navegador, el taller abre con la copia y un aviso que dice de cuándo es. Si no, ve el error de A2 con «Reintentar». El progreso no se toca.

**Why this priority**: es la mitigación que el ADR 0004 pidió a cambio de que el contenido dependa del backend, y lo que protege al alumno de una caída.

**Independent Test**: con la copia guardada, hacer fallar la API simulada de cada modo de FR-023 y comprobar que el taller abre con el aviso; repetirlo sin copia y comprobar la vista de error; comparar el almacenamiento del progreso antes y después.

**Acceptance Scenarios**:

1. **Dado** una copia usable y una API que no responde, **cuando** arranca, **entonces** publica la copia, evalúa las vistas y muestra el aviso con la fecha de la copia, fuera de `#main` y sin mover el foco.
2. **Dado** ninguna copia y una API que no responde, **cuando** arranca, **entonces** muestra la vista de error con «Reintentar», no evalúa ninguna vista y deja el progreso como estaba.
3. **Dado** un arranque con `#invitacion=<token>` o con el token de restablecimiento, y una API que no responde, **cuando** arranca, **entonces** no usa la copia aunque exista: muestra la vista de error.
4. **Dado** un navegador que tenía la copia de V1, publicó V2 y no pudo guardar la copia nueva, **cuando** después arranca sin servidor, **entonces** no abre con V1: muestra la vista de error, y no se descarta ningún registro del progreso.
5. **Dado** el aviso sin servidor, **cuando** lo lee un lector de pantalla o se ve en un teléfono, **entonces** se anuncia una vez y en español, no se mueve y no tapa el contenido.

*Cubre: FR-016, FR-017, FR-019, FR-021 y FR-023 a FR-028; SC-003 y SC-004.*

---

### User Story 4 - La sesión manda (Priority: P2)

Sin sesión, el arranque no pide contenido ni usa la copia: espera el ingreso de F11a. Si la sesión vence en medio del arranque, pide el ingreso y sigue sin recargar la página.

**Why this priority**: desde C3a el contenido está detrás de la sesión, y un arranque que la saltara contradice al ADR 0004 §1 y a C4.

**Independent Test**: con la API simulada y «pedir el ingreso» simulado, responder `user: null`, un 401 en una porción, un 403 y `contentVersion: null`, y observar qué se espera y qué pedidos salen.

**Acceptance Scenarios**:

1. **Dado** `user: null`, **cuando** arranca, **entonces** no pide ninguna porción ni usa la copia, y la etapa de sesión espera «pedir el ingreso». Cuando termina con la cuenta, el arranque sigue con el contenido, sin recargar y sin volver a otra etapa.
2. **Dado** un 401 en una porción, **cuando** llega, **entonces** el arranque llama a «pedir el ingreso» y lo espera. Al terminar, vuelve a pedir la sesión y repite la ronda, sin recargar.
3. **Dado** un 403 en una porción, **cuando** llega, **entonces** muestra la vista de error con el texto de acceso, sin usar la copia.
4. **Dado** `contentVersion: null`, es decir, un servidor que todavía no importó contenido, **cuando** arranca, **entonces** no pide las 17 porciones: usa la copia o muestra el error.

*Cubre: FR-001 a FR-004, FR-012 y FR-021; SC-005.*

---

### User Story 5 - Ni un import ni un aula entera rompen el arranque (Priority: P2)

Un import de contenido ocurre mientras un alumno arranca: el arranque lo detecta y repite, sin mezclar versiones. Un aula de 40 abre el taller a la vez detrás de una misma IP: los 429 de Nginx se esperan con su `Retry-After`.

**Why this priority**: las vistas legacy necesitan el currículo completo y de una sola versión (A2, riesgo 1). Además, C3a calibró la ráfaga de Nginx para un aula de 40 con 400 pedidos de margen y 50 por segundo (research de C3a, R14), y con `nodelay` el exceso recibe un 429 en lugar de esperar en una cola.

**Independent Test**: en la API simulada, cambiar la `Content-Version` de una porción a mitad de una ronda, y responder 429 y 503 con `Retry-After`. Contra el stack, 40 arranques en frío desde una IP.

**Acceptance Scenarios**:

1. **Dado** una porción con una `Content-Version` distinta de la de la sesión, **cuando** llega, **entonces** el arranque no publica esa ronda, vuelve a pedir la sesión y repite, hasta el tope de rondas.
2. **Dado** que el tope se agota, **cuando** termina el intento, **entonces** el contenido no llegó: se usa la copia, si se puede, o se muestra la vista de error con el texto de actualización.
3. **Dado** un 429 o un 503 con un `Retry-After` que cabe en el tiempo que le queda al intento, **cuando** llega, **entonces** el arranque espera y repite ese pedido. Si no cabe, como el `Retry-After: 60` de `content_not_imported`, falla enseguida.
4. **Dado** 40 arranques en frío desde una misma IP contra el stack, **cuando** abren a la vez, **entonces** ninguno ve la vista de error.

*Cubre: FR-008 a FR-011 y FR-042; SC-006, SC-007 y SC-010.*

---

### User Story 6 - Quien mantiene el taller trabaja sin el archivo estático (Priority: P3)

El build ya no emite el contenido, la imagen web no lo lleva y el servidor de desarrollo, que pasa `/api` al stack desde F11a, deja de servir el archivo. Los checks y la red E2E prueban lo mismo que antes con una API simulada, sin Laravel.

**Why this priority**: sin esto C4 no se despliega (su FR-022), y la red de pruebas dejaría de correr en la CI, que no levanta la API para el front.

**Independent Test**: construir, buscar `dist/content/`, correr `npm test` y la red E2E sin el stack, y pedirle `/content/` a la imagen web.

**Acceptance Scenarios**:

1. **Dado** el build, **cuando** se inspecciona `dist/`, **entonces** no tiene `content/`, y `build-check` lo exige.
2. **Dado** la imagen web, **cuando** se le piden `/content/` y `/content/curriculum.<versión>.json`, **entonces** responde 404.
3. **Dado** `npm test` y `npm run test:e2e` sin el stack, **cuando** corren, **entonces** pasan con la API simulada, y `dist-content-check` compara los globals con `dump-globals` y las 17 porciones con sus huellas.
4. **Dado** `npm run dev` con el stack levantado y una sesión, **cuando** se abre, **entonces** el contenido llega de la API del stack, por el proxy que trae F11a.

*Cubre: FR-029 a FR-040 y FR-043; SC-008 y SC-009.*

---

### Edge Cases

- **Una copia de un front anterior:** la copia vale para cualquier build del front, porque su forma se valida igual que la respuesta del servidor (FR-017). Un cambio del front que dependa de una forma nueva del contenido sube la versión de formato de la copia, y eso descarta las anteriores (FR-018).
- **Una copia «vieja»:** sin servidor no se puede saber si hay una versión más nueva. Por eso la copia se describe por la última fecha en que el servidor confirmó su versión, y el aviso lo dice así.
- **Dos pestañas:** cada una pasa por la sesión y por la copia por su cuenta. Si las dos guardan, queda una copia completa, la de la última escritura. Una pestaña abierta sigue con la versión con que arrancó, porque el contenido no se vuelve a pedir hasta recargar, como con A2.
- **Un import con la pestaña abierta:** no pasa nada hasta la próxima recarga, que baja sólo lo que cambió.
- **El servidor vuelve mientras el alumno usa la copia:** el aviso le pide que recargue. La copia no se reemplaza en caliente, porque las vistas ya se evaluaron.
- **Sesión vencida y sin servidor:** no se puede saber. Con la copia, el alumno sigue, porque no había cerrado la sesión (Q2). En la próxima recarga con servidor, la sesión responde `user: null`: la copia se borra y se pide el ingreso.
- **Una sesión que no responde JSON** (un portal cautivo o un proxy que contesta HTML): cuenta como un servidor que no responde.
- **La sesión responde y las porciones no** (PHP saturado, un 503 `maintenance`): el contenido no llegó, y se usa la copia o se muestra el error.
- **Un 304 sin copia:** no debería pasar, porque el `If-None-Match` sale de la copia. Si pasa, el contenido no llegó.
- **Un `ETag` débil:** Nginx lo debilita (`W/"…"`) al comprimir. Se guarda y se devuelve tal como llegó, y C2 lo compara en forma débil.
- **El almacén de la copia, bloqueado** (modo privado estricto, cuota llena o política del navegador): el arranque sigue sin copia. El escenario de F1 «arranque con el almacenamiento bloqueado», que bloquea `localStorage`, no cambia.
- **Otra cuenta en el mismo navegador:** el contenido es el mismo para todas las cuentas, así que la copia sirve. Lo que cambia con la cuenta es el progreso (D1c).
- **La URL cambia durante la espera:** como en A2, la compuerta no lee ni escribe la URL. Los fragmentos con token los borra antes la etapa de los tokens de F11a.
- **Sin JavaScript:** el aviso `noscript` de hoy no cambia.
- **Movimiento reducido:** ni el aviso ni los estados se animan.

## Requirements *(mandatory)*

### Functional Requirements

**La etapa de sesión (de F11a, que A3 extiende)**

- **FR-001**: La etapa de sesión la introduce F11a: pide `GET /api/session` en cada arranque y, con `user: null`, espera «pedir el ingreso». A3 la extiende: DEBE tomar de la respuesta la `contentVersion` para las porciones, y volver a pedir la sesión en cada ronda nueva (FR-008) y después del ingreso que pidió un 401 (FR-012). Ninguna lectura de la sesión lee ni escribe la URL ni el almacenamiento del progreso. *(ADR 0006 §7, pasos 1 y 4; C3a; clarify, C1)*
- **FR-002**: Con `user: null`, al arrancar o al repetir la sesión, el arranque NO DEBE pedir porciones ni usar la copia: la etapa de sesión espera «pedir el ingreso» de F11, que termina con la cuenta, y sigue con el contenido. El arranque no vuelve a ninguna etapa, porque `runBoot` corre cada una una sola vez. *(ADR 0004 §1; C3a, User Story 3; clarify, R1)*
- **FR-003** *(R1 y C1)*: La etapa de sesión, de F11a, entrega a las siguientes `user`, `features` y `contentVersion`, o que el servidor no respondió, y F11 expone «pedir el ingreso». A3 le suma dos cosas: que, cuando el servidor no respondió, se use la copia o se muestre la vista de error (FR-023), y que se respete el aviso de que la URL traía un token, que deja la etapa de los tokens de F11a (FR-024). D1c reutiliza la etapa para comparar la cuenta. *(A2, FR-013; D1)*
- **FR-004**: Con `contentVersion: null`, que significa que no hay ningún import, el arranque NO DEBE pedir las 17 porciones: el contenido no llegó (FR-023). *(C3a, Edge Cases)*

**Las porciones**

- **FR-005**: Con una copia usable (FR-017) en la `contentVersion` de la sesión, el arranque NO DEBE pedir ninguna porción: publica la copia. Ese arranque hace un solo pedido a la API. *(ADR 0006 §7, paso 2)*
- **FR-006**: Si no, el arranque DEBE pedir las 17 porciones a sus recursos de C2 (la tabla de «Key Entities»), cada una con el `If-None-Match` que la copia guarda para ella, si hay copia, aunque sea de otra versión. *(ADR 0006 §7, paso 3; C2, FR-017 y FR-018)*
- **FR-007**: Un 304 DEBE tomar de la copia el dato de esa porción, y un 200, del cuerpo. Cada respuesta, 200 o 304, DEBE traer una `Content-Version` igual a la de la sesión, y cada porción, la forma que corresponde a su nombre (las reglas de A2). *(ADR 0006 §7; A2, FR-007)*
- **FR-008**: Si una `Content-Version` difiere de la de la sesión, el arranque NO DEBE publicar nada de esa ronda: vuelve a pedir la sesión y repite los pedidos con la versión nueva, hasta un tope de rondas por intento (3, propuesta que el plan fija). Agotado el tope, el contenido no llegó, con el tipo `version`. *(ADR 0006 §7, paso 4)*
- **FR-009**: Ante un 429 o un 503 con `Retry-After`, el arranque DEBE esperar lo indicado y repetir ese pedido, si la espera cabe en el tiempo que le queda al intento. Si no cabe, el contenido no llegó, sin esperar. *(C3a, «Lo que el front tiene que hacer»; C2, FR-022)*
- **FR-010**: El tope de espera de A2 (20 s; research de A2, R6) DEBE cubrir el intento entero: la sesión, las porciones, las esperas de `Retry-After` y las rondas. El tiempo que el alumno pasa en «pedir el ingreso» no cuenta para el tope. El umbral del estado de carga (400 ms) y la regla de un intento por vez siguen como en A2. *(A2, FR-007, FR-009 y FR-010)*
- **FR-011**: Las demás respuestas que no son de éxito (otro estado 4xx o 5xx, un cuerpo que no es JSON, una porción de otra forma o un 304 sin copia) DEBEN tratarse como en A2: el contenido no llegó, con el tipo que corresponde. Un 404 de un recurso deja de significar «otra versión» y pasa a ser `status`. *(A2, FR-007)*
- **FR-012**: Un 401 en una porción DEBE llamar a «pedir el ingreso» de F11 y esperarlo, sin recargar y una sola vez por intento. Cuando termina, el arranque vuelve a pedir la sesión y repite la ronda. Si el 401 se repite en el mismo intento, muestra la vista de error con el tipo `status` y el texto general. Un 403 DEBE mostrar la vista de error con el tipo nuevo `access` y su texto (FR-028). Ninguno de los dos usa la copia. *(Contrato HTTP de C3a; clarify, R1)*
- **FR-013**: La versión esperada DEBE ser la `contentVersion` de la sesión. La constante del build (`__CONTENT_VERSION__`) se retira (FR-029), y FR-011 de A2 pasa de «nunca contenido de otro build» a «nunca dos versiones en un arranque»: la versión la decide el servidor. *(Plan de A2, «Contrato de salida hacia A3 y C4»)*
- **FR-014**: Por ronda, el arranque DEBE hacer a lo sumo 18 pedidos, la sesión y las 17 porciones, sin contar los que repite un `Retry-After`. Las porciones pueden ir a la vez. Los pedidos de contenido son de sólo lectura: llevan la cookie de la sesión y no llevan `X-XSRF-TOKEN` ni `X-Taller-User`. *(Contrato HTTP de C3a, «Convenciones»)*

**La última copia**

- **FR-015** *(Q4)*: Después de publicar contenido que llegó del servidor, el arranque DEBE guardar una copia completa: la `contentVersion`, la última fecha en que el servidor confirmó esa versión y las 17 porciones con su `ETag`. Va en IndexedDB (Q4), aparte de Web Storage, con una versión de formato propia. Un arranque que publica la copia porque el servidor confirmó su versión (FR-005) actualiza esa fecha. Una porción extra y opcional, como la plantilla si A4 decide guardarla, no invalida las copias existentes. Cuando la copia termina de guardarse, o cuando falla, el arranque DEBE avisarlo con una señal que observan los checks y los E2E, como la señal de publicación de FR-025 de A2, y que no es un global `window.*`. Las pruebas que recargan esperan esa señal, así que sus cuentas de pedidos no dependen de cuánto tardó la escritura.
- **FR-016**: La copia DEBE ser la versión que este navegador publicó por última vez, o no DEBE haber copia. Antes de publicar una versión distinta de la de la copia, el arranque la invalida. La nueva se guarda completa después, y si no se puede guardar, el navegador queda sin copia. Una copia más vieja que lo publicado haría que un arranque sin servidor descartara registros del progreso (A2, riesgo 1).
- **FR-017**: Una copia DEBE usarse sólo si está completa (las 17 porciones), tiene la versión de formato vigente y cada porción tiene la forma de su nombre (las reglas de A2). Si no, se descarta y se borra, sin aviso.
- **FR-018**: La copia NO DEBE vencer por tiempo: se reemplaza cuando el servidor anuncia otra versión. Vale para cualquier build del front, y un cambio del front que dependa de una forma nueva del contenido DEBE subir la versión de formato de la copia.
- **FR-019**: Si el almacén de la copia no está disponible o falla, el arranque DEBE seguir sin copia, sin aviso de error y sin tocar el progreso.
- **FR-020**: Antes de publicar, el arranque NO DEBE leer ni escribir las cuatro claves de progreso, sus respaldos ni ninguna otra clave de Web Storage. Esto precisa a propósito el FR-008 de A2: antes de publicar, el arranque sí lee la copia del contenido, que no es progreso ni vive en Web Storage. *(A2, FR-008; ADR 0003)*
- **FR-021** *(Q2)*: La copia DEBE borrarse cuando el alumno sale de su cuenta y cuando la sesión responde `user: null`: sin servidor, sólo la usa quien no cerró su sesión en ese navegador. La salida es de F11a, y A3 le suma borrar la copia. En el modo «computadora compartida», que llega con F11d y D1c, no se guarda copia: lo aplica quien implemente ese modo.
- **FR-022**: DEBE haber a lo sumo una copia por origen, y dos pestañas que guardan a la vez dejan una copia completa.

**Sin servidor: la copia y el aviso**

- **FR-023**: El contenido no llegó cuando la sesión o una porción fallan por red o por el tope, responden 5xx o un 429 que no cabe en el intento, devuelven algo que no es JSON o una porción de otra forma, se agota el tope de rondas, o la sesión trae `contentVersion: null`. En ese caso, con una copia usable (que por FR-021 sólo existe si nadie cerró la sesión en ese navegador), el arranque DEBE publicarla y seguir como si el contenido hubiera llegado; sin copia usable, DEBE mostrar la vista de error de A2. Nunca usa la copia en los casos de sesión (FR-002 y FR-012). *(ADR 0004 §2, «Entrega»)*
- **FR-024**: Un arranque que trae un token de invitación o de restablecimiento NO DEBE usar la copia: si el contenido no llega, muestra la vista de error. La etapa de los tokens de F11a, que lo borra de la URL, le avisa al arranque que lo había (FR-003), en memoria: antes de publicar, ninguna etapa usa Web Storage (FR-020).
- **FR-025**: Con la copia publicada por falta de servidor, el alumno DEBE ver un aviso persistente, fuera de `#main`, con este texto: «No se pudo traer el contenido del servidor del taller. Estás usando la copia que guardó este navegador, que estaba al día el {fecha}. Tu progreso sigue guardado en este navegador. Recargá la página más tarde para traer el contenido al día.», donde {fecha} es la de FR-015 escrita en español (por ejemplo, «7 de octubre de 2026»).
- **FR-026**: El aviso DEBE ser accesible y no estorbar. Es una región `status` que se anuncia una vez, no toma el foco, no se anima, se lee en un teléfono y en un escritorio sin tapar el contenido ni el menú, y usa los estilos del shell, sin `style=` ni scripts en línea (la CSP de C4). No usa el `#toast` ni pisa los avisos de carga que muestra `startApp()`. *(Constitución, principio VI)*
- **FR-027**: Sin copia usable, la vista de error DEBE ser la de A2: en `#main`, con «Reintentar», el foco en el botón y un intento por vez. «Reintentar» DEBE repetir el intento entero, sesión incluida. *(A2, FR-007 a FR-010)*
- **FR-028**: Los tipos de falla son los de A2 más `access`, y el tipo va en `data-failure`, como en A2. Los textos de la vista de error DEBEN ser: el general de A2 para `network`, `timeout`, `status`, `body` y `shape`; para `version`, «El contenido del taller se está actualizando. Tu progreso sigue guardado en este navegador. Probá de nuevo en unos segundos.»; y para `access` (un 403), «Tu cuenta no puede ver el contenido del taller. Si creés que es un error, consultá con quien administra el taller.». El título, el botón y el estado de carga siguen como en A2.

**El archivo estático, el build y el desarrollo**

- **FR-029**: El build NO DEBE emitir el contenido. Se retiran `dist/content/`, la fuente estática y su spec, `__CONTENT_VERSION__` y, del plugin de `frontend/vite.config.ts`, la emisión del archivo y el middleware de `npm run dev`; los avisos de licencia se quedan. *(Plan de A2, «Contrato de salida hacia A3 y C4»)*
- **FR-030**: `build-check` DEBE exigir que `dist/content/` no exista, y conservar el oráculo de ausencia (`curriculumMarkers()`) y el tope medido. La imagen web no lleva el documento: `/content/` y `/content/curriculum.<versión>.json` responden 404, como lo vigila el FR-022 de C4.
- **FR-031**: El cambio de fuente DEBE ser un corte. Ningún front que se integre lee las dos fuentes, y la copia sólo guarda contenido que llegó de la API. Si el plan parte A3 en varios PR, la fuente estática sigue siendo la única activa hasta el corte.
- **FR-032** *(pasa a F11a por el clarify)*: El proxy de `/api/` de `npm run dev` llega con F11a (C1). A3 no lo construye: con A3, el contenido llega por ese mismo proxy, y lo único que A3 retira de `npm run dev` es el middleware del archivo estático (FR-029). *(ADR 0004, «Consecuencias»)*
- **FR-033** *(pasa a F11a por el clarify)*: La vista previa pasa `/api/` al stack levantado desde F11a (Q3 y C1). A3 no la cambia: con A3, la vista previa recibe el contenido por esa misma API.
- **FR-034**: NO DEBE agregarse ninguna dependencia: `package.json` y el lockfile no suman paquetes. *(Constitución, principio VII)*

**Oráculos, checks y E2E**

- **FR-035**: `node tools/content/dump-globals.ts <raíz>` DEBE dar los mismos bytes antes y después de A3. Los globals que publica el bundle (los quince `window.*` de los adaptadores y el catálogo del Atlas, que cubren las 17 porciones) DEBEN ser los del oráculo, con el mismo orden de claves. *(A2, FR-017; criterio de C2 en la hoja de ruta)*
- **FR-036**: `dist-content-check` DEBE arrancar el bundle construido con una API simulada que sirve la sesión y los 17 recursos con los bytes del generador: cada porción de `build/curriculum.json` en JSON compacto, con su `ETag` y su `Content-Version`. DEBE exigir que los globals sean los de `dump-globals`, que las 17 porciones publicadas tengan las huellas de `portions` y que el arranque haga la sesión y 17 pedidos. Se retira la aserción de los bytes servidos contra el `documentHash`. Los valores esperados salen del generador, nunca del código de A3. *(A2, FR-018; ADR 0004 §5)*
- **FR-037**: `boot-check` DEBE conservar sus casos de la base sin cambiar sus valores esperados, con la API simulada en su arnés, que es el único lugar que cambia. Además suma: la sesión antes que el contenido; `user: null` sin pedidos de contenido; la ronda repetida por una `Content-Version` distinta; un 429 con `Retry-After`; un 401 que llama a «pedir el ingreso»; y los modos de falla de FR-023, con el almacenamiento del progreso intacto. *(A2, FR-020)*
- **FR-038**: Los 106 E2E de F1 DEBEN pasar sin editar sus escenarios. El único lugar que cambia es el doble de la API que F11a agrega como fixture automático en `qa/e2e/fixtures/index.ts`, con una sesión simulada por omisión (F11-Q1 y R1): A3 le suma los 17 recursos con los bytes del generador y sus validadores. La red sigue sin tocar servicios públicos. *(Hoja de ruta del front, F1; ADR 0008; clarify, R1)*
- **FR-039**: Los 17 E2E de A2 DEBEN adaptarse en un commit propio, con TDD, conservando su intención. Cambian el transporte simulado (de `**/content/curriculum.*.json` a la sesión y los recursos de la API), las cuentas de pedidos y el tipo de falla de dos casos. Lo que se conserva tal cual y lo que cambia está en «Compatibilidad: lo que se conserva y lo que cambia».
- **FR-040**: A3 DEBE sumar sus E2E a la red de F1: la recarga con la copia al día (un pedido); el cambio de versión (304 y 200); sin servidor con copia (el aviso, en un escritorio y en un teléfono) y sin copia (el error); el token sin servidor; el invariante de FR-016; `user: null` y el 401 hacia «pedir el ingreso»; la `Content-Version` distinta; el 429; y el almacén de la copia bloqueado. *(ADR 0008)*
- **FR-041**: Arrancar con las fixtures de progreso congeladas, desde el servidor o desde la copia, NO DEBE escribir, respaldar ni avisar. *(ADR 0003; `qa/AGENTS.md`)*
- **FR-042**: Una prueba contra el stack DEBE medir 40 arranques en frío desde una misma IP (SC-007) e informar el tiempo hasta la primera vista con y sin copia, comparado con el de A2. El tiempo es un dato, sin umbral.

**Documentación**

- **FR-043**: La documentación que describe el archivo estático o cómo llega el contenido DEBE decir lo que pasa, en el mismo cambio: `AGENTS.md`, `README.md`, `docs/architecture.md` (las filas de los catálogos y la salida de `dist/`) y `qa/AGENTS.md` (los oráculos, `dist-content-check`, `boot-check` y la red E2E). La del proxy de `npm run dev` y de la vista previa la escribe F11a. El plan lista cada pasaje.

### Key Entities *(include if feature involves data)*

- **Etapa de sesión:** la etapa del arranque que introduce F11a (C1). Pide `GET /api/session`, espera «pedir el ingreso» cuando recibe `user: null` y entrega a las siguientes `user`, `features` y `contentVersion`, o que el servidor no respondió. A3 la extiende.
- **«Pedir el ingreso»:** la operación de F11 que se espera y termina con la cuenta (R1). La llama la etapa de sesión con `user: null`, al arrancar y después de un 401 en una porción.
- **Sesión:** la respuesta de C3a, `{user | null, features, contentVersion | null, catalogs}`, con `Cache-Control: no-store`. Con una sesión inválida responde `user: null`, nunca 401.
- **Porción y su recurso:** la unidad de contenido que publica C2. A3 pide estas 17 (verificado contra `Portion::resolve` y [`backend/api/routes/api.php`](../../backend/api/routes/api.php)):

  | Porciones | Recurso |
  | --- | --- |
  | `lab.rust`, `lab.go` | `GET /api/exercises?catalog=lab&language=rust` o `go` |
  | `quests.rust`, `quests.go` | `GET /api/exercises?catalog=quests&language=…` |
  | `cores.lowlevel`, `cores.infra`, `cores.play`, `cores.pc` | `GET /api/exercises?catalog=cores&domain=…` |
  | `campaign.rust`, `campaign.go` | `GET /api/worlds?language=…` |
  | `workshops.lowlevel`, `workshops.infra`, `workshops.play`, `workshops.pc` | `GET /api/workshops?domain=…` |
  | `atlas.rust`, `atlas.go` | `GET /api/atlas?language=…` |
  | `guide` | `GET /api/guide` |

- **Validador:** el `ETag` de cada porción (los primeros 32 hexadecimales de su huella, entre comillas, que Nginx debilita al comprimir) y `Content-Version` (los primeros 32 del `documentHash`).
- **Versión del contenido:** la `contentVersion` de la sesión, que tiene que coincidir con la `Content-Version` de cada respuesta de la ronda.
- **Intento:** una corrida del protocolo (la sesión y hasta el tope de rondas) con el tope de espera de 20 s. Hay uno por vez, y lo empiezan el arranque o «Reintentar».
- **Ronda:** los 17 pedidos de porciones para una versión de la sesión.
- **Última copia:** a lo sumo una por origen, con su versión de formato, la `contentVersion`, la última fecha en que el servidor confirmó esa versión y las 17 porciones, cada una con su `ETag` y su dato. Su invariante: es la versión que este navegador publicó por última vez, o no existe.
- **Señal de la copia guardada:** el aviso que da el arranque cuando la copia terminó de guardarse o falló (FR-015). Lo observan los checks y los E2E, y no es un global `window.*`.
- **Aviso sin servidor:** la región persistente que dice que el contenido viene de la copia y de cuándo es.
- **Vista de error:** la de A2, en `#main`, con «Reintentar» y los textos de FR-028.
- **API simulada:** el doble de la API que usan los checks y la red E2E. El de la red E2E lo trae F11a con una sesión simulada por omisión, y A3 le suma los 17 recursos; los checks arman el suyo en su arnés. Sirve la sesión y los 17 recursos con los bytes del generador y sus validadores, y los arma desde `build/curriculum.json` y `build/curriculum.meta.json`, nunca desde el código de A3.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con la API (el stack con una cuenta, o la simulada), el volcado de los globals que publica el bundle y el de `dump-globals` son idénticos, con 0 diferencias, y las 17 porciones publicadas tienen la huella de `portions`: 17 de 17.
- **SC-002**: Pedidos por arranque, contados después de la señal de la copia guardada (FR-015). Sin copia: 1 de sesión y 17 de porciones. Con la copia en la versión de la sesión: 1 y 0. Con una copia de otra versión en la que cambió una sola porción: 1 y 17, con 16 respuestas 304 y 1 respuesta 200. Con el almacén de la copia bloqueado, el taller abre desde el servidor con 1 y 17.
- **SC-003**: En los 9 modos de FR-023 (red caída, tope de espera, 500, 503, 429 que no cabe, cuerpo que no es JSON, porción de otra forma, versión inestable y `contentVersion: null`): con copia usable, el taller abre con el aviso 9 de 9 veces; sin copia, muestra la vista de error 9 de 9 veces, y «Reintentar» recupera el arranque en un intento cuando el servidor vuelve. En los 18 casos hay 0 escrituras, 0 respaldos y 0 avisos de datos descartados en el progreso.
- **SC-004**: En el caso de FR-016 (publicó V2 y no pudo guardar la copia), un arranque sin servidor muestra la vista de error y descarta 0 registros. Con un token en la URL, 0 arranques sin servidor usan la copia.
- **SC-005**: Con `user: null`, el arranque hace 0 pedidos de porciones y no usa la copia. Un 401 espera «pedir el ingreso», y el arranque sigue en el mismo intento, sin recargar la página. Después de salir, y después de una sesión que responde `user: null`, quedan 0 copias.
- **SC-006**: Con un import en medio del arranque, 0 arranques publican porciones de dos versiones, y con el tope de rondas agotado, el alumno ve la copia o el error de actualización.
- **SC-007**: De 40 arranques en frío y a la vez desde una misma IP contra el stack, 0 ven la vista de error, y se informa cuánto tardó el último.
- **SC-008**: Pasan los 106 E2E de F1 sin editar sus archivos de specs (sólo cambia el doble de F11a, al que A3 suma las porciones), los 17 de A2 adaptados y los de A3. Están en verde `npm test` (con `dist-content-check` y `boot-check` adaptados), `npm run build`, `npm run lint`, `npm run format:check` y `git diff --check`, y `dump-globals` da los mismos bytes.
- **SC-009**: `dist/` no tiene `content/`; la imagen web responde 404 a `/content/` y a `/content/curriculum.<versión>.json`; el HTML no tiene marcadores del currículo; y hay 0 dependencias nuevas.
- **SC-010**: Se informa el tiempo hasta la primera vista con copia y sin copia, contra el de A2. Es un dato, sin umbral.

## Assumptions

- A2 está implementada en el PR #40 (`f2a/base`, `2ffbbc6`), con la compuerta, `ContentSource`, `content-stage.ts`, `getContent()`, la vista de error y los 17 E2E. Esta spec describe ese código. Si el PR #40 cambia antes de entrar a `master`, el plan lo vuelve a contrastar.
- C2, C3a, C3b, B2, D1a y D1b están entregadas en `master` (`e87772d`). Las rutas y las respuestas de la API se leyeron en ese código: [`backend/api/routes/api.php`](../../backend/api/routes/api.php), [`ContentDelivery`](../../backend/api/app/Content/ContentDelivery.php) y [`SessionController`](../../backend/api/app/Http/Controllers/SessionController.php).
- `GET /api/session` no trae `appBuild` (C3a), y A3 no lo necesita: la versión del contenido la da `contentVersion`.
- El ADR 0006 está en estado «propuesta». Esta spec usa como base su protocolo de arranque (§7) y lo dice.
- **Sobre F11a** (spec 015), según el clarify (P1, R1, F11-Q1 y C1), F11a trae:
  - la etapa de los tokens, que borra los fragmentos con token de la URL antes de la etapa de sesión, aunque el servidor no responda, y recuerda en memoria que los había;
  - la etapa de sesión con «pedir el ingreso»;
  - la salida de la cuenta, a la que A3 le suma borrar la copia;
  - el doble de la API como fixture automático de los E2E, con una sesión simulada por omisión;
  - el proxy de `/api/` de `npm run dev` y de la vista previa.

  A3 parte de eso. Si F11a entrega otra cosa, el plan de A3 lo vuelve a contrastar.
- **Sobre F2b:** nada por debajo de `app` importa `getContent()` (FR-015 de F2), y A3 lo respeta. La etapa de sesión (de F11a) y la compuerta viven en `frontend/src/app/boot/`, y la fuente de la API, en `frontend/src/shared/api/content/`, junto a la interfaz de A2.
- La lista de 17 porciones es fija. E1 suma su porción junto con el código del front que la usa. A2 suponía que A3 tomaría la lista de `GET /api/session`; esta spec no lo hace, porque el front no puede usar una porción para la que no tiene código (YAGNI).
- El contenido es el mismo para todas las cuentas (C2). La copia no tiene datos personales, y el currículo ya es público en el repositorio.
- Los navegadores son los modernos que usa el taller, con IndexedDB; la red E2E corre en Chromium (ADR 0008). Un navegador sin el almacén sigue FR-019.
- Los límites de Nginx son los valores iniciales de C3a (R14), y C4 los afina.
- El tope de 3 rondas y el reparto del tiempo del intento son propuestas; el plan los fija con una medición.
- Esta spec se escribió sin Docker, sin `npm` y sin descargas. El código de la API se leyó en esta rama, y el de A2, en el worktree del PR #40. No hay descargas previstas.

## Compatibilidad: lo que se conserva y lo que cambia

**Sin cambios:**

- el oráculo `dump-globals` y los globals que publica el bundle (FR-035);
- el progreso guardado: las cuatro claves de `localStorage` y sus respaldos no se leen ni se escriben antes de publicar (FR-020), y las fixtures congeladas arrancan sin escribir (FR-041);
- la compuerta de A2, su vista, el almacén, `getContent()`, el evento de publicación y la regla de un intento por vez;
- el orden de la cadena legacy y `legacy-views.ts`.

**Lo que cambia, y por qué:**

- **`main.tsx` y `load-order-check`:** A3 no suma etapas. La de los tokens y la de sesión llegan con F11a, como preveía FR-013 de A2, y A3 extiende la de sesión y cambia la fuente de la compuerta. `load-order-check` sigue sin relajar ninguna restricción.
- **`dist-content-check`** (FR-036): ya no hay archivo servido, así que se retira la aserción de sus bytes contra el `documentHash`. Se conservan los globals contra `dump-globals` y las 17 huellas.
- **`boot-check`** (FR-037): su arnés sirve una API simulada en lugar del archivo, y sus casos conservan los valores esperados.
- **`build-check`** (FR-030): pasa de exigir el archivo junto al HTML a exigir que no esté.
- **Los 106 E2E de F1** (FR-038): sus specs no cambian. El doble de la API de F11a, que ya los hace pasar con la sesión simulada, suma las 17 porciones.
- **Los 17 E2E de A2** (FR-039): el transporte que simulan, `**/content/curriculum.*.json`, deja de existir. Se adaptan así, y cada uno arranca con un navegador vacío (Playwright crea un contexto por prueba), sin copia, como en A2:

| E2E de A2 | Se conserva tal cual | Cambia |
| --- | --- | --- |
| Los cinco enlaces profundos y la recarga (5) | Las URL, lo que se ve en cada vista (título, pestaña, menú, idioma y parte), la detección de la recarga, la URL final y que no haya error | La cuenta de pedidos: el primer arranque hace la sesión y 17 porciones, y la recarga, sólo la sesión, porque la copia está al día. La prueba espera la señal de la copia guardada (FR-015) antes de recargar. En A2 era un pedido por carga |
| El contenido no llega (6) | La alerta con «Tu progreso sigue guardado», «Reintentar», ninguna vista evaluada, el menú y el progreso intacto (0 lecturas y 0 escrituras de Web Storage, las cuatro claves iguales y ninguna `:respaldo`) | La ruta simulada pasa a ser la sesión o una porción. El 404 pasa a ser `status` (en A2, `version`). «Una porción ausente» pasa a ser «una porción no llega» (`network`), porque la API no puede omitir una porción: así prueba el todo o nada entre pedidos separados |
| El tope de 20 s (1) | El reloj simulado, el texto, el tipo `timeout` y el progreso intacto | Lo que no responde es la sesión |
| El reintento (2) | La recuperación sin recargar, el foco en «Reintentar» y el progreso intacto | Falla la sesión, y la cuenta de pedidos pasa a contar sesiones |
| El teclado (1) y el teléfono (2) | El foco, `Enter`, el viewport de 390 × 844 y que no haya desborde horizontal | La ruta simulada |

- **El archivo estático:** se retira del build, del servidor de desarrollo y de la imagen web (FR-029 y FR-030). Nunca convive con la API en un front integrado (FR-031), y la copia no guarda nada que haya venido de él.

## Riesgos

1. **Una copia más vieja que el progreso, el principal.** Si el navegador publica V2 y su copia sigue en V1, un arranque sin servidor descarta los registros de lo que sólo existe en V2: deja un respaldo, avisa y el próximo guardado persiste el estado reducido (A2, riesgo 1). *Mitigación:* el invariante de FR-016, su E2E y SC-004. Riesgo residual: un almacén que falla al invalidar la copia y después vuelve a funcionar; es improbable, y queda anotado para el plan.
2. **El taller sin sesión cuando el servidor no responde.** *Mitigación:* Q2, que deja la copia sólo para quien no cerró su sesión (salir y `user: null` la borran), y la regla fija de FR-024. Riesgo residual: quien cierra la pestaña sin salir deja la copia, como deja sus borradores (D1, riesgo 5).
3. **La ráfaga de un aula.** Un aula de 40 que arranca en frío detrás de una IP hace unos 720 pedidos (40 × 18), y la zona `api` de Nginx admite 400 de ráfaga más 50 por segundo y rechaza el exceso con 429, sin cola (`nodelay`). *Mitigación:* el `Retry-After` dentro del intento (FR-009), la copia, que deja cada arranque siguiente en un pedido, y SC-007. C4 afina los límites.
4. **La interfaz con F11a.** La decidió el clarify (R1 y C1): la etapa de sesión y «pedir el ingreso» son de F11a, y A3 los extiende. *Mitigación:* si F11a entrega otra forma antes de A3, el plan de A3 la contrasta antes de empezar con FR-001 a FR-003, FR-012, FR-021, FR-024 y FR-038.
5. **Un `Retry-After` más largo que el intento.** `content_not_imported` pide 60 s y el intento dura 20. *Mitigación:* FR-009 falla enseguida y usa la copia o el error.
6. **Un front nuevo con una copia de forma vieja.** La validación de forma de A2 detecta lo grueso, no un campo nuevo. *Mitigación:* FR-018, que sube la versión de formato.
7. **D1c y el contenido que avanzó durante la sesión.** Si un import ocurre con la pestaña abierta y la sincronización de D1c trae progreso de ejercicios nuevos desde otro dispositivo, un arranque sin servidor con la copia anterior los descartaría. *Mitigación:* le toca a D1c, y queda anotado en «Relación con otros ítems».
8. **El navegador puede desalojar la copia,** porque es almacenamiento de mejor esfuerzo (MDN). Entonces el próximo arranque sin servidor muestra el error. Se acepta: pedir almacenamiento persistente es YAGNI.
9. **La fidelidad de la API simulada.** Si el doble se apartara del contrato de C2, los E2E pasarían con una API distinta de la real. *Mitigación:* el doble sirve los bytes del generador y sus validadores, y `npm run api:content:check`, contra el stack, sigue siendo la prueba del contrato real.
10. **Docker no se corrió al escribir esta spec.** La imagen web y la medición del aula se prueban al implementar.

## Relación con otros ítems

- **A2:** A3 conserva la compuerta, su vista, el almacén, `getContent()`, el evento y la secuencia de etapas. Cambia la fuente; precisa FR-008 (FR-020) y FR-011 (FR-013); cambia el texto de `version` y el sentido de un 404; y retira lo que lista el «Contrato de salida hacia A3 y C4». Ese contrato no contemplaba dos cosas, la vista previa sin API y el servidor de desarrollo contra el stack, y el clarify se las dio a F11a (C1).
- **C2:** A3 usa sus recursos, el `ETag`, el 304, `Content-Version` y `Cache-Control` tal como están. C2 sigue entregada e inmutable.
- **C3a:** A3 usa `GET /api/session`, el 401 y los límites de Nginx. Los pedidos de contenido son `GET` y no llevan CSRF. La cookie `XSRF-TOKEN`, que deja la sesión, la usan después los `POST` de F11.
- **F11:** A3 espera sólo a F11a (Q1). F11a introduce la etapa de sesión, «pedir el ingreso», el doble de la API y el proxy (C1). A3 extiende la etapa (FR-001 a FR-003 y FR-012) y el doble (FR-038), y le suma a la salida de F11a borrar la copia (FR-021). F11 decide si muestra «Tu sesión venció» cuando «pedir el ingreso» llega por un 401 en medio del arranque.
- **D1c:** reutiliza la etapa de sesión para comparar la cuenta. El FR-007 de D1 necesita la versión del contenido con que se contestó cada pregunta; la fuente ya trae esa versión por porción, y D1c la puede exponer cuando la use. En el modo «computadora compartida» no se guarda copia (Q2). Como F11-Q5 borra el espacio local de la cuenta al activar ese modo, F11d también debería borrar la copia en ese momento (propuesta de esta spec para F11d y D1c). El riesgo 7 es suyo.
- **B2 y A4:** A3 no pide la plantilla del harness al arrancar (propuesta). Ninguna vista la usa antes de A4, la plantilla nueva no es la de `buildProgram` (FR-035 de B2) y pedirla haría depender el arranque de un recurso que nadie lee. El todo o nada sigue siendo de las 17 porciones. A4 la pide cuando el laboratorio la necesite, y la copia admite guardarla como porción opcional (FR-015).
- **C4:** el FR-022 de C4 se cumple con FR-029 y FR-030. El cambio de `docker/compose.preview.yaml` es de F11a (C1).
- **E1:** suma su porción y su global junto con el código del front que la usa. Si la vuelve obligatoria, sube la versión de formato de la copia.
- **F1 y F2b:** el arranque de la red se arma en un solo lugar (FR-038). FR-015 de F2 se respeta.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q4, con su decisión, están en «Clarifications».

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| La versión esperada | La constante del build; la `contentVersion` de la sesión; las dos | La de la sesión: el servidor es la autoridad. Con la constante, cada import de contenido exigiría reconstruir la imagen web, y cada despliegue del front invalidaría las copias |
| Los validadores | Un `If-None-Match` propio desde la copia; la caché HTTP del navegador | El propio. La caché HTTP no se puede leer sin servidor y su desalojo no se controla. Un pedido con `If-None-Match` explícito no pasa por la caché HTTP, porque el estándar Fetch cambia el modo `default` por `no-store`, así que el código recibe el 304 |
| La copia cuando el servidor no responde | Usarla sola, con un aviso; preguntarle al alumno con un botón; no usarla | Usarla sola, con un aviso (ADR 0004), y sólo quien no cerró su sesión (Q2) |
| Dónde va el aviso | El `#toast`; `#main`; una región persistente fuera de `#main` | Una región persistente. El toast dura 4,5 s y `startApp()` lo pisa con los avisos de carga, y `#main` es de `app.js` |
| La plantilla del harness | Pedirla al arrancar; dejarla para A4 | Dejarla para A4: no tiene consumidor antes, y sumaría un recurso al todo o nada del arranque |
| La lista de porciones | Tomarla de los catálogos de la sesión; fija | Fija. El front no puede usar una porción para la que no tiene código, y E1 suma la suya con su código |
| El vencimiento de la copia | Ninguno; a los 30 días, como los espacios de D1 | Ninguno: una copia vieja con su fecha sirve más que un error, y se reemplaza cuando el servidor responde |
| El archivo estático | Retirarlo; dejarlo como respaldo | Retirarlo (Q1 de A2, ADR 0004 §1 y FR-022 de C4). Un respaldo servido sin sesión contradice la autenticación del contenido, y el respaldo de verdad es la copia del navegador |
| Los E2E de A2 | Adaptarlos; dejarlos sin editar; retirarlos y escribir otros | Adaptarlos: el transporte que simulan deja de existir, y su intención sigue siendo la misma |

## Fuentes consultadas el 2026-10-07

- MDN, [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria): 5 MiB de `localStorage` por origen; IndexedDB y Cache API con una cuota aparte; almacenamiento de mejor esfuerzo.
- MDN, [CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage): sólo en contextos seguros.
- WHATWG, [Fetch Standard](https://fetch.spec.whatwg.org/): con `If-None-Match` en la cabecera, el modo de caché `default` pasa a `no-store`.
- En este repositorio: el ADR 0004, el ADR 0006 (§7 y §8), las specs de A2, C2, C3a (con su contrato HTTP), B2, D1 y C4, las dos hojas de ruta, [`docker/nginx/nginx.conf`](../../docker/nginx/nginx.conf), [`docker/compose.preview.yaml`](../../docker/compose.preview.yaml) y el código de la API. En el worktree del PR #40: `frontend/src/shared/api/content/`, `frontend/src/app/content/`, `frontend/src/app/boot/`, `frontend/vite.config.ts`, `qa/dist-content-check.ts`, `qa/lib/content-server.ts`, `qa/e2e/` y el plan y la investigación de A2 actualizados.
