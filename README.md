# Taller · Rust y Go

Una guía y laboratorio en español para aprender construyendo: **274 ejercicios originales, 137 de Rust y 137 de Go**, un Atlas de 32 temas, una campaña de ocho mundos y **25 talleres de Sistemas con 50 núcleos programables**. Conserva el recorrido, la biblioteca de 15 recursos, las notas y 12 misiones de proyecto externo.

Los 50 núcleos de Sistemas forman parte de los 274 ejercicios. Cada lenguaje tiene 100 ejercicios del recorrido, 12 desafíos nuevos de campaña y 25 núcleos de Sistemas. Los modelos visuales y las etapas manuales complementan esos ejercicios; no aumentan el conteo.

## Levantar con Docker

Necesitás Docker con Docker Compose. La primera vez, desde esta carpeta, creá el archivo `.env` con los secretos de la API y de MySQL:

```sh
sh backend/api/scripts/init-env.sh
```

El script agrega `APP_KEY`, `MYSQL_PASSWORD` y `MYSQL_ROOT_PASSWORD` aleatorios sin tocar lo que el archivo ya tenga. `.env` queda fuera de Git y de las imágenes. Después:

```sh
docker compose up --build -d --wait
```

Abrí **http://localhost:8080/#sistemas**. También podés entrar por `#campana`, `#laboratorio` o `#atlas`. Compose construye la web, el editor, las animaciones y el generador de kits ZIP con Node en una etapa de construcción, y los sirve con Nginx dentro del contenedor. También levanta la API Laravel (PHP-FPM), MySQL y un servicio que aplica las migraciones, importa el contenido del currículo a la base y termina; si falla, PHP no arranca. Nginx pasa `/api/` a la API en el mismo origen, y **http://localhost:8080/api/up** responde si arrancó. En la PC anfitriona sólo necesitás Docker y Compose: no hace falta instalar Python, Node, PHP ni un servidor web. La primera construcción descarga las imágenes y las dependencias, también las de Node de la etapa que genera el contenido de la API. Las siguientes aprovechan la caché.

Para detenerlo:

```sh
docker compose down
```

Todos los comandos de `docker compose` leen `.env`: sin los secretos, hasta `down` se niega a correr. `down` conserva la base, que vive en el volumen `taller-rust-go_mysql-data`; `docker compose down -v` la borra. MySQL toma las contraseñas al crear ese volumen: cambiarlas después en `.env` no cambia las de la base.

Para usar otro puerto, agregá `TALLER_PORT=8090` al `.env` y ejecutá el mismo comando. El puerto se publica solo en tu equipo (127.0.0.1); MySQL (3306) y PHP-FPM (9000) no se publican. Compose crea redes propias: `edge`, la única con salida, para Nginx; `web`, interna, entre Nginx y PHP; `app`, interna, entre PHP y MySQL (Nginx no llega a MySQL), y `testing`, interna, para `npm run api:test`. Las imágenes base están fijadas por digest para reproducir esta entrega.

La imagen de la API genera su propio `curriculum.json` y `curriculum.meta.json` con el mismo generador que usa el front, y el servicio de migraciones los importa. Para que la base registre el commit del contenido, pasalo al construir: `CONTENT_SOURCE_COMMIT=$(git rev-parse HEAD) docker compose up --build -d --wait`; sin él queda nulo y el import lo avisa.

Para desplegar una versión nueva sin cortar el servicio si fallan las migraciones o el import, usá `sh backend/api/scripts/deploy.sh`: construye las imágenes, corre las migraciones y el import con la nueva y recién entonces reemplaza PHP; si fallan, el PHP anterior sigue sirviendo. Con `docker compose up --build`, Compose detiene el PHP anterior antes de esperar a las migraciones. `sh backend/api/scripts/deploy-check.sh` comprueba ese comportamiento contra el stack.

## Aprender en el taller

