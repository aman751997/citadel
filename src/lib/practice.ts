// Shape of a pattern's independent-practice set, consumed by <Practice pattern="..."> and <PatternHub>.
// Each pattern exports `practice: PracticeSet` from src/data/practice/<pattern>.ts.
export interface Challenge {
  id: string;
  topic: string;
  section: string;          // anchor id of the lesson section that teaches this concept
  prompt: string;           // the problem, WITHOUT naming the pattern or technique
  question: string;         // what to type, e.g. 'Enter the final array.'
  answer: number | number[] | boolean | string;
  strategy: string;         // key into PracticeSet.strategies
  hints: [string, string, string];
  rubric: [string, string, string];
  explanation: string;
}
export interface PracticeSet {
  storageKey: string;                       // localStorage key, e.g. 'citadel-sliding-window-review-v1'
  strategies: Record<string, string>;       // approach dropdown: key → label (include one "another tool" decoy)
  conceptIds: readonly string[];
  // Must vary the input with `variant` (attempt count) so a review is never the same prompt twice in a row.
  challengeFor(id: string, variant?: number): Challenge;
}
