# Research: F1 · Red de seguridad del port del front

Las decisiones de diseño del plan, con su motivo, sus alternativas y lo que se midió. Las que cambian algo del [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) están además en «Dónde el plan se aparta del ADR 0008», en [plan.md](./plan.md).

## Cómo se verificó

Se planificó sin tocar el repositorio ni bajar nada.

1. **La copia.** `git archive` de `spec/front-react` (sobre `ec4d829`, que ya tiene `master` mergeado) en un directorio aparte, fuera del repositorio. El `node_modules` es un enlace al del worktree de F1, donde el coordinador ya había instalado `vitest` 5.0.3 y `@playwright/test` 1.63.0; el Chrome Headless Shell 153.0.8010.12 ya estaba en `~/.cache/ms-playwright`. `npm run curriculum` y `vite build` dejaron un `dist/index.html` de 2 202 074 bytes, el mismo tamaño que la evidencia de A1.
2. **Las sondas.** Pruebas de Playwright de un solo uso, contra `vite preview`, para saber qué hace el build: la consola y la red de las ocho vistas, qué enlaces recargan, el cambio de idioma y el historial, los valores computados de las reglas de CSS en cuatro anchos (la décima regla, en cinco), la respuesta de un Playground simulado, el arranque con la fixture de master y con el almacenamiento bloqueado, y el temporizador con `page.clock`.
3. **El código del plan.** Los 29 archivos nuevos del plan salen de esa copia, sin retocar: 106 pruebas de punta a punta en 8 specs y 3 pruebas de Vitest en 2 specs.
4. **Lo que corrió:**
   - la red, en verde, y cinco veces seguidas con `--retries=0`: 530 de 530;
   - Vitest: `npx vitest run --config frontend/vitest.config.ts`, 2 archivos y 3 pruebas;
   - `tsc` de `frontend/tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.qa.json` y `qa/e2e/tsconfig.json`; `npm run lint` (0 errores y ningún aviso de los archivos nuevos) y `npm run format:check`;
   - `npm test` con los scripts nuevos: los 30 checks y Vitest;
   - las 31 roturas del código de producción (más 2 variantes de la regla muerta y 4 de la décima regla), cada una detectada por la spec que dice el plan;
   - la config sin `dist/`: «Falta dist/index.html: corré npm run build antes de npm run test:e2e.»;
   - `playwright install --dry-run --only-shell chromium`, que sólo imprime lo que bajaría;
   - el YAML del job `front`, que se lee sin error, y los SHA de `actions/upload-artifact` v7.0.1 y de `actions/cache` v6.1.0, consultados con `gh api`.
5. **Lo que no corrió:** el job real de la CI, la descarga del navegador y su tiempo, la imagen web de Docker, macOS, Firefox y WebKit.
6. **Una segunda vuelta, con la spec de F2.** La spec de F2 advirtió que `.quest-direct-lock` no estaba protegida. Se sumó la décima regla, `.quest-direct-lock` (la R10 de CSS, que no es esta sección R10), y `.navigation .nav-symbol` a la R2 de CSS, en la misma copia y se repitió lo que depende de la spec: la red completa (106 pruebas), las cinco corridas, la corrida con `CI=1` y un worker, `tsc`, `eslint` y `prettier`, y las roturas de la décima regla y de `.nav-symbol`. Vitest y `npm test` no se repitieron: la spec nueva es de la red y no entra en ellos.
7. **Efectos en el worktree del coordinador.** Las corridas de Vite y de Vitest dejaron cachés ignoradas en su `node_modules` (`.vite` y `.vite-temp`). No tocaron ningún archivo versionado. Se borraron al terminar.

## R1. Verificar el plan contra el build, en una copia aparte

**Decisión.** Correr el código de referencia contra el build real antes de escribir el plan, en una copia fuera del repositorio.

**Motivo.** La spec pide avisar al usuario antes de seguir si la recarga difiere de lo que supone la hoja de ruta (FR-004), y esa recarga define el router de F10. Además, varios valores del plan (localizadores, textos, valores de CSS) sólo se conocen corriéndolos: la primera versión de la spec afirmaba cosas que el build desmintió (ver «Correcciones del plan» en la spec).

**Alternativas.** Planificar sin correr: el plan habría llevado localizadores y valores sin verificar, y las correcciones habrían salido en la implementación. Instalar en el repositorio: descartado, el encargo pedía no instalar.

