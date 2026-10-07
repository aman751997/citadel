import { row, step } from '../../lib/trace.ts';

// Decision puzzles and "Your turn" hints for src/lld-lessons/structural-patterns.mdx.
// Every number quoted here is asserted in tests/java/structural-patterns/Check.java.

export const hints: Record<string, [string, string, string]> = {
  payloom: [
    'Which class in MediCore is allowed to know that PayLoom counts money in an int, wants "INR", and answers with HTTP-style status codes?',
    'PayLoomAdapter implements the domain’s PaymentProcessor and holds the PayLoomSdk. Nothing else changes.',
    'Translate both ways. Out: paise (a long) to PayLoom’s int minor units with Math.toIntExact, never a cast; zero due never reaches PayLoom. Back: status 201 with the full amount captured means approved; anything else is a decline.',
  ],
  logging: [
    'Logging is one more behaviour around the same interface. Where it sits in the stack decides what one log line means.',
    'LoggingGateway implements SmsGateway, holds an inner SmsGateway and a log. Two wiring methods: logging outside the retry, and logging inside it.',
    'Log "send", call inner, log "sent" — or catch, log "failed" with the exception’s class name (its message contains the full phone number), and rethrow. Mask the number’s last four digits.',
  ],
  cache: [
    'A remote insurer call that answers the same thing for minutes at a time. What can stand in front of it without the caller knowing?',
    'CachingEligibility implements EligibilityService and holds the real one, a map of entries with the time they were stored, a TTL and an injected clock.',
    'On a call: if an entry exists and is younger than the TTL, count a hit and return it. Otherwise count a miss, call the real service, store the answer with the current time. If the real call throws, nothing is stored.',
  ],
  guarded: [
    'Two weird inputs: the card is declined, and the SMS vendor is down. For each one, which steps must still happen, and which must not?',
    'A DischargeBlockedException, and a facade with the same five collaborators. The sequence stays in one place; only the failure policy is new.',
    'After payment: if not approved, audit DISCHARGE_BLOCKED and throw before the pharmacy is called. Around the SMS: catch, audit DISCHARGE_SMS_FAILED, and still return the summary.',
  ],
  garage: [
    'A level holds zones, a zone holds spots. Which question should a level and a single spot both be able to answer?',
    'An interface ParkingArea with capacity() and free(); Spot is the leaf; Section is the container for levels, zones and rows alike.',
    'A spot answers 1 and (occupied ? 0 : 1). A section sums its parts. The display board asks each level the same two questions it would ask a spot.',
  ],
  room: [
    'Which side of the bridge does a new kind of invoice belong to: what is billed, or how it is drawn?',
    'RoomStayInvoice extends Invoice. No renderer changes.',
    'title() returns "Room stay"; items() returns one line, nights × nightly rate. It renders through every existing renderer at once.',
  ],
  glyphs: [
    'Two thousand spots on the board, but how many different-looking spots are there?',
    'SpotGlyph holds only kind and occupied; a GlyphFactory hands out one shared glyph per (kind, occupied) pair; the position is passed in when drawing.',
    'computeIfAbsent on a small key record. draw(x, y) takes the extrinsic state as arguments, so the glyph never stores where it is.',
  ],
  footer: [
    'The footer applies to whatever gateway the campaign uses today, and to none of the others.',
    'OptOutFooterGateway implements SmsGateway and wraps the campaign stack. OTP and in-app wiring are untouched.',
    'Append the footer unless the text already ends with it, so wrapping twice adds it once. Then call inner.',
  ],
  kit: [
    'A kit is priced from its contents. Is that a new kind of node, or an edit to ChargeGroup?',
    'DiscountedGroup implements BillNode and holds a ChargeGroup and a percentage. No existing node class is opened.',
    'total() asks the contents for their total and subtracts percentOff of it, rounding the discount down to whole paise.',
  ],
  thermal: [
    'A new printer is a new way to draw. Which side of the bridge grows?',
    'ThermalRenderer implements Renderer. No invoice class changes.',
    'Every line is exactly 32 characters: the label, cut if needed to leave at least one space, then spaces, then the amount right-aligned.',
  ],
  legacy: [
    'The acquired chain’s store speaks medical record numbers and one long string. MediCore speaks patient ids and a History. What sits between?',
    'LegacyRecordsAdapter implements PatientRecords and holds the LegacyChartStore. The existing RecordsAuthProxy wraps it.',
    'The adapter turns "P-1042" into 1042 and splits the chart on semicolons. The proxy goes outside, so a denied caller never reaches the legacy store at all.',
  ],
};

