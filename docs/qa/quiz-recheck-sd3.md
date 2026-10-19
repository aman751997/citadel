# Quiz re-check sd3 (blind re-solve after length rebalance)

Files: url-shortener (27 Q), rate-limiter (45), typeahead (31), pattern-realtime (44), pattern-fanout (35). Total 182 questions.
Method: re-solved each stem; recomputed every number with arithmetic (base62 space 62^6/62^7, birthday bound, 100M x 10 / 1e5 x 3, node counts 62,500 / 5,000 and 104,167 / 5,000, decayed score 1000 x 0.906 + 100, sliding-window estimate 80 x 45/60 + 30, token refill 3 + 4.5 - 1, GCRA tau = 99 x 0.1 and TAT - tau - now, 20M / 5 and /30, 50M x 20 x 100 / 1e5, 500k / 30, 50M / 50K, 5% x 50M / 60, 1.8M x 200 B x 8); cross-checked lesson-body numbers (grep) for the figures cited in explains. Redis/MySQL claims (ON DUPLICATE KEY UPDATE overwrite, utf8mb4 default collation case-insensitive, EXPIRE NX on Redis 7+, ZADD same member = one entry, hash tags in cluster keys, INCR/EXPIRE non-atomic) match docs/qa/sql-redis-verification.md and mysql-redis-remaining.md and general documented behaviour; not re-run in containers.
Integrity: `check-quiz-integrity.mjs` 182 questions, 0 problems. Balance: all five files within bands (longest 23-29%, shortest 16-26%, ratio 0.99-1.03).

| lesson | quiz | Q | verdict | note |
|---|---|---|---|---|
| url-shortener | all 21 quizzes | 27 Q | OK | numbers recomputed; answers unique and true |
| rate-limiter | all 17 quizzes | 45 Q | OK | GCRA, refill, leasing (200,000/100 = 2,000/s), fallback 400x, cluster hash tag all recomputed |
| typeahead | all 15 quizzes | 31 Q | OK | node counts, 0.906 decay, debounce trace, 18K short prefixes (lesson) |
| pattern-fanout | all 15 quizzes | 35 Q | OK | offset=3 trace, 12M vs 600K, 83 s, 41,667 reads/s, 60 TB |
| pattern-realtime | rt-prologue..rt-final (18) | 43 Q | OK | 4M polls/s, 667K heartbeats/s, 16.7K reconnects/s, 1.2 TB, 400 gateways |
| pattern-realtime | rt-final | Q2 (50 WebSocket servers) | FIXED | distractor 0 "broadcast to all 50 servers, whichever holds the socket delivers" was crude pub/sub, defensibly valid; replaced with "send to one gateway at random..." and explain "only about 1 in 50 sends lands on the right gateway" |
