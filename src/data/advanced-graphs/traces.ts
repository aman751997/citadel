// Decision puzzles and railway-map figures for the Advanced Graphs lesson (src/dsa-lessons/advanced-graphs.mdx).
// Every number here is re-derived independently in tests/advanced-graphs.test.ts.
import { row, step } from '../../lib/trace.ts';

// ---------- Railway-map figures (rendered by the <Rail> helper exported inside the lesson) ----------
export type Tone = 'gold' | 'blue' | 'green' | 'purple' | 'red' | 'dim';
export interface RailNode { id: string; x: number; y: number; label?: string; note?: string; tone?: Tone }
export interface RailEdge { from: string; to: string; label?: string; dir?: boolean; tone?: Tone; dashed?: boolean; bend?: number }
export interface RailFigure { width: number; height: number; nodes: RailNode[]; edges: RailEdge[] }

const node = (id: string, x: number, y: number, extra: Partial<RailNode> = {}): RailNode => ({ id, x, y, ...extra });
const arrow = (from: string, to: string, extra: Partial<RailEdge> = {}): RailEdge => ({ from, to, dir: true, ...extra });
const track = (from: string, to: string, extra: Partial<RailEdge> = {}): RailEdge => ({ from, to, dir: false, ...extra });

// Points of Min Cost to Connect All Points, LeetCode example 1, drawn at x·44 + 40, y = 210 − y·18.
export const mstPoints: [number, number][] = [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]];
const px = (p: [number, number]) => p[0] * 44 + 40;
const py = (p: [number, number]) => 210 - p[1] * 18;

