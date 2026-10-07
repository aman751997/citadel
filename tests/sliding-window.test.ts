import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type Mode, type WindowState } from '../src/lib/labs/sliding-window.ts';
import { practice, practiceInput, conceptIds, strategies, type ConceptId } from '../src/data/practice/sliding-window.ts';
import { hints } from '../src/data/sliding-window/hints.ts';
import * as traces from '../src/data/sliding-window/traces.ts';
import type { TraceStep } from '../src/lib/trace.ts';

const lesson = readFileSync(new URL('../src/dsa-lessons/sliding-window.mdx', import.meta.url), 'utf8');

// ---------- brute-force oracles: every start, every end, recomputed from scratch ----------
const sum = (a: number[], i: number, j: number) => a.slice(i, j + 1).reduce((x, y) => x + y, 0);
const windows = (n: number) => { const out: [number, number][] = []; for (let i = 0; i < n; i++) for (let j = i; j < n; j++) out.push([i, j]); return out; };
const bruteFixedBest = (a: number[], k: number) => { let best: number | null = null; for (let i = 0; i + k <= a.length; i++) { const s = sum(a, i, i + k - 1); best = best === null ? s : Math.max(best, s); } return best; };
const bruteLongestZeros = (a: number[], k: number) => Math.max(0, ...windows(a.length).filter(([i, j]) => a.slice(i, j + 1).filter(v => v === 0).length <= k).map(([i, j]) => j - i + 1));
const bruteShortest = (a: number[], target: number) => { const lens = windows(a.length).filter(([i, j]) => sum(a, i, j) >= target).map(([i, j]) => j - i + 1); return lens.length ? Math.min(...lens) : 0; };
const sorted = (s: string) => [...s].sort().join('');
const bruteAnagram = (p: string, s: string) => { for (let i = 0; i + p.length <= s.length; i++) if (sorted(s.slice(i, i + p.length)) === sorted(p)) return true; return false; };
const bruteNoRepeat = (s: string) => Math.max(0, ...windows(s.length).filter(([i, j]) => new Set(s.slice(i, j + 1)).size === j - i + 1).map(([i, j]) => j - i + 1));
const bruteDistinctWindows = (a: number[]) => windows(a.length).map(([i, j]) => ({ i, j, kinds: new Set(a.slice(i, j + 1)).size }));
const bruteRepaint = (s: string, k: number) => Math.max(0, ...windows(s.length).filter(([i, j]) => { const w = s.slice(i, j + 1); const counts = [...new Set(w)].map(c => w.split(c).length - 1); return w.length - Math.max(...counts) <= k; }).map(([i, j]) => j - i + 1));
const covers = (w: string, t: string) => [...new Set(t)].every(c => w.split(c).length - 1 >= t.split(c).length - 1);
const bruteCover = (s: string, t: string) => { let best: string | null = null; for (const [i, j] of windows(s.length)) { const w = s.slice(i, j + 1); if (covers(w, t) && (best === null || w.length < best.length)) best = w; } return best ?? ''; };
const bruteMaxima = (a: number[], k: number) => Array.from({ length: a.length - k + 1 }, (_, i) => Math.max(...a.slice(i, i + k)));
const bruteProfit = (p: number[]) => { let best = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) best = Math.max(best, p[j] - p[i]); return best; };
const bruteDeleteOne = (a: number[]) => { let best = 0; for (let d = 0; d < a.length; d++) { let run = 0; a.forEach((v, i) => { if (i === d) return; run = v === 1 ? run + 1 : 0; best = Math.max(best, run); }); } return best; };
const bruteProduct = (a: number[], k: number) => windows(a.length).filter(([i, j]) => a.slice(i, j + 1).reduce((x, y) => x * y, 1) < k).length;
const bruteCards = (a: number[], k: number) => { let best = -Infinity; for (let left = 0; left <= k; left++) best = Math.max(best, sum(a, 0, left - 1) + sum(a, a.length - (k - left), a.length - 1)); return best; };
const bruteShortestAny = (a: number[], k: number) => { const lens = windows(a.length).filter(([i, j]) => sum(a, i, j) >= k).map(([i, j]) => j - i + 1); return lens.length ? Math.min(...lens) : -1; };
const bruteSumEquals = (a: number[], k: number) => windows(a.length).filter(([i, j]) => sum(a, i, j) === k).length;
// Simulations of the lesson's loops, used to confirm numbers the traces quote mid-run.
function zerosRun(a: number[], k: number, untilRight: number) {
  let left = 0, zeros = 0, best = 0;
  for (let r = 0; r <= untilRight; r++) { if (a[r] === 0) zeros++; while (zeros > k) { if (a[left] === 0) zeros--; left++; } if (r < untilRight) best = Math.max(best, r - left + 1); }
  return { left, zeros, bestBefore: best };
}
function tollRecords(a: number[], target: number) {
  const records: number[][] = []; let left = 0, s = 0;
  for (let r = 0; r < a.length; r++) { s += a[r]; const here: number[] = []; while (s >= target) { here.push(r - left + 1); s -= a[left++]; } records.push(here); }
  return records;
}
const unguardedJump = (s: string) => { const last = new Map<string, number>(); let left = 0, best = 0; [...s].forEach((c, r) => { if (last.has(c)) left = last.get(c)! + 1; last.set(c, r); best = Math.max(best, r - left + 1); }); return best; };

