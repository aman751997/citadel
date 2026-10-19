# Quiz balance: TAG lld (src/lld-lessons + src/mastery)

Measured with `node scripts/quiz-balance-src.mjs <path>` (correct-is-longest %, mean length ratio correct/others). Option count, `answer` indices (checked against HEAD), ids and `why` unchanged.

| File | n | before longest / ratio | after longest / ratio |
|---|---|---|---|
| lld/behavioral-patterns | 27 | 85% / 2.25 | 0% / 0.96 |
| lld/classic-problems | 4 | 100% / 4.22 | 0% / 1.05 |
| lld/concurrency-for-lld | 9 | 67% / 2.18 | 33% / 0.85 |
| lld/creational-patterns | 17 | 71% / 1.98 | 35% / 1.01 |
| lld/machine-coding-protocol | 3 | 100% / 5.27 | 0% / 1.02 |
| lld/object-modeling | 28 | 86% / 2.79 | 39% / 0.99 |
| lld/solid | 13 | 92% / 1.97 | 23% / 1.02 |
| lld/structural-patterns | 21 | 57% / 1.48 | 19% / 0.91 |
| mastery/llm-engineering | 2 | 100% / 2.73 | 0% / 0.95 |
| mastery/question-bank | 7 | 100% / 2.09 | 14% / 1.00 |
| mastery/request-lifecycle | 3 | 100% / 1.42 | 33% / 0.97 |
| mastery/security-deep-dive | 3 | 100% / 1.28 | 0% / 0.99 |
| TOTAL | 137 | 79-100% / 2.31 | 23% / 0.97 |

Questions rewritten: about 115 of 137 (questions whose correct option was already not the longest and ratio <= 1.3 were left as is).

## Five representative rewrites
1. object-modeling "equals() without hashCode()": correct `Usually null, because the hash codes differ and equals is never called` (70 chars) vs `It throws an exception` (22) -> `Usually null: the hash codes differ, so equals is never called` (62) vs `It throws IllegalStateException because the hash codes disagree` (61).
2. concurrency "ConcurrentHashMap get then put": correct 114 chars vs 27-47 -> correct `No: get then put is two steps, so both threads can read 5 and write 6` (68) vs `Yes: every ConcurrentHashMap call locks the whole map while it runs` (67); the merge fix moved into the explain.
3. structural "which pattern" (Proxy/Decorator/Adapter/Facade, 5-9 chars) -> parallel `Decorator, adding retry around the call` (39) vs `Proxy, controlling access to the call` (37).
4. classic Splitwise: correct 184 chars vs 49-61 -> all four options `<technique>; wrong answer is <mistake>` at 74-86 chars.
5. mastery question-bank "consumer crashes": correct 151 chars -> `The message is unacked and redelivered; every write is a replace` (64); the webhook idempotency-key detail moved into the explain (chapter text unchanged); distractors stay generic and add no new project facts.

## Notes
- Mastery distractors reuse only claims already in the chapter text (including the Wrong/Correct explains); no new project facts were introduced. Unverified/Implemented labels in the chapters were not touched.
- Every changed wrong-option explain was rewritten to say what breaks. Product claims in distractors (e.g. constant folding of 1.10 + 2.20 gives the same double sum; ReadWriteLock read lock admits several threads at once; LocalTime.plus wraps at midnight) are standard Java behaviour. Only 1.10 + 2.20 == 3.30 was re-run (java printed false and 3.3000000000000003).
- Not balanced to exactly 31%: behavioral/classic/machine-coding landed at 0% longest (correct is never the single longest), which is a small opposite cue. Left as is, within target.
