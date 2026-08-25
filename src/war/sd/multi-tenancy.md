---
title: "Multi-tenant isolation"
description: "Design a SaaS where tenant A can never see tenant B — shared schema, tenant_id, and every layer that enforces it."
order: 10
minutes: 10
---

**The prompt this answers:** *"Design a SaaS platform where each customer's data is invisible to
every other customer."* Asked constantly, and most candidates stop at "add a `tenant_id` column".
The interesting part is everything after that.

## The three strategies, and why this system picked the hardest one

| Strategy | Isolation | Cost | Verdict here |
|---|---|---|---|
| **Database per tenant** | Strongest — physical | N migrations, N connection pools, N backups; onboarding is an infra task | Too expensive for hundreds of hospitals |
| **Schema per tenant** | Strong | Migration fan-out, connection routing, catalog bloat | Middle ground, still heavy |
| **Shared schema + `tenant_id`** | Weakest — one bug = a breach | Cheapest to run and migrate | **Chosen** |

Shared schema is the cheapest to operate and the **easiest to get catastrophically wrong**, so
the whole design is about compensating for that choice. Being able to say *"we took the cheap
option and here is the machinery that made it safe"* is a much stronger answer than picking the
safe option and having nothing to discuss.

## Layer 1 — the ambient context

The tenant lives in a `ThreadLocal`, not a method parameter. **80 files** read it.

The alternative — threading `tenantId` through every signature from controller to repository —
is a change to every method in the codebase, and it only takes one developer forgetting to
forward it. The javadoc states the trade: isolation *"without requiring `tenantId` to be passed
through every method signature."*

**The cost you must volunteer:** an invisible value has an invisible lifecycle. Every boundary it
crosses is somewhere it can go missing.

## Layer 2 — populating it, in dependency order

Three ordered filters, and **the order is a data dependency, not a preference**:

```
AuthFilter    (1)  parse JWT → security context
BranchFilter  (2)  read branchId claim FROM that context
TenantFilter  (3)  read tenantId claim; wants both present
```

Resolution order inside the tenant filter is itself a design decision worth stating:

1. the JWT claim — cryptographically signed, therefore **authoritative**
2. an `X-Tenant-Id` header — only for self-service flows that have no JWT yet
3. a default tenant

> **The follow-up:** *"Can't a client just send the header and read another tenant's data?"* No —
> the JWT claim wins when present, and it's signed. The header path only exists for pre-auth
> flows. If you can't answer this, the design is indefensible; if you can, you've shown you
> thought about the attack.

Each filter clears its ThreadLocal in a `finally`. On a pooled thread, skipping that leaks one
request's tenant into the next request that lands on that thread.

## Layer 3 — enforcement at the ORM, not the query

Every `SELECT` gets a tenant predicate injected by an ORM-level filter, so **application code
cannot forget it**. Application code that writes `findByStatus(ACTIVE)` still gets
`WHERE tenant_id = ?` appended.

### The bug that proves the layer is necessary

The filter must be enabled on the **session that actually runs the query**. A service method
without `@Transactional` has no transaction, so the filter bound to one session while the query
ran on another. The javadoc:

> *"This removes the silent cross-tenant leak where a non-transactional getter bypassed the
> filter."*

The fix: an aspect wrapping **every** repository call that opens a read-only transaction when none
is active, guaranteeing the filter and the query share a session.

**This is the single best thing to bring to a multi-tenancy question.** It shows the failure mode
isn't hypothetical, and that "add a WHERE clause" is nowhere near sufficient.

## Layer 4 — writes

An ORM `PreInsert`/`PreUpdate` listener stamps `tenant_id` on the way in, resolving from context.
Reads and writes are guarded by different mechanisms, which is deliberate: a read leak exposes
data, a write leak *corrupts* it, and they fail differently.

## Layer 5 — the thread boundary

ThreadLocals don't follow async work. Without a task decorator copying context onto pool threads,
async writes persisted under the default tenant — **silently**, because the listener falls back
rather than failing.

That's the whole isolation story in one bug: five layers of defence, and the leak appeared in the
one place where the context simply wasn't there.

## The deliberate holes

A design with no exceptions is a design that hasn't met production:

- **Global entities.** Country codes, language masters, system templates are tenant-agnostic. They
  extend a separate base class with no filter annotations, so the filter *never* applies. Making
  the exception structural rather than conditional means nobody can accidentally opt an entity out.
- **Platform operators.** Support staff need cross-tenant reads. Gated on a platform tenant **and**
  a specific role — both conditions, not either.
- **Reporting.** Platform roles are refused tenant reports outright, resolving to `DENY` rather
  than an unscoped query. Cross-tenant analytics goes through a separate aggregate path.

## Answering it in an interview

1. Name the three strategies and pick one **with a reason** (cost vs. blast radius).
2. Say "shared schema means one bug is a breach", then present the layers as compensations.
3. Volunteer the async/thread-boundary hole — it's the one nobody mentions, and it's real.
4. Have the exceptions ready: global reference data, platform operators, analytics.

**Sketch:**

```
request → [auth] → [branch] → [tenant]        ordered, each consumes the last
                                  ↓
                          ThreadLocal context
                            ↓            ↓
                    ORM read filter   write listener
                            ↓
                    async? → task decorator copies context to pool thread
```
