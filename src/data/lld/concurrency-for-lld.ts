import { row, step } from '../../lib/trace.ts';

// Decision puzzles and hint ladders for src/lld-lessons/concurrency-for-lld.mdx.
// Every number quoted here is recomputed by tests/java/concurrency-for-lld/Check.java.

export const hints: Record<string, [string, string, string]> = {
  board: [
    'How many variables does the invariant free + occupied == capacity mention? How many atomic steps did the old code take to change them?',
    'Two AtomicIntegers give two separate atomic steps. A reader can land between them. OccupancyBoard keeps both ints behind one private lock.',
    'The check (free == 0), both updates and the reader’s snapshot all hold the same lock, so no thread can see half an update.',
  ],
  queue: [
    'Which existing method already waits with a deadline? Mirror it.',
    'The same lock, the notEmpty condition, awaitNanos, and a signal to notFull after removing.',
    'Loop while empty: if the time left is <= 0 return null, otherwise nanos = notEmpty.awaitNanos(nanos). Then poll, signal notFull, return.',
  ],
  lru: [
    'What else is waiting for the cache’s lock while the camera takes 300 ms?',
    'get under the lock; on a miss release it, call the loader, then put under the lock.',
    'Accept that two gates may load the same plate once each — or deduplicate with a map of in-flight CompletableFutures and computeIfAbsent.',
  ],
  limiter: [
    'What does System.nanoTime() promise about its origin?',
    'Nothing: it measures elapsed time from an arbitrary origin, which may be negative.',
    'With lastRefill = 0 and a negative now, (now - 0) is a large negative refill: the bucket starts deep in debt. Reading the clock in the constructor makes the first elapsed time zero.',
  ],
  fizzbuzz: [
    'At any moment exactly one thread should be allowed to print. How many permits does that need?',
    'Three semaphores: zero starts with one permit, odd and even with none.',
    'Zero prints, then releases odd or even depending on i. Odd or even prints, then releases zero. One permit circulates.',
  ],
  lot: [
    'Is the sign part of a decision, or just a display?',
    'An AtomicInteger free: decrement after a successful tryAssign, increment after release.',
    'Each update is atomic but the counter and the bays are two things: the sign may lag by a car. If the count must gate entry, reserve first with a CAS loop, then assign.',
  ],
  perClient: [
    'Two first requests from the same app arrive together. How many buckets get created?',
    'A ConcurrentHashMap from client to TokenBucket, filled with computeIfAbsent.',
    'computeIfAbsent creates exactly one bucket per client; call tryAcquire on the returned bucket outside the compute function.',
  ],
  exitOnce: [
    'Both gates see OPEN. What has to become atomic — the charge, or the state change?',
    'An AtomicReference<State> with OPEN, CLOSING, CLOSED. compareAndSet(OPEN, CLOSING) picks one winner.',
    'Only the winner charges. On success set CLOSED; if the charge throws, set OPEN again so the ticket can be retried.',
  ],
  dashboard: [
    'The invariant is revenue == 20 × cars. How many values does it mention, and how many atomic steps change them?',
    'One immutable record Totals(cars, revenue) behind one AtomicReference.',
    'carPaid uses updateAndGet to build a new Totals with both fields changed; readers get() one record and see both from the same moment.',
  ],
};

