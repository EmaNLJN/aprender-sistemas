# Feature Specification: F8 · Port de Método a React

**Feature Branch**: `022-f8-metodo` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Draft, con cuatro preguntas para el clarify (Q1 a Q4)

**Input**: Ítem **F8** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Método». Hay que portar a React la página con su panel de respaldos: exportar, importar (`#import-file`) y «Borrar todo» con su confirmación. Por la decisión F9-Q1 del usuario, F8 también se lleva lo que dibuja `renderMethod`: la bitácora (`#note-learned` y `#note-next`), `#note-state` y el pedido al tutor. Es el último port de una vista del tronco antes de F10. Lo encargó el coordinador el 2026-10-28.

**Describe el código de `f2b-acum@2b37caf4`**: F2a, A2 y las cuatro unidades de F2b integradas, en un ensayo de sólo lectura. No describe `master` (`e87772d`), que todavía no los tiene. Lo que toma de F2b es un hecho y cita su archivo: `features/progress-backup`, la gramática de URL y `startApp()`. El plan de F2b es [plan-f2b.md](../009-f2-seams/plan-f2b.md).

Usa como base:

- los ADR [0008](../../docs/adr/0008-pruebas-del-front.md) y [0003](../../docs/adr/0003-integridad-del-progreso.md);
- el [mapa del front legacy](../front-react/legacy-map.md);
- la [spec de D1](../007-d1-progreso-sincronizacion/spec.md) con el [contrato de D1b](../007-d1-progreso-sincronizacion/contracts/http-d1b.md), entregado en el PR #39;
- la [constitución](../../.specify/memory/constitution.md) 1.4.1.

Las specs de F3 (012), F4 (013), F5 (018), F7 (021), F9 (014) y F11 (015) ya tienen su clarify del 2026-10-28, pero viven en otras ramas: se citan sin enlace.

## Intención y alcance

**Lo que entendemos.** Método (`#metodo`) es la página que propone una forma de estudiar. También es donde el alumno escribe su bitácora y donde gestiona su progreso. Hoy la dibuja `frontend/app.js` con una cadena de HTML (`renderMethod` y `backupsPanel`). La mueven:

- una rama del delegado de entrada (`data-note`) y cinco del de clic, sobre `#main`;
- tres oyentes sobre elementos estáticos de `index.html`: el `<dialog id="confirm-dialog">` y su par de botones, y el `<input id="import-file">` oculto.

F8 la lleva a una página de React que conserva el aspecto, los textos, el teclado, el progreso guardado y el archivo exportado byte a byte. D1b ya importa ese formato legacy en el servidor. La exportación, la importación y «Borrar todo» no se reescriben: ya viven en `features/progress-backup` (F2b, unidad 6), con una interfaz que D1c va a reemplazar. F8 dibuja esa interfaz y la conecta.

**Lo que hay que cuidar,** porque la red de F1 no lo fija y un port ingenuo lo rompe:

- el botón «Exportar mi progreso» es de la barra lateral, no de Método, y existe en las ocho vistas;
- la bitácora escribe en cada tecla;
- la importación y «Borrar todo» siguen un orden de efectos que hoy fija un check que pierde su punto de entrada.

**Cambios aceptados a propósito.** Lo que hoy existe sólo porque `innerHTML` rehace la vista adopta el comportamiento de React (X1 y C2): el foco ya no se pierde después de importar ni de «Borrar todo».

Es para quien porta vistas y para quien revisa el PR. Para el alumno no cambia nada. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. La red de F1 (106 E2E) y los 17 E2E de A2 pasan sin editarse con el build del port.
2. Los E2E nuevos de Método pasan contra el legacy antes de portar y, sin editarse, contra la página nueva. Cubren la bitácora, el pedido al tutor, exportar, importar, «Borrar todo» y los respaldos, con la descarga y la carga de un archivo real. Los dos E2E que fijan un cambio aceptado (el foco, por X1) fallan contra el legacy por esa razón.
3. El archivo exportado tiene los mismos bytes en el legacy y en el port, y las dos exportaciones congeladas se importan con el mismo resultado guardado.
4. La página produce el mismo DOM que `renderMethod`, salvo las diferencias listadas. Las reglas de CSS que sólo usa Método se mudan a la hoja de la página y dan el mismo estilo computado.
5. Cada tecla de la bitácora hace una escritura. Montar la página, copiar, exportar, descargar un respaldo y abrir o cancelar la confirmación no escriben nada. Las fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar.
6. `app.js` pierde todo lo de Método y conserva la exportación de la barra lateral. `index.html` pierde la confirmación y el selector de archivo estáticos, y nada más.

**Entra:**

- La página de Método en `frontend/src/pages/`:
  - la rutina;
  - la bitácora con su estado;
  - el pedido al tutor y su botón de copiar;
  - las fuentes;
  - el panel de respaldos;
  - «Tu progreso te pertenece», con exportar, importar y «Borrar todo»;
  - la confirmación y el selector de archivo.
- El modelo puro que necesita: el texto del pedido y el del estado de la nota.
- El adaptador mínimo de `frontend/src/app/legacy/` y el corte de `app.js`, de `index.html` y de los arneses de `qa/`.
- Las reglas de CSS que sólo usa Método (unas 23, X3) y el `style=` de la página.
- Los E2E con su Page Object, con la descarga y la carga de archivos.
- Las specs de Vitest de modelo y de componentes.
- La documentación que cambia con ellos: `docs/architecture.md` y `qa/AGENTS.md`.

**Queda fuera:**

- Pedir la contraseña en «Borrar todo» y llamar al reset del servidor (Q1).
- La lógica de exportar, importar y «Borrar todo», que ya es de `features/progress-backup` y no cambia un byte.
- El shell y el router (F10): la barra lateral, `#save-label`, `#toast`, «Exportar mi progreso» de la barra lateral, `syncShell` y el cambio de idioma.
- Recorrido, Biblioteca, Proyecto, Sistemas y el laboratorio (F9, F3, F4, F5 y F7).
- El contenido de `content/guide/` (las fuentes).
- Cualquier cambio de IDs, de formas guardadas, del formato del archivo o de URL.

**Sin hacer a propósito (YAGNI):**

- un estado de espera o un botón deshabilitado mientras se importa o se borra (Q3);
- el debounce de la escritura;
- una librería de diálogos, de formularios o de animación;
- un contexto o un provider del progreso;
- memoización;
- una región viva nueva;
- capturas de pantalla y pruebas con axe;
- E2E con dos pestañas.

**Actores:**

- quien porta la vista: el usuario y los agentes que implementan;
- quien revisa el PR;
- el agente principal, que integra `main.tsx`, `legacy-views.ts`, `package.json`, las configuraciones y la documentación;
- el alumno, que no debe notar nada.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta para el clarify.

| Pedido | Fuente |
| --- | --- |
| Port y no rediseño: se conservan el aspecto, el comportamiento, los textos, el progreso guardado, los IDs y las URL | Usuario, 2026-10-05 (supuesto que no corrigió) |
| Las vistas una por una, las hojas primero y cada raíz de React dentro del shell legacy, como el Atlas | Usuario, 2026-10-05 |
| Antes de portar, E2E con Playwright y Page Objects contra la versión actual; las piezas nuevas llevan Vitest, Testing Library y fishery | Usuario, 2026-10-05; clarify de F1, Q1 |
| La suscripción al progreso con Zustand: `useStore` con un selector chico, nunca con el store entero | Usuario, clarify de F2, 2026-10-06 (Q3); `AGENTS.md` |
| `features/progress-backup` con promesas y una confirmación en «Borrar todo» que hoy se ignora, para que D1c la reemplace sin tocar a quien llama | Usuario, clarify de F2, 2026-10-06 (Q4); spec de F2, FR-052 |
| F8 trae la página y el panel de respaldos; la interfaz de exportar, importar (`#import-file`) y «Borrar todo» con su confirmación; los E2E, con la descarga y la carga de archivo. Borra `renderMethod`, `backupsPanel`, los manejadores de `#export-progress`, `#cancel-reset`, `#confirm-reset` e `#import-file`, el `#confirm-dialog` estático y el `style=` de la página. Conserva el toast del shell hasta F10 | Hoja de ruta, F8 («Entra», «Borra» y «Conserva»). El manejador de `#export-progress` es del shell: ver «El corte en `app.js`» |
| Las notas, `#note-state` y el pedido al tutor van a F8, con Método, que los dibuja; F9 sólo garantiza que siguen por `routeStore` | Usuario, clarify del 2026-10-28 (F9-Q1); ruling C3 del coordinador |
| Lo que existe sólo porque `innerHTML` rehace la vista adopta el comportamiento de React, y los E2E lo fijan; las rarezas de lógica se conservan; los E2E de un cambio aceptado van en el commit en rojo del TDD | Usuario, clarify del 2026-10-28 (X1); coordinador (C2) |
| Las regiones vivas que hoy se recrean quedan montadas | Usuario, clarify del 2026-10-28 (X2) |
| El CSS que sólo usa la página se muda con el port, probado con el barrido de estilo computado y el multiconjunto de F2b. El primero de F3, F4, F8 y F9 que se integre parte los bloques compartidos, y los demás rebasan | Usuario, clarify del 2026-10-28 (X3); coordinador (C3) |
| El diálogo vive dentro de la raíz de la página, con un portal a `body`, y se cierra al navegar | Usuario, clarify del 2026-10-28 (F9-Q4, para la lección de F9 y la confirmación de F7) |
| Medir si F8 necesita de verdad a F5 y F7 o sólo a F2b; decir qué pasa con «Borrar todo» y D1b; decir qué queda de `window.Taller*` y hasta cuándo | Coordinador, 2026-10-28 |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición propuesta sin aplicarla | Coordinador, 2026-10-28 |
| La documentación va en español; el código y las pruebas, en inglés | `AGENTS.md` |

