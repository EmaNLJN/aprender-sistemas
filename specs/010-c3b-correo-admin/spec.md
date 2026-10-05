# Feature Specification: C3b · Correo, invitaciones y administración

**Feature Branch**: `010-c3b-correo-admin` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Borrador con preguntas abiertas (Q1 a Q5); falta el clarify

**Input**: Ítem **C3b** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Correo, invitaciones y administración»: lo que C3 deja para después de C3a ([spec 004](../004-c3-identidad-acceso/spec.md)). Fuente técnica: ADR 0006 (propuesta) §4.1, §4.3 a §4.5, §4.8 y §4.10, §5.2 (`account_deletions`), §5.5 (`mail_jobs`), §7, §8, D06, D18 a D21, D33, D34 y D37, y sus preguntas 3, 9 y 20 de §13 ([ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md)). Parte de lo que C3a dejó listo (ver «Relación con C3a, B2, D1, C4 y el front»). Lo que dicen los borradores de C3a (su plan), B2, D1, C4 y del épico del front, que no pasaron por el clarify, entra como supuesto. Donde esta spec se aparta del ADR, lo dice en Assumptions.

## Intención y alcance

**Lo que entendemos.** C3a le dio identidad al taller: cuentas, sesión, ingreso, alta con un link que imprime la consola y recuperación por consola. Alcanza para que A3, B2 y D1 avancen, pero no para operar el taller con gente real. Nadie puede avisarle a un alumno por correo, quien olvida su contraseña depende de quien tiene la consola, deshabilitar o promover una cuenta exige `tinker`, y una persona no puede llevarse sus datos ni pedir que se borren. C3b cierra eso. El correo sale de un único contenedor aislado, con su cola y sus reintentos. Las invitaciones se crean desde la API, por correo o por link. Quien olvida su contraseña la recupera por email. Quienes administran gestionan usuarios e invitaciones sin poder dejar al taller sin admin. Una persona exporta sus datos y borra su cuenta, y esa supresión se lleva también los intentos, las ejecuciones y las importaciones, que el «Borrar todo» de D1 deja. El email se cambia por consola, y el registro abierto existe, apagado, con su verificación. Es para el alumno, para quien administra, para quien opera el taller y para lo que espera a C3b: C4 (no se expone el taller sin poder administrar y suprimir cuentas), el front (las pantallas de cuenta de F11 y las de administración de F12) y B2 y D1, cuyas tablas entran en la exportación y la supresión. No trae pantallas: el entregable es el contrato HTTP, los comandos, el servicio de correo y su comportamiento ante cada fallo. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Con un proveedor configurado, cada uno de los ocho correos llega con su texto en español y un link que abre desde afuera. Si el proveedor falla, el taller sigue entero: se reintenta, se ve cuando se agota, y el admin puede reemplazar el correo por un link.
2. Quien olvida su contraseña la recupera por correo, y desde afuera una cuenta que existe y una que no son indistinguibles: la misma respuesta y el mismo trabajo en el pedido.
3. Un admin crea, renueva y revoca invitaciones, y deshabilita, promueve o suprime cuentas, por HTTP y con la contraseña reconfirmada. En ningún camino queda el taller sin un admin activo, tampoco con dos pedidos a la vez.
4. Una persona descarga sus datos y borra su cuenta. Después ninguna tabla guarda una fila suya, y una restauración del respaldo no la resucita.
5. El contenedor del correo es el único de la aplicación con salida a Internet y con las credenciales del proveedor (el Nginx tiene su propia red, sin `APP_KEY` ni base), y su usuario de MySQL no puede leer cuentas ni tocar nada fuera de su cola. Una prueba lo demuestra.
6. Sin proveedor (el modo sólo link de C3a), nada se rompe: el front lo sabe por `GET /api/session` y los links siguen saliendo por consola o por la respuesta del admin.
7. Con el registro apagado, que es como se entrega, el taller se comporta como con C3a.

**Entra:**

- **El correo:** `worker-mail` aislado, con su red y su usuario de MySQL; la cola `mail` (`mail_jobs`); reintentos; ocho tipos de mensaje; el modo sólo link como respaldo; y Mailpit en el perfil `dev`.
- **Recuperación y verificación:** `POST /api/auth/forgot-password`, el aviso por correo al cambiar una contraseña y la verificación de email (`email/verification-notification` y `email/verify`).
- **Registro abierto:** `POST /api/auth/register` detrás de `REGISTRATION_OPEN=false`, con sus límites, su restricción por dominio (Q3) y la poda de las cuentas nunca verificadas.
- **Administración:** `/api/admin` con sus nueve endpoints de usuarios e invitaciones, la guardia del último admin, `password.confirm` en cada acción sensible y las matrices de acceso y de «sin textos del alumno».
- **Ciclo de vida de la cuenta:** `POST /api/me/export`, `DELETE /api/me`, `UserData`, `PurgeUserData`, `account_deletions` y `taller:reapply-deletions`, sobre las tablas de C3a, B2 y D1.
- **Cambio de email:** `taller:change-email`.
- **Operación:** que el `scheduler` procese la cola `default`, el usuario de MySQL del correo con `db-grants`, los secretos nuevos y los checks contra el stack.

**Queda fuera, y no es de C3b:** lo que entrega C3a (sesión, ingreso, alta por invitación con link de consola, recuperación por consola, contenido tras la sesión y `GET /api/session`); 2FA, login social, passkeys, JWT y Sanctum; TLS, el dominio y la IP real del cliente (C4); las pantallas (F11 y F12, del épico del front); y el progreso, las ejecuciones y las estadísticas (D1, B2 y C5).

**Sin hacer a propósito (YAGNI):**

- Plantillas HTML, imágenes y un idioma por usuario: los correos son de texto plano y en español.
- Rebotes, quejas y webhooks del proveedor: `sent_at` dice «entregado al proveedor», no «llegó al buzón».
- Reintentar a mano un correo fallido: el admin reemite la invitación (o la pasa a link) y la persona vuelve a pedir su recuperación.
- Un worker propio para la cola `default`: entra con el disparador de §9 del ADR.
- El cambio de email por autoservicio (salvo que Q2 lo pida) y que un admin cambie el email o el nombre de otra cuenta.
- El borrado automático de cuentas inactivas (§13.13) y un plazo de gracia para la supresión.
- Exportaciones de admin y exportar en formato v1 (D33 y D1).
- Una tabla de auditoría: las acciones de admin van en los registros (R5).
- Avisos al operador por correo (el aviso de C4, Q4 opción B): si C4 lo elige, lo suma sobre este canal.

**Actores:** el alumno (rol `student`); quien administra (rol `admin`); quien opera el taller y trabaja por consola; el proveedor de correo, un tercero que recibe el mensaje; y los ítems que se apoyan en C3b: el front (F11 y F12), C4, B2 y D1.

## Partición: lo que mide C3b y un corte posible

C3a se partió el 2026-10-05 por tamaño y dejó esta mitad como la grande. Los números salen de esta spec y de la de C3a, medidos el 2026-10-05; las cuentas de requisitos y de endpoints son un indicador de tamaño, no una medida de esfuerzo.

| Medida | C3a (spec 004) | C3b (esta spec) |
| --- | --- | --- |
| Endpoints nuevos | 12 | 15: `forgot-password`, `register`, `email/verification-notification`, `email/verify`, `POST /api/me/export`, `DELETE /api/me` y los nueve de `/api/admin` |
| Tablas que crea | 7 | 2: `mail_jobs` y `account_deletions` |
| Servicios nuevos de Compose | 2 | 1: `worker-mail`, más Mailpit en el perfil `dev` |
| Comandos y trabajos | 5 comandos y 4 tareas programadas | 2 comandos (`taller:change-email` y `taller:reapply-deletions`), el trabajo `PurgeUserData` y 5 tareas programadas |
| Paquetes de Composer nuevos | ninguno | ninguno por SMTP; entre 1 y 4 con un driver de API, según Packagist y sin resolver (Q1) |
| Requisitos funcionales | 52 | 55 |
| Historias de usuario | 7 | 8 |
| Preguntas abiertas | 5 | 5 |
| Lo que esperan | A3, B2 y D1 | C4, F12 y las pantallas de cuenta de F11 |

**Lo que se midió, por mitad.** Los requisitos están agrupados y rotulados por la mitad a la que pertenecerían si se corta. Mitad del correo: 33 requisitos (los cinco grupos rotulados «correo», más FR-051, FR-052 y el FR-055 compartido). Mitad de administración y ciclo de vida: 23 requisitos (FR-031 a FR-050, FR-053 y FR-054, más el FR-055 compartido). Sin el ciclo de vida: 46; el ciclo de vida solo: 10 (FR-042 a FR-049, FR-054 y el FR-055 compartido).

**Propuesta: partir el correo como C3c (opción B de Q4), sin aplicarla.** Tres requisitos más que C3a no alcanzan para cortar; lo justifican tres razones:

1. **Una decisión externa fuera del camino crítico.** El correo real espera la decisión del proveedor (Q1), un dominio con DNS que se pueda editar y un `APP_URL` público. Son acciones del usuario, y la del dominio es la de C4. La administración y el ciclo de vida no esperan nada de afuera y se prueban enteros con Pest y Compose.
2. **Lo que C4 necesita para abrir.** La hoja de ruta dice que no se expone el taller sin poder administrar y suprimir cuentas: eso es la mitad sin correo. El correo mejora la operación (recuperar alumnos, avisar), pero con el modo sólo link el taller se puede operar.
3. **Un foco de revisión por spec.** Una mitad concentra la autoridad del admin y los datos del alumno (la guardia del último admin, la supresión y su cobertura); la otra, el único contenedor de la aplicación con salida a Internet (egreso, credenciales y usuario de MySQL).

**Lo que cuesta partir:**

- Un ID nuevo en la hoja de ruta, `C3c` (los IDs no se reutilizan), y otro ciclo de Spec Kit.
- C4 depende de las dos mitades: `account_deletions` sale del ciclo de vida, y `worker-mail` y el usuario de MySQL del correo, de la otra. El corte no acorta el camino a C4: deja que lo que no espera una decisión externa llegue antes, y que el correo espere a su proveedor sin frenarlo.
- La administración sale con ganchos que no hacen nada sin correo. Invitar por correo y disparar la recuperación de un tercero responden 503 `mail_unavailable`, y los avisos no se envían hasta que llegue la otra mitad, que los enciende como C3b enciende los `features` de C3a.
- Archivos compartidos que tocan las dos mitades (`routes/api/`, `bootstrap/app.php`, `docker/compose.yaml`, `docker/mysql/db-grants.sql`, `init-env.sh`, `lang/es` y `backend/api/AGENTS.md`), que integra el coordinador.
- Si el usuario prefiere el otro corte (el ciclo de vida solo, opción C de Q4), cuesta una mitad de 46 requisitos que todavía lleva la decisión externa adentro, y gana que el ciclo de vida entre después de B2 y D1 sin necesitar el registro de `UserData` (FR-042).

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta (Preguntas abiertas). Las filas que citan el ADR 0006 valen como base mientras ese ADR siga en estado «propuesta».

| Pedido | Fuente |
| --- | --- |
| El correo es configuración; Mailpit sólo con permiso y en el perfil `dev`; aceptar una invitación verifica el email | ADR 0006 R12 y D21; hoja de ruta, «Acciones del usuario» |
| `worker-mail` aislado: red propia compartida sólo con `mysql` más la de egreso, usuario de MySQL restringido y tabla `mail_jobs` | ADR 0006 §3.1 y D21 |
| Alta por invitación, por email o por link, y registro abierto implementable y apagado | ADR 0006 R2 (decisiones del 2026-10-04) |
| Recuperación por email, sin 2FA, login social ni passkeys | ADR 0006 R3 |
| Roles admin y estudiante, `password.confirm` en cada acción sensible y una guardia que impide quedarse sin admins | ADR 0006 R4, D19 y §4.5 |
| Sin auditoría de logins; las acciones de admin van en los registros | ADR 0006 R5 y D20; usuario, 2026-10-04 |
| Supresión física de la cuenta, exportación del titular y libro de supresiones | ADR 0006 D06, D33 y D37 (Ley 25.326, arts. 14 y 16) |
| Sin Fortify ni Sanctum, y C3 partido en C3a y C3b | Usuario, clarify de C3a del 2026-10-05 |
| C3b entra con el correo, la administración con sus nueve endpoints, el ciclo de vida de la cuenta, el registro apagado, `taller:change-email` y que el `scheduler` procese `default` | Hoja de ruta, «Alcance por ítem», C3b |
| C3b se entrega antes de C4: no se expone el taller sin poder administrar y suprimir cuentas | Hoja de ruta, C3b |
| Las dependencias de la API se agregan sólo con permiso del usuario | Constitución, principio VII; `backend/api/AGENTS.md` |
| TDD, código y pruebas en inglés, Pest contra MySQL 9.7 real | Constitución, principios II y VI |
| Las pantallas de cuenta son de F11 y las de administración, de F12 | Coordinador, 2026-10-05 (ver Assumptions: la rama del front que se pudo leer todavía no lo dice) |