export const figures: Record<string, RailFigure> = {
  // Chapter 1: prerequisites [[1,0],[2,0],[3,1],[3,2]] drawn as tracks b → a, noted with in-degrees.
  diamond: {
    width: 420, height: 170,
    nodes: [node('0', 50, 85, { note: 'in 0', tone: 'green' }), node('1', 200, 35, { note: 'in 1' }), node('2', 200, 135, { note: 'in 1' }), node('3', 350, 85, { note: 'in 2' })],
    edges: [arrow('0', '1'), arrow('0', '2'), arrow('1', '3'), arrow('2', '3')],
  },
  // Chapter 1: prerequisites [[1,0],[1,2],[2,1]] — 1 and 2 wait on each other.
  stuck: {
    width: 420, height: 150,
    nodes: [node('0', 50, 75, { note: 'popped', tone: 'green' }), node('1', 200, 75, { note: 'in 2 → 1', tone: 'red' }), node('2', 350, 75, { note: 'in 1', tone: 'red' })],
    edges: [arrow('0', '1'), arrow('1', '2', { bend: -28, tone: 'red' }), arrow('2', '1', { bend: -28, tone: 'red' })],
  },
  // Chapter 3: ["wrt","wrf","er","ett","rftt"] gives t→f, w→e, r→t, e→r.
  alien: {
    width: 470, height: 120,
    nodes: [node('w', 40, 55, { tone: 'green', note: 'in 0' }), node('e', 135, 55, { note: 'in 1' }), node('r', 230, 55, { note: 'in 1' }), node('t', 325, 55, { note: 'in 1' }), node('f', 420, 55, { note: 'in 1' })],
    edges: [arrow('w', 'e', { label: 'wrf | er' }), arrow('e', 'r', { label: 'ett | rftt' }), arrow('r', 't', { label: 'er | ett' }), arrow('t', 'f', { label: 'wrt | wrf' })],
  },
  // Chapter 4: parent pointers before find(4): 4 → 3 → 1 → 0 and 2 → 0.
  forestBefore: {
    width: 330, height: 200,
    nodes: [node('0', 165, 30, { tone: 'gold', note: 'root' }), node('1', 100, 90), node('2', 240, 90), node('3', 100, 145), node('4', 100, 190, { tone: 'blue' })],
    edges: [arrow('1', '0'), arrow('2', '0'), arrow('3', '1'), arrow('4', '3')],
  },
  // Chapter 4: after find(4) with path compression, every node on the walk points at the root.
  forestAfter: {
    width: 330, height: 120,
    nodes: [node('0', 165, 30, { tone: 'gold', note: 'root' }), node('1', 40, 95), node('2', 125, 95), node('3', 205, 95), node('4', 290, 95, { tone: 'blue' })],
    edges: [arrow('1', '0'), arrow('2', '0'), arrow('3', '0', { tone: 'green' }), arrow('4', '0', { tone: 'green' })],
  },
  // Chapter 5: n = 4, [[0,1],[1,2],[2,0]] — n − 1 edges but a loop, and junction 3 alone.
  loopAndIsland: {
    width: 330, height: 150,
    nodes: [node('0', 60, 40), node('1', 200, 40), node('2', 130, 120), node('3', 285, 120, { tone: 'red', note: 'alone' })],
    edges: [track('0', '1'), track('1', '2'), track('2', '0', { tone: 'red', label: 'closes loop' })],
  },
  // Chapter 5: n = 4, [[0,1],[2,3]] — no loop, but two pieces.
  twoPieces: {
    width: 330, height: 110,
    nodes: [node('0', 40, 50), node('1', 120, 50), node('2', 210, 50), node('3', 290, 50)],
    edges: [track('0', '1'), track('2', '3')],
  },
  // Chapter 6: [[1,2],[2,3],[3,4],[1,4],[1,5]] — [1,4] is the first edge whose ends already share a root.
  surplus: {
    width: 360, height: 180,
    nodes: [node('1', 70, 50, { tone: 'gold' }), node('2', 200, 50), node('3', 200, 150), node('4', 70, 150), node('5', 320, 100, { tone: 'dim' })],
    edges: [track('1', '2', { label: '#1' }), track('2', '3', { label: '#2' }), track('3', '4', { label: '#3' }), track('1', '4', { label: '#4', tone: 'red', dashed: true }), track('1', '5', { label: '#5', bend: 40 })],
  },
  // Chapter 7: edges 0→1 (4), 0→2 (1), 2→1 (2), 1→3 (1), 2→3 (5); final dist [0, 3, 1, 4].
  mail: {
    width: 420, height: 200,
    nodes: [node('0', 50, 100, { note: 'dist 0', tone: 'gold' }), node('1', 210, 40, { note: 'dist 3' }), node('2', 210, 165, { note: 'dist 1' }), node('3', 370, 100, { note: 'dist 4' })],
    edges: [arrow('0', '1', { label: '4', dashed: true, tone: 'dim' }), arrow('0', '2', { label: '1', tone: 'green' }), arrow('2', '1', { label: '2', tone: 'green' }), arrow('1', '3', { label: '1', tone: 'green' }), arrow('2', '3', { label: '5', dashed: true, tone: 'dim' })],
  },
  // Chapter 7: A→B 2, A→C 3, C→B −2. Dijkstra settles B at 2; the true cheapest fare is 1.
  negative: {
    width: 380, height: 170,
    nodes: [node('A', 50, 85, { note: '0', tone: 'gold' }), node('B', 300, 40, { note: 'settled 2, true 1', tone: 'red' }), node('C', 300, 140, { note: '3' })],
    edges: [arrow('A', 'B', { label: '2' }), arrow('A', 'C', { label: '3' }), arrow('C', 'B', { label: '−2', tone: 'red' })],
  },
  // Chapter 8: the minimum spanning tree of LeetCode example 1: 4 + 3 + 4 + 9 = 20.
  cable: {
    width: 400, height: 240,
    nodes: mstPoints.map((p, i) => node(`p${i}`, px(p), py(p), { note: `(${p[0]}, ${p[1]})`, tone: i === 0 ? 'gold' : undefined })),
    edges: [track('p0', 'p1', { label: '4', tone: 'green' }), track('p1', 'p3', { label: '3', tone: 'green' }), track('p3', 'p4', { label: '4', tone: 'green' }), track('p1', 'p2', { label: '9', tone: 'green' })],
  },
  // Chapter 9: flights [[0,1,100],[1,2,100],[0,2,500]], src 0, dst 2.
  tickets: {
    width: 420, height: 160,
    nodes: [node('0', 50, 110, { tone: 'gold', note: 'src' }), node('1', 210, 40), node('2', 370, 110, { tone: 'blue', note: 'dst' })],
    edges: [arrow('0', '1', { label: '100' }), arrow('1', '2', { label: '100' }), arrow('0', '2', { label: '500' })],
  },
  // Side quest 1: graph = [[1,2],[2,3],[5],[0],[5],[],[]] — safe stations 2, 4, 5, 6.
  safe: {
    width: 430, height: 200,
    nodes: [node('0', 50, 50, { tone: 'red' }), node('1', 170, 50, { tone: 'red' }), node('2', 290, 50, { tone: 'green' }), node('3', 110, 150, { tone: 'red' }), node('4', 290, 150, { tone: 'green' }), node('5', 400, 100, { tone: 'green', note: 'dead end' }), node('6', 400, 180, { tone: 'green', note: 'dead end' })],
    edges: [arrow('0', '1'), arrow('0', '2', { bend: -30 }), arrow('1', '2'), arrow('1', '3'), arrow('2', '5'), arrow('3', '0', { tone: 'red' }), arrow('4', '5')],
  },
  // Side quest 4: a / b = 2 and b / c = 3 as weighted parent pointers; after compression a → c carries 6.
  ratios: {
    width: 420, height: 150,
    nodes: [node('a', 50, 50), node('b', 210, 50), node('c', 370, 50, { tone: 'gold', note: 'root' })],
    edges: [arrow('a', 'b', { label: 'a/b = 2' }), arrow('b', 'c', { label: 'b/c = 3' }), arrow('a', 'c', { label: 'a/c = 6', bend: 46, tone: 'green', dashed: true })],
  },
};

