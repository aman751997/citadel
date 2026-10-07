import java.lang.reflect.*;
import java.math.BigInteger;
import java.util.*;

// Runs every Java solution shown in trees-bfs.mdx against independent oracles (depth-first walks that
// carry a depth or a path, never a queue) on hand-picked trees plus thousands of random ones: empty,
// single node, chains leaning left, right and zigzag, complete and perfect trees, and random shapes.
// It also proves that each "catch the bug" version named in the lesson fails on the input the lesson names.
public class Check {
    static final Random R = new Random(10);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + expected + " but got " + actual);
    }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }

    // ---------- trees ----------
    static TreeNode build(Integer... a) {
        if (a.length == 0 || a[0] == null) return null;
        TreeNode root = new TreeNode(a[0]);
        Deque<TreeNode> waiting = new ArrayDeque<>(List.of(root));
        int k = 1;
        while (!waiting.isEmpty() && k < a.length) {
            TreeNode p = waiting.poll();
            if (k < a.length && a[k] != null) { p.left = new TreeNode(a[k]); waiting.offer(p.left); }
            k++;
            if (k < a.length && a[k] != null) { p.right = new TreeNode(a[k]); waiting.offer(p.right); }
            k++;
        }
        return root;
    }
    static List<TreeNode> all(TreeNode t) { List<TreeNode> out = new ArrayList<>(); collectAll(t, out); return out; }
    static void collectAll(TreeNode t, List<TreeNode> out) { if (t == null) return; out.add(t); collectAll(t.left, out); collectAll(t.right, out); }
    static TreeNode findVal(TreeNode t, int v) { for (TreeNode n : all(t)) if (n.val == v) return n; return null; }

    // Random shape: each new node hangs from a random existing node with a free stair.
    static TreeNode randomTree(int n, int lo, int hi, boolean unique) {
        if (n == 0) return null;
        List<Integer> pool = new ArrayList<>();
        for (int v = 1; v <= n; v++) pool.add(v);
        Collections.shuffle(pool, R);
        List<TreeNode> nodes = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            int val = unique ? pool.get(i) : lo + R.nextInt(hi - lo + 1);
            TreeNode node = new TreeNode(val);
            if (i > 0) {
                while (true) {
                    TreeNode p = nodes.get(R.nextInt(nodes.size()));
                    boolean left = R.nextBoolean();
                    if (left && p.left == null) { p.left = node; break; }
                    if (!left && p.right == null) { p.right = node; break; }
                }
            }
            nodes.add(node);
        }
        return nodes.get(0);
    }
    static TreeNode chain(int n, int kind) {      // 0 = all left, 1 = all right, 2 = zigzag
        TreeNode root = null, cur = null;
        for (int i = 0; i < n; i++) {
            TreeNode node = new TreeNode(R.nextInt(19) - 9);
            if (root == null) root = node;
            else if (kind == 0 || (kind == 2 && i % 2 == 0)) cur.left = node; else cur.right = node;
            cur = node;
        }
        return root;
    }
    static TreeNode perfect(int floors, int[] next) {
        if (floors == 0) return null;
        TreeNode t = new TreeNode(next[0]++);
        t.left = perfect(floors - 1, next);
        t.right = perfect(floors - 1, next);
        return t;
    }
    static List<TreeNode> sampleTrees(int count, boolean unique) {
        List<TreeNode> out = new ArrayList<>();
        out.add(null);
        out.add(new TreeNode(7));
        for (int k = 0; k < 3; k++) for (int n = 2; n <= 9; n++) out.add(unique ? relabel(chain(n, k)) : chain(n, k));
        for (int h = 1; h <= 5; h++) out.add(perfect(h, new int[]{1}));
        for (int t = 0; t < count; t++) out.add(randomTree(1 + R.nextInt(14), -9, 9, unique));
        return out;
    }
    static TreeNode relabel(TreeNode t) { int[] k = {1}; for (TreeNode n : all(t)) n.val = k[0]++; return t; }

    // ---------- independent oracles (depth-first, carrying depth or path) ----------
    static List<List<Integer>> rows(TreeNode t) { List<List<Integer>> r = new ArrayList<>(); rowsDfs(t, 0, r); return r; }
    static void rowsDfs(TreeNode t, int d, List<List<Integer>> r) {
        if (t == null) return;
        if (r.size() == d) r.add(new ArrayList<>());
        r.get(d).add(t.val);                          // preorder, left first: each row fills west to east
        rowsDfs(t.left, d + 1, r);
        rowsDfs(t.right, d + 1, r);
    }
    static List<List<Integer>> zig(TreeNode t) {
        List<List<Integer>> r = rows(t);
        for (int d = 1; d < r.size(); d += 2) Collections.reverse(r.get(d));
        return r;
    }
    static List<Integer> lastOfRows(TreeNode t) { List<Integer> v = new ArrayList<>(); for (List<Integer> row : rows(t)) v.add(row.get(row.size() - 1)); return v; }
    static List<Integer> firstOfRows(TreeNode t) { List<Integer> v = new ArrayList<>(); for (List<Integer> row : rows(t)) v.add(row.get(0)); return v; }
    static List<Double> averages(TreeNode t) {
        List<Double> out = new ArrayList<>();
        for (List<Integer> row : rows(t)) { long s = 0; for (int x : row) s += x; out.add((double) s / row.size()); }
        return out;
    }
    static int shortestLeafPath(TreeNode t) {     // every root-to-leaf path, keep the shortest
        if (t == null) return 0;
        if (t.left == null && t.right == null) return 1;
        int best = Integer.MAX_VALUE;
        if (t.left != null) best = Math.min(best, 1 + shortestLeafPath(t.left));
        if (t.right != null) best = Math.min(best, 1 + shortestLeafPath(t.right));
        return best;
    }
    static int widthOracle(TreeNode t) {          // exact positions with BigInteger: no overflow possible
        Map<Integer, BigInteger[]> span = new HashMap<>();
        widthDfs(t, 0, BigInteger.ZERO, span);
        BigInteger best = BigInteger.ZERO;
        for (BigInteger[] mm : span.values()) best = best.max(mm[1].subtract(mm[0]).add(BigInteger.ONE));
        return best.intValueExact();
    }
    static void widthDfs(TreeNode t, int d, BigInteger pos, Map<Integer, BigInteger[]> span) {
        if (t == null) return;
        BigInteger[] mm = span.computeIfAbsent(d, k -> new BigInteger[]{pos, pos});
        mm[0] = mm[0].min(pos); mm[1] = mm[1].max(pos);
        widthDfs(t.left, d + 1, pos.shiftLeft(1).add(BigInteger.ONE), span);
        widthDfs(t.right, d + 1, pos.shiftLeft(1).add(BigInteger.TWO), span);
    }
    static void depthParent(TreeNode t, TreeNode p, int d, Map<Integer, int[]> out) {   // val -> {depth, parent val or MIN}
        if (t == null) return;
        out.put(t.val, new int[]{d, p == null ? Integer.MIN_VALUE : p.val});
        depthParent(t.left, t, d + 1, out);
        depthParent(t.right, t, d + 1, out);
    }
    static boolean pathTo(TreeNode t, TreeNode goal, List<TreeNode> path) {
        if (t == null) return false;
        path.add(t);
        if (t == goal || pathTo(t.left, goal, path) || pathTo(t.right, goal, path)) return true;
        path.remove(path.size() - 1);
        return false;
    }
    static List<Integer> distanceOracle(TreeNode root, TreeNode target, int k) {
        List<TreeNode> tp = new ArrayList<>(); pathTo(root, target, tp);
        List<Integer> out = new ArrayList<>();
        for (TreeNode u : all(root)) {
            List<TreeNode> up = new ArrayList<>(); pathTo(root, u, up);
            int common = 0;
            while (common < up.size() && common < tp.size() && up.get(common) == tp.get(common)) common++;
            int dist = (up.size() - common) + (tp.size() - common);
            if (dist == k) out.add(u.val);
        }
        Collections.sort(out);
        return out;
    }

    // ---------- the buggy versions the lesson names ----------
    static List<List<Integer>> liveBound(TreeNode root) {
        List<List<Integer>> levels = new ArrayList<>();
        Queue<TreeNode> q = new ArrayDeque<>(); q.offer(root);
        while (!q.isEmpty()) {
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < q.size(); i++) { TreeNode n = q.poll(); level.add(n.val); if (n.left != null) q.offer(n.left); if (n.right != null) q.offer(n.right); }
            levels.add(level);
        }
        return levels;
    }
    static List<List<Integer>> linkedListNulls(TreeNode root) {
        List<List<Integer>> levels = new ArrayList<>();
        Queue<TreeNode> q = new LinkedList<>(); q.offer(root);
        while (!q.isEmpty()) {
            int size = q.size(); List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) { TreeNode n = q.poll(); if (n == null) continue; level.add(n.val); q.offer(n.left); q.offer(n.right); }
            levels.add(level);
        }
        return levels;
    }
    static List<List<Integer>> zigzagFlipLine(TreeNode root) {
        List<List<Integer>> levels = new ArrayList<>();
        Queue<TreeNode> q = new ArrayDeque<>(); q.offer(root);
        int floor = 0;
        while (!q.isEmpty()) {
            int size = q.size(); List<Integer> level = new ArrayList<>();
            boolean nextIsReversed = (floor + 1) % 2 == 1;
            for (int i = 0; i < size; i++) {
                TreeNode n = q.poll(); level.add(n.val);
                if (nextIsReversed) { if (n.right != null) q.offer(n.right); if (n.left != null) q.offer(n.left); }
                else { if (n.left != null) q.offer(n.left); if (n.right != null) q.offer(n.right); }
            }
            levels.add(level); floor++;
        }
        return levels;
    }
    static List<Integer> eastStairsOnly(TreeNode root) { List<Integer> v = new ArrayList<>(); for (TreeNode n = root; n != null; n = n.right) v.add(n.val); return v; }
    static List<Double> averagesIntSum(TreeNode root) {
        List<Double> out = new ArrayList<>(); Queue<TreeNode> q = new ArrayDeque<>(); q.offer(root);
        while (!q.isEmpty()) { int size = q.size(); int sum = 0; for (int i = 0; i < size; i++) { TreeNode n = q.poll(); sum += n.val; if (n.left != null) q.offer(n.left); if (n.right != null) q.offer(n.right); } out.add((double) sum / size); }
        return out;
    }
    static List<Double> averagesLongDivision(TreeNode root) {
        List<Double> out = new ArrayList<>(); Queue<TreeNode> q = new ArrayDeque<>(); q.offer(root);
        while (!q.isEmpty()) { int size = q.size(); long sum = 0; for (int i = 0; i < size; i++) { TreeNode n = q.poll(); sum += n.val; if (n.left != null) q.offer(n.left); if (n.right != null) q.offer(n.right); } out.add((double) (sum / size)); }
        return out;
    }
    static int minDepthNaive(TreeNode t) { if (t == null) return 0; return 1 + Math.min(minDepthNaive(t.left), minDepthNaive(t.right)); }
    static int widthNoRenumberInt(TreeNode root) {   // positions wrap around in int; differences survive
        if (root == null) return 0;
        Queue<TreeNode> q = new ArrayDeque<>(); Queue<Integer> p = new ArrayDeque<>(); q.offer(root); p.offer(0);
        int best = 0;
        while (!q.isEmpty()) {
            int size = q.size(), first = p.peek(), last = first;
            for (int i = 0; i < size; i++) { TreeNode n = q.poll(); int pos = p.poll(); last = pos; if (n.left != null) { q.offer(n.left); p.offer(2 * pos + 1); } if (n.right != null) { q.offer(n.right); p.offer(2 * pos + 2); } }
            best = Math.max(best, last - first + 1);
        }
        return best;
    }
    static boolean cousinsDepthOnly(TreeNode root, int x, int y) { Map<Integer, int[]> m = new HashMap<>(); depthParent(root, null, 0, m); return m.get(x)[0] == m.get(y)[0]; }
    static List<Integer> distanceNoVisited(TreeNode root, TreeNode target, int k) {
        Map<TreeNode, TreeNode> parent = new HashMap<>();
        for (TreeNode n : all(root)) { if (n.left != null) parent.put(n.left, n); if (n.right != null) parent.put(n.right, n); }
        Queue<TreeNode> q = new ArrayDeque<>(); q.offer(target);
        for (int beat = 0; beat < k && !q.isEmpty(); beat++) {
            int size = q.size();
            for (int i = 0; i < size; i++) { TreeNode n = q.poll(); for (TreeNode nx : new TreeNode[]{n.left, n.right, parent.get(n)}) if (nx != null) q.offer(nx); }
        }
        List<Integer> out = new ArrayList<>(); for (TreeNode n : q) out.add(n.val); return out;
    }

    // ---------- next-pointer Nodes (three separate static classes), handled by reflection ----------
    static Object toNode(Class<?> cls, TreeNode t) throws Exception {
        if (t == null) return null;
        Constructor<?> c = cls.getDeclaredConstructor(int.class);
        Object n = c.newInstance(t.val);
        cls.getDeclaredField("left").set(n, toNode(cls, t.left));
        cls.getDeclaredField("right").set(n, toNode(cls, t.right));
        return n;
    }
    static Object field(Object n, String f) throws Exception { return n.getClass().getDeclaredField(f).get(n); }
    static void nodeRows(Object n, int d, List<List<Object>> r) throws Exception {
        if (n == null) return;
        if (r.size() == d) r.add(new ArrayList<>());
        r.get(d).add(n);
        nodeRows(field(n, "left"), d + 1, r);
        nodeRows(field(n, "right"), d + 1, r);
    }
    static void checkNext(Object root, String what) throws Exception {
        List<List<Object>> r = new ArrayList<>(); nodeRows(root, 0, r);
        for (List<Object> row : r) for (int i = 0; i < row.size(); i++)
            ok(field(row.get(i), "next") == (i + 1 < row.size() ? row.get(i + 1) : null), what + ": wrong next pointer");
    }

    public static void main(String[] args) throws Exception {
        TreeNode lc = build(3, 9, 20, null, null, 15, 7);
        TreeNode seven = build(1, 2, 3, 4, 5, 6, 7);

        // ---------- Chapter 1: Level Order ----------
        List<List<Integer>> lcRows = List.of(List.of(3), List.of(9, 20), List.of(15, 7));
        eq(lcRows, new B_levelOrder().levelOrder(lc), "level order LC example");
        eq(lcRows, new B_levelOrderMarker().levelOrder(lc), "marker version LC example");
        eq(List.of(), new B_levelOrder().levelOrder(null), "level order empty");
        eq(List.of(), new B_levelOrderMarker().levelOrder(null), "marker empty");
        eq(List.of(List.of(1)), new B_levelOrder().levelOrder(build(1)), "level order single");
        eq(List.of(List.of(3, 9), List.of(20, 15), List.of(7)), liveBound(lc), "catch-the-bug: live bound");
        eq(List.of(List.of(1)), liveBound(build(1)), "the live bound passes on one node");
        eq(List.of(List.of(1), List.of()), linkedListNulls(build(1)), "LinkedList with nulls: phantom floor on [1]");
        boolean threw = false;
        try { new ArrayDeque<TreeNode>().offer(null); } catch (NullPointerException e) { threw = true; }
        ok(threw, "ArrayDeque refuses null");
        threw = false;
        try { Queue<TreeNode> q = new ArrayDeque<>(); q.offer(build()); } catch (NullPointerException e) { threw = true; }
        ok(threw, "offering a null root to ArrayDeque throws");
        for (TreeNode t : sampleTrees(2500, false)) {
            eq(rows(t), new B_levelOrder().levelOrder(t), "levelOrder");
            eq(rows(t), new B_levelOrderMarker().levelOrder(t), "levelOrderMarker");
        }
        { // complete tree of 15: bottom floor is (n + 1) / 2 = 8, and the line peaks at 8
            TreeNode c = perfect(4, new int[]{1});
            eq(8, rows(c).get(3).size(), "complete tree bottom floor");
            Queue<TreeNode> q = new ArrayDeque<>(); q.offer(c); int peak = 1;
            while (!q.isEmpty()) { TreeNode n = q.poll(); if (n.left != null) q.offer(n.left); if (n.right != null) q.offer(n.right); peak = Math.max(peak, q.size()); }
            eq(8, peak, "complete tree peak line");
        }

        // ---------- Chapter 2: Zigzag ----------
        eq(List.of(List.of(3), List.of(20, 9), List.of(15, 7)), new B_zigzagLevelOrder().zigzagLevelOrder(lc), "zigzag LC example");
        eq(List.of(List.of(1), List.of(3, 2), List.of(4, 5, 6, 7)), new B_zigzagLevelOrder().zigzagLevelOrder(seven), "zigzag 1..7");
        eq(List.of(), new B_zigzagLevelOrder().zigzagLevelOrder(null), "zigzag empty");
        eq(List.of(List.of(1), List.of(3, 2), List.of(6, 7, 4, 5)), zigzagFlipLine(seven), "catch-the-bug: flipping the line scrambles floor 2");
        for (TreeNode t : sampleTrees(2500, false)) eq(zig(t), new B_zigzagLevelOrder().zigzagLevelOrder(t), "zigzag");

        // ---------- Chapter 3: Right Side View ----------
        TreeNode rv = build(1, 2, 3, null, 5, null, 4), four = build(1, 2, 3, 4);
        eq(List.of(1, 3, 4), new B_rightSideView().rightSideView(rv), "right view LC example");
        eq(List.of(1, 3, 4), new B_rightSideViewDfs().rightSideView(rv), "right view DFS LC example");
        eq(List.of(1, 3, 4), new B_rightSideView().rightSideView(four), "right view [1,2,3,4]");
        eq(List.of(1, 3, 4), new B_rightSideViewDfs().rightSideView(four), "right view DFS [1,2,3,4]");
        eq(List.of(1, 3), new B_rightSideView().rightSideView(build(1, null, 3)), "right view LC 2");
        eq(List.of(), new B_rightSideView().rightSideView(null), "right view empty");
        eq(List.of(), new B_rightSideViewDfs().rightSideView(null), "right view DFS empty");
        eq(List.of(1, 3), eastStairsOnly(four), "catch-the-bug: east stairs only loses floor 2");
        eq(List.of(1, 3, 4), eastStairsOnly(rv), "east stairs only passes the LC example by luck");
        eq(List.of(1, 2, 4), firstOfRows(four), "left view of [1,2,3,4]");
        for (TreeNode t : sampleTrees(2500, false)) {
            eq(lastOfRows(t), new B_rightSideView().rightSideView(t), "rightSideView");
            eq(lastOfRows(t), new B_rightSideViewDfs().rightSideView(t), "rightSideView DFS");
        }

        // ---------- Side quest 1: Average of Levels ----------
        eq(List.of(3.0, 14.5, 11.0), new B_averageOfLevels().averageOfLevels(lc), "averages LC example");
        TreeNode big = build(Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE);
        eq(List.of(2147483647.0, 2147483647.0), new B_averageOfLevels().averageOfLevels(big), "averages at int max");
        eq(List.of(2147483647.0, -1.0), averagesIntSum(big), "catch-the-bug: int sum overflows to -1.0");
        eq(List.of(3.0, 14.0, 11.0), averagesLongDivision(lc), "catch-the-bug: long division truncates 14.5");
        TreeNode small = build(Integer.MIN_VALUE, Integer.MIN_VALUE, Integer.MIN_VALUE);
        eq(List.of(-2147483648.0, -2147483648.0), new B_averageOfLevels().averageOfLevels(small), "averages at int min");
        for (TreeNode t : sampleTrees(2500, false)) if (t != null) eq(averages(t), new B_averageOfLevels().averageOfLevels(t), "averageOfLevels");

        // ---------- Side quest 2: Minimum Depth ----------
        eq(2, new B_minDepth().minDepth(lc), "min depth LC 1");
        eq(5, new B_minDepth().minDepth(build(2, null, 3, null, 4, null, 5, null, 6)), "min depth LC 2 (chain)");
        eq(2, new B_minDepth().minDepth(build(1, 2)), "min depth [1,2]");
        eq(2, new B_minDepthDfs().minDepth(build(1, 2)), "min depth DFS [1,2]");
        eq(1, minDepthNaive(build(1, 2)), "catch-the-bug: naive min returns 1 on [1,2]");
        eq(0, new B_minDepth().minDepth(null), "min depth empty");
        eq(2, new B_minDepth().minDepth(build(1, 2, 3, null, null, null, 4, null, 5, null, 6)), "min depth figure");
        { // the long-chain case from the lesson: leaf on floor 1, a 100,000-room chain below
            TreeNode root = new TreeNode(1); root.left = new TreeNode(2); TreeNode cur = root.right = new TreeNode(3);
            for (int i = 0; i < 100000; i++) { cur.right = new TreeNode(i); cur = cur.right; }
            eq(2, new B_minDepth().minDepth(root), "min depth with a 100,000 chain");
        }
        for (TreeNode t : sampleTrees(2500, false)) {
            eq(shortestLeafPath(t), new B_minDepth().minDepth(t), "minDepth");
            eq(shortestLeafPath(t), new B_minDepthDfs().minDepth(t), "minDepth DFS");
        }

        // ---------- Side quest 3: Maximum Width ----------
        eq(4, new B_widthOfBinaryTree().widthOfBinaryTree(build(1, 3, 2, 5, 3, null, 9)), "width LC 1");
        eq(7, new B_widthOfBinaryTree().widthOfBinaryTree(build(1, 3, 2, 5, null, null, 9, 6, null, 7)), "width LC 2");
        eq(2, new B_widthOfBinaryTree().widthOfBinaryTree(build(1, 3, 2, 5)), "width LC 3");
        eq(0, new B_widthOfBinaryTree().widthOfBinaryTree(null), "width empty");
        eq(1, new B_widthOfBinaryTree().widthOfBinaryTree(build(1)), "width single");
        for (int depth : new int[]{30, 31, 32, 62, 63, 64, 100, 2998}) {   // deep chains, then two children at the bottom
            TreeNode root = new TreeNode(0), cur = root;
            for (int i = 0; i < depth; i++) { if (i % 3 == 1) { cur.right = new TreeNode(i); cur = cur.right; } else { cur.left = new TreeNode(i); cur = cur.left; } }
            cur.left = new TreeNode(-1); cur.right = new TreeNode(-2);
            eq(2, new B_widthOfBinaryTree().widthOfBinaryTree(root), "width deep chain " + depth);
            eq(2, widthNoRenumberInt(root), "reveal: wrapped int positions still subtract correctly, depth " + depth);
            if (depth <= 100) eq(2, widthOracle(root), "BigInteger oracle deep chain " + depth);
        }
        { // a wide bottom floor under a deep chain: answer 4 even at depth 70
            TreeNode root = new TreeNode(0), cur = root;
            for (int i = 0; i < 70; i++) { cur.right = new TreeNode(i); cur = cur.right; }
            cur.left = new TreeNode(1); cur.right = new TreeNode(2); cur.left.left = new TreeNode(3); cur.right.right = new TreeNode(4);
            eq(widthOracle(root), new B_widthOfBinaryTree().widthOfBinaryTree(root), "width under a 70-chain");
            eq(4, widthOracle(root), "oracle width under a 70-chain");
        }
        ok((int) 2147483647L > (int) 2147483648L, "reveal: wrapped seats compare the wrong way");
        for (TreeNode t : sampleTrees(2500, false)) {
            eq(widthOracle(t), new B_widthOfBinaryTree().widthOfBinaryTree(t), "widthOfBinaryTree");
            eq(widthOracle(t), widthNoRenumberInt(t), "naive int width on small trees");
        }

        // ---------- Side quest 4: Populating Next Right Pointers ----------
        for (int h = 0; h <= 8; h++) {
            TreeNode p = perfect(h, new int[]{1});
            Object a = toNode(B_connect.Node.class, p);
            checkNext(new B_connect().connect((B_connect.Node) a), "connect perfect h=" + h);
            Object b = toNode(B_connectQueue.Node.class, p);
            checkNext(new B_connectQueue().connect((B_connectQueue.Node) b), "connectQueue perfect h=" + h);
            Object c = toNode(B_connectAny.Node.class, p);
            checkNext(new B_connectAny().connect((B_connectAny.Node) c), "connectAny perfect h=" + h);
        }
        { // catch-the-bug: without the rope across the gap, 5.next stays null in 1..7
            B_connect.Node root = (B_connect.Node) toNode(B_connect.Node.class, seven);
            for (B_connect.Node leftmost = root; leftmost != null && leftmost.left != null; leftmost = leftmost.left)
                for (B_connect.Node head = leftmost; head != null; head = head.next) head.left.next = head.right;
            eq(null, root.left.right.next, "catch-the-bug: 5.next is null without the cross rope");
            B_connect.Node good = new B_connect().connect((B_connect.Node) toNode(B_connect.Node.class, seven));
            eq(6, good.left.right.next.val, "5.next is 6 with the cross rope");
        }
        for (TreeNode t : sampleTrees(2500, false)) {
            checkNext(new B_connectQueue().connect((B_connectQueue.Node) toNode(B_connectQueue.Node.class, t)), "connectQueue random");
            checkNext(new B_connectAny().connect((B_connectAny.Node) toNode(B_connectAny.Node.class, t)), "connectAny random");
        }

        // ---------- Side quest 5: Cousins ----------
        eq(false, new B_isCousins().isCousins(build(1, 2, 3, 4), 4, 3), "cousins LC 1");
        eq(true, new B_isCousins().isCousins(build(1, 2, 3, null, 4, null, 5), 5, 4), "cousins LC 2");
        eq(false, new B_isCousins().isCousins(build(1, 2, 3, null, 4), 2, 3), "cousins LC 3 (siblings)");
        eq(false, new B_isCousins().isCousins(build(1, 2, 3), 2, 3), "siblings [1,2,3]");
        eq(true, cousinsDepthOnly(build(1, 2, 3), 2, 3), "catch-the-bug: depth only calls siblings cousins");
        for (TreeNode t : sampleTrees(2500, true)) {
            if (t == null) continue;
            List<TreeNode> ns = all(t);
            if (ns.size() < 2) continue;
            Map<Integer, int[]> m = new HashMap<>(); depthParent(t, null, 0, m);
            for (int trial = 0; trial < 4; trial++) {
                int x = ns.get(R.nextInt(ns.size())).val, y = ns.get(R.nextInt(ns.size())).val;
                if (x == y) continue;
                boolean expect = m.get(x)[0] == m.get(y)[0] && m.get(x)[1] != m.get(y)[1];
                eq(expect, new B_isCousins().isCousins(t, x, y), "isCousins " + x + "," + y);
            }
        }

        // ---------- Side quest 6: All Nodes Distance K ----------
        {
            TreeNode root = build(3, 5, 1, 6, 2, 0, 8, null, null, 7, 4);
            TreeNode target = findVal(root, 5);
            List<Integer> got = new ArrayList<>(new B_distanceK().distanceK(root, target, 2)); Collections.sort(got);
            eq(List.of(1, 4, 7), got, "distance K LC example");
            eq(List.of(5, 7, 4, 5, 5, 1), distanceNoVisited(root, target, 2), "catch-the-bug: no visited set bounces back");
            eq(List.of(), new B_distanceK().distanceK(build(1), findVal(build(1), 1), 3), "distance K beyond the tree");
            TreeNode one = build(1);
            eq(List.of(1), new B_distanceK().distanceK(one, one, 0), "distance 0 is the target itself");
        }
        for (TreeNode t : sampleTrees(2500, true)) {
            if (t == null) continue;
            List<TreeNode> ns = all(t);
            for (int trial = 0; trial < 3; trial++) {
                TreeNode target = ns.get(R.nextInt(ns.size()));
                int k = R.nextInt(7);
                List<Integer> got = new ArrayList<>(new B_distanceK().distanceK(t, target, k)); Collections.sort(got);
                eq(distanceOracle(t, target, k), got, "distanceK k=" + k);
            }
        }

        System.out.println("OK trees-bfs: " + cases + " checks passed");
    }
}
