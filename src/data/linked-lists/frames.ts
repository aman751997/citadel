// Dry-run frames for every problem in src/dsa-lessons/linked-lists.mdx. Each generator runs the lesson's algorithm
// on a small in-memory list (real `next` pointers, real assignments), so a frame shows what each assignment did.
// The last frame has a text view with `answer`; tests/linked-lists-frames.test.ts pins it against brute force.
import { recorder, tvars, type Frame, type View, type ArrayView, type CellTone, type Val, type Predict } from '../../lib/dryrun.ts';

type Ref = number | null;
interface Mem { v: Val[]; nx: Ref[]; rd?: Ref[] }

const q = (question: string, options: string[], answer: number, explain: string): Predict => ({ question, options, answer, explain });
// Distinct options with the right one rotated by `salt`, so the answer is not always first.
const qp = (question: string, right: string, wrong: string[], explain: string, salt = 0): Predict => {
  const o = [right];
  for (const w of wrong) if (!o.includes(w) && o.length < 3) o.push(w);
  const options = o.map((_, i) => o[(i + o.length - (salt % o.length)) % o.length]);
  return q(question, options, options.indexOf(right), explain);
};

// A chain of nodes 0..n-1 (or dummy = node 0, real nodes 1..n).
const mem = (vals: Val[], dummy = false): Mem => {
  const v = dummy ? ['D', ...vals] : [...vals];
  return { v, nx: v.map((_, i): Ref => (i + 1 < v.length ? i + 1 : null)) };
};
const nm = (m: Mem, i: Ref) => (i === null ? 'null' : String(m.v[i]));

function walk(m: Mem, from: Ref) {
  const ids: number[] = [], seen = new Set<number>();
  let at = from !== null && from < m.v.length ? from : null;
  while (at !== null && !seen.has(at)) { ids.push(at); seen.add(at); at = m.nx[at]; }
  return { ids, loop: at };
}
export const listText = (m: Mem, from: Ref, sep = ' → ') => {
  const { ids } = walk(m, from);
  return ids.length ? ids.map(i => m.v[i]).join(sep) : 'empty';
};

// Draws the nodes reachable from `from`, then null (or a loop-back marker). Pointer labels sit on the node they point at.
function chain(m: Mem, from: Ref, name: string, ptrs: Record<string, Ref>, tones: Record<number, CellTone>, showNull: boolean): ArrayView {
  const { ids, loop } = walk(m, from);
  const values: Val[] = ids.map(i => m.v[i]);
  values.push(loop === null ? 'null' : `↩ ${m.v[loop]}`);
  const t: Record<number, CellTone> = { [ids.length]: 'out' };
  ids.forEach((id, k) => { if (tones[id]) t[k] = tones[id]; });
  const groups = new Map<number, string[]>();
  for (const [label, ref] of Object.entries(ptrs)) {
    const at = ref === null ? (loop === null && (showNull || from === null) ? ids.length : -1) : ids.indexOf(ref);
    if (at >= 0) groups.set(at, [...(groups.get(at) ?? []), label]);
  }
  return { kind: 'array', name, values, indices: false, join: '→', pointers: [...groups].map(([at, l]) => ({ at, label: l.join(', '), tone: 'gold' as const })), tones: t };
}

type Head = [name: string, from: string | number, hideWhenNull?: boolean];

class Sim {
  r = recorder();
  prev?: Record<string, Val>;
  m: Mem; P: Record<string, Ref>; heads: Head[]; showNull: boolean;
  constructor(m: Mem, P: Record<string, Ref>, heads: Head[], showNull = false) { this.m = m; this.P = P; this.heads = heads; this.showNull = showNull; }
  now() { return Object.fromEntries(Object.entries(this.P).map(([k, r]) => [k, nm(this.m, r)])); }
  views(tones?: Record<number, CellTone>, extra: View[] = []): View[] {
    const t = tones ?? (typeof this.P.cur === 'number' ? { [this.P.cur]: 'active' as CellTone } : {});
    const vs: View[] = [], seen = new Set<Ref>();
    for (const [name, from, hide] of this.heads) {
      const ref = typeof from === 'number' ? from : this.P[from];
      if ((hide && ref === null) || seen.has(ref)) continue;
      seen.add(ref);
      vs.push(chain(this.m, ref, name, this.P, t, this.showNull));
    }
    return [...vs, ...extra, tvars(this.now(), this.prev)];
  }
  say(caption: string, predict?: Predict, tones?: Record<number, CellTone>, extra: View[] = []) {
    this.r.frame(caption, this.views(tones, extra), predict);
    this.prev = this.now();
  }
  finish(caption: string, answer: Val, tones?: Record<number, CellTone>) {
    const vs = this.views(tones);
    const last = vs[vs.length - 1] as ReturnType<typeof tvars>;
    last.vars.push({ name: 'answer', value: answer, changed: true });
    this.r.frame(caption, vs);
    return this.r.frames;
  }
  // The four-line dance. Order matters: save, flip, advance prev, advance cur.
  dance(stop: () => boolean, ask = true, max = Infinity) {
    const { m, P } = this;
    let turn = 0;
    while (!stop() && turn < max) {
      const c = P.cur as number;
      turn++;
      P.next = m.nx[c];
      this.say(`Line 1, save the rope: next = cur.next = ${nm(m, P.next)}. Do this before touching cur.next, because cur.next is the only reference to ${P.next === null ? 'the end of the list' : listText(m, P.next)}.`,
        ask && turn === 1 ? q('cur is about to be re-pointed at prev. Which line must run first?', ['cur.next = prev', 'next = cur.next', 'prev = cur'], 1,
          'Overwriting cur.next destroys the only reference to the rest of the list. Save it first.') : undefined);
      m.nx[c] = P.prev;
      this.say(`Line 2, flip: cur.next = prev, so ${nm(m, c)} now points at ${nm(m, P.prev)}. Nothing is lost: ${P.next === null ? 'there is nothing after it' : `${listText(m, P.next)} is held by next`}.`,
        ask && turn === 2 && P.next !== null ? q(`After cur.next = prev, who still holds ${listText(m, P.next)}?`, ['next', 'cur', 'nobody'], 0,
          'cur.next no longer leads there. Only the variable next still does.') : undefined);
      P.prev = c;
      this.say(`Line 3, prev = cur: prev moves onto ${nm(m, c)}, the new front of the reversed part. Only cur and prev hold it now.`);
      P.cur = P.next;
      this.say(`Line 4, cur = next: cur moves onto ${nm(m, P.cur)}, the first node not yet flipped.`);
    }
  }
}

