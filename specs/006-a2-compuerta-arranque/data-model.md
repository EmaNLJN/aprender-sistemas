# Data model: A2 · Compuerta de arranque

**Fecha**: 2026-10-05 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

A2 no suma tablas ni cambia el generador. Este archivo fija las formas que se pasan entre las tareas: las 17 porciones y su forma mínima, la fuente de contenido, los fallos, los estados de la compuerta, el contenido tipado, el artefacto servido, la secuencia de arranque y la señal de publicación. Los nombres son los del código; el código y las pruebas van en inglés y los mensajes para el alumno, en español.

## Las 17 porciones

Son las de `portions` de `build/curriculum.meta.json`, en ese orden (lo fija `portionsOf` de `tools/content/meta.ts`). Un spec de Vitest exige que `PORTION_NAMES` sea esa lista.

| Porción | Dónde está en el documento | Forma mínima (`findPortionProblem`) | Quién la lee hoy |
| --- | --- | --- | --- |
| `lab.rust`, `lab.go` | `lab.<lenguaje>` | Lista no vacía; cada entrada, un objeto con `id` de texto no vacío | `register-catalogs.ts` (`RUST_LAB`, `GO_LAB`) |
| `quests.rust`, `quests.go` | `quests.<lenguaje>` | Ídem | `register-catalogs.ts` (`RUST_QUESTS`, `GO_QUESTS`) |
| `cores.lowlevel`, `cores.infra`, `cores.play`, `cores.pc` | `cores.<dominio>` | Ídem | `register-systems-<dominio>.ts` (`SYSTEMS_*_LABS`) |
| `campaign.rust`, `campaign.go` | `campaign.<lenguaje>` | Ídem | `register-catalogs.ts` (`RUST_CAMPAIGN`, `GO_CAMPAIGN`) |
| `workshops.lowlevel`, `workshops.infra`, `workshops.play`, `workshops.pc` | `workshops.<dominio>` | Ídem | `register-systems-<dominio>.ts` (`SYSTEMS_*.workshops`) |
| `atlas.rust`, `atlas.go` | `atlas.<lenguaje>` | Ídem | `register-atlas.tsx` (`entries` de `AtlasPage`) |
| `guide` | `guide` | Objeto con `resources` (lista no vacía), `sources` (lista) y `tracks`, un objeto con `rust` y `go`, cada uno con `modules` (lista no vacía) | `register-catalogs.ts` (`GUIDE_DATA`) |

Una lista vacía cuenta como forma incorrecta: `lab.js` armaría su catálogo con `|| []` y su almacén descartaría el progreso de los ejercicios que faltan. Los dominios son `lowlevel`, `infra`, `play` y `pc` (`SYSTEMS_DOMAINS`).

## Fuente de contenido

```ts
// frontend/src/shared/api/content/content-source.ts
interface SourcePortion {
  readonly name: PortionName;
  readonly version: string;      // 32 hexadecimales: los primeros de documentHash
  readonly data: unknown;        // undefined si la fuente no tiene la porción
}
interface ContentRequest { readonly signal: AbortSignal }
interface ContentSource {
  read(names: readonly PortionName[], request: ContentRequest): Promise<readonly SourcePortion[]>;
}
```

- **Fuente estática (A2):** `createStaticContentSource({ url, version })` hace un `fetch(url, { signal })` del documento, lo parte en las 17 porciones por referencia (sin copiar) y le pone a cada una la `version` con la que se construyó. La versión no se lee de la respuesta: la fija el nombre del archivo (research.md, R3).
- **Fuente de la API (A3):** devuelve cada porción con el `Content-Version` de su respuesta. La compuerta no cambia.

## Fallos

`ContentLoadError` lleva un `kind` de una lista cerrada y un `detail` para quien opera (un estado o el nombre de una porción). El `kind` va en el DOM como `data-failure`; el `detail`, no.

