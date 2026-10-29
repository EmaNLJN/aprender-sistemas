# Feature Specification: F13 · La sincronización en la interfaz

**Feature Branch**: `027-f13-sincronizacion` (nombre de la feature; el proyecto no crea una rama por feature: el trabajo va en `spec/f13-sincronizacion`)

**Created**: 2026-10-28

**Status**: Borrador, con cinco preguntas para el clarify. Sin plan: el plan va después del de D1c

**Input**: Ítem **F13** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Sincronización»: «el estado de sincronización, el aviso al salir con la cola sin enviar y los avisos de cuenta distinta, época cambiada y reloj desfasado». Son las superficies 3 y 5 de «Superficies que pide D1». El usuario aceptó el ítem el 2026-10-28 y pidió especificarlo ya, con el plan después del de D1c (`.coordinador/clarify-decisiones.md`, «Decisiones del 2026-10-28 (noche)»). Depende de D1c, de F10 y de F11. La fuente de verdad del protocolo es la [spec de D1](../007-d1-progreso-sincronizacion/spec.md), con su clarify y con las dos enmiendas que le hace D1c (el FR-070, por F11-Q5, y la cláusula de las claves v1 del FR-074, por F8-L7), y sus contratos de [D1a](../007-d1-progreso-sincronizacion/contracts/http.md) y de [D1b](../007-d1-progreso-sincronizacion/contracts/http-d1b.md). Se apoya en la [spec de F11](../015-f11-acceso-cuenta/spec.md) (F11a: «Tu cuenta», «Salir», «pedir el ingreso» y el cliente de la API; F11d: «computadora compartida» y «¿Este progreso es tuyo?»), en la [de F10](../024-f10-shell/spec.md) (la raíz única y el shell, donde vive el estado) y en la [de F8](../022-f8-metodo/spec.md) («Borrar todo» con el reset del servidor). El código se leyó en `master` (`24ba9d3d`) y, para el doble de la API de los E2E, en el worktree `impl-f11a` (`a7b3c71d`), todavía fuera de `master`. Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) y el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), aceptados, el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md), en propuesta, el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** Con D1c, el progreso del alumno deja de vivir sólo en su navegador. El navegador guarda una copia de trabajo en el espacio de la cuenta, junta los cambios en una cola y los manda al servidor cuando puede, y el servidor fusiona lo que llega de cada dispositivo. D1c es la mecánica: la cola, la fusión, los espacios, la época y el reloj. Pero D1c no dibuja nada (su FR-077), y lo que pasa en esa mecánica le importa al alumno:

- si lo que hizo llegó a su cuenta, o todavía no;
- si se quedó sin conexión, o si el taller no responde;
- si cerrar la pestaña o salir le hace perder algo;
- si en ese navegador entró otra cuenta y esta pestaña quedó vieja;
- si su progreso se borró desde otro dispositivo, y qué pasó con lo que no se había enviado;
- si el reloj de su dispositivo está tan mal que sus cambios pueden perder contra los de otro.

F13 es lo que el alumno ve y decide sobre esa mecánica. Trae cinco superficies:

- el estado de la cuenta, en el pie de la barra lateral y en «Tu cuenta»;
- una franja de avisos, visible en todos los anchos;
- el diálogo de cuenta distinta;
- la pregunta al salir con cambios sin enviar;
- la confirmación del navegador al cerrar la pestaña, sólo cuando cerrarla pierde algo.

No es un port: estas superficies no existen en el legacy. Por eso el resto del taller no cambia, y la red que ya existe pasa sin editarse.

Es para el alumno, en su casa y en un aula; para quien opera el taller, que recibe menos consultas del tipo «perdí lo que hice»; y para D1c, que necesita quién muestre su estado. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. El alumno sabe en todo momento, en cualquier ancho, si lo último que hizo llegó a su cuenta. Se entera de que se quedó sin conexión, o de que el taller no responde, sin tener que buscarlo.
2. Ningún camino descarta lo que no se envió sin decir antes qué se pierde o sin dejar una copia para descargar (ADR 0003, decisión 3; D1, FR-071): ni «Salir», ni cerrar la pestaña, ni recargar por una cuenta distinta o por una pestaña vieja, ni el cambio de época.
3. Una pestaña que quedó con otra cuenta no deja tocar nada hasta recargar, y no muestra datos de ninguna de las dos cuentas.
4. Cada aviso dice qué pasó y qué puede hacer el alumno, y se va solo cuando el problema se resuelve.
5. Los avisos no interrumpen: ninguno roba el foco, salvo los diálogos: el de cuenta distinta, «Cambiaste de cuenta» y la pregunta al salir. Un lector de pantalla oye cada cambio de estado una sola vez, no en cada tecla.
6. La red E2E que existe al empezar F13 pasa sin editarse, y cada superficie tiene sus E2E con el doble de `/api/sync` y `/api/progress`.
7. Todo se completa con el teclado y en un celular de 320 px, y nada depende de una animación.

**Entra:**

- **El estado de la cuenta:** una línea nueva en el pie de la barra lateral, debajo de `#save-label`, y el mismo estado en «Tu cuenta», con los textos de «Los estados de la cuenta».
- **Los avisos de cambio de estado** en `#toast`: al quedarse sin conexión, cuando el taller no responde y cuando lo pendiente llega.
- **La franja de avisos,** entre la barra superior y `#main`, con la sesión vencida, la pestaña vieja, la época cambiada, los cambios rechazados y el reloj desfasado.
- **El diálogo de cuenta distinta.**
- **«Salir» con cambios sin enviar:** la espera del envío, la pregunta (conservar o descartar, o descargar en modo compartido) y la nota junto al botón, que reemplaza la que F11a deja hasta D1c.
- **La confirmación del navegador al cerrar o recargar** la pestaña, sólo mientras cerrarla pierde cambios.
- **Las pruebas:** E2E con el doble de la API de F11a y specs de Vitest con Testing Library y fishery. También la documentación que cambia con ellas: `docs/architecture.md` y `qa/AGENTS.md`.

**Queda fuera:**

- **La mecánica, que es de D1c:**
  - la cola, los lotes, las esperas, los reintentos y el envío al ocultar la pestaña;
  - la fusión, los espacios por cuenta y su vencimiento;
  - la detección de la cuenta distinta, de la época y del desfase;
  - la copia de lo que no se envió y su formato;
  - la guarda contra el solape de dos «Borrar todo» o dos importaciones (F8-Q3).
- **Lo de F11d:** la opción «computadora compartida» en «Tu cuenta», con su aviso al activarla y el del almacenamiento bloqueado, y la pregunta «¿Este progreso es tuyo?» al importar el v1. F13 sólo muestra el estado de la cuenta en el modo que F11d deja elegido.
- **Lo de F8:** «Borrar todo» con la contraseña y el reset del servidor, su espera y su texto de L5 para el `epoch_mismatch` de su propio pedido.
- **Lo de F11a:** el ingreso, «pedir el ingreso», «Tu cuenta», el cierre de la sesión y el manejo de errores de sus formularios (F11, FR-018 a FR-023). F13 los usa sin cambiarlos.
- **Lo de A3:** el aviso de la última copia del contenido cuando el servidor no responde al arrancar.
- **La API:** F13 no cambia ningún contrato de D1a ni de D1b.

**Sin hacer a propósito (YAGNI):**

- **Mostrar el texto que perdió una fusión** (gana la última escritura entera, D1, Riesgo 2): D1 no lo conserva, y mostrarlo pediría guardarlo.
- **La hora de la última sincronización** («hace 2 minutos»): pide un temporizador que reescriba el texto, y no cambia lo que el alumno puede hacer.
- **Un botón «Sincronizar ahora»:** D1c ya envía al arrancar, al volver la conexión, al volver a la pestaña y poco después de cada cambio (D1, FR-063), y un botón más podría chocar con el límite de 60 por minuto.
- **La cuenta regresiva de un 429:** la sincronización espera el `Retry-After` sola, y el estado ya dice que no pudo sincronizar.
- **Avisar entre pestañas** (por ejemplo, con `BroadcastChannel`): D1 no coordina las pestañas más que por la idempotencia (D1, Assumptions), y cada pestaña se entera en su próximo pedido.
- **Una librería de avisos, de diálogos o de animación,** y un store propio de los avisos.

**Actores:**

- **El alumno,** en un dispositivo, en varios o en una computadora de aula, con o sin conexión.
- **Quien opera el taller,** que recibe la consulta cuando algo se pierde o no llega.
- **Los ítems que F13 usa:** D1c (el estado, los eventos y las acciones), F10 (el shell, `#toast` y la raíz única), F11a («Tu cuenta», «Salir», «pedir el ingreso» y el doble de la API) y F11d (el modo compartido).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions), una lectura de esta spec o una pregunta abierta.

| Pedido | Fuente |
| --- | --- |
| F13 existe: el estado de sincronización, el aviso al salir con la cola sin enviar y los avisos de cuenta distinta, época cambiada y reloj desfasado; se especifica ahora y el plan va después del de D1c | Usuario, 2026-10-28 (noche); hoja de ruta, F13 y «Superficies que pide D1», 3 y 5 |
| F13 depende de D1c, de F10 y de F11 | Hoja de ruta, «Ítems» y «Orden y paralelismo» |
| Fuera: el cliente v2 y su contrato (D1c), la confirmación de contraseña de «Borrar todo» (F8) y la opción «computadora compartida» y la pregunta de la importación (F11d) | Hoja de ruta, F13, «Fuera» |
| El estado va en el shell, donde hoy `#save-label` dice «Guardado en este navegador» | Hoja de ruta, F13, «Entra» |
| Al salir se envía la cola; si no salió, se pregunta si se conserva o se descarta, y se dice que lo no enviado vence a los 30 días | D1, Q3 (usuario, 2026-10-06), FR-068 |
| Cada camino que descarta datos locales dice antes qué se pierde o deja una copia descargable | D1, FR-071; ADR 0003, decisión 3 |
| Ante `epoch_mismatch` no se reenvía la cola: se guarda una copia descargable, se carga la época nueva y se avisa | D1, FR-075 |
| Con más de 2 minutos de desfase del reloj, el cliente avisa | D1, FR-078 |
| «Computadora compartida» se elige en «Tu cuenta» y al activarla borra el espacio local de la cuenta | Usuario, 2026-10-28 (F11-Q5) |
| «Salir» no toca el progreso local antes de D1c, y «Tu cuenta» lo dice junto al botón | Usuario, 2026-10-28 (F11-Q4) |
| La guarda contra el solape de dos «Borrar todo» o dos importaciones es de D1c | Usuario, 2026-10-28 (F8-Q3) |
| Las regiones vivas se montan y no se recrean, y cada una lleva una comprobación manual con lector de pantalla | Usuario, 2026-10-28 (X2) |
| Vitest con Testing Library y fishery para la lógica y los componentes, y Playwright con Page Objects para los E2E, sin tocar servicios públicos | ADR 0008; constitución, principio II |
| El tope de `dist/index.html` es de 1 500 000 caracteres | Usuario, 2026-10-28 (noche): el PR #76 (`4c2bdbdb`), posterior a la base de esta spec |
| TDD; código y pruebas en inglés; interfaz en español rioplatense; teclado, celular y movimiento reducido | `AGENTS.md`; constitución, principios II, III y VI |
| La spec, en español y sin código, con como mucho cinco preguntas para el clarify, cada una con su recomendación; E2E con un doble de `/api/sync` y `/api/progress` | Coordinador, 2026-10-28 (el encargo) |

