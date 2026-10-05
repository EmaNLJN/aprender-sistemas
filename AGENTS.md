# AGENTS.md — Taller Rust y Go

## Proyecto

Taller educativo en español con ejercicios de Rust/Go y simulaciones de Sistemas.
La interfaz migra por funcionalidades a **React con TypeScript/TSX**; Vite construye
un HTML autónomo y Nginx lo sirve; Nginx también pasa `/api/` a la API Laravel de `api/`
(ADR 0004). Los compiladores son los Playgrounds oficiales.
Atlas es la primera vista migrada; el resto conserva adaptadores legacy temporales.

## Organización

- Antes de cambiar un flujo educativo, leé `README.md`.
- Para agregar o editar contenido del currículo (ejercicios, desafíos, núcleos, mundos,
  talleres, Atlas o guía), leé «Contenido del currículo» en `README.md`: se edita `content/`,
  nunca `build/`.
- Al ubicar código, reorganizar módulos, cambiar contratos o migrar una vista,
  leé `docs/architecture.md`: mapa de fuentes y reglas de React/clean code.
- Para elegir checks, agregar pruebas o trabajar con TDD, leé `qa/AGENTS.md`.
- Para activar, instalar o actualizar skills, leé `docs/agent-skills.md`.
- Para usar o reinstalar React Doctor y Desloppify, leé `tools/quality/AGENTS.md`.
- Para continuar el refactor en curso, leé `docs/refactor-roadmap.md`.
- Para planificar o especificar trabajo del backend (hoja de ruta, specs, planes, tareas o
  bugs), leé `.specify/memory/constitution.md` y `specs/backend-multiusuario/roadmap.md`.

La raíz conserva sólo las vistas legacy que faltan migrar a React (`app.js`,
`lab.js`, `campaign.js`, `systems.js`, `lab-explorers.js` y `quest-explorers.js`).
El resto vive en `src/` por capas FSD (`app`, `pages`, `features`, `entities`,
`shared`); el mapa está en `docs/architecture.md`. `qa/` reúne verificaciones e investigación; `docs/` contiene reglas
específicas de desarrollo; `.agents/skills/` contiene las skills del proyecto.
`specs/` guarda la hoja de ruta y las specs de Spec Kit, y `.specify/`, su constitución,
plantillas y scripts; `docs/plans/` quedó como historia de B1, A1 y C1.
`api/` es la API Laravel del ADR 0004 (PHP-FPM y MySQL en Docker); sus reglas y comandos
están en `api/AGENTS.md`.
`src/index.html` y `src/app/main.tsx` son las entradas Vite; `dist/` es la salida
generada. `content/` es la fuente del currículo (YAML y código Rust y Go real);
`tools/content/` la valida y genera `build/curriculum.json`, otra salida ignorada que
importan los adaptadores de `src/app/legacy/` y el Atlas
(`src/pages/atlas/model/atlas-catalog.ts`). Los `CLAUDE.md` sólo importan este archivo y
los de cada carpeta para Claude Code; `.claude/` contiene symlinks de skills y subagentes.

`executor/` es el ejecutor Go del ADR 0005, un servicio interno que compila y ejecuta Rust y
Go en contenedores endurecidos (gVisor por omisión); sus reglas están en `executor/AGENTS.md`.

## Comandos

Desde la raíz, con Node y npm instalados (Docker usa Node 24):

```sh
npm ci
npm run build
npm test
```

Para la verificación habitual, `npm run build` regenera todos los assets y
`npm test` ejecuta la suite local completa. `npm run lint` ejecuta ESLint;
`npm run format:check` comprueba formato sin editar. `npm run format` aplica
Prettier a todo el código propio; `.prettierignore` excluye skills importadas,
salidas generadas, Markdown y el shell `src/index.html`.

Vite empaqueta React, las fuentes legacy, los estilos y `build/curriculum.json` en
`dist/index.html`. Ese JSON sale de `content/` con `npm run curriculum`, que corre antes de
`npm run typecheck` (y por eso de `build` y `test`) y de `npm run dev`.
`vite-plugin-singlefile` conserva el contrato de un documento autónomo; los checks
de `qa/` validan el currículo y los contratos de comportamiento por separado.

Para construir y servir con Docker:

