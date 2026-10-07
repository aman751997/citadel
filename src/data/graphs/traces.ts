// Decision puzzles for the Graphs (Traversal) lesson. Every number here is re-derived in tests/graphs.test.ts.
import { row, step } from '../../lib/trace.ts';

// LeetCode Number of Islands, example 2
const lc2 = [[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 1]];

export const islands = [
  step('The scan reaches (0,0): land, and no flood has touched it. What now?',
    lc2.map((r, i) => row(`row ${i}`, r, i === 0 ? { 0: 'SCAN' } : {}, { tones: i === 0 ? { 0: 'hot' } : {} })), 0, [
      ['Count one island, then flood and mark every land square reachable from (0,0)', 'Yes. The flood claims (0,0), (0,1), (1,0) and (1,1) before the scan moves on, so none of them can be counted again.'],
      ['Count one island and move on to (0,1)', '(0,1) is land and still unmarked, so the scan would count it as a second island. Done for every land square, this chart would report 7 islands instead of 3.'],
      ['Mark (0,0) only, and count islands at the end by counting marked squares', 'That counts land squares (7), not islands. An island is a whole connected group; the flood is what groups them.'],
    ]),
  step('The first island has been sunk. The scan reaches (1,1), which now reads 0. Why is it safe to skip it?',
    [row('row 0', [0, 0, 0, 0, 0], {}, { tones: { 0: 'done', 1: 'done' } }),
      row('row 1', [0, 0, 0, 0, 0], { 1: 'SCAN' }, { tones: { 0: 'done', 1: 'hot' } }),
      row('row 2', lc2[2]), row('row 3', lc2[3])], 1, [
      ['It was water from the start', 'It was land — look at the original chart. It reads 0 because the first flood sank it.'],
      ['The flood from (0,0) sank it, so it belongs to an island already counted', 'Yes. A sunk square is a flagged square: its island was counted once, when the scan first touched it at (0,0).'],
      ['All of its neighbours are water', '(1,1) borders (0,1) and (1,0), which were land. Skipping is safe because of the flag, not because of the neighbours.'],
    ]),
  step('(2,2) and (3,3) are land and touch only at a corner. How many islands does the whole chart have?',
    lc2.map((r, i) => row(`row ${i}`, r, i === 2 ? { 2: 'A' } : i === 3 ? { 3: 'B' } : {}, { tones: i === 2 ? { 2: 'hot' } : i === 3 ? { 3: 'hot' } : {} })), 1, [
      ['2: (2,2) and (3,3) touch, so they are one island', 'Here only up, down, left and right join squares. A corner touch is not an edge in this graph.'],
      ['3: the first island, (2,2) alone, and (3,3) with (3,4)', 'Yes. Three floods, three islands. With eight directions the answer would be 2.'],
      ['7: one per land square', 'That counts squares. Each flood claims a whole island, so the count is the number of floods.'],
    ]),
];

export const maxArea = [
  step('Grid [[1, 1], [1, 1]], marking on push. You have popped (0,0) and (0,1); (1,0) waits in the stack. Popping (1,1), you look left at (1,0): land. Push it again?',
    [row('row 0', [1, 1], { 0: 'POPPED', 1: 'POPPED' }, { tones: { 0: 'done', 1: 'done' } }),
      row('row 1', [1, 1], { 0: 'IN STACK', 1: 'POPPING' }, { tones: { 0: 'ghost', 1: 'hot' } })], 0, [
      ['No: it was marked when it was pushed. The area comes out 4', 'Yes. Marked on push means “already promised”. Each square is pushed once, popped once and counted once.'],
      ['Yes: it is land and it borders (1,1)', 'Then (1,0) sits in the stack twice and is counted twice: area 5 for a 4-square island. That is exactly what marking on pop does.'],
      ['Yes, and subtract 1 from the area to make up for it', 'Patching the count doesn’t fix the cause, and on bigger islands a square can be pushed by up to four neighbours.'],
    ]),
  step('A 1000 × 1000 grid, all land, in Java. Which flood do you write?', [], 1, [
    ['Recursive DFS: it is O(R·C) either way', 'Time is the same, but every pending square is a call frame. A million nested frames overflows Java’s default stack — this lesson’s checker shows the recursive sink throwing StackOverflowError on exactly this grid.'],
    ['An explicit stack (or a queue) on the heap, marking on push', 'Yes. Same O(R·C) time; the unfinished work lives in an ArrayDeque, which can hold a million entries. The checker gets 1,000,000.'],
    ['Recursive DFS that marks squares after its recursive calls return', 'Marking late doesn’t make the recursion shallower — it makes it infinite, because neighbours call each other back.'],
  ]),
];

