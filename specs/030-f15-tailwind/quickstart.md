# Quickstart: F15a · Validación

Cómo se comprueba que la base de Tailwind no cambió nada de lo que ve el alumno: los comandos, los valores esperados y las herramientas de comparación. Las decisiones están en [research.md](./research.md) y las tareas, en [plan.md](./plan.md). Todo corre desde la raíz del worktree, con Node 24.

## 0. Una función para el hash

Portable entre Linux y macOS, como en F2b y F10c:

```sh
sha() { node -e 'const h=require("node:crypto").createHash("sha256");process.stdin.on("data",d=>h.update(d)).on("end",()=>console.log(h.digest("hex")))'; }
```

## 1. La línea base (T001)

1. **La red:**

   ```sh
   npm ci --offline --no-audit --no-fund
   npm run build && npm test && npm run lint && npm run format:check
   E2E_PORT=4193 npm run test:e2e
   npm run lint 2>&1 | grep -c complexity
   ```

2. **El dist, en partes** (el mismo de quickstart-f10c.md §1, paso 2):

   ```sh
   node -e '
   const fs=require("node:fs"),c=require("node:crypto");
   const sha=(s)=>c.createHash("sha256").update(s).digest("hex");
   const html=fs.readFileSync("dist/index.html","utf8");
   const style=/<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
   const script=/<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
   const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,"<script></script>").replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,"<style></style>");
   console.log(JSON.stringify({chars:html.length,script:sha(script),style:sha(style),styleChars:style.length,markup:sha(markup),styleElements:(html.match(/<style\b/g)||[]).length,scriptElements:(markup.match(/<script\b/g)||[]).length}));'
   ```

3. **Las condiciones de `@media` de la base:**

   ```sh
   node -e '
   const html=require("node:fs").readFileSync("dist/index.html","utf8");
   const style=/<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
   console.log([...new Set([...style.matchAll(/@media([^{]+)\{/g)].map((m)=>m[1].trim()))].sort().join("\n"));'
   ```

   Se esperan las 18 de research.md, «Línea base de planificación».
4. **La copia de la base,** que usan todas las comparaciones:

   ```sh
   mkdir -p "$TMPDIR/f15a"
   git worktree add --detach "$TMPDIR/f15a/base" HEAD
   ln -s "$PWD/node_modules" "$TMPDIR/f15a/base/node_modules"
   (cd "$TMPDIR/f15a/base" && npm run build)
   ```

   Después de T006 la base no se reconstruye: su dist es el de T001, el que compara toda la rama.
5. **Los puertos libres:** `ss -ltn | grep -E ':470[123]\b'` no imprime nada.
6. **Al cerrar (T013),** cada copia se borra sin tocar el `node_modules` real al que apunta su enlace:

   ```sh
   rm "$TMPDIR/f15a/base/node_modules"
   git worktree remove --force "$TMPDIR/f15a/base"
   git worktree prune
   git worktree list   # ya no la muestra
   ```

   Lo mismo con `$TMPDIR/f15a/control`, `$TMPDIR/f15a/probe` y las copias de los controles de §3.3.

## 2. La compuerta de cada tarea

Con el build hecho, contra la copia de la base:

| Salida | T002 a T005 | T006 | T008 | T009 | T010 |
| --- | --- | --- | --- | --- | --- |
| `script` y `markup` del dist | iguales | iguales | iguales | iguales | iguales |
| `style` | igual | igual | distinto | distinto | igual al de T009 |
| `node qa/style-output-check.ts` | verde en T003 y T004; rojo en T005 (`assertLayerOrder`) | rojo (T005) | verde, `0 utility rules` | verde | verde |
| `main-entry.spec.ts` | rojo desde T005 | rojo | verde | verde | verde |
| El barrido (§3.2) | el control de determinismo en T002 | — | `differences: 0`, `newTokens: []`, `removedTokens: []` | `differences: 0`, `newTokens: ["--spacing"]`, `removedTokens: []` | igual que T009 |
| El multiconjunto resuelto (§3.2) | — | — | `onlyBase: 0`, `onlyUnit: 0` | ← | ← |
| `chars` | igual | igual | como mucho T001 + 2 000 | ← | ← |

