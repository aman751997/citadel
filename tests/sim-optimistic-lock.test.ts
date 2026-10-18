import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSteps } from '../src/lib/sim/optimistic-lock.ts';

const last = (m: Parameters<typeof buildSteps>[0]) => { const s = buildSteps(m); return s[s.length - 1]; };

test('no version check loses an update', () => {
  assert.equal(last('none').row.value, 9);
});
test('optimistic and pessimistic end at the correct value', () => {
  assert.equal(last('optimistic').row.value, 8);
  assert.equal(last('pessimistic').row.value, 8);
});
test('optimistic: exactly one first-attempt winner, loser affects 0 rows, retry wins', () => {
  const upd = buildSteps('optimistic').filter((s) => s.op === 'update');
  assert.deepEqual(upd.filter((s) => s.attempt === 1).map((s) => s.rows), [1, 0]);
  assert.deepEqual(upd.filter((s) => s.attempt === 2).map((s) => s.rows), [1]);
  assert.equal(last('optimistic').row.version, 3);
});
test('pessimistic: B blocked until A commits, never two lock holders', () => {
  const s = buildSteps('pessimistic');
  const blocked = s.findIndex((x) => x.op === 'blocked');
  const commitA = s.findIndex((x) => x.op === 'commit' && x.actor === 'A');
  assert.ok(blocked < commitA);
  assert.equal(s[blocked].local.B, null);
  assert.equal(s[commitA].lockedBy, null);
});
test('custom initial value', () => {
  assert.equal(buildSteps('optimistic', { value: 50, version: 7 }).at(-1)!.row.value, 48);
});
