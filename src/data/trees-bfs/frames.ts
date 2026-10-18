// Dry-run frames for every problem in src/dsa-lessons/trees-bfs.mdx. Trees use LeetCode's array form
// (null = no child). Each generator replays the lesson's algorithm and ends with a text view holding
// `answer` (checked against brute-force oracles in tests/trees-bfs-frames.test.ts).
import { recorder, tvars, type Frame, type View, type NodeTone, type TreeNode, type Val } from '../../lib/dryrun.ts';

type Tree = (number | null)[];
interface N { id: number; v: number; l: number; r: number; p: number; d: number }

function parse(a: Tree): Record<number, N> {
  const nodes: Record<number, N> = { 0: { id: 0, v: a[0] as number, l: -1, r: -1, p: -1, d: 0 } };
  const waiting = [0];
  let k = 1;
  while (waiting.length && k < a.length) {
    const p = waiting.shift()!;
    for (const side of ['l', 'r'] as const) {
      if (k >= a.length) break;
      const id = k++;
      if (a[id] === null) continue;
      nodes[id] = { id, v: a[id] as number, l: -1, r: -1, p, d: nodes[p].d + 1 };
      nodes[p][side] = id;
      waiting.push(id);
    }
  }
  return nodes;
}

const J = (x: unknown) => JSON.stringify(x);
const q = (question: string, options: string[], answer: number, explain: string) => ({ question, options, answer, explain });
const list = (xs: Val[]) => `[${xs.join(', ')}]`;

// Shared drawing helpers: one tree view, one queue view, one "visited" set view.
function drawing(nodes: Record<number, N>) {
  const nest = (id: number): TreeNode | null => (id < 0 ? null : { id: String(id), v: nodes[id].v, l: nest(nodes[id].l), r: nest(nodes[id].r) });
  const root = nest(0);
  const tree = (queue: number[], called: number[], current: number | null, heard?: number[]): View => {
    const tones: Record<string, NodeTone> = {};
    for (const i of heard ?? []) tones[String(i)] = 'visited';
    for (const i of called) tones[String(i)] = 'done';
    for (const i of queue) tones[String(i)] = 'queued';
    if (current !== null) tones[String(current)] = 'current';
    return { kind: 'tree', name: 'tree', root, tones };
  };
  const queue = (items: Val[], changed: number[] = [], removed: Val[] = []): View => ({ kind: 'queue', name: 'queue (front on the left)', items, changed, removed });
  const set = (called: number[], name = 'visited (already called)'): View => ({ kind: 'set', name, items: called.map(i => nodes[i].v) });
  return { tree, queue, set };
}

const sizeChoices = (size: number, salt: number) => {
  const vals = [size, size + 1, size > 1 ? size - 1 : size + 2];
  const shift = ((salt % 3) + 3) % 3;
  const options = vals.map((_, k) => vals[(k + 3 - shift) % 3]).map(String);
  return { options, answer: options.indexOf(String(size)) };
};

type Mode = 'levels' | 'zigzag' | 'right' | 'average' | 'minDepth' | 'width' | 'cousins';

