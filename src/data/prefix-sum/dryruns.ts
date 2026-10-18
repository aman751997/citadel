// Dry-run frames for prefix-sum.mdx. Every number is computed from the input, so frames cannot drift from the algorithm.
import { recorder, tvars } from '../../lib/dryrun.ts';
import type { Frame, Predict, Val, View } from '../../lib/dryrun.ts';

const floorMod = (x: number, k: number) => ((x % k) + k) % k;
const arr = (name: string, values: Val[], extra: Partial<Extract<View, { kind: 'array' }>> = {}): View => ({ kind: 'array', name, values, ...extra });
const mapView = (name: string, entries: [Val, Val][], changed?: number[], note?: string): View => ({ kind: 'map', name, entries, ...(changed ? { changed } : {}), ...(note ? { note } : {}) });
// Puts the correct option at position `slot` so the right answer is not always first.
function ask(question: string, correct: string, wrong: string[], slot: number, explain: string): Predict {
  const options = [...wrong];
  options.splice(slot % (wrong.length + 1), 0, correct);
  return { question, options, answer: options.indexOf(correct), explain };
}

export function rangeSumFrames(nums: number[], queries: [number, number][]): Frame[] {
  const r = recorder();
  const p = [0];
  r.frame('prefix[0] = 0 is the sum of nothing. It is written first so that a range starting at index 0 also has a "before" line to subtract.',
    [arr('nums', nums), arr('prefix', [0], { tones: { 0: 'done' } })]);
  nums.forEach((x, i) => {
    p.push(p[i] + x);
    r.frame(`prefix[${i + 1}] = prefix[${i}] + nums[${i}] = ${p[i]} + ${x} = ${p[i + 1]}. It is the sum of the first ${i + 1} value(s), and it never changes later.`,
      [arr('nums', nums, { pointers: [{ at: i, label: 'i' }] }), arr('prefix', p.slice(), { tones: { [i + 1]: 'active' } })],
      i === 2 ? ask(`What will prefix[${i + 1}] be?`, String(p[i + 1]), [String(p[i]), String(p[i] + x + 1)], 1,
        `prefix[${i}] is ${p[i]}, nums[${i}] is ${x}, and ${p[i]} + ${x} = ${p[i + 1]}.`) : undefined);
  });
  queries.forEach(([l, rr], qi) => {
    const ans = p[rr + 1] - p[l];
    r.frame(`Query ${l}..${rr}: sum = prefix[${rr + 1}] - prefix[${l}] = ${p[rr + 1]} - ${p[l]} = ${ans}. Both lines contain the first ${l} value(s), so they cancel and leave nums[${l}..${rr}].`,
      [arr('nums', nums, { regions: [{ from: l, to: rr, label: `${l}..${rr}`, tone: 'gold' }] }),
        arr('prefix', p, { pointers: [{ at: l, label: 'before l', tone: 'blue' }, { at: rr + 1, label: 'through r', tone: 'green' }] }),
        tvars({ answer: ans })],
      ask(`Query ${l}..${rr}: which subtraction gives the sum?`, `prefix[${rr + 1}] - prefix[${l}]`,
        [`prefix[${rr}] - prefix[${l}]`, `prefix[${rr + 1}] - prefix[${l + 1}]`], qi,
        `prefix[r + 1] holds everything through index r; prefix[l] holds everything before index l.`));
  });
  return r.frames;
}

