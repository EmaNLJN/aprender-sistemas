# ADR 0008 · Pruebas del front: Vitest, Testing Library, fishery y Playwright

- **Estado:** aceptada por el usuario el 2026-10-05, sin enmiendas.
- **Contexto de la decisión:** el usuario eligió el camino «red y seams primero» para portar el front legacy a React y no corrigió sus supuestos: antes de portar van E2E con Playwright y Page Objects contra la versión actual, y las piezas nuevas llevan Vitest, Testing Library y factories con fishery.
- **Relacionado:** completa el [ADR 0002](0002-qa-y-configuracion-en-typescript.md) (los checks de `qa/` siguen igual), respeta el [ADR 0003](0003-integridad-del-progreso.md) (el progreso guardado es contrato) y el [ADR 0007](0007-organizacion-del-repositorio.md) (`qa/` es transversal e incluye los checks de punta a punta). Es la base del ítem F1 de `specs/front-react/roadmap.md`.

## Contexto

Hoy el front se prueba sin navegador y sin framework de pruebas:

- `npm test` corre 30 checks de `qa/*-check.ts` con `node:assert`. Cargan las fuentes legacy en contextos `node:vm` y las vistas sobre un DOM falso (`qa/lib/fake-dom.ts`).
- Ninguna vista React tiene una prueba de componente con interacción: el Atlas se prueba por su modelo y por un `renderToString` de la página (`qa/atlas-check.ts`).
- Los checks atados al legacy no ven lo que ve el alumno. `boot-check` sólo navega por hash y nunca dibuja el laboratorio en modo ejercicio, ni con `?campana` ni con `?sistema`. Ningún check prueba qué pasa al recargar un enlace que cambia la query.
- La revisión en el navegador es manual (`qa/AGENTS.md`), y `docs/agent-skills.md` deja dicho que, hasta que un ADR adopte Vitest y Playwright, las specs nuevas no tienen dónde correr.

Portar las seis vistas legacy sin cambiar lo que el alumno ve ni lo que guarda necesita dos cosas que hoy no existen: pruebas que ejerzan el build real en un navegador real, y pruebas de lógica y de componentes para el código nuevo.

Se consultaron Vitest 5, Testing Library, fishery y Playwright 1.63 con Context7 el 2026-10-05, y los sitios oficiales de Playwright (instalación de navegadores y CI) y de Jest (módulos ES).

## Decisión

### 1. Lógica y componentes: Vitest 5 con jsdom y Testing Library

- **Vitest 5.0.3** corre las specs. Reusa la configuración de Vite con `mergeConfig`, así que la transformación de TSX, la resolución de módulos y el JSON de `build/curriculum.json` son los del build.
- **Dos proyectos** (`test.projects`): `*.spec.ts` corre en `node` (modelos, almacenes y lógica pura) y `*.spec.tsx`, en `jsdom` (componentes y hooks). Una spec `.ts` que necesite DOM lo pide con `// @vitest-environment jsdom`.
- **Sin `globals`:** cada spec importa `describe`, `it` y `expect` de `vitest`. Sin `globals`, Testing Library no limpia sola: el setup del proyecto `jsdom` llama a `cleanup()` después de cada test.
- **Testing Library:** `@testing-library/react` y su peer `@testing-library/dom`, `@testing-library/user-event` y `@testing-library/jest-dom` (con `import '@testing-library/jest-dom/vitest'` en el setup). Las consultas van por rol y nombre accesible, `userEvent.setup()` antes del `render` y `await` en cada interacción.
- **Qué se prueba:** comportamiento observable de modelos, almacenes, hooks y componentes, con las reglas de `tdd` y `react-testing`. La red y el almacenamiento se simulan en sus interfaces (el `StorageLike` de `openVersionedStore`, el transporte que recibe cada módulo) y los modelos puros se usan reales.
- **Límites de jsdom,** verificados en su rama `main` (v30.1.2 es la última versión publicada) el 2026-10-05:
  - `HTMLDialogElement` sólo tiene el atributo `open`: `show()`, `showModal()` y `close()` están comentados en `HTMLDialogElement.webidl` y el issue jsdom/jsdom#3294 sigue abierto. El taller tiene tres `<dialog>` (`#lesson-dialog`, `#confirm-dialog` y `#lab-confirm-dialog`) y exige que el de la lección devuelva el foco a quien lo abrió. Eso es comportamiento del navegador y se prueba en E2E; una spec que sólo necesite que el diálogo exista define un stub mínimo.
  - `window.matchMedia` no existe y `window.scrollTo` es un stub «not implemented». `celebrate` consulta `matchMedia` en cada llamada, así que su spec lo define.
  - Se espera que CodeMirror 6 necesite APIs de layout que jsdom no trae; falta confirmarlo con la primera spec que lo monte. Hasta entonces, el editor (`shared/ui/code-editor`) es un seam: las specs reciben un doble que cumple su interfaz, y el editor real se ejerce en E2E.
  - Los stubs se escriben cuando una spec los necesita, no por anticipado.

