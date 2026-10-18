import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newTimer, startTimer, pauseTimer, elapsedMs, remainingMs, formatClock, scaleBudgets, phaseClock,
  nextHintCount, canReveal, scoreChecklist, normalizeSession, newSession,
} from '../src/lib/mock-interview.ts';

test('timer uses wall-clock deltas, so a sleeping tab does not lose time', () => {
  let t = startTimer(newTimer(), 1000);
  assert.equal(elapsedMs(t, 1000 + 5 * 60000), 5 * 60000);
  t = pauseTimer(t, 1000 + 60000);
  assert.equal(elapsedMs(t, 999999999), 60000);
  t = startTimer(t, 5000000);
  assert.equal(elapsedMs(t, 5000000 + 30000), 90000);
});
test('start twice and pause while paused are no-ops; clock going backwards never goes negative', () => {
  const t = startTimer(newTimer(), 100);
  assert.equal(startTimer(t, 999), t);
  assert.equal(pauseTimer(newTimer(), 5).elapsedMs, 0);
  assert.equal(elapsedMs(t, 50), 0);
});
test('remaining clamps at zero', () => {
  const t = startTimer(newTimer(), 0);
  assert.equal(remainingMs(t, 61 * 60000, 60), 0);
  assert.equal(remainingMs(t, 10 * 60000, 60), 50 * 60000);
});
test('formatClock rounds up and switches to hours', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(1), '0:01');
  assert.equal(formatClock(59 * 60000 + 59000), '59:59');
  assert.equal(formatClock(3600000), '1:00:00');
  assert.equal(formatClock(90 * 60000), '1:30:00');
});
test('scaleBudgets stretches phases to the session length', () => {
  assert.deepEqual(scaleBudgets([5, 10, 15], 60), [10, 20, 30]);
  assert.deepEqual(scaleBudgets([0, 0], 10), [5, 5]);
});
test('phaseClock reports overrun', () => {
  assert.deepEqual(phaseClock(5, 4 * 60000), { over: false, ms: 60000 });
  assert.deepEqual(phaseClock(5, 6 * 60000), { over: true, ms: 60000 });
});
test('hints are progressive and capped by what is available', () => {
  assert.equal(nextHintCount(0, 3), 1);
  assert.equal(nextHintCount(2, 3), 3);
  assert.equal(nextHintCount(3, 3), 3);
  assert.equal(nextHintCount(0, 0), 0);
});
test('reveal is locked until notes typed or attempt confirmed', () => {
  assert.equal(canReveal('', false), false);
  assert.equal(canReveal('   \n', false), false);
  assert.equal(canReveal('Order, Customer', false), true);
  assert.equal(canReveal('', true), true);
});
test('checklist score', () => {
  assert.deepEqual(scoreChecklist([true, false, true, true]), { done: 3, total: 4, pct: 75 });
  assert.deepEqual(scoreChecklist([]), { done: 0, total: 0, pct: 0 });
});
test('normalizeSession repairs corrupt storage', () => {
  const s = normalizeSession({ phase: 99, notes: ['x', 5], hints: [2, 9], timer: { elapsedMs: -1, startedAt: 'now' }, checks: [true] }, 3, 2);
  assert.equal(s.phase, 0);
  assert.deepEqual(s.notes, ['x', '', '']);
  assert.deepEqual(s.hints, [2, 0, 0]);
  assert.deepEqual(s.timer, { elapsedMs: 0, startedAt: null });
  assert.deepEqual(s.checks, [true, false]);
  assert.deepEqual(normalizeSession(null, 2, 1), newSession(2, 1));
});
