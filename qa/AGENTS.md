# Verificación e investigación

Estas reglas complementan el `AGENTS.md` raíz. Ejecutá los comandos desde la raíz
del repositorio. Los checks son TypeScript (`qa/*-check.ts`) que Node 24 ejecuta
directamente; usan `node:assert`, contextos VM y `qa/lib/`, sin framework de pruebas.

- `qa/lib/sources.ts` empaqueta en memoria con esbuild cualquier fuente del navegador
  (JS o TS, con imports) y la ejecuta en un contexto VM con globals falsos
  (`runSource`), o la importa como módulo (`importModule`). Cargá siempre las fuentes
  por ahí: así los checks no dependen del formato ni de la ubicación del archivo.
- Los checks importan archivos de `qa/` con extensión `.ts` explícita y sólo usan
  sintaxis TypeScript borrable; `tsconfig.qa.json` los tipa en `npm run typecheck`.
- `qa/run-checks.ts` es la lista única de la suite que ejecuta `npm test`.
- `qa/lib/legacy-sources.ts` concentra las rutas y el orden de carga de las fuentes
  del navegador; al mover o portar un archivo, cambiá su ruta ahí y no en cada check.
- Los catálogos se publican desde `build/curriculum.json`, que `tools/content/` genera a partir
  de `content/`. `npm test` lo regenera por `pretypecheck`; antes de un check suelto, después
  de editar `content/`, corré `npm run curriculum`.
- `tools/content/dump-globals.ts` es el oráculo de equivalencia. Vuelca en JSON canónico lo que
  publican los adaptadores, los modelos de Sistemas y el Atlas. `tools/content/dump-dist-globals.ts`
  vuelca sólo los catálogos `window.*` de un `dist/index.html` construido. Un refactor puro
  deja el oráculo idéntico y los catálogos del dist iguales a los suyos.

## TDD para cambios de comportamiento

Leé `.agents/skills/tdd/SKILL.md` y sus referencias al trabajar test-first.
Elegí la interfaz pública afectada y el comportamiento observable antes de
escribir la prueba; la skill requiere acordar ese alcance con el usuario.
Para los contratos existentes, usá los checks del mapa siguiente como referencia.

1. Escribí una prueba pequeña para un comportamiento o regresión concreta.
2. Ejecutala y verificá que falle por el comportamiento pendiente, no por un
   error de sintaxis, fixture o entorno.
3. Implementá lo mínimo para que pase y ejecutá el check afectado.
4. Repetí por comportamiento; hacé la revisión y la refactorización con los checks
   en verde, preservando las pruebas de los contratos.

Mantené pruebas rápidas, independientes y deterministas. Los valores esperados
deben surgir de la consigna o de ejemplos resueltos de forma independiente.
Simulá la red y el almacenamiento en sus interfaces; conservá los modelos puros
como implementaciones reales. Los flujos de navegador complementan las pruebas
de módulos. Para documentación e instalación de skills, verificá archivos y
comandos: no hace falta inventar tests de producto.

## Elegir comprobaciones

Para React Doctor y Desloppify, consultá `tools/quality/AGENTS.md`. Son controles
complementarios; una puntuación no reemplaza las pruebas de comportamiento.

`npm run build` regenera la aplicación mediante Vite y deja el documento autónomo
en `dist/index.html`. `npm test` ejecuta todos los checks locales de
`qa/run-checks.ts`; al agregar un check, sumalo a esa lista. `npm run lint` y
`npm run format:check` se ejecutan antes de cerrar cambios de código; el segundo es
no mutante. Formateá los archivos propios que
cambies y evitá reformatear las skills importadas o las salidas generadas.

| Cambio | Comprobaciones locales |
| --- | --- |
| Empaquetado, assets u orden de carga | `npm run build`; `node qa/build-check.ts`, `node qa/load-order-check.ts` |
| Arranque, adaptadores `window.Taller*` o navegación por vistas | `node qa/boot-check.ts` |
| IDs de ejercicios, mundos, talleres o conceptos | `node qa/curriculum-ids-check.ts` |
| Contenido en `content/` o generador en `tools/content/` | `npm run curriculum`; el `node qa/content-*-check.ts` del módulo tocado; si ningún catálogo debe cambiar, `npm run curriculum && node tools/content/dump-globals.ts .` da los mismos bytes antes y después |
| Ejercicios o contratos de revisión | `node qa/content-check.ts`, `node qa/runner-check.ts` |
| Recorrido, biblioteca o respaldo global | `node qa/guide-content-check.ts`, `node qa/app-shell-check.ts` |
| Lectura, respaldo o avisos de carga del progreso | `node qa/versioned-storage-check.ts` y el check del almacén afectado |
| Evidencia de aprobación o interpretación de ejecuciones | `node qa/exercise-evidence-check.ts` |
| Atlas | `node qa/atlas-check.ts` |
| Mundos, desbloqueos, XP o progreso de campaña | `node qa/campaign-check.ts`, `node qa/campaign-content-check.ts` |
| Importación, validación o exportación del laboratorio | `node qa/lab-state-check.ts`, campaña y Sistemas |
| Contexto de campaña o Sistemas dentro del laboratorio | `node qa/lab-bridge-check.ts` |
| Exploradores de robot y paquetes | `node qa/quest-explorers-check.ts` |
| Catálogo, sellos o progreso de Sistemas | `node qa/systems-check.ts` |
| Modelo lowlevel, infra, play o pc | El correspondiente `node qa/systems-<dominio>-check.ts` |
| Generación de proyectos o ZIP | `node qa/project-kit-check.ts` |
| Sólo documentación | Verificar rutas, comandos y enlaces locales; `git diff --check` |

