# Feature Specification: F12 · Administración

**Feature Branch**: `023-f12-administracion` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-28

**Status**: Clarificada el 2026-10-28 (ver «Clarifications»): Q1 a Q3 respondidas y partida en F12a y F12b (P3), cada una con su plan; ninguno escrito todavía

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

Es para quien administra el taller. Indirectamente, también es para el alumno, que recibe su invitación sin pasar por la consola, y para C4, que espera a F12a para exponer el taller (F12-Q2). El resto del taller no cambia: ni el aspecto, ni el comportamiento, ni el progreso guardado, ni las URL. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Un admin invita a un aula de 40 con un solo envío, copia los 40 enlaces y se los entrega. Ningún enlace queda en el almacenamiento del navegador, en la URL ni en la consola.
2. Un admin deshabilita, rehabilita, promueve, degrada o borra una cuenta desde la administración, con la contraseña reconfirmada cuando el servidor la pide. La propia cuenta no se puede tocar desde ahí, y un `last_admin` del servidor se explica con su mensaje.
3. Un alumno no ve ninguna entrada a la administración, y su navegador no pide nada a `/api/admin`. El servidor sigue siendo la autoridad: si una cuenta pierde el rol de admin con la administración abierta, el próximo pedido lo dice y ofrece recargar.
4. Cada acción resuelve sus estados (cargando, éxito, error de un campo, error del servidor, sesión vencida o de otra cuenta, y límite de pedidos) con un mensaje en español que dice qué hacer.
5. Todo se completa con el teclado, con el foco en su lugar después de cada diálogo, en un celular de 320 px y sin depender de una animación.
6. La red E2E vigente pasa sin editar sus escenarios, y `dist/index.html` sigue bajo el límite de `build-check`, sin dependencias nuevas.

**Entra** (entre paréntesis, la parte de la partición a la que va, P3):

- **La entrada y el montaje (F12a):** la entrada «Administrar el taller» dentro de «Tu cuenta», sólo para el rol admin, y la administración como un diálogo propio a pantalla entera, que F10 convierte después en una ruta enlazable (F12-Q1). F12a deja la página lista para esa mudanza («El compromiso con F10»).
- **Las cuentas (F12a):** la lista paginada, con búsqueda y filtros, y las acciones de deshabilitar, rehabilitar, hacer admin, quitar admin y borrar.
- **Las invitaciones por enlace (F12a):** la lista paginada con sus filtros, invitar en lote, copiar los enlaces, reenviar (un enlace nuevo) y revocar.
- **La contraseña reconfirmada (F12a):** pedirla cuando el servidor responde 423 y repetir la acción una vez (F12-Q3).
- **Lo que llega con el correo (F12b, espera a C3c):** invitar y reenviar por correo, ver si una invitación salió o falló, pasar una invitación a enlace y mandarle a un alumno el enlace de recuperación.
- **Las pruebas:** specs de Vitest con Testing Library y fishery; E2E con un Page Object de la administración sobre el doble de la API de F11a; la documentación que cambia con ellas, `docs/architecture.md` y `qa/AGENTS.md`.

**Queda fuera:**

- **Las estadísticas del admin** (C5): `/api/admin/stats/*`, `GET /api/admin/runs`, `GET /api/admin/queue` y el resumen en la ficha de usuario.
- **La API:** es de C3b y C3c. F12 no cambia ningún contrato, y lo que le falta a uno queda como hallazgo («Relación con otros ítems»).
- **Las pantallas de cuenta** (F11): el ingreso, el alta, el aviso de privacidad, «Tu cuenta», «Salir», y descargar o borrar la propia cuenta.
- **El router, la raíz única y la ruta enlazable de la administración** (F10, con el compromiso de «El compromiso con F10»).
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
- **Los ítems que se apoyan en F12:** C4, que espera a F12a (F12-Q2); F10, que convierte la administración en una ruta enlazable (F12-Q1); y C5, cuyas pantallas no tienen dueño todavía («Relación con otros ítems»).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions).

| Pedido | Fuente |
| --- | --- |
| F12 trae las pantallas de administración de usuarios e invitaciones, que consumen `/api/admin` de C3b, con sus E2E. Quedan fuera las estadísticas (C5), la API (C3b) y las pantallas de cuenta (F11) | Coordinador, 2026-10-05; hoja de ruta del front, F12 en «Ítems» y en «Alcance por ítem» |
| Dónde se monta F12, y si C4 la espera, eran decisiones abiertas de la hoja de ruta; las cerró el clarify | Hoja de ruta del front, «Decisiones abiertas», F12 |
| F12a entra como un diálogo a pantalla entera que se abre desde «Tu cuenta» y sólo ven los admins, y F10 lo convierte en una ruta enlazable | Usuario, clarify del 2026-10-28 (F12-Q1) |
| C4 espera a F12a: su compuerta G1 suma «las pantallas de administración integradas» | Usuario, clarify del 2026-10-28 (F12-Q2) |
| La contraseña se pide a pedido: ante un 423 se pide, se confirma y la acción se repite una vez | Usuario, clarify del 2026-10-28 (F12-Q3) |
| F12 se parte en F12a, sin correo, y F12b, con correo, que espera a C3c como F11c | Usuario, clarify del 2026-10-28 (P3) |
| F11 se parte en cuatro: F11a (el acceso, con las etapas de arranque, el cliente HTTP, el ingreso, el aviso de privacidad y «Tu cuenta»), F11b (la cuenta), F11c (el correo) y F11d (lo de D1) | Usuario, clarify del 2026-10-28 (P1) |
| La sesión es obligatoria desde F11a. F11a introduce la etapa de sesión y «pedir el ingreso», trae el doble de la API como fixture automático de los E2E, con una sesión simulada por omisión, y la vista previa pasa `/api/` al stack | Usuario, clarify del 2026-10-28 (F11-Q1), y ruling C1 del coordinador |
| La entrada a «Tu cuenta» es un botón de la barra superior, junto al selector de lenguaje, que abre un diálogo modal | Usuario, clarify del 2026-10-28 (F11-Q3) |
| Los formularios usan React Hook Form, que instala F11a con permiso. Los `errors.<campo>` de un 422 van a `setError`, y los `{message, code}`, a `root.serverError` | Usuario, 2026-10-06; hoja de ruta del front, F11 |
| Cada descarga pide permiso con nombre, origen y tamaño | Constitución, principio VII |
| Vitest con Testing Library y fishery para la lógica y los componentes, y Playwright con Page Objects para los E2E, sin tocar servicios públicos | ADR 0008 (aceptado); constitución, principio II |
| TDD; código y pruebas en inglés; interfaz en español rioplatense; teclado, celular y movimiento reducido | `AGENTS.md`; constitución, principios II, III y VI |
| Zustand y nuqs entran sólo con su primer caso real | `AGENTS.md` |
| La spec, en español y sin código: como mucho cinco preguntas para el clarify, y un corte propuesto, sin aplicar, si pasa de 52 requisitos | Coordinador, 2026-10-28 |