function walk(a: Tree, mode: Mode, x = 0, y = 0): Frame[] {
  const nodes = parse(a);
  const { tree, queue: qView, set } = drawing(nodes);
  const r = recorder();
  const lab = (id: number, pos?: number) => (mode === 'width' ? `${nodes[id].v}@${pos}` : String(nodes[id].v));
  let line: { id: number; pos: number }[] = [{ id: 0, pos: 0 }];
  const called: number[] = [];
  const rows: number[][] = [];
  const view: number[] = [];
  const avgs: number[] = [];
  let best = 0;
  let prev: Record<string, Val> = {};
  const vars = (now: Record<string, Val>): View => { const v = tvars(now, prev); prev = now; return v; };
  const items = () => line.map(e => lab(e.id, e.pos));
  const intro: Record<Mode, string> = {
    levels: 'Level order: return the values level by level.',
    zigzag: 'Zigzag: the queue never changes. Only the slot we write each value into changes on odd levels.',
    right: 'Right side view: keep the last node called on each level.',
    average: 'Average per level: keep a running sum and the snapshot size.',
    minDepth: 'Minimum depth: stop at the first leaf we call. Levels arrive in depth order.',
    width: 'Maximum width: carry a position with each node, children at 2p+1 and 2p+2, renumbered from 0 on each level.',
    cousins: `Cousins: x = ${x}, y = ${y}. Same level and different parents.`,
  };
  r.frame(`${intro[mode]} Start with the root in the queue. Nothing has been called yet, so the visited set is empty.`,
    [tree([0], [], null), qView(items(), [0]), set([]), vars({ level: 0 })]);

  let level = 0;
  let found: boolean | null = null;
  outer: while (line.length) {
    const size = line.length;
    const first = line[0].pos;
    let foundX = false, foundY = false, sum = 0, last = 0;
    const slots: (number | string)[] = mode === 'zigzag' ? Array(size).fill('·') : [];
    const row: number[] = [];
    const ltr = level % 2 === 0;
    const sc = sizeChoices(size, level);
    r.frame(`Level ${level} starts. The queue holds exactly this level and nothing else, so take the snapshot size = ${size} now. We call exactly ${size} node${size > 1 ? 's' : ''}; children that join meanwhile stand behind the count.`,
      [tree(line.map(e => e.id), called, null), qView(items()), set(called), vars({ level, size })],
      q(`A new level begins and the queue holds ${size} node${size > 1 ? 's' : ''}. How many do we call before closing the row?`, sc.options, sc.answer,
        'The queue holds one whole level right now. Take that count once; do not re-read queue.size() inside the loop because it keeps changing.'));
    for (let i = 0; i < size; i++) {
      const e = line.shift()!;
      const n = nodes[e.id];
      const pos = e.pos - first;
      last = pos;
      called.push(e.id);
      row.push(n.v);
      sum += n.v;
      const kids = [n.l, n.r].filter(c => c >= 0);
      const leaf = kids.length === 0;
      const joined = kids.map(c => ({ id: c, pos: mode === 'width' ? (c === n.l ? 2 * pos + 1 : 2 * pos + 2) : 0 }));
      const sibling = mode === 'cousins' && n.l >= 0 && n.r >= 0 && ((nodes[n.l].v === x && nodes[n.r].v === y) || (nodes[n.l].v === y && nodes[n.r].v === x));
      if (mode === 'cousins') { foundX ||= n.v === x; foundY ||= n.v === y; }
      const stops = mode === 'minDepth' && leaf;
      if (!stops && !sibling) line.push(...joined);
      const added = kids.length && !stops && !sibling ? kids.map((_, k) => line.length - kids.length + k) : [];
      const left = size - i - 1;
      const joinText = stops || sibling ? '' : kids.length ? ` Its ${kids.length === 2 ? 'children' : 'child'} ${list(kids.map(c => nodes[c].v))} join the back, behind the ${left} node${left === 1 ? '' : 's'} still to call on this level.` : ' It has no children, so nothing joins.';
      let cap = `Call ${n.v} (${i + 1} of ${size}).${joinText}`;
      let pred: ReturnType<typeof q> | undefined;
      const extra: View[] = [];
      let now: Record<string, Val> = { level, size, i };
      if (mode === 'levels') now = { ...now, row: J(row) };
      if (mode === 'zigzag') {
        const slot = ltr ? i : size - 1 - i;
        slots[slot] = n.v;
        extra.push({ kind: 'array', name: `row slots (level ${level}, written ${ltr ? 'left to right' : 'right to left'})`, values: [...slots], pointers: [{ at: slot, label: 'write', tone: 'gold' }], tones: { [slot]: 'active' } });
        cap = `Call ${n.v} (${i + 1} of ${size}); write it into slot ${ltr ? 'i' : 'size - 1 - i'} = ${slot}.${joinText} The queue order is untouched, so the next level still comes out left to right.`;
        if (!ltr) pred = q(`Level ${level} is written right to left, size = ${size}. ${n.v} is call i = ${i}. Which slot?`, [`slot ${i}`, `slot ${size - 1 - i}`, 'reorder the queue first'], 1, `size - 1 - i = ${size - 1 - i}. The snapshot tells us where the far end is before we have seen the whole level.`);
        now = { level, size, i, slot };
      }
      if (mode === 'right') {
        const isLast = i === size - 1;
        if (isLast) view.push(n.v);
        cap = isLast ? `Call ${n.v} (${i + 1} of ${size}): the last call on this level, so nothing is to its right. It goes into the view.${joinText}` : `Call ${n.v} (${i + 1} of ${size}): ${left} more node${left === 1 ? '' : 's'} on this level are to its right, so it is hidden.${joinText}`;
        pred = q(`${n.v} is call ${i + 1} of ${size} on level ${level}. Is it in the right side view?`, ['Yes', 'No'], isLast ? 0 : 1, isLast ? 'i == size - 1: it is the last one on its level.' : 'Only the last call on a level (i == size - 1) is seen from the right.');
        now = { level, size, i, view: J(view) };
      }
      if (mode === 'average') now = { level, size, i, sum };
      if (mode === 'minDepth') {
        cap = stops ? `Call ${n.v}: no left child and no right child, so it is a leaf. Levels leave the queue in depth order, so no shallower leaf can still be waiting. Stop and return ${level + 1}.` : `Call ${n.v} (${i + 1} of ${size}): it has ${kids.length} child${kids.length === 1 ? '' : 'ren'}, so it is not a leaf.${joinText}`;
        pred = q(`${n.v} is polled on level ${level}. Do we stop here?`, ['Yes: it is a leaf', 'No: keep going'], leaf ? 0 : 1, leaf ? 'A leaf has no left and no right child. The first leaf called is the nearest one.' : 'A node with one child is not a leaf. Only both children missing counts.');
        now = { level, depth: level + 1, size, i };
      }
      if (mode === 'width') {
        now = { level, first: 0, position: pos, children: kids.length ? kids.map(c => (c === n.l ? 2 * pos + 1 : 2 * pos + 2)).join(', ') : 'none' };
        cap = `Call ${n.v} at position ${pos} (renumbered from this level's first node).${kids.length ? ` Its children get ${kids.map(c => (c === n.l ? 2 * pos + 1 : 2 * pos + 2)).join(' and ')}.` : ' No children.'} Last position so far on this level: ${pos}.`;
      }
      if (mode === 'cousins') {
        cap = sibling ? `Call ${n.v}: its two children are x and y, so they are siblings, not cousins. Answer false.` : `Call ${n.v} (${i + 1} of ${size}).${n.v === x || n.v === y ? ` This is ${n.v === x ? 'x' : 'y'}.` : ''} ${n.l >= 0 && n.r >= 0 ? `Check its children ${nodes[n.l].v} and ${nodes[n.r].v}: not the pair (x, y).` : 'Fewer than two children, so it cannot be their shared parent.'}${joinText}`;
        now = { level, foundX: String(foundX), foundY: String(foundY) };
      }
      r.frame(cap, [tree(line.map(e => e.id), called, e.id), qView(items(), added, [n.v]), set(called), ...extra, vars(now)], pred);
      if (stops) {
        r.frame(`Answer: ${level + 1}. The ${line.length} node${line.length === 1 ? '' : 's'} still in the queue are never called.`, [tree(line.map(z => z.id), called, null), qView(items()), set(called), tvars({ answer: level + 1 })]);
        return r.frames;
      }
      if (sibling) { found = false; break outer; }
    }
    if (mode === 'levels' || mode === 'zigzag') rows.push(mode === 'zigzag' ? (slots as number[]) : row);
    let close = `Level ${level} is done after exactly ${size} calls.`;
    let closeVars: Record<string, Val> = { level, size };
    if (mode === 'levels') { close += ` Close the row ${list(row)}.`; closeVars = { level, rows: J(rows) }; }
    if (mode === 'zigzag') { close += ` Row ${list(slots)} is final.`; closeVars = { level, rows: J(rows) }; }
    if (mode === 'average') { avgs.push(sum / size); close += ` Average = ${sum} / ${size} = ${sum / size}. Divide as a double, not as an integer.`; closeVars = { level, averages: J(avgs) }; }
    if (mode === 'right') closeVars = { level, view: J(view) };
    if (mode === 'width') { best = Math.max(best, last + 1); close += ` Width = last position ${last} - first position 0 + 1 = ${last + 1}; widest so far ${best}.`; closeVars = { level, width: last + 1, best }; }
    if (mode === 'cousins') {
      if (foundX && foundY) { found = true; close += ' Both x and y were on this level and no node had them as its two children: cousins.'; }
      else if (foundX || foundY) { found = false; close += ' Only one of x, y was on this level, so they have different depths.'; }
      else close += ' Neither was here; go on to the next level.';
      closeVars = { level, foundX: String(foundX), foundY: String(foundY) };
    }
    close += line.length ? ` The queue now holds exactly level ${level + 1}.` : ' The queue is empty, so we stop.';
    r.frame(close, [tree(line.map(e => e.id), called, null), qView(items()), set(called), vars(closeVars)]);
    if (found !== null) break;
    level++;
  }
  const fin: Record<Mode, Val> = {
    levels: J(rows), zigzag: J(rows), right: J(view), average: J(avgs), minDepth: level + 1, width: best, cousins: String(found === true),
  };
  r.frame(found !== null && mode === 'cousins' ? `Stop early. Answer: ${fin.cousins}.` : `The queue is empty: every node was called once. Answer: ${fin[mode]}.`,
    [tree([], called, null), qView([]), set(called), tvars({ answer: fin[mode] })]);
  return r.frames;
}

