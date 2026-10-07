// Three-step hint ladders for every <HintLadder> in hashing.mdx.
export const hints: Record<string, [string, string, string]> = {
  containsDuplicate: [
    'Comparing every pair is O(n²). What could you keep as you go, so that “have I seen this before?” costs one step?',
    'A HashSet of the values met so far. A repeat of x can only be filed in x’s own hole, so one lookup answers the question.',
    'For each x: if seen.add(x) returns false, x was already there, so return true. After the loop, return false.',
  ],
  twoSum: [
    'Holding x, you know exactly which value would complete the pair. Has it passed you already?',
    'Keep a map from each value you have read to its index. The partner of x is target − x.',
    'For each i: look up target − nums[i] first; if it is there at j, return [j, i]. Only then put nums[i] → i.',
  ],
  pathCrossing: [
    'A corner is two numbers. How do you ask a set “have I stood here before?” about a pair?',
    'Make the pair a key whose equals and hashCode both come from x and y: a record Point(int x, int y) does it for you.',
    'File (0, 0), then for each move update x or y and call visited.add(new Point(x, y)); if it returns false, the path has crossed.',
  ],
  anagram: [
    'Positions do not matter, only how many of each letter. What is the cheapest way to count 26 letters?',
    'An int[26] indexed by c − \'a\'. Different lengths can never be anagrams, so check that first.',
    'In one loop, add 1 for s.charAt(i) and subtract 1 for t.charAt(i). The strings are anagrams exactly when every count ends at 0.',
  ],
  group: [
    'Find something every rearrangement of a word shares, and nothing else does.',
    'Sort the word’s letters: "eat", "tea" and "ate" all become "aet". Use that string as a map key.',
    'For each word, groups.computeIfAbsent(key, k -> new ArrayList<>()).add(word); return the map’s values. (Or key by the 26 counts, with a # after each.)',
  ],
  streak: [
    'Sorting costs O(n log n). Which question about x can a set answer in O(1) and tell you that x begins a run?',
    'Put every number in a set. x begins a run exactly when x − 1 is not in the set; every other number is reached by its run’s start.',
    'For each x in the set (not in the array) whose x − 1 is absent, walk cur = x upward while cur + 1 is present; the run length is cur − x + 1. Keep the best.',
  ],
  codec: [
    'Any separator character could also appear inside a string. What could you write before each string so the reader never has to look for an end marker?',
    'Write its length, a #, then the string itself. The digits of a length never contain #.',
    'Decode with an index i: j = indexOf(\'#\', i); len = parseInt(substring(i, j)); take substring(j + 1, j + 1 + len); set i = j + 1 + len; repeat until i reaches the end.',
  ],
  isomorphic: [
    'A one-way map makes sure each letter of s is always replaced the same way. What else can go wrong?',
    'Two different letters of s may not both become the same letter of t. Keep a second map, from t back to s.',
    'At each i, putIfAbsent in both maps; if either already held a different partner, return false. Compare Characters with equals, never ==.',
  ],
  nearby: [
    'Only twins at most k positions apart count. Which earlier values could still be a twin of nums[i]?',
    'Only nums[i − k] through nums[i − 1]. Keep exactly those k values in a set.',
    'For each i: if window.add(nums[i]) returns false, return true; then, if the window holds more than k values, remove nums[i − k].',
  ],
  topK: [
    'First count every value. Then you need the k largest counts, faster than sorting them.',
    'No count can exceed n. Make buckets indexed by count, 0..n, each holding the values with that count.',
    'Walk the buckets from n down to 1, taking values until you have k.',
  ],
  sudoku: [
    'Every filled cell belongs to one row, one column and one box. What must each of those 27 groups never contain twice?',
    'Give every row, column and box its own small set of digits. Number the boxes 0..8 with (r / 3) * 3 + c / 3.',
    'For each filled cell: if its digit is already in its row, column or box set, return false; otherwise add it to all three.',
  ],
  happy: [
    'If the numbers never reach 1, they must eventually repeat. Why must they repeat, and how do you notice?',
    'Any number with 4 or more digits shrinks, so the sequence stays among a few hundred values. Keep every value you have met in a set.',
    'Loop while n != 1 and seen.add(n) succeeds, replacing n by the sum of the squares of its digits; return n == 1. (Floyd: a slow and a fast walker meet on any cycle.)',
  ],
  firstUnique: [
    'Counting tells you which letters are unique, but not which one comes first. Who remembers the order?',
    'One pass to count into an int[26]. The string itself still holds the order.',
    'Second pass over the string, not over the counts: return the first i whose letter has count 1, or −1.',
  ],
};
