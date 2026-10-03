# Investigación para los talleres de Sistemas

Fecha de consulta: **2026-10-02**. Alcance: fuentes primarias, herramientas externas y decisiones de diseño de los 25 talleres de máquina, infraestructura, gráficos y juegos. La evidencia comunitaria de la guía de lenguajes sigue en [research-additions.md](research-additions.md).

## Criterio de selección

Se priorizaron documentos de autores, mantenedores, universidades y especificaciones. Una fuente se eligió por explicar una regla que pueda observarse y ponerse a prueba: recuperar un registro confirmado, invalidar una traducción, comparar costos de rutas o identificar una jugada perdedora. No se midieron popularidad ni eficacia relativa de cursos.

Los talleres usan escenarios, consignas, modelos y núcleos originales. Se enlazan las fuentes para ampliar y contrastar, sin copiar cursos, capítulos ni implementaciones completas. Cada taller separa:

1. Un modelo determinista con límites explícitos y tres observaciones concretas.
2. Un núcleo Rust/Go con tres casos ejecutables y espacio para una hipótesis propia.
3. Una predicción con explicación y cuatro etapas manuales para continuar el proyecto.

Esta estructura busca acortar el ciclo entre predecir, actuar y revisar. Es una decisión de diseño educativo; los sellos registran actividad comprobable dentro del contrato, no dominio general del tema.

## Herramientas externas que amplían el alcance

