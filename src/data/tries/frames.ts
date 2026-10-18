// Dry-run frames for every problem in src/dsa-lessons/tries.mdx. Each generator replays the lesson's algorithm on a
// small input and ends with a text view holding `answer` (checked against brute force in tests/tries-frames.test.ts).
// Tries are drawn with the graph view. Node positions come from the FINAL trie, so nodes never jump while it grows.
import { recorder, tvars } from '../../lib/dryrun.ts';
import type { CellTone, Frame, NodeTone, Predict, View } from '../../lib/dryrun.ts';

const J = JSON.stringify;
const q = (s: string) => (s === '' ? '∅' : `"${s}"`);
const prefixesOf = (words: string[]) => {
  const s = new Set(['']);
  for (const w of words) for (let i = 1; i <= w.length; i++) s.add(w.slice(0, i));
  return s;
};
const childrenOf = (all: Iterable<string>, p: string) => [...all].filter(x => x.length === p.length + 1 && x.startsWith(p)).sort();
const ask = (question: string, options: string[], answer: number, explain: string): Predict => ({ question, options, answer, explain });

type Pos = Record<string, [number, number]>;
function layout(all: Set<string>): Pos {
  const maxD = Math.max(1, ...[...all].map(x => x.length));
  const step = Math.min(44, 176 / maxD);
  const leaves: string[] = [];
  const collect = (p: string) => { const k = childrenOf(all, p); if (!k.length) leaves.push(p); k.forEach(collect); };
  collect('');
  const gap = leaves.length > 1 ? 272 / (leaves.length - 1) : 0;
  const pos: Pos = {};
  const place = (p: string): number => {
    const k = childrenOf(all, p);
    const x = k.length ? k.map(place).reduce((a, b) => a + b, 0) / k.length : leaves.length > 1 ? 24 + leaves.indexOf(p) * gap : 160;
    pos[p] = [x, 22 + p.length * step];
    return x;
  };
  place('');
  return pos;
}

interface TV { nodes: Set<string>; ends?: Set<string>; tones?: Record<string, NodeTone>; edges?: Record<string, 'active' | 'used'>; name?: string }
const nid = (p: string) => (p === '' ? '^' : p);
function trieView(pos: Pos, o: TV): View {
  const ids = [...o.nodes].sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
  const tones: Record<string, NodeTone> = {};
  for (const p of ids) {
    const t = o.tones?.[p] ?? (o.ends?.has(p) ? 'done' : undefined);
    if (t) tones[nid(p)] = t;
  }
  return {
    kind: 'graph', name: o.name ?? 'trie (∅ is the root)',
    nodes: ids.map(p => ({ id: nid(p), label: p === '' ? '∅' : p[p.length - 1] + (o.ends?.has(p) ? '✓' : ''), x: pos[p][0], y: pos[p][1] })),
    edges: ids.filter(p => p !== '').map(p => ({ from: nid(p.slice(0, -1)), to: nid(p), weight: p[p.length - 1], ...(o.edges?.[p] ? { tone: o.edges[p] } : {}) })),
    tones,
  };
}
// Tones for a walk that has reached `cur`: everything above is visited, cur is current.
function walked(cur: string): Pick<TV, 'tones' | 'edges'> {
  const tones: Record<string, NodeTone> = {}, edges: Record<string, 'active' | 'used'> = {};
  for (let i = 0; i < cur.length; i++) { tones[cur.slice(0, i)] = 'visited'; edges[cur.slice(0, i + 1)] = 'used'; }
  tones[cur] = 'current';
  if (cur) edges[cur] = 'active';
  return { tones, edges };
}

