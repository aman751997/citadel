---
title: "Interview stories"
description: "The same material rearranged as things you can say out loud — setup, decision, defensible trade-off, expected follow-up."
order: 20
minutes: 12
---

The same material, rearranged as things you can **say out loud**. Each has the setup, the
decision, a trade-off you can defend, and the follow-up to expect.

## Before anything else: calibrate your claim

You worked on a codebase written by several people and an AI. In an interview that's completely
normal — but the *verb* you use matters, and interviewers are good at detecting an inflated one.

| If you… | Say | Not |
|---|---|---|
| designed and wrote it | "I built…" | — |
| reviewed it, debugged it, extended it | "I worked on… / I owned the fix for…" | "I built…" |
| investigated why it was built that way | "I dug into why we… — the reason turned out to be…" | "I designed…" |

The third one is still a **strong** answer. "I traced a cross-tenant leak back to a
non-transactional getter bypassing the ORM filter" demonstrates exactly the skill being tested,
and it survives every follow-up. An inflated claim collapses on the second question, and that
collapse costs you more than the modest version ever would.

---

## Story 1 — "Tell me about a subtle bug"
**The silent cross-tenant leak.** Best technical story here.

- **Setup.** Multi-tenant hospital platform, shared schema, `tenant_id` on every table. Isolation
  enforced by an ORM filter so application code can't forget the predicate.
- **The bug.** The filter attaches to a *session*. A service method without `@Transactional` has no
  transaction, so the filter bound to one session while the query executed on another — and
  returned rows across tenants. No error. No log line. Correct-looking data, wrong scope.
- **The fix.** An aspect around every repository call that opens a read-only transaction when none
  is active, so the filter and the query always share a session.
- **The trade-off to volunteer.** Every read now touches a transaction, and a filter you can't see
  in the query is harder to debug. Accepted, because the alternative is relying on every developer
  to remember `@Transactional` forever.
- **Follow-up to expect:** *"How would you catch this in a test?"* — a test that asserts a
  repository call from a non-transactional context returns only the current tenant's rows. The
  general point: **test the enforcement mechanism, not just the happy path.**

---

## Story 2 — "A time you found the root cause, not the symptom"
**Async writes landing under the wrong tenant.**

- **Setup.** Tenant lives in a `ThreadLocal`, populated per request by a filter.
- **Symptom.** Some records written with `tenant_id = "default_tenant"`. Intermittent,
  proportional to traffic, no exception anywhere.
- **Root cause.** A ThreadLocal belongs to one thread. Work handed to an `@Async` pool ran on a
  thread that never went through the filter — and the ORM listener *falls back to a default*
  rather than failing, so it wrote wrong data instead of throwing.
- **The fix.** A task decorator capturing context on the submitting thread and restoring it on the
  pool thread, clearing in a `finally` because pool threads are reused.
- **Why it's a good story.** Two failure modes in one mechanism: **absent** context (never set) and
  **stale** context (left by the previous task). The `finally` fixes both. And the deeper lesson:
  *a fallback default turned a loud failure into a silent one.*
- **Follow-up:** *"Would you rather it had thrown?"* Yes — and that's the design critique. A
  fallback that silently produces wrong data is worse than an exception.

---

## Story 3 — "A design decision you'd defend"
**Five payment gateways behind one interface.**

- **Setup.** Patients choose how to pay per transaction. Each gateway POSTs a webhook back that
  must be signature-verified before it's trusted.
- **The decision.** One `verifyWebhookSignature` method, five implementations, resolved through a
  registry keyed by the gateway's own identifier.
- **Why not if-else.** The five algorithms share nothing — not even the payload format. One takes
  raw JSON, one hashes a single field from a JSON envelope, two take form-urlencoded, one delegates
  to a vendor SDK. An if-else would have to branch on *parsing* before it could branch on
  *verification*, in the one method where a mistake means accepting an unverified payment.
- **The payoff.** Adding a gateway is one new class. Nothing existing is edited.
- **Follow-up:** *"What's wrong with the current implementation?"* — the registry builds its map
  lazily on a non-volatile field. Concurrent builds are harmless, but the **publication** isn't:
  another thread can see a non-null reference to a partially constructed map. Fix is to build in
  the constructor, `final` and immutable. **Volunteering a flaw in your own example is one of the
  strongest moves available to you.**

---

