// Dry-run frames for stacks.mdx. Each generator mirrors the lesson's Java loop and computes every number from the input.
// The last frame always carries a text variable `answer` (JSON for arrays), so tests can compare it with a brute force.
import { recorder, tvars } from '../../lib/dryrun.ts';
import type { CellTone, Frame, Predict, Val, View } from '../../lib/dryrun.ts';

const J = JSON.stringify;
type ArrExtra = Partial<Extract<View, { kind: 'array' }>>;
const arr = (name: string, values: Val[], extra: ArrExtra = {}): View => ({ kind: 'array', name, values, ...extra });
const stk = (name: string, items: Val[], changed?: number[], removed?: Val[], note?: string): View =>
  ({ kind: 'stack', name, items, ...(changed ? { changed } : {}), ...(removed ? { removed } : {}), ...(note ? { note } : {}) });
const ptr = (at: number, label: string, tone: 'gold' | 'blue' | 'green' | 'purple' | 'red' | 'dim' = 'gold') => ({ at, label, tone });
// Two-way question; `slot` flips the option order so the right answer is not always first.
function yn(question: string, right: string, wrong: string, slot: number, explain: string): Predict {
  const flip = slot % 2 === 1;
  const options = flip ? [wrong, right] : [right, wrong];
  return { question, options, answer: flip ? 1 : 0, explain };
}
// Numeric question: the right number plus its two neighbours, rotated by `slot`.
function num(question: string, right: number, slot: number, explain: string): Predict {
  const list = [right, right + 1, Math.max(0, right - 1) === right ? right + 2 : right - 1].map(String);
  const shift = slot % 3;
  const options = list.map((_, k) => list[(k + 3 - shift) % 3]);
  return { question, options, answer: options.indexOf(String(right)), explain };
}

export function parenFrames(s: string): Frame[] {
  const r = recorder();
  const PAIR: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const chars = [...s];
  const stack: string[] = [];
  const tones: Record<number, CellTone> = {};
  const view = (i: number, t: Record<number, CellTone>) => arr('input', chars, { pointers: i < chars.length ? [ptr(i, 'next')] : [], tones: t });
  r.frame('The stack holds what each open bracket is still waiting for. On an opener we push the closer we expect to see.', [view(0, {}), stk('expected closers (top is last)', []), tvars({ answer: '?' })]);
  let slot = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (PAIR[c]) {
      stack.push(PAIR[c]); tones[i] = 'done';
      r.frame(`${c} opens a case, so we push the closer it needs: ${PAIR[c]}. The innermost open case is now on top.`, [view(i, { ...tones }), stk('expected closers (top is last)', [...stack], [stack.length - 1]), tvars({ answer: '?' })]);
      continue;
    }
    const top = stack.length ? stack[stack.length - 1] : null;
    const ok = top === c;
    const t = { ...tones, [i]: (ok ? 'compared' : 'out') as CellTone };
    const q = yn(`Next is ${c}. ${top ? `The top expects ${top}.` : 'The stack is empty.'} What happens?`, ok ? 'It matches: pop and continue' : 'Return false', ok ? 'Return false' : 'It matches: pop and continue', slot++,
      ok ? `${c} is exactly the closer the innermost open case needs.` : top ? `The innermost open case needs ${top}, not ${c}, so two pairs would cross.` : 'There is nothing open for this closer to close.');
    if (!ok) {
      r.frame(top ? `${c} arrives but the top expects ${top}. The pairs cross, so return false.` : `${c} arrives with nothing open. Return false before pop() can throw.`, [view(i, t), stk('expected closers (top is last)', [...stack]), tvars({ answer: 'false' })], q);
      return r.frames;
    }
    stack.pop(); tones[i] = 'done';
    r.frame(`${c} equals the expected closer ${top}. That case is closed, so pop it.`, [view(i, { ...tones }), stk('expected closers (top is last)', [...stack], undefined, [top!]), tvars({ answer: '?' })], q);
  }
  const valid = stack.length === 0;
  r.frame(valid ? 'The input is used up and the stack is empty: every case was closed. Return true.' : `The input is used up but ${stack.length} case(s) are still waiting for a closer. Return false.`,
    [view(chars.length, { ...tones }), stk('expected closers (top is last)', [...stack]), tvars({ answer: String(valid) })]);
  return r.frames;
}

