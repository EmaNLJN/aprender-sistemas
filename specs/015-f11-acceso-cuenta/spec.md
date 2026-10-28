# Feature Specification: F11 · Acceso y cuenta

**Feature Branch**: `015-f11-acceso-cuenta` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-07

**Status**: Borrador, con cinco preguntas abiertas para el clarify y una partición propuesta

**Input**: Ítem **F11** de la hoja de ruta [`specs/front-react/roadmap.md`](../front-react/roadmap.md), «Acceso y cuenta»: las pantallas de cuenta como una raíz previa al shell. Son el ingreso, la invitación, recuperar y cambiar la contraseña, exportar y borrar la cuenta, el aviso de privacidad y, de D1, la opción «computadora compartida» y la pregunta «¿Este progreso es tuyo?». Lo encargó el coordinador el 2026-10-07. Consume los contratos de C3a ([spec 004](../004-c3-identidad-acceso/spec.md) y su [contrato HTTP](../004-c3-identidad-acceso/contracts/http.md)), de C3b ([spec 010](../010-c3b-admin-ciclo-de-vida/spec.md) y su [contrato HTTP](../010-c3b-admin-ciclo-de-vida/contracts/http.md)), de C3c ([spec 011](../011-c3c-correo/spec.md), sólo especificada) y de D1 ([spec 007](../007-d1-progreso-sincronizacion/spec.md) y el [contrato de D1b](../007-d1-progreso-sincronizacion/contracts/http-d1b.md)). Se contrastaron con el código de la API en `master` (`e87772d`): `backend/api/routes/api/`, `backend/api/app/Http/` y `backend/api/lang/es/`. Se apoya en el arranque por etapas de A2 ([spec 006](../006-a2-compuerta-arranque/spec.md)), cuyo código vive en la rama `f2a/base` (`2ffbbc6`, PR #40, abierto) y todavía no en `master`; por eso se cita por rama y ruta, sin enlace. Adopta la interfaz con la etapa de sesión que propone la spec de A3 (016, PR #49, rama `spec/a3-contenido-api`, abierto), que también se cita sin enlace. Usa como base el [ADR 0008](../../docs/adr/0008-pruebas-del-front.md) y el [ADR 0003](../../docs/adr/0003-integridad-del-progreso.md), aceptados, el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md), en propuesta, el [mapa del front legacy](../front-react/legacy-map.md) y la [constitución](../../.specify/memory/constitution.md) 1.4.1.

## Intención y alcance

**Lo que entendemos.** Desde C3a el taller tiene cuentas, pero nadie puede usarlas desde el navegador. El alta, el ingreso y la recuperación existen sólo como contrato HTTP y como enlaces que imprime la consola. Y un `#invitacion=<token>` cae hoy en «Mi recorrido», con el token a la vista en la barra de direcciones. F11 trae las pantallas que faltan:

- crear la cuenta con el enlace de invitación;
- ingresar y salir;
- elegir una contraseña nueva con el enlace de recuperación;
- leer y aceptar el aviso de privacidad;
- cambiar la contraseña, descargar los datos de la cuenta y borrarla.

Más adelante suma pedir el enlace por correo, cuando exista C3c, y las dos pantallas que pide D1 para una computadora compartida.

F11 vive en una raíz de React propia, antes del shell legacy y a su costado, nunca adentro: no espera a F10 ni toca las vistas. Entra al arranque de A2 con dos etapas. La primera borra los tokens de la URL antes de que la miren la etapa de sesión de A3 y `app.js`. La segunda muestra el acceso cuando hace falta. Hasta A3, el taller deja entrar sin cuenta, como hoy. Desde A3, quien no tiene sesión sólo ve el ingreso.

Es para el alumno que recibe la invitación y estudia con su cuenta, para quien opera el taller y entrega los enlaces, y para A3, D1c, A4 y F12, que necesitan saber quién es la cuenta. No es un port, porque las pantallas no existen en el legacy; aun así, el resto del taller no cambia: ni el aspecto, ni el comportamiento, ni el progreso guardado, ni las URL. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Una persona abre el enlace de invitación, crea su cuenta y entra al taller sin cortes. El token nunca queda en la barra de direcciones ni en el historial.
2. Quien olvidó la contraseña elige una nueva con el enlace que le pasa quien opera el taller, y después ingresa.
3. Hasta A3, quien no tiene cuenta usa el taller como hoy: el arranque no le pide nada a la API, y la red de 123 E2E y la vista previa sin API siguen igual. Desde A3, sin sesión sólo se ve el ingreso; con sesión, el arranque pasa a la compuerta del contenido sin recargar.
4. Cada pantalla resuelve sus estados (cargando, error de un campo, error del servidor, sesión vencida o de otra cuenta y límite de intentos) con un mensaje en español que dice qué hacer. Ninguno revela si un email tiene cuenta.
5. Ninguna contraseña ni ningún token quedan en el almacenamiento del navegador, en la URL ni en la consola.
6. Todo se completa con el teclado y en un celular de 320 px, y nada depende de una animación.
7. Desde «Tu cuenta», una persona descarga sus datos y borra su cuenta sin confundir eso con «Exportar mi progreso» ni con «Borrar todo».
8. `dist/index.html` sigue bajo el límite de `build-check`, y lo que suma cada parte queda medido.

**Entra** (entre paréntesis, la parte de la partición propuesta a la que va):

- **Las etapas del arranque y la raíz de la cuenta (F11a):**
  - la etapa de los tokens, primera de todas, que lee y borra los fragmentos con token;
  - la etapa de acceso, con un modo abierto (hasta A3) y uno obligatorio (desde A3, después de la etapa de sesión de A3);
  - una raíz de React con su propio elemento;
  - la entrada «Tu cuenta» en el shell y su diálogo.
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
- **La etapa de sesión del arranque, leer el contenido de la API, la última copia y el aviso sin backend:** son de A3 (sus FR-001 a FR-003). F11 toma de esa etapa `user` y `features`.
- **El router y la raíz única** (F10). Hasta F10 conviven dos raíces de React: la de la cuenta y la de la vista montada.
- **Cambiar una vista legacy o `frontend/app.js`.**

**Sin hacer a propósito (YAGNI):**

- **Cambiar el nombre** (`PATCH /api/me`) y **cerrar las otras sesiones** (`POST /api/me/sessions/logout-others`): existen en C3a, pero nadie los pidió para F11, y cambiar la contraseña ya cierra las otras sesiones.
- **El registro abierto y la verificación de email:** están apagados, y una cuenta creada por invitación nace verificada. Un 403 `email_unverified` se muestra con el mensaje del servidor, sin un recorrido propio.
- **Un esquema de validación propio** (como zod) **o reglas de composición de contraseñas:** la política es del servidor.
- **MSW:** el cliente recibe `fetch` por inyección, y las specs le pasan uno falso.
- **nuqs:** F11 no guarda estado en la query.
- **Un temporizador visible de la sesión, una librería de interfaz, de diálogos o de animación, y estado de formulario propio.**
- **Recordar en el navegador que alguien eligió «Seguir sin ingresar».**

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

## Partición propuesta

**Sin partir, F11 no tiene orden posible.** El tamaño importa, pero viene después; antes hay un ciclo:

- **Con lo de D1 adentro, F11 no se puede entregar.** Lo de D1 espera a D1c. D1c espera a A4 (Q4 de D1) y también a F11 (su fila «Depende de» en la spec 007). A4 espera a A3, y A3 espera a F11. Si F11 fuera una sola pieza, A3 esperaría a D1c, D1c a A4 y A4 a A3: el ciclo se cierra.
- **Con el pedido del enlace por correo adentro, A3 queda atada a una decisión de afuera.** Ese pedido necesita C3c, y el plan de C3c espera el dominio, que también pide C4. Mientras tanto, el restablecimiento con el enlace de la consola (`#restablecer=<token>&email=<email>`) ya funciona con C3a.
- **Lo que espera a C3b no frena nada:** C3b ya está entregada (PR #37). Exportar y borrar la cuenta no traban a nadie, pero tampoco son lo que A3 necesita.

| Parte | Qué trae | Depende de | Requisitos propios | Con los 12 transversales | Quién la espera |
| --- | --- | --- | --- | --- | --- |
| **F11a · Acceso** | Las etapas de los tokens y de acceso, con los dos modos de la segunda, la raíz de la cuenta y su entrada en el shell, el cliente de la API, los formularios, el ingreso, el alta con la invitación, el restablecimiento con el enlace, el aviso de privacidad, «Tu cuenta» y «Salir» | A2 (PR #40) y C3a (entregada) | 52 (FR-001 a FR-052) | 64 | A3, D1c, F11b, F11c, F11d y F12 |
| **F11b · Cuenta** | Cambiar la contraseña, descargar los datos de la cuenta y borrarla | F11a; C3a y C3b (entregadas) | 7 (FR-053 a FR-059) | 19 | Nadie del tronco (C4, ver «Relación con otros ítems») |
| **F11c · Recuperar por correo** | «¿Te olvidaste la contraseña?» y su pantalla | F11a y C3c, que espera el dominio | 2 (FR-060 y FR-061) | 14 | Nadie |
| **F11d · Lo de D1** | «Computadora compartida» y «¿Este progreso es tuyo?» | F11a y D1c, que espera a A4 | 4 (FR-062 a FR-065) | 16 | D1c, que entra en servicio con ella |

Los doce transversales (FR-066 a FR-077) valen para cada parte y se repiten en su cuenta, como hizo F2 con las reglas de todas sus unidades: teclado, celular, movimiento reducido, estilos, seguridad, librerías, peso y verificación. En total, la spec tiene 77 requisitos, contra los 52 de C3a, la mayor del épico hasta ahora. Cada requisito lleva una sola obligación que se puede comprobar.

**Recomendación: partir en cuatro, con este corte, y que A3 espere sólo a F11a.** Sigue siendo una sola spec, con un plan y unas tareas por parte, como D1 y F2: partirla es mover rangos, no reescribirlos.

**El costo:**

- Cuatro ciclos de plan y tareas.
- F11a pasa a ser la parte más grande del épico: 64 requisitos con los transversales, y es justo la que espera A3. Su plan la reparte en unidades, cada una con su prueba y su punto de reversión, sin cambiar lo que espera A3. Por ejemplo:
  - la etapa y el cliente;
  - el ingreso y la salida;
  - el alta y el aviso;
  - el restablecimiento.
- F11b, F11c y F11d tocan el diálogo «Tu cuenta» y el ingreso que deja F11a. Por eso se integran después de F11a y de a una.

**Las alternativas:**

- **Tres partes, con F11a y F11b juntas.** Junta todo lo que ya tiene la API entregada y ahorra un ciclo. Costo: A3 espera además cambiar la contraseña, exportar y borrar, que no usa.
- **El corte que sugería la hoja de ruta:** el acceso (ingreso, invitación y contraseña), la cuenta (exportar, borrar y privacidad) y lo de D1. Es anterior a la partición de C3b y C3c, y trae dos problemas:
  - deja «recuperar» en el acceso, así que A3 esperaría el dominio;
  - saca el aviso de privacidad del acceso, aunque el alta no se puede enviar sin aceptarlo.
- **No partir.** No se puede, por el ciclo con D1c.

**La respuesta a la pregunta abierta de A3:** A3 espera a F11a, no a toda F11. Es la opción A de la Q1 de A3 (PR #49), con una diferencia: A3 pone el aviso de privacidad en «la cuenta», y acá va en F11a, porque el alta no se puede enviar sin aceptarlo. F11d se especifica y se planifica junto con D1c (o pasa a F13, si el usuario acepta ese ítem), y F11c, junto con C3c.

## Preguntas abiertas para el clarify

Son cinco, cada una con sus opciones y una recomendada. Se cierran en `/speckit-clarify`, y las respuestas pasan a una sección Clarifications.

- **Los marcadores:** cada pregunta deja uno en el requisito que afecta (FR-003, FR-045, FR-012, FR-052 y FR-062), y esos cinco son los únicos. La plantilla admite tres y el coordinador fijó cinco.
- **La partición** no es una pregunta: está en su sección, con su recomendación, y el usuario la acepta o la cambia al responder.
- **Hasta el clarify,** los requisitos con marcador usan como borrador la opción recomendada.

### Q1. Si la sesión es obligatoria antes de A3

**Contexto:** hasta A3, la compuerta de A2 lee un documento estático que Nginx sirve sin sesión, y el progreso vive en el navegador. Una cuenta todavía no protege ni cambia nada. Además:

- **La red E2E de F1 y A2 no tiene API:** corre contra `vite preview`, sin `/api/`. Un `GET /api/session` no llega a ninguna API: Vite responde con un 404 o con el HTML del taller. Con un 404, Chromium registra un `Failed to load resource`, y el fixture automático `PageIssues` lo cuenta como error; con el HTML, la etapa no puede decidir si hay sesión. En los dos casos, cada prueba fallaría.
- **La vista previa tampoco:** `docker/compose.preview.yaml` no levanta la API.

Un `GET /api/session` en cada arranque rompería las dos cosas antes de que la sesión sirva para algo. (FR-003)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Modo abierto hasta A3: el taller no exige cuenta, y al arrancar F11a no pide nada a la red ni muestra pantallas (sólo agrega la entrada «Tu cuenta»), salvo que la URL traiga un token. A3 enciende el modo obligatorio cuando suma su etapa de sesión, en el mismo cambio que pone el contenido detrás de ella | Para quien no tiene cuenta no cambia nada. La red de 123 E2E, `boot-check` y la vista previa sin API siguen como están, y el operador puede dar de alta cuentas antes de A3. Costo: la etapa tiene dos modos, cada uno con sus pruebas, y antes de A3 ingresar no cambia lo que se ve, salvo «Tu cuenta» |
| B | Obligatoria desde F11a, aunque el contenido siga siendo estático | El taller exige cuenta desde F11a. Costo: F11a tiene que pedir `GET /api/session` en cada arranque por su cuenta, antes de que exista la etapa de sesión de A3; la red E2E necesita un fixture de sesión antes de A3; la vista previa sin API deja de servir; y el operador tiene que invitar a todos antes de integrar F11a, cuando la cuenta todavía no protege nada |
| C | F11a y A3 se integran juntas, con la sesión obligatoria | Un solo cambio de comportamiento. Costo: F11a y A3 se esperan una a la otra, la integración crece, y F11b (exportar y borrar) no puede llegar antes que A3 |
| Otra | Decir cuál | |

### Q2. De dónde salen el texto del aviso de privacidad y su versión

**Contexto:** de cada cuenta, C3a guarda sólo qué versión del aviso aceptó y cuándo (FR-022).

- **La versión vigente** sale de `PRIVACY_VERSION`, que por omisión vale `2026-10-dev`. El alta y `POST /api/me/privacy` rechazan cualquier otra con un 422 en `errors.privacyVersion`.
- **`GET /api/session` no la publica:** de la cuenta, sólo dice si aceptó la vigente (`privacyAccepted`).
- **El texto no es de C3a:** lo escribe el usuario (§13.14 del ADR 0006) y lo muestra el front.

O sea, el front tiene que llevar un texto y una versión iguales a los del servidor, y hoy nada lo comprueba. (FR-045)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | El texto y su versión viven en el repositorio, en un archivo del front que el build empaqueta, y quien despliega pone esa misma versión en `PRIVACY_VERSION`. Un desfase aparece en la primera alta («El aviso de privacidad cambió») | No cambia la API. Costo: hay dos lugares que mantener iguales, el archivo y el `.env`, y un desfase bloquea todas las altas hasta corregirlo. Se documenta en el despliegue |
| B | Como A, y además `GET /api/session` publica la versión vigente, con un campo nuevo en una spec del backend que extiende a C3a. El front compara antes de mostrar el alta | El desfase se ve antes de que el alumno complete el formulario. Costo: un cambio al contrato ya entregado de C3a, que F11a tiene que esperar |
| C | La API sirve el texto y la versión (`GET /api/privacy`), desde un archivo de su imagen | Una sola fuente. Costo: una ruta pública nueva en el backend, que F11a espera; el front muestra el texto como texto plano |
| Otra | Decir cuál | |

### Q3. Dónde vive la entrada a «Tu cuenta» mientras el shell siga siendo legacy

**Contexto:** cambiar la contraseña, descargar los datos, borrar la cuenta, leer el aviso y salir ocurren con `app.js` ya corriendo, así que necesitan una entrada en el shell. Hoy el shell es HTML estático de `frontend/src/index.html`. Una vista nueva `#cuenta` rompería el contrato de las ocho vistas: `app.js` y el `viewFromHash` de F2b dibujarían «Mi recorrido». Hay cuatro restricciones, medidas en los E2E (rama `f2a/base`):

- la regla R8 del contrato de CSS de F1 mide `.navigation a:last-child`;
- `.sidebar-bottom` se oculta por debajo de 850 px, igual que hoy «Exportar mi progreso»;
- ningún E2E ubica la barra superior por clase;
- el único localizador de botones sin nombre (la regla R4, `getByRole('button').first()`) toma el primero del documento, que hoy es «Exportar mi progreso», en la barra lateral. Una entrada que esté después de la barra lateral no lo cambia.

(FR-012)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Un botón «Tu cuenta» en la barra superior, junto al selector de lenguaje, visible en todos los anchos, que abre un diálogo modal con su propia raíz | Se ve y se alcanza desde el celular, no toca `.navigation` y agrega un solo elemento al shell. Costo: cambia el aspecto de la barra superior; hay que comprobar que entra a 320 px y que la red sigue en verde |
| B | Al pie de la barra lateral, junto a «Exportar mi progreso» | Agrupa lo que guarda la persona. Costo: por debajo de 850 px esa zona se oculta, así que desde el celular no hay forma de salir ni de llegar a la cuenta |
| C | Como último enlace de la navegación | Descartada: cambia qué enlace es `:last-child` y rompe la regla R8 de la red |
| D | Sin entrada visible hasta F10: sólo los enlaces con token y el ingreso de A3 | No cambia el shell. Costo: nadie encuentra «Salir», ni cómo descargar sus datos ni cómo borrar su cuenta |
| Otra | Decir cuál | |

### Q4. Qué hace «Salir» con el progreso del navegador antes de D1c

**Contexto:** hasta D1c, el progreso vive en las cuatro claves v1 de `localStorage`, que son del navegador y no de la cuenta; hoy, sin cuentas, ya es así. El ADR 0003 no deja borrar progreso sin aviso y sin copia. D1 lo resuelve con espacios por cuenta y con el modo compartido (su Q3). Mientras tanto, en una computadora compartida, quien ingresa después ve el progreso y los borradores de quien estuvo antes. (FR-052)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | «Salir» no toca el progreso del navegador, y «Tu cuenta» lo aclara junto al botón: «Tu progreso se guarda en este navegador, no en tu cuenta: queda acá aunque salgas.» | Es lo que pasa hoy, cumple el ADR 0003, y D1c lo reemplaza sin migrar nada. Costo: el riesgo de la computadora compartida sigue hasta D1c, aunque ahora queda dicho |
| B | Ofrecer «Salir y borrar el progreso de este navegador», con la copia de respaldo que ya hace «Borrar todo» | En un aula, el alumno puede limpiar al irse. Costo: un camino destructivo nuevo en F11 que repite «Borrar todo» (Método, F8 y `features/progress-backup` de F2b), antes de F8 y sólo para que D1c lo reemplace |
| C | Borrar siempre el progreso del navegador al salir | Descartada: pierde progreso sin que nadie lo pida (ADR 0003) |
| Otra | Decir cuál | |

### Q5. Dónde vive la opción «computadora compartida»

**Contexto:** D1 pide que el ingreso ofrezca un modo que no guarde progreso en el navegador (su FR-070), y la hoja de ruta dejó abierto dónde va. «Recordarme» hace lo contrario: deja la sesión abierta 30 días. El modo tiene que elegirse antes de que el cliente de D1c guarde algo. La pantalla llega con D1c (F11d), pero la respuesta define el diseño del ingreso de F11a. (FR-062)

| Opción | Respuesta | Implicancias |
| --- | --- | --- |
| **A (recomendada)** | Una casilla en el ingreso, «Estoy en una computadora compartida», que excluye a «Recordarme»: marcarla desmarca y deshabilita la otra | Es lo que dice D1 («el ingreso DEBE ofrecer»): se elige antes de que se guarde nada, y no deja una sesión de 30 días en la computadora de un aula. Costo: el ingreso suma un control y un aviso |
| B | Una pregunta después de ingresar, una vez por navegador | Costo: para preguntar una sola vez hay que guardar la respuesta en el navegador, que es justo lo que el modo evita; además, entre el ingreso y la respuesta el cliente ya podría haber escrito |
| C | Una preferencia dentro de «Tu cuenta» | Costo: llega tarde, cuando el cliente ya guardó, y se olvida |
| Otra | Decir cuál | |

## Las etapas de F11 y la raíz de la cuenta

Esta sección fija dónde entra F11 en el arranque de A2 y cómo convive con la etapa de sesión de A3 y con el shell legacy. Los nombres de módulos son provisionales y los confirma el plan; la spec fija la responsabilidad y el contrato.

**El arranque de hoy** (rama `f2a/base`, `2ffbbc6`). `frontend/src/app/main.tsx` llama a `runBoot([contentGate, legacyViews])`, y `runBoot` (`frontend/src/app/boot/run-boot.ts`) recorre las etapas en orden:

- **`contentGate`** (`content-gate.ts` y `content-stage.ts`) lee el documento estático, dibuja la espera y el error en `#main` y publica el contenido.
- **`legacyViews`** evalúa las fuentes legacy y llama a `startApp()`.

**La interfaz con A3.** La spec de A3 (016, PR #49, rama `spec/a3-contenido-api`) propone, en sus FR-002, FR-003, FR-021 y FR-024, una interfaz con F11 que esta spec adopta:

- la etapa de sesión del arranque es de A3: pide `GET /api/session` y entrega a las etapas siguientes `user`, `features` y `contentVersion`, o que el servidor no respondió;
- F11 borra los tokens de la URL antes de esa etapa, aunque el servidor no responda, y le avisa al arranque, en memoria, que los había;
- F11 toma `user` y `features`, dibuja el acceso con `user: null` y, después del ingreso, devuelve el arranque a la etapa de sesión;
- la salida es de F11, y con la opción B de la Q2 de A3 también borra la última copia del contenido.

Las diferencias que quedan están en «Relación con otros ítems», A3, y el coordinador las concilia.

**Con F11a y antes de A3, la secuencia es `runBoot([tokens, access, contentGate, legacyViews])`.** Desde A3, es `runBoot([tokens, session, access, contentGate, legacyViews])`: la etapa de sesión de A3 queda entre las dos de F11.

**La etapa de los tokens, primera de todas:** lee los fragmentos `#invitacion=<token>` y `#restablecer=<token>&email=<email>`, los guarda en memoria, los borra con `history.replaceState` y deja dicho que había un token. Todo eso pasa antes de la etapa de sesión, de la compuerta y de `app.js`, y no pide nada a la red.

**La etapa de acceso, en el modo abierto** (F11a, hasta A3; Q1):

- Sin token, resuelve en el acto: no pide nada a la red ni muestra ninguna pantalla, y el arranque sigue como hoy. Lo único nuevo es la entrada «Tu cuenta».
- Con token, muestra el alta o el restablecimiento, y resuelve al terminar o con «Seguir sin ingresar». Antes del primer pedido que modifica, el cliente pide `GET /api/session` para tener la cookie `XSRF-TOKEN`.

**La etapa de acceso, en el modo obligatorio** (desde A3):

- Recibe lo que entrega la etapa de sesión de A3, sin volver a pedirlo.
- Con `user: null`, muestra el acceso (el ingreso, o el alta o el restablecimiento si hay token) y no resuelve: la compuerta no corre y ninguna fuente legacy se evalúa. Después del ingreso o del alta, devuelve el arranque a la etapa de sesión, que vuelve a preguntar.
- Con sesión, pide aceptar el aviso si cambió, y resuelve. La compuerta sigue sin recargar el documento y con la URL que pidió el alumno.
- Si el servidor no respondió, no dibuja nada: la vista de error o la última copia son de A3.

**Quién enciende cada modo:** F11a entrega los dos con sus pruebas y deja el abierto en `main.tsx`. A3 pasa al obligatorio cuando suma su etapa de sesión, en el mismo cambio que mueve el contenido a la API. Desde ese momento, los 123 E2E corren con la API simulada que A3 agrega como fixture automático (su FR-038), que reutiliza las respuestas de cuentas que deja F11a (FR-014).

**Dónde se dibuja:**

- El acceso y el diálogo se dibujan en un elemento propio, fuera de `#main` y de `.app-shell`. Ahí no los pisa nadie: la compuerta escribe `#main` con `innerHTML`, y el Atlas crea su propia raíz sobre `#main`.
- La entrada «Tu cuenta» tiene su propio elemento en el lugar que fije Q3 (se recomienda la barra superior), después de la barra lateral en el documento.
- Mientras el acceso se muestra antes de las vistas, el shell estático queda inerte.
- Con el shell ya andando, la raíz dibuja la entrada y su diálogo modal, al costado de las vistas.

**Cómo se vuelve al shell:**

- Después de ingresar o de crear la cuenta en el arranque, la etapa de acceso resuelve (en el modo abierto) o devuelve el arranque a la etapa de sesión (en el obligatorio), y después sigue la compuerta.
- Desde «Tu cuenta», cerrar el diálogo deja el shell como estaba.
- «Salir», borrar la cuenta y un cambio de cuenta recargan el documento. El shell legacy no se puede desmontar (`app.js` registra oyentes y un `setInterval` que nunca limpia), y la recarga asegura que no quede en memoria nada de la sesión anterior.

## Pantallas, endpoints y estados

| Pantalla (parte) | Endpoint | Cargando | Error de campo | Error del servidor | Sesión vencida o de otra cuenta | Límite |
| --- | --- | --- | --- | --- | --- | --- |
| Acceso en el arranque, modo obligatorio (F11a, desde A3) | Ninguno propio: usa lo que entrega la etapa de sesión de A3 | La espera es de la etapa de sesión de A3 | — | Si el servidor no respondió, no dibuja nada: la vista de error o la última copia son de A3 | Una sesión inválida llega como `user: null` y muestra el ingreso | Lo resuelve la etapa de sesión de A3 |
| Ingreso (F11a) | `POST /api/auth/login` | «Ingresando…» | `errors.email` y `errors.password` | 422 `auth_failed`, 403 `account_disabled`, 5xx, red o algo que no es JSON | 419: renueva y reintenta una vez | 429 por email y red, o por bloqueo de la cuenta |
| Invitación (F11a) | `POST /api/auth/invitations/lookup` | «Revisando tu invitación…» | — | 404 `invitation_not_found`, 410 `invitation_expired`, 5xx | 419 | 429 (10 por minuto por red) |
| Alta (F11a) | `POST /api/auth/invitations/accept` | «Creando tu cuenta…» | `errors.name`, `errors.password` (con varios motivos) y `errors.password_confirmation`; `errors.privacyVersion` y `errors.token` van al error general | 404, 410, 409 `email_taken`, 5xx | 419 | 429 (10 por minuto por red) |
| Restablecer (F11a) | `POST /api/auth/reset-password` | «Cambiando la contraseña…» | `errors.password` y `errors.password_confirmation`; `errors.token` va al error general | 5xx | 419 | 429 (10 por minuto por red y 5 por email) |
| Aviso de privacidad (F11a) | `POST /api/me/privacy` | «Guardando…» | `errors.privacyVersion` va al error general | 5xx | 401: el ingreso; 409: «Recargar»; 419 | 429 de Nginx |
| Tu cuenta (F11a) | Ninguno; en el modo abierto, `GET /api/session` al abrirla | «Cargando tu cuenta…» | — | Red o 5xx: «Reintentar» | Sin sesión: el ingreso | 429 de Nginx |
| Salir (F11a) | `POST /api/auth/logout` | «Saliendo…» | — | Red o 5xx: «No pudimos cerrar la sesión» y «Reintentar» | 401: ya no había sesión, y recarga igual; 409: «Recargar» | 429 de Nginx |
| Cambiar la contraseña (F11b) | `PUT /api/me/password` | «Cambiando la contraseña…» | `errors.current_password` y `errors.password`, que también trae la confirmación que no coincide | 422 `auth_failed`, en la contraseña actual; 5xx | 401, 409 y 419 | 429 (5 por minuto por usuario) |
| Descargar mis datos (F11b) | `POST /api/auth/confirm-password` y `POST /api/me/export` | «Preparando el archivo…» | `errors.password` | 422 `auth_failed`, 423 (vuelve a pedir la contraseña), 5xx o un corte en medio de la descarga | 401, 409 y 419 | 429: 5 confirmaciones por minuto y 3 descargas por día (un `Retry-After` de horas) |
| Borrar la cuenta (F11b) | `POST /api/auth/confirm-password` y `DELETE /api/me` | «Borrando…» | `errors.password` | 422 `auth_failed`, 423, 409 `last_admin`, 5xx | 401, 409 y 419 | 429 (5 por minuto) |
| Pedir el enlace (F11c) | `POST /api/auth/forgot-password` | «Mandando…» | `errors.email` | 503 `mail_unavailable`, 5xx | 419 | 429 (5 por minuto y 20 por hora por red) |
| Computadora compartida (F11d) | Ninguno: pasa la elección a D1c | — | — | Almacenamiento bloqueado: el aviso | — | — |
| ¿Este progreso es tuyo? (F11d) | `POST /api/progress/import`, a través del cliente de D1c | «Sumando tu progreso…» | — | 409 `import_needs_confirmation` (vuelve a preguntar), 422 con rutas, 413 de Nginx (no es JSON), 5xx | 401, 409 y 419 | 429 |

Los mensajes del servidor se muestran tal como llegan (`backend/api/lang/es/api.php`). Los textos propios del front están en la sección siguiente.

## Textos que lee el alumno

Son propuestas, para que el usuario las corrija. «(servidor)» marca un mensaje que manda la API y que el front muestra sin cambios.

**Ingreso**

- Título «Ingresá al taller», con «Usá el email con el que te invitaron.».
- Campos «Email» y «Contraseña», esta con «Mostrar» y «Ocultar».
- Casilla «Recordarme en este navegador por 30 días», con la ayuda «No la marques en una computadora compartida.».
- Botón «Ingresar», que mientras espera dice «Ingresando…».
- Sin correo: «¿Te olvidaste la contraseña? Pedile un enlace nuevo a quien administra el taller.».
- En el modo abierto: «Seguir sin ingresar».
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
- En el modo abierto: «Seguir sin ingresar».
- Errores:
  - «La invitación no existe o ya se usó.» (servidor), seguido de «Si ya creaste tu cuenta, ingresá con tu email.»;
  - «La invitación venció. Pedí una nueva a quien te invitó.» (servidor);
  - «Ya hay una cuenta con ese email.» (servidor), seguido de «Ingresá con ese email.».

**Restablecer la contraseña**

- Título «Elegí una contraseña nueva», con «Para {email}.».
- Campos «Contraseña nueva» y «Repetí la contraseña nueva».
- Botón «Cambiar la contraseña».
- En el modo abierto: «Seguir sin ingresar».
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

- Casilla «Estoy en una computadora compartida», con «No guardamos tu progreso en este navegador: lo que no llegue al servidor se pierde al cerrar la pestaña.».
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

Un alumno abre «Tu cuenta», ingresa con su email y su contraseña, y más tarde sale. Desde A3, el ingreso es lo primero que ve quien no tiene sesión, y al entrar el taller sigue hacia lo que había pedido.

**Why this priority**: es la puerta de todo lo que protege la cuenta, y A3 la espera.

**Independent Test**: con la API simulada, ingresar con credenciales buenas y malas, agotar el límite y salir; repetir la etapa en modo obligatorio en las specs.

**Acceptance Scenarios**:

1. **Dado** el modo abierto, **cuando** el alumno abre «Tu cuenta» sin sesión, **entonces** se pide `GET /api/session`, y con `user: null` se ve el ingreso.
2. **Dadas** credenciales válidas, **cuando** ingresa, **entonces** sale `POST /api/auth/login` con `X-XSRF-TOKEN` y sin `X-Taller-User`, y con 200 «Tu cuenta» muestra su nombre y su email.
3. **Dados** un email que no existe y la contraseña equivocada de uno que sí existe, **cuando** el servidor responde 422 `auth_failed` a los dos, **entonces** los dos casos muestran el mismo texto, y ningún campo queda marcado solo.
4. **Dado** un 429 con `Retry-After: 120`, **cuando** llega, **entonces** se ve el mensaje del servidor, seguido de «Podés volver a intentar en 2 minutos.», y el botón no se habilita antes de ese plazo.
5. **Dado** el modo obligatorio con `user: null` y la URL `?ejercicio=rust-02&paso=code#laboratorio`, **cuando** el alumno ingresa, **entonces** el arranque vuelve a la etapa de sesión, que ahora trae la cuenta, y la compuerta del contenido corre una sola vez, sin recargar, con la URL que pidió.
6. **Dado** el modo obligatorio, **cuando** la etapa de sesión de A3 informa que el servidor no respondió, **entonces** la etapa de acceso no dibuja nada, y el arranque sigue lo que decida A3: su vista de error o la última copia.
7. **Dado** un alumno con sesión, **cuando** usa «Salir», **entonces** sale `POST /api/auth/logout` con `X-Taller-User`, y con 204 el documento se recarga y el progreso del navegador queda como estaba.

*Cubre: FR-003, FR-004, FR-006 a FR-009, FR-012, FR-013, FR-015 a FR-023, FR-032 a FR-036 y FR-049 a FR-052; SC-002, SC-003 y SC-006.*

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

1. **Dada** una sesión con `privacyAccepted: false`, **cuando** el arranque en modo obligatorio la recibe, **entonces** se ve el aviso vigente con «Acepto» y «Salir». Con «Acepto» sale `POST /api/me/privacy` con la versión, y con 204 el arranque sigue.
2. **Dado** un servidor con otra versión vigente, **cuando** responde 422 en `errors.privacyVersion`, **entonces** el error general pide recargar, y el front no reintenta con otra versión.
3. **Dado** el alta, **cuando** el alumno abre «Leer el aviso», **entonces** lee el texto entero sin perder lo que escribió, y la casilla de aceptación sigue desmarcada hasta que la marca.

*Cubre: FR-041, FR-045 a FR-048 y FR-050.*

---

### User Story 5 - El taller de siempre hasta A3 (Priority: P1) · F11a

Quien no tiene cuenta, o no la usa, abre el taller y lo encuentra igual que hoy. Lo único nuevo es el botón «Tu cuenta». Ni la vista previa sin API ni la red de pruebas notan el cambio.

**Why this priority**: es la condición para integrar F11a antes que A3 sin romper nada, y lo que deja a A3 un interruptor en lugar de una reescritura.

**Independent Test**: construir el taller con F11a y correr los 123 E2E sin editarlos; contar los pedidos a `/api/` al arrancar.

**Acceptance Scenarios**:

1. **Dado** el build con F11a en modo abierto, **cuando** corren los 123 E2E de F1 y A2, **entonces** pasan sin editar ningún escenario, y el arranque sin token hace 0 pedidos a `/api/`.
2. **Dado** el modo obligatorio en las specs de la etapa de acceso, con la etapa de sesión simulada, **cuando** esta entrega `user: null`, **entonces** la etapa de acceso no resuelve, la compuerta no corre y el shell queda inerte.
3. **Dado** «Tu cuenta» abierto, **cuando** el alumno aprieta Esc, **entonces** el diálogo se cierra, el foco vuelve a «Tu cuenta» y la vista del shell sigue donde estaba.

*Cubre: FR-001, FR-003, FR-004, FR-006, FR-008, FR-010 a FR-014 y FR-076; SC-002 y SC-003.*

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

En un aula, un alumno marca «Estoy en una computadora compartida» y nada de su progreso queda en el navegador. En su propia computadora, la primera vez que ingresa le preguntan si el progreso guardado sin cuenta es suyo, y sólo con un sí se suma a su cuenta.

**Why this priority**: es lo que D1 necesita para no mezclar cuentas, pero espera a D1c, que entra en servicio después de A4.

**Independent Test**: con el cliente de D1c simulado en su interfaz, ingresar en modo compartido y con progreso v1 sembrado de las fixtures congeladas.

**Acceptance Scenarios**:

1. **Dado** el ingreso, **cuando** el alumno marca «Estoy en una computadora compartida», **entonces** «Recordarme» queda desmarcada y deshabilitada, y la elección llega al cliente de D1c.
2. **Dado** un navegador con las claves v1 de `qa/fixtures/progress-master-2a278ad-storage.json` sin importar, **cuando** el alumno ingresa, **entonces**, antes de que el cliente escriba nada, ve el resumen con los ejercicios resueltos y la fecha del último resultado, y la pregunta «¿Este progreso es tuyo?».
3. **Dado** un sí, **cuando** el servidor responde 409 `import_needs_confirmation`, **entonces** se vuelve a preguntar sin decir el motivo, y con otro sí se reenvía con la confirmación.

*Cubre: FR-062 a FR-065.*

Los transversales (FR-066 a FR-077) valen para todas las historias. Sus criterios son SC-004, SC-005, SC-007, SC-008 y SC-011.

---

### Edge Cases

- **Recargar después de abrir un enlace con token:** el fragmento ya no está en la URL, así que la etapa de los tokens no ve ninguno. En el modo abierto, el taller arranca como siempre; en el obligatorio, aparece el ingreso. El texto del alta lo advierte.
- **Un enlace con token mal formado** (sin `=`, con un email que no se puede decodificar o con fragmentos de más): se borra igual de la URL. La invitación se consulta, y el servidor responde 404 sin mirar la base. Un restablecimiento sin email muestra que el enlace no sirve.
- **Un enlace con token cuando ya hay sesión** (propuesta; el flujo de A3 sigue al contenido cuando hay sesión, ver «Relación con otros ítems»): la invitación se muestra igual. Si el email de la invitación es de otra cuenta, el alta crea esa cuenta y la sesión pasa a ser la nueva (C3a regenera el ID). El restablecimiento no abre sesión ni toca la actual.
- **Dos pestañas, dos cuentas:** la pestaña vieja recibe 409 `account_mismatch` en su próxima modificación y ofrece «Recargar». Un 419 se reintenta una sola vez, y sólo si `GET /api/session` sigue dando la misma cuenta.
- **La sesión vence con «Tu cuenta» abierto** (30 minutos de inactividad u 8 horas): el próximo pedido recibe 401, o 419 si el token CSRF también cambió, y en los dos casos se pide el ingreso sin cerrar el diálogo. Si entra otra cuenta, se recarga.
- **Una cuenta deshabilitada con la sesión viva:** la próxima ruta con sesión responde 403 `account_disabled`, y se muestra el mensaje del servidor. `GET /api/session` responde `user: null` y no 403 (FR-034 de C3a).
- **Una cuenta borrada desde otro dispositivo o por un admin:** la próxima ruta con sesión responde 401, y se ve el ingreso, que falla como una credencial inválida.
- **Nginx responde sin JSON:** un 413, un 502 con la API caída (como en la vista previa) o un 504. Se ve el mensaje común de respuesta inesperada, y lo escrito se conserva.
- **El servidor tarda en el ingreso:** el piso de 200 ms de C3a hace que el estado «Ingresando…» se vea siempre, y el botón no admite un segundo envío.
- **Una contraseña con emojis o con tildes descompuestas:** el cliente cuenta como el servidor, con puntos de código después de normalizar a NFC. El límite de 72 bytes lo informa el servidor.
- **Un admin que marca «Recordarme»:** el servidor no le da recuerdo, y la pantalla no lo distingue.
- **El almacenamiento bloqueado:** F11a no guarda nada en el navegador, así que funciona igual. Con D1c, el ingreso avisa que el taller va en modo compartido.
- **«Exportar mi progreso» y «Descargar mis datos»:** son archivos distintos. El primero (v1) lo importa Método; el segundo (`taller-export-2`) no. Las dos pantallas lo dicen.
- **La descarga se corta a la mitad:** no se guarda un archivo parcial, y el pedido ya contó para el límite de 3 por día.

## Requirements *(mandatory)*

### Functional Requirements

**Etapas del arranque y raíz de la cuenta (F11a)**

- **FR-001**: El arranque DEBE sumar dos etapas de F11: la de los tokens, primera de todas, y la de acceso, justo antes de la compuerta del contenido de A2 (desde A3, después de la etapa de sesión de A3). Las dos entran en la llamada a `runBoot` de `frontend/src/app/main.tsx` y en la tabla de etapas de `qa/load-order-check.ts`, sin tocar la compuerta. *(A2 FR-013; A3 FR-003)*
- **FR-002**: Antes de que corra cualquier otra etapa, y sin pedir nada a la red, la etapa de los tokens DEBE leer de la URL los fragmentos `#invitacion=<token>` y `#restablecer=<token>&email=<email>` (con el email decodificado), guardarlos sólo en memoria, borrarlos con `history.replaceState` sin tocar la ruta ni la query, y dejarle dicho al arranque, en memoria, que había un token. Así, ni la etapa de sesión ni `app.js` los ven, el historial no los guarda y A3 sabe que no debe usar la copia. *(C3a FR-021; A3 FR-024)*
- **FR-003**: La etapa de acceso DEBE tener dos modos: abierto, el de F11a hasta A3, sin etapa de sesión en el arranque, y obligatorio, el que A3 enciende cuando suma su etapa de sesión. F11a entrega los dos con sus pruebas y deja el abierto en `main.tsx`. **[NEEDS CLARIFICATION: Q1, si la sesión es obligatoria antes de A3]**
- **FR-004**: En el modo abierto y sin un fragmento con token, la etapa de acceso NO DEBE pedir nada a la red ni mostrar el acceso al arrancar: el arranque sigue como hoy, y lo único nuevo es la entrada «Tu cuenta».
- **FR-005**: En el modo abierto y con un fragmento con token, la etapa de acceso DEBE mostrar el alta o el restablecimiento antes de que se evalúen las vistas, y resolver cuando el alumno termina o elige «Seguir sin ingresar».
- **FR-006**: En el modo obligatorio, la etapa de acceso DEBE decidir con el `user` que entrega la etapa de sesión de A3: con `user: null`, DEBE mostrar sólo el acceso (el ingreso, o el alta o el restablecimiento si hay token), sin que corra la compuerta ni se evalúe una fuente legacy. *(A3 FR-002 y FR-003; C3a FR-034)*
- **FR-007**: En el modo obligatorio, después de un ingreso o de un alta, la etapa de acceso DEBE devolver el arranque a la etapa de sesión de A3, que vuelve a preguntar. Con sesión, resuelve sin recargar el documento y con la URL que pidió el alumno, ya sin el token. *(A3 FR-002)*
- **FR-008**: El estado de la sesión de F11 DEBE tomar `user` y `features` de lo que entrega la etapa de sesión de A3, sin volver a pedir `GET /api/session`. Antes de A3, el cliente lo pide sólo al abrir «Tu cuenta» o antes del primer pedido que modifica. *(A3 FR-003)*
- **FR-009**: Si la etapa de sesión informa que el servidor no respondió, la etapa de acceso NO DEBE dibujar nada: resuelve, y A3 decide entre la última copia y su vista de error. *(A3 FR-023, FR-024 y FR-027)*
- **FR-010**: La raíz de la cuenta DEBE dibujar en elementos propios y NO DEBE dejar una raíz viva en un contenedor que dibuja otro: la compuerta y las vistas escriben `#main`. El acceso y el diálogo van fuera de `#main` y de `.app-shell`; la entrada, en su propio elemento, donde fije Q3.
- **FR-011**: Mientras el acceso se muestra antes de las vistas, el shell estático DEBE quedar inerte: la navegación y el selector de lenguaje no responden ni se anuncian, y hay un solo `main` visible.
- **FR-012**: La entrada a la cuenta DEBE estar en el lugar que fije Q3, visible en todos los anchos y fuera de `.navigation`, y abrir «Tu cuenta» como un diálogo modal sin cambiar la URL ni la vista. **[NEEDS CLARIFICATION: Q3, dónde vive la entrada a «Tu cuenta»]**
- **FR-013**: Cerrar «Tu cuenta», con su botón o con Esc, DEBE devolver el foco a la entrada y dejar el shell como estaba, sin recargar.
- **FR-014**: F11a DEBE dejar en `qa/e2e/` las respuestas simuladas de la API de cuentas (la sesión con y sin cuenta, el ingreso, el alta y el restablecimiento), para que la API simulada automática que agrega A3 (su FR-038) las reutilice sin duplicarlas.

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
- **FR-036**: En el modo abierto, el ingreso que aparece al arrancar DEBE ofrecer «Seguir sin ingresar».

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

- **FR-045**: El texto del aviso y su versión DEBEN salir de la fuente que fije Q2, y la versión que manda el front DEBE ser la vigente en el servidor. *(C3a FR-022)* **[NEEDS CLARIFICATION: Q2, de dónde salen el texto del aviso y su versión]**
- **FR-046**: Con sesión y `privacyAccepted: false`, antes de seguir al taller o de abrir «Tu cuenta», DEBE mostrar el aviso vigente y pedir que se acepte (`POST /api/me/privacy {privacyVersion}`) o que se salga. *(C3a, Assumptions: el front pide la aceptación)*
- **FR-047**: Ante un 422 por la versión del aviso, DEBE decir que el aviso cambió y pedir que se recargue, sin reintentar con otra versión.
- **FR-048**: El aviso DEBE poder leerse desde el ingreso y desde «Tu cuenta».

**Tu cuenta y salir (F11a)**

- **FR-049**: «Tu cuenta» DEBE mostrar el nombre y el email de la cuenta, el aviso de privacidad y «Salir». Sin sesión, en el modo abierto, muestra el ingreso.
- **FR-050**: «Salir» DEBE llamar a `POST /api/auth/logout` y, con un 204 (o un 401, porque ya no había sesión), dejar el navegador sin nada de la sesión: recarga el documento para que el taller arranque de cero y, si A3 adopta la opción B de su Q2, antes borra la última copia del contenido. *(C3a FR-016; A3 FR-021)*
- **FR-051**: Si `POST /api/auth/logout` falla por la red o con un 5xx, DEBE decir que no pudo cerrar la sesión y ofrecer reintentar, sin recargar.
- **FR-052**: Antes de D1c, salir NO DEBE tocar el progreso guardado en el navegador, y «Tu cuenta» DEBE decirlo junto a «Salir». *(ADR 0003)* **[NEEDS CLARIFICATION: Q4, qué hace «Salir» con el progreso del navegador antes de D1c]**

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

- **FR-062**: El ingreso DEBE ofrecer «Estoy en una computadora compartida» donde fije Q5, como opción excluyente con «Recordarme», con el aviso de lo que se pierde si se cierra la pestaña sin sincronizar, y pasar la elección al cliente de D1c. *(D1 FR-070 y FR-071)* **[NEEDS CLARIFICATION: Q5, dónde vive la opción «computadora compartida»]**
- **FR-063**: Si el navegador no deja escribir en su almacenamiento, el ingreso DEBE avisar que el taller funciona en modo compartido. *(D1 FR-070)*
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
- **FR-076**: Los 123 E2E de F1 y A2, `boot-check` y `load-order-check` DEBEN seguir en verde sin editar sus escenarios; de `load-order-check` sólo cambia su tabla de etapas. F11 NO DEBE dejar regiones `alert` ni `status` en el documento mientras no muestra nada, porque la red ubica el error de la compuerta con `getByRole('alert')`.
- **FR-077**: Cada parte DEBE cerrar con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde, y actualizar `docs/architecture.md` y `qa/AGENTS.md` con lo que agrega.

### Key Entities *(include if feature involves data)*

- **Estado de la sesión:** lo que el navegador sabe de la sesión mientras el documento vive. Puede ser desconocido (modo abierto, antes de preguntar), sin cuenta o con cuenta. Guarda la cuenta publicada y `features`, que desde A3 toma de la etapa de sesión. Vive en memoria, en un store de Zustand, y nunca en el almacenamiento.
- **Cuenta publicada:** `{id, name, email, role, privacyAccepted}`, los cinco campos que publica C3a (FR-035 de C3a). El `id` alimenta `X-Taller-User`.
- **Fragmento con token:** la invitación (un token de 43 caracteres en base64url) o el restablecimiento (un token y un email). Vive sólo en memoria desde que la etapa de los tokens lo lee y lo borra de la URL, y el arranque sabe que hubo uno, para que A3 no use la copia (su FR-024).
- **Error de la API:** `{message, code}`; un 422 suma `errors.<campo>` (una lista de mensajes por campo), y un 429 o un 503 suman `Retry-After`. Una respuesta que no es JSON, o una falla de red, es otro caso.
- **Aviso de privacidad:** un texto y su versión (Q2). La cuenta aceptó la vigente o no (`privacyAccepted`).
- **Modo de la etapa de acceso:** abierto, sin etapa de sesión en el arranque (hasta A3), u obligatorio, después de la etapa de sesión de A3 (Q1).
- **Entrada «Tu cuenta» y su diálogo:** el único punto de F11 dentro del shell legacy (Q3).
- **Elección de computadora compartida** (F11d): se pasa al cliente de D1c y no se guarda en el navegador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (F11a): Al abrir un enlace con `#invitacion=` y otro con `#restablecer=`, la URL que lee `app.js` y el historial tienen 0 tokens en los 2 casos, y al terminar el alta la sesión está abierta sin recargar el documento.
- **SC-002** (F11a, modo abierto): Con el build de F11a, los 123 E2E de F1 y A2 pasan sin editar ningún escenario, y el arranque sin token hace 0 pedidos a `/api/`.
- **SC-003** (F11a, modo obligatorio, en las specs de la etapa de acceso con la etapa de sesión simulada; los E2E llegan con A3): con `user: null`, se evalúan 0 fuentes legacy y se hacen 0 pedidos de contenido; después del ingreso, el arranque vuelve una vez a la etapa de sesión, y la compuerta corre una sola vez, sin recargar, con la URL pedida.
- **SC-004** (todas): Cada fila de «Pantallas, endpoints y estados» tiene al menos una prueba, de Vitest o E2E, por cada estado que no esté en blanco, con un cuerpo tomado del contrato, y el 100 % de esos estados muestra un mensaje visible que dice qué hacer.
- **SC-005** (todas): Después de recorrer todas las pantallas en un E2E, hay 0 contraseñas y 0 tokens en `localStorage`, `sessionStorage`, `document.cookie`, la URL, el historial y la consola.
- **SC-006** (F11a): Un email inexistente y una contraseña equivocada muestran el mismo texto visible (0 diferencias), y lo mismo pasa con un token inválido, uno vencido y un email sin cuenta en el restablecimiento.
- **SC-007** (todas): Cada pantalla se completa sólo con el teclado. Cerrar «Tu cuenta» devuelve el foco a su entrada. A 320 y a 390 px no hay desplazamiento horizontal, y con movimiento reducido hay 0 transiciones (E2E).
- **SC-008** (todas): `dist/index.html` queda por debajo de 1 250 000 caracteres (el límite de `build-check`), y el PR informa cuánto creció, separando la librería de formularios del código propio.
- **SC-009** (F11b): El archivo descargado tiene el nombre que mandó el servidor y los mismos bytes, y en el almacenamiento quedan 0 copias. Después de borrar la cuenta, el documento se recarga y las cuatro claves v1 siguen intactas.
- **SC-010** (F11c y F11d): Con `features.passwordReset: false` no aparece ningún «¿Te olvidaste la contraseña?», y con `true`, un email que existe y uno que no muestran el mismo texto. En modo compartido, al cerrar la pestaña quedan 0 claves de progreso (SC-004 de D1), y la pregunta no escribe nada antes del sí.
- **SC-011** (todas): Cada parte cierra con `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e` y `git diff --check` en verde, y su código suma 0 sitios de estilo en línea (`style=`, `style={…}`, `setAttribute('style', …)` o `.cssText`).

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
- **A3 es un borrador** (spec 016, PR #49). Esta spec adopta su interfaz con la etapa de sesión (sus FR-002, FR-003, FR-021 y FR-024). Si cambia en su clarify, las dos specs se concilian.
- **D1c no tiene plan.** Lo que F11d toma de D1 son las superficies 1 y 2, el estado y las acciones que expone el cliente (FR-077 de D1). El detalle se precisa con D1c.
- **El ADR 0006 sigue en propuesta.** Lo que F11 toma de él llega a través de las specs de C3a, C3b y D1.

**Los textos y los archivos**

- **El texto del aviso de privacidad lo escribe el usuario** (§13.14 del ADR 0006). Esta spec no lo redacta. Hasta tenerlo, el uso local puede llevar uno provisional con la versión `2026-10-dev`, si el usuario lo acepta (ver «Acciones del usuario»).
- **La descarga de la cuenta no se importa en Método:** su formato es `taller-export-2` (contrato de C3b), distinto de la copia v1 que importa Método.

**El estado y la API**

- **El estado de la sesión es compartido:** lo usan F11, A3, D1c, A4 y F12. Es el primer caso real de estado de cliente compartido entre funcionalidades después de los almacenes de F2a, así que va en Zustand, que ya está instalado (`AGENTS.md`).
- **El cliente de la API es de todo el front:** vive en `shared/api` y lo usan después A3, D1c, A4 y F12. La sesión vive en `entities/session`, y las pantallas, en `pages/`. Los nombres los confirma el plan.
- **«Pedir el ingreso» es parte de la API pública del slice,** porque F11 la usa en sus propias pantallas ante un 401; D1c y A4 la toman cuando lleguen. En el arranque, A3 no la llama: ante un 401 vuelve a la etapa de sesión, y con `user: null` sigue la de acceso (su FR-012).
- **El servidor de desarrollo no tiene `/api` hasta A3:** `npm run dev` y `vite preview` no lo pasan. Hasta que A3 sume el proxy de `/api` a `npm run dev` (su FR-032), las pruebas a mano contra la API usan el build que sirve Nginx (`docker compose up`).

**Las cuentas y los límites**

- **Un admin es una cuenta más:** ingresa y estudia (Q3 de C3a). Sus pantallas son de F12.
- **Los límites de C3a pueden ver una sola IP hasta C4.** Un aula detrás de un NAT comparte los límites por red, y la pantalla muestra el `Retry-After` que llega, sin calcular nada por su cuenta.

## Alternativas consideradas

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Librería de formularios | React Hook Form 7.89.0; TanStack Form 1.33.5; estado propio | **React Hook Form** (pedido del usuario). Según bundlephobia (consultado el 2026-10-07; es una estimación de un tercero sobre el paquete entero, sin tree-shaking), pesa 43 085 bytes minificado y no tiene dependencias, contra 72 485 y dos dependencias de TanStack Form. `html.length` cuenta caracteres, así que lo que importa es el minificado y no el gzip (14 775 contra 17 856). El estado propio lo descartó el usuario |
| Servidor falso para Vitest | `fetch` inyectado en el cliente, con respuestas de fishery; MSW 3.0.2 (3 347 702 bytes desempaquetados, con más de diez dependencias directas) | **`fetch` inyectado.** El ADR 0008 no adopta MSW y lo reevalúa cuando el front sume pedidos a `/api`, y F11 es el primero que lo hace. El front ya recibe sus fuentes por inyección (la compuerta de A2 recibe su fuente de contenido), y un `fetch` falso alcanza para probar los encabezados, los errores y lo que no es JSON. Costo: el cliente real se prueba contra ese doble y no contra la capa de red del navegador; esa parte la cubren los E2E |
| E2E | Rutas simuladas de Playwright (`page.route`) contra `vite preview`; un proyecto contra el stack de Docker | **Rutas simuladas,** como manda el ADR 0008 («sin Nginx y sin API»): corren en el job `front` de la CI y no necesitan cuentas reales. Costo: la cookie HttpOnly, `SameSite` y el CSRF reales (FR-050 de C3a) no se ejercen. Esa verificación sigue a mano contra el stack, declarada en el PR como hizo C3a; un humo automático contra el stack espera a A3 y C4 (ADR 0008) |
| La etapa antes de A3 | Sin red al arrancar y con la sesión al abrir «Tu cuenta»; pedir `GET /api/session` en cada arranque | **Sin red al arrancar** (Q1). Pedirla siempre rompe los 123 E2E (en `vite preview` el pedido no llega a ninguna API) y la vista previa sin API, antes de que la sesión proteja algo |
| De quién es la etapa de sesión | La de A3, con la de los tokens y la de acceso de F11 a su alrededor (lo que propone A3, PR #49); una sola etapa de sesión y acceso, de F11, que A3 lee | **La de A3,** como propone su spec: el protocolo del arranque (`GET /api/session` en cada intento, en cada ronda y después de un 401) es de A3, y F11 sólo necesita `user` y `features`. Así hay un solo dueño del `GET /api/session` del arranque. Costo: F11 suma dos etapas en lugar de una y, antes de A3, pide la sesión por su cuenta cuando la necesita |
| Dónde vive la cuenta | Un diálogo con su propia raíz; una vista `#cuenta`; dentro de Método | **Un diálogo** (Q3). `#cuenta` rompe el contrato de las ocho vistas y el `viewFromHash` de F2b. Método es legacy hasta F8, y meter ahí la cuenta toca `app.js` |
| Salir y cambiar de cuenta | Recargar el documento; desmontar el shell | **Recargar.** `app.js` no se desmonta: registra oyentes y un `setInterval` de 500 ms sin limpieza (mapa, §1). La recarga además asegura que no quede nada de la sesión anterior |
| Validación de contraseñas en el cliente | Sólo lo obligatorio, el largo y la confirmación; un esquema propio con la política | **Lo mínimo** (hoja de ruta). Un esquema duplicaría la lista de bloqueadas y las reglas del nombre y del email, y se desfasaría |
| Confirmar la contraseña antes de exportar o borrar | Pedirla siempre; consultar antes `confirmed-password-status` y pedirla sólo si hace falta | **Pedirla siempre.** Es un paso menos y, para borrar la cuenta, más seguro; el 423 sigue cubierto si la confirmación vence entre los dos pedidos |

## Riesgos

1. **F11a es grande y está en el camino crítico de A3:** 64 requisitos con los transversales. *Mitigación:* el plan la reparte en unidades con su prueba y su punto de reversión, y F11b, F11c y F11d no la demoran.
2. **El peso.** Después de F2a y A2, `dist/index.html` mide 1 136 702 caracteres (T020 de F2b) y el límite de `build-check` es de 1 250 000: quedan unos 113 KB, y F2b puede sumar hasta 8 000 caracteres. React Hook Form solo pesaría unos 43 KB, más de un tercio de ese margen, antes del código de F11. *Mitigación:* FR-073 lo mide en el PR. Si no entra, decide el usuario: subir el límite (que existe para que el currículo no vuelva al HTML) o achicar. C4 retira el HTML autónomo más adelante.
3. **El aviso de privacidad desfasado** bloquea todas las altas (Q2). *Mitigación:* la opción que elija Q2 y el paso de despliegue documentado.
4. **La entrada en la barra superior cambia el aspecto del shell** y puede mover medidas que fija la red (Q3). *Mitigación:* va después de la barra lateral en el documento (la regla R4 sigue midiendo el mismo botón), fuera de `.navigation` (R8), y se corre la red completa antes de integrar.
5. **Dos raíces de React hasta F10.** *Mitigación:* la de la cuenta tiene su propio elemento y nunca vive en `#main`, que pisan la compuerta y las vistas (FR-010).
6. **`boot-check` arma un DOM falso y lee `main.tsx`.** Una etapa que dibuja al arrancar podría no funcionar ahí. *Mitigación:* en el modo abierto la etapa de los tokens no pide nada y la de acceso no muestra pantallas ni pide nada (FR-002 y FR-004), y el plan comprueba que la entrada «Tu cuenta» se dibuje sin romper `boot-check`.
7. **jsdom no implementa `showModal`** (ADR 0008). *Mitigación:* el diálogo «Tu cuenta», su foco y Esc se prueban en E2E, y las specs de componente reciben un stub mínimo sólo si lo necesitan.
8. **La pila de DOM de Vitest no está instalada.** Si F11a llega antes que F3, trae ella `jsdom`, Testing Library y fishery, con permiso (ver «Acciones del usuario»).
9. **Sin la prueba de navegador real contra el stack,** la cookie, `SameSite` y el CSRF reales quedan sin probar en la CI. *Mitigación:* la verificación a mano declarada en el PR, como en C3a.
10. **Los contratos de C3c y D1c pueden cambiar en sus planes.** *Mitigación:* F11c y F11d se planifican con ellos, no antes.
11. **Antes de A3, ingresar no cambia lo que se ve,** y alguien puede pensar que la cuenta guarda su progreso. *Mitigación:* la nota de «Tu cuenta» (Q4) y el aviso de privacidad.
12. **La computadora compartida antes de D1c:** quien ingresa después ve el progreso del anterior, como hoy (Q4). *Mitigación:* decirlo, y D1c con F11d.
13. **La interfaz con A3 se acordó entre dos borradores** (su PR #49 y esta spec). *Mitigación:* las diferencias quedan en «Relación con otros ítems» para que el coordinador las concilie antes de los planes.

## Relación con otros ítems

**A2** (spec 006, PR #40):

- F11a agrega una etapa a `runBoot` y a la tabla de `load-order-check`, sin tocar la compuerta ni su vista.
- La spec y el plan de A2 nombran «la sesión de A3» y «el acceso de F11» como dos etapas previas. Con la interfaz de A3 son tres: la de los tokens (F11), la de sesión (A3) y la de acceso (F11).

**A3** (spec 016, PR #49, borrador):

- Esta spec adopta la interfaz que propone A3:
  - la etapa de sesión es de A3 y entrega `user`, `features` y `contentVersion`, o que el servidor no respondió;
  - F11 borra los tokens antes de esa etapa y avisa que los había (FR-002);
  - F11 dibuja el acceso con `user: null` y, después del ingreso, devuelve el arranque a la etapa de sesión (FR-006 y FR-007);
  - la salida es de F11 (FR-050).
- A3 enciende el modo obligatorio al sumar su etapa, y su API simulada automática de los E2E reutiliza las respuestas de cuentas de F11a (FR-014).
- Sin backend, la etapa de acceso no dibuja nada (FR-009): la copia o la vista de error son de A3.
- A3 espera a F11a, no a toda F11: es la opción A de su Q1.
- **Diferencias que quedan, para que las concilie el coordinador:**
  1. A3 pone el aviso de privacidad en «la cuenta» (su Q1). Acá va en F11a, porque el alta no se puede enviar sin aceptarlo. F11a trae además «Salir» y la entrada «Tu cuenta», que el acceso de A3 no nombra.
  2. Con un token y una sesión viva, el flujo de A3 sigue al contenido. Esta spec propone que la etapa de acceso igual muestre el alta o el restablecimiento (ver «Edge Cases»).
  3. La reaceptación del aviso (FR-046) pasa por la etapa de acceso aun con sesión, entre la etapa de sesión y la compuerta. A3 no la menciona.
  4. Que la salida borre la copia depende de la Q2 de A3: FR-050 lo cumple si se elige la opción B.

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
| Ahora | Responder Q1 a Q5 y aceptar o cambiar la partición. Confirmar la ubicación de las pantallas de cuenta como una raíz previa al shell (la hoja de ruta la tiene como propuesta). |
| Antes de integrar F11a | El texto del aviso de privacidad y su versión (§13.14), o aceptar uno provisional para el uso local. |
| F11a, primer formulario | Permiso para `react-hook-form` 7.89.0, de npm: MIT, sin dependencias, 1 527 796 bytes desempaquetados según el registro (consultado el 2026-10-07). |
| F11a, si llega antes que F3 | Permiso para la pila de DOM: `jsdom` 30.1.2 y Testing Library (56 paquetes, unos 26,3 MB). También, para `fishery` 2.4.0 (2 paquetes, unos 0,19 MB). Las medidas son del ADR 0008. |
| Al desplegar F11a (si Q2 es A) | Poner en `PRIVACY_VERSION` la versión del aviso que trae el front. |
| Antes de F11c | El dominio de C3c y C4. |

## Descargas previstas

- **F11a:** `react-hook-form` 7.89.0 y, si F3 no los trajo antes, `jsdom`, Testing Library y `fishery`.
- **F11b, F11c y F11d:** nada nuevo.
- **Nada más:** ni MSW, ni nuqs, ni un router.
