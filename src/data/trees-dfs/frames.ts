// Dry-run frames for every problem in src/dsa-lessons/trees-dfs.mdx. Trees use LeetCode's array form (null = no child).
// Recursive problems share one engine (`walk`): each call is drawn on the tree, on a call stack, with the values passed
// DOWN as parameters and the value each finished call returned UP to its parent. The last frame of every generator
// carries a text variable `answer`, checked against brute-force oracles in tests/trees-dfs-frames.test.ts.
import { recorder, tvars, type Frame, type NodeTone, type Predict, type TreeNode, type Val, type View } from '../../lib/dryrun.ts';

export type Tree = (number | null)[];
interface N { id: number; v: number; l: number; r: number }
const NONE = -1;
const J = JSON.stringify;
const inf = (x: number): Val => (x === -Infinity ? '-inf' : x === Infinity ? '+inf' : x);

function parse(a: Tree): N[] {
  const nodes: N[] = [];
  if (!a.length || a[0] === null) return nodes;
  nodes[0] = { id: 0, v: a[0], l: NONE, r: NONE };
  const waiting = [0];
  let k = 1;
  while (waiting.length && k < a.length) {
    const p = waiting.shift()!;
    for (const side of ['l', 'r'] as const) {
      if (k >= a.length) break;
      const id = k++;
      if (a[id] === null) continue;
      nodes[id] = { id, v: a[id] as number, l: NONE, r: NONE };
      nodes[p][side] = id;
      waiting.push(id);
    }
  }
  return nodes;
}

