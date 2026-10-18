# Interactive components

All components are static Astro + vanilla TS; progress lives in `localStorage` only (no backend). Use them in `.mdx` lessons after importing.

| Component | Purpose |
|---|---|
| `Trace` | Step-by-step predict-the-move puzzle with per-choice explanations. |
| `Reveal` | `<details>` "predict first" box; answer hidden until opened. |
| `Quiz` | Multiple-choice checkpoint with explanations, score, persistence. |
| `ChapterDone` | End-of-chapter "mark complete" toggle. |
| `LessonProgress` | Summary of chapters done + quiz results; place once near the top. |
| `SimShell` + `src/lib/sim.ts` | Host interactive simulations (owned separately; see those files). |

## Quiz

```mdx
<Quiz
  id="cache-basics"
  title="Caching checkpoint"
  questions={[
    {
      kind: 'predict',
      q: 'What does this return?',
      code: "SELECT COUNT(*) FROM orders WHERE coupon = NULL;",
      options: ['0', 'NULL', 'An error'],
      answer: 0,
      why: 'Comparing with NULL via = is never true; use IS NULL.',
      explain: [
        'Correct: the predicate is unknown for every row, so no rows match.',
        'COUNT(*) always returns a number, never NULL.',
        'The statement is valid SQL; it just matches nothing.',
      ],
    },
  ]}
/>
```

