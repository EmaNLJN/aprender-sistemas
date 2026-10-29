# Quickstart: verificar A4

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-10-28

Los comandos que verifican la entrega, en el orden de las unidades. Corren desde la raíz del repositorio, sobre la rama de la implementación, con la base de T001 (F7a, F11a, A3 y B3 integradas). Con dos worktrees a la vez, cada uno usa su `E2E_PORT`.

## 1. La base

```sh
npm ci
npm run build
npm test
E2E_PORT=4300 npm run test:e2e
```

Los totales de la red, de los checks y de Vitest se anotan en T001. Son los esperados de las unidades siguientes (TR-15).

## 2. El backend (unidad 1)

```sh
npm run api:test -- --filter='RunPresenterTest|RunAttemptIdTest|RunShowTest|RunCancelEndpointTest|RunEndpointTest'
npm run api:test
npm run api:analyse
npm run api:format:check
```

- `RunPresenterTest` tiene las 19 claves, con `attemptId` al final.
- `RunAttemptIdTest` tiene `null` en la fila y corriendo, y el `attempt_id` de la fila en cada estado final y en la cancelación.
- `RunPresenter.php` está fuera de `AUDITED_SURFACE` (B3), así que el PR no lleva el resumen de la auditoría.

## 3. La lógica del front (unidades 2 y 3)

```sh
npm run test:unit -- src/entities/exercise src/features/run-exercise src/shared/api
npm test
npm run lint
node qa/seams-guard-check.ts
```

**Lo que tiene que dar:**

- **`render-harness.spec.ts`:** los 11 casos del fixture compartido, con 0 diferencias (SC-005);
- **`run-verdict.spec.ts`:** la batería de aprobación, donde sólo `passed` aprueba (SC-002), y las marcas pegadas al texto;
- **`api-runs-transport.spec.ts`:**
  - el calendario de 300, 450, 675, 1013, 1519 y 2000 ms (SC-007);
  - un envío con la misma clave después de la red caída (SC-008);
  - la espera de turno, por debajo de 30 envíos por minuto;
  - la cancelación con el envío en vuelo.

## 4. La red E2E (unidades 4 y 5)

```sh
npm run build
E2E_PORT=4300 npm run test:e2e -- specs/lab-sandbox.spec.ts specs/lab-run.spec.ts specs/cycle.spec.ts specs/guards.spec.ts specs/lab-exercise.spec.ts
E2E_PORT=4300 npm run test:e2e
```

- **Después de T019:** las E2E editadas y las de `lab-sandbox.spec.ts` fallan, porque `lab.js` todavía llama a los Playgrounds.
- **Después de T022:** toda la red pasa:
  - las de F1, con 9 editadas en su código y 2 que usan el doble nuevo sin editarse;
  - las de A2, sin editar;
  - las de F7a, con 11 editadas;
  - las de A4 y la guarda nueva de `/api/`.

**Los hosts públicos** (SC-003):

```sh
git grep -n "play.rust-lang\|play.golang\|go.dev/play" -- frontend qa
grep -c "play.rust-lang\|play.golang\|go.dev/play" dist/index.html
```

Los dos dan 0 líneas y 0 apariciones. La red estricta, además, hace fallar cualquier E2E que pida a un host público.

## 5. Accesibilidad, a mano (FR-039, SC-009 y X2)

1. Con `npm run build && npm run preview` (y el proxy de `/api/` de F11a hacia un stack levantado), abrí un ejercicio en «Experimentá».
2. **Sólo con el teclado:**
   - Tab hasta «Ejecutar y revisar» y Enter;
   - Tab hasta «Cancelar ejecución» y Enter;
   - en el editor, Ctrl/⌘ + Enter.

   Las tres funcionan y el foco no salta.
3. **Con Orca (Linux) o NVDA (Windows) en Chromium,** y el aula ocupada (otra pestaña con una ejecución en curso), ejecutá: se anuncia «En la fila del taller.» una vez y «Ejecutando código real…» una vez, no cada lugar en la fila.
4. **Con «reducir movimiento»** del sistema activado, el indicador no gira (como hoy).
5. **A 590 px de ancho,** con el aviso de demora visible, no hay desplazamiento horizontal.

El resultado de cada punto va al informe de T022.

## 6. Contra el stack con gVisor (T028, FR-047, SC-004, SC-006 y SC-007)

**Antes:**

- el usuario levanta el stack o autoriza al coordinador (Acciones del usuario de la spec);
- la corrida de registro de B3 está en verde (Q5).

```sh
docker compose --profile sandbox-images build   # si las imágenes del sandbox tienen más de una semana
sh backend/api/scripts/init-env.sh
docker compose up --build -d --wait
docker compose config | grep -n "EXECUTOR_RUNTIME"   # runsc en los dos servicios
```

**En el navegador,** en `http://localhost:8080`, con una cuenta del usuario:

1. **Rust:** abrí `/?ejercicio=rust-01&paso=code#laboratorio`.
   - Con el código inicial, «Ejecutar y revisar» no llega a «La idea funciona en estos casos.». `rust-01` es de `kind: completar` (`ExerciseKind::Complete`), y su inicial falla por sus pruebas.
   - Con «Ver una solución razonada» y después «Cargarla y experimentar», sí llega.
2. **Go:** lo mismo con `/?ejercicio=go-01&paso=code#laboratorio`.
3. **La línea del error:** en `rust-01`, escribí un error de sintaxis en la segunda línea del borrador y ejecutá.
   - La salida del compilador («Ver la salida del compilador y del programa») nombra la línea N.
   - En «Ver el programa completo y sus pruebas», la línea N es la misma (SC-006).
4. **La red:** con las herramientas de desarrollo abiertas en «Red», ningún pedido va a `play.rust-lang.org` ni a `play.golang.org`, y la cabecera `Content-Security-Policy` de la página dice `connect-src 'self'` (SC-003).
5. **El id del intento:** en «Aplicación» › `localStorage` › `taller-laboratorio-v1`, el `result` de `rust-01` tiene `attemptId`. Ese id existe en `attempts`, con la cuenta y `exercise_id = 'rust-01'`: consultalo con la base del stack, con las credenciales de `.env`.

   La reutilización al importar la fija Pest (research R16).
6. **La fila:** con dos pestañas de dos cuentas distintas, ejecutá en las dos casi a la vez. La segunda muestra «En la fila del taller…» o «Ejecutando código real…», y las dos terminan.

**La medición** (SC-007): la línea de A4 sale junto a las de SC-012 de B2.

```sh
npm run api:runs:check
```

Al terminar, `docker compose down`. Cada punto va a la descripción del PR con lo que se vio.

## 7. La compuerta final (T029, SC-010)

```sh
npm run build
npm test
npm run lint
npm run format:check
E2E_PORT=4300 npm run test:e2e
npm run api:test
npm run api:analyse
npm run api:format:check
git diff --check
node -e "const s=require('fs').readFileSync('dist/index.html','utf8');console.log(s.length)"   # < 1 500 000
git diff master --stat -- package.json package-lock.json   # sólo sale check:runner; sin dependencias
git diff master -- frontend | grep -c '^+.*style='           # 0: sin estilos en línea nuevos
```

El PR lleva:

- los totales contra los de T001;
- la lista de las 20 E2E editadas, aprobadas por el usuario;
- lo que se retira y su reemplazo (research R17);
- el resultado de §5 y §6;
- el delta para F7b (research R18).
