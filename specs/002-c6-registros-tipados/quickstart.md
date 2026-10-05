# Quickstart: validar C6

**Fecha**: 2026-10-05 | **Plan**: [plan.md](./plan.md) | **Modelo**: [data-model.md](./data-model.md)

Escenarios que prueban que C6 funciona de punta a punta. Cada uno dice qué se corre y qué tiene que dar. Los comandos van desde la raíz del worktree; el detalle de cada tarea está en el plan.

## Antes de empezar

- **Un `.env` por worktree:** `sh backend/api/scripts/init-env.sh`. Sin él, Compose no corre ningún comando.
- **Un nombre de proyecto propio en cada terminal:** `export COMPOSE_PROJECT_NAME=taller-c6-<dueño>`, por ejemplo `taller-c6-b`. `docker/compose.yaml` fija `name: taller-rust-go`, el nombre del stack que corre en el checkout principal, y la variable pesa más que ese nombre.
- **Nada se descarga.** Las imágenes base y la caché de las capas de `composer install` y `npm ci` ya están en la máquina, y C6 no cambia `composer.json`, `composer.lock` ni `package-lock.json`. Al correr Compose a mano, pasá `--pull never`. Si un comando quisiera bajar algo, pará y pedí permiso.

## 1. El oráculo de filas, antes de tocar `app/` (T001)

Con el código de C2 intacto, en la base de la rama:

```sh
docker compose --profile test run --rm -T --build --no-deps --pull never \
  --entrypoint php test tests/Support/print-row-oracle.php \
  > backend/api/tests/Support/row-oracle.json
npm run api:test -- --filter=RowOracleTest
```

**Resultado esperado:**

- `row-oracle.json` trae la huella del documento de la imagen y una entrada `{rows, sha256}` por cada una de las 19 tablas: 274 filas en `exercises`, 822 en `exercise_tests`, 32 en `atlas_concepts` y el resto como fija `ContentRoundTripTest`.
- `RowOracleTest` pasa, y el commit sólo trae archivos de `backend/api/tests/`.

Al planificar, sobre `8f1bdbc`, el oráculo dio la huella de documento `ef8f5715…` y salió igual en dos corridas.

**Si el contenido cambia en `master` mientras dura C6**, `RowOracleTest` falla con un mensaje que lo dice. No se regenera con el código nuevo: se regenera en un worktree aparte, en la base de la rama, que tiene el código de C2 y el `content/` nuevo.

1. Creá el worktree: `git worktree add <dir> "$(git merge-base HEAD master)"`.
2. Corré ahí el mismo comando, con el `.env` y el nombre de proyecto de ese worktree.
3. Copiá el `row-oracle.json` que resulte.

`print-row-oracle.php` construye los códecs de C2 por su nombre, así que con el código nuevo no corre.

## 2. Cada tarea, en verde

| Qué | Comando | Resultado esperado |
| --- | --- | --- |
| Las pruebas de una tarea | `npm run api:test -- --filter=<Prueba>` | Primero fallan por la razón que dice el plan; después de implementar, pasan |
| La suite pura | `npm run api:test -- --testsuite=Unit` | Verde, con `RowOracleTest`, `ContentRoundTripTest` y las pruebas de `tests/Unit/Record/` |
| Toda la API | `npm run api:test` | Verde: `Unit`, `Feature` y `Content`, contra MySQL real |
| El nivel 9 en los archivos propios | `npm run api:analyse -- --level 9 <rutas>` | 0 errores; mientras `phpstan.neon` siga en 6, el `--level 9` lo pide a mano |
| Formato | `npm run api:format:check` | Verde (Pint) |
| Tras cada tarea | `npm run api:test:down` | La base de pruebas apagada |

## 3. Un dato mal escrito no pasa (SC-005, T014)

En una rama descartable, después de T011:

1. En una lectura de cada familia, cambiá el nombre de una propiedad por uno que el registro no tiene. Por ejemplo, `$concept->labExerciseId` por `$concept->labExercise`. Las familias son ejercicio, taller, mundo, Atlas y guía.
2. Corré `npm run api:analyse -- --level 9`.

**Resultado esperado:** cada mutación hace fallar el análisis con «Access to an undefined property», el archivo y la línea, sin correr pruebas: 5 de 5. Las mutaciones se descartan, y la evidencia va en el mensaje del commit de cierre.

## 4. Desplegar sobre una base de C2 (SC-002, T015)

Lo corre el coordinador, con un stack propio que no toca `taller-rust-go` ni su volumen:

1. **La base de C2.** En un worktree en la base de la rama, con su `.env`:

   ```sh
   export COMPOSE_PROJECT_NAME=taller-c6-qa TALLER_PORT=8081
   docker compose up --build -d --wait
   ```

   El servicio `migrate` importa el contenido con el código de C2. Guardá los `ETag` y el `Content-Version` de las 17 porciones con `npm run api:content:check`, y la cantidad de filas de `content_imports`.

2. **La imagen de C6.** En el worktree de C6, copiá el mismo `.env` (la base ya se creó con esas contraseñas), usá las mismas dos variables y corré `sh backend/api/scripts/deploy.sh`.

**Resultado esperado:**

- el import dice «El contenido ya está importado (sha256 …): se verificaron y precalentaron las 17 porciones, sin escribir nada»;
- `content_imports` tiene las mismas filas;
- las 17 porciones responden 304 a sus `ETag` anteriores, con el mismo `Content-Version`;
- `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh` pasan.

3. **Limpieza.** `docker compose down -v`, con `COMPOSE_PROJECT_NAME=taller-c6-qa`, en los dos worktrees.

## 5. Compuerta final (SC-007, T015)

Con `phpstan.neon` en el nivel 9, `npm run api:analyse` termina con 0 errores, sin baseline ni `ignoreErrors`. Además, `grep -rn JsonSerializable backend/api/app/Content` no encuentra nada (FR-003).

Además pasan:

- `npm run api:test`;
- `npm run api:format:check`;
- `npm test`;
- `npm run lint`;
- `npm run format:check`;
- `git diff --check`;
- lo del escenario 4.

Las pruebas observables de C2 no cambian sus valores esperados: el diff de `backend/api/tests/` sólo cambia cómo se arma la entrada. Después de esta compuerta, T016 retira el oráculo de filas y la suite `Unit` sigue en verde.