function toLevel(nodes: N[], root: number): Tree {
  if (root === NONE) return [];
  const out: Tree = [];
  const waiting = [root];
  for (let i = 0; i < waiting.length; i++) {
    const id = waiting[i];
    if (id === NONE) { out.push(null); continue; }
    out.push(nodes[id].v);
    waiting.push(nodes[id].l, nodes[id].r);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

const nest = (nodes: N[], id: number): TreeNode | null =>
  id === NONE || !nodes[id] ? null : { id: String(id), v: nodes[id].v, l: nest(nodes, nodes[id].l), r: nest(nodes, nodes[id].r) };

function treeV(nodes: N[], root: number, stack: number[], cur: number | null, done: Iterable<number> = [], name = 'tree'): View {
  const tones: Record<string, NodeTone> = {};
  for (const i of done) tones[String(i)] = 'done';
  for (const i of stack) tones[String(i)] = 'visited';
  if (cur !== null && cur !== NONE) tones[String(cur)] = 'current';
  return { kind: 'tree', name, root: nest(nodes, root), tones };
}
const stk = (name: string, items: Val[], changed?: number[], removed?: Val[]): View =>
  ({ kind: 'stack', name, items, ...(changed ? { changed } : {}), ...(removed ? { removed } : {}), note: 'empty' });
const que = (name: string, items: Val[], changed?: number[]): View => ({ kind: 'queue', name, items, ...(changed ? { changed } : {}), note: 'nothing yet' });
const pick = (question: string, right: string, wrongs: string[], slot: number, explain: string): Predict => {
  const all = [right, ...wrongs];
  const shift = slot % all.length;
  const options = all.map((_, k) => all[(k + all.length - shift) % all.length]);
  return { question, options, answer: options.indexOf(right), explain };
};
const numPick = (question: string, right: number, candidates: number[], slot: number, explain: string): Predict => {
  const wrongs: string[] = [];
  for (const c of [...candidates, right + 1, right - 1, right + 2]) if (c !== right && (right < 0 || c >= 0) && !wrongs.includes(String(c)) && wrongs.length < 2) wrongs.push(String(c));
  return pick(question, String(right), wrongs, slot, explain);
};
const sideTxt = (name: string, shown: Val, empty: boolean, base: Val) => (empty ? `${name} is empty (base case ${base})` : `${name} returned ${shown}`);

// ---------- the shared recursion engine ----------
interface Info<R> { l: R; r: R; lNull: boolean; rNull: boolean; skipped: boolean }
interface Spec<P, R> {
  fn: string;
  p0: P;
  base: R;
  show: (r: R) => string;
  label?: (n: N, p: P) => string;
  down?: (n: N, p: P, side: 'l' | 'r') => P;
  fmtP?: (p: P) => Record<string, Val>;
  state?: () => Record<string, Val>;
  enter: (n: N, p: P) => string;
  stop?: (n: N, p: P) => { ret: R; why: string } | undefined;
  askEnter?: (n: N, p: P, slot: number) => Predict | undefined;
  between?: (n: N, p: P) => string | { text: string; q?: Predict } | undefined;
  skipRight?: (n: N, p: P, first: R) => string | undefined;
  up: (n: N, p: P, i: Info<R>) => { ret: R; why: string };
  ask?: (n: N, p: P, i: Info<R>, ret: R, slot: number) => Predict | undefined;
  reverse?: boolean;
  returns?: boolean;
  shape?: N[];
  extra?: (phase: 'enter' | 'return' | 'other') => View[];
  final: (root: R) => string;
  finalWhy: (root: R, answer: string) => string;
}

function walk<P, R>(nodes: N[], spec: Spec<P, R>): Frame[] {
  const r = recorder();
  const draw = spec.shape ?? nodes;
  const stack: { id: number; p: P }[] = [];
  const finished: number[] = [];
  const returned: [string, string][] = [];
  let prevDown: Record<string, Val> | undefined, prevShared: Record<string, Val> | undefined, slot = 0, enterSlot = 0, returnedNow = false;
  const label = (n: N, p: P) => (spec.label ? spec.label(n, p) : `${spec.fn}(${n.v})`);
  const views = (cur: number | null, p: P | null, phase: 'enter' | 'return' | 'other', answer = '?'): View[] => {
    const out: View[] = [treeV(draw, nodes.length ? 0 : NONE, stack.map(s => s.id).filter(i => i !== cur), cur, finished.filter(i => i !== cur)),
      stk('call stack (top is last)', stack.map(s => label(nodes[s.id], s.p)))];
    const down = p !== null && spec.fmtP ? spec.fmtP(p) : null;
    if (down && Object.keys(down).length) { out.push(tvars(down, prevDown, 'passed DOWN (parameters of the top call)')); prevDown = down; }
    if (spec.returns !== false) out.push({ kind: 'map', name: 'returned UP (what each finished call gave its parent)', entries: returned.map(e => [e[0], e[1]]), ...(returnedNow ? { changed: [returned.length - 1] } : {}), note: 'no call has returned yet' });
    if (spec.extra) out.push(...spec.extra(phase));
    const shared = { ...(spec.state ? spec.state() : {}), answer };
    out.push(tvars(shared, prevShared, spec.state ? 'shared fields and the answer' : 'answer'));
    prevShared = shared;
    return out;
  };

  function call(id: number, p: P): R {
    const n = nodes[id];
    stack.push({ id, p });
    returnedNow = false;
    const enterText = spec.enter(n, p);
    r.frame(enterText, views(id, p, 'enter'), spec.askEnter?.(n, p, enterSlot++));
    let ret: R, why: string;
    const info: Info<R> = { l: spec.base, r: spec.base, lNull: n.l === NONE, rNull: n.r === NONE, skipped: false };
    const stop = spec.stop?.(n, p);
    if (stop) { ret = stop.ret; why = stop.why; }
    else {
      const sides = spec.reverse ? (['r', 'l'] as const) : (['l', 'r'] as const);
      const first = sides[0], second = sides[1];
      if (n[first] !== NONE) info[first] = call(n[first], spec.down!(n, p, first));
      const mid = spec.between?.(n, p);
      if (mid) { returnedNow = false; r.frame(typeof mid === 'string' ? mid : mid.text, views(id, p, 'other'), typeof mid === 'string' ? undefined : mid.q); }
      if (spec.skipRight?.(n, p, info[first])) info.skipped = true;
      else if (n[second] !== NONE) info[second] = call(n[second], spec.down!(n, p, second));
      ({ ret, why } = spec.up(n, p, info));
    }
    const parent = stack.length > 1 ? label(nodes[stack[stack.length - 2].id], stack[stack.length - 2].p) : 'the caller';
    returned.push([`node ${n.v}`, spec.show(ret)]);
    returnedNow = spec.returns !== false;
    const q = spec.ask?.(n, p, info, ret, slot++);
    r.frame(spec.returns === false ? why : `${why} Return ${spec.show(ret)} to ${parent}.`, views(id, p, 'return'), q);
    stack.pop();
    finished.push(id);
    returnedNow = false;
    return ret;
  }

  if (!nodes.length) {
    const answer = spec.final(spec.base);
    r.frame(`The tree is empty, so the very first call hits the base case and returns ${spec.show(spec.base)}.`, [...views(null, null, 'other', answer)]);
    return r.frames;
  }
  const rootRet = call(0, spec.p0);
  const answer = spec.final(rootRet);
  r.frame(spec.finalWhy(rootRet, answer), views(null, null, 'other', answer));
  return r.frames;
}

// ---------- the three orders: when do I do my work? ----------
export function ordersFrames(a: Tree, order: 'pre' | 'in' | 'post'): Frame[] {
  const nodes = parse(a);
  const out: number[] = [];
  let asked = 0;
  const when = { pre: 'on the way down, before either subtree', in: 'between the two subtrees', post: 'on the way back up, after both subtrees' }[order];
  return walk<number, number>(nodes, {
    fn: 'visit', p0: 0, base: 0, show: () => 'nothing', returns: false,
    down: () => 0,
    extra: () => [que('output (in the order written)', [...out], out.length ? [out.length - 1] : undefined)],
    enter: n => {
      if (order === 'pre') { out.push(n.v); return `Call visit(${n.v}). Preorder does its work ${when}: write ${n.v} now. Then go left, then right.`; }
      return `Call visit(${n.v}). ${order === 'in' ? 'Inorder' : 'Postorder'} writes nothing yet: ${order === 'in' ? 'go left first' : 'go left, then right, and only then write'}.`;
    },
    askEnter: (n, _, slot) => (order === 'pre' && n.l !== NONE && asked++ < 1
      ? pick(`Call visit(${n.v}): nothing below it has been visited yet. What does preorder do at this moment?`, `Write ${n.v} now`, [`Wait: write ${n.v} after both subtrees`, `Go left, and write ${n.v} after the left subtree`], slot, 'Preorder puts the work on the way down, before either subtree.') : undefined),
    between: order === 'in' ? n => {
      out.push(n.v);
      const q = n.l !== NONE && asked++ < 1 ? pick(`The left subtree of ${n.v} just finished. What does inorder do now?`, `Write ${n.v}, then go right`, [`Go right without writing ${n.v}`, `Return to the parent`], 0, 'Inorder puts the work between the two subtrees.') : undefined;
      return { text: `The left subtree of ${n.v} is finished. Inorder does its work ${when}: write ${n.v} now, then go right.`, q };
    } : undefined,
    ask: (n, _, i, __, slot) => (order === 'post' && !i.lNull && asked++ < 1
      ? pick(`Both subtrees of ${n.v} just finished. What does postorder do now?`, `Write ${n.v}`, [`Nothing: ${n.v} was already written`, `Go left again`], slot, 'Postorder puts the work on the way back up, after both subtrees.') : undefined),
    up: n => {
      if (order === 'post') { out.push(n.v); return { ret: 0, why: `Both subtrees of ${n.v} are finished. Postorder does its work ${when}: write ${n.v} now.` }; }
      return { ret: 0, why: `Both subtrees of ${n.v} are finished and ${n.v} was already written, so there is nothing left to do here.` };
    },
    final: () => J(out),
    finalWhy: (_, answer) => `The root's call is over. The ${order}order list is ${answer}: the same walk, with the write line in a different place.`,
  });
}

// ---------- Invert Binary Tree ----------
export function invertFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  const show = (id: number) => (id === NONE ? 'null' : `node ${nodes[id].v}, its subtree mirrored`);
  return walk<number, number>(nodes, {
    fn: 'invert', p0: 0, base: NONE, show, down: () => 0,
    enter: n => `Call invertTree(${n.v}). Trust the calls: ask the left subtree to mirror itself, then the right one.`,
    up: (n, _, i) => {
      const oldL = n.l, oldR = n.r;
      n.l = oldR; n.r = oldL;
      const none = (id: number) => (id === NONE ? 'empty' : String(nodes[id].v));
      return { ret: n.id, why: i.lNull && i.rNull ? `${n.v} is a leaf: both children are empty, swapping changes nothing.` : `Both children came back mirrored. Save them, then swap: the old left (${none(oldL)}) hangs on the right and the old right (${none(oldR)}) on the left.` };
    },
    ask: (n, _, i, __, slot) => (!i.lNull && !i.rNull ? pick(`Both children of ${n.v} have returned their mirrored subtrees. What does ${n.v} do?`, 'Swap its two children and return itself', ['Return only its left child', 'Call invertTree on both children again'], slot, 'The children already did their own work. A mirror is "swap at every node", so this node only swaps the two results.') : undefined),
    final: () => J(toLevel(nodes, nodes.length ? 0 : NONE)),
    finalWhy: (_, answer) => `The root's call is over. Every node swapped its two children exactly once: ${answer}.`,
  });
}

// ---------- Same Tree and Symmetric Tree: two nodes in lockstep ----------
export function pairFrames(a: Tree, b: Tree, mode: 'same' | 'mirror'): Frame[] {
  const A = parse(a), B = mode === 'same' ? parse(b) : A;
  const r = recorder();
  const fn = mode === 'same' ? 'same' : 'mirror';
  const stack: { x: number; y: number }[] = [];
  const doneA = new Set<number>(), doneB = new Set<number>();
  let slot = 0;
  const val = (T: N[], i: number) => (i === NONE ? 'null' : String(T[i].v));
  const lab = (s: { x: number; y: number }) => `${fn}(${val(A, s.x)}, ${val(B, s.y)})`;
  const views = (answer: string): View[] => {
    const top = stack[stack.length - 1], above = stack.slice(0, -1);
    const ids = (side: 'x' | 'y') => above.map(c => c[side]).filter(i => i !== NONE);
    let trees: View[];
    if (mode === 'same') trees = [treeV(A, 0, ids('x'), top?.x ?? null, doneA, 'p'), treeV(B, 0, ids('y'), top?.y ?? null, doneB, 'q')];
    else {
      const t = treeV(A, 0, [...ids('x'), ...ids('y')], top?.x ?? null, doneA, 'tree (current = left side of the pair, queued = right side)') as Extract<View, { kind: 'tree' }>;
      if (top && top.y !== NONE) t.tones![String(top.y)] = 'queued';
      trees = [t];
    }
    return [...trees, stk('call stack (top is last)', stack.map(lab)), tvars({ answer })];
  };
  const children = (x: number, y: number): [[number, number], [number, number]] => mode === 'same'
    ? [[A[x].l, B[y].l], [A[x].r, B[y].r]]
    : [[A[x].l, B[y].r], [A[x].r, B[y].l]];
  const sidesName = mode === 'same' ? ['left pair', 'right pair'] : ['outside pair (left.left with right.right)', 'inside pair (left.right with right.left)'];

  function call(x: number, y: number): boolean {
    stack.push({ x, y });
    let ok: boolean, text: string, q: Predict | undefined;
    if (x === NONE && y === NONE) {
      ok = true; text = `Both are empty: a match, return true. Base cases come before any value is read.`;
      q = slot++ === 0 ? pick(`Both nodes are empty. What does ${lab({ x, y })} return?`, 'true', ['false', 'It crashes reading .val'], slot, 'Two empty spots are identical. This base case comes first so no value is ever read from an empty node.') : undefined;
    }
    else if (x === NONE || y === NONE) {
      ok = false; text = `${x === NONE ? 'The first' : 'The second'} side is empty and the other is not: the shapes differ, return false. Reading .val here would crash.`;
      q = pick(`One side is ${val(A, x)} and the other is ${val(B, y)}. What does ${lab({ x, y })} return?`, 'false', ['true', 'It compares the values anyway'], slot++, 'Exactly one empty side means the shapes differ.');
    } else if (A[x].v !== B[y].v) {
      ok = false; text = `${A[x].v} != ${B[y].v}: return false at once.`;
      q = pick(`The values are ${A[x].v} and ${B[y].v}. What does ${lab({ x, y })} return?`, 'false', ['true', 'It compares the children first'], slot++, 'Different values at the same position means the trees differ, so there is no reason to look further down.');
    } else {
      r.frame(`Call ${lab({ x, y })}: ${A[x].v} == ${B[y].v}, so this pair matches. Now ask the ${sidesName[0]}, then the ${sidesName[1]}.`, views('?'));
      const [c1, c2] = children(x, y);
      const first = call(c1[0], c1[1]);
      if (!first) { ok = false; text = `The ${sidesName[0]} returned false, so && stops: the ${sidesName[1]} is never visited.`; }
      else { const second = call(c2[0], c2[1]); ok = second; text = second ? `Both pairs returned true and the values match: every position below agrees.` : `The ${sidesName[0]} matched but the ${sidesName[1]} returned false, so this pair is false.`; }
    }
    const parent = stack.length > 1 ? lab(stack[stack.length - 2]) : 'the caller';
    r.frame(`${text} Return ${ok} to ${parent}.`, views('?'), q);
    if (ok) { if (x !== NONE) doneA.add(x); if (y !== NONE) doneB.add(y); }
    stack.pop();
    return ok;
  }
  r.frame(mode === 'same' ? 'Two trees, one walk. Each call looks at a pair: the node in p and the node in q at the same position.' : 'One tree, two walkers. The pair is the root\'s left child and right child; their children are paired outside-with-outside and inside-with-inside.', views('?'));
  const ok = mode === 'same' ? call(A.length ? 0 : NONE, B.length ? 0 : NONE) : A.length ? call(A[0].l, A[0].r) : true;
  r.frame(`The first call returned ${ok}. That is the answer.`, views(String(ok)));
  return r.frames;
}

// ---------- Maximum Depth: bottom-up (Messenger) and top-down (Climber) ----------
export function maxDepthFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  return walk<number, number>(nodes, {
    fn: 'maxDepth', p0: 0, base: 0, show: String, down: () => 0,
    enter: n => `Call maxDepth(${n.v}). Nothing to do on the way down: ask the left subtree how deep it is, then the right.`,
    up: (n, _, i) => { const ret = 1 + Math.max(i.l, i.r); return { ret, why: `${sideTxt('Left', i.l, i.lNull, 0)}, ${sideTxt('right', i.r, i.rNull, 0)}. This node adds itself to the deeper side: 1 + max(${i.l}, ${i.r}) = ${ret}.` }; },
    ask: (n, _, i, ret, slot) => (!i.lNull || !i.rNull ? numPick(`Left returned ${i.l}, right returned ${i.r}. What does maxDepth(${n.v}) return?`, ret, [Math.max(i.l, i.r)], slot, `1 + max(${i.l}, ${i.r}) = ${ret}: one for this node plus the deeper side.`) : undefined),
    final: String,
    finalWhy: (_, answer) => `The root's call returned ${answer}. In bottom-up code the answer IS the root's return value.`,
  });
}

