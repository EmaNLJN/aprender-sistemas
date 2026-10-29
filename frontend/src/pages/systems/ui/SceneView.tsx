import {
  sanitizeScene,
  type SafeSceneShape,
  type Scene,
} from '../../../entities/systems-simulation';

interface SceneViewProps {
  scene: Scene;
}

function renderShape(shape: SafeSceneShape, key: number) {
  switch (shape.type) {
    case 'rect':
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
        />
      );
    case 'circle':
      return (
        <circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
        />
      );
    case 'line':
      return (
        <line
          key={key}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
        />
      );
    case 'polygon':
      return (
        <polygon
          key={key}
          points={shape.points}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
        />
      );
    case 'text':
      return (
        <text
          key={key}
          x={shape.x}
          y={shape.y}
          fill={shape.fill}
          fontSize={shape.fontSize}
          fontFamily="monospace"
        >
          {shape.text}
        </text>
      );
  }
}

const SceneView = ({ scene }: SceneViewProps) => {
  const safe = sanitizeScene(scene);
  return (
    <svg
      className="sys-scene"
      viewBox={safe.viewBox}
      role="img"
      aria-label={safe.alt}
      style={{ background: safe.background }}
    >
      {safe.shapes.map(renderShape)}
    </svg>
  );
};

export default SceneView;
