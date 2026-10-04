import type { AtlasSource } from '../content/atlas-content';
import safeHttpsUrl from '../lib/safe-https-url';

interface AdditionalSourcesProps {
  sources: AtlasSource[] | undefined;
}

const AdditionalSources = ({ sources }: AdditionalSourcesProps) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="atlas-more-sources">
      <span className="atlas-block-kicker">PARA ESPECIALIZARTE</span>
      {sources.map((source) => (
        <a
          className="atlas-source"
          href={safeHttpsUrl(source.url)}
          target="_blank"
          rel="noopener noreferrer"
          key={source.url}
        >
          {source.title} ↗
        </a>
      ))}
    </div>
  );
};

export default AdditionalSources;
