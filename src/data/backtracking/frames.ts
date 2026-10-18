// Dry-run frames for every problem in src/dsa-lessons/backtracking.mdx. One small engine replays the
// choose / explore / un-choose template; each problem supplies only its options and its stop rule.
// The last frame ends with a text view holding `answer` (checked in tests/backtracking-frames.test.ts).
import { recorder, tvars, type Frame, type View, type Val, type RecTone } from '../../lib/dryrun.ts';

const L = (a: Val[]) => `[${a.join(', ')}]`;
const KEYS = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];

interface Opt<S> {
  edge: string;
  next?: S;
  cut?: string;   // set = this option is pruned (never walked); the text says why
  say?: string;   // caption when the option is chosen
  undo?: string;  // caption when the choice is undone
}

interface Spec<S, R> {
  intro: string;
  start: S;
  label(s: S): string;
  vars(s: S): Record<string, Val>;
  options(s: S): Opt<S>[];
  result(s: S): R | undefined;
  recordSay?(s: S, r: R): string;
  deadEnd?(s: S): string;
  outro(found: R[]): string;
  answer?(found: R[]): string;
  fmt?(r: R): string;
  views?(s: S): View[];
  continueAfterResult?: boolean;  // subsets: every node is an answer and the walk goes on
  firstOnly?: boolean;            // yes/no problems: stop at the first complete answer
  batchCuts?: boolean;            // show all pruned options of a level in one frame
  noSet?: boolean;
  foundName?: string;
}

function rotate(correct: string, wrong: string[], turn: number) {
  const opts = [correct, ...wrong];
  const shift = turn % opts.length;
  const out = opts.map((_, i) => opts[(i - shift + opts.length) % opts.length]);
  return { options: out, answer: out.indexOf(correct) };
}

function search<S, R>(spec: Spec<S, R>): Frame[] {
  const r = recorder();
  const nodes: { id: string; parent?: string; label: Val; edge?: string; tone?: RecTone }[] = [{ id: 'r', label: spec.label(spec.start), tone: 'exploring' }];
  const found: R[] = [];
  const fmt = spec.fmt ?? ((x: R) => (typeof x === 'string' ? x : JSON.stringify(x)));
  let prev = spec.vars(spec.start);
  let undoTurn = 0, cutTurn = 0, stopped = false;
  const setTone = (id: string, tone: RecTone) => { nodes.find(n => n.id === id)!.tone = tone; };
  const emit = (cur: S, caption: string, predict?: Frame['predict']) => {
    const now = spec.vars(cur);
    const views: View[] = [{ kind: 'recursion', name: 'decision tree (each node = the path so far)', nodes: nodes.map(n => ({ ...n })) }, tvars(now, prev), ...(spec.views?.(cur) ?? [])];
    prev = now;
    if (!spec.noSet) views.push({ kind: 'set', name: spec.foundName ?? 'answers found', items: found.map(fmt), ...(found.length ? { changed: [found.length - 1] } : {}) });
    r.frame(caption, views, predict);
  };
  emit(spec.start, spec.intro);

  const walk = (s: S, id: string) => {
    const done = spec.result(s);
    if (done !== undefined) {
      found.push(done);
      setTone(id, 'solution');
      emit(s, spec.recordSay ? spec.recordSay(s, done) : `The path ${spec.label(s)} is a complete answer, so record a copy of it.`);
      if (spec.firstOnly) { stopped = true; return; }
      if (!spec.continueAfterResult) return;
    }
    const opts = spec.options(s);
    const walkable = opts.filter(o => !o.cut);
    if (spec.batchCuts && opts.length > walkable.length) {
      opts.forEach((o, i) => { if (o.cut) nodes.push({ id: `${id}.x${i}`, parent: id, label: 'x', edge: o.edge, tone: 'pruned' }); });
      emit(s, `Pruned before walking: ${opts.filter(o => o.cut).map(o => `${o.edge} (${o.cut})`).join('; ')}.`);
    }
    if (done === undefined && walkable.length === 0) {
      emit(s, spec.deadEnd ? spec.deadEnd(s) : `Dead end at ${spec.label(s)}: no option is left that can lead to an answer, so this call returns with nothing recorded.`);
    }
    opts.forEach((o, i) => {
      if (stopped) return;
      const cid = `${id}.${i}`;
      if (o.cut) {
        if (spec.batchCuts) return;
        nodes.push({ id: cid, parent: id, label: 'x', edge: o.edge, tone: 'pruned' });
        const q = rotate('Prune it: never walk it', ['Walk it and see what happens'], cutTurn++);
        emit(s, `Prune ${o.edge}: ${o.cut}`, { question: `The next option at this level is ${o.edge}. Walk it or prune it?`, ...q, explain: o.cut });
        return;
      }
      nodes.push({ id: cid, parent: id, label: spec.label(o.next!), edge: o.edge, tone: 'exploring' });
      emit(o.next!, o.say ?? `Choose ${o.edge}: the path becomes ${spec.label(o.next!)}.`);
      walk(o.next!, cid);
      if (stopped) return;
      setTone(cid, 'undone');
      const back = spec.label(s);
      const predict = undoTurn < 3
        ? (() => {
            const q = rotate(`Un-choose ${o.edge}: remove it, so the path is ${back}`, ['Keep it on the path and move on', 'Clear the whole path and start over'], undoTurn);
            return { question: `Everything below ${spec.label(o.next!)} is explored. What happens next?`, ...q, explain: 'Un-choose removes exactly the last choice, so the next sibling option starts from the same path its parent had.' };
          })()
        : undefined;
      undoTurn++;
      emit(s, o.undo ?? `Un-choose ${o.edge}: take it off the path, giving ${back} again. The next option at this level starts from exactly this path.`, predict);
    });
  };
  walk(spec.start, 'r');
  const ans = spec.answer ? spec.answer(found) : JSON.stringify(found);
  r.frames.push({
    caption: spec.outro(found),
    views: [{ kind: 'recursion', name: 'decision tree (each node = the path so far)', nodes: nodes.map(n => ({ ...n })) }, ...(spec.noSet ? [] : [{ kind: 'set' as const, name: spec.foundName ?? 'answers found', items: found.map(fmt) }]), tvars({ answer: ans })],
  });
  return r.frames;
}

