// canvas-confetti 1.9.4 no publica tipos; sólo se declara lo que usa celebration.ts.
declare module 'canvas-confetti' {
  export interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    startVelocity?: number;
    ticks?: number;
    gravity?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    disableForReducedMotion?: boolean;
  }
  export interface CreateOptions {
    resize?: boolean;
    useWorker?: boolean;
    disableForReducedMotion?: boolean;
  }
  export interface ConfettiCannon {
    (options?: ConfettiOptions): Promise<null> | null;
    reset(): void;
  }
  const confetti: {
    create(canvas: HTMLCanvasElement, options?: CreateOptions): ConfettiCannon;
  };
  export default confetti;
}
