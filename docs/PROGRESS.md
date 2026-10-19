# Citadel rewrite — progress map

_Last updated: 2026-10-19 01:00 (regenerated from git; see "How to refresh" at the bottom)._

**Nothing is pushed.** Everything is committed locally on `main` (66 commits ahead of `origin/main`).

## At a glance

| Area | Done | Total |
|---|---|---|
| System Design lessons | 26 | 26 |
| DSA lessons | 20 | 20 |
| LLD lessons | 8 | 8 |
| Mastery projects | 4 | 4 |
| SD War Room case studies | 6 | 6 |
| Shared interactive components | all built | – |

## Phases

| Phase | Status |
|---|---|
| 1. Shared components (quiz, progress, revision cards, answer modes, mock interview, DryRun, 14 simulations and calculators) | ✅ done |
| 2. Lesson rewrites (SD, DSA, LLD, Mastery) | ✅ done |
| 3. Spaced revision (`/review/`) | ✅ done (`docs/REVISION.md`) |
| 4. Open all lessons (no locking) | ✅ done |
| 5. Lesson checkboxes + remove lock icon | ✅ done (`b787cf0`); ticked/unticked and persisted in a browser on SD, DSA, Mastery |
| 6. QA: build, links, layout, tests, Java, diagrams | ✅ re-run after step 5: build 114 pages, 0 broken links, layout 0 issues, 694 tests pass (Java/diagram checks last run before step 5) |
| 7. QA: SQL/Redis claims on live containers | ✅ two passes (`docs/qa/sql-redis-verification.md`) |
| 7b. Verification wave (quizzes, code, services, docs, links) | ✅ done 2026-10-19; see `docs/PENDING.md` and `docs/qa/` |
| 7c. Quiz rebalance (answer-length bias) + blind re-solve of every rewritten quiz | ✅ done 2026-10-19 (longest 79% → 23%, ratio 2.67 → 1.00) |
| 7d. Remaining docs/spec claims and live tests (Cassandra, drivers, Kafka, Redis Cluster) | ✅ done 2026-10-19 |
| 7e. Third pass: Java Kafka client, Mastery Postgres SQL, paper/price/doc claims, live tests, code sketches, quiz balance outliers | ✅ done 2026-10-19 |
| 7f. Fourth pass: RabbitMQ 4.x, Kafka KIP-848, pgvector defaults, Elasticsearch run, nudged quizzes re-solved | ✅ done 2026-10-19 (InnoDB OS-crash simulation stopped unfinished) |
| 8. Trim over-length lessons | ⏳ not started |
| 9. Browser spot-checks (mobile, a11y, no-JS) | ⏳ partly done by agents; not exhaustive |
| 10. Final report | ⏳ after 5, 8, 9 |

## Verification results

- Build: 114 pages, **0 broken internal links**
- Layout check: 61 pages × 2 widths, **0 issues**
- TypeScript tests: **688 pass, 0 fail** (re-run after the checkbox change)
- Java checkers: **34 lessons PASS**
- Mermaid: **522 diagrams on 68 pages, 0 failures** (3 pre-existing broken ones fixed)

## Known open items (full list in `docs/PENDING.md`)

