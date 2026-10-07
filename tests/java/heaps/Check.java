import java.util.*;

// Runs every Java solution shown in heaps.mdx against independent oracles (sorting, brute-force
// search, or plain simulation) on hand-picked edge cases plus thousands of random small inputs.
// It also proves that each "catch the bug" version fails on the input the lesson names.
public class Check {
    static final Random R = new Random(8);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean condition, String what) { eq(true, condition, what); }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        if (o instanceof double[] a) return Arrays.toString(a);
        if (o instanceof int[][] a) return Arrays.deepToString(a);
        return String.valueOf(o);
    }
    static int[] randArr(int minLen, int maxLen, int lo, int hi) {
        int[] a = new int[minLen + R.nextInt(maxLen - minLen + 1)];
        for (int i = 0; i < a.length; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static int[] sorted(int[] a) { int[] b = a.clone(); Arrays.sort(b); return b; }
    static int kthLargestBySorting(int[] a, int k) { return sorted(a)[a.length - k]; }
    static double medianBySorting(List<Integer> values) {
        List<Integer> s = new ArrayList<>(values);
        Collections.sort(s);
        int n = s.size();
        return n % 2 == 1 ? s.get(n / 2) : ((double) s.get(n / 2 - 1) + s.get(n / 2)) / 2.0;
    }
    static Map<Integer, Integer> freq(int[] a) {
        Map<Integer, Integer> f = new HashMap<>();
        for (int x : a) f.merge(x, 1, Integer::sum);
        return f;
    }

    public static void main(String[] args) {
        spellingsAndPitfalls();
        minHeap();
        kthLargest();
        topK();
        kClosest();
        medianFinder();
        slidingWindowMedian();
        mergeK();
        taskScheduler();
        kthLargestStream();
        lastStone();
        reorganize();
        ipo();
        smallestRange();
        matrixKth();
        quickselect();
        System.out.println("OK heaps: " + cases + " checks passed");
    }

    // ---------- Chapter 1: the three spellings, the overflow comparator, iteration order ----------
    static void spellingsAndPitfalls() {
        for (int t = 0; t < 500; t++) {
            B_spellings s = new B_spellings();
            int[] a = randArr(0, 10, -50, 50);
            if (t % 7 == 0 && a.length > 1) { a[0] = Integer.MIN_VALUE; a[1] = Integer.MAX_VALUE; }
            for (int i = 0; i < a.length; i++) { s.minHeap.offer(a[i]); s.maxHeap.offer(a[i]); s.bySecond.offer(new int[]{i, a[i]}); }
            int[] asc = sorted(a);
            for (int i = 0; i < a.length; i++) {
                eq(asc[i], s.minHeap.poll(), "minHeap order");
                eq(asc[a.length - 1 - i], s.maxHeap.poll(), "maxHeap order");
                eq(asc[i], s.bySecond.poll()[1], "bySecond order");
            }
        }
        // The subtraction comparator overflows: 2e9 - (-2e9) wraps to a negative number.
        PriorityQueue<int[]> buggy = new PriorityQueue<>((a, b) -> a[1] - b[1]);
        buggy.offer(new int[]{0, 2_000_000_000});
        buggy.offer(new int[]{1, -2_000_000_000});
        eq(2_000_000_000, buggy.peek()[1], "subtraction comparator puts 2e9 on top of a min-heap (the bug)");
        B_spellings fixed = new B_spellings();
        fixed.bySecond.offer(new int[]{0, 2_000_000_000});
        fixed.bySecond.offer(new int[]{1, -2_000_000_000});
        eq(-2_000_000_000, fixed.bySecond.peek()[1], "Integer.compare comparator");
        // Iterating a PriorityQueue does not visit values in sorted order.
        PriorityQueue<Integer> pq = new PriorityQueue<>();
        pq.offer(3); pq.offer(1); pq.offer(2);
        eq("[1, 3, 2]", pq.toString(), "PriorityQueue.toString shows array order");
    }

    // ---------- Chapter 1: MinHeap built by hand ----------
    static void minHeap() {
        B_minHeap outer = new B_minHeap();
        boolean threw = false;
        try { outer.new MinHeap().pop(); } catch (NoSuchElementException e) { threw = true; }
        ok(threw, "pop on empty heap throws");
        for (int t = 0; t < 3000; t++) {
            B_minHeap.MinHeap h = outer.new MinHeap();
            PriorityQueue<Integer> oracle = new PriorityQueue<>();
            int ops = R.nextInt(40);
            for (int o = 0; o < ops; o++) {
                if (oracle.isEmpty() || R.nextInt(3) > 0) {
                    int x = R.nextInt(21) - 10;
                    h.push(x); oracle.offer(x);
                } else eq(oracle.poll(), h.pop(), "MinHeap pop");
                eq(oracle.size(), h.size(), "MinHeap size");
                if (!oracle.isEmpty()) eq(oracle.peek(), h.peek(), "MinHeap peek");
            }
        }
        for (int t = 0; t < 2000; t++) {
            int[] a = randArr(0, 20, -9, 9);
            B_minHeap.MinHeap h = outer.new MinHeap();
            h.buildFrom(a);
            int[] out = new int[a.length];
            for (int i = 0; i < a.length; i++) out[i] = h.pop();
            eq(sorted(a), out, "buildFrom then pop all = sorted");
        }
        // The lesson's figure: [1, 2, 3, 4, 5, 6, 7] and its pop.
        B_minHeap.MinHeap fig = outer.new MinHeap();
        for (int v : new int[]{1, 2, 3, 4, 5, 6, 7}) fig.push(v);
        eq(1, fig.pop(), "figure pop");
        eq(2, fig.peek(), "figure new root");
        // Catch the bug: sinking toward the LEFT child only. Heap [1, 4, 2, 5, 6, 3]; after pop the
        // next minimum must be 2, but the left-only version leaves 3 on top.
        int[] heap = {1, 4, 2, 5, 6, 3};
        eq(3, leftOnlyPopThenPeek(heap.clone()), "left-only sift-down leaves 3 on top (the bug)");
        B_minHeap.MinHeap good = outer.new MinHeap();
        good.buildFrom(heap);
        eq(1, good.pop(), "correct pop");
        eq(2, good.peek(), "correct sift-down puts 2 on top");
    }
    static int leftOnlyPopThenPeek(int[] a) {
        int size = a.length;
        a[0] = a[--size];
        int i = 0;
        while (2 * i + 1 < size && a[2 * i + 1] < a[i]) { int c = 2 * i + 1; int t = a[i]; a[i] = a[c]; a[c] = t; i = c; }
        return a[0];
    }

    // ---------- Chapter 2: Kth largest ----------
    static void kthLargest() {
        B_findKthLargest s = new B_findKthLargest();
        eq(5, s.findKthLargest(new int[]{3, 2, 1, 5, 6, 4}, 2), "LC example 1");
        eq(4, s.findKthLargest(new int[]{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4), "LC example 2");
        eq(7, s.findKthLargest(new int[]{7}, 1), "single");
        eq(5, s.findKthLargest(new int[]{5, 5, 5}, 2), "all equal");
        eq(Integer.MIN_VALUE, s.findKthLargest(new int[]{Integer.MAX_VALUE, Integer.MIN_VALUE}, 2), "extremes");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 12, -6, 6);
            int k = 1 + R.nextInt(a.length);
            eq(kthLargestBySorting(a, k), s.findKthLargest(a.clone(), k), "findKthLargest " + Arrays.toString(a) + " k=" + k);
        }
        // Catch the bug: a MAX-heap trimmed to k keeps the k SMALLEST; on the lesson input it says 2, not 5.
        PriorityQueue<Integer> wrong = new PriorityQueue<>(Comparator.reverseOrder());
        for (int x : new int[]{3, 2, 1, 5, 6, 4}) { wrong.offer(x); if (wrong.size() > 2) wrong.poll(); }
        eq(2, wrong.peek(), "max-heap version returns the 2nd smallest (the bug)");
    }

    // ---------- Chapter 3: Top K frequent (heap and buckets) ----------
    static void topK() {
        B_topKFrequent h = new B_topKFrequent();
        B_topKFrequentBuckets b = new B_topKFrequentBuckets();
        eq(new int[]{1, 2}, sorted(h.topKFrequent(new int[]{1, 1, 1, 2, 2, 3}, 2)), "LC example");
        eq(new int[]{1}, h.topKFrequent(new int[]{1}, 1), "single");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 14, -4, 4);
            Map<Integer, Integer> f = freq(a);
            int k = 1 + R.nextInt(f.size());
            checkTopK(a, k, f, h.topKFrequent(a.clone(), k), "heap");
            checkTopK(a, k, f, b.topKFrequentBuckets(a.clone(), k), "buckets");
        }
        // Catch the bug: ordering the heap by VALUE instead of by COUNT keeps the two largest values.
        PriorityQueue<Integer> wrong = new PriorityQueue<>();
        for (int v : new int[]{1, 2, 3}) { wrong.offer(v); if (wrong.size() > 2) wrong.poll(); }
        eq(new int[]{2, 3}, sorted(wrong.stream().mapToInt(Integer::intValue).toArray()), "heap by value keeps {2, 3} (the bug)");
    }
    static void checkTopK(int[] a, int k, Map<Integer, Integer> f, int[] got, String which) {
        eq(k, got.length, which + " size");
        Set<Integer> chosen = new HashSet<>();
        for (int v : got) { ok(f.containsKey(v), which + " value from input"); ok(chosen.add(v), which + " distinct"); }
        int minChosen = Integer.MAX_VALUE, maxOther = 0;
        for (int v : chosen) minChosen = Math.min(minChosen, f.get(v));
        for (Map.Entry<Integer, Integer> e : f.entrySet()) if (!chosen.contains(e.getKey())) maxOther = Math.max(maxOther, e.getValue());
        ok(minChosen >= maxOther, which + " every chosen value is at least as frequent as every other " + Arrays.toString(a));
    }

    // ---------- Chapter 4: K closest points ----------
    static void kClosest() {
        B_kClosest s = new B_kClosest();
        eq(new int[][]{{-2, 2}}, s.kClosest(new int[][]{{1, 3}, {-2, 2}}, 1), "LC example 1");
        for (int t = 0; t < 3000; t++) {
            int n = 1 + R.nextInt(9);
            int span = t % 5 == 0 ? 50000 : 4;   // 50000² + 50000² overflows int, not long
            int[][] pts = new int[n][];
            for (int i = 0; i < n; i++) pts[i] = new int[]{R.nextInt(2 * span + 1) - span, R.nextInt(2 * span + 1) - span};
            int k = 1 + R.nextInt(n);
            int[][] got = s.kClosest(pts, k);
            eq(k, got.length, "kClosest size");
            // got must be a sub-multiset of pts (by identity), and nothing left out may be closer.
            Set<int[]> used = Collections.newSetFromMap(new IdentityHashMap<>());
            for (int[] p : got) { ok(Arrays.stream(pts).anyMatch(q -> q == p), "kClosest returns input points"); ok(used.add(p), "kClosest distinct"); }
            long worstIn = -1, bestOut = Long.MAX_VALUE;
            for (int[] p : pts) {
                long d = (long) p[0] * p[0] + (long) p[1] * p[1];
                if (used.contains(p)) worstIn = Math.max(worstIn, d); else bestOut = Math.min(bestOut, d);
            }
            ok(worstIn <= bestOut, "kClosest keeps the nearest");
        }
        // Catch the bug: a MIN-heap trimmed to k keeps the k FARTHEST points.
        PriorityQueue<int[]> wrong = new PriorityQueue<>((a, b) -> Integer.compare(a[0] * a[0] + a[1] * a[1], b[0] * b[0] + b[1] * b[1]));
        for (int[] p : new int[][]{{1, 3}, {-2, 2}}) { wrong.offer(p); if (wrong.size() > 1) wrong.poll(); }
        eq(new int[]{1, 3}, wrong.peek(), "min-heap version keeps the farthest point (the bug)");
    }

    // ---------- Chapter 5: Find median from data stream ----------
    static void medianFinder() {
        B_medianFinder outer = new B_medianFinder();
        B_medianFinder.MedianFinder m = outer.new MedianFinder();
        m.addNum(1); m.addNum(2); eq(1.5, m.findMedian(), "LC example");
        m.addNum(3); eq(2.0, m.findMedian(), "LC example");
        B_medianFinder.MedianFinder big = outer.new MedianFinder();
        big.addNum(Integer.MAX_VALUE); big.addNum(Integer.MAX_VALUE);
        eq(2147483647.0, big.findMedian(), "no overflow when averaging");
        for (int t = 0; t < 3000; t++) {
            B_medianFinder.MedianFinder f = outer.new MedianFinder();
            List<Integer> seen = new ArrayList<>();
            int ops = 1 + R.nextInt(30);
            boolean wide = t % 10 == 0;
            for (int o = 0; o < ops; o++) {
                int x = wide ? (R.nextBoolean() ? Integer.MAX_VALUE - R.nextInt(3) : Integer.MIN_VALUE + R.nextInt(3)) : R.nextInt(13) - 6;
                f.addNum(x); seen.add(x);
                if (R.nextInt(2) == 0 || o == ops - 1) eq(medianBySorting(seen), f.findMedian(), "median after " + seen);
            }
        }
        // Catch the bug 1: rebalance with >= on [1, 2] says 2.0, not 1.5.
        eq(2.0, buggyGreaterEqualMedian(new int[]{1, 2}), "rebalance with >= (the bug)");
        // Catch the bug 2: adding two Integers before dividing overflows.
        int a = Integer.MAX_VALUE, b = Integer.MAX_VALUE;
        eq(-1.0, (a + b) / 2.0, "int addition overflows before the division (the bug)");
    }
    static double buggyGreaterEqualMedian(int[] values) {
        PriorityQueue<Integer> low = new PriorityQueue<>(Comparator.reverseOrder()), high = new PriorityQueue<>();
        for (int v : values) {
            low.offer(v); high.offer(low.poll());
            if (high.size() >= low.size()) low.offer(high.poll());
        }
        return low.size() > high.size() ? low.peek() : ((double) low.peek() + high.peek()) / 2.0;
    }

    // ---------- Chapter 6: Sliding window median (lazy heaps and TreeSets) ----------
    static void slidingWindowMedian() {
        B_medianSlidingWindow lazy = new B_medianSlidingWindow();
        B_medianSlidingWindowTree tree = new B_medianSlidingWindowTree();
        double[] lc = {1, -1, -1, 3, 5, 6};
        eq(lc, lazy.medianSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3), "LC example (lazy)");
        eq(lc, tree.medianSlidingWindowTree(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3), "LC example (tree)");
        double[] lc2 = {2, 3, 3, 3, 2, 3, 2};
        eq(lc2, lazy.medianSlidingWindow(new int[]{1, 2, 3, 4, 2, 3, 1, 4, 2}, 3), "LC example 2 (lazy)");
        eq(new double[]{2147483647.0}, lazy.medianSlidingWindow(new int[]{2147483647, 2147483647}, 2), "overflow case (lazy)");
        eq(new double[]{2147483647.0}, tree.medianSlidingWindowTree(new int[]{2147483647, 2147483647}, 2), "overflow case (tree)");
        for (int t = 0; t < 4000; t++) {
            boolean wide = t % 10 == 0;
            int[] a = wide ? randArr(1, 12, Integer.MIN_VALUE, Integer.MIN_VALUE + 3) : randArr(1, 14, -3, 3);
            if (wide) for (int i = 0; i < a.length; i++) if (R.nextBoolean()) a[i] = Integer.MAX_VALUE - R.nextInt(3);
            int k = 1 + R.nextInt(a.length);
            double[] expect = new double[a.length - k + 1];
            for (int s = 0; s + k <= a.length; s++) {
                List<Integer> w = new ArrayList<>();
                for (int i = s; i < s + k; i++) w.add(a[i]);
                expect[s] = medianBySorting(w);
            }
            eq(expect, lazy.medianSlidingWindow(a.clone(), k), "lazy " + Arrays.toString(a) + " k=" + k);
            eq(expect, tree.medianSlidingWindowTree(a.clone(), k), "tree " + Arrays.toString(a) + " k=" + k);
        }
        // Catch the bug: rebalancing by heap.size() (dead entries included) instead of live counts.
        int[] trap = {3, 5, 6, 1};
        eq(new double[]{5.0, 5.0}, lazy.medianSlidingWindow(trap, 3), "correct medians on the trap input");
        eq(new double[]{5.0, 1.0}, physicalSizeWindow(trap, 3), "physical-size rebalancing says 1 for [5, 6, 1] (the bug)");
    }
    // Same as the lesson's lazy version, except step 3 compares heap.size() instead of live counts.
    static double[] physicalSizeWindow(int[] nums, int k) {
        Comparator<Integer> order = (a, b) -> nums[a] != nums[b] ? Integer.compare(nums[a], nums[b]) : Integer.compare(a, b);
        PriorityQueue<Integer> low = new PriorityQueue<>(order.reversed()), high = new PriorityQueue<>(order);
        double[] result = new double[nums.length - k + 1];
        for (int i = 0; i < nums.length; i++) {
            if (low.isEmpty() || order.compare(i, low.peek()) < 0) low.offer(i); else high.offer(i);
            int start = i - k + 1;
            pruneTop(low, start); pruneTop(high, start);
            if (low.size() > high.size() + 1) { high.offer(low.poll()); pruneTop(low, start); }
            else if (high.size() > low.size()) { low.offer(high.poll()); pruneTop(high, start); }
            if (start >= 0) result[start] = k % 2 == 1 ? nums[low.peek()] : ((double) nums[low.peek()] + nums[high.peek()]) / 2.0;
        }
        return result;
    }
    static void pruneTop(PriorityQueue<Integer> heap, int start) { while (!heap.isEmpty() && heap.peek() < start) heap.poll(); }

    // ---------- Chapter 7: Merge K sorted lists ----------
    static ListNode build(int[] a) { ListNode d = new ListNode(0), t = d; for (int v : a) { t.next = new ListNode(v); t = t.next; } return d.next; }
    static List<Integer> toList(ListNode n) { List<Integer> out = new ArrayList<>(); for (; n != null; n = n.next) out.add(n.val); return out; }
    static void mergeK() {
        B_mergeKLists s = new B_mergeKLists();
        eq(List.of(), toList(s.mergeKLists(new ListNode[0])), "no lists");
        eq(List.of(), toList(s.mergeKLists(new ListNode[]{null, null})), "only empty lists");
        eq(List.of(1, 1, 2, 3, 4, 4, 5, 6), toList(s.mergeKLists(new ListNode[]{build(new int[]{1, 4, 5}), build(new int[]{1, 3, 4}), build(new int[]{2, 6})})), "LC example");
        for (int t = 0; t < 3000; t++) {
            int k = R.nextInt(6);
            ListNode[] lists = new ListNode[k];
            List<Integer> all = new ArrayList<>();
            for (int i = 0; i < k; i++) {
                int[] a = sorted(randArr(0, 5, t % 9 == 0 ? Integer.MIN_VALUE : -5, t % 9 == 0 ? Integer.MIN_VALUE + 4 : 5));
                if (t % 9 == 0) for (int j = 0; j < a.length; j++) if (R.nextBoolean()) a[j] = Integer.MAX_VALUE;
                Arrays.sort(a);
                lists[i] = build(a);
                for (int v : a) all.add(v);
            }
            Collections.sort(all);
            eq(all, toList(s.mergeKLists(lists)), "mergeKLists");
        }
    }

    // ---------- Chapter 8: Task scheduler (heap simulation and formula) vs exhaustive search ----------
    static void taskScheduler() {
        B_leastInterval heap = new B_leastInterval();
        B_leastIntervalFormula formula = new B_leastIntervalFormula();
        String[][] examples = {{"AAABBB", "2", "8"}, {"AAABBB", "0", "6"}, {"AAAAAABCDEFG", "2", "16"}, {"ACABDB", "1", "6"}, {"AAABBB", "3", "10"}, {"A", "5", "1"}, {"AA", "1", "3"}};
        for (String[] ex : examples) {
            int n = Integer.parseInt(ex[1]), expect = Integer.parseInt(ex[2]);
            eq(expect, heap.leastInterval(ex[0].toCharArray(), n), "heap " + ex[0] + " n=" + n);
            eq(expect, formula.leastIntervalFormula(ex[0].toCharArray(), n), "formula " + ex[0] + " n=" + n);
        }
        // Catch the bug: rest until time + n + 1 with the same "== time" check waits one unit too long.
        eq(4, offByOneScheduler("AA".toCharArray(), 1), "time + n + 1 says 4 for AA, n = 1 (the bug)");
        for (int t = 0; t < 2500; t++) {
            int types = 1 + R.nextInt(3);
            int[] counts = new int[types];
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < types; i++) { counts[i] = 1 + R.nextInt(3); for (int c = 0; c < counts[i]; c++) sb.append((char) ('A' + i)); }
            List<Character> shuffled = new ArrayList<>();
            for (char c : sb.toString().toCharArray()) shuffled.add(c);
            Collections.shuffle(shuffled, R);
            char[] tasks = new char[shuffled.size()];
            for (int i = 0; i < tasks.length; i++) tasks[i] = shuffled.get(i);
            int n = R.nextInt(4);
            int best = bruteSchedule(counts, new int[types], n, new HashMap<>());
            eq(best, heap.leastInterval(tasks.clone(), n), "heap vs brute " + new String(tasks) + " n=" + n);
            eq(best, formula.leastIntervalFormula(tasks.clone(), n), "formula vs brute " + new String(tasks) + " n=" + n);
        }
    }
    // Fewest time units to finish: try every legal choice (run an available task, or idle while something rests).
    static int bruteSchedule(int[] counts, int[] wait, int n, Map<String, Integer> memo) {
        boolean anyLeft = false, anyWaiting = false;
        for (int i = 0; i < counts.length; i++) { if (counts[i] > 0) anyLeft = true; if (wait[i] > 0) anyWaiting = true; }
        if (!anyLeft) return 0;
        String key = Arrays.toString(counts) + Arrays.toString(wait);
        Integer cached = memo.get(key);
        if (cached != null) return cached;
        int best = Integer.MAX_VALUE;
        for (int run = -1; run < counts.length; run++) {
            if (run == -1 && !anyWaiting) continue;               // idling with nothing resting never helps
            if (run >= 0 && (counts[run] == 0 || wait[run] > 0)) continue;
            int[] c2 = counts.clone(), w2 = wait.clone();
            for (int i = 0; i < w2.length; i++) if (w2[i] > 0) w2[i]--;
            if (run >= 0) { c2[run]--; w2[run] = n; }
            best = Math.min(best, 1 + bruteSchedule(c2, w2, n, memo));
        }
        memo.put(key, best);
        return best;
    }
    static int offByOneScheduler(char[] tasks, int n) {
        int[] count = new int[26];
        for (char t : tasks) count[t - 'A']++;
        PriorityQueue<Integer> ready = new PriorityQueue<>(Comparator.reverseOrder());
        for (int c : count) if (c > 0) ready.offer(c);
        Deque<int[]> cooling = new ArrayDeque<>();
        int time = 0;
        while (!ready.isEmpty() || !cooling.isEmpty()) {
            time++;
            if (!ready.isEmpty()) { int left = ready.poll() - 1; if (left > 0) cooling.offer(new int[]{left, time + n + 1}); }
            if (!cooling.isEmpty() && cooling.peek()[1] == time) ready.offer(cooling.poll()[0]);
        }
        return time;
    }

    // ---------- Side quest: Kth largest in a stream ----------
    static void kthLargestStream() {
        B_kthLargestStream outer = new B_kthLargestStream();
        B_kthLargestStream.KthLargest lc = outer.new KthLargest(3, new int[]{4, 5, 8, 2});
        int[] adds = {3, 5, 10, 9, 4}, expect = {4, 5, 5, 8, 8};
        for (int i = 0; i < adds.length; i++) eq(expect[i], lc.add(adds[i]), "LC stream example");
        for (int t = 0; t < 2500; t++) {
            int k = 1 + R.nextInt(4);
            int[] init = randArr(Math.max(0, k - 1), k + 4, -5, 5);
            B_kthLargestStream.KthLargest s = outer.new KthLargest(k, init.clone());
            List<Integer> all = new ArrayList<>();
            for (int v : init) all.add(v);
            int adds2 = 1 + R.nextInt(8);
            for (int a = 0; a < adds2; a++) {
                int v = R.nextInt(11) - 5;
                all.add(v);
                List<Integer> s2 = new ArrayList<>(all);
                Collections.sort(s2);
                eq(s2.get(s2.size() - k), s.add(v), "stream kth");
            }
        }
    }

    // ---------- Side quest: Last stone weight ----------
    static void lastStone() {
        B_lastStoneWeight s = new B_lastStoneWeight();
        eq(1, s.lastStoneWeight(new int[]{2, 7, 4, 1, 8, 1}), "LC example");
        eq(0, s.lastStoneWeight(new int[]{3, 3}), "equal pair");
        eq(5, s.lastStoneWeight(new int[]{5}), "single");
        for (int t = 0; t < 3000; t++) {
            int[] a = randArr(1, 9, 1, 9);
            List<Integer> pile = new ArrayList<>();
            for (int v : a) pile.add(v);
            while (pile.size() > 1) {
                Collections.sort(pile);
                int y = pile.remove(pile.size() - 1), x = pile.remove(pile.size() - 1);
                if (y != x) pile.add(y - x);
            }
            eq(pile.isEmpty() ? 0 : pile.get(0), s.lastStoneWeight(a.clone()), "lastStoneWeight " + Arrays.toString(a));
        }
    }

    // ---------- Side quest: Reorganize string ----------
    static void reorganize() {
        B_reorganizeString s = new B_reorganizeString();
        for (String str : new String[]{"aab", "aaab", "a", "aa", "ab", "vvvlo", "aaabbbccc"}) checkReorganize(s, str);
        for (int t = 0; t < 3000; t++) {
            int n = 1 + R.nextInt(8);
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < n; i++) sb.append((char) ('a' + R.nextInt(1 + R.nextInt(3))));
            checkReorganize(s, sb.toString());
        }
    }
    static void checkReorganize(B_reorganizeString s, String str) {
        int[] count = new int[26];
        for (char c : str.toCharArray()) count[c - 'a']++;
        boolean possible = existsArrangement(count, -1, str.length());
        String got = s.reorganizeString(str);
        if (!possible) { eq("", got, "reorganize impossible " + str); return; }
        eq(str.length(), got.length(), "reorganize length " + str);
        int[] c2 = new int[26];
        for (char c : got.toCharArray()) c2[c - 'a']++;
        eq(count, c2, "reorganize is a permutation of " + str);
        for (int i = 1; i < got.length(); i++) ok(got.charAt(i) != got.charAt(i - 1), "no adjacent repeats in " + got);
    }
    static boolean existsArrangement(int[] count, int prev, int left) {
        if (left == 0) return true;
        for (int c = 0; c < 26; c++) {
            if (c == prev || count[c] == 0) continue;
            count[c]--;
            boolean ok = existsArrangement(count, c, left - 1);
            count[c]++;
            if (ok) return true;
        }
        return false;
    }

    // ---------- Side quest: IPO ----------
    static void ipo() {
        B_findMaximizedCapital s = new B_findMaximizedCapital();
        eq(4, s.findMaximizedCapital(2, 0, new int[]{1, 2, 3}, new int[]{0, 1, 1}), "LC example 1");
        eq(6, s.findMaximizedCapital(3, 0, new int[]{1, 2, 3}, new int[]{0, 1, 2}), "LC example 2");
        eq(0, s.findMaximizedCapital(1, 0, new int[]{1}, new int[]{1}), "nothing affordable");
        for (int t = 0; t < 3000; t++) {
            int n = 1 + R.nextInt(6);
            int[] profits = randArr(n, n, 0, 5), capital = randArr(n, n, 0, 8);
            int k = 1 + R.nextInt(4), w = R.nextInt(5);
            eq(bruteIpo(k, w, profits, capital, new boolean[n]), s.findMaximizedCapital(k, w, profits.clone(), capital.clone()), "ipo");
        }
    }
    static int bruteIpo(int k, int w, int[] profits, int[] capital, boolean[] used) {
        int best = w;
        if (k == 0) return best;
        for (int i = 0; i < profits.length; i++) {
            if (used[i] || capital[i] > w) continue;
            used[i] = true;
            best = Math.max(best, bruteIpo(k - 1, w + profits[i], profits, capital, used));
            used[i] = false;
        }
        return best;
    }

    // ---------- Side quest: Smallest range covering K lists ----------
    static void smallestRange() {
        B_smallestRange s = new B_smallestRange();
        List<List<Integer>> lc = List.of(List.of(4, 10, 15, 24, 26), List.of(0, 9, 12, 20), List.of(5, 18, 22, 30));
        eq(new int[]{20, 24}, s.smallestRange(lc), "LC example");
        eq(new int[]{1, 1}, s.smallestRange(List.of(List.of(1, 2, 3), List.of(1, 2, 3), List.of(1, 2, 3))), "LC example 2");
        eq(new int[]{Integer.MIN_VALUE, Integer.MAX_VALUE}, s.smallestRange(List.of(List.of(Integer.MIN_VALUE), List.of(Integer.MAX_VALUE))), "full-width range");
        for (int t = 0; t < 3000; t++) {
            int k = 1 + R.nextInt(4);
            List<List<Integer>> lists = new ArrayList<>();
            TreeSet<Integer> values = new TreeSet<>();
            for (int i = 0; i < k; i++) {
                int[] a = sorted(randArr(1, 4, -6, 6));
                List<Integer> l = new ArrayList<>();
                for (int v : a) { l.add(v); values.add(v); }
                lists.add(l);
            }
            int[] best = null;
            for (int lo : values) for (int hi : values) {
                if (hi < lo) continue;
                boolean covers = true;
                for (List<Integer> l : lists) { boolean hit = false; for (int v : l) if (v >= lo && v <= hi) hit = true; covers &= hit; }
                if (!covers) continue;
                if (best == null || hi - lo < best[1] - best[0] || (hi - lo == best[1] - best[0] && lo < best[0])) best = new int[]{lo, hi};
            }
            eq(best, s.smallestRange(lists), "smallestRange " + lists);
        }
    }

    // ---------- Side quest: Kth smallest in a sorted matrix ----------
    static void matrixKth() {
        B_kthSmallest s = new B_kthSmallest();
        eq(13, s.kthSmallest(new int[][]{{1, 5, 9}, {10, 11, 13}, {12, 13, 15}}, 8), "LC example");
        eq(-5, s.kthSmallest(new int[][]{{-5}}, 1), "1x1");
        for (int t = 0; t < 3000; t++) {
            int n = 1 + R.nextInt(5);
            int[][] m = new int[n][n];
            for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) {
                int base = Math.max(i > 0 ? m[i - 1][j] : -6, j > 0 ? m[i][j - 1] : -6);
                m[i][j] = base + R.nextInt(3);
            }
            int[] flat = Arrays.stream(m).flatMapToInt(Arrays::stream).sorted().toArray();
            int k = 1 + R.nextInt(n * n);
            eq(flat[k - 1], s.kthSmallest(m, k), "kthSmallest " + Arrays.deepToString(m) + " k=" + k);
        }
    }

    // ---------- Choose the tool: quickselect ----------
    static void quickselect() {
        B_quickselect s = new B_quickselect();
        eq(5, s.findKthLargestQuick(new int[]{3, 2, 1, 5, 6, 4}, 2), "LC example 1");
        eq(4, s.findKthLargestQuick(new int[]{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4), "LC example 2");
        eq(1, s.findKthLargestQuick(new int[]{1, 1, 1, 1}, 3), "all equal");
        for (int t = 0; t < 4000; t++) {
            int[] a = randArr(1, 15, -5, 5);
            int k = 1 + R.nextInt(a.length);
            eq(kthLargestBySorting(a, k), s.findKthLargestQuick(a.clone(), k), "quickselect " + Arrays.toString(a) + " k=" + k);
        }
    }
}