```sh
docker compose up --build -d --wait
docker compose down
```

La web queda en `http://localhost:8080`. Para servir `dist/index.html` generado en
el host como preview, usá `docker compose -f compose.preview.yaml up --build -d --wait`
y abrí `http://localhost:8765`; detenelo con
`docker compose -f compose.preview.yaml down`. El progreso de ambos puertos es independiente.

Docker necesita un `.env` en la raíz con `APP_KEY`, `MYSQL_PASSWORD` y `MYSQL_ROOT_PASSWORD`:
`sh api/scripts/init-env.sh` agrega los que falten. Ese archivo queda fuera de Git y del
contexto de Docker. Las pruebas de la API (`npm run api:test` y las demás de `api/AGENTS.md`)
usan Docker y no forman parte de `npm test`.

## Convenciones

- Separá contenido, modelos, persistencia, transporte e interfaz. Organizá la
  migración a React por funcionalidades y mantené interfaces explícitas.
- Conservá IDs, compatibilidad de progreso y la distinción entre compilación real,
  simulaciones y pasos manuales. Las reglas detalladas están en `docs/architecture.md`.
- Usá TDD para cambios de comportamiento: una prueba que falle por la razón
  esperada, una implementación mínima y revisión antes de refactorizar en verde.
- El código y las pruebas van en inglés: identificadores, nombres de tests y comentarios. Van en
  español la interfaz, el contenido, los mensajes que lee quien usa u opera el taller, la
  documentación y todo lo que genera Spec Kit. Conservá accesibilidad de teclado, diseño móvil
  y movimiento reducido.
- Preferí soluciones portables entre Linux y macOS.
- El código se explica solo, con nombres precisos y pruebas que documentan el comportamiento
  (TDD). Comentá sólo una función, clase o método cuya complejidad lo exija, o para dejar una
  referencia puntual: un bug, una RFC o una decisión de un ADR.
- Editá fuentes y regenerá assets; conservá licencias y sincronizá el lockfile.
- Usá ESLint para reglas de código y Prettier para formato, con configuraciones
  separadas. Los avisos de complejidad requieren revisión; no desactives reglas
  globalmente para ocultar un defecto. Conservá el formato original de las skills.
  Registrá en `.git-blame-ignore-revs` los commits que sólo cambien formato.
- Mantené credenciales, rutas locales, cachés, progreso y resultados generados fuera
  de Git; actualizá `.gitignore` y `.dockerignore` al introducir nuevas salidas.
- Entregá cada cambio como pull request, con título y descripción en inglés. El título sigue
  la notación de Angular (`type(scope): subject`, por ejemplo `feat(api): serve the curriculum
  from MySQL`); la descripción cuenta el problema completo: el contexto, qué faltaba o fallaba
  y por qué, qué cambia, cómo se verificó y qué queda pendiente.

## Módulos y frameworks JavaScript

- Escribí el código nuevo de la aplicación en **TypeScript como ES modules**: `.ts`
  para lógica y datos, `.tsx` para React, y siempre `export`/`import`. No agregues
  `module.exports` ni `require()` en fuentes nuevas.
- Migrá JavaScript por funcionalidades; `allowJs` admite el legacy sin convertirlo
  en bloque. No uses `.mjs` ni `.cjs` cuando el archivo pueda ser TypeScript: los
  checks de `qa/` y las configuraciones ya son `.ts` ejecutados por Node 24.
- En archivos de componentes, hooks, contextos o providers con una única abstracción
  principal, declarala como `const` con nombre, hacé coincidir archivo e identificador
  y escribí `export default Nombre` al final. Conservá ese nombre en el import.
- En utils, helpers, constants y módulos con varias capacidades pares, usá exports
  nombrados. Los specs no exportan salvo que otro archivo consuma deliberadamente
  un fixture o helper. Si un módulo reúne contexto, provider y hook públicos, separalo
  por responsabilidad o mantené exports nombrados; no elijas un `default` arbitrario.

```ts
// src/pages/atlas/model/filter-concepts.ts
interface Concept {
  level: string;
}

interface Filters {
  level: string;
}

export function filterConcepts(concepts: Concept[], filters: Filters): Concept[] {
  return concepts.filter(concept => concept.level === filters.level);
}

// ESM consumer.
import {filterConcepts} from './filter-concepts';
```