## Preguntas abiertas para el clarify

Son cinco, cada una con sus opciones, una recomendada, su motivo y su costo. Se cierran en `/speckit-clarify`, y las respuestas pasan a una sección Clarifications.

- **Los marcadores.** Cada pregunta deja un `[NEEDS CLARIFICATION]` donde decide algo, y ésos son los únicos: Q1 en FR-003 y FR-007, Q2 en FR-004, Q3 en FR-036, Q4 en FR-019 y Q5 en FR-015.
- **Hasta el clarify,** lo que depende de una pregunta usa como borrador la opción recomendada.
- **Las lecturas** de la sección siguiente no son preguntas: el usuario las corrige si no está de acuerdo.

### Q1. Dónde se ve el estado de la cuenta en cada ancho

**Contexto.** `#save-label` vive en `.sidebar-bottom`, que desde 850 px de ancho para abajo tiene `display: none` en `frontend/styles.css`, igual que «Exportar mi progreso». En un celular, el pie de guardado nunca se vio. «Tu cuenta» es un botón de la barra superior en todos los anchos y abre un diálogo (F11-Q3). `#toast` se ve en todos los anchos, salvo al imprimir. (FR-003 y FR-007)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **El pie, «Tu cuenta», el toast y la franja.** La línea de la cuenta va en el pie de la barra lateral, debajo de `#save-label`. El mismo estado aparece en «Tu cuenta», en todos los anchos. Los cambios que importan (sin conexión, el taller que no responde y la vuelta) salen en `#toast`, y lo que pide algo al alumno, en la franja; los dos se ven en todos los anchos | En escritorio, el estado está siempre a la vista. En el celular, el alumno se entera de cada cambio por el toast y la franja, y ve el estado al abrir «Tu cuenta». No toca la barra superior, que a 320 px ya tiene el selector de lenguaje y «Tu cuenta». **Costo:** en el celular, «Enviando…» y «Sincronizado» sólo se ven abriendo «Tu cuenta» |
| B | **Sólo el pie, el toast y la franja,** sin el estado en «Tu cuenta» | Un requisito menos. **Costo:** en el celular nunca se puede comprobar que lo último llegó: sólo se ve si algo falla |
| C | **Un indicador compacto en la barra superior,** junto a «Tu cuenta», en todos los anchos, en lugar del pie | Siempre visible. **Costo:** cambia el aspecto del shell en escritorio; compite por el espacio con el selector de lenguaje y «Tu cuenta» a 320 px; y o quedan dos lugares de estado, o `#save-label` se muda y se editan los E2E de F1 que lo fijan (ver Q2) |
| Otra | Decir dónde | |

### Q2. Qué dice el pie: ¿se conservan los dos textos de hoy?

**Contexto.** Con D1c, «Guardado en este navegador» sigue siendo cierto en modo normal, porque el progreso se escribe primero en el navegador (local primero), pero no dice si llegó a la cuenta. «Exportá para conservar tu avance» describe hoy el almacenamiento bloqueado; con D1c, el taller funciona ahí como en modo compartido y el progreso llega igual a la cuenta (D1, FR-070). Los dos textos los fijan dos E2E congelados de F1 (`qa/e2e/specs/startup-storage.spec.ts`, con `exact: true`), el tipo de `ShellPage.saveStatus` (`qa/e2e/pages/shell.ts`) y, desde F10, los E2E del pie que escribe F10a (F10, FR-026 y US3-3). (FR-004)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Dos líneas.** `#save-label` conserva sus dos textos y dice si el progreso se guarda en este navegador; la línea nueva dice si llegó a la cuenta | Son dos hechos distintos, y cada línea dice uno. **0 E2E congelados editados.** **Costo:** dos líneas en un pie de 10 px. Con el almacenamiento bloqueado, «Exportá para conservar tu avance» convive con «Sincronizado con tu cuenta»: las dos cosas son ciertas, pero el consejo de exportar pesa menos que hoy |
| B | **Una sola línea** que reemplaza los dos textos de hoy y dice las dos cosas (por ejemplo, «Guardado en tu cuenta y en este navegador») | Un solo lugar que leer. **Costo:** editar los dos E2E de F1, el tipo de `saveStatus` y los E2E del pie de F10, en un commit propio con TDD y con la aprobación del usuario |
| C | **Dos líneas, y `#save-label` cambia sólo en memoria:** en modo compartido o con el almacenamiento bloqueado dice «No se guarda en este navegador» | El consejo de exportar desaparece donde ya no hace falta. **Costo:** editar un E2E de F1 (el del almacenamiento bloqueado) y el tipo de `saveStatus`, con TDD y con la aprobación del usuario |
| Otra | Decir qué textos | |

### Q3. Cuándo pide confirmación el navegador al cerrar la pestaña

**Contexto.** El aviso de `beforeunload` es el del navegador: no lleva un texto propio, no ofrece opciones y, según se sabe y el plan confirma, Chromium sólo lo muestra si el alumno ya interactuó con la página. Por eso «conservar o descartar» sólo es posible en «Salir». En modo normal, la cola vive en el espacio de la cuenta y sobrevive a cerrar la pestaña: se envía cuando esa cuenta vuelva a ese navegador, o vence a los 30 días (D1, FR-069). En modo compartido o con el almacenamiento bloqueado, la cola vive en memoria y cerrar la pestaña la pierde (D1, FR-070). El taller tiene además 11 enlaces internos que recargan el documento, porque cambian la query (F1), y un oyente de `beforeunload` también los ataja. (FR-036)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Sólo mientras cerrar pierde algo:** con la cola en memoria y cambios sin enviar | Pregunta sólo cuando hay una pérdida real. El oyente se pone y se saca con la condición, así que no molesta en modo normal y no le quita a la página el caché de ida y vuelta del navegador. **Costo:** en modo normal, cerrar con cambios sin enviar no avisa: quedan en el navegador hasta que la cuenta vuelva o venzan. En memoria, los 11 enlaces que recargan también preguntan (hallazgo para D1c) |
| B | **Mientras haya cualquier cambio sin enviar,** en cualquier modo | Nadie cierra sin enterarse. **Costo:** en modo normal, cada cambio pasa unos segundos pendiente, así que la pregunta aparece seguido y sin una pérdida real, también en los 11 enlaces que recargan; los navegadores desaconsejan dejar el oyente puesto |
| C | **Nunca:** basta el aviso al activar el modo compartido (F11d) y el estado de la cuenta | Sin oyente. **Costo:** en memoria, cerrar la pestaña pierde cambios sin confirmación, y el FR-071 de D1 queda cubierto sólo por el aviso de F11d al activar el modo, que pudo haber sido horas antes |
| Otra | Decir cuándo | |

### Q4. La forma de los avisos: ¿qué bloquea la pestaña?

**Contexto.** El shell tiene tres formas de avisar: un diálogo modal, la franja (persistente, sin mover el foco) y `#toast` (4,5 s, y se va). D1 pide que una pestaña que quedó con otra cuenta «no modifique nada» (US3, escenario 3; SC-004). Lo que se escriba en esa pestaña entra en el espacio de la cuenta anterior, aunque quien esté en el teclado sea otra persona, y llega a la cuenta anterior cuando vuelva. Ése es el riesgo que la crítica del ADR 0006 marcó como crítico. F11a ya muestra el mensaje del servidor con «Recargar» cuando uno de sus formularios recibe `account_mismatch` (F11, FR-019), pero la sincronización corre sola, sin formulario. (FR-019)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Sólo la cuenta distinta es modal.** Un diálogo que no se cierra con Esc y deja inerte la página hasta recargar. La sesión vencida, la pestaña vieja, la época cambiada, los rechazos y el reloj van en la franja, persistentes y sin mover el foco. El toast queda para los cambios de estado | Una pestaña con otra cuenta no deja tocar nada, y lo demás no interrumpe a quien está escribiendo. **Costo:** un diálogo que sólo se resuelve recargando |
| B | **Todo en la franja,** nada modal | Nada interrumpe. **Costo:** la pestaña de la cuenta anterior sigue andando en local hasta que el alumno recarga, con el riesgo de arriba |
| C | **Recargar sola** ante la cuenta distinta, y avisar después de recargar | Sin decisión del alumno. **Costo:** lo que había en pantalla desaparece sin explicación; en memoria, la cola se pierde sin aviso, contra el FR-071 de D1 |
| D | **También modal la época cambiada:** un diálogo que no se cierra sin descargar o descartar la copia | El alumno entiende en el acto por qué cambió su progreso. **Costo:** interrumpe aunque no haya copia que decidir, o usa dos formas para el mismo aviso |
| Otra | Decir cuál | |

### Q5. La sesión que vence mientras la sincronización corre sola

**Contexto.** La sesión vence a los 30 minutos de inactividad o a las 8 horas (C3a, Q5), así que el 401 de la sincronización llega casi siempre al volver a la pestaña después de un rato. D1 pide conservar la cola y pedir el ingreso (FR-076). F8 y F12 llaman a «pedir el ingreso» enseguida ante un 401, pero ahí el alumno acaba de pedir algo; la sincronización, en cambio, corre sin que el alumno haga nada. (FR-015)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Avisar y dejar elegir:** la franja dice que la sesión venció y ofrece «Ingresar», que llama a «pedir el ingreso»; el alumno sigue estudiando y elige cuándo | Local primero: escribir nunca espera a la red (D1, FR-060), y nada interrumpe. **Costo:** el alumno puede seguir un rato sin sincronizar; en memoria, cerrar la pestaña pierde lo no enviado (lo cubre Q3) |
| B | **Pedir el ingreso enseguida,** sobre el taller, como ante un 401 de una acción | La sesión vuelve antes. **Costo:** interrumpe sin que el alumno haya pedido nada, a veces en medio de una frase; el acceso deja el shell inerte |
| C | **Enseguida sólo en memoria** (donde cerrar pierde), y avisar en modo normal | Protege el caso con pérdida. **Costo:** dos comportamientos que probar y explicar |
| Otra | Decir cuál | |

## Lecturas de esta spec

No son preguntas: es cómo esta spec aplica lo que ya está decidido. El usuario las corrige si no está de acuerdo.

