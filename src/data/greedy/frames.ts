// Dry-run frames for src/dsa-lessons/greedy.mdx. Each generator replays the lesson's Java loop on a small input.
// Every frame says which choice was made and, in the `settled` variable, what that choice has made final.
// The last frame always carries a text variable `answer` (checked against brute force in tests/greedy-frames.test.ts).
import { recorder, tvars } from '../../lib/dryrun.ts';
import type { CellTone, Frame, Predict, PtrTone, Val, View } from '../../lib/dryrun.ts';

type Arr = Partial<Extract<View, { kind: 'array' }>>;
const arr = (name: string, values: Val[], extra: Arr = {}): View => ({ kind: 'array', name, values, ...extra });
const ptr = (at: number, label: string, tone: PtrTone = 'gold') => ({ at, label, tone });
const q = (question: string, options: string[], answer: number, explain: string): Predict => ({ question, options, answer, explain });
const sign = (n: number) => (n < 0 ? `−${-n}` : String(n));

// A text-view factory that remembers the previous values so changed variables get flagged.
function vars() {
  let prev: Record<string, Val> | undefined;
  return (now: Record<string, Val>) => { const v = tvars(now, prev); prev = now; return v; };
}

export function kadaneFrames(nums: number[]): Frame[] {
  const r = recorder(), tv = vars();
  let run = nums[0], best = nums[0], runL = 0, bestL = 0, bestR = 0;
  const view = (i: number): View => arr('nums', nums, {
    pointers: [ptr(i, 'i')], regions: [{ from: runL, to: i, label: 'run', tone: 'blue' }],
    tones: Object.fromEntries(Array.from({ length: bestR - bestL + 1 }, (_, k) => [bestL + k, 'found' as CellTone])),
  });
  r.frame(`Start run and best at nums[0] = ${nums[0]}, not at 0: the stretch must be non-empty. run is the best stretch that ends exactly here.`,
    [view(0), tv({ run, best, settled: `best of 0..0 is ${best}` })]);
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i], extend = run >= 0, old = run;
    if (extend) run = old + x; else { run = x; runL = i; }
    if (run > best) { best = run; bestL = runL; bestR = i; }
    r.frame(extend
      ? `The old run is ${sign(old)}, which is not a burden. Extend: run = ${sign(old)} + ${sign(x)} = ${sign(run)}.${bestR === i ? ' That beats best.' : ''}`
      : `The old run is ${sign(old)}, below zero. Any stretch carrying it ends lower than ${sign(x)} alone, so restart here: run = ${sign(x)}.${bestR === i ? ' That beats best.' : ''}`,
    [view(i), tv({ run, best, settled: `best of 0..${i} is ${best}` })],
    q(`run is ${sign(old)} and the next value is ${sign(x)}. Extend or restart?`, ['Extend the run', 'Restart at this value'], extend ? 0 : 1,
      extend ? 'A run that is not negative can only help what follows.' : 'A negative run only lowers whatever stretch carries it.'));
  }
  r.frame(`Done. The answer is best = ${best} (stretch ${bestL}..${bestR}), not run: run is only the best stretch ending at the last index.`,
    [view(nums.length - 1), tv({ run, best, answer: best })]);
  return r.frames;
}