// ---------- traces ----------
const allTraces = Object.entries(traces).filter(([, v]) => Array.isArray(v) && (v as unknown[]).length && typeof (v as any[])[0]?.question === 'string') as [string, TraceStep[]][];

test('every trace step has a valid answer, at least two choices, and feedback on every choice', () => {
  assert.ok(allTraces.length >= 11);
  for (const [name, steps] of allTraces) for (const [i, s] of steps.entries()) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `${name}[${i}] answer index`);
    assert.ok(s.choices.length >= 2, `${name}[${i}] choices`);
    for (const c of s.choices) assert.ok(c.label.trim() && c.feedback.trim().length > 20, `${name}[${i}] feedback`);
    for (const r of s.rows) for (const cell of r.cells) assert.equal(typeof cell.value, 'string');
  }
});
test('every trace used in the lesson is exported, and every export is used', () => {
  for (const [name] of allTraces) assert.match(lesson, new RegExp(`steps=\\{${name}\\}`), `${name} used`);
});

const right = (step: { choices: { label: string; feedback: string }[]; answer: number }) => step.choices[step.answer];
const text = (step: { question: string; choices: { label: string; feedback: string }[] }) => [step.question, ...step.choices.flatMap(c => [c.label, c.feedback])].join(' ');

test('fixed pane trace numbers agree with recomputation', () => {
  const { a, k } = traces.fixedInput;
  const first = sum(a, 0, k - 1), second = sum(a, 1, k);
  assert.equal(first, 2); assert.equal(second, 51); assert.equal(second, first + a[k] - a[0]);
  assert.equal(bruteFixedBest(a, k), 51); assert.equal(51 / 4, 12.75); assert.equal(Math.trunc(51 / 4), 12);
  assert.match(right(traces.fixedPane[0]).label, /^51/); assert.match(right(traces.fixedPane[1]).label, /12\.75/);
  const neg = traces.negativeInput; assert.deepEqual([sum(neg.a, 0, 1), sum(neg.a, 1, 2)], [-4, -3]); assert.equal(bruteFixedBest(neg.a, neg.k)! / neg.k, -1.5);
  assert.match(right(traces.fixedPane[2]).feedback, /−1\.5/);
});
test('anagram trace numbers agree with recomputation', () => {
  const { s1, s2 } = traces.anagramInput;
  assert.equal(bruteAnagram(s1, s2), true); assert.equal(s2.slice(3, 5), 'ba'); assert.equal(s2[4 - s1.length], 'd');
  assert.match(right(traces.anagram[1]).label, /\+a, −d/); assert.match(right(traces.anagram[2]).label, /true/);
});
test('dark lamps trace numbers agree with recomputation', () => {
  const { a, k } = traces.lampsInput;
  assert.equal(a.slice(0, 6).filter(v => v === 0).length, 3);
  const after = zerosRun(a, k, 5);
  assert.equal(after.left, 4); assert.equal(after.zeros, 2); assert.equal(after.bestBefore, 5);
  assert.equal(bruteLongestZeros(a, k), 6); assert.deepEqual([a[5], a[10]], [0, 0]);
  assert.match(right(traces.darkLamps[2]).label, /Tail at 4; log length 2, best stays 5/);
});
test('no-repeat trace numbers agree with recomputation', () => {
  assert.equal(bruteNoRepeat('abba'), 2); assert.equal(unguardedJump('abba'), 3); assert.equal(bruteNoRepeat('pwwkew'), 3);
  assert.match(text(traces.noRepeats[1]), /records 3/); assert.match(text(traces.noRepeats[1]), /is 2/);
});
test('baskets, repaint, toll traces agree with recomputation', () => {
  const fruit = traces.fruitInput;
  assert.equal(Math.max(...bruteDistinctWindows(fruit).filter(w => w.kinds <= 2).map(w => w.j - w.i + 1)), 4);
  assert.equal(right(traces.baskets[2]).label, '4');
  const { s, k } = traces.repaintInput; assert.equal(bruteRepaint(s, k), 4); assert.equal(bruteRepaint('AABA', 1), 4);
  const { a, target } = traces.tollInput;
  assert.equal(sum(a, 0, 3), 8); assert.equal(sum(a, 1, 3), 6); assert.equal(bruteShortest(a, target), 2);
  const records = tollRecords(a, target);
  assert.deepEqual(records[3], [4]); assert.deepEqual(records[4], [4, 3]); assert.deepEqual(records[5], [3, 2]); assert.equal(sum(a, 3, 4), 6);
  assert.match(right(traces.toll[2]).label, /lengths 4 and 3, ending at \[2, 4\]/);
});
test('shopping list, mast and stock traces agree with recomputation', () => {
  const { s, t } = traces.shoppingInput;
  assert.equal(bruteCover(s, t), 'BANC'); assert.equal(s.indexOf('BANC'), 9);
  let firstEnd = 0; while (!covers(s.slice(0, firstEnd + 1), t)) firstEnd++;
  assert.equal(firstEnd, 5); assert.equal(s.slice(0, 6), 'ADOBEC'); assert.equal(s.indexOf('A', 1), 10);
  assert.equal(bruteCover('aa', 'ab'), '');
  const { a, k } = traces.mastInput;
  assert.deepEqual(bruteMaxima(a, k), [3, 3, 5, 5, 6, 7]); assert.deepEqual(bruteMaxima([5, 1, 1], 2), [5, 1]);
  assert.equal(bruteProfit(traces.stockInput), 5); assert.equal(Math.max(...traces.stockInput) - Math.min(...traces.stockInput), 6);
  assert.match(right(traces.buyLow[1]).label, /^5/);
});
test('mixed review numbers agree with recomputation', () => {
  // record-after-the-loop bug on [2, 3, 1, 2, 4, 3], target 7
  const bug = (a: number[], target: number) => { let left = 0, s = 0, best = Infinity; a.forEach((v, r) => { s += v; while (s >= target) s -= a[left++]; best = Math.min(best, r - left + 1); }); return best; };
  assert.equal(bug([2, 3, 1, 2, 4, 3], 7), 1);
  assert.equal(bruteDeleteOne([1, 1, 1]), 2);
  assert.equal(bruteSumEquals([1, -1, 1], 1), 3);
  const atMost = (a: number[], k: number) => bruteDistinctWindows(a).filter(w => w.kinds <= k).length;
  assert.equal(atMost([1, 2, 1, 2, 3], 2), 12); assert.equal(atMost([1, 2, 1, 2, 3], 1), 5);
  assert.equal(bruteDistinctWindows([1, 2, 1, 2, 3]).filter(w => w.kinds === 2).length, 7);
  assert.ok(traces.mixedReview.length >= 7, 'old quiz (4) + new recognition questions');
});