- **L1, «atrasado».** El estado «atrasado» del FR-077 de D1 se lee como la pestaña vieja: el 409 `client_outdated`, ante el que D1c conserva la cola y pide recargar (D1, FR-076). Si D1c quiere decir otra cosa, por ejemplo una foto detrás del servidor, el estado se agrega con su propio texto.
- **L2, «sin conexión».** El estado «sin conexión» sale de un envío que falló por la red, no de `navigator.onLine`, como eligió F8 para «Borrar todo» (F8-L6: se intenta y se avisa). Los eventos `online` y `offline` sólo le sirven a D1c para adelantar el reintento.
- **L3, ninguna línea viva.** La línea de la cuenta no es una región viva: cambia entre «Enviando…» y «Sincronizado» con cada cambio del alumno, y anunciarla lo interrumpiría en cada frase. Los cambios que importan se anuncian una vez en `#toast`, y los avisos, en la franja.
- **L4, los cambios rechazados se muestran.** D1 dice que una operación rechazada sale de la cola y «se informa» (FR-064), y ninguna superficie lo tenía. Un rechazo deja el cambio en el navegador y no en la cuenta, así que puede perderse más adelante sin que nadie lo note. F13 lo muestra en la franja, sin el motivo técnico (FR-027).
- **L5, el reloj.** «Entendido» oculta el aviso del reloj por lo que dura el documento; si el desfase sigue, vuelve al recargar.
- **L6, la época y el propio «Borrar todo».** El aviso de época no aparece por el «Borrar todo» de la misma pestaña, que F8 ya informa. El texto dice «otra pestaña o dispositivo», como el L5 de F8, porque el borrado pudo salir de otra pestaña del mismo navegador.
- **L7, F13 toma la parte visible de «Salir».** La spec de F11 deja el envío de la cola antes del cierre para «F11d o D1c» («Relación con otros ítems», D1). F13 toma lo que se ve (la espera, la pregunta y la nota junto al botón), y D1c, el envío y la limpieza del espacio.
- **L8, un estado más para D1c.** El FR-077 de D1 no distingue «sin conexión» de «el taller no responde». F13 le pide a D1c un estado de error para lo segundo: un 5xx, un 503 `content_not_imported`, un 429 o un lote que el servidor rechaza entero.

## La frontera con D1c, F11, F8 y F10

D1c es la mecánica; F13 es lo que el alumno ve y decide. La regla es la del FR-077 de D1: el cliente expone su estado y sus acciones, y no dibuja pantallas.

| Qué | De quién | Qué hace F13 |
| --- | --- | --- |
| La cola, los lotes, los reintentos, las esperas y el envío al ocultar la pestaña | D1c (FR-060 a FR-064) | Nada: muestra el estado que resulta |
| La detección de la cuenta distinta (el 409 `account_mismatch`, el 419 o el 401 con otra cuenta, y la foto de otro `userId`) | D1c (FR-065 y FR-066) | El diálogo |
| La época cambiada: no reenviar, guardar la copia y cargar la foto nueva | D1c (FR-075) | El aviso, con la descarga y el descarte de la copia |
| El desfase del reloj, sacado de `serverTime` | D1c (FR-078) | El aviso |
| Enviar la cola al salir y limpiar el espacio | D1c (FR-068) | La espera, la pregunta y la nota (L7) |
| La cola en memoria del modo compartido y del almacenamiento bloqueado | D1c (FR-070, enmendado por F11-Q5) | Los textos de memoria y la confirmación al cerrar |
| Elegir y activar «computadora compartida»; el aviso del almacenamiento bloqueado en «Tu cuenta» | F11d (F11, FR-062 y FR-063) | Nada: lee el modo |
| «¿Este progreso es tuyo?» y su respuesta, también el 409 `import_needs_confirmation` | F11d (F11, FR-064 y FR-065) | Nada |
| «Tu cuenta», «Salir», «pedir el ingreso», el cliente de la API y sus errores de formulario | F11a | Suma la línea de la cuenta, la nota y la pregunta; llama a «pedir el ingreso» |
| «Borrar todo», su contraseña, su espera y su `epoch_mismatch` | F8 (Q1, Q3 y L5) | No avisa la época por el propio «Borrar todo» (L6) |
| El shell, el pie, `#toast` y la raíz única | F10 (FR-024 a FR-028 y FR-034) | Suma la línea, la franja y el diálogo dentro del shell |

### Lo que F13 supone de D1c

D1c no tiene plan. Lo que F13 necesita de su interfaz pública va en esta tabla, como hizo D1 con B2, para que el plan de D1c lo contraste. Cada fila amplía el FR-077 de D1 o lo precisa.

| F13 supone de D1c | Si D1c lo resuelve distinto |
| --- | --- |
| Un estado con seis valores (al día, pendiente, sin conexión, error, requiere ingreso y pestaña vieja: L1 y L8), más la cantidad de cambios en la cola | Sin «error», el alumno no distingue su red del taller; sin la cantidad, la pregunta al salir y la copia no pueden decir cuánto se pierde |
| «Sin conexión» por un envío fallido, no por `navigator.onLine` (L2) | El estado parpadea con la red del sistema operativo, aunque el taller responda |
| El modo de guardado (normal, compartido o almacenamiento bloqueado) y si el progreso se guarda en este navegador | `#save-label` (Q2) y las opciones de la pregunta al salir no se pueden decidir |
| Cuántos cambios se perderían si el documento se descarga ahora: la cola y la copia de la época, cuando viven en memoria | La confirmación del navegador no puede ponerse sólo cuando hace falta (Q3) |
| Un evento de cuenta distinta, con los cambios que se perderían al recargar; desde ahí, D1c no envía nada | No hay de dónde sacar el diálogo, o el diálogo no sabe si ofrecer la copia |
| Un evento de época cambiada, con `resetAt`, si fue el «Borrar todo» de esta pestaña y, si quedó algo sin enviar, la copia: su cantidad, «descargar» y «descartar» | El aviso no puede decir cuándo pasó, aparece por el propio «Borrar todo» o no puede ofrecer la copia |
| Si la copia de la época sobrevive a recargar (en modo normal) o vive en memoria | El aviso no sabe si reaparece después de recargar, ni si la confirmación al cerrar la tiene que contar |
| El desfase del reloj en milisegundos, con signo, del último `serverTime` | No hay aviso de reloj, o no dice si está adelantado o atrasado |
| La cantidad de operaciones rechazadas de cada lote | No hay aviso de rechazos (L4) |
| Una acción «enviar ahora» para «Salir», que termina con «enviado» o con lo que quedó y su motivo (sin conexión, el taller no responde o la sesión venció) | La pregunta al salir no sabe si hace falta ni qué decir |
| Dos acciones que se aplican después del cierre de la sesión: conservar lo no enviado en el espacio o descartarlo | Lo no enviado se descarta antes de saber si la sesión se cerró (FR-033) |
| Una acción «descargar lo que no se envió» cuando la cola vive en memoria | El diálogo de cuenta distinta, la pestaña vieja y la pregunta al salir no pueden ofrecer la copia |
| Respuestas por omisión para `POST /api/sync` y `GET /api/progress` en el doble de la API de los E2E, con una cuenta al día y un `serverTime` que sigue el reloj de la página: en la sincronización, por ejemplo, el `sentAt` del lote; en la lectura, lo decide el plan | Desde que D1c sincroniza al arrancar, cada E2E existente falla en el `assertAllHandled` del doble. Y con un `serverTime` tomado del reloj de Node, los E2E que corren con `page.clock` (el temporizador y el repaso) ven un desfase de días: aparece el aviso del reloj, contra SC-002, y la franja ocupa lugar donde `css-contract.spec.ts` mide |

## Los estados de la cuenta

La línea de la cuenta dice si lo que hizo el alumno llegó a su cuenta. El punto distingue tres familias (al día, en curso y problema) con los colores del taller, y el texto dice lo mismo sin el color.

| Estado de D1c | Cuándo, según D1 | Línea de la cuenta | Punto | Franja | `#toast` al entrar |
| --- | --- | --- | --- | --- | --- |
| Al día | La cola está vacía y el último pedido respondió | «Sincronizado con tu cuenta» | Al día | — | Si venía de sin conexión, error o sesión vencida y se envió algo: «Listo: tus cambios llegaron a tu cuenta.» |
| Pendiente | Hay cambios en la cola o un lote en camino | «Enviando a tu cuenta…» | En curso | — | — |
| Sin conexión | El último envío falló por la red (L2) | «Sin conexión con el taller» | Problema | — | El texto de «Sin conexión», según el modo |
| Error (L8) | Un 5xx, un 503 `content_not_imported`, un 429 o un lote rechazado entero | «No pudimos sincronizar» | Problema | — | El texto de «Error», según el modo |
| Requiere ingreso | Un 401, o un 419 sin sesión (D1, FR-065 y FR-076) | «Sesión vencida» | Problema | La sesión vencida, con «Ingresar» | — |
| Pestaña vieja (L1) | Un 409 `client_outdated` (D1, FR-076) | «Pestaña vieja» | Problema | La pestaña vieja, con «Recargar» | — |

Un 403 `account_disabled` no es un estado de la cuenta: vuelve al acceso, como dice F11 (FR-023), y la cola queda en el espacio (D1, «Edge Cases»).

## Las superficies

**La línea de la cuenta.** En el pie de la barra lateral, debajo de `#save-label`, con el aspecto de `.save-status`: texto chico y un punto. Antes de que D1c informe su primer estado, el pie no muestra la línea, como pasa con los conteos del menú antes del contenido (F10-Q5). El mismo estado aparece en «Tu cuenta», junto a «Salir» (Q1).

**La franja de avisos.** Entre la barra superior y `#main`, visible en todos los anchos. Es un contenedor montado desde el primer dibujo del shell, con `aria-live="polite"` y sin `role`. Así anuncia lo que entra sin recrearse (X2), y la red no la confunde con el error de la compuerta (`getByRole('alert')`) ni con `#toast` (`getByRole('status')`): F11 prohíbe dejar regiones `alert` o `status` montadas sin nada (FR-076). Vacía, no ocupa lugar. Muestra todos los avisos activos, en este orden:

1. la pestaña vieja;
2. la sesión vencida;
3. la época cambiada;
4. los cambios rechazados;
5. el reloj desfasado.

Ningún aviso mueve el foco: el alumno sigue donde estaba.

**El diálogo de cuenta distinta.** Modal, con el rol de un diálogo de alerta. No se cierra con Esc, y la página queda inerte detrás hasta recargar (Q4). Si recargar pierde cambios, ofrece antes una copia. Es para una sesión que cambió de cuenta en otra pestaña; cuando el alumno ingresa con otra cuenta en esta misma pestaña, el cambio es a propósito y sólo aparece «Cambiaste de cuenta», un diálogo modal, si recargar pierde cambios en memoria (FR-016).

**La pregunta al salir.** Un diálogo modal que sale de «Salir», en «Tu cuenta», sólo si el envío de la cola dejó cambios sin enviar. Esc equivale a «Volver al taller».

**La confirmación del navegador.** La de `beforeunload`, con el texto del navegador, sólo mientras cerrar o recargar la pestaña pierde cambios (Q3).

### El orden de «Salir»

1. El alumno elige «Salir» en «Tu cuenta».
2. D1c envía la cola. El botón dice «Enviando tus cambios…» y queda deshabilitado.
3. Si no queda nada, sigue el cierre de F11a: el botón dice «Saliendo…» y sale `POST /api/auth/logout`.
4. Si queda algo, sale la pregunta. Con «Volver al taller» o con Esc, la sesión sigue y nada cambia.
5. Con la elección hecha, sale `POST /api/auth/logout`.
6. Con el 204, o con un 401 porque ya no había sesión, D1c aplica la elección (limpia el espacio o conserva lo no enviado), y el documento se recarga sin la confirmación del navegador.
7. Si el cierre falla, F11a muestra «No pudimos cerrar la sesión» con «Reintentar» (F11, FR-051), y no se descartó nada.

## Textos que lee el alumno

Son propuestas, para que el usuario las corrija. «(servidor)» marca un mensaje de `backend/api/lang/es/api.php` que el front muestra sin cambios. «En memoria» quiere decir en modo compartido o con el almacenamiento bloqueado.

