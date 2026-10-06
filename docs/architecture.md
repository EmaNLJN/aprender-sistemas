# Arquitectura y convenciones del taller

Consultá este archivo al cambiar módulos, contratos de progreso, carga de assets
o al migrar una vista a React. El mapa describe el estado actual del repositorio.

## Mapa de archivos

La estructura actual es plana y se organiza por responsabilidad y prefijo:

| Responsabilidad | Fuentes |
| --- | --- |
| Documento, entrada ESM y adaptadores legacy | `frontend/src/index.html`, `frontend/src/app/main.tsx`, `frontend/src/app/legacy/` |
| Helpers y constantes compartidos, sin reglas de negocio | `frontend/src/shared/lib/`, `frontend/src/shared/config/` |
| Evidencia de aprobación, interpretación de ejecuciones y fusión de registros | `frontend/src/entities/exercise/` |
| Lectura versionada, respaldo y avisos de carga del progreso | `frontend/src/shared/lib/versioned-storage.ts` (ADR 0003) |
| Almacenes del progreso y motores, con suscripción (F2, unidad 1) | Un almacén por clave y un motor por tipo, cada uno un singleton: `routeStore` en `frontend/src/entities/guide/`, `labStore` en `frontend/src/entities/exercise/`, y `campaignEngine` y `systemsEngine` en sus slices. Cada uno expone `changes`, un store de `zustand/vanilla` que lleva sólo la revisión y sube una vez por operación, después de escribir; el progreso sigue en su almacén. En React se lee con un selector chico (`useStore(routeStore.changes, (state) => state.revision)`), nunca con el store entero. Entre las fuentes legacy y `app/`, cada singleton tiene un solo dueño (`app.js`, `lab.js` y los dos `register-*-engine.ts`); lo hace cumplir `qa/seams-guard-check.ts` |
| Navegación, recorrido y progreso general | `frontend/app.js`, `frontend/styles.css` |
| Contenido del recorrido y biblioteca | `content/guide/`; tipos y progreso en `frontend/src/entities/guide/` |
| Catálogos de contenido (publicados en `window.*`) | `content/` → `tools/content/` → `build/curriculum.json`; adaptador `frontend/src/app/legacy/register-catalogs.ts` |
| Contenido en MySQL (ADR 0006, C2) | `tools/content/` también escribe `build/curriculum.meta.json` (huellas y claves de etapa) → etapa `curriculum` de `backend/api/Dockerfile` → `content:import` y `backend/api/app/Content/`, con un registro tipado por fila en `app/Content/Record/` (C6) → 17 recursos de sólo lectura (`GET /api/exercises`, `worlds`, `workshops`, `atlas` y `guide`); los bytes de cada porción los fija el generador, nunca `JsonResource` |
| Ejercicios del recorrido y tipo `Exercise` | sección `lab` de `content/{rust,go}/manifest.yaml` y `content/{rust,go}/exercises/<id>/`; `frontend/src/entities/exercise/model/types.ts` |
| Laboratorio, revisión y modelos educativos | `frontend/lab.js`, `frontend/lab-explorers.js`, `frontend/lab.css`; el catálogo de ejercicios (`exerciseCatalog`, `createExerciseCatalog`) y `buildProgram` viven en `frontend/src/entities/exercise/` (F2, unidad 2) y `lab.js` los usa |
| Transporte a los Playgrounds oficiales | `frontend/src/shared/api/playground/`, adaptador `frontend/src/app/legacy/register-runner.ts` |
| Ejecutor Go en sandbox (ADR 0005, todavía sin conectar al laboratorio) | `backend/executor/`: `internal/sandbox` (perfiles, argumentos de Docker, fases y barrido), `internal/api` (HTTP interno), `images/` (sandboxes Rust y Go) |
| Editor CodeMirror 6 | `frontend/src/shared/ui/code-editor/`, adaptador `frontend/src/app/legacy/register-editor.ts` |
| Atlas migrado a React/TypeScript | `frontend/src/pages/atlas/` (`ui`, `model`, `lib`), conceptos en `content/atlas/` y adaptador `frontend/src/app/legacy/register-atlas.tsx` |
| Desafíos nuevos de campaña | sección `quests` de `content/{rust,go}/manifest.yaml` (la posición en el mundo fija tipo, `kind` y minutos del jefe) |
| Mundos de campaña | `content/campaign/` |
| Reglas, validación y progreso de campaña | `frontend/src/entities/campaign/`, adaptador `frontend/src/app/legacy/register-campaign-engine.ts` |
| Interfaz y exploradores de campaña | `frontend/campaign.js`, `frontend/campaign.css`, `frontend/quest-explorers.js`, `frontend/quest-explorers.css` |
| Contrato de simulaciones de Sistemas | `frontend/src/entities/systems-simulation/` (`defineModel`, tipos de vista y escena, y `mergeModelGroups`, el registro que une los modelos de los cuatro dominios para `systems.js`; F2, unidad 4) |
| Modelos de Sistemas | `frontend/src/entities/systems-simulation/models/{lowlevel,infra,play,pc}/` (un archivo por modelo, con `defineModel`) |
| Fichas de los talleres | `content/workshops/` |
| Núcleos Rust/Go de Sistemas | sección `systems` de `content/{rust,go}/manifest.yaml` y una carpeta por núcleo en `content/{rust,go}/exercises/` |
| Catálogos de Sistemas publicados en `window.SYSTEMS_*` | adaptadores `frontend/src/app/legacy/register-systems-{lowlevel,infra,play,pc}.ts` |
| Sellos y progreso de Sistemas | `frontend/src/entities/systems-workshop/`, adaptador `frontend/src/app/legacy/register-systems-engine.ts` |
| Interfaz de Sistemas | `frontend/systems.js`, `frontend/systems.css` |
| Animaciones | `frontend/src/shared/lib/celebration.ts`, adaptador `frontend/src/app/legacy/register-effects.ts` |
| Kits ZIP de proyecto | `frontend/src/features/download-project-kit/` (archivos puros y ZIP con fflate), `frontend/src/shared/lib/download-file.ts`, adaptador `frontend/src/app/legacy/register-project-kit.ts` |
| Construcción y dependencias | `frontend/vite.config.ts`, `frontend/tsconfig.app.json`, `package.json`, `package-lock.json`; generador del currículo en `tools/content/` (`npm run curriculum`, validación, `build/curriculum.json` y oráculos de equivalencia) |
| Servicio web, API y preview: Nginx, PHP-FPM, MySQL y migraciones | `frontend/Dockerfile`, `compose.yaml` (raíz, incluye `docker/compose.yaml`), `docker/compose.preview.yaml`, `docker/nginx/nginx.conf` |
| API Laravel del ADR 0004: rutas, configuración, migraciones, pruebas Pest e imagen PHP-FPM | `backend/api/` (reglas en `backend/api/AGENTS.md`) |
| Comprobaciones e investigación educativa | `qa/*-check.ts`, `qa/lib/`, `qa/fixtures/`, `qa/run-checks.ts`, `qa/research-*.md` |
| Documentación del desarrollo | `AGENTS.md`, `docs/` |
| Planificación con Spec Kit, del backend y del front | `specs/` (una hoja de ruta por épico y una carpeta por feature), `.specify/` (constitución, plantillas, scripts y extensión `bug`) |

