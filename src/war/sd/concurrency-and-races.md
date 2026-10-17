---
title: "Concurrency and races"
description: "Two users book the last bed at the same time. Locks, versions, idempotency, and a bad example from the codebase."
order: 11
minutes: 9
---

**The prompt this answers:** *"Two receptionists assign the last available bed at the same
instant. What happens?"* Or its cousins: last seat, last item of stock, duplicate invoice
number.

A race (or race condition) is a bug where the result depends on which of two things happens first. Nobody controls the timing, so the bug shows up only sometimes.

This codebase has five different races. Each one is solved with a different tool. The real skill is knowing *which tool fits which race*.

---

## Race 1 — two admissions grab the same bed

**What goes wrong.** Two receptionists admit two patients at the same moment. The code does a `SELECT` to find the first available bed, then an `UPDATE` to mark it occupied. Both transactions read the same row. Both write to it. One patient silently loses their bed.

Think of two people reaching for the last chair at the same time. Both think they got it.

**The fix.** Lock the row while you work on it (row-level locking), and skip any row that someone else has already locked (`SKIP LOCKED`).

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

**Why this fix (and not the obvious alternative).** The obvious choice is plain `FOR UPDATE`. It makes the second transaction *wait* until the first one finishes. But the second admission does not need that exact bed. Any free bed will do.

`SKIP LOCKED` steps over locked rows and returns the next free one. So two admissions at the same time get **two different beds**. Neither waits. That means more work done in parallel, instead of everyone queuing in a line (serialisation means "one after another").

**Two details worth noticing:**
- This is a native query, meaning raw SQL written by hand. It **bypasses the ORM tenant filter**. The ORM (the library that maps Java objects to tables) normally adds `tenant_id` to every query for you, so one hospital never sees another's data. Raw SQL skips that, so `tenant_id` is passed explicitly. The javadoc says exactly this. If you step around one safety mechanism, you must rebuild it by hand.
- The `ORDER BY` is fixed (ward, room, bed code). Without it, two transactions can lock rows in different orders. Then each holds a row the other needs, and both wait forever. That is a deadlock, and it is the classic recipe for one.

**Say this in the interview:** *"`SKIP LOCKED` fits when the caller wants **any** row from a pool. For one **specific** row, use `FOR UPDATE` and accept the wait."*

---

## Race 2 — concurrent edits to the same record

**What goes wrong.** Two staff members open the same admission record and edit it. The second save overwrites the first, and nobody notices.

**The fix.** Optimistic locking. Put a `@Version` column on the records that get contended (beds, admissions). Optimistic means you do not lock anything up front. You just check at write time that nobody else changed the row.

Read version 4. Write with `WHERE version = 4`. The update either sets version 5, or it changes zero rows. Zero rows means someone else got there first. That is a conflict, so you retry or show it to the user.

**Why this fix (and not the obvious alternative).** The obvious alternative is pessimistic locking, which locks the row on every read. Here, conflicts are *rare*, because two people editing the same admission is unusual. But reads happen all the time. Pessimistic locking pays a lock cost on every read to prevent something unlikely. Optimistic locking pays nothing until a conflict really happens.

Both tools are used on beds. `SKIP LOCKED` handles the *assignment* path, where contention is high and any bed will do. `@Version` is the second line of defence for ordinary updates. Different races on the same table.

**Say this in the interview:** *"Pessimistic when conflicts are likely and retries are expensive. Optimistic when conflicts are rare and retries are cheap."*

---

## Race 3 — a half-updated cache

**What goes wrong.** Two lookup maps are built from the same table. One is keyed by short code, the other by full code. They must always agree: a code that exists in one must also resolve in the other. That rule is an invariant (something that must always be true). If you refresh the maps one after the other, a request that arrives in the middle sees one new map and one old map. The pair disagrees.

**The fix.** Make the two maps **one immutable value**, and swap the reference to it in a single atomic step. Immutable means it never changes after it is built. Atomic means other threads see either the old value or the new one, never something in between.

```java
private record Maps(Map<String,Lang> byIso, Map<String,Lang> byBcp47) {}
private final AtomicReference<Maps> maps = new AtomicReference<>(...);

// refresh: build both, then one atomic publish
maps.set(new Maps(newIso, newBcp47));
```

The code comment says: *"Atomic replacement of both maps together."* Readers always see a matching pair. There is no lock, and readers never block.

Think of printing a new menu and swapping it on the table in one move. Nobody ever reads a menu that is half old and half new.

**Why this fix (and not the obvious alternative).** The obvious alternative is a lock around the refresh and around every read. That would make readers wait. Merging the two maps into one value removes the problem instead of guarding it.

