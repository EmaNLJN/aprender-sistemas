# Feature Specification: F14 · Las estadísticas del admin en la interfaz

**Feature Branch**: `028-f14-estadisticas-admin` (nombre de la feature; el proyecto no crea una rama por feature: el trabajo va en `spec/f14-estadisticas-admin`)

**Created**: 2026-10-28

**Status**: Borrador, con cuatro preguntas y una partición para el clarify. Sin plan

**Input**: Ítem **F14** del épico del front, «Estadísticas del admin». Lo creó el clarify de C5 el 2026-10-28 (Q4-A): C5 entrega sólo la API, y sus pantallas son un ítem nuevo del front. Todavía no figura en la [hoja de ruta del front](../front-react/roadmap.md): la integra el coordinador. Lo encargó el coordinador el 2026-10-28. No es un port: el legacy no tiene estas pantallas.

- **La API que consume** es la de C5, especificada y planificada pero fuera de `master` (PR #86). Se cita por rama y ruta, sin enlace: `spec/c5-estadisticas`, `933d9e06`, `specs/025-c5-estadisticas/spec.md` y su contrato `contracts/http.md`. De ahí salen las rutas, los campos, lo que nunca sale, la paginación, la línea de registro de cada consulta de una cuenta y los códigos de error.
- **Dónde se monta** es la administración de F12a ([spec 023](../023-f12-administracion/spec.md), con su [plan](../023-f12-administracion/plan.md) y su [contrato](../023-f12-administracion/contracts/admin-page.md)), con las correcciones del PR #84, también fuera de `master`: `plan/amend-a3-f8-f12a`, `191e5974`, en los mismos archivos. De ahí salen el diálogo a pantalla completa, `pages/admin` con su `AdminPage` por secciones, «Cuentas», el slot de la administración en `AccountMenu`, las listas, los formularios, `reactionTo` y el doble de la API con sus datos.
- **Cómo queda con F10** lo dice la [spec 024](../024-f10-shell/spec.md): `#administracion`, sin la sección en la URL (F10-Q4).
- **El código del front que ya existe** es el de `master` (`bb480677`) y, para el cliente de la API, la sesión, los formularios y el doble de la API, la implementación de F11a, fuera de `master`: `f11a/base`, `a7b3c71d`.

Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) (aceptado), el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (en propuesta), la spec de C3b ([010](../010-c3b-admin-ciclo-de-vida/spec.md), con su [contrato](../010-c3b-admin-ciclo-de-vida/contracts/http.md)), la de B2 ([005](../005-b2-api-ejecuciones/spec.md)) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** C5 le da al admin, por la API, las cifras de uso del taller: qué se ejecuta, qué se resuelve, cuánta ayuda se pide, quién no viene y si el sandbox alcanza. Todo sin el código ni los textos del alumno, con un límite de privacidad que se prueba en el servidor. Pero una API con sesión, CSRF y `X-Taller-User` no se usa con `curl` en una clase. F14 es lo que quien administra (y muchas veces enseña) ve en la administración del taller:

- **el uso del taller de un vistazo:** cuántos alumnos ejecutaron y cuánto resolvieron en un período, con su serie por día, semana o mes;
- **cómo le va a cada ejercicio:** cuántos lo empezaron y lo resolvieron, con qué resultado fallan, qué prueba falla más, cuánta ayuda se pidió y qué distractor de la predicción engaña; lo mismo por catálogo, mundo de la campaña, taller de Sistemas y paso del recorrido;
- **a quién mirar:** la lista de alumnos con su última actividad, para encontrar a los que se trabaron o no vienen;
- **una cuenta:** su avance, su actividad y sus cuotas, ejercicio por ejercicio, sin un solo texto suyo;
- **el sandbox:** la cola y las ejecuciones de los últimos 14 días.

La interfaz no agrega privacidad que la API no tenga, pero tampoco la resta: no deduce, no cruza ni muestra nada que C5 oculte, no guarda lo que ve y no pide el uso de una cuenta sin que el admin lo abra, porque cada consulta queda registrada.

Es para quien administra el taller, para quien opera el sandbox y para quien mantiene el currículo. Indirectamente, también es para el alumno, que tiene que poder confiar en el límite. El resto del taller no cambia: ni el aspecto, ni el comportamiento, ni el progreso guardado, ni las URL. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Un admin abre «Uso del taller» y, en menos de un minuto, sabe cuántos alumnos ejecutaron esta semana, cuánto resolvieron (en el servidor e importado) y cómo vino la semana, día por día.
2. Quien mantiene el currículo ordena los ejercicios por los menos resueltos, abre uno y ve qué prueba falla más y qué opción de la predicción se elige, sin saber quién la eligió.
3. Quien enseña filtra a los alumnos sin actividad desde una fecha, abre uno y ve en qué ejercicios lleva intentos sin resolver.
4. Ninguna pantalla muestra, deduce ni guarda lo que C5 no expone. Cada consulta de una cuenta sale una sola vez, por una acción del admin.
5. Cada cifra dice de dónde sale («estado actual» o «historia») y cada tasa lleva su `n`. Lo resuelto en el servidor y lo importado nunca aparecen sumados sin desglose, y nada se llama «verificado».
6. Cada gráfico tiene al lado su tabla con las mismas cifras. Todo se completa con el teclado, a 320 px y sin animaciones.
7. La red E2E vigente pasa sin editarse (salvo lo que decida Q1), `dist/index.html` sigue bajo 1 500 000 caracteres y F14 no suma dependencias (salvo lo que decida Q2).

**Entra:**

- **La sección «Uso del taller»** en la administración de F12a, con cuatro vistas: «Resumen», «Ejercicios», «Alumnos» y «Ejecuciones».
- **El período** (desde, hasta y la agrupación por día, semana o mes), compartido por el resumen, los ejercicios y el detalle de una cuenta.
- **El resumen** con sus cifras y su serie (`GET /api/admin/stats/overview`).
- **Los ejercicios:** los catálogos, los ejercicios con su detalle (pruebas, predicción, autoevaluación y pistas), los mundos, los talleres de Sistemas y el recorrido (`GET /api/admin/stats/exercises`).
- **Los alumnos:** la lista paginada con búsqueda, el filtro «sin actividad desde» y sus órdenes (`GET /api/admin/stats/students`).
- **El detalle de una cuenta,** desde «Alumnos» y desde «Cuentas» (`GET /api/admin/stats/students/{user}`), con un acceso a sus ejecuciones.
- **La operación:** la cola (`GET /api/admin/queue`) y la lista de ejecuciones con sus filtros y su cursor (`GET /api/admin/runs`).
- **Los gráficos** de las series y las barras de las proporciones, con su alternativa en texto.
- **Las pruebas:** specs de Vitest con Testing Library y fishery; E2E con un Page Object sobre el doble de la API de F11a; la documentación que cambia con ellas, `docs/architecture.md` y `qa/AGENTS.md`.

**Queda fuera:**

- **La API:** es de C5. F14 no cambia ningún contrato, y lo que le falte a uno queda como hallazgo («Relación con otros ítems»).
- **La ficha con su resumen** (`usage` de `GET /api/admin/users/{user}`): el detalle ya trae la cuenta y sus cifras, y pedir las dos dejaría dos líneas de registro por consulta (lectura L2).
- **Cualquier exportación:** ni CSV, ni descarga, ni «copiar las cifras», ni una vista preparada para imprimir (ADR 0006 D33; spec de C5, «Queda fuera»).
- **Los textos del alumno para tutoría:** serían un ítem nuevo con consentimiento propio (spec de C5, Q1-C).
- **Contar los rechazos** de `/api/runs` (429 y 503): no dejan filas en B2, y la pantalla sólo lo dice.
- **Lo de F12a y F12b:** las cuentas, las invitaciones, sus acciones y el correo. F14 suma una columna a la tabla de «Cuentas» (Q1) y nada más.
- **La ruta enlazable:** es de F10 (F10-Q4). F14 no agrega ninguna forma de URL.
- **Cambiar una vista legacy o `frontend/app.js`.**

**Sin hacer a propósito (YAGNI):**

- **Comparar períodos o calcular tendencias en el cliente** («+12 % contra la semana pasada»): C5 tampoco lo hace, y la serie ya lo muestra.
- **Refresco automático** de la cola o de cualquier vista: «Actualizar» alcanza, y el límite es de 120 pedidos por minuto por admin.
- **Ordenar la lista de alumnos por una métrica:** la API no lo ofrece (calcula sólo la página), y ordenar 25 filas en el cliente parecería un orden de todo el taller.
- **Una caché en el cliente:** los agregados ya tienen la de 10 minutos del servidor, y lo de una cuenta no se guarda en ningún lado.
- **Atajos de período** («últimos 7 días», «este mes»): el período por omisión de la API son los últimos 30 días, y dos fechas cubren el resto.
- **Zoom, desplazamiento por arrastre o globos sobre los gráficos:** cada cifra está en la tabla.
- **Filtros por aula o por grupo,** que el taller no modela; **alertas** de inactividad.
- **Una librería de gráficos, de tablas o de animación** (salvo lo que decida Q2), un store compartido o nuqs.

**Actores:**

- **Quien administra** (rol `admin`), que muchas veces también enseña.
- **Quien opera el sandbox** y **quien mantiene el currículo,** que también son admins.
- **El alumno,** cuyos datos se leen y que tiene que poder confiar en el límite.
- **Los ítems que F14 usa:** C5 (la API), F12a (la administración), F11a (el cliente, la sesión, los formularios y el doble de la API) y F10 (que muda la administración a `#administracion`).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions), una lectura de esta spec o una pregunta abierta.

| Pedido | Fuente |
| --- | --- |
| Las pantallas de C5 son un ítem nuevo del front, **F14**: una sección más de `pages/admin` («Uso del taller») con el resumen, los ejercicios y la cola; el detalle de una cuenta desde la lista de «Cuentas»; sus specs y sus E2E. Depende de F12a y de C5 | Usuario, clarify de C5 del 2026-10-28 (Q4-A) |
| F14 dibuja también las ejecuciones, los catálogos, los mundos, los talleres de Sistemas y el recorrido, y con F10 queda bajo `#administracion`. No es un port | Spec de C5, «Hallazgos para las hojas de ruta», 1 |
| El admin ve métricas, también por cuenta, sin textos, sin huellas, sin la opción elegida por cuenta y sin umbral de agregación: cada tasa lleva su `n`, y la pantalla decide cómo marcar una muestra chica | Usuario, clarify de C5 (Q1-A); spec de C5, «Por qué no hay umbral de agregación» |
| La lista de alumnos con su uso es paginada y calcula las cifras sólo para la página: no se ordena por ellas | Usuario, clarify de C5 (Q2-A); contrato de C5, §5 |
| Cada consulta con éxito del detalle de una cuenta, de su ficha y de las ejecuciones filtradas por ella deja una línea de registro | Usuario, clarify de C5 (Q3-A) |
| Los agregados cuentan a los alumnos con el rol `student` y estado `active` o `disabled`, sin admins ni cuentas en supresión | Usuario, clarify de C5 (Q5-A) |
| La pantalla tiene que poder explicar tres cosas: «resuelto» no es «aprobado», el pasado cambia (supresiones, resets y la caché de 10 minutos) y hasta A4 y D1c casi no hay datos | Spec de C5, «De dónde salen los datos» |
| Lo resuelto se separa siempre en «ejecutado en el servidor» e «importado», y nada se llama «verificado» | Spec de C5, FR-018 y FR-019 |
| Ninguna exportación de admin: el admin ve en pantalla | ADR 0006 D33; spec de C5, «Queda fuera» |
| La administración se abre hoy como un diálogo a pantalla completa desde «Tu cuenta», y F10 la vuelve la ruta `#administracion`, sin la sección en la URL, que abre en «Cuentas» | Usuario, clarify del 2026-10-28 (F12-Q1 y F10-Q4) |
| La página de la administración está separada de su contenedor, el Page Object la abre desde un solo método, nada se guarda fuera de la memoria, no hay estilos en línea ni dependencias de runtime nuevas | Spec de F12, FR-008, FR-054, FR-056, FR-062 y FR-063 |
| Los formularios usan React Hook Form, que instala F11a | Usuario, 2026-10-06; hoja de ruta del front, F11 |
| El tope de `dist/index.html` es de 1 500 000 caracteres | Usuario, 2026-10-28: PR #76 (`qa/build-check.ts`, `BOOT_SIZE_LIMIT`) |
| Las E2E de error declaran cada falla con `/status of NNN/` y un pedido abortado con `/net::ERR_FAILED/`; el doble de la API canónico es el de F11a, que busca la ruta antes del CSRF y guarda la query en `ApiCall.search` | Coordinador, decisiones del 2026-10-28 (noche) |
| Vitest con Testing Library y fishery para la lógica y los componentes, y Playwright con Page Objects para los E2E, sin tocar servicios públicos | ADR 0008; constitución, principio II |
| TDD; código y pruebas en inglés; interfaz en español rioplatense; teclado, celular y movimiento reducido | `AGENTS.md`; constitución, principios II, III y VI |
| La spec deja claras las vistas (el resumen con sus series, los ejercicios y catálogos, la lista de alumnos y el detalle con su grilla), los gráficos (sin librerías, o con una pedida con permiso, nombre, versión, peso y licencia), la privacidad en la interfaz, la accesibilidad, el rendimiento y el tope del HTML, con como mucho cinco preguntas para el clarify | Coordinador, 2026-10-28 (el encargo) |

