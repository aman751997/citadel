# Quiz balance sd2 (caching, queues-streams, load-balancing, blob-cdn, search)

Date 2026-10-19. 150 questions. Measured with `node scripts/quiz-balance-src.mjs` (reads the MDX source). Targets: correct-is-longest 20-40%, correct-is-shortest 15-40%, mean length ratio 0.9-1.3.

## Before and after

| lesson | n | longest before | longest after | shortest after | ratio before | ratio after |
|---|---|---|---|---|---|---|
| caching | 34 | 94% | 29% | 26% | 2.73 | 1.01 |
| queues-streams | 28 | 86% | 29% | 21% | 2.34 | 1.03 |
| load-balancing | 29 | 97% | 21% | 28% | 3.54 | 1.01 |
| blob-cdn | 40 | 93% | 28% | 18% | 3.50 | 1.03 |
| search | 19 | 89% | 37% | 21% | 3.22 | 1.05 |
| total | 150 | 92% | 28% | 23% | 3.08 | 1.03 |

Rewritten: options and explains of 144 of 150 questions (compared with HEAD; no `answer` or stem changed). Left as they were: `qs-why-async#0`, `qs-lag#0`, `qs-sizing#0`, `blob-ch15#0` (numeric answers whose wrong values already come from specific mistakes), `blob-ch2#0` (mapping options of equal length), `search-like#0` (code options of 6-9 chars). Method: new options/explains written per question, applied by a script that re-parses the literal and asserts the old text matches before replacing.

All numbers put in options were recomputed in Python: 50,000/84 = 595, /56 = 893, /48 = 1,042; 5% of 400,000 = 20,000; mod 4 vs mod 5 keeps 20% (so 80% move), mod 10 vs mod 11 keeps 1/11; 28,232/1,000 = 28.2 s; 20 x 86,400 x 30 = 51.8 TB, x3 = 155.5 TB; BM25 1.375 vs 2.174 (1.58x); 200 GB / 10,000 / 1,000 / 100,000 = 20 / 200 / 2 MB; 128 x 0.5 / 20 = 3.2 and 128 / 20 = 6.4; 30 GB/s x 5% / 1% = 1.5 / 0.3 GB/s.

## Five representative rewrites

1. caching-why-cache #0 (hit ratio at 400k reads/s)
   - before wrong: "Fine: 95% is still a high hit ratio" / "The database sees 40,000 misses/s and overloads"; correct: "The database sees 20,000 misses/s: right at its limit with no headroom, so aim for about 97% or better" (102 chars vs 35 and 47)
   - after wrong: "Fine: 5% of 400,000 is 10,000 misses/s, which is only half the limit of the database" / "The database sees 40,000 misses/s, double its limit, because traffic doubled"; correct: "The database sees 20,000 misses/s, exactly its limit, so aim for 97% or better". Each wrong option now names the arithmetic slip and the explain says which number was misused.
2. qs-sizing #1 (30-day retention)
   - before wrong: "Nothing: retention is free" / "Use peak rate so it is safe"
   - after wrong: "About 52 TB of disk (20 MB/s x 86,400 s x 30)..." (forgot replication 3) / "About 155 GB of disk (...)" (MB read as GB). Correct: "About 155 TB ... so weigh tiered storage or a lake".
3. lb-connections #1 (ephemeral ports)
   - before wrong: "Nothing: 1,000 is far below 28,232" / "The backend runs out of memory first"
   - after wrong: "Nothing: 1,000 connections per second is far below the 28,232 ports available" / "After about 60 s, once TIME_WAIT expires, the proxy starts failing connections" (plausible misreading of the 60 s TIME_WAIT). Correct: "After about 28 s the proxy runs out of source ports and new connections fail".
4. blob-ch11 #0 (Cache-Control headers)
   - before: correct `public, max-age=60, s-maxage=86400` against `max-age=86400`, `no-store`, `private, max-age=86400`
   - after: all four are full headers of similar length: swapped values (`max-age=86400, s-maxage=60`), `s-maxage=60`, and `private, ... s-maxage=86400` (private forbids shared caches, so the CDN would not store it).
5. search-final #2 (cluster destroyed)
   - before correct (130 chars): "Reindex everything from the primary DB: search was a derived copy, never the source of truth, and is degraded (not down) meanwhile" vs 48/55/50
   - after correct (91): "Reindex everything from the primary DB: search is a derived copy and runs degraded meanwhile"; wrong options are "Restore from the latest snapshot, then accept the loss of every change made after it was taken", "The search data is gone for good, so rebuild what you can from application logs and backups", "Fail over to a hot standby cluster, which every search design must keep running at all times".

## Notes and limits

- Cue words: the right option no longer carries all the hedges or trade-off clauses; several wrong options now carry "only", "always", "never", parentheses or "so ..." clauses. Justification moved from the correct option into its `explain`.
- Two distractors rewritten to remove accidental defensibility: `lb-affinity #1` (IP hash would partly spread a hot key, replaced by "rendezvous hashing", which also maps a key to one server); `caching-cache-down #1` (the fail-open distractor now says sessions are rebuilt from user rows, which is impossible if they lived only in Redis).
- `blob-drills #3` correct option reworded ("your own deletes are not undone") because the old "durably kept too" was confusing; same meaning.
- Not balanceable without changing the question: the six left unchanged above. `search-prefix #0` has list answers of different sizes, so its length balance is weak (11/30/20 chars); its third option was changed from "None" to a plausible list.
- Tests run: `tests/quiz-shuffle.test.ts`, `tests/revision.test.ts`, `tests/lesson-check.test.ts`: 18 pass. No build was run.
