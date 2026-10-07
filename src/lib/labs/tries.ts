// Tries playground: plant words one letter at a time (follow an existing branch, grow a new one, tie
// the bloom); answer search vs startsWith with the same walk (the bloom decides only for search); and
// run a wildcard search by hand, branching at every dot and backing out of dead ends.
import { makeLab, type LabBase, type LabRow } from '../lab.ts';

export interface GNode { ch: string; prefix: string; depth: number; kids: Record<string, number>; end: boolean }
export interface Query { kind: 'search' | 'prefix'; text: string }
export interface Frame { node: number; i: number; next: number }   // next: children already tried here
export interface TrieState extends LabBase {
  nodes: GNode[];                    // nodes[0] is the root (no letter)
  // insert mode
  words: string[];
  wi: number;                        // index of the word being planted
  pos: number;                       // letters of the current word / query already walked
  at: number;                        // node the walk stands on
  // query mode
  queries: Query[];
  qi: number;
  answers: boolean[];
  // wildcard mode
  pattern: string;
  stack: Frame[];                    // the search path, root first
  dead: number[];                    // nodes backed out of
  visited: number;
  result: boolean | null;
}

type Input =
  | { mode: 'insert'; words: string[] }
  | { mode: 'query'; words: string[]; queries: Query[] }
  | { mode: 'wildcard'; words: string[]; pattern: string };

const root = (): GNode => ({ ch: '', prefix: '', depth: 0, kids: {}, end: false });

export function plant(words: string[]): GNode[] {
  const nodes = [root()];
  for (const w of words) {
    let at = 0;
    for (const c of w) {
      if (nodes[at].kids[c] === undefined) {
        nodes.push({ ch: c, prefix: nodes[at].prefix + c, depth: nodes[at].depth + 1, kids: {}, end: false });
        nodes[at].kids[c] = nodes.length - 1;
      }
      at = nodes[at].kids[c];
    }
    nodes[at].end = true;
  }
  return nodes;
}

const blank = () => ({
  nodes: [root()], words: [] as string[], wi: 0, pos: 0, at: 0,
  queries: [] as Query[], qi: 0, answers: [] as boolean[],
  pattern: '', stack: [{ node: 0, i: 0, next: 0 }] as Frame[], dead: [] as number[], visited: 0, result: null as boolean | null,
});

const insertCases: string[][] = [
  ['apple', 'app', 'apt'],
  ['car', 'cat', 'cart'],
  ['sea', 'sea', 'se'],
  [],
];
const queryCases: { words: string[]; queries: Query[] }[] = [
  { words: ['apple'], queries: [{ kind: 'search', text: 'apple' }, { kind: 'search', text: 'app' }, { kind: 'prefix', text: 'app' }] },
  { words: ['apple', 'app'], queries: [{ kind: 'search', text: 'app' }, { kind: 'prefix', text: 'b' }, { kind: 'search', text: 'appl' }] },
  { words: ['car', 'cart', 'dog'], queries: [{ kind: 'search', text: 'ca' }, { kind: 'prefix', text: 'do' }, { kind: 'search', text: 'cat' }, { kind: 'prefix', text: 'cars' }] },
  { words: [], queries: [{ kind: 'search', text: 'a' }, { kind: 'prefix', text: 'a' }] },
];
const wildCases: { words: string[]; pattern: string }[] = [
  { words: ['bad', 'dad', 'mad'], pattern: '.ad' },
  { words: ['ab', 'cd', 'ce'], pattern: '.e' },
  { words: ['apple', 'bad'], pattern: 'a.p' },
  { words: [], pattern: '.' },
];

export function fromInput(input: Input) {
  const base = blank();
  if (input.mode === 'insert') return { ...base, words: [...input.words] };
  if (input.mode === 'query') return { ...base, words: [...input.words], nodes: plant(input.words), queries: input.queries.map(q => ({ ...q })) };
  return { ...base, words: [...input.words], nodes: plant(input.words), pattern: input.pattern };
}

const q = (s: string) => `“${s}”`;
const name = (prefix: string) => (prefix ? q(prefix) : 'the root');
const below = (s: TrieState, prefix: string) => [...new Set(s.words)].filter(w => w.startsWith(prefix));
const listWords = (ws: string[]) => ws.map(q).join(', ');

