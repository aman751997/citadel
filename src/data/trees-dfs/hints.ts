// Three-step hint ladders for every <HintLadder> in trees-dfs.mdx.
export const hints: Record<string, [string, string, string]> = {
  invert: [
    'What should invertTree promise to return for any subtree? Trust that promise for the two children.',
    'Base case: an empty tree mirrors to itself (return null). Otherwise call invertTree on both children first and keep the results.',
    'Hang the mirrored right subtree on the left and the mirrored left subtree on the right, then return the node. Save both results before assigning either pointer.',
  ],
  same: [
    'Two trees are the same when their roots match AND their left subtrees are the same AND their right subtrees are the same.',
    'Handle the empty cases first: both empty → true; exactly one empty → false. Only then read the values.',
    'return p.val == q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right). && stops at the first difference.',
  ],
  depth: [
    'If you knew the depth of the left subtree and of the right subtree, what would the whole tree’s depth be?',
    'Empty tree: 0. Otherwise one level for this node, plus the deeper of the two sides.',
    'return 1 + Math.max(maxDepth(root.left), maxDepth(root.right)). Top-down instead: carry depth as a parameter and keep the largest seen.',
  ],
  balanced: [
    'Balance must hold at every node, and each node needs its children’s heights to check it. Can one pass return both the height and the verdict?',
    'Return the height, or −1 if anything below is unbalanced. −1 can never be a real height.',
    'height(null) = 0. Get left; if −1, return −1. Get right; if −1, return −1. If |left − right| > 1, return −1. Otherwise return 1 + max(left, right).',
  ],
  diameter: [
    'Every path has one highest node, where it bends. At that node the path is (longest arm down the left) + (longest arm down the right).',
    'A helper returns the height (nodes on the longest downward arm). A field best records the longest bend seen anywhere, in edges.',
    'height(null) = 0. At each node: left = height(left), right = height(right); best = max(best, left + right); return 1 + max(left, right). Answer: best.',
  ],
  maxPath: [
    'Same shape as the diameter: each node is a possible bend. What changes when values can be negative?',
    'gain(node) = the best sum of a path that starts at node and goes down one side. A negative arm is worth 0: you can always stop.',
    'left = max(0, gain(left)), right = max(0, gain(right)); best = max(best, node.val + left + right); return node.val + max(left, right). Start best at Integer.MIN_VALUE.',
  ],
  lca: [
    'Ask each subtree: “did you find p, q, or both?” What should a call return in each case?',
    'If the node is null, p or q, return it. Otherwise ask both children.',
    'If both children return non-null, p and q are split here: return the node. Otherwise return whichever child is non-null (or null).',
  ],
  pathSum: [
    'The answer is a set of root-to-leaf paths. What must the Climber carry down to know, at a leaf, whether this path works?',
    'Carry the remaining sum and one shared path list. Add the node on the way down; remove it on the way back up.',
    'At a leaf (both children null) with remaining == 0, add new ArrayList<>(path) to the result. Recurse left, then right, then path.remove(path.size() − 1).',
  ],
  validate: [
    'Comparing a node only with its parent is not enough. What does each node inherit from ALL its ancestors?',
    'Every node has a window (low, high) that its value must fit strictly inside. The root’s window is unbounded.',
    'Going left, the ceiling becomes the node’s value; going right, the floor does. Use long bounds (Long.MIN_VALUE, Long.MAX_VALUE) so int extremes are safe.',
  ],
  kth: [
    'In a BST, which visiting order produces the values in sorted order?',
    'In-order: left subtree, node, right subtree. Walk it with an explicit stack and count visits.',
    'While cur != null or the stack is non-empty: push cur and go left until null; pop, count it (return its value at the k-th), then go to its right child.',
  ],
  build: [
    'Preorder tells you which value is the root. Inorder tells you what is left of it and what is right of it.',
    'Keep a cursor into preorder and a map value → inorder index. build(lo, hi) builds the subtree whose inorder is inorder[lo..hi].',
    'If lo > hi return null. Take preorder[next++] as the root, find mid in the map, build(lo, mid − 1) for the left FIRST, then build(mid + 1, hi).',
  ],
  serialize: [
    'Why does a root-first listing alone lose the shape? What would you have to write down to keep it?',
    'Write every node root-first, and write a marker (#) for every empty child. Commas between tokens.',
    'Reading: take the next token; # means null; otherwise make the node, then read its left subtree, then its right — the same order it was written.',
  ],
  symmetric: [
    'A tree is symmetric when its left subtree is the mirror image of its right subtree. Can you check “mirror of” with two pointers at once?',
    'mirror(a, b): both null → true; one null or different values → false.',
    'Then pair outside with outside and inside with inside: mirror(a.left, b.right) && mirror(a.right, b.left).',
  ],
  subtree: [
    'You already have a function that checks whether two trees are identical.',
    'subRoot could match at any node of root. Try each node as a starting point.',
    'isSubtree(root, sub) = same(root, sub) || isSubtree(root.left, sub) || isSubtree(root.right, sub), with isSubtree(null, sub) = (sub == null).',
  ],
  good: [
    'A node is good when nothing above it on its path is bigger. What does each node need to know from above?',
    'Carry the largest value seen so far on the path down as a parameter.',
    'count(node, maxAbove): 0 for null; good = node.val ≥ maxAbove ? 1 : 0; return good + count(left, max(maxAbove, val)) + count(right, max(maxAbove, val)).',
  ],
  lcaBst: [
    'In a search tree, the values tell you which side p and q are on without searching.',
    'If both are smaller than the current node, the meeting point is in the left subtree; both larger, the right subtree.',
    'Loop from the root: go left while both are smaller, go right while both are larger; the first node where they split (or that equals one of them) is the answer.',
  ],
  rob: [
    'At each house you either rob it or skip it. What does the parent need to know about each child to choose well?',
    'Return a pair {best if this node is skipped, best if it is robbed}. An empty tree is {0, 0}.',
    'skip = max(left pair) + max(right pair); rob = node.val + left.skip + right.skip. The answer is the larger of the root’s two.',
  ],
  flatten: [
    'The final list is in root-first order. What if you built it from the end, so that each node only needs to point at the list built so far?',
    'Visit in reverse root-first order: right subtree, then left subtree, then the node. Keep prev, the head of the list built so far.',
    'At each node: node.right = prev; node.left = null; prev = node. Recurse right before left.',
  ],
};
