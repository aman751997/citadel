import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stampede, missesFor, type Input } from '../src/lib/sim/stampede.ts';

const base: Input = { requests: 10000, hitRatio: 0, capacity: 1500, ttlSec: 60, jitterPct: 10, refillMs: 200, mitigation: 'none' };

test('no mitigation: every miss hits the DB and overloads it', () => {
  const r = stampede(base);
  assert.equal(r.queries, 10000);
  assert.ok(r.overloaded);
});
test('single-flight and SWR coalesce to one query', () => {
  for (const mitigation of ['lock', 'swr'] as const) {
    const r = stampede({ ...base, mitigation });
    assert.equal(r.queries, 1);
    assert.ok(!r.overloaded);
  }
  assert.equal(stampede({ ...base, mitigation: 'swr' }).waiting, 0);
  assert.equal(stampede({ ...base, mitigation: 'lock' }).waiting, 10000);
});
test('jitter spreads misses over the window', () => {
  assert.equal(stampede({ ...base, mitigation: 'jitter' }).queries, Math.ceil(10000 / 6));
});
test('100% hit ratio means no queries', () => {
  assert.equal(stampede({ ...base, hitRatio: 100 }).queries, 0);
  assert.equal(stampede({ ...base, hitRatio: 100, mitigation: 'lock' }).queries, 0);
});
test('90% to 99% is a 10x drop at 200,000 rps', () => {
  assert.equal(missesFor(200000, 90), 20000);
  assert.equal(missesFor(200000, 99), 2000);
});
