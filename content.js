/* Contenido de la guía: un recorrido orientativo para aprender haciendo. */
window.GUIDE_DATA = {
  resources: [
    {
      id: "rust-100",
      title: "100 Exercises to Learn Rust",
      url: "https://rust-exercises.com/100-exercises/",
      languages: ["rust"],
      category: "ejercicios",
      cost: "gratis",
      format: "Ejercicios locales con tests · Inglés",
      description: "Explicaciones breves y ejercicios que avanzan desde los fundamentos hasta temas más profundos de Rust. Está pensado para personas que ya programan.",
      why: "Tu recorrido principal recomendado: escribís código desde el comienzo y tenés una señal concreta de progreso.",
      caveat: "Elegí esta versión o la integrada en RustRover; comparten la base. No hace falta terminarlo entero antes de iniciar tu proyecto.",
      featured: true
    },
    {
      id: "rust-rover",
      title: "100 Exercises en RustRover",
      url: "https://blog.jetbrains.com/rust/2026/09/23/100-exercises-to-learn-rust/",
      languages: ["rust"],
      category: "ejercicios",
      cost: "mixto",
      format: "Curso integrado en el editor · Inglés",
      description: "Una adaptación del recorrido de Mainmatter para resolver ejercicios y ejecutar sus tests dentro de RustRover.",
      why: "Útil si te resulta más cómodo tener consignas, código y correcciones en un mismo entorno.",
      caveat: "El curso es gratuito. El IDE ofrece uso no comercial gratuito; revisá su licencia si lo usás para trabajar. Es una alternativa al curso original.",
      featured: false
    },
    {
      id: "rustlings",
      title: "Rustlings",
      url: "https://rustlings.rust-lang.org/",
      languages: ["rust"],
      category: "ejercicios",
      cost: "gratis",
      format: "Programas pequeños para reparar · Inglés",
      description: "Corregís errores de compilación y tests en ejercicios cortos, con pistas y revisión de los cambios.",
      why: "Va muy bien para una sesión breve o para reforzar un concepto que te está costando.",
      caveat: "No reemplaza un proyecto propio. Evitá completar mecánicamente los cambios sin explicar qué estaba fallando.",
      featured: true
    },
    {
      id: "rust-brown",
      title: "Rust Book interactivo de Brown",
      url: "https://rust-book.cs.brown.edu/",
      languages: ["rust"],
      category: "lectura",
      cost: "gratis",
      format: "Libro con preguntas y visualizaciones · Inglés",
      description: "Una versión interactiva del libro de Rust, con preguntas de comprensión y ayudas para razonar sobre ownership y memoria.",
      why: "Tu referencia para entender por qué una operación es válida o por qué el compilador la rechaza.",
      caveat: "Sigue siendo un libro: abrí el capítulo que resuelve tu duda actual y después volvé al código.",
      featured: true
    },
    {
      id: "rust-google",
      title: "Comprehensive Rust en español",
      url: "https://google.github.io/comprehensive-rust/es/",
      languages: ["rust"],
      category: "lectura",
      cost: "gratis",
      format: "Material de curso y ejercicios · Español",
      description: "Material de formación de Google con fundamentos y recorridos especializados, incluidos concurrencia y bare metal.",
      why: "Una buena segunda explicación en español, especialmente si querés conectar Rust con sistemas.",
      caveat: "Fue diseñado para capacitación con instructor. Tomá los módulos como referencia; sus tiempos no son una promesa de dominio.",
      featured: false
    },
    {
      id: "codecrafters",
      title: "CodeCrafters",
      url: "https://codecrafters.io/",
      languages: ["both"],
      category: "proyectos",
      cost: "mixto",
      format: "Reconstrucción de herramientas por etapas · Inglés",
      description: "Implementás proyectos como una shell, un servidor HTTP o partes de Redis y Git, trabajando en tu editor y validando cada etapa con tests.",
      why: "Conecta muy bien con tu interés por entender cómo funcionan las herramientas por dentro.",
      caveat: "El acceso gratuito y las condiciones dependen del reto. Anunciaron una pausa en nuevos retos, manteniendo los existentes: evaluá el proyecto que ya esté disponible.",
      featured: true
    },
    {
      id: "protohackers",
      title: "Protohackers",
      url: "https://protohackers.com/",
      languages: ["both"],
      category: "proyectos",
      cost: "gratis",
      format: "Desafíos de protocolos de red · Inglés",
      description: "Implementás un servidor a partir de una especificación y un servicio externo prueba su comportamiento. Podés elegir el lenguaje.",
      why: "Excelente para practicar lectura de especificaciones, entradas inesperadas y comportamiento de red.",
      caveat: "Para usar el evaluador necesitás un servidor accesible desde Internet. Empezá probando localmente y dejá ese despliegue para otra sesión.",
      featured: true
    },
    {
      id: "go-tour",
      title: "A Tour of Go",
      url: "https://go.dev/tour/",
      languages: ["go"],
      category: "ejercicios",
      cost: "gratis",
      format: "Lecciones ejecutables en el navegador · Inglés",
      description: "El recorrido introductorio oficial de Go, con ejemplos editables y ejercicios desde el navegador.",
      why: "Una forma de empezar con poca preparación y comprobar enseguida qué cambia cuando tocás el código.",
      caveat: "No hace falta completar todo de una vez. Alterná las primeras lecciones con un programa pequeño en tu computadora.",
      featured: true
    },
    {
      id: "go-tests",
      title: "Learn Go with Tests",
      url: "https://quii.gitbook.io/learn-go-with-tests",
      languages: ["go"],
      category: "lectura",
      cost: "gratis",
      format: "Libro práctico con tests · Inglés",
      description: "Aprendés Go escribiendo tests, implementando lo necesario para pasarlos y mejorando el diseño paso a paso.",
      why: "Tu recorrido principal recomendado en Go: ya sabés programar y podés usar los tests para explorar el lenguaje.",
      caveat: "Requiere trabajo local y lectura; no tiene mecánicas de juego. Hacé cada ejemplo antes de leer la solución completa.",
      featured: true
    },
    {
      id: "go-exercism",
      title: "Exercism · Go",
      url: "https://exercism.org/tracks/go",
      languages: ["go"],
      category: "ejercicios",
      cost: "gratis",
      format: "Ejercicios con tests y comunidad · Inglés",
      description: "Una colección de ejercicios con tests y herramientas de análisis, junto con oportunidades de aprender de soluciones y mentoría voluntaria.",
      why: "Ideal para una sesión corta y para comparar tu solución con otras después de intentar resolverla.",
      caveat: "La mentoría humana depende de disponibilidad. Un ejercicio aprobado tampoco demuestra por sí solo que puedas transferir lo aprendido.",
      featured: true
    },
    {
      id: "gophercises",
      title: "Gophercises",
      url: "https://gophercises.com/",
      languages: ["go"],
      category: "proyectos",
      cost: "gratis",
      format: "Proyectos con consignas y videos · Inglés",
      description: "Proyectos como un quiz, un acortador de URLs o una aventura interactiva, con material para construirlos paso a paso.",
      why: "Una opción para salir de los ejercicios aislados y terminar algo que puedas ejecutar y mostrar.",
      caveat: "Intentá implementar la consigna antes del video. Consultá documentación actual si una dependencia o instrucción del entorno cambió.",
      featured: false
    },
    {
      id: "boot-dev",
      title: "Boot.dev · Go",
      url: "https://www.boot.dev/courses/learn-golang",
      languages: ["go"],
      category: "ejercicios",
      cost: "mixto",
      format: "Lecciones y desafíos con progresión · Inglés",
      description: "Un recorrido de aprendizaje con desafíos de programación y una progresión visual orientada a desarrollo backend.",
      why: "Puede ayudarte si una estructura externa y los objetivos frecuentes te dan ganas de volver.",
      caveat: "La interactividad completa requiere membresía después de la prueba. El acceso gratuito conserva parte del material de lectura; verificá las condiciones antes de pagar.",
      featured: false
    },
    {
      id: "context7",
      title: "Context7",
      url: "https://github.com/upstash/context7",
      languages: ["both"],
      category: "herramientas",
      cost: "mixto",
      format: "Documentación para asistentes de código · Inglés",
      description: "Permite recuperar documentación y ejemplos de bibliotecas para que un asistente fundamente sus respuestas en fuentes concretas.",
      why: "Usalo cuando aparezca una duda específica de API o de versión durante un ejercicio.",
      caveat: "No es un curso ni un evaluador pedagógico. Hay límites de uso y cobertura; pedí la fuente y contrastá lo que explica el asistente.",
      featured: false
    },
    {
      id: "rust-examples",
      title: "Rust by Example",
      url: "https://doc.rust-lang.org/rust-by-example/",
      languages: ["rust"],
      category: "lectura",
      cost: "gratis",
      format: "Ejemplos ejecutables por tema · Inglés",
      description: "Una referencia oficial organizada en ejemplos breves para explorar construcciones y conceptos de Rust.",
      why: "Útil para comparar una explicación con un programa concreto y modificar una sola condición.",
      caveat: "Consultalo a demanda. Copiar un ejemplo sin predecir su resultado aporta poco a tu práctica.",
      featured: false
    },
    {
      id: "go-examples",
      title: "Go by Example",
      url: "https://gobyexample.com/",
      languages: ["go"],
      category: "lectura",
      cost: "gratis",
      format: "Ejemplos comentados por tema · Inglés",
      description: "Ejemplos cortos de Go que podés consultar por tema mientras construís tu propio programa.",
      why: "Una referencia rápida cuando sabés qué querés hacer y necesitás ver un ejemplo pequeño.",
      caveat: "Es un recurso de la comunidad. Para detalles de una API o de versión, seguí el enlace a la documentación correspondiente.",
      featured: false
    }
  ],
  tracks: {
    rust: {
      title: "Rust · entendé lo que pasa por dentro",
      description: "Recorrido recomendado para tu interés en sistemas y rendimiento. Usá 100 Exercises como base, Brown para destrabar conceptos y un pequeño almacén clave-valor como hilo conductor. Son 12 sesiones orientativas, no una fecha límite para dominar el lenguaje.",
      modules: [
        {
          id: "rust-foundations",
          title: "Ganá confianza con el compilador",
          subtitle: "Predecí, probá y explicá. Un concepto nuevo por sesión.",
          steps: [
            {
              id: "rust-first-session",
              title: "Tu primer cambio comprobable",
              minutes: 25,
              objective: "Arrancar con una victoria pequeña y aprender a leer el resultado de un test.",
              task: "Elegí 100 Exercises o su versión en RustRover. Seguí la preparación del recurso y resolvé el primer ejercicio disponible. Antes de ejecutarlo, anotá qué esperás que pase. Después cambiá una entrada para provocar un fallo y explicá la diferencia. Si preparar el entorno consume la sesión, dejá anotado el ejercicio exacto para mañana.",
              doneWhen: "Podés ejecutar el ejercicio y señalar qué cambio hace pasar o fallar su comprobación.",
              resourceIds: ["rust-100", "rust-rover"],
              quiz: {
                question: "Un test acaba de pasar. ¿Qué conclusión está justificada?",
                options: ["El programa es correcto para cualquier entrada.", "Ese caso comprobó la propiedad expresada por el test.", "La implementación ya es la más rápida posible."],
                answer: 1,
                explanation: "Un test verifica un caso y sus condiciones. Todavía pueden faltar entradas, propiedades y comportamientos por cubrir."
              }
            },
            {
              id: "rust-ownership",
              title: "Seguí el recorrido de un valor",
              minutes: 25,
              objective: "Distinguir transferencia de propiedad, préstamo y copia explícita.",
              task: "Abrí una explicación de ownership en Brown y un ejercicio relacionado en Rustlings o 100 Exercises. Dibujá qué variable posee el dato antes y después de una operación. Intentá resolver el ejercicio sin agregar copias por prueba y error. Al final explicá cuándo alcanza con prestar acceso y cuándo necesitás otro valor independiente.",
              doneWhen: "Resolviste un caso y podés explicar quién posee el valor y por qué una operación está permitida o rechazada.",
              resourceIds: ["rust-brown", "rustlings", "rust-100"],
              quiz: {
                question: "Una función solo necesita consultar un dato del llamador. ¿Qué diseño conviene explorar primero?",
                options: ["Prestarle acceso al dato durante el tiempo necesario.", "Duplicar siempre el dato completo.", "Entregarle la propiedad aunque el llamador lo siga necesitando."],
                answer: 0,
                explanation: "Un préstamo puede expresar que una función consulta un dato sin apropiárselo ni crear una copia. El diseño concreto depende de cuánto tiempo necesita acceder a él."
              }
            },
            {
              id: "rust-errors",
              title: "Tratamiento de entradas inválidas",
              minutes: 25,
              objective: "Separar un resultado válido de un fallo esperable de entrada.",
              task: "Hacé una función pequeña que intente interpretar un texto como una cantidad. Probá un número válido, un texto vacío y letras. Consultá el tema de manejo de errores cuando lo necesites. Hacé que el llamador decida qué mensaje mostrar; evitá terminar todo el programa desde la función. Anotá qué entradas aceptaste y cuáles rechazaste.",
              doneWhen: "Las tres entradas tienen un comportamiento definido y la entrada inválida no produce un cierre inesperado.",
              resourceIds: ["rust-100", "rust-examples", "rust-google"],
              quiz: {
                question: "Un usuario ingresa letras donde esperabas un número. ¿Cómo conviene modelarlo?",
                options: ["Como una prueba de que el compilador falló.", "Como un número cero, sin avisarle a nadie.", "Como un resultado fallido que el llamador puede manejar."],
                answer: 2,
                explanation: "Una entrada inválida es esperable. Representar el fallo permite decidir si mostrar una ayuda, reintentar o devolver el error a otro nivel."
              }
            }
          ]
        },
        {
          id: "rust-kv",
          title: "Construí tu almacén clave-valor",
          subtitle: "Un programa chico que crece con cada idea que aprendés.",
          steps: [
            {
              id: "rust-kv-memory",
              title: "Guardá y recuperá dos valores",
              minutes: 25,
              objective: "Construir el núcleo del proyecto sin sumar todavía archivos ni red.",
              task: "Creá un almacén de texto en memoria con dos operaciones: guardar una clave con su valor y buscar una clave. Empezá invocándolas directamente desde un ejemplo; usá las claves nombre y ciudad. Decidí qué representa una clave ausente y qué pasa al guardar dos veces la misma clave. Mantené las operaciones separadas de la impresión en pantalla.",
              doneWhen: "Recuperás ambas claves, sobrescribís una y distinguís una clave ausente de un valor vacío.",
              resourceIds: ["rust-100", "rust-examples"],
              quiz: {
                question: "¿Por qué conviene distinguir una clave ausente de una clave cuyo valor es un texto vacío?",
                options: ["Porque son estados distintos que podrían necesitar respuestas distintas.", "Porque un texto vacío siempre ocupa más memoria.", "Porque todo almacén debe prohibir valores vacíos."],
                answer: 0,
                explanation: "La ausencia indica que la clave no está almacenada. Un valor vacío puede ser un valor válido. Confundirlos borra información del modelo."
              }
            },
            {
              id: "rust-kv-cli",
              title: "Dale una conversación por terminal",
              minutes: 25,
              objective: "Convertir el núcleo en una herramienta que puedas usar.",
              task: "Agregá un bucle que lea una línea, la interprete y responda. Soportá SET clave valor, GET clave y EXIT. Para esta primera versión limitá claves y valores a una palabra sin espacios. Escribí esa regla en la ayuda. Ante un comando desconocido o incompleto, mostrá un mensaje y seguí aceptando entradas.",
              doneWhen: "En una misma ejecución guardás, consultás, enviás un comando incorrecto y luego volvés a consultar con éxito.",
              resourceIds: ["rust-examples", "rust-brown"],
              quiz: {
                question: "¿Qué aporta definir primero la forma de los comandos?",
                options: ["Garantiza automáticamente que el programa no tenga errores.", "Hace innecesario comprobar las entradas.", "Permite decidir qué entradas aceptar y qué comportamiento probar."],
                answer: 2,
                explanation: "Una especificación pequeña da un acuerdo explícito entre el programa y quien lo usa. A partir de ella podés construir ejemplos válidos e inválidos."
              }
            },
            {
              id: "rust-kv-tests",
              title: "Protegé las decisiones con tests",
              minutes: 25,
              objective: "Usar tests para poder cambiar el programa con confianza.",
              task: "Escribí tres tests sobre el núcleo: consultar después de guardar, sobrescribir una clave y consultar una clave ausente. Si te queda tiempo, sumá un test de comando incompleto. Introducí un error deliberado en la sobrescritura para comprobar que el test lo detecta y después corregilo. Evitá que los tests dependan de escribir manualmente en la terminal.",
              doneWhen: "Los tres casos pasan y viste al menos uno fallar ante una modificación incorrecta.",
              resourceIds: ["rust-100", "rust-examples"],
              quiz: {
                question: "¿Qué test protege mejor el comportamiento de sobrescritura?",
                options: ["Comprobar que una variable interna tiene cierto nombre.", "Guardar dos valores con la misma clave y verificar que se recupera el último.", "Ejecutar el programa sin comprobar el resultado."],
                answer: 1,
                explanation: "Ese test expresa el comportamiento prometido al usuario y sigue siendo útil aunque cambies la estructura interna del almacén."
              }
            }
          ]
        },
        {
          id: "rust-disk",
          title: "Mirá qué pasa en disco y en el tiempo",
          subtitle: "Persistencia sencilla, fallos observables y mediciones honestas.",
          steps: [
            {
              id: "rust-save",
              title: "Guardá una foto del almacén",
              minutes: 25,
              objective: "Hacer explícito el formato de los datos que salen del programa.",
              task: "Agregá una operación de guardado manual a un archivo de práctica nuevo. Usá una línea por entrada con clave y valor separados por un tabulador; mantené la restricción de palabras sin espacios. Documentá el formato con dos ejemplos. Mostrá un error si no se puede escribir y conservá los datos en memoria. No hace falta implementar guardado automático todavía.",
              doneWhen: "Abrís el archivo y reconocés las dos entradas; un destino inválido produce un mensaje comprensible.",
              resourceIds: ["rust-examples", "rust-google"],
              quiz: {
                question: "¿Por qué importa definir cómo se separan los campos de un archivo?",
                options: ["Porque determina cómo podrá reconstruirlos quien lea el archivo.", "Porque todo archivo de texto es una base de datos transaccional.", "Porque elimina cualquier riesgo de error de escritura."],
                answer: 0,
                explanation: "Quien lee necesita conocer las reglas de representación. Esas reglas permiten reconocer campos y detectar líneas que no respetan el formato."
              }
            },
            {
              id: "rust-load",
              title: "Reiniciá sin perder el estado",
              minutes: 25,
              objective: "Comprobar una propiedad que atraviesa dos ejecuciones distintas.",
              task: "Agregá carga manual del archivo que guardaste. Primero leé y validá todo en un almacén temporal; reemplazá el actual solo si la carga termina bien. Probá el viaje completo: guardar, cerrar, abrir, cargar y consultar. Después introducí una línea inválida y verificá que la carga informe el problema y conserve el estado previo.",
              doneWhen: "Recuperás los valores después de reiniciar y una carga inválida no deja el almacén parcialmente cambiado.",
              resourceIds: ["rust-examples", "rust-brown"],
              quiz: {
                question: "¿Qué ventaja tiene validar una carga completa antes de reemplazar el estado actual?",
                options: ["Evita tener que definir un formato.", "Impide todos los fallos posibles del sistema operativo.", "Evita aplicar solo una parte del archivo cuando aparece un error."],
                answer: 2,
                explanation: "Preparar el nuevo estado antes de aplicarlo permite conservar el anterior si la validación falla. Esto no equivale por sí solo a ofrecer transacciones durables en disco."
              }
            },
            {
              id: "rust-measure",
              title: "Medí antes de optimizar",
              minutes: 25,
              objective: "Formular una pregunta de rendimiento que tus datos puedan responder.",
              task: "Prepará un lote fijo de búsquedas sobre el mismo conjunto de claves. Medí el lote completo varias veces sin imprimir en cada iteración. Anotá cantidad de operaciones, configuración de compilación y resultados. Si comparás dos variantes, cambiá solo una decisión y verificá que produzcan los mismos resultados. No interpretes una sola ejecución como una tendencia.",
              doneWhen: "Tenés varias mediciones comparables y una frase que explica qué mediste y qué todavía no sabés.",
              resourceIds: ["rust-google", "context7"],
              quiz: {
                question: "Una variante tardó menos una sola vez. ¿Qué podés concluir?",
                options: ["Que siempre será más rápida para cualquier carga.", "Que esa ejecución fue más corta; hacen falta mediciones comparables para evaluar una tendencia.", "Que sus resultados necesariamente son correctos."],
                answer: 1,
                explanation: "La carga, la compilación, otras tareas y el ruido pueden afectar los tiempos. Medir varias veces bajo condiciones comparables ayuda a sostener una conclusión limitada."
              }
            }
          ]
        },
        {
          id: "rust-network",
          title: "Abrí la puerta a las redes",
          subtitle: "Primero un protocolo pequeño; después, un reto con evaluación externa.",
          steps: [
            {
              id: "rust-protocol",
              title: "Especificá antes de conectar",
              minutes: 25,
              objective: "Separar el significado de un comando del medio por el que llega.",
              task: "Escribí una especificación de una página para reutilizar SET y GET por una conexión: cada comando termina en un salto de línea y cada respuesta también. Definí respuestas para éxito, clave ausente y entrada inválida. Usá una sola conexión y procesamiento secuencial como alcance inicial. Prepará tres conversaciones de ejemplo y comprobá sus comandos contra tu intérprete actual.",
              doneWhen: "Otra persona podría predecir las respuestas de tus tres conversaciones leyendo la especificación.",
              resourceIds: ["protohackers", "codecrafters"],
              quiz: {
                question: "¿Por qué tu protocolo necesita una regla para saber dónde termina un comando?",
                options: ["Porque una conexión de bytes no define por sí sola los límites de tus comandos.", "Porque cada envío siempre llega en una sola lectura.", "Porque todos los comandos de red deben medir exactamente lo mismo."],
                answer: 0,
                explanation: "TCP transporta un flujo de bytes. El protocolo de la aplicación debe indicar cómo reconocer cada mensaje, por ejemplo con un delimitador o una longitud."
              }
            },
            {
              id: "rust-local-server",
              title: "Atendé una conexión local",
              minutes: 25,
              objective: "Reutilizar el núcleo de tu programa detrás de una entrada de red.",
              task: "Consultá un ejemplo oficial de servidor TCP y adaptá solo lo necesario para aceptar una conexión local, leer un comando completo y responder usando tu núcleo existente. Atendé un cliente a la vez; dejá concurrencia para después. Probá un SET y un GET desde un cliente separado. Si el tiempo no alcanza, terminá con una conexión que responda un texto fijo y dejá anotado el siguiente cambio.",
              doneWhen: "Un cliente recibe una respuesta del servidor local y sabés si completaste la respuesta fija o la integración con el almacén.",
              resourceIds: ["rust-google", "context7", "codecrafters"],
              quiz: {
                question: "¿Qué parte conviene reutilizar al pasar de la terminal a una conexión de red?",
                options: ["Las suposiciones sobre cómo llegan los bytes por terminal.", "Todo el código de impresión, sin revisar el protocolo.", "Las operaciones del almacén y sus reglas, separadas de la entrada y la salida."],
                answer: 2,
                explanation: "El comportamiento del almacén puede mantenerse. La forma de recibir comandos y enviar respuestas cambia con el medio y con el protocolo."
              }
            },
            {
              id: "rust-next-challenge",
              title: "Elegí tu próximo problema real",
              minutes: 25,
              objective: "Cerrar el recorrido con una dirección propia y un próximo paso pequeño.",
              task: "Elegí un solo siguiente reto: HTTP o shell en CodeCrafters, o el primer desafío de Protohackers. Leé su especificación y anotá qué parte ya entendés y qué concepto falta. Definí una primera etapa que puedas comprobar localmente. Cerrá explicando tu almacén sin mirar el código: propiedad de datos, errores, persistencia y una limitación de tus mediciones.",
              doneWhen: "Tenés un reto elegido, una primera prueba concreta y una explicación propia de cuatro decisiones de tu proyecto.",
              resourceIds: ["codecrafters", "protohackers", "rust-google"],
              quiz: {
                question: "¿Qué señal muestra mejor que podés transferir lo aprendido?",
                options: ["Haber abierto muchos cursos distintos.", "Resolver una variante nueva y explicar las decisiones sin copiar la solución.", "Recordar exactamente el orden de las lecciones."],
                answer: 1,
                explanation: "Aplicar una idea en una situación diferente y justificarla ofrece una señal de comprensión más fuerte que reconocer una solución conocida."
              }
            }
          ]
        }
      ]
    },
    go: {
      title: "Go · construí herramientas y explorá sistemas",
      description: "Una alternativa si te motiva avanzar pronto hacia una herramienta útil. Usá Tour of Go para empezar y Learn Go with Tests como base. El mismo almacén clave-valor te permite explorar errores, archivos, mediciones y redes en 12 sesiones orientativas.",
      modules: [
        {
          id: "go-foundations",
          title: "Entrá escribiendo código",
          subtitle: "Ejemplos pequeños, predicciones y tests desde el comienzo.",
          steps: [
            {
              id: "go-first-session",
              title: "Modificá tu primer ejemplo",
              minutes: 25,
              objective: "Aprender una construcción del lenguaje con una prueba inmediata.",
              task: "Abrí Tour of Go y elegí una lección inicial con una función y variables. Antes de ejecutarla, predecí la salida. Cambiá una entrada, agregá un caso y explicá por qué cambia el resultado. Si ya conocés esa parte, avanzá hasta encontrar una diferencia concreta con tu lenguaje habitual; anotá una, no una lista completa.",
              doneWhen: "Podés anticipar el resultado de dos variantes del ejemplo y explicar una diferencia con un lenguaje que ya usás.",
              resourceIds: ["go-tour", "go-examples"],
              quiz: {
                question: "¿Qué práctica comprueba mejor que entendiste un ejemplo?",
                options: ["Ejecutarlo una sola vez y mirar la salida.", "Leer la solución hasta que resulte familiar.", "Predecir una variante, ejecutarla y explicar la diferencia."],
                answer: 2,
                explanation: "La predicción te obliga a formular un modelo. Compararla con el resultado muestra dónde ese modelo necesita ajustes."
              }
            },
            {
              id: "go-first-test",
              title: "Hacé fallar un test a propósito",
              minutes: 25,
              objective: "Aprender el ciclo de expresar un comportamiento y comprobarlo.",
              task: "Seguí la preparación y el primer ejemplo de Learn Go with Tests. Ejecutá el test antes y después de implementar el comportamiento. Después cambiá deliberadamente el resultado para ver un fallo. Leé el mensaje completo y anotá qué esperaba y qué recibió. Si el entorno consume la sesión, dejá el primer test preparado para el próximo día.",
              doneWhen: "Ejecutaste un test que falla y luego pasa, y podés explicar qué propiedad verifica.",
              resourceIds: ["go-tests"],
              quiz: {
                question: "¿Para qué sirve ver fallar un test antes de corregir la implementación?",
                options: ["Para comprobar que puede detectar al menos ese comportamiento incorrecto.", "Para demostrar que cubre todas las entradas.", "Para evitar leer el mensaje de error."],
                answer: 0,
                explanation: "Un test que falla ante el error esperado muestra que está conectado con el comportamiento que querés proteger. No demuestra cobertura completa."
              }
            },
            {
              id: "go-errors",
              title: "Dale un lugar a los errores",
              minutes: 25,
              objective: "Diferenciar un valor válido de un fallo esperable.",
              task: "Creá una función que interprete un texto como una cantidad y comunique si la conversión falla. Probá un número, letras y un texto vacío. Hacé que el llamador decida qué mostrar. Compará cómo modelarías la misma situación en tu lenguaje habitual y escribí una diferencia en una sola frase.",
              doneWhen: "Cada entrada tiene un resultado definido y el caso inválido muestra un mensaje sin terminar inesperadamente el programa.",
              resourceIds: ["go-tests", "go-examples", "go-exercism"],
              quiz: {
                question: "¿Qué riesgo tiene ignorar el error de una conversión de texto a número?",
                options: ["Que Go deje de compilar cualquier programa futuro.", "Que sigas con un valor que no representa la entrada solicitada.", "Que el valor se vuelva automáticamente más preciso."],
                answer: 1,
                explanation: "Si la conversión falla, el valor devuelto no debe tratarse sin más como una conversión exitosa. El llamador necesita decidir cómo manejar el fallo."
              }
            }
          ]
        },
        {
          id: "go-kv",
          title: "Dale forma a tu herramienta",
          subtitle: "Guardá datos, hablá con el programa y protegé su comportamiento.",
          steps: [
            {
              id: "go-kv-memory",
              title: "Construí el núcleo en memoria",
              minutes: 25,
              objective: "Representar claves, valores y ausencia sin sumar infraestructura.",
              task: "Creá un almacén de texto con operaciones para guardar y buscar. Invocalas directamente con las claves nombre y ciudad. Definí que guardar otra vez reemplaza el valor previo y que buscar una clave ausente se distingue de encontrar un valor vacío. Separá estas operaciones de cualquier impresión en pantalla.",
              doneWhen: "Guardás y recuperás dos claves, reemplazás una y distinguís ausencia de valor vacío.",
              resourceIds: ["go-tests", "go-examples"],
              quiz: {
                question: "¿Qué información necesitás conservar al consultar una clave si el texto vacío es un valor válido?",
                options: ["Solo la longitud del texto.", "La fecha en que compilaste el programa.", "El valor y una indicación de si la clave existe."],
                answer: 2,
                explanation: "El valor por sí solo puede ser ambiguo. Conocer si la clave existe permite distinguir una entrada vacía de una clave ausente."
              }
            },
            {
              id: "go-kv-cli",
              title: "Interpretá tres comandos",
              minutes: 25,
              objective: "Transformar las operaciones en una herramienta interactiva.",
              task: "Agregá lectura de líneas y soportá SET clave valor, GET clave y EXIT. Limitá claves y valores a palabras sin espacios y mostrá esa regla en la ayuda. Separá la interpretación de una línea de la lectura de la terminal. Un comando desconocido o incompleto debe producir un mensaje y permitir seguir trabajando.",
              doneWhen: "En una misma ejecución guardás, consultás, enviás un comando incorrecto y continuás usando el almacén.",
              resourceIds: ["go-examples", "gophercises"],
              quiz: {
                question: "¿Qué ventaja tiene interpretar una línea en una función separada de la terminal?",
                options: ["Podés probar esa función con textos concretos sin simular una sesión manual.", "Ya no necesitás definir comandos válidos.", "El programa se vuelve concurrente automáticamente."],
                answer: 0,
                explanation: "Separar interpretación y entrada permite comprobar reglas con datos simples y reutilizarlas después en otro medio, como una conexión de red."
              }
            },
            {
              id: "go-kv-tests",
              title: "Probá lo que prometiste",
              minutes: 25,
              objective: "Convertir decisiones del proyecto en comprobaciones repetibles.",
              task: "Escribí tres casos sobre el núcleo: guardar y consultar, sobrescribir y buscar una clave ausente. Agregá un caso de comando incompleto si queda tiempo. Cambiá temporalmente la sobrescritura para que conserve el valor anterior y comprobá que el test falle. Corregí el comportamiento y ejecutá todos los casos de nuevo.",
              doneWhen: "Los tres casos pasan y el test de sobrescritura detectó el fallo deliberado.",
              resourceIds: ["go-tests", "go-exercism"],
              quiz: {
                question: "¿Qué deberían verificar principalmente estos tests?",
                options: ["Que nunca cambies la cantidad de funciones.", "Las respuestas y cambios de estado que prometen tus operaciones.", "Que todas las variables tengan nombres de una letra."],
                answer: 1,
                explanation: "Probar comportamiento observable te permite mejorar la implementación sin reescribir tests que dependan de detalles irrelevantes del diseño interno."
              }
            }
          ]
        },
        {
          id: "go-disk",
          title: "Conservá datos y observá costos",
          subtitle: "Archivos pequeños y preguntas de rendimiento con alcance claro.",
          steps: [
            {
              id: "go-save",
              title: "Escribí un archivo que puedas leer",
              minutes: 25,
              objective: "Definir una representación simple y manejar el fallo de escritura.",
              task: "Agregá guardado manual a un archivo de práctica nuevo. Escribí una entrada por línea y separá clave y valor con un tabulador; mantené la restricción de palabras sin espacios. Documentá dos líneas de ejemplo. Probá un destino inválido y asegurate de informar el fallo sin borrar el almacén en memoria.",
              doneWhen: "Reconocés los datos al abrir el archivo y una escritura fallida deja disponible el estado en memoria.",
              resourceIds: ["go-examples", "go-tests"],
              quiz: {
                question: "Si la escritura falla, ¿qué debería hacer tu primera versión?",
                options: ["Informar éxito para simplificar la interfaz.", "Borrar los datos en memoria porque el archivo no se guardó.", "Informar el fallo y conservar el estado que todavía tiene en memoria."],
                answer: 2,
                explanation: "El usuario necesita saber que el guardado no se completó. Conservar el estado permite corregir el destino y volver a intentar."
              }
            },
            {
              id: "go-load",
              title: "Completá el viaje de ida y vuelta",
              minutes: 25,
              objective: "Verificar que el formato conserva lo necesario para reconstruir el estado.",
              task: "Implementá la carga del archivo en un almacén temporal y reemplazá el actual solo cuando todas las líneas sean válidas. Guardá dos claves, cerrá el programa, abrilo y recuperalas. Después probá una línea mal formada. Explicá qué diferencia hay entre validar una carga completa y garantizar resistencia a una caída durante una escritura.",
              doneWhen: "Dos ejecuciones distintas recuperan los mismos valores y un archivo inválido deja intacto el estado previo.",
              resourceIds: ["go-examples", "go-tests"],
              quiz: {
                question: "Pasar una prueba de guardar y cargar correctamente, ¿qué demuestra?",
                options: ["Que ese viaje de ida y vuelta conservó los datos probados bajo esas condiciones.", "Que el archivo resistirá cualquier corte de energía.", "Que varios procesos pueden escribirlo a la vez sin coordinación."],
                answer: 0,
                explanation: "La prueba cubre un recorrido normal. Durabilidad frente a fallos y coordinación de varios escritores son propiedades adicionales que requieren otro diseño y otras verificaciones."
              }
            },
            {
              id: "go-measure",
              title: "Compará sin engañarte con el tiempo",
              minutes: 25,
              objective: "Entender qué puede y qué no puede decir una medición pequeña.",
              task: "Prepará un lote fijo de búsquedas sobre un conjunto de datos conocido. Medí varias repeticiones sin imprimir en cada operación. Registrá tamaño del lote, datos usados y configuración. Si comparás dos variantes, usá la misma carga y verificá resultados equivalentes. Escribí una conclusión acotada; si los resultados fluctúan mucho, registrá esa incertidumbre.",
              doneWhen: "Tenés varias mediciones comparables y podés explicar qué trabajo incluye el tiempo registrado.",
              resourceIds: ["go-tests", "go-examples", "context7"],
              quiz: {
                question: "¿Qué puede pasar si imprimís una línea por cada búsqueda mientras medís?",
                options: ["La impresión nunca influye en los tiempos.", "Podés terminar midiendo en gran parte el costo de salida en vez de las búsquedas.", "El resultado se convierte automáticamente en una medición de memoria."],
                answer: 1,
                explanation: "La salida agrega trabajo y puede dominar la duración observada. Aislá el trabajo que querés estudiar y describí lo que tu medición incluye."
              }
            }
          ]
        },
        {
          id: "go-network",
          title: "Conectá tu proyecto con el exterior",
          subtitle: "Un cliente, un servidor y una especificación que ambos entiendan.",
          steps: [
            {
              id: "go-protocol",
              title: "Definí una conversación por red",
              minutes: 25,
              objective: "Especificar límites de mensajes y respuestas antes de implementar el transporte.",
              task: "Definí cómo usar SET y GET por una conexión: un comando por línea y una respuesta por línea. Escribí respuestas para éxito, clave ausente y comando inválido. Mantené una conexión y procesamiento secuencial como alcance. Prepará tres conversaciones y pasá sus comandos por el intérprete que ya construiste.",
              doneWhen: "Las tres conversaciones tienen respuestas inequívocas y una regla explícita para reconocer un comando completo.",
              resourceIds: ["protohackers", "codecrafters"],
              quiz: {
                question: "¿Puede una lectura de una conexión TCP entregar solo una parte de un comando?",
                options: ["No, cada envío conserva exactamente sus límites al leerlo.", "Solo si el comando está escrito en Rust.", "Sí; la aplicación debe reunir bytes hasta reconocer un mensaje completo."],
                answer: 2,
                explanation: "TCP ofrece un flujo de bytes. Tus reglas de delimitación o longitud permiten reconstruir los mensajes independientemente de cómo se distribuyan las lecturas."
              }
            },
            {
              id: "go-local-server",
              title: "Respondé a un cliente local",
              minutes: 25,
              objective: "Conectar una entrada de red con reglas que ya funcionan y tienen tests.",
              task: "Consultá un ejemplo de servidor TCP y aceptá una conexión local. Leé un comando completo, llamá al núcleo del almacén y devolvé la respuesta definida. Atendé un cliente por vez; todavía no agregues concurrencia. Probá SET y GET desde un cliente separado. Si necesitás dividir la tarea, terminá esta sesión con una respuesta fija y anotá dónde conectarás el intérprete.",
              doneWhen: "Un cliente recibe una respuesta del servidor local y registraste si ya usa el núcleo o todavía responde un texto fijo.",
              resourceIds: ["context7", "codecrafters", "go-examples"],
              quiz: {
                question: "¿Por qué empezar atendiendo un cliente por vez?",
                options: ["Para comprobar primero protocolo y comportamiento con menos situaciones simultáneas.", "Porque Go no puede manejar varios clientes.", "Porque eso demuestra que los datos compartidos son seguros para concurrencia."],
                answer: 0,
                explanation: "Acotar la primera versión permite aislar errores de transporte y protocolo. Si luego agregás concurrencia, tendrás que razonar por separado sobre el acceso al estado compartido."
              }
            },
            {
              id: "go-next-challenge",
              title: "Convertí curiosidad en un nuevo reto",
              minutes: 25,
              objective: "Elegir un siguiente proyecto que se apoye en lo que ya podés explicar.",
              task: "Elegí un solo próximo paso: servidor HTTP en CodeCrafters, primer reto de Protohackers o un proyecto de Gophercises. Leé la consigna y definí una primera prueba local. Explicá tu almacén sin mirar el código: comandos, errores, persistencia y una limitación del servidor. Si te atrae Boot.dev por su progresión, probá primero su acceso gratuito antes de cambiar de recorrido.",
              doneWhen: "Tenés un reto elegido, una primera comprobación realizable y una explicación propia de cuatro decisiones de tu programa.",
              resourceIds: ["codecrafters", "protohackers", "gophercises", "boot-dev"],
              quiz: {
                question: "¿Qué próximo paso da una señal útil de progreso?",
                options: ["Cambiar de curso cada vez que aparece una dificultad.", "Elegir una variante pequeña, implementarla y explicar cómo la verificaste.", "Medir únicamente cuántos videos viste."],
                answer: 1,
                explanation: "Una modificación concreta y comprobada hace visible lo que podés hacer. Si además explicás tus decisiones, podés detectar qué conceptos necesitan más práctica."
              }
            }
          ]
        }
      ]
    }
  },
  sources: [
    {
      title: "Rust: experiencias de personas que se aburren con The Book",
      url: "https://www.reddit.com/r/learnrust/comments/1jvz6du/any_good_resource_to_learn_rust_which_is_not_the/",
      note: "Discusión comunitaria útil para comparar formatos. Son experiencias personales, no un consenso ni evidencia de que un recurso funcione para todos."
    },
    {
      title: "Go: Learn Go with Tests frente a Boot.dev",
      url: "https://www.reddit.com/r/golang/comments/1m4ksas/learn_go_with_tests_vs_bootdev_go_course_which/",
      note: "Opiniones sobre aprendizaje con experiencia previa, estructura y costo. Usalas como contexto para probar qué formato te sostiene."
    },
    {
      title: "Experiencias con CodeCrafters en Hacker News",
      url: "https://news.ycombinator.com/item?id=48245728",
      note: "Testimonios sobre reconstruir herramientas y el papel de la IA durante la práctica. La selección del recorrido es una recomendación de esta guía."
    },
    {
      title: "CodeCrafters: pausa en el desarrollo de nuevos retos",
      url: "https://codecrafters.io/blog/pausing-new-challenges",
      note: "Anuncio de sus creadores sobre nuevos retos y continuidad de los existentes. Revisá la disponibilidad del proyecto concreto antes de pagar."
    },
    {
      title: "CodeCrafters: reto de servidor HTTP",
      url: "https://app.codecrafters.io/courses/http-server/overview",
      note: "Página del reto para consultar etapas, lenguajes disponibles y condiciones actuales de acceso."
    },
    {
      title: "Boot.dev: qué incluye el acceso gratuito",
      url: "https://www.boot.dev/blog/education/is-boot-dev-free",
      note: "Fuente oficial para distinguir contenido accesible sin pago de interactividad y beneficios de membresía. Las condiciones pueden cambiar."
    },
    {
      title: "JetBrains: 100 Exercises en RustRover",
      url: "https://blog.jetbrains.com/rust/2026/09/23/100-exercises-to-learn-rust/",
      note: "Presentación oficial de la integración, condiciones de uso del editor y recomendaciones sobre IA durante los ejercicios."
    },
    {
      title: "Protohackers: funcionamiento del evaluador",
      url: "https://protohackers.com/faq",
      note: "Requisitos para que el servicio pueda conectarse a tu servidor y comprobar tu implementación."
    },
    {
      title: "Context7: proyecto y documentación",
      url: "https://github.com/upstash/context7",
      note: "Documentación del proveedor sobre recuperación de referencias para asistentes. Su función es aportar fuentes; la estrategia de tutoría la definís vos."
    }
  ]
};
