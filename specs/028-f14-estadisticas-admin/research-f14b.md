# Research: F14b · Las estadísticas del admin, por cuenta

**Spec**: [spec.md](./spec.md) (F14b: FR-025 a FR-037, los transversales FR-038 a FR-063 sobre lo suyo, SC-001 a SC-008 y SC-010 en lo de una cuenta; historias 3 y 4, y lo de F14b de las historias 5, 7 y 8) | **Plan**: [plan-f14b.md](./plan-f14b.md) | **Contrato**: [contracts/usage-section.md](./contracts/usage-section.md) | **Fecha**: 2026-10-29

Las decisiones de F14b que [research.md](./research.md) (F14a) no cubre. Lo de F14a vale tal cual y no se repite: la base y las fuentes, uPlot y sus pruebas por capas, el período compartido, los títulos, los pedidos y la tabla de consultas.

## La base y las fuentes

- **La base de implementación** es `master` con F14a integrada (P1-A: F14b espera a F14a). T029 lo comprueba.
- **F12a,** en el plan enmendado: `plan/amend-a3-f8-f12a`, `02b5a957` (PR #84). La enmienda del grupo «Acciones sobre {nombre}», con `actions(name)` en el Page Object, está commiteada en ese commit.
- **F12b:** `plan/f12b-admin-correo`, `cf85fea2` (PR #85). En la sesión de este plan, el árbol de trabajo de ese worktree tuvo primero un cambio sin commitear en `plan-f12b.md`. Se leyó ese árbol, y después quedó commiteado en `cf85fea2` («F12b cuenta las acciones de cada fila dentro de su grupo»). F12b suma la prop `mailAvailable` a `AccountsTable` y una cuarta acción dentro del grupo.
- **C5:** `spec/c5-estadisticas`, `933d9e06`, `contracts/http.md` §5, §6 y §8, y los textos de `lang/es/admin.php` (`stats.inactive_since` y `stats.sort`).

## Decisiones

### R1. La lista de origen queda montada y oculta (hallazgo F14-3, FR-029)

**Decisión.** La sección de «Cuentas» (`AccountsSection` de F12a) y la vista «Alumnos» guardan cuál es la cuenta abierta y dibujan su lista dentro de un contenedor con `hidden`, al lado del detalle. «Volver» quita el detalle con `flushSync` y devuelve el foco al botón que lo abrió, que sigue en el documento porque la lista no se desmontó. Si la lista se volvió a pedir y la fila ya no está, el foco va al título de la tabla.

**Motivo.** El estado de la lista (la página, la búsqueda y los filtros) vive en `usePagedList`, dentro de la sección. Desmontarla lo perdería. Subirlo a `AdminPage` cambiaría el contrato de F12a por algo que sólo usa F14b.

**El CSS.** `.admin-section` tiene `display: grid`, que le gana al `display: none` del atributo `hidden` en la hoja del navegador. F14b suma `.admin-section[hidden] { display: none; }`, como F14a sumó `.usage-view[hidden]`.

**Alternativa descartada:** un diálogo para el detalle. F12a deja un diálogo a la vez (su FR-005), y una grilla de cientos de filas no entra bien en un modal (spec, L1).

### R2. La columna «Uso» (Q1-A, FR-028)

**Decisión.** `AccountsTable` suma una prop obligatoria, `onUsage(user, opener)`, y una columna «Uso» justo antes de «Acciones». Cada fila que no se está borrando tiene «Ver el uso de {nombre}», también la propia. El botón queda fuera del grupo «Acciones sobre {nombre}», y `ACTION_SLOTS` no cambia.

**Por qué ninguna prueba de F12a ni de F12b cambia.** Se revisaron sus aserciones sobre la tabla (plan de F12a, T015 y T022; plan de F12b, T036 y T038):

- cuentan los botones dentro del grupo, con `within(group)` o `admin.actions(name)`;
- ubican las filas por un nombre parcial (`/Ana Pérez/`), que el botón nuevo no rompe;
- llegan a un botón con un `tabTo` de hasta 60 teclas, que absorbe un botón más por fila.

Ninguna cuenta columnas ni celdas. El escenario de 320 px de F12a sigue en verde, porque la tabla ya se desplaza en su región (`min-width: 720px`).

**Con F12b en la base** (T029, B2), el diff es el mismo: `mailAvailable` queda donde F12b lo puso y `onUsage` se suma al lado.

### R3. Las cuotas no son tasas (FR-033)

**Decisión.** Las cuotas («Ejecuciones activas», «Aceptadas en el último minuto», «Aceptadas en las últimas 24 horas» y «Minutos de sandbox») se dibujan con un `<meter>` y «{uso} de {límite}», sin la regla de la muestra chica.

**Motivo.** Q3-A rige para una tasa sobre alumnos, donde el `n` es una muestra. El límite de una cuota es configuración: con «Muestra chica», «0 de 1 ejecución activa» mentiría.

**El dato:** los minutos de sandbox salen de `sandboxMs / 60 000`, con un decimal.

### R4. El detalle no dibuja distribuciones ni opciones (FR-039 y FR-042)

**Decisión.** De una pregunta, el detalle sólo dice «Respondió y acertó», «Respondió y no acertó» o «No respondió». Vale para la predicción de un ejercicio, el checkpoint de un mundo y la predicción de un taller. Ningún componente del detalle usa `Distribution`, y la spec de componente lo comprueba buscando listas de opciones (SC-002).

### R5. Un pedido por acción del admin (FR-030, SC-004)

**Decisión.** El detalle pide `GET /api/admin/stats/students/{id}` al montarse, y sólo se monta por un clic en «Ver el uso de {nombre}». Ninguna fila tiene `onMouseEnter` ni un prefetch, y nada pide `GET /api/admin/users/{id}`. Aplicar otro período hace un pedido más (`useStatsRequest`, por el período compartido). «Ver sus ejecuciones» monta la lista sólo al usarlo: hasta entonces no hay ningún `GET /api/admin/runs?user=`.

**Un 401 en el detalle:** `useStatsRequest` llama a `recoverSession`. Si vuelve a entrar la misma cuenta, el detalle sigue donde estaba, con el aviso y «Reintentar», y no se vuelve a pedir solo (spec, «Edge Cases»).

**Un 404** (la cuenta pasó a borrarse): el detalle muestra «Esa cuenta ya no existe o se está borrando.» y «Volver». «Volver» quita el detalle y vuelve a pedir la lista de origen (`list.reload()`), como pide FR-036.

### R6. La lista de alumnos reutiliza la de F12a (FR-025 y FR-026)

**Decisión.** «Alumnos» usa `usePagedList`, `ListView`, `Pagination` y `FilterSelect` de F12a, con el pedido `listStudents`.

- **La búsqueda** sale sólo al enviarla, con hasta 80 caracteres y el texto de F12a.
- **«Sin actividad desde» y el orden** piden al cambiar, en la página 1.
- **El orden por omisión,** `name`, no viaja en la query, así que el primer pedido es `page=1&perPage=25` (historia 3, escenario 1).
- **Ningún orden por métrica:** las cuatro opciones son las de la API.

### R7. Los textos de F14b

La spec trae casi todos («Textos que lee quien administra»: «Alumnos» y «Detalle de una cuenta»). Los que agrega el plan:

| Dónde | Texto |
| --- | --- |
| La carga | «Cargando los alumnos…» (ya en la spec por F12a: `ListTexts`) y «Cargando el uso…» |
| La falla del detalle | «No pudimos cargar el uso de esta cuenta.» |
| La falla de sus ejecuciones | «No pudimos cargar sus ejecuciones.» |
| Sus ejecuciones, vacías | «No tiene ejecuciones en los últimos 14 días.» |
| Un bloque del detalle | «Cuenta» (nombre, email, rol y estado) |
| Los «Borrar todo», en singular | «Hizo «Borrar todo» 1 vez; la última, el {fecha}.» |
| Las cuotas | «Ejecuciones activas», «Aceptadas en el último minuto», «Aceptadas en las últimas 24 horas» y «Minutos de sandbox» |
| La grilla | Las columnas «Estado», «Resuelto», «Intentos», «Último intento», «Ayuda», «Predicción», «Autoevaluación» y «Próximo repaso»; la ayuda «Asistido», «Vio la solución» y «{n} pistas» |
| Las tablas del detalle | «Importaciones» («Fecha», «Origen» y «Época»), «Resueltos por catálogo» («En el servidor» e «Importados»), «Intentos» («En el período» y «En total»), «La actividad, por {día|semana|mes}», «Campaña» («Mundo», «Checkpoint» y «Aprobado el»), «Ejercicios sellados» y «Talleres de Sistemas» («Código sellado», «Etapas marcadas» y «Objetivos observados») |
| El recorrido de una cuenta | «Pasos», «Hitos», «Favoritos» y «Preguntas respondidas» |
| El gráfico de una cuenta | «Actividad», con la serie «Intentos» |

## Consultas de documentación

F14b no usa ninguna librería que F14a no haya consultado (research.md, «Consultas de documentación»). Vuelve a mirar sólo lo que cambia su uso:

| Librería | Versión | Tema | Conclusión | ¿Cambió el plan? |
| --- | --- | --- | --- | --- |
| Testing Library | 16.3.3 | Lo que queda bajo un ancestro con `hidden` | `ByRole` lo excluye sin `hidden: true`, porque el atributo saca el subárbol del árbol de accesibilidad | Sí: las specs comprueban que la lista oculta no se consulta y que vuelve |
| React | 19.2.8 | `flushSync` antes de mover el foco | Aplica el estado de forma síncrona, así que el botón ya es visible al enfocarlo | No: es lo que hace F12a (R5 de su research) |
| Playwright (`/microsoft/playwright/v1.63.0`) | 1.63.0 | `locator.hover()` | Espera la accionabilidad, desplaza el elemento a la vista y mueve el mouse a su centro con `page.mouse` | Sí: SC-004 se prueba con `hover` sobre cada fila y el conteo de pedidos del doble |

Testing Library y React salen de las consultas de F14a (`ByRole` y `hidden`) y de la documentación de React que cita el plan de F12a. Playwright se consultó de nuevo el 2026-10-29, para `hover`.

## Mediciones (de sólo lectura)

- **Las aserciones de F12a y F12b sobre la tabla de «Cuentas»:** `grep` de `columnheader`, `getAllByRole('cell')`, `toHaveCount`, `.at(-1)` y `tabTo` en los dos planes. Las cuentas de botones van dentro del grupo; ninguna cuenta columnas ni celdas; los `tabTo` llegan hasta 60 teclas (R2).
- **El peso:** F14b no tiene una medición propia, porque no hay código. Su tope sale de lo que mida F14a en T028 (R11 de research.md).

## Lo que no se verificó

- **Nada corrió,** como en F14a.
- **El tamaño real de F14b:** lo miden T037 y T041.
- **El código de F14a:** este plan usa las firmas del contrato. T029 compara las reales de `master`.
