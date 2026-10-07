// Two-pointer bindings for the shared review store. The storage key is unchanged so saved progress survives.
import { conceptIds, type ConceptId } from '../data/pointer-challenges.ts';
import { parseBookFor, reviewQueueFor, loadBookFor, saveBookFor, type ReviewRecord } from './review.ts';
export { DAY, gradeReview, reviewSummary, type ReviewRecord } from './review.ts';
export const REVIEW_KEY = 'citadel-pointer-review-v1';
export type ReviewBook = Partial<Record<ConceptId, ReviewRecord>>;
export const parseBook = (raw: string | null): ReviewBook => parseBookFor(raw, conceptIds);
export const reviewQueue = (book: ReviewBook, now: number) => reviewQueueFor(book as Record<string, ReviewRecord>, now, conceptIds) as ConceptId[];
export const loadBook = (): ReviewBook => loadBookFor(REVIEW_KEY, conceptIds);
export const saveBook = (book: ReviewBook): boolean => saveBookFor(REVIEW_KEY, book as Record<string, ReviewRecord>);