// ---- Implement Trie: insert ---------------------------------------------------------------------
// answer = number of letter nodes after inserting every word.
export function buildFrames(words: string[]): Frame[] {
  const all = prefixesOf(words), pos = layout(all), r = recorder();
  const nodes = new Set(['']), ends = new Set<string>();
  const view = (cur: string) => trieView(pos, { nodes, ends, ...walked(cur) });
  const count = () => nodes.size - 1;
  r.frame(`The trie starts as a bare root (∅), the empty prefix. We insert ${words.join(', ')}, one letter at a time. A green node with ✓ marks where a word ends.`,
    [view(''), tvars({ nodes: 0 })]);
  words.forEach((w, wi) => {
    let grew = 0;
    for (let i = 0; i < w.length; i++) {
      const p = w.slice(0, i + 1), had = nodes.has(p);
      nodes.add(p);
      if (!had) grew++;
      r.frame(had
        ? `${q(w)}, letter ${i + 1} "${w[i]}": the child "${w[i]}" already exists under ${q(p.slice(0, -1))}, so follow it. This beginning is shared with an earlier word.`
        : `${q(w)}, letter ${i + 1} "${w[i]}": ${q(p.slice(0, -1))} has no "${w[i]}" child yet, so grow a new node and step onto it.`,
        [view(p), tvars({ word: w, letter: w[i], nodes: count() })],
        wi > 0 ? ask(`Inserting ${q(w)}: does ${q(p.slice(0, -1))} already have a "${w[i]}" child?`, ['Yes: follow it', 'No: grow a new node'], had ? 0 : 1,
          had ? 'The node exists because an earlier word passed through it. Sharing it is the whole point of a trie.' : 'No earlier word passed through this prefix, so the branch has to be created.') : undefined);
    }
    ends.add(w);
    r.frame(`All letters of ${q(w)} are walked. Set isEnd = true on this node. ${grew === 0 ? 'No node was created at all: the word was already a path, and only the end mark is new.' : `${grew} new node${grew > 1 ? 's' : ''} grew for this word.`}`,
      [view(w), tvars({ word: w, nodes: count() })],
      grew === 0 ? ask(`Every node of ${q(w)} already existed. What does insert still have to do?`, ['Nothing: the path is there', 'Set isEnd = true on the last node'], 1,
        'The nodes only prove some longer word passes through. isEnd is what makes this prefix a word itself.') : undefined);
  });
  r.frame(`Done. ${words.length} words became ${count()} letter nodes, fewer than the ${words.reduce((a, w) => a + w.length, 0)} letters typed, because beginnings are shared.`,
    [trieView(pos, { nodes, ends }), tvars({ answer: count() })]);
  return r.frames;
}

// ---- Implement Trie: search / startsWith ---------------------------------------------------------
// answer = "true" | "false".
export function searchFrames(words: string[], query: string, op: 'search' | 'startsWith'): Frame[] {
  const all = prefixesOf(words), pos = layout(all), ends = new Set(words), r = recorder();
  const view = (cur: string) => trieView(pos, { nodes: all, ends, ...walked(cur) });
  r.frame(`The trie holds ${words.join(', ')}. ${op}(${q(query)}) walks the letters from the root; no node is created or changed.`, [view(''), tvars({ op, query, answer: '?' })]);
  for (let i = 0; i < query.length; i++) {
    const p = query.slice(0, i + 1);
    if (!all.has(p)) {
      r.frame(`${q(p.slice(0, -1))} has no "${query[i]}" child, so no stored word continues this way. Return false right here.`,
        [view(p.slice(0, -1)), tvars({ op, query, answer: 'false' })],
        ask(`Standing on ${q(p.slice(0, -1))}, the next letter is "${query[i]}" and no such child exists. Result?`, ['Keep walking', 'Return false'], 1, 'A missing branch means no stored word has this beginning.'));
      return r.frames;
    }
    r.frame(`Letter "${query[i]}" exists under ${q(p.slice(0, -1))}: step onto ${q(p)}.`, [view(p), tvars({ op, query, walked: i + 1, answer: '?' })]);
  }
  const ans = op === 'startsWith' ? true : ends.has(query);
  r.frame(op === 'startsWith'
    ? `All ${query.length} letters walked and the node exists, so some stored word begins with ${q(query)}. startsWith does not look at isEnd: true.`
    : ends.has(query)
      ? `All letters walked, and ${q(query)} carries an end mark: it was inserted as a word. search returns true.`
      : `All letters walked, but ${q(query)} has no end mark: it is only the beginning of a longer word. search returns false.`,
    [view(query), tvars({ op, query, isEnd: ends.has(query) ? 'true' : 'false', answer: String(ans) })],
    ask(`The walk arrived at ${q(query)}. What does ${op} return?`, ['true', 'false'], ans ? 0 : 1,
      op === 'startsWith' ? 'Arriving proves a stored word passes through this node.' : ends.has(query) ? 'isEnd is true, so this exact word was inserted.' : 'Arriving is not enough for search: isEnd is false here.'));
  return r.frames;
}