// ---- Subsets II ---------------------------------------------------------------------------------
interface PS { path: number[]; start: number }
export function subsetsDupFrames(input: number[]): Frame[] {
  const nums = [...input].sort((a, b) => a - b);
  return search<PS, number[]>({
    intro: `Sort first: ${L(nums)}, so equal values sit side by side. Every node is a subset. At each level the loop offers the numbers from index start onward, but skips a number equal to its left neighbour when i > start.`,
    start: { path: [], start: 0 },
    label: s => L(s.path),
    vars: s => ({ path: L(s.path), start: s.start }),
    options: s => nums.slice(s.start).map((_, k) => {
      const i = s.start + k;
      if (i > s.start && nums[i] === nums[i - 1]) return { edge: `${nums[i]} (idx ${i})`, cut: `i = ${i} > start = ${s.start} and nums[${i}] equals nums[${i - 1}]. That twin already opened this identical branch at this level, so every subset below would be a duplicate.` };
      return { edge: `+${nums[i]}`, next: { path: [...s.path, nums[i]], start: i + 1 }, say: `Choose ${nums[i]} (index ${i}): path = ${L([...s.path, nums[i]])}. ${i === s.start && i > 0 && nums[i] === nums[i - 1] ? `It equals nums[${i - 1}], but i == start, so it is the first option at this level and is walked.` : ''}`.trim() };
    }),
    result: s => [...s.path],
    recordSay: s => `${L(s.path)} is a new subset, so record a copy.`,
    continueAfterResult: true,
    outro: f => `Done: ${f.length} distinct subsets, each recorded once.`,
  });
}

