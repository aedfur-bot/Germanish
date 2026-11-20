// Block 4 — Output. Writing is saved, not corrected (delayed correction happens in
// Block 5). Speaking = shadowing: play a clip, speak along, timer runs.
import { h, mount, toast, segmented } from '../ui.js';
import * as db from '../db.js';
import * as store from '../store.js';
import { PHASES } from '../content/phases.js';
import { WRITING_PROMPTS, SHADOW_SETS } from '../content/prompts.js';
import { dayKey, prettyDay as pd } from '../day.js';
import { speak, stopSpeaking } from '../tts.js';

let mode = 'writing';
let timedChoice = null; // remembered across re-renders
let teardown = null;

export async function render(el) {
  const [s, prog, day] = await Promise.all([store.getSettings(), store.getProgress(), store.getDay()]);
  const q = store.quotaFor(s.mode)[4];
  const body = h('div');
  const draw = () => {
    teardown?.(); teardown = null;
    mount(body);
    if (mode === 'writing') teardown = renderWriting(body, prog.phase);
    else teardown = renderShadowing(body, prog.phase, s);
  };
  mount(el,
    h('div.row.between', h('h1', 'Block 4 · Output'), h('span.pill', `${Math.min(day.counts[4] || 0, q)}/${q} today`)),
    h('div.phase-banner', PHASES[prog.phase].blocks[4]),
    h('div', { style: { marginBottom: '12px' } }, segmented([['writing', 'Writing'], ['speaking', 'Speaking / shadowing']], mode, (m) => { mode = m; render(el); })),
    body,
  );
  draw();
  return () => { teardown?.(); teardown = null; stopSpeaking(); };
}

// ---------------- writing ----------------
function renderWriting(el, phase) {
  const prompts = WRITING_PROMPTS[phase];
  let prompt = prompts[Math.floor(Math.random() * prompts.length)];
  let timer = null, endAt = 0, timedMin = timedChoice ?? (phase >= 3 ? 10 : 0);
  const DRAFT_KEY = 'geschichten-draft';
  let draft = '';
  try { draft = localStorage.getItem(DRAFT_KEY) || ''; } catch {}

  const ta = h('textarea.de', { rows: 12, lang: 'de', spellcheck: false, autocapitalize: 'sentences', placeholder: 'Schreib einfach los… (Spellcheck is off on purpose: errors are reviewed later, in Block 5.)', value: draft,
    oninput: () => { try { localStorage.setItem(DRAFT_KEY, ta.value); } catch {} count.textContent = `${(ta.value.match(/\S+/g) || []).length} words`; } });
  const count = h('small', `${(draft.match(/\S+/g) || []).length} words`);
  const clock = h('div.timer', { hidden: true });
  const promptEl = h('p', prompt);

  const tick = () => {
    const left = Math.max(0, endAt - Date.now());
    clock.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
    if (!left) { clearInterval(timer); timer = null; ta.readOnly = true; toast('Time! Save your text.'); }
  };
  const startTimer = () => {
    if (!timedMin) return;
    endAt = Date.now() + timedMin * 60000; clock.hidden = false; ta.readOnly = false;
    clearInterval(timer); timer = setInterval(tick, 500); tick();
  };

  const save = async () => {
    const text = ta.value.trim();
    if (!text) return toast('Write something first.');
    await db.put('outputs', { id: db.uid('o'), type: 'writing', day: dayKey(), createdAt: Date.now(), prompt, text, timedMin: timedMin || null, wordCount: (text.match(/\S+/g) || []).length, reviewStatus: 'pending', errors: [] });
    if (timedMin) await store.bumpCounter('timedSessions');
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    const { justCompleted } = await store.completeTask(4, 'writing');
    toast(justCompleted ? 'Saved — today\'s session is complete! 🎉' : 'Saved for tomorrow\'s error review ✓');
    renderWriting(el, phase);
  };

  mount(el,
    h('div.card',
      h('div.row.between', h('h3', 'Prompt'), h('button.btn.small.ghost', { onclick: () => { prompt = prompts[Math.floor(Math.random() * prompts.length)]; promptEl.textContent = prompt; } }, '↻ another')),
      promptEl,
      h('div.row',
        h('small', 'Timed:'),
        segmented([[0, 'off'], [5, '5 min'], [10, '10 min'], [15, '15 min']], timedMin, (v) => { timedChoice = v; renderWritingRefresh(); }),
        timedMin ? h('button.btn.small', { onclick: startTimer }, 'Start timer') : null)),
    clock,
    ta,
    h('div.row.between', { style: { marginTop: '8px' } }, count,
      h('button.btn.primary', { onclick: save }, 'Save (no correction now)')),
    h('p.faint', { style: { fontSize: '.8rem' } }, 'Why no correction? Producing output forces you to notice gaps (output hypothesis); correction works better delayed, when you review with fresh eyes in Block 5.'),
    pastWriting());

  function renderWritingRefresh() { clearInterval(timer); renderWriting(el, phase); }
  return () => clearInterval(timer);
}

function pastWriting() {
  const box = h('details.card', h('summary', 'Past writing'));
  db.getAll('outputs').then((all) => {
    const w = all.filter((o) => o.type === 'writing').sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
    box.append(...(w.length ? w.map((o) => h('div.list-item', { style: { alignItems: 'flex-start' } },
      h('div.grow', h('small', pd(o.day), ` · ${o.wordCount} words`, o.timedMin ? ` · timed ${o.timedMin}′` : '', ' · ', o.reviewStatus === 'reviewed' ? h('span.zone-ok', 'reviewed') : h('span.faint', 'awaiting review')),
        h('div.de', { style: { whiteSpace: 'pre-wrap', fontSize: '.95rem' } }, o.text.length > 300 ? o.text.slice(0, 300) + '…' : o.text))))
      : [h('p.empty', 'Nothing yet.')]));
  });
  return box;
}