export type MinOp = ['push', number] | ['pop'] | ['top'] | ['getMin'];
export function minStackFrames(ops: MinOp[]): Frame[] {
  const r = recorder();
  const values: number[] = [], mins: number[] = [], outputs: number[] = [];
  const views = (ch?: number[], rm?: Val[]): View[] => [stk('values', [...values], ch, rm), stk('mins (minimum at or below each level)', [...mins], ch)];
  r.frame('Two stacks of the same height. Each level of mins stores the minimum of everything at or below that level.', [...views(), tvars({ answer: '[]' })]);
  ops.forEach((op, k) => {
    if (op[0] === 'push') {
      const v = op[1], prevMin = mins.length ? mins[mins.length - 1] : null;
      values.push(v); mins.push(prevMin === null ? v : Math.min(v, prevMin));
      r.frame(prevMin === null ? `push(${v}): the stack was empty, so ${v} is the minimum. Push it to both stacks.` : `push(${v}): the new level's minimum is min(${v}, ${prevMin}) = ${mins[mins.length - 1]}. Push ${v} to values and ${mins[mins.length - 1]} to mins.`,
        [...views([values.length - 1]), tvars({ answer: J(outputs) })],
        prevMin === null ? undefined : num(`push(${v}) onto a stack whose minimum is ${prevMin}. What goes onto mins?`, mins[mins.length - 1], k, `min(${v}, ${prevMin}) = ${mins[mins.length - 1]}.`));
    } else if (op[0] === 'pop') {
      const gone = values.pop()!; mins.pop();
      r.frame(`pop(): remove ${gone} from both stacks. The new top of mins was written when that level was the top, and it is still true.`, [...views(undefined, [gone]), tvars({ answer: J(outputs) })]);
    } else {
      const out = op[0] === 'top' ? values[values.length - 1] : mins[mins.length - 1];
      outputs.push(out);
      r.frame(op[0] === 'top' ? `top() reads the top of values: ${out}.` : `getMin() reads the top of mins: ${out}. No scan needed.`, [...views([values.length - 1]), tvars({ answer: J(outputs) })],
        op[0] === 'getMin' ? num(`What does getMin() return?`, out, k, `The top of mins is ${out}.`) : undefined);
    }
  });
  return r.frames;
}

export function rpnFrames(tokens: string[]): Frame[] {
  const r = recorder();
  const stack: number[] = [];
  const tones: Record<number, CellTone> = {};
  const view = (i: number) => arr('tokens', tokens, { pointers: i < tokens.length ? [ptr(i, 'next')] : [], tones: { ...tones } });
  r.frame('Numbers are pushed. An operator pops its two operands from the top, combines them and pushes the result.', [view(0), stk('stack', []), tvars({ answer: '?' })]);
  tokens.forEach((t, i) => {
    if (!['+', '-', '*', '/'].includes(t)) {
      stack.push(Number(t)); tones[i] = 'done';
      r.frame(`${t} is a number, so push it.`, [view(i), stk('stack', [...stack], [stack.length - 1]), tvars({ answer: '?' })]);
      return;
    }
    const right = stack.pop()!, left = stack.pop()!;
    const res = t === '+' ? left + right : t === '-' ? left - right : t === '*' ? left * right : Math.trunc(left / right);
    stack.push(res); tones[i] = 'done';
    r.frame(`${t}: the first pop is the right operand (${right}), the second is the left (${left}). Compute ${left} ${t} ${right} = ${res} and push it.`,
      [view(i), stk('stack', [...stack], [stack.length - 1], [left, right]), tvars({ left, right, result: res, answer: '?' })],
      num(`${t} pops ${right} first, then ${left}. What is pushed?`, res, i, `Left is the second pop: ${left} ${t} ${right} = ${res}${t === '/' ? ' (integer division truncates toward zero)' : ''}.`));
  });
  r.frame(`Every token is read and one value is left: ${stack[0]}. That is the answer.`, [view(tokens.length), stk('stack', [...stack]), tvars({ answer: String(stack[0]) })]);
  return r.frames;
}

