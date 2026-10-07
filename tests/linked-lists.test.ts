import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, gapResult, type LinkedLabState, type LinkedMode } from '../src/lib/labs/linked-lists.ts';
import * as traces from '../src/data/linked-lists/traces.ts';
import { hints } from '../src/data/linked-lists/hints.ts';
import { practice, strategies } from '../src/data/practice/linked-lists.ts';

const lesson = readFileSync(new URL('../src/dsa-lessons/linked-lists.mdx', import.meta.url), 'utf8');

// ---------- independent oracles on plain arrays / node tables ----------
function walkVals(vals: number[], next: (number | null)[], start: number | null): number[] {
  const out: number[] = [], seen = new Set<number>();
  for (let at = start; at !== null; at = next[at]) { assert.ok(!seen.has(at), 'unexpected loop'); seen.add(at); out.push(vals[at]); }
  return out;
}
function hasLoopBySet(next: (number | null)[], start: number | null): boolean {
  const seen = new Set<number>();
  for (let at = start; at !== null; at = next[at]) { if (seen.has(at)) return true; seen.add(at); }
  return false;
}
function checkFinal(mode: LinkedMode, start: LinkedLabState, final: LinkedLabState) {
  assert.equal(final.done, true, `${mode} must terminate`);
  if (mode === 'reverse') {
    const got = walkVals(final.vals, final.next, final.prev);
    assert.deepEqual(got, [...start.vals].reverse());
    assert.equal(final.cur, null);
  } else if (mode === 'cycle') {
    assert.equal(final.verdict, hasLoopBySet(start.next, start.vals.length ? 0 : null) ? 'cycle' : 'none');
  } else {
    const expect = start.vals.filter((_, i) => i !== start.vals.length - start.n);
    assert.deepEqual(gapResult(final), expect);
  }
}

test('every playground mode × case terminates correctly; wrong moves never change the board', () => {
  for (const [mode, info] of Object.entries(lab.modes)) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    for (let v = 0; v < info.cases; v++) {
      const start = lab.create(mode, v);
      const { final, wrongMovesChangedBoard } = solveLab(lab, start);
      assert.equal(wrongMovesChangedBoard, false, `${mode} case ${v}`);
      checkFinal(mode as LinkedMode, start, final);
      assert.ok(lab.view(start).length >= 1);
      assert.equal(typeof lab.describe(final), 'string');
    }
  }
});

test('playground modes agree with oracles on random small inputs', () => {
  let seed = 11;
  const rand = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  for (let trial = 0; trial < 150; trial++) {
    const len = rand(8);
    const vals = Array.from({ length: len }, () => rand(5) - 2); // small range: many duplicate values
    for (const mode of ['reverse', 'cycle', 'gap'] as LinkedMode[]) {
      if (mode === 'gap' && len === 0) continue;
      const input = mode === 'cycle' ? { vals, pos: len ? rand(len + 1) - 1 : -1 } : mode === 'gap' ? { vals, n: 1 + rand(len) } : { vals };
      const start = fromInput(mode, input);
      const { final, wrongMovesChangedBoard } = solveLab(lab, start);
      assert.equal(wrongMovesChangedBoard, false);
      checkFinal(mode, start, final);
    }
  }
});

test('wrong reversal orders are caught and name the islands that would be lost', () => {
  let s = lab.create('reverse', 0);
  let r = lab.move(s, 'flip');
  assert.equal(r.accepted, false);
  assert.match(r.state.message, /dropped the rope/);
  assert.match(r.state.message, /2 → 3 → 4 → 5 are unreachable/);
  for (const a of ['save', 'flip', 'prev', 'cur']) s = lab.move(s, a).state; // one full turn
  r = lab.move(s, 'flip');
  assert.match(r.state.message, /3 → 4 → 5 are unreachable/);
  s = lab.move(lab.move(s, 'save').state, 'flip').state;
  r = lab.move(s, 'cur'); // moving cur before prev drops the reversed part
  assert.equal(r.accepted, false);
  assert.match(r.state.message, /2 → 1 is unreachable/);
});

test('the courier lab rejects comparing flags instead of islands', () => {
  let s = lab.create('cycle', 1); // 7 → 7 → 7 → 7, no loop
  assert.match(lab.move(s, 'meet').state.message, /start together/);
  s = lab.move(s, 'step').state;
  const r = lab.move(s, 'meet');
  assert.equal(r.accepted, false);
  assert.match(r.state.message, /Same flag, different islands/);
});

test('the gap lab explains where Trail would land with too small a gap', () => {
  let s = lab.create('gap', 0); // 1..5, n = 2
  s = lab.move(s, 'lead').state; s = lab.move(s, 'lead').state; // gap of n = 2
  const r = lab.move(s, 'both');
  assert.equal(r.accepted, false);
  assert.match(r.state.message, /island 4 \(position 4\) — the island to remove itself/);
});