Y en cada tarea de código:

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=4193 npm run test:e2e
git diff <base> -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'   # vacío
git diff --name-only <base> -- qa/e2e/specs                                                       # vacío: ningún E2E de la base editado
```

## 3. Las comparaciones

Las herramientas viven en `qa/e2e/style-compare/` desde T002 y reciben la raíz de la base y la de la rama. Resuelven `@playwright/test`, `postcss` y `lightningcss` desde el `node_modules` de la primera.

### 3.1 La grilla y el barrido

- **La grilla** (`grid.ts`): los 35 estados de F10c, el estado `editor` y los que sumaron los ítems que entraron después, en 1 600, 1 280, 981, 850, 650, 590 y 375 px, con el movimiento reducido apagado y encendido, más la impresión a 1 280 px. `PAGES=a,b` y `WIDTHS=590,981` acotan una corrida.
- **El barrido** (`style-sweep.ts`): compara cada propiedad computada de cada elemento, y de su `::before` y su `::after` si tienen contenido, con el puntero en `(-1, -1)` y sin lo de adentro de un `<details>` cerrado. Tarda entre 25 y 35 minutos con la grilla entera: no está colgado.

```sh
node qa/e2e/style-compare/style-sweep.ts "$TMPDIR/f15a/base" .
```

Esperado: `{"snapshots":…,"differences":0,"byState":{},"newTokens":[…],"removedTokens":[],"unhandled":[]}`. La lista cerrada de `newTokens` (FR-001): `--spacing` desde T009 y, en F15b, las `--tw-*` que declara el dist de la rama.

### 3.2 El multiconjunto resuelto

```sh
node qa/e2e/style-compare/resolved-multiset.ts "$TMPDIR/f15a/base" .
```

Cuenta cada selector de las reglas heredadas (las de `@layer legacy` y las sin capa) con su contexto en forma canónica, su propiedad, su valor resuelto con los tokens de `:root` y normalizado por Lightning CSS, y su `!important`. Esperado en F15a: `{"base":N,"unit":N,"onlyBase":0,"onlyUnit":0}`.

### 3.3 Los controles

**(a) El determinismo** (T002, y otra vez si una herramienta cambia): la base contra sí misma.

```sh
node qa/e2e/style-compare/style-sweep.ts "$TMPDIR/f15a/base" "$TMPDIR/f15a/base"
```

Esperado: `differences: 0`, `newTokens: []`, `removedTokens: []` y `unhandled: []`. Si no, la herramienta tiene ruido y se corrige antes de comparar nada.

**(b) El editor en la capa** (T008, una vez, en una copia de la rama): las siete reglas de `code-editor.css` vuelven al final de la hoja del laboratorio y `code-editor.css` queda vacía. Después, `npm run build` en la copia y:

```sh
PAGES=editor node qa/e2e/style-compare/style-sweep.ts . <copia>
```

Esperado: diferencias en `editor`, entre ellas `height` de `.cm-editor` (`320px` → `345px`) a 590 y 375 px y `padding-top` de `.cm-content` (`20px` → `19px`) en todos los anchos. Si da 0, el estado no monta el editor: se para.

**(c) La colisión** (T008, una vez, en una copia de la rama): sin la línea `@source not inline('visible');` de `main.css`, `npm run build` y `node qa/style-output-check.ts` en la copia. Esperado: falla en `assertNoCollisions` con `visible`.

**(d) Los tokens sin `static`** (T009, una vez, en una copia de la rama): `@theme static` pasa a `@theme`, `npm run build` y `node qa/style-output-check.ts`. Esperado: falla en `assertTokens` con los tokens que ninguna utilidad usa. Si pasa, se anota (S11).

## 4. La sonda (T007)

En la copia `$TMPDIR/f15a/probe`, con el `main.css` de plan.md, T007, paso 2, y el build hecho, este script imprime lo que mide cada fila de research.md, R10:

```sh
cat > "$TMPDIR/f15a/read-probe.ts" <<'EOF'
import fs from 'node:fs';
import { canonicalMedia, readCss } from '<worktree>/qa/lib/css-blocks.ts';

const html = fs.readFileSync(process.argv[2] + '/dist/index.html', 'utf8');
const style = /<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';
const sheet = readCss(style);
console.log('start:', style.slice(0, 120));
console.log('layers:', sheet.layerNames.join(', '));
console.log('media:', [...new Set(sheet.groups.filter((g) => g.startsWith('@media')).map(canonicalMedia))].join(' | '));
for (const rule of sheet.rules.filter((r) => r.context.includes('@layer utilities')))
  console.log(rule.context.join(' > '), '|', rule.prelude, '|', rule.declarations.map((d) => `${d.property}:${d.value}`).join('; '));
console.log('sentinel bg-[#dedfcc]:', style.includes('dedfcc'));
console.log('spec-only zzprobe-spec-only:', style.includes('zzprobe-spec-only'));
EOF
node "$TMPDIR/f15a/read-probe.ts" "$TMPDIR/f15a/probe"
```

`<worktree>` es la ruta absoluta del worktree de F15a. Cada fila se compara con su resultado esperado y su alternativa de R10.

## 5. Lo que va en el PR (T013)

En inglés, con el problema completo:

- **El contexto:** lo que deja F10c, la decisión de F15 (ADR 0010, en «propuesta») y por qué F15a no trae utilidades.
- **La entrada:** `main.css`, sus capas, la lista de hojas en `legacy` y la prueba del orden.
- **El editor:** las siete reglas fuera de la capa, con la tabla de research.md, R3, y el control (b).
- **Los tokens:** `@theme static`, `--*: initial`, `--spacing: 4px`, los alias que quedan y el control (d).
- **Las fuentes, las colisiones y los marcadores:** `source('..')`, `@source not`, `@source not inline` y el control (c).
- **Las variantes:** `hover` y las de ancho, con la salida de la sonda.
- **La sonda:** la tabla de R10 con cada resultado.
- **Las comparaciones:** el control de determinismo, el barrido (capturas, `newTokens`, `removedTokens`) y el multiconjunto resuelto, con sus números; la lista de utilidades de la salida.
- **El tamaño:** `chars` antes y después.
- **Lo pendiente:** aceptar el ADR 0010 antes de integrar; F15b con el piloto.