export const adapter = [
  step('Why does the SmsGateway interface belong to MediCore’s domain and not to the TextWave layer?', [], 1, [
    ['Naming convention — ports are always domain-side', 'Conventions follow from a reason. The reason is which side is allowed to change without the other noticing.'],
    ['Dependency direction: the stable domain must not change when vendors do, so the volatile side conforms to the stable side (DIP) — a vendor swap is a new adapter, not a domain edit', 'Right. Consumer-owned ports are the whole game: arrows point from volatile to stable. If TextWave defined the interface, every vendor quirk would ripple into your domain — the adapter would be decoration, not protection.'],
    ['Because Spring requires interfaces in the service package', 'Spring has no such rule, and the design would be the same without any framework.'],
    ['It does not matter as long as an interface exists', 'An interface shaped by TextWave (char[] bodies, sender codes, reason codes) only renames the coupling. The next vendor would still edit the domain.'],
  ]),
  step('TextWave wants the number as bare digits, "919812345678". MediCore’s PhoneNumber holds "+919812345678". Where should the plus sign be stripped?', [
    row('E.164', ['+', '9', '1', '9', '8', '1', '2', '3', '4', '5', '6', '7', '8'], { 0: 'drop' }, { tones: { 0: 'out' } }),
  ], 2, [
    ['In ReminderService, before it calls send()', 'Then every domain caller learns TextWave’s format, and the next vendor (who wants the plus) breaks all of them.'],
    ['In a PhoneNumber.textWaveFormat() method', 'A domain value with a method named after one vendor gets edited for the next vendor. The quirk belongs at the edge.'],
    ['In TextWaveAdapter, and only there', 'Right. The adapter is the one class that speaks both languages. A vendor swap replaces it; the domain never sees the difference.'],
    ['Nowhere — TextWave should accept E.164', 'It should, perhaps. It doesn’t, and you can’t edit its SDK. That is why adapters exist.'],
  ]),
  step('PayLoom’s capture() takes the amount as an int number of paise. A corporate account settles ₹2.5 crore: 2,500,000,000 paise. What does a plain (int) cast send to PayLoom?', [
    row('Limits', ['2,500,000,000', '2,147,483,647'], { 0: 'amount', 1: 'int max' }),
  ], 1, [
    ['2,500,000,000 — Java widens it', 'An int cannot hold it: the largest int is 2,147,483,647. Something has to give.'],
    ['−1,794,967,296 — the cast silently wraps', 'Right. 2,500,000,000 − 4,294,967,296. No exception, a negative charge request. Math.toIntExact throws instead, and the adapter turns that into a clean decline.'],
    ['2,147,483,647 — it clamps to the maximum', 'Java casts never clamp. Narrowing a long keeps the low 32 bits.'],
    ['An ArithmeticException', 'That is what Math.toIntExact does. A plain cast throws nothing, which is exactly why it is dangerous in an adapter.'],
  ]),
];