// ---- Combinations -------------------------------------------------------------------------------
export function combineFrames(n: number, k: number): Frame[] {
  return search<PS, number[]>({
    intro: `Choose ${k} numbers from 1..${n}. Numbers go in increasing order. With need numbers still to pick, option i is useful only if i <= ${n} − need + 1, otherwise there is no room left for the rest.`,
    start: { path: [], start: 1 },
    label: s => L(s.path),
    vars: s => ({ path: L(s.path), start: s.start, need: k - s.path.length }),
    options: s => {
      const need = k - s.path.length, out: Opt<PS>[] = [];
      if (need === 0) return out;
      for (let i = s.start; i <= n; i++) {
        if (i > n - need + 1) { out.push({ edge: `${i}`, cut: `need ${need} more number${need > 1 ? 's' : ''} and only ${n - i + 1} (counting ${i}) remain, so there is no room. Every later option fails the same way.` }); break; }
        out.push({ edge: `+${i}`, next: { path: [...s.path, i], start: i + 1 } });
      }
      return out;
    },
    result: s => (s.path.length === k ? [...s.path] : undefined),
    recordSay: s => `The path ${L(s.path)} has ${k} numbers, so it is a full hand. Record a copy and return: going deeper could only make bigger hands.`,
    outro: f => `Done: ${f.length} combinations. The room-left prune never walked a dead end.`,
  });
}

// ---- Combination Sum (reuse allowed) and Combination Sum II (each once, duplicates in the list) --
interface CS { path: number[]; remain: number; start: number }
function comboSumSpec(cands: number[], target: number, once: boolean): Spec<CS, number[]> {
  const c = [...cands].sort((a, b) => a - b);
  return {
    intro: once
      ? `Sort the coins: ${L(c)}. Each coin may be used once, so the child starts at i + 1. A twin of the previous coin at the same level is skipped. We carry remain = target − sum. Record at remain 0.`
      : `Sort the coins: ${L(c)}. A coin may be reused, so the child starts at i (not i + 1) and never looks left. We carry remain = target − sum. Record at remain 0.`,
    start: { path: [], remain: target, start: 0 },
    label: s => L(s.path),
    vars: s => ({ path: L(s.path), remain: s.remain, start: s.start }),
    options: s => {
      const out: Opt<CS>[] = [];
      for (let i = s.start; i < c.length; i++) {
        if (once && i > s.start && c[i] === c[i - 1]) { out.push({ edge: `${c[i]} (idx ${i})`, cut: `a twin of c[${i - 1}] at the same level. That coin already opened this identical branch.` }); continue; }
        if (c[i] > s.remain) { out.push({ edge: `${c[i]}`, cut: `${c[i]} is more than remain = ${s.remain}, and the coins are sorted, so every later coin overshoots too. break.` }); break; }
        out.push({ edge: `+${c[i]}`, next: { path: [...s.path, c[i]], remain: s.remain - c[i], start: once ? i + 1 : i }, say: `Choose ${c[i]}: remain ${s.remain} → ${s.remain - c[i]}. The child starts at index ${once ? i + 1 : i}${once ? ' (each coin once).' : ' (this coin may come again, no coin to its left).'}` });
      }
      return out;
    },
    result: s => (s.remain === 0 ? [...s.path] : undefined),
    recordSay: s => `remain is 0: ${L(s.path)} pays exactly ${target}. Record a copy.`,
    deadEnd: s => `remain is ${s.remain} and every coin left is too big (or none are left). Nothing below ${L(s.path)} can reach ${target}, so return.`,
    outro: f => `Done: ${f.length} combination${f.length === 1 ? '' : 's'} pay exactly ${target}.`,
  };
}
export const combinationSumFrames = (cands: number[], target: number) => search(comboSumSpec(cands, target, false));
export const combinationSum2Frames = (cands: number[], target: number) => search(comboSumSpec(cands, target, true));

// ---- Letter Combinations ------------------------------------------------------------------------
interface LS { pos: number; path: string }
export function letterFrames(digits: string): Frame[] {
  return search<LS, string>({
    intro: `Each digit has its own list of letters. Depth is the position in the word: at depth pos the options are the letters of digits[pos]. There is no start index and no used flags, because each level has a different menu.`,
    start: { pos: 0, path: '' },
    label: s => (s.path === '' ? '""' : `"${s.path}"`),
    vars: s => ({ path: `"${s.path}"`, pos: s.pos }),
    options: s => (s.pos >= digits.length ? [] : [...KEYS[+digits[s.pos]]].map(ch => ({ edge: ch, next: { pos: s.pos + 1, path: s.path + ch } }))),
    result: s => (digits.length > 0 && s.pos === digits.length ? s.path : undefined),
    recordSay: s => `pos == ${digits.length}: one letter per digit. Record "${s.path}".`,
    outro: f => `Done: ${f.length} words.`,
  });
}