- Para formas de objetos, props y contratos públicos, preferí `interface`.
  Reservá `type` para capacidades que lo requieran, como uniones, tuplas,
  primitivas, tipos mapeados o condicionales. No conviertas declaraciones
  existentes sólo por estilo; la elección debe expresar una diferencia útil.

- La interfaz nueva usa **React con TypeScript/TSX** y **Vite**. `src/app/` contiene
  la entrada y los adaptadores `window.Taller*` (`src/app/legacy/`); cada vista migrada
  es un slice de `src/pages/` (Atlas es el primero). Conservá un adaptador pequeño en
  `src/app/legacy/` cuando una vista legacy todavía dependa de `window.Taller*`.
- Aplicá Feature-Sliced Design de forma incremental: empezá por `app`, `pages` y
  `shared`, y creá slices en `features` o `entities` sólo cuando exista una
  responsabilidad de negocio estable y reutilizada. Cada slice expone una API
  pública pequeña; los imports sólo apuntan a capas inferiores y no atraviesan
  internals de otro slice. No agregues capas, barrels ni carpetas vacías por anticipado.
- No agregues un servidor Node directo ni Express sólo para servir archivos estáticos:
  Vite construye la aplicación y Nginx sirve la salida. Incorporar un backend exige
  un caso de uso que no pueda resolverse en el cliente, una interfaz explícita, pruebas
  y un ADR. Para ese caso, evaluá primero Hono por portabilidad Web Standards y
  Fastify si el despliegue será exclusivamente Node; Express sigue siendo válido
  cuando su ecosistema o compatibilidad sea una necesidad concreta. El backend vigente es
  Laravel en `api/` (ADR 0004).
- No mezcles frameworks de interfaz en una misma migración. Astro queda como alternativa
  para una futura arquitectura dominada por contenido estático e islas, no como capa
  adicional sobre React/Vite sin una decisión registrada.
- Para estado React local y simple, usá `useState`/`setState`; derivá durante el render
  lo que pueda calcularse y no eleves el estado sin consumidores compartidos reales.
- Mantené cada componente enfocado en una responsabilidad de interfaz. Cuando uno
  coordine reglas de dominio, persistencia, efectos y varias regiones visuales,
  separá esas responsabilidades en componentes, hooks o módulos con contratos claros;
  no extraigas wrappers triviales sólo para reducir líneas.
- Evitá prop drilling: un componente intermedio no debe reenviar datos que no usa.
  Preferí composición con `children`, estado cerca de sus consumidores y un contexto
  o provider acotado cuando varios descendientes compartan una responsabilidad.
  Conservá props directas cuando siguen siendo el contrato local más simple.
- Reservá `useEffect` para sincronización externa. Si un effect mezcla ciclos de vida
  independientes, varios effects comparten una misma responsabilidad o el cableado de
  estado y efectos oculta el render, extraé un hook con entradas, salidas y cleanup
  explícitos. La cantidad de effects es una señal de revisión, no un umbral automático.
- Para estructuras de estado cliente complejas o compartidas entre funcionalidades,
  usá Zustand con acciones explícitas y selectores pequeños; no suscribas un componente
  al store completo ni guardes valores derivados que puedan calcularse con un selector.
- Para estado navegable que deba persistir en la URL —búsqueda, filtros, pestaña o
  selección enlazable— usá nuqs con `NuqsAdapter`, parsers y defaults explícitos; la
  query string es la fuente de verdad y no se duplica en `useState` o Zustand.
- Instalá Zustand o nuqs sólo al aparecer el primer caso real y sincronizá
  `package.json`/`package-lock.json`; no agregues stores ni adaptadores preventivos.

## Trabajo con subagentes

- Reservá el agente principal para análisis, decisiones de arquitectura, revisión e
  integración, con el modelo más capaz y razonamiento máximo: en Claude Code, Opus 5.5
  con effort `max`. Los análisis y revisiones delegados usan el mismo nivel
  (`.claude/agents/revisor.md`).
- Para implementaciones mecánicas o slices bien delimitados, delegá en un subagente
  económico con archivos, contratos y checks explícitos: en Claude Code,
  `.claude/agents/implementador.md` (Sonnet 5.5, effort `medium`); en Codex, `gpt-6-luna`.
