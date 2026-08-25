---
title: "Hybrid RAG retrieval"
description: "Design RAG over medical documents — hybrid dense + sparse retrieval, chunking, and evaluation."
order: 14
minutes: 12
---

**The prompt this answers:** *"Design a RAG system over medical records."* Increasingly its own
interview round. Most candidates answer "chunk it, embed it, cosine similarity, stuff the top-k
into a prompt" — which is the 2023 answer and is now a weak one.

This is the full pipeline with a reason for each stage, because *"why not skip this stage?"* is
exactly what gets asked.

## The pipeline

```
document
   ↓  semantic chunking (topic boundaries + contextual headers)
   ↓  dual embedding — dense (clinical model) + sparse (BM25)
   ↓  vector store with named vectors, payload-indexed by patient
   │
query
   ↓  dense search (top 20)  ┐
   ↓  sparse search (top 20) ┘→ Reciprocal Rank Fusion → 20 candidates
   ↓  cross-encoder rerank → top 5
   ↓  prompt = structured profile + top-5 chunks + task
   ↓  LLM
   ↓  automated eval (faithfulness, recall) + end-to-end tracing
```

## Why each stage — the actual answers

### Semantic chunking, not fixed-size

Fixed 512-token windows cut clinical notes mid-sentence, splitting a medication from its dosage or
a lab value from its reference range. Chunks are split on **clinical section boundaries**.

The move worth stealing: each chunk gets a **contextual header** prepended —
*"This chunk is from a cardiology consultation on 2024-06-15."* A chunk retrieved in isolation
otherwise has no idea what document or date it came from, and the LLM will happily attribute a
2019 lab value to today.

**Say this:** *"Chunking is where most RAG systems are actually lost. Retrieval can't fix a chunk
that was incoherent when it was stored."*

### Dense + sparse, not either alone

This is the crux, and it's where a strong answer separates from a generic one.

| | Good at | Blind to |
|---|---|---|
| **Dense** (clinical embedding, 768-dim) | Meaning. Knows `HTN` ≈ hypertension, `NKDA` ≈ no known drug allergies | Exact tokens it wasn't trained to distinguish |
| **Sparse** (BM25) | Exact lexical match — drug names, ICD codes like `E11.9`, test names like `HbA1c` | Synonyms, abbreviations, paraphrase |

Clinical text needs both. A query for `E11.9` must match that literal code; a query for
"blood pressure problems" must match a note that only ever says `HTN`. **Neither retriever alone
is sufficient**, and that's a domain observation, not a preference.

**Also note the model choice:** a *clinical* embedding model (trained on PubMed and clinical
notes), not a general-purpose one. Generic embeddings don't know medical abbreviations. "I'd pick a
domain-specific embedding model" is a cheap sentence that signals real experience.

### Reciprocal Rank Fusion to combine them

Two ranked lists, one fused list. RRF scores by **rank position** rather than raw score:

```
score(d) = Σ over retrievers  1 / (k + rank_r(d))
```

Why RRF rather than normalising and adding scores: cosine similarity and BM25 scores are on
**incommensurable scales**, and normalising them requires assumptions about their distributions
that don't hold. Ranks are comparable by construction. It's also parameter-light — just `k`.

**This is a great thing to know.** It's a specific, defensible algorithm choice where most
candidates hand-wave "combine the results".

### Cross-encoder reranking — the accuracy stage

Retrieval uses a **bi-encoder**: query and chunk embedded *separately*, compared by cosine. Fast,
because chunk embeddings are precomputed — but it never lets the query and the chunk see each
other.

A **cross-encoder** feeds `[query, chunk]` through the model *together* and scores relevance
directly. Far more accurate, and roughly 100× slower per pair — so it's unusable for search over
millions but ideal for reranking 20 candidates down to 5.

**The architecture insight, stated generally:** *"Retrieve wide and cheap, then rerank narrow and
expensive."* That two-stage shape recurs everywhere in search and recommendation systems.

And the reason it matters for RAG specifically: **irrelevant chunks in the prompt cause
hallucination.** Reranking is a hallucination-reduction mechanism, not just a quality nicety.

### Dual-source prompt assembly

The prompt combines two things, not one:

1. A **structured health profile** (~800 tokens) — merged, deterministic, computed by code:
   current medications, latest labs with trends, diagnoses, risk flags.
2. The **top-5 retrieved chunks** (~2,500 tokens) — the narrative evidence.

Why both: the profile gives guaranteed-complete *structured* facts (nothing important got missed
by retrieval), and the chunks give *context and nuance* that a schema can't hold. Retrieval alone
risks missing a current medication if its chunk didn't rank; structure alone loses the clinical
reasoning in the notes.

**This is a genuinely good idea to bring to an interview:** *"I wouldn't rely on retrieval alone
for facts that must be complete. Anything where a miss is unacceptable should be computed
deterministically and injected, with retrieval supplying context around it."*

### Measurement and tracing — the stages people forget

- **Automated eval** (faithfulness, context recall) on a fixed set, in CI. Without it, *"RAG
  quality drifts silently"* — a prompt tweak or a model version bump degrades answers and nothing
  fails.
- **End-to-end tracing.** When an answer is wrong you need to see which chunks were retrieved, how
  they were ranked, and what prompt was actually sent. Without it, the doc notes, *"debugging RAG
  is guesswork."*

Mentioning eval and tracing unprompted is one of the clearest signals that you've operated a RAG
system rather than built one once.

## Storage layout

```
vector store: named vectors { dense: 768-dim cosine, sparse: BM25 }
              payload: patient_id (indexed), document_id (indexed),
                       document_date (indexed), s3_chunk_key
              → NO chunk text stored here
S3:           the chunk text itself, encrypted
```

Two things to notice. **Payload indexes on `patient_id`** — retrieval is always filtered to one
patient, so this is a pre-filter, not a post-filter; getting that wrong means scoring vectors you
will then throw away, and worse, risking cross-patient leakage. And **the text is not in the
vector store** — it holds an S3 key. That keeps PHI in one auditable place; see
[PII and blind indexes](/citadel/war/sd/pii-and-blind-index/).

## Answering it in an interview

Have a one-sentence justification ready for each stage, because the question is always *"why not
skip it?"*:

| Stage | The one-liner |
|---|---|
| Semantic chunking | Fixed windows cut records mid-fact; retrieval can't repair a bad chunk |
| Contextual headers | A chunk alone doesn't know its own document or date |
| Domain embedding | Generic models don't know `HTN` = hypertension |
| Sparse alongside dense | Codes and drug names need exact lexical match |
| RRF | Scores are incommensurable; ranks are comparable |
| Cross-encoder rerank | Retrieve wide and cheap, rerank narrow and expensive; cuts hallucination |
| Structured profile beside chunks | Facts that must be complete shouldn't depend on ranking |
| Eval + tracing | Otherwise quality drifts silently and failures are unexplainable |
