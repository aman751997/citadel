// Trees (DFS) playground: be the Messenger who reports a height up and writes the bend on the gate board
// (diameter); be the Climber who carries a (low, high) window down (validate a BST); and work the Basket
// by hand (iterative in-order walk, stopping at the k-th value).
import { makeLab, type LabBase, type LabRow } from '../lab.ts';
import { parseLevel, treeRows, type Level, type TNode } from '../../data/trees-dfs/traces.ts';
import type { CellTone } from '../trace.ts';

export interface TreeLabState extends LabBase {
  level: Level;
  nodes: TNode[];
  order: number[];                       // node keys in visiting order (postorder / preorder)
  at: number;                            // position in `order`
  phase: string;
  // report mode (diameter)
  reports: Record<string, number>;       // key → height it reported
  best: number;
  // bounds mode (validate BST); null = no bound
  lows: Record<string, number | null>;
  highs: Record<string, number | null>;
  verdict: boolean | null;
  // basket mode (iterative in-order, k-th smallest)
  k: number;
  basket: number[];                      // node keys, top at the end
  cur: number;                           // node key, −1 = empty spot
  visited: number[];                     // node keys in visit order
}

type Input =
  | { mode: 'report'; level: Level }
  | { mode: 'bounds'; level: Level }
  | { mode: 'basket'; level: Level; k: number };

const reportCases: Level[] = [[1, 2, 3, 4, 5], [1, 2, null, 3, 4, 5, null, null, 6], [7], []];
const boundsCases: Level[] = [[8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13], [5, 4, 6, null, null, 3, 7], [2, 2, 2], []];
const basketCases: { level: Level; k: number }[] = [
  { level: [5, 3, 6, 2, 4, null, null, 1], k: 3 },
  { level: [4, 3, null, 2, null, 1], k: 4 },
  { level: [2, 2, 3], k: 2 },
  { level: [7], k: 1 },
];

const fmt = (x: number) => (x < 0 ? `−${-x}` : String(x));
const lowText = (x: number | null) => (x === null ? '−∞' : fmt(x));
const highText = (x: number | null) => (x === null ? '+∞' : fmt(x));
const win = (lo: number | null, hi: number | null) => `(${lowText(lo)}, ${highText(hi)})`;

function postorder(nodes: TNode[]) {
  const by = new Map(nodes.map(n => [n.key, n]));
  const out: number[] = [];
  const go = (k: number) => { if (k === -1) return; const n = by.get(k)!; go(n.left); go(n.right); out.push(k); };
  if (nodes.length) go(0);
  return out;
}
function preorder(nodes: TNode[]) {
  const by = new Map(nodes.map(n => [n.key, n]));
  const out: number[] = [];
  const go = (k: number) => { if (k === -1) return; const n = by.get(k)!; out.push(k); go(n.left); go(n.right); };
  if (nodes.length) go(0);
  return out;
}

export function fromInput(input: Input) {
  const nodes = parseLevel(input.level);
  const base = {
    level: [...input.level], nodes, order: [] as number[], at: 0, phase: 'answer',
    reports: {} as Record<string, number>, best: 0,
    lows: {} as Record<string, number | null>, highs: {} as Record<string, number | null>, verdict: null as boolean | null,
    k: 0, basket: [] as number[], cur: -1, visited: [] as number[],
  };
  if (input.mode === 'report') {
    const order = postorder(nodes);
    return { ...base, order, phase: order.length ? 'bend' : 'answer' };
  }
  if (input.mode === 'bounds') {
    const order = preorder(nodes);
    const lows: Record<string, number | null> = {}, highs: Record<string, number | null> = {};
    if (order.length) { lows['0'] = null; highs['0'] = null; }
    return { ...base, order, lows, highs, phase: order.length ? 'check' : 'finish' };
  }
  return { ...base, k: input.k, cur: nodes.length ? 0 : -1, phase: 'walk' };
}

