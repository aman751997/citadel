# Quiz re-check after length rebalance: tag `lld` (2026-10-19)

Scope: src/lld-lessons/*.mdx (8 lessons, 123 questions) and the 5 Mastery quizzes (15 questions). 138 reviewed: 135 OK, 3 FIXED (wording softened, answers unchanged).
Method: solved each stem blind first, then compared with `answer`; read every option explain (marker convention, explain matches option); recomputed numbers. Java re-run (javac/java 17-style snippet): `1.10+2.20==3.30` false (3.3000000000000003); equals-without-hashCode `map.get(new K(1))` null; `AtomicReference.compareAndSet(new String("KA-01"), null)` false, same reference true; LocalTime 23:00 step 30 min never ends (00:00, 00:30, 01:00 ...); record with List component: size 1, hashCode changed; 10000/3 = 3333, x3 = 9999; ArrayList remove inside for-each: ConcurrentModificationException. Concurrency questions keep "can happen" wording; earlier stress runs are in docs/qa/quiz-review-lld.md.
Mastery facts checked against chapter text only (no new project facts).
Checks: `check-quiz-integrity` 0 problems (138 questions); `quiz-balance-src` mean ratio 0.97, longest 23% / shortest 28% overall.

| lesson | quiz ids | Qs | verdict | note |
|---|---|---|---|---|
| solid | srp, ocp, lsp, composition, isp, dip, dials | 14 | OK | all answers agree with blind solve |
| object-modeling | 14 quizzes | 28 | OK | runs above; BK-2 id gap confirmed in lesson demo text |
| creational-patterns | cp-* | 17 | FIXED (1) | DCL Q1 option 0 explain said the write "does become visible eventually" (a guarantee the JMM does not give) -> "In practice the write shows up soon. The documented danger is seeing the reference too early." |
| structural-patterns | sp-* | 21 | OK | flyweight `occupied` is a final (intrinsic) field in the lesson code, so option explain holds |
| behavioral-patterns | bp-* | 27 | OK | |
| concurrency-for-lld | cl-* | 9 | OK | |
| machine-coding-protocol | mcp-checkpoint | 3 | OK | |
| classic-problems | classic checkpoint | 4 | OK | |
| mastery/ai-pipeline llm-engineering | llm-as-component | 2 | OK | 40.3 s/10.2 s, 8.3 tok/s, 154 s, 18 GB, BAA all in chapter |
| mastery/ai-pipeline question-bank | qb-basic x3 | 7 | FIXED (1) | Q17 option explain "Nothing a merge writes depends on which document finished first" overclaimed (chapter drill 1 names the profile row as a last-writer risk) -> "The profile row is the one place where parallel merges could collide at higher concurrency (see drill 1)." |
| mastery/reporting-engine request-lifecycle | acme | 3 | OK | |
| mastery/reporting-engine security-deep-dive | re-security | 3 | FIXED (1) | explain "The validator does not check the privacy block" was not stated in the chapter -> "The chapter found no server-side minimum, so nothing rejects a value of 0."; also "field names, operators and bounds" -> "field names and query shape (counts and limits)" (chapter wording) |

COULD NOT VERIFY: "the checker sees this on the first run" (concurrency L792 option explain) depends on the lesson's own checker, not re-run here; Effective Java Item 1 vs Factory Method distinction not re-checked against the book (carried from earlier review).