// ---------- traces ----------
const labelOf = (s: { choices: { label: string }[]; answer: number }) => s.choices[s.answer].label;
test('every trace step has a valid answer and feedback for every choice', () => {
  const all = Object.entries(traces);
  assert.ok(all.length >= 12);
  for (const [name, steps] of all) {
    assert.ok(steps.length >= 2, name);
    for (const s of steps) {
      assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, name);
      assert.ok(s.choices.length >= 2);
      for (const c of s.choices) assert.ok(c.feedback.length > 20, `${name}: ${c.label}`);
    }
    assert.ok(lesson.includes(`steps={${name}}`), `trace ${name} is used in the lesson`);
  }
});

// A tiny node-table list for re-deriving trace numbers.
const list = (vals: number[]) => ({ vals: [...vals], next: vals.map((_, i) => (i + 1 < vals.length ? i + 1 : null)) as (number | null)[] });
function middleRun(n: number, fastStartsAhead: boolean) {
  const { next } = list(Array.from({ length: n }, (_, i) => i + 1));
  let slow: number | null = 0, fast: number | null = fastStartsAhead ? next[0] : 0;
  while (fast !== null && next[fast] !== null) { slow = next[slow!]; fast = next[next[fast]!]; }
  return slow! + 1;
}
test('middle trace numbers', () => {
  assert.equal(middleRun(5, false), 3); assert.match(labelOf(traces.middle[0]), /On 3/);
  assert.equal(middleRun(6, false), 4); assert.match(labelOf(traces.middle[1]), /On 4/);
  assert.equal(middleRun(6, true), 3); assert.equal(middleRun(5, true), 3);
  assert.match(labelOf(traces.middle[2]), /head\.next/);
});
test('cycle trace numbers: value comparison lies, node comparison does not', () => {
  const { vals, next } = list([1, 2, 2, 3]);
  let slow: number | null = 0, fast: number | null = 0, byNode = false, byValue = false;
  while (fast !== null && next[fast] !== null) {
    slow = next[slow!]; fast = next[next[fast]!];
    if (slow === fast) byNode = true;
    if (fast !== null && vals[slow!] === vals[fast]) byValue = true;
  }
  assert.equal(byNode, false); assert.equal(byValue, true);
  // speed difference 2 on an even loop with an odd gap never meets
  const L = 4; let gap = 1, met = false;
  for (let t = 0; t < 100; t++) { gap = ((gap - 2) % L + L) % L; if (gap === 0) met = true; }
  assert.equal(met, false);
});
function trailAfterGap(len: number, gap: number) { // positions: 0 dummy, 1..len, len + 1 = null
  let lead = gap, trail = 0;
  while (lead <= len) { lead++; trail++; }
  return trail;
}
test('nth-from-end trace numbers', () => {
  assert.equal(trailAfterGap(5, 3), 3); // n + 1: before the target 4
  assert.equal(trailAfterGap(5, 2), 4); // n: ON the target
  assert.equal(trailAfterGap(5, 5), 1); // the length
  assert.equal(trailAfterGap(1, 2), 0); // chain [1], n = 1: trail stays on the dummy
});
test('find-the-duplicate trace numbers', () => {
  const nums = [1, 3, 4, 2, 2];
  const route = [0]; for (let i = 0; i < 6; i++) route.push(nums[route.at(-1)!]);
  assert.deepEqual(route, [0, 1, 3, 2, 4, 2, 4]);
  let slow = 0, fast = 0;
  do { slow = nums[slow]; fast = nums[nums[fast]]; } while (slow !== fast);
  assert.equal(slow, 4);
  slow = 0; let turns = 0;
  while (slow !== fast) { slow = nums[slow]; fast = nums[fast]; turns++; }
  assert.equal(slow, 2); assert.equal(turns, 3);
  assert.match(labelOf(traces.duplicate[2]), /island 2, after 3 turns/);
});
function reverseBetween(a: number[], left: number, right: number) { return [...a.slice(0, left - 1), ...a.slice(left - 1, right).reverse(), ...a.slice(right)]; }
test('reversal and k-group trace numbers', () => {
  assert.deepEqual(reverseBetween([1, 2, 3, 4, 5], 2, 4), [1, 4, 3, 2, 5]);
  assert.deepEqual(reverseBetween([1, 2, 3, 4, 5], 1, 3), [3, 2, 1, 4, 5]);
  // the wrong seams: before(1).next = cur(5); first(2).next = prev(4) with 4 → 3 → 2 → … loops
  const next: Record<number, number | null> = { 1: 5, 4: 3, 3: 2, 2: 4, 5: null };
  const seen = new Set<number>(); let at: number | null = 4; while (at !== null && !seen.has(at)) { seen.add(at); at = next[at]; }
  assert.equal(at, 4); // 4 → 3 → 2 → 4: a loop
  const kGroup = (a: number[], k: number) => { const out: number[] = []; for (let i = 0; i < a.length; i += k) { const b = a.slice(i, i + k); out.push(...(b.length === k ? b.reverse() : b)); } return out; };
  assert.deepEqual(kGroup([1, 2, 3, 4, 5], 3), [3, 2, 1, 4, 5]);
  assert.deepEqual(kGroup([1, 2, 3, 4, 5], 2), [2, 1, 4, 3, 5]);
  assert.match(labelOf(traces.kGroup[2]), /^2 → 1 → 4 → 3 → 5$/);
});
test('merge, reorder and LRU trace numbers', () => {
  // merge with <=: record the state when list1 runs out
  let a = [1, 2, 4], b = [1, 3, 4]; const out: number[] = [];
  while (a.length && b.length) { if (a[0] <= b[0]) out.push(a.shift()!); else out.push(b.shift()!); }
  assert.deepEqual(out, [1, 1, 2, 3, 4]); assert.deepEqual(b, [4]); assert.equal(a.length, 0);
  // reorder: guard fast.next && fast.next.next on 1..6 stops slow on 3; the middle guard stops on 4
  const { next } = list([1, 2, 3, 4, 5, 6]);
  let slow = 0, fast = 0;
  while (next[fast] !== null && next[next[fast]!] !== null) { slow = next[slow]!; fast = next[next[fast]!]!; }
  assert.equal(slow + 1, 3);
  assert.equal(middleRun(6, false), 4);
  const weave = (x: number[], y: number[]) => x.flatMap((v, i) => (i < y.length ? [v, y[i]] : [v]));
  assert.deepEqual(weave([1, 2, 3], [6, 5, 4]), [1, 6, 2, 5, 3, 4]);
  assert.deepEqual(weave([1, 2, 3], [4, 5, 6]), [1, 4, 2, 5, 3, 6]);
  // LRU capacity 2
  const cache = new Map<number, number>(); const cap = 2; const evicted: number[] = [];
  const touch = (k: number) => { const v = cache.get(k)!; cache.delete(k); cache.set(k, v); };
  const put = (k: number, v: number) => { if (cache.has(k)) cache.delete(k); else if (cache.size === cap) { const old = cache.keys().next().value!; evicted.push(old); cache.delete(old); } cache.set(k, v); };
  put(1, 1); put(2, 2); touch(1); put(3, 3);
  assert.deepEqual(evicted, [2]); assert.equal(cache.has(2), false);
  assert.match(labelOf(traces.lru[0]), /Key 2/); assert.match(labelOf(traces.lru[1]), /−1/);
});