## Cómo mantener el orden

- Ubicá cada cambio en su módulo. Separá contenido educativo, modelos puros,
  persistencia, transporte e interfaz; evitá sumar esas responsabilidades a `frontend/app.js`.
- Para ampliar una familia existente, seguí sus prefijos y contratos. Reservá
  `docs/` para documentación de desarrollo y `qa/` para verificaciones y fuentes
  de investigación; los resultados generados siguen excluidos de Git.
- Si una nueva responsabilidad necesita varios archivos, agrupala en una carpeta
  con nombre descriptivo. Agregá un `AGENTS.md` local sólo si tiene reglas propias.
- La estructura plana es el estado legacy. Una reorganización a carpetas debe
  resolver un problema concreto y actualizar en el mismo cambio imports de
  `frontend/src/app/main.tsx`, scripts npm, QA, Docker y documentación.
- `frontend/src/app/main.tsx` define temporalmente el orden de los imports legacy. Esos módulos
  comparten contratos mediante `window.Taller*`; respetá sus dependencias hasta
  reemplazarlas por imports explícitos dentro de cada funcionalidad.
  `qa/load-order-check.ts` declara esas dependencias.
- Las fuentes legacy de `frontend/` son módulos ES: importan helpers de `frontend/src/shared/`
  (escape HTML, normalización de búsqueda, clon JSON, niveles) en lugar de copiarlos.
  Antes de escribir un helper, buscá si ya existe ahí.
