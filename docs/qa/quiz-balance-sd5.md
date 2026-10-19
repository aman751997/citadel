# Quiz rebalance, tag sd5

Method: `node scripts/quiz-balance-src.mjs <lesson>` (reads MDX source). Targets: correct-is-longest <= 40%, mean length ratio <= 1.3. Rewrites were applied with a small throwaway script that replaced the `options` and changed `explain` entries of each 3+ option question in place (script verified the old arrays parsed before replacing). Questions with short numeric or code-output options that were already parallel were left unchanged (rag 4/6/8/12/20/24, llm-inference none, llm-gateway 9, feature-flags 4/6, recsys 7/9/18, pattern-sync-collab 2/11/18).

## Metrics (before -> after)

| Lesson | n | correct longest | length ratio | questions rewritten |
|---|---|---|---|---|
| pattern-sync-collab | 33 | 88% -> 24% | 2.95 -> 1.00 | 30 |
| llm-inference | 27 | 100% -> 30% | 3.44 -> 1.02 | 27 |
| rag | 29 | 79% -> 17% | 2.70 -> 1.02 | 23 |
| llm-gateway | 27 | 96% -> 30% | 2.61 -> 1.01 | 26 |
| feature-flags | 31 | 94% -> 23% | 2.29 -> 1.02 | 29 |
| recsys | 26 | 88% -> 31% | 3.01 -> 1.02 | 23 |
| Total | 173 | 91% -> 25% | 2.82 -> 1.02 | 158 |

The script's later "shortest" column was also checked: no lesson has the correct option as the single shortest more than 11% of the time except llm-gateway and recsys at 4% (low, not a problem).

## Representative rewrites

1. rag #1 (outdated refund window). Before: correct 85 chars vs wrong 51 / 38 ("Use a larger model so it is less likely to be wrong", "Add 'be accurate' to the system prompt"). After: correct "Retrieve current policy passages at question time and require citations" vs "Switch to a model with more parameters and a newer training cutoff" and "Tell the system prompt to double-check dates and policy windows before answering".
2. llm-inference #26 (KV cache size). Before: correct had a formula (54 chars), wrong options were bare 12-char values. After: every option carries a formula (`327,680 bytes per token x N tokens`), wrong values are specific mistakes (1K context, 4K context, K and V counted twice = 21.5 GB). Recomputed: 335,544,320 / 1,342,177,280 / 10,737,418,240 / 21,474,836,480 bytes.
3. feature-flags #23 (sample size). Before: "It doubles" / "stays about the same" vs "roughly quadruples, to about 230,000". After: doubles (115,000), quadruples (230,000), grows about 8x (460,000). Recomputed: 57,600 x 4 = 230,400, x 8 = 460,800.
4. recsys #16 (Thompson sampling). Before wrong option "P is never shown, because its mean is lower" contradicted the numbers (P's Beta(1,3) mean is 0.25, Q's is about 0.10). After: "P is never shown, because Q's belief is already narrow and confident", with an explain that says a wide belief still draws above Q's often enough.
5. pattern-sync-collab #16 (OT divergence). Before: "Both bXc" (10 chars) vs two 22-char options. After: all three options are the same shape ("Alice ..., Bob ...: both screens match / the screens diverge"), same length.

## Notes

- Several distractors were reworded because the old wrong option was defensible or inconsistent with the question (feature-flags #1 now says "counts once" for the shared-service reading, recsys #16, recsys #5 where "the ranker is miscalibrated" could plausibly follow a retrain, rag #11 where "the embedding model changed on its own" is not strictly impossible for a hosted model). Each now has a distinct, concrete wrong claim and a true explain.
- Where a wrong option states product behaviour (browser SSE, LoRA/INT4 sizes, adapter swap), the explain only states widely known behaviour. INT4 70B is about 35 GB (70e9 x 0.5 bytes), so forty variants are about 1.4 TB: recomputed.
- Not changed: lesson prose, `why`, option counts, `answer` indices, ids, Java blocks. Ran `node --experimental-strip-types --test tests/quiz-shuffle.test.ts tests/lesson-check.test.ts`: 9 pass.
- COULD NOT VERIFY: no new product facts were introduced, so nothing needed external verification. The existing claim "about 25% false positives at 20 looks" (feature-flags #30 explain) is carried over unchanged and is not verified here.
- Existing question to review (not changed): feature-flags #1 asks for "best-case availability" yet its own `why` says the calls fail together; the 99.9% option is defensible under perfect correlation.