export const decorator = [
  step('The campaign gateway is RetryingGateway(RateLimitedGateway(vendor)). A send fails twice and succeeds on the third try. How many permits did it consume — and how do you make it one?', [
    row('Attempts', ['fail', 'fail', 'ok'], {}, { tones: { 0: 'out', 1: 'out', 2: 'done' } }),
  ], 1, [
    ['One — retries bypass inner decorators', 'A retry re-runs everything inside it, and the limiter is inside it.'],
    ['Three — each attempt re-enters the limiter; to spend one permit per logical send, nest the limiter OUTSIDE the retry', 'Right. Every retry traverses everything inside the retry decorator. Decorator order is semantics, not style — and the fix is re-wiring the composition, not writing code.'],
    ['Three — and changing it requires a new class', 'Three is right, but the fix is one line of wiring: RateLimitedGateway(RetryingGateway(vendor)). No class changes.'],
    ['Zero — rate limiting only counts failures', 'The limiter takes a permit before every call it lets through, success or failure.'],
  ]),
  step('Same flaky send (fails twice, then succeeds). LoggingGateway writes one line before each call it wraps and one line after. With LoggingGateway(RetryingGateway(vendor)), how many lines are logged? With RetryingGateway(LoggingGateway(vendor))?', [], 2, [
    ['2 and 2', 'The inner position sees every attempt, not just the logical send.'],
    ['6 and 2', 'Backwards. The outer logger sees one call that eventually succeeds.'],
    ['2 and 6', 'Right. Outside the retry: “send”, “sent” — one story per logical send. Inside: send/failed, send/failed, send/sent — one story per vendor call. Choose by what the log is for.'],
    ['6 and 6', 'The outer logger is called once; the retries happen below it.'],
  ]),
  step('Two vendors and three optional behaviours (logging, retry, rate limit). Ignoring order, how many classes does subclassing need to offer every combination — and how many with decorators?', [], 0, [
    ['16 by subclassing (2 × 2³), 5 with decorators (2 adapters + 3 wrappers)', 'Right. Every subset of behaviours is its own subclass per vendor. Decorators grow additively: a fourth behaviour is one class, not sixteen more.'],
    ['6 by subclassing, 5 with decorators', 'Six would only cover one behaviour at a time. Combinations multiply: each behaviour is in or out.'],
    ['8 by subclassing, 3 with decorators', 'Eight is the count for one vendor. And the two adapters are classes too.'],
    ['16 either way', 'Decorators are combined at wiring time, so the combinations cost lines in main(), not classes.'],
  ]),
  step('Someone proposes a CachingGateway decorator around SmsGateway.send to “save vendor calls”. Good idea?', [], 2, [
    ['Yes — caching is a classic decorator', 'Caching is a classic wrapper around queries. send() is not a query.'],
    ['Yes, with a short TTL', 'Any TTL means some reminders are silently never sent.'],
    ['No — send() is a command with a side effect; caching it swallows real messages', 'Right. Cache what returns data and has no side effects (an eligibility lookup). A second reminder to the same number is a second message, not a repeat read.'],
  ]),
];