export function pivotFrames(nums: number[]): Frame[] {
  const r = recorder();
  const n = nums.length, total = nums.reduce((a, b) => a + b, 0);
  r.frame(`Compute the total once: ${total}. leftSum starts at 0 because nothing is left of index 0.`,
    [arr('nums', nums), tvars({ total, leftSum: 0 })]);
  let left = 0;
  for (let i = 0; i < n; i++) {
    const right = total - left - nums[i];
    const regions: { from: number; to: number; label: string; tone: 'blue' | 'green' }[] = [];
    if (i > 0) regions.push({ from: 0, to: i - 1, label: `left ${left}`, tone: 'blue' });
    if (i < n - 1) regions.push({ from: i + 1, to: n - 1, label: `right ${right}`, tone: 'green' });
    const hit = left === right;
    r.frame(`i = ${i}: right = total - leftSum - nums[i] = ${total} - ${left} - ${nums[i]} = ${right}. ${hit ? 'Left equals right, so i is the pivot. It is the first match, so it is the leftmost.' : `${left} is not ${right}. Only now add nums[${i}] to leftSum.`}`,
      [arr('nums', nums, { pointers: [{ at: i, label: 'i', tone: hit ? 'purple' : 'gold' }], regions, ...(hit ? { tones: { [i]: 'found' } } : {}) }),
        tvars({ leftSum: left, 'nums[i]': nums[i], right })],
      i >= 2 ? ask(`At i = ${i}, leftSum is ${left}. Is this the pivot?`, hit ? 'Yes' : 'No', [hit ? 'No' : 'Yes'], hit ? 0 : 1,
        `right = ${total} - ${left} - ${nums[i]} = ${right}, compared with leftSum = ${left}.`) : undefined);
    if (hit) { r.frame(`Answer: ${i}.`, [tvars({ answer: i })]); return r.frames; }
    left += nums[i];
  }
  r.frame('No index balances, so the answer is -1.', [tvars({ answer: -1 })]);
  return r.frames;
}

export function productFrames(nums: number[]): Frame[] {
  const r = recorder();
  const n = nums.length;
  const ans: Val[] = Array(n).fill('·');
  r.frame('Plan: pass 1 puts the product of everything LEFT of i into answer[i]. Pass 2 multiplies in the product of everything RIGHT of i.',
    [arr('nums', nums), arr('answer', ans.slice())]);
  const left: number[] = [1];
  ans[0] = 1;
  r.frame('Pass 1: nothing is left of index 0, so answer[0] is the empty product 1.',
    [arr('nums', nums, { pointers: [{ at: 0, label: 'i' }] }), arr('answer', ans.slice(), { tones: { 0: 'active' } })]);
  for (let i = 1; i < n; i++) {
    left[i] = left[i - 1] * nums[i - 1];
    ans[i] = left[i];
    r.frame(`Pass 1: answer[${i}] = answer[${i - 1}] * nums[${i - 1}] = ${left[i - 1]} * ${nums[i - 1]} = ${left[i]}. That is the product of nums[0..${i - 1}].`,
      [arr('nums', nums, { pointers: [{ at: i, label: 'i' }] }), arr('answer', ans.slice(), { tones: { [i]: 'active' } })]);
  }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    const before = Number(ans[i]);
    ans[i] = before * suffix;
    const nextSuffix = suffix * nums[i];
    const doneTones: Record<number, 'done'> = {};
    for (let j = i + 1; j < n; j++) doneTones[j] = 'done';
    r.frame(`Pass 2: answer[${i}] = ${before} * suffix(${suffix}) = ${ans[i]}. Then suffix = ${suffix} * nums[${i}] = ${nextSuffix}, ready for index ${i - 1}.`,
      [arr('nums', nums, { pointers: [{ at: i, label: 'i' }] }), arr('answer', ans.slice(), { tones: { ...doneTones, [i]: 'active' } }), tvars({ suffix })],
      i === n - 2 ? ask(`answer[${i}] currently holds ${before}. What does it become?`, String(before * suffix), [String(before * suffix * nums[i]), String(before * nums[i])], 1,
        `Multiply by the suffix BEFORE folding nums[${i}] into it: ${before} * ${suffix}.`) : undefined);
    suffix = nextSuffix;
  }
  r.frame(`Every slot now holds the product of all the other values: [${ans.join(', ')}].`, [arr('answer', ans.slice(), { tones: Object.fromEntries(ans.map((_, i) => [i, 'done'])) as Record<number, 'done'> })]);
  return r.frames;
}

