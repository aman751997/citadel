# Spaced revision

Lightweight, localStorage-only revision across the four wings (DSA, System Design, LLD, Mastery). No backend. Logic: `src/lib/revision.ts` (pure, tested in `tests/revision.test.ts`); page: `src/pages/review.astro` (`/review/`, linked from the nav on every page).

## Algorithm (Leitner boxes)

Boxes 1..5 are reviewed after **1, 3, 7, 14, 30 days** (`INTERVAL_DAYS`). An item is due when `now >= dueAt`.

| Rating | Effect |
|---|---|
| remembered | box + 1 (max 5), `dueAt = now + interval(box)` |
| difficult | same box, `dueAt = now + interval(box)` |
| forgotten | box 1, `dueAt = now + 1 day` |

Lesson-time signals (made inside a lesson, `signal()`):
- wrong quiz answer, or "Review again" / chapter "Forgotten": item created or reset to box 1, **due immediately** (a revisit marker).
- "Difficult": keeps the current box (box 1 if new), due immediately.
- "Got it" / "Remembered": a normal `rate()`; a brand-new item starts in box 1 so lands in box 2 (due in 3 days).

Correct quiz answers do nothing. Retrying a question or resetting a lesson's progress does not delete scheduler items; delete via Reset on `/review/`.

## Item ids

`<wing>:<lesson-slug>:<kind>:<id>`; ids never contain lesson text, so editing prose never orphans progress.

- `wing`: `dsa | sd | lld | mastery`, taken from the URL (base-independent).
- `lesson-slug`: route after the wing, minus a leading `lessons/` (`/citadel/dsa/lessons/arrays/x/` -> `arrays/x`; mastery: `project/chapter`).
- `kind` and `id`: `quiz` -> `<quizId>-<questionIndex>` (`quizId` = the `id` prop, else `q<position on page>`); `cards` -> `<id prop>-<cardIndex>`; `chapter` -> the `ChapterDone` `id` prop.

Set explicit `id` props on `Quiz`, `RevisionCards` and `ChapterDone`; question/card order inside one component is part of the id, so append rather than reorder. Anchors (link targets) are `rv-quiz-<quizId>-<qi>`, `rv-cards-<id>-<i>`, `rv-chapter-<id>`.

## Storage keys

- `citadel-revision-v1`: `{ v: 1, items: { [id]: Item } }`. Item = `id, wing, path` (site-relative, base added at render), `anchor, kind, title, lesson, box, dueAt, lastAt, reviews`.
- `citadel-revision-backup`: copy of the previous value, written before Import/Reset replaces data or when an unreadable store is found.
- Existing keys are unchanged: `citadel-quiz-v1:*`, `citadel-cards-v1:*` (statuses are now `got | hard | again`), `citadel-chapter-v1:*`.

If storage is blocked, `learn-store.ts` keeps state in memory for the visit and `/review/` says so.

## Migration policy

- The store carries `v`. `migrate()` upgrades older versions step by step; **newer or unknown versions are never reinterpreted or overwritten**: the raw value is copied to the backup key, `/review/` shows a warning, and writes are refused until the user imports or resets.
- Invalid items are dropped on read; items whose key differs from their `id` are dropped.
- Legacy progress is migrated lazily on read: when a lesson loads, an old `cards` status of `again` seeds a box-1 due item, `got` seeds box 2 (due in 3 days), an old wrong quiz pick seeds a box-1 due item. Existing items are never overwritten. Chapter "done" flags are not seeded (rating is explicit).
- Export gives the whole store as JSON. Import validates first; a bad file changes nothing. Merge keeps, per id, the more recently reviewed copy; "Replace" swaps everything.
