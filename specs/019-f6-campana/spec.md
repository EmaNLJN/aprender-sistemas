# Feature Specification: F6 · Campaña

**Feature Branch**: `019-f6-campana` (nombre de la feature; el proyecto no crea una rama por feature. Esta spec vive en la rama `spec/f6-campana`)

**Created**: 2026-10-28

**Status**: Borrador con tres preguntas abiertas para el clarify (Q1 a Q3). Sin plan ni tareas.

**Input**: Ítem **F6** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Campaña»: portar la campaña (héroe, mundos, misiones, vitrina y reglas) a React sin que el alumno note el cambio. Pedido del coordinador (ver «Lo que pidió el usuario»). Depende de F2b (la [spec de F2](../009-f2-seams/spec.md) y su [plan](../009-f2-seams/plan-f2b.md)), implementada en los PR #41 a #44; de F2a con A2 (PR #40, [plan](../009-f2-seams/plan.md)); y de F1 ([spec](../003-f1-red-de-seguridad/spec.md)). Usa el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) y el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1. Ningún ADR en «propuesta» es base de esta spec. Lo que existe sólo en esas ramas (`url-grammar.ts`, `entities/campaign/bridge.ts`, `startApp()`, `getContent()` y la compuerta de A2) no está en `master` (`e87772d`): se cita como código, con su archivo, y se toma como hecho de la integración local de F2a, A2 y las cuatro unidades de F2b. Las specs de D1, F3, F4, F5 y F9 son borradores en otras ramas: lo que se toma de ahí es un supuesto.

## Intención y alcance

**Lo que entendemos.** La campaña es la vista que lleva al alumno por cuatro mundos por lenguaje: seis misiones por mundo (24 por lenguaje, 12 de ellas desafíos nuevos), un checkpoint conceptual que abre el mundo siguiente y una vitrina de insignias. Hoy la dibuja `frontend/campaign.js` con `innerHTML` (203 líneas en `master`) y la viste `frontend/campaign.css` (788 líneas en `master`, 740 después de la unidad 8 de F2b). Las reglas, el XP, los desbloqueos y el progreso ya son TypeScript en `frontend/src/entities/campaign`. F6 reemplaza la vista por una página de React montada sobre `#main`, como el Atlas, y no toca el motor: ninguna regla de XP ni de desbloqueo cambia. El alumno no tiene que notar nada: el aspecto, los textos, el teclado, el movimiento reducido, las URL (`?mundo=` y los enlaces a misiones) y el progreso guardado (sellos y puntos de control, que D1 sincroniza: los IDs no cambian) quedan como están.

Tres cosas hacen que esto sea más que mover un archivo.

1. El laboratorio sigue pidiéndole a la campaña HTML y URL por `window.TallerCampaign` hasta F7. Queda un adaptador mínimo, y lo que devuelve no cambia un byte.
2. La página repite en literales el catálogo y las reglas («4 mundos · 24 misiones · 12 desafíos nuevos», «/180», 20, 10 y 150 XP) y E1 va a cambiar el catálogo. F6 los deriva, y esta spec dice cómo se calculan y cómo se prueban.
3. `campaign.css` también le da estilo a un bloque que dibuja el laboratorio (`.quest-direct-lock`). Borrarla sin moverlo lo dejaría sin estilo y ninguna prueba funcional lo notaría.

F6 está en el camino crítico: F7 (el laboratorio) espera a F5 y a F6, A4 espera a F7 y D1c espera a A4. Es para el alumno, para quien porta las otras vistas y para quien revisa los PR. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. La red de F1 (106 E2E) y los 17 de A2 pasan sin editarse, y los E2E nuevos de la campaña, escritos contra el legacy y en verde antes de portar, pasan sin editarse sobre la página de React.
2. Una comparación única entre el build de la base y el de F6 da 0 diferencias en el DOM de la campaña, en el estilo computado y en el árbol de accesibilidad, sobre un conjunto fijo de estados, con `campaign.css` ya borrada. Las únicas diferencias son las que el usuario acepte en Q2 y Q3.
3. Las tres fixtures congeladas arrancan sin escribir, sin respaldar y sin avisar, y `campaign-check` y `campaign-content-check` pasan sin cambios.
4. Los conteos y el XP salen del catálogo y de las constantes exportadas: una página armada con un catálogo distinto del real los muestra bien, y con las constantes reemplazadas no queda un número viejo.
5. `frontend/campaign.js` y `frontend/campaign.css` no existen, `window.TallerCampaign` publica sólo lo que otra vista legacy todavía lee, y el bloque de bloqueo del laboratorio se ve igual.

**Entra:**

- La página de la campaña (provisional: `frontend/src/pages/campaign/`): héroe y rango, aviso de almacenamiento, mapa de mundos, mundo elegido, vitrina y reglas, con su sesión de módulo (mundo y filtro) como la del Atlas.
- Los selectores puros de `frontend/src/entities/campaign` (rango y símbolo, etiqueta de estado de un mundo, tipo de misión y filtro) y los conteos derivados; `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE` exportados en la API pública del slice.
- El adaptador de montaje (`mount` y `unmount`) y el que conserva los puentes que usa el laboratorio, en `frontend/src/app/legacy/`.
- El retiro de `TallerCampaign.init`: el motor se inicializa dentro de `startApp()`.
- Mover `.quest-direct-lock` a `lab.css`, la hoja de la página, y el borrado de `frontend/campaign.js` y `frontend/campaign.css`.
- Los E2E de comportamiento de la campaña, las specs de Vitest, las comparaciones únicas y la adaptación de los checks de `qa/` que cargan `campaign.js` (cómo cargan, no qué esperan).
- La documentación que cambia.

**Queda fuera:**

- Cambiar una regla de XP o de desbloqueo, el formato del progreso, un ID, `content/` o el motor.
- Los exploradores de robot y paquetes (`quest-explorers.js` y `quest-explorers.css`) y los de `lab-explorers.js`: se dibujan dentro del laboratorio y migran con él (F7). Ver «Los exploradores».
- El laboratorio y sus puentes de HTML, que F7 reemplaza por datos; Sistemas y `window.TallerEffects` mientras lo lea (F5).
- Llevar el mundo elegido o el filtro a la URL (cambia el contrato de URL), el router y el toast del shell (F10) y los conteos del menú (`.nav-count`, F10).
- Preparar el rango, los símbolos y la numeración de los mundos para un catálogo con otra cantidad de mundos (E1). Ver «Riesgos».
- Corregir un defecto del legacy que aparezca al escribir los E2E: se caracteriza como está, con `KNOWN DEFECT` en el nombre de la prueba, y se corrige en su propio commit con TDD y aprobación.

**Sin hacer a propósito (YAGNI):** un store propio de la página (la sesión es un objeto de módulo, como la del Atlas); memoización antes de medir; una librería de animación; capturas de pantalla (el aspecto se protege con DOM y estilo computado); reescribir el CSS (se mueve sin cambiar una declaración); rediseñar el marcado; un `useEffect` para derivar datos.

**Actores:** el alumno, que no debe notar nada; quien porta las demás vistas (F3, F4, F5 y F9 comparten el shell legacy y se integran de a uno) y F7, que espera esta página; quien revisa los PR; el agente principal, que integra `main.tsx`, `package.json`, las configuraciones y la documentación; y D1c, que sincroniza el progreso de campaña sin enterarse de la vista.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta (Preguntas abiertas).

| Pedido | Fuente |
| --- | --- |
| Portar la campaña (héroe, mundos, misiones, vitrina y reglas) a React; depende de F2b y está en el camino crítico | Hoja de ruta, F6; coordinador |
| Es un port y no un rediseño: se conservan el aspecto, el comportamiento, los textos, el progreso, los IDs y las URL | Usuario, 2026-10-05 (supuesto que no corrigió); constitución, «El front no se rediseña» |
| Entra: la página, los selectores de `entities/campaign` con `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE` exportados, los conteos y el XP derivados del catálogo y los E2E. Borra `campaign.js` y `campaign.css`. Conserva `window.TallerCampaign`. Fuera: cambiar las reglas de XP o de desbloqueo | Hoja de ruta, «Alcance por ítem», F6 |
| Los conteos «24 misiones» y «/180» salen del catálogo | Hoja de ruta, «Ítems del backend que tocan el front» (E1) y decisión abierta de F6 |
| El PR abre con los E2E de comportamiento de su vista, escritos contra el legacy y en verde antes de portar; pasan sin editarse después | Usuario, clarify de F1 (Q1); hoja de ruta, «E2E primero» |
| Antes de borrar `campaign.css`, `.quest-direct-lock` pasa a `lab.css`: la protege R10 de `css-contract` | Plan de F2b, «Lo que F5 a F8, F10, A2 y D1c toman de F2b»; spec de F1 (correcciones del plan) |
| La raíz de React se monta dentro del shell legacy como la del Atlas; la página lee el motor con `useStore` y un selector chico, nunca el store entero, y el contenido le llega por su adaptador de `app/` | Coordinador; F2, FR-023 y FR-015 |
| Vitest con Testing Library y fishery para las piezas nuevas, y Playwright con Page Objects | ADR 0008 (aceptado el 2026-10-05) |
| Un PR por vista, que se revierte entero y devuelve la vista legacy; los ports se integran de a uno | Hoja de ruta, «Convenciones» |
| Spec en español y sin código, con como mucho cinco preguntas y la partición propuesta sin aplicarla | Coordinador |

## Preguntas abiertas para el clarify

Son tres, y cada una trae sus opciones con su costo, la recomendada y su motivo. Al responderlas, el clarify las registra en `## Clarifications`, bajo `### Session`, y reemplaza esta sección. Hasta entonces, los requisitos que señalan una pregunta (con su marcador) usan la opción recomendada como borrador. Q2 es la misma decisión que la Q3 de F9 (la región viva que hoy se recrea) y Q3, la que la Q3 de F3 toma sobre el detalle abierto de una tarjeta: conviene que el usuario las responda una vez para todos los ports.

### Q1 · Las palabras que repiten un conteo, ¿se derivan o quedan como texto? (FR-031)

La página tiene tres clases de literal: (1) los conteos del catálogo («4 mundos», «24 misiones», «12 desafíos nuevos» y «de 4 insignias»), (2) las constantes de las reglas (20, 10, 30, 150 y 180) y (3) números escritos con letras dentro de la prosa: «Seis misiones para conectar las piezas.», «verificar sus seis misiones» (nota «Una ruta con propósito»), «Se abre al verificar las seis misiones…» (checkpoint cerrado) y «Completaste los cuatro mundos.» (aviso al completar el último). Las clases 1 y 2 se derivan: la hoja de ruta lo pone en el alcance y la sección «Los conteos y el XP» dice cómo. Lo abierto es la clase 3.

