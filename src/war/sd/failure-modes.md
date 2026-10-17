---
title: "Failure modes and reliability"
description: "What happens when the LLM provider rate-limits you, and how the system recovers from each kind of failure."
order: 15
minutes: 8
---

**The prompt this answers:** *"Your LLM provider starts returning 429s. What happens to your
system?"* — and the general form, *"walk me through what breaks."*

Rate limiting means a service refuses your calls because you sent too many too fast. The refusal
is an HTTP status code, **429** ("too many requests"). So: what does your system do when the LLM
provider says "slow down"?

Most candidates design the happy path and make up the rest on the spot. This case study is
a failure-mode matrix (a table of failures and responses) written *before* the failures happened.
Each row pairs one specific failure with one specific response.

## The matrix

Some terms first, because the table uses them:

- **Exponential backoff** means waiting longer after each failed try: 1 second, then 2, then 4, then 8.
- **Circuit breaker** is a switch that stops all calls to a failing service for a while. Think of the breaker in your home: when something is wrong, it cuts the power instead of letting the wiring burn.
- **Nack** means the consumer tells the queue "I could not process this message". **Requeue=true** puts the message back to try again later.
- **DLQ** (dead-letter queue) is a side queue where failed messages are parked, so they stop blocking the main queue.
- **Poison message** is a message that can never be processed, however many times you try.
- **Idempotent** means doing the same thing twice has the same result as doing it once.
- **TTL** (time to live) is how long data is kept before it is deleted automatically.

| Failure | Response | Why *this* response |
|---|---|---|
| LLM rate-limit (429) | Exponential backoff 1→2→4→8s, then open a circuit breaker. Nack with **requeue=true** | It is temporary and fixes itself. The work is still good, so keep it. Do not send it to the dead-letter queue |
| LLM server error (500) | Retry once, then nack to **DLQ**. Trip the breaker after 5 failures in a row | It may not be temporary. Try once more, then stop guessing |
| LLM `MAX_TOKENS` (input too long for the model) | Shrink the input step by step, 100% → 75% → 50%, then fail with a final `INPUT_TOO_LARGE` error. **No retry** | Same input always gives the same failure. Do a smaller version of the job, then give up honestly |
| Vector store write failure | Retry once, then DLQ | An infrastructure problem. Either it recovers straight away or a human must fix it |
| DB lock timeout on merge | `SELECT … FOR UPDATE` with a 5s wait, retry once | Two jobs wanted the same row. Nothing is corrupted. A short wait usually fixes it |
| Duplicate webhook delivery | Idempotency key in Redis, 1h TTL | The sender promises to deliver at least once, so duplicates are normal, not a bug |
| Max retries exceeded | Message rests in a durable DLQ with **no TTL**. Alert if depth > 0 for 5 min. Replay via script | A poison message must stay available to inspect. Deleting it destroys the evidence |

## The four principles behind it

### 1. Requeue and DLQ are different decisions

**What goes wrong.** A message fails. Both "put it back" and "park it" look like fixes. They are
opposite actions.

**The fix.**

- **Requeue** — the work is still good and the blocker is temporary (a rate limit). Put it back.
- **DLQ** — the work may never succeed. Take it out of the flow so it cannot block or loop, and keep it for a human to inspect.

**Why this, and not the obvious alternative.** Think of a post office. A letter with a missing stamp can wait. A letter with no address
must be set aside, or it goes round forever. Requeueing a poison message makes an infinite loop that eats your rate limit.
Sending a rate-limited message to the DLQ throws away good work and needs a human to rescue it.
**Same symptom, opposite action.** That is why the matrix treats 429 and 500 differently.

### 2. A retry must change something

**What goes wrong.** `MAX_TOKENS` means the input is too long for the model. If you retry the same
input, you get the same error every time.

