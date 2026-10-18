# Curriculum State

## How to follow this material (in easy words)

Short version: **one wing at a time, one lesson at a time, and always practise before you tick the box.**
The full step-by-step guide is in `README.md` ("How to study with this site"). This file adds the order and the state of each wing.

**Your week**
- Weekdays (45–60 min): DSA chapter, or LLD / Java.
- Weekend (about 2 h): one System Design lesson. If a weekend goes by with none, flag it and do it next.
- Bad day: 15 minutes of revision cards or one old problem. Never zero. The quota is weekly, not daily.
- If you fall a week or more behind, re-plan the dates. Do not carry silent debt.

**Order to follow**

| Wing | Order | Reading time |
|---|---|---|
| DSA | 1 Two pointers · 2 Sliding window · 3 Prefix sums · 4 Intervals · 5 Linked lists · 6 Binary search · 7 Stacks · 8 Heaps · 9 Trees DFS · 10 Trees BFS · 11 Graphs · 12 Advanced graphs · 13 Backtracking · 14 DP 1-D · 15 DP 2-D · 16 Tries · 17 Bit manipulation · 18 Greedy · 19 Hashing · 20 Matrix | about 40 h |
| System Design | Module 1 (Delivery framework, Estimation, Core concepts, Networking) → Module 2 (Databases, Caching, Queues, Load balancing, Blob/CDN, Search) → Modules 3–11 case studies in any order → Module 12 (AI-era) | about 48 h |
| LLD | Object modeling → SOLID → Creational → Structural → Behavioral → Concurrency → Machine-coding protocol → Classic problems | about 16 h |
| Mastery | Read the project the week before a round that mentions it | about 4 h |

**For every lesson:** skim → try it yourself first → read recognise / brute force / idea → run the dry run with Predict mode on → quiz → say the answer aloud → tick the box → rate the revision cards. Open **Review** every day.

**Do not:** read the code before the idea, skip the quiz, or tick a lesson you could not explain to someone else.

**Trust levels:** "check current docs" = from memory, verify it. "unverified" (Mastery) = confirm yourself before you say it. Example numbers are assumptions.

**Where things are recorded:** your plan and scores live in the Notion campaign. The site keeps tick boxes (SD and LLD sync to git; DSA and Mastery stay in this browser) and the Review queue (this browser; use Export to back it up). What has been built and checked: `docs/PROGRESS.md`.

---

# Forge queue (for whoever edits the content)


**Protocol (every session):**
1. Read this file + `ls src/lessons/ src/dsa-lessons/` = what exists (never trust memory for this).
2. Ask user / check Notion hub for frontier (last lesson cleared, last mock score, DSA solves).
3. Lesson cleared → run its drill/mock hand-off live, log to Notion (Attempt Log / roadmap toggles + XP Ledger).
4. SD walkthroughs + DSA pattern lessons forge incrementally: keep ≥2 unread ahead of frontier.
5. Tune forged content with latest logged gaps — gap-tuning is why this beats paid portals.
6. DSA solves: update BOTH Notion roadmap and `src/dsa.ts` done flags.

**Forging rules:**
- Sources: Notion SD Master Syllabus/Sheet (SD), Grimoire chapters + roadmap (DSA). Adapt, don't invent.
- Style and format for every lesson now live in `docs/STYLE.md` (plain handbook voice, no fiction). SD: what it is → why → how → code → trade-offs → when to use → interview takeaway. DSA: problem → how to recognise → brute force → idea → dry run → algorithm → Java → why it works → complexity → mistakes → practice → LeetCode, then a revision summary. LLD: concept → problem → bad design → better design → how it works → diagram → when to use → trade-offs → practice → interview summary. Mastery: overview → architecture → decisions → deep dives → questions → answer modes → production stories, with honesty labels.
- After forging: update status here + `src/modules.ts` (SD) or lesson link in `src/dsa.ts` grouping (auto via slug), push (auto-deploys).
- Coverage invariant: every `src/bank.ts` question maps to ≥1 lesson; every `src/dsa.ts` pattern eventually gets a lesson.

**User gap register (tune everything against these):**
- SD: cache hand-waves · layer conflation · silent skips · decomposition-from-scratch · pacing (18-min requirements) · envelope encryption revisit · M:N modeling
- DSA: Recognition Fear (transfer gap — unseen-problem reps mandatory) · variable-state narration at loop exit · TC/SC+invariant before coding

## SD status — all 26 lessons rewritten (2026-10-19)

| Module | Lessons |
|--------|---------|
| 1 Foundations | delivery-framework, estimation, core-concepts, networking |
| 2 Toolbox | databases, caching, queues-streams, load-balancing, blob-cdn, search |
| 3 Warm-up Fights | url-shortener, rate-limiter, typeahead |
| 4 Realtime | pattern-realtime (WhatsApp walkthrough inside) |
| 5 Fan-out | pattern-fanout (Twitter feed and notification walkthroughs inside) |
| 6 Contention | pattern-contention (Ticketmaster, Payments, Job scheduler inside) |
| 7 Geospatial | pattern-geospatial (Yelp, Uber inside) |
| 8 Async Pipelines | pattern-async-jobs (YouTube, Web crawler inside) |
| 9 Partitioning | pattern-partitioning (Distributed cache, KV store inside) |
| 10 Time-Series | pattern-timeseries (Metrics/Datadog inside) |
| 11 Sync & Collab | pattern-sync-collab (Dropbox, Google Docs inside) |
| 12 AI-Era | llm-inference, rag, llm-gateway, feature-flags, recsys |

Every walkthrough now lives inside its pattern lesson, so there is no separate walkthrough queue. The Delivery framework lesson has a 45-minute mock interview you can run with a timer.