// ---- Add and Search Words: dots ------------------------------------------------------------------
// answer = "true" | "false".
export function wildcardFrames(words: string[], pattern: string): Frame[] {
  const all = prefixesOf(words), pos = layout(all), ends = new Set(words), r = recorder();
  const stack = [''];
  const view = (queued: string[] = []) => {
    const tones: Record<string, NodeTone> = {}, edges: Record<string, 'active' | 'used'> = {};
    stack.forEach((p, i) => { tones[p] = i === stack.length - 1 ? 'current' : 'visited'; if (p) edges[p] = i === stack.length - 1 ? 'active' : 'used'; });
    queued.forEach(p => (tones[p] = 'queued'));
    return trieView(pos, { nodes: all, ends, tones, edges });
  };
  const vars = (i: number, answer = '?') => tvars({ pattern, matched: `${i} of ${pattern.length}`, answer });
  r.frame(`The trie holds ${words.join(', ')}. search(${q(pattern)}): a letter follows one branch, a dot (.) must try every child, depth first.`, [view(), vars(0)]);
  function dfs(p: string, i: number): boolean {
    if (i === pattern.length) {
      const ok = ends.has(p);
      r.frame(ok ? `The pattern is used up on ${q(p)}, and a word ends here. That is a match: true.`
        : `The pattern is used up on ${q(p)}, but no word ends here (a dot matches exactly one letter, so lengths must agree). Back out.`,
        [view(), vars(i)],
        ask(`Pattern used up on ${q(p)}. What does this call return?`, ['true (a match)', 'false (back out)'], ok ? 0 : 1, ok ? 'isEnd is true: a stored word has exactly the pattern length.' : 'No isEnd here: arriving is not enough.'));
      return ok;
    }
    const c = pattern[i];
    if (c !== '.') {
      const nx = p + c;
      if (!all.has(nx)) { r.frame(`Pattern position ${i} is the letter "${c}", but ${q(p)} has no "${c}" child. Dead end: this call returns false.`, [view(), vars(i)]); return false; }
      stack.push(nx);
      r.frame(`Pattern position ${i} is the letter "${c}": only the "${c}" branch can match, so follow it to ${q(nx)}.`, [view(), vars(i + 1)]);
      const ok = dfs(nx, i + 1);
      if (!ok) stack.pop();
      return ok;
    }
    const ks = childrenOf(all, p);
    r.frame(ks.length ? `Pattern position ${i} is a dot: any letter fits, so every child of ${q(p)} is a candidate (${ks.map(k => k[k.length - 1]).join(', ')}, shown as queued). Try them in order.` : `Pattern position ${i} is a dot, but ${q(p)} has no children. Dead end.`,
      [view(ks), vars(i)],
      ks.length ? ask(`At a dot on ${q(p)}, children ${ks.map(k => k[k.length - 1]).join(', ')}. What does the search do?`, ['Follow the "." child', 'Try each child in turn; stop at the first success', 'Pick the first child only'], 1,
        'A dot is never stored in the trie. Any child might lead to a match, so each gets a turn until one succeeds.') : undefined);
    for (let k = 0; k < ks.length; k++) {
      stack.push(ks[k]);
      r.frame(`Try child "${ks[k][ks[k].length - 1]}": step onto ${q(ks[k])}.`, [view(ks.slice(k + 1)), vars(i + 1)]);
      if (dfs(ks[k], i + 1)) return true;
      stack.pop();
      r.frame(`${q(ks[k])} led nowhere. Back on ${q(p)}. ${k + 1 < ks.length ? `Next untried child: "${ks[k + 1][ks[k + 1].length - 1]}".` : 'No children left, so this dot fails.'}`, [view(ks.slice(k + 1)), vars(i)]);
    }
    return false;
  }
  const ok = dfs('', 0);
  r.frame(ok ? `Some path matched every pattern position and ended on a word, so search(${q(pattern)}) is true.` : `Every branch failed, so search(${q(pattern)}) is false.`, [view(), vars(pattern.length, String(ok))]);
  return r.frames;
}

