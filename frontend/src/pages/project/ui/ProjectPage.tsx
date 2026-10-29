import { useStore } from 'zustand';
import { routeStore, type GuideLanguage } from '../../../entities/guide';
import { projectProgress } from '../model/project-progress';
import MilestoneCard from './MilestoneCard';

interface ProjectPageProps {
  language: GuideLanguage;
}

const selectRevision = (state: { revision: number }) => state.revision;

const ProjectPage = ({ language }: ProjectPageProps) => {
  useStore(routeStore.changes, selectRevision);
  const { milestones, completedCount } = projectProgress(
    routeStore.getProgress().milestones,
    language,
  );
  const languageName = language === 'go' ? 'Go' : 'Rust';

  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <span className="eyebrow-line"></span>
          {' UNA IDEA QUE CRECE CON VOS'}
        </div>
        <h1>
          {'De una función'}
          <br />
          {'a '}
          <em>tu propio sistema.</em>
        </h1>
        <p>
          {`Un pequeño almacén clave-valor en ${languageName}. Cada capacidad te da una razón para aprender el siguiente concepto. El proyecto tiene su propio avance: los ejercicios del recorrido lo preparan.`}
        </p>
      </div>
      <div className="project-hero">
        <div>
          <span className="small-label">
            {`PROYECTO PERSONAL · ${completedCount} / ${milestones.length} HITOS`}
          </span>
          <h2>Tu primer taller de datos.</h2>
          <p>
            {
              'Empezá en memoria. Sumá comandos, archivos, mediciones y, cuando estés listo, una conexión por red.'
            }
          </p>
        </div>
        <pre className="terminal">
          <span className="prompt">&gt;</span>
          {' SET curiosidad encendida\nOK\n'}
          <span className="prompt">&gt;</span>
          {' GET curiosidad\nencendida\n'}
          <span className="prompt">&gt;</span>
          {' _'}
        </pre>
      </div>
      <div className="milestones">
        {milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            onToggle={() => routeStore.toggleMark('milestones', milestone.id)}
          />
        ))}
      </div>
      <div className="recommendation-strip">
        <span className="strip-icon" aria-hidden="true">
          ↗
        </span>
        <p>
          <strong>¿Preferís un reto con tests externos?</strong>
          <br />
          {
            'CodeCrafters propone construir una shell o un servidor HTTP. Protohackers prueba tus servidores de protocolos. '
          }
          <a href="#biblioteca">Encontralos en la biblioteca</a>
          {'.'}
        </p>
      </div>
    </>
  );
};

export default ProjectPage;
