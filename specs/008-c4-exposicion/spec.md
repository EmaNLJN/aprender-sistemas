# Feature Specification: C4 · Exposición

**Feature Branch**: `008-c4-exposicion` (nombre de la feature; el proyecto no crea una rama por feature)

**Created**: 2026-10-05

**Status**: Borrador con preguntas abiertas (Q1 a Q5); falta el clarify

**Input**: Ítem **C4** de la hoja de ruta [`specs/backend-multiusuario/roadmap.md`](../backend-multiusuario/roadmap.md), «Exposición»: exponer el taller en Internet con certificado propio, cabeceras estrictas y mínimo privilegio. Depende de A3 y de C3. Fuente técnica: el [ADR 0004](../../docs/adr/0004-backend-laravel-mysql-contenido-y-progreso.md) (§1, «Exposición con certificado propio», aceptado), el [ADR 0005](../../docs/adr/0005-ejecucion-en-sandbox-propio.md) y el [ADR 0006](../../docs/adr/0006-modelo-de-datos-y-api-multiusuario.md) (propuesta: §4.2, §4.6, §9, §10, §12 y las decisiones D21, D34, D35 y D37), más el [ADR 0001](../../docs/adr/0001-react-vite-y-backend-diferido.md) por el contrato del HTML autónomo. Lo que dicen los borradores de C3a, A2 y del épico del front, que no pasaron por el clarify, entra como supuesto (ver «Relación con C3, A3 y el front»). Pedido del usuario del 2026-10-05 (ver «Lo que pidió el usuario»).

## Intención y alcance

**Lo que entendemos.** Hoy el taller sólo se alcanza desde el mismo equipo: Nginx escucha en `127.0.0.1:8080` por HTTP, sin certificado; su política de contenido permite `'unsafe-inline'`; todos los servicios entran a MySQL con el mismo usuario, `taller`, que tiene todos los privilegios sobre la base; y no hay ninguna copia fuera del host. C3 le da cuentas y sesión, y A3 hace que el front lea el contenido de la API detrás de esa sesión: con eso el taller ya sabe quién entra y qué puede ver, pero sigue alcanzable sólo desde el mismo equipo. C4 hace la apertura. El taller responde en un nombre propio por HTTPS, con un certificado que él mismo obtiene y renueva; el navegador recibe una política estricta; los límites ven a cada cliente por su IP real; cada servicio entra a MySQL con lo que necesita y nada más; y existe una copia cifrada fuera del host que se probó restaurar. Es para quien opera el taller, que es quien abre el router, y para los alumnos que entran desde cualquier lugar. Si esto no coincide con lo que se busca, es lo primero que hay que corregir: el resto de la spec sale de acá.

**Cómo sabremos que salió bien.**

1. Desde una red de afuera, `https://<dominio>` abre el taller y deja ingresar con una invitación. `http://` termina en `https://`, y por la IP o con otro nombre no se sirve nada del taller.
2. El certificado se obtiene y se renueva solo, sin cortar el servicio. Si falla, se ve en los registros y quien opera se entera con margen (Q4).
3. Cada respuesta lleva las cabeceras de FR-013, la política de contenido no permite scripts en línea ni `'unsafe-eval'` (y los estilos, según Q3), y recorrer el taller en un navegador real no produce ninguna violación.
4. Los límites por red cuentan a cada cliente por su IP real, y nada que mande el cliente la cambia.
5. Ningún servicio usa root ni los privilegios de toda la base: cada uno tiene los suyos, y una prueba con los usuarios reales lo demuestra por lo que pueden y por lo que no.
6. Hay una copia cifrada fuera del host que ni el host ni el destino pueden leer, que el host no puede borrar y que se restauró de verdad, con el tiempo medido, antes de abrir el router.
7. El modo local, sin dominio, certificado ni Internet, sigue en `127.0.0.1:8080`, y los checks de la API de hoy siguen pasando sin tocarlos.

**Qué pasa con el HTML autónomo.** `dist/index.html` deja de ser un documento con todo adentro: pasa a ser un HTML chico más archivos con huella en su nombre, que Nginx sirve con caché larga. Ya no se puede abrir con `file://` (el ADR 0004 lo aceptó), la imagen del front y la vista previa copian o montan todo `dist/`, y `build-check` y los checks que hoy evalúan el script en línea pasan a leer varios archivos. El currículo no vuelve al HTML ni queda como archivo público: sólo sale por `/api/` con sesión.

**Entra:**

- **TLS propio con renovación:** el certificado, su obtención y su renovación automática, los puertos 80 y 443, el nombre único y la redirección.
- **Cabeceras y política de contenido:** HSTS con su rampa, la CSP estricta (sin scripts en línea; los estilos, según Q3) y las demás cabeceras de FR-013; el retiro de `vite-plugin-singlefile` con el contrato nuevo de la salida; lo que esa CSP bloquearía (sitios de estilo en línea y el editor); y la guardia que impide que vuelva.
- **Cookies:** `Secure` en todas y el prefijo `__Host-` en la de sesión y la de dispositivo, y que el CSRF funcione bajo HTTPS.
- **IP real del cliente** para los límites, con los límites de conexión que la exposición directa pide.
- **MySQL con mínimo privilegio:** la matriz de usuarios y permisos, su creación (`db-grants`) y sus pruebas.
- **Respaldos fuera del host:** el volcado nocturno, cifrado, con su retención, y la prueba de restauración.
- **Operación:** el modo local sin cambios para quien desarrolla, la compuerta de salida antes de abrir el router y la documentación.

**Queda fuera:**

- **Lo que no es exponer:** cuentas, sesión, correo y administración (C3), la lectura del contenido de la API (A3), el laboratorio sobre `/api/runs` (A4), el progreso (D1) y las estadísticas (C5). Portar vistas a React es del épico del front, salvo los cambios mínimos de FR-017 y FR-018 si Q3 los asigna a C4.
- **Un tercero delante:** CDN, túnel o proxy inverso externo. El ADR 0004 descartó el túnel con Access porque el usuario no quiere que otro termine el TLS ni vea el tráfico, y el mismo motivo alcanza a una CDN. Por eso la IP real es la del origen TCP y `trustProxies` queda vacío; si algún día hubiera un proxy delante, se limitaría a su IP exacta (FR-026).
- **IPv6 y HTTP/3** (UDP 443), y HSTS con `preload` o `includeSubDomains`.
- **Defensas de otro orden:** WAF, fail2ban o CrowdSec, protección contra un ataque volumétrico, alta disponibilidad y un segundo host.
- **El cliente de DNS dinámico:** lo hace el router o el host, no el stack.
- **El binlog fuera del host,** que permitiría volver a un punto en el tiempo aunque se pierda el host, salvo que Q2 lo pida.
- **Endurecer el host** (SSH, kernel, actualizaciones, gVisor del ejecutor): el ADR 0004 lo cuenta como operación.
- **2FA y cualquier cambio de autenticación** (ADR 0006, R3).

**Sin hacer a propósito (YAGNI):** Caddy o Traefik delante de Nginx; certificados comodín; mTLS; las cabeceras `Cross-Origin-Embedder-Policy`, `Cross-Origin-Resource-Policy` y `X-Frame-Options` (sin consumidor, o ya cubiertas por `frame-ancestors 'none'`); reportes de la CSP (`report-to`), porque no hay quien los reciba; controles de indexación (`robots.txt`, `X-Robots-Tag`), porque el taller exige sesión y no publica contenido; rotación automática de secretos; un panel de estado; cifrado de la conexión a MySQL dentro de la red interna; y un usuario de MySQL por servicio cuando dos necesitan lo mismo.

**Actores:** quien opera el taller (dueño del dominio, del router y de la clave de los respaldos); el alumno que entra desde Internet; los ítems vecinos (C3, A3, A4 y el épico del front); y los atacantes que el diseño supone: escáneres de puertos, adivinadores de contraseñas, quien mande cabeceras falsas y quien llegue a ejecutar SQL desde `php`.

## Lo que pidió el usuario

Lo que sigue ya está decidido. Lo que no figura acá es un supuesto (Assumptions) o una pregunta abierta (Preguntas abiertas). Las filas que citan el ADR 0006 valen como base mientras ese ADR siga en estado «propuesta».

| Pedido | Fuente |
| --- | --- |
| Exponer el taller en Internet, con dominio público y certificado propio | ADR 0004, «Contexto» (decisión del usuario); hoja de ruta, C4 |
| TLS con Let's Encrypt (Nginx o Caddy) y renovación automática, con certificados de 64 días en 2027 y de 45 en 2028 | ADR 0004 §1 |
| Se abren los puertos 80 y 443, con DNS dinámico si la IP del hogar cambia | ADR 0004 §1; hoja de ruta, «Acciones del usuario» (C4) |
| Sin un tercero que termine el TLS ni vea el tráfico: el túnel con Access queda descartado | ADR 0004, «Alternativas consideradas» |
| Cabeceras: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`, `Permissions-Policy` y COOP | ADR 0004 §1 |
| Retirar `vite-plugin-singlefile`: el HTML deja de ser autónomo y no funciona con `file://`, y la CSP usa `script-src 'self'` sin `'unsafe-inline'` | ADR 0004 §1 y «Consecuencias» |
| Cookies `__Host-` y `Secure`; la de sesión se llama `__Host-taller-session` | Hoja de ruta, C4; ADR 0006 §4.2 |
| La IP real del cliente para los límites: `REMOTE_ADDR` de Nginx, y `trustProxies` sólo con la IP exacta del proxy que tenga delante | ADR 0006 §4.6 y §10 |
| Usuarios de MySQL con mínimo privilegio para `php` y los workers, un usuario de respaldo y respaldos fuera del host | ADR 0006 §10; hoja de ruta, C4 |
| Respaldo nocturno consistente, con la posición del binlog, cifrado y fuera del host; 7 diarios y 4 semanales; restauración mensual con las supresiones y un punto en el tiempo | ADR 0006 §9 y D37 |
| Los respaldos duran 35 días como máximo | ADR 0006 §11 (Ley 25.326) |
| El contenido exige sesión, y el documento estático de A2 nunca sale a Internet: C4 depende de A3, que lo retira | Hoja de ruta; pedido de esta tarea |
| TDD; código y pruebas en inglés; documentos de Spec Kit en español; cada descarga con permiso, nombre, origen y tamaño | Constitución, principios II, VI y VII; hoja de ruta, «Acciones del usuario» |

## Preguntas abiertas

Son para el clarify y se plantearon el 2026-10-05. Cada una trae sus opciones con lo que cuesta cada una, la recomendada y su motivo. Al responderlas, el clarify las registra en `## Clarifications`, bajo `### Session`, y reemplaza esta sección. Hasta entonces, los requisitos que señalan una de ellas (con su marcador o con «(propuesta)») usan la opción recomendada como borrador. Lo que depende de tu casa, de tu proveedor o de tu dominio no es una pregunta: está en «Acciones del usuario».

**Q1. ¿Cómo se obtiene y se renueva el certificado, y con qué desafío?** *(FR-006 a FR-011; ADR 0004 §1)* Decide qué pieza nueva entra, si el puerto 80 queda abierto y qué secretos aparecen. Lo que la acota, medido el 2026-10-05 sin descargar nada:

