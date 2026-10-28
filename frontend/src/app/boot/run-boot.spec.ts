import { describe, expect, it } from 'vitest';
import { runBoot, type BootStage } from './run-boot';

function recordingStage(name: string, log: string[], run?: () => Promise<void>): BootStage {
  return {
    name,
    async run() {
      log.push(`${name}:start`);
      await run?.();
      log.push(`${name}:end`);
    },
  };
}

describe('runBoot', () => {
  it('runs the stages one after the other in order', async () => {
    const log: string[] = [];
    await runBoot([recordingStage('a', log), recordingStage('b', log), recordingStage('c', log)]);
    expect(log).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end']);
  });

  it('holds the next stages while one is still pending', async () => {
    const log: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const finished = runBoot([
      recordingStage('gate', log, () => gate),
      recordingStage('next', log),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(log).toEqual(['gate:start']);
    release();
    await finished;
    expect(log).toEqual(['gate:start', 'gate:end', 'next:start', 'next:end']);
  });
});
