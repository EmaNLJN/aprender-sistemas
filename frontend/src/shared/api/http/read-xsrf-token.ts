export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function readXsrfToken(cookies: string): string {
  for (const pair of cookies.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== XSRF_COOKIE_NAME) continue;
    return decode(pair.slice(separator + 1).trim());
  }
  return '';
}
