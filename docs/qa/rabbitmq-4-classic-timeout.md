# RabbitMQ classic-queue consumer timeout in 4.x (task `rabbitmq-4-classic-timeout`)

Run 2026-10-19. Containers `rabbitmq:4-management` (4.3.6) and `rabbitmq:4.2-management` (4.2.9), both removed afterwards. pika 1.4.4. `consumer_timeout = 10000` in `/etc/rabbitmq/conf.d/20-ct.conf`; `rabbitmq-diagnostics environment | grep consumer_timeout` showed `{consumer_timeout,10000}` and `rabbitmqctl eval 'application:get_env(rabbit, consumer_timeout).'` returned `{ok,10000}` on both. (The `application:set_env` eval variant was not needed: the conf file value was already live.)

## Claim: 4.x classic queues do not enforce the consumer timeout (pattern-async-jobs.mdx:565)
Result: CORRECTED (the "unclear" wording replaced; the cause is documented).

Sources (fetched 2026-10-19):
- GitHub release page https://github.com/rabbitmq/rabbitmq-server/releases/tag/v4.3.0 (4.3.0, 23 Apr 2026): breaking change "Consumer Timeouts are No Longer Evaluated for Classic Queues and Streams"; "Classic queues and streams never evaluate consumer timeouts as their use cases largely avoid the need for such as feature." Quorum queue timeouts are PR #13885 (also `x-consumer-timeout`; AMQP 1.0 deliveries are released instead of detaching the link). Bug fix PR #15805: quorum consumer timeout could fail to trigger under certain conditions.
- https://www.rabbitmq.com/docs/consumers: "Starting with RabbitMQ 4.3, delivery acknowledgement timeouts are only supported by quorum queues." Default 30 minutes, checked at one minute intervals, below one minute unsupported. Per-queue (3.12+) via policy `consumer-timeout` or argument `x-consumer-timeout`; docs example applies the policy to quorum queues.
- rabbitmq-users thread "Understanding consumer-timeout behaviour" (https://groups.google.com/g/rabbitmq-users/c/pxjDibY545E), Jul 2026: a CloudAMQP reply quotes the release notes ("moves consumer timeout handling responsibility into the queues themselves", classic queues and streams never evaluate it). Secondhand; only the 4.3.0 release page line above was read from the primary source.
- No GitHub issue about this was found by search; the change is intentional. Where the 3.x/4.0-4.2 check lived (channel vs queue) was not read in source and is not claimed.

Observed (conf-file timeout 10 s, one never-acking consumer per queue, each on its own channel, 200 s watch):

| Version | Queue | Result |
|---|---|---|
| 4.2.9 | classic plain, `x-queue-type: classic`, classic + policy `consumer-timeout`, classic + `x-consumer-timeout` arg (accepted), quorum, quorum + arg | all channels closed at 60.0 s; log: `Consumer ... has timed out waiting for a consumer acknowledgement ... Timeout value used: 10000 ms` then `precondition_failed: delivery acknowledgement on channel N timed out` |
| 4.3.6 | quorum | `basic.cancel` at 10.0 s (channel stayed open) |
| 4.3.6 | quorum + `x-consumer-timeout=10000` | `basic.cancel` at 10.0 s |
| 4.3.6 | classic plain, `x-queue-type: classic`, classic + policy `consumer-timeout` | nothing in 200 s (plus the earlier 330 s run in live-tests-3): no cancel, no channel close, no "timed out" line in the broker log |
| 4.3.6 | classic + `x-consumer-timeout` | declare refused: `PRECONDITION_FAILED - invalid arg 'x-consumer-timeout' for queue ... of queue type rabbit_classic_queue` |

Conclusion: enforcement for classic queues existed through 3.13.7 and 4.2.9 (observed) and was removed on purpose in 4.3.0 (release notes). 4.0 and 4.1 were not run. The full 30 minute default on 4.3 classic was not waited out; the release notes say it is never evaluated.

Edit: pattern-async-jobs.mdx line 565, replaced "Treat the 4.x classic-queue case as unclear..." with the per-version facts above and the release-note/doc citation in plain words.
