import java.lang.reflect.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;

// Exercises every compiled design in src/lld-lessons/behavioral-patterns.mdx. Strategies conserve money on
// random inputs; the template's audit is unskippable; state machines accept exactly the legal events
// (checked against an independent switch-based simulator and an edge list); undo/redo agrees with a snapshot
// model on random sequences; observers isolate failures, unsubscribe, don't leak, and deliver asynchronously;
// chains short-circuit in order and match an if-oracle; the mediator keeps its invariants; iterators fail
// fast; visitors agree with brute-force recursion. Every number quoted in the lesson and its traces is pinned.
public class Check {
    static int checks = 0;
    static final Random rnd = new Random(20261007);

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }
    static void throwsOn(Class<? extends Throwable> type, Runnable r, String what) {
        checks++;
        try { r.run(); } catch (Throwable t) {
            if (type.isInstance(t)) return;
            throw new AssertionError(what + ": threw " + t + " instead of " + type.getSimpleName());
        }
        throw new AssertionError(what + ": did not throw " + type.getSimpleName());
    }
    /** Runs r; returns the exception class it threw, or null. */
    static Class<?> outcome(Runnable r) {
        try { r.run(); return null; } catch (RuntimeException e) { return e.getClass(); }
    }

    public static void main(String[] args) throws Exception {
        split();
        splitCtx();
        reports();
        appt();
        apptStates();
        vending();
        vending2();
        desk();
        draft();
        events();
        listenerMess();
        pipeline();
        rules();
        ramp();
        chat();
        iter();
        bill();
        bill2();
        System.out.println("OK behavioral-patterns: " + checks + " checks passed");
    }

    // ---------------- Chapter 1: Strategy ----------------
    static long sum(List<B_split.Share> shares) { long s = 0; for (var x : shares) s += x.paise(); return s; }

    static void split() {
        B_split b = new B_split();
        B_split.EqualSplit equal = b.new EqualSplit();
        List<B_split.Party> three = List.of(B_split.Party.person("Asha"), B_split.Party.person("Ravi"), B_split.Party.person("Mina"));
        List<Long> got = new ArrayList<>();
        for (var s : equal.split(10000, three)) got.add(s.paise());
        eq(List.of(3334L, 3333L, 3333L), got, "10000 / 3 = 3334 + 3333 + 3333");
        eq(List.of(), equal.split(0, List.of()), "nothing to split among nobody");
        throwsOn(IllegalArgumentException.class, () -> equal.split(5, List.of()), "money with no parties");
        throwsOn(IllegalArgumentException.class, () -> equal.split(-1, three), "negative total");
        throwsOn(IllegalArgumentException.class, () -> B_split.Party.insurer("X", -1), "negative cap");

        // Random: shares sum exactly, never negative, differ by at most 1, extras go to the first parties.
        for (int t = 0; t < 3000; t++) {
            int n = 1 + rnd.nextInt(7);
            long total = rnd.nextInt(5) == 0 ? rnd.nextInt(10) : rnd.nextInt(1_000_000);
            List<B_split.Party> ps = new ArrayList<>();
            for (int i = 0; i < n; i++) ps.add(B_split.Party.person("P" + i));
            List<B_split.Share> shares = equal.split(total, ps);
            eq(total, sum(shares), "equal split conserves money");
            for (int i = 0; i < n; i++) {
                eq(ps.get(i), shares.get(i).party(), "party order kept");
                long expect = total / n + (i < total % n ? 1 : 0);
                eq(expect, shares.get(i).paise(), "equal share oracle");
            }
        }

        // Insurance first: 100001 paise, cap 40000, two family members.
        B_split.InsuranceFirstSplit ins = b.new InsuranceFirstSplit(equal);
        B_split.Party insurer = B_split.Party.insurer("Insurer", 40000);
        List<B_split.Share> s = ins.split(100001, List.of(insurer, B_split.Party.person("Asha"), B_split.Party.person("Ravi")));
        eq(List.of(40000L, 30001L, 30000L), List.of(s.get(0).paise(), s.get(1).paise(), s.get(2).paise()), "insurance-first trace numbers");
        throwsOn(IllegalArgumentException.class, () -> ins.split(100, List.of(B_split.Party.person("A"))), "no insurer");
        eq(List.of(new B_split.Share(insurer, 30000)), ins.split(30000, List.of(insurer)), "fully covered, no family");
        throwsOn(IllegalArgumentException.class, () -> ins.split(50000, List.of(insurer)), "uncovered rest with no family");
        for (int t = 0; t < 2000; t++) {
            long cap = rnd.nextInt(100_000), total = rnd.nextInt(200_000);
            int fam = 1 + rnd.nextInt(5);
            List<B_split.Party> ps = new ArrayList<>();
            ps.add(B_split.Party.insurer("I", cap));
            for (int i = 0; i < fam; i++) ps.add(B_split.Party.person("F" + i));
            Collections.shuffle(ps, rnd);
            List<B_split.Share> sh = ins.split(total, ps);
            eq(total, sum(sh), "insurance-first conserves money");
            eq(Math.min(total, cap), sh.get(0).paise(), "insurer pays min(total, cap)");
            for (var x : sh) yes(x.paise() >= 0, "no negative share");
        }

        // Registry, lambda strategy, and the self-naming registry.
        B_split.BillSplitter splitter = b.standardSplitter();
        List<B_split.Party> fam = List.of(B_split.Party.person("Asha"), B_split.Party.person("Ravi"), B_split.Party.person("Mina"));
        eq(10000L, sum(splitter.split(new B_split.Bill("B1", 10000, B_split.SplitType.EQUAL, fam))), "registry equal");
        eq(List.of(new B_split.Share(fam.get(0), 777)), splitter.split(new B_split.Bill("B2", 777, B_split.SplitType.FIRST_PAYS_ALL, fam)), "lambda strategy");
        throwsOn(IllegalArgumentException.class, () -> new B_split.Bill("B3", 1, B_split.SplitType.EQUAL, List.of()), "bill refuses no parties");
        B_split.BillSplitter partial = b.new BillSplitter(Map.of(B_split.SplitType.EQUAL, equal));
        throwsOn(IllegalArgumentException.class, () -> partial.split(new B_split.Bill("B4", 1, B_split.SplitType.INSURANCE_FIRST, fam)), "missing strategy fails loudly");

        B_split.NamedSplit eqNamed = new B_split.NamedSplit() {
            public B_split.SplitType type() { return B_split.SplitType.EQUAL; }
            public List<B_split.Share> split(long total, List<B_split.Party> parties) { return equal.split(total, parties); }
        };
        B_split.NamedSplit eqNamed2 = new B_split.NamedSplit() {
            public B_split.SplitType type() { return B_split.SplitType.EQUAL; }
            public List<B_split.Share> split(long total, List<B_split.Party> parties) { return List.of(); }
        };
        eq(Set.of(B_split.SplitType.EQUAL), b.registryOf(List.of(eqNamed)).keySet(), "registry keyed by type()");
        throwsOn(IllegalStateException.class, () -> b.registryOf(List.of(eqNamed, eqNamed2)), "duplicate keys fail at boot");
        throwsOn(UnsupportedOperationException.class, () -> b.registryOf(List.of(eqNamed)).put(B_split.SplitType.EQUAL, equal), "registry is immutable");

        // Your turn: discounts.
        var d = b.discounts();
        eq(100000L, d.get(B_split.PatientCategory.GENERAL).applyAsLong(100000), "general pays full");
        eq(90000L, d.get(B_split.PatientCategory.SENIOR).applyAsLong(100000), "senior 10% off ₹1000");
        eq(75000L, d.get(B_split.PatientCategory.STAFF).applyAsLong(100000), "staff 25% off ₹1000");
        eq(450000L, d.get(B_split.PatientCategory.STAFF).applyAsLong(500000), "staff cap ₹500 on ₹5000");
        for (int t = 0; t < 1000; t++) {
            long total = rnd.nextInt(2_000_000);
            eq(total - total / 10, d.get(B_split.PatientCategory.SENIOR).applyAsLong(total), "senior oracle");
            eq(total - Math.min(total / 4, 50_000), d.get(B_split.PatientCategory.STAFF).applyAsLong(total), "staff oracle");
        }
    }

    // ---------------- Side quest 1: percent split ----------------
    static void splitCtx() {
        B_splitCtx b = new B_splitCtx();
        B_splitCtx.BillSplitter sp = b.splitter();
        List<B_splitCtx.Party> ps = List.of(B_splitCtx.Party.person("A"), B_splitCtx.Party.person("B"), B_splitCtx.Party.person("C"));
        Function<List<B_splitCtx.Share>, List<Long>> amounts = l -> { List<Long> out = new ArrayList<>(); for (var s : l) out.add(s.paise()); return out; };
        eq(List.of(5000L, 3000L, 2000L), amounts.apply(sp.split(B_splitCtx.SplitType.PERCENT, new B_splitCtx.SplitRequest(10000, ps, Map.of("A", 50, "B", 30, "C", 20)))), "50/30/20");
        eq(List.of(3300L, 3300L, 3401L), amounts.apply(sp.split(B_splitCtx.SplitType.PERCENT, new B_splitCtx.SplitRequest(10001, ps, Map.of("A", 33, "B", 33, "C", 34)))), "largest remainder 33/33/34");
        eq(List.of(3334L, 3333L, 3333L), amounts.apply(sp.split(B_splitCtx.SplitType.EQUAL, new B_splitCtx.SplitRequest(10000, ps))), "equal split unchanged");
        throwsOn(IllegalArgumentException.class, () -> sp.split(B_splitCtx.SplitType.PERCENT, new B_splitCtx.SplitRequest(100, ps, Map.of("A", 50, "B", 30, "C", 30))), "percentages must sum to 100");
        throwsOn(IllegalArgumentException.class, () -> sp.split(B_splitCtx.SplitType.PERCENT, new B_splitCtx.SplitRequest(100, ps, Map.of("A", 50, "B", 50))), "missing percentage");
        throwsOn(IllegalArgumentException.class, () -> new B_splitCtx.SplitRequest(-1, ps), "negative total");
        for (int t = 0; t < 3000; t++) {
            int n = 1 + rnd.nextInt(6);
            List<B_splitCtx.Party> parties = new ArrayList<>();
            Map<String, Integer> pct = new HashMap<>();
            int left = 100;
            for (int i = 0; i < n; i++) {
                parties.add(B_splitCtx.Party.person("P" + i));
                int p = i == n - 1 ? left : (rnd.nextInt(4) == 0 ? 0 : rnd.nextInt(left + 1));
                pct.put("P" + i, p);
                left -= p;
            }
            long total = rnd.nextInt(3) == 0 ? rnd.nextInt(20) : rnd.nextInt(1_000_000);
            List<B_splitCtx.Share> shares = sp.split(B_splitCtx.SplitType.PERCENT, new B_splitCtx.SplitRequest(total, parties, pct));
            long s = 0;
            for (int i = 0; i < n; i++) {
                long share = shares.get(i).paise();
                long exact100 = total * pct.get("P" + i);
                yes(share * 100 >= exact100 - 99 && share * 100 <= exact100 + 99 && share >= exact100 / 100 && share <= (exact100 + 99) / 100, "share is floor or ceil of exact");
                if (pct.get("P" + i) == 0) eq(0L, share, "0% pays nothing");
                s += share;
            }
            eq(total, s, "percent split conserves money");
        }
    }

    // ---------------- Chapter 2: Template Method ----------------
    static void reports() throws Exception {
        B_reportMess mess = new B_reportMess();
        mess.revenueReport(List.of(100L, 200L));
        mess.stockReport(Map.of("insulin", 2));
        eq(List.of("REPORT_DELIVERED revenue"), mess.audit, "the copy-pasted stock report never audits");
        eq("REVENUE 300", mess.revenueReport(List.of(100L, 200L)), "mess revenue");

        B_reports b = new B_reports();
        LocalDate day = LocalDate.of(2026, 3, 13);
        List<String> audit = new ArrayList<>();
        Map<LocalDate, List<Long>> inv = Map.of(day, List.of(1500L, 3000L));
        B_reports.Report r = b.new DailyRevenueReport(audit, inv).run(day);
        eq("Revenue 2026-03-13: 4500 paise from 2 invoices", r.body(), "revenue body");
        eq(List.of("REPORT_DELIVERED revenue"), audit, "template audits");
        eq(1L, r.auditSeq(), "audit sequence");
        eq("Revenue 2026-03-14: 0 paise from 0 invoices", b.new DailyRevenueReport(audit, inv).run(day.plusDays(1)).body(), "empty day");

        List<String> audit2 = new ArrayList<>();
        B_reports.Report viaLambdas = b.revenueWithLambdas(b.new ReportRunner(audit2), inv, day);
        eq(r.body(), viaLambdas.body(), "runner with lambdas = template");
        eq(List.of("REPORT_DELIVERED revenue"), audit2, "runner audits too");
        for (int t = 0; t < 300; t++) {
            List<Long> xs = new ArrayList<>();
            for (int i = rnd.nextInt(6); i > 0; i--) xs.add((long) rnd.nextInt(100000));
            Map<LocalDate, List<Long>> m = Map.of(day, xs);
            eq(b.new DailyRevenueReport(new ArrayList<>(), m).run(day).body(), b.revenueWithLambdas(b.new ReportRunner(new ArrayList<>()), m, day).body(), "runner/template agree");
        }

        List<String> audit3 = new ArrayList<>();
        var shelf = List.of(new B_reports.StockRow("gauze", 7), new B_reports.StockRow("saline", 40), new B_reports.StockRow("insulin", 2), new B_reports.StockRow("masks", 10));
        B_reports.Report stock = b.new PharmacyStockReport(audit3, shelf).run(day);
        eq("Low stock 2026-03-13: insulin=2, gauze=7", stock.body(), "stock report body (your turn)");
        eq(List.of("REPORT_DELIVERED stock"), audit3, "stock report audits without mentioning it");

        Method run = B_reports.ReportJob.class.getDeclaredMethod("run", LocalDate.class);
        yes(Modifier.isFinal(run.getModifiers()), "run() is final");
        Method deliver = B_reports.ReportJob.class.getDeclaredMethod("deliver", B_reports.Rendered.class);
        yes(Modifier.isPrivate(deliver.getModifiers()), "deliver() is private");
        yes(Modifier.isAbstract(B_reports.ReportJob.class.getDeclaredMethod("fetch", LocalDate.class).getModifiers()), "fetch is abstract");
        yes(!Modifier.isAbstract(B_reports.ReportJob.class.getDeclaredMethod("transform", List.class).getModifiers()), "transform is a hook with a body");
    }

    // ---------------- Chapter 3: State ----------------
    static final String[] EVENTS = { "confirm", "checkIn", "complete", "cancel" };
    static final Map<String, String> EDGES = Map.of(
        "REQUESTED/confirm", "CONFIRMED", "REQUESTED/cancel", "CANCELLED",
        "CONFIRMED/checkIn", "CHECKED_IN", "CONFIRMED/cancel", "CANCELLED",
        "CHECKED_IN/complete", "COMPLETED");

    static void fire(B_appt.Appointment a, String e) {
        switch (e) { case "confirm": a.confirm(); break; case "checkIn": a.checkIn(); break; case "complete": a.complete(); break; default: a.cancel(); }
    }
    static void fire(B_apptStates.Appointment a, String e) {
        switch (e) { case "confirm": a.confirm(); break; case "checkIn": a.checkIn(); break; case "complete": a.complete(); break; default: a.cancel(); }
    }
    static B_appt.Appointment apptIn(B_appt b, B_appt.ApptStatus target) {
        B_appt.Appointment a = b.new Appointment();
        switch (target) {
            case REQUESTED: break;
            case CONFIRMED: a.confirm(); break;
            case CHECKED_IN: a.confirm(); a.checkIn(); break;
            case COMPLETED: a.confirm(); a.checkIn(); a.complete(); break;
            case CANCELLED: a.cancel(); break;
        }
        return a;
    }

    static void appt() {
        B_appt b = new B_appt();
        int legal = 0;
        for (B_appt.ApptStatus s : B_appt.ApptStatus.values())
            for (String e : EVENTS) {
                B_appt.Appointment a = apptIn(b, s);
                eq(s, a.status(), "setup " + s);
                String to = EDGES.get(s + "/" + e);
                if (to != null) {
                    fire(a, e);
                    eq(to, a.status().name(), s + " --" + e + "-->");
                    legal++;
                } else {
                    throwsOn(IllegalStateException.class, () -> fire(a, e), "illegal " + s + "/" + e);
                    eq(s, a.status(), "refused event leaves " + s + " unchanged");
                }
            }
        eq(5, legal, "exactly the five event arrows are legal");
        for (B_appt.ApptStatus s : B_appt.ApptStatus.values())
            for (B_appt.ApptStatus t : B_appt.ApptStatus.values())
                eq(EDGES.containsValue(t.name()) && EDGES.entrySet().stream().anyMatch(en -> en.getKey().startsWith(s.name() + "/") && en.getValue().equals(t.name())), s.canGoTo(t), "table " + s + "->" + t);
        B_appt.Appointment done = apptIn(b, B_appt.ApptStatus.COMPLETED);
        throwsOn(IllegalStateException.class, done::cancel, "COMPLETED -> cancel throws (trace)");
        eq(B_appt.ApptStatus.COMPLETED, done.status(), "stays COMPLETED");
    }

    static final Map<String, String> CLASS_NAMES = Map.of("REQUESTED", "Requested", "CONFIRMED", "Confirmed", "CHECKED_IN", "CheckedIn", "COMPLETED", "Completed", "CANCELLED", "Cancelled");

    static void apptStates() {
        B_apptStates b = new B_apptStates();
        B_appt b1 = new B_appt();
        // Every event sequence up to length 5: both forms accept/refuse identically.
        List<List<String>> seqs = new ArrayList<>();
        seqs.add(List.of());
        for (int len = 1; len <= 5; len++) {
            List<List<String>> next = new ArrayList<>();
            for (List<String> s : seqs) if (s.size() == len - 1) for (String e : EVENTS) { List<String> x = new ArrayList<>(s); x.add(e); next.add(x); }
            seqs.addAll(next);
        }
        for (List<String> seq : seqs) {
            B_appt.Appointment table = b1.new Appointment();
            B_apptStates.Appointment classes = b.new Appointment();
            for (String e : seq) {
                Class<?> o1 = outcome(() -> fire(table, e));
                Class<?> o2 = outcome(() -> fire(classes, e));
                eq(o1, o2, "both forms agree on " + seq);
                eq(CLASS_NAMES.get(table.status().name()), classes.status(), "same state after " + seq);
            }
        }
        B_apptStates.Appointment a = b.new Appointment();
        a.confirm(); a.checkIn(); a.complete();
        eq(List.of("slot reserved", "room assigned", "room released"), a.effects, "per-state behaviour");
        B_apptStates.Appointment c = b.new Appointment();
        c.confirm(); c.cancel();
        eq(List.of("slot reserved", "slot released"), c.effects, "cancel after confirm releases the slot");
        throwsOn(IllegalStateException.class, c::confirm, "Cancelled is terminal");
        eq(List.of("slot reserved", "slot released"), c.effects, "refused event has no side effect");
    }

    // An independent, switch-based simulator of the vending machine rules.
    static final class VendModel {
        final Map<String, Integer> prices, stock = new TreeMap<>();
        String mode; int credit; String display = "";
        final List<String> dispensed = new ArrayList<>(); final List<Integer> change = new ArrayList<>();
        boolean panelFeature;
        VendModel(Map<String, Integer> prices, Map<String, Integer> init, boolean panelFeature) {
            this.prices = prices; this.panelFeature = panelFeature;
            for (String s : prices.keySet()) stock.put(s, init.getOrDefault(s, 0));
            mode = total() == 0 ? "SoldOut" : "Idle";
        }
        int total() { int t = 0; for (int v : stock.values()) t += v; return t; }
        void insert(int coin) {
            if (coin <= 0) throw new IllegalArgumentException();
            if (!mode.equals("Idle") && !mode.equals("HasCredit")) throw new IllegalStateException();
            credit += coin; mode = "HasCredit"; display = "credit " + credit;
        }
        void select(String slot) {
            if (!mode.equals("HasCredit")) throw new IllegalStateException();
            Integer price = prices.get(slot);
            if (price == null) throw new IllegalArgumentException();
            if (stock.get(slot) == 0) { display = slot + " is sold out"; return; }
            if (credit < price) { display = "insert " + (price - credit) + " more"; return; }
            stock.put(slot, stock.get(slot) - 1); dispensed.add(slot);
            if (credit > price) change.add(credit - price);
            credit = 0; display = "enjoy your " + slot;
            mode = total() == 0 ? "SoldOut" : "Idle";
        }
        void refund() {
            if (!mode.equals("HasCredit")) throw new IllegalStateException();
            change.add(credit); credit = 0; display = "refunded"; mode = "Idle";
        }
        void restock(String slot, int units) {
            if (mode.equals("HasCredit")) throw new IllegalStateException();
            if (!prices.containsKey(slot) || units <= 0) throw new IllegalArgumentException();
            stock.put(slot, stock.get(slot) + units);
            if (mode.equals("SoldOut")) mode = "Idle";
        }
        void openPanel() {
            if (!mode.equals("Idle") && !mode.equals("SoldOut")) throw new IllegalStateException();
            mode = "Maintenance";
        }
        void closePanel() {
            if (!mode.equals("Maintenance")) throw new IllegalStateException();
            mode = total() == 0 ? "SoldOut" : "Idle";
        }
    }

    interface Vend {
        void insert(int c); void select(String s); void refund(); void restock(String s, int u);
        void openPanel(); void closePanel();
        String state(); int credit(); int stockOf(String s); List<String> dispensed(); List<Integer> change(); String display();
    }
    static Vend wrap(B_vending.VendingMachine m) {
        return new Vend() {
            public void insert(int c) { m.insert(c); } public void select(String s) { m.select(s); } public void refund() { m.refund(); }
            public void restock(String s, int u) { m.restock(s, u); }
            public void openPanel() { throw new UnsupportedOperationException(); } public void closePanel() { throw new UnsupportedOperationException(); }
            public String state() { return m.state(); } public int credit() { return m.credit(); } public int stockOf(String s) { return m.stockOf(s); }
            public List<String> dispensed() { return m.dispensed; } public List<Integer> change() { return m.change; } public String display() { return m.display; }
        };
    }
    static Vend wrap(B_vending2.VendingMachine m) {
        return new Vend() {
            public void insert(int c) { m.insert(c); } public void select(String s) { m.select(s); } public void refund() { m.refund(); }
            public void restock(String s, int u) { m.restock(s, u); }
            public void openPanel() { m.openPanel(); } public void closePanel() { m.closePanel(); }
            public String state() { return m.state(); } public int credit() { return m.credit(); } public int stockOf(String s) { return m.stockOf(s); }
            public List<String> dispensed() { return m.dispensed; } public List<Integer> change() { return m.change; } public String display() { return m.display; }
        };
    }

    static void randomVending(Function<Map<String, Integer>[], Vend> make, boolean panel, String label) {
        Map<String, Integer> prices = Map.of("A1", 25, "B2", 40);
        int[] coins = { 1, 2, 5, 10, 20, 0, -5 };
        String[] slots = { "A1", "B2", "Z9" };
        for (int run = 0; run < 1500; run++) {
            Map<String, Integer> init = Map.of("A1", rnd.nextInt(3), "B2", rnd.nextInt(3));
            @SuppressWarnings("unchecked") Map<String, Integer>[] args = new Map[] { prices, init };
            Vend m = make.apply(args);
            VendModel o = new VendModel(prices, init, panel);
            long inserted = 0;
            for (int step = 0; step < 40; step++) {
                int op = rnd.nextInt(panel ? 6 : 4);
                Class<?> got, want;
                if (op == 0) {
                    int c = coins[rnd.nextInt(coins.length)];
                    got = outcome(() -> m.insert(c)); want = outcome(() -> o.insert(c));
                    if (want == null) inserted += c;
                } else if (op == 1) {
                    String s = slots[rnd.nextInt(3)];
                    got = outcome(() -> m.select(s)); want = outcome(() -> o.select(s));
                } else if (op == 2) {
                    got = outcome(m::refund); want = outcome(o::refund);
                } else if (op == 3) {
                    String s = slots[rnd.nextInt(3)]; int u = rnd.nextInt(4);
                    got = outcome(() -> m.restock(s, u)); want = outcome(() -> o.restock(s, u));
                } else if (op == 4) {
                    got = outcome(m::openPanel); want = outcome(o::openPanel);
                } else {
                    got = outcome(m::closePanel); want = outcome(o::closePanel);
                }
                eq(want, got, label + " outcome of op " + op);
                eq(o.mode, m.state(), label + " state");
                eq(o.credit, m.credit(), label + " credit");
                eq(o.stock.get("A1"), m.stockOf("A1"), label + " stock A1");
                eq(o.stock.get("B2"), m.stockOf("B2"), label + " stock B2");
                eq(o.dispensed, m.dispensed(), label + " dispensed");
                eq(o.change, m.change(), label + " change");
                eq(o.display, m.display(), label + " display");
                long sales = 0; for (String s : m.dispensed()) sales += prices.get(s);
                long back = 0; for (int c : m.change()) back += c;
                eq(inserted, sales + back + m.credit(), label + " money conserved");
                if (m.state().equals("Idle")) yes(m.stockOf("A1") + m.stockOf("B2") > 0, "Idle always has stock");
                if (m.state().equals("HasCredit")) yes(m.credit() > 0, "HasCredit always holds credit");
            }
        }
    }

    static void vending() {
        B_vending b = new B_vending();
        // The trace: A1 costs 25 and is the last item.
        B_vending.VendingMachine m = b.new VendingMachine(Map.of("A1", 25, "B2", 40), Map.of("A1", 1));
        eq("Idle", m.state(), "starts Idle with stock");
        m.insert(10); m.insert(10); m.select("A1");
        eq("insert 5 more", m.display, "short by 5");
        eq("HasCredit", m.state(), "still HasCredit");
        m.insert(10); m.select("A1");
        eq(List.of("A1"), m.dispensed, "dispensed A1");
        eq(List.of(5), m.change, "5 change");
        eq("SoldOut", m.state(), "last item -> SoldOut");
        throwsOn(IllegalStateException.class, () -> m.insert(10), "SoldOut refuses coins (Bram's bug)");
        eq(0, m.credit(), "refused coin not counted");
        m.restock("B2", 2);
        eq("Idle", m.state(), "restock -> Idle");
        throwsOn(IllegalStateException.class, () -> m.select("B2"), "select in Idle");
        throwsOn(IllegalStateException.class, m::refund, "refund in Idle");
        eq("SoldOut", b.new VendingMachine(Map.of("A1", 25), Map.of()).state(), "empty machine starts SoldOut");
        B_vending.VendingMachine m2 = b.new VendingMachine(Map.of("A1", 25, "B2", 40), Map.of("A1", 1));
        m2.insert(20); m2.select("B2");
        eq("B2 is sold out", m2.display, "sold-out slot message");
        throwsOn(IllegalArgumentException.class, () -> m2.select("Z9"), "unknown slot");
        eq("HasCredit", m2.state(), "unknown slot changes nothing");
        throwsOn(IllegalStateException.class, () -> m2.restock("A1", 1), "no restock mid-purchase");
        m2.refund();
        eq(List.of(20), m2.change, "refund");
        randomVending(a -> wrap(b.new VendingMachine(a[0], a[1])), false, "vending");
    }

    static void vending2() {
        B_vending2 b = new B_vending2();
        B_vending2.VendingMachine m = b.new VendingMachine(Map.of("A1", 25), Map.of("A1", 1));
        m.openPanel();
        eq("Maintenance", m.state(), "panel open");
        throwsOn(IllegalStateException.class, () -> m.insert(10), "no coins in maintenance");
        throwsOn(IllegalStateException.class, () -> m.select("A1"), "no select in maintenance");
        throwsOn(IllegalStateException.class, m::refund, "no refund in maintenance");
        throwsOn(IllegalStateException.class, m::openPanel, "already open");
        m.restock("A1", 3);
        eq(4, m.stockOf("A1"), "restock while open");
        m.closePanel();
        eq("Idle", m.state(), "close with stock -> Idle");
        throwsOn(IllegalStateException.class, m::closePanel, "close when not open");
        m.insert(5);
        throwsOn(IllegalStateException.class, m::openPanel, "HasCredit refuses openPanel");
        B_vending2.VendingMachine empty = b.new VendingMachine(Map.of("A1", 25), Map.of());
        empty.openPanel();
        empty.closePanel();
        eq("SoldOut", empty.state(), "close with no stock -> SoldOut");
        randomVending(a -> wrap(b.new VendingMachine(a[0], a[1])), false, "vending2 old events");
        randomVending(a -> wrap(b.new VendingMachine(a[0], a[1])), true, "vending2 with panel");
    }

    // ---------------- Chapter 4: Command ----------------
    static final LocalDateTime D10 = LocalDateTime.of(2026, 3, 13, 10, 0);

    static void desk() {
        B_desk b = new B_desk();
        // The trace sequence.
        B_desk.Scheduler s = b.new Scheduler();
        B_desk.FrontDesk desk = b.new FrontDesk();
        B_desk.BookAppointment asha = b.new BookAppointment(s, new B_desk.BookingRequest("Asha", "Dr Rao", D10));
        desk.run(asha);
        eq("A-1", asha.booked().id(), "first booking is A-1");
        B_desk.BookAppointment ravi = b.new BookAppointment(s, new B_desk.BookingRequest("Ravi", "Dr Rao", D10.plusHours(1)));
        desk.run(ravi);
        eq("A-2", ravi.booked().id(), "second booking is A-2");
        yes(desk.undo(), "undo Ravi");
        eq(Set.of("A-1"), s.snapshot().keySet(), "after undo only A-1");
        desk.run(b.new CancelAppointment(s, "A-1"));
        eq(false, desk.redo(), "redo after a new command does nothing");
        eq(Map.of(), s.snapshot(), "schedule empty");
        yes(desk.undo(), "undo cancel");
        eq(Set.of("A-1"), s.snapshot().keySet(), "A-1 back, same id");
        yes(desk.undo(), "undo Asha's booking");
        yes(desk.redo(), "redo Asha's booking");
        eq(new B_desk.Appointment("A-1", "Asha", "Dr Rao", D10), s.snapshot().get("A-1"), "redo re-books the same appointment");
        eq(false, b.new FrontDesk().undo(), "undo on empty history");

        // The world moved: someone books the slot directly; undoing the cancel fails and history is intact.
        B_desk.Scheduler s2 = b.new Scheduler();
        B_desk.FrontDesk d2 = b.new FrontDesk();
        d2.run(b.new BookAppointment(s2, new B_desk.BookingRequest("Asha", "Dr Rao", D10)));
        d2.run(b.new CancelAppointment(s2, "A-1"));
        s2.book(new B_desk.BookingRequest("Zed", "Dr Rao", D10));
        throwsOn(IllegalStateException.class, d2::undo, "undo refused when the slot was taken");
        s2.cancel("A-2");
        yes(d2.undo(), "history intact: undo works once the slot is free");
        eq(Set.of("A-1"), s2.snapshot().keySet(), "A-1 restored");
        throwsOn(IllegalStateException.class, () -> d2.run(b.new BookAppointment(s2, new B_desk.BookingRequest("Bo", "Dr Rao", D10))), "conflicting booking");
        yes(d2.undo(), "failed command was never recorded: undo hits the booking");
        eq(Map.of(), s2.snapshot(), "back to empty");

        // Random sequences vs a snapshot model.
        String[] patients = { "Asha", "Ravi", "Mina" }, doctors = { "Dr Rao", "Dr Mehta" };
        for (int run = 0; run < 1500; run++) {
            B_desk.Scheduler sch = b.new Scheduler();
            B_desk.FrontDesk fd = b.new FrontDesk();
            Map<String, B_desk.Appointment> cur = new HashMap<>();
            Deque<Map<String, B_desk.Appointment>> past = new ArrayDeque<>(), future = new ArrayDeque<>();
            int nextId = 1;
            for (int step = 0; step < 30; step++) {
                int op = rnd.nextInt(5);
                if (op == 3) {
                    boolean want = !past.isEmpty();
                    if (want) { future.push(cur); cur = past.pop(); }
                    eq(want, fd.undo(), "undo return");
                } else if (op == 4) {
                    boolean want = !future.isEmpty();
                    if (want) { past.push(cur); cur = future.pop(); }
                    eq(want, fd.redo(), "redo return");
                } else {
                    Map<String, B_desk.Appointment> next = new HashMap<>(cur);
                    B_desk.Command c;
                    boolean ok = true;
                    if (op == 0) {
                        var req = new B_desk.BookingRequest(patients[rnd.nextInt(3)], doctors[rnd.nextInt(2)], D10.plusHours(rnd.nextInt(3)));
                        c = b.new BookAppointment(sch, req);
                        ok = cur.values().stream().noneMatch(a -> a.doctor().equals(req.doctor()) && a.slot().equals(req.slot()));
                        if (ok) { String id = "A-" + nextId++; next.put(id, new B_desk.Appointment(id, req.patient(), req.doctor(), req.slot())); }
                    } else if (op == 1) {
                        String id = "A-" + (1 + rnd.nextInt(nextId + 1));
                        c = b.new CancelAppointment(sch, id);
                        ok = cur.containsKey(id);
                        next.remove(id);
                    } else {
                        String id = "A-" + (1 + rnd.nextInt(nextId + 1));
                        LocalDateTime slot = D10.plusHours(rnd.nextInt(3));
                        c = b.new RescheduleAppointment(sch, id, slot);
                        B_desk.Appointment a = cur.get(id);
                        ok = a != null && cur.values().stream().noneMatch(o -> !o.id().equals(id) && o.doctor().equals(a.doctor()) && o.slot().equals(slot));
                        if (ok) next.put(id, new B_desk.Appointment(id, a.patient(), a.doctor(), slot));
                    }
                    Class<?> got = outcome(() -> fd.run(c));
                    eq(ok, got == null, "command succeeds iff the model says so (op " + op + ")");
                    if (ok) { past.push(cur); cur = next; future.clear(); }
                }
                eq(cur, sch.snapshot(), "command undo/redo == snapshot model");
            }
        }

        // Idempotent queued commands.
        B_desk.Scheduler s3 = b.new Scheduler();
        B_desk.CommandWorker w = b.new CommandWorker();
        B_desk.BookAppointment once = b.new BookAppointment(s3, new B_desk.BookingRequest("Asha", "Dr Rao", D10));
        w.submit(new B_desk.QueuedCommand("cmd-1", once));
        w.submit(new B_desk.QueuedCommand("cmd-1", once));
        eq(1, w.drain(), "duplicate delivery runs once");
        eq(1, s3.snapshot().size(), "booked once");
        w.submit(new B_desk.QueuedCommand("cmd-1", once));
        eq(0, w.drain(), "a later redelivery is a no-op");
        AtomicInteger attempts = new AtomicInteger();
        B_desk.Command flaky = new B_desk.Command() {
            public void execute() { if (attempts.incrementAndGet() == 1) throw new IllegalStateException("network"); }
            public void undo() {}
        };
        w.submit(new B_desk.QueuedCommand("cmd-2", flaky));
        throwsOn(IllegalStateException.class, w::drain, "failure propagates");
        eq(1, w.drain(), "failed command stayed at the head and is retried");
        eq(0, w.drain(), "then it is done");

        // Side quest 3: macro command.
        B_desk.Scheduler s4 = b.new Scheduler();
        B_desk.FrontDesk d4 = b.new FrontDesk();
        d4.run(b.new BookAppointment(s4, new B_desk.BookingRequest("Asha", "Dr Rao", D10)));
        var toMehta = new B_desk.BookingRequest("Asha", "Dr Mehta", D10);
        d4.run(b.new MacroCommand(List.of(b.new CancelAppointment(s4, "A-1"), b.new BookAppointment(s4, toMehta))));
        eq(List.of("Dr Mehta"), s4.snapshot().values().stream().map(B_desk.Appointment::doctor).toList(), "moved in one click");
        yes(d4.undo(), "one undo");
        eq(Map.of("A-1", new B_desk.Appointment("A-1", "Asha", "Dr Rao", D10)), s4.snapshot(), "back with Dr Rao, same id");
        yes(d4.redo(), "redo the macro");
        eq(Set.of("A-2"), s4.snapshot().keySet(), "redo re-books the same A-2");
        yes(d4.undo(), "undo again");
        s4.book(new B_desk.BookingRequest("Zed", "Dr Mehta", D10));   // Dr Mehta now busy -> A-3
        throwsOn(IllegalStateException.class, () -> d4.run(b.new MacroCommand(List.of(b.new CancelAppointment(s4, "A-1"), b.new BookAppointment(s4, toMehta)))), "macro fails when the target is busy");
        yes(s4.snapshot().containsKey("A-1"), "all or nothing: A-1 was re-booked");
        eq(2, s4.snapshot().size(), "A-1 and Zed's A-3");
    }

    // ---------------- Chapter 5: Memento ----------------
    static void draft() {
        B_draftMess m = new B_draftMess();
        B_draftMess.LeakyDraft leaky = m.new LeakyDraft();
        leaky.lines.add("A");
        List<String> saved = leaky.save();
        leaky.lines.add("B");
        leaky.restore(saved);
        eq(List.of(), leaky.lines, "the leaky restore wipes the draft");

        B_draft b = new B_draft();
        for (int run = 0; run < 1500; run++) {
            B_draft.PrescriptionDraft d = b.new PrescriptionDraft();
            B_draft.DraftHistory h = b.new DraftHistory(d);
            int limit = 1 + rnd.nextInt(4);
            B_draft.PrescriptionDraft d2 = b.new PrescriptionDraft();
            B_draft.BoundedDraftHistory h2 = b.new BoundedDraftHistory(d2, limit);
            List<String> lines = new ArrayList<>(); String note = "";
            Deque<Object[]> past = new ArrayDeque<>();
            for (int step = 0; step < 30; step++) {
                int op = rnd.nextInt(5);
                if (op == 0) { String x = "L" + rnd.nextInt(5); d.add(x); d2.add(x); lines.add(x); }
                else if (op == 1 && !lines.isEmpty()) { int i = rnd.nextInt(lines.size()); d.remove(i); d2.remove(i); lines.remove(i); }
                else if (op == 2) { String n = "n" + rnd.nextInt(3); d.setNote(n); d2.setNote(n); note = n; }
                else if (op == 3) { h.checkpoint(); h2.checkpoint(); past.push(new Object[] { new ArrayList<>(lines), note }); }
                else {
                    boolean want = !past.isEmpty();
                    eq(want, h.undo(), "undo return");
                    boolean bounded = h2.undo();
                    if (want) {
                        Object[] snap = past.pop();
                        @SuppressWarnings("unchecked") List<String> l = (List<String>) snap[0];
                        lines = new ArrayList<>(l); note = (String) snap[1];
                        if (bounded) { eq(lines, d2.lines(), "bounded restore"); eq(note, d2.note(), "bounded note"); }
                    } else eq(false, bounded, "bounded also empty");
                    // resync the bounded draft with the oracle (it may have forgotten older snapshots)
                    if (!bounded) { while (!d2.lines().isEmpty()) d2.remove(0); for (String x : lines) d2.add(x); d2.setNote(note); }
                }
                eq(lines, d.lines(), "memento restore == oracle copies");
                eq(note, d.note(), "note restored");
            }
        }
        // Bounded: keeps exactly the newest `limit`.
        B_draft.PrescriptionDraft d = b.new PrescriptionDraft();
        B_draft.BoundedDraftHistory h = b.new BoundedDraftHistory(d, 2);
        for (String x : List.of("a", "b", "c")) { d.add(x); h.checkpoint(); }
        d.add("d");
        yes(h.undo(), "undo 1"); eq(List.of("a", "b", "c"), d.lines(), "newest snapshot");
        yes(h.undo(), "undo 2"); eq(List.of("a", "b"), d.lines(), "second newest");
        eq(false, h.undo(), "oldest forgotten");
        throwsOn(IllegalArgumentException.class, () -> b.new BoundedDraftHistory(d, 0), "limit must be positive");
        // Snapshot is a copy: later edits don't change it.
        B_draft.PrescriptionDraft e = b.new PrescriptionDraft();
        e.add("x");
        var snap = e.save();
        e.add("y");
        e.restore(snap);
        eq(List.of("x"), e.lines(), "snapshot unaffected by later edits");
        e.add("z");
        e.restore(snap);
        eq(List.of("x"), e.lines(), "snapshot reusable");
    }

    // ---------------- Chapter 6: Observer ----------------
    static void events() throws Exception {
        B_events b = new B_events();
        B_events.AppointmentEvents ev = b.new AppointmentEvents(Runnable::run);
        List<String> outbox = new ArrayList<>();
        b.wireClinic(ev, outbox);
        B_events.AppointmentService svc = b.new AppointmentService(ev);
        List<String> seenStatus = new ArrayList<>();
        ev.subscribe(e -> seenStatus.add(svc.statusOf(e.apptId())));
        ev.subscribe(e -> { throw new IllegalStateException("analytics down"); });
        ev.subscribe(e -> outbox.add("last listener ran"));
        svc.complete("A-1", "Asha", "Dr Rao");
        eq(List.of("invoice for A-1", "SMS to Asha: How was your visit?", "analytics: visit for Dr Rao", "last listener ran"), outbox, "synchronous delivery in order; a throwing listener doesn't stop the rest");
        eq(List.of("COMPLETED"), seenStatus, "listeners observe the persisted change");
        eq(List.of("listener failed: analytics down"), ev.errors, "failure recorded, not thrown");

        // Unsubscribe and the leak.
        B_events.AppointmentEvents ev2 = b.new AppointmentEvents(Runnable::run);
        for (int i = 0; i < 1000; i++) { B_events.DoctorScreen leaked = b.new DoctorScreen(ev2, "Dr " + i); }
        eq(1000, ev2.listenerCount(), "1000 abandoned tabs = 1000 listeners");
        B_events.AppointmentEvents ev3 = b.new AppointmentEvents(Runnable::run);
        for (int i = 0; i < 1000; i++) try (B_events.DoctorScreen screen = b.new DoctorScreen(ev3, "Dr " + i)) { }
        eq(0, ev3.listenerCount(), "closed tabs unsubscribe");
        B_events.DoctorScreen rao = b.new DoctorScreen(ev3, "Dr Rao");
        ev3.publish(new B_events.AppointmentCompleted("A-1", "Asha", "Dr Rao"));
        ev3.publish(new B_events.AppointmentCompleted("A-2", "Ravi", "Dr Mehta"));
        eq(List.of("A-1"), rao.shown, "screen filters by doctor");
        rao.close();
        rao.close();
        ev3.publish(new B_events.AppointmentCompleted("A-3", "Asha", "Dr Rao"));
        eq(List.of("A-1"), rao.shown, "no delivery after close; double close harmless");

        // Self-unsubscribe during delivery (your turn), on a CopyOnWriteArrayList.
        B_events.AppointmentEvents ev4 = b.new AppointmentEvents(Runnable::run);
        List<String> after = new ArrayList<>();
        B_events.FollowUpScheduler f = b.new FollowUpScheduler();
        f.listenOnce(ev4);
        ev4.subscribe(e -> after.add(e.apptId()));
        eq(2, ev4.listenerCount(), "two listeners");
        ev4.publish(new B_events.AppointmentCompleted("A-1", "Asha", "Dr Rao"));
        ev4.publish(new B_events.AppointmentCompleted("A-2", "Ravi", "Dr Rao"));
        eq(List.of("follow-up for Asha"), f.scheduled, "one-shot fires once");
        eq(List.of("A-1", "A-2"), after, "the next listener still ran during the self-unsubscribe");
        eq(1, ev4.listenerCount(), "it left the list");

        // Asynchronous delivery: publisher returns before a blocked listener finishes.
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            B_events.AppointmentEvents async = b.new AppointmentEvents(pool);
            CountDownLatch release = new CountDownLatch(1), done = new CountDownLatch(3);
            Set<String> threads = ConcurrentHashMap.newKeySet();
            String publisher = Thread.currentThread().getName();
            async.subscribe(e -> { try { release.await(); } catch (InterruptedException x) { } threads.add(Thread.currentThread().getName()); done.countDown(); });
            async.subscribe(e -> { threads.add(Thread.currentThread().getName()); done.countDown(); throw new IllegalStateException("boom"); });
            async.subscribe(e -> { threads.add(Thread.currentThread().getName()); done.countDown(); });
            async.publish(new B_events.AppointmentCompleted("A-9", "Mina", "Dr Rao"));
            yes(done.getCount() >= 1, "publish returned while the slow listener was still blocked");
            release.countDown();
            yes(done.await(5, TimeUnit.SECONDS), "all async listeners ran");
            yes(!threads.contains(publisher), "listeners ran on pool threads");
            for (int i = 0; i < 50 && async.errors.isEmpty(); i++) Thread.sleep(10);
            eq(List.of("listener failed: boom"), async.errors, "async failure isolated and recorded");
            FollowUpScheduler(b, pool);
        } finally {
            pool.shutdown();
            pool.awaitTermination(5, TimeUnit.SECONDS);
        }
    }

    // One-shot under concurrent asynchronous deliveries: fires at most once.
    static void FollowUpScheduler(B_events b, ExecutorService pool) throws Exception {
        for (int run = 0; run < 50; run++) {
            B_events.AppointmentEvents ev = b.new AppointmentEvents(pool);
            B_events.FollowUpScheduler f = b.new FollowUpScheduler();
            f.listenOnce(ev);
            for (int i = 0; i < 20; i++) ev.publish(new B_events.AppointmentCompleted("A-" + i, "P" + i, "Dr"));
            for (int i = 0; i < 100 && f.scheduled.isEmpty(); i++) Thread.sleep(5);
            Thread.sleep(5);
            eq(1, f.scheduled.size(), "at most once, even asynchronously");
        }
    }

    static void listenerMess() {
        B_listenerMess m = new B_listenerMess();
        // Three listeners, the first unsubscribes itself: CME, the others never run.
        B_listenerMess.NaiveEvents ev = m.new NaiveEvents();
        List<String> ran = new ArrayList<>();
        Runnable[] handle = new Runnable[1];
        handle[0] = ev.subscribe(e -> { ran.add("L0"); handle[0].run(); });
        ev.subscribe(e -> ran.add("L1"));
        ev.subscribe(e -> ran.add("L2"));
        throwsOn(ConcurrentModificationException.class, () -> ev.publish("done"), "ArrayList + self-unsubscribe = CME");
        eq(List.of("L0"), ran, "L1 and L2 never ran");
        // Two listeners: the second is skipped silently.
        B_listenerMess.NaiveEvents ev2 = m.new NaiveEvents();
        List<String> ran2 = new ArrayList<>();
        Runnable[] h2 = new Runnable[1];
        h2[0] = ev2.subscribe(e -> { ran2.add("L0"); h2[0].run(); });
        ev2.subscribe(e -> ran2.add("L1"));
        ev2.publish("done");
        eq(List.of("L0"), ran2, "with two listeners, L1 is skipped silently");
        // A throwing listener takes the publisher down.
        B_listenerMess.NaiveEvents ev3 = m.new NaiveEvents();
        List<String> ran3 = new ArrayList<>();
        ev3.subscribe(e -> { throw new IllegalStateException("x"); });
        ev3.subscribe(e -> ran3.add("L1"));
        throwsOn(IllegalStateException.class, () -> ev3.publish("done"), "unguarded listener breaks publish");
        eq(List.of(), ran3, "later listener never ran");
        // synchronizedList: same-thread removal during iteration still breaks the iterator.
        List<Integer> sync = Collections.synchronizedList(new ArrayList<>(List.of(1, 2, 3)));
        throwsOn(ConcurrentModificationException.class, () -> { synchronized (sync) { for (Integer x : sync) if (x == 1) sync.remove(x); } }, "synchronizedList does not help");
        List<Integer> cow = new CopyOnWriteArrayList<>(List.of(1, 2, 3));
        List<Integer> seen = new ArrayList<>();
        for (Integer x : cow) { seen.add(x); if (x == 1) cow.remove(x); }
        eq(List.of(1, 2, 3), seen, "CopyOnWriteArrayList iterates a snapshot");
    }

    // ---------------- Chapter 7: Chain ----------------
    static void pipeline() {
        B_pipeline b = new B_pipeline();
        B_pipeline.User asha = new B_pipeline.User("asha"), bo = new B_pipeline.User("bo"), cy = new B_pipeline.User("cy");
        Map<String, B_pipeline.User> tokens = Map.of("tok-asha", asha, "tok-bo", bo, "tok-cy", cy);
        Map<B_pipeline.User, B_pipeline.Clinic> clinics = Map.of(asha, new B_pipeline.Clinic("north"), bo, new B_pipeline.Clinic("south"));
        B_pipeline.Chain chain = b.pipeline(tokens, clinics, 2);
        Function<B_pipeline.Request, Integer> st = r -> chain.proceed(r).status();
        eq(new B_pipeline.Response(200, "asha@north: book 10:00"), chain.proceed(b.new Request("tok-asha", "kiosk-1", "book 10:00")), "dispatch body");
        eq(400, st.apply(b.new Request("tok-asha", "kiosk-1", "")), "empty body");
        eq(200, st.apply(b.new Request("tok-asha", "kiosk-1", "book 11:00")), "second valid: budget 2");
        eq(429, st.apply(b.new Request("tok-asha", "kiosk-1", "book 12:00")), "third valid: 429 (trace: 200, 400, 200, 429)");
        eq(401, st.apply(b.new Request("bad", "kiosk-2", "x")), "bad token");
        eq(403, st.apply(b.new Request("tok-cy", "kiosk-2", "x")), "no clinic");
        eq(null, B_pipeline.TenantHandler.CURRENT.get(), "ambient clinic cleared after the request");

        // Wrong order fails loudly.
        B_pipeline.Chain backwards = b.new Chain(List.of(b.new TenantHandler(clinics), b.new AuthHandler(tokens), b.new DispatchHandler()));
        throwsOn(IllegalStateException.class, () -> backwards.proceed(b.new Request("tok-asha", "k", "x")), "tenant before auth throws");
        throwsOn(IllegalStateException.class, () -> b.new Chain(List.of(b.new ValidationHandler())).proceed(b.new Request("t", "k", "x")), "no terminal handler");

        // ThreadLocal cleaned when a later handler throws.
        B_pipeline.Chain throwing = b.new Chain(List.of(b.new AuthHandler(tokens), b.new TenantHandler(clinics), (r, c) -> {
            eq(new B_pipeline.Clinic("north"), B_pipeline.TenantHandler.CURRENT.get(), "clinic set during the request");
            throw new IllegalStateException("db down");
        }));
        throwsOn(IllegalStateException.class, () -> throwing.proceed(b.new Request("tok-asha", "k", "x")), "exception propagates");
        eq(null, B_pipeline.TenantHandler.CURRENT.get(), "cleared in finally");

        // Short-circuit order with recording handlers.
        List<String> log = new ArrayList<>();
        B_pipeline.Handler a = (r, c) -> { log.add("A"); return c.proceed(r); };
        B_pipeline.Handler veto = (r, c) -> { log.add("V"); return B_pipeline.Response.badRequest("no"); };
        B_pipeline.Handler z = (r, c) -> { log.add("Z"); return B_pipeline.Response.ok("z"); };
        eq(400, b.new Chain(List.of(a, veto, z)).proceed(b.new Request("", "", "")).status(), "veto wins");
        eq(List.of("A", "V"), log, "nothing after the veto runs");
        log.clear();
        eq(200, b.new Chain(List.of(a, a, z)).proceed(b.new Request("", "", "")).status(), "passes through");
        eq(List.of("A", "A", "Z"), log, "in list order");
        List<B_pipeline.Handler> src = new ArrayList<>(List.of(z));
        B_pipeline.Chain copied = b.new Chain(src);
        src.add(0, veto);
        eq(200, copied.proceed(b.new Request("", "", "")).status(), "chain copied its list");

        // Random requests vs an if-oracle.
        String[] toks = { "tok-asha", "tok-bo", "tok-cy", "bad", null };
        String[] clients = { "k1", "k2", "k3" };
        String[] bodies = { "book", "", "  ", null, "cancel" };
        for (int run = 0; run < 200; run++) {
            int budget = 1 + rnd.nextInt(3);
            B_pipeline.Chain ch = b.pipeline(tokens, clinics, budget);
            Map<String, Integer> used = new HashMap<>();
            for (int i = 0; i < 15; i++) {
                String t = toks[rnd.nextInt(toks.length)], cl = clients[rnd.nextInt(3)], body = bodies[rnd.nextInt(bodies.length)];
                B_pipeline.Response want;
                B_pipeline.User u = t == null ? null : tokens.get(t);
                if (u == null) want = new B_pipeline.Response(401, "unauthorized");
                else if (clinics.get(u) == null) want = new B_pipeline.Response(403, "no clinic for " + u.name());
                else if (body == null || body.isBlank()) want = new B_pipeline.Response(400, "empty body");
                else {
                    int n = used.merge(cl, 1, Integer::sum);
                    want = n > budget ? new B_pipeline.Response(429, "slow down") : new B_pipeline.Response(200, u.name() + "@" + clinics.get(u).id() + ": " + body);
                }
                eq(want, ch.proceed(b.new Request(t, cl, body)), "pipeline == oracle");
                eq(null, B_pipeline.TenantHandler.CURRENT.get(), "no leftover ambient clinic");
            }
        }

        // Side quest 4: audit.
        List<String> audit = new ArrayList<>();
        B_pipeline.Chain audited = b.auditedPipeline(tokens, clinics, 2, audit);
        audited.proceed(b.new Request("tok-asha", "kiosk-1", "book 10:00"));
        audited.proceed(b.new Request("tok-asha", "kiosk-1", ""));
        audited.proceed(b.new Request("tok-asha", "kiosk-1", "book 11:00"));
        audited.proceed(b.new Request("tok-asha", "kiosk-1", "book 12:00"));
        eq(401, audited.proceed(b.new Request("bad", "kiosk-1", "x")).status(), "bad token still 401");
        eq(403, audited.proceed(b.new Request("tok-cy", "kiosk-9", "x")).status(), "no clinic 403");
        eq(List.of("asha 200", "asha 400", "asha 200", "asha 429", "cy 403"), audit, "audit sees later vetoes, never the 401");
    }

    static void rules() {
        B_rules b = new B_rules();
        Set<String> patients = Set.of("Asha", "Ravi");
        Map<String, B_rules.Shift> shifts = Map.of("Dr Rao", new B_rules.Shift(9, 13), "Dr Mehta", new B_rules.Shift(14, 18));
        Set<String> taken = Set.of("Dr Rao@10", "Dr Mehta@15");
        B_rules.BookingRule head = b.bookingRules(patients, shifts, taken);
        eq(Optional.empty(), head.check(new B_rules.BookingForm("Asha", "Dr Rao", 9)), "all pass");
        eq(Optional.of("unknown patient Zed"), head.check(new B_rules.BookingForm("Zed", "Dr Nobody", 10)), "first problem only");
        eq(Optional.of("Dr Rao is not on shift at 13:00"), head.check(new B_rules.BookingForm("Asha", "Dr Rao", 13)), "end of shift is exclusive");
        eq(Optional.of("Dr Rao is booked at 10:00"), head.check(new B_rules.BookingForm("Ravi", "Dr Rao", 10)), "slot taken");
        String[] ps = { "Asha", "Ravi", "Zed" }, ds = { "Dr Rao", "Dr Mehta", "Dr Nobody" };
        for (int t = 0; t < 2000; t++) {
            var f = new B_rules.BookingForm(ps[rnd.nextInt(3)], ds[rnd.nextInt(3)], 8 + rnd.nextInt(12));
            Optional<String> want;
            B_rules.Shift s = shifts.get(f.doctor());
            if (!patients.contains(f.patient())) want = Optional.of("unknown patient " + f.patient());
            else if (s == null || f.hour() < s.fromHour() || f.hour() >= s.toHour()) want = Optional.of(f.doctor() + " is not on shift at " + f.hour() + ":00");
            else if (taken.contains(f.doctor() + "@" + f.hour())) want = Optional.of(f.doctor() + " is booked at " + f.hour() + ":00");
            else want = Optional.empty();
            eq(want, head.check(f), "rules == oracle");
        }
        // Short-circuit: rules after a failing one are never evaluated.
        int[] evaluated = new int[3];
        B_rules.BookingRule r0 = b.new BookingRule() { protected Optional<String> problemWith(B_rules.BookingForm f) { evaluated[0]++; return Optional.empty(); } };
        B_rules.BookingRule r1 = b.new BookingRule() { protected Optional<String> problemWith(B_rules.BookingForm f) { evaluated[1]++; return Optional.of("no"); } };
        B_rules.BookingRule r2 = b.new BookingRule() { protected Optional<String> problemWith(B_rules.BookingForm f) { evaluated[2]++; return Optional.empty(); } };
        yes(r0.then(r1) == r1, "then() returns the new tail");
        r1.then(r2);
        eq(Optional.of("no"), r0.check(new B_rules.BookingForm("a", "b", 1)), "veto");
        eq(List.of(1, 1, 0), List.of(evaluated[0], evaluated[1], evaluated[2]), "r2 never evaluated");
    }

    // ---------------- Chapter 8: Mediator ----------------
    static void ramp() {
        B_ramp b = new B_ramp();
        B_ramp.RampController ctl = b.new RampController();
        B_ramp.Car a = b.new Car("A", ctl), bb = b.new Car("B", ctl), c = b.new Car("C", ctl);
        a.wantRamp(B_ramp.Direction.UP);
        bb.wantRamp(B_ramp.Direction.DOWN);
        c.wantRamp(B_ramp.Direction.UP);
        eq(List.of("GO UP"), a.heard, "A goes");
        eq(List.of("WAIT"), bb.heard, "B waits");
        eq(List.of("WAIT"), c.heard, "C waits: someone is queued (trace)");
        a.offRamp();
        eq(List.of(bb), ctl.onRamp(), "only B admitted (trace)");
        eq(List.of("WAIT", "GO DOWN"), bb.heard, "B told GO DOWN");
        eq(List.of(c), ctl.waiting(), "C still waiting");
        bb.offRamp();
        eq(List.of("WAIT", "GO UP"), c.heard, "then C goes up");
        throwsOn(IllegalStateException.class, () -> c.wantRamp(B_ramp.Direction.UP), "already asked");
        throwsOn(IllegalStateException.class, a::offRamp, "not on the ramp");
        c.offRamp();
        eq(null, ctl.flowing(), "empty ramp has no flow");
        // Convoy: several same-direction waiters behind the head are admitted together.
        B_ramp.RampController k = b.new RampController();
        B_ramp.Car[] cars = new B_ramp.Car[5];
        for (int i = 0; i < 5; i++) cars[i] = b.new Car("K" + i, k);
        cars[0].wantRamp(B_ramp.Direction.DOWN);
        cars[1].wantRamp(B_ramp.Direction.UP); cars[2].wantRamp(B_ramp.Direction.UP); cars[3].wantRamp(B_ramp.Direction.DOWN); cars[4].wantRamp(B_ramp.Direction.UP);
        cars[0].offRamp();
        eq(List.of(cars[1], cars[2]), k.onRamp(), "head plus consecutive same-direction waiters");
        eq(List.of(cars[3], cars[4]), k.waiting(), "the rest keep their order");

        // Random invariants.
        for (int run = 0; run < 1000; run++) {
            B_ramp.RampController ctl2 = b.new RampController();
            int n = 2 + rnd.nextInt(6);
            List<B_ramp.Car> pool = new ArrayList<>();
            for (int i = 0; i < n; i++) pool.add(b.new Car("C" + i, ctl2));
            Map<B_ramp.Car, B_ramp.Direction> dirOf = new HashMap<>();
            Set<B_ramp.Car> idle = new LinkedHashSet<>(pool);
            Deque<B_ramp.Car> waitOrder = new ArrayDeque<>();
            Map<B_ramp.Car, Integer> heardBefore = new HashMap<>();
            for (int step = 0; step < 60; step++) {
                for (B_ramp.Car car : pool) heardBefore.put(car, car.heard.size());
                List<B_ramp.Car> on = ctl2.onRamp();
                boolean wasEmptyQueue = ctl2.waiting().isEmpty();
                B_ramp.Direction flowBefore = ctl2.flowing();
                if ((rnd.nextBoolean() || on.isEmpty()) && !idle.isEmpty()) {
                    B_ramp.Car car = new ArrayList<>(idle).get(rnd.nextInt(idle.size()));
                    B_ramp.Direction d = rnd.nextBoolean() ? B_ramp.Direction.UP : B_ramp.Direction.DOWN;
                    idle.remove(car); dirOf.put(car, d);
                    car.wantRamp(d);
                    String last = car.heard.get(car.heard.size() - 1);
                    boolean shouldGo = wasEmptyQueue && (on.isEmpty() || flowBefore == d);
                    eq(shouldGo ? "GO " + d : "WAIT", last, "join the flow only if nobody is queued");
                    if (!shouldGo) waitOrder.add(car);
                } else if (!on.isEmpty()) {
                    B_ramp.Car car = on.get(rnd.nextInt(on.size()));
                    car.offRamp();
                    idle.add(car);
                }
                // Cars that just heard GO after waiting must come off the front of the wait order, in order.
                Set<B_ramp.Car> admitted = new HashSet<>();
                for (B_ramp.Car car : pool) {
                    int before = heardBefore.get(car);
                    if (car.heard.size() > before && car.heard.get(car.heard.size() - 1).startsWith("GO") && waitOrder.contains(car))
                        admitted.add(car);
                }
                Set<B_ramp.Car> prefix = new HashSet<>();
                Iterator<B_ramp.Car> wi = waitOrder.iterator();
                for (int i = 0; i < admitted.size(); i++) prefix.add(wi.next());
                eq(prefix, admitted, "no overtaking the queue: admitted waiters are its front");
                for (int i = 0; i < admitted.size(); i++) waitOrder.pollFirst();
                List<B_ramp.Car> now = ctl2.onRamp();
                for (B_ramp.Car car : now) eq(ctl2.flowing(), dirOf.get(car), "everyone on the ramp shares one direction");
                if (now.isEmpty()) { yes(ctl2.waiting().isEmpty(), "never an empty ramp with a queue"); eq(null, ctl2.flowing(), "no flow when empty"); }
                eq(new ArrayList<>(waitOrder), ctl2.waiting(), "queue order matches arrival order");
            }
        }
    }

    static void chat() {
        B_chat b = new B_chat();
        B_chat.ChatRoom room = b.new ChatRoom();
        B_chat.Member ana = room.join("Ana"), ben = room.join("Ben"), cat = room.join("Cat");
        ana.say("rounds at 9");
        eq(List.of(), ana.inbox, "sender doesn't hear herself");
        eq(List.of("Ana: rounds at 9"), ben.inbox, "Ben hears");
        eq(List.of("Ana: rounds at 9"), cat.inbox, "Cat hears");
        room.mute("Ben");
        ben.say("spam");
        eq(List.of("Ana: rounds at 9", "(you are muted)"), ben.inbox, "muted sender is told");
        eq(List.of("Ana: rounds at 9"), cat.inbox, "nobody hears a muted sender");
        cat.say("ok");
        eq(List.of("Ana: rounds at 9", "(you are muted)", "Cat: ok"), ben.inbox, "muted members still receive");
        room.unmute("Ben");
        ben.say("back");
        eq(List.of("Ben: back"), ana.inbox.subList(1, 2), "unmuted");
        throwsOn(IllegalArgumentException.class, () -> room.join("Ana"), "duplicate name");
    }

    // ---------------- Chapter 9: Iterator ----------------
    static void iter() {
        B_iter b = new B_iter();
        B_iter.RecentScans<String> r = b.new RecentScans<>(3);
        for (String s : List.of("T-1", "T-2", "T-3", "T-4")) r.add(s);
        List<String> seen = new ArrayList<>();
        for (String s : r) seen.add(s);
        eq(List.of("T-2", "T-3", "T-4"), seen, "oldest first after overwrite (trace)");
        Iterator<String> it = r.iterator();
        eq("T-2", it.next(), "read one");
        r.add("T-5");
        throwsOn(ConcurrentModificationException.class, it::next, "fail fast after add");
        Iterator<String> it2 = r.iterator();
        it2.next(); it2.next(); it2.next();
        eq(false, it2.hasNext(), "exhausted");
        throwsOn(NoSuchElementException.class, it2::next, "next past the end");
        throwsOn(ConcurrentModificationException.class, () -> { for (String s : r) r.add("x"); }, "for-each + add");
        throwsOn(IllegalArgumentException.class, () -> b.new RecentScans<String>(0), "capacity positive");
        throwsOn(IndexOutOfBoundsException.class, () -> r.get(3), "get out of range");
        throwsOn(UnsupportedOperationException.class, () -> r.iterator().remove(), "remove not supported");
        for (int run = 0; run < 1000; run++) {
            int cap = 1 + rnd.nextInt(5);
            B_iter.RecentScans<Integer> ring = b.new RecentScans<>(cap);
            ArrayDeque<Integer> oracle = new ArrayDeque<>();
            for (int i = 0, n = rnd.nextInt(15); i < n; i++) {
                ring.add(i);
                oracle.addLast(i);
                if (oracle.size() > cap) oracle.removeFirst();
                List<Integer> got = new ArrayList<>();
                for (Integer x : ring) got.add(x);
                eq(new ArrayList<>(oracle), got, "ring == last-k oracle");
                eq(oracle.size(), ring.size(), "size");
            }
        }
        // Lazy slots.
        Function<Iterable<LocalTime>, List<LocalTime>> all = itb -> { List<LocalTime> out = new ArrayList<>(); for (LocalTime t : itb) { out.add(t); if (out.size() > 2000) throw new AssertionError("runaway iterator"); } return out; };
        eq(List.of(LocalTime.of(9, 0), LocalTime.of(9, 15), LocalTime.of(9, 30), LocalTime.of(9, 45)), all.apply(b.slots(LocalTime.of(9, 0), LocalTime.of(10, 0), Duration.ofMinutes(15))), "09:00..09:45");
        eq(List.of(LocalTime.of(23, 0), LocalTime.of(23, 30)), all.apply(b.slots(LocalTime.of(23, 0), LocalTime.of(23, 59), Duration.ofMinutes(30))), "midnight wrap guarded (trace)");
        LocalTime t = LocalTime.of(23, 30).plus(Duration.ofMinutes(30));
        yes(t.isBefore(LocalTime.of(23, 59)), "the naive loop would continue: 23:30 + 30 min = 00:00 < 23:59");
        eq(List.of(), all.apply(b.slots(LocalTime.of(10, 0), LocalTime.of(10, 0), Duration.ofMinutes(5))), "empty range");
        throwsOn(IllegalArgumentException.class, () -> b.slots(LocalTime.NOON, LocalTime.MIDNIGHT, Duration.ZERO), "zero step");
        throwsOn(NoSuchElementException.class, () -> b.slots(LocalTime.NOON, LocalTime.NOON, Duration.ofMinutes(1)).iterator().next(), "next on empty");
        Iterable<LocalTime> twice = b.slots(LocalTime.of(8, 0), LocalTime.of(9, 0), Duration.ofMinutes(20));
        eq(all.apply(twice), all.apply(twice), "a fresh iterator per loop");
        for (int run = 0; run < 2000; run++) {
            int first = rnd.nextInt(1440), end = rnd.nextInt(1441), step = 1 + rnd.nextInt(rnd.nextBoolean() ? 120 : 1500);
            LocalTime endT = end == 1440 ? LocalTime.MAX : LocalTime.ofSecondOfDay(end * 60L);
            List<LocalTime> want = new ArrayList<>();
            for (int m = first; m < 1440 && LocalTime.ofSecondOfDay(m * 60L).isBefore(endT); m += step) want.add(LocalTime.ofSecondOfDay(m * 60L));
            eq(want, all.apply(b.slots(LocalTime.ofSecondOfDay(first * 60L), endT, Duration.ofMinutes(step))), "slots == minute arithmetic");
        }
    }

    // ---------------- Chapter 10: Visitor ----------------
    static B_bill.BillLine sampleBill() {
        return new B_bill.Bundle("Inpatient bill", List.of(
            new B_bill.Item("Room, 3 nights", 1_200_000, true),
            new B_bill.Bundle("Knee surgery package", List.of(
                new B_bill.Item("Surgeon fee", 4_000_000, false),
                new B_bill.Item("OT charges", 1_500_000, true),
                new B_bill.Bundle("Anaesthesia", List.of(
                    new B_bill.Item("Anaesthetist fee", 800_000, false),
                    new B_bill.Item("Drugs", 120_050, true))))),
            new B_bill.Item("Pharmacy", 345_675, true)));
    }
    static long bruteTotal(B_bill.BillLine l) {
        if (l instanceof B_bill.Item) return ((B_bill.Item) l).paise();
        long s = 0; for (var c : ((B_bill.Bundle) l).lines()) s += bruteTotal(c); return s;
    }
    static long bruteTax(B_bill.BillLine l, long pct) {
        if (l instanceof B_bill.Item) { var i = (B_bill.Item) l; return i.taxable() ? i.paise() * pct / 100 : 0; }
        long s = 0; for (var c : ((B_bill.Bundle) l).lines()) s += bruteTax(c, pct); return s;
    }
    static B_bill.BillLine randomTree(int depth) {
        if (depth == 0 || rnd.nextInt(3) == 0) return new B_bill.Item("i" + rnd.nextInt(100), rnd.nextInt(1_000_000), rnd.nextBoolean());
        List<B_bill.BillLine> kids = new ArrayList<>();
        for (int i = rnd.nextInt(4); i > 0; i--) kids.add(randomTree(depth - 1));
        return new B_bill.Bundle("b", kids);
    }

    static void bill() {
        B_bill b = new B_bill();
        B_bill.BillLine bill = sampleBill();
        eq(7_965_725L, bill.accept(b.new TotalVisitor()), "sample total");
        eq(569_830L, bill.accept(b.new TaxVisitor(18)), "sample tax at 18%");
        eq(7_965_725L, b.totalOf(bill), "instanceof version agrees");
        eq(List.of("Surgeon fee", "Anaesthetist fee"), bill.accept(b.new ExemptItems()), "exempt items (your turn)");
        eq("Inpatient bill\n  Room, 3 nights 1200000\n  Knee surgery package\n    Surgeon fee 4000000\n    OT charges 1500000\n    Anaesthesia\n      Anaesthetist fee 800000\n      Drugs 120050\n  Pharmacy 345675\n",
           bill.accept(b.new StatementVisitor()), "indented statement");
        for (int t = 0; t < 2000; t++) {
            B_bill.BillLine tree = randomTree(4);
            long pct = rnd.nextInt(30);
            eq(bruteTotal(tree), tree.accept(b.new TotalVisitor()), "total visitor == brute");
            eq(bruteTotal(tree), b.totalOf(tree), "instanceof == brute");
            eq(bruteTax(tree, pct), tree.accept(b.new TaxVisitor(pct)), "tax visitor == brute");
        }
        B_overloadMess o = new B_overloadMess();
        eq("some line\nsome line\n", o.describeAll(new B_overloadMess.Pack(List.of(new B_overloadMess.Fee(100), new B_overloadMess.Pack(List.of())))), "overloads chosen at compile time");
        eq("fee 100", o.describe(new B_overloadMess.Fee(100)), "with a static Fee type the Fee overload is chosen");
        yes(B_bill.BillLine.class.isSealed(), "BillLine is sealed");
    }

    static void bill2() {
        B_bill2 b = new B_bill2();
        B_bill2.BillLine bill = new B_bill2.Bundle("Inpatient bill", List.of(
            new B_bill2.Item("Room, 3 nights", 1_200_000, true),
            new B_bill2.Bundle("Knee surgery package", List.of(
                new B_bill2.Item("Surgeon fee", 4_000_000, false),
                new B_bill2.Item("OT charges", 1_500_000, true),
                new B_bill2.Bundle("Anaesthesia", List.of(
                    new B_bill2.Item("Anaesthetist fee", 800_000, false),
                    new B_bill2.Item("Drugs", 120_050, true))))),
            new B_bill2.Item("Pharmacy", 345_675, true),
            new B_bill2.Discount("Staff discount", 50_000)));
        eq(7_915_725L, bill.accept(b.new TotalVisitor()), "total with discount");
        eq(569_830L, bill.accept(b.new TaxVisitor(18)), "tax unchanged");
        throwsOn(IllegalStateException.class, () -> b.totalOf(bill), "instanceof chain fails at runtime on the new node");
        throwsOn(IllegalArgumentException.class, () -> new B_bill2.Discount("bad", -1), "discount is positive");
        eq(3, B_bill2.BillLine.class.getPermittedSubclasses().length, "three permitted node types");
    }
}
