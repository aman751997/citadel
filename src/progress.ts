// Baked lesson/solve completion truth — survives browser cache resets because it lives in git.
// src/progress.json is the sync file: the browser commits it directly via the GitHub API
// (see src/sync.ts) whenever something is completed, or the buddy edits it when a pasted
// progress report is synced. Once an id lands here (and the site redeploys), the stale
// localStorage copy dedupes away on next page load.
import data from './progress.json';

export const SD_DONE: string[] = data.sd;
export const LLD_DONE: string[] = data.lld;
export const DSA_SOLVED: string[] = data.dsa;