| Opción | Descripción | Costo |
| --- | --- | --- |
| A | Las palabras quedan como texto editorial. Una spec compara cada una con el conteo del catálogo real y falla cuando dejan de coincidir. | Con un catálogo que no es el real, el texto diría «seis» aunque haya siete misiones. Son cuatro frases que E1 edita a mano, y la spec le dice cuáles. El texto de hoy no cambia. |
| B | Las palabras se derivan con una tabla de números a palabras («uno» a «doce», por ejemplo), con el género y el plural que pide cada frase. | Una tabla y reglas de concordancia que hoy no existen, con sus specs, para un caso que no existe todavía. Fuera de la tabla hay que decidir qué se muestra. |
| C | No se deriva nada: los literales pasan a constantes con nombre y una spec los compara con el catálogo real. | Es un recorte del alcance que la hoja de ruta fijó (contradice la línea «Entra» de F6) y E1 edita cada número a mano. |

**Recomendada: A.** Deriva todo lo que el alumno lee como cifra, deja el texto idéntico y no inventa una concordancia para un catálogo que no existe. La spec que compara las palabras con el catálogo real es la alarma que E1 necesita. **Costo:** hasta que E1 edite esas cuatro frases, un catálogo distinto del real tendría un texto que contradice la cifra de al lado.

### Q2 · La retroalimentación del checkpoint, ¿queda montada o se recrea en cada respuesta? (FR-018)

Hoy cada acción rehace `#main` con `innerHTML`, así que la región `role="status"` con la retroalimentación del checkpoint («Bien razonado.» o «Revisemos esa idea.», con el porqué) se crea de nuevo en cada respuesta. El aviso del shell (`#toast`, que es estable) es lo que un lector de pantalla anuncia con seguridad. No está verificado qué anuncia hoy con la región. La regla de todo port de la hoja de ruta dice que las regiones vivas que hoy se recrean quedan montadas. La spec de F9 recomienda conservar el comportamiento de hoy en su región, por un motivo propio: la suya aparece y desaparece, y montarla siempre pide una regla de CSS. La del checkpoint está siempre visible, así que montarla no pide nada más.

| Opción | Descripción | Costo |
| --- | --- | --- |
| A | La región queda montada y su texto cambia en el lugar, que es lo natural en React y lo que dice la regla de todo port. | Un lector de pantalla puede anunciar la retroalimentación además del aviso: puede ser un doble anuncio. Es un cambio de lo que oye quien usa lector, sin verificar. Pide una comprobación manual con lector (acción del usuario). |
| B | La región se recrea en cada respuesta, como hoy (por ejemplo con una `key` que cambia con cada respuesta). | Una `key` a propósito que reproduce un accidente de `innerHTML` y que F10 tendría que deshacer. La regla de todo port no se cumple en esta región. |

**Recomendada: A.** Es la regla que la hoja de ruta ya fijó, no agrega código y la región queda más accesible, no menos. **Costo:** lo descrito arriba. Si el usuario elige B, F6 reproduce el comportamiento de hoy y la regla de la hoja de ruta se enmienda.

### Q3 · Los `<details>` abiertos, ¿siguen abiertos después de una acción? (FR-019)

La campaña tiene dos `<details>`: «Las reglas del juego y las herramientas que usamos» y «Ver qué falta para entrar» en cada misión que todavía no está abierta. Hoy cada acción (elegir un mundo, filtrar, responder un checkpoint) reconstruye `#main` y los cierra. En React, un `<details>` sin estado propio sigue abierto mientras su tarjeta no se desmonte. Ningún E2E de F1 fija el cierre.

| Opción | Descripción | Costo |
| --- | --- | --- |
| A | Se acepta: los `<details>` que siguen visibles conservan su estado. | Un alumno puede notar que las reglas que abrió ya no se cierran al elegir un mundo. Es una diferencia visible que hay que aprobar. |
| B | Se reconstruyen a propósito en cada acción (una `key` que cambia) y se fija con un E2E marcado `KNOWN DEFECT`. | Código que reproduce un accidente de `innerHTML`, que F10 tendría que deshacer, y un E2E que fija un defecto. |

**Recomendada: A.** Es el comportamiento natural de React, es el que recomienda la spec de F3 para el mismo caso y reproducir el cierre es código que se tira. **Costo:** la diferencia visible de arriba. Los E2E de F6 no fijan ni el cierre ni la apertura.

## Qué se conserva

Es el contrato que verifican los E2E, las specs y la comparación única. Los textos son los del legacy, carácter por carácter; los largos (la portada, la nota «Una ruta con propósito», el texto de las reglas y la nota de honestidad) no se transcriben acá porque los fija la comparación de DOM contra `frontend/campaign.js` de la base. Los símbolos (`⌘`, `◈`, `⌁`, `✳`, `✓`, `○`, `◇`, `↗`, `→`) y las mayúsculas también.

| # | Contrato | Qué muestra o hace hoy |
| --- | --- | --- |
| 1 | Héroe y rango | «CAMPAÑA · RUST» o «CAMPAÑA · GO»; el título «El próximo nivel / lo *construís vos.*»; las tres pastillas «4 mundos», «24 misiones» y «12 desafíos nuevos»; la tarjeta «TU RANGO» con su símbolo, el rango («Explorador», «Aprendiz de sistemas», «Constructor», «Arquitecto» o «Maestro del taller» según 0 a 4 mundos completos), «<puntos> / <máximo> XP de campaña», una barra de nombre «Experiencia de campaña» y «<n> de 4 insignias» |
| 2 | Avisos | Si el motor no puede guardar, una nota `role="status"`: «Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.»; siempre, la nota «Una ruta con propósito» con el enlace «laboratorio libre» a `?#laboratorio` |
| 3 | Mapa de mundos | Una `nav` «Mundos de la campaña» con un botón por mundo: símbolo (`✓`, el del mundo o `◇`), «MUNDO 0N · <nivel>», título, estado («Insignia conseguida», «<puntos>/180 XP · explorar →» o «Bloqueado · ver requisitos») y una barra «Experiencia en <título>». Nombre accesible «Mundo N: <título>, completado» (o «disponible» o «bloqueado; ver requisitos»); el elegido lleva `aria-pressed="true"` |
| 4 | Mundo elegido | Una región cuyo nombre es el título (`aria-labelledby`, `h2` con `tabindex="-1"`), con «<nivel> / TU EXPEDICIÓN» (o «MUNDO COMPLETADO» o «PRÓXIMA FRONTERA»), el subtítulo, «<puntos> / 180 XP», la historia y los conceptos |
| 5 | Mundo bloqueado | «Esta región tiene un requisito.», «Podés conocer su tema ahora. Sus misiones se habilitan cuando completes los mundos anteriores.», la lista de motivos y, si hay un mundo abierto sin completar, el botón «Volver a <título> →» |
| 6 | Mundo abierto | «POR QUÉ EXPLORARLO», la guía en tres pasos y, según el estado: «Insignia conseguida: <insignia>» (`role="status"`) con «Siguiente mundo →» o, en el último, el enlace «Llevarlo a mi proyecto ↗» a `#proyecto`; o «TU SIGUIENTE MOVIMIENTO» con el título de la misión, «Código aprobado. Volvé a Descubrí y razoná la predicción.» o «Una misión, una hipótesis y tres pruebas.» y el enlace «Resolver predicción ↗» o «Entrar al IDE ↗» |
| 7 | Misiones | «Seis misiones para conectar las piezas.»; un grupo «Tipo de misión» con Todas, Entrenamiento, Reparación, Kata y Desafío final (`aria-pressed`); una tarjeta por misión con su tipo («Entrenamiento», «Reparación · lings», «Kata» o «Desafío final»), «<puntos>/30 XP», título, objetivo, «✓ Pruebas · 20» y «○ Predicción · 10», «Práctica con solución de apoyo» cuando corresponde, y el enlace «Abrir misión ↗», «Enfrentar el desafío final ↗» o «Volver a experimentar ↗» o, si no está abierta, un `<details>` «Ver qué falta para entrar» con los motivos |
| 8 | Checkpoint | Una región cuyo nombre es «El código funciona. ¿Sabés por qué?» (o «Una idea que ya podés explicar.» si está superado), con «CHECKPOINT · LA ÚLTIMA LLAVE». Cerrado: «Se abre al verificar las seis misiones, reunir 150 XP y resolver la predicción del desafío final.» y los motivos. Abierto: la pregunta, las opciones con su letra (`aria-pressed`, clase `correct` o `incorrect` en la elegida) y una región `role="status"` que dice «Elegí la explicación que mejor sostenga tu decisión.» y, tras responder, «Bien razonado.» o «Revisemos esa idea.» más el porqué |
| 9 | Vitrina | «TU COLECCIÓN», «Ideas que ya pusiste a prueba.» y una insignia por mundo con nombre accesible «<insignia>: conseguida» o «pendiente» y el rótulo «CONSEGUIDA» o «POR DESCUBRIR» |
| 10 | Reglas | Un `<details>` «Las reglas del juego y las herramientas que usamos», cerrado, con tres bloques («XP que significa algo», «Ayuda sin castigos», «Herramientas existentes») y la nota de honestidad; los enlaces externos abren en otra pestaña con `rel="noopener noreferrer"` |
| 11 | Elegir un mundo | Cambia el mundo, vuelve el filtro a «Todas», escribe `?mundo=<id>` con `history.replaceState` (sin agregar una entrada de historial y vaciando el resto de la query), lleva `#quest-world` al inicio sin animación (`behavior: 'instant'`) y enfoca el título del mundo |
| 12 | Filtrar y responder | Filtrar muestra las misiones cuyo tipo empieza con el filtro, y el botón elegido conserva el foco. Un checkpoint rechazado avisa con sus motivos y no cambia nada; uno aceptado deja la opción marcada, conserva el foco en ella y avisa «Checkpoint superado. Tu explicación conecta las piezas.» o «Leé el porqué y probá otra explicación.»; si completa el mundo, avisa «¡<insignia>! Un mundo completado. Tu próximo nivel está disponible.» (o, al cuarto, «¡<insignia>! Completaste los cuatro mundos. Es hora de llevarlo a tu proyecto.») y dispara la celebración. Los avisos salen por el toast del shell |
| 13 | Sesión y URL de entrada | El mundo elegido y el filtro sobreviven a desmontar y volver a montar la página en la misma carga del documento y se pierden al recargar. `?mundo=` se lee sólo al montar: un mundo del idioma lo elige, uno desconocido no cambia la URL, y si el mundo recordado no es del idioma se elige el primero abierto sin completar o, si no hay, el primero. El idioma que manda `?mundo=` lo fija `app.js` |
| 14 | Sin mundos y sin escrituras | Un lenguaje sin mundos muestra «La campaña todavía no tiene mundos disponibles.». Abrir la página, cambiar de idioma, elegir un mundo o filtrar no escribe en el almacenamiento: lo único que escribe es responder un checkpoint, por el motor |

**Teclado, móvil y movimiento reducido.** Todos los controles son `button`, `a` y `summary` nativos, con la tabulación y el foco visible de hoy, y Enter o Espacio hacen lo que el clic. Las reglas de ancho (1 050 y 650 px) y la transición de `.world-node` bajo `prefers-reduced-motion: no-preference` viven en el CSS que se mueve sin cambios; la celebración consulta `matchMedia` en cada llamada y no anima con movimiento reducido. Al desmontar se detiene la celebración y se quitan los oyentes.

## Los exploradores de robot y paquetes

