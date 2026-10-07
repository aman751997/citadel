import { row, step } from '../../lib/trace.ts';

// Chapter 1 · capacity, utilisation, zones
export const capacity = [
  step('Kestrel Drops peak at 50,000 requests per second. A load test shows one app server saturates at 1,000 requests per second, and you plan to run servers at 70% utilisation. How many servers?', [], 1, [
    ['50', 'That is 1,000 per server — 100% utilisation. Queues grow without limit at saturation, so latency explodes at exactly the moment the drop goes live.'],
    ['72', 'Right. 50,000 ÷ (1,000 × 0.7) = 71.4, and you round up. Each server then runs at about 694 requests per second.'],
    ['35', 'You multiplied by 0.7 instead of dividing. Targeting 70% means each server takes only 700 requests per second, so you need more servers than 50, not fewer.'],
  ]),
  step('The 72 servers sit evenly in three zones, 24 each. One zone goes dark at peak. What happens?', [], 2, [
    ['Nothing — 70% leaves 30% headroom', 'At 70%, a server can absorb load growth up to 1 ÷ 0.7 ≈ 1.43× before saturating. Losing a third of the fleet multiplies its load by 72 ÷ 48 = 1.5×.'],
    ['Autoscaling replaces the zone before anyone notices', 'New servers take minutes to boot and warm up. The surge arrives in the same second the zone dies.'],
    ['The 48 survivors each need about 1,042 requests per second — past saturation', 'Right. 50,000 ÷ 48 ≈ 1,042, above the 1,000 a server can do. A 70% target does not, by itself, survive a zone loss; you must size for it.'],
  ]),
  step('You want to survive losing any one zone with the survivors at or below 90%. How many servers in total, spread across three zones?', [], 1, [
    ['72', 'That is the no-failure answer. After a zone loss the survivors run at 104%.'],
    ['84 — 28 per zone', 'Right. Two zones must carry 50,000 at 900 each: 50,000 ÷ 900 = 55.6, so 56 servers, 28 per zone, 84 in all. Normal running is 50,000 ÷ 84,000 ≈ 60% — failure planning, not taste, sets your everyday utilisation.'],
    ['56', 'Fifty-six is what the two surviving zones need. You need three zones of 28 so that any two of them remain.'],
    ['108', 'That keeps survivors at 70% (50,000 ÷ 72 ≈ 694 each). Safe, but 24 more servers than a 90% survivor target asks for.'],
  ]),
];

// Chapter 2 · what L4 and L7 can see and do
export const layers = [
  step('One hostname, HTTPS only. /listings/* must go to the listings service and /chat/* to the chat service. Which balancer can do it?', [], 1, [
    ['An L4 balancer passing TLS through', 'It forwards encrypted bytes. The path is inside the encrypted HTTP request; it cannot read it.'],
    ['An L7 balancer that terminates TLS', 'Right. It decrypts, parses the request, and routes by path. That is the default box at the edge of most designs.'],
    ['An L4 balancer routing on SNI', 'SNI (the hostname in the TLS ClientHello) is readable without decrypting, so it can split by hostname. Here both paths share one hostname, so SNI cannot tell them apart.'],
  ]),
  step('A compliance rule says traffic must be encrypted on every network hop, all the way to the app servers. You still want path routing. Which TLS mode?', [], 2, [
    ['TLS passthrough', 'Encrypted end to end, yes, but the balancer is blind: no path routing, no header-based anything.'],
    ['Terminate at the balancer, plain HTTP behind it', 'This breaks the rule: the hop from the balancer to the app servers is unencrypted.'],
    ['Terminate, route, then re-encrypt to the backends', 'Right. The balancer reads the request, then opens a new TLS (often mutual TLS) connection to the chosen backend. You pay a second handshake per backend connection, which pooling amortises.'],
  ]),
  step('Clients send small requests and download large clips. Your L4 balancers spend their capacity forwarding response bytes. Which L4 mode helps most?', [], 0, [
    ['Direct server return: replies go from the backend straight to the client', 'Right. The balancer handles only the inbound direction, which is usually the small one. The backend answers from the shared virtual IP, so it needs that address configured locally (and the network set up for it).'],
    ['Switch to an L7 balancer', 'An L7 proxy terminates both connections and copies every response byte through itself. More work per byte, not less.'],
    ['Turn on sticky sessions', 'Stickiness changes which backend gets a client, not how many bytes cross the balancer.'],
  ]),
];

