export interface WorkshopRecordV1 {
  observed: string[];
  code: boolean;
  predicted: boolean;
  answer: number | null;
  steps: number[];
  note: string;
}

const EMPTY_RECORD: WorkshopRecordV1 = {
  observed: [],
  code: false,
  predicted: false,
  answer: null,
  steps: [],
  note: '',
};

export function systemsProgress(records: Record<string, Partial<WorkshopRecordV1>>): string {
  const full = Object.fromEntries(
    Object.entries(records).map(([key, record]) => [key, { ...EMPTY_RECORD, ...record }]),
  );
  return JSON.stringify({ version: 1, records: full });
}
