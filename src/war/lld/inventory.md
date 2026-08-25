---
title: "The inventory"
description: "Honest grading of all 18 patterns — which ones the framework supplied, the 8 GoF patterns that are not there, and the flagged findings."
order: 2
minutes: 8
---

22 patterns found across ~4,800 files, graded by provenance. **Grade matters more than
presence** — a framework-mediated pattern is one you can recognise but probably can't rebuild.

| # | Pattern | Grade | What it's doing |
|---|---|---|---|
| 1 | Strategy | Hand-written | 5 payment gateways, one contract |
| 2 | Registry / Factory | Hand-written | `List<T>` → `Map<enum,T>`, three independent sites |
| 3 | Template Method | Hand-written | Shared export flow, 3 hooks, 2 subclasses |
| 4 | Builder | Hand-written | FHIR bundles, generated builders, test-data builders |
| 5 | Adapter | Hand-written | Query execution seam for a future read replica |
| 6 | Decorator | Hand-written | Context propagation across a thread pool |
| 7 | Observer / Pub-Sub | Hand-written | Broker → Redis fan-out → SSE, plus 2 in-process rungs |
| 8 | State | Hand-written | Transition table on an enum; a bed state service |
| 9 | Interpreter | Hand-written | Report DSL → validated AST → parameterised SQL |
| 10 | Specification | Hand-written | ~12 optional filters composed as predicates |
| 11 | Null Object | Hand-written | Stub engine + mock gateway, swapped by property |
| 12 | Facade | Hand-written | 12 remote clients, 65 methods, one failure policy |
| 13 | Ambient context | Hand-written | ThreadLocal tenant/branch holders |
| 14 | Marker Interface | Hand-written | Empty interface, 11 implementors, pre-`sealed` |
| 15 | Copy-on-write registry | Hand-written | Two maps swapped atomically as one record |
| 16 | Saga / compensation | Hand-written | Undo remote side effects a rollback can't reach |
| 17 | **Proxy** | **Framework** | 18 declarative HTTP clients, 10 AOP aspects |
| 18 | **Chain of Responsibility** | **Framework** | Servlet filter chain, order = data dependency |
| 19 | **Object Pool** | **Framework** | Thread pools, connection pool |
| 20 | Prototype | Partial | Tenant clone — form seeding, not a deep `clone()` |
| 21 | Memento | Partial | Optimistic-lock versions + an audit trail |
| 22 | **Command** | **Named, but not** | Parameter objects; no `execute()` |

**Read the three bold rows first.** Those are the gaps between recognising and being able to
produce.

---

## The eight that aren't here

No instance exists, so there's no *why* to recover — you have to build one. Each graft keeps the
same hospital domain so the story stays continuous.

| Pattern | Graft point | The forcing problem to build toward |
|---|---|---|
| **Composite** | A `BillLine` tree: package → sub-services → items, `total()` recurses | Hospital packages genuinely nest; a flat list can't price them |
| **Visitor** | Walk that tree with tax, render, and audit visitors | Three operations over one structure, added without reopening nodes |
| **Bridge** | `Invoice` (consultation/pharmacy/lab) × `Renderer` (PDF/HTML/thermal 58mm) | 3×3 combinations; 6 classes instead of 9 |
| **Abstract Factory** | Per-country families: gateway + SMS provider + tax format | The family must stay consistent — a GST invoice with a UAE gateway is nonsense |
| **Mediator** | Front desk: appointment ↔ payment ↔ notification ↔ bed | Four things that all react to each other; alternative is N² references |
| **Iterator** | Slot iterator over a doctor's day: shift, slot length, breaks | Traversal logic that isn't the collection's business |
| **Flyweight** | Shared immutable medicine masters vs per-dispense qty/batch/expiry | 50k medicines against a million dispense lines |
| **Memento** | Prescription draft save/restore | Undo without exposing internals |

Plus two rebuilds of things that *are* here but framework-supplied or mislabelled:
a **hand-rolled Chain of Responsibility**, and a **real Command** with `execute()`/`undo()`.

---

## Flagged findings

Real defects found while reading for the *why*. These are the best interview material on the whole
site, because "what's wrong with this code?" is a standard round and these are not toy examples.

### 1. A duplicated AOP pointcut — latent bug

An aspect routes database calls by package. One advice is commented *"USER_DB — all classes under
`service.user.*`"* but its pointcut says `service.patient.*` — identical to the advice above it.
Verified: there is no `service/user` package at all.

Two consequences: `USER_*` routing **never fires**, and **both** advices now run on every
`service.patient.*` call. Ordering between two `@Before` methods in the same aspect is
unspecified, so patient calls may be routed to the wrong datasource unpredictably.

> **The pattern lesson:** AOP is a Proxy whose binding between advice and target is *a string*.
> No compiler checks it. That's the standing cost of the pattern — naming that cost is what
> separates a senior answer from a fluent one.

### 2. A lazily-built strategy map — data race

```java
private Map<Gateway, GatewayService> gatewayMap;   // not final, not volatile

public GatewayService getGateway(Gateway g) {
    if (gatewayMap == null) {                       // unsynchronised check-then-act
        gatewayMap = gateways.stream().collect(toMap(...));
    }
    ...
}
```

Three issues. Concurrent callers each building a map is harmless — the result is identical. The
**publication** is not: on a non-volatile field, another thread can observe a non-null reference
to a partially constructed `HashMap`. And there was never a reason to be lazy — the constructor
already holds the full list, exactly as the two sibling registries demonstrate.

> **The answer:** build it in the constructor, `final`, `Map.copyOf(...)`. Eager, immutable,
> thread-safe, fails at boot. *The fix for lazy-init thread-safety is usually to stop being lazy.*

### 3. A Null Object that fails open

The stub report engine is registered `matchIfMissing = true`. A missing property therefore serves
**canned data as real reporting**, and its own javadoc warns it must be disabled when the real
engine lands. Correct by documentation, fragile by default. A sibling registry gets this right
with `matchIfMissing = false` — off unless explicitly switched on.

> **The principle:** a stub should fail **closed**. Defaulting to "fake data" is a
> silent-wrong-answer machine.

### Bonus smell: six overloads

One class has **six overloads** of the same method, telescoping through boolean flags
(`skipAmbiguousPhoneCheck`, `internationalConsultation`). That's the exact pain a parameter object
removes — in a class named `*Factory` that is really a resolver with side effects. Two naming
lessons and one refactor in a single file.