## Preguntas abiertas

Son para el clarify y se plantearon el 2026-10-05. Cada una trae sus opciones con lo que cuesta cada una, la recomendada y su motivo. Al responderlas, el clarify las registra en `## Clarifications`, bajo `### Session`, y reemplaza esta sección. Hasta entonces, los requisitos que señalan una de ellas (con su marcador o con «(propuesta)») usan la opción recomendada como borrador. Lo que depende de tu casa, de tu proveedor o de tu dominio no es una pregunta: está en «Acciones del usuario».

**Q1. ¿Qué proveedor manda el correo, y a qué costo?** *(FR-006; ADR 0006 §13.3 y §4.8)* Decide qué cuenta hay que abrir, qué paquetes se descargan, qué datos personales salen del país y qué trabajo de DNS le toca a quien opera. Lo que la acota, medido el 2026-10-05 sin descargar nada. Lo marcado «a confirmar» sale de buscadores o de sitios de terceros, o de una lectura resumida de la página del proveedor, y hay que verificarlo en la fuente antes de contratar.

- **Paquetes.** `symfony/mailer` v8.1.7 ya está en `composer.lock` con el transporte SMTP incluido, así que un proveedor por SMTP no suma ninguno. Los drivers de API de Laravel 13 suman, contando las dependencias directas que `composer.lock` todavía no tiene (la resolución real la hace Composer, con permiso, y puede sumar más):
  - Resend: `resend/resend-php` 1.16.0 (1 paquete; sus tres dependencias ya están instaladas; 124 408 bytes sin pruebas ni documentación).
  - Mailgun, Postmark o Brevo: el paquete `symfony/<proveedor>-mailer`, `symfony/http-client` y `symfony/http-client-contracts` (3 paquetes; unos 0,5 MB).
  - Amazon SES: `aws/aws-sdk-php` 3.399.1, `mtdowling/jmespath.php`, `aws/aws-crt-php` y `symfony/filesystem` (4 paquetes; el árbol de Git del SDK ronda los 283 MB).
  - Son cotas superiores leídas del árbol de Git de cada paquete (suma de archivos sin pruebas ni documentación), no el tamaño instalado. La spec de C3a decía «uno o dos»: cuenta los paquetes que se piden con `composer require`, sin sus dependencias directas.
- **Dominio y DNS.** Los cuatro servicios de API o SMTP transaccional (Brevo, Resend, SES y Mailgun) piden publicar registros DKIM y SPF en el dominio de envío (a confirmar en cada uno), y el DMARC lo publica quien opera. La acción 2 de C4 admite un subdominio gratuito de DNS dinámico, y esos servicios suelen no dejar publicar registros propios (a confirmar): **Q1 depende del dominio que se elija para C4.** Sin DKIM ni SPF el correo cae en spam o se rechaza.
- **Volumen.** El ADR admite lotes de 100 invitaciones y 300 correos por admin y por día. Un aula de 40 son 40 correos. Planes gratuitos: Brevo, 300 por día para toda la cuenta (tercero, a confirmar); Resend, 100 por día y 3 000 por mes (su página de precios); Mailgun, 100 por día (tercero, a confirmar); Postmark, 100 por mes, que no alcanza (tercero, a confirmar); SES, USD 0,10 por 1 000 correos y créditos para cuentas nuevas, sin plan gratuito permanente (su página de precios). Un lote de 100 invitaciones agota el plan gratuito de Resend o de Mailgun en un día, y el tope de 300 por admin del ADR iguala el límite diario completo de Brevo.
- **Datos y transferencia internacional.** El correo lleva el email y el nombre de cada persona, que son datos personales. El art. 12 de la Ley 25.326 prohíbe transferirlos a países sin nivel adecuado de protección. La página de transferencias internacionales de la AAIP (consultada el 2026-10-05) lista como adecuados a la Unión Europea y el EEE, el Reino Unido, Suiza, Guernsey, Jersey, la Isla de Man, las Islas Feroe, Canadá (sector privado), Andorra, Nueva Zelanda, Uruguay e Israel (datos automatizados). No figuran Estados Unidos ni Brasil. Para los demás hay cláusulas contractuales modelo (Disposición 60-E/2016 y Resolución AAIP 198/2023). Si el proveedor es encargado del tratamiento, el aviso de privacidad tiene que nombrarlo (§13.14). Esto no es asesoramiento legal: lo confirma quien responde por la base.
- **Lo que ve el proveedor.** Cada mensaje lleva su link con el token, así que el proveedor y su registro (30 días en el plan gratuito de Resend, su página de precios) ven todos los links. Por eso los tokens son de un solo uso y vencen en 60 minutos (recuperación), 48 horas (invitación de admin) o 7 días (invitación de alumno).

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | Brevo por SMTP: empresa de París, con servidores en la UE (Francia, Alemania y Bélgica; tercero, a confirmar en su página de seguridad). | Gratis hasta 300 por día para toda la cuenta (a confirmar). Sin paquetes. Una cuenta y un dominio con DKIM y SPF. El procesamiento en la UE está en la lista de la AAIP, así que no harían falta cláusulas (a confirmar), pero Brevo queda como encargado y el aviso de privacidad lo nombra. El límite diario es de toda la cuenta: con varios admins, el proveedor frena antes que el tope de 300 por admin. |
| B | Resend, región de Irlanda, por SMTP o por API. Regiones disponibles: N. Virginia, Irlanda, São Paulo y Tokio (su documentación). | Gratis hasta 100 por día y 3 000 por mes, con 30 días de retención de registros (su página de precios). Por SMTP, sin paquetes; por API, 1 paquete sin dependencias nuevas. Dominio con DKIM y SPF. Con Irlanda el procesamiento queda en la UE; con N. Virginia o São Paulo, no. Los 100 por día no alcanzan para un lote de 100 invitaciones más las recuperaciones. |
| C | Amazon SES por SMTP, en una región de la UE (a confirmar en la consola de AWS). | USD 0,10 por 1 000 correos y créditos para cuentas nuevas (su página de precios). Una cuenta de AWS con tarjeta y una solicitud para salir del sandbox (a confirmar). Por SMTP, sin paquetes; por API, 4 paquetes y el árbol más grande. Dominio con DKIM y SPF. Con una región de la UE, la lista de la AAIP lo cubre; São Paulo (Brasil) no. |
| D | El buzón que ya tenés, por SMTP: Google Workspace, o un Gmail personal. | Sin proveedor nuevo ni paquetes ni DNS propio: el remitente es ese buzón. Workspace permite 2 000 mensajes por día y 100 destinatarios por mensaje por SMTP (la documentación de Google); un Gmail personal, 500 por día (tercero, a confirmar). Se envía con una contraseña de aplicación o con OAuth. Cada correo queda en «Enviados» de ese buzón con su link vivo. Los datos pasan por Google, que no deja elegir la región: la vía de transferencia hay que confirmarla. |
| E | Un relay propio (Postfix, imagen `boky/postfix` 5.1.0-alpine, MIT) entre `worker-mail` y la salida, con entrega directa a los servidores de cada destinatario. | Una imagen nueva (66 477 551 bytes para amd64) y un contenedor más, sin tercero. Desde una IP de hogar la entrega directa suele fallar: muchos proveedores de Internet filtran el puerto 25 saliente, la IP residencial suele estar en listas de bloqueo y no hay DNS inverso (inferido, no medido). Con un relay de A, B o C delante no cambia el proveedor, y sólo saca la salida a Internet del contenedor que tiene `APP_KEY`. |
| F | Sin correo real: el modo sólo link de C3a, para siempre. | $0, sin worker, cola, proveedor ni transferencia. Quien olvida su contraseña depende de quien tiene la consola, y las invitaciones las reparte el admin como links. `forgot-password`, la verificación y los avisos quedan apagados, y C3b se reduce a la administración y al ciclo de vida. |

**Recomendada: A.** Junta SMTP sin paquetes nuevos, un plan gratuito que cubre el volumen esperado (300 por día) y el procesamiento dentro de la lista de países adecuados de la AAIP. B (Irlanda) procesa en la misma región, pero su plan gratuito no soporta un lote de 100 invitaciones. C cuesta centavos, pero pide una cuenta de AWS y salir del sandbox. D evita el DNS, pero deja los links en un buzón personal y pasa los datos por Google. **Costo:** una cuenta, un dominio con DNS que puedas editar (no un subdominio gratuito de DNS dinámico, a confirmar), nombrar a Brevo como encargado en el aviso de privacidad y aceptar que un tercero ve cada link. Si no querés un tercero, F ya funciona (C3a) y deja el correo para cuando haga falta.

**Q2. ¿Cómo se cambia el email de una cuenta?** *(FR-023 y FR-024; ADR 0006 §13.9)* Decide si C3b trae un camino HTTP para cambiar un dato con el que se recupera la cuenta.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | Sólo por consola, con `taller:change-email`, que avisa a las dos direcciones (propuesta del ADR). | Un comando y dos requisitos. Quien opera lo hace cada vez, y la persona no corrige sola un error de tipeo. |
| B | Autoservicio: la persona pide el cambio con `password.confirm`, se confirma en el email nuevo y se avisa al anterior. | Dos endpoints, dos correos más, un token con vencimiento (una tabla o un valor firmado) y unos seis requisitos más. Abre una vía de toma de cuenta: con la sesión y la contraseña robadas se cambia el email y se recupera por correo. |

**Recomendada: A.** D19 cerró a propósito los cambios de email por HTTP (una sesión robada no debe poder tomar la cuenta), y el pedido es raro. **Costo:** quien opera lo hace cada vez y tiene que verificar por otro canal quién pide el cambio; la persona no corrige sola un error de tipeo. B sólo se justifica si el volumen de cambios hace inviable que los haga una persona.

**Q3. Cuando se abra el registro, ¿se restringe a ciertos dominios de email?** *(FR-019; ADR 0006 §13.20)* Decide si el registro abierto lleva una defensa que no depende del volumen. Está apagado, así que nada de esto rige hasta que alguien lo prenda.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | Sin restricción: cualquier email que pueda verificarse. | Ningún requisito más. Abrir el registro a cualquiera expone el ejecutor de B2 y el correo a abuso, que sólo frenan los topes por red y global del ADR. |
| B | Una lista de dominios permitidos en la configuración (por ejemplo, el de una escuela). Con la lista vacía no se restringe. | Un valor de configuración, una regla en el registro y un mensaje que nombra los dominios aceptados. Un operador que prende el registro con la lista vacía lo abre a cualquiera. |

**Recomendada: B.** El ejemplo del ADR (el dominio de una escuela) es el uso real, y la verificación por correo prueba que la persona controla el buzón. **Costo:** un requisito, una prueba y una decisión de quien prenda el registro (qué dominios). Si el registro nunca se abre, A no cuesta nada.

**Q4. ¿Se parte C3b?** *(Partición)* Decide la forma de las especificaciones que vienen. C3b tiene 55 requisitos contra los 52 de C3a (tabla de «Partición»). Los números no alcanzan por sí solos; las razones están en esa sección.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | No partir: una spec, un plan. | Un solo ciclo de Spec Kit. Una sola spec con una decisión externa adentro (el proveedor y el dominio). El ciclo de vida necesita las tablas de B2 y D1: o espera a esos ítems, o entra con el registro de `UserData` (FR-042) y ellos suman las suyas. |
| B | Partir el correo como C3c: C3b queda con la administración y el ciclo de vida (23 requisitos) y C3c con el correo (33). | Un ID nuevo y otro ciclo de Spec Kit. C4 depende de las dos. La administración sale con ganchos que responden 503 `mail_unavailable` hasta que llegue C3c. Lo que gana: lo que no espera nada de afuera llega antes, y el correo espera a su proveedor sin frenarlo. |
| C | Partir el ciclo de vida como C3c: C3b queda con el correo y la administración (46 requisitos) y C3c con el ciclo de vida (10), que espera a B2 y D1. | Un ID nuevo y otro ciclo. C4 depende de las dos. `DELETE /api/admin/users/{user}` pasa a C3c, y la guardia del último admin cubre sólo `PATCH` hasta entonces. La mitad grande conserva la decisión externa. |

**Recomendada: B.** Separa lo que espera una decisión del usuario y un dominio de lo que no espera nada, y deja un foco de revisión por spec. **Costo:** un ID nuevo (`C3c`), otro ciclo de Spec Kit y que la hoja de ruta renombre C3b (administración y ciclo de vida) al aplicarlo. Si preferís no partir, A funciona: el plan entonces ordena el correo al final.

