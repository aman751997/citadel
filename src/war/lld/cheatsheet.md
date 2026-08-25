---
title: "Cheatsheet"
description: "One line per pattern — the page you reread right before the round."
order: 4
minutes: 4
---

One line per pattern: **the situation → the pattern**. If the story worked, reading the left
column should make the right column arrive on its own. This is the page to reread in the ten
minutes before a round.

## Creation

| Situation | Pattern |
|---|---|
| You hold an identifier and need the handler for it; handlers should grow without editing the lookup | **Registry** — key it by a method on the strategy itself, build the map in the constructor |
| Object needs many optional parts, assembled in stages, from different sources | **Builder** |
| A matched *family* of choices that must stay internally consistent (gateway + SMS + tax format per country) | **Abstract Factory** |
| Expensive-to-construct object you need many near-copies of | **Prototype** |
| Constructor has 4+ params, several of them booleans | **Parameter object** — and stop adding overloads |

## Structure

| Situation | Pattern |
|---|---|
| Add behaviour while staying substitutable for the thing you wrap | **Decorator** — same interface in, same out |
| Third-party or replaceable dependency, and you want the swap to be config not code | **Adapter** — sized to the one call you actually make |
| Many collaborators, plus a cross-cutting rule that must be identical for all of them | **Facade** — and put the rule inside it |
| A guarantee that must hold on every call, including calls nobody has written yet | **Proxy / interception**, not discipline |
| The thing is a tree and totals/render must recurse | **Composite** |
| Two independent axes of variation (3 types × 3 renderers) | **Bridge** — 6 classes, not 9 |
| Huge number of objects sharing most of their state | **Flyweight** — split intrinsic from extrinsic |

## Behaviour

| Situation | Pattern |
|---|---|
| One operation, N implementations sharing nothing but their signature, chosen by runtime data | **Strategy** |
| Fixed sequence where one step can't be written where the sequence lives | **Template Method** — the hook is usually a dependency boundary |
| Sequential steps, each needing the previous one's output, list should be extensible | **Chain of Responsibility** |
| N interested parties, unknown to the producer, needing to know *when* | **Observer** — and say "unsubscribe" out loud |
| Not every status change is legal, and an illegal one corrupts data rather than erroring | **State** |
| Users express open-ended requests you can't enumerate in advance | **Interpreter** — identifiers from a whitelist, values as parameters |
| Optional filters composed at runtime, where absent ≠ null-matching | **Specification** |
| An action that must be undoable, queueable, or auditable | **Command** — with `execute()` *and* `undo()` |
| Several operations over one stable structure, added without reopening the nodes | **Visitor** |
| Four things that all react to each other | **Mediator** — the alternative is N² references |
| Snapshot and restore without exposing internals | **Memento** |
| A collaborator that doesn't exist yet, but whose interface you can agree on now | **Null Object / Stub** behind the real seam — and make it fail *closed* |

## The three sentences worth memorising verbatim

> **On Strategy:** "The five implementations don't share an algorithm — they don't even share a
> payload format. One takes raw JSON, one takes a JSON envelope, two take form-urlencoded. An
> if-else would have to branch on parsing before it could branch on verification."

> **On Singletons / ambient context:** "The problem isn't testability. It's that a ThreadLocal
> belongs to one thread, so the moment work crosses to a pool the value is silently absent — and
> the consumer downstream falls back to a default instead of failing. That's how you get data
> written under the wrong tenant."

> **On distributed transactions:** "`@Transactional` rolls back the database. It does not roll
> back the account you created in another service or the row you wrote to a vault. If one logical
> operation spans both, you need a compensating action — and the method has to *return what it
> created*, because the caller can't compensate what it wasn't told about."
