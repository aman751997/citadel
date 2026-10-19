# Quiz option shuffling

Problem: most correct answers were option index 1 (pattern-sync-collab 32 of 33).

## Fix (render time)
- `src/lib/quiz-shuffle.ts`: `permutation`, `answerPosition`, `quizOrders` (seeded Fisher-Yates; seed = quiz `id`, else page path + first question text, plus question index). For a quiz with 3+ questions and 3+ options each, if the correct answer would land at the same position everywhere, the last movable question is re-drawn (salted seed, up to 32 tries).
- `src/components/Quiz.astro`: buttons are rendered in shuffled order, but `data-idx`, `data-answer`, stored picks (`citadel-quiz-v1:...`), revision hooks and the explain list stay in ORIGINAL (author) index space. No migration needed. The `<noscript>` list keeps author order with the correct option marked.
- Escape hatches: `fixed: true` per question, `shuffle={false}` per quiz. Documented in `docs/INTERACTIVE_COMPONENTS.md`.
- Tests: `tests/quiz-shuffle.test.ts` (determinism, true permutation, answer mapping, even spread over 4000 seeds within 15%, fixed untouched, never-all-same over 3000 seeds, stability). Run with the other three suites: 22 pass, 0 fail.

## Positional references fixed (scan of ~604 Quiz blocks in 61+ files by pattern: option/choice letters, first/second/previous/other option, above/below, same mistake, both/neither, all/none of; hits read by hand, almost all were about scenario items A/B/C or code, not options)
1. src/dsa-lessons/linked-lists.mdx: why "Both other options need O(n) extra space" -> names sorting a copy and a HashSet.
2. src/lessons/pattern-sync-collab.mdx: explain "Same mistake from the other side: ..." -> stands alone.
3. src/lessons/caching.mdx: explain "Same problem: one database write per view..." -> stands alone.
4. src/lessons/search.mdx: explain "Same problem: any single sort key..." -> names popularity.
5. src/lessons/llm-inference.mdx: explain "Also off by a factor of 10..." -> states the 200 GB / 12,000 GB/s = 17 ms arithmetic.

## Marked `fixed: true` (catch-all or inclusive options)
- src/lessons/search.mdx (Only A / A and C / All three)
- src/lessons/pattern-partitioning.mdx (... All of them)
- src/lessons/databases.mdx (Only A / Only B / Both A and B / Neither)
- src/lessons/url-shortener.mdx (... All three)
- src/dsa-lessons/intervals.mdx (i / j / Both)
- src/lld-lessons/structural-patterns.mdx (two: ... None of them; Bridge/Strategy/Both equally/Neither)

No "all of the above" / "none of the above" literals exist. Not marked: plain "Both ..."/"Neither ..." options that carry content (shuffle is fine).

## Not verified
No site build or browser run (per brief). Look at in the browser: a quiz with `explain` (pick wrong, check correct row/tag), reload (picks persist and map to the same option), /review/ revisit item after a wrong pick, a `fixed` quiz (databases.mdx A/B question stays in order), view-source noscript block.
Known limit: the correct option is still often the longest; shuffling does not fix that.
