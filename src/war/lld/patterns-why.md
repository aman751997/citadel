---
title: "Why each pattern exists"
description: "18 pattern dossiers — the problem that forced each one, what breaks without it, and the recall trigger. Sourced from production code."
order: 1
minutes: 25
---

Eighteen dossiers. Each is **the problem first** — recovered from javadoc, design docs and code,
not assumed from memory. Where the team stated the reason outright it's quoted, so you can tell
the difference between their reasoning and my inference.

---

## 1. Strategy — five payment gateways

**Problem.** A patient at the counter picks how to pay — UPI, card, wallet, pay-later. So the
gateway is chosen **per transaction, by the patient, at runtime**. Then the money moves and each
gateway POSTs a webhook back, and you must verify its signature before trusting it. Those five
verification algorithms are not variations on a theme. They are mutually incompatible, down to
the payload format.

**Without it.** An if-else over five algorithms where the *input format itself* differs — raw
JSON, a JSON envelope, form-urlencoded. The branch has to parse differently before it can verify
differently. Every new gateway edits the same method, and a mistake in that method means
accepting a payment without proof.

**Evidence.** One interface method, `verifyWebhookSignature(payload, signature)`, five genuinely
different implementations:

```
Gateway A — HMAC-SHA256 over the raw body, compare to header
Gateway B — SHA256 of ONLY the base64 "response" field inside the JSON envelope
Gateway C — form-urlencoded; strip CHECKSUMHASH, recompute over remaining params
Gateway D — reverse-hash: sha512("salt|status||||||udf5|…|txnid|key"), order matters
Gateway E — delegate to the vendor SDK (it also checks a timestamp for replay)
```

The interface javadoc names it outright: *"Strategy interface for all payment gateways."*

**Trigger.** One operation, N implementations that share nothing but their signature, and the
choice arrives as runtime data. → **Strategy.**

> **Follow-up you'll get:** *"Why not an enum with an abstract method?"* Legitimate for 2–3 small
> variants. Breaks here because each implementation needs injected config (merchant keys,
> secrets), an HTTP client, and its own SDK — enum constants can't take constructor dependencies
> cleanly, and you'd be hand-wiring what the container already does.

---

## 2. Registry — the inbound-webhook routing problem

**Problem.** Outbound, the caller knows which gateway it wants. **Inbound is the hard
direction:** a webhook lands on a controller carrying only a gateway identifier, and you must
find the one object that knows how to verify *that* gateway before you touch the payload.

**Without it.** A `switch` in a factory method — so every new provider edits a file that has
nothing to do with that provider. The registry version turns "add a provider" into "add a class".

**Evidence.** The container injects a `List<T>` of *every* implementation; the constructor keys
them by a self-describing method. A design doc in the same repo states the intent in one line:

> *"Adding Zoom, Teams, or WhatsApp providers later = new `@Component` class. Zero changes to
> `VirtualAppointmentService`."*

```java
public ProviderRegistry(List<Provider> providers) {
    // the container hands you every impl; key them by their own answer
    this.providers = providers.stream()
        .collect(Collectors.toMap(Provider::platform, Function.identity()));
}
```

The key insight: the map key is **derived from the strategy** (`platform()`, `getGatewayName()`)
rather than maintained beside it, so it cannot drift out of sync with reality.

**Trigger.** You hold an identifier and need the handler for it, and handlers should grow without
editing the lookup. → **Registry, keyed by a method on the strategy itself.**

> **Three properties to defend:** built once in the constructor (immutable, thread-safe, fails at
> boot rather than at 2 a.m.); returns `Optional` so the *caller* decides whether absence is an
> error; and adding an implementation touches no existing file.

---

## 3. Ambient context — why the tenant ID isn't a parameter

**Problem.** Every hospital is a tenant, and **every query must be scoped to one** or you leak
one hospital's patients to another. **Eighty files** read the current tenant. Threading a
`tenantId` parameter through all of them — controller to service to repository to audit aspect —
is a change to every method signature in the codebase.

**Without it.** The javadoc names the trade directly: it exists to enable isolation *"without
requiring `tenantId` to be passed through every method signature."* The price is that the value
is now invisible at the call site — which is exactly what makes the next three entries necessary.

**Evidence.** `final class`, private constructor, one `private static final ThreadLocal<String>`.
The javadoc puts the contract in bold: the value **must** be cleared after each request *"to
prevent ThreadLocal memory leaks in thread-pool environments."*

**Trigger.** A value every layer needs and no layer should have to pass. → **Ambient context** —
and you now owe three guarantees about its lifecycle.