**Say this in the interview:** *"When two pieces of state share a rule, don't guard them with a lock. Merge them into one value and swap the pointer."* This pattern is called copy-on-write: build a fresh copy, then replace the old one. It answers a surprising number of "how do you make this thread-safe" questions.

---

## Race 4 — unsafe lazy initialisation

**What goes wrong.** Lazy initialisation means building something only when it is first needed. This is the bad example, [from the codebase](/citadel/lld/war/inventory/#flagged-findings):

```java
private Map<K,V> map;                 // not final, not volatile
if (map == null) { map = build(); }   // check-then-act, unsynchronised
```

There are two problems. Candidates usually spot only the first.

1. Two threads can both see `null` and both build the map. That is harmless here, because both builds give the same result.
2. The real danger is **publication**. Publication means making an object visible to other threads. Without `volatile`, another thread can see a non-null reference to a `HashMap` that is only partly built. The Java Memory Model (JMM) is the rulebook for what threads are allowed to see. It allows the constructor's writes to be reordered after the reference is assigned. So the reference can show up before the map's contents are ready.

**The fix.** Delete the laziness. The constructor already had everything it needed. Make the field `final`, build it once, and use `Map.copyOf(...)`.

**Why this fix (and not the obvious alternative).** The obvious fix is to add `volatile` or a lock. That works, but it keeps code that has no reason to exist. Building the map up front is simpler and safe by default.

**Say this in the interview:** *"If you must be lazy, use a `static` holder class, double-checked locking with a `volatile` field, or `computeIfAbsent`. But first ask why it's lazy at all. Most lazy-init bugs are chances to initialise eagerly."*

---

## Race 5 — duplicate side effects from a retried message

**What goes wrong.** Message systems often promise at-least-once delivery. That means a message is never lost, but it may arrive twice. In the AI pipeline, a duplicated webhook would re-run an expensive LLM call and write the derived data a second time.

**The fix.** An **idempotency key in Redis with a 1-hour TTL**. Idempotent means doing it twice has the same effect as doing it once. TTL (time to live) means the key deletes itself after an hour. The first message to arrive claims the key and gets processed. A duplicate finds the key already there and does nothing.

Related, in the hospital repo: unique constraints on natural keys (real-world identifiers, such as an invoice number). There is also a partial unique index that enforces *"at most one open housekeeping task per bed"*. A partial unique index applies the uniqueness rule only to some rows, here the open tasks. This pushes the rule into the database. The alternative is trusting application code to check first and insert second, which is itself a race.

**Why this fix (and not the obvious alternative).** The obvious wish is to make the system deliver each message exactly once. That is not available. So you make the receiver safe against repeats instead.

**Say this in the interview:** *"Exactly-once delivery is not available. Exactly-once **effect** is. You get it by making the consumer idempotent: a dedup key, or a unique constraint that makes the second write fail harmlessly."*

---

## The thread-boundary bug that isn't a race but reads like one

**What goes wrong.** A `ThreadLocal` is a variable that belongs to one thread. Context stored in it does not follow the work when that work moves onto a thread pool (a shared set of worker threads). The symptom was writes landing under a **default tenant**. There was no exception and no deadlock. Just wrong data, showing up intermittently, in proportion to how much traffic took the async path.

**The fix.** Copy the context when the work is submitted, and clear it in a `finally` block when the task ends.

**Why this belongs on this page.** It is the failure that concurrency questions are really probing for: *state that is quietly tied to a thread, while the work changes threads.*

Thread pools reuse threads. So one mechanism causes two symptoms. Context can be **absent** (it was never set on the new thread). Or it can be **stale** (left behind by the previous task). One `finally` fixes both.

---

## Cheatsheet

| Race | Tool | When |
|---|---|---|
| Two writers grab any-one-of-N rows | `FOR UPDATE SKIP LOCKED` | Caller wants *any* row from a pool |
| Two writers want one specific row | `FOR UPDATE` | Accept the wait |
| Rare concurrent edits, frequent reads | Optimistic `@Version` | Conflicts unlikely, retries cheap |
| Frequent contention, expensive retry | Pessimistic lock | Opposite of the row above |
| Two pieces of state that must always agree | Immutable record + `AtomicReference` | Readers must never see a half-update |
| Lazy singleton | Just be eager; else `volatile` + double-checked locking or holder class | Other threads must see a fully built object, not just take turns |
| Duplicate message delivery | Idempotency key, or a unique constraint | At-least-once delivery, always |
| Thread-bound state + thread pool | Copy on submit, clear in `finally` | Any async hand-off |