export function countKFrames(nums: number[], k: number): Frame[] {
  const r = recorder();
  const seen = new Map<number, number>([[0, 1]]);
  const entries = (): [Val, Val][] => [...seen.entries()].map(([t, c]) => [t, `x${c}`]);
  r.frame('Seed the map with total 0 seen once: the empty prefix, the "line before" index 0. Without it, runs that start at index 0 are never counted.',
    [arr('nums', nums), mapView('seen (total, times)', entries(), [0])]);
  let run = 0, count = 0;
  nums.forEach((x, j) => {
    run += x;
    const need = run - k, found = seen.get(need) ?? 0;
    count += found;
    seen.set(run, (seen.get(run) ?? 0) + 1);
    const tones: Record<number, 'done'> = {};
    for (let q = 0; q < j; q++) tones[q] = 'done';
    r.frame(`j = ${j}: running = ${run}. Look up running - k = ${need}: ${found ? `found ${found} time(s), so ${found} run(s) end here` : 'not in the map, so no run ends here'}. Then record ${run}.`,
      [arr('nums', nums, { pointers: [{ at: j, label: 'j' }], tones }),
        mapView('seen (total, times)', entries(), [[...seen.keys()].indexOf(run)]),
        tvars({ running: run, 'running - k': need, found, count })],
      ask(`running = ${run}, k = ${k}. How many runs end at index ${j}?`, String(found), [String(found + 1), String(Math.max(0, found - 1) === found ? found + 2 : Math.max(0, found - 1))], j, `The map holds ${need} ${found ? found + ' time(s)' : '0 times'}.`));
  });
  r.frame(`Done. count = ${count}.`, [tvars({ answer: count })]);
  return r.frames;
}

export function multipleKFrames(nums: number[], k: number): Frame[] {
  const r = recorder();
  const first = new Map<number, number>([[0, -1]]);
  const entries = (): [Val, Val][] => [...first.entries()];
  r.frame('Seed remainder 0 at index -1: the empty prefix sits just before index 0, so a run 0..j has length j - (-1) = j + 1.',
    [arr('nums', nums), mapView('first index of each remainder', entries(), [0])]);
  let rem = 0;
  for (let i = 0; i < nums.length; i++) {
    rem = (rem + nums[i]) % k;
    const f = first.get(rem);
    const stop = f !== undefined && i - f >= 2;
    const what = f === undefined ? 'new' : stop ? 'stop' : 'short';
    if (f === undefined) first.set(rem, i);
    const msg = f === undefined ? `Remainder ${rem} is new, so store its first index ${i}.`
      : stop ? `Remainder ${rem} was first seen at ${f}. Length ${i} - ${f} = ${i - f} is at least 2: the stretch ${f + 1}..${i} is a multiple of ${k}. Return true.`
      : `Remainder ${rem} was first seen at ${f}, but length ${i} - ${f} = ${i - f} is too short. Keep the FIRST index; do not overwrite.`;
    r.frame(`i = ${i}: running remainder = ${rem}. ${msg}`,
      [arr('nums', nums, { pointers: [{ at: i, label: 'i' }], ...(stop ? { regions: [{ from: (f as number) + 1, to: i, label: 'multiple of k', tone: 'gold' as const }] } : {}) }),
        mapView('first index of each remainder', entries(), [[...first.keys()].indexOf(rem)]), tvars({ remainder: rem })],
      ask(`Remainder ${rem} at index ${i}. What happens?`,
        what === 'new' ? 'Store the index' : what === 'stop' ? 'Length is at least 2: return true' : 'Seen, but too short: ignore',
        ['Store the index', 'Length is at least 2: return true', 'Seen, but too short: ignore'].filter(o => o !== (what === 'new' ? 'Store the index' : what === 'stop' ? 'Length is at least 2: return true' : 'Seen, but too short: ignore')), i, msg));
    if (stop) { r.frame('Answer: true.', [tvars({ answer: 'true' })]); return r.frames; }
  }
  r.frame('No remainder repeats at distance 2 or more. Answer: false.', [tvars({ answer: 'false' })]);
  return r.frames;
}

