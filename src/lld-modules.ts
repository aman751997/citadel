// LLD wing curriculum — module metadata. Lessons live in src/lld-lessons/ and
// reference a module by id. Same shape as the SD wing's modules.ts.
export interface LldModule {
  id: number;
  icon: string;
  title: string;
  tagline: string;
}

export const LLD_MODULES: LldModule[] = [
  {
    id: 1,
    icon: '🏛️',
    title: 'Object Design Foundations',
    tagline:
      'The mechanics interviews actually test — invariants, composition vs inheritance, and SOLID taught by the mess each principle prevents.',
  },
  {
    id: 2,
    icon: '🧱',
    title: 'The Pattern Arsenal',
    tagline:
      'Creational, structural, behavioral — every pattern introduced by its forcing problem, with the War Room dossier as the production example.',
  },
  {
    id: 3,
    icon: '🧵',
    title: 'Concurrency for LLD Rounds',
    tagline:
      'The thread-safety toolkit machine-coding rounds assume: locks, atomics, executors, and the classic builds interviewers ask for.',
  },
  {
    id: 4,
    icon: '⏱️',
    title: 'The Machine-Coding Playbook',
    tagline:
      'The 90-minute protocol, what graders actually score, and the classic-problem canon with a full worked walkthrough.',
  },
];
