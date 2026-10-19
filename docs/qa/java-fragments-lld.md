# Java fragment blocks (LLD lessons + 4 SD lessons): compile and claim check

Date: 2026-10-19. JDK 17.0.18 (default) and 25.0.1 (for the Java 21+ blocks). Harness and stubs live in /tmp/vfy-javafrag-lld (throwaway, not in the repo). Stubs are in the harness, never in the lessons.

## Method
`scripts/check-java.mjs` skips every ```java fragment block. The harness extracts all 50, tries javac twice (as class members, then as a method body), then classifies:
- COMPILES: 4 (behavioral-patterns:1734 EventBus, behavioral-patterns:2651 BillLine, creational-patterns:526 report copies, feature-flags:356).
- INTENTIONALLY PARTIAL: 43. They only fail because they use types defined elsewhere in the lesson, `/* ... */` or `// ...` placeholders, statements with no enclosing method, or a framework (Spring `@Configuration`). The syntax is valid; the missing parts are the point of the illustration.
- BROKEN (real syntax errors): 3, fixed below. Plus one name clash fixed (Package).
- The 2 Java 21+ blocks (switch patterns, virtual threads) fail on 17 as the lesson already says, and compile and run on JDK 25 (see below).

## Fixes to lesson text/code
| File:line | Before | After | Why |
|---|---|---|---|
| solid.mdx:121 | `"\n" + /* ...layout... */;` | `"\n" + total /* ...and the rest of the layout... */;` | `+ ;` is a syntax error. Now valid, same teaching point. |
| structural-patterns.mdx:739 | `new AccessDeniedException(...)` | `new AccessDeniedException("doctors only")` | `...` is not an expression. |
| structural-patterns.mdx:1308,1312 | `Package` | `ChargeGroup` | `Package` resolves to `java.lang.Package` for anyone who pastes it; matches the compiled composite and behavioral-patterns.mdx note ("Package is taken by java.lang"). |
| behavioral-patterns.mdx:2460 | "occasionally prints a scan twice" | "can print a mix of old and new scans: a list that never existed at any single moment" | CORRECTED, claim false (see below). |