- NGINX publica un módulo ACME propio (`nginx-module-acme`, Apache-2.0, versión 0.4.1 del 2026-05-01) como paquete del repositorio Alpine de nginx.org, el mismo que provee los módulos de la imagen. El paquete `nginx-module-acme-1.30.5.0.4.1-r1` existe para Alpine 3.24, y el digest que fija `frontend/Dockerfile` es Nginx 1.30.5 sobre Alpine 3.24.2 (leído de su manifiesto y su configuración en Docker Hub, sin bajar capas): hoy coinciden, y al subir la imagen base hay que subir el módulo con ella. Según el README y el CHANGELOG del módulo, la 0.4.1 implementa HTTP-01 (el desafío por omisión) y TLS-ALPN-01 (la directiva `challenge`, desde la 0.2.0), renueva guiada por ARI (desde la 0.4.0) y deja elegir el perfil del certificado (desde la 0.3.0); no hace DNS-01 ni comodines, y pide NGINX 1.22 o posterior y un directorio de estado. HTTP-01 pide un listener en el puerto 80; TLS-ALPN-01 valida por el 443 (RFC 8737). La página de NGINX sólo documenta HTTP-01 y una línea del README dice «sólo HTTP-01»: V1 prueba los dos.
- Let's Encrypt emite certificados de 45 días con su perfil opcional `tlsserver` desde el 2026-05-13. El perfil por omisión pasará a 64 días el 2027-02-10 y a 45 el 2028-02-16, y pide renovar a los dos tercios de la vida del certificado o cuando lo indique ARI. Dejó de mandar avisos de vencimiento por correo el 2025-06-04.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | El módulo ACME de Nginx en el Nginx que ya hay, con HTTP-01 (abre el 80 y el 443) o con TLS-ALPN-01 (valida por el 443; el 80 puede quedar cerrado). | Un paquete de 2,8 MiB en la imagen del front, sin imagen, contenedor ni programa nuevos. El módulo es joven (0.4.x) y necesita un volumen escribible y persistente para la cuenta y los certificados (hoy el contenedor es de sólo lectura). Nginx necesita salida a Internet hacia la autoridad, que ya tiene por la red `edge`. Al subir la imagen base hay que subir el módulo a la misma versión. |
| B | Un cliente ACME en un contenedor aparte (lego, 30,5 MiB, o certbot, 81,8 MiB), con HTTP-01 por un directorio compartido. Nginx lee el certificado de un volumen. | Una imagen nueva, un contenedor más con salida a Internet, un programa que lo despierte y una forma de que Nginx tome el certificado nuevo (reiniciarlo o avisarle). Clientes maduros. Mismo puerto 80 que A. |
| C | Lo de B, con el desafío DNS-01. | No necesita ningún puerto de entrada para validar, así que permite probar el certificado real antes de abrir el router, pero guarda un token de la API de tu DNS (poder sobre la zona, que algunos proveedores acotan a un registro) y sólo sirve si el cliente soporta a tu proveedor de DNS. |
| D | Caddy (23,7 MiB) como borde, en lugar de Nginx o delante de él. | Certificado y renovación incluidos y probados, pero reemplaza o duplica el borde: la configuración de FastCGI, los `limit_req` de C3a y el nonce por respuesta habría que reescribirlos, y un proxy delante obliga a `trustProxies` (ADR 0006 §4.6). |

**Recomendada: A, con HTTP-01,** con la verificación V1 del plan, que también prueba TLS-ALPN-01, y la salida a B si V1 falla. Es la única que no suma un contenedor con salida a Internet ni un programa de renovación, HTTP-01 es el desafío por omisión del módulo y usa el 80 que ya pensás abrir (hoja de ruta, «Acciones del usuario»), y la renovación ocurre dentro de Nginx, sin reiniciarlo. Si tu proveedor bloquea el 80, A con TLS-ALPN-01 resuelve sin cambiar de pieza y el 80 queda cerrado. **Costo:** un componente joven en la pieza más expuesta. C sólo si querés probar el certificado real antes de abrir el router. D no se recomienda: reescribe lo que C3a ya diseñó sobre Nginx.

**Q2. ¿A dónde van los respaldos y cuánto trabajo se puede perder?** *(FR-034 a FR-042; ADR 0006 §9 y D37)* Decide una cuenta y un costo, qué ve un tercero y cuánto se pierde si cae el host. El binlog (7 días) vive en el mismo disco que la base: sirve para volver a un punto en el tiempo ante un error lógico con el host vivo, como un `DELETE` o una migración equivocada, pero no si el host se pierde. Tras perder el host se recupera hasta el último volcado nocturno que esté afuera: hasta 24 horas de trabajo de los alumnos, y las cuentas suprimidas en ese lapso reaparecen hasta que se reapliquen las supresiones (ADR 0006 §12).

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | Almacenamiento de objetos de un proveedor (por ejemplo Backblaze B2 o AWS S3), con cifrado del lado del taller, una credencial que sólo agrega objetos y expiración a los 35 días configurada en el destino. | Una cuenta y un gasto mensual que no se midió (depende del proveedor y del volumen: hoy el volcado es del orden de megabytes, y el techo de diseño del ADR §9 es de unos 20 GB). El proveedor ve sólo texto cifrado y el nombre y el tamaño de los objetos. Si el destino está fuera del país puede ser una transferencia internacional (Ley 25.326, art. 12; ADR 0006 §13.3 y §13.14). Hay que confirmar con el proveedor elegido que ofrece credenciales sin permiso de borrado y expiración por antigüedad. |
| B | Otro equipo tuyo (un NAS, una notebook o un servidor de alguien de confianza) al que se llega por SSH, con una clave que sólo permite agregar archivos. | Sin gasto mensual, sin terceros y sin transferencia internacional. Si el otro equipo está en el mismo hogar, comparte incendio, robo y corte de luz con el taller: afuera del host no es afuera del sitio. Hay que mantenerlo encendido y accesible, y la retención la aplica un proceso suyo. |
| C | Lo de A o B, y además el binlog fuera del host (copia continua). | Pérdida de minutos en lugar de 24 horas, a costa de un proceso permanente más, un privilegio de replicación para el usuario de respaldo y más datos de salida. Complejidad que el ADR §9 no pide hoy. |

**Recomendada: A, con la pérdida máxima de 24 horas (sin C).** Sólo A queda afuera del sitio sin pedirte que mantengas otro equipo encendido, el cifrado del lado del taller deja al proveedor sin acceso a datos personales, y la expiración en el destino permite que el host no tenga poder de borrado. Las 24 horas son lo que el ADR dimensionó (volcado nocturno, §9); pasar a C es un cambio posterior, justificado por una medición. **Costo:** una cuenta, un gasto mensual y la decisión sobre la transferencia internacional, que confirma quien responde por la base. Si no aceptás un proveedor, B, sabiendo que no es afuera del sitio.

**Q3. ¿Qué CSP de estilos acepta el taller, dado lo que el editor necesita?** *(FR-016 a FR-019)* Decide cuánto cuesta la CSP estricta y qué queda permitido en estilos. Lo que se encontró, verificado en el código de `master`, en el `node_modules` ya instalado (leído, sin descargar nada) y en la documentación de MDN, de Vite y de CodeMirror:

- Hay **seis sitios en el código propio** que una CSP sin `'unsafe-inline'` bloquea, no cuatro: los cuatro `style=` en plantillas que cuenta el mapa del front (`systems.js:208`, que toma su valor del contenido; `app.js:391`; y dos en `lab.js:774`) y **dos asignaciones a `style.cssText`** que el mapa no cuenta (`lab.js:866` y `frontend/src/shared/lib/celebration.ts:31`). MDN dice que la CSP bloquea `cssText` y deja pasar las propiedades sueltas, como `style.display`. React DOM 19.2.8 (usa `style.setProperty` y no `cssText`) y `canvas-confetti` 1.9.4 (propiedades sueltas) no tienen el problema.
- **CodeMirror 6 crea un `<style>` en `document.head`** al montarse (`mount-code-editor.ts` usa `EditorView.theme`). Con un `style-src 'self'` a secas, el navegador lo bloquea y el editor queda sin tema. `style-mod`, su biblioteca de estilos, sólo evita el `<style>` cuando la raíz no es un documento (un shadow DOM), y la API de CodeMirror prevé un nonce (`EditorView.cspNonce`). Vite también (`html.cspNonce` y una etiqueta `<meta property="csp-nonce">`).
- **El propio código de CodeMirror asigna `style.cssText`.** El editor del taller usa `basicSetup`, que incluye la numeración de líneas, y en `@codemirror/view` 6.43.13 el gutter hace `cssText += "visibility: hidden; pointer-events: none"` sobre su espaciador al montarse. Un nonce cubre los elementos `<style>`, no los atributos ni `cssText`. Otros usos de `cssText` en `@codemirror/view` sólo corren con un atributo `style` configurado (el del taller no lo trae) y en el respaldo para navegadores con el portapapeles roto, y los de `@codemirror/autocomplete`, al mostrar el panel de información de una opción (las del taller no lo traen). Es lectura del código, no ejecución: V2 la confirma en un navegador.
- Lo demás que una CSP estricta bloquea no aparece en las fuentes: ni manejadores `on…=`, ni `eval`, ni `new Function`, ni URLs `javascript:`. La celebración usa `useWorker: false` y los kits ZIP usan `zipSync` de `fflate`, así que ninguno pide un worker `blob:`.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | Sin `'unsafe-inline'` en ningún lado: un nonce para los `<style>`, los seis sitios propios reemplazados por clases o por propiedades CSSOM, y el editor sin los `cssText` de CodeMirror (permitiendo sólo esas cadenas conocidas con `'unsafe-hashes'` y su hash en `style-src-attr`, si el navegador lo admite para `cssText`, o armando el editor sin la numeración de líneas de `basicSetup`). | Es el literal de la hoja de ruta y lo más caro: un hash por cada cadena de CodeMirror, que cambia al actualizarlo, o un editor distinto al de hoy (cambia lo que ve el alumno, FR-023); además del nonce y de seis ediciones en archivos que el épico del front también toca (F5, F7 y F8 los retiran, pero F8 llega después de la ola de C4). Puede no ser viable: V2 lo dice. |
| B | `script-src` estricto y `style-src` con nonce, sin `'unsafe-inline'`, y `style-src-attr 'unsafe-inline'` sólo para los atributos de estilo. | Cumple el motivo del ADR 0004 (ningún script en línea, que es lo que frena un XSS) y bloquea los `<style>` inyectados y los externos; deja pasar los atributos `style`, que CodeMirror necesita. No toca el editor ni espera al épico del front: los seis sitios propios pueden quedar como están y limpiarlos es opcional. Cuesta el nonce (`index.html` deja de ser un archivo estático puro y no se cachea, una opción de Vite y un cambio para que el editor lo reciba) y deja a medias el literal «sin `'unsafe-inline'`» de la hoja de ruta, que se cumple para scripts y elementos `<style>` pero no para atributos. |
| C | `script-src` estricto y `style-src` con `'unsafe-inline'`, sin nonce. | La más barata: ni nonce, ni editor, ni seis sitios. Admite además `<style>` inyectados. |

**Recomendada: B.** Una CSP estricta también para atributos obliga a cambiar el editor o a sostener hashes de código ajeno que cambian con cada actualización de CodeMirror, a cambio de poco: un atributo de estilo no ejecuta código, y los canales para sacar datos con CSS (imágenes, fuentes, `connect-src` y `form-action`) siguen cerrados por la política (inferido). B conserva lo que frena un XSS: ningún script en línea y ningún `<style>` sin el nonce. **Costo:** el literal «sin `'unsafe-inline'`» de la hoja de ruta no se cumple para los atributos de estilo. Es una decisión tuya, y por eso se pregunta. Si preferís el literal, A, sabiendo que puede no ser viable (V2) y que cuesta un editor distinto o un hash por cada cadena de CodeMirror. Si V2 muestra que el nonce no alcanza (el editor sigue sin tema), la salida es C, que vuelve al usuario como una decisión nueva y no como una degradación silenciosa.

**Q4. ¿Cómo se entera quien opera de que falló una renovación o un respaldo?** *(FR-011 y FR-041)* Con HSTS activo, un certificado vencido deja el taller inaccesible sin opción de continuar para el alumno. Let's Encrypt ya no avisa por correo, un respaldo que falla en silencio no se nota hasta que hace falta, y un DNS dinámico caído o un reenvío del router roto dejan al taller afuera sin que ningún registro del propio taller lo diga.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | Sólo registros y un comando de estado (días que le quedan al certificado, antigüedad del último respaldo y de la última restauración probada). Quien opera lo mira. | Nada que mantener ni contratar. El aviso depende de que alguien mire: un fallo de renovación se descubre el día que vence. |
| B | A, más un aviso por correo desde el propio taller (`worker-mail`, de C3b). | Sin terceros, pero depende de C3b y del proveedor de correo (ADR 0006 §13.3), y el aviso comparte la suerte del taller: si se cae, no avisa. |
| C | A, más un monitor externo que vigile la URL pública y el vencimiento del certificado, y un latido (un pedido HTTP de salida) que el respaldo manda al terminar bien. | Detecta también las caídas del DNS dinámico, del router y de Nginx, que el taller no ve. Una cuenta en un servicio de monitoreo, que conoce el dominio y los horarios, no datos del taller. En código suma un pedido de salida en el respaldo. |