// ---------- hint ladders ----------
test('every HintLadder in the lesson has three hints', () => {
  const used = [...lesson.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 15);
  for (const key of used) { assert.ok(hints[key], `hints.${key}`); assert.equal(hints[key].length, 3); hints[key].forEach(h => assert.ok(h.length > 10)); }
  assert.deepEqual(new Set(used), new Set(Object.keys(hints)));
});

// ---------- lab ----------
const modes = Object.keys(lab.modes) as Mode[];
const oracle = (mode: Mode, s: Pick<WindowState, 'a' | 'k' | 'target'>) =>
  mode === 'fixed' ? bruteFixedBest(s.a, s.k) : mode === 'longest' ? bruteLongestZeros(s.a, s.k) : (bruteShortest(s.a, s.target) || null);

test('all playground cases terminate with the brute-force answer; wrong moves never change the board', () => {
  assert.deepEqual(modes, ['fixed', 'longest', 'shortest']);
  for (const mode of modes) for (let v = 0; v < lab.modes[mode].cases; v++) {
    const start = lab.create(mode, v);
    const { final, wrongMovesChangedBoard } = solveLab(lab, start);
    assert.equal(final.done, true, `${mode} ${v} terminates`);
    assert.equal(wrongMovesChangedBoard, false, `${mode} ${v} wrong moves`);
    assert.equal(final.best, oracle(mode, start), `${mode} ${v} answer`);
    assert.ok(final.message.startsWith('Done.'));
  }
  assert.ok(modes.every(m => lab.modes[m].cases >= 3 && lab.modes[m].cases <= 4));
});
test('playground agrees with brute force on 150 random inputs per mode', () => {
  let seed = 11; const rand = (max: number) => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % max; };
  for (let trial = 0; trial < 150; trial++) for (const mode of modes) {
    const n = rand(9);
    const a = Array.from({ length: n }, () => mode === 'longest' ? rand(2) : mode === 'shortest' ? 1 + rand(6) : rand(15) - 7);
    const input = { a, k: mode === 'fixed' ? 1 + rand(4) : rand(3), target: 1 + rand(14) };
    const start = { ...lab.create(mode), ...fromInput(mode, input) } as WindowState;
    const { final, wrongMovesChangedBoard } = solveLab(lab, start);
    assert.equal(final.done, true); assert.equal(wrongMovesChangedBoard, false, JSON.stringify(input));
    assert.equal(final.best, oracle(mode, start), `${mode} ${JSON.stringify(input)}`);
  }
});
test('shrink-before-grow slides a fixed pane too, and still reaches the right answer', () => {
  for (let v = 0; v < lab.modes.fixed.cases; v++) {
    let state = lab.create('fixed', v), steps = 0;
    while (!state.done && steps++ < 200) { const s = lab.move(state, 'shrink'); state = s.accepted ? s.state : lab.move(state, lab.expected(state)).state; }
    assert.equal(state.best, oracle('fixed', state));
  }
});
test('a misplaced record is rejected with the numbers on the board', () => {
  // Longest: Head takes [1, 0, 1, 1, 0] with k = 1; recording before the repair is refused.
  let s = lab.create('longest', 0);
  for (const act of ['grow', 'record', 'grow', 'record', 'grow', 'record', 'grow', 'record', 'grow']) s = lab.move(s, act).state;
  assert.equal(s.zeros, 2);
  const early = lab.move(s, 'record'); assert.equal(early.accepted, false); assert.match(early.state.message, /2 zeros/); assert.match(early.state.message, /shrink first/);
  const shrinkLegal = lab.move(lab.create('longest', 0), 'shrink'); assert.equal(shrinkLegal.accepted, false);
  // Shortest: after [2, 3, 1, 2] qualifies, shrinking before recording and recording after the loop are both refused.
  let t = lab.create('shortest', 0);
  for (let i = 0; i < 4; i++) t = lab.move(t, 'grow').state;
  assert.equal(t.sum, 8);
  const skip = lab.move(t, 'shrink'); assert.equal(skip.accepted, false); assert.match(skip.state.message, /isn’t logged/);
  t = lab.move(lab.move(t, 'record').state, 'shrink').state;
  assert.equal(t.sum, 6);
  const late = lab.move(t, 'record'); assert.equal(late.accepted, false); assert.match(late.state.message, /record-after-the-loop/);
  // Fixed: a partial pane can't be recorded.
  const partial = lab.move(lab.move(lab.create('fixed', 0), 'grow').state, 'record'); assert.equal(partial.accepted, false); assert.match(partial.state.message, /1 of 4/);
});
test('lab states are plain JSON and every state has exactly one expected action among the buttons', () => {
  for (const mode of modes) for (let v = 0; v < lab.modes[mode].cases; v++) {
    let state = lab.create(mode, v);
    while (!state.done) {
      assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
      const exp = lab.expected(state);
      assert.ok(lab.modes[mode].actions.some(x => x.action === exp));
      assert.ok(lab.view(state).length === 2 && lab.describe(state).length > 10);
      state = lab.move(state, exp).state;
    }
  }
});

