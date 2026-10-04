// Contrato común de las simulaciones de Sistemas (lowlevel, infra, play y pc): cada taller
// publica una máquina de estados pura y una vista de sólo datos que `systems.js` dibuja.

export type CellTone = 'active' | 'good' | 'bad' | 'muted';

export interface ViewMetric {
  label: string;
  value: string;
}

export interface ViewCell extends ViewMetric {
  tone: CellTone;
}

// `value` viaja como texto: el renderizador lo lee de `data-value`.
export interface ViewControl {
  action: string;
  label: string;
  value?: string;
}

interface SceneShapeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface RectShape extends SceneShapeStyle {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends SceneShapeStyle {
  type: 'circle';
  x: number;
  y: number;
  r: number;
}

export interface LineShape extends SceneShapeStyle {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PolygonShape extends SceneShapeStyle {
  type: 'polygon';
  points: [number, number][];
}

export interface TextShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fill?: string;
  fontSize?: number;
}

export type SceneShape = RectShape | CircleShape | LineShape | PolygonShape | TextShape;

export interface Scene {
  width: number;
  height: number;
  background: string;
  alt: string;
  shapes: SceneShape[];
}

export interface ModelView {
  title: string;
  summary: string;
  explanation: string;
  metrics: ViewMetric[];
  cells: ViewCell[];
  controls: ViewControl[];
  columns?: string[];
  rows?: string[][];
  log: string[];
  scene?: Scene;
}

// Lo mínimo que un modelo puede pedirle a la ficha del taller que lo usa.
export interface ModelWorkshop {
  id: string;
  model: string;
  objectives: { id: string }[];
}

export interface SystemsModel<State, Workshop extends ModelWorkshop = ModelWorkshop> {
  initial(workshop: Workshop): State;
  // Devuelve un estado NUEVO: nunca muta `state`.
  act(state: State, action: string, value: string | undefined, workshop: Workshop): State;
  view(state: State, workshop: Workshop): ModelView;
  achieved(state: State, workshop: Workshop): string[];
}
