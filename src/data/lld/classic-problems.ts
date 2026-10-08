import { row, step } from '../../lib/trace.ts';

// Decision puzzles and "your turn" hints for src/lld-lessons/classic-problems.mdx.
// Every number quoted here is checked in tests/java/classic-problems/Check.java.

export const hints: Record<string, [string, string, string]> = {
  parking: [
    'Which interface did you close in Phase 3 for exactly this kind of request? The new policy is one more implementation of it.',
    'EvenSpread implements SpotAllocator. Nothing else changes except the wiring line that passes it to ParkingLot.',
    'Count free, fitting spots per floor; keep the floor with the most (ties keep the lower floor); on that floor return the free fitting spot with the smallest size. It is still only a hint — tryAssign stays the claim.',
  ],
  splitwise: [
    'Which interface decides how an expense divides? The ledger only checks that the shares sum to the amount.',
    'ShareSplit implements Split and holds a map of person to weight. Ledger, EqualSplit, ExactSplit and PercentSplit are untouched.',
    'Each share is amount × weight / total weight, rounded down; then hand the leftover paise out one at a time, in name order, to people with a positive weight.',
  ],
  vending: [
    'Each state class already encodes which buttons it accepts. Write the same facts down as data.',
    'An enum VendOp for the actions and an enum VendState with allowed(): a switch from each state to an EnumSet of operations.',
    'IDLE allows INSERT and OUT_OF_SERVICE; COLLECTING allows INSERT, SELECT and CANCEL; OUT_OF_SERVICE allows BACK_IN_SERVICE, RESTOCK and LOAD_COINS. Test it against the machine: an action throws IllegalStateException exactly when the table says no.',
  ],
  lru: [
    'Which operations mutate the list? Look carefully at get().',
    'A wrapper class, SynchronizedLru, that holds an LruCache and forwards every call — composition, so LruCache is not edited.',
    'Make every forwarding method synchronized on the wrapper, get included. A ReadWriteLock would let two gets move nodes at once and corrupt the links.',
  ],
  booking: [
    'Does the seat inventory need to know about money at all? Who changes the price rules, and who changes the hold rules?',
    'A PriceRule interface with price(seatId), a RowPricing implementation, and a total(hold, rule) helper outside Show.',
    'RowPricing checks the seat id’s row letter against a set of premium rows. total() sums the rule’s price over the hold’s seats: A5, A6, C1 is 450 + 450 + 250 = 1,150.',
  ],
  elevator: [
    'Choosing which car answers a call is a different decision from choosing a car’s next floor. Where does each live?',
    'NearestCarDispatcher holds the list of cars, computes a cost per car, and calls request() on the cheapest. Elevator is unchanged.',
    'If the car is idle or the floor is ahead in its direction, the cost is the distance. Otherwise it must finish its sweep: distance to its last stop in that direction, plus the distance back to the floor.',
  ],
  logger: [
    'The caller must never wait for the disk. What sits between a producer and a slow consumer?',
    'AsyncAppender implements Appender and wraps another Appender (a decorator), with an ArrayBlockingQueue and one worker thread.',
    'append() offers to the queue and counts a drop if it is full; the worker takes events and calls the wrapped appender; close() enqueues a stop marker and joins the worker so nothing queued is lost.',
  ],
  limiter: [
    'A token bucket can let capacity plus refill through in a window. What would you have to remember to promise “at most N in any window”?',
    'SlidingWindowLog implements RateLimiter with a map from key to a deque of allowed timestamps, created with computeIfAbsent.',
    'Under the deque’s lock: drop timestamps at or before now − window, reject if the deque holds limit entries, otherwise record now and allow.',
  ],
};