**Siguen en `quest-explorers.js` y `quest-explorers.css` hasta F7. F6 no los toca.** No hace falta una pregunta: la evidencia es concluyente.

- La campaña nunca los dibuja. `frontend/campaign.js` no los nombra, y el único que llama a `TallerQuestExplorers` es `frontend/lab.js` (`render`, `act` y `reset`), al abrir un ejercicio de `rust-101` a `rust-106` o de `go-101` a `go-106`. La campaña sólo enlaza a esos ejercicios.
- La hoja de ruta los pone en F7 («Entra» y «Borra»), porque una raíz anidada en el `innerHTML` del laboratorio se perdería en cada render (mapa, §10).
- Los modelos puros que dejó la unidad 7 de F2b (`frontend/src/entities/exercise/explorers.ts`) ya los usan los dos archivos legacy; F7 los dibuja con React.
- `quest-explorers.css` (prefijo `qx-` y `.quest-explorer`) no depende de ninguna regla de `campaign.css`: se leyeron las clases de las dos hojas.

## Los conteos y el XP

La página tiene tres clases de literal. Las clases 1 y 2 se derivan; la 3 es Q1.

| Clase | Literal hoy | De dónde sale tras F6 |
| --- | --- | --- |
| 1 · Conteos del catálogo, por lenguaje | «4 mundos», «24 misiones», «12 desafíos nuevos» (pastillas) y «<n> de 4 insignias» | Mundos: cuántos mundos tiene el lenguaje. Misiones: la suma de las misiones de esos mundos. Desafíos nuevos: la suma de los `challengeIds` de esos mundos (las misiones que no son entrenamiento). Insignias: la cantidad de mundos |
| 2 · Constantes de las reglas | 20 («Pruebas · 20», «20 XP por las pruebas…»), 10, 30 («<n>/30 XP», la suma), 150 («al reunir 150 XP», el checkpoint cerrado) y 180 («/ 180 XP», el máximo de las barras de los mundos) | `CODE_XP`, `PREDICTION_XP`, su suma, `PASS_SCORE` y `WORLD_MAX_SCORE`, exportados por `entities/campaign`. El máximo de cada mundo es el `maxScore` que ya trae el mundo derivado |
| 3 · Números con letras en la prosa | «seis misiones» (tres frases) y «los cuatro mundos» | Q1 |

**Cómo se calculan.** Son funciones puras en `entities/campaign` que reciben los mundos derivados del lenguaje y devuelven los números; la página no cuenta. El «<puntos> / <máximo> XP de campaña» del rango ya sale del resumen del motor (`maxScore` es la cantidad de mundos por `WORLD_MAX_SCORE`, 720 por lenguaje hoy).

**Cómo se prueban.**

1. **Catálogo real:** el 4, el 24, el 12 y el 720 que fijan `campaign-content-check` y el README, escritos a mano en un E2E y en una spec; no se recalculan con el código que se prueba.
2. **Catálogo distinto:** una spec de componente arma a mano un catálogo que no es el real (por ejemplo cinco mundos de seis misiones, tres de ellas desafíos) y espera «5 mundos», «30 misiones», «15 desafíos nuevos» y «de 5 insignias», con los valores escritos a mano a partir de cómo se armó. Es la prueba de que los conteos sobreviven a E1.
3. **Constantes reemplazadas:** otra spec reemplaza las constantes por otros valores y espera que cambien todos los números de XP de la página: el «Pruebas · 20» y el «Predicción · 10» de las tarjetas, el «<n>/30 XP», el «/ 180 XP» del mapa y del mundo, el máximo de las barras, el «150 XP» de la nota y del checkpoint cerrado, y el texto de las reglas. Si quedara un literal, falla.
4. **Coherencia del texto editorial:** una spec compara las palabras de la clase 3 con los conteos del catálogo real (Q1 = A).

## Cómo lee el motor la página

- La página lee la revisión con `useStore(campaignEngine.changes, (state) => state.revision)`, de `zustand`, y nunca el store entero. Los mundos y el resumen se derivan al dibujar, con `getWorlds(language)` y `getSummary(language)`; no se copian a un `useState`, a otro store ni a un contexto. El `exportState()` del motor clona en cada llamada y no sirve de instantánea (plan de F2a).
- La revisión sube cuando el motor escribe: al aceptar un checkpoint, al importar, al borrar y cuando una sincronización del laboratorio cambia algo. No sube con `refreshFromLab`. Por eso la evidencia del laboratorio se absorbe en memoria al montar, antes del primer dibujo, como hoy hace `mount`; no es un efecto del dibujado ni se vuelve `sync`, que escribe. Mientras la campaña está montada el laboratorio no lo está (el shell monta una vista por vez), así que esa evidencia sólo cambia entre montajes.
- El contenido que el motor no tiene (el título, el objetivo y el tipo de cada ejercicio) llega por props desde el adaptador de `frontend/src/app/legacy/`, que lo lee de `getContent()` al montar, como el Atlas. La página, su modelo y sus specs no importan `getContent()` (F2, FR-015).
- La página es la segunda que importa el índice de `entities/campaign` (el primero es `register-campaign-engine.ts`, que publica `window.TallerCampaignEngine`). En producción es una sola instancia; en los checks, que empaquetan cada fuente por separado, se cuida con el guard de F2a (R1 a R4) y con R6 de F2b. El adaptador no importa el índice (R4).

## Qué se retira del legacy y qué adaptador queda

Las rutas son las de la integración local de F2a, A2 y F2b. «Lo leen» sale de leer `frontend/app.js` y `frontend/lab.js`.

| Pieza | Hoy | Tras F6 | La retira |
| --- | --- | --- | --- |
| `frontend/campaign.js` (render, `onClick`, `missionHTML`) y sus 2 avisos de complejidad (`missionHTML` 15 y `onClick` 12) | Vista legacy | Se borra; los avisos bajan en 2 | F6 |
| `frontend/campaign.css` | Hoja de la vista | Se borra. `.quest-direct-lock` (4 reglas) pasa al final de `lab.css`; el resto va a la hoja de la página, en el mismo lugar del orden de carga | F6 |
| `TallerCampaign.init` | Lo llama `startApp()` en `app.js` y lo usa `lab-bridge-check` | **Se retira.** El motor se inicializa dentro de `startApp()`, en el mismo orden y con el mismo aviso de carga (FR-034) | F6 |
| `TallerCampaign.mount` y `unmount` | `render()` de `app.js` | Se conservan, ahora sobre la raíz de React. Firma `mount(host, lang, toast)` | F10 |
| `TallerCampaign.refresh` | `lab.js` (al dibujar) y `render()` de `app.js` (antes de montar cualquier vista) | Se conserva con el mismo efecto: deriva en memoria y nunca escribe | `lab.js`: F7. La llamada de `app.js` sigue hasta F10 (ver el hallazgo) |
| `TallerCampaign.sync` | `lab.js` (`syncAfterRun`) y `app.js` (`syncDerivedSeals` del respaldo) | Se conserva | `lab.js`: F7. La de `app.js`, hasta que el respaldo se cablee con el motor (F8 o F10) |
| `TallerCampaign.returnURL`, `exerciseContextHTML` y `lockedExerciseHTML` | `lab.js` | Se conservan, con los mismos bytes y el mismo orden de efectos | F7 |
| `window.TallerCampaignEngine` | `lab.js` (`getWorlds`, `canAttempt`), `app.js` (respaldo) | Sin cambios: es la misma instancia que importa la página | Cuando `app.js` deje de leerlo (F8 o F10) |
| `window.TallerEffects` | `campaign.js` y `systems.js` | La página importa `celebrate` y `stop` de `shared/lib/celebration`. El global sigue mientras lo lea Sistemas | El último de F5 y F6 que se integre retira `register-effects.ts` |
| `app.js:syncLinkedLanguage` (lee `window.RUST_CAMPAIGN` y `GO_CAMPAIGN`) | Fija el idioma desde `?mundo=` | Queda | F10 |
| `quest-explorers.js`, `quest-explorers.css` y `lab-explorers.js` | Laboratorio | Quedan | F7 |
| En `qa/`: `CAMPAIGN_UI_SOURCE`, la tabla de `load-order-check`, `LEGACY_SOURCES` de `boot-check`, la lista de `app-adapters` y los fakes de `app-shell-check`, y la carga de campaña de `lab-bridge-check` | Atan a `qa/` a `campaign.js` y a `init` | Se adaptan, con su correspondencia (FR-043) | F6 |

**Hallazgo para la hoja de ruta.** La línea de F6 y la tabla de la spec de F2 dicen que `refresh` y `sync` se retiran en F7. `app.js` también los llama: `refresh` en `render()`, antes de montar cada vista, y `sync` en el respaldo (`syncDerivedSeals`). Mientras `app.js` los llame, F7 no puede retirarlos; quedan hasta F10, o hasta que F6 o F8 cambien esas llamadas. F6 los conserva.

**Un solo objeto.** `window.TallerCampaign` se publica una vez, con exactamente `mount`, `unmount`, `refresh`, `sync`, `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML`. Los puentes de HTML no arrastran React ni la página: los checks los cargan por separado (FR-036).

## Cómo se demuestra que nada cambió

| Capa | Qué fija | Cuándo | Cambia con el port |
| --- | --- | --- | --- |
| La red de F1 y los 17 E2E de A2 | La campaña ya está en `views`, `url-contract`, `reload` (L3 y L4), `startup-storage`, `cycle`, `bridges` y `content-gate` y, con R10 y el movimiento reducido, en `css-contract` | Antes y después | No se edita |
| E2E de la campaña, con su Page Object | Los quince flujos de FR-041 | Contra el legacy antes del corte y contra la página después | No se editan |
| `campaign-check` y `campaign-content-check` | Reglas, desbloqueos, XP y el contenido real (24 misiones, 12 desafíos, 720 XP por lenguaje) | `npm test` | No se editan |
| Specs de Vitest en `node` | Los selectores, los conteos y las constantes | Con el port | Nuevas |
| Specs de Vitest en `jsdom` con Testing Library | La página: lo que se ve, la suscripción al motor, la sesión, el foco y los avisos, con el catálogo real y con uno armado a mano | Con el port | Nuevas |
| Comparación única, legacy contra port | El DOM de `#main` (estructural), el estilo computado a 1 280, 981, 850, 650, 590 y 375 px con y sin movimiento reducido, y el árbol de accesibilidad, sobre un conjunto fijo de estados. Es el barrido de la unidad 8 de F2b extendido con estados sembrados de la campaña | Una vez, en el PR, con `campaign.css` ya borrada | No queda como check |
| Comparación de los puentes | `exerciseContextHTML`, `lockedExerciseHTML` y `returnURL` del adaptador contra los de `campaign.js`, con los mismos mundos, ejercicios, idiomas y parámetros de URL (presentes, ausentes y vacíos) | Una vez, en el PR | No queda como check |
| Roturas deliberadas | Que cada protección nueva falle en la spec prevista | Una vez, en el PR | No quedan |
| Los checks de `qa/` | Los escenarios de campaña de `lab-bridge-check`, `boot-check` y `app-shell-check`, con su correspondencia | `npm test` | Se adaptan |

