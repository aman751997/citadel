---
title: "Event-driven AI pipeline"
description: "How to fix a slow page that sometimes fails: do the work early, in the background, and handle the problems that come with that."
order: 13
minutes: 9
---

**The prompt this answers:** *"This page takes 30 seconds to load and sometimes fails permanently.
Redesign it."* This is the most common high-level design question there is. Here it is worked through
in full, with the "before" state measured and written down.

## The before-state

**What goes wrong.** A medical-records page showed six AI-generated sections: medications, labs,
summary, timeline, analysis and predictions. The AI only started working when a user opened the page.

The design doc lists these problems:

1. **Lazy trigger** — the AI ran only when a user opened the page. ("Lazy" means "do the work only when asked".)
2. **Six parallel HTTP calls** — one per section. Each call fetched the documents, hashed them (to check whether they had changed), and might call the LLM (the large language model, the AI that writes the text).
3. **Sequential S3** — five document downloads from S3 (Amazon's file storage), one after another, *per section*.
4. **No structured data** — facts like drug names and lab values existed only inside raw text.
5. **No caching** — a cache keeps a saved copy of an answer so you don't redo the work. Here, every visit downloaded everything again.
6. **Token exhaustion, then permanent failure.** A token is a small chunk of text, and an LLM can only read a limited number of tokens at once (its "context window"). Large documents went over that limit. The section was marked `FAILED`, and there was **no recovery path**.

The result: 10–30 seconds on first load. Worse, the failures hit the patients with the most documents,
who are the sickest patients.

**Say this in the interview:** *"The slowest, most broken page was the one for the sickest patients."* It turns a speed bug into a fairness bug.

## The four moves

### 1. Invert the trigger: lazy to eager

**The problem.** Work starts only when someone opens the page, so the user always waits.

**The fix.** Work now starts when a **document is uploaded**. Java saves the file to S3 and extracts
the text. Then it publishes an `ExtractionCompleted` event to a topic exchange (a RabbitMQ router that
sends each event to every queue that asked for it). Then it returns. The user waits for none of the AI work.

**Why this, and not the obvious alternative.** The old way is "compute on demand, user waits". The new
way is "compute on write". You spend storage and compute whether or not anyone looks at the result.
That is the right trade when reads outnumber writes and users can feel the delay.

**Say this in the interview:** *"I moved the work to upload time. That pays off because the page is read far more often than documents are written."*

### 2. Collapse six calls into one, behind a cache

**The problem.** Six separate calls each did their own slow work.

**The fix.** There is now one aggregate endpoint. It does one Redis `MGET` (Redis is a fast in-memory
store, and `MGET` reads many keys in a single call). On a warm cache (data already saved) this takes under 100ms.

If a section is still being built, the API returns `status: PROCESSING`. The UI shows a spinner. A
**WebSocket** (a connection that stays open so the server can push data to the browser) delivers the
result when it is ready. So a half-finished page is a normal state, not an error.

TTLs (how long a cached value lives before it expires) are set per section by **how often the data
changes, not one value for all**. This shows real thought:

| Section | TTL | Why |
|---|---|---|
| Critical alerts | 30 min | Safety-critical, so refresh often rather than risk stale data |
| Summary, timeline | 1 h | Built from many parts, fairly stable |
| Medications, labs, analysis | 2 h | Only change when a new document is uploaded |
| Outcome predictions | 4 h | Most expensive to compute, and the most stable |

There is also explicit eviction (deleting cache entries on purpose). `evictAll(patientId)` runs
**before** the upload or delete event is published. That way, no stale entry can be served in the gap
between the event and the recompute.

**Why this, and not the obvious alternative.** One TTL for everything is simpler. But it either serves stale safety data or wastes work refreshing stable data.

### 3. Make token exhaustion structurally impossible

**The problem.** The old design sent whole documents to the LLM. More documents meant more input, so
big patients eventually hit the limit.

**The fix.** This is the strongest single idea in the redesign. It is arithmetic, not hope. Instead of
raw documents, the LLM now gets a small, fixed-size input. It gets a structured profile, the top 5
retrieved chunks (RAG, short passages found by searching the documents for the most relevant ones), and the task prompt.

```
OLD:  5 full documents × ~5,000 words   ≈ 25,000 tokens  → MAX_TOKENS on large PDFs
NEW:  structured profile                ≈    800 tokens
    + top-5 retrieved chunks (500 each) ≈  2,500 tokens
    + task prompt                       ≈    300 tokens
                                        ≈  3,600 tokens

Mathematical ceiling: ~3,660 tokens. Context window: 1,000,000.
```

The key point: **the ceiling does not depend on how many documents there are.** With ten documents or a
hundred, you still retrieve only the top 5 chunks. The old input grew with the patient's history. The new input does not.

**Why this, and not the obvious alternative.** The obvious fix is to truncate or trim the documents
and hope they fit. That only makes the failure less likely. Retrieval makes it impossible.

**Say this in the interview:** *"I didn't make the limit less likely to be hit, I made it unreachable. Retrieval turns an unbounded input into a bounded one."*

### 4. Split the service on the language boundary

**The problem.** The ML work needs Python libraries, but the main app is in Java.

**The fix.** The ML work moved to a **Python** service. This covers NER (named entity recognition,
which finds things like drug names and lab values in text), embeddings (lists of numbers that capture
the meaning of text, so you can search by meaning) and reranking (re-sorting search results so the
best ones come first). Java keeps what it was already good at: auth, upload orchestration, S3, caching and WebSocket push.

**Why this, and not the obvious alternative.** The honest reason is the ecosystem. `sentence-transformers`,
clinical embedding models and RAG tooling are Python-first. Splitting along that line is a real
justification. "Microservices are good" is not.

**The cost you should volunteer:** a network hop, a second deployment, a second on-call surface, and a
new kind of failure (the two services can now disagree or lose messages between them). That is what the next section is about.

## The event topology

**The design.** Java and Python talk through events, not direct calls. An event is a small message that
says "this happened". A queue holds messages until a consumer (a program that reads and handles
messages) picks them up. Fan-out means one event reaching several independent readers.

```
Java ──publish──→ topic exchange (durable)
                    ├──→ queue: extraction-completed ──→ Python consumer
                    └──→ queue: document-deleted     ──→ Python consumer
                              │
                              └── nack(requeue=false) ──→ DLQ (durable, no TTL)

Python ──webhook POST──→ Java ──→ Redis write ──→ WebSocket push ──→ browser
```

Choices worth defending:

- **Topic exchange, not a direct queue.** A second consumer (analytics, audit) can bind later without touching the publisher. This is the fan-out benefit.
- **Durable queues, and a DLQ with no TTL.** Durable means messages survive a broker restart. A DLQ (dead-letter queue) is where messages go after they fail. A "poison message" is one that keeps failing. It must be *inspectable later*, not silently dropped. "No TTL" means nothing expires from the DLQ. There is a replay script to reprocess them.
- **Fire-and-forget publish.** The publisher sends the message and does not wait. It must never fail the user's upload because the broker is down. Publish failures are logged, not thrown.
- **Webhook back, rather than Java polling.** A webhook is Python calling a Java URL when it finishes. Python knows when it's done, so Java shouldn't keep asking.

## Deletion is a first-class flow

**The problem.** "Right to erasure" for health data means a delete must reach everywhere derived data
went. Derived data means anything computed from the document. Deleting only the file is not enough.

**The fix.**

1. Java soft-deletes (marks the document deleted without erasing it yet) and publishes `DocumentDeleted`.
2. Python removes vectors from the vector store, entity data from S3 and the metadata DB, and chunk files from S3.
3. Python **rebuilds the health profile from the remaining documents.** The profile was a merge of many documents, so it can't just be patched.
4. All cached sections are evicted and regenerated.

**Why this, and not the obvious alternative.** The obvious approach is to build the write path first
and add delete later. But derived data multiplies the places a deleted document still exists. Every
embedding, every cache entry and every merged profile is another copy.

**Say this in the interview:** *"I design the delete path at the same time as the write path. Retrofitting it is how compliance bugs happen."*

## The PHI-isolation move worth stealing

**The problem.** PHI (protected health information, meaning patient data that must be guarded) spread
across many stores means many things to secure, audit and delete from.

**The fix.** The metadata database and the vector store hold **no PHI at all**. That means no clinical
text, names, medication names, lab values or dates. They hold identifiers, vectors, confidence scores
and an **S3 key** (a pointer to the file). All PHI lives in S3 under envelope encryption (the data is
encrypted, and the key that protects it is itself encrypted and managed separately).

```
metadata DB:  entity_id, type, confidence, s3_entity_key   ← no PHI
vector store: embedding, document_id, s3_chunk_key          ← no PHI
S3:           the actual clinical text                      ← PHI, SSE-KMS encrypted
```

**Why this is a strong design.**

- It shrinks the damage if the two stores most likely to be exposed (a managed vector DB, a metadata replica) leak.
- It puts PHI in one auditable store with key-based access control.
- It makes deletion one authoritative operation.

A caveat: vectors are not plaintext, but they're not nothing either. Treating them as non-PHI while
keeping the text out is a defensible line to draw, not a perfect one.

## Answering it in an interview

1. **Measure the before-state.** Name the six problems. A redesign without a diagnosis is a rewrite.
2. **Invert the trigger** and state the read/write ratio that justifies it.
3. **One endpoint, cache, per-volatility TTLs, explicit eviction ordering.**
4. **Make the failure mode impossible, not unlikely** — the token arithmetic.
5. **Justify the service split on the ecosystem boundary**, and volunteer the cost.
6. **Design the delete path with the write path.**
