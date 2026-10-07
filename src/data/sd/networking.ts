import { row, step } from '../../lib/trace.ts';

// Chapter 2 · DNS
export const dns = [
  step('Kestrel wants to fail over to a standby region within about a minute by changing a DNS record. What has to be true first?', [], 1, [
    ['Nothing — a DNS change takes effect everywhere at once', 'Resolvers and clients keep their cached answer until its TTL runs out. A one-hour TTL means up to an hour of traffic still going to the dead region.'],
    ['The record’s TTL must already be low (about 60 s) before the failure — and some clients will still cache longer than that', 'Right. The TTL that matters is the one resolvers cached before things broke. Low TTL buys fast failover at the cost of more lookups, and misbehaving resolvers or runtime caches are why serious failover also uses anycast or load-balancer health checks.'],
    ['Lower the TTL during the incident', 'Too late. Everyone who already cached the record holds it for the old TTL. You lower TTLs before a planned move, not during an outage.'],
  ]),
  step('A typo puts the wrong IP in the api.kestrel.example A record, which has a 24-hour TTL. You fix it after 10 minutes. How long can some users keep failing?', [], 2, [
    ['About 10 minutes', 'Fixing the record does not reach caches that already hold the wrong answer.'],
    ['Until they restart their browser', 'The operating system and the recursive resolver also cache. A browser restart clears only one layer.'],
    ['Up to about 24 hours, until cached copies expire', 'Right. Any resolver that fetched the bad record holds it for the full TTL. High TTLs are cheap and fast in good times and haunt you for a day in bad ones.'],
  ]),
];

// Chapter 3 · handshakes and round trips
export const roundTrips = [
  step('A phone opens a brand-new HTTPS connection: TCP, then TLS 1.3, then the HTTP request. DNS is already cached. How many round trips pass before the request itself can leave the phone?', [
    row('Before the request', ['TCP handshake', 'TLS 1.3 handshake', 'HTTP request'], { 2: 'WHEN?' }, { tones: { 2: 'hot' }, join: '→' }),
  ], 1, [
    ['1', 'TCP alone takes one round trip (SYN, SYN-ACK). TLS 1.3 still needs its own round trip on top before the client may send encrypted application data.'],
    ['2', 'Right. One round trip for TCP, one for TLS 1.3; the request goes out with the client’s Finished message, and the first response byte arrives after a third round trip plus server time.'],
    ['3', 'That is TLS 1.2: TCP (1) plus a two-round-trip TLS handshake (2) before the request. TLS 1.3 cut the handshake to one.'],
  ]),
  step('Same cold connection, but over HTTP/3 (QUIC). How many round trips before the request leaves?', [], 0, [
    ['1', 'Right. QUIC merges the transport and TLS 1.3 handshakes into one round trip, so the request leaves after 1 RTT and the first byte arrives after about 2.'],
    ['0', 'Zero round trips needs 0-RTT resumption, which needs an earlier connection to the same server. This is a first visit.'],
    ['2', 'That is TCP + TLS 1.3. QUIC exists precisely to fold those two handshakes into one.'],
  ]),
  step('A returning client resumes with 0-RTT and puts POST /payments in the early data. Should the server process it immediately?', [], 2, [
    ['Yes — 0-RTT is just a faster handshake', 'Early data has a weaker guarantee: an attacker who captured it can replay it, and TLS 1.3 gives early data no inherent replay protection.'],
    ['Yes, because the payload is encrypted', 'Encrypted is not the same as unrepeatable. A replayed copy decrypts perfectly well.'],
    ['No — early data can be replayed, so accept only safe, idempotent requests in it and make the client retry the rest after the handshake', 'Right. Servers typically allow 0-RTT only for idempotent requests (HTTP even has 425 Too Early for this). A payment needs the full handshake and an idempotency key.'],
  ]),
];

