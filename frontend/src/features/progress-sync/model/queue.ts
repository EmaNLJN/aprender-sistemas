import { fieldKeyOf, type Operation, type OperationBody } from './operations';
import type { SyncResult } from './server-rows';
import { ENVELOPE_OVERHEAD_BYTES } from './sync-limits';

export interface Stamp {
  readonly id: string;
  readonly at: string;
}

function coalesced(waiting: Operation, body: OperationBody): OperationBody {
  if (waiting.type === 'exercise.assist' && body.type === 'exercise.assist') {
    const assisted = waiting.assisted === true || body.assisted === true;
    const solutionSeen = waiting.solutionSeen === true || body.solutionSeen === true;
    return {
      type: 'exercise.assist',
      exerciseId: body.exerciseId,
      ...(assisted ? { assisted: true as const } : {}),
      ...(solutionSeen ? { solutionSeen: true as const } : {}),
    };
  }
  if (waiting.type === 'exercise.hints' && body.type === 'exercise.hints') {
    return { ...body, revealed: Math.max(waiting.revealed, body.revealed) };
  }
  return body;
}

// A new change replaces the waiting operation of its field with a fresh id: another tab may be
// sending the old one, and reusing its id would answer uuid_reused (research-d1c.md, R5).
export function enqueue(
  queue: readonly Operation[],
  bodies: readonly OperationBody[],
  inFlight: ReadonlySet<string>,
  stamp: () => Stamp,
): Operation[] {
  const waiting = new Map<string, Operation>();
  for (const operation of queue) {
    if (!inFlight.has(operation.id)) waiting.set(fieldKeyOf(operation), operation);
  }
  const replaced = new Set<Operation>();
  const added: Operation[] = [];
  for (const body of bodies) {
    const key = fieldKeyOf(body);
    const previous = waiting.get(key);
    if (previous !== undefined) replaced.add(previous);
    const operation = {
      ...(previous === undefined ? body : coalesced(previous, body)),
      ...stamp(),
    } as Operation;
    waiting.set(key, operation);
    added.push(operation);
  }
  return [...queue, ...added].filter((operation) => !replaced.has(operation));
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function nextBatch(
  queue: readonly Operation[],
  inFlight: ReadonlySet<string>,
  limits: { readonly maxOperations: number; readonly maxBytes: number },
): Operation[] {
  const batch: Operation[] = [];
  let bytes = ENVELOPE_OVERHEAD_BYTES;
  for (const operation of queue) {
    if (inFlight.has(operation.id)) continue;
    const size = byteLength(JSON.stringify(operation)) + 1;
    if (batch.length === limits.maxOperations || bytes + size > limits.maxBytes) break;
    batch.push(operation);
    bytes += size;
  }
  return batch;
}

export interface Settlement {
  readonly remaining: Operation[];
  readonly rejected: number;
  readonly stale: Operation[];
}

const REJECTION_REASONS = new Set(['invalid', 'out_of_range', 'unknown_reference']);

function isRejection(result: SyncResult): boolean {
  if (result.status === 'rejected' || result.status === 'uuid_reused') return true;
  return result.status === 'duplicate' && REJECTION_REASONS.has(result.reason ?? '');
}

function isStale(result: SyncResult): boolean {
  return result.status === 'stale_content' || result.reason === 'stale_content';
}

export function settle(
  queue: readonly Operation[],
  batch: readonly Operation[],
  results: readonly SyncResult[],
): Settlement {
  const answered = new Map(results.map((result) => [result.id, result]));
  const done = new Set<string>();
  const stale: Operation[] = [];
  let rejected = 0;
  for (const operation of batch) {
    const result = answered.get(operation.id);
    if (result === undefined) continue;
    done.add(operation.id);
    if (isRejection(result)) rejected += 1;
    if (isStale(result)) stale.push(operation);
  }
  return {
    remaining: queue.filter((operation) => !done.has(operation.id)),
    rejected,
    stale,
  };
}