export const shortestPath = [
  step('Grid [[0, 0, 0], [1, 1, 0], [1, 1, 0]], eight directions. Ring 2 is just (0,1). Polling it, you find (0,2) and (1,2) open and unflagged — (1,2) is diagonal. What do you do?',
    [row('row 0', ['1', '2', '0'], { 1: 'POLLED' }, { tones: { 0: 'done', 1: 'hot' } }),
      row('row 1', ['█', '█', '0'], {}, { tones: { 0: 'out', 1: 'out' } }),
      row('row 2', ['█', '█', '0'], { 2: 'GOAL' }, { tones: { 0: 'out', 1: 'out' } })], 0, [
      ['Flag both now and enqueue them: both are ring 3', 'Yes. Flag on enqueue. Both are one move from (0,1), so both get length 3.'],
      ['Enqueue both, and flag each one when it is polled', 'Then (0,2), polled first, sees (1,2) still unflagged and enqueues it a second time. The answer survives here, but duplicates pile up — on a 10 × 10 open grid, 181 entries instead of 100, or 184,755 if duplicates also expand.'],
      ['Enqueue only (0,2): one route forward is enough', 'Then (1,2) is first reached from (0,2), one ring too late, as ring 4 — and the goal (2,2) comes out as 5 instead of 4.'],
    ]),
  step('The goal (2,2) is discovered from (1,2) in ring 4. Could a later ring still find a shorter route to it?',
    [row('row 0', ['1', '2', '3'], {}, { tones: { 0: 'done', 1: 'done', 2: 'done' } }),
      row('row 1', ['█', '█', '3'], {}, { tones: { 0: 'out', 1: 'out', 2: 'done' } }),
      row('row 2', ['█', '█', '4'], { 2: 'GOAL' }, { tones: { 0: 'out', 1: 'out', 2: 'hot' } })], 1, [
      ['Yes: keep searching and take the minimum at the end', 'Everything discovered later is in ring 4 or beyond, because the queue releases rings in order. Searching on is wasted work.'],
      ['No: rings leave the queue in order 1, 2, 3, 4…, so the first discovery is the shortest', 'Yes. That is the whole promise of BFS in an unweighted graph. Return 4.'],
      ['Only if diagonal moves are disallowed', 'The argument doesn’t depend on which moves exist, only on every move costing the same.'],
    ]),
  step('grid = [[1]]: one square, and it is rock. What do you return?',
    [row('row 0', ['█'], { 0: 'START = GOAL' }, { tones: { 0: 'out' } })], 1, [
      ['1: the start is already the goal', 'A clear path may only use 0 squares. The start itself is rock, so there is no clear path at all.'],
      ['−1: rock at the start means no path', 'Yes. Guard the start before enqueueing it; without the guard this exact grid returns 1.'],
      ['0: a path of no squares', 'The answer counts squares on the path, and a valid path has at least one. Here there is none: −1.'],
    ]),
];

