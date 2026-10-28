import { useState } from 'react';
import { systemsEngine } from '../../../entities/systems-workshop';
import type { SystemsLanguage, SystemsWorkshopView } from '../model/types';
import { workshopView } from '../model/workshop-views';
import Checkpoint from './Checkpoint';
import WorkshopSources from './WorkshopSources';

interface ShipPartProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  notify: (message: string) => void;
  downloadKit: (workshop: SystemsWorkshopView) => void;
}

const NOTE_HINT =
  'La nota y las etapas se guardan con tu progreso. Las casillas son tu registro, no una evaluación automática.';

const ShipPart = ({ workshop, language, notify, downloadKit }: ShipPartProps) => {
  const [noteStatus, setNoteStatus] = useState(NOTE_HINT);
  const languageName = language === 'rust' ? 'Rust' : 'Go';

  const download = () => {
    try {
      downloadKit(workshopView(workshop.id, language));
      notify('Kit descargado con tu borrador y sus pruebas.');
    } catch (error) {
      notify('No se pudo preparar el kit: ' + (error as Error).message);
    }
  };

  const saveNote = (note: string) => {
    const result = systemsEngine.setNote(workshop.id, language, note);
    setNoteStatus(
      result.storageAvailable
        ? 'Nota guardada. Dejá un test concreto para volver.'
        : 'No se pudo guardar: exportá tu avance antes de cerrar.',
    );
  };

  return (
    <>
      <section className="sys-project-intro">
        <div>
          <span className="eyebrow">UNA PIEZA QUE PODÉS LLEVARTE</span>
          <h2>Del experimento al proyecto.</h2>
          <p>
            Descargá un kit con tu borrador actual, tres tests, una solución separada para consultar y esta hoja de ruta.{' '}
            {language === 'rust' ? 'Incluye Cargo.toml y pruebas de Rust.' : 'Incluye go.mod y pruebas de Go.'} El kit
            implementa el núcleo del ejercicio; estas cuatro etapas guían la ampliación.
          </p>
        </div>
        <button className="button" onClick={download}>Descargar kit {languageName} ↓</button>
      </section>
      <div className="sys-real-uses">
        <h3>Dónde aparece esta idea</h3>
        {workshop.uses.map((use, index) => (
          <span key={index}>{use}</span>
        ))}
      </div>
      <div className="sys-project-steps">
        {workshop.steps.map((step, index) => (
          <article key={index}>
            <div className="sys-step-index">0{index + 1}</div>
            <div>
              <h3>{step.title}</h3>
              <p>{step.task}</p>
              <p>
                <strong>Por qué:</strong> {step.why}
              </p>
              <div className="sys-acceptance">
                <strong>Lo podés comprobar así</strong>
                <p>{step.done}</p>
              </div>
              <label>
                <input type="checkbox" checked={workshop.progress.steps.includes(index)}
                  onChange={(event) => systemsEngine.setStep(workshop.id, language, index, event.target.checked)} />{' '}
                Lo comprobé en mi proyecto · registro manual
              </label>
            </div>
          </article>
        ))}
      </div>
      <div className="sys-limit">
        <strong>Límite y siguiente herramienta</strong>
        <p>{workshop.limits}</p>
        <p>{workshop.bridge[language]}</p>
      </div>
      <label className="sys-note">
        <span>Dejá tu próximo experimento por escrito</span>
        <textarea id="sys-note" maxLength={10000} placeholder="Observé que… Mi próximo test va a demostrar…"
          defaultValue={workshop.progress.note} onChange={(event) => saveNote(event.target.value)} />
      </label>
      <p id="sys-note-status" className="note-state">{noteStatus}</p>
      <Checkpoint workshop={workshop} language={language} notify={notify} />
      <WorkshopSources sources={workshop.sources} />
    </>
  );
};

export default ShipPart;
