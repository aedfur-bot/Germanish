// Block 3 — Input: imported texts, known-word coverage, tap-to-translate, TTS.
import { h, mount, toast, spinner, confirmBox, fmtDate } from '../ui.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { PHASES } from '../content/phases.js';
import { coverage, zone, structure, WORD_RE, knownForms, isKnown, markKnown, formsOf, invalidateKnown } from '../text.js';
import { speak, stopSpeaking } from '../tts.js';
import { lookupWord, translatePassage, glossWords, hasKey, ClaudeError } from '../claude.js';
import { addNote } from '../srs.js';

export async function render(el, params) {
  stopSpeaking();
  if (params[0] === 'text' && params[1]) return renderReader(el, params[1]);
  return renderList(el);
}

async function renderList(el) {
  const [s, prog, day, texts] = await Promise.all([store.getSettings(), store.getProgress(), store.getDay(), db.getAll('texts')]);
  const q = store.quotaFor(s.mode)[3];
  texts.sort((a, b) => b.createdAt - a.createdAt);
  const covs = await Promise.all(texts.map((t) => coverage(t.body)));

  mount(el,
    h('div.row.between', h('h1', 'Block 3 · Input'), h('span.pill', `${Math.min(day.counts[3] || 0, q)}/${q} today`)),
    h('div.phase-banner', PHASES[prog.phase].blocks[3]),
    h('div.card',
      h('h2', 'Add a text'),
      h('form.stack', { onsubmit: async (e) => {
        e.preventDefault();
        const f = e.target.elements;
        const body = f.body.value.trim();
        if (!body) return;
        const title = f.title.value.trim() || body.split(/\s+/).slice(0, 6).join(' ') + '…';
        const rec = { id: db.uid('t'), title, body, createdAt: Date.now(), wordCount: (body.match(WORD_RE) || []).length };
        await db.put('texts', rec);
        location.hash = `#/input/text/${rec.id}`;
      } },
      h('input', { name: 'title', type: 'text', placeholder: 'Title (optional)' }),
      h('textarea.de', { name: 'body', rows: 6, placeholder: 'Paste German text here — an article, a graded reader chapter, song lyrics, a transcript…', lang: 'de' }),
      h('div.row',
        h('input', { type: 'file', accept: '.txt,.md,text/plain', style: { flex: 1 }, onchange: async (e) => {
          const file = e.target.files[0]; if (!file) return;
          const form = e.target.form;
          form.elements.body.value = await file.text();
          if (!form.elements.title.value) form.elements.title.value = file.name.replace(/\.\w+$/, '');
        } }),
        h('button.btn.primary', { type: 'submit' }, 'Add & open')))),
    texts.length ? h('div.card', h('h2', 'Your texts'),
      texts.map((t, i) => {
        const z = zone(covs[i].pct);
        return h('a.list-item', { href: `#/input/text/${t.id}`, style: { textDecoration: 'none', color: 'inherit' } },
          h('div.grow', h('div', t.title), h('small', `${t.wordCount} words`, t.readAt ? ` · read ${fmtDate(t.readAt)}` : '', t.readCount > 1 ? ` (${t.readCount}×)` : '')),
          h('b', { class: z.cls }, `${Math.round(covs[i].pct * 100)}%`));
      }))
      : h('p.empty', 'No texts yet. Paste something above. Aim for texts where ~95% of words are already known.'),
  );
}

