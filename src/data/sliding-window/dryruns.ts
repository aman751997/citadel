// Frame builders for the <DryRun> step-throughs in the Sliding Window lesson.
// Each one simulates the exact algorithm shown in the lesson's Java, so the captions state the real state.
import { recorder, tvars, type Frame, type View, type ArrayView, type CellTone, type Val, type Predict } from '../../lib/dryrun.ts';

type Mode = 'longest' | 'shortest' | 'count';

const arr = (values: Val[], left: number, right: number, name = 'window', tones: Record<number, CellTone> = {}): ArrayView => {
  const n = values.length;
  const base: Record<number, CellTone> = {};
  for (let i = 0; i < n; i++) if (i < left) base[i] = 'out'; else if (i <= right) base[i] = 'active';
  const pointers: NonNullable<ArrayView['pointers']> = [];
  if (right >= 0 && left === right) pointers.push({ at: left, label: 'left/right' });
  else {
    if (right >= 0) pointers.push({ at: right, label: 'right' });
    if (left < n) pointers.push({ at: left, label: 'left', tone: 'blue' });
  }
  const regions = left <= right ? [{ from: left, to: right, label: `window (${right - left + 1})`, tone: 'gold' as const }] : [];
  return { kind: 'array', name, values, pointers, regions, tones: { ...base, ...tones } };
};

interface Spec {
  title: string;
  values: Val[];
  add(i: number): void;
  drop(i: number): void;
  bad(l: number, r: number): boolean;
  addNote(i: number): string;
  dropNote(i: number): string;
  why(l: number, r: number): string;
  vars(l: number, r: number): Record<string, Val>;
  view?(): View;
  measure?(l: number, r: number): number;
  answer?(l: number, r: number): Val;
  badLabel?: string;
}

// The one loop every variable window shares. `mode` says where the record happens.
function run(spec: Spec, mode: Mode): Frame[] {
  const rec = recorder();
  const n = spec.values.length;
  const measure = spec.measure ?? ((l, r) => r - l + 1);
  let left = 0, best = mode === 'shortest' ? Infinity : 0, total = 0, bl = 0, br = -1;
  let prev: Record<string, Val> | undefined;
  const shown = (r: number) => {
    const extra: Record<string, Val> = mode === 'count' ? { total } : { best: best === Infinity ? 'none' : best };
    const now = { left, right: r, ...spec.vars(left, r), ...extra };
    const v = tvars(now, prev);
    prev = now;
    return v;
  };
  const views = (r: number, tones: Record<number, CellTone> = {}): View[] => [arr(spec.values, left, r, 'window', tones), ...(spec.view ? [spec.view()] : []), shown(r)];
  const mv = (what: string): Predict['options'] => ['Expand: move right', 'Shrink: move left', what];
  rec.frame('Start: the window is empty, left = 0. The window only ever changes by moving right (expand) or left (shrink).', views(-1));
  for (let r = 0; r < n; r++) {
    spec.add(r);
    rec.frame(`Expand: right moves to ${r} and takes ${spec.values[r]} into the window. ${spec.addNote(r)} We always expand once per step because every element must enter the window exactly once.`, views(r, { [r]: 'compared' }));
    let first = true;
    while (spec.bad(left, r)) {
      if (mode === 'shortest') {
        const len = measure(left, r);
        const better = len < best;
        if (better) { best = len; bl = left; br = r; }
        const q: Predict | undefined = first ? {
          question: `${spec.why(left, r)}. The window qualifies. What is the next move?`,
          options: ['Expand: move right', 'Shrink at once', 'Record the length, then shrink'], answer: 2,
          explain: 'In a shortest problem the window qualifies right now, and shrinking will destroy that fact. Record first, then shrink.',
        } : undefined;
        rec.frame(`The window qualifies (${spec.why(left, r)}). Record its length ${len} before left moves. ${better ? `New best: ${len}.` : `Best stays ${best}.`}`, views(r), q);
      }
      const gone = spec.values[left];
      const why = spec.why(left, r);
      const q: Predict | undefined = mode !== 'shortest' && first ? {
        question: `The window is illegal (${why}). What is the next move?`,
        options: mv('Record the length'), answer: 1,
        explain: 'Expanding only adds items, and an illegal window stays illegal when it grows. Only dropping items from the left can repair it.',
      } : undefined;
      spec.drop(left);
      left++;
      const reason = mode === 'shortest' ? 'we have logged this window, and growing it further could only make it longer' : `shrinking is the only way to repair it (${why})`;
      rec.frame(`Shrink: left moves past ${gone} to ${left}, because ${reason}. ${spec.dropNote(left - 1)}`, views(r, { [left - 1]: 'out' }), q);
      first = false;
    }
    if (mode !== 'shortest') {
      const len = measure(left, r);
      if (mode === 'longest') {
        const better = len > best;
        if (better) { best = len; bl = left; br = r; }
        rec.frame(`The window is legal again, so record it after the shrink loop. Length ${len}${better ? `: new best ${len}.` : `, best stays ${best}.`}`, views(r));
      } else {
        total += len;
        rec.frame(`The window is legal, so every start from ${left} to ${r} works. That is ${len} windows ending at ${r}, so total grows by ${len}.`, views(r));
      }
    } else {
      rec.frame(`The window does not qualify, so nothing is recorded. Expand to bring in more.`, views(r));
    }
  }
  const ans = mode === 'count' ? total : best === Infinity ? (spec.answer ? '' : 0) : spec.answer ? spec.answer(bl, br) : best;
  rec.frame(`Every element has entered once and left at most once. Answer: ${ans === '' ? 'none (empty)' : ans}.`, [arr(spec.values, left, n - 1, 'window'), tvars({ answer: ans === '' ? '(empty)' : ans })]);
  return rec.frames;
}

