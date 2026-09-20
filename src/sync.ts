// Browser → git auto-sync for progress. Commits src/progress.json to the repo through the
// GitHub Contents API using a fine-grained personal access token that lives ONLY in this
// browser's localStorage — it is never rendered into the site or sent anywhere except
// api.github.com. No token stored → sync is silently off and the manual copy-report flow
// still works.
//
// Merge strategy: always GET the latest progress.json from the repo first (another device
// or the buddy may be ahead of the build this page came from), union in the local overlay
// keys, and PUT only if something new appeared. localStorage is left untouched — overlays
// dedupe away on page load once the redeployed site bakes them in.

const OWNER = 'aman751997';
const REPO = 'citadel';
const FILE = 'src/progress.json';
const BRANCH = 'main';
const TOKEN_KEY = 'sdc-gh-token';

const KEYS = {
  sd: 'sdc-progress',
  lld: 'sdc-lld-progress',
  dsa: 'sdc-dsa-solves',
} as const;

type Track = keyof typeof KEYS;
type Progress = Record<Track, string[]>;

export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string): void => localStorage.setItem(TOKEN_KEY, t.trim());
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

const localOf = (t: Track): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEYS[t]) || '[]');
  } catch {
    return [];
  }
};

export const hasPending = (): boolean =>
  (Object.keys(KEYS) as Track[]).some((t) => localOf(t).length > 0);

const gh = (path: string, init?: RequestInit) =>
  fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

export type SyncResult = 'synced' | 'nothing' | 'no-token' | 'error';

let inFlight: Promise<SyncResult> | null = null;

export async function sync(onStatus?: (msg: string) => void): Promise<SyncResult> {
  if (!getToken()) return 'no-token';
  if (inFlight) return inFlight;
  inFlight = doSync(onStatus).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doSync(onStatus?: (msg: string) => void): Promise<SyncResult> {
  const status = (m: string) => onStatus?.(m);
  try {
    status('🔄 syncing…');
    const res = await gh(`contents/${FILE}?ref=${BRANCH}`);
    if (!res.ok) throw new Error(`GET ${res.status}`);
    const file = await res.json();
    const current: Partial<Progress> = JSON.parse(atob(file.content.replace(/\n/g, '')));

    const merged = {} as Progress;
    let added = 0;
    for (const t of Object.keys(KEYS) as Track[]) {
      const union = new Set([...(current[t] || []), ...localOf(t)]);
      merged[t] = [...union].sort();
      added += merged[t].length - (current[t] || []).length;
    }
    if (added === 0) {
      status('✅ synced');
      return 'nothing';
    }

    const put = await gh(`contents/${FILE}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `progress: browser sync — ${added} new`,
        content: btoa(JSON.stringify(merged, null, 2) + '\n'),
        sha: file.sha,
        branch: BRANCH,
      }),
    });
    if (!put.ok) throw new Error(`PUT ${put.status}`);
    status(`✅ synced (+${added})`);
    return 'synced';
  } catch (e) {
    status('⚠️ sync failed');
    console.warn('[citadel sync]', e);
    return 'error';
  }
}

let timer: number | undefined;

// Debounced sync — call after any completion click; batches rapid toggles into one commit.
export function queueSync(onStatus?: (msg: string) => void): void {
  if (!getToken()) return;
  clearTimeout(timer);
  timer = window.setTimeout(() => void sync(onStatus), 2000);
}
