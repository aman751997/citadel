// Trees (BFS) playground: run the level-order walk yourself. Count the line once per level (the size snapshot),
// call exactly that many, and close the level; write zigzag rows from the correct end; and choose which
// node on each level the right side view includes.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export interface TNode { val: number; left: number; right: number; depth: number }   // -1 = no child
export type Mode = 'levels' | 'zigzag' | 'right';
export interface BfsState extends LabBase {
  tree: (number | null)[];       // LeetCode array form
  nodes: TNode[];                // ids in the order the array creates them (top to bottom, left to right)
  queue: number[];               // node ids, front first
  open: boolean;                 // a level is being called
  size: number;                  // the snapshot for the open level
  taken: number;                 // how many of `size` have been called
  level: number;                 // index of the open (or next) level
  row: (number | null)[];        // the open level's row (zigzag: fixed slots, null = empty slot)
  rows: number[][];              // closed rows
  view: number[];                // right side view (values)
  viewIds: number[];             // node ids in the view
  called: number[];              // node ids already called
}

// Build nodes from the LeetCode array: each non-null value consumes the next two entries as its children.
export function buildNodes(tree: (number | null)[]): TNode[] {
  const nodes: TNode[] = [];
  if (!tree.length || tree[0] === null) return nodes;
  nodes.push({ val: tree[0], left: -1, right: -1, depth: 0 });
  const waiting = [0];
  let k = 1;
  while (waiting.length && k < tree.length) {
    const parent = waiting.shift()!;
    for (const side of ['left', 'right'] as const) {
      if (k >= tree.length) break;
      const value = tree[k++];
      if (value === null) continue;
      nodes.push({ val: value, left: -1, right: -1, depth: nodes[parent].depth + 1 });
      nodes[parent][side] = nodes.length - 1;
      waiting.push(nodes.length - 1);
    }
  }
  return nodes;
}

export function fromInput(_mode: Mode, tree: (number | null)[]) {
  const nodes = buildNodes(tree);
  return {
    tree: [...tree], nodes, queue: nodes.length ? [0] : [], open: false, size: 0, taken: 0, level: 0,
    row: [] as (number | null)[], rows: [] as number[][], view: [] as number[], viewIds: [] as number[], called: [] as number[],
  };
}

const levelCases: (number | null)[][] = [[3, 9, 20, null, null, 15, 7], [1, 2, 2, 3, null, null, 3], [1, null, 2, null, 3], []];
const zigzagCases: (number | null)[][] = [[1, 2, 3, 4, 5, 6, 7], [3, 9, 20, null, null, 15, 7], [1], []];
const rightCases: (number | null)[][] = [[1, 2, 3, null, 5, null, 4], [1, 2, 3, 4], [1, null, 3], []];

const list = (xs: (number | null)[]) => `[${xs.map(x => (x === null ? '·' : String(x))).join(', ')}]`;
const vals = (s: BfsState, ids: number[]) => list(ids.map(id => s.nodes[id].val));
const owed = (s: BfsState) => s.size - s.taken;
const fromNext = (s: BfsState) => s.queue.length - owed(s);   // children already behind this level
const rightToLeft = (s: BfsState) => s.mode === 'zigzag' && s.level % 2 === 1;
const emptyLine = (s: BfsState) => s.nodes.length
  ? `The line is empty: all ${s.nodes.length} node(s) have been called and every level is closed.`
  : 'The tree is empty: the root is null, so no node ever joined the line. (In Java, offering that null root to an ArrayDeque throws a NullPointerException: guard it first.)';

function expected(s: BfsState): string {
  if (!s.open) return s.queue.length ? 'snapshot' : 'finish';
  if (s.mode === 'right') return s.taken === s.size - 1 ? 'record' : 'skip';
  if (s.taken === s.size) return 'close';
  if (s.mode === 'levels') return 'poll';
  return rightToLeft(s) ? 'prepend' : 'append';
}