// ---------- shared view of the garden ----------
function gardenRows(s: TrieState, tone: (id: number) => 'hot' | 'done' | 'out' | 'ghost' | undefined): LabRow[] {
  const maxDepth = Math.max(0, ...s.nodes.map(n => n.depth));
  const rows: LabRow[] = [{ name: 'Root', cells: [{ value: '·', label: 'root', tone: tone(0) }] }];
  for (let d = 1; d <= maxDepth; d++) {
    const ids = s.nodes.map((n, id) => ({ n, id })).filter(x => x.n.depth === d).sort((a, b) => (a.n.prefix < b.n.prefix ? -1 : 1));
    rows.push({ name: `Garden, ${d} letter${d > 1 ? 's' : ''} deep`, cells: ids.map(({ n, id }) => ({ value: n.ch, label: n.prefix + (n.end ? ' ✓' : ''), tone: tone(id) })) });
  }
  return rows;
}
const wordRow = (label: string, text: string, pos: number, cursor: string): LabRow => ({
  name: label, empty: 'Nothing left to walk',
  cells: [...text].map((c, i) => ({ value: c, label: i === pos ? cursor : undefined, tone: i < pos ? 'done' : i === pos ? 'hot' : undefined })),
});

// ---------- insert ----------
function insertExpected(s: TrieState) {
  if (s.wi >= s.words.length) return 'finish';
  const w = s.words[s.wi];
  if (s.pos < w.length) return s.nodes[s.at].kids[w[s.pos]] !== undefined ? 'follow' : 'grow';
  return 'bloom';
}
function insertReject(s: TrieState, action: string) {
  if (s.wi >= s.words.length) return 'Every word is planted. Close the garden.';
  const w = s.words[s.wi], here = s.nodes[s.at];
  if (action === 'finish') return `${s.words.length - s.wi} word(s) still waiting, starting with ${q(w)}.`;
  if (s.pos >= w.length) return `Every letter of ${q(w)} is walked; you stand on its last node. What remains is to mark that a word ends here.`;
  const c = w[s.pos], next = here.prefix + c;
  if (action === 'follow') return `No ${q(c)} branch grows under ${name(here.prefix)} yet, so there is nothing to follow. Grow it first.`;
  if (action === 'grow') {
    const lost = below(s, next).filter(x => s.words.slice(0, s.wi).includes(x));
    return `The ${q(c)} branch already grows under ${name(here.prefix)}. Growing a fresh one would overwrite that slot and cut off ${lost.length ? listWords(lost) : 'everything already below it'}. Follow it: shared beginnings are stored once.`;
  }
  return `${q(w)} isn’t finished: ${w.length - s.pos} letter(s) left (${q(w.slice(s.pos))}). A bloom here would claim ${here.prefix ? q(here.prefix) : 'the empty string'} is a word.`;
}
function insertApply(s: TrieState, action: string) {
  const w = s.words[s.wi];
  if (action === 'follow') {
    const c = w[s.pos];
    s.at = s.nodes[s.at].kids[c];
    s.pos++;
    s.message = `Followed the existing ${q(c)} branch to ${q(s.nodes[s.at].prefix)}. No new node: this beginning is shared.`;
  } else if (action === 'grow') {
    const c = w[s.pos], parent = s.nodes[s.at];
    s.nodes.push({ ch: c, prefix: parent.prefix + c, depth: parent.depth + 1, kids: {}, end: false });
    parent.kids[c] = s.nodes.length - 1;
    s.at = s.nodes.length - 1;
    s.pos++;
    s.message = `Grew a new ${q(c)} branch: node ${q(s.nodes[s.at].prefix)}. The garden now has ${s.nodes.length - 1} letter node(s).`;
  } else if (action === 'bloom') {
    const node = s.nodes[s.at], again = node.end;
    node.end = true;
    s.message = again
      ? `${q(w)} already blooms here, so inserting it again changes nothing (a counter would say “twice”; a flag can’t).`
      : `Bloom tied on ${q(w)}: isEnd = true. search(${q(w)}) will now say true.`;
    s.wi++; s.pos = 0; s.at = 0;
  } else {
    s.done = true;
    s.message = s.words.length ? `Planted ${s.words.length} word(s) using ${s.nodes.length - 1} letter node(s).` : 'No words: the garden is just the root.';
  }
}
function insertView(s: TrieState): LabRow[] {
  const w = s.wi < s.words.length ? s.words[s.wi] : '';
  return [
    wordRow('Word being planted', w, s.pos, 'NEXT'),
    ...gardenRows(s, id => (id === s.at && !s.done ? 'hot' : s.nodes[id].end ? 'done' : undefined)),
    { name: 'Words planted', empty: 'None yet', cells: s.words.slice(0, s.wi).map(x => ({ value: x, tone: 'done' })) },
  ];
}
function insertDescribe(s: TrieState) {
  if (s.done) return `Garden closed: ${s.nodes.length - 1} letter node(s).`;
  if (s.wi >= s.words.length) return 'Every word is planted.';
  const w = s.words[s.wi], here = s.nodes[s.at].prefix;
  if (s.pos < w.length) return `Planting ${q(w)}: ${s.pos} of ${w.length} letters walked. Next letter ${q(w[s.pos])} under ${name(here)}.`;
  return `All ${w.length} letters of ${q(w)} walked. You stand on ${q(here)}.`;
}

