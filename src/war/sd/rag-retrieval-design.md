---
title: "Hybrid RAG retrieval"
description: "How to design a RAG system over medical documents, in plain steps: chunking, two kinds of search, reranking, and testing."
order: 14
minutes: 9
---

**The prompt this answers:** *"Design a RAG system over medical records."* Increasingly, this is its own interview round.

**RAG** (retrieval-augmented generation) means this: before the AI model answers, you first look up relevant text from your own documents. Then you give that text to the model along with the question.

Most candidates say: "Chunk it, embed it, use cosine similarity, put the top-k into a prompt." That was the 2023 answer. Today it sounds weak.

Below is the full pipeline, with a reason for each stage. Interviewers ask *"why not skip this stage?"*, so you need one for every stage.

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

Three words to know first.

- A **chunk** is a small piece of a document. You cut files into pieces before searching.
- An **embedding** is a list of numbers that captures the meaning of a text. Similar meaning gives similar numbers.
- **Top-k** means the k best matches. "Top 20" means the best 20.

## Why each stage — the actual answers

### Semantic chunking, not fixed-size

**The problem.** The simple way is to cut every 512 tokens (a token is roughly a word). This cuts clinical notes mid-sentence. A medication lands in one chunk and its dosage in the next. A lab value ends up apart from its reference range.

**The design choice.** Split on **clinical section boundaries** instead. Then add a **contextual header** to each chunk, such as *"This chunk is from a cardiology consultation on 2024-06-15."*

**Why this (and not the obvious alternative).** A chunk is retrieved on its own, away from its document. Without a header, it does not know which document or date it came from. The LLM will then happily treat a 2019 lab value as today's. This header is the move worth stealing.

**Say this:** *"Chunking is where most RAG systems are actually lost. Retrieval can't fix a chunk that was broken when it was stored."*

### Dense + sparse, not either alone

This is the crux. It is where a strong answer separates from a generic one.

**The problem.** There are two ways to search, and each fails differently.

- **Dense retrieval** searches by meaning, using embeddings. Think of a librarian who understands what you want.
- **Sparse retrieval** searches by exact words. The usual method is **BM25**, a formula that ranks documents by how often your exact query words appear. Think of Ctrl+F.

| | Good at | Blind to |
|---|---|---|
| **Dense** (clinical embedding, 768-dim) | Meaning. Knows `HTN` ≈ hypertension, `NKDA` ≈ no known drug allergies | Exact tokens it wasn't trained to tell apart |
| **Sparse** (BM25) | Exact word match: drug names, ICD codes like `E11.9`, test names like `HbA1c` | Synonyms, abbreviations, rewording |

("768-dim" means each embedding is a list of 768 numbers.)

**The design choice.** Run both searches and combine the results.

**Why this (and not the obvious alternative).** Medical text needs both. A query for `E11.9` must match that exact code. A query for "blood pressure problems" must match a note that only says `HTN`. **Neither retriever alone is enough.** That is a fact about medical text, not a preference. Using both is called **hybrid search**.

**Also note the model choice.** Use a *clinical* embedding model, trained on PubMed and clinical notes, not a general one. Generic embeddings do not know medical abbreviations.

**Say this:** *"I'd use a domain-specific embedding model, and run dense and sparse together, because clinical text needs meaning and exact match."* It is a cheap sentence that signals real experience.

### Reciprocal Rank Fusion to combine them

**The problem.** You now have two ranked lists and need one. But the scores are not comparable. Cosine similarity (how close two embeddings are) and BM25 scores use completely different scales.

**The design choice.** Use **Reciprocal Rank Fusion (RRF)**. It ignores scores and uses only each document's **position** in each list. Higher positions earn more points.

```
score(d) = Σ over retrievers  1 / (k + rank_r(d))
```

