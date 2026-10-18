import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE, buildIndex, suggest, patchIndex, changedPrefixes, wrongPrefixes, prefixesOf, type Scores } from '../src/lib/sim/trie-autocomplete.ts';

const oracle = (s: Scores, prefix: string, k: number) =>
  Object.keys(s).filter((q) => q && q.startsWith(prefix))
    .sort((a, b) => (s[b] - s[a]) || a.localeCompare(b)).slice(0, k);

test('every prefix list matches filter-sort-take-k', () => {
  const idx = buildIndex(SAMPLE, 3);
  for (const q of Object.keys(SAMPLE)) for (const p of prefixesOf(q)) assert.deepEqual(idx.lists.get(p), oracle(SAMPLE, p, 3), p);
});

test('figure lists, k = 3', () => {
  const idx = buildIndex(SAMPLE, 3);
  assert.deepEqual(suggest(idx, '').top.map((t) => t.q), ['car', 'cat', 'dog']);
  assert.deepEqual(suggest(idx, 'ca').top.map((t) => t.q), ['car', 'cat', 'catalog']);
  assert.deepEqual(suggest(idx, 'cat').top.map((t) => t.q), ['cat', 'catalog']);
});

test('ties break alphabetically', () => {
  const idx = buildIndex({ bb: 5, ba: 5, bc: 5 }, 2);
  assert.deepEqual(idx.lists.get('b'), ['ba', 'bb']);
});

test('missing prefix: not found, path stops where the tree ends', () => {
  const r = suggest(buildIndex(SAMPLE, 3), 'cax');
  assert.equal(r.found, false);
  assert.deepEqual(r.top, []);
  assert.deepEqual(r.path, ['', 'c', 'ca']);
});

test('lookup work is the prefix length, scan work is the subtree size', () => {
  const r = suggest(buildIndex(SAMPLE, 3), 'c');
  assert.equal(r.hops, 1);
  assert.equal(r.scanned, 8);
});

test('a score going up patches in place exactly (random)', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const names = ['a', 'ab', 'abc', 'abd', 'b', 'ba', 'bab', 'bb', 'c', 'ca'];
  for (let t = 0; t < 300; t++) {
    const s: Scores = {};
    for (const n of names) s[n] = Math.floor(rnd() * 20) + 1;
    let idx = buildIndex(s, 3);
    for (let i = 0; i < 5; i++) {
      const q = names[Math.floor(rnd() * names.length)];
      idx = patchIndex(idx, q, idx.scores[q] + Math.floor(rnd() * 30) + 1);
      assert.deepEqual(wrongPrefixes(idx), []);
    }
  }
});

test('a score going down can leave a patched list wrong', () => {
  const idx = patchIndex(buildIndex(SAMPLE, 3), 'car', 100);
  assert.deepEqual(idx.lists.get('c'), ['cat', 'catalog', 'car']);
  assert.ok(wrongPrefixes(idx).includes('c'));
  assert.deepEqual(buildIndex(idx.scores, 3).lists.get('c'), ['cat', 'catalog', 'card']);
});

test('changedPrefixes lists exactly the prefixes whose list moved', () => {
  const a = buildIndex(SAMPLE, 3);
  const b = buildIndex({ ...SAMPLE, door: 1000 }, 3);
  assert.deepEqual(changedPrefixes(a, b), ['', 'd', 'do']);
});
