// Independent practice for the Stacks lesson. Prompts never name the pattern; inputs change with `variant`.
// Every answer is recomputed by an independent brute force in tests/stacks.test.ts.
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  match: 'Match each closer against the most recently opened item',
  augment: 'Store extra information with each level as it is added',
  evaluate: 'Let each operator consume the two most recent results',
  waiting: 'Keep unresolved items; each arrival resolves the ones it beats',
  fleet: 'Sort by position, then merge each item into the group ahead',
  boundaries: 'Resolve each item by its nearest bounding neighbours on both sides',
  collide: 'Let each newcomer fight the most recent survivors',
  greedy: 'Keep a non-decreasing prefix; drop larger earlier digits while removals remain',
  other: 'Use another tool; nothing here has to wait for a nearest answer',
} as const;
type Strategy = keyof typeof strategies;

export const conceptIds = ['brackets', 'warmer', 'min-stack', 'rpn', 'circular', 'fleet', 'histogram', 'nge-map', 'span', 'asteroids', 'remove-digits', 'rain-stream', 'subarray-mins', 'later-max'] as const;
type ConceptId = typeof conceptIds[number];

const arr = (a: (number | string)[]) => `[${a.join(', ')}]`;
// Small deterministic generator so each variant gets its own input.
function rng(seed: number) {
  let x = (Math.imul(seed + 1, 2654435761) ^ 0x5bd1e995) >>> 0;
  return (n: number) => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return (x >>> 8) % n; };
}
const randArr = (r: (n: number) => number, len: number, lo: number, hi: number) => Array.from({ length: len }, () => lo + r(hi - lo + 1));

// Reference solutions (the lesson's algorithms, in TypeScript).
function nextWarmer(a: number[]) {
  const ans = a.map(() => 0), st: number[] = [];
  a.forEach((v, i) => { while (st.length && v > a[st[st.length - 1]]) { const d = st.pop()!; ans[d] = i - d; } st.push(i); });
  return ans;
}
function circularNext(a: number[]) {
  const n = a.length, ans = a.map(() => -1), st: number[] = [];
  for (let i = 0; i < 2 * n; i++) { const v = a[i % n]; while (st.length && v > a[st[st.length - 1]]) ans[st.pop()!] = v; if (i < n) st.push(i); }
  return ans;
}
function largestRect(h: number[]) {
  let best = 0; const st: number[] = [];
  for (let i = 0; i <= h.length; i++) {
    const cur = i === h.length ? 0 : h[i];
    while (st.length && h[st[st.length - 1]] >= cur) { const m = st.pop()!; const left = st.length ? st[st.length - 1] : -1; best = Math.max(best, h[m] * (i - left - 1)); }
    st.push(i);
  }
  return best;
}
function spans(p: number[]) {
  const st: [number, number][] = [];
  return p.map(price => { let s = 1; while (st.length && st[st.length - 1][0] <= price) s += st.pop()![1]; st.push([price, s]); return s; });
}
function collide(rocks: number[]) {
  const st: number[] = [];
  for (const rock of rocks) {
    let alive = true;
    while (alive && rock < 0 && st.length && st[st.length - 1] > 0) {
      const t = st[st.length - 1];
      if (t < -rock) st.pop(); else { if (t === -rock) st.pop(); alive = false; }
    }
    if (alive) st.push(rock);
  }
  return st;
}
function removeDigits(num: string, k: number) {
  const st: string[] = [];
  for (const d of num) { while (k > 0 && st.length && st[st.length - 1] > d) { st.pop(); k--; } st.push(d); }
  st.length -= k;
  const s = st.join('').replace(/^0+/, '');
  return s === '' ? '0' : s;
}
function trapped(h: number[]) {
  let water = 0; const st: number[] = [];
  h.forEach((v, i) => {
    while (st.length && v > h[st[st.length - 1]]) {
      const floor = st.pop()!; if (!st.length) break;
      const left = st[st.length - 1];
      water += (i - left - 1) * (Math.min(h[left], v) - h[floor]);
    }
    st.push(i);
  });
  return water;
}
function sumMins(a: number[]) {
  let total = 0; const st: number[] = [];
  for (let i = 0; i <= a.length; i++) {
    while (st.length && (i === a.length || a[st[st.length - 1]] >= a[i])) { const m = st.pop()!; const left = st.length ? st[st.length - 1] : -1; total += a[m] * (m - left) * (i - m); }
    st.push(i);
  }
  return total;
}
function evalTokens(tokens: string[]) {
  const st: number[] = [];
  for (const t of tokens) {
    if ('+-*/'.includes(t) && t.length === 1) {
      const right = st.pop()!, left = st.pop()!;
      st.push(t === '+' ? left + right : t === '-' ? left - right : t === '*' ? left * right : Math.trunc(left / right));
    } else st.push(Number(t));
  }
  return st.pop()!;
}