## R2. La recarga se confirmó: los 11 enlaces recargan

**Decisión.** La red fija la recarga como comportamiento actual, con un marcador en `window`.

**Evidencia.** Los 11 enlaces que cambian la query (`data-model.md`, §4) pierden el marcador. Los de sólo hash y los que reescriben la query con `history.replaceState` lo conservan. La URL no alcanza: `?#laboratorio` desde `/#recorrido` termina en `/#laboratorio` porque el laboratorio reescribe la query en el mapa, pero el documento es otro. Con la recarga se pierden el temporizador de foco, la sesión del Atlas y la traza del modelo de Sistemas.

**Consecuencia.** El diseño del router de F10 no cambia: un router que intercepte esos enlaces cambiaría el comportamiento, y los escenarios L1 a L11 lo detectan.

## R3. El servidor: `127.0.0.1`, un puerto por variable y sin reutilizar

**Decisión.** `webServer` corre `npm run preview -- --host 127.0.0.1 --port <E2E_PORT> --strictPort` con `reuseExistingServer: false`, y `cwd` en la raíz.

**Evidencia.** Sin `--host`, `vite preview` escucha en `localhost`, que acá resuelve a `[::1]`: `ss -ltn` muestra sólo `[::1]:4173` y `curl http://127.0.0.1:4173` no conecta. Playwright sondea `http://127.0.0.1:4173` y terminó con «Timed out waiting 60000ms from config.webServer».

**Motivo del puerto y del servidor.** Varios worktrees corren a la vez (así se reparte el trabajo). Con un puerto fijo chocarían y, con `reuseExistingServer`, una corrida probaría el `dist/` de otro worktree sin avisar.

**Alternativas.** Dejar el host por omisión y sondear `localhost`: depende de cómo resuelva cada máquina. Un servidor propio con `node:http`: otra pieza que mantener, para lo que `vite preview` ya hace.

## R4. La config de Playwright

**Decisión.**

- `fullyParallel: true`, `forbidOnly` en la CI, un reintento en la CI y ninguno en local, y traza en el primer reintento (los valores iniciales del ADR).
- `workers: 1` en la CI y los de Playwright por omisión en local.
- Informe HTML (`playwright-report/`) y resultados (`test-results/`) en la raíz, sólo en la CI; en local, el reporter `list`.
- `locale: 'es-AR'` y `timezoneId: 'America/Argentina/Buenos_Aires'`, para que fechas y textos no dependan de la máquina (el laboratorio escribe fechas con `toLocaleDateString('es-AR')`).
- Un solo proyecto, `chromium` con «Desktop Chrome». En headless usa el Chrome Headless Shell.

**Motivo de `workers: 1`.** La guía de CI de Playwright recomienda un worker en la CI «para priorizar la estabilidad y la reproducibilidad» (`playwright.dev/docs/ci`, consultada el 2026-10-05). La suite tardó unos 35 s con uno (106 pruebas) y unos 12 s con 8 workers en local.

**Alternativas.** Dos workers en la CI: no se midió y el costo de la estabilidad es chico. Sharding: no hace falta con esta duración.

## R5. Las guardas: un solo lugar y una prueba para cada una

**Decisión.** Dos fixtures automáticas, `pageIssues` y `strictNetwork`, que fallan el test al terminar. La lista blanca (`console-allowlist.ts`) empieza vacía, y un test puede esperar un error con `expectIssue(patrón, motivo)`. `guards.spec.ts` prueba cada guarda con `test.fail()`.

**Motivo.** Q3 pide que un error de la página o de consola falle el test, con una lista blanca explícita y comentada. La skill `playwright-best-practices` propone la misma forma («auto-fail fixture»). Fallar al terminar, y no al ocurrir, deja que el test llegue a sus propias aserciones y muestre las dos fallas. `expectIssue` exige además que el error haya ocurrido, para que una excepción no sobreviva a su causa.

**Evidencia.** Las ocho vistas arrancan sin un solo `console.error` ni excepción en el Chrome Headless Shell, así que la lista blanca queda vacía. Quitar `issues.assertClean()` hace fallar 3 de las 4 pruebas de `guards.spec.ts`; quitar `network.assertNothingBlocked()`, 1; quitar las dos, las 4, todas con «Expected to fail, but passed.».

