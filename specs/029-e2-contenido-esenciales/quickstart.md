# Quickstart: verificar una etapa de E2

**Fecha**: 2026-10-28 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Investigación**: [research.md](./research.md)

Estos son los comandos de las compuertas de una etapa. Corren desde la raíz del worktree de la etapa, con `bash` o `zsh`, en Linux o en macOS. Cada comando de Docker lleva su `COMPOSE_PROJECT_NAME` en la misma línea (`backend/api/AGENTS.md`). Ningún script de este archivo se commitea: son procedimientos, no herramientas (spec, YAGNI).

## 0. Las variables de la etapa

Los valores salen de «Los valores de cada etapa» del plan, verificados en T001. Para la etapa 2:

```sh
export E2_STAGE=2 E2_FIRST=143 E2_LAST=147
export E2_BEFORE_TOTAL=284 E2_BEFORE_PER_LANGUAGE=142 E2_BEFORE_TESTS=852
export E2_BEFORE_TOPICS=50 E2_BEFORE_ESSENTIALS=5 E2_BEFORE_TOPIC_ROWS=100
export E2_NEW_IDS="$(for language in rust go; do seq -f "$language-%g" "$E2_FIRST" "$E2_LAST"; done | tr '\n' ' ')"
export E2_SNAP="$(mktemp -d)"
export E2_PR_BODY="$(cd .. && pwd)/pr-e2-etapa-$E2_STAGE.md"
git fetch origin
```

- `E2_NEW_IDS` queda con los diez IDs separados por espacios: `rust-143 … rust-147 go-143 … go-147`.
- `E2_SNAP` es una carpeta temporal para los documentos generados.
- `E2_PR_BODY` es el borrador del cuerpo del PR, al lado de los worktrees y fuera del repositorio.

## 1. Sin Docker

```sh
npm run curriculum
npm test
npm run lint
npm run format:check
git diff --check
```

Todo en verde. `npm test` incluye:
- el `content-check` de E1, con las etapas de cinco y los IDs y las etapas atados a la posición;
- `curriculum-ids-check`;
- la parte permanente de la línea base de E1;
- el check estático del caché de Go de B3;
- las fixtures de progreso congeladas: `boot-check`, `lab-state-check` e `import-cases-check`.

## 2. Lo que toca el PR y los conteos

**Los archivos permitidos** (FR-017). Las dos salidas tienen que quedar vacías: la segunda cuida la línea base de E1, que la lista de `qa/*-check.ts` admitiría (FR-015).

```sh
git diff --name-only origin/master...HEAD | grep -vE '^(content/(rust|go)/manifest\.yaml|content/(rust|go)/exercises/(rust|go)-[0-9]+/(exercise\.yaml|starter\.(rs|go)|solution\.(rs|go))|qa/fixtures/curriculum-ids\.json|qa/[a-z-]+-check\.ts|qa/e2e/specs/lab-(map|essentials)\.spec\.ts|backend/api/tests/.+\.php|README\.md|frontend/src/index\.html)$'
git diff --name-only origin/master...HEAD -- qa/content-baseline-check.ts qa/fixtures/content-baseline-e1.json
```

**Sólo carpetas de ejercicio nuevas, y son las de la etapa.** La primera salida tiene que quedar vacía, y la segunda tiene que ser `E2_NEW_IDS`, ordenada:

```sh
git diff --name-only --diff-filter=MDR origin/master...HEAD -- content/rust/exercises content/go/exercises
git diff --name-only --diff-filter=A origin/master...HEAD -- content/rust/exercises content/go/exercises | sed -E 's#^content/[a-z]+/exercises/([a-z]+-[0-9]+)/.*#\1#' | sort -u | tr '\n' ' '
```

**`curriculum-ids.json` sólo crece** (FR-015 y Review Focus 2). La salida tiene que quedar vacía. La única línea quitada que se admite es una llave de cierre que pasa a llevar coma:

```sh
git diff -U0 origin/master...HEAD -- qa/fixtures/curriculum-ids.json | grep -E '^-[^-]' | grep -vE '^-[[:space:]]*\},?$'
```