// ---------- Decision puzzles ----------

export const kahnSteps = [
  step('Prerequisites [[1,0],[2,0],[3,1],[3,2]]; the pair [a, b] means “take b before a”. Which way does the track for [3, 1] run, and how many tracks run into course 3?',
    [row('Course', [0, 1, 2, 3], { 3: '?' })], 0, [
      ['1 → 3, and course 3 has in-degree 2 (from 1 and from 2)', 'Yes. [3, 1] says 1 comes first, so the track runs 1 → 3. [3, 2] adds 2 → 3. Course 3 waits on two unfinished courses.'],
      ['3 → 1, and course 1 has in-degree 2', 'That reverses the rule. [a, b] means b is the prerequisite, so the track starts at b. Reversed tracks give a reversed order: you would schedule course 3 first.'],
      ['1 → 3, and course 3 has in-degree 1', 'Course 3 also waits on course 2, because of [3, 2]. Miss that and 3 becomes “ready” while 2 is still unbuilt.'],
    ]),
  step('In-degrees start at [0, 1, 1, 2], so Ready holds [0]. You pop 0 and cut its tracks 0 → 1 and 0 → 2. What does Ready hold now?',
    [row('In-degree', [0, 1, 1, 2], { 0: 'pop' }, { tones: { 0: 'done' } }), row('Ready', [0], {}, { tones: { 0: 'hot' } })], 1, [
      ['[1, 2, 3]: everything 0 pointed toward, and beyond', 'Course 3 still has in-degree 2: it waits on 1 and 2, which are not built yet. Only stations that drop to 0 may board.'],
      ['[1, 2]: both dropped from 1 to 0', 'Yes. Cutting 0 → 1 and 0 → 2 brings both to zero. Course 3 stays at 2 until both of its prerequisites are popped.'],
      ['[]: nothing is ready until 3 is done', 'Readiness flows forward, from prerequisites to the courses that need them. 1 and 2 needed only 0, which is now done.'],
    ]),
  step('Three courses, prerequisites [[1,0],[1,2],[2,1]]. You pop 0; course 1 drops from in-degree 2 to 1. Ready is now empty, with 1 of 3 courses taken. What do you report?',
    [row('In-degree', [0, 1, 1], { 0: 'taken' }, { tones: { 0: 'done', 1: 'out', 2: 'out' } }), row('Ready', [])], 1, [
      ['true: course 0 was taken, so the rest will follow', 'Nothing will follow. Ready is empty, so no further pop can happen, and two courses are still unplaced.'],
      ['false: 1 waits on 2 and 2 waits on 1, so neither can ever reach in-degree 0', 'Yes. Leftover courses mean a cycle (or something downstream of one). Each course on the loop waits for the one before it, forever.'],
      ['Pop course 1 anyway: it has only one unmet prerequisite left', '“Only one” is not zero. Taking 1 now would schedule it before course 2, which [1, 2] forbids.'],
    ]),
];