export const levelOrderFrames = (a: Tree) => walk(a, 'levels');
export const zigzagFrames = (a: Tree) => walk(a, 'zigzag');
export const rightViewFrames = (a: Tree) => walk(a, 'right');
export const averageLevelsFrames = (a: Tree) => walk(a, 'average');
export const minDepthFrames = (a: Tree) => walk(a, 'minDepth');
export const maxWidthFrames = (a: Tree) => walk(a, 'width');
export const cousinsFrames = (a: Tree, x: number, y: number) => walk(a, 'cousins', x, y);

// Perfect tree, O(1) extra space: walk level d along its own next pointers and link level d + 1.
// `a` must be a perfect tree (no nulls, length 2^h - 1). answer = JSON of [from, to] links in creation order.
export function nextPointersFrames(a: number[]): Frame[] {
  const nodes = parse(a);
  const { tree } = drawing(nodes);
  const r = recorder();
  const links: [number, number][] = [];
  const levels: number[][] = [];
  for (const id of Object.keys(nodes).map(Number)) (levels[nodes[id].d] ??= []).push(id);
  let prev: Record<string, Val> = {};
  const linkText = () => (links.length ? links.map(([f, t]) => `${f}→${t}`).join(', ') : 'none');
  const vars = (): View => { const now = { links: linkText() }; const v = tvars(now, prev); prev = now; return v; };
  const strip = (d: number, head: number): View => ({ kind: 'array', name: `level ${d} (already linked, walked by next)`, values: levels[d].map(i => nodes[i].v), join: '→', pointers: [{ at: head, label: 'head', tone: 'gold' }], tones: { [head]: 'active' } });
  r.frame('No queue at all. The root is level 0, a one-node list with next = null. Stand on a level that is already linked and link the level below it.', [tree([], [], 0), vars()]);
  for (let d = 0; d + 1 < levels.length; d++) {
    for (let h = 0; h < levels[d].length; h++) {
      const n = nodes[levels[d][h]];
      const made: string[] = [];
      links.push([nodes[n.l].v, nodes[n.r].v]);
      made.push(`${nodes[n.l].v}→${nodes[n.r].v} (siblings: head.left.next = head.right)`);
      let across = '';
      if (h + 1 < levels[d].length) {
        const nb = nodes[levels[d][h + 1]];
        links.push([nodes[n.r].v, nodes[nb.l].v]);
        across = `, and ${nodes[n.r].v}→${nodes[nb.l].v} (across the gap, using head.next = ${nb.v}: head.right.next = head.next.left)`;
      }
      r.frame(`Head is ${n.v} on level ${d}. Link ${made[0]}${across}.${h + 1 === levels[d].length ? ' This is the last head on its level, so its right child keeps next = null.' : ''}`,
        [tree([n.l, n.r], [], levels[d][h]), strip(d, h), vars()],
        q(`Head is ${n.v}. Which links does this step create?`,
          h + 1 < levels[d].length ? ['Only the sibling link', 'The sibling link and the link across the gap'] : ['Only the sibling link', 'The sibling link and the link across the gap'],
          h + 1 < levels[d].length ? 1 : 0,
          h + 1 < levels[d].length ? 'The head has a next neighbour, so its right child must also reach that neighbour\'s left child.' : 'The head is the last on its level: nothing is to its right, so the right child stays null.'));
    }
    r.frame(`Level ${d + 1} is now a fully linked list. Step down to its first node, ${nodes[levels[d + 1][0]].v}, and repeat.`, [tree([], levels[d + 1], null), vars()]);
  }
  r.frame(`The lowest level has no children, so we stop. Only a few pointers were used: O(1) extra space.`, [tree([], Object.keys(nodes).map(Number), null), tvars({ answer: J(links) })]);
  return r.frames;
}

