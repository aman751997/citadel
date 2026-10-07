// Spaced review shared by every pattern lesson. Each pattern keeps its own book under its own storage key.
export const DAY = 86_400_000;
export interface ReviewRecord { attempts: number; level: number; due: number; last: number; note: string; clean: boolean; }
export type ReviewBook = Record<string, ReviewRecord>;
export const REVIEW_EVENT = 'pattern-review-updated';
const intervals = [1, 3, 7, 14];

export function parseBookFor(raw: string | null, conceptIds: readonly string[]): ReviewBook {
  try {
    const value = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result: ReviewBook = {};
    for (const id of conceptIds) {
      const row = value[id];
      if (row && Number.isSafeInteger(row.attempts) && row.attempts > 0 && row.attempts < 1000000 && Number.isInteger(row.level) && row.level >= 0 && row.level < intervals.length && Number.isFinite(row.due) && row.due >= 0 && row.due < 1e15 && Number.isFinite(row.last) && row.last >= 0 && row.last < 1e15 && typeof row.clean === 'boolean') {
        result[id] = { attempts: row.attempts, level: row.level, due: row.due, last: row.last, clean: row.clean, note: typeof row.note === 'string' ? row.note.slice(0, 2000) : '' };
      }
    }
    return result;
  } catch { return {}; }
}
export function gradeReview(previous: ReviewRecord | undefined, clean: boolean, now: number, note = ''): ReviewRecord {
  const early = !!previous && now < previous.due;
  // Repeated easy answers before the due date do not create spaced-recall evidence.
  const level = clean ? (previous && !early ? Math.min(previous.level + 1, intervals.length - 1) : previous?.level || 0) : 0;
  const due = clean && early ? previous!.due : now + intervals[level] * DAY;
  return { attempts: (previous?.attempts || 0) + 1, level, due, last: now, note: note.slice(0, 2000), clean };
}
export function reviewQueueFor(book: ReviewBook, now: number, conceptIds: readonly string[]): string[] {
  return [...conceptIds].sort((a, b) => {
    const left = book[a], right = book[b];
    const tier = (row: ReviewRecord | undefined) => row && row.due <= now ? 0 : !row ? 1 : 2;
    return tier(left) - tier(right) || (left?.due || 0) - (right?.due || 0) || conceptIds.indexOf(a) - conceptIds.indexOf(b);
  });
}
export function reviewSummary(book: ReviewBook, now: number) {
  const rows = Object.values(book);
  return { practised: rows.length, due: rows.filter(row => row.due <= now).length, next: rows.length ? Math.min(...rows.map(row => row.due)) : null };
}
export function loadBookFor(key: string, conceptIds: readonly string[]): ReviewBook {
  try { return parseBookFor(localStorage.getItem(key), conceptIds); } catch { return {}; }
}
export function saveBookFor(key: string, book: ReviewBook): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(book));
    window.dispatchEvent(new CustomEvent(REVIEW_EVENT, { detail: { key } }));
    return true;
  } catch { return false; }
}

// Answers typed into practice prompts: yes/no, an integer, or a list of integers.
export function answerMatches(challenge: { answer: number | number[] | boolean | string }, input: string): boolean {
  const text = input.trim().replace(/−/g, '-');
  if (typeof challenge.answer === 'boolean') return (challenge.answer ? ['yes', 'true'] : ['no', 'false']).includes(text.toLowerCase());
  if (typeof challenge.answer === 'string') return text.toLowerCase().replace(/\s+/g, ' ') === challenge.answer.toLowerCase();
  if (typeof challenge.answer === 'number') return /^-?\d+$/.test(text) && Number(text) === challenge.answer;
  let cleaned = text;
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) cleaned = cleaned.slice(1, -1).trim();
  const pieces = cleaned === '' ? [] : cleaned.split(/[,\s]+/);
  const expected = challenge.answer;
  return pieces.length === expected.length && pieces.every((value, i) => /^-?\d+$/.test(value) && Number(value) === expected[i]);
}
