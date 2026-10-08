import { row, step } from '../../lib/trace.ts';

export const transport = [
  step('A food-delivery order page shows "preparing → picked up → delivered". Status changes about four times in forty minutes. Which transport?', [], 0, [
    ['Short polling every 10–15 seconds', 'Right. Four changes in forty minutes do not justify a persistent connection. Polling is stateless, cache-friendly and needs no new infrastructure. Saying "polling is enough here" is a flex, not a cop-out.'],
    ['WebSockets', 'Box inflation. You would run a stateful gateway fleet so that four status changes arrive a few seconds sooner. Nothing on this page sends upstream in real time.'],
    ['Server-sent events', 'It would work, but it holds a connection open for forty minutes to deliver four events. Start with polling; move to SSE only if the delay matters to the product.'],
  ]),
  step('A live sports score widget goes to 5 million viewers. The client never sends anything back. Which transport?', [], 1, [
    ['WebSockets', 'They work, but you pay for duplex nobody uses — and lose the browser\'s built-in reconnect and Last-Event-ID resume that SSE gives you for free.'],
    ['Server-sent events', 'Right. Pure server-to-client push is SSE\'s exact home: one long-lived HTTP response, automatic reconnect, resume from the last event id.'],
    ['Short polling every 500 ms', '5,000,000 ÷ 0.5 s = 10,000,000 requests per second, nearly all empty. Polling is for rare updates.'],
  ]),
  step('A chat app: users type, see typing indicators, and receive messages within a second. Which transport?', [], 2, [
    ['Long polling', 'It delivers near-instantly, but every message and every typing ping costs a full request and response. Keep it as the fallback when sockets are blocked.'],
    ['SSE for downstream plus HTTP POST for upstream', 'A defensible design, and some products ship it. But typing indicators and receipts flow upstream constantly; a single duplex connection carries both directions with the least overhead.'],
    ['WebSockets', 'Right. Both directions, frequent, small frames. This is the case WebSockets exist for — and you accept the stateful gateway tier that comes with them.'],
  ]),
];

export const routing = [
  step('A message for Bob reaches the chat service. Kestrel runs 40 gateway servers; Bob\'s phone is connected to one of them. What finds it?', [], 1, [
    ['Send it to all 40 gateways; whoever holds Bob delivers', 'That is pub/sub done crudely: 40 messages to deliver 1. Fine to evolve from, but at 60,000 messages a second it is 2.4 million internal sends a second.'],
    ['Look up Bob in a connection registry (user → device → gateway) and send it to that gateway', 'Right. One lookup, one send. The registry is written on connect and removed on disconnect. Pub/sub on a per-user channel is the other good answer — pick one and say it.'],
    ['The load balancer remembers which gateway Bob is on', 'The load balancer chose a gateway when Bob connected; it does not offer a "where is user X" lookup to your services. You need your own registry.'],
  ]),
  step('Bob\'s phone drops from gateway 17 and reconnects to gateway 22 within a second. Gateway 17 notices the dead socket a few seconds later and runs its cleanup: DEL Bob\'s registry entry. What goes wrong?', [
    row('Timeline', ['gw-17: Bob connects', 'gw-22: Bob reconnects, writes entry', 'gw-17: cleanup DEL'], { 2: 'LAST' }, { tones: { 2: 'hot' } }),
  ], 2, [
    ['Nothing — the delete is for the old connection', 'An unconditional DEL removes whatever is there, and what is there now is gateway 22\'s fresh entry.'],
    ['Bob gets duplicate messages', 'Duplicates come from retries. This bug causes the opposite: messages that do not get pushed at all.'],
    ['Bob\'s new entry is deleted; he looks offline and pushes stop until he reconnects', 'Right. Cleanup must be conditional: delete only if the entry still names this gateway and this connection id (compare-and-delete, a small Lua script in Redis).'],
  ]),
  step('Clients send a heartbeat every 30 s. Someone proposes refreshing each user\'s registry TTL on every heartbeat. Kestrel has 20 million connections at peak. What does that cost, and what is cheaper?', [], 0, [
    ['About 667,000 Redis writes a second; instead give each gateway a liveness lease and treat entries that name a dead gateway as stale', 'Right. 20,000,000 ÷ 30 ≈ 666,667 writes/s just to say "still here". Heartbeats should end at the gateway. One lease per gateway (refreshed every few seconds) tells routers which entries to trust.'],
    ['Nothing much — Redis is fast', 'Fast is not free: two-thirds of a million writes a second is several Redis nodes of pure keepalive traffic, all to repeat what the gateway already knows.'],
    ['About 20 million writes a second', '20 million connections ÷ 30 seconds per heartbeat is about 667 thousand per second, not 20 million.'],
  ]),
];

