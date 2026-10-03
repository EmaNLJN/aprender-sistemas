# Investigación para ampliar el taller de Rust y Go

Consulta: **2 de octubre de 2026**. Destinatario: una persona que ya programa, se interesa por sistemas y suele aburrirse con recorridos exclusivamente de lectura. Esta es una selección razonada de fuentes; los comentarios de una comunidad son experiencias individuales y no una encuesta representativa. No se copiaron ejercicios ni soluciones de los cursos.

## Qué aparece en las conversaciones

| Fuente y fecha de publicación | Qué aporta | Límite de esa evidencia |
| --- | --- | --- |
| [r/learnrust: Where should I learn Rust?](https://www.reddit.com/r/learnrust/comments/1tknvle/where_should_i_learn_rust/) · 22 mayo 2026 | Algunas respuestas recomiendan Rustlings porque los programas incompletos obligan a interpretar errores del compilador; después sugieren proyectos pequeños. El problema inicial del autor es la falta de práctica acompañando al libro. | Una conversación breve; no demuestra que esa secuencia funcione para todas las personas. |
| [r/rust: anuncio de 100 Exercises to Learn Rust](https://www.reddit.com/r/rust/comments/1ctepo1/100_exercises_to_learn_rust_a_new_learnbydoing/) · 16 mayo 2024, con comentarios posteriores | El autor explica la intención de combinar teoría y ejercicios. Un participante que trabaja con Java describe mayor interés al resolver y modificar tareas. Otros señalan que conviene distinguir una simplificación pedagógica de una solución idiomática definitiva. | El autor presenta su propio curso y algunas respuestas son testimonios seleccionados por participación voluntaria. |
| [r/learnrust: How did you learn Rust?](https://www.reddit.com/r/learnrust/comments/1u5occp/how_did_you_learn_rust_looking_for_advice_for_a/) · 14 junio 2026 | Varias personas mencionan combinar The Book, Rustlings y proyectos; una reutiliza algoritmos que ya conocía en otros lenguajes. | Hay muy pocas respuestas. Sirve como idea práctica, no como ranking. |
| [r/golang: Recommendations for Learning TDD in Go?](https://www.reddit.com/r/golang/comments/12ggdt9/) · 9 abril 2023 | El autor relata una secuencia concreta: ejemplos para la sintaxis, Exercism para problemas breves, Gophercises para proyectos y Learn Go with Tests para TDD. Quiere rehacer proyectos escribiendo sus propias pruebas. | Es el recorrido de una persona y no una comparación controlada entre recursos. El contenido fue accesible en el resultado indexado de búsqueda; la apertura directa devolvió un error del proveedor. |
| [r/golang: FAQ sobre libros](https://www.reddit.com/r/golang/comments/1g6nvqh/faq_what_are_the_best_books_for_go/) · 18 octubre 2024 | Hay recomendaciones de Learn Go with Tests y práctica en Exercism; un comentario valora problemas con dificultad algorítmica moderada para concentrarse en el lenguaje. | Las preferencias mezclan libros, cursos, niveles y objetivos. No corresponde resumirlas como una recomendación unánime. |
| [Foro de Exercism: TDD and the Golang track](https://forum.exercism.org/t/tdd-and-the-golang-track/11535) · 2 junio–14 julio 2024 | Un mantenedor distingue resolver una suite existente de practicar TDD escribiendo y cambiando las pruebas. También explica el uso de subtests para dar feedback incremental. Eso inspira ofrecer un caso personalizado, además de los casos del ejercicio. | Es una discusión entre usuarios y mantenedores sobre el formato. No prueba resultados educativos. |

## Qué confirman las fuentes originales

- **Rustlings:** organiza ejercicios por tema, muchos con errores de compilación y otros con tests; ofrece pistas y vuelve a verificar los cambios. Su documentación propone continuar con proyectos propios después del recorrido. Para el taller, esto inspira reparaciones pequeñas y diagnósticos legibles. [Documentación de uso](https://rustlings.rust-lang.org/usage/).
- **100 Exercises:** asume experiencia en otro lenguaje, introduce conceptos por etapas y los acompaña con pruebas. Su metodología original incluye apoyo de un instructor; para hacerlo de forma autónoma recomienda ayuda de otra persona cuando hace falta. Un revisor con explicaciones preparadas puede orientar, pero no equivale a ese acompañamiento humano. [Introducción y metodología](https://rust-exercises.com/100-exercises/).
- **Learn Go with Tests:** enseña explorando conceptos y escribiendo tests. Su autor relata que ni asignar capítulos largos ni proponer katas aisladas le dio suficiente estructura a todos los participantes. Es una experiencia docente, no una garantía causal. Para el taller, conviene conectar cada ejercicio con una idea y un pequeño sistema. [Presentación del curso](https://quii.gitbook.io/learn-go-with-tests).
- **Gophercises:** propone aproximadamente veinte aplicaciones, paquetes y herramientas pequeños, incluyendo concurrencia y biblioteca estándar. Su sitio ofrece acceso gratuito mediante correo. El valor para este taller es progresar desde funciones aisladas hacia un producto pequeño; los detalles de sus proyectos externos deben revisarse cuando dependan de servicios que cambian. [Sitio del autor](https://gophercises.com/).
- **Exercism Go:** ofrece ejercicios por conceptos, análisis automático y mentoría voluntaria. La página consultada muestra 165 ejercicios y 34 conceptos; esas cantidades pueden cambiar. La mentoría no significa una respuesta humana inmediata. [Track oficial de Go](https://exercism.org/tracks/go).
- **Go Wiki:** incluye Exercism, Learn Go with Tests y Gophercises entre iniciativas de la comunidad. Estar listado no establece un orden de calidad. [Directorio de aprendizaje de Go](https://go.dev/wiki/Learn).
- **Libro interactivo de Brown:** su versión experimental de The Rust Programming Language añade cuestionarios, anotaciones y visualizaciones de ownership con Aquascope. Es un complemento especialmente pertinente para entender memoria; no es un sustituto de escribir programas propios. [Qué cambia respecto del libro original](https://rust-book.cs.brown.edu/).

## Evidencia pedagógica más directa

En *Profiling Programming Language Learning* (Crichton y Krishnamurthi, publicado en arXiv el 2 de enero de 2024), los autores estudiaron respuestas a cuestionarios incorporados al libro de Rust. Observaron abandono alrededor de temas difíciles como ownership y encontraron útil formular preguntas conceptuales —por qué falla un programa— en lugar de preguntar solamente si compila. Las mejoras reportadas corresponden a preguntas intervenidas dentro de ese estudio; no prueban que nuestro taller produzca el mismo efecto. [Artículo original y resumen](https://arxiv.org/abs/2401.01257).

## Decisiones de diseño que se desprenden de la investigación

Estas son **inferencias de diseño**, no resultados demostrados para este producto:

1. Alternar una explicación breve, una predicción, código y una variante. La pregunta debe revelar la razón de una regla, no limitarse a recordar sintaxis.
2. Explicar qué verifica cada test y qué queda fuera. Tres casos no prueban la corrección completa, la ausencia de carreras ni que se haya usado la técnica solicitada.
3. Mantener ejercicios normales, casos límite y errores del contrato. Evitar convertir el recorrido en una sucesión de resultados constantes memorizables.
4. Permitir pistas graduadas, soluciones comentadas y un test propio. Consultar una solución puede ayudar, pero conviene reconstruirla después sin mirarla.
5. Incluir reparaciones y mini sistemas además de katas. La concurrencia, los recursos y el diseño de APIs necesitan contextos que van más allá de una cuenta aislada.
6. Permitir volver a fundamentos aunque ya se haya llegado a temas avanzados. El número de ejercicio no debe sustituir la dificultad real del tema.

Texto breve utilizable en la interfaz: **«El recorrido combina explicaciones cortas, errores para reparar y casos que podés modificar. Está inspirado en formatos presentes en Rustlings, 100 Exercises, Exercism y Learn Go with Tests; los ejercicios de este taller son originales.»**