export function maxProductFrames(nums: number[]): Frame[] {
  const r = recorder(), tv = vars();
  let hi = nums[0], lo = nums[0], best = nums[0];
  const view = (i: number): View => arr('nums', nums, { pointers: [ptr(i, 'i')], tones: Object.fromEntries(Array.from({ length: i }, (_, k) => [k, 'visited' as CellTone])) });
  r.frame(`hi and lo are the largest and smallest product of a stretch ending here. Both start at nums[0] = ${nums[0]}.`, [view(0), tv({ hi, lo, best, settled: 'no stretch has been rejected yet' })]);
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i], a = hi * x, b = lo * x, oh = hi, ol = lo;
    hi = Math.max(x, a, b); lo = Math.min(x, a, b); best = Math.max(best, hi);
    const winner = hi === x ? 'x alone' : hi === a ? 'hi × x' : 'lo × x';
    r.frame(`x = ${sign(x)}. Candidates from the OLD values: x alone = ${sign(x)}, hi × x = ${sign(a)}, lo × x = ${sign(b)}. New hi = ${sign(hi)} (${winner}), new lo = ${sign(lo)}.${x < 0 ? ' A negative x flips the roles: the old lo is now the one to multiply.' : ''}`,
      [view(i), tv({ hi, lo, best, settled: `no stretch ending at ${i} is above ${sign(hi)} or below ${sign(lo)}` })],
      q(`hi = ${sign(oh)}, lo = ${sign(ol)}, x = ${sign(x)}. What is the new hi?`,
        [`x alone = ${sign(x)}`, `hi × x = ${sign(a)}`, `lo × x = ${sign(b)}`], [x, a, b].indexOf(hi),
        'The new hi is the largest of x, hi × x and lo × x, all computed from the old hi and lo.'));
  }
  r.frame(`Done. The answer is the largest hi ever seen: ${best}.`, [view(nums.length - 1), tv({ hi, lo, best, answer: best })]);
  return r.frames;
}

export function gasFrames(gas: number[], cost: number[]): Frame[] {
  const r = recorder(), tv = vars(), n = gas.length, gain = gas.map((g, i) => g - cost[i]);
  let total = 0, tank = 0, start = 0;
  const skipped = new Set<number>();
  const view = (i: number): View => arr('gain = gas − cost', gain.map(sign), {
    pointers: [ptr(start, 'start', 'green'), ...(i < n ? [ptr(i, 'i', 'blue')] : [])],
    tones: Object.fromEntries([...skipped].map(k => [k, 'out' as CellTone])),
  });
  r.frame('total decides WHETHER a lap is possible, tank decides WHERE to start. Begin with start = 0.', [view(0), tv({ total, tank, start, settled: 'nothing yet' })]);
  for (let i = 0; i < n; i++) {
    total += gain[i]; tank += gain[i];
    if (tank < 0) {
      const from = start;
      for (let k = start; k <= i; k++) skipped.add(k);
      start = i + 1; tank = 0;
      r.frame(`Station ${i}: tank would be negative, so the trip from ${from} cannot reach station ${i + 1}. You reached every station from ${from} to ${i} with a tank of at least 0 and still ran dry, so none of them can be a start. New start = ${i + 1}.`,
        [view(i), tv({ total, tank, start, settled: `no start in 0..${i} works` })],
        q(`The tank went negative at station ${i}. Where does the search for a start resume?`, [`Station ${i + 1}`, `Station ${i} again`], 0, `Every station from ${from} to ${i} is ruled out, so the next candidate is ${i + 1}.`));
    } else {
      r.frame(`Station ${i}: gain ${sign(gain[i])}. The tank is ${tank}, not negative, so start ${start} is still alive.`, [view(i), tv({ total, tank, start, settled: `no start in 0..${start - 1} works` })]);
    }
  }
  const ans = total >= 0 ? start : -1;
  r.frame(total >= 0 ? `total = ${total} is not negative, so some start exists and it is start = ${start}, just after the last deficit.` : `total = ${sign(total)} is negative: every lap loses oil, so no start works. Return −1 even though start = ${start}.`,
    [view(n), tv({ total, tank, start, answer: ans })]);
  return r.frames;
}

export function canJumpFrames(nums: number[]): Frame[] {
  const r = recorder(), tv = vars(), n = nums.length;
  let far = 0;
  const view = (i: number): View => arr('nums', nums, { pointers: [ptr(Math.min(i, n - 1), 'i', 'blue'), ptr(Math.min(far, n - 1), 'far')], regions: [{ from: 0, to: Math.min(far, n - 1), label: 'reachable', tone: 'green' }] });
  r.frame('The reachable stones always form one block 0..far. Start with far = 0: only stone 0.', [view(0), tv({ far, settled: 'reachable: 0..0' })]);
  for (let i = 0; i < n; i++) {
    if (i > far) {
      r.frame(`i = ${i} is beyond far = ${far}. No reachable stone lands here, so there is a gap and the end is unreachable. Return false.`, [view(i), tv({ i, far, answer: 'false' })],
        q(`i = ${i} and far = ${far}. What now?`, ['Return false: a gap', 'Keep going'], 0, 'No stone in the reachable block reaches i.'));
      return r.frames;
    }
    const old = far;
    far = Math.max(far, i + nums[i]);
    r.frame(`Stone ${i} is inside the block, so it is reachable. Its reach is ${i} + ${nums[i]} = ${i + nums[i]}; far = max(${old}, ${i + nums[i]}) = ${far}.`, [view(i), tv({ i, far, settled: `reachable: 0..${Math.min(far, n - 1)}` })]);
  }
  r.frame('Every stone was inside the reachable block, so the last stone is reachable. Return true.', [view(n), tv({ far, answer: 'true' })]);
  return r.frames;
}