**El conjunto fijo de estados** (FR-044): navegador vacío en Rust y en Go; el progreso real de master (`progress-master-2a278ad-storage.json`) en los dos idiomas; cada uno de los cuatro mundos de Rust elegido con ese progreso (los hay abiertos, completos y bloqueados); cada filtro; sólo el almacén del laboratorio sembrado (el checkpoint abierto) antes de responder, después de responder mal y después de responder bien; el último mundo completo; el almacenamiento bloqueado; y una misión con práctica con apoyo. Son 18 como mínimo. La comparación del DOM ignora los espacios en blanco entre etiquetas y el orden de los atributos.

**Las diferencias aceptadas** son sólo las de Q2 y Q3, según la respuesta, y los atributos `data-quest`, `data-id`, `data-filter` y `data-answer`, que existen para el delegado de clics del legacy y que la página de React no necesita. Todo lo demás es 0 diferencias.

## Qué cambia en `dist/index.html` y por qué

La base es la de F2b después de A2: el contenido viaja en su archivo, el HTML lleva un `<script type="module">` y un `<style>` en línea, y `qa/build-check.ts` fija el tope del HTML en 1 250 000 caracteres (la hoja de ruta todavía dice 2 500 000). La integración local de F2a, A2 y F2b mide 1 141 337 caracteres (medida del coordinador): queda un margen de unos 108 000 que F3, F4, F5, F9 y F11 también consumen. Los hashes de la línea base se toman sobre la base de F6 antes del primer cambio.

| Qué | ¿Cambia? | Por qué |
| --- | --- | --- |
| `frontend/src/index.html` y el marcado del dist con los scripts y el estilo vaciados | No | F6 no edita el shell: el menú, `.nav-count` y los diálogos quedan |
| `build/curriculum.json`, su copia servida y el volcado de `dump-globals` | No | F6 no toca `content/` ni el generador; `window.RUST_CAMPAIGN` y `GO_CAMPAIGN` siguen publicados porque `app.js` los lee |
| `<style>` del dist | Cambia de orden, no de contenido | Las reglas de la página pasan a su hoja y `.quest-direct-lock` al final de `lab.css`. El multiconjunto de declaraciones (contexto, selector, propiedad, valor e `!important`) es el mismo, y el estilo computado, el que mide el barrido |
| Script del dist | Sí | Sale `campaign.js`; entran la página, los selectores, los adaptadores y `useStore` (la parte de React de `zustand`, que ya es dependencia). Se informa la medida antes y después |
| Forma del dist | No | Un documento, un `<script type="module">`, un `<style>` y el contenido aparte, sin chunks externos |
| Tamaño | Se informa | Bajo el tope vigente de `build-check`; se informa el aumento |
| `package.json` y el lockfile | Sólo si F6 es el primer port que trae el arnés | `devDependencies` (jsdom, Testing Library y fishery): ninguna es alcanzable desde `main.tsx` |

## Integración con F2b y con los otros ports

F3, F4, F5 y F9 salen de la misma base que F6 y se integran de a uno, en el orden en que quedan listos: el que llega después rebasa y repite la compuerta. F6 no depende de que otro port esté integrado, salvo el arnés de componentes (ver abajo).

| Archivo | Quién más lo toca | Qué hace F6 | Cómo se resuelve |
| --- | --- | --- | --- |
| `frontend/app.js` | F3, F4 y F9 (páginas y delegados de `#main`, líneas vecinas en `render()`); F5 (`startApp()`: el `init` de Sistemas); F2b (unidades 5 y 6), si todavía no se integró | En `startApp()`, el motor de campaña se inicializa sin `window.TallerCampaign.init`. `render()` no cambia | Hunks disjuntos salvo `startApp()` con F5 (líneas vecinas): rebase y compuerta |
| `frontend/src/app/main.tsx` | F5 (`systems.css`), F3, F4 y F9 si mueven CSS | La importación de `campaign.css` pasa a la hoja de la página, en el mismo lugar del orden de carga (después de `atlas.css`, antes de `quest-explorers.css`) | Una línea por port; lo integra el agente principal |
| `frontend/src/app/boot/legacy-views.ts` | Todos | Reemplaza la entrada de `campaign.js` por los adaptadores nuevos. `register-effects` queda mientras lo lea Sistemas | Una línea por port |
| `qa/lib/app-adapters.ts`, `qa/lib/app-shell-harness.ts` y `qa/app-shell-check.ts` | F3, F4, F5 y F9; F2b (unidad 6) | `TallerCampaign` pierde `init` en la lista; sus fakes y comportamientos del arnés se ajustan | Líneas vecinas; el que llega después rebasa |
| `qa/lab-bridge-check.ts` | F5 (la mitad de Sistemas) | Cambia cómo carga e inicializa la mitad de campaña (escenarios 1 a 10 y 20) | El mismo archivo: el segundo rebasa |
| `qa/lib/legacy-sources.ts`, `qa/load-order-check.ts` y `qa/boot-check.ts` | Todos | `CAMPAIGN_UI_SOURCE`, las filas de la tabla, `LEGACY_SOURCES` y la rama de nodos montados para `#campana` | Líneas vecinas |
| `qa/e2e/fixtures/index.ts` y `qa/e2e/pages/campaign.ts` | F3, F4, F5 y F9 | Amplía el Page Object de la campaña, que ya existe | Una entrada por port |
| `frontend/lab.css` | F7 | Suma `.quest-direct-lock` al final | Sin conflicto |
| `frontend/src/app/legacy/register-effects.ts` | F5 | No lo retira si Sistemas todavía lo lee | El segundo de F5 y F6 lo retira |
| `package.json`, el lockfile, `frontend/vitest.config.ts` y `eslint.config.ts` | F3, F4 y F9 si traen specs de componentes | Toma el arnés si ya está; si no, lo trae (FR-042) | Los integra el agente principal. El primer port que se integra lo trae |
| `README.md` («Archivos principales»), `AGENTS.md` (la lista de vistas legacy), `docs/architecture.md` (la fila «Interfaz y exploradores de campaña» y el «Estado actual») y `qa/AGENTS.md` | Todos los ports | Lo de FR-047 | Los integra el agente principal |

**El arnés de componentes no es de F6.** jsdom, Testing Library, los dos proyectos de Vitest, el setup y la guarda de `useStore` sin selector los trae el primer port que se integre (la spec de F3 los pide en FR-033). Si F3, F4 o F9 llegan antes, F6 los toma. Si F6 llega primero, los trae y pide el permiso de «Acciones del usuario y descargas».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno recorre la campaña como siempre (Priority: P1)

Un alumno abre «Campaña», ve su rango y sus mundos, elige uno, filtra sus misiones por tipo, abre una misión, vuelve y responde el checkpoint. Cada texto, símbolo, aviso y movimiento de foco es el de hoy.

**Why this priority**: es el contrato del port: «el alumno no nota el cambio». Es lo que cubren los E2E que se escriben primero.

**Independent Test**: con el build del legacy y después con el de la página, correr los quince flujos de FR-041 sin cambiar una línea.

**Acceptance Scenarios**:

1. **Dado** un navegador vacío en Rust, **cuando** abre `#campana`, **entonces** ve el héroe con las tres pastillas, el rango «Explorador», «0 / 720 XP de campaña» y «0 de 4 insignias», el mundo 1 elegido y abierto, los otros tres bloqueados y ningún aviso de almacenamiento.
2. **Dado** el progreso real de master, **cuando** abre la campaña, **entonces** el rango, el XP y las insignias reflejan el mundo 1 completo y el mundo 2 abierto, y el mundo elegido es el primero abierto sin completar.
3. **Dado** un mundo bloqueado, **cuando** lo elige, **entonces** ve sus requisitos y, si hay un mundo abierto sin completar, el botón «Volver a <título> →» que lo lleva a ese mundo.
4. **Dado** un mundo abierto, **cuando** elige un tipo de misión, **entonces** ve sólo las misiones de ese tipo (por mundo, tres de entrenamiento y una de reparación, una kata y un desafío final, según el README), el botón queda `aria-pressed` y conserva el foco; al elegir otro mundo el filtro vuelve a «Todas».
5. **Dado** un mundo con las seis misiones verificadas, **cuando** responde mal el checkpoint, **entonces** ve «Revisemos esa idea.» con el porqué y el aviso «Leé el porqué y probá otra explicación.»; **cuando** responde bien, ve «Bien razonado.», el aviso del mundo completado, «Insignia conseguida: <insignia>» y «Siguiente mundo →», y recargar conserva la respuesta.
6. **Dado** el último mundo con su checkpoint abierto, **cuando** responde bien, **entonces** el aviso dice «Completaste los cuatro mundos. Es hora de llevarlo a tu proyecto.» y aparece «Llevarlo a mi proyecto ↗» a `#proyecto`.
7. **Dado** que usa sólo el teclado, **cuando** llega con Tab a un mundo, a un filtro o a una opción del checkpoint y pulsa Enter o Espacio, **entonces** pasa lo mismo que con el clic y el foco queda donde hoy queda.
8. **Dado** que el sistema pide movimiento reducido, **cuando** abre la campaña, **entonces** `.world-node` no tiene transición y completar un mundo no dispara la celebración animada.
9. **Dado** que eligió el mundo 2 y el filtro «Kata», **cuando** va a «Atlas» por el menú y vuelve, **entonces** el mundo y el filtro siguen elegidos; **cuando** recarga la página, se pierden.

*Cubre: FR-007 a FR-020; SC-001 y SC-002.*

---

### User Story 2 - Los enlaces y el progreso no cambian (Priority: P1)

Un enlace guardado con `?mundo=` abre el mismo mundo en el mismo idioma. Elegir un mundo reescribe la URL sin agregar una entrada. El progreso de campaña (sellos y puntos de control) es el mismo archivo con los mismos IDs, y abrir la campaña no escribe nada.

**Why this priority**: es el contrato de URL del README y el de progreso del ADR 0003, y D1 sincroniza esos sellos y puntos de control.

**Independent Test**: abrir cada forma de URL de la campaña con las tres fixtures congeladas, un almacenamiento sembrado y uno bloqueado, y comparar el texto de las cuatro claves antes y después.

**Acceptance Scenarios**:

1. **Dado** `?mundo=<id>#campana` con el ID de un mundo, **cuando** carga, **entonces** abre ese mundo y el idioma pasa al del mundo; con un ID desconocido abre el primer mundo abierto y la URL no cambia.
2. **Dado** la campaña abierta, **cuando** elige un mundo, **entonces** la URL pasa a `?mundo=<id>#campana` (también con un ID que hay que codificar) y el historial conserva la misma cantidad de entradas.
3. **Dado** una misión abierta, **cuando** mira su enlace, **entonces** es `?campana=<mundo>&ejercicio=<id>&paso=learn#laboratorio`, y el enlace «laboratorio libre» es `?#laboratorio`; seguirlos recarga el documento como hoy (L3 y L4 de F1).
4. **Dado** las tres fixtures congeladas, **cuando** abre la campaña y recorre sus mundos, **entonces** las cuatro claves de `localStorage` quedan con el mismo texto, sin claves `:respaldo` y sin avisos.
5. **Dado** una copia de campaña ilegible, **cuando** abre la campaña, **entonces** el taller conserva el texto original, la página se dibuja con el progreso en blanco y no se escribe nada; con la clave ausente, no se crea.
6. **Dado** un almacenamiento bloqueado, **cuando** abre la campaña, **entonces** la página se dibuja y muestra «Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.».