## Clarifications

### Session 2026-10-28

El usuario respondió las tres preguntas y la partición de esta spec junto con el clarify de las otras specs del épico (`.coordinador/clarify-decisiones.md`, filas F12-Q1 a F12-Q3 y P3). Los requisitos, las historias, los criterios, los supuestos, los riesgos y la relación con otros ítems ya las aplican.

- Q: **Q1**, ¿dónde se monta la administración? → A: Diálogo ahora, ruta en F10 (F12-Q1). F12a entra como un diálogo a pantalla entera que se abre desde «Tu cuenta» y sólo ven los admins (la opción A), y F10 lo convierte en una ruta enlazable. Para F10 queda un compromiso, con lo que F12a deja listo para que la mudanza sea sólo el punto de montaje («El compromiso con F10»). El usuario eligió primero la ruta de F10 (la opción D); cuando se le mostró que, junto con Q2, eso dejaba a C4 detrás de todo el front, eligió esta. Decidió el usuario. (FR-003, FR-062 y FR-063)
- Q: **Q2**, ¿C4 espera a F12? → A: Sí, a F12a (opción A, F12-Q2): la compuerta G1 de C4 suma «las pantallas de administración integradas». Descartadas: que C4 no espere y el camino con `curl` quede documentado (B), y que espere sólo a las cuentas (C). Decidió el usuario. («Dependencias reales» y «Relación con otros ítems», C4)
- Q: **Q3**, ¿cómo se pide la contraseña reconfirmada? → A: A pedido (opción A, F12-Q3): ante un 423 se pide, se confirma y la acción se repite una sola vez. Descartadas: pedirla siempre antes, como F11b (B), y consultar `confirmed-password-status` antes de cada acción (C). Decidió el usuario. (FR-005 y FR-036 a FR-038)
- Q: **P3**, ¿se parte F12? → A: Sí, en F12a (sin correo) y F12b (con correo, que espera a C3c, como F11c), la partición recomendada. Descartadas: tres partes (cuentas, invitaciones y correo) y no partir. Decidió el usuario. («La partición en F12a y F12b»)

## La partición en F12a y F12b

Decidida en el clarify (P3). Cada parte tiene su plan, sus tareas y su PR, como F11 y F7. Siguiendo el precedente de F2 y F7, el plan de F12a iría en `plan.md` y el de F12b en `plan-f12b.md`, porque los scripts de Spec Kit buscan `plan.md` por nombre; lo confirma el coordinador.

| Parte | Qué entra | Depende de | La esperan |
| --- | --- | --- | --- |
| **F12a · Sin correo** | La entrada en «Tu cuenta» y el diálogo a pantalla entera; las cuentas (la lista, la búsqueda, los filtros, deshabilitar, rehabilitar, hacer y quitar admin, y borrar); las invitaciones por enlace (la lista, invitar en lote, copiar, reenviar y revocar); la contraseña reconfirmada a pedido; los errores comunes; la página lista para que F10 la mude a una ruta; sus specs y sus E2E | F11a; C3b (entregada) | C4 (F12-Q2) y F12b. F10 no la espera, pero la muda a una ruta si ya está integrada («El compromiso con F10») |
| **F12b · Con correo** | Invitar y reenviar por correo, el estado del envío (`sentAt` y `sendFailedAt`), pasar a enlace, la recuperación de un tercero y el 503 `mail_unavailable` | F12a y C3c, que espera el dominio | Nadie |

**Los requisitos de cada parte** (cada uno lleva su marca en «Functional Requirements»):

| Grupo | Requisitos | Cuántos |
| --- | --- | --- |
| Sólo F12a | FR-001 a FR-043, FR-062 y FR-063 | 45 |
| Sólo F12b | FR-044 a FR-049 | 6 |
| Las dos, cada una sobre lo suyo (los transversales) | FR-050 a FR-061 | 12 |

F12a suma 57 requisitos con los transversales y F12b, 18. En total, la spec tiene 63, contra los 52 de C3a. F12a queda por encima de ese tope y por debajo de los 64 de F11a, que el usuario aceptó.

- **Qué gana:** F12a no espera ninguna decisión externa, y C4 la espera sólo a ella. F12b se planifica con C3c, cuando haya dominio.
- **Qué cuesta:** un segundo ciclo de plan y tareas, y F12b toca las mismas pantallas después de F12a. F12a es la segunda parte más grande del épico.
- **Descartadas:** tres partes (cuentas, invitaciones y correo, con 40, 27 y 18 requisitos con los transversales), que sumaba un ciclo para quince requisitos que comparten el diálogo, la contraseña y los errores; y no partir, que dejaba la parte del correo sin poder cerrarse hasta C3c.

## Dependencias reales

