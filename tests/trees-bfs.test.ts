import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type BfsState, type Mode } from '../src/lib/labs/trees-bfs.ts';
import { figures, levelOrder, zigzag, rightView, mixedReview } from '../src/data/trees-bfs/traces.ts';
import { hints } from '../src/data/trees-bfs/hints.ts';
import { practice, conceptIds } from '../src/data/practice/trees-bfs.ts';

// ---------- independent helpers: linked nodes + depth-first oracles (no queue walks) ----------
type Tree = (number | null)[];
interface T { val: number; left: T | null; right: T | null; idx: number }
// Parse LeetCode's array form into linked nodes, remembering each node's array position.
function parse(a: Tree): T | null {
  if (!a.length || a[0] === null) return null;
  const root: T = { val: a[0], left: null, right: null, idx: 0 };
  const parents: T[] = [root];
  let k = 1, p = 0;
  while (k < a.length) {
    const parent = parents[p++];
    for (const side of ['left', 'right'] as const) {
      if (k < a.length && a[k] !== null) { const child: T = { val: a[k] as number, left: null, right: null, idx: k }; parent[side] = child; parents.push(child); }
      k++;
    }
  }
  return root;
}
const rows = (t: T | null) => { const out: number[][] = []; const go = (n: T | null, d: number) => { if (!n) return; (out[d] ??= []).push(n.val); go(n.left, d + 1); go(n.right, d + 1); }; go(t, 0); return out; };
const nodeRows = (t: T | null) => { const out: T[][] = []; const go = (n: T | null, d: number) => { if (!n) return; (out[d] ??= []).push(n); go(n.left, d + 1); go(n.right, d + 1); }; go(t, 0); return out; };
const nodes = (t: T | null): T[] => (t ? [t, ...nodes(t.left), ...nodes(t.right)] : []);
const depthOf = (t: T | null, target: T, d = 0): number => { if (!t) return -1; if (t === target) return d; const l = depthOf(t.left, target, d + 1); return l >= 0 ? l : depthOf(t.right, target, d + 1); };
const parentOf = (t: T | null, target: T): T | null => { if (!t) return null; if (t.left === target || t.right === target) return t; return parentOf(t.left, target) ?? parentOf(t.right, target); };
const pathTo = (t: T | null, target: T): T[] | null => { if (!t) return null; if (t === target) return [t]; const p = pathTo(t.left, target) ?? pathTo(t.right, target); return p ? [t, ...p] : null; };
const dist = (root: T, a: T, b: T) => { const pa = pathTo(root, a)!, pb = pathTo(root, b)!; let c = 0; while (c < pa.length && c < pb.length && pa[c] === pb[c]) c++; return pa.length - c + pb.length - c; };
const zig = (t: T | null) => rows(t).map((r, d) => (d % 2 ? [...r].reverse() : r));
const lastOfRows = (t: T | null) => rows(t).map(r => r[r.length - 1]);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;
const cellValues = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);

