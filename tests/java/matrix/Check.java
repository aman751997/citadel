import java.util.*;

// Runs every Java solution shown in matrix.mdx against independent oracles: rotation via a fresh array and
// the index map, spiral via a visited-matrix walk, zeroes via a copy, powers via repeated multiplication and
// Math.pow, and so on — hand-picked edge cases (1 x 1, 1 x n, n x 1, empty where allowed) plus thousands of
// random small inputs. It also proves each "catch the bug" version named in the lesson fails on the lesson's input.
public class Check {
    static final Random R = new Random(20);
    static int cases = 0;

    static void eq(Object expected, Object actual, String what) {
        cases++;
        if (!Objects.deepEquals(expected, actual))
            throw new AssertionError(what + ": expected " + show(expected) + " but got " + show(actual));
    }
    static void ok(boolean cond, String what) { cases++; if (!cond) throw new AssertionError(what); }
    static String show(Object o) {
        if (o instanceof int[][] m) return Arrays.deepToString(m);
        if (o instanceof int[] a) return Arrays.toString(a);
        return String.valueOf(o);
    }
    static int[][] copy(int[][] m) { int[][] c = new int[m.length][]; for (int i = 0; i < m.length; i++) c[i] = m[i].clone(); return c; }
    static int[][] rand(int rows, int cols, int lo, int hi) {
        int[][] m = new int[rows][cols];
        for (int[] row : m) for (int c = 0; c < cols; c++) row[c] = lo + R.nextInt(hi - lo + 1);
        return m;
    }
    static List<Integer> list(int... v) { List<Integer> l = new ArrayList<>(); for (int x : v) l.add(x); return l; }

