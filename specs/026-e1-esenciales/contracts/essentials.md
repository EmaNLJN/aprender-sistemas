# Contratos de E1: la sección, las porciones y las interfaces del front

## 1. La sección `essentials` del manifiesto

En `content/<lenguaje>/manifest.yaml`, después de `systems:`:

```yaml
essentials:
  - topicId: <lenguaje>-<tema>     # único en el lenguaje, como cualquier topicId
    topic: <texto del tema>
    minutes: <entero ≥ 1>
    sources:                       # opcional, como en lab
      - title: <texto>
        url: https://…
    exercises:
      - <lenguaje>-138
      - …
```

- **Admite** las claves de una etapa de `lab` (`topicId`, `topic`, `exercises` y, como opcionales, `kind`, `minutes`, `imports`, `visual` y `sources`), salvo `level`.
- **El nivel lo fija la sección:** cada ejercicio publica `level: essentials`. `level` en la etapa o en `exercise.yaml` es un error («no va en exercise.yaml: lo fija la sección essentials»).
- **`essentials` fuera de esta sección** es un error: `lab` sigue aceptando sólo `beginner`, `medium`, `advanced` y `expert`.
- **La etapa** sigue a la última de `systems`: hoy, 50.
- **Los IDs** son correlativos por lenguaje, después del último de hoy (`rust-138`…, `go-138`…), y nunca se reutilizan.
- **El documento** exige ejercicios de Esenciales en los dos lenguajes. Sin ellos, `npm run curriculum` falla con «content/<lenguaje>/manifest.yaml: falta la sección essentials: Esenciales necesita al menos una etapa en cada lenguaje».

## 2. Las porciones y los recursos

| Porción | Recurso | Corte |
| --- | --- | --- |
| `essentials.rust` | `GET /api/exercises?catalog=essentials&language=rust` | `language` |
| `essentials.go` | `GET /api/exercises?catalog=essentials&language=go` | `language` |

- **Rigen las reglas de C2** ([spec 001](../../001-c2-contenido-mysql/spec.md), FR-013 a FR-025):
  - los bytes del generador;
  - `ETag` con los primeros 32 hexadecimales de la huella;
  - 304 también con validador débil;
  - `Content-Version`;
  - `Cache-Control: private, no-cache`;
  - 503 `content_not_imported`, y la sesión de C3a.
- **Los parámetros:** `?catalog=essentials&domain=pc`, o sin `language`, responden 422 `validation_failed`. `?catalog=otro` también, con el mensaje «Falta el catálogo o no es válido: usá lab, quests, cores o essentials.» (`Portion::CATALOGS` suma el código al final).
- **`GET /api/exercises/rust-138`** sirve los bytes de su `contentHash`, y responde 410 si se retiró.
- **El orden de `Portion::cases()`:**
  1. las 17 de hoy;
  2. `essentials.rust`;
  3. `essentials.go`;
  4. `harness`.
- **`GET /api/session`**, en `catalogs`:

  ```json
  [
    { "code": "essentials", "sliceBy": "language", "chainPosition": 1 },
    { "code": "cores", "sliceBy": "domain", "chainPosition": null },
    { "code": "lab", "sliceBy": "language", "chainPosition": null },
    { "code": "quests", "sliceBy": "language", "chainPosition": null }
  ]
  ```

## 3. Las interfaces del front

`frontend/src/shared/config/levels.ts` suma, sin cambiar lo que ya exporta:

```ts
export const ESSENTIALS_LEVEL = 'essentials' as const;

export const EXERCISE_LEVEL_IDS = [ESSENTIALS_LEVEL, ...LEVEL_IDS] as const;

export type ExerciseLevelId = (typeof EXERCISE_LEVEL_IDS)[number];

export const EXERCISE_LEVEL_LABELS: Record<ExerciseLevelId, string> = {
  essentials: 'Esenciales',
  ...LEVEL_LABELS,
};
```

`frontend/src/entities/exercise`:

```ts
// model/types.ts
level?: ExerciseLevelId;

// model/selectors.ts
export function levelOf(exercise: Pick<Exercise, 'level' | 'stage'>): ExerciseLevelId;

// model/exercise-catalog.ts
export interface ExerciseGroups {
  rustEssentials: readonly Exercise[];
  goEssentials: readonly Exercise[];
  rustLab: readonly Exercise[];
  // …los siete de hoy, sin cambios
}
// createExerciseCatalog: rustEssentials, goEssentials y después el orden de hoy.
```

`frontend/src/pages/lab/model/map-selectors.ts`:

```ts
export type LevelFilter = ExerciseLevelId | 'all';

export function todayChallenge(
  exercises: readonly Exercise[],
  records: LabRecords,
  filters: Pick<MapFilters, 'level' | 'extraOnly'>,
  now: number,
): Exercise | undefined; // misma firma; regla nueva (research.md, R4)

export function topicNumber(first: Exercise, exercises: readonly Exercise[]): number;
```

`frontend/src/shared/api/content/portions.ts`: `PORTION_NAMES` suma `'essentials.rust'` y `'essentials.go'` al final.

`frontend/src/app/content/content.ts`: `Content` suma `essentials: Record<Language, Exercise[]>`.

Si A3 ya entró:
- `PORTION_RESOURCES` suma las dos URL de §2;
- `COPY_FORMAT` pasa de 1 a 2;
- los dos dobles (`qa/lib/content-server.ts` y `qa/e2e/lib/content-portions.ts`) suman las dos porciones.

## 4. Lo que no cambia

- `window.*`: ningún global nuevo (hallazgo E1-7).
- `LEVEL_IDS`, `LEVEL_LABELS`, el Atlas, la campaña, Sistemas, la Biblioteca y el Recorrido.
- El formato v1 del progreso, `/api/sync`, `/api/runs` y las tablas de progreso.