| `kind` | Cuándo | Lo produce | Mensaje |
| --- | --- | --- | --- |
| `network` | `fetch` rechaza sin que la señal esté abortada, o un error que no es de la lista | la fuente | general |
| `status` | La respuesta no es 2xx y no es 404 (`detail` = el estado) | la fuente | general |
| `version` | 404 (la fuente estática); o una porción con una versión distinta de la esperada (`detail` = el nombre) | la fuente o la compuerta | de versión |
| `timeout` | Pasó el tope de espera: la compuerta abortó la señal | la compuerta | general |
| `body` | El cuerpo no es JSON, o es JSON y no es un objeto | la fuente | general |
| `missing` | Falta una porción, o su `data` es `undefined` (`detail` = el nombre) | la compuerta | general |
| `shape` | Una porción no tiene la forma de su nombre (`detail` = el nombre) | la compuerta | general |

**Mensajes.** El general es «El contenido del taller no se pudo cargar. Tu progreso sigue guardado en este navegador. Revisá tu conexión y probá de nuevo.». El de versión es «El contenido del taller no se pudo cargar: puede que haya una versión nueva. Tu progreso sigue guardado en este navegador. Recargá la página y, si sigue igual, probá de nuevo.». El título es «No se pudo cargar el contenido» y el botón, «Reintentar». El estado de carga dice «Cargando el contenido del taller…».

**Los 8 modos de SC-004 contra los `kind`.** Red caída es `network`, estado 404 es `version`, estado 500 es `status`, tope de espera es `timeout`, cuerpo que no es JSON es `body`, porción ausente es `missing`, porción con otra forma es `shape` y versión distinta es `version`: la fuente estática no puede observar otra versión más que como 404, y la compuerta la prueba con una fuente de prueba.

## Estados de la compuerta

Un intento es un pedido con sus dos temporizadores. Los temporizadores no hacen nada una vez que el intento terminó.

| Estado | Entra por | Qué ve el alumno | Sale por |
| --- | --- | --- | --- |
| Esperando, sin aviso | El arranque | `#main` vacío | Éxito, fallo, o 400 ms |
| Esperando, con aviso | Pasaron 400 ms del primer intento, o se pulsó «Reintentar» (al instante) | «Cargando el contenido del taller…» (`role="status"`) | Éxito o fallo |
| Fallido | Un fallo de la tabla de arriba | Título, mensaje (`role="alert"`) y «Reintentar», con el foco en el botón | «Reintentar» (un solo intento a la vez) |
| Publicado | Las 17 porciones válidas y de la versión esperada | La compuerta vacía `#main` y sigue la etapa `legacyViews` | — |

| Parámetro | Valor | Dónde |
| --- | --- | --- |
| Tope de espera | 20.000 ms, para el pedido y la lectura del cuerpo | `content-stage.ts` |
| Umbral del estado de carga | 400 ms, sólo en el primer intento | `content-stage.ts` |
| Pedidos a la vez | 1 | `content-gate.ts` |

## Contenido tipado

```ts
// frontend/src/app/content/content.ts
interface Content {
  lab: Record<'rust' | 'go', Exercise[]>;
  quests: Record<'rust' | 'go', Exercise[]>;
  cores: Record<SystemsDomain, Exercise[]>;
  campaign: Record<'rust' | 'go', CampaignWorldDefinition[]>;
  workshops: Record<SystemsDomain, SystemsWorkshop[]>;
  atlas: AtlasByLanguage;
  guide: GuideData;
}
const CONTENT_PUBLISHED_EVENT = 'taller:content-published';
function getContent(): Content;   // lanza si todavía no se publicó
```

La forma agrupada es la del documento de `tools/content`. `assembleContent` arma el `Content` con las porciones por referencia, sin copias y sin congelar: los globals siguen teniendo los mismos valores y el mismo orden de claves. Las listas no son `readonly` porque los globals de `Window` son listas mutables. El almacén de `shared/api/content/content-holder.ts` guarda el valor sin tipar:

```ts
function storeContent(content: unknown): void;     // lanza si ya hay contenido
function readStoredContent(): unknown;             // lanza si todavía no hay
```

Los tipos salen de las entidades: `Exercise` (`entities/exercise`), `CampaignWorldDefinition` (`entities/campaign`), `SystemsWorkshop` (`entities/systems-workshop`), `GuideData` (`entities/guide`) y `AtlasByLanguage` (`pages/atlas`, que lo reexporta como tipo en su API pública).

