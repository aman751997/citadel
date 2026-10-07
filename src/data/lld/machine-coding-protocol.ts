import { row, step } from '../../lib/trace.ts';

// Decision puzzles and hint ladders for src/lld-lessons/machine-coding-protocol.mdx.
// Every number quoted here (dates, fees, counts) is checked in tests/java/machine-coding-protocol/Check.java.

export const hints: Record<string, [string, string, string]> = {
  repo: [
    'The repository needs to know one thing about T that it cannot guess: which field is the id. How can a generic class be told that without an interface on every entity?',
    'InMemoryRepository<ID, T> implements Repository<ID, T>. It holds a ConcurrentHashMap<ID, T> and a Function<T, ID> that extracts the id, passed in the constructor (Book::isbn, Copy::id).',
    'save puts by idOf.apply(entity) and returns the entity; findById wraps get in Optional (and treats a null id as “not found”, because ConcurrentHashMap rejects null keys); findAll returns a copy so callers cannot mutate the store.',
  ],
  helpers: [
    'Without JUnit you still need two things: “assert this is true” and “assert this throws that”. Both should fail loudly with the test’s name.',
    'Two static methods: check(boolean, String name) and expectThrows(Class<? extends RuntimeException>, Runnable, String name), plus a counter so main can print how many passed.',
    'check throws AssertionError when the condition is false. expectThrows runs the action; if it throws the right type, count it; a different exception or no exception at all is an AssertionError naming the test.',
  ],
  versioned: [
    'Locks make the second writer wait. What if, instead, the second writer is allowed to try, and is told afterwards that it lost?',
    'A record Versioned<T>(value, version) and a VersionedStore<T> over a ConcurrentHashMap. update(id, expectedVersion, newValue) returns false when the version moved; updateWithRetry loops read → change → update.',
    'update reads the current row, compares versions, and writes with ConcurrentHashMap.replace(id, current, next) so the compare and the swap are one atomic step. The retry loop re-reads on every failure and never holds a lock.',
  ],
  premium: [
    'You asked at minute four whether lending rules vary by member type. Which interface did that answer create — and does the follow-up need anything that interface does not already offer?',
    'One new LendingPolicy implementation (a record: maxLoans, loanDays, graceDays, perDay, cap) and one new wiring method that maps PREMIUM to it. LibraryService, Loan and FlatFeePolicy are not opened.',
    'lateFee(d) = min(cap, perDay × max(0, d − graceDays)). With grace 3, 5 a day and a cap of 50: 9 days late costs 30, 20 days late costs 50. It never goes negative and never falls as d grows, so it keeps the interface’s contract.',
  ],
};

export const clock = [
  step('Minute 6. You have asked four clarifying questions and the Interviewer is answering patiently. What should exist on the whiteboard or in a comment before minute 10?', [], 2, [
    ['The class diagram', 'The diagram comes next. Without an agreed scope you would be drawing classes for features that may not be wanted.'],
    ['The first compiling class', 'Opening the IDE before scope is agreed is how candidates spend 20 minutes on a feature nobody asked for.'],
    ['A must / should / won’t list, read back to the Interviewer', 'Right. Reading the cut list aloud turns every later “you missed X” into “X was descoped — want it instead of Y?”. It costs one minute.'],
    ['Nothing yet — keep asking until every detail is known', 'Clarifying has diminishing returns. Ten minutes is the box; ask what changes the design, then commit.'],
  ]),
  step('Minute 32. Your interfaces compile. Which of these do you build first?', [], 1, [
    ['All four operations as stubs, then fill them in together', 'Breadth-first building leaves six half-features and nothing to demo. The round ends with “show me”.'],
    ['The one flow the demo depends on, end to end, until it runs', 'Right. A narrow slice that runs beats a broad skeleton every time. Breadth comes after the first path works.'],
    ['The extension you think the Interviewer will ask for', 'Predicting the follow-up is good; building it before the core works is not. Leave the seam empty and come back.'],
    ['Unit tests for every class', 'Tests for code that does not exist yet eat the time the core flow needs. A few fast tests come at 75.'],
  ]),
  step('Minute 84. The demo runs and you have six minutes left. What is the best use of them?', [], 3, [
    ['Start the “should” feature you cut', 'Six minutes is not enough to finish it, and a half-built feature at minute 90 can break a demo that works.'],
    ['Rename every variable for polish', 'Small renames are fine, but the buffer is for the grader, not for cosmetics.'],
    ['Stay silent and let them read the code', 'Silence wastes the last chance to direct their attention to what you did well.'],
    ['Walk them through the design: seams, cut list, what you would do next', 'Right. The buffer is a guided tour. Point at the seam the follow-up used, name what you cut and how you would add it.'],
  ]),
];

