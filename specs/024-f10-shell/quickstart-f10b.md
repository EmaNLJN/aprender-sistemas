# Quickstart: F10b · La raíz única, el shell y el router

Los comandos que verifican F10b, desde la raíz del repositorio. [plan-f10b.md](./plan-f10b.md) dice qué tarea usa cada sección.

## 1. La línea base y las cifras del `dist` (T015 y T033)

1. **La red, en verde sobre la base de F10b** (`master` con F10a):

   ```sh
   npm ci --offline --no-audit --no-fund
   npm run build && npm test && npm run lint && npm run format:check
   E2E_PORT=4173 npm run test:e2e
   ```

2. **El `dist`, en partes:** el mismo script de [quickstart.md](./quickstart.md), §1, paso 3. Anotá `chars`, `script`, `style`, `markup`, `dynamicImports` e `importMeta`.
3. **Lo que se espera de `import.meta` después del corte** (research-f10b.md, R13):

   ```sh
   grep -c "import(" frontend/src/app/boot/legacy-views.ts
   ```

   Lo esperado es el `importMeta` de la base menos ese número. `importMeta` nunca sube, y `dynamicImports` sigue en 0.
4. **El tope:** `grep -n "BOOT_SIZE_LIMIT =" qa/build-check.ts` (1 500 000).
5. **La complejidad:**
   - `npm run lint 2>&1 | grep -c complexity`;
   - por función: `npx eslint frontend --rule '{"complexity":["warn",{"max":1,"variant":"classic"}]}' 2>&1 | grep "Function"`, para la tabla del antes y el después.
6. **El inventario** (plan-f10b.md, §0.1):

   ```sh
   grep -rn "window\.\(Taller\|GUIDE_DATA\|RUST_\|GO_\|SYSTEMS_\)" frontend/ qa/
   grep -rn "declare global" frontend/src
   grep -n "() => import(" frontend/src/app/boot/legacy-views.ts
   grep -n "^import '.*\.css';" frontend/src/app/main.tsx
   grep -rln "legacy-sources" qa/
   grep -n "export function run\(Entry\|ModuleEntry\)" qa/lib/sources.ts
   test -f frontend/src/pages/admin/index.ts && echo "F12a en la base"
   ```

## 2. Cada unidad

| Unidad | Comandos | Esperado |
| --- | --- | --- |
| U1 | `npm run test:unit -- frontend/src/shared/config frontend/src/app/router frontend/src/app/shell` | Las specs de T016 a T020 en verde |
| U2 | `npm run test:unit -- frontend/src/app/boot/boot-screens.spec.tsx` | En verde |
| U3 | `npm run test:unit -- frontend/src/app/shell` | En verde |
| U4 | `npm test`, `node qa/seams-guard-check.ts`, `npm run build` y `E2E_PORT=4173 npm run test:e2e` | Todo en verde; cada check rehecho, con su conteo de T015 |
| U5 | La compuerta de plan-f10b.md, §0.2 | Todo en verde; SC-003 |
| U6 | `E2E_PORT=4173 npx playwright test --config qa/e2e/playwright.config.ts admin` | Las de F12a y `admin-route.spec.ts` en verde |
| U7 | `E2E_PORT=4173 npx playwright test --config qa/e2e/playwright.config.ts route-lesson` | En verde, y la comprobación con lector de pantalla del usuario |

## 3. SC-003 y los archivos que no cambian

```sh
test ! -e frontend/app.js && echo "sin app.js"
grep -rn "window\.Taller\|register-\|legacyViews\|startApp" frontend/
grep -rn "createRoot(" frontend/src --include=*.ts --include=*.tsx | grep -v "\.spec\."
git diff --stat <base> -- frontend/src/app/boot/content-gate.ts frontend/src/app/boot/session-gate.ts
```

Lo esperado:
- la primera imprime «sin app.js»;
- la segunda no imprime nada;
- la tercera imprime una línea, la de `frontend/src/app/boot/start-taller.tsx`;
- la cuarta no imprime nada.

## 4. Las comparaciones únicas (T033)

