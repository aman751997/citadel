// Hint ladders for the Binary Search lesson: three rungs each, then the Java in the lesson.
export const hints: Record<string, [string, string, string]> = {
  search: [
    'Which yes/no question about an index is "no" for a while and then "yes" forever after?',
    'Ask "is nums[i] ≥ target?". lo is the lowest index that might be the first yes; hi is a known yes, or n when none is known.',
    'While lo < hi: mid = lo + (hi − lo) / 2. Yes keeps mid (hi = mid); no steps past it (lo = mid + 1). Then check that lo < n and nums[lo] == target.',
  ],
  range: [
    'The first copy and the last copy are two different boundaries. Which two yes/no questions draw them?',
    'First copy: first index with nums[i] ≥ target. Last copy: one before the first index with nums[i] > target.',
    'Run the same template twice with the two conditions. If the first boundary is n or does not hold the target, return [−1, −1].',
  ],
  matrix: [
    'Read the grid row by row. What does the sequence of values look like?',
    'Number the cells 0 to rows × cols − 1. Cell k lives at row k / cols, column k % cols.',
    'Run Chapter 1 on k in [0, rows × cols): compare matrix[mid / cols][mid % cols] with the target; check the cell at lo at the end.',
  ],
  rotatedMin: [
    'Split the array into the run before the drop and the run after it. Which run holds the minimum?',
    'The last element always sits in the minimum’s run. nums[mid] > nums[hi] means mid is in the higher run.',
    'lo = 0, hi = n − 1. Higher run: lo = mid + 1. Otherwise mid might be the minimum: hi = mid. Return nums[lo].',
  ],
  rotatedSearch: [
    'Any slice of a rotated array has at least one side in plain sorted order. Can you tell which?',
    'Compare nums[mid] with nums[hi]. Smaller: [mid..hi] is in order. Otherwise [lo..mid] is in order.',
    'Ask whether the target lies inside the ordered side using BOTH of its ends. Inside: keep that side. Outside: keep the other. Keep mid whenever it could still be the target.',
  ],
  koko: [
    'Nothing is sorted. What gets easier, never harder, as the speed rises?',
    'canFinish(k): total hours Σ ceil(pile / k) ≤ h. The speeds run from 1 to the largest pile.',
    'Find the first speed where canFinish is true with the same template. Keep the hour total in a long.',
  ],
  ship: [
    'If a capacity works, does a bigger one also work?',
    'daysNeeded(c): load parcels in order, starting a new day whenever the next one would overflow c. Bounds: the heaviest parcel to the total weight.',
    'Search for the first capacity whose daysNeeded ≤ days. The lower bound is max(weights), not 1.',
  ],
  split: [
    'Turn "minimize the largest piece" into a yes/no question about a cap.',
    'piecesNeeded(cap): the greedy cut count from Chapter 7. Bounds: max(nums) to sum(nums).',
    'First cap with piecesNeeded ≤ k. Fewer pieces than k is fine: cut a piece further and no sum grows.',
  ],
  timeMap: [
    'Timestamps for one key arrive in increasing order. What does that give you for free?',
    'Store a list of times and a parallel list of values per key. "At or before t" is the slot just before the first time > t.',
    'Template on the time list with condition time > t. lo == 0 means nothing is old enough: return "". Otherwise return the value at lo − 1.',
  ],
  median: [
    'You do not need the merged list, only a cut that puts half the values on the left.',
    'Take i values from the shorter list a and j = half − i from b, where half = (m + n + 1) / 2. The cut is right when a[i − 1] ≤ b[j] and b[j − 1] ≤ a[i].',
    'The question "a[i] ≥ b[j − 1]?" is no-then-yes as i grows. Find the first yes over i in [0, m]. Then the median is the largest left value (odd total) or its average with the smallest right value (even).',
  ],
  insert: [
    'Where does "not found" end up in the template?',
    'The first index with nums[i] ≥ target is exactly where the target would sit.',
    'Return lo directly. When every value is smaller, lo parks at n, which is the right insert position.',
  ],
  peak: [
    'You do not need the whole array to be sorted. You need the half you keep to still hold an answer.',
    'Compare nums[mid] with nums[mid + 1]. Going downhill means a peak is at mid or to its left; uphill means one is to the right.',
    'lo = 0, hi = n − 1. Downhill: hi = mid. Uphill: lo = mid + 1. When lo == hi, that index is a peak.',
  ],
  sqrt: [
    'The answer is a number, not an index. Which question about k flips once?',
    '"Is k × k > x?" is no, no, …, yes. The answer is one less than the first yes.',
    'Search k in [0, x + 1] using long arithmetic so k × k cannot overflow. Return lo − 1.',
  ],
  rotatedDups: [
    'Rerun Chapter 5 on [1, 1, 1, 1, 1, 2, 1, 1]. When does the "which side is in order" test lose its meaning?',
    'When nums[mid] == nums[hi], either side could hold the drop. But nums[hi] has a copy at mid.',
    'On a tie, drop hi by one (its value survives at mid). Otherwise use Chapter 5’s rules. Worst case is O(n).',
  ],
  magnetic: [
    'Maximizing a minimum: if a gap d can be achieved, can every smaller gap also be achieved?',
    'Sort positions. placed(d): greedily put a bird at the first stall, then at the next stall at least d further on. "placed(d) < m" is no-then-yes.',
    'Search for the first gap that FAILS on [1, max − min + 1]. The answer is that gap minus one.',
  ],
  kthMatrix: [
    'Indexes are a mess here; the values are not. Search the value range instead.',
    'countAtMost(v): walk a staircase from the bottom-left corner, adding row + 1 for each column whose cell is ≤ v.',
    'First value v with countAtMost(v) ≥ k, over [matrix[0][0], matrix[n−1][n−1]]. That value always occurs in the matrix.',
  ],
};