export function equalZerosOnesFrames(nums: number[]): Frame[] {
  const r = recorder();
  const first = new Map<number, number>([[0, -1]]);
  const entries = (): [Val, Val][] => [...first.entries()];
  r.frame('Turn 0 into -1 and keep a running balance. Seed balance 0 at index -1 so stretches starting at index 0 are found.',
    [arr('nums', nums), mapView('first index of each balance', entries(), [0])]);
  let bal = 0, best = 0;
  nums.forEach((x, i) => {
    bal += x === 1 ? 1 : -1;
    const f = first.get(bal);
    let msg: string;
    if (f === undefined) { first.set(bal, i); msg = `Balance ${bal} is new: store first index ${i}.`; }
    else { const len = i - f; best = Math.max(best, len); msg = `Balance ${bal} was first at ${f}, so ${f + 1}..${i} is balanced, length ${len}. best = ${best}.`; }
    r.frame(`i = ${i}: nums[i] = ${x} counts as ${x === 1 ? '+1' : '-1'}, balance = ${bal}. ${msg}`,
      [arr('nums', nums, { pointers: [{ at: i, label: 'i' }], ...(f !== undefined && i - f === best ? { regions: [{ from: f + 1, to: i, label: `length ${best}`, tone: 'gold' as const }] } : {}) }),
        mapView('first index of each balance', entries(), [[...first.keys()].indexOf(bal)]), tvars({ balance: bal, best })],
      ask(`Balance is ${bal} at index ${i}. Does a balanced stretch end here?`, f === undefined ? 'No, store the index' : 'Yes, balance seen before',
        [f === undefined ? 'Yes, balance seen before' : 'No, store the index'], i, msg));
  });
  r.frame(`Answer: ${best}.`, [tvars({ answer: best })]);
  return r.frames;
}

export function divisibleFrames(nums: number[], k: number): Frame[] {
  const r = recorder();
  const seen = Array(k).fill(0);
  seen[0] = 1;
  const tallies = (hot?: number) => arr('seen[remainder]', seen.slice(), { ...(hot !== undefined ? { tones: { [hot]: 'active' as const } } : {}) });
  r.frame(`seen[r] counts earlier running totals with remainder r. Seed seen[0] = 1 for the empty prefix. The array has k = ${k} slots.`, [arr('nums', nums), tallies(0)]);
  let rem = 0, count = 0;
  nums.forEach((x, i) => {
    const raw = (rem + x) % k;
    rem = floorMod(rem + x, k);
    const add = seen[rem];
    count += add;
    seen[rem]++;
    r.frame(`i = ${i}: (previous + ${x}) % ${k} in Java is ${raw}${raw < 0 ? ', negative!' : ''}; folded into 0..${k - 1} it is ${rem}. Add seen[${rem}] = ${add} to count, then increment it.`,
      [arr('nums', nums, { pointers: [{ at: i, label: 'i' }] }), tallies(rem), tvars({ remainder: rem, 'raw %': raw, added: add, count })],
      ask(`Java remainder is ${raw}. Which slot of seen is used?`, String(rem), [String(raw), String(rem + 1 < k ? rem + 1 : 0)].filter((o, idx, a) => o !== String(rem) && a.indexOf(o) === idx), i,
        `Fold with ((x % k) + k) % k so the slot is always in 0..${k - 1}.`));
  });
  r.frame(`Answer: ${count}.`, [tvars({ answer: count })]);
  return r.frames;
}