**Recomendada: C, sobre la base de A, que se construye siempre.** Con certificados de 45 días y HSTS, el fallo más probable y más grave es el que el taller no puede ver por sí mismo, y un monitor externo lo ve desde donde lo ve el alumno. **Costo:** una cuenta de monitoreo (puede tener un plan gratuito; no se verificó) y entregarle un dato, el dominio.

**Q5. ¿Cuántos usuarios de MySQL hay, y cómo se reparten?** *(FR-030 a FR-033)* Decide cuántas contraseñas nuevas hay en `.env`, cuánto SQL de permisos se mantiene y qué puede hacer cada pieza si la comprometen. Hoy todos los servicios entran como `taller`, con todos los privilegios sobre la base.

| Opción | Descripción | Cuesta |
| --- | --- | --- |
| A | Por rol: `app` (`php` y `scheduler`, que necesitan lo mismo porque la purga de cuentas borra de todas las tablas del alumno), `runs` (`worker-runs`), `mail` (C3b; ya fijado por D21), `migrate` (migraciones, import y el chequeo previo), `backup`, y root sólo para `db-grants`. | Cinco contraseñas nuevas (la de root ya existe), una matriz de permisos (FR-031) y sus pruebas. El `php` expuesto no puede crear ni borrar tablas ni escribir contenido, y el worker de ejecuciones no toca cuentas ni sesiones. |
| B | Por servicio: A, y además `scheduler` aparte de `php`. | Una identidad y una contraseña más, sin diferencia de privilegios hoy (la purga los iguala): separa sin cambiar lo que un atacante puede hacer. Se justifica sólo si el `scheduler` va a tener más poder que `php`. |
| C | Lo mínimo: `mail` (que ya fija D21) y `backup` aparte; el resto sigue con `taller`. | Dos identidades nuevas. `php` seguiría con todos los privilegios: una inyección SQL o la ejecución de código en `php` sería dueña de la base, estructura incluida. No cumple el «mínimo privilegio» del título del ítem. |

**Recomendada: A.** Separa lo que tiene una superficie distinta (lo expuesto a Internet, lo que ejecuta código de alumnos, lo que sale a enviar correo, lo que cambia la estructura y lo que sólo lee) y no duplica identidades que necesitan lo mismo. **Costo:** cinco contraseñas más en `.env` y la matriz como contrato que hay que mantener. Si preferís menos piezas, C es el piso defendible para un primer despliegue, pero deja a `php` con todo.

## Acciones del usuario

Los agentes no hacen estas acciones. Las descargas piden permiso con nombre, origen y tamaño antes de bajarse (constitución, principio VII); los tamaños están en «Descargas previstas».

| Cuándo | Acción |
| --- | --- |
| 1. Antes del plan | **Comprobá que tu conexión admite recibir por 80 y 443.** Que el router recibe una IP pública y no una compartida por el proveedor (CGNAT): la IP que muestra un servicio de «mi IP» desde tu casa tiene que coincidir con la del lado de Internet del router. Y que el proveedor no filtra esos puertos de entrada. Si no, C4 no se puede cumplir como está pensado y vuelve al usuario con alternativas, como un servidor alquilado que haga de borde. Si sólo falla el 80, la opción A de Q1 con TLS-ALPN-01 todavía sirve. |
| 2. Antes del plan | **Elegí y registrá el dominio:** uno propio o un subdominio de un servicio de DNS dinámico, dedicado al taller. De él salen `APP_URL`, el nombre del certificado y el alcance de HSTS. |
| 3. Antes de implementar | **DNS:** un registro A hacia la IP pública del hogar y ninguno AAAA (IPv6 queda fuera). Si la IP cambia, un DNS dinámico que actualice el router o un programa del host; el stack no lo hace. Opcional, si tu DNS lo admite: un registro CAA que limite la emisión a la autoridad elegida. |
| 4. Antes de abrir el router | **Router:** reenviá el TCP 80 y el TCP 443 al host (con su IP reservada en la red local) y ningún otro puerto; revisá que no haya UPnP abriendo más. Si probás desde adentro de tu red con el nombre público, hace falta NAT loopback o un DNS interno. |
| 5. Antes de implementar | **Permiso para las descargas** de la tabla de abajo, una vez decididas Q1 y Q2. |
| 6. Antes de implementar | **Los respaldos (Q2):** creá la cuenta del destino con una credencial que sólo agregue objetos (la que usa el host) y otra de lectura que sólo tengas vos; configurá la expiración a los 35 días; y generá el par de claves de cifrado: la privada la guardás fuera del host (gestor de contraseñas o impresa), la pública va al host. Guardá también una copia fuera del host de tu `.env`. |
| 7. Al desplegar | Corré `sh backend/api/scripts/init-env.sh` para sumar los secretos nuevos (las contraseñas de los usuarios de MySQL) y el comando único de `db-grants` sobre el volumen existente, el mismo mecanismo que fija C3a. Si Q4 es C, crear el monitor y poner su URL de latido en `.env`. |
| 8. Antes de abrir el router | **Presenciá la restauración** (FR-042) y guardá el procedimiento. Confirmá que C3 está entregado, con una cuenta admin creada y el texto del aviso de privacidad vigente. |
| 9. Al verificar | **La prueba desde afuera.** Abrí el taller desde otra red (datos móviles), aceptá una invitación y recorré las vistas: los agentes no tienen otra red. |
| 10. Siempre | Aprobar o enmendar el ADR 0006, y decidir los puntos que siguen abiertos en su §13 y que C4 vuelve concretos: cuántos días se conservan los registros, ahora con IP real (§13.13), y quién responde por la base y si hay que inscribirla (§13.14). |

## Descargas previstas

Nada se descargó. Los tamaños salen de la API de metadatos de Docker Hub, de la API de GitHub y del listado del repositorio de nginx.org del 2026-10-05, y son tamaños comprimidos de amd64, no una medición de `pull`. Se descarga sólo lo que Q1 y Q2 elijan.

| Qué | Origen | Tamaño | Para qué | Licencia |
| --- | --- | --- | --- | --- |
| Módulo ACME de Nginx, paquete `nginx-module-acme-1.30.5.0.4.1-r1` | Repositorio Alpine de nginx.org (v3.24) | 2 899 805 bytes (2,8 MiB) | Q1, opción A (recomendada) | Apache-2.0 |
| `goacme/lego` (v5.5.2) | Docker Hub, `latest` | 31 929 677 bytes (30,5 MiB) | Q1, opciones B y C | MIT |
| `certbot/certbot` | Docker Hub, `latest` | 85 815 661 bytes (81,8 MiB) | Q1, opción B | sin declarar en GitHub |
| `caddy:2-alpine` | Docker Hub | 24 835 849 bytes (23,7 MiB) | Q1, opción D (no recomendada) | Apache-2.0 |
| Pebble (v2.10.1, servidor ACME de prueba) | GitHub Releases, `pebble-linux-amd64.tar.gz` | 3 268 564 bytes (3,1 MiB); sin imagen oficial en Docker Hub (su API no devolvió etiquetas) | Probar emisión y renovación sin dominio ni Internet (V1), opcional | MPL-2.0 |
| `age` (v1.3.2) | GitHub Releases, `age-v1.3.2-linux-amd64.tar.gz` | 19 405 817 bytes (18,5 MiB) | Q2: cifrar con clave pública | BSD-3-Clause |
| `rclone/rclone` | Docker Hub, `latest` | 33 921 688 bytes (32,4 MiB) | Q2: subir al destino (S3 o SFTP) | MIT |
| `restic/restic` (v0.19.1) | Docker Hub, `latest` | 17 500 978 bytes (16,7 MiB) | Q2: alternativa que cifra, deduplica y aplica retención en una sola herramienta, pero con contraseña simétrica en el host y permiso de borrado para podar | BSD-2-Clause |
| `drwetter/testssl.sh` | Docker Hub, `latest` | 22 567 230 bytes (21,5 MiB) | Verificar TLS (FR-012), opcional | GPL-2.0 |

Sin descarga nueva: `mysql:9.7` (unos 270 913 951 bytes, que ya fija `docker/compose.yaml` y que usarían `backup` y `db-grants`) y la imagen base del `taller`, el digest que fija `frontend/Dockerfile` (`nginxinc/nginx-unprivileged`: Nginx 1.30.5 sobre Alpine 3.24.2, 23 067 472 bytes en capas comprimidas según su manifiesto). Subir esa base para tomar un Nginx más nuevo sí sería una descarga, y el módulo ACME tiene que subir con ella.

## Verificaciones previas del plan

Cuatro supuestos técnicos de esta spec no se pudieron probar al escribirla (sin Docker ni descargas). El plan los comprueba al empezar, en su fase de investigación, y deja el resultado en `research.md` con versiones, comandos y cifras.

| ID | Pregunta | Cómo se mide | Pasa si |
| --- | --- | --- | --- |
| V1 | ¿El módulo ACME corre en la imagen de Nginx sin privilegios, con el disco de sólo lectura y un volumen de estado, y renueva sin cortar, con HTTP-01 y con TLS-ALPN-01? | Construir la imagen con el paquete fijado a la versión de Nginx; con cada desafío, emitir y forzar una renovación contra Pebble o contra el entorno de pruebas de la autoridad, con una ráfaga continua de pedidos HTTPS nuevos | Con al menos HTTP-01 emite sin intervención, el certificado cambia sin reiniciar y 0 pedidos fallan; lo que haga TLS-ALPN-01 queda registrado. Si no, el plan pasa a la opción B de Q1 |
| V2 | ¿La CSP elegida en Q3, con el nonce por respuesta, deja el editor y las vistas como hoy? | Servir el build sin `vite-plugin-singlefile` detrás de Nginx con la CSP de FR-013; recorrer en Chromium y Firefox las 8 vistas, los 5 enlaces profundos, el editor y la celebración con la consola abierta y un oyente de `securitypolicyviolation` | 0 violaciones, el editor con su tema y su numeración de líneas bien dibujada, sin el espaciador visible. Si la opción elegida no pasa, la decisión vuelve al usuario (Q3) |
| V3 | ¿Qué IP ve Nginx con el mapeo de puertos elegido? | Desde otra red (datos móviles) y, si el host recibe IPv6, también por IPv6: leer el registro de Nginx y el contador de un límite de Laravel | La IP pública del cliente en los dos, y nada se sirve por IPv6 |
| V4 | ¿Alcanza el conjunto mínimo de privilegios del usuario de respaldo, y cuánto tarda la restauración? | Volcar con el usuario `backup` real y restaurar en una base descartable, con el volumen de hoy y con uno sintético mayor | El volcado y la restauración terminan; se registra el tiempo (el disparador es 1 hora, ADR 0006 §9) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un alumno entra al taller por Internet, con una conexión cifrada (Priority: P1)

Alguien con una invitación abre `https://<dominio>` desde su casa, ve el taller, acepta la invitación, ingresa y trabaja. Todo viaja cifrado, la cookie de sesión no se puede leer desde la página ni mandar por HTTP, y un intento por `http://`, por la IP o con otro nombre no llega a la aplicación.

**Why this priority**: es la razón de la feature. Sin esto el taller sigue siendo local.

**Independent Test**: desde una red que no es la del hogar, abrir el link de una invitación creada con `taller:invite`, aceptarla, ingresar, abrir el laboratorio y recargar; después probar `http://`, la IP y un nombre falso.

**Acceptance Scenarios**:

1. **Dado** el despliegue público con un certificado vigente, **cuando** se abre `https://<dominio>` desde una red de afuera, **entonces** el navegador no muestra advertencias, carga el taller, y `GET /api/session` entrega la cookie de sesión con `__Host-`, `Secure`, `HttpOnly` y `SameSite=Lax`, y la cookie `XSRF-TOKEN`.
2. **Dado** el link de una invitación, **cuando** se acepta desde un teléfono por datos móviles, **entonces** se crea la cuenta, la sesión queda abierta, y recargar la página la mantiene (el CSRF pasa bajo HTTPS).
3. **Dado** el puerto 80 abierto, **cuando** se pide `http://<dominio>/ruta?x=1`, **entonces** responde 301 a `https://<dominio>/ruta?x=1`, armado con el nombre configurado y no con el `Host` del pedido.
4. **Dada** una conexión por la IP pública o con un nombre que no es el configurado, **cuando** se intenta, **entonces** no recibe el certificado ni la aplicación.
5. **Dada** una modificación enviada desde otro origen con la sesión de un alumno, **cuando** llega, **entonces** se rechaza con 419 `csrf_token_mismatch`.
6. **Dado** un escaneo de puertos desde otra red, **cuando** termina, **entonces** sólo responden los puertos de FR-001 (el TCP 443 y, con el 80 abierto, el TCP 80).