## Preguntas abiertas para el clarify

Son cuatro preguntas y la partición, cada una con sus opciones, una recomendada, su motivo y su costo. Se cierran en `/speckit-clarify`, y las respuestas pasan a una sección Clarifications.

- **Los marcadores.** Cada pregunta deja un `[NEEDS CLARIFICATION]` donde decide algo, y ésos son los únicos: Q1 en FR-028 y FR-061, Q2 en FR-045 y FR-056, Q3 en FR-041 y FR-042, Q4 en «Dependencias reales» y P1 en «La partición propuesta».
- **Hasta el clarify,** lo que depende de una pregunta usa como borrador la opción recomendada.
- **Las lecturas** de la sección siguiente no son preguntas: el usuario las corrige si no está de acuerdo.

### Q1. Cómo se llega al detalle de una cuenta desde «Cuentas»

**Contexto.** La decisión Q4-A de C5 pone el detalle «desde la lista de «Cuentas»». El detalle responde para cualquier cuenta que no esté en supresión, de cualquier rol, también la propia (spec de C5, FR-017). Pero F12a fija cuántos botones tiene cada fila de «Cuentas», y F14 no puede sumar uno sin romper esas pruebas:

- la spec de componente de «Cuentas» espera 0 botones en la fila propia y en la que se está borrando, y exactamente «Deshabilitar», «Hacer admin» y «Borrar la cuenta» en la de Ana (plan de F12a enmendado, T015, «marks the own account and offers nothing on it nor on one being deleted»);
- el E2E de las cuentas espera `toHaveCount(0)` en esas dos filas y `toHaveCount(3)` en la de Ana (T022, `admin-accounts.spec.ts`);
- FR-015 de F12a dice que la propia cuenta no ofrece ninguna acción;
- F12b suma una cuarta acción a las filas de alumnos activos («Mandarle un enlace para elegir contraseña», un lugar más de `ACTION_SLOTS`).

Cuando F14 llegue, esas pruebas ya son parte de la red. (FR-028 y FR-061)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Una columna «Uso»** con «Ver el uso de {nombre}» en cada fila, salvo las que se están borrando, también la propia. Va fuera de «Acciones», y `ACTION_SLOTS` no cambia. Las pruebas de F12a que cuentan los botones de la fila pasan a contarlos dentro de la celda «Acciones» | «Ver el uso» no es una acción sobre la cuenta, así que FR-015 de F12a sigue siendo cierto y F12b suma su acción sin chocar. **Costo:** si F12a todavía no se implementó, un ajuste a su plan antes de empezar (T015 y T022), sin costo; si ya entró, F14 edita esas tres aserciones en un commit propio con TDD, y esta respuesta es la aprobación |
| B | **Sin entrada desde «Cuentas».** El detalle se abre sólo desde «Uso del taller» → «Alumnos» | 0 cambios a F12a. **Costo:** contradice el texto de Q4-A; el detalle de un admin (que también estudia) no se puede abrir, porque «Alumnos» lista sólo la población; y quien gestiona una cuenta tiene que buscarla otra vez en otra lista |
| C | **Una cuarta acción en «Acciones»,** con su lugar en `ACTION_SLOTS` | **Costo:** cambia FR-015 de F12a (la fila propia ofrecería algo), choca con el cuarto lugar que suma F12b y edita las mismas pruebas que A |
| Otra | Decir cómo | |

**Recomendada: A.** Cumple Q4-A sin cambiar el significado de «Acciones», y el costo es nulo si se corrige el plan de F12a antes de implementarlo (hallazgo para el coordinador).

### Q2. Con qué se dibujan los gráficos

**Contexto.** F14 necesita dos formas: barras por intervalo para las series (el resumen y la actividad de una cuenta, hasta 366 intervalos) y barras sueltas para una proporción o una distribución (lo resuelto de un catálogo, las opciones de una predicción, las cuotas). El taller ya dibuja proporciones con `<progress>` y `<meter>` nativos (`frontend/campaign.js:89`, `frontend/systems.js:104`, `frontend/quest-explorers.js:44` y `frontend/src/index.html:27`) y figuras con SVG y `role="img"` (`frontend/systems.js:210`). F12a prohíbe estilos en línea (su FR-054), así que una barra no puede medirse con `style`: en SVG, el ancho y el alto son atributos de geometría, no estilos. El código de F14 viaja a todos los alumnos dentro de `dist/index.html` hasta que C4 retire `vite-plugin-singlefile`. (FR-045 y FR-056)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Sin librería:** barras en SVG propio, con atributos de geometría y colores por clases de la hoja, y `<meter>` o `<progress>` nativos para las proporciones. Cada gráfico tiene su tabla al lado | Sin permiso, sin peso de terceros y sin canvas: el SVG es DOM, se prueba con Testing Library y no pide estilos en línea. **Costo:** el código y las pruebas de dos componentes de barras (una parte del subpresupuesto de FR-057), y nada de zoom ni globos |
| B | **uPlot 1.6.32** para las series (MIT, sin dependencias; `dist/uPlot.iife.min.js` pesa 51 081 bytes y `uPlot.min.css`, 1 857, según los metadatos de jsDelivr, no una medida del bundle), con `<meter>` para lo demás | Series rápidas con zoom y cursor. **Costo:** unos 53 000 caracteres más en el HTML, más que todo el subpresupuesto de F14; dibuja en canvas, así que la alternativa en texto es igual de necesaria; escribe estilos con el CSSOM, que C4 tiene que contrastar con su CSP; una descarga con permiso |
| C | **Chart.js 4.6.1** (MIT, con la dependencia `@kurkle/color`; `dist/chart.umd.min.js` pesa 210 082 bytes según jsDelivr, menos si el bundle descarta lo que no usa) | La librería más conocida. **Costo:** se come buena parte del margen que queda bajo el tope; canvas; dos paquetes con permiso |
| D | **Sólo tablas y `<meter>`,** sin gráficos de series | Lo más liviano. **Costo:** «cómo vino la semana» se lee en una tabla de 7 a 366 filas |
| Otra | Decir cuál | |

**Recomendada: A.** Las formas que hacen falta son barras, el taller ya las tiene nativas, y una librería pesaría más que todo F14 sin dar nada que la tabla no tenga.

### Q3. Qué hace la pantalla con las muestras chicas

**Contexto.** C5 no tiene umbral de agregación (Q1-A): cada tasa sale con su `n`, y «la pantalla decide cómo marcar una muestra chica». Hay además un cruce que C5 no cerró. Hoy todas las preguntas tienen tres opciones (las 274 predicciones de ejercicios, las 25 de los talleres, los 8 checkpoints y las 24 preguntas del recorrido, contadas en `content/`). Por cuenta, el detalle dice si respondió y si acertó, y el contenido dice cuál es la correcta: de quien acertó, la pantalla ya muestra qué eligió, y C5 lo aceptó (sus banderas de acierto, Q1-A). Lo que Q1-A oculta es cuál de las dos opciones equivocadas eligió quien no acertó. Pero la distribución de los agregados lo dice cuando hay pocas respuestas: si un solo alumno respondió mal, la distribución dice qué eligió, y el detalle dice quién fue. La consigna de esta spec es que la interfaz no muestre ni deduzca lo que la API oculta. (FR-041 y FR-042)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Marcar y, en las opciones, ocultar.** Toda tasa muestra su numerador y su `n` («3 de 4»). Con `n` menor que 5 lleva la marca «Muestra chica» y no se dibuja su barra. Una distribución de opciones con menos de 5 respuestas no se muestra: se dice cuántas hubo. Va como hallazgo para C5, que puede aplicar el mismo corte en la API | Nada se presenta como tendencia con dos casos, y con menos de 5 respuestas la pantalla deja de decir qué opción equivocada eligió una cuenta. **Costo:** con un aula chica, varias distribuciones quedan ocultas al principio. El cruce no se cierra del todo: con 5 o más respuestas, si todos los que no acertaron eligieron la misma opción, la distribución sigue diciendo cuál eligió cada uno (riesgo 2), y la API sigue mandando el dato. La opción de quien acertó sigue a la vista, como decidió C5 |
| B | **Sólo marcar:** el `n` siempre y la marca «Muestra chica» con `n` menor que 5, sin ocultar nada | Lo que decidió C5, tal cual. **Costo:** con pocas respuestas, la pantalla muestra qué opción equivocada eligió una cuenta identificable |
| C | **Ocultar todo lo chico:** con `n` menor que 5 no se muestra ninguna tasa ni distribución, sólo los conteos | Lo más prudente. **Costo:** con una clase de 20 y 274 ejercicios, la mayoría de las tasas por ejercicio quedan ocultas, y el admin igual las puede contar abriendo cada cuenta |
| D | **Ni marcar ni ocultar:** el `n` y nada más | Lo más simple. **Costo:** dos casos se leen como tendencia, y queda el cruce de arriba |
| Otra | Decir el umbral o la regla | |

**Recomendada: A.** Respeta la decisión de C5 (sin umbral para las cifras) y sólo oculta lo que, con pocas respuestas, mostraría justo lo que C5 decidió no mostrar por cuenta.

### Q4. ¿F14 espera a que haya datos reales (A4 y D1c)?

**Contexto.** Hoy ningún cliente usa `/api/runs` (A4) ni `/api/sync` (D1c), así que las tablas de producción casi no tienen intentos ni progreso. La spec de C5 lo dice («Hasta A4 y D1c, casi no hay datos») y sugiere que el ítem del front puede esperarlos para que su primera pantalla tenga algo que mostrar. F14 depende de F12a (que espera a F11a) y de C5. Sus pruebas usan el doble de la API, no datos reales. (Marcador en «Dependencias reales»)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **No espera:** F14 se planifica con F12a y el contrato de C5, y se integra con F12a y C5 en `master`. Hasta A4 y D1c, las vistas muestran sus estados vacíos, que explican por qué | Las pantallas están cuando lleguen los datos, y los estados vacíos hacen falta igual. **Costo:** las escalas, los anchos y los órdenes se eligen con datos de prueba; una revisión manual con datos armados en el stack local antes del PR lo mitiga (acción del usuario) |
| B | **Espera a A4 y D1c** para planificarse o integrarse | El diseño se valida con datos reales. **Costo:** F14 queda detrás del tramo de A4 y D1c, sin ninguna razón de código |
| C | **Se planifica e implementa, y su PR a `master` espera a A4** (los intentos), no a D1c | Una vista real del resumen y de los ejercicios antes de integrar. **Costo:** un PR terminado que espera; la mitad que sale de D1c (lo resuelto, la campaña, el recorrido) sigue casi vacía |
| Otra | Decir cuándo | |

**Recomendada: A.** Nada del código de F14 cambia con los datos, y su red no los usa.

### P1. ¿Se parte F14?

La spec tiene 62 requisitos, contra los 52 de C3a. El detalle del conteo y del corte está en «La partición propuesta». (Marcador en esa sección)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | **Dos partes por la frontera de los datos personales:** F14a, los agregados y la operación (la sección, el período, el resumen, los ejercicios, la cola y las ejecuciones, 49 requisitos con los transversales); F14b, lo que es de una cuenta (la lista de alumnos, el detalle, la entrada desde «Cuentas» y sus ejecuciones, 38) | F14a no muestra un solo dato de una cuenta, y F14b concentra lo que deja líneas de registro, el cruce de Q3 y el cambio a F12a de Q1. **Costo:** otro ciclo de plan y tareas; F14b espera a F14a |
| B | **Dos partes por el público:** F14a, el uso (el resumen, los ejercicios, los alumnos y el detalle); F14b, la operación (la cola y las ejecuciones) | Las cuatro vistas del encargo juntas. **Costo:** F14a queda en unos 57 requisitos, todavía por encima del tope, y F14b es un ciclo entero para cinco |
| C | **No partir** | Un solo plan y un solo PR. **Costo:** 62 requisitos, como los 63 de F12 y por debajo de los 64 de F11a, que el usuario aceptó |
| Otra | Decir cuál | |

