import test from 'node:test';
import assert from 'node:assert/strict';
import { solveLab } from '../src/lib/lab.ts';
import { answerMatches } from '../src/lib/review.ts';
import { lab, fromInput, type TrieState, type Query } from '../src/lib/labs/tries.ts';
import { anatomy, wildcard, wordGrid, mixedReview } from '../src/data/tries/traces.ts';
import { hints } from '../src/data/tries/hints.ts';
import { practice, conceptIds } from '../src/data/practice/tries.ts';

// ---------- independent helpers (deliberately naive: sets, scans, brute force) ----------
const prefixSet = (ws: string[]) => { const s = new Set<string>(); for (const w of ws) for (let i = 1; i <= w.length; i++) s.add(w.slice(0, i)); return s; };
const isWord = (ws: string[], q: string) => ws.includes(q);
const hasPrefix = (ws: string[], p: string) => ws.some(w => w.startsWith(p));
const fits = (w: string, p: string) => w.length === p.length && [...p].every((c, i) => c === '.' || c === w[i]);
function onGrid(board: string[], word: string) {
  const R = board.length, C = board[0].length;
  const seen = new Set<string>();
  const go = (r: number, c: number, i: number): boolean => {
    const key = `${r},${c}`;
    if (r < 0 || c < 0 || r >= R || c >= C || seen.has(key) || board[r][c] !== word[i]) return false;
    if (i === word.length - 1) return true;
    seen.add(key);
    const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => go(r + dr, c + dc, i + 1));
    seen.delete(key);
    return ok;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0)) return true;
  return false;
}
const cells = (row: { cells: { value: string }[] }) => row.cells.map(c => c.value);
const correct = (s: { answer: number; choices: { label: string }[] }) => s.choices[s.answer].label;

test('every trace step has a valid answer and feedback for each choice', () => {
  for (const steps of [anatomy, wildcard, wordGrid, mixedReview]) for (const s of steps) {
    assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length);
    for (const c of s.choices) assert.ok(c.feedback.length > 20, c.label);
  }
});

test('chapter 1 trace: the bloom decides search, not the walk', () => {
  const garden = ['apple'];
  assert.deepEqual(cells(anatomy[0].rows[1]), ['root', 'a', 'p', 'p', 'l', 'e']);
  assert.equal(isWord(garden, 'app'), false);
  assert.match(correct(anatomy[0]), /isEnd.*false/);
  assert.equal(isWord([...garden, 'app'], 'app'), true);           // the “children” reason fails once app is added
  assert.equal(hasPrefix(garden, 'app'), true);
  assert.match(correct(anatomy[1]), /^true/);
  // inserting apt into {apple} grows exactly one node
  assert.equal(prefixSet(['apple', 'apt']).size - prefixSet(['apple']).size, 1);
  assert.match(correct(anatomy[2]), /^1:/);
  assert.equal(100_000 * 50_000, 5_000_000_000);
  assert.match(anatomy[3].choices[0].feedback, /5 billion/);
});

test('chapter 2 trace: wildcard answers match a brute-force scan', () => {
  const ws = ['bad', 'dad', 'mad'];
  assert.equal(ws.some(w => fits(w, '.ad')), true);
  assert.equal(ws.filter(w => fits(w, '.ad')).length, 3);
  assert.deepEqual(cells(wildcard[0].rows[1]), [...new Set(ws.map(w => w[0]))].sort());
  // “all must match” breaks once cat joins: the c branch fails while bad matches
  assert.equal(fits('cat', '.ad'), false);
  assert.equal(ws.some(w => fits(w, '..')), false);
  assert.deepEqual(cells(wildcard[1].rows[1]), [...prefixSet(ws)].filter(p => p.length === 2).sort());
  assert.match(correct(wildcard[1]), /^false/);
  assert.equal(26 * 26, 676); assert.equal(26 ** 5, 11_881_376);
  assert.match(correct(wildcard[2]), /676/);
});