// Chapter 3 · connection vs request balancing, the gRPC trap, connection counts
export const connections = [
  step('Ten gRPC clients, ten pods behind an L4 balancer that picks a pod at random per connection. Each client opens one HTTP/2 connection and sends 1,000 calls per second. What does each pod see?', [], 1, [
    ['Exactly 1,000 calls per second each', 'Only if all ten connections land on different pods. With random choice the chance is 10! ÷ 10¹⁰ ≈ 0.04%.'],
    ['Whole clients: some pods get 2,000 or 3,000 calls per second, some get none — and it never changes', 'Right. The balancer decided once per connection, and the connection lives for hours. Every call on it goes to the same pod.'],
    ['The balancer moves calls when a pod gets busy', 'An L4 balancer never sees the calls. It sees one TCP connection per client.'],
  ]),
  step('Traffic doubles, so you scale from 10 to 20 pods. How much traffic reaches the 10 new pods?', [], 0, [
    ['Almost none, until clients open new connections', 'Right. Existing connections stay pinned to the old pods. Only fresh connections — after a client restart or reconnect — can land on the new ones. The autoscaler added capacity nobody can reach.'],
    ['Half of it, immediately', 'That is what a request-level balancer would do. A connection-level one leaves open connections where they are.'],
    ['The old pods shed connections automatically when they get hot', 'Nothing in plain L4 balancing does this. You can make servers do it on purpose (a maximum connection age), which is one of the fixes.'],
  ]),
  step('Which fix spreads individual gRPC calls across all 20 pods without changing client code?', [], 1, [
    ['Add even more pods', 'More pods do not move pinned connections. The new ones would sit idle too.'],
    ['Put an HTTP/2-aware L7 proxy (or a mesh sidecar) in the path to balance each call', 'Right. The proxy holds connections to every pod and picks a pod per call. A server-side maximum connection age (the server sends GOAWAY, the client reconnects) is a cheaper partial fix that rebalances every few minutes.'],
    ['Turn on sticky sessions', 'Stickiness is the problem here, not the cure.'],
  ]),
  step('An L7 proxy opens a brand-new connection to one backend for every request — 1,000 per second — and closes each one itself. Linux keeps a closed port in TIME_WAIT for 60 seconds, and the default ephemeral range has 28,232 ports. What happens?', [], 2, [
    ['Nothing: 1,000 is far below 28,232', 'Ports are not freed when a connection closes. Each one sits in TIME_WAIT for 60 seconds, so at steady state you need 1,000 × 60 = 60,000.'],
    ['The backend runs out of memory', 'The backend is fine. The proxy runs out of source ports for that one backend address.'],
    ['After about 28 seconds the proxy runs out of ports to that backend and new connections fail', 'Right. 28,232 ÷ 1,000 ≈ 28 seconds. The limit is per source IP and destination IP and port, so the real fix is keep-alive connection pools — and more source IPs or backends raise the ceiling.'],
  ]),
];

// Chapter 4 · round robin, weighted, random
export const rotation = [
  step('Servers A, B and C have weights 5, 1 and 1. Smooth weighted round robin (the method nginx uses) serves the first seven requests in what order?', [
    row('Weights', ['A: 5', 'B: 1', 'C: 1']),
  ], 1, [
    ['A A A A A B C', 'The counts are right, but A takes five in a row. That burst is exactly what the smooth variant avoids.'],
    ['A A B A C A A', 'Right. Each turn, every server adds its weight to a running score; the highest score wins and pays back the total weight (7). A’s five turns are spread out between B and C.'],
    ['A B C A B C A', 'That is plain round robin. It ignores the weights: A gets 3 of 7 instead of 5 of 7.'],
  ]),
  step('Every request is a 20 ms read, and every server is identical. Which algorithm?', [], 0, [
    ['Round robin (or random)', 'Right. When requests cost the same and servers are the same, taking turns is even, cheap, and needs no feedback. Use the simple tool when the world is simple.'],
    ['Least response time with an EWMA', 'It works, but it is machinery to solve a problem you do not have, and it brings its own failure modes.'],
    ['Consistent hashing on user id', 'Hashing is for affinity. Without per-key state on the servers it only adds hot spots.'],
  ]),
  step('Most requests are 10 ms lookups, but a few are 10-second report exports. Round robin keeps queueing lookups behind exports on the same server. What fits better?', [], 2, [
    ['Weighted round robin', 'Weights describe servers, not requests. The exports still land on servers in turn.'],
    ['Random', 'Random is round robin with noise. It does not know which servers are stuck on exports.'],
    ['Least connections (least outstanding requests)', 'Right. A server busy with a long export holds an open request, so new work flows to servers with fewer in flight. When request costs vary wildly, balance on current load, not turns.'],
  ]),
];