## Preguntas para el clarify

Son cuatro, cada una con su opción recomendada. Los requisitos de abajo asumen la recomendada. Llevan el marcador `[NEEDS CLARIFICATION]` donde la respuesta los cambia: FR-015, FR-018, FR-024, FR-025 y FR-028.

### Q1 · ¿«Borrar todo» pide la contraseña y usa el reset del servidor de D1b, o se porta el flujo local?

**Qué encontramos.** La hoja de ruta asigna a F8 la superficie 4 de «Superficies que pide D1», la confirmación de contraseña de «Borrar todo», como propuesta sin aceptar. La spec de F11 la da por hecha: «la confirmación de contraseña de «Borrar todo», que es de F8». D1b está entregado. En `master` (`e87772d`), `POST /api/progress/reset` exige lo siguiente:

- sesión activa y CSRF;
- la cabecera `X-Taller-User` con el id de la cuenta (`EnsureExpectedAccount`);
- la contraseña confirmada antes por `POST /api/auth/confirm-password`. Es una marca de la sesión que vence a los `auth.password_timeout` (`RequirePassword`) y, sin ella, la respuesta es 423;
- 3 por día y cuenta (`config/progress.php`);
- un cuerpo `{format: 2, epoch}` (`ResetBodyRequest`), donde `epoch` es la época que el cliente conoce. Si no coincide, la respuesta es 409 `epoch_mismatch`.

Lo que hace el reset: sube la época, fija `resetAt` y borra el estado de la cuenta en el servidor. Desde entonces, cualquier importación pide confirmación (D1, FR-045).

Antes de D1c, nada del front lee `GET /api/progress`, así que nadie conoce la época. El progreso del navegador es todo v1 y no se sincroniza. El FR-074 de D1 (de D1c) manda que «Borrar todo» llame al reset, limpie el espacio de la cuenta y NO toque las claves v1 que la cuenta no importó. El «Borrar todo» de hoy borra justamente esas cuatro claves y sus respaldos.

Además, F11 ya escribe el texto «No es «Borrar todo» de Método, que borra el progreso de este navegador» (su FR-058). Y la sesión obligatoria llega recién con F11a (F11-Q1).

| Opción | Qué es | Costo |
| --- | --- | --- |
| **A (recomendada)** | Se porta el flujo local tal como está. «Borrar todo» llama a `resetAll()` sin confirmación, sin contraseña y sin la API, y funciona sin sesión y sin servidor, como hoy. La interfaz conserva el parámetro de confirmación que D1c va a usar. La superficie 4 se va con D1c a su ítem del front (F11d, que ya va sobre D1c, o F13, si se acepta), y ese ítem le suma el campo al diálogo de React que deja F8 | La superficie 4 no llega con F8: la hoja de ruta («Superficies que pide D1», fila 4) y la spec de F11 (la línea de «Queda fuera») se corrigen. Más adelante otro ítem edita el diálogo de esta página. F8 no espera nada del backend ni de F11 |
| B | Un campo de contraseña que aparece sólo cuando la implementación de `ProgressBackup` que recibe la página dice que lo necesita. Hoy nunca aparece; con D1c sí | Código y textos sin consumidor hasta D1c (YAGNI). Los mensajes del 423, del 429 y del `epoch_mismatch` son de D1c, así que F8 los dejaría sin escribir o los inventaría |
| C | F8 pide la contraseña, la confirma y llama al reset del servidor, y después borra lo local | F8 pasa a depender de F11a (sesión, cliente de la API, CSRF y `X-Taller-User`) y tiene que leer `GET /api/progress` sólo para obtener la época: un cliente a medias que D1c tira. Borrar lo local viola el FR-074; no borrarlo deja al alumno con todo su progreso a la vista. Marca la cuenta con `resetAt` (cada importación posterior pide confirmación), gasta uno de los tres resets del día y deja «Borrar todo» sin funcionar sin servidor, un cambio visible en un port |

**Recomendada: A.** Antes de D1c, el reset del servidor borra un estado que el navegador no lee, y el borrado local que el alumno ve no pasa por el servidor. C rompe una regla de D1 o no borra nada visible, y B escribe hoy lo que D1c decide.

### Q2 · ¿F8 saca de `app.js` el armado de `features/progress-backup`?

**Qué encontramos.** En `f2b-acum`, `startApp()` (`frontend/app.js`) arma una sola instancia con `createProgressBackup`. Lee las cuatro áreas por `window` al llamarlas:

- `routeStore`;
- `TallerLab` (exportar, planificar, aplicar, borrar y respaldos);
- `TallerCampaignEngine` y `TallerSystemsEngine`;
- los dos `sync` como `syncDerivedSeals`.

Registra dos pasos de sesión: `window.TallerSystems?.resetSimulations()` y un cierre sobre el temporizador del recorrido. Con F9 el cierre pasa a ser `window.TallerRoute?.resetTimer()`.

La misma instancia exporta desde «Exportar mi progreso» de la barra lateral, que es del shell. El plan de F2b la deja así: «La página usa la misma instancia que arma el shell; los pasos de sesión ya están registrados».

Lo que dicen las specs vecinas:

- F5 (`resetSimulations` y el `sync` de `app.js`) y F7 (los métodos de respaldo de `TallerLab` y los dos `sync`) dicen «F10, o F8 si saca la composición de `app.js`».
- F9 dice que `resetTimer` lo retira F8 y que «la spec de F8 lo confirma».
- F5 midió que `app-shell-check` empaqueta `app.js` solo, y que si `app.js` importara una página traería un segundo motor.

| Opción | Qué es | Costo |
| --- | --- | --- |
| **A (recomendada)** | El armado se queda en `app.js` hasta F10. `app.js` le entrega a la página, al montarla, la misma instancia. F8 no retira ningún método de `window.Taller*` que «Borrar todo» o la importación usan: todos quedan hasta F10 (tabla «Qué queda en `window.Taller*`») | La spec de F9 se corrige (`resetTimer` queda hasta F10), y la hoja de ruta, en F5 («`resetSimulations` hasta F8» pasa a «hasta F10»). F8 depende sólo de F2b, y el orden de integración con F5, F7 y F9 no cambia nada |
| B | F8 lleva el armado a un módulo de `frontend/src/app/`, la capa de composición, que puede importar páginas. Importa los motores y el almacén del laboratorio como singletons y los reinicios de sesión desde la API pública de las páginas de Sistemas y del Recorrido. Se lo pasa a `app.js` (un parámetro de `startApp()`) y a la página | Sólo puede retirar `resetSimulations` y `resetTimer` si F5 y F9 ya se integraron; si no, conserva el camino por `window`. Cambia el contrato de `startApp()` que fijan F2a, A2, `boot-check` y `app-shell-check`. Mueve lógica que F10 vuelve a mover cuando arme la raíz única |

**Recomendada: A.** Es lo que planificó F2b y deja a F8 libre del orden de F5, F7 y F9. B cambia un contrato de arranque para adelantar retiros que F10 hace igual.

### Q3 · ¿Quién evita que dos «Borrar todo» o dos importaciones se solapen?

**Qué encontramos.** El plan de F2b (tabla «Lo que F5 a F8, F10, A2 y D1c toman de F2b», fila D1c) dice:

> «con la red, dos clics seguidos en «Borrar todo» o en importar pueden solaparse, cosa que en local no pasa (las esperas son microtareas que no cruzan un evento), así que su implementación o F8 tienen que impedirlo».

Con las áreas locales de hoy no hay forma de producirlo. Ningún E2E ni ninguna spec con las áreas reales lo puede mostrar.

| Opción | Qué es | Costo |
| --- | --- | --- |
| **A (recomendada)** | Lo resuelve D1c, junto con el estado visible de la espera que la red va a necesitar (un texto como «Borrando…», el botón deshabilitado y los errores). F8 conserva el comportamiento local de hoy | D1c lo tiene que recordar; ya figura en el plan de F2b y esta spec lo repite en «Relación con otros ítems» |
| B | F8 ignora una segunda activación mientras la primera no terminó, sin estado visible | Código que defiende un caso que en local no ocurre, probado sólo con un doble lento en una spec de componente. Con la red, un clic que no hace nada y no dice por qué |
| C | F8 deshabilita los botones y muestra un estado de espera ya | Un cambio visible y textos nuevos en un port, sin la red que los justifique |

**Recomendada: A.** En local no hay nada que impedir, y la forma correcta de esperar la decide quien trae la espera.

### Q4 · ¿Qué dice `#note-state` después de importar y de «Borrar todo»?

**Qué encontramos.** `#note-state` es el párrafo bajo la bitácora y tiene dos momentos:

- al dibujar la página dice si el almacenamiento está disponible («Tus notas se guardan automáticamente en este navegador.» o «El guardado no está disponible…»);
- después de escribir una nota dice si se guardó («Guardado. Tu próxima sesión ya tiene un punto de partida.» o «No se pudo guardar…»).

