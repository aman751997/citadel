# The Citadel lesson guide

Every lesson in the Citadel follows this guide. The reference implementation is
`src/dsa-lessons/two-pointers.mdx` and its support files. When this guide and the reference
disagree, the reference wins — read it in full before writing anything.

## The promise to the reader

The reader hates rote DSA/SD/LLD prep. They memorise common problems and freeze when the interview
asks something new. Each lesson must leave them able to **recognise** the idea in disguise,
**explain why each move is safe**, and **build a solution they were never shown**.

A lesson must be:

1. **Complete in itself.** Every roadmap problem for the topic is taught in full: intuition, a worked
   example, why it works, the invariant, edge cases, complexity, the Java, the classic bug. A reader
   who only ever opens this page can solve the whole family.
2. **Correct.** Every algorithm, complexity claim, trace answer, figure number and code line is
   verified. Wrong teaching is the worst possible outcome. When unsure, test it; if it can't be
   tested, cut it or flag it in "Look these up yourself".
3. **A novel, not a textbook.** Reading it should feel like a happy place: a world, a cast,
   short scenes that turn each problem into a small mystery, and visuals wherever a picture beats a
   paragraph. The story serves the learning — every scene sets up the exact puzzle the chapter
   solves, and the technical content stays precise and complete.
4. **Active.** The reader predicts before being told: decision puzzles (`Trace`), predict-first
   reveals (`Reveal`), hint ladders before code (`HintLadder`), a hands-on playground and spaced
   practice (DSA), checkpoints (`Quiz`) and decision drills (SD/LLD).

## Voice

- Warm, curious, second person ("you"). Short sentences. Concrete numbers. No filler, no hype words
  ("powerful", "crucial", "dive in"), no emoji in prose (component chrome already has a few).
- Scenes: 80–180 words, serif-styled by `<Scene>`. Present tense or simple past, sensory but brief.
  End a scene on the question the chapter answers. Dialogue from the mentor asks; it never lectures.
- After the scene, switch to clear technical teaching. Bold the one idea per paragraph that matters.
- Analogies must map 1:1 onto the algorithm. If an analogy would mislead about an edge case, fix the
  analogy or drop it.
- Fictional people, places and companies only. Never present a real company's internals as fact
  unless you link a public source (engineering blog, paper, docs) you are confident exists.
- Keep the user's personal notes from the old lesson (logged bugs, "your gap", wins) — rephrase them
  into the new voice ("You've tripped on this one before: …"). They are the most valuable lines.

## Components (all in `src/components/`)

| Component | Use it for |
|---|---|
| `PatternHub` | Front matter: `logline`, `cast`, `parts` (table of contents), `extensions`, `extras`, `note`. DSA passes `pattern="<slug>"` (session card appears when a practice set exists). SD/LLD pass `routes` (3 entry cards) instead. |
| `Scene` | Story beat. Props `chapter`, `title`, `mood` (`dawn` `dusk` `night` `storm`). Markdown inside; blank lines around content. |
| `Part` | Part divider between groups of chapters. Props `n`, `title`; one-line blurb as children. |
| `Figure` | Captioned illustration wrapper around `ArrayStrip`, `Bars`, `Mermaid`, or inline `<svg>`. |
| `ArrayStrip` | SVG array: `values`, `pointers=[{at,label,tone}]`, `regions=[{from,to,label,tone}]`, `tones={{i:'hot'|'done'|'out'|'ghost'|'blue'|'purple'}}`, `join="→"` for linked lists, `name`, `indices={false}` for non-index rows (strings, intervals). Tones: `gold blue green purple red dim`. |
| `Bars` | SVG bar chart: `heights`, `water`, `pair`, `rect={{from,to,height}}` (histogram), `pointers`, `tones`, `lines`. |
| `Mermaid` | Flowcharts, sequence diagrams, state machines, trees, graphs: `<Mermaid code={\`flowchart LR\n A --> B\`} />`. Keep labels short; use `\n` for line breaks inside quoted labels. |
| `Trace` | Decision puzzle. Data from `src/lib/trace.ts` helpers `row(name, values, labels, {tones, join})` and `step(question, rows, answerIndex, [[label, feedback], ...])`. Every wrong choice gets feedback that explains what it would break. `rows` may be `[]` for pure decision questions. |
| `Reveal` | Predict-first question; the answer is hidden until clicked. |
| `HintLadder` | Three hints, then the Java inside the slot. Optional `labels` (4 strings) for non-algorithm ladders. |
| `Quiz` | Multiple-choice checkpoint with a `why` per question. |
| `Playground` | DSA only: `<Playground lab="<slug>" />`, lab from `src/lib/labs/<slug>.ts`. |
| `Practice` | DSA only: `<Practice pattern="<slug>" />`, set from `src/data/practice/<slug>.ts`. |

