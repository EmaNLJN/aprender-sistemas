# AGENTS.md — Taller Rust y Go

## Proyecto

Taller educativo en español con ejercicios de Rust/Go y simulaciones de Sistemas.
Hoy la interfaz usa HTML, CSS y JavaScript vanilla; Node construye la página y
Nginx la sirve. Los compiladores son los Playgrounds oficiales.

La preferencia acordada para evolucionar la interfaz es **React con JavaScript/JSX**.
Vite es una opción de build evaluada con Context7. La migración aún no está hecha.

## Organización

- Antes de cambiar un flujo educativo, leé `README.md`.
- Al ubicar código, reorganizar módulos, cambiar contratos o migrar una vista,
  leé `docs/architecture.md`: mapa de fuentes y reglas de React/clean code.
- Para elegir checks, agregar pruebas o trabajar con TDD, leé `qa/AGENTS.md`.
- Para activar, instalar o actualizar skills, leé `docs/agent-skills.md`.
- Para usar o reinstalar React Doctor y Desloppify, leé `tools/quality/AGENTS.md`.

La raíz contiene las fuentes actuales por familia (`lab-*`, `campaign-*`,
`systems-*`). `qa/` reúne verificaciones e investigación; `docs/` contiene reglas
específicas de desarrollo; `.agents/skills/` contiene las skills del proyecto.
`page.html` es la entrada fuente; `index.html` y `*.bundle.js` son salidas generadas.

## Comandos

Desde la raíz, con Node y npm instalados (Docker usa Node 24):

```sh
npm ci
npm run build:editor
npm run build:effects
npm run build:kits
node build.mjs
node qa/build-check.cjs
```

Para la verificación habitual, `npm run build` regenera todos los assets y
`npm test` ejecuta la suite local completa. `npm run lint` ejecuta ESLint;
`npm run format:check` comprueba formato sin editar. `npm run format` aplica
Prettier a los checks, manifiestos y configuraciones propias; las fuentes de la
aplicación conservan su formato compacto existente.

`build.mjs` valida el currículo y genera el `index.html` autónomo. `build.py` es
un empaquetador alternativo que requiere bundles previos y no reemplaza esas
validaciones.

Para construir y servir con Docker:

```sh
docker compose up --build -d --wait
docker compose down
```

La web queda en `http://localhost:8080`. Para servir el `index.html` generado en
el host como preview, usá `docker compose -f compose.preview.yaml up --build -d --wait`
y abrí `http://localhost:8765`; detenelo con
`docker compose -f compose.preview.yaml down`. El progreso de ambos puertos es independiente.

## Convenciones

- Separá contenido, modelos, persistencia, transporte e interfaz. Organizá la
  migración a React por funcionalidades y mantené interfaces explícitas.
- Conservá IDs, compatibilidad de progreso y la distinción entre compilación real,
  simulaciones y pasos manuales. Las reglas detalladas están en `docs/architecture.md`.
- Usá TDD para cambios de comportamiento: una prueba que falle por la razón
  esperada, una implementación mínima y revisión antes de refactorizar en verde.
- Conservá español, accesibilidad de teclado, diseño móvil y movimiento reducido.
- Preferí soluciones portables entre Linux y macOS. Comentá atajos y automatizaciones
  no obvias con su disparador, acción y efectos visibles.
- Editá fuentes y regenerá assets; conservá licencias y sincronizá el lockfile.
- Usá ESLint para reglas de código y Prettier para formato, con configuraciones
  separadas. Los avisos de complejidad requieren revisión; no desactives reglas
  globalmente para ocultar un defecto. Conservá el formato original de las skills.
- Mantené credenciales, rutas locales, cachés, progreso y resultados generados fuera
  de Git; actualizá `.gitignore` y `.dockerignore` al introducir nuevas salidas.

## Código entendible y pruebas útiles

- Priorizá código simple y entendible sobre soluciones ingeniosas o elegantes.
  Elegí nombres explícitos, pasos visibles y control de flujo fácil de seguir.
  Una abstracción se justifica cuando reduce complejidad real para quien lee o cambia el código.
- Revisá complejidad ciclomática y anidación al agregar o modificar lógica con muchas
  decisiones. Más de 10 por función es una señal inicial de revisión, no una orden
  de fragmentar código. Aplicá los criterios y ejemplos de `docs/architecture.md`.
- Evitá tests tautológicos: el valor esperado debe venir del contrato, una consigna
  o un ejemplo resuelto de manera independiente, no del mismo algoritmo que se prueba.
  Cada test debe poder detectar un comportamiento incorrecto concreto.
- Probá comportamiento observable; evitá tests de funciones privadas, snapshots
  indiscriminados o mocks que sólo confirmen cómo está escrita la implementación.
- Conservá comentarios que expliquen decisiones, límites o efectos no evidentes.
  Refactorizá con un motivo concreto y pruebas de comportamiento en verde.

Ejemplo de legibilidad: preferí una condición explícita a coerciones compactas.

```js
// Evitar: exige descifrar una coerción numérica dentro del acumulador.
const total = pruebas.reduce((n, p) => n + +(p.passed === true), 0);

// Preferir: expresa directamente qué se está contando.
const aprobadas = pruebas.filter(prueba => prueba.passed === true).length;
```

Ejemplo de pruebas para ese contrato:

```js
const pruebas = [{passed: true}, {passed: false}, {passed: true}];

// Tautológico: vuelve a calcular el esperado con la misma implementación.
assert.equal(contarAprobadas(pruebas), pruebas.filter(p => p.passed === true).length);

// Útil: el esperado se obtiene del ejemplo, contando sus dos casos aprobados.
assert.equal(contarAprobadas(pruebas), 2);
```

Estos ejemplos ilustran el criterio; no agregan funciones ni reglas nuevas al currículo.

## Skills y documentación

Leé el `SKILL.md` local de la capacidad pertinente antes de aplicarla; activá sólo
las necesarias. Usá `clean-code` para legibilidad, `codebase-design` para interfaces,
`tdd` para cambios de comportamiento, y las skills de Vercel para código React.
El inventario y los criterios de uso están en `docs/agent-skills.md`.

Usá `context7-mcp` al cambiar APIs o configuración de dependencias: resolvé el ID,
consultá el tema concreto y contrastá la versión con `package-lock.json`. Si el MCP
no está disponible, usá documentación oficial. Usá `find-skills` para nuevas
capacidades, verificando fuente y alcance además de popularidad.

## Verificación y mantenimiento de la guía

Antes de cerrar un cambio, ejecutá los checks aplicables de `qa/AGENTS.md` y
`git diff --check`. Informá resultados y limitaciones. Para documentación,
comprobá rutas, comandos y enlaces locales; para UI, revisá también el navegador.

Actualizá esta guía cuando cambien comandos, arquitectura o convenciones.
Agregá reglas específicas en el documento correspondiente o en un `AGENTS.md`
local cuando una carpeta necesite instrucciones propias. Registrá decisiones
sustanciales de migración en `docs/adr/` al tomarlas, sin crear carpetas vacías.

Base: [ejemplo oficial de AGENTS.md](https://agents.md/), adaptado a los comandos y
contratos reales de este proyecto; consultado el 2026-10-03.
