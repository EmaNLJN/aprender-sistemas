# Implementation Plan: F6 · Campaña

**Branch**: `019-f6-campana` (nombre de la feature; el proyecto no crea una rama por feature. El plan vive en `plan/f6-campana`) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de F6, con su clarify del 2026-10-28 (Q1 a Q3, X1, X2 y el ruling C2). Decisiones y mediciones: [research.md](./research.md). Interfaces: [contracts/campaign-interfaces.md](./contracts/campaign-interfaces.md). Validación y scripts: [quickstart.md](./quickstart.md). Tareas: [tasks.md](./tasks.md).

**Objetivo.** Reemplazar `frontend/campaign.js` y `frontend/campaign.css` por una página de React montada sobre `#main`, sin que el alumno note el cambio salvo lo que el usuario aceptó (X1, X2 y C2).

**Arquitectura.**

- **La página** (`frontend/src/pages/campaign/`) lee el motor de campaña con `useStore` sobre la revisión y deriva todo al dibujar. Recibe el contenido por props.
- **Los adaptadores** son dos módulos en `frontend/src/app/legacy/`:
  - `campaign-bridges.ts`: los cinco métodos sin React que usan el laboratorio y `app.js`;
  - `register-campaign.tsx`: monta la página y publica una sola vez `window.TallerCampaign`, con siete métodos.
- **El motor** lo inicializa `startApp()` por `window.TallerCampaignEngine`.
- **Los selectores, los conteos y las constantes** se exportan desde `entities/campaign`; los que necesita el puente, también desde su entrada sin estado `bridge.ts`.

**Stack.** React 19.2.8 con TypeScript 6.0.2, Zustand 5.0.15 (`useStore`), Vite 8.3.2 con `vite-plugin-singlefile` 2.3.3, Vitest 5.0.3 y, si F6 es el primer port que los necesita, jsdom 30.1.2, Testing Library y fishery 2.4.0. Playwright 1.63.0 para los E2E. Node 24.21.0.

> **Para quien lo implementa.**
>
> - **Qué leer.**
>   - Completas: las «Reglas para todos los agentes», la sección 0 (línea base y compuerta) y la sección de tu dueño.
>   - El contrato: [contracts/campaign-interfaces.md](./contracts/campaign-interfaces.md).
>   - Las tareas: `tasks.md` tiene una línea por tarea (T001 a T022) y remite acá.
> - **Código verificado.** Este plan se escribió leyendo, sin correr nada, la integración local de F2a, A2 y F2b (`f2b-acum`, `2b37caf4`), que es la base real de la implementación. Las firmas, los textos y los números salen de esa lectura y del contenido. Lo que necesita una corrida (el tamaño del HTML, los avisos, la cantidad de escenarios) lo mide T001 antes del primer cambio.
> - **Decisiones del usuario.** Q1, Q2 y Q3 del clarify (spec, `## Clarifications`), más dos que este plan le lleva en el informe (research.md, R2 y R12).

## Summary

- **Cinco unidades en un PR, en el orden de FR-001:**
  1. los E2E contra el legacy;
  2. el modelo de `entities/campaign` y `.quest-direct-lock` en `lab.css`;
  3. la página sin montar;
  4. el corte: un commit rojo con los E2E de X1 y la spec del adaptador, y un commit que cablea todo;
  5. la documentación.

  Revertir la unidad 4 (sus dos commits) devuelve el legacy (research.md, R1).
- **Los E2E primero.** Diecinueve pruebas de los quince flujos de FR-041, escritas contra el legacy y en verde antes de portar, que no se editan después. El flujo (p) son cinco pruebas aparte que fallan contra el legacy por la razón esperada y van en el commit rojo.
- **La página repite el árbol del legacy, nodo por nodo.**
  - Las mismas clases, con los mismos espacios de más, los mismos textos y los mismos atributos, salvo los cuatro `data-*` del delegado.
  - Así `campaign.css` se mueve sin cambiar una declaración y la comparación del DOM puede dar 0.
  - Las tarjetas, los mundos y las opciones llevan `key` estable y cada bloque condicional ocupa siempre la misma posición, para que X1 y X2 salgan solos (research.md, R9).
- **El motor no cambia** (FR-005).
  - Se suman exports y un módulo de selectores puros. Las constantes siguen en `rules.ts`.
  - La spec de las constantes reemplazadas mockea el índice y envuelve dos métodos del motor (research.md, R6).
- **`TallerCampaign.init` se retira.** `startApp()` llama `window.TallerCampaignEngine.init(…)` con la misma configuración. Tres valores esperados de dos checks cambian el nombre de lo espiado sin cambiar el orden (research.md, R2; decisión 1).
- **Tres comparaciones únicas:**
  - el DOM, el estilo computado y el árbol de accesibilidad en 19 estados, 6 anchos y 2 preferencias de movimiento;
  - los puentes en todas sus combinaciones;
  - el multiconjunto del CSS del dist.

## Technical Context

**Language/Version**: TypeScript como ES modules en `frontend/src/` y `qa/`; JavaScript legacy en `frontend/*.js`. Node 24.21.0.

**Primary Dependencies**:

- **Runtime:** ninguna nueva (FR-046). React 19.2.8 y Zustand 5.0.15 ya están; `useStore` es la entrada de React de `zustand`.
- **Desarrollo, sólo si el predicado de T002 dice que faltan:** `jsdom` 30.1.2, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7, `@testing-library/jest-dom` 7.0.1 y `fishery` 2.4.0, con permiso del usuario.

**Storage**: `taller-campaign-v1` y las otras tres claves, sin cambios de formato (ADR 0003). La página no abre ninguna clave; la única escritura es la de `answerCheckpoint`, por el motor.

**Testing**:

- **Vitest:** el proyecto `node` para los selectores, la sesión y la entrada sin estado; el proyecto `jsdom` con Testing Library para la página y el adaptador.
- **Playwright:** con el Page Object `CampaignPage` ampliado.
- **Los checks de `qa/`,** adaptados sólo en cómo cargan.
- **Las comparaciones únicas** de quickstart.md §3.

Los valores esperados salen del README (líneas 119, 130 y 132), de `campaign-content-check`, de `qa/fixtures/curriculum-ids.json`, de `content/campaign/*.yaml` y de las fixtures congeladas, nunca del código que se prueba.

**Target Platform**: navegador moderno (ES2020) servido por Nginx; Linux y macOS.

**Project Type**: aplicación web. Es el port de una vista.

**Performance Goals**: ninguna. Se informan el tamaño del HTML y el tiempo de `npm test` antes y después.

**Constraints**: las de «Restricciones globales».

**Scale/Scope**:

- **Producción:**
  - 20 archivos nuevos: los 13 componentes, 4 módulos de la página, los 2 adaptadores y los selectores;
  - la hoja de la campaña, movida a `campaign-page.css`;
  - `campaign.js` borrado, y `register-effects.ts` si corresponde (research.md R13);
  - 8 cambiados: `lab.css`, `campaign.css` (T009), `app.js`, `main.tsx`, `legacy-views.ts`, el índice y la entrada sin estado de `entities/campaign`, y `entities/exercise/@x/campaign.ts`.
- **Pruebas:** 15 archivos nuevos (11 specs de Vitest, 2 fábricas, el arnés de la página y 2 specs E2E con su fábrica del progreso) y 1 cambiado (`bridge.spec.ts`).
- **QA:** 9 archivos adaptados, entre los checks, `qa/lib` y el Page Object.
- **Configuración:** sólo si falta el arnés, `package.json`, el lockfile, `frontend/vitest.config.ts`, `eslint.config.ts` y el setup.

## Restricciones globales

Valen para toda tarea. Están copiadas de la spec, de la constitución 1.4.1 y de la hoja de ruta.

- **La red, sin editar:**
  - los 106 E2E de F1 y los 17 de A2 pasan antes de empezar y después del corte (FR-002, SC-001);
  - los títulos de R6, R7, R8 y R10 de `css-contract` y sus dos comentarios siguen nombrando `campaign.css`: no se tocan.
- **Los E2E nuevos de la campaña** (`qa/e2e/specs/campaign.spec.ts`) se escriben contra el legacy, pasan antes del corte y no se editan después (FR-003, SC-002). Los de X1 y X2 (`campaign-kept-state.spec.ts`) van en el commit rojo y fallan contra el legacy.
- **El motor y el contenido, intactos:**
  - `campaign-check` y `campaign-content-check` pasan sin editarse (FR-005);
  - `entities/campaign/model` sólo suma `selectors.ts`, su spec y la fábrica; los cambios fuera de esos tres archivos son exports;
  - `content/` y `tools/content/` no cambian.
- **El progreso** (FR-004, SC-003):
  - las tres fixtures congeladas arrancan con 0 escrituras, 0 claves `:respaldo` y 0 avisos;
  - abrir, elegir un mundo, filtrar y cambiar de idioma dan 0 escrituras en `taller-campaign-v1`;
  - responder un checkpoint da exactamente 1.
- **Las URL** (FR-006):
  - la campaña lee `?mundo=` sólo al montar y escribe `?mundo=` sólo al elegir un mundo, con `withWorldQuery` y `history.replaceState`;
  - los enlaces salen de `url-grammar.ts`: `worldHref`, `campaignMissionHref` y `FREE_LAB_HREF`.
- **Los textos.** Carácter por carácter los de `frontend/campaign.js` de la base (FR-009), con el voseo, los símbolos `⌘ ◈ ⌁ ✳ ✓ ○ ◇ ↗ →` y las mayúsculas.
- **Los números:**
  - ningún 4, 24, 12, 180, 30, 20, 10 ni 150 escrito a mano en la página ni en los adaptadores (FR-030, SC-007);
  - quedan escritos, a propósito, el `0` de «MUNDO 0N» y de la guía, y el `65` de la letra de las opciones;
  - las palabras «seis» y «cuatro» quedan como texto editorial (Q1, FR-031).
- **Los globals** (FR-033):
  - `window.TallerCampaign` tiene exactamente `mount`, `unmount`, `refresh`, `sync`, `returnURL`, `exerciseContextHTML` y `lockedExerciseHTML`;
  - no se publica ningún global nuevo;
  - `window.TallerCampaignEngine` es la misma instancia que importa la página (FR-025).
- **El guard:**
  - `seams-guard-check` da 0 violaciones;
  - R4 y R6 no se relajan;
  - el adaptador no importa valores del índice de `entities/campaign`, y la página no abre `taller-campaign-v1`.
- **El estilo** (FR-008 y FR-040):
  - ningún `style=`, `setAttribute('style', …)` ni `style.cssText` nuevo;
  - `.quest-direct-lock` (cuatro reglas) al final de `lab.css` antes de borrar `campaign.css` (FR-039);
  - el resto, a `frontend/src/pages/campaign/ui/campaign-page.css`, sin cambiar una declaración ni el orden, importado en la misma línea de `main.tsx`.
- **Los archivos que F6 no toca:** `frontend/quest-explorers.js`, `frontend/quest-explorers.css` y `frontend/lab-explorers.js` (FR-038), y `frontend/src/index.html`.
- **El dist** (FR-046, SC-012):
  - un documento, un `<script type="module">`, un `<style>` y el contenido aparte, sin chunks;
  - `html.length` bajo 1 250 000 (`BOOT_SIZE_LIMIT` de `qa/build-check.ts`);
  - si el aumento pasa de 15 000 caracteres, se para y se avisa (research.md, R15).
- **La complejidad** (FR-046, SC-011):
  - `npm run lint` da 0 errores y la cuenta de avisos de T001 menos 2;
  - ninguna función nueva pasa de 10;
  - 0 llamadas a `useStore` sin selector.
- **Las dependencias.** Ninguna de runtime. Las de desarrollo, sólo con el permiso de T002.

## Constitution Check