test('chapter 3 trace and figure numbers: Word Search II', () => {
  const board = ['oaan', 'etae', 'ihkr', 'iflv'], words = ['oath', 'pea', 'eat', 'rain'];
  assert.deepEqual(words.filter(w => onGrid(board, w)).sort(), ['eat', 'oath']);
  assert.deepEqual([...new Set(words.map(w => w[0]))].sort(), ['e', 'o', 'p', 'r']);
  assert.deepEqual([...new Set(words.filter(w => w.startsWith('o')).map(w => w[1]))], ['a']);   // node “o” has one child
  assert.deepEqual(cells(wordGrid[0].rows[0]), [...board[0]]);
  assert.deepEqual(cells(wordGrid[0].rows[1]), [...board[1]]);
  assert.equal(board[0][1], 'a'); assert.equal(board[1][0], 'e');
  assert.equal(words.some(w => w.startsWith('oe')), false);
  // the path o(0,0) → a(0,1) → t(1,1) → h(2,1) is a chain of neighbours
  const path = [[0, 0], [0, 1], [1, 1], [2, 1]];
  assert.equal(path.map(([r, c]) => board[r][c]).join(''), 'oath');
  for (let i = 1; i < path.length; i++) assert.equal(Math.abs(path[i][0] - path[i - 1][0]) + Math.abs(path[i][1] - path[i - 1][1]), 1);
  // oath is the only word under “o”, so pruning empties the whole branch
  assert.deepEqual(words.filter(w => w.startsWith('o')), ['oath']);
  // the cost bound: paths of k cells from one start ≤ 4·3^(k−2); sum for k = 1..10
  let perStart = 1;
  for (let k = 2; k <= 10; k++) perStart += 4 * 3 ** (k - 2);
  assert.equal(perStart, 39_365);
  assert.equal(144 * perStart, 5_668_560);                           // ≈ 5.7 million
  assert.ok(Math.abs(144 * perStart * 30_000 - 1.7e11) < 0.01e11);   // ≈ 1.7 × 10^11
  assert.equal(30_000 * 10, 300_000);
  // the bound really is an upper bound: count simple paths of up to 10 cells from a centre cell of 12 × 12
  let count = 0;
  const used = new Set<number>();
  const walk = (r: number, c: number, len: number) => {
    count++; if (len === 10) return;
    used.add(r * 12 + c);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < 12 && nc < 12 && !used.has(nr * 12 + nc)) walk(nr, nc, len + 1);
    }
    used.delete(r * 12 + c);
  };
  walk(5, 5, 1);
  assert.ok(count <= perStart, `${count} paths`);
  assert.match(correct(wordGrid[3]), /5\.7 million/);
});

test('mixed review numbers', () => {
  assert.equal(100_000 * 100_000, 1e10);
  const adj = (a: number[]) => { const s = [...a].sort((x, y) => x - y); let m = 0; for (let i = 1; i < s.length; i++) m = Math.max(m, s[i] ^ s[i - 1]); return m; };
  const best = (a: number[]) => { let m = 0; for (const x of a) for (const y of a) m = Math.max(m, x ^ y); return m; };
  assert.equal(adj([2, 3, 5]), 6); assert.equal(best([2, 3, 5]), 7); assert.equal(2 ^ 5, 7);
  assert.equal((200_000 * 199_999) / 2 / 1e10 > 1.99, true);
  assert.deepEqual(['bear', 'early', 'hearth'].map(w => w.startsWith('ear')), [false, true, false]);
  assert.equal(2_000_000 * 8, 16_000_000); assert.equal(16_000_000 * 26, 416_000_000);
  // Ch 1 memory sketch in the lesson: 10,000 words × 8 letters
  assert.equal(10_000 * 8 * 26, 2_080_000); assert.ok(Math.abs(2_080_000 * 4 / 1e6 - 8.3) < 0.05);
});

test('every hint ladder referenced by the lesson exists with three hints', async () => {
  const { readFileSync } = await import('node:fs');
  const mdx = readFileSync(new URL('../src/dsa-lessons/tries.mdx', import.meta.url), 'utf8');
  const used = [...mdx.matchAll(/hints=\{hints\.(\w+)\}/g)].map(m => m[1]);
  assert.ok(used.length >= 9);
  for (const key of used) assert.equal(hints[key]?.length, 3, key);
  for (const key of Object.keys(hints)) assert.ok(used.includes(key), `unused hint ${key}`);
});