**La línea de la cuenta y «Tu cuenta»**

- Los seis textos de la tabla «Los estados de la cuenta».
- En «Tu cuenta», la etiqueta «Tu progreso», seguida del texto de la línea.

**`#toast`**

- Sin conexión: «Sin conexión con el taller. Tus cambios quedan en este navegador y se envían cuando vuelva.»
- Sin conexión, en memoria: «Sin conexión con el taller. Tus cambios viven sólo en esta pestaña: no la cierres hasta que se envíen.»
- Error: «No pudimos sincronizar con el taller. Lo reintentamos solos.»
- Error, en memoria: «No pudimos sincronizar con el taller. Lo reintentamos solos; no cierres la pestaña todavía.»
- La vuelta: «Listo: tus cambios llegaron a tu cuenta.»

**La franja**

- Sesión vencida: «Tu sesión venció. Tus cambios quedan en este navegador y llegan a tu cuenta cuando vuelvas a ingresar.», con «Ingresar».
- Sesión vencida, en memoria: «Tu sesión venció. Tus cambios viven sólo en esta pestaña: ingresá antes de cerrarla.», con «Ingresar».
- Pestaña vieja: «Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.» (servidor), con «Recargar».
- Pestaña vieja, en memoria y con cambios sin enviar: el mismo texto, seguido de «Al recargar se pierden {n} cambios que no se enviaron.», con «Descargar lo que no se envió» y «Recargar».
- Época cambiada, sin copia: «Tu progreso se borró desde otra pestaña o dispositivo el {fecha}. Te mostramos tu cuenta como quedó.», con «Entendido».
- Época cambiada, con copia: el mismo texto, seguido de «{n} cambios de esta pestaña no llegaron a enviarse antes del borrado, y guardamos una copia.», con «Descargar la copia» y «Descartar la copia».
- Al descartar la copia: «¿Descartar la copia? Esos {n} cambios no se pueden recuperar.», con «Descartar» y «Cancelar».
- Cambios rechazados: «{n} cambios no se pudieron guardar en tu cuenta. Por ahora siguen en este navegador, pero pueden perderse. Si se repite, avisale a quien administra el taller.», con «Entendido».
- Reloj desfasado: «El reloj de este dispositivo está {n} minutos {adelantado | atrasado}. Tus cambios se guardan igual, pero pueden perder contra los de otro dispositivo. Corregí la fecha y la hora del dispositivo.», con «Entendido».

**El diálogo de cuenta distinta**

- Título: «Esta pestaña quedó con otra cuenta».
- «En este navegador se ingresó con otra cuenta. Para no mezclar el progreso, esta pestaña dejó de sincronizar. Recargala para seguir con la cuenta que tiene la sesión.»
- En modo normal: «Lo que esta pestaña no llegó a enviar queda en este navegador para la cuenta anterior: se envía cuando esa cuenta vuelva a ingresar acá, o vence en 30 días.»
- En memoria, con cambios sin enviar: «Esta pestaña tiene {n} cambios que no llegaron a enviarse, y se pierden al recargar. Si los querés, descargá una copia antes.»
- Botones: «Descargar lo que no se envió» (sólo en memoria y con cambios sin enviar) y «Recargar».

**«Cambiaste de cuenta»** (sólo en memoria y con cambios sin enviar)

- Título: «Cambiaste de cuenta».
- «La cuenta anterior tiene {n} cambios en esta pestaña que no llegaron a enviarse, y se pierden al recargar. Si los querés, descargá una copia antes.»
- Botones: «Descargar lo que no se envió» y «Seguir».

**«Salir» y la pregunta**

- La nota junto a «Salir», en modo normal: «Al salir, enviamos tus cambios a tu cuenta y borramos de este navegador lo que guardó.»
- La nota, en memoria: «Al salir, enviamos tus cambios a tu cuenta. En este navegador no queda nada guardado.»
- Mientras envía: «Enviando tus cambios…»; después, el «Saliendo…» de F11a.
- Título de la pregunta: «Hay cambios que no llegaron a tu cuenta».
- «{n} cambios no se pudieron enviar: {no hay conexión con el taller | el taller no responde | tu sesión venció}.»
- En modo normal:
  - «Conservarlos y salir», con «Quedan en este navegador y se envían la próxima vez que ingreses acá con tu cuenta. Si no volvés, vencen en 30 días.»;
  - «Descartarlos y salir», con «Se pierden y no se pueden recuperar.»;
  - «Volver al taller».
- En memoria:
  - «Descargar una copia»;
  - «Salir sin enviarlos», con «Se pierden: en este navegador no queda nada guardado.»;
  - «Volver al taller».

**La confirmación del navegador:** el texto del navegador, que el taller no puede cambiar.

**Los formatos:**

- `{fecha}` es la de `resetAt`, en la hora local, con «hoy» o «ayer» cuando corresponde (por ejemplo, «hoy a las 14:32»).
- `{n}` en el reloj son los minutos redondeados.
- Cada texto con `{n}` tiene su forma singular: «1 cambio no se pudo guardar en tu cuenta.», «Esta pestaña tiene 1 cambio…».

El plan fija los formatos con sus pruebas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sé si lo que hice llegó a mi cuenta (Priority: P1)

Una alumna estudia en la computadora de su casa. En el pie de la barra lateral lee «Enviando a tu cuenta…» después de cada cambio y, a los pocos segundos, «Sincronizado con tu cuenta». Se le corta el wifi: un aviso le dice que sus cambios quedan en el navegador. Cuando vuelve la conexión, otro aviso le dice que llegaron. En el celular abre «Tu cuenta» y ve el mismo estado.

**Why this priority**: es la razón de sincronizar. Sin el estado, el alumno no sabe si puede pasar a otro dispositivo, y un problema de la red se ve igual que uno del taller.

**Independent Test**: con el doble de la API respondiendo `POST /api/sync` con 200, con una respuesta demorada, con un pedido abortado, con un 500 y otra vez con 200; leer el pie, «Tu cuenta» y `#toast` a 1 280 y a 375 px.

**Acceptance Scenarios**:

1. **Dado** un alumno con la cola vacía y el doble al día, **cuando** arranca, **entonces** el pie dice «Guardado en este navegador» y, debajo, «Sincronizado con tu cuenta», y no sale ningún toast.
2. **Dada** una respuesta de `POST /api/sync` demorada, **cuando** el alumno marca un paso, **entonces** la línea dice «Enviando a tu cuenta…» hasta que llega la respuesta, y después «Sincronizado con tu cuenta».
3. **Dado** un envío que falla por la red, **cuando** D1c lo informa, **entonces** la línea dice «Sin conexión con el taller» y sale una sola vez el toast de «Sin conexión»; los reintentos que fallan no lo repiten.
4. **Dado** lo anterior, **cuando** el envío siguiente llega, **entonces** la línea dice «Sincronizado con tu cuenta» y el toast dice «Listo: tus cambios llegaron a tu cuenta.».
5. **Dado** un 500, **cuando** D1c lo informa, **entonces** la línea dice «No pudimos sincronizar» y sale el toast de «Error».
6. **Dado** un celular de 375 px, **cuando** el alumno abre «Tu cuenta», **entonces** ve «Tu progreso» con el texto de la línea.
7. **Dado** el almacenamiento bloqueado, **cuando** arranca, **entonces** `#save-label` dice «Exportá para conservar tu avance», como hoy, y la línea de la cuenta dice su estado.

*Cubre: FR-001 a FR-011; SC-001, SC-002 y SC-008.*

---

### User Story 2 - Salgo sin perder lo que no se envió (Priority: P1)

Un alumno sale de su cuenta en una computadora sin conexión. El taller intenta mandar sus cambios, no puede y le pregunta: los conserva en ese navegador hasta que vuelva, los descarta o vuelve al taller. En el aula, con el modo compartido, la pregunta le ofrece descargar una copia, porque ahí no se puede conservar nada.

**Why this priority**: «Salir» es el único momento en que el alumno decide qué pasa con su espacio, y es lo que D1 decidió con su Q3.

**Independent Test**: con el doble, salir con la cola vacía, con un envío que falla por la red y con uno que responde 500; elegir cada opción; repetir con el almacenamiento bloqueado; hacer fallar el cierre de la sesión.

**Acceptance Scenarios**:

1. **Dada** la cola vacía o un envío que llega, **cuando** el alumno usa «Salir», **entonces** el botón dice «Enviando tus cambios…» y después «Saliendo…», sale `POST /api/auth/logout`, el espacio de la cuenta queda limpio y el documento se recarga sin la confirmación del navegador.
2. **Dados** 3 cambios que no se pudieron enviar por la red, **cuando** el alumno usa «Salir», **entonces** ve «Hay cambios que no llegaron a tu cuenta» con «3 cambios no se pudieron enviar: no hay conexión con el taller.» y las tres opciones del modo normal, y el foco está en «Volver al taller».
3. **Dado** lo anterior, **cuando** elige «Conservarlos y salir», **entonces** sale el cierre y, con el 204, el espacio conserva los 3 cambios.
4. **Dado** lo mismo, **cuando** elige «Descartarlos y salir», **entonces** sale el cierre y, con el 204, el espacio queda limpio.
5. **Dada** la pregunta abierta, **cuando** el alumno aprieta Esc o «Volver al taller», **entonces** el diálogo se cierra, el foco vuelve a «Salir», no sale ningún cierre y la sesión sigue.
6. **Dados** el almacenamiento bloqueado y cambios sin enviar, **cuando** usa «Salir», **entonces** la pregunta ofrece «Descargar una copia», «Salir sin enviarlos» y «Volver al taller», y no ofrece conservar.
7. **Dada** una elección hecha, **cuando** el cierre falla por la red, **entonces** se ve «No pudimos cerrar la sesión» con «Reintentar» (F11a), y el espacio sigue como estaba.
8. **Dado** «Tu cuenta» abierto, **cuando** el alumno lo lee, **entonces** junto a «Salir» está la nota de su modo, y no la que F11a deja hasta D1c.

*Cubre: FR-030 a FR-034; SC-004.*

---

### User Story 3 - Una pestaña que quedó con otra cuenta no mezcla nada (Priority: P1)

En el aula, Ana deja una pestaña abierta. Beto abre otra pestaña e ingresa con su cuenta. Cuando la pestaña de Ana intenta sincronizar, el taller la bloquea: un diálogo dice que esa pestaña quedó con otra cuenta y que hay que recargarla. No se ve el nombre de nadie. Si Ana estaba en modo compartido, el diálogo le ofrece antes descargar lo que no se envió.

**Why this priority**: equivocarse acá es que el progreso de una persona termine en la cuenta de otra, el riesgo que D1 marca como crítico (US3; SC-004).

**Independent Test**: con el doble, responder 409 `account_mismatch` a `POST /api/sync`; responder un 419 y después `GET /api/session` con otra cuenta; responder `GET /api/progress` con otro `userId`. Repetir con el almacenamiento bloqueado.

**Acceptance Scenarios**:

