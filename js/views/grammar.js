// Block 1 — Grammar & Vocab: seed lessons, minimal-pair drills, function-word and
// vocabulary chunks, imported/generated lessons.
import { h, mount, md, esc, toast, spinner, confirmBox } from '../ui.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { SEED_LESSONS } from '../content/lessons-phase0.js';
import { PHASES } from '../content/phases.js';
import { addNote } from '../srs.js';
import { speak } from '../tts.js';
import { generateLesson, hasKey, ClaudeError } from '../claude.js';
import { invalidateKnown } from '../text.js';

export const CHUNK_SIZE = 10;

const plain = (de) => de.replace(/\[\[(?:nom|akk|dat|gen):(.+?)\]\]/g, '$1');
const caseHtml = (de) => esc(de).replace(/\[\[(nom|akk|dat|gen):(.+?)\]\]/g, '<span class="c-$1">$2</span>');
const tr = (obj, lang) => (typeof obj === 'string' ? obj : obj?.[lang] || obj?.es || obj?.en || '');

async function allLessons() {
  return [...SEED_LESSONS, ...(await db.getAll('lessons')).sort((a, b) => a.createdAt - b.createdAt)];
}

async function finishLesson(id, note) {
  await store.setLessonProgress(id, { doneAt: Date.now() });
  const { justCompleted } = await store.completeTask(1, note || id);
  toast(justCompleted ? 'Lesson done — and today\'s session is complete! 🎉' : 'Lesson chunk done ✓');
}

function speakBtn(text) {
  return h('button.btn.small.ghost', { onclick: (e) => { e.stopPropagation(); speak(text); }, 'aria-label': `Listen: ${text}` }, '▶');
}

export async function render(el, params) {
  const [sub, id] = params;
  if (sub === 'lesson') return renderLesson(el, id);
  if (sub === 'vocab') return renderVocabChunk(el);
  if (sub === 'new') return renderNewLesson(el);
  return renderList(el);
}

// ---------------- list ----------------
async function renderList(el) {
  const [s, prog, lp, lessons, day, vocab] = await Promise.all([
    store.getSettings(), store.getProgress(), store.getLessonProgress(), allLessons(), store.getDay(), db.getAll('vocab'),
  ]);
  const showAll = s.unlockAll;
  const q = store.quotaFor(s.mode)[1];
  const visible = lessons.filter((l) => showAll || l.phase <= prog.phase);
  const hiddenCount = lessons.length - visible.length;
  const nextWords = vocab.filter((v) => v.status === 'unseen').sort((a, b) => a.rank - b.rank);
  const introduced = vocab.filter((v) => v.status !== 'unseen').length;
  const vocabUnlocked = prog.phase >= 1 || showAll;

  const groups = {};
  for (const l of visible) (groups[l.phase] ||= []).push(l);

  mount(el,
    h('div.row.between', h('h1', 'Block 1 · Grammar & Vocab'), h('span.pill', `${Math.min(day.counts[1] || 0, q)}/${q} today`)),
    h('div.phase-banner', PHASES[prog.phase].blocks[1]),

    h('div.card',
      h('div.row.between', h('h2', 'Vocabulary chunk'), h('small', `${introduced}/2000 introduced`)),
      vocabUnlocked
        ? [h('p.muted', `Introduce the next ${CHUNK_SIZE} most frequent words (#${nextWords[0]?.rank ?? '—'}+), then they join your SRS deck.`),
          h('a.btn.primary', { href: '#/grammar/vocab' }, `Start next ${CHUNK_SIZE} words`)]
        : h('p.muted', 'Unlocks in Phase 1. In Phase 0 the function-word chunks below do this job. (Settings → "Unlock all phases" overrides.)')),

    Object.keys(groups).sort().map((ph) => h('div.card',
      h('h2', `Phase ${ph} — ${PHASES[ph].name}`),
      groups[ph].map((l) => h('a.list-item', { href: `#/grammar/lesson/${encodeURIComponent(l.id)}`, style: { textDecoration: 'none', color: 'inherit' } },
        h('span', { style: { width: '22px', color: lp[l.id]?.doneAt ? 'var(--green)' : 'var(--faint)' } }, lp[l.id]?.doneAt ? '✓' : '○'),
        h('div.grow', h('div', l.title), h('small', { html: md(l.summary || '').replace(/^<p>|<\/p>$/g, '') })),
        h('span.pill', l.kind === 'pairs' ? 'listen' : l.kind === 'vocab' ? 'words' : l.tag === 'custom' ? 'imported' : 'read'))))),

    hiddenCount ? h('p.muted', `${hiddenCount} lesson(s) from later phases are hidden. Settings → "Unlock all phases" shows them.`) : null,

    h('div.card',
      h('h2', 'Add a lesson'),
      h('p.muted', 'After Phase 0 the course content is yours: import lessons or generate one with Claude for any topic.'),
      h('a.btn', { href: '#/grammar/new' }, 'Import or generate…')),
  );
}