export function tempsFrames(t: number[]): Frame[] {
  const r = recorder();
  const n = t.length, ans: number[] = Array(n).fill(0), st: number[] = [];
  const lbl = (i: number) => `d${i}·${t[i]}`;
  const views = (today: number, ch?: number[], rm?: Val[], tones: Record<number, CellTone> = {}): View[] => [
    arr('temperatures', t, { pointers: today < n ? [ptr(today, 'today')] : [], tones }),
    stk('waiting days (top is last)', st.map(lbl), ch, rm),
    arr('answer', [...ans], { indices: false }),
  ];
  r.frame('Every day is a visitor that waits until a warmer day arrives. The stack holds the days still waiting; answer starts at 0.', [...views(0), tvars({ answer: J(ans) })]);
  let slot = 0;
  for (let today = 0; today < n; today++) {
    while (st.length && t[today] > t[st[st.length - 1]]) {
      const d = st.pop()!; ans[d] = today - d;
      r.frame(`${t[today]} is warmer than ${t[d]} (day ${d}), so today answers it: ${today} − ${d} = ${today - d}. Pop it; it never needs to be looked at again.`,
        [...views(today, undefined, [lbl(d)], { [d]: 'found' }), tvars({ answer: J(ans) })],
        yn(`Today is ${t[today]}. The top is day ${d} at ${t[d]}. What happens?`, 'Pop it and record the wait', 'Stop and push today', slot++, `${t[today]} > ${t[d]}, so today is the first warmer day for day ${d}.`));
    }
    const top = st.length ? st[st.length - 1] : null;
    st.push(today);
    r.frame(top === null ? `The stack is empty, so nobody is waiting. Push day ${today}.` : `${t[today]} is not warmer than ${t[top]}. Everything below the top is at least as warm, so stop and push day ${today}.`,
      [...views(today, [st.length - 1]), tvars({ answer: J(ans) })],
      top === null ? undefined : yn(`Today is ${t[today]}. The top is day ${top} at ${t[top]}. What happens?`, 'Stop and push today', 'Pop it and record the wait', slot++, `${t[today]} is not strictly greater than ${t[top]}, so day ${top} keeps waiting.`));
  }
  r.frame(`All days are read. Days still on the stack (${st.map(lbl).join(', ') || 'none'}) never saw a warmer day, so they keep 0.`, [...views(n), tvars({ answer: J(ans) })]);
  return r.frames;
}

export function circularFrames(nums: number[]): Frame[] {
  const r = recorder();
  const n = nums.length, ans: number[] = Array(n).fill(-1), st: number[] = [];
  const lbl = (j: number) => `i${j}·${nums[j]}`;
  const views = (i: number, ch?: number[], rm?: Val[], tones: Record<number, CellTone> = {}): View[] => [
    arr('nums read twice (i from 0 to 2n−1)', [...nums, ...nums], { pointers: i < 2 * n ? [ptr(i, 'i')] : [], regions: [{ from: 0, to: n - 1, label: 'lap one', tone: 'gold' }, { from: n, to: 2 * n - 1, label: 'lap two', tone: 'blue' }], tones }),
    stk('waiting indexes (top is last)', st.map(lbl), ch, rm),
    arr('answer', [...ans], { indices: false }),
  ];
  r.frame('Sweep twice so every index sees all of its circular successors. Push only in lap one; lap two only answers.', [...views(0), tvars({ answer: J(ans) })]);
  let slot = 0;
  for (let i = 0; i < 2 * n; i++) {
    const v = nums[i % n];
    while (st.length && v > nums[st[st.length - 1]]) {
      const j = st.pop()!; ans[j] = v;
      r.frame(`${v} (read at i = ${i}) is greater than ${nums[j]} at index ${j}, so it is index ${j}'s next greater value. Pop and record ${v}.`,
        [...views(i, undefined, [lbl(j)], { [i]: 'found' }), tvars({ answer: J(ans) })],
        yn(`Reading ${v}. The top is index ${j} with ${nums[j]}. What happens?`, 'Pop it and record the value', 'Stop here', slot++, `${v} > ${nums[j]}, so ${v} is the first greater value that index ${j} meets.`));
    }
    if (i < n) {
      st.push(i);
      r.frame(`${v} cannot answer the top any more, so index ${i} starts waiting. It is pushed in lap one only.`, [...views(i, [st.length - 1]), tvars({ answer: J(ans) })]);
    } else {
      r.frame(`i = ${i} is in lap two: ${v} has answered what it can, and it is not pushed because index ${i % n} already waited in lap one.`, [...views(i), tvars({ answer: J(ans) })]);
    }
  }
  r.frame(`Both laps are done. Indexes still waiting hold the maximum value, and nothing is greater, so they keep −1.`, [...views(2 * n), tvars({ answer: J(ans) })]);
  return r.frames;
}