export function challengeFor(id: ConceptId, variant = 0): Challenge {
  const r = rng(variant * 31 + conceptIds.indexOf(id) * 1009);
  const base = { id, question: 'Enter only the result.' };
  switch (id) {
    case 'brackets': {
      const pool = ['{[()()]}', '([)]', '(()', '())', '[{}](', '{[]}()', ')(', '((([])))', '[(])', '({})[]{}'];
      const s = pool[variant % pool.length];
      const valid = (() => { let t = s, prev = ''; while (t !== prev) { prev = t; t = t.replace(/\(\)|\[\]|\{\}/g, ''); } return t === ''; })();
      return { ...base, topic: 'Nested matching', section: 'valid-parentheses', strategy: 'match', question: 'Enter yes or no.', answer: valid,
        prompt: `A config file nests three kinds of brackets. Is “${s}” properly nested, with every opener closed by its own kind of closer, innermost first? Use one left-to-right pass.`,
        hints: ['Which opener must close first: the oldest one, or the most recent one?', 'Keep the openers that are still waiting, newest on top.', 'A closer must match the newest waiting opener. Also check that nothing is left waiting at the end.'],
        rubric: ['Each closer is compared with the most recent unclosed opener only.', 'A closer with nothing open fails immediately (no pop on an empty structure).', 'Leftover openers at the end mean invalid.'],
        explanation: `“${s}” is ${valid ? 'valid' : 'invalid'}. Openers go on a stack; a closer must match the top; the stack must end empty. O(n) time, O(n) space.` };
    }
    case 'warmer': {
      const a = randArr(r, 6 + variant % 3, 60, 75);
      const answer = nextWarmer(a);
      return { ...base, topic: 'Next warmer day', section: 'daily-temperatures', strategy: 'waiting', question: 'Enter the whole answer array.', answer,
        prompt: `Daily highs: ${arr(a)}. For each day, how many days until a strictly warmer day? Use 0 if none comes. Aim for O(n).`,
        hints: ['Which days are still waiting for their answer when a new day arrives?', 'Keep the waiting days, newest on top. Their temperatures never increase from bottom to top.', 'A warmer arrival answers the top repeatedly (distance = today − that day), then waits itself.'],
        rubric: ['Waiting days are stored as indexes, so distances can be computed.', 'Pop only while today is strictly warmer; equal is not warmer.', 'Each index is pushed once and popped at most once: O(n). Leftovers keep 0.'],
        explanation: `Answer ${arr(answer)}. Each warmer day answers the waiting days it beats, then waits itself.` };
    }
    case 'min-stack': {
      const v = randArr(r, 4, 1, 9);
      const scripts = [
        [`put(${v[0]})`, `put(${v[1]})`, `put(${v[2]})`, 'take', `put(${v[3]})`, 'take', 'take'],
        [`put(${v[0]})`, `put(${v[1]})`, 'take', `put(${v[2]})`, `put(${v[3]})`, 'take'],
        [`put(${v[0]})`, `put(${v[0]})`, `put(${v[1]})`, 'take', 'take', `put(${v[2]})`, 'take'],
      ];
      const ops = scripts[variant % 3];
      const model: number[] = [];
      for (const op of ops) { const m = op.match(/put\((\d+)\)/); if (m) model.push(Number(m[1])); else model.pop(); }
      const answer = Math.min(...model);
      return { ...base, topic: 'Minimum with undo', section: 'min-stack', strategy: 'augment', question: 'Enter the value the query returns.', answer,
        prompt: `A weight rack accepts put(x) on top and take (removes the most recently put weight that is still there). It also answers “lightest weight currently on the rack”. Every operation, the query included, must be O(1). After ${ops.join(', ')}, what does the lightest-weight query return?`,
        hints: ['A take must restore the lightest weight from before the last put. Where is that remembered?', 'Store, at every level, the lightest weight at or below that level.', 'put pushes min(x, current lightest) onto a second structure; take pops both.'],
        rubric: ['A single running minimum fails after a take removes the current minimum.', 'Each level stores the minimum at or below it, in a parallel structure that pops in step.', 'All operations are O(1); extra space O(n).'],
        explanation: `The rack ends holding ${arr(model)}, so the query returns ${answer}. A parallel stack of “minimum so far” answers it in O(1).` };
    }
    case 'rpn': {
      const [a, b, c, d] = [2 + r(12), 1 + r(9), 1 + r(6), 2 + r(5)];
      const templates = [
        [a, b, '+', c, '*'], [a, b, c, '-', '*'], [a * d + b, d, '/', c, '-'], [a, b, '-', c, d, '*', '+'], [c, a, '-', d, '/'],
      ].map(t => t.map(String));
      const tokens = templates[variant % templates.length];
      const answer = evalTokens(tokens);
      return { ...base, topic: 'Postfix evaluation', section: 'reverse-polish', strategy: 'evaluate', answer,
        prompt: `An old calculator reads tokens left to right, with no brackets and no precedence rules: “${tokens.join(' ')}”. Each operator acts on the two most recent results. Integer division truncates toward zero. What does it print?`,
        hints: ['When an operator arrives, which two values does it use?', 'Numbers are saved, newest on top. An operator removes the top two and saves its result.', 'The first value removed is the RIGHT operand: left = second removal.'],
        rubric: ['Operands are kept newest-first, so an operator takes the two most recent results.', 'Operand order: second pop op first pop (matters for − and /).', 'Division truncates toward zero; one value remains at the end.'],
        explanation: `“${tokens.join(' ')}” evaluates to ${answer}. Push numbers; each operator pops right then left and pushes left op right.` };
    }
    case 'circular': {
      const a = randArr(r, 5 + variant % 2, 1, 6);
      const answer = circularNext(a);
      return { ...base, topic: 'Next greater, wrapping around', section: 'circular-next-greater', strategy: 'waiting', question: 'Enter the whole answer array.', answer,
        prompt: `Readings on a round dial, in clockwise order: ${arr(a)}. The last reading is followed by the first. For each reading, give the first strictly larger reading going clockwise, or −1 if none exists. Aim for O(n).`,
        hints: ['After one pass, which readings have only looked at what comes after them?', 'Keep unanswered positions, newest on top, and sweep the array twice.', 'Read a[i % n] for i up to 2n − 1; answer during both laps, add new waiters only in the first.'],
        rubric: ['A second lap lets leftovers see the elements before them.', 'Strictly larger: equal values don’t answer each other; the maximum ends with −1.', 'Two laps, each index pushed once: O(n).'],
        explanation: `Answer ${arr(answer)}. One pass answers what lies to the right; the second, push-free lap handles the wrap-around.` };
    }
    case 'fleet': {
      const target = 10 + r(6), n = 3 + r(3);
      const pos: number[] = [];
      while (pos.length < n) { const p = r(target); if (!pos.includes(p)) pos.push(p); }
      const speed = pos.map(() => 1 + r(4));
      // Fleets = cars whose arrival time is strictly later than every car ahead (exact fractions).
      const order = pos.map((_, i) => i).sort((x, y) => pos[y] - pos[x]);
      let groups = 0, aheadNum = 0, aheadDen = 1;
      for (const i of order) { const num = target - pos[i], den = speed[i]; if (num * aheadDen > aheadNum * den) { groups++; aheadNum = num; aheadDen = den; } }
      return { ...base, topic: 'Groups that catch up', section: 'car-fleet', strategy: 'fleet', answer: groups,
        prompt: `A one-lane road ends at mile ${target}. Carts start at miles ${arr(pos)} with speeds ${arr(speed)} (miles per hour, same order). No cart may pass another: a faster cart that catches a slower one rides behind it at the slower speed. Carts that reach the end together count as one group, including catching up exactly at the end. How many groups arrive?`,
        hints: ['A cart can only be slowed by carts in front of it. Which cart is settled first?', 'Order carts by position, closest to the end first, and compute each one’s solo arrival time.', 'A cart starts a new group only if its time is strictly greater than the group ahead; otherwise it joins.'],
        rubric: ['Process carts from the front, because only carts ahead matter.', 'Compare solo arrival times (target − position) / speed with the group directly ahead.', 'Equal times join (catching up at the end counts). Sorting makes it O(n log n).'],
        explanation: `${groups} group(s). Front to back, a cart whose solo time is not later than the group ahead catches up and merges.` };
    }
    case 'histogram': {
      const h = randArr(r, 5 + variant % 3, 0, 7);
      const answer = largestRect(h);
      return { ...base, topic: 'Largest rectangle under bars', section: 'largest-rectangle', strategy: 'boundaries', answer,
        prompt: `Bars of width 1 stand side by side with heights ${arr(h)}. What is the area of the largest rectangle that fits entirely inside the bars? Aim for O(n).`,
        hints: ['Fix the shortest bar of the rectangle. How far can the rectangle stretch?', 'It stops at the nearest strictly shorter bar on each side.', 'Keep bars with increasing heights. When a bar no taller arrives, finalize the top: width = i − newTop − 1. A height-0 bar at the end flushes the rest.'],
        rubric: ['Every rectangle’s height is set by its shortest bar; try each bar as that bar.', 'Both edges are nearest shorter bars, found at the moment of the pop (empty stack: width i).', 'A sentinel flushes leftovers; each bar is pushed and popped once: O(n).'],
        explanation: `The largest rectangle has area ${answer}.` };
    }
    case 'nge-map': {
      const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const nums2: number[] = [];
      while (nums2.length < 6) { const x = pool[r(pool.length)]; if (!nums2.includes(x)) nums2.push(x); }
      const nums1 = nums2.filter((_, i) => (i + variant) % 2 === 0);
      const answer = nums1.map(x => { const j = nums2.indexOf(x); const g = nums2.slice(j + 1).find(y => y > x); return g ?? -1; });
      return { ...base, topic: 'Precompute, then look up', section: 'next-greater-map', strategy: 'waiting', question: 'Enter one answer per query, in order.', answer,
        prompt: `A reference list of distinct values: ${arr(nums2)}. Queries: ${arr(nums1)}, each taken from the reference list. For each query value, give the first larger value to its right in the reference list, or −1. Aim for O(reference + queries).`,
        hints: ['The answers depend only on the reference list. Compute them once.', 'One pass over the reference list, keeping unanswered values; record value → next larger value.', 'Values are distinct, so they can be keys. Each query is then a single lookup with default −1.'],
        rubric: ['All next-larger answers are found in one pass over the reference list.', 'A map stores value → answer; distinct values make the keys safe.', 'O(n + m) time instead of scanning per query.'],
        explanation: `Answers ${arr(answer)}. Build the next-greater map over the reference list, then look each query up.` };
    }
    case 'span': {
      const p = randArr(r, 7, 1, 9).map(x => x * 10);
      const answer = spans(p);
      return { ...base, topic: 'Look back, live', section: 'stock-span', strategy: 'waiting', question: 'Enter the whole answer array.', answer,
        prompt: `Prices arrive one per day: ${arr(p)}. When each price arrives, report how many consecutive days ending today (today included) had a price less than or equal to today’s. You cannot see future prices. Aim for amortized O(1) per day.`,
        hints: ['Today’s count covers every recent day that is no higher than today. Can old counts be reused?', 'Keep (price, count) pairs for days that are still higher than everything after them.', 'Pop while the top price ≤ today’s, adding its count. Push (price, count).'],
        rubric: ['A popped day’s whole span is absorbed into today’s, so it is never needed again.', 'Pop on ≤ (equal prices count toward the span).', 'Each day is pushed and popped at most once: amortized O(1).'],
        explanation: `Spans ${arr(answer)}. Each price absorbs the spans of the days it is at least as high as.` };
    }
    case 'asteroids': {
      const a = randArr(r, 6, 1, 6).map(x => (r(2) ? x : -x));
      const answer = collide(a);
      return { ...base, topic: 'Collisions with the most recent survivor', section: 'asteroids', strategy: 'collide', question: 'Enter the survivors in order (empty: []).', answer,
        prompt: `Rocks sit on a line in this order: ${arr(a)}. The sign is the direction (+ right, − left) and the absolute value is the size. All move at the same speed. When two meet, the smaller explodes; equal sizes both explode. Rocks moving the same way never meet. Which rocks remain, left to right?`,
        hints: ['Which pairs can ever meet? Only a right-mover with a left-mover after it.', 'Keep the survivors so far. A newcomer moving left fights the most recent survivor if that one moves right.', 'Smaller top: it explodes, keep fighting. Equal: both explode. Larger top: the newcomer explodes.'],
        rubric: ['Only a left-mover arriving after a right-mover collides.', 'The newcomer fights the most recent survivor first, possibly several times.', 'Equal sizes remove both; each rock is pushed and popped at most once: O(n).'],
        explanation: `Survivors: ${arr(answer)}.` };
    }
    case 'remove-digits': {
      const digits = randArr(r, 7, 0, 9);
      if (digits[0] === 0) digits[0] = 1 + r(9);
      const num = digits.join(''), k = 1 + r(3);
      const answer = removeDigits(num, k);
      return { ...base, topic: 'Smallest number after removals', section: 'remove-k-digits', strategy: 'greedy', question: 'Enter the number, without leading zeros.', answer,
        prompt: `Remove exactly ${k} digit${k > 1 ? 's' : ''} from “${num}” so that the remaining digits, in their original order, form the smallest possible number. Drop leading zeros; if nothing is left, the answer is 0.`,
        hints: ['Which digit is the best one to remove first? Look for a digit followed by a smaller one.', 'Keep the digits so far in non-decreasing order, removing larger earlier digits while removals remain.', 'Removals left over at the end come off the tail. Then strip leading zeros.'],
        rubric: ['A larger digit followed by a smaller one should go: earlier positions matter more.', 'Pop while removals remain and the kept last digit > current digit.', 'Trim the tail with leftover removals, strip leading zeros, return 0 if empty.'],
        explanation: `The smallest result is ${answer}.` };
    }
    case 'rain-stream': {
      const h = randArr(r, 7, 0, 5);
      const answer = trapped(h);
      return { ...base, topic: 'Water filled in layers', section: 'rain-in-layers', strategy: 'boundaries', answer,
        prompt: `Bars of width 1 arrive one at a time from the left, and you never know how many are still coming. Heights, in arrival order: ${arr(h)}. Rain fills every dip. How many units of water are trapped once the last bar has arrived? Process each bar as it arrives.`,
        hints: ['When a taller bar arrives, which earlier bars form a basin with it?', 'Keep bars whose heights never increase from bottom to top. A popped bar is a floor; the new top is the left wall.', 'Add width × (min(left wall, new bar) − floor) for each popped floor that has a left wall.'],
        rubric: ['The method works left to right, so it can handle bars arriving one at a time.', 'Each pop fills one horizontal layer between the left wall and the arriving bar.', 'A floor with no left wall holds nothing; O(n) total.'],
        explanation: `${answer} units, filled layer by layer as taller bars arrive.` };
    }
    case 'subarray-mins': {
      const a = randArr(r, 5, 1, 4);
      const answer = sumMins(a);
      return { ...base, topic: 'Contribution counting', section: 'subarray-minimums', strategy: 'boundaries', answer,
        prompt: `For ${arr(a)}, add up the minimum of every contiguous subarray (there are ${a.length * (a.length + 1) / 2} of them). Aim for O(n) rather than listing them.`,
        hints: ['For each element, in how many subarrays is it the minimum?', 'Its reach stops at the nearest smaller element on each side. With repeats, stop at an equal element on one side only.', 'Contribution = value × (choices of left end) × (choices of right end).'],
        rubric: ['Count each element’s contribution instead of enumerating subarrays.', 'Strict on one side, non-strict on the other, so equal minimums are counted once.', 'Boundaries come from the same pop-and-finalize loop as the histogram: O(n).'],
        explanation: `The sum is ${answer}.` };
    }
    case 'later-max': {
      const a = randArr(r, 6, 60, 75);
      const answer = a.map((_, i) => (i + 1 < a.length ? Math.max(...a.slice(i + 1)) : 0));
      return { ...base, topic: 'Know when you don’t need a waiting list', section: 'choose-the-tool', strategy: 'other', question: 'Enter the whole answer array.', answer,
        prompt: `Daily highs: ${arr(a)}. For each day, report the highest temperature on ANY later day, or 0 for the last day. Aim for O(n) time.`,
        hints: ['Is this asking for the nearest warmer day, or for something simpler?', 'Every day wants the maximum of everything after it.', 'Walk from the right, keeping one running maximum.'],
        rubric: ['The question asks for the maximum, not the nearest larger value.', 'One backward pass with a single running-max variable; no waiting structure.', 'O(n) time, O(1) extra space besides the output.'],
        explanation: `Answer ${arr(answer)}. A suffix maximum needs one variable, not a stack.` };
    }
  }
}

export const practice: PracticeSet = {
  storageKey: 'citadel-stacks-review-v1',
  strategies,
  conceptIds,
  challengeFor: (id, variant = 0) => challengeFor(id as ConceptId, variant),
};
