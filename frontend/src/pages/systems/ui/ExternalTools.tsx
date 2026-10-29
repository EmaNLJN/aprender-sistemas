const ExternalTools = () => (
  <section className="sys-external">
    <div className="eyebrow">TU PRÓXIMO BANCO DE PRUEBAS</div>
    <h2>Seguí construyendo con herramientas reales.</h2>
    <p>
      Estos proyectos documentados complementan los modelos del taller. Se abren en sus propios
      sitios; tu avance acá se conserva.
    </p>
    <div className="sys-external-grid">
      <article>
        <span className="small-label">DE COMPUERTAS A PROGRAMAS</span>
        <h3>Nand2Tetris</h3>
        <p>Construí RAM y una CPU Hack con HDL, probalas y observá programas en sus emuladores.</p>
        <strong>Experimento: cambiá una celda de RAM y seguí qué instrucción la lee.</strong>
        <a href="https://nand2tetris.github.io/web-ide/" target="_blank" rel="noopener noreferrer">
          Abrir el IDE web ↗
        </a>
        <a href="https://www.nand2tetris.org/project03" target="_blank" rel="noopener noreferrer">
          Guía oficial de memoria ↗
        </a>
      </article>
      <article>
        <span className="small-label">ARQUITECTURA A LA VISTA</span>
        <h3>Ripes</h3>
        <p>
          Explorá instrucciones RISC‑V, procesadores, cachés y dispositivos mapeados en memoria. Su
          versión web es experimental.
        </p>
        <strong>Experimento: repetí un acceso y compará dos configuraciones de caché.</strong>
        <a href="https://ripes.dk/" target="_blank" rel="noopener noreferrer">
          Abrir Ripes ↗
        </a>
        <a href="https://github.com/mortbopet/Ripes" target="_blank" rel="noopener noreferrer">
          Documentación y versión de escritorio ↗
        </a>
      </article>
      <article>
        <span className="small-label">MEMORIA VIRTUAL Y SISTEMA OPERATIVO</span>
        <h3>OSTEP</h3>
        <p>
          Usá los simuladores de los autores para practicar traducción, paginación, heap y
          planificación con nuevos escenarios.
        </p>
        <strong>
          Experimento: calculá una dirección física antes de pedir la solución al simulador.
        </strong>
        <a
          href="https://github.com/remzi-arpacidusseau/ostep-homework"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ejercicios y simuladores ↗
        </a>
        <a href="https://pages.cs.wisc.edu/~remzi/OSTEP/" target="_blank" rel="noopener noreferrer">
          Leer el libro gratuito ↗
        </a>
      </article>
    </div>
  </section>
);

export default ExternalTools;