const node = (s: TreeLabState, key: number) => s.nodes.find(n => n.key === key)!;
const val = (s: TreeLabState, key: number) => fmt(node(s, key).val);
const heightOf = (s: TreeLabState, key: number) => (key === -1 ? 0 : s.reports[String(key)] ?? 0);
const arms = (s: TreeLabState) => {
  const n = node(s, s.order[s.at]);
  return { n, L: heightOf(s, n.left), R: heightOf(s, n.right) };
};

// ---------- report (diameter) ----------
function reportExpected(s: TreeLabState) {
  return s.phase === 'bend' ? 'bend' : s.phase === 'report' ? 'report' : 'answer';
}
function rootFacts(s: TreeLabState) {
  if (!s.nodes.length) return { report: 0, through: 0 };
  const root = node(s, 0);
  return { report: heightOf(s, 0), through: heightOf(s, root.left) + heightOf(s, root.right) };
}
function reportReject(s: TreeLabState, action: string) {
  if (s.phase === 'answer') {
    const { report, through } = rootFacts(s);
    if (action === 'answer-root') return `The root reported ${report}: its height, the longest single arm. ${report === s.best ? 'That equals Best here only by coincidence. ' : ''}The diameter is the longest bend anywhere, and it is on the board: Best = ${s.best}.`;
    if (action === 'answer-through') return `Left + right at the root is ${through}: it covers only paths that pass through the root. ${through === s.best ? 'Here the longest path does pass through the root, but only the board can tell you that. ' : 'The longest path bends lower down. '}Best = ${s.best}.`;
    return `Every node has reported and every bend is on the board. Read the answer: Best = ${s.best}.`;
  }
  const { n, L, R } = arms(s);
  const v = fmt(n.val), parent = n.parent === -1 ? 'its caller' : `its parent ${val(s, n.parent)}`;
  if (action.startsWith('answer')) return `${s.order.length - s.at} node(s), including ${v}, haven’t finished yet. The answer isn’t settled until the root reports.`;
  if (s.phase === 'bend') {
    if (action === 'bend-height') {
      const h = 1 + Math.max(L, R);
      if (h === L + R) return `Both give ${h} here only because one arm is exactly 1 deep. 1 + max(L, R) counts the nodes on ONE arm; the path that bends at ${v} uses both arms and is measured in edges: L + R. With arms of 2 and 2 they differ: 3 versus 4.`;
      return `1 + max(${L}, ${R}) = ${h} counts the nodes on one arm. The path that bends at ${v} uses both arms: ${L} + ${R} = ${L + R} edges.`;
    }
    return `Check the bend first. Once ${v} reports, its call is over, and the path through it — ${L} + ${R} = ${L + R} edges — never reaches the board.`;
  }
  // phase === 'report'
  if (action === 'report-path') return `${L} + ${R} = ${L + R} is a path that bends at ${v}. ${parent[0].toUpperCase()}${parent.slice(1)} can extend only one arm through ${v}; joining a bent path makes a fork, not a path. Report the longer arm: 1 + max(${L}, ${R}) = ${1 + Math.max(L, R)}.`;
  return `${v} has already written its bend on the board (Best = ${s.best}). Its last job is to report its height to ${parent}.`;
}
function reportApply(s: TreeLabState, action: string) {
  if (s.phase === 'answer') {
    s.done = true;
    s.message = s.nodes.length ? `Diameter = ${s.best} edge(s). The root’s report was a height; the board held the answer.` : 'An empty tree has no path at all: diameter 0.';
    return;
  }
  const { n, L, R } = arms(s);
  if (action === 'bend') {
    const before = s.best;
    s.best = Math.max(s.best, L + R);
    s.phase = 'report';
    s.message = `The path that bends at ${fmt(n.val)} has ${L} + ${R} = ${L + R} edge(s). ${s.best > before ? `New Best: ${s.best}.` : `Best stays ${s.best}.`}`;
  } else {
    const h = 1 + Math.max(L, R);
    s.reports[String(n.key)] = h;
    s.at++;
    s.phase = s.at < s.order.length ? 'bend' : 'answer';
    s.message = `${fmt(n.val)} reports height ${h} = 1 + max(${L}, ${R}).` + (s.phase === 'answer' ? ' The root is done.' : '');
  }
}
function reportView(s: TreeLabState): LabRow[] {
  const labels: Record<number, string> = {}, tones: Record<number, CellTone> = {};
  for (const [k, h] of Object.entries(s.reports)) { labels[Number(k)] = `h ${h}`; tones[Number(k)] = 'done'; }
  if (s.phase !== 'answer') { const key = s.order[s.at]; labels[key] = 'HERE'; tones[key] = 'hot'; }
  const rows: LabRow[] = s.nodes.length ? treeRows(s.level, labels, tones) : [{ name: 'Tree', cells: [], empty: 'Empty tree' }];
  return [...rows, { name: 'Gate board', cells: [{ value: String(s.best), label: 'Best (edges)', tone: s.done ? 'done' : undefined }] }];
}
function reportDescribe(s: TreeLabState) {
  if (s.done) return `Done. Diameter = ${s.best}.`;
  if (s.phase === 'answer') return s.nodes.length ? `The root has reported ${rootFacts(s).report}. Best = ${s.best}. What is the diameter?` : 'The tree is empty. Nothing will ever report. What is the diameter?';
  const { n, L, R } = arms(s);
  return `Node ${fmt(n.val)}: left reported ${L}, right reported ${R}. Best = ${s.best}. ${s.phase === 'bend' ? 'First the board, then the report.' : 'Now the report.'}`;
}