Corren fuera del repositorio, sobre dos raíces construidas: `$BASE` (un worktree descartable de la base de F10b) y `$UNIT` (la punta de F10b). Cada una se sirve con `npm run preview -- --port <puerto> --strictPort`, la base en 4501 y la punta en 4502.

### 4.1 El DOM del shell (FR-024, SC-004)

**La grilla:** las nueve rutas, los dos idiomas, con y sin avance, con el almacenamiento bloqueado y con y sin sesión de admin, con el doble de la API de F11a.
- **Sin avance:** un navegador vacío. **Con avance:** `frozenProgress`.
- **El almacenamiento bloqueado:** `StorageControl.block()`.

**Cómo se captura,** en cada estado y para cada raíz:
1. esperar a que la vista esté dibujada (`ShellPage.goto`);
2. mover el puntero a (0, 0);
3. tomar el `outerHTML` de `document.body`, con el contenido de `#main` vaciado;
4. normalizar:
   - quitar el envoltorio `<div id="app-root">` y dejar sus hijos;
   - tratar un `class=""` como un atributo ausente;
   - ordenar los atributos de cada elemento alfabéticamente;
   - quitar el `aria-pressed` de `<body>` sólo en la base, porque es la diferencia listada.

**Lo esperado:** 0 diferencias en todos los estados. El script es descartable y va en la scratchpad. Las cantidades (estados y elementos comparados) van al PR.

### 4.2 El estilo computado y el multiconjunto (SC-005)

Son los scripts de la unidad 8 de F2b (`specs/009-f2-seams/quickstart-f2b.md`, §3.1), con dos cambios:
- las páginas son las de la grilla de §4.1;
- el barrido suma los elementos del shell y lee todo el `<body>`, no sólo `#main`.

Las trampas de TR-13 aplican:
- el puntero va fuera antes de capturar;
- no se compara lo de adentro de un `<details>` cerrado;
- los textos de un nodo se comparan unidos.

**Lo esperado:**
- **el barrido:** 0 diferencias en los anchos de F1 (más 1 280 y 375 px), con el movimiento reducido encendido y apagado, en los dos idiomas;
- **el multiconjunto:** el de la base, menos `.admin-dialog` (si U6 se hizo) y más `.quiz-feedback:empty`.

**El control negativo:** en una copia de `$UNIT`, quitar `margin: 0 !important` de `.quiz-feedback:empty` y abrir una lección. El barrido tiene que dar diferencias en `#quiz-feedback`.

## 5. Las mutaciones

Cada una se aplica en una copia descartable de la punta de su tarea. Tiene que fallar la prueba nombrada.

Un texto partido en dos nodos por JSX no lo ve ninguna spec, porque el `outerHTML` es el mismo: lo ve el barrido de §4.2 (TR-13). Por eso los textos con números van armados con un template literal.

| Tarea | El cambio | Falla |
| --- | --- | --- |
| T016 | `routeFromHash` compara con `hash.includes('administracion')` | «falls back to the route for "#administracion/"» |
| T017 | En `worldLanguage`, `break` después del primer idioma encontrado | «lets Go win when the world is in both languages, like the loop of today» |
| T018 | `menuCounts` deja fuera `quests` | «counts the lab, the quests and the cores of both languages for the lab» |
| T019 | `notify` sin `clearTimeout` | «lets a second notice replace the first and restart the 4.5 s» |
| T020 | Sin la línea de `lastNavigation` | «draws once when popstate and hashchange both arrive for one navigation» |
| T021 | `createGateView` no mueve el foco después de `showFailure` | «draws the version failure and focuses «Reintentar», which calls the retry» |
| T022 | `NavigationMenu` pone `aria-current="page"` también cuando `current` es `null` | «marks no view on the administration route or before the content» |
| T028 | `leavePages` sin `labRunner.abort()` | «leaving the lab cancels the run and saves no result», de F7a (`lab-run.spec.ts`) |
| T030 | `resolveRoute` deja pasar `administracion` sin mirar `isAdmin` | «a student at #administracion sees the route, keeps the address and asks nothing of /api/admin» |
| T032 | `.quiz-feedback:empty` sin `margin: 0 !important` | «exists empty before an answer, as a polite status that takes no space» (el margen ocupa espacio) |