**Q5. ¿Un admin puede recuperar su contraseña por correo?** *(FR-013, propuesta; ADR 0006 §4.3 y §4.10)* El ADR dice que el link de recuperación de un admin sale sólo por consola, pero no dice si eso alcanza también a su propio pedido de `forgot-password`. La spec de C3a lo da por cierto: la consola es «el único camino de recuperación de un admin».

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | No: `forgot-password` responde 202 igual, pero a una cuenta admin no le envía nada. Su recuperación es por consola. | Un admin que olvida su contraseña necesita a quien tiene la consola (con un solo admin, es la misma persona). |
| B | Sí: un admin recupera por correo como un alumno. | El buzón del admin pasa a ser una llave de todo el taller, sin segundo factor (R3, ADR 0006 §4.10), y se pierde una de las mitigaciones del ADR. |

**Recomendada: A.** Mantiene lo que dice C3a, no agrega superficie a la cuenta que más puede, y la consola está siempre. **Costo:** con varios admins (por ejemplo, docentes), quien olvida la contraseña le pide el link a quien opera.

## Acciones del usuario

Los agentes no hacen estas acciones. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII); los tamaños están en «Descargas previstas».

| Cuándo | Acción |
| --- | --- |
| Antes del plan | **Confirmá con quien responde por la base la vía de transferencia internacional** del proveedor que elijas en Q1 (Ley 25.326, art. 12): país adecuado, cláusulas modelo o la que corresponda. |
| Antes del plan | **Elegí el dominio con el que sale el correo y comprobá que podés editar su DNS** (registros TXT y CNAME en subnombres). Es el mismo dominio que C4 pide elegir (su acción 2), y un subdominio gratuito de DNS dinámico puede no dejar publicar esos registros (a confirmar con quien lo ofrece). |
| Antes de implementar | **Proveedor, remitente y credencial (Q1):** creá la cuenta, autenticá el dominio (SPF y DKIM con los valores que da el proveedor; DMARC propio, empezando en monitoreo), elegí la dirección remitente (por ejemplo, una de no responder) y generá una credencial sólo de envío (clave SMTP o de API). Va en `.env`; los agentes no la ven. |
| Antes de implementar | **Permiso para `axllent/mailpit`** (tabla de descargas), sólo para el perfil `dev`. Sin permiso, la prueba de punta a punta de FR-052 es una verificación manual declarada. |
| Si Q1 elige un driver de API | **Permiso para los paquetes de Composer** de la tabla de descargas: `composer require` consulta Packagist, y los tamaños de la tabla son una cota. |
| Antes de activar el correo real | **Un `APP_URL` público.** Hasta C4 vale `http://localhost:8080` y los links de los correos no abrirían fuera del equipo. Activá `MAIL_REQUIRED=true` con el proveedor sólo cuando `APP_URL` sea el real. |
| Antes del despliegue público | **El texto del aviso de privacidad** nombra al proveedor del correo como encargado y, si corresponde, la transferencia internacional. También sigue abierto quién responde por la base y si hay que inscribirla ante la AAIP (§13.14). |
| Al desplegar | `sh backend/api/scripts/init-env.sh` (agrega la contraseña del usuario de MySQL del correo) y, con un volumen de MySQL existente, el comando único de `db-grants` (`docker compose --profile ops run --rm db-grants`), que crea ese usuario. Poné `MAIL_REQUIRED=true` y las credenciales del proveedor en `.env`. |
| Al verificar | **Un envío real de cada mensaje a tres buzones de distinto tipo** (uno de Google, uno de Microsoft y el de la escuela) y mirá en cuáles cae en spam. Mailpit no prueba la entregabilidad. |
| Al operar | Guardá la copia más reciente del libro de supresiones junto a cada respaldo y corré `taller:reapply-deletions` al restaurar (el procedimiento lo orquesta C4). |
| Siempre | Cada descarga (imágenes, paquetes de Composer) pide permiso con nombre, origen y tamaño antes de bajarse. |

## Descargas previstas

Nada se descargó. Los tamaños salen de la API de metadatos de Docker Hub, de Packagist y de la API de árboles de GitHub del 2026-10-05. Son tamaños comprimidos de amd64 y cotas de árboles de Git, no una medición de `pull` ni una resolución de Composer.

| Qué | Origen | Tamaño | Para qué | Licencia |
| --- | --- | --- | --- | --- |
| `axllent/mailpit` v1.31.4 (índice `sha256:b68349e3a014b90c5610bfb26b2ae36f3892d7b8cf25ee140c6c71c98d2fcf48`; amd64 `sha256:c8e498023104710cd71a7bb1856a51f2183ff0dc1ea07675067a38ecda08428f`) | Docker Hub | 16 836 010 bytes (16,1 MiB) | FR-011 y FR-052; sólo el perfil `dev` | MIT |
| `resend/resend-php` 1.16.0 | Packagist y GitHub | 124 408 bytes sin pruebas ni documentación; 0 dependencias nuevas | Q1, opción B por API | MIT |
| `symfony/mailgun-mailer`, `symfony/postmark-mailer` o `symfony/brevo-mailer` (v8.1.6, v8.1.6 y v8.1.0), más `symfony/http-client` v8.1.8 y `symfony/http-client-contracts` v3.7.3 | Packagist y GitHub | Entre 488 930 y 495 885 bytes los tres juntos, según el proveedor (el puente de 17 a 24 KiB, el cliente 441 KiB y los contratos 19 KiB), sin pruebas | Q1 con Mailgun, Postmark o Brevo por API | MIT |
| `aws/aws-sdk-php` 3.399.1, más `mtdowling/jmespath.php`, `aws/aws-crt-php` y `symfony/filesystem` | Packagist y GitHub | Unos 283 MB el árbol del SDK (cota, no el instalado) | Q1, opción C por API (por SMTP no se descarga) | Apache-2.0 el SDK |
| `boky/postfix` 5.1.0-alpine | Docker Hub | 66 477 551 bytes (63,4 MiB) para amd64 | Q1, opción E (no recomendada) | MIT |

Sin descarga nueva: `mysql:9.7` (que ya fija `docker/compose.yaml` y usa `db-grants`), la imagen de `php` (que también usa `worker-mail`) y, por SMTP, ningún paquete de Composer: `symfony/mailer` v8.1.7 ya está en `composer.lock`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un admin invita por correo o por link, desde la API (Priority: P1)

Un admin crea invitaciones para uno o varios emails y elige, para cada lote, si llegan por correo o como un link que él entrega. Puede renovarlas, revocarlas y ver cuáles siguen pendientes, y las de rol admin se destacan. Con esto quien opera deja de ser el único que da de alta.

**Why this priority**: C3a dejó `taller:invite` como único camino para crear cuentas. Sin esto, cada alta pasa por la consola.

**Independent Test**: crear un lote con los dos modos, aceptar una invitación por el camino de C3a, renovar otra, revocar otra y provocar un fallo del proveedor.

**Acceptance Scenarios**:

1. **Dado** un admin con la contraseña reconfirmada, **cuando** crea un lote de 3 emails con `delivery=link`, **entonces** cada uno recibe `created` con su link en la respuesta, una sola vez, y `GET /api/admin/invitations` no trae ningún token.
2. **Dado** el correo disponible, **cuando** crea una invitación con `delivery=email`, **entonces** la respuesta no trae el link, el correo sale después del COMMIT, y cuando el proveedor lo acepta la invitación queda con `sent_at`.
3. **Dados** un email con cuenta, uno con una invitación vigente y otro con una vencida, **cuando** se invitan, **entonces** responden `user_exists`, `invitation_pending` y `renewed`, y no sale ningún correo para los dos primeros.
4. **Dado** un lote de 101 emails o uno vacío, **cuando** se envía, **entonces** responde 422 `validation_failed`. **Dado** un admin que ya mandó 300 correos en el día, **cuando** pide más con `delivery=email`, **entonces** cada email recibe `rate_limited`, y los links no cuentan.
5. **Dado** crear, renovar o reenviar una invitación de rol admin, **cuando** el admin no reconfirmó su contraseña, **entonces** recibe 423 `password_confirmation_required`; la de un alumno no lo exige.
6. **Dado** un proveedor que no responde, **cuando** se agotan los reintentos, **entonces** la invitación queda con `send_failed_at`, la lista la marca, y el admin puede reenviarla por link.
7. **Dado** el modo sólo link, **cuando** el admin pide `delivery=email`, **entonces** recibe 503 `mail_unavailable` y no se crea ninguna invitación.
8. **Dada** una invitación pendiente, **cuando** el admin la reenvía, **entonces** el token y el vencimiento rotan y el link anterior responde 404 `invitation_not_found` en la consulta de C3a; **cuando** la revoca, recibe 204 y el link responde 404.

*Cubre: FR-007, FR-010, FR-031 y FR-037 a FR-040; SC-001, SC-003 y SC-006.*

---

### User Story 2 - Recuperar la contraseña por correo (Priority: P1)

Un alumno olvidó su contraseña, la pide desde la pantalla de ingreso y recibe un link por correo. Desde afuera nadie aprende qué emails tienen cuenta.

**Why this priority**: es lo que el alumno más pide y lo que hoy depende de quien tiene la consola. Reutiliza el broker de contraseñas y el `reset-password` de C3a.

**Independent Test**: pedir la recuperación para una cuenta que existe y una que no, comparar las respuestas y el trabajo del pedido, recibir el correo, usar el link y mirar el aviso.

**Acceptance Scenarios**:

1. **Dado** el email de un alumno con cuenta activa, **cuando** pide la recuperación, **entonces** recibe 202 con el mensaje uniforme y, en menos de 3 minutos, un correo con un link válido por 60 minutos.
2. **Dados** un email sin cuenta, el de una cuenta `disabled` o `deleting` y el de un admin (propuesta, Q5), **cuando** piden la recuperación, **entonces** la respuesta es idéntica a la del escenario 1 y no sale ningún correo.
3. **Dado** cualquier email, **cuando** llega el pedido, **entonces** el pedido no consulta `users`: hace el mismo trabajo exista o no la cuenta.
4. **Dado** el modo sólo link, **cuando** se pide la recuperación de cualquier email, **entonces** responde 503 `mail_unavailable`, sin depender de la cuenta.
5. **Dado** el sexto pedido de un minuto desde la misma red, **cuando** llega, **entonces** recibe 429 con `Retry-After`; el cuarto pedido de una hora para el mismo email responde 202 igual, pero no encola nada.
6. **Dado** el link de recuperación, **cuando** se usa en `reset-password` de C3a, **entonces** la contraseña cambia y la persona recibe un aviso por correo. El mismo aviso sale tras `PUT /api/me/password`.
7. **Dado** un correo de recuperación que no salió dentro de la hora de vida de su token, **cuando** el proveedor vuelve, **entonces** no se envía.

*Cubre: FR-012 a FR-015; SC-001 y SC-002.*

---

### User Story 3 - Administrar cuentas sin quedarse sin admin (Priority: P1)

Un admin lista y consulta usuarios, deshabilita, rehabilita, promueve o degrada cuentas y dispara la recuperación de un alumno, todo con la contraseña reconfirmada y sin poder dejar al taller sin un admin activo.

**Why this priority**: reemplaza `tinker` y es lo que C4 necesita antes de exponer el taller.

**Independent Test**: recorrer cada ruta de `/api/admin` como estudiante, como admin sin confirmar y como admin confirmado; provocar la guardia con un admin y con dos, y con pedidos simultáneos.

**Acceptance Scenarios**:

1. **Dado** un admin, **cuando** pide el listado con `role=student`, `status=active`, `q` y `sort`, **entonces** recibe una página de hasta 100 usuarios con `page`, `perPage`, `total` y `lastPage`, y la ficha de uno trae sus datos de cuenta y nunca el hash, el token de «recordarme» ni textos del alumno.
2. **Dado** un estudiante o un pedido sin sesión, **cuando** pide cualquier ruta de `/api/admin`, **entonces** recibe 403 `forbidden` o 401 `unauthenticated`, y sin la cuenta esperada, 409 `account_mismatch`.
3. **Dado** un admin que no reconfirmó su contraseña, **cuando** cambia el rol o el estado de una cuenta, **entonces** recibe 423; reconfirmada, `PATCH` cambia sólo `role` y `status`, y un `email` en el cuerpo no cambia el email.
4. **Dada** una cuenta deshabilitada, **cuando** hace su siguiente pedido con la sesión viva, **entonces** recibe 403 `account_disabled`; su token de recuperación se borró; y, si era admin, sus invitaciones pendientes también.
5. **Dada** una cuenta promovida a admin, **cuando** el cambio confirma, **entonces** su `remember_token` rota, recibe un aviso por correo y su siguiente pedido a `/api/admin` ya pasa.
6. **Dado** el único admin activo, **cuando** alguien intenta deshabilitarlo, degradarlo o suprimirlo, **entonces** recibe 409 `last_admin`; **cuando** un admin intenta deshabilitarse o degradarse a sí mismo, recibe 422 `validation_failed`.
7. **Dados** dos admins que se deshabilitan entre sí a la vez, **cuando** llegan los dos pedidos, **entonces** al menos uno queda activo.
8. **Dado** un admin con la contraseña reconfirmada, **cuando** dispara la recuperación de un alumno, **entonces** recibe 202 sin el link; para un admin recibe 422 y, en modo sólo link, 503 `mail_unavailable`.
9. **Dado** cualquier respuesta con éxito de `/api/admin`, **cuando** se inspecciona, **entonces** no contiene `code`, `reflection`, `note`, `body`, `custom_test` ni `raw_payload`.