export const orderSteps = [
  step('Same four courses: tracks 0 → 1, 0 → 2, 1 → 3, 2 → 3. Kahn’s algorithm pops 0, 1, 2, 3. Would [0, 2, 1, 3] also be accepted?',
    [row('Kahn’s order', [0, 1, 2, 3], {}, { join: '→' }), row('Proposed', [0, 2, 1, 3], {}, { join: '→' })], 0, [
      ['Yes: every track still points forward (0 before 1 and 2; 1 and 2 before 3)', 'Yes. An order is valid exactly when every track goes from earlier to later. 1 and 2 have no track between them, so either may go first.'],
      ['No: the order must be unique', 'Most prerequisite maps allow many orders. The judge checks that every rule is respected, not that you matched one list.'],
      ['No: 1 must come before 2 because 1 < 2', 'Course numbers are labels, not rules. No pair [2, 1] or [1, 2] exists, so they are free relative to each other.'],
    ]),
  step('Two courses, prerequisites [[1, 0]]. You build the track as a → b instead of b → a and run Kahn’s algorithm. What comes out?',
    [row('Pair', ['[1, 0]'])], 1, [
      ['[0, 1]: Kahn’s algorithm fixes the direction itself', 'The algorithm trusts the tracks you give it. With 1 → 0, course 1 has in-degree 0 and is popped first.'],
      ['[1, 0]: course 1 before its own prerequisite, which is wrong', 'Yes. A reversed graph is still acyclic, so nothing crashes and Course Schedule I even passes. Only the order gives you away: it comes out exactly backwards.'],
      ['[]: the reversed track is a cycle', 'One track cannot form a cycle in either direction. The output is a full order, just the wrong one.'],
    ]),
  step('Four courses, tracks 0 → 1, 1 → 2, 2 → 3, 3 → 2. Kahn’s algorithm placed [0, 1]; Ready is empty; 2 and 3 wait on each other. What does findOrder return?',
    [row('Placed', [0, 1], {}, { tones: { 0: 'done', 1: 'done' } }), row('Stuck', [2, 3], {}, { tones: { 0: 'out', 1: 'out' } })], 2, [
      ['[0, 1]: the courses that could be taken', 'The problem asks for an order of ALL courses, or an empty array if none exists. A partial list is a wrong answer, not a partial credit.'],
      ['[0, 1, 2, 3]: append the stuck ones at the end', 'Putting 2 before 3 breaks the rule 3 → 2, and the reverse breaks 2 → 3. No placement of the stuck pair is valid.'],
      ['An empty array: fewer than 4 courses were placed, so no valid order exists', 'Yes. Check the count before returning: placed < n means a cycle, and the answer is int[0].'],
    ]),
];

export const alienSteps = [
  step('Words in alien order: "wrt", "wrf", "er", "ett", "rftt". Compare the neighbours "wrf" and "er". What do they prove?',
    [row('wrf', ['w', 'r', 'f'], { 0: 'differs' }, { tones: { 0: 'hot' } }), row('er', ['e', 'r'], { 0: 'differs' }, { tones: { 0: 'hot' } })], 0, [
      ['w comes before e, and nothing else', 'Yes. The first difference decides the order of the two words. Every later letter is irrelevant to how these two were sorted.'],
      ['w before e, and also r before r and f before nothing', 'Once the first letters differ, the dictionary never looked further. Letters after the first difference carry no information.'],
      ['Nothing, because they share no prefix', 'Sharing a prefix is not required. Here the first letters already differ, and that difference is the rule.'],
    ]),
  step('The four neighbour pairs give t → f, w → e, r → t, e → r. Which letter has in-degree 0, and what alphabet comes out?',
    [row('Letter', ['w', 'e', 'r', 't', 'f']), row('In-degree', [0, 1, 1, 1, 1], {}, { tones: { 0: 'hot' } })], 1, [
      ['f, because it appears last in the last word', 'Position inside words is not a rule. f has a track into it (t → f), so it cannot come first.'],
      ['w, and the order is "wertf"', 'Yes. w is the only letter nothing points to. Popping w frees e, then r, then t, then f.'],
      ['Several letters tie, so any order of all five works', 'Only w has in-degree 0 at the start, and each pop frees exactly one letter. This alphabet is fully determined.'],
    ]),
  step('Words: "abc", then "ab". The shorter word is a prefix of the longer one, but listed after it. What do you return?',
    [row('abc', ['a', 'b', 'c'], {}, { tones: { 2: 'out' } }), row('ab', ['a', 'b'])], 2, [
      ['Skip the pair: no letter differs, so it gives no rule', 'There is no rule to add, but there is a contradiction to report. In every alphabet a prefix sorts before the longer word.'],
      ['"abc": c simply comes last', 'No alphabet can place "abc" before "ab". Returning any order claims the list is sortable, and it is not.'],
      ['"": no letter order can put a word before its own prefix', 'Yes. This check happens before any sorting. It is the case most solutions forget.'],
    ]),
];

