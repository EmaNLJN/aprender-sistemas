---
description: "Plantilla de tasks.md del taller: un registro liviano de lo que se hizo"
---

# Tasks: [FEATURE NAME]

**Input**: `specs/[###-feature-name]/` (`spec.md`, `plan.md` y, si existen, `research.md`, `data-model.md` y `contracts/`)

<!--
  Reglas del taller (constitución, principio VIII: persistencia flow-forward). /speckit-tasks
  reemplaza las tareas de ejemplo por las reales y borra este comentario.

  - Una línea por tarea: `- [ ] T001 [P] [US1] Descripción con la ruta del archivo`.
    [P] sólo si corre en paralelo; [US#] sólo en las fases de historias.
  - Al cerrarla se marca [x] y, como mucho, se agrega una sublínea con la evidencia: el commit
    o el PR que la cerró (`  - 3f2a9c1` o `  - #12`).
  - Sin salidas de comandos, bitácoras ni narraciones de avance. Sin secciones de dependencias,
    ejemplos de paralelismo ni estrategia: el orden de las fases y de las historias ya las dice.
  - Mientras la feature está en curso, /speckit-converge puede agregar tareas al final, con el
    mismo formato. Al entregarla, el archivo queda inmutable: los cambios posteriores van a una
    spec nueva.
  - Las pruebas no son opcionales (constitución, principio II): cada historia abre con sus
    tareas de prueba, que fallan antes de implementar.
-->

## Phase 1: Setup

- [ ] T001 [Tarea de preparación, con la ruta del archivo]

## Phase 2: Foundational (bloquea las historias)

- [ ] T002 [Tarea bloqueante para todas las historias, con la ruta del archivo]

## Phase 3: User Story 1 - [Título] (Priority: P1)

- [ ] T003 [P] [US1] Prueba de [comportamiento] en [ruta]
- [ ] T004 [US1] Implementar [comportamiento] en [ruta]

## Phase N: Polish

- [ ] TXXX [Tarea transversal, con la ruta del archivo]
