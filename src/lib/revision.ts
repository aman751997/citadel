// Spaced revision (Leitner boxes), localStorage only. Pure logic + a thin store wrapper; see docs/REVISION.md.
// Boxes 1..5 are reviewed after 1, 3, 7, 14, 30 days. remembered: box+1, difficult: same box, forgotten: box 1.
import { getJSON, setJSON, remove } from './learn-store.ts';

export const REVISION_KEY = 'citadel-revision-v1';
export const BACKUP_KEY = 'citadel-revision-backup';
export const STORE_VERSION = 1;
export const INTERVAL_DAYS = [1, 3, 7, 14, 30];
export const DAY_MS = 86_400_000;
export const WINGS = ['dsa', 'sd', 'lld', 'mastery'] as const;
export const WING_LABEL: Record<Wing, string> = { dsa: 'DSA', sd: 'System Design', lld: 'LLD', mastery: 'Mastery' };
export const KINDS = ['quiz', 'cards', 'chapter'] as const;

export type Wing = (typeof WINGS)[number];
export type Kind = (typeof KINDS)[number];
export type Rating = 'remembered' | 'difficult' | 'forgotten';

export interface Item {
  id: string;
  wing: Wing;
  path: string; // site-relative, no base: "dsa/lessons/arrays/rotate-image/"
  anchor: string; // element id inside the page, no '#'
  kind: Kind;
  title: string; // question / card front / chapter label
  lesson: string;
  box: number; // 1..5
  dueAt: number; // epoch ms
  lastAt: number | null;
  reviews: number;
}
export interface Store { v: number; items: Record<string, Item> }
export type ItemSpec = Pick<Item, 'id' | 'wing' | 'path' | 'anchor' | 'kind' | 'title' | 'lesson'>;

export const emptyStore = (): Store => ({ v: STORE_VERSION, items: {} });

// "/citadel/dsa/lessons/arrays/x/" -> { wing: 'dsa', slug: 'arrays/x', path: 'dsa/lessons/arrays/x/' }. Base-independent.
export function parseLocation(pathname: string): { wing: Wing; slug: string; path: string } | null {
  const seg = pathname.split('/').filter(Boolean);
  const at = seg.findIndex((s) => (WINGS as readonly string[]).includes(s));
  if (at < 0) return null;
  const rest = seg.slice(at + 1);
  const slug = (rest[0] === 'lessons' ? rest.slice(1) : rest).join('/');
  if (!slug) return null;
  return { wing: seg[at] as Wing, slug, path: seg.slice(at).join('/') + '/' };
}

// Ids never contain lesson text: only wing, route slug, component kind and the component's id/position.
export const itemId = (wing: Wing, slug: string, kind: Kind, id: string | number) => `${wing}:${slug}:${kind}:${id}`;

const clampBox = (b: number) => Math.min(INTERVAL_DAYS.length, Math.max(1, b));
export const dueAfter = (box: number, now: number) => now + INTERVAL_DAYS[clampBox(box) - 1] * DAY_MS;
export const isDue = (item: Item, now: number) => now >= item.dueAt;

// Review-time rating: applies the Leitner move and schedules the next review.
export function rate(item: Item, rating: Rating, now: number): Item {
  const box = rating === 'remembered' ? clampBox(item.box + 1) : rating === 'difficult' ? clampBox(item.box) : 1;
  return { ...item, box, dueAt: dueAfter(box, now), lastAt: now, reviews: item.reviews + 1 };
}

const fresh = (spec: ItemSpec, now: number): Item => ({ ...spec, box: 1, dueAt: now, lastAt: null, reviews: 0 });

// Lesson-time signal: wrong answer / "forgotten" resets to box 1, "difficult" keeps the box; both are due immediately.
// A lesson-time "remembered" is a normal rating (a brand-new item starts in box 1, so it lands in box 2).
export function signal(store: Store, spec: ItemSpec, rating: Rating | 'wrong', now: number): Store {
  const cur = store.items[spec.id] ?? fresh(spec, now);
  const next = rating === 'remembered' ? rate(cur, 'remembered', now)
    : { ...cur, ...spec, box: rating === 'difficult' ? cur.box : 1, dueAt: now, lastAt: now };
  return { ...store, items: { ...store.items, [spec.id]: next } };
}

// Seeds an item from pre-revision progress (legacy keys) without touching an existing one.
export function seedLegacy(store: Store, spec: ItemSpec, box: number, now: number): Store {
  if (store.items[spec.id]) return store;
  return { ...store, items: { ...store.items, [spec.id]: { ...fresh(spec, now), box: clampBox(box), dueAt: box > 1 ? dueAfter(box, now) : now } } };
}

export const rateItem = (store: Store, id: string, rating: Rating, now: number): Store =>
  store.items[id] ? { ...store, items: { ...store.items, [id]: rate(store.items[id], rating, now) } } : store;

export const removeItem = (store: Store, id: string): Store => {
  const { [id]: _gone, ...items } = store.items;
  return { ...store, items };
};

export const dueItems = (store: Store, now: number) =>
  Object.values(store.items).filter((i) => isDue(i, now)).sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));

