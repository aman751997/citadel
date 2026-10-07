import java.util.*;

// Runs every Java solution shown in intervals.mdx against independent brute-force oracles on
// hand-picked edge cases plus thousands of random small inputs. Any mismatch throws.
// Also demonstrates that each "catch the bug" version fails on the input the lesson names.
public class Check {
    static final Random R = new Random(4);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static String show(Object o) {
        if (o instanceof int[][] a) return Arrays.deepToString(a);
        if (o instanceof int[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }
    static int[][] copy(int[][] a) { int[][] b = new int[a.length][]; for (int i = 0; i < a.length; i++) b[i] = a[i].clone(); return b; }
    // n random intervals [s, s + len] with s in [0, span) and len in [minLen, maxLen].
    static int[][] rand(int maxN, int span, int minLen, int maxLen) {
        int n = R.nextInt(maxN + 1);
        int[][] a = new int[n][];
        for (int i = 0; i < n; i++) { int s = R.nextInt(span); a[i] = new int[]{s, s + minLen + R.nextInt(maxLen - minLen + 1)}; }
        return a;
    }
    // Sorted closed intervals with at least one free unit between neighbours (pairwise disjoint).
    static int[][] disjoint(int maxN, int maxLen) {
        int n = R.nextInt(maxN + 1); int[][] a = new int[n][]; int t = R.nextInt(3);
        for (int i = 0; i < n; i++) { int len = R.nextInt(maxLen + 1); a[i] = new int[]{t, t + len}; t += len + 1 + R.nextInt(3); }
        return a;
    }
    static int[][] sortByStart(int[][] a) { int[][] b = copy(a); Arrays.sort(b, (x, y) -> x[0] != y[0] ? Integer.compare(x[0], y[0]) : Integer.compare(x[1], y[1])); return b; }

    // ---- Oracles (written independently of the lesson's sweeps) ----
    // Closed-interval union by repeated pairwise merging until nothing changes.
    static int[][] unionOracle(int[][] in) {
        List<int[]> xs = new ArrayList<>(); for (int[] p : in) xs.add(p.clone());
        boolean changed = true;
        while (changed) {
            changed = false;
            outer:
            for (int i = 0; i < xs.size(); i++) for (int j = i + 1; j < xs.size(); j++) {
                int[] a = xs.get(i), b = xs.get(j);
                if (a[0] <= b[1] && b[0] <= a[1]) { xs.set(i, new int[]{Math.min(a[0], b[0]), Math.max(a[1], b[1])}); xs.remove(j); changed = true; break outer; }
            }
        }
        return sortByStart(xs.toArray(new int[0][]));
    }
    static boolean halfOpenClash(int[] a, int[] b) { return a[0] < b[1] && b[0] < a[1]; }
    // Most meetings running at once: check every integer instant t (meetings are [start, end)).
    static int peakOracle(int[][] in) {
        int best = 0;
        for (int t = -1; t <= 60; t++) { int c = 0; for (int[] m : in) if (m[0] <= t && t < m[1]) c++; best = Math.max(best, c); }
        return best;
    }
    // Largest subset with no two clashing ([start, end) semantics), by trying every subset.
    static int maxDisjointOracle(int[][] in) {
        int n = in.length, best = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            boolean ok = true;
            for (int i = 0; i < n && ok; i++) for (int j = i + 1; j < n && ok; j++)
                if ((mask >> i & 1) == 1 && (mask >> j & 1) == 1 && halfOpenClash(in[i], in[j])) ok = false;
            if (ok) best = Math.max(best, Integer.bitCount(mask));
        }
        return best;
    }
    // Fewest points stabbing every closed interval: try every set of integer points, smallest first.
    static int arrowsOracle(int[][] in) {
        if (in.length == 0) return 0;
        int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE;
        for (int[] p : in) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[1]); }
        int m = hi - lo + 1;
        for (int k = 1; k <= in.length; k++) if (stab(in, lo, m, 0, k, new ArrayList<>())) return k;
        throw new AssertionError("unreachable");
    }
    static boolean stab(int[][] in, int lo, int m, int from, int k, List<Integer> chosen) {
        if (chosen.size() == k) {
            for (int[] p : in) { boolean hit = false; for (int x : chosen) if (p[0] <= x && x <= p[1]) hit = true; if (!hit) return false; }
            return true;
        }
        for (int x = from; x < m; x++) { chosen.add(lo + x); if (stab(in, lo, m, x + 1, k, chosen)) return true; chosen.remove(chosen.size() - 1); }
        return false;
    }

    public static void main(String[] args) {
        // ---------- Merge Intervals ----------
        eq(new int[][]{{1, 6}, {8, 10}, {15, 18}}, new B_merge().merge(new int[][]{{1, 3}, {2, 6}, {8, 10}, {15, 18}}), "merge LC example 1 / lesson figure");
        eq(new int[][]{{1, 5}}, new B_merge().merge(new int[][]{{1, 4}, {4, 5}}), "merge touching");
        eq(new int[][]{{1, 10}}, new B_merge().merge(new int[][]{{1, 10}, {2, 3}, {4, 5}}), "merge swallowed");
        eq(new int[0][], new B_merge().merge(new int[0][]), "merge empty");
        eq(new int[][]{{3, 3}}, new B_merge().merge(new int[][]{{3, 3}, {3, 3}}), "merge duplicates, zero length");
        for (int t = 0; t < 3000; t++) {
            int[][] a = rand(7, 15, 0, 5);
            int[][] before = copy(a);
            eq(unionOracle(a), new B_merge().merge(a), "merge " + show(before));
        }
        // The two classic bugs, on the inputs the lesson names.
        eq(new int[][]{{1, 3}, {4, 5}}, mergeReplaceBug(new int[][]{{1, 10}, {2, 3}, {4, 5}}), "merge bug 1 really fails as described");
        eq(new int[][]{{1, 6}, {8, 10}}, mergeForgetLastBug(new int[][]{{1, 3}, {2, 6}, {8, 10}, {15, 18}}), "merge bug 2 really drops the last range");

        // ---------- Insert Interval ----------
        eq(new int[][]{{1, 2}, {3, 10}, {12, 16}}, new B_insert().insert(new int[][]{{1, 2}, {3, 5}, {6, 7}, {8, 10}, {12, 16}}, new int[]{4, 8}), "insert LC example 2 / figure / trace");
        eq(new int[][]{{1, 5}, {6, 9}}, new B_insert().insert(new int[][]{{1, 3}, {6, 9}}, new int[]{2, 5}), "insert LC example 1");
        eq(new int[][]{{5, 7}}, new B_insert().insert(new int[0][], new int[]{5, 7}), "insert empty ledger");
        eq(new int[][]{{1, 6}}, new B_insert().insert(new int[][]{{1, 4}}, new int[]{4, 6}), "insert touching joins");
        eq(new int[][]{{1, 4}, {4, 6}}, insertPhaseOneBug(new int[][]{{1, 4}}, new int[]{4, 6}), "insert bug really leaves touching ranges apart");
        for (int t = 0; t < 3000; t++) {
            int[][] ledger = unionOracle(rand(6, 20, 0, 4));
            int s = R.nextInt(24) - 2; int[] add = {s, s + R.nextInt(6)};
            int[][] all = Arrays.copyOf(copy(ledger), ledger.length + 1); all[ledger.length] = add.clone();
            eq(unionOracle(all), new B_insert().insert(copy(ledger), add.clone()), "insert " + show(ledger) + " + " + show(add));
        }

        // ---------- Meeting Rooms ----------
        eq(false, new B_canAttendMeetings().canAttendMeetings(new int[][]{{0, 30}, {5, 10}, {15, 20}}), "attend LC example 1");
        eq(true, new B_canAttendMeetings().canAttendMeetings(new int[][]{{7, 10}, {2, 4}}), "attend LC example 2");
        eq(true, new B_canAttendMeetings().canAttendMeetings(new int[][]{{1, 5}, {5, 8}}), "attend back-to-back");
        eq(true, new B_canAttendMeetings().canAttendMeetings(new int[0][]), "attend empty");
        for (int t = 0; t < 3000; t++) {
            int[][] a = rand(6, 20, 1, 6);
            boolean ok = true;
            for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) if (halfOpenClash(a[i], a[j])) ok = false;
            eq(ok, new B_canAttendMeetings().canAttendMeetings(copy(a)), "attend " + show(a));
        }

        // ---------- Meeting Rooms II (both methods) ----------
        int[][][] roomsFixed = {{{0, 30}, {5, 10}, {15, 20}}, {{7, 10}, {2, 4}}, {{0, 30}, {5, 10}, {10, 20}}, {{0, 5}, {1, 2}, {6, 7}}, {{2, 4}, {2, 4}, {2, 4}}, {}};
        int[] roomsExpect = {2, 1, 2, 2, 3, 0};
        for (int k = 0; k < roomsFixed.length; k++) {
            eq(roomsExpect[k], peakOracle(roomsFixed[k]), "rooms oracle sanity " + k);
            eq(roomsExpect[k], new B_minMeetingRooms().minMeetingRooms(copy(roomsFixed[k])), "rooms sweep " + show(roomsFixed[k]));
            eq(roomsExpect[k], new B_minMeetingRoomsHeap().minMeetingRoomsHeap(copy(roomsFixed[k])), "rooms heap " + show(roomsFixed[k]));
        }
        for (int t = 0; t < 4000; t++) {
            int[][] a = rand(7, 15, 1, 8);
            int peak = peakOracle(a);
            eq(peak, new B_minMeetingRooms().minMeetingRooms(copy(a)), "rooms sweep " + show(a));
            eq(peak, new B_minMeetingRoomsHeap().minMeetingRoomsHeap(copy(a)), "rooms heap " + show(a));
            // The heap's size never shrinks, so its final size is its maximum size: rooms ever opened.
            eq(peak, heapMaxSize(copy(a)), "heap max size equals final size " + show(a));
            // Rooms really suffice: replay the heap and assign concrete rooms; no room ever hosts two at once.
            assignRoomsValid(copy(a));
        }
        // Lesson claims about [[0,5],[1,2],[6,7]]: heap ends holding {5,7}; at time 6 only one meeting runs.
        eq(List.of(5, 7), heapContents(new int[][]{{0, 5}, {1, 2}, {6, 7}}), "heap contents at the end");
        eq(1, runningAt(new int[][]{{0, 5}, {1, 2}, {6, 7}}, 6), "meetings running at time 6");
        eq(1, heapWhileBug(new int[][]{{0, 5}, {1, 2}, {6, 7}}), "while + size() bug really returns 1");
        // Sorting events by time only (input order on ties) reports a phantom room on [[10,20],[0,10]].
        eq(2, sweepNoTieRule(new int[][]{{10, 20}, {0, 10}}), "no tie rule really overcounts");
        eq(1, new B_minMeetingRooms().minMeetingRooms(new int[][]{{10, 20}, {0, 10}}), "tie rule gives 1");

        // ---------- Non-overlapping Intervals ----------
        eq(1, new B_eraseOverlapIntervals().eraseOverlapIntervals(new int[][]{{1, 2}, {2, 3}, {3, 4}, {1, 3}}), "erase LC example 1");
        eq(2, new B_eraseOverlapIntervals().eraseOverlapIntervals(new int[][]{{1, 2}, {1, 2}, {1, 2}}), "erase LC example 2");
        eq(0, new B_eraseOverlapIntervals().eraseOverlapIntervals(new int[][]{{1, 2}, {2, 3}}), "erase touching");
        eq(1, new B_eraseOverlapIntervals().eraseOverlapIntervals(new int[][]{{1, 100}, {2, 3}, {4, 5}}), "erase counterexample");
        eq(1, new B_eraseOverlapIntervals().eraseOverlapIntervals(new int[][]{{1, 12}, {2, 4}, {5, 7}, {8, 11}}), "erase figure");
        eq(0, new B_eraseOverlapIntervals().eraseOverlapIntervals(new int[0][]), "erase empty");
        eq(2, startOrderSameRule(new int[][]{{1, 100}, {2, 3}, {4, 5}}), "start-order greedy really cancels 2");
        eq(3, startOrderSameRule(new int[][]{{1, 12}, {2, 4}, {5, 7}, {8, 11}}), "start-order greedy cancels 3 on the figure");
        eq(1, eraseStrictBug(new int[][]{{1, 2}, {2, 3}}), "strict > bug really cancels a touching booking");
        for (int t = 0; t < 3000; t++) {
            int[][] a = rand(8, 14, 1, 6);
            int best = a.length - maxDisjointOracle(a);
            eq(best, new B_eraseOverlapIntervals().eraseOverlapIntervals(copy(a)), "erase " + show(a));
            eq(best, startOrderMinEndRule(copy(a)), "start order with keep-the-earlier-end rule " + show(a));
        }

        // ---------- Arrows ----------
        eq(2, new B_findMinArrowShots().findMinArrowShots(new int[][]{{10, 16}, {2, 8}, {1, 6}, {7, 12}}), "arrows LC example 1 / figure");
        eq(4, new B_findMinArrowShots().findMinArrowShots(new int[][]{{1, 2}, {3, 4}, {5, 6}, {7, 8}}), "arrows LC example 2");
        eq(2, new B_findMinArrowShots().findMinArrowShots(new int[][]{{1, 2}, {2, 3}, {3, 4}, {4, 5}}), "arrows LC example 3");
        eq(1, new B_findMinArrowShots().findMinArrowShots(new int[][]{{1, 2}, {2, 3}}), "arrows touching share");
        int[][] extreme = {{-2147483646, -2147483645}, {2147483646, 2147483647}};
        eq(2, new B_findMinArrowShots().findMinArrowShots(copy(extreme)), "arrows extreme values");
        eq(1, arrowsSubtractionBug(copy(extreme)), "subtraction comparator really overflows to 1");
        for (int t = 0; t < 2000; t++) {
            int[][] a = rand(6, 12, 0, 5);
            eq(arrowsOracle(a), new B_findMinArrowShots().findMinArrowShots(copy(a)), "arrows " + show(a));
        }

        // ---------- Interval List Intersections ----------
        eq(new int[][]{{1, 2}, {5, 5}, {8, 10}, {15, 23}, {24, 24}, {25, 25}},
           new B_intervalIntersection().intervalIntersection(new int[][]{{0, 2}, {5, 10}, {13, 23}, {24, 25}}, new int[][]{{1, 5}, {8, 12}, {15, 24}, {25, 26}}), "intersections LC example / figure");
        eq(new int[0][], new B_intervalIntersection().intervalIntersection(new int[][]{{1, 3}, {5, 9}}, new int[0][]), "intersections one empty");
        for (int t = 0; t < 3000; t++) {
            int[][] a = disjoint(5, 4), b = disjoint(5, 4);
            List<int[]> all = new ArrayList<>();
            for (int[] x : a) for (int[] y : b) { int lo = Math.max(x[0], y[0]), hi = Math.min(x[1], y[1]); if (lo <= hi) all.add(new int[]{lo, hi}); }
            int[][] expect = sortByStart(all.toArray(new int[0][]));
            eq(expect, new B_intervalIntersection().intervalIntersection(a, b), "intersections " + show(a) + " " + show(b));
        }

        // ---------- Employee Free Time ----------
        eq(new int[][]{{3, 4}}, new B_employeeFreeTime().employeeFreeTime(new int[][][]{{{1, 2}, {5, 6}}, {{1, 3}}, {{4, 10}}}), "free time LC example 1 / figure");
        eq(new int[][]{{5, 6}, {7, 9}}, new B_employeeFreeTime().employeeFreeTime(new int[][][]{{{1, 3}, {6, 7}}, {{2, 4}}, {{2, 5}, {9, 12}}}), "free time LC example 2");
        eq(new int[0][], new B_employeeFreeTime().employeeFreeTime(new int[][][]{{{1, 3}}, {{3, 5}}}), "free time touching leaves no gap");
        eq(new int[0][], new B_employeeFreeTime().employeeFreeTime(new int[][][]{{}, {}}), "free time nobody works");
        for (int t = 0; t < 3000; t++) {
            int people = 1 + R.nextInt(3);
            int[][][] sched = new int[people][][];
            for (int p = 0; p < people; p++) { int[][] d = disjoint(3, 4); for (int[] q : d) if (q[0] == q[1]) q[1]++; sched[p] = unionOracle(d); }
            eq(freeOracle(sched), new B_employeeFreeTime().employeeFreeTime(sched), "free time " + Arrays.deepToString(sched));
        }

        // ---------- My Calendar I ----------
        B_myCalendar outer = new B_myCalendar();
        B_myCalendar.MyCalendar cal = outer.new MyCalendar();
        eq(true, cal.book(10, 20), "calendar 10-20"); eq(false, cal.book(15, 25), "calendar 15-25"); eq(true, cal.book(20, 30), "calendar 20-30");
        for (int t = 0; t < 2000; t++) {
            B_myCalendar.MyCalendar c = new B_myCalendar().new MyCalendar();
            List<int[]> taken = new ArrayList<>();
            int n = R.nextInt(10);
            for (int k = 0; k < n; k++) {
                int s = R.nextInt(20), e = s + 1 + R.nextInt(5);
                boolean ok = true; for (int[] b : taken) if (s < b[1] && b[0] < e) ok = false;
                if (ok) taken.add(new int[]{s, e});
                eq(ok, c.book(s, e), "calendar request " + s + "," + e);
            }
        }

        // ---------- Car Pooling ----------
        eq(false, new B_carPooling().carPooling(new int[][]{{2, 1, 5}, {3, 3, 7}}, 4), "car LC example 1");
        eq(true, new B_carPooling().carPooling(new int[][]{{2, 1, 5}, {3, 3, 7}}, 5), "car LC example 2");
        eq(true, new B_carPooling().carPooling(new int[][]{{2, 1, 5}, {3, 5, 7}}, 3), "car dropoff before pickup");
        for (int t = 0; t < 3000; t++) {
            int n = R.nextInt(6); int[][] trips = new int[n][];
            for (int k = 0; k < n; k++) { int from = R.nextInt(10); trips[k] = new int[]{1 + R.nextInt(5), from, from + 1 + R.nextInt(6)}; }
            int cap = 1 + R.nextInt(12), maxLoad = 0;
            for (int x = 0; x <= 20; x++) { int load = 0; for (int[] tr : trips) if (tr[1] <= x && x < tr[2]) load += tr[0]; maxLoad = Math.max(maxLoad, load); }
            eq(maxLoad <= cap, new B_carPooling().carPooling(copy(trips), cap), "car " + show(trips) + " cap " + cap);
        }

        // ---------- Remove Covered Intervals ----------
        eq(2, new B_removeCoveredIntervals().removeCoveredIntervals(new int[][]{{1, 4}, {3, 6}, {2, 8}}), "covered LC example 1");
        eq(1, new B_removeCoveredIntervals().removeCoveredIntervals(new int[][]{{1, 4}, {2, 3}}), "covered LC example 2");
        eq(1, new B_removeCoveredIntervals().removeCoveredIntervals(new int[][]{{1, 2}, {1, 4}}), "covered equal starts");
        eq(2, coveredAscendingTieBug(new int[][]{{1, 2}, {1, 4}}), "ascending tie-break really answers 2");
        for (int t = 0; t < 3000; t++) {
            Set<List<Integer>> seen = new HashSet<>(); List<int[]> xs = new ArrayList<>();
            int n = R.nextInt(7);
            while (xs.size() < n) { int s = R.nextInt(8); int[] p = {s, s + 1 + R.nextInt(6)}; if (seen.add(List.of(p[0], p[1]))) xs.add(p); }
            int[][] a = xs.toArray(new int[0][]);
            int remain = 0;
            for (int i = 0; i < a.length; i++) { boolean covered = false; for (int j = 0; j < a.length; j++) if (i != j && a[j][0] <= a[i][0] && a[i][1] <= a[j][1]) covered = true; if (!covered) remain++; }
            eq(remain, new B_removeCoveredIntervals().removeCoveredIntervals(copy(a)), "covered " + show(a));
        }

        // ---------- Maximum Profit in Job Scheduling (choose the tool) ----------
        eq(10, new B_jobScheduling().jobScheduling(new int[]{1, 2, 3}, new int[]{4, 3, 5}, new int[]{10, 1, 1}), "jobs banquet auction");
        eq(2, greedyByEndPay(new int[]{1, 2, 3}, new int[]{4, 3, 5}, new int[]{10, 1, 1}), "greedy by end really earns 2");
        eq(120, new B_jobScheduling().jobScheduling(new int[]{1, 2, 3, 3}, new int[]{3, 4, 5, 6}, new int[]{50, 10, 40, 70}), "jobs LC example 1");
        eq(150, new B_jobScheduling().jobScheduling(new int[]{1, 2, 3, 4, 6}, new int[]{3, 5, 10, 6, 9}, new int[]{20, 20, 100, 70, 60}), "jobs LC example 2");
        eq(6, new B_jobScheduling().jobScheduling(new int[]{1, 1, 1}, new int[]{2, 3, 4}, new int[]{5, 6, 4}), "jobs LC example 3");
        for (int t = 0; t < 3000; t++) {
            int n = R.nextInt(8); int[] s = new int[n], e = new int[n], p = new int[n];
            for (int k = 0; k < n; k++) { s[k] = R.nextInt(10); e[k] = s[k] + 1 + R.nextInt(5); p[k] = 1 + R.nextInt(20); }
            int best = 0;
            for (int mask = 0; mask < (1 << n); mask++) {
                boolean ok = true; int pay = 0;
                for (int i = 0; i < n && ok; i++) if ((mask >> i & 1) == 1) { pay += p[i]; for (int j = i + 1; j < n; j++) if ((mask >> j & 1) == 1 && s[i] < e[j] && s[j] < e[i]) ok = false; }
                if (ok) best = Math.max(best, pay);
            }
            eq(best, new B_jobScheduling().jobScheduling(s, e, p), "jobs " + Arrays.toString(s) + Arrays.toString(e) + Arrays.toString(p));
        }

        System.out.println("OK intervals: " + cases + " checks passed");
    }

    // ---- Helpers for lesson claims and the buggy versions it warns about ----
    static int[][] mergeReplaceBug(int[][] in) {
        Arrays.sort(in, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> out = new ArrayList<>(); int[] cur = in[0].clone();
        for (int i = 1; i < in.length; i++) { if (in[i][0] <= cur[1]) cur[1] = in[i][1]; else { out.add(cur); cur = in[i].clone(); } }
        out.add(cur); return out.toArray(new int[0][]);
    }
    static int[][] mergeForgetLastBug(int[][] in) {
        Arrays.sort(in, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> out = new ArrayList<>(); int[] cur = in[0].clone();
        for (int i = 1; i < in.length; i++) { if (in[i][0] <= cur[1]) cur[1] = Math.max(cur[1], in[i][1]); else { out.add(cur); cur = in[i].clone(); } }
        return out.toArray(new int[0][]);
    }
    static int[][] insertPhaseOneBug(int[][] in, int[] add) {
        List<int[]> out = new ArrayList<>(); int i = 0, s = add[0], e = add[1];
        while (i < in.length && in[i][1] <= s) out.add(in[i++]);
        while (i < in.length && in[i][0] <= e) { s = Math.min(s, in[i][0]); e = Math.max(e, in[i][1]); i++; }
        out.add(new int[]{s, e}); while (i < in.length) out.add(in[i++]);
        return out.toArray(new int[0][]);
    }
    static int heapMaxSize(int[][] in) {
        Arrays.sort(in, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> h = new PriorityQueue<>(); int max = 0, prev = 0;
        for (int[] m : in) {
            if (!h.isEmpty() && h.peek() <= m[0]) h.poll();
            h.offer(m[1]);
            if (h.size() < prev) throw new AssertionError("heap shrank");
            prev = h.size(); max = Math.max(max, h.size());
        }
        if (max != h.size()) throw new AssertionError("final size differs from max size");
        return h.size();
    }
    static void assignRoomsValid(int[][] in) {
        Arrays.sort(in, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<int[]> h = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));  // {freeAt, room}
        List<List<int[]>> rooms = new ArrayList<>();
        for (int[] m : in) {
            int room;
            if (!h.isEmpty() && h.peek()[0] <= m[0]) room = h.poll()[1];
            else { room = rooms.size(); rooms.add(new ArrayList<>()); }
            rooms.get(room).add(m); h.offer(new int[]{m[1], room});
        }
        for (List<int[]> r : rooms) for (int i = 0; i < r.size(); i++) for (int j = i + 1; j < r.size(); j++)
            if (halfOpenClash(r.get(i), r.get(j))) throw new AssertionError("room double-booked");
        cases++;
    }
    static List<Integer> heapContents(int[][] in) {
        Arrays.sort(in, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> h = new PriorityQueue<>();
        for (int[] m : in) { if (!h.isEmpty() && h.peek() <= m[0]) h.poll(); h.offer(m[1]); }
        List<Integer> out = new ArrayList<>(h); Collections.sort(out); return out;
    }
    static int runningAt(int[][] in, int t) { int c = 0; for (int[] m : in) if (m[0] <= t && t < m[1]) c++; return c; }
    static int heapWhileBug(int[][] in) {
        Arrays.sort(in, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> h = new PriorityQueue<>();
        for (int[] m : in) { while (!h.isEmpty() && h.peek() <= m[0]) h.poll(); h.offer(m[1]); }
        return h.size();
    }
    static int sweepNoTieRule(int[][] in) {
        List<int[]> ev = new ArrayList<>();
        for (int[] m : in) { ev.add(new int[]{m[0], 1}); ev.add(new int[]{m[1], -1}); }
        ev.sort((a, b) -> Integer.compare(a[0], b[0]));   // stable: equal times keep input order
        int c = 0, best = 0; for (int[] e : ev) { c += e[1]; best = Math.max(best, c); } return best;
    }
    static int startOrderSameRule(int[][] in) {
        int[][] a = sortByStart(in); int kept = 0; long last = Long.MIN_VALUE;
        for (int[] p : a) if (p[0] >= last) { kept++; last = p[1]; }
        return a.length - kept;
    }
    static int startOrderMinEndRule(int[][] in) {
        int[][] a = sortByStart(in); int cancelled = 0; long last = Long.MIN_VALUE;
        for (int[] p : a) { if (p[0] >= last) last = p[1]; else { cancelled++; last = Math.min(last, p[1]); } }
        return cancelled;
    }
    static int eraseStrictBug(int[][] in) {
        Arrays.sort(in, (a, b) -> Integer.compare(a[1], b[1])); int kept = 0; long last = Long.MIN_VALUE;
        for (int[] p : in) if (p[0] > last) { kept++; last = p[1]; }
        return in.length - kept;
    }
    static int arrowsSubtractionBug(int[][] pts) {
        Arrays.sort(pts, (a, b) -> a[1] - b[1]);
        int arrows = 1, at = pts[0][1];
        for (int i = 1; i < pts.length; i++) if (pts[i][0] > at) { arrows++; at = pts[i][1]; }
        return arrows;
    }
    static int coveredAscendingTieBug(int[][] in) {
        Arrays.sort(in, (a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
        int remain = 0; long far = Long.MIN_VALUE;
        for (int[] p : in) if (p[1] > far) { remain++; far = p[1]; }
        return remain;
    }
    static int greedyByEndPay(int[] s, int[] e, int[] p) {
        Integer[] o = new Integer[s.length]; for (int i = 0; i < o.length; i++) o[i] = i;
        Arrays.sort(o, (a, b) -> Integer.compare(e[a], e[b]));
        int pay = 0; long last = Long.MIN_VALUE;
        for (int i : o) if (s[i] >= last) { pay += p[i]; last = e[i]; }
        return pay;
    }
    // Free time by marking busy unit cells [t, t+1) on a small grid, then reading off empty runs
    // strictly between the first busy cell and the last.
    static int[][] freeOracle(int[][][] sched) {
        boolean[] busy = new boolean[64]; int first = Integer.MAX_VALUE, last = Integer.MIN_VALUE;
        for (int[][] person : sched) for (int[] q : person) { for (int t = q[0]; t < q[1]; t++) busy[t] = true; first = Math.min(first, q[0]); last = Math.max(last, q[1]); }
        List<int[]> out = new ArrayList<>();
        if (first == Integer.MAX_VALUE) return new int[0][];
        int t = first;
        while (t < last) {
            if (busy[t]) { t++; continue; }
            int s = t; while (t < last && !busy[t]) t++;
            out.add(new int[]{s, t});
        }
        return out.toArray(new int[0][]);
    }
}
