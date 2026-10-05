// Allows only https links; anything else is replaced with '#'.
const safeHttpsUrl = (value: string): string => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '#';
  } catch {
    return '#';
  }
};

export default safeHttpsUrl;
