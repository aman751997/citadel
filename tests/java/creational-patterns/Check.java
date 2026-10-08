import java.io.*;
import java.lang.reflect.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;

// Exercises every compiled design in src/lld-lessons/creational-patterns.mdx: the ladder mess misroutes EMI,
// factories and registries return the right types and fail loudly, suppliers give fresh objects, Factory Method
// and supplied reports agree, suites never mix (and the mixed wiring accepts a forgery), builders validate and
// are immutable, prototypes are independent (and clone() is shown shallow), singletons stay single under a
// 64-thread cold start (while the two messes don't), the pool stays bounded under concurrency, and the
// composition roots share one instance and make tests deterministic. Every number quoted in the lesson is here.
public class Check {
    static int checks = 0;

    static void eq(Object expected, Object actual, String what) {
        checks++;
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected <" + expected + "> but got <" + actual + ">");
    }
    static void yes(boolean condition, String what) { eq(true, condition, what); }
    interface Body { void run() throws Exception; }
    static Throwable throwsOn(Class<? extends Throwable> type, Body r, String what) {
        checks++;
        try { r.run(); } catch (Throwable t) {
            if (type.isInstance(t)) return t;
            throw new AssertionError(what + ": threw " + t + " instead of " + type.getSimpleName());
        }
        throw new AssertionError(what + ": did not throw " + type.getSimpleName());
    }

    /** Releases n threads together at task and returns every result (fails on any exception or a 30 s hang). */
    static <T> List<T> together(int n, Callable<T> task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch ready = new CountDownLatch(n), go = new CountDownLatch(1);
        List<Future<T>> futures = new ArrayList<>();
        for (int i = 0; i < n; i++) futures.add(pool.submit(() -> { ready.countDown(); go.await(); return task.call(); }));
        ready.await();
        go.countDown();
        List<T> out = new ArrayList<>();
        for (Future<T> f : futures) out.add(f.get(30, TimeUnit.SECONDS));
        pool.shutdown();
        yes(pool.awaitTermination(10, TimeUnit.SECONDS), "threads finished");
        return out;
    }
    static int distinct(List<?> objects) {
        Set<Object> ids = Collections.newSetFromMap(new IdentityHashMap<>());
        ids.addAll(objects);
        return ids.size();
    }

    public static void main(String[] args) throws Exception {
        ladder();
        billing();
        registry();
        labs();
        reports();
        reminders();
        suites();
        booking();
        prescription();
        invoices();
        discounts();
        singletons();
        messes();
        pool();
        healthyPool();
        clinic();
        System.out.println("OK creational-patterns: " + checks + " checks passed");
    }

    // Chapter 1 mess: EMI silently lands in the wallet branch.
    static void ladder() {
        B_ladderMess m = new B_ladderMess();
        B_ladderMess.CounterDesk desk = m.new CounterDesk();
        eq("wallet-500000", desk.charge(B_ladderMess.PaymentMode.EMI, 500000), "EMI 5,000 rupees goes to the wallet");
        eq("upi-100", desk.charge(B_ladderMess.PaymentMode.UPI, 100), "UPI still right");
        eq("card-100", desk.charge(B_ladderMess.PaymentMode.CARD, 100), "card still right");
    }

    // Chapter 1: simple factory.
    static void billing() {
        B_billing b = new B_billing();
        B_billing.ProcessorFactory f = b.new ProcessorFactory();
        yes(f.forMode(B_billing.PaymentMode.UPI) instanceof B_billing.UpiProcessor, "UPI -> UpiProcessor");
        yes(f.forMode(B_billing.PaymentMode.CARD) instanceof B_billing.CardProcessor, "CARD -> CardProcessor");
        yes(f.forMode(B_billing.PaymentMode.WALLET) instanceof B_billing.WalletProcessor, "WALLET -> WalletProcessor");
        yes(f.forMode(B_billing.PaymentMode.UPI) != f.forMode(B_billing.PaymentMode.UPI), "simple factory: new each call");
        eq(new B_billing.PaymentResult(true, "upi-1000"), b.charge(f, new B_billing.PaymentRequest(B_billing.PaymentMode.UPI, B_billing.Money.rupees(10))), "10 rupees by UPI = upi-1000");
        eq(1000L, B_billing.Money.rupees(10).paise(), "rupees -> paise");
        throwsOn(IllegalArgumentException.class, () -> new B_billing.Money(-1), "negative money rejected");
        throwsOn(ArithmeticException.class, () -> B_billing.Money.rupees(Long.MAX_VALUE / 10), "overflow throws, not wraps");
        for (B_billing.PaymentMode mode : B_billing.PaymentMode.values())
            for (long r = 0; r <= 300; r++) {
                String ref = b.charge(f, new B_billing.PaymentRequest(mode, B_billing.Money.rupees(r))).reference();
                eq(mode.name().toLowerCase() + "-" + (r * 100), ref, "factory routes " + mode + " " + r);
            }
    }

