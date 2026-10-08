import java.util.*;

// Runs every Java solution shown in dp-2d.mdx against brute-force oracles that never build a table:
// every route as a bitmask of moves, every subsequence, a breadth-first search over real edit operations,
// every subset, every sign choice, every coin-count vector, every day-by-day action sequence, every
// strictly-increasing walk, and every burst order. Hand-picked edge cases come first, then thousands of
// random small inputs. It also proves that each "catch the bug" version the lesson names fails on the
// exact input the lesson names.
public class Check {
    static final Random R = new Random(15);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + expected + " but got " + actual);
    }
    static void ok(boolean cond, String what) {
        cases++;
        if (!cond) throw new AssertionError(what);
    }
    static String randWord(int minLen, int maxLen, String alphabet) {
        int n = minLen + R.nextInt(maxLen - minLen + 1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(alphabet.charAt(R.nextInt(alphabet.length())));
        return sb.toString();
    }
    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }

    // ---------- route oracles: a route is a bitmask of m - 1 downs among m + n - 2 moves ----------
    interface RouteVisitor { void visit(int[][] cells); }
    static void everyRoute(int m, int n, RouteVisitor v) {
        int moves = m + n - 2;
        for (int mask = 0; mask < (1 << moves); mask++) {
            if (Integer.bitCount(mask) != m - 1) continue;
            int[][] cells = new int[moves + 1][];
            int r = 0, c = 0;
            cells[0] = new int[]{0, 0};
            for (int k = 0; k < moves; k++) {
                if ((mask >> k & 1) == 1) r++; else c++;
                cells[k + 1] = new int[]{r, c};
            }
            v.visit(cells);
        }
    }
    static int routes(int m, int n) { int[] count = {0}; everyRoute(m, n, cells -> count[0]++); return count[0]; }
    static int routesAvoiding(int[][] g) {
        int[] count = {0};
        everyRoute(g.length, g[0].length, cells -> { for (int[] p : cells) if (g[p[0]][p[1]] == 1) return; count[0]++; });
        return count[0];
    }
    static int cheapestRoute(int[][] g) {
        int[] best = {Integer.MAX_VALUE};
        everyRoute(g.length, g[0].length, cells -> { int s = 0; for (int[] p : cells) s += g[p[0]][p[1]]; best[0] = Math.min(best[0], s); });
        return best[0];
    }

    // ---------- sequence oracles ----------
    static boolean isSubseq(String small, String big) {
        int k = 0;
        for (int i = 0; i < big.length() && k < small.length(); i++) if (big.charAt(i) == small.charAt(k)) k++;
        return k == small.length();
    }
    static List<String> subsequences(String s) {
        List<String> out = new ArrayList<>();
        for (int mask = 0; mask < (1 << s.length()); mask++) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < s.length(); i++) if ((mask >> i & 1) == 1) sb.append(s.charAt(i));
            out.add(sb.toString());
        }
        return out;
    }
    static int lcsBrute(String a, String b) {
        int best = 0;
        for (String sub : subsequences(a)) if (sub.length() > best && isSubseq(sub, b)) best = sub.length();
        return best;
    }
    static int lpsBrute(String s) {
        int best = 0;
        for (String sub : subsequences(s)) if (sub.length() > best && new StringBuilder(sub).reverse().toString().equals(sub)) best = sub.length();
        return best;
    }
    static int distinctBrute(String s, String t) {
        int count = 0;
        for (int mask = 0; mask < (1 << s.length()); mask++) {
            if (Integer.bitCount(mask) != t.length()) continue;
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < s.length(); i++) if ((mask >> i & 1) == 1) sb.append(s.charAt(i));
            if (sb.toString().equals(t)) count++;
        }
        return count;
    }
    // Breadth-first search over real edits. Letters come from the two words; lengths never exceed the longer
    // word (an optimal script can delete first, replace, then insert).
    static int editBfs(String a, String b) {
        String letters = "";
        for (char ch : (a + b).toCharArray()) if (letters.indexOf(ch) < 0) letters += ch;
        int cap = Math.max(a.length(), b.length());
        Map<String, Integer> dist = new HashMap<>();
        ArrayDeque<String> q = new ArrayDeque<>();
        dist.put(a, 0); q.add(a);
        while (!q.isEmpty()) {
            String w = q.poll();
            int d = dist.get(w);
            if (w.equals(b)) return d;
            List<String> next = new ArrayList<>();
            for (int i = 0; i < w.length(); i++) next.add(w.substring(0, i) + w.substring(i + 1));
            for (int i = 0; i <= w.length() && w.length() < cap; i++) for (char ch : letters.toCharArray()) next.add(w.substring(0, i) + ch + w.substring(i));
            for (int i = 0; i < w.length(); i++) for (char ch : letters.toCharArray()) if (ch != w.charAt(i)) next.add(w.substring(0, i) + ch + w.substring(i + 1));
            for (String x : next) if (!dist.containsKey(x)) { dist.put(x, d + 1); q.add(x); }
        }
        throw new AssertionError("unreachable");
    }

    // ---------- choice oracles ----------
    static boolean partitionBrute(int[] a) {
        int total = Arrays.stream(a).sum();
        for (int mask = 0; mask < (1 << a.length); mask++) {
            int s = 0;
            for (int i = 0; i < a.length; i++) if ((mask >> i & 1) == 1) s += a[i];
            if (2 * s == total) return true;
        }
        return false;
    }
    // every vector of coin counts (how many of each coin type), so order can't matter
    static int combosBrute(int[] coins, int idx, int left) {
        if (idx == coins.length) return left == 0 ? 1 : 0;
        int ways = 0;
        for (int take = 0; take * coins[idx] <= left; take++) ways += combosBrute(coins, idx + 1, left - take * coins[idx]);
        return ways;
    }
    // ordered sequences of coins (what the wrong loop order counts)
    static int sequencesBrute(int[] coins, int left) {
        if (left == 0) return 1;
        int ways = 0;
        for (int c : coins) if (c <= left) ways += sequencesBrute(coins, left - c);
        return ways;
    }
    static int targetBrute(int[] a, int target) {
        int count = 0;
        for (int mask = 0; mask < (1 << a.length); mask++) {
            int s = 0;
            for (int i = 0; i < a.length; i++) s += (mask >> i & 1) == 1 ? a[i] : -a[i];
            if (s == target) count++;
        }
        return count;
    }
    // every legal day-by-day action sequence: wait, buy (if empty-handed and not cooling down), sell (if holding)
    static int cooldownBrute(int[] p, int day, boolean holding, boolean cooling, int cash) {
        if (day == p.length) return holding ? Integer.MIN_VALUE : cash;
        int best = cooldownBrute(p, day + 1, holding, false, cash);                      // wait
        if (!holding && !cooling) best = Math.max(best, cooldownBrute(p, day + 1, true, false, cash - p[day]));
        if (holding) best = Math.max(best, cooldownBrute(p, day + 1, false, true, cash + p[day]));
        return best;
    }
    static int unlimitedBrute(int[] p, int day, boolean holding, int cash) {
        if (day == p.length) return holding ? Integer.MIN_VALUE : cash;
        int best = unlimitedBrute(p, day + 1, holding, cash);
        if (!holding) best = Math.max(best, unlimitedBrute(p, day + 1, true, cash - p[day]));
        else best = Math.max(best, unlimitedBrute(p, day + 1, false, cash + p[day]));
        return best;
    }
    static int stockKBrute(int[] p, int day, boolean holding, int tradesLeft, int cash) {
        if (day == p.length) return holding ? Integer.MIN_VALUE : cash;
        int best = stockKBrute(p, day + 1, holding, tradesLeft, cash);
        if (!holding && tradesLeft > 0) best = Math.max(best, stockKBrute(p, day + 1, true, tradesLeft - 1, cash - p[day]));
        if (holding) best = Math.max(best, stockKBrute(p, day + 1, false, tradesLeft, cash + p[day]));
        return best;
    }
    // every strictly increasing walk, explored in full with no memory at all
    static int walkBrute(int[][] m, int r, int c) {
        int best = 1;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < m.length && nc >= 0 && nc < m[0].length && m[nr][nc] > m[r][c]) best = Math.max(best, 1 + walkBrute(m, nr, nc));
        }
        return best;
    }
    static int lipBrute(int[][] m) {
        int best = 0;
        for (int r = 0; r < m.length; r++) for (int c = 0; c < m[0].length; c++) best = Math.max(best, walkBrute(m, r, c));
        return best;
    }
    // every burst order: try each remaining balloon next
    static int burstBrute(List<Integer> row) {
        if (row.isEmpty()) return 0;
        int best = 0;
        for (int i = 0; i < row.size(); i++) {
            int left = i > 0 ? row.get(i - 1) : 1, right = i + 1 < row.size() ? row.get(i + 1) : 1;
            List<Integer> rest = new ArrayList<>(row);
            rest.remove(i);
            best = Math.max(best, left * row.get(i) * right + burstBrute(rest));
        }
        return best;
    }
    static List<Integer> list(int[] a) { List<Integer> l = new ArrayList<>(); for (int x : a) l.add(x); return l; }

    // ---------- the buggy versions the lesson names ----------
    static int uniquePathsRollingBackwards(int m, int n) {
        int[] row = new int[n];
        Arrays.fill(row, 1);
        for (int r = 1; r < m; r++) for (int c = n - 1; c >= 1; c--) row[c] += row[c - 1];   // reads the OLD left
        return row[n - 1];
    }
    static int lcsMaxPlusOne(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 1; i <= a.length(); i++) for (int j = 1; j <= b.length(); j++)
            dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? Math.max(dp[i - 1][j], dp[i][j - 1]) + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        return dp[a.length()][b.length()];
    }
    static int editNoBase(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 1; i <= a.length(); i++) for (int j = 1; j <= b.length(); j++)
            dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));
        return dp[a.length()][b.length()];
    }
    static boolean partitionForwards(int[] nums) {
        int total = Arrays.stream(nums).sum();
        if (total % 2 == 1) return false;
        boolean[] dp = new boolean[total / 2 + 1];
        dp[0] = true;
        for (int w : nums) for (int s = w; s <= total / 2; s++) dp[s] = dp[s] || dp[s - w];
        return dp[total / 2];
    }
    static int changeAmountsOutside(int amount, int[] coins) {
        int[] dp = new int[amount + 1];
        dp[0] = 1;
        for (int a = 1; a <= amount; a++) for (int coin : coins) if (a >= coin) dp[a] += dp[a - coin];
        return dp[amount];
    }
    static int cooldownIgnored(int[] prices) {
        int n = prices.length;
        int[] hold = new int[n], sold = new int[n], rest = new int[n];
        hold[0] = -prices[0]; sold[0] = Integer.MIN_VALUE / 2;
        for (int d = 1; d < n; d++) {
            hold[d] = Math.max(hold[d - 1], Math.max(rest[d - 1], sold[d - 1]) - prices[d]);   // buys straight after a sale
            sold[d] = hold[d - 1] + prices[d];
            rest[d] = Math.max(rest[d - 1], sold[d - 1]);
        }
        return Math.max(sold[n - 1], rest[n - 1]);
    }
    static int lipNonStrict(int[][] m, int[][] memo, int r, int c) {
        if (memo[r][c] != 0) return memo[r][c];
        int best = 1;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < m.length && nc >= 0 && nc < m[0].length && m[nr][nc] >= m[r][c]) best = Math.max(best, 1 + lipNonStrict(m, memo, nr, nc));
        }
        return memo[r][c] = best;
    }
    static int burstLeftToRight(int[] nums) {
        int n = nums.length;
        int[] v = new int[n + 2];
        v[0] = v[n + 1] = 1;
        for (int i = 0; i < n; i++) v[i + 1] = nums[i];
        int[][] dp = new int[n + 2][n + 2];
        for (int i = 0; i <= n + 1; i++) for (int j = i + 2; j <= n + 1; j++) for (int k = i + 1; k < j; k++)
            dp[i][j] = Math.max(dp[i][j], dp[i][k] + v[i] * v[k] * v[j] + dp[k][j]);   // dp[k][j] not filled yet
        return dp[0][n + 1];
    }
    static int burstChooseFirst(int[] nums) {
        // "k bursts FIRST": treats the two sides as independent with k's original neighbours. Not a valid split.
        int n = nums.length;
        int[] v = new int[n + 2];
        v[0] = v[n + 1] = 1;
        for (int i = 0; i < n; i++) v[i + 1] = nums[i];
        int[][] dp = new int[n + 2][n + 2];
        for (int len = 2; len <= n + 1; len++) for (int i = 0; i + len <= n + 1; i++) {
            int j = i + len;
            for (int k = i + 1; k < j; k++) dp[i][j] = Math.max(dp[i][j], v[k - 1] * v[k] * v[k + 1] + dp[i][k] + dp[k][j]);
        }
        return dp[0][n + 1];
    }

    public static void main(String[] args) {
        // ---------- Chapter 1: Unique Paths ----------
        var up = new B_uniquePaths();
        eq(28, up.uniquePaths(3, 7), "LC example 3 x 7");
        eq(3, up.uniquePaths(3, 2), "LC example 3 x 2");
        eq(10, up.uniquePaths(3, 4), "figure 3 x 4");
        eq(1, up.uniquePaths(1, 1), "1 x 1");
        eq(1, up.uniquePaths(1, 9), "single row");
        eq(1, up.uniquePaths(9, 1), "single column");
        eq(48620, up.uniquePaths(10, 10), "10 x 10");
        eq(up.uniquePaths(16, 17), up.uniquePathsRolling(16, 17), "rolling agrees on a large case");
        eq(4, uniquePathsRollingBackwards(3, 3), "catch-the-bug: backwards rolling row gives 4 on 3 x 3");
        eq(6, up.uniquePaths(3, 3), "3 x 3 is 6");
        for (int m = 1; m <= 9; m++) for (int n = 1; n <= 9; n++) {
            int brute = routes(m, n);
            eq(brute, up.uniquePaths(m, n), "uniquePaths " + m + "x" + n);
            eq(brute, up.uniquePathsRolling(m, n), "uniquePathsRolling " + m + "x" + n);
        }

        // ---------- Chapter 2: Longest Common Subsequence (+ the route itself) ----------
        var lcs = new B_longestCommonSubsequence();
        var route = new B_lcsString();
        eq(3, lcs.longestCommonSubsequence("abcde", "ace"), "LC example 1");
        eq(3, lcs.longestCommonSubsequence("abc", "abc"), "LC example 2");
        eq(0, lcs.longestCommonSubsequence("abc", "def"), "LC example 3");
        eq(3, lcs.longestCommonSubsequence("LBRCT", "BLCRT"), "figure maps");
        eq("LRT", route.lcsString("LBRCT", "BLCRT"), "figure route (ties go up)");
        eq(1, lcs.longestCommonSubsequence("aa", "a"), "repeated letter");
        eq(2, lcsMaxPlusOne("aa", "a"), "catch-the-bug: max(up, left) + 1 on a match counts one letter twice");
        eq("", route.lcsString("", "abc"), "empty map");
        for (int t = 0; t < 3000; t++) {
            String a = randWord(0, 8, "abc"), b = randWord(0, 8, "abcd");
            int brute = lcsBrute(a, b);
            eq(brute, lcs.longestCommonSubsequence(a, b), "lcs " + a + " / " + b);
            String r = route.lcsString(a, b);
            ok(r.length() == brute && isSubseq(r, a) && isSubseq(r, b), "lcsString " + a + " / " + b + " -> " + r);
        }

        // ---------- Chapter 3: Edit Distance ----------
        var ed = new B_minDistance();
        eq(3, ed.minDistance("horse", "ros"), "LC example 1");
        eq(5, ed.minDistance("intention", "execution"), "LC example 2");
        eq(0, ed.minDistance("", ""), "both empty");
        eq(3, ed.minDistance("abc", ""), "to empty: delete all");
        eq(4, ed.minDistance("", "abcd"), "from empty: insert all");
        eq(0, editNoBase("ab", "b"), "catch-the-bug: without the base row and column, ab -> b costs 0");
        eq(1, ed.minDistance("ab", "b"), "ab -> b costs 1");
        for (int t = 0; t < 2500; t++) {
            String a = randWord(0, 5, "abc"), b = randWord(0, 5, "abc");
            eq(editBfs(a, b), ed.minDistance(a, b), "minDistance " + a + " -> " + b);
        }

        // ---------- Chapter 4: Partition Equal Subset Sum ----------
        var part = new B_canPartition();
        eq(true, part.canPartition(new int[]{1, 5, 11, 5}), "LC example 1");
        eq(false, part.canPartition(new int[]{1, 2, 3, 5}), "LC example 2");
        eq(true, part.canPartitionTable(new int[]{2, 3, 5}), "figure [2,3,5]");
        eq(false, part.canPartition(new int[]{1, 2, 5}), "[1,2,5] can't split");
        eq(true, partitionForwards(new int[]{1, 2, 5}), "catch-the-bug: a forwards sweep reuses the 1 and says true");
        eq(false, part.canPartition(new int[]{1, 2, 4}), "odd total");
        eq(false, part.canPartition(new int[]{7}), "one item");
        eq(true, part.canPartition(new int[]{3, 3, 3, 3}), "duplicates");
        eq(true, part.canPartition(new int[]{100, 100}), "two equal");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 11, 1, 12);
            boolean brute = partitionBrute(a);
            eq(brute, part.canPartition(a), "canPartition " + Arrays.toString(a));
            eq(brute, part.canPartitionTable(a), "canPartitionTable " + Arrays.toString(a));
        }

        // ---------- Chapter 5: Coin Change II ----------
        var ch = new B_change();
        eq(4, ch.change(5, new int[]{1, 2, 5}), "LC example 1");
        eq(0, ch.change(3, new int[]{2}), "LC example 2");
        eq(1, ch.change(10, new int[]{10}), "LC example 3");
        eq(1, ch.change(0, new int[]{7}), "amount 0: take nothing");
        eq(2, ch.change(3, new int[]{1, 2}), "[1,2] make 3 in 2 combinations");
        eq(3, changeAmountsOutside(3, new int[]{1, 2}), "catch-the-bug: amounts outside counts 1+2 and 2+1 apart");
        eq(3, sequencesBrute(new int[]{1, 2}, 3), "there really are 3 orderings");
        eq(4, ch.changeTable(5, new int[]{1, 2, 5}), "figure table");
        for (int t = 0; t < 3000; t++) {
            int[] coins = randArr(1, 4, 1, 9);
            coins = Arrays.stream(coins).distinct().toArray();          // LC: coin values are distinct
            int amount = R.nextInt(25);
            int brute = combosBrute(coins, 0, amount);
            eq(brute, ch.change(amount, coins), "change " + amount + " " + Arrays.toString(coins));
            eq(brute, ch.changeTable(amount, coins), "changeTable " + amount + " " + Arrays.toString(coins));
            eq(sequencesBrute(coins, amount), changeAmountsOutside(amount, coins), "the swapped loops count orderings");
        }
        // Only additions: middle amounts may wrap around in int, yet the final count is exact whenever it fits.
        {
            int[] coins = {2, 4, 6, 8, 10, 12, 14, 16, 18, 20};
            int amount = 1001;
            long[] exact = new long[amount + 1];
            exact[0] = 1;
            for (int c : coins) for (int a = c; a <= amount; a++) exact[a] += exact[a - c];
            ok(exact[1000] > Integer.MAX_VALUE, "a middle amount really does overflow int");
            eq(0, ch.change(amount, coins), "change 1001 with even coins is exactly 0");
            eq(true, ch.change(30, new int[]{1, 2, 5}) == combosBrute(new int[]{1, 2, 5}, 0, 30), "a mid-size count");
        }

        // ---------- Chapter 6: Stock with Cooldown ----------
        var cd = new B_maxProfit();
        eq(3, cd.maxProfit(new int[]{1, 2, 3, 0, 2}), "LC example 1");
        eq(0, cd.maxProfit(new int[]{1}), "LC example 2");
        eq(0, cd.maxProfit(new int[]{5, 4, 3, 2, 1}), "falling prices");
        eq(3, cd.maxProfitRolling(new int[]{1, 2, 3, 0, 2}), "rolling LC example 1");
        eq(4, cooldownIgnored(new int[]{1, 2, 3, 0, 2}), "catch-the-bug: buying out of Sold ignores the cooldown and says 4");
        eq(4, unlimitedBrute(new int[]{1, 2, 3, 0, 2}, 0, false, 0), "4 is the no-cooldown profit");
        for (int t = 0; t < 4000; t++) {
            int[] p = randArr(1, 10, 0, 9);
            int brute = cooldownBrute(p, 0, false, false, 0);
            eq(brute, cd.maxProfit(p), "maxProfit " + Arrays.toString(p));
            eq(brute, cd.maxProfitRolling(p), "maxProfitRolling " + Arrays.toString(p));
        }

        // ---------- Chapter 7: Longest Increasing Path in a Matrix ----------
        var lip = new B_longestIncreasingPath();
        eq(4, lip.longestIncreasingPath(new int[][]{{9, 9, 4}, {6, 6, 8}, {2, 1, 1}}), "LC example 1");
        eq(4, lip.longestIncreasingPath(new int[][]{{3, 4, 5}, {3, 2, 6}, {2, 2, 1}}), "LC example 2");
        eq(1, lip.longestIncreasingPath(new int[][]{{1}}), "LC example 3");
        eq(1, lip.longestIncreasingPath(new int[][]{{7, 7}, {7, 7}}), "all equal");
        eq(9, lip.longestIncreasingPath(new int[][]{{1, 2, 3}, {6, 5, 4}, {7, 8, 9}}), "a snake through every square");
        {
            boolean overflowed = false;
            try { lipNonStrict(new int[][]{{1, 1}}, new int[1][2], 0, 0); }
            catch (StackOverflowError e) { overflowed = true; }
            eq(true, overflowed, "catch-the-bug: >= on [[1, 1]] walks back and forth forever");
        }
        for (int t = 0; t < 3000; t++) {
            int rows = 1 + R.nextInt(4), cols = 1 + R.nextInt(4);
            int[][] m = new int[rows][cols];
            for (int[] row : m) for (int c = 0; c < cols; c++) row[c] = R.nextInt(7);
            eq(lipBrute(m), lip.longestIncreasingPath(m), "longestIncreasingPath " + Arrays.deepToString(m));
        }

        // ---------- Chapter 8: Burst Balloons ----------
        var bb = new B_maxCoins();
        eq(167, bb.maxCoins(new int[]{3, 1, 5, 8}), "LC example 1");
        eq(10, bb.maxCoins(new int[]{1, 5}), "LC example 2");
        eq(7, bb.maxCoins(new int[]{7}), "one balloon");
        eq(0, bb.maxCoins(new int[]{0, 0}), "zeros");
        eq(true, burstLeftToRight(new int[]{3, 1, 5, 8}) < 167, "catch-the-bug: filling i left to right reads empty squares");
        eq(true, burstChooseFirst(new int[]{3, 1, 5, 8}) != 167, "choosing the first balloon is not a valid split");
        for (int t = 0; t < 1500; t++) {
            int[] a = randArr(1, 7, 0, 9);
            eq(burstBrute(list(a)), bb.maxCoins(a), "maxCoins " + Arrays.toString(a));
        }

        // ---------- Side quest 1: Unique Paths II ----------
        var ob = new B_uniquePathsWithObstacles();
        eq(2, ob.uniquePathsWithObstacles(new int[][]{{0, 0, 0}, {0, 1, 0}, {0, 0, 0}}), "LC example 1");
        eq(1, ob.uniquePathsWithObstacles(new int[][]{{0, 1}, {0, 0}}), "LC example 2");
        eq(0, ob.uniquePathsWithObstacles(new int[][]{{1, 0}, {0, 0}}), "rock on the start");
        eq(0, ob.uniquePathsWithObstacles(new int[][]{{0, 0}, {0, 1}}), "rock on the goal");
        eq(1, ob.uniquePathsWithObstacles(new int[][]{{0, 1, 0}, {0, 0, 0}}), "rock in the top row cuts off the squares after it");
        for (int t = 0; t < 3000; t++) {
            int m = 1 + R.nextInt(5), n = 1 + R.nextInt(5);
            int[][] g = new int[m][n];
            for (int[] row : g) for (int c = 0; c < n; c++) row[c] = R.nextInt(4) == 0 ? 1 : 0;
            eq(routesAvoiding(g), ob.uniquePathsWithObstacles(g), "uniquePathsWithObstacles " + Arrays.deepToString(g));
        }

        // ---------- Side quest 2: Minimum Path Sum ----------
        var mp = new B_minPathSum();
        eq(7, mp.minPathSum(new int[][]{{1, 3, 1}, {1, 5, 1}, {4, 2, 1}}), "LC example 1");
        eq(12, mp.minPathSum(new int[][]{{1, 2, 3}, {4, 5, 6}}), "LC example 2");
        eq(5, mp.minPathSum(new int[][]{{5}}), "one square");
        for (int t = 0; t < 3000; t++) {
            int m = 1 + R.nextInt(5), n = 1 + R.nextInt(5);
            int[][] g = new int[m][n];
            for (int[] row : g) for (int c = 0; c < n; c++) row[c] = R.nextInt(10);
            eq(cheapestRoute(g), mp.minPathSum(g), "minPathSum " + Arrays.deepToString(g));
        }

        // ---------- Side quest 3: Longest Palindromic Subsequence ----------
        var lps = new B_longestPalindromeSubseq();
        eq(4, lps.longestPalindromeSubseq("bbbab"), "LC example 1");
        eq(2, lps.longestPalindromeSubseq("cbbd"), "LC example 2");
        eq(1, lps.longestPalindromeSubseq("a"), "one letter");
        eq(1, lps.longestPalindromeSubseq("abcd"), "all different");
        for (int t = 0; t < 3000; t++) {
            String s = randWord(1, 11, "abc");
            int brute = lpsBrute(s);
            eq(brute, lps.longestPalindromeSubseq(s), "longestPalindromeSubseq " + s);
            eq(brute, lcs.longestCommonSubsequence(s, new StringBuilder(s).reverse().toString()), "LCS with the reverse " + s);
        }

        // ---------- Side quest 4: Distinct Subsequences ----------
        var nd = new B_numDistinct();
        eq(3, nd.numDistinct("rabbbit", "rabbit"), "LC example 1");
        eq(5, nd.numDistinct("babgbag", "bag"), "LC example 2");
        eq(1, nd.numDistinct("abc", ""), "empty target: one way");
        eq(0, nd.numDistinct("", "a"), "empty source");
        eq(0, nd.numDistinct("ab", "abc"), "target longer than source");
        {
            // middle squares overflow int here (C(40, 20) ways to keep 20 a's), yet the answer is exactly 0
            String s = "a".repeat(40), t2 = "a".repeat(20) + "b";
            eq(0, nd.numDistinct(s, t2), "wrapped middle squares still give an exact final count");
        }
        for (int t = 0; t < 3000; t++) {
            String s = randWord(0, 11, "ab"), tt = randWord(0, 4, "ab");
            eq(distinctBrute(s, tt), nd.numDistinct(s, tt), "numDistinct " + s + " / " + tt);
        }

        // ---------- Side quest 5: Target Sum ----------
        var ts = new B_findTargetSumWays();
        eq(5, ts.findTargetSumWays(new int[]{1, 1, 1, 1, 1}, 3), "LC example 1");
        eq(1, ts.findTargetSumWays(new int[]{1}, 1), "LC example 2");
        eq(0, ts.findTargetSumWays(new int[]{1, 1, 1, 1, 1}, 2), "odd split");
        eq(5, ts.findTargetSumWays(new int[]{1, 1, 1, 1, 1}, -3), "negative target");
        eq(0, ts.findTargetSumWays(new int[]{1, 1, 1, 1, 1}, -7), "negative target out of reach");
        eq(0, ts.findTargetSumWays(new int[]{1, 1, 1, 1, 1}, 6), "target out of reach");
        eq(4, ts.findTargetSumWays(new int[]{0, 0, 1}, 1), "zeros double the count");
        eq(2, ts.findTargetSumWays(new int[]{0}, 0), "+0 and -0 are two choices");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 11, 0, 6);
            int target = R.nextInt(31) - 15;
            eq(targetBrute(a, target), ts.findTargetSumWays(a, target), "findTargetSumWays " + Arrays.toString(a) + " -> " + target);
        }

        // ---------- Side quest 6: Stock with at most k trades ----------
        var sk = new B_stockK();
        eq(2, sk.maxProfit(2, new int[]{2, 4, 1}), "LC example 1");
        eq(7, sk.maxProfit(2, new int[]{3, 2, 6, 5, 0, 3}), "LC example 2");
        eq(0, sk.maxProfit(0, new int[]{1, 5}), "no trades allowed");
        eq(4, sk.maxProfit(1, new int[]{3, 2, 6, 5, 0, 3}), "one trade");
        for (int t = 0; t < 3000; t++) {
            int[] p = randArr(1, 9, 0, 9);
            int k = R.nextInt(4);
            eq(stockKBrute(p, 0, false, k, 0), sk.maxProfit(k, p), "maxProfit k=" + k + " " + Arrays.toString(p));
        }

        System.out.println("OK dp-2d: " + cases + " checks passed");
    }
}
