# Skills del proyecto

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
y una especificación para revisar estándares y requisitos por separado. El total
actual es de once skills locales.

Para ESLint/Prettier se buscó `eslint prettier` con `find-skills`: `antfu` tenía
16,4 mil instalaciones, pero recomienda una combinación de herramientas distinta
de la elegida por el usuario. Se tomó como base la configuración recomendada
oficial de ESLint y el ejemplo oficial de instalación/configuración de Prettier,
consultados mediante Context7; no se agregó una skill redundante para imponer
otro formatter, package manager o framework.

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
