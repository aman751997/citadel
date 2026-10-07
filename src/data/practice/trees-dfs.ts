// Independent practice for the Trees (DFS) lesson. Prompts never name the pattern; inputs vary with `variant`.
// Trees are given in LeetCode's level-order form, e.g. [3, 9, 20, null, null, 15, 7].
import type { Challenge, PracticeSet } from '../../lib/practice.ts';
import { parseLevel, type Level } from '../trees-dfs/traces.ts';

export const strategies = {
  pair: 'Walk two trees (or two sides of one tree) together, node by node',
  up: 'Combine what each child reports, and return one value up',
  upBest: 'Return one value up, and record the answer separately at every node',
  down: 'Carry state down to each child as parameters',
  sorted: 'Use the ordering: walk in sorted order, or steer left or right by value',
  rebuild: 'Rebuild the tree from listings, one root at a time',
  other: 'Another tool fits better: go row by row with a queue',
} as const;

export const conceptIds = [
  'invert', 'same', 'depth', 'balanced', 'diameter', 'max-path', 'lca', 'path-sum', 'validate', 'kth',
  'build', 'serialize', 'symmetric', 'subtree', 'good-nodes', 'lca-bst', 'rob', 'flatten', 'right-view',
] as const;
type ConceptId = typeof conceptIds[number];

const FORMAT = 'Trees are written level by level, left to right, with null for an empty spot (LeetCode style).';