## Story 4 — "A performance problem you fixed"
**30 seconds to 100 milliseconds, and a failure mode removed.**

- **Setup.** A medical-records page rendered six AI sections. Opening it triggered the AI: six
  parallel calls, each serially downloading five documents, then calling an LLM. 10–30s first load.
- **The cliff.** Large documents blew the context window. The section was marked `FAILED`
  permanently, with no recovery path — so it failed hardest for patients with the most documents,
  i.e. the sickest ones. That reframing turned it from a performance ticket into a correctness one.
- **The four moves.** Invert the trigger (compute on upload, not on view); one aggregate endpoint
  behind a cache with per-section TTLs; retrieval instead of full documents; push completion over a
  WebSocket so a partial page is a normal state.
- **The part worth saying.** Retrieval made token exhaustion *arithmetically impossible*: profile
  (~800) + top-5 chunks (~2,500) + prompt (~300) ≈ 3,600 tokens against a 1M window, **independent
  of how many documents the patient has.** I didn't make the limit less likely to hit — I made it
  unreachable.
- **Follow-up:** *"What did it cost?"* Compute on every upload whether or not anyone looks; a
  second service and language; a distributed failure surface. Justified because reads far
  outnumber writes and the latency was user-facing.

---

## Story 5 — "A hard technical constraint"
**Searching encrypted patient names.**

- **Setup.** Names encrypted at rest with AES-GCM. Front desk must search by name.
- **The contradiction.** Proper encryption is randomised, so identical names produce different
  ciphertext — by design, or you've built a frequency-analysis oracle. `LIKE 'Am%'` is meaningless
  on ciphertext.
- **The wrong answers, named out loud.** Deterministic encryption leaks equality on the whole
  value. Decrypt-and-filter in the app is a full table scan with every patient record in memory.
- **The answer.** A blind index: keyed HMAC for exact match, plus **enumerated prefix hashes**
  computed at write time — for the full name and each word — so prefix search becomes an indexed
  exact-match lookup. Keys scoped per tenant, so the same name at two hospitals hashes differently
  and can't be correlated.
- **The cost, volunteered.** A blind index leaks equality: you learn which rows share a name. Plus
  ~10–20 hash rows per name, and key rotation means recomputing all of them (hence key versioning).
  No substring or fuzzy search.
- **Why it lands.** Almost nobody has a ready answer to "search over encrypted data", and this one
  comes with its own limitations stated.

---

## Story 6 — "Disagreeing with a design"
**A stub that fails open.**

- **Setup.** A report engine's real implementation wasn't ready, so a stub returning canned data
  was registered behind the same interface — good practice, it unblocked the API and cache work.
- **The problem.** It was registered `matchIfMissing = true`, making the **stub the default**. A
  missing config property means canned numbers served as real hospital reporting. Its own javadoc
  warns it must be disabled — correct by documentation, fragile by default.
- **The position.** A stub should fail **closed**. A sibling component in the same codebase gets
  this right with `matchIfMissing = false` — off unless explicitly switched on.
- **Why it's a good story.** Specific, low-drama, and about a *default* rather than a person. It
  shows you read defaults as design decisions, which is a senior habit.

---

## Story 7 — "Something you learned recently"
**That a third of the patterns I "knew" were the framework's, not mine.**

- **The realisation.** Auditing a Spring codebase for design patterns, I found the framework
  supplies the Proxy (declarative HTTP clients, AOP), the Chain of Responsibility (servlet
  filters), the Observer (`@EventListener`), the Object Pool. I could *recognise* all of them and
  couldn't have *written* the filter chain from scratch.
- **What I did.** Split my prep into recognise-then-rebuild, and rebuilt the framework-mediated
  ones by hand first — which is where I learned that the filter ordering isn't a preference at all:
  each filter consumes what the previous one produced, so the order is a data dependency.
- **Why it works as an answer.** It's a real, specific, slightly unflattering thing about your own
  knowledge, with a concrete correction. That reads as genuine in a way that "I learned Kubernetes"
  doesn't.

---

## Two questions to have ready for them

Good questions signal the same seniority the answers do:

- *"When something breaks in production here, what's the usual gap — you didn't know it broke, or
  you knew and couldn't tell why?"* Gets you a real answer about observability maturity.
- *"What's a design decision in the codebase that everyone agrees was wrong but nobody has fixed?"*
  Tells you how the team talks about technical debt, and whether it's safe to raise things.