export const skeleton = [
  step('Which of these is the “claim” in the parking lot — the step that must be one atomic operation?', [], 2, [
    ['The allocator’s search for a free spot', 'The search can be racy on purpose: two threads may both be offered M-1-1. It is only a hint.'],
    ['Computing the fee at exit', 'The fee is a pure calculation over a ticket and a time. Nothing is contended.'],
    ['Spot.tryAssign: check the spot is free and take it, in one step', 'Right. Check-and-take under the spot’s lock is the decision; a thread that loses simply picks again.'],
    ['Creating the ticket id', 'An AtomicLong makes ids unique, but two cars in one spot is the invariant that matters.'],
  ]),
  step('In BookMyShow, the Interviewer asks how you will test that a hold expires after ten minutes. Which move from the skeleton answers it?', [], 3, [
    ['Seam — put expiry behind a strategy', 'Expiry is not a varying policy here; the problem is that the test cannot control time.'],
    ['Claim — make expiry atomic', 'The hold is atomic already. The question is how to reach minute ten in a test.'],
    ['Sleep for ten minutes in the test', 'A ten-minute test is a test nobody runs, and it is still flaky at the boundary.'],
    ['Clock — inject a Clock and advance a manual clock in the test', 'Right. Hold at 19:00, advance ten minutes, assert the seat is free. Instant and exact.'],
  ]),
  step('Splitwise: where should the rule “the shares must sum to the expense” live?', [], 1, [
    ['In every Split implementation, each checking itself', 'Then every future split must remember the rule, and one that forgets corrupts the balances.'],
    ['In Ledger.add, which rejects any split that doesn’t sum to the amount', 'Right. The owner of the zero-sum invariant enforces it once; strategies compute, the entity guards.'],
    ['In the UI, before the expense is submitted', 'Validation at the edge is fine to add, but the invariant must hold for every caller, not just one screen.'],
  ]),
];

export const parking = [
  step('Copperline: M-0-1 and M-0-2 are taken. A car arrives. SmallestFitLowestFloor tries sizes small to large, floors low to high. Which bay?', [
    row('Floor 0', ['S-0-1', 'M-0-1', 'M-0-2', 'L-0-1'], {}, { tones: { 1: 'out', 2: 'out' } }),
    row('Floor 1', ['S-1-1', 'M-1-1', 'L-1-1']),
  ], 2, [
    ['S-0-1', 'A car has size 2 and a small bay has size 1: it doesn’t fit.'],
    ['L-0-1', 'The lowest floor, but a large bay. The policy checks size before floor, so a medium anywhere wins.'],
    ['M-1-1', 'Right. Medium is the smallest size that fits a car, and M-1-1 is the first free medium.'],
    ['Lot full', 'M-1-1, L-0-1 and L-1-1 are all free and fit a car.'],
  ]),
  step('A car parks at 09:00 and leaves at 11:10. Cars pay 20 per started hour, at least one hour. What is the fee?', [], 2, [
    ['40', 'That counts only the two full hours. Every started hour is billed: the ten minutes start a third.'],
    ['43', 'Fees are whole started hours, not pro-rated minutes.'],
    ['60', 'Right. 130 minutes is (130 + 59) / 60 = 3 started hours, × 20 = 60.'],
    ['20', 'One hour is the minimum, not the whole fee.'],
  ]),
  step('Two threads are both offered M-1-1, the last medium bay, by pick(). What happens?', [], 1, [
    ['Both cars get M-1-1', 'That was the old system’s bug. tryAssign checks and claims under the spot’s lock, so only one succeeds.'],
    ['One tryAssign returns true; the other returns false, and that thread picks again — another bay, or LotFull', 'Right. The search was a hint; the claim decided. Losing a race costs one more search.'],
    ['Both threads throw ConcurrentModificationException', 'Nothing iterates a collection while it changes; the spot simply refuses the second car.'],
    ['The second thread blocks until the first car leaves', 'tryAssign never waits. Blocking would freeze the barrier for hours.'],
  ]),
];

