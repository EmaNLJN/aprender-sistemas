<!--
Sync Impact Report
- Versión: 1.3.1 → 1.4.0 (MINOR: el gobierno reserva MINOR para una sección o un principio nuevos)
  → 1.4.1 (PATCH: el principio II nombra las pruebas del front).
- Ratificación: el usuario ratificó la 1.4.0 el 2026-10-05, con la sección «Épicos y hojas de ruta».
  La 1.4.1 sólo aplica lo que manda el ADR 0008, que el usuario aceptó el mismo día (su sección
  «Consecuencias» pide este PATCH): el usuario la revisa con este cambio.
- Principios modificados: sólo el II, en la 1.4.1: suma que en el front Vitest prueba la lógica y
  los componentes y Playwright, la red de punta a punta. Del I al VIII, el resto queda como estaba.
- Secciones agregadas: «Épicos y hojas de ruta» (1.4.0).
- Secciones modificadas: «Flujo de trabajo y verificación», viñeta «Planificación con Spec Kit»
  (1.4.0: ahora cubre los dos épicos y remite a la sección nueva); la tabla de «Épicos y hojas de
  ruta» (1.4.1: ya no marca el ADR 0008 como propuesta).
- Secciones eliminadas: ninguna.
- Archivos que cambian en el mismo commit (1.4.1): AGENTS.md (los comandos de las pruebas del front,
  que llegan con F1), qa/AGENTS.md, docs/agent-skills.md y docs/adr/0008-pruebas-del-front.md.
- Plantillas: ninguna requiere cambios; las de spec, plan, tasks y checklist son genéricas.
- Pendiente en otros cambios: F1 reemplaza el aviso «hasta que se integre, no existen» de AGENTS.md y
  de qa/AGENTS.md por los comandos reales.
- Este informe es material de revisión: puede quitarse al integrar la enmienda.
-->

# Constitución del Taller Rust y Go

`AGENTS.md` es la fuente de las reglas del proyecto. Esta constitución las resume para que las
specs, los planes y las tareas de Spec Kit se contrasten contra ellas, y remite a cada fuente
en lugar de copiarla. Si una frase de acá difiere de `AGENTS.md`, manda `AGENTS.md`.

## Principios centrales

### I. AGENTS.md es la fuente

Las reglas viven en `AGENTS.md` y en los `AGENTS.md` locales (`backend/api/`, `qa/`, `backend/executor/`,
`tools/quality/`). La constitución, las specs y los planes remiten a ellas y no las duplican.
Un plan que las contradiga se corrige; una regla cambia sólo en `AGENTS.md`, en su propio cambio.

### II. TDD y pruebas útiles (no negociable)

Todo cambio de comportamiento empieza con una prueba que falla por la razón esperada, sigue con
la implementación mínima y se revisa antes de refactorizar en verde (`qa/AGENTS.md`, skill
`tdd`). El valor esperado sale del contrato, de la consigna o de un ejemplo resuelto aparte,
nunca del algoritmo que se prueba, y se prueba comportamiento observable. En el backend, Pest
corre contra MySQL 9.7 real, sin SQLite (`backend/api/AGENTS.md`). En el front, Vitest prueba la
lógica y los componentes, y Playwright, la red de punta a punta contra el build servido, sin tocar
servicios públicos (ADR 0008, `qa/AGENTS.md`).

### III. Código entendible

Se prefiere código simple y explícito a uno ingenioso, y una abstracción se justifica cuando
reduce complejidad real. Más de 10 de complejidad ciclomática por función y un archivo grande
son señales de revisión, no órdenes de fragmentar: se modulariza por seams con nombre y contrato
(`docs/architecture.md`). El código y las pruebas, en inglés, se explican solos: un comentario
sólo acompaña una función, clase o método complejo, o deja una referencia puntual.

### IV. Contenido en Git, IDs estables, nada se borra

`content/` es la fuente del currículo y `build/` es salida generada. Los IDs son inmutables y
nunca se reutilizan, porque indexan el progreso: se conserva su compatibilidad y la distinción
entre compilación real, simulaciones y pasos manuales (`README.md`). Lo que desaparece del
contenido se retira, no se borra (ADR 0004).

### V. Capas y contratos explícitos

Se separan contenido, modelos, persistencia, transporte e interfaz. El front usa React con
TypeScript y Feature-Sliced Design de forma incremental, con una API pública pequeña por slice;
el backend es Laravel en `backend/api/` sobre MySQL, con interfaces explícitas (ADR 0004). No se agregan
capas, stores, servidores ni frameworks por anticipado: cada uno entra con su primer caso real
y, si es un backend o un cambio de arquitectura, con un ADR.

### VI. Español, accesibilidad y portabilidad

La documentación, la interfaz, los mensajes para quien usa u opera el taller y todo lo que
genera Spec Kit están en español rioplatense, con el voseo de `AGENTS.md`; el código y las
pruebas, en inglés (principio III). Los
encabezados y las etiquetas estructurales de las plantillas de Spec Kit se conservan en inglés,
porque las skills los usan para ubicarse; el contenido va en español. Se conservan la
accesibilidad de teclado, el diseño móvil y el movimiento reducido, y se prefieren soluciones
portables entre Linux y macOS.

### VII. Secretos y salidas generadas fuera de Git

Credenciales, rutas locales, cachés, progreso y resultados generados no entran en Git ni en el
contexto de Docker (`.gitignore`, `.dockerignore`). Se editan las fuentes y se regeneran los
assets, y el lockfile se sincroniza. Las dependencias de la API se agregan sólo con permiso del
usuario (`backend/api/AGENTS.md`).

### VIII. Persistencia de las specs: flow-forward

