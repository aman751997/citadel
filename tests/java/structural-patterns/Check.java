import java.lang.reflect.Proxy;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;

// Exercises every compiled design in src/lld-lessons/structural-patterns.mdx: adapters' format and unit
// conversion (including the int overflow edge), decorator stacking orders against a simulated oracle,
// the auth/virtual/caching proxies and the JDK dynamic proxy's self-invocation blind spot, the facade's
// exact call order and failure policy, composite totals on random trees vs flat sums, bridge rendering,
// and flyweight sharing by identity. Every number quoted in the lesson and its traces is asserted here.
public class Check {
    static int checks = 0;
    static final Random RNG = new Random(20261007);

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

    static final B_clinic.PhoneNumber PHONE = new B_clinic.PhoneNumber("+919812345678");

    public static void main(String[] args) {
        adapter();
        payloom();
        decorator();
        decoratorOracle();
        logging();
        authProxy();
        lazyScan();
        caching();
        dynamicProxy();
        facade();
        composite();
        garage();
        bridge();
        flyweight();
        glyphs();
        sideQuests();
        System.out.println("OK structural-patterns: " + checks + " checks passed");
    }

    // ---------- Chapter 1: TextWave adapter ----------
    static void adapter() {
        B_clinic c = new B_clinic();
        for (String bad : new String[] { "919812345678", "+0919812345", "+12345", "+1234567890123456", "+91 98123", "" })
            throwsOn(IllegalArgumentException.class, () -> new B_clinic.PhoneNumber(bad), "invalid E.164 " + bad);
        new B_clinic.PhoneNumber("+1234567");                       // 7 digits: shortest allowed
        new B_clinic.PhoneNumber("+123456789012345");               // 15 digits: longest allowed

        B_clinic.TextWaveClient client = c.new TextWaveClient("key");
        B_clinic.SmsGateway sms = c.liveSms(client);
        sms.send(PHONE, "Hello");
        eq(List.of("MEDICORE->919812345678: Hello"), client.delivered, "adapter strips the plus and sets sender");
        throwsOn(B_clinic.SmsDeliveryException.class, () -> sms.send(PHONE, ""), "empty body -> domain exception");
        try { sms.send(PHONE, ""); } catch (RuntimeException e) {
            yes(e.getMessage().contains("E102_EMPTY_BODY"), "reason code carried in our exception");
        }
        eq(1, client.delivered.size(), "failed sends not delivered");

        for (int i = 0; i < 1000; i++) {
            StringBuilder digits = new StringBuilder().append(1 + RNG.nextInt(9));
            int more = 6 + RNG.nextInt(9);
            for (int k = 0; k < more; k++) digits.append(RNG.nextInt(10));
            String text = "msg " + i;
            sms.send(new B_clinic.PhoneNumber("+" + digits), text);
            eq("MEDICORE->" + digits + ": " + text, client.delivered.get(client.delivered.size() - 1), "random number round trip");
        }

        List<String> sent = new ArrayList<>();
        c.new ReminderService((to, text) -> sent.add(to.e164() + "|" + text)).remind(PHONE, "Rao", LocalDateTime.of(2026, 10, 12, 9, 30));
        eq(List.of("+919812345678|Reminder: Dr Rao, 2026-10-12 at 09:30"), sent, "reminder uses the port only");
    }

    // ---------- Chapter 1 your turn: PayLoom adapter and Money ----------
    static void payloom() {
        B_clinic c = new B_clinic();
        eq(900000L, B_clinic.Money.rupees(9000).paise(), "rupees -> paise");
        eq("INR 9000.00", B_clinic.Money.rupees(9000).toString(), "money display");
        eq("INR 0.05", new B_clinic.Money(5).toString(), "five paise display");
        eq("INR 12.34", new B_clinic.Money(1234).toString(), "display 12.34");
        throwsOn(IllegalArgumentException.class, () -> new B_clinic.Money(-1), "negative money");
        throwsOn(IllegalArgumentException.class, () -> B_clinic.Money.rupees(1).minus(B_clinic.Money.rupees(2)), "minus refuses negative");

        B_clinic.PayLoomSdk sdk = c.new PayLoomSdk();
        B_clinic.PayLoomAdapter pay = c.new PayLoomAdapter(sdk);
        eq(new B_clinic.PaymentResult(true, "PL-1"), pay.process("ADM-2201", B_clinic.Money.rupees(9000)), "9000 approved");
        eq(List.of("MC-ADM-2201 INR 900000"), sdk.captures, "PayLoom gets int paise");
        eq(new B_clinic.PaymentResult(true, "NOTHING-DUE"), pay.process("ADM-1", B_clinic.Money.ZERO), "zero due never reaches PayLoom");
        eq(1, sdk.captures.size(), "zero not captured");

        eq(-1_794_967_296, (int) 2_500_000_000L, "plain cast of 2.5 crore wraps negative");
        eq(2_147_483_647, Integer.MAX_VALUE, "int max");
        eq(new B_clinic.PaymentResult(true, "PL-2"), pay.process("ADM-MAX", new B_clinic.Money(2_147_483_647L)), "exactly int max is fine");
        eq(new B_clinic.PaymentResult(false, null), pay.process("ADM-BIG", new B_clinic.Money(2_147_483_648L)), "one above the limit declines");
        eq(new B_clinic.PaymentResult(false, null), pay.process("ADM-CORP", new B_clinic.Money(2_500_000_000L)), "2.5 crore declines");
        eq(2, sdk.captures.size(), "over-limit amounts never captured");

        // a vendor that captures only part, or errors
        B_clinic.PayLoomSdk partial = c.new PayLoomSdk() {
            @Override B_clinic.PayLoomResponse capture(String ref, String cur, int minor) { return new B_clinic.PayLoomResponse(201, "PL-X", minor - 1); }
        };
        eq(new B_clinic.PaymentResult(false, null), c.new PayLoomAdapter(partial).process("A", B_clinic.Money.rupees(10)), "partial capture is a decline");
        B_clinic.PayLoomSdk down = c.new PayLoomSdk() {
            @Override B_clinic.PayLoomResponse capture(String ref, String cur, int minor) { return new B_clinic.PayLoomResponse(503, null, 0); }
        };
        eq(new B_clinic.PaymentResult(false, null), c.new PayLoomAdapter(down).process("A", B_clinic.Money.rupees(10)), "503 is a decline");

        B_clinic.PayLoomSdk s2 = c.new PayLoomSdk();
        B_clinic.PayLoomAdapter p2 = c.new PayLoomAdapter(s2);
        int approved = 0;
        for (int i = 0; i < 2000; i++) {
            long paise = RNG.nextBoolean() ? 1 + (long) RNG.nextInt(Integer.MAX_VALUE) : Integer.MAX_VALUE + 1L + (long) (RNG.nextDouble() * 1e12);
            B_clinic.PaymentResult r = p2.process("R" + i, new B_clinic.Money(paise));
            boolean expect = paise <= Integer.MAX_VALUE;
            eq(expect, r.approved(), "random amount approval " + paise);
            if (expect) {
                approved++;
                eq("MC-R" + i + " INR " + paise, s2.captures.get(s2.captures.size() - 1), "exact minor units " + paise);
            }
        }
        eq(approved, s2.captures.size(), "only in-range amounts captured");
    }

