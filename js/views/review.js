// Block 2 — FSRS review in 25-card batches. Recognition (DE → L1) and production
// (L1 → DE) cards; "Again" cards come back later in the same batch.
import { h, mount, toast, confirmBox, esc } from '../ui.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { PHASES } from '../content/phases.js';
import { buildBatch, deckStats, rate, previewIntervals, l1, addNote, BATCH_SIZE } from '../srs.js';
import { fmtInterval, State } from '../fsrs.js';
import { speak } from '../tts.js';

const norm = (s) => s.toLowerCase().replace(/[.,!?;:«»"„“()]/g, '').replace(/\s+/g, ' ').trim();

let activeCleanup = null;

export async function render(el, params) {
  if (params[0] === 'browse') await renderBrowse(el);
  else await renderHome(el);
  return () => { activeCleanup?.(); activeCleanup = null; };
}

async function renderHome(el) {
  const [s, prog, day, stats] = await Promise.all([store.getSettings(), store.getProgress(), store.getDay(), deckStats()]);
  const q = store.quotaFor(s.mode)[2];
  const done = Math.min(day.counts[2] || 0, q);

  mount(el,
    h('div.row.between', h('h1', 'Block 2 · Review'), h('span.pill', `${done}/${q} today`)),
    h('div.phase-banner', PHASES[prog.phase].blocks[2]),
    h('div.card',
      h('div.grid2',
        stat('Due now', stats.due), stat('New (introduced)', stats.fresh), stat('In review', stats.review), stat('Total cards', stats.total)),
      h('div.row', { style: { marginTop: '14px' } },
        h('button.btn.primary', { disabled: !stats.due && !stats.fresh, onclick: () => startSession(el, false) },
          `Start batch (${Math.min(BATCH_SIZE, stats.due + Math.min(stats.fresh, s.newPerBatch))} cards)`),
        !stats.due && stats.review ? h('button.btn', { onclick: () => startSession(el, true) }, 'Practice ahead') : null,
        h('a.btn.ghost', { href: '#/review/browse' }, 'Browse deck')),
      !stats.total ? h('p.muted', { style: { marginTop: '10px' } }, 'Your deck is empty. Introduce words in Block 1 (function words in Phase 0, vocabulary chunks from Phase 1) — they appear here as new cards.') : null,
      stats.due === 0 && stats.fresh === 0 && stats.total ? h('p.muted', { style: { marginTop: '10px' } }, 'Nothing due. Introduce more words in Block 1, or practice ahead (early reviews are scheduled correctly by FSRS).') : null),
    h('p.faint', { style: { fontSize: '.8rem' } },
      `A batch is up to ${BATCH_SIZE} cards: due reviews first, then up to ${s.newPerBatch} new ones (change in Settings). Cards are shuffled so directions and types interleave. Keys: Space = show, 1–4 = rate.`),
  );
}

const stat = (label, n) => h('div', h('div', { style: { fontSize: '1.6rem', fontWeight: 600 } }, String(n)), h('small', label));

async function startSession(el, ahead) {
  const s = await store.getSettings();
  const queue = await buildBatch({ ahead });
  if (!queue.length) { toast('Nothing to review.'); return; }
  const firstSeen = new Set();
  const total = queue.length;
  let reviewed = 0, again = 0;
  let card = null, revealed = false, typed = '';

  const onKey = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Enter' && !revealed) { e.preventDefault(); reveal(); }
      return;
    }
    if (e.key === ' ' && !revealed) { e.preventDefault(); reveal(); }
    else if (revealed && ['1', '2', '3', '4'].includes(e.key)) answer(Number(e.key));
  };
  document.addEventListener('keydown', onKey);

  const next = async () => {
    card = queue.shift();
    if (!card) return finish();
    revealed = false; typed = '';
    draw();
    if (card.dir === 'rec') speak(card.de);
  };

  const reveal = () => { revealed = true; draw(); if (card.dir === 'prod') speak(card.de); };

  const answer = async (g) => {
    const first = !firstSeen.has(card.id);
    firstSeen.add(card.id);
    if (first) { await rate(card, g); reviewed++; if (g === 1) again++; }
    if (g === 1) queue.splice(Math.min(queue.length, 4 + Math.floor(Math.random() * 4)), 0, card); // re-show soon
    next();
  };

  const draw = async () => {
    const isRec = card.dir === 'rec';
    const front = isRec ? card.de : l1(card, s.lang);
    const back = isRec ? l1(card, s.lang) : card.de;
    const ivl = revealed ? await previewIntervals(card) : null;
    const again1 = firstSeen.has(card.id);
    let typedFeedback = null;
    if (revealed && !isRec && typed) {
      const ok = norm(typed) === norm(card.de);
      typedFeedback = h('div', { class: ok ? 'diff-ok' : 'diff-bad' }, ok ? '✓ ' : '', typed);
    }
    mount(el,
      h('div.row.between', h('small', `${total - queue.length}/${total}${again1 ? ' · repeat' : ''}`),
        h('button.btn.small.ghost', { onclick: async () => { if (await confirmBox('End this batch early? It won\'t count as a completed batch.', 'End')) { cleanupKeys(); renderHome(el); } } }, 'End')),
      h('div.progress', h('div', { style: { width: `${((total - queue.length - 1) / total) * 100}%` } })),
      h('div.card.flash', { style: { marginTop: '12px' } },
        h('div.dir', isRec ? 'Deutsch → ' + (s.lang === 'en' ? 'English' : s.lang === 'it' ? 'Italiano' : 'Español') : 'Say it in German', card.isNew ? ' · new' : '', card.kind !== 'word' ? ` · ${card.kind}` : ''),
        h('div.front', { class: isRec ? 'de' : '' }, front),
        isRec ? h('button.btn.small.ghost', { onclick: () => speak(card.de) }, '▶') : null,
        !isRec && !revealed ? h('input', { type: 'text', placeholder: 'Type it (optional), Enter to check', value: typed, autocapitalize: 'off', autocomplete: 'off', spellcheck: false, oninput: (e) => { typed = e.target.value; }, style: { maxWidth: '360px', textAlign: 'center' }, lang: 'de' }) : null,
        revealed ? [h('hr', { style: { width: '60%' } }), typedFeedback, h('div.back', { class: isRec ? '' : 'de' }, back),
          !isRec ? h('button.btn.small.ghost', { onclick: () => speak(card.de) }, '▶') : null,
          card.extra ? h('div.extra', card.extra) : null] : null),
      revealed
        ? h('div.ratings',
          [[1, 'Again', 'r-again'], [2, 'Hard', ''], [3, 'Good', ''], [4, 'Easy', 'r-easy']].map(([g, label, cls]) =>
            h('button.btn', { class: cls, onclick: () => answer(g) }, label, h('small', again1 ? 'practice' : fmtInterval(ivl[g])))))
        : h('button.btn.primary.block', { onclick: reveal, style: { minHeight: '52px' } }, 'Show answer'),
    );
    const input = el.querySelector('input[type=text]');
    if (input) input.focus();
  };

  const cleanupKeys = () => document.removeEventListener('keydown', onKey);
  activeCleanup = cleanupKeys;

  const finish = async () => {
    cleanupKeys();
    const exhausted = reviewed > 0;
    let msg = '';
    if (exhausted) {
      const { justCompleted } = await store.completeTask(2, `${reviewed} cards`);
      msg = justCompleted ? ' Today\'s session is complete! 🎉' : '';
    }
    const st = await deckStats();
    mount(el,
      h('h1', 'Batch done'),
      h('div.card', h('p', `${reviewed} cards reviewed · ${reviewed ? Math.round(((reviewed - again) / reviewed) * 100) : 0}% recalled on first try.${msg}`),
        h('p.muted', `${st.due} still due · ${st.fresh} new waiting.`),
        h('div.row', h('button.btn.primary', { onclick: () => startSession(el, false), disabled: !st.due && !st.fresh }, 'Another batch'),
          h('a.btn', { href: '#/today' }, 'Today'))));
  };

  next();
}

