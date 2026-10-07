// Decision puzzles and figure data for the Trees (BFS) lesson. Every number here is re-derived in
// tests/trees-bfs.test.ts from the tree itself (LeetCode array form, null = no child).
import { row, step } from '../../lib/trace.ts';

// Tree figures drawn by <Tree> in trees-bfs.mdx. Keys of tones/labels are positions in the LeetCode array.
export const figures = {
  prologue: { values: [3, 9, 20, null, null, 15, 7], floors: true, tones: { 0: 'hot', 1: 'blue', 2: 'blue', 5: 'done', 6: 'done' } },
  complete: { values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], floors: true, tones: { 7: 'hot', 8: 'hot', 9: 'hot', 10: 'hot', 11: 'hot', 12: 'hot', 13: 'hot', 14: 'hot' } },
  zigzag: { values: [1, 2, 3, 4, 5, 6, 7], floors: true, tones: { 1: 'blue', 2: 'blue' } },
  rightView: { values: [1, 2, 3, null, 5, null, 4], floors: true, tones: { 0: 'hot', 2: 'hot', 6: 'hot' }, labels: { 0: 'seen', 2: 'seen', 6: 'seen' } },
  leftHidden: { values: [1, 2, 3, 4], floors: true, tones: { 0: 'hot', 2: 'hot', 3: 'hot' }, labels: { 0: 'seen', 2: 'seen', 3: 'seen' } },
  minDepth: { values: [1, 2, 3, null, null, null, 4, null, 5, null, 6], floors: true, tones: { 0: 'done', 1: 'done', 2: 'hot', 6: 'ghost', 8: 'ghost', 10: 'ghost' }, labels: { 1: 'first leaf', 2: 'never called' } },
  width: { values: [1, 3, 2, 5, 3, null, 9], floors: true, holes: true, labels: { 0: 'seat 0', 1: 'seat 0', 2: 'seat 1', 3: 'seat 0', 4: 'seat 1', 5: 'seat 2', 6: 'seat 3' }, tones: { 3: 'hot', 6: 'hot' } },
  next: { values: [1, 2, 3, 4, 5, 6, 7], floors: true, arrows: [[1, 2], [3, 4], [4, 5], [5, 6]] as [number, number][], tones: { 4: 'hot', 5: 'hot' } },
  cousins: { values: [1, 2, 3, null, 4, null, 5], floors: true, tones: { 4: 'hot', 6: 'hot', 1: 'blue', 2: 'blue' }, labels: { 4: 'x', 6: 'y', 1: 'parent of x', 2: 'parent of y' } },
  distanceK: { values: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], floors: true, arrows: [[1, 0]] as [number, number][], tones: { 1: 'purple', 0: 'blue', 3: 'blue', 4: 'blue', 2: 'hot', 9: 'hot', 10: 'hot' }, labels: { 1: 'target', 0: 'ring 1', 3: 'ring 1', 4: 'ring 1', 2: 'ring 2', 9: 'ring 2', 10: 'ring 2' } },
};

export const levelOrder = [
  step('Tree [3, 9, 20, null, null, 15, 7]. The line held [3]; you called 3, and her children 9 and 20 joined the back. The line is now [9, 20]. Floor 1 begins. What does Size write down?',
    [row('Floor 0', [3], {}, { tones: { 0: 'done' } }), row('Floor 1', [9, 20], {}, { tones: { 0: 'hot', 1: 'hot' } }), row('Floor 2', [15, 7], {}, { tones: { 0: 'ghost', 1: 'ghost' } }),
      row('Line (front → back)', [9, 20], { 0: 'FRONT' })], 0, [
      ['size = 2: exactly floor 1 is waiting', 'Yes. Everyone in the line right now is on floor 1, because floor 0 finished and nobody from floor 2 has been invited yet. Call exactly 2, then close the row.'],
      ['size = 4: floor 1 plus their children', 'Their children (15 and 7) have not joined yet. They only join when 20 is called. Size counts the line as it stands now.'],
      ['Don’t write it down; check queue.size() each time round the loop', 'The line grows while you call: 20’s children join behind you. A bound that is re-read every time stops at the wrong place. Snapshot it once.'],
    ]),
  step('Same tree, but the loop is written for (int i = 0; i < queue.size(); i++), reading the size live. What is the first row it closes?',
    [row('Line before floor 0', [3], { 0: 'FRONT' }), row('Tree by floor', ['3', '9 20', '15 7'])], 1, [
      ['[3], the same as before', 'After 3 is called, 9 and 20 join, so queue.size() is 2 and i = 1 still passes the test. The loop keeps going.'],
      ['[3, 9]: the live bound let 9 sneak into floor 0’s row', 'Yes. i = 0 calls 3 (line becomes [9, 20], size 2); i = 1 < 2 calls 9 (line [20], size 1); i = 2 is not < 1, so it stops. The whole answer becomes [[3, 9], [20, 15], [7]].'],
      ['[3, 9, 20, 15, 7]: everything in one row', 'The live size shrinks as well as grows. Once 9 is polled with no children, the bound drops to 1 and the loop stops early, not late.'],
    ]),
  step('The while loop has just ended. Narrate the exit: what is in the line, and how many rows were written?',
    [row('Rows written', ['[3]', '[9, 20]', '[15, 7]']), row('Line', [])], 2, [
      ['The line still holds the last floor; there are 2 rows', 'The last floor was called and closed inside the loop. The loop only ends when the line is empty.'],
      ['The line is empty and there is one row per node', 'There is one row per floor, not per node: 5 keepers, 3 rows.'],
      ['The line is empty, and there is exactly one row per floor: 3 rows, the height of the tree', 'Yes. Saying this out loud is how you prove the loop is finished: every keeper was called once, every floor closed once.'],
    ]),
];