Visuals: aim for one figure per chapter where a picture genuinely helps (state of pointers,
window, tree, graph, recursion tree, DP table, request flow, class diagram, sequence diagram).
Never decorative. Check every number in a figure by hand or by test.

### MDX gotchas

- Inside prose, write `&lt;` for a literal `<` and avoid bare `{` `}`; use inline code instead
  (`` `i < j` `` is fine).
- Component children need blank lines around markdown content.
- JSX props are JavaScript: `values={[1, 2]}`, strings with apostrophes go in double quotes or
  template literals.
- Headings that are link targets use `<h2 id="slug">Title</h2>`; ids are stable, lowercase, hyphenated.
- `BASE` from `../paths` for internal links: ``<a href={`${BASE}dsa/lessons/heaps/`}>Heaps</a>``.
  Markdown links do NOT interpolate: `[Heaps](${BASE}dsa/…)` renders a broken URL. Always use `<a href={…}>`.
- Mermaid classDiagram static members: `$` goes after the return type, e.g. `+of(int id) Ticket$`.
- Mermaid breakers: `;` inside a sequenceDiagram message (it ends the statement), `\n` inside a
  sequence message (in a JS template literal it becomes a real newline), PlantUML-only arrows such as
  `+--`. Run `node scripts/check-mermaid.mjs` against a preview to catch render failures.
- Java fences carry meta for the checker (below): ` ```java id=minWindow `.

## Correctness machinery (mandatory)

### Java: the code shown is the code tested

`node scripts/check-java.mjs <slug>` extracts every ` ```java ` block from the lesson, compiles it,
and runs `tests/java/<slug>/Check.java`.