*Cubre: FR-001, FR-004, FR-005, FR-024 y FR-025; SC-001 y SC-011.*

---

### User Story 2 - El certificado se obtiene y se renueva solo (Priority: P1)

Quien opera el taller no toca el certificado después de la puesta en marcha: se obtiene al arrancar, se renueva antes de vencer sin cortar el servicio y, si algo falla, se ve.

**Why this priority**: con certificados de 45 días y HSTS, un certificado que no se renueva deja el taller inaccesible sin salida para el alumno.

**Independent Test**: con un servidor ACME de prueba, emitir, forzar una renovación con carga continua, reiniciar el stack y simular una falla.

**Acceptance Scenarios**:

1. **Dado** un volumen de estado vacío y el dominio configurado, **cuando** arranca el taller, **entonces** obtiene un certificado del servidor de prueba sin intervención y el 443 lo sirve; hasta entonces no entrega un certificado autofirmado.
2. **Dada** una renovación forzada con pedidos HTTPS nuevos continuos, **cuando** cambia el certificado, **entonces** 0 pedidos fallan y no hace falta reiniciar.
3. **Dado** un redeploy o el reinicio del host, **cuando** el stack vuelve, **entonces** usa la cuenta y el certificado guardados en el volumen, sin pedir uno nuevo.
4. **Dada** una renovación que falla (la autoridad no responde o el desafío no llega), **cuando** se agota su reintento, **entonces** el fallo y su causa quedan en los registros, el taller sigue sirviendo con el certificado vigente y el comando de estado lo muestra (y, según Q4, quien opera recibe el aviso).
5. **Dado** el certificado que se sirve, **cuando** se consulta su vencimiento con el comando documentado, **entonces** informa los días que le quedan.
6. **Dada** la primera prueba de emisión, **cuando** se revisan sus pedidos, **entonces** fue contra el servidor de prueba y no contra producción.

*Cubre: FR-006 a FR-011; SC-002.*

---

### User Story 3 - El navegador recibe una política estricta y el taller sigue funcionando (Priority: P1)

Cada respuesta lleva las cabeceras de seguridad, la CSP prohíbe los scripts en línea (y, según Q3, los estilos), y aun así el taller, el editor y la celebración se ven y funcionan como hoy.

**Why this priority**: es la mitad de «cabeceras estrictas» del título, y la que más puede romper lo que ya anda: la CSP rechaza código que hoy corre.

**Independent Test**: pedir una URL de cada clase de respuesta y comparar las cabeceras; recorrer el taller en un navegador real con la consola abierta; correr `npm test` sobre un cambio que vuelve a poner un script en línea.

**Acceptance Scenarios**:

1. **Dada** una URL de cada una de las 8 clases (el HTML, un archivo con huella, un 404 que genera Nginx, `/api/` con éxito, `/api/` con un 404 y con un 419 de Laravel, `/healthz` y el 301 del puerto 80), **cuando** se piden, **entonces** cada una trae las cabeceras de FR-013 una sola vez y con su valor exacto, y HSTS sólo por HTTPS.
2. **Dado** el recorrido (las 8 vistas, los 5 enlaces profundos, el editor y la celebración), **cuando** se hace en un navegador real, **entonces** hay 0 violaciones de CSP, y el editor muestra su tema y su numeración de líneas bien dibujada.
3. **Dado** un cambio que agrega un `<script>` o un `<style>` en línea al HTML (y, con la opción A de Q3, un `style=` o una asignación a `cssText`), **cuando** corre `npm test`, **entonces** falla y cita el archivo y la línea.
4. **Dado** el build, **cuando** se inspecciona, **entonces** `dist/index.html` no tiene `<script>` ni `<style>` en línea, todo archivo que nombra existe, y ningún documento del currículo se sirve sin sesión.
5. **Dado** un despliegue nuevo, **cuando** se piden `index.html` y un archivo con huella, **entonces** el primero no se cachea y el segundo sí, con las cabeceras de seguridad en los dos.

*Cubre: FR-012 a FR-023; SC-003 a SC-005.*

---

### User Story 4 - Los límites cuentan a cada cliente por su IP real (Priority: P1)

Los límites por red de C3a sólo sirven si distinguen a un cliente de otro. Con la IP real, quien abusa se frena a sí mismo y un aula no queda bloqueada por uno.

**Why this priority**: si el stack mostrara siempre la IP del puente de Docker, el límite sería global y un solo atacante podría dejar afuera a todos.

**Independent Test**: desde dos IP públicas distintas, agotar un límite desde una y probar desde la otra; mandar cabeceras de IP falsas; abrir conexiones lentas.

**Acceptance Scenarios**:

1. **Dados** dos clientes con IP públicas distintas, **cuando** uno agota el límite del ingreso, **entonces** el otro no recibe 429.
2. **Dado** un pedido con `X-Forwarded-For`, `Forwarded` o `X-Real-IP` falsos, **cuando** llega, **entonces** cuenta contra su IP verdadera y el registro muestra la verdadera.
3. **Dado** un host que recibe IPv6, **cuando** un cliente intenta llegar por esa vía, **entonces** no se sirve nada por ella, y en ningún caso el registro muestra la IP del puente de Docker.
4. **Dadas** unas pocas conexiones lentas desde una IP, **cuando** se mantienen abiertas, **entonces** no impiden que otros clientes, ni un aula de 40 detrás de un mismo NAT, sean atendidos.

*Cubre: FR-026 a FR-029; SC-006.*

---

### User Story 5 - Cada servicio usa sólo sus permisos de MySQL (Priority: P2)

Si alguien consigue ejecutar SQL desde `php`, no puede crear ni borrar tablas, escribir el contenido, leer lo que no es de `php` ni conceder permisos. El volcado del respaldo no puede escribir.

**Why this priority**: acota el daño de un fallo en lo más expuesto, pero es un endurecimiento que se puede probar y entregar aparte del resto.

**Independent Test**: contra MySQL 9.7 real, conectar con cada usuario y ejecutar lo que le toca y lo que no.

**Acceptance Scenarios**:

1. **Dada** la matriz de FR-031, **cuando** cada servicio se conecta con su usuario, **entonces** hace lo suyo (pasan las pruebas positivas).
2. **Dado** cada usuario, **cuando** intenta un DDL, un `GRANT`, la escritura de una tabla ajena o `FILE`, **entonces** MySQL lo rechaza (pasan las pruebas negativas), y `SHOW GRANTS` de cada uno coincide con la matriz.
3. **Dado** un volumen existente con el usuario `taller` de hoy, **cuando** se despliega C4, **entonces** los servicios pasan a sus usuarios sin dejar de servir y `taller` pierde sus privilegios al final.
4. **Dado** un volumen nuevo, **cuando** arranca por primera vez, **entonces** los usuarios existen antes de que `migrate` los necesite.

*Cubre: FR-030 a FR-033; SC-007.*

---

### User Story 6 - Hay una copia fuera del host que de verdad se restaura (Priority: P1)

Cada noche sale del host una copia cifrada que sólo puede leer quien tiene la clave privada. Si el host se pierde, el taller vuelve a levantarse con los datos de la última noche.

**Why this priority**: con cuentas y progreso de muchas personas, perder el host sin una copia es perder el trabajo de todos. Y una copia que nunca se restauró es una suposición.

**Independent Test**: dejar correr el volcado nocturno y restaurar la copia más reciente en una base descartable, con la clave privada y credenciales de lectura que no están en el host.

**Acceptance Scenarios**:

1. **Dado** el volcado nocturno, **cuando** termina, **entonces** hay en el destino un objeto cifrado nuevo, y el host no lo puede descifrar ni borrar.
2. **Dada** la copia más reciente, **cuando** se restaura con la clave privada, **entonces** la base descartable queda con los mismos conteos y huellas que el origen en el momento del volcado, se reaplican las supresiones y se mide el tiempo.
3. **Dada** la posición del binlog del volcado, **cuando** se recupera hasta un punto posterior, **entonces** la base refleja ese punto.
4. **Dado** un destino que no responde, **cuando** corre el volcado, **entonces** el volcado cifrado queda local, con un tope, se reintenta, y el fallo se ve.
5. **Dado** un despliegue mientras corre un volcado, **cuando** se lanzan a la vez, **entonces** uno espera al otro o aborta con un mensaje claro.
6. **Dado** el destino después del primer ciclo completo, **cuando** se lista, **entonces** hay al menos 7 copias diarias y 4 semanales, y ninguna de más de 35 días.

*Cubre: FR-034 a FR-042; SC-008 a SC-010.*

---

### User Story 7 - El modo local y las pruebas siguen igual (Priority: P2)

Quien desarrolla o prueba no necesita dominio, certificado ni Internet: el stack local sigue en `127.0.0.1:8080` y los checks de la API de hoy pasan sin tocarlos.

**Why this priority**: si C4 rompe el modo local, rompe el desarrollo de todos los demás ítems.

**Independent Test**: levantar el stack por omisión y correr los checks de hoy; activar el modo público sin configurarlo.

**Acceptance Scenarios**:

1. **Dado** el despliegue por omisión, **cuando** se levanta con `docker compose up --build -d --wait`, **entonces** publica sólo `127.0.0.1:8080` y pasan `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh`.
2. **Dado** el modo público activado sin dominio, **cuando** se levanta, **entonces** no arranca, no publica ningún puerto y dice qué falta.
3. **Dados** `npm run dev` y la vista previa (`docker/compose.preview.yaml`), **cuando** se usan, **entonces** siguen sirviendo la aplicación sin API ni dominio.

*Cubre: FR-002, FR-003, FR-023, FR-043 y FR-046; SC-012 y SC-013. Las pruebas de FR-043 a FR-047 valen para todas las historias.*

---

### Edge Cases

- **La conexión del hogar no admite la entrada:** con una IP compartida por el proveedor (CGNAT) o con el 443 filtrado, nadie de afuera llega. Con sólo el 80 filtrado, TLS-ALPN-01 alcanza (Q1), y con HTTP-01 no se puede validar el certificado. Si el 443 no entra, C4 no se puede cumplir como está pensada: vuelve al usuario con alternativas (acción 1). No se decide acá.
- **La IP del hogar cambia:** el nombre apunta a la IP vieja hasta que el DNS dinámico se actualiza. Mientras tanto el taller queda afuera, y una renovación que cae en esa ventana falla. Lo ve el monitor externo (Q4), no el taller.
- **Certificado vencido con HSTS largo:** el navegador no deja continuar. Por eso la rampa de FR-014, el margen de renovación de FR-007 y Q4.
- **Acceso desde la red del hogar con el nombre público:** según el router, el pedido vuelve con la IP del propio router como origen (todos los de la red local cuentan como uno) o no vuelve. Se resuelve con NAT loopback o un DNS interno (acción 4); los límites de C3a tienen ráfaga holgada por los NAT de aula.
- **IPv6:** el taller no tiene registro AAAA y publica en IPv4 explícito. Según la documentación de Docker («Port publishing and mapping»), sin una dirección explícita, con una red IPv4 y con su proxy de usuario (el valor por omisión), los puertos de las direcciones IPv6 del host se atienden hacia la dirección IPv4 del contenedor. Como el proxy abre una conexión nueva, el contenedor vería la IP del puente y no la del cliente (inferido; V3 lo comprueba). Por eso FR-001 y FR-027.
- **Docker por encima de `ufw`:** el firewall del host no filtra lo que Docker publica: su documentación dice que el tráfico hacia y desde un contenedor con puertos publicados se desvía antes de pasar por la configuración de ufw. El control real es qué publica Compose (FR-001) y el reenvío del router.
- **Primer arranque con el volumen de estado vacío:** todavía no hay certificado, así que el 443 no puede responder hasta que la autoridad emita. No se entrega uno autofirmado. El puerto 80 sigue respondiendo el desafío y la redirección.
- **Límites de la autoridad:** las emisiones duplicadas y las validaciones fallidas tienen tope por período. Por eso el volumen de estado persiste y las pruebas van primero contra un servidor de prueba (FR-010).
- **El reloj del host:** si se desfasa, la autoridad rechaza el pedido o el certificado parece vencido. Es un supuesto que el host sincroniza la hora.
- **Un volumen de MySQL existente:** tiene al usuario `taller` con todos los privilegios y servicios conectados con él; el traspaso a los usuarios nuevos se hace sin que ningún servicio quede sin poder conectarse (FR-032). En un volumen nuevo, los usuarios se crean en el primer arranque.
- **C3b ausente:** si C4 se implementara antes que C3b, no existen `account_deletions` ni `worker-mail`. El respaldo omite el libro de supresiones sin fallar, y la matriz no incluye `mail`. Igual, no se abre el router sin C3b (FR-044).
- **El destino de los respaldos no responde, o se pierde la clave privada:** con el destino caído, el volcado cifrado queda local con un tope y se reintenta. Con la clave perdida, ninguna copia se puede leer: por eso la restauración la usa y su guarda es una acción del usuario.
- **Una pestaña abierta durante un despliegue:** `index.html` cambia y los archivos con huella viejos desaparecen, así que la pestaña puede fallar al pedir uno que ya no existe; recargar lo resuelve. El aviso de contenido que no llega es de A2 y A3.
- **Los Playgrounds en `connect-src`:** la CSP los nombra hasta que A4 retire el cliente. C4 y A4 comparten ola y la misma línea de configuración: la edita quien integra, y el segundo en llegar los quita.
- **Contenido sin sesión:** si A3 no retiró el documento estático de A2, C4 no se despliega (FR-022).

