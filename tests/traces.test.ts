import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

// Structural check for every decision puzzle in every wing: any exported array whose items look like
// TraceSteps must have a valid answer index, at least two choices, and feedback for every choice.
const root = new URL('../src/data/', import.meta.url).pathname;
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : name.endsWith('.ts') ? [path] : [];
});
const isStep = (value: any) => value && typeof value === 'object' && typeof value.question === 'string' && Array.isArray(value.choices) && 'answer' in value;

test('every exported trace is well formed', async () => {
  let traces = 0, steps = 0;
  for (const file of files(root)) {
    const mod = await import(pathToFileURL(file).href);
    for (const [name, value] of Object.entries(mod)) {
      if (!Array.isArray(value) || !value.length || !value.every(isStep)) continue;
      traces++;
      value.forEach((step: any, i: number) => {
        const where = `${relative(root, file)} → ${name}[${i}]`;
        steps++;
        assert.ok(step.question.trim().length > 10, `${where}: question too short`);
        assert.ok(step.choices.length >= 2, `${where}: needs at least two choices`);
        assert.ok(Number.isInteger(step.answer) && step.answer >= 0 && step.answer < step.choices.length, `${where}: answer index out of range`);
        step.choices.forEach((choice: any, c: number) => {
          assert.ok(choice.label?.trim(), `${where}: choice ${c} has no label`);
          assert.ok(choice.feedback?.trim().length > 10, `${where}: choice ${c} needs real feedback`);
        });
        assert.equal(new Set(step.choices.map((c: any) => c.label)).size, step.choices.length, `${where}: duplicate choice labels`);
        for (const row of step.rows) assert.ok(Array.isArray(row.cells), `${where}: row without cells`);
      });
    }
  }
  assert.ok(traces > 0 && steps > 0);
});