In words: for each retriever, take 1 divided by (`k` plus the document's rank), then add these up. The best total wins. `k` is a small constant you set.

**Why this (and not the obvious alternative).** The obvious option is to normalise both scores and add them. The two scales are **incommensurable**, meaning you cannot compare them directly. Normalising needs assumptions about how scores are spread, and those assumptions do not hold. Ranks are comparable by construction: first place is first place in any list. RRF also has only one setting, `k`.

**Say this:** *"I'd fuse with RRF. The two retrievers' scores aren't comparable, but ranks are."* Most candidates just say "combine the results". A named algorithm with a reason stands out.

### Cross-encoder reranking — the accuracy stage

**The problem.** Retrieval uses a **bi-encoder**. It embeds the query and each chunk *separately*, then compares them with cosine. This is fast, because chunk embeddings are computed ahead of time. But the query and chunk never "see" each other, so accuracy is limited.

**The design choice.** After retrieval, add a **reranker**, a second model that re-orders candidates by relevance. Here it is a **cross-encoder**. It reads `[query, chunk]` *together* and scores how relevant the chunk is. Think of judging a CV by keywords (bi-encoder) versus reading it next to the job description (cross-encoder).

**Why this (and not the obvious alternative).** The obvious alternative is to use the cross-encoder for everything. It is far more accurate but roughly 100× slower per pair. That is unusable over millions of chunks, but ideal for cutting 20 candidates down to 5.

The general lesson: *"Retrieve wide and cheap, then rerank narrow and expensive."* This two-stage shape recurs everywhere in search and recommendation systems.

For RAG it matters because **irrelevant chunks in the prompt cause hallucination** (the model making things up). So reranking reduces hallucination. It is not just a quality nicety.

**Say this:** *"Retrieve wide and cheap, rerank narrow and expensive. And reranking cuts hallucination, because fewer irrelevant chunks reach the prompt."*

### Dual-source prompt assembly

**The problem.** Retrieval can miss things. If a current medication sits in a chunk outside the top 5, the model never sees it. In medicine, that is not acceptable.

**The design choice.** The prompt combines two things:

1. A **structured health profile** (~800 tokens), built by code in a fixed, predictable way: current medications, latest labs with trends, diagnoses, risk flags.
2. The **top-5 retrieved chunks** (~2,500 tokens), the narrative evidence.

**Why this (and not the obvious alternative).** The obvious alternative is retrieval alone. The profile guarantees the *structured* facts are complete. The chunks add *context and nuance* that a schema cannot hold. Retrieval alone may miss a current medication. A profile alone loses the clinical reasoning in the notes.

**Say this:** *"I wouldn't rely on retrieval alone for facts that must be complete. Anything where a miss is unacceptable should be computed by code and injected, with retrieval adding context around it."* This is a genuinely good idea to bring to an interview.

### Measurement and tracing — the stages people forget

**The problem.** A prompt tweak or a model version bump can make answers worse, and no test fails. When an answer is wrong, you cannot tell why.

**The design choice.** Add two things.

- **Automated eval.** Run automatic checks on a fixed set of questions, in CI (the checks that run on every code change). Two checks are *faithfulness* (does the answer stick to the retrieved text?) and *context recall* (did retrieval find the chunks that were needed?). Without this, *"RAG quality drifts silently."*
- **End-to-end tracing.** Record every step of each request: which chunks were retrieved, how they ranked, and what prompt was sent. Without it, the doc notes, *"debugging RAG is guesswork."*

Mentioning eval and tracing unprompted is one of the clearest signals that you have run a RAG system, not just built one once.

**Say this:** *"Without eval, quality drifts silently. Without tracing, failures can't be explained."*

## Storage layout

```
vector store: named vectors { dense: 768-dim cosine, sparse: BM25 }
              payload: patient_id (indexed), document_id (indexed),
                       document_date (indexed), s3_chunk_key
              → NO chunk text stored here
S3:           the chunk text itself, encrypted
```

A **vector store** is a database that finds embeddings close to a query embedding. The **payload** is extra data kept beside each vector, such as the patient ID. "Indexed" means the database can filter on that field quickly.

Two things to notice.

**Payload indexes on `patient_id`.** Retrieval is always for one patient, so this must be a pre-filter, not a post-filter. A pre-filter narrows the search to that patient first. A post-filter searches everything, then drops the wrong results. That wastes work on vectors you throw away. Worse, it risks cross-patient leakage.

**The text is not in the vector store.** It holds only an S3 key, a pointer to where the text lives. That keeps PHI (protected health information) in one auditable place. See [PII and blind indexes](/citadel/sd/war/pii-and-blind-index/).

## Answering it in an interview

Have a one-sentence reason ready for each stage. The question is always *"why not skip it?"*

| Stage | The one-liner |
|---|---|
| Semantic chunking | Fixed windows cut records mid-fact; retrieval can't repair a bad chunk |
| Contextual headers | A chunk alone doesn't know its own document or date |
| Domain embedding | Generic models don't know `HTN` = hypertension |
| Sparse alongside dense | Codes and drug names need exact word match |
| RRF | Scores can't be compared; ranks can |
| Cross-encoder rerank | Retrieve wide and cheap, rerank narrow and expensive; cuts hallucination |
| Structured profile beside chunks | Facts that must be complete shouldn't depend on ranking |
| Eval + tracing | Otherwise quality drifts silently and failures can't be explained |
