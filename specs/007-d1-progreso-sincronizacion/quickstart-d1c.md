# Quickstart: verificar D1c

**Input**: [plan-d1c.md](./plan-d1c.md), [contracts/sync-client-d1c.md](./contracts/sync-client-d1c.md) y [data-model-d1c.md](./data-model-d1c.md). Los comandos corren desde la raíz del repositorio, con `npm ci` hecho.

## 1. La línea base (T001)

```sh
git grep -l "SignOutSection\|PrivacyReacceptance" -- frontend/src
git grep -n "function afterPublish\|export async function forgetContentCopy" -- frontend/src
git grep -n "isAttemptId" -- frontend/src/entities/exercise/model/lab-state.ts
git grep -n "export function appProgressBackup\|export function createServerReset" -- frontend/src/app/progress-backup
npm test
npm run lint
npm run build
node qa/load-order-check.ts
npm run test:e2e
```

Se anotan: los checks y las pruebas de `npm test`, los avisos de ESLint, el tamaño de `dist/index.html` (tiene que estar bajo `BOOT_SIZE_LIMIT`, 1 500 000) y la cantidad de E2E. Si falta F11a completa, A3, A4 o F8, D1c no empieza.

## 2. El modelo y el motor (U1 y U2)

```sh
npx vitest run --project node frontend/src/shared/lib frontend/src/features/progress-sync
npx tsc -p frontend/tsconfig.app.json --noEmit
npx eslint frontend/src/shared/lib frontend/src/features/progress-sync
npx prettier --check frontend/src/shared/lib frontend/src/features/progress-sync
```

Lo esperado, medido al planificar en una copia descartable del árbol: 57 pruebas en los 11 archivos de U1 y 45 en los 2 de U2, sin avisos de ESLint. La spec de `sha256Hex` necesita `build/curriculum.json` y `build/curriculum.meta.json` (`npm run curriculum`).

## 3. La costura y el arranque (U3)

```sh
npx vitest run --project node frontend/src/shared/lib/progress-storage.spec.ts frontend/src/app/progress-sync frontend/src/entities
node qa/versioned-storage-check.ts
node qa/seams-guard-check.ts
node qa/boot-check.ts
node qa/load-order-check.ts
npm run build
wc -c dist/index.html
```

`boot-check` incluye el escenario «D1c: arrancar con el progreso de master no lo lee, no lo escribe y no escribe el espacio». `load-order-check` ve `progressStage` entre `contentGate` y `legacyViews`.

## 4. La red y la verificación a mano (U5 y T028)

```sh
npm run build
npm run test:e2e -- specs/progress-sync.spec.ts
npm run test:e2e
```

**A mano, contra el stack** (FR-086; con `docker compose up --build -d --wait` y permiso del usuario), en un navegador real con dos cuentas de prueba:

1. **El cambio de cuenta.** A ingresa, marca un hito del Proyecto y espera unos segundos; en las herramientas del navegador, `taller-v2:<A>:cola` tiene `operations: []`. A sale. B ingresa en el mismo navegador: no ve el hito de A y, al arrancar, desaparecen las claves `taller-v2:<A>:…`.
2. **La pestaña vieja.** A deja una pestaña abierta; B ingresa en otra. En la de A, un cambio produce un `POST /api/sync` con 409 `account_mismatch` y ninguno más.
3. **El v1 en una computadora compartida.** Con las claves v1 de master sembradas a mano, A ingresa y responde que sí a «¿Este progreso es tuyo?» (la pantalla de F11d): las claves v1 pasan a `taller-v1-importado:<A>`. B ingresa después: no se le ofrece nada.
4. **«Computadora compartida».** En «Tu cuenta», A la activa: en ese momento desaparecen las claves `taller-v2:<A>:…`; al estudiar y cerrar la pestaña, no queda ninguna (SC-004).
5. **«Borrar todo».** Con claves v1 de otra persona en el navegador, A borra todo desde Método: el espacio de A queda vacío y las claves v1 siguen intactas.

Los checks de punta a punta de D1a y D1b (FR-087) corren con el stack levantado:

```sh
npm run api:sync:check
npm run api:import:check
```

## 5. El cierre (T028)

```sh
npm run build
npm test
npm run lint
npm run format:check
npm run test:e2e
git diff --check
wc -c dist/index.html
```

El PR lleva el tamaño antes y después, la lista de E2E editados con la aprobación del usuario y lo que la red ejercita distinto desde D1c (research-d1c.md, R19).
