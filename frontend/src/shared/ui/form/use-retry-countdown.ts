import { useCallback, useEffect, useRef, useState } from 'react';

const useRetryCountdown = () => {
  const [waiting, setWaiting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const start = useCallback((seconds: number) => {
    clearTimeout(timer.current);
    if (seconds <= 0) return;
    setWaiting(true);
    timer.current = setTimeout(() => setWaiting(false), seconds * 1000);
  }, []);
  return { waiting, start };
};

export default useRetryCountdown;
