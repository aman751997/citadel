import java.io.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

// Exercises every compiled design in src/lld-lessons/machine-coding-protocol.mdx:
//  - the reusable skeleton (generic in-memory repository, ids, manual clock, domain exceptions, test helpers),
//  - the Lantern Lane lending round: the demo transcript the lesson prints, every edge case it names, the
//    launch wiring (premium treated as standard) versus the follow-up wiring (one new policy class),
//    1000 random operation sequences against an independent oracle, and the locked wrapper under real threads,
//  - the three concurrency tools (atomic map ops, per-resource locks with ordering, optimistic versions).
public class Check {
    static int checks = 0;

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

    static final Instant START = Instant.parse("2026-03-02T10:00:00Z");
    static B_round.ManualClock clock() { return new B_round.ManualClock(START, ZoneOffset.UTC); }

    public static void main(String[] args) throws Exception {
        yes(LocalDate.of(2026, 3, 2).getDayOfWeek() == DayOfWeek.MONDAY, "2 March 2026 is a Monday");
        skeleton();
        helpers();
        policies();
        demoTranscript();
        edges();
        launchVersusFollowUp();
        randomOracle();
        lockedLibrary();
        slotBook();
        wallets();
        versioned();
        System.out.println("OK machine-coding-protocol: " + checks + " checks passed");
    }

    // ---------------------------------------------------------------- skeleton
    static void skeleton() {
        B_round.InMemoryRepository<String, B_round.Book> repo = new B_round.InMemoryRepository<>(B_round.Book::isbn);
        eq(Optional.empty(), repo.findById("isbn-1"), "empty repo finds nothing");
        eq(Optional.empty(), repo.findById(null), "null id is simply not found");
        B_round.Book b = new B_round.Book("isbn-1", "The Patient Gear");
        yes(repo.save(b) == b, "save returns the entity");
        eq(Optional.of(b), repo.findById("isbn-1"), "found by id");
        B_round.Book b2 = new B_round.Book("isbn-1", "Second Edition");
        repo.save(b2);
        eq(1, repo.findAll().size(), "save with the same id replaces");
        eq("Second Edition", repo.findById("isbn-1").get().title(), "replaced value");
        throwsOn(UnsupportedOperationException.class, () -> repo.findAll().add(b), "findAll is a copy, not the store");

        B_round.Ids ids = new B_round.Ids();
        eq("C-001", ids.next("C"), "first C id");
        eq("C-002", ids.next("C"), "second C id");
        eq("M-001", ids.next("M"), "counters are per prefix");

        B_round.ManualClock c = clock();
        eq(LocalDate.of(2026, 3, 2), LocalDate.now(c), "manual clock start");
        c.advanceDays(14);
        eq(LocalDate.of(2026, 3, 16), LocalDate.now(c), "advance 14 days");
        Clock other = c.withZone(ZoneId.of("Asia/Kolkata"));
        eq(ZoneId.of("Asia/Kolkata"), other.getZone(), "withZone changes zone");
        eq(c.instant(), other.instant(), "withZone keeps the instant");

        B_round.NotFoundException nf = new B_round.NotFoundException("member", "M-404");
        eq("member M-404 not found", nf.getMessage(), "NotFound message");
        yes(nf instanceof B_round.DomainException, "NotFound is a DomainException");
    }

    static void helpers() {
        int before = B_round.passed;
        B_round.check(true, "fine");
        eq(before + 1, B_round.passed, "check counts a pass");
        throwsOn(AssertionError.class, () -> B_round.check(false, "broken"), "check fails loudly");
        B_round.expectThrows(IllegalStateException.class, () -> { throw new IllegalStateException("x"); }, "right type");
        throwsOn(AssertionError.class, () -> B_round.expectThrows(IllegalStateException.class, () -> {}, "none"), "no throw is a failure");
        throwsOn(AssertionError.class, () -> B_round.expectThrows(IllegalStateException.class,
                () -> { throw new IllegalArgumentException("y"); }, "wrong"), "wrong type is a failure");
        B_round.selfTest();
        eq(before + 2 + 8, B_round.passed, "selfTest ran exactly 8 checks (after 2 helper passes)");
    }

