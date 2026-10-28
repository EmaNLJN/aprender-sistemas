# Feature Specification: F11 · Acceso y cuenta

**Feature Branch**: `015-f11-acceso-cuenta` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-07

**Status**: Clarificada el 2026-10-28: Q1 a Q5 respondidas y la partición en cuatro partes aplicada (F11a a F11d); sin plan

**Input**: Ítem **F11** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Acceso y cuenta»: las pantallas de cuenta como una raíz previa al shell. Son el ingreso, la invitación, recuperar y cambiar la contraseña, exportar y borrar la cuenta, el aviso de privacidad y, de D1, la opción «computadora compartida» y la pregunta «¿Este progreso es tuyo?». Lo encargó el coordinador el 2026-10-07. Consume los contratos de C3a ([spec 004](../004-c3-identidad-acceso/spec.md) y su [contrato HTTP](../004-c3-identidad-acceso/contracts/http.md)), de C3b ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md) y su [contrato HTTP](../010-c3b-admin-ciclo-de-vida/contracts/http.md)), de C3c ([spec 011](../011-c3c-correo/spec.md), sólo especificada) y de D1 ([spec 007](../007-d1-progreso-sincronizacion/spec.md) y el [contrato de D1b](../007-d1-progreso-sincronizacion/contracts/http-d1b.md)). Se contrastaron con el código de la API en `master` (`e87772d`): `backend/api/routes/api/`, `backend/api/app/Http/` y `backend/api/lang/es/`. Se apoya en el arranque por etapas de A2 ([spec 006](../006-a2-compuerta-arranque/spec.md)), cuyo código vive en la rama `f2a/base` (`2ffbbc6`, PR #40, abierto) y todavía no en `master`; por eso se cita por rama y ruta, sin enlace. La interfaz con A3 (spec 016, PR #49, rama `spec/a3-contenido-api`, que se cita sin enlace) quedó acordada en el clarify del 2026-10-28. Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) y el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), aceptados, el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md), en propuesta, el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** Desde C3a el taller tiene cuentas, pero nadie puede usarlas desde el navegador. El alta, el ingreso y la recuperación existen sólo como contrato HTTP y como enlaces que imprime la consola. Y un `#invitacion=<token>` cae hoy en «Mi recorrido», con el token a la vista en la barra de direcciones. F11 trae las pantallas que faltan:

- crear la cuenta con el enlace de invitación;
- ingresar y salir;
- elegir una contraseña nueva con el enlace de recuperación;
- leer y aceptar el aviso de privacidad;
- cambiar la contraseña, descargar los datos de la cuenta y borrarla.

Más adelante suma pedir el enlace por correo, cuando exista C3c, y las dos pantallas que pide D1 para una computadora compartida.

F11 vive en una raíz de React propia, antes del shell legacy y a su costado, nunca adentro: no espera a F10 ni toca las vistas. Entra al arranque de A2 con dos etapas. La primera borra los tokens de la URL antes de que nadie la mire. La segunda pide la sesión en cada arranque y, sin sesión, muestra el ingreso: desde F11a no se entra al taller sin cuenta, como decidió el usuario. Después, A3 extiende esa etapa para leer el contenido de la API.

Es para el alumno que recibe la invitación y estudia con su cuenta, para quien opera el taller y entrega los enlaces, y para A3, D1c, A4 y F12, que necesitan saber quién es la cuenta. No es un port, porque las pantallas no existen en el legacy; aun así, el resto del taller no cambia: ni el aspecto, ni el comportamiento, ni el progreso guardado, ni las URL. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Una persona abre el enlace de invitación, crea su cuenta y entra al taller sin cortes. El token nunca queda en la barra de direcciones ni en el historial.
2. Quien olvidó la contraseña elige una nueva con el enlace que le pasa quien opera el taller, y después ingresa.
3. Sin sesión sólo se ve el ingreso; con sesión, el arranque pasa a la compuerta del contenido sin recargar. La red de 123 E2E pasa sin editar sus escenarios gracias al doble de la API, y la vista previa y `npm run dev` pasan `/api/` al stack.
4. Cada pantalla resuelve sus estados (cargando, error de un campo, error del servidor, sesión vencida o de otra cuenta y límite de intentos) con un mensaje en español que dice qué hacer. Ninguno revela si un email tiene cuenta.
5. Ninguna contraseña ni ningún token quedan en el almacenamiento del navegador, en la URL ni en la consola.
6. Todo se completa con el teclado y en un celular de 320 px, y nada depende de una animación.
7. Desde «Tu cuenta», una persona descarga sus datos y borra su cuenta sin confundir eso con «Exportar mi progreso» ni con «Borrar todo».
8. `dist/index.html` sigue bajo el límite de `build-check`, y lo que suma cada parte queda medido.

**Entra** (entre paréntesis, la parte de la partición propuesta a la que va):

- **Las etapas del arranque y la raíz de la cuenta (F11a):**
  - la etapa de los tokens, primera de todas, que lee y borra los fragmentos con token;
  - la etapa de sesión, que pide `GET /api/session` en cada arranque y que A3 extiende después, con «pedir el ingreso»;
  - una raíz de React con su propio elemento;
  - la entrada «Tu cuenta» en la barra superior y su diálogo;
  - el doble de la API como fixture automático de los E2E, y el proxy de `/api/` de la vista previa y de `npm run dev`.
- **El cliente de la API (F11a):** el CSRF, la cuenta esperada, los errores `{message, code}` y las respuestas que no son JSON. Lo usan las cuatro partes y, después, A3, D1c, A4 y F12.
- **El acceso (F11a):**
  - el ingreso con «Recordarme»;
  - el alta con el enlace de invitación;
  - el restablecimiento con el enlace de recuperación;
  - el aviso de privacidad: leerlo, aceptarlo en el alta y volver a aceptarlo cuando cambia;
  - «Salir».
- **La cuenta (F11b):** cambiar la contraseña, descargar los datos de la cuenta y borrarla, siempre con la contraseña reconfirmada.
- **Recuperar por correo (F11c):** «¿Te olvidaste la contraseña?», cuando C3c encienda `features.passwordReset`.
- **Lo de D1 (F11d):** la opción «computadora compartida» del ingreso, y el resumen con la pregunta «¿Este progreso es tuyo?». Las dos van sobre el cliente de D1c.
- **Las pruebas:**
  - specs de Vitest con Testing Library y fishery;
  - E2E con Page Objects y la API simulada;
  - la documentación que cambia con ellas: `docs/architecture.md` y `qa/AGENTS.md`.

**Queda fuera:**

- **La API.** Es de C3a, C3b y C3c, y F11 no cambia ningún contrato. Lo que le falta a uno queda como hallazgo (ver «Relación con otros ítems»).
- **Las pantallas de administración** (F12) y **las estadísticas** (C5).
- **El registro abierto y su verificación de email** (`#verificar=`): C3c los deja detrás de `REGISTRATION_OPEN=false`. El motivo está en «Sin hacer a propósito».
- **Lo de D1 que no es de F11:**
  - la confirmación de contraseña de «Borrar todo», que es de F8;
  - el estado de sincronización, el aviso al salir con la cola sin enviar y los avisos de cuenta distinta, época cambiada y reloj desfasado, que son de F13 (propuesta);
  - el cliente v2 con sus espacios por cuenta, que es D1c.
- **Leer el contenido de la API, la última copia y el aviso sin backend:** son de A3, que extiende la etapa de sesión de F11a con la `Content-Version` y el 401 de las porciones (C1).
- **El router y la raíz única** (F10). Hasta F10 conviven dos raíces de React: la de la cuenta y la de la vista montada.
- **Cambiar una vista legacy o `frontend/app.js`.**

**Sin hacer a propósito (YAGNI):**

- **Cambiar el nombre** (`PATCH /api/me`) y **cerrar las otras sesiones** (`POST /api/me/sessions/logout-others`): existen en C3a, pero nadie los pidió para F11, y cambiar la contraseña ya cierra las otras sesiones.
- **El registro abierto y la verificación de email:** están apagados, y una cuenta creada por invitación nace verificada. Un 403 `email_unverified` se muestra con el mensaje del servidor, sin un recorrido propio.
- **Un esquema de validación propio** (como zod) **o reglas de composición de contraseñas:** la política es del servidor.
- **MSW:** el cliente recibe `fetch` por inyección, y las specs le pasan uno falso.
- **nuqs:** F11 no guarda estado en la query.
- **Un temporizador visible de la sesión, una librería de interfaz, de diálogos o de animación, y estado de formulario propio.**

**Actores:**

- **El alumno** (rol `student`): recibe la invitación, ingresa, estudia y administra su cuenta.
- **Quien opera el taller:** entrega los enlaces de invitación y de recuperación por la consola y, con F12, desde la administración.
- **El admin:** ingresa y estudia como cualquier alumno.
- **Los ítems que se apoyan en F11:**
  - A3: la sesión y el ingreso;
  - D1c: el ingreso, la salida, el modo compartido y la importación;
  - A4 y F12: el cliente de la API y el ingreso.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta.

| Pedido | Fuente |
| --- | --- |
| F11 trae todas las pantallas de cuenta (ingreso, invitación, recuperar y cambiar la contraseña, exportar y borrar la cuenta y el aviso de privacidad) y, de D1, la opción «computadora compartida» y la pregunta «¿Este progreso es tuyo?». F12 trae las de administración | Coordinador, 2026-10-05; hoja de ruta del front, F11 y «Superficies que pide D1» |
| Las pantallas entran como una raíz de React previa al shell y no esperan a F10 | Coordinador, 2026-10-07 (el encargo); hoja de ruta, «Pantallas de acceso (A3 y C3)», donde figura como una decisión de la planificación que el usuario todavía no confirmó. Q1 y Q3 la precisan, y «Acciones del usuario» pide confirmarla |
| Antes de que `app.js` mire el hash, los fragmentos con token (`#invitacion=` y el de recuperación) se borran de la URL con `history.replaceState` | Hoja de ruta, F11; contrato HTTP de C3a, «Lo que el front tiene que hacer» |
| Formularios con una librería establecida, no con estado propio: se recomienda React Hook Form, y TanStack Form es la alternativa. Los `errors.<campo>` de un 422 van a `setError`, y los `{message, code}`, a `root.serverError`. El servidor manda en la política de contraseñas, y el cliente valida sólo lo obligatorio y el largo de 15 a 64. La librería se instala con el primer formulario y con permiso, y su peso se mide en `dist/index.html` | Usuario, 2026-10-06; hoja de ruta, F11 |
| Cada descarga pide permiso con nombre, origen y tamaño | Hoja de ruta, «Acciones del usuario»; constitución, principio VII |
| Zustand y nuqs entran sólo con su primer caso real; Zustand ya entró con F2a | `AGENTS.md`; hoja de ruta, F10 |
| Vitest con Testing Library y fishery para la lógica y los componentes, y Playwright con Page Objects para los E2E, sin tocar servicios públicos | ADR 0008 (aceptado); constitución, principio II |
| TDD; código y pruebas en inglés; interfaz en español rioplatense; teclado, celular y movimiento reducido | `AGENTS.md`; constitución, principios II, III y VI |
| Si F11 espera demasiado, su clarify decide cómo se parte y si A3 espera toda F11 o sólo el acceso | Hoja de ruta, «Decisiones abiertas», F11 |
| La spec, en español y sin código: como mucho cinco preguntas para el clarify, y la partición propuesta sin aplicar | Coordinador, 2026-10-07 |

## Clarifications

### Session 2026-10-28

- Q: ¿Se parte F11, y qué espera A3? (P1) → A: Sí, en cuatro partes con el corte de esta spec: F11a (acceso), F11b (cuenta), F11c (correo, que espera el dominio) y F11d (lo de D1, que espera D1c). A3 espera sólo a F11a, y el ciclo con D1c desaparece. Decidió el usuario. (Partición)
- Q: ¿Cómo se conectan A3 y F11? (R1) → A: F11 expone «pedir el ingreso», una operación que se espera y termina con la cuenta, y la etapa de sesión la llama cada vez que recibe `user: null`, al arrancar y después de un 401. Se cierran las otras cuatro diferencias como las proponía esta spec: el aviso de privacidad va en F11a; un token con una sesión viva igual muestra el alta o el restablecimiento; la reaceptación del aviso pasa por el acceso; y F11a arma el doble de la API de los E2E, que A3 reutiliza. Decidió el usuario. (FR-004 a FR-007, FR-014 y FR-046)
- Q: ¿De quién es la etapa de sesión? (ruling C1 del coordinador) → A: Como la sesión es obligatoria desde F11a, la etapa de sesión (`GET /api/session` y «pedir el ingreso») la introduce F11a. A3 la extiende: usa la `Content-Version` de la sesión para las porciones y, ante un 401 en una porción, llama a «pedir el ingreso». El proxy de `/api/` de la vista previa y de `npm run dev` también llega con F11a. (FR-001, FR-003, FR-006, FR-008 y FR-036)
- Q: **Q1**, ¿la sesión es obligatoria antes de A3? → A: Sí, obligatoria ya (no era la recomendada). F11a pide `GET /api/session` en cada arranque y muestra el ingreso sin sesión. Por eso F11a trae el doble de la API como fixture automático de los E2E, con una sesión simulada por omisión, para que los 123 escenarios no se editen, y la vista previa pasa `/api/` al stack. Decidió el usuario. (FR-003, FR-004, FR-009, FR-014 y FR-036)
- Q: **Q2**, ¿de dónde salen el texto del aviso de privacidad y su versión? → A: De un archivo del front con el texto y su versión, y la misma versión va en `PRIVACY_VERSION`, en el `.env` (opción A). Decidió el usuario. (FR-045)
- Q: **Q3**, ¿dónde va la entrada a «Tu cuenta»? → A: Un botón en la barra superior, junto al selector de lenguaje, que abre un diálogo modal (opción A). Decidió el usuario. (FR-012)
- Q: **Q4**, ¿qué hace «Salir» con el progreso del navegador antes de D1c? → A: No lo toca, y «Tu cuenta» lo avisa junto al botón (opción A; ADR 0003). Decidió el usuario. (FR-052)
- Q: **Q5**, ¿dónde se elige «computadora compartida»? → A: En «Tu cuenta» (no era la recomendada). Al activarla, el cliente de D1c borra en ese momento el espacio local de la cuenta. El FR-070 de D1, que elegía el modo en el ingreso, antes de guardar nada, se enmienda en D1c. Decidió el usuario. (FR-062 y FR-063)
- Q: **A3-Q3**, ¿la vista previa pasa `/api/` al stack? → A: Sí, y como la sesión obligatoria lo adelanta, llega con F11a. Decidió el usuario. (FR-036)
- Hallazgos del clarify de A3 (spec 016, `a46c5f6`) que el coordinador pasó a F11: el tiempo que el alumno pasa en «pedir el ingreso» no cuenta para el tope de 20 s del intento de arranque de A3 (su FR-010), y al activar «computadora compartida» también se borra la copia del contenido de A3, como uno de los datos locales de la cuenta que registra cada dueño. (FR-006 y FR-062)
- La Q2 de A3 la registra A3: sin servidor, sólo usa la copia quien no cerró su sesión, y salir la borra. Acá fija que «Salir» borre la copia desde A3 (FR-050) y que el modo compartido de F11d tampoco la guarde.

## Partición

**La aplicó el usuario el 2026-10-28 (P1).** F11 se parte en cuatro, cada parte con su plan y sus tareas, y sigue siendo una sola spec, como D1 y F2: cada parte toma su rango de requisitos.

**Por qué se partió.** Sin partir, F11 no tenía orden posible; el tamaño venía después.

- **Con lo de D1 adentro, F11 no se podía entregar.** Lo de D1 espera a D1c. D1c espera a A4 (Q4 de D1) y también a F11 (su fila «Depende de» en la spec 007). A4 espera a A3, y A3 espera a F11. Con F11 en una sola pieza, A3 esperaría a D1c, D1c a A4 y A4 a A3: el ciclo se cerraba.
- **Con el pedido del enlace por correo adentro, A3 quedaba atada a una decisión de afuera.** Ese pedido necesita C3c, y el plan de C3c espera el dominio, que también pide C4. El restablecimiento con el enlace de la consola (`#restablecer=<token>&email=<email>`) ya funciona con C3a.
- **Lo que espera a C3b no frena nada:** C3b ya está entregada (PR #37). Exportar y borrar la cuenta no traban a nadie, pero tampoco son lo que A3 necesita.

| Parte | Qué trae | Depende de | Requisitos propios | Con los 12 transversales | Quién la espera |
| --- | --- | --- | --- | --- | --- |
| **F11a · Acceso** | Las etapas de los tokens y de sesión, «pedir el ingreso», la raíz de la cuenta y su entrada en la barra superior, el cliente de la API, los formularios, el ingreso, el alta, el restablecimiento con el enlace, el aviso de privacidad, «Tu cuenta», «Salir», el doble de la API de los E2E y el proxy de `/api/` | A2 (PR #40) y C3a (entregada) | 52 (FR-001 a FR-052) | 64 | A3, D1c, F11b, F11c, F11d y F12 |
| **F11b · Cuenta** | Cambiar la contraseña, descargar los datos de la cuenta y borrarla | F11a; C3a y C3b (entregadas) | 7 (FR-053 a FR-059) | 19 | Nadie del tronco (C4, ver «Relación con otros ítems») |
| **F11c · Recuperar por correo** | «¿Te olvidaste la contraseña?» y su pantalla | F11a y C3c, que espera el dominio | 2 (FR-060 y FR-061) | 14 | Nadie |
| **F11d · Lo de D1** | «Computadora compartida» en «Tu cuenta» y «¿Este progreso es tuyo?» | F11a y D1c, que espera a A4 | 4 (FR-062 a FR-065) | 16 | D1c, que entra en servicio con ella |

Los doce transversales (FR-066 a FR-077) valen para cada parte y se repiten en su cuenta, como hizo F2 con las reglas de todas sus unidades: teclado, celular, movimiento reducido, estilos, seguridad, librerías, peso y verificación. En total, la spec tiene 77 requisitos, contra los 52 de C3a, la mayor del épico hasta ahora, y cada uno lleva una sola obligación que se puede comprobar. Los criterios de éxito llevan entre paréntesis la parte a la que van.

**Cómo se planifica cada parte:**

- **F11a primero,** porque es la que espera A3. Su plan cubre FR-001 a FR-052, los transversales, SC-001 a SC-008, SC-011 y SC-012, y las historias 1 a 5. La reparte en unidades, cada una con su prueba y su punto de reversión, por ejemplo:
  - las etapas, el cliente, el doble de la API y el proxy;
  - el ingreso y la salida;
  - el alta y el aviso;
  - el restablecimiento.
- **F11b** cubre FR-053 a FR-059 con las historias 6 y 7 y SC-009, sobre el diálogo «Tu cuenta» de F11a. Se puede planificar en paralelo con F11a, pero se integra después.
- **F11c** cubre FR-060 y FR-061 con la historia 8 y SC-010, y se planifica con C3c, cuando haya dominio.
- **F11d** cubre FR-062 a FR-065 con la historia 9 y SC-010, y se planifica con D1c (o pasa a F13, si el usuario acepta ese ítem).

**El costo:**

- Cuatro ciclos de plan y tareas.
- F11a es la parte más grande del épico: 64 requisitos con los transversales.
- F11b, F11c y F11d tocan el diálogo «Tu cuenta» y el ingreso que deja F11a, así que se integran después de F11a y de a una.

**Las alternativas que no se eligieron:**

- **Tres partes, con F11a y F11b juntas.** Ahorraba un ciclo, pero A3 esperaba además cambiar la contraseña, exportar y borrar, que no usa.
- **El corte que sugería la hoja de ruta:** el acceso (ingreso, invitación y contraseña), la cuenta (exportar, borrar y privacidad) y lo de D1. Era anterior a la partición de C3b y C3c. Dejaba «recuperar» en el acceso, así que A3 esperaba el dominio, y sacaba el aviso de privacidad del acceso, aunque el alta no se puede enviar sin aceptarlo.
- **No partir.** No se podía, por el ciclo con D1c.

## Las etapas de F11 y la raíz de la cuenta

Esta sección fija dónde entra F11 en el arranque de A2, qué le suma A3 después y cómo convive con el shell legacy. Los nombres de módulos son provisionales y los confirma el plan; la spec fija la responsabilidad y el contrato.

**El arranque de hoy** (rama `f2a/base`, `2ffbbc6`). `frontend/src/app/main.tsx` llama a `runBoot([contentGate, legacyViews])`, y `runBoot` (`frontend/src/app/boot/run-boot.ts`) recorre las etapas una vez cada una y en orden:

- **`contentGate`** (`content-gate.ts` y `content-stage.ts`) lee el documento estático, dibuja la espera y el error en `#main` y publica el contenido.
- **`legacyViews`** evalúa las fuentes legacy y llama a `startApp()`.

**Con F11a, la secuencia es `runBoot([tokens, session, contentGate, legacyViews])`.** Las dos etapas nuevas son de F11a (ruling C1). A3 no suma otra: extiende la de sesión.

**La etapa de los tokens, primera de todas:** lee los fragmentos `#invitacion=<token>` y `#restablecer=<token>&email=<email>`, los guarda en memoria, los borra con `history.replaceState` y deja dicho que había un token. Todo eso pasa antes de la etapa de sesión, de la compuerta y de `app.js`, y no pide nada a la red.

**La etapa de sesión** (F11a; Q1 y C1):

- Pide `GET /api/session` en cada arranque, también antes de A3, aunque el contenido siga siendo estático.
- Con `user: null`, llama a «pedir el ingreso» y la espera. Mientras tanto se ve el acceso (el ingreso, o el alta o el restablecimiento si hay token), la compuerta no corre y ninguna fuente legacy se evalúa.
- Con un token, muestra el alta o el restablecimiento aunque haya una sesión viva (R1).
- Con `privacyAccepted: false`, pide aceptar el aviso antes de seguir: la reaceptación pasa por el acceso (R1).
- Cuando «pedir el ingreso» termina con la cuenta, vuelve a pedir la sesión una vez y resuelve. La compuerta sigue sin recargar el documento y con la URL que pidió el alumno.
- Si `GET /api/session` no responde, o responde un 5xx o algo que no es JSON, muestra que no pudo conectar, con «Reintentar». Desde A3, quien no cerró su sesión en ese navegador sigue con la última copia (A3-Q2).
- Guarda `user`, `features` y `contentVersion` en el estado de la sesión.

**«Pedir el ingreso»** es una operación de la API pública de F11 que muestra el acceso y se resuelve con la cuenta (R1). Queda fuera de los topes de espera del arranque: el del pedido de la sesión y, desde A3, el de 20 s del intento (FR-010 de A3) cuentan sólo mientras se espera al servidor, y vuelven a empezar cuando el ingreso termina. La llaman la etapa de sesión, las pantallas de F11 ante un 401 y, desde A3, la fuente de contenido ante un 401 en una porción. Como `runBoot` nunca vuelve a una etapa anterior, el arranque espera a esta operación en lugar de retroceder.

**Lo que suma A3 después** (C1): la `Content-Version` de la sesión para pedir las porciones, la llamada a «pedir el ingreso» ante un 401 en una porción, la última copia y el contenido en el doble de la API de los E2E.

**La red, los checks y la vista previa** (Q1, A3-Q3 y C1):

- F11a trae el doble de la API como fixture automático de los E2E, con una sesión simulada con cuenta por omisión. Así, los 123 escenarios de F1 y A2 pasan sin editarse.
- El arnés de `boot-check` y de `dist-content-check` responde la sesión desde su servidor de contenido (`qa/lib/content-server.ts`), que es lo único que cambia de esos dos checks.
- La vista previa (`docker/compose.preview.yaml`) y `npm run dev` pasan `/api/` al stack levantado.

**Dónde se dibuja:**

- El acceso y el diálogo se dibujan en un elemento propio, fuera de `#main` y de `.app-shell`. Ahí no los pisa nadie: la compuerta escribe `#main` con `innerHTML`, y el Atlas crea su propia raíz sobre `#main`.
- La entrada «Tu cuenta» tiene su propio elemento en la barra superior, junto al selector de lenguaje (Q3), después de la barra lateral en el documento.
- Mientras el acceso se muestra antes de las vistas, el shell estático queda inerte.
- Con el shell ya andando, la raíz dibuja la entrada y su diálogo modal, al costado de las vistas.

**Cómo se vuelve al shell:**

- Después de ingresar o de crear la cuenta en el arranque, «pedir el ingreso» termina, la etapa de sesión pregunta una vez más y resuelve, y sigue la compuerta.
- Desde «Tu cuenta», cerrar el diálogo deja el shell como estaba.
- «Salir», borrar la cuenta y un cambio de cuenta recargan el documento. El shell legacy no se puede desmontar (`app.js` registra oyentes y un `setInterval` que nunca limpia), y la recarga asegura que no quede en memoria nada de la sesión anterior.

## Pantallas, endpoints y estados

| Pantalla (parte) | Endpoint | Cargando | Error de campo | Error del servidor | Sesión vencida o de otra cuenta | Límite |
| --- | --- | --- | --- | --- | --- | --- |
| Arranque, etapa de sesión (F11a; A3 la extiende) | `GET /api/session` | «Conectando con el taller…», después de la misma espera que la compuerta | — | Sin respuesta, 5xx o algo que no es JSON: «No pudimos conectar con el taller» y «Reintentar» (desde A3, la última copia para quien no salió) | No hay 401: una sesión inválida responde `user: null` y lleva al ingreso | 429 de Nginx: espera `Retry-After` |
| Ingreso (F11a) | `POST /api/auth/login` | «Ingresando…» | `errors.email` y `errors.password` | 422 `auth_failed`, 403 `account_disabled`, 5xx, red o algo que no es JSON | 419: renueva y reintenta una vez | 429 por email y red, o por bloqueo de la cuenta |
| Invitación (F11a) | `POST /api/auth/invitations/lookup` | «Revisando tu invitación…» | — | 404 `invitation_not_found`, 410 `invitation_expired`, 5xx | 419 | 429 (10 por minuto por red) |
| Alta (F11a) | `POST /api/auth/invitations/accept` | «Creando tu cuenta…» | `errors.name`, `errors.password` (con varios motivos) y `errors.password_confirmation`; `errors.privacyVersion` y `errors.token` van al error general | 404, 410, 409 `email_taken`, 5xx | 419 | 429 (10 por minuto por red) |
| Restablecer (F11a) | `POST /api/auth/reset-password` | «Cambiando la contraseña…» | `errors.password` y `errors.password_confirmation`; `errors.token` va al error general | 5xx | 419 | 429 (10 por minuto por red y 5 por email) |
| Aviso de privacidad (F11a) | `POST /api/me/privacy` | «Guardando…» | `errors.privacyVersion` va al error general | 5xx | 401: el ingreso; 409: «Recargar»; 419 | 429 de Nginx |
| Tu cuenta (F11a) | Ninguno: usa el estado de la sesión | — | — | — | Un 401 en una de sus acciones: «pedir el ingreso» | — |
| Salir (F11a) | `POST /api/auth/logout` | «Saliendo…» | — | Red o 5xx: «No pudimos cerrar la sesión» y «Reintentar» | 401: ya no había sesión, y recarga igual; 409: «Recargar» | 429 de Nginx |
| Cambiar la contraseña (F11b) | `PUT /api/me/password` | «Cambiando la contraseña…» | `errors.current_password` y `errors.password`, que también trae la confirmación que no coincide | 422 `auth_failed`, en la contraseña actual; 5xx | 401, 409 y 419 | 429 (5 por minuto por usuario) |
| Descargar mis datos (F11b) | `POST /api/auth/confirm-password` y `POST /api/me/export` | «Preparando el archivo…» | `errors.password` | 422 `auth_failed`, 423 (vuelve a pedir la contraseña), 5xx o un corte en medio de la descarga | 401, 409 y 419 | 429: 5 confirmaciones por minuto y 3 descargas por día (un `Retry-After` de horas) |
| Borrar la cuenta (F11b) | `POST /api/auth/confirm-password` y `DELETE /api/me` | «Borrando…» | `errors.password` | 422 `auth_failed`, 423, 409 `last_admin`, 5xx | 401, 409 y 419 | 429 (5 por minuto) |
| Pedir el enlace (F11c) | `POST /api/auth/forgot-password` | «Mandando…» | `errors.email` | 503 `mail_unavailable`, 5xx | 419 | 429 (5 por minuto y 20 por hora por red) |
| Computadora compartida, en «Tu cuenta» (F11d) | Ninguno: borra los datos locales de la cuenta (el espacio de D1c y la copia de A3) | — | — | Almacenamiento bloqueado: el aviso | — | — |
| ¿Este progreso es tuyo? (F11d) | `POST /api/progress/import`, a través del cliente de D1c | «Sumando tu progreso…» | — | 409 `import_needs_confirmation` (vuelve a preguntar), 422 con rutas, 413 de Nginx (no es JSON), 5xx | 401, 409 y 419 | 429 |

Los mensajes del servidor se muestran tal como llegan (`backend/api/lang/es/api.php`). Los textos propios del front están en la sección siguiente.

## Textos que lee el alumno

Son propuestas, para que el usuario las corrija. «(servidor)» marca un mensaje que manda la API y que el front muestra sin cambios.

**Arranque**

- Mientras espera la sesión: «Conectando con el taller…».
- Sin servidor: «No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.», con el botón «Reintentar».

**Ingreso**

- Título «Ingresá al taller», con «Usá el email con el que te invitaron.».
- Campos «Email» y «Contraseña», esta con «Mostrar» y «Ocultar».
- Casilla «Recordarme en este navegador por 30 días», con la ayuda «No la marques en una computadora compartida.».
- Botón «Ingresar», que mientras espera dice «Ingresando…».
- Sin correo: «¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.».
- Enlace «Aviso de privacidad».
- Errores:
  - «El email o la contraseña no son correctos.» (servidor);
  - «Tu cuenta está deshabilitada. Consultá con quien administra el taller.» (servidor);
  - ante un límite, «Demasiados intentos. Esperá un momento antes de volver a probar.» (servidor), seguido de «Podés volver a intentar en {tiempo}.».

**Invitación y alta**

- Mientras consulta: «Revisando tu invitación…».
- Título «Creá tu cuenta», con:
  - «Te invitaron con {email}.»;
  - para un admin, «La cuenta va a tener rol de admin.»;
  - «La invitación vence el {fecha}.»;
  - «Si recargás esta página, vas a tener que abrir el enlace otra vez.».
- Campos:
  - «Tu nombre»;
  - «Contraseña», con la ayuda «Entre 15 y 64 caracteres. Puede ser una frase; no hace falta mezclar símbolos.»;
  - «Repetí la contraseña».
- Casilla «Leí y acepto el aviso de privacidad», con el enlace «Leer el aviso».
- Botón «Crear mi cuenta», que mientras espera dice «Creando tu cuenta…».
- Errores:
  - «La invitación no existe o ya se usó.» (servidor), seguido de «Si ya creaste tu cuenta, ingresá con tu email.»;
  - «La invitación venció. Pedí una nueva a quien te invitó.» (servidor);
  - «Ya hay una cuenta con ese email.» (servidor), seguido de «Ingresá con ese email.».

**Restablecer la contraseña**

- Título «Elegí una contraseña nueva», con «Para {email}.».
- Campos «Contraseña nueva» y «Repetí la contraseña nueva».
- Botón «Cambiar la contraseña».
- Al terminar: «Listo: tu contraseña cambió y cerramos tus sesiones abiertas. Ingresá con la nueva.».
- Con un enlace vencido: «El enlace para restablecer la contraseña no es válido o venció.» (servidor), seguido de «Pedile uno nuevo a quien administra el taller.».

**Aviso de privacidad**

- Título «Aviso de privacidad». El texto lo escribe el usuario (Q2).
- Cuando el aviso cambió: «El aviso de privacidad cambió desde la última vez que lo aceptaste. Leelo y aceptalo para seguir.», con los botones «Acepto» y «Salir».
- Si la versión no coincide: «El aviso de privacidad cambió: recargá la página para leer el vigente.».

**Tu cuenta**

- Botón de entrada «Tu cuenta», y diálogo con el título «Tu cuenta».
- «{nombre} · {email}».
- «Aviso de privacidad».
- «Salir», con la nota «Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.» (Q4).
- «Volver al taller».
- Con la sesión vencida: «Tu sesión venció. Ingresá de nuevo para seguir.».
- Con otra cuenta: «La sesión cambió de cuenta: recargá la página.» (servidor) y el botón «Recargar».

**Cambiar la contraseña (F11b)**

- Campos «Contraseña actual», «Contraseña nueva» y «Repetí la contraseña nueva».
- Botón «Cambiar la contraseña».
- Al terminar: «Tu contraseña cambió. Cerramos tus otras sesiones; esta sigue abierta.».
- Con la contraseña actual equivocada: «La contraseña actual no es correcta.». El mensaje del servidor habla de un email, y esta pantalla no tiene ese campo.

**Descargar mis datos (F11b)**

- Título «Descargá los datos de tu cuenta».
- «Un archivo JSON con tu cuenta, el progreso guardado en el servidor, tus intentos y tus importaciones. No es el mismo archivo que «Exportar mi progreso» y no se importa en Método. Podés descargarlo hasta 3 veces por día.».
- Campo «Tu contraseña».
- Botón «Descargar mis datos», que mientras espera dice «Preparando el archivo…».
- Al terminar: «Listo: se descargó {archivo}.».

**Borrar la cuenta (F11b)**

- Título «Borrar tu cuenta».
- «Se borra tu cuenta con todo lo que guardó en el servidor: el progreso, los intentos, el código y las importaciones. No se puede deshacer. Las copias de seguridad lo conservan un tiempo: el aviso de privacidad dice cuánto.».
- «No es «Borrar todo» de Método, que borra el progreso de este navegador. El progreso guardado en este navegador no se borra con la cuenta.».
- Campo «Tu contraseña».
- Casilla «Entiendo que no se puede deshacer.».
- Botón «Borrar mi cuenta», que mientras espera dice «Borrando…».
- Al terminar: el mensaje del servidor («Se está borrando tu cuenta con todo lo que guardó…») y el botón «Entendido».
- Si es el único admin: «Tiene que quedar al menos un admin activo.» (servidor).

**Pedir el enlace (F11c)**

- Enlace «¿Te olvidaste la contraseña?».
- Título «Recuperá tu contraseña».
- Campo «Email» y botón «Mandarme el enlace».
- Al terminar: «Si el email corresponde a una cuenta, te llega un enlace para elegir una contraseña nueva. Vence en 60 minutos.».
- Sin correo: «El taller no puede mandar correos por ahora.» (servidor), seguido de «Pedile el enlace a quien administra el taller.».

**Lo de D1 (F11d)**

- En «Tu cuenta», la opción «Estoy en una computadora compartida», con «No guardamos tu progreso en este navegador: lo que no llegue al servidor se pierde al cerrar la pestaña.».
- Antes de activarla: «Al activarla, borramos de este navegador lo que guardó tu cuenta, también lo que todavía no llegó al servidor, y la copia del contenido del taller.», con «Activar y borrar» y «Cancelar».
- Con el almacenamiento bloqueado: «Este navegador no deja guardar datos: el taller funciona como en una computadora compartida.».
- Título «¿Este progreso es tuyo?», con «Este navegador tiene progreso guardado sin cuenta: {n} ejercicios resueltos, el último el {fecha}. Si es tuyo, lo sumamos a tu cuenta. Si no, queda como está.».
- Botones «Sí, es mío» y «No es mío».

**Mensajes comunes**

- Sin conexión: «No pudimos conectar con el taller. Revisá tu conexión y probá de nuevo.».
- Una respuesta que no es JSON: «El taller no respondió como esperábamos. Probá de nuevo en un rato.».
- La página vencida: «La página venció: recargala e intentá de nuevo.» (servidor).
- Un error interno: «Algo salió mal de nuestro lado. Probá de nuevo en un rato.» (servidor).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear la cuenta con el enlace de invitación (Priority: P1) · F11a

Quien opera el taller le pasa a una persona el enlace que imprime `taller:invite`. La persona lo abre y ve con qué email la invitaron. Elige su nombre y su contraseña, acepta el aviso de privacidad y entra al taller con la sesión abierta. Para entonces, el token ya no está en la barra de direcciones.

**Why this priority**: sin el alta no hay cuentas, y sin cuentas no hay nada en qué ingresar. Es la única forma de crear una (C3a, §4.1, paso 5).

**Independent Test**: abrir `/#invitacion=<token>` con la API simulada, completar el alta y revisar la URL, el historial y que el arranque haya seguido.

**Acceptance Scenarios**:

1. **Dado** un enlace `#invitacion=<token>`, **cuando** se abre, **entonces**, antes de que se evalúe `app.js`, la URL ya no tiene el fragmento y el historial no tiene ninguna entrada con el token. La pantalla dice «Revisando tu invitación…» y después muestra el email invitado, sólo de lectura, con el vencimiento.
2. **Dada** una invitación vigente, **cuando** la persona completa su nombre, escribe la contraseña dos veces y acepta el aviso, **entonces** sale `POST /api/auth/invitations/accept` con el token, el nombre, las dos contraseñas y la versión del aviso. Con un 201, la sesión queda abierta y el taller arranca en «Mi recorrido», sin recargar.
3. **Dada** una contraseña de 14 caracteres, **cuando** se envía, **entonces** no sale ningún pedido y el campo dice «Tiene que tener al menos 15 caracteres.». Una de 15 que lleva una «á» descompuesta (16 unidades de UTF-16, y 15 caracteres después de normalizar a NFC) sí sale.
4. **Dada** una contraseña que contiene el nombre y además está en la lista de bloqueadas, **cuando** el servidor responde 422 con dos motivos en `errors.password`, **entonces** el campo muestra los dos, queda con `aria-invalid` y recibe el foco.
5. **Dado** un enlace usado, inventado o vencido, **cuando** se abre, **entonces** se ve el mensaje del servidor (404 o 410) con qué hacer, y no hay formulario.
6. **Dada** un alta que choca con una cuenta creada en el medio, **cuando** el servidor responde 409 `email_taken`, **entonces** se ve su mensaje y se ofrece ir al ingreso.

*Cubre: FR-002, FR-005, FR-015 a FR-017, FR-024 a FR-031 y FR-037 a FR-041; SC-001.*

---

### User Story 2 - Ingresar y salir (Priority: P1) · F11a

Un alumno abre el taller sin sesión, y lo primero que ve es el ingreso. Ingresa con su email y su contraseña, y el taller sigue hacia lo que había pedido. Más tarde sale desde «Tu cuenta».

**Why this priority**: desde F11a no se entra al taller sin sesión (Q1), y A3 espera este ingreso.

**Independent Test**: con el doble de la API, arrancar sin sesión, ingresar con credenciales buenas y malas, agotar el límite, simular que la sesión no responde y salir.

**Acceptance Scenarios**:

1. **Dado** un navegador sin sesión, **cuando** el taller arranca, **entonces** sale `GET /api/session` y, con `user: null`, se ve el ingreso, sin que corra la compuerta ni se evalúe una fuente legacy.
2. **Dadas** credenciales válidas, **cuando** ingresa, **entonces** sale `POST /api/auth/login` con `X-XSRF-TOKEN` y sin `X-Taller-User`. Con 200, el arranque sigue, y «Tu cuenta» muestra su nombre y su email.
3. **Dados** un email que no existe y la contraseña equivocada de uno que sí existe, **cuando** el servidor responde 422 `auth_failed` a los dos, **entonces** los dos casos muestran el mismo texto, y ningún campo queda marcado solo.
4. **Dado** un 429 con `Retry-After: 120`, **cuando** llega, **entonces** se ve el mensaje del servidor, seguido de «Podés volver a intentar en 2 minutos.», y el botón no se habilita antes de ese plazo.
5. **Dados** `user: null` y la URL `?ejercicio=rust-02&paso=code#laboratorio`, **cuando** el alumno ingresa, **entonces** la etapa de sesión vuelve a preguntar una vez (ahora la respuesta trae la cuenta), y la compuerta del contenido corre una sola vez, sin recargar, con la URL que pidió.
6. **Dado** un arranque, **cuando** `GET /api/session` no responde, **entonces** se ve «No pudimos conectar con el taller» con «Reintentar», y ninguna fuente legacy se evalúa.
7. **Dado** un alumno con sesión, **cuando** usa «Salir», **entonces** sale `POST /api/auth/logout` con `X-Taller-User`. Con 204, el documento se recarga, y el progreso del navegador queda como estaba.

*Cubre: FR-003, FR-004, FR-006 a FR-009, FR-012, FR-013, FR-015 a FR-023, FR-032 a FR-035 y FR-049 a FR-052; SC-002, SC-003 y SC-006.*

---

### User Story 3 - Restablecer la contraseña con el enlace (Priority: P1) · F11a

Un alumno olvidó su contraseña. Quien opera el taller le genera un enlace con `taller:password-reset-link` (o, con C3c, le llega por correo). El alumno lo abre, elige una contraseña nueva y después ingresa con ella.

**Why this priority**: desde A3, sin esto, quien olvida su contraseña pierde el taller. El enlace de la consola ya existe (C3a), así que no espera a C3c.

**Independent Test**: abrir `/#restablecer=<token>&email=ana%40x.com` con la API simulada, cambiar la contraseña e ingresar.

**Acceptance Scenarios**:

1. **Dado** el enlace de recuperación, **cuando** se abre, **entonces** el fragmento desaparece de la URL antes de que se evalúe `app.js`, y la pantalla muestra «Para ana@x.com.».
2. **Dada** una contraseña válida, **cuando** se envía, **entonces** sale `POST /api/auth/reset-password` con el token, el email y las dos contraseñas. Con 200 se ve «Listo: tu contraseña cambió…», seguido del ingreso con el email ya cargado; la sesión no se abre sola.
3. **Dado** un token vencido, inventado o de un email sin cuenta, **cuando** el servidor responde 422 con `errors.token`, **entonces** los tres casos muestran el mismo mensaje en el error general y dicen cómo pedir otro enlace.

*Cubre: FR-002, FR-005, FR-025, FR-034 y FR-042 a FR-044; SC-001 y SC-006.*

---

### User Story 4 - El aviso de privacidad (Priority: P2) · F11a

El alumno lee el aviso antes de crear la cuenta, lo encuentra después desde el ingreso y desde «Tu cuenta», y si el aviso cambia lo acepta de nuevo antes de seguir.

**Why this priority**: el alta no se puede enviar sin aceptarlo (C3a FR-020), y la Ley 25.326 pide que la persona sepa qué se guarda. No tiene más prioridad porque el texto depende del usuario (Q2).

**Independent Test**: con `privacyAccepted: false` en la sesión simulada, entrar y aceptar; provocar un 422 por la versión.

**Acceptance Scenarios**:

1. **Dada** una sesión con `privacyAccepted: false`, **cuando** la etapa de sesión la recibe, **entonces** se ve el aviso vigente con «Acepto» y «Salir». Con «Acepto» sale `POST /api/me/privacy` con la versión, y con 204 el arranque sigue.
2. **Dado** un servidor con otra versión vigente, **cuando** responde 422 en `errors.privacyVersion`, **entonces** el error general pide recargar, y el front no reintenta con otra versión.
3. **Dado** el alta, **cuando** el alumno abre «Leer el aviso», **entonces** lee el texto entero sin perder lo que escribió, y la casilla de aceptación sigue desmarcada hasta que la marca.

*Cubre: FR-041, FR-045 a FR-048 y FR-050.*

---

### User Story 5 - La red y la vista previa con la sesión obligatoria (Priority: P1) · F11a

Desde F11a el taller exige sesión, pero la red de pruebas, los checks, la vista previa y el desarrollo local siguen sirviendo. Los E2E corren con un doble de la API que trae una sesión por omisión, y la vista previa y `npm run dev` pasan `/api/` al stack.

**Why this priority**: es la condición para integrar la sesión obligatoria sin editar los 123 escenarios y sin dejar inservible la vista previa (Q1).

**Independent Test**: construir el taller con F11a y correr los 123 E2E sin editarlos; correr `boot-check` y `dist-content-check`; levantar el stack y abrir la vista previa.

**Acceptance Scenarios**:

1. **Dado** el build con F11a y el doble de la API con su sesión por omisión, **cuando** corren los 123 E2E de F1 y A2, **entonces** pasan sin editar ningún escenario, y cada arranque hace un solo `GET /api/session` antes del contenido.
2. **Dado** el doble sin sesión, **cuando** se abre el taller, **entonces** se ve el ingreso, el shell queda inerte y no se evalúa ninguna fuente legacy.
3. **Dado** el stack levantado, **cuando** se abre la vista previa en el puerto 8765 o con `npm run dev`, **entonces** `GET /api/session` llega a la API del stack, y sin sesión se ve el ingreso.
4. **Dado** «Tu cuenta» abierto, **cuando** el alumno aprieta Esc, **entonces** el diálogo se cierra, el foco vuelve a «Tu cuenta» y la vista del shell sigue donde estaba.

*Cubre: FR-001, FR-003, FR-004, FR-010 a FR-014, FR-036 y FR-076; SC-002, SC-003 y SC-012.*

---

### User Story 6 - Cambiar la contraseña (Priority: P2) · F11b

Un alumno con sesión cambia su contraseña desde «Tu cuenta», con la actual. La sesión en la que está sigue abierta, y las demás se cierran.

**Why this priority**: protege una cuenta cuya contraseña se filtró, aunque el restablecimiento ya cubre el olvido.

**Independent Test**: con la API simulada, cambiar la contraseña con la actual buena y con la mala.

**Acceptance Scenarios**:

1. **Dada** la contraseña actual correcta, **cuando** se envía, **entonces** sale `PUT /api/me/password` con `X-Taller-User`, y con 200 se ve «Tu contraseña cambió…».
2. **Dada** la contraseña actual equivocada, **cuando** el servidor responde 422 `auth_failed`, **entonces** el campo de la actual dice «La contraseña actual no es correcta.».
3. **Dada** una confirmación distinta que el cliente no frenó, **cuando** el servidor la informa en `errors.password`, **entonces** el mensaje aparece en la contraseña nueva.

*Cubre: FR-053 y FR-054.*

---

### User Story 7 - Llevarse los datos y borrar la cuenta (Priority: P2) · F11b

Una persona descarga todo lo que el servidor guarda de ella. Si quiere, después borra su cuenta, sabiendo qué se va y qué queda en el navegador.

**Why this priority**: son los derechos de acceso y de supresión (Ley 25.326, arts. 14 y 16) que C3b ya entrega por HTTP. No los espera A3.

**Independent Test**: con la API simulada, descargar con la contraseña buena, con la mala y pasado el límite; borrar la cuenta y comprobar la recarga.

**Acceptance Scenarios**:

1. **Dada** la contraseña correcta, **cuando** la persona descarga sus datos, **entonces** sale `POST /api/auth/confirm-password` y después `POST /api/me/export`, y el archivo se guarda con el nombre de `Content-Disposition` y los mismos bytes que mandó el servidor.
2. **Dado** el cuarto pedido del día, **cuando** el servidor responde 429 con `Retry-After: 30000`, **entonces** se ve cuánto falta en horas y minutos.
3. **Dada** una confirmación que venció entre los dos pedidos, **cuando** la acción responde 423, **entonces** se vuelve a pedir la contraseña.
4. **Dada** la contraseña y la casilla marcada, **cuando** la persona borra su cuenta, **entonces** sale `DELETE /api/me`; con 202 se ve el mensaje del servidor y, con «Entendido», el documento se recarga. Las cuatro claves v1 del navegador siguen ahí.
5. **Dado** el único admin activo, **cuando** pide borrar su cuenta, **entonces** se ve «Tiene que quedar al menos un admin activo.» y la sesión sigue.

*Cubre: FR-055 a FR-059.*

---

### User Story 8 - Pedir el enlace por correo (Priority: P3) · F11c

Cuando el taller manda correo, quien olvidó su contraseña pide el enlace desde el ingreso, sin depender de quien opera.

**Why this priority**: espera a C3c, y C3c espera el dominio. Hasta entonces, el enlace de la consola cubre el olvido.

**Independent Test**: con `features.passwordReset: true` en la sesión simulada, pedir el enlace con un email que existe y con otro que no.

**Acceptance Scenarios**:

1. **Dado** `features.passwordReset: false`, **cuando** se ve el ingreso, **entonces** no aparece «¿Te olvidaste la contraseña?», sino cómo pedirle el enlace a quien administra.
2. **Dado** `features.passwordReset: true`, **cuando** se pide el enlace para un email que existe y para uno que no, **entonces** los dos reciben 202 y la pantalla muestra el mismo texto.
3. **Dado** el modo sólo link, **cuando** el servidor responde 503 `mail_unavailable`, **entonces** se ve su mensaje y el camino sin correo.

*Cubre: FR-034, FR-060 y FR-061.*

---

### User Story 9 - Una computadora compartida y el progreso de antes (Priority: P3) · F11d

En un aula, un alumno entra a «Tu cuenta» y activa «Estoy en una computadora compartida». En ese momento, el taller borra lo que su cuenta guardaba en ese navegador y, desde ahí, no guarda nada. En su propia computadora, la primera vez que ingresa le preguntan si el progreso guardado sin cuenta es suyo, y sólo con un sí se suma a su cuenta.

**Why this priority**: es lo que D1 necesita para no mezclar cuentas, pero espera a D1c, que entra en servicio después de A4.

**Independent Test**: con el cliente de D1c simulado en su interfaz, activar el modo compartido desde «Tu cuenta» e ingresar con progreso v1 sembrado de las fixtures congeladas.

**Acceptance Scenarios**:

1. **Dado** «Tu cuenta», **cuando** el alumno activa «Estoy en una computadora compartida», **entonces** primero ve qué se pierde, también lo que no llegó al servidor. Al confirmar, se borran en ese momento los datos locales de la cuenta: el espacio de D1c y la copia del contenido de A3.
2. **Dado** un navegador con las claves v1 de `qa/fixtures/progress-master-2a278ad-storage.json` sin importar, **cuando** el alumno ingresa, **entonces**, antes de que el cliente escriba nada, ve el resumen con los ejercicios resueltos y la fecha del último resultado, y la pregunta «¿Este progreso es tuyo?».
3. **Dado** un sí, **cuando** el servidor responde 409 `import_needs_confirmation`, **entonces** se vuelve a preguntar sin decir el motivo, y con otro sí se reenvía con la confirmación.

*Cubre: FR-062 a FR-065.*

Los transversales (FR-066 a FR-077) valen para todas las historias. Sus criterios son SC-004, SC-005, SC-007, SC-008 y SC-011.

---

### Edge Cases

- **Recargar después de abrir un enlace con token:** el fragmento ya no está en la URL, así que la etapa de los tokens no ve ninguno: sin sesión aparece el ingreso, y con sesión, el taller. El texto del alta lo advierte.
- **Un enlace con token mal formado** (sin `=`, con un email que no se puede decodificar o con fragmentos de más): se borra igual de la URL. La invitación se consulta, y el servidor responde 404 sin mirar la base. Un restablecimiento sin email muestra que el enlace no sirve.
- **Un enlace con token cuando ya hay sesión** (R1): la invitación se muestra igual. Si el email de la invitación es de otra cuenta, el alta crea esa cuenta y la sesión pasa a ser la nueva (C3a regenera el ID). El restablecimiento no abre sesión ni toca la actual.
- **Dos pestañas, dos cuentas:** la pestaña vieja recibe 409 `account_mismatch` en su próxima modificación y ofrece «Recargar». Un 419 se reintenta una sola vez, y sólo si `GET /api/session` sigue dando la misma cuenta.
- **La sesión vence con «Tu cuenta» abierto** (30 minutos de inactividad u 8 horas): el próximo pedido recibe 401, o 419 si el token CSRF también cambió, y en los dos casos se pide el ingreso sin cerrar el diálogo. Si entra otra cuenta, se recarga.
- **Una cuenta deshabilitada con la sesión viva:** la próxima ruta con sesión responde 403 `account_disabled`, y se muestra el mensaje del servidor. `GET /api/session` responde `user: null` y no 403 (FR-034 de C3a).
- **Una cuenta borrada desde otro dispositivo o por un admin:** la próxima ruta con sesión responde 401, y se ve el ingreso, que falla como una credencial inválida.
- **Nginx responde sin JSON:** un 413, un 502 con la API caída (como en la vista previa) o un 504. Se ve el mensaje común de respuesta inesperada, y lo escrito se conserva.
- **El servidor tarda en el ingreso:** el piso de 200 ms de C3a hace que el estado «Ingresando…» se vea siempre, y el botón no admite un segundo envío.
- **Una contraseña con emojis o con tildes descompuestas:** el cliente cuenta como el servidor, con puntos de código después de normalizar a NFC. El límite de 72 bytes lo informa el servidor.
- **Un admin que marca «Recordarme»:** el servidor no le da recuerdo, y la pantalla no lo distingue.
- **El almacenamiento bloqueado:** F11a no guarda nada en el navegador, así que funciona igual. Con D1c, «Tu cuenta» avisa que el taller va en modo compartido.
- **Sin servidor al arrancar, antes de A3:** el taller no abre aunque el contenido estático esté disponible: se ve «No pudimos conectar» con «Reintentar». Es el costo de la sesión obligatoria (Q1), y A3 suma la última copia para quien no salió.
- **«Exportar mi progreso» y «Descargar mis datos»:** son archivos distintos. El primero (v1) lo importa Método; el segundo (`taller-export-2`) no. Las dos pantallas lo dicen.
- **La descarga se corta a la mitad:** no se guarda un archivo parcial, y el pedido ya contó para el límite de 3 por día.

## Requirements *(mandatory)*

### Functional Requirements

**Etapas del arranque, «pedir el ingreso» y raíz de la cuenta (F11a)**

- **FR-001**: El arranque DEBE sumar dos etapas de F11a: la de los tokens, primera de todas, y la de sesión, justo antes de la compuerta del contenido de A2. Las dos entran en la llamada a `runBoot` de `frontend/src/app/main.tsx` y en la tabla de etapas de `qa/load-order-check.ts`, sin tocar la compuerta. A3 extiende la de sesión y no suma otra. *(A2 FR-013; C1)*
- **FR-002**: Antes de que corra cualquier otra etapa, y sin pedir nada a la red, la etapa de los tokens DEBE leer de la URL los fragmentos `#invitacion=<token>` y `#restablecer=<token>&email=<email>` (con el email decodificado), guardarlos sólo en memoria, borrarlos con `history.replaceState` sin tocar la ruta ni la query, y dejarle dicho al arranque, en memoria, que había un token. Así, ni la etapa de sesión ni `app.js` los ven, el historial no los guarda y A3 sabe que no debe usar la copia. *(C3a FR-021; A3 FR-024)*
- **FR-003**: La etapa de sesión DEBE pedir `GET /api/session` en cada arranque, también antes de A3, aunque el contenido siga siendo estático, y decidir con su `user`: la sesión es obligatoria desde F11a. *(Q1; C1)*
- **FR-004**: Con `user: null`, la etapa DEBE llamar a «pedir el ingreso» y esperarla: mientras tanto se ve sólo el acceso (el ingreso, o el alta o el restablecimiento si hay token), la compuerta no corre y ninguna fuente legacy se evalúa. *(Q1; R1; C3a FR-034)*
- **FR-005**: Con un fragmento con token, la etapa DEBE mostrar el alta o el restablecimiento antes de que se evalúen las vistas, también si ya hay una sesión viva. *(R1)*
- **FR-006**: «Pedir el ingreso» DEBE ser una operación de la API pública de F11 que muestra el acceso, se resuelve con la cuenta y queda fuera de los topes de espera del arranque: el tope del pedido de la sesión (y, desde A3, el del intento de arranque, su FR-010) cuenta sólo mientras se espera al servidor y vuelve a empezar cuando el ingreso termina. La llaman la etapa de sesión, las pantallas de F11 ante un 401 y, desde A3, la fuente de contenido ante un 401 en una porción. *(R1; C1)*
- **FR-007**: Cuando «pedir el ingreso» termina, la etapa DEBE volver a pedir la sesión una vez y resolver, sin recargar el documento y con la URL que pidió el alumno, ya sin el token: `runBoot` no vuelve a una etapa anterior. *(R1; A3 FR-002)*
- **FR-008**: La etapa DEBE guardar `user`, `features` y `contentVersion` en el estado de la sesión. A3 usa esa `contentVersion` para pedir las porciones, sin volver a pedir la sesión. *(C1)*
- **FR-009**: Si `GET /api/session` no responde dentro de su tope, o responde un 5xx o algo que no es JSON, la etapa DEBE mostrar que no pudo conectar y ofrecer «Reintentar», con un solo pedido a la vez y sin recargar; con un 429, espera `Retry-After` antes de habilitar el reintento. Desde A3, quien no cerró su sesión sigue con la última copia (A3-Q2). *(C3a)*
- **FR-010**: La raíz de la cuenta DEBE dibujar en elementos propios y NO DEBE dejar una raíz viva en un contenedor que dibuja otro: la compuerta y las vistas escriben `#main`. El acceso y el diálogo van fuera de `#main` y de `.app-shell`; la entrada, en su propio elemento en la barra superior (Q3).
- **FR-011**: Mientras el acceso se muestra antes de las vistas, el shell estático DEBE quedar inerte: la navegación y el selector de lenguaje no responden ni se anuncian, y hay un solo `main` visible.
- **FR-012**: La entrada a la cuenta DEBE ser un botón «Tu cuenta» en la barra superior, junto al selector de lenguaje, visible en todos los anchos y después de la barra lateral en el documento, que abre «Tu cuenta» como un diálogo modal sin cambiar la URL ni la vista. *(Q3)*
- **FR-013**: Cerrar «Tu cuenta», con su botón o con Esc, DEBE devolver el foco a la entrada y dejar el shell como estaba, sin recargar.
- **FR-014**: F11a DEBE agregar a los E2E un doble de la API como fixture automático, con una sesión simulada con cuenta por omisión y las respuestas de cuentas (la sesión sin cuenta, el ingreso, el alta y el restablecimiento), para que los 123 escenarios de F1 y A2 pasen sin editarse. A3 lo reutiliza y le suma el contenido (su FR-038). *(Q1; R1)*

**Cliente de la API (F11a; lo usan todas las partes)**

- **FR-015**: Todo pedido a `/api` DEBE ir al mismo origen, con las cookies del navegador y sin CORS. El primero de cada documento DEBE ser `GET /api/session`, que deja la cookie `XSRF-TOKEN`. *(contrato HTTP de C3a)*
- **FR-016**: Cada pedido que modifica (`POST`, `PUT`, `PATCH` o `DELETE`) DEBE llevar en `X-XSRF-TOKEN` el valor que tiene la cookie `XSRF-TOKEN` en ese momento. La cookie cambia, por ejemplo, al salir, al borrar la cuenta, cuando vence la sesión y cuando el servidor descarta una sesión inválida.
- **FR-017**: Con sesión, cada pedido que modifica DEBE llevar `X-Taller-User` con el id de la cuenta en memoria: salir, aceptar el aviso, confirmar la contraseña, cambiarla, descargar los datos, borrar la cuenta y, con D1c, importar. Los pedidos sin sesión NO DEBEN llevarlo: el ingreso, la consulta y la aceptación de la invitación, el restablecimiento y, con F11c, el pedido del enlace. *(C3a FR-036)*
- **FR-018**: Ante un 419, el cliente DEBE pedir `GET /api/session` y reintentar una sola vez si la cuenta es la misma o si el pedido no usa sesión. Si ya no hay sesión, DEBE seguir como ante un 401 (FR-020). Si la cuenta es otra, NO DEBE reintentar: muestra el mensaje del servidor con «Recargar». *(C3a; ADR 0006 D36)*
- **FR-019**: Ante un 409 `account_mismatch`, el cliente NO DEBE reintentar: muestra el mensaje del servidor con «Recargar», y la recarga arranca el taller con la cuenta actual. *(C3a)*
- **FR-020**: Ante un 401 en una pantalla con sesión, DEBE pedir el ingreso sin cerrar «Tu cuenta» ni perder el shell. Si entra la misma cuenta, vuelve a la pantalla; si entra otra, recarga el documento. *(C3a; D1 FR-065)*
- **FR-021**: Ante un 429, DEBE mostrar el mensaje del servidor y cuánto falta según `Retry-After`, en segundos, minutos u horas, y NO DEBE permitir reenviar antes. *(C3a; C3b)*
- **FR-022**: Ante una respuesta que no es JSON (el 413, el 502 o el 504 de Nginx) o una falla de red, DEBE mostrar un mensaje propio y conservar lo escrito.
- **FR-023**: Ante un 403 `account_disabled`, DEBE mostrar el mensaje del servidor sin abrir la sesión; si había una, DEBE volver al acceso. *(C3a)*

**Formularios (F11a; los usan todas las partes)**

- **FR-024**: Los formularios DEBEN armarse con React Hook Form, con campos no controlados, y enviarse sólo desde su manejador de React, nunca con el envío nativo: la CSP de Nginx tiene `form-action 'none'`.
- **FR-025**: Los errores de un 422 DEBEN volcarse con `setError` en el campo visible que nombra `errors.<campo>`: `email`, `password`, `password_confirmation`, `current_password` o `name`. Las claves sin campo visible (`token`, `privacyVersion` o cualquier otra) y las respuestas `{message, code}` (401, 403, 404, 409, 410, 419, 422 `auth_failed`, 423, 429, 503 y 5xx) DEBEN ir a `root.serverError`. *(hoja de ruta, F11)*
- **FR-026**: Si un campo trae varios motivos (la contraseña puede traer hasta seis de la política), DEBE mostrarlos todos, no sólo el primero.
- **FR-027**: Los errores DEBEN ser accesibles: el campo con error lleva `aria-invalid` y queda asociado a su mensaje, el error general sale con `role="alert"`, y el foco va al primer campo con error o, si no hay ninguno, al error general.
- **FR-028**: El cliente DEBE validar sólo que lo obligatorio esté, que la contraseña nueva tenga de 15 a 64 caracteres y que la confirmación coincida. El resto de la política (la lista de bloqueadas, el nombre, el email y los 72 bytes) lo decide el servidor. *(hoja de ruta; C3a FR-023)*
- **FR-029**: El largo DEBE contarse como lo cuenta el servidor: puntos de código después de normalizar a NFC, no unidades de UTF-16. Los mensajes del largo DEBEN ser los del servidor: «Tiene que tener al menos 15 caracteres.» y «Puede tener hasta 64 caracteres.». *(`PasswordPolicy` y `lang/es/password-policy.php`)*
- **FR-030**: Mientras un pedido está en curso, el botón de envío DEBE quedar deshabilitado y decir el estado (por ejemplo, «Ingresando…»), y NO DEBE salir un segundo envío.
- **FR-031**: Los campos DEBEN llevar `autocomplete` (`username` o `email` en el email, `current-password` o `new-password` en las contraseñas y `name` en el nombre), admitir que se pegue en ellos y ofrecer mostrar u ocultar la contraseña.

**Ingreso (F11a)**

- **FR-032**: El ingreso DEBE pedir el email y la contraseña, ofrecer «Recordarme» y llamar a `POST /api/auth/login {email, password, remember}`. Con 200, la cuenta queda en el estado de la sesión, y el arranque sigue (FR-007) o vuelve a «Tu cuenta». *(C3a FR-010 y FR-011)*
- **FR-033**: Ante un 422 `auth_failed`, DEBE mostrar el mismo mensaje exista o no el email, sin decir cuál de los dos campos falló ni marcar uno solo como inválido. *(C3a FR-011 y SC-003)*
- **FR-034**: Mientras `features.passwordReset` sea `false`, el ingreso DEBE explicar cómo recuperar el acceso sin correo (pedirle un enlace a quien administra) y NO DEBE ofrecer «¿Te olvidaste la contraseña?». *(C3a FR-034; C3c)*
- **FR-035**: «Recordarme» DEBE ser opcional, venir desmarcado y advertir que no se use en una computadora compartida. A una cuenta admin el servidor no le da recuerdo, y la pantalla no lo distingue. *(C3a FR-015)*

**Vista previa y desarrollo (F11a)**

- **FR-036**: La vista previa (`docker/compose.preview.yaml`) y `npm run dev` DEBEN pasar `/api/` a la API del stack levantado, del mismo origen para el navegador, para que la cookie de la sesión funcione. *(Q1; A3-Q3; C1)*

**Invitación y alta (F11a)**

- **FR-037**: Con un token de invitación, DEBE consultar `POST /api/auth/invitations/lookup {token}` y mostrar el email (sólo de lectura), si el rol es admin y el vencimiento. *(C3a FR-019)*
- **FR-038**: Ante un 404 `invitation_not_found` o un 410 `invitation_expired`, DEBE mostrar el mensaje del servidor y qué hacer (ingresar si ya creó la cuenta, o pedir otra invitación), sin formulario. *(C3a FR-019)*
- **FR-039**: El alta DEBE pedir el nombre (de 1 a 80 caracteres), la contraseña con su confirmación y la aceptación del aviso de privacidad, y llamar a `POST /api/auth/invitations/accept {token, name, password, password_confirmation, privacyVersion}`. Con 201, la sesión queda abierta y el arranque sigue. *(C3a FR-020 y FR-022)*
- **FR-040**: Ante un 409 `email_taken`, o un 404 o un 410 que lleguen al enviar el alta, DEBE mostrar el mensaje del servidor y ofrecer ir al ingreso. *(C3a FR-020)*
- **FR-041**: Desde el alta, el aviso DEBE poder leerse entero antes de aceptarlo, sin perder lo escrito, y la casilla de aceptación NO DEBE venir marcada.

**Restablecer con el enlace (F11a; el enlace sale de la consola con C3a y del correo con C3c)**

- **FR-042**: Con un token de restablecimiento, DEBE pedir la contraseña nueva y su confirmación, mostrar el email del enlace (sólo de lectura) y llamar a `POST /api/auth/reset-password {token, email, password, password_confirmation}`. *(C3a FR-026)*
- **FR-043**: Con 200, DEBE decir que la contraseña cambió y que se cerraron las sesiones, y mostrar el ingreso con el email ya cargado: el restablecimiento no abre sesión. *(C3a FR-026)*
- **FR-044**: Ante un 422 con `errors.token`, DEBE decir en el error general que el enlace no es válido o venció, con el mismo mensaje para un token inválido, uno vencido y un email sin cuenta, y explicar cómo pedir otro. *(C3a FR-026)*

**Aviso de privacidad (F11a)**

- **FR-045**: El texto del aviso y su versión DEBEN vivir en un archivo del front que el build empaqueta, y la versión que manda el front es esa. Quien despliega pone la misma en `PRIVACY_VERSION`. *(Q2; C3a FR-022)*
- **FR-046**: Con sesión y `privacyAccepted: false`, antes de seguir al taller o de abrir «Tu cuenta», DEBE mostrar el aviso vigente y pedir que se acepte (`POST /api/me/privacy {privacyVersion}`) o que se salga: la reaceptación pasa por el acceso. *(C3a, Assumptions; R1)*
- **FR-047**: Ante un 422 por la versión del aviso, DEBE decir que el aviso cambió y pedir que se recargue, sin reintentar con otra versión.
- **FR-048**: El aviso DEBE poder leerse desde el ingreso y desde «Tu cuenta».

**Tu cuenta y salir (F11a)**

- **FR-049**: «Tu cuenta» DEBE mostrar el nombre y el email de la cuenta, el aviso de privacidad y «Salir».
- **FR-050**: «Salir» DEBE llamar a `POST /api/auth/logout` y, con un 204 (o un 401, porque ya no había sesión), dejar el navegador sin nada de la sesión: recarga el documento para que el taller arranque de cero y, desde A3, antes borra la última copia del contenido. *(C3a FR-016; A3 FR-021 y A3-Q2)*
- **FR-051**: Si `POST /api/auth/logout` falla por la red o con un 5xx, DEBE decir que no pudo cerrar la sesión y ofrecer reintentar, sin recargar.
- **FR-052**: Antes de D1c, salir NO DEBE tocar el progreso guardado en el navegador, y «Tu cuenta» DEBE decirlo junto a «Salir». *(ADR 0003; Q4)*

**Cuenta: contraseña, datos y supresión (F11b)**

- **FR-053**: Cambiar la contraseña DEBE pedir la actual, la nueva y su confirmación, y llamar a `PUT /api/me/password {current_password, password, password_confirmation}`. Con 200, DEBE decir que la sesión sigue y que se cerraron las otras. *(C3a FR-028)*
- **FR-054**: Ante un 422 `auth_failed`, DEBE marcar la contraseña actual con «La contraseña actual no es correcta.». Ante un 422 `validation_failed`, los motivos de `errors.password` DEBEN ir a la contraseña nueva, también el de una confirmación que no coincide: la regla `confirmed` de `ChangePasswordRequest` lo informa en `password`, y no en `password_confirmation` como el alta y el restablecimiento.
- **FR-055**: Descargar los datos y borrar la cuenta DEBEN pedir la contraseña y confirmarla con `POST /api/auth/confirm-password {password}` antes de llamar a la acción. Si la acción responde 423, DEBEN pedirla otra vez. *(C3a FR-030; C3b FR-043 y FR-044)*
- **FR-056**: Descargar los datos DEBE llamar a `POST /api/me/export`, recibir el archivo completo y guardarlo con el nombre de `Content-Disposition` (`taller-<id>-<AAAAMMDD>.json`), sin dejar una copia en el almacenamiento del navegador. *(C3b FR-043)*
- **FR-057**: La pantalla de la descarga DEBE distinguirla de «Exportar mi progreso»: dice qué trae y que Método no la importa. *(contrato de C3b, `taller-export-2`)*
- **FR-058**: Borrar la cuenta DEBE decir qué se borra, que no se puede deshacer, que no es «Borrar todo» y, antes de D1c, que el progreso del navegador se queda. Además, DEBE pedir la contraseña y una confirmación explícita antes de llamar a `DELETE /api/me`. *(C3b FR-044 y FR-049)*
- **FR-059**: Con 202, DEBE mostrar el mensaje del servidor y recargar el documento al cerrarlo, porque la sesión ya terminó. Ante un 409 `last_admin`, DEBE mostrar el mensaje del servidor. *(C3b FR-044)*

**Recuperar por correo (F11c)**

- **FR-060**: Con `features.passwordReset` en `true`, el ingreso DEBE ofrecer «¿Te olvidaste la contraseña?», una pantalla que pide el email y llama a `POST /api/auth/forgot-password {email}`. *(C3c FR-012)*
- **FR-061**: Con 202, DEBE mostrar el mismo mensaje exista o no la cuenta. Ante un 503 `mail_unavailable`, DEBE mostrar el mensaje del servidor y el camino sin correo; ante un 429, cuánto falta. *(C3c FR-012 y FR-014)*

**Lo de D1 (F11d; espera a D1c)**

- **FR-062**: «Tu cuenta» DEBE ofrecer «Estoy en una computadora compartida». Antes de activarla, DEBE decir qué se pierde, también lo que no llegó al servidor. Al confirmar, DEBE borrar en ese momento los datos locales de la cuenta que registran sus dueños (D1c, su espacio local; A3, su copia del contenido), y desde ahí el navegador no guarda progreso. *(Q5; D1 FR-070, que se enmienda en D1c, y FR-071)*
- **FR-063**: Si el navegador no deja escribir en su almacenamiento, «Tu cuenta» DEBE avisar que el taller funciona en modo compartido. *(D1 FR-070)*
- **FR-064**: Si el navegador tiene progreso v1 sin importar, después del ingreso y antes de que el cliente escriba nada, DEBE mostrar el resumen (los ejercicios resueltos y la fecha del último resultado) y preguntar «¿Este progreso es tuyo?». El cliente de D1c importa sólo con un sí. *(D1 FR-072 y FR-073)*
- **FR-065**: Ante un 409 `import_needs_confirmation`, DEBE volver a preguntar sin decir el motivo y, con un sí, reenviar con la confirmación. Al terminar, DEBE mostrar el informe: lo escrito, lo omitido, lo reemplazado y los conflictos. *(D1 FR-073; contrato de D1b, §7)*

**Accesibilidad, celular y movimiento reducido (todas las partes)**

- **FR-066**: Cada pantalla DEBE poder completarse y enviarse sólo con el teclado, con el foco visible, un orden de foco que sigue el visual y el foco inicial en el título o en el primer campo.
- **FR-067**: Cada pantalla DEBE funcionar desde 320 px de ancho sin desplazamiento horizontal, con campos de 16 px o más (iOS agranda la página ante campos más chicos), y «Tu cuenta» DEBE ocupar la pantalla entera en el celular.
- **FR-068**: Ningún estado DEBE depender de una animación. Con movimiento reducido no hay transiciones: rige la regla global de `styles.css`, sin librería de animación. *(hoja de ruta, «Reglas de todo port»)*
- **FR-069**: Los estilos DEBEN ser clases de hojas del taller, que reutilizan sus botones, diálogos y tokens. NO DEBE haber ningún `style=` nuevo, ni `style={…}` de React (que se dibuja como `style=`), ni `setAttribute('style', …)`, ni `.cssText`. *(C4: la CSP sin `'unsafe-inline'`)*

**Seguridad (todas las partes)**

- **FR-070**: Las contraseñas y los tokens NO DEBEN guardarse en `localStorage`, `sessionStorage`, una cookie propia, la URL, el historial ni el estado global, ni escribirse en la consola. Viven en el formulario y se descartan al terminar.
- **FR-071**: Los mensajes NO DEBEN revelar si un email tiene cuenta más allá de lo que ya revela el servidor: el front no distingue entre dos 422 de credenciales ni entre los motivos de un restablecimiento o de un pedido de enlace que fallan. *(C3a FR-011 y FR-026; C3c FR-012)*

**Librerías y peso (todas las partes)**

- **FR-072**: React Hook Form DEBE instalarse con el primer formulario y con el permiso del usuario, con la versión fijada en `package.json` y en `package-lock.json`. nuqs NO entra, y el estado de la sesión usa Zustand, que ya está instalado. *(`AGENTS.md`)*
- **FR-073**: El PR que agrega React Hook Form DEBE medir `dist/index.html` antes y después (`html.length`), separar lo que suma la librería de lo que suma el código propio, y quedar bajo el límite de `build-check`. *(hoja de ruta)*

**Verificación (todas las partes)**

- **FR-074**: Cada comportamiento DEBE empezar con una prueba que falla. Se usa Vitest con Testing Library para la lógica y los componentes, con el `fetch` inyectado y las respuestas armadas con fishery a partir de los contratos. Los valores esperados se escriben a mano, nunca con la misma factory. *(constitución, principio II; ADR 0008)*
- **FR-075**: Los E2E DEBEN usar Page Objects con localizadores accesibles y responder `/api/*` con `page.route` según los contratos, sin servicios externos ni el stack de Docker. *(ADR 0008)*
- **FR-076**: La red E2E vigente en la base de cada parte (en F11a, los 123 de F1 y A2), `boot-check`, `dist-content-check` y `load-order-check` DEBEN seguir en verde sin editar sus escenarios. Sólo cambian la tabla de etapas de `load-order-check`, el fixture automático de los E2E (FR-014) y el servidor de contenido del arnés de los checks (`qa/lib/content-server.ts`), que responde la sesión. F11 NO DEBE dejar regiones `alert` ni `status` en el documento mientras no muestra nada, porque la red ubica el error de la compuerta con `getByRole('alert')`.
- **FR-077**: Cada parte DEBE cerrar con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde, y actualizar `docs/architecture.md` y `qa/AGENTS.md` con lo que agrega.

### Key Entities *(include if feature involves data)*

- **Estado de la sesión:** lo que el navegador sabe de la sesión mientras el documento vive. Puede ser desconocido (antes de que responda la etapa de sesión), sin cuenta o con cuenta. Guarda la cuenta publicada, `features` y `contentVersion`, que A3 usa para las porciones. Vive en memoria, en un store de Zustand, y nunca en el almacenamiento.
- **Cuenta publicada:** `{id, name, email, role, privacyAccepted}`, los cinco campos que publica C3a (FR-035 de C3a). El `id` alimenta `X-Taller-User`.
- **Fragmento con token:** la invitación (un token de 43 caracteres en base64url) o el restablecimiento (un token y un email). Vive sólo en memoria desde que la etapa de los tokens lo lee y lo borra de la URL, y el arranque sabe que hubo uno, para que A3 no use la copia (su FR-024).
- **Error de la API:** `{message, code}`; un 422 suma `errors.<campo>` (una lista de mensajes por campo), y un 429 o un 503 suman `Retry-After`. Una respuesta que no es JSON, o una falla de red, es otro caso.
- **Aviso de privacidad:** un archivo del front con el texto y su versión, la misma que `PRIVACY_VERSION` (Q2). La cuenta aceptó la vigente o no (`privacyAccepted`).
- **«Pedir el ingreso»:** la operación que muestra el acceso y se resuelve con la cuenta, fuera de los topes de espera del arranque. La llaman la etapa de sesión, las pantallas de F11 ante un 401 y A3 ante un 401 en una porción (R1 y C1).
- **Entrada «Tu cuenta» y su diálogo:** un botón en la barra superior, el único punto de F11 dentro del shell legacy (Q3).
- **Elección de computadora compartida** (F11d): se elige en «Tu cuenta» (Q5). Al activarla se borran los datos locales de la cuenta que registran sus dueños (el espacio de D1c y la copia del contenido de A3), y desde ahí el navegador no guarda progreso.
- **Datos locales de la cuenta:** lo que cada dueño guarda de la cuenta en el navegador y registra para que se borre al activar el modo compartido: el espacio de D1c y la copia del contenido de A3. F11 los borra sin nombrar sus almacenes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (F11a): Al abrir un enlace con `#invitacion=` y otro con `#restablecer=`, la URL que lee `app.js` y el historial tienen 0 tokens en los 2 casos, y al terminar el alta la sesión está abierta sin recargar el documento.
- **SC-002** (F11a): Con el build de F11a y el doble de la API con su sesión por omisión, los 123 E2E de F1 y A2 pasan sin editar ningún escenario, y cada arranque hace un solo `GET /api/session` antes de pedir el contenido.
- **SC-003** (F11a, en las specs de la etapa y en E2E): con `user: null`, se evalúan 0 fuentes legacy y se hacen 0 pedidos de contenido. Después del ingreso, la etapa vuelve a pedir la sesión una vez, y la compuerta corre una sola vez, sin recargar, con la URL pedida. Con el reloj simulado, un ingreso que dura más que el tope de espera no dispara ningún tope.
- **SC-004** (todas): Cada fila de «Pantallas, endpoints y estados» tiene al menos una prueba, de Vitest o E2E, por cada estado que no esté en blanco, con un cuerpo tomado del contrato, y el 100 % de esos estados muestra un mensaje visible que dice qué hacer.
- **SC-005** (todas): Después de recorrer todas las pantallas en un E2E, hay 0 contraseñas y 0 tokens en `localStorage`, `sessionStorage`, `document.cookie`, la URL, el historial y la consola.
- **SC-006** (F11a): Un email inexistente y una contraseña equivocada muestran el mismo texto visible (0 diferencias), y lo mismo pasa con un token inválido, uno vencido y un email sin cuenta en el restablecimiento.
- **SC-007** (todas): Cada pantalla se completa sólo con el teclado. Cerrar «Tu cuenta» devuelve el foco a su entrada. A 320 y a 390 px no hay desplazamiento horizontal, y con movimiento reducido hay 0 transiciones (E2E).
- **SC-008** (todas): `dist/index.html` queda por debajo de 1 250 000 caracteres (el límite de `build-check`), y el PR informa cuánto creció, separando la librería de formularios del código propio.
- **SC-009** (F11b): El archivo descargado tiene el nombre que mandó el servidor y los mismos bytes, y en el almacenamiento quedan 0 copias. Después de borrar la cuenta, el documento se recarga y las cuatro claves v1 siguen intactas.
- **SC-010** (F11c y F11d): Con `features.passwordReset: false` no aparece ningún «¿Te olvidaste la contraseña?», y con `true`, un email que existe y uno que no muestran el mismo texto. Al activar el modo compartido en «Tu cuenta», el espacio local de la cuenta y la copia del contenido quedan vacíos en ese momento; al cerrar la pestaña quedan 0 claves de progreso (SC-004 de D1); y la pregunta no escribe nada antes del sí.
- **SC-011** (todas): Cada parte cierra con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde, y su código suma 0 sitios de estilo en línea (`style=`, `style={…}`, `setAttribute('style', …)` o `.cssText`).
- **SC-012** (F11a): Con el stack levantado, la vista previa (puerto 8765) y `npm run dev` responden `GET /api/session` desde la API del stack, sin respuestas 404 ni 502.

## Assumptions

**Las dependencias y su estado**

- **A2 en `master`.** F11a parte de `master` con A2 adentro (PR #40). Hasta que se integre, el arranque por etapas existe sólo en la rama `f2a/base` (`2ffbbc6`).
- **F2b no es necesaria.** F11 no usa la gramática de URL de F2b: lee los fragmentos en su propio slice, y F10 decide si pasan a `shared/config`. El `viewFromHash` de F2b sigue dando «recorrido» para `#invitacion=abc` (su plan lo fija); con F11, el fragmento ya no llega.
- **Los contratos de C3a y C3b** son los entregados, y se contrastaron con el código de `e87772d`:
  - las rutas de `routes/api/account.php`, `access.php`, `export.php` y `deletion.php`;
  - las reglas de `LoginRequest`, `AcceptInvitationRequest`, `ResetPasswordRequest`, `ChangePasswordRequest` y `PrivacyRequest`;
  - los mensajes de `lang/es/api.php`, `password-policy.php`, `passwords.php`, `validation.php` y `account.php`.

  Si C3a o C3b cambian por flow-forward, esta spec se ajusta.
- **C3c está sólo especificada,** y su plan espera el dominio. Lo que F11c toma de ella (el 202 uniforme, el 503 `mail_unavailable` y `features.passwordReset`) es un supuesto hasta que tenga plan.
- **La interfaz con A3** quedó acordada en el clarify del 2026-10-28 (R1 y el ruling C1): F11a introduce la etapa de sesión y «pedir el ingreso», y A3 la extiende. La spec de A3 (016, PR #49) se actualiza con esas respuestas.
- **D1c no tiene plan.** Lo que F11d toma de D1 son las superficies 1 y 2, el estado y las acciones que expone el cliente (FR-077 de D1). El detalle se precisa con D1c.
- **El ADR 0006 sigue en propuesta.** Lo que F11 toma de él llega a través de las specs de C3a, C3b y D1.

**Los textos y los archivos**

- **El texto del aviso de privacidad lo escribe el usuario** (§13.14 del ADR 0006). Esta spec no lo redacta. Hasta tenerlo, el uso local puede llevar uno provisional con la versión `2026-10-dev`, si el usuario lo acepta (ver «Acciones del usuario»).
- **La descarga de la cuenta no se importa en Método:** su formato es `taller-export-2` (contrato de C3b), distinto de la copia v1 que importa Método.

**El estado y la API**

- **El estado de la sesión es compartido:** lo usan F11, A3, D1c, A4 y F12. Es el primer caso real de estado de cliente compartido entre funcionalidades después de los almacenes de F2a, así que va en Zustand, que ya está instalado (`AGENTS.md`).
- **El cliente de la API es de todo el front:** vive en `shared/api` y lo usan después A3, D1c, A4 y F12. La sesión vive en `entities/session`, y las pantallas, en `pages/`. Los nombres los confirma el plan.
- **«Pedir el ingreso» es parte de la API pública del slice** (R1): la usan la etapa de sesión, las pantallas de F11 ante un 401 y A3 ante un 401 en una porción. D1c y A4 la toman cuando lleguen.
- **El proxy de `/api/` llega con F11a** (C1): la vista previa y `npm run dev` pasan `/api/` al stack levantado, y la vista previa deja de servir sin el stack. `vite preview`, el servidor de los E2E, sigue sin API: ahí responde el doble (FR-014).
- **Antes de A3, la cuenta no protege el currículo:** la sesión es obligatoria desde F11a, pero el documento estático de A2 se sirve sin sesión hasta que A3 lo retire.

**Las cuentas y los límites**

- **Un admin es una cuenta más:** ingresa y estudia (Q3 de C3a). Sus pantallas son de F12.
- **Los límites de C3a pueden ver una sola IP hasta C4.** Un aula detrás de un NAT comparte los límites por red, y la pantalla muestra el `Retry-After` que llega, sin calcular nada por su cuenta.

## Alternativas consideradas

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Librería de formularios | React Hook Form 7.89.0; TanStack Form 1.33.5; estado propio | **React Hook Form** (pedido del usuario). Según bundlephobia (consultado el 2026-10-07; es una estimación de un tercero sobre el paquete entero, sin tree-shaking), pesa 43 085 bytes minificado y no tiene dependencias, contra 72 485 y dos dependencias de TanStack Form. `html.length` cuenta caracteres, así que lo que importa es el minificado y no el gzip (14 775 contra 17 856). El estado propio lo descartó el usuario |
| Servidor falso para Vitest | `fetch` inyectado en el cliente, con respuestas de fishery; MSW 3.0.2 (3 347 702 bytes desempaquetados, con más de diez dependencias directas) | **`fetch` inyectado.** El ADR 0008 no adopta MSW y lo reevalúa cuando el front sume pedidos a `/api`, y F11 es el primero que lo hace. El front ya recibe sus fuentes por inyección (la compuerta de A2 recibe su fuente de contenido), y un `fetch` falso alcanza para probar los encabezados, los errores y lo que no es JSON. Costo: el cliente real se prueba contra ese doble y no contra la capa de red del navegador; esa parte la cubren los E2E |
| E2E | Rutas simuladas de Playwright (`page.route`) contra `vite preview`; un proyecto contra el stack de Docker | **Rutas simuladas,** como manda el ADR 0008 («sin Nginx y sin API»): corren en el job `front` de la CI y no necesitan cuentas reales. Costo: la cookie HttpOnly, `SameSite` y el CSRF reales (FR-050 de C3a) no se ejercen. Esa verificación sigue a mano contra el stack, declarada en el PR como hizo C3a; un humo automático contra el stack espera a A3 y C4 (ADR 0008) |
| La sesión antes de A3 (Q1) | Modo abierto hasta A3, sin red al arrancar (la recomendada); obligatoria desde F11a; F11a y A3 integradas juntas | **Obligatoria desde F11a** (usuario). Costo: F11a trae el doble de la API para que los 123 E2E no se editen; la vista previa y `npm run dev` pasan `/api/` al stack; sin servidor el taller no abre hasta que A3 sume la copia; y el operador invita a todos antes de integrar F11a, aunque el currículo estático siga sin sesión hasta A3. El modo abierto dejaba todo igual hasta A3, con dos modos que probar; integrar F11a y A3 juntas agrandaba la integración |
| De quién es la etapa de sesión | La introduce F11a y A3 la extiende; de A3, con una etapa de tokens y una de acceso de F11 alrededor (lo que proponía A3) | **La introduce F11a** (ruling C1, por la sesión obligatoria), y A3 la extiende con la `Content-Version` y el 401 de las porciones. Con «pedir el ingreso» no hace falta una etapa de acceso aparte, porque `runBoot` no vuelve atrás |
| Dónde vive la cuenta | Un diálogo con su propia raíz; una vista `#cuenta`; dentro de Método | **Un diálogo** (Q3). `#cuenta` rompe el contrato de las ocho vistas y el `viewFromHash` de F2b. Método es legacy hasta F8, y meter ahí la cuenta toca `app.js` |
| La entrada a «Tu cuenta» (Q3) | La barra superior (la recomendada); el pie de la barra lateral; el último enlace de la navegación; sin entrada hasta F10 | **La barra superior** (usuario) |
| El aviso de privacidad (Q2) | Un archivo del front y `PRIVACY_VERSION` en el `.env` (la recomendada); la versión en `GET /api/session`; la API sirve el texto | **El archivo del front** (usuario). Costo: dos lugares que mantener iguales |
| «Salir» y el progreso del navegador antes de D1c (Q4) | No tocarlo y avisarlo (la recomendada); ofrecer borrarlo; borrarlo siempre | **No tocarlo y avisarlo** (usuario; ADR 0003) |
| Dónde se elige «computadora compartida» (Q5) | Una casilla en el ingreso, excluyente con «Recordarme» (la recomendada); una pregunta después de ingresar; una opción en «Tu cuenta» | **En «Tu cuenta»** (usuario). Al activarla se borran en ese momento los datos locales de la cuenta (el espacio de D1c y la copia de A3), y el FR-070 de D1 se enmienda en D1c. Costo: lo que la cuenta guardó antes de activarla se pierde, también lo no enviado, con aviso previo |
| Salir y cambiar de cuenta | Recargar el documento; desmontar el shell | **Recargar.** `app.js` no se desmonta: registra oyentes y un `setInterval` de 500 ms sin limpieza (mapa, §1). La recarga además asegura que no quede nada de la sesión anterior |
| Validación de contraseñas en el cliente | Sólo lo obligatorio, el largo y la confirmación; un esquema propio con la política | **Lo mínimo** (hoja de ruta). Un esquema duplicaría la lista de bloqueadas y las reglas del nombre y del email, y se desfasaría |
| Confirmar la contraseña antes de exportar o borrar | Pedirla siempre; consultar antes `confirmed-password-status` y pedirla sólo si hace falta | **Pedirla siempre.** Es un paso menos y, para borrar la cuenta, más seguro; el 423 sigue cubierto si la confirmación vence entre los dos pedidos |

## Riesgos

1. **F11a es grande y está en el camino crítico de A3:** 64 requisitos con los transversales. *Mitigación:* el plan la reparte en unidades con su prueba y su punto de reversión, y F11b, F11c y F11d no la demoran.
2. **El peso.** Después de F2a y A2, `dist/index.html` mide 1 136 702 caracteres (T020 de F2b) y el límite de `build-check` es de 1 250 000: quedan unos 113 KB, y F2b puede sumar hasta 8 000 caracteres. React Hook Form solo pesaría unos 43 KB, más de un tercio de ese margen, antes del código de F11. *Mitigación:* FR-073 lo mide en el PR. Si no entra, decide el usuario: subir el límite (que existe para que el currículo no vuelva al HTML) o achicar. C4 retira el HTML autónomo más adelante.
3. **El aviso de privacidad desfasado** bloquea todas las altas (Q2: el archivo del front y `PRIVACY_VERSION`). *Mitigación:* el paso de despliegue documentado y el error que pide recargar (FR-047).
4. **La entrada en la barra superior cambia el aspecto del shell** y puede mover medidas que fija la red (Q3). *Mitigación:* va después de la barra lateral en el documento (la regla R4 sigue midiendo el mismo botón), fuera de `.navigation` (R8), y se corre la red completa antes de integrar.
5. **Dos raíces de React hasta F10.** *Mitigación:* la de la cuenta tiene su propio elemento y nunca vive en `#main`, que pisan la compuerta y las vistas (FR-010).
6. **`boot-check` y `dist-content-check` arrancan `main.tsx` con un `fetch` simulado** que hoy sólo sirve el contenido, y la sesión obligatoria los rompería. *Mitigación:* su servidor de contenido (`qa/lib/content-server.ts`) responde la sesión, el único lugar que cambia (FR-076), y el plan comprueba que la entrada «Tu cuenta» se dibuje en el DOM falso de `boot-check`.
7. **jsdom no implementa `showModal`** (ADR 0008). *Mitigación:* el diálogo «Tu cuenta», su foco y Esc se prueban en E2E, y las specs de componente reciben un stub mínimo sólo si lo necesitan.
8. **La pila de DOM de Vitest no está instalada.** Si F11a llega antes que F3, trae ella `jsdom`, Testing Library y fishery, con permiso (ver «Acciones del usuario»).
9. **Sin la prueba de navegador real contra el stack,** la cookie, `SameSite` y el CSRF reales quedan sin probar en la CI. *Mitigación:* la verificación a mano declarada en el PR, como en C3a.
10. **Los contratos de C3c y D1c pueden cambiar en sus planes.** *Mitigación:* F11c y F11d se planifican con ellos, no antes.
11. **Antes de A3, la cuenta no guarda el progreso ni protege el currículo:** el progreso sigue en el navegador, y el documento estático se sirve sin sesión. *Mitigación:* la nota de «Tu cuenta» (Q4) y el aviso de privacidad; A3 retira el documento.
12. **La computadora compartida antes de D1c:** quien ingresa después ve el progreso del anterior, como hoy (Q4). *Mitigación:* decirlo, y D1c con F11d.
13. **La sesión obligatoria antes de A3 exige cuentas para todos y el stack levantado:** sin servidor el taller no abre hasta que A3 sume la copia, y el operador invita a cada alumno antes de integrar F11a (Q1). *Mitigación:* «Acciones del usuario» lo pide, y el error dice cómo reintentar.

## Relación con otros ítems

**A2** (spec 006, PR #40):

- F11a agrega dos etapas a `runBoot` (la de los tokens y la de sesión) y una fila a la tabla de `load-order-check`, sin tocar la compuerta ni su vista.
- La spec y el plan de A2 nombran «la sesión de A3» y «el acceso de F11» como dos etapas previas. Con el clarify (C1) son dos, las dos de F11a: la de los tokens y la de sesión, que A3 extiende.

**A3** (spec 016, PR #49):

- La interfaz quedó acordada en el clarify (R1 y C1):
  - F11a introduce la etapa de sesión: pide `GET /api/session` en cada arranque, llama a «pedir el ingreso» con `user: null` y guarda `user`, `features` y `contentVersion` (FR-003 a FR-008);
  - A3 la extiende: usa la `Content-Version` de la sesión para las porciones y, ante un 401 en una porción, llama a «pedir el ingreso»;
  - F11 borra los tokens antes y avisa que los había, para que A3 no use la copia (FR-002);
  - el aviso de privacidad, su reaceptación y el token con una sesión viva son de F11a (FR-005 y FR-046);
  - F11a arma el doble de la API de los E2E, que A3 reutiliza y extiende con el contenido (FR-014);
  - el proxy de `/api/` de la vista previa y de `npm run dev` llega con F11a (FR-036), así que la Q3 de A3 y su FR-032 se adelantan a F11a;
  - «Salir» borra la última copia del contenido desde A3 (FR-050; A3-Q2);
  - el tiempo de «pedir el ingreso» no cuenta para el tope del intento de arranque de A3 (FR-006; FR-010 de A3);
  - al activar el modo compartido, F11d borra también la copia del contenido, que A3 registra entre los datos locales de la cuenta (FR-062).
- A3 espera a F11a, no a toda F11 (P1).
- Sin servidor, F11a muestra el error con «Reintentar». Desde A3, quien no cerró su sesión sigue con la copia (A3-Q2).

**C3a** (spec 004, entregada). Hallazgos para su dueño, sin cambiar nada:

1. `GET /api/session` no publica la versión vigente del aviso (Q2).
2. En `PUT /api/me/password`, una confirmación distinta llega en `errors.password`, mientras que en el alta y en el restablecimiento llega en `errors.password_confirmation` (FR-054).
3. El mensaje de `auth_failed` («El email o la contraseña…») se usa también en pantallas sin email: confirmar y cambiar la contraseña. El front lo reemplaza ahí.
4. Que `logout` acepte un pedido del mismo sitio sin token ya está anotado para C4; F11 manda el token igual.

**C3b** (spec 010, entregada):

- F11b consume la descarga y la supresión: la descarga llega en streaming, con 3 por día y `password.confirm`, y la supresión responde con el mensaje que la pantalla muestra.
- No exige `verified`.

**C3c** (spec 011, sólo especificada):

- F11c consume `forgot-password`.
- La spec de C3c supone que F11 también trae el registro y la verificación de email (`#verificar=`). Esta spec los deja fuera porque están apagados (`REGISTRATION_OPEN=false`). Si alguien enciende el registro, hace falta una spec nueva que extienda a esta.
- La hoja de ruta del front no cita a C3c en la fila de F11.

**D1** (spec 007):

- F11d son las superficies 1 y 2.
- El FR-070 de D1 se enmienda en D1c: el modo compartido se elige en «Tu cuenta» y, al activarlo, se borra en ese momento el espacio local de la cuenta (Q5). D1c registra ese espacio entre los datos locales de la cuenta, y A3, su copia del contenido.
- D1c depende de F11a: del ingreso, de salir y de «pedir el ingreso».
- D1 pide enviar la cola antes de cerrar la sesión (su FR-068). Ese paso lo suma F11d o D1c antes del `POST` de salida; F11a no lo anticipa.

**F1, F2b y F8:**

- F11 no edita los escenarios de F1 ni depende de F2b (PR #41 a #44, abiertos).
- F8 («Borrar todo» con contraseña) y F12 pueden reutilizar el pedido de la contraseña ante un 423 que construye F11b. Cuando aparezca el segundo uso, conviene moverlo a un lugar compartido.

**F10:**

- Decide si la raíz de la cuenta pasa a ser una ruta de la raíz única o sigue como la compuerta del arranque.
- La entrada «Tu cuenta» pasa al shell en React.

**F12:**

- Depende de F11a (el cliente, la sesión y el ingreso), no de F11b.
- Dónde se monta sigue abierto. El diálogo de F11 es un precedente.

**F13 (propuesta):**

- El estado de sincronización y los avisos de D1 no son de F11.

**C4:**

- F11 no agrega estilos en línea, y sus formularios no usan el envío nativo (`form-action 'none'`).
- C4 propone, sin decidir, prefijar `XSRF-TOKEN`. Si lo hace, el cliente lee el nombre nuevo desde un solo lugar.
- La hoja de ruta deja abierto si C4 espera a F12. La misma pregunta vale para F11b: sin ella, un alumno no tiene cómo descargar sus datos ni borrar su cuenta solo.

## Acciones del usuario

Los agentes no las hacen. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII).

| Cuándo | Acción |
| --- | --- |
| Ahora | Confirmar la ubicación de las pantallas de cuenta como una raíz previa al shell, si las respuestas del 2026-10-28 no la dan por confirmada (la hoja de ruta la tiene como propuesta). |
| Antes de integrar F11a | El texto del aviso de privacidad y su versión (§13.14), o aceptar uno provisional para el uso local. Dar de alta, por invitación, a cada alumno que use el taller: desde F11a no se entra sin cuenta (Q1). |
| F11a, primer formulario | Permiso para `react-hook-form` 7.89.0, de npm: MIT, sin dependencias, 1 527 796 bytes desempaquetados según el registro (consultado el 2026-10-07). |
| F11a, si llega antes que F3 | Permiso para la pila de DOM: `jsdom` 30.1.2 y Testing Library (56 paquetes, unos 26,3 MB). También, para `fishery` 2.4.0 (2 paquetes, unos 0,19 MB). Las medidas son del ADR 0008. |
| Al desplegar F11a | Poner en `PRIVACY_VERSION` la versión del aviso que trae el front (Q2), y levantar el stack para usar la vista previa. |
| Antes de F11c | El dominio de C3c y C4. |

## Descargas previstas

- **F11a:** `react-hook-form` 7.89.0 y, si F3 no los trajo antes, `jsdom`, Testing Library y `fishery`.
- **F11b, F11c y F11d:** nada nuevo.
- **Nada más:** ni MSW, ni nuqs, ni un router.
