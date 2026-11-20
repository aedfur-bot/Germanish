// App-level state on top of db.js: settings, phase progress, daily task log, streak.
import * as db from './db.js';
import { dayKey, addDays, weekKey } from './day.js';

export const MODES = {
  '1h': { label: '1 hour', quota: { 1: 2, 2: 2, 3: 1, 4: 1, 5: 1 } },
  '2h': { label: '2 hours', quota: { 1: 4, 2: 4, 3: 2, 4: 2, 5: 2 } },
  '3h': { label: '3 hours', quota: { 1: 6, 2: 6, 3: 3, 4: 3, 5: 3 } },
};

export const BLOCKS = {
  1: { key: 'grammar', name: 'Grammar & Vocab', unit: 'lesson chunk' },
  2: { key: 'review', name: 'Review (SRS)', unit: '25-card batch' },
  3: { key: 'input', name: 'Input', unit: 'passage' },
  4: { key: 'output', name: 'Output', unit: 'session' },
  5: { key: 'errors', name: 'Error Review', unit: 'review pass' },
};

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'claude-opus-5-5',
  lang: 'es',              // explanation language: es | en | it
  mode: '1h',
  ttsRate: 0.9,
  ttsVoice: '',
  unlockAll: false,        // manual override: show content from every phase
  baselineKnown: true,     // treat the 2000-word list as known for coverage %
  newPerBatch: 10,         // max new cards mixed into one 25-card batch
  retention: 0.9,          // FSRS desired retention
  delayCorrection: true,   // writing becomes reviewable the next study day
};

let settingsCache = null;

export async function getSettings() {
  if (!settingsCache) settingsCache = { ...DEFAULT_SETTINGS, ...(await db.kvGet('settings', {})) };
  return settingsCache;
}
export async function saveSettings(patch) {
  settingsCache = { ...(await getSettings()), ...patch };
  await db.kvSet('settings', settingsCache);
  emit('settings');
  return settingsCache;
}

// ---- phase progress ----
const DEFAULT_PROGRESS = {
  phase: 0,
  checks: {},          // itemId -> timestamp ticked
  history: [],         // [{ phase, at, via: 'checklist' | 'override' }]
  customTargets: [],   // Phase 4 deliberate-practice targets [{ id, label }]
};

export async function getProgress() {
  return { ...DEFAULT_PROGRESS, ...(await db.kvGet('progress', {})) };
}
export async function saveProgress(p) {
  await db.kvSet('progress', p);
  emit('progress');
}

// ---- counters that feed checklist stats ----
export async function bumpCounter(name, by = 1) {
  const c = await db.kvGet('counters', {});
  c[name] = (c[name] || 0) + by;
  await db.kvSet('counters', c);
  return c[name];
}
export async function getCounters() { return db.kvGet('counters', {}); }

// ---- lesson progress ----
export async function getLessonProgress() { return db.kvGet('lessonProgress', {}); }
export async function setLessonProgress(id, patch) {
  const lp = await getLessonProgress();
  lp[id] = { ...(lp[id] || {}), ...patch };
  await db.kvSet('lessonProgress', lp);
  return lp[id];
}

// ---- daily log ----
export async function getDay(key = dayKey()) {
  const s = await getSettings();
  const row = await db.get('days', key);
  return row || { day: key, mode: s.mode, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
}

export function quotaFor(mode) { return MODES[mode]?.quota || MODES['1h'].quota; }

export function isComplete(dayRow) {
  const q = quotaFor(dayRow.mode);
  return [1, 2, 3, 4, 5].every((b) => (dayRow.counts[b] || 0) >= q[b]);
}

/** Record one completed task for a block today. Returns the updated day row. */
export async function completeTask(block, note = '') {
  const s = await getSettings();
  const row = await getDay();
  row.mode = s.mode; // goal mode applies to the current day immediately
  row.counts[block] = (row.counts[block] || 0) + 1;
  (row.log ||= []).push({ block, at: Date.now(), note });
  const wasComplete = !!row.completedAt;
  if (!wasComplete && isComplete(row)) row.completedAt = Date.now();
  await db.put('days', row);
  emit('day');
  return { row, justCompleted: !wasComplete && !!row.completedAt };
}

/** Changing goal mode also re-stamps today's row so the new quota applies now. */
export async function setMode(mode) {
  await saveSettings({ mode });
  const row = await getDay();
  row.mode = mode;
  if (!row.completedAt && isComplete(row)) row.completedAt = Date.now();
  await db.put('days', row);
  emit('day');
}

/**
 * Streak: consecutive completed study days ending today (or yesterday if today
 * isn't finished yet). One missed day per Mon–Sun week is covered automatically
 * by a freeze; a second miss in the same week breaks the streak.
 */
export async function computeStreak() {
  const rows = await db.getAll('days');
  const done = new Set(rows.filter((r) => r.completedAt).map((r) => r.day));
  const first = (await db.kvGet('meta', {})).firstDay || dayKey();
  const today = dayKey();
  let streak = done.has(today) ? 1 : 0;
  const frozenWeeks = new Set();
  const frozenDays = [];
  let d = addDays(today, -1);
  while (d >= first) {
    if (done.has(d)) streak++;
    else {
      const wk = weekKey(d);
      if (frozenWeeks.has(wk)) break;
      frozenWeeks.add(wk);
      frozenDays.push(d);
    }
    d = addDays(d, -1);
  }
  // A freeze only "counts" if a completed day lies before it; trailing freezes at the start are noise.
  const freezeUsedThisWeek = frozenWeeks.has(weekKey(today)) && streak > 0;
  return { streak, freezeUsedThisWeek, frozenDays: streak > 0 ? frozenDays : [], best: await bestStreak(streak) };
}

async function bestStreak(current) {
  const best = Math.max(current, await db.kvGet('bestStreak', 0));
  await db.kvSet('bestStreak', best);
  return best;
}

// ---- tiny event bus so the header/tab badges refresh ----
const listeners = new Set();
export function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(what) { for (const fn of listeners) try { fn(what); } catch (e) { console.error(e); } }

export async function currentPhase() {
  return (await getProgress()).phase;
}