## Requirements *(mandatory)*

### Functional Requirements

**Puertos y modos**

- **FR-001**: En el despliegue público, el stack DEBE publicar hacia afuera sólo el TCP 80 y el TCP 443, los dos de `taller`, en IPv4 explícito; el 80 puede quedar cerrado si el desafío es TLS-ALPN-01 (Q1). Ningún otro servicio publica un puerto (ni `php`, `mysql`, el ejecutor, el `scheduler`, los workers ni `backup`), y `taller` no publica el 8080 de hoy. Una prueba lee la configuración efectiva de Compose y falla si otro servicio publica un puerto o `taller` publica uno distinto, y un escaneo desde otra red confirma que sólo responden esos puertos. UDP, HTTP/3 e IPv6 quedan fuera.
- **FR-002**: El modo local por omisión NO DEBE cambiar en lo que afecta a quien desarrolla: sigue publicando sólo `127.0.0.1:8080` por HTTP, sin dominio, certificado ni Internet, con las cookies sin prefijo y sin `Secure`, y siguen pasando sin editarlos `npm run api:smoke`, `npm run api:content:check`, `sh backend/api/scripts/deploy-check.sh` y `npm run api:test`. Cambian en los dos modos, por diseño: la CSP y las demás cabeceras de FR-013 (salvo HSTS, que sólo sale por HTTPS) y el contrato de la salida del build (FR-020), así que `npm test` pasa con el `build-check` nuevo y no con el de hoy. Lo público se activa sólo con configuración explícita del despliegue (el plan elige el mecanismo: un perfil o un archivo de Compose, con variables propias), nunca con `APP_ENV`, que Compose fija en `production` también en la máquina local (ADR 0006, D21). Si el modo público se activa sin lo que necesita (el dominio, el contacto de la autoridad, la clave pública de los respaldos), el stack no arranca y el mensaje dice qué falta.
- **FR-003** *(propuesta)*: El despliegue público DEBE estar aislado de los comandos de desarrollo y de prueba: usa su propio nombre de proyecto de Compose y sus propios volúmenes, de modo que un `down`, un `api:test` o un comando corrido desde otro worktree no toque su base ni sus certificados. Hoy el nombre es único (`taller-rust-go`) y los comandos de otro worktree tocan el stack del checkout principal ([spec 002](../002-c6-registros-tipados/spec.md), riesgo 7).
- **FR-004**: El puerto 80 DEBE responder sólo (a) el desafío de la autoridad, si el desafío es HTTP-01, y (b) una redirección permanente (301) a `https://<dominio configurado>` con la misma ruta y consulta. El destino sale de la configuración, nunca del encabezado `Host`. El registro de acceso usa el mismo formato que `/api/`, sin la consulta (ADR 0006, D20). Si Q1 elige TLS-ALPN-01 y el 80 se cierra, `http://` no responde y no hay redirección.
- **FR-005**: El servidor DEBE atender sólo el nombre configurado. Una conexión TLS con otro nombre o sin nombre (por ejemplo, por la IP) se rechaza antes de entregar el certificado, y un pedido con otro `Host` no recibe la aplicación.

**Certificado**