export const componentSteps = [
  step('Five junctions, parent = [0, 1, 2, 3, 4]. union(0, 1) made parent[1] = 0 (clan 0 now has size 2). The next track is (1, 2). find(1) = 0 and find(2) = 2. What do you set?',
    [row('parent', [0, 0, 2, 3, 4], { 0: 'root', 2: 'root' }, { tones: { 0: 'hot', 2: 'hot' } }), row('size', [2, 1, 1, 1, 1])], 0, [
      ['parent[2] = 0: the smaller clan’s head joins the larger clan’s head', 'Yes. Always link root to root, smaller under larger. Trees stay shallow: a node only gets deeper when its clan at least doubles.'],
      ['parent[1] = 2: point the edge’s first end at the second', 'Re-pointing 1 tears it out of clan 0. Junction 0 would sit alone with root 0, while 1 and 2 share root 2. The register would claim 0 and 1 are unconnected.'],
      ['parent[0] = 2: the bigger clan joins the smaller', 'Connectivity stays right, but the bigger clan sinks a level. Do that every time and a chain of n junctions can reach height n − 1, so every find costs O(n).'],
    ]),
  step('All three tracks (0,1), (1,2), (3,4) are processed: parent = [0, 0, 0, 3, 3]. How many separate networks are there?',
    [row('parent', [0, 0, 0, 3, 3], { 0: 'root', 3: 'root' }, { tones: { 0: 'done', 3: 'done' } })], 1, [
      ['3, one per track', 'Tracks merge clans; they don’t create them. Every successful union removes exactly one clan.'],
      ['2: start with 5 clans, and three successful unions remove 3', 'Yes. Count = n − (successful unions) = 5 − 3 = 2. Equivalently, count the roots: 0 and 3.'],
      ['1: every junction has a parent', 'A root is its own parent. Two junctions here, 0 and 3, are roots, so there are two clans.'],
    ]),
  step('A register merged carelessly (no size rule) has parent = [0, 0, 1, 2]: find(3) walks 3 → 2 → 1 → 0. With path compression, what does parent look like afterwards?',
    [row('parent', [0, 0, 1, 2], { 3: 'find' }, { tones: { 3: 'hot' } })], 2, [
      ['[0, 0, 1, 2]: find only reads', 'Plain find only reads. Path compression rewrites every node it walked through, so the next find is one hop.'],
      ['[0, 0, 1, 0]: only the starting node is re-pointed', 'Recursive compression re-points every node on the walk, not just the first. Node 2 would still be two hops from the root.'],
      ['[0, 0, 0, 0]: every node on the walk now points at the root', 'Yes. 3, 2 and 1 all point straight at 0. That rewrite is what makes later finds near-constant.'],
    ]),
];

export const treeSteps = [
  step('n = 5, tracks [[0,1],[0,2],[0,3],[1,4]]. That is 4 = n − 1 tracks, and no union failed. Is it a tree?',
    [row('Track', ['0–1', '0–2', '0–3', '1–4'], {}, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'done' } })], 0, [
      ['Yes: n − 1 tracks and no cycle force a single connected piece', 'Yes. A forest with c pieces has exactly n − c tracks. With n − 1 tracks, c = 1.'],
      ['Not yet: you must also run a BFS to check connectivity', 'No extra pass is needed. n − 1 tracks and no cycle already imply connected (a forest with c pieces has n − c tracks).'],
      ['No: a tree needs a root', 'An undirected tree has no designated root. Any junction can serve as one.'],
    ]),
  step('n = 4, tracks [[0,1],[1,2],[2,0]]. That is 3 = n − 1 tracks. Tree?',
    [row('Track', ['0–1', '1–2', '2–0'], {}, { tones: { 2: 'out' } })], 1, [
      ['Yes: the count is exactly n − 1', 'The count is necessary, not sufficient. Here the third track closes a loop, and junction 3 is left alone.'],
      ['No: union(2, 0) finds both ends already joined, so it closes a cycle (and 3 is cut off)', 'Yes. A loop wastes a track, so one junction must go unconnected. Both checks are needed.'],
    ]),
  step('n = 4, tracks [[0,1],[2,3]]. No union fails. Tree?',
    [row('Track', ['0–1', '2–3'])], 1, [
      ['Yes: no cycle', 'No cycle makes it a forest. A tree is a forest with exactly one piece, and this one has two.'],
      ['No: 2 tracks, not n − 1 = 3, so it is two separate pieces', 'Yes. The edge-count check catches the disconnection immediately, before any union runs.'],
    ]),
];

export const redundantSteps = [
  step('Tracks in order [1,2], [2,3], [3,4], [1,4], [1,5]. The first three joined 1, 2, 3, 4 into one clan. Track [1,4] arrives: find(1) and find(4) return the same root. What now?',
    [row('Track #', ['1–2', '2–3', '3–4', '1–4', '1–5'], { 3: 'now' }, { tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'hot' } })], 0, [
      ['Return [1, 4]: it closes the loop 1–2–3–4–1', 'Yes. Its ends were already connected, so it is the track that turned the tree into a loop.'],
      ['Union them anyway and keep going', 'Union would do nothing (same root), and you would lose the one fact the problem asks for.'],
      ['Keep scanning in case a later track also closes a loop, and return the last one', 'Only one loop exists (a tree plus one track), so exactly one union fails. The first failure is already the answer.'],
    ]),
  step('Removing [1, 2], [2, 3], [3, 4] or [1, 4] would each break the loop. Why is [1, 4] the one to return?',
    [], 1, [
      ['It has the largest numbers', 'Labels don’t matter. The tie-break in the problem is about input position.'],
      ['The problem wants the loop track that appears last in the input, and the first track to fail union is always the loop’s last track', 'Yes. When a loop track fails union, every other track of the loop was already processed. So it is the latest of them.'],
      ['Removing [1, 2] would disconnect 2', 'Removing any single loop track keeps everything connected; the rest of the loop still links its ends.'],
    ]),
];

