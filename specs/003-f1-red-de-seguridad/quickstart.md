# Quickstart: F1 · Red de seguridad del port del front

Cómo comprobar, con F1 integrada, que cumple lo que dice la [spec](./spec.md). Los comandos van desde la raíz del repositorio. Los de las secciones 1 a 5 y 10 son los de la compuerta; las roturas (secciones 6 a 8) las hace K en T014 y cada dueño en su tarea.

## Requisitos

- Node 24 y `npm ci` hechos.
- El navegador, una vez por máquina: `npm run test:e2e:install`. Baja el Chrome Headless Shell (122,2 MB) y ya lo autorizó el usuario.

## 1. La red pasa contra el build actual

```sh
npm run build
npm run test:e2e
```

**Esperado:** `105 passed`. Es US5, escenario 1, y SC-001, SC-003 y SC-004: ninguna prueba toca `play.rust-lang.org` ni `play.golang.org`; si una lo intentara, la guarda de red la haría fallar.

## 2. Sin build, la red avisa

```sh
rm -rf dist
npm run test:e2e
```

**Esperado:** falla enseguida con «Falta dist/index.html: corré npm run build antes de npm run test:e2e.» (US5, escenario 2; FR-019). Después de `npm run build` vuelve a correr.

## 3. Una spec, o dos worktrees a la vez

```sh
npm run test:e2e -- specs/views.spec.ts
E2E_PORT=4174 npm run test:e2e -- specs/url-contract.spec.ts
```

`vite preview` usa `--strictPort`: dos corridas a la vez necesitan puertos distintos. Sin `E2E_PORT` el puerto es el 4173.

## 4. Vitest

```sh
npm run test:unit
npm test
```

**Esperado:** `test:unit` regenera `build/curriculum.json` y corre 2 archivos y 3 pruebas. `npm test` corre los 30 checks de `qa/` y después Vitest, sin navegador (FR-020). Las dos specs fijan los riesgos altos del mapa y pasan con el código de producción sin cambios (SC-005).

## 5. Cinco corridas seguidas, sin reintentos (SC-007)

```sh
npm run test:e2e -- --repeat-each=5 --retries=0
```

**Esperado:** `525 passed` (105 pruebas, cinco veces). Anotá el tiempo; con `CI=1 npm run test:e2e` corre con un worker, como en la CI.

## 6. Tres roturas deliberadas, una por contrato (SC-006)

Cada rotura se hace en una copia de trabajo y se deshace; ninguna se commitea. El asistente de abajo aplica un reemplazo, corre un comando y deja el archivo como estaba aunque el comando falle. Se guarda fuera del repositorio (`~/mutate.ts`, por ejemplo) y se corre con `node ~/mutate.ts <archivo> "<texto>" "<texto nuevo>" "<comando>"`. El texto a reemplazar tiene que aparecer una sola vez en el archivo.

```ts
// Throwaway helper, never committed: applies one text replacement to a file of the working copy,
// runs a command and puts the file back, whatever the command does.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [file, from, to, command] = process.argv.slice(2);
if (!file || from === undefined || to === undefined || !command) {
  throw new Error('Uso: node mutate.ts <archivo> <texto a reemplazar> <texto nuevo> "<comando>"');
}

const original = readFileSync(file, 'utf8');
const matches = original.split(from).length - 1;
if (matches !== 1) throw new Error(`Se esperaba una coincidencia en ${file} y hay ${matches}`);

writeFileSync(file, original.replace(from, () => to));
try {
  const result = spawnSync('sh', ['-c', command], { stdio: 'inherit' });
  console.log(`\nel comando terminó con el código ${result.status}`);
} finally {
  writeFileSync(file, original);
}
```

El comando de cada rotura reconstruye y corre la spec: `npx vite build --config frontend/vite.config.ts > /dev/null && npx playwright test --config qa/e2e/playwright.config.ts <spec>`. Después de la última, `npm run build`.

| # | Contrato | Archivo y cambio | Falla |
| --- | --- | --- | --- |
| 1 | Un adaptador sin `exerciseContextHTML` | `frontend/campaign.js`: quitá `exerciseContextHTML,` del objeto `window.TallerCampaign` | `bridges.spec.ts` (3 pruebas); en la red entera, 28 |
| 2 | Una forma de URL que deja de leerse | `frontend/lab.js`, en `mount`: `byId.get(params.get('ejercicio'))` por `byId.get(params.get('ejercicio_'))` | `url-contract.spec.ts`; en la red entera, 40 |
| 3 | Un arranque que escribe en `localStorage` | `frontend/app.js`: agregá `save();` antes del `render();` que cierra el arranque | `startup-storage.spec.ts` (1 prueba) |

**Esperado:** 3 de 3 detectadas. Es US5, escenario 4.

## 7. Las nueve reglas de CSS (SC-008)

Las roturas son las del cuadro de la tarea 4.7 de [plan.md](./plan.md): un valor de una declaración, en su hoja, y la prueba de su grupo falla. Con el mismo asistente y `css-contract` como spec.

**Esperado:** 9 de 9 detectadas por un cambio de valor. La regla del último enlace de la navegación (R8) sólo se detecta si cambia el valor de la copia de `campaign.css`; borrar cualquiera de las dos, o cambiar sólo la de `lab.css`, no se detecta, y es lo previsto (código muerto).

## 8. Las guardas, y las specs de Vitest

- En `qa/e2e/fixtures/index.ts`, quitá `issues.assertClean();`: `guards.spec.ts` informa «Expected to fail, but passed.» en 3 pruebas. Con `network.assertNothingBlocked();`, en 1.
- Las dos roturas de Vitest están en la tarea 3.1 de [plan.md](./plan.md): cada una hace fallar su spec por la razón dicha.

## 9. La CI

Con el PR abierto, el job `front` corre, en este orden, `npm ci`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e:install -- --with-deps` y `npm run test:e2e`. Pasa. Si `test:e2e` fallara, el paso siguiente sube `playwright-report/` y `test-results/` como el artefacto `playwright-report` (siete días). Para ver ese camino, una rama descartable con una rotura de la sección 6 abre un PR de prueba: el artefacto aparece y el job falla. Se cierra sin mergear.

## 10. La compuerta (SC-009)

```sh
npm run build
npm test
npm run lint
npm run format:check
npm run test:e2e
git diff --check
docker compose build taller
```

La última construye la imagen web, cuya etapa de build corre `npm run build && npm test && npm run lint && npm run format:check` (la hace K; sin verificar al planificar). Además, F1 no toca producción (SC-005, FR-022): este comando no imprime nada.

```sh
git diff --name-only <base>..HEAD \
  | grep -E '^(frontend/[^/]+\.(js|css)|frontend/src/|content/|docker/|backend/|frontend/Dockerfile)' \
  | grep -v -E '^frontend/src/(app/engine-init-order|entities/guide/model/route-store-instances)\.spec\.ts$'
```

## 11. Qué se anota

En «Estado y evidencia» de la hoja de ruta del front, al entregar (SC-007): el tiempo de la suite en local y con `CI=1`; con el primer PR, el tiempo del paso de instalación del navegador, el del paso `test:e2e` y el del job `front`; y el resultado de las roturas de T014.