**Riesgo.** Una prueba `test.fail()` pasa por cualquier falla, también por una ajena. Las cuatro pruebas son de dos líneas y comparten sus localizadores con las specs de la onda 2, que las ejercen.

**Alternativas.** Un `afterEach` por spec: se olvida. Registrar sin fallar: no detecta nada (Q3, opción C).

## R6. Cómo se detecta una recarga

**Decisión.** `observeReload(page, acción)`: pone `window.__e2eMarker`, ejecuta la acción, espera `load` y devuelve si el marcador desapareció.

**Motivo.** Un cambio de URL no prueba que el documento se recargó; es lo que el mapa no verificó. Playwright espera a que una navegación que inicia el clic se confirme antes de devolver el control, y `load` deja asentado el documento nuevo, así que no hace falta esperar por tiempo. La prueba corrió cinco veces seguidas sin reintentos.

**Alternativas.** Mirar sólo la URL: engaña (`?#laboratorio` termina en `/#laboratorio`). Contar pedidos de tipo `document`: depende de que el servidor no sirva de caché. `performance.getEntriesByType('navigation')`: no distingue una navegación por enlace de la primera carga.

## R7. Cómo se siembra el progreso y se miden las escrituras

**Decisión.** `storage.seed` registra un script de inicio del contexto que escribe las claves y deja una marca en `sessionStorage`. `storage.watchWrites` registra otro, después, que envuelve `Storage.prototype.setItem` y `removeItem`. `storage.block` define un `localStorage` cuyo acceso lanza.

**Motivo.** Sembrar antes de que corra la página es lo que hace el alumno que ya tiene progreso, y no pasa por el código que se prueba. La marca en `sessionStorage` sobrevive a una recarga y un contexto nuevo empieza vacío, así que una recarga no pisa lo que la app guardó. El orden de los scripts es el de registro, por eso `watchWrites` va después de `seed`.

**Evidencia.** Con las cuatro claves de master, las ocho vistas no hacen ninguna escritura, el texto de las cuatro claves queda idéntico y no aparece ninguna clave `:respaldo` ni aviso. Con el almacenamiento bloqueado, el aviso es «No se pudo leer o guardar el avance. Podés exportarlo al terminar.» y el pie dice «Exportá para conservar tu avance», sin una sola excepción. «No escribe» no es observable ahí: el acceso mismo lanza.

**Alternativas.** Sembrar por la interfaz: lento y pasa por el código que se prueba. Un `page.goto` previo y `page.evaluate`: la primera carga ya arrancó con el almacenamiento vacío.

## R8. Los dobles del compilador

**Decisión.** Cuatro resultados armados a mano para `rust-02` (Rust) y `go-113` (Go), y `page.route` sobre el endpoint del Playground de cada lenguaje.

**Evidencia.**

- Playwright agrega los encabezados CORS cuando responde un pedido de otro origen: el doble no los necesita (se probó con y sin `access-control-allow-origin`) y el pedido previo (`OPTIONS`) no llega a la ruta.
- El formato del marcador, `__TALLER_TEST__<id>:<PASS|FAIL>`, es el del cliente actual (`run-outcome.ts`), el que documentan el ADR 0003 (punto 7) y `qa/exercise-evidence-check.ts`. El ADR 0005, §5, describe otro: `__TALLER_TEST__<nonce>:<id>:<PASS|FAIL>` con un sentinela, que es el protocolo del servidor de A4. Por eso la spec corrige su cita de «ADR 0003 y 0005».
- Con el doble de transporte (`route.abort('failed')`), el navegador registra `Failed to load resource: net::ERR_FAILED` como `console.error`: las pruebas de transporte lo esperan con `expectIssue`.

**Motivo.** El valor esperado sale del formato documentado y no de `buildProgram`, como pidió Q4. El doble aprueba aunque el código inicial no compile: la prueba es del cliente (qué hace con la respuesta), no del compilador.

**Alternativas.** Derivar los resultados de `buildProgram` y de las soluciones de referencia: toma el valor esperado del código que se prueba (Q4, opción B).

## R9. El contrato de CSS

