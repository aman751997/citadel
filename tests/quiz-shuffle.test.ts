import test from 'node:test';
import assert from 'node:assert/strict';
import { permutation, answerPosition, quizOrders, hashSeed } from '../src/lib/quiz-shuffle.ts';

test('permutation is deterministic and a true permutation', () => {
  for (let n = 1; n <= 8; n++) {
    const p = permutation(n, 'seed-' + n);
    assert.deepEqual(p, permutation(n, 'seed-' + n));
    assert.deepEqual([...p].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
  }
  assert.notEqual(hashSeed('a'), hashSeed('b'));
});

test('answerPosition maps the author answer through the order', () => {
  for (let s = 0; s < 50; s++) {
    const order = permutation(4, 'x' + s);
    for (let answer = 0; answer < 4; answer++) assert.equal(order[answerPosition(order, answer)], answer);
  }
});

test('correct answer spreads roughly evenly over positions', () => {
  const N = 4000;
  const hits = [0, 0, 0, 0];
  for (let s = 0; s < N; s++) hits[answerPosition(permutation(4, 'quiz-' + s + '|0'), 1)]++;
  for (const h of hits) assert.ok(h > N / 4 * 0.85 && h < N / 4 * 1.15, `uneven: ${hits}`);
});

test('quizOrders: fixed questions and shuffle-less short ones keep author order', () => {
  const orders = quizOrders('q', [{ options: 4, answer: 3, fixed: true }, { options: 1, answer: 0 }]);
  assert.deepEqual(orders, [[0, 1, 2, 3], [0]]);
});

test('quizOrders never puts the answer at one position for every question (3+ questions, 3+ options)', () => {
  for (let s = 0; s < 3000; s++) {
    const specs = [1, 1, 1].map((answer) => ({ options: 3, answer }));
    const orders = quizOrders('seed' + s, specs);
    assert.ok(new Set(orders.map((o, i) => answerPosition(o, specs[i].answer))).size > 1, `seed ${s}`);
    orders.forEach((o) => assert.deepEqual([...o].sort(), [0, 1, 2]));
  }
});

test('quizOrders is stable across calls', () => {
  const specs = [{ options: 4, answer: 1 }, { options: 4, answer: 1 }, { options: 4, answer: 1 }];
  assert.deepEqual(quizOrders('p', specs), quizOrders('p', specs));
});
