# Contrato: las hojas de estilo con Tailwind CSS v4

Cómo entra el estilo al `<style>` único del dist desde F15a, qué guarda cada capa y cómo se estila lo nuevo. Reemplaza a `specs/024-f10-shell/contracts/stylesheets-f10c.md` (el plan de F10c, PR #91) desde F15a; cada parte dice qué cambia. Lo consultan los ítems que tocan la interfaz después de F15a (F11b a F11d, F12b, F13, F14, C4 y A4). Las decisiones están en [research.md](../research.md).

## La entrada

`frontend/src/app/main.tsx` importa una sola hoja: `./main.css`. Esa entrada, en este orden:

1. **Declara las capas** en su primera línea: `@layer theme, base, legacy, utilities;` (desde F15c, `@layer theme, base, utilities;`).
2. **Importa** `tailwindcss/theme.css` en `theme`; las hojas heredadas en `legacy`, en el orden de la base (desde F15c, el preflight en `base`); `tailwindcss/utilities.css` en `utilities`, con `source('..')`; y, sin capa, las excepciones del editor.
3. **Configura:** `@source not` (las specs y el setup de Vitest), `@source not inline('sr-only')` e `('visible')`, `@custom-variant hover` y las variantes de ancho.
4. **Define el theme** en `@theme static`, con `--*: initial`, `--spacing: 4px` y los 61 tokens de F10c.

Lo fijan `frontend/src/app/main-entry.spec.ts` (la lista de `@import`) y `qa/style-output-check.ts` (el orden de capas del CSS construido).

## Qué guarda cada capa

| Capa | Guarda | Hasta |
| --- | --- | --- |
| `theme` | Los 61 tokens y `--spacing`, en `:root, :host` | Siempre |
| `base` | Nada hasta F15c; en F15b, sólo lo que React no dibuja de un slice migrado (el `.noscript` de `index.html`, FR-033). Desde F15c, el preflight, las reglas que lo compensan y las globales del taller, con el bloque de Go | Siempre |
| `legacy` | Las hojas heredadas que faltan migrar, en el orden de la base, con los 13 alias en el `:root` de `styles.css` | F15c |
| `utilities` | Las utilidades que Tailwind encuentra en `frontend/src` | Siempre |
| Sin capa | `frontend/src/shared/ui/code-editor/code-editor.css`: las siete reglas `.cm-enhanced …` que compiten con el theme de CodeMirror | Siempre |

## Las hojas permitidas

`qa/stylesheets-check.ts` lista las hojas de `frontend/`: la entrada, las heredadas que faltan migrar y las excepciones. Ninguna otra puede existir. Cada PR de F15b saca la suya; al cerrar F15c quedan `main.css` y `code-editor.css`.

## Para quien escribe interfaz después de F15a

- **Sin hojas nuevas** (Q5-A): el estilo va en el componente, con utilidades.
- **Los valores:** un token si existe (`bg-ink`, `text-accent`, `font-mono`, `font-500`, `max-w-main`, `px-gutter`); si no, la escala de `--spacing: 4px` cuando da el valor exacto (`p-5` son 20 px); si no, un valor arbitrario con el literal (`p-[30px]`, `bg-[#dedfcc]`), que el PR cuenta como deuda.
- **Los tamaños de letra:** `text-(length:--text-12)`, nunca `text-12`, que también fija el interlineado.
- **Las propiedades que Tailwind compone** (sombras, `transform`, transiciones, anillos): la propiedad arbitraria con el literal (`shadow-(--shadow-dialog)`, `[transform:translateY(-3px)]`, `[transition:opacity_0.2s]`).
- **Los anchos:** las variantes `upto-<px>` (`max-width`, incluye el límite) y `from-<px>` (`min-width`); nunca `max-*`, `min-*` ni `sm:`. Una condición nueva no se agrega sin un ítem que lo decida (FR-019).
- **El `:hover`** aplica con cualquier puntero; `print:`, `motion-safe:` y `motion-reduce:` son los de Tailwind.
- **Sin** `!`, estilos en línea, clases armadas por concatenación, `clsx`, `tailwind-merge` ni CVA. Las variantes de un componente son mapas de cadenas completas, y un elemento lleva una sola utilidad por propiedad.
- **Una clase que la red localiza** (un marcador) se queda en el elemento, sin regla.
- **El tono de Go:** `body[data-language='go']` redefine `--color-accent`, `--color-accent-dark` y `--color-accent-soft`; las utilidades `*-accent*` lo siguen sin recargar.

## Para quien migra un slice (F15b)

La receta está en [plan-f15b.md](../plan-f15b.md): el inventario, los E2E primero, los componentes de las clases base en `shared/ui`, las utilidades, la hoja borrada con su `@import`, su línea de `ALLOWED_SHEETS` y su entrada en `ENTRY_IMPORTS`, el barrido en 0 y la deuda contada.