export function maxDepthDownFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  let best = 0, before = 0;
  return walk<number, number>(nodes, {
    fn: 'visit', p0: 1, base: 0, show: () => 'nothing', returns: false,
    down: (_, p) => p + 1,
    fmtP: p => ({ depth: p }),
    state: () => ({ best }),
    askEnter: (n, p, slot) => (slot < 3 ? numPick(`visit(${n.v}, depth=${p}) starts with best = ${before}. What is best after the work on the way down?`, best, [before, p + 1], slot, `best = max(${before}, ${p}) = ${best}: the work happens on entry, before the children are called.`) : undefined),
    enter: (n, p) => { before = best; best = Math.max(best, p); return `Call visit(${n.v}, depth=${p}). Work happens on the way down: best = max(${before}, ${p}) = ${best}. Both children get depth + 1 = ${p + 1}.`; },
    up: n => ({ ret: 0, why: `Both children of ${n.v} are done. Nothing to combine: the answer lives in the field best, not in any return value.` }),
    final: () => String(best),
    finalWhy: (_, answer) => `The root's call is over. It returned nothing; the answer is the field: best = ${answer}.`,
  });
}

// ---------- Balanced Binary Tree: return the height, or -1 for "broken" ----------
export function balancedFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  return walk<number, number>(nodes, {
    fn: 'height', p0: 0, base: 0, show: x => (x === -1 ? '-1 (unbalanced)' : String(x)), down: () => 0,
    enter: n => `Call height(${n.v}). Ask the left subtree for its height. If it reports -1, the verdict is already in.`,
    skipRight: (_, __, first) => (first === -1 ? 'left broke' : undefined),
    up: (n, _, i) => {
      if (i.skipped) return { ret: -1, why: `Left returned -1: something below it is unbalanced, so skip the right side and pass -1 straight up.` };
      if (i.r === -1) return { ret: -1, why: `Right returned -1, so pass -1 up.` };
      if (Math.abs(i.l - i.r) > 1) return { ret: -1, why: `${sideTxt('Left', i.l, i.lNull, 0)}, ${sideTxt('right', i.r, i.rNull, 0)}. |${i.l} - ${i.r}| = ${Math.abs(i.l - i.r)} is more than 1: this node is the one that leans, so return -1.` };
      const ret = 1 + Math.max(i.l, i.r);
      return { ret, why: `${sideTxt('Left', i.l, i.lNull, 0)}, ${sideTxt('right', i.r, i.rNull, 0)}. |${i.l} - ${i.r}| <= 1, so this node is fine: return its height 1 + max(${i.l}, ${i.r}) = ${ret}.` };
    },
    ask: (n, _, i, ret, slot) => {
      if (i.skipped || i.l === -1 || i.r === -1 || i.lNull && i.rNull) return undefined;
      return ret === -1
        ? pick(`${n.v} hears ${i.l} from the left and ${i.r} from the right. What does it return?`, '-1: the heights differ by more than 1', [String(1 + Math.max(i.l, i.r)), String(Math.abs(i.l - i.r))], slot, `|${i.l} - ${i.r}| > 1 means this fork leans, even if the root's two sides look even.`)
        : numPick(`${n.v} hears ${i.l} from the left and ${i.r} from the right. What does it return?`, ret, [-1], slot, `The gap is within 1, so it reports its height: 1 + max(${i.l}, ${i.r}) = ${ret}.`);
    },
    final: root => String(root !== -1),
    finalWhy: (root, answer) => `The root returned ${root}. Only -1 means unbalanced, so the answer is ${answer}.`,
  });
}

