import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type HashState } from '../src/lib/labs/hashing.ts';
import { wall, twoSum, keys, anagram, group, streak, codec, mixedReview } from '../src/data/hashing/traces.ts';
import { hints } from '../src/data/hashing/hints.ts';
import { practice, conceptIds } from '../src/data/practice/hashing.ts';

// ---------- independent helpers (deliberately naive) ----------
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;
const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
// Java's String.hashCode and List.hashCode, and HashMap's bucket choice, written out longhand.
const javaStringHash = (s: string) => { let h = 0; for (const ch of s) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return h; };
const javaListHash = (xs: number[]) => { let h = 1; for (const x of xs) h = (Math.imul(h, 31) + x) | 0; return h; };
const bucket = (h: number, capacity: number) => ((h ^ (h >>> 16)) & (capacity - 1));
const bruteTwoSum = (a: number[], t: number) => { const out: [number, number][] = []; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] + a[j] === t) out.push([i, j]); return out; };
const isAnagram = (s: string, t: string) => s.length === t.length && [...s].every(c => [...s].filter(x => x === c).length === [...t].filter(x => x === c).length);
const longestRun = (a: number[]) => { let best = 0; for (const x of a) { let L = 0; while (a.includes(x + L)) L++; best = Math.max(best, L); } return best; };
const digitSquares = (n: number) => { let s = 0; while (n > 0) { s += (n % 10) ** 2; n = Math.floor(n / 10); } return s; };
const reachesOne = (n: number) => { for (let i = 0; i < 1000; i++) n = digitSquares(n); return n === 1; };
const unpack = (s: string) => { const out: string[] = []; let i = 0; while (i < s.length) { let j = i; while (s[j] !== '#') j++; const len = Number(s.slice(i, j)); out.push(s.slice(j + 1, j + 1 + len)); i = j + 1 + len; } return out; };

