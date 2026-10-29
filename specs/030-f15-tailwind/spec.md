# Feature Specification: F15 · La adopción de Tailwind CSS v4 en el front React

**Feature Branch**: `030-f15-tailwind` (nombre de la feature; el proyecto no crea una rama por feature: el trabajo va en `spec/f15-tailwind`)

**Created**: 2026-10-28

**Status**: Draft, sin clarify. Cinco preguntas abiertas (Q1 a Q5, en «Preguntas para el clarify») y una partición propuesta, sin aplicar (P5, en «La partición propuesta»)

**Input**: Ítem nuevo **F15** del épico del front, decidido por el usuario el 2026-10-28 (`.coordinador/clarify-decisiones.md`, «Tailwind»): adoptar Tailwind CSS v4 en el front React, después de F10, con su ADR, usando la skill [`tailwind-design-system`](../../.agents/skills/tailwind-design-system/SKILL.md) y Context7. F10c deja los colores, los espacios y la tipografía como variables CSS listas para el `@theme` de Tailwind v4. La hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md) todavía no tiene la fila de F15. **Describe el código de `master` (`bb480677`)**: hasta ahí llegaron F2a, F2b, A2 y F4. Lo que dejan F3 a F10 sale de sus specs y del plan de F10c, y figura como supuesto con nombre. El plan de F10c es `specs/024-f10-shell/plan-f10c.md`, con `research-f10c.md` (R12) y `contracts/stylesheets-f10c.md`, en la rama `plan/f10c-estilos` (`1150db65`, PR #91), todavía fuera de `master`. La base es un ADR en estado **propuesta**, el de la sección «El ADR». Usa además el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md), la [spec de F10](../024-f10-shell/spec.md), la [spec de C4](../008-c4-exposicion/spec.md), el [mapa del front legacy](../front-react/legacy-map.md) (§7) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** Cuando F10 termine, React va a dibujar el shell y todas las vistas, pero el estilo va a seguir siendo CSS escrito a mano y global por nombre. Habrá unas diecisiete hojas: la base (`styles.css`, con los tokens, las reglas globales y las clases base), la del shell que deja F10c y una por slice (X3).

En este épico, ese modelo costó trabajo en cada paso:

- **F2b**, en su unidad 8, tuvo que mover reglas que una hoja definía para elementos de otra vista.
- **Los ports**, con X3, mudan a mano el CSS de cada página.
- **F10c** necesita una grilla de 35 estados por 15 capturas sólo para saber qué regla usa alguien y cuál sobra.

En `master` hay 106 colores hexadecimales distintos, 57 tamaños de letra y 46 valores de espaciado en píxeles, repartidos en siete hojas. El valor de una regla depende del orden de las hojas y de la especificidad de las demás.

F15 cambia **cómo se escribe** el estilo, no **cómo se ve**:

- **La base:** entra Tailwind CSS v4 como herramienta de build. Lleva un theme hecho con los tokens del taller y conoce el CSS de hoy sin pisarlo.
- **La migración:** cada slice pasa, en su propio PR, de su hoja a utilidades en sus componentes, y borra la hoja.
- **El cierre:** las reglas globales quedan en la capa base de la entrada, los tokens quedan sólo en el theme, y desaparecen la capa heredada y `styles.css`.

El alumno no nota nada. El barrido de estilo computado da 0 diferencias después de cada PR. F15 no trae rediseño: normalizar colores o tamaños a una escala, sumar un modo oscuro o cambiar el foco sería otro ítem, con aprobación visual del usuario.

**Para quién y por qué.** Es para quien mantiene el front, que es el usuario y los agentes que escriben interfaz.

- **El estilo vive con el componente.** Escribir o cambiar una pantalla no exige abrir una hoja ni averiguar quién más usa una clase.
- **Lo que se borra no deja rastro.** Borrar un componente borra su estilo, porque Tailwind genera sólo las clases que encuentra en el código.
- **Un solo lugar para los valores.** Los colores, los espacios y la tipografía salen del theme.
- **Nada depende del orden.** Ninguna regla depende del orden de las hojas.

Para el alumno, el resultado es que nada cambia. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Después de cada PR de F15, la red pasa sin editarse y el barrido de estilo computado da 0 diferencias sobre la grilla de F10c. Esa grilla tiene 35 estados, siete anchos, el movimiento reducido apagado y encendido, y la impresión.
2. Al cerrar F15 no queda ninguna hoja por slice. Quedan la entrada de CSS, con el theme y la capa base, y una lista cerrada de excepciones con su motivo, como las reglas que compiten con el editor.
3. El primer ítem que entra después de la base (F14, F11b o el que sea) agrega su pantalla sin crear un `.css` nuevo, si Q5 lo confirma.
4. El CSS construido no tiene preflight, ni condiciones de `@media` nuevas, ni utilidades con `!important`, ni la paleta, las fuentes o la escala por omisión de Tailwind.
5. El HTML queda bajo el tope vigente, con el tamaño antes y después de cada PR.
6. `package.json` suma dos dependencias de desarrollo con versión exacta, entradas con permiso, y ninguna de runtime.

**Entra:**

- **El ADR** (sección «El ADR»): qué decide, qué descarta y sus consecuencias.
- **La base (F15a, propuesta):**
  - la dependencia y su plugin de Vite;
  - una entrada de CSS con el orden de capas explícito;
  - todo el CSS de hoy en su propia capa, debajo de las utilidades;
  - el theme con los tokens;
  - sin preflight;
  - las fuentes de clases acotadas al front;
  - las colisiones de nombres resueltas;
  - la semántica de hoy para los anchos y el `:hover`;
  - los checks nuevos;
  - la regla para la interfaz nueva.

  Su compuerta: ninguna utilidad usada todavía, y el barrido en 0.
- **La migración por slice (F15b, propuesta):** un PR por slice, con el piloto primero. Cada uno abre con los E2E de lo que el barrido no ve, reemplaza las clases por utilidades, convierte en componentes las clases base que usa y borra su hoja.
- **El cierre (F15c, propuesto):** las reglas globales pasan a la capa base de la entrada, se borran las clases base sin usuarios y desaparecen la capa heredada y `styles.css`.

**Queda fuera:**

- **Cualquier cambio visible:** ni colores, ni tamaños, ni espacios, ni foco, ni anchos, ni movimiento. Normalizar los valores sueltos a una escala es otro ítem.
- **El modo oscuro.** La skill lo cubre, pero el taller no lo tiene.
- **El preflight de Tailwind,** salvo que Q2 decida otra cosa.
- **Librerías de clases y plugins:** `class-variance-authority`, `clsx`, `tailwind-merge`, `prettier-plugin-tailwindcss` y los de ESLint. Cada una entra sólo con su primer caso real y con permiso (`AGENTS.md`).
- **El editor por dentro:** las reglas `.cm-*` que dibuja CodeMirror y su `EditorView.theme`. El aspecto del editor no cambia.
- **El `style` de React con el color saneado de F5** (F5-Q2): sale del contenido y no tiene utilidad equivalente sin otra variable en línea. Lo permite `style-src-attr` de C4.
- **Partir el bundle o retirar `vite-plugin-singlefile`:** es C4. F15 funciona con cualquiera de las dos formas de entrega.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá ni en una respuesta del clarify es un supuesto (Assumptions).

| Pedido | Fuente |
| --- | --- |
| Tailwind es un ítem propio, **F15**, después de F10 y con su ADR; usa la skill `tailwind-design-system` y Context7 (Tailwind v4) | Usuario, 2026-10-28 (`.coordinador/clarify-decisiones.md`) |
| F10c termina la limpieza en CSS común, sin cambio visible, y ordena los colores, los espacios y la tipografía como variables CSS, listas para el `@theme` de Tailwind v4 | Usuario, 2026-10-28 |
| En F10c se parte `.small-label, .eyebrow, .topbar-label` (FR-054 de F10), y las reglas de `account.css` se quedan en su hoja | Usuario, 2026-10-28 |
| El front no se rediseña: se conservan el aspecto, el comportamiento, los textos, el progreso, los IDs y las URL | Usuario, 2026-10-05; constitución, «Épicos y hojas de ruta» |
| X3: cada port muda a la hoja de su página el CSS que sólo usa esa página, probado con el barrido de estilo computado y el multiconjunto de reglas | Usuario, clarify del 2026-10-28; hoja de ruta, «Convenciones» |
| El barrido mueve el puntero a `(-1, -1)` y cierra los `<details>` antes de cada captura (TR-13) | Coordinador, 2026-10-28 |
| El tope de `dist/index.html` es 1 500 000 caracteres (`BOOT_SIZE_LIMIT` de `qa/build-check.ts`), con un script y un estilo en línea (A2) | Usuario, 2026-10-28 (PR #76); A2 |
| La CSP de C4: `style-src 'self' 'nonce-…'` sin `'unsafe-inline'`, y `style-src-attr 'unsafe-inline'` sólo por CodeMirror; C4 retira `vite-plugin-singlefile` | Usuario, clarify de C4 (Q3); spec 008 |
| Conservar la accesibilidad de teclado, el foco visible, el diseño móvil y el movimiento reducido | `AGENTS.md`; constitución, principio VI |
| Cada descarga pide permiso con nombre, versión exacta, origen y peso | Hoja de ruta, «Acciones del usuario» |
| Spec en español y sin código, con como mucho cinco preguntas para el clarify y la partición propuesta sin aplicarla | Coordinador, 2026-10-28 |

## Clarifications

Pendiente. Las preguntas están en «Preguntas para el clarify», y cada requisito que depende de una lleva su marca `[NEEDS CLARIFICATION: Qn]`.

## El punto de partida

**Lo que hay en `master` (`bb480677`), medido sin ejecutar nada:**

| Medida | Valor |
| --- | --- |
| Hojas | 7: `styles.css`, `lab.css`, `campaign.css`, `quest-explorers.css`, `systems.css`, `atlas.css` y `project.css`; 128 497 bytes y 7 143 líneas |
| Tokens | 13 propiedades en `:root` (10 colores, entre ellos los tres `--accent*`, y 3 familias de letra) y 3 en `body[data-language='go']`; 757 usos de `var(--…)` |
| Colores sueltos | 106 hexadecimales distintos, en 127 usos; ningún `rgb()` |
| Tamaños de letra | 57 valores distintos, en 534 declaraciones |
| Espaciado | 949 declaraciones de `padding`, `margin` y `gap`, con 46 valores distintos en píxeles; 2 valores en `rem` o `em` en todo el CSS |
| Anchos | 18 condiciones de `@media` distintas en 39 bloques, casi todas con `max-width` (de escritorio hacia abajo) |
| `!important` | 34, entre ellos `[hidden] { display: none !important }` y la regla global del movimiento reducido |
| `:hover` | 15 líneas, sin `@media (hover: hover)` |
| Estilos que se inyectan en ejecución | El `<style>` de CodeMirror (`EditorView.theme` en `shared/ui/code-editor/mount-code-editor.ts`), sin capa |

**Lo que F15 recibe, como supuesto con nombre.** El plan de F10c deja este orden de hojas, que fija `main-entry.spec.ts` de F10b:

1. `styles.css`;
2. `app/shell/shell.css`;
3. las hojas de página de Recorrido, Biblioteca, Proyecto, Método, el laboratorio (tres hojas), Atlas, campaña y Sistemas;
4. `shared/ui/form/form.css`, `entities/privacy-notice/…`, `features/sign-in/ui/access.css`, `pages/account/ui/account.css` y `pages/admin/ui/admin.css`.

Son 17 hojas. Las pantallas de F11b a F11d, F12b, F13 y F14 suman las suyas si entran antes que F15.

**Los tokens que deja F10c.** Salen de la tarea T042 de su plan y de `research-f10c.md`, R12 (rama `plan/f10c-estilos`, `1150db65`). F10c reescribe el `:root` de `styles.css` con 61 tokens que ya llevan los nombres del `@theme` de Tailwind v4, sin cambiar un píxel:

| Espacio | Tokens | Qué son |
| --- | --- | --- |
| `--color-*` | 22 | Los diez colores de hoy, renombrados, y doce literales del shell y de la base (`sidebar`, `nav-hover`, `backdrop`…) |
| `--font-*` | 3 | Las tres familias |
| `--text-*` | 21 | Un token por cada tamaño de letra del shell y de la base, nombrado por su medida (`--text-12`) |
| `--font-weight-*` | 4 | `400`, `500`, `550` y `650` |
| `--container-*` | 1 | `main`, de 1 330 px |
| `--spacing-*` | 8 | Las medidas del armado del shell: `sidebar`, `topbar` y `gutter`, con sus variantes |
| `--shadow-*` | 2 | `dialog` y `toast` |

- **Los alias.** Los 13 nombres de hoy (`--accent` y los demás) quedan en `:root` como alias de los nuevos, porque las hojas de página los siguen usando. Sólo `styles.css` y la hoja del shell usan los nombres nuevos.
- **El bloque de Go** redefine `--color-accent`, `--color-accent-dark` y `--color-accent-soft`, y vuelve a declarar sus tres alias: un alias se resuelve en `:root` y, si no, no seguiría al idioma.
- **Lo que queda literal:** el resto de los rellenos y márgenes del shell y de la base (43 valores distintos, casi ninguno múltiplo de 4), los radios, el interletrado, el interlineado y todos los valores de las hojas de página.
- **Las herramientas:**
  - el multiconjunto resuelto (`quickstart-f10c.md`, §3.7), que resuelve cada `var()` con los tokens del dist;
  - el barrido, que cuenta aparte las propiedades `--*` nuevas, porque Chromium las enumera en el estilo computado (lo midió F10c).

**Lo que F10c deja para F15** (R12, «Qué toma F15 de acá»), con el requisito que lo cubre:

| Lo que deja F10c | Dónde lo toma F15 |
| --- | --- |
| El bloque de tokens pasa del `:root` al `@theme` | FR-015 |
| El tono de Go queda como CSS común sobre `body[data-language='go']` | FR-016 |
| Los alias se borran cuando ninguna hoja los use | FR-036 |
| `text-12` también fija el interlineado (`--text-12--line-height`), y hoy las reglas fijan sólo el tamaño | FR-015 |
| Elegir la base de `--spacing` o una escala | Q3 y FR-031 |
| Traducir los anchos, de escritorio primero (`max-width`), a los `--breakpoint-*` de v4, que son de celular primero | FR-019 |
| `--color-white` vale `white`, como el `#fff` del tema por omisión | FR-015: el theme borra los valores por omisión, así que no hay dos definiciones |
| Los literales: los radios, el interletrado, el interlineado y los espacios | Q3 y FR-031 |
| El preflight, con su propio barrido | Q2 y FR-014 |

## Cómo conviven el CSS de hoy y Tailwind

Esta es la parte que más riesgo tiene: durante toda la migración conviven dos maneras de estilar. Cada fila dice qué haría Tailwind por omisión, qué decide la spec y con qué se prueba. Lo que Tailwind hace por omisión salió de Context7 («Fuentes consultadas»).

| Tema | Tailwind por omisión | Lo que decide la spec | Cómo se prueba |
| --- | --- | --- | --- |
| **Preflight** | `@import "tailwindcss"` trae `preflight.css` en `@layer base`. Saca los márgenes, el tamaño y el peso de los títulos, el estilo de las listas y el fondo de los botones, y pone `img` en `display: block` y los bordes en `0 solid` | **Fuera, en toda F15** (la opción recomendada de Q2). El CSS de hoy le gana al preflight sólo en las propiedades que declara; en el resto, el preflight cambiaría lo que hoy dan los valores del navegador. La base del taller son sus reglas globales (FR-014) | Ninguna regla de preflight en la salida; el barrido |
| **Las capas** | Declara `theme, base, components, utilities`. El CSS sin capa gana sobre cualquier capa, sin importar la especificidad | **Todo el CSS de hoy en una capa propia** (nombre provisional `legacy`), debajo de las utilidades y en el orden de hoy. Sin capa, `p { color: var(--muted) }` o `h1, h2, h3 { … }` le ganarían a cualquier utilidad de un elemento migrado. Dentro de una sola capa, el orden y la especificidad entre las hojas no cambian (FR-011 y FR-012) | La compuerta de F15a: el barrido en 0 con la capa y sin utilidades; la prueba del orden de las hojas |
| **`!important` en capas** | Entre capas, la importancia se invierte: un `!important` en una capa le gana a uno sin capa | **Ninguna utilidad con `!`.** `[hidden]` y la regla del movimiento reducido siguen ganando, porque sus `!important` están en la capa heredada, por debajo de utilidades sin importancia (FR-005) | Búsqueda estática; el barrido con el movimiento reducido encendido |
| **Lo que se inyecta en ejecución** | — | **Las reglas que compiten con el `<style>` sin capa de CodeMirror quedan fuera de la capa**, en una lista cerrada. Por ejemplo, `.cm-enhanced .cm-editor { height: 320px }` a 700 px o menos, contra el `height: 390px` del theme del editor. En una capa, el `<style>` del editor ganaría siempre (FR-013) | El barrido sobre el laboratorio con el editor montado, a 650, 590 y 375 px |
| **El orden de las hojas** | — | El de hoy, dentro de la capa | La prueba del orden de F10b y F10c (`main-entry.spec.ts`), que cambia en rojo |
| **Colisiones de nombres** | Genera una utilidad por cada palabra de las fuentes que coincida con una utilidad | **Ninguna clase heredada cambia su estilo computado.** Hoy coinciden `sr-only` y `visible` (`visibility: visible`); qué declaraciones difieren se confirma con la salida de F15a. Se resuelven como diga Q4 (FR-018) | La lista de utilidades de la salida de F15a; el barrido |
| **Las fuentes de clases** | Escanea desde el directorio de trabajo, que es la raíz del repositorio, todo lo que Git no ignora: `content/`, `specs/`, `docs/`, `backend/`… | **Sólo las fuentes del front** (`frontend/src`, `index.html` incluido) (FR-017) | La configuración, revisada; la lista de utilidades de la salida |
| **Los anchos** | Las variantes son de celular hacia arriba (`min-width`) en `rem`, y `max-*` genera `@media (width < X)`, que excluye el límite | **Las condiciones de hoy, exactas:** `max-width: 590px` incluye los 590 px (FR-019) | Un check estático: ninguna condición de `@media` nueva; el barrido a 590 y 850 px |
| **`:hover`** | Lo envuelve en `@media (hover: hover)`: en un teléfono, tocar ya no lo activa | **La semántica de hoy:** el `:hover` aplica con cualquier puntero (FR-020) | E2E del `:hover` por slice; ninguna `(hover: hover)` en la salida |
| **Unidades y colores** | El theme por omisión usa `rem` y colores OKLCH | **Píxeles y el hexadecimal de hoy.** El `rem` crece con el tamaño de letra que elige el alumno, y el barrido, a 16 px, no lo ve. OKLCH cambia cómo se escribe el color computado (FR-015) | El theme, revisado; el barrido |
| **El acento de cada lenguaje** | Un theme que remite a otra variable sin `inline` la resuelve en `:root`, igual que un alias declarado en `:root`: la sobreescritura de `body[data-language='go']` no llega | **El acento sigue el lenguaje sin recargar.** El bloque de Go redefine `--color-accent*` como CSS común, como lo deja F10c, y redeclara los alias mientras existan (FR-016) | El E2E de la marca de F10c, sin editar, y uno por utilidad de acento en el piloto |
| **Las variables que ninguna utilidad usa** | Por omisión emite sólo las variables del theme que se usan | **Todo token que lea una regla heredada llega a la salida,** aunque ninguna utilidad lo use. Hay dos maneras: `@theme static`, o que las hojas heredadas pasen por la misma entrada; las verifica el prototipo (FR-015) | La compuerta de F15a: el barrido en 0 |
| **Los tamaños de letra** | `text-12` fija el tamaño y, si el theme define `--text-12--line-height`, también el interlineado | **Una utilidad de tamaño no cambia el interlineado:** hoy las reglas fijan sólo el tamaño (FR-015) | El barrido |
| **Propiedades lógicas** | Las utilidades escriben `margin-inline` o `padding-block` y `calc(var(--spacing) * n)` | Se aceptan: en un documento de izquierda a derecha, el valor computado físico es el mismo | El barrido. El multiconjunto resuelto se aplica sólo a lo que queda en las hojas heredadas (FR-032) |
| **Las variables de Tailwind** | Registra `--tw-*` con `@property` y pone las variables del theme en `:root` | Se aceptan por nombre, en una lista cerrada, como F10c cuenta aparte sus 61 tokens nuevos (`newTokens`). Las variables de hoy, alias incluidos, conservan su valor (FR-001) | El barrido: Chromium enumera las propiedades personalizadas (lo midió F10c) |

## Qué cambia en la salida

| Parte de la salida | ¿Cambia? | Detalle |
| --- | --- | --- |
| El JavaScript | Sí, con F15b | Las cadenas de clases de los componentes crecen. El plugin no agrega JavaScript de runtime |
| El estilo | Sí | Con F15a, la declaración del orden de capas, la capa heredada y, quizás, un puñado de utilidades por colisión o por palabras sueltas del código. Con F15b, las utilidades de cada slice reemplazan su hoja |
| El marcado de `index.html` | No | El `<noscript>` y su clase siguen como hoy |
| La forma | No | Con A2: un documento con un script y un estilo en línea, bajo 1 500 000 caracteres. Si C4 ya entró: hojas enlazadas con su nonce y topes por archivo. Tailwind genera una hoja en el build: no inyecta `<style>` en ejecución ni escribe atributos `style` |
| Los avisos de licencia | Quizás | Si la salida lleva el aviso o código de Tailwind, `THIRD-PARTY-NOTICES.txt` suma su entrada (FR-024) |

## Cómo se demuestra que nada cambió

| Qué | Con qué | Requisitos |
| --- | --- | --- |
| El aspecto, en cada estado | El barrido de estilo computado de F10c (la grilla de 35 estados por 15 capturas, más los estados de los ítems que entren antes), con el puntero en `(-1, -1)` y los `<details>` cerrados. Antes, el control de determinismo: la base contra sí misma da 0 | FR-001 y FR-022 |
| Lo que queda en las hojas heredadas | El multiconjunto resuelto de F10c (`quickstart-f10c.md`, §3.7), sólo sobre las hojas que quedan | FR-032 |
| `:hover`, `:focus-visible`, `:active` y el toque | E2E por slice, con `toHaveCSS`, en verde contra la base antes de migrar. El barrido no los ve, porque saca el puntero y no da foco | FR-028 |
| Los anchos | Un check estático: las condiciones de `@media` de la salida son un subconjunto de las de la base | FR-019 |
| El preflight, los `!` y la paleta por omisión | Un check estático sobre la salida | FR-005, FR-014 y FR-015 |
| El comportamiento | La red entera, sin editar | FR-002 |
| El orden | La prueba del orden de las hojas | FR-012 |

## El ADR

Estado: **propuesta**. Lo escribe la base (F15a) en `docs/adr/`, con el número que asigne el coordinador. El 0009 es de E1, así que el 0010 es provisional. El usuario lo acepta antes de integrar F15a.

**Decide:**

1. **Tailwind CSS v4 como herramienta de build:**
   - la versión exacta que se apruebe, 4.3.3 al 2026-10-28;
   - con `@tailwindcss/vite`;
   - la configuración en CSS (`@theme`), sin `tailwind.config`;
   - en `devDependencies`: no agrega JavaScript de runtime.
2. **El theme son los tokens que deja F10c:** 61, con los nombres de v4, y el valor de cada uno se escribe una sola vez. Se borran los valores por omisión de Tailwind: la paleta, las fuentes, la escala, los radios y las sombras. Las unidades van en píxeles, los colores con el hexadecimal de hoy, y no hay modo oscuro.
3. **Sin preflight** (Q2).
4. **El orden de capas es explícito.** El CSS heredado vive en su propia capa, debajo de las utilidades, mientras exista. Las reglas que compiten con el `<style>` de CodeMirror quedan sin capa, como excepciones.
5. **Las fuentes de clases son sólo `frontend/src`.**
6. **Los anchos y el `:hover` se comportan como hoy.**
7. **La migración es por slice,** un PR cada uno, con el barrido en 0. Las clases base pasan a componentes.
8. **Sin `!`, sin estilos en línea y sin librerías de clases.** Las clases se escriben completas.
9. **El prefijo y las colisiones,** según Q4.

**Alternativas descartadas:**

| Alternativa | Qué daría | Por qué no |
| --- | --- | --- |
| **CSS Modules** (Vite lo trae, sin dependencias) | Nombres aislados por archivo; borrar el componente borra su hoja; migrar es renombrar clases, y es la opción más barata y con menos riesgo | El estilo sigue escrito a mano, no impone tokens ni escala, y entre módulos importa el orden de carga. El usuario eligió Tailwind (2026-10-28) |
| **CSS común con variables** (lo que deja F10c) | Costo cero | Conserva la cascada global, el orden entre hojas y la búsqueda de huérfanas sobre el DOM que necesitó F10c |
| **Tailwind v3.4** (`v3-lts`, 3.4.19) | Configuración en JS y soporte de navegadores más viejos | Es la línea en mantenimiento; la skill del proyecto y la decisión del usuario son de v4 |
| **UnoCSS** | Un motor atómico propio de Vite, parecido a Tailwind | Otro ecosistema y sin skill en el proyecto |
| **vanilla-extract o Panda CSS** | CSS escrito en TypeScript, sin runtime | Otro lenguaje de estilos, más configuración y sin skill |
| **CSS-in-JS en runtime** (styled-components, Emotion) | Estilos junto al componente | Inyecta `<style>` en ejecución, que choca con el nonce de la CSP de C4, y suma JavaScript al HTML |
| **Librerías de componentes** (Bootstrap, MUI, shadcn/ui) | Componentes hechos | Traen su propio diseño: sería un rediseño |

**Consecuencias:**

- **Navegadores.** Tailwind v4 está diseñado para Safari 16.4, Chrome 111 y Firefox 128. Desde la 4.1 degrada mejor en Safari 15 y en los Firefox anteriores a la 128. Con la capa heredada, todo el CSS depende de `@layer`: Chrome 99, Firefox 97 y Safari 15.4. Un navegador más viejo se queda sin estilos. Es un piso nuevo para el taller, que hoy declara ES2020.
- **Unos 15,6 MB de dependencias de desarrollo,** con binarios nativos por plataforma: gnu para la CI, musl para la imagen Alpine, darwin para macOS.
- **Dos maneras de estilar** conviven hasta F15c.
- **Clases largas en el TSX:** la revisión lee utilidades.
- **Los valores arbitrarios quedan a la vista** como deuda, contada en cada PR, para un ítem futuro de normalización.
- **Los topes de C4:** si C4 entró antes, los topes por archivo, medidos con un 10 % de margen, se vuelven a medir con permiso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alumno no nota nada (Priority: P1)

El alumno usa el taller igual que antes de cada PR de F15:

- los mismos colores, tamaños y espacios en los siete anchos;
- el mismo foco visible con el teclado;
- el mismo `:hover` al tocar en el teléfono;
- el mismo acento al cambiar de lenguaje;
- la misma impresión;
- nada se mueve con el movimiento reducido.

**Why this priority**: Es la regla del épico: el front no se rediseña. Sin esto, F15 no entra.

**Independent Test**: El barrido de estilo computado de la base contra la rama, sobre la grilla entera, y la red sin editar, después de cada PR.

**Acceptance Scenarios**:

1. **Dado** cualquier estado de la grilla en cualquiera de los siete anchos, con el movimiento reducido apagado o encendido, o en impresión, **cuando** se compara la rama con la base, **entonces** el barrido da 0 diferencias en las propiedades estándar.
2. **Dado** un elemento con `:hover` en un slice migrado, **cuando** se lo toca en un dispositivo táctil, **entonces** el estilo cambia como hoy.
3. **Dado** el lenguaje en Go, **cuando** se muestra una utilidad que usa el acento, **entonces** toma el acento de Go sin recargar.
4. **Dado** el movimiento reducido, **cuando** un elemento con una utilidad de transición cambia de estado, **entonces** no hay transición, como hoy.
5. **Dado** el foco con el teclado sobre un botón migrado, **cuando** se lo mira, **entonces** tiene el mismo contorno de hoy (3 px del acento, separado 4 px).

*Cubre: FR-001, FR-002, FR-005, FR-016, FR-019, FR-020 y FR-028; SC-001, SC-002 y SC-010.*

---

### User Story 2 - La base entra sin cambiar un píxel (Priority: P1)

Quien mantiene el front integra la base: la dependencia, el plugin, la entrada con sus capas, el theme, las fuentes acotadas y los checks. Todavía no hay ninguna utilidad en el código.

**Why this priority**: Separa el riesgo de la herramienta (las capas, el preflight, las colisiones, las fuentes) del de la migración. Si algo cambia acá, la culpa es de la convivencia y no de un slice.

**Independent Test**: El build de F15a contra la base: el barrido en 0, el multiconjunto de las hojas heredadas en 0 y 0, la lista de utilidades de la salida explicada una por una y el tamaño.

**Acceptance Scenarios**:

1. **Dado** el build de F15a, **cuando** se compara con la base, **entonces** el barrido da 0 y el multiconjunto, 0 y 0.
2. **Dada** la salida de F15a, **cuando** se la lee, **entonces** no tiene reglas de preflight, ni condiciones de `@media` nuevas, ni la paleta ni la escala por omisión, y cada utilidad generada tiene su motivo.
3. **Dado** el laboratorio con el editor montado a 375 px, **cuando** se lo compara con la base, **entonces** el editor tiene la misma altura y el mismo interlineado.
4. **Dado** un `npm ci` en la CI (gnu) y en la imagen web (musl), **cuando** corre el build, **entonces** termina sin errores.

*Cubre: FR-003, FR-009 a FR-019, FR-022 y FR-024; SC-003, SC-005 y SC-008.*

---

### User Story 3 - Quien mantiene escribe una pantalla nueva sin hoja de estilos (Priority: P1)

Después de la base, quien agrega una pantalla escribe su estilo con utilidades y los tokens del theme, en el componente, sin crear un `.css` y sin buscar quién más usa una clase.

**Why this priority**: Es el motivo de F15 para quien mantiene el front. Mide si la adopción sirve.

**Independent Test**: El primer ítem que entra después de F15a agrega su pantalla y el check de las hojas permitidas pasa sin sumar entradas.

**Acceptance Scenarios**:

1. **Dada** una pantalla nueva después de F15a, **cuando** se la integra, **entonces** no hay ningún `.css` nuevo y el check de las hojas permitidas pasa. `[NEEDS CLARIFICATION: Q5]`
2. **Dado** un color que no es token, **cuando** se lo escribe, **entonces** usa la forma que decida Q3, y el PR cuenta los valores arbitrarios.
3. **Dada** una clase armada por concatenación, **cuando** se construye, **entonces** la utilidad no existe. Por eso la regla de `AGENTS.md` pide clases completas, y el barrido o el E2E de la pantalla lo detectan.

*Cubre: FR-021, FR-023, FR-025 y FR-034; SC-006.*

---

### User Story 4 - Cada slice se migra en su PR y borra su hoja (Priority: P2)

Cada slice pasa de su hoja a utilidades en un PR propio. El PR abre con los E2E de lo que el barrido no ve, reemplaza las clases, convierte en componentes las clases base que usa y borra su hoja. Se puede revertir entero.

**Why this priority**: Es el grueso del trabajo. Cada PR es chico y reversible, como los ports.

**Independent Test**: Por PR, los E2E nuevos en verde contra la base y sin editar después, el barrido en 0, el multiconjunto de lo que queda igual al de la base menos la hoja borrada, y la hoja fuera de la lista de permitidas.

**Acceptance Scenarios**:

1. **Dado** el PR del piloto, **cuando** se integra, **entonces** su hoja ya no existe, el barrido da 0 y el tamaño queda informado. `[NEEDS CLARIFICATION: Q1]`
2. **Dado** un slice que usa `.button`, **cuando** se migra, **entonces** sus botones usan un componente de `shared/ui` idéntico a la vista, y la regla `.button` sigue en la capa heredada mientras otro slice sin migrar la use.
3. **Dado** un elemento migrado, **cuando** se lo lee, **entonces** no lleva a la vez clases heredadas de su slice y utilidades.
4. **Dado** un valor sin token, **cuando** se migra, **entonces** conserva el valor exacto de hoy. `[NEEDS CLARIFICATION: Q3]`

*Cubre: FR-027 a FR-033; SC-001, SC-002 y SC-007.*

---

### User Story 5 - Las dependencias entran con permiso y pesan lo medido (Priority: P2)

El usuario aprueba la descarga con nombre, versión exacta, origen, peso y licencia. Después, `package.json` y el lockfile quedan sincronizados, y el tamaño del HTML se informa en cada PR.

**Why this priority**: Es una regla del épico y del proyecto: ninguna descarga sin permiso.

**Independent Test**: El diff de `package.json` tiene exactamente `tailwindcss` y `@tailwindcss/vite` en `devDependencies`, con versión exacta, y el lockfile pasa `npm ci` en la CI y en la imagen.

**Acceptance Scenarios**:

1. **Dado** el permiso con la tabla de «Descargas previstas», **cuando** el coordinador instala, **entonces** entran los paquetes de la tabla y ninguno más, salvo los que el permiso nombre.
2. **Dado** el build, **cuando** se mide, **entonces** el JavaScript no tiene código de Tailwind en runtime.

*Cubre: FR-004, FR-009 y FR-010; SC-007 y SC-008.*

---

### User Story 6 - El taller termina con una sola manera de estilar (Priority: P3)

Al cerrar F15 no quedan hojas por slice. Las reglas globales viven en la capa base de la entrada y los tokens, sólo en el theme. Desaparecen la capa heredada y `styles.css`, y la documentación dice cómo se estila.

**Why this priority**: Sin cierre, las dos maneras conviven para siempre, que es lo peor de las dos.

**Independent Test**: La lista de hojas permitidas tiene la entrada y las excepciones declaradas; el barrido da 0 y la búsqueda de `styles.css` no encuentra nada.

**Acceptance Scenarios**:

1. **Dado** el cierre, **cuando** se buscan hojas `.css` en `frontend/`, **entonces** quedan la entrada y las excepciones de la lista, cada una con su motivo.
2. **Dada** una clase base sin usuarios, **cuando** cierra F15c, **entonces** se borra, con su evidencia.

*Cubre: FR-008, FR-026 y FR-035 a FR-037; SC-004 y SC-009.*

---

### Edge Cases

- **El editor.** CodeMirror inyecta un `<style>` sin capa al montarse, con el nonce de C4 si ya entró. Lo que hoy le gana por orden o por especificidad (`.cm-enhanced .cm-scroller` con `line-height: 1.8` contra el `1.7` del theme, o la altura de 320 px a 700 px o menos) perdería dentro de una capa. Va a la lista de excepciones (FR-013).
- **Lo que React no dibuja:** `html`, `body`, `[hidden]`, `::selection`, `dialog::backdrop`, el bloque `<noscript>` de `index.html`, el `<canvas>` de la celebración y el DOM interno del editor. No pueden llevar utilidades: quedan como CSS en la entrada (FR-033).
- **El toast:** su clase `visible` coincide con una utilidad de Tailwind. Hoy la utilidad no cambia el valor computado, porque `visibility: visible` es el inicial, pero igual se resuelve como colisión (FR-018).
- **`sr-only`:** la de hoy usa `clip: rect(0, 0, 0, 0)`. Si la utilidad de Tailwind oculta con otras declaraciones (a confirmar con la salida de F15a), las dos ocultan igual, pero el barrido ve la diferencia. Se resuelve con Q4.
- **Un ítem que entra en medio:** F11b, F12b, F13 o F14 pueden traer su hoja si entran antes de F15a, o escribir utilidades si entran después (Q5). Si entran durante F15b, rebasan; el slice que migra repite el barrido (FR-007).
- **C4 en el medio:** si C4 retira `vite-plugin-singlefile` mientras F15 está abierto, la salida cambia de forma pero no de contenido. El tope pasa a ser por archivo, y F15 lo mide en la forma vigente (FR-004).
- **Las palabras sueltas del código:** una cadena como `'hidden'` o `'block'` en el TypeScript genera una utilidad aunque ningún elemento la use. No cambia nada visible, pero pesa: F15a las lista.
- **El tamaño de letra del alumno:** si el navegador tiene otra letra por omisión, un valor en `rem` crecería y uno en `px`, no. Hoy casi todo está en `px`, y el theme también (FR-015).
- **Un navegador sin `@layer`:** con la capa heredada, ese navegador ignora todo el CSS. Es una consecuencia del ADR y se escribe en el README.
- **La impresión:** las reglas de impresión de cada slice migran con su variante `print:`, o se quedan como CSS de la entrada si nombran elementos del shell. El barrido incluye la impresión.

## Requirements *(mandatory)*

### Functional Requirements

Cada requisito lleva la parte que propone P5: *(F15a)*, *(F15b)* o *(F15c)*, o *(todas)*.

**Comunes**

- **FR-001** *(todas)*: Después de cada PR, el barrido de estilo computado DEBE dar 0 diferencias contra la base de ese PR, en todas las propiedades estándar.
  - **La grilla:** la de F10c, con los estados de los ítems que hayan entrado después.
  - **Las condiciones de captura:** el puntero en `(-1, -1)` y los `<details>` cerrados.
  - **El control de determinismo:** la base contra sí misma da 0 antes de comparar nada.
  - **Las propiedades personalizadas:** Chromium las enumera (lo midió F10c). Las de la base (los tokens de F10c y sus alias) conservan su valor, y las nuevas de Tailwind (`--tw-*` y las que agregue el theme) se aceptan sólo por nombre, en una lista cerrada del plan.
- **FR-002** *(todas)*: La red de la base DEBE pasar sin editarse después de cada PR: los 106 E2E de F1, los 17 de A2 y los que suman F3 a F14.
- **FR-003** *(todas)*: Ningún PR DEBE agregar estilos en línea: ni `style=`, ni `style={…}`, ni `setAttribute('style', …)`, ni `.cssText`. Tampoco el patrón de Tailwind que pasa una variable por `style` para un valor arbitrario. El CSS DEBE generarse en el build, sin `<style>` en ejecución, y la CSP de C4 no cambia.
- **FR-004** *(todas)*: La salida DEBE cumplir el contrato de entrega vigente cuando entra cada PR. Con A2, es un documento con un script y un estilo en línea, bajo 1 500 000 caracteres. Con C4, son hojas enlazadas con su nonce, bajo los topes por archivo. Cada PR informa el tamaño antes y después.
  - **El subpresupuesto de F15a:** 2 000 caracteres.
  - **El de cada PR de F15b:** 5 000 caracteres. Por encima, el PR se detiene y lo aprueba el usuario.
- **FR-005** *(todas)*: Se DEBEN conservar el teclado, el foco visible de hoy (contorno de 3 px del acento, separado 4 px), el diseño móvil en los siete anchos y el movimiento reducido.
  - La regla global del movimiento reducido DEBE seguir apagando las transiciones de todo elemento, incluidos los que usan utilidades.
  - Ninguna utilidad DEBE usar el modificador `!`.
- **FR-006** *(todas)*: Cada parte, y cada PR de F15b, DEBE poder revertirse entero. Lo que agrega una restricción (una prueba del orden, un check) abre en rojo, con TDD.
- **FR-007** *(todas)*: F15 DEBE integrarse de a uno con lo que toque la entrada de CSS, las hojas, `main.tsx` o `qa/`: F11b a F11d, F12b, F13, F14, C4 y A4. El que llega después rebasa y repite el barrido.
- **FR-008** *(todas)*: Cada PR DEBE actualizar en el mismo cambio la documentación que afecta. `AGENTS.md` dice cómo se estila; `docs/architecture.md` lleva el mapa de hojas y capas; `qa/AGENTS.md`, los checks; y el README, el piso de navegadores. La integra el agente principal.

**La base (F15a)**

- **FR-009** *(F15a)*: Tailwind CSS v4 y su plugin de Vite DEBEN entrar como dependencias de desarrollo:
  - con versión exacta y con el permiso del usuario (nombre, versión, origen, peso y licencia);
  - con el lockfile sincronizado;
  - con `npm ci` y el build en verde en Linux con glibc (la CI), en Alpine con musl (la imagen web) y, declarado y sin verificar, en macOS.
- **FR-010** *(F15a)*: El build DEBE funcionar con la forma de entrega vigente, la de A2 o la de C4. El CSS de Tailwind viaja en el mismo estilo que el resto, sin una hoja ni un pedido aparte.
- **FR-011** *(F15a)*: Una sola entrada de CSS DEBE declarar el orden de las capas de forma explícita: el theme, la capa base, la capa heredada y las utilidades. Los nombres son del plan.
- **FR-012** *(F15a)*: Todo el CSS de hoy DEBE entrar en la capa heredada, en el orden de hoy, sin cambiar una declaración: `styles.css`, la hoja del shell y cada hoja de slice. La excepción es el bloque de tokens, que pasa al `@theme` (FR-015). La prueba del orden de las hojas DEBE fijar el orden nuevo y abrir en rojo.
- **FR-013** *(F15a)*: Las reglas que compiten con estilos inyectados sin capa en ejecución (las `.cm-enhanced …` contra el theme de CodeMirror) DEBEN quedar fuera de la capa heredada, en una lista cerrada con el motivo de cada una. El plan las inventaría con el barrido del laboratorio con el editor montado en los siete anchos.
- **FR-014** *(todas)*: Ninguna regla del preflight de Tailwind DEBE llegar a la salida. La base del taller son sus reglas globales. `[NEEDS CLARIFICATION: Q2]`
- **FR-015** *(F15a)*: El theme DEBE salir de los 61 tokens que deja F10c, que pasan del `:root` al `@theme`. El valor de cada uno se escribe una sola vez: la capa heredada (por sus nombres o por los alias) y las utilidades leen la misma variable.
  - **Sin valores por omisión:** DEBE quitar la paleta, las fuentes, la escala de tamaños, los radios, las sombras y los anchos de Tailwind.
  - **Píxeles y hexadecimal:** las medidas van en píxeles, sin `rem`, y los colores con el hexadecimal de hoy.
  - **Lo que lee el CSS heredado:** todo token que use una regla heredada DEBE llegar a la salida, aunque ninguna utilidad lo use.
  - **Los tamaños de letra:** una utilidad `text-*` DEBE dejar el interlineado como hoy.
- **FR-016** *(F15a)*: Toda utilidad que use los tokens de acento (`--color-accent`, `--color-accent-dark` y `--color-accent-soft`) DEBE seguir el lenguaje sin recargar. El bloque de `body[data-language='go']` queda como CSS común, redefine esos tokens y redeclara sus alias mientras existan.
- **FR-017** *(F15a)*: Tailwind DEBE leer clases sólo de `frontend/src`, con `index.html`. Nunca de `content/`, `specs/`, `docs/`, `qa/`, `backend/`, `build/` ni `dist/`.
- **FR-018** *(F15a)*: Ninguna clase heredada DEBE cambiar su estilo computado porque Tailwind genere una utilidad con el mismo nombre.
  - Al especificar, coinciden `sr-only` y `visible`.
  - F15a lista todas las utilidades de su salida, cada una con su motivo.
  - La resolución es la de Q4. `[NEEDS CLARIFICATION: Q4]`
- **FR-019** *(todas)*: Las condiciones de `@media` de la salida DEBEN ser un subconjunto de las de la base, escritas con los mismos límites. `max-width: 590px` incluye los 590 px; la variante `max-*` de Tailwind, por omisión, no. Lo prueba un check estático, además del barrido.
- **FR-020** *(todas)*: Un estilo de `:hover` escrito con utilidades DEBE aplicar con cualquier puntero, como hoy, y no sólo con los que pueden pasar por encima. La salida no tiene `@media (hover: hover)`.
- **FR-021** *(todas)*: Las clases DEBEN escribirse completas en el código, sin concatenar ni interpolar fragmentos, para que Tailwind las encuentre. Una variante es un mapa de cadenas completas.
- **FR-022** *(F15a)*: La compuerta de F15a es el build con el plugin, la entrada, las capas y el theme, y sin ninguna utilidad en el código. Contra la base, DEBE dar:
  - el barrido en 0;
  - el multiconjunto de las hojas heredadas en 0 y 0;
  - el HTML dentro del subpresupuesto de FR-004.
- **FR-023** *(F15a)*: Un check DEBE fallar si aparece un `.css` en `frontend/` fuera de una lista cerrada: la entrada, las hojas heredadas que faltan migrar y las excepciones declaradas. Cada PR de F15b saca su hoja de la lista.
- **FR-024** *(F15a)*: Si la salida lleva el aviso o código de Tailwind, `frontend/THIRD-PARTY-NOTICES.txt` DEBE sumar su entrada (MIT), y la comparación de avisos de `qa/build-check.ts` sigue en verde.
- **FR-025** *(F15a)*: Desde F15a, la interfaz nueva DEBE estilarse con utilidades y los tokens del theme, sin hojas nuevas. `AGENTS.md` lo dice, junto con qué partes de la skill no aplican: OKLCH, modo oscuro, anillos de foco, CVA y `tailwind-merge`. `[NEEDS CLARIFICATION: Q5]`
- **FR-026** *(F15a)*: El PR de F15a DEBE agregar el ADR de la sección «El ADR» en estado «propuesta», con el número que asigne el coordinador. El usuario lo acepta antes de integrar F15a.

**La migración por slice (F15b)**

- **FR-027** *(F15b)*: Cada slice DEBE migrarse en su propio PR, en el orden que fije el plan. El primero es el piloto (Proyecto, la hoja más chica: 97 líneas en `master`). Son slices:
  - el shell;
  - cada página;
  - `shared/ui/form`, `entities/privacy-notice` y `features/sign-in`;
  - las pantallas que hayan entrado.

  `[NEEDS CLARIFICATION: Q1]`
- **FR-028** *(F15b)*: Cada PR de F15b DEBE abrir con los E2E de lo que el barrido no ve en ese slice: `:hover` (también por toque), `:focus-visible`, `:active` y las transiciones. Van escritos con el Page Object, en verde contra la base, y no se editan después.
- **FR-029** *(F15b)*: El PR DEBE reemplazar las clases del slice por utilidades en sus componentes y borrar su hoja entera. Un elemento migrado no lleva a la vez clases heredadas de su slice y utilidades.
- **FR-030** *(F15b)*: Cada clase base que use el slice (`.button`, `.eyebrow`, `.pill`, `.small-label`, `.empty-state` y las que encuentre el plan) DEBE pasar a un componente en la capa FSD más baja que la comparta, idéntico a la vista. La regla heredada sigue mientras otro slice sin migrar la use.
- **FR-031** *(F15b)*: Un valor DEBE usar su token si existe. Si no, toma la forma que decida Q3 y conserva el valor exacto de hoy. Cada PR cuenta sus valores arbitrarios. `[NEEDS CLARIFICATION: Q3]`
- **FR-032** *(F15b)*: El multiconjunto resuelto de las hojas heredadas que quedan DEBE ser el de la base menos las reglas de la hoja borrada. Para lo migrado, el oráculo es el barrido: las utilidades escriben propiedades lógicas y `calc()`, y el multiconjunto no aplica.
- **FR-033** *(F15b y F15c)*: Lo que React no dibuja (el documento, `[hidden]`, los pseudoelementos, el `<noscript>` de `index.html`, el `<canvas>` de la celebración y el DOM interno del editor) DEBE quedar como CSS en la entrada, en la capa base o en las excepciones, con su lista.
- **FR-034** *(todas)*: No DEBEN entrar `class-variance-authority`, `clsx`, `tailwind-merge` ni plugins de Prettier o ESLint para Tailwind. Un caso real pide permiso, como dice `AGENTS.md`.

**El cierre (F15c)**

- **FR-035** *(F15c)*: Las reglas globales DEBEN pasar a la capa base de la entrada, sin cambiar sus declaraciones ni su orden: el documento, la tipografía, los controles, `[hidden]`, el foco, el movimiento reducido y la impresión. Los tokens quedan sólo en el theme, con la sobreescritura de Go.
- **FR-036** *(F15c)*: La capa heredada y `styles.css` DEBEN desaparecer, y con ellos los 13 alias de F10c y su redeclaración en el bloque de Go. Una regla de clase base sin usuarios se borra con su evidencia, como en FR-055 de F10.
- **FR-037** *(F15c)*: Al cerrar, la lista de hojas permitidas DEBE tener sólo la entrada y las excepciones declaradas, y `docs/architecture.md` y `AGENTS.md` DEBEN describir el estado final.

### Key Entities *(include if feature involves data)*

- **Token:** un valor con nombre del taller (un color, una familia, un tamaño o un espacio), que el theme expone como utilidad y la capa heredada lee como variable. Su valor se escribe una sola vez.
- **Utilidad:** una clase que Tailwind genera porque la encuentra en el código del front.
- **Capa:** un nivel de la cascada con nombre. El orden de capas lo declara la entrada.
- **Hoja heredada:** una hoja de hoy que vive en la capa heredada hasta que su slice se migra.
- **Excepción:** una regla que queda fuera de las capas o en la entrada, con su motivo, como las que compiten con el editor o lo que React no dibuja.
- **Valor arbitrario:** un valor literal escrito en una utilidad porque no es token, contado como deuda.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** *(todas)*: La red de la base pasa sin una falla ni una edición después de cada PR.
- **SC-002** *(todas)*: El barrido da 0 diferencias en las propiedades estándar sobre la grilla entera después de cada PR, y el control de determinismo da 0 antes de comparar.
- **SC-003** *(F15a)*: Con el plugin y sin utilidades en el código, el barrido da 0, el multiconjunto da 0 y 0, y el HTML crece como mucho 2 000 caracteres. Cada utilidad de la salida tiene su motivo.
- **SC-004** *(F15c)*: Al cerrar no queda ninguna hoja por slice ni `styles.css`. Las hojas que quedan son la entrada y las excepciones de la lista, cada una con su motivo.
- **SC-005** *(todas)*: El CSS construido tiene 0 reglas de preflight, 0 condiciones de `@media` que no estaban en la base, 0 `@media (hover: hover)`, 0 utilidades con `!important` y 0 valores de la paleta, las fuentes o la escala por omisión de Tailwind.
- **SC-006** *(F15a)*: El primer ítem que entra después de F15a agrega su interfaz sin sumar ningún `.css` a la lista de hojas permitidas, según lo que decida Q5.
- **SC-007** *(todas)*: Cada PR informa el tamaño de la salida antes y después, en la forma vigente. Queda bajo el tope y, sin aprobación del usuario, dentro de su subpresupuesto: 2 000 caracteres para F15a y 5 000 para cada PR de F15b.
- **SC-008** *(F15a)*: `package.json` suma exactamente dos dependencias de desarrollo con versión exacta y ninguna de runtime. `npm ci` y el build pasan en la CI (glibc) y en la imagen web (musl).
- **SC-009** *(todas)*: Cada PR cierra con `npm run build`, `npm test`, `npm run lint` (con el mismo total de avisos de complejidad), `npm run format:check`, `npm run test:e2e` y `git diff --check`, y la imagen web construye.
- **SC-010** *(todas)*: En los E2E de cada slice migrado, el `:hover` por toque, el foco con el teclado, el acento de Go y el movimiento reducido dan los mismos valores que en la base.

## Riesgos

1. **Que la capa heredada cambie algo que hoy decide la cascada contra CSS sin capa.** Hoy sólo existe el `<style>` de CodeMirror. *Mitigación:* FR-013, con el barrido del laboratorio en los siete anchos, y la compuerta de F15a sin utilidades.
2. **Que una utilidad pierda en silencio** contra una regla heredada que todavía toca el elemento. *Mitigación:* la capa heredada debajo de las utilidades, la regla de FR-029 y el barrido.
3. **Los límites de los anchos y el `:hover`,** que Tailwind por omisión escribe distinto. *Mitigación:* FR-019 y FR-020, con checks estáticos, porque el barrido no cae en todos los límites y saca el puntero.
4. **El tamaño.** Las cadenas de clases crecen en el JavaScript, no sólo en el CSS. *Mitigación:* el subpresupuesto por PR y el piloto, que mide la relación antes de seguir.
5. **Las colisiones y las palabras sueltas** generan utilidades que nadie pidió. *Mitigación:* FR-017 y FR-018, con la lista de utilidades de F15a.
6. **Los tokens que sólo lee el CSS heredado.** Tailwind emite por omisión sólo las variables del theme que usa alguna utilidad, y al principio no hay ninguna. *Mitigación:* FR-015, con la compuerta de F15a.
7. **Los binarios nativos.** El lockfile tiene que traer las variantes opcionales de cada plataforma. El repositorio ya lo hace con Lightning CSS y Vite. *Mitigación:* `npm ci` en la CI y en la imagen, en la compuerta de F15a.
8. **El piso de navegadores** sube con `@layer` y con Tailwind v4. *Mitigación:* va en las consecuencias del ADR y en el README; si el usuario no lo acepta, el ADR vuelve a él.
9. **Una migración larga.** Las dos maneras conviven muchos PR. *Mitigación:* el cierre (F15c) y la línea de llegada de Q1.
10. **Lo que no se puede verificar al especificar:** el CSS que genera Tailwind con esta configuración, que `@tailwindcss/vite` y `vite-plugin-singlefile` convivan, que el navegador del barrido enumere propiedades personalizadas, y la forma real del arbitrario `max-[…]`. Los mide el prototipo del plan.

## Relación con otros ítems

| Ítem | Qué recibe o qué cambia |
| --- | --- |
| [F10](../024-f10-shell/spec.md) (F10c) | F15 empieza con F10c en `master`. Recibe la hoja del shell, el orden de las hojas con su prueba, la grilla del barrido y sus scripts, el multiconjunto resuelto, y los 61 tokens con los nombres de v4 y sus alias (T042; «Lo que F10c deja para F15»). El plan de F10c todavía dice `(0, 0)` para el puntero, contra la decisión de `(-1, -1)` (hallazgo) |
| [C4](../008-c4-exposicion/spec.md) | El CSS de Tailwind es una hoja del build: sirve con el nonce de los `<style>` y no pide atributos `style`. Si C4 entra antes, F15 mide sus topes por archivo; si entra después, C4 mide con el CSS de F15 |
| F11b a F11d, F12b, F13 y F14 | Si entran antes de F15a, traen su hoja, que F15b migra. Si entran después, siguen la regla de Q5. Se integran de a uno (FR-007) |
| [F5](../018-f5-sistemas/spec.md) | Su `style` de React con el color saneado queda como está (fuera de alcance) |
| F7b | La hoja del laboratorio tiene las reglas que compiten con el editor (FR-013) |
| La hoja de ruta del front | Falta la fila de F15, que depende de F10 (F10c). La constitución todavía dice «F1…F13». Las dos las corrige el coordinador |

## Assumptions

- **La base de F15** es `master` con F3 a F10 entregados, F10c incluido, con sus tokens (T042). El orden de las hojas, la grilla del barrido y los tokens son los del plan de F10c (`1150db65`); si la implementación de F10c cambia algo, F15 parte de lo que haya entrado.
- **La versión de Tailwind** es la que esté publicada y tenga al menos dos semanas cuando se pida el permiso: 4.3.3 al 2026-10-28, publicada el 2026-07-16.
- **Los subpresupuestos** (2 000 caracteres para F15a y 5 000 por PR de F15b) son estimaciones: el plan los ajusta con el prototipo y el piloto.
- **El piso de navegadores** de Tailwind v4 y de `@layer` es aceptable para los alumnos del taller.
- **La grilla de F10c** alcanza para cada slice. Si un slice tiene estados que la grilla no ve, su PR los suma antes de comparar.
- **Los nombres** de la entrada de CSS, de la capa heredada y de los checks son provisionales; los fija el plan.
- **Ningún comando** se ejecutó al especificar, salvo `npm view` para los metadatos del registro, que el encargo pidió.

## Alternativas consideradas

| Tema | Opciones | Elegida y motivo |
| --- | --- | --- |
| Herramienta | Tailwind v4, CSS Modules, CSS común con variables, Tailwind v3.4, UnoCSS, vanilla-extract o Panda, CSS-in-JS, librerías de componentes | Tailwind v4, por decisión del usuario. El resto, en «El ADR» |
| Preflight | Nunca; al final de la migración, con reglas que lo compensen; ahora, compensado | Abierta: Q2, con «nunca en F15» como recomendada |
| Convivencia | El CSS de hoy en una capa debajo de las utilidades; sin capa, con las utilidades perdiendo; utilidades con `important` | **La capa heredada.** Sin capa, las reglas globales de elementos (`p`, `h1` a `h3`, `a`, `button`) les ganan a las utilidades de cualquier elemento migrado. Con `important`, las utilidades les ganan a `[hidden]` y al movimiento reducido |
| La compuerta de la base | Con un slice piloto; sin utilidades | **Sin utilidades.** Separa el riesgo de la herramienta del de la migración. El piloto abre F15b |
| Librerías de clases | CVA, `clsx` y `tailwind-merge`, como la skill; mapas de cadenas | **Mapas de cadenas.** YAGNI, y `AGENTS.md`: cada dependencia entra con su primer caso real |
| Los anchos | Los de Tailwind (`sm` a `2xl`); los de hoy | **Los de hoy.** Los de Tailwind cambian los límites |

## Preguntas para el clarify

Cada una con sus opciones y una recomendada, con su motivo y su costo.

**Q1 · El alcance: ¿se migra todo, o sólo se adopta para lo nuevo?**

| Opción | Qué implica | Costo |
| --- | --- | --- |
| **A (recomendada)** | La base (F15a), después la migración de todos los slices, un PR cada uno con el piloto primero (F15b), y el cierre (F15c), con línea de llegada | Unos quince PR chicos (la base, catorce slices y el cierre), cada uno con su barrido. Es lo que cumple «una sola manera de estilar» |
| B | La base y la regla para lo nuevo; cada slice se migra cuando otro trabajo lo toque | Más barato ahora, pero sin línea de llegada: la capa heredada y `styles.css` quedan para siempre |
| C | La base y la migración entera en un solo PR | Imposible de revisar y de revertir por partes; un fallo del barrido bloquea todo |

**Motivo de A:** cada PR es tan chico y reversible como un port, y sólo el cierre elimina la convivencia, que es el costo principal de B.

**Q2 · El preflight de Tailwind: ¿entra alguna vez en F15?**

F10c lo deja como parte del ADR de F15, con su propio barrido (R12). El preflight saca los márgenes, el tamaño y el peso de los títulos, el estilo de las listas y el fondo de los botones, pone `img` en `display: block` y deja los bordes en `0 solid`.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| **A (recomendada)** | Nunca en F15. La base del taller son sus reglas globales, que en F15c pasan a la capa base de la entrada | Ninguno visible. Las utilidades conviven con los valores del navegador que hoy usa el taller, y quien escribe interfaz nueva no puede dar por hecho el reseteo de la documentación de Tailwind |
| B | Al cerrar (F15c), con su barrido, y con las reglas que hagan falta para que dé 0 | Reglas que deshacen el preflight elemento por elemento: código que existe sólo para anular otro |
| C | Desde F15a, con las mismas reglas compensatorias | Lo mismo que B, y además en convivencia con todo el CSS sin migrar |

**Motivo de A:** con la regla de que nada visible cambie, el preflight sólo puede entrar compensado, y compensarlo no le da nada al alumno ni a quien mantiene el front. Si el usuario lo quiere, va con un rediseño.

**Q3 · Los valores que no son tokens: ¿qué forma toman al migrar?**

F10c deja tokens para los colores, los tamaños, los pesos y el armado del shell y de la base. Quedan literales los demás espacios (43 valores en el shell y la base), los radios, el interletrado, el interlineado y todos los valores de las hojas de página. En `master` hay 106 colores, 57 tamaños y 46 espacios distintos.

| Opción | Qué implica | Costo |
| --- | --- | --- |
| **A (recomendada)** | La escala de Tailwind en píxeles (`--spacing: 4px`), tokens donde los haya y, para el resto, un valor arbitrario con el literal de hoy (`rounded-[7px]`, `bg-[#dedfcc]`) | Muchas clases con corchetes, contadas como deuda. Conserva el modelo de Tailwind: `p-4` son 16 px, como en la documentación y en la costumbre de los agentes |
| B | `--spacing: 1px`, para que cada espacio sea una utilidad numérica exacta (`p-13` son 13 px) | Sin corchetes para los espacios, pero `p-4` serían 4 px, contra toda la documentación de Tailwind: un error fácil para un agente en una pantalla nueva |
| C | Un token por cada valor repetido; los de un solo uso, arbitrarios | Decenas de tokens con nombres sin sentido de diseño |

**Motivo de A:** respeta la paridad sin inventar nombres, y deja la normalización para un ítem con aprobación visual. Normalizar ahora es un rediseño y no es una opción de F15.

**Q4 · Las colisiones de nombres: ¿prefijo o resolución una por una?**

| Opción | Qué implica | Costo |
| --- | --- | --- |
| **A (recomendada)** | Sin prefijo. F15a inventaría las colisiones (hoy `sr-only` y `visible`) y las resuelve sin cambiar el estilo computado, por ejemplo renombrando la clase heredada o excluyendo la utilidad. Un check repite el inventario | Una tarea en F15a; las clases quedan como en la documentación |
| B | El prefijo `tw:` en todas las utilidades | Cero colisiones y lo migrado se distingue a simple vista, pero las clases son más largas y sacar el prefijo al cerrar es una edición masiva |

**Motivo de A:** hay dos colisiones, y el prefijo cobra en cada clase para siempre.

**Q5 · La regla para lo nuevo: ¿los ítems que entran después de F15a usan utilidades?**

| Opción | Qué implica | Costo |
| --- | --- | --- |
| **A (recomendada)** | Sí: desde F15a, toda interfaz nueva usa utilidades y los tokens, sin hojas nuevas. El check de las hojas permitidas lo hace cumplir | Los planes de F11b a F11d, F12b, F13 y F14 que se escriban después de F15a lo siguen |
| B | Libre hasta que su slice se migre | Suma hojas que F15b después migra |
| C | Recién al cerrar F15b | Sigue creciendo el CSS que F15 quiere retirar |

**Motivo de A:** cada hoja nueva es trabajo de F15b.

## La partición propuesta

**P5, sin aplicar.** La spec tiene 37 requisitos, bajo los 52 de C3a, así que el tamaño no obliga a partirla. La partición se propone por la forma del trabajo, como F7a y F7b: la base tiene un riesgo distinto al de la migración, y cada slice es un PR.

| Parte | Qué entra | Requisitos propios | Comunes | Total |
| --- | --- | --- | --- | --- |
| F15a · La base | El ADR, la dependencia, la entrada con sus capas, el theme, sin preflight, las fuentes, las colisiones, los anchos, el `:hover`, los checks, la regla para lo nuevo y la compuerta sin utilidades | FR-009 a FR-013, FR-015 a FR-018 y FR-022 a FR-026 (14) | FR-001 a FR-008, FR-014, FR-019 a FR-021 y FR-034 (13) | 27 |
| F15b · La migración por slice | Un PR por slice, con el piloto primero: los E2E de lo que el barrido no ve, las utilidades, los componentes de las clases base y la hoja borrada | FR-027 a FR-033 (7) | Los mismos 13 | 20 |
| F15c · El cierre | Las reglas globales a la capa base, sin capa heredada ni `styles.css`, y la lista final | FR-035 a FR-037 (3), más FR-033 | Los mismos 13 | 17 |

**El costo:** tres planes, o uno con tres partes como F10. F15b es una cola de PR que se integran de a uno, y entre F15a y F15c conviven las dos maneras. Sin partir, la base y la migración irían en el mismo plan, y un fallo de la herramienta frenaría a los slices.

## Acciones del usuario

Los agentes no las hacen.

| Cuándo | Acción |
| --- | --- |
| Ahora | Responder Q1 a Q5 y P5 |
| F15a, antes de instalar | Permiso para la descarga de la tabla de «Descargas previstas» (nombre, versión exacta, origen, peso y licencia) |
| F15a, antes de integrar | Aceptar el ADR y el piso de navegadores que trae |
| F15b, si un PR pasa los 5 000 caracteres | Aprobar el tamaño o pedir otra forma |
| Cada PR | Permiso para construir la imagen web (`docker compose build taller`), como en cada port |

## Descargas previstas

Del registro de npm (`https://registry.npmjs.org/`), consultado el 2026-10-28 con `npm view`. Todo va a `devDependencies` y nada viaja en el JavaScript.

| Paquete | Versión | Licencia | Desempaquetado (bytes) | Nota |
| --- | --- | --- | --- | --- |
| `tailwindcss` | 4.3.3 | MIT | 772 893 | Directa. Publicada el 2026-07-16; `latest` |
| `@tailwindcss/vite` | 4.3.3 | MIT | 13 509 | Directa. Pide `vite` `^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8`, y el lockfile tiene 8.3.2 |
| `@tailwindcss/node` | 4.3.3 | MIT | 130 939 | Fija `lightningcss` 1.32.0 exacta |
| `@tailwindcss/oxide` | 4.3.3 | MIT | 29 502 | Pide Node 20 o más; el proyecto usa 24 |
| `@tailwindcss/oxide-linux-x64-gnu` | 4.3.3 | MIT | 2 999 135 | Binario de la CI y de Linux. En la imagen, `-linux-x64-musl` (3 017 516); en macOS, `-darwin-arm64` (2 928 452) |
| `lightningcss`, copia anidada | 1.32.0 | MPL-2.0 | 510 515 | Vite pide `^1.33.0`, y el lockfile ya tiene 1.33.0: entra una segunda copia |
| `lightningcss-linux-x64-gnu` | 1.32.0 | MPL-2.0 | 10 056 972 | En la imagen, `-linux-x64-musl` (10 052 671); en macOS, `-darwin-arm64` (8 532 867) |
| `magic-string`, copia anidada | 0.30.21 | MIT | 459 761 | El lockfile tiene 1.4.3 |
| `enhanced-resolve` | 5.26.0 | MIT | 543 900 | |
| `tapable` | 2.3.3 | MIT | 73 418 | |
| `graceful-fs` | 4.2.11 | ISC | 32 535 | |

- **El total en Linux con glibc:** 11 paquetes y unos 15,6 MB desempaquetados. Es una estimación, porque npm puede deduplicar distinto.
- **Lo que ya está en el lockfile y no se baja:** `jiti` 2.7.0, `source-map-js` 1.2.2, `@jridgewell/remapping` 2.3.5, `@jridgewell/sourcemap-codec` 1.6.0 y `detect-libc` 2.1.2.
- **Las licencias:** MIT, ISC y MPL-2.0. Lightning CSS ya está en el proyecto por Vite.
- **El peso en el HTML:** cerca de 0 con F15a. Tailwind genera sólo las utilidades que encuentra y sólo las variables del theme que se usan. Con F15b, depende de cada slice: lo mide el piloto.

## Fuentes consultadas (2026-10-28)

- **Context7, la segunda instancia,** con `/tailwindlabs/tailwindcss.com`: la documentación del sitio de Tailwind, v4 vigente, sin fijar a 4.3.3. Las consultas y lo que dejaron:

  | Tema | Conclusión |
  | --- | --- |
  | La instalación con Vite | Se instala `tailwindcss` con `@tailwindcss/vite`, se agrega `tailwindcss()` a los plugins y se escribe `@import "tailwindcss"` en el CSS. El plugin de Vite rinde más que PostCSS |
  | El preflight | `@import "tailwindcss"` equivale a `@layer theme, base, components, utilities` y a importar `theme.css`, `preflight.css` y `utilities.css` en sus capas. Para quitar el preflight, se importan sólo `theme.css` y `utilities.css`. Las opciones `source()`, `theme()`, `prefix()` e `important` van en su import |
  | `@theme` | Las variables del theme crean utilidades y variantes. `--color-*: initial` o `--*: initial` borran los valores por omisión. `@theme inline` hace falta cuando el theme remite a otra variable que cambia en ejecución. Por omisión sólo se emiten las variables usadas; `@theme static` las emite todas |
  | Las capas | El CSS sin capa le gana a cualquier capa. `@layer base` es para estilos base, y `@utility` reemplaza a `@layer utilities` de v3 |
  | El tamaño y las fuentes | Escanea desde el directorio de trabajo todo lo que Git no ignora, salvo CSS, binarios, `node_modules` y lockfiles. Lo acotan `source("…")`, `source(none)` con `@source`, y `@source not`. `@source inline()` fuerza una utilidad. Sólo se generan las utilidades que se encuentran, y las clases tienen que estar completas en el código |
  | Los navegadores | v4 está diseñada para Safari 16.4, Chrome 111 y Firefox 128, por `@property` y `color-mix()`. La 4.1 degrada mejor en Safari 15 y en los Firefox anteriores |
  | Los anchos y el `:hover` | `max-*` genera `@media (width < X)`. `hover:` va dentro de `@media (hover: hover)`, y `@custom-variant hover (&:hover)` devuelve la semántica anterior. `@custom-variant` define variantes con selectores o con `@media` |
  | El espaciado y los arbitrarios | `p-13` es `calc(var(--spacing) * 13)`, y el valor por omisión de `--spacing` es `0.25rem`. Se admiten valores arbitrarios (`p-[…]`). Una hoja aparte necesita `@reference` para usar `@apply` |

- **El registro de npm** (`npm view`): las versiones, las licencias, los pesos y las dependencias de «Descargas previstas»; los `dist-tags` de `tailwindcss` (`latest` 4.3.3 y `v3-lts` 3.4.19).
- **El código de `master` (`bb480677`):**
  - las siete hojas, `main.tsx`, `frontend/vite.config.ts` y `qa/build-check.ts`;
  - el theme del editor (`mount-code-editor.ts`) y `package-lock.json`;
  - `frontend/Dockerfile` (Node 24 sobre Alpine) y `.github/workflows/ci.yml`.
- **El plan de F10c** (rama `plan/f10c-estilos`, `1150db65`, PR #91): `plan-f10c.md` (T042), `research-f10c.md` (R10 a R12 y su tabla de Context7), `quickstart-f10c.md` y `contracts/stylesheets-f10c.md`.
- **La skill** [`tailwind-design-system`](../../.agents/skills/tailwind-design-system/SKILL.md) y su `references/details.md`. Se toman de ella el `@theme` en CSS, la jerarquía de tokens y la arquitectura de componentes por variantes. No se toman OKLCH, el modo oscuro, los anillos de foco, CVA ni `tailwind-merge`, porque cambiarían el aspecto o sumarían dependencias.
