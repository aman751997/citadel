# 🏰 The Citadel

Personal interview prep portal — three wings, one per interview pillar:

- **`/sd/` — System Design (HLD)**: 12 pattern-first modules, gated lessons with quizzes + Mermaid diagrams, question bank, delivery-framework cheat sheet, plus a War Room of 6 production case studies.
- **`/dsa/` — DSA Arsenal**: 20 patterns, 144 problems with LeetCode/LintCode links + done flags, Grimoire-style pattern lessons (Java).
- **`/lld/` — LLD**: machine-coding wing — 8 gated lessons across 4 modules (object modeling, SOLID, pattern arsenal, concurrency, playbook + classic-problem canon), plus a War Room of 18 pattern dossiers, build drills, and cheatsheet from production code.
- **`/mastery/` — Project Mastery**: 4 dossiers / 29 chapters on the systems actually shipped (AI document pipeline, reporting engine, telemedicine PoC, war stories), for the "walk me through your work" half of the loop.
- **`/field-notes/` — Field Notes**: hand-written interview notes on features built at work, plus closed-book grill drills.
- **`/stories/`** — cross-wing interview stories (what to say out loud, honest claims).

War Room = battle-tested material reverse-engineered from two production codebases; each wing's theory comes first, War Room pages are the live examples.

Live: https://aman751997.github.io/citadel/

## Run locally

```sh
npm install
npm run dev
```

## Add content

- **SD lesson**: MDX in `src/lessons/` (frontmatter: `title`, `description`, `module` 1–12, `order`, `minutes`). Remove matching planned entry in `src/modules.ts`.
- **DSA pattern lesson**: MDX in `src/dsa-lessons/` (frontmatter: `title`, `description`, `order`, `minutes`). Link it via `lesson:` slug in `src/dsa.ts`.
- **War Room page**: plain Markdown in `src/war/` (`lld/` → `/lld/war/…`, `sd/` → `/sd/war/…`; frontmatter: `title`, `description`, `order`, `minutes`). Wing derives from the subfolder.
- **LLD lesson**: MDX in `src/lld-lessons/` (frontmatter: `title`, `description`, `module` 1–4, `order`, `minutes`); modules defined in `src/lld-modules.ts`.
- **Question data**: SD bank in `src/bank.ts`, DSA problems in `src/dsa.ts` (keep done flags in sync with Notion).
- **Mastery chapter**: MDX in `src/mastery/<project>/` (frontmatter: `title`, `description`, `project`, `order`, `minutes`); project metadata lives in `src/mastery-projects.ts`.
- **Field Note**: MDX in `src/field-notes/` (frontmatter: `title`, `description`, `kind` feature|drill, `date`, `minutes`, optional `status`).
- **Public site**: never name real companies (employer, clients, tenants) or link to internal tools.
- Forge queue + protocol: `CURRICULUM.md`. Push to `main` → auto-deploy via GitHub Actions.