// ---------- Diameter and Maximum Path Sum: return one thing, record another ----------
export function diameterFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  let best = 0, asked = 0;
  return walk<number, number>(nodes, {
    fn: 'height', p0: 0, base: 0, show: x => `height ${x}`, down: () => 0,
    state: () => ({ best }),
    enter: n => `Call height(${n.v}). Get both subtree heights first, then decide what to return and what to record.`,
    up: (n, _, i) => {
      const bend = i.l + i.r, ret = 1 + Math.max(i.l, i.r), old = best;
      best = Math.max(best, bend);
      return { ret, why: `${sideTxt('Left', i.l, i.lNull, 0)}, ${sideTxt('right', i.r, i.rNull, 0)}. The path that bends here has ${i.l} + ${i.r} = ${bend} edges: best ${best > old ? `${old} -> ${best}` : `stays ${best}`}. The parent can extend only one arm, so the return value is 1 + max(${i.l}, ${i.r}) = ${ret}.` };
    },
    ask: (n, _, i, ret, slot) => (i.l + i.r === best && best > 0 && ret !== best && asked++ < 2
      ? pick(`${n.v} got ${i.l} from the left and ${i.r} from the right. What goes to the shared board (best)?`, `${best}: left + right, the bend through this node`, [`${ret}: 1 + max(left, right), its height`, `0: only the root writes to the board`], slot, `Both arms count for a path that bends here: ${i.l} + ${i.r} = ${best}. The parent gets ${ret} instead, because it can use only one arm.`) : undefined),
    final: () => String(best),
    finalWhy: (root, answer) => `The root returned ${root}: that is a height, not the answer. The answer is what the board holds: best = ${answer}.`,
  });
}

export function maxPathFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  let best = -Infinity, asked = 0;
  return walk<number, number>(nodes, {
    fn: 'gain', p0: 0, base: 0, show: x => `gain ${x}`, down: () => 0,
    state: () => ({ best: best === -Infinity ? 'none yet' : best }),
    enter: n => `Call gain(${n.v}). Get both child gains first. A child gain below 0 will be dropped: the path may stop here instead.`,
    up: (n, _, i) => {
      const left = Math.max(0, i.l), right = Math.max(0, i.r), bend = n.v + left + right, ret = n.v + Math.max(left, right), old = best;
      best = Math.max(best, bend);
      return { ret, why: `Arms after clamping at 0: left ${left}, right ${right}${i.l < 0 || i.r < 0 ? ' (a negative arm is dropped)' : ''}. The path that bends at ${n.v} sums to ${n.v} + ${left} + ${right} = ${bend}: best ${best > old ? `-> ${best}` : `stays ${best}`}. Only one arm can continue up: ${n.v} + max(${left}, ${right}) = ${ret}.` };
    },
    ask: (n, _, i, ret, slot) => {
      const bend = n.v + Math.max(0, i.l) + Math.max(0, i.r);
      return !i.lNull && !i.rNull && asked++ < 1
        ? numPick(`${n.v} hears gains ${i.l} and ${i.r}. What is the sum of the path that bends here?`, bend, [ret, n.v + i.l + i.r], slot, `Clamp each arm at 0, then add the node: ${n.v} + ${Math.max(0, i.l)} + ${Math.max(0, i.r)} = ${bend}. The return value ${ret} uses only one arm.`)
        : undefined;
    },
    final: () => String(best),
    finalWhy: (root, answer) => `The root returned ${root}, a one-sided gain. The answer is on the board: best = ${answer}.`,
  });
}