export const rubric = [
  step('Your code is beautiful but does not compile at minute 90 because of one generic type error. How do most graders score it?', [], 2, [
    ['Mostly full marks — the design is what matters', 'Working code is usually the gate. Many rubrics cap or fail a submission that does not run, whatever the design.'],
    ['Half marks across the board', 'There is rarely partial credit for “it would work if…”. The demo is the evidence for every other dimension.'],
    ['Heavily penalised: the demo is the evidence the other dimensions rest on', 'Right. Keep the code compiling at every step, so a late mistake costs a feature, not the whole submission.'],
  ]),
  step('Two candidates both finish. A’s follow-up landed as one new class. B’s follow-up edited five methods across three classes, but works. Who scores higher on extensibility?', [], 0, [
    ['A — the follow-up is the extensibility exam, and it landed as an addition', 'Right. The follow-up is designed to see whether your seams were on the real axis of change. Edits in five places say they were not.'],
    ['B — more code shows more effort', 'Graders score how cheaply change lands, not how much code it took.'],
    ['Equal — both work', 'Both pass “working code”. Extensibility is a separate line on the sheet, and B loses it.'],
  ]),
  step('Which of these is NOT a common rubric line in a machine-coding round?', [], 3, [
    ['Edge cases and error handling', 'It is: invalid ids, full capacity and double operations are what the grader tries first.'],
    ['Concurrency awareness', 'It is, at least as a question: “what happens if two requests hit this at once?”'],
    ['Naming and readability', 'It is: the grader reads your code cold, under time pressure.'],
    ['Database schema and ORM setup', 'Right — in an in-memory round, wiring JPA or H2 is plumbing nobody grades. Say storage is swappable behind a repository interface and move on.'],
  ]),
];

export const clarify = [
  step('“Design a library lending system.” Which first question earns the most?', [], 1, [
    ['“Which database should I use?”', 'It is almost always in-memory, and the answer changes nothing about your classes. Ask it last, if at all.'],
    ['“Which operations must I demo at the end?”', 'Right. The demo operations are your must-haves and get built first; everything else is negotiable.'],
    ['“How many users will the system have?”', 'Scale only matters here for choosing data structures. This is not a high-level design round.'],
    ['“Should there be a web UI?”', 'There almost never is. Asking it signals you may spend time on a UI.'],
  ]),
  step('The Interviewer says: “Members can be standard or premium, but treat them the same for now.” What does that sentence tell you?', [], 2, [
    ['Ignore tiers entirely — YAGNI', 'Ignoring them is fine for behaviour, but the Interviewer has just told you where the follow-up will land.'],
    ['Build both tiers’ rules now, guessing the premium ones', 'Guessing rules nobody specified is speculative work, and you will probably guess wrong.'],
    ['Put lending rules behind one interface chosen by tier, with one implementation for now', 'Right. One seam on the hinted axis, one implementation, and the follow-up becomes a new class plus a wiring line.'],
  ]),
  step('Which of these belongs on the WON’T list for a 90-minute lending round?', [], 0, [
    ['Payments for late fees', 'Right. Computing the fee is in scope; collecting money is a different system. Say it: “fees are computed and reported, payment is out”.'],
    ['Returning a copy', 'Without return, there is no late fee and no copy ever becomes available again. It is a must.'],
    ['Rejecting a borrow when no copy is free', 'That is the core invariant of lending. It is a must, and a demo edge case.'],
    ['Due dates', 'Due dates drive late fees and overdue lists. They are part of the core flow.'],
  ]),
];

export const entities = [
  step('In a parking lot, is Money an entity or a value?', [], 1, [
    ['Entity — it has an amount that changes', 'A fee does not change; a new amount is a new value. Entities are identified by an id that survives changes.'],
    ['Value — two equal amounts are interchangeable, and it never changes after creation', 'Right. Make it immutable (a record or a long of the smallest unit), and the arithmetic can never corrupt it.'],
    ['Neither — use a double', 'A double cannot represent most decimal fractions exactly. Money is a long of the smallest unit, or BigDecimal.'],
  ]),
  step('“A ticket cannot be closed twice.” Which class should enforce it?', [], 2, [
    ['ParkingService, with an if before calling close()', 'Then every other caller must remember the same if. Put the rule where the state lives.'],
    ['A TicketValidator class', 'Validators separated from the data they guard produce anemic models: the rule can be bypassed by anyone who skips the validator.'],
    ['Ticket itself, inside close()', 'Right. The entity that owns the state owns its invariant. The service can then never forget it.'],
  ]),
];

