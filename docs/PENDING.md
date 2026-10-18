# Pending items to revisit

Written 2026-10-19 when the rewrite was pushed. Nothing here blocks the site; it is the list of what was **not** finished or **not** verified. Tick items off here as you close them. Map of everything else: `docs/PROGRESS.md`.

## Do next (highest value first)
- [ ] **Click through the interactive parts by hand.** Dry runs (Next/Back/Predict), quizzes (wrong answer, Try again, score), simulations, mock interviews, `/review/`, and the tick boxes on all four wings. Agents only loaded them in headless Chrome and read the DOM.
- [ ] **Test with JavaScript off and with browser storage blocked.** The fallbacks were written but never exercised.
- [ ] **Keyboard-only and screen-reader pass** on quizzes, dry runs, mock interviews and tick boxes.
- [ ] **Check the deploy** after the push: the GitHub Actions run, the live site, and a tick-box sync with "link git sync".
- [ ] **Trim over-length lessons.** Word growth vs original: caching 2.69× (its original was short), contention 1.75×, async-jobs 1.69×, partitioning 1.67×, databases 1.57×, blob-cdn 1.53×, rate-limiter 1.52×, fan-out 1.52×, core-concepts 1.49×, search 1.48×, llm-gateway 1.47×, url-shortener 1.43×. Most of the growth is quizzes and revision cards; cut second quiz questions and extra cards first.

## Verification gaps
- [ ] **Quiz questions and answers** were written by agents; nobody has checked each one. Spot-check a few per wing.
- [ ] **Uncompiled Java**: brute-force and memoisation snippets in DP and other DSA lessons are `java fragment` blocks that `check-java` does not compile. Compile them or mark them clearly.
- [ ] **"check current docs" claims** (product defaults and limits written from memory): Elasticsearch/Lucene scoring details, RabbitMQ quorum-queue limits, Kafka defaults, S3 prefix rates, CDN cache directives, HAProxy/nginx/Envoy defaults, vLLM block size, cloud limits. Verify before quoting.
- [ ] **Not testable on a plain container**: `CLIENT_FOUND_ROWS` driver behaviour, `session_track_gtids` packet contents, the 8,192-partition limit, `WAIT` with real replicas, failover behaviour. See `docs/qa/sql-redis-verification.md`.
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
