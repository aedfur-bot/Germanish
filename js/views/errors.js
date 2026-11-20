// Block 5 — Error review. Writing from Block 4 becomes reviewable the next study
// day (delayed correction). Errors are logged (manually or via Claude) and turned
// into SRS cards that join tomorrow's Block 2 deck.
import { h, mount, toast, spinner, confirmBox, fmtDate } from '../ui.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { PHASES } from '../content/phases.js';
import { dayKey, prettyDay } from '../day.js';
import { addNote } from '../srs.js';
import { findErrors, errorToCards, hasKey, ClaudeError } from '../claude.js';

const CATEGORIES = ['case', 'gender', 'adjective-ending', 'verb-form', 'word-order', 'preposition', 'vocabulary', 'spelling', 'other'];

export async function render(el, params) {
  if (params[0] === 'review' && params[1]) return renderReview(el, params[1]);
  if (params[0] === 'log') return renderLogPass(el);
  return renderList(el);
}

async function renderList(el) {
  const [s, prog, day, outputs, errors] = await Promise.all([store.getSettings(), store.getProgress(), store.getDay(), db.getAll('outputs'), db.getAll('errors')]);
  const q = store.quotaFor(s.mode)[5];
  const today = dayKey();
  const pending = outputs.filter((o) => o.type === 'writing' && o.reviewStatus === 'pending').sort((a, b) => a.createdAt - b.createdAt);
  const ready = pending.filter((o) => !s.delayCorrection || o.day < today);
  const waiting = pending.filter((o) => s.delayCorrection && o.day >= today);
  const cats = {};
  for (const e of errors) cats[e.category] = (cats[e.category] || 0) + 1;

  const item = (o, early) => h('div.list-item', { style: { alignItems: 'flex-start' } },
    h('div.grow', h('small', prettyDay(o.day), ` · ${o.wordCount} words`),
      h('div.de', { style: { fontSize: '.95rem' } }, o.text.length > 160 ? o.text.slice(0, 160) + '…' : o.text)),
    h('a.btn.small', { class: early ? '' : 'primary', href: `#/errors/review/${o.id}` }, early ? 'Review now anyway' : 'Review'));

  mount(el,
    h('div.row.between', h('h1', 'Block 5 · Error review'), h('span.pill', `${Math.min(day.counts[5] || 0, q)}/${q} today`)),
    h('div.phase-banner', PHASES[prog.phase].blocks[5]),
    h('div.card', h('h2', `Ready for review (${ready.length})`),
      ready.length ? ready.map((o) => item(o, false))
        : h('p.muted', 'Nothing ready. Writing from Block 4 becomes reviewable the next study day.',
          errors.length ? ' Meanwhile you can do an error-log pass below.' : '')),
    waiting.length ? h('div.card', h('h2', `Written today (${waiting.length})`), h('p.muted', 'Best reviewed tomorrow with fresh eyes.'), waiting.map((o) => item(o, true))) : null,
    h('div.card',
      h('div.row.between', h('h2', 'Error log'), h('small', `${errors.length} logged · ${(await db.getAll('cards')).filter((c) => c.kind === 'error').length} error cards`)),
      Object.keys(cats).length ? h('div.row', Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => h('span.pill', `${k} ${v}`))) : h('p.muted', 'No errors logged yet.'),
      errors.length ? h('a.btn', { href: '#/errors/log', style: { marginTop: '10px' } }, 'Error-log pass (re-read recent errors)') : null),
  );
}

