import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { BANK, BANK_LINKS } from '../src/bank.ts';

// Every bank question has at least two chapter links, and each link points at a real lesson and a real #id.
test('every bank question links to real lesson chapters', () => {
  const names = BANK.flatMap(tier => tier.questions.map(q => q.name));
  for (const name of names) assert.ok((BANK_LINKS[name] || []).length >= 2, `${name}: needs at least 2 links`);
  for (const name of Object.keys(BANK_LINKS)) assert.ok(names.includes(name), `${name}: link entry for unknown question`);
  for (const [name, links] of Object.entries(BANK_LINKS)) for (const [lesson, anchor] of links) {
    const file = `src/lessons/${lesson}.mdx`;
    assert.ok(existsSync(file), `${name}: ${file} missing`);
    assert.ok(readFileSync(file, 'utf8').includes(`id="${anchor}"`), `${name}: ${lesson}#${anchor} not found`);
  }
  for (const q of BANK.flatMap(t => t.questions)) assert.notEqual(q.walkthrough, 'queued', `${q.name}: still queued`);
});