// ---------------- browse / add ----------------
async function renderBrowse(el) {
  const s = await store.getSettings();
  let filter = '';
  const list = h('div');
  const cards = (await db.getAll('cards')).sort((a, b) => b.createdAt - a.createdAt);

  const draw = () => {
    const f = filter.toLowerCase();
    const shown = cards.filter((c) => !f || c.de.toLowerCase().includes(f) || l1(c, s.lang).toLowerCase().includes(f)).slice(0, 200);
    mount(list, shown.length ? shown.map((c) => h('div.list-item',
      h('div.grow',
        h('div', h('span.de', c.de), ' ', h('small.faint', c.dir === 'rec' ? 'DE→' : '→DE')),
        h('small', l1(c, s.lang), ' · ', h('span.faint', c.isNew ? 'new' : `due ${c.dueDay || '—'} · S=${c.fsrs.stability.toFixed(1)}d · ${c.fsrs.state === State.Relearning ? 'relearning' : `${c.fsrs.reps} reps`}`), c.suspended ? h('span.pill.red', 'suspended') : null)),
      h('button.btn.small.ghost', { onclick: async () => { c.suspended = !c.suspended; await db.put('cards', c); draw(); } }, c.suspended ? 'Unsuspend' : 'Suspend'),
      h('button.btn.small.ghost', { onclick: async () => { if (await confirmBox(`Delete card «${esc(c.de)}» (${c.dir})?`, 'Delete')) { await db.del('cards', c.id); cards.splice(cards.indexOf(c), 1); draw(); } } }, '✕')))
      : h('p.empty', 'No cards match.'));
  };

  mount(el,
    h('a', { href: '#/review' }, '← Block 2'),
    h('h1', { style: { marginTop: '8px' } }, `Deck (${cards.length} cards)`),
    h('div.card',
      h('h3', 'Add a card'),
      h('form.stack', { onsubmit: async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        const de = f.de.value.trim(), t = f.tr.value.trim();
        if (!de || !t) return;
        const n = await addNote({ id: db.uid('c'), kind: f.kind.value, de, tr: { [s.lang]: t, es: s.lang === 'es' ? t : undefined }, extra: f.extra.value.trim(), source: 'manual' });
        toast(`${n} cards added`);
        renderBrowse(el);
      } },
      h('input', { name: 'de', type: 'text', placeholder: 'German (nouns with article)', lang: 'de' }),
      h('input', { name: 'tr', type: 'text', placeholder: 'Meaning' }),
      h('input', { name: 'extra', type: 'text', placeholder: 'Note (optional)' }),
      h('select', { name: 'kind' }, h('option', { value: 'word' }, 'Atomic (word / chunk)'), h('option', { value: 'sentence' }, 'Sentence pattern')),
      h('button.btn.primary', { type: 'submit' }, 'Add (both directions)'))),
    h('input', { type: 'search', placeholder: 'Search…', oninput: (e) => { filter = e.target.value; draw(); }, style: { marginBottom: '10px' } }),
    h('div.card', list));
  draw();
}
