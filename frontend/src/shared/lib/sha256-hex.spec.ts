import { describe, expect, it } from 'vitest';
import curriculum from '../../../../build/curriculum.json';
import meta from '../../../../build/curriculum.meta.json';
import { sha256Hex } from './sha256-hex';

interface StarterRecord {
  readonly id: string;
  readonly starter: string;
}

function exercisesOf(catalogs: Record<string, Record<string, StarterRecord[]>>): StarterRecord[] {
  return Object.values(catalogs).flatMap((group) => Object.values(group).flat());
}

describe('sha256Hex', () => {
  it('gives the NIST vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes the UTF-8 bytes across block boundaries', () => {
    expect(sha256Hex('a'.repeat(55))).toBe(
      '9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318',
    );
    expect(sha256Hex('a'.repeat(56))).toBe(
      'b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a',
    );
    expect(sha256Hex('ñ')).toBe('024bb90888ca89a15a19e9bdd8c712bfb070465fce1ef25e43c170ea44fc5e5f');
  });

  it('gives the starterHash that tools/content computes with Node for every exercise', () => {
    const catalogs = curriculum as unknown as Record<string, Record<string, StarterRecord[]>>;
    const exercises = exercisesOf({
      lab: catalogs.lab,
      quests: catalogs.quests,
      cores: catalogs.cores,
    });
    const hashes = meta.exercises as Record<string, { starterHash: string }>;
    expect(exercises).toHaveLength(Object.keys(hashes).length);
    for (const exercise of exercises) {
      expect(sha256Hex(JSON.stringify(exercise.starter)), exercise.id).toBe(
        hashes[exercise.id].starterHash,
      );
    }
  });
});