export const reconnect = [
  step('A gateway holding 500,000 connections crashes. Every client retries after exactly 1 second. What happens at t = 1 s?', [], 1, [
    ['Nothing special; the other gateways absorb it', 'They absorb it only if it is spread out. Here it arrives in one second.'],
    ['Half a million TLS handshakes, auth checks, registry writes and catch-up syncs land in the same second', 'Right. A self-inflicted stampede — the same shape as a cache stampede. The healthy gateways and the message store take a spike exactly when they can least afford one.'],
    ['Clients reconnect to the crashed gateway when it restarts', 'The load balancer routes new connections to healthy gateways. The problem is when, not where.'],
  ]),
  step('Clients now wait a random delay between 0 and 30 seconds before reconnecting (full jitter). Roughly how many reconnects per second does the fleet see?', [], 0, [
    ['About 16,700 per second', 'Right. 500,000 ÷ 30 ≈ 16,667 per second, spread over the 39 healthy gateways — about 430 each per second. A load the fleet can take.'],
    ['About 500,000 per second', 'That is the no-jitter case. Uniform random delays spread the same reconnects over the whole 30-second window.'],
    ['About 1,700 per second', 'That would need a 300-second window. With 30 seconds it is ten times more.'],
  ]),
  step('Second failed attempt. What should the client\'s next delay be?', [], 2, [
    ['Exactly double the last delay', 'Doubling without randomness keeps clients that failed together in lockstep — they collide again on every retry.'],
    ['A fixed 1 second, forever', 'A fixed retry hammers a struggling fleet and keeps the herd synchronised.'],
    ['A random value between 0 and min(cap, base × 2^attempt)', 'Right. Exponential backoff grows the window; full jitter spreads clients across it; the cap keeps a user from waiting minutes on a healthy network.'],
  ]),
];

export const ordering = [
  step('Alice and Bob each send a message in the same conversation at the same moment. Their phone clocks differ by 4 seconds. How should every device decide the order?', [], 1, [
    ['By the sender\'s device timestamp', 'Clocks drift and can be set by hand. Two devices would sort the same conversation differently, and a phone set to 2031 would pin its messages to the bottom forever.'],
    ['By a per-conversation sequence number assigned by the server when the message is persisted', 'Right. One authority per conversation hands out 41, 42, 43… Every device sorts by it, so every device shows the same order. Timestamps are for display only.'],
    ['By arrival order at each device', 'Network paths differ. Two recipients could see the two messages in opposite orders.'],
  ]),
  step('Bob\'s phone has applied messages up to seq 42 in a conversation. It now receives seq 44. What should it do?', [
    row('Applied', [40, 41, 42], {}, { tones: { 0: 'done', 1: 'done', 2: 'done' } }),
    row('Just arrived', [44], { 0: 'NEW' }, { tones: { 0: 'hot' } }),
  ], 2, [
    ['Show 44 and forget about 43', 'Then 43 is lost from Bob\'s point of view. The point of sequence numbers is that a gap is visible.'],
    ['Drop 44 and wait for 43 to arrive by push', 'Push is the fast path, not the reliable one. If 43 was lost in a dead socket it will never be pushed again; Bob waits forever.'],
    ['Hold 44, ask the server for everything after 42, then apply 43 and 44 in order', 'Right. A gap triggers a catch-up read from the store, which is the truth. Many apps show 44 immediately in its slot and fill 43 in when it arrives; either way, order comes from seq.'],
  ]),
  step('Bob\'s phone receives seq 42 a second time (the gateway retried a push whose ack was lost). What should it do?', [
    row('Applied', [40, 41, 42], {}, { tones: { 0: 'done', 1: 'done', 2: 'done' } }),
    row('Just arrived', [42], { 0: 'AGAIN' }, { tones: { 0: 'hot' } }),
  ], 0, [
    ['Drop it, and send the ack again', 'Right. Delivery is at-least-once; the client makes it look exactly-once by ignoring a message id (or seq) it already has. Re-acking stops the gateway from retrying a third time.'],
    ['Show it twice — the server sent it twice', 'Users notice duplicates instantly. At-least-once delivery is a promise to the system, not to the screen.'],
    ['Drop it silently without acking', 'The gateway never learns it arrived and keeps retrying the push.'],
  ]),
];

