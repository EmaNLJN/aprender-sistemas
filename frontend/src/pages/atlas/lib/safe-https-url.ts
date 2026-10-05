const safeHttpsUrl = (value: string): string => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '#';
  } catch {
    return '#';
  }
};

export default safeHttpsUrl;