export const races = [
  step('carsIn is 41. Gate A and Gate B each run carsIn++ at the same moment, interleaved as read, read, write, write. What is carsIn afterwards?', [
    row('Step', ['A reads', 'B reads', 'A writes', 'B writes'], { 0: '41', 1: '41', 2: '42', 3: '42' }),
  ], 1, [
    ['43', 'That is the right answer for two cars — and what the code fails to produce. Both gates read 41 before either wrote.'],
    ['42', 'Right. Both read 41, both compute 42, both store 42. Two cars, one increment: a lost update.'],
    ['41', 'Both gates do write; they just write the same value. The count goes up by one, not zero.'],
    ['It throws', 'Nothing throws. Lost updates are silent, which is why they reach production.'],
  ]),
  step('park() calls spot.isFree(), then spot.assign(plate). Both methods are synchronized. Is park() safe?', [], 2, [
    ['Yes — both methods are synchronized', 'Each call is atomic, but the lock is released between them. Two gates can both pass isFree() before either assigns.'],
    ['Yes — assign is fast, so the window is tiny', 'A tiny window is still a window. Oona’s rig hits it thousands of times in 200,000 rounds.'],
    ['No — check-then-act spans two calls; it must be one atomic step like tryAssign', 'Right. The invariant spans both steps, so both steps must happen under one lock (or one CAS).'],
  ]),
  step('Which of these is a data race in the memory-model sense?', [], 0, [
    ['Two threads write a plain int field with no lock, volatile or other happens-before ordering', 'Right. A data race is conflicting accesses (at least one write) not ordered by happens-before.'],
    ['Two threads call synchronized isFree() then synchronized assign()', 'Every access here is ordered by the monitor, so there is no data race — but it is still a race condition, a timing bug.'],
    ['Two threads read the same final field', 'Reads don’t conflict with reads, and final fields are safely published.'],
  ]),
];

export const visibility = [
  step('The poller loops while (!stopRequested) on a plain boolean. The control room sets it to true. What does the JMM guarantee?', [], 2, [
    ['The poller stops within a few milliseconds', 'Nothing orders the write before the poller’s reads, so no promise of visibility exists.'],
    ['The poller stops when the CPU cache is flushed', 'The JMM is not about caches. Without a happens-before edge the JIT may even hoist the read out of the loop.'],
    ['Nothing — the poller may never see the write', 'Right. With no happens-before edge the loop is allowed to run forever. On HotSpot it often does.'],
  ]),
  step('carsIn is now volatile. 8 threads run carsIn++ 100,000 times each. What does the total look like?', [], 1, [
    ['Exactly 800,000 — volatile makes it thread-safe', 'Volatile makes each read and write visible. ++ is still read, add, write: three steps that can interleave.'],
    ['Usually well short of 800,000', 'Right. The checker sees it lose updates every run. Use AtomicInteger or LongAdder.'],
    ['More than 800,000', 'An increment can be lost, never duplicated: each thread adds one per iteration at most.'],
  ]),
  step('Double-checked locking without volatile on the instance field. What can another thread see?', [], 0, [
    ['A non-null reference to an object whose constructor writes are not yet visible', 'Right. The reference write can become visible before the field writes. volatile adds the edge that forbids it.'],
    ['Two different instances', 'The synchronized block’s second check prevents two builds. The danger is visibility, not mutual exclusion.'],
    ['A NullPointerException inside synchronized', 'The lock is never the problem here. The fast path reads the field without it.'],
  ]),
];

export const locks = [
  step('OccupancyBoard is a public class. Why lock a private final Object rather than this?', [], 1, [
    ['A private lock is faster', 'Both are the same kind of monitor. The difference is who else can take it.'],
    ['Outside code holding a reference could synchronize on the board and stall every gate', 'Right. A private lock means only the board’s own methods can ever hold it.'],
    ['synchronized(this) is not allowed in public classes', 'It compiles. It just hands your lock to every caller.'],
  ]),
  step('PlateCounter does synchronized (count) { count++; } with an Integer count. 8 threads, 100,000 increments each. Result?', [], 2, [
    ['Exactly 800,000', 'count++ makes the field point at a new Integer, so the next thread locks a different object. Two threads “own” two locks.'],
    ['It deadlocks', 'Nobody waits for anybody: each thread locks whatever object the field points to at that moment.'],
    ['Lost updates — the checker sees fewer than 800,000 every run', 'Right. Lock on a private final object that never changes, not on the value you are changing.'],
  ]),
  step('TicketLog.addAll is synchronized and calls the synchronized add() on the same object. What happens?', [], 0, [
    ['It works — intrinsic locks are reentrant, the hold count goes up and down', 'Right. A thread can re-acquire a monitor it already holds.'],
    ['It deadlocks on itself', 'That would be true of a non-reentrant lock. Java’s monitors and ReentrantLock are reentrant.'],
    ['It throws IllegalMonitorStateException', 'That exception is for wait/notify without holding the monitor, not for re-entering it.'],
  ]),
];

