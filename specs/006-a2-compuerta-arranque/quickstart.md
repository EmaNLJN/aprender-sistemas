# Quickstart: validar A2

**Fecha**: 2026-10-05 | **Plan**: [plan.md](./plan.md) | **Modelo**: [data-model.md](./data-model.md)

Escenarios que prueban que A2 funciona de punta a punta. Cada uno dice qué se corre y qué tiene que dar. Los comandos van desde la raíz del worktree; el detalle de cada tarea está en el plan. Nada de esto se corrió al planificar: se corre al implementar.

## Antes de empezar

- **La base tiene F1 y las unidades 1 a 4 de F2 integradas.** Si no, A2 no empieza (plan, «Lo que A2 supone de F1 y F2»).
- **Nada se descarga.** `node_modules` ya está instalado. Si falta, `npm ci` instala el lockfile (los mismos paquetes) y pide permiso. El navegador de Playwright lo instaló F1.
- **Docker sólo lo corre el coordinador, con permiso,** y con las imágenes que ya están (`--pull never`). `docker/compose.preview.yaml` fija el nombre de proyecto y el puerto 8765: correrlo desde otro worktree pisa la vista previa del checkout principal.
- **Hashes portables entre Linux y macOS.** Más abajo se escribe `sha256 <archivo>` para un archivo y `| sha256` para una salida por tubería:

  ```sh
  # sha256 <archivo>
  node -e "const c=require('node:crypto'),f=require('node:fs');console.log(c.createHash('sha256').update(f.readFileSync(process.argv[1])).digest('hex'))" <archivo>
  # | sha256
  node -e "process.stdin.pipe(require('node:crypto').createHash('sha256').setEncoding('hex')).on('data',console.log)"
  ```

## 1. La base y la línea base (T001 y T002)

```sh
npm run curriculum
node -e "console.log(JSON.parse(require('fs').readFileSync('build/curriculum.meta.json','utf8')).documentHash)"
node tools/content/dump-globals.ts . | sha256
```

**Resultado esperado:** el `documentHash` y el hash del volcado, que T002 registra juntos. Si el documento sigue empezando con `ef8f5715…`, el volcado empieza con `cd1f9e62…` (el valor del 2026-10-05, sobre `master`). T001 suma el resultado del spike (P1 a P4) y el tiempo hasta la primera vista antes del cambio.

## 2. Cada tarea, en verde

| Qué | Comando | Resultado esperado |
| --- | --- | --- |
| Los specs de una tarea | `npm run test:unit -- <ruta>` | Primero fallan por la razón que dice el plan; después de implementar, pasan |
| Todos los checks y las specs | `npm test` | Verde: los 31 checks de la base más el nuevo (`dist-content-check`), y las 12 specs de Vitest de la base (186 pruebas) más las 7 de A2, sin cambiar ningún valor esperado de los que ya había |
| Un check suelto | `node qa/<check>.ts` | Verde (antes, `npm run curriculum`) |
| Tipos, lint y formato | `npm run typecheck`, `npm run lint`, `npm run format:check` | Verde |
| Espacios | `git diff --check` | Limpio |

## 3. El archivo junto al HTML (T006, T008, T010)

```sh
npm run build
ls dist dist/content
node -e "const h=require('node:fs').readFileSync('dist/index.html','utf8');console.log([...h.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].length)"
```

**Resultado esperado:**

- `dist/` tiene `index.html`, `content/curriculum.<versión>.json`, `EDITOR-LICENSES.txt` y `THIRD-PARTY-NOTICES.txt`, y nada más;
- hay un solo `<script>`, contado con la expresión de `build-check` (`grep -o '<script'` da 2, porque React DOM lleva `<script>` dentro de una cadena);
- `sha256 dist/content/curriculum.<versión>.json` es el `documentHash` completo, y la `<versión>` son sus primeros 32 hexadecimales;
- `node qa/build-check.ts` pasa: el HTML no tiene el currículo, pesa menos que el tope de 1.250.000 caracteres que midió T001 y contiene la versión.

## 4. La compuerta, a mano en un navegador (opcional: la cubren los E2E)

Con `npm run preview` y las herramientas del navegador:

1. **Contenido que llega.** Abrí `http://localhost:4173/#recorrido`: sin parpadeo, la misma vista de siempre. Abrí un enlace profundo (`?ejercicio=…&paso=code#laboratorio`) y recargá.
2. **Contenido que no llega.** Bloqueá la URL `/content/curriculum.*.json` (o poné la red en «sin conexión» después de cargar el HTML y recargá). Tiene que aparecer «No se pudo cargar el contenido» con «Reintentar» enfocado, y la consola sin errores nuestros. En «Application → Local Storage», ninguna clave cambia.
3. **Reintentar.** Desbloqueá y pulsá «Reintentar» con Enter: arrancan las vistas sin recargar la página.
4. **Con el teclado y en un viewport móvil** (390 px): el foco es visible y el mensaje no se corta.

