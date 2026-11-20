# Geschichten

A local-first, installable PWA for learning German. It's built for one learner: a native Spanish speaker who also speaks English, studying 1–3 hours a day. There is no backend. Everything is stored in the browser (IndexedDB), and the app works offline. Only two features reach out: on-demand Claude API calls (made with your own key) and the device's text-to-speech.

## Run it

No build step. Serve the folder over HTTP(S) and open it:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. To install it on Android, the app has to be served over **HTTPS**. GitHub Pages works: Settings → Pages → deploy from the branch root. In Chrome, open the page, then ⋮ → *Install app*.

## Structure

| Path | What |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` | PWA shell. The service worker precaches everything (cache-first). **Bump `VERSION` in `sw.js` whenever you change a file**, or installed clients keep the old copy. |
| `js/app.js` | Hash router, header (streak, mini roadmap, tab badges), rollover at 04:00 |
| `js/db.js` | IndexedDB wrapper and schema (`kv, vocab, cards, revlog, texts, outputs, errors, days, lessons, cache, audio`) |
| `js/store.js` | Settings, phase progress, daily task log, goal modes, streak + weekly freeze |
| `js/fsrs.js`, `js/srs.js` | FSRS-5 scheduler; deck, 25-card batch building, rating |
| `js/text.js` | Tokenizing, rule-based inflection matching, known-word coverage |
| `js/claude.js` | Claude API calls (structured JSON outputs) through the official SDK, vendored in `vendor/` (rebuild with `tools/vendor-sdk.sh`) |
| `js/views/*` | Today, Progress (roadmap), and Blocks 1–5, plus Settings |
| `js/content/*` | Phase checklists, Phase 0 seed lessons, top-100 function words, writing prompts and shadowing sentences, irregular forms |
| `data/freq2000.tsv` | The 2000-word baseline: German, part of speech, Spanish, English, in rough frequency order |

## Design decisions and assumptions

- **Stack:** vanilla ES modules and no framework, to keep maintenance low. The only dependency is the Anthropic SDK, bundled once into `vendor/`.
- **Claude:** the API key is stored only in IndexedDB on the device. It is never written to backups. The default model is `claude-opus-5-5`; Sonnet and Haiku are offered as cheaper options. Tap-to-translate results are cached locally.
- **SRS:** FSRS-5 with default weights and no learning steps. A card rated *Again* is shown again later in the same batch, but that repeat doesn't change its schedule. New cards come only from words you've introduced in Block 1: function-word chunks in Phase 0, then 10-word chunks from the 2000 list. A batch holds due cards first, then up to *N* new cards (*N* is set in Settings). Each note produces a recognition card and a production card. The production card enters a later batch than its recognition card.
- **Coverage %:** approximate. A word counts as known if a rule-generated inflected form, an irregular form, or a split compound matches the known set. Capitalized words in mid-sentence that aren't in the known set are treated as names and skipped. As the spec asks, the 2000-word baseline counts as known by default; Settings can turn that off.
- **Delayed correction:** writing becomes reviewable in Block 5 on the next study day (there's an override). Error cards are either a correction prompt (manual, *Fix: «…»* → correct form), or Claude-generated: atomic cards in Phases 0–1, sentence-pattern cards from Phase 2 on.
- **Streak:** a day counts when every block meets its quota. One missed day per Monday–Sunday week is forgiven automatically.
- **Languages:** the interface is in English. Seed translations and explanations exist in Spanish and English. Italian applies to Claude-generated content and falls back to Spanish elsewhere.
- **Seed content:** the case examples were written new for this app. The original prompt referred to examples "developed earlier in this conversation", but those weren't available.