// ---------- practice ----------
const format = (answer: unknown) => typeof answer === 'boolean' ? (answer ? 'yes' : 'no') : typeof answer === 'string' ? answer : JSON.stringify(answer);

function expectedAnswer(id: ConceptId, v: number) {
  const { a, k, s, t } = practiceInput(id, v);
  switch (id) {
    case 'fixed-sum': return bruteFixedBest(a, k);
    case 'anagram': return bruteAnagram(t, s);
    case 'flips': return bruteLongestZeros(a, k);
    case 'no-repeat': return bruteNoRepeat(s);
    case 'two-kinds': return Math.max(...bruteDistinctWindows(a).filter(w => w.kinds <= 2).map(w => w.j - w.i + 1));
    case 'repaint': return bruteRepaint(s, k);
    case 'toll': return bruteShortest(a, k);
    case 'cover': return bruteCover(s, t);
    case 'window-max': return bruteMaxima(a, k);
    case 'stock': return bruteProfit(a);
    case 'exactly-k': return bruteDistinctWindows(a).filter(w => w.kinds === k).length;
    case 'delete-one': return bruteDeleteOne(a);
    case 'product': return bruteProduct(a, k);
    case 'cards': return bruteCards(a, k);
    case 'negatives': return bruteShortestAny(a, k);
    case 'sum-equals': return bruteSumEquals(a, k);
  }
}

