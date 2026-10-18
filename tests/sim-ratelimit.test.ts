import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucket, FixedWindow, SlidingLog, RateSim, maxInSpan } from '../src/lib/sim/ratelimit.ts';

test('token bucket refills fractional tokens', () => {
  const b = new TokenBucket(2, 0.5);
  assert.ok(b.allow(0)); assert.ok(b.allow(0));
  assert.ok(!b.allow(0));
  assert.ok(!b.allow(1.9)); // 0.95 tokens
  assert.ok(Math.abs(b.level(1.9) - 0.95) < 1e-9);
  assert.ok(b.allow(2));    // 1.0 token
});

test('token bucket burst is capped at capacity, however long idle', () => {
  const b = new TokenBucket(5, 10);
  let ok = 0;
  for (let i = 0; i < 20; i++) if (b.allow(1000)) ok++;
  assert.equal(ok, 5);
});

test('fixed window allows 2x the limit across a window edge', () => {
  const f = new FixedWindow(5, 1);
  const times: number[] = [];
  for (let i = 0; i < 5; i++) if (f.allow(0.95)) times.push(0.95);
  for (let i = 0; i < 5; i++) if (f.allow(1.05)) times.push(1.05);
  assert.equal(times.length, 10);
  assert.equal(maxInSpan(times, 1), 10);
});

test('sliding log never exceeds limit in any window', () => {
  const s = new SlidingLog(5, 1);
  const times: number[] = [];
  for (let i = 0; i < 400; i++) { const t = i * 0.013; if (s.allow(t)) times.push(t); }
  assert.ok(maxInSpan(times, 1) <= 5);
  assert.ok(times.length > 20);
});

test('RateSim edge demo: fixed window double-bursts, sliding does not', () => {
  const sim = new RateSim({ capacity: 5, refill: 5, reqRate: 0, windowSec: 1 });
  sim.scheduleBurst(0.9, 5);
  sim.scheduleBurst(1.1, 5);
  sim.advance(2);
  assert.equal(maxInSpan(sim.allowedTimes('fixed'), 1), 10);
  assert.equal(maxInSpan(sim.allowedTimes('sliding'), 1), 5);
  assert.equal(sim.lanes.fixed.allowed, 10);
  assert.equal(sim.lanes.sliding.allowed, 5);
});

test('RateSim steady rate: requests are evenly spaced and deterministic', () => {
  const sim = new RateSim({ capacity: 3, refill: 1, reqRate: 4, windowSec: 1 });
  sim.advance(10);
  const l = sim.lanes.bucket;
  assert.equal(l.allowed + l.rejected, 40);
  assert.ok(l.allowed >= 12 && l.allowed <= 14, `${l.allowed}`); // 3 burst + ~10 refilled
});

test('RateSim burst uses current time', () => {
  const sim = new RateSim({ capacity: 4, refill: 1, reqRate: 0, windowSec: 1 });
  sim.advance(3);
  sim.burst(10);
  assert.equal(sim.lanes.bucket.allowed, 4);
  assert.equal(sim.lanes.bucket.rejected, 6);
});