Hoy, después de importar con éxito y después de «Borrar todo», `render()` rehace la página, así que el párrafo vuelve a su texto inicial. Por el ruling C2, lo que existe sólo porque `innerHTML` rehace la vista adopta el comportamiento de React: con la página sin remontarse, el párrafo conservaría el último texto. Pero acá ese texto habla de algo que la acción acaba de cambiar.

| Opción | Qué es | Costo |
| --- | --- | --- |
| **A (recomendada)** | Conservar lo de hoy: después de importar y de «Borrar todo», el párrafo vuelve a su texto inicial | Una excepción explícita a C2, que la página implementa: no le alcanza con no remontarse. Si el usuario la elige, C2 queda leído como «estado que dejó el alumno», no como «todo lo que la reconstrucción reinicia» |
| B | El comportamiento de React: queda el último texto que mostró | Después de «Borrar todo», con las notas recién borradas, puede decir «Guardado. Tu próxima sesión ya tiene un punto de partida.», que es falso. Y si el almacenamiento dejó de estar disponible, el alumno deja de ver el aviso inicial que se lo dice. Su E2E falla contra el legacy y va en el commit en rojo |

**Recomendada: A.** El párrafo es un aviso sobre la última escritura de una nota, no un estado que el alumno eligió, y después de borrar todo el aviso viejo miente.

## Lecturas de las reglas del clarify

No son decisiones nuevas: es cómo esta spec aplica reglas generales ya decididas. Ya están aplicadas en el texto de abajo, y el usuario puede corregirlas.

- **X1 y C2: lo que adopta el comportamiento de React.** Hoy, después de una importación exitosa y después de confirmar «Borrar todo», `app.js` llama a `render()`, que rehace la página. El elemento que tenía el foco desaparece y el foco cae al documento. Con React la página no se reconstruye, y eso da dos cambios aceptados, cuyos E2E se escriben con el comportamiento nuevo y van en el commit en rojo:
  - después de importar con éxito, el foco sigue en «Importar una copia»;
  - después de confirmar «Borrar todo», vuelve a «Borrar mi progreso», que abrió la confirmación.

  (FR-019 y FR-023.) La página no se remonta, pero lo que muestra cambia igual: la bitácora muestra las notas que quedaron, el pedido se recalcula y el panel de respaldos se vuelve a leer (después de «Borrar todo» desaparece).
- **C2: las rarezas de lógica se conservan** (tabla de «Método de hoy»). El texto de `#note-state` después de importar y de «Borrar todo» no es una lectura: va al clarify como Q4, porque la recomendada se aparta de C2.
- **X2: no hay caso en Método.** Método no usa ninguna región viva que se recree:
  - `#toast` es estático y es del shell;
  - `#note-state` es un párrafo sin rol;
  - el diálogo no anuncia.

  F8 no suma ninguna región viva: hacerlo cambiaría lo que anuncia un lector de pantalla. (FR-034)
- **F9-Q4 aplicada a la confirmación.** El usuario decidió que el diálogo de la lección (F9) y la confirmación del laboratorio (F7) viven dentro de la raíz de su página, con un portal a `body`, y se cierran al navegar. Esta spec aplica lo mismo a la confirmación de «Borrar todo», que hoy es un `<dialog>` estático de `index.html`. (FR-021)
- **X3 y C3: el bloque de 1 150 px también se parte.** El bloque de 590 px y la regla de impresión los nombra el ruling. Método tiene además `.method-grid` dentro de `@media (max-width: 1150px)`, que comparte con la Biblioteca (`.search-wrap`). Ese bloque se parte igual, por el primero que llegue. (FR-037)

## Método de hoy, en `f2b-acum@2b37caf4`

Es el contrato que el port conserva. Las funciones son las de `frontend/app.js`, dentro de `startApp()`, salvo que se diga otra cosa.

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
| «Borrar todo» (`#confirm-reset`) | `await progressBackup.resetAll()`, que borra en orden el recorrido, el laboratorio, campaña y Sistemas y después corre los pasos de sesión: las simulaciones y el temporizador. Después, `save()`, el cierre del diálogo, `render()` y el aviso | «Progreso reiniciado. Un nuevo comienzo.» o «No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.» |

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
| Sin acceso al almacenamiento, «Borrar todo» avisa «Progreso reiniciado. Un nuevo comienzo.» aunque no había nada que borrar | `resetAll` | FR-022 |
| El tamaño de un respaldo son caracteres sobre 1 024, con un decimal y punto («0.0 KB»), no bytes | `backupsPanel` | FR-020 |

**El estado que la reconstrucción descarta hoy** no está en la tabla: el foco después de importar y de «Borrar todo» adopta el comportamiento de React (X1, «Lecturas»).

## El corte en `app.js`

**Se retira** todo en el commit que monta la página, por la regla de los delegados:

| Qué | Por qué |
| --- | --- |
| `renderMethod`, `backupsPanel`, `tutorPrompt`, `copyPrompt` y `downloadBackup` | Los reemplaza la página |
| En el delegado de clic, las ramas `copy-prompt`, `download-backup`, `export`, `import` y `reset`; en el de entrada, `data-note` (con sus escrituras en `#note-state` y `#tutor-prompt`) | Para no manejar un evento dos veces |
| En `render()`, la rama `metodo: renderMethod` | Pasa a un `mount`, con su `unmount` junto a los otros |
| Los oyentes de `#cancel-reset`, `#confirm-reset` e `#import-file`, y los imports de `assertImportSize` e `importFailureNotice` | La confirmación y la importación son de la página |
| En `frontend/src/index.html`, `<dialog id="confirm-dialog">…</dialog>` y `<input id="import-file">` | Pasan a la página (FR-012 y FR-021) |
| En los arneses `qa/lib/app-shell-harness.ts` y `boot-harness.ts`, los ids `confirm-dialog`, `cancel-reset`, `confirm-reset` e `import-file` | Ya no existen en el marcado estático |

**Queda en el shell, con quién lo retira:**

| Qué | Lo retira | Por qué |
| --- | --- | --- |
| `exportProgress` y el oyente de `#export-progress` | F10 | Es el botón de la barra lateral y funciona en las ocho vistas. El escenario 4 de la US4 de F9 exporta desde ahí. La hoja de ruta lo pone en el «Borra» de F8 por error (hallazgo) |
| El armado de `createProgressBackup`, con sus áreas y sus pasos de sesión (Q2) | F10 | Lo usa el botón de la barra lateral, y sus áreas leen `window` |
| `routeState`, `save`, `updateSaveLabel`, `toast`, `syncShell`, `languageName`, `render()`, la navegación y el cambio de idioma | F10 | Son del shell |
| `escapeHtml` y el import de `downloadBlob` | `escapeHtml`, cuando lo deje de usar la última página legacy (F3, F4 y F9); `downloadBlob`, F10, con `exportProgress` | Los usan otras páginas legacy y la exportación de la barra lateral |

**El adaptador mínimo.** `window.TallerMethod` (nombre provisional) se publica desde `frontend/src/app/legacy/register-method.tsx` con sólo `mount` y `unmount`, que retira F10. Al montar:

- lee `getContent().guide` y le pasa a la página sus fuentes por props;
- recibe de `app.js` el `toast` del shell y la instancia de `progress-backup` (el plan elige la forma).

No importa `routeStore` (R4 de `seams-guard-check`): lo importa la página. Se evalúa antes que `app.js` en `legacy-views.ts` y en la tabla de `load-order-check`, y entra en `qa/lib/app-adapters.ts`.

## Qué queda en `window.Taller*` y hasta cuándo

Con la opción recomendada de Q2, F8 suma un global y no retira ningún método.

| Global y métodos | Quién los llama después de F8 | Lo retira |
| --- | --- | --- |
| `TallerMethod.mount` y `unmount` (nuevo) | `app.js:render` | F10 |
| `TallerSystems.resetSimulations` | El primer paso de sesión de `progress-backup`, en `app.js` | F10, cuando el armado salga de `app.js` (F5-Q1: «hasta que su composición salga de `app.js`») |
| `TallerRoute.resetTimer` (si F9 ya entró) o el cierre sobre el temporizador | El segundo paso de sesión, en `app.js` | F10. La spec de F9 dice F8, y se corrige |
| `TallerLab.exportState`, `planImport`, `applyImport`, `backups` y `reset` | El área `lab` de `progress-backup`, en `app.js`. Tras F7, `reset` también reinicia la sesión del laboratorio y aborta la ejecución | F10 (como dice la spec de F7) |
| `TallerCampaignEngine` y `TallerSystemsEngine` (los cinco métodos del respaldo) | Las áreas `campaign` y `systems`, en `app.js` | F10 |
| `TallerCampaign.sync` y `TallerSystems.sync` | `syncDerivedSeals` de las mismas áreas, después de importar | F10 |

Con la opción B de Q2, F8 retiraría `resetSimulations` y `resetTimer` sólo si F5 y F9 ya se integraron, y las áreas pasarían a importar sus singletons.

## Qué cambia en `dist/index.html`