    // Chapter 1: instance registry, supplier registry, Side quest 1.
    static void registry() {
        B_registry b = new B_registry();
        B_registry.ProcessorRegistry reg = b.wiring();
        for (B_registry.PaymentMode mode : B_registry.PaymentMode.values()) {
            B_registry.PaymentProcessor p = reg.forMode(mode);
            eq(mode, p.mode(), "registry key comes from the object: " + mode);
            yes(p == reg.forMode(mode), "instance registry shares one instance: " + mode);
        }
        eq("upi-1000", reg.forMode(B_registry.PaymentMode.UPI).process(new B_registry.PaymentRequest(B_registry.PaymentMode.UPI, B_registry.Money.rupees(10))).reference(), "registry UPI");
        throwsOn(IllegalStateException.class, () -> b.new ProcessorRegistry(List.of(b.new UpiProcessor(), b.new UpiProcessor())), "two UPI processors fail at startup");
        B_registry.ProcessorRegistry partial = b.new ProcessorRegistry(List.of(b.new UpiProcessor()));
        Throwable miss = throwsOn(RuntimeException.class, () -> partial.forMode(B_registry.PaymentMode.CARD), "unwired mode throws");
        eq("UnsupportedModeException", miss.getClass().getSimpleName(), "named miss exception");
        eq("no processor for CARD", miss.getMessage(), "miss names the mode");
        throwsOn(UnsupportedOperationException.class, () -> { Map<?, ?> m = getField(reg, "byMode"); ((Map<Object, Object>) m).clear(); }, "registry map is unmodifiable");

        B_registry.ProcessorSuppliers sup = b.supplierWiring();
        for (B_registry.PaymentMode mode : B_registry.PaymentMode.values()) {
            eq(mode, sup.fresh(mode).mode(), "supplier makes the right type " + mode);
            yes(sup.fresh(mode) != sup.fresh(mode), "supplier: a new object each call " + mode);
        }
        Map<B_registry.PaymentMode, Supplier<B_registry.PaymentProcessor>> typo = new HashMap<>();
        typo.put(B_registry.PaymentMode.UPI, () -> b.new UpiProcessor());
        typo.put(B_registry.PaymentMode.CARD, () -> b.new WalletProcessor());
        Throwable bad = throwsOn(IllegalArgumentException.class, () -> b.new ProcessorSuppliers(typo), "miswired supplier fails at startup");
        eq("CARD is wired to a WALLET processor", bad.getMessage(), "miswiring message");
        B_registry.ProcessorSuppliers partialSup = b.new ProcessorSuppliers(Map.of(B_registry.PaymentMode.UPI, () -> b.new UpiProcessor()));
        throwsOn(RuntimeException.class, () -> partialSup.fresh(B_registry.PaymentMode.WALLET), "supplier miss throws");

        // Side quest 1: retry counter shared vs fresh.
        B_registry.ProcessorSuppliers retry = b.retryingWiring();
        B_registry.PaymentRequest tenCard = new B_registry.PaymentRequest(B_registry.PaymentMode.CARD, B_registry.Money.rupees(10));
        for (int patient = 0; patient < 100; patient++)
            eq("card-1000-attempt-1", retry.fresh(B_registry.PaymentMode.CARD).process(tenCard).reference(), "fresh processor per patient " + patient);
        B_registry.ProcessorRegistry shared = b.new ProcessorRegistry(List.of(b.new RetryingCardProcessor()));
        for (int i = 1; i <= 3; i++)
            eq("card-1000-attempt-" + i, shared.forMode(B_registry.PaymentMode.CARD).process(tenCard).reference(), "shared instance, patient " + i);
        eq(new B_registry.PaymentResult(false, "card-declined-after-3-attempts"), shared.forMode(B_registry.PaymentMode.CARD).process(tenCard), "fourth patient declined by the shared counter");
        B_registry.PaymentProcessor one = retry.fresh(B_registry.PaymentMode.CARD);
        for (int i = 1; i <= 3; i++) yes(one.process(tenCard).ok(), "one payment, attempt " + i);
        yes(!one.process(tenCard).ok(), "one payment stops after 3 attempts");
        eq(B_registry.PaymentMode.UPI, retry.fresh(B_registry.PaymentMode.UPI).mode(), "retry wiring keeps UPI");
    }