**The fix.** Make the input smaller on each attempt: 100%, then 75%, then 50%. This is graceful
degradation, which means doing a reduced version of the job instead of failing completely. If it
still fails, stop with a **final error that has a specific code** (`INPUT_TOO_LARGE`). No more retries.

**Why this, and not the obvious alternative.** "Just retry" is the obvious move. A retry that
changes nothing is only a busy loop.

**Say this in the interview:** *"A retry only makes sense if something is different next time: the
time, the input, or the destination. If nothing differs, it's a busy-loop with extra logging."*

### 3. The circuit breaker protects the dependency, not you

**What goes wrong.** A service you depend on is struggling. Every client keeps retrying. The extra
load pushes the service from slow to dead. This is called a retry storm.

**The fix.** After N failures in a row, stop calling it for a while.

**Why this, and not the obvious alternative.** Retrying harder feels helpful, but it makes things worse. The breaker
has two benefits. You stop wasting your own capacity on calls that will fail. And, the one worth
saying out loud, **you stop adding load to a service that is already struggling.**

### 4. Fail-open vs fail-closed is a per-case judgement

**What goes wrong.** Failing open means you carry on when something breaks. Failing closed means
you refuse to continue. A door that unlocks in a power cut fails open. A bank vault that stays
locked fails closed. The right pick changes from case to case, and the codebases make this call
differently in different places, correctly:

- **Publish failures fail open.** A broker outage (the message system is down) must not fail a user's document upload. The error is logged, not thrown. A missing screen-pop is an annoyance. A rejected upload is a broken product.
- **Unscoped queries fail closed.** A reporting datasource with no tenant column (nothing to say which hospital a row belongs to) is **refused** rather than run without a tenant filter. Better to show an error than another hospital's data.
- **The stub engine fails open, and that's a bug.** See [flagged findings](/citadel/lld/war/inventory/#flagged-findings). A missing property makes it serve canned data as if it were real reporting.

**The rule.** Fail open when the failure costs *convenience*. Fail closed when it costs
*correctness or safety*.

State which one you are choosing and why. That is the whole answer.

## Observability that matches the failures

Alerts are set on the things that actually go wrong, not on generic CPU thresholds:

- **DLQ depth > 0 for 5 minutes** — something cannot be processed and a human is needed
- **RAG faithfulness < 0.80** — answer quality has dropped, and no infrastructure metric would show it
- **Pipeline p99 > 120s** — the slowest 1% of runs take over two minutes. This warns you of slowdowns before users complain
- **LLM error rate > 5%** — the dependency is going bad

**The principle:** each alert matches a row in the failure matrix. If you cannot name what a human
would *do* when an alert fires, it should not be an alert.

## Timeouts, stated explicitly

A timeout is how long you wait for something before you give up. Every hop has a declared budget,
and the interesting part is that the numbers are very different:

| Hop | Timeout | Reasoning |
|---|---|---|
| Broker → consumer ack | 30 min | LLM work is truly slow. A short ack timeout would hand out work again while it is still running |
| Service → service webhook | 1s connect, 5s read | A fast internal call. If it is slow, it is broken |
| DB lock wait | 5s | Long enough for normal contention, short enough to show up a deadlock |

(An ack is the consumer's "done" signal to the broker. A webhook is one service calling another
over HTTP. A deadlock is two jobs each waiting for the other forever.)

**Say this in the interview:** *"An unset timeout is a timeout of infinity. Every network call needs
a number, and the number comes from how long the work really takes. A 30-minute ack timeout for LLM
work and a 5-second read timeout for an internal webhook are both correct."*

## Answering it in an interview

1. Build the matrix out loud: for each dependency, what does failure look like and what do you do?
2. **Distinguish requeue from DLQ.** This alone puts you ahead of most answers.
3. State the retry rule: something must change, or don't retry.
4. Name fail-open vs fail-closed per case, with the cost that decides it.
5. Tie each alert to an action.
6. Give every hop a timeout, and justify why the numbers differ.