## DSA status — all 20 pattern lessons rewritten (2026-10-19)

- `/dsa/` page: all 20 patterns, 144 problems, LC + LintCode links, done flags mirroring Notion. ✅ live
- All 20 pattern lessons exist and follow the per-problem format in `docs/STYLE.md`, with step-through dry runs (answers checked against brute-force tests), quizzes and a revision summary. Drill-design rule still governs RECOGNITION drills (taught-in-session patterns only); lessons ahead of reps are reference, teach before drilling.

## LLD status — all 8 lessons rewritten (2026-10-19)

| Module | Lessons | Status |
|--------|---------|--------|
| 1 Object Design Foundations | object-modeling, solid | ✅ forged |
| 2 The Pattern Arsenal | creational-patterns, structural-patterns, behavioral-patterns | ✅ forged |
| 3 Concurrency for LLD | concurrency-for-lld | ✅ forged |
| 4 Machine-Coding Playbook | machine-coding-protocol, classic-problems | ✅ forged |

- All 8 lessons are open (no gating). Tick boxes use localStorage key `sdc-lld-progress`. Quiz + Mermaid + Java throughout; every lesson cross-links its War Room dossiers as live examples.
- War Room (battle-tested, from prod code): patterns-why (18 dossiers), inventory, build-drills, cheatsheet — ✅ live at `/lld/war/…`. SD War Room: 6 case studies at `/sd/war/…`. Doctrine: theory first, War Room = live examples.
- Remaining LLD work = REPS, not lessons: the classic-problems drill order (parking lot → splitwise → vending machine → LRU → BookMyShow → elevator → logger → rate limiter), timed with the buddy, post-mortems logged. Lesson infra: MDX in `src/lld-lessons/`, modules in `src/lld-modules.ts`.

## Mastery status (hand-maintained)

| Dossier | Chapters |
|---------|----------|
| AI Document Pipeline | 15 |
| Reporting Engine | 8 |
| Telemedicine PoC | 5 |
| War Stories (one integration day, 8 bugs) | 1 |

- Chapters are plain MDX in `src/mastery/<project>/`, edited directly.
- Use: the résumé half of the loop ("walk me through something you built"). Reread the relevant dossier before any round where that work is on the CV.

## Coverage map
`src/bank.ts` (46 SD questions) → all map to rewritten SD lessons; every walkthrough lives inside its pattern lesson. `src/dsa.ts` (144 problems) → 20/20 pattern lessons rewritten. DSA page has click-to-mark solves, a lesson tick box per pattern, and copy-progress (localStorage overlay; baked flags stay the synced truth).

## Session log
- 2026-10-19 — Plain-handbook rewrite of all lessons, new interactive layer, revision system, open lessons with tick boxes, README + this file rewritten as a study guide.
- 2026-08-17 — v1 shipped: framework, estimation, rate-limiter; portal live; doctrine locked.
- 2026-08-17 — Coverage expansion: /bank page, curriculum → modules, gap register imported.
- 2026-08-17 — **THE GREAT THEORY FORGE**: all 19 remaining SD theory lessons (M1–M2 complete, 8 pattern lessons, 5 AI-era) with Mermaid + quizzes; curriculum restructured PATTERN-FIRST (12 modules — pattern theory + its walkthroughs clubbed, per user directive); files renamed to semantic slugs; DSA wing added (/dsa/: 20 patterns, 144 problems, LC/LintCode links, done flags; two-pointers + sliding-window lessons ported from Grimoire with Java + bestiaries). SD theory scaffolding era CLOSED — only walkthroughs + reps remain.
- 2026-08-17 — DSA forge to pattern 8 (user directive): prefix-sum, intervals, linked-lists, binary-search, stacks, heaps lessons (Java + Mermaid + bestiaries); Arsenal page gains click-to-mark solves + copy-progress button; SD roadmap copy-progress shipped earlier today.

## Plain-handbook rewrite (2026-10-19) — replaces the 2026-10-08 "novel" rewrite
- What changed: all SD, DSA and LLD lessons were rewritten in plain language with no fictional characters; Mastery got an interview-delivery pass (status labels, think-first questions, 30-second / 2-minute / detailed answers, STAR stories, no invented facts). The six SD War Room case studies were simplified earlier.
- New shared pieces: upgraded quizzes (explanations per option, retry, score), tick boxes, revision cards, answer modes, mock interviews, step-through dry runs with Predict mode, 14 small simulations and calculators, and the Review page (`/review/`, see `docs/REVISION.md`). Component docs: `docs/INTERACTIVE_COMPONENTS.md`, `docs/DRYRUN.md`.
- Checked (see `docs/PROGRESS.md` and `docs/qa/sql-redis-verification.md`): build, internal links, layout at two widths, all TypeScript tests, all Java checkers, all Mermaid diagrams, and the MySQL / Redis behaviour claimed in the lessons, run on real containers.
- Open items: trim the longest lessons (some grew 1.5–1.75× in words), a human click-through of the interactive pieces, and anything marked "check current docs".
- Gates (run before shipping): `npm run test:ts`, `node scripts/check-java.mjs`, fresh `npm run build`, `node scripts/check-links.mjs dist`, `node scripts/check-layout.mjs dist`, `node scripts/check-mermaid.mjs <preview-url> dist`.

## Earlier rewrite (2026-10-08) — superseded
- Wings were rebuilt in a story style (Kestrel / Gearhouse / guild settings). That style has been removed. `docs/LESSON_GUIDE.md` still describes it, so use `docs/STYLE.md` for the voice and format and `docs/LESSON_GUIDE.md` only for the correctness machinery (Java checkers, trace data, build).