- **FR-006**: El certificado DEBE emitirlo una autoridad pública por ACME (Let's Encrypt, ADR 0004) a nombre del dominio configurado, sin intervención manual y sin un tercero que termine el TLS ni vea el tráfico (el ADR 0004 descartó el túnel con Access). [NEEDS CLARIFICATION: Q1, qué cliente y qué desafío. La recomendada: el módulo ACME de Nginx con HTTP-01, que abre el 80 y el 443.]
- **FR-007**: La renovación DEBE ser automática y no depender de un número fijo de días: renueva cuando le queda aproximadamente un tercio de la vida del certificado, o cuando la autoridad lo indica si el cliente sabe leerlo (ARI), y reintenta ante un fallo. Funciona igual con los certificados de hoy y con los de 64 días (desde el 2027-02-10) y 45 (desde el 2028-02-16) que anuncia Let's Encrypt, cuyo perfil `tlsserver` ya los emite de 45.
- **FR-008**: Renovar y cambiar el certificado NO DEBE cortar el servicio ni exigir reiniciar a mano: una ráfaga continua de pedidos HTTPS nuevos durante una renovación forzada no registra ningún fallo.
- **FR-009**: La clave de la cuenta ACME, la clave privada del certificado y el certificado NO DEBEN entrar en Git, en la imagen ni en el contexto de Docker (`.gitignore`, `.dockerignore`). Viven en un volumen persistente del despliegue, que sobrevive a un redeploy y a un reinicio para no pedir un certificado nuevo cada vez (la autoridad limita las emisiones), y sólo los ve el servicio que los usa.
- **FR-010**: La emisión y la renovación DEBEN probarse primero contra un servidor ACME de prueba (el entorno de pruebas de la autoridad o uno local, como Pebble) y recién después contra producción. Lo que no depende de la autoridad pública (cabeceras, redirección, nombre único, cookies y límites) DEBE poder probarse en local con un certificado de prueba, sin dominio ni Internet.
- **FR-011** *(propuesta, Q4)*: Un comando de operación documentado DEBE informar cuántos días le quedan al certificado que se está sirviendo, y un fallo de renovación o de respaldo DEBE quedar en los registros con su causa. El aviso activo, que Let's Encrypt ya no manda por correo, depende de Q4.

**TLS, cabeceras y política de contenido**

- **FR-012**: TLS 1.2 como mínimo y 1.3 preferido, con la lista de suites «intermediate» de Mozilla vigente al planificar (el plan la cita con su fecha); sin TLS 1.0 ni 1.1, sin suites débiles, sin tickets de sesión, y con HTTP/2 activo, porque el build sin `vite-plugin-singlefile` pasa de un archivo a varios. Una prueba con `testssl.sh` o con el escáner que el plan elija no encuentra protocolos ni suites fuera de esa lista.
- **FR-013**: Toda respuesta DEBE llevar estas cabeceras, con estos valores exactos (HSTS sólo en las que salen por HTTPS, y el nonce de la CSP depende de Q3):

  | Cabecera | Valor | Hoy |
  | --- | --- | --- |
  | `Strict-Transport-Security` | `max-age=31536000`, a través de la rampa de FR-014; sin `preload` ni `includeSubDomains` | no está |
  | `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'nonce-<valor por respuesta>'; style-src-attr 'unsafe-inline'; connect-src 'self' https://play.rust-lang.org https://play.golang.org; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` (la opción B de Q3, la recomendada) | lleva `'unsafe-inline'` en `script-src` y en `style-src` |
  | `X-Content-Type-Options` | `nosniff` | está |
  | `Referrer-Policy` | `no-referrer` | está |
  | `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()` | no está |
  | `Cross-Origin-Opener-Policy` | `same-origin` | no está |

  Motivos: HSTS fija el HTTPS en el navegador durante el `max-age`. `preload` es en la práctica irreversible (la lista viaja en las versiones de los navegadores) e `includeSubDomains` alcanza a todo subdominio del nombre, incluidos los que hoy no existen: los dos quedan para una spec nueva. La CSP es la de hoy sin el `'unsafe-inline'` de `script-src` y de `style-src` (con un nonce para los `<style>`), y con los dos Playgrounds en `connect-src` hasta que A4 los retire (ADR 0005, «Consecuencias»). `Referrer-Policy` se conserva porque el ADR 0006 D16 descartó Sanctum, que era lo que pedía `same-origin`. `Permissions-Policy` apaga lo que el taller no usa. COOP aísla la ventana de las que abre: en los navegadores actuales, los enlaces externos ya abren sin `opener`. Según Q3: con la opción A no hay `style-src-attr 'unsafe-inline'` (o sólo lleva `'unsafe-hashes'` con el hash de las cadenas conocidas), y con la C es `style-src 'self' 'unsafe-inline'`, sin nonce ni `style-src-attr`.
- **FR-014** *(propuesta)*: El valor de HSTS DEBE salir de la configuración y subir por escalones: 300 segundos al abrir; 86 400 (un día) cuando el recorrido con la CSP en un navegador real da 0 violaciones; 604 800 (una semana) después de una renovación forzada sin cortes; y 31 536 000 (un año) después de la primera renovación natural en producción. Se baja de escalón ante cualquier problema de certificado. El motivo es que un certificado vencido con un `max-age` largo deja el taller inaccesible sin salida para el alumno.
- **FR-015**: Las cabeceras de FR-013 DEBEN llegar una sola vez y con su valor exacto en toda clase de respuesta, incluidas las que genera el propio Nginx (404, 413, 429, 502 y las redirecciones) y las de los archivos con huella, salvo HSTS, que sólo se envía por HTTPS (por HTTP los navegadores lo ignoran). Cuando un `location` de Nginx define alguna cabecera propia, deja de heredar las del servidor: ningún `location` puede perder las de FR-013. Una prueba pide una URL de cada clase y compara cabecera por cabecera.
- **FR-016**: La política de contenido DEBE ser la de FR-013, en el modo público y en el local para que el recorrido se pueda probar sin dominio: `script-src` sin `'unsafe-inline'`, ninguna directiva con `'unsafe-eval'` ni comodines, y `style-src` según Q3. Al cambiar la política, el recorrido de la User Story 3 y la guardia de FR-019 corren primero. [NEEDS CLARIFICATION: Q3, qué CSP de estilos acepta el taller. La recomendada: un nonce para los `<style>` y `style-src-attr 'unsafe-inline'`, sin tocar el editor.]
- **FR-017**: La salida construida y el código que sirve Nginx NO DEBEN tener nada que bloquee la política elegida. Con cualquier opción de Q3: ni `<script>` en línea, ni manejadores `on…=`, `eval`, `new Function` ni URLs `javascript:`. Con las opciones A y B, además, ningún `<style>` en línea en `dist/index.html` (los que arma el editor llevan el nonce). Con la opción A, además, ni atributos `style=` en las plantillas, ni `setAttribute('style', …)`, ni asignaciones a `style.cssText` (la CSP bloquea `cssText` y deja pasar las propiedades sueltas, como `style.display`; MDN, `style-src`). Hoy hay seis sitios en el código propio: cuatro `style=` en plantillas (`frontend/systems.js`, `frontend/app.js` y dos en `frontend/lab.js`; el de `systems.js` toma su valor del contenido) y dos asignaciones a `cssText` (`frontend/lab.js` y `frontend/src/shared/lib/celebration.ts`). El mapa del front (§11) cuenta sólo los cuatro primeros. Con la opción B no hace falta reemplazarlos.
- **FR-018**: El editor (CodeMirror 6) y la celebración DEBEN verse y funcionar con la política elegida. CodeMirror crea un `<style>` al montarse (sobre un documento, `style-mod` siempre lo hace) y su API admite un nonce (`EditorView.cspNonce`): con las opciones A y B de Q3, el nonce viaja por respuesta y el editor lo recibe de la página. Además, su numeración de líneas asigna `cssText` al montarse (`@codemirror/view` 6.43.13): con B lo permite `style-src-attr`, y con A no pasa sin cambiar el editor o permitir esa cadena por hash. La celebración usa `useWorker: false` y los kits ZIP, `zipSync`: ninguno pide un worker `blob:`; si eso cambia, la CSP necesita `worker-src`.
- **FR-019**: Una guardia de regresión en `npm test` (en `qa/build-check.ts` o en un check nuevo) DEBE fallar si reaparece, en `dist/index.html` o en el código propio de las vistas, cualquiera de lo que la política elegida bloquea según FR-017, y citar el archivo y la línea. Los valores esperados salen de MDN y de la política de FR-013, no de la guardia misma (constitución, principio II). No ve el código de terceros que se empaqueta (CodeMirror, React…): para eso manda el recorrido en un navegador real (V2 y FR-044).

**El HTML y el build**

- **FR-020**: `vite-plugin-singlefile` DEBE retirarse de `frontend/vite.config.ts`, de `package.json` y del lockfile, que queda sincronizado. El build deja `dist/index.html` y archivos con huella en su nombre. Como pide `docs/architecture.md` (contrato de la salida autónoma), se define el cambio de entrega y se actualizan Docker, Nginx, QA y README antes de reemplazar el build: `frontend/Dockerfile` copia todo `dist/`; `docker/compose.preview.yaml` lo monta entero (A2 ya lo hace); y `qa/build-check.ts`, el check de arranque de A2 y la documentación pasan del contrato «un solo documento» al de «el HTML más sus archivos»: sin dependencias externas, sin `<script>` ni `<style>` en línea, topes de tamaño por archivo y todo archivo que el HTML nombra existe. Es lo que el ADR 0004 aceptó sobre el ADR 0001: `dist/index.html` deja de ser autónomo y no funciona con `file://`.
- **FR-021**: Nginx DEBE servir los archivos con huella con caché larga e inmutable (`Cache-Control: public, max-age=31536000, immutable`) y `index.html` con `Cache-Control: no-cache`, sin perder en ninguna de esas respuestas las cabeceras de FR-013 (FR-015). Con las opciones A y B de Q3, `index.html` lleva el nonce de cada respuesta.
- **FR-022**: Ningún documento del currículo DEBE servirse sin sesión. Con A3 hecha, ni el documento estático de A2, ni `build/curriculum.json`, ni su meta están en la imagen web. Una prueba pide al Nginx público las rutas conocidas del puente y recibe 404, y otra busca en `/usr/share/nginx/html` los marcadores del currículo que fija A2 (un ID, un título y una pista por familia) y no encuentra ninguno. El contenido sólo sale por `/api/` con sesión (C3a). Si A3 no retiró el puente, C4 no se despliega.
- **FR-023**: El taller DEBE verse y comportarse igual: las mismas vistas, el mismo progreso, los mismos enlaces profundos (`?ejercicio`, `?campana`, `?sistema`, `?mundo` y `?lenguaje`) y el mismo aspecto, incluido el de las vistas donde había un `style=` y el del editor. `npm run dev` y `docker/compose.preview.yaml` siguen sirviendo la aplicación sin API.

**Cookies y CSRF**

- **FR-024**: En el despliegue público, toda cookie que emite la aplicación DEBE llevar `Secure`. La de sesión y la de dispositivo (C3a) DEBEN llevar además el prefijo `__Host-` (`__Host-taller-session`, ADR 0006 §4.2), sin `Domain` y con `Path=/`, y siguen siendo HttpOnly y `SameSite=Lax`. `XSRF-TOKEN`, que lee el front, y la de «recordarme» conservan el nombre que fija el framework y llevan `Secure`; si el plan puede prefijarlas sin reescribir piezas del framework, también (propuesta). El nombre y los atributos salen de la configuración del despliegue, no de `APP_ENV`: en el modo local no llevan prefijo ni `Secure`, porque no se puede asumir que un navegador acepte cookies `__Host-` por HTTP.
- **FR-025**: Con HTTPS empieza a llegar `Sec-Fetch-Site`, y la verificación de CSRF de Laravel lo mira antes que el token (ADR 0006 §4.2). Una prueba en un navegador real DEBE confirmar que el ingreso y una modificación del mismo origen pasan, y que una modificación enviada desde otro origen se rechaza con 419 `csrf_token_mismatch`. `APP_URL` pasa a ser `https://<dominio>`, y los links de invitación y de recuperación siguen armándose desde la configuración, nunca desde `Host` (C3a).

**IP real y exposición directa**

- **FR-026**: La IP del cliente que ven los límites de Nginx y de Laravel, el bloqueo por cuenta y los registros DEBE ser la IP de origen de la conexión TCP que recibe Nginx, sin ningún proxy delante. `trustProxies` queda vacío, y la IP no se toma de ninguna cabecera que mande el cliente (`X-Forwarded-For`, `Forwarded`, `X-Real-IP`): un pedido con esas cabeceras falsas cuenta contra su IP verdadera. Si algún día hubiera un proxy delante, `trustProxies` se limitaría a su IP exacta (ADR 0006 §4.6), y eso sería una spec nueva.
- **FR-027**: Nada entre el cliente y Nginx DEBE reemplazar la IP de origen. Docker, si no se le da una dirección, también publica en IPv6 y lo atiende con su proxy de usuario hacia el contenedor, que mostraría la IP del puente (Edge Cases): por eso se publica en IPv4 explícito (FR-001) y el taller no tiene registro AAAA. Una prueba desde otra red DEBE mostrar la IP pública del cliente en el registro de Nginx y en el contador de un límite de Laravel (V3).
- **FR-028** *(propuesta)*: Nginx DEBE acotar el tiempo de espera de la cabecera y del cuerpo y las conexiones simultáneas por IP, con valores que fija el plan según la carga esperada (ADR 0006 §13.15; supuesto de trabajo: un aula de 40 detrás de un mismo NAT, como C3a), de modo que unas pocas conexiones lentas no agoten las `worker_connections` (hoy 256 por proceso). Los límites de pedidos por IP son de C3a (su FR-044). La protección contra un ataque volumétrico queda fuera: no hay CDN.
- **FR-029** *(propuesta)*: Desde C4 los registros de Nginx y de la aplicación llevan IP reales, que pueden ser datos personales de quien visita el taller. DEBEN rotar por tamaño y cantidad (ADR 0006 D34, «logs con rotación»), y su retención en días la fija el ADR 0006 §13.13, todavía abierta; mientras tanto, la rotación apunta a unos 14 días a la carga esperada (a medir), como las retenciones de `runs` y de `sync_operations`.

**MySQL con mínimo privilegio**

- **FR-030**: Ningún servicio DEBE conectarse a MySQL con root ni con un usuario con privilegios sobre toda la base. El usuario `taller` de hoy (todos los privilegios sobre la base, el que crea `MYSQL_USER` de la imagen) deja de usarse y pierde esos privilegios.
- **FR-031** *(propuesta, Q5)*: Los usuarios y sus permisos DEBEN ser estos. Los nombres los fija el plan (D21 ya usa `taller_mail`); la lista exacta de privilegios, el plan con el DBA.

  | Usuario | Lo usan | Puede | No puede |
  | --- | --- | --- | --- |
  | `root` | `db-grants` (perfil `ops`) y la inicialización de la imagen | Todo, sólo ahí | Ningún otro servicio ni script de la aplicación; su contraseña vive en `.env` y no entra en las imágenes |
  | `migrate` | El servicio `migrate` (migraciones y `content:import`) y el chequeo de transacciones largas | DDL y escritura sobre las tablas de la base `taller`; `GET_LOCK`; leer `performance_schema.events_transactions_current` (C3a) | `GRANT`; privilegios globales como `SUPER` o `FILE`; otras bases |
  | `app` | `php` y `scheduler` | Leer el contenido; leer y escribir cuentas, sesiones, invitaciones, tokens, progreso, ejecuciones (el encolado, el barrido y la poda), caché y colas; borrar lo del alumno que suprime la purga | Crear, alterar o borrar tablas; escribir el contenido (lo importa `migrate`); leer otras bases o `mysql.*`; `GRANT` |
  | `runs` | `worker-runs` (B2) | Leer el contenido y las pruebas; leer y escribir `runs`, `attempts`, `attempt_tests`, `attempt_payloads` y el progreso que actualiza el cierre de una ejecución | Cuentas, sesiones, invitaciones, tokens y correo; DDL |
  | `mail` | `worker-mail` (C3b, D21) | `mail_jobs`, `failed_jobs` y las columnas `sent_at` y `send_failed_at` de `invitations` | Todo lo demás |
  | `backup` | El servicio `backup` | Leer todas las tablas y lo que `mysqldump` pide para un volcado consistente con la posición del binlog (según el manual de 9.7: `SELECT`, `SHOW VIEW`, `TRIGGER`, `RELOAD` para la posición del binlog, y `PROCESS` salvo que se omitan los tablespaces) | Cualquier escritura, DDL o `GRANT` |

- **FR-032**: `db-grants` (el servicio de operación de C3a, que aplica con root un SQL idempotente) DEBE crear estos usuarios y concederles sólo lo de la matriz: con un script de inicialización en los volúmenes nuevos y un comando único en los existentes, como C3a. El traspaso de los servicios a sus usuarios se hace sin interrumpir el servicio ni dejar un paso en que alguno no pueda conectarse, y `taller` pierde sus privilegios cuando el último servicio pasó al suyo. `backend/api/scripts/init-env.sh` genera las contraseñas sin reemplazar las que ya existan; viven en `.env`, fuera de Git.
- **FR-033**: Una prueba con los usuarios reales contra MySQL 9.7 DEBE comprobar, para cada fila de la matriz, lo que puede (positivas) y lo que no (negativas: un DDL, un `GRANT`, la escritura de una tabla ajena y `FILE`), y comparar `SHOW GRANTS` de cada usuario con la matriz, de modo que ampliar un permiso sin tocar la matriz falle. Es la misma idea del criterio J de C3a (una prueba con un usuario restringido), y sus valores esperados salen de la matriz, no de las sentencias que la aplican.

**Respaldos fuera del host**

- **FR-034**: Cada noche, el servicio `backup` DEBE hacer un volcado lógico y consistente de la base (en una transacción y con la posición del binlog, ADR 0006 §9), con la estructura sola de `sessions`, `cache`, `cache_locks`, `jobs`, `mail_jobs` y `failed_jobs`; y DEBE copiar aparte, después de cada volcado, el libro de supresiones (`account_deletions`, C3b) si existe (D37).
- **FR-035**: El volcado DEBE cifrarse antes de salir del host con una clave que el host sólo puede usar para cifrar (clave pública), de modo que quien tenga sólo el host o sólo el destino no pueda leerlo. La clave privada la tiene el usuario fuera del host y nunca entra en el host, en Git ni en una imagen. Sin ella una restauración es imposible: guardarla y probarla es una acción del usuario (acción 6).
- **FR-036**: Las credenciales con que el host escribe en el destino NO DEBEN permitir leer, borrar ni sobrescribir copias existentes. La retención y el borrado de lo vencido los hace el destino por antigüedad, o un proceso con otra credencial que no está en el host. Con el host comprometido, un atacante puede agregar copias, pero no leer ni destruir las anteriores. [NEEDS CLARIFICATION: Q2, a dónde van los respaldos y cuánto trabajo se puede perder. La recomendada: almacenamiento de objetos de un proveedor, con cifrado del lado del taller, sin binlog afuera y con 24 horas de pérdida máxima.]
- **FR-037**: La retención DEBE ser de al menos 7 copias diarias y 4 semanales, y ninguna de más de 35 días (ADR 0006 §9 y §11; Ley 25.326, supresión). La prueba de restauración (FR-042) comprueba el recuento y la antigüedad máxima en el destino.
- **FR-038**: El binlog DEBE quedar configurado como en el ADR 0006 §9 (`binlog_expire_logs_seconds=604800` y `binlog_row_image=MINIMAL`) si ningún subplan anterior lo hizo; sirve para volver a un punto en el tiempo ante un error lógico con el host vivo (D37). No sale del host (Q2), así que ante la pérdida del host se recupera hasta el último volcado externo: hasta 24 horas de trabajo y, si hubo supresiones de cuentas en ese lapso, esas cuentas reaparecen hasta que se reapliquen. La spec lo declara, y el aviso de privacidad lo dice (ADR 0006 §12).
- **FR-039**: El contenedor de respaldo DEBE correr sin puertos, con el disco de sólo lectura salvo un directorio temporal acotado, sin capacidades (`cap_drop: ALL`) y sin el socket de Docker, en una red que le da MySQL y la salida al destino y nada más. Con `taller` (que ya tiene salida por la red `edge`) y `worker-mail` (C3b), es de los pocos contenedores con salida a Internet.
- **FR-040**: El despliegue (`backend/api/scripts/deploy.sh`) y el volcado NO DEBEN solaparse: no se migra durante un volcado (ADR 0006 §10), y uno espera al otro o aborta con un mensaje claro.
- **FR-041** *(propuesta, Q4)*: Un respaldo que falla DEBE verse: queda en los registros con su causa y, según Q4, en el comando de estado y en el latido. Si el destino no responde, el volcado cifrado se conserva localmente en un directorio de tamaño acotado y se reintenta, sin llenar el disco ni borrar nada.
- **FR-042**: Antes de abrir el router y luego cada mes (ADR 0006 §9), una prueba de restauración DEBE: bajar la copia más reciente del destino con credenciales de lectura que no están en el host; descifrarla con la clave privada del usuario; restaurarla en una base descartable, nunca en la de producción; comparar los conteos de filas y una huella por tabla de las tablas de cuentas, progreso e intentos contra el origen en el momento del volcado; reaplicar el libro de supresiones (`taller:reapply-deletions`, C3b) si existe; recuperar a un punto en el tiempo con el binlog desde la posición del volcado; y medir el tiempo total. Se registra la fecha, el tamaño, el tiempo y el resultado. Si dura más de una hora, es el disparador del ADR 0006 §9 para cambiar de herramienta de volcado.

**Verificación y entrega**

- **FR-043**: DEBE existir un humo del despliegue público que pida, por HTTPS, una URL de cada clase de respuesta (FR-015), el 301 del puerto 80 y el rechazo por IP o por otro nombre, y compare una por una las cabeceras de FR-013, los nombres y atributos de las cookies y la redirección. La parte que no depende de la autoridad pública corre en local con un certificado de prueba (FR-010) y entra a las comprobaciones habituales; la que necesita el dominio real la corre quien opera al desplegar.
- **FR-044**: Antes de abrir el reenvío de puertos del router DEBEN estar cumplidos y registrados: FR-033 en verde; FR-043 en local y contra el dominio real con el servidor de prueba de la autoridad; el recorrido de la User Story 3 sin violaciones de CSP; la restauración de FR-042; HSTS en su escalón inicial; y C3 entregado, con una cuenta admin creada y el aviso de privacidad vigente (la spec de C3a recomienda que C3b llegue antes de exponer). Es la compuerta de salida de C4.
- **FR-045**: La documentación DEBE actualizarse en el mismo cambio: `AGENTS.md`, `README.md`, `docs/architecture.md`, `qa/AGENTS.md` y `backend/api/AGENTS.md`, más una guía de operación con los comandos del modo público, la restauración paso a paso, la rotación de secretos y qué hacer si falla una renovación. Un ADR registra la enmienda del ADR 0004 §1 (cliente ACME, desafío, destino de los respaldos y CSP con nonce); su número lo asigna quien integra, porque el 0008 lo usa el épico del front.
- **FR-046**: Pasan `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `git diff --check`, `npm run api:test`, `npm run api:format:check`, `npm run api:analyse` (en el nivel que deja C6), `npm run api:smoke`, `npm run api:content:check` y `sh backend/api/scripts/deploy-check.sh` en el modo local, más las pruebas propias de C4. La imagen del front sigue construyendo: su etapa de build corre `npm test`.
- **FR-047**: NO DEBE agregarse ninguna dependencia de npm ni de Composer: sólo se retira `vite-plugin-singlefile`, y el lockfile queda sincronizado. Los paquetes y las imágenes del sistema (el módulo ACME y las herramientas de respaldo) se bajan sólo con permiso, con nombre, origen y tamaño (constitución, principio VII).

### Key Entities *(include if feature involves data)*

- **Dominio público:** el nombre con el que el taller responde en Internet. Es configuración del despliegue y de él salen `APP_URL`, el certificado y la redirección.
- **Modo público y modo local:** el modo local es el de hoy (`127.0.0.1:8080`, HTTP, sin dominio). El modo público lo agrega la configuración explícita del despliegue (FR-002).
- **Certificado y cuenta ACME:** lo que obtiene y renueva el cliente de la autoridad. Su estado persiste en un volumen propio.
- **Desafío:** la prueba de que el taller controla el dominio (HTTP-01 o TLS-ALPN-01 en la opción A de Q1).
- **Política de seguridad del navegador:** las cabeceras de FR-013, con la CSP y su nonce por respuesta (según Q3) y la rampa de HSTS.
- **Cookie `__Host-`:** una cookie con `Secure`, sin `Domain` y con `Path=/` que el navegador sólo acepta de una conexión segura; la de sesión y la de dispositivo.
- **IP real:** la IP de origen de la conexión que recibe Nginx, la única que cuentan los límites.
- **Usuario de MySQL y matriz de privilegios:** una identidad por rol (FR-031), con lo que puede y lo que no.
- **Respaldo:** un volcado lógico cifrado con la posición del binlog, más la copia aparte del libro de supresiones.
- **Clave de cifrado de los respaldos:** una clave pública en el host, para cifrar, y una privada que sólo tiene el usuario, fuera del host.
- **Destino externo y sus credenciales:** el lugar fuera del host de los respaldos; una credencial que sólo agrega (la del host) y otra que sólo lee (la del usuario).
- **Prueba de restauración:** el registro mensual de fecha, tamaño, tiempo y resultado de restaurar la copia en una base descartable.
- **Compuerta de salida:** la lista de FR-044 que se cumple antes de abrir el router.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde una red que no es la del hogar, `https://<dominio>` carga el taller y un alumno invitado completa el recorrido invitación, ingreso y laboratorio sin advertencias del navegador (1 de 1). `http://` responde 301 a `https://` en el 100 % de los pedidos probados (con el 80 abierto), y por la IP o con otro nombre se entregan 0 bytes de la aplicación.
- **SC-002**: El certificado se emite y se renueva una vez de forma forzada, sin intervención y con 0 conexiones fallidas durante el cambio, y el criterio de renovación no usa ningún número fijo de días.
- **SC-003**: Las 6 cabeceras de FR-013 están con su valor exacto, una sola vez, en el 100 % de las clases de respuesta probadas (8 de 8), incluidos los errores de Nginx y el 301 del puerto 80. HSTS sólo llega por HTTPS.
- **SC-004**: El recorrido en un navegador real por las 8 vistas, los 5 enlaces profundos, el editor y la celebración da 0 violaciones de CSP, y la política cumple Q3: `script-src` sin `'unsafe-inline'`, `style-src` sin `'unsafe-inline'` (salvo con la opción C) y ninguna directiva con `'unsafe-eval'`.
- **SC-005**: `dist/index.html` y el código propio de las vistas tienen 0 sitios de los que bloquea la política elegida (FR-017; con la opción A, hoy son 6), y la guardia de FR-019 falla ante uno que se agregue. Lo que arma el código de terceros, como CodeMirror, lo cubre SC-004.
- **SC-006**: Con dos IP de origen distintas desde afuera, los límites cuentan por separado (2 de 2), y 20 pedidos con cabeceras de IP falsas cuentan contra la IP verdadera (0 evasiones).
- **SC-007**: Para cada uno de los 6 usuarios de MySQL, el 100 % de las pruebas positivas pasa y el 100 % de las negativas falla como debe, `SHOW GRANTS` coincide con la matriz y hay 0 servicios conectados como root o con todos los privilegios.
- **SC-008**: Una restauración desde la copia externa, con la clave privada y sin copiar nada del host de producción, termina con los mismos conteos y huellas que el origen (0 diferencias) y con el tiempo medido, que con el volumen de hoy es de una hora o menos.
- **SC-009**: Con las credenciales del host (simulando un host comprometido), 0 copias existentes se pueden leer, borrar ni sobrescribir (3 intentos de 3 rechazados).
- **SC-010**: La expiración del destino está configurada a 35 días (se comprueba en su consola o API), y al cerrar el primer ciclo hay al menos 7 diarias y 4 semanales y 0 de más de 35 días. Esta última parte sólo se puede verificar 35 días después de entregar: se anota como evidencia pendiente.
- **SC-011**: Desde otra red, sólo responden los puertos de FR-001 (el TCP 443 y, salvo que Q1 lo cierre, el 80), y en la configuración efectiva de Compose un solo servicio (`taller`) publica puertos.
- **SC-012**: En el modo local, 0 diferencias de comportamiento: los checks de FR-002 pasan sin editarlos y el stack publica sólo `127.0.0.1:8080`.
- **SC-013**: Pasan los comandos de FR-046, y `package.json` y `package-lock.json` quedan sin ningún paquete nuevo y sin `vite-plugin-singlefile`.

## Riesgos

1. **Un certificado que no se renueva, con HSTS, deja el taller inaccesible**, y el alumno no puede continuar. Let's Encrypt ya no avisa por correo. *Mitigación:* la rampa de HSTS (FR-014), una renovación forzada probada (FR-008), el margen de un tercio de la vida (FR-007), el estado consultable (FR-011) y el monitor externo (Q4).
2. **La CSP rompe el editor o una vista.** El mapa del front cuenta cuatro `style=`; en el código propio hay seis sitios, y además CodeMirror crea un `<style>` al montarse y asigna `cssText` en su numeración de líneas, lo que ninguna spec anterior contaba. *Mitigación:* Q3 (con la opción B no hace falta cambiar el editor), la verificación V2, el recorrido en un navegador real (FR-044) y la guardia de FR-019, que no ve el código de terceros.
3. **El entorno doméstico.** El proveedor puede compartir la IP pública (CGNAT) o filtrar el 80 y el 443; la IP puede cambiar; el router puede devolver su propia IP a quien entra desde la red local. *Mitigación:* la acción 1, antes del plan, y el DNS dinámico y el monitor externo (Q4). Si la conexión no admite la entrada, C4 no se puede cumplir como está pensada.
4. **La IP real se oculta y el límite se vuelve global.** Un cliente por IPv6 o un reenvío del router puede aparecer con la IP del puente o del router, y un solo atacante gastaría el límite de todos. *Mitigación:* IPv4 explícito (FR-001), sin registro AAAA, la prueba desde otra red (FR-027) y V3.
5. **Un host único, doméstico y expuesto directamente.** No hay CDN: un ataque volumétrico no se puede mitigar, y todo corre en un equipo. *Mitigación:* límites de conexión y de tiempo (FR-028) y los respaldos. La disponibilidad queda fuera de alcance (YAGNI).
6. **Los respaldos.** La clave privada se pierde y ninguna copia se puede leer; el destino admite que el host borre; una restauración nunca se probó; y las cuentas suprimidas en las últimas 24 horas reaparecen tras restaurar (ADR 0006 §12). *Mitigación:* la restauración antes de abrir y cada mes (FR-042), la credencial que sólo agrega (FR-036), la guarda de la clave como acción del usuario y el aviso de privacidad.
7. **Docker publica por encima de `ufw`.** El firewall del host no filtra lo que Docker publica. *Mitigación:* sólo `taller` publica, y sólo los puertos de FR-001 (con su prueba), más el reenvío del router.
8. **El ejecutor tiene el socket de Docker, que equivale a root en el host.** C4 no lo cambia, pero la exposición eleva su costo si algo falla. *Mitigación:* B2 lo deja sólo en una red interna con el worker, sin puertos y con token; FR-001 lo vigila con la prueba de puertos. Queda como riesgo residual de la exposición (ADR 0005, «Consecuencias»).
9. **Trabajo en paralelo sobre los mismos archivos.** C4 toca `docker/nginx/nginx.conf`, `docker/compose.yaml`, `frontend/Dockerfile`, `frontend/vite.config.ts`, `backend/api/scripts/init-env.sh` y `backend/api/AGENTS.md`, que también tocan C3, A3 y los ports del front, y `frontend/app.js`, `frontend/lab.js` y `frontend/systems.js`, que tocan F5, F7 y F8 (Q3). *Mitigación:* los integra el agente principal, de a uno.
10. **El módulo ACME de Nginx es joven** (0.4.x), hace HTTP-01 y TLS-ALPN-01 (la página de NGINX sólo describe HTTP-01) y va atado a la versión exacta de Nginx. *Mitigación:* V1, que prueba los dos desafíos, y la salida a la opción B de Q1; la imagen no se sube sin subir el módulo.
11. **Los secretos crecen:** cinco contraseñas nuevas de MySQL (con Q5 en A), las credenciales del destino y la clave pública. *Mitigación:* `init-env.sh` sin reemplazar lo existente, `.env` con permisos 600 y fuera de Git y del contexto de Docker (constitución VII).
12. **Un solo equipo para desarrollar y servir,** como parece hoy (el nombre de proyecto de Compose es único y los comandos de otro worktree tocan el stack del checkout principal). *Mitigación:* FR-003, y la restauración como red de seguridad para el peor caso.
13. **Esta spec se escribió sin Docker, sin descargas y sin correr el build.** Lo que dice de Docker, de Nginx, del módulo ACME, de CodeMirror y de MySQL sale del código del repositorio, de la documentación oficial y de metadatos; no se ejecutó. *Mitigación:* las verificaciones V1 a V4 del plan.
14. **Los borradores vecinos y el ADR 0006 siguen sin cerrar.** Si C3a, A2 o el épico del front cambian en su clarify, esta spec se ajusta. *Mitigación:* lo que se toma de ellos está marcado como supuesto.

## Relación con C3, A3 y el front

Lo que sigue sale de los borradores de las ramas hermanas, que no pasaron por el clarify. Se lee como supuesto y se ajusta si cambian. Se citan por ruta y por rama, sin enlace, porque todavía no están en esta rama.

- **C3a** (`specs/004-c3-identidad-acceso/spec.md`, rama `spec/c3-identidad`):
  - Deja a C4 el TLS, las cookies `__Host-` y la IP real del cliente («queda fuera de todo el épico»), y supone una sola IP hasta C4. Sus límites por red (el ingreso, 5 por minuto por email y red y 60 por red) y las zonas de `limit_req` de Nginx (su FR-044) dependen de FR-026 y FR-027.
  - `db-grants` y su prueba con un usuario restringido (su FR-040 a FR-042) son el mecanismo que C4 extiende (FR-032 y FR-033). El chequeo de transacciones largas lee `performance_schema.events_transactions_current`.
  - Las cookies (sesión HttpOnly con `SameSite=Lax`, de dispositivo de 180 días, de «recordarme» y `XSRF-TOKEN`) son las de FR-024. `deploy-check.sh` y `api:content:check` se autentican con una cuenta de prueba propia (su FR-046).
  - Recomienda que C3b llegue antes de exponer (su riesgo 8), y pide una prueba en un navegador real (su FR-050) sin que Playwright esté adoptado.
- **C3b** (propuesta de la spec de C3a): trae `worker-mail` y su usuario `mail`, `account_deletions`, `taller:reapply-deletions` y `/api/admin`. C4 usa el libro de supresiones en el respaldo (FR-034 y FR-042) y el usuario `mail` de la matriz.
- **A2** (`specs/006-a2-compuerta-arranque/spec.md`, rama `spec/a2-compuerta`):
  - Conserva `vite-plugin-singlefile` hasta C4, saca el currículo de `dist/index.html` y lo sirve como un documento estático junto al HTML, que A3 retira. Como C4 depende de A3, ese documento nunca sale a Internet (su riesgo 11; FR-022).
  - Cambia `qa/build-check.ts` (el script como módulo, un tope medido y un oráculo de ausencia) y suma un check que arranca el bundle del dist. Los dos leen el script en línea, y C4 los pasa al contrato de varios archivos (FR-020).
  - Su FR-016 ya monta todo `dist/` en la vista previa y la CSP de A2 no cambia: C4 es quien la endurece.
- **El épico del front** (`specs/front-react/legacy-map.md` §11 y `specs/front-react/roadmap.md`, y `specs/003-f1-red-de-seguridad/spec.md`, rama `spec/front-react`):
  - El mapa (§11) y la fila de C4 de su hoja de ruta cuentan cuatro `style=` (uno en Sistemas, dos en el laboratorio y uno en Método) y dicen que C4 espera a F5, F7 y F8 o los reemplaza por clases en su PR. Esta spec suma dos `cssText` en el código propio y, en código de terceros, el `<style>` y el `cssText` de la numeración de líneas de CodeMirror (Q3).
  - F8 corre en el último tramo del épico, después de la ola de C4 (ola 4): con la opción A de Q3, reemplazar los `style=` en C4 choca con el épico, y esperar a F8 tiene costo.
  - `celebration.ts` vive en `frontend/src/shared/lib/` y sobrevive a los ports: con la opción A de Q3 hay que editarlo en C4, y con la B no.
  - F1 trae Playwright (ADR 0008, sin aprobar). Si existe cuando llegue C4, el recorrido de FR-044 corre ahí, contra el stack con las cabeceras de C4; si no, es una pasada manual declarada como límite.

## Assumptions

- **Fuente.** El ADR 0004 está aceptado. El ADR 0006 está en estado «propuesta» y a la espera de su aprobación (acción de la hoja de ruta): esta spec lo usa como base, como pide la hoja de ruta, y lo dice. Si lo enmienda, esta spec se ajusta.
- **Punto de partida.** C1 y C2 son los de `master` (0df5b07); C6 está planificada, con su spec y su plan en `master`, y corre en paralelo con C3. C3 y A3 están entregados cuando C4 se implementa: C4 espera a C3 completo (C3a y, si se parte, C3b) y a A3, que retira el documento estático de A2.
- **Un solo host, doméstico,** con Docker 29.8 y Compose, en Linux (ADR 0005, «Host»), que sincroniza la hora. Puede tener IP dinámica. Un solo dominio, dedicado al taller, resuelto sólo por IPv4.
- **Let's Encrypt** es la autoridad (ADR 0004), con su perfil por omisión; si el certificado es ECDSA o RSA lo decide el plan. El contacto de la autoridad es un correo de quien opera, que ya no recibe avisos de vencimiento.
- **El modo local sigue siendo el valor por omisión** y el público es una activación explícita: perfil o archivo de Compose con variables propias. El plan elige el mecanismo (FR-002).
- **Sin proxy delante** (ADR 0004). `trustProxies` queda vacío.
- **Carga de referencia:** un aula de 40 detrás de un mismo NAT, y hasta unos 1 000 usuarios activos en el pico (ADR 0006, S2; la spec de C3a usa el mismo supuesto). Dimensiona los límites de conexión (FR-028).
- **La rampa de HSTS, la rotación de registros a unos 14 días y el aislamiento del despliegue público son propuestas** de esta spec, que no vienen del ADR ni del pedido; se corrigen en el clarify.
- **Los Playgrounds** siguen en `connect-src` hasta que A4 retire el cliente (ADR 0005, «Consecuencias»).
- **Sin mediciones propias.** Esta spec no corrió Docker, ni el build, ni un navegador, ni descargó nada. Los tamaños y las versiones salen de metadatos del 2026-10-05, y el código de CodeMirror, React y `canvas-confetti` se leyó en el `node_modules` ya instalado en el checkout principal, y la documentación de MDN, de Vite, de CodeMirror, de NGINX, de Let's Encrypt, de Docker y de MySQL se leyó en esa fecha; Context7 no estuvo disponible.
- **Dependencias de la hoja de ruta:** A3 y C3. C4 desbloquea el despliegue público, no a otro ítem.

## Alternativas consideradas

Sólo las que cambian lo que se construye. Q1 a Q5 tienen sus propias tablas arriba.

| Tema | Alternativas | Decisión y motivo |
| --- | --- | --- |
| Dónde termina el TLS | El Nginx del taller; un túnel o una CDN de terceros; un proxy propio delante | El Nginx del taller (usuario, ADR 0004): sin un tercero que vea el tráfico y sin cabeceras de IP en las que confiar |
| Cómo se activa lo público | Un perfil de Compose; un archivo de Compose que se suma; una variable que cambia la configuración de Nginx | Lo decide el plan. El requisito es que sea explícito, falle cerrado si falta algo y no dependa de `APP_ENV` (FR-002) |
| Cuándo se cumple la CSP estricta | Retirar `vite-plugin-singlefile` y usar un nonce; conservarlo y poner en la CSP un hash del script único | Retirarlo (ADR 0004). Un hash por build para un script único sirve, pero no cubre los `<style>` que CodeMirror arma en ejecución, y habría que calcular un hash por cada uno |
| TLS | Sólo 1.3; 1.2 y 1.3 | 1.2 y 1.3 con la lista «intermediate» de Mozilla: un aula puede tener navegadores viejos, y 1.3 queda preferido. Pasar a sólo 1.3 es un cambio chico que se decide con datos |
| HSTS | `preload` e `includeSubDomains`; un `max-age` corto fijo; una rampa sin `preload` | La rampa sin `preload` ni `includeSubDomains`: `preload` es en la práctica irreversible e `includeSubDomains` alcanza a subdominios que hoy no existen, y un `max-age` corto fijo deja el beneficio a medias |
| IP real | `trustProxies` con rangos; leer `X-Forwarded-For`; el protocolo PROXY; el origen TCP (`REMOTE_ADDR`) | El origen TCP, sin proxy delante (ADR 0006 §4.6): cualquier cabecera del cliente se falsifica |
| Cómo se publican los puertos | En `0.0.0.0` y `[::]` (el valor por omisión); en IPv4 explícito; con la red del host | IPv4 explícito. El valor por omisión pone el proxy de usuario de Docker en el camino de IPv6, y la red del host rompe el aislamiento de redes de Compose |
| Formato del respaldo | Volcado lógico; copia física (xtrabackup o clone); instantánea del volumen | Lógico (ADR 0006 §9): simple y portable. El físico llega con el disparador de unos 20 GB o de una hora de restauración |
| Cifrado de los respaldos | Clave pública (el host sólo cifra); una contraseña en `.env`; sin cifrar | Clave pública: con el host comprometido no se puede leer lo que ya salió. Con una contraseña en `.env`, quien llega al host llega a las copias |
| Qué cuenta como «fuera del host» | Otro disco del mismo equipo; otro equipo del hogar; un destino fuera del sitio | Fuera del sitio (Q2): un disco del mismo equipo no sobrevive a la pérdida del host, y otro equipo del hogar comparte los riesgos del sitio |
| Dónde corre la prueba de restauración | En producción; en una base descartable junto a ella; en otra máquina | En una base descartable (FR-042). Restaurar sobre producción destruye lo que se quiere proteger |

## Fuentes consultadas el 2026-10-05

- Let's Encrypt: [de 90 a 45 días](https://letsencrypt.org/2025/12/02/from-90-to-45) y [fin de los avisos de vencimiento](https://letsencrypt.org/2025/01/22/ending-expiration-emails).
- NGINX: [nginx-acme](https://github.com/nginx/nginx-acme) (README y CHANGELOG), [documentación del módulo ACME](https://docs.nginx.com/nginx/admin-guide/dynamic-modules/acme/) y [paquetes de Linux](https://nginx.org/en/linux_packages.html).
- Política de contenido: MDN, [`style-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src); Vite, [guía de funciones](https://vite.dev/guide/features) (sección «Content Security Policy (CSP)»); CodeMirror, [`EditorView.cspNonce`](https://codemirror.net/docs/ref/#view.EditorView^cspNonce) y [`style-mod`](https://github.com/marijnh/style-mod).
- Docker: [port publishing](https://docs.docker.com/engine/network/port-publishing/) y [packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/).
- MySQL 9.7: [`mysqldump`](https://dev.mysql.com/doc/refman/9.7/en/mysqldump.html).
- Tamaños, versiones y licencias: la API de metadatos de Docker Hub (con el manifiesto y la configuración del digest fijado, sin capas), la API de GitHub y el listado del repositorio Alpine de nginx.org.
