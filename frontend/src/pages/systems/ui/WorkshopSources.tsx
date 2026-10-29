import type { WorkshopSource } from '../model/types';

interface WorkshopSourcesProps {
  sources: readonly WorkshopSource[];
}

const WorkshopSources = ({ sources }: WorkshopSourcesProps) => (
  <section className="sys-sources">
    <h2>Seguí con quienes construyeron estas ideas.</h2>
    <div>
      {sources.map((source, index) => (
        <a key={index} href={source.url} target="_blank" rel="noopener noreferrer">
          {source.title} ↗
        </a>
      ))}
    </div>
  </section>
);

export default WorkshopSources;