const countMap = () => new Map<Val, number>();
const entries = (m: Map<Val, number>): [Val, Val][] => [...m.entries()].map(([k, v]) => [k, v]);
const inc = (m: Map<Val, number>, k: Val) => m.set(k, (m.get(k) ?? 0) + 1);
const dec = (m: Map<Val, number>, k: Val) => { const c = (m.get(k) ?? 0) - 1; if (c === 0) m.delete(k); else m.set(k, c); };

// ---- Chapter 3 and side quest 2: at most k zeros ----
export function zerosFrames(a: number[], k: number, deleteOne = false): Frame[] {
  let zeros = 0;
  return run({
    title: 'zeros', values: a,
    add: i => { if (a[i] === 0) zeros++; },
    drop: i => { if (a[i] === 0) zeros--; },
    bad: () => zeros > k,
    addNote: i => (a[i] === 0 ? `It is a 0, so zeros becomes ${zeros}.` : `It is a 1, so zeros stays ${zeros}.`),
    dropNote: i => (a[i] === 0 ? `The dropped item was a 0, so zeros falls to ${zeros}.` : `The dropped item was a 1, so zeros stays ${zeros}.`),
    why: () => `zeros = ${zeros}, limit ${k}`,
    vars: () => ({ zeros }),
    measure: deleteOne ? (l, r) => r - l : undefined,
  }, 'longest');
}

// ---- Chapter 4: no repeated characters (counting version) ----
export function noRepeatFrames(s: string): Frame[] {
  const m = countMap();
  const chars = [...s];
  return run({
    title: 'no-repeat', values: chars,
    add: i => inc(m, chars[i]),
    drop: i => dec(m, chars[i]),
    bad: (_l, r) => (m.get(chars[r]) ?? 0) > 1,
    addNote: i => ((m.get(chars[i]) ?? 0) > 1 ? `'${chars[i]}' now appears ${m.get(chars[i])} times, so the window has a repeat.` : `'${chars[i]}' appears once, so the window is still all different.`),
    dropNote: i => `count of '${chars[i]}' is now ${m.get(chars[i]) ?? 0}.`,
    why: (_l, r) => `'${chars[r]}' appears ${m.get(chars[r])} times`,
    vars: (l, r) => ({ distinct: m.size }),
    view: () => ({ kind: 'map', name: 'counts in window', entries: entries(m) }),
  }, 'longest');
}

