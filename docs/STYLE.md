# House style for Citadel lessons

Use this for every new or edited SD, DSA, LLD and Mastery lesson. (`docs/LESSON_GUIDE.md` still covers the correctness machinery: Java checkers, trace data, builds. Its story and character rules are retired.)

## Voice
- Write like a senior backend engineer teaching one other engineer. Plain, conversational English. Short sentences and paragraphs.
- Explain the problem before the solution, and why the solution helps, not only what it is called.
- Define a term the first time it appears, in one plain sentence. Never explain a concept with more unfamiliar concepts.
- No fictional characters, dialogue or story scenes. Use a realistic engineering scenario instead ("a popular key expires at 9 AM and 10,000 requests hit the database").
- At most one short analogy where it really helps. No hype words.
- Say what is generally accepted, what is a recommendation, and what is an assumption. Do not state vendor limits as fact: write "check current docs".

## Keep the engineering
Simplify the language, not the content. Keep edge cases, concurrency problems, consistency guarantees, complexity and design decisions. If something needed to understand the topic is missing, add it.

## Formats
- **System Design:** what it is → why we need it → how it works → code → trade-offs → when to use it → interview takeaway. Put similar-looking ideas in a comparison table (for example cache-aside vs read-through).
- **DSA, per problem:** problem → how to recognise it → brute force → intuition → dry run → algorithm in plain English → Java → why it works → complexity → edge cases and mistakes → practice → LeetCode link. End each pattern with a Revision section (recognise, core algorithm, mistakes, complexity, three problems). Never show the optimal code before the idea.
- **LLD:** concept → problem → bad design → better design → how it works → diagram → when to use → trade-offs and when not to → practice → interview summary. Show the race before the fix for concurrency.
- **Mastery:** overview → architecture → design decisions (problem, options, choice, why, trade-offs, what changes at scale) → deep dives → interview questions at three levels → 30-second / 2-minute / detailed answers → production stories (STAR). Never invent metrics, ownership or results. Label each claim Implemented, Tested, Planned, Hypothetical or Unverified.

## Interaction (every chapter)
At least one useful visual and one question block. Questions test decisions, not definitions: concurrency, a dependency going down, 100x scale, a transaction failing halfway, why this design over a simpler one, how to debug it in production. Wrong answers must explain what they would break. Components: `docs/INTERACTIVE_COMPONENTS.md`, `docs/DRYRUN.md`.

## Checks before you ship
`npm run test:ts`, `node scripts/check-java.mjs`, a fresh build, `check-links`, `check-layout`, `check-mermaid`. Run SQL and Redis examples on a real server. Recompute every number you print. Keep a lesson near 1.3× the length of the thing it replaces; extra length is a cost to the reader.