// ---- Word Search II -------------------------------------------------------------------------------
// answer = JSON array of the found words, sorted.
export function wordSearchFrames(board: string[][], words: string[]): Frame[] {
  const R = board.length, C = board[0].length;
  const all = prefixesOf(words), pos = layout(all), r = recorder();
  const nodes = new Set(all), ends = new Set(words), found: string[] = [];
  const onPath: [number, number][] = [];
  let cur: [number, number] | null = null;
  let foundNow: [number, number] | null = null;
  const hasKids = (p: string) => childrenOf(nodes, p).length > 0;
  const views = (prefix: string): View[] => {
    const tones: { r: number; c: number; tone: CellTone }[] = onPath.map(([a, b]) => ({ r: a, c: b, tone: 'active' as CellTone }));
    if (cur) tones.push({ r: cur[0], c: cur[1], tone: foundNow ? 'found' : 'compared' });
    return [
      { kind: 'grid', name: 'board', cells: board, tones, ...(cur ? { pointers: [{ r: cur[0], c: cur[1], label: 'here', tone: 'blue' as const }] } : {}) },
      trieView(pos, { nodes, ends, ...walked(nodes.has(prefix) ? prefix : '') }),
      tvars({ found: found.length ? found.join(', ') : 'none', answer: '?' }),
    ];
  };
  r.frame(`Plant every word in one trie (${words.join(', ')}), then run a depth-first search from every cell, carrying a trie node. The board and the trie move in lockstep.`, [
    { kind: 'grid', name: 'board', cells: board }, trieView(pos, { nodes, ends }), tvars({ found: 'none', answer: '?' })]);
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const marked = new Set<string>();
  function dfs(a: number, b: number, parent: string): void {
    if (a < 0 || b < 0 || a >= R || b >= C || marked.has(`${a},${b}`)) return;
    const ch = board[a][b], child = parent + ch;
    const prevCur = cur;
    cur = [a, b];
    if (!nodes.has(child)) {
      r.frame(`Cell (${a},${b}) "${ch}": ${q(parent)} has no "${ch}" child, so no unfound word continues this way. Stop; nothing below can match.`,
        [...views(parent)],
        ask(`The walk stands on ${q(parent)} and looks at "${ch}" at (${a},${b}). Enter that cell?`, ['Yes: step in', 'No: the trie has no such child'], 1, 'The board moves only where the trie has a branch.'));
      cur = prevCur;
      return;
    }
    onPath.push([a, b]); marked.add(`${a},${b}`);
    r.frame(`Cell (${a},${b}) "${ch}": ${q(parent)} has a "${ch}" child, so step onto ${q(child)} and mark the cell as used.`, [...views(child)]);
    if (ends.has(child)) {
      ends.delete(child); found.push(child); foundNow = [a, b];
      r.frame(`A word ends here: ${q(child)} is on the board. Add it to the answer and clear it from the trie so it is reported only once.`, [...views(child)]);
      foundNow = null;
    }
    for (const [da, db] of dirs) dfs(a + da, b + db, child);
    onPath.pop(); marked.delete(`${a},${b}`);
    cur = prevCur;
    if (!hasKids(child) && !ends.has(child)) {
      nodes.delete(child);
      r.frame(`Back from ${q(child)}: it has no children and no word, so unlink it. Later walks stop one step earlier.`, [...views(parent)],
        ask(`${q(child)} now has no children and holds no word. Keep it or unlink it?`, ['Keep it', 'Unlink it from its parent'], 1, 'Nothing below can ever produce a word, so the branch is dead weight.'));
    }
  }
  for (let a = 0; a < R; a++) for (let b = 0; b < C; b++) dfs(a, b, '');
  cur = null;
  const ans = [...found].sort();
  r.frame(`Every start cell has been tried. Found: ${ans.length ? ans.join(', ') : 'nothing'}.`, [
    { kind: 'grid', name: 'board', cells: board }, trieView(pos, { nodes, ends }), tvars({ found: ans.length ? ans.join(', ') : 'none', answer: J(ans) })]);
  return r.frames;
}

