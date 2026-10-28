# Quickstart: verificar F7a

**Plan**: [plan.md](./plan.md) · **Contrato**: [contracts/run-exercise.md](./contracts/run-exercise.md)

Todos los comandos corren desde la raíz del worktree, sin descargar nada. Si uno intenta descargar algo, pará y pedí permiso.

## 1. La línea base (T001)

```sh
npm ci --offline --no-audit --no-fund
npm run build
npm test
npm run lint 2>&1 | tail -1
npm run format:check
E2E_PORT=4173 npm run test:e2e
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
node qa/lab-state-check.ts | tail -1
node qa/runner-check.ts | tail -1
node qa/load-order-check.ts
npx eslint frontend/lab.js
```

Hay que anotar:

- el total de avisos de lint (35 en la planificación) y los de `lab.js` (12, con su función);
- los E2E (123);
- los archivos y las pruebas de Vitest (29 y 719);
- los escenarios de `lab-state-check` (37) y de `runner-check` (12);
- los imports de `load-order-check` (24);
- `html.length` del dist.

## 2. La red contra el legacy (U1, antes de tocar `lab.js`)

```sh
npm run build
E2E_PORT=4271 npm run test:e2e -- specs/lab-map.spec.ts specs/lab-exercise.spec.ts \
  specs/lab-run.spec.ts specs/lab-storage.spec.ts specs/lab-explorers.spec.ts --repeat-each 3
E2E_PORT=4271 npm run test:e2e
git diff <base> --stat -- frontend/lab.js
```

**Esperado:**

- 183 de 183 (61 × 3) y 184 de 184;
- el `diff` vacío.

Si una prueba falla contra el legacy, el valor esperado del plan está mal. Se informa, y no se toca `lab.js`.

## 3. Las reglas y la feature (U2 y U3)

```sh
npm run test:unit -- entities/exercise pages/lab features/run-exercise
node qa/exercise-evidence-check.ts
npm run typecheck && npm run lint && npm run format:check
```

**Esperado:**

- las 11 specs nuevas en verde, con 124 pruebas;
- `exercise-evidence-check` igual que en la base;
- ningún aviso de lint nuevo.

**La mutación del aislamiento,** descartada después de verla:

1. Agregá `import '../../../entities/campaign';` como primera línea de `frontend/src/features/run-exercise/model/create-exercise-runner.ts`.
2. Corré `npm run test:unit -- features/run-exercise/index.spec.ts`: falla «loads without the campaign engine…».
3. Volvé atrás con `git checkout -- frontend/src/features/run-exercise/model/create-exercise-runner.ts`.

## 4. El cableado (U4)

```sh
node qa/runner-check.ts            # 12/12 offline runner scenarios passed.
node qa/lab-state-check.ts         # 39 lab state scenarios passed; 0 failed.
node qa/load-order-check.ts        # 23 imports
node qa/boot-check.ts
grep -rn "TallerRunner\|register-runner" frontend qa      # nada
grep -n "activeRun\|activeController\|buildProgram\|interpretRun" frontend/lab.js   # nada
npm test
npm run build
E2E_PORT=4274 npm run test:e2e     # 184 passed
```

**Las mutaciones,** cada una descartada después de verla:

- borrar `runner.abort();` de `reset()` en `lab.js`: falla «Reset during a run aborts it and the late answer writes nothing»;
- agregar `import './src/entities/campaign';` al principio de `lab.js`: falla «lab.js bundles the lab store once and no engine or route store».

## 5. La compuerta final (T017)

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=4173 npm run test:e2e
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"   # < 1250000
npm run lint 2>&1 | tail -1                                                       # ≤ base (32 en el prototipo)
git diff <base> -- frontend/src frontend/lab.js | grep -E '^\+.*(style=|setAttribute\(.style.|\.cssText)'   # nada
```

Con permiso del usuario: `docker compose build taller`, y se informa el resultado.

## 6. Lo que verifica cada cosa

| Afirmación | Comprobación |
| --- | --- |
| El alumno no nota nada | Los 123 E2E de F1 y A2 y los 61 nuevos, sin editar, antes y después |
| Lo guardado es lo de hoy | `storage.watchWrites()` en los E2E; las tres fixtures sin escrituras; `lab-state-check` |
| A4 cambia sólo el adaptador | `create-exercise-runner.spec.ts` con un transporte doble que no arma programa, no lee marcas, no cuenta intentos y avisa un progreso que la feature no conoce |
| El adaptador de hoy da los resultados de hoy | `playground-transport.spec.ts`; `build-run-result.spec.ts` contra `interpretRun`; los cuatro resultados en `lab-run.spec.ts` y en `cycle.spec.ts` |
| Ningún singleton duplicado | `index.spec.ts` (la feature) y el escenario de aislamiento de `lab-state-check` (`lab.js`) |
| `TallerRunner` se fue | `grep` en 0; `runner-check` con sus 12 escenarios |