// Chapters 4 and 5 · transports and HTTP versions
export const transport = [
  step('A video call drops one packet carrying 20 ms of audio. Over TCP, what happens to the audio packets that arrive after it?', [
    row('Packets', ['#41', '#42', '#43', '#44', '#45'], { 1: 'LOST' }, { tones: { 0: 'done', 1: 'out', 2: 'ghost', 3: 'ghost', 4: 'ghost' } }),
  ], 1, [
    ['They play immediately; TCP skips the gap', 'TCP never skips. It promises an in-order byte stream, so it cannot hand #43 to the app before #42.'],
    ['They wait in the receive buffer until #42 is retransmitted — head-of-line blocking', 'Right. One lost packet freezes everything behind it for at least a round trip. For live media, late is as bad as lost, which is why calls run over UDP and simply conceal the gap.'],
    ['TCP drops them too', 'TCP keeps them; it just will not deliver them out of order.'],
  ]),
  step('A page loads 80 small files over HTTP/2 on one connection, on a train with 2% packet loss. What is HTTP/2’s remaining weakness here?', [], 2, [
    ['It can only send one request at a time', 'That was HTTP/1.1. HTTP/2 multiplexes many streams on one connection.'],
    ['Headers are sent uncompressed', 'HTTP/2 compresses headers with HPACK.'],
    ['Every stream shares one TCP byte stream, so one lost packet stalls all 80 streams until it is retransmitted', 'Right. HTTP/2 removed head-of-line blocking at the HTTP layer but not at TCP. HTTP/3 over QUIC gives each stream independent delivery.'],
  ]),
  step('Which change does HTTP/3 make that HTTP/2 could not?', [], 0, [
    ['It runs over QUIC on UDP, so loss on one stream does not block the others, and a connection can survive a change of IP address', 'Right. QUIC moves streams, loss recovery and TLS 1.3 into one transport, identifies connections by ID rather than by IP and port, and saves a handshake round trip.'],
    ['It adds multiplexing', 'HTTP/2 already multiplexed. HTTP/3 makes multiplexing robust to packet loss.'],
    ['It removes encryption to save time', 'The opposite: QUIC always encrypts; TLS 1.3 is built in.'],
  ]),
];

// Chapter 6 · API styles
export const apiStyles = [
  step('Two internal microservices exchange thousands of small calls per second. REST/JSON or gRPC?', [], 1, [
    ['REST — it is the standard', 'Standard at the public edge. Inside, you control both ends, so you can take the faster, typed option.'],
    ['gRPC — compact protobuf, HTTP/2 multiplexing over a few connections, deadlines, and generated clients that catch schema drift at compile time', 'Right. Internal, high-volume and typed is gRPC’s home turf. Mention the one catch: it needs request-aware load balancing.'],
    ['GraphQL — fewer round trips', 'GraphQL helps clients that need flexible nested reads. Two services calling each other with known shapes gain nothing from it.'],
    ['Either — no real difference', 'A free chance to show judgment, thrown away.'],
  ]),
  step('A mobile home screen needs the user, the 20 latest posts in their feed, and each post’s author. The REST API takes 22 requests over a 200 ms mobile link. What does GraphQL fix, and what does it cost?', [], 0, [
    ['One request shaped by the client (no under- or over-fetching); costs: harder HTTP caching, N+1 resolver queries to batch, and query-cost limits', 'Right. GraphQL moves the joining to the server. The server now needs batching (DataLoader-style) and limits so one query cannot ask for the world.'],
    ['It makes the database faster', 'The database work is the same or more. GraphQL saves network round trips, not query cost.'],
    ['Nothing REST cannot do with HTTP/2', 'HTTP/2 runs the 22 requests in parallel, which helps, but the client still cannot ask for the authors until the feed arrives. That chain of dependent round trips is the real cost.'],
  ]),
  step('A browser app wants to call your gRPC service directly. What is the problem?', [], 1, [
    ['Browsers cannot send binary data', 'Browsers send binary data fine. The issue is lower-level control of HTTP/2.'],
    ['Browser APIs do not expose the HTTP/2 framing and trailers gRPC needs, so you use gRPC-Web through a proxy (no client or bidirectional streaming) or a REST/JSON edge', 'Right. That is why the usual shape is REST (or gRPC-Web) at the edge and native gRPC between services.'],
    ['gRPC does not work over TLS', 'gRPC runs over TLS all the time.'],
  ]),
];