| Qué | ¿Cambia? | Por qué |
| --- | --- | --- |
| `dist/content/curriculum.<versión>.json` | No | `content/` y el generador no cambian |
| El marcado de `frontend/src/index.html` | Sí, dos elementos | Salen `<dialog id="confirm-dialog">` y `<input id="import-file">`. Quedan iguales los ids, el menú, los conteos, `#save-label`, `#export-progress` y `#toast` |
| `<style>` | Sí, el orden | Unas 23 reglas de Método salen de `styles.css` y entran, enteras y en el orden de hoy, en la hoja de la página (X3). El conjunto de reglas es el mismo, salvo que la del `style=` pasa a una clase |
| `<script type="module">` | Sí | Sale código de `app.js`; entran la página, su modelo y el adaptador. `useStore` de Zustand ya está instalado desde F2a |
| El tamaño | Se informa | No se midió para esta spec: `f2b-acum` no tiene un `dist/`. La spec de F9 midió 1 136 702 caracteres en el `dist` de `f2a`, y el plan de F2b estima +4 266 para toda F2b. El tope de `qa/build-check` (`BOOT_SIZE_LIMIT`) es 1 250 000 |
| Los avisos de licencia | No | Ninguna dependencia de ejecución nueva |

## Cómo se demuestra que nada cambió

| Qué se afirma | Cómo se demuestra | Requisitos |
| --- | --- | --- |
| Los enlaces, las recargas, el arranque, las ocho vistas por hash y las seis formas de URL siguen igual | Los 106 E2E de F1 y los 17 de A2, sin editar | FR-002 |
| Los flujos de Método (bitácora, pedido, exportar, importar, «Borrar todo» y respaldos) | E2E nuevos con un Page Object, en verde contra el legacy antes de portar y sin editar después. Los de los dos cambios aceptados fijan el comportamiento nuevo | FR-001 y FR-040 |
| El archivo exportado y lo que acepta la importación | El E2E de la descarga fija el nombre, la sangría, el orden de las claves y el contenido, y el de la carga importa las dos exportaciones congeladas y fija lo guardado. Los dos corren contra el legacy y contra el port. `create-progress-backup.spec` sigue en verde sin editar | FR-016, FR-017 y FR-031 |
| La lógica y los componentes | Specs de Vitest (modelo en `node`, componentes en `jsdom`), con valores escritos a mano desde `content/guide/` y las fixtures | FR-039 |
| El DOM y los textos | Una comparación única del HTML del legacy contra la página, sobre una grilla de estados | FR-035 y FR-042 |
| El aspecto | El barrido de estilo computado y el multiconjunto de reglas del dist de la unidad 8 de F2b, con 0 diferencias, también en impresión | FR-036 y FR-037 |
| Lo guardado | Las fixtures congeladas arrancan sin escribir; `storage.watchWrites()` cuenta 0 y 1 escrituras. `route-progress-check`, `versioned-storage-check` y `curriculum-ids-check` siguen en verde | FR-031 y FR-032 |
| El retiro de `app.js` | `grep` en 0, los checks adaptados con la correspondencia de cada escenario, y `seams-guard-check` en 0 violaciones | FR-010 y FR-041 |

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
6. **Dado** una importación exitosa, **cuando** termina, **entonces** el foco sigue en «Importar una copia» (cambio aceptado por X1: hoy cae al documento) y `#note-state` muestra su texto inicial (Q4).

*Cubre: FR-013, FR-016 a FR-019 y FR-031 a FR-033; SC-002 y SC-003.*

---

### User Story 3 - «Borrar todo» pide confirmación y deja el taller en blanco como hoy (Priority: P1)

El alumno quiere empezar de cero. Abre la confirmación, puede arrepentirse y, si confirma, todo su progreso de este navegador se borra.

**Why this priority**: es la acción más destructiva del taller y la única que toca los cuatro almacenes y las sesiones de otras vistas. Su orden de efectos lo fija hoy un check que pierde su punto de entrada.

**Independent Test**: con el progreso congelado de master y una ranura de respaldo sembrada, abrir la confirmación, cancelarla por botón y por Esc, confirmar y revisar el almacenamiento, la barra lateral, la página y el foco.

**Acceptance Scenarios**:

1. **Dado** `#metodo`, **cuando** se usa «Borrar mi progreso», **entonces** se abre un diálogo modal nombrado «¿Borrar tu progreso?», con su párrafo, «Conservar mi avance» y «Borrar todo», y el foco queda donde lo pone hoy el navegador (se espera «Conservar mi avance»; lo fija el E2E contra el legacy).
2. **Dado** el diálogo abierto, **cuando** se cierra con «Conservar mi avance» o con Esc, **entonces** no se escribe nada y el foco queda donde lo devuelve hoy el navegador al cerrar un `<dialog>` modal (se espera «Borrar mi progreso»; lo fija el E2E contra el legacy).
3. **Dado** el diálogo abierto, **cuando** el alumno usa Tab y Mayús+Tab, **entonces** el foco no sale del diálogo; un clic en el fondo no lo cierra.
4. **Dado** el progreso congelado de master y una ranura `:respaldo`, **cuando** se confirma «Borrar todo», **entonces**:
   - el aviso dice «Progreso reiniciado. Un nuevo comienzo.»;
   - `taller-laboratorio-v1`, `taller-campaign-v1`, `taller-systems-v1` y todas las ranuras `:respaldo` quedan borradas;
   - `taller-learning-v1` queda escrita con el recorrido en blanco (idioma Rust, 25 minutos; `KNOWN DEFECT`, FR-022);
   - la página muestra «Tu bitácora de Rust.» con los campos vacíos y sin el panel de respaldos;
   - la barra lateral dice «RUST» y «0 de 12».
5. **Dado** lo anterior, **cuando** se cierra el diálogo, **entonces** el foco vuelve a «Borrar mi progreso» (cambio aceptado por X1: hoy cae al documento).
6. **Dado** un motor que no pudo borrar su clave, **cuando** se confirma, **entonces** el aviso dice «No se pudo borrar todo el progreso guardado. Recargá la página y volvé a intentarlo.» (spec de componente con un doble de `ProgressBackup`; en el navegador no se puede provocar).

*Cubre: FR-021 a FR-025 y FR-031 a FR-033; SC-002 y SC-004.*

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

### User Story 6 - `app.js` pierde Método, la barra lateral sigue exportando y los ports se integran de a uno (Priority: P2)

Quien mantiene el front encuentra Método en una página con su modelo y sus pruebas, y `app.js` sin lo suyo. Quien integra F3, F4, F5, F7 y F9 sabe qué toca cada uno.

**Why this priority**: deja el camino libre a F10, pero no cambia nada para el alumno.

**Independent Test**: `grep` sobre `frontend/app.js` y `frontend/src/index.html`, `seams-guard-check`, `load-order-check`, `boot-check` y `app-shell-check` con el adaptador nuevo, y la tabla de correspondencia de escenarios.

**Acceptance Scenarios**:

1. **Dado** `frontend/app.js` después del port, **cuando** se buscan los términos de FR-010, **entonces** no hay ninguna aparición, y `exportProgress` y el oyente de `#export-progress` siguen.
2. **Dado** cada una de las ocho vistas, **cuando** se usa «Exportar mi progreso» de la barra lateral, **entonces** se descarga la copia con el aviso de hoy.
3. **Dado** el adaptador, **cuando** se evalúa sin llamar a `startApp()`, **entonces** no toca el almacenamiento, no registra oyentes ni intervalos y publica sólo `mount` y `unmount`.
4. **Dado** cada escenario de `app-shell-check` o de `boot-check` que cambia, **cuando** se lee la tabla del PR, **entonces** figura cubierto por una spec o un E2E, o descartado con su motivo, y el orden de los efectos de «Borrar todo» sigue afirmado por algún check.

*Cubre: FR-010 a FR-015, FR-041, FR-043 y FR-044; SC-006 y SC-010.*

---

### Edge Cases

- **Almacenamiento bloqueado:** la página funciona.
  - La bitácora vive en memoria hasta recargar.
  - Exportar descarga el estado en memoria.
  - Importar aplica en memoria y avisa «Copia importada en esta sesión, pero no se pudo guardar: … Exportá tu avance para conservarlo.».
  - «Borrar todo» avisa éxito (rareza).
- **Almacenamiento que lee pero no escribe:** la primera tecla cambia `#note-state` a «No se pudo guardar…» y el pie a «Exportá para conservar tu avance».
- **Entrar directo a `#metodo` y borrar todo:** ni el Recorrido, ni Sistemas, ni el laboratorio se montaron. Sus pasos de sesión no lanzan: es el contrato de sus dueños (F9 FR-031, F5 FR-017 y F7 FR-021), y hoy también vale.
- **Se cancela el selector de archivos:** no hay archivo y no pasa nada.
- **Cambiar de idioma con Método abierto:** el shell remonta la página como hoy, con la bitácora del otro idioma y `#note-state` en su texto inicial.
- **Atrás o Adelante con la confirmación abierta:** hoy sigue abierta sobre la vista nueva; ahora se cierra con la página (F9-Q4, «Lecturas»). Ese caso queda sin E2E, como el de la lección en F9.
- **Otra pestaña guardó entre dos teclas:** `routeStore.save()` fusiona y el estado vivo puede cambiar de objeto. La página lo vuelve a leer en cada render y en cada manejador, y no escucha el evento `storage`, como hoy.
- **Una nota de 20 000 caracteres:** el campo no deja escribir más, como hoy.
- **El portapapeles negado y `execCommand` sin efecto:** el pedido queda seleccionado y el aviso lo dice.
- **Fuentes o notas con HTML:** se muestran como texto, nunca como marcado (hoy las escapa `escapeHtml`).
- **Dos clics seguidos en «Borrar todo» o dos importaciones:** en local no se solapan; con la red es de D1c (Q3).
- **El contenido no llega (A2):** la página no se monta; la compuerta muestra su error.
- **Imprimir:** los botones de datos (`.data-actions`) no se imprimen, como hoy.