    // ---------- Chapter 2: decorators ----------
    static class Flaky implements B_clinic.SmsGateway {
        final B_clinic outer; int failuresLeft; int calls;
        Flaky(B_clinic outer, int failures) { this.outer = outer; this.failuresLeft = failures; }
        public void send(B_clinic.PhoneNumber to, String text) {
            calls++;
            if (failuresLeft > 0) { failuresLeft--; throw outer.new SmsDeliveryException(to, "E500"); }
        }
    }
    static class Permits implements B_clinic.RateLimiter {
        int left, taken;
        Permits(int left) { this.left = left; }
        public boolean tryAcquire() { if (left == 0) return false; left--; taken++; return true; }
    }

    static void decorator() {
        B_clinic c = new B_clinic();
        List<Long> sleeps = new ArrayList<>();
        Flaky v = new Flaky(c, 2);
        Permits p = new Permits(10);
        c.campaignSms(v, p, sleeps::add).send(PHONE, "hi");
        eq(3, p.taken, "Retry(RateLimit(v)): fails twice then ok -> 3 permits");
        eq(3, v.calls, "3 vendor calls");
        eq(List.of(100L, 200L), sleeps, "backoff 100, 200");

        Flaky v2 = new Flaky(c, 2);
        Permits p2 = new Permits(10);
        c.new RateLimitedGateway(c.new RetryingGateway(v2, 3, ms -> {}), p2).send(PHONE, "hi");
        eq(1, p2.taken, "RateLimit(Retry(v)) -> 1 permit");
        eq(3, v2.calls, "still 3 vendor calls");

        sleeps.clear();
        Flaky v3 = new Flaky(c, 5);
        throwsOn(B_clinic.SmsDeliveryException.class, () -> c.new RetryingGateway(v3, 3, sleeps::add).send(PHONE, "x"), "retry exhausted rethrows");
        eq(3, v3.calls, "exactly maxAttempts calls");
        eq(List.of(100L, 200L), sleeps, "no sleep after last attempt");

        sleeps.clear();
        Flaky v4 = new Flaky(c, 4);
        c.otpSms(v4, sleeps::add).send(PHONE, "otp");
        eq(5, v4.calls, "otp retries 5 times");
        eq(List.of(100L, 200L, 400L, 800L), sleeps, "doubling backoff");

        throwsOn(IllegalArgumentException.class, () -> c.new RetryingGateway(v4, 0, ms -> {}), "maxAttempts >= 1");

        // limiter runs dry mid-retry: the RateLimitExceededException escapes on attempt three
        sleeps.clear();
        Flaky v5 = new Flaky(c, 2);
        Permits p5 = new Permits(2);
        throwsOn(B_clinic.RateLimitExceededException.class, () -> c.campaignSms(v5, p5, sleeps::add).send(PHONE, "x"), "limit error not retried");
        eq(2, v5.calls, "two vendor calls before the bucket ran dry");
        eq(List.of(100L, 200L), sleeps, "slept before the third attempt");

        Flaky v6 = new Flaky(c, 0);
        throwsOn(B_clinic.RateLimitExceededException.class, () -> c.new RateLimitedGateway(v6, new Permits(0)).send(PHONE, "x"), "empty limiter refuses");
        eq(0, v6.calls, "inner never called when refused");
        yes(c.plainSms(v6) == v6, "plain wiring is the vendor itself");

        // subclass explosion arithmetic: 2 senders x every subset of 3 behaviours vs 2 adapters + 3 decorators
        int subclassCount = 0;
        for (int sender = 0; sender < 2; sender++) for (int subset = 0; subset < (1 << 3); subset++) subclassCount++;
        eq(16, subclassCount, "16 classes by subclassing");
        eq(8, 1 << 3, "8 per vendor");
        eq(5, 2 + 3, "5 with decorators");
    }