export const rotting = [
  step('Two rotten oranges sit at opposite corners of a full 3 × 3 crate. After how many minutes is every orange rotten?',
    [row('row 0', [2, 1, 1], { 0: 'ROTTEN' }, { tones: { 0: 'hot' } }), row('row 1', [1, 1, 1]), row('row 2', [1, 1, 2], { 2: 'ROTTEN' }, { tones: { 2: 'hot' } })], 1, [
      ['3: from (0,0), the farthest fresh oranges, (2,1) and (1,2), are 3 steps away', 'That runs the blight from one corner only. (2,2) spoils its own neighbours in minute 1 too, so those two rot at minute 1.'],
      ['2: both rotten oranges start in ring 0, and the middle and the other two corners rot at minute 2', 'Yes. Ring 0 is every source. Each orange rots at its distance to the NEAREST rotten one, and the largest of those is 2.'],
      ['4: the two rotten corners are 4 steps apart', 'The distance between the sources doesn’t matter. Each orange only cares about its nearest source.'],
    ]),
  step('LeetCode’s first example. During minute 4, (2,2) rots and the fresh count hits 0. The queue still holds (2,2). Run another round?',
    [row('row 0', ['0', '1', '2'], {}, { tones: { 0: 'done', 1: 'done', 2: 'done' } }),
      row('row 1', ['1', '2', '·'], {}, { tones: { 0: 'done', 1: 'done', 2: 'ghost' } }),
      row('row 2', ['·', '3', '4'], { 2: 'JUST ROTTED' }, { tones: { 0: 'ghost', 1: 'done', 2: 'hot' } })], 0, [
      ['No: stop as soon as nothing fresh is left. The answer is 4', 'Yes. The loop condition fresh > 0 ends it here. The counter means “minutes in which something rotted”.'],
      ['Yes: run until the queue is empty, so the answer is 5', 'That round polls (2,2) and rots nothing, but still adds a minute. Off by one: 5 instead of 4.'],
    ]),
  step('LeetCode’s second example, [[2, 1, 1], [0, 1, 1], [1, 0, 1]]. The rings run out with one fresh orange left at (2,0). What do you return?',
    [row('row 0', [2, 1, 1], {}, { tones: { 0: 'hot' } }), row('row 1', [0, 1, 1], {}, { tones: { 0: 'ghost' } }), row('row 2', [1, 0, 1], { 0: 'FRESH' }, { tones: { 1: 'ghost' } })], 2, [
      ['4: the last minute in which something rotted', 'The question is when EVERY orange has rotted. (2,0) never will.'],
      ['0: it was never reached, so it takes no time', 'An unreachable orange is the opposite of instant: it never rots.'],
      ['−1: some orange can never rot', 'Yes. Its neighbours (1,0) and (2,1) are empty, so the blight can’t reach it. fresh > 0 at loop exit means −1.'],
    ]),
];

const board = [['X', 'X', 'X', 'X'], ['X', 'O', 'O', 'X'], ['X', 'X', 'O', 'X'], ['X', 'O', 'X', 'X']];

export const surrounded = [
  step('The tide is coming. Which squares should the search start from?',
    board.map((r, i) => row(`row ${i}`, r)), 0, [
      ['Every O on the border — all four sides. Whatever they reach is safe; every other O is captured', 'Yes. “Connected to the border” is symmetric, so one flood from the border answers the question for every square at once.'],
      ['Each interior O, flipping squares to X as you explore', 'You only learn whether a region escapes after exploring all of it. Flipping as you go captures half a region before finding that its far end touches the shore.'],
      ['Only the four corners', 'Corners are a tiny part of the border. Here (3,1) is a border O that no corner touches.'],
    ]),
  step('(3,1) is a border O, so it is safe. Its only neighbour (2,1) is X. Are (1,1), (1,2) and (2,2) safe?',
    board.map((r, i) => row(`row ${i}`, r, i === 3 ? { 1: 'SAFE' } : {}, { tones: i === 3 ? { 1: 'done' } : {} })), 1, [
      ['Yes: (2,2) is next to the right-hand column', 'Being next to the border column isn’t being on it. (2,3) is X, so nothing connects (2,2) to the shore.'],
      ['No: no path of Os joins them to a border O, so all three are captured', 'Yes. The flood from (3,1) stops at X. The final pass turns these three into X and (3,1) back into O.'],
    ]),
  step('After the flood, the board holds X, O and S (safe). What does the final pass do?', [], 2, [
    ['S → X, O → O', 'Backwards: S marks the survivors.'],
    ['Only O → X; leave S as it is', 'S was a temporary flag. The output may contain only X and O, so S has to become O again.'],
    ['S → O, O → X, X stays X', 'Yes. Unreached O is captured, the flag is lifted from the safe squares, and walls stay walls. Here 3 Os flip.'],
  ]),
];