// ---- Implement Trie II: counts and erase ----------------------------------------------------------
// answer = JSON [countWordsEqualTo(eq), countWordsStartingWith(pre)] after all ops.
export function countEraseFrames(ops: ['insert' | 'erase', string][], eq: string, pre: string): Frame[] {
  const all = prefixesOf(ops.map(o => o[1])), pos = layout(all), r = recorder();
  const pass = new Map<string, number>(), end = new Map<string, number>();
  const nodes = () => new Set(['', ...[...pass].filter(([, v]) => v > 0).map(([k]) => k)]);
  const view = (cur: string) => trieView(pos, { nodes: nodes(), ...walked(cur) });
  const counters = (changed: string[]): View => {
    const keys = [...pass].filter(([, v]) => v > 0).map(([k]) => k).sort();
    return { kind: 'map', name: 'prefix: pass / end', entries: keys.map(k => [k, `${pass.get(k)} / ${end.get(k) ?? 0}`]), changed: keys.map((k, i) => (changed.includes(k) ? i : -1)).filter(i => i >= 0) };
  };
  r.frame('Every node keeps two counters. pass = how many stored words go through it. end = how many words end exactly on it. Duplicates just raise the counters.', [view(''), counters([])]);
  for (const [op, w] of ops) {
    if (op === 'insert') {
      const touched: string[] = [];
      for (let i = 1; i <= w.length; i++) { pass.set(w.slice(0, i), (pass.get(w.slice(0, i)) ?? 0) + 1); touched.push(w.slice(0, i)); }
      end.set(w, (end.get(w) ?? 0) + 1);
      r.frame(`insert(${q(w)}): add 1 to pass on every node of the path, and 1 to end on the last node.`, [view(w), counters(touched)]);
      continue;
    }
    const touched: string[] = [];
    r.frame(`erase(${q(w)}): walk the same path and subtract 1 from pass on each node. If a node's pass reaches 0, nobody uses it any more.`, [view(''), counters([])]);
    let cut = false;
    for (let i = 1; i <= w.length && !cut; i++) {
      const p = w.slice(0, i);
      pass.set(p, pass.get(p)! - 1); touched.push(p);
      if (pass.get(p) === 0) {
        for (const k of [...pass.keys()]) if (k.startsWith(p)) { pass.set(k, 0); end.delete(k); }
        r.frame(`pass on ${q(p)} dropped to 0: no stored word goes through it. Cut it off at its parent and stop. Everything below existed only for this copy.`,
          [view(p.slice(0, -1)), counters([])],
          ask(`pass on ${q(p)} just reached 0. What does erase do?`, ['Keep walking and subtract below too', 'Cut the branch here and stop'], 1, 'With pass = 0 the whole branch is unused, so unlinking it at the parent removes it all in one step.'));
        cut = true;
      } else r.frame(`pass on ${q(p)} is now ${pass.get(p)}: other words still go through, so keep it and move on.`, [view(p), counters([p])]);
    }
    if (!cut) { end.set(w, end.get(w)! - 1); r.frame(`The last node of ${q(w)}: subtract 1 from end as well.`, [view(w), counters([w])]); }
  }
  const walkTo = (p: string) => (pass.get(p) ?? 0) > 0;
  const eqN = walkTo(eq) ? end.get(eq) ?? 0 : 0, preN = walkTo(pre) ? pass.get(pre)! : 0;
  r.frame(`countWordsEqualTo(${q(eq)}) walks to the node and reads end = ${eqN}. countWordsStartingWith(${q(pre)}) reads pass = ${preN}. Both are one walk.`,
    [view(walkTo(pre) ? pre : ''), counters([]), tvars({ [`equalTo ${eq}`]: eqN, [`startingWith ${pre}`]: preN, answer: J([eqN, preN]) })]);
  return r.frames;
}

