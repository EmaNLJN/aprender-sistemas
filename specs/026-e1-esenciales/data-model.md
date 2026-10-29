# Data Model: E1 · La sesión Esenciales

E1 no crea tablas (ADR 0006 §10). Cambian una columna, una fila de `catalogs`, las filas de contenido que trae la etapa piloto, el documento que genera `tools/content` y su meta. Base: el DDL de [`specs/001-c2-contenido-mysql/data-model.md`](../001-c2-contenido-mysql/data-model.md) y las migraciones de `backend/api/database/migrations/`.

## 1. La columna `exercises.level`

| Antes | Después |
| --- | --- |
| `ENUM('beginner','medium','advanced','expert') CHARACTER SET ascii COLLATE ascii_bin NULL` | `ENUM('beginner','medium','advanced','expert','essentials') CHARACTER SET ascii COLLATE ascii_bin NULL` |

- **El valor va al final:** el orden de la cadena no sale del índice del ENUM (D05), y agregar en el medio renumera los miembros.
- **La migración:** `backend/api/database/migrations/<fecha>_100001_add_essentials_to_exercises_level.php`, con un solo `ALTER TABLE` y sin `ALGORITHM` (research.md, R9).
- **El `down()`** vuelve a los cuatro valores. Falla si alguna fila tiene `essentials`, a propósito: E1 se vuelve atrás retirando el catálogo (ADR 0006 §10).
- **No cambian** `workshops.level`, `worlds.level` ni `atlas_concepts.level` (FR-012).

## 2. La fila de `catalogs`

| code | slice_by | chain_position | status |
| --- | --- | --- | --- |
| `essentials` | `language` | 1 | `active` |

- La escribe el import a partir de `catalogs` del meta, como las otras tres.
- `lab`, `quests` y `cores` siguen con `chain_position` NULL.
- La validación de `ContentRows` (posiciones únicas y contiguas desde 1) y los CHECK `catalogs_chain_position_check` y `catalogs_chain_lifecycle_check` ya la admiten.

## 3. Las filas de la etapa piloto

| Tabla | Filas nuevas | Total con E1 |
| --- | --- | --- |
| `catalogs` | 1 | 4 |
| `topics` | 2 (un tema por lenguaje) | 100 |
| `exercises` | 10 (`rust-138` a `rust-142` y `go-138` a `go-142`), con `catalog` `essentials`, `domain` NULL, `stage` 50, `level` `essentials` | 284 |
| `exercise_grading_versions` | 10 | 284 |
| `exercise_tests` | 30 (tres por ejercicio) | 852 |
| `exercise_hints` | 30 (tres por ejercicio) | 852 |

- **Los totales** suponen la etapa piloto de Q5: cinco ejercicios por lenguaje, cada uno con tres pruebas y tres pistas.
- **Las pruebas toman los esperados de la base de T001 más estos deltas** (TR-15), no de un número escrito a mano.
- **El índice** `exercises_catalog_language_status_position_index` sirve la porción nueva, como sirve las de `lab` y `quests`.

## 4. El documento y el meta

`build/curriculum.json` suma una clave al final, después de `atlas`:

```json
"essentials": {
  "rust": [ /* los ejercicios de Esenciales de Rust, en el orden del manifiesto */ ],
  "go": [ /* los de Go */ ]
}
```

- **Cada ejercicio** tiene el orden de claves de uno de `lab` con `level` (`EXERCISE_KEY_ORDER.lab`), con `level` siempre en `essentials` y `stage` desde 50.
- **El meta** (`build/curriculum.meta.json`) cambia en tres lugares:
  - `catalogs` empieza con `{ "code": "essentials", "sliceBy": "language", "chainPosition": 1 }`;
  - `portions` suma `essentials.rust` y `essentials.go` después de `guide` y antes de `harness`: 20 claves;
  - `exercises` suma las tres huellas de cada ejercicio nuevo.
- **No cambian** los bytes ni las huellas de las 17 porciones de hoy, ni el `stage` ni las tres huellas de los 274 ejercicios. Lo fija `qa/fixtures/content-baseline-e1.json` (§5).

## 5. La línea base congelada `qa/fixtures/content-baseline-e1.json`

```json
{
  "portions": { "lab.rust": "<sha256>", "...": "las 17 de hoy" },
  "exercises": {
    "rust-01": { "stage": 1, "contentHash": "<sha256>", "gradingHash": "<sha256>", "starterHash": "<sha256>" },
    "...": "los 274 de hoy"
  }
}
```

- La escribe T001 desde el `build/` de la base.
- No se regenera.
- La compara `qa/content-baseline-check.ts`: siempre, la etapa de los 274; con `--full`, como compuerta de E1, las huellas de las 17 porciones y de los 274 (FR-039 y SC-001).

## 6. El progreso

Sin cambios de forma. Un ejercicio de Esenciales se guarda por su ID en `records` del laboratorio v1, en `exercise_progress` y en `attempts`, con las reglas de D1 y de B2.