export const rlocks = [
  step('The self-test holds the gate lock for 40 s. Which call lets a driver get “busy, use the south gate” after 100 ms?', [], 1, [
    ['synchronized (gate)', 'A thread entering synchronized waits forever and can’t be interrupted.'],
    ['lock.tryLock(100, MILLISECONDS)', 'Right. It returns false after the timeout instead of waiting.'],
    ['lock.lock()', 'lock() waits indefinitely, like synchronized.'],
    ['new ReentrantLock(true)', 'Fairness changes the order waiting threads get the lock, not whether they wait.'],
  ]),
  step('A thread holding the read lock of a ReentrantReadWriteLock asks for the write lock. What happens?', [], 2, [
    ['It upgrades atomically', 'ReentrantReadWriteLock has no upgrade. That is a StampedLock feature (tryConvertToWriteLock), and even there it can fail.'],
    ['It throws IllegalStateException', 'Nothing throws; that is what makes the bug nasty.'],
    ['It waits for all readers to leave — including itself — forever', 'Right. Release the read lock first, or design so you take the write lock from the start. Downgrading (write → read) is allowed.'],
  ]),
  step('After an optimistic read, StampedLock.validate(stamp) returns false. What must the reader do?', [], 0, [
    ['Discard the copies and re-read under a real read lock', 'Right. A writer got in, so the copied fields may be torn. The checker’s readers always see free + occupied == capacity this way.'],
    ['Use the copies anyway; they are at most one write old', 'They may be a mix of two states, which is exactly the torn read the invariant forbids.'],
    ['Call validate again until it returns true', 'The stamp is from the past; it will never become valid again. Take a new stamp or a read lock.'],
  ]),
];

export const atomics = [
  step('freeSpots is 1. Two threads run tryReserve() at once. Both read 1. What happens?', [
    row('freeSpots', [1], { 0: 'both read' }),
  ], 2, [
    ['Both reserve; freeSpots becomes -1', 'compareAndSet(1, 0) can only succeed once: after the first, the value is 0, not 1.'],
    ['Both fail and return false', 'One CAS succeeds. Only the loser re-reads.'],
    ['One CAS succeeds; the other fails, re-reads 0, and returns false', 'Right. The checker sends 32 threads × 1,000 attempts at 100 spots: exactly 100 succeed.'],
  ]),
  step('A metrics counter is incremented by 64 threads on every request and read once a minute. Best choice?', [], 1, [
    ['AtomicLong', 'Correct, but every increment fights over one variable; under heavy contention CAS retries pile up.'],
    ['LongAdder', 'Right. It stripes the count across cells. sum() is not a snapshot while updates continue, which a once-a-minute metric doesn’t need.'],
    ['volatile long', 'count++ on a volatile loses updates.'],
    ['synchronized method', 'Correct but serialises 64 threads on one lock for a number nobody reads often.'],
  ]),
  step('You pass a function to updateAndGet that also writes a log line. What can go wrong?', [], 0, [
    ['Under contention the function may run several times, so the log shows updates that never happened', 'Right. The docs say the function should be side-effect-free because it may be re-applied.'],
    ['Nothing — updateAndGet runs the function exactly once', 'It runs a CAS loop: a failed CAS means another call of your function.'],
    ['It deadlocks', 'There is no lock to deadlock on; the cost is retries.'],
  ]),
];