- Each block is wrapped in its own class. ` ```java id=foo ` → class `B_foo`; the checker calls
  `new B_foo().method(...)`. Blocks with the same `group=name` are concatenated into `B_name` (use
  for multi-block designs: an interface in one block, implementations in later ones).
- `ListNode` and `TreeNode` (standard LeetCode shapes, fields `val`, `next` / `left`, `right`) are
  provided. Define any other helper type (graph `Node`, `Interval`, `Trie` nodes) inside the block as a
  `static class` (the block becomes an outer class, so a non-static nested class would need an outer
  instance; checkers construct helpers as `new B_cloneGraph.Node(1)`). In the lesson prose it reads
  naturally: LeetCode shows these types as given classes.
- Imports inside a block are hoisted; `java.util.*`, `java.util.function.*`, `java.util.stream.*`
  and `java.util.concurrent.*` (+ atomic, locks) are pre-imported.
- A block that is deliberately partial (a template, a buggy "spot the bug" version, pseudo-code)
  must be marked ` ```java fragment ` or written as ` ```text `. Everything else must compile.
- `tests/java/<slug>/Check.java` (class `Check`, `public static void main`) tests **every**
  non-fragment solution: hand-picked edge cases (empty, single element, duplicates, negatives,
  all-equal, max/min values where relevant) plus ≥1000 random small inputs against a brute-force
  oracle written independently (exhaustive search, simulation, or a textbook-simple method). When
  several outputs are valid, check validity rather than equality. Print `OK <slug>: N checks
  passed`. Model it on `tests/java/two-pointers/Check.java`.
- Buggy "catch the bug" snippets should be shown as `fragment` — and the checker should ideally
  demonstrate the bug fails on the input the lesson names.

### TypeScript: traces, labs, practice

`tests/<slug>.test.ts` (run with `node --experimental-strip-types --test tests/<slug>.test.ts`):

- **Every Trace step**: assert `answer` is a valid index and that the numbers in the question and
  feedback agree with an independent computation where possible (e.g. compute the window sum the
  question claims).
- **Lab**: for every mode × case, drive with `solveLab` from `src/lib/lab.ts`; assert it terminates,
  wrong moves never change the board (`wrongMovesChangedBoard === false`), and the final state matches
  a brute-force oracle. Also run ≥100 random small inputs per mode if the module exposes a way to
  build a state from input (recommended: export `fromInput(mode, input)`).
- **Practice**: for every concept × variants 0..20, recompute the answer independently from the
  prompt's numbers and assert equality, assert `answerMatches(challenge, formatted answer)` is true
  and `answerMatches(challenge, 'not an answer')` is false. Model on `tests/two-pointers.test.ts`.
- Relative imports in `.ts` files under `src/lib`, `src/data` must use explicit `.ts` extensions for
  value imports (Node's strip-types runner needs them). Type-only imports may omit them.

### Build

Never write to the shared `dist/`. Build privately, with a **fresh cache every time** (a reused
cache can drop component styles from every page):

```bash
rm -rf /tmp/citadel-<slug>/cache && CITADEL_OUT=/tmp/citadel-<slug>/out CITADEL_CACHE=/tmp/citadel-<slug>/cache npm run build
```

A failure mentioning a missing `.astro/...` module is a race with another author's build; retry.

Other authors are editing other lessons at the same time. Be a good neighbour: **write your data
and support files first and your `.mdx` last**, so your lesson never imports a file that doesn't
exist yet, and never leave a file syntactically broken between edits (write whole files).

If the build fails in a file you don't own, re-run once after a minute. If it still fails, build
from a private copy that leaves the broken lesson out, and report it — never edit their file:

```bash
rsync -a --exclude node_modules --exclude dist --exclude .git ./ /tmp/citadel-<slug>/src-copy/
ln -s "$PWD/node_modules" /tmp/citadel-<slug>/src-copy/node_modules
rm /tmp/citadel-<slug>/src-copy/src/<wing>/<their-lesson>.mdx    # only in the copy
(cd /tmp/citadel-<slug>/src-copy && CITADEL_OUT=/tmp/citadel-<slug>/out npm run build)
```

## DSA lessons

### Files for a pattern `<slug>`

| File | Contents |
|---|---|
| `src/dsa-lessons/<slug>.mdx` | The lesson. Frontmatter: `title`, `description`, `order` (pattern id), `minutes` (honest full-read estimate), `sessionMinutes: 8`. |
| `src/data/<slug>/traces.ts` | Exported `TraceStep[]` arrays (via `row`/`step` from `../../lib/trace.ts`) — one per chapter that has a decision puzzle, plus `mixedReview`. |
| `src/data/<slug>/hints.ts` | `export const hints: Record<string, [string, string, string]>` for every HintLadder. |
| `src/lib/labs/<slug>.ts` | `export const lab = makeLab({...}, legend)` — 2–4 modes, 3–4 cases each (include an empty or degenerate case and a duplicates/no-answer case). |
| `src/data/practice/<slug>.ts` | `export const practice: PracticeSet` — ≥10 concept ids covering every chapter and side quest, plus one "another tool fits better" decoy concept. Prompts never name the pattern or the technique. Inputs vary with `variant`. Storage key `citadel-<slug>-review-v1`. |
| `tests/<slug>.test.ts` | Traces, lab, practice tests (above). |
| `tests/java/<slug>/Check.java` | Java checker (above). |

The registry auto-discovers labs and practice sets; do not edit `src/lib/registry.ts`.

Lab shape (two-pointers' lab is an older adapter; new labs use `makeLab`):

```ts
import { makeLab, type LabBase } from '../lab.ts';
interface S extends LabBase { a: number[]; k: number; head: number; sum: number; best: number | null }
const cases = [{ a: [2, 1, 5, 1, 3, 2], k: 3 }, { a: [4], k: 1 }, { a: [-1, -2, -3], k: 2 }];
export const lab = makeLab<S>({
  fixed: {
    name: 'Fixed window', cases: cases.length,
    actions: [{ action: 'slide', label: 'Slide: add head, drop tail' }, { action: 'record', label: 'Record this window' }, { action: 'finish', label: 'No windows left' }],
    create: v => ({ ...cases[v], head: 0, sum: 0, best: null }),
    expected: s => /* the single correct action for this state */ 'slide',
    apply: (s, action) => { /* mutate s (a private copy); set s.done = true on terminal actions; set s.message */ },
    reject: (s, action) => 'What this wrong move would break, in one or two sentences, using the numbers on the board.',
    view: s => [{ name: 'Array', cells: s.a.map((v, i) => ({ value: String(v), label: i === s.head ? 'HEAD' : undefined, tone: i < s.head ? 'done' : undefined })) }],
    describe: s => `k = ${s.k}, window sum = ${s.sum}, best = ${s.best}.`,
  },
}, 'Gold = active · green = settled · faded = left behind');
```

State must be plain JSON data (no Infinity/NaN — they don't survive cloning; use `null` or a sentinel).
`expected` must return exactly one action per state (use `alsoValid` for genuine ties).

### Lesson skeleton (mirror two-pointers exactly)

1. Imports, then `<PatternHub pattern="<slug>" start="prologue" logline=… cast=… parts=… extensions=… extras=… note=… />`.
2. `<h2 id="prologue">Prologue · …</h2>` — a `Scene`, then the pattern's core promise/invariant and
   **when this pattern fires** (the recognition triggers, and the brute force it replaces, with the
   complexity jump). A `Figure` of the core idea.
3. `<h2 id="playground">…</h2>` — short `Scene`, one paragraph, `<Playground lab="<slug>" />`.
4. `<Part>`s grouping chapters by sub-family. Each roadmap problem gets a chapter:
   - `<h2 id="…">Chapter N · <story title></h2>`, `Scene`, `**Problem: <LeetCode name> · <sub-pattern>**`
   - intuition paragraph(s), a `Figure`, a `Trace` (2–3 decisions; wrong choices explain the breakage)
   - **Why it works:** and **What stays true:** (the invariant), `Reveal`s for the classic "what if"
   - `<HintLadder hints={hints.x}>` with the Java solution (` ```java id=… `), then complexity in bold
     and any overflow / input-bound notes
   - **Catch the bug:** the most common wrong version and the input that breaks it, then
     `[Solve <name>](https://leetcode.com/problems/<lc-slug>/)`. Premium problems: also the LintCode
     link from `src/dsa.ts`.
   Problems that share one idea may share a chapter (two-pointers did this for Remove Duplicates I/II),
   but every roadmap problem must have its own explained solution and link.