const heights = [[1, 2, 3], [8, 9, 4], [7, 6, 5]];

export const pacific = [
  step('Walking in from the Pacific, you stand on (0,2), height 3. Which neighbours may the walk step onto?',
    heights.map((r, i) => row(`row ${i}`, r, i === 0 ? { 2: 'HERE' } : {}, { tones: i === 0 ? { 2: 'hot' } : {} })), 0, [
      ['Neighbours of height 3 or more: water from them could run down to here', 'Yes. You are tracing the water’s path backwards, so you go uphill or level. Here that is (1,2), height 4.'],
      ['Neighbours lower than 3, like (0,1) at height 2: water flows downhill', 'That is the forward direction. Water from (0,1) cannot climb to (0,2), so stepping there from the ocean proves nothing.'],
      ['Only neighbours strictly higher than 3', 'Water also runs across level ground. Strict > drops plateaus: on a 3 × 3 plateau it finds 2 squares instead of 9.'],
    ]),
  step('(0,1), height 2, is on the Pacific shore. Does its rain also reach the Atlantic?',
    heights.map((r, i) => row(`row ${i}`, r, i === 0 ? { 1: '?' } : {}, { tones: i === 0 ? { 1: 'hot' } : {} })), 1, [
      ['Yes, through (0,2) at height 3 and down the right edge', 'Water doesn’t flow uphill: 2 → 3 is not allowed.'],
      ['No: its only lower-or-level neighbour is (0,0), height 1, which drains only into the Pacific', 'Yes. The Atlantic flood never reaches (0,1) or (0,0).'],
    ]),
  step('How many squares drain to both oceans?', heights.map((r, i) => row(`row ${i}`, r)), 1, [
    ['9: the Pacific flood reaches every square', 'Reaching the Pacific is half the condition. The answer is the intersection with the Atlantic flood.'],
    ['7: every square except (0,0) and (0,1)', 'Yes. The Pacific flood covers all 9, the Atlantic flood covers 7, and their intersection is 7.'],
    ['2: only the corners (0,2) and (2,0), which touch both oceans', 'Those two are guaranteed, but squares further in drain to both too: the 9 in the middle runs down either way.'],
  ]),
];

export const ladder = [
  step('The register holds N = 5,000 words of length 5. You poll a word. How do you find its neighbours?', [], 1, [
    ['Compare it with every word in the register', 'Correct but slow: 5,000 comparisons per polled word — about 125 million letter checks over the whole search.'],
    ['Change one position at a time to each of the 25 other letters, and keep candidates that are in the register', 'Yes. 5 × 25 = 125 candidates per word, each checked with one hash lookup, however big the register is.'],
    ['Run a DFS from beginWord, trying every ladder', 'DFS finds a ladder, not the shortest, and trying every ladder is exponential.'],
  ]),
  step('You poll dog (ring 4) and generate cog, which is in the register. What do you return?',
    [row('ring 1', ['hit']), row('ring 2', ['hot']), row('ring 3', ['dot', 'lot']), row('ring 4', ['dog', 'log'], { 0: 'POLLED' }, { tones: { 0: 'hot' } })], 1, [
      ['4: the ladder makes four changes', 'Four crossings — but the problem counts words, including hit and cog.'],
      ['5: cog is in ring 5, and rings count words', 'Yes. hit → hot → dot → dog → cog: 5 words.'],
      ['Keep going in case log gives a shorter ladder', 'log is in the same ring as dog; anything it generates is also ring 5. The first discovery is already the shortest.'],
    ]),
  step('Same start and end, but cog is NOT in the register. Your code returns 5. What did it forget?', [], 0, [
    ['endWord must be in the register: check membership before accepting a candidate', 'Yes. Generating cog by changing a letter doesn’t make it a real island. The answer is 0.'],
    ['To flag words on dequeue instead of on enqueue', 'Flagging late adds duplicates; it doesn’t invent words. The bug is accepting a word that isn’t in the register.'],
    ['To count transformations instead of words', 'That would turn 5 into 4, not 0. The correct answer is 0 because cog isn’t reachable at all.'],
  ]),
];