// Chapter 5 · least connections, least response time, EWMA, herding
export const leastLoaded = [
  step('Least connections. Where does the next request go?', [
    row('Active', [12, 3, 7], { 0: 'A', 1: 'B', 2: 'C' }),
  ], 1, [
    ['A', 'A has the most requests in flight — 12. It is the last choice.'],
    ['B', 'Right. B has 3 in flight, the fewest. After this request it has 4.'],
    ['C', 'C has 7; B has fewer.'],
  ]),
  step('An EWMA latency estimate uses α = 0.2. The estimate is 20 ms and a new response took 100 ms. What is the new estimate?', [], 2, [
    ['100 ms', 'That is the new sample alone. An EWMA blends it with history.'],
    ['60 ms', 'That is a plain average of the two (α = 0.5).'],
    ['36 ms', 'Right. 0.2 × 100 + 0.8 × 20 = 20 + 16 = 36. "Peak" EWMA variants jump straight to a high sample and decay slowly, so one slow server is noticed at once.'],
  ]),
  step('Server D’s disk fills up and it starts answering every request with a 500 in 1 ms. Under least-response-time balancing, what happens to D’s traffic?', [], 0, [
    ['It rises: D looks like the fastest, least busy server', 'Right. Errors are fast. A balancer that only watches latency or open connections pours traffic into the server that fails quickest. Count errors as a penalty and eject outliers (Chapter 10).'],
    ['It falls, because the balancer sees the errors', 'Only if the algorithm counts errors. Pure latency and pure connection counts do not.'],
    ['It stays the same', 'D finishes requests faster than anyone, so it holds fewer and its average latency drops. Both signals pull more traffic toward it.'],
  ]),
  step('Twenty balancer instances each send to the least-loaded server, using a load table refreshed once a second. What goes wrong?', [], 1, [
    ['Nothing — they all agree, which is good', 'Agreement is the problem. They all agree on the same server.'],
    ['For a whole second, all twenty send every request to the one server that looked emptiest', 'Right. Stale information plus a deterministic "pick the minimum" makes a herd. The next second, they all stampede somewhere else. Randomness breaks the herd (next chapter).'],
    ['The load table overloads the network', 'A small table once a second is cheap. The damage comes from how it is used.'],
  ]),
];

// Chapter 6 · the power of two random choices
export const twoChoices = [
  step('1,000 requests are placed on 1,000 servers. With one random choice, the busiest server usually ends up with about 5. With two choices — pick two at random, send to the less loaded — what does the busiest usually end up with?', [], 1, [
    ['About 5 — two choices cannot change much', 'The improvement is large. In 300 simulated runs, two choices gave a maximum of 3 every time; one choice ranged from 4 to 9.'],
    ['About 3', 'Right. Theory says the maximum drops from about log n ÷ log log n to about log log n ÷ log 2 — an exponential improvement — from one extra random probe.'],
    ['Exactly 1', 'That would need perfect global knowledge (true least-loaded, with fresh data). Two choices gets most of the benefit with almost none of the knowledge.'],
  ]),
  step('In a 72-server fleet, S7 looks emptiest to all twenty balancers because their data is stale. With two random choices, roughly what share of new requests goes to S7 until the data refreshes?', [], 1, [
    ['100% — it looks emptiest', 'Only with "pick the global minimum". With two choices, S7 wins only when it is one of the two sampled.'],
    ['About 2.8% — about twice its fair share', 'Right. S7 is in a random pair with probability about 2 ÷ 72 ≈ 2.8%, versus a fair share of 1 ÷ 72 ≈ 1.4%. Stale data now costs a mild bias instead of a stampede.'],
    ['About 1.4% — exactly its fair share', 'Slightly more: whenever S7 is sampled, it wins, because it looks emptier than the other server.'],
  ]),
  step('Would three random choices be much better than two?', [], 2, [
    ['Yes — each extra choice halves the maximum load', 'The returns diminish fast. In simulation at n = 1,000, three choices gave a maximum of 2 or 3, versus a steady 3 for two choices.'],
    ['No — three is worse than two', 'Three is slightly better on balance. It also herds a little more under stale data, because the emptiest-looking server is sampled more often.'],
    ['A little; the dramatic jump is from one choice to two', 'Right. That is why "power of two choices" is the name, and why Envoy’s least-request balancer samples two by default and nginx offers random two least_conn.'],
  ]),
];

