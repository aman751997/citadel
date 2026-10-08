// Module registry — pattern-first curriculum: each pattern module = theory lesson + its walkthroughs.
// Learn the pattern deeply → its whole question family falls. Planned entries show as "coming soon".
export interface PlannedLesson {
  title: string;
  description: string;
}

export interface ModuleDef {
  id: number;
  icon: string;
  title: string;
  tagline: string;
  planned: PlannedLesson[];
}

export const MODULES: ModuleDef[] = [
  {
    id: 1, icon: '🏛️', title: 'Foundations',
    tagline: 'The framework, the math, the vocabulary — how every answer is structured.',
    planned: [],
  },
  {
    id: 2, icon: '⚙️', title: 'The Toolbox',
    tagline: 'Six technologies known cold, so design time goes to tradeoffs, not recall.',
    planned: [],
  },
  {
    id: 3, icon: '🥊', title: 'Warm-up Fights',
    tagline: 'First full walkthroughs using only Foundations + Toolbox. Also: the questions every loop opens with.',
    planned: [
    ],
  },
  {
    id: 4, icon: '📡', title: 'Realtime & Messaging',
    tagline: 'Server-push, connection state, delivery guarantees. Unlocks: WhatsApp, Discord/Slack, Zoom signaling, live anything. Full walkthroughs inside the lesson: WhatsApp.',
    planned: [],
  },
  {
    id: 5, icon: '📣', title: 'Fan-out & Feeds',
    tagline: 'Push vs pull vs hybrid. Unlocks: Twitter/News feed, Instagram, notifications, TikTok feed. Full walkthroughs inside the lesson: Twitter / News Feed, Notification System.',
    planned: [],
  },
  {
    id: 6, icon: '🔒', title: 'Contention & Exactly-Once',
    tagline: 'Locks, idempotency, ledgers. Unlocks: Ticketmaster, payments, job scheduler, Airbnb, flash sales. Full walkthroughs inside the lesson: Ticketmaster, Payments (Stripe), Distributed Job Scheduler.',
    planned: [],
  },
  {
    id: 7, icon: '🗺️', title: 'Geospatial',
    tagline: 'Geohash, quadtree, H3. Unlocks: Yelp, Uber, DoorDash, Tinder. Full walkthroughs inside the lesson: Yelp / Nearby, Uber.',
    planned: [],
  },
  {
    id: 8, icon: '🏭', title: 'Async Jobs & Pipelines',
    tagline: 'Queue + workers + status, staged pipelines. Unlocks: YouTube, web crawler, code judge, exports. Full walkthroughs inside the lesson: YouTube, Web Crawler.',
    planned: [],
  },
  {
    id: 9, icon: '🧱', title: 'Partitioning & Storage Infra',
    tagline: 'Consistent hashing, vnodes, quorums. Unlocks: distributed cache, Dynamo KV store, S3. Full walkthroughs inside the lesson: Distributed Cache, Key-Value Store (Dynamo).',
    planned: [],
  },
  {
    id: 10, icon: '📈', title: 'Time-Series & Aggregation',
    tagline: 'Rollups, sharded counters, top-K sketches. Unlocks: Datadog, ad aggregator, leaderboards, tracing. Full walkthroughs inside the lesson: Metrics / Datadog (plus ad-click aggregator, leaderboard, trending top-K sketches).',
    planned: [],
  },
  {
    id: 11, icon: '✍️', title: 'Sync & Collaboration',
    tagline: 'Conflicts, OT, CRDTs. Unlocks: Dropbox, Google Docs, offline-first apps. Full walkthroughs inside the lesson: Dropbox, Google Docs.',
    planned: [],
  },
  {
    id: 12, icon: '🤖', title: 'AI-Era Systems',
    tagline: 'Your day-job edge. Unlocks: ChatGPT serving, RAG, LLM gateways, flags, recsys — the rising tier.',
    planned: [],
  },
];
