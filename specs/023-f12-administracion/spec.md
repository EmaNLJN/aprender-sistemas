# Feature Specification: F12 · Administración

**Feature Branch**: `023-f12-administracion` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Borrador para el clarify: tres preguntas abiertas y una partición propuesta, sin aplicar; sin plan

**Input**: Ítem **F12** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Administración»: las pantallas de administración de usuarios e invitaciones. Lo encargó el coordinador el 2026-10-28. No es un port, porque el legacy no tiene estas pantallas: son nuevas y consumen `/api/admin` de C3b, entregada en el PR #37 ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md) y su [contrato HTTP](../010-c3b-admin-ciclo-de-vida/contracts/http.md)). El contrato se contrastó con el código de la API en `master` (`e87772d`): `backend/api/routes/api/admin-users.php`, `admin-invitations.php` y `deletion.php`, los controladores de `app/Http/Controllers/Admin/` y `Account/DeletionController.php`, los `FormRequest` de `app/Http/Requests/Admin/`, los presentadores de `app/Admin/` (`PublishedAdminUser`, `PublishedInvitation` y `PageMeta`), `lang/es/` (`admin`, `invitations`, `api` y `account`) y las pruebas de Pest de `tests/Feature/Admin/` y `tests/Feature/Accounts/`. También toma lo que C3c ([spec 011](../011-c3c-correo/spec.md)) cambia cuando llega el correo, aunque C3c sólo está especificada. Depende de F11, cuya spec (015) está clarificada desde el 2026-10-28 y partida en F11a a F11d, pero sin merge: se cita por rama y ruta, sin enlace (`spec/f11-acceso`, `7a97bf74`, `specs/015-f11-acceso-cuenta/spec.md`). El código del front que se leyó es la integración local de F2a, A2 y F2b (`2b37caf`, sin rama publicada). Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) (aceptado), el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (en propuesta), el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** C3b dejó lista la administración del taller, pero sólo como contrato HTTP. Para usarla, quien administra tiene dos caminos y ninguno sirve en el día a día:

- **La consola** da de alta de a un email por vez (`taller:invite`) e imprime enlaces de recuperación (`taller:password-reset-link`). No lista cuentas, no cambia un rol ni un estado, no revoca invitaciones y no borra la cuenta de otra persona.
- **La API** hace todo eso, pero pide una cookie de sesión, el token CSRF, `X-Taller-User` y la contraseña reconfirmada en cada pedido, como hace `backend/api/scripts/check-admin-lifecycle.sh` con `curl`.

F12 trae las pantallas que faltan. Desde el navegador, una persona con rol admin puede:

- invitar a un grupo de una vez y copiar el enlace de cada invitación;
- ver las invitaciones, generar un enlace nuevo para una y revocarla;
- buscar y filtrar las cuentas;
- deshabilitar una cuenta y rehabilitarla;
- darle o quitarle el rol de admin;
- borrar la cuenta de otra persona.

En ningún camino el taller se queda sin un admin activo. Cuando llegue el correo (C3c), las invitaciones también podrán salir por correo, y quien administra podrá mandarle a un alumno un enlace para elegir otra contraseña.

Es para quien administra el taller. Indirectamente, también es para el alumno, que recibe su invitación sin pasar por la consola, y para C4, que expone el taller (Q2). El resto del taller no cambia: ni el aspecto, ni el comportamiento, ni el progreso guardado, ni las URL. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Un admin invita a un aula de 40 con un solo envío, copia los 40 enlaces y se los entrega. Ningún enlace queda en el almacenamiento del navegador, en la URL ni en la consola.
2. Un admin deshabilita, rehabilita, promueve, degrada o borra una cuenta desde la administración, con la contraseña reconfirmada cuando el servidor la pide. La propia cuenta no se puede tocar desde ahí, y un `last_admin` del servidor se explica con su mensaje.
3. Un alumno no ve ninguna entrada a la administración, y su navegador no pide nada a `/api/admin`. El servidor sigue siendo la autoridad: si una cuenta pierde el rol de admin con la administración abierta, el próximo pedido lo dice y ofrece recargar.
4. Cada acción resuelve sus estados (cargando, éxito, error de un campo, error del servidor, sesión vencida o de otra cuenta, y límite de pedidos) con un mensaje en español que dice qué hacer.
5. Todo se completa con el teclado, con el foco en su lugar después de cada diálogo, en un celular de 320 px y sin depender de una animación.
6. La red E2E vigente pasa sin editar sus escenarios, y `dist/index.html` sigue bajo el límite de `build-check`, sin dependencias nuevas.

**Entra** (entre paréntesis, la parte de la partición propuesta a la que va):

- **La entrada y el montaje (F12a):** la entrada «Administrar el taller» dentro de «Tu cuenta», sólo para el rol admin, y la administración como un diálogo propio (la ubicación depende de Q1).
- **Las cuentas (F12a):** la lista paginada, con búsqueda y filtros, y las acciones de deshabilitar, rehabilitar, hacer admin, quitar admin y borrar.
- **Las invitaciones por enlace (F12a):** la lista paginada con sus filtros, invitar en lote, copiar los enlaces, reenviar (un enlace nuevo) y revocar.
- **La contraseña reconfirmada (F12a):** pedirla cuando el servidor responde 423 y repetir la acción una vez (Q3).
- **Lo que llega con el correo (F12b, espera a C3c):** invitar y reenviar por correo, ver si una invitación salió o falló, pasar una invitación a enlace y mandarle a un alumno el enlace de recuperación.
- **Las pruebas:** specs de Vitest con Testing Library y fishery; E2E con un Page Object de la administración sobre el doble de la API de F11a; la documentación que cambia con ellas, `docs/architecture.md` y `qa/AGENTS.md`.

**Queda fuera:**

- **Las estadísticas del admin** (C5): `/api/admin/stats/*`, `GET /api/admin/runs`, `GET /api/admin/queue` y el resumen en la ficha de usuario.
- **La API:** es de C3b y C3c. F12 no cambia ningún contrato, y lo que le falta a uno queda como hallazgo («Relación con otros ítems»).
- **Las pantallas de cuenta** (F11): el ingreso, el alta, el aviso de privacidad, «Tu cuenta», «Salir», y descargar o borrar la propia cuenta.
- **El router y la raíz única** (F10).
- **Cambiar una vista legacy o `frontend/app.js`.**

**Sin hacer a propósito (YAGNI):**

- **Una ficha de usuario aparte** (`GET /api/admin/users/{id}`). La lista ya trae la misma forma (`AdminUser`), y C5 suma el resumen de uso a la ficha cuando llegue.
- **Elegir el orden de la lista.** La API ordena por nombre por omisión, y para un aula de 40 alcanza con buscar y filtrar. `sort` sigue disponible si alguien lo pide.
- **Acciones en lote sobre cuentas,** como deshabilitar varias a la vez: la API trabaja de a una cuenta.
- **Guardar los enlaces en un archivo** (CSV o similar). Un archivo con tokens queda en el disco; copiar es una acción explícita de quien administra.
- **Ver el historial de acciones de admin.** Va a los registros del servidor (R5 del ADR 0006), y no hay una API para leerlo.
- **Cambiar el nombre o el email de otra cuenta.** C3b no lo permite (FR-033 de C3b).
- **Avisos en vivo cuando otro admin cambia algo, y un temporizador visible de la confirmación de la contraseña.**
- **La búsqueda en cada tecla y los filtros en la URL** (nuqs).
- **Una librería de tablas, de diálogos, de portapapeles o de animación.**

**Actores:**

- **Quien administra** (rol `admin`): opera el taller desde la administración. Un admin también estudia como cualquier cuenta (Q3 de C3a).
- **El alumno** (rol `student`): no ve la administración. Recibe la invitación o, con C3c, el correo.
- **Los ítems que se apoyan en F12:** C4, si Q2 lo decide así; F10, que decide su montaje definitivo; y C5, cuyas pantallas no tienen dueño todavía («Relación con otros ítems»).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta.

| Pedido | Fuente |
| --- | --- |
| F12 trae las pantallas de administración de usuarios e invitaciones, que consumen `/api/admin` de C3b, con sus E2E. Quedan fuera las estadísticas (C5), la API (C3b) y las pantallas de cuenta (F11) | Coordinador, 2026-10-05; hoja de ruta del front, F12 en «Ítems» y en «Alcance por ítem» |
| Dónde se monta F12, y si C4 la espera, son decisiones abiertas | Hoja de ruta del front, «Decisiones abiertas», F12 (Q1 y Q2) |
| F11 se parte en cuatro: F11a (el acceso, con las etapas de arranque, el cliente HTTP, el ingreso, el aviso de privacidad y «Tu cuenta»), F11b (la cuenta), F11c (el correo) y F11d (lo de D1) | Usuario, clarify del 2026-10-28 (P1) |
| La sesión es obligatoria desde F11a. F11a introduce la etapa de sesión y «pedir el ingreso», trae el doble de la API como fixture automático de los E2E, con una sesión simulada por omisión, y la vista previa pasa `/api/` al stack | Usuario, clarify del 2026-10-28 (F11-Q1), y ruling C1 del coordinador |
| La entrada a «Tu cuenta» es un botón de la barra superior, junto al selector de lenguaje, que abre un diálogo modal | Usuario, clarify del 2026-10-28 (F11-Q3) |
| Los formularios usan React Hook Form, que instala F11a con permiso. Los `errors.<campo>` de un 422 van a `setError`, y los `{message, code}`, a `root.serverError` | Usuario, 2026-10-06; hoja de ruta del front, F11 |
| Cada descarga pide permiso con nombre, origen y tamaño | Constitución, principio VII |
| Vitest con Testing Library y fishery para la lógica y los componentes, y Playwright con Page Objects para los E2E, sin tocar servicios públicos | ADR 0008 (aceptado); constitución, principio II |
| TDD; código y pruebas en inglés; interfaz en español rioplatense; teclado, celular y movimiento reducido | `AGENTS.md`; constitución, principios II, III y VI |
| Zustand y nuqs entran sólo con su primer caso real | `AGENTS.md` |
| La spec, en español y sin código: como mucho cinco preguntas para el clarify, y un corte propuesto, sin aplicar, si pasa de 52 requisitos | Coordinador, 2026-10-28 |

## Preguntas abiertas para el clarify

Son tres, cada una con sus opciones y una recomendada. Se cierran en `/speckit-clarify`, y las respuestas pasan a una sección Clarifications.

- **Los marcadores.** Cada pregunta deja un `[NEEDS CLARIFICATION]` donde decide algo, y esos tres son los únicos: Q1 en FR-003, Q3 en FR-036, y Q2 en «Dependencias reales», porque Q2 decide una dependencia de C4 y no un comportamiento de F12.
- **La partición** no es una pregunta: está en su sección, con su recomendación, y el usuario la acepta o la cambia al responder.
- **Hasta el clarify,** lo que depende de una pregunta usa como borrador la opción recomendada.

### Q1. Dónde se monta la administración

**Contexto.** Hasta F10, el shell es legacy, y las vistas viven en `#main` con la vista en el hash. Cada candidata se midió contra cuatro cosas:

