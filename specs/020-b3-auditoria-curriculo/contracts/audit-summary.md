# Contrato: el resumen de la auditoría y su check en la CI

**Fecha**: 2026-10-28 | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Investigación**: [research.md](../research.md), R10 a R12

Cubre FR-021, FR-032 y FR-038, y SC-004 y SC-009. Un único módulo, `qa/lib/audit-summary.ts`, arma el resumen (desde `report.json`) y lo lee (desde la descripción del PR).

## El bloque

`npm run api:audit` lo escribe en `qa/curriculum-audit/summary.md` y lo imprime. Se pega entero en la descripción del PR:

````text
**Auditoría del currículo (B3)**: pegá este bloque entero en la descripción del PR.

```taller-audit-summary
format: taller-audit-summary-1
verdict: green
record: true
scope: full
runtime: runsc
instance: auditoria
concurrency: 4
programs: 552
solutions: 274
solutionsPass: 274
starters: 274
startersFailAsExpected: 274
customTestSample: 4
customTestSamplePass: 4
findings: 0
noVerdict: 0
warnings: 0
documentHash: 4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6
harnessHash: 6a86d9fef4cbeebd95703a6e239f08d885071dc7a122a7ca25883d953457a6fa
contentSourceCommit: null
commit: dd870a9ccb7cb50b8b06b584bcf988acaccbf22e
cleanTree: true
rustImage: sha256:f525ccf76aec49d19b686a8d4cff8baad441ef2f30a0688c74d1a3905c17c356
goImage: sha256:e66df8bf3b16022cc6426093be100ba59c09e2eaff9b88d492166e35f0a756b7
startedAt: 2026-11-02T03:00:00.000Z
finishedAt: 2026-11-02T03:07:12.000Z
```
````

(Los números y las huellas son de ejemplo.)

### Las claves

Exactamente estas 26, en este orden, una por línea, `clave: valor` con un espacio después de los dos puntos:

| Clave | Sale de `report.json` | Valor válido |
| --- | --- | --- |
| `format` | — | `taller-audit-summary-1` |
| `verdict` | `run.verdict` | `green` o `red` |
| `record` | `run.record` | `true` o `false` |
| `scope` | `run.scope` | `full` o `partial` |
| `runtime` | `run.runtime` | `runsc` o `runc` |
| `instance` | `run.instance` | minúsculas, dígitos y guiones, de 1 a 32 |
| `concurrency` | `run.concurrency` | entero de 1 a 8 |
| `programs`, `solutions`, `solutionsPass`, `starters`, `startersFailAsExpected`, `customTestSample`, `customTestSamplePass`, `findings`, `noVerdict`, `warnings` | `totals.<clave>` | entero no negativo, sin ceros a la izquierda |
| `documentHash`, `harnessHash` | `stamps.<clave>` | 64 hexadecimales en minúscula |
| `contentSourceCommit`, `commit` | `stamps.<clave>` | 40 o 64 hexadecimales, o `null` |
| `cleanTree` | `stamps.cleanTree` | `true`, `false` o `null` |
| `rustImage`, `goImage` | `stamps.images.rust`, `.go` | `sha256:` y 64 hexadecimales, o `null` |
| `startedAt`, `finishedAt` | `run.<clave>` | `AAAA-MM-DDTHH:MM:SS.mmmZ` |

`formatAuditSummary` rechaza un `report.json` cuyo `format` no sea `taller-curriculum-audit-1` (lanza un `Error` que la entrada informa).

### Cómo se lee

`parseAuditSummary(body)`:

1. Cambia `\r\n` y `\r` por `\n` (la web de GitHub guarda la descripción con CRLF).
2. Busca las líneas que, sin los espacios de los costados, son exactamente ` ```taller-audit-summary`. Ninguna: `missing`. Más de una: inválido, «hay <n> bloques taller-audit-summary; dejá uno solo».
3. Toma las líneas siguientes hasta la primera que, sin espacios a los costados, es ` ``` `. Si no hay: inválido, «el bloque no se cierra con ```».
4. Cada línea no vacía, sin espacios a los costados, tiene que ser `clave: valor` (`^([A-Za-z]+): (.*)$`). Si no: «la línea «<línea>» no es clave: valor».
5. Una clave repetida, desconocida o que falta es un problema con su nombre: «<clave> está repetida», «<clave> no es una clave del formato», «falta <clave>».
6. Si `format` no es `taller-audit-summary-1`: «el bloque es del formato <valor> y este check lee taller-audit-summary-1: volvé a correr npm run api:audit».
7. Cada valor se valida con la tabla de arriba: «<clave>: «<valor>» no es válido».

Devuelve `{ kind: 'missing' }`, `{ kind: 'invalid', problems: string[] }` o `{ kind: 'ok', summary }`. El texto fuera del bloque se ignora.

## La superficie auditada

`qa/lib/audit-surface.ts` exporta `AUDITED_SURFACE` (la lista de R12) y `auditedPaths(paths: readonly string[]): string[]`, que devuelve, en el orden recibido, las rutas que tocan la superficie: una entrada terminada en `/` es un prefijo, las demás son exactas, y un `*_test.go` nunca cuenta. Es el único lugar de la lista: la documentación (FR-033) remite a este archivo.

## El check

`evaluateAuditGate(input)`:

```ts
interface GateInput {
  body: string;
  changedPaths: readonly string[];
  expected: { documentHash: string; harnessHash: string };
  headSha: string;
}