*Cubre: FR-032 a FR-036 y FR-041; SC-005 y SC-006.*

---

### User Story 4 - Llevarse los datos y borrar la cuenta (Priority: P1)

Una persona descarga todo lo que el taller guarda de ella y, si quiere, borra su cuenta. La supresión es real: se lleva también lo que «Borrar todo» deja.

**Why this priority**: es el derecho de acceso y de supresión de la Ley 25.326 (arts. 14 y 16), y la hoja de ruta no deja exponer el taller sin poder suprimir cuentas.

**Independent Test**: poblar una cuenta con todas las tablas, exportarla, suprimirla y buscar filas con su `user_id` en todo el esquema.

**Acceptance Scenarios**:

1. **Dada** una sesión con la contraseña reconfirmada, **cuando** pide `POST /api/me/export`, **entonces** recibe un archivo JSON en streaming con su cuenta (sin hash ni token), la foto de progreso v2, sus intentos con el payload conservado y los crudos importados, y ninguna fila de otra cuenta; el cuarto pedido del día recibe 429.
2. **Dada** una exportación en curso, **cuando** se mira MySQL, **entonces** cada tabla se lee en una transacción corta y ninguna queda abierta mientras se envía la respuesta.
3. **Dada** una cuenta con la contraseña reconfirmada, **cuando** pide `DELETE /api/me`, **entonces** recibe 202, la cuenta pasa a `deleting`, sus sesiones desaparecen, su siguiente pedido recibe 401 y su ingreso falla como una credencial inválida.
4. **Dada** la purga terminada, **cuando** se buscan filas con su `user_id` en todas las tablas (también las de B2 y D1 que existan), **entonces** no hay ninguna, hay una fila en `account_deletions` sin datos personales, y la persona recibió el aviso de cuenta borrada.
5. **Dada** una purga que se cortó a la mitad, **cuando** pasan 15 minutos, **entonces** el barrido la vuelve a despachar, la retoma sin duplicar nada y deja una línea en los registros.
6. **Dado** el único admin activo, **cuando** pide `DELETE /api/me`, **entonces** recibe 409 `last_admin`; un admin con la contraseña reconfirmada puede suprimir a un alumno con `DELETE /api/admin/users/{user}`.
7. **Dado** «Borrar todo» de D1, **cuando** se ejecuta, **entonces** los intentos, los payloads y las importaciones siguen; **cuando** se suprime la cuenta, ya no existen.
8. **Dada** una tabla con `user_id` que no está registrada en `UserData`, **cuando** corre la prueba de cobertura, **entonces** falla y nombra la tabla.

*Cubre: FR-042 a FR-047 y FR-049; SC-007 y SC-008.*

---

### User Story 5 - Restaurar un respaldo sin resucitar cuentas (Priority: P2)

Tras restaurar un respaldo, quien opera reaplica el libro de supresiones para que las cuentas borradas desde ese volcado no reaparezcan, y recién entonces abre el tráfico.

**Why this priority**: la supresión persiste hasta 35 días en los respaldos (D37), y C4 exige esta operación para abrir. No hace falta para que el taller funcione.

**Independent Test**: suprimir una cuenta, restaurar un volcado anterior, correr el comando con la copia del libro y mirar qué queda.

**Acceptance Scenarios**:

1. **Dados** una base restaurada y la copia del libro, **cuando** corre `taller:reapply-deletions`, **entonces** borra las cuentas del libro cuyo `user_created_at` coincide con el de la cuenta existente.
2. **Dada** una cuenta nueva que recibió un id reutilizado, con otro `created_at`, **cuando** corre el comando, **entonces** no la borra.
3. **Dado** el mismo libro, **cuando** el comando corre dos veces, **entonces** la segunda no cambia nada.
4. **Dada** una fila del libro con más de 35 días, **cuando** corre la poda diaria, **entonces** desaparece.

*Cubre: FR-047 y FR-048; SC-009.*

---

### User Story 6 - Cambiar el email de una cuenta (Priority: P2)

Quien opera cambia por consola el email de una cuenta, y las dos direcciones se enteran.

**Why this priority**: es lo que C3b deja soportado para un caso raro. Con Q2 en A, no hay otro camino.

**Independent Test**: correr el comando con cuentas y emails de cada caso y mirar la base, las sesiones y los correos.

**Acceptance Scenarios**:

1. **Dada** una cuenta, **cuando** corre `taller:change-email actual nuevo`, **entonces** el email cambia, sus sesiones se cierran, su token de recuperación se borra y las dos direcciones reciben un aviso.
2. **Dado** un email nuevo que ya tiene cuenta o una invitación, **cuando** corre, **entonces** falla con ese motivo y no cambia nada; con un email inválido o un actual sin cuenta, también falla.
3. **Dado** cualquier pedido HTTP que traiga `email` en `PATCH /api/me` o en `PATCH /api/admin/users/{user}`, **cuando** llega, **entonces** el email no cambia.

*Cubre: FR-023 y FR-024.*

---

### User Story 7 - Operar el correo sin sorpresas (Priority: P2)

Quien despliega necesita que el correo sea el único contenedor de la aplicación con salida, que un fallo del proveedor no tire nada, que sin proveedor el taller siga operable, que el usuario de MySQL del correo no pueda más de lo que necesita y que los checks sigan sirviendo.

**Why this priority**: sin esto el correo funciona, pero es la salida más peligrosa del taller (ADR 0006 §12) y se vuelve difícil de operar.

**Independent Test**: provocar cada situación contra el stack levantado y contra una base de pruebas.

**Acceptance Scenarios**:

1. **Dado** el stack levantado, **cuando** se lee la configuración efectiva de Compose, **entonces** sólo `worker-mail` está en la red de egreso y comparte red con `mysql`, y `php`, `scheduler` y `migrate` no resuelven nombres de Internet.
2. **Dado** el usuario de MySQL del correo, **cuando** corren sus pruebas, **entonces** puede lo suyo (leer y escribir `mail_jobs` y `failed_jobs`, actualizar `sent_at` y `send_failed_at`) y no puede leer `users`, `sessions` ni `password_reset_tokens`, escribir otra tabla, hacer DDL ni `GRANT`; y aun así `worker-mail` envía.
3. **Dado** un proveedor caído, **cuando** llega un correo, **entonces** se reintenta con espera creciente, el pedido que lo originó ya respondió, y al agotarse queda un registro de la falla en `failed_jobs`, sin el contenido.
4. **Dado** `MAIL_REQUIRED=true` con el mailer `log` o `array`, **cuando** se pide `GET /api/session`, **entonces** `features.passwordReset` es `false`, ningún correo se encola y ningún token aparece en los registros.
5. **Dada** la tabla `mail_jobs`, **cuando** se lee con root, **entonces** no contiene en claro ningún email, nombre ni link.
6. **Dado** el perfil `dev`, **cuando** se levanta, **entonces** los correos se ven en Mailpit, publicado sólo en `127.0.0.1`; sin ese perfil, Mailpit no existe.
7. **Dado** el `scheduler` corriendo, **cuando** pasa un minuto, **entonces** procesa la cola `default`, y `queue:prune-failed` y la poda de `account_deletions` corren sin solaparse.
8. **Dado** el stack levantado, **cuando** corren `api:smoke`, `api:content:check` y `deploy-check.sh`, **entonces** pasan, también sin proveedor de correo.

*Cubre: FR-001 a FR-006, FR-008, FR-009, FR-011, FR-025 a FR-030 y FR-050; SC-003, SC-004 y SC-010.*

---

### User Story 8 - Registro abierto, apagado, con verificación de email (Priority: P3)

Un interruptor deja que cualquiera con un email permitido cree su cuenta y la verifique por correo. Está apagado, y todo lo de C3a funciona igual.

**Why this priority**: R2 pide que sea implementable y esté apagado, así que no tiene consumidor hasta que alguien lo prenda.

**Independent Test**: recorrer las rutas con el interruptor apagado y encendido, y el ciclo registrarse, verificar y pedir contenido.

**Acceptance Scenarios**:

1. **Dado** `REGISTRATION_OPEN=false`, **cuando** se piden `POST /api/auth/register` y las dos rutas de verificación, **entonces** responden 404 `not_found` y `features.registration` es `false`.
2. **Dado** el interruptor encendido, **cuando** una persona se registra, **entonces** recibe 201 con la sesión abierta, la cuenta nace `student`, `active` y sin verificar, y el contenido responde 403 `email_unverified`.
3. **Dado** el correo de verificación, **cuando** el front confirma los datos del fragmento `#verificar=` con un POST con sesión, **entonces** responde 204 y el contenido pasa a 200; no existe ningún GET firmado en la API.
4. **Dados** un email que ya tiene cuenta o (propuesta, Q3) un dominio fuera de la lista, **cuando** se registran, **entonces** reciben 422 `validation_failed` con el motivo, y el titular de la cuenta existente recibe un aviso por correo.
5. **Dado** el sexto registro de una hora desde la misma red, o el que pasa el tope global por hora, **cuando** llega, **entonces** recibe 429; el cuarto correo de verificación de una hora para una cuenta no sale.
6. **Dada** una invitación pendiente para un email, **cuando** alguien se registra con ese email, **entonces** la invitación sigue intacta; si llegó por correo, aceptarla reemplaza la cuenta sin verificar, y si llegó por link, recibe 409 `email_taken`.
7. **Dada** una cuenta de registro nunca verificada, **cuando** pasan 7 días, **entonces** se suprime por el camino de la supresión.

*Cubre: FR-016 a FR-022; SC-011. Las pruebas de FR-051 a FR-055 y el criterio SC-012 valen para todas las historias.*

---

### Edge Cases

- **Correo antes de C4:** hasta C4, `APP_URL` es `http://localhost:8080`, y un link armado desde ahí no abre fuera del equipo. El modo sólo link es el valor por omisión hasta que haya un `APP_URL` público, y `worker-mail` lo advierte al arrancar si apunta a `localhost`.
- **El proveedor acepta pero no entrega:** `sent_at` dice «entregado al proveedor». Un correo que cae en spam o rebota no se detecta (sin webhooks): la persona puede volver a pedir la recuperación (una por minuto) y el admin puede reemitir la invitación o pasarla a link.
- **Un escáner abre el link:** los clientes de correo y los filtros de seguridad abren los links que reciben. El token viaja en el fragmento y la API no tiene ningún GET con token, así que abrirlo no consume nada.
- **`worker-mail` caído:** los pedidos responden igual y los correos esperan en `mail_jobs`; al volver salen, salvo los que vencieron (FR-007). Es una caída del correo, no del taller.
- **Un correo duplicado:** si el proveedor acepta y la conexión se corta, el reintento puede mandar el mismo mensaje dos veces. Las invitaciones y las recuperaciones llevan el mismo link, así que no cambia nada, pero la persona recibe dos correos. Se acepta.
- **El tope del proveedor es menor que el del taller:** el límite de 300 por admin y por día no garantiza que el proveedor acepte tantos. El proveedor rechaza, se reintenta y la invitación queda con `send_failed_at`.
- **Dos admins a la vez:** los pedidos que dejarían cero admins activos se serializan por la guardia (FR-034): el segundo recibe 409 `last_admin`.
- **Un admin degradado con la sesión viva:** el rol se lee en cada pedido, así que su siguiente pedido a `/api/admin` recibe 403 `forbidden`.
- **Dos pedidos de supresión seguidos:** el segundo ya no tiene sesión (401), y el trabajo de purga es único por cuenta.
- **Una purga que falla a mitad:** la cuenta queda en `deleting` con parte de sus datos y sin poder entrar; el barrido la retoma (FR-046).
- **Una tabla nueva con `user_id`:** si B2, D1 o un ítem futuro no la registran en `UserData`, rompe la prueba de cobertura del ítem que la crea (FR-042): no llega a la supresión ni a la exportación sin que alguien lo note.
- **Restaurar con un id reutilizado:** una cuenta nueva puede recibir el id de una suprimida. `user_created_at` distingue las dos y el comando no borra la nueva (FR-048).
- **Una exportación grande:** ocupa un proceso de PHP-FPM mientras dura (el ADR §9 cuenta 5 hijos) y no es una foto atómica entre tablas. Se limita a 3 por día y cuenta.
- **El registro se apaga con cuentas sin verificar:** las rutas de verificación pasan a responder 404, así que esas cuentas no pueden verificarse hasta que se suprimen a los 7 días; una invitación por correo las reemplaza.
- **Invitación por link y registro abierto:** alguien puede registrar primero el email de una persona invitada por link, y la aceptación recibe 409 `email_taken` (el ADR lo acepta, §12). El admin la reenvía por correo, que reemplaza la cuenta sin verificar.
- **Mailer `log` en local:** con `MAIL_REQUIRED=false` y el mailer `log` los flujos corren sin proveedor, pero los links no se ven en el registro (el depurador de secretos de C3a los quita, su FR-045). Mailpit es el camino para verlos.
- **Un email que difiere en mayúsculas o acentos:** se canonicaliza y se compara igual que en C3a, en las invitaciones de admin y en `taller:change-email`.