export const splitwise = [
  step('₹100.00 is split equally among A, B and C. In paise, what are the shares?', [
    row('Amount', ['10000 paise']),
  ], 1, [
    ['3333, 3333, 3333', 'They sum to 9999. One paisa vanished — Oona’s spreadsheet bug.'],
    ['3334, 3333, 3333', 'Right. 10000 / 3 = 3333 remainder 1; the first person in the list takes the extra paisa, so the shares sum to the amount.'],
    ['33.33 rupees each, as doubles', '0.1 has no exact binary form, and three 33.33s still sum to 99.99.'],
  ]),
  step('Oona pays ₹900 split equally among Oona, Wren and Bram; Wren pays ₹600: ₹100 hers, ₹500 Bram’s. What does simplify() return?', [
    row('Balance (₹)', ['+600', '+200', '−800'], { 0: 'Oona', 1: 'Wren', 2: 'Bram' }),
  ], 0, [
    ['Bram → Oona 600, Bram → Wren 200', 'Right. Biggest debtor to biggest creditor: min(800, 600) = 600, then Bram’s remaining 200 to Wren. Two transfers.'],
    ['Bram → Oona 300, Bram → Wren 500, Wren → Oona 300', 'That replays the expenses as IOUs. Only the net balances matter.'],
    ['Bram → Oona 800, Oona → Wren 200', 'Valid, but it routes money through Oona; greedy pays each creditor directly, and the count is the same.'],
    ['Bram → Wren 800, Wren → Oona 600', 'Also settles, but greedy matches the biggest debtor with the biggest creditor first.'],
  ]),
  step('Balances: Oona +500, Wren +400, Ines +300, Bram −700, Kofi −500. Greedy makes 4 transfers. What is the minimum?', [
    row('Balance', ['+500', '+400', '+300', '−700', '−500'], { 0: 'Oona', 1: 'Wren', 2: 'Ines', 3: 'Bram', 4: 'Kofi' }),
  ], 1, [
    ['4 — greedy is optimal', 'Not always. Look for groups whose balances sum to zero on their own.'],
    ['3 — Kofi → Oona 500; Bram → Wren 400 and Bram → Ines 300', 'Right. The people split into two zero-sum groups, so one fewer transfer. Finding the most such groups is NP-hard in general, which is why greedy’s n − 1 bound is the interview answer.'],
    ['2', 'Each transfer zeroes at most two people only when amounts match exactly; five nonzero people in two zero-sum groups need 5 − 2 = 3.'],
  ]),
];

export const vending = [
  step('The machine is Idle. A customer presses Select. What should happen?', [], 2, [
    ['Vend, and charge the next customer', 'That was Fennick’s bug. Idle has no credit to vend against.'],
    ['Refused: “insert 20 more”, keep the state', 'Refused is for a legal request that can’t be served. Select without money isn’t legal in Idle at all.'],
    ['IllegalStateException, and nothing changes', 'Right. Idle doesn’t override select, so the base class throws. The illegal transition is the default.'],
  ]),
  step('Box: one ₹5, three ₹2. A customer pays ₹20 for a ₹14 peanut bar. What change does the knapsack give, and what would greedy say?', [
    row('Coin box', ['20', '5', '2', '2', '2']),
  ], 1, [
    ['Knapsack 5 + 1; greedy the same', 'There is no ₹1 coin in the box. Change comes from coins that exist.'],
    ['Knapsack 2 + 2 + 2; greedy takes the 5, needs 1, and says “exact change only”', 'Right. Greedy is optimal for 1-2-5-10-20 only with unlimited coins; a finite box breaks it.'],
    ['Both say “exact change only”', 'Three ₹2 coins make ₹6. Only greedy misses it.'],
  ]),
  step('A customer in Collecting with ₹15 credit presses Cola (₹25). What happens?', [], 0, [
    ['Refused (“insert 10 more”), still Collecting, credit still 15', 'Right. A legal request that can’t be served yet keeps the credit; the customer can add coins or cancel.'],
    ['IllegalStateException, credit refunded', 'Select is legal in Collecting. Refunding would surprise a customer who was about to add a coin.'],
    ['Back to Idle with the credit kept', 'Idle means no credit. The state and the credit would contradict each other.'],
  ]),
];