1. **Dado** un 409 `account_mismatch` en `POST /api/sync`, **cuando** D1c lo informa, **entonces** se abre el diálogo «Esta pestaña quedó con otra cuenta», la página detrás no responde al teclado ni al mouse, y no sale ningún pedido que modifica.
2. **Dado** el diálogo abierto, **cuando** el alumno aprieta Esc, **entonces** el diálogo sigue abierto.
3. **Dado** el diálogo, **cuando** el alumno usa «Recargar», **entonces** el documento se recarga sin la confirmación del navegador.
4. **Dados** el almacenamiento bloqueado y 2 cambios sin enviar, **cuando** se abre el diálogo, **entonces** dice que se pierden 2 cambios al recargar y ofrece «Descargar lo que no se envió», que baja la copia antes de recargar.
5. **Dados** un 419 y una sesión con otra cuenta, o una foto con otro `userId`, **cuando** D1c los informa, **entonces** se abre el mismo diálogo.
6. **Dado** el diálogo, **cuando** se lee su texto, **entonces** no lleva el nombre ni el email de ninguna de las dos cuentas.

*Cubre: FR-019 a FR-022; SC-003.*

---

### User Story 4 - Me entero de que mi progreso se borró en otro lado (Priority: P2)

Una alumna borra su progreso desde el celular. Su computadora, que tenía una pestaña abierta con cambios sin enviar, muestra el aviso: su progreso se borró desde otra pestaña o dispositivo, ésta es su cuenta como quedó, y hay una copia de lo que no se llegó a enviar, para descargarla o descartarla.

**Why this priority**: es la única vez en que el progreso que el alumno ve cambia de golpe por algo que hizo en otro lado, y lo no enviado se perdería sin la copia (D1, FR-075).

**Independent Test**: con el doble, responder 409 `epoch_mismatch` con `{epoch, revision}` a `POST /api/sync` y después la foto con `resetAt`; con y sin cambios pendientes; descargar y descartar la copia; repetir con el «Borrar todo» de la misma pestaña.

**Acceptance Scenarios**:

1. **Dado** un `epoch_mismatch` sin cambios pendientes, **cuando** D1c carga la época nueva, **entonces** la franja dice «Tu progreso se borró desde otra pestaña o dispositivo el {fecha}…» con «Entendido», y «Entendido» lo quita.
2. **Dados** 4 cambios pendientes y un `epoch_mismatch`, **cuando** D1c guarda la copia, **entonces** la franja dice que 4 cambios no llegaron a enviarse y ofrece «Descargar la copia» y «Descartar la copia».
3. **Dado** lo anterior, **cuando** el alumno usa «Descargar la copia», **entonces** baja el archivo de D1c, y el aviso sigue hasta que la descarte o hasta que D1c informe que la copia ya no está.
4. **Dado** lo mismo, **cuando** usa «Descartar la copia», **entonces** pide confirmarlo y, con «Descartar», la copia y el aviso se van; con «Cancelar», sigue todo.
5. **Dado** el «Borrar todo» de esta misma pestaña (F8), **cuando** termina, **entonces** la franja no muestra el aviso de época.
6. **Dado** el aviso, **cuando** aparece, **entonces** el foco no se mueve.

*Cubre: FR-023 a FR-026; SC-006.*

---

### User Story 5 - Cerrar la pestaña no me hace perder nada sin aviso (Priority: P2)

En el aula, con el modo compartido, un alumno escribe sin conexión y va a cerrar la pestaña. El navegador le pregunta si quiere salir del sitio. En su casa, en modo normal, cierra con cambios sin enviar y no le pregunta nada, porque esos cambios quedan en el navegador.

**Why this priority**: es la única forma de avisar antes de perder la cola en memoria, y si se pone de más molesta en cada enlace que recarga.

**Independent Test**: con el doble, cerrar la página con `page.close({ runBeforeUnload: true })` y un manejador del diálogo, con el almacenamiento bloqueado y cambios sin enviar, sin cambios, y en modo normal con cambios sin enviar; recargar desde «Recargar» y desde «Salir».

**Acceptance Scenarios**:

1. **Dados** el almacenamiento bloqueado y cambios sin enviar, **cuando** se cierra la pestaña, **entonces** sale el diálogo `beforeunload` del navegador.
2. **Dado** lo anterior, **cuando** los cambios llegan, **entonces** cerrar ya no pregunta.
3. **Dado** el modo normal con cambios sin enviar, **cuando** se cierra la pestaña, **entonces** no sale el diálogo (con la opción A de Q3), y los cambios siguen en el espacio de la cuenta.
4. **Dados** cambios en memoria, **cuando** el alumno recarga desde «Recargar» del diálogo de cuenta distinta o sale con «Salir», **entonces** no sale el diálogo del navegador, porque ya eligió.

*Cubre: FR-035 a FR-037; SC-005.*

---

### User Story 6 - La sesión venció, la pestaña quedó vieja o algo no se guardó: sé qué hacer (Priority: P2)

Un alumno vuelve a la pestaña después del almuerzo. La franja le dice que la sesión venció y le ofrece «Ingresar»; mientras tanto, sigue estudiando. Otro día, después de un despliegue, la franja le pide recargar la pestaña. Una vez, un cambio no se pudo guardar, y la franja se lo dice.

**Why this priority**: son los avisos que piden algo al alumno; sin ellos, la sincronización se detiene sin que nadie lo sepa.

**Independent Test**: con el doble, responder 401, y después aceptar el ingreso con la misma cuenta y con otra; responder 409 `client_outdated`; responder un lote con un `rejected`; leer la franja a 320 px.

**Acceptance Scenarios**:

1. **Dado** un 401 en `POST /api/sync`, **cuando** D1c lo informa, **entonces** la línea dice «Sesión vencida» y la franja muestra la sesión vencida con «Ingresar»; el acceso no se abre solo, y el alumno puede seguir marcando pasos.
2. **Dado** lo anterior, **cuando** usa «Ingresar» y entra la misma cuenta, **entonces** el aviso se va, D1c envía la cola y sale el toast de la vuelta.
3. **Dado** lo mismo, **cuando** entra otra cuenta, **entonces** F11a recarga el documento sin la confirmación del navegador y sin el diálogo de cuenta distinta, porque el cambio fue a propósito. Con el almacenamiento bloqueado y 2 cambios sin enviar, antes de recargar se ve «Cambiaste de cuenta», con «Descargar lo que no se envió» y «Seguir».
4. **Dado** un 409 `client_outdated`, **cuando** D1c lo informa, **entonces** la franja muestra el mensaje del servidor con «Recargar».
5. **Dado** un lote con 1 operación `rejected`, **cuando** llega, **entonces** la franja dice «1 cambio no se pudo guardar en tu cuenta…», con «Entendido».
6. **Dados** varios avisos a la vez, **cuando** se ve la franja, **entonces** salen todos, en el orden de «Las superficies», y a 320 px no hay desplazamiento horizontal.

*Cubre: FR-012 a FR-018 y FR-027; SC-002 y SC-007.*

---

### User Story 7 - El reloj de mi dispositivo está mal y me lo dicen (Priority: P3)

Una alumna tiene la computadora con la hora atrasada. La franja le dice cuántos minutos y le pide que la corrija. La corrige, y el aviso se va solo.

**Why this priority**: un reloj muy atrasado pierde las fusiones, y lo único que el sistema puede hacer es avisarlo (D1, Riesgo 4). Es raro, por eso es P3.

**Independent Test**: con el doble, responder `POST /api/sync` con un `serverTime` desplazado 2 minutos, 2 minutos y 30 segundos, y 5 minutos respecto del `sentAt` del lote, en los dos sentidos, sin tocar `page.clock`.

**Acceptance Scenarios**:

1. **Dado** un desfase de 2 minutos justos, **cuando** llega la respuesta, **entonces** no hay aviso.
2. **Dado** un servidor 5 minutos adelante del dispositivo, **cuando** llega la respuesta, **entonces** la franja dice que el reloj está 5 minutos atrasado, con «Entendido».
3. **Dado** el aviso, **cuando** el desfase siguiente es menor que 2 minutos, **entonces** el aviso se va solo.
4. **Dado** el aviso, **cuando** el alumno usa «Entendido», **entonces** no vuelve en ese documento, aunque el desfase siga.

*Cubre: FR-028 y FR-029; SC-007.*

Los transversales (FR-038 a FR-047) valen para todas las historias. Sus criterios son SC-008, SC-009 y SC-010.

---

### Edge Cases

- **Sin servidor al arrancar,** con la última copia del contenido de A3: A3 avisa que usa la copia; la línea dice «Sin conexión con el taller» y no sale el toast de «Sin conexión», para no avisar dos veces lo mismo.
- **Dos pestañas de la misma cuenta:** cada una muestra su estado. Si una hace «Borrar todo», la otra muestra el aviso de época después de su próximo envío.
- **El diálogo de cuenta distinta con la pregunta al salir abierta:** el diálogo de cuenta distinta reemplaza a la pregunta, y nada se descarta.
- **Un formulario de F11a recibe `account_mismatch` a la vez que la sincronización:** se ve un solo aviso de cuenta distinta, el de F13; el formulario queda inerte detrás.
- **La sesión vence durante el envío de «Salir»:** lo que quedó sale en la pregunta con el motivo «tu sesión venció». El cierre responde 401, que F11a trata como sesión ya cerrada (F11, FR-050).
- **La época cambia con la copia en memoria y el alumno cierra la pestaña:** la copia cuenta como lo que se perdería, y el navegador pregunta (FR-035).
- **Un desfase del reloj sin conexión:** no hay `serverTime` nuevo, y el aviso queda como estaba.
- **Un 429 en la sincronización:** la línea dice «No pudimos sincronizar», y D1c espera el `Retry-After`. No hay cuenta regresiva (YAGNI).
- **Un 403 `account_disabled`:** vuelve al acceso, como dice F11 (FR-023); F13 no muestra nada.
- **En memoria, uno de los 11 enlaces que recargan el documento:** con cambios sin enviar, el navegador pregunta, porque recargar los pierde (Q3; hallazgo para D1c).
- **«Borrar la cuenta» (F11b) con cambios sin enviar:** la cuenta se borra en el servidor, y lo pendiente ya no tiene adónde ir. La recarga posterior no pregunta.
- **Imprimir:** la franja no se imprime, como `#toast`.
- **El primer cuadro del shell, antes del contenido (F10-Q5):** la franja existe vacía, y la línea de la cuenta no se ve.

## Requirements *(mandatory)*

### Functional Requirements

Entre paréntesis, después del número, van los ítems de los que depende cada requisito; al final, su fuente.

**El estado que F13 lee**

- **FR-001** *(D1c)*: F13 DEBE dibujar sólo lo que expone la interfaz pública de D1c: su estado, sus eventos y sus acciones («Lo que F13 supone de D1c»). NO DEBE leer la cola, el espacio de la cuenta ni el almacenamiento, NO DEBE pedir nada a `/api/sync` ni a `/api/progress` y NO DEBE decidir reintentos, lotes ni esperas. *(D1, FR-077)*
- **FR-002** *(D1c)*: Los componentes DEBEN leer el estado de D1c con suscripción y selectores chicos, sin copiarlo en un estado propio y sin derivar en un efecto lo que se puede calcular al dibujar. *(`AGENTS.md`)*

**La línea de la cuenta**

