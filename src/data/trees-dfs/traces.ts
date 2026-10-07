// Decision puzzles, figure data and tree helpers for the Trees (DFS) lesson.
// Every number here is re-derived independently in tests/trees-dfs.test.ts.
import { row, step, type CellTone, type TraceRow } from '../../lib/trace.ts';

// A tree in LeetCode's level-order form: [3, 9, 20, null, null, 15, 7].
export type Level = (number | null)[];
// key = the node's index in the level array (unique even when values repeat).
export interface TNode { key: number; val: number; depth: number; slot: number; left: number; right: number; parent: number }

export function parseLevel(level: Level): TNode[] {
  const nodes: TNode[] = [];
  if (!level.length || level[0] === null || level[0] === undefined) return nodes;
  const make = (key: number, depth: number, slot: number, parent: number): TNode => {
    const n = { key, val: level[key] as number, depth, slot, left: -1, right: -1, parent };
    nodes.push(n);
    return n;
  };
  const queue = [make(0, 0, 0, -1)];
  let i = 1;
  for (let h = 0; h < queue.length && i < level.length; h++) {
    const n = queue[h];
    if (i < level.length && level[i] !== null && level[i] !== undefined) { n.left = i; queue.push(make(i, n.depth + 1, n.slot * 2, n.key)); }
    i++;
    if (i < level.length && level[i] !== null && level[i] !== undefined) { n.right = i; queue.push(make(i, n.depth + 1, n.slot * 2 + 1, n.key)); }
    i++;
  }
  return nodes;
}

// One trace row per depth, 2^depth cells wide, so children sit under their parent. Empty spots are '·'.
export function treeRows(level: Level, labels: Record<number, string> = {}, tones: Record<number, CellTone> = {}, name = 'depth'): TraceRow[] {
  const nodes = parseLevel(level);
  const deepest = nodes.reduce((m, n) => Math.max(m, n.depth), -1);
  const rows: TraceRow[] = [];
  for (let d = 0; d <= deepest; d++) {
    const width = 2 ** d;
    const values: (string | number)[] = Array(width).fill('·');
    const lab: Record<number, string> = {}, tn: Record<number, CellTone> = {};
    for (const n of nodes) if (n.depth === d) {
      values[n.slot] = n.val;
      if (labels[n.key]) lab[n.slot] = labels[n.key];
      if (tones[n.key]) tn[n.slot] = tones[n.key];
    }
    for (let s = 0; s < width; s++) if (values[s] === '·') tn[s] = 'ghost';
    rows.push(row(`${name} ${d}`, values, lab, { tones: tn }));
  }
  return rows;
}

// Layout for the lesson's SVG trees: x = in-order rank (so nothing overlaps), y = depth.
// With `nulls`, every empty child slot is drawn as a '#' marker (used for the serialization figure).
export interface Placed { key: string; val: string; x: number; depth: number; isNull: boolean }
export function layoutTree(level: Level, nulls = false) {
  const nodes = parseLevel(level);
  const byKey = new Map(nodes.map(n => [n.key, n]));
  const placed: Placed[] = [];
  const edges: { from: string; to: string }[] = [];
  let x = 0;
  const walk = (key: number, depth: number, parent: string | null, side: string): void => {
    if (key === -1) {
      if (!nulls || parent === null) return;
      const k = `${parent}${side}`;
      placed.push({ key: k, val: '#', x: x++, depth, isNull: true });
      edges.push({ from: parent, to: k });
      return;
    }
    const n = byKey.get(key)!;
    const me = String(key);
    if (parent !== null) edges.push({ from: parent, to: me });
    walk(n.left, depth + 1, me, 'L');
    placed.push({ key: me, val: String(n.val), x: x++, depth, isNull: false });
    walk(n.right, depth + 1, me, 'R');
  };
  if (nodes.length) walk(0, 0, null, '');
  return { nodes: placed, edges, width: x, height: placed.reduce((m, p) => Math.max(m, p.depth + 1), 0) };
}