    // ---- independent oracles ----
    static int[][] rotCW(int[][] m) { int n = m.length; int[][] o = new int[n][n]; for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) o[c][n - 1 - r] = m[r][c]; return o; }
    static int[][] rotCCW(int[][] m) { int n = m.length; int[][] o = new int[n][n]; for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) o[n - 1 - c][r] = m[r][c]; return o; }
    static int[][] rotRectCW(int[][] m) { int rows = m.length, cols = m[0].length; int[][] o = new int[cols][rows]; for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) o[c][rows - 1 - r] = m[r][c]; return o; }
    static List<Integer> spiralSim(int[][] m) {          // walk with a visited matrix, turn right when blocked
        List<Integer> out = new ArrayList<>();
        int rows = m.length, cols = rows == 0 ? 0 : m[0].length;
        boolean[][] seen = new boolean[rows][cols];
        int[] dr = {0, 1, 0, -1}, dc = {1, 0, -1, 0};
        int r = 0, c = 0, d = 0;
        for (int k = 0; k < rows * cols; k++) {
            out.add(m[r][c]); seen[r][c] = true;
            int nr = r + dr[d], nc = c + dc[d];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc]) d = (d + 1) % 4;
            r += dr[d]; c += dc[d];
        }
        return out;
    }
    static int[][] zeroesCopy(int[][] m) {               // read the original, write a fresh answer
        int rows = m.length, cols = m[0].length;
        int[][] o = copy(m);
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (m[r][c] == 0) {
            for (int k = 0; k < cols; k++) o[r][k] = 0;
            for (int k = 0; k < rows; k++) o[k][c] = 0;
        }
        return o;
    }
    static int[][] lifeCopy(int[][] b) {
        int rows = b.length, cols = b[0].length; int[][] o = new int[rows][cols];
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            int n = 0;
            for (int y = Math.max(0, r - 1); y <= Math.min(rows - 1, r + 1); y++)
                for (int x = Math.max(0, c - 1); x <= Math.min(cols - 1, c + 1); x++) if (y != r || x != c) n += b[y][x];
            o[r][c] = (n == 3 || (b[r][c] == 1 && n == 2)) ? 1 : 0;
        }
        return o;
    }
    static int[] zigzagSort(int[][] m) {                  // sort cells by r + c, then by row in the line's direction
        List<int[]> cells = new ArrayList<>();
        for (int r = 0; r < m.length; r++) for (int c = 0; c < m[0].length; c++) cells.add(new int[]{r, c});
        cells.sort((p, q) -> p[0] + p[1] != q[0] + q[1] ? (p[0] + p[1]) - (q[0] + q[1]) : ((p[0] + p[1]) % 2 == 0 ? q[0] - p[0] : p[0] - q[0]));
        int[] out = new int[cells.size()];
        for (int i = 0; i < out.length; i++) out[i] = m[cells.get(i)[0]][cells.get(i)[1]];
        return out;
    }
    static boolean toeplitzByGroups(int[][] m) {
        Map<Integer, Set<Integer>> lines = new HashMap<>();
        for (int r = 0; r < m.length; r++) for (int c = 0; c < m[0].length; c++) lines.computeIfAbsent(r - c, k -> new HashSet<>()).add(m[r][c]);
        for (Set<Integer> s : lines.values()) if (s.size() > 1) return false;
        return true;
    }
    static boolean contains(int[][] m, int t) { for (int[] row : m) for (int v : row) if (v == t) return true; return false; }
    static boolean squareByRotation(int[][] p) {          // some ordering is a cycle of equal, non-zero, 90°-turning edges
        int[][] perms = {{0,1,2,3},{0,1,3,2},{0,2,1,3},{0,2,3,1},{0,3,1,2},{0,3,2,1}};
        for (int[] q : perms) {
            int[][] e = new int[4][];
            for (int i = 0; i < 4; i++) { int[] a = p[q[i]], b = p[q[(i + 1) % 4]]; e[i] = new int[]{b[0] - a[0], b[1] - a[1]}; }
            if (e[0][0] == 0 && e[0][1] == 0) continue;
            boolean turn = true;
            for (int i = 0; i < 4; i++) { int[] v = e[i], w = e[(i + 1) % 4]; if (w[0] != -v[1] || w[1] != v[0]) turn = false; }
            boolean turnOther = true;
            for (int i = 0; i < 4; i++) { int[] v = e[i], w = e[(i + 1) % 4]; if (w[0] != v[1] || w[1] != -v[0]) turnOther = false; }
            if (turn || turnOther) return true;
        }
        return false;
    }
    static boolean close(double expected, double actual, double rel) {
        if (expected == actual) return true;
        if (Double.isNaN(expected) || Double.isNaN(actual)) return false;
        return Math.abs(expected - actual) <= rel * Math.max(1e-300, Math.abs(expected));
    }

    // ---- the buggy versions the lesson names ----
    static void transposeWholeSquare(int[][] m) {         // swaps every pair twice
        int n = m.length;
        for (int r = 0; r < n; r++) for (int c = 0; c < n; c++) { int t = m[r][c]; m[r][c] = m[c][r]; m[c][r] = t; }
    }
    static void reverseRows(int[][] m) { for (int[] row : m) for (int i = 0, j = row.length - 1; i < j; i++, j--) { int t = row[i]; row[i] = row[j]; row[j] = t; } }
    static List<Integer> spiralNoGuards(int[][] m) {
        List<Integer> out = new ArrayList<>();
        int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(m[top][c]); top++;
            for (int r = top; r <= bottom; r++) out.add(m[r][right]); right--;
            for (int c = right; c >= left; c--) out.add(m[bottom][c]); bottom--;
            for (int r = bottom; r >= top; r--) out.add(m[r][left]); left++;
        }
        return out;
    }
    static void zeroesSpread(int[][] m) {
        for (int r = 0; r < m.length; r++) for (int c = 0; c < m[0].length; c++) if (m[r][c] == 0) {
            Arrays.fill(m[r], 0); for (int[] row : m) row[c] = 0;
        }
    }
    static void zeroesEdgesFirst(int[][] m) {
        int rows = m.length, cols = m[0].length; boolean fr = false, fc = false;
        for (int c = 0; c < cols; c++) if (m[0][c] == 0) fr = true;
        for (int r = 0; r < rows; r++) if (m[r][0] == 0) fc = true;
        for (int r = 1; r < rows; r++) for (int c = 1; c < cols; c++) if (m[r][c] == 0) { m[r][0] = 0; m[0][c] = 0; }
        if (fr) Arrays.fill(m[0], 0);
        if (fc) for (int[] row : m) row[0] = 0;
        for (int r = 1; r < rows; r++) for (int c = 1; c < cols; c++) if (m[r][0] == 0 || m[0][c] == 0) m[r][c] = 0;
    }
    static void zeroesFlagsAfter(int[][] m) {
        int rows = m.length, cols = m[0].length;
        for (int r = 1; r < rows; r++) for (int c = 1; c < cols; c++) if (m[r][c] == 0) { m[r][0] = 0; m[0][c] = 0; }
        boolean fr = false, fc = false;
        for (int c = 0; c < cols; c++) if (m[0][c] == 0) fr = true;
        for (int r = 0; r < rows; r++) if (m[r][0] == 0) fc = true;
        for (int r = 1; r < rows; r++) for (int c = 1; c < cols; c++) if (m[r][0] == 0 || m[0][c] == 0) m[r][c] = 0;
        if (fr) Arrays.fill(m[0], 0);
        if (fc) for (int[] row : m) row[0] = 0;
    }
    static void zeroesSentinel(int[][] m, int sentinel) {  // paint non-zero cells with a sentinel, then turn sentinels into 0
        int rows = m.length, cols = m[0].length;
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (m[r][c] == 0) {
            for (int k = 0; k < cols; k++) if (m[r][k] != 0) m[r][k] = sentinel;
            for (int k = 0; k < rows; k++) if (m[k][c] != 0) m[k][c] = sentinel;
        }
        for (int[] row : m) for (int c = 0; c < cols; c++) if (row[c] == sentinel) row[c] = 0;
    }
    static double myPowIntNegate(double x, int n) {
        if (n < 0) { x = 1 / x; n = -n; }                 // -Integer.MIN_VALUE is still negative
        double result = 1;
        while (n > 0) { if ((n & 1) == 1) result *= x; x *= x; n >>= 1; }
        return result;
    }
    static int powCalls = 0;
    static double powTwice(double x, long e) {            // recomputes the half twice: O(n) calls
        powCalls++;
        if (e == 0) return 1.0;
        return (e % 2 == 0) ? powTwice(x, e / 2) * powTwice(x, e / 2) : powTwice(x, e / 2) * powTwice(x, e / 2) * x;
    }
    static void lifeDirect(int[][] b) {
        int rows = b.length, cols = b[0].length;
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            int n = 0;
            for (int y = Math.max(0, r - 1); y <= Math.min(rows - 1, r + 1); y++)
                for (int x = Math.max(0, c - 1); x <= Math.min(cols - 1, c + 1); x++) if (y != r || x != c) n += b[y][x];
            b[r][c] = (n == 3 || (b[r][c] == 1 && n == 2)) ? 1 : 0;
        }
    }
    static boolean validSquareThreeChecks(int[] p1, int[] p2, int[] p3, int[] p4) {
        int[][] p = {p1, p2, p3, p4}; long[] d = new long[6]; int k = 0;
        for (int i = 0; i < 4; i++) for (int j = i + 1; j < 4; j++) { long dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1]; d[k++] = dx * dx + dy * dy; }
        Arrays.sort(d);
        return d[0] > 0 && d[0] == d[3] && d[4] == d[5];
    }

    public static void main(String[] args) {
        // ---------- Prologue: (r, c) <-> r * cols + c ----------
        for (int rows = 1; rows <= 6; rows++) for (int cols = 1; cols <= 6; cols++)
            for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) { int k = r * cols + c; eq(r, k / cols, "flat row"); eq(c, k % cols, "flat col"); }

        // ---------- Chapter 1: Rotate Image (and its alternatives) ----------
        {
            int[][] a = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
            new B_rotate().rotate(a);
            eq(new int[][]{{7, 4, 1}, {8, 5, 2}, {9, 6, 3}}, a, "rotate LC 1");
            int[][] b = {{5, 1, 9, 11}, {2, 4, 8, 10}, {13, 3, 6, 7}, {15, 14, 12, 16}};
            new B_rotate().rotate(b);
            eq(new int[][]{{15, 13, 2, 5}, {14, 3, 4, 1}, {12, 6, 8, 9}, {16, 7, 10, 11}}, b, "rotate LC 2");
            int[][] one = {{7}}; new B_rotate().rotate(one); eq(new int[][]{{7}}, one, "rotate 1x1");
            // figure: the 2 at (0, 1) of a 4 x 4 lands at (1, 3)
            int[][] g = new int[4][4]; for (int r = 0; r < 4; r++) for (int c = 0; c < 4; c++) g[r][c] = r * 4 + c + 1;
            int[][] gr = copy(g); new B_rotate().rotate(gr); eq(2, gr[1][3], "figure 2 -> (1, 3)");
            // catch the bug: swapping every pair twice leaves the square unchanged, so rotate becomes a mirror
            int[][] bug = {{1, 2}, {3, 4}}; transposeWholeSquare(bug); eq(new int[][]{{1, 2}, {3, 4}}, bug, "double transpose is a no-op");
            reverseRows(bug); eq(new int[][]{{2, 1}, {4, 3}}, bug, "buggy rotate gives a mirror");
            int[][] ccw = {{1, 2}, {3, 4}}; new B_rotateCounterClockwise().rotateCounterClockwise(ccw);
            eq(new int[][]{{2, 4}, {1, 3}}, ccw, "ccw [[1,2],[3,4]]");
            for (int t = 0; t < 3000; t++) {
                int n = 1 + R.nextInt(7);
                int[][] m = rand(n, n, -9, 9);
                int[][] x = copy(m); new B_rotate().rotate(x); eq(rotCW(m), x, "rotate " + show(m));
                int[][] y = copy(m); new B_rotateLayers().rotate(y); eq(rotCW(m), y, "rotateLayers " + show(m));
                int[][] z = copy(m); new B_rotateCounterClockwise().rotateCounterClockwise(z); eq(rotCCW(m), z, "rotateCounterClockwise " + show(m));
                int[][] w = copy(m); for (int k = 0; k < 4; k++) new B_rotate().rotate(w); eq(m, w, "four turns are the identity");
            }
        }

        // ---------- Chapter 2: Spiral Matrix ----------
        {
            int[][] g34 = {{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}};
            eq(list(1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7), new B_spiralOrder().spiralOrder(g34), "spiral 3x4");
            eq(list(1, 2, 3, 6, 9, 8, 7, 4, 5), new B_spiralOrder().spiralOrder(new int[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}), "spiral 3x3");
            eq(list(1, 2, 3), new B_spiralOrder().spiralOrder(new int[][]{{1, 2, 3}}), "spiral 1x3");
            eq(list(1, 2, 3), new B_spiralOrder().spiralOrder(new int[][]{{1}, {2}, {3}}), "spiral 3x1");
            eq(list(), new B_spiralOrder().spiralOrder(new int[0][0]), "spiral empty");
            eq(list(), new B_spiralOrderBreak().spiralOrder(new int[0][0]), "spiral (break) empty");
            // catch the bug: no guards
            eq(list(1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7, 6), spiralNoGuards(g34), "no guards: 3x4 re-reads 6");
            eq(list(1, 2, 3, 2, 1), spiralNoGuards(new int[][]{{1, 2, 3}}), "no guards: 1x3");
            eq(list(1, 2, 3, 2), spiralNoGuards(new int[][]{{1}, {2}, {3}}), "no guards: 3x1");
            for (int t = 0; t < 4000; t++) {
                int rows = 1 + R.nextInt(6), cols = 1 + R.nextInt(6);
                int[][] m = rand(rows, cols, 0, 20), keep = copy(m);
                eq(spiralSim(m), new B_spiralOrder().spiralOrder(m), "spiralOrder " + show(m));
                eq(spiralSim(m), new B_spiralOrderBreak().spiralOrder(m), "spiralOrder (break) " + show(m));
                eq(keep, m, "spiral must not modify the input");
            }
        }

        // ---------- Chapter 3: Set Matrix Zeroes ----------
        {
            int[][] a = {{1, 2, 3}, {4, 0, 6}, {7, 8, 9}};
            int[][] x = copy(a); new B_setZeroes().setZeroes(x); eq(new int[][]{{1, 0, 3}, {0, 0, 0}, {7, 0, 9}}, x, "zeroes LC 1");
            int[][] lc2 = {{0, 1, 2, 0}, {3, 4, 5, 2}, {1, 3, 1, 5}};
            int[][] y = copy(lc2); new B_setZeroes().setZeroes(y); eq(new int[][]{{0, 0, 0, 0}, {0, 4, 5, 0}, {0, 3, 1, 0}}, y, "zeroes LC 2");
            int[][] b = {{1, 0, 3}, {4, 5, 6}, {7, 8, 9}};
            int[][] z = copy(b); new B_setZeroes().setZeroes(z); eq(new int[][]{{0, 0, 0}, {4, 0, 6}, {7, 0, 9}}, z, "zeroes edge zero");
            int[][] single = {{0}}; new B_setZeroes().setZeroes(single); eq(new int[][]{{0}}, single, "zeroes 1x1");
            int[][] big = {{Integer.MIN_VALUE, -1, Integer.MAX_VALUE}, {0, 5, -1}};
            int[][] bz = copy(big); new B_setZeroes().setZeroes(bz); eq(zeroesCopy(big), bz, "zeroes with extreme values");
            // catch the bugs
            int[][] s1 = copy(a); zeroesSpread(s1); eq(new int[][]{{1, 0, 0}, {0, 0, 0}, {0, 0, 0}}, s1, "spread immediately");
            int[][] s2 = copy(lc2); zeroesEdgesFirst(s2); eq(new int[][]{{0, 0, 0, 0}, {0, 0, 0, 0}, {0, 0, 0, 0}}, s2, "edges first wipes LC 2");
            int[][] s3 = copy(b); zeroesEdgesFirst(s3); eq(new int[][]{{0, 0, 0}, {4, 0, 0}, {7, 0, 0}}, s3, "edges first wipes 6 and 9");
            int[][] s4 = copy(a); zeroesFlagsAfter(s4); eq(new int[][]{{0, 0, 0}, {0, 0, 0}, {0, 0, 9}}, s4, "flags read after notes");
            int[][] s5 = {{1, -1}, {0, 5}}; zeroesSentinel(s5, -1); eq(new int[][]{{0, 0}, {0, 0}}, s5, "sentinel -1 collides with real data");
            eq(new int[][]{{0, -1}, {0, 0}}, zeroesCopy(new int[][]{{1, -1}, {0, 5}}), "sentinel reveal: true answer");
            for (int t = 0; t < 5000; t++) {
                int rows = 1 + R.nextInt(6), cols = 1 + R.nextInt(6);
                int[][] m = rand(rows, cols, 0, 3 + R.nextInt(6));
                int[][] w = copy(m); new B_setZeroes().setZeroes(w);
                eq(zeroesCopy(m), w, "setZeroes " + show(m));
            }
        }

        // ---------- Chapter 4: Pow(x, n) ----------
        {
            B_myPow p = new B_myPow();
            B_myPowRecursive q = new B_myPowRecursive();
            eq(1024.0, p.myPow(2.0, 10), "pow LC 1");
            ok(close(9.261, p.myPow(2.1, 3), 1e-12), "pow LC 2");
            eq(0.25, p.myPow(2.0, -2), "pow LC 3");
            eq(1594323.0, p.myPow(3.0, 13), "pow 3^13");
            eq(0.0, p.myPow(2.0, Integer.MIN_VALUE), "pow 2^MIN");
            eq(1.0, p.myPow(1.0, Integer.MIN_VALUE), "pow 1^MIN");
            eq(1.0, p.myPow(-1.0, Integer.MIN_VALUE), "pow (-1)^MIN");
            eq(-1.0, p.myPow(-1.0, Integer.MAX_VALUE), "pow (-1)^MAX");
            eq(0.0, p.myPow(0.00001, Integer.MAX_VALUE), "pow tiny^MAX");
            eq(1.0, p.myPow(5.0, 0), "pow n = 0");
            eq(1.0, p.myPow(0.0, 0), "pow 0^0 is 1, as Math.pow says");
            eq(0.0, p.myPow(0.0, 5), "pow 0^5");
            eq(0.0, q.myPow(2.0, Integer.MIN_VALUE), "recursive 2^MIN");
            eq(1594323.0, q.myPow(3.0, 13), "recursive 3^13");
            eq(-128.0, p.myPow(-2.0, 7), "pow (-2)^7");
            eq(0.125, p.myPow(2.0, -3), "pow 2^-3");
            // catch the bug: int negation
            eq(1.0, myPowIntNegate(2.0, Integer.MIN_VALUE), "int negate bug returns 1.0");
            eq(Integer.MIN_VALUE, -Integer.MIN_VALUE, "-MIN_VALUE wraps");
            // reveal: computing the half twice makes O(n) calls
            powCalls = 0; powTwice(2.0, 1024); ok(powCalls > 1024, "half twice: " + powCalls + " calls for n = 1024");
            for (int t = 0; t < 4000; t++) {                // small exponents: repeated multiplication
                double x = (R.nextInt(41) - 20) / 8.0;
                if (x == 0) continue;
                int n = R.nextInt(41) - 20;
                double slow = 1; for (int i = 0; i < Math.abs(n); i++) slow *= x;
                if (n < 0) slow = 1 / slow;
                ok(close(slow, p.myPow(x, n), 1e-12), "myPow(" + x + ", " + n + ") = " + p.myPow(x, n) + " vs " + slow);
                ok(close(slow, q.myPow(x, n), 1e-12), "recursive myPow(" + x + ", " + n + ")");
            }
            for (int t = 0; t < 4000; t++) {                // huge exponents with |x^n| inside [1e-4, 1e4]: Math.pow with tolerance
                int n = 1 + R.nextInt(Integer.MAX_VALUE - 1);
                if (R.nextBoolean()) n = -n;
                double x = Math.exp((R.nextDouble() * 18 - 9) / n);
                if (n % 2 == 0 && R.nextBoolean()) x = -x;
                double want = Math.pow(x, n);
                ok(close(want, p.myPow(x, n), 1e-6), "myPow(" + x + ", " + n + ") = " + p.myPow(x, n) + " vs " + want);
                ok(close(want, q.myPow(x, n), 1e-6), "recursive myPow(" + x + ", " + n + ")");
            }
        }

        // ---------- Side quest 1: Spiral Matrix II ----------
        {
            eq(new int[][]{{1, 2, 3}, {8, 9, 4}, {7, 6, 5}}, new B_generateMatrix().generateMatrix(3), "spiral II n = 3");
            eq(new int[][]{{1}}, new B_generateMatrix().generateMatrix(1), "spiral II n = 1");
            for (int n = 1; n <= 12; n++) {
                int[][] m = new B_generateMatrix().generateMatrix(n);
                List<Integer> order = spiralSim(m), want = new ArrayList<>();
                for (int k = 1; k <= n * n; k++) want.add(k);
                eq(want, order, "spiral II read back n = " + n);
            }
        }

        // ---------- Side quest 2: Transpose (non-square) and a non-square quarter turn ----------
        {
            eq(new int[][]{{1, 4}, {2, 5}, {3, 6}}, new B_transpose().transpose(new int[][]{{1, 2, 3}, {4, 5, 6}}), "transpose LC 2");
            eq(new int[][]{{4, 1}, {5, 2}, {6, 3}}, new B_transpose().rotateClockwise(new int[][]{{1, 2, 3}, {4, 5, 6}}), "rotate 2x3");
            for (int t = 0; t < 3000; t++) {
                int rows = 1 + R.nextInt(6), cols = 1 + R.nextInt(6);
                int[][] m = rand(rows, cols, -9, 9);
                int[][] tr = new B_transpose().transpose(m);
                eq(cols, tr.length, "transpose rows"); eq(rows, tr[0].length, "transpose cols");
                for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) eq(m[r][c], tr[c][r], "transpose cell");
                eq(rotRectCW(m), new B_transpose().rotateClockwise(m), "rotateClockwise " + show(m));
                if (rows == cols) eq(rotCW(m), new B_transpose().rotateClockwise(m), "square case agrees with rotate");
            }
        }

        // ---------- Side quest 3: Game of Life ----------
        {
            int[][] lc = {{0, 1, 0}, {0, 0, 1}, {1, 1, 1}, {0, 0, 0}};
            int[][] x = copy(lc); new B_gameOfLife().gameOfLife(x);
            eq(new int[][]{{0, 0, 0}, {1, 0, 1}, {0, 1, 1}, {0, 1, 0}}, x, "life LC 1");
            int[][] y = {{1, 1}, {1, 0}}; new B_gameOfLife().gameOfLife(y); eq(new int[][]{{1, 1}, {1, 1}}, y, "life LC 2");
            int[][] blink = {{0, 1, 0}, {0, 1, 0}, {0, 1, 0}};
            int[][] bb = copy(blink); new B_gameOfLife().gameOfLife(bb); eq(new int[][]{{0, 0, 0}, {1, 1, 1}, {0, 0, 0}}, bb, "blinker turns");
            int[][] bd = copy(blink); lifeDirect(bd); eq(new int[][]{{0, 0, 0}, {0, 0, 0}, {0, 0, 0}}, bd, "direct update kills the blinker");
            for (int t = 0; t < 4000; t++) {
                int rows = 1 + R.nextInt(6), cols = 1 + R.nextInt(6);
                int[][] m = rand(rows, cols, 0, 1);
                int[][] w = copy(m); new B_gameOfLife().gameOfLife(w);
                eq(lifeCopy(m), w, "gameOfLife " + show(m));
            }
        }

        // ---------- Side quest 4: diagonals (r + c and r - c) ----------
        {
            B_diagonals d = new B_diagonals();
            eq(new int[]{1, 2, 4, 7, 5, 3, 6, 8, 9}, d.findDiagonalOrder(new int[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}), "zigzag LC 1");
            eq(new int[]{1, 2, 3, 4}, d.findDiagonalOrder(new int[][]{{1, 2}, {3, 4}}), "zigzag LC 2");
            eq(true, d.isToeplitzMatrix(new int[][]{{1, 2, 3, 4}, {5, 1, 2, 3}, {9, 5, 1, 2}}), "toeplitz LC 1");
            eq(false, d.isToeplitzMatrix(new int[][]{{1, 2}, {2, 2}}), "toeplitz LC 2");
            for (int t = 0; t < 4000; t++) {
                int rows = 1 + R.nextInt(6), cols = 1 + R.nextInt(6);
                int[][] m = rand(rows, cols, 0, 20);
                eq(zigzagSort(m), d.findDiagonalOrder(m), "findDiagonalOrder " + show(m));
                int[][] tp = new int[rows][cols];
                int[] seed = new int[rows + cols];
                for (int k = 0; k < seed.length; k++) seed[k] = R.nextInt(3);
                for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) tp[r][c] = seed[r - c + cols];
                if (R.nextInt(3) == 0) tp[R.nextInt(rows)][R.nextInt(cols)] = R.nextInt(3);
                eq(toeplitzByGroups(tp), d.isToeplitzMatrix(tp), "isToeplitzMatrix " + show(tp));
            }
        }

        // ---------- Side quest 5: Search a 2D Matrix II (staircase) ----------
        {
            int[][] lc = {{1, 4, 7, 11, 15}, {2, 5, 8, 12, 19}, {3, 6, 9, 16, 22}, {10, 13, 14, 17, 24}, {18, 21, 23, 26, 30}};
            eq(true, new B_searchMatrix().searchMatrix(lc, 5), "staircase LC 1");
            eq(false, new B_searchMatrix().searchMatrix(lc, 20), "staircase LC 2");
            eq(true, new B_searchMatrix().searchMatrix(new int[][]{{-5}}, -5), "staircase 1x1 hit");
            eq(false, new B_searchMatrix().searchMatrix(new int[][]{{-5}}, 0), "staircase 1x1 miss");
            for (int t = 0; t < 5000; t++) {
                int rows = 1 + R.nextInt(6), cols = 1 + R.nextInt(6);
                int[][] m = new int[rows][cols];
                for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++)
                    m[r][c] = Math.max(r > 0 ? m[r - 1][c] : -10, c > 0 ? m[r][c - 1] : -10) + R.nextInt(3);   // non-decreasing, duplicates allowed
                int target = -12 + R.nextInt(40);
                eq(contains(m, target), new B_searchMatrix().searchMatrix(m, target), "searchMatrix " + show(m) + " t=" + target);
            }
        }

        // ---------- Side quest 6: Valid Square ----------
        {
            B_validSquare v = new B_validSquare();
            eq(true, v.validSquare(new int[]{0, 0}, new int[]{1, 1}, new int[]{1, 0}, new int[]{0, 1}), "square LC 1");
            eq(false, v.validSquare(new int[]{0, 0}, new int[]{1, 1}, new int[]{1, 0}, new int[]{0, 12}), "square LC 2");
            eq(true, v.validSquare(new int[]{1, 0}, new int[]{-1, 0}, new int[]{0, 1}, new int[]{0, -1}), "square LC 3");
            eq(false, v.validSquare(new int[]{0, 0}, new int[]{2, 1}, new int[]{4, 0}, new int[]{2, -1}), "rhombus");
            eq(false, v.validSquare(new int[]{1, 1}, new int[]{1, 1}, new int[]{1, 1}, new int[]{1, 1}), "one point");
            eq(true, v.validSquare(new int[]{-10000, -10000}, new int[]{10000, -10000}, new int[]{10000, 10000}, new int[]{-10000, 10000}), "largest square in bounds");
            eq(true, v.validSquare(new int[]{-10000, 0}, new int[]{0, -10000}, new int[]{10000, 0}, new int[]{0, 10000}), "largest tilted square in bounds");
            for (int t = 0; t < 6000; t++) {
                int[][] p = new int[4][];
                if (R.nextBoolean()) {                       // a real square, shuffled, sometimes nudged
                    int x = R.nextInt(9) - 4, y = R.nextInt(9) - 4, a = R.nextInt(7) - 3, b = R.nextInt(7) - 3;
                    int[][] sq = {{x, y}, {x + a, y + b}, {x + a - b, y + b + a}, {x - b, y + a}};
                    List<int[]> l = new ArrayList<>(Arrays.asList(sq)); Collections.shuffle(l, R);
                    for (int i = 0; i < 4; i++) p[i] = l.get(i).clone();
                    if (R.nextInt(3) == 0) p[R.nextInt(4)][R.nextInt(2)] += R.nextBoolean() ? 1 : -1;
                } else for (int i = 0; i < 4; i++) p[i] = new int[]{R.nextInt(5) - 2, R.nextInt(5) - 2};
                boolean want = squareByRotation(p);
                eq(want, v.validSquare(p[0], p[1], p[2], p[3]), "validSquare " + show(p));
                eq(want, validSquareThreeChecks(p[0], p[1], p[2], p[3]), "on integer points the diagonal check never changes the answer");
            }
        }

        System.out.println("OK matrix: " + cases + " checks passed");
    }
}