- **El contrato de las ocho vistas.** `viewFromHash` (`frontend/src/shared/config/url-grammar.ts`, de F2b) devuelve `recorrido` para cualquier hash que no sea una de las ocho vistas, y `app.js` lo usa en cada `hashchange`. Por esa misma razón, F11 descartó `#cuenta`.
- **La red de F1.** `views.spec.ts` recorre las ocho vistas. El contrato de CSS mide `.navigation a:last-child` (R8) y el primer botón del documento (R4). F11a ya suma un botón a la barra superior.
- **Lo que va a cambiar F10:** una raíz única con router, que decide si F11 y F12 pasan a ser rutas.
- **El costo de tiempo:** de qué ítems pasa a depender F12.

(FR-003)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Un diálogo propio, que se abre desde «Tu cuenta». Con rol admin, «Tu cuenta» muestra «Administrar el taller», que cierra «Tu cuenta» y abre la administración: un diálogo modal que ocupa la pantalla entera en todos los anchos, dibujado por la raíz de la cuenta de F11a, fuera de `#main` y de `.app-shell` | No toca el contrato de las ocho vistas, ni `app.js`, ni la barra lateral, ni la barra superior, y no suma una etapa al arranque: la red de F1 no ve nada. No espera a ningún port. F10 decide si pasa a ser una ruta: cambia el punto de montaje, no el código de la página. **Costo:** no se puede enlazar; recargar la cierra y pierde los filtros y los enlaces a la vista; las confirmaciones son diálogos sobre un diálogo (FR-005 limita a uno por vez); y una tabla de hasta 25 filas vive en un modal |
| B | Una sección dentro del mismo diálogo «Tu cuenta»: con rol admin, el diálogo suma «Administración» junto a los datos de la cuenta, «Salir» y lo que agregan F11b y F11d | Tampoco toca el contrato de URL, ni el shell, ni el arranque, y no espera a ningún port. **Costo:** «Tu cuenta» ocupa la pantalla entera sólo en el celular (FR-067 de F11), así que en una computadora no entran una tabla de 25 filas con sus filtros ni el formulario de un lote, salvo que F11a pase el diálogo a pantalla entera para todos. Además, el diálogo que ya comparten F11a, F11b y F11d suma una sección que sólo ven los admins, y lo que se mueve en uno (el foco, el cierre, el aviso de «Salir») se prueba con los tres |
| C | Una raíz previa al shell, como el acceso de F11. Una forma de URL nueva (por ejemplo, `?administracion`) que la etapa de sesión reconoce: con rol admin, monta la administración como una página entera y no evalúa el shell legacy; con otro rol, sigue el arranque de siempre | Página entera y enlazable, separada del legacy. **Costo:** una forma de URL nueva en la gramática de F2b y en `url-contract`; una rama en la etapa de sesión de F11a, que A3 también extiende, y una fila en `load-order-check`. Volver al taller recarga el documento, porque el shell no se evaluó, y entrar desde el shell exige un enlace que cambie la query, porque un cambio de hash solo cae en `#recorrido`. Hay que definir qué ve un alumno que llega por esa URL. F10 la convierte en una ruta |
| D | Una ruta de la raíz única de F10 | Sin código de montaje que después se tire. **Costo:** F12 espera a F10, el final del tronco (F3 a F9 antes). Si C4 espera a F12 (Q2, A), C4 espera todo el port. La URL (probablemente una novena vista) la decide el router de F10 |
| E | Una novena vista del shell legacy (`#administracion`), montada en `#main` por `app.js`, como el Atlas | Página entera y enlazable. **Costo:** cambia el contrato de las ocho vistas (`VIEWS` y `viewFromHash` de F2b), la navegación (R8 de la red) y `app.js`, que cada port toca y se integra de a uno; un enlace en el menú sólo para admins cambia lo que mide la red según el rol de la sesión simulada |
| F | Como A, pero con su propio botón en la barra superior, sólo para admins | Un clic menos. **Costo:** cambia otra vez la barra superior, que F11a ya cambió (su riesgo 4); a 320 px tienen que entrar el selector de lenguaje, «Tu cuenta» y la nueva entrada; y lo que mide la red depende del rol de la sesión simulada |
| Otra | Decir cuál | |

### Q2. ¿C4 espera a F12?

**Contexto.**

- **Lo que pide la spec de C4** ([008](../008-c4-exposicion/spec.md)): la compuerta G1 (su FR-044) exige C3 entregado (C3a, C3b y C3c), con una cuenta admin creada y el aviso de privacidad vigente. No nombra pantallas de administración.
- **La hoja de ruta** dice «sin administración no se expone el taller». C3b ya entregó esa administración, pero sólo por HTTP.
- **La consola** (`backend/api/routes/console.php` y `app/Console/Commands/`) tiene `taller:invite`, de a un email por vez, y `taller:password-reset-link`. No tiene ningún comando para listar cuentas, cambiar un rol o un estado, revocar una invitación ni borrar la cuenta de otra persona.
- **Sin F12, eso queda en dos caminos:**
  - HTTP con `curl`, una cookie de sesión, el token CSRF, `X-Taller-User` y la confirmación de la contraseña, como `check-admin-lifecycle.sh`;
  - `tinker`, que se saltea la guardia del último admin y el evento `AccountRestricted` con el que B2 cancela las ejecuciones.
- **Las dependencias:** F12a depende sólo de F11a, que A3 ya necesita, y C4 espera a A3 y al dominio de C3c.

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | C4 espera a F12a: su compuerta G1 suma «las pantallas de administración integradas» | Con el taller expuesto, deshabilitar una cuenta comprometida o atender un pedido de supresión (Ley 25.326, art. 16) no exige `curl` ni `tinker`. Cuesta poco en calendario, porque F12a sólo espera a F11a, que va antes que A3 y, por lo tanto, antes que C4. **Costo:** C4 suma una dependencia en la otra hoja de ruta, y si F12a se demora, C4 espera. La hoja de ruta del front deja de decir que F12 no bloquea a nadie |
| B | C4 no espera: el camino HTTP con un script como `check-admin-lifecycle.sh` queda como procedimiento documentado hasta F12 | C4 no suma nada. **Costo:** operar a mano con `curl` justo cuando apura (una cuenta comprometida), y la tentación de usar `tinker`, que se saltea la guardia y el evento |
| C | C4 espera sólo a la parte de cuentas de F12 (listar, deshabilitar, rehabilitar y borrar), no a las invitaciones | La compuerta más chica que cubre la respuesta a un incidente; las invitaciones siguen por consola, de a una. **Costo:** obliga a la partición en tres partes («Partición propuesta») y a otro ciclo de plan |
| Otra | Decir cuál | |

La misma pregunta vale para F11b: sin ella, un alumno no tiene cómo descargar sus datos ni borrar su cuenta solo. F11 la dejó abierta, y este clarify no la responde.

### Q3. Cómo se pide la contraseña reconfirmada

**Contexto.**

- **Qué rutas la piden.** C3b exige `password.confirm` para `PATCH` y `DELETE` de una cuenta, para la recuperación de un tercero y para crear o reenviar una invitación de admin. Listar, revocar y las invitaciones de alumnos no la piden. La matriz completa está en `backend/api/tests/Feature/Admin/PasswordConfirmMatrixTest.php`.
- **Cuánto dura.** La confirmación vale 900 segundos (`AUTH_PASSWORD_TIMEOUT` en `config/auth.php`), y `GET /api/auth/confirmed-password-status` dice si sigue vigente.
- **Un 423 no cambia nada.** En las rutas de `PATCH`, `DELETE` y la recuperación responde el middleware; al invitar y al reenviar, el controlador lo comprueba antes de escribir. Por eso es seguro repetir el pedido después de confirmar.
- **El precedente de F11.** Para descargar los datos y borrar la cuenta, F11b pide la contraseña siempre, antes de la acción (sus «Alternativas consideradas»). Son dos acciones raras. La administración, en cambio, puede encadenar varias en pocos minutos.

(FR-036)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | A pedido: la acción sale y, si el servidor responde 423, se pide la contraseña (en el mismo diálogo de la acción, si lo hay), se confirma con `POST /api/auth/confirm-password` y se repite la acción una sola vez | Decide el servidor, así que el front no copia la matriz, que en las invitaciones depende del rol. Quien deshabilita a varias cuentas seguidas escribe la contraseña una vez cada 15 minutos. **Costo:** dentro de esos 15 minutos, una acción destructiva sale sólo con su confirmación. El momento en que se pide es distinto del de F11b, aunque el componente sea el mismo |
| B | Siempre, antes de cada acción sensible, como F11b | Cada acción sensible pide la contraseña. **Costo:** el front copia la matriz de C3b (y la mantiene si cambia); quien hace 40 cambios escribe la contraseña 40 veces |
| C | Consultar `confirmed-password-status` antes de cada acción sensible y pedirla sólo si no está vigente | Pide la contraseña sólo cuando hace falta. **Costo:** un pedido más por acción; el front igual copia la matriz; y en el borde de los 900 segundos igual puede llegar un 423, así que también necesita el camino de A |
| Otra | Decir cuál | |

## Partición propuesta

**Por qué se propone.** La spec tiene 61 requisitos, contra los 52 de C3a. Cada uno lleva una sola obligación que se puede comprobar. Además, la parte del correo no se puede entregar hasta C3c, cuyo plan espera el dominio. Es el mismo motivo por el que F11c quedó aparte (P1).

**Recomendada: dos partes en una sola spec,** como F11 y F2. Cada parte tiene su plan y sus tareas, y toma su rango de requisitos.

| Parte | Qué trae | Depende de | Requisitos propios | Con los 12 transversales (FR-050 a FR-061) |
| --- | --- | --- | --- | --- |
| **F12a · Sin correo** | La entrada y el montaje, las cuentas, las invitaciones por enlace, la contraseña reconfirmada y los errores comunes | F11a; C3b (entregada) | 43 (FR-001 a FR-043) | 55 |
| **F12b · Con correo** | Invitar y reenviar por correo, el estado del envío, pasar a enlace, la recuperación de un tercero y el 503 | F12a y C3c, que espera el dominio | 6 (FR-044 a FR-049) | 18 |

**Motivo.** El corte sigue la única dependencia externa que hay. F12a queda con 55, por debajo de los 64 de F11a, que el usuario aceptó. Cuentas e invitaciones comparten el diálogo, el pedido de la contraseña y el manejo de errores: separarlas suma un ciclo para quince requisitos.

**Costo.**

- Un segundo ciclo de plan y tareas, que se hace con C3c.
- F12b toca las mismas pantallas después de F12a.
- F12a es la segunda parte más grande del épico.

**La alternativa: tres partes.**

| Parte | Requisitos propios | Con los transversales |
| --- | --- | --- |
| F12a · Cuentas: la entrada, el montaje, las cuentas, la contraseña y los errores | 28 (FR-001 a FR-020 y FR-036 a FR-043) | 40 |
| F12b · Invitaciones por enlace | 15 (FR-021 a FR-035) | 27 |
| F12c · Con correo | 6 (FR-044 a FR-049) | 18 |