// ---------- figure data (keys are level-array indexes) ----------
export const figures = {
  orders: { level: [3, 9, 20, null, null, 15, 7], pre: [3, 9, 20, 15, 7], inorder: [9, 3, 15, 20, 7], post: [9, 15, 7, 20, 3] },
  invertBefore: [4, 2, 7, 1, 3, 6, 9],
  invertAfter: [4, 7, 2, 9, 6, 3, 1],
  sameP: [1, 2],
  sameQ: [1, null, 2],
  depth: { level: [3, 9, 20, null, null, 15, 7], notes: { 0: 'h 3', 1: 'h 1', 2: 'h 2', 5: 'h 1', 6: 'h 1' } },
  balanced: {
    level: [1, 2, 2, 3, null, null, 3, 4, null, null, 4],
    notes: { 0: 'h 4', 1: 'h 3 · gap 2', 2: 'h 3 · gap 2', 3: 'h 2', 6: 'h 2', 7: 'h 1', 10: 'h 1' },
  },
  // The diameter bends at node 2 and never touches the root.
  diameter: {
    level: [1, 2, null, 3, 4, 5, null, null, 6, 7, null, null, 8],
    notes: { 0: 'h 5', 1: 'h 4 · bend 6', 3: 'h 3', 4: 'h 3', 5: 'h 2', 8: 'h 2', 9: 'h 1', 12: 'h 1' },
    path: [9, 5, 3, 1, 4, 8, 12],
    best: 6, rootReport: 5, rootBend: 4,
  },
  maxPath: {
    level: [-10, 9, 20, null, null, 15, 7],
    notes: { 0: 'gain 25 · bend 34', 1: 'gain 9', 2: 'gain 35 · bend 42', 5: 'gain 15', 6: 'gain 7' },
    path: [5, 2, 6],
  },
  lca: {
    level: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4],
    // p = 6, q = 4: what each call returns
    notes: { 0: '→ 5', 1: '→ 5 (both sides)', 2: '→ null', 3: 'p → 6', 4: '→ 4', 5: '→ null', 6: '→ null', 9: '→ null', 10: 'q → 4' },
  },
  pathSum: {
    level: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1],
    target: 22,
    notes: { 0: 'left 17', 1: 'left 13', 2: 'left 9', 3: 'left 2', 5: 'left −4', 6: 'left 5', 7: 'left −5', 8: 'left 0 ✓', 11: 'left 0 ✓', 12: 'left 4' },
    path: [0, 1, 3, 8, 2, 6, 11],
  },
  build: { level: [3, 9, 20, null, null, 15, 7], pre: [3, 9, 20, 15, 7], inorder: [9, 3, 15, 20, 7] },
  serialize: { level: [1, 2, 3, null, null, 4, 5], text: '1,2,#,#,3,4,#,#,5,#,#' },
  validate: {
    level: [5, 4, 6, null, null, 3, 7],
    notes: { 0: '(−∞, +∞)', 1: '(−∞, 5)', 2: '(5, +∞)', 5: '(5, 6) ✗', 6: '(6, +∞)' },
  },
  kth: { level: [5, 3, 6, 2, 4, null, null, 1], notes: { 7: '1st', 3: '2nd', 1: '3rd', 4: '4th', 0: '5th', 2: '6th' } },
  symmetric: [1, 2, 2, 3, 4, 4, 3],
  subtreeRoot: [3, 4, 5, 1, 2],
  subtreeSub: [4, 1, 2],
  good: { level: [3, 1, 4, 3, null, 1, 5], notes: { 0: 'max above −∞ ✓', 1: 'max 3 ✗', 2: 'max 3 ✓', 3: 'max 3 ✓', 5: 'max 4 ✗', 6: 'max 4 ✓' } },
  lcaBst: { level: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5] },
  rob: { level: [3, 4, 5, 1, 3, null, 1], notes: { 0: '(9, 8)', 1: '(4, 4)', 2: '(1, 5)', 3: '(0, 1)', 4: '(0, 3)', 6: '(0, 1)' } },
  flatten: { level: [1, 2, 5, 3, 4, null, 6], chain: [1, 2, 3, 4, 5, 6] },
};

// ---------- chapter puzzles ----------
export const invert = [
  step('invertTree(4) calls invertTree(2) and invertTree(7), and trusts both. What has invertTree(2) handed back?',
    treeRows(figures.invertBefore, { 1: 'left call', 2: 'right call' }, { 0: 'hot' }), 0, [
      ['Node 2 with its whole subtree mirrored: 3 now on its left, 1 on its right', 'Yes. The contract says invertTree returns its subtree, fully mirrored. You never trace inside the call; you rely on its promise, exactly as whoever called invertTree(4) relies on yours.'],
      ['Node 2 untouched: only the root swaps anything', 'Then only the top level flips and you get [4, 7, 2, 6, 9, 1, 3]: mirrored at the root, unmirrored below. Every call keeps the same promise, so every level flips.'],
      ['Nothing yet: you must first trace invertTree(1) and invertTree(3) by hand', 'That habit is what makes recursion feel endless. invertTree(2) handles its own children. Your only job at node 4 is to use what the two calls return.'],
    ]),
  step('Both calls are back: the left call returned the mirrored 2-subtree, the right call the mirrored 7-subtree. What does node 4 do now?',
    treeRows([4, 2, 7, 3, 1, 9, 6], { 1: 'mirrored', 2: 'mirrored' }, { 0: 'hot' }), 1, [
      ['Swap the values 2 and 7 and leave the children where they are', 'Values move, subtrees don’t: 7 would sit above 3 and 1, and 2 above 9 and 6. That is [4, 7, 2, 3, 1, 9, 6], with the wrong grandchildren under each value.'],
      ['Hang the mirrored 7-subtree on its left and the mirrored 2-subtree on its right, then return itself', 'Yes. Two pointer assignments, and the whole tree is [4, 7, 2, 9, 6, 3, 1]. Node 4 returns itself so its own caller can hang it.'],
      ['Call invertTree(4) once more, to be safe', 'Mirroring twice gives back the original. Each call does its one swap exactly once.'],
    ]),
  step('The Climber reaches the empty spot below leaf 1. What does invertTree(null) return?', [], 2, [
    ['A new node with value 0, so the parent has something to swap', 'That invents leaves: every real leaf would grow two zero children.'],
    ['It throws: callers should never pass null', 'Then every node must check both children before each call, which doubles the code. Making null the base case is what keeps the function a few lines long.'],
    ['null: an empty tree is already its own mirror', 'Yes. The base case is the smallest tree there is, and its answer needs no work at all.'],
  ]),
];

