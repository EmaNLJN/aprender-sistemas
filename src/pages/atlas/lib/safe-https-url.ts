// Sólo admite enlaces https; cualquier otra cosa se reemplaza por '#'.
const safeHttpsUrl = (value: string): string => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '#';
  } catch {
    return '#';
  }
};

export default safeHttpsUrl;
