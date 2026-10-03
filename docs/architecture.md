# Arquitectura y convenciones del taller

Consultá este archivo al cambiar módulos, contratos de progreso, carga de assets
o al migrar una vista a React. El mapa describe el estado actual del repositorio.

## Mapa de archivos

La estructura actual es plana y se organiza por responsabilidad y prefijo:

| Responsabilidad | Fuentes |
| --- | --- |
| Documento y orden de carga | `page.html` |
| Navegación, recorrido y progreso general | `app.js`, `content.js`, `styles.css` |
| Ejercicios del recorrido | `lab-rust.js`, `lab-go.js` |
| Laboratorio, revisión y modelos educativos | `lab.js`, `lab-explorers.js`, `lab.css` |
| Transporte a los Playgrounds oficiales | `runner.js` |
| Editor CodeMirror 6 | `editor-source.js` |
| Atlas | `atlas-content.js`, `atlas.js`, `atlas.css` |
| Desafíos nuevos de campaña | `quests-rust.js`, `quests-go.js` |
| Mundos, reglas y progreso de campaña | `campaign-rust.js`, `campaign-go.js`, `campaign-engine.js` |
| Interfaz y exploradores de campaña | `campaign.js`, `campaign.css`, `quest-explorers.js`, `quest-explorers.css` |
| Catálogos y modelos puros de Sistemas | `systems-{lowlevel,infra,play,pc}.js` |
| Núcleos Rust/Go de Sistemas | `systems-{lowlevel,infra,play,pc}-labs.js` |
| Sellos y progreso de Sistemas | `systems-engine.js` |
| Interfaz de Sistemas | `systems.js`, `systems.css` |
| Animaciones y kits ZIP | `game-effects-source.js`, `project-kit-source.js` |
| Construcción y dependencias | `build.mjs`, `build.py`, `package.json`, `package-lock.json` |
| Servicio estático y preview | `Dockerfile`, `compose.yaml`, `compose.preview.yaml`, `nginx.conf` |
| Comprobaciones e investigación educativa | `qa/*-check.cjs`, `qa/research-*.md` |
| Documentación del desarrollo | `AGENTS.md`, `docs/` |

## Cómo mantener el orden

- Ubicá cada cambio en su módulo. Separá contenido educativo, modelos puros,
  persistencia, transporte e interfaz; evitá sumar esas responsabilidades a `app.js`.
- Para ampliar una familia existente, seguí sus prefijos y contratos. Reservá
  `docs/` para documentación de desarrollo y `qa/` para verificaciones y fuentes
  de investigación; los resultados generados siguen excluidos de Git.
- Si una nueva responsabilidad necesita varios archivos, agrupala en una carpeta
  con nombre descriptivo. Agregá un `AGENTS.md` local sólo si tiene reglas propias.
- La estructura plana es el estado actual. Una reorganización a carpetas debe
  resolver un problema concreto y actualizar en el mismo cambio referencias en
  `page.html`, builds, scripts npm, QA, Docker y documentación.
- `page.html` define el orden de scripts y estilos. Los scripts clásicos comparten
  contratos mediante `window.Taller*` y catálogos globales; respetá sus dependencias.
  Los archivos `*-source.js` usan imports y se empaquetan como IIFE para el navegador.
- Al agregar un asset, usá referencias compatibles con los empaquetadores actuales:
  `<script src="archivo.js"></script>` y `<link rel="stylesheet" href="archivo.css">`.
  Cambiar esos formatos exige adaptar y verificar `build.mjs` y `build.py`.
- Editá las fuentes, conservá los avisos de licencia y regenerá los artefactos.
  `index.html` y `*.bundle.js` son salidas ignoradas, no fuentes para editar o versionar.
- Mantené las versiones y el lockfile sincronizados. Para una migración de interfaz,
  definí el framework y el build objetivo, organizá componentes por funcionalidad
  y avanzá por vistas verificables. Conservá contenido, modelos, runner y progreso
  mediante contratos explícitos; adaptá los checks al build nuevo.
- La salida autónoma `index.html` es un contrato actual. Si la migración necesita
  varios assets, definí ese cambio de entrega y actualizá Docker, Nginx, QA y README
  antes de reemplazar el build. Un framework no exige compilar Rust/Go en el host.
- Preferí comandos y rutas portables entre Linux y macOS. Comentá automatizaciones
  y atajos no obvios con su disparador, acción y efectos visibles.
- Excluí credenciales, rutas de máquina, cachés, progreso exportado y estado generado.
  Al agregar una nueva salida o configuración privada, revisá `.gitignore` y
  `.dockerignore`.

## Contratos que hay que preservar

- Conservá IDs de ejercicios, mundos, talleres y objetivos: son referencias del
  currículo y del progreso guardado. Los cambios de formato deben contemplar las
  copias existentes y validar la importación antes de modificar el estado.
- El currículo actual tiene 100 ejercicios base, 12 desafíos nuevos de campaña y
  25 núcleos de Sistemas por lenguaje: 274 ejercicios en total. Hay 4 mundos y
  16 conceptos del Atlas por lenguaje, y 25 talleres de Sistemas compartidos.
  Una ampliación debe actualizar las expectativas del build, QA, interfaz y README.
- Separá resultados reales de compilación, simulaciones y etapas manuales. Un
  fallo de transporte o compilación nunca equivale a aprobar una prueba.
- El progreso vive en `localStorage`, separado por origen y lenguaje. Preservá la
  exportación/importación, los logros ya obtenidos y el manejo de almacenamiento
  bloqueado. Las simulaciones no deben otorgar aprobación de código.
- Conservá español, navegación por teclado, foco visible, diseño móvil y movimiento
  reducido. Limpiá listeners, timers, editor y efectos al desmontar una vista.
- El editor y los ZIP funcionan con dependencias empaquetadas, sin CDN. Si cambia
  el transporte o los recursos externos, revisá también la CSP de `nginx.conf`.

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
- Mantené el estado cerca de quien lo usa; eleválo cuando haya consumidores
  compartidos. Derivá valores en vez de guardar copias sincronizadas. Tratá props
  y estado como inmutables y mantené el render libre de efectos secundarios.
- Usá eventos para acciones del alumno. Reservá effects para sincronizar con
  sistemas externos, como CodeMirror, timers o almacenamiento, con cleanup y
  dependencias correctas. Evitá efectos para calcular datos que el render puede derivar.
- Preferí composición y variantes explícitas a componentes con muchas props
  booleanas. Agregá hooks compartidos cuando encapsulen una responsabilidad real.
- Manejá errores de almacenamiento, red e importación en sus límites y mostrá
  una respuesta útil al alumno. No ocultes fallos con defaults que simulen éxito.
- Medí antes de agregar memoización o complejidad por rendimiento. Probá reglas
  y flujos observables con los checks existentes y pruebas específicas de regresión.

Estas reglas se aplican a los cambios nuevos y a los módulos que se migren. No
exigen reformatear todo el código existente. Las fuentes y skills de referencia
están en `docs/agent-skills.md`.

## Complejidad ciclomática y legibilidad

La complejidad ciclomática cuenta caminos linealmente independientes del flujo.
Para JavaScript/JSX, la referencia es la regla
[`complexity` de ESLint](https://eslint.org/docs/latest/rules/complexity), con
variante `classic`. También cuentan decisiones expresadas con operadores lógicos,
valores por defecto y encadenamiento opcional; no basta contar los `if`.
La complejidad cognitiva es otra medida, orientada a la dificultad de comprensión:
[definiciones de Sonar](https://docs.sonarsource.com/sonarqube-server/user-guide/code-metrics/metrics-definition#complexity).

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