5. `<Part n="Part …" title="…changes one rule">` with 3–6 **side quests**: real variations that test
   transfer (count instead of find, add a constraint, change the comparison, unsorted input, k instead
   of 2, streaming input…). Each: the changed rule, the reasoning, a `Reveal` or `Figure`, a
   `HintLadder` with tested Java, a **Transfer test** question.
6. Epilogue `<Part>`: `choose-the-tool` (when this pattern is the wrong tool — a scene where it fails
   and why, and what to use), `wider-family` (how it connects to other roadmap patterns, with BASE
   links), `exit-ticket` (3 unlabeled build-it-yourself problems + a `Reveal` with the reasoning),
   `mixed-recall` (`Trace` of mixed recognition questions — fold in every question from the old
   lesson's `Quiz`, with per-option feedback), `independent-practice` (`<Practice pattern="<slug>" />`),
   `cheat-sheet` ("When you see… / Start with… / The promise to keep" table covering every chapter and
   side quest), five pocket bugs, a closing `Scene`, a "make it stick" paragraph, and roadmap links.
7. `<h2 id="beyond">Beyond this page</h2>` with **Further study** (6–10 links: extra LeetCode problems
   with real slugs, Wikipedia / cp-algorithms / official docs / well-known books) and **Look these up
   yourself** (5–8 genuinely relevant ideas the lesson did not cover, one line each on why they matter).
   Only link URLs you are confident exist. LeetCode slugs must be real.

### The DSA realm (story bible)

Every DSA book is set in the same realm. **The Keeper** (she) is the recurring mentor; she runs the
guild in each town, never gives answers, and always asks the three questions, adapted to the pattern:
**What is settled? Why is this move safe? When do I stop?** "You" are the apprentice. Each pattern is
a different town with its own guild and a cast that personifies the algorithm's moving parts (named
after their code roles so the mapping is 1:1, e.g. Left & Right, Read & Write, Head & Tail). Books are
self-contained; a one-line nod to an earlier town is welcome, never required.