export const clone = [
  step('Copying the square 1–2–3–4–1, you have just created 1′. Next you will recurse into its neighbour 2. When does 1′ go into the map?',
    [row('original', [1, 2, 3, 4], { 0: 'COPYING' }, { tones: { 0: 'hot' }, join: '—' }), row('copies', ['1′'], {}, { tones: { 0: 'done' } })], 0, [
      ['Now, before recursing: 2 will look for 1 and must find 1′', 'Yes. Register first. When the walk comes back to 1, the map returns 1′ and the cycle closes.'],
      ['After all of 1’s neighbours are copied', 'Then 2 finds 1 missing and copies it again, which copies 2 again… on any cycle — even a single edge 1 — 2 — that is a StackOverflowError.'],
      ['Never: the copy is returned, so the map isn’t needed', 'Without the map, every time the walk meets 1 it makes a new copy — and on a cycle the walk never ends.'],
    ]),
  step('Copying 2, its neighbours are 1 and 3, and 1 is already in the map. What goes into 2′.neighbors first?',
    [row('original', [1, 2, 3, 4], { 1: 'COPYING' }, { tones: { 1: 'hot' }, join: '—' }), row('copies', ['1′', '2′'], {}, { tones: { 0: 'done', 1: 'done' } })], 1, [
      ['The original node 1', 'That links the copy back into the original: a shallow copy. Change the original and the copy changes with it.'],
      ['1′, the copy the map returns for 1', 'Yes. Copies point only at copies. The map translates every neighbour.'],
      ['A fresh new Node(1)', 'Then node 1 has two copies that disagree about their neighbours. The map exists to prevent exactly this.'],
    ]),
  step('For the whole square 1–2–3–4–1, how many times does cloneGraph call new Node?', [], 2, [
    ['8: once per neighbour entry', 'There are 8 neighbour entries (each of the 4 edges appears twice), but each one asks the map first; only the first visit to a node creates its copy.'],
    ['5: the cycle back to 1 creates one extra', 'The map catches the return to 1 and hands back 1′.'],
    ['4: one per original node', 'Yes. V new nodes, and E = 4 edges copied, in O(V + E).'],
  ]),
];