test('every hint ladder in the lesson has three hints', () => {
  const used = [...lesson.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 17);
  for (const key of used) { assert.ok(hints[key], key); assert.equal(hints[key].length, 3); }
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `hint ${key} is used`);
});

// ---------- practice ----------
const chains = (p: string) => [...p.matchAll(/-?\d+(?: → -?\d+)+/g)].map(m => m[0].split(' → ').map(Number));
const num = (p: string, re: RegExp) => Number(p.match(re)![1]);
function oracle(id: string, p: string): number | number[] | boolean {
  switch (id) {
    case 'middle': { const a = chains(p)[0], n = a.length; if (n % 2) return a[(n - 1) / 2]; return /return the first one/.test(p) ? a[n / 2 - 1] : a[n / 2]; }
    case 'cycle': { const next = p.match(/next = \[([^\]]*)\]/)![1].split(', ').map(Number); const seen = new Set<number>(); let at = 0; while (at !== -1) { if (seen.has(at)) return true; seen.add(at); at = next[at]; } return false; }
    case 'nth-end': { const a = chains(p)[0], n = num(p, /(\d+)(?:st|nd|rd|th) from the end/); const out = [...a]; out.splice(a.length - n, 1); return out; }
    case 'duplicate': { const nums = p.match(/\[([^\]]*)\]/)![1].split(', ').map(Number); const n = nums.length - 1; assert.ok(nums.every(x => x >= 1 && x <= n)); const dups = [...new Set(nums.filter((x, i) => nums.indexOf(x) !== i))]; assert.equal(dups.length, 1); return dups[0]; }
    case 'reverse': return chains(p)[0].slice().reverse();
    case 'reverse-between': { const a = chains(p)[0]; return reverseBetween(a, num(p, /positions (\d+) through/), num(p, /through (\d+)/)); }
    case 'k-group': { const a = chains(p)[0], k = num(p, /block of (\d+) nodes/); const out: number[] = []; let i = 0; while (i + k <= a.length) { for (let j = i + k - 1; j >= i; j--) out.push(a[j]); i += k; } return [...out, ...a.slice(i)]; }
    case 'merge': { const [a, b] = chains(p); assert.deepEqual(a, [...a].sort((x, y) => x - y)); return [...a, ...b].sort((x, y) => x - y); }
    case 'reorder': { const a = chains(p)[0], out: number[] = []; const d = [...a]; let front = true; while (d.length) out.push(front ? d.shift()! : d.pop()!), front = !front; return out; }
    case 'copy-random': { const n = num(p, /A chain of (\d+) nodes/), target = num(p, /extra pointer to node (\d+)/); const woven = Array.from({ length: n }, (_, k) => [`orig${k}`, `copy${k}`]).flat(); return woven.indexOf(`copy${target}`); }
    case 'lru': {
      const cap = num(p, /at most (\d+) keys/), cache = new Map<number, number>(), out: number[] = [];
      for (const m of p.matchAll(/(put|get)\((\d+)(?:, (\d+))?\)/g)) {
        const k = Number(m[2]);
        if (m[1] === 'get') { if (cache.has(k)) { const v = cache.get(k)!; cache.delete(k); cache.set(k, v); out.push(v); } else out.push(-1); }
        else { if (cache.has(k)) cache.delete(k); else if (cache.size >= cap) cache.delete([...cache.keys()][0]); cache.set(k, Number(m[3])); }
      }
      return out;
    }
    case 'cycle-entrance': { const next = p.match(/next = \[([^\]]*)\]/)![1].split(', ').map(Number); const order: number[] = []; let at = 0; while (!order.includes(at)) { order.push(at); at = next[at]; assert.notEqual(at, -1); } return at; }
    case 'palindrome': { const a = chains(p)[0]; return a.every((v, i) => v === a[a.length - 1 - i]); }
    case 'intersection': { const [a, b] = chains(p); return a.find(x => b.includes(x))!; }
    case 'add-two': { const [a, b] = chains(p); const out: number[] = []; let carry = 0; for (let i = 0; i < Math.max(a.length, b.length) || carry; i++) { const s = (a[i] ?? 0) + (b[i] ?? 0) + carry; out.push(s % 10); carry = Math.floor(s / 10); } return out; }
    case 'rotate': { let a = chains(p)[0]; const k = num(p, /by (\d+) place/); for (let i = 0; i < k; i++) a = [a.at(-1)!, ...a.slice(0, -1)]; return a; }
    case 'sort-list': return chains(p)[0].slice().sort((x, y) => x - y);
    case 'other': return chains(p)[0].includes(num(p, /is (\d+) in it/));
  }
  throw new Error(`no oracle for ${id}`);
}
const format = (answer: number | number[] | boolean | string) => (typeof answer === 'boolean' ? (answer ? 'yes' : 'no') : Array.isArray(answer) ? answer.join(', ') : String(answer));

