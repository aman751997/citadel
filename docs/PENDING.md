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

Still open:
- [ ] **Quiz design:** the correct option is still often the longest and most specific (shuffling fixed position bias only). Fixing it means writing better wrong options.
- [ ] **Could not verify** (hedges kept; see the evidence files): Elasticsearch RRF subscription tier wording, OpenSearch k-NN details, GLiNER silent truncation, HIPAA Safe Harbor list (HHS blocks automated fetches), SQS visibility timeout (no SQS to test), Kafka behaviour after `max.poll.interval.ms` is exceeded, Kafka partition ceiling, ALB pre-warming, DNS TTL 0 and JVM DNS cache default, CloudFront/Fastly invalidation details, Glacier price ratio, papers cited from memory (Splitwise 2024, Chen 2023, Earlybird, Koren 2009, Linden 2003).
- [ ] **Not run:** the two Cassandra CQL blocks, the Postgres-style SQL in the Mastery chapters, other MySQL drivers (JDBC, mysql2, Go) for `CLIENT_FOUND_ROWS`, cluster failover with replicas under load, the "9,000 threads then OutOfMemoryError" story.
- [ ] **Code sketches left as they are** (noted by the Python check): single-flight waiters get `None` if the leader raises; a SIGTERM sketch calls `server.shutdown()` in a signal handler (would deadlock with stdlib servers); the circuit-breaker text says "a few probes" but the code decides on the first result; `reserve` returns a non-zero wait even when the request is admitted; the facet snippets assume `material` and `category` are keyword fields.
- [ ] **Dry-run captions** have no tests (only final answers do). Read a few for wording.
- [ ] **Diagram readability**: all 522 Mermaid diagrams render, but nobody has looked at them for clarity on a phone.
- [ ] **Type errors**: `src/lib/dryrun.ts` has two strict-mode type errors (around lines 105 and 401). They do not affect the build.
- [ ] **Two Mastery lines with no source:** "temperature 0.1-0.2" and "97% JSON without a schema".
- [ ] **FDA clinical decision support link** has no verified stable URL (now plain text).

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