// ---------- Lowest Common Ancestor ----------
export function lcaFrames(a: Tree, p: number, q: number): Frame[] {
  const nodes = parse(a);
  const show = (x: number) => (x === NONE ? 'null' : `${x}`);
  return walk<number, number>(nodes, {
    fn: 'lca', p0: 0, base: NONE, show, down: () => 0,
    fmtP: () => ({ p, q }),
    enter: n => `Call lca(${n.v}). ${n.v === p || n.v === q ? `${n.v} is one of the targets.` : `${n.v} is neither ${p} nor ${q}: ask both subtrees.`}`,
    stop: n => (n.v === p || n.v === q ? { ret: n.v, why: `Found ${n.v}: stop here, no need to look below. If the other target is below, this node is the answer anyway; if not, the ancestors will find it elsewhere.` } : undefined),
    up: (n, _, i) => {
      if (i.l !== NONE && i.r !== NONE) return { ret: n.v, why: `Left found ${i.l} and right found ${i.r}: the two targets are split across ${n.v}, so ${n.v} is the lowest node that sees both.` };
      const ret = i.l !== NONE ? i.l : i.r;
      return { ret, why: ret === NONE ? `Neither side found a target: return null.` : `Only one side found something (${ret}): pass it up unchanged.` };
    },
    ask: (n, _, i, ret, slot) => (i.l !== NONE && i.r !== NONE ? pick(`The left call returned ${i.l} and the right call returned ${i.r}. What does ${n.v} return?`, `${n.v}: both sides reported`, [`${i.l}`, `${i.r}`], slot, 'Both sides found one target each, so this is the lowest node above both.') : undefined),
    final: root => show(root),
    finalWhy: (root, answer) => `The root's call returned ${answer}: the answer is the root's return value, passed upward untouched from the meeting point.`,
  });
}

// ---------- Path Sum II: state flows down, backtracking undoes it ----------
export function pathSumFrames(a: Tree, target: number): Frame[] {
  const nodes = parse(a);
  const path: number[] = [], result: number[][] = [];
  let removed: number | null = null, added = false, recorded = false, asked = 0;
  return walk<number, number>(nodes, {
    fn: 'walk', p0: target, base: 0, show: () => 'nothing', returns: false,
    label: (n, p) => `walk(${n.v}, remaining=${p})`,
    down: (n, p) => p - n.v,
    fmtP: p => ({ remaining: p }),
    state: () => ({ 'paths found': result.length }),
    extra: phase => [
      stk('path (one shared list)', [...path], phase === 'enter' && added ? [path.length - 1] : undefined, phase === 'return' && removed !== null ? [removed] : undefined),
      que('result (copies of good paths)', result.map(x => `[${x.join(',')}]`), recorded && phase === 'enter' ? [result.length - 1] : undefined),
    ],
    askEnter: (n, p, slot) => (n.l === NONE && n.r === NONE && asked++ < 2
      ? pick(`Leaf ${n.v} is reached with remaining = ${p} before taking it. Is the path recorded?`, p - n.v === 0 ? 'Yes: nothing is left to find' : `No: ${p - n.v} is left over`, [p - n.v === 0 ? 'No: it is not a leaf' : 'Yes: it is a leaf'], slot, `At a leaf, the path is recorded only when remaining reaches exactly 0: ${p} - ${n.v} = ${p - n.v}.`) : undefined),
    enter: (n, p) => {
      path.push(n.v); added = true; recorded = false; removed = null;
      const rem = p - n.v;
      const leaf = n.l === NONE && n.r === NONE;
      let note = `Call walk(${n.v}, remaining=${p}). Step down: add ${n.v} to path, remaining becomes ${p} - ${n.v} = ${rem}.`;
      if (leaf) {
        if (rem === 0) { result.push([...path]); recorded = true; note += ` A leaf with nothing left: record a COPY of the path, [${path.join(', ')}].`; }
        else note += ` A leaf, but ${rem} is left over: not a match.`;
      }
      return note;
    },
    up: n => { removed = path.pop()!; added = false; return { ret: 0, why: `Both children of ${n.v} are done. Step back up: remove ${n.v} from path, so the sibling subtree sees only its own ancestors.` }; },
    final: () => J(result),
    finalWhy: (_, answer) => `The root's call is over and path is empty again. result = ${answer}.`,
  });
}

// ---------- Validate BST: a window of allowed values flows down ----------
export function validateFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  interface W { lo: number; hi: number }
  return walk<W, boolean>(nodes, {
    fn: 'valid', p0: { lo: -Infinity, hi: Infinity }, base: true, show: String,
    label: (n, p) => `valid(${n.v}, ${inf(p.lo)}, ${inf(p.hi)})`,
    down: (n, p, side) => (side === 'l' ? { lo: p.lo, hi: n.v } : { lo: n.v, hi: p.hi }),
    fmtP: p => ({ low: inf(p.lo), high: inf(p.hi) }),
    enter: (n, p) => {
      const ok = n.v > p.lo && n.v < p.hi;
      return `Call valid(${n.v}). Window (${inf(p.lo)}, ${inf(p.hi)}), strict at both ends: ${ok ? `${n.v} fits. Going left the ceiling drops to ${n.v}; going right the floor rises to ${n.v}.` : `${n.v} does not fit.`}`;
    },
    stop: (n, p) => (n.v <= p.lo || n.v >= p.hi ? { ret: false, why: `${n.v} ${n.v <= p.lo ? `<= low ${inf(p.lo)}` : `>= high ${inf(p.hi)}`}: an ancestor rules it out, even though its own parent looked fine.` } : undefined),
    skipRight: (_, __, first) => (first ? undefined : 'left false'),
    up: (n, _, i) => (i.skipped
      ? { ret: false, why: `Left returned false, so && stops: the right side is never checked.` }
      : { ret: i.r, why: i.r ? `${n.v} fits its window and both sides returned true.` : `Left was fine but right returned false, so ${n.v} returns false.` }),
    ask: (n, p, i, ret, slot) => (n.l === NONE && n.r === NONE && ret ? pick(`Leaf ${n.v} sits in the window (${inf(p.lo)}, ${inf(p.hi)}). What does valid return?`, 'true', ['false', 'It must also compare with its parent'], slot, 'Both children are empty (base case true) and the value fits the window, so the leaf is valid.') : undefined),
    final: root => String(root),
    finalWhy: (root, answer) => `The root's call returned ${answer}: every node must fit the window all its ancestors build, so one bad node anywhere makes the whole tree false.`,
  });
}