// nums must let the last stone be reached (every value at least 1 is enough).
export function jumpIIFrames(nums: number[]): Frame[] {
  const r = recorder(), tv = vars(), n = nums.length;
  let jumps = 0, end = 0, far = 0;
  const view = (i: number): View => arr('nums', nums, { pointers: [ptr(Math.min(i, n - 1), 'i', 'blue'), ptr(Math.min(end, n - 1), 'end', 'green'), ptr(Math.min(far, n - 1), 'far')], regions: [{ from: 0, to: Math.min(end, n - 1), label: `≤ ${jumps} jump(s)`, tone: 'green' }] });
  r.frame('Think in levels. end is the last stone reachable with `jumps` jumps; far is how far the next level could reach. We never pick a landing stone.', [view(0), tv({ jumps, end, far, settled: 'stone 0 needs 0 jumps' })]);
  for (let i = 0; i < n - 1; i++) {
    const oldFar = far;
    far = Math.max(far, i + nums[i]);
    if (i === end) {
      jumps++; end = far;
      r.frame(`Stone ${i} is the edge of the level, and far = ${far} after scanning it. One more jump is forced: jumps = ${jumps}, and every stone up to ${end} is now reachable with ${jumps}.`,
        [view(i), tv({ jumps, end, far, settled: `stones 0..${end} need at most ${jumps} jump(s)` })],
        q(`i = ${i} equals end. What happens?`, ['jumps++ and end = far', 'Only update far'], 0, 'Reaching the edge of a level means the next jump cannot be avoided.'));
    } else {
      r.frame(`Stone ${i} is inside the level. Update far = max(${oldFar}, ${i} + ${nums[i]}) = ${far}. No jump is counted: we are still scanning the stones reachable with ${jumps}.`, [view(i), tv({ jumps, end, far, settled: `stones 0..${end} need at most ${jumps} jump(s)` })]);
    }
  }
  r.frame(`The scan stops before the last stone: you never jump FROM it. Answer: ${jumps}.`, [view(n - 1), tv({ jumps, end, far, answer: jumps })]);
  return r.frames;
}

export function partitionFrames(s: string): Frame[] {
  const r = recorder(), tv = vars(), chars = [...s];
  const last: Record<string, number> = {};
  chars.forEach((c, i) => { last[c] = i; });
  const sizes: number[] = [], regions: { from: number; to: number; label: string; tone: PtrTone }[] = [];
  let start = 0, end = 0;
  const lastMap: View = { kind: 'map', name: 'last index of each letter', entries: Object.entries(last).sort() };
  const view = (i: number): View => arr('s', chars, { pointers: [ptr(Math.min(i, chars.length - 1), 'i', 'blue'), ptr(end, 'end')], regions: [...regions, ...(i < chars.length ? [{ from: start, to: i, label: 'open piece', tone: 'gold' as PtrTone }] : [])] });
  r.frame('First record where each letter appears for the LAST time. A piece that holds a letter must reach that index.', [view(0), lastMap, tv({ end, pieces: '[]', settled: 'nothing cut yet' })]);
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i], old = end;
    end = Math.max(end, last[c]);
    if (i === end) {
      sizes.push(end - start + 1); regions.push({ from: start, to: end, label: String(end - start + 1), tone: 'green' }); start = i + 1;
      r.frame(`'${c}' has its last copy at ${last[c]}; end = ${end} = i. No letter in this piece appears later, so cut here: piece of size ${sizes[sizes.length - 1]}.`,
        [view(i), lastMap, tv({ end, pieces: JSON.stringify(sizes), settled: `${sizes.length} piece(s) final: no letter crosses a cut` })],
        q(`i = ${i} and end = ${end}. Cut?`, ['Cut: nothing inside goes further', 'Keep extending'], 0, 'i == end means every letter seen so far has already had its last copy.'));
    } else {
      r.frame(`'${c}' last appears at ${last[c]}, so end = max(${old}, ${last[c]}) = ${end}. i = ${i} is before it: some letter in the piece still appears later, so a cut here would split it.`,
        [view(i), lastMap, tv({ end, pieces: JSON.stringify(sizes), settled: `${sizes.length} piece(s) final` })]);
    }
  }
  r.frame(`The string is used up. Piece sizes: ${JSON.stringify(sizes)}.`, [view(chars.length), lastMap, tv({ end, answer: JSON.stringify(sizes) })]);
  return r.frames;
}