// ---------- search vs startsWith ----------
function queryExpected(s: TrieState) {
  if (s.qi >= s.queries.length) return 'finish';
  const { kind, text } = s.queries[s.qi];
  if (s.pos < text.length) return s.nodes[s.at].kids[text[s.pos]] !== undefined ? 'step' : 'false';
  return kind === 'prefix' || s.nodes[s.at].end ? 'true' : 'false';
}
function queryReject(s: TrieState, action: string) {
  if (s.qi >= s.queries.length) return 'Every question is answered. Close the garden.';
  const { kind, text } = s.queries[s.qi], here = s.nodes[s.at];
  const op = kind === 'search' ? 'search' : 'startsWith';
  if (action === 'finish') return `${s.queries.length - s.qi} question(s) still waiting.`;
  if (s.pos < text.length) {
    const c = text[s.pos], has = here.kids[c] !== undefined;
    if (action === 'step') return `No ${q(c)} branch grows under ${name(here.prefix)}: no stored word starts with ${q(here.prefix + c)}. The walk is over, and so is the question.`;
    if (action === 'true') return `Only ${s.pos} of ${text.length} letters are walked${has ? '' : `, and the next letter ${q(c)} has no branch`}. You can’t say true before the walk is complete.`;
    return `The ${q(c)} branch exists. Keep walking: the answer is decided only when the letters run out or a branch is missing.`;
  }
  if (action === 'step') return `Every letter of ${q(text)} is walked. Decide now.`;
  if (action === 'true') {
    const ws = below(s, text);
    return `You stand on ${q(text)}, but no bloom hangs here: it is only the beginning of ${listWords(ws)}. ${op} needs isEnd, and isEnd is false.`;
  }
  if (kind === 'prefix') {
    const ws = below(s, text);
    return `startsWith asks only whether a stored word passes through ${q(text)} — and ${q(ws[0])} does. No bloom needed.`;
  }
  return `A bloom hangs on ${q(text)}: it was inserted. search returns true.`;
}
function queryApply(s: TrieState, action: string) {
  if (action === 'step') {
    const c = s.queries[s.qi].text[s.pos];
    s.at = s.nodes[s.at].kids[c];
    s.pos++;
    s.message = `Walked the ${q(c)} branch to ${q(s.nodes[s.at].prefix)}.`;
  } else if (action === 'true' || action === 'false') {
    const { kind, text } = s.queries[s.qi], op = kind === 'search' ? 'search' : 'startsWith', value = action === 'true';
    const why = s.pos < text.length
      ? `no ${q(text[s.pos])} branch under ${name(s.nodes[s.at].prefix)}`
      : kind === 'prefix' ? 'the walk finished, so a stored word passes through here'
        : value ? 'the walk finished on a bloom' : 'the walk finished on a node with no bloom';
    s.answers.push(value);
    s.message = `${op}(${q(text)}) = ${value}: ${why}.`;
    s.qi++; s.pos = 0; s.at = 0;
  } else {
    s.done = true;
    s.message = s.queries.length ? `Answers: ${s.answers.join(', ')}. One walk per question, O(L) each.` : 'No questions.';
  }
}
function queryView(s: TrieState): LabRow[] {
  const cur = s.qi < s.queries.length ? s.queries[s.qi] : null;
  return [
    wordRow(cur ? `${cur.kind === 'search' ? 'search' : 'startsWith'}(…) letters` : 'Query', cur ? cur.text : '', s.pos, 'NEXT'),
    ...gardenRows(s, id => (id === s.at && !s.done && cur ? 'hot' : s.nodes[id].end ? 'done' : undefined)),
    { name: 'Answers given', empty: 'None yet', cells: s.answers.map((a, i) => ({ value: String(a), label: `${s.queries[i].kind === 'search' ? 'search' : 'starts'} ${s.queries[i].text}`, tone: 'done' })) },
  ];
}
function queryDescribe(s: TrieState) {
  if (s.done) return `Done. Answers: [${s.answers.join(', ')}].`;
  if (s.qi >= s.queries.length) return 'Every question is answered.';
  const { kind, text } = s.queries[s.qi];
  return `Question ${s.qi + 1} of ${s.queries.length}: ${kind === 'search' ? 'search' : 'startsWith'}(${q(text)}). ${s.pos} of ${text.length} letters walked; you stand on ${name(s.nodes[s.at].prefix)}.`;
}