Para una reorganización de archivos o un cambio transversal, regenerá la página
y ejecutá la suite local completa que también usa `Dockerfile`:

```sh
npm run build
npm test
```

## Red de seguridad para refactors

- `qa/fixtures/curriculum-ids.json` es contrato: fija IDs, títulos, composición de
  mundos, núcleos y objetivos de cada taller y enlaces del Atlas. Cambiar un ID exige migrar el
  progreso guardado y actualizar el fixture a mano; nunca lo regeneres para que un
  check pase.
- `qa/fixtures/progress-master-2a278ad-storage.json`, `progress-master-2a278ad-export.json`
  y `progress-d0e1b49-export.json` son progreso real generado por esas versiones (las
  cuatro claves de `localStorage` y dos exportaciones). Fijan la compatibilidad del
  formato v1: arrancar con ellas no escribe, no respalda ni avisa, y sus secciones se
  importan sin pérdida. Están congeladas: nunca las regeneres ni las edites.
- `app-shell-check` y `lab-bridge-check` caracterizan el comportamiento actual,
  incluidos defectos conocidos marcados como `DEFECTO CONOCIDO`. Al corregir uno,
  cambiá su escenario en el mismo commit TDD: primero la prueba nueva que falla,
  después la corrección.
- `qa/lib/app-adapters.ts` lista los métodos de cada `window.Taller*` que consume
  `app.js`: los fakes de `app-shell-check` salen de esa lista y `boot-check`, que
  empaqueta `src/app/main.tsx` sobre el DOM falso de `qa/lib/fake-dom.ts`, exige que los
  adaptadores reales los publiquen y que todas las vistas y «Borrar todo» funcionen.
- `load-order-check` declara qué fuente legacy debe evaluarse antes que otra y por
  qué. Al mover o portar un archivo, actualizá su ruta en la tabla sin relajar la
  restricción.

Los checks locales prueban estructura y comportamiento JavaScript. No prueban
por sí solos que las soluciones Rust/Go compilen ni que la interfaz funcione
en un navegador. Los cambios de UI requieren revisar el flujo afectado, teclado,
editor, guardado, importación/exportación, respuesta del revisor y viewport móvil.
Usá respuestas simuladas para comprobar transporte sin llamadas públicas masivas.

## Compiladores y evidencia

- `node qa/project-kit-check.ts --docker` ejecuta Cargo/Go en contenedores
  descartables. Necesita las imágenes locales `rust:1.90-alpine` y
  `golang:1.25-alpine`; el script no las descarga.
- `node qa/runtime-check.ts rust --audit-record` y su variante `go` comparan
  hashes con registros locales previos, sin red. Sólo tienen sentido si existen
  manifiestos actuales; en un clon limpio no hay evidencia previa garantizada.
- `node qa/runtime-check.ts rust --ids=rust-113` y su variante
  `go --ids=go-113` envían código a los Playgrounds oficiales. Elegí los IDs
  afectados y evitá repetir verificaciones masivas contra servicios públicos.
- Usá `--write-report` en el check de kits sólo después de una ejecución real
  con compiladores. Una ejecución estructural no debe reemplazar esa evidencia.
- Los manifiestos `*-validation.json`, previews, logs y resultados de pruebas
  son estado generado e ignorado. No los agregues a Git ni presentes un registro
  viejo como comprobación del código actual.
- Para nuevas pruebas, comprobá contratos observables y regresiones concretas;
  evitá asserts que sólo repitan detalles internos de implementación.

## Investigación

Guardá las fuentes educativas en `research-*.md`, con fecha de consulta, enlaces
primarios y límites de la evidencia. La investigación de herramientas del agente
va en `docs/agent-skills.md`. Conservá atribuciones sin copiar cursos o ejercicios
externos como si fueran contenido original del taller.