export const same = [
  step('p = [1, 2] and q = [1, null, 2]. Both roots hold 1. Now the left call compares p’s node 2 with q’s empty spot. What does it return?',
    [...treeRows(figures.sameP, {}, {}, 'p · depth'), ...treeRows(figures.sameQ, {}, {}, 'q · depth')], 0, [
      ['false: exactly one side is empty, so the shapes differ', 'Yes. Both-empty is the only empty case that matches. One-empty is a mismatch before any value is read.'],
      ['true: there is nothing on one side to disagree with', 'An empty spot facing a real node is the disagreement. If this returned true, [1, 2] and [1] would also count as the same tree.'],
      ['It depends on what the right children hold', 'Each call answers only for the pair it was handed. The right children get their own call; the left pair already differs.'],
    ]),
  step('Listing each tree root-first gives [1, 2] for p and [1, 2] for q. Are the trees the same?', [], 1, [
    ['Yes: same values in the same order', 'Two different shapes produce the same listing. Without markers for the empty spots, a listing forgets whether 2 hangs left or right.'],
    ['No: the listing dropped the empty spots, so it cannot see that 2 hangs on different sides', 'Yes. Walk the two trees together instead, or write a marker for every empty spot (Chapter 12 does exactly that).'],
  ]),
  step('Which check must run before the code reads p.val?', [], 0, [
    ['Both null → true; then exactly one null → false', 'Yes. Only after both nodes are known to exist is p.val safe to read.'],
    ['p.val != q.val → false', 'With p = null that line throws NullPointerException. Values come after the null checks.'],
    ['p.left == q.left', 'That compares object identity, not shape or values. Two separate trees never share nodes, so it is false even for identical trees.'],
  ]),
];

export const depth = [
  step('maxDepth(9) calls maxDepth on its two empty spots. Each returns 0. What does maxDepth(9) return?',
    treeRows(figures.depth.level, { 1: 'HERE' }, { 1: 'hot' }), 1, [
      ['0: it has no children', 'Depth counts nodes on the path, and 9 is a node. An empty tree has depth 0; a leaf has depth 1.'],
      ['1: the node itself, plus nothing below', 'Yes. 1 + max(0, 0) = 1.'],
      ['2: one for each empty child', 'Children combine with max, not +. Two empty children are worth max(0, 0) = 0.'],
    ]),
  step('maxDepth(9) returned 1 and maxDepth(20) returned 2. What does maxDepth(3) return?',
    treeRows(figures.depth.level, { 0: 'HERE', 1: 'said 1', 2: 'said 2' }, { 0: 'hot', 1: 'done', 2: 'done' }), 2, [
      ['4: 1 + 1 + 2', 'Adding both sides measures a path that goes down the left AND the right: it bends at the root. Depth follows one side only, the deeper one.'],
      ['2: max(1, 2)', 'That forgets the root itself. Every level adds its own node: 1 + max(left, right).'],
      ['3: 1 + max(1, 2)', 'Yes. The longest root-to-leaf path is 3 → 20 → 15 (or 7): three nodes.'],
    ]),
  step('Top-down instead: the Climber carries the depth of the node he stands on. At 3 he carries 1. What does he carry into 20?',
    treeRows(figures.depth.level, { 0: 'depth 1', 2: 'NEXT' }, { 2: 'hot' }), 0, [
      ['2: one more than his own', 'Yes. State that flows down is a parameter: visit(child, depth + 1). He updates the best depth he has seen at every node.'],
      ['1: depth only changes at leaves', 'Every step down is one level deeper, leaf or not.'],
      ['The 2 that 20 will report back', 'That is the bottom-up answer, which only exists after 20 returns. Top-down state goes into the call before anything below is known.'],
    ]),
];