Sirve si Q2 se responde con C, o si se quiere entregar antes lo que la consola no cubre: la consola invita de a una, pero no gestiona cuentas. Cuesta un ciclo más, y las invitaciones por enlace se integran después de las cuentas.

**No partir** deja la parte del correo sin poder cerrarse hasta C3c.

## Dependencias reales

- **C3b** (entregada, PR #37): los nueve endpoints de `/api/admin`. F12 usa ocho: no usa `GET /api/admin/users/{user}`.
- **F11a, entera:**
  - el cliente de la API, con el CSRF, `X-Taller-User`, los errores `{message, code}`, el reintento del 419, el 409 `account_mismatch`, el `Retry-After` y las respuestas que no son JSON;
  - el estado de la sesión, con `user.role` y `features`;
  - «pedir el ingreso» ante un 401;
  - la raíz de la cuenta y el diálogo «Tu cuenta», donde va la entrada (Q1, A);
  - React Hook Form, que F11a instala con permiso;
  - el doble de la API de los E2E;
  - la pila de DOM de Vitest (`jsdom`, Testing Library y fishery), si F11a llega antes que F3.

  No alcanza con el cliente y la sesión: sin la raíz y el diálogo no hay dónde montar la administración, y sin el doble no hay E2E.
- **F11b:** no hace falta. Comparte con F12 el pedido de la contraseña: F11 dice que conviene moverlo a un lugar compartido cuando aparezca el segundo uso, así que **el que llegue segundo entre F11b y F12a lo mueve**.
- **F11c:** no le cambia nada a F12. Pedir el enlace por correo es de la propia cuenta.
- **F11d:** no le cambia nada.
- **C3c:** le cambia a F12b lo que hace con `features.passwordReset: true` («Las invitaciones antes y después de C3c»).
- **C4:** según Q2. **[NEEDS CLARIFICATION: Q2, si C4 espera a F12a]** Con el borrador (A), C4 espera a F12a, y F12 deja de ser un ítem que no bloquea a nadie.
- **F10:** no es una dependencia. Decide si la administración sigue como diálogo o pasa a ser una ruta.

## Dónde vive la administración (borrador con Q1, A)

Esta sección fija la responsabilidad y el contrato. Los nombres de módulos son provisionales y los confirma el plan: por ejemplo, la página en `pages/admin`, sobre el cliente de `shared/api` y la sesión de `entities/session` de F11a.

- **Quién la ve.** El front sabe el rol por `GET /api/session`: la cuenta publicada trae `{id, name, email, role, privacyAccepted}` (`backend/api/app/Auth/PublishedUser.php`; contrato de C3a). `features` sólo trae `passwordReset` y `registration`, y no dice nada del rol. Con `role: "admin"`, «Tu cuenta» muestra «Administrar el taller»; con cualquier otro rol, ese elemento no existe.
- **El servidor es la autoridad.** Ocultar la entrada no protege nada: toda ruta de `/api/admin` exige sesión, el email verificado y el rol admin, y responde 403 `forbidden` a cualquier otro (C3b FR-031). El código de la administración viaja a todos en el mismo `dist/index.html` hasta que C4 retire `vite-plugin-singlefile`. No trae secretos: sólo nombra rutas que ya publican los contratos.
- **Qué ve un alumno que llega por URL.** No hay URL: con el borrador, la administración no tiene una forma de URL propia, así que no hay nada a qué llegar. Si un alumno pide `/api/admin` por su cuenta, recibe 403.
- **Si la cuenta pierde el rol con la administración abierta.** El servidor lee el rol en cada pedido, así que el siguiente responde 403 `forbidden`. La administración muestra el mensaje, explica que la cuenta puede haber perdido el rol y ofrece «Recargar». La recarga arranca el taller con la sesión vigente, ya sin la entrada.
- **El montaje.** «Administrar el taller» cierra «Tu cuenta» y abre la administración: un diálogo modal que ocupa la pantalla entera en todos los anchos, dibujado por la raíz de la cuenta, fuera de `#main` y de `.app-shell`. No cambia la URL, la vista ni el historial. Tiene dos secciones, «Cuentas» e «Invitaciones», y abre en «Cuentas».
- **Los diálogos.** Sobre la administración se abre como mucho un diálogo a la vez: la confirmación de una acción, el pedido de la contraseña o el ingreso de F11a ante un 401. Si una acción ya confirmada recibe un 423, la contraseña se pide en el mismo diálogo de la confirmación. Si recibe un 401, la confirmación se cierra diciendo que no se hizo ningún cambio (un 401 no llega a la acción), y recién entonces aparece el ingreso. Con la misma cuenta, la administración sigue donde estaba, y la acción se vuelve a pedir a mano.
- **Cómo se cierra.** Con «Cerrar» o con Esc, el foco vuelve a la entrada «Tu cuenta» de la barra superior, y el shell queda como estaba. Si hay enlaces a la vista, primero pide confirmación (FR-031).
- **Qué deja en el documento.** Con la administración cerrada, nada: ni elementos en el shell ni regiones `alert` o `status`. La red ubica el error de la compuerta con `getByRole('alert')` (FR-076 de F11).
- **F10** decide si pasa a ser una ruta de la raíz única o sigue como diálogo. La página no cambia; cambia el punto de montaje.

## Las invitaciones antes y después de C3c

**Antes de C3c (F12a):**

- El taller no tiene correo, y `features.passwordReset` vale `false`. Esa bandera también dice si hay correo (C3c FR-008).
- Las tres rutas que pedirían un correo responden siempre 503 `mail_unavailable` (C3b FR-056): la invitación con `delivery: "email"`, el reenvío por correo y la recuperación de un tercero. F12a no las ofrece.
- Cada invitación sale como un enlace `<APP_URL>/#invitacion=<token>`, que llega en la respuesta una sola vez y nunca vuelve a aparecer: la lista no trae tokens. Quien administra lo copia y lo entrega.
- Si alguien pierde su enlace, «Reenviar» genera otro y el anterior deja de valer.
- Para recuperar el acceso de alguien, la administración dice que el enlace sale por la consola: `taller:password-reset-link`.

**Con C3c (F12b; lo que se toma de C3c es un supuesto hasta que tenga plan):**

- Con `features.passwordReset: true`, «Invitar» ofrece elegir la entrega: por correo o con enlace.
- **Por correo,** la respuesta no trae el enlace: `created` y `renewed` dicen que el correo sale. Un admin manda como mucho 300 correos por día, y pasado el tope, cada email recibe `rate_limited` (C3c FR-057 (a)).
- **La lista** muestra si una invitación por correo salió (`sentAt`, «entregada al proveedor») o no salió (`sendFailedAt`) (C3c FR-007).
- **«Reenviar»** ofrece «Reenviar por correo» o «Pasar a enlace». Esta última es la que ya funciona desde C3b.
- **Las cuentas de alumnos activos** ofrecen «Mandarle un enlace para elegir contraseña», que responde 202 sin devolver el enlace (C3b FR-036, C3c FR-057 (b)). A un admin no se le ofrece, porque su recuperación es sólo por consola (Q5 de C3c).
- **Un 503 `mail_unavailable`** igual puede llegar, por ejemplo si la configuración cambió. Se muestra el mensaje del servidor con el camino del enlace.

## Acciones, endpoints y estados

Cada fila dice qué pide, si el servidor exige la contraseña reconfirmada (423) y qué errores son propios de la acción. La fuente es el contrato HTTP de C3b, contrastado con los controladores y las pruebas de `master` (`e87772d`).

| Acción (parte) | Endpoint | Contraseña (423) | Confirmación | Mientras espera | Éxito | Errores propios |
| --- | --- | --- | --- | --- | --- | --- |
| Ver las cuentas (F12a) | `GET /api/admin/users` (`page`, `perPage=25`, `q`, `role`, `status`) | No | — | «Cargando las cuentas…» | La página y «Página {n} de {m} · {total} cuentas» | 422 de un parámetro, en el error general |
| Deshabilitar (F12a) | `PATCH /api/admin/users/{id}` `{status: "disabled"}` | Sí | Sí | «Deshabilitando…» | La fila, en «Deshabilitada» | 422 `errors.status` (la propia cuenta, o una que se está borrando); 409 `last_admin`; 404 |
| Rehabilitar (F12a) | `PATCH /api/admin/users/{id}` `{status: "active"}` | Sí | Sí | «Rehabilitando…» | La fila, en «Activa» | 422 `errors.status` (se está borrando); 404 |
| Hacer admin (F12a) | `PATCH /api/admin/users/{id}` `{role: "admin"}` | Sí | Sí | «Guardando…» | La fila, con «Admin» | 422 `errors.role` (se está borrando); 404 |
| Quitar admin (F12a) | `PATCH /api/admin/users/{id}` `{role: "student"}` | Sí | Sí | «Guardando…» | La fila, con «Alumno» | 422 `errors.role` (la propia cuenta, o una que se está borrando); 409 `last_admin`; 404 |
| Borrar la cuenta (F12a) | `DELETE /api/admin/users/{id}` | Sí | Sí, con una casilla | «Borrando…» | 202: el mensaje del servidor y la fila en «Borrándose» | 409 `last_admin`; 404 |
| Ver las invitaciones (F12a) | `GET /api/admin/invitations` (`page`, `perPage=25`, `role`, `state`) | No | — | «Cargando las invitaciones…» | La página, con las de admin vigentes primero | 422 de un parámetro |
| Invitar (F12a) | `POST /api/admin/invitations` `{emails, role, delivery: "link"}` | Sólo con `role: "admin"` | No: el formulario es el pedido | «Creando…» | 200: un resultado por email, en orden | 422 `errors.emails`, `errors.emails.<n>`, `errors.role` y `errors.delivery` |
| Reenviar (F12a) | `POST /api/admin/invitations/{id}/resend` `{delivery: "link"}` | Sólo si la invitación es de admin | Sí | «Generando…» | 200: el enlace nuevo, una vez | 404 (la aceptaron o la revocaron) |
| Revocar (F12a) | `DELETE /api/admin/invitations/{id}` | No | Sí | «Revocando…» | 204: sale de la lista | 404 |
| Confirmar la contraseña (F12a) | `POST /api/auth/confirm-password` `{password}` | — | — | «Confirmando…» | 201: la acción se repite una vez | 422 `auth_failed`; 429 (5 por minuto, o la cuenta bloqueada) con `Retry-After` |
| Invitar por correo (F12b) | `POST /api/admin/invitations` `{…, delivery: "email"}` | Sólo con `role: "admin"` | No | «Creando…» | `created` o `renewed` sin enlace; `rate_limited` | 503 `mail_unavailable`; los 422 de invitar |
| Reenviar por correo o pasar a enlace (F12b) | `POST /api/admin/invitations/{id}/resend` `{delivery: "email" \| "link"}` | Sólo si es de admin | Sí | «Generando…» | El correo sale, o el enlace nuevo una vez | 503; 404 |
| Mandar el enlace de recuperación (F12b) | `POST /api/admin/users/{id}/password-reset` | Sí | Sí | «Mandando…» | 202, sin el enlace | 422 `errors.user` (es admin o no está activa); 503; 404 |

**Los errores comunes** a todas las filas salen por el cliente de F11a, salvo el 403 `forbidden`, el 404 y el 429 propio, que son de F12:

- **401** `unauthenticated`: «pedir el ingreso», sin cerrar la administración.
- **403** `forbidden`: FR-002.
- **403** `account_disabled`: vuelve al acceso, como en F11a.
- **403** `email_unverified`: el mensaje del servidor.
- **409** `account_mismatch`: «Recargar».
- **419**: renueva y reintenta una vez, como en F11a.
- **429** del límite de la administración (120 pedidos por minuto por usuario), con `Retry-After`.
- **Un 5xx, una respuesta que no es JSON o una falla de red:** el mensaje común.

**Qué acciones ofrece cada fila de «Cuentas»:**

| Cuenta | Acciones |
| --- | --- |
| La propia, marcada «(vos)» | Ninguna. La propia cuenta se borra desde «Tu cuenta» (F11b); deshabilitarse o degradarse a sí mismo es 422 |
| Una que se está borrando | Ninguna: la purga ya está corriendo (C3b, Edge Cases) |
| Una activa | Deshabilitar; Hacer admin o Quitar admin, según su rol; Borrar. Con F12b, a un alumno también: Mandar el enlace de recuperación |
| Una deshabilitada | Rehabilitar; Hacer admin o Quitar admin, según su rol; Borrar |

## Textos que lee quien administra

Son propuestas, para que el usuario las corrija. «(servidor)» marca un mensaje que manda la API (`backend/api/lang/es/`) y que el front muestra sin cambios.

**Entrada y diálogo**

- En «Tu cuenta», sólo para admins, el botón «Administrar el taller».
- El diálogo, con el título «Administración», las secciones «Cuentas» e «Invitaciones» y el botón «Cerrar».

**Cuentas**

- La búsqueda «Buscar por nombre o email», con el botón «Buscar».
- Los filtros:
  - «Rol»: «Todos», «Admin» y «Alumno»;
  - «Estado»: «Todos», «Activa», «Deshabilitada» y «Borrándose».
- La tabla, con el título «Cuentas del taller, por nombre» y las columnas «Nombre», «Email», «Rol», «Estado», «Alta» y «Acciones».
- Las marcas:
  - «(vos)», en la propia cuenta;
  - «Sin verificar», cuando el email no está verificado.
- La paginación: «Anterior», «Siguiente» y «Página {n} de {m} · {total} cuentas».
- Sin resultados: «No hay cuentas con esa búsqueda o esos filtros.», con «Limpiar los filtros».
- Si no carga: «No pudimos cargar las cuentas.», con «Reintentar».
- Los botones de cada fila nombran a la persona: «Deshabilitar a {nombre}», «Rehabilitar a {nombre}», «Hacer admin a {nombre}», «Quitar admin a {nombre}» y «Borrar la cuenta de {nombre}».

**Confirmaciones de las cuentas**

- **Deshabilitar:**
  - título: «¿Deshabilitar la cuenta de {nombre}?»;
  - texto: «No va a poder entrar, y su sesión abierta deja de funcionar en el próximo pedido. Sus ejecuciones en curso se cancelan, y su enlace de recuperación, si tenía uno, deja de valer. La podés rehabilitar cuando quieras.»;
  - si es admin, además: «Las invitaciones pendientes que creó se borran.»;
  - botón «Deshabilitar»; al terminar, «La cuenta de {nombre} quedó deshabilitada.».
- **Rehabilitar:**
  - título: «¿Rehabilitar la cuenta de {nombre}?»;
  - texto: «Vuelve a poder entrar con su contraseña.»;
  - botón «Rehabilitar»; al terminar, «La cuenta de {nombre} está activa otra vez.».
- **Hacer admin:**
  - título: «¿Darle el rol de admin a {nombre}?»;
  - texto: «Va a poder administrar las cuentas y las invitaciones del taller, como vos.»;
  - botón «Hacer admin»; al terminar, «{nombre} ahora es admin.».
- **Quitar admin:**
  - título: «¿Quitarle el rol de admin a {nombre}?»;
  - texto: «Deja de poder administrar el taller. Las invitaciones pendientes que creó se borran.»;
  - botón «Quitar admin»; al terminar, «{nombre} ya no es admin.».
- **Borrar la cuenta:**
  - título: «¿Borrar la cuenta de {nombre}?»;
  - texto: «Se borra la cuenta con todo lo que guardó en el servidor: el progreso, los intentos, el código y las importaciones. No se puede deshacer, y las copias de seguridad lo conservan un tiempo (el aviso de privacidad dice cuánto). Si la persona quiere sus datos, que los descargue antes desde «Tu cuenta».»;
  - casilla «Entiendo que no se puede deshacer.» y botón «Borrar la cuenta»;
  - al terminar, el mensaje del servidor: «Se está borrando la cuenta con todo lo que guardó: el progreso, los intentos, el código y las importaciones. No se puede deshacer.» (servidor).
- **Si el servidor frena el cambio para no quedarse sin admin:** «Tiene que quedar al menos un admin activo.» (servidor).

**Invitaciones**

- El formulario «Invitar»:
  - el campo «Emails», con la ayuda «Uno por línea. Hasta 100 por vez.»;
  - el campo «Rol»: «Alumno» (por omisión) o «Admin», con la ayuda «Una invitación de admin vence a las 48 horas; la de un alumno, a los 7 días.»;
  - el botón «Crear las invitaciones», que mientras espera dice «Creando…».
- Sin correo: «El taller todavía no manda correos: copiá cada enlace y entregáselo a su persona.».
- El resultado:
  - el título «Resultado» y el aviso «Copiá los enlaces ahora: no se vuelven a mostrar. Si perdés uno, generá otro con «Reenviar»; el anterior deja de valer.»;
  - `created`: «Invitación creada. Vence el {fecha}.»;
  - `renewed`: «Tenía una invitación vencida: la renovamos. Vence el {fecha}.»;
  - `user_exists`: «Ya tiene una cuenta.»;
  - `invitation_pending`: «Ya tiene una invitación vigente. Si perdió el enlace, generá otro con «Reenviar».».
- Los botones:
  - «Copiar», en cada enlace, y «Copiar todos los enlaces»;
  - al copiar, «Copiado.»;
  - si no se puede copiar: «No pudimos copiar: seleccioná el enlace y copialo a mano.»;
  - «Listo», que cierra el resultado.
- Al cerrar con enlaces a la vista: «¿Cerrar? Los enlaces no se vuelven a mostrar.», con «Cerrar igual» y «Volver».
- La lista:
  - el título «Invitaciones» y las columnas «Email», «Rol», «Vence», «Creada por» y «Acciones»;
  - las marcas «Admin pendiente» y «Vencida»;
  - sin autor: «Consola o cuenta borrada»;
  - los filtros «Rol» y «Estado»: «Todas», «Vigentes» y «Vencidas».
- **Reenviar:**
  - título: «¿Generar un enlace nuevo para {email}?»;
  - texto: «El enlace anterior deja de valer. El nuevo vence en 7 días, o en 48 horas si la invitación es de admin.»;
  - botón «Generar el enlace».
- **Revocar:**
  - título: «¿Revocar la invitación de {email}?»;
  - texto: «El enlace deja de valer, y nadie puede crear la cuenta con él.»;
  - botón «Revocar»; al terminar, «Revocamos la invitación de {email}.».
- Sin correo, sobre la recuperación: «Para recuperar el acceso de alguien, generá el enlace con la consola del taller (`taller:password-reset-link`).».

**Contraseña**

- «Confirmá tu contraseña para seguir», con el campo «Tu contraseña» y el botón «Confirmar».
- La ayuda «Durante 15 minutos no te la vamos a volver a pedir.».
- Con la contraseña equivocada: «La contraseña no es correcta.». El mensaje del servidor (`auth_failed`) habla de un email, y este formulario no tiene ese campo (hallazgo 3 de F11 sobre C3a).
- Al cancelar: «No se hizo ningún cambio.».

**Errores propios de F12**

- **Ante un 403 `forbidden`:** «No tenés permiso para hacer esto.» (servidor), seguido de «Puede que tu cuenta ya no tenga el rol de admin. Recargá la página.», con el botón «Recargar».
- **Ante un 404:**
  - en una cuenta: «Esa cuenta ya no existe.»;
  - en una invitación: «Esa invitación ya no existe: puede que la hayan aceptado o revocado.».
- **Ante un límite:** «Demasiados intentos. Esperá un momento antes de volver a probar.» (servidor), seguido de «Podés volver a intentar en {tiempo}.».

**Con correo (F12b)**

- La entrega: «Por correo» o «Enlace para copiar».
- Una invitación por correo: «Le llega por correo.».
- `rate_limited`: «No salió: llegaste al tope de 300 correos por día. Probá mañana o usá un enlace.».
- En la lista:
  - «Entregada al proveedor el {fecha}.»;
  - «No salió: reenviala o pasala a enlace.».
- «Reenviar por correo» y «Pasar a enlace».
- La recuperación:
  - la acción «Mandarle un enlace para elegir contraseña»;
  - al terminar, «Le mandamos un enlace a {email}. Vence en 60 minutos.».
- Sin correo disponible: «El taller no puede mandar correos por ahora.» (servidor), seguido de «Usá un enlace para copiar.».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invitar a un grupo con enlaces (Priority: P1) · F12a

Quien administra arma el aula: pega la lista de emails, elige el rol, crea las invitaciones de una vez y copia los enlaces para entregarlos. Algunos emails ya tienen cuenta o una invitación vigente, y la pantalla lo dice en cada caso.

**Why this priority**: sin esto, cada alta pasa por la consola, de a una. Es el primer uso del taller con gente real.

**Independent Test**: con el doble de la API y una sesión de admin, invitar un lote que mezcle los cuatro resultados, copiar un enlace y todos juntos, y provocar el 422 de un email repetido.

**Acceptance Scenarios**:

1. **Dado** un admin en «Invitaciones», **cuando** pega 40 emails, uno por línea, y crea las invitaciones con el rol «Alumno», **entonces** sale un solo `POST /api/admin/invitations` con los 40 en el orden escrito, `role: "student"` y `delivery: "link"`, y se ven 40 resultados en el orden de la respuesta.
2. **Dada** una respuesta con `created`, `renewed`, `user_exists` e `invitation_pending`, **cuando** se muestra, **entonces** cada email lleva su texto. Sólo los dos primeros traen su enlace y su vencimiento, y cada enlace se ve en un campo de sólo lectura con «Copiar».
3. **Dados** varios enlaces, **cuando** usa «Copiar todos los enlaces», **entonces** el portapapeles tiene un renglón por invitación, con el email y el enlace, y la pantalla anuncia «Copiado.».
4. **Dados** `Ana@X.com` y `ana@x.com` en el mismo lote, **cuando** el servidor responde 422 con `errors["emails.1"]`, **entonces** el campo de los emails muestra el mensaje del servidor precedido por el segundo email enviado, queda con `aria-invalid` y recibe el foco.
5. **Dado** un lote con el rol «Admin» sin la contraseña reconfirmada, **cuando** el servidor responde 423, **entonces** se pide la contraseña y, con un 201, el lote se reenvía una sola vez y se ven sus resultados.
6. **Dados** enlaces a la vista, **cuando** el admin aprieta Esc o «Cerrar», **entonces** se le pregunta si quiere cerrar igual, porque los enlaces no se vuelven a mostrar.
7. **Dada** una falla de red al crear las invitaciones, **cuando** pasa, **entonces** el botón deja de decir «Creando…», se ve el mensaje común y los emails siguen escritos.

*Cubre: FR-024 a FR-031, FR-034 a FR-036, FR-042, FR-043 y FR-055; SC-001.*

---

### User Story 2 - Ver y mantener las invitaciones (Priority: P1) · F12a

Quien administra ve qué invitaciones siguen vigentes, cuáles vencieron y quién las creó. Las de admin pendientes se destacan. Si alguien perdió su enlace, genera otro; si una invitación sobra, la revoca.

**Why this priority**: un enlace que se ve una sola vez se pierde. Sin reenviar ni revocar, la invitación vieja queda viva y el alumno no entra.

**Independent Test**: con el doble, listar invitaciones con una de admin vigente, una vencida y una creada por consola; reenviar y revocar; provocar un 404.

**Acceptance Scenarios**:

1. **Dada** una lista con una invitación de admin vigente, **cuando** se abre «Invitaciones», **entonces** esa invitación va primero, con la marca «Admin pendiente» en texto, y la de autor `null` dice «Consola o cuenta borrada».
2. **Dada** una invitación de alumno, **cuando** el admin confirma «Reenviar», **entonces** sale `POST /api/admin/invitations/{id}/resend` con `delivery: "link"`, se ve el enlace nuevo con las mismas reglas que al invitar, y la lista se vuelve a pedir.
3. **Dada** una invitación, **cuando** el admin confirma «Revocar», **entonces** sale `DELETE /api/admin/invitations/{id}`, y con un 204 la invitación sale de la lista y el foco va al título de la tabla.
4. **Dada** una invitación que otra persona aceptó en el medio, **cuando** la acción responde 404, **entonces** se ve «Esa invitación ya no existe…» y la lista se vuelve a pedir.

*Cubre: FR-006, FR-021 a FR-023, FR-032 a FR-034 y FR-040; SC-003.*

---

### User Story 3 - Gestionar las cuentas sin quedarse sin admin (Priority: P1) · F12a

Quien administra busca una cuenta, la deshabilita o la rehabilita y le da o le quita el rol de admin. La propia cuenta no ofrece esas acciones, y si dos admins se cruzan y el cambio dejaría al taller sin admin, el servidor lo frena y la pantalla lo explica.

**Why this priority**: es lo que la consola no hace y lo que hace falta ante una cuenta comprometida (Q2).

**Independent Test**: con el doble, buscar, filtrar y paginar; deshabilitar y rehabilitar; promover y degradar; provocar un 409 `last_admin`, un 422 por una cuenta que se está borrando y un 429.

**Acceptance Scenarios**:

1. **Dado** un admin en «Cuentas», **cuando** escribe «ana» en la búsqueda, **entonces** no sale ningún pedido hasta que la envía, y entonces sale `GET /api/admin/users` con `q=ana`, `page=1` y `perPage=25`.
2. **Dada** la lista, **cuando** se ve la fila propia y la de una cuenta que se está borrando, **entonces** la primera dice «(vos)» y ninguna de las dos ofrece acciones.
3. **Dada** una alumna activa, **cuando** el admin confirma «Deshabilitar», **entonces** sale `PATCH /api/admin/users/{id}` con `{status: "disabled"}`, y con un 200 la fila pasa a «Deshabilitada» con la cuenta que devolvió el servidor, se anuncia el cambio y el foco vuelve al botón de la fila.
4. **Dados** dos admins que se quitan el rol uno al otro a la vez, **cuando** el servidor responde 409 `last_admin` al segundo pedido, **entonces** su diálogo muestra «Tiene que quedar al menos un admin activo.», la fila no cambia y la página se vuelve a pedir.
5. **Dada** una página 3 de 3 que quedó vacía porque se borraron cuentas, **cuando** llega `data: []` con `lastPage: 2`, **entonces** la lista pide la página 2 una sola vez.
6. **Dada** una búsqueda sin resultados, **cuando** la página 1 llega vacía, **entonces** se ve «No hay cuentas con esa búsqueda o esos filtros.» con «Limpiar los filtros»; **y dado** un pedido que falla, se ve «No pudimos cargar las cuentas.» con «Reintentar», sin perder la búsqueda.
7. **Dado** un 429 con `Retry-After: 30` en una acción, **cuando** llega, **entonces** se ve el mensaje del servidor con «Podés volver a intentar en 30 segundos.», y el botón no se habilita antes.

*Cubre: FR-009 a FR-016, FR-018, FR-020 y FR-041; SC-005.*

---

### User Story 4 - Borrar la cuenta de otra persona (Priority: P2) · F12a

Una persona pide que borren su cuenta, o se va del aula, y quien administra la borra sabiendo qué se pierde y que no se deshace.

**Why this priority**: es el derecho de supresión (Ley 25.326, art. 16) cuando la persona no lo hace sola desde «Tu cuenta». Ocurre poco.

**Independent Test**: con el doble, borrar una cuenta con la casilla sin marcar y marcada, y provocar un 409 `last_admin`.

**Acceptance Scenarios**:

1. **Dado** «Borrar la cuenta de Beto», **cuando** se abre la confirmación, **entonces** el botón «Borrar la cuenta» no se habilita hasta marcar «Entiendo que no se puede deshacer.».
2. **Dada** la casilla marcada, **cuando** confirma, **entonces** sale `DELETE /api/admin/users/{id}`, y con un 202 se ve el mensaje del servidor y la fila en «Borrándose», sin acciones.
3. **Dados** dos admins que se borran uno al otro a la vez, **cuando** el segundo pedido recibe 409 `last_admin`, **entonces** se ve su mensaje y la fila no cambia.

*Cubre: FR-015, FR-017, FR-019 y FR-020.*

---

### User Story 5 - Sólo un admin ve la administración, y el servidor manda (Priority: P1) · F12a

Un alumno usa el taller sin enterarse de que existe la administración. Un admin la encuentra en «Tu cuenta». Si la cuenta pierde el rol mientras la usa, el siguiente pedido lo dice.

**Why this priority**: protege la red de F1 y deja claro que la autoridad es el servidor.

**Independent Test**: con el doble, abrir «Tu cuenta» con una sesión de alumno y con una de admin; responder 403 `forbidden` y 401 a pedidos de la administración.

**Acceptance Scenarios**:

1. **Dada** una sesión con `role: "student"`, **cuando** abre «Tu cuenta», **entonces** no existe «Administrar el taller» en el documento, y en toda la sesión el navegador hace 0 pedidos a `/api/admin`.
2. **Dada** una sesión con `role: "admin"`, **cuando** usa «Administrar el taller», **entonces** «Tu cuenta» se cierra, se abre la administración a pantalla entera en «Cuentas», sin cambiar la URL ni el historial, y el foco va a su título.
3. **Dada** la administración abierta, **cuando** el admin aprieta Esc, **entonces** se cierra, el foco vuelve a «Tu cuenta» y la vista del shell sigue donde estaba.
4. **Dada** una cuenta que perdió el rol en el medio, **cuando** un pedido responde 403 `forbidden`, **entonces** se ve el mensaje del servidor, la explicación y «Recargar», y no sale ningún reintento.
5. **Dada** la sesión vencida y una confirmación abierta, **cuando** la acción recibe 401, **entonces** la confirmación se cierra con «No se hizo ningún cambio.», se abre el ingreso de F11a sin cerrar la administración y, si entra la misma cuenta, la administración sigue donde estaba.

*Cubre: FR-001 a FR-005, FR-007, FR-008, FR-039 y FR-060; SC-002.*

---

### User Story 6 - La contraseña reconfirmada (Priority: P2) · F12a

Quien administra encadena varios cambios. La primera acción sensible le pide la contraseña, y las siguientes, durante 15 minutos, no.

**Why this priority**: sin esto, cada acción sensible termina en un 423 sin salida. Tiene P2 porque depende de Q3.

**Independent Test**: con el doble, responder 423 a la primera acción y 200 después; equivocar la contraseña; cancelar; agotar el límite de la confirmación.

**Acceptance Scenarios**:

1. **Dada** una confirmación de «Deshabilitar», **cuando** el servidor responde 423, **entonces** el mismo diálogo pide la contraseña. Con «Confirmar» sale `POST /api/auth/confirm-password` y, con un 201, el `PATCH` se repite exactamente una vez.
2. **Dada** una segunda acción sensible a los pocos minutos, **cuando** el servidor la acepta sin 423, **entonces** no se pide la contraseña.
3. **Dada** una contraseña equivocada, **cuando** el servidor responde 422 `auth_failed`, **entonces** el campo dice «La contraseña no es correcta.» y no se repite la acción.
4. **Dado** el pedido de la contraseña, **cuando** el admin cancela, **entonces** no sale la acción y se ve «No se hizo ningún cambio.».

*Cubre: FR-005 y FR-036 a FR-038; SC-004.*

---

### User Story 7 - Invitar y recuperar por correo (Priority: P3) · F12b

Cuando el taller manda correo, las invitaciones pueden salir por correo, la lista dice cuáles no salieron y quien administra le manda a un alumno un enlace para elegir otra contraseña.

**Why this priority**: espera a C3c, y C3c espera el dominio. Hasta entonces, los enlaces y la consola cubren lo mismo.

**Independent Test**: con el doble y `features.passwordReset` en `false` y en `true`, recorrer los cuatro caminos de correo y el 503.

**Acceptance Scenarios**:

1. **Dado** `features.passwordReset: false`, **cuando** se abre la administración, **entonces** no hay ninguna opción de correo ni la acción de recuperación, y se ven los textos de «Sin correo».
2. **Dado** `features.passwordReset: true`, **cuando** el admin invita por correo, **entonces** sale `delivery: "email"`, y los resultados `created` y `renewed` dicen «Le llega por correo.», sin enlace.
3. **Dada** una invitación con `sendFailedAt`, **cuando** se ve en la lista, **entonces** dice «No salió…» y ofrece «Reenviar por correo» y «Pasar a enlace».
4. **Dada** una alumna activa, **cuando** el admin confirma «Mandarle un enlace para elegir contraseña», **entonces** sale `POST /api/admin/users/{id}/password-reset`, y con un 202 se ve que el enlace salió y vence en 60 minutos.
5. **Dado** un 503 `mail_unavailable`, **cuando** llega, **entonces** se ve el mensaje del servidor con el camino del enlace, y ninguna invitación se da por creada.

*Cubre: FR-035 y FR-044 a FR-049; SC-008.*

Los transversales (FR-050 a FR-061) valen para todas las historias. Sus criterios son SC-006, SC-007 y SC-009.

---

### Edge Cases

- **Dos admins a la vez.** La lista puede quedar vieja. El servidor decide (404, 409 o 422), la pantalla lo explica y vuelve a pedir la página. Después de cada acción, la fila se actualiza con lo que devuelve el servidor.
- **El último admin.** Un admin activo no puede dejar al taller sin admin actuando sobre otro, porque él mismo sigue activo. El 409 `last_admin` aparece cuando dos admins se cruzan (se degradan o se borran uno al otro a la vez), y deshabilitarse o degradarse a sí mismo es 422, que la pantalla ni siquiera ofrece.
- **Una cuenta que pierde el rol con la administración abierta.** El siguiente pedido responde 403 `forbidden` (FR-002). Una cuenta promovida, en cambio, ve la entrada recién al recargar, porque el rol sale de la sesión del arranque.
- **Una cuenta deshabilitada con la administración abierta** (por otro admin). El siguiente pedido responde 403 `account_disabled`, y el cliente de F11a vuelve al acceso.
- **La sesión vence** (30 minutos sin uso u 8 horas). El próximo pedido recibe 401. Si había una confirmación abierta, se cierra diciendo que no se hizo ningún cambio, y «pedir el ingreso» se abre sin perder la administración (FR-005). Si entra otra cuenta, se recarga.
- **La confirmación de la contraseña vence en medio de una tanda.** Llega otro 423 y se vuelve a pedir (FR-036).
- **Recargar con enlaces a la vista.** Se pierden. No hay forma de evitarlo sin guardarlos, y no se guardan (FR-008). El aviso del resultado lo dice, y «Reenviar» genera otro enlace.
- **El portapapeles no está disponible.** La API del portapapeles exige un origen seguro: `localhost` lo es, pero una IP de la red por HTTP, antes de C4, no. También puede faltar el permiso. El enlace queda seleccionable, con la instrucción para copiarlo a mano (FR-030).
- **Emails que parecen distintos y el servidor toma como el mismo** (mayúsculas, espacios, formas Unicode). El servidor los canonicaliza y responde `emails.<n>` con el segundo. La pantalla nombra el email enviado en esa posición (FR-027).
- **Un lote de 101 emails.** El cliente lo frena antes de enviar (FR-025). Si igual llega uno, el servidor responde 422 en `emails`.
- **Escribir rápido en la búsqueda.** No sale un pedido por tecla: el límite es de 120 por minuto por usuario (FR-010).
- **Una página que queda vacía después de borrar o revocar.** La lista pide la última página con resultados una vez (FR-012).
- **Una invitación vencida.** Se ve con «Vencida» y se puede reenviar: el servidor la rota igual (contrato de C3b). Las vencidas se podan 30 días después de vencer (`config/taller.php`).
- **Una invitación aceptada** desaparece de la lista: es de un solo uso.
- **Una invitación con rol de admin.** Pide la contraseña al crearla y al reenviarla, pero no al revocarla (`PasswordConfirmMatrixTest.php`).
- **Borrar una cuenta que ya se está borrando.** La pantalla no lo ofrece. Si la lista estaba vieja, el servidor responde 202 igual y la fila queda en «Borrándose».
- **Nginx responde sin JSON** (un 502 con la API caída o un 504). Se ve el mensaje común, y lo escrito se conserva.
- **El almacenamiento bloqueado.** F12 no guarda nada en el navegador, así que funciona igual.
- **Antes de A3.** La administración funciona igual: no lee el contenido, sólo la sesión.

## Requirements *(mandatory)*

### Functional Requirements

**Entrada, montaje y protección (F12a)**

- **FR-001**: La entrada «Administrar el taller» DEBE aparecer en «Tu cuenta» sólo cuando la sesión trae `user.role: "admin"`. Con otro rol, o sin sesión, NO DEBE existir en el documento. *(C3a, `GET /api/session`; `PublishedUser`)*
- **FR-002**: Ante un 403 `forbidden` en cualquier pedido de la administración, DEBE mostrar el mensaje del servidor, explicar que la cuenta puede haber perdido el rol de admin y ofrecer «Recargar», sin reintentar: el servidor es la autoridad, y ocultar la entrada no protege nada. *(C3b FR-031)*
- **FR-003**: La administración DEBE abrirse como un diálogo modal propio, que ocupa la pantalla entera en todos los anchos, dibujado por la raíz de la cuenta de F11a, fuera de `#main` y de `.app-shell`, sin cambiar la URL, la vista ni el historial. **[NEEDS CLARIFICATION: Q1, dónde se monta la administración]**
- **FR-004**: Abrir la administración DEBE cerrar «Tu cuenta». Cerrarla, con su botón o con Esc, DEBE devolver el foco a la entrada «Tu cuenta» y dejar el shell como estaba, sin recargar.
- **FR-005**: Sobre la administración DEBE haber como mucho un diálogo a la vez: una confirmación, el pedido de la contraseña o el ingreso de F11a ante un 401. Si una acción ya confirmada recibe un 423, la contraseña DEBE pedirse en el mismo diálogo de la confirmación. Si recibe un 401 (también en la confirmación de la contraseña o en el reintento), ese diálogo DEBE cerrarse diciendo que no se hizo ningún cambio antes de pedir el ingreso.
- **FR-006**: Al cerrarse un diálogo, el foco DEBE volver al control que lo abrió o, si ese control ya no existe (porque la fila salió de la lista), al título de su tabla.
- **FR-007**: Con la administración cerrada, F12 NO DEBE dejar nada en el documento: ni elementos nuevos en el shell (la barra lateral, la barra superior, la navegación), ni regiones `alert` o `status`. *(F11 FR-076)*
- **FR-008**: Los nombres, los emails y los enlaces de la administración NO DEBEN guardarse en `localStorage`, `sessionStorage`, una cookie propia, la URL, el historial ni un estado global, ni escribirse en la consola: viven en la memoria del diálogo y se descartan al cerrarlo.

**Cuentas (F12a)**

- **FR-009**: «Cuentas» DEBE listar con `GET /api/admin/users`, de a 25 y en el orden por omisión de la API (por nombre), con el nombre, el email, el rol, el estado, la fecha de alta en la hora local y la marca «Sin verificar» cuando `emailVerified` es `false`. *(C3b FR-032)*
- **FR-010**: DEBE buscar por nombre o email, con hasta 80 caracteres, al enviar la búsqueda y nunca en cada tecla, porque el límite es de 120 pedidos por minuto por usuario. *(contrato de C3b; `throttle:admin`)*
- **FR-011**: DEBE filtrar por rol (admin o alumno) y por estado (activa, deshabilitada o borrándose), combinar los filtros con la búsqueda y volver a la primera página al cambiar cualquiera de ellos.
- **FR-012**: DEBE paginar con «Anterior» y «Siguiente» y decir la página, el total de páginas y el de cuentas (`meta`). Si una página que no es la primera llega vacía, DEBE pedir `lastPage` una sola vez.
- **FR-013**: Sin resultados, DEBE decirlo y ofrecer limpiar la búsqueda y los filtros.
- **FR-014**: En las dos secciones, mientras la lista carga, DEBE decirlo. Si no carga, DEBE ofrecer «Reintentar» sin perder la búsqueda, los filtros ni la página.
- **FR-015**: Cada fila DEBE ofrecer sólo las acciones que le corresponden según la tabla «Qué acciones ofrece cada fila»: la propia cuenta, marcada «(vos)», y una cuenta que se está borrando no ofrecen ninguna.
- **FR-016**: Deshabilitar, rehabilitar, hacer admin y quitar admin DEBEN pedir confirmación con el texto que dice qué cambia, y recién entonces llamar a `PATCH /api/admin/users/{id}` con `status` o `role`. *(C3b FR-033 y FR-035)*
- **FR-017**: Borrar una cuenta DEBE pedir confirmación con el texto que dice qué se borra y que no se deshace, y habilitar el botón sólo después de marcar «Entiendo que no se puede deshacer.», antes de llamar a `DELETE /api/admin/users/{id}`. *(C3b FR-044 y FR-049)*
- **FR-018**: Con un 200 de `PATCH`, DEBE actualizar la fila con la cuenta que devuelve el servidor y anunciar el cambio.
- **FR-019**: Con un 202 al borrar, DEBE mostrar el mensaje del servidor y dejar la fila en «Borrándose» (`data.status`), sin acciones.
- **FR-020**: Ante un 409 `last_admin` o un 422 (`errors.status`, `errors.role` o `errors.user`), DEBE mostrar el mensaje del servidor en el diálogo de la acción, no cambiar la fila y volver a pedir la página. *(C3b FR-034)*

**Invitaciones (F12a)**

- **FR-021**: «Invitaciones» DEBE listar con `GET /api/admin/invitations`, de a 25 y en el orden de la API, con el email, el rol, el vencimiento en la hora local (o «Vencida», con `expired`), quién la creó («Consola o cuenta borrada» si `invitedBy` es `null`) y la fecha de creación. Nunca hay un token. *(C3b FR-037)*
- **FR-022**: Las invitaciones de admin vigentes DEBEN destacarse con un texto, «Admin pendiente», y no sólo con color, porque sin correo nadie recibe un aviso. *(C3b FR-037)*
- **FR-023**: DEBE filtrar por rol y por estado (vigentes o vencidas), con la paginación de FR-012.
- **FR-024**: «Invitar» DEBE pedir los emails en un campo de varias líneas, separados por saltos de línea, comas o espacios, y el rol: alumno por omisión, o admin.
- **FR-025**: El cliente DEBE validar sólo que haya entre 1 y 100 emails. La forma, el largo y los repetidos los decide el servidor, que canonicaliza.
- **FR-026**: DEBE enviar `POST /api/admin/invitations` con los emails en el orden escrito, el rol y `delivery: "link"`.
- **FR-027**: Ante un 422, los errores de `emails` y de cada `emails.<n>` DEBEN ir al campo de los emails, cada uno precedido por el email de la posición `n` (desde 0) de la lista enviada. Los de `role` y `delivery` van al error general. *(`InviteRequest`; `InvitationsEndpointTest.php`)*
- **FR-028**: Con un 200, DEBE mostrar un resultado por email, en el orden de la respuesta y con el email que devuelve el servidor, con el texto de `created`, `renewed`, `user_exists` o `invitation_pending` y el vencimiento de cada invitación creada o renovada. *(C3b FR-038)*
- **FR-029**: Cada enlace DEBE verse en un campo de sólo lectura con «Copiar». Si hay más de uno, DEBE ofrecer «Copiar todos los enlaces», con un renglón por invitación (el email y el enlace). Al copiar, DEBE anunciar «Copiado.».
- **FR-030**: Si el portapapeles no está disponible, el enlace DEBE quedar seleccionable, y la pantalla DEBE decir cómo copiarlo a mano.
- **FR-031**: Mientras haya enlaces a la vista, DEBE avisar que no se vuelven a mostrar y cómo conseguir otro. Cerrar el resultado o la administración DEBE pedir confirmación.
- **FR-032**: «Reenviar» DEBE pedir confirmación, porque el enlace anterior deja de valer, llamar a `POST /api/admin/invitations/{id}/resend` con `delivery: "link"` y mostrar el enlace nuevo con las reglas de FR-029 a FR-031. *(C3b FR-039)*
- **FR-033**: «Revocar» DEBE pedir confirmación y llamar a `DELETE /api/admin/invitations/{id}`. Con un 204, la invitación sale de la lista. *(C3b FR-039)*
- **FR-034**: Después de invitar, reenviar o revocar, la lista de invitaciones DEBE volver a pedirse.
- **FR-035**: Mientras `features.passwordReset` sea `false`, la administración NO DEBE ofrecer la entrega por correo, el reenvío por correo ni la recuperación de un tercero, que hasta C3c responden siempre 503. DEBE decir, en cambio, que los enlaces se entregan a mano y que la recuperación sale por la consola. *(C3b FR-056; C3c FR-008)*

**Contraseña reconfirmada (F12a)**

- **FR-036**: Ante un 423 `password_confirmation_required`, DEBE pedir la contraseña, confirmarla con `POST /api/auth/confirm-password` y, con un 201, repetir el pedido original exactamente una vez. El front NO DEBE llevar su propia lista de qué acciones piden la contraseña: lo decide el servidor con el 423. **[NEEDS CLARIFICATION: Q3, cómo se pide la contraseña reconfirmada]**
- **FR-037**: Ante un 422 `auth_failed` en la confirmación, DEBE marcar el campo con «La contraseña no es correcta.». Ante un 429, DEBE decir cuánto falta según `Retry-After` y no permitir reenviar antes.
- **FR-038**: Cancelar el pedido de la contraseña NO DEBE hacer la acción, y DEBE decir que no se hizo ningún cambio.

**Errores y estados comunes (F12a)**

- **FR-039**: Todos los pedidos DEBEN salir por el cliente de la API de F11a y heredar su manejo de 401, 403 `account_disabled`, 409 `account_mismatch`, 419 y las respuestas que no son JSON. Cualquier otro `{message, code}` DEBE mostrar el mensaje del servidor. *(F11 FR-015 a FR-023)*
- **FR-040**: Ante un 404 en una acción, DEBE decir que la cuenta o la invitación ya no existe y volver a pedir la lista.
- **FR-041**: Ante un 429 del límite de la administración, DEBE mostrar el mensaje del servidor y cuánto falta según `Retry-After`, y no permitir reenviar antes. *(F11 FR-021)*
- **FR-042**: Ante un 5xx, una respuesta que no es JSON o una falla de red, DEBE mostrar el mensaje común de F11 y conservar lo escrito: la búsqueda, los filtros y los emails.
- **FR-043**: Mientras un pedido está en curso, su botón DEBE quedar deshabilitado y decir el estado, y NO DEBE salir un segundo envío.

**Con correo (F12b; espera a C3c)**

- **FR-044**: Con `features.passwordReset: true`, «Invitar» DEBE ofrecer elegir la entrega, por correo o con enlace. *(C3c FR-008 y FR-057 (a))*
- **FR-045**: Con la entrega por correo, `created` y `renewed` DEBEN decir que el correo sale, sin enlace, y `rate_limited`, que se llegó al tope de 300 correos por día. *(C3c FR-057 (a))*
- **FR-046**: La lista DEBE mostrar si una invitación por correo salió (`sentAt`) o no salió (`sendFailedAt`). *(C3c FR-007)*
- **FR-047**: «Reenviar» DEBE ofrecer «Reenviar por correo» y «Pasar a enlace», con la confirmación de FR-032. *(C3c FR-057 (a))*
- **FR-048**: Las cuentas de alumnos activos DEBEN ofrecer «Mandarle un enlace para elegir contraseña», con confirmación, que llama a `POST /api/admin/users/{id}/password-reset`. Con un 202, DEBE decir que el enlace salió y vence en 60 minutos. A un admin o a una cuenta que no está activa NO DEBE ofrecérsele. *(C3b FR-036; C3c FR-057 (b))*
- **FR-049**: Ante un 503 `mail_unavailable`, DEBE mostrar el mensaje del servidor y ofrecer el camino del enlace, sin dar por creada ninguna invitación. *(C3b FR-056)*

**Accesibilidad, celular y movimiento reducido (todas las partes)**

- **FR-050**: Todo DEBE poder hacerse sólo con el teclado, con el foco visible y un orden que sigue el visual. Las dos secciones se eligen con el teclado, y el foco inicial va al título del diálogo.
- **FR-051**: Cada tabla DEBE tener título y encabezados de columna asociados a sus celdas. Los botones de cada fila DEBEN tener un nombre accesible que incluye a la persona o el email, por ejemplo «Deshabilitar a Ana Pérez».
- **FR-052**: Desde 320 px, la página NO DEBE desplazarse en horizontal: una tabla que no entra se desplaza dentro de su propia región, con nombre y alcanzable con el teclado (el patrón de `.sys-table-scroll` de Sistemas). Los campos miden 16 px o más.
- **FR-053**: Ningún estado DEBE depender de una animación. Con movimiento reducido rige la regla global de `styles.css`, sin librería de animación.
- **FR-054**: Los estilos DEBEN ser clases de las hojas del taller, que reutilizan sus botones, diálogos y tokens. NO DEBE haber ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` nuevos. *(F11 FR-069; C4)*

**Formularios, librerías y peso (todas las partes)**

- **FR-055**: La búsqueda, «Invitar» y la contraseña DEBEN armarse con React Hook Form, que instala F11a, y enviarse sólo desde su manejador, nunca con el envío nativo (`form-action 'none'`). Los `errors.<campo>` con campo visible van a `setError`, y el resto, a `root.serverError`. *(hoja de ruta, F11)*
- **FR-056**: F12 NO DEBE sumar dependencias de runtime: ni librerías de tablas, de diálogos o de portapapeles, ni nuqs. Su estado DEBE ser local a la administración, sin un store compartido nuevo. *(`AGENTS.md`)*
- **FR-057**: El PR DEBE medir `dist/index.html` antes y después (`html.length`) y quedar bajo el límite de `qa/build-check.ts` vigente al integrar: hoy, 1 250 000 caracteres; con C4, el tope por archivo.

**Verificación (todas las partes)**

- **FR-058**: Cada comportamiento DEBE empezar con una prueba que falla. Se usa Vitest con Testing Library para la lógica y los componentes, con el `fetch` inyectado en el cliente y las entradas armadas con fishery a partir de las formas del contrato (`AdminUser`, `AdminInvitation` y la página). Los valores esperados se escriben a mano, nunca con la misma factory. *(constitución, principio II; ADR 0008)*
- **FR-059**: Los E2E DEBEN usar un Page Object de la administración, con localizadores accesibles, sobre el doble de la API de F11a con una sesión de admin y las rutas de `/api/admin` respondidas según el contrato de C3b, sin el stack ni servicios externos. Los diálogos, el foco y el portapapeles se prueban ahí. *(ADR 0008)*
- **FR-060**: La red E2E vigente en la base de cada parte, `boot-check`, `dist-content-check` y `load-order-check` DEBEN seguir en verde sin editar sus escenarios.
- **FR-061**: Cada parte DEBE cerrar con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde, y actualizar `docs/architecture.md` y `qa/AGENTS.md` con lo que agrega.

### Key Entities *(include if feature involves data)*

- **Rol de la sesión:** `user.role` de `GET /api/session` (`admin` o `student`). Es la única señal que usa el front para mostrar la entrada; el servidor vuelve a comprobarlo en cada pedido.
- **Cuenta administrada** (`AdminUser`): `id`, `name`, `email`, `role`, `status` (`active`, `disabled` o `deleting`), `emailVerified`, `privacyVersion`, `createdAt` y `updatedAt`. Nunca trae el hash, el token de «recordarme» ni textos del alumno (C3b FR-041).
- **Invitación** (`AdminInvitation`): `id`, `email`, `role`, `delivery`, `expiresAt`, `expired`, `sentAt`, `sendFailedAt` (las dos `null` hasta C3c), `invitedBy` (`{id, name}` o `null`) y `createdAt`. Nunca trae el token.
- **Enlace de invitación:** `<APP_URL>/#invitacion=<token>`. Llega sólo en la respuesta de invitar (`created` y `renewed`, con `delivery: "link"`) y de reenviar, una vez. Vive en la memoria del diálogo mientras se muestra.
- **Resultado de invitar:** uno por email, en el orden del pedido: `created`, `renewed`, `user_exists` o `invitation_pending`; con C3c, también `rate_limited`.
- **Página:** `data` y `meta` (`page`, `perPage`, `total` y `lastPage`). Una página pasada del final trae `data: []`.
- **Confirmación de la contraseña:** un estado del servidor que dura 900 segundos. El front no lo guarda; se entera por el 423.
- **Modo sin correo:** `features.passwordReset: false`. Es el único estado hasta C3c.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (F12a): Con el doble de la API, un lote de 40 emails sale en un solo envío y muestra 40 resultados en el orden pedido; los enlaces se copian uno por uno y todos juntos. Al terminar, hay 0 enlaces, emails o nombres en `localStorage`, `sessionStorage`, `document.cookie`, la URL, el historial y la consola.
- **SC-002** (F12a): Con una sesión de alumno, el documento tiene 0 entradas a la administración y el navegador hace 0 pedidos a `/api/admin`. Con la administración cerrada, el shell tiene los mismos elementos que sin F12 y 0 regiones `alert` o `status` nuevas.
- **SC-003** (todas): Cada fila de «Acciones, endpoints y estados» tiene al menos una prueba, de Vitest o E2E, por cada estado que no esté en blanco, con un cuerpo tomado del contrato de C3b (o de C3c en F12b). El 100 % de esos estados muestra un mensaje visible que dice qué hacer.
- **SC-004** (F12a): Ante un 423, la acción se completa con una sola entrada de la contraseña y exactamente un reintento. Una segunda acción sensible que el servidor acepta sin 423 no pide la contraseña, y cancelar deja 0 pedidos de la acción.
- **SC-005** (F12a): La propia cuenta y las que se están borrando ofrecen 0 acciones. Cada 409 `last_admin` y cada 422 dejan la fila sin cambios y vuelven a pedir la página una vez. Una búsqueda de 10 letras escritas hace 0 pedidos hasta enviarla.
- **SC-006** (todas): Cada historia se completa sólo con el teclado, y cerrar cualquier diálogo devuelve el foco al control que lo abrió o al título de su tabla. A 320 y a 390 px la página no se desplaza en horizontal, y con movimiento reducido hay 0 transiciones (E2E).
- **SC-007** (todas): La red E2E vigente pasa sin editar sus escenarios. `dist/index.html` queda bajo el límite de `build-check`, y el PR informa cuánto creció. `package.json` suma 0 dependencias de runtime, y el código suma 0 sitios de estilo en línea.
- **SC-008** (F12b): Con `features.passwordReset: false` hay 0 opciones de correo y 0 acciones de recuperación de terceros. Con `true`, los cuatro caminos de correo (invitar, reenviar, pasar a enlace y recuperar) se recorren contra el doble, y un 503 deja 0 invitaciones dadas por creadas.
- **SC-009** (todas): Cada parte cierra con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde.

## Assumptions

**Las dependencias y su estado**

- **F11a está integrada antes de planificar F12a** (ver «Dependencias reales»). Los nombres que usa esta spec (el cliente de `shared/api`, la sesión de `entities/session`, «pedir el ingreso», la raíz de la cuenta, el doble de la API) son los provisionales de la spec de F11. Si su plan los cambia, esta spec se ajusta.
- **El doble de la API de F11a** responde una sesión con cuenta por omisión, y F11 no dice con qué rol. F12 supone que el rol se puede elegir por escenario y que por omisión es `student`. Con el borrador de Q1, el rol por omisión no cambia lo que mide la red, porque la entrada vive dentro de «Tu cuenta». F12 suma la variante de admin y las rutas de `/api/admin`.
- **Los contratos de C3b** son los entregados y se contrastaron con el código de `e87772d` (las rutas, los controladores, los `FormRequest`, los presentadores, `lang/es/` y las pruebas de Pest de la administración). Si C3b cambia por flow-forward, esta spec se ajusta.
- **C3c está sólo especificada,** y su plan espera el dominio. Lo que F12b toma de ella (`rate_limited`, `sentAt` y `sendFailedAt`, el 202 de la recuperación y la bandera) es un supuesto hasta que tenga plan.
- **La pila de DOM de Vitest** llega con F3 o con F11a, con permiso. F12 no baja nada.
- **El ADR 0006 sigue en propuesta.** Lo que F12 toma de él llega a través de la spec de C3b.

**Las cuentas, los textos y el peso**

- **Un admin es una cuenta más,** que también estudia (Q3 de C3a). La propia cuenta se borra desde «Tu cuenta» (F11b), no desde la administración.
- **Un aula de 40** es el supuesto de trabajo, como en C3b. Las listas de 25 por página alcanzan, y el lote de hasta 100 cubre un aula de una vez.
- **Las fechas** se muestran en la zona horaria del navegador, con el formato del español de Argentina. La API las manda en UTC.
- **Los nombres de los roles en la interfaz** son «Admin» y «Alumno». El servidor dice «estudiante» en `lang/es/admin.php` y los valores en inglés en `lang/es/invitations.php` («admin o student»), pero esos mensajes sólo aparecen ante un valor inválido, que la interfaz no manda.
- **El margen de peso** después de F11a es chico (ver «Riesgos»). El código de F12 viaja a todos en `dist/index.html` hasta que C4 retire `vite-plugin-singlefile`.

## Alternativas consideradas

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde se monta (Q1) | Un diálogo desde «Tu cuenta»; una sección dentro de «Tu cuenta»; una raíz previa al shell; una ruta de F10; una novena vista legacy; un botón propio en la barra superior | **Un diálogo desde «Tu cuenta»** (recomendada): no toca el contrato de URL, ni `app.js`, ni el shell, ni el arranque, y no espera a ningún port. El detalle de cada una está en Q1 |
| Si C4 espera (Q2) | Espera a F12a; no espera; espera sólo a las cuentas | **Espera a F12a** (recomendada): cuesta poco en calendario y saca a `curl` y a `tinker` de la respuesta a un incidente |
| La contraseña reconfirmada (Q3) | A pedido, ante el 423; siempre antes, como F11b; consultar el estado antes | **A pedido** (recomendada): decide el servidor, y una tanda de cambios pide la contraseña una vez cada 15 minutos |
| La partición | Dos partes (sin correo y con correo); tres (cuentas, invitaciones y correo); no partir | **Dos partes** (recomendada), por la dependencia de C3c, como F11c |
| La ficha de usuario | Una vista aparte con `GET /api/admin/users/{id}`; la fila de la lista | **La fila:** la lista trae la misma forma. C5 suma su resumen a la ficha cuando llegue |
| El orden de la lista | Elegirlo (`sort`); el de la API, por nombre | **El de la API.** Buscar y filtrar alcanzan para un aula de 40, y `sort` queda disponible |
| Cuándo se busca | En cada tecla, con espera; al enviar | **Al enviar:** el límite es de 120 pedidos por minuto, y un pedido por tecla lo come |
| Cómo se entrega un enlace | Sólo un botón de copiar; un campo de sólo lectura con copiar; un archivo | **El campo con copiar:** sirve también sin portapapeles. Un archivo deja los tokens en el disco |
| Rehabilitar sin confirmación | Confirmar sólo lo que quita algo; confirmar todo lo que cambia una cuenta | **Confirmar todo:** una sola regla, fácil de probar, y un clic más en una acción rara |
| La tabla en el celular | Una región que se desplaza; tarjetas en lugar de filas | **La región:** ya existe en Sistemas (`.sys-table-scroll`). Las tarjetas son un segundo diseño que mantener |
| Librerías | Una de tablas o de diálogos; HTML y las clases del taller | **HTML y las clases del taller** (FR-056): el peso es chico y el `<dialog>` nativo ya está en uso |

## Riesgos

1. **El peso.** Después de F2a y A2, `dist/index.html` mide 1 136 702 caracteres (T020 de F2b), el límite de `qa/build-check.ts` es de 1 250 000 y F2b suma unos 4 266. F11a suma React Hook Form (unos 43 KB minificado, según su spec) y su propio código, así que a F12 le puede quedar poco margen para tablas, formularios y diálogos. *Mitigación:* FR-056 y FR-057, sin dependencias nuevas y con la medida en el PR. Si no entra, decide el usuario: subir el límite o esperar a que C4 cambie el contrato del build.
2. **Un enlace que se ve una sola vez se pierde** si se cierra, se recarga o se cae la pestaña. *Mitigación:* el aviso, la confirmación al cerrar (FR-031) y «Reenviar», que invalida el anterior.
3. **Dos admins con la lista vieja.** *Mitigación:* decide el servidor; la pantalla maneja el 404, el 409 y el 422 y vuelve a pedir la lista (FR-020, FR-034 y FR-040).
4. **Una sesión de admin robada.** Con Q3 en A, durante los 15 minutos de la confirmación una acción destructiva sale sólo con su confirmación. *Mitigación:* es la política del servidor (900 s), cada acción pide confirmación, y C4 trae la CSP estricta. El riesgo de fondo, el admin sin segundo factor, es del ADR 0006 (§4.10).
5. **Diálogos sobre un diálogo y el foco.** jsdom no implementa `showModal` (ADR 0008). *Mitigación:* como mucho un diálogo sobre la administración (FR-005), y el foco se prueba en E2E (FR-059).
6. **Un montaje que F10 cambia.** *Mitigación:* la página no depende del punto de montaje; F10 lo mueve sin reescribirla.
7. **El código de administración viaja a todos los alumnos** hasta C4. *Mitigación:* no trae secretos, sólo nombra rutas que los contratos ya publican, y el servidor exige el rol en cada una. Sin `vite-plugin-singlefile`, el plan de entonces puede separarlo en su propio archivo.
8. **El contrato de C3c puede cambiar en su plan.** *Mitigación:* F12b se planifica con C3c, no antes.
9. **Tablas a 320 px.** *Mitigación:* la región que se desplaza (FR-052) y los nombres accesibles por fila (FR-051).
10. **F11a es grande, no tiene plan y sus nombres son provisionales.** *Mitigación:* F12a se planifica sobre F11a ya integrada, y esta spec sólo toma de F11 lo que su clarify fijó.

## Relación con otros ítems

**C3b** (spec 010, entregada). Hallazgos para su dueño, sin cambiar nada:

1. No hay ningún comando de consola para listar cuentas, cambiar un rol o un estado, revocar una invitación ni borrar otra cuenta: sin F12, eso sólo se hace por HTTP o con `tinker` (Q2).
2. `lang/es/invitations.php` muestra los valores en inglés («admin o student», «link o email», «pending o expired»), mientras `lang/es/admin.php` dice «admin o estudiante». La interfaz no manda valores inválidos, así que es de baja severidad.
3. F12 no usa `GET /api/admin/users/{user}`: la lista trae la misma forma. C5 lo extiende con su resumen.

**C3c** (spec 011, sólo especificada):

- F12b consume el «enviar por correo» que la spec de C3c le atribuye a F12: la invitación y el reenvío por correo, la recuperación de un tercero, `sentAt`, `sendFailedAt` y `rate_limited`.
- `features.passwordReset` es la bandera de «hay correo» (C3c FR-008).

**C4** (spec 008, planificada):

- Q2 decide si espera a F12a. Su compuerta G1 hoy no la nombra.
- Su recorrido de la CSP (SC-004 de C4: las 8 vistas, los 5 enlaces profundos, el editor y la celebración) no incluye las pantallas de F11 ni las de F12. Si existen cuando C4 se implementa, conviene sumarlas al recorrido.
- F12 no agrega estilos en línea (FR-054) y sus formularios no usan el envío nativo (`form-action 'none'`).
- El tope de `build-check` cambia con C4 (un tope por archivo). FR-057 usa el vigente al integrar.

**C5** (sin spec):

- Sus pantallas (las estadísticas, las ejecuciones, la cola y el resumen en la ficha) no son de F12 y no tienen dueño en ninguna de las dos hojas de ruta. Es un hallazgo para el coordinador.
- La prueba de «sin textos del alumno» de C3b (FR-041) ya cubre sus rutas.

**F11a** (spec 015, sin plan). Lo que F12 necesita y conviene que su plan prevea:

- un lugar en «Tu cuenta» para la entrada de la administración, visible sólo con rol admin;
- un doble de la API con el rol de la sesión elegible por escenario y una forma de sumar rutas;
- el rol por omisión de la sesión simulada, escrito en su plan.

**F11b:** comparte el pedido de la contraseña. El que llegue segundo lo mueve a un lugar compartido, como propone F11. Con Q3 en A, F12 lo usa ante un 423 y F11b, antes de la acción: el componente es el mismo y cambia el momento.

**F11c y F11d:** no le cambian nada a F12.

**F10:** decide si la administración pasa a ser una ruta de la raíz única o sigue como diálogo.

**F1, A2 y F2b:** F12 no edita sus escenarios ni sus checks, y no cambia la gramática de URL.

**A3:** independiente. La administración no lee el contenido, sólo la sesión que la etapa de F11a ya guarda.

**D1:** el texto de borrar una cuenta distingue la supresión de «Borrar todo», como pide C3b (FR-049).

**Hojas de ruta** (las integra el coordinador):

- en la del front, F12 depende de F11a, no de toda F11;
- si Q2 queda en A, F12 deja de ser un ítem que «no bloquea a ningún otro», y C4 suma la dependencia en la del backend;
- la partición, si se acepta, suma F12a y F12b a la tabla;
- la hoja de ruta del front todavía dice que el límite de `build-check` es de 2 500 000 caracteres: desde A2 es de 1 250 000.

## Acciones del usuario

Los agentes no las hacen. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII).

| Cuándo | Acción |
| --- | --- |
| Ahora | Responder Q1 a Q3 y aceptar o cambiar la partición. |
| Antes de integrar F12a | Nada nuevo: F12 no baja paquetes. Con el stack levantado, crear el primer admin por consola (`taller:invite --role=admin`) para probarla a mano. |
| Antes de F12b | El dominio de C3c y C4. |

## Descargas previstas

Ninguna. F12 reutiliza React Hook Form (lo instala F11a) y la pila de pruebas que traen F3 o F11a. No suma librerías de tablas, de diálogos, de portapapeles ni nuqs.