function reject(s: BfsState, action: string): string {
  const d = s.level;
  if (!s.open) {
    if (!s.queue.length) return action === 'finish' ? 'Finish.' : emptyLine(s);
    if (action === 'finish') return `${s.queue.length} node(s) are still waiting in the line: ${vals(s, s.queue)}.`;
    if (action === 'close') return `No level is open. The line holds ${vals(s, s.queue)}: all of level ${d}. Count them to open the level.`;
    return `Level ${d} hasn’t been counted. Right now the line ${vals(s, s.queue)} is exactly level ${d}, but the moment you call a node, its children join behind and you can no longer tell where level ${d} ends. Take the size snapshot first.`;
  }
  const front = s.queue.length ? s.nodes[s.queue[0]] : null;
  if (action === 'snapshot') {
    if (s.mode !== 'right' && s.taken === s.size) return `Level ${d} is fully called (${s.size} of ${s.size}). Close its row before counting level ${d + 1}.`;
    const extra = fromNext(s);
    return `The size snapshot is taken once per level. Level ${d} was counted at ${s.size}, ${s.taken} called, ${owed(s)} to go. The line now holds ${s.queue.length}${extra ? `, including ${extra} child(ren) from level ${d + 1} who joined behind` : ''}. A fresh count would lose the boundary between the levels.`;
  }
  if (action === 'finish') return `Level ${d} is still open (${s.taken} of ${s.size} called) and the line holds ${s.queue.length}.`;
  if (action === 'close') return `Level ${d} still owes ${owed(s)} call(s): ${vals(s, s.queue.slice(0, owed(s)))}. Closing now would push them into level ${d + 1}’s row.`;
  // a call action
  if (s.mode !== 'right' && s.taken === s.size) {
    if (!front) return `The snapshot said ${s.size} and you have called ${s.size}. The line is empty. Close the row.`;
    return `The snapshot said ${s.size} and you have called ${s.size}. The front of the line is ${front.val}, from level ${front.depth}. Calling it now would write it into level ${d}’s row.`;
  }
  const i = s.taken, v = front!.val;
  if (action === 'flip') return `Changing the order children join breaks the NEXT level: if ${v}’s children join right-first, level ${d + 1} is no longer lined up left to right, and its row comes out scrambled. The line must stay in true left-to-right order; choose the direction only when writing.`;
  if (s.mode === 'zigzag') {
    if (action === 'append') return `Level ${d} is written right to left. ${v} is call ${i + 1} of ${s.size}, so it belongs in slot ${s.size} − 1 − ${i} = ${s.size - 1 - i}, counted from the far end. Slot ${i} would write the level left to right.`;
    return `Level ${d} is written left to right. ${v} is call ${i + 1} of ${s.size}, so it belongs in slot ${i}. Slot ${s.size - 1 - i} would reverse the level.`;
  }
  if (action === 'record') return `${v} is call ${i + 1} of ${s.size} on level ${d}: ${s.size - 1 - i} node(s) are still to its right (${vals(s, s.queue.slice(1, owed(s)))}). The right side view takes only the last one called.`;
  return `${v} is the last of ${s.size} on level ${d}: nothing is to its right. Skip it and level ${d} has no node in the view.`;
}

function apply(s: BfsState, action: string) {
  const d = s.level;
  if (action === 'snapshot') {
    s.open = true;
    s.size = s.queue.length;
    s.taken = 0;
    s.row = s.mode === 'zigzag' ? Array(s.size).fill(null) : [];
    s.message = `size = ${s.size}. Exactly level ${d} is waiting: ${vals(s, s.queue)}. Call ${s.size}, no more, no fewer.`;
    return;
  }
  if (action === 'close') {
    s.rows.push(s.row as number[]);
    s.message = `Level ${d} closed: ${list(s.row)}.${s.queue.length ? ` The line ${vals(s, s.queue)} is now exactly level ${d + 1}.` : ' The line is empty.'}`;
    s.open = false;
    s.level++;
    return;
  }
  if (action === 'finish') {
    s.done = true;
    if (s.mode === 'right') s.message = s.nodes.length ? `Right side view: ${list(s.view)}. One node per level, ${s.view.length} level(s).` : 'An empty tree has no right side view: [].';
    else s.message = s.nodes.length ? `Answer: [${s.rows.map(list).join(', ')}]. The line is empty and there is one row per level: ${s.rows.length}.` : 'An empty tree gives an empty answer: [].';
    return;
  }
  // a call
  const id = s.queue.shift()!, n = s.nodes[id], i = s.taken;
  s.called.push(id);
  const kids = [n.left, n.right].filter(c => c >= 0);
  s.queue.push(...kids);
  s.taken++;
  const joined = kids.length ? ` ${vals(s, kids)} join the back.` : ' No children.';
  if (s.mode === 'levels') {
    s.row.push(n.val);
    s.message = `Called ${n.val} (${i + 1} of ${s.size}).${joined} Row: ${list(s.row)}.`;
  } else if (s.mode === 'zigzag') {
    const slot = rightToLeft(s) ? s.size - 1 - i : i;
    s.row[slot] = n.val;
    s.message = `Called ${n.val} (i = ${i}) into slot ${slot}.${joined} Row: ${list(s.row)}.`;
  } else {
    if (action === 'record') { s.view.push(n.val); s.viewIds.push(id); }
    s.message = action === 'record' ? `${n.val} is the last on level ${d}: it is in the right side view.${joined}` : `${n.val} is not the last on level ${d}; another node is to its right.${joined}`;
    if (s.taken === s.size) {
      s.open = false;
      s.level++;
      s.message += s.queue.length ? ` Level ${d} done; the line is exactly level ${d + 1}.` : ' The line is empty.';
    }
  }
}

