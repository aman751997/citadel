# Nudge recheck (blind re-solve of the 37 quiz questions changed by the balance nudge)

Diff base: `git diff cd98c46 HEAD -- 'src/**/*.mdx'`, restricted to quiz questions whose options or explain changed (36 multi-line/inline questions plus concurrency-for-lld 1 inline question; question-bank-with-model-answers Q1 explain changed by a different pass, checked too). Total 38 questions.

Tools run: javac/java (backtracking, Two Sum II, AtomicReference CAS, binary-search loop modes), python3 (arithmetic, Unique Paths II), throwaway `mysql:8.0` container `vfy-nudge-mysql` (EXPLAIN plans, CHECK subquery), MySQL 8.0 manual fetched 2026-10-19 (quote). Container removed afterwards.

| file | quiz id / location | Q# (source line) | verdict | what I ran |
|---|---|---|---|---|
| dsa-lessons/backtracking | line 778 | Combination Sum sort | OK | Java: unsorted [2,7,3] target 5 with break returns [] (misses [2,3]); sorted gives [[2,3]] |
| dsa-lessons/backtracking | line 934 | used[] vs start | OK | Java: permutations reachable incl. [2,1,3] |
| dsa-lessons/backtracking | line 1981 | Permutations II prune | OK | Java: at root i=1, used all false, pruned (printed) |
| dsa-lessons/backtracking | line 2005 | Partition K, big first | OK | reasoning, explain matches option |
| dsa-lessons/binary-search | line ~161 | last index <= target hang | OK | Java: round-down + lo=mid loops (50-iter cap hit); round-up and lo=mid+1 finish |
| dsa-lessons/binary-search | line ~1302 | get(lamp, 8) | OK | reasoning: first >= 8 is time 10 |
| dsa-lessons/dp-2d | line 1497 | Burst Balloons last | OK | reasoning |
| dsa-lessons/dp-2d | line 2097 | Unique Paths II rock (0,1) | OK | Python: pre-filled row [1,0,1] gives goal 2, true answer 1 |
| dsa-lessons/intervals | line 381 | insert into sorted ledger | OK | lesson convention: touching merges (line 264, 346) |
| dsa-lessons/intervals | line 767 | sort order for non-overlapping | OK | reasoning, counter-examples true |
| dsa-lessons/two-pointers | line ~588 | Two Sum II left <= right | OK | Java: [3], 6 returns [1,1], no exception |
| dsa-lessons/two-pointers | line ~1210 | Merge Sorted Array from back | OK | reasoning (same comparisons either way) |
| lessons/databases | line 78 | NoSQL for everything | OK | reasoning |
| lessons/databases | line 94 | one-sentence reason | OK | reasoning |
| lessons/databases | line 190 | DynamoDB orders | OK | DynamoDB has TransactWriteItems; 120 writes/s small |
| lessons/databases | line 330 | FK without index | OK | InnoDB auto-creates the index (explain true) |
| lessons/databases | line 512 | double-booking room | OK | MySQL: CHECK with subquery rejected (ERROR 3815) |
| lessons/databases | line 528 | denormalised starts_at | OK | reasoning |
| lessons/databases | line 810 | status <> filesort | OK | MySQL EXPLAIN: Using filesort; with (seller_id, created_at, status) backward index scan, no filesort; status IN (...) still filesort |
| lessons/databases | line 843 | tag page index | OK | MySQL EXPLAIN on (tag_id, created_at) + PK(photo_id, tag_id): Backward index scan; Using index |
| lessons/databases | line 930 | flush_log_at_trx_commit=2 | OK | MySQL 8.0 manual text: "Transactions for which logs have not been flushed can be lost in a crash"; up to one second |
| lessons/llm-gateway | line 388 | cheaper model routing | OK | Python: 0.4 + 0.6*0.2 = 0.52, saving 48% |
| lessons/llm-gateway | line 1066 | handbook caching | OK | reasoning |
| lessons/llm-gateway | line 1082 | timestamp breaks prefix cache | OK | reasoning (prefix match from start) |
| lessons/llm-gateway | line 1376 | sampling plan | OK | reasoning (90% of failing requests dropped by 10% head sampling) |
| lessons/recsys | line 375 | 2B vectors | OK | reasoning |
| lessons/recsys | line 1001 | 3 likes / 12 views | OK | Python: 3/12 = 25% |
| lessons/recsys | line 1148 | concentration guardrail | OK | reasoning |
| lessons/recsys | line 1622 | cache recs for a day | OK | reasoning |
| lld/behavioral-patterns | line 303 | carrier strategy | OK | reasoning |
| lld/behavioral-patterns | line 595 | Template Method vs Strategy | FIXED | explain said "Two data types and two formats" though stem has one data set: now "One subclass per pair multiplies: two data types and two formats already give four classes, and it only grows." |
| lld/behavioral-patterns | line 987 | enum transition table | OK | reasoning |
| lld/behavioral-patterns | line 1334 | duplicate command | OK | reasoning |
| lld/behavioral-patterns | line 1802 | publish before commit | OK | reasoning |
| lld/concurrency-for-lld | cl-atomic-refs | Q2 CAS new String | OK | Java: compareAndSet(new String("KA-01"), null) = false; same reference = true |
| lld/creational-patterns | line 397 | factory switch vs OCP | OK | reasoning |
| lld/creational-patterns | line 1240 | Builder private ctor | OK | reasoning |
| mastery/ai-pipeline/question-bank | line 47 | where clinical text lives | OK | explain consistent with rag-layer lesson wording (vectors + tsvector in Postgres, raw text in S3); that DB-side claim itself was not re-verified here |

Counts: 38 reviewed, 37 OK, 1 FIXED (explain wording only), 0 unresolved. No answer index, option, id or fixed flag changed.

After: `node scripts/check-quiz-integrity.mjs` on the 12 touched files: 235 questions, 0 problems. `node scripts/quiz-balance-src.mjs`: all files inside longest 15-42% / shortest 12-42% (intervals 42/42, creational 41/32, backtracking 38/27, concurrency 44/39 with n=9, mastery question bank 14/14 with n=7, small-n band 10-50%).