### 2. Datos de prueba: fishery

- **fishery 2.4.0** arma entradas de las specs con `Factory.define`, `build`, `buildList` y variantes con `params`. Una factory produce entradas: el valor esperado se escribe a mano o sale de una fixture congelada, nunca de la misma factory ni del código que se prueba (`AGENTS.md`, «Evitá tests tautológicos»).
- Las factories de Vitest viven junto a la entidad o la página que modelan, como `*.factory.ts`. Las de los E2E viven en `qa/e2e/` y se tipan por el formato v1 guardado, no por los tipos del código: el E2E sigue probando el formato que ya tiene el alumno. No se comparten, porque caen bajo `tsconfig` distintos y el E2E no debe importar el código que caracteriza.

### 3. E2E: Playwright Test 1.63 con Page Objects por fixtures

- **`@playwright/test` 1.63.0**, con un proyecto `chromium` (dispositivo «Desktop Chrome»). En headless, Playwright usa el Chrome Headless Shell y no el Chromium completo.
- **Sobre el build servido:** `webServer` levanta `npm run preview -- --port 4173 --strictPort`, que sirve `dist/index.html`, el mismo documento que sirve Nginx. `npm run test:e2e` no construye: si falta `dist/index.html`, falla con un mensaje que manda a correr `npm run build`. No detecta un build viejo; el flujo es `npm run build && npm run test:e2e`, y la CI construye antes de probar.
- **Page Objects inyectados por fixtures:** hay un Page Object por vista y uno para el shell, en `qa/e2e/pages/`. Se entregan con `test.extend` (`shell`, `lab`…), que también instala los dobles de la red. Los métodos expresan intención del alumno (`openExercise`, `runCode`) y los localizadores salen del nombre accesible (rol, etiqueta y texto), nunca de atributos de prueba agregados a producción. Las aserciones van en la spec. El ciclo de vida (red simulada, progreso sembrado) va en fixtures, no en los Page Objects.
- **Sin red real:** los Playgrounds (`https://play.rust-lang.org/execute` y `https://play.golang.org/compile`) se simulan con `page.route`. Cualquier otro pedido que salga de `127.0.0.1` se aborta y hace fallar el test, así que ninguna prueba toca los servicios públicos.
- **Aislamiento y datos:** cada test usa un contexto nuevo, sin `localStorage` previo. El progreso se siembra con `context.addInitScript` antes de cargar, desde las fixtures congeladas de `qa/fixtures/` o desde factories. El temporizador de 500 ms y los vencimientos de repaso se controlan con `page.clock`.
- **Los E2E no cambian al portar:** las mismas specs pasan sobre el legacy y sobre la vista portada. Una spec que haya que cambiar describe un cambio de comportamiento, y va en su propio commit con TDD.
- **Fallas:** `forbidOnly` en la CI, un reintento en la CI y ninguno en local, traza en el primer reintento, y el informe HTML y los resultados se suben sólo si el job falla. Son valores iniciales que confirma el plan de F1.
- **Límite:** `vite preview` no aplica la CSP de `docker/nginx/nginx.conf` ni pasa `/api/` a la API, así que la red no los ejerce. Un humo contra el stack de Docker espera a A3 y a C4, que cambian ese contrato.
- **Sólo Chromium:** Firefox y WebKit quedan fuera.

### 4. Dónde viven, cómo corren y qué suma la CI

| Qué | Dónde | Cómo corre |
| --- | --- | --- |
| Specs de Vitest | junto al módulo, en `frontend/src/**/*.spec.ts` y `*.spec.tsx` | `npm run test:unit`, y dentro de `npm test` |
| Configuración de Vitest y su setup | `frontend/vitest.config.ts` y un setup dentro de `frontend/src/` | |
| E2E, Page Objects, fixtures y factories | `qa/e2e/`, con su `playwright.config.ts` y su `tsconfig.json` | `npm run test:e2e` |
| Resultados | `test-results/` y `playwright-report/` de la raíz | ya los excluyen `.gitignore`, `.dockerignore` y `.prettierignore` |

Scripts nuevos de `package.json` (los nombres siguen a `test:executor`):