## Requirements *(mandatory)*

### Functional Requirements

**Correo: el worker aislado y la cola** *(mitad del correo)*

- **FR-001**: Todo correo del taller DEBE salir de un único servicio, `worker-mail`, que corre con la imagen de `php`. `php`, `scheduler`, `migrate` y los demás servicios de la aplicación NO DEBEN tener salida a Internet ni abrir una conexión SMTP o de API hacia un proveedor. `taller`, el Nginx, conserva su red `edge` como hoy: no tiene `APP_KEY` ni acceso a la base. *(D21, §4.8)*
- **FR-002**: `worker-mail` DEBE estar en una red interna compartida sólo con `mysql` y en la red de egreso, y NO DEBE compartir red con `php`, con `scheduler` ni con otro worker. Una prueba lee la configuración efectiva de Compose y falla si otro servicio entra a esas dos redes o si `worker-mail` entra a otra. *(D21)*
- **FR-003**: Toda notificación DEBE ir a una cola propia, `mail`, en la tabla `mail_jobs` (una migración con un solo `CREATE TABLE`, D35), que sólo lee `worker-mail`. DEBE encolarse después del COMMIT de la transacción que la origina, y NO DEBE enviarse dentro de un pedido ni de una transacción: el pedido responde sin esperar al proveedor. *(D21, §8)*
- **FR-004**: Cada correo encolado DEBE llevar todo lo que necesita para enviarse (destinatario, nombre, link, vencimiento y tipo) como valores simples, cifrados dentro del trabajo, y NO DEBE volver a leer `users` ni otra tabla de cuentas al enviarse. `mail_jobs` NO DEBE guardar en claro un email, un nombre ni un link. *(D21)*
- **FR-005**: `worker-mail` DEBE conectarse a MySQL con un usuario propio que sólo pueda leer y escribir `mail_jobs` y `failed_jobs` y actualizar `sent_at` y `send_failed_at` de `invitations`. C3b DEBE crearlo, sin esperar a C4, con su contraseña en `.env` y fuera de Git. Una prueba con ese usuario real contra MySQL 9.7 (como el criterio J de C3a, su FR-042) comprueba lo que puede y lo que no: no lee `users`, `sessions` ni `password_reset_tokens`, no escribe otra tabla ni otra columna de `invitations`, no hace DDL ni `GRANT`, y aun así envía. Sus valores esperados salen de esta lista y no de las sentencias que la aplican. *(D21, §12)*
- **FR-006**: Las credenciales del proveedor (usuario y contraseña SMTP o clave de API) DEBEN existir sólo en el entorno de `worker-mail`, nunca en el ancla común de Compose, y venir de `.env` sin entrar en Git, en la imagen ni en el contexto de Docker. `worker-mail` DEBE tener `APP_KEY` porque descifra sus trabajos (riesgo residual, §12) y usar un store de caché en memoria. El proveedor y el remitente salen de la configuración. [NEEDS CLARIFICATION: Q1, qué proveedor manda el correo. La recomendada: Brevo por SMTP, sin paquetes nuevos.] *(D21, constitución VII)*
- **FR-007**: Un correo que el proveedor rechaza o no responde DEBE reintentarse con espera creciente (propuesta: 1, 5, 15 y 60 minutos) hasta que venza su utilidad: la vida del link, o 24 horas si el correo no lleva uno (propuesta). Después NO DEBE enviarse: un link vencido no se manda. Al agotar los reintentos, el trabajo queda en `failed_jobs` (7 días) y la falla en los registros con su causa, sin el contenido; si era una invitación, `send_failed_at` se completa. Cuando el proveedor acepta el mensaje, `sent_at` se completa. `sent_at` significa «entregado al proveedor», no «llegó al buzón»: el taller no atiende rebotes. *(D21, D30, §4.8)*
- **FR-008**: Con `MAIL_REQUIRED=true` y un mailer `log` o `array` (es decir, sin un mailer real), el taller DEBE entrar en modo sólo link: `GET /api/session` informa `features.passwordReset=false`; `POST /api/auth/forgot-password`, `delivery=email` en las invitaciones de admin y la recuperación de un tercero responden 503 `mail_unavailable` (con `Retry-After`, y en español) sin depender de la cuenta y sin crear nada; y ningún token termina en un registro. Las invitaciones por link y `taller:password-reset-link` siguen como en C3a. Con `MAIL_REQUIRED=false` (desarrollo local) el mailer `log` deja correr los flujos. `features.passwordReset` también es lo que el admin consulta para ofrecer «enviar por correo» o sólo «copiar link». *(D21, S7, §4.8)*
- **FR-009**: El remitente y su nombre DEBEN salir de la configuración y pertenecer al dominio autenticado con SPF y DKIM (acción del usuario). Los correos DEBEN ser de texto plano, en español, sin imágenes remotas, sin rastreo de aperturas ni de clics (que reescribiría los links y entregaría el token a un tercero más) y sin contraseñas. Todo link DEBE armarse desde `APP_URL` y nunca desde `Host`, con el token en el fragmento (`#invitacion=`, `#restablecer=` o `#verificar=`) y no en la ruta ni en la query. Si `APP_URL` apunta a `localhost`, `worker-mail` DEBE advertirlo al arrancar. *(D18, D21; C3a FR-021)*
- **FR-010**: El taller DEBE mandar estos ocho correos, y ninguno más: la invitación (de un admin, con `delivery=email`; vence a los 7 días, y a las 48 horas si es de admin); la recuperación de la contraseña (al titular; vence a los 60 minutos); el aviso de contraseña cambiada (al titular, tras un `reset-password` o un `PUT /api/me/password`); el aviso de rol de admin asignado (a la cuenta promovida); el aviso de cuenta borrada (al email de la cuenta suprimida, cuando la purga termina); la verificación de email (con el registro abierto, a la cuenta sin verificar; lleva link); el aviso de cambio de email (a las dos direcciones); y el aviso de intento de registro con un email que ya tiene cuenta (con el registro abierto, al titular). Llevan link sólo tres: la invitación, la recuperación y la verificación. Sin correo disponible, los avisos no se envían ni fallan. *(§4.8, D21)*
- **FR-011**: En el perfil `dev` de Compose, y sólo con permiso del usuario para descargarlo, DEBE existir un servidor SMTP de pruebas (`axllent/mailpit`) al que `worker-mail` entrega, con su interfaz web publicada sólo en `127.0.0.1`. Sin ese perfil no existe ni publica nada. *(D21, §4.8; constitución VII)*

**Recuperación y verificación por correo** *(mitad del correo)*

- **FR-012**: `POST /api/auth/forgot-password {email}` DEBE validar sólo la forma del email, encolar un trabajo en la cola `default` y responder siempre 202 con el mismo cuerpo, exista o no la cuenta y sea cual sea su estado: el pedido NO DEBE consultar la cuenta, para que ni el tiempo ni el trabajo la revelen. La única excepción es 503 `mail_unavailable` en modo sólo link, que no depende de la cuenta. *(§4.3, §7)*
- **FR-013**: El trabajo DEBE pedir el token al broker de contraseñas de Laravel (60 minutos de vida, uno cada 60 segundos), armar el link con el token y el email en el fragmento y encolar el correo con valores simples. NO DEBE enviar nada si la cuenta no existe, no está `active` o es de un admin (propuesta, Q5). *(§4.3; C3a FR-025)*
- **FR-014**: `forgot-password` DEBE limitarse a 5 por minuto y 20 por hora por red, con 429 y `Retry-After` al pasarse, y a 3 por hora por email, en silencio: el 202 es el mismo y no se encola nada. *(§4.6)*
- **FR-015**: Después de fijar o cambiar una contraseña (`reset-password` y `PUT /api/me/password` de C3a), el taller DEBE avisar al titular por correo. C3a deja un único punto por el que pasa toda contraseña, y ahí se engancha el aviso. Sin correo disponible, no envía nada y no falla. *(§4.3, D21)*
- **FR-016**: Con el registro abierto, `POST /api/auth/email/verification-notification` (sesión; 202; 3 correos por hora y cuenta) y `POST /api/auth/email/verify` (sesión; 204) DEBEN existir. El link del correo lleva sus datos firmados en el fragmento (`#verificar=`) y el front los confirma con un POST con sesión: NO DEBE existir ningún GET firmado en la API, porque Nginx registra la línea de cada pedido. Un enlace vencido, alterado o de otra cuenta responde 422 `validation_failed`. *(§4.4, §7)*

**Registro abierto** *(mitad del correo)*

- **FR-017**: `REGISTRATION_OPEN` (falso por omisión) DEBE gobernar el registro y su verificación. Apagado, `POST /api/auth/register` y las dos rutas de verificación DEBEN existir y responder 404 `not_found` (así siguen funcionando si las rutas se cachean) y `features.registration` vale `false`; encendido, vale `true`. Apagado, el taller se comporta como con C3a. *(§4.4, R2)*
- **FR-018**: `POST /api/auth/register {name, email, password, password_confirmation, privacyVersion}` DEBE crear una cuenta `student`, `active`, con el aviso de privacidad aceptado y el email sin verificar, iniciar la sesión (ID nuevo) y responder 201 con `{data: usuario}`. Aplica la canonicalización del email, la política de contraseñas y el nombre de C3a. Con el email sin verificar, el contenido responde 403 `email_unverified`. Un email que ya tiene cuenta recibe 422 `validation_failed` y su titular, un aviso por correo: el ADR acepta que el registro abierto revele qué emails existen y lo mitiga con los límites y con ese aviso (§12). La forma exacta de la respuesta es propuesta. *(§4.4, §7, §12)*
- **FR-019**: *(propuesta, Q3)* `REGISTRATION_ALLOWED_DOMAINS` (vacía: sin restricción) DEBE limitar el registro a esos dominios de email; otro dominio recibe 422 `validation_failed` con el motivo en español. [NEEDS CLARIFICATION: Q3, si el registro abierto se restringe a dominios. La recomendada: una lista en la configuración.] *(§13.20)*
- **FR-020**: El registro DEBE limitarse a 5 por hora por red (/48 en IPv6) y a un tope global por hora (propuesta: 100). *(§4.4, §4.6)*
- **FR-021**: El registro NO DEBE tocar las invitaciones pendientes: un desconocido no puede anular la de otro. Aceptar una invitación enviada por correo a un email que tiene una cuenta sin verificar DEBE reemplazar esa cuenta (la entrega prueba que el email es de quien acepta); si llegó por link, 409 `email_taken`, como en C3a. *(§4.1 paso 3, §4.4)*
- **FR-022**: Las cuentas creadas por el registro y nunca verificadas DEBEN suprimirse a los 7 días, por lotes y por el camino de supresión de FR-045, con una tarea del `scheduler`. *(§4.4)*

**Cambio de email** *(mitad del correo)*

- **FR-023**: `taller:change-email <actual> <nuevo>` DEBE cambiar el email de una cuenta (canonicalizado y comparado como en C3a), cerrar todas sus sesiones y rotar su token de «recordarme» (propuesta: el email es el dato con el que se recupera la cuenta, así que el cambio se trata como un cambio de contraseña), borrar su token de recuperación y avisar por correo a las dos direcciones. DEBE fallar, sin cambiar nada, si el email actual no tiene cuenta, si el nuevo ya tiene una cuenta o una invitación, o si no es un email válido. Conserva la verificación del email: quien opera responde por la dirección nueva. [NEEDS CLARIFICATION: Q2, si el cambio de email es sólo por consola. La recomendada: sólo por consola.] *(§7, D19, §13.9)*
- **FR-024**: El email de una cuenta NO DEBE poder cambiarse por HTTP: ni el titular (`PATCH /api/me` lo ignora, C3a) ni un admin (`PATCH /api/admin/users/{user}` no lo acepta). *(D19, §5.2)*

