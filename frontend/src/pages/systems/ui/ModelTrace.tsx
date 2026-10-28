interface ModelTraceProps {
  log: readonly string[];
}

const TRACE_LINES = 8;

const ModelTrace = ({ log }: ModelTraceProps) => {
  if (!log.length) return null;
  return (
    <details className="sys-trace" open>
      <summary>Qué cambió y por qué · últimos pasos</summary>
      <ol>
        {log.slice(-TRACE_LINES).map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </details>
  );
};

export default ModelTrace;