// ---- Permutations and Permutations II -----------------------------------------------------------
interface PM { path: number[]; used: boolean[] }
function permSpec(input: number[], unique: boolean): Spec<PM, number[]> {
  const a = unique ? [...input].sort((x, y) => x - y) : input;
  const n = a.length;
  return {
    intro: unique
      ? `Sorted: ${L(a)}. Order matters, so every unused item is an option at every level. Equal values would repeat orderings, so a twin may only be used when its left twin is already on the path.`
      : `Order matters, so every item not already on the path is an option at every level (no start index). used[i] is true exactly for the items on the path.`,
    start: { path: [], used: a.map(() => false) },
    label: s => L(s.path),
    vars: s => ({ path: L(s.path), used: `[${s.used.map(u => (u ? 'T' : 'F')).join(' ')}]` }),
    options: s => {
      const out: Opt<PM>[] = [];
      a.forEach((v, i) => {
        if (s.used[i]) return;
        if (unique && i > 0 && a[i] === a[i - 1] && !s.used[i - 1]) { out.push({ edge: `${v} (idx ${i})`, cut: `its left twin (index ${i - 1}) is not on the path. Using this copy now would put the copies out of order and repeat an ordering that the left copy builds.` }); return; }
        const used = s.used.slice(); used[i] = true;
        out.push({ edge: `+${v}`, next: { path: [...s.path, v], used }, say: `Choose ${v} (index ${i}): set used[${i}] = true and add it. path = ${L([...s.path, v])}.`, undo: `Un-choose ${v}: remove it AND set used[${i}] = false. Both pieces of state are undone, so ${v} is available again for the next branch.` });
      });
      return out;
    },
    result: s => (s.path.length === n ? [...s.path] : undefined),
    recordSay: s => `The path holds all ${n} items. Record a copy of ${L(s.path)}.`,
    outro: f => `Done: ${f.length} ${unique ? 'distinct ' : ''}orderings.`,
  };
}
export const permuteFrames = (nums: number[]) => search(permSpec(nums, false));
export const permuteUniqueFrames = (nums: number[]) => search(permSpec(nums, true));

// ---- Word Search --------------------------------------------------------------------------------
interface WS { path: [number, number][]; k: number }
export function wordSearchFrames(board: string[][], word: string): Frame[] {
  const R = board.length, C = board[0].length;
  const grid = (s: WS): View => ({
    kind: 'grid', name: 'board (# = on the current path)',
    cells: board.map((row, r) => row.map((ch, c) => (s.path.some(([pr, pc]) => pr === r && pc === c) ? '#' : ch))),
    tones: s.path.map(([r, c], i) => ({ r, c, tone: i === s.path.length - 1 ? 'compared' as const : 'active' as const })),
  });
  return search<WS, true>({
    intro: `Find "${word}". The search tries every cell as the start; from a cell that matches it tries down, up, right, left. Neighbours outside the board are not drawn. A cell on the current path is overwritten with # so it cannot be used twice.`,
    start: { path: [], k: 0 },
    label: s => (s.path.length ? s.path.map(([r, c]) => `${board[r][c]}${r}${c}`).join('>') : 'start'),
    vars: s => ({ matched: word.slice(0, s.k) || '-', needs: s.k < word.length ? word[s.k] : 'done' }),
    options: s => {
      const out: Opt<WS>[] = [];
      const at = (r: number, c: number, edge: string) => {
        const need = word[s.k];
        if (s.path.some(([pr, pc]) => pr === r && pc === c)) { out.push({ edge, cut: `(${r}, ${c}) is already on the path, marked #. A cell cannot be used twice.` }); return; }
        if (board[r][c] !== need) { out.push({ edge, cut: `(${r}, ${c}) holds ${board[r][c]}, but the next letter needed is ${need}.` }); return; }
        const next: WS = { path: [...s.path, [r, c]], k: s.k + 1 };
        out.push({ edge, next, say: `Step onto (${r}, ${c}): ${board[r][c]} matches ${need}. Mark it #: choose.`, undo: `Restore (${r}, ${c}) to ${board[r][c]}: un-choose. A failed path must not leave marks that block a different path.` });
      };
      if (s.path.length === 0) { for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) at(r, c, `start (${r},${c})`); return out; }
      const [pr, pc] = s.path[s.path.length - 1];
      ([[1, 0, 'down'], [-1, 0, 'up'], [0, 1, 'right'], [0, -1, 'left']] as [number, number, string][]).forEach(([dr, dc, name]) => {
        const r = pr + dr, c = pc + dc;
        if (r >= 0 && c >= 0 && r < R && c < C) at(r, c, `${name} (${r},${c})`);
      });
      return out;
    },
    result: s => (s.k === word.length ? true : undefined),
    recordSay: () => `Every letter of "${word}" is matched. The call returns true, and every caller above returns true at once.`,
    deadEnd: s => `The path spells "${word.slice(0, s.k)}" but no neighbour can supply ${word[s.k]}. This call returns false.`,
    firstOnly: true,
    noSet: true,
    views: s => [grid(s)],
    answer: f => String(f.length > 0),
    outro: f => (f.length ? `The word is on the board: the answer is true.` : `Every start and every path failed: the answer is false.`),
  });
}

