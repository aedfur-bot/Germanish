// Supporting statistics shown next to phase checklist items.
// They inform the learner's self-assessment; they never tick boxes.
import * as db from './db.js';
import { getLessonProgress, getCounters, getProgress } from './store.js';
import { accuracy, matureCount } from './srs.js';
import { SEED_LESSONS } from './content/lessons-phase0.js';
import { FUNCTION_WORDS } from './content/function-words.js';
import { dayKey, addDays } from './day.js';

const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);

export async function computeStats() {
  const [lp, counters, cards, days, outputs, texts, vocab, revlog, errors, progress, custom] = await Promise.all([
    getLessonProgress(), getCounters(), db.getAll('cards'), db.getAll('days'), db.getAll('outputs'),
    db.getAll('texts'), db.getAll('vocab'), db.getAll('revlog'), db.getAll('errors'), getProgress(), db.getAll('lessons'),
  ]);
  const done = (id) => !!lp[id]?.doneAt;
  const tagged = (tag) => SEED_LESSONS.filter((l) => l.tag === tag);
  const pairs = tagged('pairs');
  const caseL = SEED_LESSONS.filter((l) => l.tag === 'case');
  const fwSet = new Set(FUNCTION_WORDS.map((f) => f.de));
  const fwIntro = new Set(cards.filter((c) => fwSet.has(c.de)).map((c) => c.de)).size;
  const introduced = vocab.filter((v) => v.status === 'introduced' || v.status === 'known').length;
  const writings = outputs.filter((o) => o.type === 'writing');
  const outDays = new Set(outputs.map((o) => o.day));
  let run = 0, bestRun = 0;
  const sortedDays = [...outDays].sort();
  for (let i = 0; i < sortedDays.length; i++) {
    run = i && addDays(sortedDays[i - 1], 1) === sortedDays[i] ? run + 1 : 1;
    bestRun = Math.max(bestRun, run);
  }
  const since28 = addDays(dayKey(), -27);
  const reviewDays = new Set(revlog.filter((r) => r.day >= since28).map((r) => r.day)).size;
  const errAcc = await accuracy(28, ['error']);
  const phaseLessons = [...SEED_LESSONS, ...custom].filter((l) => l.phase === progress.phase);
  const cats = {};
  for (const e of errors) cats[e.category || 'other'] = (cats[e.category || 'other'] || 0) + 1;
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(', ');

  return {
    minimalPairs: `${pairs.filter((l) => done(l.id)).length}/${pairs.length} contrast sets done`,
    caseMap: lp['p0-casemap']?.rating ? `self-rating: ${lp['p0-casemap'].rating}` : 'not rated yet',
    caseLessons: `${caseL.filter((l) => done(l.id)).length}/${caseL.length} case lessons done`,
    twoWay: done('p0-twoway') ? 'two-way lesson done' : 'two-way lesson not done',
    functionWords: `${fwIntro}/${FUNCTION_WORDS.length} introduced`,
    completedDays: `${days.filter((d) => d.completedAt).length} full days completed`,
    lessonsPhase: `${phaseLessons.filter((l) => done(l.id)).length}/${phaseLessons.length} lessons for this phase done`,
    reviewAccuracy: `14-day accuracy ${pct(await accuracy(14))} · ${revlog.length} reviews total`,
    vocabIntroduced: `${introduced} words introduced`,
    writingCount: `${writings.length} writing sessions`,
    sentenceCards: `${cards.filter((c) => c.kind === 'sentence' || c.kind === 'pattern').length} sentence-pattern cards`,
    reviewDays28: `reviews on ${reviewDays}/28 days`,
    errorCards: `${cards.filter((c) => c.kind === 'error').length} error-sourced cards`,
    outputRun: `longest run: ${bestRun} consecutive days`,
    reviewedOutputs: `${outputs.filter((o) => o.reviewStatus === 'reviewed').length} outputs reviewed`,
    textsRead: `${texts.filter((t) => t.readAt).length} texts read`,
    shadowSessions: `${counters.shadowSessions || 0} shadowing sessions`,
    wordsRead: `${(counters.wordsRead || 0).toLocaleString()} words read`,
    timedSessions: `${counters.timedSessions || 0} timed sessions`,
    matureCards: `${await matureCount()} mature cards`,
    errorAccuracy: `error-card accuracy ${pct(errAcc)}`,
    errorProfile: top ? `top errors: ${top}` : 'no errors logged yet',
  };
}