- Al agregar un asset, importalo desde la entrada o la funcionalidad que lo usa para
  que Vite lo procese. No agregues otro empaquetador ni un script de concatenación.
- Editá las fuentes, conservá los avisos de licencia y regenerá los artefactos.
  `dist/` es una salida ignorada, no una fuente para editar o versionar.
- Mantené las versiones y el lockfile sincronizados. Para una migración de interfaz,
  definí el framework y el build objetivo, organizá componentes por funcionalidad
  y avanzá por vistas verificables. Conservá contenido, modelos, runner y progreso
  mediante contratos explícitos; adaptá los checks al build nuevo.
- La salida autónoma `dist/index.html` es un contrato actual. Si la migración necesita
  varios assets, definí ese cambio de entrega y actualizá Docker, Nginx, QA y README
  antes de reemplazar el build. Un framework no exige compilar Rust/Go en el host.
- Preferí comandos y rutas portables entre Linux y macOS. Los comentarios siguen la regla de
  «Convenciones» en `AGENTS.md`.
- Excluí credenciales, rutas de máquina, cachés, progreso exportado y estado generado.
  Al agregar una nueva salida o configuración privada, revisá `.gitignore` y
  `.dockerignore`.

## Contratos que hay que preservar

- Conservá IDs de ejercicios, mundos, talleres y objetivos: son referencias del
  currículo y del progreso guardado. Los cambios de formato deben contemplar las
  copias existentes y validar la importación antes de modificar el estado.
- El contenido se edita en `content/` y nunca en `build/curriculum.json`. El orden de cada
  catálogo sale de su manifiesto, nunca del número del ID. El orden de claves de los
  ejercicios lo fija `tools/content/catalogs.ts`, porque el código legacy lo observa. Si un
  cambio no debe alterar los catálogos, `npm run curriculum && node tools/content/dump-globals.ts .`
  da los mismos bytes antes y después.
- El currículo actual tiene 100 ejercicios base, 12 desafíos nuevos de campaña y
  25 núcleos de Sistemas por lenguaje: 274 ejercicios en total. Hay 4 mundos y
  16 conceptos del Atlas por lenguaje, y 25 talleres de Sistemas compartidos.
  Una ampliación debe actualizar las expectativas del build, QA, interfaz y README.
- Separá resultados reales de compilación, simulaciones y etapas manuales. Un
  fallo de transporte o compilación nunca equivale a aprobar una prueba. La regla
  única de aprobación es `hasPassingEvidence` de `frontend/src/entities/exercise`; las
  políticas de lectura, respaldo y fusión del progreso están en el ADR 0003.
- El progreso vive en `localStorage`, separado por origen y lenguaje. Preservá la
  exportación/importación, los logros ya obtenidos y el manejo de almacenamiento
  bloqueado. Las simulaciones no deben otorgar aprobación de código.
- Conservá la interfaz en español, navegación por teclado, foco visible, diseño móvil y
  movimiento reducido. Limpiá listeners, timers, editor y efectos al desmontar una vista.
- El editor y los ZIP funcionan con dependencias empaquetadas, sin CDN. Si cambia
  el transporte o los recursos externos, revisá también la CSP de `docker/nginx/nginx.conf`.

## Clean code y arquitectura de React

- Usá nombres que expresen la intención y funciones con una responsabilidad
  reconocible. Preferí condiciones explícitas y retornos tempranos a anidaciones
  largas; evitá comprimir lógica nueva para que ocupe menos líneas.
- Encapsulá comportamiento detrás de interfaces pequeñas. Separá reglas del
  dominio de detalles de DOM, React, almacenamiento y red. Extraé duplicación
  cuando represente la misma regla; evitá abstracciones para usos hipotéticos.
- Para la migración, agrupá por funcionalidad: recorrido, laboratorio, atlas,
  campaña y Sistemas. Los componentes compartidos deben tener uso real en varias
  vistas; evitá carpetas genéricas de utilidades que acumulen responsabilidades.
- Definí entradas y salidas explícitas de cada componente o módulo. Reemplazá
  gradualmente los globals por imports y adaptadores, conservando los contratos
  durante la transición. No mezcles cambios del currículo con una reescritura de UI.