export function summarize(store: Store, now: number) {
  return Object.fromEntries(WINGS.map((wing) => {
    const items = Object.values(store.items).filter((i) => i.wing === wing);
    const upcoming = items.filter((i) => !isDue(i, now)).map((i) => i.dueAt);
    return [wing, { total: items.length, due: items.length - upcoming.length, nextDue: upcoming.length ? Math.min(...upcoming) : null }];
  })) as Record<Wing, { total: number; due: number; nextDue: number | null }>;
}

const isItem = (x: any): x is Item =>
  x && typeof x.id === 'string' && (WINGS as readonly string[]).includes(x.wing) && (KINDS as readonly string[]).includes(x.kind)
  && typeof x.path === 'string' && typeof x.anchor === 'string' && typeof x.title === 'string'
  && Number.isInteger(x.box) && x.box >= 1 && x.box <= INTERVAL_DAYS.length && Number.isFinite(x.dueAt);

const cleanItem = (x: Item): Item => ({
  id: x.id, wing: x.wing, path: x.path, anchor: x.anchor, kind: x.kind, title: x.title,
  lesson: typeof x.lesson === 'string' ? x.lesson : '', box: x.box, dueAt: x.dueAt,
  lastAt: Number.isFinite(x.lastAt) ? x.lastAt : null, reviews: Number.isInteger(x.reviews) && x.reviews >= 0 ? x.reviews : 0,
});

export type MigrateResult = { ok: true; store: Store } | { ok: false; reason: string };

// Version guard. Unknown/newer versions are refused (never reinterpreted); invalid items are dropped.
export function migrate(raw: unknown): MigrateResult {
  if (raw == null) return { ok: true, store: emptyStore() };
  const r = raw as { v?: unknown; items?: unknown };
  if (typeof r !== 'object' || typeof r.items !== 'object' || r.items === null) return { ok: false, reason: 'not a revision store' };
  if (typeof r.v !== 'number' || !Number.isInteger(r.v) || r.v < 1) return { ok: false, reason: 'missing version' };
  if (r.v > STORE_VERSION) return { ok: false, reason: `written by a newer version (v${r.v})` };
  // v1 is current; future versions add `if (v === 1) { ...upgrade...; v = 2 }` steps here.
  const items: Record<string, Item> = {};
  for (const [k, it] of Object.entries(r.items as Record<string, unknown>)) if (isItem(it) && it.id === k) items[k] = cleanItem(it);
  return { ok: true, store: { v: STORE_VERSION, items } };
}

export const exportJSON = (store: Store) => JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2);

// merge: per id keep the more recently reviewed item; replace: swap the whole store.
export function importJSON(text: string, current: Store, mode: 'merge' | 'replace' = 'merge'): MigrateResult {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, reason: 'not valid JSON' }; }
  const res = migrate(parsed);
  if (!res.ok || mode === 'replace') return res;
  const items = { ...current.items };
  for (const it of Object.values(res.store.items)) {
    const mine = items[it.id];
    if (!mine || (it.lastAt ?? 0) > (mine.lastAt ?? 0)) items[it.id] = it;
  }
  return { ok: true, store: { v: STORE_VERSION, items } };
}

// --- storage wrapper (browser; falls back to memory via learn-store) ---

let blocked: string | null = null; // set when the stored value could not be understood; writes are refused to protect it
export const loadWarning = () => blocked;

export function loadStore(): Store {
  blocked = null;
  const raw = getJSON<unknown>(REVISION_KEY);
  const res = migrate(raw);
  if (res.ok) return res.store;
  blocked = res.reason;
  if (getJSON(BACKUP_KEY) == null) setJSON(BACKUP_KEY, raw);
  return emptyStore();
}

export function saveStore(store: Store): boolean {
  if (blocked) return false;
  setJSON(REVISION_KEY, store);
  return true;
}

// Explicit user actions (import/reset) keep a copy of what they replace under BACKUP_KEY.
export function replaceStore(store: Store) {
  const cur = getJSON<unknown>(REVISION_KEY);
  if (cur != null) setJSON(BACKUP_KEY, cur);
  blocked = null;
  if (Object.keys(store.items).length === 0) remove(REVISION_KEY); else setJSON(REVISION_KEY, store);
}

export const storageWorks = () => {
  try { const k = '__citadel_probe'; globalThis.localStorage.setItem(k, '1'); globalThis.localStorage.removeItem(k); return true; } catch { return false; }
};

// Wrapper used by lesson components: read-modify-write one signal.
export function recordSignal(spec: ItemSpec, rating: Rating | 'wrong', now = Date.now()) {
  saveStore(signal(loadStore(), spec, rating, now));
}
export function seedFromLegacy(spec: ItemSpec, box: number, now = Date.now()) {
  const s = loadStore();
  const next = seedLegacy(s, spec, box, now);
  if (next !== s) saveStore(next);
}
export function currentItem(id: string): Item | null {
  return loadStore().items[id] ?? null;
}

// Browser-only: builds the spec for a component on the current lesson page (null on pages outside the four wings).
export function pageSpec(kind: Kind, localId: string | number, anchor: string, title: string): ItemSpec | null {
  const loc = parseLocation(location.pathname);
  if (!loc) return null;
  return {
    id: itemId(loc.wing, loc.slug, kind, localId), wing: loc.wing, path: loc.path, anchor, kind, title,
    lesson: document.title.replace(/ · The Citadel$/, ''),
  };
}
