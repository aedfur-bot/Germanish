// Study-day arithmetic. A study day runs 04:00 → 03:59 local time.

export const ROLLOVER_HOUR = 4;

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' of the study day containing `date`. */
export function dayKey(date = new Date()) {
  const d = new Date(date.getTime() - ROLLOVER_HOUR * 3600_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // noon avoids DST edge cases
}

export function addDays(key, n) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday of the week containing day `key` — used for the weekly streak freeze. */
export function weekKey(key) {
  const d = parseDay(key);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  return addDays(key, -dow);
}

/** Start of the *next* study day as a timestamp (the next 04:00). */
export function nextRollover(now = new Date()) {
  const r = new Date(now);
  r.setHours(ROLLOVER_HOUR, 0, 0, 0);
  if (r <= now) r.setDate(r.getDate() + 1);
  return r.getTime();
}

export function daysBetween(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / 86400_000);
}

export function prettyDay(key) {
  return parseDay(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