export const flow = [
  step('Alice taps send. When may her phone show one grey tick ("sent")?', [], 1, [
    ['As soon as the frame leaves her phone', 'The frame could die in a lift, on a dropped Wi-Fi network, or inside a gateway that crashes a millisecond later. The tick would be a lie.'],
    ['When the server acks after the message is durably persisted and has a seq', 'Right. The tick is a promise: "this will reach Bob eventually". Only durable storage can keep that promise; the ack carries the seq so Alice\'s phone can place the message correctly.'],
    ['When Bob\'s phone receives it', 'That is the second tick, "delivered". Bob may be offline for a week; Alice still needs to know the server has it.'],
  ]),
  step('The server persisted Alice\'s message, but its ack to her was lost. Her phone retries the same send. What stops a duplicate?', [], 2, [
    ['Nothing; duplicates are part of at-least-once', 'Duplicates in transit are, but a duplicate stored message is visible to everyone forever. The sender side must be idempotent.'],
    ['Comparing message bodies within a few seconds', 'People send "ok" twice on purpose. Content is not identity.'],
    ['A client-generated message id; the server keeps (conversation, clientMsgId) unique and returns the original seq on a repeat', 'Right. The retry becomes a lookup: same id, same seq, same ack. This is the idempotency-key pattern applied to chat.'],
  ]),
  step('Bob is offline: no entry in the connection registry. Where does Alice\'s message go?', [], 0, [
    ['It is already persisted; append a pointer to Bob\'s inbox and send a push notification as a wake-up', 'Right. The store holds it; Bob\'s devices fetch everything after their cursor when they reconnect. The push only tells the phone to wake up and sync.'],
    ['Into the push notification payload — that is how it reaches the phone', 'Push services are best-effort and may delay, collapse or drop notifications. A push is a doorbell, not a delivery van.'],
    ['Drop it and tell Alice the delivery failed', 'Offline delivery is a core requirement. The second tick simply waits until Bob\'s phone fetches and acks.'],
  ]),
];

export const presenceDrill = [
  step('Kestrel has 50 million daily users, each going online or offline about 20 times a day, with about 100 contacts each. If every change is pushed to every contact, how many presence events is that a day?', [], 2, [
    ['About 1 billion', 'That is 50M × 20 — the changes themselves, before fan-out to 100 contacts each.'],
    ['About 2 billion', 'That is roughly the number of chat messages Kestrel sends a day. Presence naive fan-out is far bigger.'],
    ['About 100 billion — roughly 1 million a second, fifty times the message traffic', 'Right. 50,000,000 × 20 × 100 = 10¹¹ a day, ÷10⁵ ≈ 1,000,000 a second. Presence would cost fifty times more than the messages it decorates.'],
  ]),
  step('What cuts presence fan-out the most without breaking the feature users see?', [], 1, [
    ['Push presence changes only to contacts who are online', 'It helps — maybe by half — but most online contacts are not looking at you. They never see the dot.'],
    ['Push only to people currently viewing a conversation or contact list that shows this user; fetch presence lazily when a screen opens', 'Right. Presence is only valuable on a screen that shows it. Subscribe while the screen is open, fetch the current state when it opens, unsubscribe when it closes.'],
    ['Store presence in the database and let clients poll every second', '50 million clients polling every second is 50 million requests a second. Worse than the fan-out.'],
  ]),
  step('A user in a tunnel flaps online/offline five times in a minute. What should presence do?', [], 0, [
    ['Debounce: mark offline only after the heartbeat TTL lapses or a short grace period passes', 'Right. Presence is soft state. A grace window (and a TTL on the online flag) absorbs flapping, and each change you suppress is a fan-out you do not pay for.'],
    ['Publish every change immediately — accuracy first', 'Contacts watch the dot blink, and every blink is a fan-out. Nobody needs sub-second presence accuracy.'],
    ['Persist each transition durably before publishing', 'Presence is the textbook at-most-once data. Losing one transition costs nothing; the next heartbeat fixes it.'],
  ]),
];