test('every trace step has a valid answer and feedback for each choice', () => {
  for (const steps of [wall, twoSum, keys, anagram, group, streak, codec, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('chapter 1: bucket numbers, the add return value and the resize threshold', () => {
  // toy wall: 3 and 11 share hole 3, and so does 19 — Java's own bucket choice agrees for small Integers
  for (const x of [3, 11, 19]) { assert.equal(x % 8, 3); assert.equal(bucket(x, 8), 3); }
  assert.deepEqual(cells(wall[0].rows[0]).map((v, i) => (v === '·' ? null : i)).filter(i => i !== null), [3]);
  assert.match(correct(wall[0]), /^Hole 3/);
  // figure in the prologue: 3, 11, 4, 19, 8 in eight holes
  const holes: number[][] = Array.from({ length: 8 }, () => []);
  for (const x of [3, 11, 4, 19, 8]) holes[x % 8].push(x);
  assert.deepEqual(holes, [[8], [], [], [3, 11, 19], [4], [], [], []]);
  // [1, 2, 3, 1]: the first repeat is at index 3
  const seen = new Set<number>(); let firstRepeat = -1;
  [1, 2, 3, 1].forEach((x, i) => { if (seen.has(x) && firstRepeat < 0) firstRepeat = i; seen.add(x); });
  assert.equal(firstRepeat, 3);
  assert.match(correct(wall[1]), /^false/);
  assert.equal(16 * 0.75, 12);
  assert.match(correct(wall[2]), /32 buckets.*13 entries/);
  // String collision used in the lesson: "Aa" and "BB"
  assert.equal(javaStringHash('Aa'), 2112); assert.equal(javaStringHash('BB'), 2112);
});

test('chapter 2: two sum traces agree with brute force', () => {
  assert.deepEqual(bruteTwoSum([3, 2, 4], 6), [[1, 2]]);
  assert.match(twoSum[0].choices[0].feedback, /\[0, 0\]/);
  assert.match(twoSum[0].choices[0].feedback, /\[1, 2\]/);
  assert.match(correct(twoSum[0]), /^Ask for 6 − 3 = 3 first/);
  assert.deepEqual(cells(twoSum[1].rows[1]), ['3 → 0', '2 → 1']);
  assert.equal(6 - 4, 2);
  assert.match(correct(twoSum[1]), /return \[1, 2\]/);
  assert.deepEqual(bruteTwoSum([3, 3], 6), [[0, 1]]);
  assert.match(correct(twoSum[2]), /return \[0, 1\]/);
});

test('chapter 3: key facts (list hashes, holes, string-key collisions)', () => {
  assert.equal(javaListHash([1, 2]), 994);
  assert.equal(javaListHash([1, 2, 3]), 30817);
  assert.equal(bucket(994, 16), 2);
  assert.equal(bucket(30817, 16), 1);
  assert.match(correct(keys[2]), /stranded/);
  assert.match(keys[2].choices[1].feedback, /994 \(hole 2 of 16\) and \[1, 2, 3\] to 30817 \(hole 1\)/);
  assert.equal(`${1}${23}`, `${12}${3}`);
  assert.equal(`${11}${1}`, `${1}${11}`);
  assert.notEqual(`${1},${23}`, `${12},${3}`);
  assert.match(correct(keys[3]), /x \+ "," \+ y/);
  assert.equal(1 + 2, 2 + 1);
});

test('chapter 4: anagram counts', () => {
  const counts = (s: string, t: string) => { const c: Record<string, number> = {}; for (const x of s) c[x] = (c[x] ?? 0) + 1; for (const x of t) c[x] = (c[x] ?? 0) - 1; return Object.fromEntries(Object.entries(c).filter(([, v]) => v !== 0)); };
  assert.deepEqual(counts('rat', 'car'), { t: 1, c: -1 });
  assert.match(correct(anagram[0]), /c is −1 and t is \+1/);
  // dropping the length check: loop over s only
  const loopOverS = (s: string, t: string) => { const c = new Array(26).fill(0); for (let i = 0; i < s.length; i++) { c[s.charCodeAt(i) - 97]++; c[t.charCodeAt(i) - 97]--; } return c.every(x => x === 0); };
  assert.equal(loopOverS('ab', 'abx'), true);
  assert.equal(isAnagram('ab', 'abx'), false);
  assert.equal('é'.codePointAt(0), 233);
  assert.equal(233 - 97, 136);
  assert.ok(isAnagram('anagram', 'nagaram'));
});

test('chapter 5: fingerprints and the separator collision', () => {
  const sortKey = (w: string) => [...w].sort().join('');
  assert.equal(sortKey('tea'), 'aet'); assert.equal(sortKey('eat'), 'aet');
  assert.equal([...'tea'].reduce((s, c) => s + c.charCodeAt(0), 0), 314);
  assert.equal('a'.charCodeAt(0) + 'd'.charCodeAt(0), 197);
  assert.equal('b'.charCodeAt(0) + 'c'.charCodeAt(0), 197);
  const countKey = (w: string, sep: string) => { const c = new Array(26).fill(0); for (const x of w) c[x.charCodeAt(0) - 97]++; return c.map(n => `${n}${sep}`).join(''); };
  const w1 = 'a' + 'b'.repeat(12), w2 = 'a'.repeat(11) + 'bb';
  assert.equal(w1.length, 13); assert.equal(w2.length, 13);
  assert.equal(countKey(w1, ''), '112' + '0'.repeat(24));
  assert.equal(countKey(w1, ''), countKey(w2, ''));
  assert.notEqual(countKey(w1, '#'), countKey(w2, '#'));
  assert.ok(!isAnagram(w1, w2));
  assert.match(correct(group[1]), /"112" followed by 24 zeros/);
  assert.match(correct(group[0]), /"aet"/);
});

test('chapter 6: consecutive runs and walk counts', () => {
  const set = [100, 4, 200, 1, 3, 2];
  assert.deepEqual(cells(streak[0].rows[0]).map(Number), set);
  assert.ok(set.includes(3));
  assert.match(correct(streak[0]), /skip 4/);
  assert.ok(!set.includes(0) && !set.includes(5));
  assert.equal(longestRun(set), 4);
  assert.match(correct(streak[1]), /length 4/);
  // only starts walk: count how often each number is stepped on
  const visits = new Map<number, number>();
  for (const x of set) if (!set.includes(x - 1)) for (let c = x; set.includes(c); c++) visits.set(c, (visits.get(c) ?? 0) + 1);
  assert.equal(visits.get(3), 1);
  assert.ok([...visits.values()].every(v => v === 1));
  assert.equal(visits.size, set.length);
});

test('chapter 7: codec traces', () => {
  assert.equal(['a,b'].join(','), ['a', 'b'].join(','));
  assert.deepEqual(unpack('3#a#b0#'), ['a#b', '']);
  assert.match(correct(codec[1]), /\["a#b", ""\]/);
  assert.notEqual(['a'].join('#'), ['a', ''].join('#'));
  assert.notEqual(['ab'].join('#'), ['a', 'b'].join('#'));
  assert.equal([].join('#'), [''].join('#'));
  const frame = (xs: string[]) => xs.map(s => `${s.length}#${s}`).join('');
  assert.equal(frame([]), ''); assert.equal(frame(['']), '0#');
  assert.equal('3#a#b0#'.split('#').length, 4);
  assert.deepEqual('3#a#b0#'.split('#'), ['3', 'a', 'b0', '']);
});

test('side quest facts used in the lesson', () => {
  // happy numbers: the only non-trivial cycle below 1000, and the known happy numbers up to 100
  const cycle = [4, 16, 37, 58, 89, 145, 42, 20];
  cycle.forEach((x, i) => assert.equal(digitSquares(x), cycle[(i + 1) % cycle.length]));
  const cycles = new Set<string>();
  for (let n = 1; n < 1000; n++) {
    const seen: number[] = []; let x = n;
    while (!seen.includes(x)) { seen.push(x); x = digitSquares(x); }
    const loop = seen.slice(seen.indexOf(x));
    cycles.add([...loop].sort((p, q) => p - q).join(','));
  }
  assert.deepEqual([...cycles].sort(), ['1', [...cycle].sort((p, q) => p - q).join(',')].sort());
  const happy = Array.from({ length: 100 }, (_, i) => i + 1).filter(reachesOne);
  assert.deepEqual(happy, [1, 7, 10, 13, 19, 23, 28, 31, 32, 44, 49, 68, 70, 79, 82, 86, 91, 94, 97, 100]);
  assert.deepEqual([1, 9, 8, 2].map(d => d * d), [1, 81, 64, 4]);
  assert.equal(digitSquares(19), 82); assert.equal(digitSquares(82), 68); assert.equal(digitSquares(68), 100); assert.equal(digitSquares(100), 1);
  assert.equal(digitSquares(2147483647), 4 + 1 + 16 + 49 + 16 + 64 + 9 + 36 + 16 + 49);
  for (let d = 4; d <= 10; d++) assert.ok(81 * d < 10 ** (d - 1));
  assert.equal(3 * 81, 243);
  // sudoku boxes: the wrong formula merges boxes 1 and 3
  const box = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
  const wrong = (r: number, c: number) => Math.floor(r / 3) + Math.floor(c / 3);
  assert.equal(box(0, 3), 1); assert.equal(box(3, 0), 3);
  assert.equal(wrong(0, 3), wrong(3, 0));
  // first unique character: "loveleetcode"
  const s = 'loveleetcode';
  const firstUnique = [...s].findIndex(c => s.split(c).length === 2);
  assert.equal(firstUnique, 2);
  const alphabetical = [...'abcdefghijklmnopqrstuvwxyz'].find(c => s.split(c).length === 2)!;
  assert.equal(alphabetical, 'c'); assert.equal(s.indexOf('c'), 8);
  // isomorphic: badc → baba is consistent forward, not backward
  const forwardOnly = (a: string, b: string) => { const m = new Map<string, string>(); for (let i = 0; i < a.length; i++) { if (m.has(a[i]) && m.get(a[i]) !== b[i]) return false; m.set(a[i], b[i]); } return true; };
  assert.equal(forwardOnly('badc', 'baba'), true);
  assert.notEqual(new Set('badc').size, new Set('baba').size);
  // two-sum bound: |target − x| ≤ 2·10⁹ fits in int
  assert.ok(2e9 < 2 ** 31 - 1);
  // 100,000 numbers walked from every position
  assert.equal(100000 * 100001 / 2, 5000050000);
});

test('every hint ladder referenced by the lesson exists with three hints', () => {
  const mdx = readFileSync(new URL('../src/dsa-lessons/hashing.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 13);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
});

// ---------- lab ----------
type Oracle = (start: HashState, final: HashState) => void;
const oracles: Record<string, Oracle> = {
  twoSum: (s, f) => {
    const pairs = bruteTwoSum(s.a, s.target);
    if (!pairs.length) { assert.equal(f.pair, null); return; }
    assert.ok(f.pair, 'a pair exists but none was reported');
    const [i, j] = f.pair!;
    assert.ok(i < j && s.a[i] + s.a[j] === s.target, `invalid pair ${f.pair}`);
    assert.equal(j, Math.min(...pairs.map(([, b]) => b)), 'the scan stops at the first position that completes a pair');
  },
  group: (s, f) => {
    const got = f.buckets.map(([, ws]) => [...ws].sort().join('|')).sort();
    const expected: string[][] = [];
    for (const w of s.words) { const g = expected.find(ws => isAnagram(ws[0], w)); if (g) g.push(w); else expected.push([w]); }
    assert.deepEqual(got, expected.map(ws => [...ws].sort().join('|')).sort());
  },
  streak: (s, f) => {
    assert.equal(f.best, longestRun(s.nums));
    assert.equal(f.lookups, 2 * new Set(s.nums).size, 'exactly two lookups per distinct number');
  },
};
function runCase(start: HashState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 4000);
  assert.equal(final.done, true, `${start.mode} must terminate`);
  assert.equal(wrongMovesChangedBoard, false, `${start.mode}: a wrong move changed the board`);
  oracles[start.mode](start, final);
  return final;
}

test('every lab mode and case terminates with the right result; wrong moves never change the board', () => {
  for (const [mode, info] of Object.entries(lab.modes)) {
    assert.ok(info.cases >= 3 && info.cases <= 4);
    for (let v = 0; v < info.cases; v++) runCase(lab.create(mode, v));
  }
});

test('every rejected move on every reachable state explains itself with real numbers', () => {
  for (const [mode, info] of Object.entries(lab.modes)) for (let v = 0; v < info.cases; v++) {
    let state = lab.create(mode, v);
    for (let guard = 0; guard < 500; guard++) {
      for (const { action } of info.actions) {
        const result = lab.move(state, action);
        if (!result.accepted && !state.done) {
          assert.doesNotMatch(result.state.message, /undefined|NaN|\[object|null/, `${mode} case ${v}: ${action}`);
          assert.ok(result.state.message.length > 15, `${mode} case ${v}: ${action} needs an explanation`);
        }
      }
      for (const text of [lab.describe(state), ...lab.view(state).flatMap(r => r.cells.map(c => `${c.value} ${c.label ?? ''}`))])
        assert.doesNotMatch(text, /undefined|NaN|null/, `${mode} case ${v}`);
      if (state.done) break;
      state = lab.move(state, lab.expected(state)).state;
      assert.doesNotMatch(state.message, /undefined|NaN|null/);
    }
    assert.equal(state.done, true);
  }
});

test('lab agrees with brute force on random small inputs', () => {
  let seed = 19; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const letters = 'abc';
  for (let t = 0; t < 200; t++) {
    const a = Array.from({ length: rnd(7) }, () => rnd(9) - 4);
    runCase({ ...lab.create('twoSum'), ...fromInput({ mode: 'twoSum', a, target: rnd(11) - 5 }) });
    const words = Array.from({ length: rnd(6) }, () => Array.from({ length: rnd(4) }, () => letters[rnd(3)]).join(''));
    runCase({ ...lab.create('group'), ...fromInput({ mode: 'group', words }) });
    const nums = Array.from({ length: rnd(9) }, () => rnd(12) - 4);
    runCase({ ...lab.create('streak'), ...fromInput({ mode: 'streak', nums }) });
  }
});

test('the lab catches filing first, keying by spelling and walking from mid-run', () => {
  const ts = lab.create('twoSum', 1);                     // [3, 2, 4], target 6
  const fileFirst = lab.move(ts, 'file');
  assert.equal(fileFirst.accepted, false);
  assert.match(fileFirst.state.message, /report \[0, 0\]/);
  const single = lab.create('twoSum', 3);                 // [5], target 10
  assert.match(lab.move(single, 'file').state.message, /report \[0, 0\]/);
  const g = lab.create('group', 0);                       // eat, tea, ...
  const spelled = lab.move(g, 'spelling');
  assert.equal(spelled.accepted, false);
  assert.match(spelled.state.message, /never meets “tea” or “ate”/);
  let st = lab.create('streak', 0);                       // set 100, 4, 200, 1, 3, 2
  st = lab.move(st, 'start').state;                       // 100 starts a run
  st = lab.move(st, 'close').state;                       // 101 absent
  const midRun = lab.move(st, 'start');                   // 4: 3 is present
  assert.equal(midRun.accepted, false);
  assert.match(midRun.state.message, /3 is in the set, so 4 isn’t the first number/);
});

// ---------- practice ----------
const arrays = (prompt: string) => [...prompt.matchAll(/\[(-?\d[^\]]*)\]/g)].map(m => m[1].split(',').map(Number));
const quoted = (prompt: string) => [...prompt.matchAll(/"([^"]*)"/g)].map(m => m[1]);
function num(prompt: string, re: RegExp) { const m = prompt.match(re); assert.ok(m, `${re} in ${prompt}`); return Number(m![1]); }
const yes = (b: boolean) => b;

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-hashing-review-v1');
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
      assert.doesNotMatch(c.prompt, /hash|\bmaps?\b|dictionary|fingerprint|signature|canonical|bucket|tree ?set|two pointers|pointer|length[- ]prefix|frequency/i, `${id}: the prompt must not name the technique`);
      const a = arrays(c.prompt)[0] ?? [];
      let expected: number | number[] | boolean;
      switch (id) {
        case 'duplicate': expected = a.some((x, i) => a.indexOf(x) !== i); break;
        case 'two-sum':
        case 'sorted-pair': {
          const t = num(c.prompt, /add up to (-?\d+)/);
          const pairs = bruteTwoSum(a, t);
          assert.equal(pairs.length, 1, `${id} variant ${variant}: the pair must be unique`);
          if (id === 'sorted-pair') assert.ok(a.every((x, i) => i === 0 || a[i - 1] <= x));
          expected = pairs[0];
          break;
        }
        case 'path': {
          const p = quoted(c.prompt)[0];
          const corners = [[0, 0]];
          for (const m of p) { const [x, y] = corners[corners.length - 1]; corners.push(m === 'N' ? [x, y + 1] : m === 'S' ? [x, y - 1] : m === 'E' ? [x + 1, y] : [x - 1, y]); }
          expected = corners.some(([x, y], i) => corners.findIndex(([u, w]) => u === x && w === y) !== i);
          break;
        }
        case 'anagram': { const [s, t] = quoted(c.prompt); expected = isAnagram(s, t); break; }
        case 'group': {
          const ws = quoted(c.prompt);
          const reps: string[] = [];
          for (const w of ws) if (!reps.some(r => isAnagram(r, w))) reps.push(w);
          expected = reps.length;
          break;
        }
        case 'streak': expected = longestRun(a); break;
        case 'frames': {
          const packed = quoted(c.prompt).at(-1)!;
          expected = unpack(packed).length;
          // the naive split would usually disagree; it must never be what the prompt is built around
          assert.ok(unpack(packed).every(s => typeof s === 'string'));
          break;
        }
        case 'isomorphic': {
          const [s, t] = quoted(c.prompt);
          const fwd = new Map<string, string>(), bwd = new Map<string, string>();
          let ok = s.length === t.length;
          for (let i = 0; ok && i < s.length; i++) {
            if ((fwd.has(s[i]) && fwd.get(s[i]) !== t[i]) || (bwd.has(t[i]) && bwd.get(t[i]) !== s[i])) ok = false;
            fwd.set(s[i], t[i]); bwd.set(t[i], s[i]);
          }
          expected = ok;
          break;
        }
        case 'nearby': {
          const k = num(c.prompt, /≤ (\d+)\?/);
          expected = a.some((x, i) => a.slice(i + 1, i + 1 + k).includes(x));
          break;
        }
        case 'top-k': {
          const k = num(c.prompt, /Return the (\d+) value/);
          const counts = [...new Set(a)].map(x => [x, a.filter(y => y === x).length]).sort((p, q) => q[1] - p[1]);
          assert.ok(counts.length === k || counts[k - 1][1] > counts[k][1], `${id} variant ${variant}: the top ${k} must be unique`);
          expected = counts.slice(0, k).map(([x]) => x).sort((p, q) => p - q);
          break;
        }
        case 'sudoku': {
          const filled = [...c.prompt.matchAll(/\((\d), (\d), (\d)\)/g)].map(m => m.slice(1).map(Number));
          assert.ok(filled.length >= 2);
          const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
          for (const [r, col, d] of filled) grid[r][col] = d;
          const groups: number[][] = [];
          for (let i = 0; i < 9; i++) {
            groups.push(grid[i], grid.map(rw => rw[i]));
            const br = 3 * Math.floor(i / 3), bc = 3 * (i % 3);
            groups.push([0, 1, 2].flatMap(dr => [0, 1, 2].map(dc => grid[br + dr][bc + dc])));
          }
          expected = groups.every(g => { const ds = g.filter(d => d > 0); return new Set(ds).size === ds.length; });
          break;
        }
        case 'happy': expected = reachesOne(num(c.prompt, /Start from (\d+)/)); break;
        case 'first-unique': {
          const s = quoted(c.prompt)[0];
          expected = [...s].findIndex(ch => s.split(ch).length === 2);
          break;
        }
        case 'ordered': {
          const x = num(c.prompt, /for x = (-?\d+)/);
          const above = a.filter(y => y > x).sort((p, q) => p - q);
          expected = above.length ? above[0] : -1;
          break;
        }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}`);
      const typed = typeof expected === 'boolean' ? (yes(expected) ? 'yes' : 'no') : JSON.stringify(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 6);
});

test('the packing prompts would fool a reader who splits on #', () => {
  let fooled = 0;
  for (let variant = 0; variant <= 20; variant++) {
    const c = practice.challengeFor('frames', variant);
    const packed = quoted(c.prompt).at(-1)!;
    if (packed.split('#').length - 1 !== c.answer) fooled++;
  }
  assert.ok(fooled >= 15, `only ${fooled} of 21 packing prompts distinguish framing from splitting`);
});