export const balanced = [
  step('The root’s two children both have height 3. Is the tree balanced?',
    treeRows(figures.balanced.level, { 1: 'h 3', 2: 'h 3' }, { 0: 'hot' }), 1, [
      ['Yes: the root’s two sides differ by 0', 'The rule must hold at EVERY node. The left 2 has a left side of height 2 and a right side of height 0: a gap of 2.'],
      ['No: the left 2 has sides of height 2 and 0, a gap of 2', 'Yes. So does the right 2, mirrored. A tree can look perfectly even at the root and still lean badly below it.'],
    ]),
  step('height(left 2) heard 2 from its left child and 0 from its right. What does it report up?',
    treeRows(figures.balanced.level, { 1: 'HERE', 3: 'said 2' }, { 1: 'hot', 3: 'done' }), 2, [
      ['3: 1 + max(2, 0), and let the root decide', 'The root only compares its own two sides, 3 and 3, and would say yes. A broken subtree must say so itself.'],
      ['false', 'The function returns an int, a height. It needs a value that can never be a real height.'],
      ['−1: “broken”, a value no real height can take, which every ancestor passes straight up', 'Yes. The root sees −1 from the left and returns −1 at once, without even visiting the right side.'],
    ]),
  step('A simpler version calls a separate height() at every node and checks the gap. On a vine of n nodes, what does that cost?', [], 0, [
    ['O(n²): every node re-measures its whole subtree, n + (n − 1) + … + 1', 'Yes. On a balanced tree it is O(n log n). Returning the height and the verdict together does it in one O(n) pass.'],
    ['O(n): each node is checked once', 'Each node is checked once, but each check measures a whole subtree. Those measurements overlap.'],
    ['O(n log n): the tree halves each time', 'Only a balanced tree halves. A vine never does.'],
  ]),
];

const diamRows = (labels: Record<number, string>, tones: Record<number, CellTone>) => treeRows([1, 2, null, 3, 4, 5, null, null, 6], labels, tones);
export const diameter = [
  step('Node 2 hears from its children: the left reports 2, the right reports 2. What does node 2 report to its parent?',
    diamRows({ 1: 'HERE', 3: 'said 2', 4: 'said 2' }, { 1: 'hot', 3: 'done', 4: 'done' }), 1, [
      ['4: 2 + 2, the whole path through it', 'The parent can extend a path through only ONE child. A path that already bends at 2 would fork if the parent joined: 5–3–2–4–6 plus 1 is a Y, not a path.'],
      ['3: 1 + max(2, 2), the longest single arm it can offer', 'Yes. The report is a height: the longest straight path down from node 2, counted in nodes.'],
      ['5: 1 + 2 + 2', 'That counts the nodes of a bent path. It is neither a height nor a path length in edges.'],
    ]),
  step('Before reporting, node 2 looks at the gate board. Best holds 1 (from nodes 3 and 4). What does it write?',
    diamRows({ 1: 'HERE', 3: 'said 2', 4: 'said 2' }, { 1: 'hot', 3: 'done', 4: 'done' }), 0, [
      ['Best = max(1, 2 + 2) = 4: the path 5–3–2–4–6 bends here and has 4 edges', 'Yes. Left arm 2 edges, right arm 2 edges. The return value and the board record two different things.'],
      ['Best = max(1, 3): its height', 'The height is one arm. The longest path through node 2 uses both arms: 2 edges down the left plus 2 down the right.'],
      ['Nothing: only the root writes on the board', 'Then the 4-edge path, which never touches the root, is lost. Every node is a possible bend.'],
    ]),
  step('The root receives left = 3 and right = 0. Its own bend is 3, so Best stays 4, and it returns 1 + max(3, 0) = 4. The root’s call is over. What is the diameter?',
    diamRows({ 0: 'returns 4', 1: 'said 3' }, { 0: 'hot', 1: 'done' }), 2, [
      ['3: left + right at the root', 'That is only the longest path that passes through the root. The longest path bends at node 2.'],
      ['Whatever the root returns: 4', 'The root returns its height. It equals Best here by coincidence; on the eight-node tree in the figure the root returns 5 while the diameter is 6. Read the board, not the return value.'],
      ['Whatever Best holds: 4', 'Yes. When the recursion ends, the return value is a height and the board is the answer. Say both out loud before you write the code.'],
    ]),
];

