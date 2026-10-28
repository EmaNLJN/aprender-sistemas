import { Factory } from 'fishery';

export interface ApiErrorBody {
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

export const apiErrorBodyFactory = Factory.define<ApiErrorBody>(() => ({
  message: 'Hay datos que corregir.',
  code: 'validation_failed',
}));
