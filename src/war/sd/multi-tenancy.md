---
title: "Multi-tenant isolation"
description: "How to build one app for many customers so that customer A can never see customer B's data."
order: 10
minutes: 8
---

**The prompt this answers:** *"Design a SaaS platform where each customer's data is invisible to
every other customer."*

Here, a **tenant** is one customer of your software. In this system, a tenant is a hospital.

Interviewers ask this a lot. Most candidates stop at "add a `tenant_id` column". The interesting
part is everything after that.

## The three strategies, and why this system picked the hardest one

Think of an apartment building. You can give each tenant their own building, their own floor, or
just their own flat behind a locked door. The three database strategies work the same way.

- **Database per tenant:** every customer gets a separate database.
- **Schema per tenant:** one database, but every customer gets their own set of tables (a schema).
- **Shared schema:** everyone's rows sit in the same tables. Each row has a `tenant_id` column that says who owns it.

| Strategy | Isolation | Cost | Verdict here |
|---|---|---|---|
| **Database per tenant** | Strongest — physical | N migrations, N connection pools, N backups; onboarding is an infra task | Too expensive for hundreds of hospitals |
| **Schema per tenant** | Strong | Migration fan-out, connection routing, catalog bloat | Middle ground, still heavy |
| **Shared schema + `tenant_id`** | Weakest — one bug = a breach | Cheapest to run and migrate | **Chosen** |

**What goes wrong:** with a shared schema, there is no wall between customers. One forgotten
`WHERE tenant_id = ?` and hospital A reads hospital B's patients. That is a breach.

**The fix:** accept the risk, then build layers of protection so no single mistake can cause it.
The rest of this page is those layers.

**Why this and not the safer option:** shared schema is the cheapest to run and to migrate. It is
also the easiest to get badly wrong. So the whole design exists to make up for that one choice.

**Say this in the interview:** *"We took the cheap option, and here is the machinery that made it
safe."* That beats picking the safe option and having nothing left to discuss.

## Layer 1 — the ambient context

**The idea:** the current tenant is stored in a `ThreadLocal`. A `ThreadLocal` is a variable that
each thread has its own private copy of. Any code running on that thread can read it, and nobody
has to pass it in. **80 files** read it.

**Why this and not the obvious alternative:** the obvious way is to pass `tenantId` as a
parameter through every method, from controller to repository. That means changing every method in
the codebase. It also fails the moment one developer forgets to pass it along. The javadoc states
the trade: isolation *"without requiring `tenantId` to be passed through every method signature."*

**The cost you must volunteer:** a hidden value has a hidden lifecycle. Nobody sees where it is
set or cleared. Every boundary it crosses is a place where it can go missing.

**Say this in the interview:** *"Ambient context saves us from threading the tenant everywhere, but
it makes the lifecycle invisible, so we guard every boundary."*

## Layer 2 — populating it, in dependency order

**The risk:** if the tenant is set wrongly, or set from something the client controls, every layer
after this one protects the wrong tenant.

**The fix:** three filters run in a fixed order. A filter is a small piece of code that runs on
every request before the controller. **The order is a data dependency, not a preference.** Each
filter needs what the previous one produced.

```
AuthFilter    (1)  parse JWT → security context
BranchFilter  (2)  read branchId claim FROM that context
TenantFilter  (3)  read tenantId claim; wants both present
```

A JWT is a signed token the client sends with each request. A claim is one piece of data inside it,
such as `tenantId`.

The tenant filter also decides where to get the tenant from. The order matters:

1. the JWT claim. It is signed, so it can't be faked. That makes it **authoritative**.
2. an `X-Tenant-Id` header. This is only for self-service flows where the user has no JWT yet.
3. a default tenant.

> **The follow-up:** *"Can't a client just send the header and read another tenant's data?"* No.
> The JWT claim wins when it is present, and it is signed. The header path only exists for
> pre-login flows. If you can't answer this, the design is indefensible. If you can, you've shown
> you thought about the attack.

**Clean-up matters too.** Each filter clears its ThreadLocal in a `finally` block, so it runs even
if the request fails. Servers reuse threads from a pool. If you skip the clean-up, one request's
tenant leaks into the next request that lands on that thread.

**Say this in the interview:** *"The signed token is the source of truth. The header is only for
pre-auth flows, and we always clear the context at the end of the request."*

## Layer 3 — enforcement at the ORM, not the query

**What goes wrong:** developers forget things. If every query needs a hand-written tenant
condition, one day someone will leave it out.

**The fix:** an ORM-level filter adds the tenant condition to every `SELECT` automatically. The ORM
is the library that turns your Java code into SQL. So **application code cannot forget it**. A
developer writes `findByStatus(ACTIVE)` and the SQL still gets `WHERE tenant_id = ?` added.

**Why this and not "just add a WHERE clause":** a rule that depends on people remembering will
eventually fail. A rule built into the framework does not depend on memory.

### The bug that proves the layer is necessary

The filter must be switched on for the **session that actually runs the query**. A session is the
ORM's connection to the database for one unit of work.

A service method without `@Transactional` has no transaction. In that case the filter was turned on
for one session, but the query ran on a different one. So the filter did nothing. The javadoc says:

> *"This removes the silent cross-tenant leak where a non-transactional getter bypassed the
> filter."*

The fix: an aspect wraps **every** repository call. An aspect is code that runs around other
methods without editing them. If no transaction is active, it opens a read-only one. That way the
filter and the query always share a session.

**Say this in the interview:** *"This is the single best thing to bring to a multi-tenancy
question. It shows the failure is real, and that 'add a WHERE clause' is nowhere near enough."*

## Layer 4 — writes

**The risk:** a row saved without the right `tenant_id` is either invisible to its owner or
visible to the wrong person.

**The fix:** an ORM `PreInsert`/`PreUpdate` listener stamps `tenant_id` on every row just before it
is saved. It takes the value from the context.

**Why a separate mechanism from reads:** reads and writes are guarded differently on purpose. A
read leak exposes data. A write leak *corrupts* it. They fail in different ways, so each gets its
own guard.

## Layer 5 — the thread boundary

**What goes wrong:** a ThreadLocal belongs to one thread. When work moves to another thread, such
as an async task, the tenant does not come along.

**The fix:** a task decorator copies the context onto the pool thread before the task runs.

**What happened without it:** async writes were saved under the default tenant. It was **silent**,
because the write listener falls back to a default instead of failing.

**Say this in the interview:** *"That's the whole isolation story in one bug. We had five layers
of defence, and the leak appeared in the one place where the context simply wasn't there."*
Defence in depth means several independent protections, so one failure is not a disaster.

## The deliberate holes

A design with no exceptions is a design that hasn't met production. These are the planned
exceptions.

- **Global entities.** Country codes, language masters and system templates belong to no tenant.
  They extend a separate base class with no filter annotations, so the filter *never* applies. The
  exception is built into the structure, not decided by an `if`. So nobody can accidentally opt an
  entity out.
- **Platform operators.** Support staff need to read across tenants. This is allowed only for a
  platform tenant **and** a specific role. Both conditions must hold, not either one.
- **Reporting.** Platform roles are refused tenant reports outright. The result is `DENY`, not a
  query with no tenant filter. Cross-tenant analytics goes through a separate aggregate path.

**Say this in the interview:** *"Every exception is explicit, narrow and fails closed."*

## Answering it in an interview

1. Name the three strategies and pick one **with a reason** (cost vs. blast radius). Blast radius means how much damage one mistake can do.
2. Say "shared schema means one bug is a breach", then present the layers as the compensation.
3. Volunteer the async/thread-boundary hole. Nobody else mentions it, and it's real.
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
