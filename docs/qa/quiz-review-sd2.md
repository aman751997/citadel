# Quiz review sd2 (caching, queues-streams, load-balancing, blob-cdn, search)

Date 2026-10-19. 81 quizzes, 150 questions. OK 135, FIXED 15, REWRITTEN 0. No answer index changed.
Method: solved each question first, then compared; recomputed every number in Python; ran Redis 7 (maxmemory 2mb) and MySQL 8.0 (throwaway containers, removed) for the two behaviour claims.

## Non-OK rows

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| caching | caching-stampede | 1 | FIXED | Stem had no 10,000; options and explain used it. Stem now says 10,000 requests across 200 servers. |
| caching | caching-stampede | 3 | FIXED | Option-0 explain was muddled ("single TTL would hurt only after the TTL"). Now: entry stays in Redis to minute 15, outage ends at 14. |
| caching | caching-hot-keys | 2 | FIXED | "A moment stale" made 1 s L1 defensible. Stem now: delete must take effect at once, no extra stale window. |
| queues-streams | qs-why-async | 2 | FIXED | "Oldest-message-age is a standard metric on every broker" over-claimed (Kafka has offset lag only). Now names SQS ApproximateAgeOfOldestMessage and Kafka consumer lag. |
| queues-streams | qs-idempotency | 1 | FIXED | Ran on mysql:8.0: first upsert ROW_COUNT 1, repeat 0 (no-op ON DUPLICATE KEY UPDATE). `why` now notes CLIENT_FOUND_ROWS reports 1 (lesson already says so). |
| queues-streams | qs-lag | 2 | FIXED | Stem said "missing two days"; with `latest` the consumer skips all 9 days, including the 7 still on disk. Stem says "days of data"; explain says `earliest` would lose only the 2 deleted days. |
| load-balancing | lb-why-balance | 1 | FIXED | 50,000/48 = 1,041.7 req/s = 104%, so "about 100%" became "Over 100% ... about 1,042 req/s each". |
| blob-cdn | blob-ch1 | 1 | FIXED | 99.5% needs the 1 KB-per-row assumption (4 TB / 4.02 TB). Stated in the option. |
| blob-cdn | blob-ch3 | 2 | FIXED | 5.5 PB x 3 = 16.5 PB, not 16.4. Fixed in the option, the lesson table and the summary diagram (3 places). |
| blob-cdn | blob-ch15 | 1 | FIXED | Explains for options 602 and 603 described the wrong values ("position divided by one"). 602 is position minus one, 603 is the position with the divide forgotten. |
| search | search-relevance | 2 | FIXED | 2.1739/1.375 = 1.581, so 58% more, not 57%. |
| search | search-inverted | 1 | FIXED | "Running shoes" has no stop words; explain now says that instead of "query not analysed". |
| search | search-sync | 2 | FIXED | "About 42 minutes" had no grounding in the stem; added 50M listings at 20,000 docs/s (50M/20,000 = 2,500 s = 41.7 min). |
| search | search-prefix | 1 | FIXED | Answer depends on the OR operator; stem now states the default OR. |
| search | search-final | 1 | FIXED | "Plain LIKE is never the answer" -> "on a big table is not the answer". |

## Verified facts (evidence)

| claim | where | method | result |
|---|---|---|---|
| Redis default maxmemory-policy is noeviction; at maxmemory writes fail, reads and PING still work | caching-eviction Q1 | redis:7 with `--maxmemory 2mb`, 40 SETs of 100 KB | VERIFIED: policy `noeviction`; 8 OK, 32 `OOM command not allowed when used memory > 'maxmemory'`; GET and PING worked |
| mod 4 -> mod 5 remaps ~80% of keys | caching-clusters Q1 | python: h%4==h%5 for h in 0..19 holds for 4 of 20 | VERIFIED |
| mod 10 -> mod 11 keeps 1/11 | lb-affinity Q1 | same method, lcm 110: 10 of 110 stay | VERIFIED |
| No-op upsert row count | qs-idempotency Q1 | mysql:8.0 `ROW_COUNT()` | VERIFIED (1, then 0) |
| 30,000/400 = 75 s; 6,000,000/6,000 = 1,000 s; 28,232/1,000 = 28 s; 1/0.7 = 1.43, 1.5x zone loss; 128 KB x 0.5 / 20 KB = 3.2; 0.05x30 = 1.5, 0.01x30 = 0.3; 603//4 = 150; 20x86,400x30x3 = 155.5 TB; 5.5x1.4 = 7.7 PB; BM25 1.375 / 2.174 | various | Python | VERIFIED |

## COULD NOT VERIFY (no network or heavy setup)
- blob-ch8: current S3 lifecycle default of skipping objects under 128 KB for IA/Glacier IR transitions (my recollection is that it exists since 2024). The quiz scenario ("someone transitions all of them") is about billing; consider a "check current docs" hedge.
- blob-ch4: S3 presigned POST honouring a client-supplied SHA-256 checksum field. Left as written.
- search-inverted Q1 and search-prefix Q1: reasoned from standard Elasticsearch behaviour, not run against a cluster.

## Pattern note
About 80% of questions have the correct answer at index 1 and it is usually the longest option. The Quiz component does not shuffle. Consider shuffling at render time or rebalancing answers.
