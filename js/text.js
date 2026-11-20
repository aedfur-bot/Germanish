// Tokenizing German text and estimating known-word coverage.
//
// Coverage is approximate: there's no full morphological analyser offline, so a
// token counts as known if it (or a rule-generated inflected form of a known
// lemma, or an entry in the irregular-forms table) is in the known set.
// Proper nouns (capitalized mid-sentence and not a known noun) are skipped.
import * as db from './db.js';
import { getSettings } from './store.js';
import { IRREGULAR_FORMS } from './content/irregular-forms.js';

export const WORD_RE = /[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/g;

export function bare(de) {
  // "der Mann" -> "mann", "sich freuen" -> "freuen", "(sich) setzen" -> "setzen"
  return de.replace(/^\(?(der|die|das|sich)\)?\s+/i, '').replace(/\s*\(.*?\)\s*/g, ' ').trim().toLowerCase();
}

/** Rule-based inflected forms for a lemma by part of speech. */
export function formsOf(de, pos) {
  const b = bare(de);
  const out = new Set([b]);
  if (b.includes(' ')) { for (const p of b.split(/\s+/)) out.add(p); return out; }
  const add = (...xs) => xs.forEach((x) => out.add(x));
  if (pos === 'n') {
    add(b + 'e', b + 'en', b + 'n', b + 'er', b + 's', b + 'es', b + 'nen', b + 'ern');
    // umlaut plurals: Mann→Männer, Stadt→Städte, Haus→Häuser
    const um = b.replace(/([aou])([^aeiouäöü]*)$/, (m, v, r) => ({ a: 'ä', o: 'ö', u: 'ü' }[v] + r)).replace(/au([^aeiou]*)$/, 'äu$1');
    if (um !== b) add(um, um + 'e', um + 'er', um + 'en', um + 'ern');
  } else if (pos === 'v') {
    const stem = b.replace(/(e?n|eln|ern)$/, (m) => (m === 'eln' ? 'el' : m === 'ern' ? 'er' : ''));
    add(stem, stem + 'e', stem + 'st', stem + 't', stem + 'en', stem + 'et', stem + 'est',
      stem + 'te', stem + 'test', stem + 'ten', stem + 'tet', 'ge' + stem + 't', 'ge' + stem + 'et', stem + 'end', b + 'd');
    // separable prefixes: anfangen → fangen forms + "an"
    const m = b.match(/^(ab|an|auf|aus|bei|ein|mit|nach|vor|weg|zu|zurück|her|hin|fest|los|vorbei|weiter|zusammen)(.{3,})$/);
    if (m) { add(m[1]); for (const f of formsOf(m[2], 'v')) { add(f); add(m[1] + f); add(m[1] + 'ge' + f.replace(/^ge/, '')); } add(m[1] + 'zu' + m[2]); }
  } else if (['adj', 'adv', 'num', 'pron', 'art', 'det'].includes(pos)) {
    add(b + 'e', b + 'en', b + 'em', b + 'er', b + 'es', b + 'ere', b + 'eren', b + 'erem', b + 'erer', b + 'eres', b + 'ste', b + 'sten', b + 'st', b + 'esten', b + 'este');
    if (b.endsWith('el')) { const s = b.slice(0, -2) + 'l'; add(s + 'e', s + 'en', s + 'em', s + 'er', s + 'es'); }
    if (b.endsWith('er')) { const s = b.slice(0, -2) + 'r'; add(s + 'e', s + 'en', s + 'em', s + 'er', s + 'es'); }
  }
  return out;
}

let knownCache = null;
export function invalidateKnown() { knownCache = null; }

/**
 * The known-word set: (baseline top-2000 if enabled) ∪ introduced/known vocab
 * ∪ every word on a reviewed SRS card ∪ manually marked words.
 */
export async function knownForms() {
  if (knownCache) return knownCache;
  const s = await getSettings();
  const vocab = await db.getAll('vocab');
  const set = new Set();
  for (const v of vocab) {
    if (s.baselineKnown || v.status === 'introduced' || v.status === 'known') for (const f of formsOf(v.de, v.pos)) set.add(f);
  }
  for (const c of await db.getAll('cards')) {
    if (c.isNew || c.kind !== 'word') continue;
    for (const f of formsOf(c.de, c.pos || guessPos(c.de))) set.add(f);
  }
  for (const w of await db.kvGet('markedKnown', [])) set.add(w);
  for (const [form] of Object.entries(IRREGULAR_FORMS)) {
    if (set.has(IRREGULAR_FORMS[form])) set.add(form);
  }
  knownCache = set;
  return set;
}

function guessPos(de) {
  if (/^(der|die|das)\s/i.test(de)) return 'n';
  if (/(en|ern|eln)$/.test(de)) return 'v';
  return 'adj';
}

export function isKnown(token, set) {
  const t = token.toLowerCase();
  if (set.has(t)) return true;
  if (IRREGULAR_FORMS[t] && set.has(IRREGULAR_FORMS[t])) return true;
  // compounds: Hausaufgabe → known if it splits into two known parts
  if (t.length >= 8) {
    for (let i = 3; i <= t.length - 3; i++) {
      const a = t.slice(0, i), b = t.slice(i), a2 = a.replace(/s$/, '');
      if ((set.has(a) || set.has(a2)) && set.has(b)) return true;
    }
  }
  return false;
}

export function tokenize(text) {
  return [...String(text).matchAll(WORD_RE)].map((m) => ({ word: m[0], index: m.index }));
}

/** Split into paragraphs → sentences → raw text, keeping punctuation. */
export function structure(text) {
  return String(text).replace(/\r/g, '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').match(/[^.!?…]+(?:[.!?…]+["“”»«')]*|$)\s*/g)?.filter((x) => x.trim()) || [p]);
}

/** Proper-noun heuristic: capitalized, not sentence-initial, not a known noun. */
function looksProper(tok, prevChar, set) {
  if (!/^[A-ZÄÖÜ]/.test(tok)) return false;
  if (!prevChar || /[.!?:»«"“„]\s*$/.test(prevChar)) return false;
  return !isKnown(tok, set);
}

export async function coverage(text) {
  const set = await knownForms();
  const toks = tokenize(text);
  let total = 0, known = 0;
  const unknown = new Map();
  for (const { word, index } of toks) {
    const prev = text.slice(Math.max(0, index - 3), index);
    if (looksProper(word, prev, set) && !isKnown(word, set)) continue;
    total++;
    if (isKnown(word, set)) known++;
    else unknown.set(word.toLowerCase(), (unknown.get(word.toLowerCase()) || 0) + 1);
  }
  const pct = total ? known / total : 0;
  return { total, known, pct, unknown: [...unknown.entries()].sort((a, b) => b[1] - a[1]) };
}

export function zone(pct) {
  if (pct >= 0.98) return { cls: 'zone-easy', label: 'Easy — good for extensive/volume reading' };
  if (pct >= 0.94) return { cls: 'zone-ok', label: 'i+1 sweet spot (~95%)' };
  if (pct >= 0.85) return { cls: 'zone-hard', label: 'Hard — intensive reading only' };
  return { cls: 'zone-hard', label: 'Too hard — likely frustrating' };
}

export async function markKnown(word) {
  const list = new Set(await db.kvGet('markedKnown', []));
  list.add(word.toLowerCase());
  await db.kvSet('markedKnown', [...list]);
  invalidateKnown();
}