**Decisión.** Una prueba por cada grupo de reglas, con el estilo computado de las propiedades que fijan la regla, en los anchos donde una media query empieza o termina de valer (981, 850, 650 y 590 px), más el movimiento reducido y la animación del indicador de ejecución. Son diez grupos: los nueve que lista el mapa (§7) y `.quest-direct-lock`, que el mapa omite. Los valores salen de las hojas y están en [data-model.md](./data-model.md), §7.

**Evidencia.** Los valores se midieron en el build y coinciden con lo que dicen las hojas. Se eligieron propiedades que no dependen del ancho ni de las fuentes: sólo se cuenta cuántas columnas tiene la navegación a 590 px, no su tamaño en píxeles. Cada grupo se rompió a propósito en su hoja y la prueba falló (`quickstart.md`).

**La regla muerta.** `.navigation a:last-child { grid-column: auto }` aparece en `campaign.css` (a 650 px) y en `lab.css` (a 590 px), y ninguna otra regla le da una columna a los enlaces de la navegación: repite el valor inicial. Cambiar el valor de la copia de `campaign.css`, que carga después y gana, hace fallar la prueba. Cambiar sólo la de `lab.css`, o borrar cualquiera de las dos, no se detecta, y es lo esperado: no cambia nada que el alumno vea. F2 puede borrarlas.

**Cómo se eligieron las diez.** El mapa lista nueve. La spec de F2 advirtió que `.quest-direct-lock` no estaba entre ellas, y se revisó el resto con un script de un solo uso, fuera del repositorio: las clases que escribe cada vista (`app.js`, `lab.js`, `lab-explorers.js`, `campaign.js`, `systems.js`, `quest-explorers.js`, `src/index.html` y los componentes del Atlas, incluidas las que sólo aparecen dentro de una interpolación) contra los selectores de cada hoja. Una clase cruza hojas si una hoja la define y la escribe una vista que no es su dueña.

- El script encontró ocho de las nueve del mapa: `.lab-nav-count`, `.navigation`, `.sidebar` y `.sidebar-bottom`, `.sr-only`, `.quest-banner`, `.quest-lab-context` (que también escribe Sistemas), `.navigation a:last-child` y `.lab-empty`. La novena, el `touch-action` global, es un selector de elementos y el script no lo ve. Fuera del `touch-action`, ninguna hoja de vista tiene un selector de elemento suelto.
- Encontró además una declaración que el mapa no nombra: `.navigation .nav-symbol` (`font-size` de 14 px a 590 px), que está en el mismo bloque que la navegación. Se sumó a R2.
- `.quest-direct-lock` no sale del script: la escribe `campaign.js`, dueño de su hoja, aunque la dibuje dentro del laboratorio. Salió de leer los puentes (mapa, §3.2) y es la décima (R10 de CSS). Los otros dos puentes que devuelven HTML, `exerciseContextHTML` de campaña y de Sistemas, sólo escriben `.quest-lab-context`.

**Lo que quedó afuera.**

- Los modificadores de clases base dentro de un contenedor propio (`.quest-world-head .eyebrow`, `.sys-card .button`, `.lab-toolbar .search-wrap`, `.checkpoint-options .correct`, `.sys-cell.active`): la regla sólo vale dentro de ese contenedor, que es de su vista.
- `.cm-enhanced` (`lab.css`), que dibuja el editor compartido (`shared/ui/code-editor`): sólo lo monta el laboratorio (`lab.js`). La hoja y la vista se portan juntas, así que la cubre la E2E de F7 (Q1).
- Lo que el script no ve: las clases armadas sin un literal entre comillas, los selectores de atributo y de `id`, y los estilos en línea.

**Motivo.** Q2 eligió el estilo computado: es portable entre Linux y macOS y barato, a diferencia de las capturas, que dependen del sistema operativo y de las fuentes. La décima regla sigue el mismo criterio: protege a F6, que borra `campaign.css` antes de que F7 retire el bloque de bloqueo del laboratorio.

**Alternativas.** Capturas de pantalla (Q2, opción B) y revisión manual (opción C). Para la décima regla, esperar a que F6 la proteja en su propia E2E: llega tarde, porque F6 es quien borra la hoja y su E2E mide la vista de campaña, no el laboratorio.

## R10. Vitest: una sola config, un proyecto y sin setup

**Decisión.** `frontend/vitest.config.ts` reusa `viteConfig` con `mergeConfig` y suma `name: 'node'`, `environment: 'node'`, `include: ['**/*.spec.ts']` y `cacheDir`. Sin `globals`, sin `setupFiles` y sin el proyecto `jsdom`.