## El artefacto servido

| Campo | Valor |
| --- | --- |
| Origen | `build/curriculum.json`, tal cual lo escribe `tools/content` (con sangría de 2 espacios y salto de línea final) |
| Destino | `dist/content/curriculum.<versión>.json`. La imagen copia `dist/` entero a `/usr/share/nginx/html/`, así que queda en `/usr/share/nginx/html/content/curriculum.<versión>.json`; la vista previa monta `dist/` entero |
| Versión | Los primeros 32 hexadecimales de `documentHash` de `build/curriculum.meta.json` (lo que C2 publica como `Content-Version`) |
| Bytes | Los mismos del origen: `sha256(destino) == documentHash` completo |
| URL | `/content/curriculum.<versión>.json`, del mismo origen |
| Constante del build | `__CONTENT_VERSION__`, la versión, definida por el plugin de Vite y por los empaquetados de `qa/` |
| Encabezados | Los de Nginx para un estático (`Content-Type: application/json`, gzip por `gzip_types`, `ETag` y `Last-Modified`); no hay `Cache-Control` y no hace falta: el nombre direcciona el contenido |

## La secuencia de arranque

```ts
// frontend/src/app/boot/run-boot.ts
interface BootStage {
  readonly name: string;
  run(): Promise<void>;     // se resuelve al terminar; una etapa que espera al alumno queda pendiente
}
```

| Etapa | Qué hace | Archivo |
| --- | --- | --- |
| `contentGate` | Pide, valida y publica el contenido; si falla, muestra el error y espera | `content-stage.ts` (el cableado), `content-gate.ts` (la lógica) |
| `legacyViews` | Evalúa la cadena legacy en orden con `import()` y, si F2.3 la dejó, llama al arranque explícito | `legacy-views.ts` |

`main.tsx` importa las hojas de estilo y llama `runBoot([contentGate, legacyViews])`, y registra con `console.error` lo que la cadena lance. F11 suma una etapa previa y F10 una posterior; A3 cambia el cableado de `content-stage.ts`.

## La señal de publicación

`window.dispatchEvent(new CustomEvent('taller:content-published', { detail: content }))`, después de guardar el contenido y antes de que empiece la etapa siguiente. El `detail` es el `Content` publicado, el mismo objeto. La observan T001 (la marca del spike), el arnés de `boot-check` y el check del bundle construido.

## La página construida

`qa/lib/built-page.ts` es el único lugar de los checks que sabe cómo arranca `dist/`. Hoy, con `vite-plugin-singlefile`, es un HTML con un script en línea; con C4 serán varios archivos, y cambian ese módulo y la función de `build-check` que agrupa las aserciones de singlefile, sin tocar los checks.

```ts
// qa/lib/built-page.ts
interface BuiltScript { readonly name: string; readonly source: string }
interface BuiltPage {
  readonly html: string;
  readonly scripts: readonly BuiltScript[];   // los scripts de módulo que arrancan la página, en orden
  readonly bootText: string;                  // el HTML y todos los scripts: donde se buscan el currículo y las licencias
  readonly bootSize: number;                  // lo que mide el tope de tamaño: hoy, html.length
}
function readBuiltPage(root?: string): BuiltPage;
function readBuiltContent(root?: string): { fileName: string; bytes: Buffer };   // el puente de A2: A3 lo retira
function evaluateBuiltPage(page: BuiltPage, context: vm.Context): Promise<void>; // necesita --experimental-vm-modules
```


## Relación con los requisitos

| Requisito | Dónde queda en este modelo |
| --- | --- |
| FR-001, FR-002 | Fallos `missing`/`shape`/`version`; `assembleContent` y los adaptadores que publican los globals |
| FR-006 | `Content`, `getContent()` y el almacén |
| FR-007, FR-009 a FR-011 | Fallos, estados y parámetros; la versión en el nombre del artefacto |
| FR-012, FR-013 | `ContentSource` y `BootStage` |
| FR-004, FR-014 a FR-016 | El artefacto servido |
| FR-018 | Las 17 porciones y los globals, que el check del bundle construido lee con la señal de publicación |
| FR-025 | La señal de publicación |