| Recurso primario | Por qué se eligió | Relación con el taller |
| --- | --- | --- |
| [Nand2Tetris: software oficial](https://www.nand2tetris.org/software) y [IDE web](https://nand2tetris.github.io/web-ide/) | El sitio oficial ofrece las herramientas de los proyectos en el navegador y permite descargar archivos. | Ruta para desarrollar la máquina Hack y su cadena de herramientas. La PC de bolsillo usa otra máquina simplificada; no implementa el curso ni su HDL. |
| [Ripes: repositorio del autor](https://github.com/mortbopet/Ripes) | Documenta ejecución RISC-V, microarquitecturas, cachés y E/S mapeada en memoria. | Permite contrastar una máquina visual más extensa con nuestros modelos. Su README enlaza [ripes.dk](https://ripes.dk/) como despliegue web experimental; no se infiere que ejecute el kernel o la MMU de nuestro taller. |
| [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/) | Los autores organizan sistemas operativos en virtualización, concurrencia y persistencia, con capítulos gratuitos y enlaces a ejercicios/proyectos. | Apoya memoria virtual, administración de huecos, scheduling y persistencia. Se enlazan los capítulos originales en lugar de redistribuirlos. |
| [xv6 RISC-V del MIT](https://github.com/mit-pdos/xv6-riscv) y [curso 6.1810/2025](https://pdos.csail.mit.edu/6.1810/2025/) | Sistema operativo docente en C para RISC-V, con código real y herramientas de emulación. | Siguiente paso para estudiar traps, memoria y dispositivos en un kernel. Los modelos web y los kits con `std`/Go no son un sistema arrancable. |
| [Arquitectura de SQLite](https://sqlite.org/arch.html) y [WAL](https://sqlite.org/wal.html) | La documentación de sus mantenedores conecta SQL, bytecode, almacenamiento y recuperación. | Sirve para comparar nuestro registro mínimo con un motor de base de datos real. No se afirma equivalencia de formato de archivo, concurrencia ni durabilidad. |

Estas herramientas son enlaces externos: no se empaquetan ni se embeben en el sitio. Consultar sus páginas no equivale a haber realizado sus proyectos.

### Context7 y límites de verificación

La búsqueda de Ripes se hizo con Context7 antes de recurrir al repositorio. El integrante encargado de máquina ejecutó dos consultas `library`, sin coincidencia válida; los resultados correspondían a productos RIPE ajenos al simulador. No se inventó un ID de biblioteca ni se consultaron documentos de esos resultados.

```sh
npx ctx7@latest library Ripes "Does Ripes provide a browser RISC-V visual processor simulator, and does it emulate a full operating system MMU and page faults? Need precise educational comparison limits and current web app link."
npx ctx7@latest library "mortbopet/Ripes" "Ripes graphical RISC-V processor simulator official browser deployment and educational features: pipelining, cache simulation and memory-mapped IO. Need comparison with an educational MMU/TLB kernel simulator."
```

La alternativa comprobada fue el README oficial, que identifica el enlace y alcance. La apertura directa de `ripes.dk` agotó el tiempo de espera; `ripes.me/Ripes/` devolvió una pantalla de carga. Esto no prueba una caída general, pero tampoco permite afirmar que se haya probado su interfaz. El IDE web de Nand2Tetris fue enlazado y contrastado con su página oficial, sin realizar los proyectos completos.

La URL genérica `https://pdos.csail.mit.edu/6.828/xv6.html` devolvió 404 en esta consulta. Se usaron el repositorio MIT y la página fechada del curso que sí respondieron. Las URL de años concretos son referencias a esa edición, no una afirmación sobre cuál es el curso más reciente.

## Fuentes de los modelos de máquina

| Temas | Fuente | Regla o límite conservado |
| --- | --- | --- |
| Caché LRU y reemplazo | [OSTEP: políticas de reemplazo](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf) | Diferenciar hit, miss y expulsión; una traza corta no representa el rendimiento de un CPU real. |
| Heap y allocator | [OSTEP: espacio libre](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf), [Philipp Oppermann: allocator designs](https://os.phil-opp.com/allocator-designs/) | Separar huecos, bloques ocupados, división y coalescencia. |
| MMU, TLB y PC de bolsillo | [OSTEP: paging](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf), [TLBs](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf), [libro xv6 RISC-V](https://pdos.csail.mit.edu/6.1810/2025/xv6/book-riscv-rev5.pdf) | Un TLB miss, una página ausente, un permiso insuficiente y una interrupción son eventos diferentes. El modelo usa un solo proceso y una tabla pequeña. |
| VM y pila de llamadas | [Nand2Tetris: proyecto 8](https://www.nand2tetris.org/project08) | Especificar instrucciones y conservar continuaciones; nuestra ISA no reproduce toda la VM del curso. |
| Scheduling | [OSTEP: planificación de CPU](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf) | Separar listo, bloqueado y terminado con un quantum explícito. |
| Interrupciones | [Writing an OS in Rust: hardware interrupts](https://os.phil-opp.com/hardware-interrupts/) | Distinguir evento pendiente, máscara, atención y reconocimiento. Los pulsos del modelo son manuales, sin acceso a dispositivos reales. |

Rust y Go implementan simuladores de estas reglas dentro de sus entornos ordinarios. Que un modelo describa MMIO no vuelve sus funciones un controlador bare metal. Las referencias a [TinyGo](https://tinygo.org/docs/reference/lang-support/) y al [runtime de Go](https://go.dev/doc/faq#runtime) ayudan a ubicar esa diferencia, sin prometer compatibilidad de un kernel.

## Fuentes de infraestructura

| Temas | Fuente primaria | Decisión didáctica |
| --- | --- | --- |
| WAL y recuperación | [SQLite WAL](https://sqlite.org/wal.html), [TigerBeetle: safety](https://docs.tigerbeetle.com/concepts/safety/) | Separar preparación, commit y prefijo durable en una traza reproducible. |
| LSM y compactación | [RocksDB: compaction](https://github.com/facebook/rocksdb/wiki/Compaction) | Mostrar por qué eliminar un tombstone sin conocer versiones restantes puede resucitar datos. |
| Réplicas, quórums y partición | [Dynamo, artículo original](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf), [Raft](https://raft.github.io/) | La intersección de conjuntos ilustra una condición; no implementa consenso ni demuestra linearizabilidad. |
| Relojes lógicos | [Lamport: Time, Clocks, and the Ordering of Events](https://lamport.azurewebsites.net/pubs/time-clocks.pdf) | Aplicar la actualización por eventos sin confundir reloj lógico con hora física o causalidad inversa. |
| Fragmentación y red | [RFC 9000, §13.3](https://datatracker.ietf.org/doc/html/rfc9000#section-13.3) | Reordenar y deduplicar fragmentos con un contrato propio; no presentarlo como una implementación QUIC. |
| Backpressure | [Go: pipelines and cancellation](https://go.dev/blog/pipelines) | Distinguir cola acotada, trabajo activo y productor pendiente. |
| Balanceo y circuitos | [Envoy: load balancing](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview), [circuit breaking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking) | Salud, cupo y tareas activas son dimensiones separadas. |
| Sharding | [Envoy: ring hash](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers#ring-hash) | Visualizar sucesores e intervalos que cambian de dueño con tokens ordenados. |

## Fuentes de gráficos, álgebra y juegos

| Taller | Fuente primaria | Qué se vuelve observable |
| --- | --- | --- |
| Transformaciones | [Cornell CS4620: transformaciones 2D](https://www.cs.cornell.edu/courses/cs4620/2014fa/lectures/08transforms2d.pdf) | El orden de composición cambia la posición; aplicar la inversa recupera vértices. |
| Raster | [Artículo original de Bresenham, 1965](https://janmr.com/files/papers/bresenham65.pdf), [Alois Zingl](https://zingl.github.io/bresenham.html) | El error entero decide píxeles; los extremos y empates pertenecen al contrato. El PDF es un escaneo del artículo original alojado por un tercero. |
| Raycast | [Ray Tracing in One Weekend](https://raytracing.github.io/books/RayTracingInOneWeekend.html) | Pasar de raíces matemáticas a impactos válidos y elegir la superficie más cercana. El modelo usa círculos 2D. |
| BFS / A* | [Amit Patel: introducción a A*](https://www.redblobgames.com/pathfinding/a-star/introduction.html) | Frontera, padres y costo acumulado; con pantanos, menos pasos puede costar más. |
| Física | [Glenn Fiedler: Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/) | Separar integración y respuesta de colisión, con avance fijo reproducible y límites de velocidad explícitos. |
| Conway | [Princeton COS126: simulación y autómatas](https://www.cs.princeton.edu/courses/archive/fall15/cos126/lectures/CS.Movies.pdf) | Actualización simultánea, estabilidad, período y desplazamiento emergente en una grilla finita. |
| Álgebra | [NIST DLMF §1.11: polinomios](https://dlmf.nist.gov/1.11) | Conectar coeficientes, Horner, derivada y pendiente en un punto. El CAS solo manipula polinomios acotados. |
| Minimax | [UC Berkeley CS188: juegos](https://inst.eecs.berkeley.edu/~cs188/textbook/games/) | Cambiar perspectiva entre jugadores y reconocer posiciones sin victoria forzada. El juego de retirar fichas permite explorar su árbol completo. |

## Entrega y trazabilidad

Los modelos se ejecutan localmente en JavaScript. Sus núcleos se escriben en Rust o Go y se envían a los Playgrounds oficiales únicamente cuando la persona ejecuta las pruebas. Los kits ZIP se producen localmente con [fflate](https://github.com/101arrowz/fflate) y contienen un proyecto para `cargo test` o `go test`, con el borrador y sus casos; no empaquetan estos cursos externos.

Esta nota documenta selección y alcance. Los resultados de pruebas, hashes y validaciones de navegador pertenecen a sus registros de QA. Añadir una fuente o un comando aquí no equivale a declarar pasada una compilación o verificada una interfaz externa.