export const dijkstraSteps = [
  step('One-way roads 0→1 (4), 0→2 (1), 2→1 (2), 1→3 (1), 2→3 (5). You popped town 0. The heap holds (1, town 2) and (4, town 1). Which ticket do you take next?',
    [row('dist', [0, 4, 1, '∞'], { 0: 'done' }, { tones: { 0: 'done' } }), row('Heap', ['(1, 2)', '(4, 1)'], {}, { tones: { 0: 'hot' } })], 0, [
      ['(1, 2): the cheapest fare on the board', 'Yes. Every other route to 2 starts with a fare of at least 1 and only adds non-negative tolls, so 1 is final for town 2.'],
      ['(4, 1): it was offered first', 'First-come order is a plain queue. Town 1 might still be cheaper through 2, and here it is: 1 + 2 = 3.'],
      ['Both at once, they are one hop away', 'Hops don’t matter here; fares do. Dijkstra settles exactly one town at a time, the cheapest.'],
    ]),
  step('From town 2 (fare 1): road 2→1 costs 2 and 2→3 costs 5. Before relaxing, dist[1] = 4 and dist[3] = ∞. What is on the board afterwards?',
    [row('dist', [0, 4, 1, '∞'], { 2: 'here' }, { tones: { 0: 'done', 2: 'done' } })], 1, [
      ['dist[1] stays 4: town 1 already has a ticket', 'An earlier offer is not a final price. 1 + 2 = 3 beats 4, so the board must improve. (Locking a town when it is first offered is a classic bug.)'],
      ['dist[1] = 3, dist[3] = 6; push (3, 1) and (6, 3)', 'Yes. 1 + 2 = 3 beats 4, and 1 + 5 = 6 beats ∞. The old ticket (4, 1) stays in the heap; it is now stale.'],
      ['dist[1] = 2, dist[3] = 5', 'Those are the road tolls alone. A fare is the fare to reach 2 (1) plus the toll.'],
    ]),
  step('You popped (3, 1) and relaxed 1→3, so dist[3] = 4. The heap holds (4, 1), (4, 3) and (6, 3). You pop (4, 1), but dist[1] = 3. What now?',
    [row('dist', [0, 3, 1, 4], { 1: 'stale?' }, { tones: { 0: 'done', 1: 'done', 2: 'done' } }), row('Heap', ['(4, 3)', '(6, 3)'])], 0, [
      ['Skip it: 4 > dist[1] = 3, so this is a stale ticket', 'Yes. Town 1 was settled at 3. Relaxing from 4 can only offer fares 1 higher than ones already offered.'],
      ['Relax town 1’s roads again with fare 4', 'It never improves anything (4 + 1 = 5 is worse than 4 for town 3), but it repeats work. On dense graphs that repeated scanning adds up.'],
      ['Set dist[1] = 4: the newest ticket wins', 'The board only ever goes down. Writing 4 over 3 would undo a cheaper route already found.'],
    ]),
];