```json
"test": "node qa/run-checks.ts && vitest run --config frontend/vitest.config.ts",
"test:unit": "vitest run --config frontend/vitest.config.ts",
"pretest:unit": "npm run curriculum",
"test:e2e": "playwright test --config qa/e2e/playwright.config.ts",
"test:e2e:install": "playwright install --only-shell chromium"
```

- `pretest:unit` existe porque el catálogo del Atlas importa `build/curriculum.json`: una corrida suelta de Vitest lo necesita generado. `npm test` ya lo genera por `pretest`.
- **Tipos:** las specs caen bajo `frontend/tsconfig.app.json`, que ya incluye `src`; el setup vive dentro de `frontend/src/` para que `tsc` vea el aumento de tipos de jest-dom (a verificar en F1). `frontend/vitest.config.ts` se suma a `tsconfig.node.json`. `qa/e2e/` tiene su `tsconfig.json`, porque `tsconfig.qa.json` impone sintaxis borrable (ADR 0002) y Playwright transpila TypeScript por su cuenta; `tsconfig.qa.json` lo excluye y `npm run typecheck` lo suma.
- **El E2E no entra en `npm test`:** `frontend/Dockerfile` corre `npm test` en su etapa de build y esa imagen no tiene navegador. Todo lo que entra en `npm test` también corre en la imagen.

**Job `front` de la CI.** Los pasos nuevos van dentro de `front`, al final y en este orden. Un job aparte cambiaría la regla de `AGENTS.md` de mergear con los tres checks en verde.

```yaml
      - run: npm run test:e2e:install -- --with-deps
      - run: npm run test:e2e
      - if: failure()
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```

- **Después de `npm run build`:** el E2E necesita `dist/`. `npm test`, `lint` y `format:check` van antes porque fallan más rápido.
- **Acción nueva:** `actions/upload-artifact` se fija por SHA, como las que ya usa el workflow. El SHA es el de la release v7.0.1, consultado con `gh api` el 2026-10-05.
- **Costo del navegador:** cada corrida baja el Chrome Headless Shell y ffmpeg (122,2 MB, ver «Medidas») y, con `--with-deps`, instala paquetes de sistema con `apt`. El tiempo de ambos pasos y el de la suite no se midieron. El primer PR de F1 los registra en la hoja de ruta.
- **Sin caché del navegador.** La documentación oficial de Playwright lo desaconseja: restaurar el caché tarda lo mismo que bajar los binarios (`playwright.dev/docs/ci`, consultada el 2026-10-05). La skill `playwright-best-practices` propone cachear `~/.cache/ms-playwright` y correr `install-deps` cuando hay acierto. Se sigue la documentación oficial, y `actions/cache` sería otra acción para fijar. Si el tiempo medido de la instalación domina el del job, se reevalúa con una clave por versión de Playwright.
- **Siempre `chromium --only-shell`:** sin nombrar un navegador, `--only-shell` instala igual Firefox y WebKit. Lo dice `registry/index.ts` de 1.63.0: sin argumentos instala todo lo que viene por defecto, menos el Chromium completo.

**Instalación por primer uso.** `AGENTS.md` pide no agregar dependencias por anticipado. Cada paquete entra con su primer caso real, y cada descarga pide permiso (hoja de ruta, «Acciones del usuario»):

1. F1 instala `vitest` y `@playwright/test`, y baja el navegador.
2. La pila de DOM (`jsdom` y Testing Library) y el proyecto `jsdom` de la configuración llegan con la primera spec de componente, que se espera en F3.
3. `fishery` llega con la primera factory.

### 5. Relación con `qa/`

Los checks de dominio siguen: no se migran, y no hay migración en bloque. Un check atado al legacy se retira en el PR que migra su objeto, y ese PR lista la correspondencia: cada escenario del check queda cubierto por una spec o un E2E, o se descarta con su motivo por escrito. Ningún check se retira por adelantado.

| Check | Qué carga hoy | Quién lo reemplaza | Cuándo |
| --- | --- | --- | --- |
| `boot-check` (10) | `main.tsx` empaquetado sobre el DOM falso; sólo navega por hash | E2E de arranque y de enlaces | Se ajusta con cada port y se retira en F10 |
| `app-shell-check` (51) | `app.js` real con adaptadores falsos | Specs de `features/progress-backup` y `entities/guide`, y E2E y specs de componente por página | El dominio en F2; las páginas en F3, F4, F8 y F9 |
| `load-order-check` | El texto de `main.tsx` | Nada: fija el orden de carga del legacy | Cada port edita su tabla, A2 la vuelve orden de ejecución y F10 la retira |
| `lab-bridge-check` (21) | `campaign.js` y `systems.js` reales con un `TallerLab` falso | Specs de las funciones puras de los puentes | Se apunta a ellas en F2; el contrato de HTML se retira en F7 |
| `lab-state-check` (37) | `lab.js` real y el motor | Specs del almacén del laboratorio y, para `openTab` y la interfaz, specs de componente y de hooks | El dominio en F2; la interfaz en F7 |
| `quest-explorers-check` (47) | `frontend/quest-explorers.js` por ruta | Specs del modelo y, después, de los componentes | El modelo en F2; la interfaz en F7 |

