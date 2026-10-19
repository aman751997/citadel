# Quiz rebalance, tag sd3

Lessons: url-shortener, rate-limiter, typeahead, pattern-realtime, pattern-fanout.
Method: every question with 3+ options had its options rewritten (correct option tightened, wrong options rewritten to the same length, specificity and tone) and the `explain` entries updated so each stays true. The answer index, option count, ids, `why` and all earlier-verified facts were kept. Numbers in new options were recomputed by hand (62^6 = 56.8B, 62^7 = 3.52T, 100M x 365 = 36.5B/year, 62,500/5,000 = 12.5, 20M/30 = 667K, 5% of 50M / 60 = 41,667, 6,400/64 = 100, 1 - 0.99^200 = 87%).
Measured with `node scripts/quiz-balance-src.mjs` (MDX source, no build).

| Lesson | n | longest before -> after | ratio before -> after | shortest after |
|---|---|---|---|---|
| url-shortener | 27 | 89% -> 26% | 4.59 -> 1.00 | 26% |
| rate-limiter | 45 | 84% -> 29% | 2.65 -> 0.99 | 16% |
| typeahead | 31 | 90% -> 23% | 2.52 -> 1.01 | 19% |
| pattern-realtime | 44 | 89% -> 27% | 2.74 -> 1.03 | 16% |
| pattern-fanout | 35 | 94% -> 23% | 4.93 -> 0.99 | 23% |
| TOTAL | 182 | 89% -> 26% | 3.38 -> 1.01 | 19% |

Questions left untouched (already balanced, short fixed-format answers): url-shortener #24 numeric was reformatted only; rate-limiter #4, #17, #31, #41 (numeric or one-word options); typeahead #1; pattern-realtime #6, #23, #27, #31, #33 (numeric / one-word options); pattern-fanout #7 (lists of post ids).

## Five representative rewrites

1. url-shortener, "Product wants six characters":
   before: correct (171 chars) "Six characters give 56.8 billion codes and we create 182.5 billion in five years, so six runs out in about 1.5 years. Seven gives 3.5 trillion, about 5% full at five years"; wrong "Use twelve to be safe" (21).
   after: correct "Six gives 56.8 billion codes and runs out in about 1.5 years; seven gives 3.5 trillion" (86); wrong "Six is fine, since 56.8 billion codes comfortably cover five years of new links" and "Keep six characters and recycle the codes of expired links whenever the space gets close to full".
2. rate-limiter, "Redis is down, password attempts": before wrong "It does not matter for logins" (29) vs correct 93; after wrong "Either choice is fine for logins, since a short outage affects attackers and users alike" (explain: it matters most for logins, credential stuffing is the threat).
3. typeahead, "Which sentence is a finished requirement?": before wrong "Use a trie for the suggestions" (30) vs correct 119; after wrong "Store suggestions in a prefix trie with a precomputed top-10 list at each node, held in memory" (93) vs correct "Top 10 completions of the typed prefix, p99 under 100 ms, ranked by decayed distinct-user popularity".
4. pattern-realtime, "Pick the mechanism for 5M live-score viewers": before wrong "Polling every 500 ms" (20), "Kafka consumers on each phone" (29) vs correct 94; after "Polling every 500 ms, because it is the simplest transport to run at that scale" and "Kafka consumers inside each phone app, reading the scores topic directly" vs correct "SSE: one-way push with no upstream traffic, simpler infra and the same instant delivery".
5. pattern-fanout, "Interviewer asks for one more thing in 2 minutes": before wrong "Discuss the colour of the app" (joke option, 29); after "Redraw the architecture diagram so that every box and arrow is labelled with its protocol" (explain: adds detail but not the failure story).

## Notes
- Joke or strawman options removed (for example "colour of the app", "reinstall the app", "It will not go down"). They were replaced by realistic mistakes.
- Distractors that make claims about products (Redis value size, InnoDB locking, ZADD, Redis Cluster tags) have explains that state the true behaviour already used in the lesson. The "Redis limits each value to a few kilobytes" distractor (pattern-fanout #32) is false and the explain says values can be far larger than a post body (Redis allows up to 512 MB; check current docs).
- Not rebuilt, not tested: the coordinator must run the build. No test files touched.
- The lesson claims themselves were not re-verified in this task (only the quiz options and their explains were rewritten).