// Chapter 7 · real-time transports
export const realtime = [
  step('A food order’s status changes about four times in 30 minutes. A customer watches the status page. Which transport?', [], 0, [
    ['Short polling every 10–15 seconds', 'Right. Updates are rare, a few seconds of delay is fine, and plain HTTP works everywhere and scales on your stateless fleet. Saying “polling is enough” is a sign of judgment.'],
    ['WebSockets', 'Works, but buys a stateful connection fleet to deliver four messages. Box inflation.'],
    ['UDP push to the phone', 'Phones sit behind NAT; you cannot push unsolicited packets to them, and you would rebuild reliability yourself.'],
  ]),
  step('Live match scores go to 5 million viewers; viewers never send anything back. Which transport?', [], 1, [
    ['WebSockets — real-time means WebSockets', 'It works but pays for a two-way channel nobody uses.'],
    ['Server-Sent Events', 'Right. One-way server push over plain HTTP, with automatic reconnect and Last-Event-ID resume built into the browser’s EventSource.'],
    ['Polling every 500 ms', '5,000,000 ÷ 0.5 s = 10,000,000 requests per second, nearly all of them empty.'],
  ]),
  step('A chat app needs typing indicators and messages flowing both ways with low latency. Which transport, and what does it bring with it?', [], 2, [
    ['Long polling — it is close enough to real time', 'Every client message would be a separate request, and every server message ends a request. For constant two-way traffic, the overhead adds up.'],
    ['SSE plus nothing else', 'SSE is server-to-client only. The client still needs a way to send at high frequency.'],
    ['WebSockets — and the stateful-server problem: a registry or pub/sub to find which server holds each user', 'Right. Full-duplex is the reason to pay for WebSockets. The connection pins the user to one server, so routing messages becomes a design problem.'],
  ]),
];

// Chapter 9 · L4, L7 and gateways
export const balancing = [
  step('Kestrel’s gRPC clients sit behind an L4 load balancer. Ten backends exist, but one runs at 90% CPU and the rest are idle. Why?', [], 1, [
    ['gRPC is single-threaded', 'gRPC servers are concurrent. The imbalance comes from how the load balancer counts.'],
    ['L4 balances connections, and each gRPC client multiplexes all its calls over one long-lived HTTP/2 connection', 'Right. One connection lands on one backend and stays there. Balance per request with an L7 proxy that understands HTTP/2, or use client-side load balancing.'],
    ['The health checks are wrong', 'All ten backends are healthy. The balancer simply never moves an open connection.'],
  ]),
  step('You need /video/* to go to the media service and /api/* to the API fleet. Which box can do it?', [], 0, [
    ['An L7 load balancer or gateway', 'Right. Only a proxy that reads HTTP can see the path. That usually means it terminates TLS too.'],
    ['An L4 load balancer', 'An L4 balancer sees IPs and ports. The path is inside the HTTP request, which (with TLS) it cannot even read.'],
    ['DNS', 'DNS resolves hostnames, never paths. Different hostnames, yes; different paths, no.'],
  ]),
  step('Why must the app servers behind the load balancer be stateless?', [], 1, [
    ['Stateless code has fewer bugs', 'Not the reason. The reason is what the load balancer is allowed to do.'],
    ['So any server can serve any request — enabling horizontal scaling, rolling deploys, and instant failover; state lives in tokens or shared stores', 'Right. The whole scaling model rests on it. The moment a server holds unique state (a WebSocket connection, an upload in progress), routing to the right server becomes a design problem you must address.'],
    ['Because HTTP is a stateless protocol', 'HTTP being stateless does not stop a server from keeping session data in memory. The rule is about your servers, not the protocol.'],
    ['To reduce memory usage', 'Memory is not the point. Interchangeable servers are.'],
  ]),
];

// Chapter 12 · timeouts, retries, idempotency
export const retries = [
  step('The phone sends POST /payments. After 10 seconds, the request times out with no response. What does the client know?', [], 2, [
    ['The payment failed', 'A timeout says nothing about the server. The request may have succeeded and only the response was lost.'],
    ['The payment succeeded', 'Also unknown. The request may never have arrived.'],
    ['Nothing — it may or may not have happened, so a retry is safe only if the server can recognise it as a repeat', 'Right. That ambiguity is the whole reason idempotency keys exist.'],
  ]),
  step('A request travels app → gateway → orders → inventory. The app, the gateway and orders each make up to 3 attempts (1 try + 2 retries) on the hop below. Inventory is down. How many calls can reach inventory from one tap?', [
    row('Hop', ['app', 'gateway', 'orders', 'inventory'], {}, { join: '→' }),
    row('Calls received', ['1 tap', '3', '9', '?'], { 3: 'DOWN' }, { tones: { 3: 'hot' } }),
  ], 1, [
    ['3', 'That is only the app’s own attempts. Each retrying layer multiplies the one beneath it: the gateway tries orders 3 times per app attempt, and orders tries inventory 3 times per call it receives.'],
    ['27', 'Right. 3 × 3 × 3 = 27 calls to inventory from one tap, and every user does the same at once. Retry at one layer, use a retry budget, and back off with jitter.'],
    ['9', 'That counts calls into orders. Inventory sits one layer deeper, so multiply once more.'],
  ]),
  step('Which failure should a client retry automatically?', [], 0, [
    ['A connection refused, a 503, or a 429 with Retry-After — with exponential backoff and jitter', 'Right. These are transient: the next attempt can differ because time has passed. Respect Retry-After when the server sends it.'],
    ['A 400 Bad Request', 'The same malformed request gets the same 400. A retry must have a chance of a different outcome.'],
    ['Any error, immediately, until it works', 'Immediate unlimited retries turn a struggling service into a dead one — a retry storm.'],
  ]),
];