export function fleetFrames(target: number, position: number[], speed: number[]): Frame[] {
  const r = recorder();
  const order = position.map((_, i) => i).sort((a, b) => position[b] - position[a]);
  const solo = (c: number) => (target - position[c]) / speed[c];
  const f2 = (x: number) => String(Number(x.toFixed(2)));
  const labels = order.map(c => `p${position[c]}·${f2(solo(c))}h`);
  const fleets: number[] = [];
  const tones: Record<number, CellTone> = {};
  const view = (k: number) => arr('cars, front to back (position · solo time)', labels, { indices: false, pointers: k < order.length ? [ptr(k, 'car')] : [], tones: { ...tones } });
  r.frame(`Process cars from the one closest to the target (${target}). Each car's solo time is (target − position) / speed. The stack holds one arrival time per fleet; the fleet directly ahead is on top.`, [view(0), stk('fleet arrival times (top = fleet ahead)', []), tvars({ answer: '0' })]);
  order.forEach((c, k) => {
    const t = solo(c), ahead = fleets.length ? fleets[fleets.length - 1] : null;
    const leads = ahead === null || t > ahead;
    if (leads) { fleets.push(t); tones[k] = 'found'; } else tones[k] = 'visited';
    r.frame(ahead === null ? `Nobody is ahead, so this car leads fleet 1 and arrives at ${f2(t)}h.`
      : leads ? `Solo time ${f2(t)}h is greater than the fleet ahead (${f2(ahead)}h): this car never catches up. It leads a new fleet; push ${f2(t)}.`
      : `Solo time ${f2(t)}h is at most the fleet ahead (${f2(ahead)}h): it catches up by the target and joins that fleet. Nothing is pushed.`,
    [view(k), stk('fleet arrival times (top = fleet ahead)', fleets.map(f2), leads ? [fleets.length - 1] : undefined), tvars({ answer: String(fleets.length) })],
    ahead === null ? undefined : yn(`This car needs ${f2(t)}h, the fleet ahead ${f2(ahead)}h. New fleet or join?`, leads ? 'It starts a new fleet' : 'It joins the fleet ahead', leads ? 'It joins the fleet ahead' : 'It starts a new fleet', k, leads ? 'It is strictly slower than the fleet ahead, so it cannot reach it before the target.' : 'It would reach the fleet at or before the target, and a fleet moves at its slowest car, so it joins.'));
  });
  r.frame(`Every car is placed. The number of fleets is the stack's size: ${fleets.length}.`, [view(order.length), stk('fleet arrival times (top = fleet ahead)', fleets.map(f2)), tvars({ answer: String(fleets.length) })]);
  return r.frames;
}