export function straightsFrames(hand: number[], w: number): Frame[] {
  const r = recorder(), tv = vars();
  const count = new Map<number, number>();
  for (const c of hand) count.set(c, (count.get(c) ?? 0) + 1);
  const view = (removed?: Val[]): View => ({ kind: 'map', name: 'cards left (value, count)', entries: [...count.entries()].sort((a, b) => a[0] - b[0]), ...(removed ? { removed } : {}) });
  if (hand.length % w !== 0) {
    r.frame(`Count the cards: ${hand.length}, and groups have size ${w}.`, [view(), tv({ cards: hand.length, groupSize: w })]);
    r.frame(`${hand.length} cards cannot split into groups of ${w}: ${hand.length} is not a multiple of ${w}. Return false immediately.`, [view(), tv({ answer: 'false' })]);
    return r.frames;
  }
  r.frame(`Count the cards. The rule: the smallest card left must start a group, because no smaller card exists to start it.`, [view(), tv({ groups: 0, settled: 'no group formed yet' })]);
  let groups = 0;
  while (count.size) {
    const first = Math.min(...count.keys());
    const need = Array.from({ length: w }, (_, k) => first + k);
    const hole = need.find(v => !count.has(v));
    if (hole !== undefined) {
      r.frame(`The smallest card is ${first}, so its group can only be ${need.join(', ')}. ${hole} is missing, and the group is forced, so no arrangement exists. Return false.`, [view(), tv({ groups, answer: 'false' })],
        q(`Smallest card ${first}, group size ${w}. ${hole} is missing. What does that mean?`, ['No valid arrangement exists', 'Try another starting card'], 0, `${first} has exactly one possible group, so a hole in it cannot be repaired.`));
      return r.frames;
    }
    for (const v of need) { const c = count.get(v)!; if (c === 1) count.delete(v); else count.set(v, c - 1); }
    groups++;
    r.frame(`The smallest card is ${first}, so its group is forced: ${need.join(', ')}. Remove one of each.`, [view(need), tv({ groups, settled: `${groups} forced group(s) formed` })],
      q(`The smallest card left is ${first}. Which group must it start?`, [`${need.join(', ')}`, `Whichever value has the largest count`], 0, 'No card is smaller, so it cannot sit inside a group that starts lower.'));
  }
  r.frame(`All cards are used in ${groups} groups. Return true.`, [view(), tv({ groups, answer: 'true' })]);
  return r.frames;
}

