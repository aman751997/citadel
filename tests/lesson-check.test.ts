import test from 'node:test';
import assert from 'node:assert/strict';
import { getList, hasItem, toggleItem } from '../src/lib/lesson-check.ts';

test('toggle adds, dedupes, removes', () => {
  assert.deepEqual(getList('k1'), []);
  toggleItem('k1', 'a', true);
  toggleItem('k1', 'a', true);
  toggleItem('k1', 'b', true);
  assert.deepEqual(getList('k1'), ['a', 'b']);
  assert.ok(hasItem('k1', 'a'));
  toggleItem('k1', 'a', false);
  assert.deepEqual(getList('k1'), ['b']);
  assert.ok(!hasItem('k1', 'a'));
});

test('works with no localStorage (memory fallback) and ignores junk', () => {
  toggleItem('k2', 'x', true);
  assert.deepEqual(getList('k2'), ['x']);
});

test('non-array stored value yields empty list', () => {
  const store = new Map<string, string>([['k3', '{"a":1}']]);
  (globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) };
  assert.deepEqual(getList('k3'), []);
  toggleItem('k3', 'z', true);
  assert.equal(store.get('k3'), '["z"]');
  delete (globalThis as any).localStorage;
});