*Cubre: FR-004 a FR-006, FR-013, FR-014 y FR-021; SC-003.*

---

### User Story 3 - El laboratorio sigue usando la campaña (Priority: P1)

Un alumno abre una misión desde la campaña. El laboratorio muestra el contexto del mundo, o el bloqueo si todavía no está abierta, y al aprobar vuelve a una campaña que lo cuenta.

**Why this priority**: hasta F7 el laboratorio le pide a `window.TallerCampaign` HTML y URL, y F7 espera a F6. Un adaptador sin esos métodos rompe el laboratorio sin que falle ningún check de la campaña.

**Independent Test**: los escenarios de campaña de `lab-bridge-check` y los E2E de `bridges`, `cycle` y `css-contract` (R7 y R10), más la comparación de los puentes.

**Acceptance Scenarios**:

1. **Dado** `?campana=<mundo>&ejercicio=<misión abierta>&paso=learn#laboratorio`, **cuando** carga, **entonces** el laboratorio muestra el bloque de contexto con el mundo, el XP, el tipo y los sellos, y el enlace de regreso a `?mundo=<mundo>#campana`, con los mismos bytes que hoy.
2. **Dado** una misión que todavía no está abierta, **cuando** carga, **entonces** el bloqueo reemplaza al laboratorio, con sus motivos y su enlace al mapa, y se ve igual (`.quest-direct-lock` medido por R10).
3. **Dado** un ejercicio que no es misión de ese mundo, o un mundo inexistente, **cuando** carga, **entonces** el contexto queda vacío o el bloqueo explica «El enlace no corresponde a una misión de este mundo.».
4. **Dado** el compilador simulado y una misión aprobada, **cuando** el alumno vuelve a la campaña, **entonces** la tarjeta muestra el XP y los sellos nuevos y la página se dibuja sin haber escrito al montar.
5. **Dado** el adaptador nuevo, **cuando** se mira `window.TallerCampaign`, **entonces** publica exactamente los siete métodos de la tabla y ninguno más, y `init` no está.

*Cubre: FR-033 a FR-038; SC-005.*

---

### User Story 4 - Los conteos y el XP salen del catálogo (Priority: P1)

Cuando E1 sume contenido, la página muestra sus conteos y su XP sin que nadie edite un número. Quien prueba sabe qué número viene de qué.

**Why this priority**: es la decisión abierta de F6 en la hoja de ruta y evita que la campaña mienta en cuanto cambie el catálogo.

**Independent Test**: dibujar la página con el catálogo real y con uno armado a mano, y con las constantes reemplazadas.

**Acceptance Scenarios**:

1. **Dado** el catálogo real en Rust, **cuando** se dibuja la página, **entonces** muestra «4 mundos», «24 misiones», «12 desafíos nuevos», «de 4 insignias», «/180», «<n>/30 XP», «Pruebas · 20», «Predicción · 10» y «150 XP», con los valores escritos a mano desde el README y `campaign-content-check`.
2. **Dado** un catálogo armado a mano con otra cantidad de mundos, **cuando** se dibuja, **entonces** las pastillas y «de N insignias» muestran la cantidad de ese catálogo.
3. **Dado** que una spec reemplaza `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE` por otros valores, **cuando** se dibuja, **entonces** todos los números de XP de la página cambian: no queda un literal.
4. **Dado** el catálogo real, **cuando** corre la spec de coherencia, **entonces** las palabras «seis» y «cuatro» de la prosa coinciden con los conteos; si E1 cambia el catálogo, falla y dice qué frases editar (Q1 = A).

*Cubre: FR-027 a FR-032; SC-006 y SC-007.*

---

### User Story 5 - El aspecto no cambia y la hoja de la campaña desaparece (Priority: P2)

Quien borra `campaign.css` sabe que ni la campaña ni el bloque de bloqueo del laboratorio cambiaron.

**Why this priority**: es el único riesgo de F6 que ninguna prueba funcional detecta. Es P2 porque protege a quien borra la hoja, no al alumno directamente.

**Independent Test**: el barrido de estilo computado de la unidad 8 de F2b, extendido con los estados de la campaña, y `css-contract` sin editar.

**Acceptance Scenarios**:

1. **Dado** `.quest-direct-lock` movido al final de `lab.css` y `campaign.css` borrada, **cuando** corre `css-contract`, **entonces** R10 pasa sin editarse.
2. **Dado** el build de la base y el de F6, **cuando** corre la comparación única sobre los estados fijos, **entonces** el DOM, el estilo computado de cada elemento y el árbol de accesibilidad tienen 0 diferencias fuera de las aceptadas.
3. **Dado** el CSS del dist de las dos compilaciones, **cuando** se comparan sus declaraciones como multiconjunto, **entonces** son las mismas, en otro orden.
4. **Dado** un control negativo (las reglas de la página al principio de la cascada, en una copia descartable), **cuando** corre el barrido, **entonces** da diferencias.

*Cubre: FR-039, FR-040, FR-044 y FR-045; SC-004.*

---

### User Story 6 - Quien mantiene el código lo encuentra donde corresponde (Priority: P2)

Quien porta F7 o revisa el PR de F6 encuentra la página, los selectores y los adaptadores en su capa, lee el motor por su revisión y sabe qué método de `window.TallerCampaign` retira cada ítem.

**Why this priority**: F7 y F10 retiran piezas de F6, y el motor es el singleton que D1c también usa.

**Independent Test**: las specs, el guard de F2a y F2b, el lint y la tabla de «Qué se retira del legacy».

**Acceptance Scenarios**:

1. **Dado** la página, **cuando** el motor acepta un checkpoint, **entonces** vuelve a dibujarse sin que nadie llame a nada, porque se suscribe con `useStore` y un selector que devuelve la revisión; una spec lo prueba.
2. **Dado** el código nuevo, **cuando** corre el guard, **entonces** `seams-guard-check` da 0 violaciones: nadie abre `taller-campaign-v1` fuera del motor, no hay imports profundos y el adaptador no importa el índice.
3. **Dado** el lint, **cuando** corre, **entonces** los avisos bajan en 2 y no aparece una función nueva con complejidad mayor que 10 sin justificarla.
4. **Dado** que F7 retira los métodos de HTML y `returnURL`, **cuando** mira la tabla, **entonces** sabe quién más lee `refresh` y `sync`.

*Cubre: FR-022 a FR-026, FR-046 y FR-048.*

---

### Edge Cases

- **Un lenguaje sin mundos:** la página muestra «La campaña todavía no tiene mundos disponibles.» y nada más.
- **`?mundo=` de otro idioma:** `app.js` fija el idioma del mundo antes de montar. Un ID desconocido deja la URL como está.
- **Un mundo bloqueado elegido y ningún mundo abierto sin completar:** no hay botón «Volver a…».
- **Un filtro sin misiones** en el mundo elegido: la grilla queda vacía, como hoy.
- **Un título o un ID con caracteres que hay que escapar o codificar:** el texto se escapa y el enlace se codifica como hoy (`%20`, no `+`).
- **Cambio de idioma con la campaña abierta:** `app.js` desmonta y vuelve a montar; el mundo recordado que no es del idioma cae al primer mundo abierto sin completar.
- **El almacenamiento falla a mitad de sesión:** un checkpoint aceptado se refleja en memoria y el aviso de almacenamiento aparece en el siguiente dibujo, como hoy.
- **Una copia de otra pestaña:** la fusión del motor sube la revisión y la página se vuelve a dibujar sola.
- **Dos montajes seguidos** (por ejemplo, un cambio de idioma): el segundo no deja oyentes ni celebración del primero.
- **Defectos del legacy que la lectura no encontró:** si los E2E encuentran alguno, se caracteriza como está con `KNOWN DEFECT`.

## Requirements *(mandatory)*

### Functional Requirements

**Reglas de todo port** *(de la hoja de ruta; las repiten F3, F4 y F9)*

- **FR-001**: El port DEBE entregarse como un cambio revertible entero que devuelve la vista legacy, en este orden de unidades: (1) el Page Object ampliado y los E2E, en verde contra el legacy; (2) los selectores y las constantes de `entities/campaign` con sus specs, y el traslado de `.quest-direct-lock` a `lab.css`, ambos sin cambio visible y con la red en verde; (3) la página, su sesión y sus specs, sin montar; (4) el corte, en un solo commit: los adaptadores, el montaje, `startApp()`, la lista de `legacy-views.ts`, la importación del CSS, el borrado de `campaign.js` y de `campaign.css` y las adaptaciones de `qa/`; (5) la documentación. Revertir la (4) devuelve el legacy con las demás sin efecto. Cada comportamiento empieza con una spec que falla por la razón esperada. *(Hoja de ruta, «Convenciones»; constitución, principio II)*
- **FR-002**: La red de F1 (106 E2E) y los 17 de A2 DEBEN pasar antes de empezar y después del corte, sin editar ninguno. El título de R10 de `css-contract` seguirá nombrando `campaign.css`: editarlo es editar un E2E, y no se hace. Editar uno es un cambio de comportamiento: va en su propio commit, con TDD y con la aprobación del usuario. *(Hoja de ruta, criterios globales)*
- **FR-003**: Los E2E de la campaña DEBEN escribirse contra el build del legacy, estar en verde antes del corte y pasar sin editarse después. No fijan ninguna diferencia aceptada (Q2 y Q3). *(Clarify de F1, Q1; ADR 0008)*
- **FR-004**: El progreso guardado DEBE quedar intacto (ADR 0003): la clave `taller-campaign-v1`, `version: 1`, la forma de `seals` y `checkpoints`, los IDs y las ranuras de respaldo no cambian, y F6 no abre otra clave. Con las tres fixtures congeladas de `qa/fixtures/progress-*.json`, el arranque no escribe, no respalda ni avisa, y abrir la campaña tampoco; sus exportaciones se importan sin omisiones; `curriculum-ids-check` sigue en verde. *(Spec de D1, borrador: sincroniza sellos y puntos de control)*
- **FR-005**: Ninguna regla del motor DEBE cambiar: `campaign-check` y `campaign-content-check` pasan sin editarse, y F6 no toca `entities/campaign/model` salvo para sumar exports y selectores puros.
- **FR-006**: Las ocho vistas por hash y las seis formas de URL con query DEBEN llevar adonde llevaban. La campaña sólo lee `?mundo=` (al montar) y sólo escribe `?mundo=` (al elegir un mundo), y arma los enlaces con la gramática de F2b (`url-grammar.ts`: `readLinkQuery`, `withWorldQuery`, `worldHref`, `campaignMissionHref` y `FREE_LAB_HREF`), carácter por carácter como hoy.
- **FR-007**: El alumno NO DEBE ver nada distinto: la página DEBE conservar todo lo de «Qué se conserva», con los textos, el orden y las condiciones de hoy. Las únicas diferencias son las aceptadas en Q2 y Q3.

