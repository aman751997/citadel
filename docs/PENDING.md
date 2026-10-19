# Pending items to revisit

Written 2026-10-19 when the rewrite was pushed. Nothing here blocks the site; it is the list of what was **not** finished or **not** verified. Tick items off here as you close them. Map of everything else: `docs/PROGRESS.md`.

## Do next (highest value first)
- [ ] **Click through the interactive parts by hand** (quiz shuffle, wrong answer, Try again, reload and `/review/` were checked in a browser on one SD lesson; the rest was not). Dry runs (Next/Back/Predict), quizzes (wrong answer, Try again, score), simulations, mock interviews, `/review/`, and the tick boxes on all four wings. Agents only loaded them in headless Chrome and read the DOM.
- [ ] **Test with JavaScript off and with browser storage blocked.** The fallbacks were written but never exercised.
- [ ] **Keyboard-only and screen-reader pass** on quizzes, dry runs, mock interviews and tick boxes.
- [x] Deploy checked 2026-10-19: Actions run succeeded and the live site returns 200 on the key pages.
- [ ] **Try the live site once**, including a tick-box sync with "link git sync" (the sync path was not tested).
- [ ] **Trim over-length lessons.** Word growth vs original: caching 2.69× (its original was short), contention 1.75×, async-jobs 1.69×, partitioning 1.67×, databases 1.57×, blob-cdn 1.53×, rate-limiter 1.52×, fan-out 1.52×, core-concepts 1.49×, search 1.48×, llm-gateway 1.47×, url-shortener 1.43×. Most of the growth is quizzes and revision cards; cut second quiz questions and extra cards first.

## Verification gaps

Closed on 2026-10-19 (evidence in `docs/qa/`):
- [x] **Quiz answers:** every `<Quiz>` question in SD, DSA, LLD and Mastery was solved independently and recomputed (`quiz-review-*.md`). About 100 questions were fixed. No marked answer was wrong; the problems were in explanations, stems, distractors and arithmetic. Options now shuffle at build time (`quiz-shuffle.md`).
- [x] **Java fragments:** all 146 `java fragment` blocks classified; DSA ones ran against oracles; LLD race claims were stress-run (`java-fragments-dsa.md`, `java-fragments-lld.md`).
- [x] **Python snippets:** 127 blocks compiled, about 98 executed; 5 real bugs fixed (`python-snippets.md`).
- [x] **MySQL, Redis, RabbitMQ, Kafka, Elasticsearch behaviour** run on real containers, including 8.0.15/8.0.16 CHECK, 8,192 partitions, Redis 5/6.0/6.2/7.4 boundaries, WAIT and failover loss, 3-node Cluster (`sql-redis-verification.md`, `mysql-redis-remaining.md`, `mq-search-services.md`).
- [x] **"check current docs" claims** checked against official docs by three agents; many hedges replaced by dated facts and 32 errors corrected (`docs-claims-A.md`, `-B.md`, `-C.md`).
- [x] **External links:** all 889 external URLs fetched; 8 dead ones replaced; all 400 LeetCode slugs confirmed to exist.

Closed on 2026-10-19 (second pass):
- [x] **Quiz design:** the correct option was the single longest in 79% of questions (ratio 2.67x). About 1,000 questions were rewritten so wrong options are realistic, parallel mistakes. Now longest 23% / shortest 22% / ratio 1.00 (`node scripts/quiz-balance-src.mjs src/lessons src/dsa-lessons src/lld-lessons src/mastery`). Every rewritten question was then solved blind again (about 75 more fixes, including 4 answer indices that pointed at the wrong option). `node scripts/check-quiz-integrity.mjs` guards the structure (0 problems). Evidence: `docs/qa/quiz-balance-*.md`, `docs/qa/quiz-recheck-*.md`.
- [x] **Docs and spec claims** (`docs/qa/spec-claims-1.md`, `spec-claims-2.md`, `live-tests-2.md`): HIPAA Safe Harbor wording, GLiNER truncation, FDA link, five papers, LiveKit/WebRTC, Gemini naming, Elasticsearch RRF licence, OpenSearch k-NN, Kafka partition guidance and poll interval, ALB, DNS/JVM cache, CloudFront, Fastly, Glacier, SQS, browser connection limits; Cassandra CQL, MySQL drivers (`CLIENT_FOUND_ROWS`), Kafka after `max.poll.interval.ms` and retention, thread-limit failure, Redis Cluster failover, LRU vs LFU.