    // Random failures / attempts / permits against a hand simulation of both nestings.
    static void decoratorOracle() {
        B_clinic c = new B_clinic();
        for (int i = 0; i < 2000; i++) {
            int f = RNG.nextInt(7), a = 1 + RNG.nextInt(5), permits = RNG.nextInt(9);
            // Retry(Limit(v))
            String expOutcome = null; int expCalls = 0, expTaken = 0, expSleeps = 0; int left = permits, fails = f;
            for (int attempt = 1; ; attempt++) {
                if (left == 0) { expOutcome = "limit"; break; }
                left--; expTaken++; expCalls++;
                if (fails > 0) {
                    fails--;
                    if (attempt == a) { expOutcome = "fail"; break; }
                    expSleeps++;
                } else { expOutcome = "ok"; break; }
            }
            Flaky v = new Flaky(c, f); Permits p = new Permits(permits); List<Long> sleeps = new ArrayList<>();
            String got = outcome(() -> c.new RetryingGateway(c.new RateLimitedGateway(v, p), a, sleeps::add).send(PHONE, "x"));
            eq(expOutcome, got, "retry-outside outcome f=" + f + " a=" + a + " p=" + permits);
            eq(expCalls, v.calls, "retry-outside calls");
            eq(expTaken, p.taken, "retry-outside permits");
            eq(expSleeps, sleeps.size(), "retry-outside sleeps");

            // Limit(Retry(v))
            Flaky w = new Flaky(c, f); Permits q = new Permits(permits);
            String got2 = outcome(() -> c.new RateLimitedGateway(c.new RetryingGateway(w, a, ms -> {}), q).send(PHONE, "x"));
            String exp2 = permits == 0 ? "limit" : (f < a ? "ok" : "fail");
            eq(exp2, got2, "limit-outside outcome");
            eq(permits == 0 ? 0 : Math.min(f + 1, a), w.calls, "limit-outside calls");
            eq(permits == 0 ? 0 : 1, q.taken, "limit-outside spends at most one permit");
        }
    }
    static String outcome(Runnable r) {
        try { r.run(); return "ok"; }
        catch (B_clinic.RateLimitExceededException e) { return "limit"; }
        catch (B_clinic.SmsDeliveryException e) { return "fail"; }
    }

    static void logging() {
        B_clinic c = new B_clinic();
        eq("+91981234****", B_clinic.LoggingGateway.mask(PHONE), "mask last four");
        List<String> log = new ArrayList<>();
        c.loggedPerSend(new Flaky(c, 2), log, ms -> {}).send(PHONE, "x");
        eq(List.of("send +91981234****", "sent +91981234****"), log, "per send: 2 lines");
        log.clear();
        c.loggedPerAttempt(new Flaky(c, 2), log, ms -> {}).send(PHONE, "x");
        eq(List.of("send +91981234****", "failed +91981234**** SmsDeliveryException",
                   "send +91981234****", "failed +91981234**** SmsDeliveryException",
                   "send +91981234****", "sent +91981234****"), log, "per attempt: 6 lines");
        log.clear();
        throwsOn(B_clinic.SmsDeliveryException.class, () -> c.loggedPerSend(new Flaky(c, 5), log, ms -> {}).send(PHONE, "x"), "logging rethrows");
        eq(List.of("send +91981234****", "failed +91981234**** SmsDeliveryException"), log, "one failed story");
        for (String line : log) yes(!line.contains("9812345678"), "no full number in log");
    }

    // ---------- Chapter 3: proxies ----------
    static void authProxy() {
        B_clinic c = new B_clinic();
        AtomicInteger realCalls = new AtomicInteger();
        B_clinic.PatientRecords certified = pid -> { realCalls.incrementAndGet(); return new B_clinic.History(pid, List.of("DX:asthma")); };
        List<String> audit = new ArrayList<>();
        AtomicReference<B_clinic.User> who = new AtomicReference<>();
        B_clinic.PatientRecords records = c.guardedRecords(certified,
            c.new TreatingTeamPolicy(Map.of("dr-rao", Set.of("P-1"))), (a, s, d) -> audit.add(a + "|" + s + "|" + d), who::get);

        who.set(new B_clinic.User("dr-rao", "DOCTOR"));
        eq(new B_clinic.History("P-1", List.of("DX:asthma")), records.fullHistory("P-1"), "treating doctor reads");
        eq(List.of("READ_HISTORY|dr-rao|P-1"), audit, "read audited");
        throwsOn(B_clinic.AccessDeniedException.class, () -> records.fullHistory("P-2"), "doctor, not treating");
        who.set(new B_clinic.User("desk-1", "RECEPTION"));
        throwsOn(B_clinic.AccessDeniedException.class, () -> records.fullHistory("P-1"), "receptionist denied");
        eq(1, realCalls.get(), "denied requests never reach the certified service");
        eq(List.of("READ_HISTORY|dr-rao|P-1", "DENIED_HISTORY|dr-rao|P-2", "DENIED_HISTORY|desk-1|P-1"), audit, "denials audited");

        // random requests vs oracle
        Map<String, Set<String>> assign = new HashMap<>();
        String[] doctors = { "d1", "d2", "d3" };
        for (String d : doctors) { Set<String> s = new HashSet<>(); for (int k = 0; k < 5; k++) s.add("P-" + RNG.nextInt(10)); assign.put(d, s); }
        realCalls.set(0); audit.clear();
        B_clinic.PatientRecords r2 = c.new RecordsAuthProxy(certified, c.new TreatingTeamPolicy(assign), (a, s, d) -> audit.add(a), who::get);
        int allowed = 0;
        for (int i = 0; i < 2000; i++) {
            boolean doctor = RNG.nextInt(4) != 0;
            String id = doctor ? doctors[RNG.nextInt(3)] : "nurse" + RNG.nextInt(3);
            String pid = "P-" + RNG.nextInt(10);
            who.set(new B_clinic.User(id, doctor ? "DOCTOR" : "NURSE"));
            boolean expect = doctor && assign.get(id).contains(pid);
            boolean ok;
            try { r2.fullHistory(pid); ok = true; } catch (B_clinic.AccessDeniedException e) { ok = false; }
            eq(expect, ok, "policy oracle");
            if (expect) allowed++;
        }
        eq(allowed, realCalls.get(), "real calls == allowed");
        eq(2000, audit.size(), "one audit line per request");
    }

