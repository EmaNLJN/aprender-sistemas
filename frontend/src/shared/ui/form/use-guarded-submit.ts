import { useCallback, useRef } from 'react';

const useGuardedSubmit = <A extends unknown[]>(handler: (...args: A) => Promise<void>) => {
  const pending = useRef(false);
  return useCallback(
    async (...args: A): Promise<void> => {
      if (pending.current) return;
      pending.current = true;
      try {
        await handler(...args);
      } finally {
        pending.current = false;
      }
    },
    [handler],
  );
};

export default useGuardedSubmit;
