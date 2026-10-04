# ADR 0004 — Backend Laravel y MySQL con contenido y progreso en tablas

- Estado: propuesta
- Fecha: 2026-10-03
- Reemplaza en parte: ADR 0001 (HTML autónomo y backend diferido) y la forma de
  persistencia del ADR 0003

## Contexto

El progreso vive sólo en `localStorage`: se pierde al borrar los datos del navegador y no
pasa de un dispositivo a otro. El usuario decidió un backend propio, self-hosted y de un
solo usuario, con la última versión de PHP, Laravel y MySQL en Docker. También decidió:

- guardar en la base los ejercicios y el resto del contenido, para consultarlo, cruzarlo
  con el progreso y sacarlo del HTML, de modo que la sesión Esenciales entre en el build;
- que el navegador lea el contenido desde la API. Se le presentó como alternativa
  recomendada servirlo como archivos estáticos (ver «Alternativas»);
- no editar contenido desde un panel: la autoría sigue en Git.

`AGENTS.md` pedía evaluar primero Hono y admitir un backend sólo para lo que el cliente no
resuelve. La sincronización y la persistencia fuera del navegador lo justifican. Servir el
contenido desde la API y usar Laravel son decisiones explícitas del usuario.

La revisión adversarial del ADR 0003 mostró que la capa local no era segura para
sincronizar: escrituras al cargar, una sola ranura de respaldo, IDs desconocidos
descartados en silencio y documentos completos que se pisan entre pestañas. La fase P9
corrige eso antes de este backend.

El 2026-10-03 se investigaron:

- cómo modelan contenido Exercism, freeCodeCamp, Rustlings, Ziglings y el Go Tour;
- cómo modelan intentos, progreso y estadísticas DMOJ, Judge0, Exercism, Moodle y xAPI;
- las versiones vigentes de PHP, Laravel, MySQL y Pest.

## Decisión

### 1. Plataforma

- **Versiones:**
  - PHP 8.5 (`php:8.5-fpm-alpine`, con `pdo_mysql`).
  - Laravel 13.
  - MySQL 9.7 LTS, fijado como `mysql:9.7`. El tag `latest` apunta a la serie Innovation.
  - Composer 2.10.
- **API-only sin `php artisan install:api`:** ese comando instala Sanctum sin opción de
  omitirlo. Las rutas van en `routes/api.php`, declaradas en `bootstrap/app.php`.
- **Autenticación:**
  - Un único token bearer leído con `config()` desde `.env` y comparado con `hash_equals`.
  - Un token configurado vacío rechaza todo.
  - El navegador lo recibe una vez desde Método y lo guarda localmente.
- **Docker Compose:**
  - El servicio Nginx actual sirve el front y pasa `/api/` a PHP-FPM, en el mismo origen:
    sin CORS, y la CSP `connect-src 'self'` lo cubre.
  - Se agregan los servicios `php` y `mysql` (con volumen persistente) y `migrate`, que
    corre una sola vez `migrate --force` y `content:import`.
  - Redes internas; los puertos 3306 y 9000 no se publican.
  - El modo `network_mode: bridge` actual de `compose.yaml` se reemplaza por redes
    definidas.
- **Healthchecks:**
  - MySQL: `mysqladmin ping -h 127.0.0.1`, porque por socket responde antes de terminar
    la inicialización.
  - PHP-FPM: `ping.path` del pool, consultado con `cgi-fcgi`.
- **Secretos:** el token y las contraseñas viven en `.env`, fuera de Git y del contexto
  de Docker.

### 2. Contenido

**Fuente en Git**

```
content/<lenguaje>/manifest.yaml          orden de etapas y mundos
content/<lenguaje>/exercises/<id>/
  exercise.yaml                           textos, pistas, pruebas, predicción y fuentes
  starter.rs | starter.go                 código real, formateable y compilable
  solution.rs | solution.go
content/campaign/<mundo>.yaml
content/workshops/<taller>.yaml
content/atlas/<concepto>.yaml
content/guide/…
```

