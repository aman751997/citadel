import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, trace, exploreAll, step, newMachine, isDeadlocked } from '../src/lib/sim/thread-timeline.ts';

const run = (id: string) => trace(PRESETS[id]);

test('lost-update: default interleaving loses an increment (x = 1, not 2)', () => {
  const r = run('lost-update');
  assert.equal(r.final.vars.x, 1);
  assert.equal(r.met, false);
});
test('lost-update-synchronized: B is blocked until A unlocks, final x = 2', () => {
  const r = run('lost-update-synchronized');
  assert.equal(r.final.vars.x, 2);
  assert.equal(r.met, true);
  const blocked = r.steps.findIndex((e) => e.kind === 'blocked');
  const unlockA = r.steps.findIndex((e) => e.tid === 0 && e.text.startsWith('unlock'));
  assert.ok(blocked >= 0 && blocked < unlockA);
  assert.equal(r.steps.filter((e) => e.kind === 'blocked').length, 1);
});
test('lost-update: some interleavings are fine, some lose; synchronized never loses', () => {
  const bad = exploreAll(PRESETS['lost-update']);
  assert.ok(bad.met > 0 && bad.unmet > 0);
  assert.equal(bad.total, 20);
  const good = exploreAll(PRESETS['lost-update-synchronized']);
  assert.equal(good.unmet, 0);
  assert.ok(good.met > 0);
});
test('atomic-cas: exactly one CAS fails and retries, final x = 2 in every interleaving', () => {
  const r = run('atomic-cas');
  assert.equal(r.final.vars.x, 2);
  assert.equal(r.steps.filter((e) => e.kind === 'cas-fail').length, 1);
  assert.equal(exploreAll(PRESETS['atomic-cas']).unmet, 0);
});
test('check-then-act: both threads put; synchronized variant puts once', () => {
  const bad = run('check-then-act');
  assert.equal(bad.final.writes.map, 2);
  assert.equal(bad.met, false);
  assert.ok(bad.steps.some((e) => e.note.includes('overwritten')));
  const good = run('check-then-act-synchronized');
  assert.equal(good.final.writes.map, 1);
  assert.equal(good.final.vars.map, 'conn-A');
  assert.equal(exploreAll(PRESETS['check-then-act-synchronized']).unmet, 0);
  assert.ok(exploreAll(PRESETS['check-then-act']).unmet > 0);
});
test('visibility: plain flag keeps a stale read; volatile sees the write', () => {
  const plain = run('visibility');
  assert.equal(plain.final.vars.flag, true);
  assert.equal(plain.final.threads[1].regs.r3, false);
  assert.ok(plain.steps.some((e) => e.kind === 'stale'));
  assert.equal(plain.met, false);
  const vol = run('visibility-volatile');
  assert.equal(vol.final.threads[1].regs.r3, true);
  assert.ok(vol.steps.every((e) => e.kind !== 'stale'));
  assert.equal(vol.met, true);
});
test('visibility: reader that starts after the write sees it even without volatile (permitted, not guaranteed)', () => {
  const r = trace(PRESETS.visibility, [0, 1, 1, 1]);
  assert.equal(r.final.threads[1].regs.r3, true);
});
test('deadlock: opposite lock order wedges both threads; same order finishes', () => {
  const bad = run('deadlock');
  assert.equal(bad.deadlock, true);
  assert.equal(bad.met, false);
  assert.deepEqual(bad.final.locks, { L1: 0, L2: 1 });
  const good = run('deadlock-ordered');
  assert.equal(good.deadlock, false);
  assert.equal(good.met, true);
  assert.equal(exploreAll(PRESETS['deadlock-ordered']).unmet, 0);
  assert.ok(exploreAll(PRESETS.deadlock).unmet > 0);
});
test('step on a finished thread returns null and a blocked lock does not advance pc', () => {
  const s = PRESETS['lost-update-synchronized'];
  const m = newMachine(s);
  step(s, m, 0);
  const e = step(s, m, 1)!;
  assert.equal(e.kind, 'blocked');
  assert.equal(m.threads[1].pc, 0);
  assert.equal(isDeadlocked(s, m), false);
  const d = newMachine(PRESETS.visibility);
  step(PRESETS.visibility, d, 0);
  assert.equal(step(PRESETS.visibility, d, 0), null);
});