// Chapter 7 · hashing for affinity
export const affinity = [
  step('Each listings server keeps a local in-memory cache of the listings it has served. You want each listing’s requests to keep landing on the same server. Which algorithm?', [], 2, [
    ['Round robin', 'Every server ends up caching every listing. Each cache holds a slice of the hot set and hit ratios fall.'],
    ['IP hash', 'That groups requests by client, not by listing. Two users viewing the same listing land on different servers.'],
    ['Consistent hashing on the listing id', 'Right. Same key, same server, so each listing lives in one cache. When servers come and go, only about 1/N of the keys move.'],
  ]),
  step('You route with hash(key) mod N and grow from 10 servers to 11. What fraction of keys now map to a different server?', [], 1, [
    ['About 1/11 (9%)', 'That is what consistent hashing gives. Modulo is much worse.'],
    ['About 10/11 (91%)', 'Right. A key stays put only if hash mod 10 equals hash mod 11, which is true for 10 of every 110 hash values. Every local cache goes cold at once — the reason consistent hashing exists.'],
    ['None — existing keys keep their servers', 'Modulo has no memory. Change N and almost every key’s answer changes.'],
  ]),
  step('Bounded-load consistent hashing with c = 1.25. There are 10 servers and 1,000 requests in flight, so the average is 100. A hot listing’s requests all hash to server S3. What happens?', [], 0, [
    ['S3 accepts up to 125; extra requests walk clockwise to the next server with room', 'Right. Capacity per server is ⌈1.25 × 100⌉ = 125. Most keys still go home, the hot key overflows to neighbours, and no server exceeds 125% of the average.'],
    ['The hot listing is rejected with 503 above 125', 'Bounded loads relocate overflow; they do not shed it.'],
    ['Every request for the hot listing is spread randomly', 'Only the overflow moves, and it moves to a predictable next server, so the neighbours’ caches warm up for that key.'],
  ]),
  step('You use IP hash for stickiness. A mobile carrier’s NAT puts 40,000 phones behind one public address. What happens?', [], 2, [
    ['They spread evenly — each phone has its own port', 'IP hash uses the address only. Same address, same hash, same server.'],
    ['The balancer detects the NAT and rebalances', 'It cannot tell 40,000 phones from one very busy client.'],
    ['All 40,000 land on one server', 'Right. Source-IP affinity concentrates whole carriers, offices and VPNs on single servers. Hash on something that identifies the user or the object — a cookie, a user id, a listing id.'],
  ]),
];

// Chapter 8 · sticky sessions vs stateless services
export const sticky = [
  step('Checkout keeps each cart in server memory, and the balancer pins each user with a sticky cookie. A deploy restarts server 3. What do its users see?', [], 1, [
    ['Nothing — the cookie sends them back to server 3 when it returns', 'Server 3 returns empty. The memory that held the carts is gone.'],
    ['Empty carts (or a forced re-login) — the state died with the process', 'Right. Stickiness ties a user’s state to one machine’s lifetime. Move the cart to a shared store (Redis, the database) or the client, and any server can serve any request.'],
    ['Their carts move to server 4', 'Nothing copies memory between servers. The balancer only moves the user.'],
  ]),
  step('When is stickiness a reasonable choice?', [], 0, [
    ['When servers hold rebuildable per-user state — a warm cache, a live connection — whose loss costs speed, not correctness', 'Right. Affinity as an optimisation is fine. Affinity as the only copy of user data is a bug waiting for a deploy.'],
    ['To make login sessions work', 'Use a signed token or a shared session store. Then any server can check the session.'],
    ['To spread load more evenly', 'Stickiness makes load less even: heavy users stay on whatever server they first hit, however busy it gets.'],
  ]),
  step('Stickiness by source IP versus by cookie. A user walks out of the office and their phone switches from Wi-Fi to cellular. Which breaks?', [], 1, [
    ['Cookie stickiness', 'The cookie travels with the browser or app, whatever network it is on.'],
    ['Source-IP stickiness', 'Right. The new network means a new address and a new hash, so the user lands on another server mid-session.'],
    ['Both', 'The cookie survives a network change; the IP does not.'],
  ]),
];