- Los IDs son inmutables y nunca se reutilizan, porque indexan el progreso. El orden sale
  del manifiesto, nunca del número del ID.
- Los checks TypeScript son los únicos que leen YAML. Validan el contenido y generan
  `curriculum.json`, que es una salida de build y no se versiona.
- **Hashes:** se calculan sobre JSON canónico, en ese único lugar:
  - `content_hash`: todo el ejercicio;
  - `grading_hash`: el id y la expresión de cada prueba, más las opciones y la respuesta
    de la predicción;
  - `starter_hash`: el código inicial.

**Tablas**

Los IDs van en `ascii_bin` y los textos en `utf8mb4_es_0900_ai_ci`.

| Tabla | Contenido |
|---|---|
| `topics` | Temas por lenguaje, para agrupar estadísticas |
| `exercises` | Textos, starter, solution, etapa, nivel, posición, estado (`active` o `deprecated`) y los tres hashes |
| `exercise_tests` | Una fila por prueba; clave `(exercise_id, test_key)` |
| `worlds`, `world_exercises` | Mundos de campaña y sus misiones con rol `training`, `challenge` o `boss` |
| `workshops` | Talleres de Sistemas |
| `workshop_objectives`, `workshop_steps`, `workshop_exercises` | Objetivos, etapas (con IDs estables) y ejercicios de cada taller |
| `atlas_concepts` | Conceptos del Atlas |
| `guide_steps`, `guide_resources` | Recorrido y biblioteca |
| `content_imports` | Sólo los imports exitosos: commit de Git, hash y conteos |

Criterio de modelado:

- Va en tabla propia lo que el progreso referencia, lo que se cuenta o lo que necesita una
  clave foránea entre contenidos.
- Va en JSON lo que siempre se lee entero: instrucciones, pistas, fuentes, predicción y la
  guía de cada mundo.

**Importación:** `php artisan content:import [--dry-run]`, aislable con `--isolated`.

1. Valida esquema y referencias.
2. En una transacción, hace upsert por clave natural.
3. Nunca borra ni usa `TRUNCATE`: lo que desaparece queda como `deprecated`, con
   `retired_at`.
4. Registra el import.

Con `--dry-run` muestra los ejercicios nuevos, los cambios de corrección, los cambios de
texto y los retirados.

**Entrega**

- `GET /api/content` devuelve el contenido con la forma actual de los catálogos y un ETag
  derivado del `content_hash`.
- `src/app/main.tsx` espera esa respuesta, publica los catálogos y recién después evalúa
  las vistas legacy, en su orden actual.
- La última copia queda en caché en el navegador. Si el backend no responde, se usa con
  un aviso.
- Antes de comprometer la técnica, se valida con un spike: espera de nivel superior e
  imports dinámicos ordenados, con `vite-plugin-singlefile` o con la salida estándar de
  Vite.

**Criterio de aceptación:** lo que devuelve la API es idéntico al oráculo
`dump-globals-v2` sobre los catálogos actuales.

### 3. Progreso

**Reglas por campo**

- Los logros sólo crecen: fecha más temprana, OR, máximo o unión.
- Los campos editables usan «gana la última escritura», con una fecha por campo.
- Lo que el alumno puede desmarcar deja una lápida con fecha.
- Una caída del Playground se registra como `infra_error` y no cuenta como intento
  fallido.