**La página**

- **FR-008**: El marcado DEBE conservar los elementos, ids, clases, textos, roles, nombres accesibles, `href` y estados de «Qué se conserva». Se retiran sólo `data-quest`, `data-id`, `data-filter` y `data-answer`, que existían para el delegado de clics. Las clases siguen siendo las de `campaign.css`, porque la hoja se mueve sin cambiar una declaración y `css-contract` mide `.world-node`.
- **FR-009**: Cada texto literal, nombre accesible, símbolo y variante de enlace del inventario DEBE conservarse carácter por carácter, con el voseo de hoy; la comparación de DOM lo verifica contra `frontend/campaign.js` de la base.
- **FR-010**: Elegir un mundo DEBE hacer lo del contrato 11: cambiar el mundo, volver el filtro a «Todas», escribir `?mundo=<id>` con `history.replaceState` (sin agregar una entrada), llevar `#quest-world` al inicio sin animación y dejar el foco en `#quest-world-title`, ya dibujado.
- **FR-011**: Filtrar DEBE mostrar las misiones cuyo tipo empieza con el filtro y DEBE dejar el foco en el botón elegido, ya dibujado.
- **FR-012**: Responder un checkpoint DEBE llamar al motor; si lo rechaza, avisar con sus motivos sin cambiar nada; si lo acepta, dejar la opción marcada con el foco en ella y avisar uno de los tres textos de hoy; y, si completa el mundo, avisar el texto del mundo (o el de los cuatro mundos) y disparar la celebración. Los avisos salen por el toast que recibe `mount`.
- **FR-013**: El mundo elegido y el filtro DEBEN vivir en una sesión de módulo fuera de la raíz de React, un solo conjunto (no uno por idioma): sobreviven a desmontar y volver a montar en la misma carga del documento y se pierden al recargar. La raíz se crea de nuevo en cada `mount`, como la del Atlas.
- **FR-014**: Al montar, la página DEBE leer `?mundo=` una sola vez: un mundo del idioma lo elige; si el mundo recordado no es del idioma, elige el primero abierto sin completar o el primero; y NO DEBE reescribir la URL. Un lenguaje sin mundos DEBE mostrar «La campaña todavía no tiene mundos disponibles.».
- **FR-015**: Los controles DEBEN seguir siendo nativos (`button`, `a` y `summary`): sin `tabindex` nuevo, sin manejadores de teclado nuevos y con la tabulación y el foco visible de hoy. El diseño móvil y el movimiento reducido DEBEN comportarse como hoy.
- **FR-016**: El foco DEBE volver explícitamente después de cada redibujo que hoy lo reconstruye (el título del mundo, el botón del filtro, la opción del checkpoint), con refs y, si hace falta, `flushSync`, como el Atlas. *(Hoja de ruta, reglas de todo port)*
- **FR-017**: Al desmontar, la página DEBE detener la celebración (`stop`) y no dejar oyentes ni timers; dos montajes seguidos no dejan nada del primero.
- **FR-018**: La retroalimentación del checkpoint DEBE seguir siendo una región `role="status"`. [NEEDS CLARIFICATION: Q2, ¿queda montada entre respuestas o se recrea como hoy?] Hasta que responda, la región queda montada y su texto cambia en el lugar.
- **FR-019**: Los `<details>` que siguen visibles después de una acción DEBEN conservar su estado. [NEEDS CLARIFICATION: Q3, ¿se acepta que un `<details>` abierto siga abierto?] Hasta que responda, vale A y ningún E2E fija el cierre ni la apertura.
- **FR-020**: Un error al dibujar la página DEBE informarse por `console.error` con un mensaje en español y no dejar la app inutilizable (`onUncaughtError`, como el Atlas).

**Motor y contenido**

- **FR-021**: Ninguna página ni adaptador DEBE escribir al abrir, al cambiar de idioma, al elegir un mundo ni al filtrar: lo único que escribe la campaña es responder un checkpoint, por el motor y una vez por respuesta. *(ADR 0003: la primera escritura es una acción del alumno)*
- **FR-022**: La página DEBE leer el motor con `useStore(campaignEngine.changes, selector)` y un selector que devuelve sólo la revisión. NO DEBE suscribirse al store completo, ni guardar el progreso ni valores derivados en `useState`, en otro store o en un contexto; DEBE derivar los mundos y el resumen al dibujar. Una spec prueba que la página se vuelve a dibujar cuando el motor acepta un checkpoint. *(F2, FR-023; `AGENTS.md`)*
- **FR-023**: La evidencia del laboratorio DEBE absorberse en memoria al montar, antes del primer dibujo, con el mismo efecto que `refresh()` de hoy, y nunca escribir. NO DEBE ser un efecto secundario del dibujado (`docs/architecture.md`) ni convertirse en `sync()`.
- **FR-024**: El título, el objetivo y el tipo de cada ejercicio DEBEN llegar a la página por props, desde su adaptador de `frontend/src/app/legacy/`, que los lee de `getContent()` al montar. La página, su modelo y sus specs NO DEBEN importar `getContent()` ni `app/content`. *(F2, FR-015)*
- **FR-025**: La página y `window.TallerCampaignEngine` DEBEN ser la misma instancia del motor, y la página NO DEBE abrir `taller-campaign-v1` ni crear otro motor. El adaptador NO DEBE importar un valor del índice de `entities/campaign` (R4); lo importa la página. Un montaje de la página en `boot-check` (el bundle de `main.tsx`) no lanza «Inicializá la campaña antes de usarla.». *(F2, FR-018; el singleton por contexto de check)*
- **FR-026**: Ningún componente DEBE llamar `useStore(store)` sin selector: compila y suscribe al store completo. La guarda automática que pide la spec de F3 (una regla de lint o una revisión explícita) DEBE cubrir también la campaña; si F6 llega primero, la trae.

**Selectores, conteos y XP**

- **FR-027**: `entities/campaign` DEBE exportar en su API pública `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE`, con los valores de hoy (20, 10, 150 y 180).
- **FR-028**: Los selectores DEBEN ser funciones puras de `entities/campaign`, con los mismos textos de hoy: el rango y su símbolo según los mundos completos (cinco rangos y cuatro símbolos), la etiqueta de estado de un mundo («completado», «disponible» o «bloqueado; ver requisitos» y los rótulos del mapa), el tipo de una misión a partir de `challengeType` («Desafío final», «Reparación · lings», «Kata» o «Entrenamiento») y el predicado del filtro (el tipo empieza con el filtro).
- **FR-029**: Los selectores DEBEN poder importarse sin evaluar el singleton del motor, porque el adaptador que conserva `exerciseContextHTML` necesita el tipo de misión y los checks lo cargan por separado: por la entrada sin estado del slice (`entities/campaign/bridge.ts`, de F2b) o por otra que el plan fije. R4 y R6 del guard no se relajan sin justificarlo, y el tipo de misión no se duplica.
- **FR-030**: Los conteos de la clase 1 y las constantes de la clase 2 DEBEN derivarse como dice «Los conteos y el XP»: ningún 4, 24, 12, 180, 30, 20, 10 ni 150 escrito a mano en la página o en los adaptadores.
- **FR-031**: Las palabras que repiten un conteo («seis misiones» y «los cuatro mundos») DEBEN [NEEDS CLARIFICATION: Q1, ¿se derivan o quedan como texto?] quedar como texto editorial, con una spec que las compara con los conteos del catálogo real y falla cuando dejan de coincidir. Hasta que responda vale A.
- **FR-032**: Con un catálogo distinto del real, armado a mano en una spec, la página DEBE mostrar sus conteos; con las constantes reemplazadas, todos sus números de XP. Los valores esperados se escriben a mano a partir de cómo se arma el catálogo, no se recalculan con el código que se prueba.

**Adaptadores y puentes**

- **FR-033**: `window.TallerCampaign` DEBE publicarse una sola vez, con exactamente `mount(host, lang, toast)`, `unmount`, `refresh`, `sync`, `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML`, delegando en los módulos nuevos. NO DEBE publicarse ningún global nuevo. *(F2, FR-017)*
- **FR-034**: `TallerCampaign.init` DEBE retirarse. El motor DEBE inicializarse dentro de `startApp()` antes de la primera vista, en el mismo orden que hoy (después del almacén del laboratorio y del recorrido, antes de Sistemas), con el mismo catálogo de ejercicios y de mundos y la misma evidencia del laboratorio, y su aviso de carga DEBE sumarse a los demás en el mismo orden. Quién llama a `init` es decisión del plan. `qa/lib/app-adapters.ts`, los fakes y los comportamientos del arnés de `app-shell-check` y la carga de `lab-bridge-check` pierden `init`: cambia cómo cargan, no qué esperan.
- **FR-035**: `exerciseContextHTML`, `lockedExerciseHTML` y `returnURL` DEBEN devolver los mismos bytes que `campaign.js` de la base, con el mismo orden de efectos: el contexto llama `refresh()` antes de leer los mundos y sólo si el enlace trae un mundo; el bloqueo no refresca y usa el último estado sincronizado. Una comparación única lo prueba (FR-044).
- **FR-036**: Los adaptadores nuevos evaluados solos NO DEBEN lanzar ni tocar el almacenamiento (F2-I3 de A2). Los puentes de HTML NO DEBEN importar React ni la página, para que `lab-bridge-check` los cargue por separado. `load-order-check` DEBE reflejar el orden de los adaptadores nuevos sin relajar una restricción.
- **FR-037**: La página DEBE usar `celebrate` y `stop` de `shared/lib/celebration` por import y NO DEBE leer `window.TallerEffects`. `register-effects.ts` se queda mientras Sistemas lo lea.
- **FR-038**: `frontend/quest-explorers.js`, `frontend/quest-explorers.css` y `frontend/lab-explorers.js` NO DEBEN cambiar: el diff de F6 no los toca.

**CSS**

- **FR-039**: Las cuatro reglas de `.quest-direct-lock` (`h1`, `h1 em`, `p, li` y `ul`) DEBEN pasar al final de `lab.css` antes de borrar `campaign.css`, sin cambiar una declaración, y R10 de `css-contract` DEBE pasar sin editarse antes y después del borrado.
- **FR-040**: El resto de `campaign.css` DEBE pasar, sin cambiar una declaración ni el orden de las reglas, a la hoja de la página, que `main.tsx` importa en el mismo lugar del orden de carga que hoy (después de `styles.css`, `lab.css` y `atlas.css`, antes de `quest-explorers.css` y `systems.css`); `frontend/campaign.css` DEBE dejar de existir. F6 NO DEBE sumar ningún `style=`, `setAttribute('style', …)` ni `style.cssText`.

**Pruebas**

