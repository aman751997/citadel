---
title: "Build drills"
description: "Timed, from-scratch pattern drills — no framework, no IDE autocomplete. The part that transfers to machine-coding rounds."
order: 3
minutes: 10
---

Recognition is not ability. Each drill is **timed, from scratch, plain Java, no framework** —
because that's the interview. Do them in order; each reuses the last one's domain.

**The domain, for all drills:** a hospital front desk. Book an appointment → take a payment →
notify the patient → print a bill → report on it. One story, so nothing new to memorise.

---

## Drill 1 — Hand-rolled Chain of Responsibility
**45 min · highest priority**

You have only ever seen the framework version. Build the request pipeline by hand.

**Requirements**
- `Handler` base class with `setNext(Handler)` and `handle(Request)`.
- Four handlers in order: authenticate → resolve branch → resolve tenant → rate-limit.
- Handler 2 and 3 **read what handler 1 produced.** Model that dependency explicitly — that's
  the whole lesson.
- Any handler may short-circuit (reject) without calling the next.
- Context set by a handler must be cleaned up even when a later handler throws.

**Done when:** you can add a fifth handler without editing any existing handler, and a
`finally`-based cleanup test passes with an exception thrown from the last handler.

**Follow-ups to prepare:** Why a linked list rather than a `List<Handler>` you loop over? (Both
work; the linked form lets a handler decide *whether* to continue and *what* to pass on.) Where
does ordering live, and what happens when two handlers both claim position 2?

---

## Drill 2 — Strategy + Registry, with a real signature problem
**50 min**

**Requirements**
- `PaymentGateway` interface: `createOrder`, `verifyWebhook`, `refund`, `name()`.
- Three implementations whose `verifyWebhook` genuinely differ:
  one HMAC over the raw body; one hashing a single field extracted from a JSON envelope; one over
  form-urlencoded params with a key removed first. **Don't skip this** — identical stubs teach you
  nothing, and the difference is the whole argument for the pattern.
- A registry built from a constructor-injected list, keyed by `name()`, immutable.
- A router that receives `(gatewayName, rawPayload)` and verifies via the right strategy.

**Done when:** adding a fourth gateway touches exactly one new file.

**Then break it on purpose:** make the registry lazy and non-volatile, and explain the JMM
publication hazard out loud. That's finding #2 from the [inventory](/citadel/war/lld/inventory/).

---

## Drill 3 — State, both ways
**40 min**

**Part A.** Transition table on an enum: `allowedTransitions()` + `canTransitionTo()`, terminal
states return empty. Guard every mutation behind one service method.

**Part B.** Now the requirement changes: each state must *behave* differently — a `RESERVED`
booking sends a hold-expiry reminder, an `OCCUPIED` one starts billing, `HOUSEKEEPING` creates a
task. Refactor to one class per state.

**Done when:** you can say in one sentence when each form is correct. (Edges vary → table.
Behaviour varies → polymorphic. Both → polymorphic with the table as a guard.)

---

## Drill 4 — Composite + Visitor on a bill tree
**60 min · nothing to recognise, only to build**

**Requirements**
- `BillLine` as a tree: a package contains sub-services contains items. Leaf and composite share
  an interface; `total()` recurses.
- Three visitors over the same tree: compute tax, render to text, audit which discounts applied.
- Add a fourth visitor without editing any node class.

**Done when:** adding a node type forces a compile error in every visitor (that's the trade-off —
Visitor makes operations cheap and node types expensive; say so).

---

## Drill 5 — A tiny Interpreter
**75 min · highest ceiling**

Build "user-defined queries without user-defined SQL".

**Requirements**
- A small AST: `datasource`, `dimensions[]`, `measures[]` (with an aggregation), `filters[]`,
  `sort`, `limit`.
- A **catalog**: the allow-list of datasources → fields → physical column names and types.
- A validator that rejects anything not in the catalog, with field-level errors.
- A compiler emitting parameterised SQL. Enforce all five invariants:
  1. identifiers only from the catalog, never from an input string
  2. every value a bound parameter
  3. aliases sanitised, de-duplicated, quoted
  4. `GROUP BY`/`ORDER BY` by output **ordinal**, never by user string
  5. a tenant predicate injected unconditionally; refuse if the datasource has no tenant column
- A hard row cap enforced in more than one place.

**Done when:** you can hand it a hostile input (`"; DROP TABLE"`, a field not in the catalog, a
1,000,000 limit, an alias with quotes in it) and each is rejected by a *named* invariant rather
than by luck.

**This is the drill that wins senior rounds.** "Design a rule engine / query builder / filter DSL"
is a top-ten prompt, and most candidates answer it with string concatenation and a sanitiser.

---

## Drill 6 — Compensating action
**40 min**

**Requirements**
- An operation that writes a local record, calls two fake remote services, then runs a validation
  that fails.
- The method must return **what it created**, not just a result.
- A `compensate(result)` that undoes the remote effects, and is a no-op when nothing was created.
- Make compensation idempotent — running it twice must be safe.

**Done when:** you can explain why the return type carries `newlyCreated`, and what breaks if it
doesn't.

---

## Dress rehearsals

90 minutes each, no notes, from the same domain:

1. **Design the appointment slot system.** A doctor's day, shifts, breaks, variable slot lengths,
   no double-booking under concurrent booking. (Iterator + State + optimistic locking.)
2. **Design the billing engine.** Nested packages, per-item tax, three output formats, discounts
   with an audit trail. (Composite + Visitor + Bridge + Builder.)
3. **Design the notification system.** Four channels, per-tenant provider choice, per-user
   preferences, retries, and no duplicate sends. (Strategy + Abstract Factory + idempotency.)
4. **Design the report builder.** Users define reports at runtime; you never run their SQL.
   (Interpreter + Adapter + Specification.)

Score yourself on three things only: did you name the forcing problem before naming the pattern;
did you state one trade-off unprompted; did you finish something runnable.
