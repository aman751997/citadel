// Three-step hint ladders for every <HintLadder> in trees-bfs.mdx.
export const hints: Record<string, [string, string, string]> = {
  levelOrder: [
    'You must finish level d before anyone from level d + 1 is called. Which structure hands out people in the order they arrived?',
    'A queue (ArrayDeque) holds the line. Each node you call sends its children to the BACK, so the next level waits behind the rest of this one.',
    'Guard a null root. While the line is not empty: size = queue.size() ONCE; poll exactly size nodes into a new row, offering non-null children; then add the row.',
  ],
  zigzag: [
    'The line itself never changes order. What changes from level to level is only where each value is written.',
    'Carry a boolean leftToRight, flipped after every level. The snapshot size tells you how many slots the row needs.',
    'Make a row of size slots. The i-th node called goes to slot i on left-to-right levels and to slot size − 1 − i on the others. Children always join left, then right.',
  ],
  rightView: [
    'On each level the right side view takes exactly one node: the one with nothing to its right. In a left-to-right level-order walk, when is that one called?',
    'Level by level with the size snapshot: record the node when i == size − 1. Or climb: visit right before left and carry the depth.',
    'Climbing version: if depth == view.size(), this is the first node reached at this depth, so record it; then recurse right, then left, with depth + 1.',
  ],
  average: [
    'This is the level-order walk again. What do you need to keep per level instead of a list of values?',
    'A running sum and the snapshot size. The average is sum / size, computed after the level is called.',
    'Make the sum a long (two values of 2³¹ − 1 overflow an int) and divide as a double: (double) sum / size.',
  ],
  minDepth: [
    'The nearest leaf is on the shallowest level that has one. Which walk meets levels in order of depth?',
    'Level by level, counting levels from 1 at the root. The first leaf you call ends the search.',
    'A leaf has no left AND no right child. Return the current level number the moment you poll one; otherwise offer the children and keep going.',
  ],
  width: [
    'Width counts the empty node frames too. Give every node a position number, as if the tree were complete.',
    'Root at position 0; the children of position s sit at 2s + 1 and 2s + 2. Width of a level = last position − first position + 1.',
    'Carry (node, position) pairs in the line. At the start of each level, subtract the level’s first position from every position, so numbers stay small; keep positions in a long.',
  ],
  connect: [
    'Once a level is linked, it is a linked list you can walk from its leftmost node without any queue.',
    'Stand on level d (already linked) and link level d + 1: two kinds of pairs, siblings and neighbours with different parents.',
    'For each head on level d: head.left.next = head.right; if head.next != null, head.right.next = head.next.left. Then move down to leftmost.left.',
  ],
  cousins: [
    'Cousins share a level but not a parent. Which two facts do you need about x and y?',
    'Walk level by level. While calling a node, you can see both its children at once, which is the moment to catch siblings.',
    'If a node’s two children are x and y, return false. At the end of a level: both found → true; exactly one found → false (they are on different levels).',
  ],
  distanceK: [
    'Distance can go up through a parent and down another branch. What does the tree lack that a graph has?',
    'Record every node’s parent in one pass. Now each node has up to three neighbours: left, right, parent.',
    'Expand rings outward from the target with a visited set and the size snapshot. After k rings, the line holds exactly the answer.',
  ],
};