- **FR-003** *(D1c, F10b)*: El pie de la barra lateral DEBE sumar, debajo de `#save-label`, una línea con el estado de la cuenta y su punto, con el aspecto de `.save-status`. **[NEEDS CLARIFICATION: Q1, dónde se ve el estado en cada ancho]**
- **FR-004** *(D1c, F10b)*: `#save-label` DEBE conservar sus dos textos y decir si el progreso se guarda en este navegador: «Guardado en este navegador» en modo normal, y «Exportá para conservar tu avance» en memoria. **[NEEDS CLARIFICATION: Q2, si se conservan los dos textos de hoy]** *(F10, FR-026)*
- **FR-005** *(D1c)*: La línea DEBE mostrar, para cada estado de D1c, el texto de la tabla «Los estados de la cuenta», y no mostrarse antes de que D1c informe su primer estado.
- **FR-006** *(D1c, F10b)*: El punto DEBE distinguir las tres familias (al día, en curso y problema) con los colores del taller, seguir oculto para el lector de pantalla y no ser lo único que las distingue: el texto dice lo mismo.
- **FR-007** *(D1c, F11a)*: «Tu cuenta» DEBE mostrar, junto a «Salir» y en todos los anchos, la etiqueta «Tu progreso» con el texto de la línea. **[NEEDS CLARIFICATION: Q1]**
- **FR-008** *(D1c)*: La línea NO DEBE ser una región viva ni llevar `role="status"`. *(L3)*

**Los avisos de cambio de estado**

- **FR-009** *(D1c, F10b)*: Al pasar de «Sincronizado» o de «Enviando» a «Sin conexión» o a «No pudimos sincronizar», DEBE salir una vez en `#toast` el texto de ese estado, según el modo. Un reintento que falla de nuevo NO DEBE repetirlo. *(F10, FR-028)*
- **FR-010** *(D1c, F10b)*: Al volver a «Sincronizado» desde «Sin conexión», «No pudimos sincronizar» o «Sesión vencida», después de enviar algo, DEBE salir una vez «Listo: tus cambios llegaron a tu cuenta.». Si no se envió nada, no sale. *(F10, FR-028)*
- **FR-011** *(A3, D1c)*: Al arrancar sin servidor con la última copia de A3, F13 NO DEBE sumar el toast de «Sin conexión» al aviso de A3. *(A3-Q2)*

**La franja de avisos**

- **FR-012** *(F10b)*: El shell DEBE tener una franja de avisos entre la barra superior y `#main`, visible en todos los anchos y montada desde el primer dibujo del shell. Vacía, NO DEBE ocupar lugar, y NO DEBE imprimirse. *(X2)*
- **FR-013** *(F10b)*: La franja DEBE ser un contenedor con `aria-live="polite"` y sin `role`. NO DEBE haber en el documento una región `alert` ni `status` de F13 mientras no muestra nada. *(F11, FR-076; F10, FR-028)*
- **FR-014** *(D1c)*: La franja DEBE mostrar todos los avisos activos, cada uno con su texto y sus botones, en el orden de «Las superficies», y ningún aviso DEBE mover el foco.

**La sesión vencida y la pestaña vieja**

- **FR-015** *(D1c, F11a)*: Con «requiere ingreso», la franja DEBE mostrar el aviso de la sesión vencida, según el modo, con «Ingresar», que llama a «pedir el ingreso» de F11a. El acceso NO DEBE abrirse solo, y el alumno sigue estudiando. **[NEEDS CLARIFICATION: Q5, la sesión que vence en segundo plano]** *(D1, FR-076; F11, FR-006)*
- **FR-016** *(D1c, F11a)*: Si «pedir el ingreso» termina con la misma cuenta, el aviso DEBE irse y D1c sigue. Si termina con otra, el cambio es a propósito y F11a recarga el documento (FR-020 de F11), sin el diálogo de cuenta distinta. Sólo si la cola vive en memoria y quedan cambios sin enviar, antes de esa recarga DEBE abrirse «Cambiaste de cuenta», que dice cuántos se pierden y ofrece «Descargar lo que no se envió» y «Seguir», que recarga. En modo normal no hay aviso: lo no enviado queda en el espacio de la cuenta anterior. *(F11, FR-020; D1, FR-065 y FR-071)*
- **FR-017** *(D1c)*: Con «pestaña vieja», la franja DEBE mostrar el mensaje del servidor con «Recargar». *(D1, FR-076)*
- **FR-018** *(D1c)*: Si recargar pierde cambios, porque la cola vive en memoria, el aviso de la pestaña vieja DEBE decir cuántos y ofrecer «Descargar lo que no se envió» antes de «Recargar». *(D1, FR-071)*

**La cuenta distinta**

- **FR-019** *(D1c, F10b)*: Cuando D1c informa una cuenta distinta, DEBE abrirse el diálogo de cuenta distinta: modal, con el rol de un diálogo de alerta, que NO se cierra con Esc y deja la página inerte detrás hasta recargar. **[NEEDS CLARIFICATION: Q4, la forma de los avisos]** *(D1, US3; SC-004)*
- **FR-020** *(D1c, F11a)*: El diálogo DEBE abrirse por las tres causas que detecta D1c, todas de una sesión que cambió de cuenta en otra pestaña:
  - un 409 `account_mismatch` en un pedido del cliente de D1c;
  - un 419 o un 401 después del cual `GET /api/session` trae otra cuenta;
  - una foto o un delta con otro `userId`.

  El ingreso de otra cuenta en esta misma pestaña, desde «pedir el ingreso», no es una de ellas: lo cubre FR-016. Con el diálogo abierto, ninguna otra superficie de F13 ni de F11a DEBE abrir otro aviso de cuenta distinta. *(D1, FR-065 y FR-066; F11, FR-018 y FR-019)*
- **FR-021** *(D1c)*: El diálogo DEBE decir qué pasa con lo que no se envió, según el modo. En modo normal, que queda en el navegador para la cuenta anterior y vence a los 30 días. En memoria y con cambios sin enviar, cuántos se pierden al recargar, con «Descargar lo que no se envió» antes de «Recargar». *(D1, FR-067, FR-069 y FR-071)*
- **FR-022** *(D1c)*: El diálogo NO DEBE mostrar el nombre, el email ni el id de ninguna de las dos cuentas.

**La época cambiada**

- **FR-023** *(D1c, F8)*: Cuando D1c informa una época cambiada, la franja DEBE mostrar el aviso de época una vez por cambio. La causa puede ser un 409 `epoch_mismatch` en un envío o en una importación, o una foto de una época más nueva al arrancar o al volver a la pestaña. NO DEBE mostrarlo por el «Borrar todo» de la misma pestaña, que F8 informa. *(D1, FR-043 y FR-075; L6)*
- **FR-024** *(D1c)*: El aviso DEBE decir cuándo se borró, con la fecha de `resetAt`, y que se muestra la cuenta como quedó. Sin copia, ofrece «Entendido», que lo quita.
- **FR-025** *(D1c)*: Con copia, el aviso DEBE decir cuántos cambios no llegaron a enviarse y ofrecer «Descargar la copia» y «Descartar la copia». Sigue hasta que el alumno descarte la copia o hasta que D1c informe que ya no está, y vuelve después de recargar si la copia sobrevive. NO DEBE prometer que la copia se puede importar. *(D1, FR-071 y FR-075)*
- **FR-026** *(D1c)*: «Descartar la copia» DEBE pedir una confirmación en el mismo aviso, que dice que esos cambios no se recuperan, con «Descartar» y «Cancelar». *(ADR 0003, decisión 3)*

**Los cambios rechazados**

- **FR-027** *(D1c)*: Cuando un lote vuelve con operaciones rechazadas, la franja DEBE mostrar cuántas, sin el motivo técnico, con «Entendido». Un lote siguiente con rechazos suma al aviso abierto en lugar de abrir otro. *(D1, FR-064; L4)*

**El reloj desfasado**

- **FR-028** *(D1c)*: Cuando el desfase que informa D1c pasa de 2 minutos (más de 120 000 ms, en cualquier sentido), la franja DEBE mostrar el aviso del reloj con los minutos redondeados y si está adelantado o atrasado. Con 2 minutos justos o menos, no hay aviso. *(D1, FR-078)*
- **FR-029** *(D1c)*: El aviso del reloj DEBE irse solo cuando el desfase vuelve a 2 minutos o menos. «Entendido» lo oculta por lo que dura el documento. *(L5)*

**«Salir»**

- **FR-030** *(D1c, F11a)*: Con D1c, «Salir» DEBE pedirle a D1c que envíe la cola antes de `POST /api/auth/logout`. Mientras tanto, el botón dice «Enviando tus cambios…», queda deshabilitado y no admite un segundo pedido. Si no queda nada, sigue el cierre de F11a. *(D1, FR-068; L7)*
- **FR-031** *(D1c, F11a)*: Si quedan cambios, DEBE abrirse la pregunta con su cantidad y su motivo. En modo normal ofrece «Conservarlos y salir», «Descartarlos y salir» y «Volver al taller», cada una con lo que pasa. *(D1, FR-068 y FR-071)*
- **FR-032** *(D1c, F11a)*: En memoria, la pregunta NO DEBE ofrecer conservar: DEBE ofrecer «Descargar una copia», «Salir sin enviarlos» y «Volver al taller». *(D1, FR-070 y FR-071)*
- **FR-033** *(D1c, F11a)*: La elección DEBE aplicarse sólo después del 204 del cierre, o de un 401 porque ya no había sesión. Si el cierre falla, rige el FR-051 de F11 y no se descarta nada. *(F11, FR-050 y FR-051)*
- **FR-034** *(D1c, F11a)*: Con D1c, la nota junto a «Salir» DEBE decir lo que hace salir según el modo, en lugar de la que F11a deja hasta D1c. *(F11, FR-052 y Q4; L7)*

**Al cerrar o recargar la pestaña**

- **FR-035** *(D1c)*: Mientras D1c informe cambios que se perderían si el documento se descarga, DEBE pedirse la confirmación del navegador (`beforeunload`), con su texto. *(D1, FR-070 y FR-071)*
- **FR-036** *(D1c)*: Esa confirmación DEBE pedirse sólo con la cola en memoria y cambios sin enviar. **[NEEDS CLARIFICATION: Q3, cuándo pide confirmación el navegador]**
- **FR-037** *(D1c, F11a, F11b)*: El oyente DEBE ponerse cuando la condición empieza a cumplirse y sacarse cuando deja de cumplirse; nunca queda puesto siempre. Las recargas que el alumno ya eligió NO DEBEN pedir la confirmación: «Salir», «Recargar» del diálogo de cuenta distinta y de la pestaña vieja, la recarga después de borrar la cuenta y la de un cambio de cuenta.

**Teclado, foco, celular y movimiento reducido**