// ---- Palindrome Partitioning --------------------------------------------------------------------
interface PP { start: number; path: string[] }
const isPal = (s: string) => s === [...s].reverse().join('');
export function palindromeFrames(s: string): Frame[] {
  return search<PP, string[]>({
    intro: `Cut "${s}" into pieces that are all palindromes. At each level the options are the end positions of the next piece, which begins at start. A piece that is not a palindrome is pruned.`,
    start: { start: 0, path: [] },
    label: p => L(p.path),
    vars: p => ({ pieces: L(p.path), start: p.start }),
    options: p => {
      const out: Opt<PP>[] = [];
      for (let end = p.start; end < s.length; end++) {
        const piece = s.slice(p.start, end + 1);
        if (!isPal(piece)) out.push({ edge: piece, cut: `"${piece}" reads "${[...piece].reverse().join('')}" backwards, so it is not a palindrome. No partition can use it.` });
        else out.push({ edge: piece, next: { start: end + 1, path: [...p.path, piece] }, say: `"${piece}" is a palindrome: add it as a piece. The next piece starts at ${end + 1}.` });
      }
      return out;
    },
    result: p => (p.start === s.length ? [...p.path] : undefined),
    recordSay: p => `start == ${s.length}: every letter belongs to a piece. Record ${L(p.path)}.`,
    outro: f => `Done: ${f.length} partitions.`,
  });
}

// ---- N-Queens -----------------------------------------------------------------------------------
interface NQ { cols: number[] }
export function queensFrames(n: number): Frame[] {
  const board = (s: NQ): View => ({
    kind: 'grid', name: `board (Q = queen, row ${Math.min(s.cols.length, n - 1)} is next)`,
    cells: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (s.cols[r] === c ? 'Q' : '.'))),
    tones: s.cols.map((c, r) => ({ r, c, tone: 'active' as const })),
  });
  return search<NQ, number[]>({
    intro: `Place one queen per row, so the row is the depth. The options in a row are the columns. A square is pruned when its column, its diagonal (r − c) or its anti-diagonal (r + c) already holds a queen. The board shows the queens placed so far.`,
    start: { cols: [] },
    label: s => L(s.cols),
    vars: s => ({ 'queen columns': L(s.cols), row: s.cols.length }),
    options: s => {
      const r = s.cols.length, out: Opt<NQ>[] = [];
      if (r === n) return out;
      for (let c = 0; c < n; c++) {
        const hit = s.cols.findIndex((qc, qr) => qc === c || qr - qc === r - c || qr + qc === r + c);
        if (hit >= 0) {
          const qc = s.cols[hit];
          const why = qc === c ? `column ${c} is taken by the queen in row ${hit}` : hit - qc === r - c ? `diagonal r − c = ${r - c} is taken by the queen at (${hit}, ${qc})` : `anti-diagonal r + c = ${r + c} is taken by the queen at (${hit}, ${qc})`;
          out.push({ edge: `col ${c}`, cut: why });
        } else out.push({ edge: `col ${c}`, next: { cols: [...s.cols, c] }, say: `(${r}, ${c}) is free: place a queen. Mark its column, r − c = ${r - c} and r + c = ${r + c}.`, undo: `Lift the queen at (${r}, ${c}) and clear its column and both diagonals. Row ${r} then tries its next column.` });
      }
      return out;
    },
    result: s => (s.cols.length === n ? [...s.cols] : undefined),
    recordSay: s => `All ${n} rows hold a queen. Record the board ${L(s.cols)} (column of each row).`,
    deadEnd: s => `Row ${s.cols.length} has no free square: every column is watched. This call returns, and the caller lifts its queen and tries its next column.`,
    batchCuts: true,
    views: s => [board(s)],
    outro: f => `Done: ${f.length} solutions for n = ${n}.`,
  });
}