Props: `questions` (required), `id?` (stable persistence id; default is the quiz's position on the page, so set it if quizzes may be reordered), `title?`.
Per question: `q`, `options`, `answer` (index), `why` are required (the old API, unchanged). Optional: `explain?: string[]` (one entry per option), `code?: string` (rendered in `<pre>`), `kind?: 'scenario' | 'predict' | 'tradeoff' | 'failure'` (label chip).

Behaviour: picking locks the question and shows a verdict, then every option's explanation (your pick first, then the correct one, then the rest) when `explain` is given, else just `why`. "Try again" resets one question; once all are answered "Score 3/4" and "Retry whole quiz" appear. Best score and picks persist under `citadel-quiz-v1:<pathname>:<id|index>`. A bubbling `citadel:quiz-complete` event (`detail: {key, score, total}`) fires on completion. "Passed" = best score of at least 70%.

## ChapterDone / LessonProgress

```mdx
<LessonProgress />
...
<ChapterDone id="why-cache" />
```

`ChapterDone` props: `id` (unique per lesson, required), `label?`. It never auto-marks; the reader toggles it. State key: `citadel-chapter-v1:<pathname>:<id>`. It fires `citadel:chapter-change`.
`LessonProgress` finds every `[data-chapter-done]` and `[data-quiz]` on the page and shows "3 of 12 chapters done", a progress bar, "Quizzes: 5/7 passed", and a "Reset progress" button (clears this page's keys and fires `citadel:progress-reset`, which Quiz and ChapterDone listen to).

## Accessibility and no-JS

- Real `<button>`s; `aria-pressed` reflects pick/complete state, answered options are `disabled`; focus moves to the feedback panel after answering and back to the question on retry.
- Correct/incorrect is also text (`✓ Correct`, `✗ Incorrect`), never colour alone. The score is announced via an `aria-live` region.
- Without JS: `Quiz` renders a `<noscript>` list with each question, the correct answer marked, and explanations; `ChapterDone` and `LessonProgress` render nothing.
- If storage is blocked, state lives in memory for the page visit (`src/lib/learn-store.ts`).

## ShardingSim
`<ShardingSim shards={4} keys={1000} mode="mod|ring|slots" vnodes={8} hot={false} hotShare={0.3} />` (all optional; `title`, `fallback` too). Logic: `src/lib/sim/sharding.ts`.

## TokenBucketSim
`<TokenBucketSim capacity={10} refill={5} rate={3} burst={15} mode="bucket|fixed|sliding|compare" speed={1} />`. Window limiters use `refill` requests per 1s window. Logic: `src/lib/sim/ratelimit.ts`. Starts playing unless prefers-reduced-motion.

## LruLfuSim
`<LruLfuSim capacity={4} preset="scan|hotscan|skew|stale|custom" />`. Palette clicks append to a custom sequence. Logic: `src/lib/sim/cache.ts` (`PRESETS` live there).

## Simulations: optimistic lock, stampede, SWR

Each is self-contained: `<SimShell>` is inside the component, logic lives in `src/lib/sim/<name>.ts` (pure, unit-tested in `tests/sim-<name>.test.ts`). Import in MDX with `import X from '../components/sim/X.astro'`.

## OptimisticLockSim
Props: `initialValue` (10), `initialVersion` (1), `mode` (`'optimistic' | 'none' | 'pessimistic'`, starting mode).
Stepper plus a radio group switching between version check, no check (lost update) and `SELECT ... FOR UPDATE`.
`<OptimisticLockSim />` or `<OptimisticLockSim initialValue={5} mode="none" />`

## StampedeSim
Props: `defaultRequests` (10000), `defaultHitRatio` (0, percent), `defaultCapacity` (1500), `defaultTtl` (60 s), `defaultJitter` (10, % of TTL), `defaultRefillMs` (200), `defaultMitigation` (`'none' | 'lock' | 'jitter' | 'swr'`), `panelRps` (200000, for the hit-ratio panel).
`<StampedeSim defaultCapacity={5000} defaultMitigation="lock" />`

## SwrSim
Props: `defaultSoftTtl` (5 s), `defaultHardTtl` (15 s), `defaultOriginMs` (800), `defaultRps` (2).
Controls: add request at the current time, a current-time slider, play (jumps to the end under `prefers-reduced-motion`), run to end, reset.
`<SwrSim defaultOriginMs={1500} defaultRps={5} />`

## RevisionCards, AnswerModes, StatusBadge, MockInterview, ThreadTimelineSim

All follow the same rules as above: real buttons, `aria-live` status text, reduced-motion safe, state via `src/lib/learn-store.ts`, readable text without JS.

**Spaced revision** - `Quiz` (wrong answers), `RevisionCards` ("Got it" / "Difficult" / "Review again") and `ChapterDone` (Remembered / Difficult / Forgotten row) feed `src/lib/revision.ts`; due items appear on `/review/`. Give each component an explicit `id` (it forms the stable item id `<wing>:<slug>:<kind>:<id>`); anchors are `rv-quiz-*`, `rv-cards-*`, `rv-chapter-*`. Algorithm, ids, keys, migration: `docs/REVISION.md`.

**RevisionCards** - `<RevisionCards id="solid-srp" cards={[{ front: 'What problem does SRP solve?', back: '...' }]} title? />`. Card fronts are `<button aria-expanded>` (click/Enter/Space); after flipping, "Got it" / "Difficult" / "Review again". Header shows "4 of 6 got it" and "Reset". Back text is plain text. Key: `citadel-cards-v1:<pathname>:<id>`. No JS: a definition list of all fronts and backs.

**AnswerModes** - `<AnswerModes id="rabbit-vs-kafka" q="Why RabbitMQ over Kafka?">` with `<Fragment slot="short|medium|deep">` children (markdown works in MDX; any subset of slots). The answer stays hidden until "Show model answer"; tabs (`role=tablist`, Left/Right/Home/End) switch 30 seconds / 2 minutes / Detailed; checkbox "I answered it myself first" persists with the last tab. Key: `citadel-answer-v1:<pathname>:<id>`. No JS: all depths shown in order.

**StatusBadge / StatusLegend** - `<StatusBadge kind="implemented|tested|planned|hypothetical|unverified" label? />` renders icon + text + colour (plus solid/dotted/dashed border). `<StatusLegend />` explains the five kinds; place once per page.

**MockInterview** - `<MockInterview id="parking-lot" minutes={60|90} phases={[{ name, minutes, prompt, hints?: [up to 3], reveal?: 'text' }]} checklist={['...']} />`. Phase minutes are scaled to sum to `minutes`. Countdown uses `Date.now()` deltas (survives tab sleep and reloads while running). One phase at a time with its own budget ("over budget by ..."), persisted notes, progressive Hint button, and a reference that stays locked until notes are typed or "I attempted this" is ticked (`reveal` is plain text, line breaks kept). The last phase's button leads to the self-assessment checklist and score. Key: `citadel-mock-v1:<pathname>:<id>`. Pure logic and tests: `src/lib/mock-interview.ts`, `tests/mock-interview.test.ts`. No JS: the whole script (prompts, hints, references) is listed.

**ThreadTimelineSim** (`src/components/sim/ThreadTimelineSim.astro`) - `<ThreadTimelineSim scenario="lost-update" />`; `scenario` is a preset id or a JSON-serialisable `Scenario` object. Presets: `lost-update`, `lost-update-synchronized`, `atomic-cas`, `check-then-act`, `check-then-act-synchronized`, `visibility`, `visibility-volatile`, `deadlock`, `deadlock-ordered`. Lanes are threads, columns are steps; the panel shows shared variables, lock owners, per-thread registers and cached copies, with changes highlighted. "Watch" steps the preset schedule through the SimShell stepper; "Choose the interleaving" lets the reader pick which thread runs next (Undo / Start over) and reports whether they reproduced the bug. Outcomes come from `src/lib/sim/thread-timeline.ts` (`trace`, `exploreAll`, `step`), tested in `tests/sim-thread-timeline.test.ts`. The memory model is simplified (non-volatile reads use a per-thread cache; lock/volatile/CAS see main memory) and the visibility text states that a stale read is permitted by the JMM, not guaranteed.
