import test from 'node:test';
import assert from 'node:assert/strict';
import { Cache, buildSteps, parseSeq, PRESETS } from '../src/lib/sim/cache.ts';

const run = (policy: 'lru' | 'lfu', cap: number, seq: string) => {
  const c = new Cache(policy, cap);
  for (const k of parseSeq(seq)) c.access(k);
  return c;
};
const keysOf = (c: Cache) => c.contents().map((e) => e.key).sort().join('');

test('LRU evicts the least recently used', () => {
  const c = run('lru', 2, 'A B A C');
  assert.equal(keysOf(c), 'AC'); // B was LRU
});

test('LFU evicts lowest frequency, ties by least recently used', () => {
  const c = run('lfu', 2, 'A A B C');
  assert.equal(keysOf(c), 'AC'); // B (freq 1) evicted, A (freq 2) kept
  const t = run('lfu', 2, 'A B C');
  assert.equal(keysOf(t), 'BC'); // A and B tie at 1; A is older
});

test('one-time scan flushes LRU but not LFU', () => {
  const lru = run('lru', 3, 'A B C A B C A B C X Y Z');
  const lfu = run('lfu', 3, 'A B C A B C A B C X Y Z');
  assert.equal(keysOf(lru), 'XYZ');
  assert.equal(keysOf(lfu), 'BCZ'); // A paid for X's slot once; X, Y then churn through one slot
  lru.access('B'); lfu.access('B');
  assert.ok(lfu.hits > lru.hits);
});

test('LFU keeps a stale once-hot key; LRU drops it', () => {
  const seq = 'A A A A A A A B C D B C D B C D';
  const lru = run('lru', 3, seq), lfu = run('lfu', 3, seq);
  assert.ok(keysOf(lfu).includes('A'));
  assert.ok(!keysOf(lru).includes('A'));
  assert.ok(lru.hitRatio > lfu.hitRatio);
});

test('hit ratio counts and capacity respected', () => {
  const c = run('lru', 2, 'A A A B');
  assert.equal(c.hits, 2); assert.equal(c.misses, 2); assert.equal(c.hitRatio, 0.5);
  assert.ok(run('lfu', 3, 'A B C D E F').contents().length === 3);
});

test('presets behave as advertised at capacity 4', () => {
  const s = buildSteps(parseSeq(PRESETS.hotscan.seq), 4);
  const last = s[s.length - 1];
  assert.ok(last.lfu.hitRatio > last.lru.hitRatio);
  const loop = buildSteps(parseSeq(PRESETS.scan.seq), 4);
  assert.equal(loop[loop.length - 1].lru.hits, 0);
  const stale = buildSteps(parseSeq(PRESETS.stale.seq), 4);
  assert.ok(stale[stale.length - 1].lru.hitRatio > stale[stale.length - 1].lfu.hitRatio);
});

test('steps: step 0 empty, captions name the eviction', () => {
  const s = buildSteps(['A', 'B', 'C'], 2);
  assert.equal(s.length, 4);
  assert.match(s[3].caption, /evicted A/);
  assert.match(s[3].caption, /least recently used/);
  assert.match(s[3].caption, /lowest frequency/);
});
