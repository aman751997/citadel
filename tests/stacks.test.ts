import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { brackets, minStack, rpn, dailyTemperatures, circular, fleet, histogram, mixedReview } from '../src/data/stacks/traces.ts';
import { hints } from '../src/data/stacks/hints.ts';
import { lab, fromInput, type StackLabState } from '../src/lib/labs/stacks.ts';
import { solveLab } from '../src/lib/lab.ts';
import { practice, strategies } from '../src/data/practice/stacks.ts';
import { answerMatches } from '../src/lib/review.ts';
import type { TraceStep } from '../src/lib/trace.ts';

const lesson = readFileSync(new URL('../src/dsa-lessons/stacks.mdx', import.meta.url), 'utf8');

// ---------- Independent brute-force oracles (no stacks unless the oracle IS the definition) ----------
const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
function validBrackets(s: string): boolean {
  const open: string[] = [];
  for (const c of s) {
    if ('([{'.includes(c)) open.push(c);
    else if (open.pop() !== PAIRS[c]) return false;
  }
  return open.length === 0;
}
const nextWarmerBrute = (a: number[]) => a.map((v, i) => { for (let j = i + 1; j < a.length; j++) if (a[j] > v) return j - i; return 0; });
const circularBrute = (a: number[]) => a.map((v, i) => { for (let k = 1; k < a.length; k++) { const w = a[(i + k) % a.length]; if (w > v) return w; } return -1; });
function largestRectBrute(h: number[]) {
  let best = 0;
  for (let i = 0; i < h.length; i++) { let low = Infinity; for (let j = i; j < h.length; j++) { low = Math.min(low, h[j]); best = Math.max(best, low * (j - i + 1)); } }
  return best;
}
const spanBrute = (p: number[]) => p.map((v, i) => { let s = 0; for (let j = i; j >= 0 && p[j] <= v; j--) s++; return s; });
function asteroidBrute(rocks: number[]) {
  const a = [...rocks];
  for (;;) {
    const i = a.findIndex((v, k) => k + 1 < a.length && v > 0 && a[k + 1] < 0);
    if (i < 0) return a;
    const l = a[i], r = -a[i + 1];
    if (l === r) a.splice(i, 2); else if (l > r) a.splice(i + 1, 1); else a.splice(i, 1);
  }
}
function removeDigitsBrute(num: string, k: number) {
  let best: string | null = null;
  const n = num.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    let bits = 0; for (let b = 0; b < n; b++) if (mask >> b & 1) bits++;
    if (bits !== k) continue;
    let s = ''; for (let b = 0; b < n; b++) if (!(mask >> b & 1)) s += num[b];
    s = s.replace(/^0+/, '') || '0';
    if (best === null || s.length < best.length || (s.length === best.length && s < best)) best = s;
  }
  return best!;
}
const trapBrute = (h: number[]) => h.reduce((sum, v, i) => sum + Math.min(Math.max(...h.slice(0, i + 1)), Math.max(...h.slice(i))) - v, 0);
function sumMinsBrute(a: number[]) { let s = 0; for (let i = 0; i < a.length; i++) { let m = Infinity; for (let j = i; j < a.length; j++) { m = Math.min(m, a[j]); s += m; } } return s; }
// Evaluate postfix by recursive descent from the right end (no explicit stack).
function evalPostfix(tokens: string[]): number {
  let pos = tokens.length - 1;
  const go = (): number => {
    const t = tokens[pos--];
    if (['+', '-', '*', '/'].includes(t)) { const right = go(), left = go(); return t === '+' ? left + right : t === '-' ? left - right : t === '*' ? left * right : Math.trunc(left / right); }
    return Number(t);
  };
  const value = go();
  assert.equal(pos, -1, 'postfix must consume every token');
  return value;
}
// Fleets: each car's real arrival = slowest solo time among itself and every car ahead; count distinct arrivals.
function fleetBrute(target: number, pos: number[], speed: number[]) {
  const arrivals: [number, number][] = pos.map((p, i) => {
    let best: [number, number] = [target - p, speed[i]];
    pos.forEach((q, j) => { if (q > p && (target - q) * best[1] > best[0] * speed[j]) best = [target - q, speed[j]]; });
    return best;
  });
  const distinct: [number, number][] = [];
  for (const t of arrivals) if (!distinct.some(d => d[0] * t[1] === t[0] * d[1])) distinct.push(t);
  return distinct.length;
}