// Chapter 9 · health checks
export const health = [
  step('Deep health checks (each server verifies its database connection) caused a full outage during a 5-second database blip. Why?', [], 1, [
    ['The database blip was actually a full outage', 'The database recovered in five seconds. The site did not.'],
    ['All servers failed their checks at once, so the balancer removed every server — a partial problem became total unavailability', 'Right. Dependency-aware checks make every server’s health track the dependency, so they all fail together. Shallow checks decide routing; deep checks feed alerts.'],
    ['Health checks overloaded the database', 'Possible at very high check rates, but the outage came from what the checks reported, not their load.'],
    ['The balancer should have used round robin', 'The algorithm only chooses among healthy servers. With none healthy, no algorithm helps.'],
  ]),
  step('In Kubernetes, your liveness probe queries the database. The database is slow for 30 seconds. What happens?', [], 2, [
    ['Pods stop receiving traffic until the database recovers', 'That is what a failing readiness probe does. Liveness is harsher.'],
    ['Nothing — probes ignore timeouts', 'Probes have timeouts; a slow database makes the probe fail.'],
    ['The kubelet restarts every pod — a restart storm of cold processes, right when the database is struggling', 'Right. Liveness failure means "restart me". It should only check that the process itself is not wedged. Readiness ("send me traffic?") may consider dependencies, carefully.'],
  ]),
  step('Active checks every 5 seconds; a server is marked down after 3 consecutive failures. One of 72 servers dies at peak (50,000 requests per second). Roughly how many requests reach it before it is ejected?', [], 1, [
    ['About 700', 'That is one second of its share (50,000 ÷ 72 ≈ 694). Detection takes three failed probes.'],
    ['About 10,000', 'Right. About 694 per second × 15 seconds ≈ 10,400. Passive checks (watching real responses) and retrying idempotent requests on another server close most of that gap.'],
    ['About 50,000', 'The dead server only ever gets its 1/72 share.'],
  ]),
  step('A server under GC pressure passes, fails, passes, fails. The balancer adds and removes it every few seconds. What dampens the flapping?', [], 0, [
    ['Hysteresis: several consecutive failures to mark down, several consecutive passes to mark up', 'Right. Requiring, say, 3 failures to eject and 5 passes to return means a server must be steadily sick to leave and steadily well to come back. Slow start then eases it back in.'],
    ['Check more often', 'A faster check flaps faster.'],
    ['Remove health checks for that server', 'Then a dead server keeps its share of traffic.'],
  ]),
];

// Chapter 10 · outlier ejection and failing open
export const outliers = [
  step('Every active health check is green, but one of 72 servers returns 5% errors on real requests (a bad disk under one path). What catches it?', [], 2, [
    ['Make the health check deeper', 'The check path may not touch the broken disk, and deeper checks risk the correlated failure from Chapter 9.'],
    ['Nothing can; 5% is noise', '5% from one server against 0.1% from its peers is a clear outlier.'],
    ['Passive outlier detection: watch real responses and eject a server whose error rate stands out', 'Right. The balancer already sees every response. Eject after, say, five consecutive 5xx or an error rate well above the fleet’s, for a timeout that grows each time it re-offends.'],
  ]),
  step('A bad config push makes every server return 500s. Outlier detection has no cap. What does it do?', [], 1, [
    ['Ejects only the worst one', 'With no cap, every server qualifies.'],
    ['Ejects the whole fleet, turning "everything errors" into "nothing answers"', 'Right. That is why ejection is capped (a maximum ejection percentage) and why balancers have a panic threshold: below, say, 50% healthy, ignore health and spread across everyone. Failing open serves something; failing closed serves nothing.'],
    ['Restarts the servers', 'Balancers route; they do not restart processes.'],
  ]),
];

// Chapter 11 · deploys: draining, slow start
export const deploys = [
  step('During a rolling deploy, the balancer deregisters server 3 and the process is killed in the same second. What do users see?', [], 0, [
    ['A burst of 502s and reset connections — the requests in flight on server 3 die', 'Right. That is the prologue’s mystery minute. Draining fixes it: stop sending new requests, let in-flight ones finish (with a deadline), then stop the process.'],
    ['Nothing — the balancer retries everything', 'A balancer can retry a request that never reached the server, or an idempotent one. A half-finished POST is not safely retryable.'],
    ['Slower responses', 'The requests do not slow down. They fail.'],
  ]),
  step('Kubernetes removes a terminating pod from the endpoints and sends SIGTERM at about the same time, but proxies across the cluster learn about the removal a moment later. What is the usual fix?', [], 2, [
    ['Exit immediately on SIGTERM', 'Proxies that have not heard yet keep sending requests to a process that is gone.'],
    ['Raise the grace period to an hour', 'The grace period only caps how long shutdown may take. It does not stop the process exiting early.'],
    ['A short preStop sleep, then stop accepting, finish in-flight work, and exit within the grace period', 'Right. The pause lets every proxy drop the pod first; then the app drains. Keep the whole sequence shorter than the termination grace period (30 seconds by default).'],
  ]),
  step('A new Java server joins a least-connections pool with zero open connections. What happens without slow start?', [], 1, [
    ['It gets its fair share gradually', 'Least connections sees zero in flight and sends it everything it can, all at once.'],
    ['It is flooded while its JIT, caches and connection pools are cold — it slows, may fail its checks, and can flap', 'Right. Slow start ramps a new server’s weight from a small fraction to full over a set window (say 60 seconds), so it warms before it carries a full share.'],
    ['It is ignored until its first health check', 'It is ignored until it passes its first health checks — then it is flooded.'],
  ]),
];