> **This is the good answer to "what's wrong with Singletons?"** Not "hard to test". The real
> answer: an invisible value has an invisible lifecycle, and every boundary it crosses is a place
> it can go missing or leak into the next request.

---

## 4. Chain of Responsibility — order is a data dependency

**Problem.** Something must *put* the tenant in that ThreadLocal before any handler code runs.
But it can't go first: tenant and branch are **claims inside the JWT**, so the token must be
parsed and the security context populated before anything can read them.

**Without it.** This is the part worth internalising: the ordering is **not preference, it's a
producer–consumer dependency.** Each filter consumes what the previous one produced. Get the
order wrong and you don't get a style complaint — you get a null branch and a query silently
scoped to the wrong hospital.

**Evidence.** Order expressed as arithmetic on constants, so inserting a filter never renumbers
the others:

```java
AuthFilter.ORDER   = 1;                      // parses token → security context
BranchFilter.ORDER = AuthFilter.ORDER + 1;   // reads branchId claim from it
TenantFilter.ORDER = BranchFilter.ORDER + 1; // wants both present
```

Both downstream filters say why in their javadoc: registered after the previous one *"so that the
SecurityContext is already populated."* Each clears its ThreadLocal in a `finally`.

**Trigger.** Sequential steps where each needs the previous one's output, and the list should be
extensible. → **Chain of Responsibility.**

> **Rebuild this one by hand.** You get no `FilterChain` in an interview. See
> [build drills](/citadel/war/lld/build-drills/) — Drill 1.

---

## 5. Decorator — the bug ThreadLocals cause at thread boundaries

**Problem.** A ThreadLocal belongs to *one thread*. The moment work is handed to an async pool,
the tenant is gone — that pool thread never went through the filter chain. And the consumer
downstream doesn't fail loudly; it falls back to a default.

**Without it.** Not an exception — **silent data corruption.** The javadoc records the actual
symptom, and it's the most useful sentence in the repo for understanding why Decorator exists:

> *"Without this, async writes persist with `tenant_id = "default_tenant"` because
> `TenantHibernateListener` reads `TenantContext` from a ThreadLocal that is empty on pool
> threads."*

**Evidence.** `Runnable` in, `Runnable` out, behaviour wrapped around the delegate:

```java
public Runnable decorate(Runnable r) {
    String tenantId = TenantContext.getTenantId();   // on the SUBMITTING thread
    return () -> {                                   // on the POOL thread
        try { TenantContext.setTenantId(tenantId); r.run(); }
        finally { TenantContext.clear(); }           // pool threads are REUSED
    };
}
```

The `finally` matters twice: pool threads are reused, so failing to clear leaks one request's
tenant into the next request that lands on that thread.

**Trigger.** Add behaviour around something while staying substitutable for it. → **Decorator.**

---

## 6. Proxy / AOP — the leak on the path nobody guarded

**Problem.** The ORM's tenant filter must be switched on for the specific *session* that runs the
query. If a service method isn't transactional there's no transaction, so the filter binds to one
session while the query runs on another — and the query comes back unscoped.

**Without it.** The javadoc is blunt:

> *"This removes the silent cross-tenant leak where a non-transactional getter bypassed the
> filter."*

A plain getter someone added without thinking about transactions was reading across hospitals.
That is the failure mode AOP was deployed against — you cannot fix it by remembering, only by
making it unforgettable.

**Evidence.** The aspect wraps **every** repository call and opens a read-only transaction when
none is active, so the filter always binds to the session that will execute. Ten aspects in the
repo. It also documents a deliberate bypass for platform-operator roles — the "how do you handle
the admin case?" follow-up, pre-answered.

**Trigger.** A guarantee that must hold on *every* call, including calls nobody has written yet.
→ **Proxy / interception**, not discipline.

