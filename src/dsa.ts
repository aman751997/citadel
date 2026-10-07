// DSA problem bank — mirrored from Notion Syllabus/Roadmap (143-problem, Blind75-anchored, NeetCode-150 complete).
// lc = leetcode.com/problems/<lc>/ ; premium problems carry a `lint` LintCode link (or search fallback).
// done flags mirror Notion statuses — update BOTH when logging solves.
export interface DsaProblem {
  name: string;
  lc: string; // leetcode slug
  sub: string;
  diff: 'E' | 'M' | 'H';
  trigger: string;
  done?: boolean;
  b75?: boolean;
  premium?: boolean;
  lint?: string; // full LintCode URL for premium problems
}

export interface DsaPattern {
  id: number;
  title: string;
  fires: string; // "fires when" trigger summary
  lesson?: string; // slug of forged portal lesson
  problems: DsaProblem[];
}

const LSEARCH = 'https://www.lintcode.com/problem/?typeId=8&keyword=';

export const DSA: DsaPattern[] = [
  {
    id: 1, title: 'Arrays & Two Pointers', fires: 'sorted array, pair/triplet, in-place partition', lesson: 'two-pointers',
    problems: [
      { name: 'Valid Palindrome', lc: 'valid-palindrome', sub: 'Opposite Ends', diff: 'E', trigger: 'Checking symmetry from both ends', done: true, b75: true },
      { name: 'Two Sum II — Input Array Is Sorted', lc: 'two-sum-ii-input-array-is-sorted', sub: 'Opposite Ends', diff: 'M', trigger: 'Sorted array + target sum pair', done: true },
      { name: '3Sum', lc: '3sum', sub: 'Opposite Ends', diff: 'M', trigger: 'Sorted array + finding triplets', b75: true },
      { name: 'Container With Most Water', lc: 'container-with-most-water', sub: 'Opposite Ends', diff: 'M', trigger: 'Maximizing area / greedy bottleneck (shorter line)', done: true, b75: true },
      { name: 'Trapping Rain Water', lc: 'trapping-rain-water', sub: 'Opposite Ends', diff: 'H', trigger: 'Tracking max boundaries on left and right', b75: true },
      { name: 'Remove Duplicates from Sorted Array', lc: 'remove-duplicates-from-sorted-array', sub: 'Same Direction', diff: 'E', trigger: 'In-place modification / skipping duplicates' },
      { name: 'Remove Duplicates from Sorted Array II', lc: 'remove-duplicates-from-sorted-array-ii', sub: 'Same Direction', diff: 'M', trigger: 'At most 2 copies — compare vs nums[scribe-2]', done: true },
      { name: 'Move Zeroes', lc: 'move-zeroes', sub: 'Same Direction', diff: 'E', trigger: 'Shifting elements to one side in-place', done: true },
      { name: 'Sort Colors', lc: 'sort-colors', sub: 'Same Direction', diff: 'M', trigger: 'Three groups in-place (Dutch National Flag)', done: true },
      { name: 'Merge Sorted Array', lc: 'merge-sorted-array', sub: 'Two Iterables', diff: 'E', trigger: 'Merging two arrays (pointers from the END!)', done: true },
      { name: 'Append Characters to Make Subsequence', lc: 'append-characters-to-string-to-make-subsequence', sub: 'Two Iterables', diff: 'M', trigger: 'Relative order / subsequence matching' },
      { name: 'Squares of a Sorted Array', lc: 'squares-of-a-sorted-array', sub: 'Review', diff: 'E', trigger: 'Sorted with negatives + squaring' },
    ],
  },
  {
    id: 2, title: 'Sliding Window', fires: 'longest / shortest contiguous run', lesson: 'sliding-window',
    problems: [
      { name: 'Maximum Average Subarray I', lc: 'maximum-average-subarray-i', sub: 'Fixed Window', diff: 'E', trigger: 'Contiguous subarray of fixed size K', done: true },
      { name: 'Minimum Size Subarray Sum', lc: 'minimum-size-subarray-sum', sub: 'Variable Window', diff: 'M', trigger: 'Shortest run meeting a condition', done: true },
      { name: 'Longest Substring Without Repeating Characters', lc: 'longest-substring-without-repeating-characters', sub: 'Variable Window', diff: 'M', trigger: 'Longest substring + unique elements', done: true, b75: true },
      { name: 'Longest Repeating Character Replacement', lc: 'longest-repeating-character-replacement', sub: 'Variable + HashMap', diff: 'M', trigger: 'Longest + up to K replacements', done: true, b75: true },
      { name: 'Permutation in String', lc: 'permutation-in-string', sub: 'Variable + HashMap', diff: 'M', trigger: 'Anagram / frequency match in window' },
      { name: 'Minimum Window Substring', lc: 'minimum-window-substring', sub: 'Variable + HashMap', diff: 'H', trigger: 'Shortest substring containing all of target', b75: true },
      { name: 'Sliding Window Maximum', lc: 'sliding-window-maximum', sub: 'Deque Max', diff: 'H', trigger: 'Max of every window of size K (deque)' },
      { name: 'Best Time to Buy and Sell Stock', lc: 'best-time-to-buy-and-sell-stock', sub: 'Min-So-Far', diff: 'E', trigger: 'One transaction — track min price, best profit', b75: true },
      { name: 'Fruit Into Baskets', lc: 'fruit-into-baskets', sub: 'Variable + HashMap', diff: 'M', trigger: 'Longest run with ≤2 distinct — shrink on 3rd' },
      { name: 'Max Consecutive Ones III', lc: 'max-consecutive-ones-iii', sub: 'Variable Window', diff: 'M', trigger: 'Longest 1s with ≤k flips — shrink when zeros>k', done: true },
    ],
  },
  {
    id: 3, title: 'Prefix Sum', fires: 'range-sum queries, subarray-sum = K', lesson: 'prefix-sum',
    problems: [
      { name: 'Range Sum Query — Immutable', lc: 'range-sum-query-immutable', sub: 'Standard 1D', diff: 'E', trigger: 'Many range-sum queries fast' },
      { name: 'Find Pivot Index', lc: 'find-pivot-index', sub: 'Standard 1D', diff: 'E', trigger: 'Left sum vs right sum of an index' },
      { name: 'Product of Array Except Self', lc: 'product-of-array-except-self', sub: 'Standard 1D', diff: 'M', trigger: 'Product except i without division', b75: true },
      { name: 'Subarray Sum Equals K', lc: 'subarray-sum-equals-k', sub: 'Prefix + HashMap', diff: 'M', trigger: 'Count subarrays summing exactly K' },
      { name: 'Continuous Subarray Sum', lc: 'continuous-subarray-sum', sub: 'Prefix + HashMap', diff: 'M', trigger: 'Subarray sum multiple of K' },
    ],
  },
  {
    id: 4, title: 'Intervals', fires: 'overlapping ranges, meeting rooms', lesson: 'intervals',
    problems: [
      { name: 'Merge Intervals', lc: 'merge-intervals', sub: 'Merge & Insert', diff: 'M', trigger: 'Overlapping time periods', b75: true },
      { name: 'Insert Interval', lc: 'insert-interval', sub: 'Merge & Insert', diff: 'M', trigger: 'New range into sorted ranges', b75: true },
      { name: 'Meeting Rooms', lc: 'meeting-rooms', sub: 'Scheduling', diff: 'E', trigger: 'Any overlap?', b75: true, premium: true, lint: 'https://www.lintcode.com/problem/920/' },
      { name: 'Meeting Rooms II', lc: 'meeting-rooms-ii', sub: 'Scheduling', diff: 'M', trigger: 'Max simultaneous events', b75: true, premium: true, lint: 'https://www.lintcode.com/problem/919/' },
      { name: 'Non-overlapping Intervals', lc: 'non-overlapping-intervals', sub: 'Scheduling', diff: 'M', trigger: 'Min removals to kill overlaps', b75: true },
    ],
  },
  {
    id: 5, title: 'Linked Lists', fires: 'pointer surgery, cycle, O(1) cache', lesson: 'linked-lists',
    problems: [
      { name: 'Linked List Cycle', lc: 'linked-list-cycle', sub: 'Fast & Slow', diff: 'E', trigger: 'Does it loop? (Tortoise & Hare)', b75: true },
      { name: 'Middle of the Linked List', lc: 'middle-of-the-linked-list', sub: 'Fast & Slow', diff: 'E', trigger: 'Exact center in one pass' },
      { name: 'Remove Nth Node From End', lc: 'remove-nth-node-from-end-of-list', sub: 'Fast & Slow', diff: 'M', trigger: 'Target node from the tail end', b75: true },
      { name: 'Find the Duplicate Number', lc: 'find-the-duplicate-number', sub: 'Fast & Slow', diff: 'M', trigger: 'Values 1..N as pointers' },
      { name: 'Reverse Linked List', lc: 'reverse-linked-list', sub: 'In-Place Reversal', diff: 'E', trigger: 'Flip next pointers, no extra memory', b75: true },
      { name: 'Reverse Linked List II', lc: 'reverse-linked-list-ii', sub: 'In-Place Reversal', diff: 'M', trigger: 'Flip only a section' },
      { name: 'Reverse Nodes in k-Group', lc: 'reverse-nodes-in-k-group', sub: 'Advanced Reversal', diff: 'H', trigger: 'Flip chunks of size K' },
      { name: 'Reorder List', lc: 'reorder-list', sub: 'Composite', diff: 'M', trigger: 'Find middle + reverse half + weave' },
      { name: 'Copy List with Random Pointer', lc: 'copy-list-with-random-pointer', sub: 'Clone w/ Random', diff: 'M', trigger: 'Deep-copy with random ptrs — interleave or map', b75: true },
      { name: 'Merge Two Sorted Lists', lc: 'merge-two-sorted-lists', sub: 'Structural', diff: 'E', trigger: 'Splice two ordered lists', b75: true },
      { name: 'LRU Cache', lc: 'lru-cache', sub: 'Structural', diff: 'M', trigger: 'O(1) dict + ordering (HashMap + DLL)', b75: true },
    ],
  },
  {
    id: 6, title: 'Binary Search', fires: 'sorted / minimize-the-max / log-time', lesson: 'binary-search',
    problems: [
      { name: 'Binary Search', lc: 'binary-search', sub: 'Standard', diff: 'E', trigger: 'O(log N) on sorted array' },
      { name: 'Search a 2D Matrix', lc: 'search-a-2d-matrix', sub: 'Standard', diff: 'M', trigger: 'Sorted 2D grid, rows flow sequentially' },
      { name: 'Find First and Last Position', lc: 'find-first-and-last-position-of-element-in-sorted-array', sub: 'Boundary', diff: 'M', trigger: 'Leftmost/rightmost bounds of duplicates' },
      { name: 'Find Minimum in Rotated Sorted Array', lc: 'find-minimum-in-rotated-sorted-array', sub: 'Rotated', diff: 'M', trigger: 'Sorted array that was pivoted', b75: true },
      { name: 'Search in Rotated Sorted Array', lc: 'search-in-rotated-sorted-array', sub: 'Rotated', diff: 'M', trigger: 'Target in shifted sorted array', b75: true },
      { name: 'Koko Eating Bananas', lc: 'koko-eating-bananas', sub: 'Minimax on Answer', diff: 'M', trigger: 'Minimize the max rate/capacity' },
      { name: 'Capacity To Ship Packages', lc: 'capacity-to-ship-packages-within-d-days', sub: 'Minimax on Answer', diff: 'M', trigger: 'Min capacity within D limits' },
      { name: 'Split Array Largest Sum', lc: 'split-array-largest-sum', sub: 'Minimax on Answer', diff: 'H', trigger: 'Minimize largest sum among M parts' },
      { name: 'Median of Two Sorted Arrays', lc: 'median-of-two-sorted-arrays', sub: 'Partition Search', diff: 'H', trigger: 'Median in O(log) — search the partition', b75: true },
      { name: 'Time Based Key-Value Store', lc: 'time-based-key-value-store', sub: 'Timestamps', diff: 'M', trigger: 'Value at-or-before timestamp' },
    ],
  },
  {
    id: 7, title: 'Stacks', fires: 'nesting, next-greater/smaller, histogram', lesson: 'stacks',
    problems: [
      { name: 'Valid Parentheses', lc: 'valid-parentheses', sub: 'Standard', diff: 'E', trigger: 'Matching nested pairs', b75: true },
      { name: 'Min Stack', lc: 'min-stack', sub: 'Standard', diff: 'M', trigger: 'O(1) minimum on a stack' },
      { name: 'Evaluate Reverse Polish Notation', lc: 'evaluate-reverse-polish-notation', sub: 'Standard', diff: 'M', trigger: 'Post-fix expressions' },
      { name: 'Daily Temperatures', lc: 'daily-temperatures', sub: 'Monotonic', diff: 'M', trigger: 'Next greater / next warmer day' },
      { name: 'Next Greater Element II', lc: 'next-greater-element-ii', sub: 'Monotonic', diff: 'M', trigger: 'Next greater, circular array' },
      { name: 'Car Fleet', lc: 'car-fleet', sub: 'Monotonic', diff: 'M', trigger: 'Vehicles catching up / merging' },
      { name: 'Largest Rectangle in Histogram', lc: 'largest-rectangle-in-histogram', sub: 'Monotonic', diff: 'H', trigger: 'Max area in heights (next smaller)' },
    ],
  },
  {
    id: 8, title: 'Heaps / Priority Queue', fires: 'K-th, running median, merge-K, scheduling', lesson: 'heaps',
    problems: [
      { name: 'Kth Largest Element in an Array', lc: 'kth-largest-element-in-an-array', sub: 'Top K', diff: 'M', trigger: 'Kth largest/smallest, unsorted' },
      { name: 'Top K Frequent Elements', lc: 'top-k-frequent-elements', sub: 'Top K', diff: 'M', trigger: 'Most frequent K', b75: true },
      { name: 'K Closest Points to Origin', lc: 'k-closest-points-to-origin', sub: 'Top K', diff: 'M', trigger: 'Closest K by custom distance' },
      { name: 'Task Scheduler', lc: 'task-scheduler', sub: 'Simulation', diff: 'M', trigger: 'Scheduling with cooldowns' },
      { name: 'Find Median from Data Stream', lc: 'find-median-from-data-stream', sub: 'Two Heaps', diff: 'H', trigger: 'Running median', b75: true },
      { name: 'Sliding Window Median', lc: 'sliding-window-median', sub: 'Two Heaps', diff: 'H', trigger: 'Median in a moving window' },
      { name: 'Merge K Sorted Lists', lc: 'merge-k-sorted-lists', sub: 'Multi-Way Merge', diff: 'H', trigger: 'Min-heap of k heads', b75: true },
    ],
  },
  {
    id: 9, title: 'Trees (DFS)', fires: 'path/height/LCA, rebuild tree', lesson: 'trees-dfs',
    problems: [
      { name: 'Invert Binary Tree', lc: 'invert-binary-tree', sub: 'DFS Basics', diff: 'E', trigger: 'Mirror left/right', b75: true },
      { name: 'Same Tree', lc: 'same-tree', sub: 'DFS Basics', diff: 'E', trigger: 'Structural equality', b75: true },
      { name: 'Maximum Depth of Binary Tree', lc: 'maximum-depth-of-binary-tree', sub: 'Bottom-Up', diff: 'E', trigger: 'Max root→leaf distance', b75: true },
      { name: 'Diameter of Binary Tree', lc: 'diameter-of-binary-tree', sub: 'Bottom-Up', diff: 'E', trigger: 'Longest path between ANY two nodes' },
      { name: 'Lowest Common Ancestor (BT)', lc: 'lowest-common-ancestor-of-a-binary-tree', sub: 'Bottom-Up', diff: 'M', trigger: 'First shared parent', b75: true },
      { name: 'Balanced Binary Tree', lc: 'balanced-binary-tree', sub: 'Bottom-Up', diff: 'E', trigger: 'Depth diff ≤ 1 everywhere' },
      { name: 'Binary Tree Maximum Path Sum', lc: 'binary-tree-maximum-path-sum', sub: 'Bottom-Up', diff: 'H', trigger: 'Max sum path, any two nodes', b75: true },
      { name: 'Path Sum II', lc: 'path-sum-ii', sub: 'Top-Down', diff: 'M', trigger: 'Root-to-leaf sum paths' },
      { name: 'Construct BT from Preorder + Inorder', lc: 'construct-binary-tree-from-preorder-and-inorder-traversal', sub: 'Construction', diff: 'M', trigger: 'Preorder gives root, inorder splits', b75: true },
      { name: 'Serialize and Deserialize Binary Tree', lc: 'serialize-and-deserialize-binary-tree', sub: 'Construction', diff: 'H', trigger: 'Preorder DFS + null markers', b75: true },
      { name: 'Validate Binary Search Tree', lc: 'validate-binary-search-tree', sub: 'BST Properties', diff: 'M', trigger: 'Range bounds down the tree', b75: true },
      { name: 'Kth Smallest Element in a BST', lc: 'kth-smallest-element-in-a-bst', sub: 'BST Properties', diff: 'M', trigger: 'In-order = sorted', b75: true },
    ],
  },
  {
    id: 10, title: 'Trees (BFS)', fires: 'row-by-row, right-side-view', lesson: 'trees-bfs',
    problems: [
      { name: 'Binary Tree Level Order Traversal', lc: 'binary-tree-level-order-traversal', sub: 'Level Order', diff: 'M', trigger: 'Row by row (queue)', b75: true },
      { name: 'Zigzag Level Order Traversal', lc: 'binary-tree-zigzag-level-order-traversal', sub: 'Level Order', diff: 'M', trigger: 'Rows, alternating direction' },
      { name: 'Binary Tree Right Side View', lc: 'binary-tree-right-side-view', sub: 'Views', diff: 'M', trigger: 'Last element of every level' },
    ],
  },
  {
    id: 11, title: 'Graphs (Traversal)', fires: 'components, unweighted shortest, clone', lesson: 'graphs',
    problems: [
      { name: 'Number of Islands', lc: 'number-of-islands', sub: 'Grid / Islands', diff: 'M', trigger: 'Connected 1s / components', b75: true },
      { name: 'Max Area of Island', lc: 'max-area-of-island', sub: 'Grid / Islands', diff: 'M', trigger: 'Largest component in grid' },
      { name: 'Rotting Oranges', lc: 'rotting-oranges', sub: 'Grid / Islands', diff: 'M', trigger: 'Spread level-by-level (multi-source BFS)' },
      { name: 'Surrounded Regions', lc: 'surrounded-regions', sub: 'Grid / Islands', diff: 'M', trigger: 'Regions enclosed by boundary' },
      { name: 'Pacific Atlantic Water Flow', lc: 'pacific-atlantic-water-flow', sub: 'Grid / Islands', diff: 'M', trigger: 'Cells reaching multiple boundaries', b75: true },
      { name: 'Shortest Path in Binary Matrix', lc: 'shortest-path-in-binary-matrix', sub: 'Shortest Path BFS', diff: 'M', trigger: 'Shortest route, unweighted grid' },
      { name: 'Word Ladder', lc: 'word-ladder', sub: 'Shortest Path BFS', diff: 'H', trigger: 'Shortest transformation sequence', b75: true },
      { name: 'Clone Graph', lc: 'clone-graph', sub: 'Graph DFS', diff: 'M', trigger: 'Deep copy (visited map)', b75: true },
    ],
  },
  {
    id: 12, title: 'Advanced Graphs', fires: 'ordering, connectivity, weighted paths', lesson: 'advanced-graphs',
    problems: [
      { name: 'Course Schedule', lc: 'course-schedule', sub: 'Topological Sort', diff: 'M', trigger: 'Prerequisites / order constraints', b75: true },
      { name: 'Course Schedule II', lc: 'course-schedule-ii', sub: 'Topological Sort', diff: 'M', trigger: 'Return the valid order' },
      { name: 'Alien Dictionary', lc: 'alien-dictionary', sub: 'Topological Sort', diff: 'H', trigger: 'Deduce alphabet from sorted words', b75: true, premium: true, lint: 'https://www.lintcode.com/problem/892/' },
      { name: 'Number of Connected Components', lc: 'number-of-connected-components-in-an-undirected-graph', sub: 'Union-Find', diff: 'M', trigger: 'Group connected undirected nodes', b75: true, premium: true, lint: `${LSEARCH}connected%20components` },
      { name: 'Graph Valid Tree', lc: 'graph-valid-tree', sub: 'Union-Find', diff: 'M', trigger: 'Zero cycles + fully connected', b75: true, premium: true, lint: 'https://www.lintcode.com/problem/178/' },
      { name: 'Redundant Connection', lc: 'redundant-connection', sub: 'Union-Find', diff: 'M', trigger: 'The edge that creates a cycle' },
      { name: 'Network Delay Time', lc: 'network-delay-time', sub: 'Dijkstra', diff: 'M', trigger: 'Shortest path, weighted edges' },
      { name: 'Min Cost to Connect All Points', lc: 'min-cost-to-connect-all-points', sub: 'MST', diff: 'M', trigger: 'Connect all at min total weight' },
      { name: 'Cheapest Flights Within K Stops', lc: 'cheapest-flights-within-k-stops', sub: 'Bellman-Ford', diff: 'M', trigger: 'Shortest path with hop limit' },
    ],
  },
  {
    id: 13, title: 'Backtracking', fires: '"generate all", constraint satisfaction', lesson: 'backtracking',
    problems: [
      { name: 'Subsets', lc: 'subsets', sub: 'Subsets', diff: 'M', trigger: 'All include/exclude combos' },
      { name: 'Subsets II', lc: 'subsets-ii', sub: 'Subsets', diff: 'M', trigger: 'Unique subsets with duplicates' },
      { name: 'Combinations', lc: 'combinations', sub: 'Combinations', diff: 'M', trigger: 'Pick exactly K' },
      { name: 'Combination Sum', lc: 'combination-sum', sub: 'Combinations', diff: 'M', trigger: 'Reusable picks to target sum', b75: true },
      { name: 'Letter Combinations of a Phone Number', lc: 'letter-combinations-of-a-phone-number', sub: 'Combinations', diff: 'M', trigger: 'Digit→letters mapping' },
      { name: 'Permutations', lc: 'permutations', sub: 'Permutations', diff: 'M', trigger: 'All orderings' },
      { name: 'Word Search', lc: 'word-search', sub: 'Grid Search', diff: 'M', trigger: 'Character path in grid', b75: true },
      { name: 'Palindrome Partitioning', lc: 'palindrome-partitioning', sub: 'Partitioning', diff: 'M', trigger: 'Slice string into palindromes' },
      { name: 'N-Queens', lc: 'n-queens', sub: 'Advanced', diff: 'H', trigger: 'Grid constraints (verticals/diagonals)' },
    ],
  },
  {
    id: 14, title: '1-D Dynamic Programming', fires: 'linear state, decode-ways, coin-change', lesson: 'dp-1d',
    problems: [
      { name: 'Climbing Stairs', lc: 'climbing-stairs', sub: 'Fibonacci Style', diff: 'E', trigger: 'State from last 2 steps', b75: true },
      { name: 'House Robber (I & II)', lc: 'house-robber', sub: 'Fibonacci Style', diff: 'M', trigger: 'Max sum, no adjacent picks', b75: true },
      { name: 'Min Cost Climbing Stairs', lc: 'min-cost-climbing-stairs', sub: 'Fibonacci Style', diff: 'E', trigger: 'Min cost, jump 1 or 2' },
      { name: 'Decode Ways', lc: 'decode-ways', sub: 'Constrained Counting', diff: 'M', trigger: 'Branch 1-digit vs valid 2-digit', b75: true },
      { name: 'Coin Change', lc: 'coin-change', sub: 'Take/Leave', diff: 'M', trigger: 'Fewest to reach target', b75: true },
      { name: 'Word Break', lc: 'word-break', sub: 'Take/Leave', diff: 'M', trigger: 'Segment into dictionary words', b75: true },
      { name: 'Longest Increasing Subsequence', lc: 'longest-increasing-subsequence', sub: 'Take/Leave', diff: 'M', trigger: 'Longest increasing, non-contiguous', b75: true },
      { name: 'Longest Palindromic Substring', lc: 'longest-palindromic-substring', sub: 'Palindromes', diff: 'M', trigger: 'Expand around center', b75: true },
      { name: 'Palindromic Substrings', lc: 'palindromic-substrings', sub: 'Palindromes', diff: 'M', trigger: 'Count all palindromes', b75: true },
    ],
  },
  {
    id: 15, title: '2-D Dynamic Programming', fires: 'two-string/grid, stock-state, intervals', lesson: 'dp-2d',
    problems: [
      { name: 'Unique Paths', lc: 'unique-paths', sub: 'Grid', diff: 'M', trigger: 'Ways to bottom-right', b75: true },
      { name: 'Longest Common Subsequence', lc: 'longest-common-subsequence', sub: 'String Matching', diff: 'M', trigger: 'Shared subsequence, two strings', b75: true },
      { name: 'Partition Equal Subset Sum', lc: 'partition-equal-subset-sum', sub: '0/1 Knapsack', diff: 'M', trigger: 'Split into two equal-sum subsets' },
      { name: 'Edit Distance', lc: 'edit-distance', sub: 'Edit DP', diff: 'M', trigger: 'Min ops to convert strings', b75: true },
      { name: 'Coin Change II', lc: 'coin-change-ii', sub: 'Unbounded Knapsack', diff: 'M', trigger: 'Count ways, unlimited coins' },
      { name: 'Buy/Sell Stock with Cooldown', lc: 'best-time-to-buy-and-sell-stock-with-cooldown', sub: 'State Machine', diff: 'M', trigger: 'hold/sold/rest states' },
      { name: 'Longest Increasing Path in a Matrix', lc: 'longest-increasing-path-in-a-matrix', sub: 'DFS + Memo', diff: 'H', trigger: 'Memoized DFS over a DAG' },
      { name: 'Burst Balloons', lc: 'burst-balloons', sub: 'Interval DP', diff: 'H', trigger: 'Choose last-to-burst per range' },
    ],
  },
  {
    id: 16, title: 'Tries', fires: 'prefix/autocomplete, wildcard search', lesson: 'tries',
    problems: [
      { name: 'Implement Trie (Prefix Tree)', lc: 'implement-trie-prefix-tree', sub: 'Construction', diff: 'M', trigger: 'Autocomplete / prefix tracking', b75: true },
      { name: 'Design Add and Search Words', lc: 'design-add-and-search-words-data-structure', sub: 'Trie + DFS', diff: 'M', trigger: 'Wildcard "." search', b75: true },
      { name: 'Word Search II', lc: 'word-search-ii', sub: 'Trie + DFS', diff: 'H', trigger: 'Many words in grid simultaneously', b75: true },
    ],
  },
  {
    id: 17, title: 'Math & Bit Manipulation', fires: 'O(1)-space tricks, counting bits', lesson: 'bit-manipulation',
    problems: [
      { name: 'Single Number', lc: 'single-number', sub: 'XOR', diff: 'E', trigger: 'O(1) space cancellation (XOR)' },
      { name: 'Number of 1 Bits', lc: 'number-of-1-bits', sub: 'XOR / Base 2', diff: 'E', trigger: 'popcount', b75: true },
      { name: 'Counting Bits', lc: 'counting-bits', sub: 'Bit DP', diff: 'E', trigger: 'dp[i] = dp[i>>1] + (i&1)', b75: true },
      { name: 'Missing Number', lc: 'missing-number', sub: 'XOR', diff: 'E', trigger: 'Missing in exact sequence', b75: true },
      { name: 'Reverse Bits', lc: 'reverse-bits', sub: 'Base 2', diff: 'E', trigger: 'Bit-by-bit reversal', b75: true },
    ],
  },
  {
    id: 18, title: 'Greedy', fires: 'local-optimal, jump game, gas station', lesson: 'greedy',
    problems: [
      { name: 'Maximum Subarray', lc: 'maximum-subarray', sub: "Kadane's", diff: 'M', trigger: 'Reset running sum when negative', b75: true },
      { name: 'Maximum Product Subarray', lc: 'maximum-product-subarray', sub: 'Kadane Variant', diff: 'M', trigger: 'Track min AND max (negatives swap)', b75: true },
      { name: 'Jump Game', lc: 'jump-game', sub: 'Reachability', diff: 'M', trigger: 'Track furthest reachable', b75: true },
      { name: 'Jump Game II', lc: 'jump-game-ii', sub: 'Reachability', diff: 'M', trigger: 'Fewest jumps — greedy window' },
      { name: 'Gas Station', lc: 'gas-station', sub: 'Circuit', diff: 'M', trigger: 'Start after the running deficit', b75: true },
      { name: 'Partition Labels', lc: 'partition-labels', sub: 'Interval Greedy', diff: 'M', trigger: 'Extend cut to letter\'s last index' },
      { name: 'Hand of Straights', lc: 'hand-of-straights', sub: 'Grouping', diff: 'M', trigger: 'Consume runs from smallest (TreeMap)' },
    ],
  },
  {
    id: 19, title: 'Hashing & Sets', fires: 'anagrams, longest-consecutive, O(1) lookup', lesson: 'hashing',
    problems: [
      { name: 'Contains Duplicate', lc: 'contains-duplicate', sub: 'Dedup', diff: 'E', trigger: 'Set size vs array size' },
      { name: 'Valid Anagram', lc: 'valid-anagram', sub: 'Frequency Map', diff: 'E', trigger: 'Same char multiset' },
      { name: 'Group Anagrams', lc: 'group-anagrams', sub: 'Hash by Signature', diff: 'M', trigger: 'Bucket by sorted-chars key', b75: true },
      { name: 'Longest Consecutive Sequence', lc: 'longest-consecutive-sequence', sub: 'Sequence Build', diff: 'M', trigger: 'Only start where n-1 absent', b75: true },
      { name: 'Encode and Decode Strings', lc: 'encode-and-decode-strings', sub: 'Serialization', diff: 'M', trigger: 'Length-prefix each chunk', b75: true, premium: true, lint: 'https://www.lintcode.com/problem/659/' },
    ],
  },
  {
    id: 20, title: 'Matrix & Geometry', fires: 'rotate/spiral/set-zeroes, pow(x,n)', lesson: 'matrix',
    problems: [
      { name: 'Rotate Image', lc: 'rotate-image', sub: 'In-Place Rotation', diff: 'M', trigger: 'Transpose + reverse rows' },
      { name: 'Spiral Matrix', lc: 'spiral-matrix', sub: 'Boundary Simulation', diff: 'M', trigger: 'Shrink 4 bounds' },
      { name: 'Set Matrix Zeroes', lc: 'set-matrix-zeroes', sub: 'In-Place Markers', diff: 'M', trigger: 'First row/col as flags' },
      { name: 'Pow(x, n)', lc: 'powx-n', sub: 'Fast Exponentiation', diff: 'M', trigger: 'Square and halve' },
    ],
  },
];

export const DSA_DEFERRED =
  'Deliberately deferred (FAANG-rare): Eulerian path, Regex/Wildcard DP, Distinct Subsequences, Interleaving String, KMP/Z/Rabin-Karp, tree views. Pattern noted — not grinding unless a target company demands it.';