// ---------- Traces ----------
const allTraces: Record<string, TraceStep[]> = { brackets, minStack, rpn, dailyTemperatures, circular, fleet, histogram, mixedReview };
test('every trace step has a valid answer and feedback for every choice', () => {
  for (const [name, steps] of Object.entries(allTraces)) {
    assert.ok(steps.length >= 2, `${name} needs at least two decisions`);
    for (const s of steps) {
      assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `${name}: answer index`);
      assert.ok(s.choices.length >= 2);
      assert.equal(new Set(s.choices.map(c => c.label)).size, s.choices.length, `${name}: duplicate labels`);
      for (const c of s.choices) assert.ok(c.feedback.length > 20, `${name}: feedback for "${c.label}"`);
    }
  }
  assert.ok(mixedReview.length >= 8, 'mixed recall folds in the old quiz plus recognition questions');
});
test('trace components used by the lesson are all exported and referenced', () => {
  for (const name of Object.keys(allTraces)) assert.match(lesson, new RegExp(`steps=\\{${name}\\}`), `${name} is rendered in the lesson`);
});
test('bracket trace matches an independent checker', () => {
  assert.equal(validBrackets('([)]'), false);
  assert.match(brackets[0].choices[brackets[0].answer].label, /^Reject/);
  assert.equal(validBrackets('(('), false);
  assert.match(brackets[1].choices[brackets[1].answer].label, /^false/);
  assert.equal(validBrackets(')('), false);
  assert.match(brackets[2].choices[brackets[2].answer].label, /^Return false/);
});
test('min stack trace numbers match a list model', () => {
  const mins = (vals: number[]) => vals.map((_, i) => Math.min(...vals.slice(0, i + 1)));
  assert.deepEqual(minStack[0].rows[1].cells.map(c => Number(c.value)), mins([5, 3, 7]));
  assert.match(minStack[0].choices[minStack[0].answer].label, /^2,/);
  assert.deepEqual(minStack[1].rows[1].cells.map(c => Number(c.value)), mins([5, 3, 7, 2]));
  assert.equal(Math.min(5, 3), Number(minStack[1].choices[minStack[1].answer].label));
});
test('RPN trace arithmetic', () => {
  assert.equal(Math.trunc(13 / 5), 2);
  assert.match(rpn[0].choices[rpn[0].answer].label, /^2,/);
  assert.equal(evalPostfix(['4', '13', '5', '/', '+']), 6);
  assert.equal(rpn[1].choices[rpn[1].answer].label, '6');
  assert.equal(evalPostfix(['-7', '2', '/']), -3);
  assert.match(rpn[2].choices[rpn[2].answer].label, /^-3,/);
  assert.equal(evalPostfix(['5', '3', '-']), 2);
  assert.match(mixedReview[5].choices[mixedReview[5].answer].label, /= 2$/);
});
test('daily temperatures trace matches brute force and the stack state it shows', () => {
  const t = [73, 74, 75, 71, 69, 72, 76, 73];
  const ans = nextWarmerBrute(t);
  assert.deepEqual(ans, [1, 1, 4, 2, 1, 1, 0, 0]);
  assert.deepEqual(dailyTemperatures[0].rows[0].cells.map(c => Number(c.value)), t);
  // Waiting days just before day 5 arrives: indexes whose answer lies at or after day 5.
  const waiting = t.map((_, i) => i).filter(i => i < 5 && (ans[i] === 0 || i + ans[i] >= 5));
  assert.deepEqual(waiting, [2, 3, 4]);
  assert.deepEqual(dailyTemperatures[0].rows[1].cells.map(c => c.value), waiting.map(i => `d${i} · ${t[i]}`));
  assert.match(dailyTemperatures[0].choices[dailyTemperatures[0].answer].label, new RegExp(`5 − 4 = ${ans[4]}`));
  assert.equal(ans[3], 2);
  assert.match(dailyTemperatures[1].question, /5 − 3 = 2/);
  assert.deepEqual(dailyTemperatures[2].rows[1].cells.slice(0, 6).map(c => Number(c.value)), ans.slice(0, 6));
  assert.deepEqual([ans[6], ans[7]], [0, 0]);
  // Invariant claimed in the lesson: from bottom to top, waiting temperatures never increase.
  for (let trial = 0; trial < 300; trial++) {
    const a = Array.from({ length: trial % 9 }, (_, i) => 60 + ((i * 7 + trial * 13) % 6));
    const st: number[] = [];
    a.forEach((v, i) => { while (st.length && v > a[st.at(-1)!]) st.pop(); st.push(i); for (let k = 1; k < st.length; k++) assert.ok(a[st[k]] <= a[st[k - 1]]); });
  }
});
test('circular trace matches brute force', () => {
  assert.deepEqual(circularBrute([1, 2, 1]), [2, -1, 2]);
  assert.match(circular[1].choices[circular[1].answer].feedback, /Final: \[2, −1, 2\]/);
  // After one lap of the linear algorithm, indexes 1 and 2 remain, and only index 0 is answered.
  const a = [1, 2, 1], st: number[] = [], ans = [-1, -1, -1];
  a.forEach((v, i) => { while (st.length && v > a[st.at(-1)!]) ans[st.pop()!] = v; st.push(i); });
  assert.deepEqual(st, [1, 2]);
  assert.deepEqual(ans, [2, -1, -1]);
});
test('car fleet trace matches exact arithmetic', () => {
  const target = 12, pos = [10, 8, 0, 5, 3], speed = [2, 4, 1, 1, 3];
  assert.deepEqual(fleet[0].rows[0].cells.map(c => Number(c.value)), pos);
  const order = pos.map((_, i) => i).sort((x, y) => pos[y] - pos[x]);
  assert.deepEqual(order.map(i => (target - pos[i]) / speed[i]), fleet[1].rows[1].cells.map(c => Number(c.value)));
  assert.equal(fleetBrute(target, pos, speed), 3);
  assert.match(fleet[2].choices[fleet[2].answer].feedback, /third and last fleet/);
});
test('histogram trace matches brute force and pop states', () => {
  assert.equal(largestRectBrute([2, 1, 5, 6, 2, 3]), 10);
  assert.equal(largestRectBrute([3, 4]), 6);
  // Replay the lesson's loop and record every pop.
  const replay = (h: number[]) => {
    const pops: { i: number; m: number; left: number; width: number }[] = []; const st: number[] = [];
    for (let i = 0; i <= h.length; i++) { const cur = i === h.length ? 0 : h[i]; while (st.length && h[st.at(-1)!] >= cur) { const m = st.pop()!; const left = st.length ? st.at(-1)! : -1; pops.push({ i, m, left, width: i - left - 1 }); } st.push(i); }
    return pops;
  };
  const pops = replay([2, 1, 5, 6, 2, 3]);
  assert.deepEqual(pops[0], { i: 1, m: 0, left: -1, width: 1 });
  assert.deepEqual(pops.find(p => p.i === 6 && p.m === 4), { i: 6, m: 4, left: 1, width: 4 });
  assert.deepEqual(replay([3, 4]).map(p => [p.m, p.width]), [[1, 1], [0, 2]]);
  assert.match(histogram[2].choices[histogram[2].answer].label, /= 6$/);
});