1. Elegí Rust o Go. En **Campaña** seguís mundos con requisitos; en **Laboratorio** podés explorar Inicial, Intermedio, Avanzado y Experto libremente.
2. En **Descubrí**, explorá el concepto, el porqué, la predicción y los modelos interactivos disponibles.
3. En **Experimentá**, editá código real y ejecutá los tres casos. Abrí cada resultado para ver por qué se prueba. Podés inventar un caso adicional.
4. Pedí pistas progresivas cuando te hagan falta. Ver una solución queda identificado como práctica asistida.
5. En **Explicá**, escribí tu razonamiento, probá una variante y elegí un repaso a 1, 3 o 7 días.

El filtro **Clásicos y sistemas · 25** muestra los 25 desafíos agregados a cada lenguaje. Incluyen reglas numéricas, texto y codificación, estructuras de datos, parsers y mini sistemas. Se distribuyen por dificultad; sus IDs 76–100 conservan el progreso de los 75 anteriores.

Una sesión posible: 3 minutos de predicción, 12 de código y 5 de explicación. Si ya entendés un tema, saltá a una reparación o a una misión de proyecto. Los puntos registran práctica, no certifican dominio.

## Sistemas: experimentar y construir

Elegí un taller, observá una transición en el modelo y predecí qué va a pasar. Cambiá el escenario para encontrar un contraejemplo. Después implementá su núcleo en Rust o Go y ejecutá las pruebas con el revisor del laboratorio.

Cada taller tiene tres sellos, guardados por lenguaje:

- **Observación:** completar sus tres objetivos conceptuales mediante acciones del modelo, como provocar un fallo de página o comparar dos rutas. Abrir la página o repetir clics no alcanza.
- **Código:** obtener un resultado real que apruebe los tres casos del núcleo.
- **Predicción:** responder correctamente la pregunta y leer su explicación.

Los sellos obtenidos se conservan al volver a practicar. Las cuatro etapas de **Convertirlo en un proyecto** son una lista manual con criterios de comprobación; marcarla o escribir una nota no equivale a aprobar código. El modelo es una simulación original con reglas explícitas: sus dibujos no ejecutan el programa que escribís en el editor.

| Grupo | Taller / concepto | Núcleo Rust y Go |
| --- | --- | --- |
| Máquina · 9 | Caché LRU y trazas de acceso | 113 |
| Máquina | Allocator, huecos y coalescencia | 114 |
| Máquina | MMU, páginas y permisos | 115 |
| Máquina | TLB e invalidación | 116 |
| Máquina | Máquina virtual e instrucciones | 117 |
| Máquina | Pila de llamadas y frames | 118 |
| Máquina | Planificador round-robin | 119 |
| Máquina | Interrupciones, máscaras y ACK | 120 |
| Máquina | PC de bolsillo: CPU, TLB, RAM, faults y timer | 137 |
| Infraestructura · 8 | WAL y recuperación tras un apagón | 121 |
| Infraestructura | LSM, versiones y tombstones | 122 |
| Infraestructura | Réplicas y quórums | 123 |
| Infraestructura | Relojes lógicos de Lamport | 124 |
| Infraestructura | Fragmentos, orden y duplicados de red | 125 |
| Infraestructura | Backpressure y buffer circular | 126 |
| Infraestructura | Balanceo, salud y límites de carga | 127 |
| Infraestructura | Sharding y anillo de hash | 128 |
| Gráficos y juegos · 8 | Transformaciones afines y orden de matrices | 129 |
| Gráficos y juegos | Rasterización de líneas con Bresenham | 130 |
| Gráficos y juegos | Rayos, círculos y superficie más cercana | 131 |
| Gráficos y juegos | BFS, A* y rutas con distintos costos | 132 |
| Gráficos y juegos | Colisiones AABB y rebotes con paso fijo | 133 |
| Gráficos y juegos | Autómata celular de Conway | 134 |
| Gráficos y juegos | Polinomios, Horner y derivada simbólica | 135 |
| Gráficos y juegos | Juego de fichas con minimax / negamax | 136 |

