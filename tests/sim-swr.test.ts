import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, stats, zones, type Config } from '../src/lib/sim/swr.ts';

const c: Config = { softMs: 5000, hardMs: 15000, originMs: 800, swr: true };
const every = (ms: number, to: number) => Array.from({ length: Math.floor(to / ms) }, (_, i) => (i + 1) * ms);

test('one background refresh per soft-expiry window', () => {
  const run = simulate(every(100, 10700), c);
  const stale = run.events.filter((e) => e.kind === 'stale');
  assert.ok(stale.length > 5);
  assert.equal(stale.filter((e) => e.triggered).length, 1);
  assert.equal(run.refreshes.length, 1);
  assert.ok(stale.every((e) => e.latency === 1));
});
test('after the refresh lands the entry is fresh again', () => {
  const run = simulate([5100, 6200], c);
  assert.deepEqual(run.events.map((e) => e.kind), ['stale', 'fresh']);
});
test('no request after hard expiry is served stale', () => {
  const run = simulate([16000, 16100, 40000], c);
  assert.ok(run.events.every((e) => e.kind !== 'stale'));
  assert.equal(run.events[0].kind, 'miss');
  assert.equal(run.events[0].latency, 800);
  assert.equal(run.events[1].latency, 700);
});
test('single TTL: every request after expiry blocks on origin', () => {
  const run = simulate([5100, 5200, 5300, 7000], { ...c, swr: false });
  assert.deepEqual(run.events.map((e) => e.kind), ['miss', 'miss', 'miss', 'fresh']);
  assert.ok(run.events.slice(0, 3).every((e) => e.latency === 800));
  assert.equal(run.refreshes.length, 3);
});
test('swr has lower worst latency than single TTL on the same traffic', () => {
  const t = every(200, 20000);
  const a = stats(simulate(t, c));
  const b = stats(simulate(t, { ...c, swr: false }));
  assert.ok(a.worst <= b.worst);
  assert.ok(a.originCalls < b.originCalls);
});
test('zones tile fresh, stale, expired', () => {
  const run = simulate([], c);
  const z = zones(run, c, 20000);
  assert.deepEqual(z.map((x) => x.state), ['fresh', 'stale', 'miss']);
  assert.equal(z[2].to, 20000);
});