// ---- Chapter 5 and side quest 1: at most k distinct values ----
export function distinctFrames(a: number[], k: number, countMode = false): Frame[] {
  const m = countMap();
  return run({
    title: 'distinct', values: a,
    add: i => inc(m, a[i]),
    drop: i => dec(m, a[i]),
    bad: () => m.size > k,
    addNote: i => `Its count is now ${m.get(a[i])}; the window holds ${m.size} kind${m.size === 1 ? '' : 's'}.`,
    dropNote: i => (m.has(a[i]) ? `Its count fell to ${m.get(a[i])}, so the key stays: that kind is still in the window.` : `Its count hit 0, so the key is removed. Now ${m.size} kind${m.size === 1 ? '' : 's'}.`),
    why: () => `${m.size} kinds, limit ${k}`,
    vars: () => ({ kinds: m.size }),
    view: () => ({ kind: 'map', name: 'counts in window', entries: entries(m) }),
  }, countMode ? 'count' : 'longest');
}

// ---- Chapter 6: replace characters, with the stale maxFreq ----
export function repaintFrames(s: string, k: number): Frame[] {
  const m = countMap();
  const chars = [...s];
  let maxFreq = 0;
  const trueMax = () => Math.max(0, ...m.values());
  return run({
    title: 'repaint', values: chars,
    add: i => { inc(m, chars[i]); maxFreq = Math.max(maxFreq, m.get(chars[i])!); },
    drop: i => dec(m, chars[i]),
    bad: (l, r) => r - l + 1 - maxFreq > k,
    addNote: i => `maxFreq = max(previous, ${m.get(chars[i])}) = ${maxFreq}.`,
    dropNote: () => (trueMax() < maxFreq ? `maxFreq stays ${maxFreq} although the real maximum in the window is now ${trueMax()}. It is stale, and that is safe: it can only keep the window the same size.` : `maxFreq ${maxFreq} is still accurate.`),
    why: (l, r) => `length ${r - l + 1} - maxFreq ${maxFreq} = ${r - l + 1 - maxFreq}, limit ${k}`,
    vars: (l, r) => ({ maxFreq, 'len - maxFreq': Math.max(0, r - l + 1 - maxFreq) }),
    view: () => ({ kind: 'map', name: 'counts in window', entries: entries(m) }),
  }, 'longest');
}

// ---- Chapter 7: shortest subarray with sum >= target ----
export function tollFrames(a: number[], target: number): Frame[] {
  let sum = 0;
  return run({
    title: 'toll', values: a,
    add: i => { sum += a[i]; },
    drop: i => { sum -= a[i]; },
    bad: () => sum >= target,
    addNote: () => `Sum becomes ${sum}; the target is ${target}.`,
    dropNote: () => `Sum falls to ${sum}.`,
    why: () => `sum ${sum} >= target ${target}`,
    vars: () => ({ sum, target }),
  }, 'shortest');
}

// ---- Side quest 3: product below k, counting ----
export function productFrames(a: number[], k: number): Frame[] {
  let product = 1;
  return run({
    title: 'product', values: a,
    add: i => { product *= a[i]; },
    drop: i => { product /= a[i]; },
    bad: (l, r) => l <= r && product >= k, // an empty window has product 1; without the guard k <= 1 would shrink past the end
    addNote: () => `Product becomes ${product}; it must stay below ${k}.`,
    dropNote: () => `Dividing by the dropped value leaves product ${product}.`,
    why: () => `product ${product} >= k ${k}`,
    vars: () => ({ product }),
  }, 'count');
}