Still open (hedges kept; reasons in the evidence files):
- [ ] The Java client's `CommitFailedException` by name (Kafka was tested with the Python client); LFU being slow to adapt to a changed hot set; the "fourth node moves 25%" figure (arithmetic only).
- [ ] LiveKit egress and Redis; OpenSearch HNSW `m` default; Splitwise ISCA edition number; paper venue details taken from abstract pages.
- [ ] Apache's own Kafka partition-limit page (Confluent sources used); Glacier Deep Archive $/GB (ratio is approximate); default CDN cache-key and cookie behaviour (vendor-specific); Fastly purge timing.
- [ ] `innodb_flush_log_at_trx_commit=2` behaviour on power loss (needs a real power loss).
- [ ] **Not run:** the Postgres-style SQL in the Mastery chapters (no schema), other languages' drivers beyond Connector/J, mysql2, Go and the two Python drivers, RabbitMQ 4.x classic-queue `consumer_timeout`.
- [ ] **Code sketches left as they are:** single-flight waiters get `None` if the leader raises; the SIGTERM sketch calls `server.shutdown()` in a signal handler (deadlocks with stdlib servers); the circuit-breaker text says "a few probes" but the code decides on the first result; `reserve` returns a non-zero wait even when admitted; the facet snippets assume `material` and `category` are keyword fields.
- [ ] **Quiz balance leftovers:** creational-patterns correct-is-longest is 47%; stacks and prefix-sum correct-is-shortest is 0% and 11%; llm-gateway and recsys shortest 4%. Lengthen or shorten a few options if you care.
- [ ] **Dry-run captions** have no tests (only final answers do). Read a few for wording.
- [ ] **Diagram readability**: all 522 Mermaid diagrams render, but nobody has looked at them for clarity on a phone.
- [ ] **Type errors**: `src/lib/dryrun.ts` has two strict-mode type errors (around lines 105 and 401). They do not affect the build.

## Facts you must confirm yourself (Mastery)
- [ ] **Your ownership and contribution** on each project (the notes mark this unverified; git shows other authors on the reporting engine).
- [ ] **AI pipeline:** the repo default `NER_MODE` is `medgemma_only` while chapters describe the three-stage `legacy` path (affects questions 19–22 and drill 2); whether the vector-search functions have merged; the cost-per-document figures ($0.01–0.02 vs "a few cents"); which mode and model your reported numbers came from; whether the Vertex AI switch served real traffic; which Java-side changes you wrote.
- [ ] **Reporting engine:** the branch header (`X-Branch-Id`) is read before the token claim in the shared filter. Check whether a gateway strips it. Also check that `minimumGroupSize` has no server-side floor and that the seed data uses 1.
- [ ] **Telemedicine PoC:** ownership, business case, scale, legal fit (DPDP, Telemedicine Practice Guidelines), summary quality.
- [ ] **War stories:** who owned each fix.

## Small leftovers
- [ ] `src/dsa-lessons/trees-bfs.mdx` still says "`next` ropes" in one table cell (about line 873).
- [ ] Some internal names kept because tests pin them: lab ids and labels such as "ledger/vault/board" (prefix-sum), "group register" (advanced-graphs), "register/fingerprint" (hashing), Java identifiers `isLit`, `light`, `darken`, `lowestLit` (bit-manipulation), `Seat`, `heard`, `beat` (trees-bfs). Rename them together with their tests if they bother you.
- [ ] Behavioral-patterns chapter headings still use the old scenario titles ("The visit that was billed twice"). Rename to plain titles.
- [ ] Classic-problems "find the classes" hint ladder intro still says "Your turn to write it".
- [ ] `docs/INTERACTIVE_COMPONENTS.md` does not list every simulation added late (geohash, load balancer, estimation, KV cache, trie autocomplete, collab edit, Count-Min).
- [ ] Revision page: items from "Mark chapter" are titled by their id unless a `label` is set; resetting a lesson's progress does not remove its revision items; reordering questions or cards inside one component changes their ids (append instead).
- [ ] Tick boxes on DSA lessons and Mastery chapters are browser-only (no git sync).
- [ ] The default GitHub identity in your shell (`GH_TOKEN`) is `amni751997`, which cannot push to `aman751997/citadel`. Unset it or switch accounts for plain `git push`.
- [ ] `src/components/Scene.astro` is now unused by lessons. Delete it if you will not use stories again.

## Decisions to make
- [ ] Keep the long lessons long, or trim to about 1.3×?
- [ ] Add git sync for DSA lesson and Mastery chapter tick boxes?