// ---- Replace Words ---------------------------------------------------------------------------------
// answer = the sentence with each word replaced by its shortest root.
export function replaceFrames(roots: string[], sentence: string): Frame[] {
  const all = prefixesOf(roots), pos = layout(all), ends = new Set(roots), r = recorder();
  const out: string[] = [];
  const view = (cur: string) => trieView(pos, { nodes: all, ends, ...walked(cur) });
  r.frame(`Insert the roots ${roots.join(', ')}. Then walk each sentence word from the root and stop at the first end mark: the walk meets prefixes shortest first.`, [view(''), tvars({ result: '' })]);
  for (const w of sentence.split(' ')) {
    let cur = '', done = false;
    for (let i = 0; i < w.length && !done; i++) {
      const p = w.slice(0, i + 1);
      if (!all.has(p)) {
        out.push(w);
        r.frame(`${q(w)}: ${q(cur)} has no "${w[i]}" child before any end mark, so no root is a prefix. Keep the word as it is.`, [view(cur), tvars({ word: w, result: out.join(' ') })]);
        done = true;
      } else if (ends.has(p)) {
        out.push(p);
        r.frame(`${q(w)}: stepping onto ${q(p)} lands on an end mark. That is the first root met, so the shortest. Replace the word with ${q(p)} and stop walking.`,
          [view(p), tvars({ word: w, result: out.join(' ') })],
          ask(`Walking ${q(w)}, we reach ${q(p)}, which is a root. Stop or keep walking?`, ['Stop: first root = shortest', 'Keep walking for a longer root'], 0, 'Prefixes are met shortest first, so the first end mark is the shortest root.'));
        done = true;
      } else {
        cur = p;
        r.frame(`${q(w)}: letter "${w[i]}" exists, step onto ${q(p)}. No end mark yet.`, [view(p), tvars({ word: w, result: out.join(' ') })]);
      }
    }
    if (!done) {
      out.push(w);
      r.frame(`${q(w)} ran out of letters before any end mark: every root is longer than the word. Keep it as it is.`, [view(cur), tvars({ word: w, result: out.join(' ') })]);
    }
  }
  r.frame('Every word is processed.', [view(''), tvars({ answer: out.join(' ') })]);
  return r.frames;
}

// ---- Longest Word in Dictionary ----------------------------------------------------------------------
// answer = the longest word buildable one letter at a time (smallest on ties, "" if none).
export function longestWordFrames(words: string[]): Frame[] {
  const all = prefixesOf(words), pos = layout(all), ends = new Set(words), r = recorder();
  let best = '';
  const stack = [''];
  const view = () => {
    const tones: Record<string, NodeTone> = {}, edges: Record<string, 'active' | 'used'> = {};
    stack.forEach((p, i) => { tones[p] = i === stack.length - 1 ? 'current' : 'visited'; if (p) edges[p] = i === stack.length - 1 ? 'active' : 'used'; });
    return trieView(pos, { nodes: all, ends, tones, edges });
  };
  const vars = () => tvars({ best: best || '(none)' });
  r.frame(`A word is buildable when every beginning of it is also a word, which means every node on its path has an end mark. So walk depth first, children a to z, entering only end-marked children.`, [view(), vars()]);
  function dfs(p: string): void {
    for (const c of childrenOf(all, p)) {
      const L = c[c.length - 1];
      if (!ends.has(c)) {
        r.frame(`Child "${L}" of ${q(p)} exists in the trie but ${q(c)} is not itself a word, so nothing under it can be built one letter at a time. Skip the whole branch.`, [view(), vars()],
          ask(`Child ${q(c)} has no end mark. Enter it?`, ['Yes', 'No: skip the branch'], 1, 'If a beginning is not a word, no word below it can be built letter by letter.'));
        continue;
      }
      stack.push(c);
      const better = c.length > best.length;
      if (better) best = c;
      r.frame(better ? `Enter ${q(c)}, a word of length ${c.length}, strictly longer than the best so far. New best: ${q(c)}.`
        : `Enter ${q(c)}, length ${c.length}. Not strictly longer than ${q(best)}, so the best stays (a to z order already put the smaller word first).`, [view(), vars()]);
      dfs(c);
      stack.pop();
    }
  }
  dfs('');
  r.frame(`Every end-marked branch is explored. The answer is ${best ? q(best) : 'the empty string'}.`, [view(), tvars({ best: best || '(none)', answer: best })]);
  return r.frames;
}

