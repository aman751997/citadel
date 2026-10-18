import test from 'node:test';
import assert from 'node:assert/strict';
import { quizKey, chapterKey, scorePicks, bestOf, isPassed, normalizeQuizState, getJSON, setJSON, remove, keysWithPrefix } from '../src/lib/learn-store.ts';

test('keys', () => {
  assert.equal(quizKey('/citadel/sd/x/', 2), 'citadel-quiz-v1:/citadel/sd/x/:2');
  assert.equal(quizKey('/p', 'cache'), 'citadel-quiz-v1:/p:cache');
  assert.equal(chapterKey('/p', 'why'), 'citadel-chapter-v1:/p:why');
});

test('scorePicks', () => {
  assert.deepEqual(scorePicks([1, 0, 2], [1, 1, 2]), { score: 2, total: 3, done: true });
  assert.deepEqual(scorePicks([1, null, 2], [1, 1, 2]), { score: 2, total: 3, done: false });
  assert.deepEqual(scorePicks([], []), { score: 0, total: 0, done: false });
});

test('best and pass', () => {
  assert.equal(bestOf(null, 2), 2);
  assert.equal(bestOf(3, 2), 3);
  assert.equal(isPassed(null, 4), false);
  assert.equal(isPassed(3, 4), true);
  assert.equal(isPassed(2, 4), false);
  assert.equal(isPassed(1, 1), true);
});

test('normalizeQuizState rejects garbage', () => {
  assert.deepEqual(normalizeQuizState(null, 2, [3, 3]), { picks: [null, null], best: null });
  assert.deepEqual(normalizeQuizState({ picks: [2, 9, 1], best: 7 }, 2, [3, 3]), { picks: [2, null], best: null });
  assert.deepEqual(normalizeQuizState({ picks: ['a', 1], best: 1 }, 2, [3, 3]), { picks: [null, 1], best: 1 });
});

test('store falls back to memory without localStorage', () => {
  setJSON('citadel-test:a', { x: 1 });
  assert.deepEqual(getJSON('citadel-test:a'), { x: 1 });
  assert.deepEqual(keysWithPrefix('citadel-test:'), ['citadel-test:a']);
  remove('citadel-test:a');
  assert.equal(getJSON('citadel-test:a'), null);
});

test('store survives throwing localStorage', () => {
  const boom = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); }, get length(): number { throw new Error('x'); }, key() { throw new Error('x'); } };
  Object.defineProperty(globalThis, 'localStorage', { value: boom, configurable: true });
  try {
    setJSON('citadel-test:b', 5);
    assert.equal(getJSON('citadel-test:b'), 5);
    assert.deepEqual(keysWithPrefix('citadel-test:'), ['citadel-test:b']);
    remove('citadel-test:b');
    assert.equal(getJSON('citadel-test:b'), null);
  } finally { delete (globalThis as any).localStorage; }
});