## Requirements *(mandatory)*

### Functional Requirements

**Reglas de todo port** *(salen de la hoja de ruta y de la spec de F2)*

- **FR-001**: El PR DEBE abrir con los E2E de comportamiento de Método (US1 a US5), escritos con un Page Object contra la vista legacy y en verde antes de portar. Esos E2E DEBEN pasar sin editarse sobre la página nueva.
  - Los dos que fijan un cambio aceptado por X1 (el foco después de importar y después de «Borrar todo», FR-019 y FR-023) se escriben con el comportamiento nuevo, fallan contra el legacy por esa razón y van en el commit en rojo del TDD.
  - Si hay que editar cualquier otro, es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario.

  *(Hoja de ruta, «E2E primero»; ADR 0008, §3; clarify de F1, Q1; X1)*
- **FR-002**: Los 106 E2E de F1 y los 17 de A2 DEBEN pasar sin editarse con el build de F8. *(Hoja de ruta, criterios de aceptación globales)*
- **FR-003**: F8 NO DEBE agregar dependencias de ejecución ni estilos en línea (`style=`, `setAttribute('style', …)` ni `style.cssText`), salvo la excepción declarada de FR-036, que ya existe hoy. Las dependencias de desarrollo que piden la primera spec de componente (`jsdom` y Testing Library) y la primera factory (`fishery`) entran sólo con el permiso del usuario, con su peso medido, y sólo si ningún ítem anterior las instaló. *(`AGENTS.md`; hoja de ruta, «Acciones del usuario»)*
- **FR-004**: `dist/index.html` DEBE conservar la forma que fija A2: un solo documento, con un script y un estilo en línea, y el contenido en su propio archivo. DEBE quedar bajo el tope de `qa/build-check` (`BOOT_SIZE_LIMIT`, 1 250 000 caracteres), y el PR informa su tamaño antes y después.
- **FR-005**: Ninguna función nueva DEBE superar 10 de complejidad sin justificarlo en la revisión, y el total de avisos de `npm run lint` no sube. *(Hoja de ruta, criterios globales; `docs/architecture.md`)*
- **FR-006**: F8 DEBE entregarse como un solo PR que se puede revertir entero y devuelve la vista legacy (`renderMethod`, el diálogo y el selector estáticos y sus oyentes) con la red de F1 en verde. Cada cambio de comportamiento DEBE empezar con una spec que falla por la razón esperada. *(Hoja de ruta, «Un PR por vista»; constitución, principio II)*

**Alcance y retiro**

- **FR-007**: La página DEBE dibujar lo que hoy dibuja `renderMethod`, con `backupsPanel`, en el orden de «Método de hoy». También DEBE dibujar la confirmación de «Borrar todo» y el selector de archivo oculto, que hoy están en `index.html`.
- **FR-008**: La página DEBE montarse con una raíz de React sobre `#main`, como el Atlas: `app.js` la desmonta junto con las otras vistas antes de escribir `#main` y la monta cuando la vista es `metodo`. Cuando `mount` vuelve, la página ya está dibujada. Si la página lanza al dibujarse, el adaptador lo registra con `console.error` y un mensaje en español, como el del Atlas.
- **FR-009**: La página DEBE recibir las fuentes de la guía por props desde su adaptador, que las lee de `getContent().guide` al montar. NO DEBE leer `window` ni importar `getContent()`. *(Spec de F2, FR-015; A2, F2-I6)*
- **FR-010**: DEBE salir de `app.js` todo lo que dice «Se retira» en «El corte en `app.js`». `frontend/app.js` NO DEBE contener `renderMethod`, `backupsPanel`, `tutorPrompt`, `copyPrompt`, `downloadBackup`, `confirm-dialog`, `cancel-reset`, `confirm-reset`, `import-file`, `data-note`, `copy-prompt` ni `download-backup`. Lo que dice «Queda en el shell» se conserva.
- **FR-011**: Las ramas de Método en los delegados de `#main` y los oyentes de `#cancel-reset`, `#confirm-reset` e `#import-file` DEBEN salir en el mismo commit que monta la página, para no manejar un evento dos veces. *(Hoja de ruta, reglas de todo port)*
- **FR-012**: `<dialog id="confirm-dialog">` e `<input id="import-file">` DEBEN salir de `frontend/src/index.html`. El resto del marcado estático NO DEBE cambiar.
- **FR-013**: «Exportar mi progreso» de la barra lateral DEBE seguir funcionando en las ocho vistas, con el mismo archivo y el mismo aviso. Su oyente y `exportProgress` se quedan en `app.js` hasta F10. «Exportar progreso» de la página DEBE producir el mismo archivo y el mismo aviso, sin una segunda copia de cómo se arma y se descarga el archivo; el plan elige cómo lo comparten.
- **FR-014**: El adaptador mínimo DEBE ser `window.TallerMethod` (nombre provisional), publicado desde `frontend/src/app/legacy/`, con sólo `mount` y `unmount`, que retira F10.
  - DEBE evaluarse antes que `app.js` en `legacy-views.ts` y quedar fijado en la tabla de `load-order-check`.
  - `qa/lib/app-adapters.ts` DEBE sumar sus métodos.
  - Evaluarlo NO DEBE tocar el almacenamiento, abrir un almacén, registrar oyentes ni crear intervalos.
  - NO DEBE importar `routeStore` (R4 de `seams-guard-check`).

  *(Spec de F2, FR-021; A2, F2-I1 y F2-I4)*
- **FR-015**: `[NEEDS CLARIFICATION: Q2, se escribe con la opción A]` El armado de `features/progress-backup` DEBE quedarse en `app.js`. La página DEBE usar la instancia que `app.js` le entrega al montarla: NO DEBE crear otra, importar los motores ni leer `window`. Los métodos de `window.Taller*` que usan las áreas y los pasos de sesión quedan hasta F10 (tabla «Qué queda en `window.Taller*`»). *(Plan de F2b, «Lo que F5 a F8… toman de F2b»; spec de F2, FR-051)*

**Exportar, importar y respaldos**

- **FR-016**: Exportar DEBE descargar lo que devuelve `exportProgress()` de la feature, sin cambiar un byte:
  - el nombre `taller-progreso-AAAA-MM-DD.json`;
  - el tipo `application/json`;
  - el JSON con dos espacios y el orden de claves de hoy.

  Después DEBE mostrar «Copia de progreso exportada.». El formato es contrato con D1b, que lo importa como `source: export`. *(ADR 0003; contrato de D1b, §3.2)*
- **FR-017**: Importar DEBE seguir el flujo de hoy:
  - «Importar una copia» abre el selector de un campo de archivo oculto, con el mismo `accept` (`application/json,.json`) y el mismo nombre accesible;
  - sin archivo, no pasa nada;
  - el tamaño se comprueba antes de leer (`assertImportSize`);
  - el texto del archivo llega sin tocar a `planImport` (sin recortar ni recodificar), y después se espera `applyImport`;
  - el aviso es el de la importación o, en un error, el de `importFailureNotice`;
  - en los dos caminos, el campo se vacía al final, para que el mismo archivo se pueda volver a elegir.

  *(Spec de F2, FR-049 y FR-050)*
- **FR-018**: Después de una importación exitosa, sin remontarse, la página DEBE mostrar el estado nuevo: las notas que quedaron en la bitácora, el pedido recalculado y el panel de respaldos vuelto a leer. `[NEEDS CLARIFICATION: Q4, se escribe con la opción A]` `#note-state` DEBE volver a su texto inicial.
- **FR-019**: Después de una importación exitosa, el foco DEBE seguir en «Importar una copia». Es un cambio aceptado: hoy la página se reconstruye y el foco cae al documento. Su E2E se escribe con el comportamiento nuevo (FR-001). Se espera que siga donde lo dejó el clic, porque abrir el selector no lo mueve; nadie lo verificó todavía. Si el navegador lo mueve al cerrar el selector, la página lo devuelve al botón. *(X1 y C2)*
- **FR-020**: El panel de respaldos DEBE seguir las reglas de hoy:
  - aparece sólo si hay ranuras, antes de «Tu progreso te pertenece.»;
  - cada ranura muestra «área · clave · N.N KB» (caracteres sobre 1 024, con un decimal; rareza) y un botón «Descargar» con el nombre accesible «Descargar respaldo de <área>: <clave>»;
  - el clic vuelve a leer la ranura (`readBackup`): si ya no está, no hace nada; si está, descarga su texto actual con el nombre de hoy y avisa «Respaldo descargado.».

  Después de «Borrar todo», el panel desaparece.

**«Borrar todo»**