export const lru = [
  step('Capacity 3. put a, put b, put c, get a, put d. Which key is evicted?', [
    row('Most recent first', ['a', 'c', 'b'], { 2: 'LRU' }),
  ], 1, [
    ['a', 'a was used by the get, so it moved to the front.'],
    ['b', 'Right. After get a the order is a, c, b; b sits before the tail sentinel, so put d evicts it. The order becomes d, a, c.'],
    ['c', 'c was used more recently than b.'],
    ['d is rejected', 'An LRU cache always admits the new key and evicts the least recently used one.'],
  ]),
  step('Why does each list node store its key as well as its value?', [], 2, [
    ['So keysMostRecentFirst() can print keys', 'Handy, but not why it is needed.'],
    ['Java requires nodes to be unique', 'Nothing in Java requires it.'],
    ['Eviction starts at the tail of the list and must delete the matching map entry in O(1)', 'Right. Without the key in the node, finding the map entry would mean searching the map.'],
  ]),
  step('Forty threads share the cache. Which lock?', [], 1, [
    ['A ReadWriteLock: gets share the read lock', 'get moves the node to the front. Two concurrent “reads” would both rewrite the links.'],
    ['One exclusive lock around get and put', 'Right. A read is a write in an LRU; one lock is correct. Production caches trade exact LRU for segmented locking.'],
    ['ConcurrentHashMap for the index, no lock', 'The map would be safe, but the linked list would not, and the two must change together.'],
  ]),
];

export const booking = [
  step('19:00 Asha holds A5 and A6 for 10 minutes. 19:04 Ravi asks for A6 and A7. What does Ravi get?', [
    row('Row A', ['A5', 'A6', 'A7'], { 0: 'Asha', 1: 'Asha' }, { tones: { 0: 'hot', 1: 'hot' } }),
  ], 2, [
    ['A7 only', 'Holds are all-or-nothing. Half a pair would strand Ravi next to a stranger and block A7 for someone else.'],
    ['Both — the newer request wins', 'Asha’s hold is valid until 19:10. Taking her seat is the F7 bug.'],
    ['Nothing: an empty Optional', 'Right. A6 is held, so the whole request fails and A7 stays available.'],
  ]),
  step('At 19:10:00 exactly, Ravi asks again for A6 and A7. Asha’s hold expires at 19:10:00. Result?', [], 0, [
    ['Ravi gets both: a hold is valid only while now is before expiresAt', 'Right. At the instant of expiry, now.isBefore(expiresAt) is false; lazy expiry frees A5 and A6 first.'],
    ['Nothing until a cleanup thread runs', 'There is no cleanup thread. Every operation expires stale holds before it decides.'],
    ['Ravi gets A7 only', 'Once Asha’s hold has expired, A6 is free too.'],
  ]),
  step('Asha’s payment is approved at 19:10:30 and her app calls confirm. What should happen?', [], 1, [
    ['Book the seats anyway — she paid', 'Ravi holds A6 now. Booking would put two people in one seat.'],
    ['HoldExpiredException, then refund Asha', 'Right. Confirm re-checks the hold under the lock; a lapsed hold means refund, not booking.'],
    ['Hold the lock during payment so this can’t happen', 'Payment can take seconds or hang; every other customer of the show would wait behind it.'],
  ]),
];

export const elevator = [
  step('The car is idle at 0. Requests arrive: 9, 1, 8, 2. How many floors does each scheduler travel?', [
    row('Requests', [9, 1, 8, 2]),
  ], 2, [
    ['FCFS 9, LOOK 30', 'Reversed. FCFS zigzags 9 + 8 + 7 + 6.'],
    ['Both 9', 'FCFS goes to 9 first, then back down to 1.'],
    ['FCFS 30, LOOK 9', 'Right. LOOK picks the nearest (1), keeps going up, and serves 1, 2, 8, 9 in one sweep.'],
    ['FCFS 30, LOOK 18', 'LOOK never goes back down here: all stops are above the car after it starts.'],
  ]),
  step('The car is at 5 going up, with stops at 7 and 2. Someone presses 6. In what order are the floors served?', [
    row('Stops', [2, 6, 7], { 1: 'new' }),
  ], 0, [
    ['6, 7, 2', 'Right. 6 is ahead in the current direction, so it is served on the way: 1 + 1 + 5 = 7 floors.'],
    ['7, 2, 6', 'That is arrival order — FCFS, 11 floors.'],
    ['2, 6, 7', 'The car is going up. Reversing to 2 first ignores direction.'],
    ['7, 6, 2', 'LOOK stops at the nearest stop ahead, which is 6.'],
  ]),
  step('Can a request starve under LOOK in a building with floors 0–9?', [], 1, [
    ['Yes, if requests keep arriving ahead of the car', 'Requests ahead only extend the sweep up to the top floor; then the car must reverse.'],
    ['No: it is served within 2 × (9 − 0) = 18 floors of travel after arriving', 'Right. At worst the car finishes its sweep to an end and comes back. The checker asserts this bound on random traffic.'],
    ['No, because LOOK serves requests in arrival order', 'LOOK ignores arrival order; that is the whole point.'],
  ]),
];