test('practice answers match independent oracles for every concept × 21 variants', () => {
  assert.equal(practice.storageKey, 'citadel-linked-lists-review-v1');
  assert.ok(practice.conceptIds.length >= 10);
  for (const id of practice.conceptIds) {
    const prompts = new Set<string>();
    for (let variant = 0; variant <= 20; variant++) {
      const c = practice.challengeFor(id, variant);
      prompts.add(c.prompt);
      assert.equal(c.id, id);
      assert.ok(c.strategy in strategies, `${id} strategy`);
      assert.ok(lesson.includes(`id="${c.section}"`), `${id} section ${c.section} exists`);
      assert.deepEqual(c.answer, oracle(id, c.prompt), `${id} variant ${variant}: ${c.prompt}`);
      assert.equal(answerMatches(c, format(c.answer)), true, `${id} variant ${variant} formatted`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.doesNotMatch(c.prompt, /\b(linked list|fast and slow|tortoise|hare|Floyd|reversal|two pointers|dummy)\b/i, `${id} names its technique`);
      for (const h of [...c.hints, ...c.rubric]) assert.ok(h.length > 10);
    }
    assert.ok(prompts.size >= 5, `${id} varies its input (${prompts.size} distinct prompts)`);
  }
  const decoys = practice.conceptIds.filter(id => practice.challengeFor(id).strategy === 'other');
  assert.equal(decoys.length, 1);
  const used = new Set(practice.conceptIds.map(id => practice.challengeFor(id).strategy));
  for (const key of Object.keys(strategies)) assert.ok(used.has(key as never), `strategy ${key} is used`);
});

test('chain answers accept commas, spaces or brackets', () => {
  const c = practice.challengeFor('reverse', 3);
  const a = c.answer as number[];
  assert.equal(answerMatches(c, `[${a.join(', ')}]`), true);
  assert.equal(answerMatches(c, a.join(' ')), true);
  assert.equal(answerMatches(c, [...a, 1].join(', ')), false);
});