test('practice set shape: storage key, at least 10 concepts, a decoy, valid strategies and lesson anchors', () => {
  assert.equal(practice.storageKey, 'citadel-sliding-window-review-v1');
  assert.ok(conceptIds.length >= 10);
  assert.ok('other' in strategies);
  assert.ok(conceptIds.some(id => practice.challengeFor(id).strategy === 'other'));
  for (const id of conceptIds) {
    const c = practice.challengeFor(id);
    assert.ok(c.strategy in strategies, `${id} strategy`);
    assert.match(lesson, new RegExp(`id="${c.section}"`), `${id} section anchor ${c.section}`);
    assert.equal(c.id, id);
  }
  // Every chapter and side quest is covered by some concept.
  const sections = new Set(conceptIds.map(id => practice.challengeFor(id).section));
  for (const anchor of ['fixed-pane', 'anagram-flags', 'dark-lamps', 'no-repeats', 'two-baskets', 'k-repaints', 'toll', 'shopping-list', 'tallest-mast', 'buy-low', 'exactly-k', 'delete-one', 'product-below', 'cards', 'negatives', 'choose-the-tool'])
    assert.ok(sections.has(anchor), `practice covers ${anchor}`);
});
test('generated practice answers match independent brute-force oracles (21 variants each)', () => {
  for (const id of conceptIds) for (let v = 0; v <= 20; v++) {
    const c = practice.challengeFor(id, v);
    const expected = expectedAnswer(id, v);
    assert.deepEqual(c.answer, expected, `${id} variant ${v}`);
    assert.equal(answerMatches(c, format(expected)), true, `${id} ${v} formatted answer accepted`);
    assert.equal(answerMatches(c, 'not an answer'), false);
    // The prompt shows the actual input.
    const input = practiceInput(id, v);
    if (input.a.length) assert.ok(c.prompt.includes(`[${input.a.join(', ')}]`), `${id} ${v} prompt shows array`);
    if (input.s) assert.ok(c.prompt.includes(`“${input.s}”`), `${id} ${v} prompt shows string`);
    if (input.t) assert.ok(c.prompt.includes(`“${input.t}”`));
    // Prompts never name the pattern or the technique.
    assert.doesNotMatch(c.prompt, /window|sliding|pointer|deque|queue|prefix|hash|two-pass|monoton/i, `${id} prompt names a technique`);
    assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3); assert.ok(c.explanation.length > 20);
  }
});
test('practice inputs change from one attempt to the next, and cover answers are unique', () => {
  for (const id of conceptIds) for (let v = 0; v < 20; v++)
    assert.notEqual(practice.challengeFor(id, v).prompt, practice.challengeFor(id, v + 1).prompt, `${id} ${v}→${v + 1}`);
  for (let v = 0; v <= 20; v++) {
    const { s, t } = practiceInput('cover', v);
    const best = bruteCover(s, t); assert.ok(best.length > 0);
    const starts = windows(s.length).filter(([i, j]) => j - i + 1 === best.length && covers(s.slice(i, j + 1), t));
    assert.equal(starts.length, 1, `cover ${s} / ${t} unique`);
  }
});