// ---- Chapter 8: minimum window substring ----
export function minWindowFrames(s: string, t: string): Frame[] {
  const chars = [...s];
  const need: Record<string, number> = {};
  for (const c of t) need[c] = (need[c] ?? 0) + 1;
  let missing = t.length;
  const keys = () => [...new Set([...t, ...Object.keys(need).filter(c => need[c] !== 0)])].sort();
  return run({
    title: 'min-window', values: chars,
    add: i => { const c = chars[i]; if ((need[c] ?? 0) > 0) missing--; need[c] = (need[c] ?? 0) - 1; },
    drop: i => { const c = chars[i]; need[c] = (need[c] ?? 0) + 1; if (need[c] > 0) missing++; },
    bad: () => missing === 0,
    addNote: i => ((need[chars[i]] ?? 0) >= 0 ? `'${chars[i]}' was still needed, so missing drops to ${missing}.` : `'${chars[i]}' was not needed (surplus or not in t), so missing stays ${missing}.`),
    dropNote: i => (need[chars[i]] > 0 ? `'${chars[i]}' is needed again, so missing rises to ${missing} and the window stops covering t.` : `'${chars[i]}' was surplus, so missing stays ${missing}.`),
    why: () => 'missing = 0, so the window covers t',
    vars: () => ({ missing }),
    view: () => ({ kind: 'map', name: 'need (negative = surplus)', entries: keys().map(c => [c, need[c] ?? 0] as [Val, Val]) }),
    answer: (l, r) => chars.slice(l, r + 1).join(''),
  }, 'shortest');
}

// ---- Chapter 2: permutation in string (fixed window with a diff table) ----
export function anagramFrames(s1: string, s2: string): Frame[] {
  const rec = recorder();
  const k = s1.length;
  const chars = [...s2];
  const diff: Record<string, number> = {};
  for (const c of s1) diff[c] = (diff[c] ?? 0) + 1;
  const unb = () => Object.values(diff).filter(x => x !== 0).length;
  const dview = (): View => ({ kind: 'map', name: 'diff = need - have (non-zero only)', entries: Object.keys(diff).filter(c => diff[c] !== 0).sort().map(c => [c, diff[c]] as [Val, Val]) });
  const set = (c: string, d: number) => { diff[c] = (diff[c] ?? 0) + d; };
  let prev: Record<string, Val> | undefined;
  const vars = (r: number) => { const now = { right: r, unbalanced: unb() }; const v = tvars(now, prev); prev = now; return v; };
  rec.frame(`The window is exactly ${k} wide, the length of "${s1}", because an anagram has the same letters and the same length. diff starts as the letter counts of s1, so ${unb()} letters are unbalanced.`, [{ kind: 'array', name: 's2', values: chars }, dview(), vars(-1)]);
  for (let r = 0; r < chars.length; r++) {
    set(chars[r], -1);
    const out = r >= k ? chars[r - k] : null;
    if (out) set(out, +1);
    const l = Math.max(0, r - k + 1);
    const full = r >= k - 1;
    const found = full && unb() === 0;
    const tones: Record<number, CellTone> = {};
    if (found) for (let i = l; i <= r; i++) tones[i] = 'found';
    const note = out ? `Expand to ${r} (adds "${chars[r]}") and shrink by one (drops "${out}") so the window stays ${k} wide.` : `Expand to ${r} (adds "${chars[r]}"). The window is not full yet, so nothing shrinks.`;
    const q: Predict | undefined = full ? {
      question: `After this slide the window is "${chars.slice(l, r + 1).join('')}". How many letters are unbalanced?`,
      options: ['0', '1', '2'], answer: Math.min(unb(), 2),
      explain: found ? 'Zero means every letter count matches s1, so the window is a permutation.' : `${unb()} letter(s) still differ from s1, so this window is not a permutation.`,
    } : undefined;
    rec.frame(`${note} ${full ? (found ? 'unbalanced is 0: this window is a permutation of s1.' : `unbalanced is ${unb()}, so not a match yet.`) : ''}`,
      [arr(chars, l, r, 's2', tones), dview(), vars(r)], q);
    if (found) break;
  }
  const ok = unb() === 0 && chars.length >= k;
  rec.frame(ok ? 'Found a window with unbalanced = 0, so return true. One match is enough.' : 'No window reached unbalanced = 0, so return false.', [tvars({ answer: String(ok) })]);
  return rec.frames;
}