    // ---------------------------------------------------------------- policies
    static long oracleFee(B_round.Tier tier, boolean premiumRules, long d) {
        if (tier == B_round.Tier.PREMIUM && premiumRules) return Math.min(50, 5 * Math.max(0, d - 3));
        return 10 * d;
    }

    static void policies() {
        B_round.LendingPolicy standard = new B_round.FlatFeePolicy(3, 14, 10);
        eq(3, standard.maxLoans(), "standard limit");
        eq(14, standard.loanDays(), "standard loan days");
        eq(60L, standard.lateFee(6), "standard 6 days late = 60");
        eq(20L, standard.lateFee(2), "standard 2 days late = 20");
        eq(100L, standard.lateFee(10), "standard 10 days late = 100");
        B_round.LendingPolicy premium = new B_round.GraceAndCapPolicy(5, 21, 3, 5, 50);
        eq(5, premium.maxLoans(), "premium limit");
        eq(21, premium.loanDays(), "premium loan days");
        for (long d = 0; d <= 3; d++) eq(0L, premium.lateFee(d), "grace day " + d);
        eq(5L, premium.lateFee(4), "premium 4 days = 5");
        eq(30L, premium.lateFee(9), "premium 9 days = 30");
        eq(35L, premium.lateFee(10), "premium 10 days = 35");
        eq(50L, premium.lateFee(13), "premium 13 days = 50 (cap reached exactly)");
        eq(50L, premium.lateFee(20), "premium 20 days = 85 capped to 50");
        for (B_round.LendingPolicy p : List.of(standard, premium)) {
            long prev = 0;
            for (long d = 0; d <= 400; d++) {
                long f = p.lateFee(d);
                yes(f >= 0 && f >= prev, "contract: never negative, never falling at " + d);
                prev = f;
            }
        }
        Map<B_round.Tier, B_round.LendingPolicy> launch = B_round.launchPolicies();
        yes(launch.get(B_round.Tier.PREMIUM).equals(launch.get(B_round.Tier.STANDARD)), "launch: premium uses standard rules");
        Map<B_round.Tier, B_round.LendingPolicy> follow = B_round.premiumPolicies();
        eq(new B_round.FlatFeePolicy(3, 14, 10), follow.get(B_round.Tier.STANDARD), "follow-up keeps standard");
        eq(new B_round.GraceAndCapPolicy(5, 21, 3, 5, 50), follow.get(B_round.Tier.PREMIUM), "follow-up premium");
    }

    // ---------------------------------------------------------------- the demo the lesson prints
    static final List<String> DEMO = List.of(
            "borrowed C-001 by Ada, due 2026-03-16",
            "borrowed C-002 by Bo, due 2026-03-23",
            "rejected: no copy of isbn-1 is available",
            "returned C-001: 6 days late, fee 60",
            "returned C-002: 9 days late, fee 30",
            "rejected: copy C-001 is not on loan");