| Tabla | Regla |
|---|---|
| `attempts`: UUID del cliente (único), ejercicio, fecha, resultado (`passed`, `failed`, `compile_error`, `runtime_error`, `timeout` o `infra_error`), código, prueba propia, salida, `grading_hash` y `legacy` | No se modifica |
| `attempt_tests`: resultado de cada prueba de cada intento | No se modifica |
| `exercise_progress`: resuelto, pistas vistas, solución vista, ayuda, predicción correcta | Sólo crecen |
| `exercise_progress`: respuesta de predicción, confianza, próximo repaso, reflexión y prueba propia | Gana la última escritura |
| `exercise_progress`: `legacy_attempts` | Contador importado |
| `drafts`: borrador por ejercicio con `starter_hash` | Gana la última escritura; `NULL` es la lápida de «restaurar inicio» |
| `campaign_seals`: sellos de código y predicción con fecha, y marca de ayuda | Sólo crecen |
| `campaign_checkpoints`: aprobado | Sólo crece |
| `campaign_checkpoints`: última respuesta | Gana la última escritura |
| `workshop_observations`: objetivos observados | Sólo crecen |
| `workshop_progress`: sellos de núcleo y predicción | Sólo crecen |
| `workshop_progress`: respuesta y nota | Gana la última escritura |
| `workshop_step_marks`, `route_marks` (pasos, hitos y favoritos) | Gana la última escritura, con lápida |
| `route_quiz_answers`, `route_notes`, `preferences` | Gana la última escritura |

- La XP no se guarda: se deriva de las fechas de los sellos, incluida la XP por día.
- El progreso importado desde `localStorage` no tiene historia. Se marca `legacy`:
  conserva sellos y último resultado, pero las estadísticas de intentos lo excluyen.
- Un ejercicio cuyo `grading_hash` cambió después de resolverlo se muestra como
  «cambió, volvé a verificarlo». No se borra ni se reinicia.

**SQL**

- Los upserts monótonos protegen `LEAST` y `GREATEST` con `COALESCE`: devuelven `NULL`
  si algún argumento es `NULL`.
- Se usa el alias de fila (`AS n`), porque `VALUES()` está deprecado.
- Se escriben con SQL y bindings, no con `Model::upsert`, que no aplica casts, siempre
  toca `updated_at` y en MySQL ignora `uniqueBy`.

### 4. Sincronización

- **Cliente local-first.**
  - El formato local pasa a v2: fecha por campo, lápidas, IDs estables de etapa y la
    última evidencia aprobada (`proof`) separada del último resultado.
  - Cada cambio entra a una cola con un UUID v4 generado con `crypto.getRandomValues`.
    `crypto.randomUUID` exige contexto seguro.
- **Endpoints.**
  - `POST /api/sync` aplica la cola en una transacción, ignora los UUID ya recibidos y
    devuelve los UUID aceptados junto con el estado completo.
  - `GET /api/progress` devuelve ese estado.
- **Primera conexión:** importa el progreso local.
- **Reglas de fusión:** sus casos viven en un fixture compartido que corren los checks
  TypeScript y las pruebas Pest. Así la regla se escribe una vez y se verifica en los dos
  lenguajes.
- **Criterio de aceptación:** el progreso real de master
  (`qa/fixtures/progress-master-2a278ad-storage.json`) entra a las tablas y vuelve a salir
  sin perder datos.

### 5. Pruebas

- **Pest** corre contra MySQL 9.7 real, en un servicio de test con `tmpfs` y usuario root,
  porque las pruebas en paralelo crean bases propias.
  - SQLite queda descartado: compila otro SQL para upsert y no tiene `LEAST`/`GREATEST`.
  - El importador se prueba con `DatabaseTruncation`: su transacción y un `TRUNCATE`
    filtrarían datos bajo `RefreshDatabase`.
- **Checks TypeScript:** siguen sin necesitar Laravel. Validan los YAML y el
  `curriculum.json` generado, y simulan `GET /api/content` con ese mismo JSON cuando
  arrancan la app en `node:vm`.

## Alternativas consideradas

- **Contenido estático servido por Nginx, con MySQL como índice.** Fue la opción
  recomendada: el taller seguiría funcionando con PHP caído, y `npm run dev`, el preview y
  los checks no dependerían de Laravel. El usuario eligió que el navegador lea desde la
  API. La caché local mitiga las caídas.
- **La base como fuente, con panel de administración.** Descartada: se pierde la revisión
  en Git y los checks de currículo, y el usuario no quiere editar desde un panel.