Por ejemplo, el núcleo 129 corresponde a `rust-129` y `go-129`. Los proyectos van desde fenómenos pequeños hasta conexiones entre varios componentes. La PC de bolsillo integra un CPU y un proceso con memoria paginada e interrupciones inyectadas manualmente; no emula una arquitectura comercial ni arranca un sistema operativo. El taller WAL tampoco implementa una base de datos SQL completa. Cada modelo explica sus límites y enlaza fuentes para continuar.

**Descargar kit ZIP** exporta el borrador actual, los tres casos del núcleo y tu caso adicional si existe. Incluye una guía con las cuatro etapas, tu nota y una solución de apoyo como archivo `.txt`, que no se compila automáticamente. El ZIP se genera en el navegador con `fflate`, sin subir archivos a otro servidor.

El kit de Rust incluye `Cargo.toml` y `src/lib.rs`; usá Rust estable compatible con edición 2024 y ejecutá `cargo test`. El de Go incluye `go.mod` y `exercise_test.go`; usá Go 1.23 o posterior y ejecutá `go test -v ./...`. No requieren dependencias de terceros. Es normal que un borrador incompleto falle: el kit conserva tu trabajo y lleva el núcleo a un proyecto local, sin generar por sí solo el sistema completo.

## Herramientas para ir más allá

Estos recursos se abren fuera del taller; no están embebidos ni distribuidos con la web.

