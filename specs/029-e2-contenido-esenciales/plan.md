# Implementation Plan: E2 · El contenido de Esenciales

**Branch**: `029-e2-contenido-esenciales` (nombre de la feature; cada etapa va en su rama, `e2/etapa-2` a `e2/etapa-4`) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: la spec de E2 con su clarify del 2026-10-28 (Q1 a Q5, la opción recomendada), [`research.md`](./research.md) y [`quickstart.md`](./quickstart.md) de esta carpeta. También la spec y el plan de E1 (`specs/026-e1-esenciales/`, en el PR #81; leídos en el worktree `spec-e1`, cabfdb67), la spec de B3 con sus contratos, y la sección «Transversal» de `.coordinador/hallazgos-para-planes.md`.

## Summary

**Objetivo:** integrar las etapas 2, 3 y 4 de Esenciales en Rust y en Go, una por PR y en orden, cada una aprobada por el usuario y auditada por B3, sin cambiar nada publicado.

**Arquitectura:**
- **Sin código.** Cada etapa se suma al final de la sección `essentials` de los dos manifiestos, con sus diez carpetas de ejercicio y los contratos de conteo que E1 dejó a mano.
- **Las compuertas son procedimientos.** Los comandos del proyecto y cuatro scripts que no se commitean (`quickstart.md`): la comparación del meta contra la base del PR, los archivos permitidos, el error de cada `reparar` y la superposición.
- **La cadena.** La etapa siguiente se redacta mientras el usuario revisa la anterior, y se rebasa sobre ella cuando se integra.

**Stack:**
- el contenido en YAML y código Rust y Go de `content/`, con el generador de `tools/content` (Node 24);
- las imágenes del sandbox: Rust 1.99 (edición 2024) y Go 1.27;
- la auditoría de B3 (`npm run api:audit`), Pest y Playwright, sin cambios.

## Technical Context

**Language/Version**: el contenido es Rust 1.99 (edición 2024) y Go 1.27, los del sandbox. Las herramientas son Node 24.21 y TypeScript 6.0.2, sin cambios.
**Primary Dependencies**: ninguna nueva («Descargas y permisos»).
**Storage**: ningún cambio de esquema. El import suma filas a `topics`, `exercises`, `exercise_grading_versions`, `exercise_tests` y `exercise_hints` (+2, +10, +10, +30 y +30 por etapa).
**Testing**:
- `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`;
- `npm run build` y `npm run test:e2e`, y `npm run api:test` (Pest);
- la auditoría de B3, parcial durante el borrador y de registro antes del PR;
- los procedimientos de `quickstart.md`, §2 a §5.

**Target Platform**: el stack de `docker/compose.yaml`; nada cambia en el despliegue.
**Project Type**: contenido del currículo, en `content/`.
**Performance Goals**: ninguno.
**Constraints**: ver «Restricciones globales».
**Scale/Scope**:
- 30 ejercicios (15 por lenguaje), 6 temas y 3 PRs;
- 14 tareas en tres unidades, una por etapa, más la preparación y el cierre.

### Restricciones globales

- **Nada publicado cambia** (FR-010 y FR-015):
  - los IDs, las claves de prueba (`t1`, `t2` y `t3`) y los `topicId` publicados;
  - la etapa y las tres huellas de los 274 y de cada ejercicio de Esenciales ya integrado;
  - las 17 porciones de antes de E1 y la porción `harness`;
  - `qa/fixtures/content-baseline-e1.json`, que no se regenera ni se edita;
  - las entradas existentes de `qa/fixtures/curriculum-ids.json`, que sólo crece.
- **Un PR de etapa sólo agrega** (Q5-A y FR-017). Toca la sección `essentials` de los dos manifiestos, las diez carpetas nuevas y los contratos de conteo (README, totales de `qa/`, `curriculum-ids.json`, Pest, `lab-map.spec.ts` y `lab-essentials.spec.ts`, y `frontend/src/index.html` si F10 no entró). Ningún otro archivo.
- **El orden** (FR-006): la etapa 3 se integra después de la 2, y la 4 después de la 3, siempre al final de la sección.
- **Los valores fijos:** los de «Los valores de cada etapa». Los conteos «antes» los verifica T001 contra `master` (TR-15), y los «después» salen de esos valores más el delta, nunca de un número copiado.
- **El orden de las compuertas** (FR-009, FR-011 y FR-012):
  1. las automáticas;
  2. la revisión del usuario;
  3. B3 de registro sobre el último commit, con el árbol limpio;
  4. el PR.

  Cualquier cambio después de B3 vuelve a las compuertas automáticas y pide otra corrida.
- **El cuerpo del PR** (FR-013): en inglés, con la notación de Angular. Lleva el bloque `taller-audit-summary-1` pegado entero, tal como lo imprime `npm run api:audit`. La plantilla de `content/harness/` no se toca, así que `harnessHash` es el de `master`.
- **Las redes congeladas:** la red de F1, las 17 E2E de A2 y las specs y E2E del Atlas, la campaña (incluida la de coherencia de F6), Sistemas y la Biblioteca pasan sin editarse (FR-016).
- **Sin texto pedagógico en el plan.** El agente redactor (C) escribe los ejercicios con las tablas y los criterios R1 a R17 de la spec, y el usuario (U) los aprueba. El plan fija las reglas, los valores y las compuertas.
- **Los comentarios:** los ejercicios no agregan comentarios al código del inicial ni de la solución salvo que la consigna los necesite, como en Inicial. Los YAML no llevan comentarios nuevos.

## Constitution Check

| Principio | Cómo lo cumple | Estado |
| --- | --- | --- |
| I. AGENTS.md es la fuente | Los comandos, el formato del PR y las reglas de Compose salen de `AGENTS.md`, `qa/AGENTS.md` y `backend/api/AGENTS.md`; el plan no las reescribe | Cumple |
| II. TDD y pruebas útiles | Cada borrador empieza por los contratos: primero las entradas del fixture y los conteos nuevos, en rojo, y después el contenido que los pone en verde. Cada procedimiento nuevo se prueba una vez en rojo en la etapa 2 (Review Focus) | Cumple |
| III. Código entendible | No hay código de producción. Los scripts de `quickstart.md` son cortos, sin dependencias, y no se commitean | Cumple |
| IV. Contenido en Git, IDs estables | IDs correlativos que nunca se reutilizan; la comparación del meta prueba que nada publicado cambia; el contenido se edita en `content/` | Cumple |
| V. Capas y contratos | Ninguna capa cambia: el contenido entra por el generador y los contratos de E1 | Cumple |
| VI. Español, accesibilidad, portabilidad | El contenido va en castellano rioplatense (R17); los comandos corren en Linux y macOS (`seq -f`, `mktemp -d`, `git grep -w`) | Cumple |
| VII. Secretos y salidas fuera de Git | `build/`, `qa/curriculum-audit/` y los archivos de `$E2_SNAP` quedan fuera de Git | Cumple |
| VIII. Flow-forward | E2 no edita la spec ni el plan de E1. Los arreglos de lo publicado van en PRs `fix(content)` con la extensión `bug` (Q5-A) | Cumple |

## Project Structure

### Documentation (this feature)

```text
specs/029-e2-contenido-esenciales/
├── spec.md                  # con el clarify del 2026-10-28
├── plan.md                  # este archivo
├── research.md              # R1 a R7, Context7 y mediciones
├── quickstart.md            # los comandos de las compuertas, §0 a §8
├── checklists/requirements.md
└── tasks.md                 # T001 a T014
```

No hay `data-model.md` ni `contracts/`: E2 no cambia el esquema, la forma publicada ni ninguna interfaz. Los contratos son los de E1 (`contracts/essentials.md` §1) y los de B3 (`audit-summary.md`).

### Source Code (repository root)

En cada etapa N (2, 3 y 4):

```text
content/rust/manifest.yaml                   (C) suma la etapa N al final de essentials
content/go/manifest.yaml                     (C) ídem
content/rust/exercises/rust-<5 IDs>/         (C) nuevas: exercise.yaml, starter.rs, solution.rs
content/go/exercises/go-<5 IDs>/             (C) nuevas: exercise.yaml, starter.go, solution.go
qa/fixtures/curriculum-ids.json              (C) diez entradas al final de exercises
README.md                                    (C) el encabezado, la fila de Esenciales de «Cobertura» y «Desarrollo»
qa/*-check.ts                                (C) los totales que encuentra el barrido (quickstart §2)
backend/api/tests/**/*.php                   (C) los conteos de Pest que encuentra el barrido
qa/e2e/specs/lab-map.spec.ts                 (C) los conteos del laboratorio, si siguen fijos
qa/e2e/specs/lab-essentials.spec.ts          (C) «N desafíos visibles», toHaveCount y el último ID, si siguen fijos
frontend/src/index.html                      (C) el conteo del menú, sólo si F10 no entró
```

**Structure Decision:** ningún archivo nuevo fuera de las carpetas de ejercicio. Los contratos de conteo son los que deja E1. El barrido los encuentra, así que el plan no depende de qué conteos haya derivado E1.

## Review Focus

Lo que el revisor mira primero, en cada PR:
- `git diff --name-only origin/master...HEAD`, contra la lista de FR-017;
- la salida de `quickstart.md` §3;
- el bloque de B3 del cuerpo, con `startedAt` posterior a la fecha de aprobación del usuario;
- `git diff origin/master...HEAD -- qa/e2e`.

**Lo que la spec implica y ninguna prueba del proyecto ejercita**, con el procedimiento que lo fija y la tarea dueña. Cada procedimiento se corre una vez en rojo en la etapa 2 (T003, paso 8), en una rama descartable, para saber que su verde significa algo:

1. **Un ejercicio publicado editado en un PR de etapa** (FR-010 y Q5). Un cambio de texto en una pista de la piloto pasa `npm test`, porque `content-check` mira la forma y no el texto. Lo fija `quickstart.md` §3. Su rojo, en T003: cambiar una palabra de una pista de `rust-138`, correr §3 y ver `rust-138: cambiaron sus huellas`.
2. **Una entrada existente de `curriculum-ids.json` cambiada** (FR-015). Si el título cambia en el ejercicio y en el fixture a la vez, `curriculum-ids-check` pasa. Lo fija la tercera comprobación de `quickstart.md` §2. Su rojo, en T003: cambiar el título de `rust-138` en los dos lugares y ver la línea quitada.
3. **Un `reparar` que no compila por otro error** (FR-004 y R14). B3 acepta cualquier error de compilación en un inicial `reparar`. Lo fija `quickstart.md` §4: la tabla del primer error de cada `reparar`, contra la fila de la etapa en la spec. Lo revisa K en cada etapa (T003, T007 y T011).
4. **El nombre de una función o una expresión de prueba repetida de Inicial o de otro Esenciales** (FR-003 y SC-006). Lo fija `quickstart.md` §5. Su rojo, en T003: renombrar la función de un inicial nuevo de Rust a `energia` (la de `rust-01`) y ver `rust · función energia: rust-01, rust-1NN`.
5. **Un conteo viejo que queda en un contrato** (FR-018). Un literal que nadie actualizó pasa si su check no corre en `npm test`, como Pest o las E2E sin correr. Lo fija el barrido de `quickstart.md` §2, que después de editar sólo devuelve líneas que no cuentan el contenido. Lo corren C en el borrador (T002, T006 y T010) y K en las compuertas.

## Reparto en paralelo

**Dueños:**
- **C, el agente redactor:** un subagente con los archivos, las tablas y los criterios de la spec y este plan. Se le dice que no agregue comentarios. Qué modelo usa es la decisión 1 del informe; la recomendada es el `implementador`, como en la piloto de E1 (T004).
- **K, el coordinador:** corre las compuertas, revisa cada diff, presenta la revisión al usuario, corre B3 y abre el PR.
- **U, el usuario:** revisa la pedagogía y mergea.

**La cadena** (Q4-A). La flecha marca qué tarea espera a cuál; en la misma fila, lo que corre a la vez:

| Momento | Etapa 2 | Etapa 3 | Etapa 4 |
| --- | --- | --- | --- |
| 1 | T001 → T002 → T003 | — | — |
| 2 | T004 (U revisa) | T006 (C redacta sobre `e2/etapa-2`) | — |
| 3 | T005 (B3, PR y merge) | — | — |
| 4 | — | T007 (rebase y compuertas) → T008 (U revisa) | T010 (C redacta sobre `e2/etapa-3`) |
| 5 | — | T009 (B3, PR y merge) | — |
| 6 | — | — | T011 (rebase y compuertas) → T012 (U revisa) → T013 (B3, PR y merge) |
| 7 | T014 (cierre) | | |

**Archivos e interfaces por dueño:**

| Dueño | Posee | Consume | Entrega |
| --- | --- | --- | --- |
| C | En su rama: la etapa en los dos manifiestos, sus diez carpetas y los contratos de conteo | Los valores de su etapa, las tablas y los criterios de la spec, los ejercicios publicados y, si la anterior sigue en revisión, su borrador | Un commit `feat(content)` con contenido y contratos, los `fix(content)` de cada ronda y el informe del agente |
| K | Los worktrees, el cuerpo del PR (`$E2_PR_BODY`) y las compuertas | El commit de C | Las compuertas en verde, el paquete de revisión, la corrida de B3 y el PR |
| U | La aprobación | El paquete de revisión | La aprobación con fecha, IDs y excepciones, y el merge |

**Puertos y proyectos:** etapa 2, `E2E_PORT=4302` y `COMPOSE_PROJECT_NAME=e2-etapa-2`; etapa 3, `4303` y `e2-etapa-3`; etapa 4, `4304` y `e2-etapa-4`. Ninguno choca con los de E1 (4173 y 4286).

## Reglas para todos los agentes

- **Rama y worktree.** Uno por etapa, en `../e2-etapa-N`. La etapa 2 sale de `origin/master`; la 3 y la 4, de la rama anterior. Ningún agente hace push: K sube la rama al abrir el PR.
- **Rebase.** Sólo K, y sólo para pasar una etapa de la rama anterior a `origin/master` (T007 y T011): `git rebase --onto origin/master "$(git merge-base HEAD e2/etapa-<N-1>)"`.
- **Commits.** En inglés, con la notación de Angular: `feat(content): add the Essentials stage N for Rust and Go`, y `fix(content): <qué> in the Essentials stage N` en cada ronda. Terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, o con la línea del modelo que corra la tarea.
- **Docker.** Cada comando lleva `COMPOSE_PROJECT_NAME=e2-etapa-N` en la misma línea.
- **Sin descargas.** Si un comando pide bajar algo que no sea `npm ci` en un worktree nuevo o `git fetch origin`, se para y avisa a K. Las imágenes del sandbox ya existen (B2 y B3).
- **Sin texto propio del plan.** C escribe los ejercicios. K no reescribe texto pedagógico: si algo no cumple un criterio, se lo marca a C o lo lleva al usuario.

## Los valores de cada etapa

| Valor | Etapa 2 | Etapa 3 | Etapa 4 |
| --- | --- | --- | --- |
| `topic` | Valores y tipos | Decidir | Repetir |
| `topicId` de Rust | `rust-essentials-values` | `rust-essentials-decisions` | `rust-essentials-loops` |
| `topicId` de Go | `go-essentials-values` | `go-essentials-decisions` | `go-essentials-loops` |
| `minutes` | El de la etapa piloto de cada lenguaje, leído del manifiesto publicado | Ídem | Ídem |
| Etapa publicada esperada | 51 | 52 | 53 |
| IDs (`E2_FIRST` a `E2_LAST`) | 143 a 147 | 148 a 152 | 153 a 157 |
| Rama, y de dónde sale | `e2/etapa-2`, de `origin/master` | `e2/etapa-3`, de `e2/etapa-2` | `e2/etapa-4`, de `e2/etapa-3` |
| Total de ejercicios (`E2_BEFORE_TOTAL` → después) | 284 → 294 | 294 → 304 | 304 → 314 |
| Por lenguaje (`E2_BEFORE_PER_LANGUAGE` → después) | 142 → 147 | 147 → 152 | 152 → 157 |
| Pruebas y pistas en la base (`E2_BEFORE_TESTS` → después) | 852 → 882 | 882 → 912 | 912 → 942 |
| Temas por lenguaje en el mapa (`E2_BEFORE_TOPICS` → después) | 50 → 51 | 51 → 52 | 52 → 53 |
| Pestaña Esenciales (`E2_BEFORE_ESSENTIALS` → después) | 5 → 10 | 10 → 15 | 15 → 20 |
| Filas de `topics` (`E2_BEFORE_TOPIC_ROWS` → después) | 100 → 102 | 102 → 104 | 104 → 106 |
| Último ID de Esenciales | `…-142` → `…-147` | `…-147` → `…-152` | `…-152` → `…-157` |
| Errores de sus `reparar` | La fila 2 de las tablas de la spec | La fila 3 | La fila 4 |

Las cantidades «antes» de la etapa 2 son las que deja E1 según su plan (`data-model.md` §3 de E1). T001 las verifica en `master`, y si alguna difiere, manda la de `master` y el delta.

## Las tareas

### 0. La preparación (K)

#### Tarea 0.1 · Precondiciones y valores de la base (T001)

**Archivos:** ninguno del repositorio. La evidencia va en el cuerpo del PR de la etapa 2, sección «Baseline».

1. **Las precondiciones,** en `origin/master` después de `git fetch origin`. Si una falla, K se para y avisa al coordinador:

   ```sh
   git show origin/master:content/rust/manifest.yaml | grep -q '^essentials:' && echo "E1: sección de Rust"
   git show origin/master:content/go/manifest.yaml | grep -q '^essentials:' && echo "E1: sección de Go"
   git cat-file -e origin/master:qa/fixtures/content-baseline-e1.json && echo "E1: línea base"
   git cat-file -e origin/master:qa/lib/audit-summary.ts && echo "B3: resumen"
   ```

2. **El worktree de la etapa 2:** `git worktree add ../e2-etapa-2 -b e2/etapa-2 origin/master`, y adentro, `npm ci`.
3. **Los valores de la base,** en ese worktree, con `npm run curriculum` y este script:

   ```sh
   node --input-type=module -e '
   import { readFileSync } from "node:fs";
   const doc = JSON.parse(readFileSync("build/curriculum.json", "utf8"));
   const families = ["lab", "quests", "cores", "essentials"];
   const all = families.flatMap((family) => Object.values(doc[family]).flat());
   const perLanguage = (language) => all.filter((exercise) => exercise.language === language).length;
   const topics = (language) => new Set(all.filter((exercise) => exercise.language === language).map((exercise) => exercise.topicId)).size;
   const tests = all.reduce((sum, exercise) => sum + exercise.tests.length, 0);
   console.log({ total: all.length, rust: perLanguage("rust"), go: perLanguage("go"), topicsRust: topics("rust"), topicsGo: topics("go"), tests, essentialsRust: doc.essentials.rust.length, essentialsGo: doc.essentials.go.length, lastRust: doc.essentials.rust.at(-1).id, lastGo: doc.essentials.go.at(-1).id });
   '
   ```

   Lo esperado: `total: 284`, `rust: 142`, `go: 142`, `topicsRust: 50`, `topicsGo: 50`, `tests: 852`, `essentialsRust: 5`, `essentialsGo: 5`, `lastRust: 'rust-142'` y `lastGo: 'go-142'`. Si algo difiere, el valor de `master` reemplaza al de la tabla en las tres etapas, y el delta se mantiene.
4. **Los contratos de conteo que quedan a mano:** corré el barrido de `quickstart.md` §2 con las variables de §0 de la etapa 2. Cada línea que cuenta el contenido es un contrato. La lista va al cuerpo del PR y al encargo de C.
5. **La piloto:** anotá el `minutes` y los `topicId` de la etapa piloto de cada lenguaje (`git show origin/master:content/rust/manifest.yaml`). Corré también `quickstart.md` §4 y anotá los errores que ya enseña la piloto, para que la etapa 2 no los repita.
6. **Las cuentas de la base** (TR-15): la última línea de `npm test`, la cantidad de E2E (`npx playwright test --config qa/e2e/playwright.config.ts --list | tail -1`) y la de Pest (la última línea de `COMPOSE_PROJECT_NAME=e2-etapa-2 npm run api:test`).
7. **La compuerta:** `npm test` en verde en la base.

### Unidad 1 · La etapa 2, «Valores y tipos»

#### Tarea 1.1 · El borrador de la etapa 2 (T002, C)

**Archivos:** los de «Source Code», con los valores de la columna «Etapa 2».

**Consume:**
- la fila 2 de las dos tablas de «El contenido de cada etapa» de la spec, y R1 a R17;
- los ejercicios publicados de la piloto (`content/<lenguaje>/exercises/<lenguaje>-138` a `-142`);
- los de Inicial que nombra la columna «Deja para Inicial»: `rust-04`, `rust-05`, `rust-11` a `rust-20`, `go-02`, `go-03`, `go-04`, `go-05` y los de `go-collections`;
- «Contenido del currículo» del README;
- la lista de contratos y los errores de la piloto de T001.

**Produce:** un commit `feat(content): add the Essentials stage 2 for Rust and Go` y el informe del agente.

1. **Las variables:** en `../e2-etapa-2`, las de `quickstart.md` §0 para la etapa 2.
2. **Los títulos:** elegí el título en castellano de cada uno de los diez ejercicios, uno por concepto de la fila.
3. **El rojo.** Sumá al final de `exercises`, en `qa/fixtures/curriculum-ids.json`, las diez entradas (`"rust-143": { "language": "rust", "title": "<título>" }`…). Después, actualizá cada contrato de la lista de T001 con su delta («Los valores de cada etapa»). Corré `npm run curriculum && npm test`. Lo esperado es el fallo, con `ID rust-143 declared by the fixture is missing` (uno por ID nuevo) y los checks de totales que esperan 294 y encuentran 284.
4. **La etapa en los manifiestos.** Al final de la sección `essentials` de cada manifiesto, después de la etapa piloto:

   ```yaml
     - topicId: rust-essentials-values
       topic: Valores y tipos
       minutes: <el de la piloto de Rust>
       sources:
         - title: <fuente oficial>
           url: <su URL>
       exercises:
         - rust-143
         - rust-144
         - rust-145
         - rust-146
         - rust-147
   ```

   En Go, lo mismo, con `go-essentials-values`, `go-143` a `go-147` y el `minutes` de la piloto de Go. Las fuentes las elegís vos, con el criterio R16.
5. **Los ejercicios.** Por cada ID, `exercise.yaml`, `starter.<rs|go>` y `solution.<rs|go>`, con la forma de FR-005:
   - sin `level` ni `challengeType`;
   - `kind: reparar` en uno o dos por lenguaje, con un error de la fila 2 que la piloto no haya enseñado (T001, paso 5);
   - los `.go` empiezan con `package main` y una línea en blanco, con finales LF.
6. **El verde.** Corré `npm run curriculum` y después `npm test`, y corregí hasta que los dos pasen. Corré `npm run format` y `npm run lint`.
7. **El barrido final:** `quickstart.md` §2. Ninguna línea que cuente el contenido conserva el valor anterior.
8. **La prueba previa:**
   - `quickstart.md` §4: cada `reparar` nuevo falla por el error que enseña;
   - la corrida parcial de B3 de `quickstart.md` §7, con `COMPOSE_PROJECT_NAME=e2-etapa-2` y el stack arriba: las diez soluciones aprueban y los diez iniciales fallan como corresponde. Si no hay Docker disponible, lo decís en el informe.
9. **El commit,** con el contenido y los contratos juntos (FR-018): `feat(content): add the Essentials stage 2 for Rust and Go`.
10. **El informe del agente,** para K. Por ejercicio:
    - el ID, el concepto en una frase y el `kind`;
    - el nombre de la función;
    - si es `reparar`, el error de §4.

    Además, los ejercicios de Inicial que leíste, lo que no pudiste correr y las dudas para el usuario.

#### Tarea 1.2 · Las compuertas automáticas de la etapa 2 (T003, K)

**Archivos:** ninguno nuevo. Revisa el commit de T002.

1. **El diff:** leé el commit entero contra FR-005, FR-017 y R1 a R17. Lo que no cumple vuelve a C, con el criterio que falla.
2. **Sin Docker:** `quickstart.md` §1, todo en verde.
3. **Lo que toca el PR:** las cuatro comprobaciones de `quickstart.md` §2.
4. **La base:** `quickstart.md` §3. Lo esperado es `Sin cambios fuera de la etapa: 284 ejercicios publicados intactos y 10 nuevos.`
5. **Los `reparar`:** `quickstart.md` §4, contra la fila 2 de la spec y los errores de la piloto.
6. **La superposición:** `quickstart.md` §5. Las líneas «A revisar» van al paquete de revisión.
7. **E2E y Pest:** `quickstart.md` §6, con `E2E_PORT=4302` y `COMPOSE_PROJECT_NAME=e2-etapa-2`.
8. **El rojo de los procedimientos** (Review Focus 1, 2 y 4). Va en una rama descartable, porque §2 y §3 comparan commits y §5 lee el `build/` generado: un cambio sin commit no se vería.
   1. `git switch -c e2/rojo-tmp`.
   2. Cambiá una palabra de una pista de `rust-138` y su título, en su `exercise.yaml` y en `qa/fixtures/curriculum-ids.json`, y hacé un commit: `git commit -am "chore: red demo"`.
   3. Corré §3: falla, y entre sus líneas está `rust-138: cambiaron sus huellas`.
   4. Corré la tercera comprobación de §2: aparece la línea quitada con el título viejo.
   5. Renombrá a `energia` la función del inicial y de la solución de un `completar` nuevo de Rust, y sus pruebas. Hacé un commit, corré `npm run curriculum` y después §5: falla con `rust · función energia: rust-01, <el ID>`.
   6. Descartá la rama: `git switch e2/etapa-2 && git branch -D e2/rojo-tmp`, y corré `npm run curriculum`.
   7. §2, §3 y §5 vuelven a verde.

9. **El paquete de revisión,** para U. Por ejercicio:
   - el `exercise.yaml`, el inicial y la solución;
   - si es `reparar`, el error de §4;
   - las líneas «A revisar» de §5;
   - las dudas del informe de C.

   Va en la conversación, en el orden de la etapa, primero Rust y después Go.

#### Tarea 1.3 · La revisión de la etapa 2 (T004, U, con C y K)

1. **U revisa** cada ejercicio con R1 a R17, y aprueba o pide cambios, ejercicio por ejercicio.
2. **Un pedido de cambio:**
   - C lo hace en `e2/etapa-2` con un commit `fix(content): <qué> in the Essentials stage 2`. Si cambia un título, cambia su entrada nueva de `curriculum-ids.json` en el mismo commit; las entradas nuevas todavía no se publicaron;
   - K vuelve a correr T003, pasos 2 a 7;
   - K presenta sólo lo que cambió, con el diff.
3. **Dos rondas sin aprobar un ejercicio** (Q3-A). C propone otro con el mismo ID y la misma posición, con su informe, y U decide.
4. **Si lo que falla es el tema de la etapa,** la etapa se para. K lleva al usuario la fila de la tabla que habría que cambiar, y U decide antes de seguir.
5. **La aprobación.** K la escribe en `$E2_PR_BODY`, sección «Pedagogical review», con la fecha, los diez IDs y las excepciones a los criterios que U haya aceptado.

#### Tarea 1.4 · B3, el PR y el merge de la etapa 2 (T005, K y U)

1. **El árbol limpio:** `test -z "$(git status --porcelain)"`.
2. **La corrida de registro:** `quickstart.md` §7, líneas 2 y 4, con `COMPOSE_PROJECT_NAME=e2-etapa-2`. Lo esperado:
   - código 0 y `De registro: sí · veredicto: verde`;
   - 294 soluciones que aprueban y 294 iniciales que fallan como corresponde;
   - `Hallazgos: 0` y `sin veredicto: 0`.

   Un hallazgo es un error del borrador: C lo corrige en la rama con `fix(content)` (FR-014), y se vuelve a T003 desde el paso 2. Si el arreglo toca algo que U aprobó, también se vuelve a T004.
3. **El cuerpo del PR** (`$E2_PR_BODY`), en inglés:
   - el problema completo: Esenciales tenía sólo la piloto, y qué agrega la etapa;
   - «What changes»: los diez IDs y la etapa 51;
   - «Counts»: cada contrato con su valor anterior y el nuevo;
   - «Baseline»: lo de T001, sólo en este PR;
   - «Pedagogical review»: la aprobación;
   - el bloque de `qa/curriculum-audit/summary.md`, entero;
   - «Verification»: los comandos de T003 y la corrida de B3;
   - «Not verified»: lo que no se corrió;
   - al final, la línea de atribución que pida el coordinador.
4. **El cuerpo en local:** `quickstart.md` §7, línea 5. Tiene que pasar.
5. **El PR:** K sube `e2/etapa-2` y abre el PR con el título `feat(content): add the Essentials stage 2 for Rust and Go` y ese cuerpo. La CI tiene que quedar en verde, también el check del resumen.
6. **El merge:** lo hace U. Cualquier cambio pedido en el PR vuelve a T003 y pide otra corrida de B3.
7. **El cierre:** `COMPOSE_PROJECT_NAME=e2-etapa-2 docker compose down`.

### Unidad 2 · La etapa 3, «Decidir»

#### Tarea 2.1 · El borrador de la etapa 3 (T006, C, a la vez que T004)

**Archivos:** los de «Source Code», con los valores de la columna «Etapa 3».

**Consume:**
- la fila 3 de las dos tablas de la spec, y R1 a R17;
- los ejercicios de la piloto y el borrador de la etapa 2 en `e2/etapa-2`, en su último commit;
- los de Inicial de la columna «Deja para Inicial»: `rust-06`, `rust-07`, `rust-10`, `go-06`, `go-08` y `go-09`;
- «Contenido del currículo» del README;
- la lista de contratos de T001.

**Produce:** un commit `feat(content): add the Essentials stage 3 for Rust and Go` y el informe del agente.

1. **El worktree:** `git worktree add ../e2-etapa-3 -b e2/etapa-3 e2/etapa-2`, y adentro, `npm ci`.
2. **Las variables:** las de `quickstart.md` §0, con `E2_STAGE=3`, `E2_FIRST=148`, `E2_LAST=152` y los valores «antes» de la columna «Etapa 3»: 294, 147, 882, 51, 10 y 102.
3. **Los títulos:** uno por concepto de la fila 3.
4. **El rojo.** Sumá las diez entradas al final de `exercises` en `qa/fixtures/curriculum-ids.json` y actualizá cada contrato con su delta. Corré `npm run curriculum && npm test`: falla con `ID rust-148 declared by the fixture is missing` (uno por ID nuevo) y con los totales que esperan 304 y encuentran 294.
5. **La etapa en los manifiestos,** después de la etapa 2:

   ```yaml
     - topicId: rust-essentials-decisions
       topic: Decidir
       minutes: <el de la piloto de Rust>
       sources:
         - title: <fuente oficial>
           url: <su URL>
       exercises:
         - rust-148
         - rust-149
         - rust-150
         - rust-151
         - rust-152
   ```

   En Go, `go-essentials-decisions` y `go-148` a `go-152`.
6. **Los ejercicios,** con la forma de FR-005. `bool` aparece acá, con las comparaciones (Q1-B). Va `kind: reparar` en uno o dos por lenguaje, con un error de la fila 3 que ni la piloto ni la etapa 2 enseñan.
7. **El verde:** `npm run curriculum`, `npm test`, `npm run format` y `npm run lint`.
8. **El barrido final:** `quickstart.md` §2.
9. **La prueba previa:** `quickstart.md` §4 y la corrida parcial de §7, con `COMPOSE_PROJECT_NAME=e2-etapa-3`.
10. **El commit:** `feat(content): add the Essentials stage 3 for Rust and Go`.
11. **El informe del agente,** para K. Por ejercicio: el ID, el concepto en una frase, el `kind`, el nombre de la función y, si es `reparar`, el error de §4. Además: qué supone de la etapa 2, para que T007 lo contraste con su texto final; los ejercicios de Inicial que leíste; lo que no pudiste correr y las dudas para el usuario.

#### Tarea 2.2 · El rebase y las compuertas de la etapa 3 (T007, K, después de T005)

1. **El rebase:** `git fetch origin`, y en `../e2-etapa-3`, `git rebase --onto origin/master "$(git merge-base HEAD e2/etapa-2)"`.
   - **Los conflictos de los manifiestos y de las carpetas:** la etapa 2 queda como está en `origin/master`, y la 3, al final de la sección.
   - **Los de `curriculum-ids.json`:** las entradas de `origin/master` y, al final, las diez de la etapa 3.
   - **Los de cada contrato de conteo:** el valor de `origin/master` más el delta de la etapa 3.
2. **El contraste con la etapa 2 integrada** (FR-008). C compara lo que supone su informe con el texto final de la etapa 2 en `origin/master`. Si un concepto se movió en la revisión de la 2, lo corrige con `fix(content): <qué> in the Essentials stage 3`.
3. **Las compuertas,** con las variables de la etapa 3 en `quickstart.md` §0, `E2E_PORT=4303` y `COMPOSE_PROJECT_NAME=e2-etapa-3`:
   1. el diff entero contra FR-005, FR-017 y R1 a R17; lo que no cumple vuelve a C, con el criterio que falla;
   2. `quickstart.md` §1, en verde;
   3. las cuatro comprobaciones de §2;
   4. §3, con `Sin cambios fuera de la etapa: 294 ejercicios publicados intactos y 10 nuevos.`;
   5. §4, contra la fila 3 de la spec, sin repetir un error de la piloto ni de la etapa 2;
   6. §5, con código 0; las líneas «A revisar» van al paquete de revisión;
   7. §6, en verde.

   El rojo de los procedimientos de T003 (paso 8) no se repite.
4. **El paquete de revisión,** para U. Por ejercicio: el `exercise.yaml`, el inicial, la solución, el error de §4 si es `reparar`, las líneas «A revisar» de §5 y las dudas del informe de C. Va en la conversación, en el orden de la etapa, primero Rust y después Go.

#### Tarea 2.3 · La revisión de la etapa 3 (T008, U, con C y K)

1. **U revisa** cada ejercicio de la etapa 3 con R1 a R17, y aprueba o pide cambios, ejercicio por ejercicio.
2. **Un pedido de cambio:**
   - C lo hace en `e2/etapa-3` con un commit `fix(content): <qué> in the Essentials stage 3`. Si cambia un título, cambia su entrada nueva de `curriculum-ids.json` en el mismo commit;
   - K vuelve a correr las compuertas (T007, paso 3);
   - K presenta sólo lo que cambió, con el diff.
3. **Dos rondas sin aprobar un ejercicio** (Q3-A). C propone otro con el mismo ID y la misma posición, con su informe, y U decide.
4. **Si lo que falla es el tema de la etapa,** la etapa se para. K lleva al usuario la fila de la tabla que habría que cambiar, y U decide antes de seguir.
5. **La aprobación.** K la escribe en `$E2_PR_BODY`, sección «Pedagogical review», con la fecha, los diez IDs y las excepciones a los criterios que U haya aceptado.

#### Tarea 2.4 · B3, el PR y el merge de la etapa 3 (T009, K y U)

1. **El árbol limpio:** `test -z "$(git status --porcelain)"`.
2. **La corrida de registro:** `quickstart.md` §7, líneas 2 y 4, con `COMPOSE_PROJECT_NAME=e2-etapa-3`. Lo esperado:
   - código 0 y `De registro: sí · veredicto: verde`;
   - 304 soluciones que aprueban y 304 iniciales que fallan como corresponde;
   - `Hallazgos: 0` y `sin veredicto: 0`.

   Un hallazgo es un error del borrador: C lo corrige en la rama con `fix(content)` (FR-014), y se vuelve a las compuertas (T007, paso 3). Si el arreglo toca algo que U aprobó, también se vuelve a T008.
3. **El cuerpo del PR** (`$E2_PR_BODY`), en inglés:
   - el problema completo: qué tenía Esenciales y qué agrega la etapa;
   - «What changes»: los diez IDs y la etapa 52;
   - «Counts»: cada contrato con su valor anterior y el nuevo;
   - «Pedagogical review»: la aprobación de T008;
   - el bloque de `qa/curriculum-audit/summary.md`, entero;
   - «Verification»: los comandos de las compuertas y la corrida de B3;
   - «Not verified»: lo que no se corrió;
   - al final, la línea de atribución que pida el coordinador.
4. **El cuerpo en local:** `quickstart.md` §7, línea 5. Tiene que pasar.
5. **El PR:** K sube `e2/etapa-3` y abre el PR con el título `feat(content): add the Essentials stage 3 for Rust and Go` y ese cuerpo. La CI tiene que quedar en verde, también el check del resumen.
6. **El merge:** lo hace U. Cualquier cambio pedido en el PR vuelve a las compuertas (T007, paso 3) y pide otra corrida de B3.
7. **El cierre:** `COMPOSE_PROJECT_NAME=e2-etapa-3 docker compose down`.

### Unidad 3 · La etapa 4, «Repetir»

#### Tarea 3.1 · El borrador de la etapa 4 (T010, C, a la vez que T008)

**Archivos:** los de «Source Code», con los valores de la columna «Etapa 4».

**Consume:**
- la fila 4 de las dos tablas de la spec, y R1 a R17;
- la piloto, la etapa 2 integrada y el borrador de la etapa 3 en `e2/etapa-3`;
- los de Inicial de la columna «Deja para Inicial»: `rust-08`, `rust-09`, los de `rust-iterators`, `go-07`, los de `go-slices` y `go-10`;
- «Contenido del currículo» del README;
- la lista de contratos de T001.

**Produce:** un commit `feat(content): add the Essentials stage 4 for Rust and Go` y el informe del agente.

1. **El worktree:** `git worktree add ../e2-etapa-4 -b e2/etapa-4 e2/etapa-3`, y adentro, `npm ci`.
2. **Las variables:** las de `quickstart.md` §0, con `E2_STAGE=4`, `E2_FIRST=153`, `E2_LAST=157` y los valores «antes» de la columna «Etapa 4»: 304, 152, 912, 52, 15 y 104.
3. **Los títulos:** uno por concepto de la fila 4.
4. **El rojo.** Las diez entradas al final de `exercises` en `qa/fixtures/curriculum-ids.json` y cada contrato con su delta. `npm run curriculum && npm test` falla con `ID rust-153 declared by the fixture is missing` (uno por ID nuevo) y con los totales que esperan 314 y encuentran 304.
5. **La etapa en los manifiestos,** después de la etapa 3:

   ```yaml
     - topicId: rust-essentials-loops
       topic: Repetir
       minutes: <el de la piloto de Rust>
       sources:
         - title: <fuente oficial>
           url: <su URL>
       exercises:
         - rust-153
         - rust-154
         - rust-155
         - rust-156
         - rust-157
   ```

   En Go, `go-essentials-loops` y `go-153` a `go-157`.
6. **Los ejercicios,** con la forma de FR-005. Va `kind: reparar` en uno o dos por lenguaje, con un error de la fila 4 que ninguna etapa anterior enseña. En Go, `for i := range n` está disponible (Go 1.22 o posterior; el sandbox tiene 1.27).
7. **El verde:** `npm run curriculum`, `npm test`, `npm run format` y `npm run lint`.
8. **El barrido final:** `quickstart.md` §2.
9. **La prueba previa:** `quickstart.md` §4 y la corrida parcial de §7, con `COMPOSE_PROJECT_NAME=e2-etapa-4`.
10. **El commit:** `feat(content): add the Essentials stage 4 for Rust and Go`.
11. **El informe del agente,** para K. Por ejercicio: el ID, el concepto en una frase, el `kind`, el nombre de la función y, si es `reparar`, el error de §4. Además: qué supone de las etapas 2 y 3, para que T011 lo contraste con el texto final de la 3; los ejercicios de Inicial que leíste; lo que no pudiste correr y las dudas para el usuario.

#### Tarea 3.2 · El rebase y las compuertas de la etapa 4 (T011, K, después de T009)

1. **El rebase:** `git fetch origin`, y en `../e2-etapa-4`, `git rebase --onto origin/master "$(git merge-base HEAD e2/etapa-3)"`.
   - **Los conflictos de los manifiestos y de las carpetas:** las etapas 2 y 3 quedan como están en `origin/master`, y la 4, al final de la sección.
   - **Los de `curriculum-ids.json`:** las entradas de `origin/master` y, al final, las diez de la etapa 4.
   - **Los de cada contrato de conteo:** el valor de `origin/master` más el delta de la etapa 4.
2. **El contraste con la etapa 3 integrada** (FR-008). C compara lo que supone su informe con el texto final de la etapa 3, y corrige con `fix(content): <qué> in the Essentials stage 4`.
3. **Las compuertas,** con las variables de la etapa 4 en `quickstart.md` §0, `E2E_PORT=4304` y `COMPOSE_PROJECT_NAME=e2-etapa-4`:
   1. el diff entero contra FR-005, FR-017 y R1 a R17; lo que no cumple vuelve a C, con el criterio que falla;
   2. `quickstart.md` §1, en verde;
   3. las cuatro comprobaciones de §2;
   4. §3, con `Sin cambios fuera de la etapa: 304 ejercicios publicados intactos y 10 nuevos.`;
   5. §4, contra la fila 4 de la spec, sin repetir un error de la piloto ni de las etapas 2 y 3;
   6. §5, con código 0; las líneas «A revisar» van al paquete de revisión;
   7. §6, en verde.

   El rojo de los procedimientos de T003 (paso 8) no se repite.
4. **El paquete de revisión,** para U. Por ejercicio: el `exercise.yaml`, el inicial, la solución, el error de §4 si es `reparar`, las líneas «A revisar» de §5 y las dudas del informe de C. Va en la conversación, en el orden de la etapa, primero Rust y después Go.

#### Tarea 3.3 · La revisión de la etapa 4 (T012, U, con C y K)

1. **U revisa** cada ejercicio de la etapa 4 con R1 a R17, y aprueba o pide cambios, ejercicio por ejercicio.
2. **Un pedido de cambio:**
   - C lo hace en `e2/etapa-4` con un commit `fix(content): <qué> in the Essentials stage 4`. Si cambia un título, cambia su entrada nueva de `curriculum-ids.json` en el mismo commit;
   - K vuelve a correr las compuertas (T011, paso 3);
   - K presenta sólo lo que cambió, con el diff.
3. **Dos rondas sin aprobar un ejercicio** (Q3-A). C propone otro con el mismo ID y la misma posición, con su informe, y U decide.
4. **Si lo que falla es el tema de la etapa,** la etapa se para. K lleva al usuario la fila de la tabla que habría que cambiar, y U decide antes de seguir.
5. **La aprobación.** K la escribe en `$E2_PR_BODY`, sección «Pedagogical review», con la fecha, los diez IDs y las excepciones a los criterios que U haya aceptado.

#### Tarea 3.4 · B3, el PR y el merge de la etapa 4 (T013, K y U)

1. **El árbol limpio:** `test -z "$(git status --porcelain)"`.
2. **La corrida de registro:** `quickstart.md` §7, líneas 2 y 4, con `COMPOSE_PROJECT_NAME=e2-etapa-4`. Lo esperado:
   - código 0 y `De registro: sí · veredicto: verde`;
   - 314 soluciones que aprueban y 314 iniciales que fallan como corresponde;
   - `Hallazgos: 0` y `sin veredicto: 0`.

   Un hallazgo es un error del borrador: C lo corrige en la rama con `fix(content)` (FR-014), y se vuelve a las compuertas (T011, paso 3). Si el arreglo toca algo que U aprobó, también se vuelve a T012.
3. **El cuerpo del PR** (`$E2_PR_BODY`), en inglés:
   - el problema completo: qué tenía Esenciales y qué agrega la etapa;
   - «What changes»: los diez IDs y la etapa 53;
   - «Counts»: cada contrato con su valor anterior y el nuevo;
   - «Pedagogical review»: la aprobación de T012;
   - el bloque de `qa/curriculum-audit/summary.md`, entero;
   - «Verification»: los comandos de las compuertas y la corrida de B3;
   - «Not verified»: lo que no se corrió;
   - al final, la línea de atribución que pida el coordinador.
4. **El cuerpo en local:** `quickstart.md` §7, línea 5. Tiene que pasar.
5. **El PR:** K sube `e2/etapa-4` y abre el PR con el título `feat(content): add the Essentials stage 4 for Rust and Go` y ese cuerpo. La CI tiene que quedar en verde, también el check del resumen.
6. **El merge:** lo hace U. Cualquier cambio pedido en el PR vuelve a las compuertas (T011, paso 3) y pide otra corrida de B3.
7. **El cierre:** `COMPOSE_PROJECT_NAME=e2-etapa-4 docker compose down`.

### 4. El cierre (K)

#### Tarea 4.1 · Esenciales completo (T014)

1. **El contenido completo:** `quickstart.md` §8. Lo esperado es `Esenciales completo: 20 ejercicios por lenguaje en las etapas 50 a 53.` (SC-001).
2. **Los cuatro juntos:** `quickstart.md` §4 sobre los cuatro, con ningún error en dos etapas, y §5, con código 0 (SC-006).
3. **La suite:** `quickstart.md` §1 y §6 en `origin/master`.
4. **En el navegador** (`qa/AGENTS.md`, para UI):
   - levantá la vista previa (`docker compose -f docker/compose.preview.yaml up --build -d --wait`, en `http://localhost:8765`) y abrí el Laboratorio en Rust;
   - la pestaña Esenciales muestra 20 desafíos y cuatro temas, del 01 al 04;
   - «siguiente» desde el último de Esenciales abre `rust-01`;
   - repetí en Go, y apagá la vista previa con `docker compose -f docker/compose.preview.yaml down`.
5. **Los worktrees:** `git worktree remove ../e2-etapa-2`, `../e2-etapa-3` y `../e2-etapa-4`, y las ramas locales.
6. **La hoja de ruta:** K pasa la fila de E2 a «Entregado», con los tres PRs y lo que se verificó. Es un cambio del coordinador, fuera de esta carpeta.

## Cobertura de requisitos

| Requisito | Tareas |
| --- | --- |
| FR-001 | T002, T006, T010 y T014 |
| FR-002 | T002, T006 y T010 (lo que leen); T007 y T011 (el contraste); T004, T008 y T012 (R1) |
| FR-003 | `quickstart.md` §5 y §4 en T003, T007, T011 y T014; R4 en la revisión |
| FR-004 | `quickstart.md` §4 en T002, T003, T006, T007, T010 y T011; B3 en T005, T009 y T013 |
| FR-005 | `npm run curriculum` en los borradores y en las compuertas; T003, paso 1 |
| FR-006 | La cadena de ramas (R1); los rebases de T007 y T011; `quickstart.md` §3 |
| FR-007 | Los valores de cada etapa; el `content-check` de E1 en `npm test`; `quickstart.md` §3 y §8 |
| FR-008 | El informe del agente en T002, T006 y T010; el contraste de T007 y T011 |
| FR-009 | T003, T007 y T011 |
| FR-010 | `quickstart.md` §3 en T003, T007 y T011 |
| FR-011 | T004, T008 y T012 |
| FR-012 | T005, T009 y T013 |
| FR-013 | T005, T009 y T013 |
| FR-014 | T005, T009 y T013, paso 2 |
| FR-015 | `quickstart.md` §2 (el fixture) y §3; `npm test` (`boot-check`, `lab-state-check` e `import-cases-check`) |
| FR-016 | `quickstart.md` §6 |
| FR-017 | `quickstart.md` §2 (los archivos y las carpetas) |
| FR-018 | El paso del rojo y el barrido de T002, T006 y T010; `quickstart.md` §2 en las compuertas |
| SC-001 | T014, paso 1 |
| SC-002 | `quickstart.md` §2 y §3 en cada compuerta |
| SC-003 | T005, T009 y T013, paso 2 |
| SC-004 | T004, T008 y T012, paso 5, contra `startedAt` del bloque (Review Focus) |
| SC-005 | `quickstart.md` §2 |
| SC-006 | `quickstart.md` §4 y §5; T014, paso 2 |
| SC-007 | `quickstart.md` §6 |
| SC-008 | `npm test` (las fixtures congeladas) y `startup-storage.spec.ts`; la importación de una copia con progreso de Esenciales queda por construcción: ningún ID ni ejercicio publicado cambia (§3). Ver «Riesgos» |

## Descargas y permisos

Ninguna dependencia nueva. Las únicas descargas son `npm ci` en cada worktree nuevo, con el lockfile de siempre, y `git fetch origin`. Las imágenes del sandbox ya existen. Si faltaran, se reconstruyen con `docker compose --profile sandbox-images build` (ADR 0005), que no baja nada con las bases en el host. El usuario decide el modelo del redactor (decisión 1 del informe).

## Riesgos y lo que quedó sin verificar

1. **Nada se ejecutó.** El plan sale de leer `master` (bb480677), el plan de E1 (`spec-e1`, cabfdb67) y la auditoría de B3 (`impl-b3`, 72574433). Los scripts de `quickstart.md` no se corrieron, porque E1 no existe todavía: el primer uso es T001, y T003 los prueba en rojo.
2. **Los nombres que el plan supone de E1:** `doc.essentials` en el documento, las porciones `essentials.rust` y `essentials.go` y el `content-check` de etapas de cinco. Si E1 los implementa con otros nombres, T001 lo detecta, y K ajusta las variables y los scripts antes de T002.
3. **Los mensajes esperados del rojo** de T002, T006 y T010 dependen de cómo E1 escriba sus checks de totales. El mensaje de `curriculum-ids-check` sí está medido en `master`.
4. **SC-008, la importación de una copia con progreso de Esenciales,** no tiene una prueba propia en E2. Queda cubierta por construcción (§3) y por las fixtures congeladas. Si E1 suma una E2E de exportar e importar, esa la cubre.
5. **El barrido de conteos pide criterio.** `git grep -w` encuentra cada aparición de un número, y no todas cuentan el contenido. Lo mitiga la revisión de K y la corrida de las suites que los usan (Pest y E2E) en cada compuerta.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
