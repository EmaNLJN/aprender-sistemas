interface ModelTableProps {
  columns?: readonly string[];
  rows?: readonly (readonly string[])[];
}

const ModelTable = ({ columns, rows }: ModelTableProps) => {
  if (!columns?.length) return null;
  return (
    <div className="sys-table-scroll" tabIndex={0} role="region" aria-label="Estado del modelo">
      <table>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((value, cellIndex) => (
                <td key={cellIndex}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ModelTable;
