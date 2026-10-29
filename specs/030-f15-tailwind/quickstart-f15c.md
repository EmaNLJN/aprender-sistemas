# Quickstart: F15c · Validación del cierre

Cómo se comprueba que el cierre no cambió nada de lo que ve el alumno. Las decisiones están en [research.md](./research.md) (C1 a C5) y las tareas, en [plan-f15c.md](./plan-f15c.md). Las herramientas son las de F15a ([quickstart.md](./quickstart.md) §3), con las dos ediciones de T032. Todo corre desde la raíz del worktree, con Node 24.

## 1. La base de F15c (T032)

```sh
mkdir -p "$TMPDIR/f15c"
git worktree add --detach "$TMPDIR/f15c/base" HEAD
ln -s "$PWD/node_modules" "$TMPDIR/f15c/base/node_modules"
(cd "$TMPDIR/f15c/base" && npm run build)
grep -c "layer(legacy)" frontend/src/app/main.css   # 1
node qa/stylesheets-check.ts                        # 3 stylesheets
grep -rnE "var\(--(paper|surface|ink|muted|line|accent|accent-dark|accent-soft|sage|green|serif|sans|mono)\)" frontend
```

La búsqueda de alias encuentra sólo `frontend/styles.css` y `var(--mono)` en `code-editor.css`. Las medidas del dist, con quickstart.md §1, paso 2. Al cerrar, la copia se borra como dice quickstart.md §1, paso 6.

## 2. Las comparaciones

| Tarea | El barrido | El multiconjunto resuelto |
| --- | --- | --- |
| T032 (determinismo) | `differences: 0`, `newTokens: []`, `removedTokens: []` | — |
| T034 | `differences: 0`, `removedTokens: []` | `HERITAGE_LAYERS=legacy`: `onlyBase` igual a las tuplas borradas, `onlyUnit: 0` |
| T036 | `differences: 0`, `removedTokens` igual a los 13 alias | `HERITAGE_LAYERS=legacy,base`: `onlyBase` igual a las tuplas de T034, `onlyUnit: 0` |
| T037 | `differences: 0`, `removedTokens` igual a los 13 alias | No se usa: el preflight y las compensatorias suman tuplas a propósito |

```sh
node qa/e2e/style-compare/style-sweep.ts "$TMPDIR/f15c/base" .
HERITAGE_LAYERS=legacy,base node qa/e2e/style-compare/resolved-multiset.ts "$TMPDIR/f15c/base" .
SAMPLES=100000 node qa/e2e/style-compare/style-sweep.ts "$TMPDIR/f15c/base" . > "$TMPDIR/f15c/preflight.txt"   # T037, paso 4
```

Los 13 alias de `removedTokens`, en orden alfabético: `--accent`, `--accent-dark`, `--accent-soft`, `--green`, `--ink`, `--line`, `--mono`, `--muted`, `--paper`, `--sage`, `--sans`, `--serif` y `--surface`.

Y en cada tarea de código:

```sh
npm run build && npm test && npm run lint && npm run format:check && git diff --check
E2E_PORT=4193 npm run test:e2e
git diff <base> -- frontend | grep -E '^\+.*(style=|style=\{|setAttribute\(.style.|\.cssText)'   # vacío
git diff <base> -- package.json package-lock.json                                                # vacío
git diff --name-only <base> -- qa/e2e/specs | grep -v preflight-style.spec.ts                     # vacío
grep -n '!important' frontend/src/app/main.css                                                    # sólo las globales de styles.css
```

## 3. Lo que va en el PR (T039)

En inglés, con el problema completo:

- **El contexto:** el último PR de F15b, lo que quedaba en `styles.css` y lo que decidió el usuario (Q2-B).
- **Las bases borradas:** la lista de T034 con su evidencia.
- **Las globales:** su paso a `@layer base`, sin cambios; los alias y la capa `legacy`, fuera.
- **El preflight:** las compensatorias, contadas y listadas (el selector, las propiedades, el valor y el estado que la pide), y las familias que el preflight escribe como respaldo (decisión 2).
- **Las comparaciones:** el determinismo, el barrido con los 13 alias en `removedTokens` (y por qué: FR-036 contra FR-001) y el multiconjunto de T036.
- **El tamaño:** `chars` antes y después, contra los 10 000.
- **Las excepciones finales:** `main.css`, `code-editor.css`, `@source not inline('sr-only')` e `('visible')`, y lo que React no dibuja.