**El barrido de conteos** (FR-018 y Review Focus 5). Corre antes de editar, para encontrar los contratos, y otra vez después, para comprobar que ningún conteo quedó viejo. Después de editar, cada línea que quede tiene que ser una que no cuenta el contenido, y el coordinador lo confirma leyéndola:

```sh
git grep -nwE "(${E2_BEFORE_TOTAL}|${E2_BEFORE_PER_LANGUAGE}|${E2_BEFORE_TESTS})" -- qa backend/api/tests README.md frontend/src/index.html ':(exclude)qa/fixtures'
git grep -nwE "(${E2_BEFORE_TOPICS} temas|${E2_BEFORE_ESSENTIALS} desafíos visibles|(rust|go)-$((E2_FIRST - 1))|toHaveCount\(${E2_BEFORE_ESSENTIALS}\))" -- qa/e2e
git grep -nwE "${E2_BEFORE_TOPIC_ROWS}" -- backend/api/tests | grep -i topic
```

Cada aparición que cuenta el contenido cambia por su delta: +10 en el total, +5 por lenguaje y en la pestaña Esenciales, +30 en pruebas y en pistas, +1 tema por lenguaje y +2 filas de `topics`. El último ID de Esenciales pasa a `<lenguaje>-${E2_LAST}`. La fila de Esenciales de «Cobertura» en el README suma el nombre de la etapa. Si E1 ya deriva un conteo del catálogo, ese no aparece en el barrido.

## 3. La comparación con la base del PR (FR-010 y Review Focus 1)

Va con el árbol limpio. `build/` está fuera de Git, así que cambiar de commit no lo ensucia:

```sh
git switch --detach "$(git merge-base HEAD origin/master)"
npm run curriculum
cp build/curriculum.json "$E2_SNAP/base.json"
cp build/curriculum.meta.json "$E2_SNAP/base.meta.json"
git switch -
npm run curriculum
cp build/curriculum.json "$E2_SNAP/head.json"
cp build/curriculum.meta.json "$E2_SNAP/head.meta.json"
node --input-type=module -e '
import { readFileSync } from "node:fs";
const read = (name) => JSON.parse(readFileSync(`${process.env.E2_SNAP}/${name}`, "utf8"));
const baseDoc = read("base.json");
const headDoc = read("head.json");
const baseMeta = read("base.meta.json");
const headMeta = read("head.meta.json");
const expectedNew = process.env.E2_NEW_IDS.trim().split(/\s+/).sort();
const growing = new Set(["essentials.rust", "essentials.go"]);
const problems = [];
for (const key of ["languages", "catalogs", "workshopSteps"]) {
  if (JSON.stringify(baseMeta[key]) !== JSON.stringify(headMeta[key])) problems.push(`el meta cambió en ${key}`);
}
for (const [name, hash] of Object.entries(baseMeta.portions)) {
  if (!growing.has(name) && headMeta.portions[name] !== hash) problems.push(`la porción ${name} cambió`);
}
const newPortions = Object.keys(headMeta.portions).filter((name) => !(name in baseMeta.portions));
if (newPortions.length > 0) problems.push(`porciones nuevas: ${newPortions.join(", ")}`);
const stagesOf = (doc) =>
  new Map(
    ["lab", "quests", "cores", "essentials"]
      .flatMap((family) => Object.values(doc[family]).flat())
      .map((exercise) => [exercise.id, exercise.stage]),
  );
const baseStages = stagesOf(baseDoc);
const headStages = stagesOf(headDoc);
for (const [id, hashes] of Object.entries(baseMeta.exercises)) {
  if (JSON.stringify(headMeta.exercises[id]) !== JSON.stringify(hashes)) problems.push(`${id}: cambiaron sus huellas`);
  if (headStages.get(id) !== baseStages.get(id)) {
    problems.push(`${id}: pasó de la etapa ${baseStages.get(id)} a la ${headStages.get(id)}`);
  }
}
const added = Object.keys(headMeta.exercises).filter((id) => !(id in baseMeta.exercises)).sort();
if (JSON.stringify(added) !== JSON.stringify(expectedNew)) {
  problems.push(`ejercicios nuevos: se esperaban ${expectedNew.join(", ")} y llegaron ${added.join(", ") || "ninguno"}`);
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Sin cambios fuera de la etapa: ${Object.keys(baseMeta.exercises).length} ejercicios publicados intactos y ${added.length} nuevos.`);
'
```

En la etapa 2, lo esperado es `Sin cambios fuera de la etapa: 284 ejercicios publicados intactos y 10 nuevos.`, y el código de salida es 0. `documentHash` y `sourceCommit` pueden cambiar, y no se comparan.

## 4. El error de cada `reparar` (FR-004, R14 y Review Focus 3)

Necesita las imágenes del sandbox (`docker compose --profile sandbox-images build`, ADR 0005) y el `build/` de la cabeza (§3 o `npm run curriculum`):

```sh
node --input-type=module -e '
import { readFileSync } from "node:fs";
const doc = JSON.parse(readFileSync("build/curriculum.json", "utf8"));
for (const language of ["rust", "go"]) {
  for (const exercise of doc.essentials[language]) {
    if (exercise.kind === "reparar") console.log(`${language} ${exercise.stage} ${exercise.id}`);
  }
}' > "$E2_SNAP/reparar.txt"
while read -r language stage id; do
  if [ "$language" = rust ]; then
    first=$(docker run --rm --network none -v "$PWD/content/rust/exercises/$id":/src:ro taller-sandbox-rust:local \
      sh -c 'rustc --edition 2024 --crate-type=lib --emit=metadata -o /tmp/check.rmeta /src/starter.rs 2>&1 | grep -m1 "^error"' < /dev/null)
  else
    first=$(docker run --rm --network none -v "$PWD/content/go/exercises/$id":/src:ro taller-sandbox-go:local \
      sh -c 'mkdir -p /tmp/src && sed "s/^package main\$/package esenciales/" /src/starter.go > /tmp/src/starter.go && cd /tmp/src && go build starter.go 2>&1 | grep -m1 "\.go:"' < /dev/null)
  fi
  printf '%s\t%s\t%s\n' "$stage" "$id" "${first:-COMPILA}"