// ---------- a small object tree, built from level order ----------
interface N { val: number; left: N | null; right: N | null }
function tree(level: Level): N | null {
  const nodes = parseLevel(level);
  const made = new Map<number, N>(nodes.map(n => [n.key, { val: n.val, left: null, right: null }]));
  for (const n of nodes) {
    const me = made.get(n.key)!;
    if (n.left !== -1) me.left = made.get(n.left)!;
    if (n.right !== -1) me.right = made.get(n.right)!;
  }
  return made.get(0) ?? null;
}
const lv = (level: Level) => `[${level.map(v => (v === null ? 'null' : String(v))).join(', ')}]`;
const list = (a: number[]) => `[${a.join(', ')}]`;
const shift = (level: Level, by: number): Level => level.map(v => (v === null ? null : v + by));
const scale = (level: Level, by: number): Level => level.map(v => (v === null ? null : v * by));
const pre = (t: N | null): number[] => (t ? [t.val, ...pre(t.left), ...pre(t.right)] : []);
const ino = (t: N | null): number[] => (t ? [...ino(t.left), t.val, ...ino(t.right)] : []);
const post = (t: N | null): number[] => (t ? [...post(t.left), ...post(t.right), t.val] : []);
const height = (t: N | null): number => (t ? 1 + Math.max(height(t.left), height(t.right)) : 0);
const mirror = (t: N | null): N | null => (t ? { val: t.val, left: mirror(t.right), right: mirror(t.left) } : null);
const same = (a: N | null, b: N | null): boolean => (!a || !b ? a === b : a.val === b.val && same(a.left, b.left) && same(a.right, b.right));
const all = (t: N | null): N[] => (t ? [t, ...all(t.left), ...all(t.right)] : []);
function balanced(t: N | null): boolean { return !t || (Math.abs(height(t.left) - height(t.right)) <= 1 && balanced(t.left) && balanced(t.right)); }
function diameter(t: N | null): number { return t ? Math.max(height(t.left) + height(t.right), diameter(t.left), diameter(t.right)) : 0; }
function down(t: N | null): number { return t ? t.val + Math.max(0, down(t.left), down(t.right)) : 0; }
function maxPath(t: N): number {
  let best = t.val + Math.max(0, down(t.left)) + Math.max(0, down(t.right));
  if (t.left) best = Math.max(best, maxPath(t.left));
  if (t.right) best = Math.max(best, maxPath(t.right));
  return best;
}
function contains(t: N | null, v: number): boolean { return !!t && (t.val === v || contains(t.left, v) || contains(t.right, v)); }
function lca(t: N, p: number, q: number): number {
  for (const child of [t.left, t.right]) if (child && contains(child, p) && contains(child, q)) return lca(child, p, q);
  return t.val;
}
function rootToLeaf(t: N | null, path: number[] = []): number[][] {
  if (!t) return [];
  const here = [...path, t.val];
  if (!t.left && !t.right) return [here];
  return [...rootToLeaf(t.left, here), ...rootToLeaf(t.right, here)];
}
function validBST(t: N | null, lo = -Infinity, hi = Infinity): boolean { return !t || (t.val > lo && t.val < hi && validBST(t.left, lo, t.val) && validBST(t.right, t.val, hi)); }
function good(t: N | null, maxAbove = -Infinity): number { return t ? (t.val >= maxAbove ? 1 : 0) + good(t.left, Math.max(maxAbove, t.val)) + good(t.right, Math.max(maxAbove, t.val)) : 0; }
function rob(t: N | null): [number, number] {
  if (!t) return [0, 0];
  const l = rob(t.left), r = rob(t.right);
  return [Math.max(...l) + Math.max(...r), t.val + l[0] + r[0]];
}
function serial(t: N | null): string { return t ? `${t.val},${serial(t.left)},${serial(t.right)}` : '#'; }
function rightView(t: N | null): number[] {
  const out: number[] = [];
  let row = t ? [t] : [];
  while (row.length) { out.push(row[row.length - 1].val); row = row.flatMap(n => [n.left, n.right].filter((c): c is N => !!c)); }
  return out;
}

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  const pick = <T,>(xs: T[]) => xs[v % xs.length];
  const round = Math.floor(v / 5) % 4;                    // a second, slower knob
  switch (id) {
    case 'invert': {
      const level = shift(pick<Level>([[4, 2, 7, 1, 3, 6, 9], [2, 1, 3], [1, 2, null, 3], [5, 3, 8, 1, 4, null, 9], [6, 2, 8, null, 4, 7]]), round * 10);
      const answer = pre(mirror(tree(level)));
      return {
        topic: 'Mirror a tree', section: 'invert', strategy: 'up',
        prompt: `Swap the left and right child of every node in the tree ${lv(level)}. Then list the values node first: each node, then everything in its (new) left part, then everything in its (new) right part. ${FORMAT}`,
        question: 'Enter the listing.', answer,
        hints: ['What should a function that mirrors a subtree return, and can you trust it for both children?', 'Mirror both children first, then hang them on swapped sides.', 'An empty tree mirrors to itself. Save both results before assigning either pointer.'],
        rubric: ['The function promises a fully mirrored subtree and the code trusts that promise for each child.', 'Base case: null returns null.', 'O(n) time, O(h) stack space.'],
        explanation: `The mirrored tree, listed node first, is ${list(answer)}.`,
      };
    }
    case 'same': {
      const pairs: [Level, Level][] = [[[1, 2, 3], [1, 2, 3]], [[1, 2], [1, null, 2]], [[1, 2, 1], [1, 1, 2]], [[3, 4, 5, 1, 2], [3, 4, 5, 1, 2]], [[3, 4, 5, 1, null, 2], [3, 4, 5, 1, 2]]];
      const [a, b] = pick(pairs).map(l => shift(l, round)) as [Level, Level];
      const answer = same(tree(a), tree(b));
      return {
        topic: 'Identical trees', section: 'same-tree', strategy: 'pair',
        prompt: `Are the trees ${lv(a)} and ${lv(b)} identical: the same shape, with the same value at every position? ${FORMAT}`,
        question: 'Enter yes or no.', answer,
        hints: ['Two trees match when their roots match and both pairs of subtrees match.', 'Deal with empty spots before reading any values.', 'Both empty: match. Exactly one empty: no match. Then compare values and both sides.'],
        rubric: ['Both-null and one-null cases come before reading values.', 'Comparing value listings without empty-spot markers is not enough: shapes can differ.', 'O(min(m, n)) time: it stops at the first difference.'],
        explanation: answer ? 'Every position matches.' : 'Somewhere a value or an empty spot differs.',
      };
    }
    case 'depth': {
      const level = pick<Level>([[3, 9, 20, null, null, 15, 7], [1, null, 2], [1, 2, 3, 4, null, null, 5, 6], [7], [1, 2, null, 3, null, 4, null, 5], [2, 1, 3, null, null, null, 4, null, 5, 6]]);
      const answer = height(tree(level));
      return {
        topic: 'How tall is the tree?', section: 'max-depth', strategy: 'up',
        prompt: `How many nodes lie on the longest path from the root of ${lv(level)} down to a leaf? ${FORMAT}`,
        question: 'Enter the number of nodes.', answer,
        hints: ['If you knew the answer for both subtrees, what is it for the whole tree?', 'An empty tree contributes 0.', 'One for this node plus the larger of the two sides.'],
        rubric: ['height(null) = 0; height(node) = 1 + max(left, right).', 'Children combine with max, not with +.', 'O(n) time, O(h) space.'],
        explanation: `The longest root-to-leaf path has ${answer} node(s).`,
      };
    }
    case 'balanced': {
      const level = shift(pick<Level>([[3, 9, 20, null, null, 15, 7], [1, 2, 2, 3, 3, null, null, 4, 4], [1, 2, 2, 3, null, null, 3, 4, null, null, 4], [1, 2, 3, 4, 5, 6, null, 8], [1, null, 2, null, 3], [1]]), round);
      const answer = balanced(tree(level));
      return {
        topic: 'Even on every branch', section: 'balanced', strategy: 'up',
        prompt: `In ${lv(level)}, does EVERY node have a left side and a right side whose heights differ by at most 1? (Height = nodes on the longest downward path; an empty side has height 0.) ${FORMAT}`,
        question: 'Enter yes or no.', answer,
        hints: ['Each node needs its children’s heights to check itself. Could one pass return both height and verdict?', 'Return the height, or a value no height can take when something below is broken.', 'Return −1 as soon as either child returns −1 or the gap exceeds 1.'],
        rubric: ['The check holds at every node, not just the root.', 'Height and verdict travel up together (−1 = broken).', 'O(n) time; re-measuring heights at every node is O(n²) on a vine.'],
        explanation: answer ? 'Every node’s two sides differ by at most 1.' : 'At least one node has sides whose heights differ by 2 or more.',
      };
    }
    case 'diameter': {
      const level = pick<Level>([[1, 2, 3, 4, 5], [1, 2], [1, 2, null, 3, 4, 5, null, null, 6], [1, 2, null, 3, 4, 5, null, null, 6, 7, null, null, 8], [1], [1, 2, 3, null, 4, null, 5, null, 6]]);
      const answer = diameter(tree(level));
      return {
        topic: 'The longest path anywhere', section: 'diameter', strategy: 'upBest',
        prompt: `How many edges are on the longest path between any two nodes of ${lv(level)}? The path need not pass through the root. ${FORMAT}`,
        question: 'Enter the number of edges.', answer,
        hints: ['Every path has a highest node where it bends. What is the path’s length in terms of that node’s two sides?', 'Return a height upward, but write the bend (left + right) somewhere else.', 'best = max(best, left + right) at every node; return 1 + max(left, right).'],
        rubric: ['The return value is a height; the answer is a separate best-so-far.', 'Every node is a possible bend, not only the root.', 'O(n) time, O(h) space.'],
        explanation: `The longest path has ${answer} edge(s).`,
      };
    }
    case 'max-path': {
      const base = pick<Level>([[1, 2, 3], [-10, 9, 20, null, null, 15, 7], [-3], [2, -1], [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], [-2, -1, -4]]);
      const level = scale(base, [1, 2, 3, -1][round]);
      const answer = maxPath(tree(level)!);
      return {
        topic: 'Best sum along any path', section: 'max-path-sum', strategy: 'upBest',
        prompt: `A path in ${lv(level)} is any sequence of connected nodes, each used at most once, with at least one node; it need not pass through the root. What is the largest possible sum of values on a path? ${FORMAT}`,
        question: 'Enter the sum.', answer,
        hints: ['Every path bends at one highest node. What could each side contribute to that bend?', 'A side that would lower the sum can be dropped: it contributes 0.', 'Return node.val + max(0, best side) upward; record node.val + both non-negative sides as a candidate. Start the record at the smallest int.'],
        rubric: ['Each node returns the best downward arm and updates a separate best with the bend.', 'Negative arms are clamped to 0.', 'The record starts at Integer.MIN_VALUE, so all-negative trees work. O(n).'],
        explanation: `The best path sums to ${answer}.`,
      };
    }
    case 'lca': {
      const level: Level = [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4];
      const [p, q] = pick<[number, number]>([[5, 1], [5, 4], [6, 4], [7, 8], [0, 8], [7, 4], [6, 2]]);
      const answer = lca(tree(level)!, p, q);
      return {
        topic: 'Where two branches meet', section: 'lca', strategy: 'up',
        prompt: `In ${lv(level)}, which node is the deepest one that has both ${p} and ${q} in its subtree? (A node counts as being in its own subtree.) ${FORMAT}`,
        question: 'Enter its value.', answer,
        hints: ['Ask each subtree what it found: p, q, both, or nothing.', 'A node that is p or q can report itself without looking further.', 'If both sides report something, this node is the meeting point; otherwise pass up whichever side found something.'],
        rubric: ['Return p, q, the meeting point, or null.', 'The first node to see results from both sides is the answer.', 'O(n) time, O(h) space; it relies on both nodes existing.'],
        explanation: `${p} and ${q} meet first at ${answer}.`,
      };
    }
    case 'path-sum': {
      const [base, target] = pick<[Level, number]>([[[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1], 22], [[1, 2, 3], 4], [[1, 2, 3], 5], [[0, 1, 1], 1], [[1, -2, -3, 1, 3, -2, null, -1], -1], [[10, 5, -3, 3, 2, null, 11, 3, -2, null, 1], 18]]);
      const m = [1, 2, 1, 3][round];
      const level = scale(base, m);
      const answer = rootToLeaf(tree(level)).filter(p => p.reduce((s, x) => s + x, 0) === target * m).length;
      return {
        topic: 'Root-to-leaf totals', section: 'path-sum-ii', strategy: 'down',
        prompt: `How many paths from the root of ${lv(level)} down to a LEAF have values adding up to exactly ${target * m}? ${FORMAT}`,
        question: 'Enter the number of paths.', answer,
        hints: ['What does the walker need to carry down to know, at a leaf, whether the path works?', 'Carry the amount still to find; subtract each node’s value on the way down.', 'Count only at real leaves (no children) where nothing is left to find. If you list the paths, undo each step on the way back up.'],
        rubric: ['State (remaining sum, the path) flows down as parameters.', 'The check happens at leaves, not at empty spots.', 'O(n) to count; listing paths costs up to O(n · h) for the copies.'],
        explanation: `${answer} root-to-leaf path(s) total ${target * m}.`,
      };
    }
    case 'validate': {
      const level = shift(pick<Level>([[2, 1, 3], [5, 1, 4, null, null, 3, 6], [5, 4, 6, null, null, 3, 7], [2, 2, 2], [8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13], [3, 1, 5, 0, 2, 4, 6], [10, 5, 15, null, null, 6, 20]]), round * 3);
      const answer = validBST(tree(level));
      return {
        topic: 'Is the order kept everywhere?', section: 'validate-bst', strategy: 'down',
        prompt: `In ${lv(level)}, is it true that for EVERY node, all values in its left part are strictly smaller and all values in its right part are strictly larger? ${FORMAT}`,
        question: 'Enter yes or no.', answer,
        hints: ['Checking each node against its parent only is not enough. What does a node inherit from all its ancestors?', 'Each node must fit inside a window (low, high).', 'Going left, the ceiling becomes the parent’s value; going right, the floor does. Use wide (long or null) bounds.'],
        rubric: ['A (low, high) window is passed down and tightened at each step.', 'Strict comparisons: duplicates are invalid.', 'O(n) time, O(h) space; bounds wider than int handle extreme values.'],
        explanation: answer ? 'Every value fits the window its ancestors give it.' : 'Some value breaks a bound inherited from an ancestor (or equals one).',
      };
    }
    case 'kth': {
      const level = shift(pick<Level>([[5, 3, 6, 2, 4, null, null, 1], [3, 1, 4, null, 2], [8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]]), round * 5);
      const values = ino(tree(level));
      const k = 1 + (Math.floor(v / 3) % values.length);
      const answer = values[k - 1];
      return {
        topic: 'The k-th smallest', section: 'kth-smallest', strategy: 'sorted',
        prompt: `${lv(level)} is a search tree: left parts are smaller, right parts larger. What is its ${k}${k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'} smallest value? Try not to look at more nodes than you need. ${FORMAT}`,
        question: 'Enter the value.', answer,
        hints: ['Which visiting order produces a search tree’s values in sorted order?', 'Left part, node, right part. Count the nodes as you visit them.', 'Walk it with your own stack (push the left chain, pop, go right) and stop at the k-th pop.'],
        rubric: ['Left-node-right order of a search tree is sorted.', 'Stop at the k-th visit instead of collecting everything.', 'O(h + k) time, O(h) space.'],
        explanation: `In sorted order the values are ${list(values)}; the ${k}-th is ${answer}.`,
      };
    }
    case 'build': {
      const level = shift(pick<Level>([[3, 9, 20, null, null, 15, 7], [1, 2, 3, 4, 5, 6, 7], [1, 2, null, 3, null, 4], [4, 2, 6, 1, 3, 5, 7], [1, null, 2, 3]]), round * 10);
      const t = tree(level);
      const answer = post(t);
      return {
        topic: 'Rebuild from two listings', section: 'build-tree', strategy: 'rebuild',
        prompt: `A tree with distinct values was listed twice. Node-first (each node, then its left part, then its right part): ${list(pre(t))}. Left-first (left part, then the node, then its right part): ${list(ino(t))}. List it children-first: left part, then right part, then the node.`,
        question: 'Enter the children-first listing.', answer,
        hints: ['Which listing tells you the root? Which one tells you what is left of it?', 'The first unused node-first value is the root; its position in the left-first listing splits left from right.', 'Rebuild left before right (that is the order node-first lists them), then read the tree children-first.'],
        rubric: ['Node-first gives the root; left-first splits the rest by size.', 'A value → index map makes each split O(1): O(n) overall.', 'Distinct values are required; with duplicates the split is ambiguous.'],
        explanation: `Children-first, the tree is ${list(answer)}.`,
      };
    }
    case 'serialize': {
      const level = shift(pick<Level>([[1, 2, 3, null, null, 4, 5], [1, null, 2], [5, 3, null, 2, 4], [1, 2, 3, 4], [7]]), round);
      const t = tree(level);
      const answer = ino(t);
      return {
        topic: 'Read a tree back from text', section: 'serialize', strategy: 'rebuild',
        prompt: `A tree was written as the text "${serial(t)}": each node’s value, then its left part, then its right part, with # for every empty spot. Rebuild it and list its values left part, node, right part.`,
        question: 'Enter the listing.', answer,
        hints: ['Read the text in the same order it was written.', 'Take the next token; # means empty; otherwise make the node, then read its left part, then its right part.', 'Once rebuilt, list left part, node, right part.'],
        rubric: ['Markers for empty spots make one listing enough to fix the shape.', 'Reading uses one shared cursor in the order of writing.', 'O(n) to write and to read.'],
        explanation: `The tree reads back as ${lv(level)}; left part, node, right part gives ${list(answer)}.`,
      };
    }
    case 'symmetric': {
      const level = shift(pick<Level>([[1, 2, 2, 3, 4, 4, 3], [1, 2, 2, null, 3, null, 3], [1], [1, 2, 2, 2, null, 2], [5, 4, 4, null, 3, 3, null]]), round * 2);
      const answer = same(tree(level)?.left ?? null, mirror(tree(level)?.right ?? null));
      return {
        topic: 'Mirror image of itself', section: 'symmetric', strategy: 'pair',
        prompt: `Does ${lv(level)} look exactly the same in a mirror held beside it: same shape and same values, reflected left to right? ${FORMAT}`,
        question: 'Enter yes or no.', answer,
        hints: ['Compare the left subtree with the right subtree, but reflected.', 'Walk two nodes at once, starting from the root’s two children.', 'Outside with outside (a.left, b.right), inside with inside (a.right, b.left).'],
        rubric: ['Two pointers walk the two halves in mirrored directions.', 'Null handling as in an identical-trees check.', 'O(n) time, O(h) space.'],
        explanation: answer ? 'Every reflected pair matches.' : 'Some reflected pair differs in value or shape.',
      };
    }
    case 'subtree': {
      const pairs: [Level, Level][] = [[[3, 4, 5, 1, 2], [4, 1, 2]], [[3, 4, 5, 1, 2, null, null, null, null, 0], [4, 1, 2]], [[1, 1], [1]], [[3, 4, 5, 1, 2], [4, 1]], [[1, 2, 3], [3]], [[2, 2, 2, 2, null, null, 2], [2, 2]]];
      const [a, b] = pick(pairs).map(l => shift(l, round)) as [Level, Level];
      const big = tree(a), small = tree(b);
      const answer = all(big).some(n => same(n, small));
      return {
        topic: 'A tree inside a tree', section: 'subtree', strategy: 'pair',
        prompt: `Is there a node in ${lv(a)} whose entire subtree (that node and everything below it) is identical to ${lv(b)}? ${FORMAT}`,
        question: 'Enter yes or no.', answer,
        hints: ['You already know how to test whether two trees are identical.', 'The match could start at any node of the big tree.', 'Try each node: identical here, or found in the left part, or in the right part.'],
        rubric: ['Reuses an identical-trees check at every node.', 'Must match the WHOLE subtree, down to the leaves.', 'O(m · n) worst case; hashing or string matching can do better.'],
        explanation: answer ? 'One node’s full subtree matches exactly.' : 'No node’s full subtree matches (a partial match isn’t enough).',
      };
    }
    case 'good-nodes': {
      const level = shift(pick<Level>([[3, 1, 4, 3, null, 1, 5], [3, 3, null, 4, 2], [1], [2, null, 4, 10, 8, null, null, 4], [5, 4, 6, 4, 5, 1, 7]]), round);
      const answer = good(tree(level));
      return {
        topic: 'Nothing bigger above', section: 'good-nodes', strategy: 'down',
        prompt: `In ${lv(level)}, count the nodes whose value is at least as large as every value on the path from the root down to them. ${FORMAT}`,
        question: 'Enter the count.', answer,
        hints: ['What does each node need to know about the nodes above it?', 'Only one number: the largest value on the path so far.', 'Pass max(maxAbove, node.val) to both children; count the node if node.val ≥ maxAbove.'],
        rubric: ['The running maximum flows down as a parameter.', 'Counts flow back up as a sum: both directions in one function.', 'O(n) time, O(h) space.'],
        explanation: `${answer} node(s) have nothing larger above them.`,
      };
    }
    case 'lca-bst': {
      const level = shift([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], round * 10);
      const [p, q] = pick<[number, number]>([[2, 8], [2, 4], [3, 5], [7, 9], [0, 5], [3, 9]]).map(x => x + round * 10) as [number, number];
      const answer = lca(tree(level)!, p, q);
      return {
        topic: 'Where two searches split', section: 'lca-bst', strategy: 'sorted',
        prompt: `${lv(level)} is a search tree: left parts smaller, right parts larger. Which node is the deepest one with both ${p} and ${q} in its subtree? Aim to touch only the nodes on one path. ${FORMAT}`,
        question: 'Enter its value.', answer,
        hints: ['In a search tree, comparing values tells you which side something is on.', 'Both smaller: go left. Both larger: go right.', 'The first node where they are not on the same side (or that equals one of them) is the answer.'],
        rubric: ['Uses the ordering instead of searching both sides.', 'O(h) time; a loop gives O(1) space.', 'The split point is where the two searches would part.'],
        explanation: `${p} and ${q} part ways at ${answer}.`,
      };
    }
    case 'rob': {
      const level = scale(pick<Level>([[3, 2, 3, null, 3, null, 1], [3, 4, 5, 1, 3, null, 1], [4, 1, null, 2, null, 3], [2, 1, 3, null, 4], [5]]), [1, 2, 3, 1][round]);
      const answer = Math.max(...rob(tree(level)));
      return {
        topic: 'Pick nodes, never parent and child', section: 'house-robber-iii', strategy: 'up',
        prompt: `Choose some nodes of ${lv(level)} so that no chosen node is the parent of another chosen node. What is the largest possible sum of chosen values? ${FORMAT}`,
        question: 'Enter the sum.', answer,
        hints: ['At each node you either take it or skip it. What does the parent need to know about each child?', 'Return two numbers: the best with this node skipped, and with it taken.', 'skip = best of each child’s pair, summed; take = value + both children’s skip.'],
        rubric: ['Each call returns a pair, so the parent can choose.', 'Alternating levels is not enough: skipping two levels in a row can be better.', 'O(n) time, O(h) space.'],
        explanation: `The best choice sums to ${answer}.`,
      };
    }
    case 'flatten': {
      const level = shift(pick<Level>([[1, 2, 5, 3, 4, null, 6], [1, null, 2, 3], [4, 2, 6, 1, 3], [1, 2, 3, 4, 5, 6, 7]]), round * 10);
      const answer = pre(tree(level));
      return {
        topic: 'Unroll a tree into a chain', section: 'flatten', strategy: 'up',
        prompt: `Rewire ${lv(level)} in place into a chain: every left pointer empty, each right pointer leading to the next node, in the order “node, then its left part, then its right part”. Which values does the chain visit, from the old root on? ${FORMAT}`,
        question: 'Enter the chain.', answer,
        hints: ['Building a linked chain is easiest from its END backwards.', 'Visit in reverse of the target order: right part, left part, then the node.', 'Keep prev, the chain built so far: node.right = prev; node.left = null; prev = node.'],
        rubric: ['The chain is in node-left-right order.', 'Reverse order (right, left, node) lets each node point at the already-built rest.', 'O(n) time, O(h) space (O(1) with the Morris-style rewiring).'],
        explanation: `The chain is ${list(answer)}.`,
      };
    }
    case 'right-view': {
      const level = shift(pick<Level>([[1, 2, 3, null, 5, null, 4], [1, null, 3], [1, 2, 3, 4], [1, 2, 3, null, 5, 6, null, 7]]), round);
      const answer = rightView(tree(level));
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `Standing to the right of ${lv(level)}, you see exactly one node per row: the rightmost one. Which values do you see, top row first? ${FORMAT}`,
        question: 'Enter the values, top row first.', answer,
        hints: ['The question is about rows. What naturally processes a tree one row at a time?', 'Keep the current row of nodes; build the next row from their children.', 'The last node of each row is the one you see.'],
        rubric: ['Rows are the unit: a queue processes one row at a time.', 'Each row’s last node is recorded.', 'O(n) time, O(width) space. (Climbing with a depth parameter, right side first, also works.)'],
        explanation: `Row by row, the rightmost values are ${list(answer)}.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-trees-dfs-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
