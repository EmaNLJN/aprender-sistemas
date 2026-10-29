# Research: E2 · El contenido de Esenciales

**Fecha**: 2026-10-28 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

E2 produce contenido sobre una plataforma entregada, así que las decisiones son de proceso: cómo se ramifica cada etapa, cómo se comprueba lo que la spec pide sin escribir código nuevo y con qué herramientas. Cada decisión trae sus alternativas.

## R1. Una rama y un worktree por etapa, en cadena (Q2-A y Q4-A)

- **Decisión:** tres ramas, `e2/etapa-2`, `e2/etapa-3` y `e2/etapa-4`, cada una en su worktree (`../e2-etapa-N`). La etapa 2 sale de `master` con E1. La 3 sale de `e2/etapa-2` mientras el usuario revisa la 2, y la 4 sale de `e2/etapa-3` mientras revisa la 3. Cuando una etapa se integra, la siguiente se rebasa sobre `master` con `git rebase --onto master <punto de partida>`: el punto de partida es `git merge-base` entre la rama siguiente y la anterior, así sólo se reaplican los commits propios, se haya integrado la anterior con merge o con squash.
- **Por qué:** el merge va en orden a la fuerza (FR-006), y el borrador avanza mientras el usuario revisa (Q4-A).
- **Alternativas:** una sola rama de integración con las tres etapas, como `e1/base` en E1, que contradice «un PR por etapa» (Q5-A de E1); ramas que salen todas de `master`, en las que la etapa 3 no puede leer el borrador de la 2 ni ocupar los IDs que siguen.

## R2. La comparación con la base del PR (FR-010)

- **Decisión:** generar el contenido en la base del PR y en su cabeza, en el mismo worktree, y comparar los dos meta y los dos documentos con un script de Node que corre desde la línea de comandos (`quickstart.md` §3). El script no se commitea.
  - **Lo que cambia sin error:** `documentHash`, `sourceCommit`, las porciones `essentials.rust` y `essentials.go`, y las entradas nuevas de `exercises`, que tienen que ser exactamente los diez IDs de la etapa.
  - **Lo que tiene que ser igual:** el resto del meta (`languages`, `catalogs`, `workshopSteps` y las porciones, `harness` incluida), y la etapa y las tres huellas de cada ejercicio de la base.
- **Por qué:** `build/` está fuera de Git (`.gitignore`), así que cambiar de commit para generar la base no ensucia el árbol. El meta ya trae todo lo que la comparación necesita (`tools/content/meta.ts`: `documentHash`, `sourceCommit`, `languages`, `catalogs`, `portions`, `exercises` y `workshopSteps`), y la etapa sale del documento.
- **Alternativas:**
  - `qa/content-baseline-check.ts` de E1 sólo cubre los 274 de su línea base congelada;
  - un check commiteado sería código, fuera de E2 (FR-017), y es el hallazgo 5 del informe de la spec;
  - un `git worktree` aparte para la base necesita su propio `npm ci`.

## R3. La superposición y las pruebas con decimales (FR-003, SC-006 y R10)

- **Decisión:** un script de Node que no se commitea (`quickstart.md` §5) y lee `build/curriculum.json`.
  - **Falla** si un ejercicio de Esenciales comparte el nombre de la función de su inicial, o la expresión de una prueba, con uno de Inicial o con otro de Esenciales del mismo lenguaje.
  - **Inicial** es el nivel publicado o, sin nivel, el de la etapa: hasta la 4 es Inicial, como `levelOf` de F7a.
  - **Lista sin fallar** las pruebas que comparan un decimal con `==` o `!=`, porque R10 admite los valores exactos en binario, y el usuario decide.
- **Por qué:** la situación de un ejercicio no se puede comparar a máquina, pero el nombre y las expresiones sí, y son la mitad mecánica de FR-003.
- **Alternativas:** sólo la revisión del usuario, que se pierde una colisión entre 40 ejercicios y 140 de Inicial; un check en `qa/`, que es código.