export const maps = [
  step('ConcurrentHashMap counts; 16 threads run counts.put(k, counts.get(k) + 1) 2,000 times each on one key. Final count?', [], 1, [
    ['Exactly 32,000 — the map is concurrent', 'Each call is atomic; the pair isn’t. Two threads read the same n and both write n + 1.'],
    ['Usually less than 32,000', 'Right. The checker loses visits every run. Fix: counts.merge(k, 1, Integer::sum).'],
    ['It throws ConcurrentModificationException', 'ConcurrentHashMap never throws that; the bug is silent.'],
  ]),
  step('A receipt template is expensive to build. 16 threads ask for the same garage at once. Which call builds it exactly once?', [], 2, [
    ['if (!cache.containsKey(g)) cache.put(g, build(g))', 'Both threads can miss, both build. The checker sees several builds per key.'],
    ['cache.putIfAbsent(g, build(g))', 'Only one value is kept, but every thread still calls build() first — the expensive part runs many times.'],
    ['cache.computeIfAbsent(g, this::build)', 'Right. The function runs only when the key is absent, atomically, so each garage is built once.'],
  ]),
  step('Inside a computeIfAbsent function you call a remote service that takes 2 seconds. What is the risk?', [], 0, [
    ['Other updates to the map can block while it runs', 'Right. Keep compute functions short: load outside, then putIfAbsent.'],
    ['None — the map is lock-free', 'Compute functions run while the bin is locked; other writers to it wait.'],
    ['The value is computed twice', 'computeIfAbsent runs the function at most once per absent key; the cost is blocking, not duplication.'],
  ]),
];

export const publication = [
  step('Tariff is a record with a Map field. The constructor does not copy the map. Is the tariff immutable?', [], 1, [
    ['Yes — record fields are final', 'Final means the field can’t point elsewhere. The map it points to can still change.'],
    ['No — whoever kept the map can still change it; copy with Map.copyOf', 'Right. Records give shallow immutability. The checker edits the caller’s map and confirms the tariff doesn’t change.'],
    ['Only if the map is a HashMap', 'Any mutable map shared with a caller breaks immutability.'],
  ]),
  step('16 threads each call raiseCarRate(1) 1,000 times on a TariffBoard starting at 20. Final car rate?', [], 2, [
    ['Somewhere between 20 and 16,020', 'updateAndGet retries on a failed CAS, so no raise is lost.'],
    ['1,020', 'All 16 threads’ raises count, not just one thread’s.'],
    ['16,020', 'Right. 20 + 16 × 1,000. The checker confirms it exactly.'],
  ]),
  step('Which of these is NOT a safe way to publish an object to other threads?', [], 3, [
    ['Store it in a volatile field', 'Safe: the volatile write happens-before the read that sees it.'],
    ['Store it in a final field of a properly constructed object', 'Safe: JLS 17.5 final-field semantics.'],
    ['Put it in a ConcurrentHashMap', 'Safe: putting into a concurrent collection happens-before taking it out.'],
    ['Assign it to a plain field and hope', 'Right — not safe. Another thread may see the reference before the object’s fields.'],
  ]),
];

export const pools = [
  step('ThreadPoolExecutor(core 4, max 8, ArrayBlockingQueue(100), CallerRunsPolicy). 109 blocking tasks are submitted. Where does task 105 go?', [
    row('Tasks', ['1–4', '5–104', '105–108', '109']),
  ], 1, [
    ['Into the queue', 'The queue already holds 100 tasks (5–104); it is full.'],
    ['A new thread, the 5th', 'Right. Threads beyond core start only when the queue is full. Tasks 105–108 start threads 5–8.'],
    ['Rejected', 'Rejection comes only when the pool is at max and the queue is full — that is task 109.'],
    ['It waits for a core thread', 'Executors don’t make submitters wait; they queue, grow or reject.'],
  ]),
  step('And task 109?', [], 0, [
    ['Runs on the thread that submitted it', 'Right. CallerRunsPolicy turns rejection into back-pressure: the producer slows to the pool’s pace.'],
    ['Throws RejectedExecutionException', 'That is AbortPolicy, the default — not the policy configured here.'],
    ['Is silently dropped', 'That is DiscardPolicy.'],
  ]),
  step('The stolen-car check waits 90 ms and computes 10 ms per request, on 8 cores. Starting thread count?', [], 2, [
    ['8', 'That is the CPU-bound answer. Most of this work is waiting.'],
    ['16', 'The ratio is 90 / 10 = 9, not 1.'],
    ['80', 'Right. 8 × (1 + 90/10) = 80 — then cap by what the downstream can take, and measure.'],
    ['800', 'That would assume 99 ms of waiting per 1 ms of compute.'],
  ]),
  step('scheduleAtFixedRate runs a refill every second. One run throws. What happens to later runs?', [], 1, [
    ['They continue; the exception is logged', 'Nothing is logged, and nothing continues.'],
    ['They are all suppressed; the task is done', 'Right. The docs say so and the checker confirms it. Catch inside the task.'],
    ['The executor shuts down', 'Other tasks keep running; only this periodic task dies.'],
  ]),
];

