# 🏰 The Citadel

Personal interview-prep site. Live: https://aman751997.github.io/citadel/

Three interview pillars, one wing each, plus your own projects:

| Wing | What it is | How much |
|---|---|---|
| **System Design** (`/sd/`) | 26 lessons in 12 modules, plus 6 production case studies in the War Room | about 48 hours of reading |
| **DSA** (`/dsa/`) | 20 pattern lessons, 144 problems with LeetCode links | about 40 hours |
| **LLD** (`/lld/`) | 8 Java lessons: object design, patterns, concurrency, machine coding | about 16 hours |
| **Mastery** (`/mastery/`) | 4 write-ups of systems you built, for "walk me through your work" | about 4 hours |
| **Review** (`/review/`) | Your revision queue: what is due today | 5–10 minutes a day |

Also on the site: **Field Notes** (`/field-notes/`, short notes and closed-book drills from work), **Stories** (`/stories/`, what to say out loud about your work), and the **War Room** (production case studies, used as live examples after each wing's theory).

Times are reading time only. Plan about double once you do the exercises.
Every lesson is open. You never have to finish one to open the next.

## How to study with this site (start here)

**The idea in one line:** read a little, predict before you look, practise, tick the box, then come back for revision.

### 1. Your weekly rhythm

- **Weekdays, 45–60 minutes:** one DSA chapter, or one LLD / Java lesson.
- **Weekend, about 2 hours:** one System Design lesson.
- **Bad day, 15 minutes:** redo one old problem, or flip a few revision cards. A short day still counts. A missed day does not need to be repaid.
- If a whole weekend passes with no System Design, do it next. Do not let it pile up.

### 2. What to study first

Take the wings in this order inside each wing:

**DSA.** Do the patterns in the order on the DSA page. 1 Two pointers, 2 Sliding window, 3 Prefix sums, 4 Intervals, 5 Linked lists, 6 Binary search, 7 Stacks, 8 Heaps, 9 Trees DFS, 10 Trees BFS, 11 Graphs, 12 Advanced graphs, 13 Backtracking, 14 DP 1-D, 15 DP 2-D, 16 Tries, 17 Bit manipulation, 18 Greedy, 19 Hashing, 20 Matrix. Do one pattern, then solve its LeetCode problems before you start the next. Early patterns are the foundation for later ones.

**System Design.** Go module by module. Module 1 first (Delivery framework, Estimation, Core concepts, Networking), then Module 2 (Databases, Caching, Queues and streams, Load balancing, Blob and CDN, Search). Then do the case-study modules in any order: 3 Rate limiter, URL shortener, Typeahead · 4 Realtime · 5 Fan-out · 6 Contention · 7 Geospatial · 8 Async jobs · 9 Partitioning · 10 Time-series · 11 Sync and collaboration. Module 12 (LLM inference, RAG, LLM gateway, feature flags, recommendations) matches your day job, so read it before AI interviews.

**LLD.** Object modeling, SOLID, then Creational, Structural and Behavioral patterns, then Concurrency, then the Machine-coding protocol and Classic problems. Do the mock interviews in the last two lessons with a real timer.

**Mastery.** Read it in the week before any round where that project is on your CV. Order inside a project: overview, architecture, design decisions, interview questions, then production stories.

### 3. How to work through one lesson

1. **Skim first.** Read the headings and the Revision section at the bottom, so you know where you are going.
2. **Try before you read.** For a DSA problem, read only the "Problem" part, then try it on paper for 5–10 minutes. For System Design, sketch the boxes yourself before you read the design.
3. **Read in this order:** how to recognise it, the brute force, the key idea, then the algorithm. Do not skip to the code. The code is the last thing to learn, not the first.
4. **Run the dry run.** Press Next step by step. Turn on **Predict mode** so the page asks "what happens next?" before it shows you.
5. **Answer the quiz.** Pick an answer first, then read why. Wrong answers explain what they would break. Use "Try again".
6. **Say it out loud.** Give the 30-second answer, then the 2-minute one, before you open the model answer. The answer boxes stay shut until you click.
7. **Tick the box** on the wing's home page, and rate the revision cards: *Got it*, *Difficult* or *Forgotten*.

### 4. Revision (do this every day)

Open **Review** in the top menu. It lists the items that are due. After a card or question, the site asks you again after 1, 3, 7, 14 and 30 days. Remembered moves it to a longer gap, Difficult keeps the gap, Forgotten starts again at 1 day. Wrong quiz answers go to the queue by themselves. Use Export now and then to back up your queue (details in `docs/REVISION.md`).

### 5. Where your progress is kept

- Tick boxes on **System Design** and **LLD** share the same list as each lesson's "Mark complete" button. They sync to git when "link git sync" is on in the menu.
- Tick boxes on **DSA** lessons and **Mastery** chapters, and the Review queue, live only in this browser. Clearing browser data erases them.
- Your plan, calendar and scores are in the Notion campaign. The site is for learning; Notion is the record.
- A map of what has been rewritten and checked is in `docs/PROGRESS.md`.

### 6. Rules that keep you honest

- Do not just read. If you cannot explain it without looking, tick nothing.
- Anything marked **check current docs** came from memory: check it before you quote it.
- Anything marked **unverified** in Mastery is a claim the notes could not prove. Confirm it yourself before you say it in an interview.
- Numbers in examples are made-up assumptions unless a lesson says otherwise.

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
- Study order, what is done, and the forge protocol: `CURRICULUM.md`. House style for new lessons: `docs/STYLE.md`. Progress map: `docs/PROGRESS.md`. Push to `main` → auto-deploy via GitHub Actions.