async function renderReader(el, id) {
  const t = await db.get('texts', id);
  if (!t) { mount(el, h('p', 'Text not found.')); return; }
  const s = await store.getSettings();
  const set = await knownForms();
  const vocab = await db.getAll('vocab');
  const gloss = new Map();
  for (const v of vocab) for (const f of formsOf(v.de, v.pos)) if (!gloss.has(f)) gloss.set(f, v);
  let cov = await coverage(t.body);
  let showUnknown = true;
  const paras = structure(t.body);
  const pop = h('div.popover', { hidden: true });
  const reader = h('div.reader', { lang: 'de' });
  const meter = h('div');
  let reading = false;

  const drawMeter = () => {
    const z = zone(cov.pct);
    mount(meter,
      h('div.coverage-meter', h('b', { class: z.cls }, `${Math.round(cov.pct * 100)}%`), h('span', 'known-word coverage')),
      h('small', `${z.label} · ${cov.known}/${cov.total} running words known · approximate (inflected forms are matched by rule)`),
      cov.unknown.length ? h('details', { style: { marginTop: '8px' } },
        h('summary', `${cov.unknown.length} unknown word types`),
        unknownPanel()) : null);
  };

  const unknownPanel = () => {
    const chosen = new Set();
    const box = h('div', { style: { marginTop: '8px' } });
    const status = h('div');
    mount(box,
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
        cov.unknown.slice(0, 80).map(([w, n]) => h('label.pill', { style: { cursor: 'pointer', display: 'inline-flex', gap: '4px', alignItems: 'center' } },
          h('input', { type: 'checkbox', onchange: (e) => (e.target.checked ? chosen.add(w) : chosen.delete(w)) }), w, n > 1 ? h('span.faint', `×${n}`) : null))),
      h('div.row', { style: { marginTop: '8px' } },
        h('button.btn.small', { onclick: async () => {
          for (const w of chosen) await markKnown(w);
          cov = await coverage(t.body); redraw();
        } }, 'Mark selected as known'),
        h('button.btn.small', { onclick: async () => {
          if (!chosen.size) return toast('Select some words first.');
          if (!(await hasKey())) return toast('Add your Claude API key in Settings to look up glosses.');
          mount(status, spinner(), ' Looking up…');
          try {
            const { items } = await glossWords([...chosen], t.body);
            for (const it of items) {
              await addNote({ id: `in:${it.lemma}`, kind: 'word', de: it.lemma, pos: it.pos, tr: { es: it.es, en: it.en, it: it.it }, source: t.title });
            }
            mount(status, `${items.length} words added to SRS as new cards.`);
          } catch (e) { mount(status, h('span.zone-hard', e instanceof ClaudeError ? e.message : String(e))); }
        } }, 'Add selected to SRS (Claude glosses)')), status);
    return box;
  };

  const drawText = () => {
    mount(reader, paras.map((sentences, pi) => h('p', { 'data-p': pi },
      sentences.map((sent, si) => {
        const span = h('span.s', { 'data-p': pi, 'data-s': si });
        let last = 0;
        let first = true;
        for (const m of sent.matchAll(WORD_RE)) {
          span.append(sent.slice(last, m.index));
          // capitalized mid-sentence + unknown = probably a name; coverage skips these too
          const proper = !first && /^[A-ZÄÖÜ]/.test(m[0]) && !gloss.has(m[0].toLowerCase());
          first = false;
          const unk = showUnknown && !proper && !isKnown(m[0], set);
          span.append(h('span.w', { class: unk ? 'unk' : '', 'data-w': m[0] }, m[0]));
          last = m.index + m[0].length;
        }
        span.append(sent.slice(last));
        return span;
      }))));
  };

  const closePop = () => { pop.hidden = true; reader.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); };
  // tap anywhere outside the popover (and not on another word) closes it
  const outside = (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.reader .w')) closePop(); };
  const onEsc = (e) => { if (e.key === 'Escape') closePop(); };
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', onEsc);

  const showResult = (box, p) => {
    mount(box, spinner(), ' Asking Claude…');
    p.then((content) => mount(box, content)).catch((e) => mount(box, h('span.zone-hard', e instanceof ClaudeError ? e.message : String(e))));
  };

  reader.addEventListener('click', (e) => {
    const w = e.target.closest('.w');
    if (!w) return;
    closePop();
    const sEl = w.closest('.s');
    w.classList.add('sel'); sEl.classList.add('sel');
    const word = w.dataset.w;
    const sentence = sEl.textContent.trim();
    const paragraph = sEl.parentElement.textContent.trim();
    const local = gloss.get(word.toLowerCase());
    const result = h('div', { style: { marginTop: '10px' } });
    pop.hidden = false;
    mount(pop,
      h('div.row.between',
        h('div', h('b.de', { style: { fontSize: '1.25rem' } }, word),
          local ? h('div', h('span.de', local.de), ' — ', s.lang === 'en' ? local.en : local.es, h('small.faint', ` · #${local.rank}`)) : h('small.faint', 'not in the 2000 list')),
        h('button.btn.small.ghost', { onclick: closePop, 'aria-label': 'Close' }, '✕')),
      h('div.row', { style: { marginTop: '8px' } },
        h('button.btn.small', { onclick: () => speak(word) }, '▶ word'),
        h('button.btn.small', { onclick: () => speak(sentence) }, '▶ sentence'),
        h('button.btn.small', { onclick: () => showResult(result, lookupWord(word, sentence).then((r) => [
          h('div', h('b.de', r.lemma), ` (${r.pos}) — `, h('b', r.gloss)),
          h('div.muted', r.form), r.note ? h('div.faint', r.note) : null,
          h('button.btn.small', { style: { marginTop: '6px' }, onclick: async () => {
            const n = await addNote({ id: `in:${r.lemma}`, kind: 'word', de: r.lemma, pos: guessPos(r.pos), tr: { [s.lang]: r.gloss, es: s.lang === 'es' ? r.gloss : undefined }, extra: r.note, source: t.title });
            toast(n ? 'Added to SRS' : 'Already in your deck');
          } }, '+ Add to SRS'),
        ])) }, 'Translate word'),
        h('button.btn.small', { onclick: () => showResult(result, translatePassage(sentence, 'sentence').then(renderTranslation)) }, 'Sentence'),
        h('button.btn.small', { onclick: () => showResult(result, translatePassage(paragraph, 'paragraph').then(renderTranslation)) }, 'Paragraph'),
        !isKnown(word, set) ? h('button.btn.small', { onclick: async () => {
          await markKnown(word); set.add(word.toLowerCase()); cov = await coverage(t.body); closePop(); redraw();
        } }, 'Mark known') : null),
      result);
  });

  const renderTranslation = (r) => [h('div', r.translation), r.notes?.length ? h('ul', { style: { paddingLeft: '18px', margin: '6px 0 0' } }, r.notes.map((n) => h('li.muted', n))) : null];

  const readAloud = async (btn) => {
    if (reading) { reading = false; stopSpeaking(); btn.textContent = '▶ Read aloud'; return; }
    reading = true; btn.textContent = '■ Stop';
    for (const sEl of reader.querySelectorAll('.s')) {
      if (!reading) break;
      reader.querySelectorAll('.s.sel').forEach((x) => x.classList.remove('sel'));
      sEl.classList.add('sel');
      sEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await speak(sEl.textContent);
    }
    reading = false; btn.textContent = '▶ Read aloud';
    reader.querySelectorAll('.s.sel').forEach((x) => x.classList.remove('sel'));
  };

  const redraw = () => { drawMeter(); drawText(); };

  mount(el,
    h('a', { href: '#/input' }, '← Block 3'),
    h('h1', { style: { marginTop: '8px' } }, t.title),
    h('div.card', meter),
    h('div.row', { style: { marginBottom: '12px' } },
      h('button.btn', { onclick: (e) => readAloud(e.currentTarget) }, '▶ Read aloud'),
      h('button.btn', { onclick: () => { showUnknown = !showUnknown; drawText(); } }, 'Toggle unknown underline')),
    h('div.card', reader),
    h('div.row', { style: { marginTop: '8px' } },
      h('button.btn.primary', { onclick: async () => {
        t.readAt = Date.now(); t.readCount = (t.readCount || 0) + 1;
        await db.put('texts', t);
        await store.bumpCounter('wordsRead', cov.total);
        const { justCompleted } = await store.completeTask(3, t.title);
        toast(justCompleted ? 'Passage done — today\'s session is complete! 🎉' : `Passage done ✓ (+${cov.total} words read)`);
        location.hash = '#/input';
      } }, t.readAt ? 'Read again — finished ✓' : 'Finished reading this passage'),
      h('button.btn.danger', { onclick: async () => {
        if (await confirmBox('Delete this text?', 'Delete')) { await db.del('texts', id); invalidateKnown(); location.hash = '#/input'; }
      } }, 'Delete')),
    pop,
  );
  redraw();
  return () => { reading = false; stopSpeaking(); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', onEsc); };
}

function guessPos(p = '') {
  p = p.toLowerCase();
  if (/noun|sustantivo|nome/.test(p)) return 'n';
  if (/verb/.test(p)) return 'v';
  if (/adj/.test(p)) return 'adj';
  return 'adv';
}