export const groups = [
  step('A group of 200 people. One message is sent. With fan-out on write to each member\'s inbox, how many inbox writes is that, and is it acceptable?', [], 0, [
    ['200 small pointer writes — fine for groups capped at a few hundred', 'Right. The message body is stored once; each member\'s inbox gets a small pointer (conversation, seq). Reconnect sync stays one cheap query per device.'],
    ['1 write — groups never fan out', 'Someone has to tell 200 people. Either you write 200 pointers now, or 200 readers each check the group later.'],
    ['200 copies of the full message — too expensive, use fan-out on read', 'Fan-out on write copies pointers, not bodies. For a few hundred members it is the simpler design.'],
  ]),
  step('A public channel has 100,000 members and receives 10 messages a second. What changes?', [], 2, [
    ['Nothing; keep fanning out to inboxes', '100,000 × 10 = 1,000,000 inbox writes a second for one channel — more than all the rest of Kestrel\'s messages combined.'],
    ['Cap channels at 256 members', 'That deletes the product Iris asked for. The architecture has to change instead.'],
    ['Fan out on read: store once in the channel log, members sync per-channel cursors, and only gateways with subscribed online members get a push', 'Right. Gateways subscribe to the channel topic; each gets one copy and pushes it to its local members. With 40 gateways that is at most 40 internal sends per message, not 100,000.'],
  ]),
];

export const storage = [
  step('Which partition key for the message table?', [], 1, [
    ['message_id', 'Every message lands on a random node; "the last 50 messages of this conversation" becomes a scatter-gather across the cluster.'],
    ['conversation_id (with a time or seq bucket for very busy conversations), clustered by seq', 'Right. The dominant reads — latest page, messages after seq N — hit one partition and come back sorted. Buckets stop a giant channel from growing one unbounded partition.'],
    ['sender_id', 'Reading a conversation means merging every participant\'s partitions and re-sorting. Nobody reads "all messages Alice ever sent".'],
  ]),
  step('Kestrel sends 2 billion messages a day at about 200 bytes stored each, replicated 3 times. How much new raw storage per day?', [], 1, [
    ['400 GB', 'That is one copy. Replication factor 3 triples it.'],
    ['1.2 TB', 'Right. 2 × 10⁹ × 200 B = 400 GB of logical data, × 3 replicas = 1.2 TB a day — about 440 TB a year if history is kept forever. This is why retention is a product decision.'],
    ['12 TB', 'That is ten times too much — check the powers of ten: 2 × 10⁹ × 200 = 4 × 10¹¹ bytes.'],
  ]),
];

export const failures = [
  step('A gateway process is killed mid-push. Message 57 was written to the socket buffer but the client never acked it. What guarantees Bob still gets it?', [], 2, [
    ['The kernel flushes the socket buffer before the process dies', 'Bytes in a buffer on a dying machine are not a delivery. Even if they left, nothing proves they arrived.'],
    ['The gateway persisted it to local disk', 'Gateways should hold no durable state; that is what makes them disposable.'],
    ['Bob\'s delivered cursor still says 56, so his reconnect sync fetches 57 from the store', 'Right. Push is the fast path; the store plus per-device cursors is the truth. Nothing a gateway does can lose a persisted message.'],
  ]),
  step('Bob\'s phone is on a train. Its TCP connection is silently dead (half-open): the gateway still thinks the socket is fine. What detects it?', [], 0, [
    ['Missed application heartbeats — no ping within ~2 intervals and the gateway closes the socket and drops the registry entry', 'Right. TCP alone can take a very long time to notice a peer that vanished without closing. Application-level ping/pong bounds detection to about a minute.'],
    ['TCP keepalive with default settings', 'Default keepalive timers on many systems are measured in hours. Tune them or, more portably, heartbeat at the application layer.'],
    ['The registry TTL expires after a day', 'A day of pushing into a dead socket means a day of messages that only arrive when Bob happens to reconnect.'],
  ]),
  step('The Redis connection registry is unreachable for 20 seconds. What should the chat service do with new messages?', [], 1, [
    ['Reject sends until Redis is back', 'The registry is a routing hint. Losing it should cost latency, not writes — the message store is healthy.'],
    ['Keep persisting and acking; queue the pushes or skip them; devices pick messages up by sync or by push notification', 'Right. Sends still succeed because durability lives in the store. Push degrades; catch-up sync and notifications cover the gap.'],
    ['Broadcast every message to every gateway until it recovers', 'A 20-second outage turns each message into one send per gateway. It is a defensible emergency mode only for a small fleet; say the cost if you choose it.'],
  ]),
];

