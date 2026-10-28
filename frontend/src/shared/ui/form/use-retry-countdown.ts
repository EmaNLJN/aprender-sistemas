interface RetryCountdown {
  readonly waiting: boolean;
  readonly start: (seconds: number) => void;
}

const useRetryCountdown = (): RetryCountdown => ({ waiting: false, start: () => {} });

export default useRetryCountdown;