export const futures = [
  step('Fee takes 40 ms; discount takes 40 ms but sometimes 9 s. Which shape gives a quote in about 40 ms on a bad day?', [], 2, [
    ['fee.get(), then discount.get()', 'On a bad day the second get() waits 9 s (or forever without a timeout).'],
    ['fee.thenCompose(f -> discount)', 'thenCompose is for a step that depends on the first result; here the calls are independent, and it still waits for the slow discount.'],
    ['Both supplyAsync, discount with completeOnTimeout(0, 200 ms), then thenCombine', 'Right. Both run in parallel, and the discount falls back to 0 after 200 ms.'],
  ]),
  step('fee = 60, discount = 20. What does quote() complete with?', [], 1, [
    ['60', 'That is the fallback when loyalty is slow or broken.'],
    ['40', 'Right. thenCombine applies max(0, 60 − 20).'],
    ['80', 'The discount is subtracted.'],
  ]),
  step('A supplyAsync task throws IllegalStateException. What does exceptionally() receive?', [], 1, [
    ['The IllegalStateException itself', 'supplyAsync completes the future with a CompletionException wrapping it — the checker asserts this.'],
    ['A CompletionException whose cause is the IllegalStateException', 'Right. Unwrap with getCause() before inspecting.'],
    ['Nothing — exceptionally only sees checked exceptions', 'It sees any Throwable that completed the stage.'],
  ]),
];

export const coord = [
  step('The lot opens only when 3 gates pass their self-check, once, at 6 a.m. Which class?', [], 0, [
    ['CountDownLatch(3)', 'Right. Each gate counts down once; opening awaits with a timeout. One-shot is exactly what’s needed.'],
    ['CyclicBarrier(3)', 'A barrier makes the gates wait for each other; here the opener waits for them, once.'],
    ['Semaphore(3)', 'A semaphore bounds how many may proceed at once; it doesn’t wait for N events.'],
  ]),
  step('Every night 3 gates tally, then the totals are added before anyone starts the next night. Which class?', [], 1, [
    ['CountDownLatch(3)', 'A latch can’t be reset; you’d need a new one every night and someone to create it safely.'],
    ['CyclicBarrier(3, sumAction)', 'Right. It resets after each round and runs the action once per round, after all arrive and before any leave.'],
    ['Thread.join()', 'Joining ends the threads; the gates must keep going night after night.'],
  ]),
  step('3 EV chargers, 20 cars. A buggy path calls release() without a successful acquire(). What happens?', [], 2, [
    ['IllegalStateException', 'Semaphore permits aren’t owned; release never checks.'],
    ['Nothing — extra releases are ignored', 'They are not ignored: they add permits.'],
    ['The semaphore now has 4 permits: four cars charge on three chargers', 'Right. Release only in the finally of a successful acquire.'],
  ]),
];