export const logger = [
  step('Root is INFO. gearhouse.lift is DEBUG. gearhouse.lift.door has no level and logs DEBUG. Does it print?', [
    row('Chain', ['root: INFO', 'gearhouse', 'gearhouse.lift: DEBUG', 'gearhouse.lift.door'], {}, { join: '←' }),
  ], 0, [
    ['Yes — its effective level is DEBUG, inherited from the nearest ancestor with a level', 'Right. The search walks up and stops at gearhouse.lift.'],
    ['No — the root is INFO', 'The root’s level only applies when no closer ancestor has one.'],
    ['Only to the lift’s appender, because the root would filter it', 'Ancestors don’t re-filter. The level check happens once, at the source.'],
  ]),
  step('The same DEBUG event: which appenders receive it, with additivity on everywhere?', [], 2, [
    ['Only gearhouse.lift’s appender', 'Additivity passes the event up the chain to every ancestor’s appenders.'],
    ['Only the root’s appender', 'Every logger on the way up contributes its appenders, starting with the source.'],
    ['gearhouse.lift’s and the root’s', 'Right. The door has none, gearhouse has none; lift and root each get it once. Set lift non-additive and only lift gets it.'],
  ]),
  step('LogManager.get creates parent loggers. Why not create the parent inside computeIfAbsent’s mapping function?', [], 1, [
    ['It would be slower', 'Speed is not the issue; correctness is.'],
    ['The mapping function must not update other mappings of the same map — on modern JDKs that can throw “Recursive update”', 'Right. Build the parents first, then let computeIfAbsent only construct.'],
    ['computeIfAbsent may call the function twice', 'ConcurrentHashMap applies it at most once per key; the problem is touching other keys inside it.'],
  ]),
];

export const limiter = [
  step('Capacity 10, refill 5 per second. At t = 0 a script sends 12 requests. How many pass?', [], 1, [
    ['5', '5 is the refill rate. A full bucket allows a burst of its capacity.'],
    ['10', 'Right. The bucket starts full; requests 11 and 12 are rejected.'],
    ['12', 'Nothing refills in zero elapsed time.'],
  ]),
  step('After that burst, nothing happens until t = 1.2 s, except one request allowed at t = 200 ms and one rejected at 300 ms. How many tokens are available at 1.2 s?', [
    row('Time (ms)', [0, 200, 300, 1200]),
  ], 2, [
    ['6', 'The token at 200 ms was spent, leaving half a token at 300 ms.'],
    ['4', 'Refill continues from 300 ms: 900 ms × 5 per second = 4.5 tokens, on top of the half.'],
    ['5', 'Right. 0.5 at 300 ms plus 4.5 more by 1.2 s. The integer units make this exact: 500 + 4500 = 5000 = 5 tokens.'],
    ['10', 'The bucket refills at 5 per second; it isn’t full yet.'],
  ]),
  step('Sixteen threads call allow("k") 1,000 times each with a frozen clock. How many succeed, and what guarantees it?', [], 0, [
    ['Exactly 10: refill, check and take happen in one synchronized step, and computeIfAbsent gives the key one bucket', 'Right. Either race — two buckets for one key, or two threads taking one token — would let more through.'],
    ['About 10, depending on scheduling', 'A correct limiter is exact. The checker asserts 10, not roughly 10.'],
    ['16 — one per thread', 'Threads share the key’s bucket. The bucket has 10 tokens.'],
  ]),
];

