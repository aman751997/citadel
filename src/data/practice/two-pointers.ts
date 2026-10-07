import type { PracticeSet } from '../../lib/practice.ts';
import { challengeFor, conceptIds, strategies, type ConceptId } from '../pointer-challenges.ts';
import { REVIEW_KEY } from '../../lib/pointer-review.ts';

export const practice: PracticeSet = {
  storageKey: REVIEW_KEY,
  strategies,
  conceptIds,
  challengeFor: (id, variant = 0) => challengeFor(id as ConceptId, variant),
};