export function histFrames(h: number[]): Frame[] {
  const r = recorder();
  const n = h.length, st: number[] = [];
  let best = 0;
  const bars = [...h, 0];
  const lbl = (i: number) => `i${i}·${h[i]}`;
  const views = (i: number, ch?: number[], rm?: Val[], reg: { from: number; to: number; label?: string; tone?: 'green' }[] = []): View[] => [
    arr('heights (+ sentinel 0 at the end)', bars, { pointers: [ptr(i, 'i')], regions: reg }),
    stk('stack of indexes (top is last)', st.map(lbl), ch, rm),
  ];
  r.frame('Keep indexes with strictly increasing heights. A bar that is no taller than the top finalizes the top. A height-0 sentinel after the last bar flushes everything left.', [...views(0), tvars({ best, answer: '?' })]);
  let slot = 0;
  for (let i = 0; i <= n; i++) {
    const cur = bars[i];
    while (st.length && h[st[st.length - 1]] >= cur) {
      const m = st.pop()!, left = st.length ? st[st.length - 1] : -1, width = i - left - 1, area = h[m] * width, prev = best;
      best = Math.max(best, area);
      r.frame(`${i === n ? 'The sentinel (0)' : `Height ${cur}`} is no taller than ${h[m]} (index ${m}), so index ${m}'s rectangle cannot grow past i = ${i}. ${left === -1 ? 'The stack is now empty: nothing shorter on the left, so it spans back to index 0.' : `The new top is index ${left} (height ${h[left]}), the nearest shorter bar on the left.`} Width = ${i} − ${left} − 1 = ${width}, area ${h[m]} × ${width} = ${area}${area > prev ? ', a new best' : ''}.`,
        [...views(i, undefined, [lbl(m)], [{ from: left + 1, to: i - 1, label: `${h[m]}×${width}`, tone: 'green' }]), tvars({ popped_height: h[m], width, area, best })],
        num(`Index ${m} (height ${h[m]}) is popped at i = ${i}${left === -1 ? ' and the stack is empty' : `; the new top is index ${left}`}. What is its width?`, width, slot++, `width = i − newTop − 1 = ${i} − ${left} − 1 = ${width}${left === -1 ? ' (empty stack: newTop is −1)' : ''}.`));
    }
    const top = st.length ? st[st.length - 1] : null;
    st.push(i);
    r.frame(i === n ? 'The sentinel is pushed (harmless) and the stack is flushed. Every bar has been finalized.' : top === null ? `The stack is empty, so push index ${i}.` : `${cur} is taller than ${h[top]} (the top), so nothing is finalized. Push index ${i}.`, [...views(i, [st.length - 1]), tvars({ best, answer: i === n ? String(best) : '?' })]);
  }
  r.frame(`The largest rectangle has area ${best}.`, [...views(n), tvars({ answer: String(best) })]);
  return r.frames;
}

export function nextGreaterMapFrames(nums1: number[], nums2: number[]): Frame[] {
  const r = recorder();
  const st: number[] = [], map = new Map<number, number>();
  const entries = (): [Val, Val][] => [...map.entries()];
  const views = (i: number, ch?: number[], rm?: Val[], mch?: number[]): View[] => [
    arr('nums2', nums2, { pointers: i < nums2.length ? [ptr(i, 'value')] : [] }), stk('waiting values (top is last)', [...st], ch, rm), { kind: 'map', name: 'nextGreater', entries: entries(), ...(mch ? { changed: mch } : {}) },
  ];
  r.frame('Answers depend only on nums2. One waiting-stack pass fills a map from value to its next greater value; then each query is one lookup.', [...views(0), tvars({ answer: '?' })]);
  let slot = 0;
  nums2.forEach((v, i) => {
    while (st.length && v > st[st.length - 1]) {
      const w = st.pop()!; map.set(w, v);
      r.frame(`${v} > ${w}, so ${v} is the next greater value for ${w}. Store ${w} → ${v} and pop.`, [...views(i, undefined, [w], [map.size - 1]), tvars({ answer: '?' })],
        yn(`Value ${v}. The top is ${w}. What happens?`, 'Pop it and store the answer', 'Stop and push the value', slot++, `${v} is larger than ${w} and comes later in nums2.`));
    }
    st.push(v);
    r.frame(`${v} is not larger than the top, so it waits. Push ${v}.`, [...views(i, [st.length - 1]), tvars({ answer: '?' })]);
  });
  const answer = nums1.map(x => map.get(x) ?? -1);
  r.frame(`The pass is over. Values still waiting (${st.join(', ') || 'none'}) have no greater value to their right, so a lookup defaults to −1.`, [...views(nums2.length), tvars({ answer: '?' })]);
  r.frame(`Look up each value of nums1 = [${nums1.join(', ')}] in the map: ${answer.join(', ')}.`, [arr('nums1', nums1), arr('answers', answer, { indices: false }), { kind: 'map', name: 'nextGreater', entries: entries() }, tvars({ answer: J(answer) })]);
  return r.frames;
}