// ---------- wildcard search ----------
const kidLetters = (n: GNode) => Object.keys(n.kids).sort();
const top = (s: TrieState) => s.stack[s.stack.length - 1];
function wildExpected(s: TrieState) {
  const f = top(s), node = s.nodes[f.node];
  const backOrNone = s.stack.length === 1 ? 'none' : 'back';
  if (f.i === s.pattern.length) return node.end ? 'found' : backOrNone;
  const c = s.pattern[f.i];
  if (c !== '.') return f.next === 0 && node.kids[c] !== undefined ? 'step' : backOrNone;
  return f.next < kidLetters(node).length ? 'branch' : backOrNone;
}
function wildReject(s: TrieState, action: string) {
  const f = top(s), node = s.nodes[f.node], expected = wildExpected(s);
  const at = name(node.prefix), len = s.pattern.length, c = s.pattern[f.i];
  const retreat = s.stack.length === 1 ? 'Nothing else can match: answer false.' : 'Back up.';
  const untried = () => c === '.'
    ? `Child ${q(kidLetters(node)[f.next])} of ${at} hasn’t been tried yet. Giving up on ${at} now could miss a match below it.`
    : `The ${q(c)} branch under ${at} exists and hasn’t been explored. Giving up now could miss a match.`;
  const match = `All ${len} pattern letters are matched and a bloom hangs on ${q(node.prefix)}. That is a match: answer true.`;
  if (action === 'found') {
    if (f.i < len) return `Only ${f.i} of ${len} pattern letters are matched. Keep going.`;
    return `All ${len} pattern letters are matched, but no word ends at ${q(node.prefix)}: it is only a beginning. A dot matches exactly one letter, so the lengths must agree. Back up.`;
  }
  if (action === 'back') {
    if (expected === 'none') return 'This is the root: there is nowhere to back up to. Every branch has failed, so the answer is false.';
    if (expected === 'found') return match;
    return untried();
  }
  if (action === 'none') {
    if (expected === 'back') return `You stand on ${at}, not on the root. Back up first: ${name(s.nodes[s.stack[s.stack.length - 2].node].prefix)} may still have untried branches.`;
    if (expected === 'found') return match;
    return untried();
  }
  if (f.i === len) return `The pattern is used up (${len} letters matched); there is no letter left to step on. ${node.end ? 'A bloom hangs here.' : 'No word ends here.'}`;
  if (action === 'step') {
    if (c === '.') return `Position ${f.i} is a dot: any letter fits, so there is no single branch to follow. Try the children one at a time.`;
    if (f.next > 0) return `You already explored the ${q(c)} branch from ${at}, and it failed. ${retreat}`;
    return `No ${q(c)} branch grows under ${at}. This path is dead. ${retreat}`;
  }
  // branch
  if (c !== '.') {
    const wrong = kidLetters(node).filter(x => x !== c);
    return `Position ${f.i} is the letter ${q(c)}, not a dot. Only the ${q(c)} branch can match${wrong.length ? `; entering ${listWords(wrong)} would match words with a different letter here` : ''}.`;
  }
  return `Every child of ${at} has been tried (${listWords(kidLetters(node)) || 'there were none'}). ${retreat}`;
}
function wildApply(s: TrieState, action: string) {
  const f = top(s), node = s.nodes[f.node];
  if (action === 'step' || action === 'branch') {
    const letter = action === 'step' ? s.pattern[f.i] : kidLetters(node)[f.next];
    const child = node.kids[letter];
    f.next = action === 'step' ? 1 : f.next + 1;
    s.stack.push({ node: child, i: f.i + 1, next: 0 });
    s.visited++;
    s.message = action === 'step'
      ? `Followed ${q(letter)} to ${q(s.nodes[child].prefix)}: the pattern names this letter, so it is the only branch.`
      : `The dot tries child ${q(letter)}: now at ${q(s.nodes[child].prefix)}. If this fails, the next child gets its turn.`;
  } else if (action === 'back') {
    s.stack.pop();
    s.dead.push(f.node);
    s.message = f.i === s.pattern.length
      ? `Backed out of ${q(node.prefix)}: the pattern ends here, but no word does.`
      : `Backed out of ${q(node.prefix)}: nothing below it spells the rest of the pattern, “${s.pattern.slice(f.i)}”.`;
  } else if (action === 'found') {
    s.done = true; s.result = true;
    s.message = `Match: ${q(node.prefix)} fits “${s.pattern}”. search returns true after visiting ${s.visited} node(s); the remaining branches are never touched.`;
  } else {
    s.done = true; s.result = false;
    s.message = `No stored word fits “${s.pattern}”. search returns false after visiting ${s.visited} node(s).`;
  }
}
function wildView(s: TrieState): LabRow[] {
  const f = top(s);
  const onPath = new Set(s.stack.map(x => x.node));
  return [
    wordRow('Pattern', s.pattern, s.done ? s.pattern.length : f.i, 'NEXT'),
    { name: 'Search path (root first)', cells: s.stack.map((x, k) => ({ value: k === 0 ? '·' : s.nodes[x.node].ch, label: k === 0 ? 'root' : s.nodes[x.node].prefix, tone: k === s.stack.length - 1 ? 'hot' : 'done' })), join: '→' },
    ...gardenRows(s, id => (id === f.node && !s.done ? 'hot' : onPath.has(id) ? 'done' : s.dead.includes(id) ? 'out' : undefined)),
  ];
}
function wildDescribe(s: TrieState) {
  if (s.done) return `search(“${s.pattern}”) = ${s.result}.`;
  const f = top(s), at = name(s.nodes[f.node].prefix);
  if (f.i === s.pattern.length) return `Pattern used up at ${at}. Does a word end here?`;
  const c = s.pattern[f.i];
  return `Pattern “${s.pattern}”: ${f.i} of ${s.pattern.length} matched, standing on ${at}. Next: ${c === '.' ? `a dot — ${kidLetters(s.nodes[f.node]).length - f.next} untried child(ren)` : `the letter ${q(c)}`}.`;
}