// ---- Generate Parentheses -----------------------------------------------------------------------
interface GP { s: string; open: number; close: number }
export function parenFrames(n: number): Frame[] {
  return search<GP, string>({
    intro: `Each position is ( or ). We count openers and closers placed. ( is allowed while open < ${n}. ) is allowed while close < open, because a closer needs an unmatched opener before it.`,
    start: { s: '', open: 0, close: 0 },
    label: p => `"${p.s}"`,
    vars: p => ({ string: `"${p.s}"`, open: p.open, close: p.close }),
    options: p => {
      if (p.s.length === 2 * n) return [];
      const out: Opt<GP>[] = [];
      out.push(p.open < n ? { edge: '(', next: { s: p.s + '(', open: p.open + 1, close: p.close } } : { edge: '(', cut: `open = ${n}: all ${n} openers are already used.` });
      out.push(p.close < p.open ? { edge: ')', next: { s: p.s + ')', open: p.open, close: p.close + 1 } } : { edge: ')', cut: `close = open = ${p.close}: there is no unmatched opener to close, so this prefix could never balance.` });
      return out;
    },
    result: p => (p.s.length === 2 * n ? p.s : undefined),
    recordSay: p => `Length ${2 * n} and every prefix was valid, so "${p.s}" is balanced. Record it.`,
    outro: f => `Done: ${f.length} balanced strings. No walked branch was a dead end.`,
  });
}

// ---- Combination Sum III ------------------------------------------------------------------------
export function combinationSum3Frames(k: number, n: number): Frame[] {
  return search<CS, number[]>({
    intro: `Choose exactly ${k} different numbers from 1..9 that add to ${n}. Fixed size ${k}, a remaining sum, and each number once, so the child starts at d + 1. At size ${k}, record only if remain is 0.`,
    start: { path: [], remain: n, start: 1 },
    label: s => L(s.path),
    vars: s => ({ path: L(s.path), remain: s.remain, start: s.start }),
    options: s => {
      const out: Opt<CS>[] = [];
      if (s.path.length === k) return out;
      for (let d = s.start; d <= 9; d++) {
        if (d > s.remain) { out.push({ edge: `${d}`, cut: `${d} is more than remain = ${s.remain}, and the numbers only get bigger, so break.` }); break; }
        out.push({ edge: `+${d}`, next: { path: [...s.path, d], remain: s.remain - d, start: d + 1 } });
      }
      return out;
    },
    result: s => (s.path.length === k && s.remain === 0 ? [...s.path] : undefined),
    recordSay: s => `${k} numbers and remain 0: record ${L(s.path)}.`,
    deadEnd: s => (s.path.length === k ? `${k} numbers are chosen but remain is ${s.remain}, not 0. Do not record; return.` : `remain is ${s.remain} and no larger number fits. Return.`),
    outro: f => `Done: ${f.length} combination${f.length === 1 ? '' : 's'}.`,
  });
}

