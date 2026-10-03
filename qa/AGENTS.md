# Verificación e investigación

Estas reglas complementan el `AGENTS.md` raíz. Ejecutá los comandos desde la raíz
del repositorio. Los checks `.cjs` usan Node, asserts y contextos VM; no requieren
migrar a un framework de pruebas.

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

| Cambio | Comprobaciones locales |
| --- | --- |
| Empaquetado, assets u orden de carga | Regenerar bundles e `index.html`; `node qa/build-check.cjs` |
| Ejercicios o contratos de revisión | `node qa/content-check.cjs`, `node qa/runner-check.cjs` |
| Mundos, desbloqueos, XP o progreso de campaña | `node qa/campaign-check.cjs`, `node qa/campaign-content-check.cjs` |
| Exploradores de robot y paquetes | `node qa/quest-explorers-check.cjs` |
| Catálogo, sellos o progreso de Sistemas | `node qa/systems-check.cjs` |
| Modelo lowlevel, infra, play o pc | El correspondiente `node qa/systems-<dominio>-check.cjs` |
| Generación de proyectos o ZIP | `npm run build:kits`, `node qa/project-kit-check.cjs` |
| Sólo documentación | Verificar rutas, comandos y enlaces locales; `git diff --check` |

Para una reorganización de archivos o un cambio transversal, regenerá la página
y ejecutá la suite local completa que también usa `Dockerfile`:

```sh
node qa/build-check.cjs
node qa/content-check.cjs
node qa/runner-check.cjs
node qa/campaign-check.cjs
node qa/campaign-content-check.cjs
node qa/quest-explorers-check.cjs
node qa/systems-check.cjs
node qa/systems-lowlevel-check.cjs
node qa/systems-infra-check.cjs
node qa/systems-play-check.cjs
node qa/systems-pc-check.cjs
node qa/project-kit-check.cjs
```

Los checks locales prueban estructura y comportamiento JavaScript. No prueban
por sí solos que las soluciones Rust/Go compilen ni que la interfaz funcione
en un navegador. Los cambios de UI requieren revisar el flujo afectado, teclado,
editor, guardado, importación/exportación, respuesta del revisor y viewport móvil.
Usá respuestas simuladas para comprobar transporte sin llamadas públicas masivas.

## Compiladores y evidencia

- `node qa/project-kit-check.cjs --docker` ejecuta Cargo/Go en contenedores
  descartables. Necesita las imágenes locales `rust:1.90-alpine` y
  `golang:1.25-alpine`; el script no las descarga.
- `node qa/runtime-check.cjs rust --audit-record` y su variante `go` comparan
  hashes con registros locales previos, sin red. Sólo tienen sentido si existen
  manifiestos actuales; en un clon limpio no hay evidencia previa garantizada.
- `node qa/runtime-check.cjs rust --ids=rust-113` y su variante
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