## 5. Los E2E (T011)

```sh
npm run build && npm run test:e2e
```

**Resultado esperado:** los escenarios de A2 pasan junto con las 106 pruebas de F1, que desde el corte esperan la primera vista en `ShellPage.goto` (T008). Los de A2 cubren los cinco enlaces profundos y la recarga, la falla de cada modo del transporte con el progreso de `qa/fixtures/progress-master-2a278ad-storage.json` intacto (0 lecturas y 0 escrituras de almacenamiento), el reintento, el teclado y el móvil. Corridos cinco veces seguidas, sin reintentos, pasan las cinco.

## 6. Las mutaciones (descartadas después)

| Mutación | Qué tiene que fallar |
| --- | --- |
| Intercambiar dos módulos de `legacy-views.ts` (T008) | `load-order-check` |
| Sacar o duplicar `startApp()` en `legacy-views.ts` (T008) | `load-order-check`: la regla de `startApp()` |
| Sacar `contentGate` de `runBoot([...])` (T008) | `boot-check` |
| Un import estático del JSON desde un módulo de `main.tsx` (T008 y T010) | `build-check` (tope y marcadores) y `boot-check` («El contenido todavía no se publicó») |
| Que la compuerta descarte la porción `quests.go` (T009) | `dist-content-check`: las 17 huellas |
| Cambiar un byte de `dist/content/curriculum.<versión>.json` (T009) | `dist-content-check`: el sha256 |
| Otra versión en la constante del build (T011) | Los E2E de A2: la página pide un nombre que no existe |

## 7. Los oráculos (T013)

```sh
node tools/content/dump-globals.ts . | sha256
git worktree add ../a2-anterior <commit anterior a A2>
ln -s "$PWD/node_modules" ../a2-anterior/node_modules
(cd ../a2-anterior && npm run curriculum && node tools/content/dump-globals.ts .) | sha256
```

**Resultado esperado:** los dos hashes son el de T002 (SC-001, FR-017). La segunda corrida usa la raíz de un commit anterior, que todavía importa el JSON en estático. Después, `rm ../a2-anterior/node_modules` (el enlace, no su destino) y `git worktree remove ../a2-anterior`.

## 8. Docker (T013, con permiso)

```sh
docker compose up --build -d --wait
curl -s http://localhost:8080/content/curriculum.<versión>.json | sha256
curl -s --compressed http://localhost:8080/content/curriculum.<versión>.json | sha256
curl -sI -H 'Accept-Encoding: gzip' http://localhost:8080/content/curriculum.<versión>.json
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/content/curriculum.00000000000000000000000000000000.json
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/THIRD-PARTY-NOTICES.txt
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/EDITOR-LICENSES.txt
docker compose down
```

**Resultado esperado:** los dos hashes son el `documentHash` (SC-002); el encabezado trae `Content-Type: application/json` y `Content-Encoding: gzip`; el nombre ajeno da `404`; los dos avisos de licencia dan `200`, en las mismas URL de siempre. Con la vista previa (`docker compose -f docker/compose.preview.yaml up --build -d --wait`, puerto 8765) el HTML, el contenido y los avisos salen del `dist/` del host, que se monta entero; corré `npm run build` antes, porque Docker crearía un `dist/` vacío y a nombre de root si faltara. Se detiene con `down`.

## 9. El tiempo hasta la primera vista (T013, antes y después)

T001 midió la base con este método; sus cifras sirven de orden de magnitud, porque se superpusieron con las pruebas de otro agente. T013 mide el build de A2 intercalado con uno de la base (`c5d497d`): un worktree para cada uno, cada uno con su `npm run build`, y series alternadas de 20 cargas.

El método es el de `qa/e2e/specs/spike-first-view.spec.ts` de la rama descartable `a2/spike` (`3baadc2`), que no se integra: se copia sin commitear y se corre con el runner de F1 y un puerto libre (`E2E_PORT=<puerto> SPIKE_RUNS=20 npx playwright test --config qa/e2e/playwright.config.ts specs/spike-first-view.spec.ts`). Cada medición carga la página en un contexto nuevo, sin caché, y vuelve a navegar a la misma URL en el mismo contexto, con caché. Antes de cargar inyecta:

```ts
await page.addInitScript(() => {
  new MutationObserver((_records, observer) => {
    if (!document.querySelector('#main h1')) return;
    (window as unknown as { __firstView: number }).__firstView = performance.now();
    observer.disconnect();
  }).observe(document, { childList: true, subtree: true });
});
// con la compuerta, la primera vista llega después de `load`: después de page.goto,
// await page.waitForFunction(() => (window as any).__firstView !== undefined) y recién ahí leerlo
```

**Resultado esperado:** la mediana y el rango, sin caché y con caché, de la base y de A2, en milisegundos, que van al PR. Es un dato, sin umbral; sirve para ajustar el umbral de 400 ms del estado de carga.
