// Mastery wing — one entry per production project dossier. Chapters live in
// src/mastery/<slug>/*.mdx and reference the project by slug.
export interface MasteryProject {
  slug: string;
  icon: string;
  title: string;
  tagline: string;
}

export const MASTERY_PROJECTS: MasteryProject[] = [
  {
    slug: 'ai-pipeline',
    icon: '🧠',
    title: 'AI Document Pipeline',
    tagline:
      'Event-driven medical NLP + RAG: the three-stage NER pipeline, negation and status, provenance, LLM engineering, pgvector, an honest production scorecard, STAR stories, a question bank and eight design drills.',
  },
  {
    slug: 'reporting-engine',
    icon: '📊',
    title: 'Reporting Engine',
    tagline:
      'Multi-tenant reporting engine end to end: architecture and data flow, request lifecycle and emitted SQL, design trade-offs, a 30-minute worked dashboard, and the security deep dive — injection, tenancy, PII, k-anonymity.',
  },
  {
    slug: 'telemedicine-poc',
    icon: '🩺',
    title: 'Telemedicine PoC',
    tagline:
      'LiveKit SFU and token server, per-speaker egress recording with consent, Whisper transcription and alignment, MedGemma summaries — plus the design decisions, war stories and Q&A.',
  },
  {
    slug: 'war-stories',
    icon: '🔥',
    title: 'War Stories',
    tagline:
      'One integration day, eight production-grade bugs — each told as interview material: symptom, root cause, fix, and the lesson you can defend.',
  },
];