- Revisá siempre el diff producido por el subagente y ejecutá desde el agente principal
  los checks proporcionales al riesgo; delegar implementación no delega la decisión ni
  la responsabilidad por el resultado.
- Paralelizá sólo slices con archivos disjuntos. `src/app/main.tsx`, `package.json`, las
  configuraciones y la documentación se integran desde el agente principal.

## Código entendible y pruebas útiles

- Priorizá código simple y entendible sobre soluciones ingeniosas o elegantes.
  Elegí nombres explícitos, pasos visibles y control de flujo fácil de seguir.
  Una abstracción se justifica cuando reduce complejidad real para quien lee o cambia el código.
- Revisá complejidad ciclomática y anidación al agregar o modificar lógica con muchas
  decisiones. Más de 10 por función es una señal inicial de revisión, no una orden
  de fragmentar código. Aplicá los criterios y ejemplos de `docs/architecture.md`.
- Evaluá archivos grandes por responsabilidades, cohesión, acoplamiento, cantidad de
  exports y costo de navegación. La complejidad ciclomática mide caminos de una
  función, no el tamaño de un archivo; modularizá por seams con nombre y contrato,
  no por una cuota arbitraria de líneas.
- Evitá tests tautológicos: el valor esperado debe venir del contrato, una consigna
  o un ejemplo resuelto de manera independiente, no del mismo algoritmo que se prueba.
  Cada test debe poder detectar un comportamiento incorrecto concreto.
- Probá comportamiento observable; evitá tests de funciones privadas, snapshots
  indiscriminados o mocks que sólo confirmen cómo está escrita la implementación.
- Refactorizá con un motivo concreto y pruebas de comportamiento en verde.

Ejemplo de legibilidad: preferí una condición explícita a coerciones compactas.

```js
// Avoid: the reader has to decode a numeric coercion inside the accumulator.
const total = tests.reduce((n, t) => n + +(t.passed === true), 0);

// Prefer: it says directly what is being counted.
const passedCount = tests.filter(test => test.passed === true).length;
```

Ejemplo de pruebas para ese contrato:

```js
const tests = [{passed: true}, {passed: false}, {passed: true}];

// Tautological: recomputes the expected value with the same implementation.
assert.equal(countPassed(tests), tests.filter(t => t.passed === true).length);

// Useful: the expected value comes from the example, which has two passing cases.
assert.equal(countPassed(tests), 2);
```

Estos ejemplos ilustran el criterio; no agregan funciones ni reglas nuevas al currículo.

## Skills y documentación

Leé el `SKILL.md` local de la capacidad pertinente antes de aplicarla; activá sólo
las necesarias. Usá `clean-code` para legibilidad, `codebase-design` para interfaces,
`tdd` para cambios de comportamiento, las skills de Vercel para código React,
`tailwind-design-system` para estilos con Tailwind y `laravel-specialist`,
`laravel-tdd` y `laravel-security` para el backend Laravel.
`.agents/skills/` es la fuente única; `.claude/skills/` sólo contiene symlinks por skill.
El inventario y los criterios de uso están en `docs/agent-skills.md`.

Usá `context7-mcp` al cambiar APIs o configuración de dependencias: resolvé el ID,
consultá el tema concreto y contrastá la versión con `package-lock.json`. Si el MCP
no está disponible, usá documentación oficial. Usá `find-skills` para nuevas
capacidades, verificando fuente y alcance además de popularidad.

## Verificación y mantenimiento de la guía

Antes de cerrar un cambio, ejecutá los checks aplicables de `qa/AGENTS.md` y
`git diff --check`. Informá resultados y limitaciones. Para documentación,
comprobá rutas, comandos y enlaces locales; para UI, revisá también el navegador.

Actualizá esta guía cuando cambien comandos, arquitectura o convenciones.
Agregá reglas específicas en el documento correspondiente o en un `AGENTS.md`
local cuando una carpeta necesite instrucciones propias. Registrá decisiones
sustanciales de migración en `docs/adr/` al tomarlas, sin crear carpetas vacías.

Base: [ejemplo oficial de AGENTS.md](https://agents.md/), adaptado a los comandos y
contratos reales de este proyecto; consultado el 2026-10-03.