export const zigzag = [
  step('Tree [1, 2, 3, 4, 5, 6, 7]. Floor 1 is written right to left. The line is [2, 3] and Size says 2. Who is called first?',
    [row('Floor 1', [2, 3], {}, { tones: { 0: 'hot', 1: 'hot' } }), row('Line (front → back)', [2, 3], { 0: 'FRONT' })], 0, [
      ['2, the front of the line. The direction only changes where her name is written', 'Yes. The line stays left to right on every floor; that is what keeps the next floor in order. Only the pen moves.'],
      ['3, because this floor reads right to left', 'A queue only hands out its front. To call 3 first you would have to reorder the line, and then floor 2 would come out scrambled.'],
    ]),
  step('2 is the first called on floor 1 (i = 0), and the row has size = 2 slots. The floor reads right to left. Which slot does 2 take?',
    [row('Row for floor 1', ['·', '·'], { 0: 'slot 0', 1: 'slot 1' }), row('Line', [3], { 0: 'FRONT' })], 1, [
      ['Slot 0', 'That is a left-to-right floor. Here the first one called belongs at the far end.'],
      ['Slot size − 1 − i = 1', 'Yes. Then 3 (i = 1) takes slot 0, and the row reads [3, 2]. The snapshot size tells you where the far end is.'],
      ['Reverse the line first, then use slot 0', 'Reversing the line would also reverse the order the children join, and floor 2 would come out backwards. Leave the line alone.'],
    ]),
  step('A friend skips the slot trick: “On floors before a right-to-left floor, I’ll enqueue children right-first instead.” Floor 1 comes out [3, 2]. What does floor 2 come out as?',
    [row('Floor 2 (true, left to right)', [4, 5, 6, 7]), row('Line after floor 1, friend’s way', [6, 7, 4, 5], { 0: 'FRONT' })], 2, [
      ['[4, 5, 6, 7]: correct', 'Floor 1 was called as 3, then 2, so 3’s children (6, 7) joined before 2’s (4, 5). The friend’s line is [6, 7, 4, 5].'],
      ['[7, 6, 5, 4]', 'That would be a full reversal. The friend’s line reverses the parents but not the pairs of children, which is even worse.'],
      ['[6, 7, 4, 5]: scrambled, because reversing who is called also reorders who joins next', 'Yes. Floor 1 was right, floor 2 is wrong. Keep the line in true left-to-right order and choose the direction only when writing.'],
    ]),
];

export const rightView = [
  step('Tree [1, 2, 3, 4]. On floor 1 the line is [2, 3] and Size says 2. The ship sees one window per floor. Whose?',
    [row('Floor 1', [2, 3], { 1: 'i = size − 1' }, { tones: { 0: 'hot', 1: 'hot' } }), row('Floor 2', [4], {}, { tones: { 0: 'ghost' } })], 1, [
      ['2, the first called', 'The first called is the westernmost. That is the LEFT side view.'],
      ['3, the last called: i == size − 1', 'Yes. Nobody on floor 1 stands east of 3. The snapshot tells you which call is the last.'],
      ['Both: record every window', 'That is the whole level-order traversal. The ship sees only one window per floor.'],
    ]),
  step('Floor 2 holds only 4, and 4 hangs from 2’s LEFT stair. Is 4 in the view from the sea?',
    [row('Floor 2', [4], { 0: 'i = size − 1' }, { tones: { 0: 'hot' } }), row('View so far', [1, 3])], 0, [
      ['Yes: it is the last (and only) window on floor 2. The view is [1, 3, 4]', 'Yes. Nothing on floor 2 stands east of it. “Right side” means the last on each floor, not “right children”.'],
      ['No: it is a left child, so it is hidden', 'Hidden by what? Nothing on floor 2 is to its east. Walking only right stairs returns [1, 3] and loses this floor.'],
    ]),
  step('Now the climbing version: visit right before left, and record a node when depth == view.size(). You reach 2 at depth 1, and the view is [1, 3]. Record 2?',
    [row('View', [1, 3], { 0: 'depth 0', 1: 'depth 1' }), row('Visiting', [2], { 0: 'depth 1' })], 1, [
      ['Yes: it is the first time you reach 2', 'The rule is about the depth, not the node. Depth 1 already has its window (3), because right was visited first.'],
      ['No: view.size() is 2, so depth 1 already has its window', 'Yes. The first node you reach at each depth, going right first, is the rightmost. Then 4 at depth 2 finds view.size() == 2 and is recorded.'],
    ]),
];