**Recomendada: A.** Es el corte que deja una primera parte sin datos personales ni cambios a F12a, y las dos quedan bajo el tope.

## Lecturas de esta spec

No son decisiones nuevas: es cómo esta spec aplica reglas generales o lee una fuente, y el usuario puede corregirlas.

- **L1. El detalle es una subvista, no un diálogo.** El detalle de una cuenta y el de un ejercicio ocupan el lugar de la vista dentro de la página, que queda montada y oculta, con «Volver» y el foco devuelto al botón que los abrió. Las ejecuciones de una cuenta se ven dentro de su detalle, sin cambiar de vista. Un diálogo sobre la administración, con una grilla de cientos de filas, sumaría un modal dentro de otro, y F12a deja uno solo a la vez (su FR-005). Como subvista funciona igual en el diálogo de hoy y bajo `#administracion` (F10), sin URL.
- **L2. F14 no usa la ficha.** `GET /api/admin/users/{user}` con `usage` resume lo que el detalle ya trae entero, y pedir los dos dejaría dos líneas de registro (`view: summary` y `view: detail`) por cada vez que el admin mira una cuenta.
- **L3. El período no se calcula en el navegador.** El primer pedido sale sin `from` ni `to`, y el formulario se llena con `meta.period` de la respuesta: «hoy» en el navegador puede ser otro día que en la zona del taller. El período elegido se comparte entre «Resumen», «Ejercicios» y el detalle mientras la administración siga abierta.
- **L4. «Sin actividad desde» es una fecha que elige el admin,** no un atajo «hace 14 días», por la misma razón que L3.
- **L5. La cola se actualiza a pedido.** «Actualizar» vuelve a pedirla y dice a qué hora. Un refresco automático gasta el límite de 120 pedidos por minuto y no cambia lo que el admin puede hacer.
- **L6. Los títulos salen del contenido del front.** El nombre de un ejercicio, un mundo, un taller o un paso del recorrido, y el texto de cada opción, salen del contenido que el front ya cargó, como permite la spec de C5. Si no está (un ejercicio retirado, un catálogo que el front no tiene), se muestra el id, o «Opción {n}».
- **L7. Ordenar en el cliente, sólo lo que llega entero.** La tabla de ejercicios llega completa en una respuesta, así que se puede ordenar en el cliente sin pedir nada. La lista de alumnos llega paginada: sólo usa los órdenes de la API.
- **L8. El detalle avisa que la consulta queda registrada.** Es una línea de texto, y es lo que dice el aviso de privacidad que escribe el usuario (spec de C5, hallazgo 7).
- **L9. Dos zonas horarias.** Las fechas de un período (`start`, `from` y `to`) son fechas de la zona del taller y se muestran tal como llegan. Los instantes (`lastActivityAt`, `createdAt`, `generatedAt`) se muestran en la zona del navegador, como en F12a.
- **L10. Dónde abre cada cosa.** La administración sigue abriendo en «Cuentas» (F12a, F10-Q4), y «Uso del taller» abre en «Resumen».

## Dependencias reales

- **F12a, entera e integrada.** F14 vive dentro de su página:
  - `AdminPage`, con su grupo de secciones, al que F14 suma una tercera;
  - la tabla de «Cuentas», a la que suma la columna «Uso» (Q1);
  - las listas paginadas (`usePagedList`, `ListView` y la paginación), el aviso de falla y `reactionTo`;
  - la hoja `admin.css`, con la región que se desplaza;
  - el Page Object de la administración, con su único método de apertura, y los datos de su contrato.

  F14 empieza sobre F12a ya integrada, como F12a sobre F11a: con sus nombres reales, que el plan contrasta.
