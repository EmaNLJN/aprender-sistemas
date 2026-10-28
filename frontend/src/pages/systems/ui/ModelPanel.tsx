import type { ModelView, ViewControl } from '../../../entities/systems-simulation';
import ModelTable from './ModelTable';
import ModelTrace from './ModelTrace';
import SceneView from './SceneView';

const CELL_TONES: readonly string[] = ['active', 'good', 'bad', 'muted'];

interface ModelPanelProps {
  view: ModelView;
  onAction: (control: ViewControl) => void;
}

const ModelPanel = ({ view, onAction }: ModelPanelProps) => (
  <>
    <h2>{view.title}</h2>
    <p className="sys-model-summary">{view.summary}</p>
    <div className="sys-metrics">
      {view.metrics.map((metric, index) => (
        <div key={index}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
    {view.scene ? <SceneView scene={view.scene} /> : null}
    {view.cells.length ? (
      <div className="sys-cells">
        {view.cells.map((cell, index) => (
          <div
            key={index}
            className={`sys-cell ${CELL_TONES.includes(cell.tone) ? cell.tone : ''}`}
          >
            <span>{cell.label}</span>
            <strong>{cell.value}</strong>
          </div>
        ))}
      </div>
    ) : null}
    <ModelTable columns={view.columns} rows={view.rows} />
    <div className="sys-controls" role="group" aria-label="Acciones del modelo">
      {view.controls.map((control) => (
        <button key={`${control.action}:${control.value ?? ''}`} onClick={() => onAction(control)}>
          {control.label}
        </button>
      ))}
    </div>
    <ModelTrace log={view.log} />
  </>
);

export default ModelPanel;