// ---------- Kth Smallest in a BST: the explicit stack (basket) replaces the call stack ----------
export function kthFrames(a: Tree, k: number): Frame[] {
  const nodes = parse(a);
  const r = recorder();
  const basket: number[] = [], seen: number[] = [];
  let cur = nodes.length ? 0 : NONE, count = k, slot = 0;
  const views = (answer: string, changed?: number[], removed?: Val[]): View[] => [
    treeV(nodes, 0, basket, cur, seen, 'tree (current = cur, visited = done, waiting = in the basket)'),
    stk('basket (top is last)', basket.map(i => nodes[i].v), changed, removed),
    tvars({ cur: cur === NONE ? 'empty spot' : nodes[cur].v, 'visits left': count, answer }),
  ];
  r.frame(`Inorder on a BST visits values in increasing order, so the k-th visit is the answer. Here k = ${k}. The basket holds forks whose left side is still being explored.`, views('?'));
  while (true) {
    if (cur !== NONE) {
      basket.push(cur);
      const v = nodes[cur].v;
      cur = nodes[cur].l;
      r.frame(`Push ${v} into the basket and step left: everything smaller than ${v} is down that way, and ${v} must wait until it is explored.`, views('?', [basket.length - 1]));
      continue;
    }
    const top = basket.pop()!;
    const v = nodes[top].v;
    seen.push(top);
    count--;
    const visit = k - count;
    const q = visit <= 2 ? pick(`cur ran off the bottom of the left chain. The basket's top is ${v}. What now?`, `Pop ${v} and visit it`, ['Push another node', 'Go back to the root'], slot++, `Nothing smaller than ${v} is left unvisited, so the top of the basket is the next value in sorted order.`) : undefined;
    if (count === 0) {
      r.frame(`Pop ${v}: that is visit #${visit} of ${k}, so ${v} is the k-th smallest. Return it. Nodes never reached were never touched.`, views(String(v), undefined, [v]), q);
      return r.frames;
    }
    cur = nodes[top].r;
    r.frame(`cur is an empty spot, so nothing smaller is unvisited. Pop ${v}: visit #${visit}. Then step right, because its right subtree comes next in sorted order.`, views('?', undefined, [v]), q);
  }
}

// ---------- Construct a tree from preorder and inorder ----------
export function buildFrames(pre: number[], ino: number[]): Frame[] {
  const r = recorder();
  const nodes: N[] = [];
  const where = new Map(ino.map((v, i) => [v, i]));
  const stack: { id: number; lo: number; hi: number }[] = [];
  const finished: number[] = [];
  let next = 0, slot = 0;
  const range = (lo: number, hi: number) => (lo > hi ? 'empty' : `inorder[${lo}..${hi}]`);
  const views = (cur: { lo: number; hi: number; mid?: number } | null, active: number | null, answer = '?'): View[] => [
    { kind: 'array', name: 'preorder (the next unused value is the next root)', values: pre, pointers: next < pre.length ? [{ at: next, label: 'next' }] : [], tones: Object.fromEntries(Array.from({ length: next }, (_, i) => [i, 'done' as const])) },
    { kind: 'array', name: 'inorder (the root splits left | right)', values: ino, ...(cur && cur.lo <= cur.hi ? { regions: [{ from: cur.lo, to: cur.hi, label: 'this call', tone: 'blue' as const }] } : {}), ...(cur?.mid !== undefined ? { pointers: [{ at: cur.mid, label: 'root' }] } : {}) },
    treeV(nodes, pre.length ? 0 : NONE, stack.map(s => s.id).filter(i => i !== active), active, finished.filter(i => i !== active), 'tree built so far'),
    stk('call stack (top is last)', stack.map(s => `build(${s.lo}, ${s.hi})`)),
    tvars({ next, answer }),
  ];
  function build(lo: number, hi: number, parent: number, side: 'l' | 'r'): number {
    if (lo > hi) return NONE;
    const id = next++;
    const v = pre[id];
    const mid = where.get(v)!;
    nodes[id] = { id, v, l: NONE, r: NONE };
    if (parent !== NONE) nodes[parent][side] = id;
    stack.push({ id, lo, hi });
    r.frame(`build(${lo}, ${hi}): the next preorder value is ${v}, so it is the root of this range. It sits at inorder[${mid}], which splits the range: left part ${range(lo, mid - 1)}, right part ${range(mid + 1, hi)}. (The node is drawn now; its parent attaches it when this call returns.)`, views({ lo, hi, mid }, id),
      slot++ % 2 === 0 ? numPick(`The next preorder value is ${v}. How many nodes go in its left subtree?`, mid - lo, [hi - mid], slot, `${v} is at inorder[${mid}] and this range starts at ${lo}, so ${mid - lo} values lie to its left.`) : undefined);
    build(lo, mid - 1, id, 'l');
    build(mid + 1, hi, id, 'r');
    r.frame(`Both parts of ${v} are built: its left child is ${nodes[id].l === NONE ? 'null' : nodes[nodes[id].l].v} and its right child is ${nodes[id].r === NONE ? 'null' : nodes[nodes[id].r].v}. Return node ${v} to its parent.`, views({ lo, hi, mid }, id));
    stack.pop();
    finished.push(id);
    return id;
  }
  r.frame('Preorder lists a subtree root first. Inorder lists left part, root, right part. One cursor walks preorder, and the left subtree must be built first because preorder lists it first.', views(null, null));
  build(0, ino.length - 1, NONE, 'l');
  const answer = J(toLevel(nodes, pre.length ? 0 : NONE));
  r.frame(`The first call returned the root. The tree, level by level, is ${answer}.`, views(null, null, answer));
  return r.frames;
}

// ---------- Serialize and Deserialize ----------
export function serializeWriteFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  const r = recorder();
  const letter: string[] = [];
  const stack: string[] = [], seen: number[] = [], open: number[] = [];
  let slot = 0;
  const views = (cur: number | null, answer = '?'): View[] => [
    treeV(nodes, nodes.length ? 0 : NONE, open, cur, seen),
    stk('call stack (top is last)', [...stack]),
    { kind: 'array', name: 'the letter so far', values: letter.length ? [...letter] : ['(empty)'], indices: false, ...(letter.length ? { tones: { [letter.length - 1]: 'active' as const } } : {}) },
    tvars({ answer }),
  ];
  function write(id: number) {
    if (id === NONE) {
      stack.push('write(null)'); letter.push('#');
      r.frame('An empty spot: write # instead of skipping it. Without markers, a reader could not tell where this branch ended.', views(null),
        slot++ === 0 ? pick('This call received an empty spot. What gets written?', '#', ['Nothing: skip it', '0'], slot, 'Every empty spot is written as #: it marks exactly where a branch ends.') : undefined);
      stack.pop();
      return;
    }
    const n = nodes[id];
    stack.push(`write(${n.v})`); open.push(id); letter.push(String(n.v));
    r.frame(`write(${n.v}): write the value now (preorder), then the whole left subtree, then the whole right subtree.`, views(id));
    write(n.l); write(n.r);
    open.pop(); seen.push(id); stack.pop();
  }
  write(nodes.length ? 0 : NONE);
  const answer = letter.join(',');
  r.frame(`The root's call is over. The letter is ${answer}: ${letter.filter(t => t !== '#').length} values and ${letter.filter(t => t === '#').length} markers, always one more marker than values.`, views(null, answer));
  return r.frames;
}

