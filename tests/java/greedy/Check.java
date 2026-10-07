import java.util.*;

// Runs every Java solution shown in greedy.mdx against brute-force oracles that never use the lesson's
// greedy rule: every subarray, BFS over the jump graph, a full simulation from every start, every way to
// cut a string, backtracking over card groups, exhaustive trades/matchings/pairings/assignments, every
// reading of the jokers, every merge, and BFS over coin amounts. It also proves that each "catch the bug"
// version the lesson names fails on the input the lesson names.
public class Check {
    static final Random R = new Random(18);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }
    static String show(Object o) { return o instanceof int[] a ? Arrays.toString(a) : String.valueOf(o); }
    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }

    // ---------------- oracles ----------------
    static int bruteMaxSum(int[] a) {
        int best = Integer.MIN_VALUE;
        for (int l = 0; l < a.length; l++) for (int r = l; r < a.length; r++) { int s = 0; for (int k = l; k <= r; k++) s += a[k]; best = Math.max(best, s); }
        return best;
    }
    static int bruteMaxProduct(int[] a) {
        long best = Long.MIN_VALUE;
        for (int l = 0; l < a.length; l++) for (int r = l; r < a.length; r++) { long p = 1; for (int k = l; k <= r; k++) p *= a[k]; best = Math.max(best, p); }
        return (int) best;
    }
    static boolean circuitFrom(int[] gas, int[] cost, int s) {
        int n = gas.length; long tank = 0;
        for (int k = 0; k < n; k++) { int i = (s + k) % n; tank += gas[i] - cost[i]; if (tank < 0) return false; }
        return true;
    }
    static int bfsJumps(int[] a) {                    // -1 if the last index is unreachable
        int n = a.length; int[] dist = new int[n]; Arrays.fill(dist, -1); dist[0] = 0;
        ArrayDeque<Integer> q = new ArrayDeque<>(); q.add(0);
        while (!q.isEmpty()) { int i = q.poll(); for (int j = i + 1; j <= Math.min(n - 1, i + a[i]); j++) if (dist[j] < 0) { dist[j] = dist[i] + 1; q.add(j); } }
        return dist[n - 1];
    }
    static List<Integer> brutePartition(String s) {   // every cut mask; keep the valid split with most pieces
        int n = s.length(); List<Integer> best = null; int bestCount = -1, winners = 0;
        for (int mask = 0; mask < (1 << (n - 1)); mask++) {
            List<String> pieces = new ArrayList<>(); StringBuilder cur = new StringBuilder();
            for (int i = 0; i < n; i++) { cur.append(s.charAt(i)); if (i == n - 1 || ((mask >> i) & 1) == 1) { pieces.add(cur.toString()); cur.setLength(0); } }
            boolean valid = true;
            for (int x = 0; x < pieces.size() && valid; x++) for (int y = x + 1; y < pieces.size() && valid; y++)
                for (char ch : pieces.get(x).toCharArray()) if (pieces.get(y).indexOf(ch) >= 0) { valid = false; break; }
            if (!valid) continue;
            if (pieces.size() > bestCount) { bestCount = pieces.size(); winners = 1; best = new ArrayList<>(); for (String p : pieces) best.add(p.length()); }
            else if (pieces.size() == bestCount) winners++;
        }
        if (winners != 1) throw new AssertionError("best split not unique for " + s);
        return best;
    }
    static boolean backtrackGroups(List<Integer> cards, int w) {  // the first card listed joins some run containing it
        if (cards.isEmpty()) return true;
        int c = cards.get(0);
        for (int lo = c - w + 1; lo <= c; lo++) {
            List<Integer> left = new ArrayList<>(cards); boolean ok = true;
            for (int v = lo; v < lo + w && ok; v++) { int k = left.indexOf(v); if (k < 0) ok = false; else left.remove(k); }
            if (ok && backtrackGroups(left, w)) return true;
        }
        return false;
    }
    static int bruteTrades(int[] p, int day, boolean holding, int boughtAt) {
        if (day == p.length) return 0;
        int best = bruteTrades(p, day + 1, holding, boughtAt);                       // do nothing today
        if (!holding) best = Math.max(best, bruteTrades(p, day + 1, true, p[day]));    // buy today
        else best = Math.max(best, p[day] - boughtAt + bruteTrades(p, day, false, 0)); // sell today (may rebuy today)
        return best;
    }
    static int bruteCookies(int[] g, int[] s, int k, boolean[] used) {
        if (k == s.length) return 0;
        int best = bruteCookies(g, s, k + 1, used);
        for (int c = 0; c < g.length; c++) if (!used[c] && s[k] >= g[c]) { used[c] = true; best = Math.max(best, 1 + bruteCookies(g, s, k + 1, used)); used[c] = false; }
        return best;
    }
    static int bruteBoats(int[] w, int limit) {
        int n = w.length; int[] f = new int[1 << n];
        for (int mask = 1; mask < (1 << n); mask++) {
            int i = Integer.numberOfTrailingZeros(mask), rest = mask & ~(1 << i);
            f[mask] = f[rest] + 1;
            for (int j = 0; j < n; j++) if (((rest >> j) & 1) == 1 && w[i] + w[j] <= limit) f[mask] = Math.min(f[mask], f[rest & ~(1 << j)] + 1);
        }
        return f[(1 << n) - 1];
    }
    static int bruteCandy(int[] r) {                  // every assignment of 1..n sweets
        int n = r.length; int[] c = new int[n]; int best = Integer.MAX_VALUE;
        int total = 1; for (int i = 0; i < n; i++) total *= n;
        for (int code = 0; code < total; code++) {
            int x = code, sum = 0;
            for (int i = 0; i < n; i++) { c[i] = 1 + x % n; x /= n; sum += c[i]; }
            boolean ok = true;
            for (int i = 0; i < n && ok; i++) {
                if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) ok = false;
                if (i + 1 < n && r[i] > r[i + 1] && c[i] <= c[i + 1]) ok = false;
            }
            if (ok) best = Math.min(best, sum);
        }
        return best;
    }
    static int relaxCandy(int[] r) {                  // least fixed point of the neighbour rules
        int n = r.length; int[] c = new int[n]; Arrays.fill(c, 1);
        for (boolean changed = true; changed; ) {
            changed = false;
            for (int i = 0; i < n; i++) {
                if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
                if (i + 1 < n && r[i] > r[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
            }
        }
        int s = 0; for (int x : c) s += x; return s;
    }
    static boolean bruteWild(String s) {
        int k = s.indexOf('*');
        if (k < 0) { int open = 0; for (char ch : s.toCharArray()) { open += ch == '(' ? 1 : -1; if (open < 0) return false; } return open == 0; }
        for (String rep : new String[]{"(", ")", ""}) if (bruteWild(s.substring(0, k) + rep + s.substring(k + 1))) return true;
        return false;
    }
    static boolean bruteTriplets(int[][] ts, int[] target) {  // perform merges until nothing new appears
        Set<List<Integer>> seen = new HashSet<>();
        for (int[] t : ts) seen.add(List.of(t[0], t[1], t[2]));
        for (boolean grew = true; grew; ) {
            grew = false;
            for (List<Integer> a : new ArrayList<>(seen)) for (List<Integer> b : new ArrayList<>(seen)) {
                List<Integer> m = List.of(Math.max(a.get(0), b.get(0)), Math.max(a.get(1), b.get(1)), Math.max(a.get(2), b.get(2)));
                if (seen.add(m)) grew = true;
            }
        }
        return seen.contains(List.of(target[0], target[1], target[2]));
    }
    static int bfsCoins(int[] coins, int amount) {
        int[] dist = new int[amount + 1]; Arrays.fill(dist, -1); dist[0] = 0;
        ArrayDeque<Integer> q = new ArrayDeque<>(); q.add(0);
        while (!q.isEmpty()) { int x = q.poll(); for (int c : coins) { int y = x + c; if (y <= amount && dist[y] < 0) { dist[y] = dist[x] + 1; q.add(y); } } }
        return dist[amount];
    }
    static String randWord(int maxLen, int letters) {
        int n = 1 + R.nextInt(maxLen); StringBuilder b = new StringBuilder();
        for (int i = 0; i < n; i++) b.append((char) ('a' + R.nextInt(letters)));
        return b.toString();
    }

    // ---------------- the buggy versions the lesson names ----------------
    static int kadaneZeroStart(int[] nums) { int run = 0, best = 0; for (int x : nums) { run = Math.max(0, run + x); best = Math.max(best, run); } return best; }
    static int productOnlyMax(int[] nums) { int hi = nums[0], best = nums[0]; for (int i = 1; i < nums.length; i++) { hi = Math.max(nums[i], hi * nums[i]); best = Math.max(best, hi); } return best; }
    static int productOverwrite(int[] nums) {          // hi overwritten before lo uses it
        int hi = nums[0], lo = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) { int x = nums[i]; hi = Math.max(x, Math.max(hi * x, lo * x)); lo = Math.min(x, Math.min(hi * x, lo * x)); best = Math.max(best, hi); }
        return best;
    }
    static int gasNoTotal(int[] gas, int[] cost) { int tank = 0, start = 0; for (int i = 0; i < gas.length; i++) { tank += gas[i] - cost[i]; if (tank < 0) { start = i + 1; tank = 0; } } return start; }
    static boolean jumpZeroStuck(int[] nums) { for (int i = 0; i < nums.length - 1; i++) if (nums[i] == 0) return false; return true; }
    static int jumpToN(int[] nums) { int jumps = 0, end = 0, far = 0; for (int i = 0; i < nums.length; i++) { far = Math.max(far, i + nums[i]); if (i == end) { jumps++; end = far; } } return jumps; }
    static int jumpFarthestLanding(int[] nums) { int pos = 0, hops = 0; while (pos < nums.length - 1) { pos = Math.min(nums.length - 1, pos + nums[pos]); hops++; } return hops; }
    static List<Integer> partitionShortcut(String s) {
        int[] last = new int[26]; for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;
        List<Integer> out = new ArrayList<>(); int start = 0;
        for (int i = 0; i < s.length(); i++) if (last[s.charAt(i) - 'a'] == i) { out.add(i - start + 1); start = i + 1; }
        return out;
    }
    static boolean straightsInputOrder(int[] hand, int w) {
        if (hand.length % w != 0) return false;
        Map<Integer, Integer> count = new HashMap<>(); for (int c : hand) count.merge(c, 1, Integer::sum);
        for (int c : hand) {
            if (count.getOrDefault(c, 0) == 0) continue;
            for (int v = c; v < c + w; v++) { int have = count.getOrDefault(v, 0); if (have == 0) return false; count.put(v, have - 1); }
        }
        return true;
    }
    static int candyNoMax(int[] r) {
        int n = r.length; int[] c = new int[n]; Arrays.fill(c, 1);
        for (int i = 1; i < n; i++) if (r[i] > r[i - 1]) c[i] = c[i - 1] + 1;
        for (int i = n - 2; i >= 0; i--) if (r[i] > r[i + 1]) c[i] = c[i + 1] + 1;
        int s = 0; for (int x : c) s += x; return s;
    }
    static boolean wildNoClamp(String s) {
        int lo = 0, hi = 0;
        for (char ch : s.toCharArray()) { if (ch == '(') { lo++; hi++; } else if (ch == ')') { lo--; hi--; } else { lo--; hi++; } if (hi < 0) return false; }
        return lo == 0;
    }
    static boolean tripletsNoFilter(int[][] ts, int[] target) {
        boolean[] hit = new boolean[3];
        for (int[] t : ts) for (int k = 0; k < 3; k++) if (t[k] == target[k]) hit[k] = true;
        return hit[0] && hit[1] && hit[2];
    }
    static int coinsLargestFirst(int[] coins, int amount) {
        int[] c = coins.clone(); Arrays.sort(c); int used = 0;
        for (int k = c.length - 1; k >= 0; k--) while (amount >= c[k]) { amount -= c[k]; used++; }
        return amount == 0 ? used : -1;
    }

    public static void main(String[] args) {
        // ---------- Chapter 1: Maximum Subarray ----------
        eq(6, new B_maxSubArray().maxSubArray(new int[]{-2, 1, -3, 4, -1, 2, 1, -5, 4}), "kadane LC 1");
        eq(1, new B_maxSubArray().maxSubArray(new int[]{1}), "kadane single");
        eq(23, new B_maxSubArray().maxSubArray(new int[]{5, 4, -1, 7, 8}), "kadane LC 3");
        eq(-1, new B_maxSubArray().maxSubArray(new int[]{-3, -1, -2}), "kadane all negative");
        eq(8, new B_maxSubArray().maxSubArray(new int[]{5, -2, 5}), "kadane crosses a negative");
        eq(0, kadaneZeroStart(new int[]{-3, -1, -2}), "catch-the-bug: zero start returns 0");
        eq(-1000, new B_maxSubArray().maxSubArray(new int[]{-1000}), "kadane single negative");
        for (int t = 0; t < 5000; t++) {
            int[] a = randArr(1, 9, -9, 9);
            eq(bruteMaxSum(a), new B_maxSubArray().maxSubArray(a), "maxSubArray " + Arrays.toString(a));
        }

        // ---------- Chapter 2: Maximum Product Subarray ----------
        eq(6, new B_maxProduct().maxProduct(new int[]{2, 3, -2, 4}), "product LC 1");
        eq(0, new B_maxProduct().maxProduct(new int[]{-2, 0, -1}), "product LC 2");
        eq(24, new B_maxProduct().maxProduct(new int[]{-2, 3, -4}), "product two negatives");
        eq(3, productOnlyMax(new int[]{-2, 3, -4}), "catch-the-bug: tracking only hi returns 3");
        eq(6, new B_maxProduct().maxProduct(new int[]{2, 3, 0, 4}), "product zero reset");
        eq(-2, new B_maxProduct().maxProduct(new int[]{-2}), "product single negative");
        eq(6, new B_maxProduct().maxProduct(new int[]{-1, -2, -3}), "product all negative");
        eq(96, productOverwrite(new int[]{-2, 3, -4, -1}), "catch-the-bug: overwriting hi first returns 96");
        eq(24, bruteMaxProduct(new int[]{-2, 3, -4, -1}), "... where the true answer is 24");
        for (int t = 0; t < 5000; t++) {
            int[] a = randArr(1, 8, -4, 4);
            eq(bruteMaxProduct(a), new B_maxProduct().maxProduct(a), "maxProduct " + Arrays.toString(a));
        }

        // ---------- Chapter 3: Gas Station ----------
        eq(3, new B_canCompleteCircuit().canCompleteCircuit(new int[]{1, 2, 3, 4, 5}, new int[]{3, 4, 5, 1, 2}), "gas LC 1");
        eq(-1, new B_canCompleteCircuit().canCompleteCircuit(new int[]{2, 3, 4}, new int[]{3, 4, 3}), "gas LC 2");
        eq(2, gasNoTotal(new int[]{2, 3, 4}, new int[]{3, 4, 3}), "catch-the-bug: no total check returns 2");
        eq(3, new B_canCompleteCircuit().canCompleteCircuit(new int[]{4, 1, 1, 6}, new int[]{1, 2, 5, 1}), "gas trace");
        eq(0, new B_canCompleteCircuit().canCompleteCircuit(new int[]{5}, new int[]{4}), "gas single");
        eq(-1, new B_canCompleteCircuit().canCompleteCircuit(new int[]{1}, new int[]{2}), "gas single impossible");
        for (int t = 0; t < 6000; t++) {
            int n = 1 + R.nextInt(7);
            int[] g = randArr(n, n, 0, 6), c = randArr(n, n, 0, 6);
            boolean any = false; for (int s = 0; s < n; s++) any |= circuitFrom(g, c, s);
            int got = new B_canCompleteCircuit().canCompleteCircuit(g, c);
            if (!any) eq(-1, got, "gas none " + Arrays.toString(g) + " " + Arrays.toString(c));
            else ok(got >= 0 && got < n && circuitFrom(g, c, got), "gas valid start " + Arrays.toString(g) + " " + Arrays.toString(c) + " got " + got);
        }

        // ---------- Chapter 4: Jump Game ----------
        eq(true, new B_canJump().canJump(new int[]{2, 3, 1, 1, 4}), "jump LC 1");
        eq(false, new B_canJump().canJump(new int[]{3, 2, 1, 0, 4}), "jump LC 2");
        eq(true, new B_canJump().canJump(new int[]{0}), "jump single");
        eq(true, new B_canJump().canJump(new int[]{2, 0, 1, 0}), "jump over a zero");
        eq(false, jumpZeroStuck(new int[]{2, 0, 1, 0}), "catch-the-bug: any zero means stuck");
        eq(false, new B_canJump().canJump(new int[]{0, 1}), "jump stuck at start");
        for (int t = 0; t < 5000; t++) {
            int[] a = randArr(1, 9, 0, 3);
            eq(bfsJumps(a) >= 0, new B_canJump().canJump(a), "canJump " + Arrays.toString(a));
        }

        // ---------- Chapter 5: Jump Game II ----------
        eq(2, new B_jump().jump(new int[]{2, 3, 1, 1, 4}), "jump2 LC 1");
        eq(2, new B_jump().jump(new int[]{2, 3, 0, 1, 4}), "jump2 LC 2");
        eq(0, new B_jump().jump(new int[]{0}), "jump2 single");
        eq(3, new B_jump().jump(new int[]{1, 1, 1, 1}), "jump2 ones");
        eq(3, jumpToN(new int[]{2, 3, 1, 1, 4}), "catch-the-bug: looping to n adds a jump");
        eq(1, jumpToN(new int[]{0}), "catch-the-bug: looping to n on [0]");
        eq(3, jumpFarthestLanding(new int[]{2, 3, 1, 1, 4}), "trace: landing as far as possible takes 3");
        for (int t = 0; t < 6000; t++) {
            int[] a = randArr(1, 9, 0, 4);
            int want = bfsJumps(a);
            if (want < 0) continue;                    // LeetCode guarantees the end is reachable
            eq(want, new B_jump().jump(a), "jump " + Arrays.toString(a));
        }

        // ---------- Chapter 6: Partition Labels ----------
        eq(List.of(9, 7, 8), new B_partitionLabels().partitionLabels("ababcbacadefegdehijhklij"), "partition LC 1");
        eq(List.of(10), new B_partitionLabels().partitionLabels("eccbbbbdec"), "partition LC 2");
        eq(List.of(4), new B_partitionLabels().partitionLabels("abba"), "partition abba");
        eq(List.of(3, 1), partitionShortcut("abba"), "catch-the-bug: cutting at the current letter's last copy");
        eq(List.of(1), new B_partitionLabels().partitionLabels("z"), "partition single");
        for (int t = 0; t < 4000; t++) {
            String s = randWord(11, 1 + R.nextInt(5));
            eq(brutePartition(s), new B_partitionLabels().partitionLabels(s), "partitionLabels " + s);
        }

        // ---------- Chapter 7: Hand of Straights ----------
        eq(true, new B_isNStraightHand().isNStraightHand(new int[]{1, 2, 3, 6, 2, 3, 4, 7, 8}, 3), "straights LC 1");
        eq(false, new B_isNStraightHand().isNStraightHand(new int[]{1, 2, 3, 4, 5}, 4), "straights LC 2");
        eq(false, new B_isNStraightHand().isNStraightHand(new int[]{1, 1, 2, 2, 3, 4}, 3), "straights trace 2");
        eq(true, new B_isNStraightHand().isNStraightHand(new int[]{2, 1, 3, 4, 5, 6}, 3), "straights shuffled");
        eq(false, straightsInputOrder(new int[]{2, 1, 3, 4, 5, 6}, 3), "catch-the-bug: starting groups in input order");
        eq(true, new B_isNStraightHand().isNStraightHand(new int[]{1000000000, 999999999, 999999998}, 3), "straights big values");
        eq(true, new B_isNStraightHand().isNStraightHand(new int[]{5, 5}, 1), "straights size 1");
        for (int t = 0; t < 4000; t++) {
            int[] h = randArr(1, 9, 0, 6);
            int w = 1 + R.nextInt(4);
            List<Integer> list = new ArrayList<>(); for (int x : h) list.add(x);
            boolean want = h.length % w == 0 && backtrackGroups(list, w);
            eq(want, new B_isNStraightHand().isNStraightHand(h.clone(), w), "isNStraightHand " + Arrays.toString(h) + " w=" + w);
        }

        // ---------- Side quest 1: Best Time to Buy and Sell Stock II ----------
        eq(7, new B_maxProfit().maxProfit(new int[]{7, 1, 5, 3, 6, 4}), "stock LC 1");
        eq(4, new B_maxProfit().maxProfit(new int[]{1, 2, 3, 4, 5}), "stock LC 2");
        eq(0, new B_maxProfit().maxProfit(new int[]{7, 6, 4, 3, 1}), "stock LC 3");
        for (int t = 0; t < 3000; t++) {
            int[] p = randArr(1, 8, 0, 9);
            eq(bruteTrades(p, 0, false, 0), new B_maxProfit().maxProfit(p), "maxProfit " + Arrays.toString(p));
        }

        // ---------- Side quest 2: Assign Cookies ----------
        eq(1, new B_findContentChildren().findContentChildren(new int[]{1, 2, 3}, new int[]{1, 1}), "cookies LC 1");
        eq(2, new B_findContentChildren().findContentChildren(new int[]{1, 2}, new int[]{1, 2, 3}), "cookies LC 2");
        eq(0, new B_findContentChildren().findContentChildren(new int[]{4}, new int[]{}), "cookies none");
        for (int t = 0; t < 3000; t++) {
            int[] g = randArr(1, 6, 1, 6), s = randArr(0, 6, 1, 6);
            eq(bruteCookies(g, s, 0, new boolean[g.length]), new B_findContentChildren().findContentChildren(g.clone(), s.clone()), "cookies " + Arrays.toString(g) + " " + Arrays.toString(s));
        }

        // ---------- Side quest 3: Boats to Save People ----------
        eq(1, new B_numRescueBoats().numRescueBoats(new int[]{1, 2}, 3), "boats LC 1");
        eq(3, new B_numRescueBoats().numRescueBoats(new int[]{3, 2, 2, 1}, 3), "boats LC 2");
        eq(4, new B_numRescueBoats().numRescueBoats(new int[]{3, 5, 3, 4}, 5), "boats LC 3");
        eq(1, new B_numRescueBoats().numRescueBoats(new int[]{4}, 5), "boats single");
        for (int t = 0; t < 3000; t++) {
            int limit = 1 + R.nextInt(9);
            int[] w = randArr(1, 8, 1, limit);
            eq(bruteBoats(w, limit), new B_numRescueBoats().numRescueBoats(w.clone(), limit), "boats " + Arrays.toString(w) + " limit=" + limit);
        }

        // ---------- Side quest 4: Candy ----------
        eq(5, new B_candy().candy(new int[]{1, 0, 2}), "candy LC 1");
        eq(4, new B_candy().candy(new int[]{1, 2, 2}), "candy LC 2");
        eq(11, new B_candy().candy(new int[]{1, 3, 4, 5, 2}), "candy peak");
        eq(9, candyNoMax(new int[]{1, 3, 4, 5, 2}), "catch-the-bug: no max in the right pass gives 9");
        eq(15, new B_candy().candy(new int[]{5, 4, 3, 2, 1}), "candy falling");
        eq(1, new B_candy().candy(new int[]{7}), "candy single");
        for (int t = 0; t < 2000; t++) {
            int[] r = randArr(1, 6, 0, 4);
            eq(bruteCandy(r), new B_candy().candy(r), "candy brute " + Arrays.toString(r));
        }
        for (int t = 0; t < 3000; t++) {
            int[] r = randArr(1, 12, 0, 6);
            eq(relaxCandy(r), new B_candy().candy(r), "candy relax " + Arrays.toString(r));
        }

        // ---------- Side quest 5: Valid Parenthesis String ----------
        eq(true, new B_checkValidString().checkValidString("()"), "wild LC 1");
        eq(true, new B_checkValidString().checkValidString("(*)"), "wild LC 2");
        eq(true, new B_checkValidString().checkValidString("(*))"), "wild LC 3");
        eq(false, wildNoClamp("(*)"), "catch-the-bug: no clamp rejects (*)");
        eq(false, new B_checkValidString().checkValidString(")*("), "wild order matters");
        eq(true, new B_checkValidString().checkValidString("*"), "wild star alone");
        for (int t = 0; t < 5000; t++) {
            int n = 1 + R.nextInt(8); StringBuilder b = new StringBuilder();
            for (int i = 0; i < n; i++) b.append("()*".charAt(R.nextInt(3)));
            String s = b.toString();
            eq(bruteWild(s), new B_checkValidString().checkValidString(s), "checkValidString " + s);
        }

        // ---------- Side quest 6: Merge Triplets to Form Target ----------
        eq(true, new B_mergeTriplets().mergeTriplets(new int[][]{{2, 5, 3}, {1, 8, 4}, {1, 7, 5}}, new int[]{2, 7, 5}), "triplets LC 1");
        eq(false, new B_mergeTriplets().mergeTriplets(new int[][]{{3, 4, 5}, {4, 5, 6}}, new int[]{3, 2, 5}), "triplets LC 2");
        eq(true, new B_mergeTriplets().mergeTriplets(new int[][]{{2, 5, 3}, {2, 3, 4}, {1, 2, 5}, {5, 2, 3}}, new int[]{5, 5, 5}), "triplets LC 3");
        eq(false, new B_mergeTriplets().mergeTriplets(new int[][]{{2, 9, 5}, {1, 7, 1}}, new int[]{2, 7, 5}), "triplets poisoned");
        eq(true, tripletsNoFilter(new int[][]{{2, 9, 5}, {1, 7, 1}}, new int[]{2, 7, 5}), "catch-the-bug: no filter says true");
        for (int t = 0; t < 3000; t++) {
            int m = 1 + R.nextInt(5); int[][] ts = new int[m][];
            for (int i = 0; i < m; i++) ts[i] = randArr(3, 3, 1, 4);
            int[] target = randArr(3, 3, 1, 4);
            eq(bruteTriplets(ts, target), new B_mergeTriplets().mergeTriplets(ts, target), "mergeTriplets");
        }

        // ---------- Choose the tool: Coin Change ----------
        eq(3, coinsLargestFirst(new int[]{1, 3, 4}, 6), "decoy: largest-first uses 3 coins for 6");
        eq(2, new B_coinChange().coinChange(new int[]{1, 3, 4}, 6), "coin change {1,3,4} 6");
        eq(-1, new B_coinChange().coinChange(new int[]{2}, 3), "coin change impossible");
        eq(0, new B_coinChange().coinChange(new int[]{1}, 0), "coin change zero");
        eq(3, new B_coinChange().coinChange(new int[]{1, 2, 5}, 11), "coin change LC 1");
        for (int t = 0; t < 3000; t++) {
            int[] coins = randArr(1, 4, 1, 9);
            int amount = R.nextInt(30);
            eq(bfsCoins(coins, amount), new B_coinChange().coinChange(coins, amount), "coinChange " + Arrays.toString(coins) + " " + amount);
        }

        System.out.println("OK greedy: " + cases + " checks passed");
    }
}