interface GateResult {
  ok: boolean;
  applies: boolean;
  errors: string[];
  notes: string[];
}
```

1. **Cuándo aplica.** `auditedPaths(changedPaths)`. Si está vacía: `ok: true`, `applies: false` y la nota `El PR no toca la superficie auditada (qa/lib/audit-surface.ts): no hace falta el resumen.`
2. **Si aplica**, junta todos los errores (no se detiene en el primero):

| Comprobación | Error |
| --- | --- |
| Falta el bloque | `Falta el resumen de la auditoría: el PR toca la superficie auditada (<primera ruta>). Corré npm run api:audit sobre el último commit, con el árbol limpio, y pegá en la descripción el bloque que imprime.` |
| El bloque es inválido | `El resumen no tiene el formato taller-audit-summary-1: <problema>.` (uno por problema) |
| `record` no es `true` | `La corrida no es de registro (record: <valor>): tiene que ser completa, con runsc y sin programas sin veredicto.` |
| `scope` no es `full` | `La corrida es parcial (scope: <valor>): la de registro audita los dos lenguajes enteros.` |
| `runtime` no es `runsc` | `La corrida usó <valor>: la de registro corre con runsc.` |
| `verdict` no es `green`, o hay hallazgos o programas sin veredicto | `El veredicto está en rojo (verdict: <verdict>, findings: <n>, noVerdict: <n>): corregí los hallazgos y volvé a auditar.` |
| `documentHash` distinto | `La huella del documento no coincide: esperada <esperada> (cabeza del PR), recibida <recibida>. Volvé a auditar después del último cambio de contenido.` |
| `harnessHash` distinto | `La huella de la plantilla (portions.harness) no coincide: esperada <esperada> (cabeza del PR), recibida <recibida>. Volvé a auditar después del último cambio de la plantilla.` |

3. **Notas para quien revisa** (no fallan), si el bloque se leyó: `Para quien revisa: commit <commit> (cabeza del PR: <headSha>)<, distinto: comprobá que lo posterior no toca la superficie>; árbol limpio: <sí|no|sin dato>; imágenes: rust <id>, go <id>.`

`ok` es `errors.length === 0`.

## La línea de comandos: `qa/audit-summary-gate.ts`

```text
node qa/audit-summary-gate.ts [--body-file=<archivo>] [--base=<ref>] [--head=<ref>]
```

| Entrada | Por omisión | En la CI |
| --- | --- | --- |
| La descripción | `--body-file`, o si no la variable `PR_BODY`, o vacía | `PR_BODY` |
| La base | `--base`, o `BASE_SHA`, o `origin/master` | `BASE_SHA` = `github.event.pull_request.base.sha` |
| La cabeza | `--head`, o `HEAD_SHA`, o `HEAD` | `HEAD_SHA` = `github.event.pull_request.head.sha` |

Las rutas salen de `git diff --name-only --no-renames <base>...<cabeza>`. Las huellas esperadas salen del árbol de trabajo con el generador en memoria (`qa/lib/content-stamps.ts`): en la CI, el checkout es la cabeza del PR. Imprime cada nota por la salida estándar, cada error como `FALLA <error>` por la de errores, y sale con 0 o 1. `package.json`: `"audit:gate": "node qa/audit-summary-gate.ts"`.

## El workflow: `.github/workflows/audit-summary.yml`

```yaml
name: Auditoría del currículo

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

permissions:
  contents: read

concurrency:
  group: audit-summary-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  audit-summary:
    name: audit-summary
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm
      - run: npm ci --no-audit --no-fund
      - env:
          PR_BODY: ${{ github.event.pull_request.body }}
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: node qa/audit-summary-gate.ts
```

Las acciones van fijadas por el mismo SHA que `ci.yml`. El cuerpo nunca entra al script: va por `PR_BODY` (inyección, ver research.md). El check protege contra el olvido y contra un resumen viejo, no contra uno inventado: la corrida sigue siendo autodeclarada (spec, «Riesgos», 4).

## Los escenarios (SC-009 y los de borde)

`qa/audit-summary-check.ts` (en `npm test`, grupo web) los corre con entradas escritas a mano. El resumen válido sale de `qa/fixtures/shared/audit-report-example.json` con `run.record: true`, `run.scope: "full"`, `run.verdict: "green"`, `totals.findings: 0` y `totals.noVerdict: 0`.

| # | Escenario | Resultado |
| --- | --- | --- |
| 1 | Falta el resumen y el PR toca `content/rust/exercises/rust-01/exercise.yaml` | Falla, con «Falta el resumen de la auditoría» y la ruta |
| 2 | La huella del documento no coincide | Falla, con «La huella del documento no coincide», la esperada y la recibida |
| 3 | El veredicto está en rojo (1 hallazgo) | Falla, con «El veredicto está en rojo (verdict: red, findings: 1, noVerdict: 0)» |
| 4 | La corrida no es de registro (`record: false`, `scope: partial`) | Falla, con «La corrida no es de registro» y «La corrida es parcial» |
| 5 | El PR toca sólo `content/atlas/rust/x.yaml` y `README.md`, sin resumen | Pasa, con la nota de que no aplica |
| 6 | Resumen válido con las huellas esperadas | Pasa, con la nota para quien revisa |
| 7 | El resumen válido con CRLF y sangría de dos espacios | Pasa |
| 8 | Dos bloques | Falla: «hay 2 bloques» |
| 9 | La huella de la plantilla no coincide | Falla, con «portions.harness» |
| 10 | `runtime: runc` con `record: true` | Falla: «La corrida usó runc» |
| 11 | Una clave que falta y una desconocida | Falla, con los dos problemas |
| 12 | Un `*_test.go` del ejecutor y una ruta borrada de `content/go/` | Sólo la segunda aplica |
| 13 | Ida y vuelta: `parseAuditSummary(formatAuditSummary(<ejemplo>))` | Los 26 valores del ejemplo |
| 14 | El cableado: `currentContentStamps(repoRoot)` | Igual a `documentHash` y `portions.harness` de `build/curriculum.meta.json` |
