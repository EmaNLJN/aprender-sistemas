export interface LabTestOutcome {
  id: string;
  passed: boolean;
}

export interface LabResultV1 {
  code: string;
  success: boolean;
  stdout: string;
  stderr: string;
  transportError: boolean;
  tests: LabTestOutcome[];
  time: number;
  customTest: string;
  customPassed: boolean;
  attemptId?: number;
}