export const maxPath = [
  step('gain(15) = 15 and gain(7) = 7. At node 20, what goes on the gate board?',
    treeRows(figures.maxPath.level, { 2: 'HERE', 5: 'gain 15', 6: 'gain 7' }, { 2: 'hot', 5: 'done', 6: 'done' }), 1, [
      ['20 + 15 = 35', 'That is what 20 reports up: one arm. The board takes the bend, which may use both arms.'],
      ['20 + 15 + 7 = 42: the path 15–20–7 bends here', 'Yes. Best becomes 42.'],
      ['−10 + 20 + 15 + 7 = 32', 'A path through −10 and both of 20’s children would meet 20 from three directions: a fork, not a path.'],
    ]),
  step('Now a tiny tree, [2, −1]. gain(−1) returns −1. What does node 2 use for its left arm?',
    treeRows([2, -1], { 1: 'gain −1' }, { 0: 'hot' }), 0, [
      ['0: max(0, −1). A losing arm is left behind', 'Yes. The best path here is [2] alone, so the answer is 2. Taking the −1 would give 1.'],
      ['−1: every child must be included', 'A path may stop anywhere. Dragging a negative arm along only lowers the sum.'],
      ['Skip node 2 instead', 'Node 2 is positive; it is the arm that loses. Clamp the arm, not the node.'],
    ]),
  step('Back to [−10, 9, 20, null, null, 15, 7]. At −10: left gain 9, right gain 35, so its bend is −10 + 9 + 35 = 34. The board holds 42. The root returns −10 + 35 = 25. Answer?',
    treeRows(figures.maxPath.level, { 0: 'returns 25', 1: 'gain 9', 2: 'gain 35' }, { 0: 'hot' }), 2, [
      ['34: the bend at the root', 'The root’s bend is just one candidate. 42, written at node 20, is bigger.'],
      ['25: what the root returns', 'The return value is a gain: the best path that starts at the root and goes down one side. The answer is on the board.'],
      ['42: the board', 'Yes. The path 15–20–7 never touches the root.'],
    ]),
];

export const lca = [
  step('p = 6, q = 4. At node 2, the left call (7) returns null and the right call returns 4. What does node 2 return?',
    treeRows(figures.lca.level, { 3: 'p', 10: 'q', 4: 'HERE' }, { 4: 'hot', 3: 'done', 10: 'done' }), 2, [
      ['2: one of its children found something', 'Node 2 is an ancestor of q only. It becomes the answer only when p and q turn up on different sides, or when it is p or q itself.'],
      ['null: only one of the two was found', 'Then node 5 would never learn that q is below it, and would wrongly report only p.'],
      ['4: it passes up whatever was found', 'Yes. The contract: return p or q if exactly one is below, the meeting point if both are, null if neither.'],
    ]),
  step('At node 5, the left call returned 6 and the right call returned 4. What does node 5 return?',
    treeRows(figures.lca.level, { 1: 'HERE', 3: 'said 6', 4: 'said 4' }, { 1: 'hot', 3: 'done', 4: 'done' }), 0, [
      ['5: one on each side, so this is the lowest meeting point', 'Yes. Every ancestor above sees 5 come up one side and null the other, and passes 5 along unchanged.'],
      ['6: the first one found', 'Then the answer would claim 6 is an ancestor of 4. It isn’t.'],
      ['Keep going: the root decides', 'The root sees only “5 from the left, null from the right”. The first node to see both sides is the lowest common ancestor; nobody above can do better.'],
    ]),
  step('Now p = 5 and q = 4. The search reaches node 5 and returns at once, without looking below. Is the answer still right?',
    treeRows(figures.lca.level, { 1: 'p', 10: 'q' }, { 1: 'hot', 10: 'done' }), 1, [
      ['No: it never confirmed that 4 is below 5', 'Both nodes are promised to exist. If q were outside 5’s subtree, another call would find it and the meeting point would be higher. Nothing else turns up, so q must be below p.'],
      ['Yes: the root’s right side returns null, so 5 rises to the top, and p really is the ancestor of q', 'Yes. This shortcut is only safe because the problem promises both nodes exist. If q might be missing, you must count what you find.'],
    ]),
];

export const pathSum = [
  step('Target 22. The Climber stands on 11 with path [5, 4, 11] and 22 − 5 − 4 − 11 = 2 still to find. He steps right onto leaf 2. What does he record?',
    treeRows(figures.pathSum.level, { 3: 'left 2', 8: 'HERE' }, { 0: 'done', 1: 'done', 3: 'done', 8: 'hot' }), 1, [
      ['The path list itself', 'That list keeps changing as he climbs up and down other branches; when the walk ends it is empty, and so is every “answer” that points to it. Store a copy.'],
      ['A copy of [5, 4, 11, 2]: nothing is left to find, and 2 is a leaf', 'Yes. new ArrayList<>(path). The second answer, [5, 8, 4, 5], turns up later on the right.'],
      ['Nothing yet: wait until the whole tree is walked', 'The path exists only now. Once he steps back up, the 2 is removed.'],
    ]),
  step('He finishes 11’s subtree and climbs back to 4. What must happen to the path?',
    treeRows(figures.pathSum.level, { 1: 'back here' }, { 1: 'hot', 3: 'done' }), 0, [
      ['11 comes off the end, so the path is [5, 4] again', 'Yes. Every add on the way down has exactly one remove on the way up: path.remove(path.size() − 1) as the call ends.'],
      ['Nothing: the path will be overwritten', 'It is never overwritten, only appended to. Without the removal, the right side of the tree would see [5, 4, 11, 8, …]: nodes from a branch it is not on.'],
    ]),
  step('A shortcut: check “nothing left to find” when the Climber steps onto an EMPTY spot instead of at a leaf. Tree [1, 2], target 1. What goes wrong?',
    treeRows([1, 2], { 0: 'left 0' }, { 0: 'hot' }), 2, [
      ['Nothing: empty spots are where paths end', 'They are where branches end, not where root-to-leaf paths end. Node 1 is not a leaf.'],
      ['It records [1, 2]', '[1, 2] sums to 3, so nothing at node 2 matches.'],
      ['1 has no right child, and at that empty spot nothing is left to find, so it records [1] — but 1 is not a leaf. (Real leaves get recorded twice, once per empty child.)', 'Yes. Check at the leaf itself: node.left == null && node.right == null.'],
    ]),
];