done < "$E2_SNAP/reparar.txt"
```

La salida es una línea por `reparar` de Esenciales, los publicados incluidos, con la etapa, el ID y el primer error. El coordinador comprueba tres cosas:
- ningún `reparar` dice `COMPILA`;
- el error de cada uno nuevo es uno de los de su fila en «El contenido de cada etapa» de la spec: en Rust, el código (`E0277`, `E0317`…); en Go, la frase;
- ningún error aparece en dos etapas distintas (FR-003).

## 5. La superposición y los decimales (FR-003, SC-006, R10 y Review Focus 4)

```sh
node --input-type=module -e '
import { readFileSync } from "node:fs";
const doc = JSON.parse(readFileSync("build/curriculum.json", "utf8"));
const levelOf = (exercise) =>
  exercise.level ?? (exercise.stage <= 4 ? "beginner" : exercise.stage <= 8 ? "medium" : exercise.stage <= 12 ? "advanced" : "expert");
const published = ["lab", "quests", "cores"].flatMap((family) => Object.values(doc[family]).flat());
const beginners = published.filter((exercise) => levelOf(exercise) === "beginner");
const essentials = Object.values(doc.essentials).flat();
const essentialIds = new Set(essentials.map((exercise) => exercise.id));
const signature = { rust: /\bfn\s+(\w+)\s*\(/, go: /\bfunc\s+(\w+)\s*\(/ };
const functionName = (exercise) => (exercise.starter.match(signature[exercise.language]) ?? [])[1] ?? "(sin función)";
const owners = new Map();
const remember = (key, id) => owners.set(key, [...new Set([...(owners.get(key) ?? []), id])]);
for (const exercise of [...beginners, ...essentials]) {
  remember(`${exercise.language} · función ${functionName(exercise)}`, exercise.id);
  for (const test of exercise.tests) remember(`${exercise.language} · prueba ${test.expression}`, exercise.id);
}
const overlaps = [...owners]
  .filter(([, ids]) => ids.length > 1 && ids.some((id) => essentialIds.has(id)))
  .map(([key, ids]) => `${key}: ${ids.join(", ")}`);
const decimal = /(==|!=)\s*-?\d+\.\d+|-?\d+\.\d+\s*(==|!=)/;
for (const exercise of essentials) {
  for (const test of exercise.tests) {
    if (decimal.test(test.expression)) console.log(`A revisar · ${exercise.id} ${test.id}: compara un decimal con == o !=`);
  }
}
if (overlaps.length > 0) {
  console.error(overlaps.join("\n"));
  process.exit(1);
}
console.log(`Sin superposiciones: ${essentials.length} ejercicios de Esenciales contra ${beginners.length} de Inicial.`);
'
```

Lo esperado es el código 0 y `Sin superposiciones: …`. Cada línea «A revisar» va al usuario con el ejercicio, porque R10 admite comparar con valores exactos en binario.

## 6. Las E2E y Pest

```sh
npm run build
E2E_PORT=<puerto de la etapa> npm run test:e2e
COMPOSE_PROJECT_NAME=<proyecto de la etapa> npm run api:test
git diff --name-only origin/master...HEAD -- qa/e2e
```

Todo en verde. La última línea lista, como mucho, `qa/e2e/specs/lab-map.spec.ts` y `qa/e2e/specs/lab-essentials.spec.ts`. La red de F1, las 17 de A2 y las del Atlas, la campaña, Sistemas y la Biblioteca no se editan (FR-016 y SC-007).

## 7. B3 y el cuerpo del PR

```sh
test -z "$(git status --porcelain)" && echo "árbol limpio"
COMPOSE_PROJECT_NAME=<proyecto de la etapa> docker compose up --build -d --wait
COMPOSE_PROJECT_NAME=<proyecto de la etapa> npm run api:audit -- $(printf -- '--exercise=%s ' $(echo "$E2_NEW_IDS"))
COMPOSE_PROJECT_NAME=<proyecto de la etapa> npm run api:audit
node qa/audit-summary-gate.ts --body-file="$E2_PR_BODY" --base=origin/master --head=HEAD
COMPOSE_PROJECT_NAME=<proyecto de la etapa> docker compose down
```

- **La corrida parcial** (la tercera línea) es para el borrador: dice si las diez soluciones aprueban y los diez iniciales fallan como corresponde, y nunca es de registro.
- **La corrida de registro** (la cuarta) va después de la aprobación del usuario y sale con 0. Su resumen legible dice `De registro: sí · veredicto: verde`, con tantas soluciones que aprueban y tantos iniciales que fallan como corresponde como ejercicios tenga el currículo (294 en la etapa 2), `Hallazgos: 0` y `sin veredicto: 0`.
- **El bloque** queda en `qa/curriculum-audit/summary.md` y se copia entero en `$E2_PR_BODY`.
- **`audit-summary-gate`** pasa con el cuerpo del PR, como lo comprobará la CI.

## 8. El cierre de E2

En `origin/master`, después del merge de la etapa 4:

```sh
git switch --detach origin/master
npm run curriculum
node --input-type=module -e '
import { readFileSync } from "node:fs";
const doc = JSON.parse(readFileSync("build/curriculum.json", "utf8"));
const problems = [];
for (const language of ["rust", "go"]) {
  const list = doc.essentials[language];
  if (list.length !== 20) problems.push(`${language}: hay ${list.length} ejercicios de Esenciales y se esperaban 20`);
  list.forEach((exercise, index) => {
    const id = `${language}-${138 + index}`;
    const stage = 50 + Math.floor(index / 5);
    if (exercise.id !== id || exercise.stage !== stage) problems.push(`${exercise.id}: se esperaba ${id} en la etapa ${stage}`);
  });
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Esenciales completo: 20 ejercicios por lenguaje en las etapas 50 a 53.");
'
```

Después, §4 y §5 sobre el contenido completo, §1 y §6.
