# Feature Specification: F8 · Port de Método a React

**Feature Branch**: `022-f8-metodo` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Clarificada (sesión del 2026-10-28); lista para el plan, con lecturas a confirmar en el PR

**Input**: Ítem **F8** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Método». Hay que portar a React la página con su panel de respaldos: exportar, importar (`#import-file`) y «Borrar todo» con su confirmación. Por la decisión F9-Q1 del usuario, F8 también se lleva lo que dibuja `renderMethod`: la bitácora (`#note-learned` y `#note-next`), `#note-state` y el pedido al tutor. Es el último port de una vista del tronco antes de F10. Lo encargó el coordinador el 2026-10-28, y el usuario respondió su clarify el mismo día (ver «Clarifications»).

**Describe el código de `f2b-acum@2b37caf4`**: F2a, A2 y las cuatro unidades de F2b integradas, en un ensayo de sólo lectura. No describe `master` (`e87772d`), que todavía no los tiene. Lo que toma de F2b es un hecho y cita su archivo: `features/progress-backup`, la gramática de URL y `startApp()`. El plan de F2b es [plan-f2b.md](../009-f2-seams/plan-f2b.md).

Usa como base:

- los ADR [0008](../../docs/adr/0008-pruebas-del-front.md) y [0003](../../docs/adr/0003-integridad-del-progreso.md);
- el [mapa del front legacy](../front-react/legacy-map.md);
- la [spec de D1](../007-d1-progreso-sincronizacion/spec.md), con el [contrato de D1a](../007-d1-progreso-sincronizacion/contracts/http.md) (entregado en el PR #36) y el [de D1b](../007-d1-progreso-sincronizacion/contracts/http-d1b.md) (entregado en el PR #39);
- el [contrato HTTP de C3a](../004-c3-identidad-acceso/contracts/http.md);
- la [constitución](../../.specify/memory/constitution.md) 1.4.1.

Las specs de F3 (012), F4 (013), F5 (018), F7 (021), F9 (014) y F11 (015) ya tienen su clarify del 2026-10-28, pero viven en otras ramas: se citan sin enlace.

## Intención y alcance

**Lo que entendemos.** Método (`#metodo`) es la página que propone una forma de estudiar. También es donde el alumno escribe su bitácora y donde gestiona su progreso. Hoy la dibuja `frontend/app.js` con una cadena de HTML (`renderMethod` y `backupsPanel`). La mueven:

- una rama del delegado de entrada (`data-note`) y cinco del de clic, sobre `#main`;
- tres oyentes sobre elementos estáticos de `index.html`: el `<dialog id="confirm-dialog">` y su par de botones, y el `<input id="import-file">` oculto.

F8 la lleva a una página de React que conserva el aspecto, los textos, el teclado, el progreso guardado y el archivo exportado byte a byte. D1b ya importa ese formato legacy en el servidor. La exportación, la importación y el borrado local no se reescriben: ya viven en `features/progress-backup` (F2b, unidad 6), con una interfaz que D1c va a reemplazar. F8 dibuja esa interfaz, la conecta y lleva su armado a `frontend/src/app/` (Q2).

**Lo que cambia a propósito.**

- **«Borrar todo» pasa a pedir la contraseña** y a borrar también el progreso de la cuenta en el servidor con el reset de D1b, antes de borrar el de este navegador (Q1). Sin servidor no se borra nada. Con eso, F8 depende de F11a (la sesión, el cliente de la API y «pedir el ingreso») y de D1a y D1b, ya entregados, y la superficie 4 de D1 queda en F8.
- **Lo que hoy existe sólo porque `innerHTML` rehace la vista** adopta el comportamiento de React (X1 y C2, sin excepciones por Q4):
  - el foco ya no se pierde después de importar ni de «Borrar todo»;
  - `#note-state` conserva su último texto.

Fuera de «Borrar todo», el alumno no nota el cambio.

**Lo que hay que cuidar,** porque la red de F1 no lo fija y un port ingenuo lo rompe:

- el botón «Exportar mi progreso» es de la barra lateral, no de Método, y existe en las ocho vistas;
- la bitácora escribe en cada tecla;
- la importación y «Borrar todo» siguen un orden de efectos que hoy fija un check que pierde su punto de entrada;
- «Borrar todo» no puede borrar nada local si el servidor no confirmó el reset.

Es para quien porta vistas y para quien revisa el PR. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. La red de F1 (106 E2E) y los 17 E2E de A2 pasan sin editarse con el build del port.
2. Los E2E nuevos de Método pasan contra el legacy antes de portar y, sin editarse, contra la página nueva. Cubren la bitácora, el pedido al tutor, exportar, importar y los respaldos, con la descarga y la carga de un archivo real.
3. Los E2E de lo que cambia a propósito se escriben con el comportamiento nuevo y fallan contra el legacy por esa razón:
   - los tres de React: el foco después de importar, el foco después de «Borrar todo» y `#note-state`;
   - los de «Borrar todo» con el servidor, contra el doble de la API de F11a.
4. El archivo exportado tiene los mismos bytes en el legacy y en el port, y las dos exportaciones congeladas se importan con el mismo resultado guardado.
5. Una confirmación exitosa hace exactamente tres pedidos, en este orden: confirmar la contraseña, leer la época y el reset. Recién después borra lo local. Cualquier falla del servidor deja las claves locales intactas.
6. La página produce el mismo DOM que `renderMethod`, salvo las diferencias listadas. Las reglas de CSS que sólo usa Método se mudan a la hoja de la página y dan el mismo estilo computado.
7. Cada tecla de la bitácora hace una escritura. Montar la página, copiar, exportar, descargar un respaldo y abrir o cancelar la confirmación no escriben nada. Las fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar.
8. `app.js` pierde todo lo de Método y el armado de `progress-backup`, recibe la instancia en `startApp()` y conserva la exportación de la barra lateral. `index.html` pierde la confirmación y el selector de archivo estáticos, y nada más.

**Entra:**

- La página de Método en `frontend/src/pages/`:
  - la rutina;
  - la bitácora con su estado;
  - el pedido al tutor y su botón de copiar;
  - las fuentes;
  - el panel de respaldos;
  - «Tu progreso te pertenece», con exportar, importar y «Borrar todo»;
  - la confirmación, con la contraseña, y el selector de archivo.
- El modelo puro que necesita: el texto del pedido y el del estado de la nota.
- «Borrar todo» con el reset del servidor (Q1): la contraseña confirmada, la época leída justo antes y el reset, a través del cliente de la API de F11a, como un paso que el armado le pasa a la feature.
- El armado de `progress-backup` en `frontend/src/app/` y el contrato nuevo de `startApp()` (Q2).
- El adaptador mínimo de `frontend/src/app/legacy/` y el corte de `app.js`, de `index.html` y de los arneses de `qa/`.
- Las reglas de CSS que sólo usa Método (unas 23, X3) y el `style=` de la página.
- Los E2E con su Page Object, con la descarga y la carga de archivos, y las respuestas del servidor en el doble de la API de F11a.
- Las specs de Vitest de modelo y de componentes.
- La documentación que cambia con ellos: `docs/architecture.md` y `qa/AGENTS.md`.

**Queda fuera:**

- **El cliente v2 (D1c):**
  - el espacio por cuenta y la sincronización;
  - cargar la foto de la época nueva después del reset;
  - importar al servidor;
  - la guarda general contra el solape de dos operaciones (Q3).
- **La lógica de exportar, importar y del borrado local,** que ya es de `features/progress-backup` y no cambia un byte. La importación de Método sigue siendo local hasta D1c.
- **El shell y el router (F10):** la barra lateral, `#save-label`, `#toast`, «Exportar mi progreso» de la barra lateral, `syncShell` y el cambio de idioma.
- **Las otras vistas y las pantallas de cuenta:** Recorrido, Biblioteca, Proyecto, Sistemas y el laboratorio (F9, F3, F4, F5 y F7); las pantallas de cuenta y «pedir el ingreso» (F11).
- **El contenido de `content/guide/`** (las fuentes).
- **Cualquier cambio** de IDs, de formas guardadas, del formato del archivo o de URL.

**Sin hacer a propósito (YAGNI):**

- un estado de espera en la importación, que sigue siendo local;
- el debounce de la escritura;
- una librería de diálogos o de animación (el formulario de la contraseña usa la librería que instaló F11a);
- un contexto o un provider del progreso;
- memoización;
- capturas de pantalla y pruebas con axe;
- E2E con dos pestañas.

**Actores:**

- quien porta la vista: el usuario y los agentes que implementan;
- quien revisa el PR;
- el agente principal, que integra `main.tsx`, `legacy-views.ts`, `package.json`, las configuraciones y la documentación;
- el alumno, que nota sólo el cambio de «Borrar todo».

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una lectura a confirmar.

| Pedido | Fuente |
| --- | --- |
| Port y no rediseño: se conservan el aspecto, el comportamiento, los textos, el progreso guardado, los IDs y las URL | Usuario, 2026-10-05 (supuesto que no corrigió) |
| Las vistas una por una, las hojas primero y cada raíz de React dentro del shell legacy, como el Atlas | Usuario, 2026-10-05 |
| Antes de portar, E2E con Playwright y Page Objects contra la versión actual; las piezas nuevas llevan Vitest, Testing Library y fishery | Usuario, 2026-10-05; clarify de F1, Q1 |
| La suscripción al progreso con Zustand: `useStore` con un selector chico, nunca con el store entero | Usuario, clarify de F2, 2026-10-06 (Q3); `AGENTS.md` |
| `features/progress-backup` con promesas y una confirmación en «Borrar todo», para que D1c la reemplace sin tocar a quien llama | Usuario, clarify de F2, 2026-10-06 (Q4); spec de F2, FR-052 |
| F8 trae la página y el panel de respaldos; la interfaz de exportar, importar (`#import-file`) y «Borrar todo» con su confirmación; los E2E, con la descarga y la carga de archivo. Borra `renderMethod`, `backupsPanel`, los manejadores de `#export-progress`, `#cancel-reset`, `#confirm-reset` e `#import-file`, el `#confirm-dialog` estático y el `style=` de la página. Conserva el toast del shell hasta F10 | Hoja de ruta, F8 («Entra», «Borra» y «Conserva»). El manejador de `#export-progress` es del shell: ver «El corte en `app.js`» |
| Las notas, `#note-state` y el pedido al tutor van a F8, con Método, que los dibuja; F9 sólo garantiza que siguen por `routeStore` | Usuario, clarify del 2026-10-28 (F9-Q1); ruling C3 del coordinador |
| Lo que existe sólo porque `innerHTML` rehace la vista adopta el comportamiento de React, y los E2E lo fijan; las rarezas de lógica se conservan; los E2E de un cambio aceptado van en el commit en rojo del TDD | Usuario, clarify del 2026-10-28 (X1); coordinador (C2) |
| Las regiones vivas que hoy se recrean quedan montadas | Usuario, clarify del 2026-10-28 (X2) |
| El CSS que sólo usa la página se muda con el port, probado con el barrido de estilo computado y el multiconjunto de F2b. El primero de F3, F4, F8 y F9 que se integre parte los bloques compartidos, y los demás rebasan | Usuario, clarify del 2026-10-28 (X3); coordinador (C3) |
| El diálogo vive dentro de la raíz de la página, con un portal a `body`, y se cierra al navegar | Usuario, clarify del 2026-10-28 (F9-Q4, para la lección de F9 y la confirmación de F7) |
| La sesión es obligatoria desde F11a, que trae el cliente de la API, «pedir el ingreso» y el doble de la API de los E2E | Usuario, clarify del 2026-10-28 (F11-Q1 y R1) |
| «Borrar todo» usa ya el reset del servidor, con la contraseña, y F8 resuelve lo que eso trae | Usuario, clarify del 2026-10-28 (F8-Q1) |
| El armado de `progress-backup` se lleva a `src/app/`; `resetSimulations` y `resetTimer` se retiran si F5 y F9 ya entraron, y si no, los retira el último que entre | Usuario, clarify del 2026-10-28 (F8-Q2) |
| D1c evita el solape de dos «Borrar todo» o importaciones, con la espera visible de la red | Usuario, clarify del 2026-10-28 (F8-Q3) |
| `#note-state` hace lo que haga React, sin excepción a C2 | Usuario, clarify del 2026-10-28 (F8-Q4) |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición propuesta sin aplicarla | Coordinador, 2026-10-28 |
| La documentación va en español; el código y las pruebas, en inglés | `AGENTS.md` |

## Clarifications

### Session 2026-10-28

Las respuestas son del usuario (clarify con brainstorming). Las opciones que no se eligieron, con su costo, están en «Alternativas consideradas». Lo que las respuestas obligan a decidir y nadie contestó va como «lectura a confirmar» (L1 a L12), con su recomendación, en «“Borrar todo” con el reset del servidor» y en «El armado en `src/app/`».

- Q: **Q1**, ¿«Borrar todo» pide la contraseña y usa el reset del servidor de D1b, o se porta el flujo local? → A: Opción C, el reset del servidor ya, con la contraseña (no era la recomendada). F8 resuelve lo que eso trae:
  - la época sin D1c;
  - la contraseña confirmada, con el 423;
  - el tope de tres resets por día y `resetAt`, con las importaciones que vienen después;
  - qué pasa sin servidor;
  - el FR-074 de D1, con las claves v1 locales.

  F8 depende también de F11a y de D1b, y la superficie 4 de D1 queda en F8. (FR-021, FR-022, FR-024, FR-047, FR-048 y FR-049)
- Q: **Q2**, ¿F8 saca de `app.js` el armado de `features/progress-backup`? → A: Opción B, se lleva a `src/app/` (no era la recomendada), y cambia el contrato de `startApp()`. `resetSimulations` y `resetTimer` se retiran si F5 y F9 ya entraron; si no, los retira el último de F5, F8 y F9 que entre. (FR-015, FR-045 y FR-046)
- Q: **Q3**, ¿quién evita que dos «Borrar todo» o dos importaciones se solapen? → A: Opción A, D1c, con la espera visible de la red. Como consecuencia de Q1, el reset deja de ser local, así que F8 muestra la espera de su propio pedido. Eso no es la guarda contra el solape, que sigue siendo de D1c. (FR-025)
- Q: **Q4**, ¿qué dice `#note-state` después de importar y de «Borrar todo»? → A: Opción B, lo que haga React (no era la recomendada): queda el último texto, sin excepción a C2. Su E2E es el tercero en rojo, con los dos del foco. (FR-018 y FR-028)
- Q: **L7**, ¿cómo convive «Borrar todo» con la cláusula del FR-074 de D1 sobre las claves v1 que la cuenta no importó? → A: Rige desde D1c, que la enmienda como F11-Q5 enmendó el FR-070. Hasta entonces, F8 borra las claves v1 como hoy. Decidió el usuario. (FR-049; «“Borrar todo” con el reset del servidor»)

## «Borrar todo» con el reset del servidor (Q1)

**Lo que exige el servidor** (en `master`, `e87772d`):

- **`POST /api/progress/reset`** (`routes/api/progress-reset.php`) exige, en este orden:
  1. sesión, CSRF y la cabecera `X-Taller-User` con el id de la cuenta (`EnsureExpectedAccount`, 409 `account_mismatch`);
  2. la contraseña confirmada en los últimos 900 s (`RequirePassword`, 423 `password_confirmation_required`), que no gasta un reset del día;
  3. 3 por día y cuenta (429 con `Retry-After`);
  4. el cuerpo `{format: 2, epoch}` (`ResetBodyRequest`).

  Si `epoch` no es la vigente, responde 409 `epoch_mismatch` con `{epoch, revision}`, y ese 409 ya gastó uno de los tres.
- **Lo que hace el reset:** sube la época, fija `resetAt` y borra el estado de la cuenta en el servidor. Cancela las ejecuciones activas y conserva los intentos, sus payloads y las importaciones hasta su retención (D1, FR-041 a FR-045; contrato de D1b, §4).
- **`POST /api/auth/confirm-password`** con `{password}` responde 201, o 422 `auth_failed` si la contraseña es incorrecta. Admite 5 por minuto y por usuario (contrato de C3a).
- **`GET /api/progress`** (D1a) responde la foto con `userId`, `epoch` y `revision`, sin `X-Taller-User` y sin el límite de Laravel. Pide email verificado: una cuenta creada por invitación ya lo está. Puede responder 503 `content_not_imported`. A una cuenta sin cabecera le devuelve `epoch` 1, y leer no escribe nada (contrato de D1a, §4).

**El flujo de F8.** El alumno escribe su contraseña en la confirmación y elige «Borrar todo».

1. `POST /api/auth/confirm-password`.
2. `GET /api/progress`, sólo para leer la época.
3. `POST /api/progress/reset` con `{format: 2, epoch}`.
4. Sólo con el 200, el borrado local de hoy: los cuatro almacenes, las simulaciones y el temporizador.
5. El `save()`, el cierre, el estado en blanco y el aviso.

Los tres pedidos van por el cliente de la API de F11a, que pone el CSRF y `X-Taller-User` y maneja el 419 y el 401. El paso del servidor lo arma `src/app/` con ese cliente y con «pedir el ingreso», y se lo pasa a la feature. La feature no importa el cliente ni F11. La página llama a `resetAll({password})`, como previó la interfaz de F2b para D1c.

**Cómo se resuelve cada punto, con su lectura a confirmar:**

| Punto | Qué hace F8 | Lectura a confirmar (recomendación) |
| --- | --- | --- |
| **La época sin D1c** | La lee con `GET /api/progress` justo antes del reset y no la guarda. Antes de D1c la foto es chica: hoy, nada; después de A4, lo que cerraron las ejecuciones. D1a midió 737 474 bytes para una cuenta con los 274 ejercicios | **L1.** Leerla con el `GET` y no adivinarla. La alternativa, mandar la época 1 y reintentar con la del 409, gasta uno de los tres resets del día en cada `epoch_mismatch` |
| **La contraseña** | El diálogo la pide siempre, antes del primer pedido, como «Borrar la cuenta» de F11b (D1, FR-074: «DEBE pedir la contraseña»). Con 422 `auth_failed`, el mensaje del servidor queda en el campo. Con 423 en el reset, el campo vuelve a pedirla con «Confirmá tu contraseña para continuar.» y no se reintenta solo | **L2.** Pedirla siempre y confirmarla primero, como F11b. La alternativa, intentar el reset y pedirla sólo ante el 423, no cumple el «DEBE pedir» de FR-074 |
| **El 401** | Llama a «pedir el ingreso» de F11a sin cerrar el shell. Si entra la misma cuenta, la confirmación sigue abierta, con el campo vacío y sin nada borrado. Si entra otra, el documento se recarga (F11 FR-020) | **L3.** No reintentar solo una operación destructiva: la sesión nueva no tiene la contraseña confirmada, y el alumno vuelve a decidir |
| **El tope de tres por día** | Con el 429 del reset, el diálogo muestra el mensaje del servidor y cuánto falta según `Retry-After`, en horas o minutos, y «Borrar todo» no se puede reenviar antes (F11 FR-021). Un 423 no gasta un reset; un `epoch_mismatch` sí | **L4.** Usar el mensaje del servidor con el tiempo restante, como el resto de los formularios de F11a, sin un texto propio de Método |
| **`resetAt` y las importaciones que siguen** | F8 no importa al servidor: su importación sigue local hasta D1c. El efecto lo ve D1c y su ítem del front: cualquier importación posterior pide confirmación (409 `import_needs_confirmation`, D1 FR-045). Importar el archivo que se exportó antes de borrar se aplica igual, con confirmación (D1, SC-005). El diálogo conserva «Podés exportarlos antes.» | — (consecuencia de D1, sin decisión de F8) |
| **Lo que sobrevive al reset** | El diálogo lo dice, como pide la Q2 de D1 («la pantalla tiene que decirlo»): el historial de ejecuciones y las importaciones quedan en el servidor hasta su retención, y la supresión real es borrar la cuenta | **L8.** Los textos de abajo |
| **`epoch_mismatch`** | Otra pestaña u otro dispositivo de la misma cuenta borró entre la lectura y el reset. No se borra nada local ni se reintenta solo | **L5.** Un texto propio, porque el del servidor promete cargar el estado nuevo, cosa que hace D1c: «Tu progreso de la cuenta se acaba de borrar desde otra pestaña o dispositivo. No se borró nada de este navegador: si querés, volvé a confirmar.» |
| **Sin servidor** | Sin red, un 5xx, un 502 o 504 de Nginx, algo que no es JSON o el 503 `content_not_imported`: no se borra nada local, la confirmación sigue abierta con lo escrito y se puede volver a intentar. «Borrar todo» no está disponible sin conexión (contrato de D1b, §4.2). El resto de la página sigue funcionando | **L6.** El botón no se deshabilita por adelantado: se intenta y se avisa «No pudimos borrar tu progreso: el taller no responde. No se borró nada; probá de nuevo más tarde.» Así no hace falta detectar la conexión, que no es confiable |
| **El FR-074 de D1** | Después del 200, F8 borra las cuatro claves v1 y sus respaldos, como hoy. El FR-074 prohíbe tocar «las claves v1 que la cuenta no importó» y pide limpiar «el espacio de la cuenta». Antes de D1c no hay espacio por cuenta ni importaciones: las claves v1 son el único progreso local, y lo escribe la cuenta que tiene la sesión. Así, la cláusula no se puede cumplir al pie de la letra sin que «Borrar todo» deje de borrar lo que el alumno ve | **L7.** La cláusula de las claves v1 rige desde D1c, que la enmienda como se enmendó el FR-070 por F11-Q5. Hasta entonces, F8 borra las claves v1 y el diálogo dice que borra el progreso de este navegador. No es un riesgo nuevo: desde F11-Q4, «Salir» no toca ese progreso y «Tu cuenta» avisa que vive en el navegador |
| **La espera del pedido (Q3)** | Mientras corren los tres pedidos, «Borrar todo» dice «Borrando…» y queda deshabilitado, el campo queda de sólo lectura, y «Conservar mi avance» y Esc no cierran la confirmación, porque el servidor puede haber borrado ya. Es la espera de su propio pedido, consecuencia de Q1. La guarda general contra el solape sigue siendo de D1c (Q3) | **L9.** No dejar cerrar la confirmación con un pedido en curso; se cierra sola al terminar, con o sin éxito, según la tabla de FR-047 |
| **El foco al abrir** | El campo de la contraseña va antes de los botones, así que el navegador lo enfoca al abrir. Hoy enfoca «Conservar mi avance». Lo fija el E2E | **L12.** El campo antes de los botones, sin `autofocus` |

**Los textos de la confirmación (L8, a confirmar en el PR):**

- el título, como hoy: «¿Borrar tu progreso?»;
- «Se borrarán los pasos, favoritos, notas, campaña, talleres de Sistemas y ejercicios del laboratorio de ambos lenguajes en este navegador y en tu cuenta. Podés exportarlos antes.» (hoy dice «en este navegador», sin «y en tu cuenta»);
- «No se borran el historial de tus ejecuciones ni las copias que importaste: quedan en el servidor el tiempo que dice el aviso de privacidad. Para borrarlos, borrá tu cuenta desde «Tu cuenta».»;
- el campo «Tu contraseña» (`type="password"`, `autocomplete="current-password"`, obligatorio);
- los botones, como hoy: «Conservar mi avance» y «Borrar todo» (que pasa a «Borrando…» mientras espera).

## El armado en `src/app/` (Q2)

**Qué cambia.** Hoy `startApp()` (`frontend/app.js`) arma la única instancia de `progress-backup`. Con Q2 la arma un módulo de `frontend/src/app/`, una vez, después de la compuerta, porque necesita `getContent().guide`. `startApp()` la recibe como parámetro y la usa para «Exportar mi progreso» de la barra lateral, y la página usa la misma.

`app.js` deja de importar `features/progress-backup`, y `app-shell-check`, que empaqueta `app.js` solo, le pasa una instancia hecha con áreas falsas.

**De dónde lee cada área.** El armado toma cada área de donde su dueño la ofrece cuando F8 entra:

- un singleton o la API pública de una página, si ya existe;
- `window`, si no, con los mismos `?.` de hoy.

| Parte | Antes de su port | Después de su port |
| --- | --- | --- |
| Recorrido (`routeStore`) | El singleton de F2a | — |
| Laboratorio (exportar, planificar, aplicar, respaldos y borrar, que también reinicia la sesión del laboratorio) | `window.TallerLab` | La API que deje F7 |
| Campaña y Sistemas (los cinco métodos del respaldo y los sellos derivados) | Los motores de F2a y los `sync` de `window` | Los motores y lo que dejen F5 y F6 |
| Las simulaciones | `window.TallerSystems?.resetSimulations()` | La API pública de `pages/systems` (F5 FR-017 y US5-2) |
| El temporizador | El cierre de `startApp()`, que lo registra en la instancia que recibe | La API pública de la página del Recorrido (F9) |
| El reset del servidor (Q1) | El cliente de la API y «pedir el ingreso» de F11a | — |

**La regla de orden (Q2).** `resetSimulations` y `resetTimer` se retiran de `window` así:

- si F5 o F9 ya entraron, F8 los retira, porque el armado los importa de la API pública de su página;
- si no, los retira el último de F5, F8 y F9 que entre, porque ese es el que deja el armado apuntando a la API pública.

**L11, a confirmar.** Esta spec aplica la misma regla a los demás métodos de `window.Taller*` que sólo lee el armado: los del área `lab` con F7, y los `sync` con F5 y F6. La excepción es un método que otra fuente legacy todavía lee: ése queda hasta que lo deje de leer, o hasta F10. Por ejemplo, `TallerLab.exportState` lo leen los adaptadores de Sistemas y de campaña. La respuesta de Q2 nombró sólo dos métodos; generalizarla evita que el armado lea `window` cuando ya existe la API.

**L10, a confirmar: un límite técnico que el plan resuelve.** R4 de `seams-guard-check` sólo deja que el dueño declarado de cada índice de `entities/*` importe sus valores desde `app/` o desde una fuente legacy (`qa/lib/seams-guard.ts`), para que ningún bundle de los checks termine con un segundo almacén o un segundo motor. El dueño del índice de `entities/guide` es `app.js`. El armado en `src/app/` importa `routeStore` y los motores, así que el plan elige una de tres:

- el armado pasa a ser el dueño de esos índices;
- los recibe de sus dueños;
- R4 se amplía con su motivo.

La recomendación es la que no deje un segundo singleton en ningún bundle de los checks, verificado con `singletons-import.spec.ts`. El armado tampoco puede vivir en `app/boot/`: R4 no deja que un módulo de arranque importe índices. Se carga después de la compuerta, como `app.js`.

## Lecturas de las reglas del clarify

No son decisiones nuevas: es cómo esta spec aplica reglas generales ya decididas. Ya están aplicadas en el texto de abajo, y el usuario las revisa en el PR.

- **X1 y C2: lo que adopta el comportamiento de React.** Hoy, después de una importación exitosa y después de confirmar «Borrar todo», `app.js` llama a `render()`, que rehace la página. El elemento que tenía el foco desaparece y el foco cae al documento. Con React la página no se reconstruye, y eso da dos cambios aceptados, cuyos E2E se escriben con el comportamiento nuevo y van en el commit en rojo:
  - después de importar con éxito, el foco sigue en «Importar una copia»;
  - después de confirmar «Borrar todo», vuelve a «Borrar mi progreso», que abrió la confirmación.

  (FR-019 y FR-023.) La página no se remonta, pero lo que muestra cambia igual: la bitácora muestra las notas que quedaron, el pedido se recalcula y el panel de respaldos se vuelve a leer (después de «Borrar todo» desaparece).
- **C2: las rarezas de lógica se conservan** (tabla de «Método de hoy»). El texto de `#note-state` después de importar y de «Borrar todo» lo decidió Q4: hace lo que haga React, sin excepción.
- **X2: no hay caso en Método.** Método no usa ninguna región viva que se recree:
  - `#toast` es estático y es del shell;
  - `#note-state` es un párrafo sin rol;
  - el diálogo no anuncia.

  F8 no suma ninguna región viva: hacerlo cambiaría lo que anuncia un lector de pantalla. (FR-034. El error del formulario de la contraseña, que trae Q1, sigue la convención de los formularios de F11a.)
- **F9-Q4 aplicada a la confirmación.** El usuario decidió que el diálogo de la lección (F9) y la confirmación del laboratorio (F7) viven dentro de la raíz de su página, con un portal a `body`, y se cierran al navegar. Esta spec aplica lo mismo a la confirmación de «Borrar todo», que hoy es un `<dialog>` estático de `index.html`. (FR-021)
- **X3 y C3: el bloque de 1 150 px también se parte.** El bloque de 590 px y la regla de impresión los nombra el ruling. Método tiene además `.method-grid` dentro de `@media (max-width: 1150px)`, que comparte con la Biblioteca (`.search-wrap`). Ese bloque se parte igual, por el primero que llegue. (FR-037)

## Método de hoy, en `f2b-acum@2b37caf4`

Es el contrato que el port conserva, salvo lo que cambia a propósito (Q1, Q4 y X1). Las funciones son las de `frontend/app.js`, dentro de `startApp()`, salvo que se diga otra cosa.

**Lo que dibuja `renderMethod`, en orden:**

1. **El encabezado** (`.page-heading`): «HACER ESPACIO PARA APRENDER», «Menos inercia. Más curiosidad.» y el párrafo.
2. **Una grilla de dos paneles** (`.method-grid`):
   - «Una sesión de 25 minutos.», con la rutina (03′, 17′ y 05′) y el párrafo «¿Día complicado?…», que lleva el único `style=` de la página: `margin:22px 0 0`;
   - «Aprender con intención.», con cinco consejos.
3. **«Tu bitácora de Rust.»** (o «de Go.», por el idioma activo). Tiene dos campos con etiqueta:
   - `#note-learned`, «Lo que entendí / lo que todavía me cuesta»;
   - `#note-next`, «La próxima vez voy a…».

   Cada uno tiene `maxlength="20000"` y su placeholder. Debajo va `#note-state`.
4. **«Un tutor que te haga pensar.»**: el párrafo, el pedido en `#tutor-prompt` (un `blockquote`) y «Copiar pedido para mi tutor ↗».
5. **«Las fuentes, a mano.»**: las fuentes de `GUIDE_DATA.sources` como enlaces a otra pestaña (`rel="noopener noreferrer"`), cada una con su nota.
6. **«Respaldos de seguridad.»** (`backupsPanel`), sólo si hay alguna ranura `:respaldo`. Cada ranura muestra el área, la clave y el tamaño, con un botón «Descargar».
7. **«Tu progreso te pertenece.»**: el párrafo; «Exportar progreso», «Importar una copia» y «Borrar mi progreso»; y la explicación «Importar combina los pasos y favoritos…».

**Lo que la acompaña en `frontend/src/index.html`:**

- `<dialog id="confirm-dialog" aria-labelledby="confirm-title">`, con «¿Borrar tu progreso?», el párrafo «Se borrarán los pasos…», «Conservar mi avance» (`#cancel-reset`) y «Borrar todo» (`#confirm-reset`, `.button.danger`);
- `<input id="import-file" type="file" accept="application/json,.json" hidden aria-label="Importar archivo de progreso">`.

En la barra lateral, fuera de Método, están `#save-label` y «Exportar mi progreso ↗» (`#export-progress`). `#toast` (`role="status"`, `aria-live="polite"`) es el aviso de todo el taller.

**Lo que hace cada acción hoy:**

| Acción | Qué hace | Aviso |
| --- | --- | --- |
| Escribir en la bitácora (delegado `input`, `data-note`) | En cada tecla: `notes[idioma][campo] = valor`, `save()` (guarda y refresca `#save-label`). Cambia el texto de `#note-state` según si se pudo guardar y recalcula `#tutor-prompt`. No redibuja | — |
| «Copiar pedido para mi tutor» (`copy-prompt`) | `navigator.clipboard.writeText(pedido)` | «Pedido copiado. Pegalo en tu asistente.» |
| … si el portapapeles falla | Un `textarea` temporal fuera de la pantalla y `document.execCommand('copy')` | «Pedido copiado.» |
| … si eso también falla | Selecciona el texto de `#tutor-prompt` | «Texto seleccionado. Usá Copiar en tu navegador.» |
| «Exportar progreso» (`export`) y «Exportar mi progreso» (`#export-progress`) | `progressBackup.exportProgress()` y `downloadBlob` (`shared/lib/download-file.ts`): `taller-progreso-AAAA-MM-DD.json`, `application/json` | «Copia de progreso exportada.» |
| «Descargar» de un respaldo (`download-backup`) | `readBackup(clave)` vuelve a leer la ranura. Si no está, no hace nada; si está, descarga su texto como `<clave con lo que no es [a-z0-9-] cambiado por ->.json` | «Respaldo descargado.» |
| «Importar una copia» (`import`) | `#import-file.click()` abre el selector de archivos | — |
| Elegir un archivo (`change` de `#import-file`) | Sin archivo, nada. Si no, `assertImportSize` (10 MB, antes de leerlo), `planImport(await file.text())`, `await applyImport(plan)`, `updateSaveLabel()`, `render()` y el aviso. En el error, el aviso de `importFailureNotice`. En los dos caminos, al final, `value = ''` | El de la importación, o «No se pudo importar: …» |
| «Borrar mi progreso» (`reset`) | `#confirm-dialog.showModal()` | — |
| «Conservar mi avance» o Esc | Cierra el diálogo; no escribe | — |
| «Borrar todo» (`#confirm-reset`) | `await progressBackup.resetAll()`, que borra en orden el recorrido, el laboratorio, campaña y Sistemas y después corre los pasos de sesión: las simulaciones y el temporizador. Después, `save()`, el cierre del diálogo, `render()` y el aviso. Hoy es sólo local; con Q1 lo precede el reset del servidor | «Progreso reiniciado. Un nuevo comienzo.» o «No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.» |

**El pedido al tutor** (`tutorPrompt`) se arma con:

- el idioma activo («Rust» o «Go»);
- los minutos guardados («Tengo N minutos»);
- la nota «La próxima vez voy a…» del idioma activo, o «elegir un desafío pequeño del recorrido.» si está vacía.

El texto es el de hoy, con sus saltos de línea.

**El estado de la nota** (`#note-state`) tiene dos momentos:

- **Al dibujar la página:** «Tus notas se guardan automáticamente en este navegador.» o, sin almacenamiento, «El guardado no está disponible. Exportá tu avance al terminar.».
- **Después de escribir:** «Guardado. Tu próxima sesión ya tiene un punto de partida.» o, si no se pudo guardar, «No se pudo guardar. Exportá tu avance al terminar.».

**Rarezas de lógica que el port conserva.** Cambiarlas es otro commit, con TDD y con aprobación. Cada una lleva `KNOWN DEFECT` en el nombre de su prueba.

| Rareza | Dónde se ve | Requisito |
| --- | --- | --- |
| Después de «Borrar todo», `save()` vuelve a escribir `taller-learning-v1` con el recorrido en blanco: la clave existe (idioma Rust, 25 minutos, todo vacío) en lugar de quedar ausente | el manejador de `#confirm-reset` | FR-022 |
| «Borrar todo» también devuelve el idioma a Rust: la barra lateral, `body[data-language]` y «Tu bitácora de Rust.» | el recorrido en blanco (`blankRouteProgress`) | FR-022 y FR-033 |
| Sin acceso al almacenamiento, el borrado local avisa «Progreso reiniciado. Un nuevo comienzo.» aunque no había nada que borrar | `resetAll` | FR-022 |
| El tamaño de un respaldo son caracteres sobre 1 024, con un decimal y punto («0.0 KB»), no bytes | `backupsPanel` | FR-020 |

**El estado que la reconstrucción descarta hoy** no está en la tabla: el foco después de importar y de «Borrar todo» y el texto de `#note-state` adoptan el comportamiento de React (X1 y Q4).

## El corte en `app.js`

**Se retira** todo en el commit que monta la página, por la regla de los delegados:

| Qué | Por qué |
| --- | --- |
| `renderMethod`, `backupsPanel`, `tutorPrompt`, `copyPrompt` y `downloadBackup` | Los reemplaza la página |
| En el delegado de clic, las ramas `copy-prompt`, `download-backup`, `export`, `import` y `reset`; en el de entrada, `data-note` (con sus escrituras en `#note-state` y `#tutor-prompt`) | Para no manejar un evento dos veces |
| En `render()`, la rama `metodo: renderMethod` | Pasa a un `mount`, con su `unmount` junto a los otros |
| Los oyentes de `#cancel-reset`, `#confirm-reset` e `#import-file` | La confirmación y la importación son de la página |
| `createProgressBackup` con sus áreas y sus pasos de sesión, y el import de `features/progress-backup` (con `assertImportSize` e `importFailureNotice`) | El armado pasa a `src/app/` (Q2); `startApp()` recibe la instancia |
| En `frontend/src/index.html`, `<dialog id="confirm-dialog">…</dialog>` y `<input id="import-file">` | Pasan a la página (FR-012 y FR-021) |
| En los arneses `qa/lib/app-shell-harness.ts` y `boot-harness.ts`, los ids `confirm-dialog`, `cancel-reset`, `confirm-reset` e `import-file` | Ya no existen en el marcado estático |

**Queda en el shell, con quién lo retira:**

| Qué | Lo retira | Por qué |
| --- | --- | --- |
| `exportProgress` y el oyente de `#export-progress`, con la instancia que recibe `startApp()` | F10 | Es el botón de la barra lateral y funciona en las ocho vistas. El escenario 4 de la US4 de F9 exporta desde ahí. La hoja de ruta lo pone en el «Borra» de F8 por error (hallazgo) |
| El registro del paso del temporizador en la instancia, mientras el temporizador viva en `app.js` | F9 (o F8, si F9 ya entró) | Es la regla de orden de Q2 |
| `routeState`, `save`, `updateSaveLabel`, `toast`, `syncShell`, `languageName`, `render()`, la navegación y el cambio de idioma | F10 | Son del shell |
| `escapeHtml` y el import de `downloadBlob` | `escapeHtml`, cuando lo deje de usar la última página legacy (F3, F4 y F9); `downloadBlob`, F10, con `exportProgress` | Los usan otras páginas legacy y la exportación de la barra lateral |

**El adaptador mínimo.** `window.TallerMethod` (nombre provisional) se publica desde `frontend/src/app/legacy/register-method.tsx` con sólo `mount` y `unmount`, que retira F10. Al montar:

- lee `getContent().guide` y le pasa a la página sus fuentes por props;
- recibe el `toast` del shell y la instancia de `progress-backup` del armado de `src/app/` (el plan elige la forma).

No importa `routeStore` (R4 de `seams-guard-check`): lo importa la página. Se evalúa antes que `app.js` en `legacy-views.ts` y en la tabla de `load-order-check`, y entra en `qa/lib/app-adapters.ts`.

## Qué queda en `window.Taller*` y hasta cuándo

Con Q2, el armado deja `app.js` en F8, y cada método que sólo lee el armado sigue la regla de orden (Q2 y L11).

| Global y métodos | Quién los lee después de F8 | Lo retira |
| --- | --- | --- |
| `TallerMethod.mount` y `unmount` (nuevo) | `app.js:render` | F10 |
| `TallerSystems.resetSimulations` | El armado, mientras Sistemas sea legacy | F8 si F5 ya entró; si no, F5 |
| `TallerRoute.resetTimer` (si F9 entró antes que F8) | El armado no lo lee: importa el reinicio de la API pública de la página | F8 si F9 ya entró; si no, F9, que nunca lo publica |
| `TallerLab.planImport`, `applyImport`, `backups` y `reset` | El área `lab` del armado, mientras el laboratorio sea legacy | El último de F7 y F8 (L11) |
| `TallerLab.exportState` | El área `lab` y los adaptadores de Sistemas y de campaña (y el kit) | F10 (lo leen otras fuentes, como dice la spec de F7) |
| `TallerCampaign.sync` y `TallerSystems.sync` | Los sellos derivados del armado; `lab.js` también los llama hasta F7 | El último de F8 y del port de su dueño (F6 y F5), y no antes de F7 (L11) |
| `TallerCampaignEngine` y `TallerSystemsEngine` | El armado deja de leerlos e importa los motores de F2a (L10); `campaign.js`, `systems.js` y `lab.js` siguen leyéndolos | Con sus lectores legacy, o F10 |

## Qué cambia en `dist/index.html`

| Qué | ¿Cambia? | Por qué |
| --- | --- | --- |
| `dist/content/curriculum.<versión>.json` | No | `content/` y el generador no cambian |
| El marcado de `frontend/src/index.html` | Sí, dos elementos | Salen `<dialog id="confirm-dialog">` y `<input id="import-file">`. Quedan iguales los ids, el menú, los conteos, `#save-label`, `#export-progress` y `#toast` |
| `<style>` | Sí, el orden | Unas 23 reglas de Método salen de `styles.css` y entran, enteras y en el orden de hoy, en la hoja de la página (X3). El conjunto de reglas es el mismo, salvo que la del `style=` pasa a una clase y el campo de la contraseña, si necesita reglas, usa las de los formularios de F11a |
| `<script type="module">` | Sí | Sale código de `app.js`; entran la página, su modelo, el adaptador y el armado. `useStore` de Zustand ya está desde F2a; el cliente de la API y React Hook Form, desde F11a |
| El tamaño | Se informa | No se midió para esta spec: `f2b-acum` no tiene un `dist/`. La spec de F9 midió 1 136 702 caracteres en el `dist` de `f2a`, y el plan de F2b estima +4 266 para toda F2b. El tope de `qa/build-check` (`BOOT_SIZE_LIMIT`) es 1 250 000 |
| Los avisos de licencia | No | Ninguna dependencia de ejecución nueva |

## Cómo se demuestra que nada cambió

| Qué se afirma | Cómo se demuestra | Requisitos |
| --- | --- | --- |
| Los enlaces, las recargas, el arranque, las ocho vistas por hash y las seis formas de URL siguen igual | Los 106 E2E de F1 y los 17 de A2, sin editar | FR-002 |
| Los flujos de Método (bitácora, pedido, exportar, importar y respaldos) | E2E nuevos con un Page Object, en verde contra el legacy antes de portar y sin editar después. Los de los cambios aceptados fijan el comportamiento nuevo | FR-001 y FR-040 |
| «Borrar todo» con el servidor | E2E contra el doble de la API de F11a, escritos en rojo en el commit del cambio de Q1: la secuencia de los tres pedidos, cada respuesta de FR-047 y las claves locales intactas ante cualquier falla | FR-024, FR-040, FR-047 y FR-048 |
| El archivo exportado y lo que acepta la importación | El E2E de la descarga fija el nombre, la sangría, el orden de las claves y el contenido, y el de la carga importa las dos exportaciones congeladas y fija lo guardado. Los dos corren contra el legacy y contra el port. `create-progress-backup.spec` sigue en verde sin editar | FR-016, FR-017 y FR-031 |
| La lógica y los componentes | Specs de Vitest (modelo en `node`, componentes en `jsdom`), con valores escritos a mano desde `content/guide/`, las fixtures y los contratos de C3a, D1a y D1b | FR-039 |
| El DOM y los textos | Una comparación única del HTML del legacy contra la página, sobre una grilla de estados | FR-035 y FR-042 |
| El aspecto | El barrido de estilo computado y el multiconjunto de reglas del dist de la unidad 8 de F2b, con 0 diferencias, también en impresión | FR-036 y FR-037 |
| Lo guardado | Las fixtures congeladas arrancan sin escribir; `storage.watchWrites()` cuenta 0 y 1 escrituras. `route-progress-check`, `versioned-storage-check` y `curriculum-ids-check` siguen en verde | FR-031 y FR-032 |
| El retiro de `app.js` y el armado | `grep` en 0, los checks adaptados con la correspondencia de cada escenario, `seams-guard-check` en 0 violaciones y `singletons-import.spec.ts` en verde | FR-010, FR-041, FR-045 y FR-046 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno escribe su bitácora y copia el pedido al tutor como hoy (Priority: P1)

Un alumno entra a Método, anota lo que entendió y lo que va a hacer la próxima vez, y copia el pedido para su asistente. Con la página nueva no nota ninguna diferencia.

**Why this priority**: es lo que más escribe el alumno en esta página, y es la única escritura por tecla del recorrido; una de más o de menos se nota en el progreso.

**Independent Test**: con el build servido, abrir `#metodo` desde un navegador vacío y desde el progreso congelado de master; escribir, recargar, cambiar de idioma y copiar el pedido con el portapapeles permitido.

**Acceptance Scenarios**:

1. **Dado** un navegador vacío, **cuando** se abre `#metodo`, **entonces** se ve:
   - «Menos inercia. Más curiosidad.» y «Tu bitácora de Rust.» con los dos campos vacíos;
   - `#note-state` con «Tus notas se guardan automáticamente en este navegador.»;
   - un pedido que dice «Estoy aprendiendo Rust», «Tengo 25 minutos» y termina con «Mi próximo paso: elegir un desafío pequeño del recorrido.».
2. **Dado** lo anterior, **cuando** se escribe «test» en «La próxima vez voy a…», **entonces**:
   - `taller-learning-v1` se escribe 4 veces, una por tecla, y al final guarda `notes.rust.next: "test"`;
   - `#note-state` dice «Guardado. Tu próxima sesión ya tiene un punto de partida.»;
   - el pedido termina con «Mi próximo paso: test»;
   - al recargar, el campo sigue con «test».
3. **Dado** el progreso congelado de master (idioma Go, con una nota «Lo que entendí» de Rust), **cuando** se abre `#metodo`, **entonces** se ve «Tu bitácora de Go.» con los campos vacíos, sin escribir ni avisar. Al pasar a Rust desde la barra lateral, «Lo que entendí» muestra «Entendí ownership con un ejemplo propio.».
4. **Dado** el portapapeles permitido, **cuando** se usa «Copiar pedido para mi tutor», **entonces** el portapapeles tiene el texto exacto del pedido, el aviso dice «Pedido copiado. Pegalo en tu asistente.» y no se escribe nada.
5. **Dado** el almacenamiento bloqueado, **cuando** se abre `#metodo` y se escribe una letra, **entonces**:
   - `#note-state` pasa de «El guardado no está disponible. Exportá tu avance al terminar.» a «No se pudo guardar. Exportá tu avance al terminar.»;
   - la barra lateral dice «Exportá para conservar tu avance».

*Cubre: FR-026 a FR-031 y FR-033; SC-001, SC-002 y SC-004.*

---

### User Story 2 - El alumno exporta e importa su progreso como hoy (Priority: P1)

El alumno descarga una copia de su progreso desde Método o desde la barra lateral, y más tarde la importa en otro navegador o en el mismo. El archivo es el de hoy, byte a byte, porque D1b lo importa tal cual en el servidor.

**Why this priority**: es el único camino del alumno para mover su progreso antes de D1c, y el formato es contrato con D1b (`source: export`).

**Independent Test**: con `page.clock` fijo, exportar desde las dos entradas y leer el archivo descargado; importar por el selector de archivos las dos exportaciones congeladas y los archivos inválidos.

**Acceptance Scenarios**:

1. **Dado** el progreso congelado de master y el reloj en 2026-03-04T05:06:07Z, **cuando** se usa «Exportar progreso», **entonces**:
   - se descarga `taller-progreso-2026-03-04.json`;
   - su texto es el JSON con dos espacios de sangría y las claves en este orden: `version`, `language`, `completed`, `milestones`, `favorites`, `quizAnswers`, `notes`, `minutes`, `lab`, `campaign`, `systems` y `exportedAt` (`"2026-03-04T05:06:07.000Z"`);
   - su contenido es el de la fixture sembrada;
   - el aviso dice «Copia de progreso exportada.»;
   - no se escribe nada.
2. **Dado** lo mismo, **cuando** se exporta desde «Exportar mi progreso» de la barra lateral con `#recorrido` abierto, **entonces** el archivo tiene los mismos bytes y el mismo aviso.
3. **Dado** un navegador vacío, **cuando** se usa «Importar una copia» y se elige `qa/fixtures/progress-master-2a278ad-export.json` en el selector, **entonces**:
   - el aviso dice «Copia importada y combinada con tu avance actual.»;
   - el idioma sigue siendo Rust;
   - «Lo que entendí» muestra «Entendí ownership con un ejemplo propio.»;
   - la barra lateral dice «2 de 12»;
   - las claves guardadas tienen los pasos, las notas y los registros del laboratorio de la copia.

   Lo mismo vale para `progress-d0e1b49-export.json`, con sus propios valores.
4. **Dado** lo anterior, **cuando** se elige otra vez el mismo archivo, **entonces** se importa de nuevo (el selector se vació) y el aviso vuelve a salir.
5. **Dado** un archivo con JSON roto, uno de más de 10 MB y una copia con `version: 2`, **cuando** se elige cada uno, **entonces** el aviso es, respectivamente:
   - «No se pudo importar: el archivo no contiene JSON válido.»;
   - «No se pudo importar: El archivo supera el tamaño permitido (10 MB).», sin leer el archivo;
   - «No se pudo importar: Formato de progreso no compatible.».

   En ninguno de los tres se escribe nada.
6. **Dado** que el alumno escribió una nota y `#note-state` dice «Guardado. Tu próxima sesión ya tiene un punto de partida.», **cuando** termina una importación exitosa, **entonces** pasa esto, y son dos cambios aceptados (hoy el foco cae al documento y el párrafo vuelve a su texto inicial):
   - el foco sigue en «Importar una copia» (X1);
   - `#note-state` conserva ese último texto (Q4).

*Cubre: FR-013, FR-016 a FR-019, FR-028 y FR-031 a FR-033; SC-002 y SC-003.*

---

### User Story 3 - «Borrar todo» pide la contraseña y borra el progreso de la cuenta y del navegador (Priority: P1)

El alumno quiere empezar de cero. Abre la confirmación, puede arrepentirse y, si escribe su contraseña y confirma, se borra su progreso en el servidor y en este navegador. Si el servidor no confirma, no se borra nada.

**Why this priority**: es la acción más destructiva del taller, toca los cuatro almacenes, las sesiones de otras vistas y ahora la cuenta. Una falla a medias (borrar lo local sin el servidor) haría perder el progreso sin propagarse.

**Independent Test**: con el doble de la API de F11a, el progreso congelado de master y una ranura de respaldo sembrada:

- abrir la confirmación y cancelarla por botón y por Esc;
- confirmar con la contraseña correcta y revisar los pedidos, el almacenamiento, la barra lateral, la página y el foco;
- repetir con cada respuesta de error de FR-047.

**Acceptance Scenarios**:

1. **Dado** `#metodo`, **cuando** se usa «Borrar mi progreso», **entonces** se abre un diálogo modal nombrado «¿Borrar tu progreso?». Muestra los textos de L8, el campo «Tu contraseña», «Conservar mi avance» y «Borrar todo», y el foco queda en el campo de la contraseña (L12; lo fija el E2E).
2. **Dado** el diálogo abierto, **cuando** se cierra con «Conservar mi avance» o con Esc, **entonces**:
   - no sale ningún pedido y no se escribe nada;
   - el foco queda donde lo devuelve hoy el navegador al cerrar un `<dialog>` modal (se espera «Borrar mi progreso»; lo fija el E2E contra el legacy).
3. **Dado** el diálogo abierto, **cuando** el alumno usa Tab y Mayús+Tab, **entonces** el foco no sale del diálogo; un clic en el fondo no lo cierra.
4. **Dado** el progreso congelado de master, una ranura `:respaldo` y la contraseña correcta, **cuando** se confirma «Borrar todo», **entonces**:
   - salen, en este orden, `POST /api/auth/confirm-password`, `GET /api/progress` y `POST /api/progress/reset` con `{format: 2, epoch}` (la época del `GET`), `X-Taller-User` y `X-XSRF-TOKEN`;
   - mientras esperan, el botón dice «Borrando…»;
   - con el 200, el aviso dice «Progreso reiniciado. Un nuevo comienzo.»;
   - `taller-laboratorio-v1`, `taller-campaign-v1`, `taller-systems-v1` y todas las ranuras `:respaldo` quedan borradas;
   - `taller-learning-v1` queda escrita con el recorrido en blanco (idioma Rust, 25 minutos; `KNOWN DEFECT`, FR-022);
   - la página muestra «Tu bitácora de Rust.» con los campos vacíos y sin el panel de respaldos;
   - la barra lateral dice «RUST» y «0 de 12».
5. **Dado** lo anterior, **cuando** se cierra el diálogo, **entonces** el foco vuelve a «Borrar mi progreso» (cambio aceptado por X1: hoy cae al documento).
6. **Dado** una contraseña incorrecta (422 `auth_failed`), **cuando** se confirma, **entonces**:
   - el diálogo sigue abierto, con el mensaje del servidor en el campo;
   - no salen ni el `GET` ni el reset;
   - las cuatro claves y sus respaldos siguen intactos.
7. **Dado** el servidor caído (sin red o 5xx), un 429 del reset y un 423 del reset, **cuando** se confirma en cada caso, **entonces** las claves locales siguen intactas. El diálogo muestra, respectivamente:
   - «No pudimos borrar tu progreso: el taller no responde. No se borró nada; probá de nuevo más tarde.»;
   - el mensaje del servidor con cuánto falta, sin dejar reenviar antes;
   - el pedido de la contraseña otra vez.
8. **Dado** un 401 en cualquiera de los tres pedidos, **cuando** se confirma, **entonces** se pide el ingreso. Si entra la misma cuenta, la confirmación sigue abierta, con el campo vacío y nada borrado; si entra otra, el documento se recarga.
9. **Dado** un motor local que no pudo borrar su clave después del 200, **cuando** termina, **entonces** el aviso dice «No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.» (spec de componente con un doble de `ProgressBackup`; en el navegador no se puede provocar).

*Cubre: FR-021 a FR-025, FR-032, FR-033 y FR-047 a FR-049; SC-002, SC-004 y SC-013.*

---

### User Story 4 - El alumno descarga los respaldos de seguridad como hoy (Priority: P2)

Cuando el taller no pudo leer parte del progreso, guardó el texto original en una ranura `:respaldo`. El alumno lo ve en Método y lo descarga antes de borrar.

**Why this priority**: es la red del ADR 0003. Aparece poco, pero cuando aparece es lo único que conserva el texto original.

**Independent Test**: sembrar `taller-campaign-v1` ilegible, arrancar, abrir `#metodo`, descargar, cambiar la ranura y volver a descargar.

**Acceptance Scenarios**:

1. **Dado** un `taller-campaign-v1` ilegible al arrancar, **cuando** se abre `#metodo`, **entonces** aparece «Respaldos de seguridad.» antes de «Tu progreso te pertenece.», con «campaña · taller-campaign-v1:respaldo · 0.0 KB» y un botón «Descargar» cuyo nombre accesible es «Descargar respaldo de campaña: taller-campaign-v1:respaldo».
2. **Dado** lo anterior, **cuando** se usa «Descargar», **entonces**:
   - se descarga `taller-campaign-v1-respaldo.json` con el texto exacto de la ranura;
   - el aviso dice «Respaldo descargado.»;
   - no se escribe nada.
3. **Dado** que la ranura cambió después de dibujar la página, **cuando** se usa «Descargar», **entonces** el archivo trae el texto nuevo.
4. **Dado** un navegador sin ranuras, **cuando** se abre `#metodo`, **entonces** no aparece el panel.

*Cubre: FR-020; SC-002.*

---

### User Story 5 - Lo guardado y el formato no cambian (Priority: P1)

El progreso se guarda como hoy, el archivo exportado es el de hoy y D1 lo puede importar sin que la página lo note.

**Why this priority**: es el contrato del ADR 0003 y el de D1b. Una escritura de más, una nota copiada o un byte distinto en el archivo hacen perder avances o rompen la importación en el servidor.

**Independent Test**: con `storage.watchWrites()`, abrir Método con las fixtures congeladas y repetir cada acción de FR-032.

**Acceptance Scenarios**:

1. **Dado** las cuatro claves del progreso real de master, **cuando** se abre Método, se copia el pedido, se exporta, se abre y se cancela la confirmación y se navega a otra vista y de vuelta, **entonces** no hay escrituras, ni claves `:respaldo` nuevas, ni avisos.
2. **Dado** cada tecla en la bitácora, **cuando** se escribe, **entonces** `taller-learning-v1` se escribe exactamente una vez, con las mismas claves y en el mismo orden de hoy, y se relee sin pérdida.
3. **Dado** una nota importada con HTML (`<img src=x onerror=alert(1)>`), **cuando** se muestra en la bitácora y en el pedido, **entonces** se ve como texto y no se ejecuta nada.

*Cubre: FR-016, FR-031 y FR-032; SC-003 y SC-004.*

---

### User Story 6 - `app.js` pierde Método y el armado, la barra lateral sigue exportando y los ports se integran de a uno (Priority: P2)

Quien mantiene el front encuentra Método en una página con su modelo y sus pruebas, el armado de `progress-backup` en `src/app/` y `app.js` sin lo suyo. Quien integra F3, F4, F5, F7, F9 y F11a sabe qué toca cada uno.

**Why this priority**: deja el camino libre a F10, pero no cambia nada para el alumno.

**Independent Test**: `grep` sobre `frontend/app.js` y `frontend/src/index.html`, `seams-guard-check`, `singletons-import.spec.ts`, `load-order-check`, `boot-check` y `app-shell-check` con el adaptador y el contrato nuevo de `startApp()`, y la tabla de correspondencia de escenarios.

**Acceptance Scenarios**:

1. **Dado** `frontend/app.js` después del port, **cuando** se buscan los términos de FR-010, **entonces** no hay ninguna aparición, y `exportProgress` y el oyente de `#export-progress` siguen.
2. **Dado** cada una de las ocho vistas, **cuando** se usa «Exportar mi progreso» de la barra lateral, **entonces** se descarga la copia con el aviso de hoy, desde la misma instancia que usa la página.
3. **Dado** el adaptador, **cuando** se evalúa sin llamar a `startApp()`, **entonces** no toca el almacenamiento, no registra oyentes ni intervalos y publica sólo `mount` y `unmount`.
4. **Dado** que F5 o F9 entraron antes que F8, **cuando** se lista `window.TallerSystems` o `window.TallerRoute`, **entonces** `resetSimulations` o `resetTimer` ya no están, y «Borrar todo» igual reinicia las simulaciones y el temporizador (FR-045).
5. **Dado** cada escenario de `app-shell-check` o de `boot-check` que cambia, **cuando** se lee la tabla del PR, **entonces** figura cubierto por una spec o un E2E, o descartado con su motivo, y el orden de los efectos de «Borrar todo» sigue afirmado por algún check.

*Cubre: FR-010 a FR-015, FR-041, FR-043 a FR-046; SC-006 y SC-010.*

---

### Edge Cases

- **Almacenamiento bloqueado:** la página funciona.
  - La bitácora vive en memoria hasta recargar.
  - Exportar descarga el estado en memoria.
  - Importar aplica en memoria y avisa «Copia importada en esta sesión, pero no se pudo guardar: … Exportá tu avance para conservarlo.».
  - «Borrar todo» hace el reset del servidor y el borrado local avisa éxito (rareza).
- **Almacenamiento que lee pero no escribe:** la primera tecla cambia `#note-state` a «No se pudo guardar…» y el pie a «Exportá para conservar tu avance».
- **Entrar directo a `#metodo` y borrar todo:** ni el Recorrido, ni Sistemas, ni el laboratorio se montaron. Sus pasos de sesión no lanzan: es el contrato de sus dueños (F9 FR-031, F5 FR-017 y F7 FR-021), y hoy también vale.
- **Una ejecución en curso en el servidor** (después de A4): el reset la cancela (contrato de D1b, §4.2). Una ejecución en curso en el navegador la aborta el `reset` del laboratorio (F7 FR-021).
- **Una cuenta sin email verificado:** `GET /api/progress` responde 403 `email_unverified` y el diálogo muestra el mensaje del servidor sin borrar nada. Una cuenta creada por invitación nace verificada.
- **La sesión vence con la confirmación abierta:** el próximo pedido recibe 401, o 419 si cambió el token; se sigue FR-047.
- **Dos pestañas, dos cuentas:** la vieja recibe 409 `account_mismatch` al confirmar o al borrar, muestra el mensaje del servidor con «Recargar» y no borra nada.
- **Otra pestaña o dispositivo borró entre el `GET` y el reset:** 409 `epoch_mismatch`, el texto de L5, nada local borrado.
- **El servidor borró, pero un almacén local no:** el aviso de fallo de hoy. Volver a intentarlo hace otro reset del servidor y gasta otro de los tres del día.
- **Se cancela el selector de archivos:** no hay archivo y no pasa nada.
- **Cambiar de idioma con Método abierto:** el shell remonta la página como hoy, con la bitácora del otro idioma y `#note-state` en su texto inicial.
- **Atrás o Adelante con la confirmación abierta:** hoy sigue abierta sobre la vista nueva; ahora se cierra con la página (F9-Q4, «Lecturas»). Con un pedido en curso, la respuesta se descarta en la página desmontada, y lo que hizo el servidor ya está hecho. Ese caso queda sin E2E, como el de la lección en F9.
- **Otra pestaña guardó entre dos teclas:** `routeStore.save()` fusiona y el estado vivo puede cambiar de objeto. La página lo vuelve a leer en cada render y en cada manejador, y no escucha el evento `storage`, como hoy.
- **Una nota de 20 000 caracteres:** el campo no deja escribir más, como hoy.
- **El portapapeles negado y `execCommand` sin efecto:** el pedido queda seleccionado y el aviso lo dice.
- **Fuentes o notas con HTML:** se muestran como texto, nunca como marcado (hoy las escapa `escapeHtml`).
- **Una importación y un «Borrar todo» a la vez, o dos pestañas borrando:** la confirmación no deja reenviar mientras espera; la guarda general es de D1c (Q3).
- **El contenido no llega (A2):** la página no se monta; la compuerta muestra su error.
- **Imprimir:** los botones de datos (`.data-actions`) no se imprimen, como hoy.

## Requirements *(mandatory)*

### Functional Requirements

Los IDs no se renumeraron después del clarify: FR-045 a FR-049 son nuevos y van en la sección que les toca.

**Reglas de todo port** *(salen de la hoja de ruta y de la spec de F2)*

- **FR-001**: El PR DEBE abrir con los E2E de comportamiento de Método (US1, US2, US4 y US5, y el «Borrar todo» local de hoy), escritos con un Page Object contra la vista legacy y en verde antes de portar. Esos E2E DEBEN pasar sin editarse sobre la página nueva, salvo los de lo que cambia a propósito:
  - los tres de React (el foco después de importar y después de «Borrar todo», FR-019 y FR-023, y `#note-state`, FR-028) se escriben con el comportamiento nuevo, fallan contra el legacy por esa razón y van en el commit en rojo del TDD;
  - los de «Borrar todo» con el servidor (Q1) cambian a propósito en su propio commit, después del port: primero en rojo contra el borrado local, después la implementación.

  Si hay que editar cualquier otro, es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario. *(Hoja de ruta, «E2E primero» y «Un PR por vista»; ADR 0008, §3; clarify de F1, Q1; X1; Q1 y Q4)*
- **FR-002**: Los 106 E2E de F1 y los 17 de A2 DEBEN pasar sin editarse con el build de F8. *(Hoja de ruta, criterios de aceptación globales)*
- **FR-003**: F8 NO DEBE agregar dependencias de ejecución. El formulario de la contraseña usa React Hook Form, que instala F11a (F11 FR-024). Tampoco DEBE agregar estilos en línea (`style=`, `setAttribute('style', …)` ni `style.cssText`), salvo la excepción declarada de FR-036, que ya existe hoy. Las dependencias de desarrollo que piden la primera spec de componente (`jsdom` y Testing Library) y la primera factory (`fishery`) entran sólo con el permiso del usuario, con su peso medido, y sólo si ningún ítem anterior las instaló. *(`AGENTS.md`; hoja de ruta, «Acciones del usuario»)*
- **FR-004**: `dist/index.html` DEBE conservar la forma que fija A2: un solo documento, con un script y un estilo en línea, y el contenido en su propio archivo. DEBE quedar bajo el tope de `qa/build-check` (`BOOT_SIZE_LIMIT`, 1 250 000 caracteres), y el PR informa su tamaño antes y después.
- **FR-005**: Ninguna función nueva DEBE superar 10 de complejidad sin justificarlo en la revisión, y el total de avisos de `npm run lint` no sube. *(Hoja de ruta, criterios globales; `docs/architecture.md`)*
- **FR-006**: F8 DEBE entregarse como un solo PR que se puede revertir entero y devuelve la vista legacy con la red de F1 en verde: `renderMethod`, el diálogo y el selector estáticos y sus oyentes, el borrado local y el armado en `app.js`. Cada cambio de comportamiento DEBE empezar con una spec que falla por la razón esperada. *(Hoja de ruta, «Un PR por vista»; constitución, principio II)*

**Alcance y retiro**

- **FR-007**: La página DEBE dibujar lo que hoy dibuja `renderMethod`, con `backupsPanel`, en el orden de «Método de hoy». También DEBE dibujar la confirmación de «Borrar todo», con la contraseña (FR-021), y el selector de archivo oculto, que hoy están en `index.html`.
- **FR-008**: La página DEBE montarse con una raíz de React sobre `#main`, como el Atlas: `app.js` la desmonta junto con las otras vistas antes de escribir `#main` y la monta cuando la vista es `metodo`. Cuando `mount` vuelve, la página ya está dibujada. Si la página lanza al dibujarse, el adaptador lo registra con `console.error` y un mensaje en español, como el del Atlas.
- **FR-009**: La página DEBE recibir las fuentes de la guía por props desde su adaptador, que las lee de `getContent().guide` al montar. NO DEBE leer `window` ni importar `getContent()`. *(Spec de F2, FR-015; A2, F2-I6)*
- **FR-010**: DEBE salir de `app.js` todo lo que dice «Se retira» en «El corte en `app.js`». `frontend/app.js` NO DEBE contener `renderMethod`, `backupsPanel`, `tutorPrompt`, `copyPrompt`, `downloadBackup`, `createProgressBackup`, `features/progress-backup`, `confirm-dialog`, `cancel-reset`, `confirm-reset`, `import-file`, `data-note`, `copy-prompt` ni `download-backup`. Lo que dice «Queda en el shell» se conserva.
- **FR-011**: Las ramas de Método en los delegados de `#main` y los oyentes de `#cancel-reset`, `#confirm-reset` e `#import-file` DEBEN salir en el mismo commit que monta la página, para no manejar un evento dos veces. *(Hoja de ruta, reglas de todo port)*
- **FR-012**: `<dialog id="confirm-dialog">` e `<input id="import-file">` DEBEN salir de `frontend/src/index.html`. El resto del marcado estático NO DEBE cambiar.
- **FR-013**: «Exportar mi progreso» de la barra lateral DEBE seguir funcionando en las ocho vistas, con el mismo archivo y el mismo aviso. Su oyente y `exportProgress` se quedan en `app.js` hasta F10, con la instancia que recibe `startApp()`. «Exportar progreso» de la página DEBE producir el mismo archivo y el mismo aviso, sin una segunda copia de cómo se arma y se descarga el archivo; el plan elige cómo lo comparten.
- **FR-014**: El adaptador mínimo DEBE ser `window.TallerMethod` (nombre provisional), publicado desde `frontend/src/app/legacy/`, con sólo `mount` y `unmount`, que retira F10.
  - DEBE evaluarse antes que `app.js` en `legacy-views.ts` y quedar fijado en la tabla de `load-order-check`.
  - `qa/lib/app-adapters.ts` DEBE sumar sus métodos.
  - Evaluarlo NO DEBE tocar el almacenamiento, abrir un almacén, registrar oyentes ni crear intervalos.
  - NO DEBE importar `routeStore` (R4 de `seams-guard-check`).

  *(Spec de F2, FR-021; A2, F2-I1 y F2-I4)*
- **FR-015**: *(Q2)* El armado de `features/progress-backup` DEBE vivir en un módulo de `frontend/src/app/`, fuera de `app/boot/`. Crea una sola instancia después de la compuerta, con `getContent().guide`.
  - Cada área sale de donde su dueño la ofrece cuando F8 entra: un singleton o la API pública de una página si existe, y `window` si no (tabla de «El armado en `src/app/`»).
  - El paso del servidor (Q1) sale del cliente de la API y de «pedir el ingreso» de F11a.
  - La reciben `startApp()` y la página, y nadie DEBE crear otra.
  - La feature NO DEBE importar vistas, el cliente de la API ni F11, ni leer `window` (spec de F2, FR-051).
  - Ningún bundle de los checks DEBE terminar con un segundo almacén o un segundo motor; `singletons-import.spec.ts` y `seams-guard-check` lo verifican (L10).
- **FR-045**: *(Q2)* `resetSimulations` y `resetTimer` DEBEN salir de `window` según la regla de orden:
  - si F5 o F9 ya entraron cuando entra F8, F8 hace que el armado importe el reinicio de la API pública de su página y lo retira del adaptador;
  - si no, lo retira el último de F5, F8 y F9 que entre;
  - mientras el temporizador viva en `app.js`, `startApp()` registra su paso de sesión en la instancia que recibe;
  - el orden de los pasos no cambia: primero las simulaciones y después el temporizador, siempre después de los cuatro almacenes.

  La misma regla vale para los demás métodos que sólo lee el armado, salvo los que otra fuente legacy todavía lee (L11, tabla «Qué queda en `window.Taller*`»).
- **FR-046**: *(Q2)* `startApp()` DEBE recibir la instancia de `progress-backup` como parámetro: es el contrato nuevo, y `legacy-views.ts` se la pasa. `app.js` NO DEBE importar `features/progress-backup`. Los checks que llaman a `startApp()` DEBEN pasarle una instancia sin cambiar sus valores esperados: `app-shell-check` (con áreas falsas), `boot-check` (con la real) y las specs de arranque de A2. El PR DEBE informar a A2 y a F10 el contrato nuevo.

**Exportar, importar y respaldos**

- **FR-016**: Exportar DEBE descargar lo que devuelve `exportProgress()` de la feature, sin cambiar un byte:
  - el nombre `taller-progreso-AAAA-MM-DD.json`;
  - el tipo `application/json`;
  - el JSON con dos espacios y el orden de claves de hoy.

  Después DEBE mostrar «Copia de progreso exportada.». El formato es contrato con D1b, que lo importa como `source: export`. *(ADR 0003; contrato de D1b, §3.2)*
- **FR-017**: Importar DEBE seguir el flujo de hoy, que sigue siendo local hasta D1c:
  - «Importar una copia» abre el selector de un campo de archivo oculto, con el mismo `accept` (`application/json,.json`) y el mismo nombre accesible;
  - sin archivo, no pasa nada;
  - el tamaño se comprueba antes de leer (`assertImportSize`);
  - el texto del archivo llega sin tocar a `planImport` (sin recortar ni recodificar), y después se espera `applyImport`;
  - el aviso es el de la importación o, en un error, el de `importFailureNotice`;
  - en los dos caminos, el campo se vacía al final, para que el mismo archivo se pueda volver a elegir.

  *(Spec de F2, FR-049 y FR-050)*
- **FR-018**: *(Q4)* Después de una importación exitosa, sin remontarse, la página DEBE mostrar el estado nuevo: las notas que quedaron en la bitácora, el pedido recalculado y el panel de respaldos vuelto a leer. `#note-state` conserva el texto que tenía.
- **FR-019**: Después de una importación exitosa, el foco DEBE seguir en «Importar una copia». Es un cambio aceptado: hoy la página se reconstruye y el foco cae al documento. Su E2E se escribe con el comportamiento nuevo (FR-001). Se espera que siga donde lo dejó el clic, porque abrir el selector no lo mueve; nadie lo verificó todavía. Si el navegador lo mueve al cerrar el selector, la página lo devuelve al botón. *(X1 y C2)*
- **FR-020**: El panel de respaldos DEBE seguir las reglas de hoy:
  - aparece sólo si hay ranuras, antes de «Tu progreso te pertenece.»;
  - cada ranura muestra «área · clave · N.N KB» (caracteres sobre 1 024, con un decimal; rareza) y un botón «Descargar» con el nombre accesible «Descargar respaldo de <área>: <clave>»;
  - el clic vuelve a leer la ranura (`readBackup`): si ya no está, no hace nada; si está, descarga su texto actual con el nombre de hoy y avisa «Respaldo descargado.».

  Después de «Borrar todo», el panel desaparece.

**«Borrar todo»**

- **FR-021**: *(Q1)* La confirmación DEBE ser un `<dialog>` nativo y modal (`showModal()`), con lo siguiente:
  - nombrado por su título (`aria-labelledby`), con las clases y el orden de botones de hoy;
  - los textos de L8 y el campo «Tu contraseña» (`type="password"`, `autocomplete="current-password"`, obligatorio), antes de los botones y armado con React Hook Form, como los formularios de F11a (F11 FR-024 y FR-025);
  - lo abre «Borrar mi progreso», y al abrir, el foco queda donde lo pone el navegador (se espera el campo de la contraseña, L12; la página no agrega `autofocus`);
  - sin un pedido en curso, «Conservar mi avance» y Esc la cierran sin pedidos ni escrituras, y el foco queda donde lo devuelve hoy el navegador (se espera «Borrar mi progreso»; lo fija el E2E contra el legacy);
  - el clic en el fondo NO la cierra;
  - el estado de React NO DEBE desincronizarse del diálogo nativo.

  DEBE vivir dentro de la raíz de la página, con un portal a `document.body`, y cerrarse con ella al desmontarse, también si el alumno navega. *(F9-Q4, aplicada en «Lecturas»; D1, FR-074)*
- **FR-022**: *(Q1)* Al confirmar, la página DEBE llamar a `resetAll({password})` y la instancia DEBE hacer, en este orden:
  1. `POST /api/auth/confirm-password` con la contraseña escrita;
  2. `GET /api/progress`, para leer la época;
  3. `POST /api/progress/reset` con `{format: 2, epoch}`;
  4. sólo con el 200, el borrado local de hoy: el recorrido, el laboratorio, campaña, Sistemas, las simulaciones y el temporizador.

  Después, la página DEBE:
  1. llamar a `routeStore.save()`, que vuelve a escribir el recorrido en blanco (rareza);
  2. cerrar el diálogo;
  3. mostrar el estado en blanco (la bitácora de Rust vacía y sin el panel de respaldos), sin remontarse;
  4. avisar con el texto del borrado local: el de éxito o el de fallo de hoy.

  *(Plan de F2b, §4.0, «El orden de los efectos»; contrato de D1b, §4)*
- **FR-023**: Después de confirmar con éxito, el foco DEBE volver a «Borrar mi progreso». Es un cambio aceptado: hoy la página se reconstruye y el foco cae al documento. Su E2E se escribe con el comportamiento nuevo (FR-001).
  - Se espera que lo haga el navegador al cerrar el `<dialog>` modal, porque el botón que lo abrió sigue en el documento. Nadie lo verificó todavía.
  - Si el E2E contra el legacy muestra que el navegador no devuelve el foco al cerrar, la página lo devuelve explícitamente a «Borrar mi progreso» después de confirmar.
  - El camino de cancelar queda como lo fije su E2E contra el legacy (FR-021).

  *(X1 y C2)*
- **FR-024**: *(Q1)* «Borrar todo» DEBE pedir la contraseña y usar el reset de D1b, con los tres pedidos de FR-022 hechos por el cliente de la API de F11a, que pone `X-XSRF-TOKEN` y `X-Taller-User` y renueva una vez ante un 419 (F11 FR-016 a FR-018).
  - La época sale del `GET` inmediatamente anterior, y NO DEBE guardarse ni adivinarse (L1).
  - El paso del servidor llega a la feature desde el armado (FR-015), y la página no llama a la API.
  - NO DEBE borrarse nada local si el servidor no respondió 200 al reset.
- **FR-047**: *(Q1)* Cada respuesta del servidor DEBE tener este efecto. Salvo el 200 del reset, ninguna borra nada local.

  | Respuesta | Pedido | Qué hace la confirmación |
  | --- | --- | --- |
  | 422 `auth_failed` | confirmar | Sigue abierta, con el mensaje del servidor en el campo de la contraseña (L2) |
  | 423 `password_confirmation_required` | reset | Sigue abierta y vuelve a pedir la contraseña con el mensaje del servidor, sin reintentar sola (L2) |
  | 429 | confirmar o reset | El mensaje del servidor y cuánto falta según `Retry-After`; «Borrar todo» no se puede reenviar antes (F11 FR-021; L4) |
  | 401 | cualquiera | «Pedir el ingreso». Con la misma cuenta, sigue abierta con el campo vacío y sin reintentar; con otra, el documento se recarga (F11 FR-020; L3) |
  | 409 `account_mismatch` | confirmar o reset | El mensaje del servidor con «Recargar» (F11 FR-019) |
  | 409 `epoch_mismatch` | reset | El texto de L5, sin reintentar |
  | 409 `client_outdated` | reset | El mensaje del servidor con «Recargar» |
  | 403 `account_disabled` o `email_unverified` | cualquiera | El mensaje del servidor; con la cuenta deshabilitada, vuelve al acceso (F11 FR-023) |

  Los mensajes se muestran en la confirmación como los errores de los formularios de F11a, con `aria-invalid` en el campo y `role="alert"` en el error general.
- **FR-048**: *(Q1)* Sin servidor, «Borrar todo» NO DEBE borrar nada local: sin red, un 5xx, un 502 o 504 de Nginx, una respuesta que no es JSON o el 503 `content_not_imported`, en cualquiera de los tres pedidos. La confirmación sigue abierta con lo escrito y muestra «No pudimos borrar tu progreso: el taller no responde. No se borró nada; probá de nuevo más tarde.» (L6). El botón NO DEBE deshabilitarse por adelantado. El resto de la página sigue funcionando sin servidor. *(Contrato de D1b, §4.2; F11 FR-022)*
- **FR-049**: *(Q1)* Después del 200 del reset, el borrado local DEBE ser el de hoy: las cuatro claves v1 y sus respaldos, más los pasos de sesión.
  - La cláusula del FR-074 de D1 que prohíbe tocar «las claves v1 que la cuenta no importó» no se puede cumplir antes de D1c sin que «Borrar todo» deje de borrar lo que el alumno ve: no hay espacio por cuenta ni importaciones, y la cuenta con sesión escribe esas claves.
  - Esta spec la lee como vigente desde D1c, que la enmienda (L7).
  - El diálogo dice que borra el progreso «en este navegador y en tu cuenta» (L8).
- **FR-025**: *(Q3, consecuencia de Q1)* Mientras corren los pedidos de FR-022, la confirmación DEBE mostrar la espera de su propio pedido:
  - «Borrar todo» dice «Borrando…» y queda deshabilitado;
  - el campo queda de sólo lectura;
  - «Conservar mi avance» y Esc no la cierran (L9).

  Al terminar, sigue la tabla de FR-047, o FR-022 con el éxito. F8 NO DEBE agregar una guarda general contra el solape de una importación con un «Borrar todo», ni entre pestañas: es de D1c (Q3). La importación, que sigue siendo local, no muestra espera.

**La bitácora y el pedido al tutor**

- **FR-026**: La bitácora DEBE mostrar las notas del idioma activo en «Tu bitácora de Rust.» (o «de Go.»), con los dos campos de hoy: ids, etiquetas, `maxlength="20000"` y placeholders. Los valores salen de `routeStore`.
- **FR-027**: Cada tecla en un campo de la bitácora DEBE asignar el valor a `notes[idioma activo][campo]` y hacer una sola llamada a `routeStore.save()`, sin debounce, sin tocar las notas del otro idioma ni del otro campo, y sin otra instancia ni otra clave. *(Spec de F2, FR-026; hoja de ruta, reglas de todo port)*
- **FR-028**: *(Q4)* `#note-state` DEBE mostrar los textos de hoy al montar, según `routeStore.storageAvailable()`, y después de cada tecla, según si se pudo guardar.
  - Después de importar con éxito y después de «Borrar todo» conserva el último texto, como hace React con una página que no se remonta. Es un cambio aceptado, porque hoy vuelve al texto inicial, y su E2E es el tercero en rojo (FR-001).
  - Cuando el shell remonta la página (navegación o cambio de idioma), vuelve al texto inicial, como hoy.
  - DEBE seguir siendo un párrafo sin rol ni `aria-live`.
- **FR-029**: El pedido al tutor DEBE ser el texto de hoy, armado con el idioma activo, los minutos guardados y la nota «La próxima vez voy a…» del idioma activo (o «elegir un desafío pequeño del recorrido.»). DEBE recalcularse en cada tecla y después de importar o de «Borrar todo», y mostrarse como texto en el `blockquote` `#tutor-prompt`.
- **FR-030**: «Copiar pedido para mi tutor» DEBE intentar, en este orden:
  1. el portapapeles: «Pedido copiado. Pegalo en tu asistente.»;
  2. si falla, la copia con un campo temporal fuera de la pantalla y `execCommand('copy')`: «Pedido copiado.»;
  3. si eso falla, seleccionar el texto de `#tutor-prompt`: «Texto seleccionado. Usá Copiar en tu navegador.».

  Copiar no escribe nada.

**Progreso y shell**

- **FR-031**: El progreso DEBE leerse con `routeStore.getProgress()` en cada render y en cada manejador, nunca de una copia: ni `useState`, ni una ref, ni un contexto, ni un cierre. Un componente DEBE leer la revisión con `useStore(routeStore.changes, (state) => state.revision)`, nunca con el store entero. Lo que el formato guarda NO DEBE cambiar: las claves de `taller-learning-v1`, `version: 1` y el orden del JSON. *(Spec de F2, FR-026; plan de F2a, §3.0)*
- **FR-032**: Desde la página, sólo la bitácora DEBE escribir, una vez por tecla.
  - Montar, desmontar, copiar, exportar, descargar un respaldo, abrir o cancelar la confirmación y cualquier «Borrar todo» que el servidor no confirmó NO DEBEN escribir ni subir la revisión.
  - Importar y «Borrar todo» escriben lo que escriben la feature y el `save()` de FR-022, nada más.
  - Las tres fixtures congeladas DEBEN arrancar sin escribir, sin respaldar y sin avisar.

  *(ADR 0003)*
- **FR-033**: Después de cada escritura de la página, de una importación y de «Borrar todo», el shell DEBE mostrar el estado nuevo como hoy:
  - `#save-label`;
  - en la barra lateral, «N de 12», el porcentaje y la barra de progreso;
  - después de «Borrar todo», además, el idioma: «RUST», `aria-pressed` de los botones de idioma y `body[data-language]`.

  La página no conoce al shell. Hoy lo hacen `save()`, `updateSaveLabel()` y `render()`, de `app.js`. F8 reutiliza el mecanismo que cree el primero de F3, F4 y F9 (F3 FR-014, F4 FR-011 y F9 FR-022). Si ese mecanismo no cubre el idioma, F8 lo extiende; si F8 llega primero, lo crea.
- **FR-034**: Los avisos DEBEN salir por el `toast` del shell (`#toast`), que el adaptador recibe en `mount`, con los textos de hoy, hasta F10. F8 NO DEBE sumar regiones vivas, salvo el error de la confirmación de FR-047 (`role="alert"`), que trae Q1 con la convención de los formularios de F11a. *(Hoja de ruta, F8, «Conserva»; X2, «Lecturas»)*

**El aspecto y la accesibilidad**

- **FR-035**: La página, el panel de respaldos y la confirmación DEBEN producir el mismo DOM que `renderMethod`, `backupsPanel` y el `#confirm-dialog` de hoy: etiquetas, clases, ids (`note-learned`, `note-next`, `note-state`, `tutor-prompt`, `confirm-dialog`, `confirm-title`, `cancel-reset`, `confirm-reset` e `import-file`), roles, `aria-*`, textos y orden. Las diferencias admitidas son:
  - los atributos de delegación que se retiran (`data-action`, `data-key` y `data-note`);
  - la clase que reemplaza al `style=` (FR-036);
  - el lugar del diálogo y del campo de archivo en el árbol;
  - lo que Q1 suma o cambia en la confirmación: el texto de L8, el campo de la contraseña, la espera y los errores;
  - las de serialización de React, que se listan.

  El contenido de la guía y las notas se muestran como texto, nunca como HTML.
- **FR-036**: El `style="margin:22px 0 0"` del párrafo «¿Día complicado?…» DEBE pasar a una clase de la hoja de la página, con el mismo estilo computado. El marcado que dibuja la página queda con 0 `style=`.
  - **La única excepción declarada** es el campo temporal de la copia (FR-030), que no es parte de la página: se crea en `body` y se quita en el mismo manejador.
  - Hoy `copyPrompt` lo saca de la pantalla con `field.style.position` y `field.style.top` (CSSOM, que la política de C4 admite), y eso escribe un atributo de estilo.
  - El plan elige si conserva esas dos propiedades o usa una clase, con el mismo comportamiento.

  *(Hoja de ruta, F8, «Borra»; C4, Q3)*
- **FR-037**: Las reglas de CSS que sólo usa Método DEBEN mudarse a la hoja de la página, cada una entera, en el orden de hoy y sin cambiar sus declaraciones.
  - **Se mudan:**
    - `.button.danger` (sólo la usa la confirmación), `.method-grid`, `.method-panel` y sus `h2`, `p` y `li`;
    - `.routine` con sus `li` y `strong`, y `.routine-time`;
    - `.notes-panel`, `.notes-grid` y su `textarea`, y `.tutor-prompt`;
    - `.source-list` con sus `li`, `a` y `p`, `.data-actions` y `.data-explainer`;
    - en los `@media`: `.method-grid` en el de 1 150 px; `.notes-grid`, `.method-panel` y `.method-grid` en el primero de 590 px; y `.data-actions` en la regla de impresión.
  - **Se quedan en `styles.css`,** porque otras vistas las usan: `.page-heading`, `.field-label`, `.note-state`, `.text-button`, `.button` y sus variantes compartidas, `dialog`, `.dialog-content` y `.dialog-actions`.

  Se prueba con dos comparaciones de la unidad 8 de F2b, las dos con 0 diferencias:
  - el multiconjunto de declaraciones del CSS del dist;
  - el barrido de estilo computado, a 1 280, 981, 850, 650, 590 y 375 px, con el movimiento reducido encendido y apagado, y en impresión. El barrido se amplía a lo que Método dibuja y no cubre: el panel de respaldos, la confirmación abierta y la bitácora con texto.

  El primero que se integre de F3, F4, F8 y F9 parte los bloques compartidos (1 150 px, 590 px e impresión), y los demás rebasan. *(X3 y C3; spec de F2, FR-059)*
- **FR-038**: El orden de tabulación de la página DEBE ser el de hoy. Enter y Espacio operan los botones, y Tab y Mayús+Tab se quedan dentro de la confirmación abierta. La página NO DEBE sumar animaciones, transiciones ni una librería de animación: las de hoy siguen bajo la regla global de `prefers-reduced-motion` de `styles.css`. El diseño móvil sigue siendo el de las reglas de 590 px.

**Las pruebas**

- **FR-039**: Las specs nuevas DEBEN ser de Vitest. Los valores esperados se escriben a mano desde `content/guide/`, las fixtures y los contratos de C3a, D1a y D1b.
  - **De modelo** (proyecto `node`):
    - el texto del pedido al tutor y el del estado de la nota;
    - el paso del servidor con un doble del cliente: la secuencia de FR-022, cada fila de FR-047, FR-048, y que nada local se borra si el reset no dio 200.
  - **De componente** (proyecto `jsdom`, con Testing Library, `userEvent` y consultas por rol y nombre accesible):
    - una escritura por tecla;
    - los tres caminos de la copia, con dobles del portapapeles y de `execCommand`;
    - importar y «Borrar todo» contra un doble de `ProgressBackup` que registra sus llamadas: el orden de FR-022, la espera de FR-025, los errores de FR-047, el aviso de fallo y una nota con HTML que se muestra como texto.

  Como jsdom no trae `showModal()` ni `close()` (ADR 0008), una spec que sólo necesita el diálogo define un stub, y el foco, Esc y el fondo se prueban en E2E.
- **FR-040**: Los E2E nuevos DEBEN usar un Page Object de Método (`qa/e2e/pages/method.ts` y su fixture `method`, provisionales; si F5, F7 o F9 ya crearon uno mínimo para su «Borrar todo», F8 lo amplía), con localizadores por rol y nombre accesible. Cubren US1 a US5:
  - la bitácora con `storage.watchWrites()`;
  - el pedido y la copia, con el portapapeles permitido;
  - la exportación desde la página y desde la barra lateral: el evento `download` con `page.clock` fijo, el nombre, la sangría, el orden de las claves y el contenido comparado con la fixture sembrada;
  - la importación por el evento `filechooser`, que no depende de dónde esté el campo, con las dos exportaciones congeladas y los tres archivos inválidos;
  - «Borrar todo» contra el doble de la API de F11a, con `GET /api/progress`, `POST /api/auth/confirm-password` y `POST /api/progress/reset` sumados al doble:
    - los pedidos y su orden;
    - las respuestas de FR-047 y de FR-048;
    - el almacenamiento, la barra lateral, la página y el foco;
  - los respaldos, con una clave ilegible sembrada;
  - el teclado de la confirmación.

  Cada rareza de «Método de hoy» lleva `KNOWN DEFECT` en el nombre de su prueba; los cambios aceptados, no.
- **FR-041**: Los checks de `qa/` que cargan `app.js` DEBEN cambiar sólo cómo cargan o qué observan, no sus valores esperados:
  - **`app-shell-check`:** sus 38 escenarios de importar, formato, archivo, atomicidad, «Borrar todo», áreas asíncronas, seguridad, almacenamiento sin escritura y respaldos pierden su punto de entrada en `app.js`. Cada uno pasa a la spec de la feature, a una spec de componente o a un E2E, o se descarta con su motivo. Los dos de exportar siguen, porque exportan por la barra lateral, con la instancia que reciben en `startApp()`. La nota del escenario «almacén» la comparten F3, F8 y F9.
  - **`boot-check`:** la navegación a `#metodo` lee nodos de React; «borrar todo» y las dos «importación: <fixture>» se adaptan, con un doble del paso del servidor.
  - **`load-order-check`, `app-adapters.ts` y los ids de los dos arneses** también se adaptan.

  El orden de los efectos de «Borrar todo» (el servidor, los cuatro almacenes, las simulaciones, el temporizador, `save()`, el cierre, el redibujo y el aviso) DEBE seguir afirmado por algún check. El PR DEBE listar la correspondencia de cada escenario que cambia o se retira. *(ADR 0008, §5; plan de F2b, §4.6)*
- **FR-042**: Una comparación única, no permanente, DEBE comparar el DOM de `#main` y de la confirmación del legacy contra el del port sobre una grilla de estados:
  - los dos idiomas, con y sin notas;
  - con y sin ranuras de respaldo;
  - con la confirmación abierta;
  - con el almacenamiento disponible y bloqueado.

  Informa estados, elementos y diferencias, con las admitidas de FR-035. También registra que el archivo exportado tiene los mismos bytes en los dos builds. *(Precedente: spec de F2, FR-011)*

**La integración**

- **FR-043**: F8 DEBE integrarse de a uno con F2b (si alguna unidad todavía no entró), F3, F4, F5, F7, F9, F10 y F11a. Comparten:
  - `app.js`: los delegados, `render()`, `startApp()` y su contrato nuevo;
  - `index.html`;
  - `legacy-views.ts`, `load-order-check`, `app-adapters.ts` y los arneses;
  - los bloques compartidos de `styles.css`;
  - la suscripción del shell, la pila de DOM de Vitest y el Page Object de Método;
  - el doble de la API de los E2E y el cliente de la API (F11a).

  El que llega después rebasa. F8 no entra antes que F2b ni que F11a. *(Hoja de ruta, «Orden y paralelismo»)*
- **FR-044**: En el mismo PR, `docs/architecture.md` y `qa/AGENTS.md` DEBEN reflejar el cambio. Los integra el agente principal. *(`AGENTS.md`)*
  - En `docs/architecture.md`: la fila de Método, la de `features/progress-backup` (el armado en `src/app/`) y el contrato de `startApp()`.

### Key Entities *(include if feature involves data)*

- **Bitácora:** las dos notas por idioma («Lo que entendí / lo que todavía me cuesta» y «La próxima vez voy a…»), en `notes.<idioma>.learned` y `notes.<idioma>.next` de `taller-learning-v1`. Se escriben en cada tecla.
- **Estado de la nota:** el párrafo `#note-state`, que dice si las notas se guardan. No se guarda.
- **Pedido al tutor:** un texto derivado del idioma, los minutos y la nota «La próxima vez». No se guarda.
- **Copia de progreso (archivo exportado):** el JSON v1 con el recorrido en la raíz, más `lab`, `campaign`, `systems` y `exportedAt`. Lo arma `features/progress-backup`, lo importa Método y lo importa D1b como `source: export`.
- **Importación:** una copia planificada entera antes de aplicar nada y aplicada después, sección por sección, con un aviso que nombra lo que no se guardó o se omitió. Sigue siendo local hasta D1c.
- **«Borrar todo»:** el reset del progreso de la cuenta en el servidor, con la contraseña confirmada, seguido del borrado de los cuatro almacenes locales y sus respaldos y de los pasos de sesión de sus dueños (las simulaciones y el temporizador). Sin el 200 del servidor no se borra nada local.
- **Época:** el contador de la cuenta en el servidor que sube con cada reset (D1). F8 la lee justo antes del reset y no la guarda.
- **Contraseña confirmada:** la marca de la sesión que deja `POST /api/auth/confirm-password` durante 900 s (C3a), que el reset exige.
- **Ranura de respaldo:** el texto original que un almacén guardó en `<clave>:respaldo` cuando no pudo leerlo (ADR 0003).
- **Instancia de `progress-backup`:** la única, la que arma `src/app/` (Q2); la usan la barra lateral, por `startApp()`, y la página.
- **Adaptador mínimo:** el `window.TallerMethod` que `app.js` lee hasta F10.
- **Comparación única:** la corrida, una vez en el PR, que compara el DOM o el estilo del legacy con los del port.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los 106 E2E de F1 y los 17 de A2 pasan con el build de F8, con 0 escenarios editados y 0 fallas.
- **SC-002**: Cada escenario de aceptación de US1 a US5 tiene una prueba que lo ejerce. Los E2E nuevos pasan contra el legacy antes del port y sin editarse después, salvo los de lo que cambia a propósito (los tres de React y los de «Borrar todo» con el servidor), que fallan contra el legacy y pasan contra la página: 100 %.
- **SC-003**: El archivo exportado desde la fixture congelada de master con el reloj fijo cumple en los dos builds lo que fija el E2E (nombre, sangría, orden de claves y contenido), y la comparación única registra los mismos bytes. Importar cada una de las dos exportaciones congeladas deja las claves con los valores que fija el E2E, en los dos builds.
- **SC-004**: Con las fixtures congeladas, montar Método, copiar, exportar, descargar un respaldo y abrir y cancelar la confirmación dan 0 escrituras, 0 claves `:respaldo` nuevas y 0 avisos. Cada tecla de la bitácora da exactamente 1 escritura de `taller-learning-v1`.
- **SC-005**: El multiconjunto de declaraciones del CSS del dist tiene 0 diferencias contra el de la base: mismo conjunto, otro orden, con la regla que reemplaza al `style=` como única nueva de Método. El barrido de estilo computado de FR-037 da 0 diferencias, y el marcado que dibuja la página tiene 0 `style=` (la excepción declarada de FR-036 es el campo temporal de la copia, fuera de la página).
- **SC-006**: `frontend/app.js` tiene 0 apariciones de los términos de FR-010, y `index.html` pierde 2 elementos y nada más.
  - El adaptador publica 2 métodos.
  - `seams-guard-check` da 0 violaciones y `singletons-import.spec.ts` sigue en verde.
  - «Exportar mi progreso» funciona en las 8 vistas.
- **SC-007**: La comparación única del DOM da 0 diferencias, salvo las admitidas de FR-035.
- **SC-008**: `dist/index.html` queda bajo 1 250 000 caracteres, con su tamaño antes y después informados.
- **SC-009**: El total de avisos de complejidad no sube de 35, la cuenta del plan de F2b.
- **SC-010**: El 100 % de los escenarios de `app-shell-check` y de `boot-check` que cambian figura en la tabla de correspondencia, y el orden de los efectos de «Borrar todo» queda afirmado por al menos un check.
- **SC-011**: El código nuevo tiene 0 llamadas a `useStore` sin selector (una regla de lint o una revisión explícita).
- **SC-012**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan, y la imagen web sigue construyendo.
- **SC-013**: Una confirmación exitosa hace exactamente 3 pedidos, en el orden de FR-022, y el reset lleva la época del `GET`. En cada una de las respuestas de FR-047 y de FR-048, las cuatro claves y sus respaldos quedan con el mismo texto que antes de confirmar.

## Riesgos

1. **Borrar el manejador de la barra lateral.** La hoja de ruta pone `#export-progress` en el «Borra» de F8, pero es el botón del shell en las ocho vistas. *Mitigación:* FR-013 y el escenario 2 de US6.
2. **El orden de «Borrar todo» pierde su check.** Hoy lo fija el escenario «borrar todo» de `boot-check`, que hace clic en un `#confirm-reset` estático que deja de existir. *Mitigación:* FR-041 y SC-010. La spec de la feature ya fija el orden dentro de `resetAll()`, y una spec de componente fija lo que viene después de la espera.
3. **La bitácora no muestra lo importado.** Un campo que no lee el valor en cada render (por ejemplo, con `defaultValue`) se queda con la nota vieja si la página no se remonta. *Mitigación:* FR-018 y el escenario 3 de US2.
4. **Tres comportamientos de React cambian a propósito.** El foco después de importar y después de «Borrar todo» (X1), y `#note-state` (Q4). *Mitigación:* FR-019, FR-023 y FR-028, con E2E que fijan lo nuevo.
5. **Mudar unas 23 reglas puede cambiar la cascada.** `styles.css` se evalúa primero, y el multiconjunto no ve la cascada: en la unidad 8 de F2b, el control negativo dio 702 diferencias con 0 en el multiconjunto. *Mitigación:* FR-037, con el barrido ampliado y la impresión.
6. **Lo que jsdom no hace.** No trae `showModal()` ni `close()`, ni un portapapeles real. *Mitigación:* el foco, Esc, el fondo y el portapapeles van en E2E; las specs de componente usan dobles (FR-039).
7. **Un borrado a medias.** Si lo local se borra sin el 200 del servidor, el alumno pierde su progreso y la cuenta no se entera. *Mitigación:* FR-024, FR-047, FR-048 y SC-013: el servidor va primero y cualquier falla deja las claves intactas.
8. **El FR-074 de D1 no se puede cumplir al pie de la letra antes de D1c.** *Mitigación:* la lectura L7 y FR-049; D1c enmienda la cláusula cuando exista el espacio por cuenta. El usuario la confirmó el 2026-10-28.
9. **F8 depende de F11a.** La sesión, el cliente, «pedir el ingreso», React Hook Form y el doble de la API son de F11a. Si F11a se demora, todo F8 espera, también lo que no los usa. *Mitigación:* la partición de «Partición»: F8a, el port con el borrado local, depende sólo de F2b.
10. **El armado en `src/app/` choca con R4.** El guard sólo deja importar los índices de `entities/*` a su dueño declarado. *Mitigación:* L10 y FR-015: el plan elige la salida con `singletons-import.spec.ts` como prueba.
11. **El contrato de `startApp()` cambia.** Lo usan A2, `boot-check`, `app-shell-check` y F10. *Mitigación:* FR-046 y el aviso a A2 y F10 en el PR.
12. **Los tres resets por día.** Un `epoch_mismatch` o un reintento después de un borrado local fallido gastan uno. *Mitigación:* la época se lee justo antes (L1), y los 423 no gastan.
13. **Conflictos en `app.js`, `index.html`, `styles.css` y el doble de la API.** F2b, F3, F4, F5, F7, F9, F10 y F11a tocan las mismas regiones. *Mitigación:* FR-043 y la tabla de «Relación con otros ítems».
14. **Nada se ejecutó al especificar.** Sin `npm`, sin Docker, sin navegador y sin `dist/`. Las cuentas salen de leer el código de `f2b-acum` y el backend de `master`. *Mitigación:* el plan las vuelve a medir sobre la base de implementación.

## Relación con otros ítems

| Ítem | Qué comparte con F8 | Qué hace F8 y en qué orden |
| --- | --- | --- |
| F2a (PR #40) | `routeStore` y su `changes`, los motores, `startApp()`, `getContent()` y el guard | Los usa; cambia el contrato de `startApp()` (FR-046) |
| F2b, unidades 6 y 8 | `features/progress-backup`; el barrido de estilo computado y el multiconjunto | Dependencia. Usa la feature con el paso del servidor como puerto, lleva su armado a `src/app/` y reutiliza las dos comparaciones |
| F11a | La sesión, el cliente de la API, «pedir el ingreso», React Hook Form, el doble de la API de los E2E y el proxy de `/api/` | Dependencia (Q1). Usa todo eso y suma al doble `GET /api/progress`, `confirm-password` (si F11b no lo sumó) y el reset |
| D1a y D1b (entregados) | `GET /api/progress` y `POST /api/progress/reset` | Dependencia (Q1). Los consume tal cual |
| [A2](../006-a2-compuerta-arranque/spec.md) | `legacy-views.ts`, `load-order-check`, `getContent().guide` y el arranque | Suma el adaptador a la cadena y le pasa la instancia a `startApp()`; el agente principal lo integra |
| F3, F4 y F9 | Los delegados, `render()`, `startApp()`, la suscripción del shell (FR-033), el escenario «almacén» de `app-shell-check`, la pila de DOM de Vitest, los bloques compartidos de `styles.css` | De a uno. El primero crea lo compartido y los demás lo reutilizan |
| F5 | `resetSimulations`, `TallerSystems.sync` y el Page Object mínimo de Método | Regla de orden de Q2: si F5 entró antes, F8 importa el reinicio y lo retira; si no, lo hace F5 |
| F7 | Los métodos de respaldo de `TallerLab` y su `reset` | Regla de orden (L11): el último de F7 y F8 deja de leerlos por `window`; `exportState` queda hasta F10 |
| F9 | El paso del temporizador y su E2E de «Borrar todo»; las notas, ahora de F8 | Regla de orden de Q2: si F9 entró antes, F8 importa el reinicio y retira `resetTimer`; si no, F9 lo importa y nunca lo publica |
| F10 | `mount`, `unmount`, `exportProgress`, `#export-progress`, `#toast` y `syncShell` | Los retira F10. El armado ya está en `src/app/` y no lo tiene que mover |
| F11 (F11b y F11d) | «Borrar la cuenta» (el mismo patrón de contraseña); los textos de «Tu cuenta» sobre «Borrar todo»; «¿Este progreso es tuyo?» | El texto de F11 «No es «Borrar todo» de Método, que borra el progreso de este navegador» queda viejo: ahora también borra el de la cuenta (hallazgo) |
| [D1](../007-d1-progreso-sincronizacion/spec.md) y D1c | El formato del archivo; `resetAll(confirmation)`; el FR-074 | D1c reimplementa la feature, conserva el diálogo y el paso del servidor, limpia su espacio en lugar de las claves v1 no importadas (L7), carga la foto de la época nueva y suma la guarda general (Q3). Después de «Borrar todo», `taller-learning-v1` queda en blanco (rareza): D1c no debería ofrecer importar un v1 vacío |
| B2 y A4 | Las ejecuciones en el servidor | El reset cancela las activas y conserva el historial (contrato de D1b); el diálogo lo dice (L8) |
| [C4](../008-c4-exposicion/spec.md) | Los estilos en línea | C4 ya no espera a F8: su Q3 dejó `style-src-attr 'unsafe-inline'`. F8 saca el `style=` por el alcance del port |

**Hallazgos para la hoja de ruta y otras specs (los integra el coordinador):**

- **Dependencias de F8:** de «F2b, F5, F7» a «F2b, F11a, D1a y D1b». F5 y F7 no son dependencias: la regla de orden de Q2 ordena los retiros entre ellos. Con F11a como dependencia, F8 entra después de F11a y puede salir del tramo 4.
- **«Superficies que pide D1», fila 4:** queda en F8, y depende de D1b y de F11a. La línea de F11 que la pone en F8 sigue valiendo.
- **El «Borra» de F8:** el manejador de `#export-progress` es del shell y queda hasta F10. F8 suma al «Borra» el armado de `progress-backup` en `app.js` (pasa a `src/app/`).
- **El «Entra» de F8:** suma la bitácora, `#note-state`, el pedido al tutor (F9-Q1), el CSS de Método (X3), «Borrar todo» con el servidor (Q1) y el armado en `src/app/` (Q2).
- **F5 «Conserva»** («`resetSimulations` hasta F8»), F9 (`resetTimer` lo retira F8) y la tabla de retiros de F7 pasan a la regla de orden de Q2.
- **A2 y F10:** `startApp()` recibe la instancia de `progress-backup`.
- **D1 (D1c):**
  - la cláusula de las claves v1 del FR-074 rige desde D1c (L7);
  - un `taller-learning-v1` en blanco después de «Borrar todo» no es un v1 para importar.
- **F11:** el texto que distingue «Borrar todo» de borrar la cuenta tiene que decir que «Borrar todo» también borra el progreso de la cuenta en el servidor, salvo el historial.
- **La fila de C4:** «espera a F5, F7 y F8» quedó vieja con la Q3 de C4.
- **El tope de tamaño:** el criterio global de 2 500 000 caracteres quedó viejo con A2; hoy es 1 250 000.
- **«Decisiones abiertas» de F8:** cerradas en su clarify (Q1 a Q4); quedan las lecturas L1 a L12 para el PR.

## Assumptions

- Esta spec describe `f2b-acum@2b37caf4`, un ensayo de sólo lectura con F2a, A2 y las cuatro unidades de F2b integradas. Lo que toma de F2b es un hecho del código de ese ensayo, citado por archivo, aunque todavía no esté en `master`.
- Lo que toma de F11a sale de su spec con clarify (015), sin plan: el cliente de la API en `shared/api`, la sesión en `entities/session`, «pedir el ingreso» en la API pública de su slice, React Hook Form y el doble de la API. Si su plan cambia los nombres, esta spec los sigue.
- Los nombres son provisionales y los confirma el plan: `pages/method`, `register-method.tsx`, `window.TallerMethod`, el módulo del armado en `src/app/` y `qa/e2e/pages/method.ts`.
- Las lecturas L1 a L12 se escriben con la recomendación, y el usuario las confirma o las corrige en el PR. Las de X1, X2, X3 y F9-Q4 también son de esta spec («Lecturas»).
- El barrido de estilo computado y el multiconjunto son los de la unidad 8 de F2b: scripts descartables fuera del repositorio (`quickstart-f2b.md`, §3.1). F8 los reutiliza y los amplía a lo que Método dibuja y a la impresión.
- Vitest corre sólo en `node` y sólo para `*.spec.ts`: `jsdom`, Testing Library y `fishery` no están en el `package.json` de `f2b-acum`. El primer ítem que escriba una spec de componente los pide con permiso y pasa la configuración a dos proyectos. Si F8 es el primero, le toca a F8.
- Los textos esperados salen de `frontend/app.js`, de `frontend/src/index.html`, de `features/progress-backup`, de `backend/api/lang/es/api.php` y de las fixtures `qa/fixtures/progress-master-2a278ad-storage.json`, `progress-master-2a278ad-export.json` y `progress-d0e1b49-export.json`. La fixture de master tiene idioma Go, una nota «Lo que entendí» de Rust y `minutes: 25`. Que el contenido exportado de la fixture sembrada coincida con lo guardado (sin normalizar nada) lo confirma el plan.
- Los textos nuevos de la confirmación (L8), del `epoch_mismatch` (L5) y de «sin servidor» (L6) son propuestas de esta spec.
- El conteo de unas 23 reglas sale de leer `frontend/styles.css` de `f2b-acum` con `grep`, y que sólo Método las usa, de buscar cada clase en las fuentes de `frontend/`. El plan lo vuelve a medir con `postcss`.
- Los 38 escenarios de `app-shell-check` que cambian salen de leer sus 58 en `f2b-acum`.
- El backend se leyó en `master` (`e87772d`): `routes/api/progress-reset.php` y `progress.php`, `ResetBodyRequest.php`, `RequirePassword.php`, `EnsureExpectedAccount.php`, `config/progress.php` y `lang/es/api.php`, con los contratos de C3a, D1a y D1b. Que `GET /api/progress` pida email verificado sale de `routes/api/progress.php`.
- Nada se ejecutó: sin `npm`, sin Docker, sin navegador, sin descargas y sin `dist/`. Sin verificar en un navegador:
  - el foco al abrir y al cerrar la confirmación;
  - qué devuelve el portapapeles en Chromium headless con el permiso concedido;
  - la serialización del DOM de React frente a `innerHTML`.

  Los E2E escritos primero contra el legacy los fijan.
- Los avisos de complejidad (35) son los del plan de F2b; `npm run lint` no se corrió.
- Los mensajes que lee el alumno van en español rioplatense, como hoy; el código y las pruebas, en inglés.

## Alternativas consideradas

Sólo las que cambian lo que se construye.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| «Borrar todo» (Q1) | A: portar el flujo local y dejar la contraseña para el ítem que integre D1c. B: un campo de contraseña que aparece sólo cuando la implementación lo pide | **C, el reset del servidor ya (usuario).** A era la recomendada: sin dependencias de F11a ni del servidor, a costa de que la superficie 4 llegara después. B escribía hoy lo que D1c decide. Costo de C: F8 depende de F11a, lee la época sin el cliente v2, deja «Borrar todo» sin funcionar sin servidor, gasta resets del día, fija `resetAt` y no puede cumplir al pie de la letra el FR-074 antes de D1c (L7) |
| El armado (Q2) | A: dejarlo en `app.js` hasta F10 y pasarle la instancia a la página | **B, a `src/app/` (usuario).** A era la recomendada: sin cambiar el contrato de `startApp()` y con todos los retiros en F10. Costo de B: el contrato nuevo, el choque con R4 (L10) y la regla de orden entre F5, F8 y F9 |
| El solape (Q3) | B: una guarda invisible en F8. C: un estado de espera visible en las dos operaciones | **A, D1c (usuario).** La espera del reset la muestra F8 por Q1 (FR-025), sin que eso sea la guarda general |
| `#note-state` (Q4) | A: volver al texto inicial, como hoy, con una excepción a C2 | **B, lo que haga React (usuario).** Costo: después de «Borrar todo», el párrafo puede seguir diciendo «Guardado…» con las notas recién borradas; un tercer E2E en rojo |
| La época (L1) | Mandar la época 1 y reintentar con la del 409 | Leerla con el `GET`: el `epoch_mismatch` gasta uno de los tres resets del día |
| La contraseña (L2) | Intentar el reset y pedirla sólo ante el 423 | Pedirla siempre y confirmarla primero, como «Borrar la cuenta» de F11b y el «DEBE pedir» del FR-074 |
| El FR-074 (L7) | Borrar sólo el servidor; o una casilla «borrar también lo de este navegador» | Borrar las claves v1 como hoy: lo otro deja «Borrar todo» sin borrar lo que el alumno ve, o suma una decisión que hoy no existe |
| Qué pasa después de importar y de «Borrar todo» | Que el shell remonte la página con `render()`, como hoy; actualizarla en el lugar | En el lugar. Remontar pierde el foco, que es justamente lo que X1 descarta |
| Dónde vive la confirmación | El `<dialog>` estático de `index.html`, manejado desde React; un hijo de `#main` sin portal; un portal a `body` desde la raíz de la página | El portal, como decidió F9-Q4 para la lección y la confirmación del laboratorio |
| La exportación de la página | Una copia propia del armado y la descarga del archivo; compartir con la barra lateral el mismo camino | Compartirlo (FR-013): dos copias pueden divergir en el nombre o en el tipo, y el archivo es contrato con D1b |
| El campo de archivo | Dentro de la página, cerca de su botón; un portal a `body` | Lo decide el plan. Está oculto, y el E2E entra por el evento `filechooser` |
| La bitácora | Campos con su valor leído en cada render; campos sin control con una clave que los remonte al cambiar las notas desde afuera | Lo decide el plan, con FR-018 y FR-027: lo observable es una escritura por tecla, el cursor que no salta y las notas importadas a la vista |

## Partición

Esta spec tiene 49 requisitos (FR-001 a FR-049), contra los 52 de C3a, la mayor del épico. No supera el límite, así que no se propone un corte obligatorio.

Con Q1, sin embargo, aparece un corte natural, que el plan puede aplicar si F11a se demora. No se aplica acá.

- **F8a, el port.** La página entera con el «Borrar todo» local de hoy, el armado en `src/app/` y el CSS. Depende sólo de F2b. Entran todos los requisitos salvo FR-024, FR-047, FR-048 y FR-049, la espera de FR-025 y la parte de Q1 de FR-021 y FR-022.
- **F8b, «Borrar todo» con el servidor.** La contraseña, la época, el reset y sus respuestas. Depende de F8a, de F11a y de D1b, y es justamente el cambio de comportamiento que FR-001 ya pone en su propio commit después del port.

Su costo:

- dos PR en lugar de uno, y apartarse de «un PR por vista»;
- entre los dos, «Borrar todo» sigue siendo sólo local, como hoy;
- la superficie 4 llega con F8b.

La ganancia es que el port no espera a F11a.
