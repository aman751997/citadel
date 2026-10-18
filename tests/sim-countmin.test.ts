import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSteps, STREAM, HASHES, WIDTH } from '../src/lib/sim/countmin.ts';

const last = (rows: 1 | 2) => buildSteps(rows).at(-1)!;

test('two rows end with the counters from the lesson', () => {
  assert.deepEqual(last(2).table, [[4, 0, 2, 0, 1], [0, 1, 3, 3, 0]]);
});
test('one step per update plus one per distinct item plus the empty start', () => {
  assert.equal(buildSteps(2).length, 1 + STREAM.length + new Set(STREAM).size);
});
test('the minimum across two rows rescues cat, but eel stays overcounted', () => {
  const q = Object.fromEntries(buildSteps(2).filter((s) => s.query).map((s) => [s.query, s.estimate]));
  assert.deepEqual(q, { cat: 3, dog: 2, eel: 3, fox: 1 });
});
test('one row overcounts cat because eel shares its column', () => {
  const q = Object.fromEntries(buildSteps(1).filter((s) => s.query).map((s) => [s.query, s.estimate]));
  assert.equal(q.cat, 4);
});
test('never undercounts and every hash column is in range', () => {
  for (const rows of [1, 2] as const) {
    for (const s of buildSteps(rows).filter((x) => x.query)) {
      assert.ok(s.estimate! >= STREAM.filter((x) => x === s.query).length);
    }
  }
  assert.ok(Object.values(HASHES).flat().every((c) => c >= 0 && c < WIDTH));
});
