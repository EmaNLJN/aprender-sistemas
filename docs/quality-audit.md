# Auditoría de calidad — 2026-10-03

## Alcance y estado inicial

Se revisa el taller actual de JavaScript. La migración a React sigue siendo una
decisión separada. Se usan las interfaces públicas de progreso/importación,
revisión y runner confirmadas por el usuario para las pruebas nuevas.

La suite inicial de doce checks pasó. Se reinstalaron las dependencias desde el
lockfile porque el ejecutable local de esbuild estaba roto. No se cambiaron las
versiones de runtime al repararlo.

Desloppify 1.0, plugin JavaScript, primer scan: overall **15.1**, objective
**60.3**, strict **15.1** y verified **60.3**. Son cifras iniciales con cobertura
reducida: ESLint no estaba configurado y veinte dimensiones subjetivas estaban
sin evaluar. No representan una calificación completa del proyecto. El detector
de imports tampoco reconocía que la entrada HTML cargaba los scripts globales; su detector
de tests no reconoce plenamente las cargas de fuentes mediante VM de los checks.

| Dimensión | Inicial | Inicial estricto | Estado |
| --- | ---: | ---: | --- |
| Code quality | 31.5 | 31.5 | Medición mecánica |
| Security | 98.8 | 98.8 | Medición mecánica |
| File health | 87.0 | 87.0 | Medición mecánica |
| Duplication | 99.4 | 99.4 | Medición mecánica |
| Test health | 0.1 | 0.1 | Medición mecánica |
| Abstraction fit | 0.0 | 0.0 | Sin revisión; cero provisional |
| AI generated debt | 0.0 | 0.0 | Sin revisión; cero provisional |
| API coherence | 0.0 | 0.0 | Sin revisión; cero provisional |
| Auth consistency | 0.0 | 0.0 | Sin revisión; cero provisional |
| Contracts | 0.0 | 0.0 | Sin revisión; cero provisional |
| Convention drift | 0.0 | 0.0 | Sin revisión; cero provisional |
| Cross-module arch | 0.0 | 0.0 | Sin revisión; cero provisional |
| Dep health | 0.0 | 0.0 | Sin revisión; cero provisional |
| Design coherence | 0.0 | 0.0 | Sin revisión; cero provisional |
| Error consistency | 0.0 | 0.0 | Sin revisión; cero provisional |
| High elegance | 0.0 | 0.0 | Sin revisión; cero provisional |
| Stale migration | 0.0 | 0.0 | Sin revisión; cero provisional |
| Init coupling | 0.0 | 0.0 | Sin revisión; cero provisional |
| Logic clarity | 0.0 | 0.0 | Sin revisión; cero provisional |
| Low elegance | 0.0 | 0.0 | Sin revisión; cero provisional |
| Mid elegance | 0.0 | 0.0 | Sin revisión; cero provisional |
| Naming quality | 0.0 | 0.0 | Sin revisión; cero provisional |
| Structure nav | 0.0 | 0.0 | Sin revisión; cero provisional |
| Test strategy | 0.0 | 0.0 | Sin revisión; cero provisional |
| Type safety | 0.0 | 0.0 | Sin revisión; cero provisional |

## React Doctor

React Doctor 0.9.14, scope full, schema 3, informó `reactDetected: false`.
Hubo 46 advertencias y ningún error; no se calculó score remoto. No se considera
una auditoría React completa. Se contrastaron las ocho reglas distintas con las
guías oficiales; publicaban versión 0.9.3, por lo que también se consultó la
explicación local de cada regla con el binario 0.9.14.

- 19 advertencias rechazadas con evidencia: 15 de dependencias/generados, dos
  sinks cuyos datos se escapan y dos búsquedas protegidas por invariantes de niveles.
- 27 observaciones de membresías, clonación JSON e imports; no justifican una
  afirmación de lentitud ni una reescritura sin medición.
- La advertencia SQL corresponde a documentación de Bandit dentro del entorno
  Python; la de crypto, a IDs de tooltip de CodeMirror en un bundle generado.
- La URL del respaldo se revoca después de descargarlo. Los imports dinámicos
  se evalúan junto con el contrato de página autónoma, no como un arreglo mecánico.

Superpowers no está habilitado; sólo se encontró una copia en una caché temporal.
Se usan las skills del proyecto, sin tratar esa copia como una instalación activa.

## Verificación y resultados

Las correcciones confirmadas se implementaron sobre contratos públicos:

- El laboratorio ahora exige una evidencia única y aprobada por cada prueba
  esperada; rechaza `records` con forma de array y conserva el estado anterior
  si la importación es inválida.
- Sistemas valida que cada núcleo tenga pruebas no vacías, IDs no vacíos y sin
  duplicados antes de reemplazar el catálogo.
- Los checks de exploradores usan `render`, `act` y `reset`; el check de build
  compara el contenido y el orden exactos de scripts y estilos fuente.

Verificación final del 2026-10-03:

| Check | Resultado |
| --- | --- |
| `npm run build` | PASS; 274 desafíos, 8 mundos, 25 talleres; `index.html` generado |
| `npm test` | PASS; suite completa, 1.441 aserciones más 5 escenarios del laboratorio |
| `npm run lint` | PASS; 0 errores, 80 avisos de complejidad ciclomática (>10) |
| `npm run format:check` | PASS |
| Playwright/Chrome smoke | PASS; carga de laboratorio, 1 input de archivo, APIs públicas y 0 errores de página |
| React Doctor 0.9.14 | PASS técnico; `reactDetected: false`, 43 advertencias, 0 errores, sin score remoto |

Desloppify 1.0, scan JavaScript final con los mismos excludes:

| Dimensión | Salud | Estricto | Hallazgos |
| --- | ---: | ---: | ---: |
| Overall | 15.4 | 15.4 | 20 dimensiones subjetivas sin evaluar |
| Objective | 61.5 | 61.5 | mecánico |
| Verified | 61.5 | 61.5 | mecánico verificado |
| Code quality | 53.0 | 53.0 | 129 |
| Duplication | 100.0 | 100.0 | 0 |
| File health | 87.6 | 87.6 | 8 |
| Security | 98.9 | 98.9 | 1 detector; la evidencia sintética ya está marcada como falso positivo |
| Test health | 0.0 | 0.0 | 45; el detector no entiende todos los checks cargados por VM |

El score global no es una calificación completa: Desloppify mantiene congelado el
resultado mientras las 20 dimensiones subjetivas no tengan revisión humana. El
detector también contaba fuentes globales cargadas por la entrada HTML como huérfanas.
La duplicación automática se omitió porque `jscpd` terminó con error transitorio.

Los artefactos crudos, prompts y estado de scanners se conservan localmente en
`.desloppify/` o archivos temporales y están fuera de Git.

## Actualización posterior

El mismo 2026-10-03 comenzó la migración: Atlas pasó a React y el build completo a
Vite con una entrada ESM en `src/main.tsx`. Esta sección no altera las mediciones
históricas anteriores; los resultados nuevos se informan con el cambio de migración.