// ---- Search Suggestions System ------------------------------------------------------------------------
// answer = JSON array of the suggestion lists, one per typed letter.
export function suggestFrames(products: string[], word: string): Frame[] {
  const sorted = [...products].sort(), r = recorder();
  const lists: string[][] = [];
  const arr = (prefix: string): View => {
    const run = sorted.map((s, i) => (s.startsWith(prefix) ? i : -1)).filter(i => i >= 0);
    const tones: Record<number, CellTone> = {};
    run.forEach((i, k) => (tones[i] = k < 3 ? 'found' : 'compared'));
    return { kind: 'array', name: 'products sorted', values: sorted, indices: false, tones, pointers: run.length ? [{ at: run[0], label: 'first ≥ prefix', tone: 'blue' }] : [] };
  };
  const nodes = (): View => ({ kind: 'map', name: 'top-3 list kept by each trie node typed so far', entries: lists.map((l, i) => [word.slice(0, i + 1), l.length ? l.join(', ') : '(empty)'] as [string, string]) });
  r.frame(`Sort the products first: ${sorted.join(', ')}. Every word with a given prefix then sits in one contiguous run, so a trie node that keeps the first three words to pass through it holds the three smallest.`,
    [{ kind: 'array', name: 'as given', values: products, indices: false }, arr('')]);
  for (let i = 0; i < word.length; i++) {
    const prefix = word.slice(0, i + 1);
    const run = sorted.filter(s => s.startsWith(prefix));
    const three = run.slice(0, 3);
    lists.push(three);
    r.frame(run.length
      ? `Typed ${q(prefix)}. ${run.length} product${run.length > 1 ? 's' : ''} start${run.length > 1 ? '' : 's'} with it, in one run. Show the first ${three.length}: ${three.join(', ')}.${run.length > 3 ? ` The other ${run.length - 3} are cut: alphabetical order already ranked them.` : ''}`
      : `Typed ${q(prefix)}. No product starts with it, so the trie walk fell off and the list is empty. Every longer prefix will be empty too.`,
      [arr(prefix), nodes(), tvars({ typed: prefix, shown: three.length })],
      run.length > 3 ? ask(`Typed ${q(prefix)}: ${run.length} products match. How many are shown?`, [`All ${run.length}`, '3'], 1, 'Each node keeps only the first three to pass through it, and sorted order makes those the smallest.') : undefined);
  }
  r.frame(`Done: one list per keystroke.`, [nodes(), tvars({ answer: J(lists) })]);
  return r.frames;
}

// ---- Maximum XOR of two numbers -------------------------------------------------------------------------
// answer = the largest x ^ y over all pairs (0 for one number).
export function maxXorFrames(nums: number[]): Frame[] {
  const bits = Math.max(1, Math.max(...nums).toString(2).length);
  const bin = (x: number) => x.toString(2).padStart(bits, '0');
  const strs = nums.map(bin), all = prefixesOf(strs), pos = layout(all), r = recorder();
  const nodes = new Set(['']);
  const view = (cur: string, extra: Record<string, NodeTone> = {}) => {
    const w = walked(cur);
    return trieView(pos, { nodes, name: 'bit trie (left edge 0, right edge 1)', tones: { ...w.tones, ...extra }, edges: w.edges });
  };
  r.frame(`Write every number as ${bits} bits, highest first, and insert it into a trie with two children per node (bit 0 and bit 1). Then each number looks for the partner that gives the biggest XOR.`, [view(''), tvars({ answer: '?' })]);
  nums.forEach((x, i) => {
    for (let k = 1; k <= bits; k++) nodes.add(strs[i].slice(0, k));
    r.frame(`Insert ${x} = ${strs[i]}: one node per bit, top bit first.`, [view(strs[i]), tvars({ inserted: x })]);
  });
  let best = 0;
  nums.forEach((x, i) => {
    let cur = '', xor = '';
    r.frame(`Query ${x} = ${strs[i]}. At each bit, prefer the child with the OPPOSITE bit: that makes this XOR bit 1.`, [view(''), tvars({ x: strs[i], 'xor so far': '', best })]);
    for (let k = 0; k < bits; k++) {
      const b = strs[i][k], opp = b === '0' ? '1' : '0', hasOpp = nodes.has(cur + opp);
      cur += hasOpp ? opp : b;
      xor += hasOpp ? '1' : '0';
      r.frame(hasOpp
        ? `Bit ${bits - 1 - k} of ${x} is ${b}. The opposite child ${opp} exists, so take it: this XOR bit is 1. A 1 here is worth more than every lower bit together, so grabbing it is never wrong.`
        : `Bit ${bits - 1 - k} of ${x} is ${b}. There is no ${opp} child, so the walk is forced to follow ${b}: this XOR bit is 0.`,
        [view(cur), tvars({ x: strs[i], 'xor so far': xor, best })],
        ask(`Bit ${bits - 1 - k} of ${x} is ${b}. Which child does the walk take?`, [`The opposite bit, ${opp} (it exists)`, `The same bit, ${b} (the opposite is missing)`], hasOpp ? 0 : 1,
          hasOpp ? 'Opposite bits XOR to 1, the most valuable choice at this level.' : 'The opposite child is missing, so the same-bit child is the only one left (it always exists).'));
    }
    const v = parseInt(xor, 2);
    best = Math.max(best, v);
    r.frame(`The walk ended on the leaf ${cur} = ${parseInt(cur, 2)}. ${x} ^ ${parseInt(cur, 2)} = ${xor} = ${v}. Best so far: ${best}.`, [view(cur), tvars({ x: strs[i], partner: parseInt(cur, 2), xor: v, best })]);
  });
  r.frame(`Every number has queried the trie. The largest XOR of any pair is ${best}.`, [view(''), tvars({ answer: best })]);
  return r.frames;
}