- El código nuevo usa TypeScript y ES modules (`export`/`import`); `allowJs` permite
  migrar el JavaScript legacy de forma incremental. Los globals `window.Taller*`
  son adaptadores transitorios en el seam con la aplicación legacy, no el contrato
  interno de las funcionalidades React.
- Aplicá la convención de **una abstracción principal por archivo** a componentes,
  hooks, contextos y providers: declaralos como `const` con nombre a nivel de módulo,
  hacé coincidir el archivo con ese identificador y ubicá `export default Nombre` al
  final. Componentes, contextos y providers usan PascalCase y sufijos descriptivos;
  los hooks empiezan con `use`. Conservá el nombre canónico al importarlos, porque un
  default técnicamente permite renombrarlo y perder esa trazabilidad.
- Usá exports nombrados en utils, helpers, constants, tipos y módulos con varias
  capacidades públicas del mismo nivel. Un spec normalmente no exporta nada; sólo
  exportá fixtures o helpers de prueba cuando tengan consumidores reales. Si contexto,
  provider y hook conviven como API pública, separalos cuando cada uno merezca archivo
  propio o mantenelos nombrados: la existencia de varios pares elimina el `default`
  inequívoco.
- Mantené el estado cerca de quien lo usa; eleválo cuando haya consumidores
  compartidos. Derivá valores en vez de guardar copias sincronizadas. Tratá props
  y estado como inmutables y mantené el render libre de efectos secundarios.
- Mantené cada componente enfocado en una responsabilidad de interfaz. Un componente
  que reúne reglas de dominio, persistencia, coordinación de efectos y varias regiones
  visuales es un god component: distribuí esas responsabilidades entre componentes,
  hooks y módulos con interfaces pequeñas. La extracción debe crear un seam útil, no
  una cadena de wrappers que sólo traslada código.
- Evitá prop drilling: si un componente intermedio sólo reenvía props, componé con
  `children`, acercá el estado a sus consumidores o definí un provider acotado a esa
  responsabilidad. Las props directas siguen siendo preferibles para relaciones
  cercanas; no reemplaces contratos simples con contexto o estado global.
- Usá eventos para acciones del alumno. Reservá effects para sincronizar con
  sistemas externos, como CodeMirror, timers o almacenamiento, con cleanup y
  dependencias correctas. Evitá efectos para calcular datos que el render puede derivar.
- Preferí composición y variantes explícitas a componentes con muchas props
  booleanas. Cuando un effect mezcle ciclos de vida independientes, varios effects
  implementen una misma responsabilidad o su cableado oculte el render, extraé un
  hook con entradas, salidas y cleanup explícitos. Muchos effects son una señal para
  revisar responsabilidades, no un cupo; no extraigas hooks triviales por conteo.
- Para formas de objetos, props y contratos públicos de TypeScript, preferí
  `interface`. Usá `type` cuando la forma necesite uniones, tuplas, primitivas,
  tipos mapeados o condicionales. Conservá aliases existentes cuando cambiarlos sólo
  produciría ruido; el constructo elegido debe comunicar una diferencia útil.
- Manejá errores de almacenamiento, red e importación en sus límites y mostrá
  una respuesta útil al alumno. No ocultes fallos con defaults que simulen éxito.
- Medí antes de agregar memoización o complejidad por rendimiento. Probá reglas
  y flujos observables con los checks existentes y pruebas específicas de regresión.

Estas reglas se aplican a los cambios nuevos y a los módulos que se migren; el
formato ya es uniforme porque Prettier cubre todo el código propio. Las fuentes y
skills de referencia están en `docs/agent-skills.md`.

## Feature-Sliced Design incremental

Usá Feature-Sliced Design como regla de dependencias y propiedad, no como una
plantilla de carpetas. Durante la migración empezá por las capas que el flujo real
necesite: `app` para entrada y providers, `pages` para vistas completas y `shared`
para infraestructura o UI sin reglas de negocio. Abrí slices en `features` para
acciones de valor para el alumno y en `entities` para conceptos de dominio estables
sólo cuando varios consumidores justifiquen ese seam. No agregues `processes` —está
deprecada— ni `widgets` hasta que exista un bloque autónomo que realmente los necesite.
Estado actual: `frontend/src/app` (entrada y adaptadores legacy), `frontend/src/pages/atlas` (primera
página migrada), `frontend/src/entities/exercise` (regla de evidencia, interpretación de la
ejecución y fusión de registros, compartidas por laboratorio, campaña y Sistemas) y
`frontend/src/shared` (helpers y constantes sin reglas de negocio).