// ---------------- speaking / shadowing ----------------
function renderShadowing(el, phase, s) {
  let source = 'tts';
  let sentences = [...(SHADOW_SETS[phase] || SHADOW_SETS[0])];
  let audioUrl = null, audioName = '';
  let started = 0, elapsed = 0, interval = null, looping = false;
  const clock = h('div.timer', '00:00');
  const audio = h('audio', { controls: true, style: { width: '100%' } });
  const holder = h('div');

  const fmt = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  const tick = () => { clock.textContent = fmt(elapsed + (started ? Date.now() - started : 0)); };
  const startClock = () => { if (!started) { started = Date.now(); interval = setInterval(tick, 500); } };
  const pauseClock = () => { if (started) { elapsed += Date.now() - started; started = 0; clearInterval(interval); tick(); } };

  const playTtsLoop = async (btn) => {
    if (looping) { looping = false; stopSpeaking(); btn.textContent = '▶ Play all, loop'; pauseClock(); return; }
    looping = true; btn.textContent = '■ Stop'; startClock();
    while (looping) {
      for (const [i, sent] of sentences.entries()) {
        if (!looping) break;
        holder.querySelectorAll('.ex').forEach((x, j) => x.style.background = j === i ? 'var(--surface-2)' : '');
        await speak(sent, { rate: s.ttsRate });
        await new Promise((r) => setTimeout(r, 400 + sent.length * 25)); // gap to speak along / repeat
      }
    }
  };

  const draw = () => mount(holder,
    h('div.card',
      h('div.row.between', h('h3', 'Clip'), segmented([['tts', 'Sentences (TTS)'], ['file', 'Audio file']], source, (v) => { source = v; draw(); })),
      source === 'tts' ? [
        h('p.muted', 'Shadowing: listen and speak along at the same time, matching rhythm and melody — not word by word. Loop until it feels automatic.'),
        sentences.map((x) => h('div.ex.row', { style: { flexWrap: 'nowrap' } }, h('div.de.grow', x), h('button.btn.small.ghost', { onclick: () => speak(x) }, '▶'))),
        h('details', h('summary', 'Use your own sentences'),
          h('textarea.de', { rows: 4, lang: 'de', placeholder: 'One sentence per line', value: sentences.join('\n'), onchange: (e) => { sentences = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); draw(); } })),
        h('button.btn.primary', { style: { marginTop: '10px' }, onclick: (e) => playTtsLoop(e.currentTarget) }, '▶ Play all, loop'),
      ] : [
        h('p.muted', 'Load an audio clip (podcast snippet, audiobook, a recording of a native speaker). It stays on this device.'),
        h('input', { type: 'file', accept: 'audio/*', onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          await db.put('audio', { id: 'last', name: f.name, blob: f, at: Date.now() });
          loadAudio(f, f.name);
        } }),
        audioName ? h('p', h('small', audioName)) : null,
        audio,
        h('div.row', { style: { marginTop: '6px' } },
          h('small', 'Speed'),
          segmented([[0.75, '0.75×'], [0.9, '0.9×'], [1, '1×']], audio.playbackRate, (v) => { audio.playbackRate = v; draw(); }),
          h('label.row', { style: { margin: 0 } }, h('input', { type: 'checkbox', checked: audio.loop, onchange: (e) => { audio.loop = e.target.checked; } }), ' loop')),
      ]),
    h('div.card', { style: { textAlign: 'center' } },
      h('small', 'Session time'), clock,
      h('div.row', { style: { justifyContent: 'center' } },
        h('button.btn', { onclick: () => (started ? pauseClock() : startClock()) }, started ? 'Pause timer' : 'Start timer'),
        h('button.btn.primary', { onclick: finish }, 'Finish session'))),
  );

  const loadAudio = (blob, name) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(blob); audioName = name;
    audio.src = audioUrl;
    draw();
  };
  audio.addEventListener('play', startClock);
  audio.addEventListener('pause', pauseClock);

  const finish = async () => {
    pauseClock(); looping = false; stopSpeaking(); audio.pause();
    const secs = Math.round(elapsed / 1000);
    if (secs < 60 && !confirm(`Only ${secs}s logged. Count this as a session anyway?`)) return;
    await db.put('outputs', { id: db.uid('o'), type: 'speaking', day: dayKey(), createdAt: Date.now(), durationSec: secs, source: source === 'tts' ? 'tts' : audioName, reviewStatus: 'n/a' });
    await store.bumpCounter('shadowSessions');
    const { justCompleted } = await store.completeTask(4, 'shadowing');
    toast(justCompleted ? 'Session logged — today is complete! 🎉' : `Shadowing session logged (${fmt(elapsed)}) ✓`);
    elapsed = 0; tick();
  };

  db.get('audio', 'last').then((a) => { if (a?.blob) loadAudio(a.blob, a.name); });
  mount(el, holder);
  draw();
  return () => { looping = false; clearInterval(interval); stopSpeaking(); audio.pause(); if (audioUrl) URL.revokeObjectURL(audioUrl); };
}
