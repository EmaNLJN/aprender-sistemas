function counted(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatWait(seconds: number): string {
  const total = Math.max(1, Math.ceil(seconds));
  if (total < 60) return counted(total, 'segundo', 'segundos');
  const minutes = Math.ceil(total / 60);
  if (minutes < 60) return counted(minutes, 'minuto', 'minutos');
  const hours = counted(Math.floor(minutes / 60), 'hora', 'horas');
  const rest = minutes % 60;
  return rest === 0 ? hours : `${hours} y ${counted(rest, 'minuto', 'minutos')}`;
}