// ---------------- lesson ----------------
async function renderLesson(el, id) {
  const [s, lessons, lp] = await Promise.all([store.getSettings(), allLessons(), store.getLessonProgress()]);
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) { mount(el, h('p', 'Lesson not found. '), h('a', { href: '#/grammar' }, 'Back')); return; }
  const lang = s.lang;
  const done = lp[id]?.doneAt;

  const header = [
    h('a', { href: '#/grammar' }, '← Block 1'),
    h('h1', { style: { marginTop: '8px' } }, lesson.title),
    done ? h('span.pill.green', 'done ✓') : null,
  ];

  if (lesson.kind === 'pairs') return renderPairs(el, lesson, header, done);
  if (lesson.kind === 'vocab') return renderFunctionWords(el, lesson, header, done, lang);

  let showTr = true;
  const exList = h('div');
  const drawExamples = () => mount(exList, (lesson.examples || []).map((ex) => h('div.ex',
    h('div.row', { style: { flexWrap: 'nowrap', alignItems: 'flex-start' } },
      h('div.grow', h('div.de', { html: caseHtml(ex.de) }),
        showTr ? h('div.tr', tr({ es: ex.es, en: ex.en, it: ex.it }, lang)) : null,
        showTr && ex.why ? h('div.why', tr(ex.why, lang)) : null),
      speakBtn(plain(ex.de))))));
  drawExamples();

  const rating = lp[id]?.rating;
  const selfRate = lesson.selfRate ? h('div.card',
    h('h3', 'Self-rating'),
    h('p.muted', 'Can you explain, in your own words, what job each case does and when two-way prepositions take which case?'),
    h('div.row', ['not yet', 'partly', 'understood'].map((r) => h('button.btn', {
      class: rating === r ? 'primary' : '',
      onclick: async () => {
        await store.setLessonProgress(id, { rating: r, ratedAt: Date.now() });
        toast(r === 'understood' ? 'Great — tick it on the roadmap when you\'re ready.' : 'Come back to it tomorrow.');
        renderLesson(el, id);
      },
    }, r)))) : null;

  mount(el, ...header,
    h('div.card.lesson-body', { html: md(lesson.body) }),
    lesson.examples?.length ? h('div.card',
      h('div.row.between', h('h2', `Examples (${lesson.examples.length})`),
        h('button.btn.small', { onclick: () => { showTr = !showTr; drawExamples(); } }, 'Hide/show translations')),
      h('p.faint', { style: { fontSize: '.8rem' } }, 'Colour key: ', h('span.c-nom', 'nominative'), ' · ', h('span.c-akk', 'accusative'), ' · ', h('span.c-dat', 'dative'), ' · ', h('span.c-gen', 'genitive'),
        lang === 'it' ? ' · Seed explanations exist in Spanish and English; Italian falls back to Spanish.' : ''),
      exList) : null,
    selfRate,
    h('div.row', { style: { marginTop: '8px' } },
      h('button.btn.primary', { onclick: async () => { await finishLesson(id); renderLesson(el, id); } }, done ? 'Reviewed again (counts as a chunk)' : 'Mark lesson chunk done'),
      lesson.examples?.length ? h('button.btn', { onclick: async () => {
        const n = await addExamplesAsCards(lesson, lang);
        toast(n ? `${n} sentence cards added to SRS` : 'Already in your deck');
      } }, 'Add examples as SRS sentence cards') : null,
      lesson.tag === 'custom' ? h('button.btn.danger', { onclick: async () => {
        if (await confirmBox('Delete this imported lesson?', 'Delete')) { await db.del('lessons', id); location.hash = '#/grammar'; }
      } }, 'Delete') : null),
  );
}