// ---- Top-K typeahead --------------------------------------------------------------------------------------
// answer = JSON of suggest(prefix) after recording every query.
export function typeaheadFrames(queries: string[], k: number, prefix: string): Frame[] {
  const all = prefixesOf(queries), pos = layout(all), r = recorder();
  const count = new Map<string, number>(), top = new Map<string, string[]>();
  const better = (a: string, b: string) => count.get(b)! - count.get(a)! || (a < b ? -1 : 1);
  const nodes = new Set(['']);
  const board = (changed: string[], touched: string[]): View => {
    const keys = [...touched];
    return { kind: 'map', name: 'cached top-k list on each node of this path', entries: keys.map(p => [p === '' ? '∅' : p, (top.get(p) ?? []).map(w => `${w}×${count.get(w)}`).join(', ')] as [string, string]), changed: keys.map((p, i) => (changed.includes(p) ? i : -1)).filter(i => i >= 0) };
  };
  r.frame(`k = ${k}. Every node keeps its own list of the best ${k} queries below it. When a query is recorded, only the nodes on ITS path can change, so only they are updated.`, [trieView(pos, { nodes }), tvars({ k })]);
  let askedOnce = false;
  for (const w of queries) {
    count.set(w, (count.get(w) ?? 0) + 1);
    const path = Array.from({ length: w.length + 1 }, (_, i) => w.slice(0, i));
    const changed: string[] = [];
    for (const p of path) {
      nodes.add(p);
      const before = (top.get(p) ?? []).join('|');
      const l = [...(top.get(p) ?? [])];
      if (!l.includes(w)) l.push(w);
      l.sort(better);
      if (l.length > k) l.pop();
      top.set(p, l);
      if (l.join('|') !== before || l.includes(w)) changed.push(p);
    }
    const again = count.get(w)! > 1 && !askedOnce;
    if (again) askedOnce = true;
    r.frame(`record(${q(w)}): count is now ${count.get(w)}. On each node from the root down to ${q(w)}, add it if missing, re-sort by count (then alphabet) and drop the ${k + 1}th.`,
      [trieView(pos, { nodes, ...walked(w) }), board(changed, path), tvars({ query: w, count: count.get(w)! })],
      again ? ask(`${q(w)} is recorded again. Which nodes' lists can change?`, ['Only the node for the full query', 'Every node on its path, root included', 'Every node in the trie'], 1,
        'Other queries keep their counts, and only this one moved up. So just the nodes it passes through can change.') : undefined);
  }
  const l = top.get(prefix) ?? [];
  const path = Array.from({ length: prefix.length + 1 }, (_, i) => prefix.slice(0, i)).filter(p => nodes.has(p));
  const reached = nodes.has(prefix);
  r.frame(reached ? `suggest(${q(prefix)}) walks ${prefix.length} letter${prefix.length === 1 ? '' : 's'} to that node and returns a copy of its list: ${l.join(', ')}. No searching or sorting at query time.`
    : `suggest(${q(prefix)}) falls off the trie: no query starts with it, so the answer is empty.`,
    [trieView(pos, { nodes, ...walked(path[path.length - 1]) }), tvars({ answer: J(l) })]);
  return r.frames;
}
