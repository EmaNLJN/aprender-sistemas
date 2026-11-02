import {
  rankName,
  rankSymbol,
  type CampaignCounts,
  type CampaignLanguage,
  type CampaignSummary,
} from '../../../entities/campaign';

interface CampaignHeroProps {
  language: CampaignLanguage;
  counts: CampaignCounts;
  summary: CampaignSummary;
  completed: number;
}

const CampaignHero = ({ language, counts, summary, completed }: CampaignHeroProps) => (
  <section className="quest-hero">
    <div>
      <div className="eyebrow">
        <span className="eyebrow-line" />
        {` CAMPAÑA · ${language.toUpperCase()}`}
      </div>
      <h1>
        El próximo nivel
        <br />
        lo <em>construís vos.</em>
      </h1>
      <p>
        {`Una expedición por las ideas que hacen especial a ${language === 'rust' ? 'Rust' : 'Go'}. Repará, inventá y defendé tu solución frente a pruebas reales.`}
      </p>
      <div className="quest-pills">
        <span>{`${counts.worlds} mundos`}</span>
        <span>{`${counts.missions} misiones`}</span>
        <span>{`${counts.newChallenges} desafíos nuevos`}</span>
      </div>
    </div>
    <div className="quest-rank">
      <span className="small-label">TU RANGO</span>
      <div className="rank-symbol" aria-hidden="true">
        {rankSymbol(completed)}
      </div>
      <strong>{rankName(completed)}</strong>
      <span>{`${summary.score} / ${summary.maxScore} XP de campaña`}</span>
      <progress value={summary.score} max={summary.maxScore} aria-label="Experiencia de campaña" />
      <small>{`${completed} de ${counts.worlds} insignias`}</small>
    </div>
  </section>
);

export default CampaignHero;