async function addExamplesAsCards(lesson, lang) {
  let n = 0;
  for (const [i, ex] of (lesson.examples || []).entries()) {
    n += await addNote({
      id: `ex:${lesson.id}:${i}`, kind: 'sentence', de: plain(ex.de),
      tr: { es: ex.es, en: ex.en, it: ex.it }, extra: tr(ex.why, lang), source: lesson.title,
    });
  }
  return n;
}

// ---------------- minimal pairs ----------------
function renderPairs(el, lesson, header, done) {
  const TRIALS = Math.max(10, lesson.pairs.length * 2);
  let trial = 0, correct = 0, current = null, answered = false;
  const stage = h('div.card');

  const nextTrial = () => {
    if (trial >= TRIALS) return finish();
    const pair = lesson.pairs[Math.floor(Math.random() * lesson.pairs.length)];
    const pick = Math.random() < 0.5 ? 0 : 1;
    current = { pair, pick };
    answered = false;
    drawTrial();
    speak(pair[pick], { rate: 0.8 });
  };

  const drawTrial = (feedback) => mount(stage,
    h('div.row.between', h('b', `Trial ${trial + 1}/${TRIALS}`), h('small', `${correct} correct`)),
    h('p.muted', 'Which word did you hear?'),
    h('div.row', { style: { justifyContent: 'center', margin: '18px 0' } },
      h('button.btn', { onclick: () => speak(current.pair[current.pick], { rate: 0.8 }) }, '▶ Replay'),
      h('button.btn', { onclick: () => speak(current.pair[current.pick], { rate: 0.55 }) }, '▶ Slow')),
    h('div.grid2', current.pair.map((w, i) => h('button.btn', {
      style: { fontSize: '1.3rem', minHeight: '64px', fontFamily: 'var(--serif)' },
      class: feedback != null ? (i === current.pick ? 'primary' : '') : '',
      disabled: answered,
      onclick: () => {
        answered = true; trial++;
        if (i === current.pick) correct++;
        drawTrial(i === current.pick);
        speak(w, { rate: 0.8 });
        setTimeout(nextTrial, i === current.pick ? 900 : 1800);
      },
    }, w))),
    feedback != null ? h('p', { style: { textAlign: 'center', marginTop: '10px' }, class: feedback ? 'zone-ok' : 'zone-hard' },
      feedback ? 'Right ✓' : `It was «${current.pair[current.pick]}»`) : null);

  const finish = () => mount(stage,
    h('h2', `${correct}/${TRIALS} correct`),
    h('p.muted', correct / TRIALS >= 0.9 ? 'Solid discrimination. Move on, or repeat tomorrow to confirm.' : 'Repeat this set again later — discrimination improves with spaced exposure.'),
    h('div.row',
      h('button.btn.primary', { onclick: async () => { await finishLesson(lesson.id, `${lesson.title}: ${correct}/${TRIALS}`); location.hash = '#/grammar'; } }, 'Mark done'),
      h('button.btn', { onclick: () => { trial = 0; correct = 0; nextTrial(); } }, 'Again')));

  mount(el, ...header,
    h('div.card', h('p', lesson.body), h('h3', 'The pairs'),
      h('div.grid2', lesson.pairs.map(([a, b]) => h('div.row', { style: { gap: '4px' } },
        h('button.btn.small', { onclick: () => speak(a, { rate: 0.8 }) }, `▶ ${a}`),
        h('button.btn.small', { onclick: () => speak(b, { rate: 0.8 }) }, `▶ ${b}`))))),
    stage,
    h('p.faint', { style: { fontSize: '.8rem' } }, 'Uses your device\'s German text-to-speech voice. If it sounds wrong or silent, install a German voice in your phone\'s TTS settings.'));
  mount(stage, h('p', 'Listen to one word, pick which one you heard.'), h('button.btn.primary', { onclick: nextTrial }, 'Start'));
}