export const primSteps = [
  step('Points p0 (0,0), p1 (2,2), p2 (3,10), p3 (5,2), p4 (7,0); cable cost is Manhattan distance. The tree holds only p0. Cheapest links to the rest: p1 4, p2 13, p3 7, p4 7. Who joins next?',
    [row('best link', ['—', 4, 13, 7, 7], { 0: 'tree' }, { tones: { 0: 'done', 1: 'hot' } })], 0, [
      ['p1, for 4', 'Yes. 4 is the cheapest cable crossing from the tree to the rest, and the cut property says some cheapest network uses it.'],
      ['p3 and p4 together, they tie at 7', 'Ties are fine, but 7 is not the minimum while 4 is available. One point joins per round.'],
      ['p2, the farthest, to get the hard one done', 'Joining expensive points early only locks in a cost that a nearer neighbour may later undercut. Here p2 will later join through p1 for 9, not 13.'],
    ]),
  step('p1 (2,2) joins. Update each outside point with min(old, distance to p1): p2 → 9, p3 → 3, p4 → 7. Who joins next?',
    [row('best link', ['—', '—', 9, 3, 7], { 0: 'tree', 1: 'tree' }, { tones: { 0: 'done', 1: 'done', 3: 'hot' } })], 1, [
      ['p4, for 7', 'p4’s best is still 7, but p3 now costs only 3 through p1. Always the global minimum.'],
      ['p3, for 3', 'Yes. |2 − 5| + |2 − 2| = 3. Then p3 offers p4 a cable of |5 − 7| + |2 − 0| = 4, better than 7.'],
      ['p2, for 9', '9 is the largest remaining link. It joins last.'],
    ]),
  step('p3 joins for 3, then p4 joins through p3, then p2 through p1. What is the total?',
    [row('joined for', [0, 4, 9, 3, 4], {}, { tones: { 1: 'done', 2: 'done', 3: 'done', 4: 'done' } })], 0, [
      ['4 + 3 + 4 + 9 = 20', 'Yes, matching LeetCode’s answer. Four cables connect five points, and no cheaper set of four does.'],
      ['4 + 3 + 7 + 9 = 23', 'That joins p4 with its old offer of 7. When p3 joined, p4’s best link dropped to 4. Forgetting that update overpays.'],
      ['4 + 3 + 4 + 9 + 13 = 33', 'Five points need only four cables. The 13 to p2 was an offer that was beaten, never laid.'],
    ]),
];

export const flightSteps = [
  step('Flights 0→1 (100), 1→2 (100), 0→2 (500). From 0 to 2 with at most k = 0 stops. How many relaxation rounds do you run?',
    [row('Flight', ['0→1 · 100', '1→2 · 100', '0→2 · 500'])], 1, [
      ['0 rounds: no stops are allowed', 'Zero stops still allows one flight, the direct one. With 0 rounds you would never leave city 0.'],
      ['k + 1 = 1 round: at most one flight', 'Yes. k stops means at most k + 1 flights, and round r discovers fares that use r flights.'],
      ['n − 1 = 2 rounds, like textbook Bellman-Ford', 'n − 1 rounds find the cheapest fare with any number of flights. The stop limit is the whole point of this problem.'],
    ]),
  step('Round 1. Flight 0→1 has just set cost[1] = 100. Next comes flight 1→2. Which value of cost[1] may it read?',
    [row('prev (start of round)', [0, '∞', '∞']), row('cost (being written)', [0, 100, '∞'], { 1: 'just set' }, { tones: { 1: 'hot' } })], 1, [
      ['cost[1] = 100, so cost[2] = 200', 'That chains two flights (0→1→2) inside a round that allows one. With k = 0 you would answer 200, but the only legal ticket is the direct 500.'],
      ['prev[1] = ∞, so this flight offers nothing this round; cost[2] = 500 from 0→2', 'Yes. Reading only last round’s board guarantees each round adds at most one flight. The answer for k = 0 is 500.'],
    ]),
  step('Now k = 1: run a second round, again reading only from the snapshot taken at its start. What is the cheapest fare from 0 to 2?',
    [row('prev (start of round 2)', [0, 100, 500])], 2, [
      ['500: the direct flight is still cheapest', 'In round 2, 1→2 reads prev[1] = 100 and offers 200, which beats 500.'],
      ['100: the last flight’s price', 'A fare adds every flight on the itinerary: 100 + 100.'],
      ['200: 0→1→2, one stop', 'Yes. One stop is allowed now, and two flights at 100 each beat the direct 500.'],
    ]),
];