async function renderReview(el, id) {
  const s = await store.getSettings();
  const prog = await store.getProgress();
  const out = await db.get('outputs', id);
  if (!out) { mount(el, h('p', 'Not found.')); return; }
  const logged = await db.byIndex('errors', 'outputId', id);
  const textBox = h('div.card.de', { style: { whiteSpace: 'pre-wrap', fontSize: '1.08rem', lineHeight: 1.7 } }, out.text);
  const claudeBox = h('div');
  const logBox = h('div');

  const form = h('form.stack', { onsubmit: async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    if (!f.original.value.trim() || !f.correction.value.trim()) return toast('Fill in what you wrote and the correction.');
    await logError({ original: f.original.value.trim(), correction: f.correction.value.trim(), category: f.category.value, explanation: f.explanation.value.trim(), via: 'manual' });
    e.target.reset();
  } },
  h('input', { name: 'original', type: 'text', placeholder: 'What I wrote (tip: select it in the text above)', lang: 'de' }),
  h('input', { name: 'correction', type: 'text', placeholder: 'Correct version', lang: 'de' }),
  h('select', { name: 'category' }, CATEGORIES.map((c) => h('option', { value: c }, c))),
  h('input', { name: 'explanation', type: 'text', placeholder: 'Why (rule, in your own words)' }),
  h('button.btn', { type: 'submit' }, 'Log error'));

  const onSel = () => {
    const sel = document.getSelection();
    if (sel && textBox.contains(sel.anchorNode) && sel.toString().trim()) form.elements.original.value = sel.toString().trim();
  };
  document.addEventListener('selectionchange', onSel);

  async function logError(err) {
    const rec = { id: db.uid('e'), outputId: id, day: dayKey(), createdAt: Date.now(), cardIds: [], ...err };
    await db.put('errors', rec);
    logged.push(rec);
    drawLog();
  }

  async function manualCard(err) {
    const n = await addNote({
      id: `err:${err.id}`, kind: 'error', de: err.correction,
      tr: { es: `Corrige: «${err.original}»`, en: `Fix: «${err.original}»`, it: `Correggi: «${err.original}»` },
      extra: err.explanation, source: 'error log',
    }, { oneWay: 'prod' });
    err.cardIds = [...(err.cardIds || []), `err:${err.id}:prod`];
    await db.put('errors', err);
    return n;
  }

  async function claudeCards(err, statusEl) {
    mount(statusEl, spinner());
    try {
      const { cards } = await errorToCards(err, prog.phase);
      let n = 0;
      for (const [i, c] of cards.entries()) {
        n += await addNote({ id: `err:${err.id}:${i}`, kind: 'error', de: c.de, tr: { es: c.es, en: c.en, it: c.it }, extra: c.hint, source: 'error log' });
        err.cardIds = [...(err.cardIds || []), `err:${err.id}:${i}`];
      }
      await db.put('errors', err);
      mount(statusEl, h('span.zone-ok', `${n} cards added`));
    } catch (e) { mount(statusEl, h('span.zone-hard', e instanceof ClaudeError ? e.message : String(e))); }
  }

  function drawLog() {
    mount(logBox, logged.length ? logged.map((err) => {
      const st = h('span');
      return h('div.list-item', { style: { alignItems: 'flex-start' } },
        h('div.grow',
          h('div', h('span.diff-bad', err.original), ' → ', h('span.diff-ok', err.correction), ' ', h('span.pill', err.category)),
          err.explanation ? h('small.muted', err.explanation) : null,
          h('div.row', { style: { marginTop: '6px' } },
            err.cardIds?.length ? h('small.zone-ok', `${err.cardIds.length} card(s) ✓`) : [
              h('button.btn.small', { onclick: async () => { const n = await manualCard(err); toast(n ? 'Correction card added' : 'Already added'); drawLog(); } }, '+ Correction card'),
              h('button.btn.small', { onclick: () => claudeCards(err, st).then(drawLog) }, prog.phase >= 2 ? '+ Pattern cards (Claude)' : '+ Atomic cards (Claude)'),
            ], st)),
        h('button.btn.small.ghost', { onclick: async () => { await db.del('errors', err.id); logged.splice(logged.indexOf(err), 1); drawLog(); }, 'aria-label': 'Remove' }, '✕'));
    }) : h('p.muted', 'No errors logged for this text yet.'));
  }

  mount(el,
    h('a', { href: '#/errors' }, '← Block 5'),
    h('h1', { style: { marginTop: '8px' } }, `Writing from ${prettyDay(out.day)}`),
    out.prompt ? h('p.muted', out.prompt) : null,
    textBox,
    h('div.card',
      h('h2', '1 · Spot errors yourself first'),
      h('p.muted', 'Reread slowly. Check each verb (position, form), each article (case, gender), each adjective ending. Log what you find.'),
      form),
    h('div.card',
      h('h2', '2 · Then ask Claude'),
      h('button.btn', { onclick: async () => {
        if (!(await hasKey())) return toast('Add your Claude API key in Settings.');
        mount(claudeBox, h('p', spinner(), ' Reviewing…'));
        try {
          const r = await findErrors(out.text, prog.phase);
          const picks = r.errors.map(() => true);
          mount(claudeBox,
            r.errors.length ? [
              r.errors.map((e, i) => h('label.list-item', { style: { alignItems: 'flex-start', cursor: 'pointer', margin: 0, color: 'var(--text)' } },
                h('input', { type: 'checkbox', checked: true, onchange: (ev) => { picks[i] = ev.target.checked; } }),
                h('div.grow', h('div', h('span.diff-bad', e.original), ' → ', h('span.diff-ok', e.correction), ' ', h('span.pill', e.category)), h('small.muted', e.explanation)))),
              h('button.btn.primary', { style: { marginTop: '8px' }, onclick: async (ev) => {
                ev.currentTarget.disabled = true;
                for (const [i, e] of r.errors.entries()) if (picks[i] && !logged.some((x) => x.original === e.original)) await logError({ ...e, via: 'claude' });
                toast('Logged');
              } }, 'Log selected errors'),
            ] : h('p.zone-ok', 'No errors found. 🎉'),
            h('details', { style: { marginTop: '10px' } }, h('summary', 'Corrected version'), h('p.de', { style: { whiteSpace: 'pre-wrap' } }, r.corrected_text)));
        } catch (e) { mount(claudeBox, h('p.zone-hard', e instanceof ClaudeError ? e.message : String(e))); }
      } }, 'Find errors with Claude'),
      claudeBox),
    h('div.card', h('h2', '3 · Turn errors into cards'), h('p.muted', 'Cards join tomorrow\'s Block 2 deck. Only card errors you\'d actually repeat; one-off typos aren\'t worth it.'), logBox),
    h('button.btn.primary.block', { onclick: async () => {
      out.reviewStatus = 'reviewed'; out.reviewedAt = Date.now(); out.errorCount = logged.length;
      await db.put('outputs', out);
      const { justCompleted } = await store.completeTask(5, 'review pass');
      toast(justCompleted ? 'Review pass done — today\'s session is complete! 🎉' : 'Review pass done ✓');
      location.hash = '#/errors';
    } }, 'Finish review pass'),
  );
  drawLog();
  return () => document.removeEventListener('selectionchange', onSel);
}

async function renderLogPass(el) {
  const errors = (await db.getAll('errors')).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
  mount(el,
    h('a', { href: '#/errors' }, '← Block 5'),
    h('h1', { style: { marginTop: '8px' } }, 'Error-log pass'),
    h('p.muted', 'Cover the right side, read each mistake, say the correction out loud, then check. Look for patterns: which category keeps coming back?'),
    h('div.card', errors.map((e) => h('div.list-item', { style: { alignItems: 'flex-start' } },
      h('div.grow', h('div', h('span.diff-bad', e.original), ' → ', h('details', { style: { display: 'inline-block' } }, h('summary', 'show'), h('span.diff-ok', e.correction))),
        h('small.muted', `${e.category} · ${fmtDate(e.createdAt)}`, e.explanation ? ` · ${e.explanation}` : ''))))),
    h('button.btn.primary.block', { onclick: async () => {
      const { justCompleted } = await store.completeTask(5, 'error-log pass');
      toast(justCompleted ? 'Done — today\'s session is complete! 🎉' : 'Error-log pass done ✓');
      location.hash = '#/errors';
    } }, 'Finish pass'));
}
