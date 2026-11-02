export function formatLocalDateTime(iso: string, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')} de ${part('month')} de ${part('year')} a las ${part('hour')}:${part('minute')}`;
}