export const seams = [
  step('Which three things get an interface at minute 20?', [], 3, [
    ['Every class, so it is all mockable', 'More interfaces than implementations is speculative generality. Graders mark it down.'],
    ['Only the service, so the controller can be swapped', 'There is no controller in a machine-coding round, and the service is the one thing that does not vary.'],
    ['The entities, so they can be extended later', 'Entities are concrete: they own state and invariants. An interface over Ticket hides nothing worth hiding.'],
    ['The axis that varies, the storage boundary, and anything nondeterministic like the clock', 'Right. Variation (a strategy), storage (a repository), and time or randomness (a Clock, an id source): each has a second implementation or a test double.'],
  ]),
  step('A method body you have not written yet should contain…', [], 1, [
    ['return null;', 'A null travels until it explodes somewhere unrelated. If you forget the stub, the demo fails far from the cause.'],
    ['throw new UnsupportedOperationException("borrow");', 'Right. It compiles, and if you forget it, the demo fails loudly on the exact method.'],
    ['Nothing — leave it out until you need it', 'Then the rest of the code cannot be written against it, and the shape does not compile.'],
  ]),
];

export const layout = [
  step('In the package layout, which dependency is wrong?', [], 2, [
    ['service → repository (interface)', 'That is the intended direction: the service uses storage through its interface.'],
    ['service → strategy (interface)', 'Intended: the service asks a strategy for decisions that vary.'],
    ['model → service', 'Right. Entities must not know who orchestrates them. Model is the bottom layer and depends on nothing but exceptions.'],
    ['Main → everything', 'Main is the composition root: the one place allowed to know every concrete class.'],
  ]),
  step('The platform accepts a single Main.java. Why are the classes declared static class inside it?', [], 0, [
    ['A non-static nested class needs an enclosing Main instance; static nested classes behave like top-level ones', 'Right. Records, enums and interfaces are implicitly static; plain classes need the keyword, or every new needs an outer instance.'],
    ['Static classes are faster', 'There is no performance difference. It is about not needing an enclosing instance.'],
    ['Static classes cannot have instance fields', 'They can. static here only means the class is not tied to an outer object.'],
  ]),
];

export const skeleton = [
  step('findById could return the entity or null, or an Optional. What does the skeleton choose, and when does it throw instead?', [], 1, [
    ['Return null; callers check it', 'One forgotten check and the NullPointerException surfaces far from the cause.'],
    ['Optional from the repository; the service turns “must exist” into NotFoundException', 'Right. The repository does not know whether absence is an error. The service does, and says so with a domain exception carrying the id.'],
    ['Throw from the repository on every miss', 'Then “is this id free?” becomes a try/catch. Absence is a normal answer for a finder.'],
  ]),
  step('Why does the skeleton have an abstract DomainException that the specific ones extend?', [], 2, [
    ['Java requires a base class for custom exceptions', 'RuntimeException is already the base. This one is a choice.'],
    ['So every method can declare throws DomainException', 'They are unchecked; nothing needs declaring. The reason is on the catching side.'],
    ['So the demo and any API edge can catch “a business rule said no” in one place, separately from real bugs', 'Right. catch (DomainException e) prints the rejection; an IllegalStateException is a bug and should still crash.'],
  ]),
];