## Failure claims, run
| Claim (file:line) | Method | Result |
|---|---|---|
| Equal split of 100.00 by 3 gives 33.33 x 3 = 99.99 (behavioral:108) | Java: `100.00/3`, round to 2 places | VERIFIED. 3333 paise x 3 = 9999 of 10000; double path prints 99.99. |
| Set.of order is unspecified; the tenant step may land after the query (behavioral:1888) | 6 fresh JVMs printing `Set.of(auth, tenant, validation, rateLimit, dispatch)` | VERIFIED. 6 different orders, e.g. `[validation, auth, tenant, ...]`, `[dispatch, rateLimit, tenant, ...]`. |
| Vending switch with no SOLD_OUT case silently keeps the coin (behavioral:702) | Stub enum + the `insert` switch, mode = SOLD_OUT | VERIFIED. No exception, credit unchanged, no refund path. |
| Ring buffer after 4th scan: newest first, then two older (behavioral:2457) | Stub ring (cap 3), add A,B,C,D | VERIFIED. Raw array = `[D, B, C]`. |
| Reader looping over raw array while the gate writes "occasionally prints a scan twice" (behavioral:2460) | 5,000,000 raw-loop snapshots against a live writer thread | CORRECTED. Duplicate: 0 of 5,000,000 (each scan sits in one slot, so it cannot appear twice). A mix of old and new scans (not 3 consecutive): 190,519 of 5,000,000 (3.8%). Text now says the mix. |
| Racy limiter has two races (classic-problems:2011) | 2,000 rounds x 16 threads x 1,000 calls on one key, frozen clock, HashMap + check-then-act | VERIFIED, but only sometimes: 57 of 2,000 rounds (2.9%) let through a count other than 10 (max 157 in one round); 49 rounds created two buckets for one key; 5 calls threw (corrupted HashMap). Lesson wording ("has two races", test expects exactly 10) is right. |
| Interned literal, `Boolean`, and `Integer++` locks (concurrency:460) | identity checks | VERIFIED. `"gate-lock"` shared, `busy == Boolean.FALSE` true, `count++` gives a different object (also for values above 127). The `boxedLockMess` block next to it is already compiled by the checker. |
| `this` escape: other thread may see `gate == 0` (concurrency:959) | 20,000 runs: spin-reader thread vs constructor | COULD NOT REPRODUCE the failure as written: 0 of 20,000. With a tiny delay between register and assignment: 2 of 20,000. Lesson already says "may", which is right: allowed by the memory model, rare on this machine. No change. |
| check-then-act on ConcurrentHashMap: both told "booked" (machine-coding:536) | 20,000 rounds, 2 threads released by a barrier | VERIFIED, rare: both returned true in 44 of 20,000 (0.2%). The comment describes one possible interleaving; text does not say "always". No change. |
| Overlap check in service: two concurrent requests both save; import door skips the check (object-modeling:2121) | 20,000 rounds, 2 threads; plus a direct import call | VERIFIED. Double booking in 12 of 20,000 (0.06%). Import bypass: always (2 bookings for the same slot). Text says "can be beaten": fine. |
| Replica `save` throws, forcing `instanceof` in callers (solid:845) | Stub store classes | VERIFIED. Without the check: `UnsupportedOperationException`; with it: `IllegalStateException`. |
| 3-level bill is ₹8,000 short; 2 levels correct (structural:1306) | Stub records, room 9000, surgeon 40000, anaesthetist 8000 in a group inside a group | VERIFIED. 3-level: 49,000 vs true 57,000 (8,000 short, silent). 2-level: correct. |
| Naive OT tie rule diverges: "cat!?" vs "cat?!" (pattern-sync-collab:931) | Stub Op, apply both orders | VERIFIED. Alice `cat!?`, Bob `cat?!`. With lower-site-first both give `cat!?`. |
| Rate-limiter bug: 90 ms polls, 100 ms refill, buggy admits 0, correct admits 90 over 9 s (rate-limiter:1247) | Simulation from an empty bucket | VERIFIED. Buggy 0, fixed 90. |
| Per-request `Math.random() < 0.10` flips the same user (feature-flags:356) | 1,000 draws | VERIFIED. 205 changes of variant in 1,000 requests. |
| CSV report sorted, printer report in hash order (creational:526) | HashMap vs TreeMap with 5 doctor names | VERIFIED for that data: orders differ. |
| Zero-Even-Odd semaphore sketch works (concurrency:2025) | Added `n`, ran 3 threads for n = 1..12 | VERIFIED. Output `0 1 0 2 0 3 ...` every time. |
| `poll(timeout, unit)` slots into BoundedQueue and works (concurrency:1585) | Spliced into the lesson's class | VERIFIED. Empty poll returns `null` after about 110 ms for a 100 ms timeout; with an item it returns it. |
| EventBus compiles and routes by type (behavioral:1734) | Ran subscribe/publish | VERIFIED. An `Integer` with no subscriber is silently dropped. |
| Switch patterns over sealed type: exhaustive, new record breaks compile; not valid on 17 (behavioral:2786) | JDK 25 javac, and `--release 17` | VERIFIED. Compiles on 25; adding a `Discount` record gives "the switch expression does not cover all possible input values"; `--release 17` rejects it. |
| Virtual-thread executor block (concurrency:1151) | JDK 25 | VERIFIED compiles and runs. JEP 444 (Java 21) and JEP 491 (JDK 24) dates not re-checked. |

## Not run / could not verify
- concurrency:1036 "9,000 threads then OutOfMemoryError: unable to create native thread": not run (would risk the machine). It is the standard JVM message for hitting the OS thread limit. COULD NOT VERIFY the figure 9,000; it is told as an incident story, not a rule.
- Narrative-only claims (two cars on the ramp, receptionist re-opening a visit, the notifier fakes) are stories with no code behaviour to test.
- The claims "the checker reproduces / builds exactly this version" (creational:762, creational:1989, object-modeling:1075, typeahead:553, rate-limiter:1247) refer to the lessons' own checkers; not re-audited here.