// ---------- lab ----------
type Oracle = (start: TrieState, final: TrieState) => void;
const oracles: Record<string, Oracle> = {
  insert: (s, f) => {
    assert.deepEqual(new Set(f.nodes.slice(1).map(n => n.prefix)), prefixSet(s.words));
    assert.equal(f.nodes.length - 1, prefixSet(s.words).size, 'no duplicate nodes');
    assert.deepEqual(new Set(f.nodes.filter(n => n.end).map(n => n.prefix)), new Set(s.words));
  },
  query: (s, f) => assert.deepEqual(f.answers, s.queries.map(q => (q.kind === 'search' ? isWord(s.words, q.text) : hasPrefix(s.words, q.text)))),
  wildcard: (s, f) => assert.equal(f.result, s.words.some(w => fits(w, s.pattern))),
};
function runCase(start: TrieState) {
  const { final, wrongMovesChangedBoard } = solveLab(lab, start, 3000);
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

test('every rejected move on every reachable state explains itself with real values', () => {
  for (const [mode, info] of Object.entries(lab.modes)) for (let v = 0; v < info.cases; v++) {
    let state = lab.create(mode, v);
    for (let guard = 0; guard < 500; guard++) {
      for (const { action } of info.actions) {
        const result = lab.move(state, action);
        if (!result.accepted && !state.done) {
          assert.doesNotMatch(result.state.message, /undefined|NaN|\[object|“”/, `${mode} case ${v}: ${action}`);
          assert.ok(result.state.message.length > 15, `${mode} case ${v}: ${action} needs an explanation`);
        }
      }
      for (const text of [lab.describe(state), ...lab.view(state).flatMap(r => r.cells.map(c => `${c.value} ${c.label ?? ''}`))])
        assert.doesNotMatch(text, /undefined|NaN/, `${mode} case ${v}`);
      if (state.done) break;
      state = lab.move(state, lab.expected(state)).state;
      assert.doesNotMatch(state.message, /undefined|NaN/);
    }
    assert.equal(state.done, true);
  }
});

test('lab agrees with brute force on random small inputs', () => {
  let seed = 16; const rnd = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const word = (min: number, max: number) => Array.from({ length: min + rnd(max - min + 1) }, () => 'abc'[rnd(3)]).join('');
  for (let t = 0; t < 150; t++) {
    const words = Array.from({ length: rnd(6) }, () => word(1, 4));
    runCase({ ...lab.create('insert'), ...fromInput({ mode: 'insert', words }) });
    const queries: Query[] = Array.from({ length: 1 + rnd(4) }, () => ({ kind: rnd(2) ? 'search' : 'prefix', text: word(1, 4) }));
    runCase({ ...lab.create('query'), ...fromInput({ mode: 'query', words, queries }) });
    const pattern = [...word(1, 4)].map(c => (rnd(3) === 0 ? '.' : c)).join('');
    runCase({ ...lab.create('wildcard'), ...fromInput({ mode: 'wildcard', words, pattern }) });
  }
});

test('the lab names the classic mistakes with the words on the board', () => {
  let s = lab.create('insert', 0);                                   // apple, app, apt
  for (let i = 0; i < 6; i++) s = lab.move(s, lab.expected(s)).state; // plant apple
  assert.match(lab.move(s, 'grow').state.message, /cut off “apple”/);
  assert.equal(lab.expected(s), 'follow');
  let q = lab.create('query', 0);                                    // search apple, search app, prefix app
  while (q.qi < 1) q = lab.move(q, lab.expected(q)).state;
  for (let i = 0; i < 3; i++) q = lab.move(q, 'step').state;
  assert.match(lab.move(q, 'true').state.message, /only the beginning of “apple”/);
  const w = lab.create('wildcard', 1);                               // ab, cd, ce · ".e"
  assert.match(lab.move(w, 'step').state.message, /dot/);
  const done = solveLab(lab, lab.create('wildcard', 1)).final;
  assert.equal(done.result, true);
  assert.ok(done.dead.length >= 1, 'the a branch was backed out of');
});

// ---------- practice ----------
const quoted = (s: string) => [...s.matchAll(/“([^”]*)”/g)].map(m => m[1]);
const between = (s: string, a: string, b: string) => { const i = s.indexOf(a); assert.ok(i >= 0, `${a} in ${s}`); const j = s.indexOf(b, i + a.length); assert.ok(j >= 0, `${b} in ${s}`); return s.slice(i + a.length, j); };
const one = (s: string, re: RegExp) => { const m = s.match(re); assert.ok(m, `${re} in ${s}`); return m![1]; };

test('every practice answer matches an independent computation from the prompt', () => {
  assert.equal(practice.storageKey, 'citadel-tries-review-v1');
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
      assert.doesNotMatch(c.prompt, /\btries?\b|prefix tree|depth-first|\bDFS\b|backtrack|binary search|bitwise|\bheap\b|\bhash/i, `${id}: the prompt must not name the technique`);
      let expected: number | boolean | string;
      switch (id) {
        case 'distinct-prefixes': expected = prefixSet(quoted(between(c.prompt, 'Words: ', '. Counting'))).size; break;
        case 'search-or-prefix': {
          const ws = quoted(between(c.prompt, 'holds exactly ', '. '));
          const m = c.prompt.match(/Is “([^”]+)” stored as a whole word\?/);
          expected = m ? isWord(ws, m[1]) : hasPrefix(ws, one(c.prompt, /start with “([^”]+)”\?/));
          break;
        }
        case 'wildcard-count': { const ws = quoted(between(c.prompt, 'Stored words: ', '. In a query')); const p = one(c.prompt, /the query “([^”]+)”\?/); expected = ws.filter(w => fits(w, p)).length; break; }
        case 'grid-words': {
          const board = quoted(between(c.prompt, 'has rows ', '. A word'));
          const ws = quoted(c.prompt.slice(c.prompt.indexOf('here are')));
          expected = ws.filter(w => onGrid(board, w)).length;
          break;
        }
        case 'count-prefix': {
          const bag = quoted(between(c.prompt, 'Add, in order: ', ' (repeats'));
          bag.splice(bag.indexOf(one(c.prompt, /remove one copy of “([^”]+)”/)), 1);
          const p = one(c.prompt, /now start with “([^”]+)”\?/);
          expected = bag.filter(w => w.startsWith(p)).length;
          break;
        }
        case 'shortest-root': {
          const roots = quoted(between(c.prompt, 'Roots: ', '. In the sentence'));
          const sentence = one(c.prompt, /In the sentence “([^”]+)”/);
          expected = sentence.split(' ').map(w => { let best: string | null = null; for (const r of roots) if (w.startsWith(r) && (best === null || r.length < best.length)) best = r; return best ?? w; }).join(' ');
          break;
        }
        case 'built-word': {
          const ws = quoted(between(c.prompt, 'Words: ', '. Find'));
          let best = '';
          for (const w of ws) {
            let ok = true; for (let i = 1; i < w.length; i++) if (!ws.includes(w.slice(0, i))) ok = false;
            if (ok && (w.length > best.length || (w.length === best.length && w < best))) best = w;
          }
          assert.ok(best.length > 0);
          expected = best;
          break;
        }
        case 'three-suggestions': {
          const ps = quoted(between(c.prompt, 'Products: ', '. A customer')).sort();
          const p = one(c.prompt, /letter\(s\), “([^”]+)”\?/);
          assert.ok(one(c.prompt, /types “([^”]+)”/).startsWith(p));
          const shown = ps.filter(x => x.startsWith(p)).slice(0, 3);
          expected = shown.length ? shown.join(' ') : 'none';
          break;
        }
        case 'max-xor': {
          const a = one(c.prompt, /\[([^\]]*)\]/).split(',').map(Number);
          let m = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) m = Math.max(m, a[i] ^ a[j]);
          expected = m; break;
        }
        case 'top-k': {
          const log = [...c.prompt.matchAll(/“(\w+)” ×(\d+)/g)].map(m => [m[1], Number(m[2])] as [string, number]);
          const p = one(c.prompt, /types “([^”]+)”/), k = Number(one(c.prompt, /shows the (\d+) most-searched/));
          expected = log.filter(([w]) => w.startsWith(p)).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, k).map(([w]) => w).join(' ');
          break;
        }
        case 'exact-lookup': {
          const dict = quoted(between(c.prompt, 'holds ', ' (in reality')), looks = quoted(between(c.prompt, 'Of the lookups ', ', how many'));
          expected = looks.filter(x => dict.includes(x)).length; break;
        }
        case 'substring': { const ws = quoted(between(c.prompt, 'Words: ', '. How many')); const s = one(c.prompt, /contain “([^”]+)” somewhere/); expected = ws.filter(w => w.includes(s)).length; break; }
        default: throw new Error(`untested concept ${id}`);
      }
      assert.deepEqual(c.answer, expected, `${id} variant ${variant}`);
      const typed = typeof expected === 'boolean' ? (expected ? 'yes' : 'no') : String(expected);
      assert.equal(answerMatches(c, typed), true, `${id} variant ${variant}: ${typed}`);
      assert.equal(answerMatches(c, 'not an answer'), false);
      assert.equal(c.hints.length, 3); assert.equal(c.rubric.length, 3);
      assert.doesNotMatch(`${c.explanation} ${c.hints.join(' ')}`, /undefined|NaN/);
    }
    assert.ok(prompts.size >= 2, `${id}: the input must vary with the variant`);
  }
  assert.ok(strategiesUsed.size >= 6);
});