// ---- Chapter 4 (jump version): why Math.max matters ----
export function noRepeatJumpFrames(s: string): Frame[] {
  const rec = recorder();
  const chars = [...s];
  const last: Record<string, number> = {};
  let left = 0, best = 0, prev: Record<string, Val> | undefined;
  const lv = () => ({ kind: 'map', name: 'lastSeen', entries: Object.keys(last).map(c => [c, last[c]] as [Val, Val]) }) as View;
  const vars = (r: number) => { const now = { left, right: r, best }; const v = tvars(now, prev); prev = now; return v; };
  rec.frame('left = 0 and lastSeen is empty. Each step, right moves forward, and left may jump forward past an earlier copy of the new character.', [arr(chars, 0, -1), lv(), vars(-1)]);
  for (let r = 0; r < chars.length; r++) {
    const c = chars[r];
    const old = c in last ? last[c] : -1;
    const target = old + 1;
    const newLeft = Math.max(left, target);
    const trap = target < left;
    const q: Predict | undefined = trap ? {
      question: `right is on '${c}', lastSeen['${c}'] = ${old}, and left = ${left}. Where does left go?`,
      options: [`${target} (lastSeen + 1)`, `${left} (stay)`, '0'], answer: 1,
      explain: `The earlier '${c}' is already behind left, so it is not inside the window. Moving left back to ${target} would bring old characters back and allow a repeat.`,
    } : undefined;
    const prevLeft = left;
    left = newLeft;
    last[c] = r;
    best = Math.max(best, r - left + 1);
    rec.frame(`Expand to ${r} ('${c}'). ${old === -1 ? 'Never seen, so left stays.' : trap ? `max(${prevLeft}, ${old} + 1) = ${left}: the old copy is outside the window, so left must not move backwards.` : `Earlier copy at ${old} is inside the window, so left jumps (shrinks) to max(${prevLeft}, ${old} + 1) = ${left}.`} Record length ${r - left + 1}.`,
      [arr(chars, left, r), lv(), vars(r)], q);
  }
  rec.frame(`Done. The longest window with no repeats has length ${best}.`, [tvars({ answer: best })]);
  return rec.frames;
}

// ---- Chapter 9: sliding window maximum with a deque ----
export function dequeMaxFrames(a: number[], k: number): Frame[] {
  const rec = recorder();
  const dq: number[] = [];
  const out: number[] = [];
  const qv = (changed: number[] = [], removed: Val[] = []): View => ({ kind: 'queue', name: 'deque (index:value), front = max', items: dq.map(i => `${i}:${a[i]}`), changed, removed });
  const res = (): View => tvars({ results: out.length ? out.join(', ') : '(none yet)' });
  rec.frame(`The window is ${k} wide. The deque holds indices whose values are strictly decreasing, so its front is always the maximum.`, [arr(a, 0, -1), qv(), res()]);
  for (let r = 0; r < a.length; r++) {
    const popped: string[] = [];
    const ph = dq.length && a[dq[dq.length - 1]] <= a[r];
    while (dq.length && a[dq[dq.length - 1]] <= a[r]) { const i = dq.pop()!; popped.push(`${i}:${a[i]}`); }
    dq.push(r);
    const l = Math.max(0, r - k + 1);
    const q: Predict | undefined = ph ? {
      question: `Value ${a[r]} arrives. Which deque entries leave from the back?`,
      options: ['None', 'Only entries with a smaller value', 'Every entry whose value is <= the newcomer'], answer: 2,
      explain: `An older entry that is no taller than ${a[r]} will leave the window before it does, so it can never be the maximum again.`,
    } : undefined;
    rec.frame(`Expand: right = ${r} brings in ${a[r]}. ${popped.length ? `Pop from the back: ${popped.join(', ')} (no taller, and older, so never the maximum again).` : 'Nothing at the back is <= it, so nothing is popped.'} Push ${r}.`, [arr(a, l, r), qv([dq.length - 1], popped), res()], q);
    if (dq[0] <= r - k) {
      const gone = dq.shift()!;
      rec.frame(`Shrink: the window is ${k} wide, so index ${gone} has left it. Pop it from the front.`, [arr(a, l, r), qv([], [`${gone}:${a[gone]}`]), res()]);
    }
    if (r >= k - 1) {
      out.push(a[dq[0]]);
      rec.frame(`The window is full. Its maximum is the front of the deque: ${a[dq[0]]}.`, [arr(a, l, r, 'window', { [dq[0]]: 'found' }), qv(), res()]);
    }
  }
  rec.frame(`Every index was pushed once and popped at most once. Result: [${out.join(', ')}].`, [tvars({ answer: `[${out.join(', ')}]` })]);
  return rec.frames;
}