    static void lazyScan() {
        B_clinic c = new B_clinic();
        AtomicInteger loads = new AtomicInteger();
        byte[] img = { 1, 2, 3 };
        Function<String, B_clinic.Scan> archive = id -> {
            loads.incrementAndGet();
            return new B_clinic.Scan() { public String id() { return id; } public byte[] pixels() { return img; } };
        };
        List<B_clinic.Scan> list = new ArrayList<>();
        for (int i = 0; i < 20; i++) list.add(c.new LazyScan("MRI-" + i, archive));
        for (B_clinic.Scan s : list) s.id();
        eq(0, loads.get(), "listing loads nothing");
        B_clinic.Scan s = list.get(3);
        eq("MRI-3", s.id(), "id from proxy");
        yes(s.pixels() == img, "pixels from the real scan");
        yes(s.pixels() == img, "second call reuses");
        eq(1, loads.get(), "id, pixels, pixels -> one load");
    }

    static void caching() {
        B_clinic c = new B_clinic();
        long[] now = { 0 };
        Map<String, Integer> realCounts = new HashMap<>();
        B_clinic.EligibilityService real = pid -> {
            if (pid.equals("BAD")) throw new IllegalStateException("insurer down");
            int n = realCounts.merge(pid, 1, Integer::sum);
            return new B_clinic.Eligibility(true, new B_clinic.Money(n));      // version number in the cap
        };
        B_clinic.CachingEligibility cache = c.new CachingEligibility(real, Long.MAX_VALUE, () -> now[0]);
        for (String p : new String[] { "P1", "P2", "P1", "P1", "P3", "P2" }) cache.check(p);
        eq(3, cache.hits, "trace: 3 hits");
        eq(3, cache.misses, "trace: 3 misses");
        eq(3, realCounts.values().stream().mapToInt(Integer::intValue).sum(), "insurer called 3 times");

        realCounts.clear();
        B_clinic.CachingEligibility ttl = c.new CachingEligibility(real, 600_000, () -> now[0]);
        now[0] = 0; ttl.check("P1");
        now[0] = 599_999; eq(1L, ttl.check("P1").cap().paise(), "9:59.999 is a hit");
        now[0] = 600_000; eq(2L, ttl.check("P1").cap().paise(), "exactly 10:00 is a miss, fresh value");
        eq(1, ttl.hits, "one hit"); eq(2, ttl.misses, "two misses");

        throwsOn(IllegalStateException.class, () -> ttl.check("BAD"), "failure propagates");
        throwsOn(IllegalStateException.class, () -> ttl.check("BAD"), "failure not cached");
        eq(4, ttl.misses, "both failures counted as misses");

        for (int round = 0; round < 300; round++) {
            realCounts.clear();
            long ttlMs = 1 + RNG.nextInt(50);
            long[] t = { 0 };
            B_clinic.CachingEligibility cc = c.new CachingEligibility(real, ttlMs, () -> t[0]);
            Map<String, long[]> oracle = new HashMap<>();   // pid -> {storedAt, version}
            Map<String, Integer> versions = new HashMap<>();
            int hits = 0, misses = 0;
            for (int i = 0; i < 40; i++) {
                t[0] += RNG.nextInt(20);
                String pid = "P" + RNG.nextInt(4);
                long[] e = oracle.get(pid);
                long expectCap;
                if (e != null && t[0] - e[0] < ttlMs) { hits++; expectCap = e[1]; }
                else { misses++; int v = versions.merge(pid, 1, Integer::sum); oracle.put(pid, new long[] { t[0], v }); expectCap = v; }
                eq(expectCap, cc.check(pid).cap().paise(), "cached value matches oracle");
            }
            eq(hits, cc.hits, "random hits"); eq(misses, cc.misses, "random misses");
            eq(misses, realCounts.values().stream().mapToInt(Integer::intValue).sum(), "real calls == misses");
        }
    }

