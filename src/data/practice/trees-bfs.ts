// Independent practice for the Trees (BFS) lesson. Prompts never name the pattern; inputs vary with `variant`.
// Every tree is written in LeetCode's array form: the root first, then each row left to right, with
// null for a missing child (each non-null value's two children follow in order; trailing nulls dropped).
import type { Challenge, PracticeSet } from '../../lib/practice.ts';

export const strategies = {
  floors: 'Go one depth at a time: count who is waiting, handle exactly that many',
  ends: 'Per depth, keep only the first or the last node you meet',
  early: 'Go one depth at a time and stop at the first depth that settles the answer',
  seats: 'Number every position as if the tree were complete; compare numbers within one depth',
  links: 'Walk a finished depth through its own links to build the next one',
  rings: 'Give every node a way back up, then spread outward from a start one step at a time',
  other: 'Another tool fits better: let each subtree report its answer upward',
} as const;

export const conceptIds = [
  'level-row', 'zigzag-row', 'right-view', 'level-sum', 'min-depth', 'max-width',
  'next-pointer', 'cousins', 'distance-k', 'bottom-left', 'diameter', 'path-sum',
] as const;
type ConceptId = typeof conceptIds[number];

type Tree = (number | null)[];
interface N { val: number; left: number; right: number; parent: number; depth: number }

function build(tree: Tree): N[] {
  const nodes: N[] = [];
  if (!tree.length || tree[0] === null) return nodes;
  nodes.push({ val: tree[0], left: -1, right: -1, parent: -1, depth: 0 });
  const waiting = [0];
  let k = 1;
  while (waiting.length && k < tree.length) {
    const p = waiting.shift()!;
    for (const side of ['left', 'right'] as const) {
      if (k >= tree.length) break;
      const v = tree[k++];
      if (v === null) continue;
      nodes.push({ val: v, left: -1, right: -1, parent: p, depth: nodes[p].depth + 1 });
      nodes[p][side] = nodes.length - 1;
      waiting.push(nodes.length - 1);
    }
  }
  return nodes;
}
// Rows of node ids, left to right (ids are created top to bottom, left to right).
const rowsOf = (nodes: N[]) => {
  const rows: number[][] = [];
  nodes.forEach((n, id) => (rows[n.depth] ??= []).push(id));
  return rows;
};
const show = (tree: Tree) => `[${tree.map(x => (x === null ? 'null' : String(x))).join(', ')}]`;
const shift = (tree: Tree, by: number) => tree.map(x => (x === null ? null : x + by));
const idOf = (nodes: N[], value: number) => nodes.findIndex(n => n.val === value);
const intro = (tree: Tree) => `The tree ${show(tree)} is written in LeetCode’s array form (root first, then each row left to right, null for a missing child).`;