export const proxy = [
  step('RecordsAuthProxy and RetryingGateway have byte-identical structure: implement the interface, hold the inner, wrap the call. What makes one a proxy and the other a decorator?', [], 1, [
    ['Proxies must be generated at runtime', 'RecordsAuthProxy is hand-written and still a proxy. Generation is one way to build proxies, not the definition.'],
    ['Intent: the decorator adds a feature the caller wants (retry); the proxy controls access the caller gets no say in (auth, lazy-load, cache). Structure is identical — the classification is about WHY', 'Right. GoF patterns are named by intent, not shape. Interviewers probe this pair because the UML is the same — “structure identical, intent differs: add vs control” is the full-marks answer.'],
    ['Proxies may not add logging', 'Audit logging is part of this very proxy. Nothing forbids it.'],
    ['Decorators cannot throw exceptions', 'RetryingGateway rethrows on its last attempt. Both may throw.'],
  ]),
  step('Spring: a @Transactional method calls another @Transactional method on this. What happens to the inner annotation, and why?', [], 1, [
    ['Both transactions apply, nested', 'Nothing nests: the inner call never reaches the proxy that would start anything.'],
    ['The inner annotation is ignored: self-invocation never crosses the proxy, and the advice lives on the proxy, not the target', 'Right. AOP advice wraps the proxy object; this.method() is a plain Java call on the target. The “leak on the path nobody guarded” dossier is this class of bug. Fixes: split the bean, or call through the proxy.'],
    ['Runtime exception — Spring detects self-invocation', 'Spring cannot see a plain Java call on the target. It fails silently, which is why it bites.'],
    ['The inner one starts a new transaction due to REQUIRES_NEW default', 'The default propagation is REQUIRED, and in any case the annotation is never consulted on a self-call.'],
  ]),
  step('traced(Ward.class, ward, calls) returns a JDK dynamic proxy that records each method name. GeneralWard.admitAll loops over the ids calling this.admit(id). You call proxy.admitAll(["P-1", "P-2"]). What is in calls?', [
    row('calls', ['?']),
  ], 0, [
    ['["admitAll"]', 'Right. Only calls made on the proxy reach the handler. Inside the target, this is the target. The checker runs exactly this.'],
    ['["admitAll", "admit", "admit"]', 'That would need this.admit() to go through the proxy. It doesn’t; this is the real object.'],
    ['["admit", "admit"]', 'The outer call went through the proxy, so it was recorded.'],
    ['[] — dynamic proxies only intercept interfaces, and admitAll is a class method', 'admitAll is declared on the Ward interface, so the proxy intercepts it.'],
  ]),
  step('A LazyScan is created for a 40-slice MRI. The viewer calls id(), then pixels(), then pixels() again. How many times is cold storage hit?', [
    row('Calls', ['id()', 'pixels()', 'pixels()']),
  ], 1, [
    ['0', 'pixels() needs the real image, so the first call must load it.'],
    ['1', 'Right. id() is answered by the proxy itself; the first pixels() loads; the second reuses the loaded object.'],
    ['2', 'The proxy keeps the real object after the first load.'],
    ['3', 'id() never touches storage. That is the point of a virtual proxy.'],
  ]),
  step('A caching proxy with a long TTL sees policy lookups P1, P2, P1, P1, P3, P2. How many hits and misses?', [
    row('Lookups', ['P1', 'P2', 'P1', 'P1', 'P3', 'P2'], {}, { tones: { 0: 'hot', 1: 'hot', 4: 'hot' } }),
  ], 2, [
    ['6 misses', 'Only the first lookup of each policy goes to the insurer.'],
    ['2 hits, 4 misses', 'There are three distinct policies, so three misses; the other three lookups are hits.'],
    ['3 hits, 3 misses', 'Right. First sightings of P1, P2, P3 miss; the repeats of P1, P1 and P2 hit. The real service was called exactly 3 times.'],
    ['4 hits, 2 misses', 'P3 is new too: three first sightings, three misses.'],
  ]),
];

export const facade = [
  step('The front desk, the mobile app and the night batch each implement discharge themselves. The batch forgot the audit call. What is the fix?', [], 2, [
    ['Add the audit call to the batch job', 'Fixes one caller today. The next caller (a kiosk, a partner API) can forget it again.'],
    ['Write a code-review checklist item: “remember the audit”', 'Discipline does not scale. The War Room’s rule: a guarantee that must hold on every path is enforced by structure.'],
    ['A DischargeFacade that owns the sequence; every caller makes one call', 'Right. The five-step choreography exists exactly once, so no caller can skip a step it never sees.'],
    ['Make AuditLog a singleton so everyone can reach it', 'Reachability was never the problem. Remembering to call it was.'],
  ]),
  step('MediCore wants senior citizens to get 10% off at discharge. Where does that rule go?', [], 1, [
    ['An if inside DischargeFacade.discharge()', 'That is the facade starting to decide. Money rules in the facade turn it into a God class one if at a time.'],
    ['BillingService (finalizeBill): bill math lives in billing', 'Right. The facade coordinates, never decides. Billing owns the discount; the facade still just runs the sequence.'],
    ['The front-desk UI, since it knows the patient’s age', 'Then the app and the batch disagree with the desk. That is the duplication the facade removed.'],
    ['A new SeniorDischargeFacade subclass', 'Discounts are billing rules, not a new choreography.'],
  ]),
  step('GuardedDischargeFacade: billing succeeds, then PayLoom declines. Which collaborators were called?', [
    row('Steps', ['billing', 'payment', 'pharmacy', 'audit', 'sms'], {}, { tones: { 0: 'done', 1: 'out' } }),
  ], 3, [
    ['All five — the facade always runs the full sequence', 'Then medicines leave the building unpaid for. The failure policy stops the sequence.'],
    ['Billing and payment only', 'The blocked discharge is audited too: regulators want refusals logged.'],
    ['Billing, payment, pharmacy', 'Pharmacy is exactly the step that must not run after a decline.'],
    ['Billing, payment, audit (DISCHARGE_BLOCKED) — then it throws', 'Right. Stop before anything leaves the building, record why, fail loudly. The checker asserts the pharmacy and SMS were never called.'],
  ]),
];

