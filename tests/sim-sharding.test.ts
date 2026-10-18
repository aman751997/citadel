import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, hashKeys, hash32, modRouter, ringRouter, initialSlotTable, rebalanceSlots, slotRouter, ownersOf, moveFraction, loads, imbalance, hotWeights } from '../src/lib/sim/sharding.ts';

const keys = hashKeys(5000);
const ids = (n: number) => Array.from({ length: n }, (_, i) => i);

test('hash32 is deterministic and spreads', () => {
  assert.equal(hash32('user:1'), hash32('user:1'));
  assert.notEqual(hash32('user:1'), hash32('user:2'));
});

test('mod-N reshuffles most keys when N changes', () => {
  const m = moveFraction(ownersOf(keys, modRouter(ids(4))), ownersOf(keys, modRouter(ids(5))));
  assert.ok(m > 0.7, `moved ${m}`);
});

test('ring moves roughly 1/N when a node is added', () => {
  const m = moveFraction(ownersOf(keys, ringRouter(ids(4), 100)), ownersOf(keys, ringRouter(ids(5), 100)));
  assert.ok(m > 0.1 && m < 0.32, `moved ${m}`);
});

test('ring only moves keys onto the new node', () => {
  const a = ownersOf(keys, ringRouter(ids(4), 50)), b = ownersOf(keys, ringRouter(ids(5), 50));
  a.forEach((o, i) => { if (o !== b[i]) assert.equal(b[i], 4); });
});

test('slots: every slot owned exactly once, balanced within one slot', () => {
  const t = initialSlotTable(ids(3));
  assert.equal(t.length, SLOTS);
  const counts = loads(t, ids(3));
  assert.equal(counts.reduce((a, b) => a + b, 0), SLOTS);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
});

test('slots: adding/removing a node moves about 1/N and keeps full coverage', () => {
  const t3 = initialSlotTable(ids(3));
  const t4 = rebalanceSlots(t3, ids(4));
  assert.ok(t4.every((o) => o >= 0 && o <= 3));
  const m = moveFraction(ownersOf(keys, slotRouter(t3)), ownersOf(keys, slotRouter(t4)));
  assert.ok(m > 0.18 && m < 0.32, `moved ${m}`);
  const t3b = rebalanceSlots(t4, ids(3));
  assert.ok(t3b.every((o) => o >= 0 && o <= 2));
  assert.deepEqual(loads(t3b, ids(3)).reduce((a, b) => a + b, 0), SLOTS);
  t4.forEach((o, i) => { if (o !== t3[i]) assert.equal(o, 3); }); // only the new node gains slots
});

test('more vnodes reduce imbalance', () => {
  const imb = (v: number) => imbalance(loads(ownersOf(keys, ringRouter(ids(6), v)), ids(6)));
  assert.ok(imb(200) < imb(1), `${imb(200)} vs ${imb(1)}`);
  assert.ok(imb(200) < 1.25);
});

test('hot key skews load onto one shard', () => {
  const w = hotWeights(keys.length, 0.5);
  const o = ownersOf(keys, slotRouter(initialSlotTable(ids(4))));
  const l = loads(o, ids(4), w);
  assert.ok(Math.abs(l.reduce((a, b) => a + b, 0) - 2 * (keys.length - 1)) < 1e-6);
  assert.ok(imbalance(l) > 1.5);
});