export function stockFrames(prices: number[]): Frame[] {
  const r = recorder(), tv = vars();
  let profit = 0;
  const tones: Record<number, CellTone> = {};
  const view = (i: number): View => arr('price', prices, { pointers: [ptr(i, 'today', 'blue')], tones: { ...tones } });
  r.frame('Every rising step can be earned on its own: buy yesterday, sell today. No falling step ever has to be taken.', [view(0), tv({ profit, settled: 'nothing yet' })]);
  for (let i = 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) { profit += d; tones[i] = 'found'; } else tones[i] = 'out';
    r.frame(d > 0 ? `${prices[i - 1]} → ${prices[i]} is a rise of ${d}. Take it: profit = ${profit}.` : `${prices[i - 1]} → ${prices[i]} is ${d === 0 ? 'flat' : `a fall of ${-d}`}. Skip it: not holding over this step costs nothing.`,
      [view(i), tv({ profit, settled: `best profit for days 0..${i} is ${profit}` })],
      q(`${prices[i - 1]} → ${prices[i]}. Take this step?`, ['Yes, add the rise', 'No, skip it'], d > 0 ? 0 : 1, d > 0 ? 'A rise is free money: buy yesterday, sell today.' : 'There is nothing to earn, and you can sit out a fall.'));
  }
  r.frame(`Done. Total profit ${profit}.`, [view(prices.length - 1), tv({ profit, answer: profit })]);
  return r.frames;
}

export function cookiesFrames(greed: number[], sizes: number[]): Frame[] {
  const r = recorder(), tv = vars();
  const g = [...greed].sort((a, b) => a - b), s = [...sizes].sort((a, b) => a - b);
  let child = 0;
  const view = (roll: number): View[] => [
    arr('needs (sorted)', g, { pointers: child < g.length ? [ptr(child, 'child')] : [], tones: Object.fromEntries(Array.from({ length: child }, (_, k) => [k, 'found' as CellTone])) }),
    arr('rolls (sorted)', s, { pointers: roll < s.length ? [ptr(roll, 'roll', 'blue')] : [], tones: Object.fromEntries(Array.from({ length: roll }, (_, k) => [k, 'visited' as CellTone])) }),
  ];
  r.frame('Sort both lists. The least hungry child still waiting is the first one to serve, with the smallest roll that satisfies them.', [...view(0), tv({ fed: child, settled: 'nobody fed yet' })]);
  for (let roll = 0; roll < s.length && child < g.length; roll++) {
    const ok = s[roll] >= g[child];
    if (ok) child++;
    r.frame(ok ? `Roll ${s[roll]} is at least need ${g[child - 1]}, and it is the smallest roll that fits this child. Give it: ${child} fed. A larger roll would be wasted on someone easier to please.` : `Roll ${s[roll]} is below the need ${g[child]} of the least hungry child, so it is too small for everyone left. Throw it away.`,
      [...view(roll + 1), tv({ fed: child, settled: `${child} child(ren) fed with the smallest rolls possible` })],
      q(`Next roll is ${s[roll]}, the waiting child needs ${g[child - (ok ? 1 : 0)]}. Feed them?`, ['Yes', 'No, discard the roll'], ok ? 0 : 1, ok ? 'The roll fits, and this is the smallest roll that does.' : 'Too small for the least hungry child means too small for everyone.'));
  }
  r.frame(`A list ran out. ${child} children are fed.`, [...view(s.length), tv({ fed: child, answer: child })]);
  return r.frames;
}

export function boatsFrames(weights: number[], limit: number): Frame[] {
  const r = recorder(), tv = vars();
  const p = [...weights].sort((a, b) => a - b);
  let light = 0, heavy = p.length - 1, boats = 0;
  const view = (): View => arr('people (sorted)', p, {
    pointers: light <= heavy ? [ptr(light, 'light', 'blue'), ptr(heavy, 'heavy', 'gold')] : [],
    tones: Object.fromEntries([...Array.from({ length: light }, (_, k) => k), ...Array.from({ length: p.length - 1 - heavy }, (_, k) => heavy + 1 + k)].map(k => [k, 'found' as CellTone])),
  });
  r.frame(`Sort. The heaviest person must leave in some boat. If even the lightest cannot ride with them (limit ${limit}), nobody can.`, [view(), tv({ boats, settled: 'nobody boarded yet' })]);
  while (light <= heavy) {
    const together = light < heavy && p[light] + p[heavy] <= limit, a = p[light], b = p[heavy];
    if (together) light++;
    heavy--; boats++;
    r.frame(together ? `${b} + ${a} = ${a + b} fits within ${limit}, so the lightest rides along with the heaviest. That is the best partner: any other partner is heavier.` : light === heavy + 1 ? `${b} is the last person. They take a boat alone.` : `${b} + ${a} = ${a + b} is over ${limit}. The lightest cannot fit, so nobody can: the heaviest goes alone.`,
      [view(), tv({ boats, settled: `${boats} boat(s) sent, each as full as possible` })],
      a === b && light === heavy + 1 && !together ? undefined : q(`Heaviest ${b}, lightest ${a}, limit ${limit}. Who rides?`, ['Both together', 'The heaviest alone'], together ? 0 : 1, together ? 'The sum fits, and the lightest is the best partner for the heaviest.' : 'If the lightest does not fit, no one does.'));
  }
  r.frame(`Everyone has boarded: ${boats} boat(s).`, [view(), tv({ boats, answer: boats })]);
  return r.frames;
}

