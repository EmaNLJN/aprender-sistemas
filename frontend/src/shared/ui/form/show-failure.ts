import type { FieldError, FieldValues, GlobalError, Path, UseFormSetError } from 'react-hook-form';
import type { FailureDescription } from './describe-failure';

export const messagesOf: (error: FieldError | GlobalError | undefined) => string[] = () => {
  throw new Error('not implemented');
};

export const showFailure: <T extends FieldValues>(
  setError: UseFormSetError<T>,
  description: FailureDescription,
  visibleFields: readonly Path<T>[],
) => void = () => {
  throw new Error('not implemented');
};