- **FR-038** *(F10b, F11a)*: Cada superficie DEBE poder usarse sólo con el teclado: los botones de la franja y de los diálogos están en el orden del documento, con el foco visible, y se activan con Enter y con Espacio. La franja va después de la barra superior y antes de `#main`; «Ir al contenido» la salta, como salta la barra superior.
- **FR-039** *(F10b, F11a)*: Al abrirse, cada diálogo DEBE poner el foco en la opción que no pierde nada: «Volver al taller» en la pregunta al salir; «Descargar lo que no se envió», si está, o si no «Recargar», en el de cuenta distinta; «Descargar lo que no se envió» en «Cambiaste de cuenta». El foco queda dentro del diálogo mientras está abierto, y al cerrar la pregunta al salir vuelve a «Salir».
- **FR-040** *(F10b, F11a)*: Cada superficie DEBE funcionar desde 320 px de ancho sin desplazamiento horizontal: los botones de la franja y de los diálogos bajan de línea, y los diálogos ocupan la pantalla en el celular, como «Tu cuenta» (F11, FR-067).
- **FR-041** *(F10b)*: Ningún estado DEBE depender de una animación: «Enviando a tu cuenta…» no usa como única señal un indicador que gira, y con movimiento reducido no hay transiciones, por la regla global de `styles.css` y sin librería de animación.
- **FR-042** *(F10b, F11a)*: Los estilos DEBEN ser clases de las hojas del taller, con sus tokens, sus botones y sus diálogos. NO DEBE haber ningún `style=` nuevo, ni `style={…}` de React, ni `setAttribute('style', …)`, ni `.cssText`. *(C4)*
- **FR-043** *(D1c, F10b)*: Cada anuncio DEBE salir una sola vez por cambio de estado o por aviso nuevo: ni la franja ni `#toast` repiten un aviso que ya está a la vista. *(X2)*

**Verificación**

- **FR-044** *(F11a, D1c)*: Los E2E DEBEN usar Page Objects con localizadores por rol y nombre accesible (el del shell y el de «Tu cuenta», ampliados) y el doble de la API de F11a, con respuestas de `POST /api/sync` y `GET /api/progress` tomadas del contrato de D1a:
  - el 200 al día, uno demorado y uno con `serverTime` desplazado respecto del `sentAt` del lote;
  - los 409 `account_mismatch`, `epoch_mismatch` con `{epoch, revision}` y `client_outdated`;
  - el 401, el 419, el 429 con `Retry-After` y el 500;
  - un lote con `rejected`;
  - un pedido abortado por la red;
  - una foto con otro `userId` y otra con `resetAt`.

  Sin servicios externos ni el stack de Docker. Cada error de consola que provoca una respuesta simulada se declara con `expectIssue` y su motivo. La confirmación del navegador se prueba con `page.close({ runBeforeUnload: true })` después de una interacción, con un manejador que comprueba que el diálogo es de tipo `beforeunload`. *(ADR 0008; `qa/AGENTS.md`)*
- **FR-045** *(D1c)*: Cada comportamiento DEBE empezar con una prueba que falla. Vitest con Testing Library prueba la tabla de estados, el orden de la franja, las opciones de cada diálogo según el modo y la condición de la confirmación, con la interfaz de D1c simulada y sus estados armados con fishery. Los valores esperados se copian a mano de las tablas de esta spec, nunca de la misma factory ni del código que se prueba. *(Constitución, principio II; ADR 0008)*
- **FR-046** *(F10b, D1c)*: La red E2E vigente al empezar F13 (los 106 de F1, los 17 de A2 y los de F3 a F12a, F10 y D1c) DEBE seguir en verde sin editar sus escenarios, salvo lo que decida Q2. Toda edición de un E2E existente va en su propio commit, con TDD y con la aprobación del usuario.
- **FR-047** *(D1c, F10b, F11a)*: F13 DEBE cerrar con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde, sin dependencias nuevas, con `dist/index.html` bajo `BOOT_SIZE_LIMIT` (1 500 000 caracteres) y su tamaño antes y después en el PR. DEBE actualizar `docs/architecture.md` y `qa/AGENTS.md` con lo que agrega.

### Key Entities *(include if feature involves data)*

- **Estado de la cuenta:** lo que D1c informa de su sincronización (al día, pendiente, sin conexión, error, requiere ingreso o pestaña vieja), con la cantidad de cambios en la cola. F13 lo dibuja; no lo guarda.
- **Modo de guardado:** normal (la cola vive en el espacio de la cuenta, en el navegador), compartido (en memoria, elegido en «Tu cuenta», F11d) o almacenamiento bloqueado (en memoria, por el navegador). Decide los textos de memoria, las opciones al salir y la confirmación al cerrar.
- **Línea de la cuenta:** el texto y el punto del pie, debajo de `#save-label`, con el estado de la cuenta. También aparece en «Tu cuenta».
- **Franja de avisos:** el contenedor del shell que muestra los avisos que piden algo al alumno o le explican un cambio, sin mover el foco.
- **Aviso:** una entrada de la franja, con su texto, sus botones y cómo termina: la sesión vencida, la pestaña vieja, la época cambiada, los cambios rechazados y el reloj desfasado.
- **Copia de lo no enviado:** el archivo que D1c arma con los cambios que no se van a enviar (los de una época vieja, o los que viven en memoria antes de una recarga o de salir). D1c fija su formato; F13 ofrece descargarla o descartarla.
- **Desfase del reloj:** la diferencia, en milisegundos y con signo, entre el reloj del dispositivo y el `serverTime` de la última respuesta.
- **Pregunta al salir:** el diálogo que aparece en «Salir» si quedaron cambios sin enviar.
- **Confirmación del navegador:** el diálogo de `beforeunload`, con el texto del navegador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cada fila de «Los estados de la cuenta» tiene al menos una prueba, de Vitest o E2E, que comprueba su línea, su familia de punto, su franja y su toast con el texto escrito a mano: 6 de 6 estados, con 0 textos distintos de la tabla.
- **SC-002**: Con el doble al día, cada E2E de la red existente termina con 0 avisos en la franja, 0 toasts de F13 y 0 diálogos de F13. Con cada respuesta problemática de FR-044, aparece exactamente el aviso, el toast o el diálogo que le corresponde, y un reintento que falla igual suma 0 anuncios.
- **SC-003**: Con el diálogo de cuenta distinta abierto, salen 0 pedidos que modifican, el teclado y el mouse provocan 0 escrituras del almacenamiento, Esc lo deja abierto y su texto tiene 0 nombres, emails o ids de cuenta. Con la cola en memoria, el archivo se descarga antes de recargar. Un ingreso con otra cuenta en la misma pestaña abre 0 diálogos de cuenta distinta, y 1 «Cambiaste de cuenta» sólo con cambios en memoria.
- **SC-004**: En los cinco caminos de «Salir», el espacio queda como dicen FR-030 a FR-033: enviado, limpio; conservar, con los cambios; descartar, limpio; en memoria, salir sin enviarlos, sin claves de progreso; y volver, sin cambios. «Volver» hace 0 pedidos de cierre, y un cierre que falla descarta 0 cambios.
- **SC-005**: Con la cola en memoria y cambios sin enviar, cerrar la pestaña produce 1 diálogo `beforeunload`. Sin cambios, en modo normal (con la opción A de Q3) y en las recargas de FR-037, produce 0.
- **SC-006**: Con un `epoch_mismatch` y cambios pendientes, la descarga baja 1 archivo y el aviso sigue; descartar pide 1 confirmación y deja 0 avisos de época. Después del «Borrar todo» de la misma pestaña, hay 0 avisos de época.
- **SC-007**: Con un desfase de 120 000 ms hay 0 avisos de reloj, y con uno de 150 000 ms, 1, en los dos sentidos; al bajar a 60 000 ms, 0. La franja con todos los avisos a la vez muestra los 5 en su orden, sin desplazamiento horizontal a 320 y a 390 px.
- **SC-008**: Cada superficie se completa sólo con el teclado; al cerrar la pregunta al salir, el foco vuelve a «Salir»; con movimiento reducido hay 0 transiciones; y en una corrida sin problemas, `getByRole('alert')` y `getByRole('status')` encuentran los mismos elementos que sin F13 (E2E).
- **SC-009**: La red E2E vigente al empezar F13 pasa con 0 escenarios editados, salvo los que decida Q2 (0 con la opción A).
- **SC-010**: `dist/index.html` queda bajo 1 500 000 caracteres, con su tamaño antes y después en el PR; F13 suma 0 dependencias y 0 sitios de estilo en línea; y `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan.

## Riesgos

1. **D1c no tiene plan.** Lo que F13 supone de su interfaz puede cambiar. *Mitigación:* la tabla «Lo que F13 supone de D1c», que el plan de D1c contrasta, y el plan de F13 después del de D1c (decisión del usuario).
2. **`beforeunload` no es confiable.** Safari en iOS no lo dispara, Chromium sólo lo muestra si hubo una interacción y ningún navegador deja poner un texto propio. *Mitigación:* el envío de D1c al ocultar la pestaña (FR-063 de D1) y el aviso de F11d al activar el modo compartido; esta spec lo dice en «Assumptions».
3. **Demasiados avisos.** Un alumno con mala conexión podría recibir un toast tras otro. *Mitigación:* la línea no es viva (L3), el toast sale una vez por cambio de estado (FR-009, FR-010 y FR-043) y la franja sólo lleva lo que pide algo.
4. **Chocar con la red.** Una región `alert` o `status` de más rompe los E2E que ubican el error de la compuerta y `#toast`. *Mitigación:* la franja sin `role` (FR-013) y SC-008.
5. **El celular no ve el pie.** *Mitigación:* Q1, con el toast, la franja y «Tu cuenta».
6. **Editar E2E congelados.** *Mitigación:* la opción A de Q2 no edita ninguno; las otras van con TDD y con aprobación (FR-046).
7. **La copia de la época no tiene formato ni destino.** El alumno descarga un archivo que quizás no puede volver a usar. *Mitigación:* el aviso no promete importarla (FR-025), y el formato es un hallazgo para D1c.
8. **En memoria, los 11 enlaces que recargan el documento** piden la confirmación (con la opción A de Q3) y, si el alumno sigue, pierden la cola. *Mitigación:* un hallazgo para D1c: conservar la cola a través de una recarga de la misma pestaña, o enviarla antes de seguir el enlace.
9. **Un diálogo que no se cierra.** El de cuenta distinta sólo se resuelve recargando (Q4). *Mitigación:* en modo normal no se pierde nada al recargar, y en memoria se ofrece antes la copia.
10. **Nada se ejecutó al especificar.** No corrieron `npm`, Docker ni un navegador. *Mitigación:* el plan mide; las cifras de esta spec salen de leer el código, los contratos y la documentación de Playwright.

## Relación con otros ítems

**D1c** (spec 007, sin plan):

- F13 depende de su interfaz pública, que amplía el FR-077 de D1 («Lo que F13 supone de D1c»):
  - el estado de error (L8) y la cantidad de cambios;
  - el modo y lo que se perdería al descargar el documento;
  - los eventos de cuenta distinta y de época, con la copia;
  - el desfase del reloj y los rechazos;
  - «enviar ahora» con su resultado, y conservar o descartar después del cierre;
  - «descargar lo que no se envió».
- «Atrasado», en el FR-077, se lee como `client_outdated` (L1).
- D1c fija el formato de la copia de lo no enviado, si se puede importar y dónde vive (en el espacio o en memoria).
- D1c suma las respuestas por omisión de `POST /api/sync` y `GET /api/progress` al doble de la API, porque es el que empieza a pedirlas en cada arranque.
- En memoria, los 11 enlaces internos que recargan el documento pierden la cola. Conviene que D1c la conserve a través de una recarga de la misma pestaña, o que la envíe antes de seguir el enlace.
- El aviso de carga «No se pudo leer o guardar el avance. Podés exportarlo al terminar.» (ADR 0003) deja de ser exacto con D1c, porque el progreso llega igual a la cuenta. No es de F13, y lo fija un E2E de F1 (`startup-storage.spec.ts`).
- Un `epoch_mismatch` en la importación de F11d también cambia la época, y F13 lo avisa como cualquier otro (FR-023).