export function candyFrames(ratings: number[]): Frame[] {
  const r = recorder(), tv = vars(), n = ratings.length, c = Array<number>(n).fill(1);
  const view = (i: number, tones: Record<number, CellTone> = {}): View[] => [arr('rating', ratings, { pointers: [ptr(i, 'i', 'blue')] }), arr('sweets', c, { tones })];
  r.frame('Everyone starts with 1 sweet. Satisfy the left-neighbour rule in one pass, then the right-neighbour rule in a second pass, and never lower a count.', [...view(0), tv({ pass: 'start', settled: 'nothing yet' })]);
  for (let i = 1; i < n; i++) {
    const up = ratings[i] > ratings[i - 1];
    if (up) c[i] = c[i - 1] + 1;
    r.frame(up ? `Left pass: ${ratings[i]} is above its left neighbour ${ratings[i - 1]}, so it needs one more than them: ${c[i]}.` : `Left pass: ${ratings[i]} is not above ${ratings[i - 1]}, so the left rule asks for nothing. Stay at 1.`,
      [...view(i, { [i]: up ? 'found' : 'visited' }), tv({ pass: 'left', settled: `left rule holds for 0..${i}` })]);
  }
  for (let i = n - 2; i >= 0; i--) {
    const up = ratings[i] > ratings[i + 1], before = c[i];
    if (up) c[i] = Math.max(c[i], c[i + 1] + 1);
    r.frame(up ? `Right pass: ${ratings[i]} is above its right neighbour ${ratings[i + 1]}, so it needs at least ${c[i + 1] + 1}. Keep the larger of ${before} and ${c[i + 1] + 1}: ${c[i]}. The max keeps the left rule too.` : `Right pass: ${ratings[i]} is not above ${ratings[i + 1]}. Leave ${c[i]} as it is.`,
      [...view(i, { [i]: up ? 'found' : 'visited' }), tv({ pass: 'right', settled: `both rules hold for ${i}..${n - 1}` })],
      up && before !== c[i + 1] + 1 ? q(`Left pass gave ${before}; the right rule needs ${c[i + 1] + 1}. What is the new count?`, [`${c[i]} (the larger of the two)`, `${before + c[i + 1] + 1 - c[i]} (the smaller of the two)`], 0, 'Take the max: each pass is a lower bound, and the max meets both.') : undefined);
  }
  const total = c.reduce((x, y) => x + y, 0);
  r.frame(`Add up the sweets: ${total}.`, [...view(0, Object.fromEntries(c.map((_, k) => [k, 'done' as CellTone]))), tv({ total, answer: total })]);
  return r.frames;
}