// ---- Part One -----------------------------------------------------------------------------------
export function middleFrames(vals: number[]): Frame[] {
  const m = mem(vals);
  if (!vals.length) return new Sim(m, { slow: null, fast: null }, [['list', 0]], true).finish('head is null, so there is no middle. Return null.', 'null');
  const P: Record<string, Ref> = { slow: 0, fast: 0 };
  const s = new Sim(m, P, [['list', 0]], true);
  s.say('slow and fast both start on the head. In every turn slow takes 1 hop and fast takes 2, so fast always covers twice the distance.');
  let turns = 0;
  while (P.fast !== null && m.nx[P.fast] !== null) {
    turns++;
    P.slow = m.nx[P.slow as number];
    P.fast = m.nx[m.nx[P.fast] as number];
    s.say(`Turn ${turns}: slow takes 1 hop to ${nm(m, P.slow)}, fast takes 2 hops to ${nm(m, P.fast)}. Fast has made ${2 * turns} hops and slow ${turns}.`,
      turns === 1 ? qp('Where does fast land after the first turn?', nm(m, P.fast), [nm(m, 1), nm(m, 0), 'null'], 'fast moves two hops from the head.', 1) : undefined);
  }
  return s.finish(P.fast === null ? 'fast ran off the end (null), so the loop stops. slow made half of fast\'s hops: it stands on the second middle.' : 'fast is on the last node and fast.next is null, so the loop stops. slow made half of fast\'s hops: it stands on the exact middle.', nm(m, P.slow));
}

export function cycleFrames(vals: number[], loopTo: number | null): Frame[] {
  const m = mem(vals);
  if (!vals.length) return new Sim(m, { slow: null, fast: null }, [['list', 0]], true).finish('head is null: no nodes, so no cycle.', 'false');
  if (loopTo !== null) m.nx[vals.length - 1] = loopTo;
  const P: Record<string, Ref> = { slow: 0, fast: 0 };
  const s = new Sim(m, P, [['list', 0]], true);
  s.say('Both start on the head, so slow == fast already. That proves nothing: move first, then compare.');
  let turns = 0;
  while (P.fast !== null && m.nx[P.fast] !== null) {
    turns++;
    P.slow = m.nx[P.slow as number];
    P.fast = m.nx[m.nx[P.fast] as number];
    const met = P.slow === P.fast;
    const ask = turns === 1 || met ? q('slow and fast have just moved. Are they on the same node?', ['Yes', 'No'], met ? 0 : 1, 'Compare the nodes themselves (slow == fast), not their values.') : undefined;
    if (met) return (s.say(`Turn ${turns}: slow → ${nm(m, P.slow)}, fast → ${nm(m, P.fast)}. Same node. Inside a loop fast gains exactly one node per turn, so it cannot skip over slow: this meeting proves a cycle.`, ask, { [P.slow as number]: 'found' }), s.finish('Return true.', 'true', { [P.slow as number]: 'found' }));
    s.say(`Turn ${turns}: slow → ${nm(m, P.slow)}, fast → ${nm(m, P.fast)}. Different nodes, so keep going.`, ask);
  }
  return s.finish('fast reached the end (null). A list with an end has no cycle. Return false.', 'false');
}

export function nthFrames(vals: number[], n: number): Frame[] {
  const m = mem(vals, true);
  const P: Record<string, Ref> = { lead: 0, trail: 0 };
  const s = new Sim(m, P, [['list (D = dummy)', 0]], true);
  s.say(`Remove the ${n}th node from the end. lead and trail both start on the dummy D, so the head is not a special case.`);
  for (let i = 0; i <= n; i++) {
    P.lead = m.nx[P.lead as number];
    s.say(i === 0 ? `lead hops alone first. Hop 1 of ${n + 1}: lead → ${nm(m, P.lead)}. A gap of n + 1 puts trail one node BEFORE the target at the end.` : `Hop ${i + 1} of ${n + 1}: lead → ${nm(m, P.lead)}. trail has not moved.`,
      i === 0 ? q(`How many hops does lead take alone (n = ${n})?`, [`${n}`, `${n + 1}`, `${n + 2}`], 1, 'n + 1: a rope is cut from the node before the target, so trail must stop one node earlier.') : undefined);
  }
  while (P.lead !== null) {
    P.lead = m.nx[P.lead];
    P.trail = m.nx[P.trail as number];
    s.say(`Both hop once: lead → ${nm(m, P.lead)}, trail → ${nm(m, P.trail)}. The gap stays n + 1 = ${n + 1} hops.`);
  }
  const target = m.nx[P.trail as number] as number;
  s.say(`lead is null, so trail is exactly n + 1 hops behind the end: it stands on ${nm(m, P.trail)}, right before the target ${nm(m, target)}.`, undefined, { [target]: 'out' });
  m.nx[P.trail as number] = m.nx[target];
  return s.finish(`trail.next = trail.next.next: ${nm(m, P.trail)} now points past ${nm(m, target)}, which nothing refers to any more. The list starts at dummy.next.`, listText(m, m.nx[0]), { [target]: 'out' });
}

