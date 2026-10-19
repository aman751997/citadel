# Quiz review: LLD (tag `lld`), 2026-10-19

Lessons: object-modeling, solid, creational-patterns, structural-patterns, behavioral-patterns, concurrency-for-lld, machine-coding-protocol, classic-problems.
Scope: 55 quizzes, 123 questions. Each question solved first without the marked answer; every option's explanation read.

## Global finding (all lessons)
Before: 87 of 123 correct answers were option index 1 (middle option). A learner could score well by always picking the second option.
Fix: moved the correct option (and its explain entry, together) to a spread of positions for 107 questions; distractor order kept. Not moved (options depend on order or wording: numeric lists, "Both/Neither/None", "the code above"): 16 questions. After: positions 0/1/2/3 = 37/42/37/7. Check run: in all 123 questions exactly the marked option's explain starts with "Correct".
Fixed: concurrency-for-lld (cl-checkpoint), machine-coding-protocol (mcp-checkpoint) and classic-problems quizzes had no per-option `explain`. Added specific explanations for all 11 questions.

## Runs (Java 17, /tmp scratch, deleted)
| Claim | Method | Result |
|---|---|---|
| 1.10+2.20==3.30 false | javac/java | `false`, sum prints 3.3000000000000003 |
| equals without hashCode: map.get(b) | run | `true null` (usually null; a hash collision could hit) |
| record with List component, caller mutates | run | size 1, hashCode changed |
| EvBay label from base ctor | run | `0 kW` |
| LeakyDraft restore | run (same list clear then addAll) | `[]` (Empty) |
| LocalTime loop 23:00..23:59 step 30 min | run, capped at 6 | 23:00, 23:30, 00:00, 00:30 ... never stops |
| AtomicReference.compareAndSet(new String("KA-01"), null) | run | `false`, same reference then `true` |
| Overload resolution (visitor "some line") | run | `some line` |
| 10000/3, shares, paise | run | 3333, 9999 total, 1 left; 100000/3 = 33333 |
| Lost update, 2 threads x1000 `x++` | stress, 200 trials | wrong total in 1/200 trials (can happen, rare); sequential run gave 2 |
| synchronized isFree()+assign() race | stress, 2 threads over 2,000,000 slots, 3 rounds | both claimed same slot: 55,712 / 37,069 / 11,256 |
| plain check-then-assign (volatile-style) | same | both won: 816,130 / 719,573 / 724,240 per 2,000,000 |
| ConcurrentHashMap get+put | 200 trials | wrong total in 87/200; merge: 0/200 |
| bounded queue `if` vs `while` (4 consumers, signal) | stress | if-version returned null items 296 times; while-version 0 |
| transfer(A,B)/transfer(B,A) | 2000 trials, 200 ms wait | hung in 2/2000 (deadlock can happen, not every run) |
Note: a first attempt (one claim per fresh thread pair, 20,000 trials) never reproduced the check-then-act race because thread start skew hid it; the many-slot test above did. Answers keep "can happen" wording.

## Quiz table (verdict: OK / FIXED / REWRITTEN)
Every quiz below also has the position shuffle noted above (applied unless skipped).

| lesson | quiz id | Qs | verdict | note |
|---|---|---|---|---|
| object-modeling | om-prologue | 2 | FIXED | explain said "patterns are about 10% of the grade" (invented number); now "last and lightest signal". Lesson text "last 10%" changed to "come last and weigh least" |
| object-modeling | om-nouns, om-values, om-entities, om-money, om-time-and-ids, om-invariants, om-tell-dont-ask, om-lifecycle, om-relationships, om-inheritance, om-many-to-many, om-aggregates, om-whole-model | 26 | OK | runs above confirm values, EvBay, record, money split; UTC offsets recomputed (10:00 at +05:30 = 04:30 UTC; London winter = UTC) |
| solid | solid-srp-when-not, ocp-axis, lsp-choose, composition-choose, isp-cut, dip-inject, dials-diagnose | 13 | OK | 3 features = 7 non-empty combinations, correct |
| creational | cp-factory, cp-factory-method, cp-abstract-factory, cp-builder, cp-prototype, cp-singleton, cp-pool, cp-di, cp-compare | 19 | OK | DCL-without-volatile answer worded "can observe" (correct); pool timeout matches lesson code (PoolExhaustedException); Effective Java Item 1 distinction from Factory Method: stated in the lesson, not re-checked against the book |
| structural | sp-decorator | 2 | FIXED | wrong-option explains for "Eight"/"Sixteen" contradicted each other (said 8 is the count after the fourth behaviour); now: 8 = combinations of three behaviours, 16 = lesson's planned subclass count |
| structural | sp-composition, adapter, proxy, facade, composite, bridge, flyweight, compare | 20 | OK | 4+5=9 vs 20 recomputed; flyweight `occupied` is part of the shared key in lesson code so "position is extrinsic" holds |
| behavioral | command-check | 3 | FIXED | Q3 explain said the second run "does not throw; it books again" as a fact; now "do not count on an exception... can simply book again" |
| behavioral | chain-check | 3 | FIXED | Q1 explain said a Set "randomises" order; now "promises no order (Set.of can iterate differently between runs)" |
| behavioral | strategy, template, state, memento, observer, mediator, iterator, visitor | 28 | OK | EqualSplit 9,999; LeakyDraft restore empty; LocalTime loop never ends; fail-fast is best effort per JDK docs (stated in lesson; not re-fetched) |
| concurrency-for-lld | cl-checkpoint | 4 | FIXED | no explain existed (added 4); Q4 said deadlock happens always, now "can deadlock" (measured 2/2000); "checker watches if-version return null thousands of times" replaced by measured wording; "single most common trap" softened |
| concurrency-for-lld | cl-races, cl-atomic-refs, cl-deadlock-sim | 5 | OK | answers match stress and CAS runs |
| machine-coding-protocol | mcp-checkpoint | 3 | FIXED | no explain existed (added 3); removed unsupported "#1 reason submissions fail" |
| classic-problems | (unnamed) | 4 | FIXED | no explain existed (added 4); logback/log4j2 async-appender claim hedged ("check their docs") |

## COULD NOT VERIFY
- Log4j 2 / logback async appender internals (classic-problems logger question): not checked against docs; sentence now hedged.
- Effective Java Item 1 wording and JDK ArrayList fail-fast Javadoc wording: no network source consulted; claims left as in the lesson.
- Greedy Splitwise bound ("at most n-1 transfers") and NP-hardness of minimum transfers: reasoned, not run.
- "Predict" outcomes tied to lesson classes (Command redo cleared, State enum table) rely on the lesson's checked Java blocks, which pass check-java; not re-run separately.