export const followUp = [
  step('Parking lot. The Interviewer’s intro mentions “weekend rates, maybe”. What do you build at minute 20?', [], 0, [
    ['A FeeStrategy interface with one hourly implementation', 'Right. The hint names the axis. One seam, one implementation: the weekend follow-up becomes a decorator or a new strategy.'],
    ['Weekend pricing, right now', 'It was “maybe”. Build the seam, not the feature. If the follow-up never comes, you lost nothing.'],
    ['Nothing — if-else on the day is simple enough', 'The ladder works until the second follow-up. The hint told you which method will be reopened.'],
  ]),
  step('Vending machine. “Insert coin” means different things when idle, when a product is selected, and while dispensing. Which seam fits?', [], 2, [
    ['Strategy, chosen by product', 'The behaviour depends on where the machine is in its lifecycle, not on what is being sold.'],
    ['Observer on coin insertion', 'Observer tells others something happened. It does not decide what is legal now.'],
    ['State: one class per state, each deciding what each event does', 'Right. When legal moves depend on the current phase, State makes an illegal transition impossible to write by accident.'],
    ['Decorator around the coin slot', 'Decorator adds behaviour on top. The problem here is behaviour that switches by phase.'],
  ]),
  step('Library. “When a copy is returned, the next person on the hold list gets an email.” Which seam?', [], 1, [
    ['Strategy for returns', 'The return logic does not vary. Something else needs to know that it happened.'],
    ['Observer: the service publishes “copy returned”, listeners react', 'Right. The lending service should not know about email, holds or analytics. It announces; listeners decide.'],
    ['A new subclass of LibraryService', 'Subclassing the service for each reaction couples every reaction to its internals, and they cannot be combined.'],
  ]),
];

export const concurrency = [
  step('Two phones book charger-3 at 18:00 at the same instant. The code is: if (!slots.containsKey(key)) slots.put(key, driver). The map is a ConcurrentHashMap. What can happen?', [
    row('Thread A', ['containsKey → false', '', 'put(A)']),
    row('Thread B', ['', 'containsKey → false', 'put(B)']),
  ], 1, [
    ['Nothing — ConcurrentHashMap is thread-safe', 'Each call is thread-safe on its own. Check-then-act across two calls is not: both can see “free” before either writes.'],
    ['Both see the slot free; both are told they booked it; one booking silently overwrites the other', 'Right. Use one atomic call: putIfAbsent(key, driver) == null means you won.'],
    ['A ConcurrentModificationException', 'ConcurrentHashMap never throws it. That is what makes this bug silent.'],
  ]),
  step('Wallet transfer: lock A then B, while another thread transfers B → A and locks B then A. What is the risk, and the fix?', [], 3, [
    ['Lost update — use a ConcurrentHashMap', 'The balances may already be in one. The danger is two threads each holding one lock and waiting for the other.'],
    ['Lost update — make the balances volatile', 'Volatile gives visibility, not atomicity, and does nothing about two locks.'],
    ['Deadlock — use one global lock for everything', 'That works, but serialises every unrelated transfer. Keep it as a fallback, not the first answer.'],
    ['Deadlock — always acquire the two locks in a fixed order, such as by account id', 'Right. With a global order, no two threads can each hold the lock the other needs.'],
  ]),
  step('When is an optimistic version check a better fit than a lock?', [], 0, [
    ['Conflicts are rare and the work can be redone cheaply', 'Right. No one waits; the rare loser re-reads and retries. Under heavy contention, retries pile up and a lock is better.'],
    ['Conflicts are constant', 'Then most attempts fail and retry. Pessimistic locking wastes less work under heavy contention.'],
    ['Whenever you need a deadlock', 'Optimistic checks cannot deadlock, because they hold no locks. That is one of their advantages, not a use case.'],
  ]),
];

export const demo = [
  step('Your demo main has five minutes of budget. Which script tells the best story?', [], 2, [
    ['An interactive menu reading commands from stdin', 'A menu loop eats 15 minutes and makes the grader type. A scripted main is faster and repeatable.'],
    ['Happy path only, run three times', 'Repeating the happy path proves nothing new. The edge cases are where your exceptions earn credit.'],
    ['Happy path, then two edge cases that print a clean rejection', 'Right. Borrow, return with a fee, then “no copy left” and “returned twice”. Each line proves a requirement.'],
    ['Print the whole repository after every operation', 'A wall of state hides the story. Print one line per event.'],
  ]),
  step('No JUnit on the platform. What is the cheapest honest test?', [], 1, [
    ['Skip tests; the demo is enough', 'The demo shows the happy path to a human. A few assertions catch a regression the moment you add the follow-up.'],
    ['Two tiny helpers — check and expectThrows — and a selfTest() run at the start of main', 'Right. Five minutes of code, and if the follow-up breaks the core, main fails at once with the test’s name.'],
    ['Write your own mini JUnit with annotations and reflection', 'That is a framework, not a test. Two static methods are enough.'],
  ]),
];