- **FR-021**: La confirmación DEBE ser un `<dialog>` nativo y modal (`showModal()`), con lo siguiente:
  - nombrado por su título (`aria-labelledby`), con los textos, las clases y el orden de botones de hoy;
  - lo abre «Borrar mi progreso», y al abrir, el foco queda donde lo pone hoy el navegador (se espera «Conservar mi avance»; la página no agrega `autofocus`);
  - «Conservar mi avance» y Esc la cierran sin escribir, y el foco queda donde lo devuelve hoy el navegador (se espera «Borrar mi progreso»; lo fija el E2E contra el legacy);
  - el clic en el fondo NO la cierra;
  - el estado de React NO DEBE desincronizarse del diálogo nativo.

  DEBE vivir dentro de la raíz de la página, con un portal a `document.body`, y cerrarse con ella al desmontarse, también si el alumno navega. *(F9-Q4, aplicada en «Lecturas»)*
- **FR-022**: Al confirmar, la página DEBE esperar `resetAll()` y, después, en este orden:
  1. llamar a `routeStore.save()`, que vuelve a escribir el recorrido en blanco (rareza);
  2. cerrar el diálogo;
  3. mostrar el estado en blanco (la bitácora de Rust vacía y sin el panel de respaldos), sin remontarse;
  4. avisar con el texto que devuelve `resetAll()`.

  Dentro de `resetAll()`, el orden es el de hoy: el recorrido, el laboratorio, campaña, Sistemas, las simulaciones y el temporizador. *(Plan de F2b, §4.0, «El orden de los efectos»)*
- **FR-023**: Después de confirmar, el foco DEBE volver a «Borrar mi progreso». Es un cambio aceptado: hoy la página se reconstruye y el foco cae al documento. Su E2E se escribe con el comportamiento nuevo (FR-001).
  - Se espera que lo haga el navegador al cerrar el `<dialog>` modal, porque el botón que lo abrió sigue en el documento. Nadie lo verificó todavía.
  - Si el E2E contra el legacy muestra que el navegador no devuelve el foco al cerrar, la página lo devuelve explícitamente a «Borrar mi progreso» después de confirmar.
  - El camino de cancelar queda como lo fije su E2E contra el legacy (FR-021).

  *(X1 y C2)*
- **FR-024**: `[NEEDS CLARIFICATION: Q1, se escribe con la opción A]` «Borrar todo» DEBE ser el flujo local de hoy:
  - llama a `resetAll()` sin confirmación, sin pedir la contraseña y sin ningún pedido a la API;
  - funciona sin sesión y sin servidor;
  - NO DEBE quitarle a la interfaz de la feature el parámetro de confirmación que D1c va a usar.

  La confirmación de contraseña (superficie 4 de D1) la trae el ítem del front que integre D1c.
- **FR-025**: `[NEEDS CLARIFICATION: Q3, se escribe con la opción A]` F8 NO DEBE agregar un estado de espera, un botón deshabilitado ni una guarda contra una segunda activación mientras una importación o un «Borrar todo» están en curso. En local no se pueden solapar, y lo resuelve D1c con la espera de la red.

**La bitácora y el pedido al tutor**

- **FR-026**: La bitácora DEBE mostrar las notas del idioma activo en «Tu bitácora de Rust.» (o «de Go.»), con los dos campos de hoy: ids, etiquetas, `maxlength="20000"` y placeholders. Los valores salen de `routeStore`.
- **FR-027**: Cada tecla en un campo de la bitácora DEBE asignar el valor a `notes[idioma activo][campo]` y hacer una sola llamada a `routeStore.save()`, sin debounce, sin tocar las notas del otro idioma ni del otro campo, y sin otra instancia ni otra clave. *(Spec de F2, FR-026; hoja de ruta, reglas de todo port)*
- **FR-028**: `[NEEDS CLARIFICATION: Q4, se escribe con la opción A]` `#note-state` DEBE mostrar los textos de hoy:
  - al montar, según `routeStore.storageAvailable()`;
  - después de cada tecla, según si se pudo guardar;
  - después de importar con éxito y después de «Borrar todo», otra vez el texto inicial.

  DEBE seguir siendo un párrafo sin rol ni `aria-live`.
- **FR-029**: El pedido al tutor DEBE ser el texto de hoy, armado con el idioma activo, los minutos guardados y la nota «La próxima vez voy a…» del idioma activo (o «elegir un desafío pequeño del recorrido.»). DEBE recalcularse en cada tecla y después de importar o de «Borrar todo», y mostrarse como texto en el `blockquote` `#tutor-prompt`.
- **FR-030**: «Copiar pedido para mi tutor» DEBE intentar, en este orden:
  1. el portapapeles: «Pedido copiado. Pegalo en tu asistente.»;
  2. si falla, la copia con un campo temporal fuera de la pantalla y `execCommand('copy')`: «Pedido copiado.»;
  3. si eso falla, seleccionar el texto de `#tutor-prompt`: «Texto seleccionado. Usá Copiar en tu navegador.».

  Copiar no escribe nada.

**Progreso y shell**

- **FR-031**: El progreso DEBE leerse con `routeStore.getProgress()` en cada render y en cada manejador, nunca de una copia: ni `useState`, ni una ref, ni un contexto, ni un cierre. Un componente DEBE leer la revisión con `useStore(routeStore.changes, (state) => state.revision)`, nunca con el store entero. Lo que el formato guarda NO DEBE cambiar: las claves de `taller-learning-v1`, `version: 1` y el orden del JSON. *(Spec de F2, FR-026; plan de F2a, §3.0)*
- **FR-032**: Desde la página, sólo la bitácora DEBE escribir, una vez por tecla. Montar, desmontar, copiar, exportar, descargar un respaldo y abrir o cancelar la confirmación NO DEBEN escribir ni subir la revisión. Importar y «Borrar todo» escriben lo que escriben la feature y el `save()` de FR-022, nada más. Las tres fixtures congeladas DEBEN arrancar sin escribir, sin respaldar y sin avisar. *(ADR 0003)*
- **FR-033**: Después de cada escritura de la página, de una importación y de «Borrar todo», el shell DEBE mostrar el estado nuevo como hoy:
  - `#save-label`;
  - en la barra lateral, «N de 12», el porcentaje y la barra de progreso;
  - después de «Borrar todo», además, el idioma: «RUST», `aria-pressed` de los botones de idioma y `body[data-language]`.

  La página no conoce al shell. Hoy lo hacen `save()`, `updateSaveLabel()` y `render()`, de `app.js`. F8 reutiliza el mecanismo que cree el primero de F3, F4 y F9 (F3 FR-014, F4 FR-011 y F9 FR-022). Si ese mecanismo no cubre el idioma, F8 lo extiende; si F8 llega primero, lo crea.
- **FR-034**: Los avisos DEBEN salir por el `toast` del shell (`#toast`), que el adaptador recibe en `mount`, con los textos de hoy, hasta F10. F8 NO DEBE sumar regiones vivas. *(Hoja de ruta, F8, «Conserva»; X2, «Lecturas»)*

**El aspecto y la accesibilidad**

- **FR-035**: La página, el panel de respaldos y la confirmación DEBEN producir el mismo DOM que `renderMethod`, `backupsPanel` y el `#confirm-dialog` de hoy: etiquetas, clases, ids (`note-learned`, `note-next`, `note-state`, `tutor-prompt`, `confirm-dialog`, `confirm-title`, `cancel-reset`, `confirm-reset` e `import-file`), roles, `aria-*`, textos y orden. Las diferencias admitidas son:
  - los atributos de delegación que se retiran (`data-action`, `data-key` y `data-note`);
  - la clase que reemplaza al `style=` (FR-036);
  - el lugar del diálogo y del campo de archivo en el árbol;
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

- **FR-039**: Las specs nuevas DEBEN ser de Vitest. Los valores esperados se escriben a mano desde `content/guide/` y las fixtures.
  - **De modelo** (proyecto `node`): el texto del pedido al tutor y el del estado de la nota.
  - **De componente** (proyecto `jsdom`, con Testing Library, `userEvent` y consultas por rol y nombre accesible):
    - una escritura por tecla;
    - los tres caminos de la copia, con dobles del portapapeles y de `execCommand`;
    - importar y «Borrar todo» contra un doble de `ProgressBackup` que registra sus llamadas: el orden de FR-022, el aviso de fallo y una nota con HTML que se muestra como texto.

  Como jsdom no trae `showModal()` ni `close()` (ADR 0008), una spec que sólo necesita el diálogo define un stub, y el foco, Esc y el fondo se prueban en E2E.
- **FR-040**: Los E2E nuevos DEBEN usar un Page Object de Método (`qa/e2e/pages/method.ts` y su fixture `method`, provisionales; si F5, F7 o F9 ya crearon uno mínimo para su «Borrar todo», F8 lo amplía), con localizadores por rol y nombre accesible. Cubren US1 a US5:
  - la bitácora con `storage.watchWrites()`;
  - el pedido y la copia, con el portapapeles permitido;
  - la exportación desde la página y desde la barra lateral: el evento `download` con `page.clock` fijo, el nombre, la sangría, el orden de las claves y el contenido comparado con la fixture sembrada;
  - la importación por el evento `filechooser`, que no depende de dónde esté el campo, con las dos exportaciones congeladas y los tres archivos inválidos;
  - «Borrar todo», con el almacenamiento, la barra lateral, la página y el foco;
  - los respaldos, con una clave ilegible sembrada;
  - el teclado de la confirmación.

  Cada rareza de «Método de hoy» lleva `KNOWN DEFECT` en el nombre de su prueba; los dos cambios de foco, no.