export const queues = [
  step('BoundedQueue, capacity 2, full. A producer calls put(). What happens?', [
    row('Queue', ['A', 'B'], { 0: 'head' }),
  ], 1, [
    ['It throws IllegalStateException', 'That is add() on a BlockingQueue. put() waits.'],
    ['It waits on notFull until a take() makes room', 'Right. That wait is back-pressure. The checker confirms put is still blocked after 100 ms and finishes right after a take.'],
    ['It overwrites the oldest item', 'Nothing is ever overwritten; that would lose tickets.'],
  ]),
  step('Why does put() signal notEmpty and not notFull?', [], 0, [
    ['A put can only help consumers, who wait on notEmpty', 'Right. Two conditions let each side wake only its counterparts.'],
    ['It should signal both to be safe', 'Waking producers after a put only makes them re-check and sleep again.'],
    ['signal on notFull would deadlock', 'It wouldn’t deadlock; it would just wake the wrong side.'],
  ]),
  step('In MonitorQueue (one monitor for producers and consumers), what goes wrong if notifyAll() becomes notify()?', [], 2, [
    ['Nothing; notify is just faster', 'notify wakes one arbitrary waiter on the shared monitor — possibly the wrong kind.'],
    ['Items get duplicated', 'Items are moved under the monitor; nothing duplicates them.'],
    ['A consumer can wake another consumer while every producer sleeps — the queue stalls', 'Right. With one wait set for two roles, notify can lose the wake-up that mattered.'],
  ]),
];

export const deadlock = [
  step('Thread 1 runs transfer(asha, ben); thread 2 runs transfer(ben, asha). Each locks from, then to. What can happen?', [
    row('Locks', ['T1 holds Asha', 'T2 holds Ben']),
  ], 1, [
    ['One waits briefly, then both finish', 'Each now waits for the lock the other holds, and neither will let go.'],
    ['Deadlock: circular wait', 'Right. All four Coffman conditions hold. The checker finds it with ThreadMXBean.findDeadlockedThreads() within milliseconds.'],
    ['Livelock: both retry forever', 'Nobody retries; both are BLOCKED.'],
    ['The JVM throws DeadlockException', 'There is no such exception. Deadlocked threads just stay blocked.'],
  ]),
  step('Which change breaks the circular wait?', [], 0, [
    ['Always lock the wallet with the lower id first', 'Right. With one global order, no thread can hold a higher lock while waiting for a lower one.'],
    ['Make balance volatile', 'Visibility isn’t the problem; the lock order is.'],
    ['Use a fair lock', 'Fair threads still wait for each other in a cycle.'],
  ]),
  step('Two tryLock transfers back off for exactly 1 ms each time they fail, and keep colliding. What is this, and the fix?', [], 2, [
    ['Deadlock; use synchronized', 'They aren’t blocked; they keep running and failing. synchronized would turn it into a real deadlock.'],
    ['Starvation; use a fair lock', 'Both are equally unlucky; it’s their lock-step timing that repeats.'],
    ['Livelock; randomise the backoff', 'Right. Random jitter breaks the lock-step.'],
  ]),
];

export const lru = [
  step('An LRU cache is a LinkedHashMap in access order. Can get() run under a ReadWriteLock’s read lock?', [], 1, [
    ['Yes — get is a read', 'In access order, get moves the entry to the tail: it rewrites the linked list.'],
    ['No — get mutates the recency list, so it needs the exclusive lock', 'Right. Concurrent “readers” would relink the list at once and corrupt it.'],
    ['Yes, if the map is a ConcurrentHashMap', 'ConcurrentHashMap has no access order. You’d lose LRU entirely.'],
  ]),
  step('The coarse lock is the bottleneck. Which next step trades exact LRU order for throughput?', [], 2, [
    ['A fair lock', 'Fairness slows it down further.'],
    ['volatile fields in the linked list', 'Visibility doesn’t make multi-pointer relinking atomic.'],
    ['Striped segments by key hash, or Caffeine-style buffered reads replayed in batches', 'Right. Recency becomes approximate; say so out loud.'],
  ]),
];

