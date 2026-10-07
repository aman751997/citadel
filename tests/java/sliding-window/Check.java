import java.util.*;

// Runs every Java solution shown in sliding-window.mdx against brute-force oracles (every start, every
// end, recomputed from scratch) on hand-picked edge cases plus thousands of random small inputs.
// It also runs the lesson's "catch the bug" versions on the inputs the lesson names and checks that
// they really fail there. Any mismatch throws.
public class Check {
    static final Random R = new Random(2);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }
    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static String randText(String alphabet, int minLen, int maxLen) {
        StringBuilder sb = new StringBuilder();
        int n = minLen + R.nextInt(maxLen - minLen + 1);
        for (int i = 0; i < n; i++) sb.append(alphabet.charAt(R.nextInt(alphabet.length())));
        return sb.toString();
    }
    static long sum(int[] a, int from, int to) { long s = 0; for (int i = from; i <= to; i++) s += a[i]; return s; }
    static int distinct(int[] a, int from, int to) { Set<Integer> s = new HashSet<>(); for (int i = from; i <= to; i++) s.add(a[i]); return s.size(); }
    static int zeros(int[] a, int from, int to) { int z = 0; for (int i = from; i <= to; i++) if (a[i] == 0) z++; return z; }
    static int[] counts(String s) { int[] c = new int[128]; for (char ch : s.toCharArray()) c[ch]++; return c; }
    static boolean covers(String window, String t) {
        int[] w = counts(window), need = counts(t);
        for (int c = 0; c < 128; c++) if (w[c] < need[c]) return false;
        return true;
    }

    // ---------- brute-force oracles ----------
    static double bruteMaxAverage(int[] a, int k) {
        long best = Long.MIN_VALUE;
        for (int i = 0; i + k <= a.length; i++) best = Math.max(best, sum(a, i, i + k - 1));
        return (double) best / k;
    }
    static boolean brutePermutation(String s1, String s2) {
        char[] want = s1.toCharArray(); Arrays.sort(want);
        for (int i = 0; i + s1.length() <= s2.length(); i++) {
            char[] got = s2.substring(i, i + s1.length()).toCharArray(); Arrays.sort(got);
            if (Arrays.equals(want, got)) return true;
        }
        return false;
    }
    static int bruteOnes(int[] a, int k) {
        int best = 0;
        for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++) if (zeros(a, i, j) <= k) best = Math.max(best, j - i + 1);
        return best;
    }
    static int bruteNoRepeat(String s) {
        int best = 0;
        for (int i = 0; i < s.length(); i++) for (int j = i; j < s.length(); j++) {
            Set<Character> seen = new HashSet<>();
            boolean ok = true;
            for (int x = i; x <= j; x++) if (!seen.add(s.charAt(x))) ok = false;
            if (ok) best = Math.max(best, j - i + 1);
        }
        return best;
    }
    static int bruteFruit(int[] a) {
        int best = 0;
        for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++) if (distinct(a, i, j) <= 2) best = Math.max(best, j - i + 1);
        return best;
    }
    static int bruteReplacement(String s, int k) {
        int best = 0;
        for (int i = 0; i < s.length(); i++) for (int j = i; j < s.length(); j++) {
            int[] c = new int[26]; int max = 0;
            for (int x = i; x <= j; x++) max = Math.max(max, ++c[s.charAt(x) - 'A']);
            if (j - i + 1 - max <= k) best = Math.max(best, j - i + 1);
        }
        return best;
    }
    static int bruteMinLen(int target, int[] a) {
        int best = 0;
        for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++)
            if (sum(a, i, j) >= target && (best == 0 || j - i + 1 < best)) best = j - i + 1;
        return best;
    }
    static int bruteMinWindowLen(String s, String t) {
        int best = -1;
        for (int i = 0; i < s.length(); i++) for (int j = i; j < s.length(); j++)
            if (covers(s.substring(i, j + 1), t) && (best == -1 || j - i + 1 < best)) best = j - i + 1;
        return best;
    }
    static int[] bruteWindowMax(int[] a, int k) {
        int[] out = new int[a.length - k + 1];
        for (int i = 0; i + k <= a.length; i++) { int m = Integer.MIN_VALUE; for (int x = i; x < i + k; x++) m = Math.max(m, a[x]); out[i] = m; }
        return out;
    }
    static int bruteProfit(int[] p) {
        int best = 0;
        for (int i = 0; i < p.length; i++) for (int j = i + 1; j < p.length; j++) best = Math.max(best, p[j] - p[i]);
        return best;
    }
    static int bruteExactlyK(int[] a, int k) {
        int count = 0;
        for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++) if (distinct(a, i, j) == k) count++;
        return count;
    }
    static int bruteDeleteOne(int[] a) {
        int best = 0;
        for (int del = 0; del < a.length; del++) {
            int run = 0;
            for (int i = 0; i < a.length; i++) {
                if (i == del) continue;
                run = a[i] == 1 ? run + 1 : 0;
                best = Math.max(best, run);
            }
        }
        return best;
    }
    static int bruteProduct(int[] a, int k) {
        int count = 0;
        for (int i = 0; i < a.length; i++) { long p = 1; for (int j = i; j < a.length; j++) { p *= a[j]; if (p < k) count++; } }
        return count;
    }
    static int bruteCards(int[] a, int k) {
        int best = Integer.MIN_VALUE;
        for (int fromLeft = 0; fromLeft <= k; fromLeft++) {
            int s = 0;
            for (int i = 0; i < fromLeft; i++) s += a[i];
            for (int i = 0; i < k - fromLeft; i++) s += a[a.length - 1 - i];
            best = Math.max(best, s);
        }
        return best;
    }
    static int bruteShortestNeg(int[] a, int k) {
        int best = -1;
        for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++)
            if (sum(a, i, j) >= k && (best == -1 || j - i + 1 < best)) best = j - i + 1;
        return best;
    }
    static int bruteSubarraySum(int[] a, int k) {
        int count = 0;
        for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++) if (sum(a, i, j) == k) count++;
        return count;
    }

    // ---------- the lesson's buggy versions ----------
    static boolean bugPermutationNoTail(String s1, String s2) {
        int k = s1.length(); if (k > s2.length()) return false;
        int[] diff = new int[26];
        for (char c : s1.toCharArray()) diff[c - 'a']++;
        for (int right = 0; right < s2.length(); right++) {
            diff[s2.charAt(right) - 'a']--;
            boolean balanced = true;
            for (int d : diff) if (d != 0) balanced = false;
            if (right >= k - 1 && balanced) return true;
        }
        return false;
    }
    static int bugOnesRecordBeforeRepair(int[] nums, int k) {
        int left = 0, zeros = 0, best = 0;
        for (int right = 0; right < nums.length; right++) {
            if (nums[right] == 0) zeros++;
            best = Math.max(best, right - left + 1);
            while (zeros > k) { if (nums[left] == 0) zeros--; left++; }
        }
        return best;
    }
    static int lazyOnes(int[] nums, int k) {
        int left = 0, zeros = 0, best = 0;
        for (int right = 0; right < nums.length; right++) {
            if (nums[right] == 0) zeros++;
            if (zeros > k) { if (nums[left] == 0) zeros--; left++; }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
    static int bugNoGuard(String s) {
        int[] lastSeen = new int[128]; Arrays.fill(lastSeen, -1);
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (lastSeen[c] != -1) left = lastSeen[c] + 1;
            lastSeen[c] = right;
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
    static int bugFruitStaleKey(int[] fruits) {
        Map<Integer, Integer> inView = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < fruits.length; right++) {
            inView.merge(fruits[right], 1, Integer::sum);
            while (inView.size() > 2) { int out = fruits[left++]; inView.merge(out, -1, Integer::sum); }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
    static int bugReplacementMaxFreqPlusK(String s, int k) {
        int[] count = new int[26];
        int left = 0, maxFreq = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            maxFreq = Math.max(maxFreq, ++count[s.charAt(right) - 'A']);
            while (right - left + 1 - maxFreq > k) { count[s.charAt(left) - 'A']--; left++; }
            best = Math.max(best, maxFreq + k);
        }
        return best;
    }
    static int bugMinLenRecordAfter(int target, int[] nums) {
        int left = 0, sum = 0, best = Integer.MAX_VALUE;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum >= target) sum -= nums[left++];
            best = Math.min(best, right - left + 1);
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }
    static int bugMinLenIf(int target, int[] nums) {
        int left = 0, sum = 0, best = Integer.MAX_VALUE;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            if (sum >= target) { best = Math.min(best, right - left + 1); sum -= nums[left++]; }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }
    static String bugMinWindowCountsSurplus(String s, String t) {
        int[] need = new int[128]; boolean[] inT = new boolean[128];
        for (char c : t.toCharArray()) { need[c]++; inT[c] = true; }
        int missing = t.length(), left = 0, bestStart = 0, bestLen = Integer.MAX_VALUE;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (inT[c]) missing--;
            need[c]--;
            while (missing == 0) {
                if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestStart = left; }
                char out = s.charAt(left++);
                need[out]++;
                if (inT[out]) missing++;
            }
        }
        return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
    }
    static int[] bugWindowMaxOffByOne(int[] nums, int k) {
        int[] result = new int[nums.length - k + 1];
        Deque<Integer> deque = new ArrayDeque<>();
        for (int right = 0; right < nums.length; right++) {
            while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[right]) deque.pollLast();
            deque.offerLast(right);
            if (deque.peekFirst() < right - k) deque.pollFirst();
            if (right >= k - 1) result[right - k + 1] = nums[deque.peekFirst()];
        }
        return result;
    }
    static int bugMinLenOnNegatives(int target, int[] nums) { return new B_minSubArrayLen().minSubArrayLen(target, nums); }

    public static void main(String[] args) {
        // ---- Chapter 1: Maximum Average Subarray I
        eq(12.75, new B_findMaxAverage().findMaxAverage(new int[]{1, 12, -5, -6, 50, 3}, 4), "maxAverage classic");
        eq(-1.5, new B_findMaxAverage().findMaxAverage(new int[]{-3, -1, -2}, 2), "maxAverage all negative");
        eq(5.0, new B_findMaxAverage().findMaxAverage(new int[]{5}, 1), "maxAverage single");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 9, -10, 10);
            int k = 1 + R.nextInt(a.length);
            eq(bruteMaxAverage(a, k), new B_findMaxAverage().findMaxAverage(a, k), "maxAverage " + Arrays.toString(a) + " k=" + k);
        }

        // ---- Chapter 2: Permutation in String
        eq(true, new B_checkInclusion().checkInclusion("ab", "eidbaooo"), "permutation classic");
        eq(false, new B_checkInclusion().checkInclusion("ab", "eidboaoo"), "permutation classic false");
        eq(false, new B_checkInclusion().checkInclusion("abc", "ab"), "permutation longer s1");
        eq(false, bugPermutationNoTail("ab", "eidbaooo"), "bug: no Tail misses the later anagram");
        for (int t = 0; t < 4000; t++) {
            String s1 = randText("abc", 1, 4), s2 = randText("abc", 1, 9);
            eq(brutePermutation(s1, s2), new B_checkInclusion().checkInclusion(s1, s2), "permutation " + s1 + " in " + s2);
        }

        // ---- Chapter 3: Max Consecutive Ones III
        eq(6, new B_longestOnes().longestOnes(new int[]{1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0}, 2), "ones classic");
        eq(10, new B_longestOnes().longestOnes(new int[]{0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1}, 3), "ones lc example 2");
        eq(0, new B_longestOnes().longestOnes(new int[]{0, 0, 0}, 0), "ones all zero k=0");
        eq(2, new B_longestOnes().longestOnes(new int[]{1, 1, 0}, 0), "ones [1,1,0] k=0");
        eq(3, bugOnesRecordBeforeRepair(new int[]{1, 1, 0}, 0), "bug: record before repair logs 3");
        for (int t = 0; t < 3000; t++) {   // the lazy, never-shrinking variant the lesson mentions is also correct
            int[] a = randArr(0, 10, 0, 1);
            int k = R.nextInt(4);
            eq(bruteOnes(a, k), lazyOnes(a, k), "lazy ones " + Arrays.toString(a) + " k=" + k);
        }
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(0, 10, 0, 1);
            int k = R.nextInt(4);
            eq(bruteOnes(a, k), new B_longestOnes().longestOnes(a, k), "ones " + Arrays.toString(a) + " k=" + k);
        }

        // ---- Chapter 4: Longest Substring Without Repeating Characters (both versions)
        for (String s : new String[]{"abba", "abcabcbb", "bbbbb", "pwwkew", "", " ", "dvdf", "tmmzuxt"}) {
            eq(bruteNoRepeat(s), new B_noRepeatCounts().lengthOfLongestSubstring(s), "noRepeat counts " + s);
            eq(bruteNoRepeat(s), new B_noRepeatJump().lengthOfLongestSubstring(s), "noRepeat jump " + s);
        }
        eq(2, new B_noRepeatJump().lengthOfLongestSubstring("abba"), "abba is 2");
        eq(3, bugNoGuard("abba"), "bug: unguarded jump returns 3 on abba");
        for (int t = 0; t < 4000; t++) {
            String s = randText("abc d", 0, 10);
            eq(bruteNoRepeat(s), new B_noRepeatCounts().lengthOfLongestSubstring(s), "noRepeat counts " + s);
            eq(bruteNoRepeat(s), new B_noRepeatJump().lengthOfLongestSubstring(s), "noRepeat jump " + s);
        }

        // ---- Chapter 5: Fruit Into Baskets
        eq(4, new B_totalFruit().totalFruit(new int[]{1, 2, 3, 2, 2}), "fruit lesson");
        eq(3, new B_totalFruit().totalFruit(new int[]{1, 2, 1}), "fruit lc 1");
        eq(3, new B_totalFruit().totalFruit(new int[]{0, 1, 2, 2}), "fruit lc 2");
        eq(5, new B_totalFruit().totalFruit(new int[]{3, 3, 3, 1, 2, 1, 1, 2, 3, 3, 4}), "fruit lc 3");
        boolean threw = false;
        try { bugFruitStaleKey(new int[]{1, 2, 3, 2, 2}); } catch (ArrayIndexOutOfBoundsException e) { threw = true; }
        eq(true, threw, "bug: stale key runs Tail off the end on [1,2,3,2,2]");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 10, 0, 3);
            eq(bruteFruit(a), new B_totalFruit().totalFruit(a), "fruit " + Arrays.toString(a));
        }

        // ---- Chapter 6: Longest Repeating Character Replacement
        eq(4, new B_characterReplacement().characterReplacement("ABAB", 2), "replacement lc 1");
        eq(4, new B_characterReplacement().characterReplacement("AABABBA", 1), "replacement lc 2 / lesson");
        eq(4, new B_characterReplacement().characterReplacement("AAAA", 2), "replacement AAAA k=2");
        eq(6, bugReplacementMaxFreqPlusK("AAAA", 2), "bug: maxFreq + k claims 6 on AAAA");
        for (int t = 0; t < 4000; t++) {
            String s = randText("ABC", 1, 10);
            int k = R.nextInt(4);
            eq(bruteReplacement(s, k), new B_characterReplacement().characterReplacement(s, k), "replacement " + s + " k=" + k);
        }

        // ---- Chapter 7: Minimum Size Subarray Sum
        eq(2, new B_minSubArrayLen().minSubArrayLen(7, new int[]{2, 3, 1, 2, 4, 3}), "minLen classic");
        eq(1, new B_minSubArrayLen().minSubArrayLen(4, new int[]{1, 4, 4}), "minLen lc 2");
        eq(0, new B_minSubArrayLen().minSubArrayLen(11, new int[]{1, 1, 1, 1, 1, 1, 1, 1}), "minLen none");
        eq(1, new B_minSubArrayLen().minSubArrayLen(10, new int[]{1, 1, 1, 10}), "minLen [1,1,1,10]");
        eq(1, bugMinLenRecordAfter(7, new int[]{2, 3, 1, 2, 4, 3}), "bug: record after returns 1");
        eq(4, bugMinLenIf(10, new int[]{1, 1, 1, 10}), "bug: if instead of while returns 4");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 10, 1, 6);
            int target = 1 + R.nextInt(20);
            eq(bruteMinLen(target, a), new B_minSubArrayLen().minSubArrayLen(target, a), "minLen " + Arrays.toString(a) + " t=" + target);
        }

        // ---- Chapter 8: Minimum Window Substring (any minimal covering window is valid; ties allowed)
        eq("BANC", new B_minWindow().minWindow("ADOBECODEBANC", "ABC"), "minWindow classic");
        eq("a", new B_minWindow().minWindow("a", "a"), "minWindow single");
        eq("", new B_minWindow().minWindow("a", "aa"), "minWindow impossible");
        eq("", new B_minWindow().minWindow("aa", "ab"), "minWindow aa/ab");
        eq("aa", bugMinWindowCountsSurplus("aa", "ab"), "bug: surplus decrements report aa");
        for (int t = 0; t < 3000; t++) {
            String s = randText("abc", 1, 10), tt = randText("abc", 1, 3);
            int expectLen = bruteMinWindowLen(s, tt);
            String got = new B_minWindow().minWindow(s, tt);
            if (expectLen == -1) eq("", got, "minWindow none " + s + " / " + tt);
            else {
                eq(expectLen, got.length(), "minWindow length " + s + " / " + tt);
                yes(s.contains(got) && covers(got, tt), "minWindow covers " + s + " / " + tt + " got " + got);
            }
        }

        // ---- Chapter 9: Sliding Window Maximum
        eq(new int[]{3, 3, 5, 5, 6, 7}, new B_maxSlidingWindow().maxSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3), "windowMax classic");
        eq(new int[]{1}, new B_maxSlidingWindow().maxSlidingWindow(new int[]{1}, 1), "windowMax single");
        eq(new int[]{5, 1}, new B_maxSlidingWindow().maxSlidingWindow(new int[]{5, 1, 1}, 2), "windowMax [5,1,1]");
        eq(new int[]{5, 5}, bugWindowMaxOffByOne(new int[]{5, 1, 1}, 2), "bug: off-by-one front returns [5,5]");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 10, -5, 5);
            int k = 1 + R.nextInt(a.length);
            eq(bruteWindowMax(a, k), new B_maxSlidingWindow().maxSlidingWindow(a, k), "windowMax " + Arrays.toString(a) + " k=" + k);
        }

        // ---- Chapter 10: Best Time to Buy and Sell Stock (both versions)
        for (int[] p : new int[][]{{7, 1, 5, 3, 6, 4}, {7, 6, 4, 3, 1}, {2, 1}, {5}, {1, 2}}) {
            eq(bruteProfit(p), new B_maxProfit().maxProfit(p), "profit " + Arrays.toString(p));
            eq(bruteProfit(p), new B_maxProfitWindow().maxProfit(p), "profit window " + Arrays.toString(p));
        }
        eq(5, new B_maxProfit().maxProfit(new int[]{7, 1, 5, 3, 6, 4}), "profit classic is 5");
        for (int t = 0; t < 3000; t++) {
            int[] p = randArr(1, 10, 0, 9);
            eq(bruteProfit(p), new B_maxProfit().maxProfit(p), "profit " + Arrays.toString(p));
            eq(bruteProfit(p), new B_maxProfitWindow().maxProfit(p), "profit window " + Arrays.toString(p));
        }

        // ---- Side quest 1: Subarrays with exactly K distinct
        eq(7, new B_subarraysWithKDistinct().subarraysWithKDistinct(new int[]{1, 2, 1, 2, 3}, 2), "exactlyK lc 1");
        eq(3, new B_subarraysWithKDistinct().subarraysWithKDistinct(new int[]{1, 2, 1, 3, 4}, 3), "exactlyK lc 2");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 9, 1, 4);
            int k = 1 + R.nextInt(4);
            eq(bruteExactlyK(a, k), new B_subarraysWithKDistinct().subarraysWithKDistinct(a, k), "exactlyK " + Arrays.toString(a) + " k=" + k);
        }

        // ---- Side quest 2: Longest subarray of 1s after deleting one element
        eq(3, new B_longestSubarray().longestSubarray(new int[]{1, 1, 0, 1}), "deleteOne lc 1");
        eq(5, new B_longestSubarray().longestSubarray(new int[]{0, 1, 1, 1, 0, 1, 1, 0, 1}), "deleteOne lc 2");
        eq(2, new B_longestSubarray().longestSubarray(new int[]{1, 1, 1}), "deleteOne all ones");
        eq(0, new B_longestSubarray().longestSubarray(new int[]{0}), "deleteOne [0]");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 10, 0, 1);
            eq(bruteDeleteOne(a), new B_longestSubarray().longestSubarray(a), "deleteOne " + Arrays.toString(a));
        }

        // ---- Side quest 3: Subarray Product Less Than K
        eq(8, new B_numSubarrayProductLessThanK().numSubarrayProductLessThanK(new int[]{10, 5, 2, 6}, 100), "product lc 1");
        eq(0, new B_numSubarrayProductLessThanK().numSubarrayProductLessThanK(new int[]{1, 2, 3}, 0), "product k=0");
        eq(0, new B_numSubarrayProductLessThanK().numSubarrayProductLessThanK(new int[]{1, 1, 1}, 1), "product k=1");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 9, 1, 6);
            int k = R.nextInt(60);
            eq(bruteProduct(a, k), new B_numSubarrayProductLessThanK().numSubarrayProductLessThanK(a, k), "product " + Arrays.toString(a) + " k=" + k);
        }

        // ---- Side quest 4: Maximum Points from Cards
        eq(12, new B_maxScore().maxScore(new int[]{1, 2, 3, 4, 5, 6, 1}, 3), "cards lc 1 / figure");
        eq(4, new B_maxScore().maxScore(new int[]{2, 2, 2}, 2), "cards lc 2");
        eq(55, new B_maxScore().maxScore(new int[]{9, 7, 7, 9, 7, 7, 9}, 7), "cards take all");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 9, 1, 9);
            int k = 1 + R.nextInt(a.length);
            eq(bruteCards(a, k), new B_maxScore().maxScore(a, k), "cards " + Arrays.toString(a) + " k=" + k);
        }

        // ---- Side quest 5: Shortest Subarray with Sum at Least K (negatives allowed)
        eq(3, new B_shortestSubarray().shortestSubarray(new int[]{2, -1, 2}, 3), "negatives lc 3");
        eq(1, new B_shortestSubarray().shortestSubarray(new int[]{-1, 3}, 3), "negatives [-1,3]");
        eq(-1, new B_shortestSubarray().shortestSubarray(new int[]{1, 2}, 4), "negatives none");
        eq(0, bugMinLenOnNegatives(3, new int[]{-1, 3}), "bug: positive-only window reports none on [-1,3]");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 10, -5, 6);
            int k = 1 + R.nextInt(12);
            eq(bruteShortestNeg(a, k), new B_shortestSubarray().shortestSubarray(a, k), "negatives " + Arrays.toString(a) + " k=" + k);
        }

        // ---- Choose the tool: Subarray Sum Equals K
        eq(3, new B_subarraySum().subarraySum(new int[]{1, -1, 1}, 1), "subarraySum lesson");
        eq(2, new B_subarraySum().subarraySum(new int[]{1, 1, 1}, 2), "subarraySum lc 1");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(0, 9, -3, 3);
            int k = R.nextInt(7) - 3;
            eq(bruteSubarraySum(a, k), new B_subarraySum().subarraySum(a, k), "subarraySum " + Arrays.toString(a) + " k=" + k);
        }

        System.out.println("OK sliding-window: " + cases + " checks passed");
    }
}