> **The cost, which you should volunteer:** AOP binds advice to target through *a string*. No
> compiler checks it. See the [real bug this caused](/citadel/war/lld/inventory/#flagged-findings).

---

## 7. Template Method — forced by module dependency direction

**Problem.** The most interesting *why* in the repo, because it isn't a taste call — it's
**structurally forced.** Exporting a CSV is identical everywhere: cap the row count, write async,
issue a download token, expire the file. But the class lives in a **shared library**, and the
export *record* is an ORM entity in each consuming service's own database.

**Without it.** A shared library cannot import a downstream service's entity — that inverts the
dependency, and every service would compile against every other service's schema. So the
persistence step **cannot** live in the base class. Not "shouldn't" — can't.

**Evidence.** Three abstract hooks, two subclasses in two different services, each injecting its
own repository:

```java
public abstract class ExportServiceImpl implements ExportService {
    // fixed algorithm — and a Strategy arrives as a parameter
    public ExportResponse initiateExport(ExportRequest req,
                                        Supplier<List<?>> dataSupplier) { … }

    // can't live here: the entity belongs to the downstream service
    protected abstract void saveExportMetadata(ExportData d);
    protected abstract Optional<ExportData> findExportById(String id);
    protected abstract void updateExportMetadata(ExportData d);
}
```

Note `Supplier<List<?>>` — a **Strategy passed as an argument, inside a Template Method.**
Inheritance for the persistence step, composition for the data step, deliberately.

**Trigger.** Fixed sequence, and one step can't be written where the sequence lives. →
**Template Method.** The hook is usually a dependency boundary, not a preference.

---

## 8. Adapter — so a swap is config, not a release

**Problem.** Reports run heavy aggregate queries. For v1 they hit the main production database,
so a badly-shaped report can slow down the actual hospital. The plan was always to move them to a
read replica — but *later*.

**Without it.** Query execution welded into the compiler, so moving to a replica means editing and
re-releasing the engine — exactly when you're already firefighting load. The design doc states
the payoff:

> *"Thanks to an 'adapter' seam, switching to the replica is a config change, not new code."*

**Evidence.** A one-method interface: `execute(CompiledQuery, AccessScope)`. The adapter also owns
the guardrails (row cap, timeout), so the thing that can hurt production sits behind the seam.

**Trigger.** A dependency you already know you'll replace, on a schedule you don't control. →
**Adapter**, sized to the one call you actually make.

---

## 9. Facade — a uniform failure policy over 12 remote services

**Problem.** One service talks to **12 others** — compliance, consent, vault, auth, user profile,
physician, notification, branch, lead and more. Each call fails in HTTP-specific ways that
business code has no business knowing about.

**Without it.** Every service class injects a dozen clients and re-implements the same decision:
is a 404 an error or an empty result? Does a 401 mean retry or abort? Answered inconsistently in
40 places — that's where the intermittent bugs live.

**Evidence.** 12 injected clients behind **65 public methods**, all funnelled through one shared
executor that maps status codes to domain exceptions in a single place: 404 logged as info, 401 as
a warning, everything else as an error. Named `*Wrapper`; structurally a Facade. The real product
isn't fewer imports — it's **one failure policy instead of 40.**

**Trigger.** Many collaborators, plus a cross-cutting rule that must be identical for all of them.
→ **Facade**, and put the rule inside it.

---

## 10. State — because a backwards transition corrupts history

**Problem.** A telecaller marks a follow-up `DONE`, which stamps `completedAt` and `completedBy`.
If the UI then lets them drag it back to `IN_PROGRESS` and complete it again, those stamps are
overwritten and every productivity report built on them is quietly wrong. Same shape on hospital
beds: only an `AVAILABLE`, active bed may be assigned, or you double-book a patient.

**Without it.** The guard gets re-implemented at each call site — the API, the bulk importer, the
scheduler — and one of them forgets. The bed design doc names the fix:

> *"All transitions go through a single `BedStateService` so the guard logic lives in one place;
> direct repository status writes are forbidden by convention."*

**Evidence.** The legal edges live *on the enum*, so the rule travels with the type:

```java
public Set<TaskStatus> allowedTransitions() {
    return switch (this) {
        case NEW             -> Set.of(IN_PROGRESS, DEFERRED, CANCELLED);
        case IN_PROGRESS     -> Set.of(DONE, DEFERRED, CANCELLED);
        case DEFERRED        -> Set.of(IN_PROGRESS, CANCELLED);
        case DONE, CANCELLED -> Set.of();   // terminal — derivable, not stored
    };
}
```

Terminal states returning an empty set makes "is this finished?" derivable rather than a second
fact to maintain.

**Trigger.** Not every status change is legal, and an illegal one damages data rather than
erroring. → **State.**

> **The follow-up is guaranteed:** *"What if each state behaves differently, not just transitions
> differently?"* Then promote to one class per state. The table form is right when only the
> **edges** vary; polymorphic states when the **behaviour** varies. Say that distinction out loud
> and you've answered before they finish asking.

---

## 11. Saga compensation — `@Transactional` can't reach outside the database

**Problem.** Registering a walk-in patient writes local rows *and* creates an account in another
service *and* stores encrypted name, contact and DOB in a compliance vault — three remote calls.
If a later validation fails, the local rows roll back and the remote ones don't. You're left with
an orphaned account and vault entries nothing points at.

**Without it.** The code comment says it plainly:

> *"@Transactional alone won't undo the vault writes or the external user-service call."*

This is the single most valuable line here for a distributed-systems round. A database
transaction is not a distributed transaction, and pretending otherwise is how orphaned PII
accumulates — which, for health data, is a compliance problem and not just a tidiness one.

**Evidence.** The method returns a `Resolution(id, newlyCreated)` record — it reports **what it
created**, not just the result — and a `compensateIfNewlyCreated(resolution)` undoes local rows,
the remote account, and the vault entries. The design point: the caller can't compensate what it
wasn't told about, so **tracking the side effect is part of the return type.**

**Trigger.** One logical operation spanning a database and a remote service. → **Compensating
action**, and return enough information to run it.

---

## 12. Specification — two constraints you'd never guess

**Problem.** A front-desk list has ~12 optional filters. The standard trick is one query with
`":param IS NULL OR col = :param"` per filter. **That fails here** — the columns are Postgres
named enums, and the driver can't infer a type for a null parameter: *"could not determine data
type of parameter."* Second constraint: patient names and phones are **encrypted at rest**, so
you cannot `LIKE` them at all.

**Without it.** Either a query that throws on your actual database, or hand-built string
concatenation — with user input — reachable from the front desk.

**Evidence.** Predicates are added **only for non-null filters**, so the null case never reaches
SQL and the Criteria API binds each enum with its real type. Search is delegated to derived
columns — a `nameSearchKey` and a `phoneSearchHash`: searchable derivations of unsearchable data.
That's a blind index; see [PII and blind indexes](/citadel/war/sd/pii-and-blind-index/).

**Trigger.** Optional filters composed at runtime, where absent ≠ null-matching. →
**Specification** — accumulate predicates, then `AND` them.

---

## 13. Observer — the existing integration only fired after the call ended

**Problem.** A telecaller needs the patient's record on screen *while the phone is ringing*. The
integration that already existed was a post-call callback, and the design doc states its
limitation exactly: it *"fires once, at hangup, and cannot deliver mid-call states."* Useless for
a screen-pop.

**Without it.** Polling. Every agent's browser asking "anything yet?" every second, for an event
that happens a few times an hour — and still arriving up to a second late on the one thing that
has to feel instant.

**Evidence.** Three rungs of the same idea, escalating — worth knowing as a ladder, because
interviewers climb it:

| Rung | Mechanism | Scope |
|---|---|---|
| 1 | ORM `PreInsert`/`PreUpdate` listeners | in-process, synchronous, can veto |
| 2 | `@TransactionalEventListener(AFTER_COMMIT)` | in-process, fires only if the tx committed |
| 3 | Message broker → Redis fan-out → SSE | cross-process, cross-instance |

The subscriber side hand-rolls the registry, and these three details are what make Observer work
in production:

```java
Map<String, CopyOnWriteArrayList<Emitter>> byTenant;
// ↑ CopyOnWrite: iterate while notifying, no ConcurrentModificationException

emitter.onCompletion(() -> list.remove(emitter));
emitter.onTimeout(emitter::complete);
emitter.onError(e -> list.remove(emitter));
// ↑ deregister on ALL THREE exits, or you leak observers forever

new Emitter(30 * 60 * 1000L);
// ↑ bounded lifetime; the browser reconnects, so it self-heals
```

The publisher catches and logs instead of throwing — **an observer must never take the subject
down.** A dropped screen-pop is an annoyance; a failed call log is an incident.

**Trigger.** N interested parties, unknown to the producer, needing to know *when* rather than
*whether*. → **Observer** — and say "unsubscribe" out loud, because that's the part candidates
forget.

> **Rung 2 has its own trap, documented in a utility class:** side-effect work inside a
> transaction that throws will mark the shared transaction rollback-only, so a caller that catches
> the exception still gets *"Transaction silently rolled back"* at commit — losing both the real
> error and the whole transaction. Deferring to after-commit means a failure can only lose the
> side effect.

---

## 14. Interpreter — every new report used to be a release

**Problem.** The design doc describes the before-state without euphemism:

> *"every new report = a developer writes SQL, wraps it in code, tests, and ships a release. Want
> 'appointments by branch for last month'? File a ticket, wait for a deploy."*

Hospital admins wanted their own numbers, and each question cost a sprint.

**Without it.** Either that ticket queue forever, or the tempting disaster: let users send SQL.
The whole engineering problem is landing between those — **user-defined queries without
user-defined SQL.**

**Evidence.** A JSON recipe becomes an AST (dimensions, measures, filters, sort), validated
against a catalog, compiled to parameterised SQL, executed behind the adapter seam. The security
invariants are the reusable part:

```
identifiers    → ONLY from the catalog, never from a request string
values         → ALWAYS bound parameters, never concatenated
aliases        → sanitised to [A-Za-z0-9_ ], de-duped, quoted
GROUP/ORDER BY → reference output ORDINALS,
                 so no user string ever enters the statement STRUCTURE
tenant_id      → injected unconditionally; a datasource without one
                 is REFUSED rather than run unscoped
row cap        → enforced in validator AND compiler AND adapter (defence in depth)
```

**Trigger.** Users need to express open-ended requests you can't enumerate in advance. →
**Interpreter.** The split that makes it safe: **identifiers from a whitelist, values as
parameters.**

> This generalises to every "design a rule engine / query builder / filter DSL" prompt, which is
> a senior-round staple. It's the highest-ceiling item on this page.

---

## 15. Copy-on-write registry — two maps that must swap together

**Problem.** Supported languages live in the database, cached in *two* maps — one keyed by ISO
code (`hi`), one by BCP-47 (`hi-IN`). Refreshing them one at a time means a request arriving
mid-refresh can see a **half-updated pair** and resolve a language the other map has dropped.

**Without it.** An intermittent, unreproducible wrong-language bug that only appears near a
refresh — the worst class of bug to be handed.

**Evidence.** `AtomicReference<LanguageMaps>` where `LanguageMaps` is a *record of both maps*.
The code comment: *"Atomic replacement of both maps together."* Readers always see a consistent
pair.

**Trigger.** Two pieces of state with an invariant between them, updated together, read
concurrently. → **Make them one immutable value and swap the reference.**

---

## 16. Null Object — shipping the consumer before the producer exists

**Problem.** Two tickets in parallel: one building the report API and its cache, one building the
actual SQL compiler. The API team can't integration-test against a compiler that doesn't exist,
and shouldn't sit idle.

**Without it.** Serialised delivery — or the API team mocking the engine inside their own tests
and discovering the interface was wrong only at integration.

**Evidence.** Returns canned rows and **ignores the input entirely** — its javadoc says it
*"exists only to exercise the controller/cache wiring."* Swapped by a conditional-on-property
bean, i.e. **Strategy chosen at boot rather than per call.** The same trick let a whole insurance
workflow be built and demoed before any real third-party integration existed.

**Trigger.** A collaborator that doesn't exist yet, but whose *interface* you can agree on now. →
**Null Object / Stub behind the real seam.**

> **And the trap, which is in this codebase:** the stub is registered `matchIfMissing = true`, so
> a missing property serves **canned data as real reporting**. A Null Object should fail
> **closed**. Its sibling registry got this right with `matchIfMissing = false`.

---

## 17. Marker Interface — the empty interface that isn't a smell

**Problem.** One API method can return several different success shapes *or* an error shape. Java
before `sealed` had no way to say "one of these N types".

**Evidence.** An interface with **no methods** and **11 implementors**, used as the declared
return type. That looks like dead code and isn't — it's a Marker Interface doing the job `sealed`
does today.

**The cost, visible in the code.** Consumers do an unchecked `(ApiError) response` downcast that
the compiler cannot verify. The modern rewrite is
`sealed interface Response permits Success, ApiError, …` plus a pattern-matching `switch`, which
gives you exhaustiveness checking for free.

**Trigger.** A closed set of alternative return types. → **Sealed interface** today; recognise
Marker Interface as what people did before it existed.

---

## 18. The one that lies — `*Command` without `execute()`

**Problem.** Four classes named `*Command`. They have **no `execute()` and no receiver.** They're
immutable parameter objects. Their own javadoc explains the real reason they exist:

> *"deliberately not a `dto` class, since request/response DTOs are owned by the API layer."*

That's a sound layering call. It just isn't the Command pattern.

**Why this is on the list.** Two lessons in one: a name claiming a pattern doesn't make it one,
and (from #17) an empty interface isn't automatically a smell. → **Read the structure, not the
label.** That habit is what machine-coding rounds actually score, and this codebase gives you one
of each error to practise on.

> **If asked to build the real thing:** `execute()` + `undo()` + an invoker holding history. The
> discriminator is *"can this action be queued, retried, or reversed?"* If no, you want a
> parameter object and should say so.
