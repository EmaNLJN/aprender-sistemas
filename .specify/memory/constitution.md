# Constitución del Taller Rust y Go

`AGENTS.md` es la fuente de las reglas del proyecto. Esta constitución las resume para que las
specs, los planes y las tareas de Spec Kit se contrasten contra ellas, y remite a cada fuente
en lugar de copiarla. Si una frase de acá difiere de `AGENTS.md`, manda `AGENTS.md`.

## Principios centrales

### I. AGENTS.md es la fuente

Las reglas viven en `AGENTS.md` y en los `AGENTS.md` locales (`api/`, `qa/`, `executor/`,
`tools/quality/`). La constitución, las specs y los planes remiten a ellas y no las duplican.
Un plan que las contradiga se corrige; una regla cambia sólo en `AGENTS.md`, en su propio cambio.

### II. TDD y pruebas útiles (no negociable)

Todo cambio de comportamiento empieza con una prueba que falla por la razón esperada, sigue con
la implementación mínima y se revisa antes de refactorizar en verde (`qa/AGENTS.md`, skill
`tdd`). El valor esperado sale del contrato, de la consigna o de un ejemplo resuelto aparte,
nunca del algoritmo que se prueba, y se prueba comportamiento observable. En el backend, Pest
corre contra MySQL 9.7 real, sin SQLite (`api/AGENTS.md`).

### III. Código entendible

Se prefiere código simple y explícito a uno ingenioso, y una abstracción se justifica cuando
reduce complejidad real. Más de 10 de complejidad ciclomática por función y un archivo grande
son señales de revisión, no órdenes de fragmentar: se modulariza por seams con nombre y contrato
(`docs/architecture.md`). Los comentarios explican decisiones, límites y efectos no evidentes.

### IV. Contenido en Git, IDs estables, nada se borra

`content/` es la fuente del currículo y `build/` es salida generada. Los IDs son inmutables y
nunca se reutilizan, porque indexan el progreso: se conserva su compatibilidad y la distinción
entre compilación real, simulaciones y pasos manuales (`README.md`). Lo que desaparece del
contenido se retira, no se borra (ADR 0004).

### V. Capas y contratos explícitos

Se separan contenido, modelos, persistencia, transporte e interfaz. El front usa React con
TypeScript y Feature-Sliced Design de forma incremental, con una API pública pequeña por slice;
el backend es Laravel en `api/` sobre MySQL, con interfaces explícitas (ADR 0004). No se agregan
capas, stores, servidores ni frameworks por anticipado: cada uno entra con su primer caso real
y, si es un backend o un cambio de arquitectura, con un ADR.

### VI. Español, accesibilidad y portabilidad

La documentación y la interfaz están en español rioplatense, con el voseo de `AGENTS.md`. Se
conservan la accesibilidad de teclado, el diseño móvil y el movimiento reducido, y se prefieren
soluciones portables entre Linux y macOS.

### VII. Secretos y salidas generadas fuera de Git

Credenciales, rutas locales, cachés, progreso y resultados generados no entran en Git ni en el
contexto de Docker (`.gitignore`, `.dockerignore`). Se editan las fuentes y se regeneran los
assets, y el lockfile se sincroniza. Las dependencias de la API se agregan sólo con permiso del
usuario (`api/AGENTS.md`).

## Flujo de trabajo y verificación

- **Verificación:** antes de cerrar un cambio se ejecutan los checks de `qa/AGENTS.md` que
  apliquen y `git diff --check`, y se informan resultados y límites. Una documentación se
  comprueba por rutas, comandos y enlaces locales; una interfaz, también en el navegador.
- **Subagentes:** el agente principal analiza, decide, revisa e integra. Los subagentes
  implementan slices con archivos disjuntos, y el principal integra `src/app/main.tsx`,
  `package.json`, las configuraciones y la documentación.
- **Planificación con Spec Kit:** cada subplan del backend recorre specify, clarify, plan, tasks
  y analyze antes de implementarse. La spec dice qué y por qué; el plan, cómo. La hoja de ruta
  del épico vive en `specs/backend-multiusuario/roadmap.md` y las specs, en `specs/`.

## Gobierno

- `AGENTS.md` prevalece sobre esta constitución. Cuando `AGENTS.md` cambia una regla que acá se
  resume, la constitución se actualiza en el mismo cambio.
- Versionado semántico: MAJOR si se quita o redefine un principio, MINOR si se agrega un
  principio o una sección, PATCH si sólo se aclara el texto.
- Cumplimiento: cada plan incluye su «Constitution Check», y `/speckit-analyze` trata un
  conflicto con esta constitución como crítico: se corrige la spec, el plan o las tareas.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): a la espera de la aprobación del usuario | **Last Amended**: 2026-10-04