export const validate = [
  step('Going LEFT from 5 into 4. 5’s window is (−∞, +∞). What is 4’s window?',
    treeRows(figures.validate.level, { 0: '(−∞, +∞)', 1: 'NEXT' }, { 1: 'hot' }), 0, [
      ['(−∞, 5): the ceiling drops to the parent', 'Yes. Everything in 5’s left subtree must be below 5. The floor is inherited unchanged.'],
      ['(5, +∞)', 'That is the window for the RIGHT child. Left children must be smaller.'],
      ['(−∞, +∞), unchanged', 'Then 4 could be 9 and nothing would complain.'],
    ]),
  step('Going LEFT from 6 into 3. 6’s window is (5, +∞). What is 3’s window, and does 3 fit?',
    treeRows(figures.validate.level, { 2: '(5, +∞)', 5: 'NEXT' }, { 5: 'hot' }), 2, [
      ['(−∞, 6): 3 fits', 'Comparing with the parent only forgets that 3 is also in 5’s RIGHT subtree, so it must be above 5. Every parent–child pair here looks fine, and the tree is still wrong.'],
      ['(5, +∞): 3 fits', 'Going left must lower the ceiling to 6. And 3 is below the floor anyway.'],
      ['(5, 6): 3 is below the floor 5, so this is not a BST', 'Yes. The floor 5 was inherited from two levels up. Bounds carry the whole ancestry in two numbers.'],
    ]),
  step('A single node with value 2147483647 (Integer.MAX_VALUE). The bounds start as ints, (Integer.MIN_VALUE, Integer.MAX_VALUE), compared strictly. Result?', [], 1, [
    ['true: a single node is always a BST', 'True in theory, but this code says otherwise: 2147483647 < Integer.MAX_VALUE is false, so it reports false.'],
    ['false, which is wrong: the value is not strictly below the ceiling. Use long bounds, or null for “no bound”', 'Yes. LeetCode includes exactly this test. Long.MIN_VALUE and Long.MAX_VALUE sit outside every int.'],
    ['An overflow exception', 'Java ints never throw on overflow, and nothing overflows here. The comparison is simply false.'],
  ]),
];

export const kth = [
  step('k = 3. The Basket is empty and cur = 5. What is the first move?',
    treeRows(figures.kth.level, { 0: 'cur' }, { 0: 'hot' }), 1, [
      ['Visit 5 and count it', 'Visiting before the left subtree is root-first order. 5 is the 5th smallest, not the 1st.'],
      ['Push 5 and step left, and keep pushing: 5, 3, 2, 1. Then pop 1, the smallest', 'Yes. The smallest value is at the end of the left chain, and every node on the way waits in the basket until its left side is done.'],
      ['Pop', 'The basket is empty. You pop only when cur has run off the bottom of a left chain.'],
    ]),
  step('You popped 1 (visit #1), then 2 (visit #2). The basket holds 5 and 3 (3 on top), and cur is 2’s right child: null. Next?',
    treeRows(figures.kth.level, { 7: '#1', 3: '#2', 1: 'top', 0: 'basket' }, { 7: 'done', 3: 'done', 1: 'hot' }), 0, [
      ['Pop 3: visit #3, so the answer is 3', 'Yes. Popping always gives the smallest value not yet visited. Stop the moment the count reaches k.'],
      ['Push 4', 'cur is null. 4 is 3’s right child; you step there only after visiting 3.'],
      ['Answer 4', '4 is the 4th smallest. 3 has not been visited yet, and it is smaller.'],
    ]),
  step('How much work did k = 3 cost on this tree?', [], 2, [
    ['O(n): an in-order walk always visits every node', 'Only if you never stop. Stopping at the k-th visit leaves 4, 5 and 6 untouched here.'],
    ['O(log n), always', 'Only on a balanced tree, and only for small k. On a vine the left chain alone is n nodes long.'],
    ['O(h + k): the left chain down to the minimum, then k pops', 'Yes. 4 pushes (5, 3, 2, 1) and 3 pops. Space is O(h) for the basket.'],
  ]),
];