- **FR-041**: Los E2E de la campaña DEBEN ser el Page Object `CampaignPage` ampliado (ya existe), una spec y estos quince flujos, con localizadores por rol y nombre accesible y las aserciones en la spec: (a) la apertura en un navegador vacío; (b) con el progreso real de master (rango, XP, insignia y mundo elegido); (c) elegir un mundo (región, `aria-pressed`, URL sin entrada nueva y foco); (d) un mundo bloqueado y «Volver a…»; (e) cada filtro, con su foco, y el filtro que vuelve a «Todas» al elegir un mundo; (f) las tarjetas (dominada, con práctica con apoyo, bloqueada con sus motivos y el `href` exacto de «Abrir misión»); (g) «Tu siguiente movimiento»; (h) el checkpoint cerrado, abierto, mal respondido, bien respondido y recargado; (i) el último mundo completo; (j) la vitrina y las reglas; (k) el cambio de idioma y `?mundo=` de Go; (l) la sesión que sobrevive al menú y se pierde al recargar; (m) el almacenamiento bloqueado; (n) el teclado; (o) 375 px sin desborde horizontal. Los estados se siembran con las fixtures congeladas o con factories de `qa/e2e/` tipadas por el formato v1 guardado, nunca por los tipos del código. Los valores esperados salen del README, de `curriculum-ids.json` y del contenido, no del código que se prueba. *(ADR 0008)*
- **FR-042**: Los selectores y los conteos DEBEN tener su spec de Vitest en `node`, y la página su spec en `jsdom` con Testing Library, con consultas por rol y nombre, `userEvent.setup()` antes de cada `render` y `await` en cada interacción, y los efectos (`celebrate`, `scrollIntoView`) doblados en su interfaz. Las factories de fishery (mundos, misiones y ejercicios) viven junto a lo que modelan, como `*.factory.ts`. El arnés es el del ADR 0008 (dos proyectos de Vitest, el setup y la guarda de `useStore`): lo trae el primer port que se integre.
- **FR-043**: Cada check de `qa/` que F6 adapte (`lab-bridge-check`, `boot-check`, `app-shell-check` y `load-order-check`, más `qa/lib/app-adapters.ts` y `qa/lib/legacy-sources.ts`) DEBE cambiar sólo cómo carga el código o qué lista, no sus valores esperados. El PR DEBE listar la correspondencia de cada escenario de campaña: los once de `lab-bridge-check` (1 a 10 y 20), que se cubren también con una spec (el tipo de misión, que hoy sólo prueba el escenario 3, pasa a la spec de los selectores); los de `boot-check` que tocan la campaña (la navegación, que pasa de `innerHTML` a nodos como la del Atlas, los dos de integridad, la lista de fuentes evaluadas solas y la de adaptadores); y los fakes de `app-shell-check`. Ningún check se retira por adelantado. *(ADR 0008, §5)*
- **FR-044**: Una comparación única entre el build de la base y el de F6 DEBE cubrir el conjunto fijo de estados de «Cómo se demuestra que nada cambió»: el DOM de `#main`, el estilo computado de cada elemento a 1 280, 981, 850, 650, 590 y 375 px con y sin movimiento reducido (el barrido de la unidad 8 de F2b, ampliado) y el árbol de accesibilidad, más la comparación de los puentes. El PR informa cuántos estados, elementos y propiedades se compararon y cuántas diferencias dio, que son 0 fuera de las aceptadas.
- **FR-045**: Cada protección nueva DEBE tener una rotura deliberada, en una copia descartable y sin commitear, que falle en la spec prevista: escribir un literal de XP en la página, suscribir el store completo, no mover `.quest-direct-lock`, abrir `taller-campaign-v1` desde la página, escribir en el montaje y devolver otro byte en `lockedExerciseHTML`.

**Entrega**

- **FR-046**: El código nuevo NO DEBE sumar funciones de complejidad ciclomática mayor que 10 sin justificarlo en la revisión; los dos avisos de `campaign.js` (`missionHTML` 15 y `onClick` 12) desaparecen con él, así que `npm run lint` baja en 2. `dist/index.html` DEBE conservar la forma de A2 y quedar bajo el tope vigente de `qa/build-check.ts`, y el PR informa el aumento de `html.length`. F6 NO DEBE sumar ninguna dependencia de runtime.
- **FR-047**: La documentación DEBE cambiar en el mismo cambio: `docs/architecture.md` (la fila «Interfaz y exploradores de campaña», que deja de nombrar `campaign.js` y `campaign.css`, y el «Estado actual» de Feature-Sliced Design), `qa/AGENTS.md` (las filas de contexto de campaña y de mundos), `README.md` (los «Archivos principales» que nombran `campaign.js` y `campaign.css`) y `AGENTS.md` (la lista de vistas legacy). Las integra el agente principal.
- **FR-048**: El shell y los archivos compartidos DEBEN integrarse como dice «Integración con F2b y con los otros ports»: de a uno, el que llega después rebasa y repite la compuerta, y el agente principal integra `main.tsx`, `package.json`, las configuraciones y la documentación. Cada descarga pide permiso antes de bajarse.

### Key Entities *(include if feature involves data)*

- **Mundo:** un capítulo de la campaña de un lenguaje, con su nivel, título, historia, guía, seis misiones, checkpoint e insignia. El motor lo deriva del contenido y del progreso: puntos, estado (completado, abierto o bloqueado) y motivos.
- **Misión:** uno de los seis ejercicios de un mundo (tres de entrenamiento, una reparación, una kata y el desafío final). Tiene sellos de pruebas (20 XP) y de predicción (10 XP), y una marca de práctica con apoyo.
- **Checkpoint:** la pregunta conceptual de un mundo. Se abre al verificar sus misiones, reunir 150 XP y resolver la predicción del desafío final; superarlo completa el mundo.
- **Rango:** el nombre y el símbolo que dependen de cuántos mundos completó el alumno.
- **Sesión de la campaña:** el mundo elegido y el filtro, en memoria del módulo, que sobreviven a desmontar la página y se pierden al recargar.
- **Puente de campaña:** el HTML y la URL que `window.TallerCampaign` le entrega al laboratorio hasta F7.
- **Conteo derivado:** una cifra de la página (mundos, misiones, desafíos nuevos o XP) calculada del catálogo o de las constantes de las reglas.
- **Estado sembrado:** el contenido de las claves de `localStorage` con que arranca una prueba, desde una fixture congelada o una factory.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el build portado, la red de F1 y los 17 E2E de A2 pasan 123 de 123, con 0 escenarios editados.
- **SC-002**: Los quince flujos de FR-041 tienen cada uno al menos una prueba, y todas pasan contra el legacy antes del corte y contra la página después, con 0 editadas: 100 % en las dos corridas.
- **SC-003**: Las 3 fixtures de progreso arrancan con 0 escrituras, 0 claves `:respaldo` y 0 avisos con la campaña abierta; elegir un mundo, filtrar y cambiar de idioma dan 0 escrituras; responder un checkpoint da 1 escritura en `taller-campaign-v1`; las 2 exportaciones congeladas se importan con 0 omisiones; `campaign-check` y `campaign-content-check` pasan sin editarse.
- **SC-004**: La comparación única da 0 diferencias fuera de las aceptadas, en al menos 18 estados y 6 anchos, con y sin movimiento reducido; el multiconjunto de declaraciones del CSS del dist da 0 reglas sólo en la base y 0 sólo en F6; `css-contract` (R10 incluida) pasa sin editarse con `campaign.css` borrada.
- **SC-005**: La comparación de los puentes da 0 diferencias en todas las combinaciones de mundo, ejercicio, idioma y parámetro de URL (presente, ausente y vacío), y `window.TallerCampaign` tiene 7 métodos y ninguno más.
- **SC-006**: Con el catálogo real, los conteos y el XP de la página coinciden con los valores del README y de `campaign-content-check` (4, 24, 12, 180, 720); con un catálogo armado a mano, con los suyos; con las constantes reemplazadas, 0 números de XP viejos en la página.
- **SC-007**: 0 literales de conteo o de XP (4, 24, 12, 180, 30, 20, 10, 150) en la página y en los adaptadores, comprobado por la spec de constantes reemplazadas y por la rotura deliberada de FR-045.
- **SC-008**: `frontend/campaign.js` y `frontend/campaign.css` no existen, y no queda una referencia a ellos fuera de la historia (las specs y el mapa): 0 apariciones en el código, `qa/`, la configuración y la documentación vigente, salvo el título de R10 de `css-contract` (FR-002).
- **SC-009**: Cada uno de los 14 contratos de «Qué se conserva» tiene al menos una spec o un E2E que lo prueba, y cada rotura deliberada de FR-045 falla en la spec prevista: N de N.
- **SC-010**: El 100 % de los escenarios de campaña de `lab-bridge-check` (11), de `boot-check` y de `app-shell-check` que tocan la campaña figura en la tabla de correspondencia, cubierto o descartado con su motivo.
- **SC-011**: `npm run lint` baja 2 avisos, 0 funciones nuevas con complejidad mayor que 10 y 0 llamadas a `useStore` sin selector; `seams-guard-check` da 0 violaciones.
- **SC-012**: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` pasan, `dist/index.html` queda bajo el tope de `build-check` con el aumento informado, y la imagen web sigue construyendo.

## Riesgos

1. **F2b todavía no está en `master`.** F6 toma de ahí la gramática de URL, los puentes de datos, las reglas de CSS que ya pasaron a `lab.css` y la lista de adaptadores. Si una unidad cambia en la revisión de los PR #41 a #44, esta spec se ajusta.
2. **El DOM de React no es idéntico al de `innerHTML` por sí solo.** Los espacios en blanco entre etiquetas, el orden de los atributos, el `<br>` del título, el espacio que separa `<strong>` del porqué en la retroalimentación y los atributos booleanos son los lugares donde React difiere. *Mitigación:* la comparación estructural de DOM y el árbol de accesibilidad.
3. **Foco y desplazamiento.** Hoy cada acción rehace `#main` y el foco se restaura a mano. En React el DOM persiste y los cambios se agrupan; sin `flushSync` el foco puede ir antes del dibujo. *Mitigación:* FR-016 y los E2E de foco.
4. **La región viva y los `<details>` (Q2 y Q3).** Lo que oye quien usa lector de pantalla puede cambiar y no está verificado. *Mitigación:* la pregunta, y una comprobación manual con lector que es acción del usuario.
5. **`refresh` no avisa.** Si se mueve al dibujado se vuelve un efecto secundario del render, y si se confunde con `sync` escribe al abrir la campaña. *Mitigación:* FR-021 y FR-023, `startup-storage` y los dos escenarios de integridad de `boot-check`.
6. **Archivos compartidos.** `app.js`, `main.tsx`, `legacy-views.ts` y cinco archivos de `qa/` los tocan F3, F4, F5 y F9. *Mitigación:* «Integración con F2b y con los otros ports».
7. **El margen de tamaño es de todos.** Quedan unos 108 000 caracteres bajo el tope de `build-check` para F3 a F11 y A3. *Mitigación:* FR-046 informa el aumento de F6.
8. **E1 va a romper tres supuestos que F6 no toca.** La lista de cinco rangos y la de cuatro símbolos (con un quinto mundo, la página mostraría `undefined`), el número del mundo «MUNDO 0N» (dos cifras sólo hasta nueve mundos) y `WORLD_MAX_SCORE`, que es una constante y no seis misiones por treinta puntos. La derivación de los conteos no los arregla. *Mitigación:* quedan registrados acá; E1 los decide con su catálogo.
9. **`useStore(store)` sin selector compila.** Una página que se suscribe al store completo se vuelve a dibujar con cada revisión. *Mitigación:* FR-026.
10. **jsdom no implementa `scrollIntoView` ni `matchMedia`.** Las specs los doblan cuando los necesitan (ADR 0008).
11. **La instancia única del motor.** La página es la segunda que importa el índice. En producción Vite la deduplica, pero un check que empaquete la página y el adaptador por separado tendría dos. *Mitigación:* FR-025 y FR-036.
12. **El arnés de componentes depende del primer port.** Si F3 se demora, F6 trae jsdom, Testing Library y fishery (unos 26,5 MB desempaquetados) y necesita el permiso del usuario.
13. **Nada de esto se ejecutó.** Esta spec sale de leer el código; los conteos y los comportamientos que la hoja de ruta no verificó los fijan los E2E que se escriben primero.