- **C5.** F14 se planifica sobre su contrato (PR #86) y sus pruebas no lo necesitan implementado, porque usan el doble. Pero F14 llega a `master` después que C5: sin C5, cada vista mostraría el error de un 404.
- **F11a:** el cliente de la API (CSRF, `X-Taller-User`, 401, 409, 419 y `Retry-After`), la sesión con el rol, «pedir el ingreso», React Hook Form, `formatLocalDateTime` y el doble de la API de los E2E.
- **A4 y D1c:** no son dependencias de código, pero son los que llenan las tablas. Si F14 los espera lo decide Q4. **[NEEDS CLARIFICATION: Q4, ¿F14 espera a A4 y D1c? Borrador: no espera (A)]**
- **F10:** no es una dependencia. Si F10 llega antes que F14, la sección nace bajo `#administracion`; si llega después, la muda con el resto de la página sin cambiarla (su FR-043).
- **E1:** tampoco. Un catálogo o un nivel nuevo aparece en los filtros sin cambiar código, porque los catálogos salen de la API y los nombres de los niveles, de la configuración del front.

## Dónde vive

- **En la administración de F12a.** «Uso del taller» es la tercera sección de `AdminPage`, después de «Cuentas» e «Invitaciones», con el mismo patrón de botones que F12a (un grupo con nombre y `aria-pressed`). Vive en el slice `pages/admin`, no en uno propio: es parte de la misma página, y dos páginas no se importan entre sí. Los nombres de módulos los fija el plan.
- **El tipo de la sección.** La sección que recibe la página suma un tercer valor. Es un cambio al contrato de F12a (`contracts/admin-page.md`), que F14 hace en el mismo commit.
- **El detalle y su lista de origen.** Mientras se ve el detalle de una cuenta, la lista de la que salió sigue montada y oculta, para conservar su página, su búsqueda, sus filtros y el botón que lo abrió (FR-029). En el plan de F12a, ese estado vive dentro de la sección de «Cuentas» (`usePagedList`): F14 la cambia para que pueda dibujar el detalle sin desmontar la lista, en lugar de subir su estado a la página. Mientras se ve el detalle, el botón marcado es el de origen: «Cuentas», o «Uso del taller» con «Alumnos». Cambiar de sección o de vista descarta el detalle, como F12a descarta la sección que deja.
- **Lo que no cambia de F12a:** el contenedor, su entrada en «Tu cuenta», las dos props de la página, el método de apertura del Page Object, las acciones, `ACTION_SLOTS` y la sección de «Invitaciones».
- **Con F10.** La sección y la vista elegidas siguen fuera de la URL, como la sección de F12a (F10-Q4, su FR-041): `#administracion` abre en «Cuentas», y la URL nunca lleva una cuenta, una búsqueda ni un filtro.

## Las vistas

Cada vista pide su ruta al mostrarse, y no antes. Las cifras y sus formas son las del contrato de C5; la tabla dice qué dibuja F14 con ellas.

| Vista | Pedido | Qué muestra | Gráfico |
| --- | --- | --- | --- |
| **Resumen** | `GET /api/admin/stats/overview` con el período | Las cuentas por rol y estado; los alumnos activos en 24 horas, 7 y 30 días y los que nunca tuvieron actividad; las invitaciones; los que hicieron «Borrar todo»; los totales del período; la serie | Dos series de barras: los intentos por resultado y los alumnos que ejecutaron, con la tabla de la serie |
| **Ejercicios** | `GET /api/admin/stats/exercises` con el período y los filtros | Los catálogos, los ejercicios (ordenables en el cliente), los mundos, los talleres de Sistemas y el recorrido | Barras de proporción en las tablas (lo resuelto de un catálogo) |
| **Detalle de un ejercicio** | Ninguno: usa la respuesta de «Ejercicios» | Sus pruebas, la distribución de la predicción, la autoevaluación y las pistas reveladas | Barras de distribución, con su tabla |
| **Alumnos** | `GET /api/admin/stats/students` con la página, la búsqueda, el filtro y el orden | La lista paginada de la población, con la última actividad, lo resuelto, los intentos de 7 y 30 días y el último intento | Ninguno |
| **Detalle de una cuenta** | `GET /api/admin/stats/students/{user}` con el período y, con «Ver sus ejecuciones», `GET /api/admin/runs` con `user` | La cuenta, su progreso, sus importaciones, lo resuelto por catálogo, sus intentos, su actividad, sus cuotas, la grilla por ejercicio, la campaña, los talleres y el recorrido | La serie de la actividad, con su tabla; las cuotas con `<meter>` |
| **Ejecuciones** | `GET /api/admin/queue` y `GET /api/admin/runs` con sus filtros y el cursor | La cola (ahora y las últimas 24 horas) y la lista de ejecuciones de los últimos 14 días | Ninguno |

**Lo que la pantalla explica.** La spec de C5 pide que la pantalla pueda explicar tres consecuencias de calcular en vivo sobre lo que B2 y D1 guardan:

1. **«Resuelto» no es «aprobado».** Lo resuelto es el estado actual de cada alumno; un intento aprobado es historia. Después de un «Borrar todo», un alumno puede tener intentos aprobados y ningún ejercicio resuelto.
2. **El pasado cambia.** Una supresión saca a la cuenta de todos los períodos, un «Borrar todo» saca sus resueltos, y la caché tarda hasta 10 minutos en mostrarlo.
3. **Hasta A4 y D1c casi no hay datos.** Los estados vacíos dicen por qué.

Por eso cada cifra lleva su fuente, «Estado actual» o «Historia», y cada vista de agregados dice quiénes cuentan y cuándo se calculó.

## La privacidad en la interfaz

La API ya decide qué sale (spec de C5, «El límite de privacidad»). La interfaz no lo amplía:

| La interfaz nunca | Por qué | Requisito |
| --- | --- | --- |
| Muestra la opción que eligió una cuenta, ni pone una distribución de opciones junto a una cuenta | Por cuenta sale sólo si acertó o si respondió (Q1-A de C5). De quien acertó, el acierto ya dice la opción, y C5 lo aceptó; lo oculto es cuál de las equivocadas eligió quien no acertó | FR-039 y FR-042 |
| Dice si un texto del alumno existe o cuánto mide | La API no lo manda (FR-008 de C5), y la pantalla no lo deduce de nada | FR-039 |
| Pone una cuenta al lado de un agregado («va por debajo de la mediana») | Es una comparación entre cuentas que la API no hace | FR-039 |
| Ordena o filtra una página de alumnos por una métrica | Parecería un orden de todo el taller, y sólo ordena una página | FR-039 |
| Llama «verificado» a lo ejecutado en el servidor, o suma lo importado sin el desglose | FR-018 y FR-019 de C5 | FR-040 |
| Guarda o escribe nombres, emails, ids o cifras fuera de la memoria de la vista | FR-008 de F12a | FR-038 |
| Exporta, descarga o copia las cifras | ADR 0006 D33 | FR-043 |
| Pide el uso de una cuenta sin que el admin lo abra | Cada consulta queda registrada con el admin que la hizo (Q3-A de C5) | FR-030 y FR-044 |

Con pocas respuestas, una distribución de opciones puede decir qué opción equivocada eligió una cuenta. Qué hace la pantalla lo decide Q3.

## Los gráficos

Los requisitos son FR-045 a FR-048; con qué se dibujan lo decide Q2. El borrador (Q2-A):

- **La tabla manda.** Cada gráfico es una vista de una tabla que está siempre en la página, con las mismas cifras. El gráfico tiene un resumen en texto visible («En el período hubo 120 intentos; el día con más fue el 12/10, con 30.») y no repite al lector de pantalla lo que ya dice la tabla.
- **Las series** son barras en SVG, una por intervalo, con el alto como atributo de geometría. Los intentos se apilan por resultado, y cada resultado tiene su clase de la hoja, su color con los tokens del taller y su nombre en la leyenda. El color nunca es la única forma de distinguirlos.
- **Las proporciones y las distribuciones** usan `<meter>`, con su valor, su máximo y un nombre accesible, como los del taller.
- **El ancho.** El gráfico ocupa el ancho de su contenedor. Si a ese ancho una barra quedaría por debajo del mínimo que fija el plan, el gráfico se desplaza dentro de su propia región, con nombre y alcanzable con el teclado, como las tablas de F12a.
- **Nada se anima.** No hay transiciones ni entradas animadas, y rige la regla global de movimiento reducido de `frontend/styles.css`.

## Textos que lee quien administra

Son propuestas, para que el usuario las corrija. «(servidor)» marca un mensaje que manda la API y que el front muestra sin cambios.

**La sección y el período**

- El botón de la sección, «Uso del taller», y las vistas: «Resumen», «Ejercicios», «Alumnos» y «Ejecuciones».
- El período: «Desde», «Hasta», «Agrupar por» («Día», «Semana» o «Mes») y el botón «Aplicar».
- Debajo del título de cada vista con período: «Del {d/m/aaaa} al {d/m/aaaa}, por {día|semana|mes}, en la hora de {zona}.».
- Los errores del período: «Elegí las dos fechas.», «La fecha de inicio tiene que ser anterior o igual a la de fin.» y «El período puede tener hasta 366 días.».
- Cuándo se calculó: «Calculado el {fecha y hora}. Las cifras se recalculan cada 10 minutos: una cuenta borrada o un «Borrar todo» pueden tardar ese tiempo en verse.».
- Quiénes cuentan: «Cuentan los alumnos con la cuenta activa o deshabilitada. No cuentan las cuentas de admin ni las que se están borrando.».
- Las fuentes: «Estado actual» e «Historia», con la ayuda «Resuelto es el estado actual de cada alumno; aprobado es un intento que pasó todas sus pruebas. Después de un «Borrar todo», un alumno puede tener intentos aprobados y ningún ejercicio resuelto.».
- Lo resuelto: «en el servidor» e «importado».
- Sin datos: «Todavía no hay intentos en este período. Se registran cuando el laboratorio ejecuta en el servidor y el progreso se sincroniza con la cuenta.».
- Una cifra sin `n`: «—», con el nombre accesible «sin datos».
- Las muestras chicas (Q3-A): la marca «Muestra chica» y, en una distribución, «Menos de 5 respuestas: no mostramos cómo se reparten.».

**Los resultados**

- De un intento: «Aprobado», «No pasó las pruebas», «No compiló», «Error al ejecutar» y «Se pasó de tiempo».
- De operación: «Falla del sandbox» y «Cancelado».
- Lo que llegó del taller anterior: «Importados».
- La autoevaluación, con los textos del laboratorio (`frontend/lab.js:623-625`): «Todavía me cuesta», «Lo entiendo, quiero otra vuelta» y «Puedo explicarlo sin mirar».

**Resumen**

- Los bloques «Cuentas», «Actividad», «Invitaciones» y «En el período».
- «Activos en las últimas 24 horas», «… 7 días», «… 30 días» y «Nunca tuvieron actividad».
- «Pendientes», «Vencidas» y «De admin, pendientes».
- «Hicieron «Borrar todo» alguna vez».
- La nota de la serie: «La serie cuenta sólo a quien ejecutó código: leer, la campaña y el recorrido no dejan intentos.».
- La tabla «La serie, por {día|semana|mes}».

**Ejercicios**

- Los filtros «Catálogo», «Lenguaje» y «Nivel», cada uno con «Todos».
- «Ordenar por»: «Orden del catálogo», «Menos resueltos primero», «Más intentos fallidos primero» y «Más ayuda primero».
- Las tablas «Catálogos», «Ejercicios», «Mundos de la campaña», «Talleres de Sistemas» y «Recorrido».
- Debajo del título de cada tabla, los filtros que la afectan: por ejemplo, «Filtrada por lenguaje y nivel.».
- La marca «Retirado».
- El botón de cada fila, «Ver {título}», y «Volver a Ejercicios».
- En el detalle de un ejercicio: «Pruebas» («Falló» y «No llegó a correr»), «Predicción», «Autoevaluación» y «Pistas reveladas».

**Alumnos**

- La búsqueda «Buscar por nombre o email», con «Buscar».
- El filtro «Sin actividad desde» (una fecha).
- «Ordenar por»: «Nombre», «Última actividad, la más vieja primero», «Última actividad, la más reciente primero» y «Alta, la más nueva primero».
- La tabla «Alumnos», con las columnas «Nombre», «Email», «Estado», «Última actividad», «Resueltos», «Intentos (7 días)», «Intentos (30 días)», «Último intento» y «Uso».
- «Nunca», cuando la última actividad es nula.
- El botón «Ver el uso de {nombre}».
- La paginación: «Página {n} de {m} · {total} alumnos».
- Sin resultados: «No hay alumnos con esa búsqueda o ese filtro.», con «Limpiar los filtros».
- Si no carga: «No pudimos cargar los alumnos.», con «Reintentar».

**Detalle de una cuenta**

- El título «Uso de {nombre}» y «Volver a Cuentas» o «Volver a Alumnos».
- El aviso: «Esta consulta queda registrada: el taller anota qué admin miró el uso de cada cuenta.».
- Los bloques «Progreso», «Importaciones», «Resueltos por catálogo», «Intentos», «Actividad», «Cuotas de las últimas 24 horas», «Ejercicios», «Campaña», «Talleres de Sistemas» y «Recorrido».
- «Hizo «Borrar todo» {n} veces; la última, el {fecha}.» o «Nunca hizo «Borrar todo».».
- La grilla: «Mostrar»: «Todos» o «Sin resolver»; los estados «Resuelto», «Intentado» y «Empezado»; de una pregunta, «Respondió y acertó», «Respondió y no acertó» o «No respondió».
- «Ver sus ejecuciones» y la tabla «Sus ejecuciones de los últimos 14 días».
- Ante un 404: «Esa cuenta ya no existe o se está borrando.».

**Ejecuciones**

- «Ahora»: «En cola», «Corriendo», «Espera más vieja», «Tope de la cola» y «Lugares del sandbox».
- «Últimas 24 horas»: «Terminadas», «Espera hasta empezar (mediana · p95)», «Duración (mediana · p95)» y «Fallas del sandbox, por motivo».
- «Actualizar» y «Actualizada a las {hora}.».
- «No cuenta los pedidos rechazados por la cuota o por la cola llena: no quedan registrados.».
- La tabla «Ejecuciones, de la más nueva a la más vieja», con las columnas «Aceptada», «Cuenta», «Ejercicio», «Lenguaje», «Estado», «Motivo», «Fase», «Código de salida», «Salida cortada», «Compilación», «Ejecución», «Empezó», «Terminó» y «Cancelación pedida».
- Los estados que no son resultados: «En cola» y «Corriendo». Un motivo que la pantalla no conoce se muestra con su código.
- Los filtros «Estado», «Ejercicio» y «Desde».
- La paginación: «Más viejas» y «Volver a las más nuevas».
- «El taller guarda las ejecuciones 14 días: las anteriores ya no existen.».

**Errores**

- Ante un 503 `stats_timeout` o un 429: el mensaje del servidor (servidor), seguido de «Podés volver a intentar en {tiempo}.».
- El resto, los de F12a: el 403 `forbidden` con «Recargar», el mensaje común ante un 5xx, una respuesta que no es JSON o una falla de red, y el ingreso de F11a ante un 401.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el uso del taller de un vistazo (Priority: P1)

Un admin abre «Uso del taller» y ve, para el período que elige, cuántos alumnos ejecutaron, cuántos intentos hubo y con qué resultado, cuánto se resolvió en el servidor y cuánto se importó, y la serie día por día, semana por semana o mes por mes.

**Why this priority**: es la pregunta más común («¿se está usando?, ¿cuánto?») y abre la sección para todo lo demás.

**Independent Test**: con el doble de la API, una sesión de admin y la respuesta del resumen tomada del contrato de C5, abrir la sección, cambiar el período y la agrupación, y comparar cada cifra a la vista con la respuesta.

**Acceptance Scenarios**:

1. **Dado** un admin en la administración, **cuando** usa «Uso del taller», **entonces** la sección queda marcada, se ve «Resumen» y sale un solo `GET /api/admin/stats/overview`, sin `from` ni `to`. El período de la respuesta llena el formulario.
2. **Dada** la respuesta, **cuando** se dibuja, **entonces** se ven las cuentas por rol y estado (las seis combinaciones), los alumnos activos en 24 horas, 7 y 30 días y los que nunca tuvieron actividad, las invitaciones, los que hicieron «Borrar todo» y los totales del período. Lo resuelto está separado en «en el servidor» e «importado», y cada cifra dice su fuente.
3. **Dada** la agrupación «Semana», **cuando** el admin aplica el período, **entonces** sale un pedido con `granularity=week`, la serie tiene una barra por semana, y la tabla de la serie tiene una fila por semana con las mismas cifras.
4. **Dado** un período de 400 días, **cuando** el admin lo aplica, **entonces** el campo «Hasta» dice «El período puede tener hasta 366 días.» y no sale ningún pedido.
5. **Dado** un período sin intentos, **cuando** llega, **entonces** se ve el estado vacío que explica por qué, y ninguna tasa con `n` igual a 0 muestra un número.
6. **Dada** cualquier respuesta, **cuando** se dibuja, **entonces** dice cuándo se calculó, que se recalcula cada 10 minutos y quiénes cuentan.

*Cubre: FR-001 a FR-013.*

---

### User Story 2 - Ver qué ejercicios traban (Priority: P1)

Quien mantiene el currículo (o enseña con él) quiere saber qué ejercicios traban, por qué y dónde. Filtra un catálogo y un lenguaje, ordena por los menos resueltos y abre uno: qué prueba falla más, qué opción de la predicción se elige y cuánta ayuda se pidió.

**Why this priority**: es lo que el taller no tiene hoy, y mejora el contenido para todos.

**Independent Test**: con el doble y una respuesta de `stats/exercises` con dos catálogos, un ejercicio retirado y uno con tres pruebas, filtrar, ordenar, abrir el detalle de un ejercicio y volver.

**Acceptance Scenarios**:

1. **Dado** «Ejercicios», **cuando** el admin elige el catálogo `lab` y el lenguaje Rust, **entonces** sale un solo pedido con `catalog=lab&language=rust` y el período vigente, y la tabla de catálogos y la de ejercicios se dibujan con los títulos del contenido.
2. **Dada** la tabla de ejercicios, **cuando** elige «Menos resueltos primero», **entonces** las filas se reordenan por lo resuelto sobre lo empezado, sin ningún pedido, y un ejercicio que nadie empezó va al final.
3. **Dado** un ejercicio retirado, **cuando** se ve, **entonces** lleva la marca «Retirado» y sus cifras, y si el contenido no lo tiene, su id.
4. **Dado** «Ver {título}» de un ejercicio con tres pruebas, **cuando** se abre, **entonces** se ve la tabla de sus pruebas con qué parte falló y qué parte no llegó a correr, la predicción con el texto de cada opción, la autoevaluación y las pistas, con el foco en su título. «Volver a Ejercicios» devuelve el foco a «Ver {título}».
5. **Dado** el catálogo `essentials` de E1, u otro nuevo, **cuando** la API lo devuelve, **entonces** aparece en el filtro y en las tablas sin cambiar código.
6. **Dados** los mundos, los talleres de Sistemas y el recorrido, **cuando** se ven, **entonces** cada tabla tiene sus cifras, sus títulos del contenido y, en las preguntas, su distribución.

*Cubre: FR-014 a FR-020.*

---

### User Story 3 - Encontrar a los alumnos trabados o inactivos (Priority: P1)

Quien enseña quiere saber quién no viene. Abre «Alumnos», filtra los que no tienen actividad desde una fecha, los ordena por la actividad más vieja y abre uno.

**Why this priority**: es la parte «por cuenta» del pedido y la pregunta más común de quien enseña (Q2 de C5).

**Independent Test**: con el doble, listar alumnos con uno que nunca practicó, filtrar, ordenar, paginar, buscar y abrir el detalle de uno.

**Acceptance Scenarios**:

1. **Dado** «Alumnos», **cuando** se abre, **entonces** sale `GET /api/admin/stats/students` con `page=1` y `perPage=25`, y cada fila trae el nombre, el email, el estado, la última actividad (o «Nunca»), lo resuelto (en el servidor e importado), los intentos de 7 y 30 días y el último intento.
2. **Dado** el filtro «Sin actividad desde» con una fecha y el orden «Última actividad, la más vieja primero», **cuando** se aplican, **entonces** sale un pedido con `inactiveSince` y `sort=lastActivity` en la página 1, y la cuenta que nunca practicó va primera.
3. **Dada** una búsqueda escrita, **cuando** el admin todavía no la envió, **entonces** no sale ningún pedido; al enviarla, sale uno con `q`.
4. **Dada** una fila, **cuando** el admin usa «Ver el uso de {nombre}», **entonces** se abre el detalle de esa cuenta. Antes de esa acción, el navegador no pidió ningún detalle.

*Cubre: FR-025 a FR-027.*

---

### User Story 4 - Seguir a una cuenta (Priority: P2)

Quien enseña abre el uso de un alumno, desde «Alumnos» o desde «Cuentas», y ve qué resolvió, cuántas veces ejecutó, qué ayuda usó, su actividad por día y cuánto le queda de cuota. Si hace falta, mira sus ejecuciones.

**Why this priority**: depende de encontrar a quién mirar (historia 3) y no bloquea los agregados.

**Independent Test**: con el doble, abrir el detalle de una cuenta desde «Cuentas» y desde «Alumnos», cambiar el período, filtrar la grilla, abrir sus ejecuciones, volver, y provocar un 404.

**Acceptance Scenarios**:

1. **Dada** «Cuentas», **cuando** el admin usa «Ver el uso de Ana Pérez» en la columna «Uso», **entonces** sale un solo `GET /api/admin/stats/students/{id}`, se ve «Uso de Ana Pérez» con el foco en el título y el aviso de que la consulta queda registrada, y no sale ningún `GET /api/admin/users/{id}`. La fila de una cuenta que se está borrando no ofrece «Ver el uso».
2. **Dado** el detalle, **cuando** se dibuja, **entonces** se ven la cuenta, su progreso con los «Borrar todo», sus importaciones, lo resuelto por catálogo, sus intentos en el período y en total, su actividad con su tabla, sus cuotas contra sus límites, la grilla por ejercicio, la campaña, los talleres y el recorrido.
3. **Dada** la grilla, **cuando** se ve una pregunta respondida, **entonces** dice si respondió y si acertó, y en ningún lugar del detalle aparece una opción ni una distribución de opciones.
4. **Dado** el detalle, **cuando** el admin cambia el período y lo aplica, **entonces** sale exactamente un pedido más.
5. **Dado** «Volver a Cuentas», **cuando** lo usa, **entonces** vuelve a la lista como estaba, con el foco en «Ver el uso de Ana Pérez».
6. **Dada** una cuenta que pasó a borrarse entre la lista y el detalle, **cuando** el pedido responde 404, **entonces** se ve «Esa cuenta ya no existe o se está borrando.» y «Volver», que vuelve a pedir la lista de origen.
7. **Dado** «Ver sus ejecuciones», **cuando** lo usa, **entonces** aparece dentro del detalle la tabla «Sus ejecuciones de los últimos 14 días», sale un solo `GET /api/admin/runs` con `user`, y «Volver a Cuentas» sigue llevando a la lista.

*Cubre: FR-028 a FR-037.*

---

### User Story 5 - Nunca ver ni deducir lo que la API oculta (Priority: P1)

El alumno confía en que la administración no muestra sus textos, no deduce lo que eligió y no guarda lo que vio. Quien administra no puede, por la pantalla, saber más de una cuenta que lo que C5 decidió mostrar.

**Why this priority**: es la condición del pedido y de la Ley 25.326. Sin esto, F14 no puede entregarse.

**Independent Test**: con el doble, recorrer todas las vistas con datos que incluyan una distribución de una sola respuesta, cerrar la administración y revisar el almacenamiento, la URL, el historial, la consola y los pedidos.

**Acceptance Scenarios**:

1. **Dada** una predicción que respondió un solo alumno, **cuando** se ve su ejercicio, **entonces** no se muestra la distribución de opciones, sino cuántas respuestas hubo (Q3-A).
2. **Dada** una tasa con `n` igual a 3, **cuando** se ve, **entonces** dice «2 de 3», lleva «Muestra chica» y no dibuja su barra (Q3-A).
3. **Dado** el recorrido de todas las vistas, **cuando** se cierra la administración, **entonces** hay 0 nombres, emails, ids o cifras en `localStorage`, `sessionStorage`, `document.cookie`, la URL, el historial y la consola, y la URL no cambió en ningún momento.
4. **Dada** cualquier vista, **cuando** se busca el texto «verificado», **entonces** no aparece, y lo resuelto nunca se muestra sumado sin su desglose.
5. **Dada** la lista de alumnos, **cuando** se ve, **entonces** no hay ninguna forma de ordenarla ni filtrarla por lo resuelto o por los intentos.
6. **Dada** cualquier vista, **cuando** se busca una forma de exportar, descargar o copiar las cifras, **entonces** no existe.
7. **Dada** una sesión de alumno, **cuando** usa el taller, **entonces** el navegador hace 0 pedidos a `/api/admin/stats`, `/api/admin/runs` y `/api/admin/queue`.

*Cubre: FR-038 a FR-044.*

---

### User Story 6 - Mirar la cola y las ejecuciones (Priority: P3)

Quien opera ve si el sandbox alcanza: cuántas ejecuciones esperan y corren contra los lugares configurados, cuánto esperó la más vieja, la espera y la duración típicas, y la lista de las ejecuciones recientes, para seguir un `infra_error`.

**Why this priority**: B2 dejó la cola sin un lugar donde mirarla, pero no es la pregunta de quien enseña.

**Independent Test**: con el doble, abrir «Ejecuciones», actualizar la cola, filtrar la lista por estado y recorrerla con el cursor.

**Acceptance Scenarios**:

1. **Dado** «Ejecuciones», **cuando** se abre, **entonces** salen un `GET /api/admin/queue` y un `GET /api/admin/runs`, y se ven la cola de ahora, la de las últimas 24 horas (con «—» donde un percentil es nulo) y la lista con el aviso de los 14 días.
2. **Dados** cinco minutos con la vista abierta, **cuando** pasan, **entonces** no sale ningún pedido más; con «Actualizar», sale uno a la cola y se ve la hora nueva.
3. **Dada** la lista filtrada por «Falla del sandbox», **cuando** el admin usa «Más viejas», **entonces** sale un pedido con el `nextCursor` de la página anterior y el mismo filtro; con `nextCursor` nulo, «Más viejas» no se ofrece.

*Cubre: FR-021 a FR-024.*

---

### User Story 7 - Usarlo con el teclado, en el celular y con un lector de pantalla (Priority: P2)

Quien administra recorre las vistas sólo con el teclado, desde un celular de 320 px, o con un lector de pantalla, y encuentra las mismas cifras que quien mira los gráficos.

**Why this priority**: es un criterio de todo ítem (constitución, principio VI), y los gráficos y las tablas anchas son lo que más lo pone a prueba.

**Independent Test**: con el doble, recorrer cada historia sólo con el teclado; medir a 320 y a 390 px; emular movimiento reducido; leer el árbol de accesibilidad de un gráfico y de su tabla.

**Acceptance Scenarios**:

1. **Dada** cualquier vista, **cuando** se recorre con Tab, **entonces** el orden sigue el visual, el foco se ve siempre, y las tablas y los gráficos que se desplazan se alcanzan y se desplazan con el teclado.
2. **Dado** un gráfico de la serie, **cuando** se lee su árbol de accesibilidad, **entonces** tiene un resumen en texto y una tabla con título, encabezados de columna y de fila y las mismas cifras, y el lector no oye cada barra.
3. **Dado** un ancho de 320 px, **cuando** se abre cualquier vista, **entonces** la página no se desplaza en horizontal y los campos miden 16 px o más.
4. **Dado** el movimiento reducido, **cuando** se dibuja un gráfico, **entonces** no hay ninguna transición ni animación.

*Cubre: FR-045 a FR-048 y FR-052 a FR-055.*

---

### User Story 8 - Saber qué pasa cuando algo tarda o falla (Priority: P2)

Una consulta tarda, el servidor la corta, el admin pidió demasiado rápido, la sesión venció o la cuenta perdió el rol. La pantalla dice qué pasó y qué hacer, sin perder el período ni los filtros.

**Why this priority**: las estadísticas se calculan en vivo y con un tope de tiempo (C5, FR-036), así que el 503 es un caso previsto, no raro.

**Independent Test**: con el doble, responder 503 `stats_timeout` con `Retry-After`, 429, 422 en el período, 401, 403 `forbidden`, un 502 sin JSON y una falla de red.

**Acceptance Scenarios**:

1. **Dado** un 503 `stats_timeout` con `Retry-After: 30`, **cuando** llega, **entonces** se ve el mensaje del servidor con «Podés volver a intentar en 30 segundos.», «Reintentar» no se habilita antes, y el período y los filtros siguen como estaban.
2. **Dado** un 422 con `errors.to`, **cuando** llega, **entonces** el campo «Hasta» muestra el mensaje del servidor y recibe el foco.
3. **Dado** un 401, **cuando** llega, **entonces** se abre el ingreso de F11a sin cerrar la administración y, si entra la misma cuenta, la vista sigue donde estaba.
4. **Dado** un pedido en curso, **cuando** tarda, **entonces** la vista lo dice, y si ya mostraba cifras, las conserva marcadas como en actualización hasta que llegan las nuevas.

*Cubre: FR-049 a FR-051.*

Los transversales (FR-038 a FR-062) valen para todas las historias. Sus criterios son SC-003 a SC-010.

---

### Edge Cases

- **Un alumno promovido a admin** sale de los agregados y de «Alumnos», también en los períodos pasados (Q5-A de C5), pero su detalle se puede seguir abriendo desde «Cuentas», con el rol «Admin».
- **Un alumno deshabilitado** sigue en los agregados y en «Alumnos», con su estado.
- **Un alumno que nunca practicó** aparece con «Nunca» y en ceros, entra siempre en «Sin actividad desde» y va primero con «Última actividad, la más vieja primero». Su detalle sale con la época 1 y todo en ceros.
- **Una cuenta que pasa a borrarse** entre la lista y el detalle responde 404 (FR-036). Si la cuenta se borró y el resumen estaba en la caché, sigue contando hasta 10 minutos, y la pantalla ya lo dice.
- **«Borrar todo» en el medio:** lo resuelto baja y los intentos aprobados no. Es la ayuda de «Estado actual» e «Historia».
- **Un admin que abre su propio detalle** lo ve como cualquier otro, y también queda registrado.
- **Un ejercicio retirado,** o uno que el contenido del front no tiene, se ve con su id y la marca «Retirado» si la trae.
- **Un catálogo sin alumnos** sale en ceros, y sus tasas, con «—».
- **Una mediana con `.5`** se muestra con la coma decimal («1,5»).
- **366 días por día** dan 366 barras: a 320 px, el gráfico se desplaza en su región, y la tabla de la serie tiene 366 filas.
- **Un período con `from` posterior a `to`,** o de más de 366 días, no sale: lo frena el formulario. Si igual llega un 422, va a su campo.
- **La zona del navegador distinta de la del taller:** las fechas del período no se convierten; los instantes se muestran en la del navegador (L9).
- **Cambiar de vista con un pedido en curso** lo cancela, y su respuesta, si llega, no se dibuja.
- **Pedir muy rápido** (cambiar filtros sin parar) puede llegar al límite de 120 por minuto: un 429 se maneja como en FR-050.
- **Una ejecución en curso** cuenta en la cola, no en los intentos.
- **Las ejecuciones de más de 14 días** no aparecen, y la lista lo dice; con `nextCursor` nulo no hay «Más viejas».
- **Un motivo de `infra_error` que la pantalla no conoce** se muestra con su código.
- **El rol se pierde con la sección abierta:** el siguiente pedido responde 403 `forbidden`, y se ve «Recargar» (F12a, FR-002).
- **La sesión vence en el detalle:** el 401 abre el ingreso; con la misma cuenta, el detalle sigue donde estaba y no se vuelve a pedir solo.
- **Un catálogo o un nivel nuevo** (E1, `essentials`) aparece en los filtros: el catálogo sale de la respuesta y el nombre del nivel, de la configuración de niveles del front.
- **El almacenamiento bloqueado:** F14 no guarda nada en el navegador, así que funciona igual.

## Requirements *(mandatory)*

### Functional Requirements

Mientras P1 siga abierta, ningún requisito lleva marca de parte. El corte que se propone está en «La partición propuesta»: FR-001 a FR-024 serían de F14a, FR-025 a FR-037 de F14b, y FR-038 a FR-062, transversales.

**La sección, las vistas y el período**

- **FR-001**: La administración DEBE ofrecer una tercera sección, «Uso del taller», después de «Cuentas» e «Invitaciones», con el mismo patrón de botones de F12a (un grupo con nombre y `aria-pressed`). Al elegirla, DEBE mostrar «Resumen».
- **FR-002**: La sección DEBE tener cuatro vistas, «Resumen», «Ejercicios», «Alumnos» y «Ejecuciones», elegibles con el teclado y con el mismo patrón. Cambiar de vista NO DEBE recargar, cambiar la URL ni el historial, y el foco DEBE quedarse en el botón usado.
- **FR-003**: La sección DEBE vivir en la página de la administración de F12a y NO DEBE importar nada de «Tu cuenta», de la raíz de la cuenta, de `app/` ni del contenedor. El tipo de la sección suma un tercer valor, y el contrato de F12a se actualiza en el mismo commit. Con F10, la sección y la vista siguen fuera de la URL. *(F12, FR-062; F10, FR-041)*
- **FR-004**: «Resumen», «Ejercicios» y el detalle de una cuenta DEBEN compartir un período, con «Desde», «Hasta» y, donde hay serie, «Agrupar por» (día, semana o mes). El primer pedido DEBE salir sin `from` ni `to`, y el formulario se llena con `meta.period`. El período elegido se conserva al cambiar de vista mientras la administración siga abierta, y se descarta al cerrarla. *(L3)*
- **FR-005**: El formulario del período DEBE armarse con React Hook Form y enviarse sólo con «Aplicar». Antes de pedir, DEBE comprobar que estén las dos fechas, que «Desde» no sea posterior a «Hasta» y que el período no pase de 366 días, con el error en su campo. Un 422 del servidor DEBE llevar `errors.from`, `errors.to` y `errors.granularity` a sus campos, y el resto, al error general. *(F12, FR-055; contrato de C5, §2)*
- **FR-006**: Cada vista con período DEBE decir el período, la agrupación y la zona horaria del taller (`meta.period`). Las fechas del período DEBEN mostrarse como llegan, sin convertirlas, y los instantes, en la zona del navegador con el formato de F11a. *(L9)*
- **FR-007**: Cada vista de agregados DEBE decir cuándo se calcularon sus cifras (`meta.generatedAt`) y que se recalculan cada 10 minutos, así que una cuenta borrada o un «Borrar todo» pueden tardar ese tiempo en verse. *(C5, FR-034)*
- **FR-008**: Cada vista de agregados DEBE decir quiénes cuentan: los alumnos con la cuenta activa o deshabilitada, sin las cuentas de admin ni las que se están borrando. *(Q5-A de C5)*
- **FR-009**: Cada cifra DEBE decir su fuente, «Estado actual» o «Historia», según el contrato de C5, y una ayuda DEBE explicar la diferencia entre resuelto y aprobado y que el pasado cambia con una supresión o un «Borrar todo». *(C5, FR-020)*
- **FR-010**: Sin intentos en el período, cada vista DEBE mostrar un estado vacío que explique por qué. Una tasa con `n` igual a 0 DEBE mostrarse como «—», nunca como 0 % ni como un error. *(C5, FR-011)*

**El resumen**

- **FR-011**: El resumen DEBE mostrar las cuentas por rol y estado (las seis combinaciones, con cero si no hay), los alumnos activos en las últimas 24 horas, 7 y 30 días y los que nunca tuvieron actividad, las invitaciones pendientes, vencidas y de admin, y los alumnos que hicieron «Borrar todo» alguna vez. *(Contrato de C5, §3)*
- **FR-012**: DEBE mostrar los totales del período: los intentos que cuentan por resultado, los de operación aparte, los importados aparte, las primeras resoluciones (en el servidor e importadas), los alumnos nuevos, las importaciones y los alumnos que ejecutaron, aclarando que estos últimos no son la suma de los intervalos.
- **FR-013**: DEBE dibujar la serie del período con dos gráficos (los intentos por intervalo, apilados por resultado, y los alumnos que ejecutaron) y una tabla con todas las cifras de cada intervalo, y decir que la serie cuenta sólo a quien ejecutó código. *(C5, FR-022)*

**Los ejercicios**

- **FR-014**: «Ejercicios» DEBE filtrar por catálogo, lenguaje y nivel, con «Todos» en cada uno. Las opciones de catálogo DEBEN salir de los catálogos que devuelve la API, y los nombres de los niveles, de la configuración de niveles del front. Cada cambio de filtro DEBE pedir una sola vez, con el período vigente. Cada tabla DEBE decir qué filtros la afectan, según el contrato: el catálogo, sólo a los catálogos y los ejercicios; el lenguaje, a todo salvo el recorrido; y el nivel, a los catálogos, los ejercicios, los mundos y los talleres. *(Contrato de C5, §4)*
- **FR-015**: DEBE mostrar la tabla de catálogos (por catálogo, lenguaje y nivel), con los ejercicios activos, los alumnos que empezaron, los que resolvieron al menos uno, la mediana de resueltos y la parte del catálogo resuelta.
- **FR-016**: DEBE mostrar la tabla de ejercicios, con el título y el id, la marca «Retirado», los alumnos que lo empezaron, lo resuelto (en el servidor e importado), los intentos por resultado, los de operación, los importados, la mediana de intentos (entre quienes lo resolvieron y quienes no), el uso de ayuda y el acierto de la predicción con su `n`.
- **FR-017**: La tabla de ejercicios DEBE poder ordenarse en el cliente, sin pedir nada: por el orden del catálogo (por omisión), por los menos resueltos sobre los empezados, por los más intentos fallidos y por la más ayuda. Un ejercicio sin alumnos DEBE ir al final en los órdenes por una tasa. *(L7)*
- **FR-018**: «Ver {título}» DEBE abrir el detalle del ejercicio dentro de la página, con el foco en su título, sin un pedido nuevo: sus pruebas (los veredictos y las partes que fallaron o no llegaron a correr), la distribución de su predicción, la de su autoevaluación y la de sus pistas reveladas. «Volver a Ejercicios» DEBE devolver el foco al botón que lo abrió. *(L1)*
- **FR-019**: DEBE mostrar los mundos de la campaña (ejercicios, filas resueltas, alumnos con sellos y el checkpoint), los talleres de Sistemas por lenguaje (los que empezaron, sellaron el código y acertaron la predicción, y las medianas de etapas y objetivos) y el recorrido (los pasos, hitos y favoritos marcados, y las preguntas con su distribución).
- **FR-020**: Los títulos de los ejercicios, los mundos, los talleres y los pasos, y los textos de las opciones, DEBEN salir del contenido que el front ya cargó. Si no están, DEBE mostrarse el id, o «Opción {n}». *(L6)*

**La operación**

- **FR-021**: «Ejecuciones» DEBE mostrar la cola de ahora (en cola, corriendo, la espera más vieja, el tope y los lugares) y la de las últimas 24 horas (las terminadas, la espera y la duración con su mediana y su p95, y las fallas del sandbox por motivo), y decir que no cuenta los rechazos por cuota ni por cola llena. *(Contrato de C5, §9)*
- **FR-022**: La cola NO DEBE actualizarse sola. «Actualizar» DEBE pedirla otra vez y decir a qué hora llegó. *(L5)*
- **FR-023**: DEBE mostrar la lista de ejecuciones, de la más nueva a la más vieja, con las columnas de la lista cerrada de C5 y el aviso de que el taller las guarda 14 días (`meta.retentionDays`). *(C5, FR-032)*
- **FR-024**: La lista DEBE filtrar por estado, ejercicio y fecha desde, volviendo a la primera página con cada cambio, y paginar con el cursor: «Más viejas» pide con `nextCursor` y «Volver a las más nuevas» vuelve al principio. Sin `nextCursor`, «Más viejas» NO DEBE ofrecerse.

**Por cuenta: la lista y el detalle**

- **FR-025**: «Alumnos» DEBE listar con `GET /api/admin/stats/students`, de a 25, con el nombre, el email, el estado, la última actividad (o «Nunca»), lo resuelto (en el servidor e importado), los intentos de 7 y 30 días y el último intento, y con las reglas de paginación, de lista vacía y de «Reintentar» de F12a. *(Contrato de C5, §5; F12, FR-012 a FR-014)*
- **FR-026**: DEBE buscar por nombre o email (hasta 80 caracteres, sólo al enviar), filtrar por «Sin actividad desde» (una fecha) y ordenar sólo con los órdenes de la API: por nombre, por la última actividad en los dos sentidos y por el alta. Cada cambio DEBE volver a la página 1. *(L4)*
- **FR-027**: Cada fila de «Alumnos» DEBE ofrecer «Ver el uso de {nombre}», que abre el detalle de esa cuenta.
- **FR-028**: Cada fila de «Cuentas», salvo las que se están borrando, DEBE ofrecer «Ver el uso de {nombre}» en una columna «Uso», fuera de «Acciones» y sin cambiar `ACTION_SLOTS`. **[NEEDS CLARIFICATION: Q1, ¿cómo se llega al detalle desde «Cuentas»? Borrador: la columna «Uso» (A)]**
- **FR-029**: El detalle DEBE abrirse dentro de la página, en lugar de la vista, con el título «Uso de {nombre}» enfocado y «Volver a Cuentas» o «Volver a Alumnos», que vuelve a la lista como estaba y devuelve el foco al botón que lo abrió. Mientras tanto, la lista de origen queda montada y oculta, y el botón de sección marcado sigue siendo el de origen. NO DEBE ser un diálogo ni cambiar la URL. *(L1; «Dónde vive»)*
- **FR-030**: Abrir el detalle y aplicar otro período DEBEN hacer exactamente un `GET /api/admin/stats/students/{id}` cada uno. La interfaz NO DEBE pedir el detalle de una cuenta sin esa acción del admin (ni por adelantado, ni al pasar el puntero) ni pedir `GET /api/admin/users/{id}`, y DEBE avisar que la consulta queda registrada. *(Q3-A de C5; L2 y L8)*
- **FR-031**: El detalle DEBE mostrar la cuenta (nombre, email, rol y estado), su progreso (cuántos «Borrar todo» hizo, el último y su última actividad), sus importaciones (fecha, origen y época), lo resuelto por catálogo y lenguaje (en el servidor e importado) y sus intentos por resultado, en el período y en total. *(Contrato de C5, §6)*
- **FR-032**: DEBE dibujar su actividad por intervalo del período con un gráfico y su tabla.
- **FR-033**: DEBE mostrar sus cuotas de las últimas 24 horas (ejecuciones activas, aceptadas en el último minuto y en 24 horas, y minutos de sandbox) contra sus límites, cada una con su barra de proporción y su cifra.
- **FR-034**: DEBE mostrar la grilla por ejercicio, con el título y el id, el estado, cuándo se resolvió y si fue en el servidor, los intentos, el último intento con su resultado, la ayuda (asistido, vio la solución y las pistas), la predicción (si respondió y si acertó), la autoevaluación y el próximo repaso, con un filtro en el cliente: «Todos» o «Sin resolver».
- **FR-035**: DEBE mostrar su campaña (el checkpoint por mundo y los sellos), sus talleres (código sellado, predicción, etapas y objetivos) y su recorrido (pasos, hitos, favoritos y preguntas respondidas), como banderas y conteos.
- **FR-036**: Ante un 404, el detalle DEBE decir «Esa cuenta ya no existe o se está borrando.» y ofrecer «Volver», que vuelve a pedir la lista de origen. *(C5, FR-017)*
- **FR-037**: «Ver sus ejecuciones» DEBE mostrar, dentro del detalle, la lista de las ejecuciones de esa cuenta de los últimos 14 días, en un solo pedido con `user` y con el cursor de FR-024, sin salir del detalle. *(Q3-A de C5)*

**La privacidad en la interfaz**

- **FR-038**: Los nombres, los emails, los ids y las cifras de la sección NO DEBEN guardarse en `localStorage`, `sessionStorage`, una cookie propia, la URL, el historial ni un store compartido, ni escribirse en la consola. Viven en el estado de cada vista y se descartan al dejarla o al cerrar la administración. *(F12, FR-008)*
- **FR-039**: La interfaz NO DEBE mostrar ni deducir lo que la API oculta: la opción elegida por una cuenta, si un texto existe o cuánto mide, o una comparación entre cuentas. NO DEBE poner los datos de una cuenta junto a un agregado, ni ordenar o filtrar una página de alumnos por una métrica.
- **FR-040**: Lo resuelto DEBE mostrarse siempre separado en «en el servidor» e «importado», nunca como una sola cifra sin su desglose, y ningún texto de la sección DEBE decir «verificado». *(C5, FR-018 y FR-019)*
- **FR-041**: Toda tasa DEBE mostrar su numerador y su `n`. **[NEEDS CLARIFICATION: Q3, ¿qué hace la pantalla con las muestras chicas? Borrador: con `n` menor que 5, la marca «Muestra chica» y sin barra (A)]**
- **FR-042**: Las distribuciones de opciones (de la predicción, el checkpoint, el taller de Sistemas y las preguntas del recorrido) DEBEN aparecer sólo en los agregados, nunca en el detalle de una cuenta. **[NEEDS CLARIFICATION: Q3. Borrador: con menos de 5 respuestas no se muestra la distribución, sólo cuántas hubo (A)]**
- **FR-043**: La sección NO DEBE ofrecer exportar, descargar ni copiar sus cifras, ni una vista preparada para imprimir. *(ADR 0006 D33)*
- **FR-044**: Cada vista DEBE pedir su ruta sólo al mostrarse y una vez por cambio de parámetros, cancelar el pedido en curso al dejarla o al cambiarlos, y no pedir nada con la sección cerrada ni actualizarse sola. Con una sesión que no es de admin, el navegador NO DEBE hacer ningún pedido a `/api/admin`. *(F12, FR-001 y SC-002)*

**Los gráficos**

- **FR-045**: Los gráficos DEBEN dibujarse sin librerías nuevas: las series, con barras en SVG cuyo tamaño son atributos de geometría y cuyo color sale de clases de la hoja con los tokens del taller, y las proporciones, con `<meter>` o `<progress>` nativos. **[NEEDS CLARIFICATION: Q2, ¿con qué se dibujan los gráficos? Borrador: sin librería (A)]**
- **FR-046**: Cada gráfico DEBE tener a la vista una tabla con las mismas cifras y un resumen en texto, y NO DEBE repetirle al lector de pantalla lo que ya dice la tabla.
- **FR-047**: Los resultados de un intento NO DEBEN distinguirse sólo por el color: cada uno tiene su nombre en una leyenda.
- **FR-048**: Los gráficos NO DEBEN animarse. Si a su ancho una barra quedaría por debajo del mínimo que fija el plan, el gráfico DEBE desplazarse dentro de su propia región, con nombre y alcanzable con el teclado.

**Los errores y la espera**

- **FR-049**: Todos los pedidos DEBEN salir por el cliente de F11a y resolverse con `reactionTo` de F12a: el ingreso ante un 401, «Recargar» ante un 403 `forbidden`, el acceso ante un 403 `account_disabled`, «Recargar» ante un 409 `account_mismatch`, el reintento de un 419 y el mensaje común ante un 5xx, una respuesta que no es JSON o una falla de red. *(F12, FR-002, FR-039 y FR-042)*
- **FR-050**: Ante un 503 `stats_timeout` o un 429, DEBE mostrar el mensaje del servidor y cuánto falta según `Retry-After`, sin habilitar «Reintentar» antes. Ninguna falla DEBE perder el período, los filtros, la búsqueda ni la página. *(C5, FR-036; F12, FR-041)*
- **FR-051**: Mientras un pedido está en curso, la vista DEBE decirlo. Si ya mostraba cifras, DEBE conservarlas marcadas como en actualización hasta que lleguen las nuevas, y una respuesta de un pedido cancelado NO DEBE dibujarse.

**La accesibilidad**

- **FR-052**: Todo DEBE poder hacerse sólo con el teclado, con el foco visible y un orden que sigue el visual. Al abrir un detalle, el foco va a su título, y al volver, al botón que lo abrió. *(F12, FR-050)*
- **FR-053**: Cada tabla DEBE tener título y encabezados de columna y de fila asociados a sus celdas, y los botones de cada fila, un nombre accesible que incluye a la persona o el ejercicio. *(F12, FR-051)*
- **FR-054**: Desde 320 px, la página NO DEBE desplazarse en horizontal: una tabla o un gráfico que no entra se desplaza dentro de su propia región, con nombre y alcanzable con el teclado. Los campos miden 16 px o más. *(F12, FR-052)*
- **FR-055**: Los estilos DEBEN ser clases de las hojas del taller, y NO DEBE haber ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` nuevos. Ningún estado depende de una animación, y rige la regla global de movimiento reducido. *(F12, FR-053 y FR-054)*

**La calidad, el peso y las pruebas**

- **FR-056**: F14 NO DEBE sumar dependencias de runtime, ni un store compartido nuevo ni nuqs: el estado es local a la sección. **[NEEDS CLARIFICATION: Q2. Borrador: ninguna (A); con B o C, la que se elija, con permiso]** *(F12, FR-056)*
- **FR-057**: El PR DEBE medir `dist/index.html` antes y después y quedar bajo `BOOT_SIZE_LIMIT` de `qa/build-check.ts` (1 500 000 caracteres), con F14 sumando como mucho 40 000 sobre la línea base del plan. Si se pasa, el plan se detiene y decide el usuario.
- **FR-058**: Las vistas DEBEN dibujar sin virtualizar la respuesta más grande que el contrato permite en el taller de hoy (todos los ejercicios de los dos lenguajes, 366 intervalos por día y una grilla con todos los ejercicios), y el plan DEBE medir cuánto tardan en el navegador de los E2E.
- **FR-059**: Cada comportamiento DEBE empezar con una prueba que falla. Se usa Vitest con Testing Library para la lógica y los componentes, con el `fetch` inyectado en el cliente y las entradas armadas con fishery con las formas del contrato de C5. Los valores esperados se escriben a mano, nunca con la misma factory. *(Constitución, principio II; ADR 0008)*
- **FR-060**: Los E2E DEBEN usar un Page Object de la sección, con localizadores accesibles, que abre la administración con el único método de F12a, sobre el doble de la API de F11a con una sesión de admin. Las rutas de C5 se registran por escenario (una por id cuando la ruta lleva uno), y cada falla esperada se declara con `/status of NNN/`, o `/net::ERR_FAILED/` si se aborta. *(F12, FR-059 y FR-063; TR-11)*
- **FR-061**: La red E2E vigente en la base (las de F1, A2, F11a, F12a y cualquier ítem que haya entrado antes), `boot-check`, `dist-content-check` y `load-order-check` DEBEN seguir en verde sin editar sus escenarios. **[NEEDS CLARIFICATION: Q1. Borrador: la única excepción son las tres aserciones de F12a que cuentan los botones de una fila de «Cuentas», que pasan a contarlos en la celda «Acciones», en un commit propio con TDD, si F12a ya entró sin ese ajuste (A)]**
- **FR-062**: F14 DEBE cerrar con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde, y actualizar `docs/architecture.md` y `qa/AGENTS.md` con lo que agrega.

### Key Entities *(include if feature involves data)*

F14 no guarda datos: muestra los que trae C5 y los descarta al dejar la vista.

- **Período:** `from`, `to`, la agrupación y la zona del taller, con el que responde la API (`meta.period`). Lo comparten tres vistas mientras la administración sigue abierta.
- **Fuente de una cifra:** «Estado actual» (la época vigente de cada cuenta) o «Historia» (los intentos de todas las épocas).
- **Tasa:** un numerador y su `n`; con `n` igual a 0, sin valor.
- **Serie:** las cifras de un período, una fila por intervalo, que dibujan un gráfico y una tabla.
- **Distribución de opciones:** cuántos alumnos eligieron cada opción, sin identificadores. Sólo existe en los agregados.
- **Alumno de la lista:** los identificadores de la ficha y sus cifras de la página (contrato de C5, §5).
- **Detalle de una cuenta:** su ficha y sus cifras, sin textos ni opciones (contrato de C5, §6). Cada pedido con éxito deja una línea de registro.
- **Ejecución:** los metadatos de la lista cerrada de C5, nunca su código ni su salida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el doble de la API y respuestas tomadas del contrato de C5, cada cifra de cada vista coincide con la respuesta: 0 diferencias en el resumen (por día, semana y mes), en los ejercicios con sus detalles, en los alumnos, en el detalle de una cuenta y en la cola y las ejecuciones. Los valores esperados están escritos a mano.
- **SC-002**: Una predicción con 1 respuesta muestra 0 distribuciones, y el detalle de una cuenta muestra 0 opciones y 0 distribuciones (con Q3-A). El texto «verificado» aparece 0 veces, y lo resuelto se muestra sumado sin desglose 0 veces.
- **SC-003**: Después de recorrer todas las vistas y cerrar la administración, hay 0 nombres, emails, ids o cifras en `localStorage`, `sessionStorage`, `document.cookie`, la URL, el historial y la consola, y la URL cambió 0 veces. Con una sesión de alumno, el navegador hace 0 pedidos a `/api/admin`.
- **SC-004**: Abrir el detalle de una cuenta hace exactamente 1 pedido a su ruta, y aplicar otro período, exactamente 1 más. Listar alumnos y pasar el puntero hace 0 pedidos de detalle, y se hacen 0 pedidos a `GET /api/admin/users/{id}`. En 5 minutos con la vista abierta (`page.clock`), salen 0 pedidos sin una acción del admin.
- **SC-005**: Cada estado de cada pedido (cargando, vacío, 404, 422, 429, 503 `stats_timeout`, 401, 403, 409, un 5xx y una falla de red) tiene al menos una prueba, de Vitest o E2E, con un cuerpo tomado del contrato de C5 o de C3b. El 100 % de esos estados muestra un mensaje visible que dice qué hacer, y ninguno pierde el período ni los filtros.
- **SC-006**: El 100 % de los gráficos tiene su tabla con las mismas cifras y su resumen en texto, y 0 resultados se distinguen sólo por el color. Cada historia se completa sólo con el teclado; a 320 y a 390 px la página no se desplaza en horizontal; con movimiento reducido hay 0 transiciones (E2E).
- **SC-007**: La red E2E vigente pasa sin editar sus escenarios, salvo lo que apruebe Q1. `dist/index.html` queda bajo 1 500 000 caracteres y F14 suma como mucho 40 000, con la medida en el PR. `package.json` suma 0 dependencias de runtime (con Q2-A), y el código suma 0 sitios de estilo en línea.
- **SC-008** (una medición, no un criterio de aprobación): el PR informa cuánto tardan en dibujarse la respuesta más grande de los ejercicios, la serie de 366 días por día y una grilla con todos los ejercicios, en el navegador de los E2E.
- **SC-009**: Una spec de componente monta la página de la administración sola, con «Uso del taller», y la usa sin errores. En los E2E, 1 solo método del Page Object de F12a sabe cómo se abre la administración.
- **SC-010**: F14 cierra con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde.

## La partición propuesta

**[NEEDS CLARIFICATION: P1, ¿se parte F14? Borrador: en F14a y F14b por la frontera de los datos personales (A)]**

La spec tiene **62 requisitos**, contra los 52 de C3a, así que propone un corte sin aplicarlo:

| Parte | Qué entra | Requisitos propios | Con los 25 transversales (FR-038 a FR-062) | Depende de |
| --- | --- | --- | --- | --- |
| **F14a · Los agregados y la operación** | La sección y sus vistas, el período, lo que la pantalla explica, el resumen, los ejercicios con su detalle, la cola y las ejecuciones (sin el filtro por cuenta) | FR-001 a FR-024: 24 | 49 | F12a y C5 |
| **F14b · Por cuenta** | La lista de alumnos, el detalle de una cuenta, la entrada desde «Cuentas» y sus ejecuciones | FR-025 a FR-037: 13 | 38 | F14a |

- **Qué gana:** F14a no muestra ningún dato de una cuenta, no deja líneas de registro y no toca F12a. F14b concentra lo que sí: las consultas registradas, el cruce de Q3 y el cambio de Q1. Las dos quedan bajo el tope.
- **Qué cuesta:** un segundo ciclo de plan y tareas, y F14b espera a F14a. La pregunta más común de quien enseña («quién no viene») llega en la segunda parte.
- **Descartadas:** partir por el público (el uso y la operación), que deja la primera parte en unos 57 requisitos y la segunda en un ciclo entero para cinco; y no partir, con 62, como los 63 de F12 (que se partió por C3c, no por el tamaño).

## Riesgos

1. **Las métricas por cuenta son vigilancia si se usan mal.** El admin ve el ritmo de estudio de cada alumno, día por día (Q1-A de C5). *Mitigación:* la interfaz no amplía lo que la API muestra (FR-039), cada consulta sale por una acción del admin y queda registrada (FR-030), y la pantalla lo dice (L8). El aviso de privacidad, que escribe el usuario, tiene que decirlo (hallazgo 7 de C5).
2. **El cruce de las distribuciones con pocas respuestas.** Con Q3-A la pantalla oculta las distribuciones de menos de 5 respuestas. Quedan dos huecos: con 5 o más, si todos los que no acertaron eligieron la misma opción, la distribución dice cuál eligió cada uno; y la API sigue mandando el dato. La opción de quien acertó ya la dice su bandera, como decidió C5. *Mitigación:* el hallazgo para C5, que puede aplicar el corte en el servidor.
3. **El código de F14 viaja a todos los alumnos** dentro de `dist/index.html` hasta que C4 retire `vite-plugin-singlefile`. *Mitigación:* no trae secretos, sólo nombra rutas que los contratos ya publican, y el servidor exige el rol en cada una; el subpresupuesto de FR-057 y Q2-A.
4. **Pantallas diseñadas sin datos reales** (Q4). *Mitigación:* estados vacíos que explican, respuestas de prueba sacadas del contrato, y una revisión manual con datos armados antes del PR.
5. **Las pruebas de F12a que cuentan botones** (Q1). *Mitigación:* el ajuste a su plan antes de implementarla, o el commit propio con TDD y la aprobación del usuario.
6. **Tablas anchas y series largas a 320 px.** *Mitigación:* la región que se desplaza de F12a (FR-054) y la tabla siempre a la vista (FR-046).
7. **El límite de 120 pedidos por minuto.** Cambiar filtros sin parar puede llegar al 429. *Mitigación:* filtros que piden una vez por cambio, la búsqueda al enviar, la cancelación del pedido anterior y sin refresco automático (FR-044 y FR-050).
8. **El contrato de C5 puede cambiar al implementarse.** *Mitigación:* F14 llega a `master` después que C5 (Dependencias reales), y su plan contrasta las formas con lo implementado.
9. **El ADR 0006 sigue en propuesta.** *Mitigación:* lo que F14 toma de él llega por C5; si el usuario lo enmienda en D31, D33 o S5, cambia C5 y F14 sigue.

## Relación con otros ítems

**C5** (spec 025, rama `spec/c5-estadisticas`, PR #86, planificada):

- F14 consume sus seis rutas, sin la ficha (L2), y la línea de registro de Q3 sale de lo que F14 pide.
- **Hallazgo 1, las distribuciones con pocas respuestas:** todas las preguntas de hoy tienen tres opciones. Junto con el «respondió y no acertó» por cuenta del detalle, una distribución con pocas respuestas dice cuál de las dos opciones equivocadas eligió una cuenta identificable, que es lo que Q1-A oculta (la de quien acertó ya la dicen las banderas). F14 lo tapa en la pantalla con menos de 5 respuestas (Q3-A); C5 puede aplicar el mismo corte en la API. Con 5 o más respuestas equivocadas iguales, el hueco sigue.
- **Hallazgo 2, el filtro de nivel:** el contrato enumera `beginner`, `medium`, `advanced` y `expert`, y E1 suma `essentials` (E1-Q2). El contrato y la validación de C5 tienen que aceptarlo cuando entre E1.

**F12a** (spec 023; plan enmendado en `plan/amend-a3-f8-f12a`, `191e5974`, PR #84; sin implementar):

- F14 suma una sección a `AdminPage` y un valor al tipo de la sección: cambia `contracts/admin-page.md`.
- **Hallazgo, la sección de «Cuentas» y el detalle:** el estado de la lista (la página, la búsqueda y los filtros) vive en la sección de «Cuentas» (`usePagedList`, T016). Para que el detalle vuelva a la lista como estaba, F14 cambia esa sección: dibuja el detalle con la lista montada y oculta. El plan de F12a no lo prevé, y el de F14 lo toma como un cambio a un archivo de F12a.
- **Hallazgo, las pruebas que cuentan botones (Q1):** la spec de componente de «Cuentas» (T015) y el E2E de las cuentas (T022) cuentan los botones de toda la fila. Si cuentan los de la celda «Acciones», F14 suma su columna sin editar nada. Conviene inyectarlo en el brief de esas tareas antes de implementarlas, como se hizo con el E2E (l) de F3.
- La tercera sección va después de «Invitaciones», así que la spec de la página que llega a «Invitaciones» con tres Tab no cambia.

**F12b** (sin plan): suma una cuarta acción a las filas de alumnos activos. Con Q1-A no choca con «Ver el uso», que va en otra columna. Si sus pruebas cuentan los botones de la fila, tienen el mismo problema que las de F12a.

**F10** (spec 024): `#administracion` monta la página entera, con «Uso del taller» adentro. F14 no agrega formas de URL, y su Page Object usa el único método de apertura que F10 cambia.

**F11** (spec 015): F14 usa el cliente, la sesión, «pedir el ingreso», React Hook Form, `formatLocalDateTime` y el doble de la API de F11a, sin cambiarlos. El aviso de privacidad tiene que nombrar las métricas por cuenta y el registro de cada consulta (hallazgo 7 de C5); F14 no lo escribe.

**C4** (spec 008): su recorrido de la CSP (su SC-004) no incluye las pantallas de F14, como tampoco las de F11 ni F12. F14 no agrega estilos en línea, y el SVG usa atributos de geometría. Con Q2-B, uPlot escribe estilos con el CSSOM, y C4 tendría que contrastarlo.

**A4 y D1c:** llenan las tablas que F14 muestra (Q4).

**E1:** sus catálogos y su nivel aparecen sin cambiar código (FR-014), con la salvedad del hallazgo 2 de C5.

**F1, A2 y F2b:** F14 no edita sus escenarios ni sus checks, y no cambia la gramática de URL.

**Hojas de ruta** (las integra el coordinador):

- La del front suma la fila de **F14 · Estadísticas del admin**, que depende de F12a y de C5 (implementada), con «En especificación» y el enlace a esta spec. Si P1 se acepta, F14a y F14b.
- En «Orden y paralelismo», F14 va «aparte», como F12b: después de F12a y de C5, sin bloquear a nadie.
- En «Convenciones», la lista de IDs suma F14.
- La entrada «Las pantallas de C5 … no tienen dueño» de las enmiendas pendientes queda cerrada, y la del backend también (spec de C5, hallazgo 1).
- La constitución cuenta «F1…F13» en su tabla de épicos: con F14, la cuenta cambia en su próxima enmienda.

## Assumptions

- **F12a está integrada antes de planificar F14,** con los nombres de su plan enmendado. Si su implementación los cambia, el plan de F14 usa los de la base.
- **El contrato de C5 es el del PR #86.** Si cambia al implementarse, esta spec se ajusta.
- **El doble de la API de F11a** encuentra una ruta por su método y su camino, sin la query, y guarda la query en `ApiCall.search`: las rutas con un id se registran una por id, y las respuestas pueden variar con la query.
- **El contenido del front está cargado** cuando el admin abre la administración, porque la compuerta de A2 lo carga antes del shell. Con A3, sale de la API; F14 lo lee igual.
- **El taller de hoy** tiene 274 ejercicios (137 por lenguaje) en el catálogo del laboratorio; con E1, algunos más. Ninguna tabla necesita virtualizarse a esa escala (FR-058).
- **Un aula de 40** es el supuesto de trabajo, como en C3b y F12: la lista de 25 por página alcanza.
- **El umbral de una muestra chica** es 5, el mismo que usaba como ejemplo la opción D de Q1 de C5. Lo confirma Q3.
- **El subpresupuesto de 40 000 caracteres** es una propuesta: F12a, con un volumen de pantallas parecido, estimó unos 32 000. Al subir el tope, el coordinador calculó que la suma del peor caso de los planes dejaba un margen de 707 caracteres bajo el tope viejo de 1 250 000; con 1 500 000, eso da unos 250 000 (cuenta de esta spec, no una medida).
- **Las fechas** se muestran con el formato del español de Argentina, y las cifras, con el punto de miles y la coma decimal.
- **Los nombres de los roles y los estados** son los de F12a («Admin», «Alumno», «Activa», «Deshabilitada» y «Borrándose»).
- **El ADR 0006 sigue en propuesta.** Lo que F14 toma de él llega a través de la spec de C5.

## Alternativas consideradas

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde se llega al detalle desde «Cuentas» (Q1) | Una columna «Uso»; sin entrada; una cuarta acción | Pregunta abierta; borrador, la columna |
| Los gráficos (Q2) | Sin librería; uPlot; Chart.js; sólo tablas | Pregunta abierta; borrador, sin librería |
| Las muestras chicas (Q3) | Marcar y ocultar las opciones; sólo marcar; ocultar todo; nada | Pregunta abierta; borrador, marcar y ocultar las opciones |
| Cuándo entra (Q4) | No espera; espera a A4 y D1c; el PR espera a A4 | Pregunta abierta; borrador, no espera |
| La partición (P1) | Por los datos personales; por el público; no partir | Pregunta abierta; borrador, por los datos personales |
| Dónde se abre el detalle (L1) | Una subvista en la página; un diálogo sobre la administración; una sección propia | **La subvista:** F12a deja un diálogo a la vez, una grilla de cientos de filas no cabe bien en un modal, y funciona igual en el diálogo de hoy y en `#administracion` |
| La ficha con su resumen (L2) | Usarla en «Cuentas» o en el detalle; no usarla | **No usarla:** el detalle trae todo, y pedir las dos duplica las líneas de registro |
| El período por omisión (L3) | Calcularlo en el navegador; pedir sin parámetros y llenar con `meta.period` | **Pedir sin parámetros:** «hoy» depende de la zona |
| Atajos de período | «Últimos 7 días», «este mes»; dos fechas | **Dos fechas** (YAGNI): el por omisión ya son 30 días |
| La navegación interna | Cuatro secciones más en la barra de F12a; una sección con cuatro vistas | **Una sección con cuatro vistas:** es lo que decidió Q4-A («una sección más») y no llena la barra de botones a 320 px |
| El orden de los ejercicios (L7) | Encabezados que ordenan; un selector de órdenes fijos; sin orden | **Un selector:** cuatro órdenes responden «qué traba», con un solo control accesible |
| La cola | Refresco automático cada 15 s; a pedido | **A pedido** (L5): el límite de 120 por minuto, y nada que hacer en vivo |
| Los alumnos inactivos | Atajos «hace 7, 14 o 30 días»; una fecha | **Una fecha** (L4) |
| Las listas de cuentas y de alumnos | Una sola lista; dos listas | **Dos:** «Cuentas» gestiona todas las cuentas con la API de C3b, y «Alumnos» sigue a la población con la de C5; cada una pagina distinto |

## Acciones del usuario

Los agentes no las hacen. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII).