**Evidencia y motivo.**

- La raíz de Vite es `frontend/src` (`vite.config.ts`), y Vitest la hereda: las specs se buscan desde ahí y viven junto a su módulo, como pide el ADR. Corre 2 archivos en unos 0,16 s.
- `import viteConfig from './vite.config.ts'` lleva la extensión: sin ella, Vite avisa que su cargador nativo dejará de aceptarla. Con ella, `tsc` da TS5097 si `tsconfig.node.json` no habilita `allowImportingTsExtensions`; el flag es compatible con el `noEmit` del `tsconfig.json` raíz y ya lo usan los checks de `qa/`.
- Por la raíz, el caché de Vitest caía en `frontend/src/node_modules/.vite`; `cacheDir` lo lleva a `node_modules/.vite`, que Git y Docker ya ignoran.
- La pila de DOM llega con la primera spec de componente (ADR, «Instalación por primer uso»): F3 pasa la config a `projects` y suma el setup.

**Las dos specs.** La del almacén vive en `entities/guide/model/` porque importa `shared/lib` (capa de abajo) y `./route-progress` (su propio slice). La de los motores vive en `app/` porque importa `entities/campaign` y `entities/systems-workshop`, que no se importan entre sí, y su asunto es el orden de arranque. El `parse` y el `merge` del recorrido son copias dentro de la spec (`parseProgress` y `mergeStoredRoute` viven dentro de `app.js`), y el valor esperado es el caso que el mapa verificó (el favorito vuelve y lo que hizo la primera instancia sobrevive), no el resultado de la fusión.

**Alternativas.** Dos proyectos desde ya: pide `jsdom`, que F1 no instala. `globals: true`: el ADR lo descarta. Un Page Object o un E2E para los riesgos: son lógica de módulos, sin DOM, y corren en milisegundos.

## R11. TypeScript: un `tsconfig.json` propio para `qa/e2e`

**Decisión.** `qa/e2e/tsconfig.json` (`lib: ES2023 y DOM`, `module: ESNext`, `moduleResolution: Bundler`, `types: node`), `tsconfig.qa.json` excluye `qa/e2e` y `npm run typecheck` suma `tsc --noEmit -p qa/e2e/tsconfig.json`. Los imports no llevan extensión.

**Evidencia.** Con `tsconfig.qa.json` (NodeNext y sintaxis borrable, ADR 0002) los archivos dan TS2835 (hace falta la extensión) y TS1294 (propiedades de parámetro). Playwright transpila TypeScript por su cuenta y los callbacks de `page.evaluate` usan `window` y `localStorage`, que piden `DOM`. El ADR 0008 ya preveía un `tsconfig.json` propio.

## R12. Page Objects, fixtures y funciones sueltas

**Decisión.** Page Objects para las vistas que tocan los escenarios (el shell, el laboratorio, campaña, Sistemas y el Atlas), fixtures para lo que tiene ciclo de vida (las guardas, el doble, el almacenamiento) y funciones sueltas para lo que no (`urls`, `observeReload`, `computedStyle`).

**Motivo.** Es el reparto de la skill `playwright-best-practices` (`pom-vs-fixtures`) y lo que fija el ADR 0008: los métodos expresan intención del alumno, las aserciones van en la spec y el ciclo de vida, en fixtures. Los demás Page Objects (Biblioteca, Proyecto, Método y Recorrido) nacen con su port (Q1).

## R13. La CI y la caché del navegador

**Decisión.** Tres pasos al final del job `front`: `npm run test:e2e:install -- --with-deps`, `npm run test:e2e` con `id: e2e` y, si ése falla, `actions/upload-artifact` con `playwright-report/` y `test-results/` (siete días). Sin caché del navegador, como dicen el ADR 0008 y la spec.

**Motivo.** El ADR la dejó afuera con la documentación oficial de Playwright (restaurar la caché tarda lo mismo que bajar los binarios, y las dependencias del sistema no se cachean); la skill `playwright-best-practices` propone lo contrario, y se siguió el ADR. El encargo de F1 pedía diseñar la caché: el diseño queda listo, y se aplica sólo si T015 mide que el paso de instalación domina el job (más de la mitad de su tiempo). `actions/cache` sería otra acción para fijar.