export function wildcardFrames(s: string): Frame[] {
  const r = recorder(), tv = vars(), chars = [...s];
  let lo = 0, hi = 0;
  const view = (i: number): View => arr('s', chars, { pointers: i < chars.length ? [ptr(i, 'i', 'blue')] : [], tones: Object.fromEntries(Array.from({ length: i }, (_, k) => [k, 'visited' as CellTone])) });
  r.frame('Do not guess what each * is. Track the whole range lo..hi of open-bracket counts that some reading could have right now.', [view(0), tv({ lo, hi, settled: 'the only possible count is 0' })]);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i], ol = lo, oh = hi;
    if (ch === '(') { lo++; hi++; } else if (ch === ')') { lo--; hi--; } else { lo--; hi++; }
    if (hi < 0) {
      r.frame(`')' pushes hi to −1: even with every * read as '(', there are more ')' than '(' so far. Return false.`, [view(i), tv({ lo, hi, answer: 'false' })]);
      return r.frames;
    }
    const clamped = lo < 0;
    if (clamped) lo = 0;
    const move = ch === '(' ? `'(' raises both ends` : ch === ')' ? `')' lowers both ends` : `* may be ')' (lower), '(' (raise) or nothing, so lo drops and hi rises`;
    const raw = ch === '(' ? ol + 1 : ol - 1;
    r.frame(`${move}: ${ol}..${oh} becomes ${clamped ? `${raw}..${hi}, and a negative count is not a real option, so lo is clamped to 0` : `${lo}..${hi}`}.`,
      [view(i + 1), tv({ lo, hi, settled: `counts ${lo}..${hi} are all possible after ${i + 1} character(s)` })],
      q(`Range is ${ol}..${oh} and the next character is ${ch}. What is hi afterwards?`, [String(oh + 1), String(oh - 1), String(oh)], ch === ')' ? 1 : ch === '(' || ch === '*' ? 0 : 2, ch === ')' ? "')' can only close, so hi drops." : ch === '(' ? "'(' always opens." : "* could open, so hi rises."));
  }
  r.frame(lo === 0 ? 'The input is used up and a count of 0 is possible (lo = 0): some reading balances. Return true.' : `The input is used up but even the lowest count lo = ${lo} is above 0: some bracket always stays open. Return false.`, [view(chars.length), tv({ lo, hi, answer: String(lo === 0) })]);
  return r.frames;
}

export function tripletsFrames(triplets: number[][], target: number[]): Frame[] {
  const r = recorder(), tv = vars();
  const hit = [false, false, false];
  const used = new Set<number>(), skipped = new Set<number>();
  const view = (cur: number): View[] => [
    { kind: 'grid', name: 'triplets', cells: triplets, rowLabels: triplets.map((_, i) => `#${i}`), colLabels: ['x', 'y', 'z'],
      tones: triplets.flatMap((t, i) => t.map((v, k) => ({ r: i, c: k, tone: (skipped.has(i) ? 'out' : used.has(i) && v === target[k] ? 'found' : i === cur ? 'compared' : used.has(i) ? 'visited' : 'active') as CellTone }))) },
    arr('target', target, { indices: false }),
  ];
  r.frame('Maxima never go down, so a triplet with any value above the target can never be used. Every other triplet is safe to merge.', [...view(-1), tv({ hit: 'none', settled: 'no triplet judged yet' })]);
  triplets.forEach((t, i) => {
    const over = t.some((v, k) => v > target[k]);
    if (over) skipped.add(i); else { used.add(i); t.forEach((v, k) => { if (v === target[k]) hit[k] = true; }); }
    const names = hit.map((h, k) => (h ? 'xyz'[k] : '')).join('') || 'none';
    r.frame(over ? `Triplet #${i} has ${t.find((v, k) => v > target[k])} above the target in position ${t.findIndex((v, k) => v > target[k])}: merging it would overshoot forever. Skip it.` : `Triplet #${i} never exceeds the target, so merging it is safe. Positions it matches exactly: ${t.map((v, k) => (v === target[k] ? 'xyz'[k] : '')).join('') || 'none'}.`,
      [...view(i), tv({ hit: names, settled: `${skipped.size} unusable, ${used.size} safe` })],
      q(`Triplet ${JSON.stringify(t)} against target ${JSON.stringify(target)}. Usable?`, ['Yes: nothing exceeds the target', 'No: some value overshoots'], over ? 1 : 0, over ? 'A value above the target in any position can never come back down.' : 'No position exceeds the target.'));
  });
  const ok = hit.every(Boolean);
  r.frame(ok ? 'Every position is matched exactly by some safe triplet: merging them gives the target. Return true.' : 'Some position is never matched exactly by a safe triplet. Return false.', [...view(-1), tv({ hit: hit.map((h, k) => (h ? 'xyz'[k] : '')).join('') || 'none', answer: String(ok) })]);
  return r.frames;
}