- Over-length lessons to trim (word ratio vs original, measured): caching 2.69×, contention 1.75×, async-jobs 1.69×, partitioning 1.67×, databases 1.57×, blob-cdn 1.53×, rate-limiter 1.52×, fan-out 1.52×, core-concepts 1.49×, search 1.48×, llm-gateway 1.47×, url-shortener 1.43×. (Caching's original was short, so its ratio is inflated.) Word counts include code, quizzes and revision cards.
- Interactive pieces (DryRun predict mode, quizzes, simulations) were exercised by agents in headless Chrome but not by a person; click through a few before relying on them.
- Facts marked "check current docs" in lessons come from memory and were not all verified (product limits, defaults).
- Mastery chapters: ownership, adoption and some Java-side claims are marked **unverified** for you to confirm.
- `src/lib/dryrun.ts` has two strict-mode type errors (lines ~105, ~401); they do not affect the build.

### System Design (26 lessons)

| Lesson | Status | Commit | Words before → after |
|---|---|---|---|
| blob-cdn | ✅ done | `cc04efc` | 13,648 → 20,899 (1.53×) |
| caching | ✅ done | `1eb352f` | 6,198 → 16,653 (2.69×) |
| core-concepts | ✅ done | `4e94dcf` | 13,009 → 19,417 (1.49×) |
| databases | ✅ done | `5813b62` | 16,826 → 26,342 (1.57×) |
| delivery-framework | ✅ done | `04077b4` | 13,715 → 18,427 (1.34×) |
| estimation | ✅ done | `8a222a9` | 11,462 → 15,269 (1.33×) |
| feature-flags | ✅ done | `732738c` | 14,269 → 20,003 (1.40×) |
| llm-gateway | ✅ done | `4a65257` | 14,911 → 21,918 (1.47×) |
| llm-inference | ✅ done | `e55e1c2` | 14,346 → 20,113 (1.40×) |
| load-balancing | ✅ done | `a88b39e` | 13,679 → 19,606 (1.43×) |
| networking | ✅ done | `178b65d` | 12,919 → 17,285 (1.34×) |
| pattern-async-jobs | ✅ done | `fa42261` | 17,240 → 29,143 (1.69×) |
| pattern-contention | ✅ done | `76f4b38` | 16,492 → 28,886 (1.75×) |
| pattern-fanout | ✅ done | `1d5a442` | 12,971 → 19,715 (1.52×) |
| pattern-geospatial | ✅ done | `1bd4886` | 14,808 → 20,048 (1.35×) |
| pattern-partitioning | ✅ done | `53510fa` | 16,022 → 26,719 (1.67×) |
| pattern-realtime | ✅ done | `5805d2c` | 14,522 → 20,536 (1.41×) |
| pattern-sync-collab | ✅ done | `48330c5` | 17,157 → 20,883 (1.22×) |
| pattern-timeseries | ✅ done | `1f3c111` | 14,791 → 20,036 (1.35×) |
| queues-streams | ✅ done | `1e2a3c3` | 11,732 → 15,739 (1.34×) |
| rag | ✅ done | `095f548` | 14,359 → 19,037 (1.33×) |
| rate-limiter | ✅ done | `a14ab70` | 17,532 → 26,733 (1.52×) |
| recsys | ✅ done | `feec208` | 15,923 → 21,425 (1.35×) |
| search | ✅ done | `2ceb66b` | 12,485 → 18,418 (1.48×) |
| typeahead | ✅ done | `437d09c` | 14,361 → 18,845 (1.31×) |
| url-shortener | ✅ done | `ee22603` | 17,242 → 24,700 (1.43×) |

### DSA (20 lessons)

| Lesson | Status | Commit | Words before → after |
|---|---|---|---|
| advanced-graphs | ✅ done | `17805c4` | 15,034 → 19,587 (1.30×) |
| backtracking | ✅ done | `a3e07d5` | 13,891 → 17,339 (1.25×) |
| binary-search | ✅ done | `58bd3f2` | 14,434 → 19,461 (1.35×) |
| bit-manipulation | ✅ done | `bfb6772` | 15,089 → 18,084 (1.20×) |
| dp-1d | ✅ done | `9b89f87` | 15,859 → 21,182 (1.34×) |
| dp-2d | ✅ done | `c28364e` | 15,135 → 19,369 (1.28×) |
| graphs | ✅ done | `48b1f8a` | 15,366 → 20,001 (1.30×) |
| greedy | ✅ done | `5d3548b` | 12,521 → 15,567 (1.24×) |
| hashing | ✅ done | `e93f4d5` | 13,388 → 17,348 (1.30×) |
| heaps | ✅ done | `8e7ce4a` | 15,446 → 19,964 (1.29×) |
| intervals | ✅ done | `12c3175` | 9,549 → 11,964 (1.25×) |
| linked-lists | ✅ done | `40c316e` | 14,138 → 18,473 (1.31×) |
| matrix | ✅ done | `d0043cf` | 12,968 → 15,926 (1.23×) |
| prefix-sum | ✅ done | `82f1a2c` | 10,032 → 12,317 (1.23×) |
| sliding-window | ✅ done | `a87649a` | 12,770 → 16,276 (1.27×) |
| stacks | ✅ done | `5576869` | 11,524 → 14,963 (1.30×) |
| trees-bfs | ✅ done | `4d7c410` | 10,988 → 13,455 (1.22×) |
| trees-dfs | ✅ done | `983349b` | 16,687 → 22,553 (1.35×) |
| tries | ✅ done | `cdc6cf5` | 10,940 → 14,156 (1.29×) |
| two-pointers | ✅ done | `7a88642` | 10,509 → 14,067 (1.34×) |

### LLD (8 lessons)

| Lesson | Status | Commit | Words before → after |
|---|---|---|---|
| behavioral-patterns | ✅ done | `947036f` | 22,143 → 27,439 (1.24×) |
| classic-problems | ✅ done | `93b2932` | 18,077 → 22,133 (1.22×) |
| concurrency-for-lld | ✅ done | `b1b4508` | 19,823 → 23,088 (1.16×) |
| creational-patterns | ✅ done | `9e8c934` | 19,115 → 24,238 (1.27×) |
| machine-coding-protocol | ✅ done | `9da1985` | 13,560 → 14,777 (1.09×) |
| object-modeling | ✅ done | `51e8b63` | 21,025 → 26,342 (1.25×) |
| solid | ✅ done | `d00d16e` | 13,646 → 18,506 (1.36×) |
| structural-patterns | ✅ done | `79cdcd3` | 16,306 → 20,010 (1.23×) |

### Mastery (4 projects, 29 chapters)

| Project | Chapters | Status |
|---|---|---|
| ai-pipeline | 15 | ✅ done (`b26fa1b`) |
| reporting-engine | 8 | ✅ done (`30ee1fa`) |
| telemedicine-poc | 5 | ✅ done (`b26fa1b`) |
| war-stories | 1 | ✅ done (`b26fa1b`) |

## Where to look (for future progress checks)

| What | Where |
|---|---|
| This map | `docs/PROGRESS.md` (committed; I regenerate it on request) |
| Per-lesson commits | `git log --oneline` (each lesson = one commit starting "Rewrite …") |
| Live task list for the current work | the Tasks list under my latest message in the app |
| Live agents | the sessions sidebar / `ListAgents`; ask me "how many agents are running" |
| SQL & Redis verification evidence | `docs/qa/sql-redis-verification.md` |
| Pending / not-yet-verified items | `docs/PENDING.md` |
| Component docs | `docs/INTERACTIVE_COMPONENTS.md`, `docs/DRYRUN.md`, `docs/REVISION.md` |

## How to refresh this file

Ask me "update the progress map", or run `git log --oneline | head -80` for the raw history.