export const mixedReview = [
  step('A grid of 1s and 0s: how many separate groups of 1s (joined up, down, left, right)?', [], 1, [
    ['Slide a window across each row and count runs of 1s', 'Runs in a row miss vertical connections: a U-shaped group would be counted several times.'],
    ['Scan every square; on unmarked land, count one and flood the whole group, marking it', 'Yes. Each flood claims one component, so the number of floods is the answer. O(R·C).'],
    ['Count the 1s with no 1 above them and no 1 to their left', 'That counts top-left corners, not groups. A U shape has two such corners but is one group.'],
  ]),
  step('Fewest moves through a maze where every move costs the same. Which tool?', [], 1, [
    ['DFS, keeping the shortest route it finds', 'With flags, DFS reaches each square once by an arbitrary route; without them it tries every route, which is exponential.'],
    ['BFS: the ring in which the exit is first discovered is the answer', 'Yes. Rings leave the queue in order of distance, so the first discovery is the shortest. O(V + E).'],
    ['Dijkstra with a heap', 'Correct, but with equal costs the heap only adds a log factor. Plain BFS already settles squares in distance order.'],
  ]),
  step('Fires start at five places and spread one square per minute. When does the last tree catch fire?', [], 0, [
    ['One BFS with all five fires in ring 0; the answer is the last ring that reaches a tree', 'Yes. Multi-source BFS: each tree burns at its distance to the nearest fire, all in one O(R·C) pass.'],
    ['Five separate BFS runs, one per fire, then take each tree’s minimum', 'Correct, but five times the work: O(k · R·C). Putting every source in ring 0 gives the same distances in one pass.'],
    ['BFS from the fire listed first', 'That ignores the other four fires: trees near them would burn later on paper than they do in reality.'],
  ]),
  step('Roads take different numbers of minutes. Which tool finds the fastest route?', [], 2, [
    ['BFS: the first time the town is reached is the fastest', 'BFS minimises the number of roads, not minutes. A 10-minute direct road beats 2 + 3 minutes in BFS’s eyes; the fastest is 5.'],
    ['DFS with flags', 'DFS with flags finds some route, not the fastest one.'],
    ['Dijkstra: a min-heap ordered by distance (non-negative weights)', 'Yes. When costs differ, the queue must release the closest town first, not the earliest-discovered one.'],
  ]),
  step('In BFS, when should a node be marked visited?', [], 0, [
    ['When it is enqueued', 'Yes. Then no node is ever in the queue twice, and its first ring is final. 100 entries on a 10 × 10 open grid.'],
    ['When it is dequeued', 'Two neighbours can both enqueue it before it is dequeued. 181 entries on a 10 × 10 open grid — or 184,755 if duplicates expand too.'],
    ['Never: BFS reaches each node once anyway', 'Without marks, BFS walks back and forth along every edge forever on any graph with a cycle.'],
  ]),
  step('Which squares of a grid are connected to the edge of the grid?', [], 1, [
    ['From every square, search for the edge', 'One search per square: up to (R·C)² work, and most searches repeat each other.'],
    ['Start from the edge squares and flood inward; whatever is reached is connected', 'Yes. Connection is symmetric, so one flood from the boundary answers for every square. O(R·C).'],
    ['Only squares in the first and last rows', 'The edge also includes the first and last columns — forgetting them is the classic bug.'],
  ]),
  step('A graph has 100,000 nodes and 200,000 edges. Adjacency matrix or adjacency list?', [], 1, [
    ['Matrix: O(1) to test any edge', 'A 100,000 × 100,000 matrix has 10¹⁰ cells — 10 GB even at one byte per cell — and all but 400,000 of them are zeros.'],
    ['List: O(V + E) space, and neighbours are read in O(degree)', 'Yes. A sparse graph belongs in a list: 300,000 entries instead of 10 billion cells.'],
  ]),
  step('Deep-copy a graph that may contain cycles. The key move?', [], 0, [
    ['Map each original to its copy, and register the copy before visiting the neighbours', 'Yes. The map is both the visited set and the wiring; registering first is what lets cycles close.'],
    ['Copy each node’s neighbours list as it is', 'That is a shallow copy: the new nodes would point back into the original graph.'],
    ['Recurse into every neighbour and create a node each time', 'On a cycle that never ends, and even without one, a node with two parents would be copied twice.'],
  ]),
  step('Courses have prerequisites (“take A before B”). Find an order to take them all.', [], 2, [
    ['BFS from course 0', 'Plain BFS ignores the direction constraints: it would schedule B as soon as it is discovered, even before A.'],
    ['Count connected groups of courses', 'Groups say which courses are related, not in what order to take them.'],
    ['A topological sort of the directed graph (Kahn’s algorithm: BFS on in-degrees)', 'Yes. That belongs to the advanced-graphs book: order constraints need in-degrees, not just flags.'],
  ]),
  step('What does BFS cost on an R × C grid with four directions?', [], 0, [
    ['O(R·C) time and space', 'Yes. V = R·C squares, E ≤ 2·R·C edges, each square enqueued once.'],
    ['O((R·C)²): each square may scan the whole grid', 'Each square looks at its 4 neighbours, not at the whole grid.'],
    ['O(R·C · log(R·C)), because of the queue', 'A FIFO queue offers and polls in O(1). The log factor appears only with a heap (Dijkstra).'],
  ]),
];