export const limiter = [
  step('Capacity 5, refill 2 per second, frozen clock. 32 threads call tryAcquire() 1,000 times each. How many succeed in total?', [], 0, [
    ['5', 'Right. The bucket starts full with 5 and the clock never moves, so nothing refills.'],
    ['32', 'Each thread doesn’t get its own bucket.'],
    ['160', 'The bucket is shared: 5 tokens in total.'],
    ['More than 5, because of races', 'tryAcquire is synchronized; refill and spend are one step. The checker counts exactly 5.'],
  ]),
  step('Same bucket, empty. The clock moves 500 ms. How many tryAcquire() calls succeed?', [], 1, [
    ['0', '0.5 s × 2 per second refills one whole token.'],
    ['1', 'Right. (500 ms / 1,000) × 2 = 1.0 token.'],
    ['2', 'That would take a full second.'],
  ]),
  step('Then the clock moves 10 seconds. How many succeed now?', [], 2, [
    ['20', '10 s × 2 = 20 would be refilled, but the bucket never holds more than capacity.'],
    ['21', 'Neither the refill nor the leftover can exceed capacity.'],
    ['5', 'Right. Math.min(capacity, …) caps the bucket at 5.'],
  ]),
];

export const turns = [
  step('Print in Order: third() is started first. With two CountDownLatches, what does it do?', [], 1, [
    ['Prints “third” immediately', 'It awaits secondDone before printing.'],
    ['Waits on secondDone, which only counts down after second() prints', 'Right. The latches chain the happens-before edges: first → second → third.'],
    ['Throws because first() hasn’t run', 'Nothing throws; await just blocks.'],
  ]),
  step('PingPong: fooTurn starts with 1 permit, barTurn with 0. The bar thread starts first. What happens?', [], 0, [
    ['bar blocks on barTurn until foo prints and releases it', 'Right. One permit circulates, so the order is foo, bar, foo, bar no matter who starts.'],
    ['bar prints first', 'barTurn has no permit until foo releases one.'],
    ['Both block forever', 'fooTurn starts with a permit, so foo can always go first.'],
  ]),
  step('FizzBuzz uses one Condition for four threads. Why signalAll() rather than signal()?', [], 2, [
    ['signalAll is faster', 'It is slower: it wakes threads that will go back to sleep.'],
    ['signal() would throw with four waiters', 'It wouldn’t throw; it would pick one waiter.'],
    ['signal() might wake a thread whose number it isn’t; it waits again and the right thread is never woken', 'Right. Four roles on one condition need signalAll (or four conditions).'],
  ]),
];

export const lot = [
  step('First answer to “make park thread-safe”, with 25 minutes left?', [], 0, [
    ['One lock around tryPark and unpark — correct, then narrow it if asked', 'Right. Coarse first, say why it’s correct, then push locks down to the invariant owners.'],
    ['A lock-free design with CAS everywhere', 'Harder to get right under time pressure, and graders want to hear the coarse answer first.'],
    ['volatile on every field', 'Volatile doesn’t make check-then-act atomic.'],
  ]),
  step('Fine-grained: a bay holds AtomicReference<String> occupant. Two gates call tryAssign on the same free bay. Outcome?', [], 1, [
    ['Both win', 'compareAndSet(null, plate) can succeed only once; after it, the value isn’t null.'],
    ['Exactly one wins; the other moves on to the next bay', 'Right. The CAS is the check and the act in one step.'],
    ['Both lose', 'The first CAS succeeds.'],
  ]),
  step('release() does occupant.compareAndSet(plate, null) with the plate string read at the exit gate. What goes wrong?', [], 2, [
    ['Nothing — CAS compares with equals()', 'AtomicReference compares references with ==.'],
    ['It frees the wrong bay', 'It frees no bay at all.'],
    ['The exit gate’s String is a different object, the CAS silently fails, and the bay stays taken', 'Right. CAS on identity you own, or clear the bay once the lot owns the claim.'],
  ]),
];