Las specs siguen el modelo flow-forward de Spec Kit ([spec-persistence][persistencia]): un
artefacto entregado no se edita, se continúa con otro. Cada feature vive en
`specs/NNN-<id>-<nombre>/` con su `spec.md`, su `plan.md` y su `tasks.md`.

- **En curso:** `/speckit-converge` puede agregar tareas al final de `tasks.md` hasta completar
  la feature. Cada tarea ocupa una línea con su ID y, como mucho, una sublínea de evidencia: el
  commit o el PR que la cerró. No se pegan salidas de comandos, bitácoras ni narraciones de
  avance.
- **Entregada:** su directorio en `specs/` (spec, plan y tasks) queda inmutable, como registro
  histórico.
- **Cambios sustanciales o requisitos nuevos, después de entregar:** una spec nueva con
  `/speckit-specify`, en un directorio nuevo y enlazada a la original («extiende» o «reemplaza a
  `specs/NNN-…`»). La hoja de ruta apunta a las dos.
- **Bugs:** la extensión `bug` guarda cada uno en `.specify/bugs/<slug>/`, con su evaluación, su
  arreglo y su validación (`/speckit-bug-assess`, `/speckit-bug-fix` y `/speckit-bug-test`), sin
  tocar el `tasks.md` de la feature.

## Flujo de trabajo y verificación

- **Verificación:** antes de cerrar un cambio se ejecutan los checks de `qa/AGENTS.md` que
  apliquen y `git diff --check`, y se informan resultados y límites. Una documentación se
  comprueba por rutas, comandos y enlaces locales; una interfaz, también en el navegador.
- **Subagentes:** el agente principal analiza, decide, revisa e integra. Los subagentes
  implementan slices con archivos disjuntos, y el principal integra `frontend/src/app/main.tsx`,
  `package.json`, las configuraciones y la documentación.
- **Planificación con Spec Kit:** cada subplan del backend y cada ítem del épico del front
  recorren specify, clarify, plan, tasks y analyze antes de implementarse. La spec dice qué y por
  qué; el plan, cómo. Las hojas de ruta de los épicos están en «Épicos y hojas de ruta» y las
  specs, en `specs/`. La plantilla de `tasks.md` del proyecto
  (`.specify/templates/overrides/tasks-template.md`) aplica el principio VIII.
- **Disciplina de contenido (superpowers):** los archivos son los de Spec Kit, nunca
  `docs/superpowers/`. La spec sigue los criterios de `brainstorming`: intención y criterio de
  éxito escritos para que el usuario los corrija, lo que pidió separado de los supuestos, YAGNI
  y las alternativas consideradas cuando importan. El plan sigue los de `writing-plans`: mapa de
  archivos, interfaces exactas entre tareas, pasos que empiezan por la prueba, ningún marcador
  pendiente y una sección «Review Focus». `tasks.md` queda corto: una línea por tarea y, como
  mucho, su evidencia; el detalle va en el plan.
- **Origen de estas reglas:** el recorrido con Spec Kit, la disciplina de contenido y el
  principio VIII viven en esta constitución; `AGENTS.md` apunta acá en lugar de repetirlos.

## Épicos y hojas de ruta

Cada épico de planificación tiene su hoja de ruta, con IDs estables, y cada uno de sus ítems
recorre el flujo de Spec Kit de «Flujo de trabajo y verificación».

| Épico | Hoja de ruta | Fuente técnica |
| --- | --- | --- |
| Backend multiusuario | `specs/backend-multiusuario/roadmap.md` (B1…E1, C5 y C6) | ADR 0004, 0005 y 0006 |
| Port del front legacy a React | `specs/front-react/roadmap.md` (F1…F11) | ADR 0001, 0003, 0007 y 0008, `docs/architecture.md` y el mapa del front legacy |

- **Una hoja de ruta por épico, con las mismas convenciones:** los IDs no se renumeran ni se
  reutilizan, cada ítem tiene una spec en `specs/NNN-<id>-<nombre>/`, los estados van de
  `Pendiente` a `Entregado` y una entrega exige la implementación integrada y la evidencia de QA.
  Cada hoja de ruta las escribe en su sección «Convenciones».
- **Un ítem, un dueño:** un ítem que toca los dos épicos (A2, A3 y A4 del backend tocan el
  arranque y el laboratorio del front) se especifica una sola vez, en la hoja de ruta que lo
  posee. La otra lo referencia y cablea la dependencia, sin copiar su alcance.
- **El front no se rediseña:** un ítem de port se especifica como port, contra el comportamiento
  actual, y cita las pruebas que lo protegen. Conserva los IDs y el progreso guardado
  (`AGENTS.md`, ADR 0003) y, por criterio de la hoja de ruta del front, el aspecto, el
  comportamiento y las URLs.
- **ADR en estado «propuesta»:** cada spec que lo usa como base lo dice, como hace el ADR 0006
  con el backend. Una regla llega a esta constitución cuando ya está en `AGENTS.md`.

## Gobierno

- `AGENTS.md` prevalece sobre esta constitución. Cuando `AGENTS.md` cambia una regla que acá se
  resume, la constitución se actualiza en el mismo cambio.
- Versionado semántico: MAJOR si se quita o redefine un principio, MINOR si se agrega un
  principio o una sección, PATCH si sólo se aclara el texto.
- Cumplimiento: cada plan incluye su «Constitution Check», y `/speckit-analyze` trata un
  conflicto con esta constitución como crítico: se corrige la spec, el plan o las tareas.

[persistencia]: https://github.com/github/spec-kit/blob/main/docs/concepts/spec-persistence.md

**Version**: 1.4.1 | **Ratified**: 2026-10-04 (aprobada por el usuario; la 1.4.0, ratificada por el usuario el 2026-10-05) | **Last Amended**: 2026-10-05 (principio II, por el ADR 0008)
