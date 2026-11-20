// Claude API calls, made directly from the browser with the user's own key.
// Uses the official Anthropic TypeScript SDK, vendored as a single ESM bundle
// (see tools/vendor-sdk.sh). The key never leaves this device except in requests
// to api.anthropic.com.
import Anthropic from '../vendor/anthropic-sdk-1.11.0.js';
import * as db from './db.js';
import { getSettings } from './store.js';

export const MODELS = [
  ['claude-opus-5-5', 'Claude Opus 5.5 (default, best explanations)'],
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (cheaper)'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (cheapest, fastest)'],
];

// Models that accept the server-side refusal fallback parameter.
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);

export const LANG_NAMES = { es: 'Spanish', en: 'English', it: 'Italian' };

export class ClaudeError extends Error {}

let client = null, clientKey = null;
async function getClient() {
  const s = await getSettings();
  if (!s.apiKey) throw new ClaudeError('Add your Claude API key in Settings to use this.');
  if (!client || clientKey !== s.apiKey) {
    client = new Anthropic({ apiKey: s.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
    clientKey = s.apiKey;
  }
  return { client, settings: s };
}

export async function hasKey() { return !!(await getSettings()).apiKey; }

const LEARNER = (s) =>
  `The learner is a 30-year-old native Spanish speaker who also speaks English, learning German. ` +
  `Write all explanations and translations in ${LANG_NAMES[s.lang] || 'Spanish'}. ` +
  `When it helps, contrast German with Spanish/English structures (cases, word order, gender). Be concise.`;

/**
 * One structured-output request. `schema` is a JSON Schema object; returns the parsed JSON.
 * effort: 'low' for lookups, 'medium' for analysis.
 */
async function ask({ system, prompt, schema, effort = 'low', maxTokens = 4000 }) {
  const { client, settings } = await getClient();
  const params = {
    model: settings.model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort, format: { type: 'json_schema', schema } },
  };
  let resp;
  try {
    if (FALLBACK_MODELS.has(settings.model)) {
      resp = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    } else {
      resp = await client.messages.create(params);
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new ClaudeError('Claude rejected the API key. Check it in Settings.');
    if (e instanceof Anthropic.RateLimitError) throw new ClaudeError('Rate limited by the Claude API — try again in a moment.');
    if (e instanceof Anthropic.APIConnectionError) throw new ClaudeError('Could not reach the Claude API (offline?).');
    if (e instanceof Anthropic.APIError) throw new ClaudeError(`Claude API error ${e.status ?? ''}: ${e.message}`);
    throw e;
  }
  if (resp.stop_reason === 'refusal') throw new ClaudeError('Claude declined this request.');
  if (resp.stop_reason === 'max_tokens') throw new ClaudeError('The answer was cut off (too long). Try a shorter selection.');
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try { return JSON.parse(text); } catch { throw new ClaudeError('Could not parse Claude\'s answer.'); }
}

const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const str = { type: 'string' };

async function cached(key, fn) {
  const hit = await db.get('cache', key);
  if (hit) return hit.value;
  const value = await fn();
  await db.put('cache', { key, value, at: Date.now() });
  return value;
}

// ---------- Block 3: tap-to-translate ----------

/** Word lookup in context. */
export async function lookupWord(word, sentence) {
  const s = await getSettings();
  return cached(`w|${s.lang}|${word}|${sentence}`, () => ask({
    system: LEARNER(s),
    prompt: `German sentence: «${sentence}»\nExplain the word «${word}» as used in this sentence.`,
    schema: obj({
      lemma: { ...str, description: 'Dictionary form; nouns with article (der/die/das), verbs as infinitive' },
      pos: str,
      gloss: { ...str, description: 'Short translation in the explanation language' },
      form: { ...str, description: 'What form this is here (case/number/gender, tense/person), and why' },
      note: { ...str, description: 'One short usage tip or contrast with Spanish/English; empty if none' },
    }),
  }));
}

/** Sentence or paragraph translation with a short structural explanation. */
export async function translatePassage(text, kind = 'sentence') {
  const s = await getSettings();
  return cached(`p|${s.lang}|${text}`, () => ask({
    system: LEARNER(s),
    prompt: `Translate this German ${kind} and briefly explain anything structurally tricky (cases, word order, separable verbs, idioms).\n\n${text}`,
    schema: obj({
      translation: str,
      notes: { type: 'array', items: str, description: '0–4 short notes on structure' },
    }),
    maxTokens: 6000,
  }));
}

/** Glosses for a list of unknown words (to add them to SRS). */
export async function glossWords(words, context = '') {
  const s = await getSettings();
  return ask({
    system: LEARNER(s),
    prompt: `For each German word, give the dictionary form and a short translation into ${LANG_NAMES.es}, ${LANG_NAMES.en} and ${LANG_NAMES.it}.` +
      (context ? `\nContext text (for sense disambiguation):\n${context.slice(0, 3000)}` : '') +
      `\nWords: ${words.join(', ')}`,
    schema: obj({
      items: {
        type: 'array',
        items: obj({ word: str, lemma: { ...str, description: 'Nouns with article' }, pos: str, es: str, en: str, it: str }),
      },
    }),
    maxTokens: 8000,
  });
}

// ---------- Block 5: error analysis + card conversion ----------

export async function findErrors(text, phase) {
  const s = await getSettings();
  return ask({
    system: LEARNER(s) + ' You are reviewing a learner\'s free writing after the fact (delayed correction). Be accurate: flag only real errors, not stylistic preferences, unless they are clearly unidiomatic.',
    prompt: `Learner phase: ${phase} (0=foundation, 1=A1–A2, 2=A2–B1, 3=B1–B2, 4=B2–C1).\nFind the errors in this German text.\n\n${text}`,
    schema: obj({
      errors: {
        type: 'array',
        items: obj({
          original: { ...str, description: 'The erroneous fragment exactly as written' },
          correction: { ...str, description: 'The corrected fragment' },
          category: { type: 'string', enum: ['case', 'gender', 'adjective-ending', 'verb-form', 'word-order', 'preposition', 'vocabulary', 'spelling', 'other'] },
          explanation: { ...str, description: 'Why, in the explanation language, contrasting with Spanish/English if useful' },
        }),
      },
      corrected_text: str,
    }),
    effort: 'medium',
    maxTokens: 12000,
  });
}

/**
 * Turn one logged error into SRS cards. Phase ≤1: atomic (one item per card).
 * Phase ≥2: sentence-pattern cards (cloze-like full sentences).
 */
export async function errorToCards(err, phase) {
  const s = await getSettings();
  const style = phase >= 2
    ? 'Make 1–2 sentence-pattern cards: a full, natural German sentence that uses the corrected pattern in a NEW context (not the learner\'s sentence).'
    : 'Make 1–2 atomic cards: one minimal item each (a single word form, article+noun, or preposition+case chunk). No full sentences.';
  return ask({
    system: LEARNER(s),
    prompt: `The learner wrote «${err.original}»; correct is «${err.correction}» (${err.category}). Explanation: ${err.explanation}\n${style}\nEach card: German side (de) and the meaning in ${LANG_NAMES.es}, ${LANG_NAMES.en}, ${LANG_NAMES.it}; plus a one-line hint naming the rule.`,
    schema: obj({ cards: { type: 'array', items: obj({ de: str, es: str, en: str, it: str, hint: str }) } }),
  });
}

// ---------- Block 1: generated lessons ----------

export async function generateLesson(topic, phase) {
  const s = await getSettings();
  return ask({
    system: LEARNER(s) + ' You write short, explicit grammar lessons: a clear rule first (advance organizer), then worked examples, each with a role-based explanation.',
    prompt: `Write a lesson for phase ${phase} (0=foundation, 1=A1–A2, 2=A2–B1, 3=B1–B2, 4=B2–C1) on: ${topic}\n` +
      `Body in light markdown (### headings, - bullets, **bold**), 150–400 words, in the explanation language. Then 8–12 example sentences.`,
    schema: obj({
      title: str,
      body: str,
      examples: { type: 'array', items: obj({ de: str, es: str, en: str, why: { ...str, description: 'Role-based explanation of the structure' } }) },
    }),
    effort: 'medium',
    maxTokens: 12000,
  });
}