// Chapter 12 · the balancer's own availability
export const lbHa = [
  step('Two HAProxy boxes share a virtual IP using keepalived (VRRP). The master advertises once a second. Its power supply fails. What happens?', [], 1, [
    ['Clients reconnect to the backup’s own IP address', 'Clients only know the virtual IP. The point is that the address moves, not the clients.'],
    ['After about three missed advertisements the backup claims the virtual IP and announces it on the network; connections open on the master are lost', 'Right. The backup waits about 3 seconds (three advertisement intervals plus a small skew), takes the address, and sends gratuitous ARP so switches update. Connection state dies with the master unless it was synced.'],
    ['DNS switches to the backup', 'No DNS change is involved. Both boxes answer for the same address; only the current master holds it.'],
  ]),
  step('The link carrying VRRP advertisements fails, but both boxes stay healthy. What is the danger?', [], 2, [
    ['None — the backup stays passive', 'The backup cannot tell a dead master from a silent link. It sees missing advertisements and promotes itself.'],
    ['The virtual IP disappears', 'The opposite: too many owners, not none.'],
    ['Split brain: both claim the virtual IP, and traffic flaps between them', 'Right. Use redundant links for advertisements, and health scripts or a tiebreaker so a box that cannot see the network gives up the address.'],
  ]),
  step('Active-active: routers spread flows across four L4 balancer instances by hashing each packet’s 5-tuple (ECMP). One instance dies, and some flows now arrive at a different instance. Why must every instance pick backends with the same consistent hash?', [], 0, [
    ['So a flow that moves to another instance still reaches the same backend, and the connection survives', 'Right. If every instance maps the same 5-tuple to the same backend, losing a balancer instance does not reset the connections that moved. Maglev-style designs combine this with connection tracking.'],
    ['To spread load evenly between instances', 'ECMP already spreads flows across instances. Consistent hashing is about agreeing on backends.'],
    ['To make health checks faster', 'Health checking is separate. This is about connection continuity.'],
  ]),
];

// Chapter 13 · global load balancing
export const global = [
  step('Kestrel serves 60,000 requests per second from three regions, 20,000 each. One region fails. What must each surviving region be able to carry?', [], 2, [
    ['20,000 — the same as before', 'The failed region’s users do not vanish. They arrive at the survivors.'],
    ['40,000', 'That would be one survivor taking all of the failed region’s load. Global balancing splits it across both.'],
    ['30,000 — 1.5× its normal load', 'Right. 60,000 ÷ 2 = 30,000. With N regions, each must handle N ÷ (N − 1) of its normal share; with only two regions, that is 2×.'],
  ]),
  step('Regional failover uses DNS with a 300-second TTL. How quickly does traffic leave the dead region?', [], 1, [
    ['Immediately — health checks remove the record', 'The record changes immediately. The caches holding the old answer do not.'],
    ['Over five minutes or more — caches keep the old answer until it expires, and some clients hold it longer', 'Right. DNS failover is bounded by the TTL that was cached before the failure. Anycast, or balancers that can forward to another region, move traffic faster.'],
    ['Never, without a manual change', 'Health-checked DNS can change the answer automatically. The delay is in the caches.'],
  ]),
  step('A user in Delhi is closest on the map to Mumbai, but their resolver is a public DNS service whose nearest site is in Singapore. What does latency-based or GeoDNS routing do?', [], 0, [
    ['It routes based on the resolver’s location, unless the resolver passes part of the client’s address (EDNS Client Subnet)', 'Right. DNS-based steering sees whoever asked. Anycast instead routes on the packet’s actual path.'],
    ['It always uses the phone’s GPS location', 'DNS never sees the phone, let alone its GPS.'],
    ['It measures the user’s latency to each region in real time', 'Latency-based DNS uses measured latency between networks and regions, looked up by the resolver’s address, not a live probe from this user.'],
  ]),
];