// ---------- bounds (validate BST) ----------
function childWindow(s: TreeLabState, key: number, action: string): [number | null, number | null] {
  const n = node(s, key), p = node(s, n.parent);
  const lo = s.lows[String(p.key)], hi = s.highs[String(p.key)], isLeft = p.left === key;
  if (action === 'left') return [lo, p.val];
  if (action === 'right') return [p.val, hi];
  if (action === 'same') return [lo, hi];
  return isLeft ? [null, p.val] : [p.val, null];          // 'parent': forget everything above the parent
}
const fits = (v: number, lo: number | null, hi: number | null) => (lo === null || v > lo) && (hi === null || v < hi);
function boundsExpected(s: TreeLabState) {
  if (s.phase === 'finish') return 'finish';
  const key = s.order[s.at], n = node(s, key);
  if (s.phase === 'window') return node(s, n.parent).left === key ? 'left' : 'right';
  return fits(n.val, s.lows[String(key)], s.highs[String(key)]) ? 'inside' : 'outside';
}
function boundsAlso(s: TreeLabState, action: string) {
  if (s.phase !== 'window' || !['left', 'right', 'same', 'parent'].includes(action)) return false;
  const key = s.order[s.at];
  const want = childWindow(s, key, boundsExpected(s)), got = childWindow(s, key, action);
  return want[0] === got[0] && want[1] === got[1];
}
function boundsReject(s: TreeLabState, action: string) {
  if (s.phase === 'finish') return s.nodes.length ? 'Every node has been checked and fits its window. Declare it a BST.' : 'An empty tree breaks no rule: it is a BST.';
  const key = s.order[s.at], n = node(s, key), v = fmt(n.val);
  if (s.phase === 'window') {
    const p = node(s, n.parent), pv = fmt(p.val), isLeft = p.left === key;
    const [lo, hi] = childWindow(s, key, isLeft ? 'left' : 'right');
    const plo = s.lows[String(p.key)], phi = s.highs[String(p.key)];
    if (action === 'left') return `${v} hangs on the RIGHT of ${pv}, so it must be greater than ${pv}: the floor rises to ${pv}. Lowering the ceiling to ${pv} would demand the opposite.`;
    if (action === 'right') return `${v} hangs on the LEFT of ${pv}, so it must be smaller than ${pv}: the ceiling drops to ${pv}. Raising the floor to ${pv} would demand the opposite.`;
    if (action === 'same') return `Passing ${win(plo, phi)} down unchanged ignores ${pv} itself: ${v} is on its ${isLeft ? 'left, so it must also be below' : 'right, so it must also be above'} ${pv}. The window should be ${win(lo, hi)}.`;
    if (action === 'parent') return `Comparing with ${pv} alone forgets the ${isLeft ? `floor ${lowText(plo)}` : `ceiling ${highText(phi)}`} inherited from higher up. ${v} lives in that ancestor’s subtree too. The window is ${win(lo, hi)}.`;
    return `First give ${v} its window: it is ${pv}’s ${isLeft ? 'left' : 'right'} child, and ${pv}’s window is ${win(plo, phi)}.`;
  }
  const lo = s.lows[String(key)], hi = s.highs[String(key)];
  if (action === 'inside') return lo !== null && n.val <= lo ? `${v} must be strictly above the floor ${fmt(lo)}, and it isn’t. Some ancestor has ${v} on its right side.` : `${v} must be strictly below the ceiling ${highText(hi)}, and it isn’t. Some ancestor has ${v} on its left side.`;
  if (action === 'outside') return `${lowText(lo)} < ${v} < ${highText(hi)}: it fits. Nothing is broken here.`;
  if (action === 'finish') return `${s.order.length - s.at} node(s), starting with ${v}, haven’t been checked yet.`;
  return `${v} already has its window, ${win(lo, hi)}. Check the value against it.`;
}
function boundsApply(s: TreeLabState, action: string) {
  if (s.phase === 'finish') {
    s.done = true; s.verdict = true;
    s.message = s.nodes.length ? 'Every value fits strictly inside its window: a valid BST.' : 'An empty tree is a valid BST.';
    return;
  }
  const key = s.order[s.at], n = node(s, key);
  if (s.phase === 'window') {
    const [lo, hi] = childWindow(s, key, boundsExpected(s));
    s.lows[String(key)] = lo; s.highs[String(key)] = hi;
    s.phase = 'check';
    s.message = `${fmt(n.val)} gets the window ${win(lo, hi)}.`;
    return;
  }
  const lo = s.lows[String(key)], hi = s.highs[String(key)];
  if (action === 'outside') {
    s.done = true; s.verdict = false;
    s.message = `${fmt(n.val)} is outside ${win(lo, hi)}: not a BST. Stop at the first broken node.`;
    return;
  }
  s.at++;
  s.phase = s.at < s.order.length ? 'window' : 'finish';
  s.message = `${lowText(lo)} < ${fmt(n.val)} < ${highText(hi)}: it fits.` + (s.phase === 'finish' ? ' That was the last node.' : '');
}
function boundsView(s: TreeLabState): LabRow[] {
  if (!s.nodes.length) return [{ name: 'Tree', cells: [], empty: 'Empty tree' }];
  const labels: Record<number, string> = {}, tones: Record<number, CellTone> = {};
  for (let i = 0; i < s.at; i++) { const k = s.order[i]; labels[k] = win(s.lows[String(k)], s.highs[String(k)]); tones[k] = 'done'; }
  if (s.phase !== 'finish') {
    const k = s.order[s.at];
    labels[k] = s.phase === 'window' ? 'NEXT' : win(s.lows[String(k)], s.highs[String(k)]);
    tones[k] = 'hot';
  }
  return treeRows(s.level, labels, tones);
}
function boundsDescribe(s: TreeLabState) {
  if (s.done) return s.verdict ? 'Done: a valid BST.' : 'Done: not a BST.';
  if (s.phase === 'finish') return 'No nodes left to check.';
  const key = s.order[s.at], n = node(s, key);
  if (s.phase === 'window') {
    const p = node(s, n.parent);
    return `Step from ${fmt(p.val)} (window ${win(s.lows[String(p.key)], s.highs[String(p.key)])}) down to its ${p.left === key ? 'left' : 'right'} child ${fmt(n.val)}. Which window does ${fmt(n.val)} get?`;
  }
  return `Is ${fmt(n.val)} strictly inside ${win(s.lows[String(key)], s.highs[String(key)])}?`;
}