export function niceFrames(nums: number[], k: number): Frame[] {
  const r = recorder();
  const seen = new Map<number, number>([[0, 1]]);
  const entries = (): [Val, Val][] => [...seen.entries()].map(([t, c]) => [t, `x${c}`]);
  r.frame('Replace each value by 1 (odd) or 0 (even). "Exactly k odd numbers" becomes "sum is k". Seed odd-count 0 once.',
    [arr('nums', nums), mapView('seen (odd count, times)', entries(), [0])]);
  let odd = 0, count = 0;
  nums.forEach((x, i) => {
    odd += x & 1;
    const add = odd >= k ? seen.get(odd - k) ?? 0 : 0;
    count += add;
    seen.set(odd, (seen.get(odd) ?? 0) + 1);
    r.frame(`i = ${i}: ${x} is ${x & 1 ? 'odd' : 'even'}, so odd = ${odd}. Look up odd - k = ${odd - k}: ${add} earlier line(s). count = ${count}.`,
      [arr('nums', nums, { pointers: [{ at: i, label: 'i' }], tones: { ...Object.fromEntries(nums.map((v, q) => [q, v & 1 && q <= i ? 'compared' : undefined]).filter(e => e[1])) } }),
        mapView('seen (odd count, times)', entries(), [[...seen.keys()].indexOf(odd)]), tvars({ odd, 'odd - k': odd - k, added: add, count })],
      i >= 3 ? ask(`odd = ${odd}, k = ${k}. How many stretches end at index ${i}?`, String(add), [String(add + 1), String(add + 2)], i, `Look up seen[${odd - k}], which is ${add}.`) : undefined);
  });
  r.frame(`Answer: ${count}.`, [tvars({ answer: count })]);
  return r.frames;
}

export function xorFrames(arrIn: number[], queries: [number, number][]): Frame[] {
  const r = recorder();
  const px = [0];
  r.frame('px[0] = 0 is the XOR of nothing. XOR cancels itself (x ^ x = 0), so the shared beginning of two prefixes cancels like in sums.',
    [arr('arr', arrIn), arr('px', [0], { tones: { 0: 'done' } })]);
  arrIn.forEach((x, i) => {
    px.push(px[i] ^ x);
    r.frame(`px[${i + 1}] = px[${i}] ^ arr[${i}] = ${px[i]} ^ ${x} = ${px[i + 1]}.`,
      [arr('arr', arrIn, { pointers: [{ at: i, label: 'i' }] }), arr('px', px.slice(), { tones: { [i + 1]: 'active' } })]);
  });
  queries.forEach(([l, rr], qi) => {
    const ans = px[rr + 1] ^ px[l];
    r.frame(`Query ${l}..${rr}: px[${rr + 1}] ^ px[${l}] = ${px[rr + 1]} ^ ${px[l]} = ${ans}. The first ${l} value(s) appear in both prefixes and cancel.`,
      [arr('arr', arrIn, { regions: [{ from: l, to: rr, label: `${l}..${rr}`, tone: 'gold' }] }),
        arr('px', px, { pointers: [{ at: l, label: 'before l', tone: 'blue' }, { at: rr + 1, label: 'through r', tone: 'green' }] }), tvars({ answer: ans })],
      ask(`Query ${l}..${rr}: what is px[${rr + 1}] ^ px[${l}]?`, String(ans), [String(px[rr + 1] - px[l]), String(px[rr + 1] ^ px[l + 1])].filter(o => o !== String(ans)), qi,
        `${px[rr + 1]} ^ ${px[l]} = ${ans}. Plain subtraction is the wrong operation for XOR.`));
  });
  return r.frames;
}

