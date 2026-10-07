import java.math.BigInteger;
import java.util.*;

// Runs every Java solution shown in linked-lists.mdx against independent oracles (plain arrays,
// BigInteger, a list-based LRU model) on hand-picked edge cases plus thousands of random small chains,
// including chains with loops and chains of repeated values. It also demonstrates that the buggy
// versions the lesson names fail on the inputs it names. Any mismatch throws.
public class Check {
    static final Random R = new Random(5);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean cond, String what) { eq(true, cond, what); }
    static String show(Object o) {
        if (o instanceof int[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }

    // ---------- chain helpers ----------
    static ListNode[] nodes(int[] vals) {
        ListNode[] n = new ListNode[vals.length];
        for (int i = 0; i < vals.length; i++) n[i] = new ListNode(vals[i]);
        for (int i = 0; i + 1 < vals.length; i++) n[i].next = n[i + 1];
        return n;
    }
    static ListNode build(int... vals) { ListNode[] n = nodes(vals); return n.length == 0 ? null : n[0]; }
    // Values along the chain; fails if it is longer than `limit` (catches accidental loops).
    static int[] vals(ListNode head, int limit) {
        List<Integer> out = new ArrayList<>();
        for (ListNode c = head; c != null; c = c.next) {
            if (out.size() > limit) throw new AssertionError("chain longer than " + limit + ": a loop?");
            out.add(c.val);
        }
        return out.stream().mapToInt(Integer::intValue).toArray();
    }
    static List<ListNode> chainNodes(ListNode head, int limit) {
        List<ListNode> out = new ArrayList<>();
        for (ListNode c = head; c != null; c = c.next) {
            if (out.size() > limit) throw new AssertionError("loop");
            out.add(c);
        }
        return out;
    }
    static boolean loops(ListNode head, int limit) {
        int steps = 0;
        for (ListNode c = head; c != null; c = c.next) if (++steps > limit) return true;
        return false;
    }
    static int[] randVals(int len, int lo, int hi) {
        int[] a = new int[len];
        for (int i = 0; i < len; i++) a[i] = lo + R.nextInt(hi - lo + 1);
        return a;
    }
    static int[] reversed(int[] a) { int[] b = new int[a.length]; for (int i = 0; i < a.length; i++) b[i] = a[a.length - 1 - i]; return b; }
    static int[] sortedCopy(int[] a) { int[] b = a.clone(); Arrays.sort(b); return b; }

    public static void main(String[] args) {
        middle();
        cycle();
        nth();
        duplicate();
        reverse();
        reverseBetween();
        kGroup();
        merge();
        reorder();
        copyRandom();
        lru();
        cycleEntrance();
        palindrome();
        intersection();
        addTwo();
        rotate();
        sortList();
        System.out.println("OK linked-lists: " + cases + " checks passed");
    }

    static void middle() {
        eq(null, new B_middleNode().middleNode(null), "middle of empty");
        for (int t = 0; t < 2000; t++) {
            int len = 1 + R.nextInt(12);
            ListNode[] n = nodes(randVals(len, 0, 2));
            ok(new B_middleNode().middleNode(n[0]) == n[len / 2], "second middle len " + len);
            ok(new B_middleNode().firstMiddle(n[0]) == n[(len - 1) / 2], "first middle len " + len);
        }
        eq(null, new B_middleNode().firstMiddle(null), "first middle of empty");
    }

    // A chain whose tail loops back to index pos (or ends when pos < 0).
    static ListNode[] withLoop(int[] vals, int pos) {
        ListNode[] n = nodes(vals);
        if (pos >= 0 && n.length > 0) n[n.length - 1].next = n[pos];
        return n;
    }
    // The lesson's "Catch the bug" versions, written out so we can prove they fail.
    static boolean hasCycleByValue(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; if (slow.val == (fast == null ? Integer.MIN_VALUE : fast.val)) return true; }
        return false;
    }
    static boolean hasCycleCompareFirst(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) { if (slow == fast) return true; slow = slow.next; fast = fast.next.next; }
        return false;
    }
    static void cycle() {
        eq(false, new B_hasCycle().hasCycle(null), "cycle empty");
        eq(true, new B_hasCycle().hasCycle(withLoop(new int[]{3, 2, 0, -4}, 1)[0]), "cycle classic");
        eq(true, new B_hasCycle().hasCycle(withLoop(new int[]{1}, 0)[0]), "self loop");
        eq(false, new B_hasCycle().hasCycle(build(1, 2, 2, 3)), "duplicate values, no loop");
        eq(true, hasCycleByValue(build(1, 2, 2, 3)), "BUG: value comparison claims a loop on 1 → 2 → 2 → 3");
        eq(true, hasCycleCompareFirst(build(1, 2)), "BUG: comparing before moving claims a loop on 1 → 2");
        for (int t = 0; t < 4000; t++) {
            int len = R.nextInt(12), pos = len == 0 ? -1 : R.nextInt(len + 1) - 1;
            ListNode[] n = withLoop(randVals(len, 0, 1), pos);
            eq(pos >= 0, new B_hasCycle().hasCycle(len == 0 ? null : n[0]), "hasCycle len " + len + " pos " + pos);
        }
    }

    static ListNode removeNthGapN(ListNode head, int n) { // BUG: gap of n, not n + 1
        ListNode dummy = new ListNode(0, head), lead = dummy, trail = dummy;
        for (int i = 0; i < n; i++) lead = lead.next;
        while (lead != null) { lead = lead.next; trail = trail.next; }
        trail.next = trail.next.next;
        return dummy.next;
    }
    static void nth() {
        eq(new int[]{1, 2, 3, 5}, vals(new B_removeNthFromEnd().removeNthFromEnd(build(1, 2, 3, 4, 5), 2), 20), "nth classic");
        eq(new int[]{}, vals(new B_removeNthFromEnd().removeNthFromEnd(build(1), 1), 20), "nth single");
        eq(new int[]{2}, vals(new B_removeNthFromEnd().removeNthFromEnd(build(1, 2), 2), 20), "nth head");
        boolean threw = false;
        try { removeNthGapN(build(1, 2), 1); } catch (NullPointerException e) { threw = true; }
        eq(true, threw, "BUG: a gap of n throws on 1 → 2, n = 1");
        for (int t = 0; t < 3000; t++) {
            int len = 1 + R.nextInt(10), n = 1 + R.nextInt(len);
            int[] a = randVals(len, 0, 3);
            ListNode[] ns = nodes(a);
            int[] expect = new int[len - 1];
            for (int i = 0, j = 0; i < len; i++) if (i != len - n) expect[j++] = a[i];
            ListNode got = new B_removeNthFromEnd().removeNthFromEnd(ns[0], n);
            eq(expect, vals(got, 20), "removeNth len " + len + " n " + n);
            List<ListNode> kept = chainNodes(got, 20);
            for (ListNode k : kept) ok(k != ns[len - n], "removed node is gone");
        }
    }

    static boolean duplicateRestartAtNums0Terminates(int[] nums, int budget) { // BUG version
        int slow = 0, fast = 0;
        do { slow = nums[slow]; fast = nums[nums[fast]]; } while (slow != fast);
        slow = nums[0];
        while (slow != fast) { slow = nums[slow]; fast = nums[fast]; if (--budget < 0) return false; }
        return true;
    }
    static void duplicate() {
        eq(2, new B_findDuplicate().findDuplicate(new int[]{1, 3, 4, 2, 2}), "duplicate classic");
        eq(3, new B_findDuplicate().findDuplicate(new int[]{3, 1, 3, 4, 2}), "duplicate 2");
        eq(3, new B_findDuplicate().findDuplicate(new int[]{3, 3, 3, 3, 3}), "duplicate all same");
        eq(1, new B_findDuplicate().findDuplicate(new int[]{1, 1}), "duplicate n = 1");
        eq(false, duplicateRestartAtNums0Terminates(new int[]{1, 3, 4, 2, 2}, 1000), "BUG: restarting at nums[0] never meets");
        for (int t = 0; t < 4000; t++) {
            int n = 1 + R.nextInt(9), d = 1 + R.nextInt(n), copies = 2 + R.nextInt(n);
            List<Integer> others = new ArrayList<>();
            for (int v = 1; v <= n; v++) if (v != d) others.add(v);
            Collections.shuffle(others, R);
            List<Integer> all = new ArrayList<>();
            for (int i = 0; i < copies; i++) all.add(d);
            all.addAll(others.subList(0, n + 1 - copies));
            Collections.shuffle(all, R);
            int[] nums = all.stream().mapToInt(Integer::intValue).toArray(), before = nums.clone();
            eq(d, new B_findDuplicate().findDuplicate(nums), "findDuplicate " + Arrays.toString(before));
            eq(before, nums, "findDuplicate leaves the array unchanged");
        }
    }

    static ListNode reverseFlipFirst(ListNode head) { // BUG version from the lesson
        ListNode prev = null, cur = head;
        while (cur != null) { cur.next = prev; ListNode next = cur.next; prev = cur; cur = next; }
        return prev;
    }
    static void reverse() {
        eq(null, new B_reverseList().reverseList(null), "reverse empty");
        eq(null, new B_reverseRecursive().reverseRecursive(null), "reverse recursive empty");
        eq(new int[]{1}, vals(reverseFlipFirst(build(1, 2, 3)), 20), "BUG: flipping first keeps only island 1");
        for (int t = 0; t < 3000; t++) {
            int[] a = randVals(R.nextInt(12), 0, 3);
            ListNode[] n1 = nodes(a), n2 = nodes(a);
            ListNode g1 = new B_reverseList().reverseList(a.length == 0 ? null : n1[0]);
            ListNode g2 = new B_reverseRecursive().reverseRecursive(a.length == 0 ? null : n2[0]);
            eq(reversed(a), vals(g1, 20), "reverseList");
            eq(reversed(a), vals(g2, 20), "reverseRecursive");
            List<ListNode> c1 = chainNodes(g1, 20);
            for (int i = 0; i < a.length; i++) ok(c1.get(i) == n1[a.length - 1 - i], "reverse re-uses nodes in place");
        }
    }

    static void reverseBetween() {
        eq(new int[]{1, 4, 3, 2, 5}, vals(new B_reverseBetween().reverseBetween(build(1, 2, 3, 4, 5), 2, 4), 20), "reverseBetween classic");
        eq(new int[]{3, 2, 1, 4, 5}, vals(new B_reverseBetween().reverseBetween(build(1, 2, 3, 4, 5), 1, 3), 20), "reverseBetween left = 1");
        eq(new int[]{5}, vals(new B_reverseBetween().reverseBetween(build(5), 1, 1), 20), "reverseBetween single");
        for (int t = 0; t < 3000; t++) {
            int len = 1 + R.nextInt(10), left = 1 + R.nextInt(len), right = left + R.nextInt(len - left + 1);
            int[] a = randVals(len, 0, 3), expect = a.clone();
            for (int i = left - 1, j = right - 1; i < j; i++, j--) { int x = expect[i]; expect[i] = expect[j]; expect[j] = x; }
            eq(expect, vals(new B_reverseBetween().reverseBetween(build(a), left, right), 20), "reverseBetween " + Arrays.toString(a) + " " + left + ".." + right);
        }
    }

    static ListNode kGroupBeforePrev(ListNode head, int k) { // BUG: before = prev
        ListNode dummy = new ListNode(0, head), before = dummy;
        while (true) {
            ListNode probe = before;
            for (int i = 0; i < k && probe != null; i++) probe = probe.next;
            if (probe == null) break;
            ListNode first = before.next, after = probe.next, prev = null, cur = first;
            while (cur != after) { ListNode next = cur.next; cur.next = prev; prev = cur; cur = next; }
            before.next = prev; first.next = after; before = prev;
        }
        return dummy.next;
    }
    static void kGroup() {
        eq(new int[]{2, 1, 4, 3, 5}, vals(new B_reverseKGroup().reverseKGroup(build(1, 2, 3, 4, 5), 2), 20), "kGroup k = 2");
        eq(new int[]{3, 2, 1, 4, 5}, vals(new B_reverseKGroup().reverseKGroup(build(1, 2, 3, 4, 5), 3), 20), "kGroup k = 3");
        eq(new int[]{2, 3, 4, 1}, vals(kGroupBeforePrev(build(1, 2, 3, 4), 2), 20), "BUG: before = prev gives 2 → 3 → 4 → 1");
        for (int t = 0; t < 3000; t++) {
            int len = 1 + R.nextInt(12), k = 1 + R.nextInt(len + 1);
            int[] a = randVals(len, 0, 3), expect = a.clone();
            for (int i = 0; i + k <= len; i += k)
                for (int x = i, y = i + k - 1; x < y; x++, y--) { int s = expect[x]; expect[x] = expect[y]; expect[y] = s; }
            eq(expect, vals(new B_reverseKGroup().reverseKGroup(build(a), k), 30), "kGroup " + Arrays.toString(a) + " k " + k);
        }
    }

    static ListNode mergeNoTailAdvance(ListNode list1, ListNode list2) { // BUG version
        ListNode dummy = new ListNode(0), tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) { tail.next = list1; list1 = list1.next; } else { tail.next = list2; list2 = list2.next; }
        }
        tail.next = (list1 != null) ? list1 : list2;
        return dummy.next;
    }
    static void merge() {
        eq(new int[]{1, 1, 2, 3, 4, 4}, vals(new B_mergeTwoLists().mergeTwoLists(build(1, 2, 4), build(1, 3, 4)), 20), "merge classic");
        eq(new int[]{4}, vals(mergeNoTailAdvance(build(1, 2, 4), build(1, 3, 4)), 20), "BUG: no tail advance returns just 4");
        eq(null, new B_mergeTwoLists().mergeTwoLists(null, null), "merge empty");
        for (int t = 0; t < 3000; t++) {
            int[] a = sortedCopy(randVals(R.nextInt(7), 0, 4)), b = sortedCopy(randVals(R.nextInt(7), 0, 4));
            ListNode[] na = nodes(a), nb = nodes(b);
            ListNode got = new B_mergeTwoLists().mergeTwoLists(a.length == 0 ? null : na[0], b.length == 0 ? null : nb[0]);
            // stable merge oracle over node identities
            List<ListNode> expect = new ArrayList<>();
            int i = 0, j = 0;
            while (i < a.length || j < b.length) {
                if (j == b.length || (i < a.length && a[i] <= b[j])) expect.add(na[i++]); else expect.add(nb[j++]);
            }
            List<ListNode> gotNodes = chainNodes(got, 20);
            eq(expect.size(), gotNodes.size(), "merge size");
            for (int k = 0; k < expect.size(); k++) ok(expect.get(k) == gotNodes.get(k), "merge splices existing nodes, stably");
        }
    }

    static void reorderOtherGuard(ListNode head) { // Chapter 1's guard: the lesson claims this also works
        if (head == null || head.next == null) return;
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
        ListNode second = slow.next, prev = null; slow.next = null;
        while (second != null) { ListNode next = second.next; second.next = prev; prev = second; second = next; }
        ListNode first = head; second = prev;
        while (second != null) { ListNode n1 = first.next, n2 = second.next; first.next = second; second.next = n1; first = n1; second = n2; }
    }
    static void reorderNoCut(ListNode head) { // BUG: forgot slow.next = null
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) { slow = slow.next; fast = fast.next.next; }
        ListNode second = slow.next, prev = null;
        while (second != null) { ListNode next = second.next; second.next = prev; prev = second; second = next; }
        ListNode first = head; second = prev;
        while (second != null) { ListNode n1 = first.next, n2 = second.next; first.next = second; second.next = n1; first = n1; second = n2; }
    }
    static void reorder() {
        ListNode h = build(1, 2, 3, 4, 5, 6);
        new B_reorderList().reorderList(h);
        eq(new int[]{1, 6, 2, 5, 3, 4}, vals(h, 20), "reorder 6");
        ListNode[] bug = nodes(new int[]{1, 2, 3, 4});
        reorderNoCut(bug[0]);
        ok(bug[2].next == bug[2], "BUG: no cut ties island 3 to itself");
        new B_reorderList().reorderList(null);
        for (int t = 0; t < 3000; t++) {
            int len = R.nextInt(12);
            int[] a = randVals(len, 0, 9);
            int[] expect = new int[len];
            for (int i = 0, lo = 0, hi = len - 1; i < len; i++) expect[i] = (i % 2 == 0) ? a[lo++] : a[hi--];
            ListNode[] n = nodes(a), m = nodes(a);
            if (len > 0) { new B_reorderList().reorderList(n[0]); reorderOtherGuard(m[0]); }
            eq(expect, len == 0 ? new int[]{} : vals(n[0], 20), "reorder " + Arrays.toString(a));
            eq(expect, len == 0 ? new int[]{} : vals(m[0], 20), "reorder with Chapter 1's guard " + Arrays.toString(a));
        }
    }

    // ---------- Copy List with Random Pointer ----------
    static B_copy.Node[] randomChain(int[] vals, int[] random) {
        B_copy.Node[] n = new B_copy.Node[vals.length];
        for (int i = 0; i < vals.length; i++) n[i] = new B_copy.Node(vals[i]);
        for (int i = 0; i + 1 < vals.length; i++) n[i].next = n[i + 1];
        for (int i = 0; i < vals.length; i++) n[i].random = random[i] < 0 ? null : n[random[i]];
        return n;
    }
    static void checkCopy(B_copy.Node[] orig, int[] vals, int[] random, B_copy.Node copy, String what) {
        // original unchanged
        for (int i = 0; i < orig.length; i++) {
            eq(vals[i], orig[i].val, what + " original value");
            ok(orig[i].next == (i + 1 < orig.length ? orig[i + 1] : null), what + " original next restored");
            ok(orig[i].random == (random[i] < 0 ? null : orig[random[i]]), what + " original random untouched");
        }
        Set<B_copy.Node> originals = Collections.newSetFromMap(new IdentityHashMap<>());
        originals.addAll(Arrays.asList(orig));
        List<B_copy.Node> c = new ArrayList<>();
        for (B_copy.Node x = copy; x != null; x = x.next) { if (c.size() > orig.length) throw new AssertionError(what + " copy too long"); c.add(x); }
        eq(orig.length, c.size(), what + " copy length");
        Map<B_copy.Node, Integer> index = new IdentityHashMap<>();
        for (int i = 0; i < c.size(); i++) { ok(!originals.contains(c.get(i)), what + " no shared nodes"); index.put(c.get(i), i); }
        eq(c.size(), index.size(), what + " copy nodes distinct");
        for (int i = 0; i < c.size(); i++) {
            eq(vals[i], c.get(i).val, what + " copy value");
            B_copy.Node r = c.get(i).random;
            if (random[i] < 0) ok(r == null, what + " null random");
            else { ok(r != null && index.containsKey(r), what + " random lands in the copy"); eq(random[i], index.get(r), what + " random target"); }
        }
    }
    static void copyRandom() {
        eq(null, new B_copy().copyRandomList(null), "copy empty");
        eq(null, new B_copy().copyRandomListWoven(null), "woven copy empty");
        for (int t = 0; t < 3000; t++) {
            int len = R.nextInt(9);
            int[] vals = randVals(len, 0, 2), random = new int[len];
            for (int i = 0; i < len; i++) random[i] = R.nextInt(len + 1) - 1; // includes null and self
            B_copy.Node[] a = randomChain(vals, random), b = randomChain(vals, random);
            checkCopy(a, vals, random, new B_copy().copyRandomList(len == 0 ? null : a[0]), "map");
            checkCopy(b, vals, random, new B_copy().copyRandomListWoven(len == 0 ? null : b[0]), "woven");
        }
    }

    // ---------- LRU: against an independent list-based model ----------
    static final class Model {
        final int cap; final List<int[]> order = new ArrayList<>(); // most recent last: {key, value}
        Model(int cap) { this.cap = cap; }
        int find(int key) { for (int i = 0; i < order.size(); i++) if (order.get(i)[0] == key) return i; return -1; }
        int get(int key) { int i = find(key); if (i < 0) return -1; int[] e = order.remove(i); order.add(e); return e[1]; }
        void put(int key, int value) {
            int i = find(key);
            if (i >= 0) { order.remove(i); order.add(new int[]{key, value}); return; }
            if (order.size() == cap) order.remove(0);
            order.add(new int[]{key, value});
        }
    }
    static void lru() {
        B_lru.LRUCache c = new B_lru().new LRUCache(2);
        c.put(1, 1); c.put(2, 2); eq(1, c.get(1), "lru get 1"); c.put(3, 3); eq(-1, c.get(2), "lru evicted 2");
        c.put(4, 4); eq(-1, c.get(1), "lru evicted 1"); eq(3, c.get(3), "lru get 3"); eq(4, c.get(4), "lru get 4");
        for (int t = 0; t < 2000; t++) {
            int cap = 1 + R.nextInt(4), keys = cap + 1 + R.nextInt(4);
            B_lru.LRUCache manual = new B_lru().new LRUCache(cap);
            B_lruLinked.LRUCache linked = new B_lruLinked().new LRUCache(cap);
            Model model = new Model(cap);
            LinkedHashMap<Integer, Integer> reference = new LinkedHashMap<>(16, 0.75f, true);
            for (int op = 0; op < 40; op++) {
                int key = R.nextInt(keys);
                if (R.nextBoolean()) {
                    int expect = model.get(key);
                    Integer ref = reference.get(key);
                    eq(expect, ref == null ? -1 : ref, "model agrees with LinkedHashMap");
                    eq(expect, manual.get(key), "manual LRU get");
                    eq(expect, linked.get(key), "LinkedHashMap LRU get");
                } else {
                    int value = R.nextInt(100);
                    model.put(key, value); manual.put(key, value); linked.put(key, value);
                    reference.put(key, value);
                    if (reference.size() > cap) { Iterator<Integer> it = reference.keySet().iterator(); it.next(); it.remove(); }
                }
            }
        }
    }

    static void cycleEntrance() {
        ListNode[] n = withLoop(new int[]{3, 2, 0, -4}, 1);
        ok(new B_detectCycle().detectCycle(n[0]) == n[1], "entrance classic");
        ListNode[] whole = withLoop(new int[]{1, 2, 3}, 0);
        ok(new B_detectCycle().detectCycle(whole[0]) == whole[0], "loop back to the head");
        eq(null, new B_detectCycle().detectCycle(null), "entrance empty");
        for (int t = 0; t < 4000; t++) {
            int len = R.nextInt(12), pos = len == 0 ? -1 : R.nextInt(len + 1) - 1;
            ListNode[] m = withLoop(randVals(len, 0, 1), pos);
            ListNode got = new B_detectCycle().detectCycle(len == 0 ? null : m[0]);
            ok(got == (pos < 0 ? null : m[pos]), "detectCycle len " + len + " pos " + pos);
        }
    }

    static void palindrome() {
        eq(true, new B_isPalindrome().isPalindrome(build(1, 2, 2, 1)), "palindrome even");
        eq(false, new B_isPalindrome().isPalindrome(build(1, 2)), "not palindrome");
        eq(true, new B_isPalindrome().isPalindrome(null), "palindrome empty");
        for (int t = 0; t < 4000; t++) {
            int len = R.nextInt(10);
            int[] a = randVals(len, 0, 1);
            if (R.nextBoolean()) for (int i = 0; i < len / 2; i++) a[len - 1 - i] = a[i];
            ListNode[] n = nodes(a);
            eq(Arrays.equals(a, reversed(a)), new B_isPalindrome().isPalindrome(len == 0 ? null : n[0]), "isPalindrome " + Arrays.toString(a));
            if (len > 0) {
                List<ListNode> after = chainNodes(n[0], 20);
                eq(len, after.size(), "palindrome restores the chain");
                for (int i = 0; i < len; i++) ok(after.get(i) == n[i], "palindrome restores node order");
            }
        }
    }

    static void intersection() {
        // A: 4 → 1 → [8 → 4 → 5], B: 5 → 6 → 1 → [8 → 4 → 5]
        ListNode[] shared = nodes(new int[]{8, 4, 5});
        ListNode a = new ListNode(4, new ListNode(1, shared[0]));
        ListNode b = new ListNode(5, new ListNode(6, new ListNode(1, shared[0])));
        ok(new B_getIntersectionNode().getIntersectionNode(a, b) == shared[0], "intersection classic: the 8, not the 1");
        for (int t = 0; t < 4000; t++) {
            int la = R.nextInt(6), lb = R.nextInt(6), lc = R.nextInt(5);
            ListNode[] own1 = nodes(randVals(la, 0, 2)), own2 = nodes(randVals(lb, 0, 2)), tail = nodes(randVals(lc, 0, 2));
            if (la > 0) own1[la - 1].next = lc > 0 ? tail[0] : null;
            if (lb > 0) own2[lb - 1].next = lc > 0 ? tail[0] : null;
            ListNode headA = la > 0 ? own1[0] : (lc > 0 ? tail[0] : null);
            ListNode headB = lb > 0 ? own2[0] : (lc > 0 ? tail[0] : null);
            ListNode expect = lc > 0 ? tail[0] : null;
            ok(new B_getIntersectionNode().getIntersectionNode(headA, headB) == expect, "intersection a=" + la + " b=" + lb + " c=" + lc);
            eq(la + lc, chainNodes(headA, 20).size(), "chain A unchanged");
            eq(lb + lc, chainNodes(headB, 20).size(), "chain B unchanged");
        }
    }

    static int[] digits(BigInteger x) {
        String s = x.toString();
        int[] d = new int[s.length()];
        for (int i = 0; i < s.length(); i++) d[i] = s.charAt(s.length() - 1 - i) - '0';
        return d;
    }
    static BigInteger number(int[] d) {
        StringBuilder sb = new StringBuilder();
        for (int i = d.length - 1; i >= 0; i--) sb.append(d[i]);
        return new BigInteger(sb.toString());
    }
    static void addTwo() {
        eq(new int[]{7, 0, 8}, vals(new B_addTwoNumbers().addTwoNumbers(build(2, 4, 3), build(5, 6, 4)), 50), "add classic");
        eq(new int[]{0, 1}, vals(new B_addTwoNumbers().addTwoNumbers(build(5), build(5)), 50), "add final carry");
        eq(new int[]{0}, vals(new B_addTwoNumbers().addTwoNumbers(build(0), build(0)), 50), "add zeros");
        eq(new int[]{8, 9, 9, 9, 0, 0, 0, 1}, vals(new B_addTwoNumbers().addTwoNumbers(build(9, 9, 9, 9, 9, 9, 9), build(9, 9, 9, 9)), 50), "add LeetCode example 3");
        for (int t = 0; t < 3000; t++) {
            BigInteger x = new BigInteger(1 + R.nextInt(40), R), y = new BigInteger(1 + R.nextInt(40), R);
            eq(digits(x.add(y)), vals(new B_addTwoNumbers().addTwoNumbers(build(digits(x)), build(digits(y))), 50), "add " + x + " + " + y);
        }
        ok(number(new int[]{7, 0, 8}).intValue() == 807, "digit helper");
    }

    static void rotate() {
        eq(new int[]{4, 5, 1, 2, 3}, vals(new B_rotateRight().rotateRight(build(1, 2, 3, 4, 5), 2), 20), "rotate classic");
        eq(new int[]{2, 0, 1}, vals(new B_rotateRight().rotateRight(build(0, 1, 2), 4), 20), "rotate k > n");
        eq(new int[]{2, 3, 1}, vals(new B_rotateRight().rotateRight(build(1, 2, 3), 2_000_000_000), 20), "rotate huge k: 2e9 mod 3 = 2");
        eq(null, new B_rotateRight().rotateRight(null, 3), "rotate empty");
        for (int t = 0; t < 3000; t++) {
            int len = R.nextInt(9), k = R.nextInt(30);
            int[] a = randVals(len, 0, 9), expect = a.clone();
            for (int s = 0; s < k && len > 0; s++) { // literally move the last to the front, k times
                int last = expect[len - 1];
                System.arraycopy(expect, 0, expect, 1, len - 1);
                expect[0] = last;
            }
            eq(expect, len == 0 ? new int[]{} : vals(new B_rotateRight().rotateRight(build(a), k), 20), "rotate " + Arrays.toString(a) + " k " + k);
        }
    }

    static ListNode sortSecondMiddle(ListNode head) { // BUG: second-middle split never ends on two islands
        if (head == null || head.next == null) return head;
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
        ListNode right = slow.next; slow.next = null;
        sortSecondMiddle(head); sortSecondMiddle(right);
        return head;
    }
    static void sortList() {
        eq(new int[]{1, 2, 3, 4}, vals(new B_sortList().sortList(build(4, 2, 1, 3)), 20), "sort classic");
        eq(null, new B_sortList().sortList(null), "sort empty");
        boolean overflow = false;
        try { sortSecondMiddle(build(2, 1)); } catch (StackOverflowError e) { overflow = true; }
        eq(true, overflow, "BUG: second-middle split recurses forever on 2 → 1");
        for (int t = 0; t < 3000; t++) {
            int len = R.nextInt(30);
            int[] a = randVals(len, -3, 3);
            ListNode[] n = nodes(a);
            ListNode got = new B_sortList().sortList(len == 0 ? null : n[0]);
            eq(sortedCopy(a), vals(got, 40), "sortList " + Arrays.toString(a));
            // stability: equal values keep their original node order
            List<ListNode> order = chainNodes(got, 40);
            Map<ListNode, Integer> pos = new IdentityHashMap<>();
            for (int i = 0; i < len; i++) pos.put(n[i], i);
            for (int i = 0; i + 1 < order.size(); i++)
                if (order.get(i).val == order.get(i + 1).val) ok(pos.get(order.get(i)) < pos.get(order.get(i + 1)), "sortList is stable");
        }
    }
}