// ---------- basket (iterative in-order) ----------
function basketExpected(s: TreeLabState) {
  if (s.visited.length === s.k) return 'answer';
  if (s.cur !== -1) return 'push';
  return s.basket.length ? 'pop' : 'answer';
}
function basketAlso(s: TreeLabState, action: string) {
  // Visiting cur directly is a correct in-order step when cur has no left side.
  return action === 'visit' && s.visited.length < s.k && s.cur !== -1 && node(s, s.cur).left === -1;
}
function smallestIn(s: TreeLabState, key: number) {
  let k = key;
  while (node(s, k).left !== -1) k = node(s, k).left;
  return node(s, k).val;
}
function basketReject(s: TreeLabState, action: string) {
  const top = s.basket.length ? val(s, s.basket[s.basket.length - 1]) : null;
  if (s.visited.length === s.k) return `That was visit #${s.k}: ${val(s, s.visited[s.k - 1])} is the answer. Stop walking.`;
  if (action === 'answer') return `Only ${s.visited.length} value(s) visited so far; you need the ${s.k}${s.k === 1 ? 'st' : s.k === 2 ? 'nd' : s.k === 3 ? 'rd' : 'th'}.`;
  if (action === 'push') return `cur is an empty spot: there is nothing to push. The top of the basket, ${top}, is the smallest value not yet visited. Pop it.`;
  if (action === 'pop') return s.basket.length
    ? `cur = ${val(s, s.cur)} hasn’t been explored. Its subtree holds ${fmt(smallestIn(s, s.cur))}, smaller than the basket’s top ${top}, so popping now would visit out of order. Push cur and keep going left.`
    : `The basket is empty. cur = ${val(s, s.cur)} still has to be pushed before anything can be popped.`;
  if (s.cur === -1) return `cur is an empty spot: there is nothing to visit. The top of the basket, ${top}, is the smallest value not yet visited. Pop it.`;
  // visit with a left side
  return `Visiting ${val(s, s.cur)} now puts it before its left side, which holds the smaller ${fmt(smallestIn(s, s.cur))}. That is root-first order, not sorted order. Push it and go left.`;
}
function basketApply(s: TreeLabState, action: string) {
  if (action === 'answer') {
    s.done = true;
    s.message = s.visited.length === s.k ? `The ${s.k}-th smallest value is ${val(s, s.visited[s.k - 1])}.` : 'Nothing left to visit.';
    return;
  }
  if (action === 'push') {
    const n = node(s, s.cur);
    s.basket.push(s.cur);
    s.cur = n.left;
    s.message = `Pushed ${fmt(n.val)}; stepping left${n.left === -1 ? ' onto an empty spot' : ` to ${val(s, n.left)}`}.`;
    return;
  }
  const key = action === 'visit' ? s.cur : s.basket.pop()!;
  const n = node(s, key);
  s.visited.push(key);
  s.cur = n.right;
  s.message = `Visit #${s.visited.length}: ${fmt(n.val)}. Then step right${n.right === -1 ? ' onto an empty spot' : ` to ${val(s, n.right)}`}.` + (s.visited.length === s.k ? ` That was visit #${s.k}.` : '');
}
function basketView(s: TreeLabState): LabRow[] {
  const labels: Record<number, string> = {}, tones: Record<number, CellTone> = {};
  s.visited.forEach((k, i) => { labels[k] = `#${i + 1}`; tones[k] = 'done'; });
  s.basket.forEach((k, i) => { labels[k] = i === s.basket.length - 1 ? 'top' : 'basket'; });
  if (s.cur !== -1 && !s.done) { labels[s.cur] = 'cur'; tones[s.cur] = 'hot'; }
  const rows: LabRow[] = s.nodes.length ? treeRows(s.level, labels, tones) : [{ name: 'Tree', cells: [], empty: 'Empty tree' }];
  return [
    ...rows,
    { name: 'Basket (top on the right)', empty: 'Basket is empty', cells: s.basket.map((k, i) => ({ value: val(s, k), label: i === s.basket.length - 1 ? 'top' : undefined })) },
    { name: 'Visited, in order', empty: 'Nothing visited yet', cells: s.visited.map((k, i) => ({ value: val(s, k), label: `#${i + 1}`, tone: 'done' as const })) },
  ];
}
function basketDescribe(s: TreeLabState) {
  if (s.done) return `Done: the ${s.k}-th smallest is ${val(s, s.visited[s.k - 1])}.`;
  return `k = ${s.k} · visited ${s.visited.length} · cur = ${s.cur === -1 ? 'empty spot' : val(s, s.cur)} · basket top = ${s.basket.length ? val(s, s.basket[s.basket.length - 1]) : 'none'}`;
}