export const behind = [
  step('Minute 50 and the core flow does not run yet. What do you say?', [], 3, [
    ['Nothing — type faster', 'Silent catch-up is how rounds end with half a feature and no explanation.'],
    ['“Can I have ten more minutes?”', 'The clock is part of the exam. Asking for more time does not show judgement; cutting scope does.'],
    ['“I’ll skip the edge cases entirely.”', 'Edge cases are on the rubric. Cut a should-have feature instead, and keep at least two edges in the demo.'],
    ['“I’m behind. I’ll drop the overdue report to the won’t list and get borrow/return running first.”', 'Right. Name the cut, name what it buys, and keep going. Visible triage reads as seniority.'],
  ]),
  step('You notice at minute 40 that you have spent 12 minutes on a generic event bus. What now?', [], 0, [
    ['Stop, delete it, wire the two calls directly, and say why', 'Right. Nobody asked for a framework. Two direct calls behind one small interface are enough until the follow-up proves otherwise.'],
    ['Finish it — it will impress them', 'Over-engineering is a rubric line too. An unused framework costs time and earns a question about YAGNI.'],
    ['Keep it but stop testing it', 'Untested infrastructure in the demo path is the riskiest thing in the room.'],
  ]),
];

export const round = [
  step('Minute 4 of the Lantern Lane round. The card says “borrow and return books; late fees”. Which question finds the axis of change?', [], 2, [
    ['“How many books does the library hold?”', 'It changes your data structures at most. It does not tell you what the follow-up will vary.'],
    ['“Can a member borrow the same title twice?”', 'A good edge-case question, but it does not reveal what varies.'],
    ['“Do the lending rules — limits, loan length, fees — differ between members?”', 'Right. The answer (“standard and premium, same rules for now”) is the hint that creates LendingPolicy.'],
  ]),
  step('Standard policy: 14-day loans at 10 a day late. Ada borrows on 2 March 2026 and returns on 22 March. What is the fee?', [
    row('Date', ['2 Mar', '16 Mar', '22 Mar'], { 0: 'BORROW', 1: 'DUE', 2: 'RETURN' }),
  ], 1, [
    ['20 days × 10 = 200', 'The fee counts days past the due date, not days on loan. Loan days 1–14 are free.'],
    ['6 days late × 10 = 60', 'Right. Due on 16 March (2 + 14); 22 − 16 = 6 days late.'],
    ['7 days late × 10 = 70', 'Off by one. From the 16th to the 22nd is 6 days; returning on the due date itself is 0 days late.'],
  ]),
  step('Bram’s follow-up: premium members get 21-day loans, 3 grace days, then 5 a day, capped at 50. Bo borrows on 2 March and returns on 1 April. What does he pay?', [
    row('Date', ['2 Mar', '23 Mar', '1 Apr'], { 0: 'BORROW', 1: 'DUE', 2: 'RETURN' }),
  ], 0, [
    ['30 — 9 days late, minus 3 grace days, times 5', 'Right. Due on 23 March; 1 April is 9 days later (8 left in March, plus 1). (9 − 3) × 5 = 30, under the cap.'],
    ['45 — 9 days late × 5', 'You forgot the 3 grace days. The fee starts on the fourth late day.'],
    ['50 — the cap', 'The cap only applies once the fee would exceed 50. Here it is 30.'],
    ['0 — premium members never pay', 'Grace is 3 days. Bo is 9 days late.'],
  ]),
];