export function spanFrames(prices: number[]): Frame[] {
  const r = recorder();
  const st: [number, number][] = [], spans: number[] = [];
  const lbl = (p: [number, number]) => `${p[0]}·span ${p[1]}`;
  const views = (i: number, ch?: number[], rm?: Val[]): View[] => [
    arr('prices', prices, { pointers: i < prices.length ? [ptr(i, 'today')] : [] }), stk('stack of (price · span), prices strictly decrease', st.map(lbl), ch, rm), arr('spans so far', [...spans], { indices: false }),
  ];
  r.frame('Prices arrive one per day. A past day that today beats or ties can never block a later day, so pop it and absorb its span.', [...views(0), tvars({ answer: '[]' })]);
  let slot = 0;
  prices.forEach((p, i) => {
    let span = 1;
    while (st.length && st[st.length - 1][0] <= p) {
      const top = st.pop()!; span += top[1];
      r.frame(`${top[0]} <= ${p}, so today's span absorbs everything that day covered (${top[1]} day(s)). Span so far: ${span}.`, [...views(i, undefined, [lbl(top)]), tvars({ span, answer: J(spans) })],
        yn(`Price ${p}. The top is ${top[0]}. What happens?`, 'Pop it and add its span', 'Stop and push', slot++, `${top[0]} <= ${p}, and that day's span already counts the days it absorbed.`));
    }
    st.push([p, span]); spans.push(span);
    r.frame(`${st.length > 1 ? `${p} is lower than the top price ${st[st.length - 2][0]}, so stop. ` : 'The stack is empty. '}Push (${p}, ${span}). Today's span is ${span}.`, [...views(i, [st.length - 1]), tvars({ span, answer: J(spans) })],
      st.length > 1 ? num(`What span does ${p} get?`, span, slot++, `1 for today plus every absorbed span gives ${span}.`) : undefined);
  });
  r.frame(`All prices are read. Spans: ${spans.join(', ')}.`, [...views(prices.length), tvars({ answer: J(spans) })]);
  return r.frames;
}

export function asteroidFrames(rocks: number[]): Frame[] {
  const r = recorder();
  const st: number[] = [];
  const view = (i: number): View => arr('rocks', rocks, { pointers: i < rocks.length ? [ptr(i, 'rock')] : [] });
  r.frame('The stack holds survivors. A left-mover (negative) fights the top only while the top moves right (positive).', [view(0), stk('survivors (top is last)', []), tvars({ answer: '[]' })]);
  let slot = 0;
  rocks.forEach((rock, i) => {
    let alive = true;
    while (alive && rock < 0 && st.length && st[st.length - 1] > 0) {
      const top = st[st.length - 1], size = -rock;
      const out = top < size ? 'right wins' : top === size ? 'tie' : 'left wins';
      if (top < size) st.pop(); else { if (top === size) st.pop(); alive = false; }
      r.frame(top < size ? `${rock} meets ${top}: ${size} is bigger, so ${top} explodes. The ${rock} keeps going and fights the next survivor.` : top === size ? `${rock} meets ${top}: equal sizes, both explode.` : `${rock} meets ${top}: ${top} is bigger, so ${rock} explodes.`,
        [view(i), stk('survivors (top is last)', [...st], undefined, out === 'right wins' || out === 'tie' ? [top] : undefined), tvars({ answer: '[]' })],
        { question: `${rock} (moving left) meets ${top} (moving right). What happens?`, options: ['The right-mover explodes, the left-mover continues', 'Both explode', 'The left-mover explodes'], answer: top < size ? 0 : top === size ? 1 : 2, explain: top < size ? `${size} > ${top}.` : top === size ? `${size} = ${top}.` : `${top} > ${size}.` });
      slot++;
    }
    if (alive) {
      st.push(rock);
      r.frame(rock > 0 ? `${rock} moves right, so it cannot hit anything that came before. Push it.` : `${rock} moves left but there is no right-mover on top to hit. Push it.`, [view(i), stk('survivors (top is last)', [...st], [st.length - 1]), tvars({ answer: '[]' })]);
    }
  });
  r.frame(`All rocks have arrived. The survivors, bottom to top, are the answer: ${J(st)}.`, [view(rocks.length), stk('survivors (top is last)', [...st]), tvars({ answer: J(st) })]);
  return r.frames;
}