export const drills = [
  step('Splitwise “simplify debts” — A owes B ₹30, B owes C ₹30. What is the algorithmic core?', [], 1, [
    ['Dijkstra over the debt graph', 'There are no shortest paths to find. Only net positions matter.'],
    ['Net out per-person balances, then repeatedly pay the biggest creditor from the biggest debtor', 'Right. A −30, B 0, C +30 settles in one transfer, A → C. Pairwise IOU cancellation can’t see through B.'],
    ['Topological sort of the debts', 'Debts can form cycles, and order isn’t the question.'],
    ['Union-find on participants', 'Grouping who knows whom doesn’t compute who pays how much.'],
  ]),
  step('BookMyShow: two users pick seat F7 in the same 100 ms. Your in-memory design guards this how?', [], 1, [
    ['First come wins at payment time', 'Both may pay, which is how the F7 photograph happened.'],
    ['An atomic hold with a TTL under the show’s lock; payment then confirm, or the hold expires and releases', 'Right. The parking lot’s tryAssign shape, plus time.'],
    ['A global lock on the show while anyone browses', 'Browsing would block every other customer for minutes.'],
    ['Let both book; refund one later', 'Overselling is the bug, not a strategy.'],
  ]),
  step('Chess: where does move legality live?', [], 1, [
    ['One Board.isLegal with a switch over piece type', 'Every new piece edits it, and check logic tangles with geometry.'],
    ['Pieces own their movement geometry; Board owns blocking, check and turn order', 'Right. Split by what each rule needs to see.'],
    ['In the Player class', 'Players choose moves; they don’t define what is legal.'],
  ]),
  step('The logger’s appenders write to disk on the caller’s thread and a slow disk stalls the app. The fix?', [], 1, [
    ['Buffer in a StringBuilder and flush every 100 lines', 'The 100th caller still waits for the disk, and a crash loses the buffer silently.'],
    ['An async appender: a bounded queue to one worker, with an explicit overflow policy', 'Right. Producer-consumer; the graded detail is what happens when the queue fills.'],
    ['Log less', 'The ERROR line at 2 a.m. still has to be written.'],
  ]),
  step('A thread-safe LRU cache: which statement is true?', [], 2, [
    ['A ReadWriteLock is ideal because gets are reads', 'get reorders the list, so it is a write.'],
    ['ConcurrentHashMap alone makes it safe', 'The linked list is not protected, and the map and list must change together.'],
    ['One exclusive lock around get and put is correct', 'Right. Production caches relax exact recency to allow more parallelism.'],
  ]),
  step('Rate limiter: a partner needs “at most 100 in any 60 seconds”. Which algorithm keeps that promise?', [], 2, [
    ['Fixed window counter', '100 at 00:59 and 100 at 01:00 is 200 in two seconds.'],
    ['Token bucket with capacity 100', 'A full bucket plus refill can exceed 100 in a 60-second window.'],
    ['Sliding window log', 'Right. It counts exactly the requests in (now − 60 s, now], at the cost of storing up to 100 timestamps per key.'],
  ]),
  step('Elevator: the interviewer adds a second car. What changes?', [], 0, [
    ['A new dispatcher strategy above the cars; Elevator is unchanged', 'Right. Per-car scheduling and cross-car dispatch are different reasons to change.'],
    ['Elevator.step() learns about the other car', 'Then every new car type or policy edits the car.'],
    ['LookScheduler picks a car as well as a floor', 'The scheduler answers “where next for this car”; mixing in “which car” couples two decisions.'],
  ]),
  step('Vending machine: the machine is Collecting and the operator presses “out of service”. What should happen?', [], 1, [
    ['Go out of service; keep the credit for later', 'A customer would walk away without their money.'],
    ['IllegalStateException: refund the customer first', 'Right. Collecting doesn’t allow it; the operator cancels (refund) first, then takes it out of service from Idle.'],
    ['Refund silently and go out of service', 'Possible as a design, but it hides a transition; here the table says Collecting allows insert, select and cancel only.'],
  ]),
];