export const drills = [
  step('30 minutes left, core flow works, two features remain: (a) the pricing variation the Interviewer hinted at in the intro, (b) multi-floor spot allocation. What do you build?', [], 1, [
    ['Both, quickly, skipping tests', 'Two rushed features and no tests risk a broken demo. Hints tell you which one is graded.'],
    ['The hinted pricing variation, as a new strategy; then describe the allocation plan aloud, its seam already in place', 'Right. Hints telegraph the rubric. The variation lands cheaply if your seams are honest, demos well, and proves open/closed. The other feature becomes a narrated plan pointing at an existing interface — nearly full credit for zero minutes.'],
    ['Multi-floor — it is architecturally more interesting', 'Interesting to you is not the same as graded. The Interviewer told you what they will ask about.'],
    ['Neither — polish and test the core flow', 'Polish is worth less than the follow-up the Interviewer signalled. Build it, then test.'],
  ]),
  step('Why does park() throw SpotUnavailableException instead of returning null or false?', [], 1, [
    ['Exceptions are faster than null checks', 'They are not faster. The reason is API design, not speed.'],
    ['A boolean or null makes every caller invent handling and lets one forget; a typed domain exception carries what and why and cannot be silently ignored', 'Right. Failure semantics are API design. null defers the crash to a distant NullPointerException; false loses the reason. Unchecked domain exceptions with context (lot full? wrong spot type?) also demo cleanly — the edge-case lines in main print them.'],
    ['Because checked exceptions document the API', 'Domain exceptions here are unchecked. Checked ones would force try/catch through every layer for no gain in a round.'],
    ['It makes no difference in an interview', 'It is on the rubric under error handling, and it shows up in your demo output.'],
  ]),
  step('Minute 60: you realise the requirement “members can reserve ahead” was never discussed and will not fit. Best move?', [], 1, [
    ['Build a stub silently so the file exists', 'An empty stub looks like a feature until someone runs it. That is worse than an honest cut.'],
    ['Say it now: “Reservations won’t fit; I’d add a Reservation entity and a check in allocation. Want me to trade it against the pricing extension?”', 'Right. Announced descoping with a sketched design and an offered trade is senior behaviour; it turns a miss into a scoping conversation. Silent skips are the most common boring reason working submissions fail.'],
    ['Skip it and hope the demo distracts', 'Graders check the requirements list. A silent skip reads as forgetting.'],
    ['Ask to extend the interview', 'The time box is part of the exam. Triage is what is being graded.'],
  ]),
  step('Which of these is a time sink rather than an investment?', [], 2, [
    ['A Repository interface with an in-memory implementation', 'Two minutes, and it shows you know storage is swappable. An investment.'],
    ['A selfTest() with five assertions', 'Five minutes, and it catches regressions from the follow-up. An investment.'],
    ['Wiring H2 and JPA “to be realistic”', 'Right. Twenty minutes of plumbing nobody grades. Say “storage sits behind a repository; a JPA version would be a second implementation”.'],
    ['Reading the cut list back to the Interviewer', 'One minute that protects you from “you missed X”. An investment.'],
  ]),
  step('The Interviewer asks, at minute 85: “What if two kiosks borrow the last copy at once?” You have five minutes. Best answer?', [], 3, [
    ['“Java’s ConcurrentHashMap makes it safe already.”', 'Each map call is atomic, but borrow is check-then-act across the member’s loan count and the copy’s status. Two kiosks can both pass the checks.'],
    ['“Make every method synchronized on every entity.”', 'Locking every entity separately invites deadlocks and does not make the multi-step borrow atomic.'],
    ['“It cannot happen in a library.”', 'Two kiosks is exactly the concurrency the question describes. Dismissing it loses the line on the rubric.'],
    ['“Borrow is check-then-act. One lock around the mutating operations is correct now; per-title locks if throughput matters.” — then add it', 'Right. Name the race, ship the simple correct fix as one new class, and say how you would make it finer.'],
  ]),
  step('Your seven interfaces each have one implementation. The Interviewer frowns. Which ones keep their interface?', [], 0, [
    ['Those with a second implementation, a test double, or an announced axis of change', 'Right. LendingPolicy (two implementations), Repository (in-memory now, a database later — say it) and Clock (a manual clock in tests) stay. The rest get inlined.'],
    ['All of them — interfaces are always good practice', 'Graders mark unearned interfaces as speculative generality.'],
    ['None — interfaces are over-engineering in 90 minutes', 'The follow-up landed as a class because of one interface. Seams on the real axis are what extensibility is graded on.'],
  ]),
  step('Premium policy: 3 grace days, 5 a day, cap 50. How much for 20 days late?', [], 2, [
    ['100', 'That is 20 × 5 with no grace and no cap.'],
    ['85', '(20 − 3) × 5 = 85, but the cap is 50.'],
    ['50', 'Right. (20 − 3) × 5 = 85, capped at 50. The cap is what keeps the contract: never negative, never falling, and bounded.'],
    ['0', 'Only the first 3 late days are free.'],
  ]),
  step('Which order of work survives a bad day best?', [], 1, [
    ['Entities → all features stubbed → fill in → test at the end', 'Breadth-first. If you stall at minute 60, nothing runs.'],
    ['Scope → diagram → interfaces → one running path → edges → follow-up → tests and demo → buffer', 'Right. At every checkpoint something runs. A bad day costs features, not the demo.'],
    ['Tests first for every class, then code', 'TDD is fine at work. In 90 minutes, tests for code that does not exist yet starve the core flow.'],
  ]),
];