// Decision drills · mixed review across the lesson
export const drills = [
  step('Interviewer: “The first request from a new user in Sydney to your Virginia servers feels slow, but later ones are fine.” What is the likely cause?', [], 1, [
    ['The database is cold', 'Possible, but “first request slow, later ones fast” from far away points at connection setup.'],
    ['Connection setup: a DNS lookup, then TCP and TLS each cost a full ~200 ms round trip to Virginia before the request can even leave; later requests reuse the connection', 'Right. Fixes: terminate TLS at a nearby edge, keep connections alive, use HTTP/3 to save a round trip, and resume sessions.'],
    ['TCP is slower than UDP', 'True in a narrow sense, but it does not explain why only the first request is slow.'],
  ]),
  step('Which promise does TCP make that UDP does not?', [], 2, [
    ['Lower latency', 'The reverse. TCP pays latency for its promises: handshakes, retransmissions, head-of-line blocking.'],
    ['Encryption', 'Neither encrypts. TLS (or QUIC) adds encryption.'],
    ['Reliable, in-order delivery of a byte stream, with flow and congestion control', 'Right. UDP sends independent datagrams that may arrive late, twice, out of order, or not at all.'],
  ]),
  step('An LLM chat UI streams tokens from server to browser as they are generated. The browser sends the prompt once. Simplest good transport?', [], 0, [
    ['Server-Sent Events (or a streamed HTTP response)', 'Right. One request up, a stream of events down — exactly what SSE is for.'],
    ['WebSockets', 'It would work, but the client sends once; a two-way channel adds a stateful connection fleet for no gain.'],
    ['Short polling every 100 ms', 'Ten requests a second per user, most of them empty, and tokens still arrive in lumps.'],
  ]),
  step('Your design has a public API, a web front end, and twelve internal services. Which API styles?', [], 1, [
    ['gRPC everywhere', 'Browsers cannot call native gRPC, and public API consumers expect plain HTTP.'],
    ['REST at the public edge, gRPC between internal services', 'Right. The default answer: REST is universal and cacheable at the edge; gRPC is fast and typed inside. GraphQL only when clients genuinely need flexible nested reads.'],
    ['GraphQL everywhere', 'GraphQL between services adds a query language where fixed contracts serve better.'],
  ]),
  step('A reverse proxy differs from a forward proxy because…', [], 2, [
    ['…it is faster', 'Speed is not the difference. Who it represents is.'],
    ['…it only works for HTTPS', 'Both kinds can carry many protocols.'],
    ['…it acts for the servers — clients think it is the server — while a forward proxy acts for clients and the server sees the proxy', 'Right. Load balancers, gateways and CDN edges are all reverse proxies.'],
  ]),
  step('A client retries POST /orders after a timeout and the user is charged twice. What should the design have had?', [], 1, [
    ['A longer timeout', 'Any timeout can still fire after the server committed. Longer only makes the user wait more.'],
    ['An idempotency key generated once per order by the client, stored by the server with the result, so a repeat returns the first result', 'Right. At-least-once delivery plus idempotent processing gives an effectively-once result.'],
    ['No retries ever', 'Then every lost response becomes a failed order the user must redo by hand — and they will, creating the same duplicate.'],
  ]),
  step('Each of 100 app servers handles 200 queries/s to Postgres at 10 ms each. Roughly how many connections does each server’s pool keep busy?', [], 0, [
    ['About 2 — 200/s × 0.01 s; size the pool with headroom, then check the database total', 'Right. Little’s law: busy connections = rate × time. 100 servers × a pool of, say, 10 is 1,000 connections, which Postgres handles poorly; a pooler such as PgBouncer sits in between.'],
    ['200 — one per query', 'Queries finish in 10 ms and give the connection back. Concurrency is rate × duration, not rate.'],
    ['20', 'That would be 200/s × 0.1 s. The query takes 10 ms, not 100 ms.'],
  ]),
];
