# Quickstart: cómo se verifica F11d

**Plan**: [plan-f11d.md](./plan-f11d.md) | **Research**: [research-f11d.md](./research-f11d.md) | **Interfaces**: [plan-f11d.md, «Interfaces»](./plan-f11d.md#interfaces)

Todos los comandos corren desde la raíz del worktree. Los que usan Docker piden permiso antes.

## 1. La línea base (T060)

Sobre `f11d/base`, antes de cualquier cambio:

```sh
git log --oneline -1
git grep -n "<SignOutSection" -- frontend/src/pages/account/ui/AccountDialog.tsx
git grep -n "ProgressSyncContext" -- frontend/src/app/account/AccountRoot.tsx
git grep -n "export function appProgressSync\|export function chooseMode\|const browserEnvironment" -- frontend/src/app/progress-sync/app-progress-sync.ts
git grep -n -A3 "function afterPublish" -- frontend/src/app/boot/content-stage.ts
git grep -n "seedRaw\|rawSnapshot\|rawWrites" -- qa/e2e/fixtures/storage-control.ts
git grep -n "seedRaw(" -- qa/e2e/specs
git grep -n "account-root" -- qa/lib/boot-harness.ts qa/boot-check.ts
npm ci --offline
npm run build
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npm test
npm run lint 2>&1 | grep -c warning
E2E_PORT=4173 npm run test:e2e
```

Las demás detecciones (B1 a B16) están en plan-f11d.md, tarea 0.1. Se anotan en research-f11d.md («Línea base de la implementación»):

- el hash y de dónde salió (la punta de D1c U5 o `master`);
- cada detección, con lo que encontró;
- `html.length`, los checks, las pruebas de Vitest, los avisos de lint y los E2E;
- la lista de `seedRaw(` con claves v1 seguida de un clic, para la aprobación de T067.

## 2. La compuerta de cada unidad (T068 y T075)

Sobre la rama de la unidad, con `BASE` en el commit de T060:

```sh
npm run build
npm test
npm run lint
npm run format:check
git diff --check
node qa/boot-check.ts
node qa/seams-guard-check.ts
node qa/load-order-check.ts
E2E_PORT=4173 npm run test:e2e -- --repeat-each=3 --retries=0
git diff --name-only "$BASE" -- qa
git diff "$BASE" -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText|transition|animation)'
node -e "console.log(require('fs').readFileSync('dist/index.html','utf8').length)"
npm run lint 2>&1 | grep -c warning
```

**Lo que se espera:**

- todo en verde, con la red de la base y los E2E nuevos de la unidad;
- `boot-check` en verde, con el escenario `rawStorage` de D1c y su `harness.errors` vacío;
- la lista de archivos de `qa/` trae sólo los de las «Restricciones globales» del plan:
  - en U9, `qa/e2e/fixtures/index.ts`, `qa/e2e/pages/progress-question.ts`, `qa/e2e/lib/progress-import.ts`, `qa/e2e/specs/progress-question.spec.ts` y, con la aprobación, `qa/e2e/specs/progress-sync.spec.ts`;
  - en U10, además, `qa/e2e/pages/account.ts` y `qa/e2e/specs/shared-computer.spec.ts`;
- el `grep` de estilos y transiciones no imprime nada, y los avisos de lint no suben;
- el tamaño, con su diferencia contra T060 (como mucho +10 000 al final de U10, y bajo 1 500 000), va a la descripción del PR.

**Una spec suelta:**

```sh
npm run test:unit -- frontend/src/pages/account
npm run test:unit -- frontend/src/app/account
E2E_PORT=4195 npm run test:e2e -- specs/progress-question.spec.ts
E2E_PORT=4195 npm run test:e2e -- specs/shared-computer.spec.ts
```

## 3. La verificación a mano contra el stack (T077)

Con permiso para Docker, sobre la punta de U10, y con una cuenta invitada (`taller:invite`). Sirve para lo que el doble no ejerce: el import real, el CSRF real y la IndexedDB real.

```sh
docker compose up --build -d --wait
```

1. **La pregunta,** en un perfil del navegador sin datos del taller:
   - antes de ingresar, desde las herramientas del navegador, sembrar en `localStorage` de `http://localhost:8080` las cuatro claves de `qa/fixtures/progress-master-2a278ad-storage.json`;
   - ingresar: «¿Este progreso es tuyo?» con «9 ejercicios resueltos» y la fecha del último resultado;
   - con «No es mío», el diálogo se cierra, las claves siguen y, al recargar, vuelve la pregunta;
   - con «Sí, es mío», se ve «Sumando tu progreso…» y después el informe;
   - en Application > Local Storage aparece `taller-v1-importado:<id>` y las cuatro claves v1 ya no están;
   - «Entendido» recarga, y no se vuelve a preguntar.
2. **La repregunta:** repetir el punto 1 con otra cuenta del mismo navegador y el mismo v1 sembrado de nuevo. El servidor responde 409 `import_needs_confirmation`, porque otra cuenta importó el mismo crudo, y la pregunta vuelve sin decir por qué.
3. **La computadora compartida:**
   - en «Tu cuenta», marcar «Estoy en una computadora compartida»: se ve el aviso con «Activar y borrar» y «Cancelar»;
   - con «Activar y borrar», en Application > Local Storage no queda ninguna clave `taller-v2:<id>:`, y queda `taller-v2-compartida:<id>`;
   - en Application > IndexedDB, `taller-contenido` no tiene la copia;
   - al recargar, la copia no vuelve;
   - desmarcar la opción muestra «Listo: desde la próxima vez que abras el taller…», y `taller-v2-compartida:<id>` desaparece.
4. **Con el almacenamiento bloqueado** (las cookies y los datos del sitio bloqueados en el navegador): «Tu cuenta» muestra «Este navegador no deja guardar datos…», sin la casilla.
5. **Detener el stack:** `docker compose down`.

Sin el permiso para Docker, el PR de U10 lo declara como no verificado.

## 4. Lo que deja visible

| Unidad | En el navegador |
| --- | --- |
| U9 | Con progreso v1 en el navegador, «¿Este progreso es tuyo?» después del ingreso, con el resumen; el informe después del sí; la repregunta del 409, también para una copia de Método |
| U10 | En «Tu cuenta», después de «Salir», «Estoy en una computadora compartida», con su aviso, la activación y la salida; con el almacenamiento bloqueado, el aviso del FR-063 |