export const build = [
  step('preorder = [3, 9, 20, 15, 7], inorder = [9, 3, 15, 20, 7]. Which value is the root?',
    [row('preorder', figures.build.pre, { 0: 'next' }, { tones: { 0: 'hot' } }), row('inorder', figures.build.inorder)], 0, [
      ['3: root-first order lists the root before anything else', 'Yes. Every subtree’s root is the first unused preorder value when you start building that subtree.'],
      ['9: inorder lists it first', 'Inorder starts with the leftmost node, which is the root only when the root has no left child.'],
      ['20: the middle of preorder', 'Preorder has no meaningful middle. Inorder is the list that splits around the root.'],
    ]),
  step('3 sits at index 1 of inorder. What does that tell you?',
    [row('preorder', figures.build.pre, { 0: 'root' }, { tones: { 0: 'done' } }), row('inorder', figures.build.inorder, { 1: 'root' }, { tones: { 0: 'hot', 2: 'hot', 3: 'hot', 4: 'hot' } })], 1, [
      ['9 is 3’s parent', '3 is the root, so it has no parent. Inorder positions say left-of or right-of, not parent-of.'],
      ['Everything left of index 1, [9], is the left subtree; everything right, [15, 20, 7], is the right subtree', 'Yes. Inorder is left part, root, right part, so the root’s position splits the list and tells you each subtree’s size.'],
      ['The tree has depth 2', 'Its depth is 3 (3 → 20 → 15). The split gives subtree sizes, not depths.'],
    ]),
  step('Root 3 is built, and the next unused preorder value is 9. Which subtree do you build next?', [], 0, [
    ['The left one: preorder lists the whole left subtree before the right', 'Yes. Build left first, and the shared “next” index walks preorder in exactly the order it was written.'],
    ['The right one: 20 is larger', 'This is not a search tree; sizes mean nothing. Build the right side first and 9 becomes the right child’s root, which is wrong.'],
    ['Either: they are independent', 'They are independent in inorder, but both read from one preorder cursor. Order matters.'],
  ]),
];

export const serialize = [
  step('Writing the tree root-first. You reach node 2, a leaf. What gets written for it?',
    treeRows(figures.serialize.level, { 1: 'HERE' }, { 1: 'hot', 0: 'done' }), 1, [
      ['2', 'Dropping the empty spots loses the shape. Reading back, nobody would know whether 3 is 2’s child or 1’s.'],
      ['2,#,#', 'Yes. The value, then a marker for each empty child. A leaf always costs three tokens.'],
      ['#,2,#', 'That is left-node-right order. Then the reader cannot know the root first, and the string becomes ambiguous.'],
    ]),
  step('Reading “1,2,#,#,3,4,#,#,5,#,#”. You have built 1, then 2, then read two #s. Which value comes next, and where does it go?',
    treeRows(figures.serialize.level, { 0: 'built', 1: 'built' }, { 0: 'done', 1: 'done', 2: 'hot' }), 0, [
      ['3, as the right child of 1', 'Yes. The two #s finished node 2 (both children empty), so its call returns and node 1’s next job is its right child.'],
      ['3, as the left child of 2', '2’s left child was the first # after it. That spot is closed.'],
      ['3, as the right child of 2', '2’s right child was the second #. Both of 2’s spots are already filled with “empty”.'],
    ]),
  step('Rebuilding from preorder alone was impossible in Chapter 11. Why is this one string enough?', [], 2, [
    ['Because the values are unique', 'Uniqueness doesn’t help: [1, 2] and [1, null, 2] are both listed as 1, 2. And this codec works with duplicate values.'],
    ['Because commas separate the numbers', 'Commas only split tokens. Without # markers the shape is still lost.'],
    ['Because each # says exactly where a subtree ends, so the reader always knows when to stop going down', 'Yes. Markers turn the listing into a complete set of instructions: one token per node and one per empty spot.'],
  ]),
];