// Tree turned into a graph with a parent map, then BFS rings from target with a visited set.
// answer = JSON of the values at distance exactly k (in queue order).
export function distanceKFrames(a: Tree, target: number, k: number): Frame[] {
  const nodes = parse(a);
  const { tree, queue: qView, set } = drawing(nodes);
  const ids = Object.keys(nodes).map(Number);
  const t = ids.find(i => nodes[i].v === target)!;
  const r = recorder();
  const parentMap: [Val, Val][] = ids.filter(i => nodes[i].p >= 0).map(i => [nodes[i].v, nodes[nodes[i].p].v]);
  const map = (): View => ({ kind: 'map', name: 'parent (child → parent)', entries: parentMap });
  r.frame(`A tree only has child links, but the sound also travels up. Pass 1 walks the tree once and records each node's parent. Now every node has up to three neighbours: left, right and parent.`, [tree([], [], null), map()]);
  let line = [t];
  const heard = [t];
  r.frame(`Pass 2 is BFS from the target ${target}. Put it in the queue and in the visited set. Visited is needed because a neighbour can be the node we just came from.`,
    [tree(line, [], null, heard), qView([target], [0]), set(heard, 'visited (heard the bell)'), tvars({ beat: 0, k })]);
  let beat = 0;
  for (; beat < k && line.length; beat++) {
    const size = line.length;
    r.frame(`Beat ${beat + 1} begins. The queue holds exactly the nodes at distance ${beat}. Snapshot size = ${size}.`, [tree(line, [], null, heard), qView(line.map(i => nodes[i].v)), set(heard, 'visited (heard the bell)'), tvars({ beat: beat + 1, size })]);
    for (let i = 0; i < size; i++) {
      const id = line.shift()!;
      const n = nodes[id];
      const next = [n.l, n.r, n.p].filter(c => c >= 0);
      const fresh = next.filter(c => !heard.includes(c));
      const stale = next.filter(c => heard.includes(c));
      for (const c of fresh) { heard.push(c); line.push(c); }
      r.frame(`Poll ${n.v}. Neighbours: ${list(next.map(c => nodes[c].v))}.${fresh.length ? ` New: ${list(fresh.map(c => nodes[c].v))}, added to the queue and the visited set.` : ' None is new.'}${stale.length ? ` Already visited: ${list(stale.map(c => nodes[c].v))}, skipped so the sound does not bounce back.` : ''}`,
        [tree(line, [], id, heard), qView(line.map(z => nodes[z].v), fresh.map((_, j) => line.length - fresh.length + j), [n.v]), set(heard, 'visited (heard the bell)'), tvars({ beat: beat + 1, size, polled: n.v })],
        q(`Polling ${n.v}: how many of its neighbours are new?`, ['0', '1', '2', '3'].slice(0, 4), fresh.length, stale.length ? `${list(stale.map(c => nodes[c].v))} already in the visited set, so only ${fresh.length} get added.` : 'None of its neighbours has been visited yet.'));
    }
  }
  const ring = line.map(i => nodes[i].v);
  r.frame(beat === k ? `After ${k} beat${k === 1 ? '' : 's'} the queue holds exactly the nodes at distance ${k}: ${list(ring)}.` : `The queue emptied before beat ${k}: nobody is that far away.`,
    [tree(line, [], null, heard), qView(ring), set(heard, 'visited (heard the bell)'), tvars({ answer: J(ring) })]);
  return r.frames;
}
