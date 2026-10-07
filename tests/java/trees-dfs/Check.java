import java.util.*;
import java.util.function.*;

// Runs every Java solution shown in trees-dfs.mdx against independent oracles (row-by-row listings,
// parent maps, all-pairs path enumeration, subset brute force) on hand-picked edge cases plus thousands of
// random trees: empty, single node, left/right/zigzag vines, random shapes, duplicates, int extremes.
// It also proves each "catch the bug" version named in the lesson fails on the input the lesson names.
public class Check {
    static final Random R = new Random(9);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + expected + " but got " + actual);
    }

    // ---------- building and describing trees (LeetCode level order) ----------
    static TreeNode build(Integer... level) {
        if (level.length == 0 || level[0] == null) return null;
        TreeNode root = new TreeNode(level[0]);
        Deque<TreeNode> queue = new ArrayDeque<>(List.of(root));
        int i = 1;
        while (!queue.isEmpty() && i < level.length) {
            TreeNode n = queue.poll();
            if (i < level.length && level[i] != null) { n.left = new TreeNode(level[i]); queue.add(n.left); }
            i++;
            if (i < level.length && level[i] != null) { n.right = new TreeNode(level[i]); queue.add(n.right); }
            i++;
        }
        return root;
    }
    static List<Integer> level(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> queue = new ArrayDeque<>();
        List<TreeNode> order = new ArrayList<>();
        if (root != null) { order.add(root); }
        for (int h = 0; h < order.size(); h++) {
            TreeNode n = order.get(h);
            if (n == null) { out.add(null); continue; }
            out.add(n.val);
            order.add(n.left);
            order.add(n.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1) == null) out.remove(out.size() - 1);
        return out;
    }
    // Rows with markers: each row lists the children (null for empty) of the previous row's real nodes.
    static List<List<Integer>> rows(TreeNode root) {
        List<List<Integer>> out = new ArrayList<>();
        List<TreeNode> row = new ArrayList<>();
        row.add(root);
        while (!row.isEmpty()) {
            List<Integer> vals = new ArrayList<>();
            List<TreeNode> next = new ArrayList<>();
            for (TreeNode n : row) { vals.add(n == null ? null : n.val); if (n != null) { next.add(n.left); next.add(n.right); } }
            out.add(vals);
            row = next;
        }
        return out;
    }
    static TreeNode copy(TreeNode t) { return t == null ? null : new TreeNode(t.val, copy(t.left), copy(t.right)); }
    static List<TreeNode> all(TreeNode root) {
        List<TreeNode> out = new ArrayList<>();
        Deque<TreeNode> todo = new ArrayDeque<>();
        if (root != null) todo.push(root);
        while (!todo.isEmpty()) { TreeNode n = todo.pop(); out.add(n); if (n.right != null) todo.push(n.right); if (n.left != null) todo.push(n.left); }
        return out;
    }
    static Map<TreeNode, TreeNode> parents(TreeNode root) {
        Map<TreeNode, TreeNode> p = new IdentityHashMap<>();
        for (TreeNode n : all(root)) { if (n.left != null) p.put(n.left, n); if (n.right != null) p.put(n.right, n); }
        return p;
    }
    static List<TreeNode> upFrom(TreeNode n, Map<TreeNode, TreeNode> par) {
        List<TreeNode> out = new ArrayList<>();
        for (TreeNode c = n; c != null; c = par.get(c)) out.add(c);
        return out;                                  // n, its parent, ..., root
    }
    // The unique path between a and b, as a list of nodes.
    static List<TreeNode> path(TreeNode a, TreeNode b, Map<TreeNode, TreeNode> par) {
        List<TreeNode> ua = upFrom(a, par), ub = upFrom(b, par);
        Set<TreeNode> inA = Collections.newSetFromMap(new IdentityHashMap<>());
        inA.addAll(ua);
        TreeNode meet = null;
        for (TreeNode x : ub) if (inA.contains(x)) { meet = x; break; }
        List<TreeNode> out = new ArrayList<>();
        for (TreeNode x : ua) { out.add(x); if (x == meet) break; }
        List<TreeNode> tail = new ArrayList<>();
        for (TreeNode x : ub) { if (x == meet) break; tail.add(x); }
        Collections.reverse(tail);
        out.addAll(tail);
        return out;
    }
    static int rowsCount(TreeNode t) {                 // depth, counted row by row
        int d = 0;
        List<TreeNode> row = t == null ? List.of() : List.of(t);
        while (!row.isEmpty()) { d++; List<TreeNode> next = new ArrayList<>(); for (TreeNode n : row) { if (n.left != null) next.add(n.left); if (n.right != null) next.add(n.right); } row = next; }
        return d;
    }
    static void inorderInto(TreeNode t, List<Integer> out) { if (t == null) return; inorderInto(t.left, out); out.add(t.val); inorderInto(t.right, out); }
    static void preorderInto(TreeNode t, List<Integer> out) { if (t == null) return; out.add(t.val); preorderInto(t.left, out); preorderInto(t.right, out); }
    static void postorderInto(TreeNode t, List<Integer> out) { if (t == null) return; postorderInto(t.left, out); postorderInto(t.right, out); out.add(t.val); }
    static List<Integer> inorder(TreeNode t) { List<Integer> o = new ArrayList<>(); inorderInto(t, o); return o; }
    static List<Integer> preorder(TreeNode t) { List<Integer> o = new ArrayList<>(); preorderInto(t, o); return o; }
    static List<Integer> postorder(TreeNode t) { List<Integer> o = new ArrayList<>(); postorderInto(t, o); return o; }

    // ---------- random trees ----------
    static TreeNode randTree(int n, IntSupplier value) {
        if (n == 0) return null;
        List<TreeNode> nodes = new ArrayList<>();
        TreeNode root = new TreeNode(value.getAsInt());
        nodes.add(root);
        while (nodes.size() < n) {
            TreeNode p = nodes.get(R.nextInt(nodes.size()));
            boolean left = R.nextBoolean();
            if ((left ? p.left : p.right) != null) continue;       // slot taken: pick again
            TreeNode c = new TreeNode(value.getAsInt());
            if (left) p.left = c; else p.right = c;
            nodes.add(c);
        }
        return root;
    }
    static TreeNode vine(int n, char kind, IntUnaryOperator value) {   // kind: L, R or Z (zigzag)
        if (n == 0) return null;
        TreeNode root = new TreeNode(value.applyAsInt(0)), cur = root;
        for (int i = 1; i < n; i++) {
            TreeNode c = new TreeNode(value.applyAsInt(i));
            boolean left = kind == 'L' || (kind == 'Z' && i % 2 == 1);
            if (left) cur.left = c; else cur.right = c;
            cur = c;
        }
        return root;
    }
    static TreeNode anyTree(int maxN, int lo, int hi) {
        int n = R.nextInt(maxN + 1);
        IntSupplier v = () -> lo + R.nextInt(hi - lo + 1);
        switch (R.nextInt(8)) {
            case 0: return vine(n, "LRZ".charAt(R.nextInt(3)), i -> v.getAsInt());
            case 1: return n == 0 ? null : new TreeNode(v.getAsInt());
            default: return randTree(n, v);
        }
    }
    static TreeNode uniqueTree(int maxN) {             // distinct values, random shape (incl. vines)
        int n = R.nextInt(maxN + 1);
        List<Integer> vals = new ArrayList<>();
        for (int i = 0; i < n; i++) vals.add(i * 3 - 10);
        Collections.shuffle(vals, R);
        Iterator<Integer> it = vals.iterator();
        if (R.nextInt(5) == 0) return vine(n, "LRZ".charAt(R.nextInt(3)), i -> it.next());
        return randTree(n, it::next);
    }
    static TreeNode insert(TreeNode root, int v) {
        if (root == null) return new TreeNode(v);
        if (v < root.val) root.left = insert(root.left, v); else root.right = insert(root.right, v);
        return root;
    }
    static TreeNode randBST(int maxN, int lo, int hi) {   // distinct values; sorted insertion order gives vines
        int n = R.nextInt(maxN + 1);
        TreeSet<Integer> set = new TreeSet<>();
        while (set.size() < Math.min(n, hi - lo + 1)) set.add(lo + R.nextInt(hi - lo + 1));
        List<Integer> vals = new ArrayList<>(set);
        int mode = R.nextInt(4);
        if (mode == 0) Collections.reverse(vals); else if (mode >= 2) Collections.shuffle(vals, R);
        TreeNode root = null;
        for (int x : vals) root = insert(root, x);
        return root;
    }

    // ---------- independent oracles ----------
    static int bruteDiameter(TreeNode root) {
        Map<TreeNode, TreeNode> par = parents(root);
        int best = 0;
        for (TreeNode a : all(root)) for (TreeNode b : all(root)) best = Math.max(best, path(a, b, par).size() - 1);
        return best;
    }
    static int bruteMaxPath(TreeNode root) {
        Map<TreeNode, TreeNode> par = parents(root);
        int best = Integer.MIN_VALUE;
        for (TreeNode a : all(root)) for (TreeNode b : all(root)) { int s = 0; for (TreeNode x : path(a, b, par)) s += x.val; best = Math.max(best, s); }
        return best;
    }
    static boolean bruteBalanced(TreeNode root) {
        for (TreeNode n : all(root)) if (Math.abs(rowsCount(n.left) - rowsCount(n.right)) > 1) return false;
        return true;
    }
    static TreeNode bruteLca(TreeNode root, TreeNode p, TreeNode q) {
        Map<TreeNode, TreeNode> par = parents(root);
        Set<TreeNode> up = Collections.newSetFromMap(new IdentityHashMap<>());
        up.addAll(upFrom(p, par));
        for (TreeNode x : upFrom(q, par)) if (up.contains(x)) return x;
        return null;
    }
    static List<List<Integer>> brutePaths(TreeNode root, int target) {
        Map<TreeNode, TreeNode> par = parents(root);
        List<List<Integer>> out = new ArrayList<>();
        for (TreeNode n : all(root)) if (n.left == null && n.right == null) {
            List<Integer> p = new ArrayList<>();
            for (TreeNode x : upFrom(n, par)) p.add(x.val);
            Collections.reverse(p);
            if (p.stream().mapToInt(Integer::intValue).sum() == target) out.add(p);
        }
        return out;
    }
    static List<String> sortedStrings(List<List<Integer>> lists) { List<String> s = new ArrayList<>(); for (List<Integer> l : lists) s.add(l.toString()); Collections.sort(s); return s; }
    static boolean bruteBST(TreeNode root) {
        List<Integer> v = inorder(root);
        for (int i = 1; i < v.size(); i++) if ((long) v.get(i - 1) >= (long) v.get(i)) return false;
        return true;
    }
    static boolean bruteSymmetric(TreeNode root) {
        for (List<Integer> row : rows(root)) { List<Integer> rev = new ArrayList<>(row); Collections.reverse(rev); if (!rev.equals(row)) return false; }
        return true;
    }
    static boolean mirrored(TreeNode orig, TreeNode inv) {   // every row of inv is its row in orig, reversed
        List<List<Integer>> a = rows(orig), b = rows(inv);
        if (a.size() != b.size()) return false;
        for (int i = 0; i < a.size(); i++) { List<Integer> rev = new ArrayList<>(a.get(i)); Collections.reverse(rev); if (!rev.equals(b.get(i))) return false; }
        return true;
    }
    static int bruteGood(TreeNode root) {
        Map<TreeNode, TreeNode> par = parents(root);
        int c = 0;
        for (TreeNode n : all(root)) { boolean ok = true; for (TreeNode x : upFrom(n, par)) if (x.val > n.val) ok = false; if (ok) c++; }
        return c;
    }
    static int bruteRob(TreeNode root) {
        List<TreeNode> ns = all(root);
        Map<TreeNode, TreeNode> par = parents(root);
        Map<TreeNode, Integer> idx = new IdentityHashMap<>();
        for (int i = 0; i < ns.size(); i++) idx.put(ns.get(i), i);
        int best = 0;
        for (int mask = 0; mask < (1 << ns.size()); mask++) {
            boolean ok = true; int s = 0;
            for (int i = 0; i < ns.size() && ok; i++) if ((mask >> i & 1) == 1) {
                s += ns.get(i).val;
                TreeNode p = par.get(ns.get(i));
                if (p != null && (mask >> idx.get(p) & 1) == 1) ok = false;
            }
            if (ok) best = Math.max(best, s);
        }
        return best;
    }

    // ---------- the buggy versions the lesson names ----------
    static TreeNode invertBug(TreeNode root) {
        if (root == null) return null;
        root.left = invertBug(root.right);
        root.right = invertBug(root.left);
        return root;
    }
    static boolean sameByListing(TreeNode p, TreeNode q) { return preorder(p).equals(preorder(q)); }
    static int minDepthBug(TreeNode root) { return root == null ? 0 : 1 + Math.min(minDepthBug(root.left), minDepthBug(root.right)); }
    static int plainHeight(TreeNode t) { return t == null ? 0 : 1 + Math.max(plainHeight(t.left), plainHeight(t.right)); }
    static boolean balancedRootOnly(TreeNode root) { return root == null || Math.abs(plainHeight(root.left) - plainHeight(root.right)) <= 1; }
    static int diameterRootOnly(TreeNode root) { return root == null ? 0 : plainHeight(root.left) + plainHeight(root.right); }
    static int gainBest;
    static int gainNoClamp(TreeNode n) { if (n == null) return 0; int l = gainNoClamp(n.left), r = gainNoClamp(n.right); gainBest = Math.max(gainBest, n.val + l + r); return n.val + Math.max(l, r); }
    static int maxPathNoClamp(TreeNode root) { gainBest = Integer.MIN_VALUE; gainNoClamp(root); return gainBest; }
    static int gainZero(TreeNode n) { if (n == null) return 0; int l = Math.max(0, gainZero(n.left)), r = Math.max(0, gainZero(n.right)); gainBest = Math.max(gainBest, n.val + l + r); return n.val + Math.max(l, r); }
    static int maxPathZeroStart(TreeNode root) { gainBest = 0; gainZero(root); return gainBest; }
    static void walkNoCopy(TreeNode n, int rem, List<Integer> path, List<List<Integer>> out) {
        if (n == null) return;
        path.add(n.val); rem -= n.val;
        if (n.left == null && n.right == null && rem == 0) out.add(path);
        walkNoCopy(n.left, rem, path, out); walkNoCopy(n.right, rem, path, out);
        path.remove(path.size() - 1);
    }
    static void walkAtNull(TreeNode n, int rem, List<Integer> path, List<List<Integer>> out) {
        if (n == null) { if (rem == 0) out.add(new ArrayList<>(path)); return; }
        path.add(n.val);
        walkAtNull(n.left, rem - n.val, path, out); walkAtNull(n.right, rem - n.val, path, out);
        path.remove(path.size() - 1);
    }
    static boolean validLocal(TreeNode n) {
        if (n == null) return true;
        if (n.left != null && n.left.val >= n.val) return false;
        if (n.right != null && n.right.val <= n.val) return false;
        return validLocal(n.left) && validLocal(n.right);
    }
    static boolean validIntBounds(TreeNode n, int low, int high) {
        if (n == null) return true;
        if (n.val <= low || n.val >= high) return false;
        return validIntBounds(n.left, low, n.val) && validIntBounds(n.right, n.val, high);
    }
    static int bugNext;
    static Map<Integer, Integer> bugWhere;
    static TreeNode buildRightFirst(int[] pre, int[] in) {
        bugNext = 0; bugWhere = new HashMap<>();
        for (int i = 0; i < in.length; i++) bugWhere.put(in[i], i);
        return bugBuild(pre, 0, in.length - 1);
    }
    static TreeNode bugBuild(int[] pre, int lo, int hi) {
        if (lo > hi) return null;
        TreeNode root = new TreeNode(pre[bugNext++]);
        int mid = bugWhere.get(root.val);
        root.right = bugBuild(pre, mid + 1, hi);
        root.left = bugBuild(pre, lo, mid - 1);
        return root;
    }
    static TreeNode lcaNoBoth(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null || root == p || root == q) return root;
        TreeNode left = lcaNoBoth(root.left, p, q), right = lcaNoBoth(root.right, p, q);
        return left != null ? left : right;
    }
    static int kthAnswer;
    static void kthParam(TreeNode node, int k) {          // BUG: k is a copy
        if (node == null) return;
        kthParam(node.left, k);
        if (--k == 0) kthAnswer = node.val;
        kthParam(node.right, k);
    }
    static int kthParamBug(TreeNode root, int k) { kthAnswer = -1; kthParam(root, k); return kthAnswer; }

    public static void main(String[] args) {
        // ---------- Prologue: the three orders ----------
        {
            TreeNode t = build(3, 9, 20, null, null, 15, 7);
            var o = new B_orders();
            eq(List.of(3, 9, 20, 15, 7), o.preorder(t), "figure preorder");
            eq(List.of(9, 3, 15, 20, 7), o.inorder(t), "figure inorder");
            eq(List.of(9, 15, 7, 20, 3), o.postorder(t), "figure postorder");
            for (int k = 0; k < 2000; k++) {
                TreeNode r = anyTree(12, -9, 9);
                // independent: a node-first listing equals root + left listing + right listing, built by explicit stack in all()
                List<Integer> stackPre = new ArrayList<>(); for (TreeNode n : all(r)) stackPre.add(n.val);
                eq(stackPre, o.preorder(r), "preorder");
                eq(inorder(r), o.inorder(r), "inorder");
                eq(postorder(r), o.postorder(r), "postorder");
                // and the in-order listing of a mirrored copy is the reverse
            }
        }

        // ---------- Chapter 1: Invert Binary Tree ----------
        eq(List.of(4, 7, 2, 9, 6, 3, 1), level(new B_invertTree().invertTree(build(4, 2, 7, 1, 3, 6, 9))), "invert LC 1");
        eq(List.of(2, 3, 1), level(new B_invertTree().invertTree(build(2, 1, 3))), "invert LC 2");
        eq(List.of(), level(new B_invertTree().invertTree(null)), "invert empty");
        eq(Arrays.asList(4, 7, 7, 9, 9, 9, 9), level(invertBug(build(4, 2, 7, 1, 3, 6, 9))), "catch-the-bug: invert in place loses the left subtree");
        {
            TreeNode b = invertBug(build(4, 2, 7, 1, 3, 6, 9));
            eq(true, b.left == b.right, "catch-the-bug: both children are the same object");
        }
        eq(Arrays.asList(4, 7, 2, 6, 9, 1, 3), level(build(4, 7, 2, 6, 9, 1, 3)), "trace: root-only swap listing");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = anyTree(12, -9, 9), before = copy(r);
            TreeNode inv = new B_invertTree().invertTree(r);
            eq(true, mirrored(before, inv), "invert " + level(before));
        }

        // ---------- Chapter 2: Same Tree ----------
        eq(true, new B_isSameTree().isSameTree(build(1, 2, 3), build(1, 2, 3)), "same LC 1");
        eq(false, new B_isSameTree().isSameTree(build(1, 2), build(1, null, 2)), "same LC 2");
        eq(false, new B_isSameTree().isSameTree(build(1, 2, 1), build(1, 1, 2)), "same LC 3");
        eq(true, new B_isSameTree().isSameTree(null, null), "same both empty");
        eq(false, new B_isSameTree().isSameTree(build(1), null), "same one empty");
        eq(true, sameByListing(build(1, 2), build(1, null, 2)), "catch-the-bug: listings without markers agree on different trees");
        for (int k = 0; k < 4000; k++) {
            TreeNode a = anyTree(8, 0, 2), b;
            switch (R.nextInt(3)) {
                case 0: b = copy(a); break;
                case 1: { b = copy(a); List<TreeNode> ns = all(b); if (!ns.isEmpty()) { TreeNode x = ns.get(R.nextInt(ns.size())); if (R.nextBoolean()) x.val = R.nextInt(3); else if (x.left == null) x.left = new TreeNode(1); else x.left = null; } break; }
                default: b = anyTree(8, 0, 2);
            }
            eq(level(a).equals(level(b)), new B_isSameTree().isSameTree(a, b), "isSameTree " + level(a) + " vs " + level(b));
        }

        // ---------- Chapter 3: Maximum Depth (+ min depth bug) ----------
        eq(3, new B_maxDepth().maxDepth(build(3, 9, 20, null, null, 15, 7)), "depth LC 1");
        eq(2, new B_maxDepth().maxDepth(build(1, null, 2)), "depth LC 2");
        eq(0, new B_maxDepth().maxDepth(null), "depth empty");
        eq(3, new B_maxDepthTopDown().maxDepth(build(3, 9, 20, null, null, 15, 7)), "top-down depth LC 1");
        eq(0, new B_maxDepthTopDown().maxDepth(null), "top-down depth empty");
        eq(5, new B_minDepth().minDepth(build(2, null, 3, null, 4, null, 5, null, 6)), "minDepth LC 2");
        eq(2, new B_minDepth().minDepth(build(3, 9, 20, null, null, 15, 7)), "minDepth LC 1");
        eq(1, minDepthBug(build(2, null, 3, null, 4, null, 5, null, 6)), "catch-the-bug: 1 + min returns 1 on the vine");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = anyTree(14, -5, 5);
            int d = rowsCount(r);
            eq(d, new B_maxDepth().maxDepth(r), "maxDepth " + level(r));
            eq(d, new B_maxDepthTopDown().maxDepth(r), "maxDepthTopDown " + level(r));
            eq(d, new B_maxDepthIterative().maxDepth(r), "maxDepthIterative " + level(r));
            int min = Integer.MAX_VALUE;                    // shallowest leaf, by parent chains
            Map<TreeNode, TreeNode> par = parents(r);
            for (TreeNode n : all(r)) if (n.left == null && n.right == null) min = Math.min(min, upFrom(n, par).size());
            eq(r == null ? 0 : min, new B_minDepth().minDepth(r), "minDepth " + level(r));
        }

        // ---------- Chapter 4: Balanced Binary Tree ----------
        eq(true, new B_isBalanced().isBalanced(build(3, 9, 20, null, null, 15, 7)), "balanced LC 1");
        eq(false, new B_isBalanced().isBalanced(build(1, 2, 2, 3, 3, null, null, 4, 4)), "balanced LC 2");
        eq(true, new B_isBalanced().isBalanced(null), "balanced empty");
        TreeNode lean = build(1, 2, 2, 3, null, null, 3, 4, null, null, 4);
        eq(false, new B_isBalanced().isBalanced(lean), "balanced figure");
        eq(true, balancedRootOnly(lean), "catch-the-bug: root-only check says yes");
        eq(4, plainHeight(lean), "figure: root height 4");
        eq(3, plainHeight(lean.left), "figure: left height 3");
        eq(2, plainHeight(lean.left.left), "figure: left-left height 2");
        for (int k = 0; k < 4000; k++) {
            TreeNode r = anyTree(12, 0, 3);
            eq(bruteBalanced(r), new B_isBalanced().isBalanced(r), "isBalanced " + level(r));
        }

        // ---------- Chapter 5: Diameter ----------
        eq(3, new B_diameter().diameterOfBinaryTree(build(1, 2, 3, 4, 5)), "diameter LC 1");
        eq(1, new B_diameter().diameterOfBinaryTree(build(1, 2)), "diameter LC 2");
        eq(0, new B_diameter().diameterOfBinaryTree(build(1)), "diameter single");
        TreeNode bend = build(1, 2, null, 3, 4, 5, null, null, 6, 7, null, null, 8);
        eq(6, new B_diameter().diameterOfBinaryTree(bend), "diameter figure");
        eq(4, diameterRootOnly(bend), "catch-the-bug: root-only bend gives 4");
        eq(5, plainHeight(bend), "figure: the root returns 5");
        eq(4, new B_diameter().diameterOfBinaryTree(build(1, 2, null, 3, 4, 5, null, null, 6)), "diameter trace tree");
        eq(3, diameterRootOnly(build(1, 2, null, 3, 4, 5, null, null, 6)), "trace: root left + right = 3");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = anyTree(11, 0, 5);
            if (r == null) continue;
            eq(bruteDiameter(r), new B_diameter().diameterOfBinaryTree(r), "diameter " + level(r));
        }

        // ---------- Chapter 6: Binary Tree Maximum Path Sum ----------
        eq(6, new B_maxPathSum().maxPathSum(build(1, 2, 3)), "maxPath LC 1");
        eq(42, new B_maxPathSum().maxPathSum(build(-10, 9, 20, null, null, 15, 7)), "maxPath LC 2");
        eq(-3, new B_maxPathSum().maxPathSum(build(-3)), "maxPath all negative");
        eq(2, new B_maxPathSum().maxPathSum(build(2, -1)), "maxPath clamp");
        eq(-1, new B_maxPathSum().maxPathSum(build(-2, -1)), "maxPath LC [-2,-1]");
        eq(0, maxPathZeroStart(build(-3)), "catch-the-bug: best = 0 returns 0 on [-3]");
        eq(1, maxPathNoClamp(build(2, -1)), "catch-the-bug: no clamp returns 1 on [2,-1]");
        eq(1000, new B_maxPathSum().maxPathSum(build(1000)), "maxPath bound");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = anyTree(10, -9, 9);
            if (r == null) continue;
            eq(bruteMaxPath(r), new B_maxPathSum().maxPathSum(r), "maxPathSum " + level(r));
        }

        // ---------- Chapter 7: Lowest Common Ancestor ----------
        {
            TreeNode t = build(3, 5, 1, 6, 2, 0, 8, null, null, 7, 4);
            Map<Integer, TreeNode> by = new HashMap<>();
            for (TreeNode n : all(t)) by.put(n.val, n);
            eq(3, new B_lca().lowestCommonAncestor(t, by.get(5), by.get(1)).val, "lca LC 1");
            eq(5, new B_lca().lowestCommonAncestor(t, by.get(5), by.get(4)).val, "lca LC 2");
            eq(5, new B_lca().lowestCommonAncestor(t, by.get(6), by.get(4)).val, "lca figure p=6 q=4");
            eq(2, new B_lca().lowestCommonAncestor(t, by.get(7), by.get(4)).val, "lca 7,4");
            eq(6, lcaNoBoth(t, by.get(6), by.get(4)).val, "catch-the-bug: without the both-sides line the answer is 6");
            eq(3, new B_lca().lowestCommonAncestor(t, by.get(5), new TreeNode(99)).val == 5 ? 3 : -1, "reveal: a missing q makes the code return p = 5");
            TreeNode s = build(1, 2);
            eq(1, new B_lca().lowestCommonAncestor(s, s, s.left).val, "lca LC 3");
            for (int k = 0; k < 3000; k++) {
                TreeNode r = uniqueTree(12);
                if (r == null) continue;
                List<TreeNode> ns = all(r);
                TreeNode p = ns.get(R.nextInt(ns.size())), q = ns.get(R.nextInt(ns.size()));
                eq(bruteLca(r, p, q), new B_lca().lowestCommonAncestor(r, p, q), "lca " + level(r) + " p=" + p.val + " q=" + q.val);
            }
        }

        // ---------- Chapter 8: Path Sum II ----------
        {
            TreeNode t = build(5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1);
            eq(List.of(List.of(5, 4, 11, 2), List.of(5, 8, 4, 5)), new B_pathSum().pathSum(t, 22), "pathSum LC 1");
            eq(List.of(), new B_pathSum().pathSum(build(1, 2, 3), 5), "pathSum LC 2");
            eq(List.of(), new B_pathSum().pathSum(build(1, 2), 0), "pathSum LC 3");
            eq(List.of(), new B_pathSum().pathSum(null, 0), "pathSum empty");
            List<List<Integer>> noCopy = new ArrayList<>();
            walkNoCopy(t, 22, new ArrayList<>(), noCopy);
            eq(List.of(List.of(), List.of()), noCopy, "catch-the-bug: storing the live path leaves empty lists");
            List<List<Integer>> atNull = new ArrayList<>();
            walkAtNull(build(1, 2), 1, new ArrayList<>(), atNull);
            eq(List.of(List.of(1)), atNull, "catch-the-bug: checking at empty spots records [1] for [1,2], target 1");
            List<List<Integer>> twice = new ArrayList<>();
            walkAtNull(build(1), 1, new ArrayList<>(), twice);
            eq(List.of(List.of(1), List.of(1)), twice, "catch-the-bug: a real leaf is recorded twice");
            for (int k = 0; k < 3000; k++) {
                TreeNode r = anyTree(12, -3, 4);
                int target = R.nextInt(13) - 4;
                eq(sortedStrings(brutePaths(r, target)), sortedStrings(new B_pathSum().pathSum(r, target)), "pathSum " + level(r) + " t=" + target);
            }
        }

        // ---------- Chapter 9: Validate BST ----------
        for (var v : List.<Predicate<TreeNode>>of(t -> new B_isValidBST().isValidBST(t), t -> new B_isValidBSTInorder().isValidBST(t))) {
            eq(true, v.test(build(2, 1, 3)), "bst LC 1");
            eq(false, v.test(build(5, 1, 4, null, null, 3, 6)), "bst LC 2");
            eq(false, v.test(build(5, 4, 6, null, null, 3, 7)), "bst deep violation");
            eq(false, v.test(build(2, 2, 2)), "bst duplicates");
            eq(false, v.test(build(1, 1)), "bst duplicate left");
            eq(true, v.test(build(Integer.MAX_VALUE)), "bst MAX single");
            eq(true, v.test(build(Integer.MIN_VALUE)), "bst MIN single");
            eq(true, v.test(build(Integer.MIN_VALUE, null, Integer.MAX_VALUE)), "bst MIN -> MAX");
            eq(true, v.test(build(Integer.MAX_VALUE, Integer.MIN_VALUE)), "bst MAX <- MIN");
            eq(false, v.test(build(Integer.MAX_VALUE, null, Integer.MAX_VALUE)), "bst MAX duplicate");
            eq(false, v.test(build(Integer.MIN_VALUE, Integer.MIN_VALUE)), "bst MIN duplicate");
            eq(true, v.test(build(0, Integer.MIN_VALUE, Integer.MAX_VALUE)), "bst extremes as children");
            eq(true, v.test(null), "bst empty");
            eq(true, v.test(build(8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13)), "bst lab case");
        }
        eq(true, validLocal(build(5, 4, 6, null, null, 3, 7)), "catch-the-bug: local checks pass the deep violation");
        eq(false, validIntBounds(build(Integer.MAX_VALUE), Integer.MIN_VALUE, Integer.MAX_VALUE), "catch-the-bug: int bounds reject [2147483647]");
        int[] extremes = {Integer.MIN_VALUE, Integer.MIN_VALUE + 1, -1, 0, 1, Integer.MAX_VALUE - 1, Integer.MAX_VALUE};
        for (int k = 0; k < 5000; k++) {
            TreeNode r;
            int kind = R.nextInt(4);
            if (kind == 0) r = randBST(10, -20, 20);
            else if (kind == 1) { r = randBST(10, -20, 20); List<TreeNode> ns = all(r); if (!ns.isEmpty()) ns.get(R.nextInt(ns.size())).val = R.nextInt(41) - 20; }
            else if (kind == 2) r = anyTree(6, -3, 3);
            else r = randTree(R.nextInt(7), () -> extremes[R.nextInt(extremes.length)]);
            boolean expect = bruteBST(r);
            eq(expect, new B_isValidBST().isValidBST(r), "isValidBST " + level(r));
            eq(expect, new B_isValidBSTInorder().isValidBST(r), "isValidBST (in-order) " + level(r));
        }

        // ---------- Chapter 10: Kth Smallest, the iterative walk, deep vines ----------
        eq(1, new B_kthSmallest().kthSmallest(build(3, 1, 4, null, 2), 1), "kth LC 1");
        eq(3, new B_kthSmallest().kthSmallest(build(5, 3, 6, 2, 4, null, null, 1), 3), "kth LC 2");
        eq(3, new B_kthSmallestRecursive().kthSmallest(build(5, 3, 6, 2, 4, null, null, 1), 3), "kth recursive LC 2");
        eq(-1, kthParamBug(build(5, 3, 6, 2, 4, null, null, 1), 3), "catch-the-bug: the counter as an int parameter returns -1");
        eq(List.of(1, 3, 2), new B_inorderTraversal().inorderTraversal(build(1, null, 2, 3)), "inorder LC 1");
        eq(List.of(), new B_inorderTraversal().inorderTraversal(null), "inorder empty");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = randBST(14, -30, 30);
            if (r == null) continue;
            List<Integer> sorted = inorder(r);
            eq(sorted, new B_inorderTraversal().inorderTraversal(r), "inorderTraversal " + level(r));
            int kk = 1 + R.nextInt(sorted.size());
            eq(sorted.get(kk - 1), new B_kthSmallest().kthSmallest(r, kk), "kthSmallest " + level(r) + " k=" + kk);
            eq(sorted.get(kk - 1), new B_kthSmallestRecursive().kthSmallest(r, kk), "kthSmallestRecursive " + level(r) + " k=" + kk);
            TreeNode any = anyTree(12, -9, 9);
            eq(inorder(any), new B_inorderTraversal().inorderTraversal(any), "inorderTraversal any shape");
        }
        {
            int n = 1_000_000;
            TreeNode deep = vine(n, 'L', i -> n - i);          // a BST: n at the root, n-1 to its left, ...
            boolean overflowed = false;
            try { new B_maxDepth().maxDepth(deep); } catch (StackOverflowError e) { overflowed = true; }
            eq(true, overflowed, "a million-node vine overflows the recursive maxDepth");
            eq(n, new B_maxDepthIterative().maxDepth(deep), "the iterative depth survives the vine");
            eq(1, new B_kthSmallest().kthSmallest(deep, 1), "iterative kth on the vine, k = 1");
            eq(n, new B_kthSmallest().kthSmallest(deep, n), "iterative kth on the vine, k = n");
            eq(n, new B_inorderTraversal().inorderTraversal(deep).size(), "iterative in-order on the vine");
            TreeNode tenK = vine(10_000, 'R', i -> i);
            eq(10_000, new B_maxDepth().maxDepth(tenK), "a 10,000-node vine fits the default stack here");
        }

        // ---------- Chapter 11: Construct from preorder + inorder ----------
        eq(Arrays.asList(3, 9, 20, null, null, 15, 7), level(new B_buildTree().buildTree(new int[]{3, 9, 20, 15, 7}, new int[]{9, 3, 15, 20, 7})), "build LC 1");
        eq(List.of(-1), level(new B_buildTree().buildTree(new int[]{-1}, new int[]{-1})), "build LC 2");
        boolean crashed = false;
        try { buildRightFirst(new int[]{3, 9, 20, 15, 7}, new int[]{9, 3, 15, 20, 7}); } catch (ArrayIndexOutOfBoundsException e) { crashed = true; }
        eq(true, crashed, "catch-the-bug: building right first runs off the end of preorder");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = uniqueTree(14);
            int[] pre = preorder(r).stream().mapToInt(Integer::intValue).toArray();
            int[] in = inorder(r).stream().mapToInt(Integer::intValue).toArray();
            eq(level(r), level(new B_buildTree().buildTree(pre, in)), "buildTree " + level(r));
        }

        // ---------- Chapter 12: Serialize and Deserialize ----------
        {
            var codec = new B_Codec().new Codec();
            eq("1,2,#,#,3,4,#,#,5,#,#", codec.serialize(build(1, 2, 3, null, null, 4, 5)), "serialize figure");
            eq("#", codec.serialize(null), "serialize empty");
            eq(Arrays.asList(1, 2, 3, null, null, 4, 5), level(codec.deserialize("1,2,#,#,3,4,#,#,5,#,#")), "deserialize figure");
            eq(List.of(), level(codec.deserialize("#")), "deserialize empty");
            TreeNode ext = build(Integer.MIN_VALUE, Integer.MAX_VALUE, -1, null, 0);
            eq(level(ext), level(codec.deserialize(codec.serialize(ext))), "codec extremes");
            for (int k = 0; k < 3000; k++) {
                TreeNode r = anyTree(14, -1000, 1000);
                var c = new B_Codec().new Codec();
                eq(level(r), level(c.deserialize(c.serialize(r))), "codec round trip " + level(r));
            }
        }

        // ---------- Side quest 1: Symmetric Tree ----------
        eq(true, new B_isSymmetric().isSymmetric(build(1, 2, 2, 3, 4, 4, 3)), "symmetric LC 1");
        eq(false, new B_isSymmetric().isSymmetric(build(1, 2, 2, null, 3, null, 3)), "symmetric LC 2");
        eq(true, new B_isSymmetric().isSymmetric(build(1)), "symmetric single");
        for (int k = 0; k < 4000; k++) {
            TreeNode r;
            if (R.nextBoolean()) { TreeNode half = anyTree(5, 0, 2); r = new TreeNode(R.nextInt(3), copy(half), new B_invertTree().invertTree(copy(half))); if (R.nextInt(3) == 0) { List<TreeNode> ns = all(r); ns.get(R.nextInt(ns.size())).val = R.nextInt(3); } }
            else r = anyTree(9, 0, 1);
            eq(bruteSymmetric(r), new B_isSymmetric().isSymmetric(r), "isSymmetric " + level(r));
        }

        // ---------- Side quest 2: Subtree of Another Tree ----------
        eq(true, new B_isSubtree().isSubtree(build(3, 4, 5, 1, 2), build(4, 1, 2)), "subtree LC 1");
        eq(false, new B_isSubtree().isSubtree(build(3, 4, 5, 1, 2, null, null, null, null, 0), build(4, 1, 2)), "subtree LC 2");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = anyTree(10, 0, 2);
            TreeNode sub;
            List<TreeNode> ns = all(r);
            if (!ns.isEmpty() && R.nextBoolean()) { sub = copy(ns.get(R.nextInt(ns.size()))); if (R.nextInt(3) == 0) { List<TreeNode> ss = all(sub); ss.get(R.nextInt(ss.size())).val = R.nextInt(3); } }
            else sub = anyTree(4, 0, 2);
            if (sub == null) sub = new TreeNode(R.nextInt(3));
            boolean expect = false;
            for (TreeNode n : ns) if (level(n).equals(level(sub))) expect = true;
            eq(expect, new B_isSubtree().isSubtree(r, sub), "isSubtree " + level(r) + " / " + level(sub));
        }

        // ---------- Side quest 3: Count Good Nodes ----------
        eq(4, new B_goodNodes().goodNodes(build(3, 1, 4, 3, null, 1, 5)), "good LC 1");
        eq(3, new B_goodNodes().goodNodes(build(3, 3, null, 4, 2)), "good LC 2");
        eq(1, new B_goodNodes().goodNodes(build(1)), "good LC 3");
        eq(1, new B_goodNodes().goodNodes(build(Integer.MIN_VALUE)), "good MIN root");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = anyTree(12, -4, 4);
            eq(bruteGood(r), new B_goodNodes().goodNodes(r), "goodNodes " + level(r));
        }

        // ---------- Side quest 4: LCA of a BST ----------
        {
            TreeNode t = build(6, 2, 8, 0, 4, 7, 9, null, null, 3, 5);
            Map<Integer, TreeNode> by = new HashMap<>();
            for (TreeNode n : all(t)) by.put(n.val, n);
            eq(6, new B_lcaBst().lowestCommonAncestor(t, by.get(2), by.get(8)).val, "lca bst LC 1");
            eq(2, new B_lcaBst().lowestCommonAncestor(t, by.get(2), by.get(4)).val, "lca bst LC 2");
            eq(4, new B_lcaBst().lowestCommonAncestor(t, by.get(3), by.get(5)).val, "lca bst 3,5");
            for (int k = 0; k < 3000; k++) {
                TreeNode r = randBST(14, -20, 20);
                if (r == null) continue;
                List<TreeNode> ns = all(r);
                TreeNode p = ns.get(R.nextInt(ns.size())), q = ns.get(R.nextInt(ns.size()));
                eq(bruteLca(r, p, q), new B_lcaBst().lowestCommonAncestor(r, p, q), "lcaBst " + level(r));
            }
        }

        // ---------- Side quest 5: House Robber III ----------
        eq(7, new B_rob().rob(build(3, 2, 3, null, 3, null, 1)), "rob LC 1");
        eq(9, new B_rob().rob(build(3, 4, 5, 1, 3, null, 1)), "rob LC 2");
        eq(7, new B_rob().rob(build(4, 1, null, 2, null, 3)), "rob: alternating levels is not enough");
        eq(0, new B_rob().rob(null), "rob empty");
        for (int k = 0; k < 3000; k++) {
            TreeNode r = anyTree(12, 0, 9);
            eq(bruteRob(r), new B_rob().rob(r), "rob " + level(r));
        }

        // ---------- Side quest 6: Flatten Binary Tree to Linked List ----------
        for (int k = 0; k < 3000; k++) {
            TreeNode r = k == 0 ? build(1, 2, 5, 3, 4, null, 6) : anyTree(12, -9, 9);
            List<Integer> expect = preorder(r);
            new B_flatten().flatten(r);
            List<Integer> chain = new ArrayList<>();
            boolean leftsEmpty = true;
            for (TreeNode c = r; c != null; c = c.right) { chain.add(c.val); if (c.left != null) leftsEmpty = false; }
            eq(expect, chain, "flatten chain " + expect);
            eq(true, leftsEmpty, "flatten clears every left pointer");
            if (k == 0) eq(List.of(1, 2, 3, 4, 5, 6), chain, "flatten LC 1");
        }

        System.out.println("OK trees-dfs: " + cases + " checks passed");
    }
}
