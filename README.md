# 🏰 The Citadel

Personal interview prep portal — two wings:

- **`/sd/` — System Design**: 12 pattern-first modules, gated lessons with quizzes + Mermaid diagrams, question bank, delivery-framework cheat sheet.
- **`/dsa/` — DSA Arsenal**: 20 patterns, 144 problems with LeetCode/LintCode links + done flags, Grimoire-style pattern lessons (Java).
- **`/war/` — War Room**: case files reverse-engineered from two production codebases — 18 LLD pattern dossiers, 6 system-design deep dives, interview stories.

Live: https://aman751997.github.io/citadel/

## Run locally

```sh
npm install
npm run dev
```

## Add content

- **SD lesson**: MDX in `src/lessons/` (frontmatter: `title`, `description`, `module` 1–12, `order`, `minutes`). Remove matching planned entry in `src/modules.ts`.
- **DSA pattern lesson**: MDX in `src/dsa-lessons/` (frontmatter: `title`, `description`, `order`, `minutes`). Link it via `lesson:` slug in `src/dsa.ts`.
- **War Room page**: plain Markdown in `src/war/` (`lld/`, `sd/`, or root; frontmatter: `title`, `description`, `order`, `minutes`). Section derives from the subfolder.
- **Question data**: SD bank in `src/bank.ts`, DSA problems in `src/dsa.ts` (keep done flags in sync with Notion).
- Forge queue + protocol: `CURRICULUM.md`. Push to `main` → auto-deploy via GitHub Actions.
