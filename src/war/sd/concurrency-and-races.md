---
title: "Concurrency and races"
description: "Two users book the last bed at the same time — locks, versions, idempotency, and the anti-example from the codebase."
order: 11
minutes: 12
---

**The prompt this answers:** *"Two receptionists assign the last available bed at the same
instant. What happens?"* — or its cousins: last seat, last item of stock, duplicate invoice
number.

Five distinct races appear in this codebase, each solved differently. Knowing *which tool for
which race* is the actual skill.

---

## Race 1 — two admissions grab the same bed

**Naive version:** `SELECT` the first available bed, then `UPDATE` it to occupied. Two
transactions both read the same row, both write, one patient silently loses their bed.

**Solution used:** row-level locking with `SKIP LOCKED`.

```sql
SELECT b.* FROM bed b
  JOIN room r ON r.id = b.room_id
  JOIN ward w ON w.id = r.ward_id
 WHERE w.category = :category
   AND b.status = 'AVAILABLE'
   AND b.active AND r.active AND w.active
   AND b.tenant_id = :tenantId
 ORDER BY w.code, r.room_number, b.bed_code
 LIMIT 1
 FOR UPDATE OF b SKIP LOCKED
```

**Why `SKIP LOCKED` and not plain `FOR UPDATE`:** plain `FOR UPDATE` makes the second transaction
*wait* for the first. But it doesn't want that row — any free bed will do. `SKIP LOCKED` steps
over locked rows and returns the next candidate, so two concurrent admissions get **two different
beds** instead of one waiting on the other. Throughput instead of serialisation.

**Two details worth noticing:**
- It's a native query, which **bypasses the ORM tenant filter** — so `tenant_id` is passed
  explicitly. The javadoc says exactly this. Escaping one safety mechanism obliges you to
  re-implement it by hand.
- Deterministic `ORDER BY` (ward, room, bed code). Without it, two transactions can pick rows in
  different orders — the classic deadlock recipe.

**Say this:** *"`SKIP LOCKED` is the right tool when the caller wants **any** row from a pool, not
a **specific** row. For a specific row you want `FOR UPDATE` and you accept the wait."*

---

## Race 2 — concurrent edits to the same record

**Solution used:** optimistic locking — a `@Version` column on the entities that get contended
(beds, admissions).

Read version 4, write with `WHERE version = 4`, and the update either sets version 5 or affects
zero rows → conflict → retry or surface to the user.

**Why optimistic here rather than pessimistic:** conflicts are *rare* (two people editing the same
admission is unusual) but reads are constant. Pessimistic locking pays the lock cost on every
read to prevent an unlikely event. Optimistic pays nothing until a conflict actually happens.

**The rule to state:** *"Pessimistic when contention is likely and retries are expensive.
Optimistic when contention is rare and retries are cheap."*

Note both are used on beds — `SKIP LOCKED` for the *assignment* path (high contention, pooled
choice) and `@Version` as the second line of defence for ordinary updates. Different races on the
same table.

---

## Race 3 — a half-updated cache

Two lookup maps derived from the same table (one keyed by short code, one by full code) must
satisfy an invariant: a code present in one must resolve in the other. Refreshing them
sequentially means a request arriving mid-refresh sees an inconsistent pair.

**Solution used:** make the two maps **one immutable value** and swap the reference atomically.

```java
private record Maps(Map<String,Lang> byIso, Map<String,Lang> byBcp47) {}
private final AtomicReference<Maps> maps = new AtomicReference<>(...);

// refresh: build both, then one atomic publish
maps.set(new Maps(newIso, newBcp47));
```

The code comment: *"Atomic replacement of both maps together."* Readers always see a consistent
pair; no lock, no reader blocking.

**The generalisation:** *"When two pieces of state share an invariant, don't guard them with a
lock — merge them into one value and swap the pointer."* Copy-on-write. This is the answer to a
surprising number of "how do you make this thread-safe" questions.

---

## Race 4 — unsafe lazy initialisation

The anti-example, [from the codebase](/citadel/lld/war/inventory/#flagged-findings):

```java
private Map<K,V> map;                 // not final, not volatile
if (map == null) { map = build(); }   // check-then-act, unsynchronised
```

Two problems, and candidates usually only spot one. Yes, two threads can both build — harmless
here, since the result is identical. The real hazard is **publication**: without `volatile`, a
thread can observe a non-null reference to a partially constructed `HashMap`, because the JMM
permits the constructor's writes to be reordered after the reference assignment.

**The fix is to delete the laziness**, since the constructor already had everything it needed:
`final`, built once, `Map.copyOf(...)`.

**Say this:** *"If you must be lazy, the options are a `static` holder class, double-checked
locking with a `volatile` field, or `computeIfAbsent`. But first ask why it's lazy at all — most
lazy-init bugs are eager-init opportunities."*

---

## Race 5 — duplicate side effects from a retried message

At-least-once delivery means a consumer will see the same event twice. In the AI pipeline, a
duplicated webhook would re-run an expensive LLM call and double-write derived data.

**Solution used:** an **idempotency key in Redis with a 1-hour TTL** — first arrival claims the
key and processes; a duplicate finds the key and no-ops.

Related, in the hospital repo: unique constraints on natural keys and a partial unique index that
enforces *"at most one open housekeeping task per bed"* — pushing an invariant into the database
rather than trusting application code to check-then-insert.

**Say this:** *"Exactly-once delivery is not available. Exactly-once **effect** is, and you get it
by making the consumer idempotent — a dedup key, or a unique constraint that makes the second
write fail harmlessly."*

---

## The thread-boundary bug that isn't a race but reads like one

Context in a `ThreadLocal` doesn't follow work onto a thread pool. The symptom was writes landing
under a **default tenant** — not an exception, not a deadlock, just wrong data, intermittently, in
proportion to how much traffic went through the async path.

**Why it belongs on this page:** it's the failure mode that concurrency questions are really
probing for — *state that is implicitly bound to a thread, and work that changes threads.* Thread
pools reuse threads, so the same mechanism causes both **absent** context (never set) and **stale**
context (left behind by the previous task). One `finally` fixes both.

---

## Cheatsheet

| Race | Tool | When |
|---|---|---|
| Two writers grab any-one-of-N rows | `FOR UPDATE SKIP LOCKED` | Caller wants *any* row from a pool |
| Two writers want one specific row | `FOR UPDATE` | Accept the wait |
| Rare concurrent edits, frequent reads | Optimistic `@Version` | Conflicts unlikely, retries cheap |
| Frequent contention, expensive retry | Pessimistic lock | Inverse of the above |
| Two state pieces with a shared invariant | Immutable record + `AtomicReference` | Readers must never see a half-update |
| Lazy singleton | Just be eager; else `volatile` + DCL or holder class | Publication safety, not just mutual exclusion |
| Duplicate message delivery | Idempotency key, or a unique constraint | At-least-once delivery, always |
| Thread-bound state + thread pool | Copy on submit, clear in `finally` | Any async hand-off |
