# Quickstart: F15b · Validación de cada slice

Cómo se comprueba que un PR de F15b no cambió nada de lo que ve el alumno. Las decisiones están en [research.md](./research.md) (B1 a B7) y la receta, en [plan-f15b.md](./plan-f15b.md). Las herramientas son las de F15a, en `qa/e2e/style-compare/` ([quickstart.md](./quickstart.md) §3). Todo corre desde la raíz del worktree del slice, con Node 24. `<slice>` es el nombre corto del slice (`project`, `method`, `shell`…) y `<hoja>`, la ruta de su hoja.

## 1. La base del PR

```sh
mkdir -p "$TMPDIR/f15b-<slice>"
git worktree add --detach "$TMPDIR/f15b-<slice>/base" HEAD
ln -s "$PWD/node_modules" "$TMPDIR/f15b-<slice>/base/node_modules"
(cd "$TMPDIR/f15b-<slice>/base" && npm run build)
```

`HEAD` es `master` con los slices anteriores, antes del primer commit del PR. Las medidas del dist (`chars`, los hashes y `styleChars`) salen con el comando de quickstart.md §1, paso 2, y la cifra de utilidades y de valores arbitrarios, con `node qa/style-output-check.ts`.

**La base sin la hoja,** para contar sus tuplas y sus bytes:

```sh
git worktree add --detach "$TMPDIR/f15b-<slice>/sin-hoja" HEAD
ln -s "$PWD/node_modules" "$TMPDIR/f15b-<slice>/sin-hoja/node_modules"
cd "$TMPDIR/f15b-<slice>/sin-hoja"
grep -v "<ruta de la hoja relativa a app/>' layer(legacy);" frontend/src/app/main.css > main.css.tmp
mv main.css.tmp frontend/src/app/main.css
npx vite build --config frontend/vite.config.ts
cd -
```

`npx vite build` construye sin los checks (`main-entry.spec.ts` fallaría a propósito en esta copia). Al cerrar, las dos copias se borran como dice quickstart.md §1, paso 6.

## 2. Las comparaciones (R5)

1. **El determinismo:** `node qa/e2e/style-compare/style-sweep.ts "$TMPDIR/f15b-<slice>/base" "$TMPDIR/f15b-<slice>/base"` → `differences: 0`, `newTokens: []`, `removedTokens: []`, `unhandled: []`.
2. **El barrido:** `node qa/e2e/style-compare/style-sweep.ts "$TMPDIR/f15b-<slice>/base" .` → `differences: 0` y `removedTokens: []`. Cada nombre de `newTokens` es `--spacing` o aparece declarado en el `<style>` de la rama:

   ```sh
   node -e '
   const html=require("node:fs").readFileSync("dist/index.html","utf8");
   const style=/<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];
   for (const name of process.argv.slice(1)) if (name!=="--spacing" && !style.includes(name+":") && !style.includes("@property "+name)) console.log("not declared:", name);' <nombres de newTokens>
   ```

   No imprime nada.
3. **Las tuplas de la hoja:** `node qa/e2e/style-compare/resolved-multiset.ts "$TMPDIR/f15b-<slice>/base" "$TMPDIR/f15b-<slice>/sin-hoja"` da `onlyBase: N` y `onlyUnit: 0`: `N` son las tuplas de la hoja.
4. **El multiconjunto resuelto de la rama:** `node qa/e2e/style-compare/resolved-multiset.ts "$TMPDIR/f15b-<slice>/base" .` da `onlyBase: N` (el mismo `N`) y `onlyUnit: 0`, y las primeras 20 líneas `-` son las mismas que en el paso 3.
5. **Los checks:** `npm run build && npm test && npm run lint && npm run format:check && git diff --check` y `E2E_PORT=4193 npm run test:e2e`.
6. **Sin estilos en línea, dependencias ni E2E de la base editados:**

   ```sh
   git diff <base> -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'   # vacío
   git diff <base> -- package.json package-lock.json                                                # vacío
   git diff --name-only <base> -- qa/e2e/specs | grep -v -- '-style.spec.ts$'                       # vacío
   ```

## 3. El peso (T017 y cada fila)

1. **Los bytes de la hoja en el dist base:** `styleChars` de la base menos `styleChars` de la base sin la hoja (§1).
2. **El aumento del PR:** `chars` de la rama menos `chars` de la base.
3. **En el piloto (T017):** `r = Δchars / bytes de project.css`. Con `r`, para cada hoja de la tabla de plan-f15b.md §3, sus bytes medidos en la base del piloto con el mismo procedimiento (una copia sin esa hoja por cada una) y su tope: `ceil(r × bytes × 1,25)`, con piso de 500 y techo de 5 000 sin permiso. La tabla, con `r`, va a research.md, «Mediciones de la implementación».
4. **En cada fila:** el aumento del PR, contra su tope.

## 4. Lo que va en el PR

En inglés, con el problema completo:

- **El contexto:** el slice, su hoja y lo que pide F15b.
- **El inventario (R1):** las reglas de la hoja y su destino, las clases base y su componente (creado o reusado), los marcadores, los `!important`, lo que el barrido no ve, las condiciones y lo que React no dibuja.
- **Los E2E (R2):** qué fija cada uno, en verde contra la base; el control del toque si es el primer slice con `:hover`.
- **La migración (R3, R4):** los componentes nuevos o con variantes nuevas, las trampas que aparecieron y las colisiones resueltas.
- **Las comparaciones (R5):** el determinismo, el barrido (capturas, `newTokens`, `removedTokens`), el multiconjunto resuelto con su `N`.
- **El tamaño:** `chars` antes y después, contra el tope del slice.
- **La deuda:** los valores arbitrarios que suma el PR.
- **Lo pendiente:** el slice siguiente de la tabla.
