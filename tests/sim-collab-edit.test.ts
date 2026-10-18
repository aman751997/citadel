import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, transform, apply, SCENARIOS, type Mode, type ScenarioId } from '../src/lib/sim/collab-edit.ts';

const last = (m: Mode, s: ScenarioId) => run(m, s).at(-1)!;

test('naive merge diverges when positions shift or tie', () => {
  assert.equal(last('naive', 'shift').verdict, 'diverged');
  assert.deepEqual([last('naive', 'shift').alice, last('naive', 'shift').bob], ['bcats', 'bcast']);
  assert.equal(last('naive', 'tie').verdict, 'diverged');
});
test('naive double delete converges on the wrong text', () => {
  const s = last('naive', 'double-delete');
  assert.equal(s.verdict, 'converged-wrong');
  assert.equal(s.alice, 'c');
});
test('OT and CRDT converge on a valid text in every scenario', () => {
  for (const m of ['ot', 'crdt'] as const)
    for (const id of Object.keys(SCENARIOS) as ScenarioId[]) {
      const s = last(m, id);
      assert.equal(s.verdict, 'converged', `${m}/${id}`);
      assert.ok(SCENARIOS[id].expected.includes(s.alice));
    }
});
test('OT transform: insert shifts right, double delete becomes no-op', () => {
  const { alice, bob } = SCENARIOS.shift;
  assert.equal(transform(alice, bob).pos, 4);
  assert.equal(transform(bob, alice).pos, 0);
  const dd = SCENARIOS['double-delete'];
  assert.equal(transform(dd.bob, dd.alice).kind, 'N');
  assert.equal(apply('ct', transform(dd.bob, dd.alice)), 'ct');
});
test('steps start from the base and have a verdict at the end', () => {
  const s = run('ot', 'shift');
  assert.equal(s[0].alice, 'cat');
  assert.equal(s.length, 6);
});