export const mixedReview = [
  step('A tree has one leaf right under the root and a branch 10,000 floors deep. You need the fewest floors from the root down to any leaf. Which walk does less work?', [], 1, [
    ['Recursion into both children, then the smaller answer', 'Recursion has to explore the 10,000-floor branch before it can compare. It does the work of the whole tree.'],
    ['Floor by floor from the top, stopping at the first leaf you call', 'Yes. The leaf on floor 1 is called within the first three calls, and nothing below floor 1 is ever called.'],
    ['Either: both visit every node', 'Floor-by-floor visits stop at the first leaf. Only the recursion is forced to see everything.'],
  ]),
  step('Is a tree height-balanced (at every node, the two subtrees’ heights differ by at most 1)?', [], 2, [
    ['Floor by floor, comparing floor sizes', 'A full floor tells you nothing about which subtree is taller. A tree can be unbalanced deep inside with full upper floors.'],
    ['Right side view, then check the length', 'The view’s length is the height, but balance is a per-node fact about two subtrees.'],
    ['Recursion that returns each subtree’s height upward (−1 for “already unbalanced”)', 'Yes. The answer at a node depends on answers from below. That is a depth-first, post-order job.'],
  ]),
  step('Queue<TreeNode> q = new ArrayDeque<>(); q.offer(root); with root == null. What happens?', [], 1, [
    ['The loop runs zero times and returns []', 'ArrayDeque never lets the null in. It fails right at the offer.'],
    ['NullPointerException at the offer: ArrayDeque refuses nulls. Guard with if (root == null) first', 'Yes. That is a feature: a LinkedList accepts the null silently and the crash (or a wrong answer) comes later, far from the cause.'],
    ['It works, because Queue allows null', 'Queue is an interface. ArrayDeque, the implementation you should use, rejects null elements.'],
  ]),
  step('A complete tree has 20 full floors: 1,048,575 nodes. Peak memory: the line in a floor-by-floor walk versus the call stack of a recursive walk?', [], 0, [
    ['About 524,288 in the line versus about 20 stack frames', 'Yes. The last floor alone holds 2¹⁹ = 524,288 nodes, about half the tree. The recursion only ever holds one root-to-node path.'],
    ['About 20 for both', 'The line holds a whole floor at once, and the widest floor of a complete tree is the bottom one.'],
    ['About 1,048,575 for both', 'Neither holds the whole tree at once. The line peaks at one floor, the stack at one path.'],
  ]),
  step('Zigzag order. Where does the direction change?', [], 0, [
    ['Only when writing the row: slot i or slot size − 1 − i', 'Yes. The line stays in true left-to-right order on every floor.'],
    ['In the order children join the line', 'Then the next floor comes out scrambled: [6, 7, 4, 5] instead of [4, 5, 6, 7] on the tree 1..7.'],
    ['By reversing the whole line between floors', 'The children of the reversed floor would then join in reverse order too, and the floor after comes out wrong.'],
  ]),
  step('All nodes exactly K stairs from a target node (not the root). The first move?', [], 1, [
    ['Floor by floor from the root, looking for floor depth(target) + K', 'Distance can go up through the parent and down another branch. Those nodes are not on any single floor.'],
    ['Record every node’s parent, then expand rings outward from the target, up and down, with a visited set', 'Yes. With parent links the tree is an undirected graph, and rings from the target are exactly the distances.'],
    ['Climb from the target down only', 'Nodes above the target and in sibling branches are also K away. Going down only misses them.'],
  ]),
  step('Width of a floor, counting the empty window frames between the outermost nodes. What do you carry with each node?', [], 2, [
    ['Nothing: width is the number of nodes on the floor', 'On [1, 3, 2, 5, 3, null, 9] floor 2 has 3 nodes but spans 4 frames. The empty frame counts.'],
    ['Its depth', 'Depth says which floor; it says nothing about how far apart two nodes on the floor are.'],
    ['A seat number: children of seat s get 2s + 1 and 2s + 2, renumbered from 0 on every floor', 'Yes. Width = last seat − first seat + 1. Renumbering keeps the numbers small; otherwise they double every floor.'],
  ]),
  step('Connect every node to its right neighbour on the same floor (a perfect tree), using O(1) extra space. How?', [], 1, [
    ['The usual line of waiting nodes, linking each to the next one called', 'Correct links, but the line holds up to a whole floor: O(w) space, not O(1).'],
    ['Walk each floor along the links you already made, and use them to link the floor below', 'Yes. A finished floor is a linked list. Following it lets you reach every pair of neighbouring children without any line.'],
    ['Recursion linking left.next = right', 'That misses the links between cousins (5 → 6 in the tree 1..7), and the recursion uses O(h) stack anyway.'],
  ]),
];
