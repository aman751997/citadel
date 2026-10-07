import java.util.*;

// Runs every Java solution shown in graphs.mdx against independent oracles on hand-picked edge cases plus
// thousands of random small inputs. Oracles are deliberately different algorithms from the lesson's:
// union-find for components and areas, repeated relaxation (Bellman-Ford style, no queue) for distances,
// minute-by-minute simulation for the blight, forward downhill search per cell for Pacific Atlantic,
// pairwise Manhattan distance for 01 Matrix and Shortest Bridge, and exhaustive 2-colouring for bipartite.
// It also proves each "catch the bug" version named in the lesson fails on the input the lesson names,
// and re-counts the queue numbers the lesson quotes (100 / 181 / 184,755).
public class Check {
    static final Random R = new Random(11);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }
    static String show(Object o) {
        if (o instanceof int[][] a) return Arrays.deepToString(a);
        if (o instanceof char[][] a) return Arrays.deepToString(a);
        if (o instanceof int[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }
    static final int[][] D4 = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    static int[][] copy(int[][] g) { int[][] c = new int[g.length][]; for (int i = 0; i < g.length; i++) c[i] = g[i].clone(); return c; }
    static char[][] copy(char[][] g) { char[][] c = new char[g.length][]; for (int i = 0; i < g.length; i++) c[i] = g[i].clone(); return c; }
    static int[][] randGrid(int rows, int cols, int values, int[] weights) {
        int total = 0; for (int w : weights) total += w;
        int[][] g = new int[rows][cols];
        for (int[] row : g) for (int c = 0; c < cols; c++) {
            int x = R.nextInt(total), v = 0;
            while (x >= weights[v]) { x -= weights[v]; v++; }
            row[c] = v;
        }
        return g;
    }
    static char[][] toChars(int[][] g, char zero, char one) {
        char[][] c = new char[g.length][g[0].length];
        for (int r = 0; r < g.length; r++) for (int k = 0; k < g[0].length; k++) c[r][k] = g[r][k] == 1 ? one : zero;
        return c;
    }

    // ---------- union-find oracle ----------
    static int[] parent;
    static int find(int x) { while (parent[x] != x) x = parent[x] = parent[parent[x]]; return x; }
    static void union(int a, int b) { parent[find(a)] = find(b); }
    // label[r][c] = root of the land cell's component, -1 for water
    static int[][] ufLabels(int[][] g, int land) {
        int rows = g.length, cols = g[0].length;
        parent = new int[rows * cols];
        for (int i = 0; i < parent.length; i++) parent[i] = i;
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (g[r][c] == land) {
            if (r + 1 < rows && g[r + 1][c] == land) union(r * cols + c, (r + 1) * cols + c);
            if (c + 1 < cols && g[r][c + 1] == land) union(r * cols + c, r * cols + c + 1);
        }
        int[][] label = new int[rows][cols];
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) label[r][c] = g[r][c] == land ? find(r * cols + c) : -1;
        return label;
    }
    static int ufCount(int[][] g) {
        Set<Integer> roots = new HashSet<>();
        for (int[] row : ufLabels(g, 1)) for (int x : row) if (x >= 0) roots.add(x);
        return roots.size();
    }
    static int ufMaxArea(int[][] g) {
        Map<Integer, Integer> size = new HashMap<>();
        for (int[] row : ufLabels(g, 1)) for (int x : row) if (x >= 0) size.merge(x, 1, Integer::sum);
        int best = 0; for (int s : size.values()) best = Math.max(best, s);
        return best;
    }
    static int ufGraphComponents(int n, int[][] edges) {
        parent = new int[n]; for (int i = 0; i < n; i++) parent[i] = i;
        for (int[] e : edges) union(e[0], e[1]);
        Set<Integer> roots = new HashSet<>(); for (int i = 0; i < n; i++) roots.add(find(i));
        return roots.size();
    }

    // ---------- relaxation oracle: shortest path in squares, 8 directions, no queue ----------
    static int relaxBinaryMatrix(int[][] g) {
        int n = g.length, INF = Integer.MAX_VALUE / 2;
        if (g[0][0] == 1) return -1;
        int[][] d = new int[n][n];
        for (int[] row : d) Arrays.fill(row, INF);
        d[0][0] = 1;
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) if (g[r][c] == 0 && d[r][c] < INF)
                for (int dr = -1; dr <= 1; dr++) for (int dc = -1; dc <= 1; dc++) {
                    int a = r + dr, b = c + dc;
                    if (a >= 0 && a < n && b >= 0 && b < n && g[a][b] == 0 && d[r][c] + 1 < d[a][b]) { d[a][b] = d[r][c] + 1; changed = true; }
                }
        }
        return d[n - 1][n - 1] >= INF ? -1 : d[n - 1][n - 1];
    }

    // ---------- simulation oracle for the blight ----------
    static int simulateRot(int[][] g0) {
        int[][] g = copy(g0);
        int minutes = 0;
        while (true) {
            int fresh = 0; for (int[] row : g) for (int x : row) if (x == 1) fresh++;
            if (fresh == 0) return minutes;
            int[][] next = copy(g);
            boolean any = false;
            for (int r = 0; r < g.length; r++) for (int c = 0; c < g[0].length; c++) if (g[r][c] == 1)
                for (int[] d : D4) {
                    int a = r + d[0], b = c + d[1];
                    if (a >= 0 && a < g.length && b >= 0 && b < g[0].length && g[a][b] == 2) { next[r][c] = 2; any = true; }
                }
            if (!any) return -1;
            g = next; minutes++;
        }
    }

    // ---------- relaxation oracle for surrounded regions ----------
    static char[][] relaxSurrounded(char[][] b0) {
        int rows = b0.length, cols = b0[0].length;
        boolean[][] safe = new boolean[rows][cols];
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++)
            if ((r == 0 || c == 0 || r == rows - 1 || c == cols - 1) && b0[r][c] == 'O') safe[r][c] = true;
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (b0[r][c] == 'O' && !safe[r][c])
                for (int[] d : D4) {
                    int a = r + d[0], b = c + d[1];
                    if (a >= 0 && a < rows && b >= 0 && b < cols && safe[a][b]) { safe[r][c] = true; changed = true; break; }
                }
        }
        char[][] out = new char[rows][cols];
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) out[r][c] = safe[r][c] ? 'O' : 'X';
        return out;
    }

    // ---------- forward oracle for Pacific Atlantic: from each cell, search downhill ----------
    static Set<List<Integer>> forwardPacific(int[][] h) {
        int rows = h.length, cols = h[0].length;
        Set<List<Integer>> out = new HashSet<>();
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            boolean[][] seen = new boolean[rows][cols];
            List<int[]> todo = new ArrayList<>(); todo.add(new int[]{r, c}); seen[r][c] = true;
            boolean pac = false, atl = false;
            for (int i = 0; i < todo.size(); i++) {
                int[] x = todo.get(i);
                if (x[0] == 0 || x[1] == 0) pac = true;
                if (x[0] == rows - 1 || x[1] == cols - 1) atl = true;
                for (int[] d : D4) {
                    int a = x[0] + d[0], b = x[1] + d[1];
                    if (a >= 0 && a < rows && b >= 0 && b < cols && !seen[a][b] && h[a][b] <= h[x[0]][x[1]]) { seen[a][b] = true; todo.add(new int[]{a, b}); }
                }
            }
            if (pac && atl) out.add(List.of(r, c));
        }
        return out;
    }

    // ---------- word ladder oracle: explicit graph + relaxation ----------
    static boolean oneApart(String a, String b) {
        if (a.length() != b.length()) return false;
        int diff = 0; for (int i = 0; i < a.length(); i++) if (a.charAt(i) != b.charAt(i)) diff++;
        return diff == 1;
    }
    static int relaxLadder(String begin, String end, List<String> words) {
        List<String> nodes = new ArrayList<>(new LinkedHashSet<>(words));
        if (!nodes.contains(end)) return 0;
        if (!nodes.contains(begin)) nodes.add(begin);
        int n = nodes.size(), INF = Integer.MAX_VALUE / 2;
        int[] d = new int[n]; Arrays.fill(d, INF);
        d[nodes.indexOf(begin)] = 1;
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int i = 0; i < n; i++) if (d[i] < INF) for (int j = 0; j < n; j++)
                if (oneApart(nodes.get(i), nodes.get(j)) && d[i] + 1 < d[j]) { d[j] = d[i] + 1; changed = true; }
        }
        int e = d[nodes.indexOf(end)];
        return e >= INF ? 0 : e;
    }

    // ---------- the buggy versions the lesson names ----------
    static void sinkLate(char[][] g, int r, int c) {
        if (r < 0 || r >= g.length || c < 0 || c >= g[0].length || g[r][c] != '1') return;
        sinkLate(g, r + 1, c); sinkLate(g, r - 1, c); sinkLate(g, r, c + 1); sinkLate(g, r, c - 1);
        g[r][c] = '0';
    }
    static int maxAreaMarkOnPop(int[][] grid) {
        int rows = grid.length, cols = grid[0].length, best = 0;
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            if (grid[r][c] != 1) continue;
            Deque<int[]> stack = new ArrayDeque<>(); stack.push(new int[]{r, c});
            int area = 0;
            while (!stack.isEmpty()) {
                int[] cell = stack.pop();
                grid[cell[0]][cell[1]] = 0;
                area++;
                for (int[] d : D4) {
                    int nr = cell[0] + d[0], nc = cell[1] + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) stack.push(new int[]{nr, nc});
                }
            }
            best = Math.max(best, area);
        }
        return best;
    }
    static int shortestNoStartGuard(int[][] grid) {
        int n = grid.length;
        Deque<int[]> q = new ArrayDeque<>(); q.offer(new int[]{0, 0}); grid[0][0] = 1;
        int length = 1;
        while (!q.isEmpty()) {
            for (int size = q.size(); size > 0; size--) {
                int[] cell = q.poll();
                if (cell[0] == n - 1 && cell[1] == n - 1) return length;
                for (int dr = -1; dr <= 1; dr++) for (int dc = -1; dc <= 1; dc++) {
                    int nr = cell[0] + dr, nc = cell[1] + dc;
                    if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] == 0) { grid[nr][nc] = 1; q.offer(new int[]{nr, nc}); }
                }
            }
            length++;
        }
        return -1;
    }
    static int rotUntilEmpty(int[][] grid) {
        int rows = grid.length, cols = grid[0].length, fresh = 0;
        Deque<int[]> q = new ArrayDeque<>();
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) { if (grid[r][c] == 2) q.offer(new int[]{r, c}); else if (grid[r][c] == 1) fresh++; }
        int minutes = 0;
        while (!q.isEmpty()) {
            for (int size = q.size(); size > 0; size--) {
                int[] cell = q.poll();
                for (int[] d : D4) {
                    int nr = cell[0] + d[0], nc = cell[1] + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) { grid[nr][nc] = 2; fresh--; q.offer(new int[]{nr, nc}); }
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
    static void solveTopBottomOnly(char[][] board) {
        int rows = board.length, cols = board[0].length;
        Deque<int[]> q = new ArrayDeque<>();
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++)
            if ((r == 0 || r == rows - 1) && board[r][c] == 'O') { board[r][c] = 'S'; q.offer(new int[]{r, c}); }
        while (!q.isEmpty()) {
            int[] cell = q.poll();
            for (int[] d : D4) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] == 'O') { board[nr][nc] = 'S'; q.offer(new int[]{nr, nc}); }
            }
        }
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) board[r][c] = board[r][c] == 'S' ? 'O' : 'X';
    }
    static int pacificStrictCount(int[][] h) {
        int rows = h.length, cols = h[0].length;
        boolean[][] p = new boolean[rows][cols], a = new boolean[rows][cols];
        for (int r = 0; r < rows; r++) { climbStrict(h, p, r, 0); climbStrict(h, a, r, cols - 1); }
        for (int c = 0; c < cols; c++) { climbStrict(h, p, 0, c); climbStrict(h, a, rows - 1, c); }
        int n = 0; for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (p[r][c] && a[r][c]) n++;
        return n;
    }
    static void climbStrict(int[][] h, boolean[][] reached, int r, int c) {
        if (reached[r][c]) return;
        reached[r][c] = true;
        for (int[] d : D4) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < h.length && nc >= 0 && nc < h[0].length && !reached[nr][nc] && h[nr][nc] > h[r][c]) climbStrict(h, reached, nr, nc);
        }
    }
    static int ladderEndBeforeDictionary(String begin, String end, List<String> list) {
        Set<String> unvisited = new HashSet<>(list);
        Deque<String> q = new ArrayDeque<>(); q.offer(begin); unvisited.remove(begin);
        int words = 1;
        while (!q.isEmpty()) {
            for (int size = q.size(); size > 0; size--) {
                char[] w = q.poll().toCharArray();
                for (int i = 0; i < w.length; i++) {
                    char o = w[i];
                    for (char ch = 'a'; ch <= 'z'; ch++) {
                        if (ch == o) continue;
                        w[i] = ch; String next = new String(w);
                        if (next.equals(end)) return words + 1;
                        if (unvisited.remove(next)) q.offer(next);
                    }
                    w[i] = o;
                }
            }
            words++;
        }
        return 0;
    }
    static Map<B_cloneGraph.Node, B_cloneGraph.Node> lateCopies;
    static B_cloneGraph.Node cloneRegisterLate(B_cloneGraph.Node node) {
        if (node == null) return null;
        if (lateCopies.containsKey(node)) return lateCopies.get(node);
        B_cloneGraph.Node copy = new B_cloneGraph.Node(node.val);
        for (B_cloneGraph.Node next : node.neighbors) copy.neighbors.add(cloneRegisterLate(next));
        lateCopies.put(node, copy);
        return copy;
    }
    static void paintNoGuard(int[][] img, int r, int c, int old, int color) {
        if (r < 0 || r >= img.length || c < 0 || c >= img[0].length || img[r][c] != old) return;
        img[r][c] = color;
        paintNoGuard(img, r + 1, c, old, color); paintNoGuard(img, r - 1, c, old, color);
        paintNoGuard(img, r, c + 1, old, color); paintNoGuard(img, r, c - 1, old, color);
    }
    static boolean overflows(Runnable run) {
        try { run.run(); return false; } catch (StackOverflowError e) { return true; }
    }
    // Queue counts on an open n x n grid, 4 directions, start (0,0). mode 0: flag on enqueue;
    // mode 1: flag on poll, skip polled squares already flagged; mode 2: flag on poll, no skip.
    static long enqueues(int n, int mode) {
        boolean[][] flag = new boolean[n][n];
        Deque<int[]> q = new ArrayDeque<>(); q.offer(new int[]{0, 0});
        if (mode == 0) flag[0][0] = true;
        long offers = 1;
        while (!q.isEmpty()) {
            int[] x = q.poll();
            if (mode == 1 && flag[x[0]][x[1]]) continue;
            if (mode != 0) flag[x[0]][x[1]] = true;
            for (int[] d : D4) {
                int a = x[0] + d[0], b = x[1] + d[1];
                if (a >= 0 && a < n && b >= 0 && b < n && !flag[a][b]) { if (mode == 0) flag[a][b] = true; q.offer(new int[]{a, b}); offers++; }
            }
        }
        return offers;
    }

    // ---------- clone graph helpers ----------
    static List<B_cloneGraph.Node> buildGraph(int[][] adj) {    // LeetCode adjList, values 1..n
        List<B_cloneGraph.Node> nodes = new ArrayList<>();
        for (int i = 0; i < adj.length; i++) nodes.add(new B_cloneGraph.Node(i + 1));
        for (int i = 0; i < adj.length; i++) for (int v : adj[i]) nodes.get(i).neighbors.add(nodes.get(v - 1));
        return nodes;
    }
    static void checkClone(int[][] adj, String what) {
        List<B_cloneGraph.Node> originals = buildGraph(adj);
        B_cloneGraph.Node start = originals.isEmpty() ? null : originals.get(0);
        B_cloneGraph.Node copy = new B_cloneGraph().cloneGraph(start);
        if (start == null) { eq(null, copy, what + " null"); return; }
        Set<B_cloneGraph.Node> originalSet = Collections.newSetFromMap(new IdentityHashMap<>());
        originalSet.addAll(originals);
        // walk the copy, collecting nodes by identity; check every node is new and values are unique
        Map<Integer, B_cloneGraph.Node> byVal = new HashMap<>();
        Deque<B_cloneGraph.Node> todo = new ArrayDeque<>(); todo.push(copy);
        Set<B_cloneGraph.Node> seen = Collections.newSetFromMap(new IdentityHashMap<>()); seen.add(copy);
        while (!todo.isEmpty()) {
            B_cloneGraph.Node x = todo.pop();
            ok(!originalSet.contains(x), what + ": copy shares node " + x.val + " with the original");
            B_cloneGraph.Node prev = byVal.put(x.val, x);
            ok(prev == null || prev == x, what + ": two copies of node " + x.val);
            for (B_cloneGraph.Node y : x.neighbors) if (seen.add(y)) todo.push(y);
        }
        // same reachable node count and identical neighbour lists, in order
        Set<B_cloneGraph.Node> reach = Collections.newSetFromMap(new IdentityHashMap<>());
        Deque<B_cloneGraph.Node> t2 = new ArrayDeque<>(); t2.push(start); reach.add(start);
        while (!t2.isEmpty()) for (B_cloneGraph.Node y : t2.pop().neighbors) if (reach.add(y)) t2.push(y);
        eq(reach.size(), byVal.size(), what + ": node count");
        for (B_cloneGraph.Node o : reach) {
            B_cloneGraph.Node c = byVal.get(o.val);
            ok(c != null, what + ": node " + o.val + " missing");
            eq(o.neighbors.stream().map(n -> n.val).toList(), c.neighbors.stream().map(n -> n.val).toList(), what + ": neighbours of " + o.val);
            for (B_cloneGraph.Node n : c.neighbors) ok(byVal.get(n.val) == n, what + ": neighbour " + n.val + " is not the copy");
        }
    }
    static int[][] randConnectedAdj(int n, double extra) {
        List<Set<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new LinkedHashSet<>());
        for (int i = 1; i < n; i++) { int p = R.nextInt(i); adj.get(i).add(p); adj.get(p).add(i); }   // spanning tree
        for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) if (R.nextDouble() < extra) { adj.get(i).add(j); adj.get(j).add(i); }
        int[][] out = new int[n][];
        for (int i = 0; i < n; i++) {
            List<Integer> l = new ArrayList<>(adj.get(i)); Collections.shuffle(l, R);
            out[i] = l.stream().mapToInt(v -> v + 1).toArray();
        }
        return out;
    }

    // ---------- lock oracle: relaxation over all 10^4 states ----------
    static int relaxLock(String[] dead, String target) {
        Set<String> deadSet = new HashSet<>(Arrays.asList(dead));
        if (deadSet.contains("0000")) return -1;
        int INF = Integer.MAX_VALUE / 2;
        int[] d = new int[10000]; Arrays.fill(d, INF); d[0] = 0;
        boolean[] isDead = new boolean[10000];
        for (String s : deadSet) isDead[Integer.parseInt(s)] = true;
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int s = 0; s < 10000; s++) if (d[s] < INF && !isDead[s]) {
                int[] digits = {s / 1000, s / 100 % 10, s / 10 % 10, s % 10};
                for (int i = 0; i < 4; i++) for (int click : new int[]{1, 9}) {
                    int[] t = digits.clone(); t[i] = (t[i] + click) % 10;
                    int u = t[0] * 1000 + t[1] * 100 + t[2] * 10 + t[3];
                    if (!isDead[u] && d[s] + 1 < d[u]) { d[u] = d[s] + 1; changed = true; }
                }
            }
        }
        int t = Integer.parseInt(target);
        return d[t] >= INF ? -1 : d[t];
    }

    static boolean bruteBipartite(int[][] g) {
        int n = g.length;
        for (int mask = 0; mask < (1 << n); mask++) {
            boolean good = true;
            for (int u = 0; u < n && good; u++) for (int v : g[u]) if (((mask >> u) & 1) == ((mask >> v) & 1)) { good = false; break; }
            if (good) return true;
        }
        return n == 0;
    }

    public static void main(String[] args) {
        // ---------- Prologue: countComponents ----------
        eq(2, new B_countComponents().countComponents(6, new int[][]{{0, 1}, {0, 2}, {1, 3}, {2, 3}, {4, 5}}), "prologue figure");
        eq(3, new B_countComponents().countComponents(5, new int[][]{{0, 1}, {3, 4}}), "provinces transfer test");
        eq(1, new B_countComponents().countComponents(1, new int[][]{}), "single node");
        eq(4, new B_countComponents().countComponents(4, new int[][]{}), "no edges");
        eq(1, new B_countComponents().countComponents(3, new int[][]{{0, 1}, {1, 2}, {2, 0}, {0, 1}}), "cycle + duplicate edge");
        for (int t = 0; t < 3000; t++) {
            int n = 1 + R.nextInt(9), m = R.nextInt(10);
            int[][] edges = new int[m][];
            for (int i = 0; i < m; i++) edges[i] = new int[]{R.nextInt(n), R.nextInt(n)};
            eq(ufGraphComponents(n, edges), new B_countComponents().countComponents(n, edges), "countComponents n=" + n + " " + Arrays.deepToString(edges));
        }
        // the queue counts quoted in the prologue and Chapter 3
        eq(100L, enqueues(10, 0), "flag on enqueue: 100");
        eq(181L, enqueues(10, 1), "flag on poll with skip: 181");
        eq(184755L, enqueues(10, 2), "flag on poll, no skip: 184,755");

        // ---------- Chapter 1: Number of Islands ----------
        {
            int[][] lc2 = {{1, 1, 0, 0, 0}, {1, 1, 0, 0, 0}, {0, 0, 1, 0, 0}, {0, 0, 0, 1, 1}};
            eq(3, new B_numIslands().numIslands(toChars(lc2, '0', '1')), "islands LC 2 / figure");
            int[][] lc1 = {{1, 1, 1, 1, 0}, {1, 1, 0, 1, 0}, {1, 1, 0, 0, 0}, {0, 0, 0, 0, 0}};
            eq(1, new B_numIslands().numIslands(toChars(lc1, '0', '1')), "islands LC 1");
            eq(1, new B_numIslands().numIslands(toChars(new int[][]{{1, 0, 1}, {1, 0, 1}, {1, 1, 1}}, '0', '1')), "islands U-shape");
            eq(0, new B_numIslands().numIslands(toChars(new int[][]{{0, 0}, {0, 0}}, '0', '1')), "islands all water");
            eq(1, new B_numIslands().numIslands(new char[][]{{'1'}}), "islands single");
            eq(2, new B_numIslands().numIslands(toChars(new int[][]{{1, 0}, {0, 1}}, '0', '1')), "islands diagonal");
            ok(overflows(() -> sinkLate(new char[][]{{'1', '1'}}, 0, 0)), "catch-the-bug: sinking late recurses forever on [['1','1']]");
            for (int t = 0; t < 3000; t++) {
                int[][] g = randGrid(1 + R.nextInt(7), 1 + R.nextInt(7), 2, new int[]{5, 4});
                eq(ufCount(g), new B_numIslands().numIslands(toChars(g, '0', '1')), "numIslands " + Arrays.deepToString(g));
            }
            // Chapter 2's claim: recursion overflows on a 1000 x 1000 grid of land
            char[][] huge = new char[1000][1000];
            for (char[] row : huge) Arrays.fill(row, '1');
            ok(overflows(() -> new B_numIslands().numIslands(huge)), "recursive sink overflows on 1000 x 1000 land");
        }

        // ---------- Chapter 2: Max Area of Island ----------
        {
            int[][] fig = {{1, 1, 0, 0, 1}, {1, 0, 0, 1, 1}, {0, 0, 0, 1, 0}, {1, 1, 1, 0, 0}};
            eq(4, new B_maxAreaOfIsland().maxAreaOfIsland(copy(fig)), "area figure");
            eq(3, ufCount(fig), "area figure has 3 islands");
            int[][] lc = {{0,0,1,0,0,0,0,1,0,0,0,0,0},{0,0,0,0,0,0,0,1,1,1,0,0,0},{0,1,1,0,1,0,0,0,0,0,0,0,0},{0,1,0,0,1,1,0,0,1,0,1,0,0},{0,1,0,0,1,1,0,0,1,1,1,0,0},{0,0,0,0,0,0,0,0,0,0,1,0,0},{0,0,0,0,0,0,0,1,1,1,0,0,0},{0,0,0,0,0,0,0,1,1,0,0,0,0}};
            eq(6, new B_maxAreaOfIsland().maxAreaOfIsland(copy(lc)), "area LC 1");
            eq(0, new B_maxAreaOfIsland().maxAreaOfIsland(new int[][]{{0, 0, 0, 0, 0, 0, 0, 0}}), "area LC 2");
            eq(4, new B_maxAreaOfIsland().maxAreaOfIsland(new int[][]{{1, 1}, {1, 1}}), "area 2x2");
            eq(5, maxAreaMarkOnPop(new int[][]{{1, 1}, {1, 1}}), "catch-the-bug: mark on pop counts 5 on 2x2");
            int[][] big = new int[1000][1000];
            for (int[] row : big) Arrays.fill(row, 1);
            eq(1000000, new B_maxAreaOfIsland().maxAreaOfIsland(big), "explicit stack on 1000 x 1000 land");
            for (int t = 0; t < 3000; t++) {
                int[][] g = randGrid(1 + R.nextInt(7), 1 + R.nextInt(7), 2, new int[]{4, 5});
                eq(ufMaxArea(g), new B_maxAreaOfIsland().maxAreaOfIsland(copy(g)), "maxArea " + Arrays.deepToString(g));
            }
        }

        // ---------- Chapter 3: Shortest Path in Binary Matrix ----------
        {
            eq(2, new B_shortestPathBinaryMatrix().shortestPathBinaryMatrix(new int[][]{{0, 1}, {1, 0}}), "path LC 1");
            eq(4, new B_shortestPathBinaryMatrix().shortestPathBinaryMatrix(new int[][]{{0, 0, 0}, {1, 1, 0}, {1, 1, 0}}), "path LC 2 / figure");
            eq(-1, new B_shortestPathBinaryMatrix().shortestPathBinaryMatrix(new int[][]{{1, 0, 0}, {1, 1, 0}, {1, 1, 0}}), "path LC 3");
            eq(1, new B_shortestPathBinaryMatrix().shortestPathBinaryMatrix(new int[][]{{0}}), "path 1x1 open");
            eq(-1, new B_shortestPathBinaryMatrix().shortestPathBinaryMatrix(new int[][]{{1}}), "path 1x1 rock");
            eq(1, shortestNoStartGuard(new int[][]{{1}}), "catch-the-bug: no start guard returns 1 on [[1]]");
            for (int t = 0; t < 4000; t++) {
                int n = 1 + R.nextInt(6);
                int[][] g = randGrid(n, n, 2, new int[]{3, 1 + R.nextInt(3)});
                eq(relaxBinaryMatrix(g), new B_shortestPathBinaryMatrix().shortestPathBinaryMatrix(copy(g)), "shortestPath " + Arrays.deepToString(g));
            }
        }

        // ---------- Chapter 4: Rotting Oranges ----------
        {
            eq(4, new B_orangesRotting().orangesRotting(new int[][]{{2, 1, 1}, {1, 1, 0}, {0, 1, 1}}), "rot LC 1");
            eq(-1, new B_orangesRotting().orangesRotting(new int[][]{{2, 1, 1}, {0, 1, 1}, {1, 0, 1}}), "rot LC 2");
            eq(0, new B_orangesRotting().orangesRotting(new int[][]{{0, 2}}), "rot LC 3");
            eq(2, new B_orangesRotting().orangesRotting(new int[][]{{2, 1, 1}, {1, 1, 1}, {1, 1, 2}}), "rot two sources");
            eq(4, simulateRot(new int[][]{{2, 1, 1}, {1, 1, 1}, {1, 1, 1}}), "rot from one corner only: 4");
            eq(-1, new B_orangesRotting().orangesRotting(new int[][]{{1}}), "rot fresh, no source");
            eq(0, new B_orangesRotting().orangesRotting(new int[][]{{0}}), "rot empty");
            eq(5, rotUntilEmpty(new int[][]{{2, 1, 1}, {1, 1, 0}, {0, 1, 1}}), "catch-the-bug: extra minute gives 5");
            eq(1, rotUntilEmpty(new int[][]{{0, 2}}), "catch-the-bug: extra minute gives 1 on [[0,2]]");
            for (int t = 0; t < 4000; t++) {
                int[][] g = randGrid(1 + R.nextInt(6), 1 + R.nextInt(6), 3, new int[]{2, 5, 1});
                eq(simulateRot(g), new B_orangesRotting().orangesRotting(copy(g)), "orangesRotting " + Arrays.deepToString(g));
            }
        }

        // ---------- Chapter 5: Surrounded Regions ----------
        {
            char[][] lc = {"XXXX".toCharArray(), "XOOX".toCharArray(), "XXOX".toCharArray(), "XOXX".toCharArray()};
            new B_solve().solve(lc);
            eq(new char[][]{"XXXX".toCharArray(), "XXXX".toCharArray(), "XXXX".toCharArray(), "XOXX".toCharArray()}, lc, "surrounded LC 1");
            char[][] one = {{'X'}}; new B_solve().solve(one); eq(new char[][]{{'X'}}, one, "surrounded LC 2");
            char[][] side = {"XXX".toCharArray(), "OOX".toCharArray(), "XXX".toCharArray()};
            char[][] side2 = copy(side);
            new B_solve().solve(side);
            eq(new char[][]{"XXX".toCharArray(), "OOX".toCharArray(), "XXX".toCharArray()}, side, "surrounded left-edge O survives");
            solveTopBottomOnly(side2);
            eq(new char[][]{"XXX".toCharArray(), "XXX".toCharArray(), "XXX".toCharArray()}, side2, "catch-the-bug: top/bottom-only seeding captures (1,0) and (1,1)");
            for (int t = 0; t < 4000; t++) {
                char[][] b = toChars(randGrid(1 + R.nextInt(7), 1 + R.nextInt(7), 2, new int[]{1, 1}), 'X', 'O');
                char[][] expect = relaxSurrounded(b);
                char[][] got = copy(b);
                new B_solve().solve(got);
                eq(expect, got, "solve " + Arrays.deepToString(b));
            }
        }

        // ---------- Chapter 6: Pacific Atlantic ----------
        {
            int[][] fig = {{1, 2, 3}, {8, 9, 4}, {7, 6, 5}};
            Set<List<Integer>> figExpect = Set.of(List.of(0, 2), List.of(1, 0), List.of(1, 1), List.of(1, 2), List.of(2, 0), List.of(2, 1), List.of(2, 2));
            eq(figExpect, new HashSet<>(new B_pacificAtlantic().pacificAtlantic(fig)), "pacific figure (7 cells)");
            eq(figExpect, forwardPacific(fig), "pacific figure oracle");
            int[][] lc = {{1, 2, 2, 3, 5}, {3, 2, 3, 4, 4}, {2, 4, 5, 3, 1}, {6, 7, 1, 4, 5}, {5, 1, 1, 2, 4}};
            Set<List<Integer>> lcExpect = Set.of(List.of(0, 4), List.of(1, 3), List.of(1, 4), List.of(2, 2), List.of(3, 0), List.of(3, 1), List.of(4, 0));
            eq(lcExpect, new HashSet<>(new B_pacificAtlantic().pacificAtlantic(lc)), "pacific LC 1");
            eq(Set.of(List.of(0, 0)), new HashSet<>(new B_pacificAtlantic().pacificAtlantic(new int[][]{{1}})), "pacific LC 2");
            int[][] plateau = {{1, 1, 1}, {1, 1, 1}, {1, 1, 1}};
            eq(9, new B_pacificAtlantic().pacificAtlantic(plateau).size(), "pacific plateau: 9");
            eq(2, pacificStrictCount(plateau), "catch-the-bug: strict > returns 2 on the plateau");
            eq(40000, new B_pacificAtlantic().pacificAtlantic(new int[200][200]).size(), "explicit-stack climb survives a 200 x 200 plateau");
            for (int t = 0; t < 3000; t++) {
                int[][] h = randGrid(1 + R.nextInt(6), 1 + R.nextInt(6), 5, new int[]{1, 1, 1, 1, 1});
                List<List<Integer>> got = new B_pacificAtlantic().pacificAtlantic(h);
                eq(got.size(), new HashSet<>(got).size(), "pacific no duplicates");
                eq(forwardPacific(h), new HashSet<>(got), "pacificAtlantic " + Arrays.deepToString(h));
            }
        }

        // ---------- Chapter 7: Word Ladder (both versions) ----------
        {
            List<String> lc1 = List.of("hot", "dot", "dog", "lot", "log", "cog");
            List<String> lc2 = List.of("hot", "dot", "dog", "lot", "log");
            eq(5, new B_ladderLength().ladderLength("hit", "cog", lc1), "ladder LC 1");
            eq(0, new B_ladderLength().ladderLength("hit", "cog", lc2), "ladder LC 2");
            eq(5, new B_ladderBuckets().ladderLength("hit", "cog", lc1), "buckets LC 1");
            eq(0, new B_ladderBuckets().ladderLength("hit", "cog", lc2), "buckets LC 2");
            eq(5, ladderEndBeforeDictionary("hit", "cog", lc2), "catch-the-bug: endWord before dictionary returns 5");
            eq(2, new B_ladderLength().ladderLength("a", "c", List.of("a", "b", "c")), "ladder single letters");
            eq(2, new B_ladderBuckets().ladderLength("a", "c", List.of("a", "b", "c")), "buckets single letters");
            eq(2, new B_ladderLength().ladderLength("hot", "dot", List.of("hot", "dot", "dog")), "ladder begin in list");
            eq(5, relaxLadder("hit", "cog", lc1), "oracle LC 1");
            String alphabet = "abc";
            for (int t = 0; t < 3000; t++) {
                int len = 1 + R.nextInt(3), count = R.nextInt(9);
                Set<String> words = new LinkedHashSet<>();
                for (int i = 0; i < count; i++) {
                    StringBuilder sb = new StringBuilder();
                    for (int j = 0; j < len; j++) sb.append(alphabet.charAt(R.nextInt(alphabet.length())));
                    words.add(sb.toString());
                }
                StringBuilder b = new StringBuilder(), e = new StringBuilder();
                for (int j = 0; j < len; j++) { b.append(alphabet.charAt(R.nextInt(3))); e.append(alphabet.charAt(R.nextInt(3))); }
                String begin = b.toString(), end = e.toString();
                if (begin.equals(end)) continue;
                List<String> list = new ArrayList<>(words);
                if (R.nextInt(3) > 0 && !list.contains(end)) list.add(R.nextInt(list.size() + 1), end);
                int expect = relaxLadder(begin, end, list);
                eq(expect, new B_ladderLength().ladderLength(begin, end, new ArrayList<>(list)), "ladderLength " + begin + "->" + end + " " + list);
                eq(expect, new B_ladderBuckets().ladderLength(begin, end, new ArrayList<>(list)), "ladderBuckets " + begin + "->" + end + " " + list);
            }
        }

        // ---------- Chapter 8: Clone Graph ----------
        {
            checkClone(new int[][]{{2, 4}, {1, 3}, {2, 4}, {1, 3}}, "clone LC 1 (square)");
            checkClone(new int[][]{{}}, "clone LC 2 (single node)");
            checkClone(new int[][]{}, "clone LC 3 (empty)");
            checkClone(new int[][]{{2}, {1}}, "clone single edge");
            // the square makes exactly 4 new nodes: count distinct copies reachable
            lateCopies = new HashMap<>();
            List<B_cloneGraph.Node> pair = buildGraph(new int[][]{{2}, {1}});
            ok(overflows(() -> cloneRegisterLate(pair.get(0))), "catch-the-bug: registering after the loop recurses forever on 1-2");
            for (int t = 0; t < 2000; t++) {
                int n = 1 + R.nextInt(8);
                checkClone(randConnectedAdj(n, R.nextDouble() * 0.6), "clone random n=" + n);
            }
        }

        // ---------- Side quest 1: Flood Fill ----------
        {
            eq(new int[][]{{2, 2, 2}, {2, 2, 0}, {2, 0, 1}}, new B_floodFill().floodFill(new int[][]{{1, 1, 1}, {1, 1, 0}, {1, 0, 1}}, 1, 1, 2), "flood LC 1 / figure");
            eq(new int[][]{{0, 0, 0}, {0, 0, 0}}, new B_floodFill().floodFill(new int[][]{{0, 0, 0}, {0, 0, 0}}, 0, 0, 0), "flood LC 2 same colour");
            ok(overflows(() -> paintNoGuard(new int[][]{{1, 1}}, 0, 0, 1, 1)), "catch-the-bug: no old == color guard recurses forever");
            for (int t = 0; t < 3000; t++) {
                int rows = 1 + R.nextInt(6), cols = 1 + R.nextInt(6);
                int[][] img = randGrid(rows, cols, 3, new int[]{1, 1, 1});
                int sr = R.nextInt(rows), sc = R.nextInt(cols), color = R.nextInt(3);
                // oracle: relaxation of "same old colour and adjacent to a region square"
                int old = img[sr][sc];
                boolean[][] in = new boolean[rows][cols]; in[sr][sc] = true;
                boolean changed = true;
                while (changed) { changed = false;
                    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (!in[r][c] && img[r][c] == old)
                        for (int[] d : D4) { int a = r + d[0], b = c + d[1]; if (a >= 0 && a < rows && b >= 0 && b < cols && in[a][b]) { in[r][c] = true; changed = true; break; } } }
                int[][] expect = copy(img);
                for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (in[r][c]) expect[r][c] = color;
                eq(expect, new B_floodFill().floodFill(copy(img), sr, sc, color), "floodFill");
            }
        }

        // ---------- Side quest 2: Number of Provinces ----------
        {
            eq(2, new B_findCircleNum().findCircleNum(new int[][]{{1, 1, 0}, {1, 1, 0}, {0, 0, 1}}), "provinces LC 1 / figure");
            eq(3, new B_findCircleNum().findCircleNum(new int[][]{{1, 0, 0}, {0, 1, 0}, {0, 0, 1}}), "provinces LC 2");
            for (int t = 0; t < 3000; t++) {
                int n = 1 + R.nextInt(9);
                int[][] m = new int[n][n];
                List<int[]> edges = new ArrayList<>();
                for (int i = 0; i < n; i++) { m[i][i] = 1; for (int j = i + 1; j < n; j++) if (R.nextInt(4) == 0) { m[i][j] = m[j][i] = 1; edges.add(new int[]{i, j}); } }
                eq(ufGraphComponents(n, edges.toArray(new int[0][])), new B_findCircleNum().findCircleNum(m), "findCircleNum " + Arrays.deepToString(m));
            }
        }

        // ---------- Side quest 3: 01 Matrix ----------
        {
            eq(new int[][]{{0, 0, 0}, {0, 1, 0}, {0, 0, 0}}, new B_updateMatrix().updateMatrix(new int[][]{{0, 0, 0}, {0, 1, 0}, {0, 0, 0}}), "01 LC 1");
            eq(new int[][]{{0, 0, 0}, {0, 1, 0}, {1, 2, 1}}, new B_updateMatrix().updateMatrix(new int[][]{{0, 0, 0}, {0, 1, 0}, {1, 1, 1}}), "01 LC 2 / figure");
            for (int t = 0; t < 3000; t++) {
                int rows = 1 + R.nextInt(6), cols = 1 + R.nextInt(6);
                int[][] mat = randGrid(rows, cols, 2, new int[]{1, 3});
                mat[R.nextInt(rows)][R.nextInt(cols)] = 0;                       // at least one 0, as promised
                int[][] expect = new int[rows][cols];
                for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
                    int best = Integer.MAX_VALUE;
                    for (int a = 0; a < rows; a++) for (int b = 0; b < cols; b++) if (mat[a][b] == 0) best = Math.min(best, Math.abs(a - r) + Math.abs(b - c));
                    expect[r][c] = best;
                }
                eq(expect, new B_updateMatrix().updateMatrix(copy(mat)), "updateMatrix " + Arrays.deepToString(mat));
            }
        }

        // ---------- Side quest 4: Shortest Bridge ----------
        {
            eq(1, new B_shortestBridge().shortestBridge(new int[][]{{0, 1}, {1, 0}}), "bridge LC 1");
            eq(2, new B_shortestBridge().shortestBridge(new int[][]{{0, 1, 0}, {0, 0, 0}, {0, 0, 1}}), "bridge LC 2 / figure");
            eq(1, new B_shortestBridge().shortestBridge(new int[][]{{1, 1, 1, 1, 1}, {1, 0, 0, 0, 1}, {1, 0, 1, 0, 1}, {1, 0, 0, 0, 1}, {1, 1, 1, 1, 1}}), "bridge LC 3");
            int tested = 0;
            while (tested < 2000) {
                int n = 2 + R.nextInt(6);
                int[][] g = randGrid(n, n, 2, new int[]{3, 2});
                if (ufCount(g) != 2) continue;
                int[][] label = ufLabels(g, 1);
                int best = Integer.MAX_VALUE;
                for (int a = 0; a < n * n; a++) for (int b = 0; b < n * n; b++) {
                    int la = label[a / n][a % n], lb = label[b / n][b % n];
                    if (la >= 0 && lb >= 0 && la != lb) best = Math.min(best, Math.abs(a / n - b / n) + Math.abs(a % n - b % n) - 1);
                }
                eq(best, new B_shortestBridge().shortestBridge(copy(g)), "shortestBridge " + Arrays.deepToString(g));
                tested++;
            }
        }

        // ---------- Side quest 5: Open the Lock ----------
        {
            String[] lcDead = {"0201", "0101", "0102", "1212", "2002"};
            eq(6, new B_openLock().openLock(lcDead, "0202"), "lock LC 1");
            eq(1, new B_openLock().openLock(new String[]{"8888"}, "0009"), "lock LC 2");
            eq(-1, new B_openLock().openLock(new String[]{"8887", "8889", "8878", "8898", "8788", "8988", "7888", "9888"}, "8888"), "lock LC 3");
            eq(-1, new B_openLock().openLock(new String[]{"0000"}, "8888"), "lock dead start");
            eq(0, new B_openLock().openLock(new String[]{}, "0000"), "lock target is start");
            // the reveal's claims: every 4-move route is jammed, the 6-move route avoids every dead end
            Set<String> dead = new HashSet<>(Arrays.asList(lcDead));
            for (String route : List.of("0000 1000 1100 1200 1201 1202 0202".split(" "))) ok(!dead.contains(route), "reveal route avoids " + route);
            for (int t = 0; t < 120; t++) {
                int k = R.nextInt(40);
                String[] dd = new String[k];
                for (int i = 0; i < k; i++) dd[i] = String.format("%04d", R.nextInt(10000));
                String target = String.format("%04d", R.nextInt(10000));
                if (Arrays.asList(dd).contains(target)) continue;
                eq(relaxLock(dd, target), new B_openLock().openLock(dd, target), "openLock " + Arrays.toString(dd) + " -> " + target);
            }
            // local neighbourhoods so -1 and short answers are exercised
            for (int t = 0; t < 120; t++) {
                List<String> dd = new ArrayList<>();
                for (int i = 0; i < 10; i++) dd.add(String.format("%04d", R.nextInt(3) * 1000 + R.nextInt(3) * 100 + R.nextInt(3) * 10 + R.nextInt(3)));
                String target = String.format("%04d", R.nextInt(3) * 1000 + R.nextInt(3) * 100 + R.nextInt(3) * 10 + R.nextInt(3));
                dd.remove(target);
                String[] arr = dd.toArray(new String[0]);
                eq(relaxLock(arr, target), new B_openLock().openLock(arr, target), "openLock local " + dd + " -> " + target);
            }
        }

        // ---------- Side quest 6: Is Graph Bipartite ----------
        {
            eq(false, new B_isBipartite().isBipartite(new int[][]{{1, 2, 3}, {0, 2}, {0, 1, 3}, {0, 2}}), "bipartite LC 1");
            eq(true, new B_isBipartite().isBipartite(new int[][]{{1, 3}, {0, 2}, {1, 3}, {0, 2}}), "bipartite LC 2");
            eq(false, new B_isBipartite().isBipartite(new int[][]{{1}, {0}, {3, 4}, {2, 4}, {2, 3}}), "bipartite reveal: triangle in a later component");
            eq(true, new B_isBipartite().isBipartite(new int[][]{{}}), "bipartite single node");
            for (int t = 0; t < 4000; t++) {
                int n = 1 + R.nextInt(9);
                List<Set<Integer>> adj = new ArrayList<>();
                for (int i = 0; i < n; i++) adj.add(new LinkedHashSet<>());
                for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) if (R.nextInt(4) == 0) { adj.get(i).add(j); adj.get(j).add(i); }
                int[][] g = new int[n][];
                for (int i = 0; i < n; i++) g[i] = adj.get(i).stream().mapToInt(Integer::intValue).toArray();
                eq(bruteBipartite(g), new B_isBipartite().isBipartite(g), "isBipartite " + Arrays.deepToString(g));
            }
        }

        System.out.println("OK graphs: " + cases + " checks passed");
    }
}
