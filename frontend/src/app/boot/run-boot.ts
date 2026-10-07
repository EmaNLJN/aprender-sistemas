export interface BootStage {
  readonly name: string;
  run(): Promise<void>;
}

export async function runBoot(stages: readonly BootStage[]): Promise<void> {
  for (const stage of stages) await stage.run();
}