// ---- Chapter 10: buy and sell once ----
export function stockFrames(p: number[]): Frame[] {
  const rec = recorder();
  let buy = 0, best = 0, prev: Record<string, Val> | undefined;
  const vars = (sell: number) => { const now = { buy, sell, 'p[buy]': p[buy], best }; const v = tvars(now, prev); prev = now; return v; };
  const view = (sell: number): View => ({ kind: 'array', name: 'prices', values: p, pointers: [{ at: buy, label: 'buy', tone: 'blue' }, ...(sell !== buy ? [{ at: sell, label: 'sell' }] : [])], tones: Object.fromEntries(p.map((_, i) => [i, i < buy ? 'out' as CellTone : 'active' as CellTone]).filter(([i]) => (i as number) <= Math.max(buy, sell))) });
  rec.frame('Day 0 is the cheapest price seen so far, so buy = 0. The sell pointer walks forward one day at a time; there is no shrink loop.', [view(0), vars(0)]);
  for (let sell = 1; sell < p.length; sell++) {
    if (p[sell] < p[buy]) {
      const q: Predict = { question: `Day ${sell} costs ${p[sell]}, below the current buy price ${p[buy]}. What happens?`, options: ['Sell today for a loss', 'Move buy to today', 'Ignore it'], answer: 1, explain: 'A lower price is a better buy day for every later sale, so buy jumps to today.' };
      buy = sell;
      rec.frame(`Day ${sell}: ${p[sell]} is a new low, so buy jumps to day ${sell}. Any later sale does better buying here.`, [view(sell), vars(sell)], q);
    } else {
      const gain = p[sell] - p[buy];
      const better = gain > best;
      const q: Predict = { question: `Buying at ${p[buy]}, what is the profit from selling on day ${sell} at ${p[sell]}?`, options: [String(gain - 1), String(gain), String(gain + 1)], answer: 1, explain: `${p[sell]} - ${p[buy]} = ${gain}.` };
      if (better) best = gain;
      rec.frame(`Day ${sell}: sell at ${p[sell]} against buy price ${p[buy]} gives ${gain}. ${better ? `That beats the old best, so best = ${best}.` : `Best stays ${best}.`}`, [view(sell), vars(sell)], q);
    }
  }
  rec.frame(`Every day was considered as a sell day against the cheapest earlier day. Answer: ${best}.`, [tvars({ answer: best })]);
  return rec.frames;
}