export const drills = [
  step('Live sports scores to 5M viewers — pick the mechanism and the reason.', [], 1, [
    ['WebSockets — real-time means WebSockets', 'They work but buy duplex nobody uses. Real-time is about latency, not about one transport.'],
    ['SSE — pure server→client push, no upstream traffic to justify duplex; simpler infra, same instant delivery', 'Right. One-way push is SSE\'s exact home.'],
    ['Polling every 500 ms — simplest', '500 ms polling at 5M viewers is 10M requests a second, nearly all empty.'],
    ['Kafka consumers on each phone', 'Clients consuming Kafka directly is never the answer: no auth model per user, no mobile-friendly protocol, and a broker exposed to the internet.'],
  ]),
  step('Message for Bob arrives; you run 50 WebSocket servers. How does it reach him?', [], 1, [
    ['Broadcast to all 50 servers — whoever has Bob delivers', 'That is pub/sub done crudely: 50 sends for 1 delivery. Fine to evolve from, but name the registry/pub-sub tradeoff explicitly.'],
    ['A connection registry (Redis: user→server, maintained on connect/disconnect) routes it to server 7 directly — or pub/sub on user channels; pick one and say it', 'Right. The routing problem is this pattern\'s core deep dive. Choosing out loud is what counts.'],
    ['Bob\'s next poll picks it up', 'Bob is on a WebSocket. There is no next poll.'],
    ['The load balancer remembers Bob\'s server', 'The load balancer picked a server at connect time; it does not answer "where is Bob" for your services.'],
  ]),
  step('A WS server dies; 500K clients reconnect. Which pair must your design have?', [], 1, [
    ['Bigger servers and TCP keepalive', 'Hardware does not stop a synchronised herd, and keepalive does not recover messages that were in flight.'],
    ['Reconnect with jittered backoff (no synchronized stampede) + last-seen-ID catch-up from persistent storage (no lost messages while disconnected)', 'Right. The two consequences of a crash are the reconnect wave and the gap in delivery. Both fixes are client-protocol design.'],
    ['Sticky sessions and session replication', 'The connections are already gone. Replicating socket state across servers is not how chat systems survive crashes; the store is the truth.'],
    ['A standby server with the same IP', 'The clients still all reconnect at once, and any message in flight still needs catch-up.'],
  ]),
  step('Which promise should the second grey tick ("delivered") make?', [], 2, [
    ['The gateway wrote the message to the recipient\'s socket', 'A write to a socket is not proof of arrival. A dead socket accepts writes too.'],
    ['The message is persisted', 'That is the first tick.'],
    ['A recipient device acknowledged the message (it is stored on the phone)', 'Right. Only the device can say it has the message. Its ack advances its delivered cursor, and the receipt flows back to the sender as a small event.'],
  ]),
  step('Your interviewer asks: "Exactly-once delivery?" What do you say?', [], 0, [
    ['At-least-once on the wire, idempotent at both ends: client message ids dedupe retried sends, and devices drop seqs they already applied — so users see each message exactly once', 'Right. Exactly-once delivery over an unreliable network is not on offer; exactly-once effect is, and you just described how.'],
    ['Yes — the WebSocket is TCP, so nothing is duplicated', 'TCP dedupes within one connection. Reconnects, retries and multiple gateways all create duplicates above TCP.'],
    ['Yes, with Kafka\'s exactly-once setting', 'Kafka\'s transactions cover read-process-write inside Kafka. They do not reach a phone on a train.'],
  ]),
  step('Where does a push notification (APNs/FCM) belong in the design?', [], 1, [
    ['It is the delivery channel for offline users', 'Push services are best-effort: they can delay, coalesce or drop notifications, and payloads are small. If it is your transport, messages get lost.'],
    ['It is a wake-up: it tells an offline device to connect and sync from its cursor', 'Right. The message is already in the store; the notification is a doorbell. Whether it carries a preview is a product (and encryption) decision.'],
    ['It replaces the WebSocket on mobile', 'Apps use push when they are not running; once open, they connect and use the socket.'],
  ]),
  step('Group chat with 50,000 members is added. What is the first thing to change?', [], 2, [
    ['More gateways', 'Connections are not the problem. Writes per message are.'],
    ['Faster disks for inbox writes', '50,000 inbox writes per message stays the problem however fast each one is.'],
    ['Switch big groups from fan-out on write to fan-out on read (one channel log, per-member cursors, gateway-level topic subscriptions)', 'Right. Small groups keep inbox fan-out; large ones store once and push only to gateways with online, subscribed members.'],
  ]),
  step('End-to-end encrypted chat. Which statement is true?', [], 0, [
    ['The server stores and routes ciphertext; keys live on devices; the server still sees metadata such as who talks to whom and when', 'Right. E2EE hides content, not the social graph or timing. It also means no server-side search or previews, and per-device encryption for multi-device.'],
    ['The server decrypts to route, then re-encrypts', 'Then it is encryption in transit, not end-to-end. Routing needs only the conversation and recipient ids, which stay readable.'],
    ['E2EE makes delivery receipts impossible', 'Receipts are small control events about seqs; they work the same, and can themselves be encrypted.'],
  ]),
];
