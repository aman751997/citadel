import java.util.*;

// Runs every Java solution shown in advanced-graphs.mdx against independent brute-force oracles:
// transitive closure (Floyd–Warshall on booleans) for cycles, label propagation for components,
// edge-removal checks for trees, Floyd–Warshall for shortest paths, exhaustive subsets for tiny MSTs,
// exhaustive walk enumeration for k-stop fares, permutation search for alien alphabets, threshold
// scans for minimum effort, and month-by-month simulation for parallel courses.
// It also proves that each "catch the bug" version named in the lesson fails on the input the lesson names.
public class Check {
    static final Random R = new Random(1212);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        if (o instanceof double[] a) return Arrays.toString(a);
        if (o instanceof int[][] a) return Arrays.deepToString(a);
        return String.valueOf(o);
    }
    static String s(int[][] a) { return Arrays.deepToString(a); }

    // ---------- generators ----------
    static int[][] randomPairs(int n, int maxM, boolean allowSelf) {
        List<int[]> all = new ArrayList<>();
        for (int a = 0; a < n; a++) for (int b = 0; b < n; b++) if (allowSelf || a != b) all.add(new int[]{a, b});
        Collections.shuffle(all, R);
        int m = Math.min(all.size(), R.nextInt(maxM + 1));
        return all.subList(0, m).toArray(new int[0][]);
    }
    static int[][] randomUndirected(int n, int maxM) {
        List<int[]> all = new ArrayList<>();
        for (int a = 0; a < n; a++) for (int b = a + 1; b < n; b++) all.add(R.nextBoolean() ? new int[]{a, b} : new int[]{b, a});
        Collections.shuffle(all, R);
        int m = Math.min(all.size(), R.nextInt(maxM + 1));
        return all.subList(0, m).toArray(new int[0][]);
    }
    static int[][] randomTree(int n, int offset) {      // n - 1 edges on nodes offset..offset+n-1, shuffled
        int[] perm = new int[n];
        for (int i = 0; i < n; i++) perm[i] = i;
        for (int i = n - 1; i > 0; i--) { int j = R.nextInt(i + 1); int t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
        List<int[]> edges = new ArrayList<>();
        for (int i = 1; i < n; i++) {
            int p = perm[R.nextInt(i)];
            edges.add(R.nextBoolean() ? new int[]{perm[i] + offset, p + offset} : new int[]{p + offset, perm[i] + offset});
        }
        Collections.shuffle(edges, R);
        return edges.toArray(new int[0][]);
    }

    // ---------- oracles ----------
    // reach[i][j]: a directed path of length >= 1 from i to j (Floyd–Warshall on booleans).
    static boolean[][] closure(int n, int[][] directed) {
        boolean[][] reach = new boolean[n][n];
        for (int[] e : directed) reach[e[0]][e[1]] = true;
        for (int k = 0; k < n; k++) for (int i = 0; i < n; i++) if (reach[i][k]) for (int j = 0; j < n; j++) if (reach[k][j]) reach[i][j] = true;
        return reach;
    }
    static int[][] prereqToTracks(int[][] prereq) {     // [a, b] means b before a: track b -> a
        int[][] t = new int[prereq.length][];
        for (int i = 0; i < prereq.length; i++) t[i] = new int[]{prereq[i][1], prereq[i][0]};
        return t;
    }
    static boolean directedCycle(int n, int[][] tracks) {
        boolean[][] r = closure(n, tracks);
        for (int i = 0; i < n; i++) if (r[i][i]) return true;
        return false;
    }
    static boolean validOrder(int n, int[][] prereq, int[] order) {
        if (order.length != n) return false;
        int[] pos = new int[n];
        Arrays.fill(pos, -1);
        for (int i = 0; i < n; i++) { if (order[i] < 0 || order[i] >= n || pos[order[i]] != -1) return false; pos[order[i]] = i; }
        for (int[] p : prereq) if (pos[p[1]] >= pos[p[0]]) return false;   // every track goes forward
        return true;
    }
    // Components by label propagation: repeat "take the smaller label across every edge" until stable.
    static int[] labels(int n, int[][] edges) {
        int[] lab = new int[n];
        for (int i = 0; i < n; i++) lab[i] = i;
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int[] e : edges) {
                int m = Math.min(lab[e[0]], lab[e[1]]);
                if (lab[e[0]] != m || lab[e[1]] != m) { lab[e[0]] = m; lab[e[1]] = m; changed = true; }
            }
        }
        return lab;
    }
    static int componentCount(int n, int[][] edges) {
        int[] lab = labels(n, edges);
        Set<Integer> s = new HashSet<>();
        for (int x : lab) s.add(x);
        return s.size();
    }
    static boolean isTree(int n, int[][] edges) {       // connected, and every edge is a bridge (no cycle)
        if (componentCount(n, edges) != 1) return false;
        for (int i = 0; i < edges.length; i++) {
            int[][] rest = new int[edges.length - 1][];
            for (int j = 0, k = 0; j < edges.length; j++) if (j != i) rest[k++] = edges[j];
            int[] lab = labels(n, rest);
            if (lab[edges[i][0]] == lab[edges[i][1]]) return false;   // still connected without it: a cycle
        }
        return true;
    }
    static final long INF = Long.MAX_VALUE / 4;
    static long[][] floyd(int n, int[][] weighted) {    // weighted: [u, v, w], directed
        long[][] d = new long[n][n];
        for (long[] row : d) Arrays.fill(row, INF);
        for (int i = 0; i < n; i++) d[i][i] = 0;
        for (int[] e : weighted) d[e[0]][e[1]] = Math.min(d[e[0]][e[1]], e[2]);
        for (int k = 0; k < n; k++) for (int i = 0; i < n; i++) for (int j = 0; j < n; j++)
            if (d[i][k] < INF && d[k][j] < INF && d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
        return d;
    }
    static int manhattan(int[] a, int[] b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
    static int bruteMst(int[][] pts) {                  // every choice of n - 1 cables; keep the connected ones
        int n = pts.length;
        if (n == 1) return 0;
        List<int[]> cables = new ArrayList<>();
        for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) cables.add(new int[]{i, j});
        int m = cables.size(), best = Integer.MAX_VALUE;
        for (int mask = 0; mask < (1 << m); mask++) {
            if (Integer.bitCount(mask) != n - 1) continue;
            int[][] chosen = new int[n - 1][];
            int cost = 0, k = 0;
            for (int b = 0; b < m; b++) if ((mask >> b & 1) == 1) { chosen[k++] = cables.get(b); cost += manhattan(pts[cables.get(b)[0]], pts[cables.get(b)[1]]); }
            if (cost < best && componentCount(n, chosen) == 1) best = cost;
        }
        return best;
    }
    static long bestWalk;
    static void walks(int city, int dst, long cost, int flightsLeft, List<List<int[]>> out) {
        if (city == dst) bestWalk = Math.min(bestWalk, cost);
        if (flightsLeft == 0) return;
        for (int[] e : out.get(city)) walks(e[0], dst, cost + e[1], flightsLeft - 1, out);
    }
    static int bruteFlights(int n, int[][] flights, int src, int dst, int k) {   // every walk with at most k + 1 flights
        List<List<int[]>> out = new ArrayList<>();
        for (int i = 0; i < n; i++) out.add(new ArrayList<>());
        for (int[] f : flights) out.get(f[0]).add(new int[]{f[1], f[2]});
        bestWalk = INF;
        walks(src, dst, 0, k + 1, out);
        return bestWalk == INF ? -1 : (int) bestWalk;
    }
    static boolean sortedUnder(String[] words, int[] rank) {
        for (int i = 0; i + 1 < words.length; i++) {
            String a = words[i], b = words[i + 1];
            int j = 0;
            while (j < a.length() && j < b.length() && a.charAt(j) == b.charAt(j)) j++;
            if (j < a.length() && j < b.length()) { if (rank[a.charAt(j)] > rank[b.charAt(j)]) return false; }
            else if (a.length() > b.length()) return false;
        }
        return true;
    }
    static String bestAlphabet;
    static void permute(char[] letters, int i, String[] words) {
        if (i == letters.length) {
            int[] rank = new int[128];
            for (int k = 0; k < letters.length; k++) rank[letters[k]] = k;
            String cand = new String(letters);
            if (sortedUnder(words, rank) && (bestAlphabet == null || cand.compareTo(bestAlphabet) < 0)) bestAlphabet = cand;
            return;
        }
        for (int k = i; k < letters.length; k++) {
            char t = letters[i]; letters[i] = letters[k]; letters[k] = t;
            permute(letters, i + 1, words);
            t = letters[i]; letters[i] = letters[k]; letters[k] = t;
        }
    }
    static String bruteAlien(String[] words) {          // smallest valid alphabet, or "" if none
        TreeSet<Character> set = new TreeSet<>();
        for (String w : words) for (char c : w.toCharArray()) set.add(c);
        char[] letters = new char[set.size()];
        int i = 0;
        for (char c : set) letters[i++] = c;
        bestAlphabet = null;
        permute(letters, 0, words);
        return bestAlphabet == null ? "" : bestAlphabet;
    }

    // ---------- the buggy versions the lesson names ----------
    static boolean canFinishOneFlag(int n, int[][] prereq) {
        List<List<Integer>> next = new ArrayList<>();
        for (int i = 0; i < n; i++) next.add(new ArrayList<>());
        for (int[] p : prereq) next.get(p[1]).add(p[0]);
        boolean[] visited = new boolean[n];
        for (int c = 0; c < n; c++) if (!visited[c] && oneFlag(c, next, visited)) return false;
        return true;
    }
    static boolean oneFlag(int u, List<List<Integer>> next, boolean[] visited) {
        visited[u] = true;
        for (int v : next.get(u)) { if (visited[v]) return true; if (oneFlag(v, next, visited)) return true; }
        return false;
    }
    static int[] findOrderReversed(int n, int[][] prereq) {
        int[][] swapped = new int[prereq.length][];
        for (int i = 0; i < prereq.length; i++) swapped[i] = new int[]{prereq[i][1], prereq[i][0]};
        return new B_findOrder().findOrder(n, swapped);   // building a -> b is the same as swapping each pair
    }
    static String alienNoPrefixCheck(String[] words) {
        Map<Character, Set<Character>> next = new HashMap<>();
        Map<Character, Integer> indeg = new HashMap<>();
        for (String w : words) for (char c : w.toCharArray()) { next.putIfAbsent(c, new HashSet<>()); indeg.putIfAbsent(c, 0); }
        for (int i = 0; i + 1 < words.length; i++) {
            String a = words[i], b = words[i + 1];
            int len = Math.min(a.length(), b.length()), j = 0;
            while (j < len && a.charAt(j) == b.charAt(j)) j++;
            if (j == len) continue;
            if (next.get(a.charAt(j)).add(b.charAt(j))) indeg.merge(b.charAt(j), 1, Integer::sum);
        }
        PriorityQueue<Character> ready = new PriorityQueue<>();
        for (var e : indeg.entrySet()) if (e.getValue() == 0) ready.add(e.getKey());
        StringBuilder sb = new StringBuilder();
        while (!ready.isEmpty()) { char c = ready.poll(); sb.append(c); for (char d : next.get(c)) if (indeg.merge(d, -1, Integer::sum) == 0) ready.add(d); }
        return sb.length() == indeg.size() ? sb.toString() : "";
    }
    static int componentsRawLink(int n, int[][] edges) {
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        for (int[] e : edges) parent[e[1]] = e[0];       // BUG: link members, not roots
        int roots = 0;
        for (int i = 0; i < n; i++) if (parent[i] == i) roots++;
        return roots;
    }
    static boolean treeOnlyNoCycle(int n, int[][] edges) {
        int[] lab = new int[n];
        for (int i = 0; i < n; i++) lab[i] = i;
        for (int[] e : edges) {
            int a = lab[e[0]], b = lab[e[1]];
            if (a == b) return false;
            for (int i = 0; i < n; i++) if (lab[i] == b) lab[i] = a;
        }
        return true;
    }
    static boolean treeOnlyCount(int n, int[][] edges) { return edges.length == n - 1; }
    static int networkDelayMarkOnPush(int[][] times, int n, int k) {
        List<List<int[]>> out = new ArrayList<>();
        for (int i = 0; i <= n; i++) out.add(new ArrayList<>());
        for (int[] t : times) out.get(t[0]).add(new int[]{t[1], t[2]});
        int[] dist = new int[n + 1];
        Arrays.fill(dist, Integer.MAX_VALUE);
        boolean[] seen = new boolean[n + 1];
        dist[k] = 0; seen[k] = true;
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        heap.add(new int[]{0, k});
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            for (int[] e : out.get(top[1])) if (!seen[e[0]]) { seen[e[0]] = true; dist[e[0]] = top[0] + e[1]; heap.add(new int[]{dist[e[0]], e[0]}); }
        }
        int last = 0;
        for (int v = 1; v <= n; v++) { if (dist[v] == Integer.MAX_VALUE) return -1; last = Math.max(last, dist[v]); }
        return last;
    }
    // Textbook Dijkstra that settles a node when popped and never revisits it (0-indexed, returns dist).
    static long[] dijkstraSettled(int n, int[][] weighted, int src) {
        long[] dist = new long[n];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        boolean[] done = new boolean[n];
        for (int round = 0; round < n; round++) {
            int u = -1;
            for (int v = 0; v < n; v++) if (!done[v] && dist[v] < INF && (u == -1 || dist[v] < dist[u])) u = v;
            if (u == -1) break;
            done[u] = true;
            for (int[] e : weighted) if (e[0] == u && !done[e[1]] && dist[u] + e[2] < dist[e[1]]) dist[e[1]] = dist[u] + e[2];
        }
        return dist;
    }
    static int mstBlindCheapest(int[][] pts) {
        int n = pts.length;
        List<Integer> costs = new ArrayList<>();
        for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) costs.add(manhattan(pts[i], pts[j]));
        Collections.sort(costs);
        int t = 0;
        for (int i = 0; i < n - 1; i++) t += costs.get(i);
        return t;
    }
    static int flightsInPlace(int n, int[][] flights, int src, int dst, int k) {
        int[] cost = new int[n];
        Arrays.fill(cost, Integer.MAX_VALUE);
        cost[src] = 0;
        for (int r = 0; r <= k; r++)
            for (int[] f : flights)
                if (cost[f[0]] != Integer.MAX_VALUE && cost[f[0]] + f[2] < cost[f[1]]) cost[f[1]] = cost[f[0]] + f[2];
        return cost[dst] == Integer.MAX_VALUE ? -1 : cost[dst];
    }
    static int flightsDijkstraVisited(int n, int[][] flights, int src, int dst, int k) {
        List<List<int[]>> out = new ArrayList<>();
        for (int i = 0; i < n; i++) out.add(new ArrayList<>());
        for (int[] f : flights) out.get(f[0]).add(new int[]{f[1], f[2]});
        boolean[] visited = new boolean[n];
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));   // [cost, city, flights]
        heap.add(new int[]{0, src, 0});
        while (!heap.isEmpty()) {
            int[] t = heap.poll();
            if (t[1] == dst) return t[0];
            if (visited[t[1]]) continue;
            visited[t[1]] = true;
            if (t[2] == k + 1) continue;
            for (int[] e : out.get(t[1])) heap.add(new int[]{t[0] + e[1], e[0], t[2] + 1});
        }
        return -1;
    }

    static List<List<String>> accounts(String[][] rows) {
        List<List<String>> out = new ArrayList<>();
        for (String[] r : rows) out.add(new ArrayList<>(Arrays.asList(r)));
        return out;
    }
    static List<String> normal(List<List<String>> merged) {
        List<String> rows = new ArrayList<>();
        for (List<String> r : merged) rows.add(String.join(",", r));
        Collections.sort(rows);
        return rows;
    }
    static List<String> bruteAccounts(List<List<String>> acc) {
        int m = acc.size();
        int[] comp = new int[m];
        Arrays.fill(comp, -1);
        int c = 0;
        for (int i = 0; i < m; i++) {
            if (comp[i] != -1) continue;
            Deque<Integer> q = new ArrayDeque<>();
            q.add(i); comp[i] = c;
            while (!q.isEmpty()) {
                int x = q.poll();
                for (int y = 0; y < m; y++) {
                    if (comp[y] != -1) continue;
                    boolean share = false;
                    for (int a = 1; a < acc.get(x).size() && !share; a++) for (int b = 1; b < acc.get(y).size(); b++) if (acc.get(x).get(a).equals(acc.get(y).get(b))) { share = true; break; }
                    if (share) { comp[y] = c; q.add(y); }
                }
            }
            c++;
        }
        List<List<String>> merged = new ArrayList<>();
        for (int k = 0; k < c; k++) {
            TreeSet<String> emails = new TreeSet<>();
            String name = null;
            for (int i = 0; i < m; i++) if (comp[i] == k) { name = acc.get(i).get(0); emails.addAll(acc.get(i).subList(1, acc.get(i).size())); }
            List<String> row = new ArrayList<>();
            row.add(name);
            row.addAll(emails);
            merged.add(row);
        }
        return normal(merged);
    }
    static double bruteRatio(Map<String, Map<String, Double>> g, String from, String to) {
        if (!g.containsKey(from) || !g.containsKey(to)) return -1.0;
        Map<String, Double> val = new HashMap<>();
        Deque<String> q = new ArrayDeque<>();
        val.put(from, 1.0); q.add(from);
        while (!q.isEmpty()) {
            String x = q.poll();
            for (var e : g.get(x).entrySet()) if (!val.containsKey(e.getKey())) { val.put(e.getKey(), val.get(x) * e.getValue()); q.add(e.getKey()); }
        }
        // val[y] = from / y, since from / y = (from / x) * (x / y); we want from / to
        return val.containsKey(to) ? val.get(to) : -1.0;
    }
    static void close(double[] expected, double[] actual, String what) {
        cases++;
        if (expected.length != actual.length) throw new AssertionError(what + ": length");
        for (int i = 0; i < expected.length; i++)
            if (Math.abs(expected[i] - actual[i]) > 1e-9 * Math.max(1, Math.abs(expected[i])))
                throw new AssertionError(what + ": expected " + Arrays.toString(expected) + " but got " + Arrays.toString(actual));
    }
    static int bruteEffort(int[][] h) {                 // smallest threshold t for which a flood fill reaches the corner
        int rows = h.length, cols = h[0].length;
        for (int t = 0; ; t++) {
            boolean[][] seen = new boolean[rows][cols];
            Deque<int[]> q = new ArrayDeque<>();
            q.add(new int[]{0, 0}); seen[0][0] = true;
            while (!q.isEmpty()) {
                int[] p = q.poll();
                int[][] d = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
                for (int[] s : d) {
                    int r = p[0] + s[0], c = p[1] + s[1];
                    if (r < 0 || c < 0 || r >= rows || c >= cols || seen[r][c]) continue;
                    if (Math.abs(h[r][c] - h[p[0]][p[1]]) <= t) { seen[r][c] = true; q.add(new int[]{r, c}); }
                }
            }
            if (seen[rows - 1][cols - 1]) return t;
        }
    }

    public static void main(String[] args) {
        // ---------- Chapters 1 and 2: Course Schedule I and II ----------
        int[][] diamond = {{1, 0}, {2, 0}, {3, 1}, {3, 2}};
        int[][] stuck = {{1, 0}, {1, 2}, {2, 1}};
        eq(true, new B_canFinish().canFinish(2, new int[][]{{1, 0}}), "LC 207 example 1");
        eq(false, new B_canFinish().canFinish(2, new int[][]{{1, 0}, {0, 1}}), "LC 207 example 2");
        eq(true, new B_canFinish().canFinish(4, diamond), "diamond (Kahn)");
        eq(true, new B_canFinishDfs().canFinish(4, diamond), "diamond (colours)");
        eq(false, new B_canFinish().canFinish(3, stuck), "stuck figure (Kahn)");
        eq(false, new B_canFinishDfs().canFinish(3, stuck), "stuck figure (colours)");
        eq(true, new B_canFinish().canFinish(1, new int[0][]), "single course");
        eq(false, new B_canFinish().canFinish(1, new int[][]{{0, 0}}), "self-loop (Kahn)");
        eq(false, new B_canFinishDfs().canFinish(1, new int[][]{{0, 0}}), "self-loop (colours)");
        eq(false, canFinishOneFlag(4, diamond), "catch-the-bug: one-flag DFS calls the diamond a cycle");
        eq(new int[]{0, 1, 2, 3}, new B_findOrder().findOrder(4, diamond), "Kahn order on the diamond (trace)");
        ok(validOrder(4, diamond, new int[]{0, 2, 1, 3}), "[0, 2, 1, 3] is also valid (trace)");
        eq(new int[]{1, 0}, findOrderReversed(2, new int[][]{{1, 0}}), "catch-the-bug: reversed tracks give [1, 0]");
        eq(0, new B_findOrder().findOrder(4, new int[][]{{1, 0}, {2, 1}, {3, 2}, {2, 3}}).length, "trace: partial order -> empty");
        eq(0, new B_findOrderDfs().findOrder(4, new int[][]{{1, 0}, {2, 1}, {3, 2}, {2, 3}}).length, "dfs: partial order -> empty");
        ok(validOrder(4, new int[][]{{1, 0}, {2, 0}, {3, 1}, {3, 2}}, new B_findOrder().findOrder(4, new int[][]{{1, 0}, {2, 0}, {3, 1}, {3, 2}})), "LC 210 example 2");
        eq(new int[]{0}, new B_findOrder().findOrder(1, new int[0][]), "LC 210 example 3");
        for (int t = 0; t < 4000; t++) {
            int n = 1 + R.nextInt(7);
            int[][] pre = randomPairs(n, 10, false);
            boolean cyc = directedCycle(n, prereqToTracks(pre));
            String w = "n=" + n + " " + s(pre);
            eq(!cyc, new B_canFinish().canFinish(n, pre), "canFinish " + w);
            eq(!cyc, new B_canFinishDfs().canFinish(n, pre), "canFinishDfs " + w);
            int[] a = new B_findOrder().findOrder(n, pre), b = new B_findOrderDfs().findOrder(n, pre);
            if (cyc) { eq(0, a.length, "findOrder cyc " + w); eq(0, b.length, "findOrderDfs cyc " + w); }
            else { ok(validOrder(n, pre, a), "findOrder valid " + w); ok(validOrder(n, pre, b), "findOrderDfs valid " + w); }
        }

        // ---------- Chapter 3: Alien Dictionary ----------
        eq("wertf", new B_alienOrder().alienOrder(new String[]{"wrt", "wrf", "er", "ett", "rftt"}), "LC 269 example 1");
        eq("zx", new B_alienOrder().alienOrder(new String[]{"z", "x"}), "LC 269 example 2");
        eq("", new B_alienOrder().alienOrder(new String[]{"z", "x", "z"}), "LC 269 example 3 (cycle)");
        eq("", new B_alienOrder().alienOrder(new String[]{"abc", "ab"}), "prefix rule");
        eq("abc", alienNoPrefixCheck(new String[]{"abc", "ab"}), "catch-the-bug: no prefix check returns abc");
        eq("yxz", new B_alienOrder().alienOrder(new String[]{"zy", "zx"}), "LintCode-style smallest order");
        eq("abc", new B_alienOrder().alienOrder(new String[]{"ab", "abc"}), "prefix in the right order: no rules");
        eq("z", new B_alienOrder().alienOrder(new String[]{"z", "z"}), "duplicate words");
        eq("bac", new B_alienOrder().alienOrder(new String[]{"ba", "bc", "ac", "cab"}), "practice base bac");
        eq("cab", new B_alienOrder().alienOrder(new String[]{"caa", "aaa", "aab"}), "practice base cab");
        for (int t = 0; t < 3000; t++) {
            int alpha = 1 + R.nextInt(5);
            int count = 1 + R.nextInt(5);
            String[] words = new String[count];
            for (int i = 0; i < count; i++) {
                StringBuilder sb = new StringBuilder();
                int len = 1 + R.nextInt(3);
                for (int j = 0; j < len; j++) sb.append((char) ('a' + R.nextInt(alpha)));
                words[i] = sb.toString();
            }
            if (R.nextBoolean()) {                       // sort by a hidden alphabet so many cases are valid
                List<Character> hidden = new ArrayList<>();
                for (int i = 0; i < alpha; i++) hidden.add((char) ('a' + i));
                Collections.shuffle(hidden, R);
                int[] rank = new int[128];
                for (int i = 0; i < alpha; i++) rank[hidden.get(i)] = i;
                Arrays.sort(words, (x, y) -> {
                    for (int j = 0; j < Math.min(x.length(), y.length()); j++) if (x.charAt(j) != y.charAt(j)) return rank[x.charAt(j)] - rank[y.charAt(j)];
                    return x.length() - y.length();
                });
            }
            String got = new B_alienOrder().alienOrder(words);
            eq(bruteAlien(words), got, "alienOrder " + Arrays.toString(words));
            if (!got.isEmpty()) {                        // and the output really sorts the list
                int[] rank = new int[128];
                for (int i = 0; i < got.length(); i++) rank[got.charAt(i)] = i;
                ok(sortedUnder(words, rank), "alien output sorts the words " + Arrays.toString(words));
            }
        }

        // ---------- Chapter 4: Number of Connected Components ----------
        B_uf uf = new B_uf();
        eq(2, uf.countComponents(5, new int[][]{{0, 1}, {1, 2}, {3, 4}}), "LC 323 example 1");
        eq(1, uf.countComponents(5, new int[][]{{0, 1}, {1, 2}, {2, 3}, {3, 4}}), "LC 323 example 2");
        eq(4, uf.countComponents(4, new int[0][]), "no edges");
        eq(1, uf.countComponents(1, new int[0][]), "single node");
        eq(2, componentsRawLink(3, new int[][]{{0, 1}, {2, 1}}), "catch-the-bug: raw link counts 2 roots");
        eq(1, uf.countComponents(3, new int[][]{{0, 1}, {2, 1}}), "the same input, correctly");
        {   // path compression figure: parent 4 -> 3 -> 1 -> 0, 2 -> 0
            B_uf.DSU d = new B_uf.DSU(5);
            d.parent[1] = 0; d.parent[2] = 0; d.parent[3] = 1; d.parent[4] = 3;
            eq(0, d.find(4), "figure root");
            eq(new int[]{0, 0, 0, 0, 0}, d.parent, "figure: after find(4) everything points at 0");
            B_uf.DSU e = new B_uf.DSU(4);
            e.parent[1] = 0; e.parent[2] = 1; e.parent[3] = 2;
            e.find(3);
            eq(new int[]{0, 0, 0, 0}, e.parent, "trace: compression of [0, 0, 1, 2]");
            B_uf.DSU f = new B_uf.DSU(5);
            f.union(0, 1);
            eq(new int[]{0, 0, 2, 3, 4}, f.parent, "trace: union(0, 1)");
            f.union(1, 2); f.union(3, 4);
            eq(new int[]{0, 0, 0, 3, 3}, f.parent, "trace: after all three tracks");
            eq(2, f.sets, "trace: two networks");
        }
        for (int t = 0; t < 4000; t++) {
            int n = 1 + R.nextInt(8);
            int[][] edges = randomUndirected(n, 9);
            eq(componentCount(n, edges), uf.countComponents(n, edges), "countComponents n=" + n + " " + s(edges));
        }
        {   // union by size keeps trees short: a chain of unions never grows taller than log2 n
            B_uf.DSU d = new B_uf.DSU(1024);
            for (int i = 1; i < 1024; i++) d.union(i - 1, i);
            int worst = 0;
            for (int i = 0; i < 1024; i++) { int h = 0, x = i; while (d.parent[x] != x) { x = d.parent[x]; h++; } worst = Math.max(worst, h); }
            ok(worst <= 10, "height bound log2(1024) = 10, got " + worst);
        }

        // ---------- Chapter 5: Graph Valid Tree ----------
        eq(true, uf.validTree(5, new int[][]{{0, 1}, {0, 2}, {0, 3}, {1, 4}}), "LC 261 example 1");
        eq(false, uf.validTree(5, new int[][]{{0, 1}, {1, 2}, {2, 3}, {1, 3}, {1, 4}}), "LC 261 example 2");
        eq(true, uf.validTree(1, new int[0][]), "n = 1");
        eq(false, uf.validTree(4, new int[][]{{0, 1}, {1, 2}, {2, 0}}), "loop + island");
        eq(false, uf.validTree(4, new int[][]{{0, 1}, {2, 3}}), "two pieces");
        eq(true, treeOnlyNoCycle(4, new int[][]{{0, 1}, {2, 3}}), "catch-the-bug: no-cycle check alone says true");
        eq(true, treeOnlyCount(4, new int[][]{{0, 1}, {1, 2}, {2, 0}}), "catch-the-bug: count alone says true");
        for (int t = 0; t < 4000; t++) {
            int n = 1 + R.nextInt(7);
            int[][] edges = R.nextInt(3) == 0 ? randomTree(n, 0) : randomUndirected(n, n + 1);
            eq(isTree(n, edges), uf.validTree(n, edges), "validTree n=" + n + " " + s(edges));
        }

        // ---------- Chapter 6: Redundant Connection ----------
        eq(new int[]{2, 3}, uf.findRedundantConnection(new int[][]{{1, 2}, {1, 3}, {2, 3}}), "LC 684 example 1");
        eq(new int[]{1, 4}, uf.findRedundantConnection(new int[][]{{1, 2}, {2, 3}, {3, 4}, {1, 4}, {1, 5}}), "LC 684 example 2 (figure)");
        {
            boolean threw = false;
            try {
                B_uf.DSU small = new B_uf.DSU(3);
                for (int[] e : new int[][]{{1, 2}, {1, 3}, {2, 3}}) small.union(e[0], e[1]);
            } catch (ArrayIndexOutOfBoundsException ex) { threw = true; }
            ok(threw, "catch-the-bug: a register of size n throws on 1-indexed junctions");
        }
        for (int t = 0; t < 3000; t++) {
            int n = 3 + R.nextInt(5);
            List<int[]> edges = new ArrayList<>(Arrays.asList(randomTree(n, 1)));
            Set<String> have = new HashSet<>();
            for (int[] e : edges) { have.add(Math.min(e[0], e[1]) + "-" + Math.max(e[0], e[1])); }
            int a, b;
            do { a = 1 + R.nextInt(n); b = 1 + R.nextInt(n); } while (a == b || have.contains(Math.min(a, b) + "-" + Math.max(a, b)));
            edges.add(new int[]{Math.min(a, b), Math.max(a, b)});
            Collections.shuffle(edges, R);
            int[][] arr = edges.toArray(new int[0][]);
            int[] expect = null;
            for (int i = arr.length - 1; i >= 0 && expect == null; i--) {   // last edge whose removal leaves a tree
                int[][] rest = new int[n - 1][];
                for (int j = 0, k = 0; j < arr.length; j++) if (j != i) rest[k++] = new int[]{arr[j][0] - 1, arr[j][1] - 1};
                if (isTree(n, rest)) expect = arr[i];
            }
            eq(expect, uf.findRedundantConnection(arr), "findRedundantConnection " + s(arr));
        }

        // ---------- Chapter 7: Network Delay Time ----------
        B_networkDelayTime nd = new B_networkDelayTime();
        eq(2, nd.networkDelayTime(new int[][]{{2, 1, 1}, {2, 3, 1}, {3, 4, 1}}, 4, 2), "LC 743 example 1");
        eq(1, nd.networkDelayTime(new int[][]{{1, 2, 1}}, 2, 1), "LC 743 example 2");
        eq(-1, nd.networkDelayTime(new int[][]{{1, 2, 1}}, 2, 2), "LC 743 example 3");
        eq(4, nd.networkDelayTime(new int[][]{{1, 2, 4}, {1, 3, 1}, {3, 2, 2}, {2, 4, 1}, {3, 4, 5}}, 4, 1), "figure graph (1-indexed)");
        eq(0, nd.networkDelayTime(new int[0][], 1, 1), "single node");
        eq(2, nd.networkDelayTime(new int[][]{{1, 2, 5}, {1, 3, 1}, {3, 2, 1}}, 3, 1), "catch-the-bug input, correctly");
        eq(5, networkDelayMarkOnPush(new int[][]{{1, 2, 5}, {1, 3, 1}, {3, 2, 1}}, 3, 1), "catch-the-bug: mark-on-push returns 5");
        {   // negative counterexample: A=0, B=1, C=2; A->B 2, A->C 3, C->B -2
            int[][] g = {{0, 1, 2}, {0, 2, 3}, {2, 1, -2}};
            eq(2L, dijkstraSettled(3, g, 0)[1], "textbook Dijkstra settles B at 2");
            eq(1L, floyd(3, g)[0][1], "true cheapest fare to B is 1");
        }
        {   // figure / trace graph, 0-indexed: final dist [0, 3, 1, 4]
            long[][] d = floyd(4, new int[][]{{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}, {2, 3, 5}});
            eq(new long[]{0, 3, 1, 4}, d[0], "figure distances");
        }
        for (int t = 0; t < 4000; t++) {
            int n = 1 + R.nextInt(6);
            int[][] pairs = randomPairs(n, 12, false);
            int[][] times = new int[pairs.length][];
            for (int i = 0; i < pairs.length; i++) times[i] = new int[]{pairs[i][0] + 1, pairs[i][1] + 1, R.nextInt(10)};
            int k = 1 + R.nextInt(n);
            int[][] zero = new int[pairs.length][];
            for (int i = 0; i < pairs.length; i++) zero[i] = new int[]{pairs[i][0], pairs[i][1], times[i][2]};
            long[] d = floyd(n, zero)[k - 1];
            long worst = 0;
            for (long x : d) worst = Math.max(worst, x);
            eq(worst >= INF ? -1 : (int) worst, nd.networkDelayTime(times, n, k), "networkDelayTime n=" + n + " k=" + k + " " + s(times));
        }

        // ---------- Chapter 8: Min Cost to Connect All Points ----------
        B_minCostConnectPoints prim = new B_minCostConnectPoints();
        int[][] lc1 = {{0, 0}, {2, 2}, {3, 10}, {5, 2}, {7, 0}};
        eq(20, prim.minCostConnectPoints(lc1), "LC 1584 example 1 (Prim)");
        eq(20, uf.minCostConnectPointsKruskal(lc1), "LC 1584 example 1 (Kruskal)");
        eq(20, bruteMst(lc1), "LC 1584 example 1 (brute)");
        eq(18, prim.minCostConnectPoints(new int[][]{{3, 12}, {-2, 5}, {-4, 1}}), "LC 1584 example 2");
        eq(0, prim.minCostConnectPoints(new int[][]{{5, 5}}), "single point (Prim)");
        eq(0, uf.minCostConnectPointsKruskal(new int[][]{{5, 5}}), "single point (Kruskal)");
        int[][] blind = {{0, 0}, {1, 0}, {0, 1}, {10, 10}};
        eq(21, prim.minCostConnectPoints(blind), "catch-the-bug input, correctly");
        eq(4, mstBlindCheapest(blind), "catch-the-bug: blind n-1 cheapest gives 4");
        eq(new int[]{4, 13, 7, 7}, new int[]{manhattan(lc1[0], lc1[1]), manhattan(lc1[0], lc1[2]), manhattan(lc1[0], lc1[3]), manhattan(lc1[0], lc1[4])}, "trace: first offers");
        eq(new int[]{9, 3, 7}, new int[]{manhattan(lc1[1], lc1[2]), manhattan(lc1[1], lc1[3]), Math.min(7, manhattan(lc1[1], lc1[4]))}, "trace: offers after p1");
        eq(4, manhattan(lc1[3], lc1[4]), "trace: p4 through p3");
        for (int t = 0; t < 1500; t++) {
            int n = 1 + R.nextInt(6);
            Set<String> used = new HashSet<>();
            int[][] pts = new int[n][];
            for (int i = 0; i < n; i++) { int x, y; do { x = R.nextInt(11) - 5; y = R.nextInt(11) - 5; } while (!used.add(x + "," + y)); pts[i] = new int[]{x, y}; }
            int expect = bruteMst(pts);
            eq(expect, prim.minCostConnectPoints(pts), "Prim " + s(pts));
            eq(expect, uf.minCostConnectPointsKruskal(pts), "Kruskal " + s(pts));
        }

        // ---------- Chapter 9: Cheapest Flights Within K Stops ----------
        B_findCheapestPrice bf = new B_findCheapestPrice();
        B_findCheapestPriceBfs bfs = new B_findCheapestPriceBfs();
        int[][] lcF = {{0, 1, 100}, {1, 2, 100}, {2, 0, 100}, {1, 3, 600}, {2, 3, 200}};
        eq(700, bf.findCheapestPrice(4, lcF, 0, 3, 1), "LC 787 example 1");
        eq(700, bfs.findCheapestPrice(4, lcF, 0, 3, 1), "LC 787 example 1 (BFS)");
        int[][] tri = {{0, 1, 100}, {1, 2, 100}, {0, 2, 500}};
        eq(200, bf.findCheapestPrice(3, tri, 0, 2, 1), "LC 787 example 2");
        eq(500, bf.findCheapestPrice(3, tri, 0, 2, 0), "LC 787 example 3 / figure");
        eq(500, bfs.findCheapestPrice(3, tri, 0, 2, 0), "figure (BFS)");
        eq(200, flightsInPlace(3, tri, 0, 2, 0), "catch-the-bug: in place returns 200");
        int[][] trap = {{0, 1, 1}, {1, 2, 1}, {0, 2, 5}, {2, 3, 1}};
        eq(6, bf.findCheapestPrice(4, trap, 0, 3, 1), "Dijkstra trap, correctly");
        eq(6, bfs.findCheapestPrice(4, trap, 0, 3, 1), "Dijkstra trap (BFS)");
        eq(-1, flightsDijkstraVisited(4, trap, 0, 3, 1), "pitfall: visited-set Dijkstra returns -1");
        for (int t = 0; t < 4000; t++) {
            int n = 2 + R.nextInt(4);
            int[][] pairs = randomPairs(n, 12, false);
            int[][] flights = new int[pairs.length][];
            for (int i = 0; i < pairs.length; i++) flights[i] = new int[]{pairs[i][0], pairs[i][1], 1 + R.nextInt(9)};
            int src = R.nextInt(n), dst;
            do { dst = R.nextInt(n); } while (dst == src);
            int k = R.nextInt(4);
            int expect = bruteFlights(n, flights, src, dst, k);
            String w = "n=" + n + " " + s(flights) + " " + src + "->" + dst + " k=" + k;
            eq(expect, bf.findCheapestPrice(n, flights, src, dst, k), "findCheapestPrice " + w);
            eq(expect, bfs.findCheapestPrice(n, flights, src, dst, k), "findCheapestPriceBfs " + w);
        }

        // ---------- Side quest 1: Find Eventual Safe States ----------
        B_eventualSafeNodes safe = new B_eventualSafeNodes();
        eq(List.of(2, 4, 5, 6), safe.eventualSafeNodes(new int[][]{{1, 2}, {2, 3}, {5}, {0}, {5}, {}, {}}), "LC 802 example 1 (figure)");
        eq(List.of(4), safe.eventualSafeNodes(new int[][]{{1, 2, 3, 4}, {1, 2}, {3, 4}, {0, 4}, {}}), "LC 802 example 2");
        eq(List.of(), safe.eventualSafeNodes(new int[][]{{0}}), "self-loop");
        for (int t = 0; t < 4000; t++) {
            int n = 1 + R.nextInt(7);
            int[][] g = new int[n][];
            List<int[]> edges = new ArrayList<>();
            for (int u = 0; u < n; u++) {
                List<Integer> outs = new ArrayList<>();
                for (int v = 0; v < n; v++) if (R.nextInt(4) == 0) { outs.add(v); edges.add(new int[]{u, v}); }
                g[u] = outs.stream().mapToInt(Integer::intValue).toArray();
            }
            boolean[][] reach = closure(n, edges.toArray(new int[0][]));
            List<Integer> expect = new ArrayList<>();
            for (int u = 0; u < n; u++) {
                boolean bad = reach[u][u];
                for (int w = 0; w < n && !bad; w++) if (reach[u][w] && reach[w][w]) bad = true;
                if (!bad) expect.add(u);
            }
            eq(expect, safe.eventualSafeNodes(g), "eventualSafeNodes " + s(g));
        }

        // ---------- Side quest 2: Parallel Courses III and I ----------
        B_parallelCourses pc = new B_parallelCourses();
        eq(8, pc.minimumTime(3, new int[][]{{1, 3}, {2, 3}}, new int[]{3, 2, 5}), "LC 2050 example 1");
        eq(12, pc.minimumTime(5, new int[][]{{1, 5}, {2, 5}, {3, 5}, {3, 4}, {4, 5}}, new int[]{1, 2, 3, 4, 5}), "LC 2050 example 2");
        eq(4, pc.minimumTime(1, new int[0][], new int[]{4}), "single course");
        eq(2, pc.minimumSemesters(3, new int[][]{{1, 3}, {2, 3}}), "LC 1136 example 1");
        eq(-1, pc.minimumSemesters(3, new int[][]{{1, 2}, {2, 3}, {3, 1}}), "LC 1136 example 2");
        for (int t = 0; t < 4000; t++) {
            int n = 1 + R.nextInt(7);
            int[] perm = new int[n];
            for (int i = 0; i < n; i++) perm[i] = i;
            for (int i = n - 1; i > 0; i--) { int j = R.nextInt(i + 1); int x = perm[i]; perm[i] = perm[j]; perm[j] = x; }
            List<int[]> rel = new ArrayList<>();
            for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) if (R.nextInt(3) == 0) rel.add(new int[]{perm[i] + 1, perm[j] + 1});
            int[][] relations = rel.toArray(new int[0][]);
            int[] time = new int[n];
            for (int i = 0; i < n; i++) time[i] = 1 + R.nextInt(6);
            int[] finish = new int[n];                   // fixed point of finish = time + max(prerequisite finishes)
            for (int round = 0; round <= n; round++)
                for (int v = 0; v < n; v++) {
                    int st = 0;
                    for (int[] r : relations) if (r[1] - 1 == v) st = Math.max(st, finish[r[0] - 1]);
                    finish[v] = st + time[v];
                }
            int expect = 0;
            for (int f : finish) expect = Math.max(expect, f);
            eq(expect, pc.minimumTime(n, relations, time), "minimumTime " + s(relations) + " " + Arrays.toString(time));
            // semesters, possibly with cycles: simulate one semester at a time
            int[][] maybeCyclic = randomPairs(n, 8, false);
            for (int[] r : maybeCyclic) { r[0]++; r[1]++; }
            boolean[] done = new boolean[n];
            int sem = 0, taken = 0;
            while (true) {
                List<Integer> now = new ArrayList<>();
                for (int v = 0; v < n; v++) {
                    if (done[v]) continue;
                    boolean okv = true;
                    for (int[] r : maybeCyclic) if (r[1] - 1 == v && !done[r[0] - 1]) okv = false;
                    if (okv) now.add(v);
                }
                if (now.isEmpty()) break;
                for (int v : now) done[v] = true;
                taken += now.size();
                sem++;
            }
            eq(taken == n ? sem : -1, pc.minimumSemesters(n, maybeCyclic), "minimumSemesters " + s(maybeCyclic));
        }

        // ---------- Side quest 3: Accounts Merge ----------
        {
            List<List<String>> lc = accounts(new String[][]{
                {"John", "johnsmith@mail.com", "john_newyork@mail.com"},
                {"John", "johnsmith@mail.com", "john00@mail.com"},
                {"Mary", "mary@mail.com"},
                {"John", "johnnybravo@mail.com"}});
            eq(List.of("John,john00@mail.com,john_newyork@mail.com,johnsmith@mail.com", "John,johnnybravo@mail.com", "Mary,mary@mail.com"),
                normal(uf.accountsMerge(lc)), "LC 721 example 1");
            List<List<String>> chain = accounts(new String[][]{{"A", "x", "y"}, {"A", "y", "z"}, {"A", "z", "w"}});
            eq(List.of("A,w,x,y,z"), normal(uf.accountsMerge(chain)), "reveal: transitive chain");
            String[] names = {"Ann", "Bob", "Ann", "Cy"};       // two different people may share a name
            for (int t = 0; t < 2000; t++) {
                int people = 1 + R.nextInt(4);
                List<List<String>> acc = new ArrayList<>();
                int records = 1 + R.nextInt(6);
                for (int r = 0; r < records; r++) {
                    int p = R.nextInt(people);
                    List<String> row = new ArrayList<>();
                    row.add(names[p]);
                    int count = 1 + R.nextInt(3);
                    for (int e = 0; e < count; e++) {
                        String email = "p" + p + "e" + R.nextInt(4) + "@m";
                        if (!row.subList(1, row.size()).contains(email)) row.add(email);
                    }
                    acc.add(row);
                }
                eq(bruteAccounts(acc), normal(uf.accountsMerge(acc)), "accountsMerge " + acc);
            }
        }

        // ---------- Side quest 4: Evaluate Division ----------
        {
            B_calcEquation ce = new B_calcEquation();
            List<List<String>> eqs = List.of(List.of("a", "b"), List.of("b", "c"));
            List<List<String>> qs = List.of(List.of("a", "c"), List.of("b", "a"), List.of("a", "e"), List.of("a", "a"), List.of("x", "x"));
            close(new double[]{6.0, 0.5, -1.0, 1.0, -1.0}, ce.calcEquation(eqs, new double[]{2.0, 3.0}, qs), "LC 399 example 1 (figure)");
            close(new double[]{3.75, 0.4, 5.0, 0.2}, ce.calcEquation(List.of(List.of("a", "b"), List.of("b", "c"), List.of("bc", "cd")), new double[]{1.5, 2.5, 5.0},
                List.of(List.of("a", "c"), List.of("c", "b"), List.of("bc", "cd"), List.of("cd", "bc"))), "LC 399 example 2");
            String[] vars = {"a", "b", "c", "d", "e", "f"};
            for (int t = 0; t < 3000; t++) {
                int nv = 2 + R.nextInt(5);
                double[] hidden = new double[nv];
                for (int i = 0; i < nv; i++) hidden[i] = 1 + R.nextInt(9);
                int m = 1 + R.nextInt(6);
                List<List<String>> eqList = new ArrayList<>();
                double[] vals = new double[m];
                Map<String, Map<String, Double>> g = new HashMap<>();
                for (int i = 0; i < m; i++) {
                    int a = R.nextInt(nv), b;
                    do { b = R.nextInt(nv); } while (b == a);
                    eqList.add(List.of(vars[a], vars[b]));
                    vals[i] = hidden[a] / hidden[b];
                    g.computeIfAbsent(vars[a], z -> new HashMap<>()).put(vars[b], vals[i]);        // edge a -> b carries a / b
                    g.computeIfAbsent(vars[b], z -> new HashMap<>()).put(vars[a], 1 / vals[i]);
                }
                List<List<String>> qList = new ArrayList<>();
                for (int q = 0; q < 6; q++) {
                    String c = R.nextInt(8) == 0 ? "zz" : vars[R.nextInt(nv)], d = R.nextInt(8) == 0 ? "zz" : vars[R.nextInt(nv)];
                    qList.add(List.of(c, d));
                }
                double[] expect = new double[qList.size()];
                for (int q = 0; q < qList.size(); q++) expect[q] = bruteRatio(g, qList.get(q).get(0), qList.get(q).get(1));
                close(expect, ce.calcEquation(eqList, vals, qList), "calcEquation " + eqList + " " + qList);
            }
        }

        // ---------- Side quest 5: Path With Minimum Effort ----------
        B_minimumEffortPath me = new B_minimumEffortPath();
        eq(2, me.minimumEffortPath(new int[][]{{1, 2, 2}, {3, 8, 2}, {5, 3, 5}}), "LC 1631 example 1 (figure)");
        eq(1, me.minimumEffortPath(new int[][]{{1, 2, 3}, {3, 8, 4}, {5, 3, 5}}), "LC 1631 example 2");
        eq(0, me.minimumEffortPath(new int[][]{{1, 2, 1, 1, 1}, {1, 2, 1, 2, 1}, {1, 2, 1, 2, 1}, {1, 2, 1, 2, 1}, {1, 1, 1, 2, 1}}), "LC 1631 example 3");
        eq(0, me.minimumEffortPath(new int[][]{{7}}), "1 x 1");
        for (int t = 0; t < 3000; t++) {
            int rows = 1 + R.nextInt(4), cols = 1 + R.nextInt(4);
            int[][] h = new int[rows][cols];
            for (int[] r : h) for (int c = 0; c < cols; c++) r[c] = R.nextInt(10);
            eq(bruteEffort(h), me.minimumEffortPath(h), "minimumEffortPath " + s(h));
        }

        System.out.println("OK advanced-graphs: " + cases + " checks passed");
    }
}
