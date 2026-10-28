const useGuardedSubmit: <A extends unknown[]>(
  handler: (...args: A) => Promise<void>,
) => (...args: A) => Promise<void> = () => async () => {};

export default useGuardedSubmit;
