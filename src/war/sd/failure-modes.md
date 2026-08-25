---
title: "Failure modes and reliability"
description: "What happens when the LLM rate-limits you — the failure-mode matrix and the recovery story for each."
order: 15
minutes: 8
---

**The prompt this answers:** *"Your LLM provider starts returning 429s. What happens to your
system?"* — and the general form, *"walk me through what breaks."*

Most candidates design the happy path and improvise the rest. This is a real failure-mode matrix
written *before* the failures, which is what makes it worth studying: each row pairs a specific
failure with a specific, differentiated response.

## The matrix

| Failure | Response | Why *this* response |
|---|---|---|
| LLM rate-limit (429) | Exponential backoff 1→2→4→8s, then open a circuit breaker. Nack with **requeue=true** | Transient and self-resolving. The work is still valid, so keep it — don't poison-queue it |
| LLM server error (500) | Retry once, then nack to **DLQ**. Trip the breaker after 5 consecutive | Might not be transient. One retry, then stop guessing |
| LLM `MAX_TOKENS` | Progressive input reduction 100% → 75% → 50%, then a terminal `INPUT_TOO_LARGE` — **no retry** | Deterministic. Retrying identical input gets the identical failure. Degrade, then give up honestly |
| Vector store write failure | Retry once, then DLQ | Infra-level; either it comes back immediately or a human is needed |
| DB lock timeout on merge | `SELECT … FOR UPDATE` with a 5s wait, retry once | Contention, not corruption. A short wait usually resolves it |
| Duplicate webhook delivery | Idempotency key in Redis, 1h TTL | At-least-once delivery is a guarantee, not a bug |
| Max retries exceeded | Message rests in a durable DLQ, **no TTL**. Alert if depth > 0 for 5 min. Replay via script | A poison message must stay inspectable. Dropping it loses the evidence |

## The four principles behind it

### 1. Requeue and DLQ are different decisions

The distinction candidates miss. Both are "the message failed", but:

- **Requeue** — the work is still valid and the obstacle is temporary (rate limit). Put it back.
- **DLQ** — the work may be permanently unprocessable. Take it out of the flow so it can't block
  or loop, and keep it for inspection.

Requeueing a poison message gives you an infinite loop consuming your rate limit. DLQ-ing a
rate-limited message throws away valid work and needs a human. **Same symptom, opposite action** —
which is why the matrix distinguishes 429 from 500.

### 2. A retry must change something

`MAX_TOKENS` is the cleanest illustration. Retrying the same input produces the same error, so the
strategy **reduces the input** each attempt — 100%, 75%, 50% — and then fails **terminally with a
specific error code**, no retry.

**Say this:** *"A retry is only justified if something differs on the next attempt — time, input,
or destination. If nothing differs, it's a busy-loop with extra logging."*

### 3. The circuit breaker protects the dependency, not you

After N consecutive failures, stop calling. Two reasons, and the second is the one worth saying:
you stop wasting your own capacity on calls that will fail, **and you stop adding load to a
service that is already struggling.** A retry storm from every client is how a degraded dependency
becomes a dead one.

### 4. Fail-open vs fail-closed is a per-case judgement

The codebases make this call differently in different places, correctly:

- **Publish failures fail open.** A broker outage must not fail a user's document upload — logged,
  not thrown. A missing screen-pop is an annoyance; a rejected upload is a broken product.
- **Unscoped queries fail closed.** A reporting datasource with no tenant column is **refused**
  rather than run without a tenant filter. Better to serve an error than another hospital's data.
- **The stub engine fails open, and that's a bug** — see
  [flagged findings](/citadel/lld/war/inventory/#flagged-findings). A missing property serves canned data
  as real reporting.

**The rule:** fail open when the failure costs *convenience*; fail closed when it costs
*correctness or safety*. State which one you're choosing and why — that's the whole answer.

## Observability that matches the failures

Alerts are defined on the things that actually go wrong, not on generic CPU thresholds:

- **DLQ depth > 0 for 5 minutes** — something is unprocessable and a human is needed
- **RAG faithfulness < 0.80** — quality regression, invisible to any infra metric
- **Pipeline p99 > 120s** — degradation before users complain
- **LLM error rate > 5%** — the dependency is going

**The principle:** each alert corresponds to a row in the failure matrix. If you can't name what a
human would *do* when an alert fires, it shouldn't be an alert.

## Timeouts, stated explicitly

Every hop has a declared budget — and the asymmetry is the interesting part:

| Hop | Timeout | Reasoning |
|---|---|---|
| Broker → consumer ack | 30 min | LLM work is genuinely slow; a short ack timeout would redeliver work still in progress |
| Service → service webhook | 1s connect, 5s read | A fast internal call. Slow means broken |
| DB lock wait | 5s | Long enough for normal contention, short enough to surface a deadlock |

**Say this:** *"An unset timeout is a timeout of infinity. Every network call needs a number, and
the number comes from what the work actually takes — a 30-minute ack timeout for LLM work and a
5-second read timeout for an internal webhook are both correct."*

## Answering it in an interview

1. Build the matrix out loud: for each dependency, what does failure look like and what do you do?
2. **Distinguish requeue from DLQ.** This alone puts you ahead of most answers.
3. State the retry rule: something must change, or don't retry.
4. Name fail-open vs fail-closed per case, with the cost that decides it.
5. Tie each alert to an action.
6. Give every hop a timeout, and justify the asymmetry.