// ---------- Hints ----------
test('every HintLadder in the lesson has three hints', () => {
  const used = [...lesson.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 13);
  for (const key of used) { assert.ok(hints[key], `hints.${key} exists`); assert.equal(hints[key].length, 3); }
});

// ---------- Lab ----------
type Mode = 'brackets' | 'waiting' | 'histogram';
function checkFinal(mode: Mode, start: StackLabState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start);
  assert.equal(final.done, true, 'lab terminates');
  assert.equal(wrongMovesChangedBoard, false, 'wrong moves never change the board');
  if (mode === 'brackets') assert.equal(final.verdict, validBrackets(start.chars.join('')));
  if (mode === 'waiting') assert.deepEqual(final.answer, nextWarmerBrute(start.a));
  if (mode === 'histogram') assert.equal(final.best, largestRectBrute(start.a));
  return final;
}
test('every lab mode and case terminates with the brute-force answer', () => {
  for (const [mode, info] of Object.entries(lab.modes) as [Mode, { cases: number }][]) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    for (let v = 0; v < info.cases; v++) checkFinal(mode, lab.create(mode, v));
  }
});
test('lab cases include empty or degenerate inputs and duplicates', () => {
  assert.ok([0, 1, 2, 3].some(v => lab.create('waiting', v).a.length === 0));
  assert.ok([0, 1, 2, 3].some(v => lab.create('histogram', v).a.length === 0));
  assert.ok([0, 1, 2, 3].some(v => { const a = lab.create('histogram', v).a; return new Set(a).size < a.length; }));
  assert.ok([0, 1, 2, 3].some(v => lab.create('brackets', v).chars[0] === ')'));
});
test('labs agree with brute force on random small inputs', () => {
  let seed = 11; const rand = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) % n; };
  for (let t = 0; t < 200; t++) {
    const s = Array.from({ length: rand(9) }, () => '()[]{}'[rand(6)]).join('');
    checkFinal('brackets', fromInput('brackets', s));
    checkFinal('waiting', fromInput('waiting', Array.from({ length: rand(9) }, () => 60 + rand(6))));
    checkFinal('histogram', fromInput('histogram', Array.from({ length: rand(9) }, () => rand(6))));
  }
});
test('lab wrong moves explain with the numbers on the board', () => {
  let s = lab.create('waiting', 0); // [73, 74, ...]
  s = lab.move(s, 'push').state;  // day 0 waits
  const wrong = lab.move(s, 'push');
  assert.equal(wrong.accepted, false);
  assert.match(wrong.state.message, /\(74°\) is warmer than day 0 \(73°\)/);
  const h = lab.move(lab.move(lab.create('histogram', 0), 'push').state, 'push');
  assert.equal(h.accepted, false);
  assert.match(h.state.message, /no taller than bar 0 \(height 2\)/);
});