// ---- Restore IP Addresses -----------------------------------------------------------------------
interface IP { start: number; parts: string[] }
export function restoreIpFrames(s: string): Frame[] {
  return search<IP, string>({
    intro: `Insert three dots in "${s}" to make four parts, each 0 to 255 with no leading zero. The options at each level are piece lengths 1, 2 and 3. A piece is pruned if it breaks a rule, or if the digits left cannot fill the parts left (between 1 and 3 digits per part).`,
    start: { start: 0, parts: [] },
    label: p => (p.parts.length ? p.parts.join('.') : '""'),
    vars: p => ({ parts: L(p.parts), start: p.start, 'digits left': s.length - p.start }),
    options: p => {
      const out: Opt<IP>[] = [];
      if (p.parts.length === 4) return out;
      for (let len = 1; len <= 3 && p.start + len <= s.length; len++) {
        const piece = s.slice(p.start, p.start + len);
        if (len > 1 && piece[0] === '0') { out.push({ edge: piece, cut: `"${piece}" has a leading zero. Longer pieces from here would too, so break.` }); break; }
        if (+piece > 255) { out.push({ edge: piece, cut: `${piece} is more than 255. Longer pieces would be bigger, so break.` }); break; }
        const left = 3 - p.parts.length, rest = s.length - p.start - len;
        if (left === 0 ? rest !== 0 : rest < left || rest > 3 * left) { out.push({ edge: piece, cut: left === 0 ? `this would be the 4th part but ${rest} digit${rest === 1 ? '' : 's'} would be left over.` : `after "${piece}", ${rest} digit${rest === 1 ? '' : 's'} remain for ${left} more part${left > 1 ? 's' : ''}, which need between ${left} and ${3 * left}.` }); continue; }
        out.push({ edge: piece, next: { start: p.start + len, parts: [...p.parts, piece] } });
      }
      return out;
    },
    result: p => (p.parts.length === 4 && p.start === s.length ? p.parts.join('.') : undefined),
    recordSay: p => `Four valid parts use every digit. Record ${p.parts.join('.')}.`,
    outro: f => `Done: ${f.length} address${f.length === 1 ? '' : 'es'}.`,
  });
}

// ---- Partition to K Equal Sum Subsets -----------------------------------------------------------
interface KP { i: number; buckets: number[] }
export function kPartitionFrames(input: number[], k: number): Frame[] {
  const total = input.reduce((a, b) => a + b, 0), side = total / k;
  const a = [...input].sort((x, y) => y - x);
  if (total % k !== 0 || a[0] > side) {
    const r = recorder();
    r.frame(total % k !== 0 ? `The total ${total} is not divisible by ${k}, so equal shares are impossible. Return false without searching.` : `The biggest coin ${a[0]} exceeds the share ${side}, so it fits in no bucket. Return false without searching.`,
      [tvars({ total, share: side, answer: 'false' })]);
    return r.frames;
  }
  return search<KP, true>({
    intro: `Each of the ${k} buckets must reach exactly ${side}. Place the coins biggest first, ${L(a)}: big coins hit the limit early, so bad branches die near the root. At each level the options are the buckets.`,
    start: { i: 0, buckets: Array(k).fill(0) },
    label: s => `[${s.buckets.join(' | ')}]`,
    vars: s => ({ buckets: `[${s.buckets.join(' | ')}]`, 'next coin': s.i < a.length ? a[s.i] : '-' }),
    options: s => {
      const out: Opt<KP>[] = [];
      if (s.i >= a.length) return out;
      const x = a[s.i];
      s.buckets.forEach((b, j) => {
        if (b + x > side) { out.push({ edge: `${x} → b${j}`, cut: `${b} + ${x} = ${b + x} is over the share ${side}.` }); return; }
        if (b === 0 && s.buckets.findIndex(v => v === 0) < j) { out.push({ edge: `${x} → b${j}`, cut: `bucket ${j} is empty, like bucket ${s.buckets.findIndex(v => v === 0)}. Empty buckets are interchangeable, so if the coin fails in the first one it fails here too.` }); return; }
        const buckets = s.buckets.slice(); buckets[j] += x;
        out.push({ edge: `${x} → b${j}`, next: { i: s.i + 1, buckets }, say: `Put ${x} in bucket ${j}: ${b} → ${b + x}.`, undo: `Take ${x} back out of bucket ${j}: ${b + x} → ${b}. Then try the next bucket for this coin.` });
      });
      return out;
    },
    result: s => (s.i === a.length ? true : undefined),
    recordSay: () => `Every coin is placed without overflow. The buckets add up to ${total} = ${k} × ${side} and none exceeds ${side}, so each is exactly ${side}. Return true.`,
    deadEnd: s => `Coin ${a[s.i]} fits in no bucket without going over ${side}. This call returns false, and the caller undoes its last placement.`,
    firstOnly: true,
    noSet: true,
    answer: f => String(f.length > 0),
    outro: f => (f.length ? 'An equal split exists: true.' : 'No placement works: false.'),
  });
}