    static void dynamicProxy() {
        B_clinic c = new B_clinic();
        List<String> calls = new ArrayList<>();
        B_clinic.GeneralWard real = c.new GeneralWard();
        B_clinic.Ward w = c.traced(B_clinic.Ward.class, real, calls);
        yes(Proxy.isProxyClass(w.getClass()), "a JDK dynamic proxy");
        w.admitAll(List.of("P-1", "P-2"));
        eq(List.of("admitAll"), calls, "self-invocation bypasses the proxy");
        eq(List.of("P-1", "P-2"), real.beds, "both admitted");
        w.admit("P-3");
        eq(List.of("admitAll", "admit"), calls, "direct call is traced");
        throwsOn(IllegalStateException.class, () -> w.admit("P-1"), "target exception unwrapped");
        eq(3, calls.size(), "failed call still traced");

        List<String> smsCalls = new ArrayList<>();
        List<String> sent = new ArrayList<>();
        c.traced(B_clinic.SmsGateway.class, (to, text) -> sent.add(text), smsCalls).send(PHONE, "hi");
        eq(List.of("send"), smsCalls, "one handler traces any interface");
        eq(List.of("hi"), sent, "and forwards");
    }

    // ---------- Chapter 4: facade ----------
    static void facade() {
        B_clinic c = new B_clinic();
        List<String> steps = new ArrayList<>();
        B_clinic.BillingService billing = id -> { steps.add("billing"); return new B_clinic.Bill(id, PHONE, B_clinic.Money.rupees(74500), B_clinic.Money.rupees(20000)); };
        B_clinic.PayLoomSdk sdk = c.new PayLoomSdk();
        B_clinic.PayLoomAdapter adapter = c.new PayLoomAdapter(sdk);
        B_clinic.PaymentProcessor payments = (id, amt) -> { steps.add("payment " + amt.paise()); return adapter.process(id, amt); };
        B_clinic.PharmacyService pharmacy = id -> steps.add("pharmacy");
        B_clinic.AuditLog audit = (a, s, d) -> steps.add("audit " + a + "|" + s + "|" + d);
        B_clinic.SmsGateway sms = (to, text) -> steps.add("sms " + text);

        B_clinic.DischargeSummary s = c.new DischargeFacade(billing, payments, pharmacy, sms, audit).discharge("ADM-2201");
        eq(List.of("billing", "payment 5450000", "pharmacy", "audit DISCHARGE|ADM-2201|PL-1", "sms Discharge complete. Bill: INR 74500.00"), steps, "exact order");
        eq(new B_clinic.PaymentResult(true, "PL-1"), s.paid(), "summary payment");
        eq(B_clinic.Money.rupees(54500), s.bill().pendingDue(), "54,500 due");

        // the bug Oona found: the original facade carries on after a decline
        steps.clear();
        B_clinic.PaymentProcessor declining = (id, amt) -> { steps.add("payment"); return new B_clinic.PaymentResult(false, null); };
        c.new DischargeFacade(billing, declining, pharmacy, sms, audit).discharge("ADM-1");
        yes(steps.contains("pharmacy"), "original facade dispenses after a decline");
        yes(steps.contains("audit DISCHARGE|ADM-1|null"), "and audits a null reference");

        steps.clear();
        B_clinic.GuardedDischargeFacade guarded = c.new GuardedDischargeFacade(billing, declining, pharmacy, sms, audit);
        throwsOn(B_clinic.DischargeBlockedException.class, () -> guarded.discharge("ADM-1"), "decline blocks");
        eq(List.of("billing", "payment", "audit DISCHARGE_BLOCKED|ADM-1|payment declined"), steps, "nothing leaves the building");

        steps.clear();
        B_clinic.SmsGateway down = (to, text) -> { steps.add("sms"); throw c.new SmsDeliveryException(to, "E500"); };
        B_clinic.DischargeSummary s2 = c.new GuardedDischargeFacade(billing, payments, pharmacy, down, audit).discharge("ADM-7");
        yes(s2.paid().approved(), "summary returned despite SMS failure");
        eq(List.of("billing", "payment 5450000", "pharmacy", "audit DISCHARGE|ADM-7|PL-2", "sms", "audit DISCHARGE_SMS_FAILED|ADM-7|SmsDeliveryException"), steps, "SMS failure audited");

        // prepaid patient through the real adapter: PayLoom never called
        steps.clear();
        int before = sdk.captures.size();
        B_clinic.BillingService prepaid = id -> new B_clinic.Bill(id, PHONE, B_clinic.Money.rupees(100), B_clinic.Money.rupees(100));
        B_clinic.DischargeSummary s3 = c.new GuardedDischargeFacade(prepaid, adapter, pharmacy, sms, audit).discharge("ADM-9");
        eq("NOTHING-DUE", s3.paid().reference(), "prepaid");
        eq(before, sdk.captures.size(), "PayLoom untouched");
    }