- **Hono o Fastify (ADR 0001).** El usuario eligió Laravel.
- **Un documento JSON versionado en MySQL (plan previo).** Descartado:
  - no permite consultas;
  - no permite fusionar por registro;
  - un cliente viejo pisaría lo que no conoce.
- **SQLite en las pruebas.** Descartado por las diferencias de SQL.

## Consecuencias

- **ADR 0001:** `dist/index.html` deja de ser un documento autónomo. No funciona con
  `file://` y siempre lo sirve Nginx. Unos 1,07 MB de contenido salen del bundle, así que
  entra Esenciales.
- **ADR 0003:** la persistencia local sigue como caché y cola. La fuente durable pasa a ser
  MySQL.
- **Dependencia del backend:** el front depende del backend para mostrar contenido, con la
  caché como mitigación. `npm run dev` pasa `/api` a Laravel en Docker.
- **Operación nueva:**
  - migraciones;
  - respaldo del volumen de MySQL;
  - secretos en `.env`, que se agregan a `.gitignore` y `.dockerignore`.
- **Documentación:** cada fase actualiza `AGENTS.md`, `README.md`, `docs/architecture.md`
  y `qa/AGENTS.md`.
- **Riesgos conocidos:**
  - relojes desfasados entre dispositivos para «gana la última escritura» (mitigable más
    adelante con una revisión del servidor);
  - el spike de la compuerta de arranque;
  - FULLTEXT en español sin stemming, si más adelante se busca texto.

## Fases

1. **P9:** integridad de la capa local. Antes de reescribir el ADR 0003, el revisor repite
   sus escenarios.
2. **Este ADR aceptado.**
3. **Codemod del contenido a YAML y código real,** con el oráculo idéntico. Requiere
   permiso para agregar la dependencia `yaml`.
4. **`curriculum.json` y la compuerta de arranque,** con un spike previo.
5. **Proyecto Laravel:** Docker, `content:import`, tablas de contenido y
   `GET /api/content`.
6. **Progreso:** tablas, cliente v2, sincronización y token.
7. **Sesión Esenciales,** con su propia decisión de IDs: hoy `content-check` y el fixture
   de IDs asumen numeración correlativa.

## Fuentes

- [Laravel 13: releases](https://laravel.com/docs/13.x/releases), [routing](https://laravel.com/docs/13.x/routing), [queries/upserts](https://laravel.com/docs/13.x/queries#upserts), [database testing](https://laravel.com/docs/13.x/database-testing)
- [PHP: versiones soportadas](https://www.php.net/supported-versions.php)
- [MySQL 9.7: modelo de releases](https://dev.mysql.com/doc/refman/9.7/en/mysql-releases.html), [INSERT … ON DUPLICATE KEY UPDATE](https://dev.mysql.com/doc/refman/9.7/en/insert-on-duplicate.html), [operadores de comparación](https://dev.mysql.com/doc/refman/9.7/en/comparison-operators.html)
- [Pest](https://packagist.org/packages/pestphp/pest)
- [Docker: Laravel en producción](https://docs.docker.com/guides/frameworks/laravel/production-setup/)
- [Exercism: schema](https://github.com/exercism/website/blob/main/db/schema.rb), [ejercicios deprecados](https://github.com/exercism/docs/blob/main/building/tracks/deprecated-exercises.md)
- [freeCodeCamp: estructura del currículo](https://contribute.freecodecamp.org/curriculum-file-structure/)
- [Rustlings: info.toml](https://github.com/rust-lang/rustlings/blob/main/rustlings-macros/info.toml)
- [DMOJ: modelos](https://github.com/DMOJ/online-judge/tree/master/judge/models)
- [Moodle: motor de preguntas](https://github.com/moodle/moodle/blob/main/public/question/engine/questionattempt.php)
- [xAPI 1.0.3: datos](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md)
- [MDN: crypto.randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
