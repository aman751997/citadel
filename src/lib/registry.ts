// Lazy registry, auto-discovered: drop src/lib/labs/<pattern>.ts (exporting `lab`) or
// src/data/practice/<pattern>.ts (exporting `practice`) and <Playground>/<Practice> find it.
// Each lesson page only downloads its own modules.
import type { Lab } from './lab.ts';
import type { PracticeSet } from './practice.ts';

const byName = <T>(modules: Record<string, () => Promise<T>>) =>
  Object.fromEntries(Object.entries(modules).map(([path, load]) => [path.replace(/^.*\/([^/]+)\.ts$/, '$1'), load]));

export const labs: Record<string, () => Promise<{ lab: Lab<any> }>> = byName(import.meta.glob<{ lab: Lab<any> }>('./labs/*.ts'));
export const practiceSets: Record<string, () => Promise<{ practice: PracticeSet }>> = byName(import.meta.glob<{ practice: PracticeSet }>('../data/practice/*.ts'));