    // ---------- Chapter 5: composite ----------
    static void composite() {
        B_clinic c = new B_clinic();
        eq(B_clinic.Money.rupees(74500), c.admissionBill().total(), "admission bill 74,500");
        B_clinic.ChargeGroup an = c.new ChargeGroup("Anesthesia")
            .add(new B_clinic.Charge("Anesthetist", B_clinic.Money.rupees(8000)))
            .add(new B_clinic.Charge("Drugs", B_clinic.Money.rupees(2500)));
        eq(B_clinic.Money.rupees(10500), an.total(), "anesthesia 10,500");
        B_clinic.ChargeGroup sp = c.new ChargeGroup("Surgery package")
            .add(new B_clinic.Charge("Surgeon fee", B_clinic.Money.rupees(40000)))
            .add(new B_clinic.Charge("OT charges", B_clinic.Money.rupees(15000))).add(an);
        eq(B_clinic.Money.rupees(65500), sp.total(), "surgery package 65,500");
        eq(B_clinic.Money.ZERO, c.new ChargeGroup("empty").total(), "empty group");

        B_clinic.ChargeGroup loop = c.new ChargeGroup("loop");
        loop.add(loop);
        throwsOn(StackOverflowError.class, () -> loop.total(), "a cycle recurses forever");

        for (int i = 0; i < 1000; i++) {
            List<Long> leaves = new ArrayList<>();
            B_clinic.BillNode root = randomBill(c, 0, leaves);
            eq(leaves.stream().mapToLong(Long::longValue).sum(), root.total().paise(), "random tree total == flat sum");
        }
    }
    static B_clinic.BillNode randomBill(B_clinic c, int depth, List<Long> leaves) {
        if (depth >= 6 || RNG.nextInt(3) == 0) {
            long paise = RNG.nextInt(10_000_000);
            leaves.add(paise);
            return new B_clinic.Charge("c", new B_clinic.Money(paise));
        }
        B_clinic.ChargeGroup g = c.new ChargeGroup("g" + depth);
        int n = RNG.nextInt(4);
        for (int k = 0; k < n; k++) g.add(randomBill(c, depth + 1, leaves));
        return g;
    }

    static void garage() {
        B_garage g = new B_garage();
        for (int i = 0; i < 1000; i++) {
            List<B_garage.Spot> spots = new ArrayList<>();
            B_garage.Section root = g.new Section("Copperline");
            int levels = 1 + RNG.nextInt(4);
            List<B_garage.Section> levelList = new ArrayList<>();
            List<List<B_garage.Spot>> levelSpots = new ArrayList<>();
            for (int l = 0; l < levels; l++) {
                B_garage.Section level = g.new Section("L" + l);
                List<B_garage.Spot> mine = new ArrayList<>();
                int zones = RNG.nextInt(4);
                for (int z = 0; z < zones; z++) {
                    B_garage.Section zone = g.new Section("Z" + z);
                    int n = RNG.nextInt(6);
                    for (int k = 0; k < n; k++) { B_garage.Spot s = g.new Spot(l + "-" + z + "-" + k); zone.add(s); mine.add(s); }
                    level.add(zone);
                }
                if (RNG.nextBoolean()) { B_garage.Spot s = g.new Spot("loose" + l); level.add(s); mine.add(s); }
                root.add(level); levelList.add(level); levelSpots.add(mine); spots.addAll(mine);
            }
            Set<B_garage.Spot> taken = new HashSet<>();
            for (B_garage.Spot s : spots) if (RNG.nextBoolean()) { s.park(); taken.add(s); }
            eq(spots.size(), root.capacity(), "capacity == spot count");
            eq(spots.size() - taken.size(), root.free(), "free == flat count");
            for (int l = 0; l < levels; l++) {
                long freeHere = levelSpots.get(l).stream().filter(s -> !taken.contains(s)).count();
                eq((int) freeHere, levelList.get(l).free(), "per-level free");
            }
        }
        B_garage.Spot s = g.new Spot("A1");
        s.park();
        throwsOn(IllegalStateException.class, s::park, "double park");
        s.leave();
        eq(1, s.free(), "left");
    }

    // ---------- Chapter 6: bridge ----------
    static void bridge() {
        B_invoices b = new B_invoices();
        eq("0.05", B_invoices.Renderer.rupees(5), "rupees 5 paise");
        eq("1.00", B_invoices.Renderer.rupees(100), "rupees 100 paise");
        eq("1234.56", B_invoices.Renderer.rupees(123456), "rupees 123456");
        eq("<h1>Consultation</h1><table><tr><td>Dr Rao</td><td>800.00</td></tr></table><p>Total 800.00</p>",
            b.new ConsultationInvoice(b.new HtmlRenderer(), "Rao", 80000).render(), "consultation html");
        eq("<h1>Consultation</h1><table><tr><td>Dr &lt;script&gt; &amp; co</td><td>1.00</td></tr></table><p>Total 1.00</p>",
            b.new ConsultationInvoice(b.new HtmlRenderer(), "<script> & co", 100).render(), "html escaping");
        eq("PHARMACY\nParacetamol 500mg x10: 25.00\nTotal: 25.00\n",
            b.new PharmacyInvoice(b.new EmailTextRenderer(), List.of(new B_invoices.Dispensed("Paracetamol 500mg", 10, 250))).render(), "pharmacy email");
        eq("LAB\nCBC: 300.00\nSample collection: 50.00\nTotal: 350.00\n",
            b.new LabInvoice(b.new EmailTextRenderer(), List.of(new B_invoices.LineItem("CBC", 30000)), 5000).render(), "lab email");
        String room = b.new RoomStayInvoice(b.new EmailTextRenderer(), 3, 300000).render();
        eq("ROOM STAY\n3 nights at 3000.00: 9000.00\nTotal: 9000.00\n", room, "room stay");
        throwsOn(IllegalArgumentException.class, () -> b.new RoomStayInvoice(b.new HtmlRenderer(), 0, 1), "at least one night");

        eq(9, 3 * 3, "3x3 subclasses"); eq(6, 3 + 3, "3+3 bridge"); eq(12, 3 * 4, "fourth format by subclassing"); eq(7, 3 + 4, "fourth format bridged");
        eq(6, 3 * 2, "today: 6 subclasses"); eq(5, 3 + 2, "today: 5 bridge classes");

        // thermal: every line exactly 32 chars, amount right-aligned, label prefix preserved
        B_invoices.ThermalRenderer t = b.new ThermalRenderer();
        for (int i = 0; i < 1000; i++) {
            List<B_invoices.LineItem> items = new ArrayList<>();
            int n = RNG.nextInt(5);
            long total = 0;
            for (int k = 0; k < n; k++) {
                int len = RNG.nextInt(61);
                StringBuilder label = new StringBuilder();
                for (int q = 0; q < len; q++) label.append((char) ('a' + RNG.nextInt(26)));
                long paise = RNG.nextInt(1_000_000_001);
                items.add(new B_invoices.LineItem(label.toString(), paise));
                total += paise;
            }
            String out = b.new LabInvoice(t, items, 5000).render();
            String[] lines = out.split("\n");
            yes(lines[0].length() <= 32, "header fits");
            for (int k = 1; k < lines.length; k++) eq(32, lines[k].length(), "thermal width line " + k);
            List<B_invoices.LineItem> all = new ArrayList<>(items);
            all.add(new B_invoices.LineItem("Sample collection", 5000));
            for (int k = 0; k < all.size(); k++) {
                String line = lines[2 + k], amt = B_invoices.Renderer.rupees(all.get(k).paise());
                yes(line.endsWith(amt), "amount right-aligned");
                String lab = all.get(k).label();
                String shown = line.substring(0, Math.min(lab.length(), 32 - amt.length() - 1));
                yes(lab.startsWith(shown), "label prefix kept");
                yes(line.charAt(31 - amt.length()) == ' ', "space before amount");
            }
            yes(lines[lines.length - 1].startsWith("TOTAL") && lines[lines.length - 1].endsWith(B_invoices.Renderer.rupees(total + 5000)), "thermal total");
        }
    }