export function gridFrames(m: number[][], q: [number, number, number, number]): Frame[] {
  const r = recorder();
  const rows = m.length, cols = m[0].length;
  const P: (number | null)[][] = Array.from({ length: rows + 1 }, (_, i) => Array.from({ length: cols + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null)));
  const grid = (tones: { r: number; c: number; tone: 'active' | 'compared' | 'found' | 'out' | 'done' }[] = []): View =>
    ({ kind: 'grid', name: 'P (n + 1 by m + 1)', cells: P.map(row => row.slice()), tones });
  const mat: View = { kind: 'grid', name: 'matrix', cells: m };
  r.frame('P has one extra row and column of zeros. P[r+1][c+1] will hold the total of the block from (0,0) to (r,c).', [mat, grid()]);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = P[i][j + 1] as number, b = P[i + 1][j] as number, c = P[i][j] as number;
    P[i + 1][j + 1] = m[i][j] + a + b - c;
    r.frame(`P[${i + 1}][${j + 1}] = m[${i}][${j}] + above (${a}) + left (${b}) - corner (${c}) = ${P[i + 1][j + 1]}. The corner is inside both "above" and "left", so it was counted twice and is removed once.`,
      [{ ...mat, tones: [{ r: i, c: j, tone: 'active' }] } as View, grid([{ r: i + 1, c: j + 1, tone: 'active' }, { r: i, c: j + 1, tone: 'compared' }, { r: i + 1, c: j, tone: 'compared' }, { r: i, c: j, tone: 'out' }])]);
  }
  const [r1, c1, r2, c2] = q;
  const big = P[r2 + 1][c2 + 1] as number, top = P[r1][c2 + 1] as number, lft = P[r2 + 1][c1] as number, cor = P[r1][c1] as number;
  const ans = big - top - lft + cor;
  r.frame(`Query rows ${r1}..${r2}, columns ${c1}..${c2}: ${big} - ${top} - ${lft} + ${cor} = ${ans}. Big block, minus the strip above, minus the strip to the left, plus the corner that was removed twice.`,
    [grid([{ r: r2 + 1, c: c2 + 1, tone: 'found' }, { r: r1, c: c2 + 1, tone: 'out' }, { r: r2 + 1, c: c1, tone: 'out' }, { r: r1, c: c1, tone: 'active' }]), tvars({ answer: ans })],
    ask('Which sign does the corner P[r1][c1] get?', 'Plus', ['Minus', 'It is not used'], 0, 'The strip above and the strip to the left both contain the corner block, so subtracting both removes it twice. Add it back once.'));
  return r.frames;
}

export function rangeUpdatesFrames(n: number, bookings: [number, number, number][]): Frame[] {
  const r = recorder();
  const diff = Array(n + 1).fill(0);
  r.frame(`diff has n + 1 = ${n + 1} slots; the last is a spare past the end. Each booking pins +v where it starts and -v just after it ends.`, [arr('diff', diff.slice())]);
  bookings.forEach(([f, l, v], bi) => {
    diff[f - 1] += v; diff[l] -= v;
    r.frame(`Booking [${f}, ${l}, ${v}]: flights are 1-indexed, so +${v} goes to slot ${f - 1} and -${v} to slot ${l}, one past its last flight.`,
      [arr('diff', diff.slice(), { tones: { [f - 1]: 'active', [l]: 'swapped' } })],
      ask(`Booking [${f}, ${l}, ${v}]: which slot gets -${v}?`, `Slot ${l}`, [`Slot ${l - 1}`, `Slot ${l + 1}`], bi, `The booking covers flights ${f}..${l}, which are slots ${f - 1}..${l - 1}. Switch it off at the next slot, ${l}.`));
  });
  const out: number[] = [];
  let run = 0;
  for (let i = 0; i < n; i++) {
    const prev = run;
    run += diff[i];
    out.push(run);
    r.frame(`Sweep slot ${i}: running = ${prev} + diff[${i}] (${diff[i]}) = ${run}. That is flight ${i + 1}'s total.`,
      [arr('diff', diff.slice(), { pointers: [{ at: i, label: 'i' }] }), arr('answer', out.slice(), { tones: { [i]: 'active' } })]);
  }
  r.frame(`Answer: [${out.join(', ')}].`, [arr('answer', out, { tones: Object.fromEntries(out.map((_, i) => [i, 'done'])) as Record<number, 'done'> })]);
  return r.frames;
}
