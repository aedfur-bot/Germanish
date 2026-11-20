// JSON backup/restore of all local data, and Anki-compatible CSV export.
import * as db from './db.js';
import { l1 } from './srs.js';

const SKIP = new Set(['audio', 'cache']); // audio blobs and API cache aren't backed up

export async function exportJSON() {
  const stores = {};
  for (const name of Object.keys(db.STORES)) {
    if (SKIP.has(name)) continue;
    stores[name] = await db.getAll(name);
  }
  // never put the API key in a backup file
  const kv = stores.kv.map((r) => (r.key === 'settings' ? { ...r, value: { ...r.value, apiKey: '' } } : r));
  return { app: 'geschichten', format: 1, exportedAt: new Date().toISOString(), stores: { ...stores, kv } };
}

export async function importJSON(data) {
  if (data?.app !== 'geschichten' || !data.stores) throw new Error('Not a Geschichten backup file.');
  const currentSettings = await db.kvGet('settings', {});
  for (const [name, rows] of Object.entries(data.stores)) {
    if (!db.STORES[name] || SKIP.has(name)) continue;
    await db.clear(name);
    if (rows.length) await db.putMany(name, rows);
  }
  // keep the API key that's on this device
  const s = await db.kvGet('settings', {});
  await db.kvSet('settings', { ...s, apiKey: currentSettings.apiKey || '' });
}

const csvField = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per card (both directions are separate cards, as in the app). */
export async function exportAnkiCSV(lang) {
  const cards = await db.getAll('cards');
  const lines = ['#separator:Comma', '#html:false', '#columns:Front;Back;Notes;Tags'];
  for (const c of cards) {
    if (c.suspended) continue;
    const front = c.dir === 'rec' ? c.de : l1(c, lang);
    const back = c.dir === 'rec' ? l1(c, lang) : c.de;
    const tags = ['geschichten', c.kind, c.dir === 'rec' ? 'recognition' : 'production'].join(' ');
    lines.push([front, back, c.extra || '', tags].map(csvField).join(','));
  }
  return lines.join('\n') + '\n';
}

export function download(filename, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
