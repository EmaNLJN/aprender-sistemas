import { isPlainObject } from './is-plain-object';

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// String.prototype.toWellFormed is ES2024 and the front's lib is ES2022: same result, by hand.
export function wellFormed(text: string): string {
  return text.replace(LONE_SURROGATE, '�');
}

export function wellFormedDeep(value: unknown): unknown {
  if (typeof value === 'string') return wellFormed(value);
  if (Array.isArray(value)) return value.map(wellFormedDeep);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, wellFormedDeep(item)]),
    );
  }
  return value;
}
