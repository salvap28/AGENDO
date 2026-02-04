import fs from 'fs/promises';
import path from 'path';

// Resolve subscriptions.json relative to the running process. Many dev workflows
// start the dev server from `apps/web`, so prefer `process.cwd()/subscriptions.json`.
// This is more robust than hardcoding the repo root.
const SUBS_PATH = path.join(process.cwd(), 'subscriptions.json');

// Log the path on first import to help debugging where subscriptions will be written.
try {
  // eslint-disable-next-line no-console
  console.log('[subscriptions] using store at', SUBS_PATH);
} catch {}

type Subscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type Store = {
  subscriptions: Subscription[];
};

async function ensureStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(SUBS_PATH, { encoding: 'utf-8' });
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || !Array.isArray(parsed.subscriptions)) {
      return { subscriptions: [] };
    }
    return parsed;
  } catch (err: any) {
    // If file doesn't exist or parse fails, create a fresh store
    if (err && (err.code === 'ENOENT' || err.code === 'EISDIR')) {
      const initial: Store = { subscriptions: [] };
      await fs.mkdir(path.dirname(SUBS_PATH), { recursive: true }).catch(() => {});
      await fs.writeFile(SUBS_PATH, JSON.stringify(initial, null, 2), { encoding: 'utf-8' });
      return initial;
    }
    // For any other error try to recover by returning empty store
    return { subscriptions: [] };
  }
}

async function writeStore(store: Store): Promise<void> {
  const tmp = SUBS_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), { encoding: 'utf-8' });
  await fs.rename(tmp, SUBS_PATH);
}

export async function addSubscription(sub: Subscription): Promise<void> {
  const store = await ensureStore();
  // Avoid duplicates by endpoint
  const exists = store.subscriptions.find((s) => s.endpoint === sub.endpoint);
  if (!exists) {
    store.subscriptions.push(sub);
    await writeStore(store);
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const store = await ensureStore();
  return store.subscriptions;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const store = await ensureStore();
  const filtered = store.subscriptions.filter((s) => s.endpoint !== endpoint);
  if (filtered.length !== store.subscriptions.length) {
    store.subscriptions = filtered;
    await writeStore(store);
  }
}

export type { Subscription };
