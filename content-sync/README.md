# Confluence → Mastery wing sync

The Mastery wing (`/mastery/`) is generated, not hand-written. Its source of truth is the
personal Confluence space; `src/mastery/**/*.mdx` is build output that happens to be committed
so the site builds without network access.

**Never edit `src/mastery/**` by hand** — edit the Confluence page and re-sync, or the next
sync silently reverts your change.

## The manifests

One `meta.json` per project, listing the Confluence pages that make up the dossier in reading
order:

```json
[{ "order": 1, "id": "57999362", "title": "1. The pitch and the architecture",
   "file": "1-57999362.md",
   "webUrl": "https://…/wiki/spaces/~7120…/pages/57999362" }]
```

`order` drives ordering and `title` becomes the page heading; `file` is the raw export's
filename. A project slug here must match a slug in `src/mastery-projects.ts`, which holds the
wing-level metadata (icon, tagline, parent page).

## Re-syncing

1. **Export the pages.** For each `id` in the project's `meta.json`, fetch the page as markdown
   and save the body verbatim to `<rawDir>/<order>-<id>.md`. With the Atlassian MCP server
   connected in Claude Code that is `getConfluencePage` with
   `cloudId: "ratnaglobaltech-team-vqcmu8hm.atlassian.net"`, `contentFormat: "markdown"`;
   the text lives at `content.nodes[0].body`. Copy the project's `meta.json` in beside them.

2. **Convert and verify.**

   ```sh
   node scripts/confluence-to-mdx.mjs <rawDir> <project-slug>
   node scripts/verify-mdx.mjs       <rawDir> <project-slug>
   npm run build
   ```

   The verify step reverses every transform and diffs against the raw export, so a clean run is
   proof that no prose, table row, code line, link or diagram was lost. It exits non-zero on any
   mismatch.

3. **Adding a new project.** Add its pages to a new `content-sync/<slug>/meta.json`, add the
   matching entry to `src/mastery-projects.ts`, then run the two scripts. The wing index picks up
   any project that has at least one chapter.

## What the converter changes

| Confluence | MDX |
|---|---|
| page title / first paragraph | frontmatter `title` / `description` |
| ` ```mermaid ` fence | `<Mermaid code={…} />`, rendered client-side |
| `<custom data-type="status">Label</custom>` | `<Status>Label</Status>` lozenge |
| other `<custom>` macros | the label text they wrapped |
| `{`, `}`, bare `<` in prose | HTML entities, so MDX does not read them as JSX |

Fenced code, inline code and autolinks are passed through untouched. Reading time is estimated
from word count; it is not stored in Confluence.