**El diseño de la caché, sin aplicar y sin verificar.** Una clave por versión de Playwright; en un acierto, sólo `install-deps`, porque las dependencias del sistema no se cachean:

```yaml
      - id: playwright
        run: echo "version=$(node -p "require('@playwright/test/package.json').version")" >> "$GITHUB_OUTPUT"
      - id: browser-cache
        uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.playwright.outputs.version }}-chromium-headless-shell
      - if: steps.browser-cache.outputs.cache-hit != 'true'
        run: npm run test:e2e:install -- --with-deps
      - if: steps.browser-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium
```

**SHA.** `actions/upload-artifact` v7.0.1 es `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` y `actions/cache` v6.1.0 es `55cc8345863c7cc4c66a329aec7e433d2d1c52a9`, ambos consultados con `gh api repos/<acción>/git/ref/tags/<tag>` el 2026-10-05.

**El `if` del paso que sube el informe.** Con `failure()` solo, el paso también corre cuando falla `npm test` o `lint` antes de la red: no hay informe y avisa en vano. `id: e2e` y `steps.e2e.outcome == 'failure'` lo limitan a la red.

## R14. Qué hacen `npm test`, la imagen y las herramientas con los archivos nuevos

- `npm test` corre `node qa/run-checks.ts && vitest run --config frontend/vitest.config.ts`. `pretest` ya corre `typecheck`, que ahora compila `qa/e2e/`. La red no entra en `npm test`: la imagen web corre `npm test` en su etapa de build y no tiene navegador.
- `frontend/Dockerfile` hace `COPY . .`: `qa/e2e/` y `frontend/vitest.config.ts` entran a la etapa de build, donde `npm run build`, `npm test`, `npm run lint` y `npm run format:check` los recorren. El Dockerfile no cambia (FR-022). No se corrió la imagen (T016).
- ESLint y Prettier recorren `qa/e2e/` sin cambios de configuración: ya tratan `qa/**/*.ts` con globals de Node y formatean todo menos lo que `.prettierignore` excluye. Los archivos nuevos no suman avisos de complejidad.
- `test-results/` y `playwright-report/` ya están en `.gitignore`, `.dockerignore` y `.prettierignore`.
- Playwright no tiene scripts de instalación: `npm ci` no baja ningún navegador (ADR 0008).

## R15. Lo que no se hace

- **Capturas de pantalla, axe, MSW, `fishery` y `jsdom`:** fuera, por el ADR y la spec.
- **Un proyecto móvil o más de un navegador:** una prueba que necesita otro ancho lo pide con `page.setViewportSize` o `test.use({ viewport })`.
- **`waitForTimeout`, `networkidle` y reintentos que tapen una prueba inestable:** una prueba inestable se arregla con una espera por aserción.
- **Un E2E con dos pestañas:** la fusión entre pestañas ya la prueba `versioned-storage-check` y la reproduce la primera spec de Vitest.
- **La biblioteca, el proyecto, el método y el recorrido:** sus flujos los trae cada port (Q1).

## Mediciones

| Qué | Valor | Dónde |
| --- | --- | --- |
| Pruebas de punta a punta | 106 en 8 specs (`guards` 4, `views` 12, `url-contract` 30, `reload` 17, `bridges` 9, `cycle` 8, `startup-storage` 4 y `css-contract` 22) | copia local |
| Specs de Vitest | 2 archivos y 3 pruebas, en unos 0,16 s | copia local |
| La suite, 8 workers | unos 12 s (106 pruebas); cinco corridas seguidas con `--retries=0`, 530 de 530, en unos 57 s | copia local |
| La suite, `CI=1` y un worker | unos 35 s (106 pruebas) | copia local |
| Roturas del código de producción detectadas | 31, más 4 variantes de la décima regla; y 2 variantes de la regla muerta de R8 que no se detectan | copia local |
| Tamaño de `dist/index.html` | 2 202 074 bytes, igual que la evidencia de A1 | copia local |
| Los paquetes, el navegador y las dependencias | 19 paquetes y 22,4 MB; 122,2 MB de navegador (las medidas del ADR 0008) | ADR 0008 |
| El tiempo de la CI y de la instalación del navegador | sin medir: lo mide T015 con el primer PR | — |
