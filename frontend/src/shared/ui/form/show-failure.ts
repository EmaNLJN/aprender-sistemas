import type { FieldError, FieldValues, GlobalError, Path, UseFormSetError } from 'react-hook-form';
import type { FailureDescription } from './describe-failure';

function typesOf(messages: readonly string[]): Record<string, string> {
  return Object.fromEntries(messages.map((message, index) => [`server${index}`, message]));
}

export function messagesOf(error: FieldError | GlobalError | undefined): string[] {
  if (error === undefined) return [];
  const types = 'types' in error ? error.types : undefined;
  const fromTypes = Object.values(types ?? {})
    .flat()
    .filter((value): value is string => typeof value === 'string');
  if (fromTypes.length > 0) return fromTypes;
  return error.message ? [error.message] : [];
}

export function showFailure<T extends FieldValues>(
  setError: UseFormSetError<T>,
  description: FailureDescription,
  visibleFields: readonly Path<T>[],
): void {
  let focused = false;
  for (const field of visibleFields) {
    const messages = description.fieldMessages[field] ?? [];
    if (messages.length === 0) continue;
    setError(field, { type: 'server', types: typesOf(messages) }, { shouldFocus: !focused });
    focused = true;
  }
  if (description.generalMessages.length > 0) {
    setError('root.serverError', { type: 'server', types: typesOf(description.generalMessages) });
  }
}