    @SuppressWarnings("unchecked")
    static <T> T getField(Object target, String name) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        return (T) f.get(target);
    }

    // Chapter 1 Your turn: lab orders.
    static void labs() {
        B_labs b = new B_labs();
        B_labs.LabOrders orders = b.labOrders();
        yes(orders.newOrder(B_labs.LabTest.BLOOD_PANEL) instanceof B_labs.BloodPanelOrder, "blood panel type");
        yes(orders.newOrder(B_labs.LabTest.XRAY) instanceof B_labs.XrayOrder, "x-ray type");
        yes(orders.newOrder(B_labs.LabTest.MRI) instanceof B_labs.MriOrder, "MRI type");
        B_labs.LabOrder a = orders.newOrder(B_labs.LabTest.MRI), c = orders.newOrder(B_labs.LabTest.MRI);
        yes(a != c, "two MRI orders are two objects");
        a.checklist().remove("metal removed");
        eq(2, a.checklist().size(), "ticked one off patient A");
        eq(3, c.checklist().size(), "patient B still has three items");
        eq(List.of("implant screen", "metal removed", "ear protection"), orders.newOrder(B_labs.LabTest.MRI).checklist(), "fresh MRI checklist");
        throwsOn(IllegalArgumentException.class, () -> b.new LabOrders(Map.of(B_labs.LabTest.MRI, () -> b.new XrayOrder())), "miswired lab form fails at startup");
        B_labs.LabOrders partial = b.new LabOrders(Map.of(B_labs.LabTest.XRAY, () -> b.new XrayOrder()));
        throwsOn(IllegalArgumentException.class, () -> partial.newOrder(B_labs.LabTest.MRI), "unknown test throws");
    }

    // Chapter 2: Factory Method and the supplied alternative.
    static void reports() {
        B_reports b = new B_reports();
        Map<String, Integer> visits = new HashMap<>(Map.of("Dr Rao", 14, "Dr Iyer", 9));
        String csv = b.new CsvUtilisationReport().render(visits);
        eq("doctor,visits\nDr Iyer,9\nDr Rao,14", csv, "CSV report sorted");
        String printer = b.new PrinterUtilisationReport().render(visits);
        eq("DOCTOR      VISITS\nDr Iyer     9\nDr Rao      14", printer, "printer report fixed-width and sorted");
        eq(csv, b.new SuppliedReport(() -> b.new CsvExporter()).render(visits), "supplied CSV = CSV subclass");
        eq(printer, b.new SuppliedReport(() -> b.new PrinterExporter()).render(visits), "supplied printer = printer subclass");
        eq(csv + "\n\n" + printer, b.eveningReports(visits), "evening reports");
        eq("doctor,visits", b.new CsvUtilisationReport().render(Map.of()), "empty report is just the header");
        yes(Modifier.isFinal(method(B_reports.UtilisationReport.class, "render").getModifiers()), "render is final");
        Random rnd = new Random(7);
        for (int t = 0; t < 1000; t++) {
            Map<String, Integer> m = new HashMap<>();
            int n = rnd.nextInt(6);
            for (int i = 0; i < n; i++) m.put("Dr " + (char) ('A' + rnd.nextInt(26)), rnd.nextInt(50));
            List<String> names = new ArrayList<>(m.keySet());
            Collections.sort(names);
            StringBuilder expect = new StringBuilder("doctor,visits");
            for (String d : names) expect.append('\n').append(d).append(',').append(m.get(d));
            eq(expect.toString(), b.new CsvUtilisationReport().render(m), "CSV oracle " + t);
            eq(b.new PrinterUtilisationReport().render(m), b.new SuppliedReport(() -> b.new PrinterExporter()).render(m), "printer oracle " + t);
        }
    }
    static Method method(Class<?> c, String name) {
        for (Method m : c.getDeclaredMethods()) if (m.getName().equals(name)) return m;
        throw new AssertionError("no method " + name);
    }

    // Chapter 2 Your turn.
    static void reminders() {
        B_reminders b = new B_reminders();
        eq(List.of("SMS P-1: Your visit is tomorrow", "SMS P-2: Your visit is tomorrow"), b.new SmsCampaign().run(List.of("P-1", "P-2"), "Your visit is tomorrow"), "SMS campaign");
        eq(List.of("EMAIL P-1: Your visit is tomorrow", "EMAIL P-2: Your visit is tomorrow"), b.new EmailCampaign().run(List.of("P-1", "P-2"), "Your visit is tomorrow"), "email campaign");
        eq(List.of(), b.new SmsCampaign().run(List.of(), "x"), "no patients, nothing sent");
    }

    // Chapter 3: families never mix; the mixed wiring accepts a forgery; Your turn; Side quest 2.
    static void suites() {
        B_suites b = new B_suites();
        B_suites.SandboxConfig sandbox = new B_suites.SandboxConfig("https://sandbox.pennypay.example", "sk_test_public");
        B_suites.LiveConfig live = new B_suites.LiveConfig("pk_live_123", "whsec_live_secret");
        B_suites.GatewaySuite prod = b.suiteFor(true, live, sandbox), test = b.suiteFor(false, live, sandbox);
        yes(prod instanceof B_suites.LiveSuite && test instanceof B_suites.SandboxSuite, "suiteFor picks by environment");
        yes(prod.gateway() instanceof B_suites.PennyPayGateway && prod.refunds() instanceof B_suites.PennyPayRefundClient && prod.verifier() instanceof B_suites.PennyPayVerifier, "live family all live");
        yes(test.gateway() instanceof B_suites.SandboxGateway && test.refunds() instanceof B_suites.SandboxRefundClient && test.verifier() instanceof B_suites.SandboxVerifier, "sandbox family all sandbox");
        String payload = "{\"charge\":\"pennypay:P-1042:50000\",\"status\":\"paid\"}";
        String genuine = B_suites.sign("whsec_live_secret", payload);
        String forged = B_suites.sign("sk_test_public", payload);
        // Thursday's mixed wiring: live gateway + sandbox verifier.
        B_suites.WebhookVerifier mixedVerifier = b.new SandboxVerifier("sk_test_public");
        yes(!mixedVerifier.verify(payload, genuine), "mixed wiring rejects the genuine live webhook");
        yes(mixedVerifier.verify(payload, forged), "mixed wiring accepts the forgery");
        B_suites.BillingService billing = b.new BillingService(prod);
        yes(billing.confirm(payload, genuine), "live suite accepts genuine");
        yes(!billing.confirm(payload, forged), "live suite rejects the forgery");
        eq("pennypay:P-1042:50000", billing.charge("P-1042", 50000), "live charge");
        eq("sandbox:P-1042:50000", b.new BillingService(test).charge("P-1042", 50000), "sandbox charge");
        eq("sandbox-refund:x", test.refunds().refund("x"), "sandbox refund");
        eq("pennypay-refund:x", prod.refunds().refund("x"), "live refund");
        for (Constructor<?> c : B_suites.BillingService.class.getDeclaredConstructors()) {
            Class<?>[] p = c.getParameterTypes();
            eq(B_suites.GatewaySuite.class, p[p.length - 1], "BillingService takes only a suite");
            eq(2, p.length, "outer instance + suite");
        }
        Random rnd = new Random(3);
        for (int i = 0; i < 1000; i++) {
            String body = "p" + rnd.nextInt(100000);
            yes(b.new PennyPayVerifier("s1").verify(body, B_suites.sign("s1", body)), "verifier accepts own secret " + i);
            if (!B_suites.sign("s1", body).equals(B_suites.sign("s2", body)))
                yes(!b.new PennyPayVerifier("s1").verify(body, B_suites.sign("s2", body)), "verifier rejects other secret " + i);
        }

        // Your turn: recording suite.
        B_suites.RecordingSuite rec = b.new RecordingSuite();
        B_suites.BillingService fake = b.new BillingService(rec);
        eq("fake-1", fake.charge("P-1042", 50000), "recording charge reference");
        eq(List.of("charge P-1042 50000"), rec.calls, "recording suite captured the charge");
        yes(fake.confirm("hello", "good") && !fake.confirm("hello", "bad"), "recording verifier");
        eq("fake-refund-r1", rec.refunds().refund("r1"), "recording refund");

        // Side quest 2: staging.
        B_suites.StagingSuite staging = b.new StagingSuite(new B_suites.StagingConfig("https://sandbox.pennypay.example", "whsec_staging"));
        B_suites.BillingService stagingBilling = b.new BillingService(staging);
        eq("sandbox:P-1:100", stagingBilling.charge("P-1", 100), "staging charges through sandbox");
        yes(stagingBilling.confirm(payload, B_suites.sign("whsec_staging", payload)), "staging accepts its own secret");
        yes(!stagingBilling.confirm(payload, forged), "staging rejects the public test secret");
        yes(staging.verifier() instanceof B_suites.PennyPayVerifier, "staging uses the real algorithm");
    }

    // Chapter 4 mess and Builder.
    static void booking() throws Exception {
        LocalDateTime nine = LocalDateTime.of(2026, 3, 16, 9, 0);
        B_bookingMess m = new B_bookingMess();
        B_bookingMess.Booking bad = m.new Booking("P-1042", "D-07", new B_bookingMess.Slot(nine, 15), "R-3", null, true, false, null);
        yes(bad.teleconsult && "R-3".equals(bad.roomId) && !bad.followUp, "mess accepts a teleconsult with a room, not a follow-up");
        B_bookingMess.Booking shortForm = m.new Booking("P-1", "D-1", new B_bookingMess.Slot(nine, 15));
        yes(!shortForm.teleconsult && shortForm.roomId == null, "telescoping defaults");

        B_booking b = new B_booking();
        B_booking.Slot slot = new B_booking.Slot(nine, 15);
        throwsOn(IllegalArgumentException.class, () -> new B_booking.Slot(nine, 0), "zero-minute slot");
        throwsOn(NullPointerException.class, () -> new B_booking.Slot(null, 15), "null start");
        B_booking.Booking tele = b.teleconsultFor(slot);
        yes(tele.teleconsult() && tele.roomId().isEmpty() && tele.patientId().equals("P-1042") && tele.doctorId().equals("D-07") && tele.slot() == slot, "teleconsult booking");
        B_booking.Booking fixed = b.orThursdaysMistakeFixed(slot);
        yes(!fixed.teleconsult() && fixed.roomId().equals(Optional.of("R-3")) && fixed.followUp(), "Oona's booking, correct");
        eq(Optional.empty(), fixed.referral(), "no referral");
        throwsOn(IllegalStateException.class, () -> B_booking.Booking.builder().doctor("D").slot(slot).teleconsult(true).build(), "missing patient");
        throwsOn(IllegalStateException.class, () -> B_booking.Booking.builder().patient("P").slot(slot).teleconsult(true).build(), "missing doctor");
        throwsOn(IllegalStateException.class, () -> B_booking.Booking.builder().patient("P").doctor("D").teleconsult(true).build(), "missing slot");
        throwsOn(IllegalStateException.class, () -> B_booking.Booking.builder().patient("P").doctor("D").slot(slot).teleconsult(true).room("R-3").build(), "teleconsult with room");
        throwsOn(IllegalStateException.class, () -> B_booking.Booking.builder().patient("P").doctor("D").slot(slot).build(), "in-person without room");
        throwsOn(NullPointerException.class, () -> B_booking.Booking.builder().symptom(null), "null symptom fails fast");
        // immutability
        B_booking.Booking.Builder reused = B_booking.Booking.builder().patient("P").doctor("D").slot(slot).room("R-1").symptom("cough");
        B_booking.Booking first = reused.build();
        B_booking.Booking second = reused.symptom("fever").referral("from GP").build();
        eq(List.of("cough"), first.symptoms(), "first booking unchanged by builder reuse");
        eq(List.of("cough", "fever"), second.symptoms(), "second booking");
        eq(Optional.empty(), first.referral(), "first booking has no referral");
        throwsOn(UnsupportedOperationException.class, () -> first.symptoms().add("x"), "symptoms unmodifiable");
        for (Field f : B_booking.Booking.class.getDeclaredFields())
            yes(Modifier.isFinal(f.getModifiers()), "Booking field final: " + f.getName());
        for (Constructor<?> c : B_booking.Booking.class.getDeclaredConstructors())
            yes(Modifier.isPrivate(c.getModifiers()), "Booking constructor private");
        // exhaustive oracle over every combination of the optional fields
        for (int mask = 0; mask < 64; mask++) {
            boolean hasP = (mask & 1) != 0, hasD = (mask & 2) != 0, hasS = (mask & 4) != 0, tc = (mask & 8) != 0, room = (mask & 16) != 0, fu = (mask & 32) != 0;
            B_booking.Booking.Builder bb = B_booking.Booking.builder();
            if (hasP) bb.patient("P"); if (hasD) bb.doctor("D"); if (hasS) bb.slot(slot);
            bb.teleconsult(tc).followUp(fu);
            if (room) bb.room("R");
            boolean valid = hasP && hasD && hasS && (tc != room);
            boolean built;
            try { bb.build(); built = true; } catch (IllegalStateException e) { built = false; }
            eq(valid, built, "builder oracle mask " + mask);
        }
    }

    // Chapter 4 Your turn.
    static void prescription() {
        B_prescription.Prescription p = B_prescription.Prescription.builder("P-1042", "D-07").medicine("Amoxicillin", "500 mg").refills(2).build();
        eq(2, p.refills(), "refills");
        eq(List.of(new B_prescription.Medicine("Amoxicillin", "500 mg", false)), p.medicines(), "medicines");
        eq("", p.notes(), "default notes");
        eq("P-1042", p.patientId(), "patient");
        eq("D-07", p.doctorId(), "doctor");
        throwsOn(UnsupportedOperationException.class, () -> p.medicines().add(new B_prescription.Medicine("x", "y", false)), "medicines unmodifiable");
        throwsOn(IllegalArgumentException.class, () -> B_prescription.Prescription.builder("P", "D").refills(6), "refills 6 fails fast");
        throwsOn(IllegalArgumentException.class, () -> B_prescription.Prescription.builder("P", "D").refills(-1), "refills -1 fails fast");
        throwsOn(IllegalStateException.class, () -> B_prescription.Prescription.builder("P", "D").build(), "no medicines");
        throwsOn(IllegalStateException.class, () -> B_prescription.Prescription.builder("P", "D").medicine("A", "1").controlled("Zolpidem", "5 mg").refills(2).build(), "controlled with refills");
        eq(0, B_prescription.Prescription.builder("P", "D").controlled("Zolpidem", "5 mg").build().refills(), "controlled with 0 refills ok");
        throwsOn(NullPointerException.class, () -> B_prescription.Prescription.builder(null, "D"), "null patient");
        throwsOn(NullPointerException.class, () -> B_prescription.Prescription.builder("P", null), "null doctor");
        B_prescription.Prescription.Builder reuse = B_prescription.Prescription.builder("P", "D").medicine("A", "1");
        B_prescription.Prescription one = reuse.build();
        reuse.medicine("B", "2").build();
        eq(1, one.medicines().size(), "builder reuse does not leak into built prescription");
        for (int r = 0; r <= 5; r++) eq(r, B_prescription.Prescription.builder("P", "D").medicine("A", "1").refills(r).build().refills(), "refills " + r);
    }

    // Chapter 5: clone mess, copy constructor, catalog.
    static void invoices() {
        B_cloneMess cm = new B_cloneMess();
        B_cloneMess.InvoiceTemplate riverside = cm.new InvoiceTemplate();
        riverside.header = "Riverside";
        riverside.items.add(new B_cloneMess.LineItem("REG", "Registration", 20000));
        B_cloneMess.InvoiceTemplate copy = riverside.clone();
        copy.items.add(new B_cloneMess.LineItem("XR-01", "Chest X-ray", 85000));
        eq(2, riverside.items.size(), "clone() is shallow: the template grew an X-ray");
        yes(copy.items == riverside.items, "clone shares the list");

        B_invoices b = new B_invoices();
        B_invoices.InvoiceTemplate template = b.new InvoiceTemplate("Riverside", List.of(new B_invoices.LineItem("REG", "Registration", 20000)), Map.of("GSTIN", "29ABCDE"));
        B_invoices.InvoiceTemplate invoice = b.patientInvoice(template);
        eq(105000L, invoice.totalPaise(), "patient invoice total");
        eq(20000L, template.totalPaise(), "template total unchanged");
        eq(1, template.items().size(), "template still one line");
        invoice.setTaxField("GSTIN", "CHANGED");
        invoice.setTaxField("place", "KA");
        eq(Map.of("GSTIN", "29ABCDE"), template.taxFields(), "template tax fields unchanged");
        eq("Riverside", invoice.header(), "header shared");
        throwsOn(UnsupportedOperationException.class, () -> template.items().add(null), "items view unmodifiable");
        // random independence: any edits to a copy never reach the original, and vice versa
        Random rnd = new Random(11);
        for (int t = 0; t < 1000; t++) {
            B_invoices.InvoiceTemplate orig = b.new InvoiceTemplate("H", List.of(), Map.of());
            int n = rnd.nextInt(4);
            for (int i = 0; i < n; i++) orig.addItem(new B_invoices.LineItem("C" + i, "d", rnd.nextInt(1000)));
            long before = orig.totalPaise();
            int itemsBefore = orig.items().size();
            B_invoices.InvoiceTemplate c = b.new InvoiceTemplate(orig);
            eq(before, c.totalPaise(), "copy equal at birth " + t);
            c.addItem(new B_invoices.LineItem("X", "x", 1 + rnd.nextInt(1000)));
            c.setTaxField("k" + t, "v");
            orig.addItem(new B_invoices.LineItem("Y", "y", 0));
            eq(before, orig.totalPaise(), "original total independent " + t);
            eq(itemsBefore + 1, orig.items().size(), "original sees only its own add " + t);
            eq(itemsBefore + 1, c.items().size(), "copy sees only its own add " + t);
            yes(orig.taxFields().isEmpty(), "original tax map independent " + t);
        }
        // Your turn: catalog.
        B_invoices.TemplateCatalog catalog = b.new TemplateCatalog();
        B_invoices.InvoiceTemplate mine = b.new InvoiceTemplate("Outpatient", List.of(new B_invoices.LineItem("REG", "Registration", 20000)), Map.of());
        catalog.register("outpatient", mine);
        mine.addItem(new B_invoices.LineItem("ODD", "edited after register", 1));
        B_invoices.InvoiceTemplate a = catalog.newInvoice("outpatient"), c2 = catalog.newInvoice("outpatient");
        yes(a != c2, "two copies");
        eq(20000L, a.totalPaise(), "catalog unaffected by edits to the registered object");
        a.addItem(new B_invoices.LineItem("XR", "x", 85000));
        eq(20000L, c2.totalPaise(), "copies independent");
        eq(20000L, catalog.newInvoice("outpatient").totalPaise(), "exemplar intact");
        throwsOn(IllegalArgumentException.class, () -> catalog.newInvoice("dental"), "unknown template");
    }

    // Side quest 3.
    static void discounts() {
        B_discounts b = new B_discounts();
        B_discounts.InvoiceTemplate template = b.new InvoiceTemplate("Riverside", List.of(b.new LineItem("REG", 20000), b.new LineItem("XR-01", 85000)));
        eq(105000L, template.totalPaise(), "template total");
        B_discounts.InvoiceTemplate invoice = b.new InvoiceTemplate(template);
        invoice.item(1).discount(10);
        eq(96500L, invoice.totalPaise(), "10% off the X-ray = 96,500");
        eq(105000L, template.totalPaise(), "template still 105,000");
        eq(0, template.item(1).discountPercent(), "template line undiscounted");
        throwsOn(IllegalArgumentException.class, () -> invoice.item(0).discount(101), "discount > 100");
        throwsOn(IllegalArgumentException.class, () -> invoice.item(0).discount(-1), "discount < 0");
        // The bug: copying only the list shares the mutable elements.
        List<B_discounts.LineItem> lines = new ArrayList<>(List.of(b.new LineItem("XR-01", 85000)));
        List<B_discounts.LineItem> listOnly = new ArrayList<>(lines);
        listOnly.get(0).discount(10);
        eq(10, lines.get(0).discountPercent(), "list-only copy: discount bleeds into the original line");
        // copy of a discounted line carries the discount
        B_discounts.LineItem d = b.new LineItem("A", 1000);
        d.discount(25);
        eq(750L, b.new LineItem(d).netPaise(), "element copy keeps discount");
    }

    // Chapter 6: singletons under a 64-thread cold start.
    static void singletons() throws Exception {
        eq(0, B_singletons.Config.created.get(), "holder is lazy: Config initialized, Holder not yet");
        List<B_singletons.Config> configs = together(64, B_singletons.Config::get);
        eq(1, distinct(configs), "holder: one Config across 64 threads");
        eq(1, B_singletons.Config.created.get(), "holder: constructed once");
        eq("20", B_singletons.Config.get().value("pool.size"), "config value");

        List<B_singletons.ClinicDbPool> pools = together(64, B_singletons.ClinicDbPool::get);
        eq(1, distinct(pools), "DCL: one pool across 64 threads");
        eq(1, B_singletons.ClinicDbPool.opened.get(), "DCL: opened once");
        eq(20, B_singletons.ClinicDbPool.get().connections(), "20 connections");
        yes(Modifier.isVolatile(B_singletons.ClinicDbPool.class.getDeclaredField("instance").getModifiers()), "instance is volatile");
        for (Constructor<?> c : B_singletons.ClinicDbPool.class.getDeclaredConstructors()) yes(Modifier.isPrivate(c.getModifiers()), "DCL constructor private");

        List<B_singletons.MetricsRegistry> regs = together(64, () -> { for (int i = 0; i < 1000; i++) B_singletons.MetricsRegistry.INSTANCE.record("concurrent", 1); return B_singletons.MetricsRegistry.INSTANCE; });
        eq(1, distinct(regs), "enum: one instance");
        eq(64000L, B_singletons.MetricsRegistry.INSTANCE.total("concurrent"), "no lost updates");
        eq(0L, B_singletons.MetricsRegistry.INSTANCE.total("never"), "unknown key is 0");

        // enum resists reflection and serialization
        Constructor<?> ec = B_singletons.MetricsRegistry.class.getDeclaredConstructors()[0];
        ec.setAccessible(true);
        Throwable refl = throwsOn(IllegalArgumentException.class, () -> ec.newInstance("INSTANCE2", 1), "enum refuses reflective construction");
        yes(String.valueOf(refl.getMessage()).contains("enum"), "message names enums");
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) { out.writeObject(B_singletons.MetricsRegistry.INSTANCE); }
        Object back;
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) { back = in.readObject(); }
        yes(back == B_singletons.MetricsRegistry.INSTANCE, "enum deserializes to the same constant");
        // a class-based singleton falls to reflection
        Constructor<B_singletons.Config> cc = B_singletons.Config.class.getDeclaredConstructor();
        cc.setAccessible(true);
        B_singletons.Config second = cc.newInstance();
        yes(second != B_singletons.Config.get(), "reflection makes a second Config");
        eq(2, B_singletons.Config.created.get(), "two Configs now exist");

        // hidden dependency: test bleed
        B_singletons s = new B_singletons();
        long base = B_singletons.MetricsRegistry.INSTANCE.total("bookings");
        eq(0L, base, "no bookings yet");
        s.new BookingDesk().book("P-1");
        eq(1L, B_singletons.MetricsRegistry.INSTANCE.total("bookings"), "test A sees 1");
        eq("booked P-2", s.new BookingDesk().book("P-2"), "booking text");
        eq(2L, B_singletons.MetricsRegistry.INSTANCE.total("bookings"), "test B sees 2: global state bled");

        // Your turn: injected metrics
        for (int test = 0; test < 2; test++) {
            Map<String, Long> seen = new HashMap<>();
            B_singletons.InjectedBookingDesk desk = s.new InjectedBookingDesk((k, v) -> seen.merge(k, v, Long::sum));
            eq("booked P-1", desk.book("P-1"), "injected desk books");
            eq(Map.of("bookings", 1L), seen, "fresh fake per test sees exactly 1 (test " + test + ")");
        }
        s.productionDesk().book("P-3");
        eq(3L, B_singletons.MetricsRegistry.INSTANCE.total("bookings"), "production desk records into the singleton");
    }

    // Chapter 6 messes: more than one pool under contention.
    static void messes() throws Exception {
        yes(raceOpensMany(B_lazyMess.LazyPool.class, B_lazyMess.LazyPool::get, B_lazyMess.LazyPool.opened), "lazy check-then-act opens more than one pool");
        B_lazyMess.LazyPool extra = new B_lazyMess.LazyPool();
        yes(extra != B_lazyMess.LazyPool.get(), "non-private constructor: anyone can open another");
        yes(raceOpensMany(B_noRecheckMess.ClinicDbPool.class, B_noRecheckMess.ClinicDbPool::get, B_noRecheckMess.ClinicDbPool.opened), "no re-check opens more than one pool");
    }
    static boolean raceOpensMany(Class<?> cls, Callable<?> get, AtomicInteger opened) throws Exception {
        Field f = cls.getDeclaredField("instance");
        f.setAccessible(true);
        for (int attempt = 0; attempt < 10; attempt++) {
            f.set(null, null);
            opened.set(0);
            together(64, get);
            if (opened.get() > 1) return true;
        }
        return false;
    }

    // Chapter 7: bounded pool, lease; concurrency.
    static void pool() throws Exception {
        B_pool b = new B_pool();
        AtomicInteger ids = new AtomicInteger();
        B_pool.BoundedPool<B_pool.DbConnection> pool = b.new BoundedPool<>(3, () -> b.new DbConnection(ids.incrementAndGet()));
        eq(3, ids.get(), "eager: 3 connections opened at startup");
        eq(3, pool.idleCount(), "all idle");
        throwsOn(IllegalArgumentException.class, () -> b.new BoundedPool<B_pool.DbConnection>(0, () -> null), "size 0 rejected");

        // exhaustion + timeout
        List<B_pool.DbConnection> held = new ArrayList<>();
        for (int i = 0; i < 3; i++) held.add(pool.borrow(Duration.ofMillis(50)));
        eq(3, distinct(held), "three distinct connections");
        long t0 = System.nanoTime();
        Throwable ex = throwsOn(RuntimeException.class, () -> pool.borrow(Duration.ofMillis(50)), "fourth borrow times out");
        eq("PoolExhaustedException", ex.getClass().getSimpleName(), "named exhaustion");
        yes(System.nanoTime() - t0 >= 40_000_000L, "it actually waited");
        // blocked borrower wakes on return
        ExecutorService ex1 = Executors.newSingleThreadExecutor();
        Future<B_pool.DbConnection> waiter = ex1.submit(() -> pool.borrow(Duration.ofSeconds(2)));
        Thread.sleep(100);
        yes(!waiter.isDone(), "borrower is blocked");
        pool.giveBack(held.get(0));
        yes(waiter.get(2, TimeUnit.SECONDS) == held.get(0), "blocked borrower gets the returned connection");
        ex1.shutdown();
        pool.giveBack(held.get(0));
        throwsOn(IllegalArgumentException.class, () -> pool.giveBack(held.get(0)), "double return rejected");
        throwsOn(IllegalArgumentException.class, () -> pool.giveBack(b.new DbConnection(99)), "foreign object rejected");
        pool.giveBack(held.get(1));
        pool.giveBack(held.get(2));
        eq(3, pool.idleCount(), "all back");

        // leak demo: three borrows without return starve the fourth
        B_pool.BoundedPool<B_pool.DbConnection> leaky = b.new BoundedPool<>(3, () -> b.new DbConnection(0));
        for (int i = 0; i < 3; i++) {
            try { leaky.borrow(Duration.ofMillis(10)).query("x"); throw new RuntimeException("query failed halfway"); }
            catch (RuntimeException ignored) { }
        }
        throwsOn(RuntimeException.class, () -> leaky.borrow(Duration.ofMillis(30)), "leaked pool hangs/times out");

        // concurrency: 24 threads x 200 loans on a pool of 3, via Lease
        AtomicInteger inUse = new AtomicInteger(), maxInUse = new AtomicInteger(), loans = new AtomicInteger();
        Map<B_pool.DbConnection, AtomicBoolean> busy = new ConcurrentHashMap<>();
        AtomicBoolean doubleLent = new AtomicBoolean();
        together(24, () -> {
            for (int i = 0; i < 200; i++) {
                try (B_pool.Lease<B_pool.DbConnection> lease = b.new Lease<>(pool, Duration.ofSeconds(10))) {
                    B_pool.DbConnection c = lease.get();
                    if (!busy.computeIfAbsent(c, k -> new AtomicBoolean()).compareAndSet(false, true)) doubleLent.set(true);
                    int now = inUse.incrementAndGet();
                    maxInUse.accumulateAndGet(now, Math::max);
                    if (i % 50 == 0) Thread.yield();
                    inUse.decrementAndGet();
                    busy.get(c).set(false);
                    loans.incrementAndGet();
                }
            }
            return null;
        });
        eq(4800, loans.get(), "4,800 loans");
        yes(maxInUse.get() <= 3, "never more than 3 in use (max " + maxInUse.get() + ")");
        yes(!doubleLent.get(), "no connection lent twice at once");
        eq(3, pool.idleCount(), "all 3 idle at the end");
        eq(3, busy.size(), "only the 3 pooled connections were ever lent");

        // Lease: exceptions inside try still return; double close harmless; get after close throws
        for (int i = 0; i < 100; i++) {
            try (B_pool.Lease<B_pool.DbConnection> lease = b.new Lease<>(pool, Duration.ofMillis(100))) {
                lease.get().query("x");
                throw new IllegalStateException("boom " + i);
            } catch (IllegalStateException expected) { }
        }
        eq(3, pool.idleCount(), "100 exceptions, no leak");
        B_pool.Lease<B_pool.DbConnection> lease = b.new Lease<>(pool, Duration.ofMillis(100));
        eq(2, pool.idleCount(), "lease holds one");
        lease.close();
        lease.close();
        eq(3, pool.idleCount(), "double close returns once");
        throwsOn(IllegalStateException.class, lease::get, "get after close");
        String rows = b.labResults(pool, "P-1042");
        yes(rows.startsWith("conn-") && rows.endsWith("SELECT * FROM lab_results WHERE patient = 'P-1042'"), "labResults query");
        eq(3, pool.idleCount(), "labResults returned its connection");
    }

    // Side quest 4: validating pool.
    static void healthyPool() throws Exception {
        B_healthyPool b = new B_healthyPool();
        class Conn { final int id; volatile boolean dead; Conn(int id) { this.id = id; } }
        AtomicInteger ids = new AtomicInteger();
        AtomicBoolean dbDown = new AtomicBoolean();
        Supplier<Conn> factory = () -> { if (dbDown.get()) throw new IllegalStateException("database down"); return new Conn(ids.incrementAndGet()); };
        B_healthyPool.ValidatingPool<Conn> pool = b.new ValidatingPool<>(3, factory, c -> !c.dead);
        List<Conn> all = new ArrayList<>();
        for (int i = 0; i < 3; i++) all.add(pool.borrow(Duration.ofMillis(50)));
        for (Conn c : all) pool.giveBack(c);
        all.get(0).dead = true;
        all.get(1).dead = true;
        List<Conn> after = new ArrayList<>();
        for (int i = 0; i < 3; i++) after.add(pool.borrow(Duration.ofMillis(50)));
        eq(2, pool.replaced.get(), "two dead connections replaced");
        yes(after.stream().noneMatch(c -> c.dead), "only healthy connections lent");
        eq(5, ids.get(), "3 originals + 2 replacements");
        throwsOn(RuntimeException.class, () -> pool.borrow(Duration.ofMillis(20)), "still bounded at 3");
        for (Conn c : after) pool.giveBack(c);
        eq(3, pool.idleCount(), "pool holds exactly 3");
        // database still down: borrow fails, slot kept
        for (Conn c : after) c.dead = true;
        dbDown.set(true);
        for (int i = 0; i < 5; i++) throwsOn(IllegalStateException.class, () -> pool.borrow(Duration.ofMillis(20)), "reconnect fails " + i);
        eq(3, pool.idleCount(), "no slot lost while the database is down");
        dbDown.set(false);
        List<Conn> recovered = new ArrayList<>();
        for (int i = 0; i < 3; i++) recovered.add(pool.borrow(Duration.ofMillis(50)));
        yes(recovered.stream().noneMatch(c -> c.dead), "recovered after the database returns");
        for (Conn c : recovered) pool.giveBack(c);
        throwsOn(IllegalArgumentException.class, () -> pool.giveBack(recovered.get(0)), "double return rejected");
        throwsOn(IllegalArgumentException.class, () -> b.new ValidatingPool<Conn>(0, factory, c -> true), "size 0 rejected");
        // concurrency with random breakage
        AtomicInteger inUse = new AtomicInteger(), max = new AtomicInteger(), loans = new AtomicInteger();
        together(16, () -> {
            Random rnd = new Random();
            for (int i = 0; i < 200; i++) {
                Conn c = pool.borrow(Duration.ofSeconds(10));
                yes(!c.dead, "lent healthy");
                max.accumulateAndGet(inUse.incrementAndGet(), Math::max);
                if (rnd.nextInt(10) == 0) c.dead = true;
                inUse.decrementAndGet();
                pool.giveBack(c);
                loans.incrementAndGet();
            }
            return null;
        });
        eq(3200, loans.get(), "3,200 loans");
        yes(max.get() <= 3, "bounded under breakage");
        eq(3, pool.idleCount(), "all back after breakage run");
    }

    // Chapter 8: composition roots.
    static void clinic() {
        B_clinic b = new B_clinic();
        B_clinic.MediCoreApp app = b.production();
        app.appointments().book("P-1", "D-1");
        app.discharges().discharge("P-1");
        List<String> statements = ((B_clinic.RecordingDatabase) app.db()).statements;
        eq(2, statements.size(), "both services wrote to the ONE database");
        yes(statements.get(0).startsWith("INSERT appointment P-1 D-1 ") && statements.get(1).equals("UPDATE admission SET discharged P-1"), "statements");
        yes(b.production().db() != app.db(), "each root call builds its own graph");
        List<String> told = new ArrayList<>();
        B_clinic.MediCoreApp test = b.testApp(told);
        eq("P-1042@2026-03-16T09:30", test.appointments().book("P-1042", "D-07"), "deterministic booking");
        eq(List.of("P-1042: Booked with D-07 at 2026-03-16T09:30"), told, "patient told exactly once");
        eq(List.of("INSERT appointment P-1042 D-07 2026-03-16T09:30"), ((B_clinic.RecordingDatabase) test.db()).statements, "test db");
        yes(LocalDate.of(2026, 3, 16).getDayOfWeek() == DayOfWeek.MONDAY, "16 March 2026 is a Monday");
        B_clinic.Database db = sql -> { };
        throwsOn(NullPointerException.class, () -> b.new AppointmentService(null, (p, t) -> { }, Clock.systemUTC()), "null db rejected");
        throwsOn(NullPointerException.class, () -> b.new AppointmentService(db, null, Clock.systemUTC()), "null notifier rejected");
        throwsOn(NullPointerException.class, () -> b.new AppointmentService(db, (p, t) -> { }, null), "null clock rejected");
        throwsOn(NullPointerException.class, () -> b.new DischargeService(null), "null db rejected in discharge");
    }
}