| Cuándo | Acción |
| --- | --- |
| Ahora | Responder Q1 a Q4 y P1. |
| Antes del plan | Si Q1-A: que el coordinador corrija el plan de F12a (T015 y T022) antes de implementarlo. |
| Antes del PR | Con Q4-A, revisar las pantallas con datos armados en el stack local (optativo). Con Q2-B o C, el permiso de la descarga. |
| Antes de integrar | Que el aviso de privacidad nombre las métricas por cuenta y el registro de cada consulta (F11-Q2, hallazgo 7 de C5). |

## Descargas previstas

Ninguna con Q2-A. F14 reutiliza React Hook Form (lo instala F11a) y la pila de pruebas que ya está en `master`. Con Q2-B, `uplot` 1.6.32 (MIT, sin dependencias, 545 468 bytes desempaquetados); con Q2-C, `chart.js` 4.6.1 (MIT, 6 227 928 bytes desempaquetados) y `@kurkle/color`.

## Fuentes consultadas (2026-10-28)

- **Los metadatos del registro de npm** (`registry.npmjs.org/uplot/latest` y `registry.npmjs.org/chart.js/latest`): versión, licencia, tamaño desempaquetado y dependencias.
- **El listado de archivos de jsDelivr** (`data.jsdelivr.com/v1/packages/npm/uplot@1.6.32` y `…/chart.js@4.6.1`): el tamaño de `uPlot.iife.min.js`, `uPlot.min.css` y `chart.umd.min.js`. Son tamaños de archivo, no medidas del bundle del taller: si Q2 elige una librería, el plan la mide con `npm run build`.
- **El código del taller** en `master` (`bb480677`): `qa/build-check.ts` (`BOOT_SIZE_LIMIT`), los `<progress>`, `<meter>` y SVG de las vistas legacy, la regla de movimiento reducido de `frontend/styles.css` y los textos de la autoevaluación de `frontend/lab.js`.
- **Fuera de `master`:** la spec y el contrato de C5 (`spec/c5-estadisticas`, `933d9e06`), el plan enmendado de F12a (`plan/amend-a3-f8-f12a`, `191e5974`) y el doble de la API, el cliente y los formularios de F11a (`f11a/base`, `a7b3c71d`).
