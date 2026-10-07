// Three-step hint ladders for every <HintLadder> in backtracking.mdx.
export const hints: Record<string, [string, string, string]> = {
  subsets: [
    'Draw the tree for [1, 2, 3] first. If every node of the tree is an answer, where should the recording happen?',
    'One shared list, path. backtrack(start, path) records a copy of path on arrival, then offers every item from start onward.',
    'For i from start to n − 1: path.add(nums[i]); backtrack(i + 1, path); path.remove(path.size() − 1). Record with new ArrayList<>(path).',
  ],
  subsetsDup: [
    'Equal values at the same junction open identical corridors. How can you see that two values are equal without comparing every pair?',
    'Sort first, so twins sit side by side. Then at a junction, a twin of the door just walked opens nothing new.',
    'Inside the loop: if (i > start && nums[i] == nums[i − 1]) continue. i > start, not i > 0: the first door of a junction is always walked.',
  ],
  combine: [
    'This is Subsets with one change: which nodes are answers now?',
    'Record only when path.size() == k, then return. Numbers go in increasing order, so the child starts at i + 1.',
    'With need = k − path.size() numbers still to pick, the loop can stop at n − need + 1: after that, there is no room for the rest.',
  ],
  comboSum: [
    'Carry what is still owed. When is the thread complete, and when can it never be?',
    'Sort the coins. If a coin is bigger than what is owed, every later coin is too: break.',
    'Choose c[i], recurse with remain − c[i] and start = i (the same coin may come again), then remove it. Record a copy when remain == 0.',
  ],
  letters: [
    'There is no start index here. What is a level of the tree, and what are its doors?',
    'Depth = position in the word. The doors at depth pos are the letters of digits.charAt(pos).',
    'Use a StringBuilder: append, recurse with pos + 1, deleteCharAt the last. Record toString() at pos == length. Return [] for empty input.',
  ],
  permute: [
    'In an ordering, a smaller item may come after a bigger one. Which items are doors at every depth?',
    'Every item not already on the thread. A boolean[] used tracks exactly which items those are.',
    'Loop i from 0; skip used[i]; set used[i] = true and add; recurse; remove and set used[i] = false. Record when path.size() == n.',
  ],
  wordSearch: [
    'The thread is a path of cells. What stops the path from standing on the same tile twice?',
    'Mark the current cell (overwrite it with #) before exploring its four neighbours; a # never matches a letter.',
    'dfs(r, c, k): true if k == length; false if out of bounds or board[r][c] != word[k]; else mark, try 4 neighbours with k + 1, restore the letter, return the result.',
  ],
  palindrome: [
    'A partition is a sequence of pieces. At a junction, what do you choose?',
    'start is where the next piece begins. The doors are the end positions end = start … n − 1 whose piece is a palindrome.',
    'For each palindromic s[start..end]: add the piece, recurse with end + 1, remove it. Record a copy when start == n.',
  ],
  queens: [
    'No two queens share a row. What should one level of the tree be?',
    'One row per level; the doors are columns. Squares on one diagonal share r − c; on one anti-diagonal they share r + c.',
    'Three boolean arrays: cols[n], diag[2n − 1] at r − c + n − 1, anti[2n − 1] at r + c. Skip watched squares; set all three, recurse on r + 1, clear all three.',
  ],
  comboSum2: [
    'Two rules you already know: each coin at most once, and the purse holds twins.',
    'Each coin once means the child starts at i + 1. Twins mean sort, then skip c[i] when i > start and c[i] == c[i − 1].',
    'Sort; loop i from start: twin skip, then break if c[i] > remain, then add, recurse with (remain − c[i], i + 1), remove. Record at remain == 0.',
  ],
  permDup: [
    'Equal values make equal orderings. Can you force the equal copies into one fixed order?',
    'Sort, and keep used[]. A copy may only be placed when the copy to its left is already on the thread.',
    'In the loop: skip used[i]; also skip when i > 0 && nums[i] == nums[i − 1] && !used[i − 1]. The rest is Permutations.',
  ],
  parens: [
    'Each position is ( or ). Which of the two can never lead to a balanced string, and when?',
    'Count openers and closers placed so far. ( needs open < n; ) needs close < open.',
    'Two guarded doors: append (, recurse with open + 1, delete; append ), recurse with close + 1, delete. Record at length 2n.',
  ],
  comboSum3: [
    'Exactly k numbers, from 1 to 9, each once, summing to n. Which two earlier chapters is this?',
    'Fixed size k from Combinations; a purse that must reach 0 from Combination Sum; the child starts at d + 1.',
    'At size k, record only if remain == 0, then return. In the loop, break when d > remain: the stones only get bigger.',
  ],
  ip: [
    'Four pieces, cut in order. What are the doors at each junction, and what makes a piece valid?',
    'Doors: piece lengths 1, 2, 3. Valid: no leading zero unless the piece is exactly "0", and the value is at most 255.',
    'Prune when the remaining digits are fewer than the pieces left or more than 3 × pieces left. Record String.join(".", parts) when 4 pieces use every digit.',
  ],
  kPartition: [
    'Each coin goes to one of k buckets. When must a bucket refuse a coin, and when is everything done?',
    'side = total / k (return false if it doesn’t divide or a coin exceeds it). Place coins from biggest to smallest; a bucket refuses a coin that would overflow it.',
    'fill(i): true if i < 0. For each bucket that fits: add, recurse on i − 1, remove; if the bucket is now empty, break — every empty bucket is the same bucket.',
  ],
};