test('every trace step has a valid answer and real feedback for each choice', () => {
  for (const steps of [levelOrder, zigzag, rightView, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('chapter 1 trace numbers match an independent walk', () => {
  const t = parse([3, 9, 20, null, null, 15, 7]);
  assert.deepEqual(rows(t), [[3], [9, 20], [15, 7]]);
  assert.deepEqual(levelOrder[0].rows.slice(0, 3).map(cellValues), [['3'], ['9', '20'], ['15', '7']]);
  assert.match(correct(levelOrder[0]), /size = 2/);
  // live bound: simulate the buggy loop literally
  const line: T[] = [t!]; const out: number[][] = [];
  while (line.length) { const row: number[] = []; for (let i = 0; i < line.length; i++) { const n = line.shift()!; row.push(n.val); if (n.left) line.push(n.left); if (n.right) line.push(n.right); } out.push(row); }
  assert.deepEqual(out, [[3, 9], [20, 15], [7]]);
  assert.match(correct(levelOrder[1]), /\[3, 9\]/);
  assert.match(levelOrder[1].choices[1].feedback, /\[\[3, 9\], \[20, 15\], \[7\]\]/);
  assert.equal(rows(t).length, 3);
  assert.match(correct(levelOrder[2]), /3 rows/);
});

test('chapter 2 trace numbers: slot formula and the flipped-line bug', () => {
  const t = parse([1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(zig(t), [[1], [3, 2], [4, 5, 6, 7]]);
  assert.equal(2 - 1 - 0, 1);                      // size − 1 − i for 2 at i = 0
  assert.match(correct(zigzag[1]), /= 1/);
  // the friend's way: before a reversed floor, children join right-first
  let line: T[] = [t!]; const got: number[][] = []; let floor = 0;
  while (line.length) {
    const next: T[] = [], row: number[] = [], reversedNext = (floor + 1) % 2 === 1;
    for (const n of line) { row.push(n.val); const kids = reversedNext ? [n.right, n.left] : [n.left, n.right]; for (const k of kids) if (k) next.push(k); }
    got.push(row); line = next; floor++;
  }
  assert.deepEqual(got, [[1], [3, 2], [6, 7, 4, 5]]);
  assert.deepEqual(zigzag[2].rows[1].cells.map(c => Number(c.value)), [6, 7, 4, 5]);
  assert.match(correct(zigzag[2]), /\[6, 7, 4, 5\]/);
});

test('chapter 3 trace numbers: right view and the right-first climb', () => {
  const t = parse([1, 2, 3, 4]);
  assert.deepEqual(lastOfRows(t), [1, 3, 4]);
  assert.match(correct(rightView[0]), /^3/);
  assert.match(correct(rightView[1]), /\[1, 3, 4\]/);
  // right-first climb: when 2 is reached at depth 1, the view already has 2 entries
  const view: number[] = []; let sizeWhenTwo = -1;
  const climb = (n: T | null, d: number) => { if (!n) return; if (n.val === 2) sizeWhenTwo = view.length; if (d === view.length) view.push(n.val); climb(n.right, d + 1); climb(n.left, d + 1); };
  climb(t, 0);
  assert.equal(sizeWhenTwo, 2); assert.deepEqual(view, [1, 3, 4]);
  assert.match(correct(rightView[2]), /view.size\(\) is 2/);
  // the east-stairs-only bug
  const east: number[] = []; for (let n = t; n; n = n.right) east.push(n.val);
  assert.deepEqual(east, [1, 3]);
  const lc = parse([1, 2, 3, null, 5, null, 4]);
  const eastLc: number[] = []; for (let n = lc; n; n = n.right) eastLc.push(n.val);
  assert.deepEqual(eastLc, lastOfRows(lc));             // passes the LC example by luck
  assert.deepEqual(rows(t).map(r => r[0]), [1, 2, 4]);   // the left view named in the lesson
});

test('mixed review numbers', () => {
  assert.equal(2 ** 20 - 1, 1_048_575); assert.equal(2 ** 19, 524_288);
  assert.match(correct(mixedReview[3]), /524,288/);
  const w = parse([1, 3, 2, 5, 3, null, 9]);
  assert.equal(rows(w)[2].length, 3);
  assert.match(mixedReview[6].choices[0].feedback, /3 nodes but spans 4/);
  assert.match(mixedReview[4].choices[1].feedback, /\[6, 7, 4, 5\]/);
  // perfect tree 1..7: 5's right neighbour is 6, a cousin
  const s = nodeRows(parse([1, 2, 3, 4, 5, 6, 7]));
  assert.deepEqual(s[2].map(n => n.val), [4, 5, 6, 7]);
  assert.match(mixedReview[7].choices[2].feedback, /5 → 6/);
});

test('every figure annotates real nodes, and its numbers are right', () => {
  for (const [name, f] of Object.entries(figures)) {
    const real = new Set(nodes(parse(f.values)).map(n => n.idx));
    const holes = 'holes' in f && f.holes;
    for (const key of [...Object.keys((f as any).tones ?? {}), ...Object.keys((f as any).labels ?? {})].map(Number))
      assert.ok(real.has(key) || (holes && f.values[key] === null), `${name}: annotation on missing node ${key}`);
    for (const [a, b] of ((f as any).arrows ?? []) as [number, number][]) assert.ok(real.has(a) && real.has(b), `${name}: arrow`);
  }
  assert.deepEqual(rows(parse(figures.prologue.values)), [[3], [9, 20], [15, 7]]);
  const complete = rows(parse(figures.complete.values));
  assert.equal(complete.length, 4); assert.equal(complete[3].length, 8); assert.equal((15 + 1) / 2, 8);
  assert.deepEqual(Object.keys(figures.complete.tones).map(Number), nodeRows(parse(figures.complete.values))[3].map(n => n.idx));
  for (const key of ['rightView', 'leftHidden'] as const) {
    const t = parse(figures[key].values);
    const seen = Object.keys(figures[key].labels).map(Number).sort((a, b) => a - b);
    assert.deepEqual(nodeRows(t).map(r => r[r.length - 1].idx).sort((a, b) => a - b), seen);
    assert.deepEqual(lastOfRows(t), [1, 3, 4]);
  }
  { // min depth: the first leaf is node at array index 1, on floor 1; 3 waits, 4/5/6 are never sent for
    const t = parse(figures.minDepth.values)!;
    const leaves = nodes(t).filter(n => !n.left && !n.right);
    assert.deepEqual(leaves.map(n => depthOf(t, n)).sort(), [1, 4]);
    assert.equal(nodes(t).find(n => n.idx === 1)!.left, null);
    assert.deepEqual(nodes(t).filter(n => depthOf(t, n) >= 2).map(n => n.idx).sort((a, b) => a - b), [6, 8, 10]);
  }
  { // width: renumbered seats per floor, and width 4 on floor 2
    const t = parse(figures.width.values)!;
    const seat = new Map<number, number>();
    const go = (n: T | null, s: number) => { if (!n) return; seat.set(n.idx, s); go(n.left, 2 * s + 1); go(n.right, 2 * s + 2); };
    go(t, 0);
    const renumbered = new Map<number, number>();
    for (const row of nodeRows(t)) { const first = seat.get(row[0].idx)!; for (const n of row) renumbered.set(n.idx, seat.get(n.idx)! - first); }
    for (const [idx, label] of Object.entries(figures.width.labels)) {
      if (renumbered.has(Number(idx))) assert.equal(label, `seat ${renumbered.get(Number(idx))}`);
    }
    assert.equal(figures.width.labels[5], 'seat 2');                 // the dark frame between seats 1 and 3
    assert.equal(renumbered.get(6)! - renumbered.get(3)! + 1, 4);
  }
  { // next ropes join same-floor neighbours only
    const t = parse(figures.next.values)!;
    const all = nodes(t), byIdx = (i: number) => all.find(n => n.idx === i)!;
    for (const [a, b] of figures.next.arrows) {
      const row = nodeRows(t)[depthOf(t, byIdx(a))];
      assert.equal(row[row.indexOf(byIdx(a)) + 1], byIdx(b));
    }
    assert.equal(figures.next.arrows.length, nodeRows(t).reduce((s, r) => s + r.length - 1, 0));
  }
  { // cousins: x and y on the same floor with different parents
    const t = parse(figures.cousins.values)!;
    const all = nodes(t), x = all.find(n => n.idx === 4)!, y = all.find(n => n.idx === 6)!;
    assert.deepEqual([x.val, y.val], [4, 5]);
    assert.equal(depthOf(t, x), depthOf(t, y));
    assert.notEqual(parentOf(t, x), parentOf(t, y));
    assert.deepEqual([parentOf(t, x)!.idx, parentOf(t, y)!.idx], [1, 2]);
  }
  { // distance K: ring labels are true distances from the target
    const t = parse(figures.distanceK.values)!;
    const all = nodes(t), target = all.find(n => n.idx === 1)!;
    for (const [idx, label] of Object.entries(figures.distanceK.labels)) {
      const n = all.find(m => m.idx === Number(idx))!;
      assert.equal(label === 'target' ? 0 : Number(label.split(' ')[1]), dist(t, target, n));
    }
    assert.deepEqual(all.filter(n => dist(t, target, n) === 2).map(n => n.val).sort((a, b) => a - b), [1, 4, 7]);
    assert.deepEqual(figures.distanceK.arrows, [[1, 0]]);          // the stair up from 5 to 3
  }
});

test('every hint ladder referenced by the lesson exists with three hints, and none is unused', () => {
  const mdx = readFileSync(new URL('../src/dsa-lessons/trees-bfs.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 9);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
  for (const id of ['prologue', 'playground', 'level-order', 'zigzag', 'right-side-view', 'average-levels', 'min-depth', 'max-width', 'next-pointers', 'cousins', 'distance-k', 'choose-the-tool', 'wider-family', 'exit-ticket', 'mixed-recall', 'independent-practice', 'cheat-sheet', 'beyond'])
    assert.match(mdx, new RegExp(`<h2 id="${id}">`), id);
  for (const c of practice.conceptIds) assert.match(mdx, new RegExp(`id="${practice.challengeFor(c, 0).section}"`), `practice section for ${c}`);
});

// ---------- lab ----------
const oracle = (s: BfsState, f: BfsState) => {
  const t = parse(s.tree);
  if (s.mode === 'levels') assert.deepEqual(f.rows, rows(t));
  else if (s.mode === 'zigzag') assert.deepEqual(f.rows, zig(t));
  else assert.deepEqual(f.view, lastOfRows(t));
  assert.equal(f.queue.length, 0);
  assert.equal(f.called.length, nodes(t).length);
};
function runCase(start: BfsState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 2000);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracle(start, final);
  return final;
}

test('every lab mode and case terminates with the right result; wrong moves never change the board', () => {
  for (const [mode, info] of Object.entries(lab.modes)) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    const sizes = new Set<number>();
    for (let v = 0; v < info.cases; v++) { const s = lab.create(mode, v); sizes.add(s.nodes.length); runCase(s); }
    assert.ok(sizes.has(0), `${mode}: needs an empty-tree case`);
  }
});

test('every rejected move on every reachable state explains itself with real numbers', () => {
  for (const [mode, info] of Object.entries(lab.modes)) for (let v = 0; v < info.cases; v++) {
    let state = lab.create(mode, v);
    for (let guard = 0; guard < 500; guard++) {
      for (const { action } of info.actions) {
        const result = lab.move(state, action);
        if (!result.accepted && !state.done) {
          assert.doesNotMatch(result.state.message, /undefined|NaN|\[object|\[null|null\]|, null/, `${mode} case ${v}: ${action}`);
          assert.ok(result.state.message.length > 15, `${mode} case ${v}: ${action} needs an explanation`);
        }
      }
      for (const text of [lab.describe(state), ...lab.view(state).flatMap(r => [r.name, ...r.cells.map(c => `${c.value} ${c.label ?? ''}`)])])
        assert.doesNotMatch(text, /undefined|NaN/, `${mode} case ${v}`);
      if (state.done) break;
      state = lab.move(state, lab.expected(state)).state;
      assert.doesNotMatch(state.message, /undefined|NaN/);
    }
    assert.equal(state.done, true);
  }
});

function randomTree(rnd: (n: number) => number): Tree {
  const n = rnd(12);
  if (!n) return [];
  // grow a random shape, then write it in LeetCode array form
  type B = { val: number; left: B | null; right: B | null };
  const all: B[] = [{ val: rnd(10), left: null, right: null }];
  while (all.length < n) {
    const p = all[rnd(all.length)], side = rnd(2) ? 'left' : 'right';
    if (!p[side]) { const c = { val: rnd(10), left: null, right: null }; p[side] = c; all.push(c); }
  }
  const out: Tree = [], line: (B | null)[] = [all[0]];
  while (line.length) { const b = line.shift()!; if (b) { out.push(b.val); line.push(b.left, b.right); } else out.push(null); }
  while (out[out.length - 1] === null) out.pop();
  return out;
}

test('lab agrees with depth-first oracles on random trees (incl. empty, single, skewed)', () => {
  let seed = 41; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const fixed: Tree[] = [[], [5], [1, 2, null, 3, null, 4], [1, null, 2, null, 3, null, 4], [1, 2, 3, null, 4, 5]];
  const trees = [...fixed, ...Array.from({ length: 150 }, () => randomTree(rnd))];
  for (const tree of trees) {
    assert.deepEqual(rows(parse(tree)).flat().length, tree.filter(x => x !== null).length);
    for (const mode of ['levels', 'zigzag', 'right'] as Mode[]) runCase({ ...lab.create(mode), ...fromInput(mode, tree) });
  }
});

test('the lab catches the classic bugs with the board numbers', () => {
  // live bound: after floor 0 is fully called, calling again would pull 9 into floor 0
  let s = lab.create('levels', 0);                    // [3, 9, 20, null, null, 15, 7]
  s = lab.move(s, 'snapshot').state;
  s = lab.move(s, 'poll').state;
  const extra = lab.move(s, 'poll');
  assert.equal(extra.accepted, false);
  assert.match(extra.state.message, /front of the line is 9, from floor 1/);
  assert.match(lab.move(s, 'snapshot').state.message, /Close its row/);
  // calling before counting
  assert.match(lab.move(lab.create('levels', 0), 'poll').state.message, /Let Size count first/);
  // empty tree: the ArrayDeque null guard
  assert.match(lab.move(lab.create('levels', 3), 'snapshot').state.message, /NullPointerException/);
  // zigzag: wrong direction and flipping the line
  let z = lab.move(lab.create('zigzag', 0), 'snapshot').state;  // [1..7]
  z = lab.move(z, 'append').state; z = lab.move(z, 'close').state; z = lab.move(z, 'snapshot').state;
  assert.match(lab.move(z, 'append').state.message, /slot 2 − 1 − 0 = 1/);
  assert.match(lab.move(z, 'flip').state.message, /scrambled/);
  z = lab.move(z, 'prepend').state;
  assert.deepEqual(z.row, [null, 2]);
  // right view: recording too early names who stands east
  let r = lab.move(lab.create('right', 1), 'snapshot').state;   // [1, 2, 3, 4]
  r = lab.move(r, 'record').state;
  r = lab.move(r, 'snapshot').state;
  assert.match(lab.move(r, 'record').state.message, /1 keeper\(s\) still stand east of her \(\[3\]\)/);
  r = lab.move(r, 'skip').state;
  assert.match(lab.move(r, 'skip').state.message, /3 is the last of 2 on floor 1/);
});

// ---------- practice ----------
function treeIn(prompt: string): Tree {
  const m = prompt.match(/The tree \[([^\]]*)\]/);
  assert.ok(m, prompt);
  return m![1].trim() === '' ? [] : m![1].split(',').map(x => (x.trim() === 'null' ? null : Number(x)));
}
function num(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); }

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-trees-bfs-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok(Object.keys(practice.strategies).includes('other'));
  const strategiesUsed = new Set<string>();
  for (const id of practice.conceptIds) {
    const prompts = new Set<string>();
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      prompts.add(c.prompt);
      strategiesUsed.add(c.strategy);
      assert.ok(c.strategy in practice.strategies, `${id}: unknown strategy`);
      assert.doesNotMatch(c.prompt, /BFS|DFS|breadth|depth-first|level[- ]?order|queue|recurs|snapshot|stack/i, `${id}: the prompt must not name the technique`);
      assert.match(c.prompt, /LeetCode’s array form/);
      const tree = treeIn(c.prompt), t = parse(tree)!, all = nodes(t);
      const byVal = (v: number) => all.find(n => n.val === v)!;
      let expected: number | number[] | boolean;
      switch (id) {
        case 'level-row': expected = rows(t)[num(c.prompt, /at depth (\d+)/)]; break;
        case 'zigzag-row': expected = zig(t)[num(c.prompt, /row at depth (\d+)/)]; break;
        case 'right-view': expected = lastOfRows(t); break;
        case 'level-sum': { const sums = rows(t).map(r => r.reduce((a, b) => a + b, 0)); expected = sums.findIndex(s => s === Math.max(...sums)); break; }
        case 'min-depth': { const paths: number[] = []; const go = (n: T, d: number) => { if (!n.left && !n.right) paths.push(d); if (n.left) go(n.left, d + 1); if (n.right) go(n.right, d + 1); }; go(t, 1); expected = Math.min(...paths); break; }
        case 'max-width': {
          const span = new Map<number, [bigint, bigint]>();
          const go = (n: T | null, d: number, p: bigint) => { if (!n) return; const s = span.get(d) ?? [p, p]; span.set(d, [s[0] < p ? s[0] : p, s[1] > p ? s[1] : p]); go(n.left, d + 1, 2n * p + 1n); go(n.right, d + 1, 2n * p + 2n); };
          go(t, 0, 0n);
          expected = Math.max(...[...span.values()].map(([lo, hi]) => Number(hi - lo + 1n)));
          break;
        }
        case 'next-pointer': {
          const n = byVal(num(c.prompt, /node with value (\d+)/)), row = nodeRows(t)[depthOf(t, n)], at = row.indexOf(n);
          expected = at + 1 < row.length ? row[at + 1].val : -1;
          assert.ok(all.every(m => m.val > 0) && new Set(all.map(m => m.val)).size === all.length);
          break;
        }
        case 'cousins': {
          const m = c.prompt.match(/Are (\d+) and (\d+) cousins/)!, x = byVal(Number(m[1])), y = byVal(Number(m[2]));
          expected = depthOf(t, x) === depthOf(t, y) && parentOf(t, x) !== parentOf(t, y);
          assert.equal(new Set(all.map(n => n.val)).size, all.length);
          break;
        }
        case 'distance-k': {
          const k = num(c.prompt, /exactly (\d+) edges/), target = byVal(num(c.prompt, /node with value (\d+)/));
          expected = all.filter(n => dist(t, target, n) === k).map(n => n.val).sort((a, b) => a - b);
          break;
        }
        case 'bottom-left': { const r = rows(t); expected = r[r.length - 1][0]; break; }
        case 'diameter': {
          let best = 0;
          for (const a of all) for (const b of all) best = Math.max(best, dist(t, a, b));
          expected = best;
          break;
        }
        case 'path-sum': {
          const target = num(c.prompt, /add up to exactly (-?\d+)\?/);
          const sums: number[] = []; const go = (n: T, s: number) => { s += n.val; if (!n.left && !n.right) sums.push(s); if (n.left) go(n.left, s); if (n.right) go(n.right, s); };
          go(t, 0);
          expected = sums.includes(target);
          break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 6);
});
