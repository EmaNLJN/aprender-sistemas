# Quickstart: F14b · Validación

Cómo se comprueba que F14b entrega «Alumnos» y el uso de una cuenta sin editar las pruebas de F12a, F12b ni F14a, con un pedido por acción y dentro del peso acumulado. El plan está en [plan-f14b.md](./plan-f14b.md), y lo común con F14a, en [quickstart.md](./quickstart.md). Todo corre desde la raíz del worktree de `f14b/base` (`master` con F14a).

## 1. La línea base (T029)

Los comandos de §1 de [quickstart.md](./quickstart.md), más el presupuesto que queda:

```sh
grep -n "Línea base de la implementación" -A 20 specs/028-f14-estadisticas-admin/research.md   # el tamaño de T001 de F14a
node -e 'console.log(require("node:fs").readFileSync("dist/index.html","utf8").length)'
```

El presupuesto de F14b es 95 000 menos lo que F14a ya sumó sobre su T001.

## 2. Las pruebas de cada unidad

| Unidad | Comando | Esperado |
| --- | --- | --- |
| U1 | `npm run test:unit -- frontend/src/pages/admin/model/parse-students.spec.ts frontend/src/pages/admin/model/account-usage.spec.ts frontend/src/pages/admin/api/usage-endpoints-students.spec.ts` | En verde |
| U2 | `npm run test:unit -- frontend/src/pages/admin/ui/account-usage.spec.tsx frontend/src/pages/admin/ui/students-view.spec.tsx` | En verde |
| U3 | `npm run test:unit -- frontend/src/pages/admin` | En verde, con **todas** las specs de F12a, F12b y F14a sin editar |
| U4 | `npm run build && E2E_PORT=4196 npm run test:e2e -- specs/admin-usage-students.spec.ts specs/admin-usage-account.spec.ts` | En verde después de T037 |
| Todas | `npm test && npm run lint && npm run format:check && git diff --check` | En verde |

## 3. Las comprobaciones de la Review Focus

```sh
git diff master --stat -- '*.spec.ts' '*.spec.tsx'
# sólo archivos nuevos: ninguna prueba de F12a, F12b ni F14a cambia

git grep -n "onMouseEnter\|onPointerEnter\|prefetch" -- frontend/src/pages/admin
# nada: el detalle se pide sólo con un clic

git grep -n "Distribution" -- frontend/src/pages/admin/ui/AccountUsage.tsx frontend/src/pages/admin/ui/AccountUsageReport.tsx frontend/src/pages/admin/ui/ExerciseGrid.tsx
# nada: el detalle no dibuja opciones

git grep -n "/api/admin/users/\${" -- frontend/src/pages/admin/api/usage-endpoints.ts
# nada: F14 no pide la ficha
```

## 4. El peso (T037 y T041)

```sh
npm run build
node -e 'console.log(require("node:fs").readFileSync("dist/index.html","utf8").length)'
```

La resta contra **T001 de F14a** no pasa de **95 000**, y el total queda bajo **1 500 000**. Si se pasa, la tarea se detiene y decide el usuario.

## 5. La red y la revisión manual

```sh
E2E_PORT=4173 npm run test:e2e -- --repeat-each=5 --retries=0
```

La anotación `SC-008` de `admin-usage-account.spec.ts` (la grilla con todos los ejercicios) va al PR. La revisión manual con datos armados es la de §7 de [quickstart.md](./quickstart.md), con este recorrido:

- «Cuentas»: la columna «Uso», «Ver el uso de» una cuenta con progreso y otra sin él, «Ver sus ejecuciones» y «Volver a Cuentas»;
- «Uso del taller», en «Alumnos»: «Sin actividad desde», «Última actividad, la más vieja primero» y el detalle de un alumno.