export function removeKFrames(num_: string, k0: number): Frame[] {
  const r = recorder();
  const digits = [...num_];
  const kept: string[] = [];
  let k = k0;
  const views = (i: number, ch?: number[], rm?: Val[]): View[] => [arr('digits', digits, { pointers: i < digits.length ? [ptr(i, 'digit')] : [] }), stk('kept digits (never decrease, top is last)', [...kept], ch, rm)];
  r.frame(`Remove exactly ${k0} digits to make the smallest number. A bigger digit sitting before a smaller one is the best thing to delete.`, [...views(0), tvars({ k, answer: '?' })]);
  let slot = 0;
  digits.forEach((d, i) => {
    while (k > 0 && kept.length && kept[kept.length - 1] > d) {
      const gone = kept.pop()!; k--;
      r.frame(`${gone} is larger than the arriving ${d} and removals remain, so delete ${gone}. A smaller digit now sits in its place, which makes the number smaller. ${k} removal(s) left.`, [...views(i, undefined, [gone]), tvars({ k, answer: '?' })],
        yn(`Arriving ${d}. The top is ${gone} and k > 0. What happens?`, 'Pop the top (a removal)', 'Push the arrival', slot++, `${gone} > ${d}: removing the larger digit earlier is always better.`));
    }
    kept.push(d);
    r.frame(`${kept.length > 1 ? `${d} is not smaller than the top ${kept[kept.length - 2]}${k === 0 ? ' (or no removals are left)' : ''}. ` : 'The stack is empty. '}Push ${d} onto the kept digits.`, [...views(i, [kept.length - 1]), tvars({ k, answer: '?' })]);
  });
  if (k > 0) {
    const cut = kept.splice(kept.length - k, k);
    r.frame(`${k} removal(s) are still owed. The kept digits never decrease, so the biggest ones are at the end: drop ${cut.join(', ')} from the tail.`, [...views(digits.length, undefined, cut), tvars({ k: 0, answer: '?' })]);
    k = 0;
  }
  const stripped = kept.join('').replace(/^0+/, '') || '0';
  r.frame(stripped !== kept.join('') ? `Strip leading zeros (a number has none) and keep at least one digit. Result: ${stripped}.` : `Nothing to strip. Result: ${stripped}.`, [arr('result', [...stripped], { indices: false }), tvars({ answer: stripped })]);
  return r.frames;
}

