import java.util.*;

// Runs every Java solution shown in stacks.mdx against independent brute-force oracles on
// hand-picked edge cases plus thousands of random small inputs. Any mismatch throws.
// It also re-creates the lesson's "catch the bug" versions and proves each one fails on the input the lesson names.
public class Check {
    static final Random R = new Random(7);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }
    static int[] randArr(int maxLen, int lo, int hi) {
        int[] a = new int[R.nextInt(maxLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static String randText(String alphabet, int maxLen) {
        StringBuilder sb = new StringBuilder();
        int n = R.nextInt(maxLen + 1);
        for (int i = 0; i < n; i++) sb.append(alphabet.charAt(R.nextInt(alphabet.length())));
        return sb.toString();
    }

    // ---------- Oracles ----------
    static boolean validByErasing(String s) {           // erase adjacent matched pairs until nothing changes
        String prev = null;
        while (!s.equals(prev)) { prev = s; s = s.replace("()", "").replace("[]", "").replace("{}", ""); }
        return s.isEmpty();
    }
    static int[] nextWarmerBrute(int[] t) {
        int[] ans = new int[t.length];
        for (int i = 0; i < t.length; i++) for (int j = i + 1; j < t.length; j++) if (t[j] > t[i]) { ans[i] = j - i; break; }
        return ans;
    }
    static int[] circularBrute(int[] a) {
        int n = a.length; int[] ans = new int[n];
        for (int i = 0; i < n; i++) { ans[i] = -1; for (int k = 1; k < n; k++) if (a[(i + k) % n] > a[i]) { ans[i] = a[(i + k) % n]; break; } }
        return ans;
    }
    static int rectBrute(int[] h) {
        int best = 0;
        for (int i = 0; i < h.length; i++) { int low = Integer.MAX_VALUE; for (int j = i; j < h.length; j++) { low = Math.min(low, h[j]); best = Math.max(best, low * (j - i + 1)); } }
        return best;
    }
    // Fleets: a car's real arrival time is the slowest solo time among itself and every car ahead (no passing).
    // Count distinct real arrival times, comparing fractions exactly with cross-multiplication.
    static int fleetBrute(int target, int[] pos, int[] speed) {
        int n = pos.length; List<long[]> arrivals = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            long num = target - pos[i], den = speed[i];
            for (int j = 0; j < n; j++) if (pos[j] > pos[i] && (long) (target - pos[j]) * den > num * speed[j]) { num = target - pos[j]; den = speed[j]; }
            boolean seen = false;
            for (long[] a : arrivals) if (a[0] * den == num * a[1]) seen = true;
            if (!seen) arrivals.add(new long[]{num, den});
        }
        return arrivals.size();
    }
    // Postfix: random expression tree, printed in post-order, evaluated recursively.
    static abstract class Expr { abstract int eval(); abstract void post(List<String> out); }
    static class Num extends Expr { int v; Num(int v) { this.v = v; } int eval() { return v; } void post(List<String> out) { out.add(Integer.toString(v)); } }
    static class Op extends Expr {
        char op; Expr l, r; Op(char op, Expr l, Expr r) { this.op = op; this.l = l; this.r = r; }
        int eval() { int a = l.eval(), b = r.eval(); return switch (op) { case '+' -> a + b; case '-' -> a - b; case '*' -> a * b; default -> a / b; }; }
        void post(List<String> out) { l.post(out); r.post(out); out.add(String.valueOf(op)); }
    }
    static Expr randExpr(int depth) {
        if (depth == 0 || R.nextInt(3) == 0) return new Num(R.nextInt(41) - 20);
        char op = "+-*/".charAt(R.nextInt(4));
        Expr l = randExpr(depth - 1), r = randExpr(depth - 1);
        if (op == '/' && r.eval() == 0) r = new Num(R.nextInt(2) == 0 ? 3 : -7);
        return new Op(op, l, r);
    }
    static List<Integer> asteroidBrute(int[] rocks) {
        List<Integer> a = new ArrayList<>(); for (int x : rocks) a.add(x);
        while (true) {
            int i = -1;
            for (int k = 0; k + 1 < a.size(); k++) if (a.get(k) > 0 && a.get(k + 1) < 0) { i = k; break; }
            if (i < 0) return a;
            int l = a.get(i), r = -a.get(i + 1);
            if (l == r) { a.remove(i + 1); a.remove(i); } else if (l > r) a.remove(i + 1); else a.remove(i);
        }
    }
    static String removeBrute(String num, int k) {
        int n = num.length(); String best = null;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (Integer.bitCount(mask) != k) continue;
            StringBuilder sb = new StringBuilder();
            for (int b = 0; b < n; b++) if ((mask >> b & 1) == 0) sb.append(num.charAt(b));
            String s = sb.toString().replaceFirst("^0+", "");
            if (s.isEmpty()) s = "0";
            if (best == null || s.length() < best.length() || (s.length() == best.length() && s.compareTo(best) < 0)) best = s;
        }
        return best;
    }
    static int trapBrute(int[] h) {
        int water = 0;
        for (int i = 0; i < h.length; i++) {
            int l = 0, r = 0;
            for (int j = 0; j <= i; j++) l = Math.max(l, h[j]);
            for (int j = i; j < h.length; j++) r = Math.max(r, h[j]);
            water += Math.min(l, r) - h[i];
        }
        return water;
    }
    static int sumMinsBrute(int[] a) {
        long s = 0;
        for (int i = 0; i < a.length; i++) { int m = Integer.MAX_VALUE; for (int j = i; j < a.length; j++) { m = Math.min(m, a[j]); s += m; } }
        return (int) (s % 1_000_000_007L);
    }

    public static void main(String[] args) {
        // ---- Valid Parentheses ----
        for (String s : new String[]{"", "()", "()[]{}", "(]", "([)]", "{[]}", ")(", "((", "]", "(((", "([]{})"})
            eq(validByErasing(s), new B_isValid().isValid(s), "isValid " + s);
        for (int t = 0; t < 5000; t++) { String s = randText("()[]{}", 10); eq(validByErasing(s), new B_isValid().isValid(s), "isValid " + s); }

        // ---- Min Stack (full and lean) vs a naive list model ----
        int[] pool = {0, 1, -1, 5, 127, 128, 1000, -1000, Integer.MAX_VALUE, Integer.MIN_VALUE};
        for (int t = 0; t < 3000; t++) {
            B_minStack.MinStack full = new B_minStack().new MinStack();
            B_minStackLean.MinStackLean lean = new B_minStackLean().new MinStackLean();
            List<Integer> model = new ArrayList<>();
            int ops = 1 + R.nextInt(30);
            for (int k = 0; k < ops; k++) {
                int choice = model.isEmpty() ? 0 : R.nextInt(4);
                if (choice == 0) {
                    int x = R.nextInt(3) == 0 ? pool[R.nextInt(pool.length)] : R.nextInt(2001) - 1000;
                    full.push(x); lean.push(x); model.add(x);
                } else if (choice == 1) { full.pop(); lean.pop(); model.remove(model.size() - 1); }
                else if (choice == 2) { eq(model.get(model.size() - 1), full.top(), "MinStack top"); eq(model.get(model.size() - 1), lean.top(), "MinStackLean top"); }
                else { int min = Collections.min(model); eq(min, full.getMin(), "MinStack getMin"); eq(min, lean.getMin(), "MinStackLean getMin"); }
            }
        }
        // The lesson's buggy lean versions fail on the inputs it names.
        BuggyStrictLean strict = new BuggyStrictLean(); strict.push(2); strict.push(2); strict.pop();
        boolean threw = false; try { strict.getMin(); } catch (NoSuchElementException | NullPointerException e) { threw = true; }
        eq(true, threw, "lean with < loses the duplicate minimum (push 2, push 2, pop, getMin)");
        BuggyBoxedLean boxed = new BuggyBoxedLean(); boxed.push(1000); boxed.push(999); boxed.pop();
        eq(999, boxed.getMin(), "Integer == bug: push 1000, push 999, pop leaves a stale 999");
        BuggyBoxedLean small = new BuggyBoxedLean(); small.push(10); small.push(9); small.pop();
        eq(10, small.getMin(), "Integer == bug hides on small cached values");

        // ---- Evaluate RPN ----
        eq(9, new B_evalRPN().evalRPN(new String[]{"2", "1", "+", "3", "*"}), "rpn example 1");
        eq(6, new B_evalRPN().evalRPN(new String[]{"4", "13", "5", "/", "+"}), "rpn example 2");
        eq(22, new B_evalRPN().evalRPN(new String[]{"10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"}), "rpn example 3");
        eq(-3, new B_evalRPN().evalRPN(new String[]{"-7", "2", "/"}), "rpn truncates toward zero");
        eq(2, new B_evalRPN().evalRPN(new String[]{"5", "3", "-"}), "rpn operand order");
        eq(42, new B_evalRPN().evalRPN(new String[]{"42"}), "rpn single number");
        eq(-2, buggyRpnMinus(5, 3), "operand-order bug turns 5 3 - into -2");
        for (int t = 0; t < 5000; t++) {
            Expr e = randExpr(4); List<String> tokens = new ArrayList<>(); e.post(tokens);
            eq(e.eval(), new B_evalRPN().evalRPN(tokens.toArray(new String[0])), "rpn " + tokens);
        }

        // ---- Daily Temperatures ----
        eq(new int[]{1, 1, 4, 2, 1, 1, 0, 0}, new B_dailyTemperatures().dailyTemperatures(new int[]{73, 74, 75, 71, 69, 72, 76, 73}), "temps classic");
        eq(new int[]{1, 1, 1, 0}, new B_dailyTemperatures().dailyTemperatures(new int[]{30, 40, 50, 60}), "temps increasing");
        eq(new int[]{0, 0, 0}, new B_dailyTemperatures().dailyTemperatures(new int[]{60, 50, 40}), "temps decreasing");
        eq(new int[]{2, 1, 0}, new B_dailyTemperatures().dailyTemperatures(new int[]{70, 70, 71}), "temps equal is not warmer");
        eq(new int[]{}, new B_dailyTemperatures().dailyTemperatures(new int[]{}), "temps empty");
        for (int t = 0; t < 5000; t++) { int[] a = randArr(10, 30, 36); eq(nextWarmerBrute(a), new B_dailyTemperatures().dailyTemperatures(a), "temps " + Arrays.toString(a)); }

        // ---- Next Greater Element II ----
        eq(new int[]{2, -1, 2}, new B_nextGreaterElements().nextGreaterElements(new int[]{1, 2, 1}), "nge2 example");
        eq(new int[]{2, 3, 4, -1, 4}, new B_nextGreaterElements().nextGreaterElements(new int[]{1, 2, 3, 4, 3}), "nge2 example 2");
        eq(new int[]{-1, 5, 5, 5, 5}, new B_nextGreaterElements().nextGreaterElements(new int[]{5, 4, 3, 2, 1}), "nge2 decreasing");
        eq(new int[]{-1, -1}, new B_nextGreaterElements().nextGreaterElements(new int[]{7, 7}), "nge2 all equal");
        eq(new int[]{2, -1, -1}, buggyOneLap(new int[]{1, 2, 1}), "one lap misses the wrap-around on [1, 2, 1]");
        for (int t = 0; t < 5000; t++) { int[] a = randArr(9, -3, 3); eq(circularBrute(a), new B_nextGreaterElements().nextGreaterElements(a), "nge2 " + Arrays.toString(a)); }

        // ---- Car Fleet (stack version and one-variable version) ----
        eq(3, new B_carFleet().carFleet(12, new int[]{10, 8, 0, 5, 3}, new int[]{2, 4, 1, 1, 3}), "fleet example");
        eq(1, new B_carFleet().carFleet(10, new int[]{3}, new int[]{3}), "fleet single");
        eq(1, new B_carFleet().carFleet(100, new int[]{0, 2, 4}, new int[]{4, 2, 1}), "fleet all merge");
        eq(1, new B_carFleet().carFleet(10, new int[]{0, 5}, new int[]{2, 1}), "fleet meet exactly at target");
        eq(2, buggyFleetGe(10, new int[]{0, 5}, new int[]{2, 1}), "fleet >= bug splits cars that arrive together");
        eq(1, new B_carFleetCount().carFleet(10, new int[]{0, 5}, new int[]{2, 1}), "fleet count: meet at target");
        for (int t = 0; t < 5000; t++) {
            int target = 1 + R.nextInt(15), n = R.nextInt(Math.min(target, 7) + 1);
            List<Integer> spots = new ArrayList<>(); for (int p = 0; p < target; p++) spots.add(p);
            Collections.shuffle(spots, R);
            int[] pos = new int[n], speed = new int[n];
            for (int i = 0; i < n; i++) { pos[i] = spots.get(i); speed[i] = 1 + R.nextInt(5); }
            int expect = fleetBrute(target, pos, speed);
            eq(expect, new B_carFleet().carFleet(target, pos.clone(), speed.clone()), "fleet " + target + " " + Arrays.toString(pos) + " " + Arrays.toString(speed));
            eq(expect, new B_carFleetCount().carFleet(target, pos.clone(), speed.clone()), "fleetCount");
        }
        // Large values: the double comparison stays exact enough at the problem's bounds (target, speed <= 1e6).
        eq(fleetBrute(1_000_000, new int[]{999_999, 999_998, 0}, new int[]{1, 2, 1_000_000}), new B_carFleet().carFleet(1_000_000, new int[]{999_999, 999_998, 0}, new int[]{1, 2, 1_000_000}), "fleet big values");
        eq(fleetBrute(1_000_000, new int[]{1, 0}, new int[]{999_999, 999_998}), new B_carFleet().carFleet(1_000_000, new int[]{1, 0}, new int[]{999_999, 999_998}), "fleet near-equal times");

        // ---- Largest Rectangle in Histogram ----
        eq(10, new B_largestRectangleArea().largestRectangleArea(new int[]{2, 1, 5, 6, 2, 3}), "histogram classic");
        eq(4, new B_largestRectangleArea().largestRectangleArea(new int[]{2, 4}), "histogram example 2");
        eq(6, new B_largestRectangleArea().largestRectangleArea(new int[]{3, 4}), "histogram trace [3, 4]");
        eq(9, new B_largestRectangleArea().largestRectangleArea(new int[]{3, 3, 3}), "histogram equal bars");
        eq(0, new B_largestRectangleArea().largestRectangleArea(new int[]{}), "histogram empty");
        eq(0, new B_largestRectangleArea().largestRectangleArea(new int[]{0, 0}), "histogram zeros");
        eq(0, buggyNoSentinel(new int[]{2, 4}), "no sentinel: [2, 4] returns 0");
        for (int t = 0; t < 5000; t++) { int[] h = randArr(10, 0, 6); eq(rectBrute(h), new B_largestRectangleArea().largestRectangleArea(h), "histogram " + Arrays.toString(h)); }
        int[] tall = new int[100_000]; Arrays.fill(tall, 10_000);
        eq(1_000_000_000, new B_largestRectangleArea().largestRectangleArea(tall), "histogram max bounds fit int");

        // ---- Side quest: Next Greater Element I ----
        eq(new int[]{-1, 3, -1}, new B_nextGreaterElement().nextGreaterElement(new int[]{4, 1, 2}, new int[]{1, 3, 4, 2}), "nge1 example");
        eq(new int[]{3, -1}, new B_nextGreaterElement().nextGreaterElement(new int[]{2, 4}, new int[]{1, 2, 3, 4}), "nge1 example 2");
        for (int t = 0; t < 3000; t++) {
            List<Integer> vals = new ArrayList<>(); for (int v = -5; v <= 6; v++) vals.add(v);
            Collections.shuffle(vals, R);
            int m = R.nextInt(8); int[] nums2 = new int[m]; for (int i = 0; i < m; i++) nums2[i] = vals.get(i);
            List<Integer> pick = new ArrayList<>(); for (int x : nums2) if (R.nextBoolean()) pick.add(x);
            Collections.shuffle(pick, R);
            int[] nums1 = pick.stream().mapToInt(Integer::intValue).toArray();
            int[] expect = new int[nums1.length];
            for (int i = 0; i < nums1.length; i++) {
                expect[i] = -1; int j = 0; while (nums2[j] != nums1[i]) j++;
                for (int k = j + 1; k < m; k++) if (nums2[k] > nums1[i]) { expect[i] = nums2[k]; break; }
            }
            eq(expect, new B_nextGreaterElement().nextGreaterElement(nums1, nums2), "nge1");
        }

        // ---- Side quest: Online Stock Span ----
        int[] prices = {100, 80, 60, 70, 60, 75, 85}, spans = {1, 1, 1, 2, 1, 4, 6};
        B_stockSpanner.StockSpanner sp = new B_stockSpanner().new StockSpanner();
        for (int i = 0; i < prices.length; i++) eq(spans[i], sp.next(prices[i]), "span example day " + i);
        for (int t = 0; t < 3000; t++) {
            int[] p = randArr(12, 1, 6);
            B_stockSpanner.StockSpanner s = new B_stockSpanner().new StockSpanner();
            for (int i = 0; i < p.length; i++) { int expect = 0; for (int j = i; j >= 0 && p[j] <= p[i]; j--) expect++; eq(expect, s.next(p[i]), "span"); }
        }

        // ---- Side quest: Asteroid Collision ----
        eq(new int[]{5, 10}, new B_asteroidCollision().asteroidCollision(new int[]{5, 10, -5}), "asteroids example 1");
        eq(new int[]{}, new B_asteroidCollision().asteroidCollision(new int[]{8, -8}), "asteroids equal");
        eq(new int[]{10}, new B_asteroidCollision().asteroidCollision(new int[]{10, 2, -5}), "asteroids example 3");
        eq(new int[]{-2, -1, 1, 2}, new B_asteroidCollision().asteroidCollision(new int[]{-2, -1, 1, 2}), "asteroids never meet");
        for (int t = 0; t < 5000; t++) {
            int[] a = randArr(9, 1, 4); for (int i = 0; i < a.length; i++) if (R.nextBoolean()) a[i] = -a[i];
            eq(asteroidBrute(a).stream().mapToInt(Integer::intValue).toArray(), new B_asteroidCollision().asteroidCollision(a), "asteroids " + Arrays.toString(a));
        }

        // ---- Side quest: Remove K Digits ----
        eq("1219", new B_removeKdigits().removeKdigits("1432219", 3), "removeK example 1");
        eq("200", new B_removeKdigits().removeKdigits("10200", 1), "removeK leading zeros");
        eq("0", new B_removeKdigits().removeKdigits("10", 2), "removeK everything");
        eq("123", new B_removeKdigits().removeKdigits("12345", 2), "removeK increasing: trim the tail");
        eq("0", new B_removeKdigits().removeKdigits("100", 1), "removeK all zeros left");
        for (int t = 0; t < 4000; t++) {
            String num = randText("0123456789", 8); if (num.isEmpty()) num = "7";
            if (num.length() > 1 && num.charAt(0) == '0') num = "1" + num.substring(1);
            int k = R.nextInt(num.length() + 1);
            eq(removeBrute(num, k), new B_removeKdigits().removeKdigits(num, k), "removeK " + num + " k=" + k);
        }

        // ---- Side quest: Trapping Rain Water with a stack ----
        eq(6, new B_trapStack().trap(new int[]{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}), "trap classic");
        eq(5, new B_trapStack().trap(new int[]{2, 0, 1, 0, 3}), "trap figure");
        eq(9, new B_trapStack().trap(new int[]{4, 2, 0, 3, 2, 5}), "trap example 2");
        for (int t = 0; t < 5000; t++) { int[] h = randArr(10, 0, 5); eq(trapBrute(h), new B_trapStack().trap(h), "trap " + Arrays.toString(h)); }

        // ---- Side quest: Sum of Subarray Minimums ----
        eq(17, new B_sumSubarrayMins().sumSubarrayMins(new int[]{3, 1, 2, 4}), "sumMins example");
        eq(444, new B_sumSubarrayMins().sumSubarrayMins(new int[]{11, 81, 94, 43, 3}), "sumMins example 2");
        eq(6, new B_sumSubarrayMins().sumSubarrayMins(new int[]{2, 2}), "sumMins duplicates");
        eq(8, buggyBothStrict(new int[]{2, 2}), "strict on both sides double-counts [2, 2]");
        eq(4, buggyBothLoose(new int[]{2, 2}), "non-strict on both sides misses [2, 2]");
        for (int t = 0; t < 5000; t++) { int[] a = randArr(9, 1, 3); if (a.length == 0) continue; eq(sumMinsBrute(a), new B_sumSubarrayMins().sumSubarrayMins(a), "sumMins " + Arrays.toString(a)); }
        int[] big = new int[3000]; for (int i = 0; i < big.length; i++) big[i] = 1 + R.nextInt(30000);
        eq(sumMinsBrute(big), new B_sumSubarrayMins().sumSubarrayMins(big), "sumMins needs the modulus");

        // ---- Claims made in the lesson's prose and reveals ----
        eq(new int[]{1, 1, 0}, buggyTempsGe(new int[]{70, 70, 71}), ">= makes equal days answer each other");
        eq(true, threeCountersAccept("([)]"), "three separate counters accept ([)]");
        for (int t = 0; t < 3000; t++) {
            String s = randText("()", 10);
            eq(validByErasing(s), singleKindCounter(s), "one kind of bracket: a counter is enough " + s);
            int[] a = randArr(9, -3, 3);
            eq(circularBrute(a), pushBothLaps(a), "pushing in both laps is wasted work, not wrong");
            int[] h = randArr(9, 0, 5);
            eq(rectBrute(h), histogramStrict(h), "popping on strict > is also correct");
            eq(rectBrute(h), histogramTwoPass(h), "two-pass histogram");
            int[] temps = randArr(9, 0, 4), prev = previousWarmer(temps), left = lookLeftSmaller(temps);
            for (int i = 0; i < temps.length; i++) {
                int p = -1; for (int j = i - 1; j >= 0; j--) if (temps[j] > temps[i]) { p = j; break; }
                eq(p, prev[i], "previous strictly warmer day");
                int q = -1; for (int j = i - 1; j >= 0; j--) if (temps[j] < temps[i]) { q = temps[j]; break; }
                eq(q, left[i], "nearest strictly smaller value on the left");
            }
        }

        System.out.println("OK stacks: " + cases + " checks passed");
    }

    static int[] buggyTempsGe(int[] t) {
        int[] ans = new int[t.length]; Deque<Integer> w = new ArrayDeque<>();
        for (int i = 0; i < t.length; i++) { while (!w.isEmpty() && t[i] >= t[w.peek()]) { int d = w.pop(); ans[d] = i - d; } w.push(i); }
        return ans;
    }
    static boolean threeCountersAccept(String s) {
        int round = 0, square = 0, curly = 0;
        for (char c : s.toCharArray()) {
            switch (c) { case '(' -> round++; case ')' -> round--; case '[' -> square++; case ']' -> square--; case '{' -> curly++; default -> curly--; }
            if (round < 0 || square < 0 || curly < 0) return false;
        }
        return round == 0 && square == 0 && curly == 0;
    }
    static boolean singleKindCounter(String s) {
        int open = 0;
        for (char c : s.toCharArray()) { open += c == '(' ? 1 : -1; if (open < 0) return false; }
        return open == 0;
    }
    static int[] pushBothLaps(int[] nums) {
        int n = nums.length; int[] ans = new int[n]; Arrays.fill(ans, -1); Deque<Integer> w = new ArrayDeque<>();
        for (int i = 0; i < 2 * n; i++) { while (!w.isEmpty() && nums[i % n] > nums[w.peek()]) ans[w.pop()] = nums[i % n]; w.push(i % n); }
        return ans;
    }
    static int histogramStrict(int[] h) {
        int n = h.length, best = 0; Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i <= n; i++) {
            int cur = i == n ? 0 : h[i];
            while (!st.isEmpty() && h[st.peek()] > cur) { int ht = h[st.pop()]; int left = st.isEmpty() ? -1 : st.peek(); best = Math.max(best, ht * (i - left - 1)); }
            st.push(i);
        }
        return best;
    }
    static int histogramTwoPass(int[] h) {
        int n = h.length; int[] left = new int[n], right = new int[n]; Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < n; i++) { while (!st.isEmpty() && h[st.peek()] >= h[i]) st.pop(); left[i] = st.isEmpty() ? -1 : st.peek(); st.push(i); }
        st.clear();
        for (int i = n - 1; i >= 0; i--) { while (!st.isEmpty() && h[st.peek()] >= h[i]) st.pop(); right[i] = st.isEmpty() ? n : st.peek(); st.push(i); }
        int best = 0; for (int i = 0; i < n; i++) best = Math.max(best, h[i] * (right[i] - left[i] - 1));
        return best;
    }
    static int[] previousWarmer(int[] t) {
        int[] ans = new int[t.length]; Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < t.length; i++) { while (!st.isEmpty() && t[st.peek()] <= t[i]) st.pop(); ans[i] = st.isEmpty() ? -1 : st.peek(); st.push(i); }
        return ans;
    }
    static int[] lookLeftSmaller(int[] a) {
        int[] ans = new int[a.length]; Deque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < a.length; i++) { while (!st.isEmpty() && st.peek() >= a[i]) st.pop(); ans[i] = st.isEmpty() ? -1 : st.peek(); st.push(a[i]); }
        return ans;
    }

    // ---------- Re-creations of the lesson's "catch the bug" fragments ----------
    static class BuggyStrictLean {                      // uses < instead of <=
        Deque<Integer> values = new ArrayDeque<>(), mins = new ArrayDeque<>();
        void push(int x) { values.push(x); if (mins.isEmpty() || x < mins.peek()) mins.push(x); }
        void pop() { int removed = values.pop(); if (removed == mins.peek()) mins.pop(); }
        int getMin() { return mins.peek(); }
    }
    static class BuggyBoxedLean {                       // compares two Integer objects with ==
        Deque<Integer> values = new ArrayDeque<>(), mins = new ArrayDeque<>();
        void push(int x) { values.push(x); if (mins.isEmpty() || x <= mins.peek()) mins.push(x); }
        void pop() { if (values.pop() == mins.peek()) mins.pop(); }
        int getMin() { return mins.peek(); }
    }
    static int buggyRpnMinus(int a, int b) {
        Deque<Integer> st = new ArrayDeque<>(); st.push(a); st.push(b);
        return st.pop() - st.pop();
    }
    static int[] buggyOneLap(int[] nums) {
        int n = nums.length; int[] ans = new int[n]; Arrays.fill(ans, -1);
        Deque<Integer> waiting = new ArrayDeque<>();
        for (int i = 0; i < n; i++) { while (!waiting.isEmpty() && nums[i] > nums[waiting.peek()]) ans[waiting.pop()] = nums[i]; waiting.push(i); }
        return ans;
    }
    static int buggyFleetGe(int target, int[] position, int[] speed) {
        Integer[] order = new Integer[position.length];
        for (int i = 0; i < order.length; i++) order[i] = i;
        Arrays.sort(order, (a, b) -> Integer.compare(position[b], position[a]));
        int fleets = 0; double ahead = 0;
        for (int car : order) { double time = (double) (target - position[car]) / speed[car]; if (time >= ahead) { fleets++; ahead = time; } }
        return fleets;
    }
    static int buggyNoSentinel(int[] heights) {
        int best = 0; Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < heights.length; i++) {
            while (!stack.isEmpty() && heights[stack.peek()] >= heights[i]) {
                int h = heights[stack.pop()]; int left = stack.isEmpty() ? -1 : stack.peek(); best = Math.max(best, h * (i - left - 1));
            }
            stack.push(i);
        }
        return best;
    }
    static int contribution(int[] a, boolean strictLeft, boolean strictRight) {
        int n = a.length; long total = 0;
        for (int m = 0; m < n; m++) {
            int l = m - 1; while (l >= 0 && (strictLeft ? a[l] >= a[m] : a[l] > a[m])) l--;
            int r = m + 1; while (r < n && (strictRight ? a[r] >= a[m] : a[r] > a[m])) r++;
            total += (long) a[m] * (m - l) * (r - m);
        }
        return (int) total;
    }
    // "strict" here means the boundary is the nearest STRICTLY smaller element, so equal elements are spanned.
    static int buggyBothStrict(int[] a) { return contribution(a, true, true); }
    static int buggyBothLoose(int[] a) { return contribution(a, false, false); }
}