// Chapter 14 · client-side, server-side, sidecar
export const placement = [
  step('Kestrel has 400 services in Java, Go and Python. You want per-request balancing, retries, outlier ejection and mutual TLS everywhere, without changing application code. Which approach?', [], 2, [
    ['A client-side balancing library in every service', 'Three languages means three libraries kept in step, and every team must upgrade. It changes application code everywhere.'],
    ['One central L7 balancer for all internal traffic', 'It works, but every call takes an extra hop through a shared fleet that becomes a big blast radius.'],
    ['A service mesh: a sidecar proxy next to every service instance', 'Right. The sidecar does the balancing, retries and mTLS for its local app, configured centrally. The price is a proxy hop on each side of every call and a fleet of sidecars to run and upgrade.'],
  ]),
  step('One Java service calls one backend 200,000 times a second, and every fraction of a millisecond counts. Which approach adds the least latency?', [], 0, [
    ['Client-side balancing in the service itself', 'Right. No extra hop: the client keeps connections to every backend and picks per call. You pay with a library to maintain and service discovery to feed it.'],
    ['A central L7 balancer', 'An extra network hop and an extra proxy on every call.'],
    ['A sidecar on each end', 'Two extra local proxy hops per call. Usually small, but here you asked for the least.'],
  ]),
  step('500 clients each run least-requests balancing on their own. Each client sees only its own requests. What is the weakness?', [], 1, [
    ['None — 500 views add up to a global view', 'They never combine. Each client balances only its own slice and is blind to the other 499.'],
    ['No client sees total load on a backend, so a backend can be swamped by many clients at once; latency-aware P2C reduces the damage', 'Right. Local views are partial. Two random choices with a latency estimate copes well, and server-side signals (load reports, outlier ejection, 503 with back-off) cover the rest.'],
    ['Client-side balancing cannot do health checks', 'Clients can health-check and eject outliers themselves. The weakness is partial information, not missing features.'],
  ]),
];

// Chapter 15 · the API gateway and the edge
export const gateway = [
  step('The order service is timing out under load. Without a circuit breaker, what happens to its callers? With one?', [], 1, [
    ['Without: callers fail fast. With: callers retry harder', 'Backwards. Without a breaker, callers wait the full timeout on every call.'],
    ['Without: caller threads pile up waiting on timeouts and the failure cascades upstream. With: after enough failures the breaker opens — callers fail fast or degrade, and occasional probes test recovery', 'Right. The breaker protects the caller (threads, latency budget) and the struggling service (no retry storm). "Fail fast, probe later" is the whole pattern in four words.'],
    ['The circuit breaker restarts the order service', 'A breaker changes the caller’s behaviour. It never touches the callee.'],
    ['No difference if timeouts are configured', 'Timeouts bound each wait, but every call still waits. The breaker stops making the calls at all.'],
  ]),
  step('Where should per-API-key rate limiting and the web application firewall sit?', [], 0, [
    ['At the edge — gateway or edge proxy — before any expensive work', 'Right. Reject abuse before it costs a TLS handshake to your origin, a database query, or a thread. Service-level limits can still protect individual services behind it.'],
    ['Inside each service', 'Every service would reimplement it, and bad traffic would already have crossed your network and used your capacity.'],
    ['At the database', 'By the time a request reaches the database, the cheap places to reject it are behind you.'],
  ]),
  step('The gateway validates every JWT, and services trust a user-id header it adds. What else must be true?', [], 2, [
    ['Nothing — the gateway checked the token', 'Only for requests that went through the gateway.'],
    ['Services must re-validate the token on every call', 'Possible (defence in depth), but not required if the next point holds.'],
    ['Services must be reachable only through the gateway (or via mTLS identity), and the gateway must strip any user-id header the client sent', 'Right. Otherwise an attacker skips the gateway, or sends their own header, and impersonates any user.'],
  ]),
];

