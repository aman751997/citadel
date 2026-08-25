---
title: "Event-driven AI pipeline"
description: "Redesign a slow synchronous flow — events, consumers, NER + embeddings, and the ordering problems that come free."
order: 13
minutes: 12
---

**The prompt this answers:** *"This page takes 30 seconds to load and sometimes fails permanently.
Redesign it."* — the most common HLD prompt there is, and this is a fully worked instance with the
before-state measured and written down.

## The before-state

A medical-records page showed six AI-generated sections (medications, labs, summary, timeline,
analysis, predictions). Opening the page triggered the AI.

The design doc enumerates the problems without euphemism:

1. **Lazy trigger** — AI ran only when a user opened the page.
2. **Six parallel HTTP calls** — one per section, each independently fetching documents, hashing
   them, and possibly invoking the LLM.
3. **Sequential S3** — five serial document downloads *per section*.
4. **No structured data** — entities existed only as unstructured text.
5. **No caching** — every visit re-downloaded everything.
6. **Token exhaustion → permanent failure.** Large documents blew the context window, the section
   was marked `FAILED`, and there was **no recovery path**.

Result: 10–30 seconds on first load, with a cliff-edge failure for exactly the patients who had
the most documents — i.e. the sickest ones. That last observation is the kind of thing worth
saying out loud; it reframes a performance bug as a correctness-and-fairness bug.

## The four moves

### 1. Invert the trigger — lazy to eager

The work now starts when a **document is uploaded**, not when a page is opened. Java writes to S3,
extracts text, publishes `ExtractionCompleted` to a topic exchange, and returns. The user is not
waiting on any of it.

**The trade you must name:** you've moved from *"compute on demand, user waits"* to *"compute on
write, storage and compute spent whether or not anyone looks."* That's the right trade when reads
outnumber writes and latency is user-visible. Say the condition, not just the choice.

### 2. Collapse six calls into one, behind a cache

One aggregate endpoint, one Redis `MGET`, sub-100ms on a warm cache. A section still processing
returns `status: PROCESSING`, the UI shows a spinner, and a **WebSocket** pushes the result when
it lands — so a partial page is a normal state rather than an error.

TTLs are set per section by **volatility, not uniformly**, which is the detail that shows real
thought:

| Section | TTL | Why |
|---|---|---|
| Critical alerts | 30 min | Safety-critical, prefer refresh over staleness |
| Summary, timeline | 1 h | Aggregated, moderately stable |
| Medications, labs, analysis | 2 h | Only change on new upload |
| Outcome predictions | 4 h | Heaviest computation, most stable |

Plus explicit eviction: `evictAll(patientId)` fires **before** publishing the upload or delete
event, so a stale entry can't be served in the window between the event and the recompute.

### 3. Make token exhaustion structurally impossible

This is the strongest single idea in the redesign, and it's arithmetic rather than hope:

```
OLD:  5 full documents × ~5,000 words   ≈ 25,000 tokens  → MAX_TOKENS on large PDFs
NEW:  structured profile                ≈    800 tokens
    + top-5 retrieved chunks (500 each) ≈  2,500 tokens
    + task prompt                       ≈    300 tokens
                                        ≈  3,600 tokens

Mathematical ceiling: ~3,660 tokens. Context window: 1,000,000.
```

The key property: **the ceiling is independent of document count.** Ten documents or a hundred,
you retrieve the top 5 chunks. The old design's input grew with the patient's history; the new
one's doesn't.

**Say this:** *"I didn't make the limit less likely to be hit, I made it unreachable. Retrieval
turns an unbounded input into a bounded one."* That's a categorical fix, and interviewers notice
the difference.

### 4. Split the service on the language boundary

The ML work (NER, embeddings, reranking) moved to a **Python** service. Java keeps what it was
already good at: auth, upload orchestration, S3, caching, WebSocket push.

**The honest reason:** the ecosystem. `sentence-transformers`, clinical embedding models, and the
RAG tooling are Python-first. Splitting on that boundary is a real justification; "microservices
are good" is not.

**The cost you should volunteer:** a network hop, a second deployment, a second on-call surface,
and a distributed failure mode that didn't exist before. Which is what the next page is about.

## The event topology

```
Java ──publish──→ topic exchange (durable)
                    ├──→ queue: extraction-completed ──→ Python consumer
                    └──→ queue: document-deleted     ──→ Python consumer
                              │
                              └── nack(requeue=false) ──→ DLQ (durable, no TTL)

Python ──webhook POST──→ Java ──→ Redis write ──→ WebSocket push ──→ browser
```

Choices worth defending:

- **Topic exchange, not a direct queue** — a second consumer (analytics, audit) can bind later
  without touching the publisher.
- **Durable queues + DLQ with no TTL** — a poison message must be *inspectable later*, not
  silently dropped. There's a replay script for reprocessing.
- **Fire-and-forget publish** — the publisher must never fail the user's upload because a broker is
  down. Publish failures are logged, not thrown.
- **Webhook back rather than Java polling** — Python knows when it's done; Java shouldn't ask.

## Deletion is a first-class flow

"Right to erasure" for health data means a delete must propagate everywhere derived data went:

1. Java soft-deletes and publishes `DocumentDeleted`.
2. Python removes vectors from the vector store, entity data from S3 and the metadata DB, and
   chunk files from S3.
3. Python **rebuilds the health profile from the remaining documents** — the profile was a merge,
   so it can't just be patched.
4. All cached sections are evicted and regenerated.

**Interview-worthy point:** derived data multiplies your deletion surface. Every embedding, every
cache entry, every merged profile is another place the deleted document still exists. Designing
the delete path *at the same time* as the write path is the lesson — retrofitting it is how
compliance bugs happen.

## The PHI-isolation move worth stealing

The metadata database and the vector store hold **no PHI at all** — no clinical text, names,
medication names, lab values, or dates. They hold identifiers, vectors, confidence scores, and an
**S3 key**. All PHI lives in S3 under envelope encryption.

```
metadata DB:  entity_id, type, confidence, s3_entity_key   ← no PHI
vector store: embedding, document_id, s3_chunk_key          ← no PHI
S3:           the actual clinical text                      ← PHI, SSE-KMS encrypted
```

Why this is a strong design: it shrinks the blast radius of the two stores most likely to be
exposed (a managed vector DB, a metadata replica), concentrates PHI in one auditable store with
key-based access control, and makes deletion a single authoritative operation. Vectors are not
plaintext — but they're not nothing either, and treating them as non-PHI while keeping the text
out is a defensible line to draw.

## Answering it in an interview

1. **Measure the before-state.** Name the six problems. A redesign without a diagnosis is a rewrite.
2. **Invert the trigger** and state the read/write ratio that justifies it.
3. **One endpoint, cache, per-volatility TTLs, explicit eviction ordering.**
4. **Make the failure mode impossible, not unlikely** — the token arithmetic.
5. **Justify the service split on the ecosystem boundary**, and volunteer the cost.
6. **Design the delete path with the write path.**