export const composite = [
  step('The admission bill: room ₹9,000; a surgery package of surgeon ₹40,000, OT ₹15,000 and an anesthesia group of anesthetist ₹8,000 and drugs ₹2,500. What does bill.total() return?', [
    row('Leaves', ['9,000', '40,000', '15,000', '8,000', '2,500']),
  ], 2, [
    ['₹65,500', 'That is the surgery package alone. The room charge sits beside it at the top level.'],
    ['₹10,500', 'That is the anesthesia group alone.'],
    ['₹74,500', 'Right. Groups add their children; leaves return their amount. One call at the root walks the whole tree.'],
    ['₹1,50,000', 'Each charge is counted once. Groups add up their children; they have no amount of their own.'],
  ]),
  step('Where should add(child) live?', [], 1, [
    ['On BillNode, so leaves and groups look identical (“transparent” composite)', 'Then Charge must implement add() — and can only throw. That is a Liskov violation built into the interface.'],
    ['On ChargeGroup only (“safe” composite); BillNode has only the operations every node can honour', 'Right. Building the tree needs to know which nodes are groups; using the tree (total) does not. GoF describes both; the safe one keeps every promise.'],
    ['In a separate BillBuilder, with no add() anywhere', 'A builder can construct the tree, but something still has to hold the children. That is ChargeGroup.'],
  ]),
  step('Follow-up: “now print an itemized statement AND compute GST per category.” What is the cue?', [], 0, [
    ['Several operations over one stable tree — Visitor: one accept() on the nodes, one class per operation', 'Right. Adding print() and gst() to BillNode edits every node class for every new operation. Visitor makes operations cheap and new node types expensive — say that trade-off aloud.'],
    ['Add print() and gst() to BillNode', 'Fine for one operation. For five (claims export, discount audit…) every node class is reopened five times.'],
    ['A Decorator per operation', 'Decorators wrap one object’s calls. They do not walk a tree.'],
  ]),
  step('Oona runs group.add(group) and then group.total(). What happens?', [], 2, [
    ['It returns 0', 'The group contains itself, so total() calls total() on itself before it can add anything.'],
    ['It returns the total twice', 'There is no base case to stop at the second visit.'],
    ['StackOverflowError: the cycle recurses forever', 'Right. A composite must be a tree. Build it bottom-up from finished children, or reject adding an ancestor; the checker shows the overflow.'],
    ['A compile error', 'A ChargeGroup is a BillNode, so it type-checks. Cycles are a runtime property.'],
  ]),
];

export const bridge = [
  step('Three invoice kinds (consultation, pharmacy, lab) × three formats (HTML, email text, thermal). How many concrete classes with one subclass per combination — and with a bridge?', [], 1, [
    ['6 and 6', 'Subclassing needs one class per pair: 3 × 3.'],
    ['9 and 6', 'Right. m × n versus m + n. A fourth format makes it 12 versus 7.'],
    ['9 and 9', 'With a bridge, each kind and each format is written once and combined at runtime.'],
    ['3 and 3', 'Something has to draw HTML and something has to know what a lab bill contains. That is at least 3 + 3.'],
  ]),
  step('Bridge and Adapter both hold an object behind an interface. What separates them?', [], 0, [
    ['Bridge is designed up front so two hierarchies can grow independently; Adapter is retrofitted to make an existing class fit', 'Right. Bridge is a plan; Adapter is a repair. Both hold an interface — intent and timing differ.'],
    ['Bridge uses abstract classes; Adapter uses interfaces', 'Either can use either. The difference is what problem each solves.'],
    ['Adapter changes behaviour; Bridge does not', 'An adapter is supposed to preserve behaviour and change only the shape.'],
  ]),
];

