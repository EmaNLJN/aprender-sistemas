import { workshopExerciseHref, type WorkshopPart } from '../../../shared/config/url-grammar';
import type { SystemsLanguage, SystemsPageExercise, SystemsWorkshopView } from '../model/types';
import WorkshopSources from './WorkshopSources';

interface BuildPartProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  exercises: readonly SystemsPageExercise[];
  onPartChange: (part: WorkshopPart) => void;
}

const BuildPart = ({ workshop, language, exercises, onPartChange }: BuildPartProps) => {
  const core = exercises.find((exercise) => exercise.id === workshop.code[language]);
  if (!core) throw new Error(`Falta el núcleo ${workshop.code[language]} del taller ${workshop.id}.`);
  const tools = (workshop.related?.[language] ?? []).flatMap((id) => {
    const exercise = exercises.find((item) => item.id === id);
    return exercise ? [exercise] : [];
  });

  return (
    <>
      <div className="sys-build-callout">
        <div>
          <span className="small-label">NÚCLEO EJECUTABLE · {language.toUpperCase()}</span>
          <h2>{core.title}</h2>
          <p>{core.objective}</p>
          <div className="sys-pills">
            <span>{core.tests.length} pruebas reales</span>
            <span>Pistas progresivas</span>
            <span>Tu propio caso extra</span>
          </div>
        </div>
        <a className="button" href={workshopExerciseHref(workshop.id, core.id)}>Entrar al IDE ↗</a>
      </div>
      <div className="sys-concept">
        <section>
          <h2>Del dibujo al código.</h2>
          <p>{workshop.bridge[language]}</p>
        </section>
        <section>
          <h2>Lo que vas a verificar.</h2>
          <ul>
            {core.tests.map((test, index) => (
              <li key={index}>
                <strong>{test.label}</strong>
                <br />
                {test.why}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {workshop.progress.code ? (
        <p className="sys-code-passed" role="status">
          ✓ Este núcleo tiene una ejecución registrada con sus tres casos aprobados. Cambiarlo no borra el sello: ejecutá otra vez para verificar el código nuevo.
        </p>
      ) : null}
      <div className="sys-related">
        <h2>Herramientas que preparan esta idea.</h2>
        <p>Estos ejercicios existentes se reutilizan como práctica previa. Podés ir directamente al núcleo si ya entendés el concepto.</p>
        <div>
          {tools.map((tool) => (
            <a key={tool.id} href={workshopExerciseHref(workshop.id, tool.id)}>
              <span>{tool.id}</span>
              {tool.title} ↗
            </a>
          ))}
        </div>
      </div>
      <div className="sys-footer">
        <p>El navegador comprueba el núcleo acotado. El próximo paso convierte esa pieza en un proyecto.</p>
        <button className="button" onClick={() => onPartChange('ship')}>Armar mi proyecto →</button>
      </div>
      <WorkshopSources sources={workshop.sources} />
    </>
  );
};

export default BuildPart;