*Compuerta: cada principio de [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (v1.4.1). Resultado antes y después del diseño: pasa, con dos decisiones en Complexity Tracking.*

| Principio | Cumple | Cómo |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Sí | TypeScript y ES modules; un componente por archivo con `export default` al final; exports nombrados en el modelo; `interface` para props y contratos; Vitest y Playwright como manda el ADR 0008; el agente principal integra `main.tsx`, `package.json`, las configuraciones y la documentación. `AGENTS.md` cambia sólo en la lista de vistas legacy (FR-047). |
| II. TDD y pruebas útiles | Sí | Cada módulo nuevo abre con su spec en rojo contra firmas que lanzan `not implemented`; los E2E de X1 van en el commit rojo. Los valores esperados están escritos a mano desde el README, las fixtures y el contenido. Cada protección nueva tiene su rotura deliberada (T019). |
| III. Código entendible | Sí | La página se parte en trece componentes chicos para que ninguna función pase de 10. Los dos avisos de `campaign.js` desaparecen. Sin memoización, contexto ni store propio. |
| IV. Contenido en Git, IDs estables | Sí | `content/` no cambia; los IDs de mundos y misiones, tampoco. |
| V. Capas y contratos explícitos | Sí | Selectores en `entities/campaign`, sesión y página en `pages/campaign`, adaptadores en `app/legacy`. Ningún import profundo; R4 y R6 se respetan, y los escenarios nuevos del guard lo prueban. |
| VI. Español, accesibilidad y portabilidad | Sí | Los textos de hoy; controles nativos sin `tabindex` ni manejadores de teclado nuevos; el foco explícito con refs y `flushSync`; el movimiento reducido por la regla global. Los scripts usan `node` y Playwright. |
| VII. Secretos y salidas generadas fuera de Git | Sí | Las comparaciones corren fuera del repositorio; no se commitea ninguna salida. |
| VIII. Flow-forward | Sí | `tasks.md` tiene una línea por tarea y, como mucho, su commit. |

## Decisiones del usuario

| Decisión | Cómo la aplica este plan | Dónde |
| --- | --- | --- |
| **Q1:** las palabras que repiten un conteo quedan como texto editorial | «Seis misiones…», «verificar sus seis misiones», «verificar las seis misiones» y «los cuatro mundos» quedan escritas; `CampaignPage.editorial.spec.tsx` las busca en la página dibujada con el catálogo real y las compara con los conteos | T013, research.md R7 |
| **Q2 (X2):** la retroalimentación del checkpoint queda montada | La región `.checkpoint-feedback` es el mismo nodo antes y después de responder; lo fijan la spec de la página y un E2E del commit rojo; la lectura con un lector de pantalla es acción del usuario (T022) | T013, T015, T022 |
| **Q3 (X1) y C2:** los `<details>` siguen abiertos, el foco no se pierde y la transición de `.world-node` se anima | `key` estables y bloques condicionales en posición fija; cuatro E2E del commit rojo (los `<details>`, el foco y la transición) | T014, T015, research.md R9 |
| **Decisión 1 del informe** (a confirmar): los checks nombran `TallerCampaignEngine.init` en lugar de `TallerCampaign.init` | Tres valores esperados cambian de texto y conservan el orden | T017, research.md R2 |
| **Decisión 2 del informe** (a confirmar): las versiones del arnés | Las del ADR 0008 (jsdom 30.1.2, user-event 14.6.7), aunque hay parches más nuevos | T002, research.md R12 |

## Project Structure

### Documentation (this feature)

```text
specs/019-f6-campana/
├── spec.md                          # la spec, con su clarify
├── plan.md                          # este archivo
├── research.md                      # decisiones, Context7, línea base y análisis
├── quickstart.md                    # comandos, compuertas, scripts de comparación y roturas
├── contracts/campaign-interfaces.md # firmas exactas entre tareas
├── tasks.md                         # una línea por tarea, T001 a T022
└── checklists/requirements.md       # de la spec
```

No hay `data-model.md`: F6 no cambia el formato del progreso ni agrega entidades de datos.

### Source Code (repository root)

```text
frontend/
├── campaign.js                                  (T016) se borra
├── campaign.css                                 (T009) pierde .quest-direct-lock; (T016) git mv a pages/campaign/ui/campaign-page.css
├── lab.css                                      (T009) suma las cuatro reglas de .quest-direct-lock al final
├── app.js                                       (T016) startApp() inicializa el motor por TallerCampaignEngine
├── vitest.config.ts                             (T002, sólo si falta el arnés) dos proyectos
└── src/
    ├── vitest-setup-dom.ts                      (T002, sólo si falta) jest-dom y cleanup
    ├── app/
    │   ├── main.tsx                             (T016) la línea de la hoja de la campaña
    │   ├── boot/legacy-views.ts                 (T016) register-campaign en lugar de campaign.js; register-effects según R13
    │   └── legacy/
    │       ├── campaign-bridges.ts              (T015 firmas, T016 cuerpo) los cinco métodos sin React
    │       ├── register-campaign.tsx            (T015 firmas, T016 cuerpo) mount, unmount y el global
    │       ├── register-campaign.spec.tsx       (T015) siete métodos, stop, doble montaje, sin escrituras
    │       └── register-effects.ts              (T016) se borra sólo si nadie más lee TallerEffects (research.md R13)
    ├── entities/
    │   ├── campaign/
    │   │   ├── index.ts                         (T007) suma constantes, selectores y tipos
    │   │   ├── bridge.ts                        (T007) suma missionTypeLabel, CODE_XP y PREDICTION_XP
    │   │   ├── bridge.spec.ts                   (T006) la entrada expone lo nuevo sin evaluar el motor
    │   │   ├── constants.spec.ts                (T006) las cuatro constantes en la API pública
    │   │   └── model/
    │   │       ├── selectors.ts                 (T006 firmas, T007 cuerpo)
    │   │       ├── selectors.spec.ts            (T006)
    │   │       └── campaign-config.factory.ts   (T013) mundos y ejercicios con fishery
    │   └── exercise/@x/campaign.ts              (T007) export type ChallengeType
    └── pages/campaign/
        ├── index.ts                             (T011) API pública de la página
        ├── model/
        │   ├── types.ts                         (T011) MissionContent
        │   ├── campaign-session.ts + spec       (T011 y T012)
        │   ├── open-campaign-session.ts + spec  (T011 y T012)
        │   └── mission-content.factory.ts       (T013)
        └── ui/
            ├── CampaignPage.tsx                 (T013 firma, T014 cuerpo) raíz: revisión, sesión, acciones
            ├── CampaignHero.tsx, WorldMap.tsx, SelectedWorld.tsx, LockedWorld.tsx,
            │   OpenWorld.tsx, WorldProgress.tsx, MissionCard.tsx, MissionSeal.tsx,
            │   MissionAction.tsx, WorldCheckpoint.tsx, TrophyCase.tsx, CampaignRules.tsx   (T014)
            ├── campaign-page-harness.tsx        (T013) render, almacenamiento en memoria y catálogo real
            ├── CampaignPage.spec.tsx            (T013) los catorce contratos y la Review Focus
            ├── CampaignPage.catalog.spec.tsx    (T013) un catálogo de cinco mundos
            ├── CampaignPage.constants.spec.tsx  (T013) las constantes reemplazadas
            ├── CampaignPage.editorial.spec.tsx  (T013) la coherencia del texto editorial
            └── campaign-page.css                (T016) la hoja movida
qa/
├── e2e/pages/campaign.ts                        (T003) Page Object ampliado
├── e2e/lib/campaign-progress.ts                 (T003) fábrica del formato v1 guardado
├── e2e/specs/campaign.spec.ts                   (T004 y T005) los quince flujos
├── e2e/specs/campaign-kept-state.spec.ts        (T015) el flujo (p), rojo contra el legacy
├── seams-guard-check.ts                         (T008) tres escenarios del adaptador
├── lib/legacy-sources.ts                        (T017) los puentes y el adaptador nuevos
├── lib/app-adapters.ts                          (T017) TallerCampaign sin init; TallerCampaignEngine con init
├── lib/app-shell-harness.ts                     (T017) el aviso de carga pasa al motor
├── app-shell-check.ts                           (T017) dos nombres de lo espiado
├── boot-check.ts                                (T017) navegación por nodos, fuentes, iniciadores
├── lab-bridge-check.ts                          (T017) carga de los puentes y la aserción de la inicialización
└── load-order-check.ts                          (T017) la tabla con los adaptadores nuevos
eslint.config.ts, package.json, package-lock.json   (T002, sólo si falta el arnés)
README.md, AGENTS.md, docs/architecture.md, qa/AGENTS.md   (T021)
```

**Structure Decision:**

- **La página** es el segundo slice de `pages/`, después del Atlas, y repite su forma: `index.ts`, `model/` y `ui/`, con la hoja en `ui/`.
- **Los selectores** son de `entities/campaign`, porque los usan la página y el puente.
- **Los dos adaptadores** viven en `app/legacy/`, porque los puentes de HTML no pueden arrastrar React (FR-036).
- No se crean capas, barrels ni carpetas vacías.

## Review Focus

Lo que el revisor mira primero:

- **El DOM idéntico.**
  - Cada expresión de `className` copia la del legacy, con sus espacios: `world-node ${state} ${selected}`, `quest-mission ${…} ${…} ${…}`, `quest-badge ${…}`, `button small ${…}`, y `class=""` en las opciones y los sellos sin estado.
  - Sin `type="button"`.
  - `<br />` en el título; `{' '}` o un espacio en la misma línea donde el legacy tiene un espacio entre una etiqueta y un texto.
  - La comparación de T018 da 0.
- **La identidad de los nodos (X1, X2 y C2).** `key` por id; los bloques condicionales en una sola posición. Si el revisor ve un condicional que corre a los hermanos, el flujo (p) va a fallar.
- **El orden de los efectos.**
  - Elegir un mundo: `replaceState`, `flushSync`, `scrollIntoView` y foco.
  - Responder: `before`, `answerCheckpoint` dentro de `flushSync`, foco, `after`, `celebrate` y el aviso.
  - `stop()` en todo `unmount`, aunque no haya raíz (research.md R10).
- **El montaje no escribe.** `refresh()` y `openCampaignSession` antes del primer dibujo; ningún `useEffect` deriva ni escribe; `sync()` sólo lo llaman `lab.js` y el respaldo.
- **Un solo motor.**
  - La página importa `campaignEngine` del índice.
  - Los puentes leen `window.TallerCampaignEngine`; el adaptador no importa el índice.
  - En `lab-bridge-check` no hay React (research.md R3).
- **Los checks adaptados.** Sólo cambia cómo cargan, salvo los tres nombres de lo espiado (research.md R2). La correspondencia de §4.4 va entera en el PR.
- **Los números.** Ningún literal de la lista; el `/ 180` sale de `world.maxScore` y el `/ 720`, del resumen.
- **Tamaño y complejidad:** el aumento de `html.length` y la cuenta de avisos, en el PR.

**Lo que la spec implica y ninguna prueba de una tarea ejercitaba.** Cada caso suma su prueba a la tarea dueña:

1. **Un título con caracteres de HTML** (`<`, `&`, `"`). React escapa solo y el legacy escapaba con `escapeHtml`. El contenido real no tiene ninguno. `CampaignPage.catalog.spec.tsx` (T013) arma un mundo titulado `Mundo <raro> & "citado"` y espera:
   - el texto literal en el `h2` y en el botón del mapa;
   - el nombre accesible `Mundo 1: Mundo <raro> & "citado", disponible`.
2. **El almacenamiento que falla a mitad de sesión.** `CampaignPage.spec.tsx` (T013):
   - abre con un almacenamiento que acepta leer y rechaza `setItem` después del arranque;
   - responde bien el checkpoint;
   - espera «Bien razonado.» y, en el mismo redibujo, la nota «Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.».
3. **Una copia de otra pestaña.** `CampaignPage.spec.tsx` (T013):
   - después de montar, escribe en el almacenamiento una copia con el sello de pruebas de `rust-18` (mundo 2);
   - responde el checkpoint del mundo 1;
   - espera que la tarjeta de `rust-18` muestre «✓ Pruebas · 20» al elegir el mundo 2, sin que nadie llame a otra cosa: la fusión del motor sube la revisión.
4. **Un filtro sin misiones y el filtro que sobrevive al cambio de idioma** (rareza de lógica).
   - `CampaignPage.catalog.spec.tsx` (T013) arma un mundo cuyas misiones de desafío no incluyen una kata, filtra «Kata» y espera la grilla `.quest-missions` vacía, con el botón `aria-pressed`.
   - El flujo (k) de `campaign.spec.ts` (T005) elige «Kata» en Rust, cambia a Go y espera «Kata» todavía `aria-pressed`.
5. **Una respuesta que el motor rechaza.** Ninguna interfaz la produce con el contenido real: las opciones sólo se dibujan cuando el checkpoint está listo. `CampaignPage.spec.tsx` (T013):
   - envuelve `campaignEngine.answerCheckpoint` con `vi.spyOn(…).mockReturnValueOnce({ accepted: false, correct: false, passed: false, explanation: '', reasons: ['Primero A.', 'Después B.'] })`;
   - espera el aviso `Primero A. Después B.`, la opción sin `aria-pressed="true"`, la retroalimentación sin cambios y `celebrate` sin llamar.

## Reparto en paralelo

Cada dueño trabaja en su worktree, parte de la línea base integrada y entrega una rama que se integra sin conflictos.

**Quiénes trabajan:**

- **Delegables:** E, M, C, P y A son slices para el subagente `implementador` (`AGENTS.md`, «Trabajo con subagentes»). Se le dan sus archivos, sus interfaces, sus valores y sus checks, y se le dice que no deje comentarios.
- **K:** el agente principal. Revisa cada diff, corre las compuertas e integra.

| Onda | Quién | Qué |
| --- | --- | --- |
| 0 | K | T001 (línea base) y T002 (el arnés, si falta, con permiso) |
| 1 | E, M y C a la vez | E: T003 a T005. M: T006 a T008. C: T009 |
| 1b | K | T010: integra la onda 1 en la rama del PR y corre la compuerta; es S1 |
| 2 | P | T011 a T014, desde S1 y con el arnés (S0) |
| 3 | E y A | T015, el commit rojo: E escribe el E2E y A la spec del adaptador con sus firmas, en una sola rama. Después A hace T016 y T017, el corte |
| 4 | K | T018 a T022: comparaciones, roturas, compuerta, documentación y PR |

**Dueños, archivos e interfaces:**

| Dueño | Archivos que posee | Consume | Entrega |
| --- | --- | --- | --- |
| K · Coordinador | `specs/**`, `package.json`, `package-lock.json`, `frontend/vitest.config.ts`, `frontend/src/vitest-setup-dom.ts`, `eslint.config.ts`, `README.md`, `AGENTS.md`, `docs/architecture.md`, `qa/AGENTS.md` | todo | la línea base, el arnés, las compuertas, la integración y el PR |
| E · E2E | `qa/e2e/pages/campaign.ts`, `qa/e2e/lib/campaign-progress.ts`, `qa/e2e/specs/campaign.spec.ts` y `qa/e2e/specs/campaign-kept-state.spec.ts` | el legacy | los flujos (a) a (o) en verde y el (p) en rojo |
| M · Modelo | en `frontend/src/entities/campaign/`: `index.ts`, `bridge.ts`, `bridge.spec.ts`, `constants.spec.ts` y `model/selectors*`; `frontend/src/entities/exercise/@x/campaign.ts`; `qa/seams-guard-check.ts` | — | los selectores y los exports (contracts §1 y §2) |
| C · CSS | `frontend/lab.css` y `frontend/campaign.css` (sólo las cuatro reglas) | — | `.quest-direct-lock` al final de `lab.css` |
| P · Página | `frontend/src/pages/campaign/**` (salvo `ui/campaign-page.css`) y `frontend/src/entities/campaign/model/campaign-config.factory.ts` | de M: los exports (S1); de K: el arnés (S0) | la página sin montar (contracts §3) |
| A · Adaptadores y corte | `frontend/src/app/legacy/campaign-bridges.ts`, `register-campaign.tsx` y su spec, `register-effects.ts`; `frontend/src/app/boot/legacy-views.ts`; `frontend/src/app/main.tsx` (una línea, revisada por K); `frontend/app.js` (sólo `startApp`); `frontend/campaign.js`; el `git mv` de la hoja; los ocho archivos de `qa/` de T017 | de P: la página (S2) | el corte (contracts §4) |

**Puntos de sincronización** (el coordinador integra y avisa):

- **S0:** T001 hecha y T002 resuelta, porque el arnés está o porque se instaló.
- **S1:** T010 integra E, M y C. P parte de ahí.
- **S2:** T014 integrada. A y E parten de ahí para el commit rojo.

**Puertos.** Cada dueño corre los E2E con el suyo (`vite preview` usa `--strictPort`): K `E2E_PORT=4173`, E `4191`, C `4192` y A `4193`. Las comparaciones usan 4501 y 4502.

**Lo que se integra con otros ítems** (lo resuelve K, research.md R13):

- **F3, F4, F5 y F9** tocan `app.js`, `legacy-views.ts`, `main.tsx` y archivos de `qa/`. Se integran de a uno, y el que llega después rebasa y repite la compuerta.
- **El arnés** lo trae el primero que lo necesite (predicado de T002).
- **`register-effects.ts`** lo retira el último de F5 y F6 (predicado de T016).
- **`lab-bridge-check`:** si F5 ya está, T017 rebasa sobre su versión y cambia sólo la mitad de campaña.

## Reglas para todos los agentes

- **Leé primero:**
  - `AGENTS.md`, `qa/AGENTS.md`, `docs/architecture.md` y la constitución;
  - la spec, [research.md](./research.md), [contracts/campaign-interfaces.md](./contracts/campaign-interfaces.md), [quickstart.md](./quickstart.md) y tu sección;
  - las skills `tdd`, `clean-code`, `vitest`, `react-testing` y `playwright-best-practices`.
- **TDD, siempre.**
  - Cada módulo nuevo empieza con su firma lanzando `not implemented`, para que su spec falle por comportamiento y no por un import.
  - La spec en rojo y su implementación van en commits separados. El commit rojo no pasa `npm test`; el PR entero sí.
  - Los E2E de T003 a T005 son caracterización: pasan contra el legacy desde el primer commit.
  - Si una prueba de la base falla, el error está en el código nuevo. Su valor esperado no se toca, salvo los tres nombres de lo espiado de T017.
  - Los valores esperados salen del README, del contenido, de las fixtures o de un ejemplo resuelto a mano, nunca del módulo que probás.
- **Portar no reescribe.** El marcado, los textos, las clases (con sus espacios) y el orden de los efectos son los del legacy. No corrijas nada de paso. Se conservan, entre otros:
  - el filtro que sobrevive al cambio de idioma;
  - `stop()` en todo `unmount`;
  - el `0` de «MUNDO 0N»;
  - la fusión de una copia de otra pestaña.

  Un defecto que encuentres se caracteriza con `KNOWN DEFECT` en el nombre de la prueba y se avisa.
- **Los archivos que no son tuyos no se tocan.** Si tu tarea necesita algo de otro dueño, pedíselo a K.
- **Los imports:**
  - fuera de un slice, sólo su índice o su entrada sin estado (R6);
  - desde `frontend/*.js` y `frontend/src/app/`, ningún valor del índice de `entities/campaign` (R4);
  - la página, su modelo y sus specs no importan `getContent()` ni `app/content` (FR-024).
- **Comandos,** desde la raíz de tu worktree:
  - `npm ci --offline`;
  - `npm run test:unit -- <ruta>`;
  - `node qa/<check>.ts` (antes de un check suelto, `npm run curriculum`);
  - `npm run typecheck`, `npm run lint` y `npm run format:check`;
  - `npm run build` y `E2E_PORT=<tu puerto> npm run test:e2e -- specs/<archivo>`.

  Si un comando intenta descargar algo, pará y pedí permiso. Docker lo corre sólo K, con permiso.
- **Estilo:**
  - el código, los nombres de test y los identificadores, en inglés; los textos que ve el alumno, en español y exactos;
  - **sin comentarios:** los de los bloques de este plan no se copian;
  - un componente por archivo, `const` con nombre y `export default` al final; exports nombrados en el modelo;
  - `interface` para props y contratos.
- **Commits:** chicos, en español, con prefijo Angular y el trailer `Co-Authored-By` de tu modelo, sin `git push`.
  - `test(e2e): …` o `test(front): …` para la spec en rojo o la caracterización;
  - `refactor(front): …` para lo que se mueve;
  - `feat(front): …` para la página y el corte.
- **Al terminar,** informá las tareas cerradas, los comandos con su resultado real, lo que no pudiste verificar y cualquier desvío del plan.

## 0. Línea base, arnés y compuerta (coordinador K, onda 0)

**Cubre:** FR-002, FR-004, FR-026, FR-042, FR-046 y FR-048; SC-001, SC-011 y SC-012.

### Tarea 0.1 · La línea base (T001)

- **Quién y cuándo:** K, sobre la base de implementación, que es `master` con F2a, A2 y F2b integradas y, si ya entraron, los ports anteriores. Antes de cualquier cambio.
- **Entrega:** un commit de documentación que agrega a [research.md](./research.md) la sección «Línea base de la implementación», con el hash de la base, la fecha y los valores de quickstart.md §1.
- **Pasos:**
  1. Correr `npm ci --offline --no-audit --no-fund`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check` y `E2E_PORT=4173 npm run test:e2e`. Todo tiene que estar en verde; si algo falla, F6 no empieza.
  2. Registrar lo de quickstart.md §1:
     - `html.length` y los hashes del script, del estilo y del marcado del dist;
     - el multiconjunto del CSS;
     - la cantidad de avisos de `npm run lint`, con las dos funciones de `campaign.js`;
     - los escenarios de `lab-bridge-check`, `boot-check`, `app-shell-check`, `campaign-check`, `seams-guard-check` y `load-order-check`;
     - la cantidad de E2E (123 si la base no tiene otros ports).
  3. Evaluar y anotar los predicados de research.md R13:
     - si el arnés de componentes está;
     - si `frontend/systems.js` existe y lee `TallerEffects`;
     - si `qa/lib/legacy-sources.ts` todavía carga `frontend/systems.js`.
  4. Con permiso, correr `docker compose build taller` e informar el resultado.
- **Compuerta:** los pasos 1 a 3, con los valores anotados.
- **Vuelta atrás:** revertí el commit; nada depende de él.

### Tarea 0.2 · El arnés de componentes, si falta (T002)

- **Predicado:** `node -e "require.resolve('jsdom')"` falla y `grep -c '"jsdom"' package.json` da 0. Si el arnés ya está:
  - se comprueba que estén los dos proyectos de Vitest (`node` y `jsdom`), el setup con jest-dom y `cleanup`, y la guarda de `useStore` en `eslint.config.ts`;
  - si algo falta, se completa con los pasos 4 a 6;
  - la tarea se cierra con «el arnés ya estaba en `<commit>`».
- **Cambia:** `package.json`, `package-lock.json`, `frontend/vitest.config.ts` y `eslint.config.ts`; crea `frontend/src/vitest-setup-dom.ts`. Todo lo integra K (constitución, «Subagentes»).
- **Pasos:**
  1. **Pedir el permiso al usuario** con esta lista, que es la de research.md R12. Sin un sí explícito no se baja nada.

     | Paquete | Versión | Origen | Peso desempaquetado | Licencia |
     | --- | --- | --- | --- | --- |
     | `jsdom` | 30.1.2 | registro de npm | 5 533 799 B | MIT |
     | `@testing-library/react` | 16.3.3 | registro de npm | 339 581 B | MIT |
     | `@testing-library/dom` | 10.4.2 | registro de npm | 2 467 302 B | MIT |
     | `@testing-library/user-event` | 14.6.7 | registro de npm | 437 525 B | MIT |
     | `@testing-library/jest-dom` | 7.0.1 | registro de npm | 331 873 B | MIT |
     | `fishery` | 2.4.0 | registro de npm | 135 590 B | MIT |

     Con las dependencias transitivas, el ADR 0008 estimó 56 paquetes y 26,3 MB (5,0 MB comprimidos) para jsdom y Testing Library, y 2 paquetes y 0,19 MB para fishery.
  2. `npm install --save-dev --save-exact jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.7 @testing-library/jest-dom@7.0.1 fishery@2.4.0`. Anotar cuántos paquetes sumó el lockfile.
  3. `git diff package.json`: las seis entradas están en `devDependencies`, y `dependencies` no cambió.
  4. **`frontend/vitest.config.ts`:** la raíz sólo lleva `projects`, porque en Vitest 5 los proyectos en línea heredan la raíz y concatenan sus arreglos (research.md R12):

     ```ts
     import { resolve } from 'node:path';
     import { defineConfig, mergeConfig } from 'vitest/config';
     import viteConfig from './vite.config.ts';

     export default mergeConfig(
       viteConfig,
       defineConfig({
         cacheDir: resolve(import.meta.dirname, '../node_modules/.vite'),
         test: {
           projects: [
             { test: { name: 'node', environment: 'node', include: ['**/*.spec.ts'] } },
             {
               test: {
                 name: 'jsdom',
                 environment: 'jsdom',
                 include: ['**/*.spec.tsx'],
                 setupFiles: [resolve(import.meta.dirname, 'src/vitest-setup-dom.ts')],
               },
             },
           ],
         },
       }),
     );
     ```

     Se conserva el comentario que hoy explica `cacheDir`: es un comentario existente.
  5. **`frontend/src/vitest-setup-dom.ts`:**

     ```ts
     import '@testing-library/jest-dom/vitest';
     import { cleanup } from '@testing-library/react';
     import { afterEach } from 'vitest';

     afterEach(() => {
       cleanup();
     });
     ```

  6. **`eslint.config.ts`:** un bloque más, antes del de `complexity`:

     ```ts
     {
       files: ['frontend/src/**/*.{ts,tsx}'],
       rules: {
         'no-restricted-syntax': [
           'error',
           {
             selector: "CallExpression[callee.name='useStore'][arguments.length=1]",
             message: 'useStore needs a selector: without one it subscribes to the whole store.',
           },
         ],
       },
     },
     ```

  7. **Comprobar:**
     - `npm run test:unit` corre las specs de antes, ahora bajo el proyecto `node`, con la misma cantidad;
     - `npm run typecheck`, `npm run lint` y `npm run format:check` pasan;
     - **la guarda detecta algo:** en una copia descartable, un componente con `useStore(campaignEngine.changes)` sin selector hace fallar `npm run lint` con el mensaje de arriba;
     - `npm run build` da el mismo script del dist que T001 (`sha`, quickstart.md §0): nada del arnés es alcanzable desde `main.tsx`.
  8. **Un commit:** `build(front): el arnés de specs de componentes (jsdom, Testing Library y fishery)`. Su descripción nombra el permiso y la enmienda pendiente del ADR 0008 (los `projects` y el setup), que T021 integra.
- **Compuerta:** el paso 7.
- **Vuelta atrás:** revertí el commit. Ninguna spec de `node` depende de él.

### 0.3 · La compuerta del PR

La corre K en T020, sobre el árbol con el corte, y cada dueño corre la parte que le toca. El PR no se abre con una casilla en rojo.

1. **Comandos:** `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check` y `E2E_PORT=4173 npm run test:e2e`; con permiso, `docker compose build taller`.
2. **La red:** 123 E2E de F1 y A2 sin editar, más los de `campaign.spec.ts` y `campaign-kept-state.spec.ts`. `git diff <base> --stat -- qa/e2e/specs` muestra sólo esos dos archivos nuevos.
3. **El dist** (quickstart.md §2):
   - `frontend/src/index.html` sin diff;
   - el marcado del dist con los scripts y el estilo vaciados, igual al de T001;
   - el `<style>` distinto, con el multiconjunto igual;
   - el script distinto;
   - `html.length` bajo 1 250 000, con el aumento informado. Si pasa de 15 000, se avisa antes de abrir el PR;
   - la forma de A2: un `<script type="module">`, un `<style>` y el contenido aparte, sin chunks.
4. **El progreso:** `campaign-check` y `campaign-content-check` sin diff y en verde; `curriculum-ids-check` en verde; `build/curriculum.json` y `dump-globals` con los mismos bytes que T001.
5. **Sin estilos en línea nuevos:** `git diff <base> -- 'frontend/*.js' 'frontend/src' | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'` no imprime nada.
6. **Los archivos que F6 no toca:** `git diff --name-only <base> -- frontend/quest-explorers.js frontend/quest-explorers.css frontend/lab-explorers.js content tools/content frontend/src/entities/campaign/model/rules.ts frontend/src/entities/campaign/model/create-campaign-engine.ts frontend/src/entities/campaign/model/progress.ts` no imprime nada.
7. **Complejidad:** `npm run lint` da 0 errores y los avisos de T001 menos 2; ninguna función nueva aparece en la lista.
8. **Las referencias** (SC-008): `git grep -n -E 'campaign\.(js|css)' -- . ':!specs' ':!docs/plans' ':!docs/adr' ':!docs/refactor-roadmap.md'` sólo da las líneas de `qa/e2e/specs/css-contract.spec.ts` y de `qa/seams-guard-check.ts`.
9. **Las comparaciones únicas** (T018) con 0 diferencias fuera de las aceptadas, y **las roturas** (T019) N de N.
10. **La correspondencia de los checks** (§4.4) y las medidas, en la descripción del PR.

### 0.4 · Qué E2E existentes ejercen la campaña

| Spec de F1 o A2 | Qué fija de la campaña | Lo que no ve |
| --- | --- | --- |
| `views` | Que `#campana` abre con su encabezado | El contenido de la página |
| `url-contract` | `?mundo=` de Rust y de Go y el desconocido | Elegir un mundo y la URL que escribe |
| `reload` | L3 («laboratorio libre») y L4 («Abrir misión») recargan | Los demás enlaces de la página |
| `startup-storage` | Abrir no escribe; un checkpoint respondido sobrevive a la recarga | Los textos, los avisos y el foco |
| `cycle` | Una misión aprobada se cuenta en su tarjeta | El resto de la tarjeta |
| `bridges` | El contexto y el bloqueo dentro del laboratorio | Los puentes con parámetros vacíos (lo ve la comparación de T018) |
| `css-contract` | R6, R7, R10 y el movimiento reducido de `.world-node` | Las demás reglas de la hoja (lo ve el barrido de T018) |
| `content-gate` | `?mundo=` detrás de la compuerta | — |

Todo lo demás lo cubren `campaign.spec.ts` (T004 y T005), `campaign-kept-state.spec.ts` (T015) y las specs de Vitest.

## 1. Unidad 1 · Los E2E de la campaña, contra el legacy (dueño E, onda 1)

**Cubre:** FR-003 y FR-041 (flujos a a o); SC-002, SC-003 y SC-009; US1, US2 (escenarios 1 a 4 y 6) y US4 (escenario 1).

**Entrega:** el Page Object ampliado, una fábrica del formato v1 guardado y 21 pruebas en `qa/e2e/specs/campaign.spec.ts`, en verde contra el legacy y sin editarse después.

### Tarea 1.1 · El Page Object y la fábrica (T003)

- **Cambia:** `qa/e2e/pages/campaign.ts`. Se suman métodos y no se cambia ninguno de los seis que existen: los usan `reload`, `cycle`, `content-gate` y `startup-storage`.
- **Crea:** `qa/e2e/lib/campaign-progress.ts`.
- **Los métodos nuevos de `CampaignPage`.** Por nombre accesible donde lo hay; por clase, dentro del Page Object, donde no lo hay (`qa/AGENTS.md`):

  ```ts
  export type MissionFilterName = 'Todas' | 'Entrenamiento' | 'Reparación' | 'Kata' | 'Desafío final';

  hero(): Locator {
    return this.page.locator('#main .quest-hero');
  }

  pills(): Locator {
    return this.page.locator('#main .quest-pills span');
  }

  rank(): Locator {
    return this.page.locator('#main .quest-rank');
  }

  rankSymbol(): Locator {
    return this.page.locator('#main .rank-symbol');
  }

  campaignProgress(): Locator {
    return this.page.getByRole('progressbar', { name: 'Experiencia de campaña' });
  }

  storageNotice(): Locator {
    return this.page.getByRole('status').filter({ hasText: 'Este navegador no pudo guardar tu campaña.' });
  }

  worldMap(): Locator {
    return this.page.getByRole('navigation', { name: 'Mundos de la campaña' });
  }

  worldNode(position: number): Locator {
    return this.worldMap().getByRole('button', { name: new RegExp(`^Mundo ${position}: `) });
  }

  worldHeading(title: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: title, exact: true });
  }

  backToWorld(title: string): Locator {
    return this.page.getByRole('button', { name: `Volver a ${title} →`, exact: true });
  }

  nextWorldButton(): Locator {
    return this.page.getByRole('button', { name: 'Siguiente mundo →', exact: true });
  }

  projectLink(): Locator {
    return this.page.getByRole('link', { name: 'Llevarlo a mi proyecto ↗', exact: true });
  }

  nextMove(): Locator {
    return this.page.locator('#main .quest-next');
  }

  filter(name: MissionFilterName): Locator {
    return this.page
      .getByRole('group', { name: 'Tipo de misión' })
      .getByRole('button', { name, exact: true });
  }

  missionCards(): Locator {
    return this.page.locator('#main .quest-missions').getByRole('article');
  }

  missionRequirements(title: string): Locator {
    return this.missionCard(title).locator('details');
  }

  checkpointFeedback(): Locator {
    return this.checkpoint().getByRole('status');
  }

  badge(name: string, state: 'conseguida' | 'pendiente'): Locator {
    return this.page.getByLabel(`${name}: ${state}`, { exact: true });
  }

  rules(): Locator {
    return this.page.locator('#main details.quest-rules');
  }

  rulesSummary(): Locator {
    return this.page.getByText('Las reglas del juego y las herramientas que usamos', { exact: true });
  }

  celebration(): Locator {
    return this.page.locator('canvas.quest-celebration');
  }
  ```

- **`qa/e2e/lib/campaign-progress.ts`.** Está tipada por el formato v1 guardado, no por los tipos del código (ADR 0008, §2), y lee `curriculum-ids.json` por `curriculumIds`:

  ```ts
  import { curriculumIds } from './curriculum';

  interface SavedSeal {
    code: boolean;
    prediction: boolean;
    assisted: boolean;
  }

  interface SavedCheckpoint {
    passed: boolean;
    lastAnswer: number | null;
  }

  interface SavedCampaignV1 {
    version: 1;
    seals: Record<string, SavedSeal>;
    checkpoints: Record<string, SavedCheckpoint>;
  }

  interface CampaignSeed {
    mastered?: readonly string[];
    codeOnly?: readonly string[];
    passedCheckpoints?: Readonly<Record<string, number>>;
  }

  export function missionsOf(worldId: string): string[] {
    const world = curriculumIds.worlds[worldId];
    return [...world.trainingIds, ...world.challengeIds];
  }

  export function savedCampaign(seed: CampaignSeed): string {
    const seals: Record<string, SavedSeal> = {};
    for (const id of seed.mastered ?? []) seals[id] = { code: true, prediction: true, assisted: false };
    for (const id of seed.codeOnly ?? []) seals[id] = { code: true, prediction: false, assisted: false };
    const checkpoints: Record<string, SavedCheckpoint> = {};
    for (const [worldId, answer] of Object.entries(seed.passedCheckpoints ?? {}))
      checkpoints[worldId] = { passed: true, lastAnswer: answer };
    const saved: SavedCampaignV1 = { version: 1, seals, checkpoints };
    return JSON.stringify(saved);
  }
  ```

- **Las respuestas correctas,** por mundo, salen de `content/campaign/*.yaml` (`checkpoint.answer`): `rust-world-1` B (1), `rust-world-2` C (2), `rust-world-3` B (1), `rust-world-4` C (2).
- **Pasos:**
  1. Agregar los métodos y la fábrica.
  2. `npm run typecheck`, que incluye `qa/e2e/tsconfig.json`.
  3. `E2E_PORT=4191 npm run test:e2e`: los 123 de hoy siguen en verde.
  4. Commit: `test(e2e): el Page Object de la campaña y la fábrica del progreso v1`.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.2 · Los flujos (a) a (h) (T004)

- **Crea:** `qa/e2e/specs/campaign.spec.ts`, con `import { expect, test } from '../fixtures'`, `curriculumIds` y `frozenProgress` de `../lib/curriculum`, `missionsOf` y `savedCampaign` de `../lib/campaign-progress` y `urls` de `../lib/urls`.
- **Las siembras de la spec:**

  | Nombre | Qué siembra |
  | --- | --- |
  | `MASTER_RUST` | las claves `taller-laboratorio-v1`, `taller-campaign-v1` y `taller-systems-v1` de `frozenProgress`, sin la del recorrido, así que el idioma es Rust |
  | `MASTER_GO` | las cuatro claves: el recorrido guardado está en Go |
  | `LAB_ONLY` | sólo `taller-laboratorio-v1`: las seis misiones del mundo 1 con evidencia y el checkpoint abierto |
  | `TITLE` | `(id) => curriculumIds.exercises[id].title` |

- **Las pruebas.** Los textos van entre comillas latinas tal como se esperan; los títulos de misión, por `TITLE`.
  - **(a) `an empty browser opens Rust at world 1 with nothing earned`.** Con `storage.watchWrites()` y `urls.view('campana')`:
    - `hero()` contiene `CAMPAÑA · RUST`;
    - `pills()` tiene exactamente «4 mundos», «24 misiones» y «12 desafíos nuevos» (README, línea 119);
    - `rank()` contiene «TU RANGO», «Explorador», «0 / 720 XP de campaña» y «0 de 4 insignias»;
    - `campaignProgress()` tiene `max` «720» y `value` «0»;
    - los cuatro nodos del mapa se llaman:
      - «Mundo 1: Estación del robot, disponible», con `aria-pressed` «true»;
      - «Mundo 2: Puerto de señales, bloqueado; ver requisitos», «Mundo 3: Archivo de rutas, bloqueado; ver requisitos» y «Mundo 4: Núcleo de la máquina, bloqueado; ver requisitos», con «false»;
    - `world('Estación del robot')` contiene «Inicial / TU EXPEDICIÓN» y «0/ 180 XP»;
    - `storageNotice()` tiene 0 elementos;
    - `freeLabLink()` tiene `href` «?#laboratorio»;
    - `storage.writes()` es `[]`.
  - **(b1) `the progress of master in Rust shows one badge and selects the first open world`.** Con `MASTER_RUST`:
    - `rank()` contiene «Aprendiz de sistemas», «180 / 720 XP de campaña» y «1 de 4 insignias»;
    - `rankSymbol()` es «◈»;
    - `worldNode(1)` se llama «Mundo 1: Estación del robot, completado», contiene «Insignia conseguida» y tiene `aria-pressed` «false»;
    - `worldNode(2)` se llama «Mundo 2: Puerto de señales, disponible», contiene «0/180 XP · explorar →» y tiene `aria-pressed` «true»;
    - `world('Puerto de señales')` contiene «Intermedio / TU EXPEDICIÓN»;
    - `badge('Piloto de estados', 'conseguida')` contiene «CONSEGUIDA»;
    - `badge('Custodia del protocolo', 'pendiente')` contiene «POR DESCUBRIR».

    Los valores salen a mano de la fixture: los seis sellos del mundo 1 con pruebas y predicción dan 6 × 30 = 180, y su checkpoint superado completa un mundo.
  - **(b2) `the progress of master with its saved language opens Go`.** Con `MASTER_GO`: `hero()` contiene «CAMPAÑA · GO», `rank()` contiene «Explorador» y «0 / 720 XP de campaña», y `world('La estación del rover')` es visible (`go-01` no es misión de ningún mundo de Go).
  - **(c) `choosing a world rewrites ?mundo= in place, presses it and focuses its title`.** Con `storage.watchWrites()` y `/?mundo=rust-world-1&extra=1#campana`:
    1. Se lee `history.length` con `page.evaluate`.
    2. Se hace clic en `worldNode(2)`.
    3. Se espera:
       - `world('Puerto de señales')` visible;
       - `worldNode(2)` con `aria-pressed` «true» y `worldNode(1)` con «false»;
       - la URL que termina en `/?mundo=rust-world-2#campana`;
       - el mismo `history.length`;
       - `worldHeading('Puerto de señales')` enfocado;
       - ninguna escritura que empiece con `set taller-campaign-v1`.
  - **(d) `a locked world shows its requirement and the way back to the open world`.** En un navegador vacío:
    1. Se hace clic en `worldNode(3)`.
    2. `world('Archivo de rutas')` contiene:
       - «Avanzado / PRÓXIMA FRONTERA»;
       - «Esta región tiene un requisito.»;
       - «Podés conocer su tema ahora. Sus misiones se habilitan cuando completes los mundos anteriores.»;
       - dos `listitem`: el primero empieza con «Completá «Estación del robot»:» y el segundo con «Completá «Puerto de señales»:».
    3. Se hace clic en `backToWorld('Estación del robot')` y se espera `world('Estación del robot')`, la URL `/?mundo=rust-world-1#campana` y su título enfocado.
  - **(e) `each filter shows the missions of its type, keeps the focus and resets on a new world`.** Con `MASTER_RUST` (el mundo 2 está abierto):
    - «Entrenamiento» da 3 tarjetas, las de `TITLE('rust-18')`, `TITLE('rust-27')` y `TITLE('rust-78')`;
    - «Reparación» da 1, `TITLE('rust-104')`, con el tipo «Reparación · lings»;
    - «Kata» da 1, `TITLE('rust-105')`, con el tipo «Kata»;
    - «Desafío final» da 1, `TITLE('rust-106')`, con el tipo «Desafío final»;
    - «Todas» da 6.

    Los tipos salen de la posición en `challengeIds` (README, «un desafío no declara `challengeType`, porque lo fija su posición en el mundo»). Después de cada clic, el botón tiene `aria-pressed` «true» y está enfocado, y los demás tienen «false». Al final, con «Kata» elegido, se hace clic en `worldNode(1)` y se espera `filter('Todas')` con `aria-pressed` «true».
  - **(f1) `mission cards of a completed world show their seals, the assisted practice and the way back`.** Con `MASTER_RUST`, `worldNode(1)` y la tarjeta de `TITLE('rust-22')`:
    - contiene «Entrenamiento», «30/30 XP», «✓ Pruebas · 20», «✓ Predicción · 10» y «Práctica con solución de apoyo»;
    - su enlace se llama «Volver a experimentar ↗», con `href` «?campana=rust-world-1&ejercicio=rust-22&paso=learn#laboratorio».

    La tarjeta de `TITLE('rust-103')` también tiene «Volver a experimentar ↗».
  - **(f2) `an open mission links to the lab and a locked boss lists what is missing`.** En un navegador vacío:
    - la tarjeta de `TITLE('rust-02')`:
      - contiene «0/30 XP», «○ Pruebas · 20» y «○ Predicción · 10»;
      - su enlace se llama «Abrir misión ↗», con `href` «?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio»;
    - la tarjeta de `TITLE('rust-103')`:
      - no tiene enlace;
      - su `missionRequirements` está cerrado (`toHaveJSProperty('open', false)`);
      - al hacer clic en «Ver qué falta para entrar» se abre y muestra 5 `listitem`, que contienen «(rust-02)», «(rust-06)», «(rust-22)», «(rust-101)» y «(rust-102)», en ese orden.

    Después, con `savedCampaign({ codeOnly: ['rust-02', 'rust-06', 'rust-22', 'rust-101', 'rust-102'] })` en `taller-campaign-v1`, la tarjeta del jefe tiene un enlace «Enfrentar el desafío final ↗» con `href` «?campana=rust-world-1&ejercicio=rust-103&paso=learn#laboratorio».
  - **(g) `the next move asks for the IDE and then for the prediction`.**
    - En un navegador vacío, `nextMove()`:
      - contiene «TU SIGUIENTE MOVIMIENTO», `TITLE('rust-02')` y «Una misión, una hipótesis y tres pruebas.»;
      - su enlace se llama «Entrar al IDE ↗», con `href` «?campana=rust-world-1&ejercicio=rust-02&paso=learn#laboratorio».
    - Con `savedCampaign({ codeOnly: ['rust-02'] })`:
      - contiene «Código aprobado. Volvé a Descubrí y razoná la predicción.»;
      - su enlace se llama «Resolver predicción ↗», con el mismo `href`.
  - **(h1) `a closed checkpoint explains how it opens`.** En un navegador vacío:
    - `checkpoint()` se llama «El código funciona. ¿Sabés por qué?»;
    - contiene «CHECKPOINT · LA ÚLTIMA LLAVE» y «Se abre al verificar las seis misiones, reunir 150 XP y resolver la predicción del desafío final.»;
    - no tiene botones.
  - **(h2) `answering the checkpoint wrong and then right completes the world and survives a reload`.** Con `LAB_ONLY`, `storage.watchWrites()` y `urls.view('campana')`:
    1. **Abierto:**
       - `checkpoint()` contiene la pregunta de `content/campaign/rust-world-1.yaml` («El robot propone moverse, pero el destino es una pared.»);
       - tiene tres opciones, de la A a la C;
       - `checkpointFeedback()` dice «Elegí la explicación que mejor sostenga tu decisión.».
    2. **Clic en A:**
       - A tiene `aria-pressed` «true», la clase `incorrect` y el foco;
       - `checkpointFeedback()` contiene «Revisemos esa idea.» y «La batería pertenece a la transición aceptada.»;
       - `shell.toast` dice «Leé el porqué y probá otra explicación.»;
       - las escrituras que empiezan con `set taller-campaign-v1` son exactamente 1.
    3. **Clic en B:**
       - `shell.toast` dice «¡Piloto de estados! Un mundo completado. Tu próximo nivel está disponible.»;
       - `checkpointFeedback()` contiene «Bien razonado.»;
       - `checkpoint()` se llama «Una idea que ya podés explicar.»;
       - la página muestra un `status` con «Insignia conseguida: Piloto de estados»;
       - `nextWorldButton()` es visible;
       - las escrituras de campaña son exactamente 2.
    4. **`page.reload()`:** B sigue con `aria-pressed` «true».
    5. **Clic en `nextWorldButton()`:** `world('Puerto de señales')` es visible y la URL termina en `/?mundo=rust-world-2#campana`.
- **Pasos:**
  1. Escribir las pruebas.
  2. `npm run build` y `E2E_PORT=4191 npm run test:e2e -- specs/campaign.spec.ts`: todas en verde contra el legacy.
  3. Si una no pasa porque el legacy hace otra cosa, el valor esperado no se ajusta a ciegas:
     - si el plan se equivocó al leer, se corrige la prueba y se avisa a K;
     - si es un defecto del legacy, se caracteriza con `KNOWN DEFECT` en el nombre y se avisa.
  4. `--repeat-each=3 --retries=0` sobre la spec, sin fallas.
  5. Commit: `test(e2e): la campaña, del héroe al checkpoint, contra el legacy`.
- **Vuelta atrás:** revertí el commit.

### Tarea 1.3 · Los flujos (i) a (o) (T005)

- **Cambia:** `qa/e2e/specs/campaign.spec.ts`, en el mismo archivo y antes del corte. Todavía no está entregado, así que no cuenta como edición de un E2E.
- **Las pruebas:**
  - **(i1) `completing the last world unlocks the project`.** Con `taller-campaign-v1` = `savedCampaign({ mastered: ['rust-world-1', 'rust-world-2', 'rust-world-3', 'rust-world-4'].flatMap(missionsOf), passedCheckpoints: { 'rust-world-1': 1, 'rust-world-2': 2, 'rust-world-3': 1 } })`:
    1. **Al abrir:**
       - `world('Núcleo de la máquina')` es visible;
       - `rank()` contiene «Arquitecto», «720 / 720 XP de campaña» y «3 de 4 insignias».
    2. **Clic en la opción C:**
       - `shell.toast` dice «¡Arquitectura del núcleo! Completaste los cuatro mundos. Es hora de llevarlo a tu proyecto.»;
       - `projectLink()` tiene `href` «#proyecto»;
       - `rank()` contiene «Maestro del taller» y «4 de 4 insignias»;
       - `rankSymbol()` es «✳»;
       - `celebration()` está adjunto al documento.
  - **(i2) `with reduced motion the last world completes without a celebration`.** Con `test.use({ reducedMotion: 'reduce' })` y la misma siembra: después de C, `celebration()` tiene 0 elementos y el aviso es el mismo.
  - **(j) `the trophy case and the rules`.** En un navegador vacío:
    - **la vitrina:** la página tiene el `heading` «Ideas que ya pusiste a prueba.» y `badge(…, 'pendiente')` para «Piloto de estados», «Custodia del protocolo», «Cartografía de rutas» y «Arquitectura del núcleo», cada una con «POR DESCUBRIR»;
    - **las reglas, cerradas:** `rules()` tiene `open` en `false`;
    - **las reglas, abiertas** con un clic en `rulesSummary()`:
      - `open` en `true`;
      - los `heading` «XP que significa algo», «Ayuda sin castigos» y «Herramientas existentes»;
      - el texto «20 XP por las pruebas del ejercicio y 10 por su predicción correcta.» (README, línea 130);
    - **los cuatro enlaces externos,** cada uno con `target` «_blank» y `rel` «noopener noreferrer». No se sigue ninguno, por la red estricta:

      | Enlace | `href` |
      | --- | --- |
      | «CodeMirror» | `https://codemirror.net/` |
      | «canvas-confetti» | `https://github.com/catdad/canvas-confetti` |
      | «Rustlings» | `https://rustlings.rust-lang.org/usage/` |
      | «Golings» | `https://github.com/madhank93/golings` |
  - **(k1) `switching to Go keeps the filter and falls back to the first open world`.** En un navegador vacío, con `storage.watchWrites()`:
    1. Clic en `filter('Kata')`.
    2. Clic en el botón «Go» de `shell.languages`.
    3. Se espera:
       - `hero()` contiene «CAMPAÑA · GO»;
       - `world('La estación del rover')` es visible;
       - `filter('Kata')` tiene `aria-pressed` «true». Es una rareza de lógica de hoy: `mount` no reinicia el filtro;
       - ninguna escritura empieza con `set taller-campaign-v1`.
  - **(k2) `a Go world link opens Go even when it is locked`.** Con `urls.world('go-world-2')`:
    - `hero()` contiene «CAMPAÑA · GO»;
    - `world('La antena de telemetría')` contiene «Intermedio / PRÓXIMA FRONTERA»;
    - la URL sigue siendo `/?mundo=go-world-2#campana`.
  - **(l) `the world and the filter survive the menu and are lost on a reload`.** Con `MASTER_RUST`:
    1. Clic en `worldNode(1)` y en `filter('Kata')`.
    2. `shell.openFromMenu('laboratorio')` y `shell.openFromMenu('campana')`. El laboratorio reescribe la URL sin query.
    3. Se espera `world('Estación del robot')` visible, `filter('Kata')` con `aria-pressed` «true» y la URL que termina en `/#campana`.
    4. `page.reload()`: `world('Puerto de señales')` es visible (el primer mundo abierto sin completar) y `filter('Todas')` tiene `aria-pressed` «true».
  - **(m) `with the storage blocked the page draws and warns`.** Con `storage.block()`:
    - `storageNotice()` dice «Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.»;
    - `world('Estación del robot')` es visible;
    - si el arranque bloqueado deja en la consola el error que ya conoce `startup-storage`, se declara con el mismo `expectIssue` que esa spec.
  - **(n1) `the keyboard chooses worlds like a click`.** En un navegador vacío:
    1. `freeLabLink().focus()` y `page.keyboard.press('Tab')`: `worldNode(1)` queda enfocado.
    2. `worldNode(2).press('Enter')`: `worldHeading('Puerto de señales')` queda enfocado.
    3. `worldNode(1).press(' ')`: `worldHeading('Estación del robot')` queda enfocado y la URL termina en `/?mundo=rust-world-1#campana`.
  - **(n2) `the keyboard filters and answers like a click`.** Con `LAB_ONLY`:
    1. `filter('Kata').press(' ')`: `aria-pressed` «true» y el foco en el filtro.
    2. `filter('Todas').press('Enter')`.
    3. `checkpointOption('B').press('Enter')`: `aria-pressed` «true», el foco en la opción y el aviso del mundo completado.
  - **(o) `at 375 px the campaign does not scroll sideways`.** Con `test.use({ viewport: { width: 375, height: 812 } })`, en un navegador vacío y con `MASTER_RUST`: `page.evaluate(() => document.documentElement.scrollWidth)` es como mucho 375.
- **Pasos y compuerta:**
  1. Los de T004.
  2. Con las dos tareas, `campaign.spec.ts` tiene 21 pruebas y pasa 3 veces seguidas contra el legacy.
  3. Commit: `test(e2e): el último mundo, la vitrina, el idioma, la sesión, el teclado y el móvil`.
- **Vuelta atrás:** revertí el commit.

**La correspondencia de los quince flujos de FR-041:**

| Flujo | Pruebas |
| --- | --- |
| a | a |
| b | b1 y b2 |
| c | c |
| d | d |
| e | e |
| f | f1 y f2 |
| g | g |
| h | h1 y h2 |
| i | i1 y i2 |
| j | j |
| k | k1 y k2 |
| l | l |
| m | m |
| n | n1 y n2 |
| o | o |
| p | `campaign-kept-state.spec.ts` (T015) |

## 2. Unidad 2 · Los selectores, las constantes y `.quest-direct-lock` (dueños M y C, onda 1)

**Cubre:** FR-005, FR-027 a FR-030, FR-039; SC-006, SC-011; US4 (escenario 1), US5 (escenario 1) y US6 (escenario 2).

**Entrega:** sin cambio visible.

- `entities/campaign` exporta las cuatro constantes y los selectores puros.
- Su entrada sin estado expone lo que necesita el puente.
- El guard prueba que el adaptador puede usarla y nada más.
- `.quest-direct-lock` vive al final de `lab.css`.

### 2.0 Contratos de la unidad 2

Las firmas completas están en [contracts/campaign-interfaces.md](./contracts/campaign-interfaces.md) §1 y §2. El módulo nuevo:

```ts
// frontend/src/entities/campaign/model/selectors.ts (only type imports)
import type { ChallengeType } from '../../exercise/@x/campaign';
import type { CampaignWorld, DerivedWorld } from './types';

const RANKS = ['Explorador', 'Aprendiz de sistemas', 'Constructor', 'Arquitecto', 'Maestro del taller'] as const;
const WORLD_SYMBOLS = ['⌘', '◈', '⌁', '✳'] as const;

export type WorldState = 'complete' | 'available' | 'locked';
export type MissionTypeLabel = 'Desafío final' | 'Reparación · lings' | 'Kata' | 'Entrenamiento';
export const MISSION_FILTERS = ['all', 'Entrenamiento', 'Reparación', 'Kata', 'Desafío final'] as const;
export type MissionFilter = (typeof MISSION_FILTERS)[number];

export interface CampaignCounts {
  worlds: number;
  missions: number;
  newChallenges: number;
}

const WORLD_STATE_NAMES: Record<WorldState, string> = {
  complete: 'completado',
  available: 'disponible',
  locked: 'bloqueado; ver requisitos',
};

export function rankName(completedWorlds: number): string | undefined {
  return RANKS[completedWorlds];
}

export function rankSymbol(completedWorlds: number): string {
  return WORLD_SYMBOLS[Math.min(completedWorlds, WORLD_SYMBOLS.length - 1)];
}

export function worldSymbol(index: number): string | undefined {
  return WORLD_SYMBOLS[index];
}

export function worldState(world: Pick<DerivedWorld, 'completed' | 'unlocked'>): WorldState {
  if (world.completed) return 'complete';
  return world.unlocked ? 'available' : 'locked';
}

export function worldStateName(state: WorldState): string {
  return WORLD_STATE_NAMES[state];
}

export function worldMapStatus(
  world: Pick<DerivedWorld, 'completed' | 'unlocked' | 'score' | 'maxScore'>,
): string {
  if (world.completed) return 'Insignia conseguida';
  if (world.unlocked) return `${world.score}/${world.maxScore} XP · explorar →`;
  return 'Bloqueado · ver requisitos';
}

export function missionTypeLabel(challengeType: ChallengeType | undefined): MissionTypeLabel {
  if (challengeType === 'boss') return 'Desafío final';
  if (challengeType === 'repair') return 'Reparación · lings';
  if (challengeType === 'kata') return 'Kata';
  return 'Entrenamiento';
}

export function matchesMissionFilter(label: MissionTypeLabel, filter: MissionFilter): boolean {
  return filter === 'all' || label.startsWith(filter);
}

export function campaignCounts(
  worlds: readonly Pick<CampaignWorld, 'missionIds' | 'challengeIds'>[],
): CampaignCounts {
  return {
    worlds: worlds.length,
    missions: worlds.reduce((sum, world) => sum + world.missionIds.length, 0),
    newChallenges: worlds.reduce((sum, world) => sum + world.challengeIds.length, 0),
  };
}
```

**Lo que suman la entrada sin estado y el índice:**

```ts
// frontend/src/entities/campaign/bridge.ts: two lines more
export { CODE_XP, PREDICTION_XP } from './model/rules';
export { missionTypeLabel } from './model/selectors';
export type { MissionTypeLabel } from './model/selectors';

// frontend/src/entities/campaign/index.ts: three blocks more
export { CODE_XP, PASS_SCORE, PREDICTION_XP, WORLD_MAX_SCORE } from './model/rules';
export {
  MISSION_FILTERS,
  campaignCounts,
  matchesMissionFilter,
  missionTypeLabel,
  rankName,
  rankSymbol,
  worldMapStatus,
  worldState,
  worldStateName,
  worldSymbol,
} from './model/selectors';
export type { CampaignCounts, MissionFilter, MissionTypeLabel, WorldState } from './model/selectors';

// frontend/src/entities/exercise/@x/campaign.ts: one line more
export type { ChallengeType } from '../model/types';
```

**Por qué así:**

- `model/rules.ts` no cambia; sólo se reexportan sus constantes. `model/rules.ts` importa `cloneJson` y tipos, así que la entrada sigue sin estado.
- Los selectores reproducen, texto por texto, las expresiones de `campaign.js`:
  - `ranks` y `icons` (líneas 14 a 21);
  - `missionType` (66 a 74);
  - el estado y el rótulo del mapa (91);
  - el filtro (104).
- El `3` de `icons[Math.min(complete, 3)]` es `WORLD_SYMBOLS.length - 1`.

### Tarea 2.1 · Las specs del modelo, en rojo (T006, M)

- **Crea:**
  - `frontend/src/entities/campaign/model/selectors.ts`, con las firmas de §2.0 lanzando `new Error('not implemented')`;
  - `frontend/src/entities/campaign/model/selectors.spec.ts`;
  - `frontend/src/entities/campaign/constants.spec.ts`.
- **Cambia:**
  - `frontend/src/entities/campaign/bridge.spec.ts`, que suma una prueba;
  - `bridge.ts` e `index.ts`, con los exports de §2.0, para que las specs importen por la API pública;
  - `@x/campaign.ts`.
- **Qué prueban.** Los valores, escritos a mano desde `campaign.js` de la base, el README y el contenido:
  - **`selectors.spec.ts`:**
    - `rankName(0)` a `rankName(4)` dan «Explorador», «Aprendiz de sistemas», «Constructor», «Arquitecto» y «Maestro del taller».
    - `rankSymbol(0)` a `rankSymbol(3)` dan «⌘», «◈», «⌁» y «✳», y `rankSymbol(4)` también da «✳».
    - `worldSymbol(0)` a `worldSymbol(3)` dan los mismos cuatro símbolos.
    - `worldState`: «complete» para `{ completed: true, unlocked: true }`, «available» para `{ completed: false, unlocked: true }` y «locked» para `{ completed: false, unlocked: false }`.
    - `worldStateName` da «completado», «disponible» y «bloqueado; ver requisitos».
    - `worldMapStatus`:
      - completado: «Insignia conseguida»;
      - abierto con 45 de 180: «45/180 XP · explorar →»;
      - abierto con 45 de 99: «45/99 XP · explorar →» (sale del mundo, no de un literal);
      - bloqueado: «Bloqueado · ver requisitos».
    - `missionTypeLabel`: «Desafío final» para `boss`, «Reparación · lings» para `repair`, «Kata» para `kata` y «Entrenamiento» para `undefined`.
    - `MISSION_FILTERS` es `['all', 'Entrenamiento', 'Reparación', 'Kata', 'Desafío final']`.
    - `matchesMissionFilter`:
      - es verdadero para («Reparación · lings», «Reparación»), («Entrenamiento», «all») y («Desafío final», «Desafío final»);
      - es falso para («Kata», «Reparación») y («Kata», «Entrenamiento»).
    - `campaignCounts`:
      - dos mundos armados a mano, de seis misiones con tres desafíos cada uno, dan `{ worlds: 2, missions: 12, newChallenges: 6 }`;
      - `[]` da ceros;
      - el catálogo real de Rust y el de Go dan `{ worlds: 4, missions: 24, newChallenges: 12 }` (README, línea 119; `campaign-content-check`, «four worlds / 24 missions / 12 new challenges»). Se lee `build/curriculum.json` (`curriculum.campaign.rust` y `.go`) y `missionIds` se arma en la spec con `[...trainingIds, ...challengeIds]`.
  - **`constants.spec.ts`:**
    - `CODE_XP`, `PREDICTION_XP`, `PASS_SCORE` y `WORLD_MAX_SCORE`, importadas de `'.'`, valen 20, 10, 150 y 180 (README, líneas 130 y 132);
    - `missionTypeLabel('kata')` por el índice da «Kata».
  - **`bridge.spec.ts`:** una prueba más, `it('exposes the mission type and the mission XP without creating any singleton')`. Con `failWhenLoaded()`, `await import('./bridge')` da:
    - `missionTypeLabel('repair')` igual a «Reparación · lings»;
    - `CODE_XP` 20 y `PREDICTION_XP` 10.
- **Pasos:**
  1. `npm run test:unit -- entities/campaign`. Fallan con `not implemented` las de `selectors.spec.ts`, las de `campaignCounts` y la de `missionTypeLabel` del índice y de la entrada. Las constantes pasan: son reexportes de `rules.ts`.
  2. Commit: `test(front): selectores y conteos de la campaña (rojos)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 2.2 · Los selectores (T007, M)

- **Cambia:** `frontend/src/entities/campaign/model/selectors.ts`, con el cuerpo de §2.0.
- **Pasos:**
  1. Implementar.
  2. `npm run test:unit -- entities/campaign` en verde.
  3. `node qa/campaign-check.ts` y `node qa/campaign-content-check.ts`, sin cambios.
  4. `npm run typecheck`, `npm run lint` (ninguna función nueva en los avisos) y `npm run format:check`.
  5. Commit: `feat(front): rango, estado, tipo de misión, filtro y conteos como selectores de la campaña`.
- **Vuelta atrás:** revertí el commit; nadie usa todavía los selectores.

### Tarea 2.3 · El guard respalda la entrada (T008, M)

- **Cambia:** `qa/seams-guard-check.ts`. Son tres escenarios con fuentes virtuales, con los nombres que va a tener el adaptador. `qa/lib/seams-guard.ts` no cambia.
- **Los escenarios:**

  ```ts
  test('the campaign bridges adapter may import the stateless entry and the URL grammar', () => {
    assert.deepEqual(
      findViolations({
        'frontend/src/app/legacy/campaign-bridges.ts': `import { CODE_XP, PREDICTION_XP, campaignLinkAccess, campaignMissionContext, missionTypeLabel } from '../../entities/campaign/bridge';
  import type { CampaignEngine } from '../../entities/campaign';
  import type { ChallengeType } from '../../entities/exercise';
  import { readLinkQuery, worldHref } from '../../shared/config/url-grammar';`,
      }),
      [],
    );
  });

  test('R6: the campaign bridges adapter that imports the selectors module is reported', () => {
    const violations = findViolations({
      'frontend/src/app/legacy/campaign-bridges.ts': `import { missionTypeLabel } from '../../entities/campaign/model/selectors';`,
    });
    assert.deepEqual(rulesOf(violations), ['R6']);
  });

  test('R4: the campaign adapter that imports a selector from the slice index is reported', () => {
    const violations = findViolations({
      'frontend/src/app/legacy/register-campaign.tsx': `import { missionTypeLabel } from '../../entities/campaign';`,
    });
    assert.deepEqual(rulesOf(violations), ['R4']);
  });
  ```

- **Pasos:**
  1. Agregar los escenarios.
  2. `node qa/seams-guard-check.ts`: pasan los de antes, los tres nuevos y el del árbol real (0 violaciones).
  3. **La prueba de que prueban algo:** en una copia descartable, quitar `'entities/campaign/bridge'` de `STATELESS_ENTRIES` en `qa/lib/seams-guard.ts` hace fallar el primer escenario nuevo.
  4. Commit: `test(qa): el adaptador de la campaña sólo usa la entrada sin estado`.
- **Vuelta atrás:** revertí el commit.

### Tarea 2.4 · `.quest-direct-lock` al final de `lab.css` (T009, C)

- **Cambia:**
  - `frontend/campaign.css`: se cortan las cuatro reglas, de `.quest-direct-lock h1 {` a la regla `.quest-direct-lock ul { margin: 25px 0; }`, inclusive (líneas 598 a 615 en `f2b-acum`; ubicarlas por texto);
  - `frontend/lab.css`: se pegan al final, después del bloque `@media (max-width: 650px)` que dejó la unidad 8 de F2b, sin cambiar una declaración ni su orden.
- **Pasos:**
  1. Antes de tocar nada, preparar el worktree de la base de quickstart.md §3 (o reusar el de T001).
  2. Mover las reglas.
  3. `npx prettier --check frontend/lab.css frontend/campaign.css` y `npm run build`.
  4. **Las comparaciones de quickstart.md §3.1:**
     - el multiconjunto, con 0 reglas sólo en la base y 0 sólo en la unidad;
     - el barrido de estilo computado sobre `PAGES=lock,mission,campana` y los seis anchos, con 0 diferencias.

     Si el barrido da diferencias, alguna regla de `atlas.css` pisa la regla movida. Se busca cuál, y nunca se edita una declaración.
  5. `E2E_PORT=4192 npm run test:e2e`: los 123 y, con ellos, R10 de `css-contract` sin editarse.
  6. **La prueba de que la protección detecta algo:** en una copia descartable, borrar las cuatro reglas de `lab.css` sin devolverlas a `campaign.css` hace fallar R10.
  7. Commit: `refactor(front): .quest-direct-lock vive en lab.css, la hoja del laboratorio que lo dibuja`.
- **Compuerta:** los pasos 3 a 6.
- **Vuelta atrás:** revertí el commit; vuelven las dos hojas.

### Tarea 2.5 · La integración de la onda 1 (T010, K)

- **Pasos:**
  1. Integrar en la rama del PR, en este orden:
     - E: T003 a T005;
     - M: T006 a T008;
     - C: T009.
  2. `npm run build`, `npm test`, `npm run lint` (los mismos avisos de T001), `npm run format:check`, `git diff --check` y `E2E_PORT=4173 npm run test:e2e`:
     - los 123 de antes;
     - las 21 de `campaign.spec.ts`;
     - en verde, contra el legacy.
  3. El script del dist puede cambiar por los exports nuevos del índice, que están en el bundle aunque nadie los use todavía. El marcado no cambia, y el `<style>` cambia de orden con el multiconjunto igual.
- **Compuerta:** el paso 2. Es S1.

## 3. Unidad 3 · La página, sin montar (dueño P, onda 2)

**Cubre:**

- **Requisitos:** FR-007 a FR-022, FR-024, FR-028, FR-030 a FR-032, FR-037 y FR-042.
- **Criterios:** SC-006, SC-007 y SC-009.
- **Historias:** US1, US4 y US6 (escenario 1).

**Entrega:** `frontend/src/pages/campaign/`, con su sesión, sus trece componentes y sus specs. Nadie la monta todavía: el legacy sigue dibujando la campaña.

### 3.0 Contratos de la unidad 3

Firmas completas en [contracts/campaign-interfaces.md](./contracts/campaign-interfaces.md) §3.

```ts
// frontend/src/pages/campaign/model/types.ts
import type { ChallengeType } from '../../../entities/exercise';

export interface MissionContent {
  title: string;
  objective: string;
  challengeType?: ChallengeType;
}

// frontend/src/pages/campaign/model/campaign-session.ts
import type { DerivedWorld, MissionFilter } from '../../../entities/campaign';

export interface CampaignSession {
  selected: string | null;
  filter: MissionFilter;
}

export const createCampaignSession = (): CampaignSession => ({ selected: null, filter: 'all' });

export const selectWorld = (session: CampaignSession, worldId: string): CampaignSession => ({
  ...session,
  selected: worldId,
  filter: 'all',
});

export const setMissionFilter = (session: CampaignSession, filter: MissionFilter): CampaignSession => ({
  ...session,
  filter,
});

export function resolveSelectedWorld(
  worlds: readonly Pick<DerivedWorld, 'id' | 'unlocked' | 'completed'>[],
  remembered: string | null,
  linked: string | null,
): string | null {
  let selected = remembered;
  if (worlds.some((world) => world.id === linked)) selected = linked;
  if (!worlds.some((world) => world.id === selected))
    selected = (worlds.find((world) => world.unlocked && !world.completed) ?? worlds[0])?.id ?? null;
  return selected;
}

// frontend/src/pages/campaign/model/open-campaign-session.ts
import { campaignEngine, type CampaignLanguage } from '../../../entities/campaign';
import { resolveSelectedWorld, type CampaignSession } from './campaign-session';

export function openCampaignSession(
  session: CampaignSession,
  language: CampaignLanguage,
  linkedWorldId: string | null,
): CampaignSession {
  return {
    ...session,
    selected: resolveSelectedWorld(campaignEngine.getWorlds(language), session.selected, linkedWorldId),
  };
}

// frontend/src/pages/campaign/index.ts
export { default as CampaignPage } from './ui/CampaignPage';
export { createCampaignSession, type CampaignSession } from './model/campaign-session';
export { openCampaignSession } from './model/open-campaign-session';
export type { MissionContent } from './model/types';
```

`resolveSelectedWorld` es `campaign.js:mount` (líneas 53 a 57), con `null` donde el legacy dejaba `undefined`.

### 3.1 Las reglas de fidelidad del marcado

La comparación de T018 compara el DOM nodo por nodo. Para que dé 0:

1. **El árbol es el del legacy,** sin envoltorios. La página devuelve un fragmento con, en orden:
   - `section.quest-hero`;
   - la nota de almacenamiento, si corresponde;
   - `div.quest-mode-note`;
   - `nav.quest-map`;
   - `section.quest-world`;
   - `section.quest-trophy-case`;
   - `details.quest-rules`.

   Es el `innerHTML` de `campaign.js:render` (líneas 89 a 96).
2. **Cada `className` copia la expresión del legacy como plantilla,** con sus espacios. No se usa `clsx` ni `filter(Boolean)`:
   - `world-node ${state} ${selected ? 'selected' : ''}`;
   - `quest-mission ${boss ? 'is-boss' : ''} ${mastered ? 'is-mastered' : ''} ${!mission.allowed ? 'is-locked' : ''}`;
   - `quest-badge ${world.completed ? 'earned' : ''}`;
   - `button small ${boss ? '' : 'secondary'}`;
   - `className=""` en los sellos sin ganar y en las opciones sin elegir, porque el legacy escribe `class=""`.
3. **Ningún atributo nuevo:**
   - sin `type="button"` ni `data-*`;
   - `tabIndex={-1}` sólo en el título del mundo;
   - `aria-pressed` con un booleano (React escribe `"true"` o `"false"`);
   - `<progress value max>` con números.
4. **Los espacios:**
   - donde el legacy pone un espacio entre una etiqueta y un texto, el JSX lo pone en la misma línea (`<span className="eyebrow-line" /> CAMPAÑA · {…}`, `</strong> Cada mundo…`, `</strong> {world.checkpointFeedback}`) o con `{' '}` si Prettier parte la línea;
   - el `<br />` del título va entre «El próximo nivel» y «lo », en líneas separadas.
5. **La identidad de los nodos (X1, X2 y C2):**
   - `key={world.id}` en los nodos del mapa y en las insignias, `key={mission.id}` en las tarjetas, `key={index}` en las opciones, los motivos, los conceptos y la guía;
   - cada bloque condicional ocupa una sola posición entre sus hermanos (un ternario o un componente que devuelve `null`), así que los hermanos conservan su nodo.
6. **Los textos se copian de `campaign.js` de la base,** carácter por carácter. Los largos son la portada, la nota, la vitrina, las reglas y la honestidad (líneas 89 a 96). Cada número de la lista de FR-030 sale de una constante, de un conteo o del mundo derivado.

### Tarea 3.1 · La sesión, en rojo (T011, P)

- **Crea:**
  - `frontend/src/pages/campaign/model/types.ts`;
  - `campaign-session.ts` y `open-campaign-session.ts`, con las firmas de §3.0 lanzando `new Error('not implemented')`;
  - `index.ts`, con `CampaignPage` como un componente que lanza `not implemented` en `ui/CampaignPage.tsx`;
  - las specs `model/campaign-session.spec.ts` y `model/open-campaign-session.spec.ts`.
- **Qué prueban:**
  - **`createCampaignSession()`** es `{ selected: null, filter: 'all' }`.
  - **`selectWorld({ selected: 'a', filter: 'Kata' }, 'b')`** es `{ selected: 'b', filter: 'all' }`, y no modifica la sesión que recibe.
  - **`setMissionFilter({ selected: 'a', filter: 'all' }, 'Kata')`** es `{ selected: 'a', filter: 'Kata' }`.
  - **`resolveSelectedWorld`,** con mundos armados a mano: A completo, B abierto y sin completar, C bloqueado.
    - un enlace a C elige C, aunque esté recordado A;
    - un enlace desconocido (`'nada'`) con A recordado deja A;
    - sin enlace y con un recordado de otro idioma (`'go-world-1'`) elige B;
    - sin enlace ni recordado elige B;
    - si todos están completos o bloqueados, elige el primero;
    - sin mundos da `null`.
  - **`openCampaignSession`.** Abre el motor real con un catálogo armado a mano y un `localStorage` en memoria (`vi.stubGlobal`, como `create-campaign-engine.subscription.spec.ts`):
    - en Rust, sin enlace, elige `rust-world-1`;
    - con el enlace `go-world-1` en Rust, no lo elige;
    - en Go, con el recordado `rust-world-1`, elige `go-world-1`;
    - el filtro recibido se conserva;
    - el almacenamiento no recibe ninguna escritura.
- **Pasos:**
  1. `npm run test:unit -- pages/campaign`: fallan con `not implemented`.
  2. Commit: `test(front): la sesión de la campaña (roja)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 3.2 · La sesión (T012, P)

- **Cambia:** `campaign-session.ts` y `open-campaign-session.ts`, con el cuerpo de §3.0.
- **Pasos:**
  1. Implementar.
  2. Correr la spec en verde, más `npm run typecheck` y `npm run lint`.
  3. Commit: `feat(front): la sesión de la campaña recuerda el mundo y el filtro`.
- **Vuelta atrás:** revertí el commit.

### Tarea 3.3 · Las specs de la página, en rojo (T013, P)

- **Requiere:** el arnés (S0).
- **Crea:**
  - `frontend/src/entities/campaign/model/campaign-config.factory.ts`;
  - `frontend/src/pages/campaign/model/mission-content.factory.ts`;
  - `frontend/src/pages/campaign/ui/campaign-page-harness.tsx`;
  - las cuatro specs de abajo.

  `CampaignPage` sigue lanzando `not implemented`.
- **Las fábricas.** Con fishery 2.4.0 y textos sin números, para la spec de las constantes. Los ids van de `rust-201` en adelante, para que ninguno sea `10`, `20` ni `30`.

  ```ts
  // frontend/src/entities/campaign/model/campaign-config.factory.ts
  import { Factory } from 'fishery';
  import type { CampaignConfig, CampaignExercise, CampaignLanguage, CampaignWorldDefinition } from './types';

  interface ExerciseParams {
    language: CampaignLanguage;
  }

  interface WorldParams {
    language: CampaignLanguage;
    missionIds: readonly string[];
  }

  export const campaignExerciseFactory = Factory.define<CampaignExercise, ExerciseParams>(
    ({ sequence, transientParams }) => {
      const language = transientParams.language ?? 'rust';
      return {
        id: `${language}-${200 + sequence}`,
        language,
        title: 'Misión armada a mano',
        tests: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
      };
    },
  );

  export const campaignWorldFactory = Factory.define<CampaignWorldDefinition, WorldParams>(
    ({ sequence, transientParams }) => {
      const language = transientParams.language ?? 'rust';
      const ids = transientParams.missionIds ?? [];
      return {
        id: `${language}-world-${sequence}`,
        level: 'beginner',
        title: 'Mundo armado a mano',
        badge: 'Insignia armada',
        subtitle: 'Un subtítulo.',
        story: 'Una historia.',
        concepts: ['Un concepto'],
        why: 'Un porqué.',
        guide: ['Un paso.', 'Otro paso.', 'El último paso.'],
        trainingIds: ids.slice(0, 3),
        challengeIds: ids.slice(3, 6),
        bossId: ids[5] ?? '',
        checkpoint: {
          question: '¿Por qué?',
          options: ['Por una regla', 'Por azar', 'Por costumbre'],
          answer: 0,
          explanation: 'La regla sostiene el contrato.',
        },
      };
    },
  );

  export function handMadeCampaign(worldsPerLanguage: Readonly<Record<CampaignLanguage, number>>): CampaignConfig {
    campaignExerciseFactory.rewindSequence();
    campaignWorldFactory.rewindSequence();
    const exercises: CampaignExercise[] = [];
    const worlds: Record<CampaignLanguage, CampaignWorldDefinition[]> = { rust: [], go: [] };
    for (const language of ['rust', 'go'] as const) {
      for (let world = 0; world < worldsPerLanguage[language]; world += 1) {
        const missions = campaignExerciseFactory.buildList(6, {}, { transient: { language } });
        exercises.push(...missions);
        worlds[language].push(
          campaignWorldFactory.build({}, { transient: { language, missionIds: missions.map((m) => m.id) } }),
        );
      }
    }
    return { exercises, worlds };
  }

  // frontend/src/pages/campaign/model/mission-content.factory.ts
  import { Factory } from 'fishery';
  import type { CampaignConfig } from '../../../entities/campaign';
  import type { MissionContent } from './types';

  export const missionContentFactory = Factory.define<MissionContent>(() => ({
    title: 'Misión armada a mano',
    objective: 'Un objetivo sin números.',
  }));

  const CHALLENGE_TYPES = ['repair', 'kata', 'boss'] as const;

  export function missionContentFor(config: CampaignConfig, language: 'rust' | 'go'): Map<string, MissionContent> {
    const worlds = Array.isArray(config.worlds) ? config.worlds : config.worlds[language];
    const content = new Map<string, MissionContent>();
    for (const world of worlds) {
      for (const id of world.trainingIds) content.set(id, missionContentFactory.build());
      world.challengeIds.forEach((id, index) =>
        content.set(id, missionContentFactory.build({ challengeType: CHALLENGE_TYPES[index] })),
      );
    }
    return content;
  }
  ```

  La validación del motor exige tres entrenamientos, tres desafíos y el jefe en `challengeIds[2]`. Por eso las misiones van de seis en seis y el tipo sale de la posición (README).
- **El arnés de las specs de la página** (`campaign-page-harness.tsx`). No es una spec: lo consumen las cuatro, y ninguna fuente de producción lo importa.

  ```tsx
  import { render } from '@testing-library/react';
  import { userEvent } from '@testing-library/user-event';
  import { vi } from 'vitest';
  import curriculum from '../../../../../build/curriculum.json';
  import { campaignEngine, type CampaignConfig, type CampaignLabState, type CampaignLanguage } from '../../../entities/campaign';
  import type { StorageLike } from '../../../shared/lib/versioned-storage';
  import { createCampaignSession, type CampaignSession } from '../model/campaign-session';
  import { openCampaignSession } from '../model/open-campaign-session';
  import type { MissionContent } from '../model/types';
  import CampaignPage from './CampaignPage';

  export interface RecordingStorage extends StorageLike {
    items: Map<string, string>;
    writes: string[];
    failWrites: boolean;
  }

  export function memoryStorage(initial: Record<string, string> = {}): RecordingStorage {
    const storage: RecordingStorage = {
      items: new Map(Object.entries(initial)),
      writes: [],
      failWrites: false,
      getItem: (key) => storage.items.get(key) ?? null,
      setItem(key, value) {
        if (storage.failWrites) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        storage.writes.push(key);
        storage.items.set(key, value);
      },
      removeItem(key) {
        storage.writes.push(key);
        storage.items.delete(key);
      },
    };
    return storage;
  }

  export function realCampaign(): CampaignConfig {
    return {
      exercises: [
        ...curriculum.lab.rust, ...curriculum.quests.rust, ...curriculum.lab.go, ...curriculum.quests.go,
        ...curriculum.cores.lowlevel, ...curriculum.cores.infra, ...curriculum.cores.play, ...curriculum.cores.pc,
      ],
      worlds: curriculum.campaign,
    } as CampaignConfig;
  }

  export function realMissions(language: CampaignLanguage): Map<string, MissionContent> {
    return new Map(
      [...curriculum.lab[language], ...curriculum.quests[language]].map((exercise) => [
        exercise.id,
        { title: exercise.title, objective: exercise.objective, challengeType: exercise.challengeType },
      ]),
    ) as Map<string, MissionContent>;
  }

  export interface CampaignPageSetup {
    config: CampaignConfig;
    missions: ReadonlyMap<string, MissionContent>;
    language?: CampaignLanguage;
    stored?: Record<string, string>;
    labState?: CampaignLabState | null;
    session?: CampaignSession;
    linkedWorldId?: string | null;
  }

  export function renderCampaignPage(setup: CampaignPageSetup) {
    const storage = memoryStorage(setup.stored);
    vi.stubGlobal('localStorage', storage);
    campaignEngine.init(setup.config, setup.labState ?? null);
    const language = setup.language ?? 'rust';
    const notify = vi.fn<(message: string) => void>();
    const onSessionChange = vi.fn<(session: CampaignSession) => void>();
    const initialSession = openCampaignSession(setup.session ?? createCampaignSession(), language, setup.linkedWorldId ?? null);
    const user = userEvent.setup();
    const view = render(
      <CampaignPage language={language} missions={setup.missions} initialSession={initialSession} notify={notify} onSessionChange={onSessionChange} />,
    );
    return { ...view, user, storage, notify, onSessionChange };
  }
  ```

  Cada spec de la página:
  - declara `vi.mock(import('../../../shared/lib/celebration'), () => ({ celebrate: vi.fn(), stop: vi.fn() }))`;
  - en `beforeEach` define `Element.prototype.scrollIntoView = vi.fn()` y `window.matchMedia`, que jsdom no trae (research.md, Context7);
  - en `afterEach` llama `vi.unstubAllGlobals()` y `vi.restoreAllMocks()`.
- **`CampaignPage.spec.tsx`.** Con el catálogo real (`realCampaign()`, `realMissions(…)`); consultas por rol y nombre; `await` en cada interacción.

  | # | Prueba | Siembra | Valores esperados, escritos a mano |
  | --- | --- | --- | --- |
  | 1 | `shows the hero, the rank and the map of an empty browser` | nada | «CAMPAÑA · RUST»; «4 mundos», «24 misiones», «12 desafíos nuevos»; «Explorador», «0 / 720 XP de campaña», «0 de 4 insignias»; los cuatro botones del mapa con los nombres de T004 (a) y `aria-pressed` `true` sólo en el primero; la región «Estación del robot» |
  | 2 | `with the progress of master selects world 2 and counts one badge` | `stored` con la clave de campaña de `progress-master-2a278ad-storage.json`, `labState` con su laboratorio | «Aprendiz de sistemas», «180 / 720 XP de campaña», «1 de 4 insignias», la región «Puerto de señales» |
  | 3 | `in Go shows the Go campaign` | `language: 'go'` | «CAMPAÑA · GO» y la región «La estación del rover» |
  | 4 | `choosing a world rewrites ?mundo= in place, scrolls without animation and focuses its title` | nada; antes del `render`, `history.replaceState(null, '', '/?mundo=rust-world-1&x=1#campana')` y `vi.spyOn(history, 'replaceState')` | clic en «Mundo 2: …»:<br>• `replaceState` con `(null, '', url)` y `url.href` que termina en `/?mundo=rust-world-2#campana`<br>• `scrollIntoView` una vez, sobre `#quest-world`, con `{ block: 'start', behavior: 'instant' }`, y después del `replaceState` (`mock.invocationCallOrder`)<br>• el `heading` «Puerto de señales» con el foco<br>• el último `onSessionChange` con `{ selected: 'rust-world-2', filter: 'all' }` |
  | 5 | `filtering shows the missions of the type and keeps the focus on the button` | la de la prueba 2 | clic en «Kata»: un solo `article`, con el título de `rust-105`; el botón con `aria-pressed` `true` y el foco; el último `onSessionChange` con `filter: 'Kata'` |
  | 6 | `choosing another world resets the filter` | la de la prueba 2 | «Kata» y después «Mundo 1: …»: «Todas» con `aria-pressed` `true` |
  | 7 | `answering wrong marks the option, keeps the focus and writes once` | `labState` con el laboratorio de master, sin clave de campaña | clic en la opción A:<br>• `aria-pressed` `true`, la clase `incorrect` y el foco<br>• el `status` del checkpoint con «Revisemos esa idea.»<br>• `notify` con «Leé el porqué y probá otra explicación.»<br>• `storage.writes` igual a `['taller-campaign-v1']`<br>• `celebrate` sin llamar |
  | 8 | `answering right completes the world and celebrates once` | la de la prueba 7 | clic en B:<br>• `notify` con «¡Piloto de estados! Un mundo completado. Tu próximo nivel está disponible.»<br>• `celebrate` una vez<br>• un `status` con «Insignia conseguida: Piloto de estados»<br>• el botón «Siguiente mundo →» |
  | 9 | `the feedback region is the same node after answering` (X2) | la de la prueba 7 | el nodo que dice «Elegí la explicación que mejor sostenga tu decisión.» es `toBe` el mismo `status` después del clic en A |
  | 10 | `the rules and a mission's requirements stay open after an action` (X1) | nada | abrir «Las reglas del juego…» y «Ver qué falta para entrar» del jefe; clic en «Desafío final» y en «Mundo 1: …»: los dos `<details>` siguen con `open` `true` |
  | 11 | `opening, choosing a world and filtering write nothing` | nada | `storage.writes` es `[]` después del `render`, de elegir el mundo 2 y de volver al 1 y filtrar «Kata» |
  | 12 | `redraws when the engine accepts a checkpoint without the page asking` (FR-022) | la de la prueba 7 | `act(() => { campaignEngine.answerCheckpoint('rust-world-1', 1); })`: «Bien razonado.» en el `status` |
  | 13 | `a blocked storage shows the notice` | un `localStorage` cuyo `getItem` lanza `new DOMException('Storage is blocked', 'SecurityError')` | el `status` «Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.» |
  | 14 | `a storage that fails after opening shows the notice on the next draw` (Review Focus 2) | la de la prueba 7; después del `render`, `storage.failWrites = true` | clic en B: «Bien razonado.» y la nota de almacenamiento |
  | 15 | `a copy saved by another tab is merged when answering` (Review Focus 3) | la de la prueba 7; después del `render`, `storage.items.set('taller-campaign-v1', '{"version":1,"seals":{"rust-18":{"code":true,"prediction":false,"assisted":false}},"checkpoints":{}}')` | clic en B y en «Mundo 2: …»: la tarjeta de `rust-18` dice «✓ Pruebas · 20» |
  | 16 | `a rejected answer only announces the reasons` (Review Focus 5) | la de la prueba 7; `vi.spyOn(campaignEngine, 'answerCheckpoint').mockReturnValueOnce({ accepted: false, correct: false, passed: false, explanation: '', reasons: ['Primero A.', 'Después B.'] })` | clic en A:<br>• `notify` con «Primero A. Después B.»<br>• A con `aria-pressed` `false`<br>• el `status` con «Elegí la explicación que mejor sostenga tu decisión.»<br>• `celebrate` sin llamar |
  | 17 | `a language without worlds shows the empty message` | `config` con `worlds: { rust: [], go: curriculum.campaign.go }` | sólo el párrafo «La campaña todavía no tiene mundos disponibles.» |

- **`CampaignPage.catalog.spec.tsx`.** Con `handMadeCampaign` y `missionContentFor`.

  | Prueba | Siembra | Valores esperados |
  | --- | --- | --- |
  | `five worlds show their own counts` | `handMadeCampaign({ rust: 5, go: 1 })` | «5 mundos», «30 misiones», «15 desafíos nuevos», «0 de 5 insignias», «0 / 900 XP de campaña» (5 × 180, README línea 132). No se afirma nada del quinto símbolo (research.md R16) |
  | `a title with HTML characters is shown as text` (Review Focus 1) | `handMadeCampaign({ rust: 1, go: 1 })`, con `title: 'Mundo <raro> & "citado"'` en el primer mundo de Rust | el `heading` de nivel 2 con ese texto literal; el botón «Mundo 1: Mundo <raro> & "citado", disponible» |
  | `a filter without missions leaves the grid empty` (Review Focus 4) | `handMadeCampaign({ rust: 1, go: 1 })`, con el contenido del segundo desafío cambiado a `challengeType: 'repair'` | clic en «Kata»: `.quest-missions` sin `article` y «Kata» con `aria-pressed` `true` |

- **`CampaignPage.constants.spec.tsx`** (research.md R6).

  ```ts
  vi.mock(import('../../../entities/campaign'), async (importOriginal) => ({
    ...(await importOriginal()),
    CODE_XP: 7,
    PREDICTION_XP: 4,
    PASS_SCORE: 77,
    WORLD_MAX_SCORE: 99,
  }));
  ```

  En `beforeEach` se envuelven el motor y el resumen:

  ```ts
  const getWorlds = campaignEngine.getWorlds.bind(campaignEngine);
  vi.spyOn(campaignEngine, 'getWorlds').mockImplementation((language) =>
    getWorlds(language).map((world) => ({ ...world, maxScore: 99 })),
  );
  const getSummary = campaignEngine.getSummary.bind(campaignEngine);
  vi.spyOn(campaignEngine, 'getSummary').mockImplementation((language) => ({ ...getSummary(language), maxScore: 396 }));
  ```

  La siembra es `handMadeCampaign({ rust: 4, go: 1 })`, en blanco. Una sola prueba, `it('shows every XP number from the constants and the derived worlds')`:
  - **Lo que se espera ver:**
    - cada tarjeta dice «0/11 XP», «○ Pruebas · 7» y «○ Predicción · 4»;
    - el mapa dice «0/99 XP · explorar →» en el mundo 1;
    - el mundo, «0/ 99 XP»;
    - cada barra del mapa tiene `max` «99», y la de la campaña, «396»;
    - el rango dice «0 / 396 XP de campaña»;
    - la nota dice «al reunir 77 XP» y el checkpoint cerrado, «reunir 77 XP»;
    - las reglas, abiertas, dicen «7 XP por las pruebas del ejercicio y 4 por su predicción correcta.».
  - **Lo que no queda:** sobre un clon de `container` sin sus `li` (los motivos los escribe el motor, que F6 no toca), ni el texto ni ningún valor de atributo contiene `/(?<!\d)(?:20|10|30|150|180|720)(?!\d)/`.
- **`CampaignPage.editorial.spec.tsx`** (research.md R7). Con el catálogo real.
  1. En un navegador vacío, busca en la página:
     - «Seis misiones para conectar las piezas.»;
     - el párrafo de la nota que contiene «verificar sus seis misiones»;
     - el del checkpoint cerrado que contiene «Se abre al verificar las seis misiones».
  2. Con la clave de campaña sembrada con todos los sellos de Rust y los checkpoints `rust-world-1` a `rust-world-3` superados, responde bien el del mundo 4. La respuesta es `curriculum.campaign.rust[3].checkpoint.answer`. Se espera un `notify` que contenga «Completaste los cuatro mundos.».
  3. Compara con el catálogo real: `{ seis: 6, cuatro: 4 }` contra:
     - `trainingIds.length + challengeIds.length` de cada mundo de los dos lenguajes;
     - la cantidad de mundos de cada lenguaje.
  4. Los mensajes de falla:
     - si falta una frase: «La frase «<frase>» ya no está en la página»;
     - si un conteo no coincide: «La frase «<frase>» dice «<palabra>» y <mundo o lenguaje> tiene <N>: editala en <archivo>», con los archivos `ui/OpenWorld.tsx`, `ui/CampaignPage.tsx` (la nota y el aviso) y `ui/WorldCheckpoint.tsx`.
- **Pasos:**
  1. Escribir las fábricas, el arnés y las cuatro specs.
  2. `npm run test:unit -- pages/campaign`: las de la página fallan con `not implemented`. Las de la sesión siguen en verde.
  3. `npm run typecheck` y `npm run lint` (la guarda de `useStore` incluida).
  4. Commit: `test(front): specs de la página de la campaña (rojas)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 3.4 · La página (T014, P)

- **Cambia:** `ui/CampaignPage.tsx`.
- **Crea:** los otros doce componentes de `ui/`. Cada uno es un `const` con nombre, con `interface` para sus props y `export default` al final.
- **La raíz**, completa:

  ```tsx
  import { useRef, useState } from 'react';
  import { flushSync } from 'react-dom';
  import { useStore } from 'zustand';
  import {
    PASS_SCORE,
    campaignCounts,
    campaignEngine,
    type CampaignLanguage,
    type CheckpointAnswerResult,
    type MissionFilter,
  } from '../../../entities/campaign';
  import { FREE_LAB_HREF, withWorldQuery } from '../../../shared/config/url-grammar';
  import { celebrate } from '../../../shared/lib/celebration';
  import { selectWorld, setMissionFilter, type CampaignSession } from '../model/campaign-session';
  import type { MissionContent } from '../model/types';
  import CampaignHero from './CampaignHero';
  import CampaignRules from './CampaignRules';
  import LockedWorld from './LockedWorld';
  import OpenWorld from './OpenWorld';
  import SelectedWorld from './SelectedWorld';
  import TrophyCase from './TrophyCase';
  import WorldMap from './WorldMap';

  interface CampaignPageProps {
    language: CampaignLanguage;
    missions: ReadonlyMap<string, MissionContent>;
    initialSession: CampaignSession;
    notify: (message: string) => void;
    onSessionChange: (session: CampaignSession) => void;
  }

  const selectRevision = (state: { revision: number }) => state.revision;

  const CampaignPage = ({ language, missions, initialSession, notify, onSessionChange }: CampaignPageProps) => {
    useStore(campaignEngine.changes, selectRevision);
    const [session, setSession] = useState(initialSession);
    const latestSession = useRef(initialSession);
    const worldSectionRef = useRef<HTMLElement>(null);
    const worldTitleRef = useRef<HTMLHeadingElement>(null);
    const worlds = campaignEngine.getWorlds(language);
    const summary = campaignEngine.getSummary(language);
    const world = worlds.find((item) => item.id === session.selected) ?? worlds[0];

    const updateSession = (change: (current: CampaignSession) => CampaignSession) => {
      const next = change(latestSession.current);
      latestSession.current = next;
      onSessionChange(next);
      setSession(next);
    };

    const chooseWorld = (worldId: string) => {
      history.replaceState(null, '', withWorldQuery(new URL(location.href), worldId));
      flushSync(() => updateSession((current) => selectWorld(current, worldId)));
      worldSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      worldTitleRef.current?.focus({ preventScroll: true });
    };

    const chooseFilter = (filter: MissionFilter, button: HTMLButtonElement) => {
      flushSync(() => updateSession((current) => setMissionFilter(current, filter)));
      button.focus({ preventScroll: true });
    };

    const answerCheckpoint = (worldId: string, index: number, option: HTMLButtonElement) => {
      const before = campaignEngine.getWorlds(language).find((item) => item.id === worldId);
      let result!: CheckpointAnswerResult;
      flushSync(() => {
        result = campaignEngine.answerCheckpoint(worldId, index);
      });
      if (!result.accepted) {
        notify(result.reasons.join(' '));
        return;
      }
      option.focus({ preventScroll: true });
      const after = campaignEngine.getWorlds(language).find((item) => item.id === worldId);
      if (!before?.completed && after?.completed) {
        celebrate();
        const finished =
          campaignEngine.getSummary(language).completedWorlds === campaignEngine.getWorlds(language).length;
        notify(
          `¡${after.badge}! ${finished ? 'Completaste los cuatro mundos. Es hora de llevarlo a tu proyecto.' : 'Un mundo completado. Tu próximo nivel está disponible.'}`,
        );
      } else
        notify(
          result.correct
            ? 'Checkpoint superado. Tu explicación conecta las piezas.'
            : 'Leé el porqué y probá otra explicación.',
        );
    };

    if (!world) return <p>La campaña todavía no tiene mundos disponibles.</p>;

    const completed = worlds.filter((item) => item.completed).length;
    const previous = worlds.find((item) => item.unlocked && !item.completed);
    const nextWorld = worlds[worlds.findIndex((item) => item.id === world.id) + 1];
    return (
      <>
        <CampaignHero language={language} counts={campaignCounts(worlds)} summary={summary} completed={completed} />
        {summary.storageAvailable === false ? (
          <p className="quest-mode-note" role="status">
            Este navegador no pudo guardar tu campaña. Exportá tu progreso antes de cerrar la página.
          </p>
        ) : null}
        <div className="quest-mode-note">
          <span aria-hidden="true">↗</span>
          <p>
            <strong>Una ruta con propósito.</strong> Cada mundo abre el siguiente al reunir {PASS_SCORE} XP,
            verificar sus seis misiones, resolver la predicción final y superar su checkpoint. Tu{' '}
            <a href={FREE_LAB_HREF}>laboratorio libre</a> sigue disponible.
          </p>
        </div>
        <WorldMap worlds={worlds} selectedId={world.id} onChoose={chooseWorld} />
        <SelectedWorld world={world} sectionRef={worldSectionRef} titleRef={worldTitleRef}>
          {world.unlocked ? (
            <OpenWorld
              world={world}
              nextWorld={nextWorld}
              missions={missions}
              filter={session.filter}
              onChooseWorld={chooseWorld}
              onFilter={chooseFilter}
              onAnswer={answerCheckpoint}
            />
          ) : (
            <LockedWorld world={world} previous={previous} onChoose={chooseWorld} />
          )}
        </SelectedWorld>
        <TrophyCase worlds={worlds} />
        <CampaignRules />
      </>
    );
  };

  export default CampaignPage;
  ```

- **Los doce componentes.** Cada uno porta su línea de `campaign.js` con las reglas de §3.1:

  | Componente | Props | Porta | Notas |
  | --- | --- | --- | --- |
  | `CampaignHero` | `language`, `counts: CampaignCounts`, `summary: CampaignSummary`, `completed: number` | línea 89 | pastillas `{counts.worlds} mundos`, `{counts.missions} misiones` y `{counts.newChallenges} desafíos nuevos`; `rankSymbol(completed)`, `rankName(completed)`; `{summary.score} / {summary.maxScore} XP de campaña`; la barra con `value={summary.score} max={summary.maxScore}`; `{completed} de {counts.worlds} insignias` |
  | `WorldMap` | `worlds`, `selectedId`, `onChoose(worldId)` | línea 91 | el ícono: `world.completed ? '✓' : world.unlocked ? worldSymbol(index) : '◇'`; `MUNDO 0{index + 1} · {LEVEL_LABELS[world.level]}`; `worldMapStatus(world)`; la barra con `max={world.maxScore}`; el nombre accesible `Mundo ${index + 1}: ${world.title}, ${worldStateName(state)}` |
  | `SelectedWorld` | `world`, `sectionRef`, `titleRef`, `children` | líneas 92 a 94 | el rótulo `{LEVEL_LABELS[world.level]} / {STAGE_LABELS[worldState(world)]}`, con `STAGE_LABELS` (`MUNDO COMPLETADO`, `TU EXPEDICIÓN` y `PRÓXIMA FRONTERA`) en el archivo; `{world.score}<small>/ {world.maxScore} XP</small>`; `world.concepts?.map`; `{children}` al final de la sección |
  | `LockedWorld` | `world`, `previous: DerivedWorld \| undefined`, `onChoose` | líneas 98 a 101 | el botón «Volver a {previous.title} →», sólo si hay `previous` |
  | `OpenWorld` | `world`, `nextWorld`, `missions`, `filter`, `onChooseWorld`, `onFilter`, `onAnswer` | líneas 102 a 111 | `world.missions.filter((mission) => matchesMissionFilter(missionTypeLabel(missions.get(mission.id)!.challengeType), filter))`; la guía `<li><span>0{index + 1}</span>{step}</li>`; `<WorldProgress>` en una sola posición; los filtros `MISSION_FILTERS.map(…)` con `aria-pressed={filter === type}` y `onClick={(event) => onFilter(type, event.currentTarget)}`; `<MissionCard key={mission.id}>`; `<WorldCheckpoint>` |
  | `WorldProgress` | `world`, `nextWorld`, `missions`, `onChooseWorld` | líneas 106 a 108 y 112 a 119 | completo: el `status` con «Insignia conseguida: {world.badge}» y «Siguiente mundo →» o el enlace «Llevarlo a mi proyecto ↗» a `#proyecto`; si no: `world.missions.find((mission) => mission.allowed && (!mission.code \|\| !mission.prediction))` y el bloque «TU SIGUIENTE MOVIMIENTO» con `campaignMissionHref(world.id, next.id)`; si no hay ninguno, `null` |
  | `MissionCard` | `world`, `mission: CampaignMission`, `content: MissionContent` | línea 123 | `boss = mission.id === world.bossId`, `mastered = mission.code && mission.prediction`; `{mission.points}/{CODE_XP + PREDICTION_XP} XP`; dos `<MissionSeal>`; «Práctica con solución de apoyo» si `mission.assisted`; `<MissionAction>` |
  | `MissionSeal` | `earned`, `label`, `points` | línea 123 | `<span className={earned ? 'earned' : ''}>{earned ? '✓' : '○'} {label} · {points}</span>` |
  | `MissionAction` | `world`, `mission`, `boss`, `mastered` | línea 123 | sin permiso: `<details className="mission-requirements">` con «Ver qué falta para entrar» y los motivos; con permiso: el enlace `campaignMissionHref(world.id, mission.id)` con «Volver a experimentar», «Enfrentar el desafío final» o «Abrir misión», más ` ↗` |
  | `WorldCheckpoint` | `world`, `onAnswer(worldId, index, option)` | líneas 125 a 129 | la retroalimentación es `{answer === null ? 'Elegí la explicación que mejor sostenga tu decisión.' : <><strong>{…}</strong> {world.checkpointFeedback}</>}`; las opciones con `<span>{String.fromCharCode(65 + index)}</span>{option}`; cerrado: «Se abre al verificar las seis misiones, reunir {PASS_SCORE} XP y resolver la predicción del desafío final.» |
  | `TrophyCase` | `worlds` | línea 95 | `aria-label={`${world.badge}: ${world.completed ? 'conseguida' : 'pendiente'}`}`, el ícono `worldSymbol(index)` |
  | `CampaignRules` | — | línea 96 | «{CODE_XP} XP por las pruebas del ejercicio y {PREDICTION_XP} por su predicción correcta.»; los cuatro enlaces con `target="_blank"` y `rel="noopener noreferrer"`; el resto, copiado |

- **Pasos:**
  1. Implementar componente por componente, hasta que pasen las cuatro specs.
  2. `npm run typecheck` y `npm run lint`: ninguna función nueva pasa de 10, y ninguna llamada a `useStore` va sin selector. Si una función pasa de 10, se parte por un componente con nombre, como `MissionSeal` y `MissionAction`.
  3. `npm run format:check`.
  4. `npm run build`: el script del dist no cambia todavía, porque nadie importa la página.
  5. Commit: `feat(front): la página de la campaña en React, sin montar`.
- **Compuerta:** las cuatro specs y la de la sesión en verde; `npm test` en verde.
- **Vuelta atrás:** revertí el commit; la página no está montada.

## 4. Unidad 4 · El corte (dueños E y A, onda 3)

**Cubre:**

- **Requisitos:** FR-001, FR-003, FR-006, FR-017 a FR-019, FR-021, FR-023 a FR-025, FR-033 a FR-040 y FR-043.
- **Criterios:** SC-002, SC-005, SC-008 y SC-010.
- **Historias:** US2, US3 y US5.

**Entrega:** dos commits.

1. **El rojo:** los cinco E2E de lo que cambia a propósito y la spec del adaptador, sobre firmas que lanzan.
2. **El corte:**
   - los dos adaptadores y su cableado;
   - `startApp()`, `legacy-views.ts` y la hoja;
   - el borrado de `campaign.js`;
   - la adaptación de los checks de `qa/`.

Revertir los dos, primero el corte, devuelve el legacy.

### 4.0 Contratos de la unidad 4

```ts
// frontend/src/app/legacy/campaign-bridges.ts
import type { CampaignEngine, CampaignLabState, RefreshResult, SyncLabResult } from '../../entities/campaign';
import {
  CODE_XP,
  PREDICTION_XP,
  campaignLinkAccess,
  campaignMissionContext,
  missionTypeLabel,
} from '../../entities/campaign/bridge';
import type { ChallengeType } from '../../entities/exercise';
import { readLinkQuery, worldHref } from '../../shared/config/url-grammar';
import { escapeHtml } from '../../shared/lib/escape-html';

interface CampaignLab {
  getExercises(): readonly { id: string; challengeType?: ChallengeType }[];
  exportState(): CampaignLabState;
}

export interface CampaignBridges {
  refresh(): RefreshResult;
  sync(): SyncLabResult;
  returnURL(worldId: string): string;
  exerciseContextHTML(id: string, language: string): string;
  lockedExerciseHTML(id: string, language: string): string;
}

const engine: CampaignEngine = window.TallerCampaignEngine;
const lab = (): CampaignLab => window.TallerLab as unknown as CampaignLab;

function refresh(): RefreshResult {
  return engine.refreshFromLab(lab().exportState());
}

function sync(): SyncLabResult {
  return engine.syncLab(lab().exportState());
}

function exerciseContextHTML(id: string, language: string): string {
  const worldId = readLinkQuery(location.search).missionWorld;
  if (!worldId) return '';
  refresh();
  const context = campaignMissionContext(engine.getWorlds(language), worldId, id);
  if (!context) return '';
  const exercise = lab().getExercises().find((item) => item.id === id);
  return `<div class="quest-lab-context"><a href="${worldHref(context.worldId)}">← ${escapeHtml(context.worldTitle)}</a><span>${context.points}/${CODE_XP + PREDICTION_XP} XP · ${escapeHtml(missionTypeLabel(exercise?.challengeType))}</span><span>${context.code ? '✓' : '○'} Pruebas ${context.prediction ? '✓' : '○'} Predicción</span></div>`;
}

function lockedExerciseHTML(id: string, language: string): string {
  const worldId = readLinkQuery(location.search).missionWorld;
  if (!worldId) return '';
  const access = campaignLinkAccess(engine.getWorlds(language), worldId, id, engine.canAttempt(id, language));
  if (access.allowed) return '';
  return `<section class="quest-direct-lock"><div class="eyebrow">CAMPAÑA · ACCESO A LA MISIÓN</div><h1>Primero, las piezas<br><em>que te preparan.</em></h1><p>Esta misión todavía no está disponible en tu campaña.</p><ul>${access.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul><a class="button" href="${access.worldId ? worldHref(access.worldId) : '#campana'}">Ver mi mapa →</a></section>`;
}

export const campaignBridges: CampaignBridges = {
  refresh,
  sync,
  returnURL: worldHref,
  exerciseContextHTML,
  lockedExerciseHTML,
};
```

```tsx
// frontend/src/app/legacy/register-campaign.tsx
import { createRoot, type Root } from 'react-dom/client';
import type { CampaignLanguage } from '../../entities/campaign';
import {
  CampaignPage,
  createCampaignSession,
  openCampaignSession,
  type CampaignSession,
  type MissionContent,
} from '../../pages/campaign';
import { readLinkQuery } from '../../shared/config/url-grammar';
import { stop } from '../../shared/lib/celebration';
import { getContent, type Content } from '../content/content';
import { campaignBridges, type CampaignBridges } from './campaign-bridges';

declare global {
  interface Window {
    TallerCampaign: Readonly<CampaignBridges & { mount: typeof mount; unmount: typeof unmount }>;
  }
}

let session: CampaignSession = createCampaignSession();
let root: Root | null = null;

function missionContentFor(content: Content, language: CampaignLanguage): Map<string, MissionContent> {
  return new Map(
    [...content.lab[language], ...content.quests[language]].map((exercise) => [
      exercise.id,
      { title: exercise.title, objective: exercise.objective, challengeType: exercise.challengeType },
    ]),
  );
}

function unmount(): void {
  root?.unmount();
  root = null;
  stop();
}

function mount(host: HTMLElement | null, requestedLanguage: string, notify: (message: string) => void): void {
  unmount();
  if (!host) return;
  const language: CampaignLanguage = requestedLanguage === 'go' ? 'go' : 'rust';
  campaignBridges.refresh();
  session = openCampaignSession(session, language, readLinkQuery(location.search).world);
  root = createRoot(host, {
    onUncaughtError(error) {
      console.error('No se pudo mostrar la campaña.', error);
    },
  });
  root.render(
    <CampaignPage
      language={language}
      missions={missionContentFor(getContent(), language)}
      initialSession={session}
      notify={notify}
      onSessionChange={(next) => {
        session = next;
      }}
    />,
  );
}

window.TallerCampaign = Object.freeze({ mount, unmount, ...campaignBridges });
```

**Lo que conservan de `campaign.js`:**

- **Los puentes** son `campaign.js` líneas 41 a 47 y 171 a 190, con `missionType(itemFor(id))` cambiado por `missionTypeLabel(…)` y el `30` por `CODE_XP + PREDICTION_XP`. Conservan el orden de efectos: el contexto llama `refresh()` después de leer el enlace y antes de `getWorlds`; el bloqueo no refresca.
- **El montaje** repite el de `campaign.js:mount` (líneas 48 a 60):
  1. `refresh()`;
  2. leer `?mundo=` una vez, sin reescribir la URL;
  3. resolver el mundo;
  4. dibujar.
- **`unmount`** repite el de la línea 61: `stop()` siempre (research.md R10).

### Tarea 4.1 · El commit rojo (T015, E y A en una sola rama)

- **E crea `qa/e2e/specs/campaign-kept-state.spec.ts`,** el flujo (p). Cinco pruebas que fallan contra el legacy porque `innerHTML` recrea el nodo:

  ```ts
  import { expect, test } from '../fixtures';
  import { curriculumIds, frozenProgress } from '../lib/curriculum';
  import { urls } from '../lib/urls';

  interface MarkedNode {
    __f6Marker?: true;
  }

  const LAB_ONLY = { 'taller-laboratorio-v1': frozenProgress['taller-laboratorio-v1'] };
  const BOSS = curriculumIds.exercises['rust-103'].title;

  test.describe('what the page keeps that the legacy rebuilt (X1, X2 and C2)', () => {
    test('the rules stay open after choosing a world, filtering and answering', async ({ shell, campaign, storage }) => {
      await storage.seed(LAB_ONLY);
      await shell.goto(urls.view('campana'));
      await campaign.rulesSummary().click();

      await campaign.worldNode(1).click();
      await expect(campaign.rules()).toHaveJSProperty('open', true);
      await campaign.filter('Kata').click();
      await expect(campaign.rules()).toHaveJSProperty('open', true);
      await campaign.filter('Todas').click();
      await campaign.checkpointOption('B').click();
      await expect(campaign.rules()).toHaveJSProperty('open', true);
    });

    test('the requirements of a locked mission stay open after filtering', async ({ shell, campaign }) => {
      await shell.goto(urls.view('campana'));
      await campaign.missionCard(BOSS).getByText('Ver qué falta para entrar').click();

      await campaign.filter('Desafío final').click();

      await expect(campaign.missionRequirements(BOSS)).toHaveJSProperty('open', true);
    });

    test('the focused filter is the same node after filtering with the keyboard', async ({ shell, campaign }) => {
      await shell.goto(urls.view('campana'));
      const kata = campaign.filter('Kata');
      await kata.focus();
      await kata.evaluate((node) => {
        (node as MarkedNode).__f6Marker = true;
      });

      await kata.press('Enter');

      await expect(kata).toBeFocused();
      await expect(kata).toHaveJSProperty('__f6Marker', true);
    });

    test('the checkpoint feedback is the same node after answering', async ({ shell, campaign, storage }) => {
      await storage.seed(LAB_ONLY);
      await shell.goto(urls.view('campana'));
      await campaign.checkpointFeedback().evaluate((node) => {
        (node as MarkedNode).__f6Marker = true;
      });

      await campaign.checkpointOption('A').click();

      await expect(campaign.checkpointFeedback()).toContainText('Revisemos esa idea.');
      await expect(campaign.checkpointFeedback()).toHaveJSProperty('__f6Marker', true);
    });

    test.describe('without reduced motion', () => {
      test.use({ reducedMotion: 'no-preference' });

      test('the world node that loses the selection animates its box-shadow', async ({ shell, campaign }) => {
        await shell.goto(urls.view('campana'));

        const running = await campaign.worldMap().evaluate((map) => {
          const nodes = [...map.querySelectorAll('button')];
          nodes[1].click();
          return nodes[0].getAnimations().length;
        });

        expect(running).toBeGreaterThan(0);
      });
    });
  });
  ```

  Contra el legacy, cada una falla en su primera aserción:
  - `open` es `false`;
  - la marca no está en el nodo nuevo;
  - el nodo viejo ya no está en el documento y no tiene animaciones.

  Bajo `reduce`, la transición no existe en ninguna de las dos versiones: lo fija `css-contract`.
- **A crea los dos módulos con sus firmas,** sin cablearlos (no están en `legacy-views.ts`):
  - `campaign-bridges.ts` exporta `campaignBridges`, con los cinco métodos lanzando `new Error('not implemented')`;
  - `register-campaign.tsx` declara `mount` y `unmount` lanzando lo mismo, y no publica el global.
- **A crea `frontend/src/app/legacy/register-campaign.spec.tsx`** (jsdom). Carga el adaptador con módulos frescos:

  ```tsx
  import { act, within } from '@testing-library/react';
  import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
  import curriculum from '../../../../build/curriculum.json';
  import type { CampaignConfig } from '../../entities/campaign';
  import type { StorageLike } from '../../shared/lib/versioned-storage';

  const METHODS = ['exerciseContextHTML', 'lockedExerciseHTML', 'mount', 'refresh', 'returnURL', 'sync', 'unmount'];
  const EXERCISES = [
    ...curriculum.lab.rust, ...curriculum.quests.rust, ...curriculum.lab.go, ...curriculum.quests.go,
    ...curriculum.cores.lowlevel, ...curriculum.cores.infra, ...curriculum.cores.play, ...curriculum.cores.pc,
  ];

  interface LoadedAdapter {
    host: HTMLElement;
    writes: string[];
    stop: Mock;
    toast: Mock<(message: string) => void>;
  }

  async function loadAdapter(url = '/#campana'): Promise<LoadedAdapter> {
    vi.resetModules();
    history.replaceState(null, '', url);
    const writes: string[] = [];
    const items = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => items.get(key) ?? null,
      setItem(key, value) {
        writes.push(key);
        items.set(key, value);
      },
      removeItem(key) {
        writes.push(key);
        items.delete(key);
      },
    };
    vi.stubGlobal('localStorage', storage);
    const stop = vi.fn();
    vi.doMock('../../shared/lib/celebration', () => ({ celebrate: vi.fn(), stop }));
    vi.doMock('../content/content', () => ({ getContent: () => ({ lab: curriculum.lab, quests: curriculum.quests }) }));
    const { campaignEngine } = await import('../../entities/campaign');
    campaignEngine.init({ exercises: EXERCISES, worlds: curriculum.campaign } as CampaignConfig, { records: {} });
    window.TallerCampaignEngine = campaignEngine;
    Object.assign(window, { TallerLab: { getExercises: () => EXERCISES, exportState: () => ({ records: {} }) } });
    await import('./register-campaign');
    const host = document.createElement('div');
    document.body.append(host);
    return { host, writes, stop, toast: vi.fn() };
  }
  ```

  `afterEach` hace:
  1. `act(() => window.TallerCampaign?.unmount())`, dentro de un `try`, porque en el rojo el global no existe;
  2. borra el `host`;
  3. `vi.unstubAllGlobals()`;
  4. `vi.doUnmock` de los dos módulos;
  5. `history.replaceState(null, '', '/')`.

  Las pruebas:

  | Prueba | Valor esperado |
  | --- | --- |
  | `publishes exactly the seven methods that the lab and app.js use` | `Object.keys(window.TallerCampaign).sort()` igual a `METHODS`, y `Object.isFrozen(window.TallerCampaign)` |
  | `unmount stops the celebration even when nothing is mounted` | `window.TallerCampaign.unmount()` llama `stop` una vez |
  | `mount draws the campaign in the host and writes nothing` | con `act(() => window.TallerCampaign.mount(host, 'rust', toast))`, `within(host).getByRole('region', { name: 'Estación del robot' })`, y `writes` es `[]` |
  | `mount reads ?mundo= once and does not rewrite the URL` | con `loadAdapter('/?mundo=rust-world-2#campana')` y `vi.spyOn(history, 'replaceState')` después de cargar: la región «Puerto de señales», `replaceState` sin llamar y `location.search` igual a `?mundo=rust-world-2` |
  | `a second mount replaces the first page and keeps the chosen world` | montar; clic en «Mundo 3: …»; `history.replaceState(null, '', '/#campana')`; montar otra vez: un solo `.quest-hero` en el `host` y la región «Archivo de rutas» |
  | `a Go mount after a Rust choice falls back to the first open Go world` | montar en Rust; clic en «Mundo 2: …»; `history.replaceState(null, '', '/#campana')`; montar en Go: la región «La estación del rover» |
  | `returnURL is the world link` | `window.TallerCampaign.returnURL('rust-world-1')` igual a `?mundo=rust-world-1#campana` |

- **Pasos:**
  1. `npm run typecheck` y `npm run lint` pasan.
  2. `npm run test:unit -- app/legacy` falla: la primera prueba porque no hay global y las demás por `not implemented`.
  3. `npm run build` y `E2E_PORT=4193 npm run test:e2e -- specs/campaign-kept-state.spec.ts`: las cinco fallan por la razón de arriba. Los 123 y `campaign.spec.ts` siguen en verde, porque nada está cableado.
  4. Commit: `test(front): lo que la página de la campaña conserva y su adaptador (rojos)`.
- **Vuelta atrás:** revertí el commit.

### Tarea 4.2 · Los adaptadores y el cableado (T016, A)

- **Cambia:**
  - **`campaign-bridges.ts` y `register-campaign.tsx`,** con el cuerpo de §4.0.
  - **`frontend/app.js`.** Una sola línea de `startApp()` pasa a ser la llamada de research.md R2:

    ```diff
    -  const campaignInit = window.TallerCampaign?.init();
    +  const campaignInit = window.TallerCampaignEngine?.init(
    +    {
    +      exercises: window.TallerLab.getExercises(),
    +      worlds: { rust: window.RUST_CAMPAIGN || [], go: window.GO_CAMPAIGN || [] },
    +    },
    +    window.TallerLab?.exportState(),
    +  );
    ```

    `render()` no cambia: sigue llamando `TallerCampaign.unmount()`, `refresh()` y `mount(…)`.
  - **`frontend/src/app/boot/legacy-views.ts`,** en la misma posición:

    ```diff
    -  () => import('../../../campaign.js'),
    +  () => import('../legacy/register-campaign'),
    ```

  - **`frontend/src/app/main.tsx`.** Una línea, en el mismo lugar del orden de carga; K la revisa al integrar:

    ```diff
    -import '../../campaign.css';
    +import '../pages/campaign/ui/campaign-page.css';
    ```

  - **La hoja:** `git mv frontend/campaign.css frontend/src/pages/campaign/ui/campaign-page.css`, sin editarla.
  - **`frontend/campaign.js`:** `git rm`.
  - **`register-effects.ts`,** según el predicado de research.md R13:
    - `git grep -n "TallerEffects" -- 'frontend/*.js' 'frontend/src' ':!frontend/src/app/legacy/register-effects.ts'` no imprime nada: se borra `register-effects.ts` y su línea de `legacy-views.ts`, y se avisa a K para la fila «Animaciones» de `docs/architecture.md`;
    - si imprime (Sistemas todavía lo lee): queda.
- **Pasos:**
  1. Implementar y cablear.
  2. `npm run test:unit`: las specs de T015 y las de la página, en verde.
  3. `npm run build`.
  4. `E2E_PORT=4193 npm run test:e2e`:
     - los 123;
     - las 21 de `campaign.spec.ts`, sin editarlas;
     - las 5 de `campaign-kept-state.spec.ts`.
  5. Los checks de `qa/` que cargan `campaign.js` todavía fallan: los adapta T017, en el mismo commit.
- **No hace commit:** el corte es un solo commit, al final de T017.

### Tarea 4.3 · Los checks de `qa/` cargan los adaptadores (T017, A)

- **Cambia** cómo cargan o qué listan, nunca un valor esperado, salvo los tres nombres de la decisión 1. Si F5 ya está en `master`, se rebasa sobre su versión de estos archivos (research.md R13) y se cambia sólo lo de campaña.
- **`qa/lib/legacy-sources.ts`:** se borran `CAMPAIGN_UI_SOURCE` y `loadCampaignUi` y se suma:

  ```ts
  export const CAMPAIGN_BRIDGES_SOURCE = 'frontend/src/app/legacy/campaign-bridges.ts';
  export const CAMPAIGN_ADAPTER_SOURCE = 'frontend/src/app/legacy/register-campaign.tsx';

  export function loadCampaignBridges<T>(context: vm.Context): T {
    return runModule<{ campaignBridges: T }>(context, CAMPAIGN_BRIDGES_SOURCE).campaignBridges;
  }
  ```

- **`qa/lab-bridge-check.ts`:**
  - `CampaignApi` pierde `init`;
  - `BridgeContext` suma `GO_CAMPAIGN?: unknown[]` y `TallerCampaignEngine?: CampaignEngineApi`, con `interface CampaignEngineApi { init(config: unknown, labState: unknown): unknown }`;
  - `campaignBridge` queda así (la aserción de la inicialización pasa a la llamada que inicializa el motor, con el mismo valor):

  ```ts
  function campaignBridge(
    search: string,
    labState: LabState = { records: {} },
    afterCatalogs?: ContextHook,
  ): CampaignApi {
    const context = createContext(search, labState);
    loadCampaignWorlds(context);
    afterCatalogs?.(context);
    loadCampaignEngine(context);
    const api = loadCampaignBridges<CampaignApi>(context);
    assert.ok(api, 'campaign-bridges.ts no exportó campaignBridges');
    const lab = context.TallerLab as { getExercises(): LabExercise[]; exportState(): LabState };
    const engine = context.TallerCampaignEngine as CampaignEngineApi;
    const config = {
      exercises: lab.getExercises(),
      worlds: { rust: context.RUST_CAMPAIGN ?? [], go: context.GO_CAMPAIGN ?? [] },
    };
    assert.deepEqual(plainJson(engine.init(config, lab.exportState())), {
      ready: true,
      storageAvailable: true,
      loadWarning: '',
    });
    return api;
  }
  ```

  El orden es el de hoy: el motor se publica, los puentes lo capturan al evaluarse y después se inicializa. Ningún escenario cambia.
- **`qa/lib/app-adapters.ts`:**

  ```diff
  -  TallerCampaign: ['init', 'refresh', 'sync', 'mount', 'unmount'],
  +  TallerCampaign: ['refresh', 'sync', 'mount', 'unmount'],
  ...
  -  TallerCampaignEngine: ['exportState', 'planImport', 'applyImport', 'reset', 'backups'],
  +  TallerCampaignEngine: ['init', 'exportState', 'planImport', 'applyImport', 'reset', 'backups'],
  ```

- **`qa/lib/app-shell-harness.ts`:** el comportamiento `init` pasa de `TallerCampaign` a `TallerCampaignEngine`, con el mismo cuerpo:
  - `TallerCampaign` queda `{ sync: syncBehavior }`;
  - `TallerCampaignEngine` suma `init: () => ({ loadWarning: options.warnings?.campaign ?? '' })`.
- **`qa/app-shell-check.ts`:** las dos ocurrencias de `'Campaign.init'` pasan a `'CampaignEngine.init'`. Son el escenario «shell: al cargar se inicializan campaña y Sistemas…» y el arreglo `startup` de «startApp calls the adapters in order…». Es la decisión 1; el orden esperado no cambia.
- **`qa/boot-check.ts`:**
  - **`VIEW_HEADINGS`:** `campana: ''`, como `atlas`.
  - **La navegación:** la rama de nodos vale para las dos:

    ```diff
    -    if (view === 'atlas') {
    -      // El Atlas es React: monta nodos reales en #main en lugar de escribir innerHTML.
    -      assert.ok(main.childNodes.length > 0, 'el Atlas no montó nodos en #main');
    +    if (view === 'atlas' || view === 'campana') {
    +      // El Atlas y la campaña son React: montan nodos reales en #main en lugar de escribir innerHTML.
    +      assert.ok(main.childNodes.length > 0, `#${view} no montó nodos en #main`);
    ```

  - **`LEGACY_SOURCES`:** `'frontend/campaign.js'` pasa a `'frontend/src/app/legacy/campaign-bridges.ts'`. El escenario «each legacy source evaluated alone…» pasa a `async` y evalúa además `'frontend/src/app/legacy/register-campaign.tsx'` con `vm.runInContext(await bundleApp(source), harness.context, { filename: source })`, con las mismas dos condiciones: no lanza y no toca el almacenamiento. `bundleSource` no fija `jsx: 'automatic'` ni `process.env.NODE_ENV`, y `bundleApp` sí.
  - **`INITIALIZERS`:** `['TallerCampaign', 'init']` pasa a `['TallerCampaignEngine', 'init']`, y el esperado, a `['TallerLab.init', 'TallerCampaignEngine.init', 'TallerSystems.init']` (decisión 1). El orden de lectura de las claves (`STORAGE_KEYS_IN_ORDER`) no cambia.
  - **Un escenario nuevo:**

    ```ts
    await test('TallerCampaign publishes exactly the seven methods that the lab and app.js use', async () => {
      const { context } = await boot();
      assert.deepEqual(Object.keys(context.TallerCampaign as object).sort(), [
        'exerciseContextHTML',
        'lockedExerciseHTML',
        'mount',
        'refresh',
        'returnURL',
        'sync',
        'unmount',
      ]);
    });
    ```

  - **Si el DOM falso le falta algo** a la página (por ejemplo, el elemento `progress` o `details`), se suma lo mínimo a `qa/lib/fake-dom.ts` y se avisa a K. Es cómo carga, no qué espera.
- **`qa/load-order-check.ts`:**
  - **Las constantes:** se suma `const CAMPAIGN_ADAPTER = 'frontend/src/app/legacy/register-campaign.tsx';`.
  - **`BEFORE_APP_REASONS`:**
    - la entrada `'frontend/campaign.js'` pasa a `[CAMPAIGN_ADAPTER]: 'render() de app.js llama a window.TallerCampaign.refresh() y mount(), y el respaldo a sync()'`;
    - se suma `[CAMPAIGN_ENGINE]: 'startApp() inicializa el motor con window.TallerCampaignEngine.init()'`;
    - la razón de `CATALOGS` termina en «y startApp() los pasa al motor de campaña».
  - **La restricción de la captura:** pasa a `[CAMPAIGN_ENGINE, CAMPAIGN_ADAPTER, 'campaign-bridges.ts, que importa register-campaign.tsx, captura window.TallerCampaignEngine en const engine al evaluarse']`.

  Ninguna restricción se pierde y se suma una.
- **Pasos:**
  1. Adaptar.
  2. Correr `node qa/lab-bridge-check.ts` (21 de 21), `node qa/boot-check.ts` (los de T001 más 1), `node qa/app-shell-check.ts` (los de T001), `node qa/load-order-check.ts` (las restricciones de T001 más 1) y `node qa/seams-guard-check.ts`.
  3. `npm test`, `npm run lint` (los avisos de T001 menos 2), `npm run format:check`, `npm run build` y `E2E_PORT=4193 npm run test:e2e`.
  4. `git grep -n "frontend/campaign\.\|campaign\.js\|campaign\.css" -- qa frontend` sólo da las excepciones de SC-008.
  5. **Un solo commit con T016 y T017:** `feat(front): la campaña es una página de React y TallerCampaign un adaptador de siete métodos`.
- **Compuerta:** el paso 2 y el paso 3.
- **Vuelta atrás:** revertí el commit del corte y después el rojo de T015. El legacy vuelve entero: `campaign.js`, `campaign.css`, `init` y los checks de antes.

### 4.4 La correspondencia de los checks (FR-043, SC-010)

Va entera en la descripción del PR. Ningún check se retira.

**`lab-bridge-check`** (21). Los once de campaña siguen en el check, que carga los puentes con `runModule` en lugar de `campaign.js` con `runSource`. La aserción de la inicialización pasa a `TallerCampaignEngine.init`.

| # | Escenario | También lo fija |
| --- | --- | --- |
| 1 | `returnURL` conserva `?mundo=<id>#campana` | `url-grammar.spec` (`worldHref`), `register-campaign.spec` |
| 2 | Entrenamiento: mundo, XP y tipo | `mission-bridge.spec` (el contexto) y `selectors.spec` (el tipo) |
| 3 | El tipo distingue reparación, kata y desafío final | `selectors.spec` (`missionTypeLabel`): pasa a ser su dueña |
| 4 | El contexto de Go usa el mundo de Go | `mission-bridge.spec` |
| 5 | Fuera de campaña da `''` | `mission-bridge.spec` y `url-grammar.spec` |
| 6 | Refleja las pruebas y la predicción | `mission-bridge.spec` |
| 7 | Un jefe bloqueado muestra los motivos y el regreso | `mission-bridge.spec` (el permiso), R10 de `css-contract` (el aspecto) |
| 8 | Una misión permitida o sin enlace no se bloquea | `mission-bridge.spec` |
| 9 | El jefe se habilita al verificar y sincronizar | Sólo el check (el motor real) |
| 10 | Un enlace que no pertenece al mundo explica el problema | `mission-bridge.spec` |
| 20 | El título de un mundo, escapado | Sólo el check (el HTML sigue en el adaptador) |
| 11 a 19, 21 | Sistemas | Sin cambios de F6 |

**`boot-check`.**

| Escenario | Qué cambia |
| --- | --- |
| Arranque | Nada |
| Adaptadores | La lista de `app-adapters.ts` (`init` pasa a `TallerCampaignEngine`) |
| Navegación | `#campana` se comprueba por nodos montados, como el Atlas |
| Borrar todo, las dos de compatibilidad, las dos de integridad y las dos importaciones | Nada: visitan la campaña de React |
| Fuentes evaluadas solas | `campaign.js` sale; entran los dos adaptadores (uno con `bundleApp`) |
| `main.tsx` sin su llamada y el segundo `startApp` | Nada |
| `startApp` inicializa en orden | El nombre `TallerCampaign.init` pasa a `TallerCampaignEngine.init` (decisión 1) |
| Nuevo: siete métodos | Fija SC-005 en el arranque real |

**`app-shell-check`.**

| Escenario | Qué cambia |
| --- | --- |
| Los fakes | Salen de la lista; el aviso de carga pasa a `CampaignEngine.init` |
| Los dos de avisos | Nada: el mismo texto |
| «shell: al cargar…» y «startApp calls the adapters in order…» | `Campaign.init` pasa a `CampaignEngine.init` (decisión 1) |
| Los de respaldo con `Campaign.sync` | Nada |

**`load-order-check`.** `campaign.js` pasa a `register-campaign.tsx` en dos restricciones, y se suma `register-campaign-engine.ts` antes de `app.js`.

**`seams-guard-check`.** Suma tres escenarios (T008).

## 5. Verificación del corte (coordinador K, onda 4)

**Cubre:** FR-035, FR-039, FR-040, FR-044 a FR-046; SC-004, SC-005, SC-007, SC-009, SC-011 y SC-012; US5.

### Tarea 5.1 · Las comparaciones únicas (T018)

Se corren con los scripts de [quickstart.md](./quickstart.md) §3, fuera del repositorio, sobre dos raíces: un worktree de la base de T001 y la rama con el corte. Las cantidades van en la descripción del PR.

| Comparación | Qué compara | Esperado |
| --- | --- | --- |
| (a) El multiconjunto del CSS del dist | Contexto `@media`, selector, propiedad, valor e `!important`, cada selector por separado | 0 sólo en la base y 0 sólo en F6 (SC-004) |
| (b) El DOM, el estilo y la accesibilidad | Los 19 estados de research.md R14: el DOM normalizado de `#main` y su `ariaSnapshot()` a 1 280 px, y el estilo computado de cada elemento a 1 280, 981, 850, 650, 590 y 375 px con y sin movimiento reducido. Suma `lock` y `mission`, las dos páginas del laboratorio que dibujan campaña | 0 diferencias. Las únicas aceptadas son los cuatro `data-*`, que el normalizador ya quita. Los `<details>` no se abren, y las transiciones se esperan hasta el final |
| (c) Los puentes | `exerciseContextHTML`, `lockedExerciseHTML` y `returnURL` de `campaign.js` de la base contra `campaign-bridges.ts`, para:<br>• los 274 ejercicios y `nope`;<br>• los dos lenguajes;<br>• los ocho mundos, `no-existe`, `?campana=` vacío y ausente;<br>• dos estados del laboratorio (vacío y el de master);<br>• cuatro ids hostiles en `returnURL` | 0 diferencias (SC-005) |

- **Si una diferencia aparece,** se corrige el código, nunca la lista de aceptadas: es una clase con otro espacio, un nodo de más o un texto partido.
- **Si el barrido muestra una diferencia de foco o de `:hover`,** se revisa que el script haya movido el puntero a (0, 0) y que las dos versiones enfoquen el mismo elemento.
- **La prueba de que el barrido detecta algo:** en una copia descartable, el `import` de `campaign-page.css` antes de `lab.css` en `main.tsx` da diferencias (quickstart.md §3.4).

### Tarea 5.2 · Las roturas deliberadas (T019)

Cada una en una copia de trabajo, deshecha con `git checkout -- <archivo>`; ninguna se commitea (FR-045, SC-009). La tabla está en quickstart.md §4. Resumen:

| Rotura | Falla en |
| --- | --- |
| Un `20` escrito en `MissionSeal` en lugar de `CODE_XP` | `CampaignPage.constants.spec.tsx` |
| `useStore(campaignEngine.changes)` sin selector en `CampaignPage` | `npm run lint` (la guarda de FR-026) |
| `.quest-direct-lock` borrada de `lab.css` | R10 de `css-contract` |
| `localStorage.getItem('taller-campaign-v1')` en `CampaignPage` | `seams-guard-check`, R1 |
| `campaignBridges.sync()` en lugar de `refresh()` en `mount` | `register-campaign.spec.tsx` («mount … writes nothing») y la integridad de `boot-check` |
| Un byte distinto en `lockedExerciseHTML` (`Ver mi mapa` sin la flecha) | `lab-bridge-check` (escenario 7) y la comparación (c) |
| `key={index}` en las tarjetas de misión | `campaign-kept-state.spec.ts` («the requirements of a locked mission stay open…») y `CampaignPage.spec.tsx` (prueba 10) |
| `missionTypeLabel` importado del índice en `campaign-bridges.ts` | `seams-guard-check` en el árbol real, R4 |
| Sin `flushSync` en `chooseWorld` | `CampaignPage.spec.tsx` (prueba 4, el foco) y el flujo (c) |
| Sin `stop()` en `unmount` | `register-campaign.spec.tsx` |

### Tarea 5.3 · La compuerta del PR (T020)

La de §0.3, entera, con los valores de T001. Se informan:

- `html.length` antes y después, y el aumento;
- los avisos antes y después;
- la cantidad de escenarios de cada check adaptado;
- las 21 más 5 pruebas E2E nuevas;
- las specs nuevas de Vitest.

## 6. Documentación y PR (coordinador K)

### Tarea 6.1 · La documentación (T021)

En el mismo PR (FR-047). La integra K; ninguna regla de `AGENTS.md` cambia, salvo la lista de vistas.

| Archivo | Qué cambia |
| --- | --- |
| `AGENTS.md` | La lista de vistas legacy de «Organización» pierde `campaign.js`, y la frase de Atlas suma la campaña como segunda vista migrada |
| `README.md` | «Archivos principales» deja de nombrar `campaign.js` y `campaign.css` y nombra `frontend/src/pages/campaign/` y los dos adaptadores |
| `docs/architecture.md` | • la fila «Interfaz y exploradores de campaña» pasa a la página, la hoja `campaign-page.css`, los selectores de `entities/campaign` y los dos adaptadores (los exploradores siguen en `quest-explorers.js` hasta F7)<br>• las filas de la gramática de URL y del shell dejan de nombrar `campaign.js` y `campaign.css`<br>• la fila «Animaciones» pierde `register-effects.ts` si T016 lo borró<br>• «Estado actual» de Feature-Sliced Design suma `pages/campaign` |
| `qa/AGENTS.md` | • la fila «Contexto de campaña o Sistemas…» dice que `lab-bridge-check` carga `campaign-bridges.ts`<br>• la de «Mundos, desbloqueos, XP…» nombra `selectors.spec.ts` y las specs de la página<br>• el párrafo de `app-adapters.ts` dice que, desde F6, `TallerCampaignEngine` incluye `init` y `TallerCampaign` no<br>• si T002 trajo el arnés: la viñeta de Vitest dice que hay dos proyectos (`*.spec.ts` en `node` y `*.spec.tsx` en `jsdom`, con `frontend/src/vitest-setup-dom.ts`) y nombra la guarda de `useStore` |
| `docs/adr/0008-pruebas-del-front.md` | Sólo si T002 trajo el arnés: la sección «Proyectos y setup de Vitest» registra los dos proyectos, el setup y que la raíz sólo lleva `projects` (Vitest 5 hereda y concatena) |

- **Comprobar:** rutas, comandos y enlaces locales de cada archivo tocado; `git diff --check`; y el paso 8 de §0.3.
- **Commit:** `docs: la campaña en React en el mapa, el README y las guías`.

### Tarea 6.2 · El PR y lo que hace el usuario (T022)

- **El PR:**
  - el título es `feat(front): port the campaign to React`;
  - la descripción, en inglés, cuenta el contexto, qué faltaba y por qué, qué cambia, cómo se verificó (los comandos, las medidas de T018 a T020 y la correspondencia de §4.4) y qué queda pendiente;
  - nombra las dos decisiones del informe y la tabla de lo que retira cada ítem (spec, «Qué se retira del legacy»).
- **Acciones del usuario, antes de integrar:**
  1. La comprobación manual con un lector de pantalla, antes en el legacy y después en la página (X1 y X2):
     - qué anuncia la región de la retroalimentación del checkpoint al responder dos veces;
     - cómo se oyen los `<details>` que quedan abiertos.
  2. Con permiso, `docker compose build taller` sobre la rama.
- **Lo que se informa al coordinador:** los hallazgos para la hoja de ruta y para otras specs (research.md R10, R12, R13 y la sección «Hallazgos» del informe).

## Lo que otros ítems toman de F6

| Ítem | Qué toma | De dónde |
| --- | --- | --- |
| F3, F4 y F9 | El arnés de componentes, si F6 lo trajo; el patrón del adaptador con sesión de módulo y el de las specs de página con almacenamiento en memoria | T002, `campaign-page-harness.tsx`, `register-campaign.tsx` |
| F5 | El orden para `register-effects.ts` y `lab-bridge-check` (research.md R13). La rareza de `stop()` en `unmount`, que su adaptador también conserva (R10) | — |
| F7b | `campaignBridges` (los tres métodos de HTML y `returnURL`, que F7b retira), `missionTypeLabel`, `CODE_XP` y `PREDICTION_XP` por la entrada sin estado, y `.quest-direct-lock` en `lab.css` | `campaign-bridges.ts`, `entities/campaign/bridge.ts` |
| F8 | `TallerCampaign.sync` y `TallerCampaignEngine`, que el respaldo sigue llamando | `register-campaign.tsx` |
| F10 | `mount`, `unmount` y la llamada a `refresh` de `render()`; la llamada a `TallerCampaignEngine.init` de `startApp()` pasa a su arranque | `register-campaign.tsx`, `app.js` |
| E1 | Los conteos derivados y la spec de coherencia del texto editorial; los tres supuestos que F6 no toca (research.md R16) | `selectors.ts`, `CampaignPage.editorial.spec.tsx` |
| D1c | Nada nuevo: la página escribe sólo por `answerCheckpoint`, que sube la revisión | — |

## Cobertura de requisitos

| Requisito | Tareas | Notas |
| --- | --- | --- |
| FR-001 | T003 a T021 | Las cinco unidades en el orden de la spec; el corte, en un commit, precedido del rojo |
| FR-002 | T001, T010, T016, T020 | 123 E2E sin editar antes y después |
| FR-003 | T004, T005, T015 | 21 contra el legacy; 5 rojas aparte |
| FR-004 | T004 (a, c, h2), T013 (11), T015, T017 (`boot-check`) | 0 escrituras al abrir; 1 al responder; las fixtures |
| FR-005 | T006, T007, T020 (§0.3, paso 6) | `rules.ts`, el motor y `progress.ts` sin diff |
| FR-006 | T004 (c, d, f, g), T005 (k, l), T013 (4) | `withWorldQuery`, `worldHref` y `campaignMissionHref` |
| FR-007 a FR-009 | T014, T018 (b) | Las reglas de §3.1 y la comparación del DOM |
| FR-010 | T004 (c), T013 (4) | El orden de los efectos |
| FR-011 | T004 (e), T013 (5) | |
| FR-012 | T004 (h2), T005 (i1), T013 (7, 8, 16) | |
| FR-013, FR-014 | T011, T012, T005 (k1, l), T013 (17), T015 | La sesión de módulo y la resolución al montar |
| FR-015 | T005 (n1, n2, o), T014 | Controles nativos, sin `tabindex` nuevo |
| FR-016 | T013 (4, 5, 7), T004 (c, e) | Refs, `event.currentTarget` y `flushSync` |
| FR-017 | T015 (`register-campaign.spec.tsx`) | `stop()` siempre y el doble montaje |
| FR-018 | T013 (9), T015 (p) | La región montada |
| FR-019 | T013 (10), T015 (p) | Los `<details>`, el foco y la transición |
| FR-020 | T016 | `onUncaughtError` con «No se pudo mostrar la campaña.» |
| FR-021 | T004 (a, c), T005 (k1), T013 (11), T015 | |
| FR-022 | T013 (12), T019 | `useStore` con `selectRevision` |
| FR-023 | T016, T015 | `refresh()` antes del primer dibujo |
| FR-024 | T016, T013 | Las props desde `getContent()`; las specs usan el catálogo de `build/curriculum.json` sin importar `app/content` |
| FR-025 | T008, T016, T017, T019 | Un solo motor; R4 |
| FR-026 | T002, T019 | La guarda de ESLint |
| FR-027 | T006, T007 | |
| FR-028 | T006, T007 | |
| FR-029 | T006, T007, T008 | La entrada sin estado crece; el guard lo respalda |
| FR-030 | T013 (constantes), T019 | |
| FR-031 | T013 (editorial) | |
| FR-032 | T013 (catálogo y constantes) | |
| FR-033 | T015, T017 (`boot-check`) | Siete métodos, ninguno nuevo |
| FR-034 | T016, T017 | `startApp()` por `TallerCampaignEngine.init` |
| FR-035 | T016, T018 (c) | |
| FR-036 | T016, T017 | Los puentes sin React; las dos fuentes evaluadas solas; `load-order-check` |
| FR-037 | T014, T016 | `celebrate` en la página y `stop` en el adaptador, por import; `register-effects` según el predicado |
| FR-038 | T020 (§0.3, paso 6) | Sin diff |
| FR-039 | T009 | |
| FR-040 | T016, T018 (a, b) | `git mv` y la misma línea de `main.tsx` |
| FR-041 | T003 a T005, T015 | Los quince flujos más el (p) |
| FR-042 | T002, T006, T011, T013 | Los dos proyectos; las fábricas junto a lo que modelan |
| FR-043 | T017, §4.4 | |
| FR-044 | T018 | 19 estados |
| FR-045 | T019 | |
| FR-046 | T014, T020 | Los avisos y el tamaño |
| FR-047 | T021 | |
| FR-048 | Reparto, T010, T016, T017 | De a uno; los predicados de R13 |
| SC-001 | T020 | |
| SC-002 | T004, T005, T015, T016 | |
| SC-003 | T004, T013, T017 | |
| SC-004 | T009, T018 | |
| SC-005 | T015, T017, T018 (c) | |
| SC-006 | T006, T013 | |
| SC-007 | T013, T019 | |
| SC-008 | T016, T020 (§0.3, paso 8), T021 | |
| SC-009 | T003 a T005, T013, T019 | Los 14 contratos, en la tabla de abajo |
| SC-010 | §4.4 | |
| SC-011 | T002, T008, T014, T020 | |
| SC-012 | T020, T022 | |

**Los 14 contratos de «Qué se conserva», con su prueba** (SC-009):

| # | Contrato | Pruebas |
| --- | --- | --- |
| 1 | Héroe y rango | (a), (b1), (i1); spec 1 y 2 |
| 2 | Avisos | (a), (m); specs 13 y 14 |
| 3 | Mapa de mundos | (a), (b1), (c); spec 1 |
| 4 | Mundo elegido | (b1), (c), (d) |
| 5 | Mundo bloqueado | (d) |
| 6 | Mundo abierto | (g), (h2), (i1) |
| 7 | Misiones | (e), (f1), (f2); specs 5 y catálogo |
| 8 | Checkpoint | (h1), (h2); specs 7 a 9 |
| 9 | Vitrina | (j), (b1) |
| 10 | Reglas | (j); spec de las constantes |
| 11 | Elegir un mundo | (c); spec 4 |
| 12 | Filtrar y responder | (e), (h2), (n2); specs 5, 7, 8 y 16 |
| 13 | Sesión y URL de entrada | (k1), (k2), (l); `register-campaign.spec` |
| 14 | Sin mundos y sin escrituras | spec 17; (a), (c), (k1); spec 11 |

**Historias:**

| Historia | Tareas |
| --- | --- |
| US1 | T004, T005, T013, T014 |
| US2 | T004, T005, T017 |
| US3 | T015 a T018 |
| US4 | T006, T007, T013 |
| US5 | T009, T018 |
| US6 | T008, T013, T017, T020 |

## Descargas y permisos

- **Sólo si falta el arnés,** la lista de T002 (seis paquetes y sus dependencias), con el permiso del usuario antes de bajar nada.
- **El navegador de Playwright** ya está en la máquina (F1).
- **`postcss`,** para el multiconjunto, ya está en `node_modules` como dependencia de Vite.
- **Docker** lo corre sólo K, con permiso, y sólo `docker compose build taller`.

## Riesgos y lo que quedó sin verificar

1. **Nada se ejecutó al planificar.** Las firmas, los textos y los valores salen de leer `f2b-acum` y el contenido. Los E2E se escriben contra el legacy primero, así que una lectura equivocada aparece en T004 y no en el corte. Los números que hay que medir (tamaño, avisos, escenarios) los fija T001.
2. **El DOM de React y el de `innerHTML`.** Hay tres lugares donde puede diferir:
   - los espacios de las clases;
   - un texto partido por Prettier sin `{' '}`;
   - un atributo que React omite o agrega.

   *Mitigación:* las reglas de §3.1 y la comparación de T018.
3. **El DOM falso de `boot-check`** no se probó con la página de la campaña. El Atlas monta ahí, pero la campaña usa `progress` y `details`. *Mitigación:* T017 suma lo mínimo a `qa/lib/fake-dom.ts` si hace falta, y lo avisa.
4. **`register-campaign.tsx` evaluado solo con `bundleApp`** en el contexto de `boot-check`: `main.tsx` ya evalúa React ahí, pero esa combinación exacta no corrió.
5. **La transición de C2 en el E2E.** La prueba depende de que `flushSync` deje el DOM actualizado dentro del `click()` sintético y de que `getAnimations()` fuerce el cálculo de estilo. Es determinista en Chromium. Si no lo fuera, se reemplaza por esperar `transitionrun` sobre el nodo.
6. **`vi.stubGlobal('localStorage')` en jsdom.** `versioned-storage.ts` lee `globalThis.localStorage`, y la spec del motor ya lo hace en `node`. Si jsdom no deja sombrearlo, se usa `vi.spyOn(window, 'localStorage', 'get')`.
7. **El tamaño.** El aumento estimado es de +3 000 a +12 000. Si pasa de 15 000, se avisa antes del PR (research.md R15).
8. **Los archivos compartidos con F3, F4, F5 y F9.** *Mitigación:* los predicados de R13 y la integración de a uno.
9. **La lectura con un lector de pantalla** (X1 y X2) es del usuario, y no está hecha.
10. **E1** rompe tres supuestos que F6 deja como están (research.md R16).

## Complexity Tracking

Ninguna de las decisiones contradice la constitución ni `AGENTS.md`. Se registran porque un revisor las preguntaría.

| Decisión | Por qué hace falta | Alternativa más simple que se descartó y por qué |
| --- | --- | --- |
| Dos módulos de adaptador para un solo global | `lab-bridge-check` empaqueta los puentes solos. Si importaran la página, el contexto del check tendría React y un segundo motor (FR-036, riesgo 11 de la spec) | Un solo módulo: arrastra la página y el motor al check |
| La entrada sin estado de `entities/campaign` crece con `missionTypeLabel`, `CODE_XP` y `PREDICTION_XP` | El puente necesita el tipo de misión y la suma de XP sin evaluar el motor (FR-029, R4) | Duplicar el tipo en el adaptador (la spec lo prohíbe) o un import profundo (R6) |
| La spec de las constantes envuelve dos métodos del motor | El `maxScore` sale de enlaces locales de `rules.ts`, y mover las constantes toca el modelo (FR-005) | Mover las constantes a un módulo hermano: prueba más, pero edita `entities/campaign/model` |
| Tres valores esperados de dos checks cambian el nombre de lo espiado | `init` se retira de `TallerCampaign` (FR-034) y la llamada pasa al motor | Conservar `TallerCampaign.init` hasta F10, que contradice la hoja de ruta |