**Operación del correo** *(mitad del correo)*

- **FR-025**: `worker-mail` DEBE correr sin puertos publicados, con el disco de sólo lectura salvo un tmpfs, sin capacidades, con los límites de memoria y de procesos de los demás servicios, con reinicio automático y esperando a `mysql` sano y a `migrate` terminado. `backend/api/scripts/deploy.sh` DEBE levantarlo con el resto. *(D34)*
- **FR-026**: La prueba de C3a que exige que ningún contenedor de una red `internal` resuelva nombres de Internet (su FR-043) DEBE tener a `worker-mail` como única excepción explícita, y DEBE seguir comprobando que `php`, `scheduler` y `migrate` no los resuelven. *(C3a FR-043)*
- **FR-027**: `MAIL_REQUIRED`, `MAIL_MAILER`, `MAIL_FROM_*`, las credenciales del proveedor y `REGISTRATION_OPEN` DEBEN salir de la configuración. `sh backend/api/scripts/init-env.sh` DEBE agregar la contraseña del usuario de MySQL del correo con el patrón `add_missing` de C3a, sin pisar nunca un valor existente. Las credenciales del proveedor las pone quien opera en `.env`: el script no las inventa. *(C3a, contrato de consola)*
- **FR-028**: `db-grants` y el inicio de un volumen nuevo DEBEN crear el usuario de MySQL del correo con los privilegios de FR-005, en el mismo archivo que usa C3a para los privilegios (`docker/mysql/db-grants.sql`), sin que su contraseña entre en Git. Un archivo SQL estático ejecutado tal cual no puede llevar una contraseña de `.env`, así que el mecanismo lo decide el plan junto con C4, que tiene el mismo problema con sus cinco usuarios. El nombre lo fija el plan (D21 usa `taller_mail`; C4 propone `mail`). *(D21, D34; C3a, contrato de consola)*
- **FR-029**: La aplicación DEBE registrar, estructurado y a stderr, el id del trabajo, el tipo de mensaje, el resultado y un HMAC del destinatario (con la clave de los registros de C3a), y NO DEBE registrar el link, el token, el cuerpo ni el email en claro. *(D20; C3a FR-045)*
- **FR-030**: `api:smoke` y `deploy-check.sh` DEBEN seguir pasando con `worker-mail` en el stack y con o sin proveedor. `api:smoke` DEBE sumar que `forgot-password` responde 202 con correo disponible o 503 `mail_unavailable` en modo sólo link, y que `features.passwordReset` lo refleja. *(C3a FR-046)*

**Administración de usuarios e invitaciones** *(mitad de administración y ciclo de vida)*

- **FR-031**: Toda ruta de `/api/admin` DEBE exigir una sesión activa con el email verificado y el rol `admin` (un estudiante recibe 403 `forbidden`; sin sesión, 401), llevar la cuenta esperada (C3a FR-036) y limitarse a 120 por minuto por usuario. Ningún cuerpo recibe `user_id`: el destino es el de la ruta, y uno inexistente responde 404 `not_found`. *(§4.5, §4.6)*
- **FR-032**: `GET /api/admin/users` DEBE listar con paginación por offset (hasta 100 por página, con `page`, `perPage`, `total` y `lastPage` en camelCase) y los filtros `q` (nombre o email), `role`, `status` y `sort`. `GET /api/admin/users/{user}` DEBE devolver la ficha: `id`, `name`, `email`, `role`, `status`, si el email está verificado, la versión del aviso aceptada y las fechas de alta y de cambio. Nunca el hash, el token de «recordarme» ni textos del alumno. *(§7, §8)*
- **FR-033**: `PATCH /api/admin/users/{user}` DEBE cambiar sólo `role` y `status` (ningún otro campo, tampoco `email`), con `status` limitado a `active` y `disabled` (`deleting` lo crea la supresión), y exigir `password.confirm` (423 sin confirmar). Es el camino soportado para deshabilitar, rehabilitar, promover y degradar una cuenta, y `tinker` deja de hacer falta. *(§7, D19; C3a, «Sin hacer a propósito»)*
- **FR-034**: Ninguna operación DEBE dejar al taller sin una cuenta admin `active`. Deshabilitar, degradar o suprimir al único responde 409 `last_admin` (con su mensaje en español), y un admin que se deshabilita o se degrada a sí mismo recibe 422 `validation_failed`, que se evalúa primero (propuesta). La guardia se decide bajo un bloqueo que evita la carrera: dos pedidos simultáneos que dejarían cero admins no pasan los dos. *(§4.5)*
- **FR-035**: Deshabilitar, degradar o suprimir a un admin DEBE borrar, en la misma transacción, las invitaciones pendientes que creó; deshabilitar cualquier cuenta, su token de recuperación; y promover a admin, rotar su `remember_token` y avisarle por correo. Toda cuenta que deja de estar `active` pierde sus sesiones en el siguiente pedido (C3a FR-007). Después de confirmar, C3b DEBE disparar un evento (cuenta deshabilitada, degradada o en supresión) al que B2 se engancha para cancelar las ejecuciones activas con su operación (B2 FR-050): C3b es el dueño del punto de extensión y B2 lo consume, así que el orden de entrega entre los dos no importa. *(§4.5, D08, D18, D19)*
- **FR-036**: `POST /api/admin/users/{user}/password-reset` DEBE exigir `password.confirm`, valer sólo para estudiantes (422 `validation_failed` si el destino es admin), encolar el correo de recuperación al titular y responder 202 sin devolver nunca el link. En modo sólo link responde 503 `mail_unavailable`. El link para un admin, o sin correo, sale sólo por `taller:password-reset-link`. *(§4.3, D19)*
- **FR-037**: `GET /api/admin/invitations` DEBE listar paginado, NUNCA devolver tokens y destacar las invitaciones de admin pendientes (la interfaz las muestra siempre, porque en modo sólo link nadie recibe un correo que avise). Cada una lleva `email`, `role`, `delivery`, `expiresAt`, `sentAt`, `sendFailedAt` y quién la creó. *(§4.1 paso 6, §7)*
- **FR-038**: `POST /api/admin/invitations {emails[1..100], role, delivery}` DEBE procesar cada email en su propia transacción corta (el UNIQUE resuelve la carrera entre dos admins) y responder 200 con un resultado por email: `created`, `renewed` (una vencida, con el rol del pedido), `user_exists`, `invitation_pending` o `rate_limited`. Con `delivery=link` trae el link una sola vez; con `delivery=email` encola el correo después del COMMIT y no trae el link; en modo sólo link responde 503 `mail_unavailable`. Crear o renovar una invitación de admin exige `password.confirm`. Cada admin envía como mucho 300 correos por día (los links no cuentan). *(§4.1, §4.6)*
- **FR-039**: `POST /api/admin/invitations/{invitation}/resend` DEBE rotar el token y el vencimiento (el link anterior deja de valer), exigir `password.confirm` si es de admin y devolver `{url}` sólo con `delivery=link`. `DELETE /api/admin/invitations/{invitation}` DEBE revocarla y responder 204. *(§4.1 paso 4)*
- **FR-040**: Las acciones de admin DEBEN quedar en los registros con actor, destino y acción (invitar, reenviar, revocar, cambiar rol o estado, suprimir y disparar recuperaciones), sin una tabla de auditoría: no son logins (R5). *(D20)*
- **FR-041**: Ninguna respuesta con éxito de `/api/admin/*` DEBE contener las claves `code`, `reflection`, `note`, `body`, `custom_test` ni `raw_payload`, es decir, ni código ni textos del alumno. Una prueba recorre todas las rutas de `/api/admin/` (también las que sume C5) y falla si aparece alguna. El `code` de un cuerpo de error es el código de error de la API, no el del alumno. *(§4.5, D31)*

**Ciclo de vida de la cuenta** *(mitad de administración y ciclo de vida)*

- **FR-042**: `UserData` DEBE ser el único registro de lo que el taller guarda de una cuenta, con `export()` y `purge()`: cada dueño de tablas del alumno (C3a, B2 y D1) declara las suyas. Una prueba de cobertura contra `information_schema` DEBE fallar si una tabla con `user_id` (o hija de una) no figura en la exportación o no figura en la supresión, o no está en una lista de excepciones con su motivo. La supresión DEBE funcionar también cuando las tablas de B2 o de D1 todavía no existen, y cubrirlas cuando existan. La clave foránea con cascada hacia `users` que C3a exige en toda tabla con `user_id` (su FR-004) es la red de seguridad de la supresión, no su mecanismo: la purga borra por lotes primero (D06). *(§8, D06, D33; C3a FR-004)*
- **FR-043**: `POST /api/me/export` DEBE exigir sesión y `password.confirm`, valer sólo para el titular, limitarse a 3 por día y entregar en streaming un archivo JSON con la cuenta (sin hash ni token), la foto de progreso v2 (la que arma el lector único de D1), los intentos con el payload conservado y los crudos importados. Lee cada tabla en una transacción corta: no sostiene una transacción larga que frene un DDL, y por eso no es una foto atómica entre tablas. NO incluye sesiones, invitaciones ni tokens, y no existe una exportación de admin. *(D33, §7; Ley 25.326, art. 14)*
- **FR-044**: `DELETE /api/me` DEBE exigir sesión y `password.confirm` y responder 202, o 409 `last_admin` si la cuenta es el único admin activo. El pedido de supresión DEBE, en una transacción corta, pasar la cuenta a `deleting`, borrar sus sesiones, rotar su token de «recordarme», borrar las invitaciones pendientes que creó (si es admin) y las de su email, y su token de recuperación; después del COMMIT encola `PurgeUserData` y dispara el evento de FR-035. Desde entonces la cuenta no entra: el ingreso falla como una credencial inválida y una sesión viva recibe 401 (C3a). `DELETE /api/admin/users/{user}` hace lo mismo para otra cuenta, con la contraseña reconfirmada del admin. *(D06, §7)*
- **FR-045**: `PurgeUserData` (cola `default`) DEBE ser idempotente, único por cuenta y reintentarse con espera creciente. Cancela las ejecuciones que sigan activas con la operación de B2 (si B2 ya existe) y borra por lotes, en el orden de D06 y de B2 (`runs`, `exercise_progress`, `attempts` con sus hijas en cascada y `sync_operations`). En una transacción final toma la cabecera del usuario (`progress_heads`, si existe) antes de borrar la fila de `users`, cuya cascada se lleva el resto, e inserta la fila de `account_deletions`. Después avisa por correo al email que guardó el trabajo. Al terminar, ninguna tabla guarda una fila con ese `user_id`. *(D06, D08)*
- **FR-046**: Una tarea del `scheduler`, cada 5 minutos, DEBE volver a despachar la purga de las cuentas que llevan más de 15 minutos en `deleting` y avisarlo en los registros. *(D06, §7; el ADR dice los dos plazos y se toman los dos)*
- **FR-047**: `account_deletions` DEBE tener `user_id` (clave primaria), `user_created_at` y `deleted_at`, sin datos personales ni clave foránea, con un índice por `deleted_at`. Nace en una migración con un solo `CREATE TABLE`, se poda a los 35 días y figura en la lista de excepciones de la prueba de esquema de C3a (su FR-004). Se copia junto a cada respaldo (C4). *(§5.2, D37)*
- **FR-048**: `taller:reapply-deletions <archivo>` DEBE reaplicar el libro (la copia más reciente, tomada junto al respaldo) sobre una base restaurada: borra, por el camino de FR-045, las cuentas del libro cuyo `user_created_at` coincide con el de la cuenta existente, NO borra una cuenta nueva que recibió un id reutilizado y es idempotente. Corre después de restaurar el volcado y el binlog, y antes de abrir el tráfico. *(D37)*
- **FR-049**: «Borrar todo» (D1) NO DEBE confundirse con la supresión: borra el estado de estudio y deja los intentos, los payloads y las importaciones; suprimir la cuenta es lo único que los borra. La respuesta de `DELETE /api/me` y el contrato de C3b lo dicen, para que la pantalla lo diga. *(D1, Q2; Ley 25.326, art. 16)*

**Operación de la administración y del ciclo de vida** *(mitad de administración y ciclo de vida)*

- **FR-050**: El `scheduler` DEBE procesar la cola `default` cada minuto, sin solaparse, y agendar la poda de `failed_jobs` a los 7 días, la poda de `account_deletions` a los 35 y el barrido de FR-046, además de las tareas de C3a. *(D34, D30, §7)*

**Verificación** (pruebas que el cambio DEBE traer antes de la implementación, según la constitución II)

