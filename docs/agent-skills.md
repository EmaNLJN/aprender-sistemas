# Skills del proyecto

Las skills de `.agents/skills/` son copias de terceros. Sus fuentes, licencias y avisos de copyright están en
[THIRD-PARTY-NOTICES.md](../.agents/skills/THIRD-PARTY-NOTICES.md); una skill nueva suma su fila ahí.

Selección e instalación del 2026-10-03. Se usaron `find-skills`, búsquedas CLI de
arquitectura, clean code, React y testing, el [directorio skills.sh](https://www.skills.sh/)
y los repositorios originales. Se priorizó alcance útil para el taller y adopción;
las cifras aproximadas cambian y no equivalen a una garantía de calidad.

## Instaladas en `.agents/skills/`

| Skill | Popularidad consultada | Uso en este proyecto |
| --- | --- | --- |
| [tdd](../.agents/skills/tdd/SKILL.md) · [Matt Pocock](https://www.skills.sh/mattpocock/skills/tdd) | 1 millón | Cambios de comportamiento test-first, una prueba y una implementación por ciclo; revisar antes de refactorizar. |
| [codebase-design](../.agents/skills/codebase-design/SKILL.md) · [Matt Pocock](https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md) | 719 mil, búsqueda CLI | Interfaces pequeñas, dependencias explícitas y contratos observables al dividir o migrar módulos. |
| [vercel-react-best-practices](../.agents/skills/vercel-react-best-practices/SKILL.md) · [Vercel](https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | 766 mil | Rendimiento, estado, efectos y bundles de las vistas que se migren a React. |
| [vercel-composition-patterns](../.agents/skills/vercel-composition-patterns/SKILL.md) · [Vercel](https://www.skills.sh/vercel-labs/agent-skills/vercel-composition-patterns) | 371 mil | Composición y variantes explícitas para componentes React reutilizables. |
| [web-design-guidelines](../.agents/skills/web-design-guidelines/SKILL.md) · [Vercel](https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines) | 694 mil | Revisión de teclado, foco, accesibilidad e interacción. Consulta las reglas oficiales actualizadas al usarse. |
| [clean-code](../.agents/skills/clean-code/SKILL.md) · [sickn33](https://www.skills.sh/sickn33/agentic-awesome-skills/clean-code) | 12 mil | Nombres claros, responsabilidades, errores y legibilidad; complementar con los contratos propios del taller. |
| [writing-for-agents](../.agents/skills/writing-for-agents/SKILL.md) · [Matt Pocock](https://www.skills.sh/mattpocock/skills/writing-for-agents) | 351 mil | Mantener AGENTS.md breve y referencias específicas que se leen cuando corresponde. |
| [webapp-testing](../.agents/skills/webapp-testing/SKILL.md) · [Anthropic](https://www.skills.sh/anthropics/skills/webapp-testing) | 169 mil | Flujos de navegador con Python/Playwright, complementando los checks Node. La instalación de la skill no instala Playwright ni navegadores. |

Se verificaron las fuentes: colecciones oficiales de
[Vercel](https://github.com/vercel-labs/agent-skills) (~32 mil estrellas) y
[Anthropic](https://github.com/anthropics/skills) (~179 mil), y colecciones
comunitarias de [Matt Pocock](https://github.com/mattpocock/skills) (~275 mil) y
[sickn33](https://github.com/sickn33/agentic-awesome-skills) (~47 mil).
La skill clean-code identifica además a ClawForge como su fuente de contenido.

Las ocho skills se descargaron con `skill-installer` y su directorio completo,
incluidas las referencias auxiliares. Son fuentes de desarrollo del proyecto;
no se agregaron a `package.json`. `.dockerignore` las excluye del build web.
La disponibilidad automática se actualiza en el próximo turno del agente.

Por pedido explícito también se instalaron las skills
[react-doctor](../.agents/skills/react-doctor/SKILL.md), desde
[millionco/react-doctor](https://github.com/millionco/react-doctor), y
[desloppify](../.agents/skills/desloppify/SKILL.md), desde
[peteromallet/desloppify](https://github.com/peteromallet/desloppify).
Sus CLI están aisladas en `tools/quality/`; consultá
[su guía](../tools/quality/AGENTS.md) para instalación y comandos.
React Doctor se usa sobre código React; Desloppify se activa para un análisis de
salud o deuda técnica solicitado, sin ampliar una tarea de instalación a una
refactorización completa.

En la pasada de calidad también se instaló
[code-review](../.agents/skills/code-review/SKILL.md), de
[Matt Pocock](https://www.skills.sh/mattpocock/skills/code-review), con unas
657 mil instalaciones consultadas el 2026-10-03. Requiere un punto de comparación
y una especificación para revisar estándares y requisitos por separado.

Para la adopción de Tailwind en las vistas React y el backend Laravel se buscaron
skills con `find-skills` (`npx skills find`) el 2026-10-03, verificando instalaciones,
reputación del repositorio de origen y licencia, y revisando el contenido antes de
exponerlo (sólo Markdown, sin scripts ni instrucciones de red):

| Skill | Fuente | Señales consultadas | Uso en este proyecto |
| --- | --- | --- | --- |
| [tailwind-design-system](../.agents/skills/tailwind-design-system/SKILL.md) | [wshobson/agents](https://skills.sh/wshobson/agents/tailwind-design-system) | 67 mil instalaciones; ★40 mil; MIT | Tokens, theming y componentes con Tailwind v4 al reemplazar CSS ad hoc. |
| [laravel-specialist](../.agents/skills/laravel-specialist/SKILL.md) | [Jeffallan/claude-skills](https://skills.sh/jeffallan/claude-skills/laravel-specialist) | 22 mil; ★11,7 mil; MIT | API, Eloquent, Sanctum y configuración del backend Laravel. |
| [laravel-tdd](../.agents/skills/laravel-tdd/SKILL.md) | [affaan-m/ECC](https://skills.sh/affaan-m/ecc/laravel-tdd) | 9,6 mil; ★272 mil; MIT | Pruebas con Pest/PHPUnit en ciclos TDD. |
| [laravel-security](../.agents/skills/laravel-security/SKILL.md) | [affaan-m/ECC](https://skills.sh/affaan-m/ecc/laravel-security) | 10,7 mil; ★272 mil; MIT | Revisión de autenticación, validación y despliegue del backend. |

Se descartaron `tailwind-4-docs` (repositorio con 75 estrellas; la documentación de
Tailwind se consulta con Context7) y skills atadas a shadcn o Expo. Estas cuatro se
instalaron con `npx skills add <repo> --skill <nombre> -a codex -y`, que copia la skill
en `.agents/skills/` y registra fuente y hash en `skills-lock.json`
(`npx skills experimental_install` las restaura). El total actual es de quince skills
locales.

Para ESLint/Prettier se buscó `eslint prettier` con `find-skills`: `antfu` tenía
16,4 mil instalaciones, pero recomienda una combinación de herramientas distinta
de la elegida por el usuario. Se tomó como base la configuración recomendada
oficial de ESLint y el ejemplo oficial de instalación/configuración de Prettier,
consultados mediante Context7; no se agregó una skill redundante para imponer
otro formatter, package manager o framework.

## Pruebas del front, E2E y API (2026-10-04)

A pedido del usuario se buscaron skills con `find-skills` (`npx skills find`) para:

- specs de React (Vitest o Jest con Testing Library);
- factories con fishery;
- E2E con Page Object Model;
- diseño de la API y de esquemas de base de datos.

Antes de exponerlas se verificaron instalaciones, estrellas, licencia y contenido: sólo Markdown,
sin scripts ni instrucciones de red.

| Skill | Fuente | Señales consultadas | Uso en este proyecto |
| --- | --- | --- | --- |
| [vitest](../.agents/skills/vitest/SKILL.md) | [antfu/skills](https://skills.sh/antfu/skills/vitest) | 39 mil instalaciones; ★5,9 mil; MIT; el autor integra el equipo de Vitest | Configuración, API, mocks, cobertura y filtros de Vitest para las specs del front. |
| [react-testing](../.agents/skills/react-testing/SKILL.md) | [affaan-m/ECC](https://skills.sh/affaan-m/ecc/react-testing) | 5,2 mil; ★272 mil; MIT | Specs de componentes y hooks con Testing Library, MSW, accesibilidad con axe y el límite con E2E. |
| [playwright-best-practices](../.agents/skills/playwright-best-practices/SKILL.md) | [currents-dev/playwright-best-practices-skill](https://skills.sh/currents-dev/playwright-best-practices-skill/playwright-best-practices) | 89,7 mil; ★386; MIT | E2E con Playwright Test en TypeScript: page objects frente a fixtures, locators, datos de prueba y tests inestables. |
| [api-and-interface-design](../.agents/skills/api-and-interface-design/SKILL.md) | [addyosmani/agent-skills](https://skills.sh/addyosmani/agent-skills/api-and-interface-design) | 45,3 mil; ★101 mil; MIT | Contratos estables de la API REST y del límite entre front y backend. |
| [laravel-patterns](../.agents/skills/laravel-patterns/SKILL.md) | [affaan-m/ECC](https://skills.sh/affaan-m/ecc/laravel-patterns) | 10,5 mil; ★272 mil; MIT | Controladores, API Resources, servicios, colas y Eloquent del backend. |

- **fishery:** no tiene skill. Su API se consulta con Context7 al escribir factories.
- **Diseño de esquemas en MySQL:** no apareció ninguna skill de calidad; las candidatas eran de
  Postgres o de servicios en la nube. Valen `laravel-specialist`, `laravel-patterns` y la revisión
  de un agente de base de datos.
- **TDD:** ya lo cubren `tdd` (front y TypeScript) y `laravel-tdd` (Pest).
- **Descartadas:**
  - `wshobson/agents@javascript-testing-patterns`, porque se superpone con `vitest` y
    `react-testing`;
  - `affaan-m/ecc@e2e-testing`, porque mezcla una sección de Web3 ajena al taller;
  - `mattpocock/skills@domain-modeling`, porque trata glosarios y ADR, no esquemas.
- **Descargas:** `playwright-best-practices` sugiere `npx playwright install --with-deps`, que
  descarga navegadores. La regla de pedir permiso antes de cada descarga sigue valiendo.
- **Alcance:** el [ADR 0008](adr/0008-pruebas-del-front.md), aceptado el 2026-10-05, adopta Vitest,
  Testing Library, fishery y Playwright. F1 instaló Vitest y Playwright; la pila de DOM llega con la
  primera spec de componente y fishery con la primera factory. Las specs de Vitest van junto al
  módulo y corren con `npm run test:unit`; las de Playwright viven en `qa/e2e/` y corren con
  `npm run build && npm run test:e2e` (ver «Pruebas del front» en `qa/AGENTS.md`).

Se instalaron con `npx skills add <repo> --skill <nombre> -a codex -y`, con su enlace en
`.claude/skills/`. `.gitattributes` exime a `.agents/skills/` de `git diff --check`, para que las
skills conserven el formato de su fuente.

## Spec Kit (2026-10-04)

El CLI `specify` 1.0.13, instalado aparte, sostiene la planificación del backend y del front; las reglas del
flujo están en `.specify/memory/constitution.md`. Con sus trece skills, el total actual es de
treinta y tres skills locales.

- **Origen:** las diez `speckit-*` y las tres `speckit-bug-*` (extensión empaquetada `bug`) salen
  del CLI, no de `npx skills`, así que no figuran en `skills-lock.json`. Lo instalado queda
  registrado en `.specify/integrations/*.manifest.json` y `.specify/extensions/.registry`.
- **Layout:** como el resto, la skill real vive en `.agents/skills/` y `.claude/skills/` la
  enlaza. Para sumar una extensión, creá primero `.agents/skills/<nombre>/` y su symlink, y
  después corré `specify extension add <nombre>`: el CLI escribe a través del enlace.
- **Actualizar:** el manifiesto commiteado ya registra `.agents/skills/`. Con un manifiesto que
  apunte a `.claude/skills/`, el primer `specify integration upgrade` borra los `SKILL.md`
  enlazados y recién el segundo los repone.
- **Una sola integración:** la de Claude. La de `codex` escribe en las mismas rutas de
  `.agents/skills/`.
- **Reinicializar:** `specify init --here --force` pisa la constitución y el override de
  `.specify/templates/overrides/tasks-template.md`; para actualizar, usá `specify integration upgrade`.
- **Sin `agent-context`:** esa extensión escribe un bloque propio en `AGENTS.md` o `CLAUDE.md`,
  que acá sólo cambian a mano.

## Claude Code

Consultado el 2026-10-03 en la documentación oficial de Claude Code
([memoria](https://code.claude.com/docs/en/memory),
[skills](https://code.claude.com/docs/en/skills) y
[subagentes](https://code.claude.com/docs/en/sub-agents)):

- Claude Code carga `AGENTS.md` de forma nativa desde la versión 2.1.277 y sólo cuando no
  hay un `CLAUDE.md`; la CLI del entorno de desarrollo era la 2.1.162. Por eso la raíz,
  `qa/` y `tools/quality/` tienen un `CLAUDE.md` que importa su `AGENTS.md` con
  `@AGENTS.md`. Con un `CLAUDE.md` en la raíz, las versiones nuevas ignoran los `AGENTS.md`
  anidados que no se importen: al agregar uno, sumá su `CLAUDE.md` con la misma línea.
- Claude Code descubre skills sólo en `.claude/skills/<nombre>/SKILL.md` y admite symlinks
  por skill. Al instalar una skill en `.agents/skills/`, agregá su enlace relativo:
  `ln -s ../../.agents/skills/<nombre> .claude/skills/<nombre>`.
- Una skill de proyecto con el nombre de un comando incluido lo reemplaza. `code-review`
  queda sólo en `.agents/skills/` para no ocultar el `/code-review` de Claude Code.
- `.claude/agents/revisor.md` (Opus, effort `max`, sin edición) e
  `.claude/agents/implementador.md` (Sonnet, effort `medium`) aplican el reparto de modelos
  de `AGENTS.md`. Usan los campos documentados `model`, `effort`, `tools` y `skills`; los
  alias de modelo siguen la versión vigente de cada familia. Un subagente nuevo se detecta
  sin reiniciar, salvo cuando `.claude/agents/` no existía al iniciar la sesión.

## Criterios de uso

- Leé sólo el SKILL.md pertinente y las referencias necesarias; conservá las
  fuentes importadas y sus atribuciones al actualizarlas.
- React con TypeScript/TSX y Vite es la arquitectura vigente. Atlas ya está
  migrado; las reglas específicas de React aplican a módulos migrados o nuevos y
  el JavaScript legacy se convierte incrementalmente.
- Aplicá reglas de cliente pertinentes. Next.js, Server Components, SSR, SWR o
  TypeScript son decisiones separadas, no dependencias obligatorias de estas skills.
  Verificá la versión de React antes de aplicar reglas de React 19.
- Usá clean code para mejorar legibilidad y preservar comportamiento. Sus
  heurísticas de tamaño y estilo se evalúan en contexto; los contratos existentes
  del taller, como formatos de progreso y valores nulos documentados, deben conservarse.
- TDD se aplica a cambios de comportamiento. Su skill requiere acordar la interfaz
  pública a probar; `qa/AGENTS.md` detalla el ciclo y los checks disponibles.
  Documentación y configuración se verifican según su impacto.
- Las decisiones de este proyecto y las instrucciones explícitas del usuario
  guían la aplicación de las skills; una recomendación genérica no inicia una
  reescritura, un cambio de framework o una publicación por sí sola.

## Opciones evaluadas para futuras tareas

[improve-codebase-architecture](https://www.skills.sh/mattpocock/skills/improve-codebase-architecture)
(~1 millón) queda como opción para un análisis formal de arquitectura: su flujo
incluye más configuración y documentos de diseño que este cambio.
[frontend-design](https://www.skills.sh/anthropics/skills/frontend-design) (~949 mil)
queda para tareas de diseño visual. Ambas fueron evaluadas y no instaladas.
Para TDD también se comparó
[test-driven-development de obra/superpowers](https://www.skills.sh/obra/superpowers/test-driven-development)
(~243 mil en la búsqueda CLI); se eligió una sola skill de TDD para evitar
instrucciones redundantes.

Para complejidad ciclomática se encontró
[cyclomatic-complexity](https://github.com/saurabhkumar8112/cyclomatic-complexity-skill)
(80 instalaciones en la búsqueda de `find-skills` del 2026-10-03).
Se dejó como referencia sin instalar: su adopción es baja frente a las skills
elegidas y sus prácticas se cubren con `clean-code`, `codebase-design` y `tdd`.
Las directivas concretas del taller están en
[arquitectura](architecture.md#complejidad-ciclomática-y-legibilidad), apoyadas en
ESLint y Sonar. No se presupone que React Doctor mida esta métrica.

Para Feature-Sliced Design se encontró la skill oficial
[feature-sliced-design](https://www.skills.sh/feature-sliced/skills/feature-sliced-design),
publicada por el propio proyecto FSD y con unas 19 mil instalaciones consultadas el
2026-10-03. Su enfoque v2.1 prioriza una adopción incremental desde `app`, `pages` y
`shared`, con dirección de imports y APIs públicas por slice. Se deja evaluada sin
instalar: las reglas necesarias quedaron documentadas en `docs/architecture.md` y las
skills locales `codebase-design` y `vercel-composition-patterns` cubren los seams y la
composición. Instalála si una futura migración requiere el flujo FSD completo o sus
referencias específicas.

## Context7 y base del AGENTS.md

`find-skills` y `context7-mcp` ya estaban disponibles en el entorno; no se
reinstalaron dentro del proyecto. Context7 necesita un MCP conectado, además
de la skill que explica cómo consultarlo.

Se consultó `/websites/esbuild_github_io` para el build anterior:
[IIFE y salida](https://esbuild.github.io/api/#format),
[archivos generados](https://esbuild.github.io/api/#outfile) y
[comentarios legales](https://esbuild.github.io/api/#legal-comments).
También se consultó `/vitejs/vite`: diferencia templates `react` y `react-ts`,
y genera `dist/` por defecto para [hosting estático](https://vite.dev/guide/static-deploy.html).
La migración comenzó con React 19 y Vite 8; Atlas es la primera vista migrada.
La decisión actual de usar TypeScript para todo código nuevo está documentada en
`AGENTS.md` y en el ADR 0001; las consultas sobre la preferencia inicial por
JavaScript/JSX se conservan como antecedente, no como configuración vigente.
Las reglas de React se contrastaron con
[integración gradual](https://react.dev/learn/add-react-to-an-existing-project),
[pureza e inmutabilidad](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
y [uso de effects](https://react.dev/learn/you-might-not-need-an-effect). Para exports,
Context7 confirmó que React admite ambos estilos y que su guía de
[imports y exports de componentes](https://react.dev/learn/importing-and-exporting-components)
recoge como convención frecuente usar `default` cuando un archivo expone un solo
componente y exports nombrados cuando expone varios; en ambos casos recomienda
identificadores significativos para facilitar el debugging. El proyecto especializa
esa guía con una abstracción principal nombrada, `export default` al final y exports
nombrados para módulos auxiliares o multipropósito.

Para TypeScript se consultó `/microsoft/typescript-website` en Context7. La guía
oficial propone `interface` para contratos públicos y formas de objetos que puedan
extenderse, y `type` cuando se necesitan capacidades como uniones o tuplas; también
aclara que gran parte de ambos mecanismos se solapa. La preferencia del proyecto
expresa esa diferencia y no obliga a reescribir aliases existentes por estilo.

Las reglas de estructura se contrastaron con la documentación oficial de
[capas](https://fsd.how/docs/reference/layers/) y
[slices y segmentos](https://fsd.how/docs/reference/slices-segments/) de FSD v2.1.

Para complejidad se consultó `/eslint/eslint` en Context7 y se contrastó la
[regla oficial `complexity`](https://eslint.org/docs/latest/rules/complexity):
umbral configurable y variantes `classic` y `modified`. El aviso local de más
de 10 es una decisión de revisión del proyecto, no una recomendación universal.

Para el boilerplate se eligió el [ejemplo oficial de AGENTS.md](https://agents.md/)
y su [repositorio](https://github.com/agentsmd/agents.md). Se tomó su organización
por proyecto, comandos, convenciones y verificación, adaptando todo al taller.
La guía raíz deriva las reglas específicas a `docs/architecture.md` y `qa/AGENTS.md`;
crece al aparecer decisiones reales del proyecto. La selección del boilerplate
se hizo en fuentes de Internet; Context7 se usó para documentación del build.

Al actualizar dependencias, resolvé su ID y consultá un tema concreto,
contrastando la versión con `package-lock.json`. Usá documentación oficial si
el MCP no está disponible y conservá las consultas libres de datos sensibles.

## PHP moderno: DTOs y value objects (2026-10-05)

El usuario pidió pasar los registros del contenido de arreglos asociativos a objetos con mappers,
en una spec aparte después de C2. Se buscó con `find-skills` (`npx skills find` sobre «laravel
data dto», «php design patterns», «data mapper dto», «spatie laravel-data», «php value objects» y
«php-pro»). Ninguna skill trata mappers de objetos ni `spatie/laravel-data`. La más cercana es
`php-pro`, del mismo autor que `laravel-specialist`. Se revisó antes de exponerla: cinco archivos
Markdown, sin scripts ni instrucciones de red.

| Skill | Fuente | Señales consultadas | Uso en este proyecto |
| --- | --- | --- | --- |
| [php-pro](../.agents/skills/php-pro/SKILL.md) | [Jeffallan/claude-skills](https://skills.sh/jeffallan/claude-skills/php-pro) | 14,8 mil instalaciones; ★11,7 mil; MIT; v1.1.0 | DTOs `readonly`, value objects, enums y tipos de PHP moderno para los registros tipados del contenido (Data Mapper) y para C3. |

- **Límites:** la skill exige PHPStan nivel 9, `declare(strict_types=1)` y un 80 % de cobertura.
  El proyecto tiene PHPStan en el nivel 9 desde C6, por decisión propia y no por la skill;
  `strict_types` y la meta de cobertura siguen fuera. Manda `AGENTS.md`: de la skill se usan los
  patrones, no esas exigencias.
- **Instalación:** `npx skills add jeffallan/claude-skills --skill php-pro -a codex -y`, con su
  enlace en `.claude/skills/` y su hash en `skills-lock.json`. El total actual es de treinta y
  cuatro skills locales.