export function rainFrames(h: number[]): Frame[] {
  const r = recorder();
  const n = h.length, st: number[] = [];
  let water = 0;
  const lbl = (i: number) => `i${i}·${h[i]}`;
  const views = (i: number, ch?: number[], rm?: Val[], reg: { from: number; to: number; label?: string; tone?: 'blue' }[] = []): View[] => [
    arr('heights', h, { pointers: i < n ? [ptr(i, 'i')] : [], regions: reg }), stk('stack of indexes, heights never increase (top is last)', st.map(lbl), ch, rm),
  ];
  r.frame('Bars arrive one at a time. A taller bar closes a basin: the popped bar is the floor, the new top is the left wall, and the arriving bar is the right wall.', [...views(0), tvars({ water, answer: '?' })]);
  let slot = 0;
  for (let i = 0; i < n; i++) {
    while (st.length && h[i] > h[st[st.length - 1]]) {
      const floor = st.pop()!;
      if (!st.length) {
        r.frame(`${h[i]} is taller than the floor at index ${floor} (${h[floor]}), but nothing is left on the stack: there is no left wall, so water would run off. Stop popping.`, [...views(i, undefined, [lbl(floor)]), tvars({ water, answer: '?' })]);
        break;
      }
      const left = st[st.length - 1], width = i - left - 1, depth = Math.min(h[left], h[i]) - h[floor];
      water += width * depth;
      r.frame(`Floor index ${floor} (${h[floor]}), left wall index ${left} (${h[left]}), right wall index ${i} (${h[i]}). The layer is ${width} wide and min(${h[left]}, ${h[i]}) − ${h[floor]} = ${depth} deep: ${width * depth} unit(s). Total ${water}.`,
        [...views(i, undefined, [lbl(floor)], [{ from: left + 1, to: i - 1, label: `${width}×${depth}`, tone: 'blue' }]), tvars({ width, depth, water, answer: '?' })],
        num(`Floor ${h[floor]}, walls ${h[left]} and ${h[i]}, ${width} wide. How much water does this layer add?`, width * depth, slot++, `width × depth = ${width} × ${depth} = ${width * depth}.`));
    }
    st.push(i);
    r.frame(`Index ${i} (${h[i]}) is pushed and waits for a taller bar to its right.`, [...views(i, [st.length - 1]), tvars({ water, answer: i === n - 1 ? String(water) : '?' })]);
  }
  r.frame(`All bars have arrived. Trapped water: ${water}.`, [...views(n), tvars({ answer: String(water) })]);
  return r.frames;
}

export function subMinsFrames(a: number[]): Frame[] {
  const r = recorder();
  const MOD = 1_000_000_007n;
  const n = a.length, st: number[] = [];
  let total = 0n;
  const lbl = (i: number) => `i${i}·${a[i]}`;
  const views = (i: number, ch?: number[], rm?: Val[], reg: { from: number; to: number; label?: string; tone?: 'green' }[] = []): View[] => [
    arr('arr', a, { pointers: i < n ? [ptr(i, 'i')] : [], regions: reg }), stk('stack of indexes, values strictly increase (top is last)', st.map(lbl), ch, rm),
  ];
  r.frame('For each element, count the subarrays where it is the minimum: (m − left) × (right − m). Pop while arr[top] >= current: left is the nearest strictly smaller, i is the nearest smaller-or-equal.', [...views(0), tvars({ total: 0, answer: '?' })]);
  let slot = 0;
  for (let i = 0; i <= n; i++) {
    while (st.length && (i === n || a[st[st.length - 1]] >= a[i])) {
      const m = st.pop()!, left = st.length ? st[st.length - 1] : -1;
      const count = (m - left) * (i - m), add = BigInt(a[m]) * BigInt(count);
      total = (total + add) % MOD;
      r.frame(`${i === n ? 'The end of the array' : `${a[i]}`} stops index ${m} (value ${a[m]}) on the right at ${i}; its left stop is ${left}. It starts in ${m - left} way(s) and ends in ${i - m}, so it is the minimum of ${count} subarray(s): ${a[m]} × ${count} = ${add}.`,
        [...views(i, undefined, [lbl(m)], [{ from: left + 1, to: i - 1, label: `${m - left}×${i - m}`, tone: 'green' }]), tvars({ count, total: Number(total), answer: '?' })],
        num(`Index ${m} (value ${a[m]}): left stop ${left}, right stop ${i}. In how many subarrays is it the minimum?`, count, slot++, `(m − left) × (right − m) = ${m - left} × ${i - m} = ${count}.`));
    }
    st.push(i);
    if (i < n) r.frame(`${a[i]} is larger than the top, so nothing is finalized. Push index ${i}.`, [...views(i, [st.length - 1]), tvars({ total: Number(total), answer: '?' })]);
  }
  r.frame(`Every element has been credited. The sum of subarray minimums is ${total} (mod 1,000,000,007).`, [...views(n), tvars({ answer: String(total) })]);
  return r.frames;
}
