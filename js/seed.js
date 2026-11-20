// First-run seeding: the 2000-word baseline list into the vocab store.
// Lessons for Phase 0 are static modules and need no seeding.
import * as db from './db.js';
import { dayKey } from './day.js';

export const SEED_VERSION = 1;

export async function parseFreqList() {
  const res = await fetch('data/freq2000.tsv');
  const txt = await res.text();
  const rows = [];
  for (const line of txt.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [de, pos, es, en] = line.split('\t');
    rows.push({ de, pos, es, en, rank: rows.length + 1 });
  }
  return rows;
}

export async function ensureSeeded() {
  const meta = await db.kvGet('meta', {});
  if (meta.seedVersion >= SEED_VERSION) return false;
  const rows = await parseFreqList();
  const existing = new Map((await db.getAll('vocab')).map((v) => [v.de, v]));
  await db.putMany('vocab', rows.map((r) => ({ ...r, status: existing.get(r.de)?.status || 'unseen', ...(existing.get(r.de) || {}) })));
  await db.kvSet('meta', { ...meta, seedVersion: SEED_VERSION, firstDay: meta.firstDay || dayKey(), seededAt: Date.now() });
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  return true;
}