    // ---------- Chapter 7: flyweight ----------
    static void flyweight() {
        int lines = 200_000, drugs = 1_200;
        List<B_pharmacyMess.Row> messRows = new ArrayList<>(lines);
        List<B_pharmacy.Row> rows = new ArrayList<>(lines);
        for (int i = 0; i < lines; i++) {
            int d = i % drugs;
            String code = new String("D" + d), name = new String("Drug " + d), strength = new String((d % 7 + 1) * 100 + " mg"), maker = new String("Maker " + d % 13);
            messRows.add(new B_pharmacyMess.Row(code, name, strength, maker, "P-" + i, 1 + i % 30));
            rows.add(new B_pharmacy.Row(code, name, strength, maker, "P-" + i, 1 + i % 30));
        }
        List<B_pharmacyMess.DispenseLine> mess = new B_pharmacyMess().load(messRows);
        Set<Object> messDistinct = Collections.newSetFromMap(new IdentityHashMap<>());
        for (var l : mess) messDistinct.add(l.drug());
        eq(200_000, messDistinct.size(), "mess: 200,000 DrugInfo objects");

        B_pharmacy p = new B_pharmacy();
        B_pharmacy.DrugCatalog catalog = p.new DrugCatalog();
        List<B_pharmacy.DispenseLine> loaded = p.load(rows, catalog);
        Set<Object> distinct = Collections.newSetFromMap(new IdentityHashMap<>());
        for (var l : loaded) distinct.add(l.drug());
        eq(1_200, distinct.size(), "flyweight: 1,200 DrugInfo objects");
        eq(1_200, catalog.size(), "catalog size");
        for (int i = 0; i < lines; i++) {
            if (i >= drugs) yes(loaded.get(i).drug() == loaded.get(i - drugs).drug(), "same code shares identity");
            eq(mess.get(i).drug().name(), loaded.get(i).drug().name(), "same values as the mess");
            eq(mess.get(i).quantity(), loaded.get(i).quantity(), "extrinsic quantity kept per line");
            eq("P-" + i, loaded.get(i).patientId(), "extrinsic patient kept");
            if (i > 2000) i += 37;   // sample the rest
        }
        yes(Integer.valueOf(127) == Integer.valueOf(127), "Integer cache 127 guaranteed");
        yes(Integer.valueOf(-128) == Integer.valueOf(-128), "Integer cache -128 guaranteed");
    }

    static void glyphs() {
        B_glyphs g = new B_glyphs();
        B_glyphs.GlyphFactory f = g.new GlyphFactory();
        Map<String, B_glyphs.SpotGlyph> seen = new HashMap<>();
        B_glyphs.SpotKind[] kinds = B_glyphs.SpotKind.values();
        for (int i = 0; i < 2000; i++) {
            B_glyphs.SpotKind k = kinds[RNG.nextInt(3)];
            boolean occ = RNG.nextBoolean();
            B_glyphs.SpotGlyph glyph = f.glyph(k, occ);
            B_glyphs.SpotGlyph prev = seen.putIfAbsent(k + "/" + occ, glyph);
            if (prev != null) yes(prev == glyph, "shared identity");
            eq(k + (occ ? "#" : ".") + "@" + (i % 40) + "," + (i / 40), glyph.draw(i % 40, i / 40), "draw with extrinsic position");
        }
        yes(f.created() <= 6, "at most 6 glyphs");
        eq(seen.size(), f.created(), "one per (kind, state) seen");
        eq("EV.@3,4", f.glyph(B_glyphs.SpotKind.EV, false).draw(3, 4), "lesson example");
    }