Los demás checks (`campaign`, `systems-*`, `content-*`, `curriculum-*`, `exercise-evidence`, `route-progress`, `versioned-storage`, `shared-lib`, `runner`, `atlas`, `project-kit` y `build-check`) siguen como están. `systems-check`, `project-kit-check` y `runtime-check` pasan a importar el catálogo y el almacén cuando F2 los vuelva módulos. Vitest se suma para el código nuevo o movido, no reescribe lo que ya se prueba.

## Medidas

Medidas el 2026-10-05, sin instalar ni bajar nada. Las de npm salen de `npm view <paquete>@<versión> dist.unpackedSize`; el tamaño comprimido de cada tarball, de un pedido de un byte con `Range`, y el de los navegadores, de un `HEAD` a la URL de descarga. Un MB son 10^6 bytes.

**Paquetes directos** (desempaquetados):

| Paquete | Bytes |
| --- | --- |
| `vitest` 5.0.3 | 2 759 444 |
| `jsdom` 30.1.2 | 5 533 799 |
| `@testing-library/react` 16.3.3 | 339 581 |
| `@testing-library/dom` 10.4.2 | 2 467 302 |
| `@testing-library/user-event` 14.6.7 | 437 525 |
| `@testing-library/jest-dom` 7.0.1 | 331 873 |
| `fishery` 2.4.0 | 135 590 |
| `@playwright/test` 1.63.0 | 28 544 |
| `playwright` 1.63.0 | 5 094 512 |
| `playwright-core` 1.63.0 | 13 453 369 |

**Lo que suma cada etapa de instalación**, con sus dependencias y sin contar lo que ya está en `package-lock.json`:

| Etapa | Paquetes nuevos | Desempaquetado | Comprimido |
| --- | --- | --- | --- |
| `vitest` | 16 | 3,86 MB (3 863 678 B) | 0,99 MB (992 368 B) |
| Pila de DOM: `jsdom` y Testing Library | 56 | 26,27 MB (26 272 590 B) | 5,03 MB (5 027 769 B) |
| `fishery` | 2 | 0,19 MB (189 789 B) | 0,04 MB (42 617 B) |
| `@playwright/test` | 3 | 18,58 MB (18 576 425 B) | 4,03 MB (4 031 390 B) |
| **Total** | **77** | **48,90 MB (48 902 482 B)** | **10,09 MB (10 094 144 B)** |

F1 instala `vitest` y `@playwright/test`: 19 paquetes, 22,44 MB desempaquetados y 5,02 MB comprimidos.

**Navegador** (Playwright 1.63.0, Chrome for Testing 153.0.8010.12; `cdn.playwright.dev` redirige a `storage.googleapis.com/chrome-for-testing-public`):

| Descarga | Bytes comprimidos |
| --- | --- |
| Chrome Headless Shell, linux x64 | 119 809 080 (119,8 MB) |
| ffmpeg, que acompaña a cualquier navegador | 2 376 500 (2,4 MB) |
| **`playwright install --only-shell chromium`** | **122 185 580 (122,2 MB)** |
| Chrome for Testing completo, linux x64: lo que `--only-shell` evita | 195 836 009 (195,8 MB) |
| `playwright install chromium`, sin `--only-shell` | 318 021 589 (318,0 MB) |
| Chrome Headless Shell, macOS arm64 y x64 | 98 831 293 y 104 060 463 |

**Qué no se midió y qué es estimación:**

- Los totales de npm son una estimación. Un script resolvió los rangos con `npm view`, no con el resolvedor de npm, así que npm puede elegir otras versiones transitivas o deduplicar distinto. No cuenta las dependencias opcionales de plataforma (como `fsevents` en macOS).
- No se midieron los paquetes de sistema que instala `--with-deps` ni el tamaño en disco del navegador descomprimido. La documentación de Playwright cita 281 MB para el Chromium completo.
- No se midió el tiempo de ningún paso de la CI.
- No se mide Jest por el tamaño de `jest`: es un metapaquete de 6,7 KB, y comparar así engañaría.