    static void demoTranscript() {
        eq(DEMO, B_round.demo(clock()), "demo transcript");
        PrintStream old = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf));
        try { B_round.main(new String[0]); } finally { System.setOut(old); }
        List<String> lines = Arrays.asList(buf.toString().trim().split("\\R"));
        eq("self-test: 8 checks passed", lines.get(0), "main prints the self-test line first (the lesson quotes 8)");
        eq(DEMO, lines.subList(1, lines.size()), "main prints the demo");
    }

    static B_round.LibraryService lib(Map<B_round.Tier, B_round.LendingPolicy> p, Clock c) {
        return B_round.newLibrary(p, c);
    }

    static void edges() {
        B_round.ManualClock c = clock();
        B_round.LibraryService lib = lib(B_round.premiumPolicies(), c);
        lib.addBook("isbn-1", "The Patient Gear");
        throwsOn(B_round.NotFoundException.class, () -> lib.addCopy("isbn-9"), "copy of unknown book");
        B_round.Copy c1 = lib.addCopy("isbn-1");
        eq("C-001", c1.id(), "first copy id");
        B_round.Member ada = lib.register("Ada", B_round.Tier.STANDARD);
        eq("M-001", ada.id(), "first member id");
        throwsOn(B_round.NotFoundException.class, () -> lib.borrow("M-404", "isbn-1"), "unknown member");
        throwsOn(B_round.NotFoundException.class, () -> lib.borrow(null, "isbn-1"), "null member id is not found, not an NPE");
        throwsOn(B_round.NotFoundException.class, () -> lib.borrow(ada.id(), "isbn-9"), "unknown book");
        throwsOn(B_round.NotFoundException.class, () -> lib.returnCopy("C-404"), "unknown copy");
        throwsOn(B_round.NotOnLoanException.class, () -> lib.returnCopy("C-001"), "return a copy that was never lent");
        eq(1L, lib.availableCopies("isbn-1"), "one available");
        B_round.Loan l = lib.borrow(ada.id(), "isbn-1");
        eq("L-001", l.id(), "loan id");
        eq(0L, lib.availableCopies("isbn-1"), "none available");
        eq(1, lib.activeLoans(ada.id()).size(), "one active loan");
        eq(List.of(), lib.overdue(), "nothing overdue on day 0");
        c.advanceDays(14);
        eq(List.of(), lib.overdue(), "due date itself is not overdue");
        c.advanceDays(1);
        eq(1, lib.overdue().size(), "one day after due is overdue");
        B_round.Receipt r = lib.returnCopy("C-001");
        eq(new B_round.Receipt("L-001", "C-001", 1, 10), r, "1 day late = 10");
        eq(List.of(), lib.overdue(), "returned loans are not overdue");
        eq(0, lib.activeLoans(ada.id()).size(), "no active loans after return");
        throwsOn(B_round.NotOnLoanException.class, () -> lib.returnCopy("C-001"), "returned twice");
        throwsOn(IllegalStateException.class, () -> c1.checkIn(), "entity guard: check in an available copy");
        c1.checkOut();
        throwsOn(IllegalStateException.class, () -> c1.checkOut(), "entity guard: check out twice");
        c1.checkIn();
        // early return: 0 days late
        B_round.Loan l2 = lib.borrow(ada.id(), "isbn-1");
        c.advanceDays(3);
        eq(0L, lib.returnCopy(l2.copyId()).fee(), "early return is free");
        // loan limit (standard = 3)
        for (int i = 0; i < 4; i++) lib.addCopy("isbn-1");
        for (int i = 0; i < 3; i++) lib.borrow(ada.id(), "isbn-1");
        throwsOn(B_round.LoanLimitException.class, () -> lib.borrow(ada.id(), "isbn-1"), "fourth standard loan");
        eq("member M-001 already has 3 loans", catchMessage(() -> lib.borrow(ada.id(), "isbn-1")), "limit message");
        throwsOn(IllegalArgumentException.class, () -> new B_round.Loan("L", "C", "M", LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 1)), "loan invariant");
        // missing tier policy fails loudly
        B_round.LibraryService partial = lib(Map.of(B_round.Tier.STANDARD, new B_round.FlatFeePolicy(3, 14, 10)), c);
        partial.addBook("isbn-1", "x");
        partial.addCopy("isbn-1");
        B_round.Member p = partial.register("P", B_round.Tier.PREMIUM);
        throwsOn(IllegalStateException.class, () -> partial.borrow(p.id(), "isbn-1"), "no policy for tier");
    }

    static String catchMessage(Runnable r) {
        try { r.run(); } catch (RuntimeException e) { return e.getMessage(); }
        return null;
    }

    static void launchVersusFollowUp() {
        for (boolean followUp : new boolean[] { false, true }) {
            B_round.ManualClock c = clock();
            B_round.LibraryService lib = lib(followUp ? B_round.premiumPolicies() : B_round.launchPolicies(), c);
            lib.addBook("isbn-1", "x");
            for (int i = 0; i < 6; i++) lib.addCopy("isbn-1");
            B_round.Member bo = lib.register("Bo", B_round.Tier.PREMIUM);
            B_round.Loan first = lib.borrow(bo.id(), "isbn-1");
            eq(LocalDate.of(2026, 3, followUp ? 23 : 16), first.dueOn(), "premium due date, follow-up=" + followUp);
            lib.borrow(bo.id(), "isbn-1");
            lib.borrow(bo.id(), "isbn-1");
            if (followUp) {
                lib.borrow(bo.id(), "isbn-1");
                lib.borrow(bo.id(), "isbn-1");
            }
            throwsOn(B_round.LoanLimitException.class, () -> lib.borrow(bo.id(), "isbn-1"), "premium limit, follow-up=" + followUp);
            c.advanceDays(30);   // 1 April
            eq(LocalDate.of(2026, 4, 1), LocalDate.now(c), "30 days after 2 March");
            B_round.Receipt r = lib.returnCopy(first.copyId());
            eq(followUp ? 9L : 16L, r.daysLate(), "days late");
            eq(followUp ? 30L : 160L, r.fee(), "fee, follow-up=" + followUp);
        }
    }

    // ---------------------------------------------------------------- random sequences vs an oracle
    static final class OCopy { final String id, isbn; String loan; OCopy(String id, String isbn) { this.id = id; this.isbn = isbn; } }
    static final class OLoan { final String memberId, copyId; final LocalDate due; boolean active = true;
        OLoan(String m, String c, LocalDate d) { memberId = m; copyId = c; due = d; } }

    static void randomOracle() {
        Random rnd = new Random(42);
        String[] memberIds = { "M-001", "M-002", "M-003", "M-404" };
        B_round.Tier[] tiers = { B_round.Tier.STANDARD, B_round.Tier.PREMIUM, B_round.Tier.STANDARD };
        String[] isbns = { "isbn-1", "isbn-2", "isbn-9" };
        for (int seq = 0; seq < 1000; seq++) {
            boolean premiumRules = seq % 2 == 0;
            B_round.ManualClock c = clock();
            B_round.LibraryService lib = lib(premiumRules ? B_round.premiumPolicies() : B_round.launchPolicies(), c);
            lib.addBook("isbn-1", "a");
            lib.addBook("isbn-2", "b");
            List<OCopy> copies = new ArrayList<>();
            for (int i = 0; i < 7; i++) {
                String isbn = i < 4 ? "isbn-1" : "isbn-2";
                copies.add(new OCopy(lib.addCopy(isbn).id(), isbn));
            }
            for (int i = 0; i < 3; i++) lib.register("m" + i, tiers[i]);
            Map<String, OLoan> loans = new LinkedHashMap<>();
            LocalDate today = LocalDate.of(2026, 3, 2);
            for (int op = 0; op < 40; op++) {
                int kind = rnd.nextInt(10);
                String expected, actual;
                if (kind < 5) {
                    String m = memberIds[rnd.nextInt(4)], isbn = isbns[rnd.nextInt(3)];
                    int mi = Arrays.asList(memberIds).indexOf(m);
                    if (mi == 3 || isbn.equals("isbn-9")) expected = "NotFoundException";
                    else {
                        B_round.Tier t = tiers[mi];
                        boolean prem = premiumRules && t == B_round.Tier.PREMIUM;
                        int limit = prem ? 5 : 3, days = prem ? 21 : 14;
                        long active = loans.values().stream().filter(l -> l.active && l.memberId.equals(m)).count();
                        OCopy free = copies.stream().filter(x -> x.isbn.equals(isbn) && x.loan == null).findFirst().orElse(null);
                        if (active >= limit) expected = "LoanLimitException";
                        else if (free == null) expected = "NoCopyAvailableException";
                        else {
                            String id = String.format("L-%03d", loans.size() + 1);
                            free.loan = id;
                            loans.put(id, new OLoan(m, free.id, today.plusDays(days)));
                            expected = id + " " + free.id + " " + today.plusDays(days);
                        }
                    }
                    try {
                        B_round.Loan l = lib.borrow(m, isbn);
                        actual = l.id() + " " + l.copyId() + " " + l.dueOn();
                    } catch (RuntimeException e) { actual = e.getClass().getSimpleName(); }
                } else if (kind < 8) {
                    int pick = rnd.nextInt(8);
                    String copyId = pick == 7 ? "C-404" : copies.get(pick).id;
                    if (pick == 7) expected = "NotFoundException";
                    else {
                        OCopy oc = copies.get(pick);
                        if (oc.loan == null) expected = "NotOnLoanException";
                        else {
                            OLoan ol = loans.get(oc.loan);
                            long late = Math.max(0, today.toEpochDay() - ol.due.toEpochDay());
                            B_round.Tier t = tiers[Arrays.asList(memberIds).indexOf(ol.memberId)];
                            expected = oc.loan + " " + late + " " + oracleFee(t, premiumRules, late);
                            ol.active = false;
                            oc.loan = null;
                        }
                    }
                    try {
                        B_round.Receipt r = lib.returnCopy(copyId);
                        actual = r.loanId() + " " + r.daysLate() + " " + r.fee();
                    } catch (RuntimeException e) { actual = e.getClass().getSimpleName(); }
                } else {
                    int d = rnd.nextInt(10);
                    c.advanceDays(d);
                    today = today.plusDays(d);
                    final LocalDate now = today;
                    long overdue = loans.values().stream().filter(l -> l.active && now.isAfter(l.due)).count();
                    expected = "overdue " + overdue;
                    actual = "overdue " + lib.overdue().size();
                }
                eq(expected, actual, "seq " + seq + " op " + op);
            }
            for (OCopy oc : copies)
                if (oc.isbn.equals("isbn-1")) { /* availability agrees */ }
            eq(copies.stream().filter(x -> x.isbn.equals("isbn-1") && x.loan == null).count(), lib.availableCopies("isbn-1"), "availability seq " + seq);
        }
    }

    // ---------------------------------------------------------------- locked wrapper under real threads
    static <T> List<Object> race(int threads, Callable<T> task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Object>> fs = new ArrayList<>();
        for (int i = 0; i < threads; i++)
            fs.add(pool.submit(() -> { go.await(); try { return (Object) task.call(); } catch (RuntimeException e) { return e; } }));
        go.countDown();
        List<Object> out = new ArrayList<>();
        for (Future<Object> f : fs) out.add(f.get(10, TimeUnit.SECONDS));
        pool.shutdown();
        yes(pool.awaitTermination(10, TimeUnit.SECONDS), "pool finished (no deadlock)");
        return out;
    }

    static void lockedLibrary() throws Exception {
        for (int trial = 0; trial < 200; trial++) {
            B_round.LibraryService lib = lib(B_round.premiumPolicies(), clock());
            lib.addBook("isbn-1", "x");
            lib.addCopy("isbn-1");
            List<String> members = new ArrayList<>();
            for (int i = 0; i < 16; i++) members.add(lib.register("m" + i, B_round.Tier.STANDARD).id());
            B_round.ConcurrentLibrary safe = new B_round.ConcurrentLibrary(lib);
            AtomicInteger next = new AtomicInteger();
            List<Object> results = race(16, () -> safe.borrow(members.get(next.getAndIncrement()), "isbn-1"));
            eq(1L, results.stream().filter(r -> r instanceof B_round.Loan).count(), "exactly one kiosk gets the last copy");
            eq(15L, results.stream().filter(r -> r instanceof B_round.NoCopyAvailableException).count(), "the rest are rejected cleanly");
            eq(0L, safe.availableCopies("isbn-1"), "no copies left");
        }
        for (int trial = 0; trial < 100; trial++) {
            B_round.LibraryService lib = lib(B_round.premiumPolicies(), clock());
            lib.addBook("isbn-1", "x");
            for (int i = 0; i < 10; i++) lib.addCopy("isbn-1");
            String ada = lib.register("Ada", B_round.Tier.STANDARD).id();
            B_round.ConcurrentLibrary safe = new B_round.ConcurrentLibrary(lib);
            List<Object> results = race(12, () -> safe.borrow(ada, "isbn-1"));
            eq(3L, results.stream().filter(r -> r instanceof B_round.Loan).count(), "limit holds under concurrency");
            eq(3, safe.activeLoans(ada).size(), "three active loans");
            Set<String> copyIds = new HashSet<>();
            for (Object r : results) if (r instanceof B_round.Loan l) copyIds.add(l.copyId());
            eq(3, copyIds.size(), "no copy lent twice");
            List<Object> returns = race(8, () -> safe.returnCopy("C-001"));
            eq(1L, returns.stream().filter(r -> r instanceof B_round.Receipt).count(), "a copy is returned exactly once");
            eq(7L, returns.stream().filter(r -> r instanceof B_round.NotOnLoanException).count(), "other returns rejected");
        }
    }

    // ---------------------------------------------------------------- the three tools
    static void slotBook() throws Exception {
        for (int trial = 0; trial < 300; trial++) {
            B_locks.SlotBook book = new B_locks.SlotBook();
            AtomicInteger n = new AtomicInteger();
            List<Object> results = race(16, () -> book.claim("charger-3@18:00", "driver-" + n.getAndIncrement()));
            eq(1L, results.stream().filter(r -> Boolean.TRUE.equals(r)).count(), "one winner per slot");
            String holder = book.holder("charger-3@18:00").orElseThrow();
            yes(!book.release("charger-3@18:00", "someone-else"), "a non-holder cannot release");
            yes(book.release("charger-3@18:00", holder), "holder releases");
            eq(Optional.empty(), book.holder("charger-3@18:00"), "slot free again");
        }
    }

    static void wallets() throws Exception {
        B_locks.Wallets w = new B_locks.Wallets();
        w.open("A", 5000);
        List<Object> results = race(8, () -> {
            int ok = 0;
            for (int i = 0; i < 1000; i++) {
                try { w.debit("A", 1); ok++; } catch (IllegalStateException e) { /* insufficient */ }
            }
            return ok;
        });
        eq(5000, results.stream().mapToInt(r -> (Integer) r).sum(), "exactly 5000 debits succeed out of 8000");
        eq(0L, w.balance("A"), "balance reaches 0, never negative");
        throwsOn(IllegalStateException.class, () -> w.debit("A", 1), "empty wallet");

        B_locks.Wallets t = new B_locks.Wallets();
        t.open("A", 1000);
        t.open("B", 1000);
        AtomicInteger who = new AtomicInteger();
        race(8, () -> {
            boolean ab = who.getAndIncrement() % 2 == 0;
            for (int i = 0; i < 5000; i++) {
                try { if (ab) t.transfer("A", "B", 3); else t.transfer("B", "A", 3); } catch (IllegalStateException e) { }
            }
            return null;
        });
        eq(2000L, t.balance("A") + t.balance("B"), "transfers in both directions conserve money and finish");
        yes(t.balance("A") >= 0 && t.balance("B") >= 0, "no negative balance");
        throwsOn(IllegalArgumentException.class, () -> t.transfer("A", "A", 1), "self transfer rejected");
        t.open("C", 5);
        throwsOn(IllegalStateException.class, () -> t.transfer("C", "A", 6), "transfer more than balance");
        eq(5L, t.balance("C"), "failed transfer changes nothing");
    }

    static void versioned() throws Exception {
        B_locks.VersionedStore<Integer> store = new B_locks.VersionedStore<>();
        store.insert("issued", 0);
        throwsOn(IllegalStateException.class, () -> store.insert("issued", 5), "insert twice");
        throwsOn(NoSuchElementException.class, () -> store.read("nope"), "unknown row");
        B_locks.Versioned<Integer> seen = store.read("issued");
        eq(0L, seen.version(), "starts at version 0");
        yes(store.update("issued", 0, 10), "first writer wins");
        yes(!store.update("issued", 0, 99), "stale writer loses");
        eq(new B_locks.Versioned<>(10, 1), store.read("issued"), "value and version after one write");
        store.insert("counter", 0);
        race(8, () -> { for (int i = 0; i < 500; i++) store.updateWithRetry("counter", v -> v + 1); return null; });
        eq(4000, store.read("counter").value(), "no lost updates with retry");
        eq(4000L, store.read("counter").version(), "one version per successful write");
    }
}
