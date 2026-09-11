// Mastery wing — one entry per production project dossier. Chapters live in
// src/mastery/<slug>/*.mdx and reference the project by slug. Content is synced
// from the Confluence personal space (see scripts/confluence-to-mdx.mjs).
export interface MasteryProject {
  slug: string;
  icon: string;
  title: string;
  tagline: string;
  /** Confluence parent page — the canonical source of truth for this dossier. */
  source: string;
}

const WIKI =
  'https://ratnaglobaltech-team-vqcmu8hm.atlassian.net/wiki/spaces/~712020902e4ce290c34998bf3d5a7efed0c42e/pages';

export const MASTERY_PROJECTS: MasteryProject[] = [
  {
    slug: 'ai-pipeline',
    icon: '🧠',
    title: 'AI Document Pipeline',
    tagline:
      'Event-driven medical NLP + RAG: the three-stage NER pipeline, negation and status, provenance, LLM engineering, pgvector, an honest production scorecard, STAR stories, a question bank and eight design drills.',
    source: `${WIKI}/57966593`,
  },
  {
    slug: 'reporting-engine',
    icon: '📊',
    title: 'Reporting Engine',
    tagline:
      'Multi-tenant reporting engine end to end: architecture and data flow, request lifecycle and emitted SQL, design trade-offs, a 30-minute worked dashboard, and the security deep dive — injection, tenancy, PII, k-anonymity.',
    source: `${WIKI}/54231041`,
  },
  {
    slug: 'telemedicine-poc',
    icon: '🩺',
    title: 'Telemedicine PoC',
    tagline:
      'LiveKit SFU and token server, per-speaker egress recording with consent, Whisper transcription and alignment, MedGemma summaries — plus the design decisions, war stories and Q&A.',
    source: `${WIKI}/58294374`,
  },
  {
    slug: 'war-stories',
    icon: '🔥',
    title: 'War Stories',
    tagline:
      'One integration day, eight production-grade bugs — each told as interview material: symptom, root cause, fix, and the lesson you can defend.',
    source: `${WIKI}/39026689`,
  },
];