// Decision drills · mixed review (folds in the old checkpoint questions)
export const drills = [
  step('A million mobile clients hold persistent WebSocket connections. L4 or L7 in front, and why?', [], 1, [
    ['L7 — WebSockets are HTTP-upgraded, so you need HTTP awareness', 'An L7 balancer can do it, but the HTTP-awareness is used once, at the upgrade. That alone does not make L7 necessary.'],
    ['L4 (or L7 with consistent hashing) — the job is spreading and pinning long-lived connections cheaply; per-request smarts buy little when one "request" lasts hours', 'Right. Long-lived connections flip the tradeoff: routing smarts matter once, at connect; throughput matters always. Watch the idle timeouts and drain with reconnect jitter.'],
    ['No balancer — DNS round robin is enough', 'DNS cannot react to a dead server for a TTL, and cannot balance load. You still need a balancer.'],
    ['L7 with least connections, re-balancing every message', 'Re-balancing per message would break connection affinity entirely. A WebSocket is one connection to one server.'],
  ]),
  step('Your gRPC service has 20 pods; dashboards show 5 pods hot and 15 nearly idle. The balancer is a Kubernetes Service. First suspicion?', [], 0, [
    ['Connection-level balancing of long-lived HTTP/2 connections', 'Right. A Service balances connections; gRPC puts all calls on one. Balance per request (L7 or mesh), or use client-side balancing, or cap connection age.'],
    ['Five pods have faster CPUs', 'Faster pods would show lower CPU, not higher.'],
    ['Health checks are failing on 15 pods', 'Pods failing readiness get no traffic at all — not "nearly idle" — and the dashboard would show them unready.'],
  ]),
  step('Requests vary from 5 ms to 5 s, and there are 30 balancer instances with slightly stale load data. Which algorithm?', [], 2, [
    ['Round robin', 'It ignores the long requests piling up on some servers.'],
    ['Global least connections from a shared table', 'Thirty instances acting on the same stale minimum herd onto one server.'],
    ['Power of two choices over outstanding requests (or a latency EWMA)', 'Right. Load-aware enough for mixed costs; random enough that stale data causes a mild bias, not a stampede.'],
  ]),
  step('Deep health checks took the whole site down during a 5-second database blip. What is the standard split?', [], 1, [
    ['Remove all health checks', 'Then dead servers keep their share of traffic.'],
    ['Shallow checks decide routing; deep checks feed alerting', 'Right. Routing removes a server only for its own problems. A dependency problem pages a human instead of emptying the pool. Add a panic threshold so a mass failure fails open.'],
    ['Deep checks with longer intervals', 'Slower checks still fail together. They only delay the cliff.'],
  ]),
  step('Deploys cause one minute of 502s each time. Which pair of changes fixes it?', [], 0, [
    ['Connection draining before stopping each server, and slow start when it rejoins', 'Right. Drain: no new requests, finish in-flight ones, then stop. Slow start: ramp the weight up while the new process warms.'],
    ['Faster health checks and more servers', 'Faster checks detect the dead server sooner, but the in-flight requests on it still die.'],
    ['Sticky sessions so users stay on servers that are not being deployed', 'Every server is deployed eventually. Stickiness just decides whose requests die.'],
  ]),
  step('"Isn’t the load balancer a single point of failure?" The best short answer?', [], 2, [
    ['"No, load balancers do not fail"', 'They do: hardware, kernels, configuration pushes, and capacity.'],
    ['"We restart it quickly if it fails"', 'Restarting takes minutes; requests fail in the meantime.'],
    ['"It runs as a redundant pair or fleet behind a floating virtual IP or ECMP, and globally behind several DNS addresses or anycast"', 'Right. One sentence, and the interviewer knows the box is not magic.'],
  ]),
  step('A monolith with one service. The design has a client, an "API gateway", a "load balancer", and the app. What would Mara say?', [], 1, [
    ['Good — more layers, more safety', 'Each box adds latency, cost and failure modes. Boxes need reasons.'],
    ['Every box earns its sentence: one L7 balancer doing TLS, routing and health checks is enough until there are many services or a public API with keys', 'Right. Box inflation without justification is a known interview smell. Draw the gateway when you can name two of its jobs.'],
    ['Replace both with DNS round robin', 'DNS cannot health-check quickly, terminate TLS or rate-limit.'],
  ]),
  step('Kestrel runs at 70% utilisation across three zones. Why is that number not automatically safe?', [], 0, [
    ['Losing a zone multiplies load on the survivors by 1.5×, taking 70% to 105%', 'Right. Choose utilisation from the failure you must survive: (zones − 1) ÷ zones of your maximum safe level, minus burst headroom.'],
    ['70% is always too high', 'With six zones, losing one only multiplies survivor load by 1.2×, so 70% becomes 84% — tolerable.'],
    ['Utilisation does not matter if you autoscale', 'Autoscaling takes minutes; a zone dies in a second.'],
  ]),
];