- **FR-051**: *(mitad del correo)* Las pruebas DEBEN correr con Pest contra MySQL 9.7 real, con `MAIL_MAILER=array` y los drivers `database` de cola fijados por prueba cuando tratan de reintentos o de la cola `mail`, y cubrir: cada uno de los ocho mensajes (destinatario, vencimiento, texto en español, link desde `APP_URL`, sin contraseñas), el 202 uniforme de `forgot-password` con el mismo número de consultas para una cuenta que existe y una que no, el modo sólo link, los reintentos con relojes fijados (incluido el correo que no se envía vencido su link), el cifrado de `mail_jobs` y la prueba del usuario de MySQL real del correo (FR-005). *(§8; `backend/api/AGENTS.md`)*
- **FR-052**: *(mitad del correo)* DEBE existir una prueba de punta a punta contra el stack levantado y un servidor SMTP de pruebas: una invitación por correo creada por la API sale por `worker-mail`, con su usuario restringido, y llega a Mailpit con un link que abre. Si el usuario no autoriza Mailpit, es una verificación manual declarada como límite. *(D21)*
- **FR-053**: *(mitad de administración y ciclo de vida)* Las pruebas de administración DEBEN cubrir: la matriz de IDOR y de acceso (estudiante, sin sesión y sin cuenta esperada en cada ruta de `/api/admin`, y la exportación y la supresión sólo del titular), la matriz de `password.confirm` (qué rutas lo exigen y cuáles no), la guardia del último admin incluida la carrera con conexiones paralelas, los efectos de FR-035 y FR-041. *(§4.5, §8)*
- **FR-054**: *(mitad de administración y ciclo de vida)* Las pruebas del ciclo de vida DEBEN cubrir: `DELETE FROM users` de una cuenta con todas las tablas pobladas (las de C3a, B2 y D1 que existan) sin error de clave foránea y sin filas restantes; la cobertura de `UserData` (FR-042); la idempotencia y el reintento de la purga; el barrido; el libro y `taller:reapply-deletions` con un id reutilizado; y la exportación, que sólo trae lo propio y no sostiene una transacción larga. *(§8, D06, D37)*
- **FR-055**: *(compartido)* El código nuevo DEBE pasar el análisis estático en el nivel 9 que fija `phpstan.neon` desde C6, sin baseline ni errores ignorados, y Pint, `npm test`, `npm run lint`, `npm run format:check` y `git diff --check`. La documentación que cita el correo, la administración o la supresión (`backend/api/AGENTS.md`, `docs/architecture.md`, el README y los contratos) DEBE actualizarse en el mismo cambio, igual que `docker/compose.yaml`, `init-env.sh` y `db-grants.sql`. *(C6 FR-012; `AGENTS.md`)*

### Key Entities *(include if feature involves data)*

- **Correo:** un mensaje de texto plano, en español, que el taller manda a una persona. Hay ocho tipos (FR-010). No es una notificación en pantalla ni una auditoría.
- **Cola de correo:** `mail_jobs`. Guarda los correos pendientes como trabajos cifrados con todos sus datos. Sólo la lee `worker-mail`.
- **`worker-mail`:** el único servicio que habla con el proveedor. Tiene `APP_KEY`, las credenciales del proveedor y un usuario de MySQL que sólo toca su cola.
- **Proveedor de correo:** el tercero, por SMTP o por API, que entrega el mensaje. Ve cada mensaje con su link y es encargado del tratamiento de datos personales.
- **Modo sólo link:** el estado del taller cuando no puede mandar correo. Las invitaciones y las recuperaciones salen como links por consola o en la respuesta del admin, y `features.passwordReset` vale `false`.
- **Invitación por correo y por link:** la misma invitación (de un solo uso, ligada a un email y con rol inicial) según su `delivery`. Por correo, el link viaja en el mensaje; por link, el admin lo recibe una sola vez en la respuesta.
- **Cuenta sin verificar:** una cuenta creada por el registro abierto cuyo email todavía no se confirmó. No entra al contenido y se suprime a los 7 días.
- **Deshabilitar y suprimir:** deshabilitar (`disabled`) es reversible y conserva la cuenta y sus datos; suprimir (`deleting` y después el borrado físico de todo lo de la cuenta) no se deshace.
- **«Borrar todo» frente a suprimir:** «Borrar todo» (D1) borra el estado de estudio de la cuenta y deja intentos, payloads e importaciones; suprimir los borra.
- **Último admin:** el único admin con estado `active`. Ninguna operación puede dejar al taller sin uno.
- **`UserData`:** el registro de todo lo que el taller guarda de una cuenta, con `export()` y `purge()`. Cada dueño de tablas del alumno declara las suyas.
- **Exportación del titular:** el archivo JSON, sólo del titular, con su cuenta, su progreso, sus intentos y sus crudos importados.
- **Libro de supresiones:** `account_deletions`. Cada fila dice qué id y de qué cuenta se suprimió y cuándo, sin datos personales, para reaplicar la supresión tras restaurar un respaldo.
- **Evento de cuenta que deja de estar activa:** lo que C3b dispara después de confirmar un cambio de cuenta, y a lo que B2 se engancha para cancelar ejecuciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los ocho correos llegan a un servidor SMTP de pruebas con su texto en español, el link armado desde `APP_URL` y el token sólo en el fragmento (8 de 8), con 0 contraseñas en los mensajes y 0 links en los registros.
- **SC-002**: Para `forgot-password`, un email con cuenta y uno sin cuenta dan 0 diferencias de estado y de cuerpo, y el pedido hace 0 consultas a `users` y el mismo número de consultas en los dos casos. Con correo disponible, el correo sale hacia el proveedor en 3 minutos o menos.
- **SC-003**: Con el proveedor caído, el 100 % de los correos se reintenta con espera creciente, ninguno se envía vencido su link y los que agotan los reintentos dejan su registro en `failed_jobs` (y `send_failed_at`, si eran invitaciones). 0 pedidos HTTP esperaron al proveedor.
- **SC-004**: En el stack, un solo servicio (`worker-mail`) está en la red de egreso, y `php`, `scheduler` y `migrate` resuelven 0 nombres de Internet. El usuario de MySQL del correo pasa el 100 % de sus pruebas positivas y negativas, y `worker-mail` envía sin poder leer `users`.
- **SC-005**: En una matriz de caminos (deshabilitar, degradar y suprimir, a otro admin y a sí mismo) con un solo admin y con dos, 0 resultados dejan al taller sin un admin activo; en 20 corridas de dos pedidos simultáneos entre dos admins, queda al menos uno activo en las 20.
- **SC-006**: El 100 % de las rutas de `/api/admin` responde 403 a un estudiante, 401 sin sesión y 409 sin la cuenta esperada; las que la matriz marca responden 423 sin confirmar; y 0 respuestas con éxito traen claves de textos del alumno.
- **SC-007**: Después de suprimir una cuenta con todas las tablas pobladas, hay 0 filas con su `user_id` en cualquier tabla del esquema, 1 fila en `account_deletions` sin datos personales, y la exportación hecha antes trae lo propio y 0 filas de otra cuenta.
- **SC-008**: Una purga cortada a la mitad se retoma sola en 20 minutos o menos y termina con el mismo resultado que una sin corte (0 filas, 1 fila en el libro).
- **SC-009**: `taller:reapply-deletions` sobre una base restaurada borra el 100 % de las cuentas del libro cuyo `user_created_at` coincide y 0 cuentas nuevas con un id reutilizado.
- **SC-010**: En modo sólo link, 0 correos se encolan, `features.passwordReset` es `false`, 3 de 3 caminos que piden correo (`forgot-password`, la invitación `delivery=email` y la recuperación de un tercero) responden 503 `mail_unavailable`, y los links por consola y por respuesta del admin siguen funcionando.
- **SC-011**: Con el registro apagado, 3 de 3 rutas responden 404; encendido, el recorrido registrarse, verificar y pedir contenido pasa de 403 a 200.
- **SC-012**: Pasan `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` (nivel 9, 0 errores), `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.

## Assumptions

- **Fuente.** La fuente técnica es el ADR 0006, en estado «propuesta» y a la espera de su aprobación (acción del usuario de la hoja de ruta). Si lo enmienda, esta spec se ajusta. Las preguntas 3, 9 y 20 de §13 se cierran en el clarify de esta spec (Q1 a Q3).
- **Punto de partida.** C3b se implementa sobre C3a ya entregada: C1, C2, C6 y C3a. Esta spec supone el plan de C3a (`specs/004-c3-identidad-acceso/plan.md`, rama `spec/c3-identidad`, commits `57da802` a `c76ef90`), que no está en esta rama: lo que toma de ahí va como supuesto, y se ajusta si cambia.
- **Orden respecto de B2 y D1.** B2 supone que C3b llega después (su FR-043 y FR-050), y D1 acepta cualquiera de los dos órdenes. Esta spec resuelve el orden con el registro de `UserData` (FR-042) y con un evento que C3b dispara y B2 consume (FR-035): llegue C3b antes o después, el que llega último suma sus tablas o se engancha, y una prueba lo exige. La hoja de ruta hoy sólo ata C3b a C3 (C3a).
- **Un solo servidor,** con la carga de referencia del ADR (S2: hasta unas 5.000 cuentas y unas 1.000 activas en el pico) y el supuesto de trabajo de un aula de 40.
- **Sin pantallas.** C3b entrega el contrato HTTP. Las pantallas de cuenta (recuperar la contraseña, exportar y borrar la cuenta, verificar el email, el registro) y las de administración son del épico del front. El coordinador indicó que F11 trae todas las de cuenta y F12 las de administración. La rama `spec/front-react` que se pudo leer (commit `cca5fdf`, `specs/front-react/roadmap.md`) todavía define F11 sólo como login e invitación, deja las demás pantallas de cuenta como decisión abierta y no tiene F12: se toma lo del coordinador como supuesto.
- **Modo sólo link por omisión.** Mientras no haya un proveedor y un `APP_URL` público, el taller sigue en el modo sólo link de C3a. `features.passwordReset` vale `true` cuando el correo puede salir (el mailer no es `log` ni `array`, o `MAIL_REQUIRED` es falso) y `features.registration` sigue a `REGISTRATION_OPEN`. Ambos salen de `config('taller.features')`, que C3a deja listo.
- **`features.passwordReset` también es la bandera de «hay correo».** Es lo que dice el ADR (§4.8: el admin sólo ve «copiar link» cuando vale `false`). No se agrega una bandera nueva.
- **Un solo proceso de `worker-mail`.** Alcanza para el volumen esperado (cientos de correos por día); el camino de escala está en el ADR (§9).
- **El proveedor lo decide Q1.** Hasta entonces, los requisitos sirven con cualquiera por SMTP o por API, y la recomendada (Brevo por SMTP) es el borrador.
- **Las skills no mandan sobre el ADR.** Las skills de Laravel proponen paquetes, notificaciones que releen el modelo y coberturas que el proyecto no adopta. Donde difieren, mandan el ADR y las decisiones del usuario.
- **Propuestas que no vienen del ADR:**
  - Los reintentos del correo a 1, 5, 15 y 60 minutos, con tope en la vida del link o en 24 horas (FR-007).
  - Que un correo no se envíe vencido su link (FR-007).
  - El tope global de registros por hora en 100 (FR-020).
  - Que cambiar el email cierre las sesiones y rote el token de «recordarme», y que conserve la verificación (FR-023).
  - Que `forgot-password` no envíe nada a un admin (Q5).
  - Que un admin que se deshabilita o se degrada a sí mismo reciba 422 `validation_failed`, y que `PATCH /api/admin/users/{user}` acepte sólo `role` y `status` (FR-033 y FR-034).
  - El correo de aviso a quien alguien intentó registrar con su email (FR-010 y FR-018) y la forma de la respuesta del registro con un email existente.
  - Que el barrido de `deleting` corra cada 5 minutos sobre las cuentas de más de 15 (FR-046: el ADR dice los dos plazos).
  - Que la poda de `failed_jobs` la agende el `scheduler` (FR-050): C3a no la agenda.
  - Que las rutas de verificación de email sigan al interruptor del registro y respondan 404 apagado (FR-017).
  - Que la exportación no sea una foto atómica entre tablas (FR-043).
- **Dependencias.** C3a (entregada antes). Para cubrir las tablas de B2 y D1 en la supresión y la exportación, B2 y D1, o su registro en `UserData` cuando lleguen. C3b habilita a C4 y al front (F11 y F12). Esta spec no toca la hoja de ruta ni la spec de C3a.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Q1 a Q5 tienen sus propias tablas arriba.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Cómo se parte C3b | No partir; partir el correo como C3c; partir el ciclo de vida como C3c; partir en tres | Q4, sin decidir. La propuesta separa el correo: cortar sólo el ciclo de vida deja una mitad de 46 requisitos con la decisión externa adentro, y partir en tres (administración, correo y ciclo de vida) suma dos IDs y tres ciclos de Spec Kit y deja una spec de administración de pocos requisitos |
| Quién habla con el proveedor | `worker-mail` aislado; `php` con salida a Internet; un relay propio delante del worker | `worker-mail` aislado (D21). Que `php` salga a Internet reabre lo que C1 cerró. El relay propio es la opción E de Q1 |
| SMTP o API del proveedor | SMTP; el driver de API del proveedor | SMTP cuando el proveedor lo ofrece: no suma paquetes ni un SDK al worker. La API sólo si el plan gratuito o la región lo exigen |
| Dónde se arma la recuperación | En el pedido; en un trabajo de la cola `default` | En un trabajo (§4.3): el pedido no consulta la cuenta, así que el tiempo no la revela. Cuesta hasta un minuto más hasta que el `scheduler` lo procesa |
| Formato del correo | HTML con plantilla; texto plano | Texto plano: un link por mensaje, sin imágenes ni rastreo, y nada que mantener |
| La cola de correo | La tabla `jobs` general con el mismo usuario; `mail_jobs` con un usuario propio | `mail_jobs` y su usuario: sólo así el usuario de MySQL del worker se limita a la cola de correo (D21) |
| Qué lleva un trabajo de correo | Un modelo `User` que se relee al enviar; valores simples cifrados | Valores simples: el worker no puede leer `users` (FR-004). Cuesta que el trabajo lleve su propio texto |
| Dónde vive `UserData` | Una lista fija que escribe C3b; un registro al que cada dueño suma sus tablas, con una prueba de cobertura | El registro: el orden de entrega con B2 y D1 deja de importar y una tabla nueva no se escapa |
| Cuándo se suprime una cuenta | Inmediato (D06); con un plazo de gracia reversible | Inmediato: el art. 16 pide suprimir en 5 días hábiles tras el reclamo, y un estado intermedio sumaría casos (`deleting` ya cubre la purga). Cuesta que un borrado por error no se deshaga |
| Cómo se exporta | Una transacción larga (foto atómica); transacciones cortas por tabla | Transacciones cortas (D33 y D35): una transacción larga frena los DDL de los despliegues. Cuesta que no sea una foto atómica |
| Respuesta del registro con un email existente | Uniforme, sin sesión; 201 con sesión y 422 si el email existe | 201 con sesión y 422 (§7): el ADR acepta que el registro revele qué emails existen y lo mitiga con límites y con un aviso al titular (§12) |
| Quién evita quedarse sin admin | Un chequeo antes de escribir; un bloqueo que serializa los cambios de admins | El bloqueo (§4.5): un chequeo sin él deja pasar a dos pedidos simultáneos |

## Riesgos

1. **El correo es la salida más peligrosa del taller.** `worker-mail` es el único contenedor de la aplicación con Internet y tiene `APP_KEY` y las credenciales del proveedor. Con `APP_KEY` podría falsificar links firmados y cookies de dispositivo, no leer otras tablas (ADR §12). *Mitigación:* red propia con `mysql`, usuario de MySQL mínimo con su prueba (FR-005), trabajos con valores simples, credenciales fuera del ancla común y la prueba de configuración de FR-002.
2. **Un tercero ve cada link.** El proveedor procesa el mensaje con su token. *Mitigación:* un solo uso, vencimientos cortos, sin rastreo de clics, y elegir un proveedor de confianza (Q1).
3. **Entregabilidad y dominio.** Sin SPF y DKIM el correo cae en spam o se rechaza, y un subdominio gratuito de DNS dinámico puede no dejar publicarlos. *Mitigación:* la acción del usuario sobre el dominio, un envío de prueba a tres buzones y el modo sólo link como respaldo.
4. **Fallas silenciosas.** `sent_at` no prueba la llegada y no hay rebotes. *Mitigación:* `sent_at` y `send_failed_at` visibles en la lista de invitaciones, la reemisión por link y la recuperación que se puede volver a pedir. Los webhooks quedan fuera.
5. **`APP_URL` hasta C4.** Un correo real con `http://localhost:8080` no sirve. *Mitigación:* el modo sólo link por omisión, la advertencia de `worker-mail` y la acción del usuario.
6. **Una purga que queda a medias.** *Mitigación:* idempotente y única por cuenta, con barrido, y `deleting` sin ingreso (FR-044 a FR-046).
7. **Una tabla nueva que se escapa de la exportación o de la supresión.** *Mitigación:* el registro de `UserData` y la prueba de cobertura contra `information_schema` en cada ítem que cree tablas (FR-042).
8. **La carrera del último admin.** *Mitigación:* el bloqueo de FR-034 y pruebas con conexiones paralelas (FR-053).
9. **Una sesión de admin robada.** *Mitigación:* `password.confirm` en cada acción sensible, los links de recuperación de terceros sólo por consola, el cambio de email sólo por consola, las invitaciones de admin de 48 horas, el aviso al promover y una cuenta de admin separada (recomendada en C3a, Q3). Queda el riesgo del ADR: el admin sin segundo factor (§4.10).
10. **La exportación ocupa PHP-FPM.** Un archivo grande retiene un proceso (el ADR §9 cuenta 5 hijos). *Mitigación:* 3 por día y cuenta, transacciones cortas y medir antes de ajustar FPM.
11. **La cola `default` es compartida.** Una purga larga retrasa los correos de recuperación hasta que el `scheduler` vuelve a correr (no se solapa). *Mitigación:* lotes chicos y el disparador de §9 para un worker propio.
12. **Trabajo en paralelo con B2, D1 y C4.** Comparten `docker/compose.yaml`, `docker/mysql/db-grants.sql`, `init-env.sh`, `routes/api/`, `bootstrap/app.php`, `lang/es` y `backend/api/AGENTS.md`. *Mitigación:* los integra el coordinador, y cada ítem suma su archivo de rutas.
13. **Datos personales y transferencia (Ley 25.326).** El proveedor procesa emails y nombres. *Mitigación:* Q1, el aviso de privacidad que nombra al proveedor y la confirmación de quien responde por la base.
14. **Registro abierto: abuso y enumeración.** *Mitigación:* apagado por omisión, topes por red y globales, restricción por dominio (Q3), `verified` en el contenido y el aviso al titular.
15. **Las dependencias son borradores.** El ADR 0006, el plan de C3a, B2, D1, C4 y el épico del front no pasaron por el clarify. *Mitigación:* lo que se toma de ellos está marcado como supuesto.
16. **C3b es la mitad grande.** *Mitigación:* la propuesta de corte de «Partición» y Q4.