export function serializeReadFrames(letter: string): Frame[] {
  const tokens = letter.split(',');
  const r = recorder();
  const nodes: N[] = [];
  const stack: string[] = [], open: number[] = [], seen: number[] = [];
  let next = 0, slot = 0;
  const views = (cur: number | null, just: number | null, answer = '?'): View[] => [
    treeV(nodes, nodes.length ? 0 : NONE, open.filter(i => i !== cur), cur, seen.filter(i => i !== cur), 'tree grown so far'),
    stk('call stack (top is last)', [...stack]),
    { kind: 'array', name: 'letter (consumed tokens are done)', values: tokens, indices: false, pointers: next < tokens.length ? [{ at: next, label: 'next' }] : [], tones: Object.fromEntries(tokens.slice(0, next).map((_, i) => [i, (i === just ? 'active' : 'done') as 'active' | 'done'])) },
    tvars({ answer }),
  ];
  function read(parent: number, side: 'l' | 'r'): number {
    const t = tokens[next++];
    if (t === '#') {
      stack.push('read()');
      r.frame('Token #: an empty spot. Return null: this branch ends here and the cursor moves on.', views(null, next - 1),
        slot++ === 0 ? pick('The next token is #. What does this call do?', 'Return null without making a node', ['Make a node with value 0', 'Skip it and read the next token'], slot, '# is the marker for an empty spot. Consuming it and returning null is what keeps the cursor aligned.') : undefined);
      stack.pop();
      return NONE;
    }
    const id = nodes.length;
    nodes[id] = { id, v: Number(t), l: NONE, r: NONE };
    if (parent !== NONE) nodes[parent][side] = id;
    stack.push(`read() -> ${t}`); open.push(id);
    r.frame(`Token ${t}: make a node with value ${t}. Then read its left subtree, and then its right subtree, in the same order the writer used.`, views(id, next - 1));
    read(id, 'l'); read(id, 'r');
    open.pop(); seen.push(id); stack.pop();
    return id;
  }
  read(NONE, 'l');
  const answer = J(toLevel(nodes, nodes.length ? 0 : NONE));
  r.frame(`The root's call is over and every token was consumed. The tree, level by level, is ${answer}.`, views(null, null, answer));
  return r.frames;
}

// ---------- Subtree of Another Tree ----------
export function subtreeFrames(big: Tree, small: Tree): Frame[] {
  const B = parse(big), S = parse(small);
  const r = recorder();
  const stack: number[] = [], failed: number[] = [];
  const diff = (x: number, y: number): string | null => {
    if (x === NONE && y === NONE) return null;
    if (x === NONE) return `big has an empty spot where small has ${S[y].v}`;
    if (y === NONE) return `big has ${B[x].v} where small is empty`;
    if (B[x].v !== S[y].v) return `${B[x].v} != ${S[y].v}`;
    return diff(B[x].l, S[y].l) ?? diff(B[x].r, S[y].r);
  };
  const cover = (x: number, y: number, into: number[]) => { if (x === NONE || y === NONE) return; into.push(x); cover(B[x].l, S[y].l, into); cover(B[x].r, S[y].r, into); };
  const views = (cur: number | null, matched: number[], answer = '?'): View[] => {
    const t = treeV(B, B.length ? 0 : NONE, stack.filter(i => i !== cur), cur, failed, 'big tree') as Extract<View, { kind: 'tree' }>;
    for (const i of matched) t.tones![String(i)] = 'current';
    return [t, { kind: 'tree', name: 'small tree (the pattern)', root: nest(S, 0) }, stk('call stack: isSubtree(...)', stack.map(i => `isSubtree(${B[i].v})`)), tvars({ answer })];
  };
  let slot = 0;
  function visit(id: number): boolean {
    if (id === NONE) return false;
    stack.push(id);
    const d = diff(id, 0);
    if (d === null) {
      const matched: number[] = []; cover(id, 0, matched);
      r.frame(`Does a match start at ${B[id].v}? Run the identical-trees check on (${B[id].v}, ${S[0].v}): every pair below agrees. Return true; the || stops the search.`, views(id, matched, 'true'));
      return true;
    }
    r.frame(`Does a match start at ${B[id].v}? Run the identical-trees check on (${B[id].v}, ${S[0].v}): ${d}. No match here, so try the left subtree, then the right.`, views(id, [], '?'),
      slot++ === 0 ? pick(`The check at ${B[id].v} fails. What next?`, 'Try the left subtree, then the right', [`Return false: the answer is no`, 'Stop: only the root can match'], slot, 'A copy of small could start at any node, so the search continues through both children.') : undefined);
    failed.push(id);
    const hit = visit(B[id].l) || visit(B[id].r);
    if (hit) return true;
    stack.pop();
    return false;
  }
  const hit = visit(B.length ? 0 : NONE);
  if (hit) return r.frames;
  r.frame('Every node of big was tried as the start of a match and none worked. Return false.', views(null, [], 'false'));
  return r.frames;
}