// ---- Side quest 4: cards from either end, via the leftover window ----
export function cardsFrames(a: number[], k: number): Frame[] {
  const rec = recorder();
  const n = a.length, keep = n - k;
  const total = a.reduce((x, y) => x + y, 0);
  let win = a.slice(0, keep).reduce((x, y) => x + y, 0), smallest = win;
  let prev: Record<string, Val> | undefined;
  const vars = () => { const now = { total, keep, window: win, smallest }; const v = tvars(now, prev); prev = now; return v; };
  rec.frame(`Taking ${k} cards from the ends leaves ${keep} cards together in the middle. So minimise a fixed window of ${keep} and subtract it from the total ${total}.`, [arr(a, 0, keep - 1), vars()]);
  for (let r = keep; r < n; r++) {
    win += a[r] - a[r - keep];
    const better = win < smallest;
    if (better) smallest = win;
    rec.frame(`Slide: add ${a[r]}, drop ${a[r - keep]}, so the leftover block sums to ${win}. ${better ? `New smallest: ${win}.` : `Smallest stays ${smallest}.`}`, [arr(a, r - keep + 1, r), vars()],
      { question: `The leftover block was ${win - a[r] + a[r - keep]}. Add ${a[r]}, drop ${a[r - keep]}. New sum?`, options: [String(win - 1), String(win), String(win + 1)], answer: 1, explain: `${win - a[r] + a[r - keep]} + ${a[r]} - ${a[r - keep]} = ${win}.` });
  }
  rec.frame(`The best score is total - smallest leftover = ${total} - ${smallest} = ${total - smallest}.`, [tvars({ answer: total - smallest })]);
  return rec.frames;
}

// ---- Side quest 5: shortest subarray with negatives (prefix sums + deque of starts) ----
export function negativesFrames(a: number[], k: number): Frame[] {
  const rec = recorder();
  const n = a.length;
  const prefix = [0];
  for (const x of a) prefix.push(prefix[prefix.length - 1] + x);
  const dq: number[] = [];
  let best = n + 1;
  const qv = (changed: number[] = [], removed: Val[] = []): View => ({ kind: 'queue', name: 'starts (index:prefix), prefixes increasing', items: dq.map(i => `${i}:${prefix[i]}`), changed, removed });
  const pv = (end: number): View => ({ kind: 'array', name: 'prefix', values: prefix, pointers: [{ at: end, label: 'end' }, ...(dq.length ? [{ at: dq[0], label: 'front', tone: 'blue' as const }] : [])], tones: Object.fromEntries(prefix.map((_, i) => [i, i < end ? 'visited' as CellTone : 'active' as CellTone]).filter(([i]) => (i as number) <= end)) });
  rec.frame(`prefix[j] is the sum of the first j numbers, so a subarray sum is prefix[end] - prefix[start]. We need prefix[end] - prefix[start] >= ${k} with end - start as small as possible. The deque keeps candidate starts.`, [pv(0), qv(), tvars({ best: 'none' })]);
  for (let end = 0; end <= n; end++) {
    const records: string[] = [];
    const front: string[] = [];
    while (dq.length && prefix[end] - prefix[dq[0]] >= k) { const s = dq.shift()!; best = Math.min(best, end - s); records.push(`start ${s} gives length ${end - s}`); front.push(`${s}:${prefix[s]}`); }
    const back: string[] = [];
    while (dq.length && prefix[dq[dq.length - 1]] >= prefix[end]) { const s = dq.pop()!; back.push(`${s}:${prefix[s]}`); }
    dq.push(end);
    const q: Predict | undefined = front.length ? { question: `prefix[end] = ${prefix[end]}. The front start has a small enough prefix to reach ${k}. What happens to it?`, options: ['Keep it for later', 'Record the length and pop it from the front'], answer: 1, explain: 'A later end from the same start would only give a longer window, so once it is recorded the start is finished.' } : undefined;
    rec.frame(`end = ${end}, prefix ${prefix[end]}. ${records.length ? `Pop from the front and record: ${records.join('; ')}.` : 'The front start does not reach the target yet.'} ${back.length ? `Pop from the back (higher or equal prefix and earlier, so never a better start): ${back.join(', ')}.` : ''} Push ${end}.`,
      [pv(end), qv([dq.length - 1], [...front, ...back]), tvars({ best: best > n ? 'none' : best })], q);
  }
  rec.frame(`Answer: ${best <= n ? best : -1}.`, [tvars({ answer: best <= n ? best : -1 })]);
  return rec.frames;
}