- **FR-041**: Los checks de `qa/` que cargan `app.js` DEBEN cambiar sólo cómo cargan o qué observan, no sus valores esperados:
  - **`app-shell-check`:** sus 38 escenarios de importar, formato, archivo, atomicidad, «Borrar todo», áreas asíncronas, seguridad, almacenamiento sin escritura y respaldos pierden su punto de entrada en `app.js`. Cada uno pasa a la spec de la feature, a una spec de componente o a un E2E, o se descarta con su motivo. Los dos de exportar siguen, porque exportan por la barra lateral. La nota del escenario «almacén» la comparten F3, F8 y F9.
  - **`boot-check`:** la navegación a `#metodo` lee nodos de React; «borrar todo» y las dos «importación: <fixture>» se adaptan.
  - **`load-order-check`, `app-adapters.ts` y los ids de los dos arneses** también se adaptan.

  El orden de los efectos de «Borrar todo» (cuatro almacenes, simulaciones, temporizador, `save()`, cierre, redibujo y aviso) DEBE seguir afirmado por algún check. El PR DEBE listar la correspondencia de cada escenario que cambia o se retira. *(ADR 0008, §5; plan de F2b, §4.6)*
- **FR-042**: Una comparación única, no permanente, DEBE comparar el DOM de `#main` y de la confirmación del legacy contra el del port sobre una grilla de estados:
  - los dos idiomas, con y sin notas;
  - con y sin ranuras de respaldo;
  - con la confirmación abierta;
  - con el almacenamiento disponible y bloqueado.

  Informa estados, elementos y diferencias, con las admitidas de FR-035. También registra que el archivo exportado tiene los mismos bytes en los dos builds. *(Precedente: spec de F2, FR-011)*

**La integración**

- **FR-043**: F8 DEBE integrarse de a uno con F2b (si alguna unidad todavía no entró), F3, F4, F5, F7, F9 y F10, que comparten:
  - `app.js`: los delegados, `render()`, `startApp()` y los pasos de sesión;
  - `index.html`;
  - `legacy-views.ts`, `load-order-check`, `app-adapters.ts` y los arneses;
  - los bloques compartidos de `styles.css`;
  - la suscripción del shell, la pila de DOM de Vitest y el Page Object de Método.

  El que llega después rebasa. *(Hoja de ruta, «Orden y paralelismo»)*
- **FR-044**: En el mismo PR, `docs/architecture.md` (la fila de Método y la de `features/progress-backup`: lo que sigue en `app.js` hasta F10) y `qa/AGENTS.md` DEBEN reflejar el cambio. Los integra el agente principal. *(`AGENTS.md`)*

### Key Entities *(include if feature involves data)*

- **Bitácora:** las dos notas por idioma («Lo que entendí / lo que todavía me cuesta» y «La próxima vez voy a…»), en `notes.<idioma>.learned` y `notes.<idioma>.next` de `taller-learning-v1`. Se escriben en cada tecla.
- **Estado de la nota:** el párrafo `#note-state`, que dice si las notas se guardan. No se guarda.
- **Pedido al tutor:** un texto derivado del idioma, los minutos y la nota «La próxima vez». No se guarda.
- **Copia de progreso (archivo exportado):** el JSON v1 con el recorrido en la raíz, más `lab`, `campaign`, `systems` y `exportedAt`. Lo arma `features/progress-backup`, lo importa Método y lo importa D1b como `source: export`.
- **Importación:** una copia planificada entera antes de aplicar nada y aplicada después, sección por sección, con un aviso que nombra lo que no se guardó o se omitió.
- **«Borrar todo»:** el borrado de los cuatro almacenes y sus respaldos, más los pasos de sesión de sus dueños (las simulaciones y el temporizador). Antes de D1c es sólo local.
- **Ranura de respaldo:** el texto original que un almacén guardó en `<clave>:respaldo` cuando no pudo leerlo (ADR 0003).
- **Instancia de `progress-backup`:** la única, la que arma `app.js` (Q2); la usan la barra lateral y la página.
- **Adaptador mínimo:** el `window.TallerMethod` que `app.js` lee hasta F10.
- **Comparación única:** la corrida, una vez en el PR, que compara el DOM o el estilo del legacy con los del port.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los 106 E2E de F1 y los 17 de A2 pasan con el build de F8, con 0 escenarios editados y 0 fallas.
- **SC-002**: Cada escenario de aceptación de US1 a US5 tiene una prueba que lo ejerce. Los E2E nuevos pasan contra el legacy antes del port y sin editarse después, salvo los dos de los cambios aceptados, que fallan contra el legacy y pasan contra la página: 100 %.
- **SC-003**: El archivo exportado desde la fixture congelada de master con el reloj fijo cumple en los dos builds lo que fija el E2E (nombre, sangría, orden de claves y contenido), y la comparación única registra los mismos bytes. Importar cada una de las dos exportaciones congeladas deja las claves con los valores que fija el E2E, en los dos builds.
- **SC-004**: Con las fixtures congeladas, montar Método, copiar, exportar, descargar un respaldo y abrir y cancelar la confirmación dan 0 escrituras, 0 claves `:respaldo` nuevas y 0 avisos. Cada tecla de la bitácora da exactamente 1 escritura de `taller-learning-v1`.
- **SC-005**: El multiconjunto de declaraciones del CSS del dist tiene 0 diferencias contra el de la base (mismo conjunto, otro orden, con la regla que reemplaza al `style=` como única nueva). El barrido de estilo computado de FR-037 da 0 diferencias, y el marcado que dibuja la página tiene 0 `style=` (la excepción declarada de FR-036 es el campo temporal de la copia, fuera de la página).
- **SC-006**: `frontend/app.js` tiene 0 apariciones de los términos de FR-010. `index.html` pierde 2 elementos y nada más. El adaptador publica 2 métodos, `seams-guard-check` da 0 violaciones y «Exportar mi progreso» funciona en las 8 vistas.
- **SC-007**: La comparación única del DOM da 0 diferencias, salvo las admitidas de FR-035.
- **SC-008**: `dist/index.html` queda bajo 1 250 000 caracteres, con su tamaño antes y después informados.
- **SC-009**: El total de avisos de complejidad no sube de 35, la cuenta del plan de F2b.
- **SC-010**: El 100 % de los escenarios de `app-shell-check` y de `boot-check` que cambian figura en la tabla de correspondencia, y el orden de los efectos de «Borrar todo» queda afirmado por al menos un check.
- **SC-011**: El código nuevo tiene 0 llamadas a `useStore` sin selector (una regla de lint o una revisión explícita).
- **SC-012**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan, y la imagen web sigue construyendo.

## Riesgos

1. **Borrar el manejador de la barra lateral.** La hoja de ruta pone `#export-progress` en el «Borra» de F8, pero es el botón del shell en las ocho vistas. *Mitigación:* FR-013 y el escenario 2 de US6.
2. **El orden de «Borrar todo» pierde su check.** Hoy lo fija el escenario «borrar todo» de `boot-check`, que hace clic en un `#confirm-reset` estático que deja de existir. *Mitigación:* FR-041 y SC-010. La spec de la feature ya fija el orden dentro de `resetAll()`, y una spec de componente fija lo que viene después de la espera.
3. **La bitácora no muestra lo importado.** Un campo que no lee el valor en cada render (por ejemplo, con `defaultValue`) se queda con la nota vieja si la página no se remonta. *Mitigación:* FR-018 y el escenario 3 de US2.
4. **Dos comportamientos cambian a propósito.** El foco después de importar y después de «Borrar todo» (X1). *Mitigación:* FR-019 y FR-023, con E2E que fijan lo nuevo.
5. **Mudar unas 23 reglas puede cambiar la cascada.** `styles.css` se evalúa primero, y el multiconjunto no ve la cascada: en la unidad 8 de F2b, el control negativo dio 702 diferencias con 0 en el multiconjunto. *Mitigación:* FR-037, con el barrido ampliado y la impresión.
6. **Lo que jsdom no hace.** No trae `showModal()` ni `close()`, ni un portapapeles real. *Mitigación:* el foco, Esc, el fondo y el portapapeles van en E2E; las specs de componente usan dobles (FR-039).
7. **D1c va a tocar esta página.** La contraseña de «Borrar todo», la espera de la red y sus errores son de D1c (Q1 y Q3) y caen sobre el diálogo de F8. *Mitigación:* la interfaz conserva el parámetro de confirmación (FR-024), y la hoja de ruta asigna la superficie 4 a un ítem con D1c.
8. **Conflictos en `app.js`, `index.html` y `styles.css`.** F2b, F3, F4, F5, F7, F9 y F10 tocan las mismas regiones. *Mitigación:* FR-043 y la tabla de «Relación con otros ítems».
9. **El texto de `#note-state` se aparta de C2 (Q4).** Si el usuario elige el comportamiento de React, cambian FR-018 y FR-028, y el escenario 6 de US2 pasa a ser un tercer E2E en rojo.
10. **Nada se ejecutó al especificar.** Sin `npm`, sin Docker, sin navegador y sin `dist/`. Las cuentas salen de leer el código de `f2b-acum`. *Mitigación:* el plan las vuelve a medir sobre la base de implementación.

## Relación con otros ítems

