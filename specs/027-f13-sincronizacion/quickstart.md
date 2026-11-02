# Quickstart: F13 · Verificar las superficies de sincronización

**Input:** [plan.md](./plan.md), [tasks.md](./tasks.md), [spec.md](./spec.md) y [contrato](./contracts/sync-surfaces.md).

Este documento es para la implementación. La redacción del plan no ejecutó estas pruebas ni instaló dependencias. T001 registra SHA, detecciones, cantidad de pruebas y tamaño reales antes de cambiar código.

## 1. Base y herramientas

Leé `AGENTS.md`, `qa/AGENTS.md` y las detecciones de T001. U1/U4 requieren F11a y las interfaces de D1c; los E2E, D1c U5. U2/U3/U5 se integran con F10b. La entrega completa también verifica el modo shared de F11d y la recarga de F11b.

Usá Node 24 y las dependencias fijadas por `package-lock.json`. Si faltan, `npm ci --offline` sólo con el cache disponible; si falla, no repitas con red. El navegador debe estar instalado: no corras `test:e2e:install` sin autorización. No hace falta Docker ni conectarse a la API real.

```sh
git status --short
git rev-parse HEAD
npm run build
node -e 'const fs = require("node:fs"); const length = fs.readFileSync("dist/index.html", "utf8").length; console.log({characters: length, limit: 1500000}); if (length >= 1500000) process.exitCode = 1;'
```

Guardá esa medida y repetila después. Se cuentan caracteres (`String.length`), no bytes ni apariciones del literal `<script`.

## 2. Ciclo de una tarea y compuerta de unidad

Primero la prueba en rojo por comportamiento, con stub tipado si todavía falta la exportación; después implementación mínima y verde. Registrá archivo, comando, cantidad de fallos y motivo del rojo. No aceptes como rojo un import roto o una dependencia ausente.

```sh
npm run test:unit
npm test
npm run lint
npm run format:check
node qa/seams-guard-check.ts
git diff --check
```

Para una spec puntual, por ejemplo:

```sh
npx --no-install vitest run --config frontend/vitest.config.ts sync-toasts.spec.ts
npm run typecheck
```

U3/U4/U5/U6 suman build y tamaño; U4/U5/U6 suman E2E. Que U4 se entregue antes de U3 no reduce su compuerta. No hay errores de lint nuevos; todo aviso de complejidad nuevo requiere revisión explícita, no un disable global.

## 3. E2E y semáforo compartido

El coordinador asigna `E2E_PORT` y `F13_HEAVY` (la ruta de su script `heavy.sh`) al carril de implementación. No son configuración versionada, ni hay un puerto asignado al carril de redacción. En máquina compartida, todos los E2E se envuelven así:

```sh
: "${E2E_PORT:?Falta el puerto asignado por el coordinador}"
: "${F13_HEAVY:?Falta la ruta del semáforo del coordinador}"
E2E_PORT="$E2E_PORT" sh "$F13_HEAVY" e2e -- npm run test:e2e -- qa/e2e/specs/sync-sign-out.spec.ts
E2E_PORT="$E2E_PORT" sh "$F13_HEAVY" e2e -- npm run test:e2e -- qa/e2e/specs/sync-status.spec.ts qa/e2e/specs/sync-account-mismatch.spec.ts qa/e2e/specs/sync-notices.spec.ts qa/e2e/specs/sync-unload.spec.ts qa/e2e/specs/sync-fixture.spec.ts
E2E_PORT="$E2E_PORT" sh "$F13_HEAVY" e2e -- npm run test:e2e -- --repeat-each=3 --retries=0
```

Playwright sirve el build con Vite preview y `--strictPort`; si el puerto está ocupado, no lo cambia por otro. Los Page Objects se importan de las fixtures del taller. Los únicos errores esperados son los códigos o abortos declarados por cada prueba con `pageIssues.expectIssue`.

`quietSync` conserva lo observado entre recargas, incluso si el aviso desaparece antes de terminar. La opción `allowed` sólo la usan los casos que inducen problemas; la lista de excepciones previas se revisa por título exacto y motivo. No se excluye un archivo entero para ocultar una regresión.

## 4. Verificación manual y mutantes

- Antes/después, el usuario comprueba con lector de pantalla franja, toasts y diálogos: un anuncio por episodio, sin avisos por cada tecla. Anotá navegador, lector y resultado; si no se hizo, el PR no afirma X2 cumplido.
- Sólo teclado: la franja no roba foco; el diálogo de cuenta distinta no cierra con dos Esc; la pregunta al salir sí responde Volver y devuelve foco a Salir; Tab queda dentro del modal.
- 320 y 390 px: botones bajan de línea, ningún scroll horizontal, «Tu progreso» visible dentro de Tu cuenta. Imprimir oculta franja. Movimiento reducido sin transiciones.
- Memoria: descargar no descarta, no cierra sesión y no recarga; elegir recarga no provoca beforeunload. Cerrar sin elegir sí pregunta mientras exista cola o copia de época en memoria.
- Ejecutá los mutantes que enumera cada compuerta, uno a la vez, y restaurá sólo el cambio temporal propio. Un mutante que sobrevive significa evidencia insuficiente; no se registra como rechazo confirmado.

## 5. Cierre

```sh
npm run build
npm test
npm run lint
npm run format:check
node qa/boot-check.ts
node qa/seams-guard-check.ts
git diff --check
```

Repetí el tamaño de §1 y los E2E de §3. Para React Doctor, primero leé `tools/quality/AGENTS.md`; con herramientas en cache:

```sh
npm ci --prefix tools/quality --offline
tools/quality/node_modules/.bin/react-doctor frontend --scope changed --base origin/master --no-telemetry --no-supply-chain --yes
```

El PR informa números reales, tamaños antes/después, cero dependencias nuevas y cero estilos inline nuevos, excepción NOTE de T021, resultados manuales y dependencias no ejercidas. La aprobación del plan acepta sus tres recomendaciones; no sustituye los permisos operativos de descarga ni la verificación de implementación.