## Alternativas

- **Jest en lugar de Vitest:** duplica la transformación de Vite. El proyecto es ESM de punta a punta, y el soporte de ESM de Jest sigue siendo experimental: pide `node --experimental-vm-modules`, `jest.mock` no aplica a módulos ES y `jest.unstable_mockModule` está en desarrollo (documentación de Jest, consultada el 2026-10-05). Además necesita su propio transformador de TS y TSX y su entorno `jest-environment-jsdom`. Se pagaría un segundo canal de transformación que puede divergir del build. No se descarta por tamaño.
- **Modo navegador de Vitest** (`@vitest/browser-playwright` 5.0.3, un paquete de 54 KB): corre las specs en un navegador real y reusaría el que instala Playwright. Es el posible uso posterior para lo que jsdom no cubre, como los diálogos nativos y el layout que necesita CodeMirror. No se adopta ahora: exige un navegador en `npm test`, y esa etapa corre en la imagen web, que no lo tiene. Si se adopta, será como un proyecto aparte que sólo corre donde hay navegador.
- **Cypress** 16.1.1: su paquete trae un `postinstall` que baja su binario, de 251,2 MB comprimidos. Como `npm ci` corre también en las dos imágenes de Docker, cada construcción bajaría el binario sin que nadie dé permiso, salvo que se configure `CYPRESS_INSTALL_BINARY=0` en cada lugar. Playwright no tiene scripts de instalación (`npm view playwright@1.63.0 scripts` está vacío): `npm ci` no baja ningún navegador. Las skills instaladas del proyecto (`playwright-best-practices` y `webapp-testing`) están hechas para Playwright.
- **happy-dom en lugar de jsdom:** queda como salida si jsdom estorba, por ejemplo por los diálogos. No se evaluó su soporte.
- **MSW para la red de las specs:** no se adopta. Los módulos reciben el transporte por inyección y el E2E usa `page.route`. Se reevalúa cuando A3 y A4 sumen pedidos a `/api`.

## Consecuencias

- **El bundle no cambia.** Todo lo nuevo son `devDependencies` y ninguna es alcanzable desde `frontend/src/app/main.tsx`. El presupuesto de `qa/build-check` (menos de 2 500 000 caracteres de HTML) queda intacto, y ese check sigue siendo la guarda.
- **`npm test` crece** y su etapa de la imagen web también: `frontend/Dockerfile` corre `npm run build && npm test && npm run lint && npm run format:check`.
- **Docker no se toca,** pero las dos etapas que corren `npm ci` instalan todas las `devDependencies`: la de `frontend/Dockerfile` y la etapa `curriculum` de `backend/api/Dockerfile`, que las necesita porque el generador usa `yaml`. Con la pila completa suman 77 paquetes a los 243 del lockfile. El texto de «Acciones del usuario» de la hoja de ruta del backend («243 dependencias») deja de ser exacto. Si el costo molesta, se decide aparte.
- **Node:** `jsdom` 30.1.2 pide `^22.22.2 || ^24.15.0 || >=26.0.0` y `vitest` 5.0.3, `^22.12.0 || ^24.0.0 || >=26.0.0`. La imagen que fija `frontend/Dockerfile` por digest es `node:24.21.0-alpine` (verificado en Docker Hub el 2026-10-05), el Node local es el 24.21.0 y la CI usa `node-version: 24`.
- **Al adoptarlo, en el mismo cambio:** `AGENTS.md` (comandos), `qa/AGENTS.md` (la tabla de checks y las reglas de pruebas), `docs/agent-skills.md` (su «Alcance» deja de ser cierto) y el principio II de la constitución, como PATCH.
- **Riesgo de pruebas inestables:** la red sirve de base de cada port, así que un test inestable contamina todos. El plan de F1 la corre varias veces seguidas con `--repeat-each` antes de darla por buena.
- **El Chrome Headless Shell no es el navegador del alumno:** cubre el motor Blink y no Firefox ni Safari.

## Queda fuera

- **El router y nuqs:** se deciden con un spike en el ítem del shell (F10). Ahí también se mide su peso contra el presupuesto de tamaño.
- **Zustand:** entra con su primer caso real, como pide `AGENTS.md`.
- **Metas de cobertura:** la skill `react-testing` propone umbrales de 70 a 90 %. El proyecto no los adopta, igual que con `php-pro`: manda `AGENTS.md`.
- **Pruebas de accesibilidad con axe, regresión visual, Firefox y WebKit, sharding y un E2E contra el stack de Docker:** se evalúan cuando haya un caso real.