function view(s: BfsState): LabRow[] {
  const rows: LabRow[] = [];
  const maxDepth = s.nodes.reduce((m, n) => Math.max(m, n.depth), -1);
  const current = new Set(s.open ? s.queue.slice(0, owed(s)) : []);
  if (maxDepth < 0) rows.push({ name: 'Tree', cells: [], empty: 'Empty tree: the root is null' });
  for (let depth = 0; depth <= maxDepth; depth++) {
    const ids = s.nodes.map((_, id) => id).filter(id => s.nodes[id].depth === depth);
    const arrow = s.mode === 'zigzag' ? (depth % 2 ? ' (written ←)' : ' (written →)') : '';
    rows.push({
      name: `Level ${depth}${arrow}`,
      cells: ids.map(id => {
        const called = s.called.includes(id), waiting = s.queue.includes(id);
        const seen = s.viewIds.includes(id);
        return {
          value: String(s.nodes[id].val),
          label: seen ? 'SEEN' : waiting && s.queue[0] === id ? 'FRONT' : undefined,
          tone: called ? 'done' : current.has(id) ? 'hot' : waiting ? undefined : 'ghost',
        };
      }),
    });
  }
  rows.push({
    name: 'Line (front → back)', empty: 'The line is empty',
    cells: s.queue.map((id, i) => ({ value: String(s.nodes[id].val), label: i === 0 ? 'FRONT' : !current.has(id) && s.open ? `level ${s.nodes[id].depth}` : undefined, tone: current.has(id) ? 'hot' : undefined })),
  });
  if (s.mode === 'right') {
    rows.push({ name: 'Right side view', empty: 'No nodes yet', cells: s.view.map((v, i) => ({ value: String(v), label: `level ${i}`, tone: 'done' })) });
  } else {
    rows.push({
      name: s.open ? `Row for level ${s.level}` : 'Row (no level open)', empty: s.open ? 'Nothing written yet' : 'Count the line to open a level',
      cells: s.row.map((v, i) => ({ value: v === null ? '·' : String(v), label: s.mode === 'zigzag' ? `slot ${i}` : undefined, tone: v === null ? 'ghost' : 'hot' })),
    });
    rows.push({ name: 'Answer so far', empty: 'No levels closed yet', cells: s.rows.map((r, i) => ({ value: list(r), label: `level ${i}`, tone: 'done' })) });
  }
  return rows;
}

function describe(s: BfsState): string {
  if (s.done) return s.mode === 'right' ? `Done. View: ${list(s.view)}.` : `Done. Answer: [${s.rows.map(list).join(', ')}].`;
  if (!s.open) return s.queue.length ? `Level ${s.level} is waiting: ${s.queue.length} node(s) in line. Count before calling.` : 'The line is empty. No node is left to call.';
  const dir = s.mode === 'zigzag' ? (rightToLeft(s) ? ' Written right to left.' : ' Written left to right.') : '';
  return `Level ${s.level}: size = ${s.size}, called ${s.taken}, ${owed(s)} to go. Line length ${s.queue.length}.${dir}`;
}

const mode = (name: string, cases: (number | null)[][], m: Mode, actions: { action: string; label: string }[]) => ({
  name, cases: cases.length, actions,
  create: (v: number) => fromInput(m, cases[v]),
  expected, reject, apply, view, describe,
});

export const lab = makeLab<BfsState>({
  levels: mode('Level-order walk: level by level', levelCases, 'levels', [
    { action: 'snapshot', label: 'Take the snapshot: size = queue.size()' },
    { action: 'poll', label: 'Call the front: poll, write in the row, children join the back' },
    { action: 'close', label: 'Close the level: add the row to the answer' },
    { action: 'finish', label: 'The line is empty: hand in the answer' },
  ]),
  zigzag: mode('Zigzag: choose where to write', zigzagCases, 'zigzag', [
    { action: 'snapshot', label: 'Take the snapshot: size = queue.size()' },
    { action: 'append', label: 'Call the front; write at slot i (left to right)' },
    { action: 'prepend', label: 'Call the front; write at slot size − 1 − i (right to left)' },
    { action: 'flip', label: 'Call the front; its children join right-first' },
    { action: 'close', label: 'Close the level: add the row to the answer' },
    { action: 'finish', label: 'The line is empty: hand in the answer' },
  ]),
  right: mode('Right side view', rightCases, 'right', [
    { action: 'snapshot', label: 'Take the snapshot: size = queue.size()' },
    { action: 'skip', label: 'Call the front: another node is to its right' },
    { action: 'record', label: 'Call the front and record it: the right side view takes this node' },
    { action: 'finish', label: 'The line is empty: hand in the view' },
  ]),
}, 'Gold = on the open level, inside the snapshot · green = already called · dashed = not reached yet · plain = waiting for a later level');
