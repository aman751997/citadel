import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, type Input } from '../src/lib/sim/loadbalancer.ts';

const base: Input = { algo: 'roundrobin', servers: 8, arrivalsPerTick: 56, capacityPerTick: 10, slowFactor: 1, staleTicks: 0, ticks: 50, seed: 7 };

test('round robin splits evenly and a healthy fleet at 70% keeps no backlog', () => {
  const r = simulate(base);
  assert.ok(r.sent.every((x) => x === 350));
  assert.equal(r.backlog, 0);
});
test('round robin keeps feeding a slow server its full share', () => {
  const r = simulate({ ...base, slowFactor: 0.2 });
  assert.equal(r.sent[0], 350);
  assert.ok(r.queue[0] > 200);
});
test('live least connections and two choices route around a slow server', () => {
  const rr = simulate({ ...base, slowFactor: 0.2 });
  for (const algo of ['leastconn', 'p2c'] as const) {
    const r = simulate({ ...base, algo, slowFactor: 0.2 });
    assert.ok(r.sent[0] < rr.sent[0] / 2);
    assert.ok(r.maxQueue < rr.maxQueue / 4);
  }
});
test('stale data: least connections herds, two choices degrades mildly', () => {
  const lc = simulate({ ...base, algo: 'leastconn', staleTicks: 5 });
  const p2 = simulate({ ...base, algo: 'p2c', staleTicks: 5 });
  assert.ok(lc.maxQueue > 100);
  assert.ok(p2.maxQueue < lc.maxQueue / 3);
});
test('same seed gives the same result', () => {
  assert.deepEqual(simulate({ ...base, algo: 'random' }), simulate({ ...base, algo: 'random' }));
});