// ---------- Practice ----------
const nums = (s: string) => (s.trim() === '' ? [] : s.split(',').map(x => Number(x.trim().replace('−', '-'))));
function recompute(id: string, prompt: string): number | number[] | boolean | string {
  const arrays = [...prompt.matchAll(/\[([^\]]*)\]/g)].map(m => nums(m[1]));
  const quoted = [...prompt.matchAll(/“([^”]*)”/g)].map(m => m[1]);
  switch (id) {
    case 'brackets': return validBrackets(quoted[0]);
    case 'warmer': return nextWarmerBrute(arrays[0]);
    case 'min-stack': {
      const ops = prompt.match(/After (.*), what does/)![1].split(', ');
      const model: number[] = [];
      for (const op of ops) { const m = op.match(/^put\((\d+)\)$/); if (m) model.push(Number(m[1])); else { assert.equal(op, 'take'); assert.ok(model.length > 0, 'never take from an empty rack'); model.pop(); } }
      assert.ok(model.length > 0, 'query on a non-empty rack');
      return Math.min(...model);
    }
    case 'rpn': return evalPostfix(quoted[0].split(' '));
    case 'circular': return circularBrute(arrays[0]);
    case 'fleet': {
      const target = Number(prompt.match(/ends at mile (\d+)/)![1]);
      const [pos, speed] = arrays;
      assert.equal(new Set(pos).size, pos.length, 'positions are distinct');
      assert.ok(pos.every(p => p >= 0 && p < target));
      return fleetBrute(target, pos, speed);
    }
    case 'histogram': return largestRectBrute(arrays[0]);
    case 'nge-map': {
      const [ref, queries] = arrays;
      assert.equal(new Set(ref).size, ref.length);
      return queries.map(x => { const j = ref.indexOf(x); assert.ok(j >= 0); for (let k = j + 1; k < ref.length; k++) if (ref[k] > x) return ref[k]; return -1; });
    }
    case 'span': return spanBrute(arrays[0]);
    case 'asteroids': return asteroidBrute(arrays[0]);
    case 'remove-digits': return removeDigitsBrute(quoted[0], Number(prompt.match(/Remove exactly (\d+) digit/)![1]));
    case 'rain-stream': return trapBrute(arrays[0]);
    case 'subarray-mins': return sumMinsBrute(arrays[0]);
    case 'later-max': { const a = arrays[0]; return a.map((_, i) => (i + 1 < a.length ? Math.max(...a.slice(i + 1)) : 0)); }
  }
  throw new Error(`no oracle for ${id}`);
}
const format = (answer: number | number[] | boolean | string) => typeof answer === 'boolean' ? (answer ? 'yes' : 'no') : typeof answer === 'string' ? answer : JSON.stringify(answer);
test('practice answers match independent brute force for 21 variants of every concept', () => {
  assert.equal(practice.storageKey, 'citadel-stacks-review-v1');
  assert.ok(practice.conceptIds.length >= 11);
  assert.ok(Object.values(practice.conceptIds).some(id => practice.challengeFor(id).strategy === 'other'), 'one decoy concept');
  for (const id of practice.conceptIds) {
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      assert.equal(c.id, id);
      assert.ok(c.strategy in strategies, `${id}: strategy key`);
      assert.match(lesson, new RegExp(`id="${c.section}"`), `${id}: section ${c.section} exists in the lesson`);
      assert.doesNotMatch(c.prompt, /\bstack|monotonic|\bpop\b|\bpush\b/i, `${id}: prompt must not name the technique`);
      assert.deepEqual(c.answer, recompute(id, c.prompt), `${id} variant ${variant}: ${c.prompt}`);
      assert.equal(answerMatches(c, format(c.answer)), true, `${id} variant ${variant}: formatted answer accepted`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.notEqual(c.prompt, practice.challengeFor(id, variant + 1).prompt, `${id}: consecutive variants must differ`);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
  }
});
test('practice covers every chapter and side quest', () => {
  const sections = new Set(practice.conceptIds.map(id => practice.challengeFor(id).section));
  for (const s of ['valid-parentheses', 'min-stack', 'reverse-polish', 'daily-temperatures', 'circular-next-greater', 'car-fleet', 'largest-rectangle', 'next-greater-map', 'stock-span', 'asteroids', 'remove-k-digits', 'rain-in-layers', 'subarray-minimums']) assert.ok(sections.has(s), s);
});