export const flyweight = [
  step('A day’s pharmacy load: 200,000 dispense lines across 1,200 distinct drugs. With the catalog, how many DrugInfo objects exist? Without it?', [], 2, [
    ['1,200 either way', 'Without the catalog, every row builds its own DrugInfo, even for the same drug.'],
    ['200,000 either way', 'With the catalog, computeIfAbsent returns the existing DrugInfo for every repeat code.'],
    ['1,200 with the catalog, 200,000 without', 'Right. The checker counts distinct objects by identity in both versions.'],
    ['1 with the catalog', 'One per distinct drug, not one in total.'],
  ]),
  step('Which field belongs on the DispenseLine (extrinsic) rather than on the shared DrugInfo (intrinsic)?', [], 1, [
    ['The manufacturer', 'The same for every line of that drug. Shared.'],
    ['The quantity dispensed', 'Right. It differs per line, so it travels with the line (or as an argument), never inside the shared object.'],
    ['The strength', 'Paracetamol 500 mg is 500 mg on every line. Shared.'],
    ['The drug name', 'Identical across every line of that drug. Shared.'],
  ]),
  step('Integer.valueOf(127) == Integer.valueOf(127), and Integer.valueOf(128) == Integer.valueOf(128). What does Java guarantee?', [], 0, [
    ['true for 127; 128 is not guaranteed either way', 'Right. The values −128..127 are always cached; others may be (the cache can be enlarged), so never compare boxed numbers with ==.'],
    ['true for both', 'Only −128..127 is guaranteed to be cached. 128 is usually a fresh object.'],
    ['false for both — == compares references', 'It does compare references, and the cache makes the references equal for small values.'],
  ]),
];

export const tellApart = [
  step('Your domain wants pay(Money). The vendor offers capture(String, String, int). One vendor, one call, a different shape.', [], 0, [
    ['Adapter', 'Right. Wrong interface shape, one object: translate it into the port your domain owns.'],
    ['Facade', 'A facade simplifies many collaborators into one use-case. Here there is one collaborator with the wrong shape.'],
    ['Proxy', 'A proxy keeps the same interface. The whole problem here is that the interfaces differ.'],
    ['Decorator', 'A decorator also keeps the interface and adds behaviour. Nothing is being added.'],
  ]),
  step('Every call to the record service must be checked against the caller’s role, including calls nobody has written yet. The caller must not be able to opt out.', [], 2, [
    ['Decorator', 'The structure is the same, but decorators are features callers choose and stack. This one is not optional.'],
    ['Facade', 'A facade would add a new entry point. Old paths to the service would remain unguarded.'],
    ['Proxy', 'Right. Same interface, control the caller gets no say in. Wire the proxy where the service is handed out, so there is no unguarded path.'],
    ['Adapter', 'Nothing needs translating; the interface is already right.'],
  ]),
  step('A campaign SMS needs retry, and also a rate limit; OTPs need only retry; in-app needs neither.', [], 1, [
    ['A subclass per combination', 'That is the 2ⁿ explosion. Every new behaviour doubles the count.'],
    ['Decorators, composed per channel at wiring time', 'Right. Same interface, behaviour the caller chose, stackable. And say what the nesting order means.'],
    ['A facade with flags for retry and limit', 'Flags inside one class are the if-ladder again, and every new behaviour reopens it.'],
  ]),
  step('Five subsystems, three callers, one sequence everyone must follow identically.', [], 3, [
    ['Proxy', 'A proxy stands in for one object with the same interface. Here callers need a new, smaller interface over many.'],
    ['Composite', 'Composite treats a tree of parts like one part. The subsystems are not a tree of the same type.'],
    ['Adapter', 'An adapter converts one interface. Here five collaborators need choreographing.'],
    ['Facade', 'Right. A new, smaller interface over many collaborators; it coordinates, never decides.'],
  ]),
];