Taken: Arraytown and the Pointer Guild (two pointers). Suggested homes — pick freely, but no two
lessons may share a setting:

| Pattern | Suggested setting |
|---|---|
| sliding-window | Windmere, a canal town: a barge with a glass viewing window drifting along the bank (Head and Tail crew) |
| prefix-sum | The Counting House: ledger clerks, running totals, the vault of totals already seen |
| intervals | The Grand Hotel: bookings, ballrooms, a concierge who sorts the day |
| linked-lists | The island chain of one-way ferries: a rope you must never drop; tortoise and hare couriers |
| binary-search | The Oracle's tower: a yes/no oracle, halving staircases |
| stacks | The observatory waiting room: visitors waiting for someone taller; the plate tower |
| heaps | The arena gate: a door guard who admits only the best k |
| trees-dfs | The Great Orchard: one root, branching paths, a climber who reports back up |
| trees-bfs | The lighthouse floors: one ring of keepers at a time |
| graphs | The archipelago: islands, bridges, flooding tides |
| advanced-graphs | The Railway Company: prerequisites, rival clans merging (union-find), post roads with tolls |
| backtracking | The labyrinth: a ball of thread — choose, explore, un-choose |
| dp-1d | The monastery staircase: monks who write each answer on a scroll so no one climbs twice |
| dp-2d | The cartographers' grid: two maps, one table |
| tries | The word garden: a letter-tree that grows prefixes |
| bit-manipulation | The signal tower: rows of lanterns that are on or off |
| greedy | The stepping-stone river: always the best next stone, and a proof it never regrets |
| hashing | The post office of signatures: every letter sorted by its fingerprint |
| matrix | The tapestry weavers: rotating, spiralling, marking without extra thread |

## SD lessons (`src/lessons/*.mdx`, frontmatter: `title`, `description`, `module`, `order`, `minutes`)

**Reference implementation: `src/lessons/caching.mdx` with `src/data/sd/caching.ts`.** Read it in full;
mirror its structure, density and voice. Trace data lives in `src/data/sd/<slug>.ts`;
`tests/traces.test.ts` checks every trace structurally. No Playground/Practice. Keep `module` and
`order` unchanged unless told otherwise.

1. `<PatternHub pattern="sd-<slug>" start="prologue" … routes={[{ href:'#prologue', title:'📖 Read the story', text:'…' }, { href:'#decision-drills', title:'🧭 Decision drills', text:'…' }, { href:'#interview-script', title:'🎤 Say it in the room', text:'…' }]} />`
2. Prologue `Scene` (an incident or design review at Kestrel — see bible) → what this topic is for, when
   it shows up in interviews, and the reader's personal stakes (keep the old lesson's gap notes).
3. Parts/chapters, each: `Scene` → concept explained from first principles → `Mermaid`/`Figure`
   diagrams (architecture, sequence, data layout) → **worked numbers** (back-of-envelope with stated
   assumptions, arithmetic shown) → tradeoff table → `Trace` decision drill (2–3 steps; rows may be
   `[]`) → `Reveal` for the classic follow-up → **Catch the trap** (the hand-wave interviewers punish).
4. `<h2 id="decision-drills">` — a longer mixed `Trace` across the lesson's decisions (fold in the old
   `Quiz` questions) plus the existing `Quiz` checkpoint if useful.
5. `<h2 id="interview-script">Say it in the room</h2>` — the exact 60–90 second spoken answer, then
   the 5 most likely interviewer follow-ups, each in a `Reveal` with a model answer.
6. Cheat sheet table, pocket mistakes, closing `Scene`, links to related SD lessons and War Room
   entries that already exist (check `src/war/sd/` and `src/lessons/`).
7. `Beyond this page`: Further study (DDIA chapters by name, original papers — Dynamo, Bigtable,
   Spanner, Kafka, Raft — official docs, well-known engineering blogs only when certain) and Look these
   up yourself.