- La dirección permitida es `app → pages → widgets → features → entities → shared`.
  Un módulo sólo importa su propio slice o capas inferiores; dos slices de la misma
  capa permanecen independientes.
- Organizá cada slice por significado de negocio y, cuando haga falta, por segmentos
  de propósito como `ui`, `model`, `api`, `lib` o `config`. Evitá segmentos genéricos
  llamados `components`, `hooks` o `types`, porque ocultan la responsabilidad.
- Exponé una API pública pequeña por slice. Los consumidores externos importan desde
  esa API y no desde archivos internos; dentro del slice, usá imports directos. En
  `shared`, preferí una API por segmento a un barrel global que ensanche el bundle.
  La API del slice puede reexportar como nombrada la abstracción default de un archivo,
  por ejemplo `export { default as AtlasPage } from './ui/AtlasPage'`.
- Adoptá la estructura por slices al migrar una funcionalidad o cuando resuelva un
  problema concreto de cohesión o dependencias. No muevas todo el legacy de una vez
  ni crees capas, abstracciones o reexports para usos hipotéticos.

## Complejidad ciclomática y legibilidad

La complejidad ciclomática cuenta caminos linealmente independientes del flujo.
Para JavaScript y TypeScript, la referencia es la regla
[`complexity` de ESLint](https://eslint.org/docs/latest/rules/complexity), con
variante `classic`. También cuentan decisiones expresadas con operadores lógicos,
valores por defecto y encadenamiento opcional; no basta contar los `if`.
La complejidad cognitiva es otra medida, orientada a la dificultad de comprensión:
[definiciones de Sonar](https://docs.sonarsource.com/sonarqube-server/user-guide/code-metrics/metrics-definition#complexity).

El tamaño de un archivo es una señal distinta: la complejidad ciclomática se calcula
por función y no decide si un archivo debe dividirse. Revisá un archivo cuando reúna
responsabilidades que cambian por motivos diferentes, demasiados exports, dependencias
heterogéneas o navegación costosa. Modularizá alrededor de seams con nombre, contrato
y cohesión; una cantidad de líneas aislada no justifica helpers o archivos triviales.

- En funciones nuevas o modificadas, usá **más de 10** como aviso inicial para
  revisar responsabilidades, decisiones y pruebas. Es un criterio local revisable;
  ESLint tiene un máximo predeterminado de 20. `npm run lint` activa el aviso local
  con variante `classic`; las reglas recomendadas de ESLint son errores.
- Medí funciones relevantes de las fuentes, excluyendo bundles, dependencias,
  skills importadas y salidas generadas. Indicá herramienta, versión y variante
  al comparar mediciones; métricas de herramientas distintas pueden diferir.
- Preferí retornos tempranos para reducir anidación. Extraé funciones cuando
  representen una responsabilidad con nombre claro; usá tablas de decisión sólo
  cuando expresen mejor la regla y preserven precedencia, errores y casos límite.
- Evitá dividir una función en helpers triviales, esconder condiciones en
  expresiones compactas o cambiar variantes sólo para mejorar el número.
  Una excepción legible puede justificarse en la revisión con su contrato y pruebas.
- Antes de refactorizar, protegé el comportamiento público. Cubrí resultados de
  las ramas, límites y errores relevantes con expectativas independientes;
  el valor de complejidad no determina por sí solo la cantidad de tests necesarios.
- Informá medición antes/después cuando el motivo del cambio sea la complejidad,
  junto con la mejora de lectura y los checks ejecutados. No reescribas el código
  existente en bloque para cumplir este umbral.

Ejemplo: estas dos versiones tienen complejidad ciclomática **4** según ESLint
`classic`. La segunda facilita la lectura al quitar anidación; no baja la métrica.

```js
// Antes: hay que seguir tres niveles de condiciones.
function puedeEjecutar(estado) {
  if (estado.online) {
    if (estado.codigo) {
      if (!estado.ejecutando) return true;
    }
  }
  return false;
}

// Después: cada impedimento se lee por separado.
function puedeEjecutar(estado) {
  if (!estado.online) return false;
  if (!estado.codigo) return false;
  if (estado.ejecutando) return false;
  return true;
}
```

Son alternativas ilustrativas, no dos declaraciones para copiar juntas ni una
regla nueva del runner. El objetivo sigue siendo código simple y entendible.