- **C3b** (entregada, PR #37): los nueve endpoints de `/api/admin`. F12 usa ocho: no usa `GET /api/admin/users/{user}`.
- **F11a, entera:**
  - el cliente de la API, con el CSRF, `X-Taller-User`, los errores `{message, code}`, el reintento del 419, el 409 `account_mismatch`, el `Retry-After` y las respuestas que no son JSON;
  - el estado de la sesión, con `user.role` y `features`;
  - «pedir el ingreso» ante un 401;
  - la raíz de la cuenta y el diálogo «Tu cuenta», donde va la entrada (F12-Q1);
  - React Hook Form, que F11a instala con permiso;
  - el doble de la API de los E2E;
  - la pila de DOM de Vitest (`jsdom`, Testing Library y fishery), si F11a llega antes que F3.

  No alcanza con el cliente y la sesión: sin la raíz y el diálogo no hay dónde montar la administración, y sin el doble no hay E2E.
- **F11b:** no hace falta. Comparte con F12 el pedido de la contraseña: F11 dice que conviene moverlo a un lugar compartido cuando aparezca el segundo uso, así que **el que llegue segundo entre F11b y F12a lo mueve**.
- **F11c:** no le cambia nada a F12. Pedir el enlace por correo es de la propia cuenta.
- **F11d:** no le cambia nada.
- **C3c:** le cambia a F12b lo que hace con `features.passwordReset: true` («Las invitaciones antes y después de C3c»).
- **C4 espera a F12a** (F12-Q2): su compuerta G1 suma «las pantallas de administración integradas». F12 deja de ser un ítem que no bloquea a nadie. C4 no espera a F12b.
- **F10:** no es una dependencia de F12. Asume el compromiso de mudar la administración a una ruta enlazable (F12-Q1), sobre lo que F12a deja listo («El compromiso con F10»).

## Dónde vive la administración (F12-Q1)

Esta sección fija la responsabilidad y el contrato. Los nombres de módulos son provisionales y los confirma el plan: por ejemplo, la página en `pages/admin`, sobre el cliente de `shared/api` y la sesión de `entities/session` de F11a.

- **Quién la ve.** El front sabe el rol por `GET /api/session`: la cuenta publicada trae `{id, name, email, role, privacyAccepted}` (`backend/api/app/Auth/PublishedUser.php`; contrato de C3a). `features` sólo trae `passwordReset` y `registration`, y no dice nada del rol. Con `role: "admin"`, «Tu cuenta» muestra «Administrar el taller»; con cualquier otro rol, ese elemento no existe.
- **El servidor es la autoridad.** Ocultar la entrada no protege nada: toda ruta de `/api/admin` exige sesión, el email verificado y el rol admin, y responde 403 `forbidden` a cualquier otro (C3b FR-031). El código de la administración viaja a todos en el mismo `dist/index.html` hasta que C4 retire `vite-plugin-singlefile`. No trae secretos: sólo nombra rutas que ya publican los contratos.
- **Qué ve un alumno que llega por URL.** Hasta F10 no hay URL: el diálogo no tiene una forma de URL propia, así que no hay nada a qué llegar. Con la ruta de F10, qué ve un alumno lo decide F10 («El compromiso con F10»). En los dos casos, si un alumno pide `/api/admin` por su cuenta, recibe 403.
- **Si la cuenta pierde el rol con la administración abierta.** El servidor lee el rol en cada pedido, así que el siguiente responde 403 `forbidden`. La administración muestra el mensaje, explica que la cuenta puede haber perdido el rol y ofrece «Recargar». La recarga arranca el taller con la sesión vigente, ya sin la entrada.
- **El montaje.** «Administrar el taller» cierra «Tu cuenta» y abre la administración: un diálogo modal que ocupa la pantalla entera en todos los anchos, dibujado por la raíz de la cuenta, fuera de `#main` y de `.app-shell`. No cambia la URL, la vista ni el historial. Tiene dos secciones, «Cuentas» e «Invitaciones», y abre en «Cuentas».
- **Los diálogos.** Sobre la administración se abre como mucho un diálogo a la vez: la confirmación de una acción, el pedido de la contraseña o el ingreso de F11a ante un 401. Si una acción ya confirmada recibe un 423, la contraseña se pide en el mismo diálogo de la confirmación. Si recibe un 401, la confirmación se cierra diciendo que no se hizo ningún cambio (un 401 no llega a la acción), y recién entonces aparece el ingreso. Con la misma cuenta, la administración sigue donde estaba, y la acción se vuelve a pedir a mano.
- **Cómo se cierra.** Con «Cerrar» o con Esc, el foco vuelve a la entrada «Tu cuenta» de la barra superior, y el shell queda como estaba. Si hay enlaces a la vista, primero pide confirmación (FR-031).
- **Qué deja en el documento.** Con la administración cerrada, nada: ni elementos en el shell ni regiones `alert` o `status`. La red ubica el error de la compuerta con `getByRole('alert')` (FR-076 de F11).
- **F10** la convierte en una ruta enlazable de la raíz única. La página no cambia; cambia el punto de montaje (sección siguiente).

## El compromiso con F10

El clarify (F12-Q1) decidió que F12a entre como un diálogo y que **F10 lo convierta en una ruta enlazable**. Esta sección es el compromiso que asume F10 y lo que F12a deja listo para que la mudanza toque sólo el punto de montaje.

**Lo que hace F10** (va a su spec, que todavía no existe; la hoja de ruta lo suma a su «Entra»):

- Monta la administración en una ruta de la raíz única, que se puede enlazar y que sobrevive a una recarga. La forma de la URL la decide su router, dentro del spike que ya tiene previsto: probablemente una vista más en el hash.
- La URL lleva sólo la vista y, si F10 quiere, la sección («Cuentas» o «Invitaciones»). Nunca un nombre, un email, un filtro con datos de una persona ni un enlace (FR-008).
- Decide qué ve en esa URL una cuenta que no es admin. El servidor sigue siendo la autoridad: cualquier pedido de esa cuenta a `/api/admin` recibe 403.
- Reemplaza el diálogo y su entrada en «Tu cuenta» por la ruta y su enlace, y reescribe como escenarios de la ruta los E2E que abren y cierran el diálogo (la historia 5, escenarios 2 y 3). Es un cambio de comportamiento, con TDD y en su propio commit, como pide la hoja de ruta.

**Lo que F12a deja listo** (FR-062 y FR-063):

- **La página separada del diálogo.** La administración (sus secciones, sus listas, sus formularios y los diálogos de sus acciones) vive en su propio slice, provisionalmente `pages/admin`, con una API pública chica. El diálogo a pantalla entera y su entrada en «Tu cuenta» son un contenedor fino, la única pieza que F10 reemplaza.
- **Lo que el contenedor le pasa a la página:** la sección inicial y qué hacer al cerrar. Hoy, el diálogo abre en «Cuentas» y cerrar lo cierra. Con F10, la ruta pasa la sección de la URL, y cerrar navega. La página no importa nada de «Tu cuenta», de la raíz de la cuenta ni de `<dialog>`.
- **La condición de admin en un solo lugar,** que lee `user.role` de la sesión de F11a. La usan la entrada de hoy y la ruta de F10.
- **Ningún estado atado a la vida del diálogo** más allá de descartarse al cerrar (FR-008). Con la ruta, se descarta al salir de ella.
- **Los E2E listos para la mudanza:** el Page Object de la administración la abre desde un único método, el único que F10 cambia. Los demás escenarios ubican la administración por su título y sus roles accesibles, no por el diálogo que la contiene.

**Qué pasa si F10 llega antes que F12a.** Es improbable, porque F12a sólo espera a F11a y F10 es el final del tronco. Si pasara, la administración nace directamente como una ruta, y el plan de F12a lo consulta con el usuario (Assumptions).

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

**Why this priority**: es lo que la consola no hace y lo que hace falta ante una cuenta comprometida, y lo que C4 espera para exponer el taller (F12-Q2).

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

**Why this priority**: protege la red de F1, deja claro que la autoridad es el servidor y deja la página lista para que F10 la mude a una ruta (F12-Q1).

**Independent Test**: con el doble, abrir «Tu cuenta» con una sesión de alumno y con una de admin; responder 403 `forbidden` y 401 a pedidos de la administración; en una spec de componente, montar la página sola, sin el diálogo.

**Acceptance Scenarios**:

1. **Dada** una sesión con `role: "student"`, **cuando** abre «Tu cuenta», **entonces** no existe «Administrar el taller» en el documento, y en toda la sesión el navegador hace 0 pedidos a `/api/admin`.
2. **Dada** una sesión con `role: "admin"`, **cuando** usa «Administrar el taller», **entonces** «Tu cuenta» se cierra, se abre la administración a pantalla entera en «Cuentas», sin cambiar la URL ni el historial, y el foco va a su título.
3. **Dada** la administración abierta, **cuando** el admin aprieta Esc, **entonces** se cierra, el foco vuelve a «Tu cuenta» y la vista del shell sigue donde estaba.
4. **Dada** una cuenta que perdió el rol en el medio, **cuando** un pedido responde 403 `forbidden`, **entonces** se ve el mensaje del servidor, la explicación y «Recargar», y no sale ningún reintento.
5. **Dada** la sesión vencida y una confirmación abierta, **cuando** la acción recibe 401, **entonces** la confirmación se cierra con «No se hizo ningún cambio.», se abre el ingreso de F11a sin cerrar la administración y, si entra la misma cuenta, la administración sigue donde estaba.

6. **Dada** la página de la administración montada sola en una spec de componente, fuera del diálogo y de «Tu cuenta», con «Invitaciones» como sección inicial, **cuando** se dibuja y se usa «Cerrar», **entonces** muestra «Invitaciones» y llama a la acción de cierre que recibió, sin abrir ni cerrar ningún `<dialog>`.
7. **Dado** el Page Object de la administración, **cuando** un escenario la necesita abierta, **entonces** la abre con su único método de apertura, y los demás escenarios la ubican por su título y sus roles accesibles, no por el diálogo.

*Cubre: FR-001 a FR-005, FR-007, FR-008, FR-039, FR-060, FR-062 y FR-063; SC-002 y SC-010.*

---

### User Story 6 - La contraseña reconfirmada (Priority: P2) · F12a

Quien administra encadena varios cambios. La primera acción sensible le pide la contraseña, y las siguientes, durante 15 minutos, no.

**Why this priority**: sin esto, cada acción sensible termina en un 423 sin salida. Tiene P2 porque sólo aparece una vez cada 15 minutos (F12-Q3).

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

Cada requisito lleva entre paréntesis la parte que lo entrega (P3): *(F12a)*, *(F12b)* o *(F12a y F12b)*, que son los transversales: cada parte los cumple sobre lo suyo. Las listas están en «La partición en F12a y F12b».

**Entrada, montaje y protección (F12a)**

- **FR-001** *(F12a)*: La entrada «Administrar el taller» DEBE aparecer en «Tu cuenta» sólo cuando la sesión trae `user.role: "admin"`. Con otro rol, o sin sesión, NO DEBE existir en el documento. *(C3a, `GET /api/session`; `PublishedUser`)*
- **FR-002** *(F12a)*: Ante un 403 `forbidden` en cualquier pedido de la administración, DEBE mostrar el mensaje del servidor, explicar que la cuenta puede haber perdido el rol de admin y ofrecer «Recargar», sin reintentar: el servidor es la autoridad, y ocultar la entrada no protege nada. *(C3b FR-031)*
- **FR-003** *(F12a)*: La administración DEBE abrirse como un diálogo modal propio, que ocupa la pantalla entera en todos los anchos, dibujado por la raíz de la cuenta de F11a, fuera de `#main` y de `.app-shell`, sin cambiar la URL, la vista ni el historial. F10 lo reemplaza por una ruta enlazable («El compromiso con F10»). *(F12-Q1)*
- **FR-004** *(F12a)*: Abrir la administración DEBE cerrar «Tu cuenta». Cerrarla, con su botón o con Esc, DEBE devolver el foco a la entrada «Tu cuenta» y dejar el shell como estaba, sin recargar.
- **FR-005** *(F12a)*: Sobre la administración DEBE haber como mucho un diálogo a la vez: una confirmación, el pedido de la contraseña o el ingreso de F11a ante un 401. Si una acción ya confirmada recibe un 423, la contraseña DEBE pedirse en el mismo diálogo de la confirmación. Si recibe un 401 (también en la confirmación de la contraseña o en el reintento), ese diálogo DEBE cerrarse diciendo que no se hizo ningún cambio antes de pedir el ingreso.
- **FR-006** *(F12a)*: Al cerrarse un diálogo, el foco DEBE volver al control que lo abrió o, si ese control ya no existe (porque la fila salió de la lista), al título de su tabla.
- **FR-007** *(F12a)*: Con la administración cerrada, F12 NO DEBE dejar nada en el documento: ni elementos nuevos en el shell (la barra lateral, la barra superior, la navegación), ni regiones `alert` o `status`. *(F11 FR-076)*
- **FR-008** *(F12a)*: Los nombres, los emails y los enlaces de la administración NO DEBEN guardarse en `localStorage`, `sessionStorage`, una cookie propia, la URL, el historial ni un estado global, ni escribirse en la consola: viven en la memoria del diálogo y se descartan al cerrarlo.

**Cuentas (F12a)**

- **FR-009** *(F12a)*: «Cuentas» DEBE listar con `GET /api/admin/users`, de a 25 y en el orden por omisión de la API (por nombre), con el nombre, el email, el rol, el estado, la fecha de alta en la hora local y la marca «Sin verificar» cuando `emailVerified` es `false`. *(C3b FR-032)*
- **FR-010** *(F12a)*: DEBE buscar por nombre o email, con hasta 80 caracteres, al enviar la búsqueda y nunca en cada tecla, porque el límite es de 120 pedidos por minuto por usuario. *(contrato de C3b; `throttle:admin`)*
- **FR-011** *(F12a)*: DEBE filtrar por rol (admin o alumno) y por estado (activa, deshabilitada o borrándose), combinar los filtros con la búsqueda y volver a la primera página al cambiar cualquiera de ellos.
- **FR-012** *(F12a)*: DEBE paginar con «Anterior» y «Siguiente» y decir la página, el total de páginas y el de cuentas (`meta`). Si una página que no es la primera llega vacía, DEBE pedir `lastPage` una sola vez.
- **FR-013** *(F12a)*: Sin resultados, DEBE decirlo y ofrecer limpiar la búsqueda y los filtros.
- **FR-014** *(F12a)*: En las dos secciones, mientras la lista carga, DEBE decirlo. Si no carga, DEBE ofrecer «Reintentar» sin perder la búsqueda, los filtros ni la página.
- **FR-015** *(F12a)*: Cada fila DEBE ofrecer sólo las acciones que le corresponden según la tabla «Qué acciones ofrece cada fila»: la propia cuenta, marcada «(vos)», y una cuenta que se está borrando no ofrecen ninguna.
- **FR-016** *(F12a)*: Deshabilitar, rehabilitar, hacer admin y quitar admin DEBEN pedir confirmación con el texto que dice qué cambia, y recién entonces llamar a `PATCH /api/admin/users/{id}` con `status` o `role`. *(C3b FR-033 y FR-035)*
- **FR-017** *(F12a)*: Borrar una cuenta DEBE pedir confirmación con el texto que dice qué se borra y que no se deshace, y habilitar el botón sólo después de marcar «Entiendo que no se puede deshacer.», antes de llamar a `DELETE /api/admin/users/{id}`. *(C3b FR-044 y FR-049)*
- **FR-018** *(F12a)*: Con un 200 de `PATCH`, DEBE actualizar la fila con la cuenta que devuelve el servidor y anunciar el cambio.
- **FR-019** *(F12a)*: Con un 202 al borrar, DEBE mostrar el mensaje del servidor y dejar la fila en «Borrándose» (`data.status`), sin acciones.
- **FR-020** *(F12a)*: Ante un 409 `last_admin` o un 422 (`errors.status`, `errors.role` o `errors.user`), DEBE mostrar el mensaje del servidor en el diálogo de la acción, no cambiar la fila y volver a pedir la página. *(C3b FR-034)*

**Invitaciones (F12a)**

- **FR-021** *(F12a)*: «Invitaciones» DEBE listar con `GET /api/admin/invitations`, de a 25 y en el orden de la API, con el email, el rol, el vencimiento en la hora local (o «Vencida», con `expired`), quién la creó («Consola o cuenta borrada» si `invitedBy` es `null`) y la fecha de creación. Nunca hay un token. *(C3b FR-037)*
- **FR-022** *(F12a)*: Las invitaciones de admin vigentes DEBEN destacarse con un texto, «Admin pendiente», y no sólo con color, porque sin correo nadie recibe un aviso. *(C3b FR-037)*
- **FR-023** *(F12a)*: DEBE filtrar por rol y por estado (vigentes o vencidas), con la paginación de FR-012.
- **FR-024** *(F12a)*: «Invitar» DEBE pedir los emails en un campo de varias líneas, separados por saltos de línea, comas o espacios, y el rol: alumno por omisión, o admin.
- **FR-025** *(F12a)*: El cliente DEBE validar sólo que haya entre 1 y 100 emails. La forma, el largo y los repetidos los decide el servidor, que canonicaliza.
- **FR-026** *(F12a)*: DEBE enviar `POST /api/admin/invitations` con los emails en el orden escrito, el rol y `delivery: "link"`.
- **FR-027** *(F12a)*: Ante un 422, los errores de `emails` y de cada `emails.<n>` DEBEN ir al campo de los emails, cada uno precedido por el email de la posición `n` (desde 0) de la lista enviada. Los de `role` y `delivery` van al error general. *(`InviteRequest`; `InvitationsEndpointTest.php`)*
- **FR-028** *(F12a)*: Con un 200, DEBE mostrar un resultado por email, en el orden de la respuesta y con el email que devuelve el servidor, con el texto de `created`, `renewed`, `user_exists` o `invitation_pending` y el vencimiento de cada invitación creada o renovada. *(C3b FR-038)*
- **FR-029** *(F12a)*: Cada enlace DEBE verse en un campo de sólo lectura con «Copiar». Si hay más de uno, DEBE ofrecer «Copiar todos los enlaces», con un renglón por invitación (el email y el enlace). Al copiar, DEBE anunciar «Copiado.».
- **FR-030** *(F12a)*: Si el portapapeles no está disponible, el enlace DEBE quedar seleccionable, y la pantalla DEBE decir cómo copiarlo a mano.
- **FR-031** *(F12a)*: Mientras haya enlaces a la vista, DEBE avisar que no se vuelven a mostrar y cómo conseguir otro. Cerrar el resultado o la administración DEBE pedir confirmación.
- **FR-032** *(F12a)*: «Reenviar» DEBE pedir confirmación, porque el enlace anterior deja de valer, llamar a `POST /api/admin/invitations/{id}/resend` con `delivery: "link"` y mostrar el enlace nuevo con las reglas de FR-029 a FR-031. *(C3b FR-039)*
- **FR-033** *(F12a)*: «Revocar» DEBE pedir confirmación y llamar a `DELETE /api/admin/invitations/{id}`. Con un 204, la invitación sale de la lista. *(C3b FR-039)*
- **FR-034** *(F12a)*: Después de invitar, reenviar o revocar, la lista de invitaciones DEBE volver a pedirse.
- **FR-035** *(F12a)*: Mientras `features.passwordReset` sea `false`, la administración NO DEBE ofrecer la entrega por correo, el reenvío por correo ni la recuperación de un tercero, que hasta C3c responden siempre 503. DEBE decir, en cambio, que los enlaces se entregan a mano y que la recuperación sale por la consola. *(C3b FR-056; C3c FR-008)*

**Contraseña reconfirmada (F12a)**

- **FR-036** *(F12a)*: Ante un 423 `password_confirmation_required`, DEBE pedir la contraseña, confirmarla con `POST /api/auth/confirm-password` y, con un 201, repetir el pedido original exactamente una vez. El front NO DEBE llevar su propia lista de qué acciones piden la contraseña: lo decide el servidor con el 423. *(F12-Q3)*
- **FR-037** *(F12a)*: Ante un 422 `auth_failed` en la confirmación, DEBE marcar el campo con «La contraseña no es correcta.». Ante un 429, DEBE decir cuánto falta según `Retry-After` y no permitir reenviar antes.
- **FR-038** *(F12a)*: Cancelar el pedido de la contraseña NO DEBE hacer la acción, y DEBE decir que no se hizo ningún cambio.

**Errores y estados comunes (F12a)**

- **FR-039** *(F12a)*: Todos los pedidos DEBEN salir por el cliente de la API de F11a y heredar su manejo de 401, 403 `account_disabled`, 409 `account_mismatch`, 419 y las respuestas que no son JSON. Cualquier otro `{message, code}` DEBE mostrar el mensaje del servidor. *(F11 FR-015 a FR-023)*
- **FR-040** *(F12a)*: Ante un 404 en una acción, DEBE decir que la cuenta o la invitación ya no existe y volver a pedir la lista.
- **FR-041** *(F12a)*: Ante un 429 del límite de la administración, DEBE mostrar el mensaje del servidor y cuánto falta según `Retry-After`, y no permitir reenviar antes. *(F11 FR-021)*
- **FR-042** *(F12a)*: Ante un 5xx, una respuesta que no es JSON o una falla de red, DEBE mostrar el mensaje común de F11 y conservar lo escrito: la búsqueda, los filtros y los emails.
- **FR-043** *(F12a)*: Mientras un pedido está en curso, su botón DEBE quedar deshabilitado y decir el estado, y NO DEBE salir un segundo envío.

**Con correo (F12b; espera a C3c)**

- **FR-044** *(F12b)*: Con `features.passwordReset: true`, «Invitar» DEBE ofrecer elegir la entrega, por correo o con enlace. *(C3c FR-008 y FR-057 (a))*
- **FR-045** *(F12b)*: Con la entrega por correo, `created` y `renewed` DEBEN decir que el correo sale, sin enlace, y `rate_limited`, que se llegó al tope de 300 correos por día. *(C3c FR-057 (a))*
- **FR-046** *(F12b)*: La lista DEBE mostrar si una invitación por correo salió (`sentAt`) o no salió (`sendFailedAt`). *(C3c FR-007)*
- **FR-047** *(F12b)*: «Reenviar» DEBE ofrecer «Reenviar por correo» y «Pasar a enlace», con la confirmación de FR-032. *(C3c FR-057 (a))*
- **FR-048** *(F12b)*: Las cuentas de alumnos activos DEBEN ofrecer «Mandarle un enlace para elegir contraseña», con confirmación, que llama a `POST /api/admin/users/{id}/password-reset`. Con un 202, DEBE decir que el enlace salió y vence en 60 minutos. A un admin o a una cuenta que no está activa NO DEBE ofrecérsele. *(C3b FR-036; C3c FR-057 (b))*
- **FR-049** *(F12b)*: Ante un 503 `mail_unavailable`, DEBE mostrar el mensaje del servidor y ofrecer el camino del enlace, sin dar por creada ninguna invitación. *(C3b FR-056)*

**Accesibilidad, celular y movimiento reducido (todas las partes)**

- **FR-050** *(F12a y F12b)*: Todo DEBE poder hacerse sólo con el teclado, con el foco visible y un orden que sigue el visual. Las dos secciones se eligen con el teclado, y el foco inicial va al título del diálogo.
- **FR-051** *(F12a y F12b)*: Cada tabla DEBE tener título y encabezados de columna asociados a sus celdas. Los botones de cada fila DEBEN tener un nombre accesible que incluye a la persona o el email, por ejemplo «Deshabilitar a Ana Pérez».
- **FR-052** *(F12a y F12b)*: Desde 320 px, la página NO DEBE desplazarse en horizontal: una tabla que no entra se desplaza dentro de su propia región, con nombre y alcanzable con el teclado (el patrón de `.sys-table-scroll` de Sistemas). Los campos miden 16 px o más.
- **FR-053** *(F12a y F12b)*: Ningún estado DEBE depender de una animación. Con movimiento reducido rige la regla global de `styles.css`, sin librería de animación.
- **FR-054** *(F12a y F12b)*: Los estilos DEBEN ser clases de las hojas del taller, que reutilizan sus botones, diálogos y tokens. NO DEBE haber ningún `style=`, `style={…}`, `setAttribute('style', …)` ni `.cssText` nuevos. *(F11 FR-069; C4)*

**Formularios, librerías y peso (todas las partes)**

- **FR-055** *(F12a y F12b)*: La búsqueda, «Invitar» y la contraseña DEBEN armarse con React Hook Form, que instala F11a, y enviarse sólo desde su manejador, nunca con el envío nativo (`form-action 'none'`). Los `errors.<campo>` con campo visible van a `setError`, y el resto, a `root.serverError`. *(hoja de ruta, F11)*
- **FR-056** *(F12a y F12b)*: F12 NO DEBE sumar dependencias de runtime: ni librerías de tablas, de diálogos o de portapapeles, ni nuqs. Su estado DEBE ser local a la administración, sin un store compartido nuevo. *(`AGENTS.md`)*
- **FR-057** *(F12a y F12b)*: El PR DEBE medir `dist/index.html` antes y después (`html.length`) y quedar bajo el límite de `qa/build-check.ts` vigente al integrar: hoy, 1 250 000 caracteres; con C4, el tope por archivo.

**Verificación (todas las partes)**

- **FR-058** *(F12a y F12b)*: Cada comportamiento DEBE empezar con una prueba que falla. Se usa Vitest con Testing Library para la lógica y los componentes, con el `fetch` inyectado en el cliente y las entradas armadas con fishery a partir de las formas del contrato (`AdminUser`, `AdminInvitation` y la página). Los valores esperados se escriben a mano, nunca con la misma factory. *(constitución, principio II; ADR 0008)*
- **FR-059** *(F12a y F12b)*: Los E2E DEBEN usar un Page Object de la administración, con localizadores accesibles, sobre el doble de la API de F11a con una sesión de admin y las rutas de `/api/admin` respondidas según el contrato de C3b, sin el stack ni servicios externos. Los diálogos, el foco y el portapapeles se prueban ahí. *(ADR 0008)*
- **FR-060** *(F12a y F12b)*: La red E2E vigente en la base de cada parte, `boot-check`, `dist-content-check` y `load-order-check` DEBEN seguir en verde sin editar sus escenarios.
- **FR-061** *(F12a y F12b)*: Cada parte DEBE cerrar con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde, y actualizar `docs/architecture.md` y `qa/AGENTS.md` con lo que agrega.

**El compromiso con F10 (F12a; F12-Q1)**

- **FR-062** *(F12a)*: La página de la administración DEBE vivir en su propio slice, separada del diálogo que la contiene. DEBE recibir del contenedor sólo la sección inicial y qué hacer al cerrar, y NO DEBE importar nada de «Tu cuenta», de la raíz de la cuenta ni de `<dialog>`. Así, el diálogo y su entrada son la única pieza que F10 reemplaza por la ruta. La condición de admin DEBE vivir en un solo lugar, que usan la entrada de hoy y la ruta de F10.
- **FR-063** *(F12a)*: El Page Object de la administración DEBE abrirla desde un único método, el único que F10 cambia al pasarla a una ruta. Los demás escenarios DEBEN ubicarla por su título y sus roles accesibles, no por el diálogo que la contiene.

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
- **SC-010** (F12a): Una spec de componente monta la página de la administración sola, fuera del diálogo y de «Tu cuenta», con la sección inicial y la acción de cierre que recibe, y la usa sin errores. En los E2E, 1 solo método del Page Object sabe cómo se abre la administración (F12-Q1).

## Assumptions

**Las dependencias y su estado**

- **F11a está integrada antes de planificar F12a** (ver «Dependencias reales»). Los nombres que usa esta spec (el cliente de `shared/api`, la sesión de `entities/session`, «pedir el ingreso», la raíz de la cuenta, el doble de la API) son los provisionales de la spec de F11. Si su plan los cambia, esta spec se ajusta.
- **El doble de la API de F11a** responde una sesión con cuenta por omisión, y F11 no dice con qué rol. F12 supone que el rol se puede elegir por escenario y que por omisión es `student`. Con el montaje de F12-Q1, el rol por omisión no cambia lo que mide la red, porque la entrada vive dentro de «Tu cuenta». F12 suma la variante de admin y las rutas de `/api/admin`.
- **Los contratos de C3b** son los entregados y se contrastaron con el código de `e87772d` (las rutas, los controladores, los `FormRequest`, los presentadores, `lang/es/` y las pruebas de Pest de la administración). Si C3b cambia por flow-forward, esta spec se ajusta.
- **C3c está sólo especificada,** y su plan espera el dominio. Lo que F12b toma de ella (`rate_limited`, `sentAt` y `sendFailedAt`, el 202 de la recuperación y la bandera) es un supuesto hasta que tenga plan.
- **F12a llega antes que F10.** F12a sólo espera a F11a, y F10 es el final del tronco del front. Si F10 llegara primero, la administración nace como una ruta de la raíz única y el plan de F12a lo consulta con el usuario («El compromiso con F10»).
- **C4 toma la compuerta.** La spec de C4 (008, planificada y sin implementar) suma F12a a su compuerta G1 cuando el coordinador integre este clarify (F12-Q2). Esta spec no la edita.
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
| Dónde se monta (F12-Q1) | Las seis candidatas de la tabla siguiente | **Diálogo ahora, ruta en F10** (usuario). El usuario eligió primero la ruta de F10 (D). Cuando se le mostró que, junto con F12-Q2, eso dejaba a C4 detrás de todo el front (F3 a F10), la cambió por el diálogo de A como montaje de F12a, con el compromiso de que F10 lo convierta en una ruta enlazable. Así se conserva lo que buscaba con D, una administración enlazable, sin atar C4 al port. Costo: hasta F10 no se puede enlazar y recargar la cierra; F12a deja la página separada del diálogo (FR-062 y FR-063) |
| Si C4 espera (F12-Q2) | Espera a F12a; no espera; espera sólo a las cuentas | **Espera a F12a** (usuario; era la recomendada): cuesta poco en calendario y saca a `curl` y a `tinker` de la respuesta a un incidente |
| La contraseña reconfirmada (F12-Q3) | A pedido, ante el 423; siempre antes, como F11b; consultar el estado antes | **A pedido** (usuario; era la recomendada): decide el servidor, y una tanda de cambios pide la contraseña una vez cada 15 minutos |
| La partición (P3) | Dos partes (sin correo y con correo); tres (cuentas, invitaciones y correo); no partir | **Dos partes** (usuario; era la recomendada), por la dependencia de C3c, como F11c |
| La ficha de usuario | Una vista aparte con `GET /api/admin/users/{id}`; la fila de la lista | **La fila:** la lista trae la misma forma. C5 suma su resumen a la ficha cuando llegue |
| El orden de la lista | Elegirlo (`sort`); el de la API, por nombre | **El de la API.** Buscar y filtrar alcanzan para un aula de 40, y `sort` queda disponible |
| Cuándo se busca | En cada tecla, con espera; al enviar | **Al enviar:** el límite es de 120 pedidos por minuto, y un pedido por tecla lo come |
| Cómo se entrega un enlace | Sólo un botón de copiar; un campo de sólo lectura con copiar; un archivo | **El campo con copiar:** sirve también sin portapapeles. Un archivo deja los tokens en el disco |
| Rehabilitar sin confirmación | Confirmar sólo lo que quita algo; confirmar todo lo que cambia una cuenta | **Confirmar todo:** una sola regla, fácil de probar, y un clic más en una acción rara |
| La tabla en el celular | Una región que se desplaza; tarjetas en lugar de filas | **La región:** ya existe en Sistemas (`.sys-table-scroll`). Las tarjetas son un segundo diseño que mantener |
| Librerías | Una de tablas o de diálogos; HTML y las clases del taller | **HTML y las clases del taller** (FR-056): el peso es chico y el `<dialog>` nativo ya está en uso |

**Las candidatas de F12-Q1, medidas.** Cada una se midió contra el contrato de las ocho vistas (`viewFromHash`, de F2b, devuelve `recorrido` para cualquier otro hash, y por eso F11 descartó `#cuenta`), contra la red de F1 (`views.spec.ts` y las reglas R4 y R8 del contrato de CSS), contra lo que va a cambiar F10 y contra el costo de tiempo.

| Candidata | Lo que gana | Lo que cuesta |
| --- | --- | --- |
| **A.** Un diálogo propio a pantalla entera, que se abre desde «Tu cuenta» (elegida para F12a) | No toca el contrato de las ocho vistas, ni `app.js`, ni el shell, ni el arranque: la red de F1 no ve nada. No espera a ningún port | No se puede enlazar; recargar la cierra; las confirmaciones son diálogos sobre un diálogo (FR-005 limita a uno por vez); la tabla vive en un modal |
| **B.** Una sección dentro del mismo diálogo «Tu cuenta» | Lo mismo que A | «Tu cuenta» ocupa la pantalla entera sólo en el celular (FR-067 de F11): en una computadora no entran la tabla ni el lote. El diálogo que comparten F11a, F11b y F11d suma una sección más |
| **C.** Una raíz previa al shell, con una forma de URL nueva | Página entera y enlazable | Una forma de URL nueva en la gramática de F2b y en `url-contract`, una rama en la etapa de sesión que A3 extiende, y una fila en `load-order-check`. Volver al taller recarga, y entrar desde el shell exige cambiar la query |
| **D.** Una ruta de la raíz única de F10 (la primera elección del usuario) | Sin montaje que se tire | F12 espera a F10, el final del tronco; con F12-Q2, C4 espera todo el port |
| **E.** Una novena vista del shell legacy | Página entera y enlazable | Cambia el contrato de las ocho vistas, la navegación (R8) y `app.js`, que cada port toca de a uno |
| **F.** Como A, con su propio botón en la barra superior | Un clic menos | Vuelve a cambiar la barra superior que F11a ya cambió, tensa los 320 px, y lo que mide la red depende del rol simulado |

## Riesgos

1. **El peso.** Después de F2a y A2, `dist/index.html` mide 1 136 702 caracteres (T020 de F2b), el límite de `qa/build-check.ts` es de 1 250 000 y F2b suma unos 4 266. F11a suma React Hook Form (unos 43 KB minificado, según su spec) y su propio código, así que a F12 le puede quedar poco margen para tablas, formularios y diálogos. *Mitigación:* FR-056 y FR-057, sin dependencias nuevas y con la medida en el PR. Si no entra, decide el usuario: subir el límite o esperar a que C4 cambie el contrato del build.
2. **Un enlace que se ve una sola vez se pierde** si se cierra, se recarga o se cae la pestaña. *Mitigación:* el aviso, la confirmación al cerrar (FR-031) y «Reenviar», que invalida el anterior.
3. **Dos admins con la lista vieja.** *Mitigación:* decide el servidor; la pantalla maneja el 404, el 409 y el 422 y vuelve a pedir la lista (FR-020, FR-034 y FR-040).
4. **Una sesión de admin robada.** Con la contraseña a pedido (F12-Q3), durante los 15 minutos de la confirmación una acción destructiva sale sólo con su confirmación. *Mitigación:* es la política del servidor (900 s), cada acción pide confirmación, y C4 trae la CSP estricta. El riesgo de fondo, el admin sin segundo factor, es del ADR 0006 (§4.10).
5. **Diálogos sobre un diálogo y el foco.** jsdom no implementa `showModal` (ADR 0008). *Mitigación:* como mucho un diálogo sobre la administración (FR-005), y el foco se prueba en E2E (FR-059).
6. **Una mudanza a la ruta de F10 que termine reescribiendo la página.** *Mitigación:* el compromiso con F10 y FR-062 y FR-063: la página recibe sólo la sección inicial y el cierre, no conoce el diálogo, y un solo método del Page Object sabe cómo se abre (SC-010).
7. **El código de administración viaja a todos los alumnos** hasta C4. *Mitigación:* no trae secretos, sólo nombra rutas que los contratos ya publican, y el servidor exige el rol en cada una. Sin `vite-plugin-singlefile`, el plan de entonces puede separarlo en su propio archivo.
8. **El contrato de C3c puede cambiar en su plan.** *Mitigación:* F12b se planifica con C3c, no antes.
9. **Tablas a 320 px.** *Mitigación:* la región que se desplaza (FR-052) y los nombres accesibles por fila (FR-051).
10. **F11a es grande, no tiene plan y sus nombres son provisionales.** *Mitigación:* F12a se planifica sobre F11a ya integrada, y esta spec sólo toma de F11 lo que su clarify fijó.
11. **C4 espera a F12a** (F12-Q2): si F12a se demora, C4 espera. *Mitigación:* F12a sólo depende de F11a, que va antes que A3 y, por lo tanto, antes que C4; se planifica en cuanto F11a esté integrada.

## Relación con otros ítems

**C3b** (spec 010, entregada). Hallazgos para su dueño, sin cambiar nada:

1. No hay ningún comando de consola para listar cuentas, cambiar un rol o un estado, revocar una invitación ni borrar otra cuenta: sin F12, eso sólo se hace por HTTP o con `tinker`. Por eso C4 espera a F12a (F12-Q2).
2. `lang/es/invitations.php` muestra los valores en inglés («admin o student», «link o email», «pending o expired»), mientras `lang/es/admin.php` dice «admin o estudiante». La interfaz no manda valores inválidos, así que es de baja severidad.
3. F12 no usa `GET /api/admin/users/{user}`: la lista trae la misma forma. C5 lo extiende con su resumen.

**C3c** (spec 011, sólo especificada):

- F12b consume el «enviar por correo» que la spec de C3c le atribuye a F12: la invitación y el reenvío por correo, la recuperación de un tercero, `sentAt`, `sendFailedAt` y `rate_limited`.
- `features.passwordReset` es la bandera de «hay correo» (C3c FR-008).

**C4** ([spec 008](../008-c4-exposicion/spec.md), planificada):

- Espera a F12a (F12-Q2): su compuerta G1 (FR-044 de C4) suma «las pantallas de administración integradas». Hoy no la nombra: la enmienda la integra el coordinador en la spec de C4, que está planificada y sin implementar, y en la hoja de ruta del backend. No espera a F12b.
- F11 dejó abierta la misma pregunta para F11b (descargar y borrar la propia cuenta), y este clarify no la responde.
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

**F11b:** comparte el pedido de la contraseña. El que llegue segundo lo mueve a un lugar compartido, como propone F11. Con la contraseña a pedido (F12-Q3), F12 lo usa ante un 423 y F11b, antes de la acción: el componente es el mismo y cambia el momento.

**F11c y F11d:** no le cambian nada a F12.

**F10:** asume el compromiso de convertir la administración en una ruta enlazable de la raíz única (F12-Q1): decide la forma de la URL y qué ve en ella una cuenta que no es admin, reemplaza el diálogo y su entrada y reescribe los E2E que los abren y cierran. F12a le deja la página separada del diálogo y un solo método de apertura en el Page Object (FR-062 y FR-063; «El compromiso con F10»). F10 no espera a F12a: si F12a ya está integrada cuando F10 llega, la muda.

**F1, A2 y F2b:** F12 no edita sus escenarios ni sus checks, y no cambia la gramática de URL.

**A3:** independiente. La administración no lee el contenido, sólo la sesión que la etapa de F11a ya guarda.

**D1:** el texto de borrar una cuenta distingue la supresión de «Borrar todo», como pide C3b (FR-049).

**Hojas de ruta** (las integra el coordinador):

- en la del front, F12 depende de F11a, no de toda F11;
- F12 deja de ser un ítem que «no bloquea a ningún otro»: C4 espera a F12a (F12-Q2), y la dependencia se suma en la del backend (la fila y el «Orden y paralelismo» de C4) y en la compuerta G1 de la spec de C4;
- la tabla de ítems suma F12a y F12b (P3): F12a depende de F11a y la espera C4; F12b depende de F12a y de C3c;
- el «Entra» de F10 suma convertir la administración en una ruta enlazable, con lo que dice «El compromiso con F10»;
- la decisión abierta de F12 («dónde se monta y si C4 la espera») queda cerrada por el clarify del 2026-10-28;
- la hoja de ruta del front todavía dice que el límite de `build-check` es de 2 500 000 caracteres: desde A2 es de 1 250 000.

## Acciones del usuario

Los agentes no las hacen. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII).

| Cuándo | Acción |
| --- | --- |
| Hecho el 2026-10-28 | Respondió Q1 a Q3 y aceptó la partición (ver «Clarifications»). |
| Antes de integrar F12a | Nada nuevo: F12 no baja paquetes. Con el stack levantado, crear el primer admin por consola (`taller:invite --role=admin`) para probarla a mano. |
| Antes de F12b | El dominio de C3c y C4. |

## Descargas previstas

Ninguna. F12 reutiliza React Hook Form (lo instala F11a) y la pila de pruebas que traen F3 o F11a. No suma librerías de tablas, de diálogos, de portapapeles ni nuqs.