export const mixedReview = [
  step('Forty build jobs, and pairs “job b must finish before job a starts”. Is there an order that finishes everything?', [], 1, [
    ['Dijkstra from job 0', 'There are no costs to minimise and no single source. The question is about order and cycles.'],
    ['Kahn’s algorithm: count in-degrees, pop zeros; if any job is left over, a cycle blocks it', 'Yes. Order constraints on a directed graph are a topological sort. Leftovers mean a cycle.'],
    ['Union-find over the pairs', 'Union-find forgets direction. “a before b” and “b before a” look identical to it, so it cannot see a directed cycle.'],
  ]),
  step('Friend pairs arrive one at a time; after each, you must say whether two given people are now in the same circle.', [], 0, [
    ['Union-find: union each pair, compare roots for each question', 'Yes. Edges that only ever arrive, plus “same group?” questions, is exactly what union-find does in near-constant amortised time.'],
    ['A fresh BFS after every pair', 'Correct but O(V + E) per question. With 10⁵ pairs that is far too slow.'],
    ['Topological sort', 'Friendship has no direction and no order. You need grouping, not sequencing.'],
  ]),
  step('Cheapest delivery route from one depot, road tolls between 0 and 100.', [], 2, [
    ['Plain BFS', 'BFS minimises the number of roads, not the total toll. A two-road route can be cheaper than a one-road route.'],
    ['Bellman-Ford, because it is simpler', 'It works, but O(V · E) is slower than needed. With non-negative tolls, Dijkstra is the standard answer.'],
    ['Dijkstra: a min-heap of (fare, town), skipping stale tickets', 'Yes. Non-negative weights make “cheapest on the board” final when popped. O((V + E) log V).'],
  ]),
  step('Same roads, but some tolls are negative (refunds), and there is no negative loop.', [], 1, [
    ['Dijkstra still works if you skip stale tickets', 'A popped fare is no longer final: A→B 2, A→C 3, C→B −2 settles B at 2 although 1 is possible.'],
    ['Bellman-Ford: V − 1 rounds of relaxing every road', 'Yes. It never assumes a popped fare is final, so negative tolls are fine. A V-th round that still improves would reveal a negative loop.'],
    ['Take the absolute value of every toll', 'That changes the problem. A refund of 2 becomes a charge of 2, and the cheapest route changes.'],
  ]),
  step('Fewest flights between two cities; every flight “counts as one”.', [], 0, [
    ['Plain BFS, level by level', 'Yes. With equal weights the queue already pops in distance order. Dijkstra would work, but its heap adds a log factor for nothing.'],
    ['Dijkstra with all weights 1', 'Correct, just heavier than needed. BFS gives the same answer in O(V + E).'],
    ['Minimum spanning tree', 'An MST minimises the total cable to connect everyone, not the path between two given cities.'],
  ]),
  step('Lay cable so that all houses are connected, at least total cost. Is the tree of cheapest routes from house A the answer?', [], 1, [
    ['Yes: cheapest routes from A connect everyone cheaply', 'Counterexample: A–B 2, A–C 2, B–C 1. Cheapest routes from A use A–B and A–C, total 4. The cheapest network uses B–C plus one of the others, total 3.'],
    ['No: that is a shortest-path tree. Total cable needs an MST (Prim’s or Kruskal’s)', 'Yes. Shortest paths optimise each house’s distance from one source; an MST optimises the sum of all cables.'],
  ]),
  step('Cheapest flight with at most K stops, Bellman-Ford style. Why read from a copy of last round’s fares?', [], 2, [
    ['Copying makes it faster', 'Copying costs O(n) per round. It is about correctness, not speed.'],
    ['Java arrays cannot be read and written in the same loop', 'They can. That is exactly the bug: in-place writes are visible to later reads in the same round.'],
    ['Without it, one round can chain several flights, so the stop limit is silently exceeded', 'Yes. Round r must add at most one flight. 0→1 (100), 1→2 (100), 0→2 (500) with k = 0 returns 200 in place instead of 500.'],
  ]),
  step('Kahn’s algorithm on 7 jobs ends with 5 popped and an empty queue. What do you know?', [], 0, [
    ['The 2 leftover jobs lie on a cycle or wait on one, so no full order exists', 'Yes. A job is never popped only if something it waits for is never popped, and following that chain backwards must loop.'],
    ['You should restart from one of the leftover jobs', 'Restarting cannot help: every leftover job still has an unfinished prerequisite.'],
    ['The queue was too small', 'The queue holds whatever is ready. Its emptiness is information, not a capacity problem.'],
  ]),
  step('n junctions and exactly n − 1 two-way tracks. Is it automatically a tree?', [], 1, [
    ['Yes: a tree has n − 1 edges', 'Necessary, not sufficient. n = 4 with a triangle 0–1–2 and junction 3 alone also has 3 tracks.'],
    ['Only if there is also no cycle (equivalently, if it is connected)', 'Yes. n − 1 tracks plus either “no cycle” or “connected” implies the other. One union-find pass checks it.'],
  ]),
  step('Tracks are laid AND torn up over time, with “are x and y connected?” questions in between.', [], 2, [
    ['Union-find with a delete operation', 'Union-find has no delete. Once two clans merge, nothing records which track joined them.'],
    ['Union-find, re-run from scratch after every change', 'Correct but O(E) per change. Fine for tiny inputs only.'],
    ['Not plain union-find: process offline in reverse (deletions become unions), or use a dynamic-connectivity structure', 'Yes. Reversing time turns tear-ups into merges when all operations are known in advance. Truly online deletion needs heavier machinery.'],
  ]),
];