| Ítem | Qué comparte con F8 | Qué hace F8 y en qué orden |
| --- | --- | --- |
| F2a (PR #40) | `routeStore` y su `changes`, `startApp()`, `getContent()` y el guard | Los usa; no los cambia |
| F2b, unidades 6 y 8 | `features/progress-backup` y su armado en `app.js`; el barrido de estilo computado y el multiconjunto | **Es la única dependencia real.** Usa la feature tal cual y reutiliza las dos comparaciones. Rebasa sobre la unidad que llegue después |
| [A2](../006-a2-compuerta-arranque/spec.md) | `legacy-views.ts`, `load-order-check` y `getContent().guide` | Suma una línea a la cadena, antes de `app.js`, y su restricción; el agente principal las integra |
| F3, F4 y F9 | Los delegados, `render()`, `startApp()`, la suscripción del shell (FR-033), el escenario «almacén» de `app-shell-check`, la pila de DOM de Vitest, los bloques compartidos de `styles.css` | De a uno. El primero crea lo compartido y los demás lo reutilizan; F8 extiende la suscripción al idioma si hace falta |
| F5 | `TallerSystems.resetSimulations` como paso de sesión; el Page Object mínimo de Método de su E2E de «Borrar todo» | **No es una dependencia.** El paso de sesión funciona con `systems.js` o con el adaptador de F5. Con Q2-A queda hasta F10, y F8 amplía el Page Object si F5 llegó antes |
| F7 | Los métodos de respaldo de `TallerLab` (el área `lab`) y su `reset`, que aborta la ejecución | **No es una dependencia.** El área funciona con `lab.js` o con el adaptador de F7. Con Q2-A queda hasta F10 |
| F9 | El paso de sesión del temporizador (`resetTimer`) y su E2E de «Borrar todo»; las notas, ahora de F8 | Con Q2-A, `resetTimer` queda hasta F10 y la spec de F9 se corrige. F8 dibuja y escribe las notas por `routeStore`, como pide F9 |
| F10 | `mount`, `unmount`, el armado de `progress-backup`, `exportProgress`, `#export-progress`, `#toast` y `syncShell` | Los retira F10, que arma la instancia en la raíz única e importa los pasos de sesión de sus dueños |
| F11 | La sesión obligatoria (F11a) y los textos de «Tu cuenta», que distinguen «Borrar todo» de borrar la cuenta | Con Q1-A, F8 no usa la sesión. La línea de la spec de F11 que dice que la contraseña de «Borrar todo» es de F8 se corrige |
| [D1](../007-d1-progreso-sincronizacion/spec.md), D1b y D1c | El formato del archivo (`source: export` de D1b); `resetAll(confirmation?)`; el FR-074 de D1 | F8 conserva el formato y la interfaz. D1c reimplementa la feature, y su ítem del front suma la contraseña al diálogo (Q1) y la espera de la red (Q3) |
| [C4](../008-c4-exposicion/spec.md) | Los estilos en línea | C4 ya no espera a F8: su Q3 dejó `style-src-attr 'unsafe-inline'`. F8 saca el `style=` por el alcance del port |

**Hallazgos para la hoja de ruta (los integra el coordinador):**

- **Dependencias de F8:** de «F2b, F5, F7» a «F2b», como pasó con F9 (que depende sólo de F2a). F5 y F7 dejan sus métodos en `window` hasta F10, y «Borrar todo» los alcanza por el armado de `app.js` con o sin sus ports. F8 puede salir del tramo 4 y entrar en cuanto F2b esté entregada. Igual se integra de a uno con los demás.
- **El «Borra» de F8:** el manejador de `#export-progress` es del shell y queda hasta F10.
- **El «Entra» de F8:** suma la bitácora, `#note-state`, el pedido al tutor (F9-Q1) y el CSS de Método (X3).
- **«Superficies que pide D1», fila 4:** con Q1-A, la confirmación de contraseña de «Borrar todo» deja de ser de F8 y pasa al ítem del front que integre D1c (F11d o F13).
- **F5 «Conserva»:** «`resetSimulations` hasta F8» pasa a «hasta F10» (Q2-A).
- **La fila de C4:** «espera a F5, F7 y F8» quedó vieja con la Q3 de C4.
- **El tope de tamaño:** el criterio global de 2 500 000 caracteres quedó viejo con A2; hoy es 1 250 000.
- **«Decisiones abiertas» de F8:** «Nada previo a la spec» se reemplaza por Q1 a Q4.

## Assumptions

- Esta spec describe `f2b-acum@2b37caf4`, un ensayo de sólo lectura con F2a, A2 y las cuatro unidades de F2b integradas. Lo que toma de F2b es un hecho del código de ese ensayo, citado por archivo, aunque todavía no esté en `master`.
- Los nombres son provisionales y los confirma el plan: `pages/method`, `register-method.tsx`, `window.TallerMethod` y `qa/e2e/pages/method.ts`.
- Q1 a Q4 se escriben con la opción recomendada. Las lecturas de X1, X2, X3 y F9-Q4 son de esta spec y el usuario puede corregirlas («Lecturas»).
- El barrido de estilo computado y el multiconjunto son los de la unidad 8 de F2b: scripts descartables fuera del repositorio (`quickstart-f2b.md`, §3.1). F8 los reutiliza y los amplía a lo que Método dibuja y a la impresión.
- Vitest corre sólo en `node` y sólo para `*.spec.ts`: `jsdom`, Testing Library y `fishery` no están en el `package.json` de `f2b-acum`. El primer ítem que escriba una spec de componente los pide con permiso y pasa la configuración a dos proyectos. Si F8 es el primero, le toca a F8.
- Los textos esperados salen de `frontend/app.js`, de `frontend/src/index.html`, de `features/progress-backup` y de las fixtures `qa/fixtures/progress-master-2a278ad-storage.json`, `progress-master-2a278ad-export.json` y `progress-d0e1b49-export.json`. La fixture de master tiene idioma Go, una nota «Lo que entendí» de Rust y `minutes: 25`. Que el contenido exportado de la fixture sembrada coincida con lo guardado (sin normalizar nada) lo confirma el plan.
- El conteo de unas 23 reglas sale de leer `frontend/styles.css` de `f2b-acum` con `grep`, y que sólo Método las usa, de buscar cada clase en las fuentes de `frontend/`. El plan lo vuelve a medir con `postcss`.
- Los 38 escenarios de `app-shell-check` que cambian salen de leer sus 58 en `f2b-acum`.
- El backend del reset se leyó en `master` (`e87772d`): `backend/api/routes/api/progress-reset.php`, `app/Http/Requests/ResetBodyRequest.php`, `app/Http/Middleware/RequirePassword.php`, `EnsureExpectedAccount.php` y `config/progress.php`.
- Nada se ejecutó: sin `npm`, sin Docker, sin navegador, sin descargas y sin `dist/`. Sin verificar en un navegador:
  - el foco al abrir y al cerrar la confirmación;
  - qué devuelve el portapapeles en Chromium headless con el permiso concedido;
  - la serialización del DOM de React frente a `innerHTML`.

  Los E2E escritos primero contra el legacy los fijan.
- Los avisos de complejidad (35) son los del plan de F2b; `npm run lint` no se corrió.
- Los mensajes que lee el alumno van en español rioplatense, como hoy; el código y las pruebas, en inglés.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las de Q1 a Q4 están en sus tablas.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Qué pasa después de importar y de «Borrar todo» | Que el shell remonte la página con `render()`, como hoy; actualizarla en el lugar | En el lugar. Remontar pierde el foco, que es justamente lo que X1 descarta; devolverlo a mano compensa una pérdida que ya no tiene por qué ocurrir |
| Dónde vive la confirmación | El `<dialog>` estático de `index.html`, manejado desde React; un hijo de `#main` sin portal; un portal a `body` desde la raíz de la página | El portal, como decidió F9-Q4 para la lección y la confirmación del laboratorio. El estático deja un elemento del shell atado a una página; sin portal, el diálogo cambia de padre y sus eventos suben por `#main` |
| La exportación de la página | Una copia propia del armado y la descarga del archivo; compartir con la barra lateral el mismo camino | Compartirlo (FR-013): dos copias pueden divergir en el nombre o en el tipo, y el archivo es contrato con D1b. El plan elige cómo |
| El campo de archivo | Dentro de la página, cerca de su botón; un portal a `body` | Lo decide el plan. Está oculto y nadie lo ve, y el E2E entra por el evento `filechooser`, así que su lugar en el árbol no cambia lo que prueba |
| La bitácora | Campos con su valor leído en cada render; campos sin control con una clave que los remonte al cambiar las notas desde afuera | Lo decide el plan, con FR-018 y FR-027: lo observable es una escritura por tecla, el cursor que no salta y las notas importadas a la vista |

## Partición

Esta spec tiene 44 requisitos, contra los 52 de C3a, la mayor del épico. No se propone cortarla.

Si el plan la encuentra grande, el corte menos malo es en dos:

- **F8a, la página:** la rutina, la bitácora, el pedido, las fuentes y el CSS;
- **F8b, el panel de respaldos:** exportar, importar, «Borrar todo» y los respaldos. Es la superficie que D1c reemplaza.

Su costo:

- un puente temporal: mientras F8b no entre, la página de React tendría que convivir con los botones de datos legacy o dibujarlos sin conectar;
- dos cortes de `app.js`, de los arneses y del barrido;
- apartarse de «un PR por vista».