    // ---------- Side quests ----------
    static void sideQuests() {
        B_clinic c = new B_clinic();
        List<String> sent = new ArrayList<>();
        B_clinic.SmsGateway rec = (to, text) -> sent.add(text);
        c.new OptOutFooterGateway(rec).send(PHONE, "Flu shots this week.");
        eq(List.of("Flu shots this week. Reply STOP to opt out."), sent, "footer added");
        sent.clear();
        c.new OptOutFooterGateway(c.new OptOutFooterGateway(rec)).send(PHONE, "Hi.");
        eq(List.of("Hi. Reply STOP to opt out."), sent, "wrapped twice, footer once");
        Flaky flaky = new Flaky(c, 2);
        List<String> texts = new ArrayList<>();
        B_clinic.SmsGateway captureFlaky = (to, text) -> { texts.add(text); flaky.send(to, text); };
        Permits permits = new Permits(10);
        c.marketingSms(captureFlaky, permits, ms -> {}).send(PHONE, "Sale.");
        eq(3, texts.size(), "three attempts");
        for (String t : texts) eq("Sale. Reply STOP to opt out.", t, "footer once per attempt text");
        sent.clear();
        c.otpSms(rec, ms -> {}).send(PHONE, "123456");
        eq(List.of("123456"), sent, "OTP untouched");

        // kit
        B_clinic.ChargeGroup kitContents = c.new ChargeGroup("Post-op kit")
            .add(new B_clinic.Charge("Dressing", B_clinic.Money.rupees(450)))
            .add(new B_clinic.Charge("Antibiotics", B_clinic.Money.rupees(1200)))
            .add(new B_clinic.Charge("Painkillers", B_clinic.Money.rupees(280)));
        eq(B_clinic.Money.rupees(1930), kitContents.total(), "kit contents 1,930");
        B_clinic.DiscountedGroup kit = c.new DiscountedGroup(kitContents, 10);
        eq(B_clinic.Money.rupees(1737), kit.total(), "kit 1,737");
        eq(B_clinic.Money.rupees(10737), c.new ChargeGroup("Admission").add(new B_clinic.Charge("Room", B_clinic.Money.rupees(9000))).add(kit).total(), "bill with kit 10,737");
        eq(B_clinic.Money.rupees(1930), c.new DiscountedGroup(kitContents, 0).total(), "0% off");
        eq(B_clinic.Money.ZERO, c.new DiscountedGroup(kitContents, 100).total(), "100% off");
        throwsOn(IllegalArgumentException.class, () -> c.new DiscountedGroup(kitContents, -1), "negative percent");
        throwsOn(IllegalArgumentException.class, () -> c.new DiscountedGroup(kitContents, 101), "over 100 percent");
        for (int i = 0; i < 1000; i++) {
            B_clinic.ChargeGroup g = c.new ChargeGroup("k");
            long full = 0;
            int n = RNG.nextInt(5);
            for (int k = 0; k < n; k++) { long p = RNG.nextInt(100_000_000); full += p; g.add(new B_clinic.Charge("x", new B_clinic.Money(p))); }
            int pct = RNG.nextInt(101);
            java.math.BigInteger exact = java.math.BigInteger.valueOf(full).multiply(java.math.BigInteger.valueOf(100 - pct));
            // pays full - floor(full*pct/100) == ceil(full*(100-pct)/100)
            long expect = exact.add(java.math.BigInteger.valueOf(99)).divide(java.math.BigInteger.valueOf(100)).longValueExact();
            eq(expect, c.new DiscountedGroup(g, pct).total().paise(), "kit oracle");
        }

        // legacy adapter + auth proxy
        B_clinic.LegacyChartStore store = c.new LegacyChartStore(Map.of(1042, "DX:asthma;RX:salbutamol", 7, ""));
        List<String> audit = new ArrayList<>();
        AtomicReference<B_clinic.User> who = new AtomicReference<>(new B_clinic.User("desk-1", "RECEPTION"));
        B_clinic.PatientRecords recs = c.saltmarshRecords(store, c.new TreatingTeamPolicy(Map.of("dr-rao", Set.of("P-1042", "P-7"))), (a, s, d) -> audit.add(a + "|" + s + "|" + d), who::get);
        throwsOn(B_clinic.AccessDeniedException.class, () -> recs.fullHistory("P-1042"), "receptionist denied");
        eq(0, store.reads, "denied caller never reaches the legacy store");
        who.set(new B_clinic.User("dr-rao", "DOCTOR"));
        eq(new B_clinic.History("P-1042", List.of("DX:asthma", "RX:salbutamol")), recs.fullHistory("P-1042"), "parsed chart");
        eq(new B_clinic.History("P-7", List.of()), recs.fullHistory("P-7"), "empty chart");
        eq(2, store.reads, "two reads");
        eq(List.of("DENIED_HISTORY|desk-1|P-1042", "READ_HISTORY|dr-rao|P-1042", "READ_HISTORY|dr-rao|P-7"), audit, "audit trail");
        B_clinic.LegacyRecordsAdapter raw = c.new LegacyRecordsAdapter(store);
        throwsOn(IllegalArgumentException.class, () -> raw.fullHistory("X-1"), "not a MediCore id");
        throwsOn(NumberFormatException.class, () -> raw.fullHistory("P-12x"), "bad number");
    }
}
