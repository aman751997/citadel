// Three-step hint ladders for every <HintLadder> in the Sliding Window lesson.
export const hints: Record<string, [string, string, string]> = {
  fixed: [
    'When the window moves one step, how many items actually change?',
    'sum holds the current k items; best starts at the first window’s sum, not at 0.',
    'Build the first k. For right from k to n − 1: sum += nums[right] − nums[right − k]; best = max(best, sum). Divide once at the end, as a double.',
  ],
  anagram: [
    'A permutation has the same letters and the same length. What does that fix about the window?',
    'A window of width s1.length(). diff[c] = need − have; unbalanced counts letters whose diff isn’t 0.',
    'Each slide: the newcomer decreases diff, the letter k back increases it, and unbalanced moves by at most one per change. Return true when unbalanced hits 0.',
  ],
  lamps: [
    'Stop choosing which zeros to flip. What must be true of a stretch that can become all ones?',
    'left, right and zeros (zeros in the window). Legal means zeros ≤ k.',
    'The right pointer adds; while zeros > k, left drops (zeros-- when the dropped item is 0); then record right − left + 1. Stop when right reaches the end.',
  ],
  noRepeats: [
    'When the newcomer makes the window illegal, which character is repeated?',
    'count[c] for what is in the window; or lastSeen[c] to jump. left is left, right is right.',
    'Counts: shrink while count[c] > 1, then record. Jump: left = max(left, lastSeen[c] + 1), then lastSeen[c] = right, then record.',
  ],
  baskets: [
    'Say the basket rule as a rule about the stretch of trees.',
    'A map from fruit type to count in the window; its size is the number of kinds.',
    'The right pointer adds; while size > 2, left drops and removes any key that hits 0; record after the loop.',
  ],
  repaint: [
    'If you repaint a window, which letter should you keep?',
    'count[26] and maxFreq. The window needs len − maxFreq repaints.',
    'maxFreq = max(maxFreq, ++count[new]); while len − maxFreq > k, drop left; record len. A stale maxFreq is safe; know why.',
  ],
  toll: [
    'Once a window qualifies, can growing it ever give a shorter answer?',
    'left, right, sum. Qualifies means sum ≥ target. best starts as “none”.',
    'The right pointer adds. While sum ≥ target: record right − left + 1, then sum −= nums[left++]. Return 0 if nothing was ever recorded.',
  ],
  shopping: [
    'What single number tells you that the window covers all of t?',
    'need[c] starts as t’s counts and goes negative for surplus. missing counts the characters of t still uncovered.',
    'The right pointer: if need[c] > 0, missing--; then need[c]--. While missing == 0: record, then left: need[out]++; if need[out] > 0, missing++.',
  ],
  mast: [
    'If a taller value arrives, can an older, shorter one ever be the tallest again?',
    'A deque of indices whose values decrease from front to back. The front is the window max.',
    'Pop the back while its value ≤ the newcomer; push right; pop the front if its index ≤ right − k; once right ≥ k − 1, record the front’s value.',
  ],
  stock: [
    'For a sale today, which earlier day is the best one to have bought on?',
    'minPrice is the cheapest day so far; best is the best profit so far.',
    'For each price: minPrice = min(minPrice, price); best = max(best, price − minPrice). Never subtract a later price from an earlier one.',
  ],
  exactlyK: [
    'Is “exactly K” monotone as the window grows? Is “at most K”?',
    'atMost(K): a counts map, shrink while size > K, and add right − left + 1 for every right.',
    'exactly(K) = atMost(K) − atMost(K − 1). Remove zero-count keys so size() stays honest.',
  ],
  deleteOne: [
    'The deletion is a zero you are allowed to skip. How many may the window hold?',
    'left, right, zeros; legal means zeros ≤ 1.',
    'Shrink while zeros > 1; record right − left (length minus the mandatory deletion).',
  ],
  product: [
    'With every value ≥ 1, what happens to a product as the window grows?',
    'product of the window; shrink by dividing out nums[left]. Guard k ≤ 1 first.',
    'The right pointer multiplies; while product ≥ k, divide and advance left; count += right − left + 1.',
  ],
  cards: [
    'The cards you take aren’t contiguous. Are the ones you leave behind?',
    'A fixed window of width n − k over the leftovers; total is the sum of every card.',
    'Slide the leftover block and keep its minimum sum. Answer = total − minimum leftover.',
  ],
  negatives: [
    'With negative values, which of the window’s promises breaks?',
    'Prefix sums: sum(i..j) = prefix[j + 1] − prefix[i]. Keep a deque of candidate starts with increasing prefixes.',
    'For each end: pop the front while prefix[end] − prefix[front] ≥ k (record end − front); pop the back while its prefix ≥ prefix[end]; push end.',
  ],
};