// ---------------- function-word chunk ----------------
function renderFunctionWords(el, lesson, header, done, lang) {
  mount(el, ...header,
    h('div.card', h('p', lesson.body),
      h('div.table-wrap', h('table.tbl',
        h('thead', h('tr', h('th', ''), h('th', 'Deutsch'), h('th', lang === 'en' ? 'English' : 'Español'), h('th', 'Note'))),
        h('tbody', lesson.words.map((w) => h('tr',
          h('td', speakBtn(w.de)),
          h('td.de', { style: { fontSize: '1.05rem' } }, w.de),
          h('td', lang === 'en' ? w.en : w.es),
          h('td.muted', { style: { fontSize: '.82rem' } }, w.note))))))),
    h('div.row',
      h('button.btn.primary', { onclick: async () => {
        let n = 0;
        for (const w of lesson.words) {
          n += await addNote({ id: `fw:${w.id}`, kind: 'word', de: w.de, pos: w.pos, tr: { es: w.es, en: w.en }, extra: w.note, source: 'function words' });
        }
        await markVocabIntroduced(lesson.words.map((w) => w.de));
        await finishLesson(lesson.id);
        toast(`${n} cards added to SRS`);
        location.hash = '#/grammar';
      } }, done ? 'Done ✓ — mark reviewed again' : `Add ${lesson.words.length} words to SRS & finish`)));
}

async function markVocabIntroduced(des) {
  for (const de of des) {
    const v = await db.get('vocab', de);
    if (v && v.status === 'unseen') await db.put('vocab', { ...v, status: 'introduced', introducedAt: Date.now() });
  }
  invalidateKnown();
}

// ---------------- vocabulary chunk from the 2000 list ----------------
async function renderVocabChunk(el) {
  const s = await store.getSettings();
  const cards = await db.getAll('cards');
  const inDeck = new Set(cards.map((c) => c.de));
  const all = (await db.getAll('vocab')).filter((v) => v.status === 'unseen').sort((a, b) => a.rank - b.rank);
  // words already carded via function-word lessons are skipped silently
  for (const v of all.filter((x) => inDeck.has(x.de))) await db.put('vocab', { ...v, status: 'introduced' });
  const chunk = all.filter((v) => !inDeck.has(v.de)).slice(0, CHUNK_SIZE);

  mount(el,
    h('a', { href: '#/grammar' }, '← Block 1'),
    h('h1', { style: { marginTop: '8px' } }, 'Vocabulary chunk'),
    chunk.length ? [
      h('p.muted', 'Say each word aloud after the audio. Nouns: learn the article with the word — it carries the gender you\'ll need for every case ending.'),
      h('div.card', chunk.map((v) => h('div.list-item',
        speakBtn(v.de),
        h('div.grow', h('div.de', { style: { fontSize: '1.15rem' } }, v.de), h('small', s.lang === 'en' ? v.en : v.es, ' · ', h('span.faint', v.pos))),
        h('small.faint', `#${v.rank}`)))),
      h('button.btn.primary', { onclick: async () => {
        for (const v of chunk) await addNote({ id: `v:${v.de}`, kind: 'word', de: v.de, pos: v.pos, rank: v.rank, tr: { es: v.es, en: v.en }, source: 'top 2000' });
        await markVocabIntroduced(chunk.map((v) => v.de));
        await finishLesson(`vocab-${chunk[0].rank}`, `vocab #${chunk[0].rank}–${chunk[chunk.length - 1].rank}`);
        location.hash = '#/grammar';
      } }, `Add these ${chunk.length} to SRS & finish chunk`),
    ] : h('p', 'All 2000 baseline words are introduced. Add new words from Block 3 (Input) instead.'));
}