export const drills = [
  step('ConcurrentHashMap<String, Integer> counts; two threads run counts.put(k, counts.get(k) + 1). Thread-safe?', [], 1, [
    ['Yes — ConcurrentHashMap synchronizes all access', 'Each call is atomic; the pair is a compound action.'],
    ['No — get-then-put is a compound action; fix with counts.merge(k, 1, Integer::sum)', 'Right. Thread-safe structure ≠ thread-safe usage. The single most common concurrency-interview trap.'],
    ['No — but only on JDK 8 and older', 'The JDK version doesn’t change it.'],
    ['Yes if the key is immutable', 'Key immutability is about hashing, not about atomic read-modify-write.'],
  ]),
  step('In the bounded queue, why while (items.isEmpty()) notEmpty.await() instead of if?', [], 1, [
    ['Style convention from Doug Lea', 'It’s a correctness requirement; the if version returns null in the checker thousands of times.'],
    ['Spurious wakeups exist, and another consumer may take the item between your wake-up and getting the lock back', 'Right. The condition must be rechecked after every wake-up.'],
    ['while is needed only with notifyAll, and we use signal', 'signal doesn’t hand over the lock; barging and spurious wakeups still happen.'],
    ['if would not compile with Condition', 'It compiles — that is why it ships.'],
  ]),
  step('Parking lot: 200 spots, one ReentrantLock around park(). Correct but slow. Best next move?', [], 1, [
    ['volatile fields on each spot', 'Visibility doesn’t make check-then-act atomic.'],
    ['Push locking down to the invariant owner: per-spot tryAssign (synchronized or CAS), and an atomic counter for capacity', 'Right. Lock granularity = the object that owns the invariant. Coarse first, then narrow: that order is graded.'],
    ['Use a thread pool so fewer threads contend', 'The gates are still independent callers; the lock is the bottleneck.'],
    ['Make everything immutable', 'A bay’s occupant genuinely changes; immutability doesn’t fit here.'],
  ]),
  step('transfer(A,B) and transfer(B,A) on two threads, each synchronizing on from then to. What happens and what is the fix?', [], 1, [
    ['One waits, then proceeds — locks queue fairly', 'Each waits for the other’s lock forever.'],
    ['Deadlock (circular wait); acquire locks in a global order by id, or tryLock with a timeout', 'Right. Diagnose with a thread dump: two BLOCKED threads, each owning the monitor the other wants.'],
    ['Livelock: both retry forever', 'Nothing retries; they block.'],
    ['The JVM detects the cycle and throws DeadlockException', 'It doesn’t. Deadlocked threads stay blocked.'],
  ]),
  step('A shutdown flag is written by one thread and read in another thread’s loop. Cheapest correct tool?', [], 0, [
    ['volatile boolean', 'Right. One variable, one writer, plain reads and writes: visibility is the only disease.'],
    ['AtomicBoolean with compareAndSet', 'Works, but there is no read-modify-write to protect.'],
    ['synchronized getter and setter', 'Works, but heavier than needed.'],
    ['Nothing — booleans are atomic', 'Atomic writes don’t imply visibility. The loop may never see it.'],
  ]),
  step('An executor is built with Executors.newFixedThreadPool(8). Under a traffic spike, what fails first?', [], 2, [
    ['It starts more than 8 threads', 'A fixed pool never exceeds 8.'],
    ['It rejects tasks with RejectedExecutionException', 'Its queue is unbounded, so it never rejects.'],
    ['The unbounded queue grows until memory runs out', 'Right. Use a ThreadPoolExecutor with a bounded queue and a rejection policy.'],
  ]),
  step('A tariff is read 10,000 times a second and changed twice a year. Best design?', [], 3, [
    ['synchronized getter', 'Every read takes a lock for a value that almost never changes.'],
    ['ReadWriteLock', 'Better, but still a lock acquisition per read.'],
    ['volatile fields for each rate', 'Readers could see the new car rate with the old bike rate.'],
    ['An immutable Tariff record behind an AtomicReference', 'Right. Reads are one volatile load; a change swaps the whole value at once.'],
  ]),
  step('Your 3-charger semaphore once reported 4 cars charging. Most likely cause?', [], 1, [
    ['The semaphore is not fair', 'Fairness affects order, not the number of permits.'],
    ['release() ran on a path where acquire() failed or never ran', 'Right. Permits aren’t owned; a stray release creates one.'],
    ['Semaphore is not thread-safe', 'It is. The bug is in how it’s used.'],
  ]),
];
