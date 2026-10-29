# Contrato: las hojas de estilo después de F10c

Quién es dueño de cada regla de CSS y en qué orden entran las hojas al `<style>` único del dist. Lo fija F10c ([plan-f10c.md](../plan-f10c.md)) y lo consultan los ítems que llegan después y tocan el shell o una página: A3, A4, C4, D1c, F11b a F11d, F12b y F13.

## El orden

`frontend/src/app/main.tsx` importa las hojas, y Vite las concatena en ese orden dentro del único `<style>` (A2; `vite-plugin-singlefile`). Una hoja importada desde un módulo de página no sirve: Vite separa el CSS de un chunk asíncrono (`build.cssCodeSplit`) y su lugar en la cascada dejaría de controlarse desde `main.tsx`.

1. `frontend/styles.css`, la primera. Lo prueba la restricción que F10b conserva (FR-052).
2. **La hoja del shell**, la segunda: `frontend/src/app/shell/shell.css`, junto al componente del shell de F10b (`Shell.tsx`). La prueba `frontend/src/app/main-entry.spec.ts`, la spec de F10b que fija la lista entera de imports `.css` (`BASE_SHEETS`), con la hoja del shell en el segundo lugar desde F10c.
3. Las hojas de página y de slice, en el orden que dejaron sus ports. F10c no lo cambia.

## Qué guarda cada hoja

| Hoja | Guarda | No guarda |
| --- | --- | --- |
| `frontend/styles.css` | Los tokens: las 13 propiedades de `:root` y las tres de `body[data-language='go']`. Las reglas globales: las que no nombran una clase ni un id (el documento, la tipografía, los controles, `[hidden]`, `progress`, `dialog`, la regla de casillas, el `touch-action` y el movimiento reducido). Las clases base: las que usan dos o más páginas, o el shell y una página | Una regla que usa sólo el shell o sólo una página |
| La hoja del shell | Las reglas que sólo dibuja el shell: la barra lateral, el menú, la barra superior, el pie, el salto al contenido, `#toast`, el aviso de `noscript`, `main` (el contenedor de la página) y lo que la raíz dibuja fuera de las páginas («Tu cuenta», el estado de la sesión) | Una clase que también usa una página |
| La hoja de cada página | Lo que sólo usa esa página (X3) | — |

«Usar» se mide en el DOM: una regla la usa el dueño del elemento que su selector encuentra en algún estado de la grilla de F10c. El elemento dentro de `#main` es de la página de ese estado; el que está dentro de un diálogo que la página lleva a `<body>`, también; el resto, del shell (quickstart-f10c.md §3.4).

## Para quien llega después

- **Una regla nueva del shell** (F13, F11b) va a la hoja del shell, al final de su bloque, y no a `styles.css`.
- **Una clase que pasa a usar una segunda página** se muda de la hoja de su dueño a `styles.css` en su propio commit, con el multiconjunto y el barrido de estilo computado en 0, como en X3.
- **Una regla de `styles.css` que deja de usar una página** se muda a la hoja de la única que la usa, o se borra si no la usa ninguna, con la evidencia de quickstart-f10c.md §3.4.