## R4. El error de cada `reparar` (FR-004, R14 y Review Focus 3)

- **Decisión:** compilar el inicial de cada `reparar` de Esenciales en las imágenes del sandbox (`taller-sandbox-rust:local` y `taller-sandbox-go:local`), sin red y con el contenido montado de sólo lectura, y quedarse con el primer error (`quickstart.md` §4).
  - **En Rust:** `rustc --edition 2024 --crate-type=lib --emit=metadata`. Es la edición del perfil del ejecutor (`backend/executor/internal/sandbox/profile.go:21`). `lib` evita el error de un `main` que falta, y `metadata` no genera código.
  - **En Go:** cambiar `package main` por un paquete que no es `main` y correr `go build` sobre el archivo. Así un archivo sin `main` compila y se descarta, y se ve sólo el error del ejercicio.

  El resultado es una tabla con la etapa, el ID y el primer error de cada `reparar` de Esenciales, los publicados incluidos. Con esa tabla, el coordinador comprueba que cada error es el de su fila y que ninguno se repite entre etapas.
- **Por qué:** B3 da como «falla como corresponde» cualquier error de compilación de un `reparar` (spec 020, «Cómo se decide cada programa»), así que no distingue el error que se enseña. Las imágenes del sandbox tienen el mismo compilador que reciben los alumnos (Rust 1.99 y Go 1.27) y no dependen del host.
- **Alternativas:**
  - el toolchain del host, que puede no coincidir en versión;
  - armar el programa completo con la plantilla en el host, que pide un renderizador nuevo, es decir, código;
  - leer el diagnóstico del informe de B3, que no lo muestra para un inicial que falla como corresponde.

## R5. Qué cambia y qué no en cada PR, y cómo se encuentran los contratos de conteo (FR-017 y FR-018)

- **Decisión:**
  - **Los archivos:** una lista de rutas permitidas, comprobada con `git diff --name-only` (`quickstart.md` §2).
  - **Los conteos:** un barrido con `git grep` de los valores anteriores de cada conteo (`quickstart.md` §2). Cada aparición que cuente el contenido se cambia por su delta, y las demás quedan.
  - **Los valores anteriores:** los de la tabla de la etapa, verificados en T001 contra `master` (TR-15).
- **Por qué:** E1 deja algunos conteos a mano y puede derivar otros (el hallazgo 2 del informe de la spec va a su PR). El barrido encuentra los que quedan, cualquiera sea la decisión de E1, sin que el plan nombre archivos que todavía no existen.
- **Alternativas:** una lista fija de archivos copiada del plan de E1, que queda vieja si E1 deriva algún conteo.

## R6. Los valores fijos de cada etapa

- **`topicId`:** `rust-essentials-values`, `rust-essentials-decisions` y `rust-essentials-loops`, y sus equivalentes de Go. Siguen el ejemplo del plan de E1 para la piloto (`rust-essentials-reading`) y quedan fijos al integrarse (FR-007).
- **`topic`:** el nombre de la etapa en la spec: «Valores y tipos», «Decidir» y «Repetir».
- **`minutes`:** el de la etapa piloto de cada lenguaje, leído del manifiesto publicado, porque los ejercicios tienen la misma escala.
- **`sources` de la etapa:** las elige el agente redactor entre las fuentes oficiales del criterio R16 de la spec. Son contenido, y el plan no lo escribe.

## R7. El orden de las compuertas y de B3

- **Decisión:** primero las compuertas automáticas, después la revisión del usuario, después B3 y al final el PR (spec, «El recorrido de una etapa»). Las corridas parciales de B3 (`npm run api:audit -- --exercise=<id>`) se usan durante el borrador, para saber si las soluciones aprueban y los iniciales fallan. No son de registro, y no reemplazan la corrida final.
- **Por qué:** cualquier cambio de contenido después de la corrida cambia `documentHash`, y la CI rechaza el resumen (FR-038 de B3).