export const mixedReview = [
  step('“Longest path between any two nodes, counted in edges.” What does your helper return, and where is the answer?', [], 1, [
    ['Return the longest path through the node; the root’s value is the answer', 'A path through a node can’t be extended by its parent, so returning it breaks the parent’s math. And the best bend may be far below the root.'],
    ['Return the height; update a separate best with left + right at every node', 'Yes. The single most important tree idea: return one thing (the arm) and record another (the bend).'],
    ['Visit nodes level by level and count the levels', 'That measures depth, not the longest path between two nodes. The longest path can bend anywhere.'],
  ]),
  step('“Is this binary tree a valid search tree?” The first line you write is…', [], 2, [
    ['compare each node with its two children', 'Local checks pass on [5, 4, 6, null, null, 3, 7], which is invalid: 3 sits in 5’s right subtree.'],
    ['an in-order walk that sorts the values, then compare', 'Sorting destroys the evidence. In-order works only if you check that values come out strictly increasing as you walk.'],
    ['valid(node, low, high): pass a window down, tighten the ceiling going left and the floor going right', 'Yes. Long bounds (or null for “none”) so Integer.MIN_VALUE and MAX_VALUE are handled.'],
  ]),
  step('“All root-to-leaf paths whose values sum to target.” Which shape fits?', [], 0, [
    ['Carry the remaining sum and the path down; record a copy at a leaf; remove the node on the way back up', 'Yes. State flows down as parameters, and the shared path list is undone on the way up.'],
    ['Return the sum of each subtree and compare at the root', 'Subtree sums mix many paths together. The question is about one path at a time, from the root.'],
    ['Return the height and update a global', 'That is the shape for “longest path anywhere”. This question is about root-to-leaf paths, which the Climber carries down.'],
  ]),
  step('“The k-th smallest value in a binary search tree.” The move?', [], 1, [
    ['Collect every value into a heap and pop k times', 'Correct but wasteful: O(n log n) or O(n + k log n). The tree already knows the sorted order.'],
    ['Walk in order (left, node, right) with a stack, and stop at the k-th visit', 'Yes. In-order of a BST is sorted. O(h + k) time, O(h) space.'],
    ['Go right k times from the root', 'Right goes toward larger values, and the root isn’t the smallest anything.'],
  ]),
  step('A tree of a million nodes. You need the depth of the SHALLOWEST leaf, and some leaf sits at depth 3.', [], 2, [
    ['Climb every path down, take the minimum', 'Correct, but it may explore every deep branch, a million nodes, before seeing the leaf at depth 3.'],
    ['Return 1 + min(left, right) from each node', 'Wrong on any node with one empty child: an empty spot is not a leaf. And it still visits everything.'],
    ['Go level by level with a queue and stop at the first leaf', 'Yes. Another tool fits better: a row-by-row walk stops at the first leaf it meets, having touched only the first three rows.'],
  ]),
  step('“Maximum path sum”, and every value is negative. What do you start the best at?', [], 0, [
    ['Integer.MIN_VALUE (or the root’s value): the answer can be negative', 'Yes. With [−3] the answer is −3. Starting at 0 would claim a path that doesn’t exist.'],
    ['0: an empty path sums to 0', 'The path must contain at least one node. [−3] would return 0.'],
    ['Long.MAX_VALUE', 'Then max() never improves it, and every answer is wrong.'],
  ]),
  step('Your recursive solution is right, but the tree is a vine 200,000 nodes deep. The risk?', [], 1, [
    ['None: recursion is O(n) time', 'Time is fine. Space is O(h), and h = 200,000 here: that many stack frames.'],
    ['StackOverflowError: switch to an explicit stack (iterative walk)', 'Yes. Java does not optimise tail calls, and its default thread stack typically holds thousands to tens of thousands of frames, not hundreds of thousands. An explicit Deque lives on the heap.'],
    ['Integer overflow in the depth counter', 'A depth of 200,000 fits easily in an int.'],
  ]),
  step('“Rebuild the tree from its root-first listing and its left-node-right listing.” The key move?', [], 2, [
    ['Insert every value into a search tree', 'The tree isn’t a search tree; inserting by value builds the wrong shape.'],
    ['Pair the two listings index by index', 'The two listings don’t line up position by position (except by accident).'],
    ['The next unused root-first value is the root; its position in the other listing splits left from right. Keep a value → index map', 'Yes. O(n) with the map. Build the left subtree first.'],
  ]),
  step('“Rob houses on a tree; never two directly connected.” What does each call return?', [], 0, [
    ['A pair: the best total if this node is robbed, and the best if it is skipped', 'Yes. One number can’t carry both futures; a pair lets the parent choose. O(n).'],
    ['The best total for its subtree', 'The parent needs to know whether that best used the child itself. One number loses that.'],
    ['Alternate levels: rob all even depths or all odd depths', 'Try [4, 1, null, 2, null, 3]: levels give 4 + 2 = 6 or 1 + 3 = 4, but 4 + 3 = 7 is allowed.'],
  ]),
  step('“Lowest common ancestor of p and q” in a binary SEARCH tree. Fastest move?', [], 1, [
    ['The general version: search both sides, combine', 'Correct, but O(n). The ordering lets you skip whole subtrees.'],
    ['From the root: both smaller → go left; both larger → go right; otherwise stop here', 'Yes. O(h) time, O(1) space with a loop.'],
    ['Walk in order and take the value between p and q', 'Many values can sit between p and q. The LCA is where their paths split, which in-order position doesn’t tell you.'],
  ]),
];
