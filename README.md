# 🏰 The Citadel

Personal interview prep portal — three wings, one per interview pillar:

- **`/sd/` — System Design (HLD)**: 12 pattern-first modules, gated lessons with quizzes + Mermaid diagrams, question bank, delivery-framework cheat sheet, plus a War Room of 6 production case studies.
- **`/dsa/` — DSA Arsenal**: 20 patterns, 144 problems with LeetCode/LintCode links + done flags, Grimoire-style pattern lessons (Java).
- **`/lld/` — LLD**: machine-coding wing — 8 gated lessons across 4 modules (object modeling, SOLID, pattern arsenal, concurrency, playbook + classic-problem canon), plus a War Room of 18 pattern dossiers, build drills, and cheatsheet from production code.
- **`/mastery/` — Project Mastery**: 4 dossiers / 29 chapters on the systems actually shipped (AI document pipeline, reporting engine, telemedicine PoC, war stories), synced from Confluence for the "walk me through your work" half of the loop.
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
- **Mastery chapter**: do *not* hand-edit `src/mastery/**` — it is generated from Confluence. Edit the wiki page, then re-run the sync (`content-sync/README.md`); project metadata lives in `src/mastery-projects.ts`.
- Forge queue + protocol: `CURRICULUM.md`. Push to `main` → auto-deploy via GitHub Actions.