## Relación con C3a, B2, D1, C4 y el front

Lo que sigue sale de los borradores de las ramas hermanas, que no pasaron por el clarify. Se lee como supuesto y se ajusta si cambian. Se citan por ruta y por rama, sin enlace, porque todavía no están en esta rama.

**Lo que C3b toma de C3a** (plan en `specs/004-c3-identidad-acceso/` de la rama `spec/c3-identidad`, commits `57da802` a `c76ef90`):

- `invitations` nace completa, con `delivery`, `sent_at` y `send_failed_at`.
- `role`, `status` y el grupo de middleware de cuenta activa; `AccountSessions::endAll`; `RequirePassword` con `isConfirmed` y `markConfirmed`.
- La prueba de esquema de FR-004 con su lista de excepciones.
- `config('taller.features')`, que alimenta `GET /api/session`.
- `Invitations::issue` (que sólo crea invitaciones por link: C3b le suma la entrega) y `PasswordResetLinks`.
- `ApiCode` y `ApiError::of`, los limitadores con nombre y un archivo de rutas propio en `routes/api/`.
- El `scheduler`, `docker/mysql/db-grants.sql` como único archivo de usuarios y privilegios de MySQL, y `init-env.sh` con el patrón `add_missing`, cuya estructura es de C3a.

**Lo que C3b cambia en lo de C3a** (lo integra el coordinador):

1. `Invitations::accept` reemplaza una cuenta sin verificar cuando la invitación llegó por correo (FR-021).
2. El punto único de contraseñas dispara el aviso de FR-015.
3. `features.passwordReset` y `features.registration` dejan de ser `false` (FR-008 y FR-017).
4. La lista blanca de la prueba de recorrido de C3a (su FR-048) suma `forgot-password` y `register`; las dos rutas de verificación van con sesión, pero sin `verified`.
5. La prueba de DNS de C3a (su FR-043) exceptúa a `worker-mail` (FR-026).
6. `deploy.sh` suma `worker-mail`, y el `scheduler` suma procesar `default` y las tareas de FR-050.
7. `ApiCode` suma `last_admin` y `mail_unavailable`, y los limitadores suman los de esta spec.

**Con B2** (`specs/005-b2-api-ejecuciones/`, rama `spec/b2-ejecuciones`):

- B2 supone que C3b llama a su operación de cancelar ejecuciones (su FR-050) al deshabilitar, degradar o suprimir. El contrato de C3a dice, en cambio, que C3b «trae» el punto de extensión. Esta spec lo resuelve así: C3b dispara el evento y B2 se engancha (FR-035), y el orden de entrega no importa.
- B2 deja documentado el orden de borrado (`runs`, `exercise_progress`, `attempts` y sus hijas) y una prueba de `DELETE FROM users` con sus seis tablas pobladas. C3b usa ese orden en `PurgeUserData` (FR-045).

**Con D1** (`specs/007-d1-progreso-sincronizacion/`, rama `spec/d1-progreso`):

- La supresión real de los datos del alumno es borrar la cuenta (esta spec): «Borrar todo» no borra intentos ni importaciones (FR-049). La pantalla de D1 tiene que decirlo.
- La exportación y la supresión cubren sus 12 tablas (FR-042), y la exportación usa el lector único de la foto de D1 (su FR-023). `sync_operations` se borra por lotes (FR-045).

**Con C4** (`specs/008-c4-exposicion/`, rama `spec/c4-exposicion`):

- C4 depende de las dos mitades de C3b: `account_deletions` y `taller:reapply-deletions` para el respaldo y su restauración, y `worker-mail` y el usuario de MySQL del correo para su matriz de usuarios. C3b crea ese usuario en `db-grants.sql` y C4 lo adopta (el nombre: D21 dice `taller_mail`, C4 propone `mail`).
- El archivo `db-grants.sql` es estático y se ejecuta tal cual: no puede llevar una contraseña tomada de `.env`. C3b y C4 necesitan el mismo mecanismo (FR-028).
- El aviso al operador por correo que C4 considera en su Q4 (opción B) usaría el canal de C3b, sin que C3b lo pida (YAGNI).
- La prueba de puertos de C4 (su FR-001) tiene que correr sin el perfil `dev`: Mailpit publica una interfaz en `127.0.0.1`.
- El «único dueño» de `init-env.sh` es C3a, y C3b sólo suma líneas `add_missing`: es lo que dice el contrato de C3a.

**Con el front** (`specs/front-react/roadmap.md`, rama `spec/front-react`, commit `cca5fdf`):

- F11 y F12 tienen que manejar `password.confirm` (423) en cada acción sensible, `Retry-After`, el modo sólo link (ocultar «enviar por correo» según `features.passwordReset`), el link de una invitación que se muestra una sola vez, y el borrado del fragmento con `history.replaceState` para `#invitacion=`, `#restablecer=` y `#verificar=`.
- La descarga de la exportación es un POST con una respuesta en streaming: el front la baja con `fetch` y la guarda como archivo.
- La rama del front que se pudo leer no tiene F12 y define F11 sólo como login e invitación: el coordinador tiene que alinearla.

## Fuentes consultadas el 2026-10-05

- ADR 0006, ADR 0004 y la hoja de ruta de este repositorio; la constitución y `AGENTS.md`.
- La spec de C3a (esta rama) y su plan, investigación, modelo de datos y contratos (rama `spec/c3-identidad`, commits `57da802` a `c76ef90`); los borradores de B2, D1 y C4 y la hoja de ruta del épico del front, por ruta y rama.
- Laravel 13, [«Mail»](https://laravel.com/docs/13.x/mail), «Driver / Transport Prerequisites».
- Metadatos de paquetes e imágenes: [Packagist](https://packagist.org), la API de árboles de GitHub y la API de Docker Hub (`axllent/mailpit` y `boky/postfix`). Licencias de la API de GitHub.
- Ley 25.326 y la AAIP: [transferencias internacionales](https://www.argentina.gob.ar/transferencias-internacionales) y un resumen de la [Resolución AAIP 198/2023](https://abogados.com.ar/nueva-regulacion-sobre-transferencias-internacionales-de-datos-personales/33745).
- Proveedores: [precios de Resend](https://resend.com/pricing) y [sus regiones](https://resend.com/docs/dashboard/domains/regions), [precios de Amazon SES](https://aws.amazon.com/ses/pricing/), [límites de envío de Google Workspace](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace). De terceros, a confirmar: lo de Brevo (plan gratuito y alojamiento en la UE), Mailgun, Postmark y el límite de un Gmail personal.
