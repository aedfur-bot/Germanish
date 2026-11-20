// SRS deck operations: creating notes/cards, building 25-card batches, rating.
import * as db from './db.js';
import { FSRS, newCardState, State } from './fsrs.js';
import { dayKey, addDays, parseDay, ROLLOVER_HOUR } from './day.js';
import { getSettings } from './store.js';

export const BATCH_SIZE = 25;

export async function scheduler() {
  const s = await getSettings();
  return new FSRS({ retention: s.retention });
}

function dueTimestamp(day) {
  const d = parseDay(day);
  d.setHours(ROLLOVER_HOUR, 0, 0, 0);
  return d.getTime();
}

/**
 * Add a note as two atomic cards (recognition DE→L1, production L1→DE).
 * note: { id, kind: 'word'|'sentence'|'error'|'pattern', de, tr: {es,en,it}, extra, source }
 * `oneWay` adds only the given direction.
 */
export async function addNote(note, { oneWay = null } = {}) {
  const now = Date.now();
  const dirs = oneWay ? [oneWay] : ['rec', 'prod'];
  const cards = dirs.map((dir) => ({
    id: `${note.id}:${dir}`,
    noteId: note.id,
    kind: note.kind,
    dir,
    de: note.de,
    tr: note.tr,
    extra: note.extra || '',
    source: note.source || '',
    rank: note.rank ?? null,
    pos: note.pos || '',
    createdAt: now,
    due: Number.MAX_SAFE_INTEGER, // new cards aren't "due" — they're pulled in as new
    isNew: 1,
    suspended: false,
    fsrs: newCardState(),
  }));
  const existing = await Promise.all(cards.map((c) => db.get('cards', c.id)));
  const fresh = cards.filter((_, i) => !existing[i]);
  if (fresh.length) await db.putMany('cards', fresh);
  return fresh.length;
}

export function l1(card, lang) {
  const tr = card.tr || {};
  return tr[lang] || tr.es || tr.en || '';
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Counts for the Review tab header. */
export async function deckStats() {
  const all = await db.getAll('cards');
  const now = Date.now();
  let due = 0, fresh = 0, review = 0, suspended = 0;
  for (const c of all) {
    if (c.suspended) { suspended++; continue; }
    if (c.isNew) fresh++;
    else { review++; if (c.due <= now) due++; }
  }
  return { total: all.length, due, fresh, review, suspended };
}

/**
 * Build a batch: due reviews first (most overdue first), then new cards up to
 * newPerBatch, then — if still short — upcoming reviews ("practice ahead") only
 * when `ahead` is true. Result is shuffled so card kinds/directions interleave,
 * but sibling cards (rec/prod of the same note) are kept apart.
 */
export async function buildBatch({ ahead = false } = {}) {
  const s = await getSettings();
  const now = Date.now();
  const all = (await db.getAll('cards')).filter((c) => !c.suspended);
  const due = all.filter((c) => !c.isNew && c.due <= now).sort((a, b) => a.due - b.due);
  const fresh = all.filter((c) => c.isNew).sort((a, b) => a.createdAt - b.createdAt || (a.rank ?? 1e9) - (b.rank ?? 1e9));
  const batch = due.slice(0, BATCH_SIZE);
  const seenNotes = new Set(batch.map((c) => c.noteId));
  let added = 0;
  for (const c of fresh) {
    if (batch.length >= BATCH_SIZE || added >= s.newPerBatch) break;
    // introduce the recognition card first; production joins a later batch
    if (c.dir === 'prod' && fresh.some((x) => x.noteId === c.noteId && x.dir === 'rec')) continue;
    if (seenNotes.has(c.noteId)) continue;
    batch.push(c); seenNotes.add(c.noteId); added++;
  }
  if (ahead && batch.length < BATCH_SIZE) {
    const upcoming = all.filter((c) => !c.isNew && c.due > now).sort((a, b) => a.due - b.due);
    for (const c of upcoming) { if (batch.length >= BATCH_SIZE) break; if (!seenNotes.has(c.noteId)) { batch.push(c); seenNotes.add(c.noteId); } }
  }
  return spreadSiblings(shuffle(batch));
}

function spreadSiblings(cards) {
  for (let i = 1; i < cards.length; i++) {
    if (cards[i].noteId === cards[i - 1].noteId) {
      const j = cards.findIndex((c, k) => k > i && c.noteId !== cards[i].noteId);
      if (j > 0) [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }
  return cards;
}

/** Persist a rating. Returns the updated card. */
export async function rate(card, rating, { firstInBatch = true } = {}) {
  if (!firstInBatch) return card; // in-batch repeats of "Again" cards are practice only
  const f = await scheduler();
  const now = Date.now();
  const before = card.fsrs;
  const { card: fs, intervalDays } = f.review(card.fsrs, rating, now);
  const today = dayKey();
  const updated = { ...card, fsrs: fs, isNew: 0, due: dueTimestamp(addDays(today, intervalDays)), dueDay: addDays(today, intervalDays) };
  await db.put('cards', updated);
  await db.put('revlog', { cardId: card.id, kind: card.kind, rating, ts: now, day: today, prevState: before.state, ivl: intervalDays });
  return updated;
}

export async function previewIntervals(card) {
  return (await scheduler()).preview(card.fsrs);
}

/** Accuracy (share of non-Again first answers) over the last `days` study days. */
export async function accuracy(days = 14, kinds = null) {
  const since = addDays(dayKey(), -days + 1);
  const logs = (await db.getAll('revlog')).filter((r) => r.day >= since && (!kinds || kinds.includes(r.kind)));
  if (!logs.length) return null;
  return logs.filter((r) => r.rating > 1).length / logs.length;
}

export async function matureCount() {
  return (await db.getAll('cards')).filter((c) => !c.isNew && c.fsrs.state !== State.New && c.fsrs.stability >= 21).length;
}
