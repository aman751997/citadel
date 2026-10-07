import java.util.*;

// Runs every Java solution shown in dp-1d.mdx against independent oracles: exhaustive enumeration
// (every climb, every set of houses, every way to cut a string, every subsequence, every subset),
// breadth-first search, or direct simulation of the rules, on hand-picked edge cases plus thousands of
// random small inputs. It also proves that each "catch the bug" version the lesson names fails on the
// input the lesson names, and that every number in the lesson's figures is right.
public class Check {
    static final Random R = new Random(14);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        if (o instanceof boolean[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }
    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static String randDigits(int minLen, int maxLen, String alphabet) {
        int n = minLen + R.nextInt(maxLen - minLen + 1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(alphabet.charAt(R.nextInt(alphabet.length())));
        return sb.toString();
    }

    // ---------- independent oracles ----------
    // Climbs of n steps using moves of 1..k: enumerate every move sequence explicitly.
    static long countClimbs(int remaining, int k) {
        if (remaining == 0) return 1;
        long c = 0;
        for (int m = 1; m <= k && m <= remaining; m++) c += countClimbs(remaining - m, k);
        return c;
    }
    // Same count by a formula: choose which of the moves are 2-steps. sum over t of C(n - t, t).
    static long binomialClimbs(int n) {
        long total = 0;
        for (int t = 0; 2 * t <= n; t++) total += binom(n - t, t);
        return total;
    }
    static long binom(int n, int k) { long r = 1; for (int i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
    // Min cost: try every legal path to the top (start at 0 or 1, move 1 or 2, pay each step you stand on).
    static int bruteMinCost(int[] cost, int at) {
        if (at >= cost.length) return 0;
        return cost[at] + Math.min(bruteMinCost(cost, at + 1), bruteMinCost(cost, at + 2));
    }
    static int bruteMinCost(int[] cost) { return Math.min(bruteMinCost(cost, 0), bruteMinCost(cost, 1)); }
    // House robber: every subset of houses with no two adjacent (and, on a circle, not both ends).
    static int bruteRob(int[] a, boolean circle) {
        int n = a.length, best = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if ((mask & (mask >> 1)) != 0) continue;
            if (circle && n > 1 && (mask & 1) != 0 && (mask & (1 << (n - 1))) != 0) continue;
            int s = 0;
            for (int i = 0; i < n; i++) if ((mask >> i & 1) != 0) s += a[i];
            best = Math.max(best, s);
        }
        return best;
    }
    // Decode ways: every way to cut the string into 1- or 2-digit pieces, each a letter code 1..26.
    static int bruteDecode(String s, int from) {
        if (from == s.length()) return 1;
        int c = 0;
        for (int len = 1; len <= 2 && from + len <= s.length(); len++) {
            String piece = s.substring(from, from + len);
            if (piece.charAt(0) == '0') continue;
            int v = Integer.parseInt(piece);
            if (v >= 1 && v <= 26) c += bruteDecode(s, from + len);
        }
        return c;
    }
    // Coin change: try every count of every coin (bounded by amount / coin).
    static int bruteCoins(int[] coins, int idx, int amount) {
        if (amount == 0) return 0;
        if (idx == coins.length) return Integer.MAX_VALUE;
        int best = Integer.MAX_VALUE;
        for (int k = 0; k * coins[idx] <= amount; k++) {
            int rest = bruteCoins(coins, idx + 1, amount - k * coins[idx]);
            if (rest != Integer.MAX_VALUE) best = Math.min(best, rest + k);
        }
        return best;
    }
    static int bruteCoins(int[] coins, int amount) { int b = bruteCoins(coins, 0, amount); return b == Integer.MAX_VALUE ? -1 : b; }
    // Word break: try every set of cut positions.
    static boolean bruteWordBreak(String s, Set<String> dict) {
        int n = s.length();
        if (n == 0) return true;
        for (int mask = 0; mask < (1 << (n - 1)); mask++) {
            int start = 0; boolean good = true;
            for (int i = 1; i <= n && good; i++) {
                if (i == n || (mask >> (i - 1) & 1) != 0) { good = dict.contains(s.substring(start, i)); start = i; }
            }
            if (good) return true;
        }
        return false;
    }
    // LIS: every subsequence (bitmask) that is strictly increasing.
    static int[] bruteLis(int[] a) {     // {longest length, number of index-sets reaching it}
        int n = a.length, best = 0, count = 0;
        for (int mask = 1; mask < (1 << n); mask++) {
            int last = Integer.MIN_VALUE, len = 0; boolean inc = true; boolean first = true;
            for (int i = 0; i < n && inc; i++) if ((mask >> i & 1) != 0) {
                if (!first && a[i] <= last) inc = false;
                last = a[i]; len++; first = false;
            }
            if (!inc) continue;
            if (len > best) { best = len; count = 1; } else if (len == best) count++;
        }
        return new int[]{best, count};
    }
    static boolean isPal(String s) { return new StringBuilder(s).reverse().toString().equals(s); }
    static int bruteLongestPalLen(String s) {
        int best = 0;
        for (int i = 0; i < s.length(); i++) for (int j = i + 1; j <= s.length(); j++) if (isPal(s.substring(i, j))) best = Math.max(best, j - i);
        return best;
    }
    static int bruteCountPal(String s) {
        int c = 0;
        for (int i = 0; i < s.length(); i++) for (int j = i + 1; j <= s.length(); j++) if (isPal(s.substring(i, j))) c++;
        return c;
    }
    // Delete and earn: play the actual game on the multiset, trying every pick.
    static int bruteEarn(List<Integer> bag) {
        int best = 0;
        for (int i = 0; i < bag.size(); i++) {
            if (i > 0 && bag.get(i).equals(bag.get(i - 1))) continue;     // same value, same outcome
            int v = bag.get(i);
            List<Integer> rest = new ArrayList<>(bag);
            rest.remove(i);
            rest.removeIf(x -> x == v - 1 || x == v + 1);
            best = Math.max(best, v + bruteEarn(rest));
        }
        return best;
    }
    // Perfect squares: breadth-first search over totals (each edge adds one square).
    static int bfsSquares(int n) {
        int[] dist = new int[n + 1]; Arrays.fill(dist, -1); dist[0] = 0;
        ArrayDeque<Integer> q = new ArrayDeque<>(); q.add(0);
        while (!q.isEmpty()) {
            int x = q.poll();
            for (int r = 1; x + r * r <= n; r++) if (dist[x + r * r] < 0) { dist[x + r * r] = dist[x] + 1; q.add(x + r * r); }
        }
        return dist[n];
    }
    // Partition: every subset.
    static boolean brutePartition(int[] a) {
        int total = 0; for (int x : a) total += x;
        for (int mask = 0; mask < (1 << a.length); mask++) {
            int s = 0; for (int i = 0; i < a.length; i++) if ((mask >> i & 1) != 0) s += a[i];
            if (2 * s == total) return true;
        }
        return false;
    }
    // Tribonacci straight from the definition (no memo).
    static long tribRec(int n) { return n == 0 ? 0 : n <= 2 ? 1 : tribRec(n - 1) + tribRec(n - 2) + tribRec(n - 3); }
    // Tickets: for each uncovered trip, try buying each pass starting that day.
    static int bruteTickets(int[] days, int[] costs, int idx) {
        if (idx == days.length) return 0;
        int best = Integer.MAX_VALUE;
        int[] span = {1, 7, 30};
        for (int p = 0; p < 3; p++) {
            int j = idx;
            while (j < days.length && days[j] < days[idx] + span[p]) j++;
            best = Math.min(best, costs[p] + bruteTickets(days, costs, j));
        }
        return best;
    }
    // Jump game: depth-first search over indexes.
    static boolean bruteJump(int[] a) {
        boolean[] seen = new boolean[a.length]; ArrayDeque<Integer> st = new ArrayDeque<>(); st.push(0); seen[0] = true;
        while (!st.isEmpty()) {
            int i = st.pop();
            for (int j = i + 1; j <= i + a[i] && j < a.length; j++) if (!seen[j]) { seen[j] = true; st.push(j); }
        }
        return seen[a.length - 1];
    }

    // ---------- the buggy versions the lesson names ----------
    static void countAsks(int n, long[] asked) {
        asked[n]++;
        if (n <= 1) return;
        countAsks(n - 1, asked); countAsks(n - 2, asked);
    }
    static long[] countAsksFor(int n) { long[] a = new long[n + 1]; countAsks(n, a); return a; }
    static int climbOverwrite(int n) {                        // overwrites prev before using it
        int prev = 1, curr = 1;
        for (int i = 2; i <= n; i++) { prev = curr; curr = curr + prev; }
        return curr;
    }
    static boolean wordBreakGreedyShortest(String s, Set<String> dict) {
        int at = 0;
        while (at < s.length()) {
            int took = -1;
            for (int end = at + 1; end <= s.length(); end++) if (dict.contains(s.substring(at, end))) { took = end; break; }
            if (took < 0) return false;
            at = took;
        }
        return true;
    }
    static int minCostStopsOnLastStep(int[] cost) {           // returns dp[n-1] instead of dp[n]
        int n = cost.length; int[] dp = new int[n + 1];
        for (int i = 2; i <= n; i++) dp[i] = Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);
        return dp[n - 1];
    }
    static int robEveryOther(int[] a) {                       // best of "all even indexes" or "all odd indexes"
        int even = 0, odd = 0;
        for (int i = 0; i < a.length; i++) if (i % 2 == 0) even += a[i]; else odd += a[i];
        return Math.max(even, odd);
    }
    static int robBiggestFirst(int[] a) {                     // greedy: grab the biggest house still allowed
        boolean[] blocked = new boolean[a.length]; int total = 0;
        while (true) {
            int pick = -1;
            for (int i = 0; i < a.length; i++) if (!blocked[i] && (pick < 0 || a[i] > a[pick])) pick = i;
            if (pick < 0) return total;
            total += a[pick]; blocked[pick] = true;
            if (pick > 0) blocked[pick - 1] = true;
            if (pick + 1 < a.length) blocked[pick + 1] = true;
        }
    }
    static int robCircleNoSingleCheck(int[] nums) {          // forgets n == 1
        int n = nums.length;
        return Math.max(robLine(nums, 0, n - 2), robLine(nums, 1, n - 1));
    }
    static int robLine(int[] nums, int lo, int hi) {
        int prev = 0, curr = 0;
        for (int i = lo; i <= hi; i++) { int next = Math.max(curr, prev + nums[i]); prev = curr; curr = next; }
        return curr;
    }
    static int decodeParseOnly(String s) {                    // two-digit test without the leading-zero rule
        int n = s.length(); int[] dp = new int[n + 1]; dp[0] = 1;
        for (int i = 1; i <= n; i++) {
            if (s.charAt(i - 1) != '0') dp[i] += dp[i - 1];
            if (i >= 2 && Integer.parseInt(s.substring(i - 2, i)) <= 26) dp[i] += dp[i - 2];
        }
        return dp[n];
    }
    static int coinChangeMaxValue(int[] coins, int amount) {  // INF = Integer.MAX_VALUE, then + 1 overflows
        int[] dp = new int[amount + 1]; Arrays.fill(dp, Integer.MAX_VALUE); dp[0] = 0;
        for (int a = 1; a <= amount; a++) for (int c : coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
        return dp[amount] > amount ? -1 : dp[amount];
    }
    static int coinGreedy(int[] coins, int amount) {          // biggest coin first
        int[] c = coins.clone(); Arrays.sort(c); int used = 0;
        for (int i = c.length - 1; i >= 0; i--) { used += amount / c[i]; amount %= c[i]; }
        return amount == 0 ? used : -1;
    }
    static boolean wordBreakGreedyLongest(String s, Set<String> dict) {
        int at = 0;
        while (at < s.length()) {
            int took = -1;
            for (int end = s.length(); end > at; end--) if (dict.contains(s.substring(at, end))) { took = end; break; }
            if (took < 0) return false;
            at = took;
        }
        return true;
    }
    static int lisReturnsLast(int[] nums) {                   // returns dp[n-1] instead of the max
        int n = nums.length; int[] dp = new int[n];
        for (int i = 0; i < n; i++) { dp[i] = 1; for (int j = 0; j < i; j++) if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1); }
        return dp[n - 1];
    }
    static int[] tailsArray(int[] nums) {
        int[] tails = new int[nums.length]; int size = 0;
        for (int x : nums) {
            int lo = 0, hi = size;
            while (lo < hi) { int mid = (lo + hi) >>> 1; if (tails[mid] < x) lo = mid + 1; else hi = mid; }
            tails[lo] = x; if (lo == size) size++;
        }
        return Arrays.copyOf(tails, size);
    }
    static int lisTailsUpperBound(int[] nums) {               // "first tail > x": allows equal values
        int[] tails = new int[nums.length]; int size = 0;
        for (int x : nums) {
            int lo = 0, hi = size;
            while (lo < hi) { int mid = (lo + hi) >>> 1; if (tails[mid] <= x) lo = mid + 1; else hi = mid; }
            tails[lo] = x; if (lo == size) size++;
        }
        return size;
    }
    static String longestOddOnly(String s) {
        int bl = 0, br = 0;
        for (int c = 0; c < s.length(); c++) {
            int l = c, r = c;
            while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) { l--; r++; }
            if (r - 1 - (l + 1) > br - bl) { bl = l + 1; br = r - 1; }
        }
        return s.substring(bl, br + 1);
    }
    static int countTableWrongOrder(String s) {               // i ascending: reads pal[i+1][j-1] before it is written
        int n = s.length(), count = 0; boolean[][] pal = new boolean[n][n];
        for (int i = 0; i < n; i++) for (int j = i; j < n; j++) {
            pal[i][j] = s.charAt(i) == s.charAt(j) && (j - i < 2 || pal[i + 1][j - 1]);
            if (pal[i][j]) count++;
        }
        return count;
    }
    static boolean partitionForwards(int[] nums) {
        int total = 0; for (int x : nums) total += x;
        if (total % 2 != 0) return false;
        int target = total / 2; boolean[] can = new boolean[target + 1]; can[0] = true;
        for (int x : nums) for (int s = x; s <= target; s++) can[s] = can[s] || can[s - x];
        return can[target];
    }

    static int[] ints(int... a) { return a; }

    public static void main(String[] args) {
        // ---------- Chapter 1: Climbing Stairs, four versions ----------
        {
            int[] ways = {1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89};
            for (int n = 1; n <= 10; n++) {
                eq(ways[n], new B_climbBrute().climbStairs(n), "brute ways(" + n + ")");
                eq(ways[n], new B_climbMemo().climbStairs(n), "memo ways(" + n + ")");
                eq(ways[n], new B_climbTable().climbStairs(n), "table ways(" + n + ")");
                eq(ways[n], new B_climbStairs().climbStairs(n), "rolling ways(" + n + ")");
            }
            eq(1, new B_climbTable().climbStairs(0), "table n = 0");
            eq(1, new B_climbStairs().climbStairs(0), "rolling n = 0");
            for (int n = 1; n <= 24; n++) {
                long expect = countClimbs(n, 2);
                eq(expect, binomialClimbs(n), "two oracles agree at " + n);
                eq((int) expect, new B_climbBrute().climbStairs(n), "brute " + n);
            }
            for (int n = 1; n <= 45; n++) {
                int expect = (int) binomialClimbs(n);
                eq(expect, new B_climbMemo().climbStairs(n), "memo " + n);
                eq(expect, new B_climbTable().climbStairs(n), "table " + n);
                eq(expect, new B_climbStairs().climbStairs(n), "rolling " + n);
            }
            eq(1346269L, binomialClimbs(30), "lesson: ways(30)");
            eq(1836311903, new B_climbStairs().climbStairs(45), "lesson: ways(45) fits in int");
            eq(2971215073L, binomialClimbs(46), "lesson: ways(46) would not fit");
            // calls made by the brute-force recursion: 1 + calls(n-1) + calls(n-2)
            long[] calls = new long[46]; calls[0] = calls[1] = 1;
            for (int n = 2; n <= 45; n++) calls[n] = 1 + calls[n - 1] + calls[n - 2];
            eq(15L, calls[5], "lesson: 15 calls for n = 5");
            eq(2692537L, calls[30], "lesson: 2,692,537 calls for n = 30");
            for (int n = 1; n <= 45; n++) eq(2 * binomialClimbs(n) - 1, calls[n], "calls = 2 ways - 1 at " + n);
            // how often the brute force asks climb(3) on the way to step 30, counted by running it
            long[] asked = new long[31];
            countAsks(30, asked);
            eq(317811L, asked[3], "lesson: climb(3) asked more than 300,000 times");
            eq(binomialClimbs(27), asked[3], "asked(3) = ways(27)");
            eq(new long[]{3, 5, 3, 2, 1, 1}, Arrays.copyOf(countAsksFor(5), 6), "figure: asks for n = 5");
            eq(16, climbOverwrite(5), "catch-the-bug: overwriting prev first doubles: 16 for n = 5");
            // memoised calls to climb(): 2n - 1
            for (int n = 1; n <= 45; n++) {
                int[] counter = {0};
                int[] memo = new int[n + 1];
                java.util.function.IntUnaryOperator[] f = new java.util.function.IntUnaryOperator[1];
                f[0] = i -> { counter[0]++; if (i <= 1) return 1; if (memo[i] != 0) return memo[i]; return memo[i] = f[0].applyAsInt(i - 1) + f[0].applyAsInt(i - 2); };
                f[0].applyAsInt(n);
                eq(2 * n - 1, counter[0], "memo makes 2n - 1 calls at " + n);
            }
        }

        // ---------- Chapter 2: Min Cost Climbing Stairs ----------
        eq(15, new B_minCostClimbingStairs().minCostClimbingStairs(ints(10, 15, 20)), "min cost LC 1");
        eq(6, new B_minCostClimbingStairs().minCostClimbingStairs(ints(1, 100, 1, 1, 1, 100, 1, 1, 100, 1)), "min cost LC 2");
        eq(0, new B_minCostClimbingStairs().minCostClimbingStairs(ints(0, 0)), "min cost zeros");
        eq(3, new B_minCostClimbingStairs().minCostClimbingStairs(ints(5, 3)), "min cost two steps: start on step 1");
        eq(10, minCostStopsOnLastStep(ints(10, 15, 20)), "catch-the-bug: dp[n-1] returns 10");
        for (int t = 0; t < 3000; t++) {
            int[] c = randArr(2, 12, 0, 20);
            eq(bruteMinCost(c), new B_minCostClimbingStairs().minCostClimbingStairs(c), "min cost " + Arrays.toString(c));
        }

        // ---------- Chapter 3: House Robber ----------
        eq(12, new B_rob().rob(ints(2, 7, 9, 3, 1)), "rob figure");
        eq(4, new B_rob().rob(ints(1, 2, 3, 1)), "rob LC 1");
        eq(4, new B_rob().rob(ints(2, 1, 1, 2)), "rob [2,1,1,2]");
        eq(3, robEveryOther(ints(2, 1, 1, 2)), "catch-the-bug: every other house gives 3");
        eq(4, robBiggestFirst(ints(3, 4, 3)), "reveal: biggest-first gives 4");
        eq(6, new B_rob().rob(ints(3, 4, 3)), "rob [3,4,3]");
        eq(5, new B_rob().rob(ints(5)), "rob single");
        eq(0, new B_rob().rob(ints()), "rob empty");
        eq(0, new B_rob().rob(ints(0, 0, 0)), "rob zeros");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(0, 13, 0, 20);
            eq(bruteRob(a, false), new B_rob().rob(a), "rob " + Arrays.toString(a));
        }

        // ---------- Chapter 4: House Robber II ----------
        eq(3, new B_robCircle().rob(ints(2, 3, 2)), "circle LC 1");
        eq(4, new B_robCircle().rob(ints(1, 2, 3, 1)), "circle LC 2");
        eq(3, new B_robCircle().rob(ints(1, 2, 3)), "circle LC 3");
        eq(11, new B_robCircle().rob(ints(2, 7, 9, 3, 1)), "circle figure: 11, not 12");
        eq(11, robLine(ints(2, 7, 9, 3, 1), 0, 3), "figure: houses 0..3");
        eq(10, robLine(ints(2, 7, 9, 3, 1), 1, 4), "figure: houses 1..4");
        eq(7, new B_robCircle().rob(ints(7)), "circle single");
        eq(0, robCircleNoSingleCheck(ints(7)), "catch-the-bug: no n == 1 check returns 0");
        eq(5, new B_robCircle().rob(ints(5, 4)), "circle two houses");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 13, 0, 20);
            eq(bruteRob(a, true), new B_robCircle().rob(a), "circle " + Arrays.toString(a));
        }

        // ---------- Chapter 5: Decode Ways ----------
        String[] ds = {"12", "226", "0", "06", "10", "27", "100", "11106", "2101", "101", "1201234", "230", "301", "26", "11"};
        int[] dExpect = {2, 3, 0, 0, 1, 1, 0, 2, 1, 1, 3, 0, 0, 2, 2};
        for (int i = 0; i < ds.length; i++) {
            eq(dExpect[i], new B_numDecodings().numDecodings(ds[i]), "decode " + ds[i]);
            eq(bruteDecode(ds[i], 0), dExpect[i], "decode oracle " + ds[i]);
        }
        eq(1, decodeParseOnly("06"), "catch-the-bug: parse-only counts '06' as F");
        eq(0, new B_numDecodings().numDecodings("06"), "decode 06 is 0");
        for (int t = 0; t < 5000; t++) {
            String s = randDigits(1, 14, t % 3 == 0 ? "0123456789" : "0122126");
            eq(bruteDecode(s, 0), new B_numDecodings().numDecodings(s), "decode " + s);
        }

        // ---------- Chapter 6: Coin Change ----------
        eq(3, new B_coinChange().coinChange(ints(1, 2, 5), 11), "coins LC 1");
        eq(-1, new B_coinChange().coinChange(ints(2), 3), "coins LC 2");
        eq(0, new B_coinChange().coinChange(ints(1), 0), "coins LC 3");
        eq(2, new B_coinChange().coinChange(ints(1, 3, 4), 6), "coins figure");
        eq(3, coinGreedy(ints(1, 3, 4), 6), "greedy uses 3 coins on [1,3,4], 6");
        eq(4, new B_coinChange().coinChange(ints(2, 5), 8), "coins [2,5], 8");
        eq(Integer.MIN_VALUE, coinChangeMaxValue(ints(2), 3), "catch-the-bug: MAX_VALUE + 1 overflows");
        eq(20, new B_coinChange().coinChange(ints(186, 419, 83, 408), 6249), "coins LC 4");
        eq(-1, new B_coinChange().coinChange(ints(5, 7), 3), "coins all too big");
        for (int t = 0; t < 3000; t++) {
            int[] c = randArr(1, 4, 1, 12);
            int amount = R.nextInt(40);
            eq(bruteCoins(c, amount), new B_coinChange().coinChange(c, amount), "coins " + Arrays.toString(c) + " " + amount);
        }

        // ---------- Chapter 7: Word Break ----------
        eq(true, new B_wordBreak().wordBreak("leetcode", List.of("leet", "code")), "words LC 1");
        eq(true, new B_wordBreak().wordBreak("applepenapple", List.of("apple", "pen")), "words LC 2");
        eq(false, new B_wordBreak().wordBreak("catsandog", List.of("cats", "dog", "sand", "and", "cat")), "words LC 3");
        eq(true, new B_wordBreak().wordBreak("abcd", List.of("ab", "abc", "cd")), "words figure");
        eq(false, wordBreakGreedyLongest("abcd", Set.of("ab", "abc", "cd")), "greedy longest fails on abcd");
        eq(true, new B_wordBreak().wordBreak("praysong", List.of("pray", "prays", "song")), "words figure praysong");
        eq(false, wordBreakGreedyLongest("praysong", Set.of("pray", "prays", "song")), "catch-the-bug: greedy longest fails on praysong");
        eq(false, wordBreakGreedyShortest("abc", Set.of("a", "abc", "b")), "reveal: greedy shortest fails on abc");
        eq(true, new B_wordBreak().wordBreak("abc", List.of("a", "abc", "b")), "words abc");
        eq(true, new B_wordBreak().wordBreak("aaaaaaa", List.of("aaaa", "aaa")), "words aaaaaaa");
        eq(false, new B_wordBreak().wordBreak("aaaaaaab", List.of("a", "aa", "aaa")), "words no b");
        for (int t = 0; t < 4000; t++) {
            String s = randDigits(1, 11, "ab");
            List<String> dict = new ArrayList<>();
            int m = 1 + R.nextInt(4);
            for (int w = 0; w < m; w++) dict.add(randDigits(1, 3, "ab"));
            eq(bruteWordBreak(s, new HashSet<>(dict)), new B_wordBreak().wordBreak(s, dict), "wordBreak " + s + " " + dict);
        }

        // ---------- Chapter 8: Longest Increasing Subsequence ----------
        int[][] lisCases = {{10, 9, 2, 5, 3, 7, 101, 18}, {0, 1, 0, 3, 2, 3}, {7, 7, 7, 7}, {5}, {3, 4, 1}, {1, 2, 3, 4}, {4, 3, 2, 1}, {-2, -1}};
        int[] lisExpect = {4, 4, 1, 1, 2, 4, 1, 2};
        for (int i = 0; i < lisCases.length; i++) {
            eq(lisExpect[i], new B_lisQuadratic().lengthOfLIS(lisCases[i]), "lis n^2 " + Arrays.toString(lisCases[i]));
            eq(lisExpect[i], new B_lisTails().lengthOfLIS(lisCases[i]), "lis tails " + Arrays.toString(lisCases[i]));
            eq(lisExpect[i], bruteLis(lisCases[i])[0], "lis oracle " + Arrays.toString(lisCases[i]));
        }
        eq(ints(2, 3, 7, 18), tailsArray(ints(10, 9, 2, 5, 3, 7, 101, 18)), "figure: final tails");
        eq(ints(1, 4), tailsArray(ints(3, 4, 1)), "lesson: tails [1, 4] is not a subsequence of [3, 4, 1]");
        eq(1, lisReturnsLast(ints(1, 3, 2, 0)), "catch-the-bug: dp[n-1] on [1,3,2,0] gives 1");
        eq(2, new B_lisQuadratic().lengthOfLIS(ints(1, 3, 2, 0)), "lis [1,3,2,0] = 2");
        eq(4, lisTailsUpperBound(ints(7, 7, 7, 7)), "reveal: upper bound counts equal values");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(0, 12, -5, 5);
            int expect = bruteLis(a)[0];
            eq(expect, new B_lisQuadratic().lengthOfLIS(a), "lis n^2 " + Arrays.toString(a));
            eq(expect, new B_lisTails().lengthOfLIS(a), "lis tails " + Arrays.toString(a));
            int[] tails = tailsArray(a);
            for (int k = 1; k < tails.length; k++) ok(tails[k - 1] < tails[k], "tails stays strictly increasing " + Arrays.toString(a));
        }

        // ---------- Chapter 9: Longest Palindromic Substring ----------
        for (String s : new String[]{"babad", "cbbd", "a", "ac", "aaaa", "abacdfgdcaba", "forgeeksskeegfor", "bb"}) {
            String got = new B_longestPalindrome().longestPalindrome(s);
            ok(isPal(got) && s.contains(got) && got.length() == bruteLongestPalLen(s), "longest palindrome " + s + " -> " + got);
        }
        eq("bab", new B_longestPalindrome().longestPalindrome("babad"), "figure: babad gives bab (aba also valid)");
        eq("bb", new B_longestPalindrome().longestPalindrome("cbbd"), "cbbd");
        eq("c", longestOddOnly("cbbd"), "catch-the-bug: odd centres only give c on cbbd");
        for (int t = 0; t < 4000; t++) {
            String s = randDigits(1, 12, t % 2 == 0 ? "ab" : "abc");
            String got = new B_longestPalindrome().longestPalindrome(s);
            ok(isPal(got) && s.contains(got) && got.length() == bruteLongestPalLen(s), "longest palindrome " + s + " -> " + got);
        }

        // ---------- Chapter 10: Palindromic Substrings ----------
        eq(3, new B_countSubstrings().countSubstrings("abc"), "count abc");
        eq(6, new B_countSubstrings().countSubstrings("aaa"), "count aaa");
        eq(6, new B_countSubstrings().countSubstrings("abba"), "count abba");
        eq(6, new B_countSubstringsTable().countSubstrings("aaa"), "table aaa");
        eq(0, new B_countSubstrings().countSubstrings(""), "count empty");
        eq(0, new B_countSubstringsTable().countSubstrings(""), "table empty");
        eq(5, countTableWrongOrder("abba"), "catch-the-bug: i ascending misses abba");
        for (int t = 0; t < 4000; t++) {
            String s = randDigits(0, 12, t % 2 == 0 ? "ab" : "abc");
            int expect = bruteCountPal(s);
            eq(expect, new B_countSubstrings().countSubstrings(s), "count " + s);
            eq(expect, new B_countSubstringsTable().countSubstrings(s), "table " + s);
        }

        // ---------- Side quest 1: Delete and Earn ----------
        eq(6, new B_deleteAndEarn().deleteAndEarn(ints(3, 4, 2)), "earn LC 1");
        eq(9, new B_deleteAndEarn().deleteAndEarn(ints(2, 2, 3, 3, 3, 4)), "earn LC 2");
        eq(1, new B_deleteAndEarn().deleteAndEarn(ints(1)), "earn single");
        for (int t = 0; t < 2000; t++) {
            int[] a = randArr(1, 7, 1, 6);
            List<Integer> bag = new ArrayList<>(); for (int x : a) bag.add(x); Collections.sort(bag);
            eq(bruteEarn(bag), new B_deleteAndEarn().deleteAndEarn(a), "earn " + Arrays.toString(a));
        }

        // ---------- Side quest 2: Perfect Squares ----------
        eq(3, new B_numSquares().numSquares(12), "squares 12");
        eq(2, new B_numSquares().numSquares(13), "squares 13");
        eq(1, new B_numSquares().numSquares(1), "squares 1");
        eq(4, new B_numSquares().numSquares(7), "squares 7");
        eq(4, coinGreedy(ints(1, 4, 9), 12), "greedy 9 + 1 + 1 + 1 uses 4 squares");
        for (int n = 1; n <= 2000; n++) eq(bfsSquares(n), new B_numSquares().numSquares(n), "squares " + n);

        // ---------- Side quest 3: Partition Equal Subset Sum ----------
        eq(true, new B_canPartition().canPartition(ints(1, 5, 11, 5)), "partition LC 1");
        eq(false, new B_canPartition().canPartition(ints(1, 2, 3, 5)), "partition LC 2");
        eq(false, new B_canPartition().canPartition(ints(1, 2, 5)), "partition [1,2,5]");
        eq(true, partitionForwards(ints(1, 2, 5)), "catch-the-bug: forwards loop reuses numbers");
        eq(false, new B_canPartition().canPartition(ints(1)), "partition single");
        eq(true, new B_canPartition().canPartition(ints(2, 2)), "partition pair");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 12, 1, 12);
            eq(brutePartition(a), new B_canPartition().canPartition(a), "partition " + Arrays.toString(a));
        }

        // ---------- Side quest 4: Number of Longest Increasing Subsequences ----------
        eq(2, new B_findNumberOfLIS().findNumberOfLIS(ints(1, 3, 5, 4, 7)), "count LIS LC 1");
        eq(5, new B_findNumberOfLIS().findNumberOfLIS(ints(2, 2, 2, 2, 2)), "count LIS LC 2");
        eq(3, new B_findNumberOfLIS().findNumberOfLIS(ints(1, 2, 4, 3, 5, 4, 7, 2)), "count LIS LC 3");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 12, 0, 6);
            eq(bruteLis(a)[1], new B_findNumberOfLIS().findNumberOfLIS(a), "count LIS " + Arrays.toString(a));
        }

        // ---------- Side quest 5: Tribonacci and k-step stairs ----------
        eq(4, new B_tribonacci().tribonacci(4), "trib LC 1");
        eq(1389537, new B_tribonacci().tribonacci(25), "trib LC 2");
        eq(2082876103, new B_tribonacci().tribonacci(37), "trib 37 fits in int");
        for (int n = 0; n <= 25; n++) eq((int) tribRec(n), new B_tribonacci().tribonacci(n), "trib " + n);
        for (int n = 0; n <= 20; n++) eq((long) new B_tribonacci().tribonacci(n + 1), new B_climbK().climbK(n, 3), "k = 3 stairs = T(n + 1) at " + n);
        for (int n = 0; n <= 20; n++) for (int k = 1; k <= 6; k++) eq(countClimbs(n, k), new B_climbK().climbK(n, k), "climbK " + n + " " + k);
        for (int n = 0; n <= 45; n++) eq((long) new B_climbStairs().climbStairs(n), new B_climbK().climbK(n, 2), "k = 2 is chapter 1 at " + n);

        // ---------- Side quest 6: Minimum Cost For Tickets ----------
        eq(11, new B_mincostTickets().mincostTickets(ints(1, 4, 6, 7, 8, 20), ints(2, 7, 15)), "tickets LC 1");
        eq(17, new B_mincostTickets().mincostTickets(ints(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 31), ints(2, 7, 15)), "tickets LC 2");
        eq(2, new B_mincostTickets().mincostTickets(ints(365), ints(2, 7, 15)), "tickets one day");
        for (int t = 0; t < 2000; t++) {
            TreeSet<Integer> set = new TreeSet<>();
            int m = 1 + R.nextInt(9);
            while (set.size() < m) set.add(1 + R.nextInt(60));
            int[] days = set.stream().mapToInt(Integer::intValue).toArray();
            int[] costs = {1 + R.nextInt(5), 1 + R.nextInt(20), 1 + R.nextInt(60)};
            eq(bruteTickets(days, costs, 0), new B_mincostTickets().mincostTickets(days, costs), "tickets " + Arrays.toString(days) + " " + Arrays.toString(costs));
        }

        // ---------- When the table is the wrong tool: Jump Game ----------
        eq(true, new B_canJump().canJump(ints(2, 3, 1, 1, 4)), "jump LC 1");
        eq(false, new B_canJump().canJump(ints(3, 2, 1, 0, 4)), "jump LC 2");
        eq(true, new B_canJump().canJump(ints(0)), "jump single");
        eq(false, new B_canJump().canJumpTable(ints(3, 2, 1, 0, 4)), "jump table LC 2");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 12, 0, 3);
            boolean expect = bruteJump(a);
            eq(expect, new B_canJump().canJump(a), "canJump " + Arrays.toString(a));
            eq(expect, new B_canJump().canJumpTable(a), "canJumpTable " + Arrays.toString(a));
        }

        System.out.println("OK dp-1d: " + cases + " checks passed");
    }
}