// ---------------- import / generate ----------------
async function renderNewLesson(el) {
  const prog = await store.getProgress();
  const out = h('div');
  const phaseSel = h('select', { name: 'phase' }, PHASES.map((p) => h('option', { value: p.n, selected: p.n === prog.phase }, `Phase ${p.n} — ${p.name}`)));

  const save = async (lesson) => {
    const rec = {
      id: db.uid('L'), tag: 'custom', kind: 'read', createdAt: Date.now(),
      phase: Number(phaseSel.value), summary: '', examples: [], ...lesson,
    };
    await db.put('lessons', rec);
    toast('Lesson saved');
    location.hash = `#/grammar/lesson/${rec.id}`;
  };

  mount(el,
    h('a', { href: '#/grammar' }, '← Block 1'),
    h('h1', { style: { marginTop: '8px' } }, 'Add a lesson'),
    h('div.card', h('label', 'Phase'), phaseSel),

    h('div.card',
      h('h2', 'Generate with Claude'),
      h('p.muted', 'Uses your API key. You get a short explicit lesson plus worked examples with role-based explanations.'),
      h('form.stack', { onsubmit: async (e) => {
        e.preventDefault();
        const topic = e.target.elements.topic.value.trim();
        if (!topic) return;
        if (!(await hasKey())) { toast('Add your Claude API key in Settings first.'); return; }
        mount(out, h('p', spinner(), ' Writing your lesson…'));
        try {
          const L = await generateLesson(topic, Number(phaseSel.value));
          await save({ title: L.title, body: L.body, summary: topic, examples: L.examples });
        } catch (err) { mount(out, h('p.zone-hard', err instanceof ClaudeError ? err.message : String(err))); }
      } },
      h('input', { name: 'topic', type: 'text', placeholder: 'e.g. "Perfekt with haben vs. sein", "weil vs. denn", "adjective endings after der-words"' }),
      h('button.btn.primary', { type: 'submit' }, 'Generate'), out)),

    h('div.card',
      h('h2', 'Import'),
      h('p.muted', 'Paste Markdown (first "# heading" becomes the title) or JSON: { "title", "body", "examples": [{ "de", "es", "en", "why" }] }. A JSON array imports several lessons.'),
      h('form.stack', { onsubmit: async (e) => {
        e.preventDefault();
        const raw = e.target.elements.src.value.trim();
        if (!raw) return;
        try {
          if (raw.startsWith('{') || raw.startsWith('[')) {
            const data = JSON.parse(raw);
            const list = Array.isArray(data) ? data : [data];
            for (const L of list.slice(1)) await db.put('lessons', { id: db.uid('L'), tag: 'custom', kind: 'read', createdAt: Date.now(), phase: Number(L.phase ?? phaseSel.value), summary: '', examples: [], ...L });
            await save(list[0]);
          } else {
            const m = raw.match(/^#\s+(.+)$/m);
            await save({ title: m ? m[1] : 'Imported lesson', body: m ? raw.replace(m[0], '').trim() : raw });
          }
        } catch (err) { toast(`Import failed: ${err.message}`); }
      } },
      h('textarea', { name: 'src', rows: 8, placeholder: '# Perfekt\n\nThe present perfect uses haben or sein + participle…' }),
      h('label', 'or load a file'),
      h('input', { type: 'file', accept: '.md,.txt,.json', onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        e.target.form.elements.src.value = await f.text();
      } }),
      h('button.btn.primary', { type: 'submit' }, 'Import'))),
  );
}
