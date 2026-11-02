import { CODE_XP, PREDICTION_XP } from '../../../entities/campaign';

const CampaignRules = () => (
  <details className="quest-rules">
    <summary>Las reglas del juego y las herramientas que usamos</summary>
    <div className="quest-rule-grid">
      <div>
        <h3>XP que significa algo</h3>
        <p>
          {`${CODE_XP} XP por las pruebas del ejercicio y ${PREDICTION_XP} por su predicción correcta. Repetir no duplica puntos. Editar después no borra lo ganado. Las reflexiones no se califican por longitud.`}
        </p>
      </div>
      <div>
        <h3>Ayuda sin castigos</h3>
        <p>
          Las pistas son gratuitas. Ver una solución queda indicado como práctica con apoyo y cuenta
          para avanzar. El checkpoint te pide razonar sobre el concepto. Sin vidas, rachas
          obligatorias ni castigos por tardar.
        </p>
      </div>
      <div>
        <h3>Herramientas existentes</h3>
        <p>
          {'El IDE usa '}
          <a href="https://codemirror.net/" target="_blank" rel="noopener noreferrer">
            CodeMirror
          </a>
          {'; las celebraciones, '}
          <a
            href="https://github.com/catdad/canvas-confetti"
            target="_blank"
            rel="noopener noreferrer"
          >
            canvas-confetti
          </a>
          {'. Nos inspiran los ejercicios con pistas de '}
          <a
            href="https://rustlings.rust-lang.org/usage/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rustlings
          </a>
          {' y '}
          <a href="https://github.com/madhank93/golings" target="_blank" rel="noopener noreferrer">
            Golings
          </a>
          . Estas misiones son originales.
        </p>
      </div>
    </div>
    <p className="quest-honesty">
      El avance se guarda en tu navegador y viaja con Exportar progreso. Es un juego de aprendizaje
      personal: los puntos y tests no certifican dominio profesional ni evalúan todas las soluciones
      posibles. Los errores del compilador son reales; la orientación es preparada para cada
      desafío.
    </p>
  </details>
);

export default CampaignRules;