| Si querés… | Recurso y alcance |
| --- | --- |
| Construir una computadora y su cadena de herramientas desde puertas lógicas | [Nand2Tetris: herramientas oficiales](https://www.nand2tetris.org/software) y [su IDE web](https://nand2tetris.github.io/web-ide/). El curso usa la máquina Hack y sus propios lenguajes. |
| Inspeccionar instrucciones, microarquitectura, cachés y MMIO de RISC-V | [Ripes](https://github.com/mortbopet/Ripes) y [ripes.dk](https://ripes.dk/). El repositorio presenta el despliegue web como experimental. |
| Profundizar en memoria virtual, concurrencia y persistencia | [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/), con capítulos gratuitos, ejercicios y proyectos. |
| Leer y modificar un sistema operativo docente | [xv6 para RISC-V del MIT](https://github.com/mit-pdos/xv6-riscv) y [el curso 6.1810](https://pdos.csail.mit.edu/6.1810/2025/). Requiere sus herramientas de arquitectura y emulación. |
| Conectar una simulación de almacenamiento con una base de datos real | [Arquitectura de SQLite](https://sqlite.org/arch.html) y [su documentación de WAL](https://sqlite.org/wal.html). |

La selección, las fuentes de gráficos/juegos y los límites de las consultas están registrados en [qa/research-systems.md](qa/research-systems.md), con fecha de consulta. Son opciones para distintos objetivos, no un ranking de popularidad.

## Campaña: aprender como una expedición

Cada lenguaje tiene cuatro mundos y 24 misiones: 12 ejercicios existentes elegidos como entrenamiento y 12 desafíos nuevos. Son **48 misiones de campaña en total**, que forman parte de los 274 ejercicios; no se suman como otros 48 ejercicios distintos.

| Nivel | Rust | Go |
| --- | --- | --- |
| Inicial | Robot, coordenadas, inventario y energía | Rover, comandos, mapas y estado parcial |
| Intermedio | Flags, checksum con rotación/XOR y frames binarios | Telemetría, endian, CRC32 y buffers independientes |
| Avanzado | Grafos, rutas y búsqueda BFS | Dependencias, ciclos y planificación de un DAG |
| Experto | Mini VM, saltos y presupuesto de instrucciones | Fallos, reintentos y cancelación cooperativa |

Cada mundo combina tres entrenamientos, una reparación tipo *lings*, una kata y un desafío final. Las guías conectan los temas y explican por qué importan. El editor, las pistas, los casos propios y el revisor son los mismos del laboratorio. Antes de programar podés manipular un robot en una grilla con batería y trazas de decisiones, o inspeccionar bits, longitud, endian y checksums de un paquete. Los modelos explican qué regla acepta o rechaza cada acción y distinguen los contratos de Rust y Go. Son simulaciones conceptuales: no ejecutan tu código ni otorgan XP.

- **20 XP** al aprobar todas las pruebas de una misión y **10 XP** por su predicción correcta. Se ganan una vez; editar o repetir no borra ni duplica esos logros.
- El desafío final se habilita después de verificar el código de las otras cinco misiones.
- Para superar el mundo necesitás las seis misiones verificadas, **150 de 180 XP**, la predicción final correcta y el checkpoint conceptual. Conseguís una insignia y se abre el siguiente mundo.
- Las pistas son gratuitas. Ver la solución queda identificado como práctica con apoyo y también permite avanzar. No hay vidas, castigos por tardar ni rachas obligatorias.
- Resolver ejercicios en el laboratorio libre también puede sumar sus logros a la campaña; los requisitos del mundo siguen vigentes.

Los sellos, insignias y checkpoints viajan con la copia de progreso. Son herramientas para organizar aprendizaje personal: el estado es local y editable, sin mecanismo de examen supervisado. Las respuestas de texto libre siguen siendo una oportunidad de reflexión, no una evaluación automática de comprensión.

## Qué se ejecuta y dónde

El editor es **CodeMirror 6**, incluido en el paquete. Ofrece resaltado de Rust y Go, sangría, cierre de delimitadores, búsqueda, historial y sugerencias sintácticas. No requiere CDN ni una cuenta. No incluye rust-analyzer ni gopls; la revisión semántica llega al ejecutar.

Las pruebas se ejecutan a pedido con **Ejecutar y revisar** o **Ctrl/⌘ + Enter**. No se ejecutan por cada pulsación. La sección **Ver el programa completo y sus pruebas** muestra el programa actualizado; **Inventar una variante** copia un caso al editor de hipótesis, conservando un caso propio existente.

Al pulsar **Ejecutar y revisar**, el navegador envía únicamente el programa del ejercicio y sus pruebas al Playground oficial del lenguaje:

- Rust: `https://play.rust-lang.org/execute`, canal estable, edición 2024.
- Go: `https://play.golang.org/compile`, versión estable que ofrezca el servicio.

El taller agrega una función de entrada y evalúa las expresiones booleanas de cada caso. Son comprobaciones reales de comportamiento; no lanza un proyecto completo con `cargo test` o `go test`.

Se necesita conexión para compilar. Los Playgrounds son servicios externos con sus propios límites; pueden cambiar de versión o quedar temporalmente indisponibles. El taller distingue fallos de conexión, errores de compilación y casos fallidos. Nunca aprueba una prueba que no se ejecutó. Docker sirve la web y la API Laravel con MySQL; no instala compiladores ni ejecuta código del alumno en el host.

Las lecturas, preguntas, modelos, notas, edición y generación de kits ZIP funcionan sin conexión una vez cargada la página. También podés abrir `dist/index.html`, que es autónomo; algunos navegadores restringen peticiones desde archivos locales, por lo que Docker es la opción recomendada para ejecutar ejercicios. Ejecutar un kit descargado requiere el compilador local correspondiente; el contenedor web no lo proporciona.

El revisor combina diagnósticos del compilador, pruebas y explicaciones preparadas para cada consigna. No es un LLM conversacional ni califica automáticamente texto libre. Tres casos aprobados no demuestran corrección para todas las entradas, ausencia de carreras, soundness de unsafe o mejoras de rendimiento. Los modelos de memoria y canales son conceptuales; no son un depurador del programa escrito.

## Cobertura

| Nivel | Rust | Go |
| --- | --- | --- |
| Inicial | Expresiones, tipos, control, funciones, ownership, préstamos, texto y slices | Tipos, conversiones, funciones, control, arrays, slices, maps, texto y Unicode |
| Intermedio | Structs, enums, patrones, Option/Result, colecciones, iteradores y traits | Structs, punteros, errores, interfaces, method sets, defer, panic y recursos |
| Avanzado | Genéricos, lifetimes, threads/canales/Arc/Mutex, KV, Box/Rc/RefCell/Weak, dispatch y tipos asociados | Goroutines/canales, KV, genéricos/restricciones, punteros, métodos y composición |
| Experto | Módulos/macros, conversiones, testing, Future/Pin/Send/Sync, Drop, raw pointers, Cow y decisiones de costo | Context/select/cancelación, sincronización, I/O, JSON, HTTP, pruebas, paquetes y medición |

La ampliación 76–100 agrega reglas numéricas (FizzBuzz, Euclides, primos y bits), texto y Unicode, RLE, pilas, delimitadores, búsqueda e intervalos. Rust continúa con parsers, frames, un buffer acotado, caché LRU/TTL, journal, versionado y rollback lógico. Go suma ventanas, matrices, tokenización, RPN, LRU/TTL, replay idempotente y lecturas parciales/cancelables con `io.Reader`. Cada consigna delimita qué comportamiento comprueba.

Las 12 misiones de proyecto amplían Cargo, módulos, dependencias, CLI, archivos, async runtimes, testing/fuzzing, perfiles, FFI/unsafe y persistencia/transacciones. Incluyen criterios de comprobación y documentación oficial. Son trabajo externo con revisión manual: el sandbox del navegador no reemplaza esas herramientas ni todos los escenarios de producción.

## Guardado y cambio de PC

El avance queda en `localStorage` del navegador, separado por origen (protocolo, host y puerto). Incluye borradores, casos propios, resultados, predicciones, notas, repasos, recursos favoritos, recorrido, campaña y sellos/etapas/notas de Sistemas. La escena momentánea de un simulador puede reiniciarse al volver; las observaciones ya obtenidas se conservan.

Para cambiar de PC, navegador, puerto o de archivo local a Docker:

1. Pulsá **Exportar mi progreso**.
2. Copiá el JSON al otro equipo.
3. Abrí el taller y usá **Importar progreso** en **Método y notas**.

La importación combina el avance sin perder logros: para un ejercicio presente en la copia, sus datos importados reemplazan los campos existentes, pero las marcas de predicción y de ayuda se combinan, se conserva la fecha de resolución más antigua, un resultado aprobado no se reemplaza por uno sin aprobar y un borrador o una reflexión vacíos no pisan los tuyos. Los sellos y checkpoints de campaña, y los logros de Sistemas, se combinan conservando los obtenidos. Se aceptan copias anteriores sin campaña o Sistemas. Si una copia guardada en el navegador no se puede leer, o trae datos que esta versión no reconoce, el taller conserva el texto original en una ranura de respaldo (`…:respaldo` y hasta cuatro más, `…:respaldo-2` a `…:respaldo-5`, que nunca se pisan) y te avisa al abrir; al cargar o al cambiar de vista nunca reescribe tu progreso. Si no hay lugar para el respaldo, esa sección deja de guardar durante la sesión y el aviso te lo dice. En **Método y notas** podés descargar cada respaldo. Al importar, el aviso nombra las secciones con datos que esta versión no reconoce y que se omitieron. «Borrar todo» elimina también los respaldos y te avisa si no pudo. El progreso todavía no se guarda en MySQL: el volumen de la base existe, pero la sincronización llega en una fase posterior del ADR 0004. Una limpieza del navegador o el modo privado puede eliminarlos; exportá una copia al terminar una etapa. El ZIP de un proyecto y el JSON de progreso cumplen funciones diferentes: descargá ambos si querés conservar código y recorrido.

## Desarrollo

El sitio migra gradualmente a React con TypeScript/TSX y Vite. Atlas es la primera vista migrada; las demás conservan adaptadores JavaScript legacy mientras se migran por funcionalidad. El código nuevo se escribe en TypeScript con módulos ES (`export`/`import`). Rust y Go siguen siendo los lenguajes de los ejercicios. Node ejecuta las herramientas de construcción y QA, no un servidor de aplicación ni los compiladores.

```sh
npm ci
npm run build
```

Prettier formatea todo el código propio (`npm run format`). Para que `git blame` omita los commits que sólo cambiaron formato, ejecutá una vez `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

Vite, como build único, empaqueta estilos, datos, editor y aplicación en el documento autónomo `dist/index.html`, desde `frontend/src/index.html` y `frontend/src/app/main.tsx`. Los checks validan 137 ejercicios por lenguaje (100 del recorrido, 12 nuevos de campaña y 25 de Sistemas), más 16 temas del Atlas por lenguaje. Docker reconstruye desde las fuentes y el lockfile.

Archivos principales: `content/` (el currículo en YAML: ejercicios del recorrido, 24 desafíos nuevos y núcleos de Sistemas con su código Rust y Go real, mundos, talleres, Atlas y guía), `tools/content/` (valida `content/` y genera `build/curriculum.json`), `frontend/src/pages/atlas/` (Atlas React: componentes y modelo), `frontend/src/app/` (entrada y adaptadores legacy, que publican los catálogos de `build/curriculum.json`), `frontend/src/shared/` (helpers comunes, transporte a los Playgrounds en `api/playground`, editor CodeMirror en `ui/code-editor`), `frontend/src/entities/exercise/` (evidencia y ejecución), `frontend/src/features/download-project-kit/` (kits ZIP), `frontend/src/entities/guide/` (tipos y progreso de la guía), `frontend/src/entities/campaign/` (reglas de la campaña), `frontend/lab.js` (aprendizaje y revisión), `frontend/lab-explorers.js` (modelos y misiones), `frontend/app.js` (shell y recorrido), `frontend/campaign.js` / `frontend/campaign.css` (interfaz de campaña).

Sistemas separa los datos y modelos puros: `frontend/src/entities/systems-simulation/` define el contrato común (`defineModel`) y contiene los 25 modelos de los cuatro dominios; las fichas de los talleres están en `content/workshops/` y los núcleos Rust/Go, en la sección `systems` de `content/<lenguaje>/manifest.yaml`, con una carpeta por núcleo en `content/<lenguaje>/exercises/`. `frontend/src/entities/systems-workshop/` conserva los sellos e importa progreso, y `frontend/src/entities/campaign/` aplica las reglas de la campaña; `frontend/systems.js` / `frontend/systems.css` muestran el catálogo, los controles y escenas SVG. `frontend/src/features/download-project-kit/` genera proyectos y archivos ZIP con `fflate`; Vite lo incluye en la aplicación sin CDN y su check lo empaqueta en memoria con esbuild.

### Contenido del currículo

El currículo se edita en `content/`; `build/curriculum.json` es una salida generada que no se versiona.

El generador también escribe `build/curriculum.meta.json`, que acompaña al documento: la huella de cada una de las 17 porciones que sirve la API y de cada ejercicio, las claves de las etapas de taller y el commit de origen. Es lo único que `content:import` y la API toman como verdad de esas huellas; no se edita ni se versiona.

Cada etapa de `content/workshops/<id>.yaml` lleva una clave estable `id: e<N>` y, si ya existía en la versión 1, su `v1Index`. Las claves no se renumeran ni se reutilizan, y todavía no se publican: `qa/fixtures/workshop-steps-v1.json` es el contrato de las 100 etapas actuales. Una etapa nueva lleva la clave siguiente y no lleva `v1Index`.

```
content/<rust|go>/manifest.yaml      etapas en orden (recorrido, desafíos y núcleos) y sus valores por defecto
content/<rust|go>/exercises/<id>/    exercise.yaml, starter.<rs|go> y solution.<rs|go>
content/campaign/  content/workshops/  content/atlas/
                                     manifest.yaml con el orden y un <id>.yaml por registro
content/guide/                       biblioteca, fuentes y un manifiesto con sus pasos por recorrido
```

Para agregar un ejercicio:

1. Elegí un ID que nunca se haya usado: los IDs indexan el progreso guardado. El generador toma el orden y la etapa del manifiesto, pero `qa/content-check.ts` todavía ata cada ID a su posición (`rust-01`, `rust-02`…), calcula la etapa a partir de ella y espera 100 ejercicios de recorrido, 12 desafíos y 25 núcleos por lenguaje, y `qa/systems-check.ts` fija el total (274 ejercicios, 137 por lenguaje, con los núcleos en los IDs 113 a 137): el primer ejercicio nuevo cambia esos asserts en el mismo commit.
2. Agregalo a la lista `exercises` de su etapa en `content/<lenguaje>/manifest.yaml`.
3. Creá `content/<lenguaje>/exercises/<id>/` con tres archivos:
   - `exercise.yaml`, sólo con lo que difiere de `defaults` y de la etapa: título, textos, instrucciones, pruebas `t1`, `t2`…, tres pistas, revisión, transferencia y predicción; si hace falta, también `level`, `kind`, `minutes`, `imports`, `visual` o `sources`. El generador además exige que un núcleo de infra lleve `workshopId` y `challengeType`; que un desafío no declare `challengeType`, porque lo fija su posición en el mundo (reparación, kata o jefe); y que cada mundo de desafíos tenga exactamente tres ejercicios;
   - `starter.<rs|go>` y `solution.<rs|go>`, con el código tal cual. Los `.go` empiezan con `package main` y una línea en blanco.
4. Corré `npm run curriculum`, que valida todo `content/` y nombra el archivo y el campo de cada error. Después, `npm test`.

Una prueba quitada de un ejercicio no puede volver con el mismo número hasta B2 (la API de ejecuciones): `content:import` no reutiliza un `test_key` retirado y el generador todavía exige `t1`, `t2`… en orden.

En los YAML, un `#` después de un espacio empieza un comentario: un texto con `#` (como `#[test]` o `#2`) va entre comillas, y los comentarios van en su propia línea, sin más sangría que la clave: con más sangría, YAML la pega al valor sin comillas de arriba. `npm run curriculum` rechaza los dos casos.

Un ejercicio nuevo cambia a propósito contratos que se actualizan a mano: `qa/fixtures/curriculum-ids.json`, los asserts de `content-check` (cantidades, ID por posición y etapa) y de `systems-check` (totales), y las cantidades de este README. `npm run format` también formatea los YAML.

## Verificación

```sh
npm run build
npm test
```

`npm test` ejecuta, en el orden de `qa/run-checks.ts`, todos los checks locales en TypeScript; cada uno corre también por separado con `node qa/<check>.ts`. Comprueban paquete autónomo y orden de carga, contrato de IDs del currículo, contenido, transporte sin red, respaldo del recorrido, reglas de campaña, contexto de campaña y Sistemas dentro del laboratorio y los modelos de robot/paquetes. `systems-check` cubre el catálogo y el motor de sellos; los cuatro checks de dominio prueban reglas de sus simulaciones. El check de kits crea ZIP, los vuelve a leer con un decodificador independiente y compara archivos, CRC y contenido del borrador. Estos comandos son comprobaciones locales; por sí solos no demuestran que un programa haya compilado.

Para ejecutar además `cargo test` y `go test` sobre los kits en contenedores descartables:

```sh
node qa/project-kit-check.ts --docker
```

Esta comprobación opcional requiere Docker y las imágenes `rust:1.90-alpine` y `golang:1.25-alpine` disponibles localmente; el script no las descarga. Está separada de la construcción del contenedor web y no requiere compilar contra los servicios públicos. Para actualizar deliberadamente el registro de evidencia después de esa ejecución completa, agregá `--write-report`. No lo uses en una comprobación solamente estructural: reemplazaría evidencia previa de compiladores.

Para comprobar sin red que los programas actuales coinciden con las soluciones ya verificadas y registradas en los manifiestos:

```sh
node qa/runtime-check.ts rust --audit-record
node qa/runtime-check.ts go --audit-record
```

Para recompilar soluciones de referencia con los servicios reales (requiere conexión):

```sh
node qa/runtime-check.ts rust
node qa/runtime-check.ts go
```

Se agrupan las soluciones para reducir solicitudes y se conservan manifiestos con hashes de los programas verificados. No ejecutes verificaciones masivas repetitivas contra los servicios públicos. Las pruebas del navegador también deben comprobar editor, guardado, importación/exportación, respuesta del revisor, accesibilidad de teclado y diseño móvil.

La API Laravel tiene pruebas propias, fuera de `npm test` porque necesitan Docker:

```sh
npm run api:test          # Pest contra una MySQL de prueba descartable (tmpfs)
npm run api:test:down     # apaga esa base de prueba y borra su red
npm run api:format:check  # formato PHP con Pint
npm run api:analyse       # análisis estático de PHP con PHPStan (Larastan, nivel 9)
npm run api:smoke         # con el stack levantado: Nginx, PHP-FPM y Laravel
npm run api:content:check # con el stack levantado: las 17 porciones del contenido a través de Nginx
```

## Fuentes y atribución

La ampliación se apoya en los formatos de [Rustlings](https://rustlings.rust-lang.org/usage/), [100 Exercises](https://rust-exercises.com/100-exercises/), [Exercism](https://exercism.org/), [Learn Go with Tests](https://quii.gitbook.io/learn-go-with-tests) y [Gophercises](https://gophercises.com/). La investigación con conversaciones de Reddit, foro de Exercism, fechas y límites de la evidencia está en [qa/research-additions.md](qa/research-additions.md). Son referencias de diseño; nuestros desafíos de Rust no son una copia del curso 100 Exercises. La campaña también referencia [Golings](https://github.com/madhank93/golings), un proyecto comunitario. No empaqueta ni ejecuta las CLI de Rustlings o Golings: reutiliza nuestro runner y ofrece desafíos originales con una dinámica de reparación, pistas y comprobación.

Los ejercicios enlazan documentación de lenguajes o fuentes del algoritmo y sistema que estudian. La biblioteca mantiene todos los recursos de la guía; el mapa de laboratorios agrega enlaces de práctica por lenguaje y una explicación de las referencias comunitarias. Los ejercicios, explicaciones y modelos fueron redactados para este taller. Sus fuentes primarias y decisiones de alcance están en [qa/research-systems.md](qa/research-systems.md).

El diseño educativo toma como referencia [freeCodeCamp](https://contribute.freecodecamp.org/how-to-work-on-coding-challenges/), [los casos propios de LeetCode](https://support.leetcode.com/hc/en-us/articles/32442719377939-How-to-create-test-cases-on-LeetCode), [las pistas de Codecademy](https://help.codecademy.com/hc/en-us/articles/23400751016859-AI-Features-available-on-Codecademy), [Educative](https://www.educative.io/courses/rust-programming-language) y [Replit Learn](https://learn.replit.com/docs/ai-foundations/lesson-4). No hay afiliación con estas plataformas.

[CodeMirror](https://github.com/codemirror/dev) y sus dependencias conservan sus avisos de licencia en `frontend/EDITOR-LICENSES.txt` y en el bundle incluido. [Monaco](https://github.com/microsoft/monaco-editor), derivado de VS Code, fue otra alternativa evaluada; se eligió CodeMirror por su integración modular en una página autónoma. El contenedor utiliza [NGINX Unprivileged](https://github.com/nginx/docker-nginx-unprivileged).

Se reutiliza [canvas-confetti](https://github.com/catdad/canvas-confetti) para las celebraciones, con la preferencia de movimiento reducido y limpieza al salir de la vista. Su API se verificó con Context7 y su licencia se conserva en `THIRD-PARTY-NOTICES.txt`. La interfaz y los compiladores permanecen separados: no hace falta traducir los ejercicios a JavaScript.

[fflate](https://github.com/101arrowz/fflate) se incluye localmente para crear los kits ZIP. Su aviso de licencia está en `frontend/src/features/download-project-kit/lib/archive.ts` y se conserva en el bundle; las otras dependencias y sus versiones están fijadas en `package-lock.json`.

Para previsualizar cambios de `dist/index.html`, `docker compose -f docker/compose.preview.yaml up --build -d --wait` sirve una instancia aislada en http://localhost:8765 con el archivo montado en modo lectura. Se detiene con `docker compose -f docker/compose.preview.yaml down`. La configuración principal en 8080 sirve su propia copia construida dentro de la imagen.