**F11** (spec 015):

- F13 usa de F11a «Tu cuenta», «Salir», «pedir el ingreso», el cliente de la API y el doble de la API de los E2E, sin cambiarlos.
- La nota junto a «Salir» («Tu progreso se guarda en este navegador, no en tu cuenta…», FR-052) vale hasta D1c; desde D1c la reemplaza la de F13 (FR-034).
- El envío de la cola antes del cierre, que la spec de F11 dejaba para «F11d o D1c»: el envío es de D1c, y la parte visible, de F13 (L7).
- Cuando «pedir el ingreso» termina con otra cuenta, F11a recarga (FR-020 de F11) sin el diálogo de cuenta distinta, porque el cambio fue a propósito; sólo con la cola en memoria y cambios sin enviar, F13 ofrece antes la copia con «Cambiaste de cuenta» (FR-016). El diálogo de cuenta distinta es para una sesión que cambió en otra pestaña (FR-020).
- F11d sigue con sus dos superficies. Su tabla de estados no nombra el `epoch_mismatch` de la importación: su diálogo lo resuelve, y F13 lo avisa en la franja.
- El aviso del almacenamiento bloqueado en «Tu cuenta» (F11, FR-063) es de F11d; la línea «Tu progreso» de F13 va en el mismo diálogo, sin repetirlo.

**F10** (spec 024):

- F13 va dentro del shell de la raíz única (F10b): la línea en el pie, la franja entre la barra superior y `#main`, los diálogos con portales en la raíz y los toasts por el canal único de `#toast` (FR-028 de F10).
- El FR-026 de F10 (los dos textos del pie) sigue igual con la opción A de Q2; con la B o la C, F13 edita sus E2E.
- F10 y F13 se integran de a uno (FR-059 de F10).

**F8** (spec 022):

- El «Borrar todo» de la misma pestaña no produce el aviso de época (L6), y el `epoch_mismatch` de su propio reset sigue con el texto de L5.
- La guarda contra el solape es de D1c (F8-Q3), no de F13.

**A3** (spec 016): su aviso de la última copia al arrancar sin servidor no se duplica con el toast de «Sin conexión» (FR-011).

**Hoja de ruta del front** (enmiendas que integra el coordinador):

- La fila de F13 dice «Propuesta, sin aceptar» y «Pendiente»: pasa a «En especificación», con el enlace a esta spec, porque el usuario aceptó el ítem el 2026-10-28.
- En «Superficies que pide D1», la 3 y la 5 pasan de «F13 (propuesta)» a F13.
- En «Alcance por ítem», F13 deja de ser una propuesta y suma la franja, la línea en «Tu cuenta», los cambios rechazados (L4) y la nota de «Salir».
- En «Decisiones abiertas», la fila de F13 pasa a nombrar las cinco preguntas de esta spec.
- En «Acciones del usuario», «Ahora», aceptar o rechazar F13 ya está hecho.
- Las dependencias de F13 son D1c, F10 (F10b) y F11a; el modo compartido se ejerce con F11d o con el almacenamiento bloqueado.
- «Criterios de aceptación globales» citan el tope de 1 250 000; desde el PR #76 es de 1 500 000.

**Hoja de ruta del backend:** el alcance de D1 suma que D1c amplía su FR-077 con lo que pide F13, como enmendó el FR-070 y el FR-074.

## Assumptions

- **D1c entregado antes de F13,** con la interfaz de «Lo que F13 supone de D1c». Si D1c la resuelve distinta, esta spec se ajusta antes de su plan.
- **F10b entregado:** el shell es de React y hay una sola raíz. **F11a entregado:** «Tu cuenta», «Salir», «pedir el ingreso» y el doble de la API. El modo compartido se prueba con el almacenamiento bloqueado, que no necesita F11d; con F11d, también con la opción de «Tu cuenta».
- **El doble de la API** es el de F11a (`qa/e2e/fixtures/api-double.ts` en `impl-f11a`, `a7b3c71d`): `on` registra un manejador, `reply` una secuencia de respuestas, `callsTo` cuenta pedidos y `assertAllHandled` falla ante un pedido sin respuesta. D1c le suma las respuestas por omisión de la sincronización.
- **Sin conexión en los E2E:** un pedido abortado en el doble o el contexto sin red (`context.setOffline`). Cuál de los dos, y si las rutas simuladas siguen respondiendo sin red, lo confirma el plan.
- **El reloj en los E2E** se desplaza con el `serverTime` del doble, relativo al `sentAt` del lote, sin tocar `page.clock`. Las respuestas por omisión siguen el reloj de la página, para que los E2E del temporizador y del repaso, que corren con `page.clock`, no vean un desfase («Lo que F13 supone de D1c»).
- **`beforeunload`:** el navegador muestra su propio texto, Chromium sólo después de una interacción, y Safari en iOS no lo dispara. Es la única confirmación posible al cerrar.
- **Los mensajes del servidor** son los de `backend/api/lang/es/api.php` en `24ba9d3d`, y el de `client_outdated` se muestra tal cual. Para `account_mismatch` y `epoch_mismatch`, F13 usa sus propios textos, porque los del servidor no dicen qué pasa con lo no enviado, como hizo F8 con su L5.
- **Las sesiones** duran 30 minutos de inactividad y 8 horas como máximo (C3a, Q5).
- **Sin dependencias nuevas:** F13 usa React, Zustand y los diálogos nativos que ya están.
- **El ADR 0006 sigue en propuesta.** Lo que F13 toma de él llega por la spec de D1.

## Alternativas consideradas

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde se ve el estado (Q1) | Sólo el pie y la franja; un indicador en la barra superior | **El pie, «Tu cuenta», el toast y la franja** (recomendada): el celular lo ve sin tocar la barra superior |
| Los textos del pie (Q2) | Una sola línea nueva; dos líneas con un texto nuevo en memoria | **Dos líneas, sin tocar `#save-label`** (recomendada): 0 E2E congelados editados |
| La confirmación al cerrar (Q3) | Siempre que haya cambios sin enviar; nunca | **Sólo si cerrar pierde algo** (recomendada): sin preguntas de más en modo normal |
| La forma de los avisos (Q4) | Todo en la franja; recargar sola; la época también modal | **Sólo la cuenta distinta es modal** (recomendada): bloquea lo que mezcla cuentas y no interrumpe lo demás |
| La sesión vencida en segundo plano (Q5) | Pedir el ingreso enseguida; enseguida sólo en memoria | **Avisar y dejar elegir** (recomendada): local primero |
| Anunciar la línea de la cuenta | Hacerla región viva (`role="status"`) | **No** (L3): anunciaría cada frase; los cambios importantes van por el toast |
| Los avisos que piden algo | `#toast` | **La franja:** el toast se va a los 4,5 s, y la copia, «Recargar» o «Ingresar» tienen que quedar |
| La franja como región | `role="alert"` o `role="status"` | **`aria-live` sin rol:** una región con rol, vacía, rompe los E2E que ubican la compuerta y el toast (F11, FR-076) |
| «Sin conexión» | `navigator.onLine` | **El envío fallido** (L2, como F8-L6): `navigator.onLine` dice que hay red aunque el taller no responda |
| Los cambios rechazados | No mostrarlos; mostrarlos con el motivo | **Mostrar cuántos, sin el motivo** (L4): el alumno no puede corregir el motivo, pero sabe que algo no llegó |
| La hora de la última sincronización | «Sincronizado hace 2 minutos» | **No** (YAGNI): un temporizador más para un dato que no cambia lo que el alumno hace |
| Un botón «Sincronizar ahora» | En el pie o en «Tu cuenta» | **No** (YAGNI): D1c ya envía en cada momento útil, y el botón puede chocar con el límite de 60 por minuto |
| El texto del servidor para la cuenta distinta y la época | Mostrarlos tal cual | **Textos propios:** los del servidor no dicen qué pasa con lo no enviado, y el de la época promete algo que hace D1c |

## Partición

**No se propone.** La spec tiene 47 requisitos y 10 criterios, contra los 52 de C3a, la mayor del épico. Un corte natural sería:

- **F13a:** la línea, el toast, la franja y sus avisos (FR-001 a FR-018 y FR-023 a FR-029);
- **F13b:** la cuenta distinta, «Salir» y la confirmación al cerrar (FR-019 a FR-022 y FR-030 a FR-037);
- y los transversales (FR-038 a FR-047), en las dos.

Pero las dos partes comparten la franja, el modo y la copia de D1c, y ninguna espera algo que la otra no espere. Partir costaría dos ciclos de plan sin destrabar nada.

## Acciones del usuario

Los agentes no las hacen.

| Cuándo | Acción |
| --- | --- |
| Ahora | Responder el clarify (Q1 a Q5) y corregir, si hace falta, las lecturas L1 a L8 y los textos propuestos |
| Plan de D1c | Contrastar «Lo que F13 supone de D1c» con su interfaz |
| F13, antes y después de la franja | La comprobación manual con lector de pantalla de la franja, de los toasts y de los diálogos (X2) |
| F13, sólo con la opción B o C de Q2 | Aprobar la edición de los E2E de F1 y de F10 que fijan los textos del pie |

## Descargas previstas

- **Ninguna.** F13 usa lo que ya está instalado: React, Zustand, Vitest, Testing Library, fishery y Playwright.

## Fuentes consultadas (2026-10-28)

- **Context7,** con la segunda instancia (`/microsoft/playwright`, versión 1.63.0, la del ADR 0008):
  - `page.close({ runBeforeUnload: true })` corre los manejadores de `beforeunload` y no espera a que la página se cierre; un manejador de `dialog` con `dialog.type() === 'beforeunload'` lo acepta o lo descarta. Sin un manejador, Playwright descarta solo todos los diálogos, así que la prueba tiene que registrar el suyo;
  - `browserContext.setOffline(true)` emula el contexto sin red;
  - `page.clock.setSystemTime` mueve la hora sin disparar temporizadores. F13 no la usa (Assumptions).

  No confirmó si las rutas de `page.route` responden con el contexto sin red, ni que Chromium exija una interacción previa para mostrar `beforeunload`. Las dos cosas las confirma el plan.
- **El código, en `master` (`24ba9d3d`):**
  - `frontend/src/index.html`: el pie y `#toast`;
  - `frontend/styles.css`: `.save-status`, `.status-dot`, `#toast`, el bloque de 850 px que oculta `.sidebar-bottom` y la regla de movimiento reducido;
  - `frontend/app.js`: `updateSaveLabel` y `toast`;
  - `qa/e2e/specs/startup-storage.spec.ts` y `qa/e2e/pages/shell.ts`;
  - `backend/api/lang/es/api.php`.
- **El doble de la API,** en `impl-f11a` (`a7b3c71d`): `qa/e2e/fixtures/api-double.ts` y `qa/e2e/fixtures/index.ts`.
- **Las specs y los contratos:** D1 (007, con los contratos de D1a y D1b), F11 (015), F10 (024), F8 (022) y A3 (016), las dos hojas de ruta y `.coordinador/clarify-decisiones.md`.