export function duplicateFrames(nums: number[]): Frame[] {
  const r = recorder();
  let slow = 0, fast = 0, phase = 'phase 1: race';
  let prev: Record<string, Val> | undefined;
  const snap = () => ({ slow, fast, phase });
  const arr = (): ArrayView => ({ kind: 'array', name: 'nums (index i leads to nums[i])', values: nums,
    pointers: slow === fast ? [{ at: slow, label: 'slow, fast', tone: 'gold' }] : [{ at: slow, label: 'slow', tone: 'gold' }, { at: fast, label: 'fast', tone: 'blue' }] });
  const say = (caption: string, predict?: Predict) => { r.frame(caption, [arr(), tvars(snap(), prev)], predict); prev = snap(); };
  say(`Read nums as a list: index i has one arrow, to index nums[i]. Start both on index 0. Nothing points at 0, so 0 is on a tail and the walk must end in a loop.`);
  let turn = 0;
  do {
    turn++;
    const a = slow, b = fast, mid = nums[fast];
    slow = nums[slow]; fast = nums[nums[fast]];
    say(`Phase 1, turn ${turn}: slow = nums[${a}] = ${slow}. fast = nums[nums[${b}]] = nums[${mid}] = ${fast}.${slow === fast ? ' They are on the same index: somewhere inside the loop, but not necessarily at its entrance.' : ''}`,
      turn === 1 ? qp('slow = nums[slow]; fast = nums[nums[fast]]. Which index is fast on after one turn?', String(fast), [String(slow), String(nums[nums[nums[0]]]), String(nums[0] + 1)], 'fast follows two arrows per turn, slow follows one.', 2) : undefined);
  } while (slow !== fast);
  slow = 0; phase = 'phase 2: restart';
  say('Phase 2: send slow back to index 0 and leave fast where they met. Now both take ONE arrow per turn. The tail length equals the distance from the meeting point to the entrance (plus whole laps), so they arrive together.');
  while (slow !== fast) {
    slow = nums[slow]; fast = nums[fast];
    say(`slow → ${slow}, fast → ${fast}.${slow === fast ? ` Same index: it is the loop's entrance, the one index with two arrows into it. ${slow} is the duplicate.` : ''}`);
  }
  r.frame(`Return ${slow}: two different indices hold the value ${slow}.`, [arr(), tvars({ ...snap(), answer: slow }, prev)]);
  return r.frames;
}

// ---- Part Two -----------------------------------------------------------------------------------
const revHeads: Head[] = [['reversed so far (from prev)', 'prev'], ['still to flip (from cur)', 'cur', true], ['the saved rope (from next)', 'next', true]];

export function reverseFrames(vals: number[]): Frame[] {
  const m = mem(vals);
  const P: Record<string, Ref> = { prev: null, cur: vals.length ? 0 : null, next: null };
  const s = new Sim(m, P, revHeads);
  s.say(`The list is ${vals.length ? vals.join(' → ') + ' → null' : 'empty'}. prev is null (the reversed part is empty) and cur is the head. Each turn moves one node from the front of the untouched part to the front of the reversed part.`);
  s.dance(() => P.cur === null);
  return s.finish(`cur is null, so every node has been flipped. Return prev, not cur: cur has walked off the end. The new head is ${nm(m, P.prev)}.`, listText(m, P.prev), Object.fromEntries(walk(m, P.prev).ids.map(i => [i, 'found' as CellTone])));
}

// Runs one correct turn, then the second turn in the WRONG order, and shows which nodes nobody holds.
export function reverseBugFrames(vals: number[]): Frame[] {
  const m = mem(vals);
  const P: Record<string, Ref> = { prev: 0, cur: 1, next: null };
  m.nx[0] = null;
  const lost = () => {
    const held = new Set<number>();
    for (const r of Object.values(P)) if (r !== null) walk(m, r).ids.forEach(i => held.add(i));
    return m.v.map((_, i) => i).filter(i => !held.has(i));
  };
  const gone = (): View => ({ kind: 'array', name: 'nobody holds these', values: [...lost().map(i => m.v[i]), 'null'], join: '→', indices: false,
    tones: { ...Object.fromEntries(lost().map((_, k) => [k, 'out' as CellTone])), [lost().length]: 'out' } });
  const s = new Sim(m, P, [['reversed so far (from prev)', 'prev'], ['from cur', 'cur']]);
  s.say(`One turn is done correctly: ${nm(m, 0)} → null is the reversed part and cur stands on ${nm(m, 1)}. Now run the next turn with lines 1 and 2 SWAPPED.`, undefined, undefined, [gone()]);
  m.nx[1] = P.prev;
  s.say(`Wrong order, line A: cur.next = prev. ${nm(m, 1)} now points back at ${nm(m, 0)}. The only reference to ${listText(m, 2)} was ${nm(m, 1)}.next, and it has just been overwritten.`,
    q(`After cur.next = prev, is anything still pointing at ${nm(m, 2)}?`, ['Yes, next', 'No, nobody'], 1, 'next has not been assigned yet, and the old link is gone.'), undefined, [gone()]);
  P.next = m.nx[1];
  s.say(`Wrong order, line B: next = cur.next. That saves ${nm(m, P.next)} (the node behind), not ${nm(m, 2)}. Too late: ${listText(m, 2)} is unreachable from every variable.`, undefined, undefined, [gone()]);
  const out = lost().map(i => m.v[i]).join(' → ');
  return (s.r.frame(`Lost nodes: ${out || 'none'}. This is why the order is save, flip, advance, advance: never drop the rope.`, [...s.views(undefined, [gone()]), tvars({ answer: out || 'none' })]), s.r.frames);
}

export function reverseBetweenFrames(vals: number[], left: number, right: number): Frame[] {
  const m = mem(vals, true);
  const P: Record<string, Ref> = { before: 0, first: null, prev: null, cur: null, next: null };
  const s = new Sim(m, P, [['list from the dummy', 0], ['flipped part (from prev)', 'prev', true], ['rest (from cur)', 'cur', true], ['the saved rope (from next)', 'next', true]]);
  s.say(`Reverse positions ${left} to ${right}. Put a dummy D in front, then stand before on the node just before position ${left}.`);
  for (let i = 1; i < left; i++) { P.before = m.nx[P.before as number]; s.say(`before moves to position ${i}: ${nm(m, P.before)}.`); }
  P.first = m.nx[P.before as number]; P.cur = P.first;
  s.say(`first = before.next = ${nm(m, P.first)}. It is the stretch's first node, so after the flips it will be the stretch's LAST node. cur starts on it; prev starts as null.`);
  s.dance(() => P.cur === null, true, right - left + 1);
  s.say(`The flips are done, but the stretch is still disconnected: before → ${nm(m, P.first)} → null, while prev holds the flipped stretch and cur holds everything after position ${right}. Two seams to re-tie.`);
  m.nx[P.before as number] = P.prev;
  s.say(`Seam 1: before.next = prev. ${nm(m, P.before)} now enters the stretch at its new front, ${nm(m, P.prev)}.`);
  m.nx[P.first as number] = P.cur;
  s.say(`Seam 2: first.next = cur. ${nm(m, P.first)}, now the stretch's last node, points at ${nm(m, P.cur)}. Without this line ${listText(m, P.cur)} would be dropped.`,
    q('What must first.next point at after the flips?', [`cur (${nm(m, P.cur)}, the node after position ${right})`, 'prev', 'null'], 0, 'first is now the stretch\'s last node; the rest of the list hangs off cur.'));
  return s.finish(`Return dummy.next. The list reads ${listText(m, m.nx[0])}.`, listText(m, m.nx[0]));
}

export function kGroupFrames(vals: number[], k: number): Frame[] {
  const m = mem(vals, true);
  const P: Record<string, Ref> = { before: 0, probe: null, first: null, after: null, prev: null, cur: null, next: null };
  const s = new Sim(m, P, [['list from the dummy', 0], ['flipped group (from prev)', 'prev', true], ['rest (from cur)', 'cur', true], ['the saved rope (from next)', 'next', true]]);
  s.say(`Reverse every group of ${k}. before stands in front of the next group; it starts on the dummy.`);
  let group = 0;
  for (;;) {
    group++;
    P.probe = P.before;
    for (let i = 0; i < k && P.probe !== null; i++) P.probe = m.nx[P.probe];
    if (P.probe === null) {
      s.say(`Count before you cut: the probe ran off the end before finding ${k} nodes, so fewer than ${k} remain. Leave them exactly as they are.`,
        q('Fewer than k nodes remain. Reverse them anyway?', ['Yes', 'No, leave them'], 1, 'The problem keeps a short tail in its original order.'));
      break;
    }
    P.first = m.nx[P.before as number]; P.after = m.nx[P.probe];
    s.say(`Group ${group}: the probe found ${k} nodes, ending on ${nm(m, P.probe)}. first = ${nm(m, P.first)} (it will become the group's last node), after = ${nm(m, P.after)}.`);
    P.prev = null; P.cur = P.first; P.probe = null;
    s.dance(() => P.cur === P.after, group === 1 && k > 1);
    m.nx[P.before as number] = P.prev;
    s.say(`Seam 1: before.next = prev. ${nm(m, P.before)} now enters the group at ${nm(m, P.prev)}.`);
    m.nx[P.first as number] = P.after;
    s.say(`Seam 2: first.next = after. ${nm(m, P.first)} now leads on to ${nm(m, P.after)}.`);
    P.before = P.first; P.prev = P.cur = P.next = P.first = P.after = null;
    s.say(`before = first: stand on the group's old first node, which is now its last. It is right in front of the next group.`);
  }
  return s.finish(`No full group is left. The list reads ${listText(m, m.nx[0])}.`, listText(m, m.nx[0]));
}

// ---- Part Three ---------------------------------------------------------------------------------
export function mergeListsFrames(a: number[], b: number[]): Frame[] {
  const m = mem([0], false);
  const append = (vals: number[]): Ref => {
    let head: Ref = null, last: Ref = null;
    for (const x of vals) { const id = m.v.push(x) - 1; m.nx.push(null); if (last === null) head = id; else m.nx[last] = id; last = id; }
    return head;
  };
  m.v[0] = 'D'; m.nx[0] = null;
  const P: Record<string, Ref> = { tail: 0, list1: append(a), list2: append(b) };
  const out: number[] = [];
  const merged = (): View => ({ kind: 'array', name: 'merged so far (dummy … tail)', values: ['D', ...out.map(i => m.v[i])], join: '→', indices: false,
    pointers: [{ at: out.length, label: 'tail', tone: 'green' }], tones: Object.fromEntries(out.map((_, k) => [k + 1, 'done' as CellTone])) });
  const s = new Sim(m, P, [['list1', 'list1'], ['list2', 'list2']], true);
  s.say(`Both lists are sorted. A dummy D plus a tail pointer build the answer out of the existing nodes: no new nodes, no special case for the first one.`, undefined, {}, [merged()]);
  while (P.list1 !== null && P.list2 !== null) {
    const x = m.v[P.list1] as number, y = m.v[P.list2] as number, takeA = x <= y;
    const pick = takeA ? P.list1 : P.list2;
    m.nx[P.tail as number] = pick;
    if (takeA) P.list1 = m.nx[P.list1]; else P.list2 = m.nx[P.list2];
    P.tail = pick; out.push(pick);
    s.say(`Compare the two fronts: ${x} vs ${y}. ${takeA ? `${x} <= ${y}, so take list1's node` : `${y} < ${x}, so take list2's node`}: tail.next = it, advance that list, tail = tail.next.`,
      out.length === 1 ? q(`Fronts are ${x} and ${y}. Which node is spliced after tail?`, [`${x} (list1)`, `${y} (list2)`], takeA ? 0 : 1, 'The smaller front goes first; on a tie take list1 so the merge is stable.') : undefined, {}, [merged()]);
  }
  m.nx[P.tail as number] = P.list1 !== null ? P.list1 : P.list2;
  s.say(`One list is empty. tail.next = the other list: it is already linked and already sorted, so one assignment brings in every leftover node.`, undefined, {}, [{ ...merged(), values: [...(merged() as ArrayView).values, ...walk(m, m.nx[P.tail as number]).ids.map(i => m.v[i])] }]);
  return s.finish(`Return dummy.next. The merged list is ${listText(m, m.nx[0])}.`, listText(m, m.nx[0]));
}

export function reorderFrames(vals: number[]): Frame[] {
  const m = mem(vals);
  const P: Record<string, Ref> = { slow: vals.length ? 0 : null, fast: vals.length ? 0 : null };
  const s = new Sim(m, P, [['list from head', 0]], true);
  if (vals.length < 2) return s.finish('Zero or one node: nothing to reorder.', vals.join(' → ') || 'empty');
  s.say('Three moves chained: find the end of the first half, cut and reverse the second half, then weave. First, slow and fast from the head.');
  let turns = 0;
  while (m.nx[P.fast as number] !== null && m.nx[m.nx[P.fast as number] as number] !== null) {
    turns++;
    P.slow = m.nx[P.slow as number]; P.fast = m.nx[m.nx[P.fast as number] as number];
    s.say(`Turn ${turns}: slow → ${nm(m, P.slow)}, fast → ${nm(m, P.fast)}. The guard fast.next != null && fast.next.next != null stops slow on the LAST node of the first half.`);
  }
  s.heads = [['first half (from head)', 0], ['reversed second half (from prev)', 'prev', true], ['still to flip (from cur)', 'cur', true], ['the saved rope (from next)', 'next', true]];
  P.cur = m.nx[P.slow as number]; P.prev = null; P.next = null; m.nx[P.slow as number] = null; delete P.fast;
  s.say(`Stop: slow is on ${nm(m, P.slow)}. Cut with slow.next = null so the halves are separate lists. cur is the second half's head, ${nm(m, P.cur)}. Reverse it with the four lines.`, undefined, {});
  s.dance(() => P.cur === null, false);
  P.second = P.prev; P.first = 0; delete P.slow; delete P.prev; delete P.cur; delete P.next;
  s.heads = [['list from head', 0], ['second half left (from second)', 'second', true]];
  s.say(`The second half is reversed: ${listText(m, P.second)}. Weave: take one node from the front of each half, alternating.`, undefined, {});
  while (P.second !== null) {
    const n1 = m.nx[P.first as number], n2 = m.nx[P.second];
    P.n1 = n1; P.n2 = n2;
    s.say(`Save both ropes first: n1 = first.next = ${nm(m, n1)}, n2 = second.next = ${nm(m, n2)}. Both re-ties below overwrite a link that is the only way to reach them.`, undefined, {});
    m.nx[P.first as number] = P.second; m.nx[P.second] = n1;
    const woven = P.second;
    P.first = n1; P.second = n2; delete P.n1; delete P.n2;
    s.say(`first.next = second, second.next = n1: ${nm(m, woven)} is woven in. Then first = n1 (${nm(m, n1)}), second = n2 (${nm(m, n2)}).`, undefined, {});
  }
  return s.finish(`second is null: done. The list reads ${listText(m, 0)}.`, listText(m, 0));
}

export function copyRandomFrames(rnd: Ref[]): Frame[] {
  const n = rnd.length;
  const L = (i: number) => String.fromCharCode(65 + i);
  const m: Mem = { v: Array.from({ length: n }, (_, i) => L(i)), nx: Array.from({ length: n }, (_, i): Ref => (i + 1 < n ? i + 1 : null)), rd: [...rnd] };
  const snapshot = () => JSON.stringify([walk(m, 0).ids.map(i => [m.v[i], m.rd![i] === null ? null : m.v[m.rd![i] as number]])]);
  const before = snapshot();
  const P: Record<string, Ref> = { cur: n ? 0 : null, copyHead: null };
  const randoms = (): View => ({ kind: 'text', name: 'random pointers', vars: [...Array(m.v.length).keys()].map(i => ({ name: `${m.v[i]}.random`, value: nm(m, m.rd![i]), changed: false })) });
  const clones = (): Record<number, CellTone> => Object.fromEntries(m.v.map((_, i) => [i, i >= n ? 'compared' : 'visited']).filter(([i]) => (i as number) >= n)) as Record<number, CellTone>;
  const s = new Sim(m, P, [['list', 0], ['copy (from copyHead)', 'copyHead', true]]);
  const tone = () => ({ ...clones(), ...(typeof P.cur === 'number' ? { [P.cur]: 'active' as CellTone } : {}) });
  const show = (caption: string, predict?: Predict) => s.say(caption, predict, tone(), [randoms()]);
  if (!n) return s.finish('head is null: nothing to copy.', '');
  show('Weave: put each clone right after its original (A → A′ → B → B′ …). Then the clone of any node X is simply X.next. Pass 1 inserts the clones.');
  while (P.cur !== null) {
    const o = P.cur, id = m.v.length;
    m.v.push(`${m.v[o]}′`); m.nx.push(m.nx[o]); m.rd!.push(null);
    m.nx[o] = id; P.cur = m.nx[id];
    show(`Pass 1: copy = new Node(${m.v[o]}); copy.next = cur.next; cur.next = copy; cur = cur.next.next. ${m.v[id]} now sits right after ${m.v[o]}.`);
  }
  P.cur = 0;
  show(`Pass 2: set every clone's random. A clone's pointers must land on CLONES, never on the old chain.`);
  while (P.cur !== null) {
    const o = P.cur, c = m.nx[o] as number, r = m.rd![o];
    if (r !== null) m.rd![c] = m.nx[r];
    show(r === null ? `${m.v[o]}.random is null, so ${m.v[c]}.random stays null.` : `${m.v[o]}.random is ${m.v[r]}, so ${m.v[c]}.random = ${m.v[o]}.random.next = ${nm(m, m.nx[r])}: the clone of ${m.v[r]}, not ${m.v[r]} itself.`,
      r !== null ? q(`${m.v[o]}.random is ${m.v[r]}. What does ${m.v[c]}.random become?`, [`${m.v[r]}`, `${m.v[r]}′`], 1, `Clones must point at clones. The clone of any node X is X.next.`) : undefined);
    P.cur = m.nx[c];
  }
  P.copyHead = m.nx[0]; P.cur = 0;
  show('Pass 3: unweave. Re-tie every original to the original after it, and every clone to the clone after it. This restores the input exactly.');
  while (P.cur !== null) {
    const o = P.cur, c = m.nx[o] as number;
    m.nx[o] = m.nx[c];
    m.nx[c] = m.nx[c] === null ? null : m.nx[m.nx[c] as number];
    P.cur = m.nx[o];
    show(`copy = cur.next = ${m.v[c]}; cur.next = copy.next; copy.next = copy.next.next. ${m.v[o]} leads on to ${nm(m, m.nx[o])} again and ${m.v[c]} to ${nm(m, m.nx[c])}.`);
  }
  const copyIds = walk(m, P.copyHead).ids;
  const answer = copyIds.map(i => `${m.v[i]}>${m.rd![i] === null ? 'null' : m.v[m.rd![i] as number]}`).join(',');
  const fin = s.finish(`Return copyHead. The copy has the same shape and none of its pointers lead into the old chain. Original restored: ${snapshot() === before ? 'yes' : 'no'}.`, answer, tone());
  (fin[fin.length - 1].views.at(-1) as ReturnType<typeof tvars>).vars.push({ name: 'restored', value: String(snapshot() === before), changed: false });
  return fin;
}

export type LruOp = ['put', number, number] | ['get', number];
export function lruFrames(capacity: number, ops: LruOp[]): Frame[] {
  const r = recorder();
  const order: number[] = [];
  const val = new Map<number, number>();
  const outs: number[] = [];
  const list = (tones: Record<number, CellTone> = {}): View => ({ kind: 'array', name: 'recency list (front = most recent)', values: ['H', ...order.map(k => `${k}:${val.get(k)}`), 'T'], join: '⇄', indices: false,
    tones: { 0: 'out', [order.length + 1]: 'out', ...tones } });
  const map = (changed: number[] = [], removed: number[] = []): View => ({ kind: 'map', name: 'HashMap key → node', entries: [...val].map(([k, v]) => [k, `${k}:${v}`] as [Val, Val]), changed, removed });
  const say = (caption: string, extra: Record<string, Val> = {}, predict?: Predict, tones?: Record<number, CellTone>, changed: number[] = [], removed: number[] = []) =>
    r.frame(caption, [list(tones), map(changed, removed), tvars({ capacity, size: val.size, outputs: JSON.stringify(outs), ...extra })], predict);
  say(`Capacity ${capacity}. A HashMap finds a node by key in O(1); a doubly linked list between sentinels H and T keeps recency order, so the least recent node is always T.prev.`);
  const front = (k: number) => { order.unshift(k); };
  for (const op of ops) {
    if (op[0] === 'get') {
      const k = op[1];
      if (!val.has(k)) { outs.push(-1); say(`get(${k}): not in the map, return -1. Nothing changes.`); continue; }
      order.splice(order.indexOf(k), 1); front(k); outs.push(val.get(k)!);
      say(`get(${k}): the map finds the node, unlink it (neighbours point at each other) and relink it right after H. Return ${val.get(k)}. A hit counts as use.`, {}, undefined, { 1: 'active' });
    } else {
      const [, k, v] = op;
      if (val.has(k)) {
        val.set(k, v); order.splice(order.indexOf(k), 1); front(k);
        say(`put(${k}, ${v}): the key exists, so update its value and move it to the front. An update never evicts.`, {}, undefined, { 1: 'active' });
        continue;
      }
      if (val.size === capacity) {
        const old = order[order.length - 1];
        say(`put(${k}, ${v}): the cache is full (${capacity}). The least recent node is T.prev = key ${old}. Evict it from the list AND from the map.`,
          {}, q('The cache is full. Which key is evicted?', [`${old} (T.prev)`, `${order[0]} (H.next)`], 0, 'The back of the list is the least recently used.'), { [order.length]: 'out' });
        order.pop(); val.delete(old);
        say(`Evicted key ${old}: unlink it from the list and remove it from the map. Both must change together, or they drift apart.`, {}, undefined, undefined, [], [old]);
      }
      val.set(k, v); front(k);
      say(`put(${k}, ${v}): add a new node right after H and register it in the map.`, {}, undefined, { 1: 'active' }, [[...val.keys()].indexOf(k)]);
    }
  }
  r.frame(`All operations done. get results: ${JSON.stringify(outs)}.`, [list(), map(), tvars({ answer: JSON.stringify(outs) })]);
  return r.frames;
}

// ---- Side quests --------------------------------------------------------------------------------
export function cycleEntranceFrames(vals: number[], loopTo: number | null): Frame[] {
  const m = mem(vals);
  if (!vals.length) return new Sim(m, { slow: null, fast: null }, [['list', 0]], true).finish('head is null: no cycle.', 'none');
  if (loopTo !== null) m.nx[vals.length - 1] = loopTo;
  const P: Record<string, Ref> = { slow: 0, fast: 0 };
  const s = new Sim(m, P, [['list', 0]], true);
  s.say('Phase 1 is the cycle race: move both, then compare nodes.');
  let turns = 0;
  while (P.fast !== null && m.nx[P.fast] !== null) {
    turns++;
    P.slow = m.nx[P.slow as number]; P.fast = m.nx[m.nx[P.fast] as number];
    if (P.slow === P.fast) {
      s.say(`Turn ${turns}: slow and fast meet on ${nm(m, P.slow)}. There is a loop, but this is only SOMEWHERE in it.`);
      P.walker = 0;
      s.say('Phase 2: put a walker on the head. Step the walker and slow one node at a time. The head-to-entrance distance equals the meeting-to-entrance distance plus whole laps.');
      while (P.walker !== P.slow) {
        P.walker = m.nx[P.walker as number]; P.slow = m.nx[P.slow as number];
        s.say(`walker → ${nm(m, P.walker)}, slow → ${nm(m, P.slow)}.${P.walker === P.slow ? " Same node: the loop's entrance." : ''}`);
      }
      return s.finish(`Return the walker's node, ${nm(m, P.walker)}. It is the entrance: the node with two arrows into it.`, String(P.walker), { [P.walker as number]: 'found' });
    }
    s.say(`Turn ${turns}: slow → ${nm(m, P.slow)}, fast → ${nm(m, P.fast)}. Different nodes.`);
  }
  return s.finish('fast reached the end (null): the list has no cycle. Return null.', 'none');
}

export function palindromeFrames(vals: number[]): Frame[] {
  const m = mem(vals);
  const P: Record<string, Ref> = { slow: vals.length ? 0 : null, fast: vals.length ? 0 : null };
  const s = new Sim(m, P, [['list from head', 0]], true);
  if (!vals.length) return s.finish('An empty list reads the same both ways.', 'true');
  s.say('You cannot walk backwards, so make the back half walk forwards. Step 1: find the middle with slow and fast.');
  let turns = 0;
  while (P.fast !== null && m.nx[P.fast] !== null) {
    turns++;
    P.slow = m.nx[P.slow as number]; P.fast = m.nx[m.nx[P.fast] as number];
    s.say(`Turn ${turns}: slow → ${nm(m, P.slow)}, fast → ${nm(m, P.fast)}.`);
  }
  s.heads = [['list from head', 0], ['reversed back half (from prev)', 'prev'], ['still to flip (from cur)', 'cur', true], ['the saved rope (from next)', 'next', true]];
  P.prev = null; P.cur = P.slow; P.next = null; delete P.fast;
  s.say(`slow is on ${nm(m, P.slow)}. Step 2: reverse everything from slow on, with the four lines. The node before the middle still points at the middle.`, undefined, {});
  s.dance(() => P.cur === null, false);
  const back = P.prev;
  P.l = 0; P.r = back; delete P.slow; delete P.prev; delete P.cur; delete P.next;
  s.heads = [['list from head (front half)', 0], ['reversed back half (from r)', 'r']];
  s.say(`Step 3: compare. l walks the front half and r walks the reversed back half; stop when r runs out.`, undefined, {});
  let same = true;
  while (P.r !== null) {
    const x = m.v[P.l as number], y = m.v[P.r];
    if (x !== y) { same = false; s.say(`${x} ≠ ${y}: not a palindrome. Stop comparing, but still restore the list before returning.`, undefined, { [P.l as number]: 'swapped', [P.r]: 'swapped' }); break; }
    s.say(`${x} = ${y}. Both match, so move l and r one node.`, undefined, { [P.l as number]: 'found', [P.r]: 'found' });
    P.l = m.nx[P.l as number]; P.r = m.nx[P.r];
  }
  let prev: Ref = null, cur: Ref = back;
  while (cur !== null) { const nx = m.nx[cur]; m.nx[cur] = prev; prev = cur; cur = nx; }
  delete P.l; delete P.r;
  s.heads = [['list after restoring', 0]];
  return s.finish(`Step 4: reverse the back half again so the caller gets the list as they gave it: ${listText(m, 0)}. Return ${same}.`, String(same), {});
}

export function intersectionFrames(a: number[], b: number[], shared: number[]): Frame[] {
  const m: Mem = { v: [...a, ...b, ...shared], nx: [] };
  const la = a.length, lb = b.length, lc = shared.length, tot = la + lb + lc;
  const sharedHead: Ref = lc ? la + lb : null;
  for (let i = 0; i < tot; i++) m.nx.push(i + 1 < tot ? i + 1 : null);
  if (la) m.nx[la - 1] = sharedHead;
  if (lb) m.nx[la + lb - 1] = sharedHead;
  const headA: Ref = la ? 0 : sharedHead, headB: Ref = lb ? la : sharedHead;
  const P: Record<string, Ref> = { a: headA, b: headB };
  const tones: Record<number, CellTone> = Object.fromEntries(shared.map((_, i) => [la + lb + i, 'compared' as CellTone]));
  const s = new Sim(m, P, [['chain A', headA as number], ['chain B', headB as number]], true);
  s.say(`Each walker, when it runs off its own chain, restarts on the OTHER chain's head. Both then walk a + c + b nodes, so they reach the join on the same turn (or both reach null together).`, undefined, tones);
  let steps = 0;
  while (P.a !== P.b) {
    steps++;
    const ra = P.a === null, rb = P.b === null;
    P.a = ra ? headB : m.nx[P.a as number]; P.b = rb ? headA : m.nx[P.b as number];
    s.say(`Step ${steps}: a ${ra ? "was on null, so it restarts on chain B's head" : `→ ${nm(m, P.a)}`}; b ${rb ? "was on null, so it restarts on chain A's head" : `→ ${nm(m, P.b)}`}.${P.a === P.b ? ' Same node: stop.' : ''}`,
      steps === 1 ? q('The loop runs while a != b. Compare what?', ['The nodes themselves', 'Their values'], 0, 'Two different nodes can hold equal values. Only node identity proves they are the same node.') : undefined, tones);
  }
  return s.finish(P.a === null ? 'Both walkers reached null together: the chains share no node. Return null.' : `Both stand on ${nm(m, P.a)}, the first shared node. Return it.`, nm(m, P.a), tones);
}

export function addTwoFrames(d1: number[], d2: number[]): Frame[] {
  const r = recorder();
  const out: number[] = [];
  let carry = 0, i = 0, prevVars: Record<string, Val> | undefined;
  const strip = (d: number[], label: string, at: number): ArrayView => ({ kind: 'array', name: label, values: [...d, 'null'], join: '→', indices: false, pointers: [{ at: Math.min(at, d.length), label, tone: 'gold' }], tones: { [d.length]: 'out' } });
  const say = (caption: string, sum: Val, predict?: Predict) => {
    const vars = { carry, sum, digits: out.join(',') || 'none' };
    r.frame(caption, [strip(d1, 'l1', i), strip(d2, 'l2', i), { kind: 'array', name: 'result so far', values: out.length ? [...out, 'null'] : ['null'], join: '→', indices: false, tones: { [out.length]: 'out' } }, tvars(vars, prevVars)], predict);
    prevVars = vars;
  };
  say('Least significant digit first is the order you add by hand. A dummy and a tail build the answer; the carry survives between columns.', '-');
  while (i < d1.length || i < d2.length || carry !== 0) {
    const x = i < d1.length ? d1[i] : 0, y = i < d2.length ? d2[i] : 0, sum = x + y + carry;
    const wasCarry = carry;
    out.push(sum % 10); carry = Math.floor(sum / 10); i++;
    const bothDone = i > d1.length && i > d2.length;
    say(`Column ${i}: ${x} + ${y} + carry ${wasCarry} = ${sum}. Append ${sum % 10}, carry ${carry}.${bothDone ? ' Both lists are used up and the carry is 1: it still needs its own node.' : ''}`, sum,
      bothDone ? q('Both lists are used up but the carry is 1. Does the loop stop?', ['Yes, no digits are left', 'No, the carry needs its own node'], 1, 'The loop runs while l1, l2 or the carry remains.') : undefined);
  }
  r.frame(`No digits and no carry remain. The result reads ${out.join(' → ')} (least significant first).`, [strip(d1, 'l1', i), strip(d2, 'l2', i), { kind: 'array', name: 'result', values: [...out, 'null'], join: '→', indices: false, tones: { [out.length]: 'out' } }, tvars({ answer: out.join(',') })]);
  return r.frames;
}

export function rotateFrames(vals: number[], k: number): Frame[] {
  const m = mem(vals);
  const P: Record<string, Ref> = { head: vals.length ? 0 : null };
  const s = new Sim(m, P, [['list from head', 0]], true);
  if (vals.length < 2) return s.finish('Zero or one node: nothing to rotate.', vals.join(' → ') || 'empty');
  const n = vals.length, last = n - 1;
  P.last = last;
  s.say(`Walk to the last node and count: length n = ${n}, last = ${nm(m, last)}.`);
  const kk = k % n;
  s.say(`k = ${k}. Rotating by n changes nothing, so k %= n gives ${kk}. Never walk k steps: k can be huge.`,
    qp(`k = ${k}, n = ${n}. How many places do we really rotate?`, String(kk), [String(k), String((kk + 1) % n), String(n - kk)], 'Rotating by a whole lap is the identity, so only k mod n matters.', 1));
  if (kk === 0) return s.finish(`k % n is 0: return the head untouched.`, listText(m, 0));
  P.newTail = n - kk - 1;
  s.say(`The last ${kk} nodes move to the front, so the new tail is node number n − k = ${n - kk}: ${nm(m, P.newTail)}. The new head is newTail.next = ${nm(m, n - kk)}.`, undefined, { [n - kk - 1]: 'active' });
  P.newHead = m.nx[P.newTail];
  m.nx[P.newTail] = null;
  s.say(`Cut: newTail.next = null. The list is now two pieces: ${listText(m, 0)} and ${listText(m, P.newHead)}.`, undefined, { [P.newTail]: 'active' });
  m.nx[last] = 0;
  s.heads = [['list from newHead', 'newHead']];
  s.say(`Join: last.next = head. ${nm(m, last)} now leads to ${nm(m, 0)}.`);
  return s.finish(`Return newHead. The list reads ${listText(m, P.newHead)}.`, listText(m, P.newHead));
}

export function sortListFrames(vals: number[]): Frame[] {
  const r = recorder();
  type N = { id: string; parent?: string; label: string; tone: 'exploring' | 'solution' };
  const nodes: N[] = [];
  const fmt = (a: number[]) => `[${a.join(',')}]`;
  const rec = (cap: string, predict?: Predict, focus?: { vals: number[]; slow: number }) => {
    const views: View[] = [];
    if (focus) views.push({ kind: 'array', name: 'current sublist', values: focus.vals, indices: false, pointers: [{ at: focus.slow, label: 'slow', tone: 'gold' }], regions: [{ from: 0, to: focus.slow, label: 'left', tone: 'green' }, { from: focus.slow + 1, to: focus.vals.length - 1, label: 'right', tone: 'blue' }] });
    r.frame(cap, [...views, { kind: 'recursion', name: 'sortList calls', nodes: nodes.map(n => ({ ...n })) }, tvars({ calls: nodes.length })], predict);
  };
  const sort = (a: number[], id: string, parent?: string): number[] => {
    const node: N = { id, parent, label: fmt(a), tone: 'exploring' };
    nodes.push(node);
    if (a.length <= 1) { node.tone = 'solution'; rec(`sortList(${fmt(a)}): zero or one node is already sorted. Return it as it is.`); return a; }
    let slow = 0, fast = 1;
    while (fast < a.length && fast + 1 < a.length) { slow++; fast += 2; }
    const left = a.slice(0, slow + 1), right = a.slice(slow + 1);
    rec(`sortList(${fmt(a)}): slow starts on the head and fast on head.next (first middle), so two nodes split 1 + 1. slow stops at index ${slow}: cut the rope after it. Left ${fmt(left)}, right ${fmt(right)}.`,
      a.length === vals.length ? qp(`Split ${fmt(a)} with fast = head.next. How long is the left half?`, String(left.length), [String(right.length), String(a.length), '1'], 'slow ends on the first of the two middle nodes, so the left half is ceil(n / 2).', 0) : undefined, { vals: a, slow });
    const l = sort(left, id + 'L', id), rr = sort(right, id + 'R', id);
    const merged: number[] = []; let i = 0, j = 0;
    while (i < l.length && j < rr.length) merged.push(l[i] <= rr[j] ? l[i++] : rr[j++]);
    merged.push(...l.slice(i), ...rr.slice(j));
    node.label = fmt(merged); node.tone = 'solution';
    rec(`Both halves are sorted: ${fmt(l)} and ${fmt(rr)}. Merge them with the dummy-and-tail merge: ${fmt(merged)}.`);
    return merged;
  };
  const out = vals.length ? sort(vals, 'r') : [];
  r.frame(`The sorted list is ${out.join(' → ') || 'empty'}.`, [{ kind: 'recursion', name: 'sortList calls', nodes: nodes.map(n => ({ ...n })) }, tvars({ answer: out.join(',') })]);
  return r.frames;
}