export const lab = makeLab<TrieState>({
  insert: {
    name: 'Plant words: follow, grow, bloom',
    cases: insertCases.length,
    actions: [
      { action: 'follow', label: 'Follow the existing branch' },
      { action: 'grow', label: 'Grow a new branch' },
      { action: 'bloom', label: 'Tie the bloom (isEnd = true)' },
      { action: 'finish', label: 'Every word is planted' },
    ],
    create: v => fromInput({ mode: 'insert', words: insertCases[v] }),
    expected: insertExpected,
    apply: insertApply,
    reject: insertReject,
    view: insertView,
    describe: insertDescribe,
  },
  query: {
    name: 'search vs startsWith: one walk, one flag',
    cases: queryCases.length,
    actions: [
      { action: 'step', label: 'Walk the next letter’s branch' },
      { action: 'true', label: 'Answer true' },
      { action: 'false', label: 'Answer false' },
      { action: 'finish', label: 'No questions left' },
    ],
    create: v => fromInput({ mode: 'query', ...queryCases[v] }),
    expected: queryExpected,
    apply: queryApply,
    reject: queryReject,
    view: queryView,
    describe: queryDescribe,
  },
  wildcard: {
    name: 'Wildcard search: branch at every dot',
    cases: wildCases.length,
    actions: [
      { action: 'step', label: 'Follow the letter’s one branch' },
      { action: 'branch', label: 'Dot: try the next untried child' },
      { action: 'back', label: 'Dead end: back up one node' },
      { action: 'found', label: 'Word ends here: answer true' },
      { action: 'none', label: 'Every branch failed: answer false' },
    ],
    create: v => fromInput({ mode: 'wildcard', ...wildCases[v] }),
    expected: wildExpected,
    apply: wildApply,
    reject: wildReject,
    view: wildView,
    describe: wildDescribe,
  },
}, 'Gold = where you stand · green = a word ends here (✓) or already walked · faded = backed out of');