export const drills = [
  step('Bram wants Copperline’s display board to show free spots per level, and later per zone and per row. Spots, zones and levels must all answer “how many free?”', [], 1, [
    ['Bridge', 'There are not two independent hierarchies here, just one part–whole tree.'],
    ['Composite', 'Right. A spot answers 1 or 0; a section sums its parts; the board asks a level exactly what it would ask a spot.'],
    ['Flyweight', 'Memory is not the issue. Uniform questions over a tree are.'],
    ['Facade', 'A facade hides several subsystems. Here every node is the same kind of thing.'],
  ]),
  step('MediCore acquires Saltmarsh Clinics, whose chart store speaks fetchChart(int mrn) and returns one semicolon-separated string. The records auth rule must apply to Saltmarsh patients too. What do you write?', [], 2, [
    ['A second auth proxy that speaks LegacyChartStore’s interface', 'That duplicates the policy check in vendor vocabulary. Translate first, then reuse the proxy you have.'],
    ['Edit RecordsAuthProxy to call LegacyChartStore when the id looks old', 'The proxy would then know about a vendor, and every acquisition would edit it.'],
    ['A LegacyRecordsAdapter implementing PatientRecords, wrapped by the existing RecordsAuthProxy', 'Right. Adapter inside, proxy outside. The auth rule applies with zero new auth code, and a denied caller never reaches the legacy store.'],
    ['A facade over both record stores', 'You may want one later, but it does not translate the legacy shape, which is the actual problem.'],
  ]),
  step('A campaign gateway hits the rate limit: the limiter throws RateLimitExceededException inside RetryingGateway. What does the retry do?', [], 0, [
    ['Nothing — it only retries SmsDeliveryException, so the limit error propagates at once', 'Right. Retrying a rate-limit refusal would hammer the limiter. Choosing which failures are retryable is part of the decorator’s design.'],
    ['Retries up to three times with backoff', 'Only delivery failures are caught. A full bucket is not a transient vendor fault.'],
    ['Swallows it and returns normally', 'Swallowing would report a message as sent that never left. Nothing in the code does that.'],
  ]),
  step('Interviewer: “Your DischargeFacade calls five services — isn’t that a God class?”', [], 1, [
    ['Yes — I should split it into five smaller facades', 'Five facades would push the sequence back out to callers, which is the bug you started with.'],
    ['No: it coordinates, never decides. Bill math is in billing, stock logic in pharmacy; the facade only knows the order and the failure policy', 'Right. Sequencing one use-case is a single responsibility. The tell: an if about money or medicine inside the facade means logic is leaking in.'],
    ['No — five is under the limit of seven collaborators', 'There is no magic number. The test is whether it decides business rules.'],
  ]),
  step('The patient portal shows 2,000 bed icons, each “free” or “occupied”, in one of three ward types. Memory is fine and the page loads in 40 ms. Should you add a flyweight?', [], 2, [
    ['Yes — 2,000 objects is a lot', 'It is not, for a JVM or a browser. Flyweight is a memory optimisation, so it needs a memory problem.'],
    ['Yes — flyweights are always free', 'They split state into two places and require immutability of the shared part. That is a cost.'],
    ['No — the cue is measured memory pressure, not object count on a whiteboard', 'Right. Profile first. When a heap histogram shows millions of duplicate objects, split intrinsic from extrinsic.'],
  ]),
  step('Which of these is a decorator from the JDK?', [], 1, [
    ['java.util.ArrayList', 'ArrayList is a plain collection; it wraps nothing.'],
    ['new BufferedInputStream(new FileInputStream(f))', 'Right. BufferedInputStream is an InputStream that holds an InputStream and adds buffering. Collections.unmodifiableList is another.'],
    ['java.lang.reflect.Proxy', 'That builds proxies at runtime. Same structure, but its classic uses (interception, access control, remoting) are proxy intents.'],
    ['java.util.Arrays.asList', 'It adapts an array to the List interface — closer to an adapter than a decorator.'],
  ]),
];