## Context7

El servidor `mcp__context7__*` agotó su cuota, así que se usó el segundo (`mcp__44441c24-…`). E2 no usa ni configura librerías del front ni del backend. Corre los comandos de siempre (`npm test`, `npm run test:e2e`, `npm run api:test` y `npm run api:audit`) sin cambiar su configuración. Por eso las consultas son de las herramientas que el plan invoca directamente.

| Herramienta | Versión | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| rustc (`/rust-lang/rust/1.99.0`) | 1.99, la de la imagen del sandbox | `--crate-type` y `--emit` | `--crate-type=lib` compila un archivo sin `main`, y `--emit=metadata` genera sólo el `.rmeta`, sin código | Sí: el chequeo de R4 usa `lib` y `metadata` |
| Índice de errores de Rust (`/rust-lang/rust/1.99.0`) | 1.99 | E0317, E0004 y E0384 | Los tres existen con el sentido de la tabla de la spec: un `if` sin `else` usado como valor, un `match` sin todos los casos y asignar dos veces una variable inmutable | No |
| Go (`/golang/go/go1.27.3`) | 1.27, la de la imagen | `go build` sobre archivos, fuera de un módulo | Compila archivos sueltos que sólo importan la biblioteca estándar, y un paquete que no es `main` se compila y se descarta | Sí: el chequeo de R4 cambia el paquete antes de compilar |
| Especificación de Go (`/golang/go/go1.27.3`) | 1.27 | `for` con `range` sobre un entero; constantes no representables; variables sin usar | `for i := range n` existe desde Go 1.22. `int(3.14)` es ilegal porque la constante no se representa. El compilador puede rechazar una variable declarada y sin usar | No. El texto literal de los mensajes de Go no está en la especificación, y R14 pide no depender de él |
| Node.js (`/websites/nodejs_latest-v24_x_api`) | 24 | `--input-type=module` con `-e` | Trata el texto de `-e` como un módulo ES, con `import`, y `process.exitCode` o `process.exit` fijan el código de salida | No: es la forma que ya usa el plan de E1 en su T001 |

## Mediciones de sólo lectura (2026-10-28)

- **Las imágenes del sandbox:** `backend/executor/images/rust/Dockerfile` usa `rust:1.99-slim`, y `go/Dockerfile`, `golang:1.27-alpine`, con `GOCACHE=/opt/gocache`, `GOPROXY=off` y `GOTOOLCHAIN=local`.
- **El perfil del ejecutor:** compila Rust con `rustc --edition 2024 --crate-type bin`, y Go con `go build -buildmode=exe`.
- **`qa/curriculum-ids-check.ts`:** falla con `ID <id> declared by the fixture is missing` cuando el fixture declara un ID que el contenido no tiene. Es el rojo esperado al sumar primero las entradas del fixture.
- **La auditoría** (`specs/020-b3-auditoria-curriculo/contracts/audit-command.md` y `quickstart.md`):
  - `npm run api:audit` corre en el host con el stack arriba;
  - `docker compose up --build -d --wait` importa el contenido de la rama;
  - `--exercise=` hace corridas parciales, que nunca son de registro;
  - el resumen queda en `qa/curriculum-audit/summary.md`;
  - `node qa/audit-summary-gate.ts --body-file=… --base=… --head=…` comprueba en local el cuerpo del PR.
- **La red E2E:** toma el puerto de `E2E_PORT` (`qa/e2e/playwright.config.ts:6`), y Compose necesita `COMPOSE_PROJECT_NAME` en cada worktree (`backend/api/AGENTS.md`).
- **El tope del HTML** (TR-8): E2 no toca el front. El contenido viaja aparte, en `dist/content/`, así que `BOOT_SIZE_LIMIT` de `qa/build-check.ts` no se acerca.
