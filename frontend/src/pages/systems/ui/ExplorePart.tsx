import { useState } from 'react';
import type { ViewControl } from '../../../entities/systems-simulation';
import { systemsEngine, type ObserveResult } from '../../../entities/systems-workshop';
import type { WorkshopPart } from '../../../shared/config/url-grammar';
import { celebrate } from '../../../shared/lib/celebration';
import { readSimulation, saveSimulation, simulationKey } from '../model/systems-session';
import type { SystemsLanguage, SystemsPageModel, SystemsWorkshopView } from '../model/types';
import { workshopView } from '../model/workshop-views';
import Checkpoint from './Checkpoint';
import ModelPanel from './ModelPanel';
import WorkshopSources from './WorkshopSources';

interface ExplorePartProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  model: SystemsPageModel;
  notify: (message: string) => void;
  onPartChange: (part: WorkshopPart) => void;
}

function announceObservation(
  before: SystemsWorkshopView,
  result: ObserveResult,
  notify: (message: string) => void,
): void {
  if (result.added.length)
    notify(
      'Nueva situación comprendida: ' +
        result.added
          .map((id) => before.objectives.find((goal) => goal.id === id)?.label)
          .join(' · '),
    );
  if (!before.completed && result.completed) {
    celebrate();
    notify('Tres sellos conseguidos. Podés llevar esta idea a tu proyecto.');
  }
}

const ExplorePart = ({ workshop, language, model, notify, onPartChange }: ExplorePartProps) => {
  const key = simulationKey(language, workshop.id);
  const [simulation, setSimulation] = useState<unknown>(
    () => readSimulation(key) ?? model.initial(workshop),
  );
  const view = model.view(simulation, workshop);

  const runModel = (control: ViewControl | null) => {
    const before = workshopView(workshop.id, language);
    const next =
      control === null
        ? model.initial(before)
        : model.act(simulation, control.action, control.value ?? '', before);
    saveSimulation(key, next);
    setSimulation(next);
    announceObservation(
      before,
      // react-doctor-disable-next-line react-doctor/effect-needs-cleanup -- observe records progress, it does not subscribe
      systemsEngine.observe(workshop.id, language, model.achieved(next, before)),
      notify,
    );
  };

  return (
    <>
      <div className="sys-concept">
        <section>
          <h2>¿Qué estás construyendo?</h2>
          <p>{workshop.what}</p>
        </section>
        <section>
          <h2>¿Por qué existe?</h2>
          <p>{workshop.why}</p>
        </section>
      </div>
      <div className="sys-model-layout">
        <section className="sys-sandbox" aria-label={`Modelo interactivo de ${workshop.title}`}>
          <div className="sys-model-top">
            <span className="small-label">MODELO CONCEPTUAL · PASO A PASO</span>
            <button className="text-button" onClick={() => runModel(null)}>
              Reiniciar modelo ↺
            </button>
          </div>
          <div id="sys-model-view">
            <ModelPanel view={view} onAction={runModel} />
          </div>
          <p id="sys-model-live" className="sys-model-live" role="status" aria-live="polite">
            {view.explanation}
          </p>
        </section>
        <aside className="sys-objectives">
          <span className="eyebrow">TU INVESTIGACIÓN</span>
          <h2>Tres cosas para descubrir.</h2>
          <div id="sys-objective-list">
            {workshop.objectives.map((goal) => {
              const earned = workshop.progress.observed.includes(goal.id);
              return (
                <div key={goal.id} className={`sys-goal ${earned ? 'earned' : ''}`}>
                  <span aria-hidden="true">{earned ? '✓' : '○'}</span>
                  <div>
                    <strong>{goal.label}</strong>
                    <p>{goal.why}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p>
            Los sellos se conservan al reiniciar el modelo. Experimentar acá no ejecuta ni aprueba
            el código del editor.
          </p>
        </aside>
      </div>
      <div className="sys-limit">
        <strong>Hasta dónde llega este modelo</strong>
        <p>{workshop.limits}</p>
      </div>
      <Checkpoint workshop={workshop} language={language} notify={notify} />
      <div className="sys-footer">
        <p>Convertí las reglas que observaste en una función que puedas probar.</p>
        <button className="button" onClick={() => onPartChange('build')}>
          Programar el núcleo →
        </button>
      </div>
      <WorkshopSources sources={workshop.sources} />
    </>
  );
};

export default ExplorePart;
