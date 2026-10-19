# Python snippet verification

Run date: 2026-10-19. Harness: /tmp/vfy-python (throwaway, deleted after the run). Python 3.11 for execution; py_compile also done with the system Python 3.9. 127 ```python blocks extracted from src/lessons/*.mdx and src/mastery/**/*.mdx (line = first code line, in the file as of the end of the run).

Tools: `python3 -m py_compile`, `pyflakes` (installed to a local target dir), real Redis 7 (docker redis:7), real MySQL 8.0 (docker mysql:8.0), real Elasticsearch 8.15.3 (docker, elasticsearch 8.15 Python client), redis-py/pymysql installed with `pip --target`. All containers were removed after the run.

## Summary
- 127 blocks. py_compile OK: 123. Fail: 4 (059 module-level `return`, 118/119/120 top-level `await`/`async with` excerpts). All four are fragments cut out of functions, not bugs.
- Executed: see table (YES). Everything with a real Redis/Lua, MySQL or Elasticsearch dependency was run against the real server.
- Corrected: 5 problems in 6 snippets (C1 to C5 below). Left as sketches / NOT RUN: listed in table.

## Corrections

- C1 `pattern-async-jobs.mdx` (crawler host heap): `r.evalsha(pop_host_sha, 1, "hosts:ready", now_ms, 60_000)` passed the function object; the next line already calls `now_ms()`. After: `now_ms()`. Found by reading; Lua + fixed call run on Redis 7.
- C2 `core-concepts.mdx` `call_with_retries`: slept (up to the cap) after the last failed attempt and then returned. Measured: 4 sleeps for 4 attempts. After: `if attempt == max_attempts - 1: break` before the sleep (3 sleeps). C2b same fix in `rate-limiter.mdx` `call_with_backoff` (5 sleeps, last up to 2x Retry-After, before raising); after: 4 sleeps.
- C3 `llm-gateway.mdx` `Breaker.record`: closing the breaker after a good half-open probe kept the old failures in the window, so with a window full of failures the very next call re-opened it (reproduced: state "open" after probe + one success). After: `self.events = []` in the half-open branch; reproduced state "closed".
- C4 `rate-limiter.mdx` `check_with_fallback`: the local fallback bucket used a hard-coded refill of 0.5/s for every key, though the text derives 0.5/s only for Pro (10/s x 10 / 200). After: `1000 / period_ms * 10 / 200` (0.5 for Pro with period 100 ms). Run with stubbed Redis timeout.
- C5 `llm-gateway.mdx` `CARD` regex `\b(?:\d[ -]?){13,19}\b` swallowed the space after the card number: "Card 4111 1111 1111 1111 and" became "Card [CARD_1]and". After: `\b\d(?:[ -]?\d){12,18}\b`. Checked space-, dash-separated, plain, 13-digit non-Luhn, trailing period.

## Notes (not changed)

- N1 `llm-gateway.mdx` Breaker: prose and docstring say half-open lets "a few probes" through, code closes or re-opens on the first recorded result and allows every call while half-open. Wording left as is.
- N2 `pattern-async-jobs.mdx`/`caching.mdx` single_flight: if the leader raises, waiters get `None` silently.
- N3 `load-balancing.mdx` SIGTERM sketch: if `server` is a stdlib `socketserver` server running `serve_forever` on the main thread, `shutdown()` inside a signal handler on that same thread deadlocks. Labelled sketch, not run.
- N4 `llm-gateway.mdx` `reserve`: the second return value is nonzero even when admitted (time to refill the same cost); only used on 429.
- N5 Python 3.10+ needed for `dict[str,int] | None` in the GCounter snippet (pattern-partitioning). 084 comments that it needs `import uuid`; 023, 013, 016 lack imports shown earlier in the lesson.
- N6 ES: lesson mapping 090 does not define `material`/`category`; the facet snippets assume them as keyword fields.

## Per-snippet table

| # | file:line | py_compile | executed | undefined names (pyflakes, expected placeholders) | result |
|---|---|---|---|---|---|
| 1 | lessons/blob-cdn.mdx:517 | ok | YES | db | RAN with small stubs / fake cursor: behaviour checked (see detail). rejects bad type/size with ValueError; presigned URL generated offline with dummy credentials |
| 2 | lessons/blob-cdn.mdx:646 | ok | NO | db,queue,s3 | NOT RUN: sketch using placeholders db/queue/s3 |
| 3 | lessons/caching.mdx:255 | ok | NO | - | NOT RUN: placeholders (db, r, schedule, change_events); trivial, logic exercised by variants 006/011/017 |
| 4 | lessons/caching.mdx:301 | ok | NO | - | NOT RUN: placeholders (db, r, schedule, change_events); trivial, logic exercised by variants 006/011/017 |
| 5 | lessons/caching.mdx:320 | ok | NO | db,json,r | NOT RUN: placeholders (db, r, schedule, change_events); trivial, logic exercised by variants 006/011/017 |
| 6 | lessons/caching.mdx:336 | ok | YES | db,r | RAN against real Redis 7 (docker) with a fake DB: behaviour matches the text (see detail). 3+1 views flushed to the DB as (3,p1),(1,p2); pending hash drained to 0 |
| 7 | lessons/caching.mdx:450 | ok | NO | change_events,r | NOT RUN: placeholders (db, r, schedule, change_events); trivial, logic exercised by variants 006/011/017 |
| 8 | lessons/caching.mdx:597 | ok | NO | db,r,schedule | NOT RUN: placeholders (db, r, schedule, change_events); trivial, logic exercised by variants 006/011/017 |
| 9 | lessons/caching.mdx:609 | ok | YES | json,r | RAN against real Redis 7 (docker) with a fake DB: behaviour matches the text (see detail). Lua keeps the newest version only (v5, then v3 ignored, v7 wins); TTL 900 s |
| 10 | lessons/caching.mdx:795 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). 10 threads, 1 load, all get the value; _inflight emptied. Note: if the leader raises, waiters silently get None |
| 11 | lessons/caching.mdx:833 | ok | YES | json,load_from_mysql,r | RAN against real Redis 7 (docker) with a fake DB: behaviour matches the text (see detail). 8 concurrent callers -> 1 DB load; lock released; RELEASE with a wrong token keeps the lock |
| 12 | lessons/caching.mdx:872 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). with delta=1 and 0.5 s left, ~60% of calls refresh early; never refreshes with 1000 s left |
| 13 | lessons/caching.mdx:886 | ok | NO | key,r,random,value | NOT RUN: two-line fragment using r/key/value from the surrounding text |
| 14 | lessons/caching.mdx:923 | ok | YES | executor,json,load_from_mysql,r,time | RAN against real Redis 7 (docker) with a fake DB: behaviour matches the text (see detail). stale entry served instantly, exactly one background refresh |
| 15 | lessons/caching.mdx:1030 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). second call within 1 s served from L1, call after 1.05 s reloads |
| 16 | lessons/caching.mdx:1046 | ok | YES | r,random | RAN against real Redis 7 (docker) with a fake DB: behaviour matches the text (see detail). invalidate_hot removes all 8 sub-keys |
| 17 | lessons/caching.mdx:1126 | ok | YES | json,load_from_mysql,r | RAN against real Redis 7 (docker) with a fake DB: behaviour matches the text (see detail). None cached as "__none__" with ttl <= 60; second call served from cache |
| 18 | lessons/caching.mdx:1231 | ok | YES | ServiceBusy,json,load_from_mysql,r,redis | RAN against real Redis 7 (docker) with a fake DB: behaviour matches the text (see detail). breaker opens after 5 Redis failures, miss path still returns data, 50 busy slots then raises ServiceBusy |
| 19 | lessons/core-concepts.mdx:971 | ok | NO | leader,pick_replica,redis | NOT RUN: sketch (leader, pick_replica, redis placeholders) |
| 20 | lessons/core-concepts.mdx:1266 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). 4 attempts, same idempotency key each time. FIXED (C2): used to sleep after the last failed attempt (4 sleeps), now 3 |
| 21 | lessons/core-concepts.mdx:1368 | ok | YES | Overloaded,http | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 22 | lessons/core-concepts.mdx:1459 | ok | YES | Overloaded | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 23 | lessons/feature-flags.mdx:616 | ok | NO | random,requests,time,write_atomically | NOT RUN: placeholder helpers (write_atomically, LRU, events); 023 is an infinite poll loop |
| 24 | lessons/feature-flags.mdx:1087 | ok | NO | LRU,events,time | NOT RUN: placeholder helpers (write_atomically, LRU, events); 023 is an infinite poll loop |
| 25 | lessons/llm-gateway.mdx:209 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). classify returns the 5 labels for 429/529/400+code/401/404 |
| 26 | lessons/llm-gateway.mdx:319 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). filters (context, caps subset, region, provider, open breaker) then sorts by (price, ttft): expected order |
| 27 | lessons/llm-gateway.mdx:434 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). FIXED (C3): after a successful half-open probe the old failures stayed in the window, so the next call re-opened the breaker at once |
| 28 | lessons/llm-gateway.mdx:566 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). slow first call: hedge fires and b wins; fast first call: returns without hedging |
| 29 | lessons/llm-gateway.mdx:630 | ok | NO | ChatRequest,app,meter,upstream_stream | NOT RUN: marked "FastAPI-style sketch" (app, meter, upstream_stream placeholders) |
| 30 | lessons/llm-gateway.mdx:778 | ok | YES | - | RAN against real Redis 7: reserve/refund/debt/missing-ts cases behave as the text says. first reserve admitted, second large reserve refused with wait>0, refund lets a smaller one pass, debt (-9.4M) refused with wait 63 s, reconcile on a missing key creates tokens only, next reserve sets ts and TTL. Note: wait_s is nonzero even when admitted (only used on 429) |
| 31 | lessons/llm-gateway.mdx:1001 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 32 | lessons/llm-gateway.mdx:1127 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). FIXED (C5): CARD regex ate the space after the number ("[CARD_1]and"); Luhn-failing number left alone; rehydrate round-trips |
| 33 | lessons/llm-gateway.mdx:1263 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 34 | lessons/llm-gateway.mdx:1407 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 35 | lessons/llm-gateway.mdx:1485 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). happy path ends with finish; loop ends "max_steps"; destructive call waits; unknown tool gets tool_not_allowed; budget stops it |
| 36 | lessons/llm-inference.mdx:302 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). prints 140.0 327680 148.0 / 451660 110, exactly as commented |
| 37 | lessons/llm-inference.mdx:546 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). output identical to the ```text block in the lesson; step-3 free blocks 0 as the prose says |
| 38 | lessons/llm-inference.mdx:1278 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). prints 1.0, 4.0, 9.0, 19.0, 99.0 as commented |
| 39 | lessons/llm-inference.mdx:1370 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). prints 47%/53.9 ms/270/115 GB, 35%/34.6/130/55, 28%/28.5/85/36, 22%/24.5/56/24: matches the table (rounded) |
| 40 | lessons/load-balancing.mdx:442 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). A A B A C A A as commented |
| 41 | lessons/load-balancing.mdx:559 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 42 | lessons/load-balancing.mdx:673 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). adding a 4th server moved 23.8% of keys (ideal 25%) |
| 43 | lessons/load-balancing.mdx:1004 | ok | NO | server | NOT RUN: marked "sketch"; `server` is a placeholder. See note N3 |
| 44 | lessons/load-balancing.mdx:1404 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). 3 attempts when budget has tokens; 1 when budget is empty |
| 45 | lessons/networking.mdx:1038 | ok | NO | key | NOT RUN: network call with placeholder `key`; `timeout=(connect, read)` is the documented requests form |
| 46 | lessons/pattern-async-jobs.mdx:277 | ok | YES | IntegrityError | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). same idempotency key returns the same job id and publishes once |
| 47 | lessons/pattern-async-jobs.mdx:311 | ok | YES | - | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). 4 concurrent workers claim 4 different jobs (SKIP LOCKED); 5th claim returns None; attempt=1 |
| 48 | lessons/pattern-async-jobs.mdx:462 | ok | YES | - | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). finish succeeds for the owner, second call returns False |
| 49 | lessons/pattern-async-jobs.mdx:567 | ok | YES | build_export,finish | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). heartbeat loop (interval shortened to 0.1 s for the test) extends the lease; run_job finishes; heartbeat sets `lost` when attempt changed |
| 50 | lessons/pattern-async-jobs.mdx:599 | ok | NO | channel,claim_by_id,db,db_factory,run_job,worker_id | NOT RUN: needs a pika RabbitMQ channel (another agent owns the MQ checks); 052 is pure queue_declare arguments |
| 51 | lessons/pattern-async-jobs.mdx:762 | ok | YES | - | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). transient -> retrying with future run_after; attempt >= max -> dead; permanent -> failed |
| 52 | lessons/pattern-async-jobs.mdx:787 | ok | NO | channel | NOT RUN: needs a pika RabbitMQ channel (another agent owns the MQ checks); 052 is pure queue_declare arguments |
| 53 | lessons/pattern-async-jobs.mdx:905 | ok | YES | - | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). second call does not send (rowcount 0 on duplicate) |
| 54 | lessons/pattern-async-jobs.mdx:1229 | ok | YES | done,job_id,r,total | RAN against real Redis 7: asserts pass (see detail). HSET mapping stores done/total/stage |
| 55 | lessons/pattern-async-jobs.mdx:1340 | ok | NO | db,json,mark_task_done_and_count,publish,transcode,try_fire_packaging | NOT RUN: fragment depending on RabbitMQ and helpers; its two helper functions (056) were run |
| 56 | lessons/pattern-async-jobs.mdx:1426 | ok | YES | - | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). counts 1, -1 (redelivery), 0; packaging fires exactly once |
| 57 | lessons/pattern-async-jobs.mdx:1662 | ok | YES | next_occurrence | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). one job per (schedule, due time); next_run_at advanced by the stubbed next_occurrence |
| 58 | lessons/pattern-async-jobs.mdx:1802 | ok | YES | fetch_and_store,gap_ms,now_ms,pop_host_sha,r | RAN the Lua + Python against real Redis 7; CORRECTED (C1): now_ms was passed as a function object. Lua pop_host: claims the due host and re-inserts it 60 s later, second call returns nil |
| 59 | lessons/pattern-contention.mdx:713 | FAIL (fragment) | YES | RELEASE_LUA,pay_organisers,r,uuid4 | RAN against real Redis 7: asserts pass (see detail). with the body wrapped in a function: pays with fences 1,2; held lock -> returns without paying. (py_compile fails only because `return` is at module level: it is a function body) |
| 60 | lessons/pattern-contention.mdx:1143 | ok | NO | CLAIM_SQL,COMPLETE_SQL,IntegrityError,READ_SQL_FOR_SHARE,canonical,db,json,now,recover,sha256 | NOT RUN: marked "A Python sketch of the handler" (db.query_one, CLAIM_SQL, recover are placeholders) |
| 61 | lessons/pattern-fanout.mdx:260 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 62 | lessons/pattern-fanout.mdx:407 | ok | YES | - | RAN against real Redis 7: asserts pass (see detail). trims to 800 newest, re-running the same batch is a no-op, second follower list written |
| 63 | lessons/pattern-fanout.mdx:1082 | ok | YES | TransientError,UnregisteredDevice,provider,redis,tokens | RAN against real Redis 7: asserts pass (see detail). duplicate skipped, transient error clears the key, unregistered device deletes the token |
| 64 | lessons/pattern-geospatial.mdx:297 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). geohash(12.9716, 77.5946) == 'tdr1v9q' as commented |
| 65 | lessons/pattern-partitioning.mdx:164 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). 0.90909 / 0.899992 / 0.5 as commented |
| 66 | lessons/pattern-partitioning.mdx:852 | ok | YES | - | RAN against real Redis 7: asserts pass (see detail). 1000 increments sum to 1000 across 16 sub-keys; unknown id reads 0 |
| 67 | lessons/pattern-partitioning.mdx:1126 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). True / False / True as commented |
| 68 | lessons/pattern-partitioning.mdx:1343 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). union contains lamp, rug, bowl, mug (set order varies) |
| 69 | lessons/pattern-partitioning.mdx:1601 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). 2.2 / 8.0 / 4.0 as commented |
| 70 | lessons/pattern-partitioning.mdx:1839 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). 6.0 27.5 as commented |
| 71 | lessons/pattern-partitioning.mdx:2152 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). 243 243 as commented (needs Python 3.10+ for `dict[str,int] | None` at runtime) |
| 72 | lessons/pattern-sync-collab.mdx:208 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). prints the dict in the comment |
| 73 | lessons/pattern-timeseries.mdx:539 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). seven events return [(0, 4)] once on the 7th; eighth event (58) counted late: matches prose |
| 74 | lessons/pattern-timeseries.mdx:702 | ok | YES | - | RAN against real Redis 7: asserts pass (see detail). 500 increments sum to 500 |
| 75 | lessons/pattern-timeseries.mdx:852 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 76 | lessons/pattern-timeseries.mdx:914 | ok | YES | CountMin | RAN with small stubs / fake cursor: behaviour checked (see detail). top-3 of a skewed stream is a:500, b:300, c:200 |
| 77 | lessons/queues-streams.mdx:544 | ok | YES | - | RAN apply_once against real MySQL 8.0 (Kafka consumer loop stubbed): duplicate events ignored, likes counted once each. 3 deliveries of e1 + e2: likes == 2 |
| 78 | lessons/queues-streams.mdx:735 | ok | NO | cur,db,producer,time | NOT RUN: Kafka producer/consumer sketches with placeholders (apply_once ran in 077) |
| 79 | lessons/queues-streams.mdx:967 | ok | NO | PermanentError,TransientError,apply_once,consumer,json,send_dlq,send_retry | NOT RUN: Kafka producer/consumer sketches with placeholders (apply_once ran in 077) |
| 80 | lessons/rag.mdx:227 | ok | NO | chunk,delete_document,embed_cached,sha1,source | NOT RUN: sketch (source, chunk, embed_cached placeholders; Postgres ON CONFLICT syntax not run here) |
| 81 | lessons/rag.mdx:632 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). RRF order b, a, c for the test lists |
| 82 | lessons/rate-limiter.mdx:315 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). FIXED (C2b): used to sleep after the last 429 before raising; now raises immediately (4 sleeps for 5 tries); success path returns |
| 83 | lessons/rate-limiter.mdx:718 | ok | YES | - | RAN against real Redis 7: asserts pass (see detail). 3 allowed then 2 blocked; key has a TTL |
| 84 | lessons/rate-limiter.mdx:875 | ok | YES | r,time,uuid | RAN against real Redis 7: asserts pass (see detail). 3 allowed then blocked; allowed again after the window |
| 85 | lessons/rate-limiter.mdx:1223 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail) |
| 86 | lessons/rate-limiter.mdx:1718 | ok | YES | TOKEN_BUCKET_LUA | RAN the lesson Lua + Python against real Redis 7: 5 admitted then refused, Retry-After 1. 5 allowed (remaining 4..0), 6th refused, retry_after_s 1 |
| 87 | lessons/rate-limiter.mdx:1739 | ok | YES | - | RAN the lesson Lua + Python against real Redis 7: 5 admitted then refused, Retry-After 1. headers: Limit, Remaining, Retry-After:1 on refusal |
| 88 | lessons/rate-limiter.mdx:2121 | ok | YES | TokenBucket,check,emit_fail_open_audit | RAN with stubbed check(): after fix, breaker falls back to local bucket (5 allowed then refused), fail_closed returns refusal. CORRECTED (C4) |
| 89 | lessons/search.mdx:221 | ok | YES | - | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). output == [('two', 0), ('brass', 1), ('lamp', 2), ('desk', 5)] exactly as commented |
| 90 | lessons/search.mdx:244 | ok | YES | es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). index created with the lesson mapping |
| 91 | lessons/search.mdx:280 | ok | YES | es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). match_phrase "desk lamp" matches only titles with the words adjacent |
| 92 | lessons/search.mdx:386 | ok | YES | es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). bool must multi_match + filter in_stock: 3 hits, out-of-stock excluded |
| 93 | lessons/search.mdx:401 | ok | YES | base_query | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). function_score accepted (gauss + field_value_factor log2p); order by recency/popularity |
| 94 | lessons/search.mdx:505 | ok | YES | es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). 3 shards confirmed in index settings |
| 95 | lessons/search.mdx:579 | ok | YES | doc,es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). index with routing and search with routing both accepted |
| 96 | lessons/search.mdx:678 | ok | YES | batch,es,to_doc | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). bulk with external version: older lsn gives 409 version_conflict in `errors`, newer wins; op "d" deletes. Matches the comment |
| 97 | lessons/search.mdx:720 | ok | YES | es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). alias swap atomic; alias points to v2 afterwards |
| 98 | lessons/search.mdx:812 | ok | YES | es,q | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). from_=9980,size=20 accepted (empty here); from+size above 10,000 is rejected with "Result window is too large" |
| 99 | lessons/search.mdx:819 | ok | YES | es,q | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). PIT + sort + search_after: page 2 is disjoint from page 1; last["sort"] has [score, id, tiebreak] |
| 100 | lessons/search.mdx:1007 | ok | YES | - | RAN: printed output compared with the numbers in the text/comments (see detail). suggest(trie, 'ca') == ['car', 'cat'] as commented |
| 101 | lessons/search.mdx:1143 | ok | YES | es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). edge_ngram "lam" matches "Lamp brass" with seller+category filters (category was a keyword-able dynamic field) |
| 102 | lessons/search.mdx:1213 | ok | YES | es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). "lmap" finds "lamp" through fuzziness AUTO |
| 103 | lessons/search.mdx:1289 | ok | YES | es | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). post_filter keeps the siblings in the terms agg: materials brass/steel/wood each 1 while hits only brass (with material mapped as keyword); histogram interval 25. On a dynamic text `material` the agg fails: the lesson relies on material being a keyword field |
| 104 | lessons/search.mdx:1386 | ok | YES | embed,es,q | RAN against real Elasticsearch 8.15.3 (docker) with the 8.x Python client: requests accepted, results as described (see detail). ES knn + match, rrf merged (run on a 3-vector test index) |
| 105 | lessons/typeahead.mdx:681 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). DECAY 0.906; scores below 1.0 are dropped |
| 106 | lessons/typeahead.mdx:1132 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). 10 results, 2 trending; with a short batch it returns fewer than k (4 for 2+2) |
| 107 | lessons/url-shortener.mdx:666 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). 7 chars base62; different attempt gives different code |
| 108 | lessons/url-shortener.mdx:703 | ok | YES | hash_code,insert_link | RAN against real MySQL 8.0: duplicate key detected via errno 1062, collision probing works. same URL returns same code; occupied code makes it probe attempt 1 |
| 109 | lessons/url-shortener.mdx:855 | ok | YES | - | RAN against real MySQL 8.0 (docker) with the lesson schema: asserts pass (see detail). blocks start at 0 and 10000 |
| 110 | lessons/url-shortener.mdx:911 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). 23-bit-ish value as expected (sequence in low 12 bits) |
| 111 | lessons/url-shortener.mdx:1141 | ok | YES | ALPHABET | RAN against real MySQL 8.0: duplicate key detected via errno 1062, collision probing works. create_link works; duplicate returns False; 5 forced duplicates raise RuntimeError |
| 112 | lessons/url-shortener.mdx:1324 | ok | YES | insert_link | RAN with small stubs / fake cursor: behaviour checked (see detail). 201 / 409 / 400 for valid, taken, too short, reserved, bad chars; "Admin" also blocked (lower()) |
| 113 | lessons/url-shortener.mdx:1516 | ok | YES | db_get,redis,to_epoch | RAN with small stubs / fake cursor: behaviour checked (see detail). 302 / 410 (expired, disabled) / 404; negative cache nf: key set with ttl 60; expired entry not cached; real Redis |
| 114 | lessons/url-shortener.mdx:1780 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). one batch shipped: [(code, count, ts)...] |
| 115 | lessons/url-shortener.mdx:1868 | ok | YES | - | RAN with small stubs / fake cursor: behaviour checked (see detail). rejects ftp, own host (case-insensitive), javascript:, missing host, >2048 |
| 116 | lessons/url-shortener.mdx:1949 | ok | NO | MISSING,home_region_lookup,local_lookup,redis | NOT RUN: placeholders local_lookup/home_region_lookup |
| 117 | mastery/ai-pipeline/event-driven-design-properly.mdx:69 | ok | NO | ExtractionCompletedEvent,aio_pika,json,uuid | NOT RUN: excerpts from the real pipeline code with `...` elisions; 118-119 contain top-level await so py_compile rejects them by design |
| 118 | mastery/ai-pipeline/event-driven-design-properly.mdx:110 | FAIL (fragment) | NO | asyncio,settings | NOT RUN: excerpts from the real pipeline code with `...` elisions; 118-119 contain top-level await so py_compile rejects them by design |
| 119 | mastery/ai-pipeline/event-driven-design-properly.mdx:121 | FAIL (fragment) | NO | ner_failed | NOT RUN: excerpts from the real pipeline code with `...` elisions; 118-119 contain top-level await so py_compile rejects them by design |
| 120 | mastery/ai-pipeline/llm-engineering-prompts-schemas-thinking-cost-latency-phi.mdx:32 | FAIL (fragment) | NO | - | NOT RUN: excerpts needing google-genai / metrics objects; 121 price table is a dated fact, not checked here |
| 121 | mastery/ai-pipeline/llm-engineering-prompts-schemas-thinking-cost-latency-phi.mdx:87 | ok | NO | GEMINI_ESTIMATED_COST_USD,estimate_cost_usd,in_tokens,model,out_tokens,thought_tokens | NOT RUN: excerpts needing google-genai / metrics objects; 121 price table is a dated fact, not checked here |
| 122 | mastery/ai-pipeline/negation-status-and-context-and-how-to-improve-it.mdx:24 | ok | YES | re | RAN with small stubs / fake cursor: behaviour checked (see detail). walk-through sentences from the lesson: all 4 mentions negated, "nephropathy" affirmed; "No fever but cough" -> cough not negated |
| 123 | mastery/ai-pipeline/rag-layer-chunking-embeddings-pgvector.mdx:27 | ok | NO | - | NOT RUN: config / library-call excerpts (mlx_whisper not installed) |
| 124 | mastery/telemedicine-poc/transcription-alignment-and-summary.mdx:49 | ok | NO | MODEL,language,mlx_whisper,path | NOT RUN: config / library-call excerpts (mlx_whisper not installed) |
| 125 | mastery/telemedicine-poc/transcription-alignment-and-summary.mdx:59 | ok | YES | SILENT_SEGMENT_DB,path,result,segment_peak_db,segments | RAN with small stubs / fake cursor: behaviour checked (see detail). all 5 filters drop their segment, good segment kept |
| 126 | mastery/telemedicine-poc/transcription-alignment-and-summary.mdx:105 | ok | YES | lines,segments,t | RAN with small stubs / fake cursor: behaviour checked (see detail). rebased transcript starts at 0.0, sorted across speakers |
| 127 | mastery/telemedicine-poc/transcription-alignment-and-summary.mdx:123 | ok | YES | l,merged,prev | RAN with small stubs / fake cursor: behaviour checked (see detail). same-speaker turn merge logic runs |