Numbers must be internally consistent and realistic (state assumptions: QPS, payload size, replication
factor). Don't invent vendor limits; when citing a product limit, say "check current docs" unless sure.

### Kestrel (SD story bible)

You have just joined **Kestrel**, a fictional consumer app (photo sharing, messaging, a marketplace —
whatever the lesson needs) growing from a dorm project to 100 million users. Recurring cast:
**Mara Quell** (she), principal engineer and your mentor — asks questions, draws boxes, never answers
first; **Dev Okafor** (he), the SRE who gets paged at 3 a.m. and narrates incidents dryly;
**Iris Tan** (she), product lead, whose "oh, and also…" is every new requirement; **Theo Brandt** (he),
the database whisperer who has seen every outage twice; and **the Interviewer**, who appears in short
interview-room interludes to show how the same idea is tested. Lessons are self-contained; each
opens with its own incident or design review.

## LLD lessons (`src/lld-lessons/*.mdx`, frontmatter: `title`, `description`, `module`, `order`, `minutes`)

Same treatment as SD (structure of `src/lessons/caching.mdx`), Java-heavy. Trace data lives in
`src/data/lld/<slug>.ts`. **Reference implementation: `src/lld-lessons/solid.mdx` with
`src/data/lld/solid.ts` and `tests/java/solid/Check.java`** — read all three. HintLadder labels for
design exercises: `import { turn } from '../data/lld/labels'` → `<HintLadder labels={turn} …>`.

- **One running group.** Put the evolving design of a chapter or of the whole lesson in one
  `group=<name>` so later blocks add classes without editing earlier ones ("add, don't edit" becomes
  mechanical). When a change genuinely needs an edit, start a new group and repeat the unchanged types.
- **Compile the messes when you can** (give them their own id) so `Check.java` can show the bug
  happening and prove the refactor preserves behaviour.
- **Numbers quoted in traces and prose** (fees, counts, outputs) are verified in `Check.java`.
- Plain `class Foo` inside a block becomes an inner class of `B_<group>`: construct it in the checker
  with `B_garage outer = new B_garage(); outer.new Foo()`, or declare it `static class` in the block.
  Records, enums and interfaces are implicitly static.

- Every design shown as compilable Java (` ```java id=… group=… `), checked by `check-java`.
  Behaviour that can be tested (state machines, caches, rate limiters, observers, thread-safe
  structures) gets a `tests/java/<slug>/Check.java`. Concurrency code: test with real threads and
  assert invariants (no lost updates, no deadlock within a timeout).
- Each pattern/principle chapter: `Scene` (a code review at the Gearhouse) → **the mess** (fragment)
  → detection cue → the refactor (compilable) → class diagram (`Mermaid classDiagram`) → when NOT to
  use it → interview script.
- "Your turn" `HintLadder`s with `labels={['A small nudge', 'Name the classes', 'The key interaction', 'Compare with the Java design']}`.
- Keep links to existing War Room dossiers (`src/war/lld/`).

### The Gearhouse (LLD story bible)

You are the newest engineer at **the Gearhouse**, a fictional workshop that builds software for
machines — parking garages, vending machines, elevators, ticket counters. Recurring cast: **Wren
Adeyemi** (she), lead engineer and your mentor, whose code reviews always begin "what changes next?";
**Bram** (he), the client who arrives each week with "one small change"; **Oona** (she), the QA
engineer who breaks everything with one weird input; and **the Interviewer** for machine-coding
interludes.

## Definition of done (every lesson)

- [ ] Every roadmap problem / topic in scope is taught completely; nothing from the old lesson is lost
      (problems, code, personal notes, quiz questions folded in).
- [ ] `node scripts/check-java.mjs <slug>` passes (DSA: PASS with a checker; SD: no Java or compiled).
- [ ] `node --experimental-strip-types --test tests/<slug>.test.ts` passes (DSA).
- [ ] Private build passes; the page renders (open the built HTML or screenshot if a browser is available).
- [ ] Every figure number, trace answer and complexity re-checked.
- [ ] `Beyond this page` present with real links and look-these-up items.
- [ ] No other author's files edited.