export const lab = makeLab<TreeLabState>({
  report: {
    name: 'The Messenger: report a height, record the bend (diameter)',
    cases: reportCases.length,
    actions: [
      { action: 'bend', label: 'Best ← max(Best, L + R)' },
      { action: 'bend-height', label: 'Best ← max(Best, 1 + max(L, R))' },
      { action: 'report', label: 'Report 1 + max(L, R) up' },
      { action: 'report-path', label: 'Report L + R up' },
      { action: 'answer', label: 'Root is done: answer = Best' },
      { action: 'answer-root', label: 'Root is done: answer = the root’s report' },
      { action: 'answer-through', label: 'Root is done: answer = L + R at the root' },
    ],
    create: v => fromInput({ mode: 'report', level: reportCases[v] }),
    expected: reportExpected,
    apply: reportApply,
    reject: reportReject,
    view: reportView,
    describe: reportDescribe,
  },
  bounds: {
    name: 'The Climber: carry a window down (validate a BST)',
    cases: boundsCases.length,
    actions: [
      { action: 'left', label: 'Left child: floor stays, ceiling = parent' },
      { action: 'right', label: 'Right child: floor = parent, ceiling stays' },
      { action: 'same', label: 'Pass the parent’s window down unchanged' },
      { action: 'parent', label: 'Compare with the parent only' },
      { action: 'inside', label: 'Value fits strictly inside: carry on' },
      { action: 'outside', label: 'Value breaks the window: not a BST' },
      { action: 'finish', label: 'Every node fits: it is a BST' },
    ],
    create: v => fromInput({ mode: 'bounds', level: boundsCases[v] }),
    expected: boundsExpected,
    alsoValid: boundsAlso,
    apply: boundsApply,
    reject: boundsReject,
    view: boundsView,
    describe: boundsDescribe,
  },
  basket: {
    name: 'The Basket: walk in order, stop at the k-th',
    cases: basketCases.length,
    actions: [
      { action: 'push', label: 'Push cur into the basket, step left' },
      { action: 'pop', label: 'Pop the top, visit it, step right' },
      { action: 'visit', label: 'Visit cur now, before its left side' },
      { action: 'answer', label: 'Answer with the k-th visit' },
    ],
    create: v => fromInput({ mode: 'basket', ...basketCases[v] }),
    expected: basketExpected,
    alsoValid: basketAlso,
    apply: basketApply,
    reject: basketReject,
    view: basketView,
    describe: basketDescribe,
  },
}, 'One row per depth, children under their parent · gold = here · green = finished · dashed = empty spot');
