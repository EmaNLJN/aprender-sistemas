# Contrato: la forma de URL de la Biblioteca

**Spec**: [../spec.md](../spec.md) (FR-006, FR-021, FR-042 a FR-044) · **Plan**: [../plan.md](../plan.md) (T017 y T018) · **Decisiones**: [../research.md](../research.md) (R2, R3 y R6)

Es la séptima forma con query de la gramática de URL (`frontend/src/shared/config/url-grammar.ts`). Es un contrato público: una URL de esta forma se puede enlazar y sobrevive a la recarga.

## La forma

```text
/?<filtros>#biblioteca
```

- **Sin filtros,** la URL es `/#biblioteca`, sin `?`.
- **Sólo figura lo que no vale el valor por omisión.** nuqs lo borra de la query (`clearOnDefault`).
- **Las escrituras son `replace`:** filtrar no suma entradas al historial. El estado de la página cambia en el acto, y la URL lo sigue con un throttle de al menos 50 ms, sin escritura síncrona: justo después de un cambio, la URL puede no tenerlo todavía. El usuario aceptó esa diferencia (la tercera diferencia de nuqs, 2026-10-28), y una prueba que recarga después de filtrar espera la URL antes de recargar.
- **El hash no cambia.** nuqs reescribe sólo la query.

## Los parámetros

| Clave | Filtro | Valores válidos | Valor por omisión (no figura) | Un valor desconocido |
| --- | --- | --- | --- | --- |
| `buscar` | La búsqueda | Cualquier texto | `''` | — |
| `en` | El lenguaje | `rust`, `go` | `all` | vale `all` |
| `acceso` | El acceso | `gratis`, `mixto` | `all` | vale `all` |
| `tipo` | El tipo | `ejercicios`, `proyectos`, `lectura`, `herramientas` | `all` | vale `all` |
| `favoritos` | Solo mis favoritos | `true`, sin distinguir mayúsculas | `false` | vale `false` (también `1` o `si`) |

- **Las claves** viven en `LIBRARY_QUERY_KEYS` y **los valores**, en `LIBRARY_LANGUAGES`, `LIBRARY_COSTS` y `LIBRARY_CATEGORIES`, todos de `url-grammar.ts`. Los parsers de nuqs (`pages/library/model/library-query.ts`) se arman con esas constantes.
- **`en` y no `lenguaje`:** `lenguaje` ya es el idioma del taller en `#sistemas`, y los enlaces del menú conservan la query (research.md, R2).
- **Una clave repetida:** manda la primera (`?tipo=lectura&tipo=proyectos` vale `lectura`).
- **Las claves ajenas** (`?basura=1`, `?lenguaje=go`, `?taller=cache`) se ignoran al leer y se conservan cuando la página escribe. La página no inventa claves.
- **La búsqueda de sólo espacios:** el campo la conserva y la URL la lleva (`?buscar=+++`). No filtra. Es la decisión D1 del informe (research.md, R3).

## La codificación

nuqs arma la query con su propio codificador (`renderQueryString`):

- el espacio va como `+`;
- codifica `%`, `+`, `#`, `&`, `"`, `'`, `` ` ``, `<`, `>` y los caracteres de control;
- deja `/`, `:`, `=`, `?` y lo que no es ASCII sin codificar.

El navegador puede mostrar codificados los caracteres que no son ASCII: los valores, decodificados, son los mismos.

| Filtros | Query |
| --- | --- |
| Ninguno | (vacía) |
| «tour of», Go y Acceso gratuito | `?buscar=tour+of&en=go&acceso=gratis` |
| Lectura y Solo mis favoritos | `?tipo=lectura&favoritos=true` |
| La búsqueda `a&b #c%+` | `?buscar=a%26b+%23c%25%2B` |

**El orden de las claves.** Al escribir una clave que ya está, nuqs la cambia en su lugar; una clave nueva va al final. El orden no es contrato: las pruebas leen la query con `URLSearchParams`, salvo la URL vacía (`/#biblioteca`) y los ejemplos de la gramática.

## Cómo se lleva con el resto del taller

| Situación | Qué pasa |
| --- | --- |
| El alumno filtra y recarga | Los filtros siguen |
| Va a otra vista por el menú y vuelve por el menú | Los enlaces del menú son de hash: la query se conserva y los filtros siguen. La otra vista ignora la query |
| Pasa por «Laboratorio» (`?#laboratorio`, que borra la query y recarga) | Vuelve sin filtros, como hoy |
| Cambia el idioma estando en la Biblioteca (FR-044) | `withLanguageQuery` conserva sólo las claves de la Biblioteca y borra las ajenas: `/?buscar=tour+of&basura=1#biblioteca` pasa a `/?buscar=tour+of#biblioteca`, y `/?basura=1#biblioteca`, a `/#biblioteca` (C2 de F1) |
| Cambia el idioma desde otra vista | Se borra toda la query, como hoy, y los filtros se pierden: es el costo de Q1 (riesgo 16) |
| «Borrar todo» o importar | No tocan la query |
| Un script ajeno reescribe la query con la Biblioteca montada | `enableHistorySync()` le avisa a la página y los filtros se actualizan |

## Lo que la página expone

```ts
// frontend/src/pages/library/model/library-query.ts
export const libraryFilterParsers: {
  query: ParserBuilder<string> & { defaultValue: string };
  language: ParserBuilder<LibraryLanguage> & { defaultValue: LibraryLanguage };
  cost: ParserBuilder<LibraryCost> & { defaultValue: LibraryCost };
  category: ParserBuilder<LibraryCategory> & { defaultValue: LibraryCategory };
  favoritesOnly: ParserBuilder<boolean> & { defaultValue: boolean };
};
export const libraryFilterOptions: { readonly history: 'replace'; readonly urlKeys: typeof LIBRARY_QUERY_KEYS };
```

Las firmas exactas de nuqs las infiere TypeScript; la página las usa con `useQueryStates(libraryFilterParsers, libraryFilterOptions)`.
