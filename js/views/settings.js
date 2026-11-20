import { h, mount, toast, confirmBox, segmented } from '../ui.js';
import * as store from '../store.js';
import * as db from '../db.js';
import { MODELS } from '../claude.js';
import { germanVoices, speak, ttsAvailable } from '../tts.js';
import { exportJSON, importJSON, exportAnkiCSV, download } from '../backup.js';
import { invalidateKnown } from '../text.js';
import { dayKey } from '../day.js';

export async function render(el) {
  const s = await store.getSettings();
  const voices = await germanVoices();
  const set = async (patch, msg = 'Saved') => { await store.saveSettings(patch); toast(msg); };

  const field = (label, control, help) => h('div', { style: { marginBottom: '14px' } }, h('label', label), control, help ? h('small.faint', { style: { display: 'block', marginTop: '3px' } }, help) : null);
  const check = (key, label, help) => h('div', { style: { marginBottom: '12px' } },
    h('label.row', { style: { color: 'var(--text)', margin: 0, cursor: 'pointer', flexWrap: 'nowrap' } },
      h('input', { type: 'checkbox', checked: !!s[key], style: { width: '20px', height: '20px', accentColor: 'var(--accent)' }, onchange: async (e) => { await set({ [key]: e.target.checked }); if (key === 'baselineKnown') invalidateKnown(); } }),
      label),
    help ? h('small.faint', { style: { display: 'block', marginLeft: '28px' } }, help) : null);

  mount(el,
    h('h1', 'Settings'),

    h('div.card',
      h('h2', 'Daily goal'),
      segmented(Object.entries(store.MODES).map(([k, m]) => [k, m.label]), s.mode, async (m) => { await store.setMode(m); render(el); }),
      h('small.faint', { style: { display: 'block', marginTop: '6px' } }, 'Takes effect immediately for today\'s remaining tasks.')),

    h('div.card',
      h('h2', 'Language'),
      field('Translations and explanations', segmented([['es', 'Español'], ['en', 'English'], ['it', 'Italiano']], s.lang, async (v) => { await set({ lang: v }); render(el); }),
        'Seed content has Spanish and English; Italian applies to Claude-generated content and falls back to Spanish elsewhere.')),

    h('div.card',
      h('h2', 'Claude API'),
      field('API key', h('input', { type: 'password', value: s.apiKey, autocomplete: 'off', placeholder: 'sk-ant-…', onchange: (e) => set({ apiKey: e.target.value.trim() }, 'API key saved on this device') }),
        'Stored only in this browser\'s local database and sent only to api.anthropic.com. Never included in backups. Used for tap-to-translate (Block 3), error analysis and card generation (Block 5), and lesson generation (Block 1).'),
      field('Model', h('select', { onchange: (e) => set({ model: e.target.value }) }, MODELS.map(([id, label]) => h('option', { value: id, selected: s.model === id }, label))),
        'Lookups use low effort; error analysis and lessons use medium. Haiku is far cheaper for heavy tap-to-translate use.')),

    h('div.card',
      h('h2', 'Speech'),
      !ttsAvailable() ? h('p.zone-hard', 'Text-to-speech isn\'t available in this browser.') : [
        field('German voice', h('select', { onchange: (e) => set({ ttsVoice: e.target.value }) },
          h('option', { value: '' }, voices.length ? 'Default German voice' : 'No German voice found — install one in your device\'s TTS settings'),
          voices.map((v) => h('option', { value: v.voiceURI, selected: s.ttsVoice === v.voiceURI }, `${v.name} (${v.lang})${v.localService ? '' : ' · online'}`)))),
        field(`Speed: ${s.ttsRate}×`, h('input', { type: 'range', min: 0.5, max: 1.2, step: 0.05, value: s.ttsRate, style: { width: '100%' }, onchange: async (e) => { await set({ ttsRate: Number(e.target.value) }); render(el); } })),
        h('button.btn', { onclick: () => speak('Guten Tag! Ich lerne jeden Tag ein bisschen Deutsch.') }, '▶ Test voice'),
      ]),

    h('div.card',
      h('h2', 'Learning'),
      check('unlockAll', 'Unlock all phases (manual override)', 'Show lessons and features from every phase regardless of your current phase.'),
      check('delayCorrection', 'Delay correction to the next day', 'Writing becomes reviewable in Block 5 on the following study day.'),
      check('baselineKnown', 'Count the top-2000 list as known for coverage %', 'On: coverage assumes the 2000 baseline words are known (as specified). Off: only words you\'ve introduced or reviewed count.'),
      field('New cards per 25-card batch', h('input', { type: 'number', min: 0, max: 25, value: s.newPerBatch, onchange: (e) => set({ newPerBatch: Math.max(0, Math.min(25, Number(e.target.value) || 0)) }) })),
      field('FSRS desired retention', h('input', { type: 'number', min: 0.8, max: 0.97, step: 0.01, value: s.retention, onchange: (e) => set({ retention: Math.max(0.8, Math.min(0.97, Number(e.target.value) || 0.9)) }) }),
        'Higher = more frequent reviews. 0.90 is the FSRS default.')),

    h('div.card',
      h('h2', 'Backup'),
      h('p.muted', 'Everything lives on this device. Export regularly — clearing browser data deletes it.'),
      h('div.row',
        h('button.btn', { onclick: async () => download(`geschichten-backup-${dayKey()}.json`, JSON.stringify(await exportJSON()), 'application/json') }, 'Export JSON backup'),
        h('label.btn', { style: { margin: 0, color: 'var(--text)' } }, 'Import JSON backup',
          h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e) => {
            const f = e.target.files[0]; if (!f) return;
            try {
              const data = JSON.parse(await f.text());
              if (!(await confirmBox('Replace ALL data on this device with this backup? (Your API key is kept.)', 'Replace'))) return;
              await importJSON(data);
              toast('Backup restored'); setTimeout(() => location.reload(), 600);
            } catch (err) { toast(`Import failed: ${err.message}`); }
          } })),
        h('button.btn', { onclick: async () => download(`geschichten-anki-${dayKey()}.csv`, await exportAnkiCSV(s.lang), 'text/csv') }, 'Export SRS deck (Anki CSV)')),
      h('small.faint', { style: { display: 'block', marginTop: '6px' } }, 'Audio clips and the translation cache aren\'t included in backups. In Anki: File → Import, note type "Basic"; each direction is its own row.')),

    h('div.card',
      h('h2', 'Install'),
      h('p.muted', 'On Android (Chrome): menu ⋮ → "Install app" / "Add to Home screen". It then runs offline in its own window.'),
      h('h2', { style: { marginTop: '12px' } }, 'Danger zone'),
      h('button.btn.danger', { onclick: async () => {
        if (!(await confirmBox('Delete ALL local data (cards, progress, texts, writing, settings)? This cannot be undone.', 'Delete everything'))) return;
        for (const name of Object.keys(db.STORES)) await db.clear(name);
        location.reload();
      } }, 'Reset all data')),
  );
}