function make(id: ConceptId, variant: number): Omit<Challenge, 'id'> {
  const v = Math.abs(Math.trunc(variant));
  switch (id) {
    case 'level-row': {
      const bases: Tree[] = [[3, 9, 20, null, null, 15, 7], [1, 2, 3, 4, null, 5, 6, null, 7], [8, 4, 12, 2, 6, 10, 14, 1, null, null, 7], [5, 1, null, 2, 4, 3]];
      const tree = shift(bases[v % 4], 10 * (Math.floor(v / 4) % 3));
      const rows = rowsOf(build(tree)), nodes = build(tree);
      const d = 1 + (Math.floor(v / 4) % (rows.length - 1));
      const answer = rows[d].map(i => nodes[i].val);
      return {
        topic: 'One row of the tree', section: 'level-order', strategy: 'floors',
        prompt: `${intro(tree)} List the values at depth ${d} (the root is at depth 0), from left to right.`,
        question: 'Enter the values.', answer,
        hints: ['Rows must come out in order, top to bottom. Who should be handled before whom?', 'Keep a line of nodes waiting; each node you handle sends its children to the back.', 'Count the line before each row; handle exactly that many, then the line is the next row.'],
        rubric: ['A first-in, first-out line visits rows in order.', 'The line’s length is recorded once before each row, so rows never mix.', 'O(n) time; O(w) extra space for the widest row.'],
        explanation: `Depth ${d} reads ${JSON.stringify(answer).replace(/,/g, ', ')}.`,
      };
    }
    case 'zigzag-row': {
      const bases: Tree[] = [[1, 2, 3, 4, 5, 6, 7], [3, 9, 20, null, null, 15, 7], [1, 2, 3, 4, null, null, 5, 6, 7, 8, 9], [10, 20, 30, null, 40, 50, null, 60, 70]];
      const tree = shift(bases[v % 4], Math.floor(v / 4) % 5);
      const nodes = build(tree), rows = rowsOf(nodes);
      const d = 1 + (Math.floor(v / 4) % (rows.length - 1));
      const forward = rows[d].map(i => nodes[i].val);
      const answer = d % 2 ? [...forward].reverse() : forward;
      return {
        topic: 'Rows that alternate direction', section: 'zigzag', strategy: 'floors',
        prompt: `${intro(tree)} Its rows are read alternately: depth 0 left to right, depth 1 right to left, depth 2 left to right, and so on. Enter the row at depth ${d}, as it is read.`,
        question: 'Enter the row.', answer,
        hints: ['Collect each row in true left-to-right order first. What changes on alternate rows?', 'Only where each value is written changes; the waiting line keeps its order.', 'On a right-to-left row, the i-th node handled goes to slot size − 1 − i.'],
        rubric: ['The waiting line always stays left to right.', 'The direction is applied only when writing the row.', 'O(n) time, O(w) extra space.'],
        explanation: `Depth ${d} is ${d % 2 ? 'read right to left' : 'read left to right'}: ${JSON.stringify(answer).replace(/,/g, ', ')}.`,
      };
    }
    case 'right-view': {
      const bases: Tree[] = [[1, 2, 3, null, 5, null, 4], [1, 2, 3, 4], [1, null, 3], [1, 2, 3, 4, 5, null, null, 6], [7, 3, 9, 1, 5, null, null, null, 2]];
      const tree = shift(bases[v % 5], Math.floor(v / 5) % 4);
      const nodes = build(tree);
      const answer = rowsOf(nodes).map(r => nodes[r[r.length - 1]].val);
      return {
        topic: 'What you see from one side', section: 'right-side-view', strategy: 'ends',
        prompt: `${intro(tree)} Standing to the right of the tree, you see exactly one node at each depth: the rightmost one. List what you see, from the root’s depth downward.`,
        question: 'Enter the values you see.', answer,
        hints: ['“Rightmost at each depth” is not the same as “right children”.', 'Handle the tree one row at a time and keep one node per row.', 'Keep the last node handled in each row (or go right-first and keep the first node reached at each new depth).'],
        rubric: ['A left child is visible when nothing stands to its right at its depth.', 'Row by row, keep i == size − 1; or right-first with depth == answer.size().', 'O(n) time; O(w) or O(h) extra space depending on the walk.'],
        explanation: `The view is ${JSON.stringify(answer).replace(/,/g, ', ')}.`,
      };
    }
    case 'level-sum': {
      const bases: Tree[] = [[1, 7, 0, 7, -8, null, null], [989, null, 10250, 98693, -89388, null, null, null, -32127], [3, 9, 20, null, null, 15, 7], [-5, 4, 4, 1, -9, 2, 2], [2, -1, -1, 6]];
      const base = bases[v % 5].filter((x, i, a) => !(x === null && a.slice(i).every(y => y === null)));
      const k = 1 + (Math.floor(v / 5) % 3);
      const tree = base.map(x => (x === null ? null : x * k));
      const nodes = build(tree), rows = rowsOf(nodes);
      const sums = rows.map(r => r.reduce((s, i) => s + nodes[i].val, 0));
      const answer = sums.indexOf(Math.max(...sums));
      return {
        topic: 'An answer per depth', section: 'average-levels', strategy: 'floors',
        prompt: `${intro(tree)} Which depth has the largest total of values? The root is at depth 0; if several depths tie, give the smallest one.`,
        question: 'Enter the depth.', answer,
        hints: ['You need one number per row, not one per node.', 'Handle the tree one row at a time, keeping a running total for the current row.', 'Compare each finished row’s total with the best so far; update only on a strictly larger total.'],
        rubric: ['Rows are separated by counting the waiting line before each row.', 'Totals of large values belong in a long.', 'Strictly-greater comparison keeps the smallest depth on ties; O(n) time.'],
        explanation: `Row totals are ${JSON.stringify(sums).replace(/,/g, ', ')}; the largest is at depth ${answer}.`,
      };
    }
    case 'min-depth': {
      const bases: Tree[] = [[3, 9, 20, null, null, 15, 7], [2, null, 3, null, 4, null, 5, null, 6], [1, 2], [1, 2, 3, 4, 5, null, 6, 7, null, null, null, null, 8], [1, 2, 3, null, null, null, 4, null, 5, null, 6]];
      const tree = shift(bases[v % 5], Math.floor(v / 5) % 4);
      const nodes = build(tree);
      const leaf = nodes.find(n => n.left < 0 && n.right < 0)!;     // nodes are in row order: first leaf is shallowest
      const answer = leaf.depth + 1;
      return {
        topic: 'The nearest way out', section: 'min-depth', strategy: 'early',
        prompt: `${intro(tree)} How many nodes are on the shortest path from the root down to a leaf? (A leaf has no children at all.)`,
        question: 'Enter the number of nodes.', answer,
        hints: ['A node with one child is not a leaf.', 'Visit the tree one depth at a time, starting from the root.', 'The first leaf you meet is on the shallowest possible depth: stop there.'],
        rubric: ['A leaf has neither a left nor a right child.', 'Row by row, the first leaf found is the nearest; nothing deeper is visited.', 'Worst case O(n), but it stops early on lopsided trees.'],
        explanation: `The nearest leaf is ${leaf.val}, at depth ${leaf.depth}: ${answer} node(s) on the path.`,
      };
    }
    case 'max-width': {
      const bases: Tree[] = [[1, 3, 2, 5, 3, null, 9], [1, 3, 2, 5, null, null, 9, 6, null, 7], [1, 3, 2, 5], [1, 2, 3, 4, null, null, 5, 6, null, null, 7], [1, 2, null, 3, null, 4]];
      const tree = shift(bases[v % 5], 2 * (Math.floor(v / 5) % 4));
      const nodes = build(tree);
      const seat: number[] = [];
      nodes.forEach((n, i) => { seat[i] = n.parent < 0 ? 0 : 2 * seat[n.parent] + (nodes[n.parent].left === i ? 1 : 2); });
      const answer = Math.max(...rowsOf(nodes).map(r => seat[r[r.length - 1]] - seat[r[0]] + 1));
      return {
        topic: 'Width with gaps', section: 'max-width', strategy: 'seats',
        prompt: `${intro(tree)} The width of a depth is the number of positions from its leftmost node to its rightmost node, counting the empty positions between them that a complete tree would fill. What is the largest width over all depths?`,
        question: 'Enter the width.', answer,
        hints: ['Counting the nodes in a row ignores the gaps. Give every node a position number instead.', 'Root at position 0; the children of position p are at 2p + 1 and 2p + 2.', 'Width of a row = last position − first position + 1. Renumber each row from 0 to keep numbers small.'],
        rubric: ['Positions follow the complete-tree numbering 2p + 1, 2p + 2.', 'Width uses only the first and last node of each row.', 'Positions double every row, so renumber per row and use a long; O(n) time.'],
        explanation: `The widest row spans ${answer} position(s).`,
      };
    }
    case 'next-pointer': {
      const bases: Tree[] = [[1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, null, 7], [10, 20, 30, 40, null, null, 50], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]];
      const tree = shift(bases[v % 4], 100 * (Math.floor(v / 4) % 3));
      const nodes = build(tree), rows = rowsOf(nodes);
      const pick = 1 + (Math.floor(v / 4) * 3 + v) % (nodes.length - 1);
      const row = rows[nodes[pick].depth], at = row.indexOf(pick);
      const answer = at + 1 < row.length ? nodes[row[at + 1]].val : -1;
      return {
        topic: 'Links along a row', section: 'next-pointers', strategy: 'links',
        prompt: `${intro(tree)} Every node gets one extra pointer, next, to the node immediately to its right at the same depth (null if there is none). Where does next point for the node with value ${nodes[pick].val}? Use O(1) extra space in your design.`,
        question: 'Enter the value it points to, or −1 for null.', answer,
        hints: ['Nodes on the same depth may have different parents.', 'If a row is already linked, you can walk it from its leftmost node like a linked list.', 'Walking row d, link each node’s children together, and the last child of one node to the first child of the next.'],
        rubric: ['next links neighbours at the same depth, across different parents.', 'A linked row replaces the waiting line, giving O(1) extra space.', 'The rightmost node of every row points to null.'],
        explanation: answer < 0 ? `${nodes[pick].val} is the rightmost node at its depth, so next is null.` : `${nodes[pick].val} points to ${answer}.`,
      };
    }
    case 'cousins': {
      const bases: [Tree, [number, number][]][] = [
        [[1, 2, 3, null, 4, null, 5], [[4, 5], [2, 3], [2, 5]]],
        [[1, 2, 3, 4], [[4, 3], [2, 3], [1, 4]]],
        [[1, 2, 3, 4, 5, 6, 7], [[4, 6], [4, 5], [5, 7], [3, 6]]],
      ];
      const [base, pairs] = bases[v % 3];
      const off = Math.floor(v / 3) % 4;
      const tree = shift(base, off);
      const [x, y] = pairs[Math.floor(v / 3) % pairs.length].map(p => p + off);
      const nodes = build(tree), a = nodes[idOf(nodes, x)], b = nodes[idOf(nodes, y)];
      const answer = a.depth === b.depth && a.parent !== b.parent;
      return {
        topic: 'Same depth, different parents', section: 'cousins', strategy: 'floors',
        prompt: `${intro(tree)} Values are unique. Two nodes are cousins when they are at the same depth but have different parents. Are ${x} and ${y} cousins?`,
        question: 'Enter yes or no.', answer,
        hints: ['You need two facts about each node: its depth and its parent.', 'Go one row at a time; while handling a node you can see both its children.', 'If one node’s two children are the pair, they are siblings. Otherwise, both in the same row means cousins.'],
        rubric: ['Same depth is necessary but not enough: siblings share a parent.', 'Sibling check happens at the parent, before the row is reached.', 'O(n) time, O(w) extra space.'],
        explanation: answer ? `${x} and ${y} are both at depth ${a.depth} with different parents.` : a.depth !== b.depth ? `${x} is at depth ${a.depth} and ${y} at depth ${b.depth}.` : `${x} and ${y} share the parent ${nodes[a.parent].val}: they are siblings.`,
      };
    }
    case 'distance-k': {
      const bases: [Tree, number, number][] = [[[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 2], [[1, 2, 3, 4, 5, 6, 7], 4, 3], [[0, 1, null, 3, 2], 2, 1], [[1, 2, 3, null, 4, 5, 6], 4, 2], [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 7, 3]];
      const [base, target0, k] = bases[v % 5];
      const off = 10 * (Math.floor(v / 5) % 3);
      const tree = shift(base, off), target = target0 + off;
      const nodes = build(tree);
      const dist = new Map<number, number>([[idOf(nodes, target), 0]]);
      const line = [idOf(nodes, target)];
      while (line.length) {
        const cur = line.shift()!, n = nodes[cur];
        for (const next of [n.left, n.right, n.parent]) if (next >= 0 && !dist.has(next)) { dist.set(next, dist.get(cur)! + 1); line.push(next); }
      }
      const answer = [...dist].filter(([, d]) => d === k).map(([i]) => nodes[i].val).sort((p, q) => p - q);
      return {
        topic: 'Everyone k steps away', section: 'distance-k', strategy: 'rings',
        prompt: `${intro(tree)} Values are unique. List every node exactly ${k} edges away from the node with value ${target} (moving up or down), in increasing order.`,
        question: 'Enter the values in increasing order.', answer,
        hints: ['Paths may go up through a parent and down another branch.', 'Record each node’s parent first; then every node has up to three neighbours.', `Spread outward from ${target} one ring at a time, never revisiting a node; after ${k} rings, the waiting nodes are the answer.`],
        rubric: ['A parent map turns the tree into an undirected graph.', 'A visited set stops the walk bouncing back the way it came.', 'O(n) time, O(n) extra space.'],
        explanation: `At distance ${k} from ${target}: ${JSON.stringify(answer).replace(/,/g, ', ')}.`,
      };
    }
    case 'bottom-left': {
      const bases: Tree[] = [[2, 1, 3], [1, 2, 3, 4, null, 5, 6, null, null, 7], [1, null, 2, 3], [5, 3, 8, null, 4, 7, 9, null, null, 6], [1, 2, 3, 4, 5, 6, 7]];
      const tree = shift(bases[v % 5], 3 * (Math.floor(v / 5) % 4));
      const nodes = build(tree), rows = rowsOf(nodes);
      const answer = nodes[rows[rows.length - 1][0]].val;
      return {
        topic: 'The corner of the deepest row', section: 'exit-ticket', strategy: 'ends',
        prompt: `${intro(tree)} What is the value of the leftmost node in the deepest row?`,
        question: 'Enter the value.', answer,
        hints: ['The deepest row is the last one you would reach going top to bottom.', 'Remember the first node of each row as you go; the last remembered one wins.', 'Or handle each row right to left: the very last node handled is the answer.'],
        rubric: ['“Leftmost” is per row, not “a left child”.', 'Row by row, keep i == 0 of every row and return the last kept.', 'O(n) time, O(w) extra space.'],
        explanation: `The deepest row starts with ${answer}.`,
      };
    }
    case 'diameter': {
      const bases: Tree[] = [[1, 2, 3, 4, 5], [1, 2], [1, 2, null, 3, 4, 5, null, null, 6], [4, 2, 6, 1, 3, 5, 7], [1, 2, 3, null, 4, null, null, 5, 6, 7]];
      const tree = shift(bases[v % 5], Math.floor(v / 5) % 4);
      const nodes = build(tree);
      let answer = 0;
      const height = (i: number): number => { if (i < 0) return 0; const l = height(nodes[i].left), r = height(nodes[i].right); answer = Math.max(answer, l + r); return 1 + Math.max(l, r); };
      height(0);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `${intro(tree)} How many edges are on the longest path between any two nodes? The path need not pass through the root.`,
        question: 'Enter the number of edges.', answer,
        hints: ['The longest path bends at some node: down its left side and down its right side.', 'That node needs the heights of both its subtrees, which come from below.', 'Return each subtree’s height upward; at every node, left height + right height is a candidate.'],
        rubric: ['The answer at a node depends on answers from its subtrees.', 'One post-order pass computes heights and the best bend: O(n).', 'Visiting row by row gives no subtree heights; it is the wrong tool here.'],
        explanation: `The longest path has ${answer} edge(s). Subtree heights flow upward, so a depth-first walk fits.`,
      };
    }
    case 'path-sum': {
      const bases: [Tree, number][] = [[[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], 22], [[1, 2, 3], 5], [[1, 2], 1], [[-2, null, -3], -5], [[1, 2, 3, 4, 5, 6, 7], 10]];
      const [base, t0] = bases[v % 5];
      const m = 1 + (Math.floor(v / 5) % 3);
      const tree = base.map(x => (x === null ? null : x * m)), target = t0 * m;
      const nodes = build(tree);
      const hit = (i: number, rest: number): boolean => { const n = nodes[i]; rest -= n.val; if (n.left < 0 && n.right < 0) return rest === 0; return (n.left >= 0 && hit(n.left, rest)) || (n.right >= 0 && hit(n.right, rest)); };
      const answer = hit(0, target);
      return {
        topic: 'Know when to choose another tool', section: 'choose-the-tool', strategy: 'other',
        prompt: `${intro(tree)} Is there a path from the root down to a leaf (a node with no children) whose values add up to exactly ${target}?`,
        question: 'Enter yes or no.', answer,
        hints: ['The question is about whole root-to-leaf paths.', 'Carry the remaining target down one path at a time.', 'At a leaf, check whether the remainder is exactly 0; otherwise try the left path, then the right.'],
        rubric: ['A path is one branch from root to leaf, not a row.', 'Carrying a remainder down each branch uses O(h) extra space.', 'A node with one child is not a leaf.'],
        explanation: answer ? `Yes: a root-to-leaf path adds up to ${target}.` : `No root-to-leaf path adds up to ${target}.`,
      };
    }
  }
}

export function challengeFor(id: string, variant = 0): Challenge {
  return { id, question: 'Enter only the result.', ...make(id as ConceptId, variant) };
}

export const practice: PracticeSet = {
  storageKey: 'citadel-trees-bfs-review-v1',
  strategies,
  conceptIds,
  challengeFor,
};