## Relación con otros ítems

- **F2b (PR #41 a #44).** F6 toma, de la integración local de las cuatro unidades: la gramática de URL (`frontend/src/shared/config/url-grammar.ts`, unidad 5, rama `f2b/u5-puentes`: `readLinkQuery`, `worldHref`, `campaignMissionHref`, `withWorldQuery` y `FREE_LAB_HREF`); los datos de los puentes (`frontend/src/entities/campaign/bridge.ts` y `model/mission-bridge.ts`, unidad 5: `campaignMissionContext` y `campaignLinkAccess`); `.quest-banner` y `.quest-lab-context` ya en `lab.css` y el menú en `styles.css` (unidad 8, rama `f2b/u8-hojas`); y el respaldo (`features/progress-backup`, unidad 6), cuyo `syncDerivedSeals` llama a `TallerCampaign.sync`. De la unidad 8 queda `.quest-direct-lock` en `campaign.css`, que F6 mueve. De la unidad 7 (`entities/exercise/explorers.ts`) F6 no usa nada.
- **F2a y A2 (PR #40).** El motor es un singleton con `changes` (la revisión); `startApp()` inicializa los motores antes de la primera vista; la página recibe su contenido por props (F2-I6); y `ShellPage.goto` de los E2E espera la primera vista.
- **F5 (Sistemas).** Comparte `lab-bridge-check`, `startApp()`, `qa/lib/app-adapters.ts` y `register-effects.ts`. Retira `TallerSystems.init` por la misma razón que F6 retira el de campaña; el último de los dos retira `TallerEffects`.
- **F3, F4 y F9.** Comparten `app.js`, el arnés de componentes, la guarda de `useStore`, `boot-check` y los archivos de «Integración». F6 no comparte el pie de guardado ni la barra lateral: la campaña no escribe el recorrido. Q2 y Q3 son las mismas decisiones que la Q3 de F9 y la Q3 de F3.
- **F7 (Laboratorio).** Espera a F6. Retira los métodos de HTML y `returnURL` de `window.TallerCampaign` y el bloque de bloqueo (`.quest-direct-lock` en `lab.css`), dibuja los exploradores y reemplaza `exerciseContextHTML` y `lockedExerciseHTML` por datos. Para eso lee la tabla de «Qué se retira del legacy».
- **F8 (Método).** Cablea el respaldo; si lo hace con el motor, deja de llamar a `TallerCampaign.sync` y a `TallerCampaignEngine`.
- **F10 (Shell y router).** Retira `mount` y `unmount`, la llamada a `refresh` de `render()`, `syncLinkedLanguage` (que lee `RUST_CAMPAIGN` y `GO_CAMPAIGN`) y los conteos del menú.
- **E1.** Los conteos de la campaña salen del catálogo; los supuestos del riesgo 8 son de E1.
- **D1 y D1c** ([spec de D1](../007-d1-progreso-sincronizacion/spec.md), borrador). El cliente se monta sobre `campaignEngine.changes` y compara `exportState()`; la página no abre otra instancia y sólo escribe por las operaciones del motor, así que D1c ve cada checkpoint como cualquier escritura. El formato de sellos y puntos de control no cambia.
- **C4.** F6 no suma estilos en línea: la campaña no tiene ninguno, y el `cssText` de `celebration.ts` no se toca.
- **A3, A4 y F11.** Sin cambios: la página no sabe cómo llega el contenido, y el compilador es del laboratorio.
- **Hoja de ruta, enmiendas que integra el coordinador.** F6 pasa a «En especificación» con el enlace a esta spec; la línea «Conserva» de F6 agrega que `init` se retira y que `refresh` y `sync` siguen hasta que `app.js` deje de llamarlos; la decisión abierta de F6 pasa a la Q1 de esta spec; el tope de 2 500 000 caracteres de los criterios globales quedó viejo (A2 lo dejó en 1 250 000) y `dump-dist-globals` ya no existe.

## Assumptions

- F1 está entregada, y F2a, A2 y F2b están integradas antes de implementar F6. Esta spec describe `master` (`e87772d`) más lo que esas ramas dejan, leído de su integración local: `campaign.js` tiene 201 líneas allí y 203 en `master`, y `campaign.css`, 740 y 788.
- El ADR 0008 está aceptado. El arnés de componentes (jsdom, Testing Library, los dos proyectos de Vitest y la guarda de `useStore`) lo trae el primer port que se integre; fishery entra con la primera factory.
- Los exploradores quedan en F7 (ver «Los exploradores»), y `TallerCampaign.init` se retira en F6, como dicen la hoja de ruta y la tabla de adaptadores de la spec de F2. Quién llama a `init` dentro de `startApp()` es del plan.
- `app.js` desmonta y vuelve a montar la página en cada cambio de idioma o de vista: el idioma entra sólo al montar, y el toast del shell (`#toast`) sigue siendo el único aviso hasta F10.
- Mientras la campaña está montada, el laboratorio no lo está: el shell monta una vista por vez.
- Los IDs de mundo y de misión que usan los E2E salen de `qa/fixtures/curriculum-ids.json` (por ejemplo `rust-world-1`, `rust-02` y `rust-103`), y los textos de los mundos, de `content/campaign/`.
- Una misión se dibuja con el título, el objetivo y el `challengeType` de su ejercicio; cada mundo trae exactamente tres pasos de guía (lo exige `campaign-content-check`).
- Los nombres de módulos, de carpetas y de adaptadores (`pages/campaign`, `register-campaign.tsx` y el del puente) son provisionales y los confirma el plan; la spec fija la capa, la responsabilidad y el contrato.
- Las descargas del arnés y de fishery las hace el coordinador, con el permiso del usuario.
- Nada se ejecutó para escribir esta spec: sin `npm`, sin Docker, sin navegador y sin descargas. Los conteos de líneas y de llamadas salen de leer el código y de `node` de sólo lectura.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Las tres primeras filas son las opciones de las preguntas del clarify.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Palabras que repiten un conteo (Q1) | B: derivarlas con una tabla de números a palabras; C: no derivar nada | A (borrador): texto editorial con una spec de coherencia. B agrega concordancia para un caso que no existe; C contradice el alcance de la hoja de ruta |
| Retroalimentación del checkpoint (Q2) | B: recrearla en cada respuesta | A (borrador): montada, como pide la regla de todo port. B reproduce un accidente de `innerHTML` |
| `<details>` abiertos (Q3) | B: reconstruirlos a propósito | A (borrador): se acepta el comportamiento natural de React. B es código que F10 tendría que deshacer |
| Cómo se dibuja la página | Un marcado propio con las mismas clases pero otra estructura; el mismo árbol que el legacy | El mismo árbol (FR-008): permite mover la hoja sin cambiar una declaración, mantener los Page Objects y probar «nada cambió» con una comparación estructural y un barrido de estilo. Un árbol propio sólo se prueba con capturas, que F1 descartó |
| El CSS de la página | Reescribirlo (módulos de CSS o utilidades); moverlo sin cambios a la hoja de la página | Moverlo (FR-040): es un port, y `css-contract` ya mide estas clases |
| Qué pasa con `TallerCampaign.init` | Conservarlo hasta F10 | Retirarlo en F6 (hoja de ruta y spec de F2): el adaptador publica sólo lo que otra vista lee. Conservarlo no toca `startApp()`, pero deja un método que nadie más necesita |
| Dónde viven los puentes de HTML | En el mismo módulo que monta React; en un módulo propio sin React | Un módulo propio (FR-036): los checks lo cargan sin empaquetar React ni la página |
| Cómo lee el motor la página | Copiar el progreso a un `useState` o a otro store; `useStore` sobre la revisión | La revisión (FR-022): una fuente de verdad, y es lo que decidió la Q3 de F2 |
| Dónde se absorbe la evidencia del laboratorio | En el dibujado o en un `useEffect`; al montar, en el adaptador | Al montar, antes del primer dibujo (FR-023): derivar en el dibujado es un efecto secundario del render y un `useEffect` pinta primero el estado viejo |
| De dónde sale el contenido | La página importa `getContent()`; le llega por props | Por props (FR-024): ninguna capa por debajo de `app` importa el acceso al contenido |
| Cuándo se escriben los E2E | Después de portar; antes, contra el legacy | Antes (usuario): después, un E2E sólo confirma lo que el port ya hizo |
| Cómo se prueba que el aspecto no cambió | Capturas de pantalla; el estilo computado de las reglas movidas; el DOM, el estilo computado de cada elemento y el árbol de accesibilidad sobre estados fijos | Lo último (FR-044): las capturas dependen del sistema operativo (F1, Q2), y el estilo de las reglas movidas no ve un cambio de estructura |
| Partición | Cortar en F6a (E2E, selectores y CSS) y F6b (la página) | No se corta: 48 requisitos contra los 52 de C3a, y la hoja de ruta pide un PR por vista que se revierte entero. Si el plan la encuentra grande, el corte natural es el orden de FR-001: (1) la red de E2E, (2) la página y el corte. Costo: un ciclo más de Spec Kit y dos PR que tocan `qa/e2e/fixtures/index.ts` |

## Acciones del usuario y descargas

| Cuándo | Acción |
| --- | --- |
| Ahora | Responder el clarify (Q1 a Q3). Q2 y Q3 valen también para F9 y F3. |
| Si F6 es el primer port que se integra | Permiso para `jsdom` 30.1.2 y Testing Library (`@testing-library/react` 16.3.3, `dom` 10.4.2, `user-event` 14.6.7 y `jest-dom` 7.0.1): 56 paquetes, unos 26,3 MB desempaquetados y 5,0 MB comprimidos (estimación del ADR 0008). Y permiso para `fishery` 2.4.0 (2 paquetes, unos 0,19 MB) si ninguna factory llegó antes: F6 arma catálogos a mano en varias specs. Si otro port ya los trajo, F6 no baja nada. |
| Antes del PR | La comprobación manual con lector de pantalla de la retroalimentación del checkpoint (Q2) y de los `<details>` (Q3). |
| Con permiso | `docker compose build taller` sobre la rama, para comprobar que la imagen web sigue construyendo. |

F6 no suma dependencias de runtime: React y Zustand ya están, y `useStore` es la parte de React de `zustand`.