// ---------- LCA in a BST: the values choose the direction ----------
export function lcaBstFrames(a: Tree, p: number, q: number): Frame[] {
  const nodes = parse(a);
  const r = recorder();
  const trail: number[] = [];
  const targets = nodes.filter(n => n.v === p || n.v === q).map(n => n.id);
  const views = (cur: number | null, answer = '?'): View[] => {
    const t = treeV(nodes, nodes.length ? 0 : NONE, trail, cur, []) as Extract<View, { kind: 'tree' }>;
    for (const i of targets) if (i !== cur) t.tones![String(i)] = 'queued';
    return [t, tvars({ p, q, cur: cur === null ? 'null' : nodes[cur].v, answer })];
  };
  let cur = nodes.length ? 0 : NONE, slot = 0;
  r.frame(`Both ${p} and ${q} are in the tree (queued). In a BST the values say which way to go, so no search of both sides is needed.`, views(null));
  while (cur !== NONE) {
    const v = nodes[cur].v;
    if (p < v && q < v) {
      r.frame(`${p} and ${q} are both smaller than ${v}, so both live in the left subtree and so does their meeting point. Go left.`, views(cur),
        slot++ === 0 ? pick(`At ${v}: p = ${p}, q = ${q}. Which way?`, 'Left: both are smaller', ['Right: both are larger', 'Stop here'], slot, `${p} < ${v} and ${q} < ${v}, so nothing in the right subtree matters.`) : undefined);
      trail.push(cur); cur = nodes[cur].l;
    } else if (p > v && q > v) {
      r.frame(`${p} and ${q} are both larger than ${v}, so both live in the right subtree. Go right.`, views(cur));
      trail.push(cur); cur = nodes[cur].r;
    } else {
      r.frame(`${v} is not above both targets: they split here (one on each side), or ${v} is one of them. This is the lowest common ancestor. Return ${v}.`, views(cur, String(v)));
      return r.frames;
    }
  }
  r.frame('Fell off the tree without a split: the targets are not both present. Return null.', views(null, 'null'));
  return r.frames;
}

// ---------- Count Good Nodes: a maximum flows down, a count flows up ----------
export function goodNodesFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  return walk<number, number>(nodes, {
    fn: 'count', p0: -Infinity, base: 0, show: String,
    label: (n, p) => `count(${n.v}, ${inf(p)})`,
    down: (n, p) => Math.max(p, n.v),
    fmtP: p => ({ maxAbove: inf(p) }),
    enter: (n, p) => `Call count(${n.v}, maxAbove=${inf(p)}). ${n.v} ${n.v >= p ? '>=' : '<'} ${inf(p)}, so it is ${n.v >= p ? 'good (ties count)' : 'not good'}. Both children get max(${inf(p)}, ${n.v}) = ${Math.max(p, n.v)} as their maxAbove.`,
    up: (n, p, i) => { const good = n.v >= p ? 1 : 0, ret = good + i.l + i.r; return { ret, why: `This node counts ${good}, the left subtree counted ${i.l}, the right counted ${i.r}: ${good} + ${i.l} + ${i.r} = ${ret}.` }; },
    ask: (n, p, i, ret, slot) => (!i.lNull || !i.rNull ? numPick(`${n.v} has maxAbove ${inf(p)}; its subtrees counted ${i.l} and ${i.r}. What does count(${n.v}) return?`, ret, [i.l + i.r], slot, `${n.v >= p ? 'This node is good (+1)' : 'This node is not good (+0)'}, plus ${i.l} and ${i.r} from below.`) : undefined),
    final: String,
    finalWhy: (_, answer) => `The root's call returned ${answer}: the maximum travelled down as a parameter, and the count travelled up as the return value.`,
  });
}

// ---------- House Robber III: return a pair ----------
export function robFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  type Pair = [number, number];
  return walk<number, Pair>(nodes, {
    fn: 'best', p0: 0, base: [0, 0], show: x => `(skip ${x[0]}, take ${x[1]})`, down: () => 0,
    enter: n => `Call best(${n.v}). Each child will report a pair: the best total if it is skipped, and the best if it is taken.`,
    up: (n, _, i) => {
      const skip = Math.max(...i.l) + Math.max(...i.r), take = n.v + i.l[0] + i.r[0];
      return { ret: [skip, take] as Pair, why: `Skip ${n.v}: each child is free, so max(${i.l}) + max(${i.r}) = ${skip}. Take ${n.v}: both children must be skipped, so ${n.v} + ${i.l[0]} + ${i.r[0]} = ${take}.` };
    },
    ask: (n, _, i, ret, slot) => (!i.lNull && !i.rNull ? numPick(`Children report (skip ${i.l[0]}, take ${i.l[1]}) and (skip ${i.r[0]}, take ${i.r[1]}). What is "take ${n.v}"?`, ret[1], [ret[0], n.v + i.l[1] + i.r[1]], slot, `Taking ${n.v} forces both children to be skipped: ${n.v} + ${i.l[0]} + ${i.r[0]} = ${ret[1]}.`) : undefined),
    final: root => String(Math.max(...root)),
    finalWhy: (root, answer) => `The root returned (skip ${root[0]}, take ${root[1]}). The answer is the larger: ${answer}.`,
  });
}

// ---------- Flatten to a linked list: reverse preorder with a prev pointer ----------
export function flattenFrames(a: Tree): Frame[] {
  const nodes = parse(a);
  const shape = parse(a);
  let prev = NONE, lastOld = NONE;
  const rope = () => { const out: number[] = []; for (let c = prev; c !== NONE; c = nodes[c].r) out.push(nodes[c].v); return out; };
  return walk<number, number>(nodes, {
    fn: 'unroll', p0: 0, base: 0, show: () => 'nothing', returns: false, reverse: true, shape, down: () => 0,
    state: () => ({ prev: prev === NONE ? 'null' : nodes[prev].v }),
    extra: () => (rope().length ? [{ kind: 'array', name: 'the list built so far (head first)', values: rope(), join: '→', indices: false } as View] : []),
    enter: n => `Call unroll(${n.v}). Reverse preorder: the right subtree first, then the left, and ${n.v} itself last. (The tree drawn is the original shape.)`,
    ask: (n, _, __, ___, slot) => (slot < 2 ? pick(`Everything after ${n.v} in preorder is already a list headed by ${lastOld === NONE ? 'null' : nodes[lastOld].v}. What does ${n.v}.right become?`, lastOld === NONE ? 'null' : String(nodes[lastOld].v), [lastOld === NONE ? `${n.v} itself` : 'null', 'its old left child'], slot, 'Hooking onto the head of the finished rope is the only link needed: right = prev.') : undefined),
    up: n => {
      const old = prev;
      lastOld = old;
      n.r = prev; n.l = NONE; prev = n.id;
      return { ret: 0, why: `Everything that comes after ${n.v} in preorder is already a list, headed by ${old === NONE ? 'null' : nodes[old].v}. Hook on: ${n.v}.right = ${old === NONE ? 'null' : nodes[old].v}, ${n.v}.left = null, and prev = ${n.v}.` };
    },
    final: () => { const out: number[] = []; for (let c = 0; c !== NONE && nodes.length; c = nodes[c].r) out.push(nodes[c].v); return J(out); },
    finalWhy: (_, answer) => `The root's call is over. Following right pointers from the root gives ${answer}: the preorder of the original tree, with every left pointer empty.`,
  });
}
