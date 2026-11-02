import type { DerivedWorld } from '../../../entities/campaign';
import { campaignMissionHref } from '../../../shared/config/url-grammar';
import type { MissionContent } from '../model/types';

interface WorldProgressProps {
  world: DerivedWorld;
  nextWorld: DerivedWorld | undefined;
  missions: ReadonlyMap<string, MissionContent>;
  onChooseWorld: (worldId: string) => void;
}

const WorldProgress = ({ world, nextWorld, missions, onChooseWorld }: WorldProgressProps) => {
  if (world.completed)
    return (
      <div className="quest-unlocked" role="status">
        <span aria-hidden="true">✳</span>
        <div>
          <strong>{`Insignia conseguida: ${world.badge}`}</strong>
          <p>Podés completar los puntos que faltan o seguir al siguiente mundo.</p>
        </div>
        {nextWorld ? (
          <button className="button secondary" onClick={() => onChooseWorld(nextWorld.id)}>
            Siguiente mundo →
          </button>
        ) : (
          <a className="button secondary" href="#proyecto">
            Llevarlo a mi proyecto ↗
          </a>
        )}
      </div>
    );
  const next = world.missions.find(
    (mission) => mission.allowed && (!mission.code || !mission.prediction),
  );
  if (!next) return null;
  return (
    <div className="quest-next">
      <div>
        <span className="small-label">TU SIGUIENTE MOVIMIENTO</span>
        <strong>{missions.get(next.id)!.title}</strong>
        <small>
          {next.code
            ? 'Código aprobado. Volvé a Descubrí y razoná la predicción.'
            : 'Una misión, una hipótesis y tres pruebas.'}
        </small>
      </div>
      <a className="button" href={campaignMissionHref(world.id, next.id)}>
        {`${next.code ? 'Resolver predicción' : 'Entrar al IDE'} ↗`}
      </a>
    </div>
  );
};

export default WorldProgress;
